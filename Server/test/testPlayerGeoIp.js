/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2017 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

require('../test_modules/improveMochaReporting')();
let should = require('should');
let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");
let dbConfig = require('../modules/dbproperties');

let dbGeoIp = require('./../db_modules/dbGeoIp');
let dbPlatform = require('./../db_modules/dbPlatform');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');

describe("Test Player Geo Ip", function () {

    let ipTest = "1.180.233.173";
    let locationData = {};
    let generatedData = {};
    let playerLastLoginIp = "";

    it('creates test player, platform, games', function () {
        return dataGenerator.createTestPlayerPlatformAndGames(generatedData);
    });

    it('check player last login IP', function () {
        return dbConfig.collection_players.findOne({_id: generatedData.testPlayerId}).select('lastLoginIp').then(
            (player) => {
                playerLastLoginIp = player.lastLoginIp;
                player.lastLoginIp.should.equal(ipTest);
            }
        );
    });

    it('should return correct location', () => {
        return dbGeoIp.lookup(playerLastLoginIp).then(
            (locData) => {
                locationData = locData;
                locationData.logitude.should.equal(111.670801);
                locationData.latitude.should.equal(40.818311);
            });
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
        commonTestFun.removeTestProposalData([],generatedData.testPlatformId, [], [generatedData.testPlayerId]).then(function(data){
            done();
        })
    });
});