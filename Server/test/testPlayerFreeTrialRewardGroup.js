let should = require('should');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

const constRewardType = require("./../const/constRewardType");

let dbConfig = require('../modules/dbproperties');
let dbUtility = require("../modules/dbutility");
let dbRewardEvent = require('../db_modules/dbRewardEvent');
let dbRewardTask = require('../db_modules/dbRewardTask');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbProposal = require('../db_modules/dbProposal');
let dbProposalType = require('../db_modules/dbProposalType');
let dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');

describe("Test player free trial reward group", function () {
    let date = new Date().getTime();

    let testPlayer = null;
    let testPlayerObjId = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;

    let eventTypeName = constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;

    let freeTrialRewardType = null;
    let freeTrialRewardEvent = null;
    let freeTrialRewardProposal = null;
    let freeTrialRewardRewardTask = null;

    let rewardEventSpendingTimes = 5;
    let rewardEventAmount = 1000;
    let rewardEventRemark = "1000 multiply 5 = 5000 ok";

    let createFreeTrialRewardEventData = {
        //"platform": testPlatformObjId,
        //"type": freeTrialRewardType._id,
        "platform" : testPlatformObjId,
        "name" : "freeTrialName" + date,
        "code" : "freeTrialCode" + date,
        "validStartTime" : dbUtility.getTodaySGTime().startTime,
        "validEndTime" : dbUtility.getTodaySGTime().endTime,
        //"executeProposal": proposalTypeId,
        "settlementPeriod" : "2",
        "needSettlement" : false,
        "param" : {
            "rewardParam" : [
                {
                    "value" : [
                        {
                            "forbidWithdrawIfBalanceAfterUnlock" : 100,
                            "forbidWithdrawAfterApply" : false,
                            "remark" : rewardEventRemark,
                            "spendingTimes" : rewardEventSpendingTimes,
                            "rewardAmount" : rewardEventAmount
                        }//,
                        //"levelId": "5733e26ef8c8a9355caf49dc"
                    ]
                }
            ]
        },
        "condition" : {
            "isSharedWithXIMA" : true,
            "needSMSVerification" : true,
            "checkPhoneFreeTrialReward" : true,
            "checkIPFreeTrialReward" : true,
            "topUpCountType" : [
                "2",
                1
            ],
            "interval" : "1",
            "isPlayerLevelDiff" : true,
            "validEndTime" : dbUtility.getTodaySGTime().endTime,
            "validStartTime" : dbUtility.getTodaySGTime().startTime,
            "isIgnoreAudit" : false,
            "canApplyFromClient" : true,
            "applyType" : "1",
            "code" : "freeTrialCode2" + date,
            "name" : "freeTrialName2" + date
        },
        "canApplyFromClient" : true,
        "needApply" : false
    };

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });

    /* Test 2 - create a new test player */
    it('Should create a new test player', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObjId).then(
            (data) => {
                testPlayer = data;
                testPlayerObjId = data._id;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 3 - allow to use reward system by default for new player */
    it('Should allow to use reward system by default for new player', function (done) {
        if (testPlayer.forbidRewardEvents && testPlayer.forbidRewardEvents.length === 0) {
            done();
        }
    });

    /* Test 4 - get proposal type id and proposal type process id */
    it('Should get proposal type id and proposal type process id', function (done) {
        let typeProm = dbProposalType.getProposalType({
            platformId: testPlatformObjId,
            name: eventTypeName
        });
        let typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
            platformId: testPlatformObjId,
            name: eventTypeName
        });

        Promise.all([typeProm, typeProcessProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    data[0].name.should.equal(eventTypeName);
                    data[1].name.should.equal(eventTypeName);
                    proposalTypeId = data[0]._id;
                    proposalTypeProcessId = data[1]._id;
                    done();
                }
                else {
                    done('Proposal type id and proposal type process not found');
                }
            }
        ).catch(
            function (error) {
                done(error);
            }
        );
    });

    /* Test 5 - get free trial reward type */
    it('Should get free trial reward type on platform', function (done) {
        dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP}).lean().then(
            (rewardType) => {
                if (rewardType) {
                    freeTrialRewardType = rewardType;
                    done();
                } else {
                    done('Free Trial Reward Group rewardType not found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 6 - get platform player level */
    it('Should get player level on platform', function (done) {
        dbConfig.collection_playerLevel.findOne({platform: testPlatformObjId, value: 0}).lean().then(
            (playerLevel) => {
                if (playerLevel) {
                    testPlatformPlayerLevelId = playerLevel._id;
                    done();
                } else {
                    done('Platform player level not found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 7 - create free trial reward event */
    it('Should create free trial reward event', function (done) {
        createFreeTrialRewardEventData.type = freeTrialRewardType._id;
        createFreeTrialRewardEventData.executeProposal = proposalTypeId;
        createFreeTrialRewardEventData.param.rewardParam[0].levelId = testPlatformPlayerLevelId;
        createFreeTrialRewardEventData.platform = testPlatformObjId;
        commonTestFunc.createRewardEvent(createFreeTrialRewardEventData).then(
            (data) => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 8 - get free trial reward event */
    it('Should get free trial reward event', function (done) {
        dbRewardEvent.getRewardEvent({platform: testPlatformObjId, type: freeTrialRewardType._id}).then(
            (rewardEvent) => {
                if (rewardEvent) {
                    freeTrialRewardEvent = rewardEvent;
                    done();
                } else {
                    done('Free trial reward event not found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 99 - remove all test Data */
    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function () {
            done();
        })
    });

    /* Test 100 - remove all proposal test Data */
    it('Should remove all proposal test Data', function(done){
        commonTestFunc.removeTestProposalData([],testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });
});