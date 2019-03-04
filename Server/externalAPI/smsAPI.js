'user strict'

const Q = require("q");
const env = require("../config/env").config();
const serverInstance = require("../modules/serverInstance");
const request = require('request');
const dbLogger = require("../modules/dbLogger")
const clientAPIInstance = require("../modules/clientApiInstances");

// function callSMSAPI(service, functionName, data){
//     if( !data ){
//         return Q.reject(new Error("Invalid data!"));
//     }
//     var wsClient = serverInstance.getSMSAPIClient();
//     if( !wsClient || !wsClient.isOpen() ){
//         return Q.reject({ status: 400, message: "SMS is not available"});
//         // return callSMSNewAPI(service, functionName, data);
//     }
//     return wsClient.callAPIOnce(service, functionName, data);
// };

function callSMSAPI(service, functionName, data) {
    if (!data) {
        return Q.reject(new Error("Invalid data!"));
    }

    let bOpen = false;
    var deferred = Q.defer();
    //if can't connect in 30 seconds, treat as timeout
    setTimeout(function(){
        if( !bOpen ){
            return deferred.reject({
                status: 400,
                message: "SMS is not available"
            });
        }
    }, 30*1000);
    clientAPIInstance.createAPIConnectionInMode("SMSAPI").then(
        con => {
            bOpen = true;
            return con.callAPIOnce(service, functionName, data).then(
                data => {
                    console.log('API data===', data);
                    if (con && typeof con.disconnect == "function") {
                        con.disconnect();
                    }
                    return data;
                },
                error => {
                    console.log('API error===', error);
                    if (con && typeof con.disconnect == "function") {
                        con.disconnect();
                    }
                    if (error.status) {
                        return Q.reject(error);
                    }
                    else {
                        return Q.reject({
                            status: 400,
                            message: "SMS is not available",
                            error: error
                        });
                    }
                }
            );
        }
    ).then(deferred.resolve, deferred.reject);
    return deferred.promise;
};

const smsAPI = {
    /*
     * function name format: <service>_<functionName>
     */

    //sending service
    sending_sendMessage: function (data) {
        if (data && data.tel) {
            data.tel = String(data.tel).trim();
        }

        return callSMSAPI("sending", "sendMessage", data);
    },

    //platform service
    platform_syncData: function(data){
        return callSMSAPI("platform", "syncData", data);
    },

    //channel service
    channel_getChannelList: function(data){
        return callSMSAPI("channel", "getChannelList", data);
    },

    //getUsableChannel service
    getUsableChannel_getUsableChannelList: function(data){
        console.log('HERE inside smsAPI getUsableChannel===', data);
        return callSMSAPI("getUsableChannel", "getUsableChannelList", data);
    }

};

module.exports = smsAPI;

