/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var should = require('should');
var dbPartnerLevel = require('../db_modules/dbPartnerLevel');
var dbPartner = require('../db_modules/dbPartner');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPartner = require('../db_modules/dbPartner');
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
        consumeTimes: 3,
        consumeDays: 1,
        consumeAmount: 325,
        bonusAmount: -20,
        lastConsumptionTime: new Date()
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

    it('add platform partner commission config', function () {
        var config ={
            //platform
            platform: generatedData.testPlatformId,
            //platform fee rate
            platformFeeRate: 0.1,
            //service fee rate
            serviceFeeRate: 0.1,
            //commission period: day, week, month
            commissionPeriod: "DAY",
            //commission level config
            commissionLevelConfig: [{
                //level value, used for level comparison
                value: 0,
                minProfitAmount: 0,
                maxProfitAmount: 1000,
                minActivePlayer: 1,
                commissionRate: 0.1
            }],
            //commission rate for children
            childrenCommissionRate: [{
                level: 1,
                rate: 0.1
            }],
            //bonus commission times
            bonusCommissionHistoryTimes: 3,
            //bonus commission rate
            bonusRate: 0.1
        };
        var newConfig = new dbconfig.collection_partnerCommissionConfig(config);
        return newConfig.save();
    });

    it('test platform partner commission settlement', function () {
        return dbPartner.startPlatformPartnerCommissionSettlement(generatedData.testPlatformId).then(
            data => {
                console.log(data);
            }
        );
    });

    it('test platform partner children commission settlement', function () {
        return dbPartner.startPlatformPartnerChildrenCommissionSettlement(generatedData.testPlatformId).then(
            data => {
                console.log(data);
            }
        );
    });

    it('Test player Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
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
