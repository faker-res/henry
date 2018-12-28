let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let auctionSystemSchema = new Schema({

    /** player section **/
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    playerType: {type: String},
    playerLevel: {type: String},
    // player credibility remarks
    credibilityRemarks: [{type: String}],
    filterCredibilityRemarks: [{type: String}],
    // player last access time
    lastAccessOperator: {type: String},
    lastAccessFormal: {type: Number},
    lastAccessLatter: {type: Number},
    // player feedback
    filterFeedback: {type: Number},
    filterFeedbackTopic: [{type: String}],
    // player deposit count
    depositCountOperator: {type: String},
    depositCountFormal: {type: Number},
    depositCountLatter: {type: Number},
    // player value score
    playerValueOperator: {type: String},
    playerValueFormal: {type: Number},
    playerValueLatter: {type: Number},
    // player consumption count
    consumptionTimesOperator: {type: String},
    consumptionTimesFormal: {type: Number},
    consumptionTimesLatter: {type: Number},
    // player profit amount
    bonusAmountOperator: {type: String},
    bonusAmountFormal: {type: Number},
    bonusAmountLatter: {type: Number},
    // player withdrawal count
    withdrawTimesOperator: {type: String},
    withdrawTimesFormal: {type: Number},
    withdrawTimesLatter: {type: Number},
    // player top up sum
    topUpSumOperator: {type: String},
    topUpSumFormal: {type: Number},
    topUpSumLatter: {type: Number},
    // game provider
    gameProviderId: [{type: String}],
    // player registration time
    registerStartTime: {type: Date, required: true},
    registerEndTime: {type: Date, required: true},
    // player department
    departments: [{type: String}],
    roles: [{type: String}],
    admins: [{type: String}],

    /** reward section **/
    rewardData: {type: JSON, default: {}},

    /** auction product section **/
    productImage: {type: String},
    productName: {type: String},
    seller: {type: String},
    reservePrice: {type: Number},
    startingPrice: {type: Number},
    priceIncrement: {type: Number},
    directPurchasePrice: {type: Number},
    isExclusive: {type: Boolean, default: false},

    /** time section **/
    rewardStartTime: {type: Date, required: true},
    rewardEndTime: {type: Date, required: true},
    rewardInterval: {type: String},
    rewardAppearPeriod: [{
        startDate: {type: String},
        startTime: {type: String},
        endDate: {type: String},
        endTime: {type: String}
    }],
    productStartTime: {type: Number},
    productEndTime: {type: Number},

    // publish - 0: 「组外」, 1: 「组内」  //只有「组内」的商品才能在前端显示
    publish: {type: Boolean, default: false},
    status: {type: Number, default: 1},
    createTime: {type: Date, default: Date.now}
});

module.exports = auctionSystemSchema;
