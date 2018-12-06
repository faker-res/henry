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
    // the gameProvider where the credit is transferred-in to
    gameProviderObjId: {type: Schema.ObjectId, ref: 'gameProvider', index: true},
    // the gameProviderId where the credit is tansfered-in to
    gameProviderId: {type: Number, index: true},
    // isApplying: false - is open to apply; true - is applied, can proceed to get bonus reward
    isApplying: {type: Boolean, default: false, index: true},
    // the transferring-in amount
    transferInAmount: {type: Number},
    // // the transferring-out amount
    // transferOutAmount: {type: Number},
    //transferring-in time
    transferInTime: {type: Date, index: true},
    //transferring-out time when the player is trigger the transfer-in/out
    transferOutTime: {type: Date, index: true},
    // the transferring-in Id
    transferInId: {type: String, index: true},
    // the startTime of the reward event interval: use when the transfer-in/out is triggered to locate the record
    intervalStartTime: {type: Date, index: true},
    // the endTime of the reward event interval: use when the transfer-in/out is triggered to locate the record
    intervalEndTime: {type: Date, index: true},

});

playerBonusDoubledRewardGroupRecordSchema.index({rewardEventObjId: 1, playerObjId: 1, platformObjId: 1});

module.exports = playerBonusDoubledRewardGroupRecordSchema;
