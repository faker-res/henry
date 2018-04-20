var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var DXMissionService = require("./../../services/client/ClientServices").DXMissionService;
var dbDxMission = require('./../../db_modules/dbDXMission');
var constServerCode = require('./../../const/constServerCode');
const uaParser = require('ua-parser-js');
const geoip = require('geoip-lite');

var DXMissionServiceImplement = function () {
    DXMissionService.call(this);

    this.getDxMission.expectsData = '';
    this.getDxMission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.getDxMission, [{playerId: conn.playerId}], isValidData);
    };

    this.createDxMission.expectsData = '';
    this.createDxMission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.createDxMission, [{playerId: conn.playerId}], isValidData);
    };

    this.updateDxMission.expectsData = '';
    this.updateDxMission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.updateDxMission, [{playerId: conn.playerId}], isValidData);
    }

    this.submitDXCode.expectsData = '';
    this.submitDXCode.onRequest = function (wsFunc, conn, data) {
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        var userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || '',
            os: ua.os.name || ''
        }];
        // var userAgentString = uaString;

        var lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp && forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                lastLoginIp = forwardedIp[0].trim();
            }
        }
        var loginIps = [lastLoginIp];

        var country, city, longitude, latitude;
        var geo = geoip.lookup(data.lastLoginIp);
        if (geo) {
            country = geo.country;
            city = geo.city;
            longitude = geo.ll ? geo.ll[1] : null;
            latitude = geo.ll ? geo.ll[0] : null;
        }
        var deviceData = {userAgent, lastLoginIp, loginIps, country, city, longitude, latitude};

        if (data.domain) {
            data.domain = data.domain.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "").replace("www.", "");
        }

        var isValidData = Boolean(data && data.code);
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.createPlayerFromCode, [data.code, deviceData, data.domain], isValidData, false, false, true);
    };

    this.insertPhoneToTask.expectsData = '';
    this.insertPhoneToTask.onRequest = function (wsFunc, conn, data) {
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        var userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || '',
            os: ua.os.name || ''
        }];
        // var userAgentString = uaString;

        var lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp && forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                lastLoginIp = forwardedIp[0].trim();
            }
        }
        var loginIps = [lastLoginIp];

        var country, city, longitude, latitude;
        var geo = geoip.lookup(data.lastLoginIp);
        if (geo) {
            country = geo.country;
            city = geo.city;
            longitude = geo.ll ? geo.ll[1] : null;
            latitude = geo.ll ? geo.ll[0] : null;
        }
        var deviceData = {userAgent, lastLoginIp, loginIps, country, city, longitude, latitude};
        let isBackStageGenerated = false;
        let smsChannel = 2;

        var isValidData = Boolean(data && data.platformId && data.phoneNumber && data.taskName && data.autoSMS);
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.insertPhoneToTask, [deviceData, data.platformId.trim(), data.phoneNumber.trim(), data.taskName.trim(), data.autoSMS.trim(), isBackStageGenerated, smsChannel], isValidData, false, false, true);
    };

};

var proto = DXMissionServiceImplement.prototype = Object.create(DXMissionService.prototype);
proto.constructor = DXMissionServiceImplement;

module.exports = DXMissionServiceImplement;
