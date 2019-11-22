'use strict';

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constSystemParam = require('./../const/constSystemParam');
const constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus');

const pmsAPI = require('../externalAPI/pmsAPI');

const dbconfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');
const dbPlayerUtil = require("../db_common/dbPlayerUtility");
const dbRewardTaskGroup = require("./../db_modules/dbRewardTaskGroup");
const errorUtils = require("../modules/errorUtils.js");

const SettlementBalancer = require('../settlementModule/settlementBalancer');
const proposalExecutor = require('../modules/proposalExecutor');
const RESTUtils = require('../modules/RESTUtils');

let dbAutoProposal = {
    applyBonus: (platformObjId) => {
        let platformData, proposalTypeObjId;

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                platformData = platform;
                return dbconfig.collection_proposalType.findOne({
                    platformId: platformObjId,
                    name: constProposalType.PLAYER_BONUS
                }).lean();
            }
        ).then(
            proposalType => {
                if (proposalType) {
                    proposalTypeObjId = proposalType._id;
                    let checkTime = new Date();
                    checkTime.setMinutes(checkTime.getMinutes() + 1);

                    let stream = dbconfig.collection_proposal.find({
                        type: proposalTypeObjId,
                        status: constProposalStatus.AUTOAUDIT,
                        $or: [{"data.nextCheckTime": {$exists: false}}, {"data.nextCheckTime": {$lte: checkTime}}]
                    }).cursor({batchSize: 10000});

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(function () {
                        return balancer.processStream(
                            {
                                stream: stream,
                                batchSize: constSystemParam.BATCH_SIZE,
                                makeRequest: function (proposals, request) {
                                    request("player", "processAutoProposals", {
                                        proposals: proposals,
                                        platformObj: platformData
                                    });
                                }
                            }
                        );
                    });
                }
            }
        )
    },

    applyPartnerBonus: (platformObjId) => {
        let platformData, proposalTypeObjId;

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                platformData = platform;
                return dbconfig.collection_proposalType.findOne({
                    platformId: platformObjId,
                    name: constProposalType.PARTNER_BONUS
                }).lean();
            }
        ).then(
            proposalType => {
                if (proposalType) {
                    proposalTypeObjId = proposalType._id;
                    let checkTime = new Date();
                    checkTime.setMinutes(checkTime.getMinutes() + 1);

                    let stream = dbconfig.collection_proposal.find({
                        type: proposalTypeObjId,
                        status: constProposalStatus.AUTOAUDIT,
                    }).cursor({batchSize: 10000});

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(function () {
                        return balancer.processStream(
                            {
                                stream: stream,
                                batchSize: constSystemParam.BATCH_SIZE,
                                makeRequest: function (proposals, request) {
                                    request("player", "processPartnerAutoProposals", {
                                        proposals: proposals,
                                        platformObj: platformData,
                                        useProviderGroup: platformData.useProviderGroup
                                    });
                                }
                            }
                        );
                    });
                }
            }
        )
    },

    processAutoProposals: (proposals, platformObj, withdrawalBank) => {
        if (proposals && proposals.length > 0) {
            return Promise.all(proposals.map(proposal => checkRewardTaskGroup(proposal, platformObj, withdrawalBank)));
        }
    },

    // process partner bonus auto audit
    processPartnerAutoProposals: (proposals, platformObj) => {
        if (proposals && proposals.length > 0) {
            return Promise.all(proposals.map(proposal => {
                return checkPartnerAutoBonus(proposal, platformObj);
            }));
        }
    },

    changeStatusToPendingFromAutoAudit: (proposalObjId, createTime) => {
        return dbconfig.collection_proposal.findOneAndUpdate({
            _id: proposalObjId,
            status: constProposalStatus.AUTOAUDIT,
            createTime: createTime
        }, {
            status: constProposalStatus.PENDING,
            'data.remark': "Changed to manual audit.",
            'data.remarkChinese': "已转换成手动审核。"
        });
    }
};

/**
 * Audit  partner bonus(withdrawal) auto audit proposal
 */
function checkPartnerAutoBonus (proposal, platformObj) {
    let canApprove = true;
    let withdrawAmount = proposal.data.amount;
    let checkMsg = "", checkMsgChinese = "";

    let todayTime = dbUtility.getTodaySGTime();
    let bonusProm = dbconfig.collection_proposal.aggregate(
        {
            $match: {
                type: ObjectId(proposal.type),
                createTime: {
                    $gte: todayTime.startTime,
                    $lt: todayTime.endTime
                },
                'data.partnerObjId': ObjectId(proposal.data.partnerObjId),
                status: {$in: [constProposalStatus.AUTOAUDIT, constProposalStatus.PROCESSING, constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }
        },
        {
            $group: {
                _id: "$data.partnerObjId",
                amount: {$sum: "$data.amount"}
            }
        }
    );

    let commissionProm = dbconfig.collection_proposal.findOne({
        'data.partnerObjId': ObjectId(proposal.data.partnerObjId),
        type: ObjectId(proposal.type),
        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
    }).sort({createTime: -1}).lean().then(
        withdrawalData => {
            if (!withdrawalData) {
                return Promise.reject({name: "DataError", message: "Cannot find proposals"})
            }

            return dbconfig.collection_proposalType.find({
                platformId: platformObj._id,
                name: {$in: [constProposalType.UPDATE_PARENT_PARTNER_COMMISSION, constProposalType.SETTLE_PARTNER_COMMISSION]}
            }, {_id: 1}).lean().then(
                proposalType => {
                    if (!(proposalType && proposalType.length)) {
                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                    }

                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: {$in: proposalType.map(item => item._id)},
                                createTime: {
                                    $gte: withdrawalData.createTime,
                                    $lt: proposal.createTime
                                },
                                'data.partnerObjId': ObjectId(proposal.data.partnerObjId),
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                            }
                        },
                        {
                            $group: {
                                _id: "$data.partnerObjId",
                                amount: {$sum: "$data.amount"}
                            }
                        }
                    );
                }
            );
        }
    ).catch(errorUtils.reportError);

    return Promise.all([bonusProm, commissionProm]).then(
        ([todayWithdrawal, totalCommission]) => {

            if (platformObj.partnerAutoApproveWhenSingleBonusApplyLessThan && withdrawAmount >= platformObj.partnerAutoApproveWhenSingleBonusApplyLessThan) {
                checkMsg += " Denied: Single limit";
                checkMsgChinese += " 失败：单限;";
                canApprove = false;
            }

            if (
                platformObj.partnerAutoApproveWhenSingleDayTotalBonusApplyLessThan && todayWithdrawal
                && todayWithdrawal[0]
                && todayWithdrawal[0].amount >= platformObj.partnerAutoApproveWhenSingleDayTotalBonusApplyLessThan
            ) {
                checkMsg += " Denied: Daily limit";
                checkMsgChinese += " 失败：日限;";
                canApprove = false;
            }

            let totalSumCommission = totalCommission && totalCommission[0] && totalCommission[0].amount || 0;
            if (
                platformObj.partnerWithdrawalCommissionDifference
                && (withdrawAmount - totalSumCommission) >= platformObj.partnerWithdrawalCommissionDifference
            ) {
                checkMsg += " Denied: Withdrawal more than commission amount";
                checkMsgChinese += " 失败：提款大于佣金;";
                canApprove = false;
            }

            if (canApprove) {
                sendToApprovePartner(proposal._id);
            } else {
                sendToAudit(proposal._id, null, proposal.createTime, checkMsg, checkMsgChinese, null);
            }
        }
    )
};

/**
 * Audit reward task group auto audit proposal
 */
function checkRewardTaskGroup(proposal, platformObj, withdrawalBank) {
    let todayBonusAmount = 0;
    let bFirstWithdraw = false;
    // let initialAmount = 0, totalTopUpAmount = 0, totalBonusAmount = 0;
    let dLastWithdraw, initialTransferTime;
    let abnormalMessage = "";
    let abnormalMessageChinese = "";
    let checkMsg = "", checkMsgChinese = "";
    let bTransferAbnormal = false;
    let continuousApplyBonusTimes;
    let bConsecutiveTransferAbnormal = false;

    return getBonusRecordsOfPlayer(proposal.data.playerObjId, proposal.type).then(
        bonusRecord => {
            todayBonusAmount = bonusRecord && bonusRecord[0] && bonusRecord[0].amount ? bonusRecord[0].amount : 0;

            let lastWithdrawalDateProm = getLastValidWithdrawTime(platformObj, proposal.data.playerObjId, proposal.createTime);
            let haveWithdrawalProm = dbconfig.collection_proposal.findOne({
                'data.platformId': ObjectId(platformObj._id),
                'data.playerObjId': ObjectId(proposal.data.playerObjId),
                mainType: 'PlayerBonus',
                $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}],
                createTime: {$lt: proposal.createTime}
            }, {_id: 1}).lean();

            return Promise.all([lastWithdrawalDateProm, haveWithdrawalProm]);
        }
    ).then(
        ([lastWithdrawDate, haveWithdrawal]) => {
            bFirstWithdraw = !Boolean(haveWithdrawal);
            // settleTime of last withdraw proposal
            // if (lastWithdrawDate) {
            //     bFirstWithdraw = !lastWithdrawDate[0];
            // } else {
            //     bFirstWithdraw = !lastWithdrawDate;
            // }
            continuousApplyBonusTimes = lastWithdrawDate && lastWithdrawDate[1] ? lastWithdrawDate[1] : null;

            let transferLogQuery = {
                platformObjId: ObjectId(proposal.data.platformId),
                playerObjId: ObjectId(proposal.data.playerObjId),
                createTime: {$lt: proposal.createTime},
                status: constPlayerCreditTransferStatus.SUCCESS.toString()
            };

            let playerQuery = {
                _id: ObjectId(proposal.data.playerObjId),
                platform: ObjectId(proposal.data.platformId)
            };

            let allProposalQuery = {
                'data.platformId': ObjectId(proposal.data.platformId),
                createTime: {$lt: proposal.createTime},
                $or: [{'data.playerObjId': ObjectId(proposal.data.playerObjId)}]
            };

            let creditLogQuery = {
                platformId: ObjectId(proposal.data.platformId),
                playerId: ObjectId(proposal.data.playerObjId),
                operationTime: {$lt: proposal.createTime},
            };

            let consumptionQuery = {
                platformId: ObjectId(proposal.data.platformId),
                playerId: ObjectId(proposal.data.playerObjId),
                createTime: {$lt: proposal.createTime}
            };

            if (lastWithdrawDate && lastWithdrawDate[0]) {
                dLastWithdraw = lastWithdrawDate[0];
                allProposalQuery.createTime["$gt"] = lastWithdrawDate[0];
                transferLogQuery.createTime["$gt"] = lastWithdrawDate[0];
                creditLogQuery.operationTime["$gt"] = lastWithdrawDate[0];
                consumptionQuery.createTime["$gt"] = lastWithdrawDate[0];
            }

            let RTGPromise = dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId({_id: proposal.data.playerObjId}, proposal.createTime);
            let transferLogsWithinPeriodPromise = dbconfig.collection_playerCreditTransferLog.find(transferLogQuery).read("secondaryPreferred").sort({createTime: 1}).lean();
            let playerInfoPromise = dbconfig.collection_players.findOne(playerQuery, {similarPlayers: 0})
                                    .populate({path: "multipleBankDetailInfo", model: dbconfig.collection_playerMultipleBankDetailInfo}).lean();
            let creditLogPromise = dbconfig.collection_creditChangeLog.find(creditLogQuery).sort({operationTime: 1}).lean();

            if (proposal.data.playerId) {
                allProposalQuery["$or"].push({'data.playerId': proposal.data.playerId});
            }
            if (proposal.data.playerName) {
                allProposalQuery["$or"].push({'data.playerName': proposal.data.playerName});
            }
            let proposalsPromise = dbconfig.collection_proposal.find(allProposalQuery).populate(
                {path: "type", model: dbconfig.collection_proposalType}
            ).sort({createTime: -1}).lean();

            let consumptionPromise = dbconfig.collection_playerConsumptionRecord.aggregate({
                $match: consumptionQuery
            }, {
                $group: {
                    _id: null,
                    totalBetAmt: {$sum: "$validAmount"},
                    totalBonusAmount: {$sum: "$bonusAmount"}
                }
            });

            //let provinceListProm = pmsAPI.foundation_getProvinceList({});
            let provinceListProm = RESTUtils.getPMS2Services("postProvinceList", {});

            let promises = [
                RTGPromise, transferLogsWithinPeriodPromise, playerInfoPromise, proposalsPromise, creditLogPromise,
                consumptionPromise, provinceListProm
            ];
            return Promise.all(promises);
        }
    ).then(
        data => {
            // Check abnormal transfer in and out amount
            if (data && data[1] && data[4]) {
                // let transferInRec = data[1].filter(rec => rec.type == "TransferIn");

                // if (transferInRec && transferInRec[0]) {
                //     initialAmount = transferInRec[0].amount;
                //     initialTransferTime = transferInRec[0].createTime;
                // }

                let transferLogs = data[1];
                let creditChangeLogs = data[4];
                return findTransferAbnormality(transferLogs, creditChangeLogs, platformObj, proposal.data.playerObjId).then(
                    transferAbnormalities => {
                        if (transferAbnormalities) {
                            for (let i = 0; i < transferAbnormalities.length; i++) {
                                abnormalMessage += transferAbnormalities[i].en + "; ";
                                abnormalMessageChinese += transferAbnormalities[i].ch + "; ";
                                if(transferAbnormalities[i].bConsecutiveTransferAbnormal){
                                    bConsecutiveTransferAbnormal = true;
                                } else if (transferAbnormalities[i].bTransferAbnormal){
                                    bTransferAbnormal = true;
                                }
                            }
                        }
                        return data;
                    }
                )
            }

            return data;
        }
    ).then(
        data => {
            let RTGs, allProposals, playerData;
            let bNoBonusPermission = false;
            // let bPendingPaymentInfo = false;
            // let bUpdatePaymentInfo = false;
            let bIsPaymentInfoMatched = false;
            let withdrawAmount = proposal.data.amount;
            let playerCurrentAmount = 0;
            let playerTotalTopupAmount = 0;
            let playerTotalBets = 0;
            let playerTotalBonus = 0;
            let bankProvince = "";

            if (data && data[3]) {
                allProposals = data[3];
                playerTotalTopupAmount = calcPlayerTotalTopupAmount(allProposals);
            }

            if (data && data[2]) {
                playerData = data[2];
                bNoBonusPermission = !playerData.permission.applyBonus;
                playerCurrentAmount = playerData.validCredit;
            }

            if (allProposals && playerData) {
                bIsPaymentInfoMatched = isPaymentInfoMatched(allProposals, playerData);
            }

            if (data && data[5] && data[5][0] && data[5][0].totalBetAmt) {
                playerTotalBets = data[5][0].totalBetAmt;

                if (Number.isFinite(data[5][0].totalBonusAmount)) {
                    playerTotalBonus = data[5][0].totalBonusAmount;
                }
            }

            if (data && data[6] && data[6].data && playerData && playerData.bankAccountProvince) {
                let allProvinces = data[6].data;
                let pIdx = allProvinces.findIndex(d => d.id == playerData.bankAccountProvince);
                if (allProvinces[pIdx] && allProvinces[pIdx].name) {
                    bankProvince = allProvinces[pIdx].name.replace("省", "")
                }
            }

            let isApprove = true, canApprove = true;

            if (!platformObj.enableAutoApplyBonus && data && data[0] && data[0].length > 0) {
                RTGs = data[0];

                let curConsumptionAmount = 0, totalConsumptionAmout = 0;

                RTGs.forEach(RTG => {
                    curConsumptionAmount += RTG.curConsumption;
                    totalConsumptionAmout += RTG.targetConsumption + RTG.forbidXIMAAmt;
                });

                checkMsg += "Insufficient consumption: Consumption " + curConsumptionAmount + ", Required Bet " + totalConsumptionAmout + "; ";
                checkMsgChinese += "投注额不足：投注额 " + curConsumptionAmount + " ，需求投注额 " + totalConsumptionAmout + "; ";
                isApprove = false;
            }

            // Consumption reached, check for other conditions
            if (withdrawAmount >= platformObj.autoApproveWhenSingleBonusApplyLessThan) {
                checkMsg += " Denied: Single limit;";
                checkMsgChinese += " 失败：单限;";
                canApprove = false;
            }
            if (todayBonusAmount >= platformObj.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
                checkMsg += " Denied: Daily limit;";
                checkMsgChinese += " 失败：日限;";
                canApprove = false;
            }
            if (bNoBonusPermission && platformObj.manualAuditBanWithdrawal !== false) {
                checkMsg += " Denied: Not allowed;";
                checkMsgChinese += " 失败：禁提;";
                if (!proposal.data.needCsApproved) {
                    canApprove = false;
                }
            }

            if (bFirstWithdraw && platformObj.autoAudit) {
                if (platformObj.autoAudit.firstWithdrawExceedAmount
                    && withdrawAmount >= platformObj.autoAudit.firstWithdrawExceedAmount
                ) {
                    checkMsg += ' Denied: FW: Amount Exceeded;';
                    checkMsgChinese += ' 失败：首提超额;';
                    canApprove = false;
                }

                if (platformObj.autoAudit.firstWithdrawAndCurrentMinusTopupExceedAmount
                    && (withdrawAmount + playerCurrentAmount - playerTotalTopupAmount) >= platformObj.autoAudit.firstWithdrawAndCurrentMinusTopupExceedAmount
                ) {
                    checkMsg += ' Denied: FW: Amount Higher Than Top Up;';
                    checkMsgChinese += ' 失败：首提高于存款;';
                    canApprove = false;
                }

                if (playerTotalTopupAmount > 0 && platformObj.autoAudit.firstWithdrawTotalBetOverTotalTopupExceedTimes
                    && platformObj.autoAudit.firstWithdrawCondBExceedAmount
                    && (playerTotalBets / playerTotalTopupAmount) <= platformObj.autoAudit.firstWithdrawTotalBetOverTotalTopupExceedTimes
                    && withdrawAmount >= platformObj.autoAudit.firstWithdrawCondBExceedAmount
                ) {
                    checkMsg += ' Denied: FW: Low Bet/Top Up Ratio;';
                    checkMsgChinese += ' 失败：首提投注额/存款过低;';
                    canApprove = false;
                }

                //remove "省" from province variable
                if (playerData.phoneProvince) {
                    playerData.phoneProvince = playerData.phoneProvince.replace("省", "");
                }

                if (playerData.province) {
                    playerData.province = playerData.province.replace("省", "");
                }

                if (platformObj.autoAudit.firstWithdrawDifferentIPCheck
                    && bankProvince
                    && (
                        (playerData.phoneProvince && bankProvince !== playerData.phoneProvince)
                        || (playerData.province && bankProvince !== playerData.province)
                    )
                    &&(
                        (playerData.phoneProvince && !bankProvince.includes(playerData.phoneProvince) && !playerData.phoneProvince.includes(bankProvince))
                        ||
                        (playerData.province && !bankProvince.includes(playerData.province) && !playerData.province.includes(bankProvince))
                    )
                ) {
                    checkMsg += ' Denied: FW: Different Province between IP, Phone, And Bank Account;';
                    checkMsgChinese += ' 失败：首提IP, 电话, 银行所在省不一致;';
                    canApprove = false;
                }
            }

            if (bTransferAbnormal) {
                checkMsg += ' Denied: Transfer-out amount is larger than (transfer-in amount + winning/losing amount from the report);';
                checkMsgChinese += ' 失败：带出大于（带入+报表输赢）;';
                canApprove = false;
            }

            if (bConsecutiveTransferAbnormal) {
                checkMsg += ' Denied: Consecutive transferring-in/ transferring-out;';
                checkMsgChinese += ' 失败：连续转入/转出;';
                canApprove = false;
            }

            if (!bIsPaymentInfoMatched && platformObj.manualAuditAfterBankChanged !== false) {
                checkMsg += ' Denied: Bank Info Not Matched;';
                checkMsgChinese += ' 失败：提款资料与上次银改不符;';
                canApprove = false;
            }

            if (proposal.data.amount >= platformObj.autoApproveProfitTimesMinAmount
                && ((playerTotalBonus / playerTotalTopupAmount) >= platformObj.autoApproveProfitTimes)) {
                checkMsg += ' Denied: Max profit times;';
                checkMsgChinese += ' 失败：二提款间（输赢/存款）过高;';
                canApprove = false;
            }

            if (continuousApplyBonusTimes && platformObj.checkContinuousApplyBonusTimes && platformObj.checkContinuousApplyBonusTimes != 0
                && ((continuousApplyBonusTimes + 1) >= platformObj.checkContinuousApplyBonusTimes)) {
                checkMsg += ' Denied: Continuous Apply Bonus' + (continuousApplyBonusTimes + 1) + 'Times;';
                checkMsgChinese += ' 失败：连续提款' + (continuousApplyBonusTimes + 1) + '次;';
                canApprove = false;
            }

            // Check consumption approved or not
            if (isApprove && canApprove) {
                sendToApprove(proposal._id, playerData, null, null, null, null, null, null, null, null, null, withdrawalBank);
            } else {
                sendToAudit(proposal._id, playerData, proposal.createTime, checkMsg, checkMsgChinese, null, abnormalMessage, abnormalMessageChinese, null, null, null, withdrawalBank);
            }
        }
    )
}

function sendToApprovePartner (proposalObjId, createTime, remark, remarkChinese) {
    // processRemark = processRemark ? processRemark : "";
    let proposalObj;

    dbconfig.collection_proposal.findOne({_id: proposalObjId}).populate({
        path: "type",
        model: dbconfig.collection_proposalType
    }).lean().then(
        proposalData => {
            if (proposalData) {
                return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, true, proposalData, true).then(
                    res => {
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposalData._id, createTime: proposalData.createTime},
                            {
                                noSteps: true,
                                process: null,
                                status: constProposalStatus.APPROVED,
                                'data.autoAuditTime': Date.now(),
                                'data.autoAuditRemark': remark,
                                'data.autoAuditRemarkChinese': remarkChinese,
                                // 'data.autoAuditCheckMsg': processRemark,
                                // 'data.detail': abnormalMessage ? abnormalMessage : "",
                                // 'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : "",
                                // 'data.autoAuditRepeatMsg': repeatMsg,
                                // 'data.autoAuditRepeatMsgChinese': repeatMsgChinese,
                                // 'data.devCheckMsg': devCheckMsg
                            },
                            {new: true}
                        );
                    }
                );
            }
        }
    )
};

function sendToApprove(proposalObjId, playerData, createTime, remark, remarkChinese, processRemark, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg, withdrawalBank) {
    processRemark = processRemark ? processRemark : "";
    let proposalObj;
    let firstBankInfo = {};
    let multilpleBankInfo = {};

    dbconfig.collection_proposal.findOne({_id: proposalObjId}).populate({
        path: "type",
        model: dbconfig.collection_proposalType
    }).lean().then(
        data => {
            if (data && data.data && data.data.playerObjId) {
                return dbconfig.collection_players.findOne({_id: data.data.playerObjId}, {bankAccount: 1, bankName: 1, bankAccountName: 1, multipleBankDetailInfo: 1}).populate(
                    {
                        path: "multipleBankDetailInfo",
                        model: dbconfig.collection_playerMultipleBankDetailInfo
                    }
                ).lean().then(
                    playerBankInfoData => {
                        if (playerBankInfoData) {
                            firstBankInfo.bankName = playerBankInfoData.bankName;
                            firstBankInfo.bankAccount = playerBankInfoData.bankAccount;
                            firstBankInfo.bankAccountName = playerBankInfoData.bankAccountName;

                            if (playerBankInfoData.multipleBankDetailInfo) {
                                return dbconfig.collection_playerMultipleBankDetailInfo.findOne({_id: playerBankInfoData.multipleBankDetailInfo}).lean().then(
                                    multipleBankData => {
                                        multilpleBankInfo = multipleBankData || {};

                                        return data;
                                    }, err => {
                                        return data;
                                    })
                            }
                        }

                        return data;
                    }, err => {
                        return data;
                    });
            }
            return data;
        }
    ).then(
        proposalData => {
            if (proposalData) {
                return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, true, proposalData, true).then(
                    res => {
                        let dataToUpdate = {
                            noSteps: true,
                            process: null,
                            status: constProposalStatus.APPROVED,
                            'data.autoAuditTime': Date.now(),
                            'data.autoAuditRemark': remark,
                            'data.autoAuditRemarkChinese': remarkChinese,
                            'data.autoAuditCheckMsg': processRemark,
                            'data.detail': abnormalMessage ? abnormalMessage : "",
                            'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : "",
                            'data.autoAuditRepeatMsg': repeatMsg,
                            'data.autoAuditRepeatMsgChinese': repeatMsgChinese,
                            'data.devCheckMsg': devCheckMsg
                        }

                        if(proposalData && proposalData.type && proposalData.type.name == "PlayerBonus"){
                            if (proposalData && proposalData.data && proposalData.data.playerObjId) {
                                let dataSubmitted = proposalData.data;
                                let bankInfo = getWithdrawalBankInfo(dataSubmitted, firstBankInfo, multilpleBankInfo);

                                if(bankInfo && bankInfo[0]){
                                    dataToUpdate["data.bankAccountWhenApprove"] = bankInfo[0];
                                }

                                if(bankInfo && bankInfo[1]){
                                    dataToUpdate["data.bankNameWhenApprove"] = bankInfo[1];
                                }
                            }
                        }

                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposalData._id, createTime: proposalData.createTime},
                            dataToUpdate,
                            {new: true}
                        );
                    }
                );
            }
        }
    ).then(
        data => {
            proposalObj = data;

            let prom = Promise.resolve(true);

            if (proposalObj && proposalObj.mainType === constProposalType.PLAYER_BONUS && proposalObj.data && proposalObj.data.playerObjId && proposalObj.data.platformId) {
                prom = dbconfig.collection_players.findOne({_id: proposalObj.data.playerObjId, platform: proposalObj.data.platformId}, {permission: 1, _id: 1, platform: 1})
                    .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                    playerData => {
                        if (playerData && playerData.permission && playerData.permission.hasOwnProperty('applyBonus') && playerData.permission.applyBonus.toString() == 'false'
                            && playerData.platform && playerData.platform.playerForbidApplyBonusNeedCsApproval
                            && proposalObj.status == constProposalStatus.APPROVED && proposalObj.data.needCsApproved) {

                            return dbconfig.collection_playerPermissionLog.findOne({
                                player: playerData._id,
                                platform: proposalObj.data.platformId,
                                isSystem: false
                            }).sort({createTime: -1}).lean().then(
                                manualPermissionSetting => {

                                    let platformObjId = proposalObj.data.platformId;
                                    let playerObjId = proposalObj.data.playerObjId;
                                    let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                    let newPermissionObj = {applyBonus: true};
                                    let remark = "";

                                    if (manualPermissionSetting) {
                                        if(manualPermissionSetting.newData && manualPermissionSetting.newData.hasOwnProperty('applyBonus')
                                            && manualPermissionSetting.newData.applyBonus.toString() == 'true') {

                                            remark = "提款提案号：" + proposalObj.proposalId;
                                            autoEnableBonusPermission(proposalObj, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj);

                                        }
                                    } else {
                                        remark = "提款提案号：" + proposalObj.proposalId;
                                        autoEnableBonusPermission(proposalObj, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                }
                            )
                        }
                    }

                );
            }

            return prom.then(() => {
                return proposalObj;
            });
        }
    );
}

function sendToReject(proposalObjId, createTime, remark, remarkChinese, processRemark, abnormalMessage, abnormalMessageChinese) {
    processRemark = processRemark ? processRemark : "";

    dbconfig.collection_proposal.findOne({_id: proposalObjId}).populate({
        path: "type",
        model: dbconfig.collection_proposalType
    }).lean().then(
        proposalData => {
            if (proposalData) {
                return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, false, proposalData, true).then(
                    res => {
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposalData._id, createTime: proposalData.createTime},
                            {
                                noSteps: true,
                                process: null,
                                status: constProposalStatus.REJECTED,
                                'data.autoAuditTime': Date.now(),
                                'data.autoAuditRemark': remark,
                                'data.autoAuditRemarkChinese': remarkChinese,
                                'data.autoAuditCheckMsg': processRemark,
                                'data.detail': abnormalMessage ? abnormalMessage : "",
                                'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : ""
                            },
                            {new: true}
                        );
                    }
                );
            }
        }
    );
}

function sendToAudit(proposalObjId, playerData, createTime, remark, remarkChinese, processRemark, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg, withdrawalBank) {
    processRemark = processRemark ? processRemark : "";
    let firstBankInfo = {};
    let multilpleBankInfo = {};

    dbconfig.collection_proposal.findOne({_id: proposalObjId}).populate({
        path: "type",
        model: dbconfig.collection_proposalType
        }
    ).lean().then(
        data => {
            if (data && data.data && data.data.playerObjId) {
                return dbconfig.collection_players.findOne({_id: data.data.playerObjId}, {bankAccount: 1, bankName: 1, bankAccountName: 1, multipleBankDetailInfo: 1}).populate(
                    {
                        path: "multipleBankDetailInfo",
                        model: dbconfig.collection_playerMultipleBankDetailInfo
                    }
                ).lean().then(
                    playerBankInfoData => {
                        if (playerBankInfoData) {
                            firstBankInfo.bankName = playerBankInfoData.bankName;
                            firstBankInfo.bankAccount = playerBankInfoData.bankAccount;
                            firstBankInfo.bankAccountName = playerBankInfoData.bankAccountName;

                            if (playerBankInfoData.multipleBankDetailInfo) {
                                return dbconfig.collection_playerMultipleBankDetailInfo.findOne({_id: playerBankInfoData.multipleBankDetailInfo}).lean().then(
                                    multipleBankData => {
                                        multilpleBankInfo = multipleBankData || {};

                                        return data;
                                    }, err => {
                                        return data;
                                    })
                            }
                        }

                        return data;
                    }, err => {
                        return data;
                    });
            }
            return data;
        }
    ).then(
        proposalData => {
            //add status check
            if (proposalData && proposalData.status == constProposalStatus.AUTOAUDIT) {
                //temp fix
                if (true || !proposalData.noSteps) {
                    let dataToUpdate = {
                        status: constProposalStatus.PENDING,
                        'data.autoAuditTime': Date.now(),
                        'data.autoAuditRemark': remark,
                        'data.autoAuditRemarkChinese': remarkChinese,
                        'data.autoAuditCheckMsg': processRemark,
                        'data.detail': abnormalMessage ? abnormalMessage : "",
                        'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : "",
                        'data.autoAuditRepeatMsg': repeatMsg,
                        'data.autoAuditRepeatMsgChinese': repeatMsgChinese,
                        'data.devCheckMsg': devCheckMsg
                    };

                    if(proposalData && proposalData.type && proposalData.type.name == "PlayerBonus"){
                        if (proposalData && proposalData.data && proposalData.data.playerObjId) {
                            let dataSubmitted = proposalData.data;
                            let bankInfo = getWithdrawalBankInfo(dataSubmitted, firstBankInfo, multilpleBankInfo);

                            if(bankInfo && bankInfo[0]){
                                dataToUpdate["data.bankAccountWhenApprove"] = bankInfo[0];
                            }

                            if(bankInfo && bankInfo[1]){
                                dataToUpdate["data.bankNameWhenApprove"] = bankInfo[1];
                            }
                        }
                    }

                    dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposalObjId,
                        createTime: createTime
                    }, dataToUpdate).then();
                }
                else {
                    return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, false, proposalData, true).then(
                        res => {
                            let dataToUpdate = {
                                noSteps: true,
                                process: null,
                                status: constProposalStatus.FAIL,
                                'data.autoAuditTime': Date.now(),
                                'data.autoAuditRemark': remark,
                                'data.autoAuditRemarkChinese': remarkChinese,
                                'data.autoAuditCheckMsg': processRemark,
                                'data.detail': abnormalMessage ? abnormalMessage : "",
                                'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : ""
                            };

                            if(proposalData && proposalData.type && proposalData.type.name == "PlayerBonus"){
                                if (proposalData && proposalData.data && proposalData.data.playerObjId) {
                                    let dataSubmitted = proposalData.data;
                                    let bankInfo = getWithdrawalBankInfo(dataSubmitted, firstBankInfo, multilpleBankInfo);

                                    if(bankInfo && bankInfo[0]){
                                        dataToUpdate["data.bankAccountWhenApprove"] = bankInfo[0];
                                    }

                                    if(bankInfo && bankInfo[1]){
                                        dataToUpdate["data.bankNameWhenApprove"] = bankInfo[1];
                                    }
                                }
                            }

                            return dbconfig.collection_proposal.findOneAndUpdate(
                                {_id: proposalData._id, createTime: proposalData.createTime},
                                dataToUpdate,
                                {new: true}
                            );
                        })
                }
            }
        }
    );
}

function getWithdrawalBankInfo(dataSubmitted, firstBankInfo, multilpleBankInfo) {
    let bankAccountWhenApprove;
    let bankNameWhenApprove;

    if(firstBankInfo.bankAccount
        && firstBankInfo.bankName
        && firstBankInfo.bankAccountName
        && dataSubmitted.decodedBankAccountWhenSubmit
        && dataSubmitted.bankNameWhenSubmit
        && (dataSubmitted.decodedBankAccountWhenSubmit === firstBankInfo.bankAccount &&
            dataSubmitted.bankNameWhenSubmit === firstBankInfo.bankName &&
            dataSubmitted.bankAccountNameWhenSubmit === firstBankInfo.bankAccountName)){

        bankAccountWhenApprove = dbUtility.encodeBankAcc(firstBankInfo.bankAccount);
        bankNameWhenApprove = firstBankInfo.bankName;

    } else if (multilpleBankInfo && multilpleBankInfo.bankAccount2
        && multilpleBankInfo.bankName2
        && multilpleBankInfo.bankAccountName2
        && dataSubmitted.decodedBankAccountWhenSubmit
        && dataSubmitted.bankNameWhenSubmit
        && (dataSubmitted.decodedBankAccountWhenSubmit === multilpleBankInfo.bankAccount2 &&
            dataSubmitted.bankNameWhenSubmit === multilpleBankInfo.bankName2 &&
            dataSubmitted.bankAccountNameWhenSubmit === multilpleBankInfo.bankAccountName2)) {

        bankAccountWhenApprove = dbUtility.encodeBankAcc(multilpleBankInfo.bankAccount2);
        bankNameWhenApprove = multilpleBankInfo.bankName2;

    } else if (multilpleBankInfo && multilpleBankInfo.bankAccount3
        && multilpleBankInfo.bankName3
        && multilpleBankInfo.bankAccountName3
        && dataSubmitted.decodedBankAccountWhenSubmit
        && dataSubmitted.bankNameWhenSubmit
        && (dataSubmitted.decodedBankAccountWhenSubmit === multilpleBankInfo.bankAccount3 &&
            dataSubmitted.bankNameWhenSubmit === multilpleBankInfo.bankName3 &&
            dataSubmitted.bankAccountNameWhenSubmit === multilpleBankInfo.bankAccountName3)) {

        bankAccountWhenApprove = dbUtility.encodeBankAcc(multilpleBankInfo.bankAccount3);
        bankNameWhenApprove = multilpleBankInfo.bankName3;
    }

    return [bankAccountWhenApprove, bankNameWhenApprove];
}

function getBonusRecordsOfPlayer(player, proposalTypeObjId) {
    let todayTime = dbUtility.getTodaySGTime();

    return dbconfig.collection_proposal.aggregate(
        {
            $match: {
                type: ObjectId(proposalTypeObjId),
                createTime: {
                    $gte: todayTime.startTime,
                    $lt: todayTime.endTime
                },
                'data.playerObjId': ObjectId(player),
                status: {$in: [constProposalStatus.AUTOAUDIT, constProposalStatus.PROCESSING, constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }
        },
        {
            $group: {
                _id: "$data.playerObjId",
                amount: {$sum: "$data.amount"}
            }
        }
    );
}

function getPlayerLastProposalDateOfType(playerObjId, type) {
    return dbconfig.collection_proposal.find({
        'data.playerObjId': ObjectId(playerObjId),
        type: ObjectId(type),
        $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}]
    }).sort({createTime: -1}).limit(1).lean().then(
        retData => {
            if (retData && retData[0]) {
                return retData[0].createTime;
            }
        }
    );
}

/**
 * Get last withdrawal proposal that has top up after withdraw
 * @param platform
 * @param playerObjId
 * @param thisWithdrawTime
 * @returns {Promise}
 */
function getLastValidWithdrawTime(platform, playerObjId, thisWithdrawTime) {
    thisWithdrawTime = new Date(thisWithdrawTime);
    let lastWithdrawTimeBeforeTopUp;
    let withdrawCount = 0;

    // TODO:: May be enhanced to limit search to 1 year time -

    return dbconfig.collection_proposal.find({
        'data.platformId': ObjectId(platform._id),
        'data.playerObjId': ObjectId(playerObjId),
        mainType: 'TopUp',
        createTime: {$lt: thisWithdrawTime},
        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
    }, {createTime: 1}).sort({createTime: -1}).limit(1).lean().then(
        lastTopUpProp => {
            if (lastTopUpProp && lastTopUpProp[0] && lastTopUpProp[0].createTime) {
                // get last withdraw time before topup
                let lastValidWithdrawProm = getWithdrawTime(platform._id, playerObjId, lastTopUpProp[0].createTime);
                let lastValidCountProm = getWithdrawTime(platform._id, playerObjId, thisWithdrawTime).then(
                    lastWithdrawTimeAfterTopUp => {
                        if (lastWithdrawTimeAfterTopUp && lastWithdrawTimeAfterTopUp[0] && lastWithdrawTimeAfterTopUp[0].createTime
                            && (lastTopUpProp[0].createTime.getTime() < lastWithdrawTimeAfterTopUp[0].createTime.getTime())) {

                            let countBonusQuery = {
                                'data.platformId': ObjectId(platform._id),
                                'data.playerObjId': ObjectId(playerObjId),
                                mainType: 'PlayerBonus',
                                $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}],
                                createTime: {$gte: lastTopUpProp[0].createTime, $lt: thisWithdrawTime}
                            };

                            // count total withdraw times after topup
                            return dbconfig.collection_proposal.find(countBonusQuery).count();
                        }
                    }
                )

                return Promise.all([lastValidWithdrawProm, lastValidCountProm]).then(
                    retData => {
                        if (retData && retData[0] && retData[0][0]) {
                            lastWithdrawTimeBeforeTopUp = retData[0][0].createTime;
                        }

                        if (retData && retData[1]) {
                            withdrawCount = retData[1];
                        }

                        // get last withdraw time after topup
                        return [lastWithdrawTimeBeforeTopUp, withdrawCount];
                    }
                );
            }
        }
    )
}

function getWithdrawTime(platformId, playerId, createTime) {
    return dbconfig.collection_proposal.find({
        'data.platformId': ObjectId(platformId),
        'data.playerObjId': ObjectId(playerId),
        mainType: 'PlayerBonus',
        $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}],
        createTime: {$lt: createTime}
    }, {createTime: 1}).sort({createTime: -1}).limit(1).lean();
}

function getPlayerConsumptionSummary(platformId, playerId, dateFrom, dateTo, providerIdArr) {
    let matchObj = {
        platformId: ObjectId(platformId),
        createTime: {
            $gte: new Date(dateFrom),
            $lt: new Date(dateTo)
        },
        playerId: ObjectId(playerId)
    };

    if (providerIdArr) {
        matchObj.providerId = {$in: providerIdArr};
    }

    let groupObj = {
        _id: {playerId: "$playerId", platformId: "$platformId"},
        validAmount: {$sum: "$validAmount"},
        bonusAmount: {$sum: "$bonusAmount"}
    };

    return dbconfig.collection_playerConsumptionRecord.aggregate(
        {
            $match: matchObj
        },
        {
            $group: groupObj
        }
    );
}

function findTransferAbnormality(transferLogs, creditChangeLogs, platformObj, playerId) {
    if (transferLogs && transferLogs.length <= 0) {
        return Promise.resolve(false);
    }

    let completeCycle = false;
    let promBonusCheck = [];
    let inAmt = 0, outAmt = 0, inTime, outTime;

    let multipleTransferInWithoutOtherCreditInput = false;
    let validCreditMoreThanOneAfterTransferIn = false;
    let multipleTransferOutStreakExist = false;
    let lastTransferLogType = "";
    let lastTransferInLogTime = "";
    let lastTransferLogProviderId = "";
    let multipleTransferInId = null;
    let multipleTransferOutId = null;
    creditChangeLogs = creditChangeLogs ? creditChangeLogs : [];

    let abnormalities = [];

    let logsLength = transferLogs.length;
    for (let i = 0; i < logsLength; i++) {
        if(transferLogs[i].isEbet === false) {
            if (transferLogs[i].type === 'TransferIn') {
                auditTransferInLog(transferLogs[i], platformObj.consecutiveTransferInOut);
                lastTransferInLogTime = transferLogs[i].createTime;

                // bonus <> transfer amount check
                completeCycle = false;
                inAmt = transferLogs[i].amount;
                inTime = transferLogs[i].createTime;
            } else {
                auditTransferOutLog(transferLogs[i], platformObj.consecutiveTransferInOut);

                // bonus <> transfer amount check
                // if first transfer is not out, set completeCycle to true
                completeCycle = i != 0;
                outAmt = transferLogs[i].amount;
                outTime = transferLogs[i].createTime;
            }
            lastTransferLogType = transferLogs[i].type;
            lastTransferLogProviderId = transferLogs[i].providerId;

            if (completeCycle && inTime && outTime) {
                let consumedAmt = outAmt - inAmt;
                promBonusCheck.push(
                    getPlayerConsumptionSummary(platformObj._id, playerId, inTime, outTime).then(
                        res => {
                            let transferOutId = transferLogs[i].transferId;
                            let transDifference = consumedAmt;
                            let bonusAmt = res && res[0] ? res[0].bonusAmount : 0;
                            let profitDifference = bonusAmt - transDifference;
                            if ((profitDifference < 0 && profitDifference < -platformObj.autoApproveBonusProfitOffset)
                                || profitDifference > 0 && profitDifference > platformObj.autoApproveBonusProfitOffset) {
                                abnormalities.push({
                                    en: "Transfer In transfer out (ID: " + transferOutId + ")",
                                    ch: "带入带出 (ID: " + transferOutId + ")",
                                    bTransferAbnormal: true
                                });
                            }
                        }
                    )
                );
                completeCycle = !completeCycle;
            }
        }
    }

    if (multipleTransferInWithoutOtherCreditInput) {
        abnormalities.push({
            en: "Transfer In transfer out (ID: " + multipleTransferInId + ")",
            ch: "带入带出 (ID: " + multipleTransferInId + ")",
            bConsecutiveTransferAbnormal: true
            // en: "Multi TransferIn (ID: " + multipleTransferInId + ")",
            // ch: "连续转入 (ID: " + multipleTransferInId + ")"
        });
    }

    if (validCreditMoreThanOneAfterTransferIn) {
        abnormalities.push({
            en: "1TransferIn",
            ch: "转入后多过1"
        });
    }

    if (multipleTransferOutStreakExist) {
        abnormalities.push({
            en: "Transfer In transfer out (ID: " + multipleTransferOutId + ")",
            ch: "带入带出 (ID: " + multipleTransferOutId + ")",
            bConsecutiveTransferAbnormal: true
            // en: "Multi TransferOut (ID: " + multipleTransferOutId + ")",
            // ch: "连续转出 (ID: " + multipleTransferOutId + ")"
        });
    }

    // DEBUG LOG
    console.log('abnormalities:', abnormalities);

    return Promise.all(promBonusCheck).then(
        res => abnormalities
    );

    function auditTransferInLog(log, isCheckConsecutiveTransferInOut) {

        if (lastTransferLogType === "TransferIn") {
            if (!hasTopUpOrRewardWithinPeriod(lastTransferInLogTime, log.createTime) && isCheckConsecutiveTransferInOut) {
                multipleTransferInWithoutOtherCreditInput = true;
                if (!multipleTransferInId) {
                    multipleTransferInId = log.transferId;
                }
            }

            // if (log.apiRes.validCredit >= 1) {
            //     validCreditMoreThanOneAfterTransferIn = true;
            // }
        }

        function hasTopUpOrRewardWithinPeriod(startTime, endTime) {
            for (let i = 0; i < creditChangeLogs.length; i++) {
                if (
                    creditChangeLogs[i].operationTime > startTime
                    && creditChangeLogs[i].operationTime < endTime
                    && creditChangeLogs[i].amount + creditChangeLogs[i].lockedAmount >= 0.02
                ) {
                    return true;
                }
            }
            return false;
        }
    }

    function auditTransferOutLog(log, isCheckConsecutiveTransferInOut) {
        if (lastTransferLogType === "TransferOut" && log.providerId === lastTransferLogProviderId && isCheckConsecutiveTransferInOut) {
            multipleTransferOutStreakExist = true;
            if (!multipleTransferOutId) {
                multipleTransferOutId = log.transferId;
            }
        }
    }
}

function hasPendingPaymentInfoChanges(proposals) {
    let length = proposals.length;
    for (let i = 0; i < length; i++) {
        let proposal = proposals[i];
        if (proposal.type.name == constProposalType.UPDATE_PLAYER_BANK_INFO && proposal.status == constProposalStatus.PENDING) {
            return true;
        }
    }
    return false;
}
function isFirstWithdrawalAfterPaymentInfoUpdated(proposals) {
    let length = proposals.length;
    for (let i = 0; i < length; i++) {
        let proposal = proposals[i];
        if (proposal.type.name == constProposalType.UPDATE_PLAYER_BANK_INFO && proposal.status == constProposalStatus.APPROVED) {
            return true;
        }
        if (proposal.type.name == constProposalType.PLAYER_BONUS &&
            (proposal.status != constProposalStatus.REJECTED) && (proposal.status != constProposalStatus.FAIL) && (proposal.status != constProposalStatus.CANCEL)) {
            return false;
        }
    }
    return false;
}

function isPaymentInfoMatched(proposals, playerData) {
    let length = proposals.length;
    for (let i = 0; i < length; i++) {
        let proposal = proposals[i];
        if (proposal.type.name == constProposalType.UPDATE_PLAYER_BANK_INFO && proposal.status == constProposalStatus.APPROVED) {
            if(proposal.data){
                if(proposal.data.bankAccount){
                    if(!playerData.bankAccount){
                        return false;
                    }else if(proposal.data.bankAccount != playerData.bankAccount){
                        return false;
                    }
                }
                if (proposal.data.bankAccount2) {
                    if (playerData.multipleBankDetailInfo && !playerData.multipleBankDetailInfo.bankAccount2) {
                        return false;
                    } else if (playerData.multipleBankDetailInfo && proposal.data.bankAccount2 != playerData.multipleBankDetailInfo.bankAccount2) {
                        return false;
                    }
                }
                if (proposal.data.bankAccount3) {
                    if (playerData.multipleBankDetailInfo && !playerData.multipleBankDetailInfo.bankAccount3) {
                        return false;
                    } else if (playerData.multipleBankDetailInfo && proposal.data.bankAccount3 != playerData.multipleBankDetailInfo.bankAccount3) {
                        return false;
                    }
                }
            }

            return true;
        }
    }
    return true;
}

function calcPlayerTotalTopupAmount(proposals) {
    let totalAmt = 0;
    proposals.forEach(prop => {
        if (prop.mainType === 'TopUp' && prop.status === constProposalStatus.SUCCESS) {
            totalAmt += prop.data.amount || 0;
        }
    })
    return totalAmt;
}

function autoEnableBonusPermission(proposalObj, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj) {
    return dbconfig.collection_proposal.findOneAndUpdate({
        _id: proposalObj._id,
        createTime: proposalObj.createTime
    }, {
        'data.remark': proposalObj.data.remark + "／执行后自动解禁"
    }).then(proposalData => {
        return dbconfig.collection_players.findOneAndUpdate({
            _id: playerObjId,
            platform: platformObjId
        }, {
            $set: {"permission.applyBonus": true}
        });
    }).then(playerData => {
        return dbPlayerUtil.addPlayerPermissionLog(null, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj);
    });
}

module.exports = dbAutoProposal;
