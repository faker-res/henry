let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let bankAccountBindingRecord = new Schema({
    //platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // player
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // bank name
    bankName: {type: String, index: true},
    // bank account number
    bankAccount: {type: String, index: true},
    // Date time added
    createTime: {type: Date, default: Date.now, index: true},
});

module.exports = bankAccountBindingRecord;