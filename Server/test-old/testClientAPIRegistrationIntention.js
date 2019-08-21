var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
var ClientRegistrationIntentionAPITest = require('../testAPI/clientAPITest/ClientRegistrationIntentionAPITest');

var PlayerService = require('../services/client/ClientServices').PlayerService;
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');
var constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus");
var testPlatformName = 'unittestPlayerApi_platformName';
var testPaymentChannelName = 'unittestPaymentChannelName';

var testPlayerName = null;
var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testChannelId = null;
var testRegistrationIntentionId = null;

describe("Test Client API - Consumption Service", function () {
    //to be fix
    return true;


    var client = new WebSocketClient(env.clientAPIServerUrl);

    var registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);
    var clientRegistrationIntentionAPITest = new ClientRegistrationIntentionAPITest(registrationIntentionService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    ////////////// Init data - Start //////////////

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
    ////////////// Init data - end //////////////


    it('Should create a test registration intention record', function (done) {
        clientRegistrationIntentionAPITest.add(function (data) {
            testRegistrationIntentionId = data.data._id;
            data.status.should.equal(200);
            done();
        }, {
            name: "testRegistrationIntentionPlayer",
            realName: "testPlayer",
            status: constRegistrationIntentRecordStatus.INTENT,
            platformId: testPlatformId
        });
    });

    it('Should update a test registration intention record', function (done) {
            clientRegistrationIntentionAPITest.update(function (data) {
                data.status.should.equal(200);
                done();
            }, {
                id: testRegistrationIntentionId ,
                status: constRegistrationIntentRecordStatus.SUCCESS
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