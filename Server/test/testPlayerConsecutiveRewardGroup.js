"use strict";

require('../test_modules/improveMochaReporting')();
var Q = require("q");
var should = require('should');
var commonTestFunc = require('../test_modules/commonTestFunc');
var dbconfig = require('../modules/dbproperties');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var ObjectId = mongoose.Types.ObjectId;
var dbRewardEvent = require('../db_modules/dbRewardEvent');
let dbProposal = require('./../db_modules/dbProposal');
let dbProposalType = require('./../db_modules/dbProposalType');
let dbProposalTypeProcess = require('./../db_modules/dbProposalTypeProcess');
let dbRewardTask = require('./../db_modules/dbRewardTask');
var constRewardType = require('./../const/constRewardType');

describe("Test player consecutive reward group", function () {

    let topUpAmount = 100;
    let proms = [];
    let rewardType = constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP;

    let testPlatformId;
    let testPlayer;
    let testPlayerId;
    let testPlayerLevelId;
    let testProposalTypeId;
    let testProposalTypeProcessId;
    let consecutiveRewardType;
    let consecutiveRewardEvent;
    let consecutiveRewardProposal;
    let consecutiveRewardRewardTask;
    let consecutiveRewardSpendingTimes = 5;

    let date = new Date();
    let rewardCreationData = {
        canApplyFromClient: false,
        code: "签到全勤自由",
        condition: {
            allowReclaimMissedRewardDay: true,
            //applyType: "2",
            applyType: "1",
            bankcardType: ["1","2","3","4","5","6","7","9","10","11","12","13","161","169"],
            canApplyFromClient: false,
            code: "签到全勤自由",
            interval: "2",
            isShareWithXIMA: true,
            name: "签到全勤自由",
            onlineTopUpType: ["1","2","3","4","5","6","7","8","9","10","11","12","13"],
            topupType: ["1","2","3","4"],
            userAgent: ["0","1","2","3","4","5","6"],
            validEndTime: date.setDate(1500),
            validStartTime: date.setDate(-1500),
        },
        name: "签到全勤自由",
        param: {
            isMultiStepReward: true,
            operatorOption: undefined,
            requiredConsumptionAmount: 2000,
            requiredTopUpAmount: 100,
            rewardParam: [{
                levelId: ObjectId("5a435c74897fa14e68e2fb0b"),
                value: [{
                    rewardAmount: 10,
                    spendingTimes: 5
                },{
                    rewardAmount: 20,
                    spendingTimes: 10
                },{
                    rewardAmount: 30,
                    spendingTimes: 10
                }]
            }],

        },
        validEndTime: date.setDate(+1500),
        validStartTime: date.setDate(-1500),
    }

    it('Should create test API platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test API player', function (done) {

        commonTestFunc.createTestPlayer(testPlatformId).then(
            function (data) {
                testPlayer = data;
                testPlayerId = data._id;
                testPlayerLevelId = data.playerLevel;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should get proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: rewardType});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
                platformId: testPlatformId,
                name: rewardType
        });

        Q.all([typeProm, typeProcessProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                        data[0].name.should.equal(rewardType);
                        data[1].name.should.equal(rewardType);
                        testProposalTypeId = data[0]._id;
                        testProposalTypeProcessId = data[1]._id;
                        done();
                    }
                else {
                        done('proposal type id and proposal type process no found');
                }
            },
            error => {
                done(error);
            }
        );
    });

    it('Should find consecutive reward type on platform', function (done) {
        dbconfig.collection_rewardType.findOne({name: rewardType}).lean().then(
            rewardType => {
                if (rewardType) {
                    consecutiveRewardType = rewardType;
                    done();
                    } else {
                    done('rewardType no found');
                    }
                },
                (error) => {
                    done(error);
                }
        )
    });

    it('creates PlayerConsecutiveRewardGroup reward', function (done) {
        rewardCreationData.platform = testPlatformId;
        rewardCreationData.type = consecutiveRewardType._id;
        dbRewardEvent.createRewardEvent(rewardCreationData).then(
            () => {
                done();
            },
            error => {
                done(error);
            }
        )
    });

    it('Should find consecutive reward event', function (done) {
        dbRewardEvent.getRewardEvent({platform: testPlatformId, type: consecutiveRewardType._id}).then(
            (rewardEvent) => {
                if (rewardEvent) {
                    consecutiveRewardEvent = rewardEvent;
                    done();
                } else {
                    done('Consecutive reward event no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    it('Should add top up record and consumption record to player', function (done) {
        dbPlayerInfo.playerTopUp(testPlayerId, topUpAmount, "testPayment").then(
            data => {
                done();
            },
            error => {
                done(error);
            }
        );
    });

    it('Should get player data', function () {
        return dbconfig.collection_players.findOne({_id: testPlayerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            data => {
                testPlayer = data;
            }
        );
    });

    it('Should apply consecutive reward event', function (done) {
        for(let i = 0; i < 10; i ++){
            proms.push(dbPlayerInfo.applyRewardEvent("", testPlayer.playerId, rewardCreationData.code, "").then(
                data => {
                    return true;
                },
                (error) => {
                    return false;
                }
            ));
        }

        Promise.all(proms).then(
            data => {
                if(data.indexOf(true) > -1){
                    done();
                }else{
                    done(new Error("All failed"));
                }
            },
            error => {
                done(error);
            }
        )
    });

    it('Should check is add reward event proposal data', function (done) {
        dbProposal.getProposal({"data.platformId": testPlatformId, "data.playerObjId": testPlayerId}).then(
            (proposal) => {
                if (proposal) {
                    consecutiveRewardProposal = proposal;

                    if (consecutiveRewardProposal.data.spendingAmount === consecutiveRewardProposal.data.rewardAmount * consecutiveRewardSpendingTimes) {
                        done();
                    } else {
                        done('Consecutive reward event proposal data spending amount no match');
                    }
                } else {
                    done('Consecutive event proposal no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    it('Should check is add reward task and data match proposal', function (done) {
        dbRewardTask.getRewardTask({playerId: testPlayerId, platformId: testPlatformId}).then(
            (rewardTask) => {
                if (rewardTask) {
                    consecutiveRewardRewardTask = rewardTask;
                    if (consecutiveRewardProposal.data.spendingAmount === consecutiveRewardRewardTask.requiredUnlockAmount) {
                        done();
                    } else {
                        done('Consecutive reward event proposal data and reward task no match');
                    }
                } else {
                    done('Consecutive reward event reward task no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    it('Should check is credit add to user', function (done) {
        dbconfig.collection_players.findOne({_id: testPlayerId}).lean().then(
            (player) => {
                if(player && testPlayer){

                    if (player.validCredit - testPlayer.validCredit === consecutiveRewardProposal.data.rewardAmount) {
                        testPlayer = player;
                        done();
                    } else {
                        done('Player validCredit no match');
                    }
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId,  [testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([], testPlatformId, [], [testPlayerId]).then(function(data){
            done();
        })
    });

});