var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerConsumptionDaySummarySchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true},
    // platform Id
    platformId: {type: Schema.ObjectId, required: true},
    // payment time
    date: {type: Date, required: true},
    //total amount
    amount: {type: Number, default: 0},
    //valid amount for reward
    validAmount: {type: Number, default: 0},
    //total consumption times
    times: {type: Number, default: 0}
});

//record is unique by playerId platformId and date
playerConsumptionDaySummarySchema.index({ playerId: 1, platformId: 1, date: 1 });

module.exports = playerConsumptionDaySummarySchema;