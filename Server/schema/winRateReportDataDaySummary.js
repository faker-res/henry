let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let winRateReportDataDaySummarySchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // platform ID
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // payment time
    date: {type: Date, required: true, index: true},
    //provider ID
    providerId: {type: Schema.ObjectId, index: true},
    //cp game type
    cpGameType: {type: String, index: true},
    //consumption times
    consumptionTimes: {type: Number, required: true, default: 0, index: true},
    //consumption amount
    consumptionAmount: {type: Number, required: true, default: 0, index: true},
    //consumption valid amount
    consumptionValidAmount: {type: Number, required: true, default: 0, index: true},
    //consumption bonus amount
    consumptionBonusAmount: {type: Number, required: true, default: 0, index: true},
    //scheduler summary data create time
    createTime: {type: Date, index: true, default: Date.now},
    //loginDevice
    loginDevice: {type: Number, index: true}
});

module.exports = winRateReportDataDaySummarySchema;