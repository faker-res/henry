var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerCommissionLog = new Schema({
    // partner
    partner: {type: Schema.ObjectId, ref: 'partner', index: true, required: true},
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // commissionType
    commissionType: {type: String, index: true},
    // start time of period
    startTime: {type: Date, index: true},
    // end time of period
    endTime: {type: Date, index: true},
    // partnerId
    partnerId: {type: String},
    // partner name
    partnerName: {type: String},
    // partner real name
    partnerRealName: {type: String},
    // partnerCredit at settlement moment
    partnerCredit: {type: Number},
    // downline individual details
    downLinesRawCommissionDetail: [],
    // active downline amount
    activeDownLines: {type: Number},
    // rate config on settlement point of time, include rate and isCustom(Boolean)
    partnerCommissionRateConfig: [],
    // with groupName, amount, commissionRate, isCustomCommissionRate(Boolean), platformFee, platformFeeRate and isCustomPlatformFeeRate(Boolean)
    rawCommissions: [],
    // totalReward
    totalReward: {type: Number},
    // total reward fee
    totalRewardFee: {type: Number},
    // total platform fee
    totalPlatformFee: {type: Number},
    // total deposit
    totalTopUp: {type: Number},
    // total deposit fee
    totalTopUpFee: {type: Number},
    // total withdrawal
    totalWithdrawal: {type: Number},
    // total withdrawal fee
    totalWithdrawalFee: {type: Number},
    // nett commission
    nettCommission: {type: Number},
    // activeDownLines of last 3 period
    pastActiveDownLines: [],
    // nett commission of last 3 period
    pastNettCommission: [],
    // status, from constPartnerCommissionLogStatus
    status: {type: Number, default: 0},
    // remarks
    remarks: {type: String, default: ""},
});

module.exports = partnerCommissionLog;