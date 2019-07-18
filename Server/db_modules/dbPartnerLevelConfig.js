var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbPartnerLevelConfig = {

    /**
     * Get the information of partner Level by query
     * @param {String} query - Query string
     */
    getPartnerLevelConfig: function (query) {
        return dbconfig.collection_partnerLevelConfig.find(query).exec();
    },
    /**
     * Update the information of the partner Level
     * @param {String} query - Query string
     */
    updatePartnerLevelConfig: function (query, updateData) {
        return dbconfig.collection_partnerLevelConfig.findOneAndUpdate(query, updateData, {upsert: true}).exec();
    },

    getActiveConfig: function (query) {
        return dbconfig.collection_activeConfig.find(query).lean().then(
            data => {
                return data;
            }
        );
    },

    updateActiveConfig: function (query, updateData) {
        return dbconfig.collection_activeConfig.findOneAndUpdate(query, updateData, {new: true, upsert: true}).lean();
    },

    updatePlatformsActiveConfig: function (query, updateData) {
        if (!(query && query.platform && query.platform.length)) {
            return;
        }

        let promArr = [];
        let isUpdate = false;
        if (Object.keys(updateData).length) {
            for (let key in updateData) {
                if (updateData[key] == null) {
                    delete updateData[key];
                } else if (!isUpdate) {
                    isUpdate = true;
                }
            }
        } else {
            return;
        }
        if (!isUpdate) {
            return;
        }
        query.platform.forEach(
            platform => {
                let updateObj = JSON.parse(JSON.stringify(updateData));
                promArr.push(dbconfig.collection_activeConfig.update({platform: ObjectId(platform)}, updateObj, {upsert: true}))
            }
        )
        return Promise.all(promArr);
    },
};
module.exports = dbPartnerLevelConfig;
