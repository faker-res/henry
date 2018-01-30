'use strict';

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constSystemParam = require('./../const/constSystemParam');
const constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus');

const dbconfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');

const dbRewardTaskGroup = require("./../db_modules/dbRewardTaskGroup");

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

    processAutoProposals: (proposals, platformObj, useProviderGroup) => {
        if (proposals && proposals.length > 0) {
            return Promise.all(proposals.map(proposal => {
                // System log for selected proposals to auto audit
                console.log('Processing auto audit proposals: ', proposal.proposalId);

                return (platformObj.useProviderGroup || useProviderGroup)  ? checkRewardTaskGroup(proposal, platformObj) : checkProposalConsumption(proposal, platformObj)
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
 * Audit reward task group auto audit proposal
 */
function checkRewardTaskGroup(proposal, platformObj) {
    let todayBonusAmount = 0;
    let bFirstWithdraw = false;
    let initialAmount = 0, totalTopUpAmount = 0, totalBonusAmount = 0;
    let dLastWithdraw, initialTransferTime;
    let abnormalMessage = "";
    let abnormalMessageChinese = "";
    let checkMsg = "", checkMsgChinese = "";
    let bTransferAbnormal = false;

    return getBonusRecordsOfPlayer(proposal.data.playerObjId, proposal.type).then(
        bonusRecord => {
            todayBonusAmount = bonusRecord && bonusRecord[0] && bonusRecord[0].amount ? bonusRecord[0].amount : 0;

            return getPlayerLastProposalDateOfType(proposal.data.playerObjId, proposal.type);
        }
    ).then(
        lastWithdrawDate => {
            // settleTime of last withdraw proposal
            bFirstWithdraw = !lastWithdrawDate;

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

            if (lastWithdrawDate) {
                dLastWithdraw = lastWithdrawDate;
                transferLogQuery.createTime["$gt"] = lastWithdrawDate;
                creditLogQuery.operationTime["$gt"] = lastWithdrawDate;
            }

            let RTGPromise = dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId({_id: proposal.data.playerObjId});
            let transferLogsWithinPeriodPromise = dbconfig.collection_playerCreditTransferLog.find(transferLogQuery).sort({createTime: 1}).lean();
            let playerInfoPromise = dbconfig.collection_players.findOne(playerQuery, {similarPlayers: 0}).lean();
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

            let promises = [RTGPromise, transferLogsWithinPeriodPromise, playerInfoPromise, proposalsPromise, creditLogPromise];
            return Promise.all(promises);
        }
    ).then(
        data => {
            // Check abnormal transfer in and out amount
            if (data && data[0] && data[2]) {
                let transferInRec = data[0].filter(rec => rec.type == "TransferIn");

                if (transferInRec && transferInRec[0]) {
                    initialAmount = transferInRec[0].amount;
                    initialTransferTime = transferInRec[0].createTime;
                }

                let transferLogs = data[0];
                let creditChangeLogs = data[2];

                return findTransferAbnormality(transferLogs, creditChangeLogs, platformObj, proposal.data.playerObjId).then(
                    transferAbnormalities => {
                        if (transferAbnormalities) {
                            for (let i = 0; i < transferAbnormalities.length; i++) {
                                abnormalMessage += transferAbnormalities[i].en + "; ";
                                abnormalMessageChinese += transferAbnormalities[i].ch + "; ";
                                bTransferAbnormal = true;
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
            let bPendingPaymentInfo = false;
            let bUpdatePaymentInfo = false;

            if (data && data[3]) {
                allProposals = data[3];
                bPendingPaymentInfo = hasPendingPaymentInfoChanges(allProposals);
                bUpdatePaymentInfo = isFirstWithdrawalAfterPaymentInfoUpdated(allProposals);
            }

            if (data && data[2]) {
                playerData = data[2];
                bNoBonusPermission = !playerData.permission.applyBonus;
            }

            let isApprove = true, canApprove = true;

            if (data && data[0] && data[0].length > 0) {
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
            if (proposal.data.amount >= platformObj.autoApproveWhenSingleBonusApplyLessThan) {
                checkMsg += " Denied: Single limit;";
                checkMsgChinese += " 失败：单限;";
                canApprove = false;
            }
            if (todayBonusAmount >= platformObj.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
                checkMsg += " Denied: Daily limit;";
                checkMsgChinese += " 失败：日限;";
                canApprove = false;
            }
            if (proposal.data.playerStatus == constPlayerStatus.BAN_PLAYER_BONUS || bNoBonusPermission) {
                checkMsg += " Denied: Not allowed;";
                checkMsgChinese += " 失败：禁提;";
                canApprove = false;
            }

            if (bFirstWithdraw) {
                checkMsg += " Denied: First withdrawal;";
                checkMsgChinese += " 失败：首提;";
                canApprove = false;
            }

            if (bTransferAbnormal) {
                checkMsg += ' Denied: Abnormal Transfer;';
                checkMsgChinese += ' 失败：转账异常;';
                canApprove = false;
            }

            if (bPendingPaymentInfo) {
                checkMsg += ' Denied: Rebank;';
                checkMsgChinese += ' 失败：银改;';
                canApprove = false;
            }

            if (bUpdatePaymentInfo) {
                checkMsg += ' Denied: Bank Info Changed;';
                checkMsgChinese += ' 失败：银行资料刚改;';
                canApprove = false;
            }

            if (totalBonusAmount > 0 && proposal.data.amount >= platformObj.autoApproveProfitTimesMinAmount
                && (totalBonusAmount / (initialAmount + totalTopUpAmount) >= platformObj.autoApproveProfitTimes)) {
                checkMsg += ' Denied: Max profit times;';
                checkMsgChinese += ' 失败：盈利十倍;';
                canApprove = false;
            }

            // Check consumption approved or not
            if (isApprove && canApprove) {
                sendToApprove(proposal._id);
            } else {
                sendToAudit(proposal._id, proposal.createTime, checkMsg, checkMsgChinese, null, abnormalMessage, abnormalMessageChinese);
            }
        }
    )
}

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
    let bFirstWithdraw = false;
    let initialAmount = 0, totalTopUpAmount = 0, totalBonusAmount = 0;
    let dLastWithdraw, initialTransferTime;
    let abnormalMessage = "";
    let abnormalMessageChinese = "";
    let bTransferAbnormal = false;

    return getBonusRecordsOfPlayer(proposal.data.playerObjId, proposal.type).then(
        bonusRecord => {
            todayBonusAmount = bonusRecord && bonusRecord[0] && bonusRecord[0].amount ? bonusRecord[0].amount : 0;

            return getPlayerLastProposalDateOfType(proposal.data.playerObjId, proposal.type);
        }
    ).then(
        lastWithdrawDate => {
            // settleTime of last withdraw proposal
            bFirstWithdraw = !lastWithdrawDate;

            let proposalQuery = {
                'data.platformId': {$in: [ObjectId(proposal.data.platformId), String(proposal.data.platformId)]},
                'data.playerObjId': {$in: [ObjectId(proposal.data.playerObjId), String(proposal.data.playerObjId)]},
                createTime: {$lt: proposal.createTime},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                mainType: {$in: ["TopUp", "Reward"]}
            };

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

            if (lastWithdrawDate) {
                dLastWithdraw = lastWithdrawDate;
                proposalQuery.createTime["$gt"] = lastWithdrawDate;
                transferLogQuery.createTime["$gt"] = lastWithdrawDate;
                allProposalQuery.createTime["$gt"] = lastWithdrawDate;
                creditLogQuery.operationTime["$gt"] = lastWithdrawDate;
            }

            let proposalsWithinPeriodPromise = dbconfig.collection_proposal.find(proposalQuery).populate(
                {path: "type", model: dbconfig.collection_proposalType}
            ).sort({settleTime: -1, createTime: -1}).lean();
            let transferLogsWithinPeriodPromise = dbconfig.collection_playerCreditTransferLog.find(transferLogQuery).sort({createTime: 1}).lean();
            let playerInfoPromise = dbconfig.collection_players.findOne(playerQuery, {similarPlayers: 0}).lean();
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

            let promises = [proposalsWithinPeriodPromise, transferLogsWithinPeriodPromise, playerInfoPromise, proposalsPromise, creditLogPromise];
            return Promise.all(promises);
        }
    ).then(
        data => {
            if (data && data[1] && data[4]) {
                let transferInRec = data[1].filter(rec => rec.type == "TransferIn");

                if (transferInRec && transferInRec[0]) {
                    initialAmount = transferInRec[0].amount;
                    initialTransferTime = transferInRec[0].createTime;
                }

                let transferLogs = data[1];
                let creditChangeLogs = data[4];
                return findTransferAbnormality(transferLogs, creditChangeLogs, platformObj, proposal.data.playerObjId).then(
                    transferAbnormalities => {
                        if (transferAbnormalities) {
                            for (let i = 0; i < transferAbnormalities.length; i++) {
                                abnormalMessage += transferAbnormalities[i].en + "; ";
                                abnormalMessageChinese += transferAbnormalities[i].ch + "; ";
                                bTransferAbnormal = true;
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
            let proposals, allProposals, playerData;
            let bNoBonusPermission = false;
            let bPendingPaymentInfo = false;

            if (data && data[0]) {
                proposals = data[0];
            }

            if (data && data[3]) {
                allProposals = data[3];
                bPendingPaymentInfo = hasPendingPaymentInfoChanges(allProposals);
            }

            if (data && data[2]) {
                playerData = data[2];
                bNoBonusPermission = !playerData.permission.applyBonus;
            }

            let isApprove = true, proms = [], repeatMsg = "", repeatMsgChinese = "";
            let lostThreshold = platformObj.autoApproveLostThreshold ? platformObj.autoApproveLostThreshold : 0;
            let consumptionOffset = platformObj.autoApproveConsumptionOffset ? platformObj.autoApproveConsumptionOffset : 0;
            let countProposals = 0;
            let isTypeEApproval = false, isCheckedInitialAmount = false;
            let dateTo = proposal.settleTime ? proposal.settleTime : proposal.createTime;

            let checkResult = [], checkMsg = "", checkMsgChinese = "";
            let devCheckMsg = "";

            if (proposals && !proposals.length && !bFirstWithdraw && !bNoBonusPermission && !bTransferAbnormal) {
                // There is no other proposal between this withdrawal and last withdrawal
                proms.push(
                    getPlayerConsumptionSummary(proposal.data.platformId, proposal.data.playerObjId, new Date(dLastWithdraw), new Date(dateTo)).then(
                        record => {
                            let curConsumption = 0, bonusAmount = 0, initBonusAmount = 0;

                            if (record && record[0]) {
                                curConsumption = record[0].validAmount;
                                bonusAmount = record[0].bonusAmount;
                            }

                            checkResult.push({
                                sequence: 0,
                                proposalId: null,
                                initBonusAmount: initBonusAmount,
                                requiredConsumption: 0,
                                curConsumption: curConsumption,
                                bonusAmount: bonusAmount
                            });

                        }
                    )
                );
            }
            else {
                try {
                    while (proposals && proposals.length > 0) {
                        // FIFO dequeue from nearest date proposal
                        let getProp = proposals.shift();

                        // Set query date from checking proposal -> current proposal
                        // Use settleTime instead of createTime for more accurate consumption calculation
                        let queryDateFrom = new Date(getProp.settleTime ? getProp.settleTime : getProp.createTime);
                        let queryDateTo = new Date(dateTo);

                        let checkingNo = countProposals;
                        switch (getProp.mainType) {
                            case "TopUp":
                                // Get real amount left before top up, if there's any top up before transfer in after last withdrawal
                                if (!isCheckedInitialAmount && initialTransferTime && initialTransferTime.getTime() > getProp.settleTime.getTime() && Number(initialAmount) >= Number(getProp.data.amount)) {
                                    initialAmount -= getProp.data.amount;
                                    isCheckedInitialAmount = true;
                                }

                                proms.push(
                                    getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, queryDateFrom, queryDateTo).then(
                                        record => {
                                            let curConsumption = 0, bonusAmount = 0;
                                            if (record && record[0]) {
                                                curConsumption = record[0].validAmount;
                                                bonusAmount = record[0].bonusAmount;
                                            }

                                            checkResult.push({
                                                sequence: checkingNo,
                                                proposalId: getProp.proposalId,
                                                initBonusAmount: getProp.data.amount,
                                                requiredConsumption: getProp.data.amount,
                                                curConsumption: curConsumption,
                                                bonusAmount: bonusAmount,
                                                settleTime: new Date(queryDateFrom),
                                                isTopUp: true
                                            });
                                        }
                                    )
                                );
                                break;
                            case "Reward":
                                // Get list of restricted providers
                                let providerArr;

                                if (getProp.data.providers && getProp.data.providers.length > 0) {
                                    providerArr = getProp.data.providers.map(e => ObjectId(e));
                                }

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
                                        getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, new Date(queryDateFrom), new Date(queryDateTo), providerArr).then(
                                            record => {
                                                let curConsumption = 0, bonusAmount = 0;
                                                let initBonusAmount = 0;
                                                let isIncludePreviousConsumption = false;
                                                let isTopUpPromo = false;
                                                let spendingAmount = getProp.data.spendingAmount ? getProp.data.spendingAmount : getProp.data.requiredUnlockAmount;

                                                if (getProp.type.executionType == "executePlayerTopUpReturn" || getProp.type.executionType == "executeFirstTopUp") {
                                                    initBonusAmount = getProp.data.rewardAmount;
                                                    isIncludePreviousConsumption = true;
                                                } else {
                                                    initBonusAmount = getProp.data.rewardAmount ? getProp.data.rewardAmount : getProp.data.initAmount;
                                                }

                                                // Handling for top up promo reward
                                                // Flag to include reward consumption into last top up
                                                if (getProp.type.executionType == "executePlayerTopUpPromo" || getProp.type.executionType == "executePlatformTransactionReward") {
                                                    isTopUpPromo = true;
                                                }

                                                if (record && record[0]) {
                                                    curConsumption = record[0].validAmount;
                                                    bonusAmount = record[0].bonusAmount;
                                                }

                                                // Skip applyAmount if reward is consumption return
                                                let applyAmount = 0;

                                                if (getProp.data.applyAmount) {
                                                    applyAmount = getProp.data.returnDetail ? 0 : getProp.data.applyAmount;

                                                    // Special Handling - Old EU Migration XI MA proposal
                                                    if (getProp.type.executionType == "executePlayerConsumptionReturn" && getProp.from_old_system) {
                                                        applyAmount = 0;
                                                    }
                                                }

                                                checkResult.push({
                                                    sequence: checkingNo,
                                                    proposalId: getProp.proposalId,
                                                    initBonusAmount: initBonusAmount,
                                                    requiredConsumption: spendingAmount - applyAmount,
                                                    curConsumption: curConsumption,
                                                    bonusAmount: bonusAmount,
                                                    settleTime: new Date(queryDateFrom),
                                                    isIncludePreviousConsumption: isIncludePreviousConsumption,
                                                    isTopUpPromo: isTopUpPromo
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
                }
                catch (ex) {
                    devCheckMsg += "ERROR: " + ex.toString() + "; ";
                }
            }

            Promise.all(proms).then(
                () => {
                    let isClearCycle = false;
                    let validConsumptionAmount = 0, spendingAmount = 0, bonusAmount = 0, initBonusAmount = 0;
                    let totalConsumptionAmount = 0, totalSpendingAmount = 0;
                    let lastTopUpResult = {};
                    let currentProposal = null;

                    // Make sure the check result is in correct order
                    checkResult.sort((a, b) => a.settleTime.getTime() - b.settleTime.getTime());

                    // Compare consumption and spendingAmount
                    try {
                        for (let i = 0; i < checkResult.length; i++) {
                            // reset the amounts if consumption > spending or lost all credit in previous cycle
                            // do not reset if this reward require previous top up's consumption
                            if (isClearCycle) {
                                validConsumptionAmount = 0;
                                spendingAmount = 0;
                                bonusAmount = 0;
                                initBonusAmount = 0;
                                totalBonusAmount = 0;
                                totalTopUpAmount = 0;
                            }

                            currentProposal = checkResult[i].proposalId;

                            validConsumptionAmount += checkResult[i].curConsumption ? checkResult[i].curConsumption : 0;
                            spendingAmount += checkResult[i].requiredConsumption ? checkResult[i].requiredConsumption : 0;

                            totalConsumptionAmount += checkResult[i].curConsumption ? checkResult[i].curConsumption : 0;
                            totalSpendingAmount += checkResult[i].requiredConsumption ? checkResult[i].requiredConsumption : 0;

                            if (checkResult[i].initBonusAmount) {
                                initBonusAmount += checkResult[i].initBonusAmount ? checkResult[i].initBonusAmount : 0;
                                bonusAmount += checkResult[i].bonusAmount ? checkResult[i].bonusAmount : 0;
                            }

                            // include previous top up record result if required
                            if (checkResult[i].isIncludePreviousConsumption) {
                                currentProposal = lastTopUpResult.proposalId ? lastTopUpResult.proposalId : currentProposal;

                                // Include consumptions from previous top up if it is cleared before reward
                                if (lastTopUpResult && lastTopUpResult.isCleared) {
                                    validConsumptionAmount += lastTopUpResult.curConsumption ? lastTopUpResult.curConsumption : 0;
                                    spendingAmount += lastTopUpResult.requiredConsumption ? lastTopUpResult.requiredConsumption : 0;
                                    initBonusAmount += lastTopUpResult.initBonusAmount ? lastTopUpResult.initBonusAmount : 0;
                                    bonusAmount += lastTopUpResult.bonusAmount ? lastTopUpResult.bonusAmount : 0;
                                }
                            }

                            // Include top up promo reward to previous last top up consumptions
                            if (lastTopUpResult && checkResult[i].isTopUpPromo) {
                                lastTopUpResult.curConsumption += checkResult[i].curConsumption;
                                lastTopUpResult.requiredConsumption += checkResult[i].requiredConsumption;
                                lastTopUpResult.initBonusAmount += checkResult[i].initBonusAmount;
                                lastTopUpResult.bonusAmount += checkResult[i].bonusAmount;
                                lastTopUpResult.isCleared = isClearCycle;
                            }

                            // Check consumption for each cycle
                            if (initBonusAmount && initBonusAmount != 0 && initBonusAmount + bonusAmount <= lostThreshold) {
                                // User lost all bonus amount
                                isApprove = true;
                                isClearCycle = true;
                                checkMsg = "";
                                checkMsgChinese = "";
                            }
                            else if (validConsumptionAmount + consumptionOffset < spendingAmount) {
                                isApprove = false;
                                isClearCycle = false;

                                if (checkMsg == "") {
                                    checkMsg += "LOW Bet from " + currentProposal + ": Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                                    checkMsgChinese += "提案 " + currentProposal + "：流水 " + validConsumptionAmount + " ，所需流水 " + spendingAmount + "; ";
                                }
                            }
                            else {
                                // Consumption has fulfilled requirement during this cycle
                                // reset from current cycle
                                isApprove = true;
                                isClearCycle = true;
                                checkMsg = "";
                                checkMsgChinese = "";
                            }

                            // Sum up bonus amount for overall profit calculation
                            totalBonusAmount += checkResult[i].bonusAmount;

                            // save current checkResult if it is top up
                            if (checkResult[i].isTopUp) {
                                totalTopUpAmount += checkResult[i].initBonusAmount;
                                lastTopUpResult = {
                                    proposalId: checkResult[i].proposalId,
                                    curConsumption: checkResult[i].curConsumption,
                                    requiredConsumption: checkResult[i].requiredConsumption,
                                    initBonusAmount: checkResult[i].initBonusAmount,
                                    bonusAmount: checkResult[i].bonusAmount,
                                    isCleared: isClearCycle
                                }
                            }

                            // If there is lastTopUpResult but cleared before reaching related reward, set the flag to true
                            // to get back missing consumption requirement
                            if (isClearCycle && lastTopUpResult) {
                                lastTopUpResult.isCleared = isClearCycle;
                            }

                            // dev log for debugging auto audit
                            devCheckMsg += currentProposal + ": " + "Bonus: " + bonusAmount + "/" + initBonusAmount + ", Consumption: " + validConsumptionAmount + "/" + spendingAmount
                                + ", isClearCycle:" + isClearCycle + "; ";
                        }
                    }
                    catch (ex) {
                        devCheckMsg += "ERROR (2): " + ex.toString() + "; ";
                    }

                    if (proposal.data.ximaWithdrawUsed && proposal.data.amount && proposal.data.amount <= proposal.data.ximaWithdrawUsed) {
                        isApprove = true;
                        repeatMsg = "Withdrawal amount is within the ximaWithdraw amount: ximaWithdraw " + proposal.data.ximaWithdrawUsed;
                        repeatMsgChinese = "提款额在洗码提款额内：洗码提款额" + proposal.data.ximaWithdrawUsed;
                        checkMsg += "Withdrawal amount is within the ximaWithdraw amount: ximaWithdraw " + proposal.data.ximaWithdrawUsed;
                        checkMsgChinese += "提款额在洗码提款额内：洗码提款额" + proposal.data.ximaWithdrawUsed;
                    }
                    else if ((validConsumptionAmount + lostThreshold) < spendingAmount) {
                        isApprove = false;
                        repeatMsg = "Insufficient overall consumption: Consumption " + totalConsumptionAmount + ", Required Bet " + totalSpendingAmount + "; ";
                        repeatMsgChinese = "总投注额不足：流水 " + totalConsumptionAmount + " ，所需流水 " + totalSpendingAmount + "; ";
                        checkMsg += "Insufficient consumption: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                        checkMsgChinese += "投注额不足：投注额 " + validConsumptionAmount + " ，需求投注额 " + spendingAmount + "; ";
                    }
                    else {
                        repeatMsg += "Sufficient overall consumption: Consumption " + totalConsumptionAmount + ", Required Bet " + totalSpendingAmount + "; ";
                        repeatMsgChinese += "总投注额满足：投注额 " + totalConsumptionAmount + " ，需求投注额 " + totalSpendingAmount + "; ";
                        checkMsg = "Sufficient overall consumption: Consumption " + totalConsumptionAmount + ", Required Bet " + totalSpendingAmount + "; ";
                        checkMsgChinese = "总投注额满足：投注额 " + totalConsumptionAmount + " ，需求投注额 " + totalSpendingAmount + "; ";
                    }

                    let canApprove = true;
                    // Consumption reached, check for other conditions
                    if (proposal.data.amount >= platformObj.autoApproveWhenSingleBonusApplyLessThan) {
                        checkMsg += " Denied: Single limit;";
                        checkMsgChinese += " 失败：单限;";
                        canApprove = false;
                    }
                    if (todayBonusAmount >= platformObj.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
                        checkMsg += " Denied: Daily limit;";
                        checkMsgChinese += " 失败：日限;";
                        canApprove = false;
                    }
                    if (proposal.data.playerStatus == constPlayerStatus.BAN_PLAYER_BONUS || bNoBonusPermission) {
                        checkMsg += " Denied: Not allowed;";
                        checkMsgChinese += " 失败：禁提;";
                        canApprove = false;
                    }

                    if (bFirstWithdraw) {
                        checkMsg += " Denied: First withdrawal;";
                        checkMsgChinese += " 失败：首提;";
                        canApprove = false;
                    }

                    if (bTransferAbnormal) {
                        checkMsg += ' Denied: Abnormal Transfer;';
                        checkMsgChinese += ' 失败：转账异常;';
                        canApprove = false;
                    }

                    if (bPendingPaymentInfo) {
                        checkMsg += ' Denied: Rebank;';
                        checkMsgChinese += ' 失败：银改;';
                        canApprove = false;
                    }
                    if (totalBonusAmount > 0 && proposal.data.amount >= platformObj.autoApproveProfitTimesMinAmount
                        && (totalBonusAmount / (initialAmount + totalTopUpAmount) >= platformObj.autoApproveProfitTimes)) {
                        checkMsg += ' Denied: Max profit times;';
                        checkMsgChinese += ' 失败：盈利十倍;';
                        canApprove = false;
                    }

                    // Check consumption approved or not
                    if (isApprove || isTypeEApproval) {
                        if (!canApprove) {
                            sendToAudit(proposal._id, proposal.createTime, checkMsg, checkMsgChinese, null, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg);
                        } else {
                            let approveRemark = "Success: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount;
                            let approveRemarkChinese = "成功：流水 " + validConsumptionAmount + "，所需流水 " + spendingAmount;
                            sendToApprove(proposal._id, proposal.createTime, approveRemark, approveRemarkChinese, checkMsg, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg);
                        }
                    } else {
                        // Consumption not reached; Throw back to loop pool or deny this proposal
                        proposal.data.autoApproveRepeatCount =
                            proposal.data.autoApproveRepeatCount || proposal.data.autoApproveRepeatCount == 0 ?
                                proposal.data.autoApproveRepeatCount - 1
                                : repeatCount - 1;

                        let updObj = {
                            'data.autoApproveRepeatCount': proposal.data.autoApproveRepeatCount,
                            'data.autoAuditTime': Date.now()
                        };

                        if (repeatMsg.length > 0 || repeatMsgChinese.length > 0) {
                            updObj['data.autoAuditRepeatMsg'] = repeatMsg;
                            updObj['data.autoAuditRepeatMsgChinese'] = repeatMsgChinese;
                        }

                        if (checkMsg.length > 0 || checkMsgChinese.length > 0) {
                            updObj['data.autoAuditCheckMsg'] = checkMsg;
                            updObj['data.autoAuditCheckMsgChinese'] = checkMsgChinese;
                        }

                        if (abnormalMessage.length > 0 || abnormalMessageChinese.length > 0) {
                            updObj['data.detail'] = abnormalMessage;
                            updObj['data.detailChinese'] = abnormalMessageChinese;
                        }

                        if (proposal.data.autoApproveRepeatCount > 0) {
                            let nextCheckTime = new Date();
                            nextCheckTime.setMinutes(nextCheckTime.getMinutes() + platformObj.autoApproveRepeatDelay);
                            updObj['data.nextCheckTime'] = nextCheckTime;
                        } else {
                            updObj['data.nextCheckTime'] = undefined;

                            // Check if player is VIP - Passed
                            if (proposal.data.proposalPlayerLevelValue == 0) {
                                //sendToReject(proposal._id, proposal.createTime, "Denied: Non-VIP: Exceed Auto Approval Repeat Limit", "失败：非VIP：超出回圈次数", checkMsg, abnormalMessage, abnormalMessageChinese);
                                sendToAudit(proposal._id, proposal.createTime, checkMsg, checkMsgChinese, null, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg);
                            } else {
                                //sendToReject(proposal._id, proposal.createTime, "Denied: VIP: Exceed Auto Approval Repeat Limit", "失败：VIP：超出回圈次数", checkMsg, abnormalMessage, abnormalMessageChinese);
                                sendToAudit(proposal._id, proposal.createTime, checkMsg, checkMsgChinese, null, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg);
                            }
                        }

                        return dbconfig.collection_proposal.findOneAndUpdate({
                            _id: proposal._id,
                            createTime: proposal.createTime
                        }, updObj).exec();
                    }
                }
            );
        },
        error => {
            // do nothing
        }
    )
}

function sendToApprove(proposalObjId, createTime, remark, remarkChinese, processRemark, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg) {
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
                                'data.autoAuditTime': Date.now(),
                                'data.autoAuditRemark': remark,
                                'data.autoAuditRemarkChinese': remarkChinese,
                                'data.autoAuditCheckMsg': processRemark,
                                'data.detail': abnormalMessage ? abnormalMessage : "",
                                'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : "",
                                'data.autoAuditRepeatMsg': repeatMsg,
                                'data.autoAuditRepeatMsgChinese': repeatMsgChinese,
                                'data.devCheckMsg': devCheckMsg
                            },
                            {new: true}
                        );
                    }
                );
            }
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

function sendToAudit(proposalObjId, createTime, remark, remarkChinese, processRemark, abnormalMessage, abnormalMessageChinese, repeatMsg, repeatMsgChinese, devCheckMsg) {
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
                        'data.autoAuditTime': Date.now(),
                        'data.autoAuditRemark': remark,
                        'data.autoAuditRemarkChinese': remarkChinese,
                        'data.autoAuditCheckMsg': processRemark,
                        'data.detail': abnormalMessage ? abnormalMessage : "",
                        'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : "",
                        'data.autoAuditRepeatMsg': repeatMsg,
                        'data.autoAuditRepeatMsgChinese': repeatMsgChinese,
                        'data.devCheckMsg': devCheckMsg
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
                                    'data.autoAuditTime': Date.now(),
                                    'data.autoAuditRemark': remark,
                                    'data.autoAuditRemarkChinese': remarkChinese,
                                    'data.autoAuditCheckMsg': processRemark,
                                    'data.detail': abnormalMessage ? abnormalMessage : "",
                                    'data.detailChinese': abnormalMessageChinese ? abnormalMessageChinese : ""
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

    let logsLength = transferLogs.length;
    for (let i = 0; i < logsLength; i++) {
        if (transferLogs[i].type === 'TransferIn') {
            auditTransferInLog(transferLogs[i]);
            lastTransferInLogTime = transferLogs[i].createTime;

            // bonus <> transfer amount check
            completeCycle = false;
            inAmt = transferLogs[i].amount;
            inTime = transferLogs[i].createTime;
        } else {
            auditTransferOutLog(transferLogs[i]);

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
                                en: "Abnormal Bonus (ID: " + transferOutId + ")",
                                ch: "异常盈利 (ID: " + transferOutId + ")"
                            });
                        }
                    }
                )
            );
            completeCycle = !completeCycle;
        }
    }

    let abnormalities = [];

    if (multipleTransferInWithoutOtherCreditInput) {
        abnormalities.push({
            en: "Multi TransferIn (ID: " + multipleTransferInId + ")",
            ch: "连续转入 (ID: " + multipleTransferInId + ")"
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
            en: "Multi TransferOut (ID: " + multipleTransferOutId + ")",
            ch: "连续转出 (ID: " + multipleTransferOutId + ")"
        });
    }

    // DEBUG LOG
    console.log('abnormalities:', abnormalities);

    return Promise.all(promBonusCheck).then(
        res => abnormalities
    );

    function auditTransferInLog(log) {
        if (lastTransferLogType === "TransferIn") {
            if (!hasTopUpOrRewardWithinPeriod(lastTransferInLogTime, log.createTime)) {
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
                if (creditChangeLogs[i].operationTime > startTime && creditChangeLogs[i].operationTime < endTime && creditChangeLogs[i].amount >= 0.02) {
                    return true;
                }
            }
            return false;
        }
    }

    function auditTransferOutLog(log) {
        if (lastTransferLogType === "TransferOut" && log.providerId === lastTransferLogProviderId) {
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
        if (proposal.type.name == constProposalType.PLAYER_BONUS) {
            return false;
        }
    }
    return false;
}

module.exports = dbAutoProposal;