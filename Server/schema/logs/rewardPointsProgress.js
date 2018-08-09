var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPointsProgress = new Schema({
    // platform
    // platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // reward points
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints', index: true},
    // reward progress count
    count: {type: Number, default: 0},
    // last update progress time
    lastUpdateTime: {type: Date, default: Date.now, index: true},
    // is reward applicable
    isApplicable: {type: Boolean, default: false},
    // is reward applied
    isApplied: {type: Boolean, default: false},
    // reward points event
    rewardPointsEventObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    //for login reward points
    turnQualifiedLoginDate: {type: Date, index: true},
    //for game reward points
    todayWinCount: {type: Number},
    todayConsumptionAmountProgress: {type: Number},
    todayConsumptionCount: {type: Number},
    // progress create time
    createTime: {type: Date, default: Date.now, index: true}



});

module.exports = rewardPointsProgress;
