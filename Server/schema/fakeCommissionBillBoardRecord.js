"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// partner commission bill board calculation (mode 6 only)
let fakeCommissionBillBoardRecordSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    // insert date
    insertDate: {type: Date},
    // insert period (refer to constPartnerBillBoardPeriod)
    period: {type: Number}
    // name
    name: {type: String},
    // commission amount
    commissionAmount: {type: Number},
    // use fluctuation through time
    useFluctuation: {type: Boolean},
    // the lowest amount of fluctuation
    fluctuationLow: {type: Number},
    // the highest amount of fluctuation
    fluctuationHigh: {type: Number},
    // fluctuate date
    flucOnMonday: {type: Boolean},
    flucOnTuesday: {type: Boolean},
    flucOnWednesday: {type: Boolean},
    flucOnThursday: {type: Boolean},
    flucOnFriday: {type: Boolean},
    flucOnSaturday: {type: Boolean},
    flucOnSunday: {type: Boolean},
});

fakeCommissionBillBoardRecordSchema.index({platform: 1, period: 1});

module.exports = fakeCommissionBillBoardRecordSchema;