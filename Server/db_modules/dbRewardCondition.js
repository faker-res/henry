var dbconfig = require('./../modules/dbproperties');

var dbRewardCondition = {

    /**
     * Create a new rewardCondition
     * @param {json} rewardConditionData - The data of the rewardCondition. Refer to rewardCondition schema.
     */
    createRewardCondition: function (rewardConditionData) {
        var rewardCondition = new dbconfig.collection_rewardCondition(rewardConditionData);
        return rewardCondition.save();
    },

    /**
     * Get a reward Condition
     * @param {json} - the _id or name of the rewardCondition schema
     */
    getRewardCondition: function (query) {
        return dbconfig.collection_rewardCondition.findOne(query).exec();
    },

    /**
     * Delete a reward Condition
     * @param {json} - the _id of the rewardCondition schema
     */
    deleteRewardConditionByIds: function (ids) {
        return dbconfig.collection_rewardCondition.remove({_id: {$in: ids}}).exec();
    }

};

module.exports = dbRewardCondition;