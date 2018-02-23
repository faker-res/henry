var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var gameProviderDaySummarySchema = new Schema({
    //provider id
    providerId: {type: Schema.ObjectId, required: true, index: true},
    // game Id
    gameId: {type: Schema.ObjectId, required: true, index: true},
    // game type
    gameType: {type: String, required: true, index: true},
    //platform id
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // payment time
    date: {type: Date, required: true, index: true},
    //total amount
    amount: {type: Number, default: 0},
    //total valid amount
    validAmount: {type: Number, default: 0},
    //total bonus amount
    bonusAmount: {type: Number, default: 0},
    //consumption times
    consumptionTimes: {type: Number, default: 0}
});

//record is unique by playerId platformId and date
gameProviderDaySummarySchema.index({ providerId: 1, gameId: 1, date: 1});

module.exports = gameProviderDaySummarySchema;
