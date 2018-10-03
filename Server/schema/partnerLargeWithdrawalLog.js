let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let largeWithdrawalLogSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // proposal number
    proposalId: {type: String, index: true},
    // email name extension
    emailNameExtension: {type: String},
    // today large amount no (e.g. first large withdrawal log of today will be 1, second will be 2) base on GMT+8
    todayLargeAmountNo: {type: Number},
    // partner name
    partnerName: {type: String},
    // withdrawal amount
    amount: {type: Number},
    // real name
    realName: {type: String},
    // commission type name
    commissionTypeName: {type: String},
    // bank city
    bankCity: {type: String},
    // partner registration time
    registrationTime: {type: Date},
    // current withdrawal time - also the proposal create time
    withdrawalTime: {type: Date},
    // last withdrawal time
    lastWithdrawalTime: {type:Date},
    // current credit (total credit = local credit + game credit)
    currentCredit: {type: Number},
    // total down line player amount
    downLinePlayerAmount: {type: Number},
    // total down line partner amount
    downLinePartnerAmount: {type: Number},
    // proposals after last withdrawal (not inclusive withdrawal proposal)
    proposalsAfterLastWithdrawal: [{
        _id: false,
        // proposal Id
        proposalId: {type: String},
        // creator name (if any)
        creatorName: {type: String},
        // proposal entry point (based on constPlayerRegistrationInterface)
        inputDevice: {type: Number, default: 0},
        // proposal main type (based on constProposalMainType)
        proposalMainType: {type: String},
        // proposal type (based on constProposalType)
        proposalType: {type: String},
        // proposal status (based on constProposalStatus)
        status: {type: String},
        // related user
        relatedUser: {type: String},
        // amount
        amount: {type: Number},
        // create time
        createTime: {type: Date},
        // proposal remark (based on proposal.data.remark)
        remark: {type: String}
    }],
    // admin comment
    comment: {type: String, default: ""},
    // number of times where large withdrawal info email had been sent
    emailSentTimes: {type: Number, default: 0},
});

module.exports = largeWithdrawalLogSchema;
