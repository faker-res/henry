/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Data migration error log
var dataMigrationErrorLogSchema = new Schema ({
    //Service name
    service: String,
    //function name
    functionName: String,
    // request Data
    data: JSON,
    //response error data,
    error: JSON,
    // Date of action
    createTime: {type: Date, default: Date.now}
});

module.exports = dataMigrationErrorLogSchema;
