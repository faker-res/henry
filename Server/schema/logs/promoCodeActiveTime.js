const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// This collection records all rewards that were awarded to players / partners
const promoCodeActiveTimeSchema = new Schema ({
    // Platform Id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // Date of reward
    createTime: {type: Date, default: Date.now},
    // Start active time
    startTime: {type: Date},
    // End active time
    endTime: {type: Date}
});

promoCodeActiveTimeSchema.index({platform: 1, startTime: 1, endTime: 1}, {unique: true});

module.exports = promoCodeActiveTimeSchema;
