'use strict';

const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constServerCode = require('../const/constServerCode');
const constSystemLogLevel = require('./../const/constSystemLogLevel');
const constSystemParam = require('./../const/constSystemParam');
const constShardKeys = require('../const/constShardKeys');

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
                                    proposals[proposals.indexOf(proposal)].lastWithdrawDate = lastWithdrawDate;
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
        ).then(
            proposals => {
                console.log('third check passed', proposals);
            }
        )

        //
        //         let playersToFilter = proposals.map(proposal => String(proposal.data.playerObjId));
        //
        //         // 4. Check last player withdrawal
        //         // dbconfig.collection_proposal.find({
        //         //     'data.playerObjId': proposal.data.playerObjId,
        //         //     createTime: {$gt: lastWithdrawDate},
        //         //     $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}]
        //         // })
        //
        //     }
        // )
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

module.exports = dbAutoProposal;