var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dxPhone = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // mission name
    phoneNumber: {type: String, required: true, index: true},
    // relevant dx mission object Id
    dxMission: {type: Schema.ObjectId, ref: 'dxMission', required: true, index: true},
    // code use to retrieve account
    code: {type: String, index: true, required: true},
    // create time
    createTime: {type: Date, default: Date.now},
    // whether this code is used
    bUsed: {type: Boolean, default: false},
    // generated url
    url: {type: String},
    // player info after creation
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true}
});


module.exports = dxPhone;