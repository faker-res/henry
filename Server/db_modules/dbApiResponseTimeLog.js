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

    getApiResponseTimeQuery: function (startDate, endDate, service, functionName, providerId) {
        var matchOption = {
            createTime: {$gte: startDate, $lt: endDate},
            service: service,
            functionName: functionName
        }
        if (providerId != '' && providerId != null) {
            matchOption['requestData.providerId'] = providerId
        }
        return dbConfig.collection_apiResponseTimeLog.find(matchOption, {createTime: 1, _id: 1, responseTime: 1});
    }


};
module.exports = dbApiResponseTimeLog;