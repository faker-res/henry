'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneSchema = new Schema({
    // platformObjId
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // tsPhoneList Object Id
    tsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList', index: true},
    // description insert by admin
    description: {type: String},
    // admin's name
    adminName: {type: String},
    // adminObjId
    admin: {type: Schema.Types.ObjectId, ref: 'adminInfo', index: true},
    // time when import happen
    importTime: {type: Date, default: new Date(), index: true},
});

module.exports = tsPhoneSchema;

