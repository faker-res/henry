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
};
module.exports = dbPartnerLevelConfig;
