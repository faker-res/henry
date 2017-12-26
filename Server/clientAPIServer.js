var env = require("./config/env").config();
var WebSocketController = require("./server_common/WebSocketController");
var WebSocketClient = require("./server_common/WebSocketClient");
//var WebSocketServer = require("./server_common/WebSocketServer");
var serviceUtils = require('./modules/serviceUtils');
var PaymentManagementServices = require("./services/pms/PaymentManagementServices");
var PlayerServiceImplement = require("./serviceImplements/client/PlayerServiceImplement");
var PlatformServiceImplement = require("./serviceImplements/client/PlatformServiceImplement");
var PlayerLevelServiceImplement = require("./serviceImplements/client/PlayerLevelServiceImplement");
var RegistrationIntentionServiceImplement = require("./serviceImplements/client/RegistrationIntentionServiceImplement");
var TopUpIntentionServiceImplement = require("./serviceImplements/client/TopUpIntentionServiceImplement");
var RewardServiceImplement = require("./serviceImplements/client/RewardServiceImplement");
var RewardPointsServiceImplement = require("./serviceImplements/client/RewardPointsServiceImplement");
var GameServiceImplement = require("./serviceImplements/client/GameServiceImplement");
var ConsumptionServiceImplement = require("./serviceImplements/client/ConsumptionServiceImplement");
var PaymentServiceImplement = require("./serviceImplements/client/PaymentServiceImplement");
var ConnectionServiceImplement = require("./serviceImplements/client/ConnectionServiceImplement");
var PartnerServiceImplement = require("./serviceImplements/client/PartnerServiceImplement");
var dbPlatform = require("./db_modules/dbPlatform");

var services = require("./modules/services");
// const serverInstance = require("./modules/serverInstance");
var clientApiInstances = require("./modules/clientApiInstances");

var WebSocketMessageClient = require("./server_common/WebSocketMessageClient");
var constMessageClientTypes = require("./const/constMessageClientTypes");

env.messageClient = constMessageClientTypes.CLIENT;


var ClientAPIServer = serviceUtils.buildWSServer(
    [PlayerServiceImplement, PlatformServiceImplement, RegistrationIntentionServiceImplement,
        TopUpIntentionServiceImplement, PlayerLevelServiceImplement, ConnectionServiceImplement,
        RewardServiceImplement, RewardPointsServiceImplement, GameServiceImplement, ConsumptionServiceImplement, PaymentServiceImplement, PartnerServiceImplement],
    process.env.USE_SSL
);

var server = new ClientAPIServer(process.env.PORT || 9280);
server._needAuth = true;
server.run();
console.log("Client API Server is running...");

//create message client
var url = env.messageServerUrl + "/" + constMessageClientTypes.CLIENT;
var messageClient = new WebSocketMessageClient(url, server);

server.setMessageClient(messageClient);

// clientApiInstances.createContentProviderAPI().then(
//     res => {
//         console.log( "client createContentProviderAPI!" );
//         if (serverInstance.getCPAPIClient()) {
//             serverInstance.getCPAPIClient().startHeartBeat();
//         }
//         dbPlatform.syncCPMSPlatform();
//     }
// );
//
// clientApiInstances.createPaymentAPI().then(
//     res => {
//         if( serverInstance.getPaymentAPIClient() ){
//             serverInstance.getPaymentAPIClient().startHeartBeat();
//         }
//     }
// );
var dbPlatform = require("./db_modules/dbPlatform");
clientApiInstances.createSMSAPI().then(
    res => {
        dbPlatform.syncSMSPlatform();
    }
);
module.exports = server;
