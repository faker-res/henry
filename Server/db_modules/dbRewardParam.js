/**
 * Params used to calculate bonus for the reward
 */
var dbconfig = require('./../modules/dbproperties');

var dbRewardParam = {

    /**
     * Get a reward Param
     * @param {String} - query has the _id or name of the rewardParam schema
     */
    getRewardParam: function (query) {
        return dbconfig.collection_rewardParam.findOne(query).exec();
    },

    /**
     * Delete a reward Param
     * @param {json} - the _id  the rewardParam
     */
    deleteRewardParamByIds: function (ids) {
        return dbconfig.collection_rewardParam.remove({_id: {$in: ids}});
    }
};

module.exports = dbRewardParam;