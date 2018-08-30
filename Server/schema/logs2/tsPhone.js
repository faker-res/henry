'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneSchema = new Schema({
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    phoneNumber: {type: String, index: true},
    tsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList', index: true},
});

module.exports = tsPhoneSchema;

