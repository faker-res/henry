let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// NOTE :: this schema is use for determine how many partner's downline
// is active. For the one that use for DX or player report (anything that
// not related to partner commission), look for partnerLevelConfig
var activeConfigSchema = new Schema({
    platform: {type: Schema.ObjectId, required: true},
    // This is how we decide if a player is valid
    validPlayerTopUpTimes: {type: Number, required: true},
    validPlayerTopUpAmount: {type: Number, required: true, default: 0},
    validPlayerConsumptionTimes: {type: Number, required: true},
    validPlayerConsumptionAmount: {type: Number, required: true, default: 0},
    validPlayerValue: {type: Number, required:true, default: 0},
    // This is how we decide if a player is active
    activePlayerTopUpTimes: {type: Number, required: true},
    activePlayerTopUpAmount: {type: Number, required: true, default: 0},
    activePlayerConsumptionTimes: {type: Number, required: true},
    activePlayerConsumptionAmount: {type: Number, required: true, default: 0},
    activePlayerValue: {type: Number, required: true, default: 0},
    // This is how we decide if a player is active by daily
    dailyActivePlayerTopUpTimes: {type: Number, required: true, default: 0},
    dailyActivePlayerTopUpAmount: {type: Number, required: true, default: 0},
    dailyActivePlayerConsumptionTimes: {type: Number, required: true, default: 0},
    dailyActivePlayerConsumptionAmount: {type: Number, required: true, default: 0},
    dailyActivePlayerValue: {type: Number, required: true, default: 0},
    // This is how we decide if a player is active by weekly
    weeklyActivePlayerTopUpTimes: {type: Number, required: true, default: 0},
    weeklyActivePlayerTopUpAmount: {type: Number, required: true, default: 0},
    weeklyActivePlayerConsumptionTimes: {type: Number, required: true, default: 0},
    weeklyActivePlayerConsumptionAmount: {type: Number, required: true, default: 0},
    weeklyActivePlayerValue: {type: Number, required: true, default: 0},
    // This is how we decide if a player is active by half month
    halfMonthActivePlayerTopUpTimes: {type: Number, required: true, default: 0},
    halfMonthActivePlayerTopUpAmount: {type: Number, required: true, default: 0},
    halfMonthActivePlayerConsumptionTimes: {type: Number, required: true, default: 0},
    halfMonthActivePlayerConsumptionAmount: {type: Number, required: true, default: 0},
    halfMonthActivePlayerValue: {type: Number, required: true, default: 0},
    // This is how we decide if a player is active by monthly
    monthlyActivePlayerTopUpTimes: {type: Number, required: true, default: 0},
    monthlyActivePlayerTopUpAmount: {type: Number, required: true, default: 0},
    monthlyActivePlayerConsumptionTimes: {type: Number, required: true, default: 0},
    monthlyActivePlayerConsumptionAmount: {type: Number, required: true, default: 0},
    monthlyActivePlayerValue: {type: Number, required: true, default: 0},
    // This is how we decide if a player is active by season
    seasonActivePlayerTopUpTimes: {type: Number, required: true, default: 0},
    seasonActivePlayerTopUpAmount: {type: Number, required: true, default: 0},
    seasonActivePlayerConsumptionTimes: {type: Number, required: true, default: 0},
    seasonActivePlayerConsumptionAmount: {type: Number, required: true, default: 0},
    seasonActivePlayerValue: {type: Number, required: true, default: 0}
});

module.exports = activeConfigSchema;