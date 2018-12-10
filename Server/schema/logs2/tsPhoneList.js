'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneListSchema = new Schema({
    // platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // admin object Id
    creator: {type: Schema.Types.ObjectId, ref: 'admin', index: true},
    // create time
    createTime: {type: Date, default: Date.now, index: true},
    // name
    name: {type: String, required: true, index: true},
    // list description
    description: {type: String, required: true},
    // default feedback result key when fail to call
    failFeedBackResultKey: {type: String},
    // default feedback result when fail to call
    failFeedBackResult: {type: String, required: true},
    // default feedback topic when fail to call
    failFeedBackTopic: {type: String, required: true},
    // default feedback content when fail to call
    failFeedBackContent: {type: String, required: true},
    // assign to N caller for each unregistered phone number
    callerCycleCount: {type: Number, required: true},
    // daily distribution task count, divide equally for each caller
    dailyCallerMaximumTask: {type: Number, required: true},
    // daily distribute task hour
    dailyDistributeTaskHour: {type: Number, min: 0, max: 23, required: true},
    // daily distribute task minute
    dailyDistributeTaskMinute: {type: Number, min: 0, max: 59, required: true},
    // daily distribute task second
    dailyDistributeTaskSecond: {type: Number, min: 0, max: 59, required: true},
    // distribute task start date
    distributeTaskStartTime: {type: Date, required: true},
    // reclaim task after N days
    reclaimDayCount: {type: Number, required: true},
    // filter phone number from white list and recycle bin
    isCheckWhiteListAndRecycleBin: {type: Boolean, default: false},
    // zone stated will not be call, fix feed back content will be save
    dangerZoneList: [{province: {type: String, required: true}, city: {type: String, required: true}}],
    // status - consTsPhoneListStatus
    status: {type: Number, default: 0, index: true},
    // number of phone number consisted
    totalPhone: {type: Number, default: 0},
    // number of phone number distributed
    totalDistributed: {type: Number, default: 0},
    // number of phone number used
    totalUsed: {type: Number, default: 0},
    // number of called successful
    totalSuccess: {type: Number, default: 0},
    // number of registration
    totalRegistration: {type: Number, default: 0},
    // number of registed player who top up
    totalTopUp: {type: Number, default: 0},
    // number of registed player who top up multiple times
    totalMultipleTopUp: {type: Number, default: 0},
    // number of valid players
    totalValidPlayer: {type: Number, default: 0},
    // recycle time
    recycleTime: {type: Date},
    // decomposed time
    decomposedTime: {type: Date, index: true},
    // assignees
    assignees: [{type: Schema.Types.ObjectId, ref: 'admin', index: true}],
});
//record is unique by name and platform
tsPhoneListSchema.index({name: 1, platform: 1}, {unique: true});

module.exports = tsPhoneListSchema;

