'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneFeedback = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // tsPhone
    tsPhone: {type: Schema.Types.ObjectId, ref: 'tsPhone', index: true},
    //create Time
    createTime: {type: Date, default: Date.now, index: true},
    //adminId( customer service admin user id )
    adminId: {type: Schema.ObjectId, ref: 'adminInfo', index: true},
    //content of the feedback
    content: String,
    //result ( Normal, Missed call, PlayerBusy)
    result: String,
    resultName: String,
    topic: String



});

module.exports = tsPhoneFeedback;

