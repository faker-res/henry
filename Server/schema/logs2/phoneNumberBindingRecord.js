let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let phoneNumberBindingRecord = new Schema({
    //platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // player
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // encrypted phone number
    phoneNumber: {type: String},
    // Date time added
    createTime: {type: Date, default: Date.now, index: true},
});

phoneNumberBindingRecord.index({platformObjId: 1, phoneNumber: 1});

module.exports = phoneNumberBindingRecord;