"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let auditManualRewardLogSchema = new Schema({
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
    // reward amount
    rewardAmount: {type: String},
    creator: {type: String},
    // proposal's remark
    remarks: {type: String},

    emailSentTimes: {type: Number, default: 0},
});

module.exports = auditManualRewardLogSchema;
