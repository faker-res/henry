/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var GameService = require('../services/client/ClientServices').GameService;
var ClientGameAPITest = require('../testAPI/clientAPITest/ClientGameAPITest');

var PlayerService = require('../services/client/ClientServices').PlayerService;
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var commonTestFun = require('../test_modules/commonTestFunc');
var env = require("../config/env").config();

var testPlayerId = null;
var testPlayerObjId = null;

var testPlatformObjId = null; // _id
var testPlatformId = null; // platformId

var testProviderId = null;
var testProviderObjId = null;
var testGameId = null;
var testGameObjId = null;

var testPlayerName = null;

describe("Test Client API - Game Service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var gameService = new GameService();
    client.addService(gameService);
    var gameAPITest = new ClientGameAPITest(gameService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    it('Should create test API player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
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

    //// Init  Data - Start ///////
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
            done();
        }, testPlayerLoginData);
    });
    //// Init Data - End ///////

    it('Should get all game types', function (done) {
        gameAPITest.getGameTypeList(function (data) {
                //console.log("getGameTypeList", data);
                done();
            });
    });


    it('Should get game list', function (done) {
        gameAPITest.getGameList(function (data) {

            data.status.should.equal(200);
            done();
        }, {providerId:testProviderId , index: 0, count:5});
    });


    it('Should get provider list', function (done) {
        gameAPITest.getProviderList(function (data) {
               data.status.should.equal(200);
               done();
            },{playerId:testPlayerId });
    });


    it('Should get transfer in player credit', function (done) {
        gameAPITest.transferToProvider(function (data) {
                //console.log("transferToProvider",data);
                done();
            });
    });


    it('Should transfer out player credit', function (done) {
        gameAPITest.transferFromProvider(function (data) {
                 //console.log("transferFromProvider",data);
                done();
            });

    });

    //todo::fix this test 
    // it('Should get game provider credit', function (done) {
    //     gameAPITest.getGameProviderCredit(function (data) {
    //             data.status.should.equal(200);
    //             done();
    //         }, {providerId:testProviderId});
    //
    // });

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

