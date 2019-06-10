let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let commCalcParentSchema = new Schema({
    // partner commission log object id
    commCalc: {type: Schema.ObjectId, ref: 'commCalc', required: true, index: true},
    // parent object id
    parentObjId: {type: Schema.ObjectId, ref: 'partner'},
    // parent name
    parentName: {type: String},
    // parent real name
    parentRealName: {type: String},
    // current partner object id
    partnerObjId: {type: Schema.ObjectId, ref: 'partner'},
    // current partner name
    partnerName: {type: String},
    // partner real name
    partnerRealName: {type: String},
    // gross commission
    grossCommission: {type: Number, default: 0},
    // nett commission
    nettCommission: {type: Number, default: 0},
    // raw commissions detail
    rawCommissions: [],

    totalRewardFee: {type: Number, default: 0},

    totalTopUpFee: {type: Number, default: 0},

    totalWithdrawalFee: {type: Number, default: 0},

    totalPlatformFee: {type: Number, default: 0},

    rewardFeeRate: {type: Number, default: 0},

    topUpFeeRate: {type: Number, default: 0},

    withdrawalFeeRate: {type: Number, default: 0},
    // commCalc startTime to determine which batch it is
    startTime: {type: Date},

});

module.exports = commCalcParentSchema;

commCalcParentSchema.index({parentObjId: 1, startTime: 1});
commCalcParentSchema.index({parentObjId: 1, partnerObjId: 1, startTime: 1}, {unique: true});