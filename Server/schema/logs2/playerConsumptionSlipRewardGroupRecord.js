let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerConsumptionSlipRewardGroupRecordSchema = new Schema({

    // reward event objectId
    rewardEventObjId: {type: Schema.ObjectId, ref: 'rewardEvent', required: true, index: true},
    //platform objectId
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // player info
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // consumptionSlip number
    consumptionSlipNo: {type: String},
    // bonus amount
    bonusAmount: {type: Number},
    // betting amount
    consumptionAmount: {type: Number},
    // required top up amount within period
    requiredTopUpAmount: {type: Number, default: 0},
    // reward amount if this applied successfully
    rewardAmount: {type: Number, index:true},
    // consumption needed if this applied succesfully
    requiredConsumption: {type: Number},
    // the multiplier for the consumption as the reward
    rewardMultiplier: {type: Number},
    // the bonus ratio
    bonusRatio: {type: Number},
    // the spendingTimes
    spendingTimes: {type: Number},
    // the maximum rewardAmount
    maxRewardAmount: {type: Number},
    //playerConsumptionRecord objectId
    consumptionRecordObjId: {type: Schema.ObjectId, ref: 'playerConsumptionRecord', index: true},
    // the time when the consumption is created
    consumptionCreateTime: {type: Date},
    // // the consumption is made from the game provider
    gameProvider: {type: Schema.ObjectId, ref: 'gameProvider'},
    // check if the record has been used up
    isUsed: {type: Boolean, default: false}
});

playerConsumptionSlipRewardGroupRecordSchema.index({platform: 1, playerObjId: 1});

module.exports = playerConsumptionSlipRewardGroupRecordSchema;
