const pmsAPI = require("../externalAPI/pmsAPI.js");
const dbconfig = require("../modules/dbproperties");
const dbUtility = require("../modules/dbutility");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const moment = require('moment-timezone');

const dbPaymentReconciliation = {
    getBonusReport: function (platform, platformId, option, startTime, endTime) {
        let timeFrames = sliceTimeFrameToDaily(startTime, endTime);

        let name = constProposalType.PLAYER_BONUS;

        return dbconfig.collection_proposalType.findOne({platformId: platform, name: name}).lean().then(
            proposalTypeData => {
                let proposalTypeId = proposalTypeData._id;
                let allProm = [];

                for (let t = 0, tLength = timeFrames.length; t < tLength; t++) {
                    let promises = [];
                    let start = timeFrames[t].startTime;
                    let end = timeFrames[t].endTime;

                    let pmsProm = pmsAPI.reconciliation_getCashoutList({
                        platformId: platformId,
                        starttime: getPMSTimeFormat(start),
                        endtime: getPMSTimeFormat(end)
                    });

                    let proposalQuery = {
                        type: proposalTypeId,
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        createTime: {$gte: start, $lte: end},
                        from_old_system: {$exists: false}
                    };

                    let proposalProm = dbconfig.collection_proposal.find(proposalQuery, {proposalId: 1, "data.amount": 1, createTime: 1, amount:1}).lean();

                    allProm.push(Promise.all([pmsProm, proposalProm]));
                }

                return Promise.all(allProm);
            }
        ).then(
            proposalGroup => {
                let mismatches = [];
                let pmsMismatchCount = 0;
                let pmsMismatchAmount = 0;
                let fpmsMismatchCount = 0;
                let fpmsMismatchAmount = 0;
                let pmsCount = 0;
                let pmsAmount = 0;
                let fpmsCount = 0;
                let fpmsAmount = 0;

                for (let i = 0, len = proposalGroup.length; i < len; i++) {
                    let mismatchDataWithinGroup = getMismatchFromProposalGroup(proposalGroup[i], option);
                    mismatches = mismatches.concat(mismatchDataWithinGroup.mismatches);
                    pmsMismatchCount += mismatchDataWithinGroup.pmsMismatchCount;
                    pmsMismatchAmount += mismatchDataWithinGroup.pmsMismatchAmount;
                    fpmsMismatchCount += mismatchDataWithinGroup.fpmsMismatchCount;
                    fpmsMismatchAmount += mismatchDataWithinGroup.fpmsMismatchAmount;
                    pmsCount += mismatchDataWithinGroup.pmsCount;
                    pmsAmount += mismatchDataWithinGroup.pmsAmount;
                    fpmsCount += mismatchDataWithinGroup.fpmsCount;
                    fpmsAmount += mismatchDataWithinGroup.fpmsAmount;
                }

                mismatches.sort(function (proposalA, proposalB) {
                    if (new Date(proposalA.createTime) > new Date(proposalB.createTime)) {
                        return -1;
                    }
                    return 1;
                });

                return {
                    mismatches: mismatches,
                    pmsMismatchCount: pmsMismatchCount,
                    pmsMismatchAmount: pmsMismatchAmount,
                    fpmsMismatchCount: fpmsMismatchCount,
                    fpmsMismatchAmount: fpmsMismatchAmount,
                    pmsCount: pmsCount,
                    pmsAmount: pmsAmount,
                    fpmsCount: fpmsCount,
                    fpmsAmount: fpmsAmount
                };
            }
        )
    },

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
                        starttime: getPMSTimeFormat(start),
                        endtime: getPMSTimeFormat(end)
                    });

                    if (option === 'online') {
                        pmsProm = pmsAPI.reconciliation_getOnlineCashinList({
                            platformId: platformId,
                            starttime: getPMSTimeFormat(start),
                            endtime: getPMSTimeFormat(end)
                        });
                    }

                    promises.push(pmsProm);

                    let proposalQuery = {
                        type: {$in: proposalTypeIds},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        createTime: {$gte: start, $lte: end},
                        from_old_system: {$exists: false}
                    };

                    let proposalProm = dbconfig.collection_proposal.find(proposalQuery, {proposalId: 1, "data.amount": 1, createTime: 1, amount:1}).lean();

                    promises.push(proposalProm);

                    if (option === 'manual') {
                        let pmsOnlineCashinProm = pmsAPI.reconciliation_getCashinList({
                            platformId: platformId,
                            starttime: getPMSTimeFormat(start),
                            endtime: getPMSTimeFormat(end)
                        });

                        promises.push(pmsOnlineCashinProm);
                    }

                    allProm.push(Promise.all(promises));
                }

                return Promise.all(allProm);
            }
        ).then(
            proposalGroup => {
                // console.log(proposalGroup[0])
                let mismatches = [];
                let pmsMismatchCount = 0;
                let pmsMismatchAmount = 0;
                let fpmsMismatchCount = 0;
                let fpmsMismatchAmount = 0;
                let pmsCount = 0;
                let pmsAmount = 0;
                let fpmsCount = 0;
                let fpmsAmount = 0;

                for (let i = 0, len = proposalGroup.length; i < len; i++) {
                    let mismatchDataWithinGroup = getMismatchFromProposalGroup(proposalGroup[i], option);
                    mismatches = mismatches.concat(mismatchDataWithinGroup.mismatches);
                    pmsMismatchCount += mismatchDataWithinGroup.pmsMismatchCount;
                    pmsMismatchAmount += mismatchDataWithinGroup.pmsMismatchAmount;
                    fpmsMismatchCount += mismatchDataWithinGroup.fpmsMismatchCount;
                    fpmsMismatchAmount += mismatchDataWithinGroup.fpmsMismatchAmount;
                    pmsCount += mismatchDataWithinGroup.pmsCount;
                    pmsAmount += mismatchDataWithinGroup.pmsAmount;
                    fpmsCount += mismatchDataWithinGroup.fpmsCount;
                    fpmsAmount += mismatchDataWithinGroup.fpmsAmount;
                }

                mismatches.sort(function (proposalA, proposalB) {
                    if (new Date(proposalA.createTime) > new Date(proposalB.createTime)) {
                        return -1;
                    }
                    return 1;
                });

                return {
                    mismatches: mismatches,
                    pmsMismatchCount: pmsMismatchCount,
                    pmsMismatchAmount: pmsMismatchAmount,
                    fpmsMismatchCount: fpmsMismatchCount,
                    fpmsMismatchAmount: fpmsMismatchAmount,
                    pmsCount: pmsCount,
                    pmsAmount: pmsAmount,
                    fpmsCount: fpmsCount,
                    fpmsAmount: fpmsAmount
                };
            }

        );
    },

    // debug purpose only
    testCashoutAPI: function (platformId, startTime, endTime) {
        let pmsProm = pmsAPI.reconciliation_getCashoutList({
            platformId: platformId,
            starttime: getPMSTimeFormat(startTime),
            endtime: getPMSTimeFormat(endTime)
        });

        return pmsProm;
    }

};

function sliceTimeFrameToDaily(startTime, endTime) {
    const oneDayInMs = 1000*60*60*24;
    let timeFrames = [];

    if ((endTime - startTime) < oneDayInMs) {
        timeFrames.push({startTime: startTime, endTime: endTime});
    }
    else {
        let nextStartTime = startTime;
        // let nextEndTime = dbUtility.getDayEndTime(startTime); //this is one full day
        let nextStartTimeDate = new Date(startTime);
        let nextEndTimeDate = nextStartTimeDate.setHours(nextStartTimeDate.getHours()+12);
        let nextEndTime = dbUtility.getSGTimeOf(nextEndTimeDate);
        while (nextEndTime < endTime) {
            timeFrames.push({startTime: nextStartTime, endTime: nextEndTime});
            nextStartTime = nextEndTime;
            let currentNextEndTime = new Date(nextEndTime);
            nextEndTimeDate = currentNextEndTime.setHours(currentNextEndTime.getHours()+12);
            nextEndTime = dbUtility.getSGTimeOf(nextEndTimeDate);
        }
        timeFrames.push({startTime: nextStartTime, endTime: endTime});
    }

    return timeFrames;
}

function getMismatchFromProposalGroup(proposals, option) {
    let pmsProposals;
    if (option === 'online') {
        pmsProposals = proposals[0].onlineCashinList || [];
    }
    else {
        pmsProposals = proposals[0].cashinList || proposals[0].cashoutList || [];
    }

    let localProposals = proposals[1];
    let pmsOnlineProposals = option === 'manual' ? proposals[2].onlineCashinList : [];

    if (option === 'manual') {
        pmsOnlineProposals = pmsOnlineProposals || [];
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
    let pmsMismatchCount = 0;
    let pmsMismatchAmount = 0;
    let pmsCount = 0;
    let pmsAmount = 0;
    for (let i = 0, iLength = pmsProposals.length; i < iLength; i++) {
        let pmsProposal = pmsProposals[i];
        if (!pmsProposal.matched) {
            mismatches.push({proposalId: pmsProposal.proposalId, missing: "FPMS", createTime: pmsProposal.createTime, amount: pmsProposal.amount});
            pmsMismatchCount++;
            pmsMismatchAmount += pmsProposal.amount;
        }
        if (i === 0) {
            // todo :: debugging console.log, remove later
            console.log(JSON.stringify(pmsProposal, null, 4));
        }
        pmsCount++;
        pmsAmount += pmsProposal.amount;
    }

    let localMismatchCount = 0;
    let localMismatchAmount = 0;
    let localCount = 0;
    let localAmount = 0;
    for (let i = 0, iLength = localProposals.length; i < iLength; i++) {
        let localProposal = localProposals[i];
        localProposal.createTime = getPMSTimeFormat(localProposal.createTime);
        if (!localProposal.matched) {
            mismatches.push({proposalId: localProposal.proposalId, missing: "PMS", createTime: localProposal.createTime, amount: localProposal.data.amount});
            localMismatchCount++;
            localMismatchAmount += localProposal.data.amount;
        }
        localCount++;
        localAmount += localProposal.data.amount;
    }

    return {
        mismatches: mismatches,
        pmsMismatchCount: pmsMismatchCount,
        pmsMismatchAmount: pmsMismatchAmount,
        fpmsMismatchCount: localMismatchCount,
        fpmsMismatchAmount: localMismatchAmount,
        pmsCount: pmsCount,
        pmsAmount: pmsAmount,
        fpmsCount: localCount,
        fpmsAmount: localAmount
    };
}

function getPMSTimeFormat(date) {
    return moment(date).tz('Asia/Singapore').format("YYYY-MM-DD HH:mm:ss");
}

module.exports = dbPaymentReconciliation;