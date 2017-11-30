let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true},
    // user id
    playerObjId: {type: Schema.ObjectId, ref: 'player', required: true},
    // promo code type
    promoCodeTypeObjId: {type: Schema.ObjectId, ref: 'promoCodeType', required: true},
    // promo code reward amount
    amount: {type: Number, required: true},
    // promo code minimum top up amount
    minTopUpAmount: {type: Number},
    // promo code maximum top up amount
    maxTopUpAmount: {type: Number},
    // promo code required consumption
    requiredConsumption: {type: Number, required: true},
    // Disable Withdrawal after accept promo code
    disableWithdraw: {type: Boolean, default: false, index: true},
    // Allowed Game Providers, empty if all providers
    allowedProviders: [{type: Schema.ObjectId}],
    // Is platform using provider group
    isProviderGroup: {type: Boolean},
    // Banner Text
    bannerText: {type: String},
    // Promo Code
    code: {type: Number, required: true},
    // SMS Content
    smsContent: {type: String},
    // create Time
    createTime: {type: Date, default: Date.now, index: true},
    // Promo Code Accept Time
    acceptedTime: {type: Date},
    // Promo Code Expiration Time
    expirationTime: {type: Date},
    // Promo Code Status
    status: {type: Number},
    // Promo Code Active Flag
    isActive: {type: Boolean, default: false},
    // Top Up Proposal Used for this promo code
    topUpProposalId: {type: String},
    // Promo Code Proposal Id
    proposalId: {type: String},
    // Promo Code Accepted Amount
    acceptedAmount: {type: Number},
    // Promo Code Top Up Amount
    topUpAmount: {type: Number, default: 0}
});

module.exports = promoCodeSchema;