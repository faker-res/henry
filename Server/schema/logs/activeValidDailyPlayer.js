const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// This collection records all rewards that were awarded to players / partners
const activeValidDailyPlayerSchema = new Schema ({
    // Platform Id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // Date of reward
    createTime: {type: Date, default: Date.now},
    // Period
    period: {type: Number, required: true},
    // Start active time
    startTime: {type: Date, required: true},
    // End active time
    endTime: {type: Date, required: true},
    // Active player list
    activePlayerObjIds: []
});

activeValidDailyPlayerSchema.index({platform: 1, period: 1, startTime: 1, endTime: 1}, {unique: true});

module.exports = activeValidDailyPlayerSchema;