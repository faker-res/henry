'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let idcIpSchema = new Schema({
    // IP range start
    ip_start: {type: String},
    // IP range end
    ip_end: {type: String},
    // IP start integer
    ip_start_num: {type: Number, index: true},
    // IP end integer
    ip_end_num: {type: Number, index: true},
    // detailed information on IP
    country: {type: String},
    province: {type: String},
    city: {type: String},
    district: {type: String},

    isp: {type: String},
    type: {type: String}
});

module.exports = idcIpSchema;

