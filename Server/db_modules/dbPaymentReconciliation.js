const pmsAPI = require("../externalAPI/pmsAPI.js");
const dbconfig = require("../modules/dbproperties");
const dbUtility = require("../modules/dbutility");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");

const dbPaymentReconciliation = {
    testAPI: function (platform, platformId, startTime, endTime) {
        return pmsAPI.reconciliation_getOnlineCashinList({
            platformId: platformId,
            starttime: startTime,
            endtime: endTime
        });
    },

    getOnlinePaymentProposalMismatchReport: function (platform, platformId, startTime, endTime) {
        // since PMS does not allow having more than 24hr between time frame,
        // FPMS will do the time slicing internally
        let timeFrames = sliceTimeFrameToDaily(startTime, endTime);

        return dbconfig.collection_proposalType.findOne({platformId: platform, name: constProposalType.PLAYER_TOP_UP}).lean().then(
            proposalTypeData => {
                let proposalTypeId = proposalTypeData._id;
                let allProm = [];

                for (let t = 0, tLength = timeFrames.length; t < tLength; t++) {
                    let start = timeFrames[t].startTime;
                    let end = timeFrames[t].endTime;

                    let pmsProm = pmsAPI.reconciliation_getOnlineCashinList({
                        platformId: platformId,
                        starttime: startTime,
                        endtime: endTime
                    });

                    let proposalQuery = {
                        type: proposalTypeId,
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        createTime: {$gte: start, $lte: end},
                        from_old_system: {$exists: false}
                    };

                    let proposalProm = dbconfig.collection_proposal.find(proposalQuery, {proposalId: 1, "data.amount": 1, createTime: 1}).lean();

                    allProm.push(Promise.all([pmsProm, proposalProm]));
                }

                return Promise.all(allProm);
            }
        ).then(
            proposalGroup => {
                let mismatches = [];

                for (let i = 0, len = proposalGroup.length; i < len; i++) {
                    let mismatchWithinGroup = getMismatchFromProposalGroup(proposalGroup[i]);
                    mismatches = mismatches.concat(mismatchWithinGroup);
                }

                mismatches.sort(function (proposalA, proposalB) {
                    if (new Date(proposalA.createTime) > new Date(proposalB.createTime)) {
                        return -1;
                    }
                    return 1;
                });

                return mismatches;
            }

        );
    }

};

function sliceTimeFrameToDaily(startTime, endTime) {
    const oneDayInMs = 1000*60*60*24;
    let timeFrames = [];

    if ((endTime - startTime) > oneDayInMs) {
        timeFrames.push({startTime: startTime, endTime: endTime});
    }
    else {
        let nextStartTime = startTime;
        let nextEndTime = dbUtility.getDayEndTime(startTime);
        while (nextEndTime < endTime) {
            timeFrames.push({startTime: nextStartTime, endTime: nextEndTime});
            nextStartTime = nextEndTime;
            nextEndTime = dbUtility.getDayEndTime(nextStartTime);
        }
        timeFrames.push({startTime: nextStartTime, endTime: endTime});
    }

    return timeFrames;
}

function getMismatchFromProposalGroup(proposals) {
    let pmsProposals = proposals[0].onlineCashinList;
    let localProposals = proposals[1];

    for (let i = 0, iLength = pmsProposals.length; i < iLength; i++) {
        for (let j = 0, jLength = localProposals.length; j < jLength; j++) {
            let pmsProposal = pmsProposals[i];
            let localProposal = localProposals[j];

            if (pmsProposal.proposalId && localProposal.proposalId && pmsProposal.proposalId.toString() === localProposal.proposalId.toString()) {
                pmsProposal.matched = true;
                localProposal.matched = true;
                break;
            }
        }
    }

    let mismatches = [];
    for (let i = 0, iLength = pmsProposals.length; i < iLength; i++) {
        let pmsProposal = pmsProposals[i];
        if (!pmsProposal.matched) {
            mismatches.push({proposalId: pmsProposal.proposalId, missing: "FPMS", createTime: pmsProposal.createTime});
        }
    }

    for (let i = 0, iLength = localProposals.length; i < iLength; i++) {
        let localProposal = localProposals[i];
        if (!localProposal.matched) {
            mismatches.push({proposalId: localProposal.proposalId, missing: "PMS", createTime: localProposal.createTime, amount: localProposal.data.amount});
        }
    }

    return mismatches;
}

module.exports = dbPaymentReconciliation;