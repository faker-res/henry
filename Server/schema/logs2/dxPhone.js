var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dxPhone = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // mission name
    phoneNumber: {type: Number, index: true, required: true},
    // relevant dx mission object Id
    dxMission: {type: Schema.ObjectId, ref: 'dxMission'},
});


module.exports = dxPhone;