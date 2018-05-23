var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// action log 会员登录记录
var actionLogSchema = new Schema({
    // playerId
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true},
    // action
    action: String,
    //provider
    providerId: {type: Schema.ObjectId, index: true},
    // Date of action
    operationTime: {type: Date, default: Date.now},
    // IP address used when taking the action
    ipAddress: String,
    // Area of the IP address
    ipArea: {province: {type: String}, city: {type: String}},
    //User agent containing 3 sub fields: browser, os, device
    userAgent: [{
        _id: false,
        browser: {type: String},
        os: {type: String},
        device: {type: String},
    }],
    //domain name
    domain: String

});

module.exports = actionLogSchema;