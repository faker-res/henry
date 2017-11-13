"use strict";

require('../test_modules/improveMochaReporting')();
let should = require('should');
let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");
let dbConfig = require('../modules/dbproperties');
let dbRewardTask = require("../db_modules/dbRewardTask");

describe("Test Platform Manual Unlock Player Reward", function () {

    let rewardAmount = 10000000;
    let generatedData = {};
    let originalPlayerValidCredit, taskDataToUnlock;

    it('creates test player, platform, games', function () {
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData);
    });

    it('check player valid credit before', function () {
        return dbConfig.collection_players.findOne({_id: generatedData.testPlayerId}).select('lockedCredit').then(
            (player) => {
                originalPlayerValidCredit = player.validCredit;
                player.lockedCredit.should.equal(0);
            }
        );
    });

    it('create reward task for player', function () {
        return dbRewardTask.createRewardTask(
            {
                playerId: generatedData.testPlayerId,
                platformId: generatedData.testPlatformId,
                initAmount: rewardAmount,
                currentAmount: rewardAmount,
                requiredBonusAmount: rewardAmount
            }
        );
    });

    // it('check player locked credit after', function () {
    //     return dbConfig.collection_players.findOne({_id: generatedData.testPlayerId}).select('lockedCredit').then(
    //         (player) => {
    //             player.lockedCredit.should.equal(rewardAmount);
    //         }
    //     );
    // });

    it('find reward task for selected player', function () {
        return dbRewardTask.getPlayerCurRewardTask(generatedData.testPlayerId).then(
            (taskData) => {
                taskDataToUnlock = taskData;
                taskDataToUnlock.should.be.ok;
        })
    });

    it('manual complete reward task', function () {
        return dbRewardTask.completeRewardTask(taskDataToUnlock).then((currentAmount) => {
            currentAmount.should.be.equal(rewardAmount);
        })
    });

    // it('check player credit is as expected', function () {
    //     return dbConfig.collection_players.findOne({_id: generatedData.testPlayerId}).select('lockedCredit validCredit').then(
    //         (player) => {
    //             player.lockedCredit.should.equal(0);
    //             player.validCredit.should.equal(rewardAmount);
    //         }
    //     );
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
});