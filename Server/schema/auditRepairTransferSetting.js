"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let auditRepairTransferSettingSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // email name extension
    emailNameExtension: {type: String},
    // recipient
    recipient: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    // reviewer - people who can approve the withdrawal by email
    reviewer: [{type: Schema.ObjectId, ref: 'adminInfo'}],

    minimumAuditAmount: {type: Number},
    // domain for receiving the email audit api
    domain: {type: String},
});

module.exports = auditRepairTransferSettingSchema;