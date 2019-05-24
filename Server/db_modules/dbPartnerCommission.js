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
const dbutility = require('./../modules/dbutility');
const SettlementBalancer = require('../settlementModule/settlementBalancer');
const Q = require('q');
const constSystemParam = require('./../const/constSystemParam');
const constServerCode = require('./../const/constServerCode');
const constPartnerCommissionLogStatus = require('./../const/constPartnerCommissionLogStatus');

const dbPartnerCommission = {
    calculatePartnerCommission: (partnerObjId, startTime, endTime) => {
        let platform, partner;
        // let players = [];
        let providerGroups = [];
        let partnerChain = [];
        let parentChain = [];
        let isMainPartner = false;
        let mainPartner; // the partner of last obj id in partner Chain
        let commConfig, commRate, activePlayerRequirement, topUpProposalTypes, rewardProposalTypes, directCommConfig;
        let activeDownLines = 0;
        let providerGroupConsumptionData, playerRawDetail;
        let bonusBased = false;
        let commissionRates = {};
        let grossCommission = 0, grossDirectCommission = 0, rawCommissions = [];
        let totalReward = 0, totalTopUp = 0, totalWithdrawal = 0, depositCrewDetail = [], withdrawCrewDetail = [], bonusCrewDetail = [];
        let totalRewardFee = 0, totalTopUpFee = 0, totalWithdrawalFee = 0, totalPlatformFee = 0, totalWinLose = 0, nettCommission = 0;
        let parentCommissionDetail = {};
        let commissionPeriod;
        let remarks = "";


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

                    let mainPartnerObjId = partnerChain[partnerChain.length - 1] && partnerChain[partnerChain.length - 1]._id;
                    if (!mainPartnerObjId || String(mainPartnerObjId) === String(partnerObjId)) {
                        isMainPartner = true;
                    }

                    mainPartner = isMainPartner ? partner : partnerChain[partnerChain.length - 1];

                    for (let i = 1; i < partnerChain.length; i++) {
                        parentChain.push(partnerChain[i]);
                    }

                    if (mainPartner.commissionType != constPartnerCommissionType.WEEKLY_BONUS_AMOUNT && mainPartner.commissionType != constPartnerCommissionType.DAILY_CONSUMPTION) {
                        return Promise.reject({message: "Please select a commission type"});
                    }

                    commissionPeriod = getCommissionPeriod(mainPartner.commissionType);
                    if (startTime && endTime) {
                        commissionPeriod = {
                            startTime: startTime,
                            endTime: endTime
                        };
                    }

                    bonusBased = Boolean(mainPartner.commissionType == constPartnerCommissionType.WEEKLY_BONUS_AMOUNT);

                    let commConfigProm = getCommissionTables(partner._id, parentChain, mainPartner.commissionType, providerGroups);

                    let commRateProm = dbPartnerCommissionConfig.getPartnerCommRate(mainPartner._id);

                    let activePlayerRequirementProm = getRelevantActivePlayerRequirement(platform._id, mainPartner.commissionType);
                    let paymentProposalTypesProm = getPaymentProposalTypes(platform._id);
                    let rewardProposalTypesProm = getRewardProposalTypes(platform._id);
                    let directCommConfigProm = getDirectCommissionRateTables(platform._id, mainPartner.commissionType, partner._id, providerGroups);

                    return Promise.all([commConfigProm, commRateProm, activePlayerRequirementProm, paymentProposalTypesProm, rewardProposalTypesProm, directCommConfigProm]);
                }
            ).then(
                ([commConfigData, commRateData, activePlayerRequirementData, paymentProposalTypesData, rewardProposalTypesData, directCommConfigData]) => {
                    [commConfig, commRate, activePlayerRequirement, topUpProposalTypes, rewardProposalTypes, directCommConfig] = [commConfigData, commRateData, activePlayerRequirementData, paymentProposalTypesData, rewardProposalTypesData, directCommConfigData];
                    return getAllPlayerCommissionRawDetailsWithSettlement(partner._id, platform._id, mainPartner.commissionType, commissionPeriod.startTime, commissionPeriod.endTime, providerGroups, topUpProposalTypes, rewardProposalTypes, activePlayerRequirement);
                }
            ).then(
                playerRawData => {
                    playerRawDetail = playerRawData;

                    activeDownLines = getActiveDownLineCount(playerRawDetail);

                    providerGroupConsumptionData = getTotalPlayerConsumptionByProviderGroupName(playerRawDetail, providerGroups);

                    commConfig = commConfig || [];

                    for (let i = 0; i < parentChain.length; i++) {
                        let parent = parentChain[i];
                        let objId = String(parent._id);
                        parentCommissionDetail[objId] = parentCommissionDetail[objId] || {
                            parentObjId: objId,
                            parentName: partner.partnerName,
                            grossCommission: 0

                        };
                    }

                    // normal calculation
                    commConfig.map(groupRate => {
                        let totalConsumption = bonusBased ? -providerGroupConsumptionData[groupRate.groupName].bonusAmount : providerGroupConsumptionData[groupRate.groupName].validAmount;

                        let totalBonusAmount = -providerGroupConsumptionData[groupRate.groupName].bonusAmount;

                        let directCommissionGroupRate = directCommConfig.find(group => {
                            return groupRate.groupId == group.groupId;
                        });

                        // f*** variable name, too much to change after Ken misdirect me the given requirement
                        // just know that all "direct" commission are partner's commision, anything does not have
                        // direct on it means its parent's stuff. deal? deal!
                        commissionRates[groupRate.groupName] = getCommissionRate(groupRate.rateTable, totalConsumption, activeDownLines);
                        let directCommissionRate = getDirectCommissionRate(directCommissionGroupRate.rateTable, totalConsumption, activeDownLines);

                        let platformFeeRateData = {
                            rate : 0,
                            isCustom: false
                        };

                        if (bonusBased && commRate && commRate.rateAfterRebateGameProviderGroup
                            && commRate.rateAfterRebateGameProviderGroup.length > 0) {
                            commRate.rateAfterRebateGameProviderGroup.map(group => {
                                if (group.name === groupRate.groupName) {
                                    platformFeeRateData.rate = group.rate || 0;
                                }
                            });
                        }

                        let rawCommission = math.chain(totalConsumption).multiply(commissionRates[groupRate.groupName].commissionRate).round(2).done(); // this is useless for partner, only use to count relative partner's commission
                        let rawDirectCommission = math.chain(totalConsumption).multiply(directCommissionRate.commissionRate).round(2).done();

                        let platformFeeRate = platformFeeRateData.rate || 0;
                        let isCustomPlatformFeeRate = Boolean(platformFeeRateData.isCustom);
                        let platformFee = 0;
                        if (bonusBased) {
                            platformFee = math.chain(platformFeeRate).multiply(totalBonusAmount).divide(100).round(2).done();
                        }
                        totalPlatformFee += platformFee;

                        rawCommissions.push({
                            crewProfit: providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                            crewProfitDetail: providerGroupConsumptionData[groupRate.groupName].crewProfitDetail,
                            groupName: groupRate.groupName,
                            groupId: groupRate.groupId,
                            amount: rawDirectCommission, // direct amount
                            totalConsumption: totalConsumption,
                            commissionRate: directCommissionRate,
                            isCustomCommissionRate: commissionRates[groupRate.groupName].isCustom,
                            platformFee: platformFee,
                            platformFeeRate: platformFeeRate,
                            isCustomPlatformFeeRate: isCustomPlatformFeeRate,
                            siteBonusAmount: -providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                        });

                        grossCommission += rawDirectCommission;

                        // individual commission for each parent each provider
                        // sum it out for gross for each parent
                        let previousParentRate = 0;
                        if (commissionRates[groupRate.groupName].parentRatios && commissionRates[groupRate.groupName].parentRatios.length) {
                            for (let i = 0; i < parentChain.length; i++) {
                                let parent = parentChain[i];
                                let objId = String(parent._id);
                                let parentRatio = commissionRates[groupRate.groupName].parentRatios[i];
                                let parentRate = math.chain(commissionRates[groupRate.groupName].parentRate[i] || 0).subtract(previousParentRate).round(8).done(); //commissionRates[groupRate.groupName].parentRate[i] - previousParentRate;
                                previousParentRate = commissionRates[groupRate.groupName].parentRate[i];
                                parentCommissionDetail[objId].rawCommissions = parentCommissionDetail[objId].rawCommissions || [];
                                let detail = {
                                    groupName: groupRate.groupName,
                                    groupId: groupRate.groupId,
                                    parentRate: parentRate,
                                };
                                detail.amount = math.chain(rawCommission).multiply(parentRatio).round(2).done();
                                if (i === 0) {
                                    detail.amount = math.chain(detail.amount).add(detail.amount).round(2).done();
                                    // this is done to adjust that current level of multi level commission is also given to immediate parent
                                    // if still not understand, can directly ask Huat
                                }
                                parentCommissionDetail[objId].grossCommission = parentCommissionDetail[objId].grossCommission || 0;
                                parentCommissionDetail[objId].grossCommission += detail.amount;
                                parentCommissionDetail[objId].rawCommissions.push(detail);
                            }
                        }
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
                        nettCommission = grossCommission + grossDirectCommission - totalPlatformFee - totalTopUpFee - totalWithdrawalFee - totalRewardFee;
                    }

                    // if it is bonus based, calculate the nett parent commisssion as well
                    parentChain.map(parent => {
                        let parentComm = parentCommissionDetail[String(parent._id)];
                        parentComm.grossCommission = parentComm.grossCommission || 0;
                        parentComm.nettCommission = parentComm.grossCommission;
                        // if (bonusBased && grossCommission) {
                        //     parentComm.nettCommission = math.chain(parentComm.grossCommission).multiply(nettCommission).divide(grossCommission).round(2).done() || 0;
                        // }
                    });

                    let returnObj = {
                        partner: partner._id,
                        platform: platform._id,
                        commissionType: mainPartner.commissionType,
                        startTime: commissionPeriod.startTime,
                        endTime: commissionPeriod.endTime,
                        partnerId: partner.partnerId,
                        partnerName: partner.partnerName,
                        partnerRealName: partner.realName,
                        partnerCredit: partner.credits,
                        downLinesRawCommissionDetail: playerRawDetail,
                        activeDownLines: activeDownLines,
                        partnerCommissionRateConfig: commRate,
                        rawCommissions: rawCommissions,
                        totalReward: totalReward,
                        totalRewardFee: totalRewardFee,
                        rewardFeeRate: commRate.rateAfterRebatePromo / 100,
                        totalPlatformFee: totalPlatformFee,
                        totalTopUp: totalTopUp,
                        totalTopUpFee: totalTopUpFee,
                        topUpFeeRate: commRate.rateAfterRebateTotalDeposit / 100,
                        totalWithdrawal: totalWithdrawal,
                        totalWithdrawalFee: totalWithdrawalFee,
                        withdrawFeeRate: commRate.rateAfterRebateTotalWithdrawal / 100,
                        status: constPartnerCommissionLogStatus.PREVIEW,
                        grossCommission: grossCommission,
                        grossDirectCommission: grossDirectCommission,
                        nettCommission: nettCommission,
                        disableCommissionSettlement: Boolean(partner.permission && partner.permission.disableCommSettlement),
                        depositCrewDetail: depositCrewDetail,
                        withdrawCrewDetail: withdrawCrewDetail,
                        bonusCrewDetail: bonusCrewDetail,
                        parentPartnerCommissionDetail: parentCommissionDetail,
                        remarks: remarks,
                    };

                    return returnObj;

                }
            )

    },

    generateCurrentPartnersCommissionDetail: function (partnerObjIds, startTime, endTime, commissionType) {
        let proms = [];
        let parentPartnerCommissionDetail, downLinesRawCommissionDetail;

        if (!startTime) {
            commissionType = commissionType || constPartnerCommissionType.WEEKLY_CONSUMPTION;
            let defaultTime = getTargetCommissionPeriod(commissionType, new Date());
            startTime = defaultTime.startTime;
            endTime = defaultTime.endTime;
        }

        partnerObjIds.map(partnerObjId => {
            let commissionDetail = {};
            let prom = dbPartnerCommission.calculatePartnerCommission(partnerObjId, startTime, endTime).then(
                commissionData => {
                    commissionDetail = commissionData;
                    return getPreviousThreeDetailIfExist(partnerObjId, commissionData.commissionType, commissionData.startTime);
                }
            ).then(
                pastData => {
                    commissionDetail.pastActiveDownLines = pastData.pastThreeActiveDownLines;
                    commissionDetail.pastNettCommission = pastData.pastThreeNettCommission;

                    commissionDetail.calcTime = new Date();
                    parentPartnerCommissionDetail = commissionDetail.parentPartnerCommissionDetail;
                    delete commissionDetail.parentPartnerCommissionDetail;
                    downLinesRawCommissionDetail = commissionDetail.downLinesRawCommissionDetail;
                    delete commissionDetail.downLinesRawCommissionDetail;

                    return dbconfig.collection_commCalc.findOneAndUpdate({partner: partnerObjId, commissionType, startTime}, commissionDetail, {new: true, upsert: true}).lean();
                }
            ).then(
                commCalc => {
                    if (!commCalc || !commCalc._id) {
                        return false;
                    }

                    let parentCalcProms = [];

                    for (let parentObjId in parentPartnerCommissionDetail) {
                        if (parentPartnerCommissionDetail.hasOwnProperty(parentObjId)) {
                            let commCalcParentData = parentPartnerCommissionDetail[parentObjId];
                            commCalcParentData.commCalc = commCalc._id;

                            let prom = dbconfig.collection_commCalcParent.findOneAndUpdate({commCalc: commCalc._id, parentObjId}, commCalcParentData, {upsert: true, new: true}).lean().catch(err => {
                                console.log("commCalcParent save failed", commCalcParentData, err);
                                return errorUtils.reportError(err);
                            });
                            parentCalcProms.push(prom);
                        }
                    }

                    let playerCalcProms = downLinesRawCommissionDetail.map(playerCalc => {
                        playerCalc.commCalc = commCalc._id;
                        return dbconfig.collection_commCalcPlayer.findOneAndUpdate({commCalc: commCalc._id, name: playerCalc.name}, playerCalc, {upsert: true, new: true}).lean().catch(err => {
                            console.log("commCalcPlayer save failed", playerCalc, err);
                            return errorUtils.reportError(err);
                        });
                    });

                    return Promise.all([Promise.all(parentCalcProms), Promise.all(playerCalcProms)]);
                }
            ).then(
                () => {
                    commissionDetail.parentPartnerCommissionDetail = parentPartnerCommissionDetail;
                    commissionDetail.downLinesRawCommissionDetail = downLinesRawCommissionDetail;
                    return commissionDetail;
                }
            ).catch(err => {
                console.log('commCalc failure', err);
                return errorUtils.reportError(err);
            });
            proms.push(prom);
        });

        return Promise.all(proms);
    },

    getCurrentPartnerCommissionDetail: function (platformObjId, commissionType, partnerName, startTime, endTime) {
        let result = [];
        let query = {platform: platformObjId};
        commissionType = commissionType || constPartnerCommissionType.DAILY_CONSUMPTION;
        let stream = Promise.resolve([]);

        let findPartnerProm = Promise.resolve();
        if (partnerName) {
            query.partnerName = partnerName;
            findPartnerProm = dbconfig.collection_partner.findOne(query, {_id:1, commissionType: 1}).lean();
        }

        return findPartnerProm.then(
            partner => {
                if (partnerName) {
                    if (!partner) {
                        return;
                    }
                    commissionType = partner.commissionType;
                    stream = dbconfig.collection_partner.find({$or: [{_id: partner._id}, {parent: partner._id}]}, {_id:1}).cursor({batchSize: 100});
                }
                else {
                    query.commissionType = commissionType;
                    stream = dbconfig.collection_partner.find(query, {_id: 1}).cursor({batchSize: 100});
                }
                let balancer = new SettlementBalancer();
                return balancer.initConns().then(function () {
                    return balancer.processStream(
                        {
                            stream: stream,
                            batchSize: constSystemParam.BATCH_SIZE,
                            makeRequest: function (partners, request) {
                                request("player", "generateCurrentPartnersCommissionDetail", {
                                    startTime: startTime,
                                    endTime: endTime,
                                    commissionType: commissionType,
                                    partnerObjIdArr: partners.map(function (partner) {
                                        return partner._id;
                                    })
                                });
                            },
                            processResponse: function (record) {
                                result = result.concat(record.data);
                            }
                        }
                    );
                })
            }
        ).then(
            () => {
                // todo :: change it to get data from db
                return result;
            }
        )
    },

    findPartnerCommissionLog: (query, isOne) => {
        let request = dbconfig.collection_partnerCommissionLog.find(query);
        if (isOne) {
            request = request.limit(1);
        }
        request = request.lean().read("secondaryPreferred");

        return request.then(
            partnerCommissionLogs => {
                let proms = [];
                partnerCommissionLogs.map(partnerCommissionLog => {
                    let prom = Promise.resolve(partnerCommissionLog);
                    if (!partnerCommissionLog.downLinesRawCommissionDetail || partnerCommissionLog.downLinesRawCommissionDetail.length == 0) {
                        prom = dbconfig.collection_downLinesRawCommissionDetail.find({platform: partnerCommissionLog.platform, partnerCommissionLog: partnerCommissionLog._id}).lean().read("secondaryPreferred").then(
                            downLinesRawCommissionDetail => {
                                partnerCommissionLog.downLinesRawCommissionDetail = downLinesRawCommissionDetail;
                                return Promise.resolve(partnerCommissionLog)
                            }
                        );
                    }
                    proms.push(prom)
                });

                return Promise.all(proms);
            }
        ).then(
            partnerCommissionLogs => {
                if (isOne) {
                    return partnerCommissionLogs[0];
                }
                return partnerCommissionLogs;
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

    return dbconfig.collection_activeConfig.findOne({platform: platformObjId}).lean().then(
        partnerLevelConfig => {
            if (!partnerLevelConfig) {
                return Promise.reject({message: "incomplete active setting, please set partner active params"});
            }

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
                isDuplicate: {$ne: true},
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
    let details = [];

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

function getCommissionPeriod (commissionType) {
    switch (commissionType) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
        case constPartnerCommissionType.DAILY_CONSUMPTION:
            return dbutility.getYesterdaySGTime();
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            return dbutility.getLastWeekSGTime();
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            return dbutility.getLastBiWeekSGTime();
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            return dbutility.getLastMonthSGTime();
        default:
            return dbutility.getLastWeekSGTime();
    }
}

function getTargetCommissionPeriod (commissionType, date) {
    switch (Number(commissionType)) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
        case constPartnerCommissionType.DAILY_CONSUMPTION:
            return dbutility.getDayTime(date);
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            return dbutility.getWeekTime(date);
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            return dbutility.getBiWeekSGTIme(date);
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            return dbutility.getMonthSGTIme(date);
        default:
            return dbutility.getWeekTime(date);
    }
}

function getCommissionRate (commissionRateTable, consumptionAmount, activeCount) {
    let lastValidCommissionRate = 0;
    let lastValidParentRatios = [];
    let lastValidParentRate = [];
    let isCustom = false;

    if (consumptionAmount < 0) {
        consumptionAmount *= -1;
    }

    commissionRateTable = commissionRateTable.sort((requirementA, requirementB) => {
        return requirementA.commissionRate - requirementB.commissionRate;
    });

    for (let i = 0; i < commissionRateTable.length; i++) {
        let commissionRequirement = commissionRateTable[i];

        if (commissionRequirement.playerConsumptionAmountFrom && consumptionAmount < commissionRequirement.playerConsumptionAmountFrom
            || commissionRequirement.playerConsumptionAmountTo && consumptionAmount > commissionRequirement.playerConsumptionAmountTo
            || commissionRequirement.activePlayerValueFrom && activeCount < commissionRequirement.activePlayerValueFrom
            || commissionRequirement.activePlayerValueTo && activeCount > commissionRequirement.activePlayerValueTo
        ) {
            continue;
        }

        lastValidCommissionRate = commissionRequirement.commissionRate;
        lastValidParentRatios = commissionRequirement.parentRatios || [];
        lastValidParentRate = commissionRequirement.parentRate || [];
        isCustom = Boolean(commissionRequirement.isCustom);
    }

    return {
        commissionRate: lastValidCommissionRate,
        parentRatios: lastValidParentRatios,
        parentRate: lastValidParentRate,
        isCustom: isCustom
    };
}

function getCommissionTables (partnerObjId, parentChain, commissionType, providerGroups) {
    providerGroups = providerGroups || [];
    let partnerConfigProm = dbPartnerCommissionConfig.getPartnerCommConfig(partnerObjId, commissionType);
    let parentConfigsProm = parentChain.map(parent => {
        return dbPartnerCommissionConfig.getPartnerCommConfig(parent._id, commissionType);
    });
    let partnerConfig, parentConfigs;

    return Promise.all([partnerConfigProm, Promise.all(parentConfigsProm)]).then(
        ([partnerConfigData, parentConfigsData]) => {
            partnerConfig = partnerConfigData || [];
            parentConfigs = parentConfigsData || [];

            return providerGroups.map(group => {
                return getCommissionTable(partnerConfig, parentConfigs, group);
            });
        }
    );
}

function getCommissionTable (partnerConfig, parentConfigs, group) {
    // this function will assume the setting is done right and directly compare the number of index from parent to child
    let targetConfig = partnerConfig.find(config => {
        return String(config.provider) === String(group._id);
    });
    if (!targetConfig) {
        return {
            groupId: group.providerGroupId,
            groupName: group.name,
            rateTable: []
        };
    }
    let rateTable = targetConfig.commissionSetting;

    let parentsRateTables = parentConfigs.map(parentConfig => {
        let parentTargetConfig = parentConfig.find(config => {
            return String(config.provider) === String(group._id);
        });
        return parentTargetConfig || [];
    });

    let incompleteSetting = false;
    for (let i = 0; i < rateTable.length; i++) {
        let currentRequirement = rateTable[i];
        let previousPartnerRate = currentRequirement.commissionRate;
        currentRequirement.parentRate = [];

        currentRequirement.parentRatios = parentsRateTables.map(parentRateTable => {
            if (!parentRateTable || !parentRateTable.commissionSetting || !parentRateTable.commissionSetting[i] || incompleteSetting) {
                incompleteSetting = true;
                return;
            }

            let commSetting = parentRateTable.commissionSetting[i];
            currentRequirement.parentRate.push(commSetting.commissionRate);

            if (!commSetting.commissionRate || previousPartnerRate >= commSetting.commissionRate) {
                return 0;
            }

            
            let currentRate = math.chain(Number(commSetting.commissionRate) - Number(previousPartnerRate)).divide(currentRequirement.commissionRate).round(8).done();
            previousPartnerRate = commSetting.commissionRate;
            return currentRate;
        });
    }

    if (incompleteSetting) {
        rateTable = false;
    }

    return {
        groupId: group.providerGroupId,
        groupName: group.name,
        rateTable: rateTable || []
    };
}

function getPreviousThreeDetailIfExist (partnerObjId, commissionType, startTime) {
    let pastThreeActiveDownLines = [];
    let pastThreeNettCommission = [];
    startTime = new Date(startTime);
    let firstLastPeriod = getTargetCommissionPeriod(commissionType, new Date(new Date(startTime).setMinutes(startTime.getMinutes()-5)));
    let secondLastPeriod = getTargetCommissionPeriod(commissionType, new Date(new Date(firstLastPeriod.startTime).setMinutes(firstLastPeriod.startTime.getMinutes()-5)));
    let thirdLastPeriod = getTargetCommissionPeriod(commissionType, new Date(new Date(secondLastPeriod.startTime).setMinutes(secondLastPeriod.startTime.getMinutes()-5)));

    let firstLastRecordProm = dbPartnerCommission.findPartnerCommissionLog({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(firstLastPeriod.startTime),
        endTime: new Date(firstLastPeriod.endTime)
    }, true);
    let secondLastRecordProm = dbPartnerCommission.findPartnerCommissionLog({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(secondLastPeriod.startTime),
        endTime: new Date(secondLastPeriod.endTime)
    }, true);
    let thirdLastRecordProm = dbPartnerCommission.findPartnerCommissionLog({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(thirdLastPeriod.startTime),
        endTime: new Date(thirdLastPeriod.endTime)
    }, true);

    return Promise.all([firstLastRecordProm, secondLastRecordProm, thirdLastRecordProm]).then(
        records => {
            records.map(record => {
                if  (!record) {
                    pastThreeActiveDownLines.push("-");
                    pastThreeNettCommission.push("-");
                }
                else if (record.status === constPartnerCommissionLogStatus.SKIPPED) {
                    pastThreeActiveDownLines.push("SKIP");
                    pastThreeNettCommission.push("SKIP");
                }
                else {
                    pastThreeActiveDownLines.push(record.activeDownLines);
                    pastThreeNettCommission.push(dbutility.twoDecimalPlacesToFixed(record.nettCommission));
                }
            });

            return {
                pastThreeActiveDownLines,
                pastThreeNettCommission
            }
        }
    );
}

function getDirectCommissionRateTables (platformObjId, commissionType, partnerObjId, providerGroups) {
    let proms = [];

    if (providerGroups && providerGroups.length > 0) {
        providerGroups.map(group => {
            let prom = getDirectCommissionRateTable(platformObjId, commissionType, partnerObjId, group._id).then(
                rateTable => {
                    return {
                        groupId: group.providerGroupId,
                        groupName: group.name,
                        rateTable: rateTable
                    }
                }
            );
            proms.push(prom);
        });
    }

    return Promise.all(proms);
}

function getDirectCommissionRateTable (platformObjId, commissionType, partnerObjId, providerGroupObjId) {
    providerGroupObjId = providerGroupObjId || {$exists: false};

    let platformConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
        platform: platformObjId,
        commissionType: commissionType,
        provider: providerGroupObjId,
        partner: {$exists: false}
    }).lean();

    let customConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
        platform: platformObjId,
        commissionType: commissionType,
        provider: providerGroupObjId,
        partner: partnerObjId
    }).lean();

    return Promise.all([platformConfigProm, customConfigProm]).then(
        data => {
            let platformConfig = {};

            if (!data[0]) {
                platformConfig.commissionSetting = [];
            } else {
                platformConfig = data[0];
            }

            if (data[1]) {
                let customConfig = data[1];
                platformConfig.commissionSetting.map(platformRate => {
                    customConfig.commissionSetting.map(customRate => {
                        if (platformRate.playerConsumptionAmountFrom === customRate.playerConsumptionAmountFrom
                            && platformRate.playerConsumptionAmountTo === customRate.playerConsumptionAmountTo
                            && platformRate.activePlayerValueFrom === customRate.activePlayerValueFrom
                            && platformRate.activePlayerValueTo === customRate.activePlayerValueTo
                            && platformRate.commissionRate !== customRate.commissionRate) {
                            platformRate.isCustom = true;
                            platformRate.commissionRate = customRate.commissionRate;
                        }
                    });
                });
            }

            return platformConfig.commissionSetting;
        }
    );
}

function getDirectCommissionRate (commissionRateTable, consumptionAmount, activeCount) {
    let lastValidCommissionRate = 0;
    let isCustom = false;

    if (consumptionAmount < 0) {
        consumptionAmount *= -1;
    }

    commissionRateTable = commissionRateTable || [];

    commissionRateTable = commissionRateTable.sort((requirementA, requirementB) => {
        return requirementA.commissionRate - requirementB.commissionRate;
    });

    for (let i = 0; i < commissionRateTable.length; i++) {
        let commissionRequirement = commissionRateTable[i];

        if (commissionRequirement.playerConsumptionAmountFrom && consumptionAmount < commissionRequirement.playerConsumptionAmountFrom
            || commissionRequirement.playerConsumptionAmountTo && consumptionAmount > commissionRequirement.playerConsumptionAmountTo
            || commissionRequirement.activePlayerValueFrom && activeCount < commissionRequirement.activePlayerValueFrom
            || commissionRequirement.activePlayerValueTo && activeCount > commissionRequirement.activePlayerValueTo
        ) {
            continue;
        }

        lastValidCommissionRate = commissionRequirement.commissionRate;
        isCustom = Boolean(commissionRequirement.isCustom);
    }

    return {
        commissionRate: lastValidCommissionRate,
        isCustom: isCustom
    };
}