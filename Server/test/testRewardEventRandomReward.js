let should = require('should');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

let Q = require("q");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constRewardType = require('../const/constRewardType');
const constProposalType = require('../const/constProposalType');
const constRewardTaskStatus = require('../const/constRewardTaskStatus');

let dbConfig = require('../modules/dbproperties');
let dbUtility = require("../modules/dbutility");
let dbRewardEvent = require('../db_modules/dbRewardEvent');
let dbRewardTask = require('../db_modules/dbRewardTask');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbProposal = require('../db_modules/dbProposal');
let dbProposalType = require('../db_modules/dbProposalType');
let dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
let dbGameProvider = require('../db_modules/dbGameProvider');
let dbPlatform = require('../db_modules/dbPlatform');
let dbRewardTaskGroup = require('../db_modules/dbRewardTaskGroup');
let dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');

describe("Test random reward group reward", function () {

    let testPlayer = null;
    let testPlayerObjId = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;
    let testPlatformPlayerLevelId = null;

    let testPlatformGame = null;
    let testPlatformGameProvider = null;
    let testPlatformGameProviderGroup = null;

    let typeName = constProposalType.PLAYER_RANDOM_REWARD_GROUP;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;

    let randomRewardType = null;
    let randomRewardEvent = null;
    let randomRewardProposal = null;
    let randomRewardRewardTask = null;

    let randomRewardEventName = commonTestFunc.testRewardEventName + new Date().getTime();
    const rewardEventUseProviderGroup = false;

    const rewardEventRequiredConsumptionAmount = 10000;
    const rewardEventRequiredTopUpAmount = 1000;
    const consumptionAmountAddToPlayer = 10000;
    const consumptionCountAddToPlayer = 5;
    const topUpAmountAddToPlayer = 1000;
    const topUpCountAddToPlayer = 5;
    const rewardEventSpendingTimesOnReward = 10;
    const rewardEventNumberParticipation = 1;
    const rewardEventRewardPercentageAmount = [
        {
            "amount": 10,
            "percentage": 0.5
        }
    ];
    let createRandomRewardEventData = {
        //"platform": testPlatformObjId,
        //"type": randomRewardType._id,
        "name": randomRewardEventName,
        "code": randomRewardEventName,
        "validStartTime": dbUtility.getTodaySGTime().startTime,
        "validEndTime": dbUtility.getTodaySGTime().endTime,
        //"executeProposal": proposalTypeId,
        "settlementPeriod": "2",
        "needSettlement": false,
        "param": {
            "rewardParam": [
                {
                    "value": [
                        {
                            "operatorOption": true,
                            "forbidWithdrawAfterApply": false,
                            "forbidWithdrawIfBalanceAfterUnlock": 100,
                            "remark": randomRewardEventName + " 金鹰捉鸡无LV",
                            "spendingTimesOnReward": rewardEventSpendingTimesOnReward,
                            "requiredConsumptionAmount": rewardEventRequiredConsumptionAmount,
                            "requiredTopUpAmount": rewardEventRequiredTopUpAmount,
                            "numberParticipation": rewardEventNumberParticipation,
                            "rewardPercentageAmount": rewardEventRewardPercentageAmount
                        }
                    ]//,
                    //"levelId": "5732dad105710cf94b5cfaae"
                }
            ]
        },
        "condition": {
            "useConsumptionRecord": false,
            // "providerGroup": "",
            "ignoreTopUpDirtyCheckForReward": [],
            "consumptionProvider": [],
            "rewardAppearPeriod": [
                {
                    "startDate": dbUtility.getDayOfWeek(),
                    "startTime": 0,
                    "endDate": dbUtility.getDayOfWeek(),
                    "endTime": 23
                }
            ],
            "interval": "1",
            "bankCardType": [],
            "onlineTopUpType": [],
            "topupType": [],
            "userAgent": [],
            "validEndTime": dbUtility.getTodaySGTime().endTime,
            "validStartTime": dbUtility.getTodaySGTime().startTime,
            "isIgnoreAudit": true,
            "canApplyFromClient": true,
            "applyType": "1",
            "code": "chicken",
            "name": randomRewardEventName + "金鹰捉鸡（测试）"
        },
        "canApplyFromClient": true,
        "needApply": false
    };

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            (data) => {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return dbPlatform.updatePlatform({_id: testPlatformObjId}, {useProviderGroup: rewardEventUseProviderGroup});
            },
            (error) => {
                done(error);
            }
        ).then(
            (data) => {
                testPlatform = data;
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 1.1 - create game provider and game for platform */
    it('Should create game provider and game for platform', function (done) {
        commonTestFunc.createTestGameProvider().then(
            (gameProvider) => {
                testPlatformGameProvider = gameProvider;
                return commonTestFunc.createGame(testPlatformGameProvider._id);
            },
            (error) => {
                done(error);
            }
        ).then(
            (game) => {
                testPlatformGame = game;
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 1.2 - create game provider group */
    it('Should create game provider group', function (done) {
        let providerGroup = [{
            name: 'asdas',
            providers: [testPlatformGameProvider._id]
        }];
        dbGameProvider.updatePlatformProviderGroup(testPlatformObjId, providerGroup).then(
            (gameProvider) => dbGameProvider.getPlatformProviderGroup(testPlatformObjId),
            (error) => {
                done(error);
            }
        ).then(
            (gameProviderGroup) => {
                testPlatformGameProviderGroup = gameProviderGroup[0];
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 2 - create a new player */
    it('Should create player', function (done) {
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

    /* Test 3 - get proposal type id and proposal type process id */
    it('Should get proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformObjId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
            platformId: testPlatformObjId,
            name: typeName
        });

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
                    done('proposal type id and proposal type process no found');
                }
            }
        ).catch(
            function (error) {
                done(error);
            }
        );
    });

    /* Test 4 - find random reward type */
    it('Should find random reward type on platform', function (done) {
        dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_RANDOM_REWARD_GROUP}).lean().then(
            (rewardType) => {
                if (rewardType) {
                    randomRewardType = rewardType;
                    done();
                } else {
                    done('Random Reward Group rewardType no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 5 - find platform player level */
    it('Should find player level on platform', function (done) {
        dbConfig.collection_playerLevel.findOne({platform: testPlatformObjId, value: 0}).lean().then(
            (playerLevel) => {
                if (playerLevel) {
                    testPlatformPlayerLevelId = playerLevel._id;
                    done();
                } else {
                    done('Platform player level no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 6 - create random reward event */
    it('Should create random reward event', function (done) {
        createRandomRewardEventData.type = randomRewardType._id;
        createRandomRewardEventData.executeProposal = proposalTypeId;
        createRandomRewardEventData.param.rewardParam[0].levelId = testPlatformPlayerLevelId;
        createRandomRewardEventData.platform = testPlatformObjId;
        if (rewardEventUseProviderGroup) {
            createRandomRewardEventData.condition.providerGroup = testPlatformGameProviderGroup._id.toString();
        }
        dbRewardEvent.createRewardEvent(createRandomRewardEventData).then(
            () => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 7 - find random reward event */
    it('Should find random reward event', function (done) {
        dbRewardEvent.getRewardEvent({platform: testPlatformObjId, type: randomRewardType._id}).then(
            (rewardEvent) => {
                if (rewardEvent) {
                    randomRewardEvent = rewardEvent;
                    done();
                } else {
                    done('Random reward event no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 8 - add top up record and consumption record to player*/
    it('Should add top up record and consumption record to player', function (done) {
        let topupProm = [];
        let consumptionProm = [];
        for (let a = 0; a < topUpCountAddToPlayer; a++) {
            topupProm.push(commonTestFunc.createTopUpRecord(testPlayerObjId, testPlatformObjId, topUpAmountAddToPlayer));
        }
        for (let a = 0; a < consumptionCountAddToPlayer; a++) {
            consumptionProm.push(commonTestFunc.createConsumptionRecord(testPlayerObjId, testPlatformObjId, consumptionAmountAddToPlayer));
        }
        Q.all([topupProm, consumptionProm]).then(
            () => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 9 - apply random reward event*/
    it('Should apply random reward event', function (done) {
        let proms = [];
        for (let a = 0; a < 5; a++) {
            proms.push(dbPlayerInfo.applyRewardEvent("", testPlayer.playerId, createRandomRewardEventData.code, "").then(
                data => {
                    return true;
                },
                err => {
                    return false
                }
            ));
        }
        Q.all(proms).then(
            (data) => {
                if (data.indexOf(true) > -1){
                    done();
                }else {
                    done(new Error("all promise failed"));
                }
            },
            (error) => {
                done();
            }
        );
    });

    /* Test 10 - check apply reward event proposal data */
    it('Should check is add reward event proposal data', function (done) {
        dbProposal.getProposal({"data.platformId": testPlatformObjId, "data.playerObjId": testPlayerObjId}).then(
            (proposal) => {
                if (proposal) {
                    randomRewardProposal = proposal;
                    if (randomRewardProposal.data.spendingAmount === randomRewardProposal.data.rewardAmount * rewardEventSpendingTimesOnReward) {
                        done();
                    } else {
                        done('Random reward event proposal data spending amount no match');
                    }
                } else {
                    done('Reward event proposal no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 11 - check is add reward task and data match proposal */
    it('Should check is add reward task and data match proposal', function (done) {
        let getTaskProm = dbConfig.collection_rewardTask.findOne({
            playerId: testPlayerObjId,
            platformId: testPlatformObjId
        });
        if (rewardEventUseProviderGroup) {
            getTaskProm = dbConfig.collection_rewardTaskGroup.findOne({
                playerId: testPlayerObjId,
                platformId: testPlatformObjId
            });
        }

        getTaskProm.then(
            (rewardTask) => {
                if (rewardTask) {
                    randomRewardRewardTask = rewardTask;
                    if (!rewardEventUseProviderGroup && randomRewardProposal.data.spendingAmount === randomRewardRewardTask.requiredUnlockAmount) {
                        done();
                    } else if (rewardEventUseProviderGroup && randomRewardProposal.data.spendingAmount === randomRewardRewardTask.targetConsumption) {
                        done();
                    } else {
                        done('Random reward event proposal data and reward task no match');
                    }
                } else {
                    done('Random reward event reward task no found');
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 12 - check is credit add to user */
    it('Should check is credit add to user', function (done) {
        dbConfig.collection_players.findOne({_id: testPlayerObjId}).lean().then(
            (player) => {
                if (!rewardEventUseProviderGroup && player.validCredit - testPlayer.validCredit === randomRewardProposal.data.rewardAmount) {
                    testPlayer = player;
                    done();
                } else if (rewardEventUseProviderGroup && player.validCredit === testPlayer.validCredit) {
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

    /* Test 13 - add consumption record to player to unlock reward task */
    it('Should add consumption record to player to unlock reward task', function (done) {
        let recordData = {
            userName: testPlayer.name,
            playerId: testPlayerObjId,
            platformId: testPlatform.platformId,
            gameId: testPlatformGame.gameId,
            gameType: testPlatformGame.type,
            orderNo: new Date().getTime() + Math.random(),
            validAmount: randomRewardProposal.data.spendingAmount,
            providerId: testPlatformGameProvider.providerId
        };
        dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(recordData).then(
            () => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 14 - check is unlock reward task */
    it('Should unlock reward task', function (done) {
        let getTaskProm = dbConfig.collection_rewardTask.findOne({
            playerId: testPlayerObjId,
            platformId: testPlatformObjId
        });
        if (rewardEventUseProviderGroup) {
            getTaskProm = dbConfig.collection_rewardTaskGroup.findOne({
                playerId: testPlayerObjId,
                platformId: testPlatformObjId
            });
        }
        getTaskProm.then(
            (rewardTask) => {
                if (rewardTask.status === constRewardTaskStatus.COMPLETED || rewardTask.status === constRewardTaskStatus.ACHIEVED) {
                    done();
                } else {
                    done('Reward task should unlock but no unlock');
                }
            },
            (error) => {
                done(error);
            }
        )
    });


    /* Test 99 - remove all test Data */
    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function (data) {
            done();
        })
    });
});