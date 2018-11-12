'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsDistributedPhoneListSchema = new Schema({
    // platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // ts List that it based on
    tsPhoneList: {type: Schema.ObjectId, ref: 'tsPhoneList', index: true},
    // assignee (whose list is this)
    assignee: {type: Schema.Types.ObjectId, ref: 'admin', index: true},

});

module.exports = tsDistributedPhoneListSchema;

