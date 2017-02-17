/**
 * Created by hninpwinttin on 30/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerTopUpWeekSummarySchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true},
    // platform ID
    platformId: {type: Schema.ObjectId, required: true},
    // payment time
    date: {type: Date, required: true},
    //numerical value of the amount top-upped
    amount: {type: Number, required: true, default: 0},
    //top up times
    times: {type: Number, default: 0}
});

//record is unique by playerId platformId and date
playerTopUpWeekSummarySchema.index({ playerId: 1, platformId: 1, date: 1 });

module.exports = playerTopUpWeekSummarySchema;