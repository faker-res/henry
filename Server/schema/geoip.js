'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let geoIpSchema = new Schema({
    // IP range start
    ip_start: {type: String},
    // IP range end
    ip_end: {type: String},
    // IP start integer
    ip_start_num: {type: Number},
    // IP end integer
    ip_end_num: {type: Number},
    // detailed information on IP
    continent: {type: String},
    country: {type: String},
    province: {type: String},
    city: {type: String},
    district: {type: String},
    isp: {type: String},
    area_code: {type: Number},
    country_english: {type: String},
    country_code: {type: Number},
    longitude: {type: Number},
    latitude: {type: Number}
});

module.exports = geoIpSchema;

