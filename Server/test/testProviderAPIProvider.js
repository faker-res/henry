var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var ProviderService = require('../services/provider/ProviderServices').ProviderService;
var ProviderAPITest = require('../testAPI/providerAPITest/ProviderAPITest');

var ConnectionService = require('../services/provider/ProviderServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/providerAPITest/ConnectionAPITest');

var env = require("../config/env").config();
var constProviderStatus = require("./../const/constProviderStatus");
var testProviderId  = null;
var testProviderCode = null;

describe("Test Provider API - provider service", function () {

    var client = new WebSocketClient(env.providerAPIServerUrl);

    var providerService = new ProviderService();
    client.addService(providerService);
    var providerAPITest = new ProviderAPITest(providerService);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);


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


    it('Should create a test provider', function (done) {
        var date = new Date();
        var providerData = {
            name: "unitTestProvider"+ date.getTime(),
            prefix: "UTP",
            providerId: "testProviderId" + date.getTime(),
            status: 1,
            code: "Unit"+ date.getTime(),
            description: "Provider Test"
        };
            providerAPITest.add(function (data) {
            data.status.should.equal(200);
            testProviderId = data.data.providerId;
            testProviderCode = data.data.code;
            done();
            } ,providerData);
        });

    it('Should update a test provider', function (done) {
        providerAPITest.update(function (data) {
            data.status.should.equal(200);
            done();
        }, {providerId: testProviderId, description: "TP-123"});
    });

    it('Should change status of a test provider', function (done) {
        providerAPITest.changeStatus(function (data) {
            data.status.should.equal(200);
            done();
        }, {providerId: testProviderId, status: constProviderStatus.MAINTENANCE});
    });

    it('Should modify the code of a test provider', function (done) {
        var date = new Date();
        providerAPITest.modifyCode(function (data) {
            data.status.should.equal(200);
            testProviderCode= data.newCode;
            done();
        }, {oldCode:testProviderCode, newCode:"NINGA"+ date.getTime()});
    });

    //todo::update this unit test
    // it('Should update all the providers in the array', function (done) {
    //     var date = new Date();
    //     providerAPITest.syncData(function (data) {
    //         //console.log("syncData", data);
    //         data.status.should.equal(200);
    //         done();
    //     }, {providers: [{code:testProviderCode , name: "UnitTest-Two", description: "TGP-1234"}]});
    // });

    it('Should delete a test provider', function (done) {
        providerAPITest.delete(function (data) {
            //console.log("delete", data);
            data.status.should.equal(200);
            done();
        }, { providerId: testProviderId});
    });



});
