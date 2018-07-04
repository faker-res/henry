let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let downLinesRawCommissionDetail = new Schema({
    // platform
    platform:  {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // partner commission log object id
    partnerCommissionLog: {type: Schema.ObjectId, ref: 'partnerCommissionLog', required: true, index: true},
    // player name
    name: {type: String, index: true},
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

module.exports = downLinesRawCommissionDetail;