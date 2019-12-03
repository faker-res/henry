'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let platformTopUpAmountConfigSchema = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // deprecated
    // commonTopUpAmountRange: {
    //     minAmount: {type: Number, default: 10},
    //     maxAmount: {type: Number, default: 100000},
    // },
    // 充值额度区间
    topUpAmountRange: [{
        device: [],
        minAmount: {type: Number},
        maxAmount: {type: Number}
    }],
    // 存款笔数额度区间
    topUpCountAmountRange: [{
        device: [],
        topUpCount: {type: Number},
        minAmount: {type: Number},
        maxAmount: {type: Number}
    }]
});

module.exports = platformTopUpAmountConfigSchema;
