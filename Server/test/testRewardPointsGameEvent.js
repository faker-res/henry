let should = require('should');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');
let dbConfig = require('../modules/dbproperties');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbRewardPointsLvlConfig = require('../db_modules/dbRewardPointsLvlConfig');
let dbPlayerLevel = require('../db_modules/dbPlayerLevel');
let dbRewardPointsEvent = require('../db_modules/dbRewardPointsEvent');
let dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord.js');
let dbRewardTaskGroup = require('../db_modules/dbRewardTaskGroup.js');
let dbGame = require('../db_modules/dbGame.js');
let testGameTypes = require("../test/testGameTypes");

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

describe("Test player reward points for game event", function () {

    let testPlayer = null;
    let testPlayerName = null;
    let testPlayerObjId = null;
    let testPlayerRewardPointsObj= null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;

    let testProviderId = null;
    let testProviderObjId = null;
    let testPlatformRewardPointLevelConfig = null;
    let testGamingType = null;
    let testGameId = null;

    let testRewardPointEvent = null;
    let preRewardPoint = null;

    const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');

    const pointToCreditAutoMaxPoints = 300;
    const pointToCreditAutoRate = 25;
    const pointToCreditManualMaxPoints = 300;
    const pointToCreditManualRate = 30;
    const dailyMaxPoints = 1000;
    const spendingAmountOnReward = 6;

    const consumptionAmount=200;
    let rewardPointGiven = 10;

    const rewardPointGameEvent ={
        "category" : constRewardPointsLogCategory.GAME_REWARD_POINTS,
        "userAgent" : 0,
        "index" : 1,
        "period" : 1,
        "rewardPoints" : rewardPointGiven,
        "rewardTitle" : "test GameRP",
        "rewardContent" : "gameRP",
        "target" : {
            "gameType" : null,
            "betType" : ['1'],
            "targetDestination" : null,
            "dailyValidConsumptionAmount" : 100, // test the condition 2 (dailyValidConsumptionAmount: 100)
            "dailyConsumptionCount" : null,  // test condition 1 (dailyConsumptionCount: 1)
            "singleConsumptionAmount" : null,  // test condition 1 (singleConsumptionAmount: 100)
            "dailyWinGameCount" : null  // test condition 3 (dailyWinGameCount: 1)
        },
        "status" : true,
        "__v" : 0,
        "customPeriodStartTime" : null,
        "customPeriodEndTime" : null,
        "consecutiveCount" : 1

    };

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            (data) => {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 2 - create a new player with reward points */
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
            "lockedCredit" : 0,
            "validCredit" : 1000,  // add in  the validCredit for the consumption purpose
            "creditBalance" : 1000,
            isTestPlayer: true
           // bankCardGroup: testPlatformBankCardGroup._id
        };

        dbPlayerInfo.createPlayerInfoAPI(createPlayer).then(
            (data) => {
                testPlayer = data;
                testPlayerObjId = data._id;
                testPlayerRewardPointsObj = data.rewardPointsObjId; // test rewardPoints obj
                preRewardPoint = data.rewardPointsObjId.points;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 3 - is disable to use reward points system by default for new platform */
    it('Check is disable to use reward points system by default for new platform', function (done) {
        if (testPlatform.usePointSystem === false) {
            done();
        }
    });

    /* Test 4 - enable reward points system for unit test purpose */
    it('Should enable reward points system for unit test purpose', function (done) {
        if (testPlatform.usePointSystem === false) {
            dbConfig.collection_platform.findOneAndUpdate(
                {_id: testPlatformObjId},
                {usePointSystem: true},
                {new: true}).lean().then(
                (data) => {
                    testPlatform = data;
                    if (testPlatform.usePointSystem !== true) {
                        done('new platform reward points system should be enable');
                    }
                    done();
                },
                (error) => {
                    done(error);
                }
            );
        }
    });

    /* Test 4 - enable reward points system for unit test purpose */
    it('Should enable reward points system for unit test purpose', function (done) {
        if (testPlatform.useProviderGroup === false) {
            dbConfig.collection_platform.findOneAndUpdate(
                {_id: testPlatformObjId},
                {useProviderGroup: true},
                {new: true}).lean().then(
                (data) => {
                    testPlatform = data;
                    done();
                },
                (error) => {
                    done(error);
                }
            );
        }
    });

    /* Test 5 - set reward points level config to platform */
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
                        "pointToCreditAutoMaxPoints": pointToCreditAutoMaxPoints,
                        "pointToCreditAutoRate": pointToCreditAutoRate,
                        "pointToCreditManualMaxPoints": pointToCreditManualMaxPoints,
                        "pointToCreditManualRate": pointToCreditManualRate,
                        "dailyMaxPoints": dailyMaxPoints,
                        "spendingAmountOnReward": spendingAmountOnReward,
                        "levelObjId": playerLevel._id,
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


    /* Test 6 - create TestGameProvider to platform*/
    it('Should create TestGameProvider to platform', function (done) {
        commonTestFunc.createTestGameProvider().then(
            (data) => {
                testProviderObjId = data._id;
                testProviderId = data.providerId;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 7 - create TestGame to platform*/
    it('Should create TestGame to the TestGameProvider in the platform', function (done) {

        let date = new Date();
        let gameData = {
            name: commonTestFunc.testGameName + date.getTime(),
            provider: testProviderObjId,
            type: testGameTypes.CARD,
            code: commonTestFunc.testGameName + date.getTime(),
            gameId: date.getTime()
        };
        dbGame.createGame(gameData).then(
            (data) => {
                testGamingType=data.type;
                testGameId = data.gameId;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 8 - create game reward point event to platform*/
    it('Should create game reward point event to platform', function (done) {
        rewardPointGameEvent.platformObjId = testPlatformObjId;
        rewardPointGameEvent.target.gameType = testGamingType;
        rewardPointGameEvent.target.targetDestination = String(testProviderObjId);
        dbRewardPointsEvent.createRewardPointsEvent(rewardPointGameEvent).then(
            (rewardPointEvent) => {
                testRewardPointEvent = rewardPointEvent;
                done();
            },
            (error) => {
                done(error);
            })
    });

    /* Test 9 - add in consumption record to the test player*/
    it('Should create a consumption record to the test player', function (done) {
        let recordData = {
            userName: testPlayer.name,
            playerId: testPlayerObjId,
            platformId: testPlatformId,
            gameId: testGameId,
            cpGameType: testGamingType,
            orderNo: Math.floor(Math.random() * 10),
            roundNo : Math.floor(Math.random() * 10),
            validAmount: consumptionAmount,
            bonusAmount: consumptionAmount,
            amount: consumptionAmount,
            providerId: testProviderId,
            betType: '1'
        };

        let p = Promise.resolve(dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(recordData));
        p.then(
            (newRecord) => {
                if (newRecord){
                    done();
                } else {
                    done('consumption record is failed to create')
                }
            },
            (error) => {
                done(error);
            }
        )
    });


    /* Test 10 - check player reward point after apply gameRewardPoints */
    it('Should add reward point to player', function (done) {
        setTimeout(function () {
            dbConfig.collection_rewardPoints.findOne({_id: testPlayerRewardPointsObj._id}).lean().then(
                (rewardPoints) => {
                    if (rewardPoints && rewardPoints.points === rewardPointGiven) {
                        done();
                    } else {
                        done('rewardPoints is either not found or does not exist');
                    }
                },
                (error) => {
                    done(error);
                }
            );
        },1000); // add a delay function for test 9 to run completely, else the inner functions in the test 8 will not execute completely

        });

    /* Test 11 - check the gameRewardPoint is added up correctly */
    it('Should the reward point be added up correctly', function (done) {
        dbConfig.collection_rewardPointsLog.findOne({rewardPointsObjId: testPlayerRewardPointsObj._id})
            .sort({'createTime': -1}).lean().then(
            (rewardPointsLog) => {
                if (rewardPointsLog && rewardPointsLog.amount === rewardPointGiven) {
                    done();
                } else {
                    done('rewardPointsLog no found');
                }
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 99 - remove all test Data */
    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function (data) {
            done();
        })
    });
});



