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
    // number of phone distributed
    phoneCount: {type: Number, default: 0},
    // number of phone used
    phoneUsed: {type: Number, default: 0},
    // number of Successful call
    successfulCount: {type: Number, default: 0},
    // number of registration
    registrationCount: {type: Number, default: 0},
    // number of single top up
    singleTopUpCount: {type: Number, default: 0},
    // number of player who top up multiple times that registered under this list
    multipleTopUpCount: {type: Number, default: 0},
    // effective player registered under this list
    effectivePlayerCount: {type: Number, default: 0},

});

module.exports = tsDistributedPhoneListSchema;

