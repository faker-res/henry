var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbRewardPoints = {

    getRewardPoints: (platformObjId, index, limit, sortCol) => {
        var a = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId
        }).sort(sortCol).skip(index).limit(limit).lean();

        var b = dbConfig.collection_rewardPoints.find({platformObjId: platformObjId}).count();
        return Q.all([a, b]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

    updateRewardPointsRanking: (rewardPointsRanking) => {
        return dbConfig.collection_rewardPoints.findOneAndUpdate({platformObjId: ObjectId(rewardPointsRanking.platformObjId), playerObjId: ObjectId(rewardPointsRanking.playerObjId)},
            {$set:rewardPointsRanking},
            {new: true});
    }

};
module.exports = dbRewardPoints;