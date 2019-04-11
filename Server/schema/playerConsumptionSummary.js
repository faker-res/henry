var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerConsumptionSummarySchema = new Schema({
    // player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // platform Id
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // game type
    gameType: {type: String, required: true, index: true},
    //total amount for statistics
    amount: {type: Number, required: true, default: 0},
    //total valid amount for statistics
    validAmount: {type: Number, default: 0},
    //check if record has been processed already
    bDirty: {type: Boolean, default: false},
    //summary day time at 0am
    summaryDay: {type: Date, required: true, index: true},
    // when this record was first created
    createTime: {type: Date, default: Date.now, index: true},
    // when this record was made dirty
    dirtyDate: {type: Date, default: null},
    // list of ids of consumption records which correspond to this summary (for verification purposes)
    consumptionRecords: [{type: Schema.Types.ObjectId}],
    // Accummulation of non XIMA amount
    nonXIMAAmt: {type: Number, default: 0}
});

module.exports = playerConsumptionSummarySchema;

