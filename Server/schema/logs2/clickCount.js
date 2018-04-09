let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let clickCountSchema = new Schema({
    // platform of demo player
    platform: {type: Schema.ObjectId, required: true, index: true},
    // daily start time
    startTime: {type: Date},
    // daily end time
    endTime: {type: Date},
    // user interface
    device: {type: String},
    // page name during click
    pageName: {type: String},
    // button name where user click on
    buttonName: {type: String},
    // count of clicks
    count: {type: Number, default: 0}
});

clickCountSchema.index({platform: 1, startTime: 1, endTime: 1, device: 1, pageName: 1, buttonName: 1});

module.exports = clickCountSchema;