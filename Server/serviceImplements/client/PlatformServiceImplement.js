const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PlatformService = require("./../../services/client/ClientServices").PlatformService;
const dbPlatform = require('./../../db_modules/dbPlatform');
const dbPlatformAnnouncement = require("../../db_modules/dbPlatformAnnouncement");
const dbUtility = require('./../../modules/dbutility');

var PlatformServiceImplement = function () {
    PlatformService.call(this);

    this.getPlatformDetails.expectsData = 'platformId: String';
    this.getPlatformDetails.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        data = data || {};
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getPlatform, [{platformId:data.platformId}], isValidData, null, null, true);
    };

    this.getPlatformAnnouncements.expectsData = 'platformId: String';
    this.getPlatformAnnouncements.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        data = data || {};
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformAnnouncement.getPlatformAnnouncementsByPlatformId, [{platformId: data.platformId}], isValidData, null, null, true);
    };

    this.getConfig.expectsData = 'platformId: String';
    this.getConfig.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        data = data || {};

        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent'], false);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getConfig, [data.platformId,inputDevice], isValidData, null, null, true);
    };

    this.getLiveStream.expectsData = '';
    this.getLiveStream.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        data = data || {};
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getLiveStream, [conn.playerObjId], isValidData, null, null, true);
    };

    this.playerPhoneChat.onRequest = function (wsFunc, conn, data) {
        data = data || {};
        let isValidData = Boolean(data && data.platform && data.phone && data.captcha && data.random);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.playerPhoneChat, [data.platform, data.phone, data.captcha, data.random], isValidData, null, null, true);
    };

};

var proto = PlatformServiceImplement.prototype = Object.create(PlatformService.prototype);
proto.constructor = PlatformServiceImplement;

module.exports = PlatformServiceImplement;

