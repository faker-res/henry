const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const OtherService = require("./../../services/others/OtherServices").OtherServices;
const dbUtility = require('./../../modules/dbutility');

let OtherServiceImplement = function(){
    OtherService.call(this);

    this.encryptMessage.expectsData = 'message: String';
    this.encryptMessage.onRequest = function(wsFunc, conn, data){
        let isValidData = Boolean(data && data.message);
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbUtility.encryptMessage, [data.message], isValidData, false, false, true
        );
    };
};

let proto = OtherServiceImplement.prototype = Object.create(OtherService.prototype);
proto.constructor = OtherServiceImplement;

module.exports = OtherServiceImplement;
