/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

require('../test_modules/improveMochaReporting')();
var Q = require("q");
var should = require('should');
var commonTestFun = require('../test_modules/commonTestFunc');
var dataGenerator = require("./../test_modules/dataGenerator.js");
var dbconfig = require('../modules/dbproperties');
var dbPlayerConsumptionRecord = require("../db_modules/dbPlayerConsumptionRecord.js");
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require("../db_modules/dbPlayerLevel.js");

describe("Test player level update", function () {

    var topUpAmount = 10000000;

    var generatedData = {};

    var originalPlayerLevelValue;

    it('creates test player, platform, games', function () {
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData);
    });

    it('check player level before', function () {
        return dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).select('playerLevel').populate({path: 'playerLevel', model: dbconfig.collection_playerLevel}).then(
            function (player) {
                originalPlayerLevelValue = player.playerLevel.value;
            }
        );
    });

    it('add consumption record for player', function () {
        return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
            {
                playerId: generatedData.testPlayerId,
                platformId: generatedData.testPlatformId,
                providerId: generatedData.testGameProviderObjId,
                gameId: generatedData.testGameId,
                orderNo: new Date().getTime()+Math.random(),
                gameType: generatedData.testGameType,
                amount: 99999999,
                createTime: new Date()
            }
        );
    });

    it('add topup record for player', function () {
        // We actually perform two topups in parallel, because this used to cause a bug
        return Q.all([
            dbPlayerInfo.playerTopUp(generatedData.testPlayerId, topUpAmount, "testPayment"),
            dbPlayerInfo.playerTopUp(generatedData.testPlayerId, topUpAmount, "testPayment"),
        ]);
    });

    //todo::tmp disable player level up unit test
    // it('check player level has increased', function () {
    //     return dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).populate({path: 'playerLevel', model: dbconfig.collection_playerLevel}).then(
    //         function (player) {
    //             console.log("originalPlayerLevelValue, player.playerLevel.value:", originalPlayerLevelValue, player.playerLevel.value);
    //             player.playerLevel.value.should.be.greaterThan(originalPlayerLevelValue);
    //         }
    //     ).then(
    //         () => Q.delay(2000)
    //     )
    // });

    // it('check player credit is as expected', function () {
    //     // This was the default in the playerLevel schema
    //     var expectedReward = 20;
    //
    //     return dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).populate(
    //         {path: 'playerLevel', model: dbconfig.collection_playerLevel}
    //     ).then(
    //         function (player) {
    //             player.validCredit.should.equal(topUpAmount * 2 + expectedReward);
    //         }
    //     ).then(
    //         () => Q.delay(2000)
    //     )
    // });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(generatedData.testPlatformId,  [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([],generatedData.testPlatformId, [], [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });



    it('Create fresh test player, platform, games', function () {
        generatedData = {};
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData);
    });

    it('Set player level to medium/high level', function () {
        return dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).then(
            function (player) {
                return dbPlayerLevel.getPlayerLevel({platform: player.platform}).sort({value: +1}).then(
                    playerLevels => {
                        player.playerLevel = playerLevels[2];
                        originalPlayerLevelValue = player.playerLevel.value;
                        //console.log("Before: player.playerLevel.value:", player.playerLevel.value);
                        return player.save();
                    }
                );
            }
        );
    });

    it('Re-check player level migration', function () {
        const playerProm = dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).populate(
            {path: 'playerLevel', model: dbconfig.collection_playerLevel}
        );
        const playerLevelProm = dbconfig.collection_playerLevel.find({platform: generatedData.testPlatformId}).sort({value: +1});

        return Q.all([playerProm, playerLevelProm]).spread(
            (player, playerLevels) => dbPlayerInfo.checkPlayerLevelMigration(player, playerLevels, true, true)
        );
    });

    it('Ensure player level has dropped', function () {
        return dbconfig.collection_players.findOne({_id: generatedData.testPlayerId}).populate({path: 'playerLevel', model: dbconfig.collection_playerLevel}).then(
            function (player) {
                //console.log("After: player.playerLevel.value:", player.playerLevel.value);
                player.playerLevel.value.should.equal(originalPlayerLevelValue - 1);
            }
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

});