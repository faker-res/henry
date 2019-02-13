var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// AdminActionLog
var systemLogSchema = new Schema ({
    //Admin LoginId
    adminName: {type: String, index: true},
    //Action
    action: String,
    // Data sent
    data: JSON,
    // Date of action
    operationTime: {type: Date, default: Date.now, index: true},
    //Level of the log: such as "info", "error"
    level: String,
    //Any associated error
    error: {type: String, required: false},
    //platforms of the admin creating the log
    platforms: [{type: Schema.ObjectId, ref: 'platform'}],
    //local Ip address
    localIp: String
});

module.exports = systemLogSchema;
