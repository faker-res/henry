let mongoose = require('mongoose');
let Schema = mongoose.Schema;

//let constPartnerCommissionSettlementMode = require('../const/constPartnerCommissionSettlementMode');

let partnerCommissionConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    //game provider group _id
    provider: {type: Schema.ObjectId, ref: 'gameProviderGroup'},
    //commission type
    commissionType: {type: String},
    //commission setting
    commissionSetting: [{
        //Consumption Bonus Amount Or Consumption Valid Amount
        playerConsumptionAmountFrom: {type: Number},
        playerConsumptionAmountTo: {type: Number},
        //Active Player
        activePlayerValueFrom: {type: Number},
        activePlayerValueTo: {type: Number},
        //Commission Rate
        commissionRate: {type: Number}
    }],
    // Custom rate
    customSetting: [{
        _id: false,
        configObjId: {type: Schema.ObjectId},
        partner: {type: Schema.ObjectId, ref: 'partner'},
        //Commission Rate
        commissionRate: {type: Number}
    }]

    /** To be removed
    //commission param
    //platform fee rate
    platformFeeRate: {type: Number, default: 0},
    //service fee rate
    serviceFeeRate: {type: Number, default: 0},
    //commission period: day, week, month
    commissionPeriod: {type: String},
    //commission level config
    commissionLevelConfig: [{
        _id: false,
        //level value, used for level comparison
        value: {type: Number, required: true},
        minProfitAmount: {type: Number},
        maxProfitAmount: {type: Number},
        minActivePlayer: {type: Number},
        commissionRate: {type: Number}
    }],
    //commission rate for children
    childrenCommissionRate: [{
        _id: false,
        level: Number,
        rate: Number
    }],
    //bonus commission times
    bonusCommissionHistoryTimes: Number,
    //bonus commission rate
    bonusRate: Number,
    //minimum commission amount
    minCommissionAmount: {type: Number, default: 0},
    //reset period，number of days to clear negative value
    resetPeriod: {type: Number, default: 0},
    // settlement mode
    settlementMode: {type: String, default: constPartnerCommissionSettlementMode.OPSR},
    // reward rate
    rewardRate: {type: Number, default: 1}**/
});

module.exports = partnerCommissionConfigSchema;


