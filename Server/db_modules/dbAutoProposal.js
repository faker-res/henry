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

            // // 1. Check single withdrawal limit - passed
            // let checkProps1 = checkSingleWithdrawalLimit(proposals, platformObj);
            //
            // // 2. Check single day withdrawal limit
            // return checkSingleDayWithdrawalLimit(checkProps1, platformObj, proposalTypeObjId).then(
            //     proposals => {
            //         if (proposals && proposals.length > 0) {
            //             let prom = [];
            //             proposals.map(proposal => {
            //                 // 3. Check player status
            //                 if (proposal.data.playerStatus !== constPlayerStatus.NORMAL || proposal.data.playerStatus !== constPlayerStatus.ATTENTION) {
            //                     sendToAudit(proposal._id, proposal.createTime, "Denied: Player not allowed for auto proposal");
            //                 } else {
            //                     // 4. Check player last bonus
            //                     prom.push(
            //                         getPlayerLastProposalDateOfType(proposal.data.playerObjId, proposal.type).then(
            //                             lastWithdrawDate => {
            //                                 if (lastWithdrawDate) {
            //                                     // Player withdrew before
            //                                     let repeatCount = platformObj.autoApproveRepeatCount;
            //                                     checkPreviousProposals(proposal, lastWithdrawDate, repeatCount, platformObj);
            //                                 } else {
            //                                     // Player first time withdraw
            //                                     sendToAudit(proposal._id, proposal.createTime, "Denied: Player's first withdrawal");
            //                                 }
            //                             }
            //                         )
            //                     );
            //                 }
            //             });
            //             return Promise.all(prom).then(
            //                 data => {
            //                     return proposals;
            //                 }
            //             );
            //         }
            //         return proposals;
            //     }
            // )
        }
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
                return dbconfig.collection_proposal.find({
                    'data.platformId': ObjectId(proposal.data.platformId),
                    'data.playerObjId': ObjectId(proposal.data.playerObjId),
                    createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                    mainType: {$in: ["TopUp", "Reward"]}
                }).sort({createTime: -1}).lean();
            }
            else {
                sendToAudit(proposal._id, proposal.createTime, "Denied: Player's first withdrawal");
            }
        }
    ).then(
        // Get player consumption first before other checkings
        proposals => {
            let isApprove = true, proms = [], repeatMsg = "";
            let lostThreshold = platformObj.autoApproveLostThreshold ? platformObj.autoApproveLostThreshold : 0;
            let countProposals = 0;
            let isTypeEApproval = false;
            let dateTo = proposal.createTime;

            let checkResult = [], checkMsg = "";

            if (!proposals) {
                // There is no other withdrawal between this withdrawal and last withdrawal
                let approveRemark = "Success: No proposals between this and last withdrawal";
                sendToAudit(proposal._id, proposal.createTime, approveRemark, checkMsg);
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

                            //if (validConsumptionAmount != 0) {
                                // Check consumption for each cycle
                                // User lost all bonus amount
                                if (initBonusAmount != 0 && initBonusAmount + bonusAmount <= 0) {
                                    isApprove = false;
                                    isClearCycle = true;
                                    checkMsg += "All reward lost at " + checkResult[i].proposalId + ": Initial Reward " + initBonusAmount + ", Deficit " + bonusAmount + "; ";
                                }
                                else if (validConsumptionAmount + lostThreshold < spendingAmount) {
                                    isApprove = false;
                                    checkMsg += "Insufficient consumption at " + checkResult[i].proposalId + ": Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                                }
                                else {
                                    // Consumption has fulfilled requirement during this cycle
                                    // reset from current cycle
                                    isApprove = true;
                                    isClearCycle = true;
                                }
                            // }
                            // else {
                            //     // No consumption at this cycle, not approved
                            //     isApprove = false;
                            //     checkMsg += "No consumption for proposal " + checkResult[i].proposalId + ": Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                            // }
                        }

                        // Final check on consumption sum
                        // Check consumption for each cycle
                        if ((validConsumptionAmount + lostThreshold) < spendingAmount || validConsumptionAmount == 0) {
                            isApprove = false;
                            repeatMsg = "Insufficient overall consumption: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
                        }

                        if (proposal.data.amount >= platformObj.autoApproveWhenSingleBonusApplyLessThan) {
                            sendToAudit(proposal._id, proposal.createTime, "Denied: Amount exceed single bonus limit");
                        } else if (todayBonusAmount >= platformObj.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
                            sendToAudit(proposal._id, proposal.createTime, "Denied: Amount exceed single day bonus limit");
                        } else if (proposal.data.playerStatus !== constPlayerStatus.NORMAL) {
                            sendToAudit(proposal._id, proposal.createTime, "Denied: Player not allowed for auto proposal");
                        } else if (isApprove || isTypeEApproval) {
                            // Proposal approved - DISABLED FOR CSTEST
                            // dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.SUCCESS, proposal.data.bonusId);
                            let approveRemark = "Success: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount;
                            sendToApprove(proposal._id, proposal.createTime, approveRemark, checkMsg);
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
                                    'data.autoAuditCheckMsg': checkMsg
                                }).exec();
                            }
                            else {
                                // Check if player is VIP - Passed
                                if (proposal.data.proposalPlayerLevel == constPlayerLevel.NORMAL) {
                                    // DISABLED FOR CSTEST
                                    // dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.FAIL, proposal.data.bonusId, "Exceed Auto Approval Repeat Limit");
                                    sendToAudit(proposal._id, proposal.createTime, "Denied: Non-VIP: Exceed Auto Approval Repeat Limit");
                                }
                                else {
                                    sendToAudit(proposal._id, proposal.createTime, "Denied: VIP: Exceed Auto Approval Repeat Limit");
                                }
                            }
                        }
                    }
                );
            }


        }
    )
    //
    // // Find proposals since previous withdrawal
    // return dbconfig.collection_proposal.find({
    //     'data.platformId': ObjectId(proposal.data.platformId),
    //     'data.playerObjId': ObjectId(proposal.data.playerObjId),
    //     createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
    //     status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
    //     mainType: {$in: ["TopUp", "Reward"]}
    // }).sort({createTime: -1}).lean().then(
    //     proposals => {
    //         let isApprove = true, proms = [], repeatMsg = "";
    //         let lostThreshold = platformObj.autoApproveLostThreshold ? platformObj.autoApproveLostThreshold : 0;
    //         let countProposals = 0;
    //         let isTypeEApproval = false;
    //         let dateTo = proposal.createTime;
    //
    //         let checkResult = [], checkMsg = "";
    //
    //         while (proposals && proposals.length > 0) {
    //             // FIFO dequeue from nearest date proposal
    //             let getProp = proposals.shift();
    //
    //             // Set query date from checking proposal -> current proposal
    //             let queryDateFrom = new Date(getProp.createTime);
    //             let queryDateTo = new Date(dateTo);
    //
    //             let checkingNo = countProposals;
    //
    //             switch (getProp.mainType) {
    //                 case "TopUp":
    //                     let isSkip = false;
    //                     proms.push(
    //                         // Check if this top up has used for apply reward
    //                         dbconfig.collection_playerTopUpRecord.findOne({proposalId: getProp.proposalId}).then(
    //                             topUpRecord => {
    //                                 // Only check consumption if the topup record is clean, else ignore this proposal
    //                                 if (!topUpRecord.bDirty) {
    //                                     return getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, queryDateFrom, queryDateTo);
    //                                 }
    //                                 else {
    //                                     isSkip = true;
    //                                     checkMsg += "Topup proposal " + getProp.proposalId + " is dirty, skipped; ";
    //                                 }
    //                             }
    //                         ).then(
    //                             record => {
    //                                 if (!isSkip) {
    //                                     let curConsumption = 0, bonusAmount = 0;
    //                                     if (record && record[0]) {
    //                                         curConsumption = record[0].validAmount;
    //                                         bonusAmount = record[0].bonusAmount;
    //                                     }
    //
    //                                     checkResult.push({
    //                                         sequence: checkingNo,
    //                                         proposalId: getProp.proposalId,
    //                                         requiredConsumption: getProp.data.amount,
    //                                         curConsumption: curConsumption,
    //                                         bonusAmount: bonusAmount
    //                                     });
    //                                 }
    //                             }
    //                         )
    //                     );
    //                     break;
    //                 case "Reward":
    //                     // Consumption return proposal does not need to check consumption
    //                     if (getProp.type == constProposalType.PLAYER_CONSUMPTION_RETURN
    //                         || getProp.type == constProposalType.PARTNER_CONSUMPTION_RETURN) {
    //                         // return > bonus, and it's the nearest proposal
    //                         if (getProp.data.amount >= proposal.data.amount && countProposals == 0) {
    //                             // Flag for force approve
    //                             isTypeEApproval = true;
    //                         }
    //                     }
    //                     else {
    //                         // Only check rewards that require consumption
    //                         proms.push(
    //                             getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, new Date(queryDateFrom), new Date(queryDateTo)).then(
    //                                 record => {
    //                                     let curConsumption = 0, bonusAmount = 0;
    //                                     let initBonusAmount = getProp.data.applyAmount + getProp.data.rewardAmount;
    //
    //                                     if (record && record[0]) {
    //                                         curConsumption = record[0].validAmount;
    //                                         bonusAmount = record[0].bonusAmount;
    //                                     }
    //
    //                                     checkResult.push({
    //                                         sequence: checkingNo,
    //                                         proposalId: getProp.proposalId,
    //                                         initBonusAmount: initBonusAmount,
    //                                         requiredConsumption: getProp.data.spendingAmount,
    //                                         curConsumption: curConsumption,
    //                                         bonusAmount: bonusAmount
    //                                     });
    //
    //                                 }
    //                             )
    //                         )
    //                     }
    //
    //                     break;
    //             }
    //
    //             // After push the action promise, set next dateTo to this checking proposal createTime
    //             dateTo = queryDateFrom;
    //
    //             countProposals++;
    //         }
    //
    //         Promise.all(proms).then(
    //             () => {
    //                 let isClearCycle = false;
    //                 let validConsumptionAmount = 0, spendingAmount = 0, bonusAmount = 0, initBonusAmount = 0;
    //
    //                 // Make sure the check result is in correct order
    //                 checkResult.sort((a, b) => b.sequence - a.sequence);
    //
    //                 // Compare consumption and spendingAmount
    //                 for (let i = 0; i < checkResult.length; i++) {
    //                     // reset the amounts if consumption > spending for next cycle
    //                     if (isClearCycle) {
    //                         validConsumptionAmount = 0;
    //                         spendingAmount = 0;
    //                         bonusAmount = 0;
    //                         initBonusAmount = 0;
    //                     }
    //
    //                     validConsumptionAmount += checkResult[i].curConsumption ? checkResult[i].curConsumption : 0;
    //                     spendingAmount += checkResult[i].requiredConsumption ? checkResult[i].requiredConsumption : 0;
    //
    //                     if (checkResult[i].initBonusAmount) {
    //                         initBonusAmount += checkResult[i].initBonusAmount ? checkResult[i].initBonusAmount : 0;
    //                         bonusAmount += checkResult[i].bonusAmount ? checkResult[i].bonusAmount : 0;
    //                     }
    //
    //                     if (validConsumptionAmount != 0) {
    //                         // Check consumption for each cycle
    //                         // User lost all bonus amount
    //                         if (initBonusAmount != 0 && initBonusAmount + bonusAmount <= 0) {
    //                             isApprove = false;
    //                             isClearCycle = true;
    //                             checkMsg += "All reward lost at " + checkResult[i].proposalId + ": Initial Reward " + initBonusAmount + ", Deficit " + bonusAmount + "; ";
    //                         }
    //                         else if (validConsumptionAmount + lostThreshold < spendingAmount) {
    //                             isApprove = false;
    //                             checkMsg += "Insufficient consumption at " + checkResult[i].proposalId + ": Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + "; ";
    //                         }
    //                         else {
    //                             // Check if consumption has fulfilled requirement during this cycle
    //                             // reset from current cycle
    //                             checkMsg += "Consumption fulfilled at proposal " + checkResult[i].proposalId + ", Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount + ";";
    //                             isApprove = true;
    //                             isClearCycle = true;
    //                         }
    //                     }
    //                     else {
    //                         // No consumption at this cycle, not approved
    //                         isApprove = false;
    //                         checkMsg += "No consumption for proposal " + checkResult[i].proposalId + ": Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount;
    //                     }
    //                 }
    //
    //                 // Final check on consumption sum
    //                 // Check consumption for each cycle
    //                 if ((validConsumptionAmount + lostThreshold) < spendingAmount || validConsumptionAmount == 0) {
    //                     isApprove = false;
    //                     repeatMsg = "Insufficient overall consumption: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount;
    //                 }
    //
    //                 // If player is ATTENTION, fail this proposal
    //                 if ()
    //
    //                     if (isApprove || isTypeEApproval) {
    //                         // Proposal approved - DISABLED FOR CSTEST
    //                         // dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.SUCCESS, proposal.data.bonusId);
    //                         let approveRemark = "Success: Consumption " + validConsumptionAmount + ", Required Bet " + spendingAmount;
    //                         sendToAudit(proposal._id, proposal.createTime, approveRemark, checkMsg);
    //
    //                     }
    //                     else {
    //                         // Proposal not approved; Throw back to loop pool or deny this proposal
    //                         proposal.data.autoApproveRepeatCount =
    //                             proposal.data.autoApproveRepeatCount || proposal.data.autoApproveRepeatCount == 0 ?
    //                                 proposal.data.autoApproveRepeatCount - 1
    //                                 : repeatCount - 1;
    //
    //                         if (proposal.data.autoApproveRepeatCount >= 0) {
    //                             let nextCheckTime = new Date();
    //                             nextCheckTime.setMinutes(nextCheckTime.getMinutes() + platformObj.autoApproveRepeatDelay);
    //                             return dbconfig.collection_proposal.findOneAndUpdate({
    //                                 _id: proposal._id,
    //                                 createTime: proposal.createTime
    //                             }, {
    //                                 'data.autoApproveRepeatCount': proposal.data.autoApproveRepeatCount,
    //                                 'data.nextCheckTime': nextCheckTime,
    //                                 'data.repeatMsg': repeatMsg,
    //                                 'data.autoAuditCheckMsg': checkMsg
    //                             }).exec();
    //                         }
    //                         else {
    //                             // Check if player is VIP - Passed
    //                             if (proposal.data.proposalPlayerLevel == constPlayerLevel.NORMAL) {
    //                                 // DISABLED FOR CSTEST
    //                                 // dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.FAIL, proposal.data.bonusId, "Exceed Auto Approval Repeat Limit");
    //                                 sendToAudit(proposal._id, proposal.createTime, "Denied: Non-VIP: Exceed Auto Approval Repeat Limit");
    //                             }
    //                             else {
    //                                 sendToAudit(proposal._id, proposal.createTime, "Denied: VIP: Exceed Auto Approval Repeat Limit");
    //                             }
    //                         }
    //                     }
    //             }
    //         );
    //     }
    // )

}

function sendToApprove(proposalObjId, createTime, remark, processRemark) {
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
                                'data.autoAuditCheckMsg': processRemark
                            },
                            {new: true}
                        );
                    }
                );
            }
        }
    );
}

function sendToAudit(proposalObjId, createTime, remark, processRemark) {
    // temporary disabled system log since success will also send to audit
    // console.log('Sending to audit', proposalObjId, remark);
    //check if proposal got process, if there is no process, reject directly

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
                        'data.autoAuditCheckMsg': processRemark
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
                                    'data.autoAuditCheckMsg': processRemark
                                },
                                {new: true}
                            );
                        })
                }
            }
        }
    );
}

// function checkSingleWithdrawalLimit(proposals, platformData) {
//     let passedProposal = [];
//     proposals.map(proposal => {
//         if (proposal.data.amount >= platformData.autoApproveWhenSingleBonusApplyLessThan) {
//             sendToAudit(proposal._id, proposal.createTime, "Denied: Amount exceed single bonus limit");
//         } else {
//             passedProposal.push(proposal);
//         }
//     });
//
//     return passedProposal;
// }

// function checkSingleDayWithdrawalLimit(proposals, platformData, proposalTypeObjId) {
//     let playersToAggregate = proposals.map(proposal => ObjectId(proposal.data.playerObjId));
//
//     return getBonusRecordsOfPlayers(playersToAggregate, proposalTypeObjId).then(
//         bonusRecord => {
//             let playersToFilter = proposals.map(proposal => String(proposal.data.playerObjId));
//
//             bonusRecord.map(record => {
//                 // Check if particular record has exceeded limit
//                 if (record.amount >= platformData.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
//                     // Check if the player is available for filter
//                     if (playersToFilter.indexOf(String(record._id) != -1)) {
//                         proposals.map(proposal => {
//                             if (String(proposal.data.playerObjId) == String(record._id)) {
//                                 sendToAudit(proposal._id, proposal.createTime, "Denied: Amount exceed single day bonus limit");
//                                 let removeIndex = proposals.indexOf(proposal);
//                                 proposals.splice(removeIndex, 1);
//                             }
//                         })
//                     }
//                 }
//             });
//
//             return proposals;
//         }
//     );
// }

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

module.exports = dbAutoProposal;