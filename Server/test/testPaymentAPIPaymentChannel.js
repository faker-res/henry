var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var PaymentChannelService = require('../services/payment/PaymentServices').PaymentChannelService;
var PaymentChannelAPITest = require('../testAPI/paymentAPITest/PaymentChannelAPITest');

var ConnectionService = require('../services/provider/ProviderServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/providerAPITest/ConnectionAPITest');

var env = require("../config/env").config();
var dbconfig = require('../modules/dbproperties');

var paymentChannelName = 'unittestPaymentChannelName';

var testChannelId = null;

describe("Test Payment API - payment channel service", function () {

    var client = new WebSocketClient(env.paymentAPIServerUrl);

    var paymentChannelService = new PaymentChannelService();
    client.addService(paymentChannelService);
    var paymentChannelAPITest = new PaymentChannelAPITest(paymentChannelService);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);

    ///// Data clear up before creation //////
    it('Should delete the existing payment channel', function(done){
        dbconfig.collection_paymentChannel.remove({name: paymentChannelName}).exec().then(
            function(data){
                done();
            },
            function(error){
                console.log(error);
            }
        )

    });
    ///// Data clear up before creation //////

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


    it('Should create a test paymentChannel', function (done) {
        var channelData = {
            name: paymentChannelName,
            code: "testCode",
            key: "testKey",
            status: "1",
            des: "test payment channel"
        };
        paymentChannelAPITest.add(function(data){
            testChannelId = data.data.channelId;
            //console.log("add", data);
            data.status.should.equal(200);
            done();
            }, channelData );
    });


    it('Should update a test paymentChannel', function (done) {
        paymentChannelAPITest.update(function(data){
            //console.log("update", data);
            data.status.should.equal(200);
            done();
        },{channelId: testChannelId, code: "testChannelCode"});
        });

    it('Should update test paymentChannel status', function (done) {
            paymentChannelAPITest.changeStatus(function(data){
                //console.log("changeStatus", data);
                data.status.should.equal(200);
                done();
            }, {channelId: testChannelId, status: "2"});
        });

    it('Should delete test paymentChannel status', function (done) {
        paymentChannelAPITest.delete(function (data) {
            //console.log("delete", data);
            data.status.should.equal(200);
            done();
        }, {channelId: testChannelId});
    });

});
