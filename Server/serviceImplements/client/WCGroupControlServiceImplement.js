const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const WCGroupControlService = require("./../../services/client/ClientServices").WCGroupControlService;
const dbWCGroupControl = require('./../../db_modules/dbWCGroupControl');

var WCGroupControlServiceImplement = function () {
    WCGroupControlService.call(this);

    this.sendWCGroupControlSessionToFPMS.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data.deviceId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbWCGroupControl.sendWCGroupControlSessionToFPMS, [data.deviceId, data.adminId, data.status, data.connectionAbnormalClickTimes], isValidData, false, false, true);
    };

    this.sendWechatConversationToFPMS.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data.deviceId && data.playerWechatRemark);
        WebSocketUtil.performAction(conn, wsFunc, data, dbWCGroupControl.sendWechatConversationToFPMS, [data.deviceId, data.playerWechatRemark, data.csReplyTime, data.csReplyContent], isValidData, false, false, true);
    };

    this.bindPlayerWechatInfo.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data.deviceId && data.playerWechatRemark && data.playerWechatId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbWCGroupControl.bindPlayerWechatInfo, [data.deviceId, data.playerWechatRemark, data.playerWechatId, data.playerWechatNickname], isValidData, false, false, true);
    };
};

var proto = WCGroupControlServiceImplement.prototype = Object.create(WCGroupControlService.prototype);
proto.constructor = WCGroupControlServiceImplement;

module.exports = WCGroupControlServiceImplement;

