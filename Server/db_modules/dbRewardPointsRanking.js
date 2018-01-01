const dbConfig = require('./../modules/dbproperties');
const Q = require("q");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
var dbRewardPointsRanking = {

    getRewardPoints: (platformObjId, index, limit, sortCol) => {
        let rewardPoints = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId,
            playerObjId : {$exists: true, $ne: null}
        }).sort(sortCol).skip(index).limit(limit)
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel, select: 'name'}).lean();

        let rewardPointsCount = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId,
            playerObjId : {$exists: true, $ne: null}
        }).count();
        return Q.all([rewardPoints, rewardPointsCount]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

    getRewardPointsRandom: (platformObjId, index, limit, sortCol) => {
        let rewardPoints = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId
        }).sort(sortCol).skip(index).limit(limit)
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel, select: 'name'}).lean();

        let rewardPointsCount = dbConfig.collection_rewardPoints.find({
            platformObjId: platformObjId
        }).count();
        return Q.all([rewardPoints, rewardPointsCount]).then(result => {
            return {data: result[0], size: result[1]};
        })
    },

    // for API use only
    getRewardPointsRanking: (platformId, totalRank) => {
        totalRank = parseInt(totalRank,10);
        let limit = !isNaN(totalRank) && totalRank > 0 ? totalRank : 10;
        let sortCol = {points: -1, lastUpdate: 1};
        let rewardPoints = dbConfig.collection_platform.findOne({
            platformId: platformId
        }, {
            _id:1
        }).lean().then(
            platform => {
                if(platform && platform._id) {
                    return dbConfig.collection_rewardPoints.find({
                        platformObjId: platform._id
                    }, {
                        playerName: 1,
                        playerLevel: 1,
                        points: 1,
                        lastUpdate: 1,
                        // createTime: 1,
                        _id: 0
                    }).sort(sortCol).limit(limit)
                        .populate({path: "playerLevel", model: dbConfig.collection_playerLevel, select: 'name'}).lean();
                }
            }
        ).then(
            rewardPointsRanking => {
                if(rewardPointsRanking && rewardPointsRanking.length > 0) {
                    rewardPointsRanking.forEach(rank => {
                        //censor playerName start
                        let censoredName, front, censor = "***", rear;
                        front = rank.playerName.substr(0,2);    // extract first 2 char
                        rear = rank.playerName.substr(5);       // extract all AFTER the 5th char (exclusive of the 5th, inclusive of the 6th)
                        censoredName = front + censor + rear;   // concat all
                        censoredName = censoredName.substr(0, rank.playerName.length); // extract original playerName's length, to maintain actual length
                        rank.playerName = censoredName;
                        //censor playerName end
                        rank.playerLevel = rank.playerLevel.name;
                    });
                    return rewardPointsRanking;
                }
            }
        );

        return Q.all([rewardPoints]).then(result => {
            return {data: result[0]};
        })
    },


    updateRewardPointsRankingRandom: (query, rewardPointsRanking) => {
        return dbConfig.collection_rewardPoints.findOneAndUpdate(query,
            {$set:rewardPointsRanking},
            {new: true});
    },

    deleteRewardPointsRankingRandom: (data) => {
        return dbConfig.collection_rewardPoints.remove({_id: ObjectId(data._id)});
    },

    getRewardPointsRandomDataConfig: (platformObjId) => {
        return dbConfig.collection_rewardPointsRandomDataConfig.findOne({
            platformObjId: platformObjId
        }).lean();
    },

    upsertRewardPointsRandomDataConfig: (data) => {
        return dbConfig.collection_rewardPointsRandomDataConfig.findOneAndUpdate({platformObjId: ObjectId(data.platformObjId)},
            {$set:data},
            {upsert: true, new: true});
    },

    insertRewardPointsRandom: (data) => {
        return dbConfig.collection_rewardPoints.insertMany(data);
    },


};
module.exports = dbRewardPointsRanking;