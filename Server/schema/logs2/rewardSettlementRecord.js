let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let rewardSettlementRecordSchema = new Schema({
    // Platform
    platform: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // last time executing
    lastExecutedTime: {type: Date, default: Date.now, index: true},
    // reward
    reward: {type: Schema.Types.ObjectId, ref: 'rewardEvent', required: true, index: true}

});

module.exports = rewardSettlementRecordSchema;
