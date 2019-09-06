"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let notifyEditPartnerCommissionSettingSchema = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    doNotify: {type: Boolean, default: false},
    backEndOnly: {type: Boolean, default: false},
    emailPrefix: {type: String, required:true},
});

module.exports = notifyEditPartnerCommissionSettingSchema;