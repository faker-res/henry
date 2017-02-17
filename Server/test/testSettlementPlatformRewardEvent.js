/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var should = require('should');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardType = require('../db_modules/dbRewardType');
var constRewardType = require('../const/constRewardType');
var weeklyPlatformSettlement = require('../scheduleTask/weeklyPlatformSettlement');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');

var Q = require("q");
var rewardEventGenerator = require("./../test_modules/rewardEventGenerator.js");
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test platform reward event settlement", function () {

    var testPlatformId = null;
    var testPlatformSId = null;

    var topUpTimes = 3;
    var minAmount = 100;
    var numOfDays = 3;
    var topUpDays = 3;
    var rewardAmount = 100;
    var spendingAmount = 300;
    var topUpAmount = 50;
    var consumeAmount = 500;
    var consumeDays = 3;


    it('Should create test API platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                testPlatformSId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create full attendance reward event', function () {
        var consumptionConfig = {
            consumeDays: consumeDays,
            consumeAmount: consumeAmount
        };

        var topUpConfig = {
            //consecutiveDays: 3,
            minAmount: minAmount,
            numOfDays: numOfDays,
            topUpTimes: topUpTimes,
            topUpDays: topUpDays,
            topUpAmount: topUpAmount
        };

        return rewardEventGenerator.createFullAttendanceRewardEvent(testPlatformId, topUpConfig, consumptionConfig, rewardAmount, spendingAmount);
    });

    it('create player consumption return reward event', function () {
        return rewardEventGenerator.createPlayerConsumptionReturnRewardEvent(testPlatformId);
    });

    it('start test platform reward event settlement', function (done) {
        weeklyPlatformSettlement.startWeeklyPlatformRewardEventSettlement(testPlatformId).then(
            function(data){
                //console.log(data);
                done();
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, []).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([] , testPlatformId, [], []).then(function(data){
            done();
        })
    });

});