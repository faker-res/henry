'use strict';

const Q = require("q");
const constServerCode = require("../const/constServerCode");
const clientAPIInstance = require("../modules/clientApiInstances");

function callPMSAPI(service, functionName, data) {
    if (!data) {
        return Q.reject(new Error("Invalid data!"));
    }
    // var wsClient = serverInstance.getPaymentAPIClient();
    // if (!wsClient || !wsClient.isOpen()) {
    //     return Q.reject({
    //         status: 400,
    //         errMessage: "Invalid WebSocket client connection!  (No PMSAPI stored for this instance.)"
    //     });
    // }
    let bOpen = false;
    var deferred = Q.defer();
    //if can't connect in 30 seconds, treat as timeout
    setTimeout(function(){
        if( !bOpen ){
            return deferred.reject({
                status: constServerCode.PAYMENT_NOT_AVAILABLE,
                message: "Payment is not available"
            });
        }
    }, 10*1000);
    clientAPIInstance.createAPIConnectionInMode("PaymentAPI").then(
        con => {
            bOpen = true;
            return con.callAPIOnce(service, functionName, data).then(
                data => {
                    if (con && typeof con.disconnect == "function") {
                        con.disconnect();
                    }
                    return data;
                },
                error => {
                    if (con && typeof con.disconnect == "function") {
                        con.disconnect();
                    }
                    if (error.status) {
                        return Q.reject(error);
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.PAYMENT_NOT_AVAILABLE,
                            message: "Payment is not available",
                            error: error
                        });
                    }
                }
            );
        }
    ).then(deferred.resolve, deferred.reject);
    return deferred.promise;
};

const pmsAPI = {

    /*
     * function name format: <service>_<functionName>
     */

    //connection service
    connection_login: function (data) {
        return callPMSAPI("connection", "login", data);
    },
    connection_heartBeat: function (data) {
        return callPMSAPI("connection", "heartBeat", data);
    },

    //foundation service
    foundation_getProvinceList: function (data) {
        return callPMSAPI("foundation", "getProvinceList", data);
    },

    foundation_getCityList: function (data) {
        return callPMSAPI("foundation", "getCityList", data);
    },

    foundation_getDistrictList: function (data) {
        return callPMSAPI("foundation", "getDistrictList", data);
    },

    foundation_getBankTypeList: function (data) {
        return callPMSAPI("foundation", "getBankTypeList", data);
    },

    //platform service
    platform_add: function (data) {
        return callPMSAPI("platform", "add", data);
    },

    platform_delete: function (data) {
        return callPMSAPI("platform", "delete", data);
    },

    platform_update: function (data) {
        return callPMSAPI("platform", "update", data);
    },

    platform_syncData: function (data) {
        return callPMSAPI("platform", "syncData", data);
    },

    bonus_applyBonus: function (data) {
        return callPMSAPI("bonus", "applyBonus", data);
    },

    bonus_getBonusList: function (data) {
        return callPMSAPI("bonus", "getBonusList", data);
    },

    bonus_setBonusStatus: function (data) {
        return callPMSAPI("bonus", "setBonusStatus", data);
    },

    //payment service
    payment_requestManualBankCard: function (data) {
        return callPMSAPI("payment", "requestManualBankCard", data);
    },

    payment_requestAlipayAccount: function (data) {
        return callPMSAPI("payment", "requestAlipayAccount", data);
    },

    payment_requestOnlineMerchant: function (data) {
        return callPMSAPI("payment", "requestOnlineMerchant", data);
    },

    payment_modifyManualTopupRequest: function (data) {
        return callPMSAPI("payment", "modifyManualTopupRequest", data);
    },

    payment_setProposalIdToOnlineMerchantRequest: function (data) {
        return callPMSAPI("payment", "setProposalIdToOnlineMerchantRequest", data);
    },

    payment_setProposalIdToManualTopupRequest: function (data) {
        return callPMSAPI("payment", "setProposalIdToManualTopupRequest", data);
    },

    payment_getProvinceList: function (data) {
        return callPMSAPI("payment", "getProvinceList", data);
    },

    payment_getCityList: function (data) {
        return callPMSAPI("payment", "getCityList", data);
    },

    payment_getDistrictList: function (data) {
        return callPMSAPI("payment", "getDistrictList", data);
    },

    payment_requestClearProposalLimits: function (data) {
        return callPMSAPI("payment", "requestClearProposalLimits", data);
    },

    foundation_getProvince: function (data) {
        return callPMSAPI("foundation", "getProvince", data);
    },

    foundation_getCity: function (data) {
        return callPMSAPI("foundation", "getCity", data);
    },

    foundation_getDistrict: function (data) {
        return callPMSAPI("foundation", "getDistrict", data);
    },

    payment_getBankTypeList: function (data) {
        return callPMSAPI("payment", "getBankTypeList", data);
    },

    payment_checkExpiredManualTopup: function (data) {
        return callPMSAPI("payment", "checkExpiredManualTopup", data);
    },

    payment_requestRepairingOnlinePay: function (data) {
        return callPMSAPI("payment", "requestRepairingOnlinePay", data);
    },

    //bankcard service
    bankcard_getBankcardList: function (data) {
        return callPMSAPI("bankcard", "getBankcardList", data);
    },

    bankcard_getBankcard: function (data) {
        return callPMSAPI("bankcard", "getBankcard", data);
    },

    bankcard_getBankTypeList: function (data) {
        return callPMSAPI("bankcard", "getBankTypeList", data);
    },

    bankcard_getBankType: function (data) {
        return callPMSAPI("bankcard", "getBankType", data);
    },

    //merchant service
    merchant_getMerchantList: function (data) {
        return callPMSAPI("merchant", "getMerchantList", data);
    },

    merchant_getMerchant: function (data) {
        return callPMSAPI("merchant", "getMerchant", data);
    },

    merchant_getMerchantTypeList: function (data) {
        return callPMSAPI("merchant", "getMerchantTypeList", data);
    },

    merchant_getMerchantType: function (data) {
        return callPMSAPI("merchant", "getMerchantType", data);
    },
    //alipay service
    alipay_getAlipayList: function (data) {
        return callPMSAPI("aliPay", "getAliPayList", data);
    },

    alipay_getAlipay: function (data) {
        return callPMSAPI("aliPay", "getAliPay", data);
    },

    payment_requestCancellationPayOrder: function (data) {
        return callPMSAPI("payment", "requestCancellationPayOrder", data);
    },

    //weChat service
    weChat_getWechatList: function (data) {
        return callPMSAPI("weChat", "getWechatList", data);
    },

    weChat_getWechat: function (data) {
        return callPMSAPI("weChat", "getWechat", data);
    },

    payment_requestWeChatAccount: function (data) {
        return callPMSAPI("payment", "requestWeChatAccount", data);
    },

    payment_requestWeChatQRAccount: function (data) {
        return callPMSAPI("payment", "requestWeChatQRAccount", data);
    },

    //quickPayment service
    quickPayment_getQuickPaymentList: function (data) {
        return callPMSAPI("quickPayment", "getQuickPaymentList", data);
    },

    quickPayment_getQuickPayment: function (data) {
        return callPMSAPI("quickPayment", "getQuickPayment", data);
    },

    payment_requestQuickPaymentList: function (data) {
        return callPMSAPI("payment", "requestQuickPaymentAccount", data);
    },

    payment_requestMfbAccount: function (data) {
        return callPMSAPI("payment", "requestMfbAccount", data);
    },

    reconciliation_getOnlineCashinList: function (data) {
        return callPMSAPI("reconciliation", "getOnlineCashinList", data);
    },

    reconciliation_getCashinList: function (data) {
        return callPMSAPI("reconciliation", "getCashinList", data);
    },

    reconciliation_getCashoutList: function (data) {
        return callPMSAPI("reconciliation", "getCashoutList", data);
    },

};

module.exports = pmsAPI;