'user strict'

const Q = require("q");
const env = require("../config/env").config();
const serverInstance = require("../modules/serverInstance");
const request = require('request');
const dbLogger = require("../modules/dbLogger")
const clientAPIInstance = require("../modules/clientApiInstances");

function callSMSAPI(service, functionName, data){
    if( !data ){
        return Q.reject(new Error("Invalid data!"));
    }
    var wsClient = serverInstance.getSMSAPIClient();
    if( !wsClient || !wsClient.isOpen() ){
        return Q.reject({ status: 400, message: "SMS is not available"});
    }
    return wsClient.callAPIOnce(service, functionName, data);
};

// function callSMSAPI(service, functionName, data) {
//     if (!data) {
//         return Q.reject(new Error("Invalid data!"));
//     }
//     // var wsClient = serverInstance.getPaymentAPIClient();
//     // if (!wsClient || !wsClient.isOpen()) {
//     //     return Q.reject({
//     //         status: 400,
//     //         errMessage: "Invalid WebSocket client connection!  (No SMSAPI stored for this instance.)"
//     //     });
//     // }
//     let bOpen = false;
//     var deferred = Q.defer();
//     //if can't connect in 30 seconds, treat as timeout
//     setTimeout(function(){
//         if( !bOpen ){
//             return deferred.reject({
//                 status: 400,
//                 message: "SMS is not available"
//             });
//         }
//     }, 5*1000);
//     clientAPIInstance.createAPIConnectionInMode("SMSAPI").then(
//         con => {
//             bOpen = true;
//             return con.callAPIOnce(service, functionName, data).then(
//                 data => {
//                     if (con && typeof con.disconnect == "function") {
//                         con.disconnect();
//                     }
//                     return data;
//                 },
//                 error => {
//                     if (con && typeof con.disconnect == "function") {
//                         con.disconnect();
//                     }
//                     if (error.status) {
//                         return Q.reject(error);
//                     }
//                     else {
//                         return Q.reject({
//                             status: 400,
//                             message: "SMS is not available",
//                             error: error
//                         });
//                     }
//                 }
//             );
//         }
//     ).then(deferred.resolve, deferred.reject);
//     return deferred.promise;
// };

const smsAPI = {
    /*
     * function name format: <service>_<functionName>
     */

    //sending service
    sending_sendMessage: function (data) {
        return callSMSAPI("sending", "sendMessage", data);
    },

    //platform service
    platform_syncData: function(data){
        return callSMSAPI("platform", "syncData", data);
    },

    //channel service
    channel_getChannelList: function(data){
        return callSMSAPI("channel", "getChannelList", data);
    }

};

module.exports = smsAPI;

