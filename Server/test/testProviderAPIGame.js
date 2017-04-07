var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');

var GameService = require('../services/provider/ProviderServices').GameService;
var GameAPITest = require('../testAPI/providerAPITest/GameAPITest');

var ConsumptionService = require('../services/provider/ProviderServices').ConsumptionService;
var ConsumptionAPITest = require('../testAPI/providerAPITest/ConsumptionAPITest');

var ConnectionService = require('../services/provider/ProviderServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/providerAPITest/ConnectionAPITest');

var constGameStatus = require("./../const/constGameStatus");
var commonTestFunc = require('../test_modules/commonTestFunc');
var env = require("../config/env").config();

var testPlayerId = null;
var testPlayerObjId = null;
var testPlayerName = null;

var testPlatformObjId = null;
var testPlatformId = null;

var testProviderId = null;
var testProviderObjId = null;

var testGameId = null;
var testGameName = 'testGameName';

describe("Test Provider API - Game Service", function () {

    var client = new WebSocketClient(env.providerAPIServerUrl);

    var gameService = new GameService();
    client.addService(gameService);
    var gameAPITest = new GameAPITest(gameService);

    var consumptionService = new ConsumptionService();
    client.addService(consumptionService);
    var consumptionAPITest = new  ConsumptionAPITest(consumptionService);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);

    var gameCode = '';

    it('Should create test API player and platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFunc.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
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

    it('Should create test provider', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testProviderObjId = data._id;
                testProviderId = data.providerId;
                done();
            },
            function (error) {
                console.error(error);
            });
    });

    it('Should add provider to the platform', function(done){

        commonTestFunc.updatePlatform({_id:testPlatformObjId}, { $set: {gameProviders: testProviderObjId}}).then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });

    it('Should login apiUser', function (done) {
        connectionAPITest.login(function (data) {
            done();
        });
    });

    //todo::refactor the test here
    // it('Should create a test game', function (done) {
    //     var date = new Date();
    //     gameAPITest.add(function (data) {
    //         data.status.should.equal(200);
    //         testGameId = data.data.gameId;
    //         //console.log("add", data);
    //         gameCode = data.data.code;
    //         done();
    //     }, {
    //         providerId: testProviderId,
    //         name: testGameName + date.getTime(),
    //         type: 'Casual',
    //         code: testGameName + date.getTime()
    //     });
    // });
    //
    //
    // it('Should update a test game', function (done) {
    //
    //     gameAPITest.update(function (data) {
    //         data.data.code.should.equal(gameCode);
    //         //console.log("update", data);
    //         done();
    //     }, {code: gameCode, title: "Ninja Game"});
    // });
    //
    //
    // it('Should change status of a test game', function (done) {
    //     gameAPITest.changeStatus(function (data) {
    //         //console.log("changeStatus", data);
    //         data.data.code.should.equal(gameCode);
    //         done();
    //     }, {code: gameCode, status: constGameStatus.MAINTENANCE});
    // });

     //it('Should transfer in credit', function (done) {
     //        consumptionAPITest.transferIn(function(data){
     //           console.log("transferIn", data);
     //            done();
     //        }, {playerId: testPlayerId, providerId: testProviderId, amount: 450});
     //
     //    });

     //it('Should transfer out credit', function (done) {
     //        consumptionAPITest.transferOut(function(data){
     //            console.log("transferOut", data);
     //            done();
     //        }, {playerId: testPlayerId, providerId: testProviderId});
     //
     //    });

    //todo::refactor the test here
    // it('Should add Consumption', function (done) {
    //     consumptionAPITest.addConsumption(function(data){
    //             data.status.should.equal(200);
    //             done();
    //         }, {
    //             name: testPlayerName,
    //             platformId : testPlatformId,
    //             providerId : testProviderId,
    //             gameId : testGameId,
    //             amount: 240,
    //             validAmount: 240
    //         });
    //
    //     });
    //
    // it('Should delete a test game', function (done) {
    //     gameAPITest.delete(function (data) {
    //         data.status.should.equal(200);
    //         done();
    //     }, {code: gameCode});
    // });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });

});
