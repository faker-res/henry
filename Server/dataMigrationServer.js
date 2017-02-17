/******************************************************************
 *  PlayerAPIServer
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var env = require("./config/env").config();
var serviceUtils = require('./modules/serviceUtils');
var AdminServiceImplement = require("./serviceImplements/migration/AdminServiceImplement");
var PlayerServiceImplement = require("./serviceImplements/migration/PlayerServiceImplement");
var PartnerServiceImplement = require("./serviceImplements/migration/PartnerServiceImplement");
var ProposalServiceImplement = require("./serviceImplements/migration/ProposalServiceImplement");
var SyncDataServiceImplement = require("./serviceImplements/migration/SyncDataServiceImplement");
var clientApiInstances = require("./modules/clientApiInstances");
const serverInstance = require("./modules/serverInstance");

var MigrationAPIServer = serviceUtils.buildWSServer(
    [AdminServiceImplement, PlayerServiceImplement, ProposalServiceImplement, PartnerServiceImplement, SyncDataServiceImplement]
);

var server = new MigrationAPIServer(process.env.PORT || 9680);
// server._needAuth = true;
server.run();
console.log("Migration API Server is running...");

serverInstance.setServerType("dataMigration");

// clientApiInstances.createPaymentAPI().then(
//     res => {
//         if( serverInstance.getPaymentAPIClient() ){
//             serverInstance.getPaymentAPIClient().startHeartBeat();
//         }
//     }
// );

module.exports = server;


