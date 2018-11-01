'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneSchema = new Schema({
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    phoneNumber: {type: String},
    tsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList', index: true},

    // Detail
    playerName: {type: String},
    realName: {type: String},
    gender: {type: String},
    dob: {type: String},
    wechat: {type: String},
    qq: {type: String},
    email: {type: String},
    remark: {type: String}
});

module.exports = tsPhoneSchema;

