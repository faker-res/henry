var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ConnectionService = require("./../../services/client/ClientServices").ConnectionService;
var constServerCode = require("../../const/constServerCode");

var ConnectionServiceImplement = function () {
    ConnectionService.call(this);
    var self = this;
    this.setLang.expectsData = 'lang';
    this.setLang.onRequest = function (wsFunc, conn, data) {
        conn.lang = data.lang;
        var resObj = {status: constServerCode.SUCCESS, data: data};
        wsFunc.response(conn, resObj, data);
    };
};

var proto = ConnectionServiceImplement.prototype = Object.create(ConnectionService.prototype);
proto.constructor = ConnectionServiceImplement;

module.exports = ConnectionServiceImplement;