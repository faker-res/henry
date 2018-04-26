var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dxPhone = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // mission name
    phoneNumber: {type: String, required: true},
    // relevant dx mission object Id
    dxMission: {type: Schema.ObjectId, ref: 'dxMission', required: true},
    // code use to retrieve account
    code: {type: String, index: true, required: true},
    // create time
    createTime: {type: Date, default: Date.now},
    // whether this code is used
    bUsed: {type: Boolean, default: false},
    // generated url
    url: {type: String},
    // player info after creation
    playerObjId: {type: Schema.ObjectId, ref: 'player'},
    // the IP when applying
    ip: {type: String, default: "", index: true},
    // number of times of sending sms to this number
    sendingTimes: {type: Number, default: 0},


});

dxPhone.index({ platform: 1, dxMission: 1, playerObjId: 1, createTime: 1 }, {unique: true});

module.exports = dxPhone;