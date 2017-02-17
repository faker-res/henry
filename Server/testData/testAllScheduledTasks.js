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
var commonTestFun = require('../test_modules/commonTestFunc');

// If we want to add this to all tests implicitly, adding it to dbproperties.js, socketConnection.js and commonTestFunc.js should provide pretty good coverage:
//     $ grep -c '\(dbproperties\|socketConnection\|commonTestFunc\)' test/*.js | grep ':0$'
require('../test_modules/improveMochaReporting')();

var testGameTypes = require("../test/testGameTypes");
var playerSummary = require("../scheduleTask/playerSummary");
var partnerSummary = require("../scheduleTask/partnerSummary");

var dataGenerator = require("../test_modules/dataGenerator.js");

var Q = require("q");

var promiseUtils = require("../modules/promiseUtils");
var mongooseUtils = require("../modules/mongooseUtils");

var dataUtils = require("../modules/dataUtils.js");
var dbGameProvider = require("../db_modules/dbGameProvider.js");
var commonTestActions = require("../test_modules/commonTestActions.js");
var dailyProviderSettlement = require("../scheduleTask/dailyProviderSettlement.js");
var dailyPlatformSettlement = require("../scheduleTask/dailyPlatformSettlement.js");
var weeklyPlatformSettlement = require("../scheduleTask/weeklyPlatformSettlement.js");
var consumptionReturnEvent = require("../scheduleTask/consumptionReturnEvent.js");
var rewardEventGenerator = require("../test_modules/rewardEventGenerator.js");
var dbUtil = require("../modules/dbutility.js");
var constShardKeys = require("../const/constShardKeys.js");

var mongoose = require('mongoose');
var streamUtils = require("../modules/streamUtils.js");
var errorUtils = require("../modules/errorUtils.js");

const reportAndRethrow = (error) => (errorUtils.reportError(error), Q.reject(error));

describe("Test all settlements", function () {

    var consumptionConfig = {
        consumeTimes: 1,
        consumeDays: 1,
        consumeAmount: 325
    };

    var topUpConfig = {
        //consecutiveDays: 3,
        //minAmount: 1000,
        numOfDays: 1,
        topUpTimes: 1,
        topUpDays: 1,
        topUpAmount: 35
    };

    var rewardAmount = 300;
    var spendingAmount = rewardAmount;

    var partnerTreeConfig = {
        topLevelPartners: 2,
        depth: 2,
        childrenPerPartner: 2,

        playersPerPartner: 2
    };

    // PartnerReferralReward will only be given to validPlayers who have made a lot of topups
    consumptionConfig.consumeTimes = 10;
    topUpConfig.topUpTimes = 10;

    // The full test:
    // - 13640 partners
    // - 136400 players
    // - 1364000 consumption records
    //
    //var partnerTreeConfig = {
    //    topLevelPartners: 40,
    //    depth: 4,
    //    childrenPerPartner: 4,
    //
    //    playersPerPartner: 10
    //};
    //partnerTreeConfig.bigTest = true;



    // @todo Test all of the below for multiple platforms

    var generatedData = {};

    var useExternalData = process.env.PLATFORM;

    if (useExternalData) {
        generatedData.testPlatformId = mongoose.Types.ObjectId(process.env.PLATFORM);
    }

    if (!useExternalData) {

    it('creates test player, platform, games', function () {
        this.timeout(5000);
        return dataGenerator.createTestPlatformAndGames(generatedData);
    });

    // We need a testGameProviderId if we want to create valid consumption records
    it('Should create test game provider', function () {
        var providerData = {
            name: "testGameProvider" + Date.now(),
            nickName: "Froggy Games",
            code: "FGXN" + Date.now()
        };
        return dbGameProvider.createGameProvider(providerData).then(
            function (data) {
                generatedData.testGameProviderId = data._id;
            }
        );
    });

    var expectedNodeCount = (Math.pow(partnerTreeConfig.childrenPerPartner, partnerTreeConfig.depth + 1) - 1) / (partnerTreeConfig.childrenPerPartner - 1) * partnerTreeConfig.topLevelPartners;
    this.timeout(5000 + expectedNodeCount * consumptionConfig.consumeTimes * consumptionConfig.consumeDays * partnerTreeConfig.playersPerPartner * 500);

    // console.log("expectedNodeCount:", expectedNodeCount);

    it('creates a tree of partners, with players', function () {
        partnerTreeConfig.generatedData = generatedData;
        return dataGenerator.createPartnerTree(partnerTreeConfig);
    });

    // This is needed if we didn't do it while creating the partner tree
    it('generate consumption data for all players on platform', function () {
        return dataGenerator.createConsumptionRecordsForAllPlayersOnPlatform(generatedData.testPlatformId, generatedData, consumptionConfig, topUpConfig);
    });

    it('check that enough data was generated', () =>
        Q.resolve().then(
            () => dbconfig.collection_playerConsumptionRecord.count({platformId: generatedData.testPlatformId})
        ).then(
            (count) => count.should.be.greaterThan(partnerTreeConfig.bigTest ? 1000 * 1000 : 5)
        ).then(
            () => dbconfig.collection_playerTopUpRecord.count({platformId: generatedData.testPlatformId})
        ).then(
            (count) => count.should.be.greaterThan(partnerTreeConfig.bigTest ? 1000 * 1000 : 5)
        )
    );

    // Make data more realistic.  These are not needed for this test, but might be useful for someone using this test data.
    it('Assign generated provider to the generated platform', function () {
        //return dbconfig.collection_platform.findOne({_id: generatedData.testPlatformId}).then(
        //    function (platform) {
        //        platform.gameProviders.push(generatedData.testGameProviderId);
        //        return platform.save();
        //    }
        //);
        // The above does it manually.  But actually it's easier to call an API function to do it:
        return dbPlatform.addProviderToPlatformById(generatedData.testPlatformId, generatedData.testGameProviderId, 'OurOnlyGameProvider');
    });
    it('Assign games to live under that provider', function () {
        return dbconfig.collection_game.find({_id: {$in: [generatedData.testGameId, generatedData.testGame2Id]}}).then(
            function (games) {
                return Q.all(games.map(game => { game.provider = generatedData.testGameProviderId; return game.save(); }));
            }
        )
    });

    }

    /*
    // We need to calculate the player consumption week summary before we can test this partner summary
    // partnerWeekSummaries are needed for partner migration

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
    */

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

    /*
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
    */



    // We need to generate providerPlayerDaySummary records for the partner consumption return event
    it('perform daily provider player day summary for past week', function () {
        return commonTestActions.calculateProviderPlayerDaySummaryForPastDays(consumptionConfig.consumeDays, generatedData.testGameProviderId);
    });

    // An alternative that doesn't go back so many days
    //it('perform daily provider player day summary for past week', function () {
    //    return dailyProviderSettlement.calculateDailyProviderSettlement(generatedData.testProviderId);
    //});

    // Some more scheduled tasks
    /*
    it('perform daily provider summary for past week', function () {
        return commonTestActions.calculateProviderDaySummaryForPastDays(consumptionConfig.consumeDays, generatedData.testGameProviderId);
    });
    it('perform daily player consumption summary task', function () {
        return commonTestActions.calculatePlatformDaySummaryForPastDays(consumptionConfig.consumeDays, generatedData.testPlatformId);
    });
    it('perform weekly player consumption summary task', function () {
        var week = dataGenerator.getThisWeekStartAndEnd();
        return dbPlayerConsumptionWeekSummary.calculatePlatformWeekSummaryForTimeFrame(week.startTime, week.endTime, generatedData.testPlatformId);
    });
    it('check weekly player consumption summary task', function () {
        var week = dataGenerator.getThisWeekStartAndEnd();
        return dbconfig.collection_playerConsumptionWeekSummary.find({playerId: generatedData.testPlayerId, date: week.startTime}).then(
            function (summaries) {
                summaries.length.should.equal(1);
                summaries[0].amount.should.equal(consumptionConfig.consumeTimes * consumptionConfig.consumeDays * consumptionConfig.consumeAmount);
            }
        );
    });
    */



    it('remove all reward events', function () {
        return dbconfig.collection_rewardEvent.remove({platform: generatedData.testPlatformId});
    });
    it('create full attendance reward event', function () {
        return rewardEventGenerator.createFullAttendanceRewardEvent(generatedData.testPlatformId, topUpConfig, consumptionConfig, rewardAmount, spendingAmount);
    });
    it('create player consumption return reward event', function () {
        return rewardEventGenerator.createPlayerConsumptionReturnRewardEvent(generatedData.testPlatformId, generatedData);
    });
    it('create partner consumption return reward event', function () {
        return rewardEventGenerator.createPartnerConsumptionReturnRewardEvent(generatedData.testPlatformId);
    });
    it('get test platform partner levels', function () {
        return dbPartnerLevel.getPartnerLevel({platform: generatedData.testPlatformId}).then(
            function(partnerLevels){
                generatedData.testPartnerLevels = partnerLevels;
            }
        );
    });
    it('create partner referral reward event', function () {
        var maxPartnerLevelForReward = 1;
        var partnerLevelName = generatedData.testPartnerLevels[maxPartnerLevelForReward].name;
        return rewardEventGenerator.createPartnerReferralRewardEvent(generatedData.testPlatformId, partnerLevelName);
    });
    it('create partner incentive reward event', function () {
        // This reward would usually be given only to partners with a high level.
        //var partnerLevelForReward = 2;
        // But all the partners we generated earlier have level 1.  So if we want some partners to receive this reward, we need to reduce the criteria.
        var partnerLevelForReward = 1;
        var partnerLevelName = generatedData.testPartnerLevels[partnerLevelForReward].name;
        var validConsumptionSum = 100;
        var rewardAmount = 205;
        return rewardEventGenerator.createPartnerIncentiveRewardEvent(generatedData.testPlatformId, partnerLevelName, validConsumptionSum, rewardAmount);
    });



    /*
    it('give partners evenly spread levels', function () {
        var stream = dbconfig.collection_partner.find({platform: generatedData.testPlatformId}).stream();
        var i = 0;
        return streamUtils.processStreamConcurrently(stream, 100, function (partner) {
            // Even spread of levels
            partner.level = generatedData.testPartnerLevels[i++ % generatedData.testPartnerLevels.length];
            return partner.save();
        });
    });
    */



    if (process.env.SKIP_TESTS) {
        return;
    }

    this.timeout(15*60*1000);

    it('start platform daily settlement', function () {
        return dailyPlatformSettlement.calculateDailyPlatformSettlement(generatedData.testPlatformId);
    });

    // These functions are split up components from weeklyPlatformSettlement.calculateWeeklyPlatformSettlement
    it('generate weekly platform summaries', function () {
        return weeklyPlatformSettlement.generateWeeklyPlatformSummaries(generatedData.testPlatformId);
    });
    it('perform weekly platform reward event settlement', function () {
        return weeklyPlatformSettlement.startWeeklyPlatformRewardEventSettlement(generatedData.testPlatformId);
    });
    // This test needs to be prepared after generating weekly platform summaries, because it modifies them to setup test data.
    it('prepare partner migrations test', function () {
        return commonTestActions.preparePartnerLevelMigrationsTest(generatedData.testPlatformId);
    });
    it('perform partner level migrations', function () {
        return partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId);
    });


    it('check partner migrations test', function () {
        // We run it twice, to test that it processes each partner only once!
        return partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId).then(
            () => partnerSummary.performPartnerLevelMigration(generatedData.testPlatformId)
        ).then(
            //() => commonTestActions.checkPartnerMigrationsTest(generatedData.testPlatformId)
        );
    });

    it('display partner credits', function () {
        return commonTestActions.showAveragePartnerCredit(generatedData.testPlatformId);
    });

    // NOTE: There are no proposals created for PartnerReferralReward.  Input data may need to be tweaked.  test/testEventPartnerReferralReward.js does generate proposals.
    // NOTE: There are no proposals created for PartnerIncentiveReward.  Input data may need to be tweaked.  test/testEventPartnerIncentiveReward.js does generate proposals.


    //it('test consumption return event', function () {
    //    return consumptionReturnEvent.checkPlatformWeeklyConsumptionReturnEvent(generatedData.testPlatformId).then();
    //});

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(generatedData.testPlatformId, []).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , generatedData.testPlatformId, [], []).then(function(data){
            done();
        })
    });

});
