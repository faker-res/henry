var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var AdminService = require("./../../services/provider/ProviderServices").AdminService;
var dbAdminInfo = require('./../../db_modules/dbAdminInfo');
var constServerCode = require("../../const/constServerCode");
var constSystemParam = require('./../../const/constSystemParam');
var encrypt = require('./../../modules/encrypt');

var AdminServiceImplement = function () {
    AdminService.call(this);

    this.login.expectsData = 'name: String, password: String';
    this.login.onRequest = function (wsFunc, conn, data) {
        data = data || {};
        data.name = data.name || "";
        var isValidData = Boolean(data && data.name && data.password);

        WebSocketUtil.responsePromise(conn, wsFunc, data, dbAdminInfo.getFullAdminInfo, [{adminName: data.name.toLowerCase()}], isValidData, true, false, true).then(
            function (adminData) {
                if (adminData){
                    if (encrypt.validateHash(adminData.password, data.password)) {
                        wsFunc.response(conn, {
                            status: constServerCode.SUCCESS,
                            data: true
                        });
                    }
                    else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_USER_PASSWORD,
                            errorMessage: "Password Invalid"
                        });
                    }
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_DATA,
                        errorMessage: "User not found"
                    });
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };


};

var proto = AdminServiceImplement.prototype = Object.create(AdminService.prototype);
proto.constructor = AdminServiceImplement;

module.exports = AdminServiceImplement;


