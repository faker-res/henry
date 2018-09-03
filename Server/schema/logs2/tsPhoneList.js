'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneListSchema = new Schema({
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    name: {type: String},
    description: {type: String},
    creator: {type: Schema.Types.ObjectId, ref: 'admin', index: true},
    createTime: {type: Date, default: Date.now},

    assignee: {type: Schema.Types.ObjectId, ref: 'admin', index: true},
});

module.exports = tsPhoneListSchema;

