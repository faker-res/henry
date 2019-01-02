let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let auctionSystemSchema = new Schema({

    /** player section **/
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    playerType: {type: String, index: true},
    playerLevel: {type: Schema.ObjectId, ref: 'playerLevel', index: true},
    // player credibility remarks
    credibilityRemarks: [{type: Schema.ObjectId, ref: 'playerCredibilityRemark', index: true}],
    filterCredibilityRemarks: [{type: Schema.ObjectId, ref: 'playerCredibilityRemark', index: true}],
    // player last access time
    lastAccessOperator: {type: String, index: true},
    lastAccessFormal: {type: Number, index: true},
    lastAccessLatter: {type: Number, index: true},
    // player feedback
    filterFeedback: {type: Number, index: true},
    filterFeedbackTopic: [{type: String, index: true}],
    // player deposit count
    depositCountOperator: {type: String, index: true},
    depositCountFormal: {type: Number, index: true},
    depositCountLatter: {type: Number, index: true},
    // player value score
    playerValueOperator: {type: String, index: true},
    playerValueFormal: {type: Number, index: true},
    playerValueLatter: {type: Number, index: true},
    // player consumption count
    consumptionTimesOperator: {type: String, index: true},
    consumptionTimesFormal: {type: Number, index: true},
    consumptionTimesLatter: {type: Number, index: true},
    // player profit amount
    bonusAmountOperator: {type: String, index: true},
    bonusAmountFormal: {type: Number, index: true},
    bonusAmountLatter: {type: Number, index: true},
    // player withdrawal count
    withdrawTimesOperator: {type: String, index: true},
    withdrawTimesFormal: {type: Number, index: true},
    withdrawTimesLatter: {type: Number, index: true},
    // player top up sum
    topUpSumOperator: {type: String, index: true},
    topUpSumFormal: {type: Number, index: true},
    topUpSumLatter: {type: Number, index: true},
    // game provider
    gameProviderId: [{type: Schema.ObjectId, ref: 'gameProvider', index: true}],
    // player registration time
    registerStartTime: {type: Date, required: true, index: true},
    registerEndTime: {type: Date, required: true, index: true},
    // player department
    departments: [{type: Schema.ObjectId, ref: 'department', required: true, index: true}],
    roles: [{type: Schema.ObjectId, ref: 'role', required: true, index: true}],
    admins: [{type: Schema.ObjectId, ref: 'adminInfo', required: true, index: true}],

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
    publish: {type: Boolean, default: false, index: true},
    // status - 0: 「已删除的商品」, 1: 「活跃的商品」
    status: {type: Number, default: 1, index: true},
    createTime: {type: Date, default: Date.now}
});

module.exports = auctionSystemSchema;
