let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let createDemoPlayerLogSchema = new Schema({
    // platform of demo player
    platform: {type: Schema.ObjectId, required: true, index: true},
    // demo account name
    name: {type: String},
    // account creation registration interface
    device: {type: String},
    // whether the player is old player, pre-converted player or post-converted player
    status: {type: String, index: true},
    // phone number used to register this demo player
    phoneNumber: {type: String, index: true},
    // create time
    createTime: {type: Date, default: Date.now, index: true},
});

module.exports = createDemoPlayerLogSchema;