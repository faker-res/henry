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
    rateAfterRebateGameProviderGroup: [], // if customize provider, isCustom: true
    rateAfterRebateTotalDeposit: {type: String},
    rateAfterRebateTotalWithdrawal: {type: String},
    // parent partner commission rate
    parentCommissionRate: {type: String},
    // is particular field customize - for partner customize only
    rateAfterRebatePromoCustom: {type: Boolean, default: false},
    rateAfterRebatePlatformCustom: {type: Boolean, default: false},
    rateAfterRebateTotalDepositCustom: {type: Boolean, default: false},
    rateAfterRebateTotalWithdrawalCustom: {type: Boolean, default: false},
});

partnerCommissionRateConfigSchema.index({platform: 1, partner: 1}, {unique: true});

module.exports = partnerCommissionRateConfigSchema;


