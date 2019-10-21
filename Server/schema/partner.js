var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var constSystemParam = require('../const/constSystemParam');
var constPartnerStatus = require('../const/constPartnerStatus');
var counterManager = require("../modules/counterManager.js");
var ensureFieldsAreUnique = require("../db_modules/middleware/ensureFieldsAreUnique.js");
var dbUtil = require("../modules/dbutility");
var Schema = mongoose.Schema;

let rsaCrypto = require("../modules/rsaCrypto");

const A_LONG_TIME_AGO = 0;   // 1970

var partnerSchema = new Schema({
    //partnerId
    partnerId: {type: String, index: true},
    //partner name
    partnerName: {type: String, required: true, index: true},
    //display name
    realName: {type: String, index: true},
    //partner password
    password: String,
    //gender - true=male, false=female
    gender:{type: Boolean, default: true},
    //DOB
    DOB:{type: Date, default: null},
    //email
    email: {type: String, default: ""},
    //mobile Number
    phoneNumber: {type: String, default: ""},
    //registration time
    registrationTime: {type: Date, default: Date.now},
    //last login time
    lastAccessTime: {type: Date, default: Date.now},
    //if partner has login
    isLogin: {type: Boolean, default: false},
    //remarks
    remarks: {type: String},
    //partner level, start from 0
    level: {type: Schema.ObjectId, ref: 'partnerLevel', index: true}, // deprecated
    //last login ip
    lastLoginIp: String,
    //platform id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    //credits
    credits: {type:Number, default: 0},
    //total no of referrals
    totalReferrals: {type:Number, min: 0, default: 0},
    //total no of player as downline
    totalPlayerDownline: {type:Number, min: 0, default: 0},
    //sum of settled commission
    totalSettledCommission: {type:Number, min: 0, default: 0},
    //sum of withdraw
    totalWithdrawalAmt: {type:Number, min: 0, default: 0},
    //no of valid players introduced by the partner till the date
    validPlayers: {type:Number, min: 0, default: 0},
    //no of active players introduced by the partner till the date
    activePlayers: {type:Number, min: 0, default: 0},
    //no of daily active players
    dailyActivePlayer: {type:Number, min: 0, default: 0},
    //no of weekly active players
    weeklyActivePlayer: {type:Number, min: 0, default: 0},
    //no of monthly active players
    monthlyActivePlayer: {type:Number, min: 0, default: 0},
    //total children deposit
    totalChildrenDeposit: {type:Number, default: 0},
    //total children balance
    totalChildrenBalance: {type:Number, default: 0},
    //validConsumptionSum
    validConsumptionSum: {type:Number, min: 0, default: 0},
    //valid reward
    validReward: {type:Number, min: 0, default: 0},
    //no weeks failed to meet the target
    failMeetingTargetWeeks : {type:Number, min: 0, default: 0},

    //partner payment info
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

    // depth in the tree (number of parent partners above me), so 0 means I have no parent
    depthInTree: {type: Number, default: 0},

    //child partners
    children: [{type: Schema.ObjectId, ref: 'partner'}],
    //parent partner
    parent: {type: Schema.ObjectId, ref: 'partner', default: null, index: true},

    // Has this partner had level promotion/demotion processed this week?
    datePartnerLevelMigrationWasLastProcessed: {type: Date, default: A_LONG_TIME_AGO},
    // Has this partner been given a consumption return reward this week?
    dateConsumptionReturnRewardWasLastAwarded: {type: Date, default: A_LONG_TIME_AGO},

    // Has this partner been given a referral reward?  (This is really a yes/no flag but the date acts as a simple log.)
    dateReceivedReferralReward: {type: Date, required: false},
    // Same for incentive reward
    dateReceivedIncentiveReward: {type: Date, required: false},
    //User agent containing 3 sub fields: browser, os, device
    userAgent: [{
        _id: false,
        browser: {type: String},
        os: {type: String},
        device: {type: String},
    }],
    //country
    country: String,
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
    //domain
    domain: String,
    //partner domain name
    ownDomain: [{type: String}],
    //if this partner has player account
    player: {type: Schema.ObjectId, ref: 'playerInfo'},
    //commission history
    commissionHistory: [],
    //negative profit amount
    negativeProfitAmount: {type: Number, default: 0},
    //negative profit amount start since which date
    negativeProfitStartTime: {type: Date},
    //last commission settlement time
    lastCommissionSettleTime: {type: Date, default: A_LONG_TIME_AGO},
    //last children commission settlement time
    lastChildrenCommissionSettleTime: {type: Date, default: A_LONG_TIME_AGO},
    // Commission Amount From Children
    commissionAmountFromChildren: {type: Number, default: 0},
    // Partner permission
    permission: {
        _id: false,
        applyBonus: {type: Boolean, default: true},
        forbidPartnerFromLogin: {type: Boolean, default: false},
        phoneCallFeedback: {type: Boolean, default: true},
        SMSFeedBack: {type: Boolean, default: true},
        disableCommSettlement: {type: Boolean, default: false}
    },
    // partner status normal or forbid
    status: {type: Number, default: constPartnerStatus.NORMAL, index: true},
    //is new system user
    isNewSystem: {type: Boolean},
    // interface that used to register this account
    registrationInterface: {type: Number, default: 0},
    // the number of times where partner login
    loginTimes: {type: Number, default: 0},
    // url where the registree come from
    sourceUrl: {type: String},
    //social media info
    qq: {type: String},
    wechat: {type: String},
    // short url for promote
    shortUrl: {type: JSON},
    // commission type
    commissionType: {type: Number, default: 0},
    // constPartnerLoginDevice
    loginDevice: {type: Number, index: true},
    // constPartnerLoginDevice
    registrationDevice: {type: Number, index: true, default: 0}
});

partnerSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('partnerId'));

partnerSchema.pre('save', ensureFieldsAreUnique(['partnerId']));

//encrypt password before save
partnerSchema.pre('save', function (next) {
    var partner = this;
    if (!partner.isModified('password')) {
        return next();
    }

    //check if already encrypted in md5
    if( !dbUtil.isMd5(partner.password) ){
        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(partner.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                // override the cleartext password with the hashed one
                partner.password = hash;
                next();
            });
        });
    }
    else{
        return next();
    }
});

partnerSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

var partnerPostFindUpdate = function (result, bOne) {
    //hide middle 4 digits for phone number
    if (result) {
        if (result.phoneNumber && result.phoneNumber.length > 0) {
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
                result.phoneNumber = dbUtil.encodePhoneNum(result.phoneNumber);
            }
            // let startIndex = Math.max(Math.floor((result[i].phoneNumber.length - 4)/2), 0);
            // result[i].phoneNumber = result[i].phoneNumber.substr(0, startIndex) + "****" + result[i].phoneNumber.substr(startIndex+4);
        }

        // hide part of the e-mail
        if (result.email && result.email.length > 0) {
            let partnerEmail = result.email;
            let emailParts = partnerEmail.split("@");
            let emailLocal = emailParts[0];
            let emailLocalChar = emailLocal.split('');
            for (let i in emailLocalChar) {
                if (i < 3) {
                    continue;
                }
                emailLocalChar[i] = '*';
            }
            let hiddenEmailLocal = emailLocalChar.join('');
            emailParts[0] = hiddenEmailLocal;
            result.email = emailParts.join('@');
        }

        //temp disable bankaccount encode for partner
        if (!bOne && result && result.bankAccount) {
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

        //add default permission
        if(result._doc){
            if( !result._doc.permission || result._doc.permission == "null" ){
                result._doc.permission = {
                    applyBonus: true,
                    forbidPartnerFromLogin: false,
                    phoneCallFeedback: true,
                    SMSFeedBack: true,
                    disableCommSettlement: false
                };
            }
        }
    }
}

partnerSchema.post('find', function(result) {
    if( result && result.length > 0 ){
        for( var i = 0; i < result.length; i++ ){
            partnerPostFindUpdate(result[i]);
        }
        return result;
    }
});

partnerSchema.post('findOne', function (result) {
    partnerPostFindUpdate(result, true);
});

partnerSchema.pre('save', function (next) {
    var partner = this;

    if (!partner.isModified('phoneNumber')) {
        return next();
    }
    // override the cleartext password with the hashed one
    try {
        partner.phoneNumber = rsaCrypto.encrypt(partner.phoneNumber);
    }
    catch (error) {
        console.log(error);
    }
    next();
});

module.exports = partnerSchema;
