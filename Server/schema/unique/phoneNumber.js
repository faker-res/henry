/*
 * This schema is to ensure the uniqueness of phone number in player/partner schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var phoneNumberSchema = new Schema({
    platform: {type: Schema.ObjectId, required: true},
    phoneNumber: {type: String, required: true}
});

//record is unique by name and platform
phoneNumberSchema.index({ platform: 1, phoneNumber: 1 }, {unique: true});

module.exports = phoneNumberSchema;