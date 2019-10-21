const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PlatformService = require("./../../services/client/ClientServices").PlatformService;
const dbPlatform = require('./../../db_modules/dbPlatform');
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPlayerFeedback = require('./../../db_modules/dbPlayerFeedback');
const dbPlatformAnnouncement = require("../../db_modules/dbPlatformAnnouncement");
const dbUtility = require('./../../modules/dbutility');
const dbPlayerConsumptionRecord = require('./../../db_modules/dbPlayerConsumptionRecord');
const constSystemParam = require('../../const/constSystemParam');
const constPlayerRegistrationInterface = require('../../const/constPlayerRegistrationInterface');
const dbSmsGroup = require('./../../db_modules/dbSmsGroup');
const dbWCGroupControl = require('./../../db_modules/dbWCGroupControl');
const rsaCrypto = require('./../../modules/rsaCrypto');

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
        let inputData = {}
        if(data.platformId){
            inputData.platformId = data.platformId;
        }
        if(data.reach){
            inputData.reach = data.reach;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformAnnouncement.getPlatformAnnouncementsByPlatformId, [inputData], isValidData, null, null, true);
    };

    this.getConfig.expectsData = 'platformId: String';
    this.getConfig.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        data = data || {};

        if(!data.device){
            data.device = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent'], false);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getConfig, [data.platformId, data.device, 'player'], isValidData, null, null, true);
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
        if( !data.startTime || (new Date().getTime() - new Date(data.startTime).getTime() > 24 * 60 * 1000 * 1000) ){
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
        let ipAddress = dbUtility.getIpAddress(conn);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.createClickCountLog, [data.platformId, data.device, data.pageName, data.buttonName, data.registerClickApp,
            data.registerClickWeb, data.registerClickH5, ipAddress, data.domain], isValidData, null, null, true);
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

    // Create player from DX system
    this.createPlayerFromTel.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.playerAccount && data.password && data.platformId && data.phoneNumber
            && data.playerType && data.telSalesName && data.promoMethod && data.fame && data.chatRecordResult
            && data.chatRecordTitle);
        data.name = data.playerAccount;
        // Promise create player and partner
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerFromTel, [data], isValidData, null, null, true);
    };

    this.extractUserFromFpms.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.proposalId);
        let ipAddress = conn.upgradeReq.connection.remoteAddress || '';
        console.log("extractUserFromFpms ip:", ipAddress);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerFeedback.getExportedData, [data.proposalId, ipAddress], isValidData, null, null, true);
    };

    this.getUserInfoFromPopUp.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data);

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.savePlayerInformationFromPopUp, [data], isValidData, null, null, true);
    };

    this.getPlatformSetting.expectsData = 'platformId: String';
    this.getPlatformSetting.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        data = data || {};
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getBasicPlatformSetting, [{platformId:data.platformId}], isValidData, null, null, true);
    };

    this.turnUrlToQr.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.targetUrl);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.turnUrlToQr, [data.targetUrl], isValidData, null, null, true);
    };

    this.getTemplateSetting.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getTemplateSetting, [data.platformId, data.url], isValidData, null, null, true);
    };

    this.addIpDomainLog.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.domain);
        let ipAddress = dbUtility.getIpAddress(conn);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.addIpDomainLog, [data.platformId, data.domain, ipAddress, data.sourceUrl, data.partnerId], isValidData, null, null, true);
    };

    this.getIDCIpDetail.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.ipAddress);
        WebSocketUtil.performAction(conn, wsFunc, data, dbUtility.getIDCIpDetail, [data.ipAddress], isValidData, null, null, true);
    };

    this.getLockedLobbyConfig.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getLockedLobbyConfig, [data.platformId], isValidData, null, null, true);
    };

    this.saveFrontEndData.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.token && data.page && data.data && typeof data.data == "string");
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.saveFrontEndData, [data.platformId, data.token, data.page, data.data], isValidData, null, null, true);
    };

    this.getFrontEndData.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.page);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getFrontEndData, [data.platformId, data.page], isValidData, null, null, true);
    };

    this.getFrontEndConfig.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.hasOwnProperty('platformId') && data.code);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getFrontEndConfig, [data.platformId, data.code, data.clientType], isValidData, null, null, true);
    };

    this.sendFileFTP.onRequest = function(wsFunc, conn, data) {
        console.log("check FTP WS DATA --------------", data);
        let isValidData = Boolean(data.platformId && data.token && data.fileName && data.fileStream);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.sendFileFTP, [data.platformId, data.token, data.fileStream, data.fileName], isValidData, null, null, true);
    };

    this.updateRSAKeys.addListener(() => rsaCrypto.refreshKeys());
};

var proto = PlatformServiceImplement.prototype = Object.create(PlatformService.prototype);
proto.constructor = PlatformServiceImplement;

module.exports = PlatformServiceImplement;

