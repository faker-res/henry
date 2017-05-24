var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constPlatformStatus = require("./../const/constPlatformStatus");
var counterManager = require("../modules/counterManager.js");

var platformSchema = new Schema({
    //simplified platformId
    platformId: {type: String, unique: true, index: true},
    //platform name
    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    //platform code
    code: {type: String, unique: true, required: true, dropDups: true, index: true},
    //platform prefix
    prefix: {type: String, default: ""},
    //platform partner prefix
    partnerPrefix: {type: String, default: ""},
    //platform description
    description: String,
    //platform url
    url: String,
    //main department for platform
    department: {type: Schema.ObjectId, ref: 'department', default: null},
    //game providers
    gameProviders: [{type: Schema.ObjectId, ref: 'gameProvider'}],
    gameProviderInfo: {}, // Map of providerId => {localNickName, localPrefix} (called gameProviderNickNameData objects)
    //paymentChannels
    paymentChannels: [{type: Schema.ObjectId, ref: 'paymentChannel'}],
    //daily settlement time, hour(0-23) Minutes(0-59)
    dailySettlementHour: {type: Number, min: 0, max: 23, default: null},
    dailySettlementMinute: {type: Number, min: 0, max: 59, default: null},
    //weekly settlement time, day(0-6) hour(0-23) Minutes(0-59)
    weeklySettlementDay: {type: Number, min: 0, max: 6, default: null},
    weeklySettlementHour: {type: Number, min: 0, max: 23, default: null},
    weeklySettlementMinute: {type: Number, min: 0, max: 60, default: null},
    //settlement status, daily settlement, weekly settlement or ready
    settlementStatus: {type: String, default: constPlatformStatus.READY},
    //last daily settlement time
    lastDailySettlementTime: {type: Date},
    //last weekly settlement time
    lastWeeklySettlementTime: {type: Date},
    //email address used when sending emails to players
    csEmail: {type: String},
    //Customer Service phone
    csPhone: {type: String},
    //cs url
    csUrl: {type: String},
    csWeixin: {type: String},
    csQQ: {type: String},
    icon: {type: String},
    //OFFICIAL_ACCOUNT_WEIXIN
    oaWeixin: {type: String},
    //wechat photo
    weixinPhotoUrl: {type: String},
    //auto settlement
    canAutoSettlement: {type: Boolean, default: false},
    //invitation url for player from partner
    playerInvitationUrl: {type: String},
    //invitatio url for partner from partner
    partnerInvitationUrl: {type: String},
    //min top up amount
    minTopUpAmount: {type: Number, default: 0},
    //percentage charges of apply bonus
    bonusPercentageCharges:{type: Number, default: 0},
    //numbers of times apply bonus without charges
    bonusCharges:{type:Number},
    //allow same real name to register? for frontEnd only, they still can register via office
    allowSameRealNameToRegister: {type: Boolean, default: true},
    // Platform-wide SMS Verification Setting
    requireSMSVerification: {type: Boolean, default: false},
    //allow same phone number to register
    allowSamePhoneNumberToRegister: {type: Boolean, default: true}
});

//add platform id before save
platformSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('platformId'));

module.exports = platformSchema;
