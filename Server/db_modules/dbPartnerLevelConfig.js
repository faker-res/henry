/******************************************************************
 *        Project
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/**
 * Created by hninpwinttin on 29/1/16.
 */
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
