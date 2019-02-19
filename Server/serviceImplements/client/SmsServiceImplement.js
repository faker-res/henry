const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const SmsService = require("./../../services/sms/SMSServices").GetUsableChannelService;
const dbPlatform = require('./../../db_modules/dbPlatform');

let SmsServiceImplement = function () {
    SmsService.call(this);

    this.getUsableChannelList.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getUsableChannelList, [data.platformId], isValidData, null, null, true);
    };
};

var proto = SmsServiceImplement.prototype = Object.create(SmsService.prototype);
proto.constructor = SmsServiceImplement;

module.exports = SmsServiceImplement;
