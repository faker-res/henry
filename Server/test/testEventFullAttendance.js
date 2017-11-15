var should = require('should');
var dbconfig = require('../modules/dbproperties');

var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardRule = require('../db_modules/dbRewardRule');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var consecutiveTopUpEvent = require('../scheduleTask/consecutiveTopUpEvent');
var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');
var dbProvider = require('../db_modules/dbGameProvider');
var dbRewardType = require('../db_modules/dbRewardType');
var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbGameProviderPlayerDaySummary = require('../db_modules/dbGameProviderPlayerDaySummary');

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");

var Q = require("q");
var dataGenerator = require("./../test_modules/dataGenerator.js");
var commonTestActions = require("./../test_modules/commonTestActions.js");
var commonTestFunc = require('../test_modules/commonTestFunc');
var dbutility = require("../modules/dbutility.js");

var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

describe("Test full attendance reward event", function () {

    var testRewardTypeId = null;
    var testPlatformId = null;
    var testRewardEventId = null;

    var typeName = constProposalType.FULL_ATTENDANCE;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testPlayersId = [];
    var testPlayerNum = 3;
    var topUpTimes = 3;
    var minAmount = 100;
    var numOfDays = 3;
    var topUpDays = 3;
    var rewardAmount = 100;
    var spendingAmount = 300;
    var topUpAmount = 50;
    var consumeAmount = 500;

    var getLastConsumptionTime = () => dbutility.getPreviousSGMonday();

    var step1DepartmentId = null;
    var step1AdminId = null;
    var step1RoleId = null;
    var stepType1Name = null;
    var stepType1Id = null;

    var testGameId = null;
    var testGameType = null;

    var test1GameId = null;
    var test1GameType = null;

    var consumeTimesForTestGame1 = 1;
    var consumeTimesForTestGame2 = 2;
    var consumeTimes = consumeTimesForTestGame1 + consumeTimesForTestGame2;
    var consumeDays = 3;
    var consumeAmount = 500;

    var testProviderId = null;
    var test1ProviderId = null;
    
    var testPlayerSId = [];
    var testPlayerSName = [];
    var testPlatformSId = null;
    var testProviderSId = null;
    var testGameSId = null;

    var test1ProviderSId = null;
    var test1GameSId = null;

    var generatedData = {};
    var date = new Date().getTime();

    /*
    function getLastMonday () {
        var date = new Date();
        var weekday = date.getUTCDay();
        console.log("weekday:", weekday);
        // Monday is 1.  Ensure we are on Monday.
        date.setDate(date.getDate() - (weekday - 1));
        date.setHours(0, 0, 0, 0);

        if (date.getTime() > Date.now()) {
            // This week's Monday is in the future, so we must go back to last week
            date.setDate(date.getDate() - 7);
        }
        return date;

        //return dbutility.getPreviousSGMonday();
    }
    */

    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                testPlatformSId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should get weekly consecutive top up proposal type id and proposal type process id', function (done) {
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

    //todo::temp disable test for bson version bug
    // it('create related departments', function (done) {
    //
    //     commonTestFunc.createTestDepartment().then(
    //         function (data) {
    //             step1DepartmentId = data._id;
    //             console.log("createTestDepartment" + data);
    //             done();
    //         },
    //         function (error) {
    //             console.error(error);
    //         }
    //     );
    // });

    it('create related admin users and roles', function (done) {

        commonTestFunc.createTestAdminWithRole(step1DepartmentId).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    step1AdminId = data[0]._id;
                    step1RoleId = data[1]._id;

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

    it('attach users to roles', function (done) {
        //var prom1 = dbRole.attachRolesToUsersById([step1AdminId], [step1RoleId]);
        //prom1.then(
        commonTestFunc.attachRolesToUsers(step1AdminId, step1RoleId).then(
            function (data) {
                if (data) {
                    done();
                }
                else {
                    console.log(data);
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('create test proposal type process steps', function (done) {
        stepType1Name = "testStepType1" + date;
        var prom1 = dbProposalTypeProcessStep.createProposalTypeProcessStep(
            {title: stepType1Name, department: step1DepartmentId, role: step1RoleId}
        );

        prom1.then(
            function (data) {
                if (data) {
                    data.title.should.equal(stepType1Name);
                    stepType1Id = data._id;
                    done();
                }
                else {
                    console.log(data);
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('link type steps and add them to type process', function (done) {
        var processProm = dbProposalTypeProcess.addStepToProcess(proposalTypeProcessId, [stepType1Id]);
        processProm.then(
            function (data) {
                if (data) {
                    done();
                }
                else {
                    console.log(data);
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('get test reward type', function (done) {
        dbRewardType.getRewardType({name: constRewardType.FULL_ATTENDANCE}).then(
            function(data){
                testRewardTypeId = data._id;
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('Should create test provider-One and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testProviderId = data._id;
                testProviderSId = data.providerId;
                return commonTestFunc.createGame(testProviderId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId = data._id;
                testGameSId = data.gameId;
                testGameType = data.type;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test provider-Two and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                test1ProviderId = data._id;
                test1ProviderSId = data.providerId;
                return commonTestFunc.createGame(test1ProviderId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                test1GameId = data._id;
                test1GameSId = data.gameId;
                test1GameType = data.type;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    // We could use rewardEventGenerator.createFullAttendanceRewardEvent() here, but the event params differ a little.
    it('create test platform and reward event', function (done) {
        var date = new Date();
        var eventName = "testEvent" + date.getTime();

        var eventData = {
            name: eventName,
            code: new Date().getTime(),
            platform: testPlatformId,
            type: testRewardTypeId,
            param: {
                checkTopUp: true,
                numOfTopUpDays: numOfDays,
                minTopUpAmount: minAmount,
                checkConsumption : true,
                numOfConsumeDays: consumeDays,
                minConsumeAmount: consumeAmount,
                andTopUpConsume: false,

                andProvider: false,
                providers: [
                    {providerObjId: testProviderId, games: [testGameId]},
                    {providerObjId: test1ProviderId, games: [test1GameId]}
                ],

                rewardAmount: rewardAmount,
                spendingAmount: spendingAmount
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

    it('create test player', function (done) {
        var proms = [];
        var date = new Date();
        for (var i = 0; i < testPlayerNum; i++) {
            var playerData = {
                name: "testpayer" + i + date.getTime(),
                platform: testPlatformId,
                password: "123456",
                phoneNumber: "11111111" + i
            };
            proms.push(dbPlayerInfo.createPlayerInfo(playerData));
        }

        Q.all(proms).then(
            function (data) {
                if (data) {
                    for (var j = 0; j < data.length; j++) {
                        testPlayersId.push( ObjectId(data[j]._id));
                        testPlayerSId.push(data[j].playerId);
                        testPlayerSName.push(data[j].name);
                    }
                    done();
                }
            }
        );
    });

    it('test add test daily player top up record', function () {
        this.timeout(3000);
        var proms = [];
        //console.log("getLastConsumptionTime", getLastConsumptionTime());
        for (var k = 0; k < testPlayersId.length; k++) {
            proms.push( dataGenerator.createTopUpRecordsForPlayer(testPlayersId[k], testPlatformId, topUpDays, topUpTimes, topUpAmount, getLastConsumptionTime()) );
        }

        return Q.all(proms);
    });

    it('test daily player top up summary task', function () {
        var proms = [];
        for (var i = 0; i < numOfDays; i++) {
            var endTime = getLastConsumptionTime();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            //endTime = new Date(endTime.getTime() - (i)*24*60*60*1000);
            var startTime = getLastConsumptionTime();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            //startTime = new Date(startTime.getTime() - (i+1)*24*60*60*1000);
            proms.push(dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
        }
        return Q.all(proms).then(
            function (data) {
                var expectedResultProms = [];

                for (var i = 0; i < numOfDays; i++) {
                    var endTime = getLastConsumptionTime();
                    endTime.setHours(0, 0, 0, 0);
                    endTime.setDate(endTime.getDate() - i);
                    //endTime = new Date(endTime.getTime() - (i)*24*60*60*1000);
                    var startTime = getLastConsumptionTime();
                    startTime.setHours(0, 0, 0, 0);
                    startTime.setDate(startTime.getDate() - (i + 1));
                    //startTime = new Date(startTime.getTime() - (i+1)*24*60*60*1000);

                    testPlayersId.forEach(
                        playerId => {
                            expectedResultProms.push(
                                dbconfig.collection_playerTopUpDaySummary.findOne(
                                    {
                                        playerId: playerId,
                                        date: startTime
                                    }
                                ).then(
                                    summary => {
                                        summary.amount.should.equal(topUpAmount*topUpTimes)
                                    }
                                )
                            );
                        }
                    );
                }

                return Q.all(expectedResultProms);
            }
        );
    });

    it('test add test daily player consumption record for provider and game', function (done) {
        this.timeout(5000);
        var proms = [];
        var today = getLastConsumptionTime();
        today.setHours(0, 0, 0, 0);

        for( var k = 0; k < testPlayersId.length; k++ ){
            for( var j = 0; j < consumeDays; j++ ) {
                var curDate = new Date();
                curDate.setHours(0, 0, 0, 0);
                curDate.setDate( today.getDate() - (j+1) );
                for (var i = 0; i < consumeTimes; i++) {
                    curDate = new Date(curDate.getTime() + 1000);
                    proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                        {
                            playerId: testPlayersId[k],
                            platformId: testPlatformId,
                            providerId: testProviderId,
                            gameId: testGameId,
                            gameType: testGameType,
                            orderNo: new Date().getTime()+Math.random(),
                            amount: consumeAmount,
                            createTime: curDate
                        }
                    ));
                }
            }
        }

        Q.all(proms).then(
            function(data){
                // data = undefined;
                // data.length = 999;
                data.length.should.equal( consumeTimes * consumeDays * testPlayersId.length );
                //setTimeout(done, 1000);
                done();
            }
        ).catch(done);
    });

    it('test add test daily player consumption record for provider and game 1', function (done) {
        this.timeout(5000);
        var proms = [];
        var today = getLastConsumptionTime();
        today.setHours(0, 0, 0, 0);

        for( var k = 0; k < testPlayersId.length; k++ ){
            for( var j = 0; j < consumeDays; j++ ) {
                var curDate = new Date();
                curDate.setHours(0, 0, 0, 0);
                curDate.setDate( today.getDate() - (j+1) );
                for (var i = 0; i < consumeTimes; i++) {
                    curDate = new Date(curDate.getTime() + 1000);
                    proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                        {
                            playerId: testPlayersId[k],
                            platformId: testPlatformId,
                            providerId: test1ProviderId,
                            gameId: test1GameId,
                            gameType: test1GameType,
                            orderNo: new Date().getTime()+Math.random(),
                            amount: consumeAmount,
                            createTime: curDate
                        }
                    ));
                }
            }
        }

        Q.all(proms).then(
            function(data){
                // data = undefined;
                // data.length = 999;
                data.length.should.equal( consumeTimes * consumeDays * testPlayersId.length );
                //setTimeout(done, 1000);
                done();
            }
        ).catch(done);
    });
    
    it('test daily player consumption summary task', function () {
        return commonTestActions.calculatePlatformDaySummaryForPastDays(consumeDays, testPlatformId);
    });

    it('test daily provider summary task', function (done) {
        var proms = [];

        for (var i = 0; i < consumeDays; i++) {
            var endTime = getLastConsumptionTime();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            var startTime = getLastConsumptionTime();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            proms.push(dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForTimeFrame(startTime, endTime, testProviderId));
        }
        Q.all(proms).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('test daily 1provider summary task', function (done) {
        var proms = [];

        for (var i = 0; i < consumeDays; i++) {
            var endTime = getLastConsumptionTime();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            var startTime = getLastConsumptionTime();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            proms.push(dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForTimeFrame(startTime, endTime, test1ProviderId));
        }
        Q.all(proms).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('test consecutive top up event for related platforms', function (done) {
        consecutiveTopUpEvent.checkPlatformFullAttendancePlayers(testPlatformId).then(
            function (data) {
                console.log(data);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });
    
    it('Should step1Admin user be able to see the test proposal and approve', function (done) {
    
        dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                if (data && data.length > 0) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        if (String(data[i].type._id) == String(proposalTypeId)) {
                            proms.push(dbProposal.updateProposalProcessStep(data[i]._id, step1AdminId, "test approve", true));
                        }
                    }
                    Q.all(proms).then(
                        function (data) {
                            done();
                        }
                    );

                } else {
                    done(new Error("No data"));
                }
            },
            function (error) {
                console.log(error);
                done(error);
            }
        );
    });


    it('Clear TopUp Data', function () {

        generatedData.testPlatformId = testPlatformId;
        generatedData.testPlayerId = testPlayersId[0];

        dataGenerator.clearTopUpData(generatedData);
    });


    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });


    it('Should remove test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, testPlayersId).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId], testPlatformId, [proposalTypeId], testPlayersId).then(function(data){
            done();
        })
    });

    //todo::refactor the test here
    return;

    it('Test player should purchase and achieve the consecutive top up reward task', function () {
        var record = {
            name: testPlayerSName[0],
            platformId: testPlatformSId,
            gameId: testGameSId,
            gameType: testGameType,
            providerId: testProviderSId,
            amount: consumeAmount
        };

        return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(record).then(
            function (data) {
                // console.log("data:", data);
            }
        );
    });

    // This test might not really belong in this file but it was easy to put it here.
    it('Second consumption should increase the amount in the playerConsumptionSummary record', function () {
        var record = {
            name: testPlayerSName[0],
            platformId: testPlatformSId,
            gameId: testGameSId,
            gameType: testGameType,
            providerId: testProviderSId,
            amount: consumeAmount
        };

        return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(record).then(
            function (data) {
                return dbconfig.collection_playerConsumptionSummary.findOne(
                    {
                        playerId: testPlayersId[0],
                        platformId: testPlatformId,
                        gameType: testGameType,
                        bDirty: false
                    }
                ).then(
                    function (data) {
                        // This occasionally fails!  I think it may be a timing issue.
                        data.amount.should.equal(consumeAmount * (consumeDays*consumeTimes*2 + 1));
                    }
                );
            }
        );
    });

    it('Test reward task for test player should be achieved', function () {
        return dbRewardTask.getRewardTask({playerId: testPlayersId[0], type: constRewardType.FULL_ATTENDANCE}).then(
            function (data) {
                // We were originally testing for ACHIEVED
                data.status.should.equal(constRewardTaskStatus.COMPLETED);
            }
        );
    });

    it('test full attendance return event result', function () {
        return dbconfig.collection_players.findOne({_id: testPlayersId[0]}).then(
            function(data){
                data.validCredit.should.equal(rewardAmount);
            }
        );
    });




});
