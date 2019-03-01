var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerMultipleBankDetailInfoSchema = new Schema({
    // platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // player
    playerObjId: {type: Schema.ObjectId, ref: 'player', required: true, index: true},

    /*2nd bank info*/
    // bank name， bankTypeId
    bankName2: {type: String},
    // bank account
    bankAccount2: {type: String, index: true},
    // bank account name
    bankAccountName2: {type: String},
    // bank account province
    bankAccountProvince2: {type: String},
    // bank account city
    bankAccountCity2: {type: String},
    // bank account district
    bankAccountDistrict2: {type: String},
    // full bank address
    bankAddress2: {type: String},
    // bank branch
    bankBranch2: {type: String},

    /*3rd bank info*/
    // bank name， bankTypeId
    bankName3: {type: String},
    // bank account
    bankAccount3: {type: String, index: true},
    // bank account name
    bankAccountName3: {type: String},
    // bank account province
    bankAccountProvince3: {type: String},
    // bank account city
    bankAccountCity3: {type: String},
    // bank account district
    bankAccountDistrict3: {type: String},
    // full bank address
    bankAddress3: {type: String},
    // bank branch
    bankBranch3: {type: String},
});

playerMultipleBankDetailInfoSchema.index({ playerObjId: 1, platformObjId: 1 });

module.exports = playerMultipleBankDetailInfoSchema;