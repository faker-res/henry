let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// this partner commission config will use to record the partner commission setting
// of specific partner that is the first level (does not have up line)

let partnerMainCommRateConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // If exists, this setting is customized for this partner
    partner: {type: Schema.ObjectId, ref: 'partner', index: true},
    // Rates
    rateAfterRebatePromo: {type: String},
    rateAfterRebatePlatform: {type: String},
    rateAfterRebateGameProviderGroup: [], // if customize provider, isCustom: true
    rateAfterRebateTotalDeposit: {type: String},
    rateAfterRebateTotalWithdrawal: {type: String},
    // is particular field customize - for partner customize only
    rateAfterRebatePromoCustom: {type: Boolean, default: false},
    rateAfterRebatePlatformCustom: {type: Boolean, default: false},
    rateAfterRebateTotalDepositCustom: {type: Boolean, default: false},
    rateAfterRebateTotalWithdrawalCustom: {type: Boolean, default: false},
});

partnerMainCommRateConfigSchema.index({platform: 1, partner: 1});

module.exports = partnerMainCommRateConfigSchema;


