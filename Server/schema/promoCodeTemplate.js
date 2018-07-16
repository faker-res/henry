let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeTemplateSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true},
    // promo code reward amount
    amount: {type: Number, required: true},
    // promo code minimum top up amount
    minTopUpAmount: {type: Number},
    // promo code maximum reward amount
    maxRewardAmount: {type: Number},
    // promo code required consumption
    requiredConsumption: {type: Number, required: true},
    // Disable Withdrawal after accept promo code
    disableWithdraw: {type: Boolean, default: false, index: true},
    // Allowed Game Providers, empty if all providers
    allowedProviders: {type: Schema.ObjectId},
    // Is platform using provider group
    isProviderGroup: {type: Boolean},
    // Banner Text
    bannerText: {type: String},
    // SMS Content
    smsContent: {type: String},
    // the name of the promoCode Type
    name: {type: String},
    // the expired date = the moment it sends out + expiredInDay
    expiredInDay: {type: Number},
    // the title for the internal mail
    interMailTitle: {type: String},
    // the type of promoCode
    type: {type: Number},
    // Reward amount shared with XIMA
    isSharedWithXIMA: {type: Boolean, default: true}

});

promoCodeTemplateSchema.index({platformObjId: 1});

module.exports = promoCodeTemplateSchema;
