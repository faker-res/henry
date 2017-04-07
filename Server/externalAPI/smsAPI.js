'user strict'

const Q = require("q");
const env = require("../config/env").config();
const serverInstance = require("../modules/serverInstance");
const request = require('request');
const dbLogger = require("../modules/dbLogger")

function callSMSAPI(service, functionName, data){
    if( !data ){
        return Q.reject(new Error("Invalid data!"));
    }
    var wsClient = serverInstance.getSMSAPIClient();
    if( !wsClient || !wsClient.isOpen() ){
        return Q.reject({ status: 400, errMessage: "Invalid WebSocket client connection!  (No SMSAPI stored for this instance.)"});
    }
    return wsClient.callAPIOnce(service, functionName, data);
};

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

