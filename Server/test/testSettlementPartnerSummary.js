"use strict";

var should = require('should');
var dbPartnerLevel = require('../db_modules/dbPartnerLevel');
var dbPartner = require('../db_modules/dbPartner');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbGame = require('../db_modules/dbGame');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');

var dbPartnerWeekSummary = require('../db_modules/dbPartnerWeekSummary');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');

var dbconfig = require('../modules/dbproperties');

var testGameTypes = require("../test/testGameTypes");
var playerSummary = require("../scheduleTask/playerSummary");
var partnerSummary = require("../scheduleTask/partnerSummary");

var dataGenerator = require("./../test_modules/dataGenerator.js");

var Q = require("q");
var commonTestFun = require('../test_modules/commonTestFunc');

var promiseUtils = require("../modules/promiseUtils");
var mongooseUtils = require("../modules/mongooseUtils");

var dataUtils = require("../modules/dataUtils.js");
var dbGameProvider = require("../db_modules/dbGameProvider.js");
var commonTestActions = require("./../test_modules/commonTestActions.js");


describe("Test partner summary settlement", function () {

    var consumptionConfig = {
        consumeTimes: 1,
        consumeDays: 1,
        consumeAmount: 325
    };

    var topUpConfig = {
        //consecutiveDays: 3,
        //minAmount: 1000,
        numOfDays: 3,
        topUpTimes: 2,
        topUpDays: 3,
        topUpAmount: 35
    };

    var partnerTreeConfig = {
        topLevelPartners: 2,
        depth: 2,
        childrenPerPartner: 2,

        playersPerPartner: 2
    };

    // A tree with 1364 partners (test may take around 2 minutes)
    // var partnerTreeConfig = {
    //     topLevelPartners: 4,
    //     depth: 4,
    //     childrenPerPartner: 4,
    //
    //     playersPerPartner: 2
    // };

    var generatedData = {};


    it('creates test player, platform, games', function () {
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData);
    });

    // We need a testGameProviderId if we want to create valid consumption records
    it('Should create test game provider', function () {
        return  commonTestFun.createTestGameProvider().then(
            function (data) {
                generatedData.testGameProviderId = data._id;
            }
        );
    });

    // The following tests (especially tree creation) may be slow if the tree is very large, so we increase the timeout.
    // A tree of 1092 partners with 9 total consumption times took 83 seconds to generate.
    // (The partner week summary took only 7 seconds to process.)
    // For fast tree generation, keep consumeTimes and consumeDays low.

    var expectedNodeCount = (Math.pow(partnerTreeConfig.childrenPerPartner, partnerTreeConfig.depth + 1) - 1) / (partnerTreeConfig.childrenPerPartner - 1) * partnerTreeConfig.topLevelPartners;
    this.timeout(5000 + expectedNodeCount * consumptionConfig.consumeTimes * consumptionConfig.consumeDays * partnerTreeConfig.playersPerPartner * 500);

    // console.log("expectedNodeCount:", expectedNodeCount);

    it('creates a tree of partners, with players', function () {
        partnerTreeConfig.generatedData = generatedData;
        return dataGenerator.createPartnerTree(partnerTreeConfig);
    });

    // This is needed if we didn't do it while creating the partner tree
    it('generate consumption data for all players on platform', function () {
        return dataGenerator.createConsumptionRecordsForAllPlayersOnPlatform(generatedData.testPlatformId, generatedData, consumptionConfig); //, topUpConfig);
    });



    // We need to calculate the player consumption week summary before we can test this partner summary

    it('test daily player consumption summary task', function () {
        return commonTestActions.calculatePlatformDaySummaryForPastDays(consumptionConfig.consumeDays, generatedData.testPlatformId);
    });

    // This function is cloned from testSettlementPlayerSummary.js
    it('test weekly player consumption summary task', function () {
        var week = dataGenerator.getThisWeekStartAndEnd();
        return dbPlayerConsumptionWeekSummary.calculatePlatformWeekSummaryForTimeFrame(week.startTime, week.endTime, generatedData.testPlatformId).then(
            function (data) {
                // What should the actual results be?
                return dbconfig.collection_playerConsumptionWeekSummary.find({playerId: generatedData.testPlayerId, date: week.startTime}).then(
                    function (summaries) {
                        summaries.length.should.equal(1);
                        summaries[0].amount.should.equal(consumptionConfig.consumeTimes * consumptionConfig.consumeDays * consumptionConfig.consumeAmount);
                    }
                );
            }
        );
    });

    // This function is cloned from testEventFullAttendance.js
    it('test daily player top up summary task', function () {
        var proms = [];

        for (var i = 0; i < topUpConfig.numOfDays; i++) {
            var endTime = new Date();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            var startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            proms.push(dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, generatedData.testPlatformId));
        }
        return Q.all(proms);
    });

    // This function is cloned from testDBPlayerTopUpRecord.js
    it('test weekly player top up summary task', function () {
        var endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        endTime.setDate( endTime.getDate() );
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - 7);
        return dbPlayerTopUpWeekSummary.calculatePlatformWeekSummaryForTimeFrame(startTime, endTime, generatedData.testPlatformId);
    });


    // Now we can actually do our tests!

    /*
    it('test one weekly partner summary', function () {
        var partnerLevel = 2; // TODO: ?
        var week = dataGenerator.getThisWeekStartAndEnd();
        return dbPartnerWeekSummary.calculatePartnerWeekSummary(generatedData.testPlatformId, generatedData.testPartnerId, partnerLevel, week.startTime, week.endTime).then(
            function (data) {
                return dbconfig.collection_partnerWeekSummary.findOne({partnerId: generatedData.testPartnerId}).then(
                    function (data) {
                        console.log("data:", data);
                        data.validPlayers.should.equal(1);
                        data.consumptionSum.should.equal(consumptionConfig.consumeTimes * consumptionConfig.consumeDays * consumptionConfig.consumeAmount);
                    }
                );
            }
        );
    });
    */

    it('test platform partner week summary', function () {
        // We run it twice, since the ability to rerun it is a desirable feature.
        return partnerSummary.calculateWeekSummary(generatedData.testPlatformId).then(
            () => partnerSummary.calculateWeekSummary(generatedData.testPlatformId)
        ).then(
            function (data) {
                var expectedWeekConsumptionSumForOnePlayer = consumptionConfig.consumeTimes * consumptionConfig.consumeDays * consumptionConfig.consumeAmount;
                var expectedWeekPlayerConsumptionSumForOnePartner = expectedWeekConsumptionSumForOnePlayer * partnerTreeConfig.playersPerPartner;
                var expectedWeekChildConsumptionForOneParentPartner = expectedWeekPlayerConsumptionSumForOnePartner * partnerTreeConfig.childrenPerPartner;

                function checkChildWeekSummaries () {
                    return dbconfig.collection_partnerChildWeekSummary.find({platformId: generatedData.testPlatformId}).then(
                        function (childSummaries) {
                            childSummaries.forEach(
                                summary => summary.childValidAmount.should.equal(expectedWeekPlayerConsumptionSumForOnePartner)
                            );
                        }
                    );
                }

                function checkPartnerWeekSummaries () {
                    return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).lean().then(
                        function (allPartners) {
                            var allPartnersById = dataUtils.byKey(allPartners, '_id');
                            return dbconfig.collection_partnerWeekSummary.find({platformId: generatedData.testPlatformId}).then(
                                function (partnerSummaries) {
                                    partnerSummaries.length.should.be.greaterThan(0);
                                    partnerSummaries.forEach(
                                        function (summary) {
                                            var partner = allPartnersById[String(summary.partnerId)];
                                            if (partner.children.length > 0) {
                                                summary.childValidAmount.should.equal(expectedWeekChildConsumptionForOneParentPartner);
                                            } else {
                                                // should(summary.childValidAmount).be.oneOf(0, undefined);
                                                [0, undefined].should.containEql(summary.childValidAmount);
                                            }
                                        }
                                    )
                                }
                            );
                        }
                    );
                }

                return checkChildWeekSummaries().then(checkPartnerWeekSummaries);
            }
        ).catch(
            function (error) {
                // Get the real error out
                return Q.reject(error.error ? error.error : error);
            }
        );
    });

    var testMigrationPartnerIds = [];
    var testMigrationPartners = {
        toPromote: null,
        toDemote: null,
        toPunish: null,      // Will increase failMeetingTargetWeeks
        toCoast: null        // Will do nothing
    };

    it('prepare levels for migrations test', function () {

    });

    /*
    it('prepare partner migrations test', function () {
        return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).populate({path: 'level', model: dbconfig.collection_partnerLevel}).then(
            function (partners) {
                testMigrationPartners.toPromote = partners[0];
                testMigrationPartners.toDemote = partners[1];
                testMigrationPartners.toPunish = partners[2];
                testMigrationPartners.toCoast = partners[3];

                testMigrationPartnerIds = partners.slice(0, 4).map( p => p._id );

                return dbconfig.collection_partnerWeekSummary.find({partnerId: {$in: testMigrationPartnerIds}}).then(
                    function (partnerWeekSummaries) {
                        const summariesByPartnerId = dataUtils.byKey(partnerWeekSummaries, 'partnerId');

                        const proms = [];

                        // He will surely get promoted
                        const toPromoteSummary = summariesByPartnerId[testMigrationPartners.toPromote._id];
                        toPromoteSummary.validPlayers = 9999999999;
                        toPromoteSummary.validConsumptionSum = 9999999999;
                        proms.push( toPromoteSummary.save() );

                        // He will surely get demoted
                        const toDemoteSummary = summariesByPartnerId[testMigrationPartners.toDemote._id];
                        toDemoteSummary.validPlayers = 0;
                        toDemoteSummary.validConsumptionSum = 0;
                        testMigrationPartners.toDemote.failMeetingTargetWeeks = 9999999999;
                        proms.push( toDemoteSummary.save() );
                        proms.push( testMigrationPartners.toDemote.save() );

                        // He will be "punished"
                        const toPunishSummary = summariesByPartnerId[testMigrationPartners.toPunish._id];
                        toPunishSummary.validPlayers = 0;
                        toPunishSummary.validConsumptionSum = 0;
                        proms.push( toPunishSummary.save() );

                        // Give him just enough to survive at his current level
                        const toCoastSummary = summariesByPartnerId[testMigrationPartners.toCoast._id];
                        toCoastSummary.validPlayers = testMigrationPartners.toCoast.level.limitPlayers;
                        toCoastSummary.validConsumptionSum = testMigrationPartners.toCoast.level.consumptionAmount;
                        proms.push( toCoastSummary.save() );

                        return Q.all(proms);
                    }
                );
            }
        );
    });

    it('check partner migrations', function () {
        // We run it twice, to test that it processes each partner only once!
        return partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId).then(
            () => partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId)
        ).then(
            function () {
                return dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).populate({path: 'level', model: dbconfig.collection_partnerLevel}).then(
                    function (partners) {
                        var partnerLevels = partners.map( p => p.level.value );

                        const partnersById = dataUtils.byKey(partners, '_id');

                        // Assuming they all started on partnerLevel 1

                        partnersById[testMigrationPartners.toPromote._id].level.value.should.equal(2);
                        partnersById[testMigrationPartners.toPromote._id].failMeetingTargetWeeks.should.equal(0);

                        partnersById[testMigrationPartners.toDemote._id].level.value.should.equal(0);
                        partnersById[testMigrationPartners.toDemote._id].failMeetingTargetWeeks.should.equal(0);

                        partnersById[testMigrationPartners.toPunish._id].level.value.should.equal(1);
                        partnersById[testMigrationPartners.toPunish._id].failMeetingTargetWeeks.should.equal(1);

                        partnersById[testMigrationPartners.toCoast._id].level.value.should.equal(1);
                        partnersById[testMigrationPartners.toCoast._id].failMeetingTargetWeeks.should.equal(0);
                    }
                );
            }
        );
    });
    */

    it('prepare partner migrations test', function () {
        return commonTestActions.preparePartnerLevelMigrationsTest(generatedData.testPlatformId);
    });

    it('check partner migrations', function () {
        // We run it twice, to test that it processes each partner only once!
        return partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId).then(
            () => partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId)
        ).then(
            () => commonTestActions.checkPartnerMigrationsTest(generatedData.testPlatformId)
        );
    });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(generatedData.testPlatformId,  [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([], generatedData.testPlatformId, [], [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });

});
