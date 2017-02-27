/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
'use strict'

var Q = require('q');
var env = require("./config/env").config();
var WebSocketController = require("./server_common/WebSocketController");
var WebSocketServer = require("./server_common/WebSocketServer");
var PlayerService = require("./services/provider/ProviderServices").Player;
var ProviderServiceImplement = require("./serviceImplements/provider/ProviderServiceImplement");
var AdminServiceImplement = require("./serviceImplements/provider/AdminServiceImplement");
var GameTypeServiceImplement = require("./serviceImplements/provider/GameTypeServiceImplement");
var GameServiceImplement = require("./serviceImplements/provider/GameServiceImplement");
var ConsumptionServiceImplement = require("./serviceImplements/provider/ConsumptionServiceImplement");
var ConnectionServiceImplement = require("./serviceImplements/provider/ConnectionServiceImplement");
var PlatformServiceImplement = require("./serviceImplements/provider/PlatformServiceImplement");

var WebSocketMessageClient = require("./server_common/WebSocketMessageClient");
var constMessageClientTypes = require("./const/constMessageClientTypes");

//var serverInstance = require('../modules/serverInstance');

env.messageClient = constMessageClientTypes.PROVIDER;

var ProviderAPIServer = function(port){
    WebSocketServer.call(this, port);

    //todo::move server to function module
    var services = [ProviderServiceImplement,AdminServiceImplement,GameTypeServiceImplement,GameServiceImplement,ConsumptionServiceImplement,ConnectionServiceImplement, PlatformServiceImplement];

    for( var i = 0; i < services.length; i++ ){
        var service = new services[i]();
        this.addService(service);
    }

    //add client service
    var clientService = new PlayerService();
    this.addService(clientService, true);
};

ProviderAPIServer.prototype = Object.create(WebSocketServer.prototype);
ProviderAPIServer.prototype.constructor = ProviderAPIServer;

ProviderAPIServer.prototype.callClientAPIOnce = function(serviceName, funcName, data){
    var deferred = Q.defer();
    var service = this.getService(serviceName, true);
    if( service ){
        var wsFunc = service[funcName];
        if(wsFunc && typeof wsFunc.onceSync === "function"){
            wsFunc.request(data);
            var key = wsFunc.generateSyncKey(data);
            wsFunc.onceSync(key, function (res) {
                if( res && res.status == 200 ){
                    deferred.resolve(res);
                }
                else{
                    deferred.reject(res);
                }
            });
        }
    }
    else{
        deferred.reject("api error");
    }
    return deferred.promise;
};

var server = new ProviderAPIServer(process.env.PORT || 9380);
server._needAuth = true;
server.run();
console.log("Provider API Server is running...");

var url = env.messageServerUrl + "/" + constMessageClientTypes.PROVIDER;
var messageClient = new WebSocketMessageClient(url, server);

server.setMessageClient(messageClient);

module.exports = server;

