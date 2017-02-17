var should = require('should');
var dbconfig = require('../modules/dbproperties');

var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardRule = require('../db_modules/dbRewardRule');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var consecutiveTopUpEvent = require('../scheduleTask/consecutiveTopUpEvent');
var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');
var dbProvider = require('../db_modules/dbGameProvider');
var dbRewardType = require('../db_modules/dbRewardType');
var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbGameProviderPlayerDaySummary = require('../db_modules/dbGameProviderPlayerDaySummary');

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");

var mongoose = require('mongoose');

var Q = require("q");

describe("Test weekly consecutive top up reward event", function () {

    var testPlatformId = mongoose.Types.ObjectId(process.env.PLATFORM);
    var testRewardTypeId = null;
    var testRewardEventId = null;

    var typeName = constProposalType.FULL_ATTENDANCE;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testPlayersId = [];
    var testPlayerNum = 3;
    var topUpTimes = 3;
    var minAmount = 100;
    var numOfDays = 3;
    var topUpDays = 3;
    var rewardAmount = 100;
    var spendingAmount = 300;
    var topUpAmount = 50;
    var consumeAmount = 500;

    var testGameId = null;
    var testGameType = null;

    var test1GameId = null;
    var test1GameType = null;

    var testGame2Id = null;
    var testGame2Type = null;
    var consumeTimesForTestGame1 = 1;
    var consumeTimesForTestGame2 = 2;
    var consumeTimes = consumeTimesForTestGame1 + consumeTimesForTestGame2;
    var consumeDays = 3;
    var consumeAmount = 500;

    var testProviderId = null;
    var test1ProviderId = null;

    var testPlayerSId = [];
    var testPlatformSId = null;
    var testProviderSId = null;
    var testGameSId = null;

    var test1ProviderSId = null;
    var test1GameSId = null;

    var date = new Date().getTime();

    it('Should get weekly consecutive top up proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformId, name: typeName});
        Q.all([typeProm, typeProcessProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    data[0].name.should.equal(typeName);
                    data[1].name.should.equal(typeName);
                    proposalTypeId = data[0]._id;
                    proposalTypeProcessId = data[1]._id;
                    done();
                }
                else {
                    console.log(data);
                }
            }
        ).catch(
            function (error) {
                console.log(error);
            }
        );
    });

    it('get test reward type', function (done) {
        dbRewardType.getRewardType({name: constRewardType.FULL_ATTENDANCE}).then(
            function(data){
                testRewardTypeId = data._id;
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('create provider and game', function (done) {
        var date = new Date().getTime();

        var providerData = {
            name: "testGameProvider" + date,
            nickName: "Froggy Games",
            code: "FGXN" + date,
            providerId: date
        };
        dbProvider.createGameProvider(providerData).then(
            function (data) {
                testProviderId = data._id;
                testProviderSId = data.providerId;
                var gameData = {
                    name: "testGame" + date,
                    type: testGameTypes.CARD,
                    provider: testProviderId,
                    code: "testGame" + date
                };
                return dbGame.createGame(gameData);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId = data._id;
                testGameSId = data.gameId;
                testGameType = data.type;
                console.log( testProviderId, testGameId );
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create second provider and game', function (done) {
        var date = new Date().getTime();

        var providerData = {
            name: "testGameProvider" + date,
            nickName: "Froggy Games",
            code: "FGXN" + date,
            providerId: date
        };
        dbProvider.createGameProvider(providerData).then(
            function (data) {
                test1ProviderId = data._id;
                test1ProviderSId = data.providerId;
                var gameData = {
                    name: "testGame" + date,
                    type: testGameTypes.CARD,
                    provider: test1ProviderId,
                    code: "testGame" + date,
                };
                return dbGame.createGame(gameData);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                test1GameId = data._id;
                test1GameSId = data.gameId;
                test1GameType = data.type;
                console.log( test1ProviderId, test1GameId );
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create test platform reward event', function (done) {
        var date = new Date();
        var eventName = "testEvent" + date.getTime();

        var eventData = {
            name: eventName,
            platform: testPlatformId,
            type: testRewardTypeId,
            code: 1,
            param: {
                checkTopUp: true,
                numOfTopUpDays: numOfDays,
                minTopUpAmount: minAmount,
                checkConsumption : true,
                numOfConsumeDays: consumeDays,
                minConsumeAmount: consumeAmount,

                andProvider: true,
                providers: [
                    {providerObjId: testProviderId, games: [testGameId]},
                    {providerObjId: test1ProviderId, games: [test1GameId]}
                ],

                rewardAmount: rewardAmount,
                spendingAmount: spendingAmount
            },
            executeProposal: proposalTypeId
        };
        dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventId = data._id;
                done();
            },
            function (error) {
                console.error(error);
                console.error(error.error);
            }
        );
    });

});
