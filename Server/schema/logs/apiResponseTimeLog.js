/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var apiResponseTimeLogSchema = new Schema ({
    //api service name
    service: {type: String},
    //api function name
    functionName: {type: String},
    // request Data
    requestData: JSON,
    // response Data
    responseData: JSON,
    // Date of action
    createTime: {type: Date, default: Date.now},
    // response time
    responseTime: Number,
});

module.exports = apiResponseTimeLogSchema;