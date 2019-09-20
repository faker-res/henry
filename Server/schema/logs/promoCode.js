let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // user id
    playerObjId: {type: Schema.ObjectId, ref: 'player', required: true, index: true},
    // promo code type
    promoCodeTypeObjId: {
        type: Schema.ObjectId,
        ref: 'promoCodeType',
        required: [
            function() { return this.promoCodeTemplateObjId == null; },
            'promoCodeTypeObjId is required if promoCodeTemplateObjId is unspecified.'
        ],
        index: true
    },
    // promo code template
    promoCodeTemplateObjId: {
        type: Schema.ObjectId,
        ref: 'promoCodeTemplate',
        required: [
            function() { return this.promoCodeTypeObjId == null; },
            'promoCodeTemplateObjId is required if promoCodeTypeObjId is unspecified.'
        ],
        index: true
    },
    //if promo code template obj id exists
    hasPromoCodeTemplateObjId: {type: Boolean, index: true, default: false},
    // promo code reward amount
    amount: {type: Number, required: true},
    // promo code minimum top up amount
    minTopUpAmount: {type: Number},
    // promo code maximum top up amount
    // maxTopUpAmount: {type: Number},
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
    status: {type: Number, index: true},
    // Promo Code Active Flag
    isActive: {type: Boolean, default: false, index: true},
    // Top Up Proposal Used for this promo code
    topUpProposalId: {type: String},
    // Promo Code Proposal Id
    proposalId: {type: String, index: true},
    // Promo Code Accepted Amount
    acceptedAmount: {type: Number},
    // Promo Code Top Up Amount
    topUpAmount: {type: Number, default: 0},
    // Reward amount shared with XIMA
    isSharedWithXIMA: {type: Boolean, default: true},
    // forbid withdraw if there is certain amount of balance after unlock
    forbidWithdrawIfBalanceAfterUnlock: {type: Number},
    // set to true if the inherited promoCodeType is deleted
    isDeleted: {type: Boolean, default: false},
    // Mark as viewed
    isViewed: {type: Boolean, default: false},
    //admin id, that create this promo code
    adminId: {type: Schema.ObjectId},
    //admin name, that create this promo code
    adminName: {type: String},
    // remark
    remark: {type: String},
    //auto feedback mission obj id
    autoFeedbackMissionObjId: {type: Schema.ObjectId, index: true},
    //if auto feedback mission obj id exists
    hasAutoFeedbackMissionObjId: {type: Boolean, index: true, default: false},
    //auto feedback schedule number (first, second, or third time)
    autoFeedbackMissionScheduleNumber: {type: Number, index: true},
    //match with login
    autoFeedbackMissionLogin: {type: Boolean, index: true, default: false},
    //match with top up
    autoFeedbackMissionTopUp: {type: Boolean, index: true},
    // sms channel
    channel: {type: String, index: true},
});

promoCodeSchema.index({platformObjId: 1, createTime: 1});
promoCodeSchema.index({promoCodeTemplateObjId: 1});
// promoCodeSchema.index({platformObjId: 1, playerObjId: 1, hasPromoCodeTemplateObjId: 1, hasAutoFeedbackMissionObjId: 1, autoFeedbackMissionLogin: 1}); // index namespace too long

module.exports = promoCodeSchema;
