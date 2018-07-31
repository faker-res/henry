const dbconfig = require('./../modules/dbproperties');
const pmsAPI = require("../externalAPI/pmsAPI.js");
const serverInstance = require("../modules/serverInstance");
const constPlayerTopUpTypes = require("../const/constPlayerTopUpType.js");
const constProposalType = require('./../const/constProposalType');
const Q = require("q");
const errorUtils = require('./../modules/errorUtils');
const ObjectId = require('mongoose').Types.ObjectId;

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
                    let platformData = playerData.platform;
                    if (platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) {
                        return dbconfig.collection_platformAlipayList.find({accountNumber: {$in: playerData.alipayGroup.alipays}}).lean().then(
                            alipayListData => {
                                return {data: alipayListData}
                            }
                        )
                    } else {
                        return pmsAPI.alipay_getAlipayList({
                            platformId: data.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        });
                    }
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
    },

    requestBankTypeByUserName: function (playerId, clientType, userIp, supportMode) {
        let playerObj;
        let returnData;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            playerData => {
                if( playerData ){
                    playerObj = playerData;
                    if( playerData.permission.topupManual){
                        return pmsAPI.foundation_requestBankTypeByUsername(
                            {
                                queryId: serverInstance.getQueryId(),
                                platformId: playerData.platform.platformId,
                                username: playerData.name,
                                ip: userIp,
                                supportMode: supportMode
                            }
                        );
                    }
                    else{
                        return [];
                    }
                }
                else{
                    return Q.reject({name: "DataError", message: "Cannot find player"})
                }
            }
        ).then(
            bankData => {
                let promDeposit1,promDeposit2,promDeposit3;
                returnData = bankData;
                let manualTopUpProposal = (depositMethod) => {
                    let proposalQuery = {
                        'data.playerObjId': {$in: [ObjectId(playerObj._id), String(playerObj._id)]},
                        'data.platformId': {$in: [ObjectId(playerObj.platform._id), String(playerObj.platform._id)]},
                        'data.depositMethod': {$in: [depositMethod, parseInt(depositMethod)]},
                    };

                    return dbconfig.collection_proposalType.findOne({
                        platformId: playerObj.platform._id,
                        name: constProposalType.PLAYER_MANUAL_TOP_UP
                    }).lean().then(
                        proposalType => {
                            proposalQuery.type = proposalType._id;
                            return dbconfig.collection_proposal.findOne(proposalQuery).sort({createTime: -1}).lean();
                        }
                    )
                }

                if (returnData && returnData.data) {
                    for (let i = 0; i < returnData.data.length; i++) {
                        if (returnData.data[i].depositMethod) {
                            if (returnData.data[i].depositMethod == "1") {
                                promDeposit1 = manualTopUpProposal("1")
                            } else if (returnData.data[i].depositMethod == "2") {
                                promDeposit2 = manualTopUpProposal("2")
                            } else if (returnData.data[i].depositMethod == "3") {
                                promDeposit3 = manualTopUpProposal("3")
                            }
                        }
                    }
                }
                return Promise.all([promDeposit1, promDeposit2, promDeposit3]);
            }
        ).then(
            lastProposalData => {
                if (returnData && returnData.data) {
                    for (let j = 0; j < returnData.data.length; j++) {
                        if (returnData.data[j].depositMethod) {
                            if (returnData.data[j].depositMethod == "1") {
                                returnData.data[j].lastOnlineBankingName = lastProposalData[0] && lastProposalData[0].data && lastProposalData[0].data.realName ? lastProposalData[0].data.realName : "";
                            } else if (returnData.data[j].depositMethod == "2") {
                                returnData.data[j].lastDepositProviceId = lastProposalData[1] && lastProposalData[1].data && lastProposalData[1].data.provinceId ? lastProposalData[1].data.provinceId : "";
                                returnData.data[j].lastDepositCityId = lastProposalData[1] && lastProposalData[1].data && lastProposalData[1].data.cityId ? lastProposalData[1].data.cityId : "";
                            } else if (returnData.data[j].depositMethod == "3") {
                                returnData.data[j].lastDepositorName = lastProposalData[2] && lastProposalData[2].data && lastProposalData[2].data.realName ? lastProposalData[2].data.realName : "";
                            }
                        }
                    }
                }
                return returnData;
            }
        ).catch(() => {});
    }

};

module.exports = dbPlayerPayment;
