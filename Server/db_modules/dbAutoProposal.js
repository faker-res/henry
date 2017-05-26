'use strict';

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
                // 1. Check single withdrawal limit - passed
                let checkProps1 = checkSingleWithdrawalLimit(proposals, platformData);

                // 2. Check single day withdrawal limit
                return checkSingleDayWithdrawalLimit(checkProps1, platformData, proposalTypeObjId);
            }
        ).then(
            proposals => {
                proposals.map(proposal => {
                    // 3. Check player status
                    if (proposal.data.playerStatus != constPlayerStatus.NORMAL) {
                        sendToAudit(proposal._id, proposal.createTime, "Player not allowed for auto proposal");
                        let removeIndex = proposals.indexOf(proposal);
                        proposals.splice(removeIndex, 1);
                    } else {
                        // 4. Check player last bonus
                        getPlayerLastProposalDateOfType(proposal.data.playerObjId, proposal.type).then(
                            lastWithdrawDate => {
                                if (lastWithdrawDate) {
                                    checkPreviousProposals(proposal, lastWithdrawDate);
                                } else {
                                    sendToAudit(proposal._id, proposal.createTime, "Player's first withdrawal");
                                    let removeIndex = proposals.indexOf(proposal);
                                    proposals.splice(removeIndex, 1);
                                }
                            }
                        );
                    }
                });

                return proposals;
            }
        )
    }
};

function sendToAudit(proposalObjId, createTime, remark) {
    console.log('Sending to audit', proposalObjId);
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
                if (record.amount >= platformData.autoApproveWhenSingleDayTotalBonusApplyLessThan) {
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

function checkPreviousProposals(proposal, lastWithdrawDate) {
    console.log(proposal, lastWithdrawDate);
    return dbconfig.collection_proposal.find({
        'data.platformId': proposal.data.platformId,
        'data.playerObjId': proposal.data.playerObjId,
        createTime: {$gt: lastWithdrawDate, $lt: proposal.createTime},
        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
        mainType: {$in: ["TopUp", "Reward"]}
    }).sort({createTime: -1}).then(
        proposals => {
            console.log('proposals', proposals);
            while (proposals && proposals.length > 0) {
                let isApprove = false, proms = [];
                let getProp = proposals.shift();

                console.log('getProp', getProp);
                switch (getProp.mainType) {
                    case "TopUp":
                        console.log("This proposal ", getProp.proposalId, " is topup proposal");
                        proms.push(dbconfig.collection_playerConsumptionRecord.aggregate(
                            {
                                $match: {
                                    platformId: getProp.data.platformId,
                                    createTime: {
                                        $gte: getProp.createTime,
                                        $lt: proposal.createTime
                                    },
                                    playerId: getProp.data.playerObjId
                                }
                            },
                            {
                                $group: {
                                    _id: {playerId: "$playerId", platformId: "$platformId"},
                                    validAmount: {$sum: "$validAmount"}
                                }
                            }
                        ).then(record => {
                            console.log('got record', record);

                            // TODO:: TEMP TESTING
                            record[0] = {validAmount: 400};

                            if (record[0].validAmount > proposal.data.amount) {
                                isApprove = true;
                            }
                        }));
                        console.log('isApprove', isApprove);
                        break;
                }

                Promise.all(proms).then(
                    () => {
                        if (isApprove) {
                            console.log('Updating proposal', getProp.proposalId, ' to success');
                            dbProposal.updateBonusProposal(proposal.proposalId, constProposalStatus.SUCCESS, proposal.data.bonusId);
                        }
                    }
                );
            }

            console.log('While loop done');
        }
    )

}

//function getPlayerConsumptionRecordInTimeframe (playerObjId, )

module.exports = dbAutoProposal;