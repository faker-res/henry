const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let partnerCommSettLog = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // Settlement mode
    settMode: {type: Number, required: true},
    // Period start time
    startTime: {type: Date, required: true},
    // Period end time
    endTime: {type: Date, required: true},
    // Is settled
    isSettled: {type: Boolean, default: false},
    // Is skipped
    isSkipped: {type: Boolean, default: false},
    // total partner (include disabled permission)
    totalPartnerCount: {type: Number, default: 0},
    // total partner (permission not disable only)
    totalValidPartnerCount: {type: Number, default: 0},
});

partnerCommSettLog.index({platform: 1, settMode: 1, startTime: 1, endTime: 1});
partnerCommSettLog.index({platform: 1, isSettled: 1});

module.exports = partnerCommSettLog;