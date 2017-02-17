/******************************************************************
 *        Project
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
/******************************************************************
 *  Fantasy Player Management Tool
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var bcrypt = require('bcrypt');
var constServerCode = require('../const/constServerCode');
var dbApiResponseTimeLog = {

    getApiLoggerAllServiceName: function () {
        return dbConfig.collection_apiResponseTimeLog.distinct('service').exec();
    },

    getApiLoggerAllFunctionNameOfService: function (query) {
        return dbConfig.collection_apiResponseTimeLog.distinct('functionName', {service: query}).exec();
    },

    getApiResponseTimeQuery: function (startDate, endDate, service, functionName) {
        var matchOption = {
            createTime: {$gte: startDate, $lt: endDate},
            service: service,
            functionName: functionName
        }
        return dbConfig.collection_apiResponseTimeLog.find(matchOption, {createTime: 1, _id: 1, responseTime: 1});
    }


};
module.exports = dbApiResponseTimeLog;