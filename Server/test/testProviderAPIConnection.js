/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var ConnectionService = require('../services/provider/ProviderServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/providerAPITest/ConnectionAPITest');


var env = require("../config/env").config();

describe("Test Provider API - Connection Service", function () {

    var client = new WebSocketClient(env.providerAPIServerUrl);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);


    ///////////////// Init data Start ////////////////
    it('Should get api User data', function(done) {
        client.connect();
        client.addEventListener("open", function () {
            connectionAPITest.initGetAPIUser().then(function (data) {
                done();
            });

        });
    });

///////////////// Init data End ////////////////

    it('Should login apiUser', function (done) {
        client.connect();
        client.addEventListener("open", function(){
            connectionAPITest.login(function(data){
                done();
            });

        });
    });






});
