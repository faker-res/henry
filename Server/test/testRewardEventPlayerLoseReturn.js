"use strict";

require('../test_modules/improveMochaReporting')();
var Q = require("q");
var should = require('should');
var commonTestFun = require('../test_modules/commonTestFunc');
var dataGenerator = require("./../test_modules/dataGenerator.js");
var dbconfig = require('../modules/dbproperties');
var dbPlayerConsumptionRecord = require("../db_modules/dbPlayerConsumptionRecord.js");
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require("../db_modules/dbPlayerLevel.js");
let dbPlatform = require("../db_modules/dbPlatform.js");
let dbProposal = require("../db_modules/dbProposal.js");
let dbRewardTask = require("../db_modules/dbRewardTask.js");

describe("Test reward event player lose return group", function () {

    var topUpAmount = 500;

    var generatedData = {};


    //test data
    var proposalType = "PlayerLoseReturnRewardGroup";
    var rewardType;
    var platformLevel;
    var rewardEvent;
    var playerData;
    var proposalTypeProcess;
    var proposalData;
    var rewardAmount = 50;

    it('creates test player, platform, games', function () {
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData).then(
            data => {
                console.log("test data", generatedData)
            }
        );
    });

    it('get reward type', function () {
        return dbconfig.collection_rewardType.findOne({name: proposalType}).lean().then(
            data => {
                rewardType = data;
            }
        );
    });

    it('get platform level data', function () {
        return dbconfig.collection_playerLevel.find({platform: generatedData.testPlatformId}).sort({value:1}).lean().then(
            data => {
                platformLevel = data;
            }
        );
    });

    it('create test ProposalTypeProcess', function () {
        return commonTestFun.createTestProposalTypeProcess({
            platformId:  generatedData.testPlatformId,
            name: proposalType,
            steps: []
        }).then(
            data => {
                proposalTypeProcess = data;
            }
        )
    });

    it('create proposal type', function () {
        return commonTestFun.createTestProposalType({
            platformId: generatedData.testPlatformId,
            name: proposalType,
            process: proposalTypeProcess._id,
            executionType: "execute"+proposalType,
            rejectionType: "reject"+proposalType
        })
    });

    it('create player lose return group config', function () {
        return commonTestFun.createRewardEvent({
            platform: generatedData.testPlatformId,
            type: rewardType._id,
            name: "unitTestLoseReturn",
            code: "unitTestCode",
            validStartTime: null,
            validEndTime: null,
            param : {
                rewardParam : [
                    {
                        value : [
                            {
                                remark : "1",
                                spendingTimes : 2,
                                rewardAmount : rewardAmount,
                                minLoseAmount : 10,
                                minDeposit : 100
                            }
                        ],
                        levelId : platformLevel[0]._id.toString()
                    }
                ],
                isMultiStepReward : true
            },
            condition : {
                isIgnoreAudit : true,
                defineLoseValue : "1",
                topUpCountType : [
                    "1",
                    1
                ],
                interval : "1",
                applyType : "1",
                code : "unitTestCode",
                name : "unitTestLoseReturn"
            },
            "canApplyFromClient" : false,
            "needApply" : false,
        })
    });



    it('add consumption record for player', function () {
        return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
            {
                playerId: generatedData.testPlayerId,
                platformId: generatedData.testPlatformId,
                providerId: generatedData.testGameProviderObjId,
                gameId: generatedData.testGameId,
                orderNo: new Date().getTime()+Math.random(),
                gameType: generatedData.testGameType,
                amount: 500,
                createTime: new Date()
            }
        );
    });

    it('add topup record for player', function (done) {
        // We actually perform two topups in parallel, because this used to cause a bug
        dbPlayerInfo.playerTopUp(generatedData.testPlayerId, topUpAmount, "testPayment").then(
            data => {
                done();
            }
        );
    });

    it('get player data', function () {
        return dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            data => {
                playerData = data;
            }
        );
    });

    it('get reward event data', function () {
        return dbconfig.collection_rewardEvent.findOne({platform: playerData.platform._id, code: "unitTestCode"})
            .populate({path: "type", model: dbconfig.collection_rewardType}).lean().then(
                data => {
                    rewardEvent = data;
                }
            );
    });

    it('test apply reward', function (done) {
        let proms = [];
        for (let a = 0; a < 10; a++) {
            proms.push(dbPlayerInfo.applyRewardEvent("", playerData.playerId, "unitTestCode", "").then(
                data => {
                    return true;
                },
                err => {
                    return false
                }
            ));
        }


        Promise.all(proms).then(
            (data) => {
                if (data.indexOf(true) > -1){
                    done();
                }else {
                    done(new Error("all promise failed"));
                }
            },
            (err) => {
                done();
            }
        )
    });


    it('Should check is add reward event proposal data', function (done) {
        dbProposal.getProposal({"data.platformId": generatedData.testPlatformId, "data.playerObjId": generatedData.testPlayerId}).then(
                (proposal) => {
                    if (proposal) {
                            proposalData = proposal;
                            proposalData.data.rewardAmount.should.equal(rewardAmount);
                            done();
                        } else {
                            done('Reward event proposal no found');
                        }
                },
            (error) => {
                    done(error);
                }
        )
    });


    it('Should check is add reward task and data match proposal', function (done) {
        dbRewardTask.getRewardTask({playerId: generatedData.testPlayerId, platformId: generatedData.testPlatformId}).then(
                (rewardTask) => {
                    if (rewardTask) {
                            if (proposalData.data.spendingAmount === rewardTask.requiredUnlockAmount) {
                                    done();
                                } else {
                                    done('reward event proposal data and reward task no match');
                                }
                        } else {
                            done('reward event reward task no found');
                        }
                },
            (error) => {
                    done(error);
                }
        )
    });


    it('Should check is credit add to user', function (done) {
        dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).lean().then(
                (player) => {
                    if (player.validCredit - playerData.validCredit === proposalData.data.rewardAmount) {
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

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(generatedData.testPlatformId,  [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([],generatedData.testPlatformId, [], [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });



});