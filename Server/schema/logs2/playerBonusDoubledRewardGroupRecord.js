let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerBonusDoubledRewardGroupRecordSchema = new Schema({

    // reward event objectId
    rewardEventObjId: {type: Schema.ObjectId, ref: 'rewardEvent', required: true, index: true},
    //platform objectId
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // player info
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // the applied date for this reward
    lastApplyDate: {type: Date, index: true},
    // how many time does the player trigger the reward settlement to get the reward bonus
    applyTimes: {type: Number, default: 0},
    // // the selected rewardBonusModal -> 1: dynamic rewardAmount; 2: fixed rewardAmount
    // rewardBonusModal: {type: Number, index: true},
    // the selected gameProviders for this reward
    gameProviders: [{type: Schema.ObjectId, ref: 'gameProvider', index: true}],
    // isApplying: false - is open to apply; true - is applied, can proceed to get bonus reward
    isApplying: {type: Boolean, default: false, index: true}

});

playerBonusDoubledRewardGroupRecordSchema.index({rewardEventObjId: 1, playerObjId: 1, platformObjId: 1});

module.exports = playerBonusDoubledRewardGroupRecordSchema;
