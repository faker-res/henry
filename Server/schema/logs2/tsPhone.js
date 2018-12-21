'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneSchema = new Schema({
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    phoneNumber: {type: String, index: true},
    tsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList', index: true},

    // Detail
    playerName: {type: String},
    realName: {type: String},
    gender: {type: String},
    dob: {type: String},
    wechat: {type: String},
    qq: {type: String},
    email: {type: String},
    remark: {type: String},

    // phone number's province
    province: {type: String, index: true},
    // phone number's city
    city: {type: String, index: true},
    // create time
    createTime: {type: Date, default: Date.now},
    // assign times 过手次数
    assignTimes: {type: Number, default: 0, index: true},
    // time that it expired - same with endTime in tsDistributedPhone.js
    distributedEndTime: {type: Date, index: true},
    // assignee (assign to which admin)
    assignee: [{type: Schema.Types.ObjectId, ref: 'admin', index: true}],
    // registered
    registered: {type: Boolean, default: false, index: true},
    // been added feedback
    isUsed: {type: Boolean, default: false, index: true},
    // been added "successful" feedback
    isSucceedBefore: {type: Boolean, default:false, index: true},
    // been top up
    isTopUp: {type: Boolean, default:false, index: true},
    // been top up multiple times
    isMultipleTopUp: {type: Boolean, default:false, index: true},
    // is valid player
    // isValidPlayer: {type: Boolean, default:false, index: true},

});

module.exports = tsPhoneSchema;

