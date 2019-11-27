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
    purpose: {type: String, index: true},
    channel: {type: Number, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', required: false, index: true},
    platformId: {type: String, required: false, index: true},
    //Admin LoginId.
    admin: {type: Schema.ObjectId, ref: 'admin', required: false},
    adminName: {type: String, required: false},
    // Data sent
    tel: {type: String, required: true, index: true},
    // is same phone number already exist in real player
    phoneStatus: {type: Number},
    //Action
    message: {type: String, required: true},
    // input device that trigger this sms
    inputDevice: Number,
    // relevant proposal id (if exist)
    proposalId: String,
    // Date of creation
    createTime: {type: Date, default: Date.now, index: true},
    // sms sending status: success or fail
    status: {type: String, required: true, enum: ['success', 'failure'], index: true},
    // sms sending error
    error: {type: Schema.Types.Mixed, required: false},
    // is this sms code used
    used: {type: Boolean, default: false},
    // sms code invalidated (due to exceeding amount of failing tries)
    invalidated: {type: Boolean, default: false},
    // sms log data
    data: {type: JSON, default: {}},
    // ts distributed phone (for ts only)
    tsDistributedPhone: {type: Schema.ObjectId, ref: 'tsDistributedPhone', index: true},
    // IP Address
    ipAddress: {type: String, index: true},
    // is used by player
    isPlayer: {type: Boolean, default: true},
    // is used by partner
    isPartner: {type: Boolean, default: false},
    // is use voice code verification
    useVoiceCode: {type: Boolean, default: false},
});

smsLogSchema.index({"data.dxMission": 1});
smsLogSchema.index({"data.dxMission": 1, "status": 1, "createTime": 1});

module.exports = smsLogSchema;
