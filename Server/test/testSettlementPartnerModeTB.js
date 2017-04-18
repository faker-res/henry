"use strict";

let should = require('should');

let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");

let dbPartner = require('../db_modules/dbPartner');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');

let dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');

describe("Test Partner Commission Settlement TB Mode", () => {
    let partnerTreeConfig = {
        topLevelPartners: 1,
        depth: 1,
        childrenPerPartner: 0,
        playersPerPartner: 3
    };

    let generatedData = {};

    it('creates test player, platform, games', function () {
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData);
    });

    it('creates a tree of partners, with players', function () {
        partnerTreeConfig.generatedData = generatedData;
        return dataGenerator.createPartnerTree(partnerTreeConfig);
    });

    it('Topup all players', () => {
        let proms = [];
        let playerObjIds = [];
        let endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        endTime.setDate(endTime.getDate() + 1);
        let startTime = new Date();
        startTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - 1);

        return dbPlayerInfo.getPlayersByPlatform(generatedData.testPlatformId, 10)
        .then(
            players => {
                players.map(
                    player => {
                        playerObjIds.push(player._id);
                        proms.push(commonTestFun.createTopUpRecord(player._id, generatedData.testPlatformId));
                    }
                );

                return Promise.all(proms);
            }
        )
    });

    it ('should create a partner commission config', () => {
        return dbPartner.createPartnerCommissionConfig(generatedData.testPlatformId);
    });

    it ('should set the platform settlemode as TB', () => {
        return dbPartner.updatePartnerCommissionLevel({platform: generatedData.testPlatformId}, {
            settlementMode: 'TB',
            commissionLevelConfig: [{
                value: 1,
                maxProfitAmount: 100000000,
                commissionRate: 0.4,
                minProfitAmount: 100,
                minActivePlayer: 3
            }]
        });
    });

    it('start platform daily settlement', function () {
        this.timeout(15*60*1000);
        return dailyPlatformSettlement.calculateTodayPlatformSettlement(generatedData.testPlatformId);
    });

    it ('perform platform settlement', () => {
        return dbPartner.startPlatformPartnerCommissionSettlement(generatedData.testPlatformId, true, true);
    });

    it ('check partner commission amount', () => {
        dbPartner.getPartnersByPlatform(generatedData.testPlatformId)
        .then(
            data => {
                data[1].credits.should.equal(600);
            }
        )
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
