var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformMerchantListSchema = new Schema({
    merchantNo: {type: String, required: true, index: true},
    name: {type: String, required: true},
    topupType: {type: String, index: true},
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
    customizeRate: {type: Number, index: true},
    //if it is pms2
    isPMS2: {type: Boolean, index: true}
});

module.exports = platformMerchantListSchema;