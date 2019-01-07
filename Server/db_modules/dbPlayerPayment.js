const Q = require("q");
const rp = require('request-promise');
const errorUtils = require('./../modules/errorUtils');
const ObjectId = require('mongoose').Types.ObjectId;

const env = require('../config/env').config();

const pmsAPI = require("../externalAPI/pmsAPI.js");

const dbconfig = require('./../modules/dbproperties');
const dbUtil = require("../modules/dbutility");
const serverInstance = require("../modules/serverInstance");

const constDepositMethod = require('./../const/constDepositMethod');
const constPlayerTopUpType = require("../const/constPlayerTopUpType.js");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalType = require('./../const/constProposalType');
const constProposalUserType = require('../const/constProposalUserType');
const constRewardType = require('../const/constRewardType');
const constServerCode = require("../const/constServerCode");

const dbRewardUtil = require("../db_common/dbRewardUtility")

const dbPromoCode = require('../db_modules/dbPromoCode');
const dbProposal = require('../db_modules/dbProposal');

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
                        return dbconfig.collection_platformAlipayList.find({accountNumber: {$in: playerData.alipayGroup.alipays}, isFPMS: true}).lean().then(
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
                    return Promise.reject({name: "DataError", message: "Invalid player data"})
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
                                        if (merchantFromPms.topupType && merchantFromPms.topupType == constPlayerTopUpType.ONLINE) {
                                            if (merchantFromPms.permerchantLimits > singleLimitList.wechat) {
                                                singleLimitList.wechat = merchantFromPms.permerchantLimits;
                                            }
                                        }
                                        else if (merchantFromPms.topupType && merchantFromPms.topupType == constPlayerTopUpType.ALIPAY) {
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
        ).populate(
            {path: "bankCardGroup", model: dbconfig.collection_platformBankCardGroup}
        ).lean().then(
            playerData => {
                if( playerData ){
                    playerObj = playerData;
                    let platformData = playerData.platform;
                    if (platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) {
                        let accountArr = playerObj.bankCardGroup && playerObj.bankCardGroup.banks && playerObj.bankCardGroup.banks.length? playerObj.bankCardGroup.banks: [];
                        return dbconfig.collection_platformBankCardList.find(
                            {
                                platformId: platformData.platformId,
                                accountNumber: {$in: accountArr},
                                isFPMS: true,
                                status: "NORMAL"
                            }
                            ).lean().then(
                            bankCardListData => {
                                let bankCardFilterList = [];
                                let maxDeposit = 0;
                                let compareObj = {};

                                if (bankCardListData && bankCardListData.length) {
                                    for (let j = 0; j < bankCardListData.length; j++) {
                                        if (!compareObj.hasOwnProperty(bankCardListData[j].bankTypeId)) {
                                            compareObj[bankCardListData[j].bankTypeId] = {
                                                id: bankCardListData[j].bankTypeId,
                                                bankTypeId: bankCardListData[j].bankTypeId,
                                                maxDepositAmount: bankCardListData[j].maxDepositAmount ? bankCardListData[j].maxDepositAmount : 0,
                                                status: 1
                                            }
                                        } else {
                                            if (compareObj[bankCardListData[j].bankTypeId] && bankCardListData[j].maxDepositAmount && bankCardListData[j].maxDepositAmount > compareObj[bankCardListData[j].bankTypeId].maxDepositAmount) {
                                                compareObj[bankCardListData[j].bankTypeId].maxDepositAmount = bankCardListData[j].maxDepositAmount ? bankCardListData[j].maxDepositAmount : 0;
                                            }
                                        }
                                    }

                                    for (let key in compareObj) {
                                        if (compareObj[key].maxDepositAmount > maxDeposit) {
                                            maxDeposit = compareObj[key].maxDepositAmount;
                                        }
                                        bankCardFilterList.push(compareObj[key])
                                    }

                                    return getBankTypeNameArr(bankCardFilterList, maxDeposit);

                                } else {
                                    return {data: []}
                                }
                            }
                        )
                    } else {
                        if (playerData.permission.topupManual) {
                            if (playerData && playerData.platform && playerData.platform.bankCardGroupIsPMS) {
                                return pmsAPI.foundation_requestBankTypeByUsername(
                                    {
                                        queryId: serverInstance.getQueryId(),
                                        platformId: playerData.platform.platformId,
                                        username: playerData.name,
                                        ip: userIp,
                                        supportMode: supportMode
                                    }
                                );
                            } else {
                                return pmsAPI.bankcard_getBankcardList(
                                    {
                                        platformId: platformData.platformId,
                                        queryId: serverInstance.getQueryId()
                                    }
                                ).then(
                                    bankCardListData => {
                                        if (bankCardListData && bankCardListData.data && bankCardListData.data.length
                                            && playerObj.bankCardGroup && playerObj.bankCardGroup.banks && playerObj.bankCardGroup.banks.length) {
                                            let bankCardFilterList = [];
                                            let maxDeposit = 0;
                                            let compareObj = {};
                                            for (let j = 0; j < bankCardListData.data.length; j++) {
                                                if (bankCardListData.data[j].status == "NORMAL" && playerObj.bankCardGroup.banks.indexOf(bankCardListData.data[j].accountNumber) >= 0) {
                                                    if (!compareObj.hasOwnProperty(bankCardListData.data[j].bankTypeId)) {
                                                        compareObj[bankCardListData.data[j].bankTypeId] = {
                                                            id: bankCardListData.data[j].bankTypeId,
                                                            bankTypeId: bankCardListData.data[j].bankTypeId,
                                                            maxDepositAmount: bankCardListData.data[j].maxDepositAmount ? bankCardListData.data[j].maxDepositAmount : 0,
                                                            status: 1
                                                        }
                                                    } else {
                                                        if (compareObj[bankCardListData.data[j].bankTypeId] && bankCardListData.data[j].maxDepositAmount && bankCardListData.data[j].maxDepositAmount > compareObj[bankCardListData.data[j].bankTypeId].maxDepositAmount) {
                                                            compareObj[bankCardListData.data[j].bankTypeId].maxDepositAmount = bankCardListData.data[j].maxDepositAmount ? bankCardListData.data[j].maxDepositAmount : 0;
                                                        }
                                                    }
                                                }
                                            }

                                            for (let key in compareObj) {
                                                if (compareObj[key].maxDepositAmount > maxDeposit) {
                                                    maxDeposit = compareObj[key].maxDepositAmount;
                                                }
                                                bankCardFilterList.push(compareObj[key])
                                            }
                                            if (bankCardFilterList.length) {
                                                return getBankTypeNameArr(bankCardFilterList, maxDeposit);
                                            } else {
                                                return {data: []};
                                            }
                                        }

                                        return {data: []};
                                    }
                                );
                            }

                        }
                        else {
                            return [];
                        }
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
                } else {
                    return returnData;
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
    },

    // region Common payment
    getMinMaxCommonTopupAmount: (playerId, clientType, loginIp) => {
        let url = "";

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform", model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData) {
                    url =
                        env.paymentHTTPAPIUrl
                        + "foundation/payMinAndMax.do?"
                        + "platformId=" + playerData.platform.platformId + "&"
                        + "username=" + playerData.name + "&"
                        + "clientType=" + clientType;

                    return rp(url);
                }
            }
        ).then(
            ret => {
                if (ret) {
                    ret = JSON.parse(ret);

                    if (ret.code && Number(ret.code) === 1) {
                        return Promise.reject({
                            status: constServerCode.PAYMENT_NOT_AVAILABLE,
                            message: "Payment is not available",
                        });
                    }

                    return {
                        minDepositAmount: Number(ret.min) || 0,
                        maxDepositAmount: Number(ret.max) || 0
                    }
                }
            }
        )
    },

    createCommonTopupProposal: (playerId, topupRequest, ipAddress, entryType, adminId, adminName) => {
        let player, rewardEvent;

        if (topupRequest.bonusCode && topupRequest.topUpReturnCode) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform", model: dbconfig.collection_platform
        }).populate({
            path: "playerLevel", model: dbconfig.collection_playerLevel
        }).populate({
            path: "bankCardGroup", model: dbconfig.collection_platformBankCardGroup
        }).populate({
            path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup
        }).populate({
            path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup
        }).populate({
            path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup
        }).lean().then(
            playerdata => {
                if (playerdata) {
                    player = playerdata;

                    if (player && player.permission && player.permission.allTopUp === false) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have common topup permission"
                        });
                    }

                    if (player && player._id) {
                        if (!topupRequest.topUpReturnCode) {
                            return Promise.resolve();
                        }

                        return dbRewardUtil.checkApplyTopUpReturn(player, topupRequest.topUpReturnCode, topupRequest.userAgentStr, topupRequest, constPlayerTopUpType.COMMON);

                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Invalid player data"})
                }
            }
        ).then(
            eventData => {
                rewardEvent = eventData;

                if (player && player.platform) {
                    let limitedOfferProm = dbRewardUtil.checkLimitedOfferIntention(player.platform._id, player._id, topupRequest.amount, topupRequest.limitedOfferObjId);
                    let proms = [limitedOfferProm];
                    if (topupRequest.bonusCode) {
                        let bonusCodeCheckProm;
                        let isOpenPromoCode = topupRequest.bonusCode.toString().trim().length === 3;
                        if (isOpenPromoCode) {
                            bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, topupRequest.bonusCode, topupRequest.amount, lastLoginIp);
                        }
                        else {
                            bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, topupRequest.bonusCode, topupRequest.amount);
                        }
                        proms.push(bonusCodeCheckProm)
                    }

                    return Promise.all(proms);
                }
            }
        ).then(
            res => {
                let minTopUpAmount = player.platform.minTopUpAmount || 0;
                let limitedOfferTopUp = res[0];
                let bonusCodeValidity = res[1];

                // check bonus code validity if exist
                if (topupRequest.bonusCode && !bonusCodeValidity) {
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "DataError",
                        errorMessage: "Wrong promo code has entered"
                    });
                }

                if (topupRequest.amount < minTopUpAmount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Top up amount is not enough"
                    });
                }

                // if (topupRequest.userAgent) {
                //     topupRequest.userAgent = dbUtil.retrieveAgent(topupRequest.userAgent);
                // }

                let proposalData = Object.assign({}, topupRequest);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.platformId = player.platform._id;
                proposalData.playerLevel = player.playerLevel;
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.playerRealName = player.realName;
                proposalData.amount = Number(topupRequest.amount);
                proposalData.bankCardGroupName = player.bankCardGroup && player.bankCardGroup.name || "";
                proposalData.merchantGroupName = player.merchantGroup && player.merchantGroup.name || "";
                proposalData.wechatPayGroupName = player.wechatPayGroup && player.wechatPayGroup.name || "";
                proposalData.aliPayGroupName = player.alipayGroup && player.alipayGroup.name || "";
                proposalData.creator = entryType === "ADMIN" ? {
                    type: 'admin',
                    name: adminName,
                    id: adminId
                } : {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };

                if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
                    if (rewardEvent.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP){
                        proposalData.topUpReturnCode = rewardEvent.code;
                    }
                    else if (rewardEvent.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP){
                        proposalData.retentionRewardCode = rewardEvent.code;
                        // delete the unrelated rewardEvent.code
                        if (proposalData.topUpReturnCode){
                            delete proposalData.topUpReturnCode;
                        }
                    }
                }

                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                }

                if(ipAddress){
                    proposalData.lastLoginIp = ipAddress;
                }

                let newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType[entryType],
                    //createTime: createTime ? new Date(createTime) : new Date(),
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };

                newProposal.inputDevice = dbUtil.getInputDevice(topupRequest.userAgent, false);
                return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_COMMON_TOP_UP, newProposal);
            }
        ).then(
            proposal => {
                if (proposal) {
                    let pmsUrl = env.paymentHTTPAPIUrl;

                    return generatePMSHTTPUrl(player, proposal, pmsUrl, topupRequest.clientType, ipAddress, topupRequest.amount);
                }
            }
        )
    }

    // endregion

};

function getBankTypeNameArr (bankCardFilterList, maxDeposit) {
    let bankListArr = [];
    return pmsAPI.bankcard_getBankTypeList({}).then(
        bankTypeList => {
            if (!(bankTypeList && bankTypeList.data && bankTypeList.data.length)) {
                return Q.reject({
                    name: "DataError",
                    message: "Can not find bank type list"
                });
            }

            bankCardFilterList.forEach(item => {
                let matchObj = bankTypeList.data.find(bankType => bankType.bankTypeId == item.bankTypeId);
                if (matchObj && matchObj.name) {
                    item.name = matchObj.name;
                }
            })
            for (let i = 1; i <= Object.keys(constDepositMethod).length; i++) {
                let returnObj = {
                    depositMethod: String(i),
                    maxDepositAmount: maxDeposit,
                    data: bankCardFilterList
                }
                bankListArr.push(returnObj);
            }

            return {data: bankListArr};
        })
}

function generatePMSHTTPUrl (playerData, proposalData, domain, clientType, ipAddress, amount) {
    let delimiter = "**";
    let url = domain;

    if ([1].includes(Number(clientType))) {
        url += 'pc/';
    } else if ([2, 4].includes(Number(clientType))) {
        url += 'phone/';
    }

    url += "?";
    url += playerData.platform.platformId + delimiter;
    url += playerData.name + delimiter;
    url += playerData.realName + delimiter;
    url += env.internalRESTUrl + "/notifyPayment" + delimiter;
    url += clientType + delimiter;
    url += ipAddress + delimiter;
    url += amount + delimiter;
    url += proposalData.proposalId

    return url;
}

module.exports = dbPlayerPayment;
