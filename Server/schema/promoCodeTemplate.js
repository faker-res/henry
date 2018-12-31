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
    allowedProviders: [{type: Schema.ObjectId}],
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
    isSharedWithXIMA: {type: Boolean, default: true},
    // created time
    createTime: {type: Date, default: Date.now, index: true},
    // Promo Code Accept Time
    acceptedTime: {type: Date},
    // Promo Code Expiration Time
    expirationTime: {type: Date},
    // Promo Code Status
    status: {type: Number, index: true},
    // set to true if the inherited promoCodeType is deleted
    isDeleted: {type: Boolean, default: false},
    //admin id, that create this promo code
    adminId: {type: Schema.ObjectId},
    //admin name, that create this promo code
    adminName: {type: String},
    // Promo Code Active Flag
    isActive: {type: Boolean, default: false, index: true},
    // remark
    remark: {type: String},
    // category: 1: general; 2: for auction system
    genre: {type: Number, index: true}

});

promoCodeTemplateSchema.index({platformObjId: 1});

module.exports = promoCodeTemplateSchema;
