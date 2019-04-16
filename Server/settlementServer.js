var env = require("./config/env").config();
var settlementEnv = require("./config/settlementEnv").config();
var WebSocketServer = require("./server_common/WebSocketServer");
var SettlementServiceImplement = require("./serviceImplements/settlement/SettlementServiceImplement");
var PlatformServiceImplement = require('./serviceImplements/settlement/PlatformServiceImplement');

// require("../modules/promiseDebugging").setDefaults();
var WebSocketMessageClient = require("./server_common/WebSocketMessageClient");
var constMessageClientTypes = require("./const/constMessageClientTypes");

env.messageClient = constMessageClientTypes.SETTLEMENT;

var SettlementAPIServer = function(port){
    WebSocketServer.call(this, port);

    //todo::move server to function module
    var services = [SettlementServiceImplement, PlatformServiceImplement];

    for( var i = 0; i < services.length; i++ ){
        var service = new services[i]();
        this.addService(service);
    }
};

SettlementAPIServer.prototype = Object.create(WebSocketServer.prototype);
SettlementAPIServer.prototype.constructor = SettlementAPIServer;

var server = new SettlementAPIServer(process.env.PORT || 8001);
server.run();
console.log("Settlement API Server is running...");

var url = env.messageServerUrl + "/" + constMessageClientTypes.SETTLEMENT;
var messageClient = new WebSocketMessageClient(url, server);

server.setMessageClient(messageClient);

var clientApiInstances = require("./modules/clientApiInstances.js");
var serverInstance = require("./modules/serverInstance.js");
clientApiInstances.createContentProviderAPI().then(
    cpClient => {
        if( serverInstance.getCPAPIClient() ){
            serverInstance.getCPAPIClient().startHeartBeat();
        }
    }
);

module.exports = server;