let mongoose = require('mongoose');
let Schema = mongoose.Schema;
var constRewardTaskStatus = require("../../const/constRewardTaskStatus");

let rewardTaskGroupSchema = new Schema({
    //platform id
    platformId: {type: Schema.Types.ObjectId, required: true, index: true},
    //player id
    playerId: {type: Schema.Types.ObjectId, ref: 'playerInfo', required: true, index: true},
    //reward task status
    status: {type: String, default: constRewardTaskStatus.STARTED, index: true},
    //target game provider
    //if null , means it is free amount reward task group
    providerGroup: {type: Schema.Types.ObjectId, index: true},
    //task data, data structure depend on type
    data: {type: JSON, default: null},
    //creation time
    createTime: {type: Date, default: Date.now, index: true},
    //task unlock time
    unlockTime: {type: Date},
    //indicate whether the reward amount was transfered in provider
    inProvider: {type: Boolean, default: false},

    /* Amount Related */
    // Total amount applied
    initAmt: {type: Number, default: 0},
    // Free Credit Amount (Transfer into provider)
    _inputFreeAmt: {type: Number, default: 0},
    // Reward Amount
    rewardAmt: {type: Number, default: 0},
    // Reward Amount (Transfer into provider)
    _inputRewardAmt: {type: Number, default: 0},
    // Current Consumption
    curConsumption: {type: Number, default: 0},
    // Target Consumption
    targetConsumption: {type: Number, default: 0},
    // Running reward amount based on consumption, used to unlock reward before credit is transfer out, may be delayed
    currentAmt: {type: Number, default: 0},
    // Forbidden XIMA amount
    forbidXIMAAmt: {type: Number, default: 0},
    // Balance of Forbidden XIMA Amount after consumption
    remainingForbidXIMAAmt: {type: Number},
    // Last played provider
    lastPlayedProvider: {type: Schema.Types.ObjectId},

    //if this reward task will use consumption record
    useConsumption: {type: Boolean, default: true},
    //related proposal id
    proposalId: {type: String, index: true},
    // Ban reward if player credit reached this amount after unlock
    // 0 amount will not trigger this
    forbidWithdrawIfBalanceAfterUnlock: {type: Number, default: 0},
    //the last related proposal
    lastProposalId: {type: Schema.Types.ObjectId},
    // Admin name, that unlock this reward task group manually
    unlockBy: {type: String},
});

rewardTaskGroupSchema.index({targetProviders: 1});

module.exports = rewardTaskGroupSchema;


