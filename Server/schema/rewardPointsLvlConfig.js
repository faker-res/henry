var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPointsLvlConfigSchema = new Schema({
    //platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    //reward points interval period
    intervalPeriod: {type: Number, required: true},
    //reward points apply method
    applyMethod: {type: Number, required: true},
    // start time - only use when intervalPeriod is 'custom'
    customPeriodStartTime: {type: Date},
    // end time - only use when intervalPeriod is 'custom'
    customPeriodEndTime: {type: Date},
    //reward points params
    params: [{
        levelObjId: {type: Schema.ObjectId, ref: 'playerLevel', required: true},
        dailyMaxPoints: {type: Number, required: true},
        pointToCreditManualRate: {type: Number, required: true},
        pointToCreditManualMaxPoints: {type: Number, required: true},
        pointToCreditAutoRate: {type: Number, required: true},
        pointToCreditAutoMaxPoints: {type: Number, required: true},
        spendingAmountOnReward: {type: Number, required: true},
        providerGroup: {type: Schema.ObjectId, ref: 'gameProviderGroup'},
    }],
    // last run auto convert player reward points time for custom period
    lastRunAutoPeriodTime: {type: Date},
});

module.exports = rewardPointsLvlConfigSchema;
