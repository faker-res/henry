"use strict";
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let baccaratConsumptionSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, required: true, index: true},
    // provider obj id
    provider: {type: Schema.ObjectId, index: true},
    // provider name (e.g. EBET, AG, BYLIVE)
    providerName: {type: String, index: true},
    // host result score
    hostResult: {type: Number, index: true},
    // player result score
    playerResult: {type: Number, index: true},
    // bet details
    betDetails: [{
        _id: false,
        separatedBetType: {type: String, index: true},
        separatedBetAmount: {type: Number, index: true}
    }],
    // payment time
    createTime: {type: Date, default: Date.now, index: true},
    // record insert time
    insertTime: {type: Date, default: Date.now},
    // consumption obj id
    consumption: {type: Schema.ObjectId, index: true}
});

module.exports = baccaratConsumptionSchema;