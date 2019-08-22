var Q = require("q");
var should = require('should');

var dbConfig = require('../modules/dbproperties');
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

var playerSummary = require("../scheduleTask/playerSummary");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("./testGameTypes");

var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test player top up return", function () {

    var typeName = constProposalType.PLAYER_TOP_UP_RETURN;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testRewardRuleId = null;
    var testPlatformId = null;
    var testRewardEventId = null;

    var testPlayerId = null;
    var testPlayerObjId = null;

    var testGameId = null;
    var testGameType = null;

    var step1DepartmentId = null;
    var step1AdminId = null;
    var step1RoleId = null;
    var stepType1Name = null;
    var stepType1Id = null;
    var testRewardTypeId = null;
    var testPlayerTopUpRecordId = null;
    var testRewardEventNameCode = "";

    var proposalData;
    var validCreditBefore;

    var date = new Date().getTime();


    it('Should create test API player and platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformId = data._id;
                return commonTestFunc.createTestPlayer(testPlatformId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
               // testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });


    it('Should get TopUp-Return proposal type id and proposal type process id', function (done) {
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

    it('Should create test department', function (done) {

        commonTestFunc.createTestDepartment().then(
            function (data) {
                step1DepartmentId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create related admin users and roles', function (done) {

        commonTestFunc.createTestAdminWithRole(step1DepartmentId).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    //data[0].adminName.should.equal(admin1Name);
                    step1AdminId = data[0]._id;

                    // data[1].roleName.should.equal(role1Name);
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
        var prom1 = dbRole.attachRolesToUsersById([step1AdminId], [step1RoleId]);
        prom1.then(
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
        dbRewardType.getRewardType({name: constRewardType.PLAYER_TOP_UP_RETURN}).then(
            function(data){
                testRewardTypeId = data._id;
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('create test platform and reward event', function (done) {
       // var platformName = "testPlatform" + date;
        var eventName = "testEvent" + date;

        // var platformData = {
        //     name: platformName
        // };

        var eventData = {
            name: eventName,
            code: new Date().getTime(),
            platform: testPlatformId,
            type: testRewardTypeId,
            param: {
                reward: {
                    0: {
                        rewardPercentage: 0.10,
                        spendingTimes: 1,
                        maxRewardAmount: 100,
                        minTopUpAmount: 20
                    },
                    1: {
                        rewardPercentage: 0.2,
                        spendingTimes: 1,
                        maxRewardAmount: 100,
                        minTopUpAmount: 20
                    },
                    2: {
                        rewardPercentage: 0.3,
                        spendingTimes: 1,
                        maxRewardAmount: 100,
                        minTopUpAmount: 20
                    }
                }
            },
            executeProposal: proposalTypeId
        };
        dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventId = data._id;
                testRewardEventNameCode = data.code;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });


    it('Should create test provider and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                var testProviderObjId = data._id;
                return commonTestFunc.createGame(testProviderObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameType = data.type;
                testGameId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('player should top up first time', function (done) {
        dbPlayerInfo.playerTopUp(testPlayerObjId, 500, "testPayment").then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('should get player top up record', function (done) {
        dbConfig.collection_playerTopUpRecord.findOne({playerId: testPlayerObjId}).then(
            function (data) {
                testPlayerTopUpRecordId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('player purchase in game', function (done) {
        dbPlayerInfo.playerPurchase(testPlayerObjId, testGameId, testGameType, 300).then(
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

    it('Lookup player credit before applying', function () {
        return dbConfig.collection_players.findOne({playerId: testPlayerId}).select('validCredit').then(
            player => {
                validCreditBefore = player.validCredit;
            }
        );
    });

    it('player should apply for TopUp-Return reward', function () {
        var numberOfSuccesses = 0;
        var numberOfFailures = 0;

        var proms = [];
        //test on top up record can be used only once
        for(var i = 0; i < 3; i++){
            proms.push(
                dbPlayerInfo.applyTopUpReturn('', testPlayerId, testPlayerTopUpRecordId, testRewardEventNameCode).then(
                    proposal => {
                        numberOfSuccesses++;
                        proposalData = proposal;
                        proposalData.data.applyAmount.should.be.greaterThan(0);
                        console.log("proposal:", proposal);
                    },
                    error => {
                        numberOfFailures++;
                        //console.log("error:", error);
                    }
                )
            );
        }

        return Q.all(proms).then(
            function (data) {
                numberOfSuccesses.should.equal(1);
                numberOfFailures.should.equal(2);
            }
        );
    });



    it('Should step1Admin user be able to see the test proposal and approve', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (proposals) {
                should.exist(proposals);
                proposals.length.should.equal(1);
                var proms = [];
                for (var i = 0; i < proposals.length; i++) {
                    if (String(proposals[i].type._id) == String(proposalTypeId)) {
                        proms.push(dbProposal.updateProposalProcessStep(proposals[i]._id, step1AdminId, "test approve", true));
                    }
                }
                return Q.all(proms);
            }
        );
    });

    // it('Check player credit after accepting', function () {
    //     return dbConfig.collection_players.findOne({playerId: testPlayerId}).select('validCredit').then(
    //         player => {
    //             player.validCredit.should.equal(validCreditBefore - proposalData.data.applyAmount);
    //         }
    //     );
    // });

    it('Test reward task should be created', function () {
        return dbRewardTask.getPlayerCurRewardTask(testPlayerObjId).then(
            function (task) {
                should.exist(task);
                task.type.should.equal('PlayerTopUpReturn');
            }
        );
    });



    // Instead of accepting the proposal above, we can test if the reject works (refunds the applyAmount) by using these:
    //it('Admin rejects the proposal', function () {
    //    return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
    //        function (proposals) {
    //            should.exist(proposals);
    //            proposals.length.should.equal(1);
    //            var proms = [];
    //            for (var i = 0; i < proposals.length; i++) {
    //                if (String(proposals[i].type._id) == String(proposalTypeId)) {
    //                    proms.push(dbProposal.updateProposalProcessStep(proposals[i]._id, step1AdminId, "test reject", false));
    //                }
    //            }
    //            return Q.all(proms);
    //        }
    //    );
    //});
    //it('Check player credit after rejecting', function () {
    //    return dbConfig.collection_players.findOne({playerId: testPlayerId}).select('validCredit').then(
    //        player => {
    //            player.validCredit.should.equal(validCreditBefore);
    //        }
    //    );
    //});



    it('Should remove test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId] , testPlatformId, [proposalTypeId], [testPlayerObjId]).then(function(data){
            done();
        })
    });

});