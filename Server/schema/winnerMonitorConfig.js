const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const winnerMonitorConfig = new Schema({
    // platformId
    platform: {type: Schema.ObjectId, required: true, index: true},
    // provider ID
    provider: {type: Schema.ObjectId, required: true, index: true},
    // company win ratio percentage less than (公司获利比例（≤）) in -n%
    companyWinRatio: {type: Number},
    // player won amount
    playerWonAmount: {type: Number},
    // player consumption times
    consumptionTimes: {type: Number},
});

module.exports = winnerMonitorConfig;

winnerMonitorConfig.index({platform: 1, provider: 1});