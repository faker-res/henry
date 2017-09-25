const pmsAPI = require("../externalAPI/pmsAPI.js");
const dbconfig = require("../modules/dbproperties");
const dbUtility = require("../modules/dbutility");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");

const dbPaymentReconciliation = {

    getOnlinePaymentProposalMismatchReport: function (platform, platformId, option, startTime, endTime) {
        // since PMS does not allow having more than 24hr between time frame,
        // FPMS will do the time slicing internally
        let timeFrames = sliceTimeFrameToDaily(startTime, endTime);

        let name = {
            $in: [
                constProposalType.PLAYER_TOP_UP,
                constProposalType.PLAYER_ALIPAY_TOP_UP,
                constProposalType.PLAYER_WECHAT_TOP_UP,
                constProposalType.PLAYER_MANUAL_TOP_UP,
                constProposalType.PLAYER_QUICKPAY_TOP_UP
            ]
        };

        if (option === 'online') {
            name = constProposalType.PLAYER_TOP_UP;
        }
        else if (option === 'manual') {
            name = {
                $in: [
                    constProposalType.PLAYER_ALIPAY_TOP_UP,
                    constProposalType.PLAYER_WECHAT_TOP_UP,
                    constProposalType.PLAYER_MANUAL_TOP_UP,
                    constProposalType.PLAYER_QUICKPAY_TOP_UP
                ]
            };
        }

        return dbconfig.collection_proposalType.find({platformId: platform, name: name}).lean().then(
            proposalTypeData => {
                let proposalType = proposalTypeData;
                let allProm = [];

                let proposalTypeIds = [];

                for (let i = 0, len = proposalType.length; i < len; i++) {
                    proposalTypeIds.push(proposalType[i]._id);
                }

                for (let t = 0, tLength = timeFrames.length; t < tLength; t++) {
                    let promises = [];
                    let start = timeFrames[t].startTime;
                    let end = timeFrames[t].endTime;

                    let pmsProm = pmsAPI.reconciliation_getCashinList({
                        platformId: platformId,
                        starttime: startTime,
                        endtime: endTime
                    });

                    if (option === 'online') {
                        pmsProm = pmsAPI.reconciliation_getOnlineCashinList({
                            platformId: platformId,
                            starttime: startTime,
                            endtime: endTime
                        });
                    }

                    promises.push(pmsProm);

                    let proposalQuery = {
                        type: {$in: proposalTypeIds},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        createTime: {$gte: start, $lte: end}
                    };

                    let proposalProm = dbconfig.collection_proposal.find(proposalQuery, {proposalId: 1, "data.amount": 1, createTime: 1}).lean();

                    promises.push(proposalProm);

                    if (option === 'manual') {
                        let pmsOnlineCashinProm = pmsAPI.reconciliation_getCashinList({
                            platformId: platformId,
                            starttime: startTime,
                            endtime: endTime
                        });

                        promises.push(pmsOnlineCashinProm);
                    }

                    allProm.push(Promise.all(promises));
                }

                return Promise.all(allProm);
            }
        ).then(
            proposalGroup => {
                let mismatches = [];

                for (let i = 0, len = proposalGroup.length; i < len; i++) {
                    let mismatchWithinGroup = getMismatchFromProposalGroup(proposalGroup[i], Boolean(option === 'manual'));
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

function getMismatchFromProposalGroup(proposals, isManual) {
    let pmsProposals = proposals[0].onlineCashinList;
    let localProposals = proposals[1];
    let pmsOnlineProposals = isManual ? proposals[2] : [];

    if (isManual) {
        for (let i = 0, iLength = pmsOnlineProposals.length; i < iLength; i++) {
            for (let j = 0, jLength = pmsProposals.length; j < jLength; j++) {
                let pmsOnlineProposal = pmsOnlineProposals[i];
                let pmsProposal = pmsProposals[j];

                if (pmsProposal.proposalId && pmsOnlineProposal.proposalId && pmsProposal.proposalId.toString() === pmsOnlineProposal.proposalId.toString()) {
                    pmsProposal.matched = true;
                    pmsOnlineProposal.matched = true;
                    break;
                }
            }
        }
    }

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
            mismatches.push({proposalId: localProposal.proposalId, missing: "PMS", createTime: localProposal.createTime});
        }
    }

    return mismatches;
}

module.exports = dbPaymentReconciliation;