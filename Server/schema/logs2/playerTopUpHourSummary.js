const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playerTopUpHourSummary = new Schema({
    // platformId
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // playerId
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // player name
    name: {type: String, required: true},
    // rank
    rank: {type: String, required: true},
    // provider Name
    providerName: {type: String, required: true, index: true},
    // game name
    gameName: {type: String, required: true},
    // update time, will get current time after amount calculated
    updateTime: {type: Date, default: Date.now, index: true},
    // consumption related
    amount: {type: Number, default: 0},
    // consumptionValidAmount: {type: Number, default: 0},
    // consumptionBonusAmount: {type: Number, default: 0},
    // winRatio: {type: Number, index: true},
    // Type define whether is top up, withdraw, consumption .etc
    type: {type: String, required: true}

});

module.exports = playerTopUpHourSummary;