let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let openPromoCodeTemplateSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true},
    //name of the openPromoCode
    name: {type: String, index: true},
    // type of the openPromoCode
    type: {type: Number, index: true},
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
    // forbid withdraw if there is certain amount of balance after unlock
    forbidWithdrawIfBalanceAfterUnlock: {type: Number},
    // Allowed Game Providers, empty if all providers
    allowedProviders: [{type: Schema.ObjectId}],
    // Is platform using provider group
    isProviderGroup: {type: Boolean},
    // Promo Code
    code: {type: Number, required: true, index: true},
    // the time when the template is created
    createTime: {type: Date, default: Date.now, index: true},
    // Promo Code Accept Time
    acceptedTime: {type: Date},
    // Promo Code Expiration Time
    expirationTime: {type: Date},
    // Promo Code Status
    status: {type: Number, index: true},
    // Promo Code Active Flag
    isActive: {type: Boolean, default: false, index: true},
    // Reward amount shared with XIMA
    isSharedWithXIMA: {type: Boolean, default: true},
    // set to true if the inherited promoCodeType is deleted
    isDeleted: {type: Boolean, default: false},
    //admin id, that create this promo code
    adminId: {type: Schema.ObjectId},
    //admin name, that create this promo code
    adminName: {type: String},
    // remark
    remark: {type: String},
    // the appply limit per player
    applyLimitPerPlayer: {type: Number},
    // the total available quantity for application
    totalApplyLimit: {type: Number},
    // the requeting limit for the same IP
    ipLimit: {type: Number},
    // the time when the openPromoCode is sent to player (special for auction system)
    sendTime: {type: Date, index: true},
    // expired after the number of days the open promo code is sent (special for auction system)
    expiredInDay: {type: Number, index: true},
    // category: 1: general; 2: for auction system
    genre: {type: Number, index: true}

});

openPromoCodeTemplateSchema.index({platformObjId: 1, createTime: 1});

module.exports = openPromoCodeTemplateSchema;
