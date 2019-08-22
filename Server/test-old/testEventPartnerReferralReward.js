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
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var partnerReferralRewardEvent = require("../scheduleTask/partnerReferralRewardEvent");

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

var rewardAmount = 200;
var maxPartnerLevelForReward = 1;
var validPlayers = 7;
var testPlayerNum = 10;
var testPartnerNum = 12;
var testRewardTypeId = null;

var proposalNumber = null;

describe("Test Partner Referral Reward event", function () {

    var generatedData = {};

    function partnerIndexToPartnerLevelValue (i) {
        return Math.floor(generatedData.testPartnerLevels.length * i / testPartnerNum);
    }

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
        var proposalTypeProcessName = constProposalType.PARTNER_REFERRAL_REWARD;
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
            }
        );
    });

    it('get test platform partner levels', function () {
        return dbPartnerLevel.getPartnerLevel({platform: testPlatformId}).then(
            function(data){
                generatedData.testPartnerLevels = data;
            }
        );
    });

    it('create test partner', function (done) {
        var proms = [];
        var date = new Date().getTime();
        for (var i = 0; i < testPartnerNum; i++) {
            var playerData = {
                partnerName: "testPartner" + date + ":" + i,
                realName: "testRealName" + date + i,
                platform: testPlatformId,
                password: "123",
                level: generatedData.testPartnerLevels[partnerIndexToPartnerLevelValue(i)]._id
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


    it('create test platform and player', function () {
        var date = new Date();

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
                        testPlayersId.push(ObjectId(data[j]._id));
                    }
                }
            }
        );

    });

    it('create partner referral reward event', function () {
        var partnerLevelName = generatedData.testPartnerLevels[maxPartnerLevelForReward].name;
        return rewardEventGenerator.createPartnerReferralRewardEvent(testPlatformId, partnerLevelName);
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
                partnerLevel: partnerIndexToPartnerLevelValue(i),
                consumptionSum: 300,
                validConsumptionSum: 150,
                date: startTime,
                validPlayers: i,
                activePlayers: i
            };
            proms.push(dbPartnerWeekSummary.createPartnerWeekSummary(summaryData));
        }
        return Q.all(proms);
    });

    it('check partner referral event', function () {
        return partnerReferralRewardEvent.checkPartnerReferralRewardEvent(testPlatformId);
    });

    it('Should step1Admin user be able to see the test proposal', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                proposalNumber = data.length;
                data.length.should.be.greaterThan(0);
                proposalIds = data;
            }
        );
    });

    it('Admin user approve first step for proposal', function () {
        return Q.all(
            proposalIds.map( proposalId => dbProposal.updateProposalProcessStep(proposalId, step1AdminId, "test approve", true) )
        );
    });

    it('Test partner credit should increase', function () {
        return dbconfig.collection_partner.find({platform: testPlatformId}).populate({path: "level", model: dbconfig.collection_partnerLevel}).then(
            function (partners) {
                partners.length.should.equal(testPartnerNum);

                // Given a partner, what was his original index?
                const getIndex = partner => Number( partner.partnerName.replace(/.*:/, '') );

                // Sort them into their original order
                partners.sort(
                    (a, b) => getIndex(a) < getIndex(b) ? -1 : +1
                );

                /*
                partners.forEach(function (partner, i) {
                    // If the array hasn't been sorted, we can still get the original index of this partner.
                    i = getIndex(partner);

                    console.log("[log] (" + new Error().stack.split('\n')[1].replace(/^ *at /, '').split('/').slice(-2).join('/') + ") i, partner:", i, partner);

                    if (partner.level.name === "Normal" || partner.level.name === "VIP") {
                        const activePlayersForThisPartner = i;   // Assuming same order as they were created
                        if (activePlayersForThisPartner === 0) {
                            partner.credits.should.equal(0);
                        } else {
                            const rewardAmounts = referralRewardParam.rewardAmount.data;
                            const index = activePlayersForThisPartner - 1;
                            const indexToUse = index < rewardAmounts.length ? index : rewardAmounts.length - 1;
                            partner.credits.should.equal(rewardAmounts[indexToUse]);
                        }
                    } else {
                        // Diamond and testPartnerLevelNNNNNNNNNNNNN should not get this reward
                        partner.credits.should.equal(0);
                    }
                });
                */

                partners[0].credits.should.equal(0);
                partners[1].credits.should.equal(10);
                partners[2].credits.should.equal(20);
                partners[3].credits.should.equal(50);
                partners[4].credits.should.equal(100);
                partners[5].credits.should.equal(100);
                // Level too high for this reward
                partners[6].credits.should.equal(0);
                partners[7].credits.should.equal(0);
                partners[8].credits.should.equal(0);
                partners[9].credits.should.equal(0);
                partners[10].credits.should.equal(0);
                partners[11].credits.should.equal(0);
            }
        );
    });

    it('[second run] check partner referral event again', function () {
        return partnerReferralRewardEvent.checkPartnerReferralRewardEvent(testPlatformId);
    });

    it('[second run] the reward should not be given a second time', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, testPlatformId).then(
            function (data) {
                data.length.should.equal(proposalNumber);
                proposalIds = data;
            }
        );
    });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, testPlayersId).then(function(data){
            done();
        })
    });

    it('Should remove all test proposal data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId] , testPlatformId, [], testPlayersId).then(function(data){
            done();
        })
    });


});


