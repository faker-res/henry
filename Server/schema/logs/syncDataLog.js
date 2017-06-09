var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Sync data log
var syncDataLogSchema = new Schema ({
    //Service name
    service: {type: String, required: true},
    //function name
    functionName: {type: String, required: true},
    // request Data
    data: {type: JSON, required: true},
    // Date of action
    createTime: {type: Date, default: Date.now}
});

module.exports = syncDataLogSchema;
