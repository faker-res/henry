var dbconfig = require('./../modules/dbproperties');
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
        return dbconfig.collection_partnerLevelConfig.findOneAndUpdate(query, updateData).exec();
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
};
module.exports = dbPartnerLevelConfig;
