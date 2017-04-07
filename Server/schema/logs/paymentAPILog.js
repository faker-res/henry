var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Payment api request log
var paymentAPILogSchema = new Schema ({
    //api service name
    service: {type: String},
    //api function name
    functionName: {type: String},
    // request Data
    requestData: JSON,
    // response Data
    responseData: JSON,
    // create time
    createTime: {type: Date, default: Date.now},
    // request ip
    requestIp: String
});

module.exports = paymentAPILogSchema;