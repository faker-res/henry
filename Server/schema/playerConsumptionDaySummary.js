var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerConsumptionDaySummarySchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // platform Id
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // Summary start date
    startTime: {type: Date, index: true},
    // Summary end date
    endTime: {type: Date, index: true},
    //total amount
    amount: {type: Number, default: 0},
    //valid amount for reward
    validAmount: {type: Number, default: 0},
    // Bonus amount
    bonusAmount: {type: Number, default: 0},
    //total consumption times
    times: {type: Number, default: 0},

    // DEPRECATED
    // payment time
    date: {type: Date, index: true},
});

//record is unique by playerId platformId and date
playerConsumptionDaySummarySchema.index({ playerId: 1, platformId: 1, date: 1 });
playerConsumptionDaySummarySchema.index({ playerId: 1, platformId: 1, startTime: 1, endTime: 1 });

module.exports = playerConsumptionDaySummarySchema;
