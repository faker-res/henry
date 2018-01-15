let should = require('should');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let Q = require("q");

const constPlayerRegistrationInterface = require('../const/constPlayerRegistrationInterface');
const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');

let dbConfig = require('../modules/dbproperties');
let dbPlayerRewardPoints = require('../db_modules/dbPlayerRewardPoints');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbRewardPointsLvlConfig = require('../db_modules/dbRewardPointsLvlConfig');
let dbPlayerLevel = require('../db_modules/dbPlayerLevel');
let dbGameProvider = require('../db_modules/dbGameProvider');

describe("Test player reward points convert", function () {

    let testPlayer = null;
    let testPlayerObjId = null;
    let testPlayerRewardPoints = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;
    let testPlatformRewardPointLevelConfig = null;

    let testPlatformGame = null;
    let testPlatformGameProvider = null;
    let testPlatformGameProviderGroup = null;

    let rewardPointRewardTask = null;
    let rewardAmountToPlayer = null;

    const pointToCreditAutoMaxPoints = 20;
    const pointToCreditAutoRate = 5;
    const pointToCreditManualMaxPoints = 500;
    const pointToCreditManualRate = 5;
    const dailyMaxPoints = 100;
    const spendingAmountOnReward = 5;

    const amountRewardPointsAddToPlayer = 100;
    const isUseProviderGroup = false;


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

    /* Test 2 - check and enable reward points system by default for new platform */
    it('Should check and enable reward points system by default for new platform', function (done) {
        if (testPlatform.usePointSystem !== false) {
            done('default new platform reward points system should be disabled');
        } else {
            dbConfig.collection_platform.findOneAndUpdate(
                {_id: ObjectId(testPlatformObjId)},
                {usePointSystem: true, useProviderGroup: isUseProviderGroup},
                {new: true}).lean().then(
                (data) => {
                    testPlatform = data;
                    testPlatform.should.have.property('usePointSystem', true);
                    done();
                },
                (error) => {
                    done(error);
                }
            );
        }
    });

    /* Test 3 - create a new player with reward points */
    it('Should create player with reward points', function (done) {
        let date = new Date();
        let createPlayer = {
            "name": commonTestFunc.testPlayerName + date.getTime() + commonTestFunc.getRandomInt(),
            "email": "testPlayer123@gmail.com",
            "realName": "testPlayerRealName",
            "password": "123456",
            "platform": testPlatformObjId,
            "platformId": testPlatformId,
            "phoneNumber": "93354765",
            isTestPlayer: true
        };

        dbPlayerInfo.createPlayerInfoAPI(createPlayer).then(
            (data) => {
                testPlayer = data;
                testPlayerObjId = data._id;
                testPlayerRewardPoints = data.rewardPointsObjId;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 4 - set reward points level config to platform */
    it('Should set reward points level config to platform', function (done) {
        dbPlayerLevel.getPlayerLevel({platform: testPlatformObjId}).then(
            (playerLevels) => {
                let rewardPointsLvlConfig = {
                    platformObjId: testPlatformObjId,
                    applyMethod: 2,
                    customPeriodEndTime: null,
                    customPeriodStartTime: null,
                    intervalPeriod: 1
                };
                rewardPointsLvlConfig.params = playerLevels.map(playerLevel => {
                    return {
                        "pointToCreditAutoMaxPoints" : pointToCreditAutoMaxPoints,
                        "pointToCreditAutoRate" : pointToCreditAutoRate,
                        "pointToCreditManualMaxPoints" : pointToCreditManualMaxPoints,
                        "pointToCreditManualRate" : pointToCreditManualRate,
                        "dailyMaxPoints" : dailyMaxPoints,
                        "spendingAmountOnReward" : spendingAmountOnReward,
                        "levelObjId" : playerLevel._id,
                        "providerGroup" : isUseProviderGroup? testPlatformGameProviderGroup._id : null,
                    };
                });
                return dbRewardPointsLvlConfig.upsertRewardPointsLvlConfig(rewardPointsLvlConfig);
            },
            (error) => {
                done(error);
            }
        ).then(
            (data) => {
                testPlatformRewardPointLevelConfig = data;
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 5 - add reward points to player*/
    it('Should add reward points to player', function (done) {
        dbPlayerRewardPoints.changePlayerRewardPoint(testPlayerObjId, testPlatformObjId, amountRewardPointsAddToPlayer, constRewardPointsLogCategory.POINT_INCREMENT, "", constPlayerRegistrationInterface.BACKSTAGE, "test", constRewardPointsLogStatus.PROCESSED)
            .then(
                (data) => {
                    done();
                },
                (error) => {
                    done(error);
                }
            )
    });

    /* Test 6 - check is log match when add reward points to player*/
    it('Should create log when add reward points to player', function (done) {
        dbConfig.collection_rewardPointsLog.findOne({rewardPointsObjId: testPlayerRewardPoints._id})
            .sort({'createTime':-1}).lean().then(
            (data) => {
                data.should.have.property('amount', amountRewardPointsAddToPlayer);
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 7 - convert player reward point to credit*/
    it('Should convert player reward point to credit', function (done) {
        dbPlayerRewardPoints.convertRewardPointsToCredit(testPlayer.playerId, amountRewardPointsAddToPlayer, '', constPlayerRegistrationInterface.BACKSTAGE).then(
            (data) => {
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 8 - check player reward point & log after convert reward point*/
    it('Should create log and deduct reward point from player', function (done) {
        let logProm = dbConfig.collection_rewardPointsLog.findOne({rewardPointsObjId: testPlayerRewardPoints._id})
            .sort({'createTime':-1}).lean();

        let rewardPointProm = dbConfig.collection_rewardPoints.findOne({_id: testPlayerRewardPoints._id}).lean();

        Q.all([logProm, rewardPointProm]).then(
            (data) => {
                should.exist(data);
                should.exist(data[0]);
                should.exist(data[1]);

                let log = data[0];
                testPlayerRewardPoints = data[1];
                log.should.have.property('amount', -amountRewardPointsAddToPlayer);
                testPlayerRewardPoints.should.have.property('points', 0);
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 9 - check is add credit to player */
    it('Should add credit to player', function (done) {
        dbConfig.collection_players.findOne({_id: testPlayerObjId})
            .sort({'createTime':-1}).lean().then(
            (player) => {
                let convertPoint = amountRewardPointsAddToPlayer > pointToCreditManualMaxPoints? pointToCreditManualMaxPoints : amountRewardPointsAddToPlayer;
                rewardAmountToPlayer = Math.floor(convertPoint / pointToCreditManualRate);

                if (player.validCredit === rewardAmountToPlayer || (isUseProviderGroup && player.validCredit === 0)) {
                    done();
                }else {
                    done(new Error('Player credit no match'));
                }
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 10 - check is add reward task */
    it('Should check is add reward task', function (done) {
        let getTaskProm = dbConfig.collection_rewardTask.findOne({
            playerId: testPlayerObjId,
            platformId: testPlatformObjId
        });
        if (isUseProviderGroup) {
            getTaskProm = dbConfig.collection_rewardTaskGroup.findOne({
                playerId: testPlayerObjId,
                platformId: testPlatformObjId
            });
        }

        getTaskProm.then(
            (rewardTask) => {
                should.exist(rewardTask);
                rewardPointRewardTask = rewardTask;
                if (!isUseProviderGroup && rewardAmountToPlayer * spendingAmountOnReward  === rewardPointRewardTask.requiredUnlockAmount) {
                    done();
                } else if (isUseProviderGroup && rewardAmountToPlayer * spendingAmountOnReward === rewardPointRewardTask.targetConsumption) {
                    done();
                } else {
                    done(new Error('Random reward event proposal data and reward task no match'));
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