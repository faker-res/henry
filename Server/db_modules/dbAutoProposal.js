'use strict';

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constPlayerLevel = require('../const/constPlayerLevel');
const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
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

                    let stream = dbconfig.collection_proposal.find({
                        type: proposalTypeObjId,
                        status: constProposalStatus.PROCESSING,
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
            // 1. Check single withdrawal limit - passed
            let checkProps1 = checkSingleWithdrawalLimit(proposals, platformObj);

            // 2. Check single day withdrawal limit
            return checkSingleDayWithdrawalLimit(checkProps1, platformObj, proposalTypeObjId).then(
                proposals => {
                    if (proposals && proposals.length > 0) {
                        let prom = [];
                        proposals.map(proposal => {
                            // 3. Check player status
                            if (proposal.data.playerStatus !== constPlayerStatus.NORMAL) {
                                sendToAudit(proposal._id, proposal.createTime, "Player not allowed for auto proposal");
                            } else {
                                // 4. Check player last bonus
                                prom.push(
                                    getPlayerLastProposalDateOfType(proposal.data.playerObjId, proposal.type).then(
                                        lastWithdrawDate => {
                                            if (lastWithdrawDate) {
                                                // Player withdrew before
                                                let repeatCount = platformObj.autoApproveRepeatCount;
                                                checkPreviousProposals(proposal, lastWithdrawDate, repeatCount, platformObj);
                                            } else {
                                                // Player first time withdraw
                                                sendToAudit(proposal._id, proposal.createTime, "Player's first withdrawal");
                                            }
                                        }
                                    )
                                );
                            }
                        });
                        return Promise.all(prom).then(
                            data => {
                                return proposals;
                            }
                        );
                    }
                    return proposals;
                }
            )
        }
    }
};

function sendToAudit(proposalObjId, createTime, remark) {
    console.log('Sending to audit', proposalObjId, remark);
    //check if proposal got process, if there is no process, reject directly
    dbconfig.collection_proposal.findOne({_id: proposalObjId}).populate({path: "type", model: dbconfig.collection_proposalType}).lean().then(
        proposalData => {
            if (proposalData) {
                if (!proposalData.noSteps) {
                    dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposalObjId,
                        createTime: createTime
                    }, {
                        status: constProposalStatus.PENDING,
                        'data.remark': 'Auto Approval Denied: ' + remark
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
                                    'data.remark': 'Auto Approval Denied: ' + remark
                                },
                                {new: true}
                            );
                        })
                }
            }
        }
    );
}

function checkSingleWithdrawalLimit(proposals, platformData) {
    let passedProposal = [];
    proposals.map(proposal => {
        if (proposal.data.amount >= platformData.autoApproveWhenSingleBonusApplyLessThan) {
            sendToAudit(proposal._id, proposal.createTime, "Amount exceed single bonus limit");
        } else {
            passedProposal.push(proposal);
        }
    });

    return passedProposal;
}

function checkSingleDayWithdrawalLimit(proposals, platformData, proposalTypeObjId) {
    let playersToAggregate = proposals.map(proposal => ObjectId(proposal.data.playerObjId));

    return getBonusRecordsOfPlayers(playersToAggregate, proposalTypeObjId).then(
        bonusRecord => {
            let playersToFilter = proposals.map(proposal => String(proposal.data.playerObjId));

            bonusRecord.map(record => {
                // Check if particular record has exceeded limit
                if (record.amount >= platformData.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
                    // Check if the player is available for filter
                    if (playersToFilter.indexOf(String(record._id) != -1)) {
                        proposals.map(proposal => {
                            if (String(proposal.data.playerObjId) == String(record._id)) {
                                sendToAudit(proposal._id, proposal.createTime, "Amount exceed single day bonus limit");
                                let removeIndex = proposals.indexOf(proposal);
                                proposals.splice(removeIndex, 1);
                            }
                        })
                    }
                }
            });

            return proposals;
        }
    );
}

function getBonusRecordsOfPlayers(players, proposalTypeObjId) {
    let todayTime = dbUtility.getTodaySGTime();

    return dbconfig.collection_proposal.aggregate(
        {
            $match: {
                type: ObjectId(proposalTypeObjId),
                createTime: {
                    $gte: todayTime.startTime,
                    $lt: todayTime.endTime
                },
                'data.playerObjId': {$in: players},
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

function checkPreviousProposals(proposal, lastWithdrawDate, repeatCount, platformObj) {
    // Find proposals since previous withdrawal
    return dbconfig.collection_proposal.find({
        'data.platformId': ObjectId(proposal.data.platformId),
        'data.playerObjId': ObjectId(proposal.data.playerObjId),
        createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
        mainType: {$in: ["TopUp", "Reward"]}
    }).sort({createTime: -1}).lean().then(
        proposals => {
            let isApprove = true, proms = [];
            let countProposals = 0;
            let isTypeEApproval = false;
            let dateTo = proposal.createTime;

            while (isApprove && proposals && proposals.length > 0) {
                // FIFO dequeue from nearest date proposal
                let getProp = proposals.shift();

                // Set query date from checking proposal -> current proposal
                let dateFrom = getProp.createTime;

                switch (getProp.mainType) {
                    case "TopUp":
                        proms.push(
                            getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, dateFrom, dateTo).then(
                                record => {
                                    if (record) {
                                        if (record[0]) {
                                            let validConsumptionAmount = record[0].validAmount + platformObj.autoApproveLostThreshold;
                                            if (validConsumptionAmount < proposal.data.amount) {
                                                isApprove = false;
                                            }
                                        }
                                        else {
                                            isApprove = false;
                                        }
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
                            proms.push(
                                getPlayerConsumptionSummary(getProp.data.platformId, getProp.data.playerObjId, dateFrom, dateTo).then(
                                    record => {
                                        if (record && record[0]) {
                                            let checkPassed = false;
                                            let validConsumptionAmount = record[0].validAmount + platformObj.autoApproveLostThreshold;

                                            if (!getProp.data.spendingAmount) {
                                                // There is no spending amount specified for reward
                                                checkPassed = true;
                                            }
                                            else if (validConsumptionAmount > getProp.data.spendingAmount) {
                                                // Consumption Sum exceed required unlock amount
                                                checkPassed = true;
                                            }

                                            // If isApprove is false, means a checking is already false and it will not back to true
                                            isApprove = isApprove ? checkPassed : false;
                                        }
                                    }
                                )
                            );
                        }

                        break;
                }

                // After push the action promise, set next dateTo to this checking proposal createTime
                dateTo = dateFrom;

                countProposals++;
            }

            Promise.all(proms).then(
                () => {
                    if (isApprove || isTypeEApproval) {
                        // Proposal approved
                        dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.SUCCESS, proposal.data.bonusId);
                    }
                    else {
                        // Proposal not approved; Throw back to loop pool or cancel this proposal - Passed
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
                                'data.nextCheckTime': nextCheckTime
                            }).exec();
                        }
                        else {
                            // Check if player is VIP - Passed
                            if (proposal.data.proposalPlayerLevel == constPlayerLevel.NORMAL) {
                                dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.FAIL, proposal.data.bonusId, "Exceed Auto Approval Repeat Limit");
                            }
                            else {
                                sendToAudit(proposal._id, proposal.createTime, "VIP: Exceed Auto Approval Repeat Limit");
                            }
                        }
                    }
                }
            );
        }
    )

}

function getPlayerConsumptionSummary(platformId, playerId, dateFrom, dateTo) {
    let matchObj = {
        platformId: ObjectId(platformId),
        createTime: {
            $gte: new Date(dateFrom),
            $lt:  new Date(dateTo)
        },
        playerId: ObjectId(playerId)
    };

    let groupObj = {
        _id: {playerId: "$playerId", platformId: "$platformId"},
        validAmount: {$sum: "$validAmount"}
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