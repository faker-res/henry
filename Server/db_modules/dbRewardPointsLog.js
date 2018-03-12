var Q = require('q');
var errorUtils = require('../modules/errorUtils');

const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');

var dbConfig = require('../modules/dbproperties');
var dbLogger = require('../modules/dbLogger');

var dbRewardPointsLog = {

    getRewardPointsLogsQuery: (data) => {
        let rewardPointsLog = dbConfig.collection_rewardPointsLog.find(data.query)
            .populate({path: "rewardPointsTaskObjId", model: dbConfig.collection_rewardTask})
            .sort(data.sort).skip(data.index).limit(data.limit).lean().exec();

        let rewardPointsLogCount = dbConfig.collection_rewardPointsLog.find(data.query).count();

        return Q.all([rewardPointsLog, rewardPointsLogCount]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

    updateConvertRewardPointsLog: (proposalId, status, rewardPointsTaskObjId) => {
        return dbConfig.collection_rewardPointsLog.update({proposalId: proposalId}, {
            status: status,
            rewardPointsTaskObjId: rewardPointsTaskObjId
        }).exec();
    },

    createRewardPointsLogByProposalData: (proposalData) => {
        let isPeriodPointConversion = proposalData.creator.type == 'system';
        proposalData.data.category = proposalData.data.hasOwnProperty('category')
            ? proposalData.data.category : isPeriodPointConversion
                ? constRewardPointsLogCategory.PERIOD_POINT_CONVERSION : constRewardPointsLogCategory.EARLY_POINT_CONVERSION;
        proposalData.data.remark = proposalData.data.remark
            ? proposalData.data.remark + " Proposal No: " + proposalData.proposalId : "Proposal No: " + proposalData.proposalId;
        proposalData.data.convertedRewardPoints = proposalData.data.convertedRewardPoints || 0;

        let logData = {
            rewardPointsObjId: proposalData.data.playerRewardPointsObjId,
            category: proposalData.data.category,
            oldPoints: proposalData.data.beforeRewardPoints,
            newPoints: proposalData.data.afterRewardPoints,
            playerName: proposalData.data.playerName,
            playerLevelName: proposalData.data.playerLevelName,
            amount: -proposalData.data.convertedRewardPoints,
            remark: proposalData.data.remark,
            status: constRewardPointsLogStatus.PENDING,
            userAgent: proposalData.inputDevice,
            currentDayAppliedAmount: proposalData.data.currentDayAppliedAmount,
            maxDayApplyAmount: proposalData.data.maxDayApplyAmount,
            proposalId: proposalData.proposalId,
            creator: proposalData.creator.name
        };
        dbLogger.createRewardPointsLog(logData);
    },

    getPlayerRewardPointsLog: (playerName, index, limit, sortCol) => {
        index = index || 0;
        sortCol = sortCol || {createTime: -1};

        let query = {
            playerName: playerName,
        };

        let a = dbConfig.collection_rewardPointsLog.find(query).count();
        let b = dbConfig.collection_rewardPointsLog.find(query).sort(sortCol).skip(index).limit(limit).lean();
        return Promise.all([a, b]).then(data => {
            return({total: data[0], data: data[1]});
        });
    },
};

module.exports = dbRewardPointsLog;
