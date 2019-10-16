"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// partner commission bill board calculation (mode 6 only)
let commissionBBSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    // last calculate time
    lastCalculate: {type: Date},
    // last finished calculation
    lastFinished: {type: Date},
    // period (based on constPartnerBillBoardPeriod)
    period: {type: Number},
});

commissionBBSchema.index({platform: 1, period: 1, lastCalculate: 1});
commissionBBSchema.index({platform: 1, period: 1}, {unique: true});

module.exports = commissionBBSchema;