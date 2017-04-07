var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var ConsumptionService = require('../services/client/ClientServices').ConsumptionService;
var ClientConsumptionAPITest = require('../testAPI/clientAPITest/ClientConsumptionAPITest');

var PlayerService = require('../services/client/ClientServices').PlayerService;
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var GameService = require('../services/client/ClientServices').GameService;
var ClientGameAPITest = require('../testAPI/clientAPITest/ClientGameAPITest');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');

var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbGame = require('./../db_modules/dbGame');
var dbPlayerTopUpIntentRecord = require('../db_modules/dbPlayerTopUpIntentRecord');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');

var testPlayerName = null;
var consumeAmount = 250;

var testGameName = 'unitTestGame';

var testPlatformObjId = null;
var testPlatformId = null;

var testPlayerObjId = null;
var testPlayerId = null;

var testProviderId = null;
var testProviderObjId = null;

var testGameId = null;
var testGameObjId = null;

describe("Test Client API - Consumption Service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var consumptionService = new ConsumptionService();
    client.addService(consumptionService);
    var consumptionAPITest = new ClientConsumptionAPITest(consumptionService);

    var gameService = new GameService();
    client.addService(gameService);
    var gameAPITest = new ClientGameAPITest(gameService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    //// Init Consumption Data - Start ///////
    it('Should create test API player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {
                //console.log("createTestPlatform", data);
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                //console.log("createTestPlayer", data);
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test provider and game', function (done) {
        commonTestFun.createTestGameProvider().then(
            function (data) {
                testProviderObjId = data._id;
                testProviderId = data.providerId;
                return commonTestFun.createGame(testProviderObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameObjId = data._id;
                testGameId = data.gameId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    //todo::update the test code here
    //
    // it('Create consumption record  in the playerConsumption record', function () {
    //     var record = {
    //         name: testPlayerName,
    //         platformId: testPlatformId,
    //         gameId: testGameId,
    //         gameType: 'Casual',
    //         providerId: testProviderId,
    //         amount: consumeAmount
    //     };
    //
    //     return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(record).then(
    //         function (data) {
    //             data.amount.should.equal(consumeAmount);
    //
    //         }
    //     );
    // });
    //
    // it('Create second consumption record  in the playerConsumption record', function () {
    //     var record = {
    //         name: testPlayerName,
    //         platformId: testPlatformId,
    //         gameId: testGameId,
    //         gameType: 'Casual',
    //         providerId: testProviderId,
    //         amount: consumeAmount
    //     };
    //
    //     return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(record).then(
    //         function (data) {
    //             data.amount.should.equal(consumeAmount);
    //
    //         }
    //     );
    // });

    //// Init Consumption Data - End ///////


    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });


    it('Should login apiUser', function (done) {
        const testPlayerLoginData = {
            name: testPlayerName,
            password: "123456",
            lastLoginIp: "192.168.3.22",
            platformId: testPlatformId
        };
        clientPlayerAPITest.login(function (data) {
            //console.log("login", data);
            data.data.name.should.equal(testPlayerName);
            done();
        }, testPlayerLoginData);
    });


    it('Should get all last consumption records', function (done) {

        consumptionAPITest.getLastConsumptions(function (data) {
            //console.log("getLastConsumptions", data);
            data.status.should.equal(200);
            done();
        }, {
            playerId: testPlayerId,
            startIndex: 0,
            requestCount: 15
        });

    });

    it('Should search consumption records', function (done) {

        consumptionAPITest.search(function (data) {
            //console.log("Consumptionsearch", data);
            data.status.should.equal(200);
            done();
        }, {
            startTime: "2016-01-01",
            endTime: "2050-12-31",
            providerId: testProviderId,
            gameId: testGameId,
            startIndex: 0,
            requestCount: 15
        });
    });


    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });


});
