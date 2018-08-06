let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerDepositTrackingGroupSchema = new Schema({
    // player deposit tracking group name
    name: {type: String, required: true, index: true},
    // platform id
    platform: {type: Schema.ObjectId, required: true, index: true},
    // remark
    remark: {type: String},
});

module.exports = playerDepositTrackingGroupSchema;