var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPointsTask = new Schema({
    // a number counter ID for point change log
    pointLogId: {type: String, index: true},
    // reward point Id
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints', index: true},

    rewardPointsEventObjId: {type: Schema.ObjectId, ref: 'rewardPointsEvent'},

    rewardPoints: {type: Number},
    // category of reward, base on constRewardPointsTaskCategory
    category: {type: Number},

    remark: {type: String},

    status: {type: Number},

    createTime: {type: Date, default: Date.now}
});

module.exports = rewardPointsTask;
