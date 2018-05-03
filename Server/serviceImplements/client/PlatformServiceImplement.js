const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PlatformService = require("./../../services/client/ClientServices").PlatformService;
const dbPlatform = require('./../../db_modules/dbPlatform');
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPlatformAnnouncement = require("../../db_modules/dbPlatformAnnouncement");
const dbUtility = require('./../../modules/dbutility');
const dbPlayerConsumptionRecord = require('./../../db_modules/dbPlayerConsumptionRecord');
const constSystemParam = require('../../const/constSystemParam');
const constPlayerRegistrationInterface = require('../../const/constPlayerRegistrationInterface');
const dbSmsGroup = require('./../../db_modules/dbSmsGroup');

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

        if(!data.device){
            data.device = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent'], false);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getConfig, [data.platformId,data.device], isValidData, null, null, true);
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

    this.searchConsumptionRecord.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(data && data.platformId);
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.REPORT_MAX_RECORD_NUM;
        if(data.requestCount > constSystemParam.REPORT_MAX_RECORD_NUM){
            data.requestCount = constSystemParam.REPORT_MAX_RECORD_NUM;
        }
        if( !data.startTime || new Date(data.startTime).getTime() - new Date().getTime() > 24 * 60 * 1000 * 1000 ){
            data.startTime =  new Date(new Date().getTime() - 24 * 60 * 1000 * 1000);
        }
        data.minBonusAmount = data.minBonusAmount || 0;
        if(data.minBonusAmount < 0){
            data.minBonusAmount = 0;
        }
        data.endTime = data.endTime || new Date();
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbPlayerConsumptionRecord.searchPlatformConsumption,
            [data.platformId, data.startTime, data.endTime, data.startIndex, data.requestCount, data.minBonusAmount, data.minAmount, data.minValidAmount, data.isRanking], isValidData, null, null, true
        );
    };

    this.verifyUserPasswordWithTransferIn.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.loginname && data.password && data.platformId && data.providerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.verifyUserPasswordWithTransferIn, [data.loginname, data.password, data.platformId, data.providerId], isValidData, null, null, true);
    };

    this.clickCount.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.device && data.pageName && data.buttonName);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.createClickCountLog, [data.platformId, data.device, data.pageName, data.buttonName], isValidData, null, null, true);
    };

    this.getPlatformSmsGroups.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbSmsGroup.getPlatformSmsGroups, [data.platformObjId], isValidData, null, null, true);
    };

    this.getClientData.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getClientData, [data.platformId], isValidData, null, null, true);
    };

    this.saveClientData.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.clientData && typeof data.clientData == "string");
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.saveClientData, [data.platformId, data.clientData], isValidData, null, null, true);
    };
};

var proto = PlatformServiceImplement.prototype = Object.create(PlatformService.prototype);
proto.constructor = PlatformServiceImplement;

module.exports = PlatformServiceImplement;

