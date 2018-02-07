const should = require('should');
const socketConnection = require('../test_modules/socketConnection');
const commonTestFunc = require('../test_modules/commonTestFunc');
const constRewardType = require("./../const/constRewardType");
const errorUtils = require('../modules/errorUtils');
const moment = require('moment-timezone');
const dbConfig = require('../modules/dbproperties');
const dbUtility = require("../modules/dbutility");
const dbRewardEvent = require('../db_modules/dbRewardEvent');
const dbRewardTask = require('../db_modules/dbRewardTask');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const dbProposal = require('../db_modules/dbProposal');
const dbProposalType = require('../db_modules/dbProposalType');
const dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');

describe("Test player free trial reward group", function () {
    const date = new Date().getTime();

    let testPlayer = null;
    let testPlayer2 = null;
    let testPlayerObjId = null;
    let testPlayerObjId2 = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;

    const eventTypeName = constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;

    let freeTrialRewardType = null;
    let freeTrialRewardEvent = null;
    let freeTrialRewardProposal = null;
    let freeTrialRewardRewardTask = null;

    let rewardData = {};

    const concurrentApplyNum = 1;
    const rewardEventSpendingTimes = 5;
    const rewardEventAmount = 1000;
    const rewardEventRemark = "1000 multiply 5 = 5000 ok";
    const randomSMSCode = parseInt(Math.random() * 9000 + 1000);
    const timeNow = moment().subtract(1, 'minutes');

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
            "needSMSVerification" : false,
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
        commonTestFunc.createTestPlatform({'useProviderGroup': true}).then(
            (platformData) => {
                testPlatform = platformData;
                testPlatformObjId = platformData._id;
                testPlatformId = platformData.platformId;
                done();
            },
            (error) => {
                console.error(error);
                done(error);
            }
        );
    });

    /* Test 2 - create a new test player */
    it('Should create a new test player', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObjId).then(
            (playerData) => {
                testPlayer = playerData;
                testPlayerObjId = playerData._id;
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
            (data) => {
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
            (error) => {
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
        dbConfig.collection_playerLevel.findOne({
            platform: testPlatformObjId,
            value: 0
        }).lean().then(
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
            () => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 8 - get free trial reward event */
    it('Should get free trial reward event', function (done) {
        dbRewardEvent.getRewardEvent({
            platform: testPlatformObjId,
            type: freeTrialRewardType._id
        }).then(
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

    /* Test 9 - apply free trial reward event */
    it('Should apply free trial reward event', function (done) {
        let proms = [];
        // 10 concurrent apply situation
        for (let a = 0; a < concurrentApplyNum; a++) {
            proms.push(dbPlayerInfo.applyRewardEvent("", testPlayer.playerId, createFreeTrialRewardEventData.code, "").then(
                (data) => {
                    return true; //only 1 true, 1 player can only apply reward once
                },
                (err) => {
                    return false //9 false, same player fail to apply reward more than once
                }
            ));
        }
        Promise.all(proms).then(
            (data) => {
                if (data.indexOf(true) > -1) {
                    done();
                } else {
                    done('All promise failed');
                }
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 10 - check apply reward event proposal data */
    it('Should check is add reward event proposal data', function (done) {
        dbProposal.getProposal({
            "data.platformId": testPlatformObjId,
            "data.playerObjId": testPlayerObjId
        }).then(
            (proposal) => {
                if (proposal) {
                    // check reward credit output
                    freeTrialRewardProposal = proposal;
                    freeTrialRewardProposal.data.rewardAmount.should.equal(rewardEventAmount);
                    done();
                } else {
                    done('Reward event proposal not found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 11 - check the spendingAmount in proposal and targetConsumption in rewardTaskGroup is matched */
    it('Should check the spendingAmount in proposal and targetConsumption in rewardTaskGroup is matched', function (done) {
        dbConfig.collection_rewardTaskGroup.findOne({
            playerId: testPlayerObjId,
            platformId: testPlatformObjId
        }).then(
            (rewardTask) => {
                if (rewardTask) {
                    freeTrialRewardRewardTask = rewardTask;
                    if (freeTrialRewardProposal.data.spendingAmount === (freeTrialRewardRewardTask.targetConsumption + freeTrialRewardRewardTask.forbidXIMAAmt)) {
                        done();
                    } else {
                        done('The spending amount does not match with the required unlock amount');
                    }
                } else {
                    done('Free trial reward event rewardTask is not found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 12 - check the rewardAmount is added correctly to the player */
    it('Should check the rewardAmount is added correctly to the player', function (done) {
        dbConfig.collection_players.findOne({_id: testPlayerObjId}).lean().then(
            (player) => {
                if (player.validCredit - testPlayer.validCredit === freeTrialRewardProposal.data.rewardAmount) {
                    testPlayer = player;
                    done();
                } else {
                    done('Player validCredit not match');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 13 - create a second test player for IP and phone number testing */
    it('Should create a second test player for IP and phone number testing', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObjId).then(
            (data) => {
                testPlayer2 = data;
                testPlayerObjId2 = data._id;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 14 - apply free trial reward event and fail due to same login IP */
    it('Should apply free trial reward event and fail due to same login IP', function (done) {
        if (freeTrialRewardEvent.condition.checkPhoneFreeTrialReward) {
            dbPlayerInfo.applyRewardEvent("", testPlayer2.playerId, createFreeTrialRewardEventData.code, "").then(
                (data) => {
                    done('Apply reward should fail due to same login IP');
                },
                (err) => {
                    console.log('ERROR_14',err); // Should display: This IP address has applied for max reward times in event period
                    done();
                }
            );
        } else {
            done('Check IP address condition needs to be enabled');
        }
    });

    /* Test 15 - update second test player with different login IP and proceed with phone number testing */
    it('Should update second test player with different login IP and proceed with phone number testing', function (done) {
        dbConfig.collection_players.findOneAndUpdate(
            {
                _id: testPlayerObjId2,
                platform: testPlatformObjId
            },
            {
                lastLoginIp: '199.199.199.199' //different IP from testPlayer (188.188.188.188)
            },
            {new: true}
        ).then(
            (playerData) => {
                testPlayer2 = playerData;
                done();
            }
        )
    });

    /* Test 16 - apply free trial reward event and fail due to same phone number */
    it('Should apply free trial reward event and fail due to same phone number', function (done) {
        if (freeTrialRewardEvent.condition.checkPhoneFreeTrialReward) {
            dbPlayerInfo.applyRewardEvent("", testPlayer2.playerId, createFreeTrialRewardEventData.code, "").then(
                (data) => {
                    done('Apply reward should fail due to same phone number');
                },
                (err) => {
                    console.log('ERROR_16',err); // Should display: This phone number has applied for max reward times in event period
                    done();
                }
            );
        } else {
            done('Check phone number condition needs to be enabled');
        }
    });

    /* Test 17 - update second test player with different phone number and proceed with sms verification testing */
    it('Should update second test player with different phone number and proceed with sms verification testing', function (done) {
        dbConfig.collection_players.findOneAndUpdate(
            {
                _id: testPlayerObjId2,
                platform: testPlatformObjId
            },
            {
                phoneNumber: '112233445566' //different phone number from testPlayer (80808080)
            },
            {new: true}
        ).then(
            (playerData) => {
                testPlayer2 = playerData;
                done();
            }
        )
    });

    /* Test 18 - enable sms verification checking for free trial reward event */
    it('Should enable sms verification checking for free trial reward event', function (done) {
        dbConfig.collection_rewardEvent.findOneAndUpdate(
            {
                _id: freeTrialRewardEvent._id,
                platform: freeTrialRewardEvent.platform
            },
            {
                "condition.needSMSVerification": true
            },
            {new: true}
        ).then(
            (rewardEvent) => {
                freeTrialRewardEvent = rewardEvent;
                done();
            }
        )
    });

    /* Test 19 - generate sms verification log before testing */
    it('Should generate sms verification log before testing', function (done) {
        let saveObj = {
            tel: testPlayer2.phoneNumber,
            channel: 1,
            platformObjId: testPlayer2.platform,
            platformId: 1,
            code: randomSMSCode,
            createTime: timeNow,
            delay: 0
        };

        dbConfig.collection_smsVerificationLog(saveObj).save().catch(errorUtils.reportError);
        done();
    });

    /* Test 20 - apply free trial reward event and pass sms verification when sms code match */
    it('Should apply free trial reward event and pass sms verification when sms code match', function (done) {
        rewardData.smsCode = randomSMSCode;

        if (freeTrialRewardEvent.condition.needSMSVerification) {
            dbPlayerInfo.applyRewardEvent("", testPlayer2.playerId, createFreeTrialRewardEventData.code, rewardData).then(
                (data) => {
                    done();
                },
                (error) => {
                    done(error);
                }
            );
        } else {
            done('Check sms verification condition needs to be enabled');
        }
    });

    /* Test 99 - remove all test Data */
    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function () {
            done();
        })
    });

    /* Test 100 - remove all proposal test Data */
    it('Should remove all proposal test Data', function(done){
        commonTestFunc.removeTestProposalData([],testPlatformObjId, [], [testPlayerObjId]).then(function(){
            done();
        })
    });
});