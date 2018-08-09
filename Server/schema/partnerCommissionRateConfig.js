let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let partnerCommissionRateConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // If exists, this setting is customized for this partner
    partner: {type: Schema.ObjectId, ref: 'partner'},
    // Rates
    rateAfterRebatePromo: {type: String},
    rateAfterRebatePlatform: {type: String},
    rateAfterRebateGameProviderGroup: [],
    rateAfterRebateTotalDeposit: {type: String},
    rateAfterRebateTotalWithdrawal: {type: String},
    // parent partner commission rate
    parentCommissionRate: {type: String}
});

partnerCommissionRateConfigSchema.index({platform: 1, partner: 1});

module.exports = partnerCommissionRateConfigSchema;


