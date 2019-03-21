var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var dbConfig = require('./../modules/dbproperties');

var playerLevelSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // Player level such as "VIP", "Regular"
    name: {type: String, required: true, index: true},
    //level value, used for level comparison
    value: {type: Number, required: true, index: true},

    levelUpConfig: [{
        andConditions: {type: Boolean}, /* true => AND, false => OR */
        // Minimum Topup amount for the level
        topupLimit: {type: Number, default: 10, required: true},
        topupPeriod: {type: String, required: true},
        //minimum consumption value required for this level
        consumptionSourceProviderId: {type: Array, default: []},
        consumptionLimit: {type: Number, default: 20, required: true},
        consumptionPeriod: {type: String, required: true}
    }],

    levelDownConfig: [{
        andConditions: {type: Boolean}, /* true => AND, false => OR */
        // Minimum topup required to stay at this level
        topupMinimum: {type: Number, default: 0, required: true},
        topupPeriod: {type: String, required: true},
        // Minimum consumption required to stay at this level
        // consumptionSourceProviderId: {type: Array, default: []},
        consumptionMinimum: {type: Number, default: 0, required: true},
        consumptionPeriod: {type: String, required: true}
    }],

    // Minimum consumption amount for the level in every game type
    // example - consumption: { casual: 50, card: 50, adventure:30, sport:30 }
    consumption: {type: JSON},
    reward: {
        _id: false,
        bonusCredit: {type: Number, default: 20},
        isRewardTask: {type: Boolean, default: false},
        providerGroup: {type: String, default: 'free'},
        requiredUnlockTimes: {type: Number, default: 0},
        requiredUnlockAmount: {type: Number, default: 0} // unlock amount is deprecated, use times instead
    },

    // used for player value calculation
    playerValueScore: {type: Number, default: 2},

    //if player of this level can apply for consumption return
    canApplyConsumptionReturn: {type: Boolean},
    // region XBET sport - no default value (currently only for XBET)
    // withdrawal consumption
    withdrawalConsumption: {type: Number},
    //commission pool switch
    // disableCommissionPool: {type: Boolean},
    // daily commission withdrawal limit
    // dailyCommissionWithdrawLimit: {type: Number},
    // daily member fund
    // dailyMemberFund: {type: Number},
    // glory package switch (level up reward)
    gloryPackage: {type: Boolean},
    // customer service video chat switch
    videoCallCS: {type: Boolean},
    // live commenting switch (弹幕颜色)
    liveCommentColor: {type: String},
    // endregion
});

//record is unique by platform, name and platform, value
playerLevelSchema.index({platform: 1, value: 1}, {unique: true});
playerLevelSchema.index({platform: 1, name: 1}, {unique: true});

playerLevelSchema.post('findOneAndRemove', function (result) {
    dbConfig.collection_rewardPointsLvlConfig.update({platformObjId: result.platform}, {$pull: {params: {levelObjId: result._id}}}).catch(console.error);
    return result;
});



module.exports = playerLevelSchema;
