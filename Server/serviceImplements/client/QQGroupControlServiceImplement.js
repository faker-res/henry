const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const QQGroupControlService = require("./../../services/client/ClientServices").QQGroupControlService;
const dbQQGroupControl = require('./../../db_modules/dbQQGroupControl');

var QQGroupControlServiceImplement = function () {
    QQGroupControlService.call(this);

    this.sendQQGroupControlSessionToFPMS.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data.deviceId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbQQGroupControl.sendQQGroupControlSessionToFPMS, [data.deviceId, data.adminId, data.status, data.connectionAbnormalClickTimes, data.qqVersion], isValidData, false, false, true);
    };

    this.sendQQConversationToFPMS.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data.deviceId && data.playerQQRemark);
        WebSocketUtil.performAction(conn, wsFunc, data, dbQQGroupControl.sendQQConversationToFPMS, [data.deviceId, data.playerQQRemark, data.csReplyTime, data.csReplyContent], isValidData, false, false, true);
    };

    this.bindPlayerQQInfo.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data.deviceId && data.playerQQRemark && data.playerQQId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbQQGroupControl.bindPlayerQQInfo, [data.deviceId, data.playerQQRemark, data.playerQQId, data.playerQQNickname], isValidData, false, false, true);
    };
};

var proto = QQGroupControlServiceImplement.prototype = Object.create(QQGroupControlService.prototype);
proto.constructor = QQGroupControlServiceImplement;

module.exports = QQGroupControlServiceImplement;

