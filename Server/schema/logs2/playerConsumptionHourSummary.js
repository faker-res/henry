const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playerConsumptionHourSummary = new Schema({
    // platformId
    platform: {type: Schema.ObjectId, required: true, index: true},
    // playerId
    player: {type: Schema.ObjectId, required: true, index: true},
    // provider ID
    provider: {type: Schema.ObjectId, required: true, index: true},
    // start time (always start from 00:00.000 to 59:59.999)
    startTime: {type: Date, index: true},
    // consumption related
    consumptionAmount: {type: Number, default: 0},
    consumptionValidAmount: {type: Number, default: 0},
    consumptionBonusAmount: {type: Number, default: 0},
    consumptionTimes: {type: Number, default: 0},
    // constDevice
    loginDevice: {type: String, index: true},

});

module.exports = playerConsumptionHourSummary;

playerConsumptionHourSummary.index({platform: 1, player: 1, provider: 1, startTime: 1});
playerConsumptionHourSummary.index({platform: 1, provider: 1, startTime: 1});
playerConsumptionHourSummary.index({platform: 1, startTime: 1});