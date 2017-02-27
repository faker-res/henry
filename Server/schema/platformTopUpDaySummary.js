var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformTopUpDaySummarySchema = new Schema({
    // platform ID
    platformId: {type: String, required: true},
    // payment time
    date: {type: Date, default: Date.now},
    //numerical value of hte amount top-upped
    amount: {type: Number, required: true, default: 0},
    //numerical value of hte amount top-upped
    currency: {type: String, required: true, default: 0},
    //check if this record has been used for any bonus
    dirty: {type: Boolean, default: false}
});

//record is unique by playerId and date
platformTopUpDaySummarySchema.index({ platformId: 1, date: 1 });

module.exports = platformTopUpDaySummarySchema;