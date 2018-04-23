let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let partnerCommissionRateConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    rateAfterRebatePromo: {type: String},
    rateAfterRebatePlatform: {type: String},
    rateAfterRebateGameProviderGroup: [],
    rateAfterRebateTotalDeposit: {type: String},
    rateAfterRebateTotalWithdrawal: {type: String}
});

module.exports = partnerCommissionRateConfigSchema;


