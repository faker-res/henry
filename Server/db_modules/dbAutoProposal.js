'use strict';

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constPlayerLevel = require('../const/constPlayerLevel');
const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constRewardTaskStatus = require('../const/constRewardTaskStatus');
const constServerCode = require('../const/constServerCode');
const constSystemLogLevel = require('./../const/constSystemLogLevel');
const constSystemParam = require('./../const/constSystemParam');
const constShardKeys = require('../const/constShardKeys');
const constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus');

const dbProposal = require('./../db_modules/dbProposal');

const pmsAPI = require("../externalAPI/pmsAPI.js");

const dbconfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');

const SettlementBalancer = require('../settlementModule/settlementBalancer');
const proposalExecutor = require('../modules/proposalExecutor');

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
                    let lastCheckBefore = new Date();
                    lastCheckBefore.setMinutes(lastCheckBefore.getMinutes() - platformData.autoApproveRepeatDelay);

                    // CS TEST - Include pending proposal as well
                    let stream = dbconfig.collection_proposal.find({
                        type: proposalTypeObjId,
                        status: constProposalStatus.AUTOAUDIT,//{$in: [constProposalStatus.AUTOAUDIT, constProposalStatus.PENDING]},
                        $or: [{"data.nextCheckTime": {$exists: false}}, {"data.nextCheckTime": {$lte: new Date()}}]
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
                                        platformObj: platformData,
                                        proposalTypeObjId: proposalTypeObjId,
                                    });
                                }
                            }
                        );
                    });
                }
            }
        )
    },

    processAutoProposals: (proposals, platformObj, proposalTypeObjId) => {
        if (proposals && proposals.length > 0) {
            return Promise.all(proposals.map(proposal => checkProposalConsumption(proposal, platformObj)));
        }
    },

    changeStatusToPendingFromAutoAudit: (proposalObjId, createTime) => {
         return dbconfig.collection_proposal.findOneAndUpdate({_id: proposalObjId, status: constProposalStatus.AUTOAUDIT, createTime: createTime}, {status: constProposalStatus.PENDING, 'data.remark': "Changed to manual audit.", 'data.remarkChinese': "已转换成手动审核。"});
    }
};

/**
 *
 * @param proposal - The withdrawal proposal
 * @param lastWithdrawDate
 * @param repeatCount
 * @param platformObj
 * @returns {Promise}
 */
function checkProposalConsumption(proposal, platformObj) {
    let repeatCount = platformObj.autoApproveRepeatCount;
    let todayBonusAmount = 0;

    return getBonusRecordsOfPlayer(proposal.data.playerObjId, proposal.type).then(
        bonusRecord => {
            todayBonusAmount = bonusRecord ? bonusRecord.amount : 0;

            return getPlayerLastProposalDateOfType(proposal.data.playerObjId, proposal.type);
        }
    ).then(
        lastWithdrawDate => {
            if (lastWithdrawDate) {
                let proposalsWithinPeriodPromise = dbconfig.collection_proposal.find({
                    'data.platformId': ObjectId(proposal.data.platformId),
                    'data.playerObjId': ObjectId(proposal.data.playerObjId),
                    createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                    mainType: {$in: ["TopUp", "Reward"]}
                }).sort({createTime: -1}).lean();
                let transferLogsWithinPeriodPromise = dbconfig.collection_playerCreditTransferLog.find({
                    platformObjId: ObjectId(proposal.data.platformId),
                    playerObjId: ObjectId(proposal.data.playerObjId),
                    createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
                    status: constPlayerCreditTransferStatus.SUCCESS.toString()
                }).sort({createTime: 1}).lean();

                return Promise.all([proposalsWithinPeriodPromise, transferLogsWithinPeriodPromise]);
            }
            else {
                sendToAudit(proposal._id, proposal.createTime, "Denied: Player's first withdrawal", "失败：玩家首次提款");
                return Promise.reject("reject");
            }
        }
    ).then(
        data => {
            let proposals;
            let transferAbnormalMessage = "";
            let transferAbnormalMessageChinese = "";
            if (data && data[0]) {
                proposals = data[0];
            }

            if (data && data[1]) {
                let transferAbnormalities = findTransferAbnormality(data[1], proposals);

                for (let i = 0; i < transferAbnormalities.length; i++) {
                    console.log('here')
                    transferAbnormalMessage += transferAbnormalities[i].en + "; ";
                    transferAbnormalMessageChinese += transferAbnormalities[i].ch + "; ";
                }
            }
                         console.log('transferAbnormalMessage', transferAbnormalMessage)
            let isApprove = true, proms = [], repeatMsg = "", repeatMsgChinese = "";
            let lostThreshold = platformObj.autoApproveLostThreshold ? platformObj.autoApproveLostThreshold : 0;
            let countProposals = 0;
            let isTypeEApproval = false;
            let dateTo = proposal.createTime;

            let checkResult = [], checkMsg = "", checkMsgChinese = "";

            if (proposals && !proposals.length) {
                // There is no other withdrawal between this withdrawal and last withdrawal
                let approveRemark = "No proposals between this and last withdrawal";
                let approveRemarkChinese = "在此提案和上次的提款之间并没有其他提案";
                sendToApprove(proposal._id, proposal.createTime, approveRemark, approveRemarkChinese, checkMsg, transferAbnormalMessage, transferAbnormalMessageChinese);
            }
            else {
                while (proposals && proposals.length > 0) {
                    // FIFO dequeue from nearest date proposal
                    let getProp = proposals.shift();

                    // Set query date from checking proposal -> current proposal
                    let queryDateFrom = new Date(getProp.createTime);
                    let queryDateTo = new Date(dateTo);

                    let checkingNo = countProposals;
                    switch (getProp.mainType) {
                        case "TopUp":
                            let isSkip = false;
                            proms.push(
                                // Check if this top up has used for apply reward
                                dbconfig.collection_playerTopUpRecord.findOne({proposalId: getProp.proposalId}).then(
                                    topUpRecord => {
                                        // Only check consumption if the topup record is clean, else ignore this proposal
                                        if (!topUpRecord.bDirty) {
                                            return getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, queryDateFrom, queryDateTo);
                                        }
                                        else {
                                            isSkip = true;
                                        }
                                    }
                                ).then(
                                    record => {
                                        if (!isSkip) {
                                            let curConsumption = 0, bonusAmount = 0;
                                            if (record && record[0]) {
                                                curConsumption = record[0].validAmount;
                                                bonusAmount = record[0].bonusAmount;
                                            }

                                            checkResult.push({
                                                sequence: checkingNo,
                                                proposalId: getProp.proposalId,
                                                requiredConsumption: getProp.data.amount,
                                                curConsumption: curConsumption,
                                                bonusAmount: bonusAmount
                                            });
                                        }
                                    }
                                )
                            );
                            break;
                        case "Reward":
                            // Consumption return proposal does not need to check consumption
                            if (getProp.type == constProposalType.PLAYER_CONSUMPTION_RETURN
                                || getProp.type == constProposalType.PARTNER_CONSUMPTION_RETURN) {
                                // return > bonus, and it's the nearest proposal
                                if (getProp.data.amount >= proposal.data.amount && countProposals == 0) {
                                    // Flag for force approve
                                    isTypeEApproval = true;
                                }
                            }
                            else {
                                // Only check rewards that require consumption
                                proms.push(
                                    getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, new Date(queryDateFrom), new Date(queryDateTo)).then(
                                        record => {
                                            let curConsumption = 0, bonusAmount = 0;
                                            let initBonusAmount = getProp.data.applyAmount + getProp.data.rewardAmount;

                                            if (record && record[0]) {
                                                curConsumption = record[0].validAmount;
                                                bonusAmount = record[0].bonusAmount;
                                            }

                                            checkResult.push({
                                                sequence: checkingNo,
                                                proposalId: getProp.proposalId,
                                                initBonusAmount: initBonusAmount,
                                                requiredConsumption: getProp.data.spendingAmount,
                                                curConsumption: curConsumption,
                                                bonusAmount: bonusAmount
                                            });

                                        }
                                    )
                                )
                            }

                            break;
                    }

                    // After push the action promise, set next dateTo to this checking proposal createTime
                    dateTo = queryDateFrom;

                    countProposals++;
                }

                Promise.all(proms).then(
                    () => {
                        let isClearCycle = false;
                        let validConsumptionAmount = 0, spendingAmount = 0, bonusAmount = 0, initBonusAmount = 0;

                        // Make sure the check result is in correct order
                        checkResult.sort((a, b) => b.sequence - a.sequence);

                        // Compare consumption and spendingAmount
                        for (let i = 0; i < checkResult.length; i++) {
                            // reset the amounts if consumption > spending for next cycle
                            if (isClearCycle) {
                                validConsumptionAmount = 0;
                                spendingAmount = 0;
                                bonusAmount = 0;
                                initBonusAmount = 0;
                            }

                            validConsumptionAmount += checkResult[i].curConsumption ? checkResult[i].curConsumption : 0;
                            spendingAmount += checkResult[i].requiredConsumption ? checkResult[i].requiredConsumption : 0;

                            if (checkResult[i].initBonusAmount) {
                                initBonusAmount += checkResult[i].initBonusAmount ? checkResult[i].initBonusAmount : 0;
                                bonusAmount += checkResult[i].bonusAmount ? checkResult[i].bonusAmount : 0;
                            }

                            // Check consumption for each cycle
                            // User lost all bonus amount
                            if (initBonusAmount != 0 && initBonusAmount + bonusAmount <= 0) {
                                isApprove = false;
                                isClearCycle = true;
                                checkMsg += "All reward lost at " + checkResult[i].proposalId + ": Initial Reward " + initBonusAmount + ", Deficit " + bonusAmount + "; ";
                                checkMsgChinese += "所有奖励输光与提案 " + checkResult[i].proposalId + " ：初始奖励额度 " + initBonusAmount + " ，盈余 " + bonusAmount + "; ";
                            }
                            else if (validConsumptionAmount + lostThreshold < spendingAmount) {
                                isApprove = false;
                                checkMsg += "Insufficient consumption at " + checkResult[i].proposalId + ": Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                                checkMsgChinese += "提案 " + checkResult[i].proposalId + " 投注额度不足：投注额 " + validConsumptionAmount + " ，需求投注额 " + spendingAmount + "; ";
                            }
                            else {
                                isApprove = true;
                                isClearCycle = true;
                            }
                        }

                        if ((validConsumptionAmount + lostThreshold) < spendingAmount || validConsumptionAmount == 0) {
                            isApprove = false;
                            repeatMsg = "Insufficient overall consumption: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                            repeatMsgChinese = "整体投注额不足：投注额 " + validConsumptionAmount + " ，需求投注额 " + spendingAmount + "; ";
                        }

                        if (proposal.data.amount >= platformObj.autoApproveWhenSingleBonusApplyLessThan) {
                            sendToAudit(proposal._id, proposal.createTime, "Denied: Amount exceed single bonus limit", "失败：超出自动审核单笔提款金额限制", null, transferAbnormalMessage, transferAbnormalMessageChinese);
                        } else if (todayBonusAmount >= platformObj.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
                            sendToAudit(proposal._id, proposal.createTime, "Denied: Amount exceed single day bonus limit", "失败：超出自动审核单日总提款金额限制", null, transferAbnormalMessage, transferAbnormalMessageChinese);
                        } else if (proposal.data.playerStatus !== constPlayerStatus.NORMAL) {
                            sendToAudit(proposal._id, proposal.createTime, "Denied: Player not allowed for auto proposal", "失败：此玩家不被允许自动审核", null, transferAbnormalMessage, transferAbnormalMessageChinese);
                        } else if (isApprove || isTypeEApproval) {
                            let approveRemark = "Success: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount;
                            let approveRemarkChinese = "成功：投注额 " + validConsumptionAmount + "，投注额需求 " + spendingAmount;
                            sendToApprove(proposal._id, proposal.createTime, approveRemark, approveRemarkChinese, checkMsg, transferAbnormalMessage, transferAbnormalMessageChinese);
                        }
                        else {
                            // Proposal not approved; Throw back to loop pool or deny this proposal
                            proposal.data.autoApproveRepeatCount =
                                proposal.data.autoApproveRepeatCount || proposal.data.autoApproveRepeatCount == 0 ?
                                    proposal.data.autoApproveRepeatCount - 1
                                    : repeatCount - 1;

                            if (proposal.data.autoApproveRepeatCount >= 0) {
                                let nextCheckTime = new Date();
                                nextCheckTime.setMinutes(nextCheckTime.getMinutes() + platformObj.autoApproveRepeatDelay);
                                return dbconfig.collection_proposal.findOneAndUpdate({
                                    _id: proposal._id,
                                    createTime: proposal.createTime
                                }, {
                                    'data.autoApproveRepeatCount': proposal.data.autoApproveRepeatCount,
                                    'data.nextCheckTime': nextCheckTime,
                                    'data.autoAuditRepeatMsg': repeatMsg,
                                    'data.autoAuditRepeatMsgChinese': repeatMsgChinese,
                                    'data.autoAuditCheckMsg': checkMsg,
                                    'data.autoAuditCheckMsgChinese': checkMsgChinese,
                                    'data.detail': transferAbnormalMessage ? transferAbnormalMessage : null,
                                    'data.detailChinese': transferAbnormalMessageChinese ? transferAbnormalMessageChinese : null
                                }).exec();
                            }
                            else {
                                // Check if player is VIP - Passed
                                if (proposal.data.proposalPlayerLevelValue > 0) {
                                    sendToReject(proposal._id, proposal.createTime, "Denied: Non-VIP: Exceed Auto Approval Repeat Limit", "失败：非VIP：超出自动审核回圈次数，流水不够", checkMsg, transferAbnormalMessage, transferAbnormalMessageChinese);
                                }
                                else {
                                    sendToReject(proposal._id, proposal.createTime, "Denied: VIP: Exceed Auto Approval Repeat Limit", "失败：VIP：超出自动审核回圈次数，流水不够", checkMsg, transferAbnormalMessage, transferAbnormalMessageChinese);
                                }
                            }
                        }
                    }
                );
            }


        },
        error => {
            // do nothing
        }
    )


}

function sendToApprove(proposalObjId, createTime, remark, remarkChinese, processRemark, transferAbnormalMessage, transferAbnormalMessageChinese) {
    processRemark = processRemark ? processRemark : "";

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
                                'data.remark': 'Auto Approval Approved: ' + remark,
                                'data.remarkChinese': '自动审核成功：' + remarkChinese,
                                'data.autoAuditCheckMsg': processRemark,
                                'data.detail': transferAbnormalMessage ? transferAbnormalMessage : null,
                                'data.detailChinese': transferAbnormalMessageChinese ? transferAbnormalMessageChinese : null
                            },
                            {new: true}
                        );
                    }
                );
            }
        }
    );
}

function sendToReject(proposalObjId, createTime, remark, remarkChinese, processRemark, transferAbnormalMessage, transferAbnormalMessageChinese) {
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
                                'data.remark': 'Auto Approval Denied: ' + remark,
                                'data.remarkChinese': '自动审核失败：' + remarkChinese,
                                'data.autoAuditCheckMsg': processRemark,
                                'data.detail': transferAbnormalMessage ? transferAbnormalMessage : null,
                                'data.detailChinese': transferAbnormalMessageChinese ? transferAbnormalMessageChinese : null
                            },
                            {new: true}
                        );
                    }
                );
            }
        }
    );
}

function sendToAudit(proposalObjId, createTime, remark, remarkChinese, processRemark, transferAbnormalMessage, transferAbnormalMessageChinese) {
    processRemark = processRemark ? processRemark : "";

    dbconfig.collection_proposal.findOne({_id: proposalObjId}).populate({
        path: "type",
        model: dbconfig.collection_proposalType
    }).lean().then(
        proposalData => {
            if (proposalData) {
                if (!proposalData.noSteps) {
                    dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposalObjId,
                        createTime: createTime
                    }, {
                        status: constProposalStatus.PENDING,
                        'data.autoAuditRemark': 'Auto Approval ' + remark,
                        'data.autoAuditRemarkChinese': '自动审核' + remarkChinese,
                        'data.autoAuditCheckMsg': processRemark,
                        'data.detail': transferAbnormalMessage ? transferAbnormalMessage : null,
                        'data.detailChinese': transferAbnormalMessageChinese ? transferAbnormalMessageChinese : null
                    }).then();
                }
                else {
                    return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, false, proposalData, true).then(
                        res => {
                            return dbconfig.collection_proposal.findOneAndUpdate(
                                {_id: proposalData._id, createTime: proposalData.createTime},
                                {
                                    noSteps: true,
                                    process: null,
                                    status: constProposalStatus.FAIL,
                                    'data.remark': 'Auto Approval Denied: ' + remark,
                                    'data.remarkChinese': '自动审核失败：' + remarkChinese,
                                    'data.autoAuditCheckMsg': processRemark,
                                    'data.detail': transferAbnormalMessage ? transferAbnormalMessage : null,
                                    'data.detailChinese': transferAbnormalMessageChinese ? transferAbnormalMessageChinese : null
                                },
                                {new: true}
                            );
                        })
                }
            }
        }
    );
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
                status: {$in: [constProposalStatus.PROCESSING, constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
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

function getPlayerConsumptionSummary(platformId, playerId, dateFrom, dateTo) {
    let matchObj = {
        platformId: ObjectId(platformId),
        createTime: {
            $gte: new Date(dateFrom),
            $lt: new Date(dateTo)
        },
        playerId: ObjectId(playerId)
    };

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

function findTransferAbnormality(transferLogs, proposals) {

    if (transferLogs && transferLogs.length <= 0) {
        return [];
    }

    let multipleTransferInWithoutOtherProposals = false;
    let validCreditMoreThanOneAfterTransferIn = false;
    let multipleTransferOutStreakExist = false;
    let lastTransferLogType = "";
    let lastTransferLogTime = "";
    let lastTransferLogProviderId = "";
    proposals = proposals ? proposals : [];

    let logsLength = transferLogs.length;
    for (let i = 0; i < logsLength; i++) {
        if (transferLogs[i].type === 'TransferIn') {
            auditTransferInLog(transferLogs[i]);
        } else {
            auditTransferOutLog(transferLogs[i]);
        }
        lastTransferLogType = transferLogs[i].type;
        lastTransferLogTime = transferLogs[i].createTime;
        lastTransferLogProviderId = transferLogs[i].providerId;
    }

    let abnormalities = [];

    if (multipleTransferInWithoutOtherProposals) {
        abnormalities.push({
            en: "There are multiple transfer in without any proposal in between.",
            ch: "连续两次或以上转入，期间无任何提案类型"
        });
    }

    if (validCreditMoreThanOneAfterTransferIn) {
        abnormalities.push({
            en: "There are more than 1 credit left in local after transfer in.",
            ch: "转入后检测本地余额是否低于1"
        });
    }

    if (multipleTransferOutStreakExist) {
        abnormalities.push({
            en: "There are multiple transfer out without any transfer in in between.",
            ch: "相同游戏厅连续转出两次或以上（期间无转入记录）"
        });
    }

    return abnormalities;

    function auditTransferInLog(log) {
        if (lastTransferLogType === "TransferIn") {
            if (!hasProposalWithinPeriod(lastTransferLogTime, log.createTime)) {
                multipleTransferInWithoutOtherProposals = true;
            }

            // if (log.apiRes.validCredit >= 1) {
            //     validCreditMoreThanOneAfterTransferIn = true;
            // }
        }

        function hasProposalWithinPeriod(startTime, endTime) {
            let relevantProposalMainType = ["TopUp", "Reward"];
            for (let i = 0; i < proposals.length; i++) {
                if (proposals.createTime > startTime && proposals.createTime < endTime && relevantProposalMainType.includes(log.mainType)) {
                    return true;
                }
            }
            return false;
        }
    }

    function auditTransferOutLog(log) {
        if (lastTransferLogType === "TransferOut" && log.providerId === lastTransferLogProviderId) {
            multipleTransferOutStreakExist = true;
        }
    }
}

module.exports = dbAutoProposal;