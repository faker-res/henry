'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsDistributedPhoneSchema = new Schema({
    // platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // ts List that it based on
    tsPhoneList: {type: Schema.ObjectId, ref: 'tsPhoneList', index: true},
    // ts distributed List that it based on
    tsDistributedPhoneList: {type: Schema.ObjectId, ref: 'tsDistributedPhoneList', index: true},
    // ts phone that it based on
    tsPhone: {type: Schema.ObjectId, ref: 'tsPhone', index: true},
    // assignee (whose phone is this)
    assignee: {type: Schema.Types.ObjectId, ref: 'admin', index: true},
    // time that it can be start using
    startTime: {type: Date, index: true, default: new Date()},
    // time that it expired - same with distributedEndTime in tsPhone.js
    endTime: {type: Date, required: true, index: true},

});

module.exports = tsDistributedPhoneSchema;

