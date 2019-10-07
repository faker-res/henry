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
var DxMissionServiceImplement = require("./serviceImplements/client/DXServiceImplement");
var WCGroupControlServiceImplement = require("./serviceImplements/client/WCGroupControlServiceImplement");
var AuctionServiceImplement = require("./serviceImplements/client/AuctionServiceImplement");
var QQGroupControlServiceImplement = require("./serviceImplements/client/QQGroupControlServiceImplement");
var SmsServiceImplement = require("./serviceImplements/client/SmsServiceImplement");
var OtherServiceImplement = require("./serviceImplements/others/otherServicesImplement");
var dbPlatform = require("./db_modules/dbPlatform");
var ebetRTN = require("./modules/ebetRTN");
var errorUtils = require("./modules/errorUtils.js");

var services = require("./modules/services");
const serverInstance = require("./modules/serverInstance");
var clientApiInstances = require("./modules/clientApiInstances");

var WebSocketMessageClient = require("./server_common/WebSocketMessageClient");
var constMessageClientTypes = require("./const/constMessageClientTypes");

env.messageClient = constMessageClientTypes.CLIENT;


var ClientAPIServer = serviceUtils.buildWSServer(
    [PlayerServiceImplement, PlatformServiceImplement, RegistrationIntentionServiceImplement,
        TopUpIntentionServiceImplement, PlayerLevelServiceImplement, ConnectionServiceImplement,
        RewardServiceImplement, RewardPointsServiceImplement, GameServiceImplement,
        ConsumptionServiceImplement, PaymentServiceImplement, PartnerServiceImplement,
        DxMissionServiceImplement, WCGroupControlServiceImplement, AuctionServiceImplement,
        QQGroupControlServiceImplement, SmsServiceImplement, OtherServiceImplement
    ],
    process.env.USE_SSL
);

function generateRandomStr() { //to differentiate each instance
    var numbers = "1234567890";
    var symbols = "#$%@*^&!~:;?/\\[]{}";
    var dict = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" + numbers + symbols;
    var pass = '';
    for (var i = 0; i < 16; i++) {
        var j = Math.random() * dict.length;
        j = (j + Date.now()) % dict.length;
        var c = dict.charAt(j);
        pass = pass + c;
    }

    return pass;
}

global.clientAPIServerNo = generateRandomStr() + String(new Date().getTime());

ebetRTN.connect(5).catch(errorUtils.reportError);

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

// var dbPlatform = require("./db_modules/dbPlatform");
// clientApiInstances.createSMSAPI().then(
//     res => {
//         dbPlatform.syncSMSPlatform();
//         // serverInstance.getSMSAPIClient().smsHeartBeat();
//     }
// );

module.exports = server;
