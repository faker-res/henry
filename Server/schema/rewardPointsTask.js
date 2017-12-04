var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPointsTask = new Schema({

    // reward point Id
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints'},

    rewardPoints: {type: Number},
    // category of reward, base on constRewardPointsLogCategory
    category: {type: Number},
    //required amount to amount
    requiredUnlockAmount: {type: Number, default: 0},
    //current unlocked amount, if current unlock amount is >= requiredUnlockAmount, reward task is unlocked
    unlockedAmount: {type: Number, default: 0},
    //if reward task is unlocked
    isUnlock: {type: Boolean, default: false},
    //related proposal id
    proposalId: {type: String, index: true},

    remark: {type: String},

    createTime: {type: Date, default: Date.now}
});

module.exports = rewardPointsTask;
