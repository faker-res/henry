var Q = require("q");
var should = require('should');

var dbconfig = require('./../modules/dbproperties');

var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require('../db_modules/dbPlayerLevel');
var dbPlatform = require('../db_modules/dbPlatform');

var dbRewardRule = require('../db_modules/dbRewardRule');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var dbRewardType = require('../db_modules/dbRewardType');

var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');

var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');

var playerSummary = require("../scheduleTask/playerSummary");
var consumptionReturnEvent = require("../scheduleTask/consumptionReturnEvent");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");
var commonTestActions = require("./../test_modules/commonTestActions.js");
var rewardEventGenerator = require("./../test_modules/rewardEventGenerator.js");
var dataGenerator = require("./../test_modules/dataGenerator.js");
var dbutility = require('./../modules/dbutility');

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var commonTestFun = require('../test_modules/commonTestFunc');

describe("Test consumption return reward event", function () {

    var playerConsumptionReturnRewardEventData;

    var testPlayerLevels = [];
    var testPlayersId = [];
    var testPlayersPlayerId = [];
    var testPlayerNum = 3;

    var testGameId = null;
    var testGameType = null;

    var testGame2Id = null;
    var testGame2Type = null;

    var consumeTimesForTestGame1 = 1;
    var consumeTimesForTestGame2 = 2;
    var consumeTimes = consumeTimesForTestGame1 + consumeTimesForTestGame2;
    var consumeDays = 3;
    var consumeAmount = 500;

    var testGame1NormalRewardRatio; // card
    var testGame2NormalRewardRatio; // casual

    var expectedCreditForBothGameTypes;

    var date = new Date().getTime();

    var testPlatformId = null;
    var testRewardTypeId = null;

    var generatedData = {};

    it('Should create test API platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create player consumption return reward event', function () {
        return rewardEventGenerator.createPlayerConsumptionReturnRewardEvent(testPlatformId, generatedData);
    });

    it('get player levels info', function (done) {
        dbPlayerLevel.getPlayerLevel({platform: testPlatformId}).then(
            function(data){
                if( data ){
                    for( var i = 0; i< data.length; i++ ){
                        testPlayerLevels.push(data[i]._id);
                    }
                    done();
                }
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('create test player', function (done) {
        var proms = [];
        var date = new Date();
        for( var i = 0; i < testPlayerNum; i++ ){
            var playerData = {
                name: "testpayer"+ i + date.getTime(),
                platform: testPlatformId,
                password: "123",
                playerLevel: testPlayerLevels[i%testPlayerLevels.length],
                phoneNumber: "11111111" + i,
            };
            proms.push( dbPlayerInfo.createPlayerInfo(playerData) );
        }

        Q.all(proms).then(
            function(data){
                if( data ){
                    for( var j = 0; j < data.length; j++ ){
                        testPlayersId.push(ObjectId(data[j]._id));
                        testPlayersPlayerId.push(data[j].playerId);
                    }
                    done();
                }
            }
        );
    });

    it('Should create test game', function () {
        var gameData = {
            name: "testGame" + date,
            type: testGameTypes.CARD,
            code: "testGame" + date,
            gameId: date
        };
        return dbGame.createGame(gameData).then(
            function (data) {
                testGameId = data._id;
                testGameType = data.type;
                testGame1NormalRewardRatio = generatedData.playerConsumptionReturnRewardEventData.param.ratio[0][gameData.type];   // 0.02
            }
        );
    });

    it('Should create test game 2', function (done) {
        var curDate = new Date().getTime();
        var gameData = {
            name: "testGame" + curDate,
            type: testGameTypes.CASUAL,
            code: "testGame" + curDate,
            gameId: curDate
        };
        dbGame.createGame(gameData).then(
            function (data) {
                testGame2Id = data._id;
                testGame2Type = data.type;
                testGame2NormalRewardRatio = generatedData.playerConsumptionReturnRewardEventData.param.ratio[0][gameData.type];   // 0.01
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('test add test daily player consumption record', function (done) {
        this.timeout(20000);
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for( var k = 0; k < testPlayersId.length; k++ ){
            for( var j = 0; j < consumeDays; j++ ) {
                var curDate = new Date();
                curDate.setHours(0, 0, 0, 0);
                curDate.setDate( today.getDate() - (j) );
                for (var i = 0; i < consumeTimes; i++) {
                    curDate = new Date(curDate.getTime() + 1000);
                    proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                        {
                            playerId: testPlayersId[k],
                            platformId: testPlatformId,
                            gameId: i < consumeTimesForTestGame1 ? testGameId : testGame2Id,
                            gameType: i < consumeTimesForTestGame1 ? testGameType : testGame2Type,
                            amount: consumeAmount,
                            validAmount: consumeAmount,
                            createTime: curDate,
                            orderNo: new Date().getTime()+Math.random(),
                        }
                    ));
                }
            }
        }

        Q.all(proms).then(
            function(data){
                // data = undefined;
                // data.length = 999;
                data.length.should.equal( consumeTimes * consumeDays * testPlayersId.length );
                //setTimeout(done, 3000);
                done();
            }
        ).catch(done);
    });

    it('test daily player consumption summary task', function () {
        return commonTestActions.calculatePlatformDaySummaryForPastDays(consumeDays, testPlatformId);
    });
    
    it('test daily player game type consumption summary task', function (done) {
        var proms = [];
    
        for (var i = 0; i < consumeDays; i++) {
            var endTime = new Date();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            var startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            // proms.push(dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
            proms.push(dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
        }
        Q.all(proms).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                console.error(error);
            }
        );
    });
    
    it('test weekly player consumption summary task', function () {
        return playerSummary.calculateLastWeekPlayerConsumptionSummary(testPlatformId).then(
            function (data) {
                data.should.not.equal(undefined);
            }
        );
    });
    
    // it('test weekly player game type consumption summary task', function () {
    //     return playerSummary.calculateLastWeekPlayerGameTypeConsumptionSummary(testPlatformId).then(
    //         function (data) {
    //             data.should.not.equal(undefined);
    //         }
    //     );
    // });

    it('Should get consume rebate amount', function () {
        if (dbutility.isCurrentSGTimePassed12PM()) {
            return true;
        }
        return dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturn(testPlayersPlayerId[1]).then(
            function (playerConsumptionReturn) {
                //console.log("playerConsumptionReturn:", playerConsumptionReturn);
                playerConsumptionReturn.should.have.property('totalAmount');
                playerConsumptionReturn.totalAmount.should.be.a.Number;
                playerConsumptionReturn.totalAmount.should.be.greaterThan(0);
                playerConsumptionReturn.should.have.property(testGame2Type);
                playerConsumptionReturn[testGame2Type].consumptionAmount.should.be.greaterThan(0);
                playerConsumptionReturn[testGame2Type].ratio.should.be.greaterThan(0);
                playerConsumptionReturn[testGame2Type].returnAmount.should.be.greaterThan(0);
            }
        );
    });

    it('test consumption return event', function () {
        return consumptionReturnEvent.checkPlatformWeeklyConsumptionReturnEvent(testPlatformId).then(
            function (data) {
                data.should.not.equal(undefined);
            }
        );
    });

    it('test consumption return event result', function () {
        var expectedCreditForTestGame1 = consumeAmount * 1 * consumeTimesForTestGame1 * testGame1NormalRewardRatio;
        var expectedCreditForTestGame2 = consumeAmount * 1 * consumeTimesForTestGame2 * testGame2NormalRewardRatio;
        expectedCreditForBothGameTypes = Math.round((expectedCreditForTestGame1 + expectedCreditForTestGame2) * 1000000) / 1000000;   // Fix minute rounding errors
        return dbconfig.collection_players.find({_id: testPlayersId[1]}).then(
            function (data) {
                data.length.should.equal(1);
                data[0].validCredit.should.equal(expectedCreditForBothGameTypes);
            }
        );
    });

    it('should mark all consumptionSummaries as dirty', function () {
        // No longer applies now we are removing dirty records
        //var expected1 = dbconfig.collection_playerConsumptionSummary.find({platformId: testPlatformId, bDirty: true}).then(
        //    function (records) {
        //        records.length.should.equal(testPlayerNum * 2);   // One record per player per gametype
        //    }
        //);
        var expected1 = Q.resolve();

        var expected2 = dbconfig.collection_playerConsumptionSummary.find({platformId: testPlatformId, bDirty: false}).then(
            function (records) {
                // The assertion below occasionally fails, saying 1 dirty record was found!
                // I think it may be a timing issue.  It only happens on my first test run, and not if I run again.
                // How can we test what is going on here?

                // if (records.length > 0) {
                //     console.warn('Unexpected dirty record(s):', records);
                // }

                records.length.should.equal((consumeDays-1)*testPlayersId.length*2);
            }
        );

        return Q.all([expected1, expected2]);
    });

    it('test add test daily player consumption record', function (done) {
        this.timeout(9000);
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for( var k = 0; k < testPlayersId.length; k++ ){
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            // curDate.setDate( today.getDate() - (j+1) );
            for( var j = 0; j < consumeDays; j++ ) {
                for (var i = 0; i < consumeTimes; i++) {
                    curDate = new Date(curDate.getTime() + 1000);
                    proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                        {
                            playerId: testPlayersId[k],
                            platformId: testPlatformId,
                            gameId: i < consumeTimesForTestGame1 ? testGameId : testGame2Id,
                            gameType: i < consumeTimesForTestGame1 ? testGameType : testGame2Type,
                            amount: consumeAmount,
                            orderNo: new Date().getTime()+Math.random(),
                            createTime: curDate
                        }
                    ));
                }
            }
        }

        Q.all(proms).then(
            function(data){
                data.length.should.equal( consumeTimes * consumeDays * testPlayersId.length );
                done();
                //setTimeout(done, 3000);
            }
        ).catch(done);
    });

    it('test player consumption return', function () {
        return dbPlayerConsumptionWeekSummary.startCalculatePlayerConsumptionReturn(testPlayersPlayerId[1]).then(
            function (data) {
            //    console.log("\n\n\n\n\n finally",data);
            },
            function (error){
            }
        );
    });

    it('test consumption return event result', function () {
        return dbconfig.collection_players.findOne({_id: testPlayersId[1]}).then(
            function(data){
                // 1 for the earlier platform consumption calculation, and 1 for this player consumption calculation
                data.validCredit.should.equal(expectedCreditForBothGameTypes);
            }
        );
    });

    it('Clear Consumption Data', function () {
        dataGenerator.clearConsumptionData(generatedData);
    });

    // it('Clear Consumption Data', function () {
    //     rewardEventGenerator.clearConsumptionData(generatedData);
    // });

    it('Should remove  test Data', function(done){
        commonTestFun.removeTestData(testPlatformId, testPlayersId).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([],testPlatformId, [], testPlayersId).then(function(data){
            done();
        })
    });

});
