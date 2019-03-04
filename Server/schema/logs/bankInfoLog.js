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

    /*2nd bank info*/
    //bank name， bankTypeId
    bankName2: {type: String},
    //bank account
    bankAccount2: {type: String},
    //bank account name
    bankAccountName2: {type: String},
    //bank account type
    bankAccountType2: {type: String},
    //bank account province
    bankAccountProvince2: {type: String},
    //bank account city
    bankAccountCity2: {type: String},
    //bank account district
    bankAccountDistrict2: {type: String},
    //full bank address
    bankAddress2: {type: String},
    //bank branch
    bankBranch2: {type: String},

    /*3rd bank info*/
    //bank name， bankTypeId
    bankName3: {type: String},
    //bank account
    bankAccount3: {type: String},
    //bank account name
    bankAccountName3: {type: String},
    //bank account type
    bankAccountType3: {type: String},
    //bank account province
    bankAccountProvince3: {type: String},
    //bank account city
    bankAccountCity3: {type: String},
    //bank account district
    bankAccountDistrict3: {type: String},
    //full bank address
    bankAddress3: {type: String},
    //bank branch
    bankBranch3: {type: String},

    targetObjectId: {type: Schema.ObjectId, required: true},
    //player or partner
    targetType: {type: String},
    changeTime: {type: Date, default: Date.now},
    //player, partner or admin
    creatorType: {type: String},
    creatorObjId: {type: Schema.ObjectId}
});

module.exports = bankInfoLogSchema;