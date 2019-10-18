var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ConnectionService = require("./../../services/payment/PaymentServices").ConnectionService;
var dbApiUser = require('./../../db_modules/db-api-user');
var constServerCode = require("../../const/constServerCode");

var ConnectionServiceImplement = function () {
    ConnectionService.call(this);

    this.login.expectsData = 'name: String, password: String, [userName]: String';
    this.login.onRequest = function (wsFunc, conn, data) {
        // @todo This looks wrong: 'name' is required, but 'userName' will override it if present!
        var isValidData = Boolean(data && data.name && data.password);
        data.userName = data.userName || data.name;
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbApiUser.apiUserLogin, [data], isValidData, true, false, true).then(
            function (data) {
                if (data) {
                    conn.isAuth = true;
                }
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: data
                });
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.heartBeat.expectsData = 'currentTime: Date';
    this.heartBeat.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.currentTime);
        if (isValidData) {
            wsFunc.response(conn, {
                status: constServerCode.SUCCESS,
                data: {"currentTime": data.currentTime}
            });
        } else {
            wsFunc.response(conn, {
                status: constServerCode.INVALID_DATA,
                data: {}
            });
        }


    }

};

var proto = ConnectionServiceImplement.prototype = Object.create(ConnectionService.prototype);
proto.constructor = ConnectionServiceImplement;

module.exports = ConnectionServiceImplement;