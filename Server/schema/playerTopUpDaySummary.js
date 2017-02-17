var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerTopUpDaySummarySchema = new Schema({
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
playerTopUpDaySummarySchema.index({ playerId: 1, platformId: 1, date: 1 });

module.exports = playerTopUpDaySummarySchema;