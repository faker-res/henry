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
        proposalData.data.remark = proposalData.data.remark ? proposalData.data.remark + " Proposal No: " + proposalData.proposalId : "Proposal No: " + proposalData.proposalId;
        let logData = {
            rewardPointsObjId: proposalData.data.playerRewardPointsObjId,
            category: isPeriodPointConversion ? constRewardPointsLogCategory.PERIOD_POINT_CONVERSION : constRewardPointsLogCategory.EARLY_POINT_CONVERSION,
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
    }

};

module.exports = dbRewardPointsLog;
