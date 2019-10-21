let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let qqGroupControlSessionSchema = new Schema({
    // qqGroupControl deviceId
    deviceId: {type: String, required: true, index: true},

    // qqGroupControl device nickname
    deviceNickName: {type: String, required: true, index: true},

    // adminName
    csOfficer: {type: Schema.ObjectId, ref: 'admin', index: true},

    // status - online / offline
    status: {type: Number},

    // Count Connection Abnormal Click
    connectionAbnormalClickTimes: {type: Number, default: 0},

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},

    // Create time
    createTime: {type: Date, default: Date.now, index: true},

    // Last Active time, the last time this was updated as 'ONLINE'.
    lastActiveTime: {type: Date, index: true},

    // Last Update time
    lastUpdateTime: {type: Date, index: true},

    // version of qq
    qqVersion: {type: String}
});

module.exports = qqGroupControlSessionSchema;
