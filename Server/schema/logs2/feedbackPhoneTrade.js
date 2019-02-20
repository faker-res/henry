'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let feedbackPhoneTradeSchema = new Schema({
    // encoded phone number (e.g. '139****5588')
    encodedPhoneNumber: {type: String, index: true},
    // encrypted phone number
    phoneNumber: {type: String, index: true},
    // platform obj id that the phone originated from
    sourcePlatform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // the platform that the phone traded/exported to (only exist after it traded to new platform)
    targetPlatform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // the time that the trade/export happen (only exist after it traded to new platform)
    createTime: {type: Date, default: Date.now, index: true},
    // total top up times
    topUpTimes: {type: Number, min: 0, default: 0, index: true},
    // last login logout time
    lastAccessTime: {type: Date},
    // Detail
    playerName: {type: String, required: true},
    realName: {type: String},
    gender: {type: String},
    dob: {type: String},
    wechat: {type: String},
    qq: {type: String},
    email: {type: String},
    remark: {type: String},
    // is record transfer to tsPhoneList
    isImportedPhoneList: {type: Boolean, default:false, index: true}
});

module.exports = feedbackPhoneTradeSchema;

feedbackPhoneTradeSchema.index({sourcePlatform: 1, targetPlatform: 1, playerName: 1}, {unique: true});