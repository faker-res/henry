'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsAssignee = new Schema({
    // platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // create time
    createTime: {type: Date, default: Date.now, index: true},
    // tsPhoneList
    tsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList', index: true},
    // admin's name
    adminName: {type: String},
    // adminObjId
    admin: {type: Schema.Types.ObjectId, ref: 'adminInfo', index: true},
    // number of phone been assigned
    assignedCount: {type: Number, default: 0},
    // number of phone been used
    phoneUsedCount: {type: Number, default: 0},
    // number of successful call
    successfulCount: {type: Number, default: 0},
    // number of registration of callee
    registrationCount: {type: Number, default: 0},
    // number of player who top up at least once
    singleTopUpCount: {type: Number, default: 0},
    // number of player who top up at least twice
    multipleTopUpCount: {type: Number, default: 0},
    // number of player who are effective based on setting
    effectivePlayerCount: {type: Number, default: 0},
    // number of holding phone that have not been register
    holdingCount: {type: Number, default: 0},
    // status of TsAssignee - constTsAssigneeStatus
    status: {type: Number, default: 0, index: true}

});


module.exports = tsAssignee;

