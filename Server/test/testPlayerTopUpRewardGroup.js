let should = require('should');
let Chance = require('chance');
let chance = new Chance();


let Q = require("q");
let dbConfig = require('./../modules/dbproperties');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

let dbProposal = require('../db_modules/dbProposal');
let dbProposalType = require('../db_modules/dbProposalType');
let dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
let dbRewardEvent = require('../db_modules/dbRewardEvent');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');

const dbUtility = require('./../modules/dbutility');
const constRewardType = require('../const/constRewardType');
const constProposalType = require('../const/constProposalType');
let dbRewardTask = require('../db_modules/dbRewardTask');

//const mongoose = require('mongoose');
//const ObjectId = mongoose.Types.ObjectId;

describe("Test player reward points", function () {

    let testPlayer = null;
    let testPlayerObjId = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;
    let testPlatformPlayerLevelId = null;

    let typeName = constProposalType.PLAYER_TOP_UP_RETURN_GROUP;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;
    let topUpGroupProposal = null;

    let topUpReturnGroupRewardType = null;
    let topUpReturnGroupEvent = null;
    let topUpReturnGroupTask= null;

    let topUpRewardEventName= commonTestFunc.testRewardEventName + new Date().getTime();
    let topUpAmountAddToPlayer = 200;
    let data= {
        topUpRecordId: null,
        topUpRecordIds: null,
        amount: null,
        referralName: null,
    }
    //let date = new Date();

    let rewardEventSpendingTime = 2;
    let createTopUpRewardEventData = {
       // "_id" : ObjectId("5a4365ef326b1f53a776ac78"),
        //"platform" : ObjectId("5733e26ef8c8a9355caf49d8"),
        "name": topUpRewardEventName,
        "code": 741,
        "validStartTime" : dbUtility.getTodaySGTime().startTime,
        "validEndTime" : dbUtility.getTodaySGTime().endTime,
        //"executeProposal" : ObjectId("5a4350b3f8e434d778bbe600"),
        "settlementPeriod" : "2",
        "needSettlement" : false,
        "param" : {
            "rewardParam" : [
                {
                    "value" : [
                        {
                            "remark" : "特色他",
                            "spendingTimesOnReward" : 2,
                            "rewardAmount" : 100,
                            "minTopUpAmount" : 100
                        }
                    ],
                    //"levelId" : "5733e26ef8c8a9355caf49dc"
                }
            ]
        },
        "condition" : {
            "interval" : "1",
            "isPlayerLevelDiff" : false,
            "validEndTime" : dbUtility.getTodaySGTime().endTime,
            "validStartTime" : dbUtility.getTodaySGTime().startTime,
            "isIgnoreAudit" : true,
            "canApplyFromClient" : true,
            "applyType" : "1",
            "code" : "741",
            "name" : "存送金（特殊组）"
        },
        "canApplyFromClient" : true,
        "needApply" : false,
        "priority" : 0,
        "__v" : 0

    };

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create a random user name', function () {
        for (let i = 0; i < 10; i++) {
            let randomName = chance.name().replace(/\s+/g, '');
            let randomPSW = chance.hash({length: 12});
        }
    });

    /* Test 2 - create a new platform before the creation of a new player */
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

    /* Test 3 - disable to use reward points system by default for new platform */
    it('Should disable to use reward points system by default for new platform', function (done) {
        if (testPlatform.usePointSystem === false) {
            done();
        }
    });

    /* Test 4 - create a new player */
    it('Should create a a new player', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObjId).then(
            (data) => {
                if (data){
                    testPlayer = data;
                    testPlayerObjId = data._id;
                    if (data.validCredit != null && data.creditBalance != null) {
                        done();
                    }
                } else {
                    done ('No platformObjId is found, thus the test player cannot be created')
                }
            },
            (error) => {
                done(error);
            });
    });

    /* Test 5 - get the proposalId and proposalProcessId  */
    it('Should get topUpReturnGroup proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformObjId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformObjId, name: typeName});
        Q.all([typeProm, typeProcessProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    data[0].name.should.equal(typeName);
                    data[1].name.should.equal(typeName);
                    proposalTypeId = data[0]._id;
                    proposalTypeProcessId = data[1]._id;
                    done();
                }
                else {
                   done('proposalId and proposalTypeProcessId are not found');
                }
            }
        ).catch(
            function (error) {
               done(error);
            }
        );
    });

    /* Test 6 - get the topUpReturnGroup rewardType at the platform */
    it('Should get topUpReturnGroup rewardType at the platform', function (done) {
        dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_TOP_UP_RETURN_GROUP}).lean().then(
            (rewardType) => {
                if (rewardType) {
                    topUpReturnGroupRewardType = rewardType;
                    done();
                } else {
                    done('topUpReturnGroup rewardType is not found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 7 - find player'level at the platform */
    it('should find player level at the platform', function (done){
        dbConfig.collection_playerLevel.findOne({platform: testPlatformObjId, value: 0}).lean().then(
            (playerLevel) => {
                if (playerLevel) {
                    testPlatformPlayerLevelId = playerLevel._id;
                    done();
                }
                else{
                    done('Player level is not found at the platform')
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 8 - create topUpReturnGroup reward event */
    it('Should create topUpReturnGroup reward event', function (done) {
        createTopUpRewardEventData.platform = testPlatformObjId;
        createTopUpRewardEventData.type = topUpReturnGroupRewardType._id;
        createTopUpRewardEventData.executeProposal = proposalTypeId;
        createTopUpRewardEventData.param.rewardParam[0].levelId = testPlatformPlayerLevelId;
        dbRewardEvent.createRewardEvent(createTopUpRewardEventData).then(
            () => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 9 - find the topUpReturnGroup reward event */
    it('Should get the topUpReturnGroup reward event', function (done){
       dbRewardEvent.getRewardEvent({platform: testPlatformObjId, type: topUpReturnGroupRewardType._id, name: createTopUpRewardEventData.name}).then(
           (rewardEvent) => {
               if (rewardEvent){
                   topUpReturnGroupEvent= rewardEvent;
                   done();
               } else {
                   done('topUpReturnGroup reward event is not found')
               }

           },
           (error) => {
               done(error);
           }
       )
    });

    /* Test 10 - add top up record for the player */
    it('Should create a top up record for the player', function (done){
        commonTestFunc.createTopUpRecord(testPlayerObjId, testPlatformObjId,topUpAmountAddToPlayer).then(
            (record) => {
                if (record){

                    data.topUpRecordId=record._id;
                    done();
                } else {
                    done('Failed to add the top up record')
                }

            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 11 - apply topUpReturnGroup reward */
    it('Should apply topUpReturnGroup reward for the player', function (done){
        let proms = [];
        for (let index=0; index < 1; index++){
            proms.push(dbPlayerInfo.applyRewardEvent("", testPlayer.playerId, createTopUpRewardEventData.code,data,""));
        }
        Q.all(proms).then(
            (data) => {
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 13 - check the availability of the applyRewardEvent proposal data */
    it('Should contain the applyRewardEvent proposal  and the spendingamout is correct', function (done){
        dbProposal.getProposal({"data.platformId": testPlatformObjId, "data.playerObjId": testPlayerObjId}).then(
            (proposal) => {
                if (proposal){
                    topUpGroupProposal = proposal;
                    if (topUpGroupProposal.data.spendingAmount === topUpGroupProposal.data.rewardAmount * rewardEventSpendingTime) {
                        done();
                    } else {
                        done('The spending amount of TopUpGroupReward in proposal data is not correct')
                    }
                } else {
                    done('Proposal not found')
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 14 - */
        it('Should ensure the spending amount in proposal and in rewardTask is matched', function (done) {
         dbRewardTask.getRewardTask({playerId: testPlayerObjId, platformId: testPlatformObjId}).then(
             (rewardTask) => {
                if (rewardTask) {
                    topUpReturnGroupTask = rewardTask;
                     if (topUpGroupProposal.data.spendingAmount === topUpReturnGroupTask.requiredUnlockAmount) {
                         done();
                     } else {
                         done('The spending amount does not match with the required unlock amount');
                     }
                 } else {
                     done('topUpReturnGroupTask is not found');
                 }
            },
             (error) => {
                 done(error);
             }
         )
     });

    /* Test 15 - check the rewardAmount is added correctly to the player*/
    it('Should check the rewardAmount is added correctly to the player', function (done) {
        dbConfig.collection_players.findOne({_id: testPlayerObjId}).lean().then(
            (player) => {
                if (player.validCredit - testPlayer.validCredit === topUpGroupProposal.data.rewardAmount) {
                    testPlayer = player;
                    done();
                } else {
                    done('Player validCredit no match');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 100 - remove all test Data */
    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function () {
            done();
        })
    });


});