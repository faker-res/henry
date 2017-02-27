/******************************************************************
 *  Fantasy Player Management Tool
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var dbSettlementLog = {

    getLastSettlementRecord: function (query, num) {
        num = num || 0;
        return dbConfig.collection_settlementLog.find(query).sort({'createTime': -1}).limit(num).exec();
    },

};
module.exports = dbSettlementLog;