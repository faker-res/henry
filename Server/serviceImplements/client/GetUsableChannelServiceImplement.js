const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const GetUsableChannelService = require("./../../services/sms/SMSServices").GetUsableChannelService;
const dbPlatform = require('./../../db_modules/dbPlatform');

let GetUsableChannelServiceImplement = function () {
    GetUsableChannelService.call(this);

    this.getUsableChannelList.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getUsableChannelList, [data.platformId], isValidData, null, null, true);
    };
};

var proto = GetUsableChannelServiceImplement.prototype = Object.create(GetUsableChannelService.prototype);
proto.constructor = GetUsableChannelServiceImplement;

module.exports = GetUsableChannelServiceImplement;

