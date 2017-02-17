/**
 * Created by hninpwinttin on 30/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerWeekSummarySchema = new Schema({
    //partner id
    partnerId: {type: Schema.ObjectId, required: true},
    //partner level
    partnerLevel: {type: Number},
    //platform id
    platformId: {type: Schema.ObjectId, required: true},
    // The start of the week covered by this summary
    date: {type: Date, required: true},
    // no of valid player
    validPlayers: {type: Number, default: 0},
    // no of active players
    activePlayers: {type: Number, default: 0},
    // Sum of amount and validAmount from players
    consumptionSum: {type: Number, default: 0},
    validConsumptionSum: {type: Number, default: 0},
    // Sum of amount and validAmount from child partners
    // (Cannot be 'required' because they are set separately, during a later process.)
    childAmount: Number,
    childValidAmount: Number,
    // Status
    status: String,
});

partnerWeekSummarySchema.index({ platformId: 1, partnerId: 1, date: 1 });

module.exports = partnerWeekSummarySchema;
