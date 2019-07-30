"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let auditCreditChangeLogSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // proposal number
    proposalId: {type: String, index: true},
    // email name extension
    emailNameExtension: {type: String},
    // today large amount no (e.g. first large withdrawal log of today will be 1, second will be 2) base on GMT+8
    todayNo: {type: Number},
    // player name
    playerName: {type: String},
    // player real name
    realName: {type: String},
    // current credit of player before change
    currentCredit: {type: Number},
    // amount changed
    adjustedAmount: {type: Number},
    // creator admin name
    creator: {type: String},
    // proposal's remark
    remarks: {type: String},

    emailSentTimes: {type: Number, default: 0},
});

module.exports = auditCreditChangeLogSchema;
