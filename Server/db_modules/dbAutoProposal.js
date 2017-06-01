'use strict';

const constPlayerLevel = require('../const/constPlayerLevel');
const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constServerCode = require('../const/constServerCode');
const constSystemLogLevel = require('./../const/constSystemLogLevel');
const constSystemParam = require('./../const/constSystemParam');
const constShardKeys = require('../const/constShardKeys');

const dbProposal = require('./../db_modules/dbProposal');

const dbconfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');
var Q = require("q");

const pmsAPI = require("../externalAPI/pmsAPI.js");

let dbAutoProposal = {
    applyBonus: (platformObjId) => {
        let platformData, proposalTypeObjId;

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                platformData = platform;
                return dbconfig.collection_proposalType.findOne({
                    platformId: platformObjId,
                    name: constProposalType.PLAYER_BONUS
                })
            }
        ).then(
            proposalType => {
                proposalTypeObjId = proposalType._id;
                return dbconfig.collection_proposal.find({
                    type: proposalTypeObjId,
                    status: constProposalStatus.PROCESSING
                })
            }
        ).then(
            proposals => {
                if (proposals && proposals.length > 0) {
                    // 1. Check single withdrawal limit - passed
                    let checkProps1 = checkSingleWithdrawalLimit(proposals, platformData);

                    // 2. Check single day withdrawal limit
                    return checkSingleDayWithdrawalLimit(checkProps1, platformData, proposalTypeObjId);
                }
            }
        ).then(
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
                                            let repeatCount = platformData.autoApproveRepeatCount;
                                            checkPreviousProposals(proposal, lastWithdrawDate, repeatCount);
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
};

function sendToAudit(proposalObjId, createTime, remark) {
    console.log('Sending to audit', proposalObjId, remark);
    return dbconfig.collection_proposal.findOneAndUpdate({
        _id: proposalObjId,
        createTime: createTime
    }, {
        status: constProposalStatus.PENDING,
        'data.remark': 'Auto Approval Denied: ' + remark
    }).exec();
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
    let playersToAggregate = proposals.map(proposal => proposal.data.playerObjId);

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
                type: proposalTypeObjId,
                createTime: {
                    $gte: todayTime.startTime,
                    $lt: todayTime.endTime
                },
                'data.playerObjId': {$in: players},
                // TODO:: Check success bonus history only??
                //status: constProposalStatus.SUCCESS
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
        'data.playerObjId': playerObjId,
        type: type,
        $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}]
    }).sort({createTime: -1}).limit(1).then(
        retData => {
            if (retData && retData[0]) {
                return retData[0].createTime;
            }
        }
    )
}

function checkPreviousProposals(proposal, lastWithdrawDate, repeatCount) {
    return dbconfig.collection_proposal.find({
        'data.platformId': proposal.data.platformId,
        'data.playerObjId': proposal.data.playerObjId,
        createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
        mainType: {$in: ["TopUp", "Reward"]}
    }).sort({createTime: -1}).then(
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
                                    if (record[0].validAmount < proposal.data.amount) {
                                        isApprove = false;
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
                                        let checkPassed = false;

                                        if (!getProp.data.spendingAmount) {
                                            // There is no spending amount specified for reward
                                            checkPassed = true;
                                        }
                                        else if (record[0].validAmount > getProp.data.spendingAmount) {
                                            // Consumption Sum exceed required unlock amount
                                            checkPassed = true;
                                        }

                                        // If isApprove is false, means a checking is already false and it will not back to true
                                        isApprove = isApprove ? checkPassed : false;
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
                            return dbconfig.collection_proposal.findOneAndUpdate({
                                _id: proposal._id,
                                createTime: proposal.createTime
                            }, {
                                'data.autoApproveRepeatCount': proposal.data.autoApproveRepeatCount
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
    return dbconfig.collection_playerConsumptionRecord.aggregate(
        {
            $match: {
                platformId: platformId,
                createTime: {
                    $gte: dateFrom,
                    $lt: dateTo
                },
                playerId: playerId
            }
        },
        {
            $group: {
                _id: {playerId: "$playerId", platformId: "$platformId"},
                validAmount: {$sum: "$validAmount"}
            }
        }
    )
}

module.exports = dbAutoProposal;