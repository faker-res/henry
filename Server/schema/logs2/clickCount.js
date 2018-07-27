let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let clickCountSchema = new Schema({
    // platform of demo player
    platform: {type: Schema.ObjectId, required: true, index: true},
    // daily start time
    startTime: {type: Date, index: true},
    // daily end time
    endTime: {type: Date, index: true},
    // user interface
    device: {type: String},
    // page name during click
    pageName: {type: String, index: true},
    // button name where user click on
    buttonName: {type: String, index: true},
    // count of clicks
    count: {type: Number, default: 0},
    // array of ip address
    ipAddresses: [String],
    // array of unique ip address of web
    webIpAddresses: [String],
    // array of unique ip address of app
    appIpAddresses: [String],
    // array of unique ip address of H5
    H5IpAddresses: [String],
    // count of click using App
    registerClickAppCount: {type: Number, default: 0},
    // count of click using Web
    registerClickWebCount: {type: Number, default: 0},
    // count of click using H5
    registerClickH5Count: {type: Number, default: 0},
    //domain
    domain: {type: String, index: true}

});

clickCountSchema.index({platform: 1, startTime: 1, endTime: 1, device: 1, pageName: 1, buttonName: 1});

module.exports = clickCountSchema;
