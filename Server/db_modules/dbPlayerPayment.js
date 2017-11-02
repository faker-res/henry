const dbconfig = require('./../modules/dbproperties');
const pmsAPI = require("../externalAPI/pmsAPI.js");
const serverInstance = require("../modules/serverInstance");
const constPlayerTopUpTypes = require("../const/constPlayerTopUpType.js");
const Q = require("q");

const dbPlayerPayment = {

    /**
     * Get player alipay top up max amount
     * @param {String} playerId - The data of the PlayerTrustLevel. Refer to PlayerTrustLevel schema.
     */
    getAlipaySingleLimit: (playerId) => {
        let playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}
        ).lean().then(
            data => {
                if (data && data.platform && data.alipayGroup) {
                    playerData = data;
                    return pmsAPI.alipay_getAlipayList({
                        platformId: data.platform.platformId,
                        queryId: serverInstance.getQueryId()
                    });
                } else {
                    return Q.reject({name: "DataError", message: "Invalid player data"})
                }
            }
        ).then(
            alipays => {
                let bValid = false;
                let singleLimit = 0;
                if (alipays && alipays.data && alipays.data.length > 0) {
                    alipays.data.forEach(
                        alipay => {
                            playerData.alipayGroup.alipays.forEach(
                                pAlipay => {
                                    if (pAlipay == alipay.accountNumber && alipay.state == "NORMAL") {
                                        bValid = true;
                                        if (alipay.singleLimit > singleLimit) {
                                            singleLimit = alipay.singleLimit;
                                        }
                                    }
                                }
                            );
                        }
                    );
                }
                return {bValid: bValid, singleLimit: singleLimit};
            }
        );
    },

    getMerchantSingleLimits: (playerId) => {
        let playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).lean().then(
            data => {
                if (data && data.platform && data.merchantGroup) {
                    playerData = data;
                    return pmsAPI.merchant_getMerchantList({
                        platformId: data.platform.platformId,
                        queryId: serverInstance.getQueryId()
                    });
                } else {
                    return Q.reject({name: "DataError", message: "Invalid player data"})
                }
            }
        ).then(
            merchantsFromPms => {
                let bValid = false;
                let singleLimitList = {wechat: 0, alipay: 0};
                if (merchantsFromPms && merchantsFromPms.merchants && merchantsFromPms.merchants.length > 0) {
                    merchantsFromPms.merchants.forEach(
                        merchantFromPms => {
                            playerData.merchantGroup.merchants.forEach(
                                merchantNoFromGroup => {
                                    if (merchantNoFromGroup == merchantFromPms.merchantNo && merchantFromPms.status == "ENABLED") {
                                        bValid = true;
                                        if (merchantFromPms.topupType && merchantFromPms.topupType == constPlayerTopUpTypes.ONLINE) {
                                            if (merchantFromPms.permerchantLimits > singleLimitList.wechat) {
                                                singleLimitList.wechat = merchantFromPms.permerchantLimits;
                                            }
                                        }
                                        else if (merchantFromPms.topupType && merchantFromPms.topupType == constPlayerTopUpTypes.ALIPAY) {
                                            if (merchantFromPms.permerchantLimits > singleLimitList.alipay) {
                                                singleLimitList.alipay = merchantFromPms.permerchantLimits;
                                            }
                                        }
                                    }
                                }
                            );
                        }
                    );
                }
                return {bValid: bValid, singleLimitList: singleLimitList};
            }
        );
    },

    getAlipayDailyLimit: (playerId, accountNumber) => {
        let playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}
        ).lean().then(
            data => {
                if (data && data.platform && data.alipayGroup) {
                    playerData = data;
                    return pmsAPI.alipay_getAlipayList({
                        platformId: data.platform.platformId,
                        queryId: serverInstance.getQueryId()
                    });
                } else {
                    return Q.reject({name: "DataError", message: "Invalid player data"})
                }
            }
        ).then(
            alipays => {
                let bValid = false;
                let quota = 0;
                if (alipays && alipays.data && alipays.data.length > 0) {
                    alipays.data.forEach(
                        alipay => {
                                    if (accountNumber == alipay.accountNumber) {
                                        bValid = true;
                                        quota = alipay.quota;
                                    }
                        }
                    );
                }
                return {bValid: bValid, quota: quota};
            }
        );
    },
    getMerchantDailyLimits: (playerId, merchantNo) => {
        let playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).lean().then(
            data => {
                if (data && data.platform && data.merchantGroup) {
                    playerData = data;
                    return pmsAPI.merchant_getMerchantList({
                        platformId: data.platform.platformId,
                        queryId: serverInstance.getQueryId()
                    });
                } else {
                    return Q.reject({name: "DataError", message: "Invalid player data"})
                }
            }
        ).then(
            merchantsFromPms => {
                let bValid = false;
                let quota = 0;
                if (merchantsFromPms && merchantsFromPms.merchants && merchantsFromPms.merchants.length > 0) {
                    merchantsFromPms.merchants.forEach(
                        merchantFromPms => {
                            if (merchantNo == merchantFromPms.merchantNo) {
                                bValid = true;
                                quota = merchantFromPms.transactionForPlayerOneDay || 0;
                            }
                        }
                    );
                }
                return {bValid: bValid, quota: quota};
            }
        );
    }
};

module.exports = dbPlayerPayment;