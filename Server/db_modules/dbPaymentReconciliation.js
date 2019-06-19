const pmsAPI = require("../externalAPI/pmsAPI.js");
const dbconfig = require("../modules/dbproperties");
const dbUtility = require("../modules/dbutility");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const RESTUtils = require('../modules/RESTUtils');

const dbPaymentReconciliation = {
    getBonusReport: function (platformList, option, startTime, endTime) {
        let timeFrames = sliceTimeFrameToDaily(startTime, endTime);
        let name = constProposalType.PLAYER_BONUS;
        let platformObjIds;
        let platformListQuery;
        let proposalTypeQuery;
        let platformIds = [];
        let platformRecord = [];

        if(platformList && platformList.length > 0) {
            platformObjIds = {$in: platformList.map(item=>{return ObjectId(item)})};
            platformListQuery = {_id: platformObjIds};
            proposalTypeQuery = {platformId: platformObjIds, name: name};
        } else {
            platformListQuery = {};
            proposalTypeQuery = {name: name};
        }

        return dbconfig.collection_platform.find(platformListQuery, {platformId: 1, name: 1}).then(
            platformData => {
                if (platformData && platformData.length > 0) {
                    for (let i = 0, len = platformData.length; i < len; i++) {
                        platformIds.push(platformData[i].platformId);
                        platformRecord.push({platformId: platformData[i].platformId, platformName: platformData[i].name});
                    }

                    return dbconfig.collection_proposalType.find(proposalTypeQuery).lean();

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
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

                    let reqData = {
                        platformIds: platformIds,
                        startTime: getPMSTimeFormat(start),
                        endTime: getPMSTimeFormat(end)
                    };

                    let pmsProm = RESTUtils.getPMS2Services("postCashoutList", reqData).then(
                        data => {
                            if (data && data.data && data.data.length > 0) {
                                data.data.forEach(proposal => {
                                    if (proposal && proposal.platformId && platformRecord && platformRecord.length > 0) {
                                        let index = platformRecord.map(e => e.plaformId).indexOf(proposal.plaformId);

                                        if (index != -1) {
                                            proposal.platformName = platformRecord[index].platformName;
                                        }
                                    }
                                });

                                return data.data;

                            } else {
                                return [];
                            }
                        }
                    );

                    promises.push(pmsProm);

                    let proposalQuery = {
                        type: {$in: proposalTypeIds},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        createTime: {$gte: start, $lte: end},
                        from_old_system: {$exists: false}
                    };

                    let proposalProm = dbconfig.collection_proposal.find(proposalQuery, {proposalId: 1, "data.amount": 1, createTime: 1, amount:1, "data.platformId": 1})
                        .populate({path: "data.platformId", model: dbconfig.collection_platform, select: "_id platformId name"}).lean().then(
                            proposalData => {
                                if (proposalData && proposalData.length > 0) {
                                    proposalData.forEach(proposal => {
                                        proposal.platformId = proposal && proposal.data && proposal.data.platformId && proposal.data.platformId.platformId ? proposal.data.platformId.platformId : '';
                                        proposal.platformName = proposal && proposal.data && proposal.data.platformId && proposal.data.platformId.name ? proposal.data.platformId.name : '';
                                        delete proposal.data.platformId;
                                    });

                                    return proposalData;
                                } else {
                                    return [];
                                }
                            }
                        );

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

    getOnlinePaymentProposalMismatchReport: function (platformList, option, startTime, endTime) {
        // since PMS does not allow having more than 24hr between time frame,
        // FPMS will do the time slicing internally
        let timeFrames = sliceTimeFrameToDaily(startTime, endTime);
        let platformObjIds;
        let platformListQuery;
        let proposalTypeQuery;
        let platformIds = [];
        let platformRecord = [];
        let name;

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

        if(platformList && platformList.length > 0) {
            platformObjIds = {$in: platformList.map(item=>{return ObjectId(item)})};
            platformListQuery = {_id: platformObjIds};
            proposalTypeQuery = {platformId: platformObjIds, name: name};
        } else {
            platformListQuery = {};
            proposalTypeQuery = {name: name};
        }

        return dbconfig.collection_platform.find(platformListQuery, {platformId: 1, name: 1}).then(
            platformData => {
                if (platformData && platformData.length > 0) {
                    for (let i = 0, len = platformData.length; i < len; i++) {
                        platformIds.push(platformData[i].platformId);
                        platformRecord.push({platformId: platformData[i].platformId, platformName: platformData[i].name});
                    }

                    return dbconfig.collection_proposalType.find(proposalTypeQuery).lean();

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
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

                    let reqData = {
                        platformIds: platformIds,
                        startTime: getPMSTimeFormat(start),
                        endTime: getPMSTimeFormat(end)
                    };

                    let serviceName = "postCashinList";
                    if (option === 'online') {
                        serviceName = "postOnlineCashinList";
                    }

                    let pmsProm = RESTUtils.getPMS2Services(serviceName, reqData).then(
                        data => {
                            if (data && data.data && data.data.length > 0) {
                                data.data.forEach(proposal => {
                                    if (proposal && proposal.platformId && platformRecord && platformRecord.length > 0) {
                                        let index = platformRecord.map(e => e.plaformId).indexOf(proposal.plaformId);

                                        if (index != -1) {
                                            proposal.platformName = platformRecord[index].platformName;
                                        }
                                    }
                                });

                                return data.data;

                            } else {
                                return [];
                            }
                        }
                    );

                    promises.push(pmsProm);

                    let proposalQuery = {
                        type: {$in: proposalTypeIds},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        createTime: {$gte: start, $lte: end},
                        from_old_system: {$exists: false}
                    };

                    let proposalProm = dbconfig.collection_proposal.find(proposalQuery, {proposalId: 1, "data.amount": 1, createTime: 1, amount:1, "data.platformId": 1})
                        .populate({path: "data.platformId", model: dbconfig.collection_platform, select: "_id platformId name"}).lean().then(
                            proposalData => {
                                if (proposalData && proposalData.length > 0) {
                                    proposalData.forEach(proposal => {
                                        proposal.platformId = proposal && proposal.data && proposal.data.platformId && proposal.data.platformId.platformId ? proposal.data.platformId.platformId : '';
                                        proposal.platformName = proposal && proposal.data && proposal.data.platformId && proposal.data.platformId.name ? proposal.data.platformId.name : '';
                                        delete proposal.data.platformId;
                                    });

                                    return proposalData;
                                } else {
                                    return [];
                                }
                            }
                        );

                    promises.push(proposalProm);

                    allProm.push(Promise.all(promises));
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

        );
    },
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
    if (!proposals || !proposals[0]) {
        return {};
    }

    if (option === 'online') {
        pmsProposals = proposals[0] || [];
    }
    else if (option === 'bonus') {
        pmsProposals = proposals[0] || [];
    }
    else {
        pmsProposals = proposals[0] || [];
    }

    let localProposals = proposals[1] || [];

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
            mismatches.push({
                proposalId: pmsProposal.proposalId,
                missing: "FPMS",
                createTime: pmsProposal.createTime,
                amount: pmsProposal.amount,
                platformId: pmsProposal.platformId,
                platformName: pmsProposal.platformName
            });
            pmsMismatchCount++;
            pmsMismatchAmount += pmsProposal.amount;
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
            mismatches.push({
                proposalId: localProposal.proposalId,
                missing: "PMS",
                createTime: localProposal.createTime,
                amount: localProposal && localProposal.data && localProposal.data.amount ? localProposal.data.amount : 0,
                platformId: localProposal.platformId,
                platformName: localProposal.platformName
            });
            localMismatchCount++;
            localMismatchAmount += localProposal && localProposal.data && localProposal.data.amount ? localProposal.data.amount : 0;
        }
        localCount++;
        localAmount += localProposal && localProposal.data && localProposal.data.amount ? localProposal.data.amount : 0;
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