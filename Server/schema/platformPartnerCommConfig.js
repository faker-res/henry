let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// this partner commission config will use to record admin's setting
// it will be the default partner commission setting by default

let platformPartnerCommConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    //game provider group _id
    provider: {type: Schema.ObjectId, ref: 'gameProviderGroup'},
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
    }]
});

platformPartnerCommConfigSchema.index({platform: 1, provider: 1, commissionType: 1});

module.exports = platformPartnerCommConfigSchema;
