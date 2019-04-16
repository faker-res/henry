var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var apiResponseLog = new Schema({
    // api service name
    serviceName: {type: String, required: true},
    // api function name
    functionName: {type: String, required: true},
    // create time
    createTime: {type: Date, default: Date.now},
    // whether this code is used
    totalSecond: {type: Number, required: true},

});

module.exports = apiResponseLog;