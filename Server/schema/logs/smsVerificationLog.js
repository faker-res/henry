let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// SMS log (change if needed)
let smsVerificationLogSchema = new Schema ({
    tel: {type: String, required: true, index: true},
    channel: {type: Number, required: true},
    platformId: {type: String, required: false},
    message: {type: String, required: true},
    delay: {type: Number, default: 0},
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = smsVerificationLogSchema;