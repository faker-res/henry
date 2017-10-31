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
    providerGroup: {type: Schema.Types.ObjectId},
    //task data, data structure depend on type
    data: {type: JSON, default: null},
    //creation time
    createTime: {type: Date, default: Date.now, index: true},
    //task unlock time
    unlockTime: {type: Date},
    //indicate whether the reward amount was transfered in provider
    inProvider: {type: Boolean, default: false},

    /* Amount Related */
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

    // Last played provider
    lastPlayedProvider: {type: Schema.Types.ObjectId},

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

rewardTaskGroupSchema.index({targetProviders: 1});

module.exports = rewardTaskGroupSchema;


