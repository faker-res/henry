"use strict";

var Q = require("q");
var should = require('should');

var dbPartner = require('../db_modules/dbPartner');
var dbPartnerLevel = require('../db_modules/dbPartnerLevel');

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

var dbPartnerWeekSummary = require('../db_modules/dbPartnerWeekSummary');

var playerSummary = require("../scheduleTask/playerSummary");
var consumptionReturnEvent = require("../scheduleTask/consumptionReturnEvent");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
//var testGameTypes = require("../test/testGameTypes");

var partnerConsumptionReturnEvent = require("../scheduleTask/partnerConsumptionReturnEvent");
var partnerReferralRewardEvent = require("../scheduleTask/partnerReferralRewardEvent");
var dbconfig = require('./../modules/dbproperties');
var commonTestActions = require("./../test_modules/commonTestActions.js");
var dataGenerator = require("./../test_modules/dataGenerator.js");
var dbGameProvider = require("../db_modules/dbGameProvider.js");
var partnerSummary = require("../scheduleTask/partnerSummary.js");
var rewardEventGenerator = require("./../test_modules/rewardEventGenerator.js");
var commonTestFunc = require('../test_modules/commonTestFunc');
var testGameTypes = require("./testGameTypes.js");
var dbutility = require("../modules/dbutility.js");

describe("Test partner consumption return reward event", function () {

    var testPlatformId = null;
    var testPartnerLevels = [];
    var testPartnerNum = 0;

    //var partnerConsumptionReturnTypeName = constProposalType.PARTNER_CONSUMPTION_RETURN;
    //var partnerConsumptionReturnProposalTypeId = null;
    //var partnerConsumptionReturnProposalTypeProcessId = null;
    //var testPartnerConsumptionReturnRewardEventId = null;

    var partnerReferralRewardTypeName = constProposalType.PARTNER_REFERRAL_REWARD;
    var partnerReferralRewardProposalTypeId = null;
    var partnerReferralRewardProposalTypeProcessId = null;
    var testPartnerReferralRewardEventId = null;


    var step1DepartmentId = null;
    var step1AdminId = null;
    var step1RoleId = null;

    var date = new Date().getTime();

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

    it('create partner consumption return reward event', function () {
        return rewardEventGenerator.createPartnerConsumptionReturnRewardEvent(testPlatformId, generatedData);
    });

    it('get partner levels info', function () {
        return dbconfig.collection_partnerLevel.find({platform:testPlatformId}).then(
            function(data){
                data.forEach( level => testPartnerLevels.push(level._id) );
            }
        );
    });

    // This doesn't seem to be needed for this test
    // it('update partner levels consumption return percentage', function (done) {
    //     dbconfig.collection_partnerLevel.update(
    //         {_id:{$in: testPartnerLevels}},
    //         {consumptionReturn: 0.01},
    //         {multi:true}
    //     ).then(
    //         function(data){
    //             if( data ){
    //                 done();
    //             }
    //         },
    //         function(error){
    //             console.error(error);
    //         }
    //     );
    // });

    var testParterLevelIds = [];
    it('get test platform partner levels', function (done) {
        dbPartnerLevel.getPartnerLevel({platform: testPlatformId}).then(
            function(data){
                for( var i = 0; i < data.length; i++){
                    testParterLevelIds.push(data[i]._id);
                }
                done();
            },
            function(error){
                console.log(error);
            }
        );
    });

    // it('create test partner', function (done) {
    //     var proms = [];
    //
    //     for( var i = 0; i < testPartnerNum; i++ ){
    //         var playerData = {
    //             partnerName: "testPartner"+i + date,
    //             platform: testPlatformId,
    //             password: "123",
    //             level: testParterLevelIds[i%testParterLevelIds.length]
    //         };
    //         proms.push( dbPartner.createPartner(playerData) );
    //     }
    //
    //     Q.all(proms).then(
    //         function(data){
    //             if( data ){
    //                 for( var j = 0; j < data.length; j++ ){
    //                     testPartnerId.push(data[j]._id);
    //                 }
    //                 done();
    //             }
    //         }
    //     );
    // });

    // it('create test partner week summary', function () {
    //     var startTime = new Date();
    //     startTime.setHours(0, 0, 0, 0);
    //     startTime.setDate(startTime.getDate() - 2);
    //
    //     var proms = [];
    //
    //     for( var i = 0; i < testPartnerNum; i++ ){
    //         var summaryData = {
    //             partnerId: testPartnerId[i],
    //             platformId: testPlatformId,
    //             partnerLevel: i,
    //             consumptionSum: 300,
    //             validConsumptionSum: 150,
    //             date: startTime,
    //             validPlayers: 5,
    //             activePlayers: 10
    //         };
    //         proms.push( dbPartnerWeekSummary.createPartnerWeekSummary(summaryData) );
    //     }
    //
    //     return Q.all(proms);
    // });


    // We need some players!

    // I probably should have added players and consumption for the partners generated above, but I didn't.
    // I re-used the partner tree generator from testSettlementPartnerSummary.js
    // Only the partners from the tree will receive consumption rewards

    var consumptionConfig = {
        consumeTimes: 1,         // @todo: Increasing this above 1 breaks the test!
        consumeDays: 1,
        consumeAmount: 325,
        lastConsumptionTime: dbutility.getLastWeekSGTime().endTime
    };

    var topUpConfig = {
        numOfDays: 0,
        topUpTimes: 0,
        topUpDays: 0,
        topUpAmount: 0,
        lastTopUpTime: dbutility.getLastWeekSGTime().endTime
    };

    var partnerTreeConfig = {
        topLevelPartners: 2,
        depth: 2,
        childrenPerPartner: 2,

        playersPerPartner: 2
    };

    // A tree with 255 partners
    // var partnerTreeConfig = {
    //     topLevelPartners: 3,
    //     depth: 3,
    //     childrenPerPartner: 4,
    //
    //     playersPerPartner: 2
    // };

    // A tree with 1364 partners (test may take around 2 minutes)
    // var partnerTreeConfig = {
    //     topLevelPartners: 4,
    //     depth: 4,
    //     childrenPerPartner: 4,
    //
    //     playersPerPartner: 2
    // };

    var generatedData = {};

    it('Should create test provider and game', function () {
        return  commonTestFunc.createTestGameProvider().then(
            function (data) {
                generatedData.testGameProviderId = data._id;
            }
        );
    });

    var expectedNodeCount = (Math.pow(partnerTreeConfig.childrenPerPartner, partnerTreeConfig.depth + 1) - 1) / (partnerTreeConfig.childrenPerPartner - 1) * partnerTreeConfig.topLevelPartners;
    // console.log("expectedNodeCount:", expectedNodeCount);
    this.timeout(5000 + expectedNodeCount * consumptionConfig.consumeTimes * consumptionConfig.consumeDays * partnerTreeConfig.playersPerPartner * 500);

    it('creates a tree of partners, with players', function () {
        generatedData.testPartnerLevel = testPartnerLevels[0];
        generatedData.testPlatformId = testPlatformId;

        partnerTreeConfig.consumptionConfig = consumptionConfig;
        partnerTreeConfig.topUpConfig = topUpConfig;
        partnerTreeConfig.generatedData = generatedData;
        return dataGenerator.ensureTestGames(generatedData).then(
            () => dataGenerator.createPartnerTree(partnerTreeConfig)
        );
    });

    var testPartners = [];

    // The partner generator above doesn't give the partners a level
    it('assign partner levels to the partners', function () {
        return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).then(
            function (partners) {
                testPartners = partners;
                var proms = partners.map(function (partner, i) {
                    partner.level = testPartnerLevels[i % testPartnerLevels.length];
                    return partner.save();
                });
                return Q.all(proms);
            }
        );
    });

    // This is needed if we didn't do it while creating the partner tree
    it('generate consumption data for all players on platform', function () {
        return dataGenerator.createConsumptionRecordsForAllPlayersOnPlatform(generatedData.testPlatformId, generatedData, consumptionConfig);
    });

    // We need to generate providerPlayerDaySummary records for the partner consumption return event
    it('test daily provider player summary task', function () {
        return commonTestActions.calculateProviderPlayerDaySummaryForPastDays(consumptionConfig.consumeDays + 7, generatedData.testGameProviderId);
    });

    // it('test daily provider summary task', function () {
    //     return commonTestActions.calculateProviderDaySummaryForPastDays(consumptionConfig.consumeDays, generatedData.testGameProviderId);
    // });



    // === Test Partner Consumption Return ===

    it('test partner consumption return event', function () {
        return partnerConsumptionReturnEvent.checkPlatformWeeklyConsumptionReturnEvent(generatedData.testPlatformId).then(
            function (data) {
                // @todo
            }
        );
    });

    //it('Should step1Admin user be able to see the test proposal and approve', function () {
    //    return dbProposal.getAvailableProposalsByAdminId(step1AdminId, generatedData.testPlatformId).then(
    //        function (data) {
    //            should(data.length).be.greaterThan(0);
    //            // NOTE: In practice the consumption return will be auto-approved, but our test has added an approval step, so we must approve the proposals.
    //            var proms = [];
    //            for (var i = 0; i < data.length; i++) {
    //                if (String(data[i].type._id) == String(partnerConsumptionReturnProposalTypeId)) {
    //                    proms.push(dbProposal.updateProposalProcessStep(data[i]._id, step1AdminId, "test approve", true));
    //                }
    //            }
    //            return Q.all(proms);
    //        }
    //    );
    //});

    it('Test partner credit should increase', function () {
        // return dbPartner.getPartner({_id: testPartnerId[1]}).then(
        //     function (data) {
        //         data.credits.should.not.equal(0);
        //     }
        // );

        const totalConsumptionPerPlayer = consumptionConfig.consumeDays * consumptionConfig.consumeTimes * consumptionConfig.consumeAmount;
        return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).populate({path: "level", model: dbconfig.collection_partnerLevel}).then(
            function (partners) {
                partners.length.should.equal(testPartnerNum + expectedNodeCount);
                partners.forEach(function (partner, i) {

                    // Ignore the first few partners.  They didn't have any players!
                    if (i >= testPartnerNum) {

                        var rewardRatioNormal  = generatedData.partnerConsumptionReturnRewardEventData.param.rewardPercentage.data[0][testGameTypes.CARD];   // 0.03
                        var rewardRatioVIP     = generatedData.partnerConsumptionReturnRewardEventData.param.rewardPercentage.data[1][testGameTypes.CARD];      // 0.04
                        var rewardRatioDiamond = generatedData.partnerConsumptionReturnRewardEventData.param.rewardPercentage.data[2][testGameTypes.CARD];  // 0.05

                        // At present only the "Card" gameType is processed
                        if (partner.level.name === "Normal") {
                            partner.credits.should.equal(partnerTreeConfig.playersPerPartner * totalConsumptionPerPlayer * rewardRatioNormal);
                        }
                        if (partner.level.name === "VIP") {
                            partner.credits.should.equal(partnerTreeConfig.playersPerPartner * totalConsumptionPerPlayer * rewardRatioVIP);
                        }
                        if (partner.level.name === "Diamond") {
                            partner.credits.should.equal(partnerTreeConfig.playersPerPartner * totalConsumptionPerPlayer * rewardRatioDiamond);
                        }

                    }

                });
            }
        );
    });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, null).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId],testPlatformId, [], null).then(function(data){
            done();
        })
    });

    /*

    // === Test Partner Incentive Reward ===

    // These tests do not pass because the consumptionConfig above does not create summaries with enough activePlayers
    // Anyway this feature should be tested in testEventPartnerReferralReward.js

    it('Should get partner referral reward proposal type id and proposal type process id', function () {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: partnerReferralRewardTypeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformId, name: partnerReferralRewardTypeName});
        return Q.all([typeProm, typeProcessProm]).then(
            function (data) {
                data[0].name.should.equal(partnerReferralRewardTypeName);
                data[1].name.should.equal(partnerReferralRewardTypeName);
                partnerReferralRewardProposalTypeId = data[0]._id;
                partnerReferralRewardProposalTypeProcessId = data[1]._id;
            }
        );
    });

    it('create and link test proposal type process steps', function () {
        var stepType1Name = "testStepType1" + date;
        var prom1 = dbProposalTypeProcessStep.createProposalTypeProcessStep(
            {title: stepType1Name, department: step1DepartmentId, role: step1RoleId}
        );

        return prom1.then(
            function (stepType1) {
                stepType1.title.should.equal(stepType1Name);
                return dbProposalTypeProcess.addStepToProcess(partnerReferralRewardProposalTypeProcessId, [stepType1._id]);
            }
        )
    });

    it('get test reward type', function () {
        return dbRewardType.getRewardType({name: partnerReferralRewardTypeName}).then(
            function(data){
                testPartnerReferralRewardTypeId = data._id;
            }
        );
    });

    it('create partner referral reward event', function () {
        var eventName = "testReferralRewardEvent" + date;

        var eventData = {
            name: eventName,
            platform: testPlatformId,
            type: testPartnerReferralRewardTypeId,
            condition: {
                partnerLevel: 'Normal',
                numOfEntries: 4
            },
            param: {
                rewardAmount: {
                    type: "Array<PositiveInteger>",
                    des: "Reward amount based on newly referred players",
                    data: [10, 20, 50, 100]
                }
            },
            executeProposal: partnerReferralRewardProposalTypeId
        };
        return dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testPartnerReferralRewardEventId = data._id;
            }
        );
    });

    // This function is cloned from testSettlementPlayerSummary.js
    it('test daily player game type consumption summary task', function (done) {
        var proms = [];

        for (var i = 0; i < consumptionConfig.consumeDays; i++) {
            var endTime = new Date();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            var startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            // proms.push(dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, vars.testPlatformId));
            proms.push(dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, generatedData.testPlatformId));
        }
        Q.all(proms).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });

    // This function is cloned from testSettlementPlayerSummary.js
    it('test weekly player consumption summary task', function () {
        var week = dataGenerator.getThisWeekStartAndEnd();
        return dbPlayerConsumptionWeekSummary.calculatePlatformWeekSummaryForTimeFrame(week.startTime, week.endTime, generatedData.testPlatformId).then(
            function (data) {
                // What should the actual results be?
                return dbconfig.collection_playerConsumptionWeekSummary.find({platformId: generatedData.testPlatformId}).then(
                    function (summaries) {
                        summaries.length.should.not.be.lessThan(expectedNodeCount * partnerTreeConfig.playersPerPartner);
                        summaries[0].amount.should.equal(consumptionConfig.consumeTimes * consumptionConfig.consumeDays * consumptionConfig.consumeAmount);
                    }
                );
            }
        );
    });

    it('perform platform partner week summary', function () {
        return partnerSummary.calculateWeekSummary(generatedData.testPlatformId);
    });

    it('test partner referral reward event', function () {
        return partnerReferralRewardEvent.checkPartnerReferralRewardEvent(generatedData.testPlatformId)
            .catch(
                function (error) {
                    return Q.reject(error.error || error);
                }
            );
    });

    it('Should step1Admin user be able to see the test proposal and approve', function () {
        return dbProposal.getAvailableProposalsByAdminId(step1AdminId, generatedData.testPlatformId).then(
            function (data) {
                data = data.filter( proposal => proposal.type && proposal.type.name === constProposalType.PARTNER_REFERRAL_REWARD );
                data.length.should.be.greaterThan(0);
                var proms = [];
                for (var i = 0; i < data.length; i++) {
                    if (String(data[i].type._id) == String(partnerReferralRewardProposalTypeId)) {
                        proms.push(dbProposal.updateProposalProcessStep(data[i]._id, step1AdminId, "test approve", true));
                    }
                }
                return Q.all(proms).then(
                    function (data) {
                    }
                );
            }
        );
    });

    it('Test partner credit should increase', function () {
        return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).populate({path: "level", model: dbconfig.collection_partnerLevel}).then(
            function (partners) {
                partners.length.should.equal(testPartnerNum + expectedNodeCount);
                partners.forEach(function (partner, i) {

                    // Ignore the first few partners.  They didn't have any players!
                    if (i >= testPartnerNum) {

                        // At present only the "Card" gameType is processed
                        if (partner.level.name === "Normal") {
                            partner.credits.should.equal(10);
                        }
                        if (partner.level.name === "VIP") {
                            partner.credits.should.equal(20);
                        }
                        if (partner.level.name === "Diamond") {
                            partner.credits.should.equal(0);
                        }

                    }

                });
            }
        );
    });

    */

});
