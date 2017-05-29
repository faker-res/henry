var Q = require("q");
var should = require('should');

var dbConfig = require('../modules/dbproperties');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require('../db_modules/dbPlayerLevel');
var dbPlatform = require('../db_modules/dbPlatform');

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
var testGameTypes = require("../test/testGameTypes");

var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test player consumption incentive event", function () {

    // TODO: Disabled again due to no playerDailyCreditLog in production yet
    return true;

    var typeName = constProposalType.PLAYER_CONSUMPTION_INCENTIVE;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testPlatformId = null;
    var testPlatformShortId = null;
    var testRewardEventId = null;
    var testRewardEventCode = null;

    var testPlayerId = null;
    var testPlayerShortId = null;

    var testGameId = null;
    var testGameType = null;

    var step1DepartmentId = null;
    var step1AdminId = null;
    var step1RoleId = null;
    var stepType1Name = null;
    var stepType1Id = null;
    var testRewardTypeId = null;
    var testPlayerRecordId = null;
    let testDailyLogId = null;

    var date = new Date().getTime();

    it('Should create test API platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                testPlatformShortId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should get player consumption incentive return proposal type id and proposal type process id', function (done) {
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
        dbRewardType.getRewardType({name: constRewardType.PLAYER_CONSUMPTION_INCENTIVE}).then(
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
        var platformName = "testPlatform" + date;
        var eventName = "testEvent" + date;

        var platformData = {
            name: platformName
        };

        var eventData = {
            name: eventName,
            code: new Date().getTime(),
            platform: testPlatformId,
            type: testRewardTypeId,
            needApply: true,
            param: {
                reward: [{
                    minPlayerLevel: 0,
                    rewardPercentage: 0.1,
                    spendingTimes: 2,
                    maxRewardAmount: 100,
                    minConsumptionAmount: 10,
                    minTopUpRecordAmount: 10,
                    maxPlayerCredit: 2000,
                    minRewardAmount: 1,
                    minDeficitAmount: 100
                },
                {
                    minPlayerLevel: 1,
                    rewardPercentage: 0.1,
                    spendingTimes: 2,
                    maxRewardAmount: 200,
                    minConsumptionAmount: 10,
                    minTopUpRecordAmount: 10,
                    maxPlayerCredit: 2000,
                    minRewardAmount: 2,
                    minDeficitAmount: 100
                },
                {
                    minPlayerLevel: 2,
                    rewardPercentage: 0.1,
                    spendingTimes: 2,
                    maxRewardAmount: 300,
                    minConsumptionAmount: 10,
                    minTopUpRecordAmount: 10,
                    maxPlayerCredit: 2000,
                    minRewardAmount: 3,
                    minDeficitAmount: 100
                }]
            },
            executeProposal: proposalTypeId
        };
        dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventId = data._id;
                testRewardEventCode = data.code;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create test player', function () {
        return commonTestFunc.createTestPlayer(testPlatformId).then(
            function (data) {
                testPlayerId = data._id;
                testPlayerShortId = data.playerId;
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
        dbPlayerInfo.playerTopUp(testPlayerId, 500, "testPayment").then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('update player top up record time to yesterday', function (done) {
        dbConfig.collection_playerTopUpRecord.findOne({playerId: testPlayerId}).lean().then(
            record => {
                //console.log(record);
                record.createTime = new Date(new Date(record.createTime).getTime() - 24*60*60*1000);
                delete record._id;
                var newRecord = new dbConfig.collection_playerTopUpRecord(record);
                return newRecord.save();
            }
        ).then(
            data => done()
        );
    });

    it('Generate player credits daily log', function (done) {
        dbRewardEvent.startSavePlayersCredit(testPlatformId).then(
            data => {
                setTimeout(done, 1000);
            }
        ).catch(
            error => {
                console.log(error);
            }
        )
    });

    it('update player credits daily log to yesterday', function (done) {
        dbConfig.collection_playerCreditsDailyLog.findOne({playerObjId: testPlayerId}).lean().then(
            record => {
                record.createTime = new Date(new Date(record.createTime).getTime() - 24*60*60*1000);
                delete record._id;
                let newRecord = new dbConfig.collection_playerCreditsDailyLog(record);
                return newRecord.save();
            }
        ).then(
            data => done()
        );
    });

    it('should get player top up record', function (done) {
        dbConfig.collection_playerTopUpRecord.findOne({playerId: testPlayerId}).then(
            function (data) {
                testPlayerRecordId = data._id;
                done();
            },
            function (error) {
                done(error);
            }
        );
    });

    it('player purchase in game', function (done) {
        dbPlayerInfo.playerPurchase(testPlayerId, testGameId, testGameType, 300).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                done(error);
            }
        );
    });

    it('should get platform consumption incentive player', function (done) {
        dbPlatform.getConsumptionIncentivePlayer(testPlatformShortId).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                done(error);
            }
        );
    });

    it('player should apply for player consumption incentive reward', function (done) {
        dbPlayerInfo.applyConsumptionIncentive(testPlayerShortId, testRewardEventCode).then(
            function (data) {
                if (data) {
                    //console.log(data);
                    done();
                }
            },
            function (error) {
                done(error);
            }
        );
    });

    it('Should step1Admin user be able to see the test proposal and approve', function (done) {

        dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                if (data && data.length == 1) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        if (String(data[i].type._id) == String(proposalTypeId)) {
                            proms.push(dbProposal.updateProposalProcessStep(data[i]._id, step1AdminId, "test approve", true));
                        }
                    }
                    Q.all(proms).then(
                        function (data) {
                            done();
                        },
                        function(error){
                            done(error);
                        }
                    );
                }
            },
            function (error) {
                done(error);
            }
        );
    });

    it('Test reward task should be created', function (done) {
        dbRewardTask.getPlayerCurRewardTask(testPlayerId).then(
            function (data) {
                //console.log(data);
                done();
            },
            function (error) {
                done(error);
            }
        );
    });


    it('Should remove  test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, [testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId] , testPlatformId, [proposalTypeId], [testPlayerId]).then(function(data){
            done();
        })
    });

});
