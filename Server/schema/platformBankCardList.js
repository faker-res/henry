var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformBankCardListSchema = new Schema({
    accountNumber: {type: String, required: true},
    bankTypeId: {type: String},
    name: {type: String},
    platformId: {type: String},
    quota: {type: Number},
    status: {type: String},
    provinceName: {type: String},
    cityName: {type: String},
    openingPoint: {type: String},
    level: {type: String},
    isFPMS: {type: Boolean, default: false, index: true}
});

module.exports = platformBankCardListSchema;