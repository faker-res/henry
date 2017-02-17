/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

'user strict'

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
    return clientAPIInstance.createAPIConnectionInMode("PaymentAPI").then(
        con => {
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
    );
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

};

module.exports = pmsAPI;