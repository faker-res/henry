let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let platformReferralConfigSchema = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // flag to decide whether to use playerId as referral
    enableUseReferralPlayerId: {type: Boolean, default: false},
    // Interval
    referralPeriod: {type: String},
    // limit the number for referral
    referralLimit: {type: Number}
});

module.exports = platformReferralConfigSchema;


