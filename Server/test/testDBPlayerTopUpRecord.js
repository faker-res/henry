var should = require('should');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');
var commonTestFun = require('../test_modules/commonTestFunc');
var dbconfig = require('../modules/dbproperties');
var mongoose = require('mongoose');

var Q = require("q");

describe("Test player top up record", function () {

    var testPlatformId = null;
    var testPlayerId = null;
    var consecutiveDays = 3;
    var minAmount = 1000;
    var topUpTimes = 2;
    var topUpDays = 3;
    var topUpAmount = 35;

    it('Should create test player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                return commonTestFun.createTestPlayer(testPlatformId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('test add test daily player top up record', function (done) {
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for( var j = 0; j < topUpDays; j++ ){
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            curDate.setDate( today.getDate() - (j+1) );

            for( var i = 0; i < topUpTimes; i++ ){
                curDate = new Date(curDate.getTime() + 1000);
                proms.push(dbPlayerTopUpRecord.createPlayerTopUpRecord(
                    {
                        playerId: testPlayerId,
                        platformId: testPlatformId,
                        amount: topUpAmount,
                        createTime: curDate,
                        paymentId: "testPayment",
                        currency: "USD",
                        topUpType: "VISA"
                    }
                ));
            }
        }

        Q.all(proms).then(
            function(data){

                if( data && data.length === (topUpTimes*topUpDays) ){
                    done();
                }
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('test get player last 5 top up record', function (done) {
        dbPlayerInfo.getPlayerLast5TopUpRecord(testPlayerId).then(
            function(data){
                if( data && data.length > 0 ){
                    done();
                }
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('test daily player top up summary task', function (done) {
        var proms = [];

        for( var i = 0; i < consecutiveDays; i++ ){
            var endTime = new Date();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate( endTime.getDate() - i );
            var startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i+1));
            proms.push(dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
        }
        Q.all(proms).then(
            function(data){
                if( data ){
                    done();
                }
            },
            function(error){
                done(error);
            }
        );
    });

    it('test player top up consecutive top up check', function (done) {
        var ObjectId = mongoose.Types.ObjectId;
        dbPlayerTopUpDaySummary.checkConsecutiveTopUpForPastDays(
            testPlayerId, testPlatformId, consecutiveDays, minAmount
        ).then(
            function(data){
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    // it('test player top up consecutive top up days', function (done) {
    //     var ObjectId = mongoose.Types.ObjectId;
    //     dbPlayerTopUpDaySummary.getConsecutiveTopUpDays(
    //         testPlayerId, testPlatformId, consecutiveDays, minAmount
    //     ).then(
    //         function(data){
    //             done();
    //         },
    //         function(error){
    //             console.error(error);
    //         }
    //     );
    // });

    it('test weekly player top up summary task', function () {
        var endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        endTime.setDate( endTime.getDate() );
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - 7);
        return dbPlayerTopUpWeekSummary.calculatePlatformWeekSummaryForTimeFrame(startTime, endTime, testPlatformId).then(
            () => dbPlayerTopUpWeekSummary.calculatePlatformWeekSummaryForTimeFrame(startTime, endTime, testPlatformId)
        ).then(
            function(data){
                // What should the actual results be?
                return dbconfig.collection_playerTopUpWeekSummary.find({playerId: testPlayerId, date: startTime}).then(
                    function (summaries) {
                        summaries.length.should.equal(1);
                        summaries[0].amount.should.equal(topUpDays * topUpTimes * topUpAmount);
                    }
                );
            }
        );
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformId, [testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformId, [], [testPlayerId]).then(function(data){
            done();
        })
    });



});
