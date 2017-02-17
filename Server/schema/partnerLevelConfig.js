var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerLevelConfigSchema = new Schema({
    platform: {type: Schema.ObjectId, required: true},
    // This is how we decide if a player is valid
    validPlayerTopUpTimes: {type: Number, required: true},
    validPlayerConsumptionTimes: {type: Number, required: true},
    // This is how we decide if a player is active
    activePlayerTopUpTimes: {type: Number, required: true},
    activePlayerConsumptionTimes: {type: Number, required: true}
});

module.exports = partnerLevelConfigSchema;