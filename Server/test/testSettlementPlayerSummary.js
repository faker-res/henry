var should = require('should');
var dbPartnerLevel = require('../db_modules/dbPartnerLevel');
var dbPartner = require('../db_modules/dbPartner');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbGame = require('../db_modules/dbGame');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dailyPlatformSettlement = require('../scheduleTask/dailyPlatformSettlement');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');

var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');

var dbconfig = require('../modules/dbproperties');

var testGameTypes = require("../test/testGameTypes");
var playerSummary = require("../scheduleTask/playerSummary");
var partnerSummary = require("../scheduleTask/partnerSummary");

var dataGenerator = require("./../test_modules/dataGenerator.js");

var Q = require("q");
var commonTestActions = require("./../test_modules/commonTestActions.js");
var commonTestFun = require('../test_modules/commonTestFunc');
var dbUtil = require('../modules/dbutility');

describe("Test player summary settlement", function () {

    var date = new Date();

    var consumptionConfig = {
        consumeTimes: 3,
        consumeDays: 3,
        consumeAmount: 505,
        //lastConsumptionTime: dbUtil.getLastWeekSGTime().endTime
    };

    var topUpDays = 2;
    var topUpTimes = 4;
    var topUpAmount = 600;
    var bulkTopUpRecordSummaryOps = 0;

    var generatedData = {};

    it('creates test player, platform, games and consumption records', function () {
        return dataGenerator.createTestPlayerPlatformGamesAndConsumptionRecords(consumptionConfig, generatedData);
    });

    it('creates top Up records for the player', function () {
        dataGenerator.createTopUpRecordsForPlayer(generatedData.testPlayerId ,generatedData.testPlatformId,topUpDays,topUpTimes, topUpAmount, null, bulkTopUpRecordSummaryOps);
    });

    it('start platform daily settlement', function () {
         return dailyPlatformSettlement.calculateDailyPlatformSettlement(generatedData.testPlatformId);
    });
    ///////////////////////////// Consumption weekly summary test /////////////////////

    it('test daily player consumption summary task', function () {
        return commonTestActions.calculatePlatformDaySummaryForPastDays(consumptionConfig.consumeDays, generatedData.testPlatformId);
    });

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

    it('Clear Consumption Data', function () {
        dataGenerator.clearTopUpData(generatedData);
    });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(generatedData.testPlatformId, [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , generatedData.testPlatformId, [], [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });
    /////////////////////////////// Consumption weekly summary test /////////////////////

    // it('test weekly player game type consumption summary task', function () {
    //     return playerSummary.calculateLastWeekPlayerGameTypeConsumptionSummary(vars.testPlatformId).then(
    //         function (data) {
    //             // What should the actual results be?
    //             var week = dataGenerator.getThisWeekStartAndEnd();
    //             return Q.all([
    //                 dbconfig.collection_playerGameTypeConsumptionWeekSummary.find({playerId: vars.testPlayerId, date: week.startTime, gameType: vars.testGameType}).then(
    //                     function (summaries) {
    //                         summaries.length.should.equal(1);
    //                         summaries[0].amount.should.equal(1 * consumptionConfig.consumeDays * consumptionConfig.consumeAmount);
    //                     }
    //                 ),
    //                 dbconfig.collection_playerGameTypeConsumptionWeekSummary.find({playerId: vars.testPlayerId, date: week.startTime, gameType: vars.testGame2Type}).then(
    //                     function (summaries) {
    //                         summaries.length.should.equal(1);
    //                         summaries[0].amount.should.equal((consumptionConfig.consumeTimes - 1) * consumptionConfig.consumeDays * consumptionConfig.consumeAmount);
    //                     }
    //                 )
    //             ]);
    //         }
    //     );
    // });

});
