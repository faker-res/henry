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

describe("Test partner top up return reward event", function () {

    var testPlatformId = null;
    var testPartnerLevels = [];
    var testPartnerNum = 0;

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

    it('create partner top up return reward event', function () {
        return rewardEventGenerator.createPartnerTopUpReturnRewardEvent(testPlatformId, generatedData);
    });

    it('get partner levels info', function () {
        return dbconfig.collection_partnerLevel.find({platform:testPlatformId}).then(
            function(data){
                data.forEach( level => testPartnerLevels.push(level._id) );
            }
        );
    });

    var topUpConfig = {
        numOfDays: 1,
        topUpTimes: 1,
        topUpDays: 1,
        topUpAmount: 1000,
        lastTopUpTime: dbutility.getLastWeekSGTime().endTime
    };

    var partnerTreeConfig = {
        topLevelPartners: 2,
        depth: 2,
        childrenPerPartner: 2,

        playersPerPartner: 2
    };

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
    this.timeout(10000);

    it('creates a tree of partners, with players', function () {
        generatedData.testPartnerLevel = testPartnerLevels[0];
        generatedData.testPlatformId = testPlatformId;

        //partnerTreeConfig.consumptionConfig = consumptionConfig;
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

    it('creates top Up records for the player', function () {
        return dbconfig.collection_players.find({platform: testPlatformId}).then(
            players => {
                players.forEach(
                    player => {
                        dataGenerator.createTopUpRecordsForPlayer(player._id, testPlatformId,topUpConfig.numOfDays,topUpConfig.topUpTimes, topUpConfig.topUpAmount, null, 0);
                    }
                );
            }
        );
    });

    // This is needed if we didn't do it while creating the partner tree
    // it('generate consumption data for all players on platform', function () {
    //     return dataGenerator.createTopUpRecordsForPlayer(generatedData.testPlatformId, generatedData, consumptionConfig);
    // });

    // We need to generate providerPlayerDaySummary records for the partner consumption return event
    // it('test daily provider player summary task', function () {
    //     return commonTestActions.calculateProviderPlayerDaySummaryForPastDays(consumptionConfig.consumeDays + 7, generatedData.testGameProviderId);
    // });

    // === Test Partner Consumption Return ===

    it('test partner consumption return event', function () {
        //find all reward events for this platform
        return dbconfig.collection_rewardEvent.findOne({platform: testPlatformId})
            .populate({path: "type", model: dbconfig.collection_rewardType}).then(
                function (event) {
                    return dbPartnerWeekSummary.checkPlatformWeeklyTopUpReturn(testPlatformId, event, event.executeProposal);
                }
            ).then(
                data => console.log(data)
            );
    });

    it('Test partner credit should increase', function () {
        // const totalConsumptionPerPlayer = consumptionConfig.consumeDays * consumptionConfig.consumeTimes * consumptionConfig.consumeAmount;
        return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).populate({path: "level", model: dbconfig.collection_partnerLevel}).then(
            function (partners) {
                partners.length.should.equal(testPartnerNum + expectedNodeCount);
                partners.forEach(function (partner, i) {

                    // Ignore the first few partners.  They didn't have any players!
                    if (i >= testPartnerNum) {

                        var rewardRatioNormal  = generatedData.partnerTopUpReturnRewardEventData.param.reward[0].rewardPercentage;   // 0.01
                        var rewardRatioVIP     = generatedData.partnerTopUpReturnRewardEventData.param.reward[1].rewardPercentage;  // 0.02
                        var rewardRatioDiamond = generatedData.partnerTopUpReturnRewardEventData.param.reward[2].rewardPercentage;  // 0.03

                        // // At present only the "Card" gameType is processed
                        if (partner.level.name === "Normal") {
                            partner.credits.should.equal(topUpConfig.topUpAmount*partnerTreeConfig.playersPerPartner  * rewardRatioNormal);
                        }
                        if (partner.level.name === "VIP") {
                            partner.credits.should.equal(topUpConfig.topUpAmount*partnerTreeConfig.playersPerPartner * rewardRatioVIP);
                        }
                        if (partner.level.name === "Diamond") {
                            partner.credits.should.equal(topUpConfig.topUpAmount*partnerTreeConfig.playersPerPartner * rewardRatioDiamond);
                        }

                    }

                });
            }
        );
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

});
