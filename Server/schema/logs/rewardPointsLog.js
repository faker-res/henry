let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let counterManager = require("../../modules/counterManager");

let rewardPointsLog = new Schema({
    // a number counter ID for point change log
    pointLogId: {type: String, index: true},
    // reward point Id
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints', index: true},
    // only available for point-to-credit transition
    rewardPointsTaskObjId: {type: Schema.ObjectId, ref: 'rewardTask'},
    // only available for point-to-credit transition
    proposalId: {type: String},

    playerName: {type: String},
    // player level name
    playerLevelName: {type: String},
    // category of reward, base on constRewardPointsLogCategory
    category: {type: Number},
    // event title
    rewardTitle: {type: String},
    // event description
    rewardContent: {type: String},
    // event period setting
    rewardPeriod: {type: Number},
    // reward target
    rewardTarget: {type: JSON, default: {}},
    // apply user agent, base on constPlayerRegistrationInterface
    userAgent: {type: Number},
    // point before change
    oldPoints: {type: Number},
    // point after change
    newPoints: {type: Number},
    // changed amount
    amount: {type: Number},
    // day point amount applied (not including current log)
    currentDayAppliedAmount: {type: Number},
    // max day point amount applied
    maxDayApplyAmount: {type: Number},
    // creator (admin name or player name
    creator: {type: String},

    remark: {type: String},
    //base on constRewardPointsLogStatus
    status: {type: Number},

    createTime: {type: Date, default: Date.now}
});

module.exports = rewardPointsLog;

rewardPointsLog.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('pointLogId'));