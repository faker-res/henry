var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPointsLog = new Schema({
    // a number counter ID for point change log
    pointLogId: {type: String, index: true},
    // reward point Id
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints', index: true},

    rewardPointsTaskObjId: {type: Schema.ObjectId},
    // point before change
    oldPoints: {type: Number},
    // point after change
    newPoints: {type: Number},

    remark: {type: String},

    status: {type: Number},

    createTime: {type: Date, default: Date.now}
});

module.exports = rewardPointsLog;
