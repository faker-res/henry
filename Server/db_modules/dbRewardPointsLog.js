var Q = require('q');
var errorUtils = require('../modules/errorUtils');
var dbConfig = require('../modules/dbproperties');

var dbRewardPointsLog = {

    getRewardPointsLogsQuery: function (data) {
        let rewardPointsLog =  dbConfig.collection_rewardPointsLog.find(data.query)
            .populate({path: "rewardPointsTaskObjId", model: dbConfig.collection_rewardTask})
            .sort(data.sortCol).skip(data.index).limit(data.limit).lean().exec();

        let rewardPointsLogCount = dbConfig.collection_rewardPointsLog.find(data.query).count();

        return Q.all([rewardPointsLog, rewardPointsLogCount]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

};

module.exports = dbRewardPointsLog;
