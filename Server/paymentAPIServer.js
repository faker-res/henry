var env = require("./config/env").config();
var WebSocketController = require("./server_common/WebSocketController");
var WebSocketServer = require("./server_common/WebSocketServer");
var PaymentServiceImplement = require("./serviceImplements/payment/PaymentChannelServiceImplement");
var ProposalServiceImplement = require("./serviceImplements/payment/ProposalServiceImplement");
var ConnectionServiceImplement = require("./serviceImplements/payment/ConnectionServiceImplement");
var PaymentDataServiceImplement = require("./serviceImplements/payment/PaymentDataServiceImplement");

var WebSocketMessageClient = require("./server_common/WebSocketMessageClient");
var constMessageClientTypes = require("./const/constMessageClientTypes");
// var services = require("./modules/services.js");
// var serverInstance = require("./modules/serverInstance.js");
var clientApiInstances = require("./modules/clientApiInstances");
var dbPlatform = require("./db_modules/dbPlatform");

env.messageClient = constMessageClientTypes.PAYMENT;

var TopUpAPIServer = function(port){
    WebSocketServer.call(this, port);

    //todo::move server to function module
    var services = [PaymentServiceImplement, ProposalServiceImplement, ConnectionServiceImplement, PaymentDataServiceImplement];

    for( var i = 0; i < services.length; i++ ){
        var service = new services[i]();
        this.addService(service);
    }
};

TopUpAPIServer.prototype = Object.create(WebSocketServer.prototype);
TopUpAPIServer.prototype.constructor = TopUpAPIServer;

var server = new TopUpAPIServer(process.env.PORT || 9480);
// server._needAuth = true;
server.run();
console.log("Payment API Server is running...");

var url = env.messageServerUrl + "/" + constMessageClientTypes.PAYMENT;
var messageClient = new WebSocketMessageClient(url, server);

server.setMessageClient(messageClient);

// clientApiInstances.createPaymentAPI().then(
//     res => {
//         dbPlatform.syncPMSPlatform();
//         if( serverInstance.getPaymentAPIClient() ){
//             serverInstance.getPaymentAPIClient().startHeartBeat();
//         }
//     }
// );

var dbPlatform = require("./db_modules/dbPlatform");
clientApiInstances.createSMSAPI().then(
    res => {
        // dbPlatform.syncSMSPlatform();
    }
);

module.exports = server;
