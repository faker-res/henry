/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


var should = require('should');
var dbconfig = require('./../modules/dbproperties');

var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require('../db_modules/dbPlayerLevel');
var dbPlatform = require('../db_modules/dbPlatform');

var dbRewardRule = require('../db_modules/dbRewardRule');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var dbRewardType = require('../db_modules/dbRewardType');

var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');

var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');

var playerSummary = require("../scheduleTask/playerSummary");
var consumptionReturnEvent = require("../scheduleTask/consumptionReturnEvent");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");

var dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');
var weeklyPlatformSettlement = require('./../scheduleTask/weeklyPlatformSettlement');

var dataGenerator = require("../test_modules/dataGenerator.js");
var rewardEventGenerator = require("../test_modules/rewardEventGenerator.js");

var mongoose = require('mongoose');
var Q = require("q");
var commonTestFun = require('../test_modules/commonTestFunc');

describe("Create test API client data", function () {

    var testPlatformId; // = mongoose.Types.ObjectId('56f10485b4915aea1abfde0a');

    var testCount = Number(process.env.TEST_COUNT) || 25;

    var typeName = constProposalType.PLAYER_CONSUMPTION_RETURN;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testRewardRuleId = null;
    var testRewardEventId = null;

    var testPlayerLevels = [];
    var testPlayersId = [];
    var testPlayersPlayerId = [];
    var testPlayerNum = 3;

    var testPlayerObjId = null;
    var testPlayerId = null;

    var testGameId = null;
    var testGameType = null;

    var testGame2Id = null;
    var testGame2Type = null;

    var consumeTimes = 5;
    var consumeDays = 1;
    var consumeAmount = 490;

    var creationProcesses = 200;

    var logCreation = false;

    var date = new Date().getTime();


    var testRewardTypeId = null;

    //it('create test platform', function (done) {
    //    var date = new Date();
    //    var platformName = "testPlatform" + date.getTime();
    //
    //    var platformData = {
    //        platformName: platformName
    //    };
    //    dbPlatform.createPlatform(platformData).then(
    //        function (data) {
    //            testPlatformId = data._id;
    //            done();
    //        },
    //        function (error) {
    //            console.log(error);
    //        }
    //    );
    //});

    it('Should create test platform', function (done) {
        return  commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });
    /*
    it('Should get consumption return proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformId, name: typeName});
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
                    console.log(data);
                }
            }
        ).catch(
            function (error) {
                console.log(error);
            }
        );
    });

    it('get test reward type', function (done) {
        dbRewardType.getRewardType({name: constRewardType.PLAYER_CONSUMPTION_RETURN}).then(
            function(data){
                testRewardTypeId = data._id;
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('create test platform reward event', function (done) {
        var date = new Date();
        var platformName = "testPlatform" + date.getTime();
        var eventName = "testEvent" + date.getTime();

        var eventData = {
            name: eventName,
            platform: testPlatformId,
            type: testRewardTypeId,
            param: {
                ratio: {
                    Normal: {
                        Casual: 0.02,
                        Card: 0.03,
                        Sports: 0.04
                    },
                    VIP: {
                        Casual: 0.03,
                        Card: 0.04,
                        Sports: 0.05
                    },
                    Diamond: {
                        Casual: 0.04,
                        Card: 0.05,
                        Sports: 0.06
                    }
                }
            },
            executeProposal: proposalTypeId
        };
        dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });
    */
    it('create player consumption return reward event', function () {
        return rewardEventGenerator.createPlayerConsumptionReturnRewardEvent(testPlatformId);
    });

    it('Should create test game', function (done) {
        var gameData = {
            name: "testGame" + date,
            type: testGameTypes.CARD,
            code: "testGame" + date
        };
        dbGame.createGame(gameData).then(
            function (data) {
                testGameId = data._id;
                testGameType = data.type;
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('Should create test game 2', function (done) {
        var curDate = new Date().getTime();
        var gameData = {
            name: "testGame" + curDate,
            type: testGameTypes.CASUAL,
            code: "testGame" + curDate,
        };
        dbGame.createGame(gameData).then(
            function (data) {
                testGame2Id = data._id;
                testGame2Type = data.type;
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('get player levels info', function (done) {
        dbPlayerLevel.getPlayerLevel({platform: testPlatformId}).then(
            function(data){
                if( data ){
                    for( var i = 0; i< data.length; i++ ){
                        testPlayerLevels.push(data[i]._id);
                    }
                    done();
                }
            },
            function(error){
                console.error(error);
            }
        );
    });

    function createPlayer (thisI) {
        var date = new Date();
        var playerData = {
            name: "testPlayer" + thisI + date.getTime(),
            platform: testPlatformId,
            password: "123",
            playerLevel: testPlayerLevels[thisI%testPlayerLevels.length]
        };
        return dbPlayerInfo.createPlayerInfo(playerData).then(
            function(data){
                logCreation && console.log("Created player " + thisI);
                return Q({
                    testPlayerObjId: data._id,
                    testPlayerId: data.playerId
                })
            }
        );
    }

    function createConsumptionRecords (testPlayerData, thisI) {
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for( var j = 0; j < consumeDays; j++ ) {
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            curDate.setDate(today.getDate() - 1);
            for (var i = 0; i < consumeTimes; i++) {
                proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                    {
                        playerId: testPlayerData.testPlayerObjId,
                        platformId: testPlatformId,
                        gameId: i > 0 ? testGame2Id : testGameId,
                        gameType: i > 0 ? testGame2Type : testGameType,
                        orderNo: new Date().getTime()+Math.random(),
                        amount: consumeAmount,
                        createTime: curDate
                    }
                ));
            }
        }

        return Q.all(proms).then(
            function(data){
                if( data && data.length === (consumeTimes*consumeDays) ){
                    logCreation && console.log("Created consumptions records for " + thisI);
                    return Q("success");
                } else {
                    return Q.reject("data was empty: " + data);
                }
            }
        );
    }

    // Run the given {opts.number} of processes in parallel
    // For each process, {opts.processOne}will be called repeatedly with two function arguments: (doneOne, noneToDo)
    // The processOne function should call doneOne when it is finished with one task, or noneToDo if there are no more tasks to complete
    // When there are no more tasks to complete, and all processes have completed their current task, the returned promise will resolve
    // TODO: processNext should be made into a promise with two possible resolution outcome, so that errors can be handled properly.
    function startProcessorPool (opts) {
        var deferred = Q.defer();

        var deadProcessorCount = 0;

        function newProcessor () {
            function processNext () {
                opts.processOne(processNext, endProcessor);
            }
            function endProcessor () {
                deadProcessorCount++;
                // If this was the last processor to die, then the pool's work is finished!
                if (deadProcessorCount === opts.number) {
                    deferred.resolve();
                }
            }
            // Start
            processNext();
        }

        for (var i = 0; i < opts.number; i++) {
            newProcessor();
        }

        return deferred.promise;
    }

    // Pass number:1 for sequential processing, or a high number for parallel processing.  (Not Infinity though!)
    // This approach is preferable to parallel processing ALL the records at once, because that is not scalable: it would consume too much memory when the number grows too high.
    // However, Vincent found that batch inserts were much faster than this is!

    it('Creates a lot of players and consumption records for them (with processes)', function (done) {
        this.timeout(testCount * 200);

        var numberOfTasksStarted = 0;
        startProcessorPool({

            number: creationProcesses,

            processOne: function (doneOne, noneToDo) {

                // If there is a task to do
                if (numberOfTasksStarted < testCount) {

                    // Pull the task from the pool/list/stream
                    var thisI = numberOfTasksStarted++;

                    if (thisI % 100 === 0) {
                        console.log("Creating player " + thisI + " / " + testCount)
                    }

                    // Do the task
                    createPlayer(thisI).then(
                        function (testPlayerData) {
                            return createConsumptionRecords(testPlayerData, thisI);
                        }
                    ).done(doneOne);

                } else {

                    // Tell our caller that there are no tasks to do.  This processor will be shut down.
                    noneToDo();

                }

            }

        }).then(done);
    });

    it('start platform daily settlement', function () {
        this.timeout(testCount * 300);
        return dailyPlatformSettlement.calculateDailyPlatformSettlement(testPlatformId).then(
            function (data) {
                // What should the actual results be?
                var yesterday = dataGenerator.getYesterdayStartAndEnd();
                return dbconfig.collection_playerConsumptionDaySummary.find({platformId: testPlatformId, date: yesterday.startTime}).then(
                    function (summaries) {
                        summaries.length.should.equal(testCount);
                        summaries.forEach(function (summary) {
                            summary.amount.should.equal(consumeTimes * consumeDays * consumeAmount);
                        });
                    }
                );
            }
        );
    });

    it('start platform weekly settlement', function () {
        this.timeout(15*60*1000);
        return weeklyPlatformSettlement.calculateWeeklyPlatformSettlement(testPlatformId).then(
            function (data) {
                var week = dataGenerator.getThisWeekStartAndEnd();
                return Q.all([
                    dbconfig.collection_playerGameTypeConsumptionWeekSummary.find({platformId: testPlatformId, date: week.startTime, gameType: testGameType}).then(
                        function (summaries) {
                            summaries.length.should.equal(testCount);
                            summaries.forEach(function (summary) {
                                summary.amount.should.equal(1 * consumeDays * consumeAmount);
                            });
                        }
                    ),
                    dbconfig.collection_playerGameTypeConsumptionWeekSummary.find({platformId: testPlatformId, date: week.startTime, gameType: testGame2Type}).then(
                        function (summaries) {
                            summaries.length.should.equal(testCount);
                            summaries.forEach(function (summary) {
                                summary.amount.should.equal((consumeTimes - 1) * consumeDays * consumeAmount);
                            });
                        }
                    )
                ]);
            }
        );
    });

    /*
    it('test consumption return event', function () {
        this.timeout(15*60*1000);
        return consumptionReturnEvent.checkPlatformWeeklyConsumptionReturnEvent(testPlatformId).then(
            function (data) {
                // TODO: What should the actual results be?
            }
        );
    });
    */

    // it('waits a while to see if websockets and DB connections are closed by garbage collection', function (done) {
    //     this.timeout(11000);
    //     setTimeout(done, 10000);
    // });

    // it('test consumption return event result', function (done) {
    //     this.timeout(60*1000);
    //     dbconfig.collection_players.findOne({_id: testPlayerObjId}).then(
    //         function(data){
    //             console.log("data.validCredit", data.validCredit);
    //             //data.validCredit.should.not.equal(0);
    //             done();
    //         },
    //         function(error){
    //             console.error("error", error);
    //         }
    //     );
    // });

    // A common error handling function generator
    // Passes something truthy to Mocha (preferably an Error), so mocha can report it, and won't have to wait for a timeout.
    function errorHandler (done) {
        return function (error) {
            // If the promise rejected with an error
            if (error instanceof Error) {
                done(error);
            } else {
                // Otherwise we probably got an object.  Log it!
                // If we passed an error back in the object, then log the object, but let mocha report the error's stack-trace.
                if (error.error) {
                    console.error(error);
                    done(error.error);
                } else {
                    // Otherwise just pass the object to mocha, or if it is falsy, pass something truthy.
                    done(error || true);
                }
            }
        };
    }

});
