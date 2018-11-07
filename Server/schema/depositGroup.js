var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var counterManager = require("../modules/counterManager.js");

var depositGroupSchema = new Schema({
    //deposit group name or setting name
    depositName: {type: String, required: true},
    //deposit id
    depositId: {type: Number, index: true},
    // -1 means this record is a deposit group
    // else means deposit setting parent deposit group's depositId
    depositParentDepositId: {type: Number, required: true, default: -1},
    // topUpTypeId - 1 Manual, 2 Online, 3 Alipay, 4 Wechat
    topUpTypeId: {type: Number},
    // DepositMethodId or MerchantTopUpTypeId
    topUpMethodId: {type: Number}
});

//add smsID before save
depositGroupSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('depositId'));

module.exports = depositGroupSchema;