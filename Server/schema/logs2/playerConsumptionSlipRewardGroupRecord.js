let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerConsumptionSlipRewardGroupRecordSchema = new Schema({

    // reward event objectId
    rewardEventObjId: {type: Schema.ObjectId, ref: 'rewardEvent', required: true, index: true},
    //platform objectId
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // player info
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    //playerConsumptionRecord objectId
    consumptionRecordObjId: {type: Schema.ObjectId, ref: 'playerConsumptionRecord', index: true},
    // consumptionSlip number
    consumptionSlipNo: {type: String},
    // bonus amount
    bonusAmount: {type: Number},
    // condition list
    condition: [{
        _id: false,
        // required top up amount within period to apply the reward
        requiredTopUpAmount: {type: Number, default: 0, index: true},
        // the bonus ratio that is required to apply the reward
        requiredBonusRatio: {type: Number},
        // consumption needed if this applied succesfully
        requiredConsumptionAmount: {type: Number},
        // the required eding digit of the order number
        requiredOrderNoEndingDigit: {type: String},
        // the multiplier for the consumption as the reward
        rewardMultiplier: {type: Number},
        // reward amount if this applied successfully
        rewardAmount: {type: Number, index:true},
        // the spendingTimes
        spendingTimes: {type: Number},
        // the maximum rewardAmount
        maxRewardAmount: {type: Number},
        // forbid withdrawing after getting the reward
        forbidWithdrawAfterApply: {type: Boolean, default: false},
        // check if the balance after unlock exceeds this amount, withdrawing will not be allowed
        forbidWithdrawIfBalanceAfterUnlock: {type: Number},
        // remark
        remark: {type: String},
    }],
    // betting amount
    consumptionAmount: {type: Number},
    // total amount for statistics
    validAmount: {type: Number},
    // win ratio (bonusAmount / validAmount)
    winRatio: {type: Number},
    // // the consumption is made from the game provider
    gameProvider: {type: Schema.ObjectId, ref: 'gameProvider'},
    // the time when the consumption is created
    consumptionCreateTime: {type: Date},
    // check if the record has been used up
    isUsed: {type: Boolean, default: false, index: true}
});

playerConsumptionSlipRewardGroupRecordSchema.index({platformObjId: 1, playerObjId: 1});

module.exports = playerConsumptionSlipRewardGroupRecordSchema;
