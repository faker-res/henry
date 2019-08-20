/**
 * Created by hninpwinttin on 5/5/16.
 */

var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');

var TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
var ClientTopUpIntentionAPITest = require('../testAPI/clientAPITest/ClientTopUpIntentionAPITest');

var PlayerService = require('../services/client/ClientServices').PlayerService;
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var commonTestFun = require('../test_modules/commonTestFunc');

var env = require("../config/env").config();
var dbconfig = require('../modules/dbproperties');

var testPlatformName = 'unittestPlayerApi_platformName';

var testPlayerName = null;
var testPaymentChannelName = 'unittestPaymentChannelName';

var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testChannelId = null;
var testPaymentIntentionId = null;

describe("Test Client API - Consumption Service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var topUpIntentionService = new TopUpIntentionService();
    client.addService(topUpIntentionService);
    var clientTopUpIntentionAPITest = new ClientTopUpIntentionAPITest(topUpIntentionService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    ////////////// Init Data Start ////////////

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

    it('Should create test payment channel', function (done) {

        commonTestFun.createTestPaymentChannel().then(
            function (data) {
                if (data && data.channelId) {
                    testChannelId = data.channelId;
                    done();
                }
            },
            function (error) {
                console.log({error: error});
            }
        );
    });

    //////////////// Init Data End //////////////

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


    it('Should create a test top up intention record', function (done) {
        var topUpIntentionData = {
            playerId: testPlayerId,
            topUpAmount: 100,
            topupChannel: testChannelId,
            platformId: testPlatformId
        };
        clientTopUpIntentionAPITest.add (function (data) {
            testPaymentIntentionId = data.data._id;
            data.status.should.equal(200);
            done();
        },topUpIntentionData);
    });

    it('Should update a test top up intention record', function (done) {
        clientTopUpIntentionAPITest.update(function (data) {
            data.status.should.equal(200);
            done();
        },{
            _id: testPaymentIntentionId,
            topUpAmount: 150
        });
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test proposal data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });
});