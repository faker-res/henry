let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// this partner commission config will use to record the partner commission setting
// of specific partner that is the first level (does not have up line)

let partnerMainCommConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    //game provider group _id
    provider: {type: Schema.ObjectId, ref: 'gameProviderGroup'},
    // If exists, this setting is customized for this partner
    partner: {type: Schema.ObjectId, ref: 'partner'},
    //commission type
    commissionType: {type: String},
    //commission setting
    commissionSetting: [{
        _id: false,
        //Consumption Bonus Amount Or Consumption Valid Amount
        playerConsumptionAmountFrom: {type: Number},
        playerConsumptionAmountTo: {type: Number},
        //Active Player
        activePlayerValueFrom: {type: Number},
        activePlayerValueTo: {type: Number},
        //Commission Rate
        commissionRate: {type: Number}
    }],
    // Rates
    rateAfterRebatePromo: {type: String},
    rateAfterRebatePlatform: {type: String},
    rateAfterRebateGameProviderGroup: [],
    rateAfterRebateTotalDeposit: {type: String},
    rateAfterRebateTotalWithdrawal: {type: String},
    // parent partner commission rate
    parentCommissionRate: {type: String}
});

partnerMainCommConfigSchema.index({platform: 1, provider: 1, commissionType: 1, partner: 1});

module.exports = partnerMainCommConfigSchema;


