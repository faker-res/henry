var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ConnectionService = require("./../../services/provider/ProviderServices").ConnectionService;
var dbApiUser = require('./../../db_modules/db-api-user');
var constServerCode = require("../../const/constServerCode");

var ConnectionServiceImplement = function () {
    ConnectionService.call(this);
    var self = this;

    this.login.expectsData = 'name: String, password: String';
    this.login.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.password);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbApiUser.apiUserLogin, [data], isValidData, true, false, true).then(
            function (res) {
                if (res) {
                    conn.isAuth = true;
                    // conn.role = data.role;
                    // conn.name = data.name;
                    if (conn.role == "API") {
                        var services = self._wss._clientServices;
                        for (var i = 0; i < services.length; i++) {
                            services[i].setConnection(conn);
                        }
                    }
                }
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
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