var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var adminInfoSchema = new Schema({
    //primary key
    adminName: {type: String, unique: true, required: true, dropDups: true, lowercase: true, index: true},
    //email address
    email: {type: String},
    //admin password
    password: String,
    //salt key for password encryption
    salt: String,
    //first name
    firstName: String,
    //last name
    lastName: String,
    //voip number
    // voip: String,
    //active or enabled
    accountStatus: {type: Boolean, default: true},
    //policy info attached to this user
    roles: [{type: Schema.ObjectId, ref: 'role'}],
    //group info attached to this user
    departments: [{type: Schema.ObjectId, ref: 'department'}],
    //language mode
    language: {type: String, default: "en_US"},
    //when did user last update their password?
    lastPasswordUpdateTime: {type: Date, default: 0 /* 1970 */},
    //number of failed login attempts
    failedLoginAttempts: {type: Number, default: 0},
    //token issued to the user (by email) that will allow them to reset this account
    resetToken: {type: String},
    //when will that token stop being valid?
    resetTokenExpiry: {type: Date},
    did: {type: Number},
    callerId: {type: Number},
    live800Acc: [{type: String, default: 0}]


});

module.exports = adminInfoSchema;

