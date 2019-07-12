let dbConfig = require('./../modules/dbproperties');
let Q = require("q");
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

let dbRewardPointsEvent = {

    getRewardPointsEvent: (platformObjId) => {
        return dbConfig.collection_rewardPointsEvent.find({
            platformObjId: platformObjId
        }).lean();
    },

    getAllRewardPointsEvent: () => {
        return dbConfig.collection_rewardPointsEvent.find({}).lean();
    },

    getRewardPointsEventById: (rewardPointsEventId) => {
        return dbConfig.collection_rewardPointsEvent.findOne({
            _id: rewardPointsEventId
        }).lean();
    },

    getRewardPointsEventByCategory: (platformObjId, rewardPointsEventCategory) => {
        return dbConfig.collection_rewardPointsEvent.find({
            platformObjId: platformObjId,
            category: rewardPointsEventCategory
        }).lean().sort({ index: 1 });
    },

    getRewardPointsEventByCategoryWithPopulatePlayerLevel: (platformObjId, rewardPointsEventCategory) => {
        return dbConfig.collection_rewardPointsEvent.find({
            platformObjId: platformObjId,
            category: rewardPointsEventCategory
        }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({ index: 1 });
    },

    createRewardPointsEvent: (data) => {
        let rewardPoints = new dbConfig.collection_rewardPointsEvent(data);
        return rewardPoints.save();
    },

    updateRewardPointsEvent: (updateData) => {
        return dbConfig.collection_rewardPointsEvent.findOneAndUpdate({'_id': updateData._id}, updateData).lean().exec();
    },

    removeRewardPointsEventById: function (id) {
        return dbConfig.collection_rewardPointsEvent.remove({_id: id}).exec();
    },

};
module.exports = dbRewardPointsEvent;