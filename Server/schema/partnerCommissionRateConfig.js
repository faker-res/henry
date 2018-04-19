let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let partnerCommissionRateConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    rateAfterRebatePromo: {type: Number},
    rateAfterRebatePlatform: {type: Number},
    rateAfterRebateGameProviderGroup: {type: JSON, default: {}},
    rateAfterRebateTotalDeposit: {type: Number},
    rateAfterRebateTotalWithdrawal: {type: Number}
});

module.exports = partnerCommissionRateConfigSchema;


