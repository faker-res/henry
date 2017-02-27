
var dbconfig = require('./../modules/dbproperties');
var encrypt = require('./../modules/encrypt');
var dbRewardCondition = require('./dbRewardCondition');

var Q = require("q");

var dbRewardType = {

    /**
     * Get all reward types
     */
    getAllRewardType: function () {
        return dbconfig.collection_rewardType.find({})
            .populate({path: "params", model: dbconfig.collection_rewardParam})
            .populate({path: "condition", model: dbconfig.collection_rewardCondition}).exec();
    },

    /**
     * Get reward type by query
     * @param {Object} query - The query
     */
    getRewardType: function(query){
        return dbconfig.collection_rewardType.findOne(query).exec();
    }

};

module.exports = dbRewardType;