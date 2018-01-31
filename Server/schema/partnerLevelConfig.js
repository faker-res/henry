var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerLevelConfigSchema = new Schema({
    platform: {type: Schema.ObjectId, required: true},
    // This is how we decide if a player is valid
    validPlayerTopUpTimes: {type: Number, required: true},
    validPlayerTopUpAmount: {type: Number, required: true, default: 0},
    validPlayerConsumptionTimes: {type: Number, required: true},
    validPlayerValue: {type: Number, required:true, default: 0},
    // This is how we decide if a player is active
    activePlayerTopUpTimes: {type: Number, required: true},
    activePlayerTopUpAmount: {type: Number, required: true, default: 0},
    activePlayerConsumptionTimes: {type: Number, required: true},
    activePlayerValue: {type: Number, required: true, default: 0}
});

module.exports = partnerLevelConfigSchema;