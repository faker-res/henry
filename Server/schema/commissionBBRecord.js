"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// partner commission bill board calculation (mode 6 only)
let commissionBBRecordSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    // period (based on constPartnerBillBoardPeriod)
    period: {type: Number},
    // calculate time relevant to
    lastCalculate: {type: Date},
    // partner name
    name: {type: String},
    // total commission amount
    amount: {type: Number},
    // fake record source (if not exist, is real record)
    fakeSource: {type: Schema.ObjectId, ref: 'fakeCommissionBillBoardRecord'},
    // remarks
    remarks: {type: String},
});

commissionBBRecordSchema.index({platform: 1, period: 1, lastCalculate: -1, amount: -1, name: 1});
commissionBBRecordSchema.index({platform: 1, period: 1, lastCalculate: -1, fakeSource: 1});

module.exports = commissionBBRecordSchema;