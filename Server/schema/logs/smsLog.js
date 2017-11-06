var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// SMS log (change if needed)
var smsLogSchema = new Schema ({
    //type: player or partner
    type: {type: String, required: true},
    playerId: {type: String, required: false, index: true},
    partnerId: {type: String, required: false, index: true},
    // recipient name will be either player name or partner name (or name that failed registration tried)
    recipientName: {type: String, required: false},
    // purpose of the sms
    purpose: String,
    channel: {type: Number, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', required: false},
    platformId: {type: String, required: false},
    //Admin LoginId.
    admin: {type: Schema.ObjectId, ref: 'admin', required: false},
    adminName: {type: String, required: false},
    // Data sent
    tel: {type: String, required: true, index: true},
    //Action
    message: {type: String, required: true},
    // input device that trigger this sms
    inputDevice: Number,
    // relevant proposal id (if exist)
    proposalId: String,
    // Date of creation
    createTime: {type: Date, default: Date.now},
    //sms sending status: success or fail
    status: {type: String, required: true, enum: ['success', 'failure']},
    error: {type: Schema.Types.Mixed, required: false},
    // is this sms code used
    used: {type: Boolean, default: false}
});

module.exports = smsLogSchema;