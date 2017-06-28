var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// api log 会员记事功能
var apiLogSchema = new Schema({
    // playerId
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true},
    // action
    action: String,
    // Date of action
    operationTime: {type: Date, default: Date.now},
    // IP address used when taking the action
    ipAddress: String
});

module.exports = apiLogSchema;