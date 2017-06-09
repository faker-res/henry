var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerLoginRecordSchema = new Schema({
    //player object id
    player: {type: Schema.Types.ObjectId},
    //platform object id
    platform: {type: Schema.Types.ObjectId},
    //login time
    loginTime: {type: Date, default: Date.now},
    //login ip
    loginIP: String,
    // login domain
    clientDomain: String,
    clientType: String,
    //logout time
    logoutTime: Date,
    // GeoIP info
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
    latitude: {type: Number},
    //User agent containing 3 sub fields: browser, os, device
    userAgent: {
        browser: {type: String},
        os: {type: String},
        device: {type: String}
    },
    //any additional data
    data: JSON
});

module.exports = playerLoginRecordSchema;
