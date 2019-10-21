var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPointsEvent = new Schema({
    // platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // for view ordering
    index: {type: Number},

    rewardTitle: {type: String, required: true},
    // reward details explaination
    rewardContent: {type: String},
    // category of reward, base on constRewardPointsTaskCategory
    category: {type: Number, required: true},
    // period
    period: {type: Number, required: true, index: true},
    // start time - only use when period is 'custom'
    customPeriodStartTime: {type: Date},
    // end time - only use when period is 'custom'
    customPeriodEndTime: {type: Date},
    // userAgent, base on constPlayerRegistrationInterface
    userAgent: {type: Number, index: true},
    // number of streak
    consecutiveCount: {type: Number, index: true},

    rewardPoints: {type: Number, index: true},

    createTime: {type: Date, default: Date.now},

    status: {type: Boolean, default: false},
    // event details base on category
    target: {type: JSON, default: {}},
    // player level
    level: {type: Schema.ObjectId, ref: 'playerLevel', index: true},
    // pointMode: 1-登陆，2-签到
    pointMode: {type: Number, default: 1},
});

module.exports = rewardPointsEvent;
