var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dxPhone = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // mission name
    phoneNumber: {type: Number, required: true},
    // relevant dx mission object Id
    dxMission: {type: Schema.ObjectId, ref: 'dxMission'},
    // code use to retrieve account
    code: {type: String, index: true},
    // create time
    createTime: {type: Date, default: Date.now}
});


module.exports = dxPhone;