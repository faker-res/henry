"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var GameService = require("./../../services/client/ClientServices").GameService;
let dbUtility = require("./../../modules/dbutility");
var dbRewardEvent = require('./../../db_modules/dbRewardEvent');
var dbGame = require('./../../db_modules/dbGame');
var dbPlatformGameStatus = require('./../../db_modules/dbPlatformGameStatus');
var dbGameProvider = require('./../../db_modules/dbGameProvider');
var dbPlatformGameGroup = require('./../../db_modules/dbPlatformGameGroup');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var dbRewardTask = require('./../../db_modules/dbRewardTask');

//var constGameType = require('./../../const/constGameType');
var dbGameType = require("../../db_modules/dbGameType.js");
var constServerCode = require("./../../const/constServerCode");
var constSystemParam = require('./../../const/constSystemParam');

var cpmsAPI = require("../../externalAPI/cpmsAPI");


var GameServiceImplement = function () {
    GameService.call(this);
    var self = this;

    this.getGameTypeList.expectsData = '';
    this.getGameTypeList.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbGameType.getAllGameTypesAPI, [], true, false, false, true);
    };

    this.getGameList.expectsData = '[providerId]: String';
    this.getGameList.onRequest = function (wsFunc, conn, data) {
        // var isValidData = Boolean(data && data.type || data.provider);
        var pass = {};
        if (data.hasOwnProperty("providerId")) {
            pass.providerId = data.providerId;
        }
        if (data.type) {
            pass.type = data.type;
        }
        if (data.playGameType) {
            pass.playGameType = data.playGameType;
        }
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbGame.getGameListAPI, [pass, data.startIndex, data.requestCount, conn.playerId], true, false, false, true);
    };

    this.getGameGroupInfo.expectsData = 'code: String, platformId: String';
    this.getGameGroupInfo.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.code && data.platformId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformGameGroup.getGameGroupGames, [data, data.startIndex, data.requestCount, conn.playerId, data.providerId], isValidData, false, false, true);
    };

    this.getGameGroupTreeInfo.expectsData = 'platformId: String';
    this.getGameGroupTreeInfo.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformGameGroup.getGameGroupTree, [data.code, data.platformId, data.containGames, conn.playerId, data.startIndex, data.requestCount], isValidData, false, false, true);
    };

    this.getGameGroupList.expectsData = ''
    this.getGameGroupList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformGameGroup.getGameGroupList, [data.platformId, data.startIndex, data.requestCount], isValidData, false, false, true);
    };

    this.getProviderList.expectsData = 'playerId: String';
    this.getProviderList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbGameProvider.getGameProvidersByPlayerAPI, [{playerId: data.playerId}], isValidData);
    };

    this.getProviderDetailList.expectsData = 'playerId: String';
    this.getProviderDetailList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbGameProvider.getGameProvidersByPlayerAPI, [{playerId: data.playerId}, true], isValidData);
    };

    this.getProviderStatus.expectsData = 'playerId: String';
    this.getProviderStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbGameProvider.getProviderStatus, [conn.playerId, data.providerId], isValidData);
    };

    this.transferToProvider.expectsData = 'playerId: String, [providerId]: String';
    this.transferToProvider.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.hasOwnProperty("providerId") && (data.playerId == conn.playerId));
        data.credit = -1;
        isValidData = data.credit == 0 ? false : isValidData;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.transferPlayerCreditToProvider, [data.playerId, null, data.providerId, data.credit], isValidData);
    };

    this.transferFromProvider.expectsData = 'playerId: String, providerId: String, [credit]: Number';
    this.transferFromProvider.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.hasOwnProperty("providerId") && (data.playerId == conn.playerId));
        data.credit = -1;
        isValidData = data.credit == 0 ? false : isValidData;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.transferPlayerCreditFromProvider, [data.playerId, null, data.providerId, data.credit], isValidData);
    };

    this.getGameProviderCredit.expectsData = 'providerId: String';
    this.getGameProviderCredit.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.hasOwnProperty("providerId") && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getGameProviderCredit, [conn.playerId, data.providerId], isValidData);
    };

    this.getTransferProgress.expectsData = '';
    this.getTransferProgress.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        //WebSocketUtil.performAction(conn, wsFunc, dbPlayerInfo.getTransferProgress, [], isValidData);
        if (isValidData) {
            var curStep = 0;
            var progressInterval = setInterval(
                function () {
                    if (curStep <= 5) {
                        wsFunc.response(conn, {
                            status: 200,
                            data: {steps: 5, currentStep: curStep, stepContent: "get balance."}
                        }, data);
                        curStep++;
                    }
                    else {
                        clearInterval(progressInterval);
                    }
                }, 1000
            );
        }
        else {
            WebSocketUtil.invalidDataResponse(conn, wsFunc, data);
        }
    };

    this.notifyProviderStatusUpdate.expectsData = '';
    this.notifyProviderStatusUpdate.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        //WebSocketUtil.performAction(conn, wsFunc, dbPlayerInfo.getTransferProgress, [], isValidData);
        if (isValidData) {
            var curStatus = 1;
            var progressInterval = setInterval(
                function () {
                    if (curStatus <= 3) {
                        wsFunc.response(conn, {status: 200, data: {providerId: 1, runTimeStatus: curStatus}}, data);
                        curStatus++;
                    }
                    else {
                        clearInterval(progressInterval);
                    }
                }, 1000
            );
        }
        else {
            WebSocketUtil.invalidDataResponse(conn, wsFunc, data);
        }
    };

    this.getTransferProgress.addListener(
        function (data) {
            //todo::move the code here to util function
            if (self._wss && self._wss._wss && self._wss._wss.clients.length > 0) {
                var wss = self._wss._wss;
                for (let client of wss.clients) {
                    if (client.playerId == data.playerId) {
                        self.getTransferProgress.response(client, {status: 200, data: data}, data);
                    }
                }
            }
        }
    );

    this.getLoginURL.expectsData = 'gameId: String, clientDomainName: String';
    this.getLoginURL.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId && data && data.gameId && data.clientDomainName);
        let ip = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                ip = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getLoginURL, [conn.playerId, data.gameId, ip, data.lang, data.clientDomainName, data.clientType, inputDevice], isValidData);
    };

    this.getTestLoginURL.expectsData = 'gameId: String, clientDomainName: String';
    this.getTestLoginURL.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId && data && data.gameId && data.clientDomainName);
        let ip = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                ip = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getTestLoginURL, [conn.playerId, data.gameId, ip, conn.lang, data.clientDomainName, data.clientType], isValidData);
    };

    this.getTestLoginURLWithOutUser.expectsData = 'platformId: String, gameId: String, clientDomainName: String';
    this.getTestLoginURLWithOutUser.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.gameId && data.clientDomainName);
        let ip = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                ip = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getTestLoginURLWithoutUser, [data.platformId, data.gameId, ip, conn.lang, data.clientDomainName, data.clientType], isValidData, false, false, true);
    };

    this.getGameUserInfo.expectsData = 'platformId: String, providerId: String';
    this.getGameUserInfo.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.platformId && data.providerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getGameUserInfo, [conn.playerId, data.platformId, data.providerId], isValidData);
    };

    // this.modifyGamePassword.expectsData = 'username: String, platformId: String, providerId: String, oldPassword: String, newPassword: String';
    // this.modifyGamePassword.onRequest = function (wsFunc, conn, data) {
    //     var isValidData = Boolean(conn.playerId && data && data.username && data.platformId && data.providerId && data.oldPassword && data.newPassword);
    //     WebSocketUtil.performAction(conn, wsFunc, data, cpmsAPI.player_modifyGamePassword, [data], isValidData);
    // };

    this.grabPlayerTransferRecords.expectsData = 'platformId: String, providerId: String';
    this.grabPlayerTransferRecords.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.platformId && data.providerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.grabPlayerTransferRecords, [conn.playerId, data.platformId, data.providerId], isValidData);
    };

    this.getFavoriteGames.expectsData = '';
    this.getFavoriteGames.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getFavoriteGames, [conn.playerId], isValidData);
    };

    this.addFavoriteGame.expectsData = 'gameId: String';
    this.addFavoriteGame.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.gameId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.addFavoriteGame, [conn.playerId, data.gameId], isValidData);
    };

    this.removeFavoriteGame.expectsData = 'gameId: String';
    this.removeFavoriteGame.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.gameId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.removeFavoriteGame, [conn.playerId, data.gameId], isValidData);
    };

    this.searchGame.expectsData = 'platformId: String';
    this.searchGame.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformGameStatus.searchGame, [data.platformId, data.name, data.type, data.groupCode, conn.playerId, data.playGameType], isValidData, false, false, true);
    };

    this.searchGameByGroup.expectsData = 'platformId: String, groups: []+';
    this.searchGameByGroup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.groups && data.groups.length > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformGameStatus.searchGameByGroup, [data.platformId, data.groups], isValidData, false, false, true);
    };

    this.getGamePassword.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.platformId && data.providerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getGameUserInfo, [conn.playerId, data.platformId, data.providerId], isValidData);
    };

    this.modifyGamePassword.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.providerId && data.newPassword);
        WebSocketUtil.performAction(conn, wsFunc, data, dbGame.modifyGamePassword, [conn.playerId, data.providerId, data.newPassword], isValidData, false, false, true);
    };

};

var proto = GameServiceImplement.prototype = Object.create(GameService.prototype);
proto.constructor = GameServiceImplement;

module.exports = GameServiceImplement;
