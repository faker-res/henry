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
    icon: {type: String},
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
    //CUSTOMER SERVICE INFO
    //email address used when sending emails to players
    csEmail: {type: String},
    csEmailImageUrl: {type: String},
    csPhone: {type: String},
    csUrl: {type: String},
    csQQ: {type: String},
    csWeixin: {type: String},
    weixinPhotoUrl: {type: String},
    csSkype: {type: String},
    csDisplayUrl: {type: String},
    //OFFICIAL_ACCOUNT_WEIXIN
    oaWeixin: {type: String},
    //CUSTOMER SERVICE PARTNER INFO
    csPartnerEmail: {type: String},
    csPartnerPhone: {type: String},
    csPartnerUrl: {type: String},
    csPartnerQQ: {type: String},
    csPartnerWeixin: {type: String},
    partnerWeixinPhotoUrl: {type: String},
    csPartnerSkype: {type: String},
    csPartnerDisplayUrl: {type: String},
    //auto settlement
    canAutoSettlement: {type: Boolean, default: false},
    //invitation url for player from partner
    playerInvitationUrl: {type: String},
    //invitatio url for partner from partner
    partnerInvitationUrl: {type: String},
    //min top up amount
    minTopUpAmount: {type: Number, default: 0},
    //percentage charges of apply bonus
    bonusPercentageCharges: {type: Number, default: 0},
    //numbers of times apply bonus without charges
    bonusCharges: {type: Number},
    //allow same real name to register? for frontEnd only, they still can register via office
    allowSameRealNameToRegister: {type: Boolean, default: true},
    // Platform-wide SMS Verification Setting, for create players and create partners
    requireSMSVerification: {type: Boolean, default: false},
    // SMS Verification Setting For Password Update
    requireSMSVerificationForPasswordUpdate: {type: Boolean, default: false},
    // SMS Verification Setting For Payment Update
    requireSMSVerificationForPaymentUpdate: {type: Boolean, default: false},
    // SMS Verification Expired Time (in Minute)
    smsVerificationExpireTime: {type: Number, default: 5},
    // allow same phone number to register
    allowSamePhoneNumberToRegister: {type: Boolean, default: true},
    // same phone number to register count
    samePhoneNumberRegisterCount: {type: Number, default: 1},
    // white listing phone number
    whiteListingPhoneNumbers: [{type:String}],
    // Auto approve bonus proposal platform switch
    enableAutoApplyBonus: {type: Boolean, default: false},
    // Auto approve single withdrawal limit
    autoApproveWhenSingleBonusApplyLessThan: {type: Number, default: 0},
    // Auto approve daily total withdrawal limit
    autoApproveWhenSingleDayTotalBonusApplyLessThan: {type: Number, default: 0},
    // Auto approve repeat audit count if audit failed
    autoApproveRepeatCount: {type: Number, default: 0},
    // Auto approve delay in minutes
    autoApproveRepeatDelay: {type: Number, default: 0},
    // Auto approve deficit offset
    autoApproveLostThreshold: {type: Number, default: 0},
    // Auto approve consumption offset
    autoApproveConsumptionOffset: {type: Number, default: 0},
    // Auto approve profit times (More than this amount will change to manual audit)
    autoApproveProfitTimes: {type: Number, default: 10},
    // Auto approve minimum withdrawal amount to trigger profit times checking
    autoApproveProfitTimesMinAmount: {type: Number, default: 2000},
    // Auto approve abnormal bonus check offset
    autoApproveBonusProfitOffset: {type: Number, default: 2000},
    //can apply multiple reward
    canMultiReward: {type: Boolean, default: false},
    // Auto check player level up
    autoCheckPlayerLevelUp: {type: Boolean, default: false},
    // manual check player level up (perform by player)
    manualPlayerLevelUp: {type: Boolean, default: false},
    // player level up period (default 3 = monthly)
    playerLevelUpPeriod: {type: Number, default: 3},
    // player level down period (default 3 = monthly)
    playerLevelDownPeriod: {type: Number, default: 3},
    // user login require captcha verfication
    requireLogInCaptcha: {type: Boolean, default: false},
    // user get SMS code with captcha
    requireCaptchaInSMS: {type: Boolean, default: false},
    //only new system user can login
    onlyNewCanLogin: {type: Boolean, default: false},
    //if use locked credit
    useLockedCredit: {type: Boolean, default: false},
    // Use new type of provider group lock
    useProviderGroup: {type: Boolean, default: false},
    // if use point system
    usePointSystem: {type: Boolean, default: false},
    // if use phone number 2 steps verification
    usePhoneNumberTwoStepsVerification: {type: Boolean, default: false},
    // maximum length for player name included platform prefix
    playerNameMaxLength: {type: Number, default: 0},
    // minimum length for player name included platform prefix
    playerNameMinLength: {type: Number, default: 0},
    // maximum length for partner name included platform prefix
    partnerNameMaxLength: {type: Number, default: 0},
    // minimum length for partner name included platform prefix
    partnerNameMinLength: {type: Number, default: 0},
    // the count that trigger the failing alert in payment monitor for merchant
    monitorMerchantCount: {type: Number, default: 10},
    // the count that trigger the failing alert in payment monitor for player
    monitorPlayerCount: {type: Number, default: 4},
    // whether to use the sound notification on merchant count alert
    monitorMerchantUseSound: {type: Boolean, default: false},
    // whether to use the sound notification on player count alert
    monitorPlayerUseSound: {type: Boolean, default: false},
    // select the sound notification that use for merchant count alert
    monitorMerchantSoundChoice: {type: String, default: '1.wav'},
    // select the sound notification that use for player count alert
    monitorPlayerSoundChoice: {type: String, default: '1.wav'},
    // player value score relevant settings
    playerValueConfig: {
        // criteria score criteria ratio
        criteriaScoreRatio: {
            topUpTimes: {type: Number, default: 10},
            gameTypeCount: {type: Number, default: 10},
            credibilityRemark: {type: Number, default: 60},
            playerLevel: {type: Number, default: 10},
            winRatio: {type: Number, default: 10},
        },
        // top up times criteria score configuration
        topUpTimesScores: {type: JSON, default: [{name:0, score:0}, {name:1, score:1}]},
        // played game types count criteria score configuration
        gameTypeCountScores: {type: JSON, default: [{name:0, score:0}, {name:1, score:1}]},
        // win ratio criteria score configuration
        winRatioScores: {type: JSON, default: [
            {"name": -100, "score": 8},
            {"name": -20, "score": 2},
            {"name": 0, "score": -1},
            {"name": 20, "score": -2},
            {"name": 100, "score": -10}
        ]},
        // default score for credibility remark criteria
        credibilityScoreDefault: {type: Number, default: 5}
    },
    consumptionTimeConfig: [{
        duration: {type: Number},
        color: {type: String},
    }],
    jiguangAppKey: {type: String},
    jiguangMasterKey: {type: String},
    bonusSetting: {type: JSON,default:{}},
    // promocode last config setting set isActive time
    promoCodeStartTime: {type: Date},
    promoCodeEndTime: {type: Date},
    // promocode last config setting
    promoCodeIsActive: {type: Boolean, default: false},
    //the definition for effective conversation
    conversationDefinition: {
        // sec used for an conversation
        totalSec: {type: Number, min: 0, default: 40},
        // the number of sentences that the player asks
        askingSentence: {type: Number, min: 0, default: 2},
        // the number of sentences that the admin replies
        replyingSentence: {type: Number, min: 0, default: 2},
    },
    //the setting for overtime conversation
    overtimeSetting: [{
        conversationInterval: {type: Number, min: 0, default: 0},
        presetMark: {type: Number},
        color: {type: String}
    }],
});

//add platform id before save
platformSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('platformId'));

module.exports = platformSchema;
