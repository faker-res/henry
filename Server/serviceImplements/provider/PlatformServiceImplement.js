/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PlatformService = require("./../../services/provider/ProviderServices").PlatformService;
var dbPlatform = require('./../../db_modules/dbPlatform');

var PlatformServiceImplement = function () {
    PlatformService.call(this);

    this.getPlatformList.expectsData = '';
    this.getPlatformList.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data,dbPlatform.getPlatformAPI, [{}], true);
    };

    this.getPlatform.expectsData = 'platformId';
    this.getPlatform.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.hasOwnProperty("platformId"));
        WebSocketUtil.performAction(conn, wsFunc, data,dbPlatform.getPlatform, [{platformId: data.platformId}], isValidData);
    };

    this.addProvider.expectsData = 'platformId';
    this.addProvider.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean (data && data.providerId && data.hasOwnProperty("platformId"));
        WebSocketUtil.performAction(conn, wsFunc, data,dbPlatform.addProviderToPlatform, [data.platformId, data.providerId ], isValidData);
    };

    this.removeProvider.expectsData = 'platformId';
    this.removeProvider.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean (data && data.providerId && data.hasOwnProperty("platformId"));
        WebSocketUtil.performAction(conn, wsFunc, data,dbPlatform.removeProviderFromPlatform, [data.platformId, data.providerId], isValidData);
    };

    this.syncProviders.expectsData = 'platformProviders: []+';
    this.syncProviders.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean (data && data.platformProviders && data.platformProviders.length > 0);
        WebSocketUtil.performAction(conn, wsFunc, data,dbPlatform.syncProviders, [data.platformProviders], isValidData);
    };

    this.isUserExist.expectsData = 'platformId, username: String';
    this.isUserExist.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean (data && data.hasOwnProperty("platformId") && data.username);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.isPlatformUserExist, [data.platformId, data.username], isValidData);
    };

    this.getConsumptionIncentivePlayer.expectsData = 'platformId';
    this.getConsumptionIncentivePlayer.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean (data && data.hasOwnProperty("platformId"));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getConsumptionIncentivePlayer, [data.platformId], isValidData);
    };

};

var proto = PlatformServiceImplement.prototype = Object.create(PlatformService.prototype);
proto.constructor = PlatformServiceImplement;

module.exports = PlatformServiceImplement;
