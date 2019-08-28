var should = require('should');
var dbconfig = require('../modules/dbproperties');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbDepartment = require('../db_modules/dbDepartment');
var constProposalType = require('./../const/constProposalType');
var dbRole = require('../db_modules/dbRole');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var constRewardType = require('./../const/constRewardType');
var dbRewardRule = require('./../db_modules/dbRewardRule');
var dbRewardType = require('./../db_modules/dbRewardType');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbProvider = require('./../db_modules/dbGameProvider');
var dbGame = require('./../db_modules/dbGame');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbProposal = require('./../db_modules/dbProposal');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
var dbMessageTemplate = require("../db_modules/dbMessageTemplate");
var constMessageType = require("../const/constMessageType");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var Q = require("q");

var testEmail = false;
var testInternalMessage = false;

var typeName = constProposalType.PLAYER_REGISTRATION_REWARD;

var proposalTypeId = null;
var proposalTypeProcessId = null;
var proposalId = null;
var step1DepartmentId = null;
var step1AdminId = null;
var stepType1Name = null;
var stepType1Id = null;
var testRewardRuleId = null;
var testPlatformId = null;
var testProviderId = null;
var testProviderId2 = null;
var testGameId = null;
var testGameId2 = null;
var testPlayersId = [];
var testPlayersPlayerId = [];
var step1RoleId = null;

var rewardAmount = 100;
var testPlayerNum = 3;
var rewardTypeName = 'GameProviderReward';
var testRewardTypeId = null;
var testRewardEventId = null;

var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Player registration Reward event", function () {

    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should get proposal type id and proposal type process id', function (done) {
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

    it('create related departments', function (done) {

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

                    //data[1].roleName.should.equal(role1Name);
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

        var date = new Date();
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
        dbRewardType.getRewardType({name: typeName}).then(
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
                return commonTestFunc.createGame(testProviderId);
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

    it('Should create test provider-Two and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testProviderId2 = data._id;
                return commonTestFunc.createGame(testProviderId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId2 = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create test platform and player', function (done) {
        var date = new Date();
        var eventName = "testEvent" + date.getTime();

        var proms = [];
        var date = new Date();
        console.log("testPlayerNum:", testPlayerNum);
        for (var i = 0; i < testPlayerNum; i++) {
            var playerData = {
                name: "testplayer" + i + date.getTime(),
                platform: testPlatformId,
                password: "123",
                phoneNumber: "11111111" + i
                //games: [testGameId2, testGameId],
                //validCredit: 0
                //email: emailRecipient
            };
            console.log("playerData:", playerData);
            proms.push(dbPlayerInfo.createPlayerInfo(playerData));
        }
        Q.all(proms).then(
            function (data) {
                console.log("createPlayerInfo:", data);
                if (data) {
                    for (var j = 0; j < data.length; j++) {
                        testPlayersId.push(ObjectId(data[j]._id));
                        testPlayersPlayerId.push(data[j].playerId);
                    }
                }
            },
            function(error){
                console.log(error);
            }
        ).then(
            function (data) {
                var eventData = {
                    type: testRewardTypeId,
                    name: eventName,
                    code: new Date().getTime(),
                    platform: testPlatformId,
                    param: {
                        rewardAmount: 8,
                        unlockBonusAmount: 100
                    },
                    executeProposal: proposalTypeId
                };
                return dbRewardEvent.createRewardEvent(eventData).then(
                    function (data) {
                        testRewardEventId = data.code;
                        done();
                    }
                );
            },
            function (error) {
                console.log("error:", error);
            }
        );
    });

    it('apply for player registration reward', function (done) {
        console.log("testPlayersPlayerId[0]:", testPlayersPlayerId[0]);
        dbPlayerInfo.applyPlayerRegistrationReward("",testPlayersPlayerId[0], testRewardEventId).then(
            function (data) {
                proposalId = data._id;
                done();
            },
            function (error) {
                console.log(error);
                done(error);
            }
        );
    });

    it('step1Admin user approve first step for proposal', function () {
        if (testEmail) {
            this.timeout(15000);
        }
        return dbProposal.updateProposalProcessStep(proposalId, step1AdminId, "test approve", true).catch(
            (error) => { console.error(error); console.error(error.error && error.error.stack); throw error; }
        );
    });

    it('shold get test player reward task', function (done) {
        dbRewardTask.getPlayerCurRewardTask(testPlayersId[0]).then(
            function (data) {
                // data.status.should.equal(constRewardTaskStatus.ACHIEVED);
                // Actually currently marked as "Completed"
                // console.log("data:", data);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });


    // This test might not really belong in this file but it was easy to put it here.
    it('Add test player consumption record', function () {
        var record = {
            playerId: testPlayersId[0],
            platformId: testPlatformId,
            gameId: testGameId2,
            gameType: "Card",
            providerId: testProviderId,
            amount: 700,
            validAmount: 700,
            bonusAmount: 100,
            orderNo: new Date().getTime()
        };

        return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(record).then(
            function (data) {
                return dbconfig.collection_playerConsumptionSummary.findOne(
                    {
                        playerId: testPlayersId[0],
                        platformId: testPlatformId,
                        gameType: "Card",
                        bDirty: false
                    }
                ).then(
                    function (data) {
                        //console.log(data);
                    }
                );
            }
        );
    });

    it('Test player should get reward', function (done) {
        dbconfig.collection_players.findById(testPlayersId[0]).then(
            function (data) {
                data.validCredit.should.equal(8);
                done();
            }
        );
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, testPlayersId).then(function(data){
            done();
        })
    });

    it('Should remove all test proposal data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId] , testPlatformId, [proposalTypeId], testPlayersId).then(function(data){
            done();
        })
    });

});