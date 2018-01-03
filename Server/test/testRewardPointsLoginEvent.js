let should = require('should');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let Q = require("q");

const constPlayerRegistrationInterface = require('../const/constPlayerRegistrationInterface');
const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');
const constPlayerTopUpType = require('../const/constPlayerTopUpType');
const constProposalStatus = require('../const/constProposalStatus');

let dbConfig = require('../modules/dbproperties');
let dbPlayerRewardPoints = require('../db_modules/dbPlayerRewardPoints');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbRewardPointsLvlConfig = require('../db_modules/dbRewardPointsLvlConfig');
let dbPlayerLevel = require('../db_modules/dbPlayerLevel');
let dbRewardPointsEvent = require('../db_modules/dbRewardPointsEvent');
let dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
let dbProposal = require('../db_modules/dbProposal');
let dbRewardPoints = require('../db_modules/dbRewardPoints');
describe("Test player reward points login event", function () {

    let testPlayer = null;
    let testPlayerObjId = null;
    let testPlayerRewardPoints = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;
    let testPlatformRewardPointLevelConfig = null;
    let testPlatformBankCardGroup = null;

    let testRewardPointEvent = null;
    let testRewardPointEventProposal = null;

    const pointToCreditAutoMaxPoints = 20;
    const pointToCreditAutoRate = 5;
    const pointToCreditManualMaxPoints = 500;
    const pointToCreditManualRate = 5;
    const dailyMaxPoints = 100;
    const spendingAmountOnReward = 5;

    const loginEventRewardAmount = 10;
    const rewardPointLoginEvent = {
        "category" : 1,
        "period" : 1,
        "index" : 10,
        "userAgent" : 0,
        "consecutiveCount" : 1,
        "rewardPoints" : loginEventRewardAmount,
        "rewardTitle" : "testRewardPointLoginEvent",
        "rewardContent" : "testRewardPointLoginEvent",
        //"platformObjId" : ObjectId("5732dad105710cf94b5cfaaa"),
        "target" : {
            "targetDestination" : [
                "",
                "57970a907f46b02427067245",
                "57985b83611cd9d838274d9a",
                "5799d77b9803c16f52ec8e68",
                "5799d6bc9803c16f52ec8e67"
            ]
        },
        "status" : true,
        "customPeriodStartTime" : null,
        "customPeriodEndTime" : null};

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

    /* Test 1.1 - create platformBankCardGroup to platform */
    it('Should create test bank card group to platform', function (done) {
        commonTestFunc.getTestBankCardGroup(testPlatformObjId).then(
            function (data) {
                testPlatformBankCardGroup = data;
                done();
            },
            function (error) {
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
            isTestPlayer: true,
            bankCardGroup: testPlatformBankCardGroup._id
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

    /* Test 5 - create top up reward point event to platform */
    it('Should create login reward point event to platform', function (done) {
        rewardPointLoginEvent.platformObjId = testPlatformObjId;
        dbRewardPointsEvent.createRewardPointsEvent(rewardPointLoginEvent).then(
            (rewardPointEvent) => {
                testRewardPointEvent = rewardPointEvent;
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 6 - check player reward point after apply top up reward point event */
    it('Should login and apply login event', function (done) {
        dbRewardPoints.updateLoginRewardPointProgress(testPlayer, null, 1).then(
            () => {
                done();
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 7 - check player reward point after apply top up reward point event */
    it('Should add reward point to player', function (done) {
        dbConfig.collection_rewardPoints.findOne({_id: testPlayerRewardPoints._id}).lean().then(
            (rewardPoints) => {
                if (rewardPoints && rewardPoints.points === loginEventRewardAmount) {
                    testPlayerRewardPoints = rewardPoints;
                    done();
                } else {
                    done('rewardPoints no found');
                }
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 8 - check reward point log after apply top up reward point event */
    it('Should create reward point log', function (done) {
        dbConfig.collection_rewardPointsLog.findOne({rewardPointsObjId: testPlayerRewardPoints._id})
            .sort({'createTime': -1}).lean().then(
            (rewardPointsLog) => {
                if (rewardPointsLog && rewardPointsLog.amount === loginEventRewardAmount) {
                    done();
                } else {
                    done('rewardPointsLog no found or no match');
                }
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 9 - check player reward points event progress */
    it('Should check player reward points event progress', function (done) {
        let rewardPointProgress = testPlayerRewardPoints.progress[0];
        if(rewardPointProgress.count === 1 && rewardPointProgress.isApplied && rewardPointProgress.isApplicable
            && rewardPointProgress.rewardPointsEventObjId.toString() === testRewardPointEvent._id.toString()) {
            done();
        } else {
            done('player reward point event progress no match');
        }
    });

    /* Test 99 - remove all test Data */
    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function (data) {
            done();
        })
    });
});