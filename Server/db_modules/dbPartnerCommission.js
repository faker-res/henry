"use strict";

let dbPartnerCommissionFunc = function () {
};
module.exports = new dbPartnerCommissionFunc();

const dbconfig = require('./../modules/dbproperties');
const dbPartnerCommissionConfig = require('../db_modules/dbPartnerCommissionConfig');
const constPartnerCommissionType = require('../const/constPartnerCommissionType');
const constProposalType = require('../const/constProposalType');
const constProposalMainType = require('../const/constProposalMainType');
const errorUtils = require('./../modules/errorUtils');
const math = require('mathjs');

const dbPartnerCommission = {
    calculatePartnerCommission: (partnerObjId, startTime, endTime) => {
        let platform, partner;
        // let players = [];
        let providerGroups = [];
        let partnerChain = [];
        let isMainPartner = false;
        let mainPartner; // the partner of last obj id in partner Chain
        let commConfig, commRate, activePlayerRequirement, topUpProposalTypes, rewardProposalTypes;
        let activeDownLines = 0;
        let providerGroupConsumptionData, playerRawDetail;
        let bonusBased = false;
        let commissionRates;
        let grossCommission = 0, rawCommissions = [];
        let parentCommission;
        let totalReward = 0, totalTopUp = 0, totalWithdrawal = 0, depositCrewDetail = [], withdrawCrewDetail = [], bonusCrewDetail = [];
        let totalRewardFee = 0, totalTopUpFee = 0, totalWithdrawalFee = 0, totalPlatformFee = 0, totalWinLose = 0, nettCommission = 0;


        return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean()
            .populate({path: "platform", model: dbconfig.collection_platform}).then(
                partnerData => {
                    if (!partnerData) {
                        return Promise.reject({
                            name: "DataError",
                            message: "Error in getting partner data",
                        });
                    }
                    partner = partnerData;
                    platform = partnerData.platform;

                    // let playerProm = dbconfig.collection_players.find({platform: platform._id, partner: partner._id}).lean();
                    let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platform._id}).lean();
                    let partnerChainProm = Promise.resolve([partner._id]);
                    if (partner.parent) {
                        partnerChainProm = dbPartnerCommissionConfig.getPartnerParentChain(partner._id);
                    }


                    return Promise.all([providerGroupProm, partnerChainProm]);
                }
            ).then(
                ([providerGroupData, partnerChainData]) => {
                    // players = playerData || players;
                    providerGroups = providerGroupData || providerGroups;
                    partnerChain = partnerChainData || [];

                    let mainPartnerObjId = partnerChain[partnerChain.length - 1];
                    if (!mainPartnerObjId || String(mainPartnerObjId) === String(partnerObjId)) {
                        isMainPartner = true;
                    }

                    if (isMainPartner) {
                        return Promise.resolve(partner)
                    }
                    return dbconfig.collection_partner.findOne(mainPartnerObjId).lean();
                }
            ).then(
                mainPartnerData => {
                    mainPartner = mainPartnerData || partner;

                    if (mainPartner.commissionType != constPartnerCommissionType.WEEKLY_BONUS_AMOUNT && mainPartner.commissionType != constPartnerCommissionType.DAILY_CONSUMPTION) {
                        return Promise.reject({message: "Please select a commission type"});
                    }

                    bonusBased = Boolean(mainPartner.commissionType == constPartnerCommissionType.WEEKLY_BONUS_AMOUNT);

                    let commConfigProms = partnerChain.map(partnerObjId => {
                        return dbPartnerCommissionConfig.getPartnerCommConfig(partnerObjId, mainPartner.commissionType);
                    });

                    let commRateProm = dbPartnerCommissionConfig.getPartnerCommRate(mainPartner._id);

                    let activePlayerRequirementProm = getRelevantActivePlayerRequirement(platform._id, mainPartner.commissionType);
                    let paymentProposalTypesProm = getPaymentProposalTypes(platform._id);
                    let rewardProposalTypesProm = getRewardProposalTypes(platform._id);

                    return Promise.all([commConfigProms, commRateProm, activePlayerRequirementProm, paymentProposalTypesProm, rewardProposalTypesProm]);
                }
            ).then(
                ([commConfigData, commRateData, activePlayerRequirementData, paymentProposalTypesData, rewardProposalTypesData]) => {
                    [commConfig, commRate, activePlayerRequirement, topUpProposalTypes, rewardProposalTypes] = [commConfigData, commRateData, activePlayerRequirementData, paymentProposalTypesData, rewardProposalTypesData];

                    return getAllPlayerCommissionRawDetailsWithSettlement(partner._id, platform._id, mainPartner.commissionType, startTime, endTime, providerGroups, topUpProposalTypes, rewardProposalTypes, activePlayerRequirement);
                }
            ).then(
                playerRawData => {
                    playerRawDetail = playerRawData;

                    activeDownLines = getActiveDownLineCount(playerRawDetail);

                    providerGroupConsumptionData = getTotalPlayerConsumptionByProviderGroupName(playerRawDetail, providerGroups);

                    commConfig = commConfig || [];
                    let currentCommissionRate = commConfig[commConfig.length-1];

                    // calculate parents' commission based on ratio

                    // get ratio
                    currentCommissionRate = insertCommissionRatio(currentCommissionRate, commConfig);

                    // normal calculation
                    currentCommissionRate.map(groupRate => {
                        let totalConsumption = bonusBased ? -providerGroupConsumptionData[groupRate.groupName].bonusAmount : providerGroupConsumptionData[groupRate.groupName].validAmount;

                        let totalBonusAmount = -providerGroupConsumptionData[groupRate.groupName].bonusAmount;

                        commissionRates[groupRate.groupName] = getCommissionRate(groupRate.rateTable, totalConsumption, activeDownLines);

                        let platformFeeRateData = {
                            rate : 0,
                            isCustom: false
                        };

                        if (bonusBased && commRate && commRate.rateAfterRebateGameProviderGroup
                            && commRate.rateAfterRebateGameProviderGroup.length > 0) {
                            commRate.rateAfterRebateGameProviderGroup.map(group => {
                                if (group.name === groupRate.groupName) {
                                    platformFeeRateData.rate = group.rate || 0;
                                    platformFeeRateData.isCustom = Boolean(group.isCustom);
                                }
                            });
                        }

                        let rawCommission = math.chain(totalConsumption).multiply(commissionRates[groupRate.groupName].commissionRate).round(2).done();

                        let platformFeeRate = platformFeeRateData.rate || 0;
                        let platformFee = 0;
                        if (bonusBased) {
                            platformFee = math.chain(platformFeeRate).multiply(totalBonusAmount).round(2);
                        }
                        totalPlatformFee += platformFee;

                        rawCommissions.push({
                            crewProfit: providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                            crewProfitDetail: providerGroupConsumptionData[groupRate.groupName].crewProfitDetail,
                            groupName: groupRate.groupName,
                            groupId: groupRate.groupId,
                            amount: rawCommission,
                            totalConsumption: totalConsumption,
                            commissionRate: commissionRates[groupRate.groupName].commissionRate,
                            isCustomCommissionRate: commissionRates[groupRate.groupName].isCustom,
                            platformFee: platformFee,
                            platformFeeRate: platformFeeRate,
                            isCustomPlatformFeeRate: isCustomPlatformFeeRate,
                            siteBonusAmount: -providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                        });

                        grossCommission += rawCommission;

                        // todo:: calculate commission of each parent for each platform


                    });

                    playerRawDetail.map(player => {
                        totalTopUp += player.topUpDetail.topUpAmount || 0;
                        totalReward += player.rewardDetail.total || 0;
                        totalWithdrawal += player.withdrawalDetail.withdrawalAmount || 0;
                        totalWinLose += player.consumptionDetail.bonusAmount || 0;
                        if (player.topUpDetail.topUpAmount) {
                            depositCrewDetail.push({
                                crewAccount: player.name,
                                crewDepositAmount: player.topUpDetail.topUpAmount
                            })
                        }
                        if (player.withdrawalDetail.withdrawalAmount) {
                            withdrawCrewDetail.push({
                                crewAccount: player.name,
                                crewWithdrawAmount: player.withdrawalDetail.withdrawalAmount
                            })
                        }
                        if (player.rewardDetail.total) {
                            bonusCrewDetail.push({
                                crewAccount: player.name,
                                crewBonusAmount: player.rewardDetail.total
                            })
                        }
                    });

                    nettCommission = grossCommission;
                    if (bonusBased) {
                        totalRewardFee = math.chain(totalReward).multiply(commRate.rateAfterRebatePromo).divide(100).round(2).done();
                        totalTopUpFee = math.chain(totalTopUp).multiply(commRate.rateAfterRebateTotalDeposit).divide(100).round(2).done();
                        totalWithdrawalFee = math.chain(totalWithdrawal).multiply(commRate.rateAfterRebateTotalWithdrawal).divide(100).round(2).done();
                        nettCommission = grossCommission - totalPlatformFee - totalTopUpFee - totalWithdrawalFee - totalRewardFee;
                    }


                }
            )

    },
};

let proto = dbPartnerCommissionFunc.prototype;
proto = Object.assign(proto, dbPartnerCommission);
module.exports = dbPartnerCommission;

function getPaymentProposalTypes (platformObjId) {
    return dbconfig.collection_proposalType.find({platformId: platformObjId}, {name: 1}).lean().then(
        proposalType => {
            let topUpTypes = {};
            for (let i = 0, len = proposalType.length; i < len; i++) {
                let proposalTypeObj = proposalType[i];

                switch (proposalTypeObj.name) {
                    case constProposalType.PLAYER_TOP_UP:
                        topUpTypes.onlineTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_COMMON_TOP_UP:
                        topUpTypes.onlineTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_MANUAL_TOP_UP:
                        topUpTypes.manualTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_WECHAT_TOP_UP:
                        topUpTypes.weChatTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_ALIPAY_TOP_UP:
                        topUpTypes.aliPayTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                }
            }

            return topUpTypes;
        }
    );
}

function getRelevantActivePlayerRequirement (platformObjId, commissionType) {
    let configPrefix = "weeklyActivePlayer";
    switch (Number(commissionType)) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
        case constPartnerCommissionType.DAILY_CONSUMPTION:
            configPrefix = "dailyActive";
            break;
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            configPrefix = "weeklyActive";
            break;
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            configPrefix = "halfMonthActive";
            break;
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            configPrefix = "monthlyActive";
            break;
    }

    return dbconfig.collection_activeValidDailyPlayer.findOne({platform: platformObjId}).lean().then(
        partnerLevelConfig => {
            return {
                topUpTimes: partnerLevelConfig[configPrefix + "PlayerTopUpTimes"] || 0,
                topUpAmount: partnerLevelConfig[configPrefix + "PlayerTopUpAmount"] || 0,
                consumptionTimes: partnerLevelConfig[configPrefix + "PlayerConsumptionTimes"] || 0,
                consumptionAmount: partnerLevelConfig[configPrefix + "PlayerConsumptionAmount"] || 0,
            }
        }
    );
}

function getRewardProposalTypes (platformObjId) {
    return dbconfig.collection_proposalType.find({platformId: platformObjId}, {name: 1}).lean().then(
        proposalType => {
            let rewardTypes = {};
            for (let i = 0, len = proposalType.length; i < len; i++) {
                let proposalTypeObj = proposalType[i];

                switch (proposalTypeObj.name) {
                    case constProposalType.ADD_PLAYER_REWARD_TASK:
                        rewardTypes.manualReward = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_CONSUMPTION_RETURN:
                        rewardTypes.consumptionReturn = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_LIMITED_OFFER_REWARD:
                        rewardTypes.limitedOffer = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_PROMO_CODE_REWARD:
                        rewardTypes.promoCode = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_CONVERT_REWARD_POINTS:
                        rewardTypes.convertRewardPoint = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_AUTO_CONVERT_REWARD_POINTS:
                        rewardTypes.autoConvertRewardPoint = proposalTypeObj._id.toString();
                        break;
                }
            }

            return rewardTypes;
        }
    );
}

function getAllPlayerCommissionRawDetails (playerObjId, commissionType, startTime, endTime, providerGroups, topUpTypes, rewardTypes, activePlayerRequirement) {
    let consumptionDetailProm = getPlayerCommissionConsumptionDetail(playerObjId, startTime, endTime, providerGroups).catch(err => {
        console.error('getPlayerCommissionConsumptionDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let topUpDetailProm = getPlayerCommissionTopUpDetail(playerObjId, startTime, endTime, topUpTypes).catch(err => {
        console.error('getPlayerCommissionTopUpDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let withdrawalDetailProm = getPlayerCommissionWithdrawDetail(playerObjId, startTime, endTime).catch(err => {
        console.error('getPlayerCommissionWithdrawDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let rewardDetailProm = getPlayerCommissionRewardDetail(playerObjId, startTime, endTime, rewardTypes).catch(err => {
        console.error('getPlayerCommissionRewardDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let namesProm = dbconfig.collection_players.findOne({_id: playerObjId}, {name:1, realName:1}).lean();

    return Promise.all([consumptionDetailProm, topUpDetailProm, withdrawalDetailProm, rewardDetailProm, namesProm]).then(
        data => {
            let consumptionDetail = data[0];
            let topUpDetail = data[1];
            let withdrawalDetail = data[2];
            let rewardDetail = data[3];
            let name = (data[4] && data[4].name) || "";
            let realName = (data[4] && data[4].realName) || "";

            let active = isPlayerActive(activePlayerRequirement, consumptionDetail.consumptionTimes, consumptionDetail.validAmount, topUpDetail.topUpTimes, topUpDetail.topUpAmount);

            return {
                name,
                realName,
                consumptionDetail,
                topUpDetail,
                withdrawalDetail,
                rewardDetail,
                active,
            };
        }
    );
}

function getPlayerCommissionConsumptionDetail (playerObjId, startTime, endTime, providerGroups) {
    return dbconfig.collection_playerConsumptionRecord.aggregate([
        {
            $match: {
                playerId: ObjectId(playerObjId),
                createTime: {
                    $gte: new Date(startTime),
                    $lt: new Date(endTime)
                },
                $or: [
                    {isDuplicate: {$exists: false}},
                    {
                        $and: [
                            {isDuplicate: {$exists: true}},
                            {isDuplicate: false}
                        ]
                    }
                ]
            }
        },
        {
            $group: {
                _id: "$providerId",
                provider: {$first: "$providerId"},
                count: {$sum: {$cond: ["$count", "$count", 1]}},
                validAmount: {$sum: "$validAmount"},
                bonusAmount: {$sum: "$bonusAmount"},
            }
        }
    ]).allowDiskUse(true).read("secondaryPreferred").then(
        consumptionData => {
            if (!consumptionData || !consumptionData[0]) {
                consumptionData = [];
            }

            let consumptionDetail = {
                consumptionTimes: 0,
                validAmount: 0,
                bonusAmount: 0,
            };

            let consumptionProviderDetail = {};

            if (providerGroups && providerGroups.length > 0) {
                providerGroups.map(group => {
                    consumptionProviderDetail[group.name] = {
                        consumptionTimes: 0,
                        validAmount: 0,
                        bonusAmount: 0,
                    }
                });
            }

            consumptionData.map(providerConsumptionData => {
                if (providerGroups && providerGroups.length > 0) {
                    providerGroups.map(group => {
                        if (!group || !group.providers) {
                            return;
                        }
                        group.providers.map(groupProviderId => {
                            if (String(groupProviderId) === String(providerConsumptionData.provider)) {
                                consumptionProviderDetail[group.name].consumptionTimes += providerConsumptionData.count;
                                consumptionProviderDetail[group.name].validAmount += providerConsumptionData.validAmount;
                                consumptionProviderDetail[group.name].bonusAmount += providerConsumptionData.bonusAmount;
                            }
                        });
                    });
                }

                consumptionDetail.consumptionTimes += providerConsumptionData.count;
                consumptionDetail.validAmount += providerConsumptionData.validAmount;
                consumptionDetail.bonusAmount += providerConsumptionData.bonusAmount;
            });

            consumptionDetail.consumptionProviderDetail = consumptionProviderDetail;

            return consumptionDetail;
        }
    );
}

function getPlayerCommissionTopUpDetail (playerObjId, startTime, endTime, topUpTypes) {
    return dbconfig.collection_proposal.aggregate([
        {
            "$match": {
                "data.playerObjId": {$in: [ObjectId(playerObjId), String(playerObjId)]},
                "createTime": {
                    "$gte": new Date(startTime),
                    "$lte": new Date(endTime)
                },
                "mainType": "TopUp",
                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            }
        },
        {
            "$group": {
                "_id": "$type",
                "typeId": {"$first": "$type"},
                "count": {"$sum": 1},
                "amount": {"$sum": "$data.amount"}
            }
        }
    ]).read("secondaryPreferred").then(
        topUpData => {
            if (!topUpData || !topUpData[0]) {
                topUpData = [];
            }

            let playerTopUpDetail = {
                onlineTopUpAmount: 0,
                manualTopUpAmount: 0,
                weChatTopUpAmount: 0,
                aliPayTopUpAmount: 0,
                topUpAmount: 0,
                topUpTimes: 0,
            };

            for (let i = 0, len = topUpData.length; i < len; i++) {
                let topUpTypeRecord = topUpData[i];

                if (topUpTypes) {
                    switch (String(topUpTypeRecord.typeId)) {
                        case topUpTypes.onlineTopUpTypeId:
                            playerTopUpDetail.onlineTopUpAmount = topUpTypeRecord.amount;
                            break;
                        case topUpTypes.manualTopUpTypeId:
                            playerTopUpDetail.manualTopUpAmount = topUpTypeRecord.amount;
                            break;
                        case topUpTypes.weChatTopUpTypeId:
                            playerTopUpDetail.weChatTopUpAmount = topUpTypeRecord.amount;
                            break;
                        case topUpTypes.aliPayTopUpTypeId:
                            playerTopUpDetail.aliPayTopUpAmount = topUpTypeRecord.amount;
                            break;
                    }
                }

                playerTopUpDetail.topUpAmount += topUpTypeRecord.amount;
                playerTopUpDetail.topUpTimes += topUpTypeRecord.count;
            }

            return playerTopUpDetail;
        }
    );
}

function getPlayerCommissionWithdrawDetail (playerObjId, startTime, endTime) {
    return dbconfig.collection_proposal.aggregate([
        {
            "$match": {
                "data.playerObjId": {$in: [ObjectId(playerObjId), String(playerObjId)]},
                "createTime": {
                    "$gte": new Date(startTime),
                    "$lte": new Date(endTime)
                },
                "mainType": "PlayerBonus",
                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            }
        },
        {
            "$group": {
                "_id": null,
                "count": {"$sum": 1},
                "amount": {"$sum": "$data.amount"}
            }
        }
    ]).read("secondaryPreferred").then(
        withdrawalInfo => {
            if (!withdrawalInfo || !withdrawalInfo[0]) {
                withdrawalInfo = [{}];
            }

            let withdrawalTotal = withdrawalInfo[0];

            return {
                withdrawalTimes: withdrawalTotal.count || 0,
                withdrawalAmount: withdrawalTotal.amount || 0,
            }
        }
    );
}

function getPlayerCommissionRewardDetail (playerObjId, startTime, endTime, rewardTypes) {
    let rewardProm = dbconfig.collection_proposal.aggregate([
        {
            "$match": {
                "data.playerObjId": {$in: [ObjectId(playerObjId), String(playerObjId)]},
                "createTime": {
                    "$gte": new Date(startTime),
                    "$lte": new Date(endTime)
                },
                "mainType": "Reward",
                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            }
        },
        {
            "$group": {
                "_id": "$type",
                "typeId": {"$first": "$type"},
                "amount": {"$sum": "$data.rewardAmount"}
            }
        }
    ]).read("secondaryPreferred");

    return rewardProm.then(
        rewardData => {
            if (!rewardData || !rewardData[0]) {
                rewardData = [];
            }

            let playerRewardDetail = {
                systemReward: 0,
                manualReward: 0,
                consumptionReturn: 0,
                limitedOffer: 0,
                promoCode: 0,
                pointConversion: 0,
                total: 0
            };

            for (let i = 0, len = rewardData.length; i < len; i++) {
                let rewardTypeTotal = rewardData[i];

                switch (String(rewardTypeTotal.typeId)) {
                    case rewardTypes.manualReward:
                        playerRewardDetail.manualReward = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.consumptionReturn:
                        playerRewardDetail.consumptionReturn = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.limitedOffer:
                        playerRewardDetail.limitedOffer = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.promoCode:
                        playerRewardDetail.promoCode = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.convertRewardPoint:
                    case rewardTypes.autoConvertRewardPoint:
                        playerRewardDetail.pointConversion += rewardTypeTotal.amount;
                        break;
                    default:
                        playerRewardDetail.systemReward += rewardTypeTotal.amount;
                }

                playerRewardDetail.total += rewardTypeTotal.amount;
            }

            return playerRewardDetail;
        }
    );
}

function isPlayerActive (activePlayerRequirement, playerConsumptionTimes, playerConsumptionAmount, playerTopUpTimes, playerTopUpAmount) {
    return Boolean(
        (playerConsumptionTimes >= activePlayerRequirement.consumptionTimes)
        && (playerConsumptionAmount >= activePlayerRequirement.consumptionAmount)
        && (playerTopUpTimes >= activePlayerRequirement.topUpTimes)
        && (playerTopUpAmount >= activePlayerRequirement.topUpAmount)
    );
}

function getAllPlayerCommissionRawDetailsWithSettlement (partnerObjId, platformObjId, commissionType, startTime, endTime, providerGroups, topUpTypes, rewardTypes, activePlayerRequirement) {
    let playerObjIdArr = [];
    let details = [];
    players.map(player => {
        playerObjIdArr.push(player._id);
    });

    let stream = dbconfig.collection_players.find({partner: partnerObjId, platform: platformObjId}, {_id: 1}).cursor({batchSize: 500});
    let balancer = new SettlementBalancer();

    return balancer.initConns().then(function () {
        return Q(
            balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "getAllPlayerCommissionRawDetails", {
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            }),
                            commissionType,
                            startTime,
                            endTime,
                            providerGroups,
                            topUpTypes,
                            rewardTypes,
                            activePlayerRequirement
                        });
                    },
                    processResponse: function (record) {
                        details = details.concat(record.data);
                    }
                }
            )
        );
    }).then(
        () => {
            return details;
        }
    );
}

function getActiveDownLineCount (downLineRawDetail) {
    let count = 0;
    downLineRawDetail.map(player => {
        if (player.active) {
            count++;
        }
    });

    return count;
}

function getTotalPlayerConsumptionByProviderGroupName (downLineRawDetail, providerGroups) {
    let total = {};

    if (providerGroups && providerGroups.length > 0) {
        providerGroups.map(group => {
            total[group.name] = {
                validAmount: 0,
                bonusAmount: 0,
                consumptionTimes: 0,
                crewProfitDetail: [],
            };
        });

        downLineRawDetail.map(downLine => {
            providerGroups.map(group => {
                if(downLine.consumptionDetail.consumptionProviderDetail[group.name]) {
                    total[group.name].validAmount += downLine.consumptionDetail.consumptionProviderDetail[group.name].validAmount;
                    total[group.name].bonusAmount += downLine.consumptionDetail.consumptionProviderDetail[group.name].bonusAmount;
                    total[group.name].consumptionTimes += downLine.consumptionDetail.consumptionProviderDetail[group.name].consumptionTimes;
                    if (downLine.consumptionDetail.consumptionProviderDetail[group.name].consumptionTimes) {
                        total[group.name].crewProfitDetail.push({
                            crewAccount: downLine.name,
                            singleCrewProfit: downLine.consumptionDetail.consumptionProviderDetail[group.name].bonusAmount
                        });
                    }
                }
            });
        });
    }
    else {
        total['noGroup'] = {
            validAmount: 0,
            bonusAmount: 0,
            consumptionTimes: 0,
        };

        downLineRawDetail.map(downLine => {
            if(downLine.consumptionDetail) {
                total['noGroup'].validAmount += downLine.consumptionDetail.validAmount;
                total['noGroup'].bonusAmount += downLine.consumptionDetail.bonusAmount;
                total['noGroup'].consumptionTimes += downLine.consumptionDetail.consumptionTimes;
            }
        });
    }

    return total;
}

function insertCommissionRatio(configObj, commConfigs) {
    // commConfigs consist of multiple partner, each partner consist of multiple partnercommconfig base on provider
    // each provider config have multiple commissionSetting
    commConfigs = commConfigs || [];
    for (let i = commConfigs.length - 2; i >= 0; i--) {
        let parent = commConfigs[i];
        configObj.map(providerConfig => {
            let sameProviderConfig = parent.find(parentProvider => {
                return String(parentProvider.provider) == String(providerConfig.provider);
            });

            providerConfig.commissionSetting = providerConfig.commissionSetting || [];
            sameProviderConfig.commissionSetting = sameProviderConfig.commissionSetting || [];
            for (let i = 0; i < providerConfig.commissionSetting.length; i++) {
                let curSetting = providerConfig.commissionSetting[i];
                let parentSetting = sameProviderConfig.commissionSetting[i];
                curSetting.parentRatio = curSetting.parentRatio || [];
                curSetting.parentRate = curSetting.parentRate || [];
                let currentRate = curSetting.commissionRate;
                if (!currentRate) return;
                let lastParentRate = curSetting.parentRate.length ? curSetting.parentRate[curSetting.parentRate.length - 1] : currentRate;
                let parentRate = parentSetting && parentSetting.commissionRate || currentRate;
                let parentRatio = math.chain(parentRate-lastParentRate).divide(currentRate).round(8).done();
                curSetting.parentRatio.push(parentRatio);
                curSetting.parentRate.push(parentRate);
            }

            return providerConfig;
        });
    }
    return configObj;
}