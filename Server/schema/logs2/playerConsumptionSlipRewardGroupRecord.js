let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerConsumptionSlipRewardGroupRecordSchema = new Schema({

    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // player info
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // consumptionSlip number
    consumptionSlipNo: {type: String, index: true, unique:true},
    // bonus amount
    bonusAmount: {type: Number},
    // betting amount
    betAmount: {type: Number},

});

playerConsumptionSlipRewardGroupRecordSchema.index({platform: 1, playerObjId: 1});

module.exports = playerConsumptionSlipRewardGroupRecordSchema;
