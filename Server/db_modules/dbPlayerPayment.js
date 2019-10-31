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
const localization = require("../modules/localization");

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

                        return RESTUtils.getPMS2Services("postBankCardList", reqData, data.platform.topUpSystemType);
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

                    return RESTUtils.getPMS2Services("postMerchantList", {platformId: data.platform.platformId}, data.platform.topUpSystemType);
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

                                    return getBankTypeNameArr(bankCardFilterList, maxDeposit, platformData);

                                } else {
                                    return {data: []}
                                }
                            }
                        )
                    } else {
                        if (playerData.permission.topupManual) {
                            // if (playerData && playerData.platform && playerData.platform.bankCardGroupIsPMS) {
                            //     return pmsAPI.foundation_requestBankTypeByUsername(
                            //         {
                            //             queryId: serverInstance.getQueryId(),
                            //             platformId: playerData.platform.platformId,
                            //             username: playerData.name,
                            //             ip: userIp,
                            //             supportMode: supportMode
                            //         }
                            //     );
                            // } else {

                                // return pmsAPI.bankcard_getBankcardList(
                                //     {
                                //         platformId: platformData.platformId,
                                //         queryId: serverInstance.getQueryId()
                                //     }
                                // )

                                let query = {
                                    platformId: platformData.platformId,
                                    accountType: constAccountType.BANK_CARD
                                };

                                return RESTUtils.getPMS2Services("postBankCardList", query, platformData.topUpSystemType).then(
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
                                                return getBankTypeNameArr(bankCardFilterList, maxDeposit, platformData);
                                            } else {
                                                return {data: []};
                                            }
                                        }

                                        return {data: []};
                                    }
                                );
                            // }

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
        let defaultMinTopUpAmount = 10;
        let defaultMaxTopUpAmount = 1000000;
        let result = {};
        let proposalData = {};
        let newProposal = {};
        let playerRecord = {};
        let platformTopUpAmountConfig;
        let playerTopUpCount;

        console.log('getMinMaxCommonTopupAmount before get player', playerId, new Date());

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform", model: dbconfig.collection_platform
        }).populate({
            path: "playerLevel", model: dbconfig.collection_playerLevel
        }).lean().then(
            playerData => {
                if (playerData) {
                    playerRecord = playerData;
                    topUpSystemConfig = extConfig && playerData.platform && playerData.platform.topUpSystemType && extConfig[playerData.platform.topUpSystemType];

                    if (topUpSystemConfig && topUpSystemConfig.name) {
                        topUpSystemName = topUpSystemConfig.name;
                    }

                    proposalData.playerId = playerId;
                    proposalData.playerObjId = playerData._id;
                    proposalData.platformId = playerData.platform._id;
                    if (playerData.playerLevel){
                        proposalData.playerLevel = playerData.playerLevel._id;
                    }
                    proposalData.platform = playerData.platform.platformId;
                    proposalData.playerName = playerData.name;
                    proposalData.playerRealName = playerData.realName;
                    proposalData.creator = {
                        type: 'player',
                        name: playerData.name,
                        id: playerId
                    };
                    proposalData.isMinMaxError = true;
                    proposalData.remark = constServerCode.PAYMENT_NOT_AVAILABLE + ": " + localization.localization.translate("Payment is not available, please contact customer service");

                    newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType["CLIENT"],
                        userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };

                    if (Number(clientType) == 1) {
                        newProposal.inputDevice = constPlayerRegistrationInterface.WEB_PLAYER;
                    }
                    else if (Number(clientType) == 2) {
                        newProposal.inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
                    }
                    else if (Number(clientType) == 4) {
                        newProposal.inputDevice = constPlayerRegistrationInterface.APP_PLAYER;
                    }

                    let topUpCountProm = dbconfig.collection_playerTopUpRecord.aggregate(
                        [
                            {
                                $match: {
                                    platformId: playerRecord.platform._id,
                                    createTime: {$gte: new Date(playerRecord.registrationTime), $lte: new Date()},
                                    playerId: playerRecord._id
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: {$sum: 1}
                                }
                            }
                        ]
                    ).allowDiskUse(true).exec();

                    let platformTopUpAmount = dbconfig.collection_platformTopUpAmountConfig.findOne({platformObjId: playerRecord.platform._id}).lean();

                    return Promise.all([topUpCountProm, platformTopUpAmount]).then(
                        data => {
                            playerTopUpCount = data[0] && data[0][0] && data[0][0].count ? data[0][0].count : 0;
                            platformTopUpAmountConfig = data[1];

                            if (!topUpSystemConfig || topUpSystemName === 'PMS' || topUpSystemName === 'PMS2') {
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
                    )

                }
            }
        ).then(
            ret => {
                if (ret) {
                    if (!topUpSystemConfig || topUpSystemName === 'PMS' || topUpSystemName === 'PMS2') {

                        console.log('getMinMaxCommonTopupAmount res', playerId, new Date());

                        ret = JSON.parse(ret);

                        if (ret.code && Number(ret.code) === 1) {
                            return dbProposal.createProposalWithTypeName(playerRecord.platform._id, constProposalType.PLAYER_COMMON_TOP_UP, newProposal).then(
                                data => {
                                    return Promise.reject({
                                        status: constServerCode.PAYMENT_NOT_AVAILABLE,
                                        message: localization.localization.translate("Payment is not available, please contact customer service"),
                                    });
                                }
                            );
                        }

                        let newMinDepositAmount;
                        let newMaxDepositAmount;
                        if (platformTopUpAmountConfig && platformTopUpAmountConfig.commonTopUpAmountRange
                            && platformTopUpAmountConfig.commonTopUpAmountRange.minAmount && platformTopUpAmountConfig.commonTopUpAmountRange.maxAmount) {
                            let tempMinConfig = platformTopUpAmountConfig.commonTopUpAmountRange.minAmount;
                            let tempMaxConfig = platformTopUpAmountConfig.commonTopUpAmountRange.maxAmount;

                            if(Number(ret.min) && (tempMinConfig > Number(ret.min))) {
                                newMinDepositAmount = tempMinConfig;
                            } else {
                                newMinDepositAmount = Number(ret.min)
                            }

                            if (ret.max && Number(ret.max) && (tempMaxConfig > Number(ret.max))) {
                                newMaxDepositAmount = Number(ret.max);
                            } else {
                                newMaxDepositAmount = tempMaxConfig;
                            }
                        } else {
                            let tempMinConfig = defaultMinTopUpAmount;
                            let tempMaxConfig = defaultMaxTopUpAmount;

                            if(Number(ret.min) && (tempMinConfig > Number(ret.min))) {
                                newMinDepositAmount = tempMinConfig;
                            } else {
                                newMinDepositAmount = Number(ret.min)
                            }

                            if (ret.max && Number(ret.max) && (tempMaxConfig > Number(ret.max))) {
                                newMaxDepositAmount = Number(ret.max);
                            } else {
                                newMaxDepositAmount = tempMaxConfig;
                            }
                        }

                        if (platformTopUpAmountConfig && platformTopUpAmountConfig.topUpCountAmountRange && platformTopUpAmountConfig.topUpCountAmountRange.length > 0) {
                            let topUpCountAmountRanges = platformTopUpAmountConfig.topUpCountAmountRange;
                            topUpCountAmountRanges.sort((a, b) => a.topUpCount - b.topUpCount);

                            for (let i = 0; i < topUpCountAmountRanges.length; i++) {
                                let range = topUpCountAmountRanges[i];
                                if (range && range.topUpCount && (playerTopUpCount <= range.topUpCount)) {
                                    if(range && range.minAmount && Number(ret.min)) {
                                        if(range.minAmount > Number(ret.min)) {
                                            newMinDepositAmount = range.minAmount;
                                        } else {
                                            newMinDepositAmount = Number(ret.min)
                                        }
                                    }

                                    if (range && range.maxAmount && ret.max && Number(ret.max)) {
                                        if (range.maxAmount > Number(ret.max)) {
                                            newMaxDepositAmount = Number(ret.max);
                                        } else {
                                            newMaxDepositAmount = range.maxAmount;
                                        }
                                    }
                                    break;
                                }
                            }

                        }

                        if (!newMinDepositAmount && !newMaxDepositAmount) {
                            newMinDepositAmount = Number(ret.min);
                            newMaxDepositAmount = Number(ret.max);
                        }

                        result.minDepositAmount = newMinDepositAmount || 0;
                        result.maxDepositAmount = newMaxDepositAmount || 0

                        return result;

                    } else {
                        let newMinTopUpAmount;
                        let newMaxTopUpAmount;

                        if (platformTopUpAmountConfig && platformTopUpAmountConfig.commonTopUpAmountRange
                            && platformTopUpAmountConfig.commonTopUpAmountRange.minAmount && platformTopUpAmountConfig.commonTopUpAmountRange.maxAmount) {
                            newMinTopUpAmount = platformTopUpAmountConfig.commonTopUpAmountRange.minAmount;
                            newMaxTopUpAmount = platformTopUpAmountConfig.commonTopUpAmountRange.maxAmount;
                        }

                        if (platformTopUpAmountConfig && platformTopUpAmountConfig.topUpCountAmountRange && platformTopUpAmountConfig.topUpCountAmountRange.length > 0) {
                            let topUpCountAmountRanges = platformTopUpAmountConfig.topUpCountAmountRange;
                            topUpCountAmountRanges.sort((a, b) => a.topUpCount - b.topUpCount);

                            for (let i = 0; i < topUpCountAmountRanges.length; i++) {
                                let range = topUpCountAmountRanges[i];
                                if (range && range.topUpCount && (playerTopUpCount <= range.topUpCount)) {
                                    if(range && range.minAmount) {
                                        newMinTopUpAmount = range.minAmount;
                                    }

                                    if (range && range.maxAmount) {
                                        newMaxTopUpAmount = range.maxAmount;
                                    }
                                    break;
                                }
                            }

                        }

                        if (!newMinTopUpAmount && !newMaxTopUpAmount) {
                            newMinTopUpAmount = defaultMinTopUpAmount;
                            newMaxTopUpAmount = defaultMaxTopUpAmount;
                        }

                        result.minDepositAmount = newMinTopUpAmount;
                        result.maxDepositAmount = newMaxTopUpAmount;

                        return result;
                    }
                }
            }
        ).catch(
            err => {
                if (playerRecord && playerRecord.platform && playerRecord.platform._id && newProposal && Object.keys(newProposal).length > 0) {
                    return dbProposal.createProposalWithTypeName(playerRecord.platform._id, constProposalType.PLAYER_COMMON_TOP_UP, newProposal).then(
                        data => {
                            return Promise.reject({
                                status: constServerCode.PAYMENT_NOT_AVAILABLE,
                                message: localization.localization.translate("Payment is not available, please contact customer service"),
                                err: err
                            });
                        }
                    );
                } else {
                    return Promise.reject({
                        status: constServerCode.PAYMENT_NOT_AVAILABLE,
                        message: localization.localization.translate("Payment is not available, please contact customer service"),
                        err: err
                    });
                }
            }
        )
    },

    createCommonTopupProposal: (playerId, topupRequest, ipAddress, entryType, adminId, adminName) => {
        let player, rewardEvent, proposal, topUpSystemConfig;
        let playerTopUpCount;
        let platformTopUpAmountConfig;
        let defaultMinTopUpAmount = 10;
        let minTopUpAmount = 0;
        console.log('topupRequest JY::', topupRequest);
        if (!(topupRequest.amount && Number.isInteger(topupRequest.amount) && topupRequest.amount < 10000000)) {
            return Promise.reject({
                name: "DataError",
                message: "Please fill in correct amount"
            });
        }

        if (topupRequest.bonusCode && topupRequest.topUpReturnCode) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({
            playerId: playerId,
            isRealPlayer: true
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

                let topUpCountProm = dbconfig.collection_playerTopUpRecord.aggregate(
                    [
                        {
                            $match: {
                                platformId: player.platform._id,
                                createTime: {$gte: new Date(player.registrationTime), $lte: new Date()},
                                playerId: player._id
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: {$sum: 1}
                            }
                        }
                    ]
                ).allowDiskUse(true).exec();

                let platformTopUpAmount = dbconfig.collection_platformTopUpAmountConfig.findOne({platformObjId: player.platform._id}).lean();

                return Promise.all([topUpCountProm, platformTopUpAmount]).then(
                    data => {
                        playerTopUpCount = data[0] && data[0][0] && data[0][0].count ? data[0][0].count : 0;
                        platformTopUpAmountConfig = data[1];

                        let newMinTopUpAmount;
                        if (platformTopUpAmountConfig && platformTopUpAmountConfig.commonTopUpAmountRange
                            && platformTopUpAmountConfig.commonTopUpAmountRange.minAmount) {
                            newMinTopUpAmount = platformTopUpAmountConfig.commonTopUpAmountRange.minAmount;
                        }

                        if (platformTopUpAmountConfig && platformTopUpAmountConfig.topUpCountAmountRange && platformTopUpAmountConfig.topUpCountAmountRange.length > 0) {
                            let topUpCountAmountRanges = platformTopUpAmountConfig.topUpCountAmountRange;
                            topUpCountAmountRanges.sort((a, b) => a.topUpCount - b.topUpCount);

                            for (let i = 0; i < topUpCountAmountRanges.length; i++) {
                                let range = topUpCountAmountRanges[i];
                                if (range && range.topUpCount && (playerTopUpCount <= range.topUpCount)) {
                                    if(range && range.minAmount) {
                                        newMinTopUpAmount = range.minAmount;
                                    }
                                    break;
                                }
                            }
                        }

                        if (!newMinTopUpAmount) {
                            newMinTopUpAmount = defaultMinTopUpAmount;
                        }

                        return newMinTopUpAmount;
                    }
                )
            }
        ).then(
            minAmountData => {
                minTopUpAmount = minAmountData;

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
                proposalData.loginDevice = player.loginDevice || null;
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

                    if (topupRequest && topupRequest.userAgent && topupRequest.userAgent.browser && topupRequest.userAgent.browser.name
                        && (topupRequest.userAgent.browser.name.indexOf("WebKit") !== -1 || topupRequest.userAgent.browser.name.indexOf("WebView") !== -1)) {
                        // 原生APP才算APP，其余的不计算为APP（包壳APP算H5）
                        newProposal.inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
                    }
                } else {
                    newProposal.inputDevice = dbUtil.getInputDevice(topupRequest.userAgent, false);
                }

                return dbProposal.createProposalWithTypeName(player.platform._id, proposalType, newProposal);
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
                        let paymentUrl;

                        if (player && player.platform && player.platform.topUpSystemType && extConfig
                            && extConfig[player.platform.topUpSystemType]
                        ) {
                            paymentUrl = await RESTUtils.getPMS2Services("getTopupLobbyAddress", player.platform.topUpSystemType);
                        }

                        let returnData = {
                            url: generatePMSHTTPUrl(player, proposal, paymentUrl, topupRequest.clientType, ipAddress, topupRequest.amount),
                            proposalId: proposal.proposalId,
                            amount: proposal.data.amount,
                            createTime: proposal.createTime,
                            isExceedTopUpFailCount: false,
                            isExceedCommonTopUpFailCount: false,
                        };

                        return checkFailTopUp(player, returnData);

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
    },

    // endregion

    //#region Create Top Up Proposal - From PMS to FPMS
    createTopUpProposal: async (platformId, playerName, clientType, statusText, topUpType, amount, data) => {
        let topUpSystemConfig;
        let parentProposalData;
        let constTopUpType;
        let proposalTypeName;
        let minTopUpAmount;
        let rewardEvent;
        let limitedOfferIntention;
        let bonusCodeValidity;
        let merchantRate;
        let topupRate;
        let topupActualAmt;

        console.log('platformId, playerName, clientType, statusText, topUpType, amount:', platformId, playerName, clientType, statusText, topUpType, amount)

        switch (topUpType) {
            case 1:
            case "1":
                constTopUpType = constPlayerTopUpType.MANUAL;
                proposalTypeName = constProposalType.PLAYER_MANUAL_TOP_UP;
                break;
            case 2:
            case "2":
                constTopUpType = constPlayerTopUpType.ONLINE;
                proposalTypeName = constProposalType.PLAYER_TOP_UP;
                break;
            case 3:
            case "3":
                constTopUpType = constPlayerTopUpType.ALIPAY;
                proposalTypeName = constProposalType.PLAYER_ALIPAY_TOP_UP;
                break;
            case 4:
            case "4":
                constTopUpType = constPlayerTopUpType.WECHAT;
                proposalTypeName = constProposalType.PLAYER_WECHAT_TOP_UP;
                break;
        }

        // get platform data
        let platformData = await dbconfig.collection_platform.findOne({platformId: platformId}).lean();
        if (!platformData) {
            return Promise.reject({
                name: "DataError",
                message: "Cannot find platform"
            });
        }
        topUpSystemConfig = extConfig && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

        // get player data
        let playerData = await dbconfig.collection_players.findOne({name: playerName, platform: platformData._id})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();
        if (!playerData) {
            return Promise.reject({
                name: "DataError",
                message: "Cannot find player"
            });
        }

        // Check player top up permission
        if (playerData && playerData.permission && playerData.permission.allTopUp === false) {
            return Promise.reject({
                status: constServerCode.PLAYER_NO_PERMISSION,
                name: "DataError",
                errorMessage: "Player does not have common topup permission"
            });
        }

        // Check minimum top up amount
        minTopUpAmount = await getMinTopUpAmount(platformData, playerData);
        if (!data.proposalId && (amount < minTopUpAmount)) {
            return Promise.reject({
                status: constServerCode.PLAYER_TOP_UP_FAIL,
                name: "DataError",
                errorMessage: "Top up amount is not enough"
            });
        }

        // if have parent proposal, get back the reward event info
        if (data && data.proposalId) {
            parentProposalData = await dbconfig.collection_proposal.findOne({proposalId: data.proposalId}).lean();

            // Check top up return reward condition
            if (parentProposalData && parentProposalData.data && parentProposalData.data.topUpReturnCode) {
                console.log('JY check parentProposalData.data.userAgent ==>', parentProposalData.data.userAgent);
                let tempUserAgent;

                try {
                    tempUserAgent = JSON.parse(parentProposalData.data.userAgent);
                } catch (e) {
                    tempUserAgent = parentProposalData.data.userAgent;
                }

                rewardEvent = await dbRewardUtil.checkApplyTopUpReturn(playerData, parentProposalData.data.topUpReturnCode, tempUserAgent, data, constTopUpType);
            }

            // Check limited offer condition
            if (parentProposalData && parentProposalData.data && parentProposalData.data.limitedOfferObjId) {
                limitedOfferIntention = await dbRewardUtil.checkLimitedOfferIntention(platformData._id, playerData._id, amount, parentProposalData.data.limitedOfferObjId);
            }

            // Check promo code condition
            if (parentProposalData && parentProposalData.data && parentProposalData.data.bonusCode) {
                let isOpenPromoCode = parentProposalData.data.bonusCode.toString().trim().length === 3;
                if (isOpenPromoCode) {
                    bonusCodeValidity = await dbPromoCode.isOpenPromoCodeValid(playerData.playerId, parentProposalData.data.bonusCode, amount, parentProposalData.data.ipAddress);
                }
                else {
                    bonusCodeValidity = await dbPromoCode.isPromoCodeValid(playerData.playerId, parentProposalData.data.bonusCode, amount);
                }

                // check bonus code validity if exist
                if (parentProposalData.data.bonusCode && !bonusCodeValidity) {
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "DataError",
                        errorMessage: "Wrong promo code has entered"
                    });
                }
            }
        }

        // create proposal data
        let proposalData = {};

        addDetailToProp(proposalData, 'isFromPMSTopUp', Boolean(true));
        addDetailToProp(proposalData, 'playerId', playerData.playerId);
        addDetailToProp(proposalData, 'playerObjId', playerData._id);
        addDetailToProp(proposalData, 'loginDevice', playerData.loginDevice);
        addDetailToProp(proposalData, 'playerName', playerData.name);
        addDetailToProp(proposalData, 'playerRealName', playerData.realName);
        addDetailToProp(proposalData, 'bankCardGroupName', playerData.bankCardGroup && playerData.bankCardGroup.name ? playerData.bankCardGroup.name : '');
        addDetailToProp(proposalData, 'merchantGroupName', playerData.merchantGroup && playerData.merchantGroup.name ? playerData.merchantGroup.name : '');
        addDetailToProp(proposalData, 'wechatPayGroupName', playerData.wechatPayGroup && playerData.wechatPayGroup.name ? playerData.wechatPayGroup.name : '');
        addDetailToProp(proposalData, 'aliPayGroupName', playerData.alipayGroup && playerData.alipayGroup.name ? playerData.alipayGroup.name : '');
        addDetailToProp(proposalData, 'playerLevel', playerData.playerLevel && playerData.playerLevel._id);
        addDetailToProp(proposalData, 'parentProposalId', parentProposalData && parentProposalData.proposalId);
        addDetailToProp(proposalData, 'parentTopUpAmount', parentProposalData && parentProposalData.data && parentProposalData.data.amount);
        addDetailToProp(proposalData, 'platformId', platformData._id);
        addDetailToProp(proposalData, 'platform', platformData.platformId);

        addDetailToProp(proposalData, 'amount', Number(amount));

        addDetailToProp(proposalData, 'merchantNo', data.merchantNo);
        addDetailToProp(proposalData, 'merchantName', data.merchantName);
        addDetailToProp(proposalData, 'merchantUseName', data.merchantTypeName);
        addDetailToProp(proposalData, 'bankCardNo', data.bankCardNo);
        addDetailToProp(proposalData, 'bankCardType', data.bankTypeId);
        addDetailToProp(proposalData, 'bankTypeId', data.bankTypeId);
        addDetailToProp(proposalData, 'cardOwner', data.cardOwner);
        addDetailToProp(proposalData, 'depositTime', data.createTime ? new Date(data.createTime.replace('+', ' ')) : '');
        addDetailToProp(proposalData, 'depositeTime', data.createTime ? new Date(data.createTime.replace('+', ' ')) : '');
        addDetailToProp(proposalData, 'validTime', data.validTime ? new Date(data.validTime.replace('+', ' ')) : '');
        addDetailToProp(proposalData, 'cityName', data.cityName);
        addDetailToProp(proposalData, 'provinceName', data.provinceName);
        addDetailToProp(proposalData, 'orderNo', data.billNo);
        addDetailToProp(proposalData, 'requestId', data.requestId);
        addDetailToProp(proposalData, 'realName', data.realName);

        addDetailToProp(proposalData, 'userAlipayName', data.userAlipayName);
        addDetailToProp(proposalData, 'alipayAccount', data.alipayAccount);
        addDetailToProp(proposalData, 'alipayName', data.alipayName);
        addDetailToProp(proposalData, 'alipayQRCode', data.alipayQRCode);
        addDetailToProp(proposalData, 'qrcodeAddress', data.qrcodeAddress);

        addDetailToProp(proposalData, 'weChatAccount', data.weChatAccount);
        addDetailToProp(proposalData, 'weChatQRCode', data.weChatQRCode);
        addDetailToProp(proposalData, 'name', data.name);
        addDetailToProp(proposalData, 'nickname', data.nickname);
        addDetailToProp(proposalData, 'remark', data.remark);


        if (parentProposalData && parentProposalData.creator) {
            addDetailToProp(proposalData, 'creator', parentProposalData.creator);
        } else {
            let creatorData = {
                type: 'player',
                name: playerData.name,
                id: playerData.playerId
            };
            addDetailToProp(proposalData, 'creator', creatorData);
        }

        if (parentProposalData && parentProposalData.data && parentProposalData.data.ipAddress) {
            addDetailToProp(proposalData, 'lastLoginIp', parentProposalData.data.ipAddress);
        } else {
            addDetailToProp(proposalData, 'lastLoginIp', playerData.lastLoginIp);
        }

        if (platformData.topUpSystemType && topUpSystemConfig) {
            addDetailToProp(proposalData, 'topUpSystemType', platformData.topUpSystemType);
            addDetailToProp(proposalData, 'topUpSystemName', topUpSystemConfig.name);
        } else if (!platformData.topUpSystemType && extConfig && Object.keys(extConfig) && Object.keys(extConfig).length > 0) {
            Object.keys(extConfig).forEach(key => {
                if (key && extConfig[key] && extConfig[key].name && extConfig[key].name === 'PMS') {
                    addDetailToProp(proposalData, 'topUpSystemType', Number(key));
                    addDetailToProp(proposalData, 'topUpSystemName', extConfig[key].name);
                }
            });
        }

        // Check Player Top Up Return / Retention Reward
        if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
            if (rewardEvent.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP){
                addDetailToProp(proposalData, 'topUpReturnCode', rewardEvent.code);
            }
            else if (rewardEvent.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP){
                addDetailToProp(proposalData, 'retentionRewardCode', rewardEvent.code);
                // delete the unrelated rewardEvent.code
                if (proposalData.topUpReturnCode){
                    delete proposalData.topUpReturnCode;
                }
            }
        }

        // Check Limited Offer Intention
        if (limitedOfferIntention) {
            addDetailToProp(proposalData, 'limitedOfferObjId', limitedOfferIntention._id);
            addDetailToProp(proposalData, 'limitedOfferName', limitedOfferIntention.data.limitedOfferName);
            addDetailToProp(proposalData, 'expirationTime', limitedOfferIntention.data.expirationTime);
            let limitedOfferIntentionRemark = '优惠名称: ' + limitedOfferIntention.data.limitedOfferName + ' (' + limitedOfferIntention.proposalId + ')';
            addDetailToProp(proposalData, 'remark', limitedOfferIntentionRemark);
        }

        // Record sub top up method into proposal
        if (data && data.depositMethod) {
            if (proposalTypeName === constProposalType.PLAYER_TOP_UP) {
                addDetailToProp(proposalData, 'topupType', data.depositMethod);
            }
            if (proposalTypeName === constProposalType.PLAYER_MANUAL_TOP_UP) {
                addDetailToProp(proposalData, 'depositMethod', data.depositMethod);
            }
        }

        // deduct service charge - merchant rate
        if (data.merchantNo && data.depositMethod && data.merchantName && platformData && platformData.platformId) {
            let merchantQuery = {
                platformId: platformData.platformId,
                merchantNo: data.merchantNo,
                topupType: data.depositMethod,
                name: data.merchantName
            };

            if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name === 'PMS2')) {
                merchantQuery.isPMS2 = {$exists: true};
            } else {
                merchantQuery.isPMS2 = {$exists: false};
            }

            merchantRate = await dbconfig.collection_platformMerchantList.findOne(merchantQuery, {rate: 1, customizeRate: 1}).lean();

            // Add merchant rate and actualReceivedAmount
            topupRate = merchantRate && merchantRate.customizeRate ? merchantRate.customizeRate : 0;
            topupActualAmt = merchantRate && merchantRate.customizeRate ?
                (Number(amount) - (Number(amount) * Number(merchantRate.customizeRate))).toFixed(2)
                : amount;

            // use system custom rate when there is pms's rate greater than system setting and no customizeRate
            if (merchantRate && !merchantRate.customizeRate && merchantRate.rate
                && platformData && platformData.pmsServiceCharge && platformData.fpmsServiceCharge
                && (merchantRate.rate > platformData.pmsServiceCharge)) {
                topupRate = platformData.fpmsServiceCharge;
                topupActualAmt = (Number(amount) - (Number(amount) * Number(platformData.fpmsServiceCharge))).toFixed(2);
            }

            if (proposalData && proposalData.amount) {
                topupActualAmt = (Number(proposalData.amount) - (Number(proposalData.amount) * Number(topupRate))).toFixed(2);
            }

            addDetailToProp(proposalData, 'rate', topupRate);
            addDetailToProp(proposalData, 'actualAmountReceived', Number(topupActualAmt));
        }

        // add alipay "line" fieldName , and remark for "line"
        if (proposalTypeName === constProposalType.PLAYER_ALIPAY_TOP_UP && data.line) {
            let remark = getRemark(data.line, data.remark);
            addDetailToProp(proposalData, 'line', data.line);
            addDetailToProp(proposalData, 'remark', remark);
        }


        let newProposal = {
            creator: proposalData.creator,
            data: proposalData,
            entryType: constProposalEntryType.CLIENT,
            userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
            status: statusText
        };

        if (Number(data.clientType) == 1) {
            newProposal.inputDevice = constPlayerRegistrationInterface.WEB_PLAYER;
        }
        else if (Number(data.clientType) == 2) {
            newProposal.inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
        }
        else if (Number(data.clientType) == 4) {
            newProposal.inputDevice = constPlayerRegistrationInterface.APP_PLAYER;

            if (parentProposalData && parentProposalData.userAgent && parentProposalData.userAgent.browser && parentProposalData.userAgent.browser.name
                && (parentProposalData.userAgent.browser.name.indexOf("WebKit") !== -1 || parentProposalData.userAgent.browser.name.indexOf("WebView") !== -1)) {
                // 原生APP才算APP，其余的不计算为APP（包壳APP算H5）
                newProposal.inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
            }
        }
        else if (Number(data.clientType) == 7) {
            newProposal.inputDevice = constPlayerRegistrationInterface.APP_NATIVE_PLAYER;
        } else {
            if (parentProposalData && parentProposalData.data && parentProposalData.data.userAgent) {
                newProposal.inputDevice = dbUtil.getInputDevice(parentProposalData.data.userAgent, false);
            }
        }

        return dbProposal.createProposalWithTypeName(platformData._id, proposalTypeName, newProposal).then(
            propData => {
                if (propData) {
                    return {
                        proposalId: propData.proposalId,
                        status: propData.status,
                        amount: propData.data && propData.data.amount,
                        rate: (Number(amount) * Number(topupRate)).toFixed(2),
                        actualAmountReceived: topupActualAmt,
                        realName: propData.data && propData.data.playerRealName,
                        playerName: playerName,
                        platformId: platformId,
                        bankCardNo: propData.data && propData.data.bankCardNo
                    };
                } else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Error in creating proposal",
                        data: {
                            status: statusText,
                            amount: amount,
                            playerName: playerName,
                            platformId: platformId,
                            bankCardNo: data && data.bankCardNo
                        }
                    })
                }
            },
            error => {
                errorUtils.reportError(error);
                return Promise.reject({
                    status: constServerCode.COMMON_ERROR,
                    name: "DataError",
                    message: error.message || error,
                    data: {
                        status: statusText,
                        amount: amount,
                        playerName: playerName,
                        platformId: platformId,
                        bankCardNo: data && data.bankCardNo
                    }
                });
            }
        );


        function getMinTopUpAmount(platformData, playerData){
            let playerTopUpCount;
            let platformTopUpAmountConfig;
            let defaultMinTopUpAmount = 10;

            let topUpCountProm = dbconfig.collection_playerTopUpRecord.aggregate(
                [
                    {
                        $match: {
                            platformId: platformData._id,
                            createTime: {$gte: new Date(playerData.registrationTime), $lte: new Date()},
                            playerId: playerData._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: {$sum: 1}
                        }
                    }
                ]
            ).allowDiskUse(true).exec();

            let platformTopUpAmountConfigProm = dbconfig.collection_platformTopUpAmountConfig.findOne({platformObjId: platformData._id}).lean();

            return Promise.all([topUpCountProm, platformTopUpAmountConfigProm]).then(
                data => {
                    playerTopUpCount = data[0] && data[0][0] && data[0][0].count ? data[0][0].count : 0;
                    platformTopUpAmountConfig = data[1];

                    let newMinTopUpAmount;
                    if (platformTopUpAmountConfig && platformTopUpAmountConfig.commonTopUpAmountRange
                        && platformTopUpAmountConfig.commonTopUpAmountRange.minAmount) {
                        newMinTopUpAmount = platformTopUpAmountConfig.commonTopUpAmountRange.minAmount;
                    }

                    if (platformTopUpAmountConfig && platformTopUpAmountConfig.topUpCountAmountRange && platformTopUpAmountConfig.topUpCountAmountRange.length > 0) {
                        let topUpCountAmountRanges = platformTopUpAmountConfig.topUpCountAmountRange;
                        topUpCountAmountRanges.sort((a, b) => a.topUpCount - b.topUpCount);

                        for (let i = 0; i < topUpCountAmountRanges.length; i++) {
                            let range = topUpCountAmountRanges[i];
                            if (range && range.topUpCount && (playerTopUpCount <= range.topUpCount)) {
                                if(range && range.minAmount) {
                                    newMinTopUpAmount = range.minAmount;
                                }
                                break;
                            }
                        }
                    }

                    if (!newMinTopUpAmount) {
                        newMinTopUpAmount = defaultMinTopUpAmount;
                    }

                    return newMinTopUpAmount;
                }
            )
        }

        function getRemark (lineNo, callbackRemark) {
            let remark = callbackRemark;
            let remarkMsg = {
                '2':[", 线路二：不匹配昵称、支付宝帐号", "线路二：不匹配昵称、支付宝帐号"],
                '3':[", 网赚", "网赚"]
            }
            if (callbackRemark) {
                remark += (remarkMsg[lineNo] && remarkMsg[lineNo][0]) ? remarkMsg[lineNo][0] : '';
            } else {
                remark = (remarkMsg[lineNo] && remarkMsg[lineNo][1] && lineNo!= "1") ? remarkMsg[lineNo][1] : '';
            }
            return remark;
        }

        function addDetailToProp (updObj, updField, data) {
            if (typeof data !== "undefined" && data !== null) {
                updObj[updField] = data
            }
        }
    }
    //#endregion

};

async function checkFailTopUp (player, returnData) {
    let checkMonitorTopUpCond = Boolean(player.platform && player.platform.monitorTopUpNotify && player.platform.monitorTopUpCount);
    let checkMonitorCommonTopUpCond = Boolean(player.platform && player.platform.monitorCommonTopUpCountNotify && player.platform.monitorCommonTopUpCount);
    if (!checkMonitorTopUpCond && !checkMonitorCommonTopUpCond) {
        return returnData; // does not need to check
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
        status: {$nin: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
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
            returnData.isExceedTopUpFailCount = true;
            returnData.isExceedCommonTopUpFailCount = true;
        } else if (commonTopUpCount >= player.platform.monitorCommonTopUpCount) {
            returnData.isExceedCommonTopUpFailCount = true;
        } else if (otherTopUpCount >= player.platform.monitorTopUpCount) {
            returnData.isExceedTopUpFailCount = true;
        }
    } else if (checkMonitorTopUpCond){
        if (otherTopUpCount >= player.platform.monitorTopUpCount) {
            returnData.isExceedTopUpFailCount = true;
        }
    } else if (checkMonitorCommonTopUpCond) {
        if (commonTopUpCount >= player.platform.monitorCommonTopUpCount) {
            returnData.isExceedCommonTopUpFailCount = true;
        }
    }

    return returnData;
}

function getBankTypeNameArr (bankCardFilterList, maxDeposit, platformData) {
    let bankListArr = [];
    return RESTUtils.getPMS2Services("postBankTypeList", {}, platformData.topUpSystemType).then(
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
    paramString += proposalData.proposalId + delimiter;
    paramString += proposalData.entryType + delimiter;
    paramString += proposalData.createTime.getTime();

    let encryptedParamString = "tk=".concat(jwt.sign(paramString, getSecret(playerData, extConfig)));

    return url.concat(encryptedParamString);

    function getSecret (playerData, extConfig) {
        if (extConfig[playerData.platform.topUpSystemType].name === 'PMS2') {
            return constSystemParam.PMS2_AUTH_SECRET_KEY;
        }

        if (extConfig[playerData.platform.topUpSystemType].name === 'DAYOU') {
            return constSystemParam.DAYOU_AUTH_SECRET_KEY;
        }

        return constSystemParam.PMS2_AUTH_SECRET_KEY;
    }
}

module.exports = dbPlayerPayment;
