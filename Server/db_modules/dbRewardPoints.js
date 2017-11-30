var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbRewardPoints = {

    getRewardPoints: (platformObjId, index, limit, sortCol) => {
        var a = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId,
            playerObjId : {$exists: true, $ne: null}
        }).sort(sortCol).skip(index).limit(limit)
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel, select: 'name'}).lean();

        var b = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId,
            playerObjId : {$exists: true, $ne: null}
        }).count();
        return Q.all([a, b]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

    getRewardPointsRandom: (platformObjId, index, limit, sortCol) => {
        var a = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId
        }).sort(sortCol).skip(index).limit(limit)
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel, select: 'name'}).lean();

        var b = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId
        }).count();
        return Q.all([a, b]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

    updateRewardPointsRanking: (rewardPointsRanking) => {
        return dbConfig.collection_rewardPoints.findOneAndUpdate({platformObjId: ObjectId(rewardPointsRanking.platformObjId), playerObjId: ObjectId(rewardPointsRanking.playerObjId)},
            {$set:rewardPointsRanking},
            {new: true});
    },

    getRewardPointsRandomDataConfig: (platformObjId) => {
        return dbConfig.collection_rewardPointsRandomDataConfig.find({
            platformObjId: platformObjId
        }).lean();
    },

    upsertRewardPointsRandomDataConfig: (data) => {
        return dbConfig.collection_rewardPointsRandomDataConfig.findOneAndUpdate({platformObjId: ObjectId(data.platformObjId)},
            {$set:data},
            {upsert: true, new: true});
    },

    insertRewardPointsRandom: (data) => {
        return dbConfig.collection_rewardPoints.insertMany(data, (err, docs) => {
            if (err) {
                return err;
            } else {
                return docs;
            }
        });
    },


};
module.exports = dbRewardPoints;