var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerGameTypeConsumptionWeekSummarySchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true},
    // platform Id
    platformId: {type: Schema.ObjectId, required: true},
    // game type
    gameType: {type: String, required: true},
    // payment time
    date: {type: Date, required: true},
    //numerical value of the amount
    amount: {type: Number, default: 0},
    //numerical value of the valid amount
    validAmount: {type: Number, default: 0}
});

//record is unique by playerId platformId and date
playerGameTypeConsumptionWeekSummarySchema.index({ playerId: 1, platformId: 1, date: 1, gameType: 1 });

module.exports = playerGameTypeConsumptionWeekSummarySchema;