var should = require('should');
var dbPartnerLevel = require('../db_modules/dbPartnerLevel');
var dbPartner = require('../db_modules/dbPartner');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbGame = require('../db_modules/dbGame');
var dbGameProvider = require('../db_modules/dbGameProvider');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');

var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');

var dbGameProviderDaySummary = require('../db_modules/dbGameProviderDaySummary');
var dbGameProviderPlayerDaySummary = require('../db_modules/dbGameProviderPlayerDaySummary');

var dbconfig = require('../modules/dbproperties');

var testGameTypes = require("../test/testGameTypes");
// var playerSummary = require("../scheduleTask/playerSummary");
// var partnerSummary = require("../scheduleTask/partnerSummary");
// var providerSummary = require("../scheduleTask/providerSummary");

var commonTestActions = require("./../test_modules/commonTestActions.js");
var commonTestFunc = require('../test_modules/commonTestFunc');
var Q = require("q");

describe("Test game provider summary settlement", function () {

    var testPlatformId = null;
    var testPartnerId = null;
    var testPlayerId = null;

    var testGameProviderId = null;

    var testGameId = null;
    var testGameType = null;

    var testGame2Id = null;
    var testGame2Type = null;

    var consumeTimes = 3;
    var consumeDays = 3;

    var consumeAmount = 505;

    var date = new Date();

    it('Should create test API player and platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformId = data._id;
                return commonTestFunc.createTestPlayer(testPlatformId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });
    it('Should create test provider and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testGameProviderId = data._id;
                //testProviderId = data.providerId;
                return commonTestFunc.createGame(testGameProviderId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId = data._id;
                testGameType = data.type;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test game 2', function (done) {
        commonTestFunc.createGame(testGameProviderId).then(
            function (data) {
                testGame2Id = data._id;
                testGame2Type = data.type;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('test add test daily player consumption record', function (done) {
        this.timeout(5000);
        var proms = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var j = 0; j < consumeDays; j++) {
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            curDate.setDate(today.getDate() - (j + 1));

            for (var i = 0; i < consumeTimes; i++) {
                curDate = new Date(curDate.getTime() + 1000);
                proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(
                    {
                        playerId: testPlayerId,
                        platformId: testPlatformId,
                        providerId: testGameProviderId,
                        gameId: i > 0 ? testGame2Id : testGameId,
                        gameType: i > 0 ? testGame2Type : testGameType,
                        amount: consumeAmount,
                        createTime: curDate,
                        orderNo: new Date().getTime()+Math.random()
                    }
                ));
            }
        }

        Q.all(proms).then(
            function (data) {
                if (data && data.length === (consumeTimes * consumeDays)) {
                    done();
                }
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('test daily provider player summary task', function () {
        return commonTestActions.calculateProviderPlayerDaySummaryForPastDays(consumeDays, testGameProviderId);
    });

    it('test daily provider summary task', function () {
        return commonTestActions.calculateProviderDaySummaryForPastDays(consumeDays, testGameProviderId);
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId ,[testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([] , testPlatformId, [], [testPlayerId]).then(function(data){
            done();
        })
    });


});
