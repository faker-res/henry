var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerCommissionLog = new Schema({
    // partner
    partner: {type: Schema.ObjectId, ref: 'partner', index: true, required: true},
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // commissionType
    commissionType: {type: String},
    // start time of period
    startTime: {type: Date},
    // end time of period
    endTime: {type: Date},
    // partnerId
    partnerId: {type: String},
    // partner name
    partnerName: {type: String},
    // partner real name
    partnerRealName: {type: String},
    // partnerCredit at settlement moment
    partnerCredit: {type: Number},
    // downline individual details (DEPRECATED)
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
    // gross commission
    grossCommission: {type: Number},
    // nett commission
    nettCommission: {type: Number},
    // parent partner commission (DEPRECATED)
    parentPartnerCommissionDetail: {},
    // activeDownLines of last 3 period
    pastActiveDownLines: [],
    // nett commission of last 3 period
    pastNettCommission: [],
    // status, from constPartnerCommissionLogStatus
    status: {type: Number, default: 0},
    // calculate time
    calcTime: {type: Date, default: Date.now},
    // remarks
    remarks: {type: String, default: ""},
});

module.exports = partnerCommissionLog;

partnerCommissionLog.index({platform: 1, commissionType: 1, startTime: 1});
partnerCommissionLog.index({platform: 1, commissionType: 1, startTime: 1, endTime: 1, partnerName: 1});