"use strict";

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let phoneBStateSchema = new Schema({
    // playerId
    phoneNumber: {type: String},
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform'},
    // Transfer to provider
    sendSMS: {type: Boolean, default: false},
    // the time when transfer to provider
    sendSMSUpdatedTime: {type: Date, default: Date.now},

});

phoneBStateSchema.index({phoneNumber: 1, platform: 1}, {unique: true});


module.exports = phoneBStateSchema;
