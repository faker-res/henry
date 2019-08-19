let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let referralLog = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // referral
    referral: {type: Schema.ObjectId, ref: 'player', index: true},
    // player
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // Date time added
    createTime: {type: Date, default: Date.now, index: true},
    // referral period
    referralPeriod: {type: String, index: true},
    // bind referral valid end time
    validEndTime: {type: Date, default: null, index: true},
    // bind referral status
    isValid: {type: Boolean, default: true, index: true},
});

module.exports = referralLog;