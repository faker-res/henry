var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformBankCardListSchema = new Schema({
    accountNumber: {type: String, required: true},
    bankTypeId: {type: String},
    name: {type: String},
    platformId: {type: String},
    quota: {type: Number},
    maxDepositAmount: {type: Number},
    status: {type: String},
    provinceName: {type: String},
    cityName: {type: String},
    openingPoint: {type: String},
    level: {type: String},
    isFPMS: {type: Boolean, default: false, index: true},
    quotaUsed : {type: Number, default: 0},
    // if it is pms2
    isPMS2: {type: Boolean, index: true}
});

module.exports = platformBankCardListSchema;