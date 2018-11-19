let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerRetentionRewardGroupRecordSchema = new Schema({

    // reward event objectId
    rewardEventObjId: {type: Schema.ObjectId, ref: 'rewardEvent', required: true, index: true},
    //platform objectId
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // player info
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    //the top up record that is used for the application
    topUpRecordObjId: {type: Schema.ObjectId, ref: 'playerTopUpRecord', index: true},
    // topUp amount after deducting service charge
    actualTopUpAmount: {type: Number},
    // top up amount before deducting service charge
    applyTopUpAmount: {type: Number},
    // the last applied date for this reward
    lastApplyDate: {type: Date, index: true},
    //the last time when the reward is distributed
    lastDistributedDay: {type: Date, index: true},
    // accumulative day
    accumulativeDay: {type: Number, default: 1},

});

playerRetentionRewardGroupRecordSchema.index({rewardEventObjId: 1, playerObjId: 1, platformObjId: 1});

module.exports = playerRetentionRewardGroupRecordSchema;
