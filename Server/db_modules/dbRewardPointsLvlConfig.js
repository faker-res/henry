var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbRewardPointsLvlConfig = {

    getRewardPointsLvlConfig: (platformObjId) => {
        return dbConfig.collection_rewardPointsLvlConfig.findOne({
            platformObjId: platformObjId
        });
    },

    upsertRewardPointsLvlConfig: (rewardPointsLvlConfig) => {
        return dbConfig.collection_rewardPointsLvlConfig.findOneAndUpdate({platformObjId: ObjectId(rewardPointsLvlConfig.platformObjId)},
            {$set:rewardPointsLvlConfig},
            {upsert: true, new: true});
    }

};
module.exports = dbRewardPointsLvlConfig;