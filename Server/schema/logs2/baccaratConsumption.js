"use strict";
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let baccaratConsumptionSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, required: true, index: true},
    // player obj id
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true},
    // provider obj id
    provider: {type: Schema.ObjectId, index: true},
    // provider name (e.g. EBET, AG, BYLIVE)
    providerName: {type: String, index: true},
    // gameRound
    roundNo: {type: String},
    //bonus amount
    bonusAmount: {type: Number, default: 0},
    //total amount for statistics
    validAmount: {type: Number, required: true, default: 0, index: true},
    // host result score
    hostResult: {type: Number, index: true},
    // player result score
    playerResult: {type: Number, index: true},
    // host pair result score
    hostPairResult: {type: String, index: true},
    // player pair result score
    playerPairResult: {type: String, index: true},
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
    consumption: {type: Schema.ObjectId, index: true},
    // used
    bUsed: {type: Boolean, default: false, index: true},
});

module.exports = baccaratConsumptionSchema;