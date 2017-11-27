var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var apiResponseTimeLogSchema = new Schema ({
    //api service name
    service: {type: String, index: true},
    //api function name
    functionName: {type: String, index: true},
    // request Data
    requestData: JSON,
    // response Data
    responseData: JSON,
    // Date of action
    createTime: {type: Date, default: Date.now, index: true},
    // response time
    responseTime: Number,
});

apiResponseTimeLogSchema.index({service: 1, functionName: 1, createTime: 1});

module.exports = apiResponseTimeLogSchema;


