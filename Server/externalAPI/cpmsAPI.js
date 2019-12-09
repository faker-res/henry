'use strict';

const Q = require("q");
const env = require("../config/env").config();
const constServerCode = require("../const/constServerCode");
const request = require('request');
const dbLogger = require("../modules/dbLogger");
const clientAPIInstance = require("../modules/clientApiInstances");
const dbconfig = require('../modules/dbproperties');
const constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus');
const constGameStatus = require('../const/constGameStatus');
const emailer = require("../modules/emailer");
const dbPlatform = require("../db_modules/dbPlatform");
const dbUtil = require('../modules/dbutility');
const m1chatAPI= require('../modules/m1chatAPI');
let wsConn;

function callCPMSAPI(service, functionName, data, isFromBackend) {
    if (!data) {
        return Q.reject(new Error("Invalid data!"));
    }

    let platformId = null;
    if (data.hasOwnProperty('platformId')){
        platformId = data.platformId;
    }

    let bOpen = false;
    var deferred = Q.defer();
    //if can't connect in 30 seconds, treat as timeout
    setTimeout(function () {
        if (!bOpen) {
            return deferred.reject({
                status: constServerCode.CP_NOT_AVAILABLE,
                message: "Request timeout",
                errorMessage: "Request timeout"
            });
        }
    }, 60 * 1000);

    clientAPIInstance.createAPIConnectionInMode("ContentProviderAPI", null, platformId, isFromBackend).then(
        wsClient => {
            bOpen = true;
            // var reqTime = new Date().getTime();
            // var resFunction = function (res) {
            //     // var resTime = new Date().getTime();
            //     // dbLogger.createAPIResponseTimeLog(service, functionName, data, res, (resTime - reqTime));
            // };
            return wsClient.callAPIOnce(service, functionName, data).then(
                res => {
                    if (wsClient && typeof wsClient.disconnect == "function") {
                        wsClient.disconnect();
                    }
                    return res;
                },
                error => {
                    // resFunction(error);
                    if (wsClient && typeof wsClient.disconnect == "function") {
                        wsClient.disconnect();
                    }
                    if (error.status) {
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
            return Q.reject({status: constServerCode.CP_NOT_AVAILABLE, message: "Game is not available", error: error});
        }
    ).then(deferred.resolve, deferred.reject);
    return deferred.promise;
};

function callCPMSAPIWithAutoMaintenance(service, functionName, data, fileData) {
    if (!data) {
        return Q.reject(new Error("Invalid data!"));
    }

    let platformId = null;
    if (data.hasOwnProperty('platformId')){
        platformId = data.platformId;
    }

    //check if provider is disable at FPMS
    let providerObjId, platformObjId;
    return dbconfig.collection_gameProvider.findOne({providerId: data.providerId}, {_id: 1}).lean().exec().then(provider => {
        providerObjId = provider._id;
        let projection = {};
        projection['gameProviderInfo.' + providerObjId] = 1;
        return dbconfig.collection_platform.findOne({platformId: data.platformId}, projection).lean();
    }).then(platform => {
        platformObjId = platform._id;
        if (platform && platform.gameProviderInfo && platform.gameProviderInfo[providerObjId] && platform.gameProviderInfo[providerObjId].isEnable === false) {
            return Q.reject({
                name: "DataError",
                message: "Provider is not available"
            });
        } else {
            let bOpen = false;
            let deferred = Q.defer();
            //if can't connect in 60 seconds, treat as timeout
            setTimeout(function () {
                if (!bOpen) {
                    if(functionName == 'queryCredit') {
                        recordQueryCreditTimeout(data);
                    }
                    let projection = {};
                    projection['gameProviderInfo.' + providerObjId] = 1;
                    dbconfig.collection_platform.findOne({platformId: data.platformId}, projection).lean().exec().then(platform => {
                        if (platform && !(platform.gameProviderInfo && platform.gameProviderInfo[providerObjId] && platform.gameProviderInfo[providerObjId].isEnable === false)) {
                            if (data.platformId && data.providerId) {
                                gameProviderTimeoutAutoMaintenance(platformObjId, providerObjId, data.providerId);
                            }
                        }
                    });
                    return deferred.reject({
                        status: constServerCode.CP_NOT_AVAILABLE,
                        message: "Request timeout",
                        errorMessage: "Request timeout"
                    });
                }
            }, 60 * 1000);
            clientAPIInstance.createAPIConnectionInMode("ContentProviderAPI", null, platformId).then(
                wsClient => {
                    bOpen = true;
                    return wsClient.callAPIOnce(service, functionName, data).then(
                        res => {
                            if ( functionName && functionName == 'transferOut') {
                                console.log('MT --checking Websocket Success', res);
                            }
                            if (wsClient && typeof wsClient.disconnect == "function") {
                                wsClient.disconnect();
                            }
                            return res;
                        },
                        error => {
                            if ( functionName && functionName == 'transferOut') {
                                console.log('MT --checking Websocket Error', error);
                            }
                            if (wsClient && typeof wsClient.disconnect == "function") {
                                wsClient.disconnect();
                            }
                            if (error.status) {
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
                    return Q.reject({
                        status: constServerCode.CP_NOT_AVAILABLE,
                        message: "Game is not available",
                        error: error
                    });
                }
            ).then(deferred.resolve, deferred.reject);
            return deferred.promise;
        }
    });
};

function callCPMSAPIWithFileData(service, functionName, data, fileData) {
    if (!data) {
        return Promise.reject(new Error("Invalid data!"));
    }
    let bOpen = false;
    //if can't connect in 30 seconds, treat as timeout
    setTimeout(function () {
        if (!bOpen) {
            return Promise.reject({
                status: constServerCode.CP_NOT_AVAILABLE,
                message: "Game is not available"
            });
        }
    }, 60 * 1000);
    return clientAPIInstance.createAPIConnectionInMode("ContentProviderAPI", "game").then(
        wsClient => {
            bOpen = true;
            return wsClient.callAPIOnceWithFileData(service, functionName, data, fileData).then(
                res => {
                    if (wsClient && typeof wsClient.disconnect === "function") {
                        wsClient.disconnect();
                    }
                    return res;
                },
                error => {
                    if (wsClient && typeof wsClient.disconnect === "function") {
                        wsClient.disconnect();
                    }
                    if (error.status) {
                        return Promise.reject(error);
                    }
                    else {
                        return Promise.reject({
                            status: constServerCode.CP_NOT_AVAILABLE,
                            message: "Game is not available",
                            error: error
                        });
                    }
                }
            );
        },
        error => {
            return Q.reject({status: constServerCode.CP_NOT_AVAILABLE, message: "Game is not available", error: error});
        }
    )
}

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

function gameProviderTimeoutAutoMaintenance(platformObjId, providerObjId, providerId) {
    const minute = 60*1000;
    let timeoutLimit = 0;
    let platformName = '';
    let platformId = '';
    let searchTimeFrame = 3 * minute;
    let lastTimeoutDateTime;

    //check if last N times failed due to timed out
    dbconfig.collection_platform.findOne({_id: platformObjId}).lean().exec().then(platform => {
        timeoutLimit = platform.disableProviderAfterConsecutiveTimeoutCount;
        searchTimeFrame = platform.providerConsecutiveTimeoutSearchTimeFrame ? platform.providerConsecutiveTimeoutSearchTimeFrame * minute : searchTimeFrame;
        platformName = platform.name;
        platformId = platform.platformId;
        let searchTimeStart = new Date(new Date().getTime() - searchTimeFrame);
        if(timeoutLimit && timeoutLimit > 0) {
            let searchTransferLogProm = dbconfig.collection_playerCreditTransferLog.find({
                platformObjId: platformObjId,
                providerId: providerId,
                status: constPlayerCreditTransferStatus.TIMEOUT,
                createTime: {$gte: searchTimeStart}
            }).sort({_id:-1}).lean();
            let searchQueryCreditTimeoutProm = dbconfig.collection_queryCreditTimeout.find({
                platformObjId: platformObjId,
                providerObjId: providerObjId,
                createTime: {$gte: searchTimeStart}
            }).sort({_id:-1}).lean();

            return Promise.all([searchTransferLogProm, searchQueryCreditTimeoutProm]);
        }
    }).then(logs => {
        if(logs && logs.length > 0) {
            let transferLogs = logs[0];
            let queryCreditLogs = logs[1];
            let count = transferLogs.length + queryCreditLogs.length;

            if (count >= timeoutLimit) {
                if (transferLogs.length > 0 && queryCreditLogs.length > 0) {
                    lastTimeoutDateTime = new Date(transferLogs[0].createTime).getTime() > new Date(queryCreditLogs[0].createTime).getTime() ?
                        transferLogs[0].createTime : queryCreditLogs[0].createTime;
                } else {
                    lastTimeoutDateTime = transferLogs.length > 0 ? transferLogs[0].createTime : queryCreditLogs[0].createTime;
                }
                //set provider to maintenance status
                let isEnable = false;
                return dbPlatform.updateProviderFromPlatformById(platformObjId, providerObjId, isEnable).then(() => {
                    console.log("Auto Maintenance Setting Provider to Maintenance ", {platformId: platformId, providerId: providerId});
                    return dbconfig.collection_gameProvider.findOne({_id: providerObjId}).lean();
                });
            }
        }
    }).then(provider => {
        if(provider) {
            let providerName = provider.name;
            let sender = env.mailerNoReply;
            let recipient = env.providerTimeoutNotificationRecipient;
            let subject = `[FPMS System]: ${platformName} - ${providerName} timeout limit reached, set status to maintenance. ${dbUtil.getLocalTime(new Date)}`;
            let content = `<b>Game provider [${providerName}] has reached maximum consecutive timeout limit, it has been changed to maintenance status.</b>
                        <br/><br/>
                        <span>Platform: ${platformName}</span><br/>
                        <span>Game Provider Name: ${providerName}</span><br/>
                        <span>Current Status: MAINTENANCE</span><br/>
                        <span>Max Consecutive Timeout Limit: ${timeoutLimit}</span><br/>
                        <span>Last Timeout Date Time: ${lastTimeoutDateTime}</span>
                        <br/><br/>-<br/><br/>
                        <b>游戏提供商 [${providerName}] 已连续超时${timeoutLimit}次，现已将其设置为维护状态。</b>
                        <br/><br/>
                        <span>平台: ${platformName}</span><br/>
                        <span>游戏提供商: ${providerName}</span><br/>
                        <span>现今状态: 维护</span><br/>
                        <span>最高连续超时限制设定: ${timeoutLimit}次</span><br/>
                        <span>最后尝试并超时时间: ${lastTimeoutDateTime}</span>
                        <br/><br/><br/><br/>
                        <span>This is an automated email sent by FPMS. <b>DO NOT Reply</b>.</span><br/>
                        <span>此邮件是由FPMS系统自动发出。<b>请勿回复。</b></span>`;

            let emailConfig = {
                sender: sender,
                recipient: recipient,
                subject: subject,
                body: content,
                isHTML: true
            };
            let m1chatSendMessage = `${subject}`;

            m1chatAPI.send({content: m1chatSendMessage});
            return emailer.sendEmail(emailConfig);
        }
    });
}

function recordQueryCreditTimeout(data){
    let promArr = [];
    promArr.push(dbconfig.collection_platform.findOne({platformId: data.platformId}));
    promArr.push(dbconfig.collection_gameProvider.findOne({providerId: data.providerId}));
    promArr.push(dbconfig.collection_players.findOne({name: data.username}));

    Promise.all(promArr).then(retData => {
        let platformObjId = retData[0]._id;
        let providerObjId = retData[1]._id;
        let playerObjId = retData[2]._id;

        let queryCreditTimeoutData = {
            platformObjId: platformObjId,
            playerObjId: playerObjId,
            providerObjId: providerObjId,
            platformId: data.platformId,
            playerName: data.username,
            providerId: data.providerId
        };
        console.log("queryCredit Timeout Data ", {platformId: data.platformId, playerName: data.username, providerId: data.providerId});
        dbconfig.collection_queryCreditTimeout(queryCreditTimeoutData).save();
    })
}

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

    player_getTestLoginURLWithOutUser: function (data) {
        return callCPMSAPI("player", "getTestLoginURLWithOutUser", data);
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
        // return callCPMSAPI("player", "transferIn", data);
        return callCPMSAPIWithAutoMaintenance("player", "transferIn", data);
    },

    player_queryCredit: function (data) {
        data.requestId = data.username + "_" + data.providerId + "_" + new Date().getTime();
        // return callCPMSAPI("player", "queryCredit", data);
        return callCPMSAPIWithAutoMaintenance("player", "queryCredit", data);
    },

    player_queryCredit_NAM: function(data) {
        data.requestId = data.username + "_" + data.providerId + "_" + new Date().getTime();
        // return callCPMSAPI("player", "queryCredit", data);
        return callCPMSAPI("player", "queryCredit", data, true);
    },

    player_transferOut: function (data) {
        // return callCPMSAPI("player", "transferOut", data);
        return callCPMSAPIWithAutoMaintenance("player", "transferOut", data);
    },

    player_syncPlatforms: function (data) {
        return callCPMSAPI("player", "syncPlatforms", data);
    },

    player_checkExist: function (data) {
        return callCPMSAPI("player", "player_checkExist", data);
    },

    player_getCreditLog: function (data) {
        return callCPMSAPI("player", "getCreditLog", data);
    },

    player_getGamePassword: function (data) {
        return callCPMSAPI("player", "getGamePassword", data);
    },

    game_updateImageUrl: function (data, fileData) {
        return callCPMSAPIWithFileData("game", "updateImageUrl", data, fileData);
    },

    consumption_getConsumptionSummary: function(data){
        console.log('-mark--getConsumptionSummary', data);
        return callCPMSAPI("consumption", "getConsumptionSummary", data);
    },

    consumption_reSendConsumption: function(data){
        console.log('-mark--reSendConsumption', data);
        return callCPMSAPI("consumption", "reSendConsumption", data);
    }
};

module.exports = cpmsAPI;
