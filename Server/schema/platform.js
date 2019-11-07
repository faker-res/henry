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
    //platform player prefix
    prefix: {type: String, default: ""},
    icon: {type: String},
    //platform partner prefix
    partnerPrefix: {type: String, default: ""},
    // partner create player prefix
    partnerCreatePlayerPrefix: {type: String, default: ""},
    //platform description
    description: String,
    //platform url
    url: String,
    //main department for platform [DEPRECATED, DO NOT USE!!]
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
    //last daily payment quota refresh time (bankcard, wechat, alipay)
    lastPaymentQuotaRefreshTime: {type: Date},
    //CUSTOMER SERVICE INFO
    // for player
    csEmailImageUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPhoneList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csQQList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csWeixinList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csSkypeList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csDisplayUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    playerInvitationUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    weixinPhotoUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    playerWebLogoUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    // for partner
    csPartnerEmailList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPartnerPhoneList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPartnerUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPartnerQQList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPartnerWeixinList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPartnerSkypeList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    partnerInvitationUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    partnerWeixinPhotoUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    partnerWebLogoUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    csPartnerDisplayUrlList: [{
        _id: false,
        isImg: {type: Number},
        content: {type: String}
    }],
    //for frontend-module-setting
    presetModuleSetting: [{
        _id: false,
        functionId: {type: Number},
        displayStatus: {type: Number},
        functionName: {type: String}
    }],
    specialModuleSetting: [{
        content: [{
            _id: false,
            functionId: {type: Number},
            displayStatus: {type: Number},
            functionName: {type: String},
        }],
        domainName: []
    }],

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
    playerWebLogoUrl: {type: String},
    partnerWebLogoUrl: {type: String},
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
    canAutoSettlement: {type: Boolean, default: true},
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
    // SMS Verification Setting For create demo player
    requireSMSVerificationForDemoPlayer: {type: Boolean, default: false},
    // SMS Verification Setting For Password Update
    requireSMSVerificationForPasswordUpdate: {type: Boolean, default: false},
    // SMS Verification Setting For Payment Update
    requireSMSVerificationForPaymentUpdate: {type: Boolean, default: false},
    // SMS Verification Expired Time (in Minute)
    smsVerificationExpireTime: {type: Number, default: 5},
    // demo player Expired Time (day)
    demoPlayerValidDays: {type: Number, default: 7},
    // allow same phone number to register
    allowSamePhoneNumberToRegister: {type: Boolean, default: true},
    // same phone number to register count
    samePhoneNumberRegisterCount: {type: Number, default: 1},
    // deposit count required to allow updating of bank card
    updateBankCardDepositCount: {type: Number, default: 0},
    // check deposit count required to allow updating of bank card
    updateBankCardDepositCountCheck: {type: Boolean, default: false},
    // total deposit amount required to allow updating of bank card
    updateBankCardDepositAmount: {type: Number, default: 0},
    // check total deposit amount required to allow updating of bank card
    updateBankCardDepositAmountCheck: {type: Boolean, default: false},
    // the limit of the same bank account number used
    sameBankAccountCount: {type: Number, default: 1},
    // check duplicate bank account name if this is editing bank card for the second time
    checkDuplicateBankAccountNameIfEditBankCardSecondTime: {type: Boolean, default: false},
    // check if require sms code when update bankcard for the first time
    requireSMSCodeForBankRegistrationAtFirstTime: {type: Boolean, default: false},
    // white listing phone number
    whiteListingPhoneNumbers: [{type: String}],
    // black listing phone number
    blackListingPhoneNumbers: [{type: String}],
    // Partner auto approve bonus proposal platform switch
    partnerEnableAutoApplyBonus: {type: Boolean, default: false},
    // Partner forbid apply bonus, apply bonus proposal need cs approval
    partnerForbidApplyBonusNeedCsApproval: {type: Boolean, default: false},
    // Partner auto approve single withdrawal limit
    partnerAutoApproveWhenSingleBonusApplyLessThan: {type: Number, default: 0},
    // Partner auto approve daily total withdrawal limit
    partnerAutoApproveWhenSingleDayTotalBonusApplyLessThan: {type: Number, default: 0},
    // Partner current withdrawal amount minus total commission from the last withdrawal(include first level partner commission) >= X (transfer to manual approval)
    partnerWithdrawalCommissionDifference: {type: Number, default: 0},
    // Auto audit settings
    autoAudit: {
        // First withdraw amount >= X (Manual audit)
        firstWithdrawExceedAmount: {type: Number, default: 0},
        // First withdraw + current credit - total topup >= X (Manual audit)
        firstWithdrawAndCurrentMinusTopupExceedAmount: {type: Number, default: 0},
        // Total Bet / Total Topup >= X, and withdraw amount >= Y (Maunual audit)
        firstWithdrawTotalBetOverTotalTopupExceedTimes: {type: Number, default: 0},
        firstWithdrawCondBExceedAmount: {type: Number, default: 0},
        // location of registration IP + phone number + bank card are different (Manual audit)
        firstWithdrawDifferentIPCheck: {type: Boolean, default: false}
    },
    // Auto approve bonus proposal platform switch
    enableAutoApplyBonus: {type: Boolean, default: false},
    // Auto approve single withdrawal limit
    autoApproveWhenSingleBonusApplyLessThan: {type: Number, default: 0},
    // Auto approve daily total withdrawal limit
    autoApproveWhenSingleDayTotalBonusApplyLessThan: {type: Number, default: 0},
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
    // Enable check on continuous apply bonus
    checkContinuousApplyBonusTimes: {type: Number},
    // Player forbid apply bonus, apply bonus proposal need cs approval
    playerForbidApplyBonusNeedCsApproval: {type: Boolean, default: false},
    //can apply multiple reward
    canMultiReward: {type: Boolean, default: false},
    // Auto check player level up
    autoCheckPlayerLevelUp: {type: Boolean, default: false},
    // manual check player level up (perform by player)
    manualPlayerLevelUp: {type: Boolean, default: false},
    // enable or disable platform manual batch level up
    platformBatchLevelUp: {type: Boolean, default: true},
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
    useProviderGroup: {type: Boolean, default: true},
    // if use point system
    usePointSystem: {type: Boolean, default: true},
    // if use phone number 2 steps verification
    usePhoneNumberTwoStepsVerification: {type: Boolean, default: false},
    // if use eBet Wallet
    useEbetWallet: {type: Boolean, default: false},
    // maximum length for player name included platform prefix
    playerNameMaxLength: {type: Number, default: 0},
    // minimum length for player name included platform prefix
    playerNameMinLength: {type: Number, default: 0},
    // maximum length for player password
    playerPasswordMaxLength: {type: Number, default: 0},
    // minimum length for player password
    playerPasswordMinLength: {type: Number, default: 0},
    // maximum length for partner name included platform prefix
    partnerNameMaxLength: {type: Number, default: 0},
    // minimum length for partner name included platform prefix
    partnerNameMinLength: {type: Number, default: 0},
    // maximum length for partner password
    partnerPasswordMaxLength: {type: Number, default: 0},
    // minimum length for partner password
    partnerPasswordMinLength: {type: Number, default: 0},
    // allow partner same phone number to register
    partnerAllowSamePhoneNumberToRegister: {type: Boolean, default: true},
    // same partner bank account to register count
    partnerSameBankAccountCount: {type: Number, default: 1},
    // allow partner same real name to register
    partnerAllowSameRealNameToRegister: {type: Boolean, default: true},
    // same partner phone number to register count
    partnerSamePhoneNumberRegisterCount: {type: Number, default: 1},
    // partner white listing phone number
    partnerWhiteListingPhoneNumbers: [{type: String}],
    // partner black listing phone number
    partnerBlackListingPhoneNumbers: [{type: String}],
    // Platform-wide SMS Verification Setting, for create partners
    partnerRequireSMSVerification: {type: Boolean, default: false},
    // SMS Verification Setting For partner Password Update
    partnerRequireSMSVerificationForPasswordUpdate: {type: Boolean, default: false},
    // SMS Verification Setting For partner Payment Update
    partnerRequireSMSVerificationForPaymentUpdate: {type: Boolean, default: false},
    // Partner SMS Verification Expired Time (in Minute)
    partnerSmsVerificationExpireTime: {type: Number, default: 5},
    // partner login require captcha verfication
    partnerRequireLogInCaptcha: {type: Boolean, default: false},
    // partner get SMS code with captcha
    partnerRequireCaptchaInSMS: {type: Boolean, default: false},
    // partner if use phone number 2 steps verification
    partnerUsePhoneNumberTwoStepsVerification: {type: Boolean, default: false},
    // set the maximum duration for the partner's unread mail to be showing up
    partnerUnreadMailMaxDuration: {type: Number, min: 0},
    // set default partner commission group upon registration
    partnerDefaultCommissionGroup: {type: Number, default: 0},
    // the count that trigger the failing alert in payment monitor for merchant
    monitorMerchantCount: {type: Number, default: 10},
    // the count that trigger the failing alert in payment monitor for player
    monitorPlayerCount: {type: Number, default: 4},
    // check topup amount that trigger the alert in payment monitor for player
    monitorTopUpAmount: {type: Number, default: 1},
    // whether to use the sound notification on merchant count alert
    monitorMerchantUseSound: {type: Boolean, default: false},
    // whether to use the sound notification on player count alert
    monitorPlayerUseSound: {type: Boolean, default: false},
    // whether to use the sound notification on player topup amount alert
    monitorTopUpAmountUseSound: {type: Boolean, default: false},
    // select the sound notification that use for merchant count alert
    monitorMerchantSoundChoice: {type: String, default: '1.wav'},
    // select the sound notification that use for player count alert
    monitorPlayerSoundChoice: {type: String, default: '1.wav'},
    // select the sound notification that use for player topup amount alert
    monitorTopUpAmountSoundChoice: {type: String, default: '1.wav'},
    // merchant count 充值类型
    monitorMerchantCountTopUpType: [],
    // player count 充值类型
    monitorPlayerCountTopUpType: [],
    // TopUp Amount 充值类型
    monitorTopUpAmountTopUpType: [],
    // merchant count 提交后（X）分钟仍未成功
    monitorMerchantCountTime: {type: Number},
    // player count 提交后（X）分钟仍未成功
    monitorPlayerCountTime: {type: Number},
    // TopUp Amount 提交后（X）分钟仍未成功
    monitorTopUpAmountTime: {type: Number},
    // the count that trigger the error msg when create top up proposal
    monitorTopUpCount: {type: Number, min: 0},
    // the count that trigger the error msg when create common top up proposal
    monitorCommonTopUpCount: {type: Number, min: 0},
    // the switch that trigger the error msg when create top up proposal
    monitorTopUpNotify: {type: Boolean, default: false},
    // the switch that trigger the error msg when create common top up proposal
    monitorCommonTopUpCountNotify: {type: Boolean, default: false},
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
        topUpTimesScores: {type: JSON, default: [{name: 0, score: 0}, {name: 1, score: 1}]},
        // played game types count criteria score configuration
        gameTypeCountScores: {type: JSON, default: [{name: 0, score: 0}, {name: 1, score: 1}]},
        // win ratio criteria score configuration
        winRatioScores: {
            type: JSON, default: [
                {"name": -100, "score": 8},
                {"name": -20, "score": 2},
                {"name": 0, "score": -1},
                {"name": 20, "score": -2},
                {"name": 100, "score": -10}
            ]
        },
        // default score for credibility remark criteria
        credibilityScoreDefault: {type: Number, default: 5}
    },
    consumptionTimeConfig: [{
        duration: {type: Number},
        color: {type: String},
    }],
    jiguangAppKey: {type: String},
    jiguangMasterKey: {type: String},
    bonusSetting: {type: JSON, default: {}},
    withdrawalFeeNoDecimal: {type: Boolean, default: false},
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
    // set this live800companyId to binding with live800 system
    live800CompanyId: [{type: String}],
    // get the CS Department for display livechat related conversation
    csDepartment: [{type: Schema.ObjectId, ref: 'department', default: null}],
    // get the QI Department for display livechat related conversation
    qiDepartment: [{type: Schema.ObjectId, ref: 'department', default: null}],
    // Demo Player Prefix Code
    demoPlayerPrefix: {type: String},
    // Demo Player Default Credit
    demoPlayerDefaultCredit: {type: Number, min: 0, default: 0},
    // manual audit for player first time withdrawal
    manualAuditFirstWithdrawal: {type: Boolean, default: true},
    // manual audit once after player change bank detail
    manualAuditAfterBankChanged: {type: Boolean, default: true},
    // manual audit if player's applyBonus permission banned
    manualAuditBanWithdrawal: {type: Boolean, default: true},
    // manual reward below xx amount, skip audit process
    manualRewardSkipAuditAmount: {type: Number, min: 0, default: 0},
    // checks that if the balance is lower than the winning or losing limit, it will be unlocked immediately (after re-locking)
    autoUnlockWhenInitAmtLessThanLostThreshold: {type: Boolean, default: false},
    // to check consecutive transfer-in/ transfer-out
    consecutiveTransferInOut: {type: Boolean, default: false},
    // set the maximum duration for the unread mail to be showing up
    unreadMailMaxDuration: {type: Number, min: 0},
    // call out mission max ring times
    maxRingTime: {type: Number},
    // call out mission redial times
    redialTimes: {type: Number},
    // call out mission minimum redial interval,
    minRedialInterval: {type: Number},
    // call out mission number of call in parallel happen per idle agent
    idleAgentMultiple: {type: Number},
    //client type
    clientData: {type: String},
    //call Request URL config
    callRequestUrlConfig: {type: String},
    // call Request limit per hour
    callRequestLimitPerHour: {type: Number},
    callRequestLineConfig: [{
        lineId: {type: Number},
        lineName: {type: String},
        minLevel: {type: String},
        status: {type: Number, default: 1}
    }],
    //playerLevel display list- displayId, displayTitle, displayTextContent, and btnOrImageList
    display: [{
        _id: false,
        displayId: {type: String},
        displayTitle: {type: String},
        displayTextContent: {type: String},
        btnOrImageList: [],
        playerLevel: {type: Schema.ObjectId, ref: 'playerLevel', index: true}
    }],
    // CDN/FTP route setting
    playerRouteSetting: {type: String},
    partnerRouteSetting: {type: String},
    // financial settlement setting
    financialSettlement: {
        //financial settlement switch
        financialSettlementToggle: {type: Boolean, default: false},
        // financial settlement minimum point to show notification
        minFinancialPointsNotification: {type: Number, default: 0},
        // financial settlement minimum point notification switch
        financialPointsNotification: {type: Boolean, default: false},
        // financial settlement minimum point to disable withdrawal
        minFinancialPointsDisableWithdrawal: {type: Number, default: 0},
        // financial settlement minimum point to disable withdrawal switch
        financialPointsDisableWithdrawal: {type: Boolean, default: false}
    },
    financialPoints: {type: Number, default: 0},
    bankCardGroupIsPMS: {type: Boolean, default: false},
    merchantGroupIsPMS: {type: Boolean, default: false},
    aliPayGroupIsPMS: {type: Boolean, default: false},
    wechatPayGroupIsPMS: {type: Boolean, default: false},
    // player theme setting
    playerThemeSetting: {
        themeStyleId: {type: Schema.ObjectId, ref: 'themeSetting', index: true},
        themeId: {type: String},
        themeIdObjId: {type: Schema.ObjectId, index: true}
    },
    // partner theme setting
    partnerThemeSetting: {
        themeStyleId: {type: Schema.ObjectId, ref: 'themeSetting', index: true},
        themeId: {type: String},
        themeIdObjId: {type: Schema.ObjectId, index: true}
    },
    frontendConfigurationDomainName: {type: String},
    // call out mission max ring times
    teleMarketingMaxRingTime: {type: Number},
    // call out mission redial times
    teleMarketingRedialTimes: {type: Number},
    // call out mission minimum redial interval,
    teleMarketingMinRedialInterval: {type: Number},
    // call out mission number of call in parallel happen per idle agent
    teleMarketingIdleAgentMultiple: {type: Number},
    // Definition of Answered Phone Call
    definitionOfAnsweredPhone: {type: JSON},
    // default feedback result
    defaultFeedback: {
        defaultTsFeedbackResult: {type: String},
        defaultTsFeedbackTopic: {type: String},
        defaultPlayerFeedbackResult: {type: String},
        defaultPlayerFeedbackTopic: {type: String},
        defaultFeedbackResult: {type: String},
        defaultFeedbackTopic: {type: String}
    },

    // Decompose after N days
    decomposeAfterNDays: {type: Number},
    // Phone White List Auto Export/Maximum Number of Transactions at 4AM Everyday
    phoneWhiteListExportMaxNumber: {type: Number},
    // Switch Payment System - topup , 4 - PMS2
    topUpSystemType: {type: Number, default: 4},
    // Switch Payment System - bonus, 4 - PMS2
    bonusSystemType: {type: Number, default: 4},
    // to identify current using FPMS payment method
    isFPMSPaymentSystem: {type: Boolean, default: false},
    // Set provider to maintenance status if consecutively timed out after N times
    disableProviderAfterConsecutiveTimeoutCount: {type: Number},
    // provider consecutively timed out search time frame (last N minutes)
    providerConsecutiveTimeoutSearchTimeFrame: {type: Number},
    // Using same player's IP cannot over this limit during registration.
    playerIPRegisterLimit: {type: Number},
    // Using same player's IP Region cannot over this limit during registration.
    playerIPRegionLimit: {type: Number},
    // the time-period to checking If the playerIP/ IP Region is fulfil.
    ipCheckPeriod: {type: Number},
    // check is phone number bound to a player before apply bonus
    isPhoneNumberBoundToPlayerBeforeApplyBonus: {type: Boolean, default: false},
    // disable auto player level up reward switch
    disableAutoPlayerLevelUpReward: {type: Boolean, default: false},
    // service charge rate setting
    pmsServiceCharge: {type: Number},
    // service charge rate setting
    fpmsServiceCharge: {type: Number},
    // if is ebet4.0 user, will generate a ebet4.0 user from cpms
    isEbet4: {type: Boolean, default: false},
    // native app version number
    appDataVer: {type: String},
    // is use voice code verification
    useVoiceCode: {type: Boolean, default: false},
    // select which voice code provider to use - constVoiceCodeProvider
    voiceCodeProvider: {type: Number, default: 1},
    // display front end reward points ranking data
    displayFrontEndRewardPointsRankingData: {type: Boolean, default: true},
    // Use transfer from last provider to apply reward
    useTransferFromLastProvider: {type: Boolean, default: false}
});

//add platform id before save
//platformSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('platformId'));

module.exports = platformSchema;
