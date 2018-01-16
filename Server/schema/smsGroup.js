var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var counterManager = require("../modules/counterManager.js");

var smsGroupSchema = new Schema({
    //sms group name or setting name
    smsName: {type: String, required: true},
    //sms id
    smsId: {type: Number, index: true},
    // -1 means this record is a sms group
    // else means sms setting parent sms group's smsId
    smsParentSmsId: {type: Number, required: true, default: -1},

    //platformObjId
    platformObjId: {type: Schema.ObjectId, ref: 'platform'},
});

//add smsID before save
smsGroupSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('smsId'));

module.exports = smsGroupSchema;
