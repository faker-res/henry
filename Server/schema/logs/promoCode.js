let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true},
    // promo code type name
    playerObjId: {type: Schema.ObjectId, ref: 'player', required: true},
    // promo code type name
    promoCodeTypeObjId: {type: Schema.ObjectId, ref: 'promoCodeType', required: true},
    // promo code type
    amount: {type: Number, required: true},
    // promo code minimum top up amount
    minTopUpAmount: {type: Number},
    // promo code type
    requiredConsumption: {type: Number, required: true},
    //if this proposal has any step
    disableWithdraw: {type: Boolean, default: false, index: true},
    //game providers
    allowedProviders: [{type: Schema.ObjectId}],
    // Banner Text
    bannerText: {type: String},
    // promo code type
    code: {type: Number, required: true},
    // SMS Content
    smsContent: {type: String},
    // create Time
    createTime: {type: Date, default: Date.now, index: true},
    // create Time
    acceptedTime: {type: Date},
    //expiry date for each proposal
    expirationTime: {type: Date},
    // Promo Code Status
    status: {type: Number},
    // Promo Code Active Flag
    isActive: {type: Boolean, default: false}
});

module.exports = promoCodeSchema;