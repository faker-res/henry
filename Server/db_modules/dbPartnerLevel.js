/**
 * Created by hninpwinttin on 29/1/16.
 */
var dbconfig = require('./../modules/dbproperties');
var dbPartnerLevel = {

    /**
     * Create a partnerLevel
     * @param {json} data - The data of the partner user's level. Refer to PartnerLevel schema.
     */
    createPartnerLevel: function (partnerLevelData) {
        var partnerUserLevel = new dbconfig.collection_partnerLevel(partnerLevelData);
        return partnerUserLevel.save();
    },
    /**
     * Get the information of partner Level by query
     * @param {String} query - Query string
     */
    getPartnerLevel: function (query) {
        return dbconfig.collection_partnerLevel.find(query).sort({value: 1}).exec();
    },
    /**
     * Update the information of the partner Level
     * @param {String} query - Query string
     */
    updatePartnerLevel: function (query, updateData) {
        return dbconfig.collection_partnerLevel.findOneAndUpdate(query, updateData).exec();
    },
    /**
     * Delete the information of partnerLevel by _id
     */
    deletePartnerLevel: function (partnerLevelObjId) {
        return dbconfig.collection_partnerLevel.remove({_id: partnerLevelObjId}).exec();
    },
    /**
     * Get the information of all the partner levels
     */
    getAllPartnerLevels: function () {
        return dbconfig.collection_partnerLevel.find().exec();
    }
};
module.exports = dbPartnerLevel;
