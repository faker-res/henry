/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

'user strict'

const Q = require("q");
const env = require("../config/env").config();
const constServerCode = require("../const/constServerCode");
const request = require('request');
const dbLogger = require("../modules/dbLogger");
const clientAPIInstance = require("../modules/clientApiInstances");

function callCPMSAPI(service, functionName, data) {
    if (!data) {
        return Q.reject(new Error("Invalid data!"));
    }
    // var wsClient = serverInstance.getCPAPIClient();
    // if (!wsClient || !wsClient.isOpen()) {
    //     return Q.reject({
    //         status: 400,
    //         errMessage: "Invalid WebSocket client connection!  (No CPMSAPI stored for this instance.)"
    //     });
    // }
    return clientAPIInstance.createAPIConnectionInMode("ContentProviderAPI").then(
        wsClient => {
            var reqTime = new Date().getTime();
            var resFunction = function (res) {
                var resTime = new Date().getTime();
                dbLogger.createAPIResponseTimeLog(service, functionName, data, res, (resTime - reqTime));
            };
            return wsClient.callAPIOnce(service, functionName, data).then(
                res => {
                    resFunction(res);
                    if (wsClient && typeof wsClient.disconnect == "function") {
                        wsClient.disconnect();
                    }
                    return res;
                },
                error => {
                    resFunction(error);
                    if (wsClient && typeof wsClient.disconnect == "function") {
                        wsClient.disconnect();
                    }
                    if(error.status){
                        return Q.reject(error);
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.CP_NOT_AVAILABLE,
                            message: "Game is not available",
                            error: error
                        });
                    }
                }
            );
        },
        error => {
            return Q.reject({status: constServerCode.CP_NOT_AVAILABLE, message: "Game is not available", error:error});
        }
    );
};

function httpGet(url) {
    var deferred = Q.defer();
    request.get(url).on('response', function (response) {
        if (response.statusCode == 200) {
            deferred.resolve(response.body);
        }
        else {
            deferred.reject(`Http request failed with status code ${response.statusCode}`);
        }
    });
    return deferred.promise;
};

const cpmsAPI = {
    /*
     * function name format: <service>_<functionName>
     */

    //player service
    player_addPlayer: function (data) {
        return callCPMSAPI("player", "addPlayer", data);
    },

    player_addTestPlayer: function (data) {
        return callCPMSAPI("player", "addTestPlayer", data);
    },

    player_getLoginURL: function (data) {
        return callCPMSAPI("player", "getLoginURL", data);
    },

    player_getTestLoginURL: function (data, isHttp) {
        return callCPMSAPI("player", "getTestLoginURL", data);
    },

    player_getGameUserInfo: function (data) {
        return callCPMSAPI("player", "getGameUserInfo", data);
    },

    player_modifyGamePassword: function (data) {
        return callCPMSAPI("player", "modifyGamePassword", data);
    },

    player_getOnlineTopUpType: function (data) {
        return callCPMSAPI("player", "getOnlineTopUpType", data);
    },

    player_grabPlayerTransferRecords: function (data) {
        return callCPMSAPI("player", "grabPlayerTransferRecords", data);
    },

    player_transferIn: function (data) {
        return callCPMSAPI("player", "transferIn", data);
    },

    player_queryCredit: function (data) {
        return callCPMSAPI("player", "queryCredit", data);
    },

    player_transferOut: function (data) {
        return callCPMSAPI("player", "transferOut", data);
    },

    player_syncPlatforms: function (data) {
        return callCPMSAPI("player", "syncPlatforms", data);
    },

    player_checkExist: function (data) {
        return callCPMSAPI("player", "player_checkExist", data);
    }

};

module.exports = cpmsAPI;

