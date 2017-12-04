var Q = require('q');
var errorUtils = require('../modules/errorUtils');
var dbConfig = require('../modules/dbproperties');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var dbRewardPoints = {
    getRewardPointsByPlayerObjId: (PlayerObjId) => {
        return dbConfig.collection_rewardPoints.findOne({
            playerObjId: ObjectId(PlayerObjId)
        });
    },
};

module.exports = dbRewardPoints;
