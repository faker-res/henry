"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let emailNotificationConfigSchema = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    doNotify: {type: Boolean, default: false},
    emailPrefix: {type: String, required:true},
    includeAdminName: {type: Boolean, default: false},
    includeOperationTime: {type: Boolean, default: false},
    includeProposalStepName: {type: Boolean, default: false},
    includePlatformName: {type: Boolean, default: false},
});

module.exports = emailNotificationConfigSchema;