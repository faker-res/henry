/*
 * Script to add test data for API test page
 * Not for unit test
 */

var should = require('should');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbApiUser = require('../db_modules/db-api-user');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbProvider = require('../db_modules/dbGameProvider');
var dbGame = require('../db_modules/dbGame');
var dbRewardType = require('../db_modules/dbRewardType');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var testGameTypes = require("../test/testGameTypes");

var mongoose = require('mongoose');
var Q = require("q");
var dataGenerator = require("./../test_modules/dataGenerator.js");
var commonTestFun = require('../test_modules/commonTestFunc');

describe("Create test API client data", function () {

    var platformName = "testClientPlatform";
    var playerName = "testclientplayer";
    var testPlatformId = null;
    var testPlayerId = null;

    var apiUserName = "testClientApiUsername";
    var testApiUserObjId = null;

    var providerName = "testClientProvider";
    var gameName = "testClientGame";
    var testGameType = testGameTypes.CASUAL;

    var testGameId = null;
    var testGameProviderObjId = null;
    var consumeTimes = 3;
    var consumeDays = 3;
    var generatedData = {};

    // This script can be slow to complete because:
    //
    //   1. It is often the first script run during tests (because of its alphabetic position).
    //   2. We sometimes run it to create the API user, immediately after resetting our DB, which can take some time to spin up again.
    //   3. At one point it creates multiple consumption records.
    //
    // For that reason, I have set the timeout quite high!
    //
    this.timeout(16000);

    it('delete old API client test data', function (done) {

        dbApiUser.getApiUserInfo({name: apiUserName}).then(
            function (data) {
                if (data && data._id) {
                    dbApiUser.deleteApiUser([data._id]).then(
                        function (data) {
                        }, function (error) {
                        }
                    );
                }
            }
        );

        dbPlatform.getPlatform({name: platformName}).then(
            function (data) {
                if (data && data._id) {
                    dbPlatform.deletePlatform([data._id]).then(
                        function (data) {
                        }, function (error) {
                        }
                    );
                }
            }
        );

        dbPlayerInfo.getPlayerInfo({name: playerName}).then(
            function (data) {
                if (data && data._id) {
                    dbPlayerInfo.deletePlayers([data._id]).then(
                        function (data) {
                        }, function (error) {
                        }
                    );
                }
            }
        );

        dbProvider.getGameProvider({name: providerName}).then(
            function (data) {
                if (data && data._id) {
                    dbProvider.delGameProvider(data._id).then(
                        function (data) {
                        }, function (error) {
                        }
                    );
                }
            }
        );

        dbGame.getGame({name: gameName}).then(
            function (data) {
                if (data && data._id) {
                    dbGame.deleteGameById(data._id).then(
                        function (data) {
                            done()
                        }, function (error) {
                        }
                    );
                }
                else{
                    done();
                }
            }
        );

    });

    it('it create test Api user', function (done) {

        dbApiUser.addApiUser({name:apiUserName, password:"123"}).then(
            function (data) {
                testApiUserObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );

    });

    it('create test API player and platform', function (done) {
        dbPlatform.createPlatform(
            {
                name: platformName,
                code: new Date().getTime()
            }
        ).then(
            function (data) {
                testPlatformId = data._id;

                return dbPlayerInfo.createPlayerInfo(
                    {
                        name: playerName,
                        platform: testPlatformId,
                        password: "123456",
                        phoneNumber: "11111111",
                    }
                );
            }
        ).then(
            function (data) {
                testPlayerId = data._id;
                done();
            }
        ).catch(
            function (error) {
                console.error(error.error && error.error.stack || error.stack || error);
                done(error);
            }
        );
    });

    it('create provider and game', function (done) {
        var date = new Date();

        var providerData = {
            name: providerName,
            nickName: "Froggy Games",
            code: "FGXN"+ date.getTime(),
            providerId: date.getTime()
        };
        dbProvider.createGameProvider(providerData).then(
            function (data) {
                testGameProviderObjId = data._id;
                var gameData = {
                    name: gameName,
                    provider: testGameProviderObjId,
                    type: testGameType,
                    code: gameName,
                    gameId: date.getTime()
                };
                return dbGame.createGame(gameData).then();
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('test add test daily player consumption record', function (done) {
        /*
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var j = 0; j < consumeDays; j++) {
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            curDate.setDate(today.getDate() - (j + 1));
            for (var i = 0; i < consumeTimes; i++) {
                curDate = new Date(curDate.getTime() + 1000);
                proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                    {
                        playerId: testPlayerId,
                        platformId: testPlatformId,
                        providerId: testGameProviderObjId,
                        gameId: testGameId,
                        gameType: testGameType,
                        amount: 500,
                        createTime: curDate
                    }
                ));
            }
        }

        Q.all(proms).then(
            function (data) {
                if (data && data.length === (consumeTimes * consumeDays)) {
                    done();
                    //setTimeout(done, 3000);
                }
            },
            function (error) {
                console.error(error);
            }
        );
        */

        dataGenerator.createConsumptionRecordsForAllPlayersOnPlatform(testPlatformId, null, {
            consumeTimes: consumeTimes,
            consumeDays: consumeDays,
            consumeAmount: 500
        }).then(() => done()).catch(done);
    });

    it('add a reward event', function (done) {
        dbRewardType.getAllRewardType({})
            .then(function (rewardTypes) {
                var rewardType = rewardTypes[0];

                var newRewardEventParams = {
                    name: "First Time Top Up",
                    code: new Date().getTime(),
                    platform: testPlatformId,
                    param: {rewardAmount: 0.25},
                    condition: undefined,
                    type: rewardType._id
                };

                //console.log("newRewardEventParams:", newRewardEventParams);

                dbRewardEvent.createRewardEvent(newRewardEventParams)
                    .done(function (data) {
                        done();
                    }, errorHandler(done));

            });
    });

    it('add a reward task for the testPlayer', function (done) {
        var newRewardTask = {
            playerId: testPlayerId,
            platformId: testPlatformId,
            type: "testTask",
            data: {
                amount: 100
            },
            initAmount: 100,
            currentAmount: 100,
            requiredUnlockAmount: 300,
            status: "Started",
            createTime: new Date()
        };
        dbRewardTask.createRewardTask(newRewardTask)
            .then(function () {
                done();
            }, errorHandler(done));
    });


    it('Clear TopUp Data', function () {
        generatedData.testPlatformId = testPlatformId;
        generatedData.testPlayerId = testPlayerId;

        dataGenerator.clearTopUpData(generatedData);
    });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function (done) {
        commonTestFun.removeTestData(testPlatformId, [testPlayerId]).then(function(data){
            done();
        })
    });


    it('Should remove all test proposal Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformId, [], [testPlayerId]).then(function(data){
            done();
        })
    });

    // A common error handling function generator
    // Passes something truthy to Mocha (preferably an Error), so mocha can report it, and won't have to wait for a timeout.
    function errorHandler (done) {
        return function (error) {
            // If the promise rejected with an error
            if (error instanceof Error) {
                done(error);
            } else {
                // Otherwise we probably got an object.  Log it!
                console.error(error);
                // If we passed an error back in the object, then let mocha report the error's stack-trace.
                if (error.error) {
                    done(error.error);
                } else {
                    // Otherwise just pass the object to mocha, or if it is falsy, pass something truthy.
                    done(error || true);
                }
            }
        };
    }





});
