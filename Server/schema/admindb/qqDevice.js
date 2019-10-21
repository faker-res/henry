'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let qqDeviceSchema = new Schema({
    // Platform Object Id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // Unique qq control device id
    deviceId: {type: String, unique: true, required: true, index: true},
    // Unique qq control device nickname
    deviceNickName: {type: String, unique: true, required: true, index: true},
    // Last update time
    lastUpdateTime: {type: Date, default: Date.now},
    // Last update admin
    lastUpdateAdmin: {type: Schema.ObjectId, ref: 'admin'}
});

module.exports = qqDeviceSchema;

