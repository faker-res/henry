var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformDaySummarySchema = new Schema({

    platformId: {type: Schema.ObjectId, required: true},
    // calculate time
    date: {type: Date, required: true},
    // no of valid player
    validPlayers: {type: Number, default: 0},
    // no of active players
    activePlayers: {type: Number, default: 0},
    //sum of consumption amount within a date
    consumptionAmount: {type: Number, default: 0},
    //sum of  valid  consumption amount within a date
    consumptionValidAmount: {type: Number, default: 0},
    //total no of consumption times for this platform within a date
    consumptionTimes: {type: Number, default: 0},
    //sum of topUp amount within a date
    topUpAmount: {type: Number, required: true, default: 0},
    //total no of top up times for this platform within a date
    topUpTimes: {type: Number, default: 0}

});

//record is unique by  platformId and date
platformDaySummarySchema.index({ platformId: 1, date: 1 });

module.exports = platformDaySummarySchema;