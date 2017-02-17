var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PaymentDataService = require("./../../services/payment/PaymentServices").PaymentDataService;
var dbApiUser = require('./../../db_modules/db-api-user');
var constServerCode = require("../../const/constServerCode");
var dbPlatformMerchantGroup = require("../../db_modules/dbPlatformMerchantGroup");
var dbPlatformBankCardGroup = require("../../db_modules/dbPlatformBankCardGroup");
var dbPlatformAlipayGroup = require("../../db_modules/dbPlatformAlipayGroup");

var PaymentDataServiceImplement = function () {
    PaymentDataService.call(this);

    this.deleteMerchant.expectsData = 'merchantNo: String';
    this.deleteMerchant.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.merchantNo);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformMerchantGroup.deleteMerchant, [data.merchantNo], isValidData);
    };

    this.deleteBankcard.expectsData = 'accountNumber: String';
    this.deleteBankcard.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.accountNumber);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformBankCardGroup.deleteBankcard, [data.accountNumber], isValidData);
    };

    this.deleteAlipay.expectsData = 'accountNumber: String';
    this.deleteAlipay.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.accountNumber);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformAlipayGroup.deleteAlipay, [data.accountNumber], isValidData);
    };

};

var proto = PaymentDataServiceImplement.prototype = Object.create(PaymentDataService.prototype);
proto.constructor = PaymentDataServiceImplement;

module.exports = PaymentDataServiceImplement;