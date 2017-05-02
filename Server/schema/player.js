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
    name: {type: String, required: true},
    //player nick name
    nickName: {type: String},
    //player email
    email: {type: String, default: ""},
    //sms Setting
    smsSetting: {
        manualTopup: {type: Boolean, default: false},
        applyBonus: {type: Boolean, default: false},
        cancelBonus: {type: Boolean, default: false},
        applyReward: {type: Boolean, default: false},
        consumptionReturn: {type: Boolean, default: false},
        updatePaymentInfo: {type: Boolean, default: false},
        updatePassword: {type: Boolean, default: false}
    },
    //store player's icon
    icon: {type: String, default: ""},
    //contact number
    phoneNumber: {type: String, minlength: 6, index: true},
    //is test player, convertion rate = total(isTestPlayer && isRealPlayer)/total(isTestPlayer)
    isTestPlayer: {type: Boolean, default: false},
    //is real player
    isRealPlayer: {type: Boolean, default: true},
    //last feedback time
    lastFeedbackTime: {type: Date, default: ""},
    //feedback times
    feedbackTimes: {type: Number, min: 0, default: 0},
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
    isLogin: {type: Boolean, default: false},
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
    domain: {type: String},
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
        advanceConsumptionReward: {type: Boolean, default: true},
        transactionReward: {type: Boolean, default: true},
        topupOnline: {type: Boolean, default: true},
        topupManual: {type: Boolean, default: true},
        alipayTransaction: {type: Boolean, default: true},
        banReward: {type: Boolean, default: false},
        disableWechatPay: {type: Boolean, default: false}
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

    /*Playe Credit*/
    //current credit balance
    creditBalance: {type: Number, min: 0, default: 0},
    //valid credit
    validCredit: {type: Number, min: 0, default: 0},
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
    topUpTimes: {type: Number, min: 0, default: 0},
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

    /*Player payment*/
    //bank name， bankTypeId
    bankName: {type: String},
    //bank account
    bankAccount: {type: String},
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
    bankCardGroup: {type: Schema.ObjectId, ref: 'platformBankCardGroup'},
    //merchant group
    merchantGroup: {type: Schema.ObjectId, ref: 'platformMerchantGroup'},
    //ali pay group
    alipayGroup: {type: Schema.ObjectId, ref: 'platformAlipayGroup'},
    //wechat pay group
    wechatPayGroup: {type: Schema.ObjectId, ref: 'platformWechatPayGroup'},
    //forbid top up types
    forbidTopUpType: [{type: String}],
    //reward info
    //if this player has been rewarded for first time top up event
    bFirstTopUpReward: {type: Boolean, default: false},

    //favorite games
    favoriteGames: [{type: Schema.ObjectId, ref: 'game'}],

    //social media info
    qq: {type: String},

    //similar players
    similarPlayers: [{
        _id: false,
        playerObjId: {type: Schema.ObjectId},
        field: {type: String},
        content: {type: String},
    }],
    //referral player
    referral: {type: Schema.ObjectId},
    //has been used for referral reward
    isReferralReward: {type: Boolean, default: false},
    //if this player is from online registration
    isOnline: {type: Boolean}
});

//record is unique by name and platform
playerSchema.index({name: 1, platform: 1});

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
            try {
                result.phoneNumber = rsaCrypto.decrypt(result.phoneNumber);
            }
            catch (err) {
                console.log(err);
            }
        }
        if (!bOne) {
            // var startIndex = Math.max(Math.floor((result.phoneNumber.length - 4) / 2), 0);
            // result.phoneNumber = result.phoneNumber.substr(0, startIndex) + "****" + result.phoneNumber.substr(startIndex + 4);
            result.phoneNumber = result.phoneNumber.substr(0, 3) + "****" + result.phoneNumber.substr(-4);
        }
    }
    //hide middle 4 digits for email
    if (result && result.email) {
        var startIndex = Math.max(Math.floor((result.email.length - 4) / 2), 0);
        result.email = result.email.substr(0, startIndex) + "****" + result.email.substr(startIndex + 4);
    }
    //hide banking information
    if (!bOne && result && result.bankAccount) {
        var startIndex = Math.max(Math.floor((result.bankAccount.length - 4) / 2), 0);
        result.bankAccount = result.bankAccount.substr(0, startIndex) + "****" + result.bankAccount.substr(startIndex + 4);
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