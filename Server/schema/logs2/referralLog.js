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
});

module.exports = referralLog;