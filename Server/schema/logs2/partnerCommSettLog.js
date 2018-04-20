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
});

partnerCommSettLog.index({platform: 1, settMode: 1, startTime: 1, endTime: 1});
partnerCommSettLog.index({platform: 1, isSettled: 1});

module.exports = partnerCommSettLog;