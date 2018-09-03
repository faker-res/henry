var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var constPlayerStatus = require('../const/constPlayerStatus');
var constSystemParam = require('../const/constSystemParam');
var constPlayerTrustLevel = require('../const/constPlayerTrustLevel');
var counterManager = require("../modules/counterManager.js");
var ensureFieldsAreUnique = require("../db_modules/middleware/ensureFieldsAreUnique.js");
var rsaCrypto = require("../modules/rsaCrypto");
var dbUtil = require("../modules/dbutility");
var Schema = mongoose.Schema;

var playerSchema = new Schema({
    //player id
    playerId: {type: String, index: true},
    //player display name
    name: {type: String, required: true, index: true},
    //player nick name
    nickName: {type: String},
    //player email
    email: {type: String, default: ""},
    //gender - true=male, false=female
    gender:{type: Boolean, default: true},
    //DOB
    DOB:{type: Date, default: null},
    //sms Setting
    smsSetting: {
        // remain old message type just in case, could remove in future
        manualTopup: {type: Boolean, default: true},
        applyBonus: {type: Boolean, default: true},
        cancelBonus: {type: Boolean, default: true},
        applyReward: {type: Boolean, default: true},
        consumptionReturn: {type: Boolean, default: true},
        updatePaymentInfo: {type: Boolean, default: true},

        // new message type
        PlayerConsumptionReturnSuccess: {type: Boolean, default: true},
        ManualTopupSuccess: {type: Boolean, default: true},
        OnlineTopupSuccess: {type: Boolean, default: true},
        AlipayTopupSuccess: {type: Boolean, default: true},
        WechatTopupSuccess: {type: Boolean, default: true},
        WithdrawSuccess: {type: Boolean, default: true},
        WithdrawCancel: {type: Boolean, default: true},
        PlayerLimitedOfferRewardSuccess: {type: Boolean, default: true},
        UpdateBankInfoSuccess: {type: Boolean, default: true},
        UpdatePhoneInfoSuccess: {type: Boolean, default: true},
        updatePassword: {type: Boolean, default: true}, // use back this old message type
        PlayerTopUpReturnGroupSuccess: {type: Boolean, default: true},
        PlayerLoseReturnRewardGroupSuccess: {type: Boolean, default: true},
        PlayerConsecutiveRewardGroupSuccess: {type: Boolean, default: true},
        PlayerConsumptionRewardGroupSuccess: {type: Boolean, default: true},
        PlayerFreeTrialRewardGroupSuccess: {type: Boolean, default: true},
        PlayerRegisterIntentionSuccess: {type: Boolean, default: true},
        PlayerPromoCodeRewardSuccess: {type: Boolean, default: true},
        PlayerLevelUpMigrationSuccess: {type: Boolean, default: true},
        PlayerLevelDownMigrationSuccess: {type: Boolean, default: true},
        PlayerLevelUpSuccess: {type: Boolean, default: true},
        PromoCodeSend: {type: Boolean, default: true},
    },
    //store player's icon
    icon: {type: String, default: ""},
    //contact number
    phoneNumber: {type: String, minlength: 6, index: true},
    //is test player, convertion rate = total(isTestPlayer && isRealPlayer)/total(isTestPlayer)
    isTestPlayer: {type: Boolean, default: false},
    //is real player
    isRealPlayer: {type: Boolean, default: true, index: true},
    //last feedback time
    lastFeedbackTime: {type: Date, default: "", index: true},
    //feedback times
    feedbackTimes: {type: Number, min: 0, default: 0},
    //no more feedback
    noMoreFeedback: {type: Boolean},
    //player password
    password: {type: String, required: true},
    //whether player want to receive SMS
    receiveSMS: {type: Boolean, default: true},
    //player real name
    realName: {type: String, default: "", index: true},
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    //Registration data
    registrationTime: {type: Date, default: Date.now, index: true},
    //last access time
    lastAccessTime: {type: Date, default: Date.now, index: true}, //logout and login
    //if player has login
    isLogin: {type: Boolean, default: false, index: true},
    // Last Login Ip
    lastLoginIp: {type: String, default: "", index: true}, //login
    //login ip records
    loginIps: [],
    // player trust level (trust or untrust, cheated player)
    trustLevel: {type: String, default: constPlayerTrustLevel.GOOD},
    // player trust level (trust or untrust, cheated player)
    badRecords: [{type: Schema.ObjectId, ref: 'playerBadRecord'}],
    // player status normal or forbid game or forbid
    status: {type: Number, default: constPlayerStatus.NORMAL},
    //last played game provider id
    lastPlayedProvider: {type: Schema.ObjectId, ref: 'gameProvider'},
    //forbid game providers
    forbidProviders: [{type: Schema.ObjectId, ref: 'gameProvider'}],
    //forbid rewardPoint Events
    forbidRewardPointsEvent: [{type: Schema.ObjectId, ref: 'rewardPointsEvent'}],
    //player level (vip, regular etc)
    playerLevel: {type: Schema.ObjectId, ref: 'playerLevel', index: true},
    //experience???
    exp: {type: Number, min: 0, default: 0},
    //games
    games: [{type: Schema.ObjectId, ref: 'game'}],
    //partnerId
    partner: {type: Schema.ObjectId, ref: 'partner', index: true},
    //remark
    remark: {type: String},
    //photo url
    photoUrl: {type: String},
    //registration domain
    domain: {type: String, index: true},
    //external registration domain
    sourceUrl: {type: String},
    //User agent containing 3 sub fields: browser, os, device
    userAgent: [{
        _id: false,
        browser: {type: String},
        os: {type: String},
        device: {type: String},
    }],
    //User permission
    permission: {
        _id: false,
        applyBonus: {type: Boolean, default: true},
        // advanceConsumptionReward: {type: Boolean, default: true},
        transactionReward: {type: Boolean, default: true},
        topupOnline: {type: Boolean, default: true},
        topupManual: {type: Boolean, default: true},
        topUpCard: {type: Boolean, default: true},
        phoneCallFeedback: {type: Boolean, default: true, index: true},
        SMSFeedBack: {type: Boolean, default: true},
        alipayTransaction: {type: Boolean, default: true},
        quickpayTransaction: {type: Boolean, default: true},
        banReward: {type: Boolean, default: false},
        rewardPointsTask: {type: Boolean, default: true},
        disableWechatPay: {type: Boolean, default: false},
        forbidPlayerConsumptionReturn: {type: Boolean, default: false},
        forbidPlayerConsumptionIncentive: {type: Boolean, default: false},
        PlayerTopUpReturn: {type: Boolean, default: true},
        PlayerDoubleTopUpReturn: {type: Boolean, default: true},
        forbidPlayerFromLogin: {type: Boolean, default: false},
        forbidPlayerFromEnteringGame: {type: Boolean, default: false},
        playerConsecutiveConsumptionReward: {type: Boolean, default: true},
        PlayerPacketRainReward: {type: Boolean, default: true},
        PlayerLimitedOfferReward: {type: Boolean, default: true},
        levelChange: {type: Boolean, default: true}
    },

    //country
    country: String,
    //province
    province: String,
    //city
    city: String,
    //longitude
    longitude: String,
    //latitude
    latitude: String,

    //PhoneNumber-based Geo location Info
    //province
    phoneProvince: String,
    //city
    phoneCity: String,
    //type
    phoneType: String,

    /*Player Credit*/
    //current credit balance
    creditBalance: {type: Number, min: 0, default: 0},
    //valid credit
    validCredit: {type: Number, min: 0, default: 0, index: true},
    //locked credit
    lockedCredit: {type: Number, min: 0, default: 0},
    //daily top up sum for level up check
    dailyTopUpSum: {type: Number, min: 0, default: 0},
    //daily top up incentive amount
    dailyTopUpIncentiveAmount: {type: Number, min: 0, default: 0},
    //weekly top up sum for level up check
    weeklyTopUpSum: {type: Number, min: 0, default: 0},
    //past one month topup sum recording
    pastMonthTopUpSum: {type: Number, min: 0, default: 0},
    //total top up
    topUpSum: {type: Number, min: 0, default: 0},
    //top up times
    topUpTimes: {type: Number, min: 0, default: 0, index: true},
    // withdrawal times
    withdrawTimes: {type: Number, min: 0, default: 0, index: true},
    //daily withdraw sum
    dailyWithdrawSum: {type: Number, min: 0, default: 0},
    //weekly withdraw
    weeklyWithdrawSum: {type: Number, min: 0, default: 0},
    //past one month Withdraw recording.
    pastMonthWithdrawSum: {type: Number, min: 0, default: 0},
    //total Withdraw
    withdrawSum: {type: Number, min: 0, default: 0},
    //daily month bonus amount sum
    dailyBonusAmountSum: {type: Number, default: 0},
    //weekly month bonus amount sum
    weeklyBonusAmountSum: {type: Number, default: 0},
    //past one month bonus amount recording.
    pastMonthBonusAmountSum: {type: Number, default: 0},
    // total profit / losses of player
    bonusAmountSum: {type: Number, default: 0, index: true},
    //daily consumption sum for level up check
    dailyConsumptionSum: {type: Number, min: 0, default: 0},
    //weekly consumption sum for level up check
    weeklyConsumptionSum: {type: Number, min: 0, default: 0},
    //past one month consumption recording.
    pastMonthConsumptionSum: {type: Number, min: 0, default: 0},
    //total consumption
    consumptionSum: {type: Number, min: 0, default: 0},
    //consumption sum for each game type
    consumptionDetail: {type: JSON, default: {}},
    //top up times
    consumptionTimes: {type: Number, min: 0, default: 0},
    // Credit Wallet (For Provider Group Lock)
    creditWallet: [{
        _id: false,
        providerGroupId: {type: Schema.ObjectId, ref: 'gameProviderGroup'},
        walletCredit: {type: Number, min: 0, default: 0},
        walletCurrentConsumption: {type: Number, min: 0, default: 0},
        walletTargetConsumption: {type: Number, min: 0, default: 0}
    }],

    /*Player payment*/
    //bank name， bankTypeId
    bankName: {type: String},
    //bank account
    bankAccount: {type: String, index: true},
    //bank account name
    bankAccountName: {type: String},
    //bank account type
    bankAccountType: {type: String},
    //bank account province
    bankAccountProvince: {type: String},
    //bank account city
    bankAccountCity: {type: String},
    //bank account district
    bankAccountDistrict: {type: String},
    //full bank address
    bankAddress: {type: String},
    //bank branch
    bankBranch: {type: String},
    //internet banking
    internetBanking: {type: String},
    //bank card group
    bankCardGroup: {type: Schema.ObjectId, ref: 'platformBankCardGroup', index: true},
    //merchant group
    merchantGroup: {type: Schema.ObjectId, ref: 'platformMerchantGroup', index: true},
    //ali pay group
    alipayGroup: {type: Schema.ObjectId, ref: 'platformAlipayGroup', index: true},
    //wechat pay group
    wechatPayGroup: {type: Schema.ObjectId, ref: 'platformWechatPayGroup', index: true},
    //quickPay group
    quickPayGroup: {type: Schema.ObjectId, ref: 'platformQuickPayGroup'},
    //forbid top up types
    forbidTopUpType: [{type: String}],
    // forbid reward events by player
    forbidRewardEvents: [{type: String}],
    //reward info
    //if this player has been rewarded for first time top up event
    bFirstTopUpReward: {type: Boolean, default: false},

    //favorite games
    favoriteGames: [{type: Schema.ObjectId, ref: 'game'}],

    //social media info
    qq: {type: String},
    wechat: {type: String},

    //similar players
    similarPlayers: [{
        _id: false,
        playerObjId: {type: Schema.ObjectId},
        field: {type: String},
        content: {type: String},
    }],
    //referral player
    referral: {type: Schema.ObjectId, index: true},
    //has been used for referral reward
    isReferralReward: {type: Boolean, default: false},
    //if this player is from online registration
    isOnline: {type: Boolean},
    //if player has applied consumption return
    isConsumptionReturn: {type: Boolean},
    //is new system user
    isNewSystem: {type: Boolean},
    //adding easter egg
    applyingEasterEgg: {type: Boolean, default: false},
    // credibility remarks
    credibilityRemarks: [{type: Schema.ObjectId, ref: 'playerCredibilityRemark'}],
    // the game providers' name that player had played their games
    gameProviderPlayed: [{type: Schema.ObjectId, ref: 'gameProvider'}],
    // player value score
    valueScore: {type: Number, default: 0},
    // interface that used to register this account
    registrationInterface: {type: Number, default: 0},
    // the number of times where player login
    loginTimes: {type: Number, default: 0},
    //for reporo conversion
    reporoId: {type: String},
    // UI Help Info View
    viewInfo: {
        limitedOfferInfo: {type: Number, default: 1},
        // add in a state to control the showing of the limitedOfferInfo
        showInfoState: {type: Boolean, default: 1}
    },
    // admin name who opened this account from backstage
    accAdmin: {type: String},
    csOfficer: {type: Schema.ObjectId, ref: 'admin'},
    promoteWay: {type: String},
    // reward point object
    rewardPointsObjId: {type: Schema.ObjectId, ref: 'rewardPoints'},
    // is tracked for deposit tracking report
    isDepositTracked: {type: Boolean},
    // deposit tracking group object
    depositTrackingGroup: {type: Schema.ObjectId, ref: 'depositTrackingGroup'},
    // xima withdrawal check bypass
    ximaWithdraw: {type: Number, default: 0},
    // dian xiao mission related player
    dxMission: {type: Schema.ObjectId, ref: 'dxMission', index: true},
    //client data
    clientData: {type: String},
    //device id
    deviceId: {type: String}
});

//record is unique by name and platform
playerSchema.index({name: 1, platform: 1});
playerSchema.index({platform: 1, partner: 1});
playerSchema.index({platform: 1, isRealPlayer: 1});
playerSchema.index({loginIps: 1});

playerSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('playerId'));

playerSchema.pre('save', ensureFieldsAreUnique(['playerId']));

/*
 The User model should fully encapsulate the password encryption and verification logic
 The User model should ensure that the password is always encrypted before saving
 The User model should be resistant to program logic errors, like double-encrypting the password on user updates
 bcrypt interactions should be performed asynchronously to avoid blocking the event loop (bcrypt also exposes a synchronous API)
 */
playerSchema.pre('save', function (next) {
    var player = this;

    if (!player.isModified('password')) {
        return next();
    }
    //check if already encrypted in md5
    if (!dbUtil.isMd5(player.password)) {
        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(player.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                // override the cleartext password with the hashed one
                player.password = hash;
                next();
            });
        });
    }
    else {
        return next();
    }

});

playerSchema.pre('save', function (next) {
    var player = this;

    if (!player.isModified('phoneNumber')) {
        return next();
    }
    // override the cleartext password with the hashed one
    try {
        player.phoneNumber = rsaCrypto.encrypt(player.phoneNumber);
    }
    catch (error) {
        console.log(error);
    }
    next();
});

playerSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

var playerPostFindUpdate = function (result, bOne) {
    if (result && result.phoneNumber) {
        if (result.phoneNumber.length > 20) {
            let phoneNumber = result.phoneNumber;
            try {
                result.phoneNumber = rsaCrypto.decrypt(result.phoneNumber);
            }
            catch (err) {
                console.log(err, phoneNumber);
                result.phoneNumber = phoneNumber;
            }
        }
        if (!bOne) {
            // var startIndex = Math.max(Math.floor((result.phoneNumber.length - 4) / 2), 0);
            // result.phoneNumber = result.phoneNumber.substr(0, startIndex) + "****" + result.phoneNumber.substr(startIndex + 4);
            // result.phoneNumber = result.phoneNumber.substr(0, 3) + "****" + result.phoneNumber.substr(-4);
            result.fullPhoneNumber = result.phoneNumber;
            result.phoneNumber = dbUtil.encodePhoneNum(result.phoneNumber);
        }
    }
    //hide middle 4 digits for email
    if (result && result.email) {
        if (result.email.indexOf("@qq.com") !== -1) {
            let qqNumber = result.email.substr(0, result.email.indexOf("@"));
            let qqIndex = Math.max(Math.floor((qqNumber.length - 4) / 2), 0);
            let qqNumberEncoded = qqNumber.substr(0, qqIndex) + "****" + qqNumber.substr(qqIndex + 4);
            result.email = qqNumberEncoded + "@qq.com";
        }
        else {
            var startIndex = Math.max(Math.floor((result.email.length - 4) / 2), 0);
            result.email = result.email.substr(0, startIndex) + "****" + result.email.substr(startIndex + 4);
        }
    }
    //hide banking information
    if (!bOne && result && result.bankAccount) {
        // var startIndex = Math.max(Math.floor((result.bankAccount.length - 4) / 2), 0);
        // result.bankAccount = result.bankAccount.substr(0, startIndex) + "****" + result.bankAccount.substr(startIndex + 4);
        result.bankAccount = dbUtil.encodeBankAcc(result.bankAccount);
    }
    //hide last 4 digits for qq
    if (result && result.qq) {
        let qqIndex = Math.max(Math.floor((result.qq.length - 4) / 2), 0);
        result.qq = result.qq.substr(0, qqIndex) + "****" + result.qq.substr(qqIndex + 4);
    }
    //hide last 4 digits for wechat
    if (result && result.wechat) {
        let wechatIndex = Math.max(Math.floor((result.wechat.length - 4) / 2), 0);
        result.wechat = result.wechat.substr(0, wechatIndex) + "****" + result.wechat.substr(wechatIndex + 4);

    }

    if (result && result.smsSetting && !result.smsSetting.hasOwnProperty("PromoCodeSend")) {
        result.smsSetting.PromoCodeSend = true;
    }
};

// // example to get player phone number
playerSchema.post('find', function (result) {
    if (result && result.length > 0) {
        for (var i = 0; i < result.length; i++) {
            playerPostFindUpdate(result[i]);
        }
        return result;
    }
});

playerSchema.post('findOne', function (result) {
    playerPostFindUpdate(result, true);
});

module.exports = playerSchema;
