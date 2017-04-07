var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var PlayerLevelService = require('../services/client/ClientServices').PlayerLevelService;
var PaymentService = require('../services/client/ClientServices').PaymentService;
var PlayerService = require('../services/client/ClientServices').PlayerService;

var ClientPlayerLevelAPITest = require('../testAPI/clientAPITest/ClientPlayerLevelAPITest');
var ClientPlayerPaymentAPITest = require('../testAPI/clientAPITest/ClientPaymentAPITest');
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');

var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testPlayerName = null;
var testChannelId = null;

describe("Test Client API - Player Level service", function () {

    if (env.mode === 'local') {
        console.warn("This test is disabled on 'local' machines.");
        // It has been failing on joey's machine ever since the paymentAPIUrl port changed.
        // Perhaps our office IP is blocked?
        return;
    }

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var playerLevelService = new PlayerLevelService();
    client.addService(playerLevelService);
    var clientPlayerLevelAPITest = new ClientPlayerLevelAPITest(playerLevelService);


    var paymentService = new PaymentService();
    client.addService(paymentService);
    var clientPlayerPaymentAPITest = new ClientPlayerPaymentAPITest(paymentService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    //// Init player Data - Start ///////
    it('Should create test API player and platform', function () {
        return commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
            }
        );
    });

    it('Should create test payment channel', function () {
        return commonTestFun.createTestPaymentChannel().then(
            function (data) {
                testChannelId = data.channelId;
            }
        );
    });
    // Init Player Data - End ///////

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
            data.data.name.should.equal(testPlayerName);
            done();
        }, testPlayerLoginData);
    });


    it('Should get a level of player', function (done) {
        clientPlayerLevelAPITest.getLevel(function (data) {
            //console.log("getLevel", data);
            done();
        });
    });

    it('Should create Online TopUp proposal', function (done) {
        clientPlayerPaymentAPITest.createOnlineTopupProposal(function (data) {
            console.log("createOnlineTopupProposal", data);
            //data.data.topupDetail.paymentURL.should.be.a.String();
            done();
        }, {
            //playerId: testPlayerId,
            //topUpAmount: 45,
            //topupChannel: testChannelId
            topupType: 1,
            amount: 300,
            merchantUseType: 1,
            clientType: 1,
        });
    });

    it('Should get TopUp list', function (done) {
        clientPlayerPaymentAPITest.getTopupList(function (data) {
            //console.log("getTopupList", data);
            done();
        },{
            topUpType: 1,
            startTime: "2016-01-01",
            endTime: "2016-12-31",
        });
    });

    it('Should request manual topup', function (done) {
        console.log("TODO: This test is currently disabled because the request to pmsAPI.payment_requestManualBankCard() was never responding.");
        return done();

        clientPlayerPaymentAPITest.requestManualTopup(function (data) {
            console.log("requestManualTopup", data);
            done();
        }, {
            //depositMoney: 250,
            //captcha : 'testCaptcha'
            amount: 250,
            bankTypeId: '003',
            depositMethod:'1',
            lastBankcardNo: '435',
            provinceId: '01',
            cityId: '03',
            districtId: '02'
        });
    });

    it('Should get province list', function (done) {
        clientPlayerPaymentAPITest.getProvinceList(function (data) {
            console.log("getProvinceList", data);
            //data.status.should.equal(200);
            //...
            done();
        }, {});
    });

    it('Should get city list', function (done) {
        console.log("TODO: This test is currently disabled because the remote responds with: 'Internal Error...' (and we never get called back)");
        return done();

        clientPlayerPaymentAPITest.getCityList(function (data) {
            console.log("getCityList", data);
            //data.status.should.equal(200);
            //...
            done();
        }, {
            provinceId: 1,
        });
    });

    it('Should get district list', function (done) {
        clientPlayerPaymentAPITest.getDistrictList(function (data) {
            console.log("getDistrictList", data);
            //data.status.should.equal(200);
            //...
            done();
        }, {
            provinceId: '01',
            cityId: '03',
        });
    });

    it('Should get bank type list', function (done) {
        clientPlayerPaymentAPITest.getBankTypeList(function (data) {
            console.log("getBankTypeList", data);
            //data.status.should.equal(200);
            //...
            done();
        }, {});
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

