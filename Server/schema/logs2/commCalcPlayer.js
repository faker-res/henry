let mongoose = require('mongoose');
let Schema = mongoose.Schema;
// record all commCalc's player detail

// demo player details
let commCalcPlayerSchema = new Schema({
    // platform
    platform:  {type: Schema.ObjectId, ref: 'platform'},
    // partner commission log object id
    commCalc: {type: Schema.ObjectId, ref: 'partnerCommissionLog', required: true, index: true},
    // player name
    name: {type: String},
    // player real name
    realName: {type: String},
    // active
    active: {type: Boolean},
    // consumption detail
    consumptionDetail: [],
    // reward detail
    rewardDetail: {},
    // top up detail
    topUpDetail: {},
    // withdrawal detail
    withdrawalDetail: {}
});

module.exports = commCalcPlayerSchema;