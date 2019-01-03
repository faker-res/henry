var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformMerchantListSchema = new Schema({
    merchantNo: {type: String, required: true, index: true},
    name: {type: String, required: true},
    topupType: {type: String},
    targetDevices: {type: String},
    merchantUse: {type: String},
    merchantTypeId: {type: String},
    remark: {type: String},
    platformId: {type: String, index: true},
    permerchantLimits: {type: Number},
    transactionForPlayerOneDay: {type: Number},
    permerchantminLimits: {type: Number},
    status: {type: String},
    rate: {type: Number},
    customizeRate: {type: Number}
});

module.exports = platformMerchantListSchema;