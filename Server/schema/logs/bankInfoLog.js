/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// bankinfo change log
var bankInfoLogSchema = new Schema({
    //client or API
    source: {type: String},
    //bank name， bankTypeId
    bankName: {type: String},
    //bank account
    bankAccount: {type: String},
    //bank account name
    bankAccountName: {type: String},
    //bank account type
    bankAccountType: {type: String},
    //bank account province
    bankAccountProvince: {type: String},
    //bank account city
    bankAccountCity: {type: String},
    //bank account district
    bankAccountDistrict: {type: String},
    //full bank address
    bankAddress: {type: String},
    //bank branch
    bankBranch: {type: String},
    targetObjectId: {type: Schema.ObjectId, required: true},
    //player or partner
    targetType: {type: String},
    changeTime: {type: Date, default: Date.now},
    //player, partner or admin
    creatorType: {type: String},
    creatorObjId: {type: Schema.ObjectId}
});

module.exports = bankInfoLogSchema;