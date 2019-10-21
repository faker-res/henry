"use strict";

let dbPartnerCommissionFunc = function () {
};
module.exports = new dbPartnerCommissionFunc();

const dbconfig = require('./../modules/dbproperties');
const dbPartnerCommissionConfig = require('../db_modules/dbPartnerCommissionConfig');
const dbProposal = require('../db_modules/dbProposal');
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
const constProposalEntryType = require('./../const/constProposalEntryType');
const constProposalUserType = require('./../const/constProposalUserType');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const dbPartnerCommission = {
    calculatePartnerCommission: async (partnerObjId, startTime, endTime, commissionType) => {
        let partner = await dbconfig.collection_partner.findOne({_id: partnerObjId})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean();

        if (!partner) {
            return Promise.reject({
                name: "DataError",
                message: "Error in getting partner data",
            });
        }

        let platform = partner.platform;

        let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platform._id}).lean();
        let partnerChainProm = Promise.resolve([partner._id]);
        if (partner.parent) {
            partnerChainProm = dbPartnerCommissionConfig.getPartnerParentChain(partner._id);
        }

        let [providerGroups, partnerChain] = await Promise.all([providerGroupProm, partnerChainProm]);
        providerGroups = providerGroups || [];
        partnerChain = partnerChain || [];
        let parentChain = [];

        let mainPartnerObjId = partnerChain[partnerChain.length - 1] && partnerChain[partnerChain.length - 1]._id;
        let isMainPartner = Boolean(!mainPartnerObjId || String(mainPartnerObjId) === String(partnerObjId));

        let mainPartner = isMainPartner ? partner : partnerChain[partnerChain.length - 1];
        for (let i = 1; i < partnerChain.length; i++) {
            parentChain.push(partnerChain[i]);
        }
        mainPartner.commissionType = commissionType || partner.commissionType || mainPartner.commissionType; // maybe remove partner.commissionType in future so that it always follow parent commission
        if (mainPartner.commissionType != constPartnerCommissionType.WEEKLY_BONUS_AMOUNT
            && mainPartner.commissionType != constPartnerCommissionType.DAILY_CONSUMPTION
            && mainPartner.commissionType != constPartnerCommissionType.MONTHLY_BONUS_AMOUNT
        ) {
            console.error("Please select a commission type -", partner.partnerName)
            return Promise.reject({message: "Please select a commission type"});
        }

        let commissionPeriod = getCommissionPeriod(mainPartner.commissionType);
        if (startTime && endTime) {
            commissionPeriod = {
                startTime: startTime,
                endTime: endTime
            };
        }


        let bonusBased = Boolean(mainPartner.commissionType != constPartnerCommissionType.DAILY_CONSUMPTION);

        let commConfigProm = getCommissionTables(partner._id, parentChain, mainPartner.commissionType, providerGroups);
        // let commRateProm = dbPartnerCommissionConfig.getPartnerCommRate(mainPartner._id, platform._id);
        let commRateMultiProm = dbPartnerCommissionConfig.getPartnerCommRate(mainPartner._id, platform._id, providerGroups);
        let activePlayerRequirementProm = getRelevantActivePlayerRequirement(platform._id, mainPartner.commissionType);
        let paymentProposalTypesProm = getPaymentProposalTypes(platform._id);
        let rewardProposalTypesProm = getRewardProposalTypes(platform._id);
        // let directCommConfigProm = getDirectCommissionRateTables(platform._id, mainPartner.commissionType, partner._id, providerGroups);

        let [commConfig, commRateMulti, activePlayerRequirement, topUpProposalTypes, rewardProposalTypes] = await Promise.all([commConfigProm, commRateMultiProm, activePlayerRequirementProm, paymentProposalTypesProm, rewardProposalTypesProm]);

        let playerRawDetail = await getAllPlayerCommissionRawDetailsWithSettlement(partner._id, platform._id, mainPartner.commissionType, commissionPeriod.startTime, commissionPeriod.endTime, providerGroups, topUpProposalTypes, rewardProposalTypes, activePlayerRequirement).catch(
            err => {
                console.log('getAllPlayerCommissionRawDetailsWithSettlement died with params', partner._id, err);
                return Promise.reject(err);
            }
        );

        let activeDownLines = getActiveDownLineCount(playerRawDetail);

        let providerGroupConsumptionData = getTotalPlayerConsumptionByProviderGroupName(playerRawDetail, providerGroups);

        commRateMulti = commRateMulti || {};

        // commRate and directCommConfig are obsolete

        let totalTopUp = 0;
        let totalReward = 0;
        let totalWithdrawal = 0;
        let totalWinLose = 0;
        let depositCrewDetail = [];
        let withdrawCrewDetail = [];
        let bonusCrewDetail = [];
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

        let totalPlatformFee = 0;
        let totalRewardFee = 0;
        let totalTopUpFee = 0;
        let totalWithdrawalFee = 0;
        let totalMRewardFee = 0;
        let totalMTopUpFee = 0;
        let totalMWithdrawalFee = 0;
        if (bonusBased) {
            totalRewardFee = totalMRewardFee = math.chain(totalReward).multiply(commRateMulti.rateAfterRebatePromo || 0).divide(100).round(2).done();
            totalTopUpFee = totalMTopUpFee = math.chain(totalTopUp).multiply(commRateMulti.rateAfterRebateTotalDeposit || 0).divide(100).round(2).done();
            totalWithdrawalFee = totalMWithdrawalFee = math.chain(totalWithdrawal).multiply(commRateMulti.rateAfterRebateTotalWithdrawal || 0).divide(100).round(2).done();
        }


        commConfig = commConfig || [];

        let parentCommissionDetail = {};
        for (let i = 0; i < parentChain.length; i++) {
            let parent = parentChain[i];
            let objId = String(parent._id);
            parentCommissionDetail[objId] = parentCommissionDetail[objId] || {
                parentObjId: objId,
                parentName: parent.partnerName,
                parentRealName: parent.realName,
                startTime: startTime,
                partnerObjId: partner._id,
                partnerName: partner.partnerName,
                partnerRealName: partner.realName,
                rawCommissions: [],
                activeCount: activeDownLines,
                grossCommission: 0,
                platformFee: 0,
                totalParentRate: 0,
                totalTopUpFee: totalTopUpFee,
                totalWithdrawalFee: totalWithdrawalFee,
                totalRewardFee: totalRewardFee,
                totalPlatformFee: 0,
                totalReward: totalReward,
                totalTopUp: totalTopUp,
                totalWithdrawal: totalWithdrawal,
                rewardFeeRate: bonusBased ? commRateMulti.rateAfterRebatePromo : 0,
                topUpFeeRate: bonusBased ? commRateMulti.rateAfterRebateTotalDeposit : 0,
                withdrawalFeeRate: bonusBased ? commRateMulti.rateAfterRebateTotalWithdrawal : 0,
            };
        }

        let allConsumption = 0; // use to divide fee

        if (bonusBased) {
            for (let i = 0; i < commConfig.length; i++) {
                let groupName = commConfig[i].groupName;
                let groupConsumption = providerGroupConsumptionData[groupName];
                if (!groupConsumption) continue;

                if (-groupConsumption.bonusAmount > 0) {
                    // sum all negative bonus amount
                    allConsumption += -groupConsumption.bonusAmount || 0;
                }
            }

            if (allConsumption === 0) {
                for (let i = 0; i < commConfig.length; i++) {
                    let groupName = commConfig[i].groupName;
                    let groupConsumption = providerGroupConsumptionData[groupName];
                    if (!groupConsumption) continue;

                    // sum all negative bonus amount
                    allConsumption += -groupConsumption.bonusAmount || 0;
                }
            }
        }

        let rawCommissions = [];
        let nettCommission = 0;
        let totalParentGrossCommission = 0;
        let absoluteFeeMultiplierUsed = false;
        for (let i = 0; i < commConfig.length; i++) {
            let groupRate = commConfig[i];
            let totalConsumption = bonusBased ? -providerGroupConsumptionData[groupRate.groupName].bonusAmount : providerGroupConsumptionData[groupRate.groupName].validAmount;
            // let directCommissionGroupRate = directCommConfig.find(group => {
            //     return groupRate.groupId == group.groupId;
            // });
            let multiLevelCommissionRate = getCommissionRate(groupRate.rateTable, totalConsumption, activeDownLines);
            // let directCommissionRate = getDirectCommissionRate(directCommissionGroupRate.rateTable, totalConsumption, activeDownLines);

            // platform fee rate (that needed to separate multilevel with direct)
            // let platformFeeRateData = {
            //     rate : 0,
            //     isCustom: false
            // };

            // if (bonusBased && commRate && commRate.rateAfterRebateGameProviderGroup
            //     && commRate.rateAfterRebateGameProviderGroup.length > 0) {
            //     commRate.rateAfterRebateGameProviderGroup.map(group => {
            //         if (group.name === groupRate.groupName) {
            //             platformFeeRateData.rate = group.rate || commRate.rateAfterRebatePlatform || 0;
            //         }
            //     });
            // }
            let platformFeeRateMultiData = {
                rate : 0,
                isCustom: false
            };

            if (bonusBased && commRateMulti && commRateMulti.rateAfterRebateGameProviderGroup
                && commRateMulti.rateAfterRebateGameProviderGroup.length > 0) {
                commRateMulti.rateAfterRebateGameProviderGroup.map(group => {
                    if (group.name === groupRate.groupName) {
                        platformFeeRateMultiData.rate = group.rate || commRateMulti.rateAfterRebatePlatform || 0;
                        group.rate = platformFeeRateMultiData.rate;
                    }
                });
            }
            // ====================================================================

            // let platformFeeRateDirect = bonusBased && !directCommissionRate.zeroRate ? math.chain(platformFeeRateData.rate || 0).divide(100).round(8).done() || 0 : 0;
            let platformFeeRateMulti = bonusBased && !multiLevelCommissionRate.zeroRate ? math.chain(platformFeeRateMultiData.rate || 0).divide(100).round(8).done() || 0 : 0;

            // let consumptionAfterFeeDirect = totalConsumption;
            let consumptionAfterFeeMulti = totalConsumption;

            let platformFeeDirect = 0;
            let platformFeeMulti = 0;
            let rewardFeeMulti = 0;
            let topUpFeeMulti = 0;
            let withdrawalFeeMulti = 0;
            if (bonusBased && !multiLevelCommissionRate.zeroRate) {
                let feeMultiplier = 0;
                if (allConsumption === 0) { // This if else statement is base on what Ken said
                    // if all is zero, just cost parent everything
                    if (!absoluteFeeMultiplierUsed) {
                        feeMultiplier = 1;
                        absoluteFeeMultiplierUsed = true;
                    }
                } else if (allConsumption > 0) {
                    // if there are any positive, only distribute against those that are positive (refer to above allConsumption calculation)
                    feeMultiplier = totalConsumption > 0 ? math.chain(totalConsumption).divide(allConsumption).round(12).done() : 0;
                } else {
                    // if there are no positive but there are negatives, then only distribute with negatives
                    feeMultiplier = math.chain(totalConsumption).divide(allConsumption).round(12).done() || 0;
                }
                // platformFeeDirect = math.chain(totalConsumption).multiply(platformFeeRateDirect).abs().round(2).done();
                // let rewardFee = math.chain(totalRewardFee).multiply(feeMultiplier).round(2).done();
                // let topUpFee = math.chain(totalTopUpFee).multiply(feeMultiplier).round(2).done();
                // let withdrawalFee = math.chain(totalWithdrawalFee).multiply(feeMultiplier).round(2).done();
                platformFeeMulti = math.chain(totalConsumption).multiply(platformFeeRateMulti).round(2).done();
                rewardFeeMulti = math.chain(totalMRewardFee).multiply(feeMultiplier).round(2).done();
                topUpFeeMulti = math.chain(totalMTopUpFee).multiply(feeMultiplier).round(2).done();
                withdrawalFeeMulti = math.chain(totalMWithdrawalFee).multiply(feeMultiplier).round(2).done();

                // platformFeeDirect = platformFeeDirect < 0 ? platformFeeDirect * -1 : platformFeeDirect;
                // withdrawalFeeMulti = withdrawalFeeMulti < 0 ? withdrawalFeeMulti * -1 : withdrawalFeeMulti;


                totalPlatformFee += platformFeeMulti;

                // consumptionAfterFeeDirect = math.chain(totalConsumption)
                //     .subtract(platformFeeDirect)
                //     .subtract(rewardFee)
                //     .subtract(topUpFee)
                //     .subtract(withdrawalFee)
                //     .round(2)
                //     .done();

                consumptionAfterFeeMulti = math.chain(totalConsumption)
                    .subtract(platformFeeMulti)
                    .subtract(rewardFeeMulti)
                    .subtract(topUpFeeMulti)
                    .subtract(withdrawalFeeMulti)
                    .round(2)
                    .done();

            }

            let mainParentCommissionRate = multiLevelCommissionRate.parentRate[multiLevelCommissionRate.parentRate.length - 1] || multiLevelCommissionRate.commissionRate;

            let rawCommission = math.chain(consumptionAfterFeeMulti).multiply(multiLevelCommissionRate.commissionRate).round(8).done();
            // let rawDirectCommission = math.chain(consumptionAfterFeeDirect).multiply(directCommissionRate.commissionRate).round(8).done();

            rawCommissions.push({
                crewProfit: providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                crewProfitDetail: providerGroupConsumptionData[groupRate.groupName].crewProfitDetail,
                groupName: groupRate.groupName,
                groupId: groupRate.groupId,
                amount: rawCommission, // direct amount, nett commission
                totalConsumption: totalConsumption,
                totalValidBet: providerGroupConsumptionData[groupRate.groupName].validAmount,
                commissionRate: multiLevelCommissionRate.commissionRate,
                platformFee: platformFeeMulti,
                platformFeeRate: platformFeeRateMulti,
                siteBonusAmount: -providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                noRate: Boolean(multiLevelCommissionRate.noRate),
            });

            nettCommission += rawCommission;

            // individual commission for each parent each provider
            let previousParentRate = multiLevelCommissionRate.commissionRate;
            multiLevelCommissionRate.parentRatios = multiLevelCommissionRate.parentRatios || [];
            let ratioSum = 0;
            if (multiLevelCommissionRate.parentRatios.length) {
                ratioSum = multiLevelCommissionRate.parentRatios.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0));
            }

            let totalAllParentRate = 0;
            for (let j = 0; j < parentChain.length; j++) {
                let parent = parentChain[j];
                let objId = String(parent._id);
                let parentRatio = multiLevelCommissionRate.parentRatios[j] || 0;
                let parentRate = math.chain(multiLevelCommissionRate.parentRate[j] || 0).subtract(previousParentRate).round(8).done(); //multiLevelCommissionRate.parentRate[j] - previousParentRate;
                previousParentRate = multiLevelCommissionRate.parentRate[j] || 0;
                parentCommissionDetail[objId].rawCommissions = parentCommissionDetail[objId].rawCommissions || [];

                let detail = {
                    groupName: groupRate.groupName,
                    groupId: groupRate.groupId,
                    parentRate: parentRate,
                    noRate: Boolean(multiLevelCommissionRate.noRate),
                    totalValidConsumption: providerGroupConsumptionData[groupRate.groupName].validAmount,
                    crewProfit: providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                    platformFee: math.chain(platformFeeMulti).round(2).done(),
                    platformFeeRate: math.chain(platformFeeRateMulti).round(4).done(),
                };

                detail.amount = math.chain(rawCommission).multiply(parentRatio).round(2).done();

                parentCommissionDetail[objId].grossCommission += detail.amount || 0;
                parentCommissionDetail[objId].totalPlatformFee += detail.platformFee || 0;
                parentCommissionDetail[objId].platformFee += detail.platformFee || 0;
                parentCommissionDetail[objId].totalParentRate += Number(detail.parentRate) || 0;
                totalAllParentRate += Number(detail.parentRate) || 0;
                totalParentGrossCommission += detail.amount || 0;
                parentCommissionDetail[objId].rawCommissions.push(detail);
            }
        }

        let feeMultiplier = 0;
        if (totalParentGrossCommission + nettCommission > 0) {
            feeMultiplier = math.chain(nettCommission).divide(totalParentGrossCommission + nettCommission).round(8).done();
        }
        // let rewardFee = math.chain(totalRewardFee).multiply(feeMultiplier).round(8).done();
        // let topUpFee = math.chain(totalTopUpFee).multiply(feeMultiplier).round(8).done();
        // let withdrawalFee = math.chain(totalWithdrawalFee).multiply(feeMultiplier).round(8).done();
        //
        // for (let j = 0; j < parentChain.length; j++) {
        //     let parent = parentChain[j];
        //     let objId = String(parent._id);
        //
        //     let parentFeeMultiplier = 0;
        //     if (totalParentGrossCommission + nettCommission > 0) {
        //         parentFeeMultiplier = math.chain(parentCommissionDetail[objId].grossCommission).divide(totalParentGrossCommission + nettCommission).round(8).done();
        //     }
        //     parentCommissionDetail[objId].totalRewardFee = math.chain(totalRewardFee).multiply(parentFeeMultiplier).round(2).done();
        //     parentCommissionDetail[objId].totalTopUpFee = math.chain(totalTopUpFee).multiply(parentFeeMultiplier).round(2).done();
        //     parentCommissionDetail[objId].totalWithdrawalFee = math.chain(totalWithdrawalFee).multiply(parentFeeMultiplier).round(2).done();
        // }

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
            partnerCommissionRateConfig: bonusBased ? commRateMulti : {},
            rawCommissions: rawCommissions,
            totalReward: totalReward,
            totalRewardFee: totalRewardFee,
            rewardFeeRate: bonusBased ? commRateMulti.rateAfterRebatePromo / 100 : 0,
            totalPlatformFee: totalPlatformFee,
            totalTopUp: totalTopUp,
            totalTopUpFee: totalTopUpFee,
            topUpFeeRate: bonusBased ? commRateMulti.rateAfterRebateTotalDeposit / 100 : 0,
            totalWithdrawal: totalWithdrawal,
            totalWithdrawalFee: totalWithdrawalFee,
            withdrawFeeRate: bonusBased ? commRateMulti.rateAfterRebateTotalWithdrawal / 100 : 0,
            status: constPartnerCommissionLogStatus.PREVIEW,
            grossCommission: nettCommission,
            nettCommission: nettCommission,
            disableCommissionSettlement: Boolean(partner.permission && partner.permission.disableCommSettlement),
            depositCrewDetail: depositCrewDetail,
            withdrawCrewDetail: withdrawCrewDetail,
            bonusCrewDetail: bonusCrewDetail,
            parentPartnerCommissionDetail: parentCommissionDetail,
            calcTime: new Date(),
            remarks: "",
            isNewComm: true,
        };

        return returnObj;
    },

    generateCurrentPartnersCommissionDetail: async function (partnerObjIds, startTime, endTime, commissionType) {
        let proms = [];
        // let parentPartnerCommissionDetail, downLinesRawCommissionDetail;

        if (!startTime) {
            commissionType = commissionType || constPartnerCommissionType.WEEKLY_CONSUMPTION;
            let defaultTime = getTargetCommissionPeriod(commissionType, new Date());
            startTime = defaultTime.startTime;
            endTime = defaultTime.endTime;
        }

        for (let i = 0; i < partnerObjIds.length; i++) {
            let partnerObjId = partnerObjIds[i];
            let commissionDetail = await dbPartnerCommission.calculatePartnerCommission(partnerObjId, startTime, endTime, commissionType).catch(err => {
                console.log('dbPartnerCommission.calculatePartnerCommission ERROR', err)
                return Promise.reject(err);
            });

            let pastData = await getPreviousThreeDetailIfExist(partnerObjId, commissionDetail.commissionType, commissionDetail.startTime);

            commissionDetail.pastActiveDownLines = pastData.pastThreeActiveDownLines;
            commissionDetail.pastNettCommission = pastData.pastThreeNettCommission;

            commissionDetail.calcTime = new Date();
            let parentPartnerCommissionDetail = commissionDetail.parentPartnerCommissionDetail;
            delete commissionDetail.parentPartnerCommissionDetail;
            let downLinesRawCommissionDetail = commissionDetail.downLinesRawCommissionDetail;
            delete commissionDetail.downLinesRawCommissionDetail;

            let commCalc = await dbconfig.collection_commCalc.findOneAndUpdate({partner: ObjectId(partnerObjId), commissionType: Number(commissionType), startTime: new Date(startTime)}, commissionDetail, {new: true, upsert: true}).lean();

            if (!commCalc || !commCalc._id) {
                return false;
            }

            await dbconfig.collection_commCalcParent.remove({commCalc: ObjectId(commCalc._id)}).catch(errorUtils.reportError);
            for (let parentObjId in parentPartnerCommissionDetail) {
                if (parentPartnerCommissionDetail.hasOwnProperty(parentObjId)) {
                    let commCalcParentData = parentPartnerCommissionDetail[parentObjId];
                    commCalcParentData.commCalc = commCalc._id;

                    await dbconfig.collection_commCalcParent.findOneAndUpdate({parentObjId: ObjectId(parentObjId), partnerObjId: ObjectId(commCalc.partner), startTime: new Date(commCalc.startTime)}, commCalcParentData, {upsert: true, new: true}).lean().catch(err => {
                        console.log("commCalcParent save failed", commCalcParentData, err);
                        return errorUtils.reportError(err);
                    });
                }
            }

            await dbconfig.collection_commCalcPlayer.remove({commCalc: ObjectId(commCalc._id)}).catch(errorUtils.reportError);
            for (let j = 0; j < downLinesRawCommissionDetail.length; j++) {
                let playerCalc = downLinesRawCommissionDetail[j];
                playerCalc.commCalc = commCalc._id;
                await dbconfig.collection_commCalcPlayer.findOneAndUpdate({commCalc: ObjectId(commCalc._id), name: String(playerCalc.name)}, playerCalc, {upsert: true, new: true}).lean().catch(err => {
                    console.log("commCalcPlayer save failed", playerCalc, err);
                    return errorUtils.reportError(err);
                });
            }

            commissionDetail.parentPartnerCommissionDetail = parentPartnerCommissionDetail;
            commissionDetail.downLinesRawCommissionDetail = downLinesRawCommissionDetail;

            proms.push(Promise.resolve(commissionDetail));
        }

        return Promise.all(proms);
    },

    getCurrentPartnerCommissionDetail: function (platformObjId, commissionType, partnerName, startTime, endTime) {
        let result = [];
        let query = {platform: platformObjId};
        commissionType = commissionType || constPartnerCommissionType.DAILY_CONSUMPTION;
        let stream;
        let partnerObjId, partnersLeftToCalc = [];

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
                    partnerObjId = partner._id;

                    commissionType = partner.commissionType;

                    return getAllChildrenPartners(partnerObjId).then( // including partner himself
                        allPartners => {
                            let query = {_id: {$in: allPartners}};
                            stream = dbconfig.collection_partner.find(query, {_id: 1}).cursor({batchSize: 100});
                            return dbconfig.collection_partner.find(query, {_id: 1}).lean();
                        }
                    );
                }
                else {
                    query.commissionType = commissionType;
                    stream = dbconfig.collection_partner.find(query, {_id: 1}).cursor({batchSize: 100});
                    return dbconfig.collection_partner.find(query, {_id: 1}).lean();
                }
            }
        ).then(
            partnersToCalc => {
                if (!partnersToCalc || !partnersToCalc.length) {
                    return [];
                }

                if (!startTime) {
                    commissionType = commissionType || constPartnerCommissionType.WEEKLY_CONSUMPTION;
                    let defaultTime = getTargetCommissionPeriod(commissionType, new Date());
                    startTime = defaultTime.startTime;
                    endTime = defaultTime.endTime;
                }

                let halfHourAgo = new Date(new Date().setMinutes(new Date().getMinutes() - 30));
                let proms = partnersToCalc.map(partner => {
                    return dbconfig.collection_commCalc.findOne({
                        partner: partner._id,
                        commissionType,
                        startTime,
                        calcTime: {$gte: new Date(halfHourAgo)}
                    }, {_id: 1}).lean().then(
                        found => {
                            if (!found) {
                                partnersLeftToCalc.push(partner._id);
                            }
                        }
                    )
                });

                return Promise.all(proms);
            }
        ).then(
            (promsResult) => {
                // todo :: temporally comment this for debug, reopen this back later
                // if (!partnersLeftToCalc || !partnersLeftToCalc.length) {
                //     return;
                // }
                //
                // if (promsResult.length !== partnersLeftToCalc.length && partnersLeftToCalc.length <= 10) {
                //     stream = dbconfig.collection_partner.find({_id: {$in: partnersLeftToCalc}}, {_id:1}).cursor({batchSize: 100});
                // }
                if (!stream) {
                    return;
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
                if (partnerName) {
                    if (!partnerObjId) {
                        return result;
                    }
                    return getCalcPartnerByObjId(partnerObjId, commissionType, startTime);
                }

                return getCalcPartnerByType(platformObjId, commissionType, startTime);
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
                                return Promise.resolve(partnerCommissionLog);
                            }
                        );
                    }
                    proms.push(prom);
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

    settlePartnersCommission: async function (partnerObjIdArr, commissionType, startTime, endTime, isSkip) {
        let proms = [];
        partnerObjIdArr = partnerObjIdArr || [];
        if (!partnerObjIdArr.length) {
            return;
        }

        for (let i = 0; i < partnerObjIdArr.length; i++) {
            let partnerObjId = partnerObjIdArr[i];
            let prom;
            if (isSkip) {
                prom = generateSkipCommissionLog(partnerObjId, commissionType, startTime, endTime).catch(errorUtils.reportError);
            }
            else {
                prom = await dbPartnerCommission.generatePartnerCommissionLog(partnerObjId, commissionType, startTime, endTime).catch(err => {
                    console.error('dbPartnerCommission.generatePartnerCommissionLog error', partnerObjId, err)
                    return errorUtils.reportError(err)
                });
            }
            proms.push(prom);
        }

        // partnerObjIdArr.map(partnerObjId => {
        //     let prom;
        //     if (isSkip) {
        //         prom = generateSkipCommissionLog(partnerObjId, commissionType, startTime, endTime).catch(errorUtils.reportError);
        //     }
        //     else {
        //         prom = dbPartnerCommission.generatePartnerCommissionLog(partnerObjId, commissionType, startTime, endTime).catch(err => {
        //             console.error('dbPartnerCommission.generatePartnerCommissionLog error', partnerObjId, err)
        //             return errorUtils.reportError(err)
        //         });
        //     }
        //     proms.push(prom);
        // });

        return Promise.all(proms);
    },

    generatePartnerCommissionLog: async function (partnerObjId, commissionType, startTime, endTime) {
        let downLinesRawCommissionDetails, partnerCommissionLog, parentPartnerCommissionDetail;
        let commissionDetail = await dbPartnerCommission.calculatePartnerCommission(partnerObjId, startTime, endTime).catch(err => {
            console.error('calculatePartnerCommission died with param:', partnerObjId, err);
            errorUtils.reportError(err);
            return Promise.reject(err);
        });
        if (commissionDetail.disableCommissionSettlement) {
            return undefined;
        }

        downLinesRawCommissionDetails = commissionDetail.downLinesRawCommissionDetail || [];
        parentPartnerCommissionDetail = commissionDetail.parentPartnerCommissionDetail || {};

        delete commissionDetail.downLinesRawCommissionDetail;
        delete commissionDetail.parentPartnerCommissionDetail;
        if (commissionDetail.rawCommissions && commissionDetail.rawCommissions.length) {
            commissionDetail.rawCommissions.map(rawCommission => {
                if (rawCommission && rawCommission.crewProfitDetail) {
                    delete rawCommission.crewProfitDetail;
                }
            });
        }

        let partnerCommissionLogData = await dbconfig.collection_partnerCommissionLog.findOneAndUpdate({
            partner: ObjectId(commissionDetail.partner),
            platform: ObjectId(commissionDetail.platform),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            commissionType: Number(commissionType),
        }, commissionDetail, {upsert: true, new: true}).lean().catch(err => {
            return Promise.reject(err);
        });

        if (!partnerCommissionLogData) {
            return undefined;
        }
        updatePastThreeRecord(partnerCommissionLogData).catch(errorUtils.reportError);
        partnerCommissionLog = partnerCommissionLogData;

        let proms = [];

        await dbconfig.collection_downLinesRawCommissionDetail.remove({partnerCommissionLog: ObjectId(partnerCommissionLog._id)}).catch(errorUtils.reportError);
        downLinesRawCommissionDetails.map(detail => {
            detail.platform = partnerCommissionLog.platform;
            detail.partnerCommissionLog = partnerCommissionLog._id;

            let prom = dbconfig.collection_downLinesRawCommissionDetail.findOneAndUpdate({platform: ObjectId(detail.platform), partnerCommissionLog: ObjectId(detail.partnerCommissionLog), name: String(detail.name)}, detail, {upsert: true, new: true}).catch(err => {
                console.error('downLinesRawCommissionDetail died with param:', detail, err);
                errorUtils.reportError(err);
            });
            proms.push(prom);
        });

        await dbconfig.collection_parentPartnerCommissionDetail.remove({partnerCommissionLog: ObjectId(partnerCommissionLog._id)}).catch(errorUtils.reportError);
        for (let parentObjId in parentPartnerCommissionDetail) {
            if (parentPartnerCommissionDetail.hasOwnProperty(parentObjId)) {
                let params = parentPartnerCommissionDetail[parentObjId];
                params.partnerCommissionLog = partnerCommissionLog._id;

                let prom = dbconfig.collection_parentPartnerCommissionDetail.findOneAndUpdate({parentObjId: ObjectId(parentObjId), partnerObjId: ObjectId(partnerCommissionLog.partner), startTime: new Date(partnerCommissionLog.startTime)}, params, {upsert: true, new: true}).lean().catch(err => {
                    console.log("parentPartnerCommissionDetail died with param:", params, err);
                    return errorUtils.reportError(err);
                });
                proms.push(prom);
            }
        }

        partnerCommissionLog.downLinesRawCommissionDetail = await Promise.all(proms);
        return partnerCommissionLog;
    },

    getChildPartnerDownLineDetails: (objId, isReport) => {
        // isReport = false -> actual preview implementation
        if (isReport) {
            return dbconfig.collection_commCalcPlayer.find({commCalc: objId}).lean();
        } else {
            return dbconfig.collection_downLinesRawCommissionDetail.find({partnerCommissionLog: objId}).lean();
        }
    },

    getAllDownlinePartnerWithDetails: async (partnerObjId) => {
        let partnerLvl = await getPartnerLevel (null, partnerObjId);
        let partnerObjs = await getAllDownlinePartner(partnerObjId, null, partnerLvl);
        let promArr = [];

        partnerObjs.map(partner => {
            let playerProm = dbconfig.collection_players.aggregate([
                {
                    $match: {
                        partner: partner._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        consumptionSum: {$sum: "$consumptionSum"},
                        bonusAmountSum: {$sum: "$bonusAmountSum"}
                    }
                }
            ]).read("secondaryPreferred").then(
                data => {
                    if (data && data.length) {
                        partner.consumptionSum = data[0].consumptionSum;
                        partner.bonusAmountSum = data[0].bonusAmountSum;
                    } else {
                        partner.consumptionSum = 0;
                        partner.bonusAmountSum = 0;
                    }
                    return partner;
                }
            )
            promArr.push(playerProm);
        })
        return Promise.all(promArr);
    },

    checkPartnersChild: (platformObjId, partnersName) => {
        return dbconfig.collection_partner.find({
            platform: platformObjId,
            partnerName: {$in: partnersName},
            children:{$exists:true, $ne: []}
        }).lean().then(
            partnersData => {
                let isChildExists = false;
                if (partnersData && partnersData.length) {
                    isChildExists = true
                }
                return {isChildExists: isChildExists}
            }
        )

    },

    applyPartnerCommissionSettlement: async (commissionLog, statusApply, adminInfo, remark) => {
        let childDetail = await dbconfig.collection_parentPartnerCommissionDetail.find({parentObjId: commissionLog.partner, startTime: commissionLog.startTime}).sort({partnerName: 1}).lean().read("secondaryPreferred");
        let proposalType = await dbconfig.collection_proposalType.findOne({name: constProposalType.SETTLE_PARTNER_COMMISSION, platformId: commissionLog.platform}).lean();
        if (!proposalType) {
            return Promise.reject({
                message: "Error in getting proposal type"
            });
        }
        let commissionTypeName = getCommissionTypeName(commissionLog.commissionType);
        let proposalRemark = commissionTypeName + ", " + remark;

        // tC = totalChild
        let tCAmount = 0, tCCompanyProfit = 0, tCCompanyConsumption = 0, tCRewardFee = 0, /*tCReward = 0,*/ tCPlatformFee = 0, tcTopUpFee = 0, tcWithdrawalFee = 0, finalAmount = commissionLog.nettCommission, tCNettAmount = 0;
        let tCRawTotal = [];
        let tCReward = 0, tCTopUp = 0, tCWithdrawal = 0;

        let rewardFeeRate = 0, topUpFeeRate = 0, withdrawalFeeRate = 0;

        for (let i = 0; i < childDetail.length; i++) {
            let child = childDetail[i];
            tCAmount += child.grossCommission || 0;
            tCNettAmount += child.grossCommission || 0;
            if (child.rawCommissions && child.rawCommissions.length) {
                for (let j = 0; j < child.rawCommissions.length; j++) {
                    let raw = child.rawCommissions[j];
                    tCCompanyProfit += raw.crewProfit || 0;
                    tCCompanyConsumption += raw.totalValidConsumption || 0;
                    let addedTcRawTotal = false;
                    for (let k = 0; k < tCRawTotal.length; k++) {
                        if (tCRawTotal[k].groupName === raw.groupName) {
                            tCRawTotal[k].amount += Number(raw.amount || 0);
                            tCRawTotal[k].platformFee += Number(raw.platformFee || 0);
                            tCRawTotal[k].totalValidConsumption += Number(raw.totalValidConsumption || 0);
                            tCRawTotal[k].crewProfit += Number(raw.crewProfit || 0);
                            addedTcRawTotal = true;
                            break;
                        }
                    }
                    if (!addedTcRawTotal) {
                        tCRawTotal.push({
                            groupName: raw.groupName,
                            amount: Number(raw.amount || 0),
                            platformFee: Number(raw.platformFee || 0),
                            totalValidConsumption: raw.totalValidConsumption,
                            crewProfit: raw.crewProfit,
                            platformFeeRate: raw.platformFeeRate
                        });
                    }
                }
            }
            tCRewardFee += child.totalRewardFee || 0;
            // tCReward += child.total no such value
            tCPlatformFee += child.totalPlatformFee || 0;
            tcTopUpFee += child.totalTopUpFee || 0;
            tcWithdrawalFee += child.totalWithdrawalFee || 0;
            tCReward += child.totalReward || 0;
            tCTopUp += child.totalTopUp || 0;
            tCWithdrawal += child.totalWithdrawal || 0;
            finalAmount += child.grossCommission || 0;
            rewardFeeRate = rewardFeeRate || child.rewardFeeRate;
            topUpFeeRate = topUpFeeRate || child.topUpFeeRate;
            withdrawalFeeRate = withdrawalFeeRate || child.withdrawalFeeRate;
        }
        tCAmount = math.round(tCAmount, 2);
        tCCompanyProfit = math.round(tCCompanyProfit, 2);
        tCCompanyConsumption = math.round(tCCompanyConsumption, 2);
        tCRewardFee = math.round(tCRewardFee, 2);
        tCPlatformFee = math.round(tCPlatformFee, 2);
        tcTopUpFee = math.round(tcTopUpFee, 2);
        tcWithdrawalFee = math.round(tcWithdrawalFee, 2);
        finalAmount = math.round(finalAmount, 2);

        // create proposal data
        let proposalData = {
            type: proposalType._id,
            creator: adminInfo ? adminInfo : {
                type: 'partner',
                name: commissionLog.partnerName,
                id: commissionLog.partner
            },
            data: {
                isNewComm: true,
                partnerObjId: commissionLog.partner,
                platformObjId: commissionLog.platform,
                partnerId: commissionLog.partnerId,
                partnerName: commissionLog.partnerName,
                partnerRealName: commissionLog.partnerRealName,
                startTime: commissionLog.startTime,
                endTime: commissionLog.endTime,
                commissionType: commissionLog.commissionType,
                partnerCommissionRateConfig: commissionLog.partnerCommissionRateConfig,
                rawCommissions: commissionLog.rawCommissions,
                activeCount: commissionLog.activeDownLines,
                totalRewardFee: commissionLog.totalRewardFee,
                totalReward: commissionLog.totalReward,
                totalTopUpFee: commissionLog.totalTopUpFee,
                totalTopUp: commissionLog.totalTopUp,
                totalWithdrawalFee: commissionLog.totalWithdrawalFee,
                totalWithdrawal: commissionLog.totalWithdrawal,
                adminName: adminInfo ? adminInfo.name : "",
                tCAmount,
                tCNettAmount,
                tCCompanyProfit,
                tCCompanyConsumption,
                tCReward,
                tCRewardFee,
                tCPlatformFee,
                tCTopUp,
                tcTopUpFee,
                tCWithdrawal,
                tcWithdrawalFee,
                tCRawTotal,
                childRewardFeeRate: rewardFeeRate,
                childTopUpFeeRate: topUpFeeRate,
                childWithdrawalFeeRate: withdrawalFeeRate,
                settleType: statusApply,
                nettCommission: commissionLog.nettCommission,
                amount: finalAmount,
                status: constPartnerCommissionLogStatus.PREVIEW,
                logObjId: commissionLog._id,
                remark: proposalRemark
            },
            entryType: constProposalEntryType.ADMIN,
            userType: constProposalUserType.PARTNERS
        };

        return dbProposal.createProposalWithTypeId(proposalType._id, proposalData);
    },

    getPartnerCommissionInfoAPI: async (partnerId, previousPeriod = 0) => {
        if (previousPeriod) {
            return dbPartnerCommission.getPreviousCommissionInfoAPI(partnerId, previousPeriod);
        }

        return dbPartnerCommission.getCurrentPeriodCommissionInfoAPI(partnerId);
    },

    getCurrentPeriodCommissionInfoAPI: async (partnerId) => {
        let partner = await dbconfig.collection_partner.findOne({partnerId}).lean();

        let [detail] = await dbPartnerCommission.getCurrentPartnerCommissionDetail(partner.platform, partner.commissionType, partner.partnerName);

        let totalPromoAmount = detail.totalRewardFee;

        let totalCrewProfit = 0;
        let totalValidBet = 0;
        if (detail.rawCommissions && detail.rawCommissions.length) {
            for (let i = 0; i < detail.rawCommissions.length; i++) {
                let groupComm = detail.rawCommissions[i];

                if (groupComm && groupComm.crewProfit) {
                    totalCrewProfit = math.add(groupComm.crewProfit, totalCrewProfit);
                    totalValidBet = math.add(Number(groupComm.totalValidBet|| 0), totalValidBet);
                }
            }
        }

        let totalPlatformFee = detail.totalPlatformFee;

        let totalDepositWithdrawFee = math.add(detail.totalTopUpFee, detail.totalWithdrawalFee);

        let totalDownLinePartnerCom = 0;
        if (detail.childComm && detail.childComm.length) {
            for (let i = 0; i < detail.childComm.length; i++) {
                let child = detail.childComm[i];

                if (child && child.grossCommission) {
                    totalDownLinePartnerCom = math.add(child.grossCommission, totalDownLinePartnerCom);
                }
            }
        }

        let downLinePlayerCom = detail.grossCommission;

        let preditCommission = math.add(totalDownLinePartnerCom, downLinePlayerCom);

        return {
            stats: {
                totalPromoAmount,
                totalCrewProfit,
                totalPlatformFee,
                totalDepositWithdrawFee,
                totalDownLinePartnerCom,
                totalValidBet,
                downLinePlayerCom,
                preditCommission,
            }
        };
    },

    getPreviousCommissionInfoAPI: async (partnerId, previousPeriod) => {
        let partner = await dbconfig.collection_partner.findOne({partnerId}).lean();
        let proposalType = await dbconfig.collection_proposalType.findOne({platformId: partner.platform, name: constProposalType.SETTLE_PARTNER_COMMISSION}, {_id: 1}).lean();
        let settlementProposals = await dbconfig.collection_proposal.find({"data.partnerId": partner.partnerId, type: proposalType._id}).sort({_id: -1}).limit(previousPeriod).lean();

        let list = settlementProposals.map(prop => {
            if (!prop) return;

            let commissionAmount = prop.data && Number(prop.data.amount) || 0;
            commissionAmount = math.round(commissionAmount, 2);

            return {
                date: prop.createTime,
                commissionAmount
            };
        });

        let highestAmount = 0;
        let lowestAmount = 0;
        let totalAmount = 0;

        for (let i = 0; i < list.length; i++) {
            let commission = list[i];
            if (i === 0) {
                highestAmount = Number(commission.commissionAmount);
                lowestAmount = Number(commission.commissionAmount);
                totalAmount = Number(commission.commissionAmount);
            } else {
                highestAmount = highestAmount < Number(commission.commissionAmount) ? Number(commission.commissionAmount) : highestAmount;
                lowestAmount = lowestAmount > Number(commission.commissionAmount) ? Number(commission.commissionAmount) : lowestAmount;
                totalAmount = math.add(totalAmount, Number(commission.commissionAmount));
            }
        }

        highestAmount = math.round(highestAmount, 2);
        lowestAmount = math.round(lowestAmount, 2);
        let averageAmount = list.length ? math.chain(totalAmount).divide(list.length).round(2).done() || 0 : 0;
        totalAmount = math.round(totalAmount, 2);

        return {
            stats: {
                highestAmount,
                lowestAmount,
                totalAmount,
                averageAmount,
            },
            list
        };
    },

    getTargetCommissionPeriod: (commissionType, date) => {
        return getTargetCommissionPeriod(commissionType, date);
    },

    getRelevantActivePlayerRequirement: (platformObjId, commissionType) => {
        return getRelevantActivePlayerRequirement(platformObjId, commissionType);
    },

    getCommissionTypeName(commissionType) {
        return getCommissionTypeName(commissionType);
    },
};

let proto = dbPartnerCommissionFunc.prototype;
proto = Object.assign(proto, dbPartnerCommission);
module.exports = dbPartnerCommission;

function getPartnerLevel (platformObjId, partnerObj, partnerLevel) {
    partnerLevel = partnerLevel || 1;
    let query = {
        _id: partnerObj
    };
    if (platformObjId) {
        query.platform = platformObjId;
    }

    if (!partnerObj) {
        return Promise.reject({name: "DataError", message: "Invalid data get partner level"});
    }

    return dbconfig.collection_partner.findOne(query, {parent: 1}).lean().then(
        partner => {
            if (partner) {
                if (partner.parent) {
                    return getPartnerLevel(platformObjId, partner.parent, ++partnerLevel);
                }
            }
            return partnerLevel;
        }
    );
}

function getAllDownlinePartner (partnerObjId, chainArray, partnerParentLvl) {
    chainArray = chainArray || [];
    partnerParentLvl = partnerParentLvl? ++partnerParentLvl: 2; // start from level 2, level 1 is the main partner himself
    let query = {};

    if (partnerObjId instanceof Array) {
        query.parent = {$in: partnerObjId}
    } else {
        query.parent = partnerObjId;
    }

    return dbconfig.collection_partner.find(query, {partnerName: 1, realName: 1}).lean().then(
        partnerData => {
            if (partnerData && partnerData.length) {
                let partnerObjIds = [];
                partnerData.map(partner => {
                    partner.partnerParentLvl = partnerParentLvl;
                    if (partner._id) {
                        partnerObjIds.push(partner._id);
                    }
                    return partner;
                });
                chainArray = chainArray.concat(partnerData);
                return getAllDownlinePartner(partnerObjIds, chainArray, partnerParentLvl);
            }
            return chainArray;
        }
    )
}

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
    let noRate = true;
    let zeroRate = true;

    if (consumptionAmount < 0) {
        consumptionAmount *= -1;
    }

    commissionRateTable = commissionRateTable.sort((requirementA, requirementB) => {
        return requirementA.commissionRate - requirementB.commissionRate;
    });

    for (let i = 0; i < commissionRateTable.length; i++) {
        let commissionRequirement = commissionRateTable[i];
        if (commissionRequirement && commissionRequirement.commissionRate > 0) {
            zeroRate = false;
        }

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
        noRate = false;
    }

    return {
        commissionRate: lastValidCommissionRate,
        parentRatios: lastValidParentRatios,
        parentRate: lastValidParentRate,
        noRate: noRate,
        zeroRate: zeroRate,
        isCustom: isCustom
    };
}

function getCommissionTables (partnerObjId, parentChain, commissionType, providerGroups) {
    providerGroups = providerGroups || [];
    let partnerConfigProm = dbPartnerCommissionConfig.getPartnerCommConfig(partnerObjId, commissionType, false, true);
    let parentConfigsProm = parentChain.map(parent => {
        return dbPartnerCommissionConfig.getPartnerCommConfig(parent._id, commissionType, false, true);
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
    let useDefault = false;

    if (!targetConfig || !targetConfig.commissionSetting || !targetConfig.commissionSetting.length) {
        useDefault = true;

        targetConfig = partnerConfig.find(config => {
            return !Boolean(config.provider);
        });

        if (!targetConfig) {
            return {
                groupId: group.providerGroupId,
                groupName: group.name,
                rateTable: []
            };
        }
    }
    let rateTable = targetConfig.commissionSetting;

    let parentsRateTables = parentConfigs.map(parentConfig => {
        let parentTargetConfig = parentConfig.find(config => {
            if (useDefault) {
                return !Boolean(config.provider);
            }
            return String(config.provider) === String(group._id);
        });
        return parentTargetConfig || [];
    });

    let incompleteSetting = false;
    for (let i = 0; i < rateTable.length; i++) {
        let currentRequirement = rateTable[i];
        if (!currentRequirement.commissionRate) {
            currentRequirement.commissionRate = 0;
        }
        let previousPartnerRate = currentRequirement.commissionRate || 0;
        currentRequirement.parentRate = [];

        currentRequirement.parentRatios = parentsRateTables.map(parentRateTable => {
            // if (!parentRateTable || !parentRateTable.commissionSetting || !parentRateTable.commissionSetting[i] || incompleteSetting) {
            //     incompleteSetting = true;
            //     return;
            // }

            let commSetting = parentRateTable && parentRateTable.commissionSetting && parentRateTable.commissionSetting[i] || {};
            currentRequirement.parentRate.push(commSetting.commissionRate);

            if (!commSetting.commissionRate || previousPartnerRate >= commSetting.commissionRate || !currentRequirement.commissionRate) {
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

async function getDirectCommissionRateTable (platformObjId, commissionType, partnerObjId, providerGroupObjId) {
    providerGroupObjId = providerGroupObjId || {$exists: false};

    let providerConfig = await dbconfig.collection_partnerCommissionConfig.findOne({
        platform: platformObjId,
        commissionType: commissionType,
        provider: providerGroupObjId,
        partner: partnerObjId
    }).lean();

    if(!providerConfig) {
        let platformConfig = await dbconfig.collection_partnerCommissionConfig.findOne({
            platform: platformObjId,
            commissionType: commissionType,
            provider: providerGroupObjId,
            partner: null
        }).lean();

        providerConfig = platformConfig;

        // if (platformConfig) {
        //     let dupConfig = JSON.parse(JSON.stringify(platformConfig));
        //     delete dupConfig._id;
        //     delete dupConfig.__v;
        //     dupConfig.partner = partnerObjId;
        //     providerConfig = await dbconfig.collection_partnerCommissionConfig.findOneAndUpdate({
        //         platform: platformObjId,
        //         commissionType: commissionType,
        //         provider: providerGroupObjId,
        //         partner: partnerObjId
        //     }, dupConfig, {upsert: true, new: true}).lean()
        // }
    }

    if (providerConfig && providerConfig.commissionSetting && providerConfig.commissionSetting.length) {
        return providerConfig.commissionSetting;
    }

    let defaultConfig = await dbconfig.collection_partnerCommissionConfig.findOne({
        platform: platformObjId,
        commissionType: commissionType,
        provider: null,
        partner: partnerObjId
    }).lean();

    if (!defaultConfig) {
        let platformDefConfig = await dbconfig.collection_partnerCommissionConfig.findOne({
            platform: platformObjId,
            commissionType: commissionType,
            provider: null,
            partner: null
        }).lean();

        defaultConfig = platformDefConfig;
        // if (platformDefConfig) {
        //     let dupConfig = JSON.parse(JSON.stringify(platformDefConfig));
        //     delete dupConfig._id;
        //     delete dupConfig.__v;
        //     dupConfig.partner = partnerObjId;
        //     defaultConfig = await dbconfig.collection_partnerCommissionConfig.findOneAndUpdate({
        //         platform: platformObjId,
        //         commissionType: commissionType,
        //         provider: null,
        //         partner: partnerObjId
        //     }, dupConfig, {upsert: true, new: true}).lean()
        // }
    }

    if (defaultConfig && defaultConfig.commissionSetting && defaultConfig.commissionSetting.length) {
        return defaultConfig.commissionSetting;
    }

    return [];


    // let platformConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
    //     platform: platformObjId,
    //     commissionType: commissionType,
    //     provider: providerGroupObjId,
    //     partner: {$exists: false}
    // }).lean();
    //
    // let customConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
    //     platform: platformObjId,
    //     commissionType: commissionType,
    //     provider: providerGroupObjId,
    //     partner: partnerObjId
    // }).lean();
    //
    // let defaultConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
    //     platform: platformObjId,
    //     commissionType: commissionType,
    //     provider: null,
    //     partner: partnerObjId
    // }).lean();
    //
    // return Promise.all([platformConfigProm, customConfigProm, defaultConfigProm]).then(
    //     data => {
    //         let platformConfig = {};
    //
    //         if (!data[0]) {
    //             platformConfig.commissionSetting = [];
    //         } else {
    //             platformConfig = data[0];
    //         }
    //
    //         if (data[1]) {
    //             let customConfig = data[1];
    //             platformConfig.commissionSetting.map(platformRate => {
    //                 customConfig.commissionSetting.map(customRate => {
    //                     if (platformRate.playerConsumptionAmountFrom === customRate.playerConsumptionAmountFrom
    //                         && platformRate.playerConsumptionAmountTo === customRate.playerConsumptionAmountTo
    //                         && platformRate.activePlayerValueFrom === customRate.activePlayerValueFrom
    //                         && platformRate.activePlayerValueTo === customRate.activePlayerValueTo
    //                         && platformRate.commissionRate !== customRate.commissionRate) {
    //                         platformRate.isCustom = true;
    //                         platformRate.commissionRate = customRate.commissionRate;
    //                     }
    //                 });
    //             });
    //         }
    //
    //         return platformConfig.commissionSetting;
    //     }
    // );
}

function getDirectCommissionRate (commissionRateTable, consumptionAmount, activeCount) {
    let lastValidCommissionRate = 0;
    let isCustom = false;
    let noRate = true;
    let zeroRate = true;

    if (consumptionAmount < 0) {
        consumptionAmount *= -1;
    }

    commissionRateTable = commissionRateTable || [];

    commissionRateTable = commissionRateTable.sort((requirementA, requirementB) => {
        return requirementA.commissionRate - requirementB.commissionRate;
    });

    for (let i = 0; i < commissionRateTable.length; i++) {
        let commissionRequirement = commissionRateTable[i];
        if (commissionRequirement && commissionRequirement.commissionRate > 0) {
            zeroRate = false;
        }

        if (commissionRequirement.playerConsumptionAmountFrom && consumptionAmount < commissionRequirement.playerConsumptionAmountFrom
            || commissionRequirement.playerConsumptionAmountTo && consumptionAmount > commissionRequirement.playerConsumptionAmountTo
            || commissionRequirement.activePlayerValueFrom && activeCount < commissionRequirement.activePlayerValueFrom
            || commissionRequirement.activePlayerValueTo && activeCount > commissionRequirement.activePlayerValueTo
        ) {
            continue;
        }

        lastValidCommissionRate = commissionRequirement.commissionRate;
        isCustom = Boolean(commissionRequirement.isCustom);
        noRate = false;
    }

    return {
        commissionRate: lastValidCommissionRate,
        noRate: noRate,
        zeroRate: zeroRate,
        isCustom: isCustom
    };
}

function getCalcPartnerByObjId (partnerObjId, commissionType, startTime) {
    let commCalc;
    return dbconfig.collection_commCalc.findOne({partner: partnerObjId, commissionType, startTime}).lean().then(
        commCalcData => {
            if (!commCalcData) {
                return [];
            }
            commCalc = commCalcData;

            return getCommCalcDetail(commCalc, startTime);
        }
    ).then(
        (commCalc) => {
            return [commCalc];
        }
    )
}

function getCalcPartnerByType (platformObjId, commissionType, startTime) {
    return dbconfig.collection_commCalc.find({platform: platformObjId, commissionType, startTime}).sort({partnerName: 1}).lean().then(
        commCalcData => {
            let proms = commCalcData.map(commCalc => {
                return getCommCalcDetail(commCalc, startTime).catch(err => {
                    console.log('getCommCalcDetail failure', commCalc, err);
                    return errorUtils.reportError(err);
                });
            });

            return Promise.all(proms);
        }
    );
}

function getCommCalcDetail (commCalc, startTime) {
    let childCommProm = dbconfig.collection_commCalcParent.find({parentObjId: commCalc.partner, startTime}).sort({partnerName: 1}).lean().read("secondaryPreferred");
    let parentCommProm = dbconfig.collection_commCalcParent.find({commCalc: commCalc._id}).lean().read("secondaryPreferred");
    let playerDetailProm = dbconfig.collection_commCalcPlayer.find({commCalc: commCalc._id}).lean().read("secondaryPreferred");

    return Promise.all([childCommProm, parentCommProm, playerDetailProm]).then(
        ([childCommData, parentCommData, playerDetailData]) => {
            commCalc.childComm = childCommData;
            commCalc.parentPartnerCommissionDetail = parentCommData;
            commCalc.downLinesRawCommissionDetail = playerDetailData;

            return commCalc;
        }
    );
}

function generateSkipCommissionLog (partnerObjId, commissionType, startTime, endTime) {
    return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
        partner => {
            return dbconfig.collection_partnerCommissionLog.update({
                partner: partner._id,
                platform: partner.platform,
                partnerName: partner.partnerName,
                partnerRealName: partner.realName,
                commissionType: commissionType,
                startTime: startTime,
                endTime: endTime,
            }, {
                $set: {
                    status: constPartnerCommissionLogStatus.SKIPPED,
                }
            }, {
                new: true,
                upsert: true
            })
        }
    );
}

function updatePastThreeRecord (currentLog) {
    return dbconfig.collection_partnerCommissionLog.find({
        partner: currentLog.partner,
        platform: currentLog.platform,
        commissionType: currentLog.commissionType,
        startTime: {$lt: currentLog.startTime}
    }).sort({startTime: -1}).limit(3).lean().then(
        pastThreeRecord => {
            let pastThreeActiveDownLines = [];
            let pastThreeNettCommission = [];

            pastThreeRecord.map(log => {
                if (log.status === constPartnerCommissionLogStatus.SKIPPED) {
                    pastThreeActiveDownLines.push("SKIP");
                    pastThreeNettCommission.push("SKIP");
                }
                else {
                    pastThreeActiveDownLines.push(log.activeDownLines);
                    pastThreeNettCommission.push(log.nettCommission);
                }
            });

            return dbconfig.collection_partnerCommissionLog.update({
                partner: currentLog.partner,
                platform: currentLog.platform,
                commissionType: currentLog.commissionType,
                startTime: currentLog.startTime,
                endTime: currentLog.endTime,
            }, {
                pastActiveDownLines: pastThreeActiveDownLines,
                pastNettCommission: pastThreeNettCommission,
            }).lean();
        }
    );
}

function getAllChildrenPartners (partnerObjId, holder, count) {
    // mechanism to prevent infinite loop
    count = count || 0;
    count++;
    if (count > 100) {
        return;
    }

    // actual implementation
    holder = holder || [String(partnerObjId)];
    return dbconfig.collection_partner.find({parent: partnerObjId}, {_id: 1}).lean().then(
        children => {
            let proms = [];
            if (children && children.length) {
                for (let i = 0; i < children.length; i++) {
                    let child = children[i];
                    if (holder.includes(String(child._id))) {
                        continue;
                    }
                    holder.push(String(child._id));
                    let prom = getAllChildrenPartners(child._id, holder, count);
                    proms.push(prom);
                }
            }
            if (proms.length) {
                return Promise.all(proms);
            }
            return Promise.resolve();
        }
    ).then(
        () => {
            return holder;
        }
    );
}

function getCommissionTypeName (commissionType) {
    switch (Number(commissionType)) {
        case 1:
            return "1天-输赢值";
        case 2:
            return "7天-输赢值";
        case 3:
            return "半月-输赢值";
        case 4:
            return "1月-输赢值";
        case 5:
            return "7天-投注额";
        case 7:
            return "1天-投注额";
    }
}