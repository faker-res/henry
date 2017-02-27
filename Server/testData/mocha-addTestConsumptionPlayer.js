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

var mongoose = require('mongoose');
var Q = require("q");

describe("Create test API client data", function () {

    var testPlatformId = mongoose.Types.ObjectId(process.env.PLATFORM);

    var testCount = Number(process.env.TEST_COUNT) || 100;
    var processCount = Number(process.env.PROCESS_COUNT) || 1000;

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

    var consumeTimes = 2;
    var consumeDays = 1;

    var logCreation = false;

    var date = new Date().getTime();

    var testRewardTypeId = null;

    it('Should create test game', function (done) {
        var gameData = {
            name: "testGame" + date,
            type: testGameTypes.CARD,
            code: "testGame" + date,
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
            function (data) {
                if (data) {
                    for (var i = 0; i < data.length; i++) {
                        testPlayerLevels.push(data[i]._id);
                    }
                    done();
                }
            },
            function (error) {
                console.error(error);
            }
        );
    });

    function createPlayer(thisI) {
        var date = new Date();
        var playerData = {
            name: "testStressPlayer" + thisI,
            platform: testPlatformId,
            password: "123",
            playerLevel: testPlayerLevels[thisI % testPlayerLevels.length]
        };
        return dbPlayerInfo.createPlayerInfo(playerData).then(
            function (data) {
                logCreation && console.log("Created player " + thisI);
                return Q({
                             testPlayerObjId: data._id,
                             testPlayerId: data.playerId
                         })
            }
        );
    }

    function createConsumptionRecords(testPlayerData, thisI) {
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var j = 0; j < consumeDays; j++) {
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
                        amount: 500,
                        createTime: curDate
                    }
                ));
            }
        }

        return Q.all(proms).then(
            function (data) {
                if (data && data.length === (consumeTimes * consumeDays)) {
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
    function startProcessorPool(opts) {
        var deferred = Q.defer();

        var deadProcessorCount = 0;

        function newProcessor() {
            function processNext() {
                opts.processOne(processNext, endProcessor);
            }

            function endProcessor() {
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

    it('Creates a lot of players and consumption records for them (with processes)', function (done) {
        this.timeout(testCount * 200);

        var numberOfTasksStarted = 0;
        var start = new Date().getTime();

        startProcessorPool(
            {

                number: processCount,

                processOne: function (doneOne, noneToDo) {

                    // If there is a task to do
                    if (numberOfTasksStarted < testCount) {

                        // Pull the task from the pool/list/stream
                        var thisI = numberOfTasksStarted++;

                        if (thisI % processCount === 0) {
                            var cur = new Date().getTime();
                            var timeCost = (cur - start) / 1000;
                            start = cur;
                            console.log("Creating player " + thisI + " / " + testCount + " time:" + timeCost);
                        }

                        // Do the task
                        createPlayer(thisI).then(
                            function (testPlayerData) {
                                return createConsumptionRecords(testPlayerData, thisI);
                            }
                        ).catch(doneOne).done(doneOne);

                    } else {
                        // Tell our caller that there are no tasks to do.  This processor will be shut down.
                        noneToDo();
                    }
                }
            }
        ).then(done);
    });

});
