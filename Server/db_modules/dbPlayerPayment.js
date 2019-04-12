const Q = require("q");
const rp = require('request-promise');
const errorUtils = require('./../modules/errorUtils');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;

const env = require('../config/env').config();
const extConfig = require('../config/externalPayment/paymentSystems');

const pmsAPI = require("../externalAPI/pmsAPI.js");

const dbconfig = require('./../modules/dbproperties');
const dbUtil = require("../modules/dbutility");
const serverInstance = require("../modules/serverInstance");
const RESTUtils = require("../modules/RESTUtils");
const rsaCrypto = require('./../modules/rsaCrypto');

const constProposalStatus = require('../const/constProposalStatus');
const constAccountType = require('./../const/constAccountType');
const constDepositMethod = require('./../const/constDepositMethod');
const constPlayerTopUpType = require("../const/constPlayerTopUpType.js");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalType = require('./../const/constProposalType');
const constProposalUserType = require('../const/constProposalUserType');
const constRewardType = require('../const/constRewardType');
const constServerCode = require("../const/constServerCode");
const constSystemParam = require('../const/constSystemParam');

const dbRewardUtil = require("../db_common/dbRewardUtility")

const dbPromoCode = require('../db_modules/dbPromoCode');
const dbProposal = require('../db_modules/dbProposal');
const constPlayerRegistrationInterface = require("./../const/constPlayerRegistrationInterface");

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
                    if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                        return dbconfig.collection_platformAlipayList.find({accountNumber: {$in: playerData.alipayGroup.alipays}, isFPMS: true}).lean().then(
                            alipayListData => {
                                return {data: alipayListData}
                            }
                        )
                    } else {
                        let reqData = {
                            platformId: data.platform.platformId,
                            accountType: constAccountType.ALIPAY
                        };

                        return RESTUtils.getPMS2Services("postBankCardList", reqData);
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

                    return RESTUtils.getPMS2Services("postMerchantList", {platformId: data.platform.platformId});
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

    requestBankTypeByUserName: function (playerId, clientType, userIp, supportMode) {
        let playerObj;
        let returnData;

        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "bankCardGroup", model: dbconfig.collection_platformBankCardGroup}
        ).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    let platformData = playerData.platform;

                    if (
                        (
                            platformData.financialSettlement
                            && platformData.financialSettlement.financialSettlementToggle
                        )
                        || platformData.isFPMSPaymentSystem
                    ) {
                        let accountArr =
                            playerObj.bankCardGroup && playerObj.bankCardGroup.banks
                            && playerObj.bankCardGroup.banks.length? playerObj.bankCardGroup.banks: [];

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
        // let url = "";
        let topUpSystemConfig;
        let topUpSystemName;
        let platformMinTopUpAmount = 0;
        let result = {};

        console.log('getMinMaxCommonTopupAmount before get player', playerId, new Date());

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform", model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData) {
                    // let paymentUrl = env.paymentHTTPAPIUrl;

                    topUpSystemConfig = extConfig && playerData.platform && playerData.platform.topUpSystemType && extConfig[playerData.platform.topUpSystemType];

                    if (topUpSystemConfig && topUpSystemConfig.name) {
                        topUpSystemName = topUpSystemConfig.name;
                    }

                    if (playerData.platform && playerData.platform.minTopUpAmount) {
                        platformMinTopUpAmount = playerData.platform.minTopUpAmount;
                    }

                    // if (topUpSystemConfig && topUpSystemConfig.topUpAPIAddr) {
                    //     paymentUrl = topUpSystemConfig.topUpAPIAddr;
                    //
                    //     if (topUpSystemConfig.minMaxAPIAddr) {
                    //         paymentUrl = topUpSystemConfig.minMaxAPIAddr;
                    //     }
                    // }

                    if (!topUpSystemConfig || topUpSystemName === 'PMS' || topUpSystemName === 'PMS2') {
                        // url =
                        //     paymentUrl
                        //     + "foundation/payMinAndMax.do?"
                        //     + "platformId=" + playerData.platform.platformId + "&"
                        //     + "username=" + playerData.name + "&"
                        //     + "clientType=" + clientType;
                        //
                        // console.log('getMinMaxCommonTopupAmount url', url, playerId, playerData.platform.topUpSystemType, new Date());
                        //
                        // return rp(url);

                        let reqData = {
                            platformId: playerData.platform.platformId,
                            name: playerData.name,
                            clientType: clientType
                        };

                        return RESTUtils.getPMS2Services("getMinMax", reqData);
                    } else {
                        return true;
                    }
                }
            }
        ).then(
            ret => {
                if (ret) {
                    if (!topUpSystemConfig || topUpSystemName === 'PMS' || topUpSystemName === 'PMS2') {

                        console.log('getMinMaxCommonTopupAmount res', playerId, new Date());

                        ret = JSON.parse(ret);

                        if (ret.code && Number(ret.code) === 1) {
                            return Promise.reject({
                                status: constServerCode.PAYMENT_NOT_AVAILABLE,
                                message: "Payment is not available",
                            });
                        }

                        result.minDepositAmount = Number(ret.min) || 0;
                        result.maxDepositAmount = Number(ret.max) || 0

                        return result;

                    } else {
                        result.minDepositAmount = Number(platformMinTopUpAmount);

                        return result;
                    }
                }
            }
        ).catch(
            err => {
                return Promise.reject({
                    status: constServerCode.PAYMENT_NOT_AVAILABLE,
                    message: "Payment is not available",
                    err: err
                });
            }
        )
    },

    createCommonTopupProposal: (playerId, topupRequest, ipAddress, entryType, adminId, adminName) => {
        let player, rewardEvent, proposal, topUpSystemConfig;
        console.log('topupRequest JY::', topupRequest);
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
                    topUpSystemConfig =
                        extConfig && player.platform.topUpSystemType && extConfig[player.platform.topUpSystemType];

                    // Check player top up permission
                    if (player && player.permission && player.permission.allTopUp === false) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have common topup permission"
                        });
                    }

                    // Check top up return reward condition
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

                // Check limited offer and promo code condition
                if (player && player.platform) {
                    let limitedOfferProm = dbRewardUtil.checkLimitedOfferIntention(player.platform._id, player._id, topupRequest.amount, topupRequest.limitedOfferObjId);
                    let proms = [limitedOfferProm];
                    if (topupRequest.bonusCode) {
                        let bonusCodeCheckProm;
                        let isOpenPromoCode = topupRequest.bonusCode.toString().trim().length === 3;
                        if (isOpenPromoCode) {
                            bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, topupRequest.bonusCode, topupRequest.amount, ipAddress);
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

                // Check minimum top up amount
                if (topupRequest.amount < minTopUpAmount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Top up amount is not enough"
                    });
                }

                // Decide which payment system to use
                let proposalType;
                let proposalData = Object.assign({}, topupRequest);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.platformId = player.platform._id;
                if( player.playerLevel ){
                    proposalData.playerLevel = player.playerLevel._id;
                }
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.playerRealName = player.realName;
                proposalData.amount = Number(topupRequest.amount);
                proposalData.creator = entryType === "ADMIN" ? {
                    type: 'admin',
                    name: adminName,
                    id: adminId
                } : {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };

                if (topUpSystemConfig && topUpSystemConfig.name === '快付收银台') {
                    proposalData.bankCode = topupRequest.bankCode || 'CASHIER';

                    proposalType = constProposalType.PLAYER_FKP_TOP_UP;
                } else {
                    proposalData.bankCardGroupName = player.bankCardGroup && player.bankCardGroup.name || "";
                    proposalData.merchantGroupName = player.merchantGroup && player.merchantGroup.name || "";
                    proposalData.wechatPayGroupName = player.wechatPayGroup && player.wechatPayGroup.name || "";
                    proposalData.aliPayGroupName = player.alipayGroup && player.alipayGroup.name || "";

                    proposalType = constProposalType.PLAYER_COMMON_TOP_UP;
                }

                if (player.platform.topUpSystemType && topUpSystemConfig) {
                    proposalData.topUpSystemType = player.platform.topUpSystemType;
                    proposalData.topUpSystemName = topUpSystemConfig.name;
                } else if (!player.platform.topUpSystemType && extConfig && Object.keys(extConfig) && Object.keys(extConfig).length > 0) {
                    Object.keys(extConfig).forEach(key => {
                        if (key && extConfig[key] && extConfig[key].name && extConfig[key].name === 'PMS') {
                            proposalData.topUpSystemType = Number(key);
                            proposalData.topUpSystemName = extConfig[key].name;
                        }
                    });
                }

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
                    proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                    proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                    proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                }

                if (ipAddress) {
                    proposalData.lastLoginIp = ipAddress;
                }

                let newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType[entryType],
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };

                if (Number(topupRequest.clientType) == 1) {
                    newProposal.inputDevice = constPlayerRegistrationInterface.WEB_PLAYER;
                }
                else if (Number(topupRequest.clientType) == 2) {
                    newProposal.inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
                }
                else if (Number(topupRequest.clientType) == 4) {
                    newProposal.inputDevice = constPlayerRegistrationInterface.APP_PLAYER;
                } else {
                    newProposal.inputDevice = dbUtil.getInputDevice(topupRequest.userAgent, false);
                }

                return checkFailTopUp(player).then(
                    () => dbProposal.createProposalWithTypeName(player.platform._id, proposalType, newProposal)
                )
            }
        ).then(
            async proposalObj => {
                if (proposalObj) {
                    if (topUpSystemConfig && topUpSystemConfig.name === '快付收银台') {
                        proposal = proposalObj;
                        let ip = player.lastLoginIp && player.lastLoginIp != 'undefined' ? player.lastLoginIp : "127.0.0.1";
                        let postData = {
                            charset: 'UTF-8',
                            merchantCode: 'M310018',
                            orderNo: proposal.proposalId,
                            // FKP amount is in cent unit
                            amount: topupRequest.amount * 100,
                            channel: 'BANK',
                            bankCode: topupRequest.bankCode || 'CASHIER',
                            remark: 'test remark',
                            notifyUrl: extConfig["1"].topUpAPICallback,
                            returnUrl: "",
                            extraReturnParam: ""
                        };

                        let toEncrypt = processFKPData(postData);
                        postData.sign = rsaCrypto.signFKP(toEncrypt);
                        postData.signType = "RSA";

                        return {
                            postUrl: extConfig["1"].topUpAPIAddr,
                            postData: postData
                        }
                    } else {
                        proposal = proposalObj;
                        let paymentUrl = env.paymentHTTPAPIUrl;

                        if (player && player.platform && player.platform.topUpSystemType && extConfig
                            && extConfig[player.platform.topUpSystemType]
                        ) {
                            paymentUrl = await RESTUtils.getPMS2Services("getTopupLobbyAddress");
                        }

                        return {
                            url: generatePMSHTTPUrl(player, proposal, paymentUrl, topupRequest.clientType, ipAddress, topupRequest.amount),
                            proposalId: proposal.proposalId,
                            amount: proposal.data.amount,
                            createTime: proposal.createTime
                        };
                    }
                }
            }
        );

        function processFKPData (data) {
            let toEncrypt = '';

            Object.keys(data).forEach(key => {
                toEncrypt += key;
                toEncrypt += '=';
                toEncrypt += data[key] ? data[key].toString() : '';
                toEncrypt += '&'
            });

            // remove the last & character
            toEncrypt = toEncrypt.slice(0, -1);

            return toEncrypt;
        }
    }

    // endregion

};

async function checkFailTopUp (player) {
    let checkMonitorTopUpCond = Boolean(player.platform && player.platform.monitorTopUpNotify && player.platform.monitorTopUpCount);
    let checkMonitorCommonTopUpCond = Boolean(player.platform && player.platform.monitorCommonTopUpCountNotify && player.platform.monitorCommonTopUpCount);
    if (!checkMonitorTopUpCond && !checkMonitorCommonTopUpCond) {
        return true; // does not need to check
    }

    let commonTopUpType = await dbconfig.collection_proposalType.findOne({
        platformId: player.platform,
        name: constProposalType.PLAYER_COMMON_TOP_UP
    }).lean();

    if (!commonTopUpType) {
        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
    }

    let lastSuccessTopUp = await dbconfig.collection_proposal.findOne({
        // createTime: {$gte: new Date(player.registrationTime)},
        "data.playerObjId": player._id,
        mainType: "TopUp",
        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
    }, {createTime: 1}).sort({createTime: -1}).lean();

    let currentTime = new Date();
    let yesterdayTime = new Date().setDate(currentTime.getDate() - 1);

    let checkCommonTopUpQuery = {
        mainType: "TopUp",
        type: commonTopUpType._id,
        "data.playerObjId": player._id,
        status: {$in: [constProposalStatus.PREPENDING, constProposalStatus.FAIL, constProposalStatus.REJECTED, constProposalStatus.CANCEL]},
        createTime: {$gte: new Date(yesterdayTime), $lt: currentTime}
    }

    let lastSuccessTime = lastSuccessTopUp && lastSuccessTopUp.createTime && new Date(lastSuccessTopUp.createTime);

    if (lastSuccessTime && lastSuccessTime.getTime() > new Date(yesterdayTime).getTime()) {
        checkCommonTopUpQuery.createTime = {$gte: lastSuccessTime, $lt: currentTime};
    }

    let checkOtherTopUpQuery = Object.assign({}, checkCommonTopUpQuery)
    checkOtherTopUpQuery.type = {$ne: checkCommonTopUpQuery.type};
    let commonTopUpProm = Promise.resolve(0);
    let otherTopUpProm = Promise.resolve(0);

    if (checkMonitorTopUpCond) {
        commonTopUpProm = dbconfig.collection_proposal.find(checkCommonTopUpQuery).count();
    }

    if (checkMonitorCommonTopUpCond) {
        otherTopUpProm = dbconfig.collection_proposal.find(checkOtherTopUpQuery).count();
    }

    let failedProposalsCount = await Promise.all([commonTopUpProm, otherTopUpProm]);

    let commonTopUpCount = failedProposalsCount[0];
    let otherTopUpCount = failedProposalsCount[1];

    if (checkMonitorTopUpCond && checkMonitorCommonTopUpCond) {
        if (otherTopUpCount >= player.platform.monitorTopUpCount && commonTopUpCount >= player.platform.monitorCommonTopUpCount) {
            return Promise.reject({name: "DataError", message: "Common top up and top up type exceed number of failures"});
        } else if (commonTopUpCount >= player.platform.monitorCommonTopUpCount) {
            return Promise.reject({name: "DataError", message: "Common top up exceed number of failures"});
        } else if (otherTopUpCount >= player.platform.monitorTopUpCount) {
            return Promise.reject({name: "DataError", message: "Top up type exceed number of failures"});
        }
    } else if (checkMonitorTopUpCond){
        if (otherTopUpCount >= player.platform.monitorTopUpCount) {
            return Promise.reject({name: "DataError", message: "Top up type exceed number of failures"});
        }
    } else if (checkMonitorCommonTopUpCond) {
        if (commonTopUpCount >= player.platform.monitorCommonTopUpCount) {
            return Promise.reject({name: "DataError", message: "Common top up exceed number of failures"});
        }
    }
}

function getBankTypeNameArr (bankCardFilterList, maxDeposit) {
    let bankListArr = [];
    return RESTUtils.getPMS2Services("postBankTypeList", {}).then(
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
    let paymentCallbackUrl = env.internalRESTUrl;

    if ([1].includes(Number(clientType))) {
        url += 'pc/';
    } else if ([2, 4].includes(Number(clientType))) {
        url += 'phone/';
    }

    if (playerData && playerData.platform && playerData.platform.platformId && playerData.platform.topUpSystemType
        && extConfig && extConfig[playerData.platform.topUpSystemType]
        && extConfig[playerData.platform.topUpSystemType].topUpAPICallback
    ) {
        paymentCallbackUrl = extConfig[playerData.platform.topUpSystemType].topUpAPICallback;
    }

    url += "?";

    // url += playerData.platform.platformId + delimiter;
    // url += playerData.name + delimiter;
    // url += playerData.realName + delimiter;
    // url += paymentCallbackUrl + "/notifyPayment" + delimiter;
    // url += clientType + delimiter;
    // url += ipAddress + delimiter;
    // url += amount + delimiter;
    //
    // if (playerData && playerData.platform && playerData.platform.topUpSystemType && extConfig &&
    //     extConfig[playerData.platform.topUpSystemType] && extConfig[playerData.platform.topUpSystemType].name && extConfig[playerData.platform.topUpSystemType].name === 'PMS2') {
    //     url += proposalData.proposalId + delimiter;
    //     url += proposalData.entryType + delimiter;
    //     url += proposalData.createTime.getTime()
    // } else {
    //     url += proposalData.proposalId
    // }
    //
    // return url;

    let paramString = "";
    paramString += playerData.platform.platformId + delimiter;
    paramString += playerData.name + delimiter;
    paramString += playerData.realName + delimiter;
    paramString += paymentCallbackUrl + "/notifyPayment" + delimiter;
    paramString += clientType + delimiter;
    paramString += ipAddress + delimiter;
    paramString += amount + delimiter;
    if (playerData && playerData.platform && playerData.platform.topUpSystemType && extConfig &&
        extConfig[playerData.platform.topUpSystemType] && extConfig[playerData.platform.topUpSystemType].name && extConfig[playerData.platform.topUpSystemType].name === 'PMS2') {
        paramString += proposalData.proposalId + delimiter;
        paramString += proposalData.entryType + delimiter;
        paramString += proposalData.createTime.getTime()
    } else {
        paramString += proposalData.proposalId
    }

    let encryptedParamString = "tk=".concat(jwt.sign(paramString, constSystemParam.PMS2_AUTH_SECRET_KEY));

    return url.concat(encryptedParamString);
}

module.exports = dbPlayerPayment;
