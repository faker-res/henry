/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerLoginRecordSchema = new Schema({
    //partner object id
    partner: {type:Schema.Types.ObjectId},
    //platform object id
    platform: {type:Schema.Types.ObjectId},
    //login time
    loginTime: {type: Date, default: Date.now},
    //login ip
    loginIP: String,
    // login domain
    clientDomain: String,
    clientType: String,
    //logout time
    logoutTime : Date,
    //country
    country : String,
    //city
    city: String,
    //longitude
    longitude: String,
    //latitude
    latitude : String,
    //User agent containing 3 sub fields: browser, os, device
    userAgent: {
        browser: {type: String},
        os: {type: String},
        device: {type: String}
    }
});

module.exports = partnerLoginRecordSchema;
