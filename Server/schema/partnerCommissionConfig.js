var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerCommissionConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true, unique: true},
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
    resetPeriod: {type: Number, default: 0}
});

module.exports = partnerCommissionConfigSchema;


