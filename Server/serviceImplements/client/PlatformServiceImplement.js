/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PlatformService = require("./../../services/client/ClientServices").PlatformService;
var dbPlatform = require('./../../db_modules/dbPlatform');
var dbPlatformAnnouncement = require("../../db_modules/dbPlatformAnnouncement");

var PlatformServiceImplement = function () {
    PlatformService.call(this);

    this.getPlatformDetails.expectsData = 'platformId: String';
    this.getPlatformDetails.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        data = data || {};
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getPlatform, [{platformId:data.platformId}], isValidData, null, null, true);
    };

    this.getPlatformAnnouncements.expectsData = 'platformId: String';
    this.getPlatformAnnouncements.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        data = data || {};
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformAnnouncement.getPlatformAnnouncementsByPlatformId, [{platformId: data.platformId}], isValidData, null, null, true);
    };

};

var proto = PlatformServiceImplement.prototype = Object.create(PlatformService.prototype);
proto.constructor = PlatformServiceImplement;

module.exports = PlatformServiceImplement;

