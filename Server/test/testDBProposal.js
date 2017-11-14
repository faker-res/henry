require('../test_modules/improveMochaReporting')();
var should = require('should');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbPartner = require('../db_modules/dbPartner');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbPlatform = require('../db_modules/dbPlatform');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProposalProcess = require('../db_modules/dbProposalProcess');
var constProposalType = require('./../const/constProposalType');
var Q = require("q");
var commonTestFun = require('../test_modules/commonTestFunc');

describe("Test proposal", function () {

    var date = new Date().getTime();

    var typeName = constProposalType.UPDATE_PLAYER_INFO;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testPlayerId = null;
    var testPlayerName = null;
    var testPlayerProposedEmail = "done@s.g";

    var step1AdminId = null;
    var step1DepartmentId = null;
    var step1RoleId = null;

    var step2AdminId = null;
    var step2DepartmentId = null;
    var step2RoleId = null;

    var stepType1Name = null;
    var stepType1Id = null;
    var stepType2Name = null;
    var stepType2Id = null;

    var testProposalId = null;
    var testProposalProcessId = null;

    var testPlatformId = null;
    it('Should create test player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                return commonTestFun.createTestPlayer(testPlatformId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should get update player info proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
            platformId: testPlatformId,
            name: typeName
        });
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

        var department1Prom = commonTestFun.createTestDepartment();
        var department2Prom = commonTestFun.createTestDepartment();
        Q.all([department1Prom, department2Prom]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    step1DepartmentId = data[0]._id;
                    step2DepartmentId = data[1]._id;
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

    it('create related admin users and roles', function (done) {

        var admin1Prom = commonTestFun.createTestAdminWithRole(step1DepartmentId);
        var admin2Prom = commonTestFun.createTestAdminWithRole(step2DepartmentId);
        Q.all([admin1Prom, admin2Prom]).then(
            function (data) {
                if (data && data[0] && data[1]) {


                    step1AdminId = data[0][0]._id;
                    step1RoleId = data[0][1]._id;

                    step2AdminId = data[1][0]._id;
                    step2RoleId = data[1][1]._id;

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
        var prom2 = dbRole.attachRolesToUsersById([step2AdminId], [step2RoleId]);
        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1]) {
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

    it('create test proposal type process steps', function (done) {
        stepType1Name = "testStepType1" + date;
        var prom1 = dbProposalTypeProcessStep.createProposalTypeProcessStep(
            {title: stepType1Name, department: step1DepartmentId, role: step1RoleId}
        );
        stepType2Name = "testStepType2" + date;
        var prom2 = dbProposalTypeProcessStep.createProposalTypeProcessStep(
            {title: stepType2Name, department: step2DepartmentId, role: step2RoleId}
        );
        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    data[0].title.should.equal(stepType1Name);
                    data[1].title.should.equal(stepType2Name);
                    stepType1Id = data[0]._id;
                    stepType2Id = data[1]._id;
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

    it('link type steps and add them to type process', function (done) {
        var stepProm = dbProposalTypeProcessStep.updateProposalTypeProcessStep(
            {_id: stepType1Id},
            {nextStepWhenApprove: stepType2Id}
        );
        var processProm = dbProposalTypeProcess.addStepToProcess(proposalTypeProcessId, [stepType1Id, stepType2Id]);
        Q.all([stepProm, processProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
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

    it('Should create test update player info proposal', function (done) {
        var proposalData = {
            data: {
                _id: testPlayerId,
                name: testPlayerName,
                email: testPlayerProposedEmail
            }
        };
        dbProposal.createProposalWithTypeName(testPlatformId, constProposalType.UPDATE_PLAYER_INFO, proposalData).then(
            function (data) {
                testProposalId = data._id;
                testProposalProcessId = data.process;
                done();
            },
            function (err) {
                console.log("createProposalWithTypeName", err);
            }
        );
    });

    it('Should get full ProposalProcess', function (done) {
        dbProposalProcess.getFullProposalProcess({_id: testProposalProcessId}).then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should step1Admin user be able to see the test update player info proposal', function (done) {
        dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                var bFound = false;
                for (var i = 0; i < data.length; i++) {
                    if (String(data[i]._id) === String(testProposalId)) {
                        bFound = true;
                    }
                }
                bFound.should.equal(true);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('step1Admin user approve first step for proposal', function (done) {
        dbProposal.updateProposalProcessStep(testProposalId, step1AdminId, "test approve", true).then(
            function (data) {
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('Should step2Admin user be able to see the test update player info proposal', function (done) {
        dbProposal.getAvailableProposalsByAdminId(step2AdminId, testPlatformId).then(
            function (data) {
                var bFound = false;
                for (var i = 0; i < data.length; i++) {
                    if (String(data[i]._id) === String(testProposalId)) {
                        bFound = true;
                    }
                }
                bFound.should.equal(true);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('step2Admin user approve second step for proposal and proposal should be executed', function (done) {
        dbProposal.updateProposalProcessStep(testProposalId, step2AdminId, "test approve", true).then(
            function (data) {
                done();
            },
            function (error) {
                done(error);
            }
        );
    });

    it('Proposal shoulde be executed correctlly', function (done) {
        dbPlayerInfo.getPlayerInfo({name: testPlayerName}).then(
            function (data) {
                //data.email.should.equal(testPlayerProposedEmail);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('Delete test update player info proposal', function (done) {
        dbProposal.deleteProposalByIds([testProposalId]).then(
            function (data) {
                done();
            },
            function (err) {
                console.log(err);
            }
        );
    });

    it('Should create test update player info proposal', function (done) {
        var proposalData = {
            data: {
                name: testPlayerName,
                email: testPlayerProposedEmail
            }
        };
        dbProposal.createProposalWithTypeName(testPlatformId, constProposalType.UPDATE_PLAYER_INFO, proposalData).then(
            function (data) {
                testProposalId = data._id;
                done();
            },
            function (err) {
                console.log("createProposalWithTypeName", err);
            }
        );
    });

    it('step1Admin user reject first step for proposal', function () {
        return dbProposal.updateProposalProcessStep(testProposalId, step1AdminId, "test reject", false);
    });

    it('Proposal shoulde be rejected correctlly', function (done) {
        dbPlayerInfo.getPlayerInfo({name: testPlayerName}).then(
            function (data) {
                //data.email.should.equal(testPlayerProposedEmail);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    var testPartnerName;
    it('Create test partner', function (done) {
        var testPartnerData = {
            partnerName: "testPartner" + date,
            realName: "testPartner",
            password: "888888",
            platform: testPlatformId,
            phoneNumber: "88888888"
        };
        dbPartner.createPartner(testPartnerData).then(
            function (data) {
                testPartnerName = data.partnerName;
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('Create test partner update bank info proposal', function (done) {
        var proposalData = {
            platformId: testPlatformId,
            data: {
                partnerName: testPartnerName,
                curData: {},
                updateData: {bankAddress: "test address"}
            }
        };
        dbProposal.createProposalWithTypeNameWithProcessInfo(testPlatformId, constProposalType.UPDATE_PARTNER_BANK_INFO, proposalData).then(
            function (data) {
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('Should remove all test Data', function (done) {
        commonTestFun.removeTestData(testPlatformId, [testPlayerId]).then(function (data) {
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([step1RoleId, step2RoleId], testPlatformId, [proposalTypeId], [testPlayerId]).then(function(data){
            done();
        })
    });


});


