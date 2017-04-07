var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// SMS log (change if needed)
var smsLogSchema = new Schema ({
    //type: player or partner
    type: {type: String, required: true},
    playerId: {type: String, required: false, index: true},
    partnerId: {type: String, required: false, index: true},
    recipientName: {type: String, required: false},
    channel: {type: Number, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', required: false},
    platformId: {type: String, required: false},
    //Admin LoginId.
    admin: {type: Schema.ObjectId, ref: 'admin', required: true},
    adminName: {type: String, required: true},
    // Data sent
    tel: {type: String, required: true},
    //Action
    message: {type: String, required: true},
    // Date of creation
    createTime: {type: Date, default: Date.now},
    //sms sending status: success or fail
    status: {type: String, required: true, enum: ['success', 'failure']},
    error: {type: Schema.Types.Mixed, required: false},
});

module.exports = smsLogSchema;