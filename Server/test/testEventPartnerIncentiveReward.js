var should = require('should');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbDepartment = require('../db_modules/dbDepartment');
var constProposalType = require('./../const/constProposalType');
var dbRole = require('../db_modules/dbRole');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var constRewardType = require('./../const/constRewardType');
var dbRewardRule = require('./../db_modules/dbRewardRule');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbProvider = require('./../db_modules/dbGameProvider');
var dbPartnerLevel = require('./../db_modules/dbPartnerLevel');
var dbPartnerWeekSummary = require('./../db_modules/dbPartnerWeekSummary');
var dbPartner = require('./../db_modules/dbPartner');
var dbGame = require('./../db_modules/dbGame');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbProposal = require('./../db_modules/dbProposal');
var dbRewardType = require('./../db_modules/dbRewardType');
var partnerIncentiveRewardEvent = require("../scheduleTask/partnerIncentiveRewardEvent");

var Q = require("q");

var dataGenerator = require("./../test_modules/dataGenerator.js");
var dbconfig = require("../modules/dbproperties.js");
var rewardEventGenerator = require("./../test_modules/rewardEventGenerator.js");
var commonTestFunc = require('../test_modules/commonTestFunc');
var dbUtil = require('../modules/dbutility');

var proposalIds = [];
var step1DepartmentId = null;
var step1AdminId = null;
var step1RoleId = null;
var stepType1Name = null;
var stepType1Id = null;
var testRewardRuleId = null;
var partnerLevelId = null;
var partnerObjId = null;
var testGameProviderObjId = null;
var testPlatformId = null;
var testGameId2 = null;
var testGameId = null;
var testProviderId2 = null;
var testProviderId = null;
var testPlayersId = [];
var testPartnerId = [];

var rewardAmount = 205;
// var validPlayers = 7;
var partnerLevelForReward = 2;
var validConsumptionSum = 100;
var testPlayerNum = 10;
var testPartnerNum = 3;

var generatedData = {};

describe("Test Partner Incentive Reward event", function () {

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
    it('link type steps and add them to type process', function () {
        var proposalTypeProcessName = constProposalType.PARTNER_INCENTIVE_REWARD;
        return rewardEventGenerator.linkTypeStepToProcess(testPlatformId, proposalTypeProcessName, stepType1Id);
    });

    it('Should create test provider-One and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testGameProviderObjId = data._id;
                return commonTestFunc.createGame(testGameProviderObjId);
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
                return commonTestFunc.createGame(testProviderId2);
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

    it('create partner level', function () {
        return dataGenerator.createPartnerLevelForPlatformWithValue(testPlatformId, 3).then(
            function (data) {
                data.name.should.match(/partnerLevel/i);
                partnerLevelId = data._id;
                generatedData.testPlatformId = testPlatformId;

            }
        );
    });

    var testParterLevelIds = [];
    var testPartnerLevels = [];
    it('get test platform partner levels', function (done) {
        dbPartnerLevel.getPartnerLevel({platform: testPlatformId}).then(
            function(data){
                for( var i = 0; i < data.length; i++){
                    testParterLevelIds.push(data[i]._id);
                    testPartnerLevels.push(data[i]);
                }
                done();
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('create test partner', function (done) {
        var proms = [];
        var date = new Date().getTime();
        for (var i = 0; i < testPartnerNum; i++) {
            var playerData = {
                partnerName: "testPartner" + i + date,
                realName: "testRealName" + i + date,
                platform: testPlatformId,
                password: "123",
                level: testParterLevelIds[i%testParterLevelIds.length],
                validConsumptionSum: 20 * i,
                phoneNumber: "11111111" + i
            };
            proms.push(dbPartner.createPartner(playerData));
        }

        Q.all(proms).then(
            function (data) {
                if (data) {
                    for (var j = 0; j < data.length; j++) {
                        testPartnerId.push(data[j]._id);
                    }
                    done();
                }
            }
        );
    });

    it('create test player and platform reward event', function () {
        var date = new Date();
        var platformName = "testPlatform" + date.getTime();

        var platformData = {
            name: platformName,
            gameProviders: [testGameProviderObjId]
        };

        var proms = [];
        var date = new Date();
        for (var i = 0; i < testPlayerNum; i++) {
            var playerData = {
                name: "testpayer" + i + date.getTime(),
                platform: testPlatformId,
                password: "123",
                games: [testGameId2, testGameId],
                phoneNumber: "11111111" + i
            };
            proms.push(dbPlayerInfo.createPlayerInfo(playerData));
        }
        return Q.all(proms).then(
            function (data) {
                if (data) {
                    for (var j = 0; j < data.length; j++) {
                        testPlayersId.push(data[j]._id);
                    }
                }
            }
        );
    });

    it('create partner incentive reward event', function () {
        var partnerLevelName = testPartnerLevels[partnerLevelForReward].name;
        return rewardEventGenerator.createPartnerIncentiveRewardEvent(testPlatformId, partnerLevelName, validConsumptionSum, rewardAmount);
    });

    // Create Partner, level and weekSummary

    it('create test partner week summary', function () {
        var startTime = dbUtil.getLastWeekSGTime().endTime;
        startTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - 2);

        var proms = [];

        for (var i = 0; i < testPartnerNum; i++) {
            var summaryData = {
                partnerId: testPartnerId[i],
                platformId: testPlatformId,
                partnerLevel: i,
                consumptionSum: 300,
                validConsumptionSum: 150,
                date: startTime,
                validPlayers: 5,
                activePlayers: 10
            };
            proms.push( dbPartnerWeekSummary.createPartnerWeekSummary(summaryData) );
        }

        return Q.all(proms);
    });

    const expectedNumProposals = 1;

    it('check partner incentive reward event', function () {
        return partnerIncentiveRewardEvent.checkPartnerIncentiveRewardEvent(testPlatformId);
    });

    it('Should step1Admin user be able to see the test proposal', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                data.length.should.equal(expectedNumProposals);
                proposalIds = data;
            }
        );
    });

    it('Admin user approve first step for proposal', function () {
        return Q.all(
            proposalIds.map(proposalId => dbProposal.updateProposalProcessStep(proposalId, step1AdminId, "test approve", true))
        );
    });

    it('Test partner credit should increase', function () {
        return dbconfig.collection_partner.find({platform: testPlatformId}).populate({
            path: "level",
            model: dbconfig.collection_partnerLevel
        }).then(
            function (partners) {
                partners.length.should.equal(testPartnerNum);

                partners.forEach(function (partner) {
                    partner.credits.should.equal(partner.level.value === 2 ? rewardAmount : 0);
                })
            }
        );
    });

    // After executing the proposals, they are still all in the collection

    it('Should step1Admin user be able to see the test proposal', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                data.length.should.equal(expectedNumProposals);
            }
        );
    });

    // We should only award the reward once to each partner.  So checking the reward again should not create any new proposals.

    it('check partner incentive reward event', function () {
        return partnerIncentiveRewardEvent.checkPartnerIncentiveRewardEvent(testPlatformId);
    });

    it('Should step1Admin user be able to see the test proposal', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                data.length.should.equal(expectedNumProposals);
            }
        );
    });

    // it('Clear Consumption Data', function () {
    //     dataGenerator.clearConsumptionData(generatedData);
    // });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId,  testPlayersId).then(function(data){
            done();
        })
    });

    it('Should remove all test Proposal data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId],testPlatformId, [],  testPlayersId ).then(function(data){
            done();
        })
    });

});


