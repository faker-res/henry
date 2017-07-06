var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constRewardTaskStatus = require("./../const/constRewardTaskStatus");

var rewardTaskSchema = new Schema({
    //reward task status
    status: {type: String, default: constRewardTaskStatus.STARTED, index: true},
    //target game provider
    targetProviders: [{type: Schema.Types.ObjectId}],
    //target games
    targetGames: [{type: Schema.Types.ObjectId}],
    //if target is enabled
    targetEnable: {type: Boolean, default: true, index: true},
    //type
    type: {type: String},
    //reward type
    rewardType: {type: String},
    //platform id
    platformId: {type: Schema.Types.ObjectId, required: true, index: true},
    //player id
    playerId: {type: Schema.Types.ObjectId, ref: 'playerInfo', required: true, index: true},
    //task data, data structure depend on type
    data: {type: JSON, default: null},
    //creation time
    createTime: {type: Date, default: Date.now, index: true},
    //task unlock time
    unlockTime: {type: Date},
    //indicate whether the reward amount was transfered in provider
    inProvider: {type: Boolean, default: false},
    //required amount to amount
    requiredUnlockAmount: {type: Number, default: 0},
    //required bonus amount to unlock task
    requiredBonusAmount: {type: Number, default: 0},
    //unlocked bonus amount
    unlockedBonusAmount: {type: Number, default: 0},
    //current unlocked amount, if current unlock amount is >= requiredUnlockAmount, reward task is unlocked
    unlockedAmount: {type: Number, default: 0},
    //player's valid credit that transferred into the game
    _inputCredit: {type: Number, default: 0},
    //current reward amount
    currentAmount: {type: Number, default: 0},
    //target amount
    targetAmount: {type: Number, default: 0},
    //init reward amount
    initAmount: {type: Number, default: 0},
    //for no credit check
    bonusAmount: {type: Number, default: 0},
    //application amount
    applyAmount: {type: Number, default: 0},
    //if reward task is unlocked
    isUnlock: {type: Boolean, default: false},
    //if this reward task will use consumption record
    useConsumption: {type: Boolean, default: true},
    //reward event id
    eventId: {type: Schema.Types.ObjectId},
    //max reward amount
    maxRewardAmount: {type: Number},
    //related proposal id
    proposalId: {type: String, index: true},
    //use locked credit
    useLockedCredit: {type: Boolean, default: false}
});

rewardTaskSchema.index({targetProviders: 1});

module.exports = rewardTaskSchema;


