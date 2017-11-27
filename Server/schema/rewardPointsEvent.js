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
    period: {type: Number, required: true},
    // start time - only use when period is 'custom'
    customPeriodStartTime: {type: Date},
    // end time - only use when period is 'custom'
    customPeriodEndTime: {type: Date},
    // userAgent, base on constPlayerRegistrationInterface
    userAgent: {type: Number},
    // number of streak
    consecutiveCount: {type: Number},

    rewardPoints: {type: Number},

    createTime: {type: Date, default: Date.now},
    // event details base on category
    target: {type: JSON, default: {}}
});

module.exports = rewardPointsEvent;
