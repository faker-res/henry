let dbConfig = require('./../modules/dbproperties');
let Q = require("q");
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;
let dbRewardPointsEvent = {

        getRewardPointsEvent: (platformObjId) => {
            return dbConfig.collection_rewardPointsEvent.find({
                platformObjId: platformObjId
            });
        },

        getRewardPointsEventById: (rewardPointsEventId) => {
            return dbConfig.collection_rewardPointsEvent.findOne({
                _id: rewardPointsEventId
            });
        },

        getRewardPointsEventByCategory: (platformObjId, rewardPointsEventCategory) => {
            return dbConfig.collection_rewardPointsEvent.find({
                platformObjId: platformObjId,
                category: rewardPointsEventCategory
            }).sort({index: 1});
        },

        createRewardPointsEvent: (data) => {
            let rewardPoints = new dbConfig.collection_rewardPointsEvent(data);
            return rewardPoints.save();
        },

        updateRewardPointsEvent: (updateData) => {
            return dbConfig.collection_rewardPointsEvent.findOneAndUpdate({'_id': updateData._id}, updateData).exec();
        },

        removeRewardPointsEventById: function (id) {
            return dbConfig.collection_rewardPointsEvent.remove({_id: id}).exec();
        },

    }
;
module.exports = dbRewardPointsEvent;