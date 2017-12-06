var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constRewardTaskStatus = require("./../const/constRewardTaskStatus");

var rewardPointsTask = new Schema({

    // reward point Id
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints'},

    playerObjId: {type: Schema.ObjectId, ref: 'player'},

    rewardPoints: {type: Number},
    // category of reward, base on constRewardPointsLogCategory
    category: {type: Number},
    //required amount to amount
    requiredUnlockAmount: {type: Number, default: 0},
    //current unlocked amount, if current unlock amount is >= requiredUnlockAmount, reward points task is unlocked
    unlockedAmount: {type: Number, default: 0},
    //if reward task is unlocked
    isUnlock: {type: Boolean, default: false},
    //task unlock time
    unlockTime: {type: Date},
    //related proposal id
    proposalId: {type: String, index: true},
    //reward task status
    status: {type: String, default: constRewardTaskStatus.STARTED},

    remark: {type: String},

    providerGroup: {type: Schema.ObjectId, ref: 'gameProviderGroup'},

    createTime: {type: Date, default: Date.now}
});

module.exports = rewardPointsTask;
