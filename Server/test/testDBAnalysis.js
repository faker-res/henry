/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
'use strict';

var should = require('should');
var Q = require('q');
var commonTestFunc = require('../test_modules/commonTestFunc');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLoginRecord = require('../db_modules/dbPlayerLoginRecord');

describe("Test Analysis", function () {

    var testPlatformObjId = null;
    var testPlatformId = null;
    var testPlayerCount = 10;
    var testPlayerNames = [];

    it('create test data', function () {
        return commonTestFunc.createTestPlatform().then(
            platformData => {
                testPlatformObjId = platformData._id;
                testPlatformId = platformData.platformId;
                var proms = [];
                for( let i = 0; i < testPlayerCount; i++ ){
                    proms.push(commonTestFunc.createTestPlayer(testPlatformObjId));
                }
                return Q.all(proms);
            }
        ).then(
            playerData => {
                playerData.forEach(
                    player => {
                        testPlayerNames.push(player.name);
                    }
                );
            }
        );
    });

    it('should create player login data', function () {
        var proms = [];
        for( let i = 0; i < testPlayerCount; i++ ){
            var playerData = {
                platformId: testPlatformId,
                name: testPlayerNames[i],
                password: "123456"
            };
            proms.push( dbPlayerInfo.playerLogin(playerData, {browser: "", device: "", os: ""}) );
        }
        return Q.all(proms);
    });

    it('should test player login analysis', function () {
        return dbPlayerLoginRecord.countLoginPlayerbyPlatform(testPlatformObjId).then(
            data => {
                console.log(data, data);
            }
        );
    });


    it('Should remove all test Data', function(){
        return commonTestFunc.removeTestData(testPlatformObjId, []).then(
            data => {
               // console.log(data, data);
            });
    });

    it('Should remove all test proposal Data', function(){
        return commonTestFunc.removeTestProposalData([] , testPlatformObjId, [], null).then(
            data => {
                // console.log(data, data);
            });
    });

});