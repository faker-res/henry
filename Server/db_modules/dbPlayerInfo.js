"use strict";

var dbPlayerInfoFunc = function () {
};
module.exports = new dbPlayerInfoFunc();

var Chance = require('chance');
var chance = new Chance();
var Q = require("q");
var bcrypt = require('bcrypt');
var captchapng = require('./../modules/captchapng');
var geoip = require('geoip-lite');
var jwt = require('jsonwebtoken');
var md5 = require('md5');
let rsaCrypto = require("../modules/rsaCrypto");

let env = require('../config/env').config();

var counterManager = require('./../modules/counterManager');
var dbUtility = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var proposalExecutor = require('./../modules/proposalExecutor');
// var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbLogger = require("./../modules/dbLogger");
// var constProposalType = require("./../const/constProposalType");
var constRewardType = require("./../const/constRewardType");
var constSystemParam = require('../const/constSystemParam');
var constPlayerStatus = require('../const/constPlayerStatus');
var constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
var constServerCode = require('../const/constServerCode');
var constRewardTaskStatus = require('../const/constRewardTaskStatus');
var constProposalType = require('../const/constProposalType');
var constProposalStatus = require('../const/constProposalStatus');
var constShardKeys = require('../const/constShardKeys');
var constPlayerTopUpType = require('../const/constPlayerTopUpType');
var constProposalMainType = require('../const/constProposalMainType');
var constGameStatus = require("./../const/constGameStatus");
var constPlayerLevelPeriod = require("./../const/constPlayerLevelPeriod");
var constPlayerCreditTransferStatus = require("./../const/constPlayerCreditTransferStatus");
var constReferralStatus = require("./../const/constReferralStatus");
var constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
var cpmsAPI = require("../externalAPI/cpmsAPI");

var moment = require('moment-timezone');
var rewardUtility = require("../modules/rewardUtility");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var pmsAPI = require("../externalAPI/pmsAPI.js");
var localization = require("../modules/localization");
var SettlementBalancer = require('../settlementModule/settlementBalancer');

var queryPhoneLocation = require('query-mobile-phone-area');
var serverInstance = require("../modules/serverInstance");
var constProposalUserType = require('../const/constProposalUserType');
var constProposalEntryType = require('../const/constProposalEntryType');
var errorUtils = require("../modules/errorUtils.js");
var SMSSender = require('../modules/SMSSender');
var constPlayerSMSSetting = require('../const/constPlayerSMSSetting');
var constRewardPointsLogCategory = require("../const/constRewardPointsLogCategory");

// constants
const constProviderStatus = require("./../const/constProviderStatus");

// db_common
const dbPlayerUtil = require("../db_common/dbPlayerUtility");

// db_modules
let dbGeoIp = require('./../db_modules/dbGeoIp');
let dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
let dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
let dbPlayerCreditTransfer = require('../db_modules/dbPlayerCreditTransfer');
let dbPlayerLevel = require('../db_modules/dbPlayerLevel');
let dbPlayerReward = require('../db_modules/dbPlayerReward');
let dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
let dbProposal = require('./../db_modules/dbProposal');
let dbProposalType = require('./../db_modules/dbProposalType');
let dbRewardEvent = require('./../db_modules/dbRewardEvent');
let dbRewardTask = require('./../db_modules/dbRewardTask');
let dbRewardTaskGroup = require('./../db_modules/dbRewardTaskGroup');
let dbPlayerCredibility = require('./../db_modules/dbPlayerCredibility');
let dbPartner = require('../db_modules/dbPartner');
let dbRewardPoints = require('../db_modules/dbRewardPoints');
let dbPlayerRewardPoints = require('../db_modules/dbPlayerRewardPoints');
let dbPlayerMail = require('../db_modules/dbPlayerMail');
let dbConsumptionReturnWithdraw = require('../db_modules/dbConsumptionReturnWithdraw');
let PLATFORM_PREFIX_SEPARATOR = '';

let dbPlayerInfo = {

    /**
     * Create a new reward points record based on player data
     */
    createPlayerRewardPointsRecord: function (platformId, playerId, bulkCreate) {
        if (platformId && !playerId && bulkCreate) {
            return dbconfig.collection_players.find({platform: platformId})
                .sort({_id:-1}).limit(20)
                .lean().then(
                    playerData => {
                        for (let x in playerData) {
                            if (playerData[x]) {

                                // undefined checking is backward compatible for available players without rewardPointsTask permission schema
                                if (playerData[x].permission && playerData[x].permission.rewardPointsTask || playerData[x].permission.rewardPointsTask === undefined) {
                                    if (!playerData[x].rewardPointsObjId) {
                                        let bulkCreateNewRewardPointsData = {
                                            platformObjId: platformId,
                                            playerObjId: playerData[x]._id,
                                            playerName: playerData[x].name,
                                            playerLevel: playerData[x].playerLevel,
                                        };

                                        dbconfig.collection_rewardPoints(bulkCreateNewRewardPointsData).save().then(
                                            points => {
                                                let saveObj = {
                                                    rewardPointsObjId: points._id
                                                };

                                                // update player info with reward points record based on player id and platform id
                                                return dbconfig.collection_players.findOneAndUpdate({
                                                    _id: points.playerObjId,
                                                    platform: points.platformObjId
                                                }, saveObj, {upsert: true, new: true});
                                            }
                                        ).then(
                                            data => {
                                                return dbconfig.collection_players.findOne({_id: data._id})
                                                    .populate({
                                                        path: "rewardPointsObjId",
                                                        model: dbconfig.collection_rewardPoints
                                                    })
                                                    .lean();
                                            }
                                        )
                                    }
                                    else {
                                        console.log(playerData[x].name + ': Player already have reward points record');
                                    }
                                }
                                else {
                                    console.log(playerData[x].name + ': Player does not have rewardPointsTask permission');
                                }
                            }
                            else {
                                return Q.reject({
                                    name: "DataError",
                                    message: "Player not found"
                                });
                            }
                        }
                    }
                );
        } else if (platformId && playerId && !bulkCreate) {
            return dbconfig.collection_players.findOne({_id: playerId})
                .populate({path: "platform", model: dbconfig.collection_platform})
                .lean().then(
                    playerData => {
                        if (playerData) {
                            if (playerData.permission && playerData.permission.rewardPointsTask === false) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_NO_PERMISSION,
                                    name: "DataError",
                                    message: "Player does not have reward points task permission"
                                });
                            }

                            let newRewardPointsData = {
                                platformObjId: platformId,
                                playerObjId: playerId,
                                playerName: playerData.name,
                                playerLevel: playerData.playerLevel,
                            };

                            let newRewardPoints = new dbconfig.collection_rewardPoints(newRewardPointsData);
                            return newRewardPoints.save().then(
                                points => {
                                    let saveObj = {
                                        rewardPointsObjId: points._id
                                    };

                                    // update player info with reward points record based on player id and platform id
                                    return dbconfig.collection_players.findOneAndUpdate({
                                        _id: points.playerObjId,
                                        platform: points.platformObjId
                                    }, saveObj, {upsert: true, new: true});
                                }
                            ).then(
                                data => {
                                    return dbconfig.collection_players.findOne({_id: data._id})
                                        .populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints})
                                        .lean();
                                }
                            )
                        }
                        else {
                            return Q.reject({
                                name: "DataError",
                                message: "Player not found"
                            });
                        }
                    }
                );
        }
    },

    /**
     * Remove a new reward points record based on player data
     */
    removePlayerRewardPointsRecord: function (platformId, playerId, rewardPointsObjId) {
        return dbconfig.collection_players.update(
            {
                _id: playerId,
                platform: platformId
            },
            {
                $unset: { rewardPointsObjId: ""}
            }
        ).then(
            () => {
                return dbconfig.collection_rewardPoints.remove({_id:rewardPointsObjId});

            }
        ).catch(err => {
                console.error(err);
            }
        )
    },

    /**
     * Update player's reward points and create log
     */
    updatePlayerRewardPointsRecord: function (playerObjId, platformObjId, updateAmount, remark, adminName, adminId) {
        let category = updateAmount >= 0 ? constRewardPointsLogCategory.POINT_INCREMENT : constRewardPointsLogCategory.POINT_REDUCTION;
        return dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, updateAmount, category, remark, constPlayerRegistrationInterface.BACKSTAGE, adminName);
    },

    /**
     * Get player reward points daily limit
     */
    getPlayerRewardPointsDailyLimit: function (platformObjId, playerLevel) {
        return dbconfig.collection_rewardPointsLvlConfig.findOne({
            platformObjId: platformObjId
        }).lean().then(
            data => {
                let dailyLimit = null;
                for (let i=0; i < data.params.length; i++) {
                    if (data.params[i].levelObjId.toString() === playerLevel.toString()) {
                        dailyLimit = data.params[i].pointToCreditManualMaxPoints;
                        return dailyLimit;
                    }
                }
            }
        )
    },

    /**
     * Get player reward points daily converted points
     */
    getPlayerRewardPointsDailyConvertedPoints: function (rewardPointsObjId) {
        let todayTime = dbUtility.getTodaySGTime();
        let category = constRewardPointsLogCategory.EARLY_POINT_CONVERSION;
        return dbconfig.collection_rewardPointsLog.aggregate({
            $match: {
                createTime: {
                    $gte: todayTime.startTime,
                    $lt: todayTime.endTime
                },
                rewardPointsObjId: ObjectId(rewardPointsObjId),
                category: category
            }
        }, {
            $group: {
                _id: "$rewardPointsObjId",
                amount: {$sum: {$subtract: ["$oldPoints", "$newPoints"]}}
            }
        }).then(
            rewardPointsLog => rewardPointsLog && rewardPointsLog[0] ? rewardPointsLog[0].amount : 0
        )
    },

    /**
     * Create a new player user
     * @param {Object} inputData - The data of the player user. Refer to playerInfo schema.
     */
    createPlayerInfoAPI: function (inputData, bypassSMSVerify, adminName, adminId) {
        let platformObjId = null;
        let platformPrefix = "";
        let platformObj = null;
        let platformId = null;
        if (!inputData) {
            return Q.reject({name: "DataError", message: "No input data is found."});
        }
        else if (inputData.platformId) {
            return dbconfig.collection_platform.findOne({platformId: inputData.platformId}).then(
                platformData => {
                    if (!platformData) {
                        return Q.reject({name: "DataError", message: "Cannot find platform"});
                    }

                    platformId = platformData.platformId;
                    platformObj = platformData;
                    platformObjId = platformData._id;
                    platformPrefix = platformData.prefix;

                    if (!platformObj.requireSMSVerification || bypassSMSVerify) {
                        return true;
                    }

                    return dbPlayerMail.verifySMSValidationCode(inputData.phoneNumber, platformData, inputData.smsCode);
                }
            ).then(
                isVerified => {
                    //player flag for new system
                    inputData.isNewSystem = true;
                    let playerNameChecker = dbPlayerInfo.isPlayerNameValidToRegister({
                        name: inputData.name,
                        platform: platformObjId
                    });
                    let realNameChecker = dbPlayerInfo.isPlayerNameValidToRegister({
                        realName: inputData.realName,
                        platform: platformObjId
                    });
                    if (!("allowSameRealNameToRegister" in platformObj)) {
                        platformObj.allowSameRealNameToRegister = true;
                    }
                    if (platformObj.allowSameRealNameToRegister) {
                        return playerNameChecker;
                    }

                    return Q.all([playerNameChecker, realNameChecker]).then(data => {
                        if (data && data.length == 2 && data[0] && data[1]) {
                            if (data[0].isPlayerNameValid && data[1].isPlayerNameValid) {
                                return {"isPlayerNameValid": true};
                            }
                            else {
                                if (!data[0].isPlayerNameValid) {
                                    return Q.reject({
                                        status: constServerCode.USERNAME_ALREADY_EXIST,
                                        name: "DBError",
                                        message: "Player name already exists"
                                    });
                                } else {
                                    return Q.reject({
                                        status: constServerCode.USERNAME_ALREADY_EXIST,
                                        name: "DBError",
                                        message: "Realname already exists"
                                    });
                                }
                            }
                        }
                        else {
                            return {"isPlayerNameValid": false};
                        }
                    });
                }
            ).then(
                validData => {
                    if (validData && validData.isPlayerNameValid) {

                        // phone number white listing
                        if (platformObj.whiteListingPhoneNumbers
                            && platformObj.whiteListingPhoneNumbers.length > 0
                            && inputData.phoneNumber
                            && platformObj.whiteListingPhoneNumbers.indexOf(inputData.phoneNumber) > -1)
                            return {isPhoneNumberValid: true};

                        if (platformObj.allowSamePhoneNumberToRegister === true) {
                            return dbPlayerInfo.isExceedPhoneNumberValidToRegister({
                                phoneNumber: rsaCrypto.encrypt(inputData.phoneNumber),
                                platform: platformObjId
                            }, platformObj.samePhoneNumberRegisterCount);
                            // return {isPhoneNumberValid: true}
                        } else {
                            return dbPlayerInfo.isPhoneNumberValidToRegister({
                                phoneNumber: rsaCrypto.encrypt(inputData.phoneNumber),
                                platform: platformObjId
                            });
                        }
                    } else {
                        return Q.reject({
                            status: constServerCode.USERNAME_ALREADY_EXIST,
                            name: "DBError",
                            message: "Username already exists"
                        });
                    }
                }
            ).then(
                data => {
                    if (data.isPhoneNumberValid) {
                        inputData.platform = platformObjId;
                        inputData.name = inputData.name.toLowerCase();
                        delete inputData.platformId;
                        //find player referrer if there is any
                        let proms = [];
                        if (inputData.referral || inputData.referralName) {
                            let referralName = inputData.referralName ? inputData.referralName : platformPrefix + inputData.referral;
                            let referralProm = dbconfig.collection_players.findOne({
                                name: referralName,
                                platform: platformObjId
                            }).then(
                                data => {
                                    if (data) {
                                        inputData.referral = data._id;
                                        return inputData;
                                    }
                                    else {
                                        // If user key in invalid referral during register, we will not proceed
                                        return Q.reject({
                                            status: constServerCode.INVALID_REFERRAL,
                                            name: "DataError",
                                            message: "Invalid referral"
                                        });
                                    }
                                }
                            );
                            proms.push(referralProm);
                        }
                        if (inputData.partnerName) {
                            delete inputData.referral;
                            let partnerProm = dbconfig.collection_partner.findOne({
                                partnerName: inputData.partnerName,
                                platform: platformObjId
                            }).then(
                                data => {
                                    if (data) {
                                        inputData.partner = data._id;
                                        inputData.partnerId = data.partnerId;
                                        return inputData;
                                    }
                                    else {
                                        delete inputData.partnerName;
                                        return inputData;
                                    }
                                }
                            );
                            proms.push(partnerProm);
                        }

                        //check partnerId when create player account manually
                        if (inputData.partner) {
                            delete inputData.referral;
                            let partnerObjId = ObjectId(inputData.partner);
                            let partnerProm = dbconfig.collection_partner.findOne({
                                _id: partnerObjId,
                                platform: platformObjId
                            }).then(
                                data => {
                                    if (data) {
                                        if(data.partnerId){
                                            inputData.partnerId = data.partnerId;
                                        }
                                        if(data.partnerName){
                                            inputData.partnerName = data.partnerName;
                                        }

                                        return inputData;
                                    } else {
                                        delete inputData.partner;
                                        return inputData;
                                    }
                                }
                            )
                        }
                        //check if player's domain matches any partner
                        if (inputData.domain) {
                            delete inputData.referral;
                            let filteredDomain = dbUtility.getDomainName(inputData.domain);
                            while (filteredDomain.indexOf("/") != -1) {
                                filteredDomain = filteredDomain.replace("/", "");
                            }
                            inputData.domain = filteredDomain;

                            if (!inputData.partnerId) {
                                let domainProm = dbconfig.collection_partner.findOne({ownDomain: {$elemMatch: {$eq: inputData.domain}}}).then(
                                    data => {
                                        if (data) {
                                            inputData.partner = data._id;
                                            if(data.partnerId){
                                                inputData.partnerId = data.partnerId;
                                            }
                                            if(data.partnerName){
                                                inputData.partnerName = data.partnerName;
                                            }
                                            return inputData;
                                        }
                                        else {
                                            return inputData;
                                        }
                                    }
                                );
                                proms.push(domainProm);
                            }

                            let promoteWayProm = dbconfig.collection_csOfficerUrl.findOne({
                                domain: {
                                    $regex: inputData.domain,
                                    $options: "x"
                                }
                            }).lean().then(data => {
                                if (data) {
                                    inputData.csOfficer = data.admin;
                                    inputData.promoteWay = data.way
                                }
                            });

                            proms.push(promoteWayProm);
                        }

                        return Q.all(proms);
                    } else {
                        return Q.reject({
                            status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                            name: "DBError",
                            message: "Phone number already exists"
                        });
                    }
                }
            ).then(
                data => {
                    // determine registrationInterface
                    if (inputData.domain && inputData.domain.indexOf('fpms8') !== -1) {
                        inputData.registrationInterface = constPlayerRegistrationInterface.BACKSTAGE;
                    }
                    else if (inputData.userAgent && inputData.userAgent[0]) {
                        let userAgent = inputData.userAgent[0];
                        if (userAgent.browser.indexOf("WebKit") !== -1 || userAgent.browser.indexOf("WebView") !== -1) {
                            if (inputData.partner) {
                                inputData.registrationInterface = constPlayerRegistrationInterface.APP_AGENT;
                            }
                            else {
                                inputData.registrationInterface = constPlayerRegistrationInterface.APP_PLAYER;
                            }
                        }
                        else if (userAgent.os.indexOf("iOS") !== -1 || userAgent.os.indexOf("ndroid") !== -1 || userAgent.browser.indexOf("obile") !== -1) {
                            if (inputData.partner) {
                                inputData.registrationInterface = constPlayerRegistrationInterface.H5_AGENT;
                            }
                            else {
                                inputData.registrationInterface = constPlayerRegistrationInterface.H5_PLAYER;
                            }
                        }
                        else {
                            if (inputData.partner) {
                                inputData.registrationInterface = constPlayerRegistrationInterface.WEB_AGENT;
                            }
                            else {
                                inputData.registrationInterface = constPlayerRegistrationInterface.WEB_PLAYER;
                            }
                        }
                    }
                    else {
                        inputData.registrationInterface = constPlayerRegistrationInterface.BACKSTAGE;
                    }

                    if (inputData.registrationInterface !== constPlayerRegistrationInterface.BACKSTAGE) {
                        inputData.loginTimes = 1;
                    }
                    else if (adminName) {
                        // insert related CS name when account is opened from backstage
                        inputData.accAdmin = adminName;
                        inputData.csOfficer = ObjectId(adminId);
                    }

                    return dbPlayerInfo.createPlayerInfo(inputData);
                }
            ).then(
                data => {
                    if (data) {
                        dbPlayerInfo.createPlayerLoginRecord(data);
                        //todo::temp disable similar player untill ip is correct
                        if(data.lastLoginIp && data.lastLoginIp != "undefined"){
                            dbPlayerInfo.updateGeoipws(data._id, platformObjId, data.lastLoginIp);
                        }
                        // dbPlayerInfo.findAndUpdateSimilarPlayerInfo(data, inputData.phoneNumber).then();
                        return data;
                    }
                    else {
                        return data;
                    }
                }
            ).then(
                data => dbconfig.collection_players.findOne({_id: data._id})
                    .populate({
                        path: "playerLevel",
                        model: dbconfig.collection_playerLevel
                    }).lean().then(
                        pdata => {
                            pdata.name = pdata.name.replace(platformPrefix, "");
                            pdata.platformId = platformId;
                            pdata.partnerId = inputData.partnerId;
                            pdata.partnerName = inputData.partnerName;
                            return pdata;
                        }
                    )
            ).then(
                data => {
                    if (data) {
                        return dbPlayerInfo.createPlayerRewardPointsRecord(data.platform, data._id, false);
                    }
                    else {
                        return data;
                    }
                }
            );
        } else {
            return Q.reject({name: "DataError", message: "Platform does not exist"});
        }
    },

    getPlayerDataWithOutPlatformPrefix: function (playerObj) {
        var platformObjId = playerObj.platform || playerObj.platform._id;
        if (platformObjId) {
            return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
                platformData => {
                    if (platformData) {
                        playerObj.name = playerObj.name.replace(platformData.prefix, "");
                        return playerObj;
                    }
                    else {
                        return playerObj;
                    }
                }
            );
        }
        else {
            return Q.resolve(playerObj);
        }
    },

    createPlayerLoginRecord: function (data) {
        //add player login record
        var recordData = {
            player: data._id,
            platform: data.platform,
            loginIP: data.lastLoginIp,
            userAgent: data.userAgent.length > 0 ? data.userAgent[data.userAgent.length - 1] : {},
            city: data.city,
            province: data.province,
            country: data.country,
            longitude: data.longitude,
            latitude: data.latitude,
            loginTime: data.registrationTime
        };
        var record = new dbconfig.collection_playerLoginRecord(recordData);
        record.save().then().catch(errorUtils.reportError);
    },

    findAndUpdateSimilarPlayerInfo: function (data, phoneNumber) {
        //todo: in future, this function could be replaced bt the func 'findAndUpdateSimilarPlayerInfoByField' below
        var playerData = data;
        var newPlayerObjId = data._id;
        var platformObjId = data.platform;
        var proms = [];
        var prom_findByPhNo = dbconfig.collection_players.find({
            phoneNumber: data.phoneNumber,
            platform: platformObjId,
            _id: {$ne: newPlayerObjId}
        }).lean();
        proms.push(prom_findByPhNo);

        var prom_findByIp = dbconfig.collection_players.find({
            loginIps: data.lastLoginIp,
            platform: platformObjId,
            _id: {$ne: newPlayerObjId}
        }).lean();
        proms.push(prom_findByIp);

        if (data.realName) {
            var prom_findByName = dbconfig.collection_players.find({
                realName: data.realName,
                platform: platformObjId,
                _id: {$ne: newPlayerObjId}
            }).lean();
            proms.push(prom_findByName);
        }

        if (data.bankAccount) {
            proms.push(dbconfig.collection_players.find({
                bankAccount: data.bankAccount,
                platform: platformObjId,
                _id: {$ne: newPlayerObjId}
            }).lean());
        }

        return Q.all(proms).then(
            data => {
                if (data && (data[0] || data[1] || data[2] || data[3])) {
                    var prom = [];
                    var similarPlayersArray = [];

                    if (data[2] && data[2].length > 0) { // search result by real Name

                        for (var i = 0; i < data[2].length; i++) {
                            var similarPlayerData = {
                                playerObjId: data[2][i]._id,
                                field: "realName",
                                content: data[2][i].realName
                            };
                            similarPlayersArray.push(similarPlayerData);
                            prom.push(
                                dbconfig.collection_players.findOneAndUpdate(
                                    {_id: data[2][i]._id, platform: platformObjId},
                                    {
                                        $push: {
                                            similarPlayers: {
                                                playerObjId: newPlayerObjId,
                                                field: "realName",
                                                content: playerData.realName
                                            }
                                        }
                                    }
                                )
                            );
                        }
                    }
                    if (data[0] && data[0].length > 0 && phoneNumber) {
                        // var startIndex = Math.max(Math.floor((phoneNumber.length - 4) / 2), 0);
                        var pNumber = dbUtility.encodePhoneNum(phoneNumber);
                        for (var j = 0; j < data[0].length; j++) {
                            var similarPlayerData = {
                                playerObjId: data[0][j]._id,
                                field: "phoneNumber",
                                content: pNumber
                            };
                            similarPlayersArray.push(similarPlayerData);
                            prom.push(
                                dbconfig.collection_players.findOneAndUpdate(
                                    {_id: data[0][j]._id, platform: platformObjId},
                                    {
                                        $push: {
                                            similarPlayers: {
                                                playerObjId: newPlayerObjId,
                                                field: "phoneNumber",
                                                content: pNumber
                                            }
                                        }
                                    }
                                )
                            );
                        }
                    }
                    if (data[1] && data[1].length > 0) {
                        for (var k = 0; k < data[1].length; k++) {
                            var similarPlayerData = {
                                playerObjId: data[1][k]._id,
                                field: "lastLoginIp",
                                content: data[1][k].lastLoginIp
                            };
                            similarPlayersArray.push(similarPlayerData);
                            prom.push(
                                dbconfig.collection_players.findOneAndUpdate(
                                    {_id: data[1][k]._id, platform: platformObjId},
                                    {
                                        $push: {
                                            similarPlayers: {
                                                playerObjId: newPlayerObjId,
                                                field: "lastLoginIp",
                                                content: playerData.lastLoginIp
                                            }
                                        }
                                    }
                                )
                            );
                        }
                    }
                    if (data[3] && data[3].length > 0) {
                        for (var q = 0; q < data[3].length; q++) {
                            var similarPlayerData = {
                                playerObjId: data[3][q]._id,
                                field: "bankAccount",
                                content: dbUtility.encodeBankAcc(data[3][q].bankAccount)
                            };
                            similarPlayersArray.push(similarPlayerData);
                            prom.push(
                                dbconfig.collection_players.findOneAndUpdate(
                                    {_id: data[3][q]._id, platform: platformObjId},
                                    {
                                        $push: {
                                            similarPlayers: {
                                                playerObjId: newPlayerObjId,
                                                field: "bankAccount",
                                                content: dbUtility.encodeBankAcc(playerData.bankAccount)
                                            }
                                        }
                                    }
                                )
                            )
                        }
                    }
                    prom.push(
                        dbconfig.collection_players.findOneAndUpdate(
                            {_id: newPlayerObjId, platform: platformObjId},
                            {similarPlayers: similarPlayersArray},
                            {new: true}
                        )
                    );
                    return Q.all(prom);
                }
            }
        ).then(
            data => {
                if (data && data.length > 0) {
                    return data[data.length - 1];
                }
                else {
                    return playerData;
                }
            }
        );
    },

    findAndUpdateSimilarPlayerInfoByField: function (playerData, fieldName, val) {
        let newPlayerObjId = playerData._id;
        let platformObjId = playerData.platform;
        let searchVal = val || playerData[fieldName];
        let prom1 = Q.resolve(true);
        let query = {
            platform: platformObjId,
            _id: {$ne: newPlayerObjId}
        };
        let searchFieldName = (fieldName == 'lastLoginIp')
            ? 'loginIps'
            : fieldName;
        query[searchFieldName] = searchVal;
        prom1 = dbconfig.collection_players.find(query).lean();
        let func = (fieldName == 'phoneNumber')
            ? dbUtility.encodePhoneNum
            : ((fieldName == 'bankAccount')
                ? dbUtility.encodeBankAcc
                : null);
        return Q.resolve(prom1).then(results => {
            let prom = [];
            let similarPlayersArray = [];
            if (results && results.length > 0) {
                for (let i = 0; i < results.length; i++) {
                    let similarPlayerDataContent;
                    if (fieldName == 'lastLoginIp') {
                        similarPlayerDataContent = searchVal;
                    } else {
                        similarPlayerDataContent = func ? func(result[i][fieldName]) : result[i][fieldName];
                    }
                    let similarPlayerData = {
                        playerObjId: results[i]._id,
                        field: fieldName,
                        content: similarPlayerDataContent
                    };
                    similarPlayersArray.push(similarPlayerData);
                    prom.push(
                        dbconfig.collection_players.findOneAndUpdate(
                            {_id: results[i]._id, platform: platformObjId},
                            {
                                $push: {
                                    similarPlayers: {
                                        playerObjId: newPlayerObjId,
                                        field: fieldName,
                                        content: func ? func(searchVal) : searchVal
                                    }
                                }
                            }
                        )
                    );
                }
                prom.push(
                    dbconfig.collection_players.findOneAndUpdate(
                        {_id: newPlayerObjId, platform: platformObjId},
                        {
                            $push: {
                                similarPlayers: {
                                    $each: similarPlayersArray
                                }
                            }
                        }
                    )
                );
                return Q.all(prom);
            } else {
                return true;
            }
        })
    },

    createPlayerInfo: function (playerdata, skipReferrals, skipPrefix) {
        let deferred = Q.defer();
        let playerData = null;
        let platformData = null;

        playerdata.name = playerdata.name.toLowerCase();

        // Player name and password should be alphanumeric and between 6 to 20 characters
        let alphaNumRegex = /^([0-9]|[a-z])+([0-9a-z]+)$/i;
        let chineseRegex = /^[\u4E00-\u9FA5\u00B7\u0020]{0,}$/;

        if (env.mode !== "local" && env.mode !== "qa") {
            // ignore for unit test
            if (/*playerdata.name.length < 6 || playerdata.name.length > 20 ||*/ !playerdata.name.match(alphaNumRegex)) {
                return Q.reject({
                    status: constServerCode.PLAYER_NAME_INVALID,
                    name: "DBError",
                    message: "Username should be alphanumeric and within 20 characters"
                });

            }

            if (playerdata.password.length < 6 || playerdata.password.length > 20 || !playerdata.password.match(alphaNumRegex)) {
                return Q.reject({
                    status: constServerCode.PLAYER_NAME_INVALID,
                    name: "DBError",
                    message: "Password should be alphanumeric and within 20 characters"
                });
            }

            if ((playerdata.realName && !playerdata.realName.match(chineseRegex))) {
                return Q.reject({
                    status: constServerCode.PLAYER_NAME_INVALID,
                    name: "DBError",
                    message: "Realname should be chinese character"
                });
            }
        }

        dbconfig.collection_platform.findOne({_id: playerdata.platform}).then(
            function (platform) {
                if (platform) {
                    platformData = platform;

                    let delimitedPrefix = platformData.prefix + PLATFORM_PREFIX_SEPARATOR;
                    if (!skipPrefix) {
                        playerdata.name = delimitedPrefix.toLowerCase() + playerdata.name;
                    }

                    if ((platformData.playerNameMaxLength > 0 && playerdata.name.length > platformData.playerNameMaxLength) || (platformData.playerNameMinLength > 0 && playerdata.name.length < platformData.playerNameMinLength)) {
                        return {isPlayerNameValid: false};
                    } else {
                        return {isPlayerNameValid: true};
                    }
                } else {
                    deferred.reject({name: "DBError", message: "No such platform"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error when finding platform",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data.isPlayerNameValid) {
                    if (platformData.whiteListingPhoneNumbers
                        && platformData.whiteListingPhoneNumbers.length > 0
                        && playerdata.phoneNumber
                        && platformData.whiteListingPhoneNumbers.indexOf(playerdata.phoneNumber) > -1)
                        return {isPhoneNumberValid: true};

                    if (platformData.allowSamePhoneNumberToRegister === true) {
                        return dbPlayerInfo.isExceedPhoneNumberValidToRegister({
                            phoneNumber: rsaCrypto.encrypt(playerdata.phoneNumber),
                            platform: playerdata.platform
                        }, platformData.samePhoneNumberRegisterCount);
                        // return {isPhoneNumberValid: true};
                    } else {
                        return dbPlayerInfo.isPhoneNumberValidToRegister({
                            phoneNumber: rsaCrypto.encrypt(playerdata.phoneNumber),
                            platform: playerdata.platform
                        });
                    }
                } else {
                    deferred.reject({name: "DBError", message: "Length of Player Name is not valid"});
                }
            }, function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Player Name length is not valid",
                    error: error
                });
            }
        ).then(
            //make sure phone number is unique
            function (data) {
                if (data.isPhoneNumberValid) {
                    return dbPlayerInfo.isPlayerNameValidToRegister({
                        name: playerdata.name,
                        platform: playerdata.platform
                    });
                } else {
                    deferred.reject({name: "DBError", message: "Phone number already exists"});
                }
            },
            function (error) {
                deferred.reject({
                    status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                    name: "DBError",
                    message: "Phone number already exists",
                    error: error
                });
            }
        ).then(
            //make sure player name is unique
            function (data) {
                if (data.isPlayerNameValid) {
                    var playerName = new dbconfig.collection_playerName({
                        name: playerdata.name,
                        platform: playerdata.platform
                    });
                    return playerName.save();
                } else {
                    deferred.reject({name: "DBError", message: "Username already exists"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Username already exists",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    var player = new dbconfig.collection_players(playerdata);
                    return player.save();
                } else {
                    deferred.reject({name: "DBError", message: "Could not save player"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in checking player name uniqueness " + error.message,
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    playerData = data;
                    var levelProm = dbconfig.collection_playerLevel.findOne({
                        platform: playerdata.platform,
                        value: mongoose.Types.ObjectId.isValid(playerdata.level) ? playerdata.level : (playerdata.level || 0)
                    }).exec();
                    var platformProm = dbconfig.collection_platform.findOne({_id: playerdata.platform});
                    var bankGroupProm = dbconfig.collection_platformBankCardGroup.findOne({
                        platform: playerdata.platform,
                        bDefault: true
                    });
                    var merchantGroupProm = dbconfig.collection_platformMerchantGroup.findOne({
                        platform: playerdata.platform,
                        bDefault: true
                    });
                    var alipayGroupProm = dbconfig.collection_platformAlipayGroup.findOne({
                        platform: playerdata.platform,
                        bDefault: true
                    });
                    var wechatGroupProm = dbconfig.collection_platformWechatPayGroup.findOne({
                        platform: playerdata.platform,
                        bDefault: true
                    });
                    let quickpayGroupProm = dbconfig.collection_platformQuickPayGroup.findOne({
                        platform: playerdata.platform,
                        bDefault: true
                    });
                    return Q.all([levelProm, platformProm, bankGroupProm, merchantGroupProm, alipayGroupProm, wechatGroupProm, quickpayGroupProm]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create new player."});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating new player. " + error.message,
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    var proms = [];
                    var playerUpdateData = {
                        playerLevel: data[0]._id,
                        playerId: (data[1].prefix + playerData.playerId)
                    };
                    if (data[2]) {
                        playerUpdateData.bankCardGroup = data[2]._id;
                        //} else {
                        //    throw Error("No bankCardGroup found for platform: " + playerdata.platform);
                    }
                    if (data[3]) {
                        playerUpdateData.merchantGroup = data[3]._id;
                        //} else {
                        //    throw Error("No merchantGroup found for platform: " + playerdata.platform);
                    }
                    if (data[4]) {
                        playerUpdateData.alipayGroup = data[4]._id;
                    }
                    if (data[5]) {
                        playerUpdateData.wechatPayGroup = data[5]._id;
                    }
                    if (data[6]) {
                        playerUpdateData.quickPayGroup = data[6]._id;
                    }
                    proms.push(
                        dbconfig.collection_players.findOneAndUpdate(
                            {_id: playerData._id, platform: playerData.platform},
                            playerUpdateData,
                            {new: true}
                        )
                    );
                    //skip update referrals for data migration
                    if (playerData.partner && !skipReferrals) {
                        proms.push(
                            dbconfig.collection_partner.findOneAndUpdate(
                                {_id: playerData.partner, platform: playerData.platform},
                                {$inc: {totalReferrals: 1}}
                            )
                        )
                    }
                    return Q.all(proms);
                }
                else {
                    //todo::if there is no player level on platform...improve the handling here
                    deferred.resolve(playerData);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating new player.", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data && data[0]);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error updating new player.", error: error});
            }
        ).catch(
            function (error) {
                deferred.reject({name: "DBError", message: "Unexpected error updating new player.", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Create a new test player user for platform
     * @param {String} platformId - The data of the player user. Refer to playerInfo schema.
     */
    createTestPlayerForPlatform: function (platformId) {
        var deferred = Q.defer();
        //generate random test player data
        var randomPsw = chance.hash({length: constSystemParam.PASSWORD_LENGTH});
        var testPlayerData = {
            platform: platformId,
            name: chance.name().replace(/\s+/g, '').toLowerCase(),
            password: randomPsw,
            isTestPlayer: true,
            isRealPlayer: false
        };
        dbPlayerInfo.createPlayerInfo(testPlayerData).then(
            function (data) {
                if (data) {
                    data.password = randomPsw;
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create new player."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating new player.", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Get the information of the player by playerId or _id
     * @param {String} query - Query string
     */
    getPlayerInfoAPI: function (query) {
        var deferred = Q.defer();
        var apiData = null;
        dbconfig.collection_players.findOne(query).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).lean().then(
            function (data) {
                data.fullPhoneNumber = data.phoneNumber;
                data.phoneNumber = dbUtility.encodePhoneNum(data.phoneNumber);
                data.email = dbUtility.encodeEmail(data.email);
                if (data.bankAccount) {
                    data.bankAccount = dbUtility.encodeBankAcc(data.bankAccount);
                }
                apiData = data;

                // if (data.realName) {
                //     data.realName = dbUtility.encodeRealName(data.realName);
                // }
                // if (data.bankAccountName) {
                //     data.bankAccountName = dbUtility.encodeRealName(data.bankAccountName);
                // }

                if (data.platform) {
                    return dbconfig.collection_platform.findOne({_id: data.platform});
                }
            }, function (err) {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: err})
            }
        ).then(
            function (platformData) {
                apiData.platformId = platformData.platformId;
                apiData.name = apiData.name.replace(platformData.prefix, "");
                delete apiData.platform;
                var a, b, c;
                a = apiData.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: apiData.bankAccountProvince}) : true;
                b = apiData.bankAccountCity ? pmsAPI.foundation_getCity({cityId: apiData.bankAccountCity}) : true;
                c = apiData.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: apiData.bankAccountDistrict}) : true;
                var creditProm = dbPlayerInfo.getPlayerCredit(apiData.playerId);
                return Q.all([a, b, c, creditProm]);
            },
            function (err) {
                deferred.reject({name: "DBError", error: err, message: "Error in getting player platform Data"})
            }
        ).then(
            zoneData => {
                apiData.bankAccountProvinceId = apiData.bankAccountProvince;
                apiData.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : apiData.bankAccountProvince;
                apiData.bankAccountCityId = apiData.bankAccountCity;
                apiData.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : apiData.bankAccountCity;
                apiData.bankAccountDistrictId = apiData.bankAccountDistrict;
                apiData.bankAccountDistrict = zoneData[2].district ? zoneData[2].district.name : apiData.bankAccountDistrict;
                apiData.pendingRewardAmount = zoneData[3] ? zoneData[3].pendingRewardAmount : 0;
                deferred.resolve(apiData);
            },
            zoneError => {
                deferred.resolve(apiData);
            }
        );
        return deferred.promise;
    },

    getPlayerInfo: function (query) {
        return dbconfig.collection_players.findOne(query, {similarPlayers: 0})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                playerData => {
                    if (!playerData) {
                        return false;
                    }
                    return {
                        _id: playerData._id,
                        name: playerData.name,
                        platformId: playerData.platform.platformId,
                        validCredit: playerData.validCredit,
                        realName: playerData.realName
                    }
                }
            );
    },

    getOnePlayerInfo: function (query) {
        let playerData;

        return dbconfig.collection_players.findOne(query, {similarPlayers: 0})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints})
            .then(data => {
                if (data) {
                    playerData = data;
                    return dbconfig.collection_platform.findOne({
                        _id: playerData.platform
                    });
                } else return Q.reject({message: "incorrect player result"});
            }).then(
                platformData => {
                    if (platformData.useProviderGroup) {
                        return dbconfig.collection_rewardTaskGroup.find({
                            platformId: playerData.platform,
                            playerId: playerData._id,
                            status: {$in: [constRewardTaskStatus.STARTED]}
                        })
                    } else {
                        return Promise.resolve(false);
                    }
                }
            ).then(
                rewardTaskGroup => {
                    if (rewardTaskGroup) {
                        playerData.lockedCredit = rewardTaskGroup.reduce(
                            (a, b) => a + b.rewardAmt, 0
                        )
                    }

                    return dbconfig.collection_playerClientSourceLog.findOne({
                        platformId: playerData.platform,
                        playerName: playerData.name
                    }).lean()
                }
            ).then(
                sourceLogData => {
                    if (sourceLogData) {
                        playerData.sourceUrl = sourceLogData.sourceUrl;
                    }

                    return playerData;
                }
            )
    },
    getOnePlayerCardGroup: function (query) {
        let playerData;

        return dbconfig.collection_players.findOne(query, {similarPlayers: 0})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({
                path: "bankCardGroup",
                model: dbconfig.collection_platformBankCardGroup
            }).populate({
                path: "merchantGroup",
                model: dbconfig.collection_platformMerchantGroup
            }).populate({
                path: "alipayGroup",
                model: dbconfig.collection_platformAlipayGroup
            }).populate({
                path: "wechatPayGroup",
                model: dbconfig.collection_platformWechatPayGroup
            })
            .then(data => {
                if (data) {
                    playerData = data;
                    return dbconfig.collection_platform.findOne({
                        _id: playerData.platform
                    });
                } else return Q.reject({message: "incorrect player result"});
            }).then(
                platformData => {
                    return dbconfig.collection_playerClientSourceLog.findOne({
                        platformId: platformData.platformId,
                        playerName: playerData.name
                    }).lean()
                }
            ).then(
                sourceLogData => {
                    if (sourceLogData) {
                        playerData.sourceUrl = sourceLogData.sourceUrl;
                    }
                    return playerData;
                }
            )

    },
    getPlayerPhoneNumber: function (playerObjId) {
        return dbconfig.collection_players.findOne({_id: playerObjId}).then(
            playerData => {
                if (playerData) {

                    if (playerData.permission && playerData.permission.phoneCallFeedback === false) {
                        Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            message: "Player does not have this permission"
                        });
                    }

                    if (playerData.phoneNumber) {
                        if (playerData.phoneNumber.length > 20) {
                            try {
                                playerData.phoneNumber = rsaCrypto.decrypt(playerData.phoneNumber);
                            }
                            catch (err) {
                                console.log(err);
                            }
                        }
                        return playerData.phoneNumber;
                    } else {
                        return Q.reject({name: "DataError", message: "Can not find phoneNumber"});
                    }
                } else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        );
    },

    /**
     * Get the player level information of the player by query
     * @param {Object} query - Query object
     */
    getPlayerLevel: function (query) {

        var deferred = Q.defer();
        var playerLevelData = null;
        dbconfig.collection_players.findOne(query).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).then(
            function (data) {
                if (data) {
                    playerLevelData = data.playerLevel.toObject();
                    dbconfig.collection_platform.findOne({"_id": data.platform}).then(
                        function (platformData) {

                            playerLevelData.platformId = platformData.platformId;
                            delete playerLevelData.platform;
                            deferred.resolve(playerLevelData);

                        }, function (err) {

                            deferred.reject({
                                name: "DBError",
                                error: err,
                                message: "Error when getting player level Data"
                            });
                        }
                    );

                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find player"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in finding player.", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Search the information of the player by playerId or _id
     * @param {String} query - Query string
     */
    searchPlayerUser: function (playerdata) {
        //suppress the sensitive fields in query response (Projection Fields)
        var limitFields = {};
        limitFields['password'] = 0;
        limitFields['salt'] = 0;
        return dbconfig.collection_players.find(playerdata, limitFields).limit(constSystemParam.MAX_RECORD_NUM)
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).exec();
    },

    /**
     * Update playerInfo by playerId or _id of the playerInfo schema
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerInfo: function (query, updateData) {
        if (updateData) {
            delete updateData.password;
        }
        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, query, updateData, constShardKeys.collection_players);
    },

    updatePlayerPermission: function (query, admin, permission, remark) {
        var updateObj = {};
        for (var key in permission) {
            updateObj["permission." + key] = permission[key];
        }
        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, query, updateObj, constShardKeys.collection_players, false).then(
            function (suc) {
                var oldData = {};
                for (var i in permission) {
                    if (suc.permission[i] != permission[i]) {
                        oldData[i] = suc.permission[i];
                    } else {
                        delete permission[i];
                    }
                }
                // if (Object.keys(oldData).length !== 0) {
                var newLog = new dbconfig.collection_playerPermissionLog({
                    admin: admin,
                    platform: query.platform,
                    player: query._id,
                    remark: remark,
                    oldData: oldData,
                    newData: permission,
                });
                return newLog.save();
                // } else return true;
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error updating player permission.", error: error});
            }
        ).then(
            function (suc) {
                return true;
            },
            function (error) {
                return Q.reject({
                    name: "DBError",
                    message: "Player permission updated. Error occurred when creating log.",
                    error: error
                });
            }
        );
    },

    /**
     * Reset player password
     * @param {String}  playerId - The query string
     * @param {string} newPassword - The update data string
     * @param {objectId} platform - player's platform
     * @param {boolean} resetPartnerPassword - reset partner password also if true
     */
    resetPlayerPassword: function (playerId, newPassword, platform, resetPartnerPassword, dontReturnPassword) {
        let deferred = Q.defer();

        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                deferred.reject({
                    name: "DBError",
                    message: "Error generate salt when updating player password",
                    error: err
                });
                return;
            }
            bcrypt.hash(newPassword, salt, function (err, hash) {
                if (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error generate hash when updating player password.",
                        error: err
                    });
                    return;
                }
                dbUtility.findOneAndUpdateForShard(
                    dbconfig.collection_players,
                    {_id: playerId},
                    {password: hash},
                    constShardKeys.collection_players
                ).then(
                    data => {
                        // update partner password if selected
                        if (resetPartnerPassword) {
                            return dbUtility.findOneAndUpdateForShard(
                                dbconfig.collection_partner,
                                {
                                    platform: platform,
                                    player: playerId
                                },
                                {password: hash},
                                constShardKeys.collection_partner
                            );
                        }
                        deferred.resolve(dontReturnPassword ? "" : newPassword);
                    },
                    error => {
                        deferred.reject({name: "DBError", message: "Error updating player password.", error: error});
                    }
                ).then(
                    data => deferred.resolve(dontReturnPassword ? "" : newPassword),
                    error => deferred.reject({
                        name: "DBError",
                        message: "Error updating partner password.",
                        error: error
                    })
                );
            });
        });

        return deferred.promise;
    },
    /**
     *  Update password
     */
    updatePassword: function (playerId, currPassword, newPassword, smsCode) {
        let db_password = null;
        let playerObj = null;
        if (newPassword.length < constSystemParam.PASSWORD_LENGTH) {
            return Q.reject({name: "DataError", message: "Password is too short"});
        }
        // compare the user entered old password and password from db
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            data => {
                if (data) {
                    playerObj = data;
                    db_password = String(data.password);

                    return dbconfig.collection_platform.findOne({
                        _id: playerObj.platform
                    }).lean();
                } else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find player"
                    });
                }
            }
        ).then(
            platformData => {
                if (platformData) {
                    // Check if platform sms verification is required
                    if (!platformData.requireSMSVerificationForPasswordUpdate) {
                        // SMS verification not required
                        return Q.resolve(true);
                    } else {
                        return dbPlayerMail.verifySMSValidationCode(playerObj.phoneNumber, platformData, smsCode);
                    }
                } else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find platform"
                    });
                }
            }
        ).then(
            isVerified => {
                if (isVerified) {
                    if (dbUtility.isMd5(db_password)) {
                        if (md5(currPassword) == db_password) {
                            return Q.resolve(true);
                        }
                        else {
                            return Q.resolve(false);
                        }
                    }
                    else {
                        let passDefer = Q.defer();
                        bcrypt.compare(String(currPassword), db_password, function (err, isMatch) {
                            if (err) {
                                passDefer.reject({
                                    name: "DataError",
                                    message: "Error in matching password",
                                    error: err
                                });
                            }
                            passDefer.resolve(isMatch);
                        });
                        return passDefer.promise;
                    }
                }
            }
        ).then(
            isMatch => {
                if (isMatch) {
                    let deferred = Q.defer();
                    bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }
                        bcrypt.hash(newPassword, salt, function (err, hash) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            // player.password = hash;
                            // next();
                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: playerObj._id, platform: playerObj.platform}, {password: hash}
                            ).then(
                                deferred.resolve, deferred.reject
                            );
                        });
                    });
                    // playerObj.password = newPassword;
                    // return playerObj.save();
                    return deferred.promise;
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Password do not match",
                        error: "Password do not match"
                    });
                }
            }
        );
    },

    resetPlayerPasswordByPhoneNumber: function (phoneNumber, newPassword, platformId, resetPartnerPassword) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {
                if (platformData) {
                    var encryptedPhoneNumber = rsaCrypto.encrypt(phoneNumber);
                    return dbconfig.collection_players.findOne({
                        platform: platformData._id,
                        phoneNumber: encryptedPhoneNumber
                    }).lean();
                } else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find platform"
                    });
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    return dbPlayerInfo.resetPlayerPassword(playerData._id, newPassword, playerData.platform, resetPartnerPassword, true);
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find player"
                    });
                }
            });
    },

    /**
     * Update player payment info
     * @param userAgent
     * @param {String}  query - The query string
     * @param {Object} updateData - The update data string
     * @param skipSMSVerification
     */
    updatePlayerPayment: function (userAgent, query, updateData, skipSMSVerification, skipProposal) {
        let playerObj = null;
        let platformObjId;
        let smsLogData;
        // Get platform
        return dbconfig.collection_players.findOne(query).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    platformObjId = playerData.platform;
                    //check if bankAccountName in update data is the same as player's real name
                    if (updateData.bankAccountName && updateData.bankAccountName != playerData.realName) {
                        // return Q.reject({
                        //     name: "DataError",
                        //     code: constServerCode.INVALID_DATA,
                        //     message: "Bank account name is different from real name"
                        // });
                        if (updateData.bankAccountName.indexOf('*') > -1)
                            delete updateData.bankAccountName;
                        else
                            updateData.realName = updateData.bankAccountName;
                    }
                    if( !updateData.bankAccountName && !playerData.realName ){
                        return Q.reject({
                            name: "DataError",
                            code: constServerCode.INVALID_DATA,
                            message: "Please enter bank account name or contact cs"
                        });
                    }

                    return dbconfig.collection_platform.findOne({
                        _id: playerData.platform
                    })
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find player"
                    });
                }
            }
        ).then(
            platformData => {
                if (platformData) {
                    // Check if platform sms verification is required
                    if (!platformData.requireSMSVerificationForPaymentUpdate || skipSMSVerification) {
                        // SMS verification not required
                        return Q.resolve(true);
                    } else {
                        return dbPlayerMail.verifySMSValidationCode(playerObj.phoneNumber, platformData, updateData.smsCode);
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find platform"
                    })
                }
            }
        ).then(
            isVerified => {
                if (isVerified) {
                    smsLogData = {tel: isVerified.tel, message: isVerified.code};
                    return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, query, updateData, constShardKeys.collection_players);
                }
            }
        ).then(
            updatedData => {
                let inputDeviceData = dbUtility.getInputDevice(userAgent,false);
                updateData.isPlayerInit = true;
                updateData.playerName = playerObj.name;

                // If user modified their own, no proposal needed
                if (!skipProposal) {
                    dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PLAYER_BANK_INFO, {
                        data: updateData,
                        inputDevice: inputDeviceData
                    }, smsLogData);
                }

                return updatedData;
            }
        )
    },

    updatePlayerPaymentInfoCreateProposal: function (updateData) {
        var proposalData = updateData;
        if (updateData) {
            delete updateData.password;

        }
        return dbconfig.collection_players.findOne({playerId: updateData.playerId}).then(
            data => {
                if (data) {
                    proposalData.playerName = data.name;
                    proposalData._id = data._id;
                    return dbProposal.createProposalWithTypeNameWithProcessInfo(data.platform, constProposalType.UPDATE_PLAYER_BANK_INFO, {data: updateData});
                }
            }).then(result => {
            if (result) {
                return result;
            }
        }, error => {
            return error;
        });
    },

    /**
     * Update player status info and record change rason
     * @param {objectId}  playerObjId
     * @param {String} status
     * @param {String} reason
     */
    updatePlayerStatus: function (playerObjId, status, reason, forbidProviders, adminName) {
        var updateData = {status: status};
        if (forbidProviders) {
            updateData.forbidProviders = forbidProviders;
        }
        var playerProm = dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, {_id: playerObjId}, updateData, constShardKeys.collection_players);
        var newLog = {
            _playerId: playerObjId,
            status: status,
            reason: reason,
            adminName: adminName
        };
        var log = new dbconfig.collection_playerStatusChangeLog(newLog);
        var logProm = log.save();
        return Q.all([playerProm, logProm]);
    },

    updatePlayerForbidProviders: function (playerObjId, forbidProviders) {
        let updateData = {};
        if (forbidProviders) {
            updateData.forbidProviders = forbidProviders;
        }
        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, {_id: playerObjId}, updateData, constShardKeys.collection_players);
    },

    updatePlayerForbidRewardEvents: function (playerObjId, forbidRewardEvents) {
        let updateData = {};
        if (forbidRewardEvents) {
            updateData.forbidRewardEvents = forbidRewardEvents;
        }
        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, {_id: playerObjId}, updateData, constShardKeys.collection_players);
    },

    updatePlayerForbidRewardPointsEvent: function (playerObjId, forbidRewardPointsEvent) {
        let updateData = {};
        if (forbidRewardPointsEvent) {
            updateData.forbidRewardPointsEvent = forbidRewardPointsEvent;
        }
        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, {_id: playerObjId}, updateData, constShardKeys.collection_players);
    },
    /**
     * Delete playerInfo by object _id of the playerInfo schema
     * @param {array}  playerObjIds - The object _ids of the players
     */
    deletePlayers: function (playerObjIds) {
        return dbconfig.collection_players.find({_id: {$in: playerObjIds}}).then(
            playersArr => {
                var proms = [];
                if (playersArr && playersArr.length > 0) {
                    for (var i = 0; i < playersArr.length; i++) {
                        var query = {
                            name: playersArr[i].name,
                            platform: playersArr[i].platform
                        }
                        var delProm = dbconfig.collection_playerName.remove(query);
                        proms.push(delProm);
                    }

                }
                return Q.all(proms);
            }
        ).then(
            data => {
                return dbconfig.collection_players.remove({_id: {$in: playerObjIds}}).exec();

            });
    },

    /**
     * Get Players by objectId of platform schema
     *
     */
    getPlayersByPlatform: function (platformObjId, count) {
        var count = count === 0 ? 0 : (parseInt(count) || constSystemParam.MAX_RECORD_NUM);
        return dbconfig.collection_players.find({"platform": platformObjId}, {similarPlayers: 0}).sort({lastAccessTime: -1}).limit(count)
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().exec();
    },

    getPlayersCountByPlatform: function (platformObjId) {
        return dbconfig.collection_players.find({"platform": platformObjId}).count();
    },

    /**
     * Update player's credit and create log
     * @param {objectId} playerId
     * @param {number} amount
     * @param {string} type
     * @param {objectId} operatorId
     * @param {json} data - details
     */
    updatePlayerCredit: function (playerId, platformId, amount, type, operatorId, data) {
        // note: use constPlayerCreditChangeType for 'type' parameter
        var deferred = Q.defer();
        dbconfig.collection_players.findOneAndUpdate(
            {_id: playerId, platform: platformId},
            {$inc: {validCredit: amount}}
        ).then(
            function (res) {
                if (res) {
                    dbLogger.createCreditChangeLog(playerId, platformId, amount, type, res.validCredit, operatorId, data);
                    deferred.resolve(res);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't update player credit."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player.", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * get player consumption records
     * @param {objectId} playerId
     */
    getPlayerConsumptionRecords: function (query, index, limit, sortCol) {
        var queryObject = {};
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1}
        let bGameSearch = false;
        let gameSearch;

        if (query.gameName) {
            bGameSearch = true;
            gameSearch = dbconfig.collection_game.find({name: new RegExp('.*' + query.gameName + '.*', 'i')}).lean();
        } else {
            gameSearch = false;
        }

        return Promise.all([gameSearch]).then(
            function (data) {
                let games;
                let gamesId = [];
                if (bGameSearch && data && data[0]) {
                    games = data[0];
                    for (let i = 0; i < games.length; i++) {
                        let game = games[i];
                        gamesId.push(game._id);
                    }
                }

                if (query.playerId) {
                    queryObject.playerId = ObjectId(query.playerId);
                }
                if (query.startTime && query.endTime) {
                    queryObject.createTime = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
                }
                if (query.providerId) {
                    queryObject.providerId = ObjectId(query.providerId);
                }
                if (query.dirty != null) {
                    queryObject.bDirty = query.dirty;
                }
                if (bGameSearch) {
                    queryObject.gameId = {
                        $in: gamesId
                    }
                }


                var a = dbconfig.collection_playerConsumptionRecord
                    .find(queryObject).sort(sortCol).skip(index).limit(limit)
                    .populate({
                        path: "gameId",
                        model: dbconfig.collection_game
                    })
                    .populate({
                        path: "providerId",
                        model: dbconfig.collection_gameProvider
                    });
                var b = dbconfig.collection_playerConsumptionRecord.find(queryObject).count();
                var c = dbconfig.collection_playerConsumptionRecord.aggregate({$match: queryObject}, {
                    $group: {
                        _id: false,
                        validAmountSum: {$sum: "$validAmount"},
                        amountSum: {$sum: "$amount"},
                        bonusAmountSum: {$sum: "$bonusAmount"},
                        commissionAmountSum: {$sum: "$commissionAmount"}
                    }
                });
                return Q.all([a, b, c]).then(result => {
                    return {data: result[0], size: result[1], summary: result[2] ? result[2][0] : {}};
                })
            }
        )


    },

    /*
     * get the player top up records
     * @param {objectId} playerId
     */
    getPlayerTopUpRecords: function (query, filterDirty) {
        var queryObject = {};
        if (filterDirty) {
            query.bDirty = false;
        }
        if (query.playerId) {
            queryObject.playerId = query.playerId;
        }
        if (query.startTime && query.endTime) {
            queryObject.createTime = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
        }
        return dbconfig.collection_playerTopUpRecord.find(queryObject).sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    getPagePlayerTopUpRecords: function (query, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1};
        var queryObject = {};
        if (query.playerId) {
            queryObject.playerId = query.playerId;
        }
        if (query.startTime && query.endTime) {
            queryObject.createTime = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
        }
        var a = dbconfig.collection_playerTopUpRecord.find(queryObject).count();
        var b = dbconfig.collection_playerTopUpRecord.find(queryObject).sort(sortCol).skip(index).limit(limit)
        var c = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    playerId: ObjectId(query.playerId),
                    createTime: {
                        $gte: query.startTime,
                        $lt: query.endTime
                    }
                }
            },
            {
                $group: {
                    _id: "$playerId",
                    amountSum: {$sum: "$amount"},
                    validAmountSum: {$sum: "$validAmount"},
                    bonusAmountSum: {$sum: "$bonusAmount"}
                }
            })

        return Q.all([a, b, c]).then(
            data => {
                return {data: data[1], total: data[0], summary: data[2] ? data[2][0] : {}};
            }
        )
    },

    /*
     * get the latest 5 top up record for player
     * @param {objectId} playerId
     */
    getPlayerLast5TopUpRecord: function (playerId) {
        return dbconfig.collection_playerTopUpRecord.find({playerId: playerId}).sort({createTime: -1}).limit(5).exec();
    },

    /*
     * get player's credit change logs
     * @param {objectId} playerId
     */
    getPlayerCreditChangeLogs: function (playerId) {
        return dbconfig.collection_creditChangeLog.find({playerId: playerId}).sort({operationTime: -1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    getPlayerCreditChangeLogsByQuery: function (query, limit) {

        var queryObject = {};
        if (query.startTime && query.endTime) {

            queryObject.operationTime = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
        }
        if (query.playerId) {
            queryObject.playerId = ObjectId(query.playerId);
        }
        if (query.type && query.type != 'none') {
            queryObject.operationType = query.type;
        }
        return dbconfig.collection_creditChangeLog.find(queryObject).sort({operationTime: -1}).limit(limit).exec();
    },

    getPagedPlayerCreditChangeLogs: function (query, startTime, endTime, index, limit, sortCol) {
        var queryObject = {};
        sortCol = sortCol || {operationTime: -1};
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        if (query.playerId) {
            queryObject.playerId = ObjectId(query.playerId);
        }
        if (query.type && query.type != 'none') {
            queryObject.operationType = query.type;
        }
        var time0 = startTime ? new Date(startTime) : new Date(0);
        var time1 = endTime ? new Date(endTime) : new Date();
        queryObject.operationTime = {$gte: time0, $lt: time1};
        var a = dbconfig.collection_creditChangeLog.find(queryObject).count();
        var b = dbconfig.collection_creditChangeLog.find(queryObject).sort(sortCol).skip(index).limit(limit).lean();
        var c = dbconfig.collection_proposal.find({
            "data.playerObjId": ObjectId(query.playerId),
            createTime: {
                $gte: time0,
                $lt: time1
            }
        }).sort({createTime: -1}).lean();
        var totalProm = dbconfig.collection_creditChangeLog.aggregate([
            {
                $match: queryObject,
            },
            {
                $group: {_id: null, totalChange: {$sum: "$amount"}}
            }
        ]);

        var logThatHaveNoProposal = ['TransferIn', 'TransferOut'];
        return Q.all([a, b, c, totalProm]).then(
            data => {
                let creditChangeLogs = data[1];
                let proposals = data[2];
                creditChangeLogs.forEach(
                    (creditChangeLog) => {
                        // If there is not proposal id in result.data and it is not a change that do not have proposal (not consist in logThatHaveNoProposal)
                        if (creditChangeLog && creditChangeLog.data && !creditChangeLog.data.proposalId && !logThatHaveNoProposal.includes(creditChangeLog.operationType)) {
                            let relevantProposal = proposals.filter((proposal) => {
                                // filter out proposal that does not match the request user
                                if (creditChangeLog.operationType === "rejectPlayerBonus") {
                                    return proposal.data.requestId === creditChangeLog.data.requestId
                                        && proposal.mainType === "PlayerBonus"
                                        && (proposal.status === "Rejected" || proposal.status === "Cancel")
                                        && creditChangeLog.operationTime >= proposal.createTime;
                                }
                                else {
                                    return proposal.data.requestId === creditChangeLog.data.requestId
                                        && creditChangeLog.operationTime >= proposal.createTime;
                                }
                            });
                            // get the first relevant proposal as it is most likely the correct proposal
                            creditChangeLog.data.proposalId = relevantProposal[0] ? relevantProposal[0].proposalId : "";
                        }
                    }
                );
                return {total: data[0], data: creditChangeLogs, totalChanged: data[3][0] ? data[3][0].totalChange : 0};
            }
        );
    },

    /*
     * handle player top up action, update player credit and log
     * @param {objectId} playerId
     * @param {number} amount
     * @param {String} paymentChannelName
     */
    playerTopUp: function (playerId, amount, paymentChannelName, topUpType, proposalData) {
        var deferred = Q.defer();
        let playerData;
        let useProviderGroup = false;

        dbUtility.findOneAndUpdateForShard(
            dbconfig.collection_players,
            {_id: playerId},
            {
                $inc: {
                    validCredit: amount,
                    topUpSum: amount,
                    dailyTopUpSum: amount,
                    weeklyTopUpSum: amount,
                    pastMonthTopUpSum: amount,
                    topUpTimes: 1,
                    creditBalance: amount
                }
            },
            constShardKeys.collection_players
        ).then(data => {
                if(data){
                    if(data.platform){
                        return dbconfig.collection_platform.findOne({_id: data.platform}).then(
                            platformData => {
                                if(platformData && platformData.useProviderGroup){
                                    useProviderGroup = platformData.useProviderGroup;

                                }

                                return data;
                            }
                        )
                    }
                }
            }
        ).then(
            function (data) {
                if (data) {
                    playerData = data;

                    var recordData = {
                        playerId: data._id,
                        platformId: data.platform,
                        amount: amount,
                        topUpType: topUpType,
                        createTime: proposalData ? proposalData.createTime : new Date(),
                        bDirty: false
                    };
                    var logData = null;
                    if (proposalData && proposalData.data) {
                        if (topUpType == constPlayerTopUpType.MANUAL) {
                            recordData.bankCardType = proposalData.data.bankCardType;
                            recordData.depositMethod = proposalData.data.depositMethod;
                        }
                        else if (topUpType == constPlayerTopUpType.ONLINE) {
                            recordData.merchantTopUpType = proposalData.data.topupType;
                        }
                        logData = proposalData.data;
                        recordData.proposalId = proposalData.proposalId;
                        recordData.userAgent = proposalData.data.userAgent;
                    }
                    var newRecord = new dbconfig.collection_playerTopUpRecord(recordData);
                    var recordProm = newRecord.save();
                    var type = "";
                    switch (topUpType) {
                        case constPlayerTopUpType.ONLINE:
                            type = constPlayerCreditChangeType.TOP_UP;
                            break;
                        case constPlayerTopUpType.MANUAL:
                            type = constPlayerCreditChangeType.MANUAL_TOP_UP;
                            break;
                        case constPlayerTopUpType.ALIPAY:
                            type = constPlayerCreditChangeType.ALIPAY_TOP_UP;
                            break;
                        case constPlayerTopUpType.WECHAT:
                            type = constPlayerCreditChangeType.WECHAT_TOP_UP;
                            break;
                        case constPlayerTopUpType.QUICKPAY:
                            type = constPlayerCreditChangeType.QUICKPAY_TOP_UP;
                            break;
                        default:
                            type = constPlayerCreditChangeType.TOP_UP;
                            break;
                    }
                    var logProm = dbLogger.createCreditChangeLog(playerId, data.platform, amount, type, data.validCredit, null, logData);
                    var levelProm = dbPlayerInfo.checkPlayerLevelUp(playerId, data.platform);
                    let promArr;

                    if (useProviderGroup) {
                        var freeAmountRewardTaskGroupProm = dbPlayerInfo.checkFreeAmountRewardTaskGroup(playerId, data.platform, amount);
                        promArr = [recordProm, logProm, levelProm, freeAmountRewardTaskGroupProm];
                    } else {
                        promArr = [recordProm, logProm, levelProm];
                    }

                    // Check any limited offer matched
                    checkLimitedOfferToApply(proposalData);

                    //no need to check player reward task status now.
                    //var rewardTaskProm = dbRewardTask.checkPlayerRewardTaskStatus(playerId);
                    return Q.all(promArr);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't update player credit."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player.", error: error});
            }
        ).then(
            function (data) {
                if (data && data[0]) {
                    let topupRecordData = data[0];
                    topupRecordData.topUpRecordId = topupRecordData._id;
                    // Async - Check reward group task to apply on player top up
                    dbPlayerReward.checkAvailableRewardGroupTaskToApply(playerData.platform, playerData, topupRecordData).catch(errorUtils.reportError);
                    dbConsumptionReturnWithdraw.clearXimaWithdraw(playerData._id).catch(errorUtils.reportError);
                    deferred.resolve(data && data[0]);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating top up record", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * TODO::for internal testing only, to be removed
     * handle player purchase action, update consumption amount and add record
     * @param {objectId} playerId
     * @param {objectId} gameId
     * @param {String} gameType
     * @param {number} amount
     */
    playerPurchase: function (playerId, gameId, gameType, amount) {
        var deferred = Q.defer();
        var platformId = null;
        dbconfig.collection_players.findOne({_id: playerId}).then(
            function (data) {
                if (data) {
                    //todo::check player's current credit balance here
                    platformId = data.platform;
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: playerId, platform: platformId},
                        {$inc: {consumptionSum: amount, validCredit: -amount}},
                        {new: true}
                    ).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find player."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player.", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    dbLogger.createCreditChangeLog(playerId, platformId, amount, constPlayerCreditChangeType.PURCHASE, data.validCredit);
                    var recordData = {
                        playerId: playerId,
                        platformId: platformId,
                        gameId: gameId,
                        gameType: gameType,
                        orderNo: new Date().getTime() + Math.random(),
                        amount: amount
                    };
                    return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(recordData);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't update player credit."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error updating player credit.", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject(error);
            }
        );

        return deferred.promise;
    },

    /*
     * check if player is valid for first top up reward
     * @param {objectId} playerId
     * @param {Boolean} checkConsumption
     */
    isValidForFirstTopUpReward: function (playerId, platformId, checkConsumption) {
        let deferred = Q.defer();
        let rewardEventData = null;
        let proposalType;
        let playerData = null;
        //todo::add check for player's gift redeem record
        //should check player platform first time top up event here???
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.FIRST_TOP_UP).then(
            function (eventData) {
                rewardEventData = eventData;
                if (eventData) {

                    proposalType = eventData.executeProposal;
                    return dbconfig.collection_players.findOne({_id: playerId})
                        .populate({
                            path: "platform",
                            model: dbconfig.collection_platform
                        }).lean();
                }
                else {
                    deferred.reject({
                        name: "NoRewardEvent",
                        message: "Player's platform doesn't have this reward event!"
                    });
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward event", error: error});
            }
        ).then(
            // check proposal by playerId, platformId and
            // rewardTask status(isUnlock) by playerId, type, platormId
            function (data) {
                playerData = data;
                // TODO  - proposal status check below
                return dbconfig.collection_proposal.find({
                    "data.platformId": data.platform._id,
                    "data.playerId": data.playerId,
                    "data.periodType": '0',
                    type: proposalType,
                    status: {
                        $in: [constProposalStatus.PENDING, constProposalStatus.SUCCESS,
                            constProposalStatus.APPROVED, constProposalStatus.REJECTED]
                    }
                }).lean();

            }, function (error) {
                deferred.reject({name: "DataError", message: "Can't find player data", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    deferred.reject({
                        name: "DataError",
                        message: "Not Valid for the reward."
                    });
                    return true;

                } else {
                    if (!playerData.platform.canMultiReward && playerData.platform.useLockedCredit) {
                        return dbRewardTask.getPlayerCurRewardTask(playerData._id);
                    }
                    else {
                        return false;
                    }
                }

            }, function (error) {
                deferred.reject({
                    name: "DataError",
                    message: "The player has not unlocked the previous reward task. Not valid for new reward",
                    error: error
                });
            }
        ).then(
            function (rewardTaskData) {

                if (rewardTaskData) {
                    deferred.reject({
                        name: "DataError",
                        message: "The player has not unlocked the previous reward task. Not valid for new reward"
                    });
                    return true;
                }
                else {
                    if (playerData && playerData._id && playerData.registrationTime) {
                        //check if player has been rewarded for first top up
                        if (playerData.bFirstTopUpReward) {
                            deferred.reject({
                                name: "RegistrationTimeTooRecent",
                                message: "Player has been rewarded for first time top up event!"
                            });
                            return;
                        }
                        //check player's registration time
                        var now = new Date().getTime();
                        var difference = playerData.registrationTime.getTime() - now;
                        var days = Math.floor(difference / (1000 * 60 * 60 * 24 * 7));
                        if (days <= 0) {
                            if (checkConsumption) {
                                return dbconfig.collection_playerConsumptionRecord.find({playerId: playerData._id}).exec();
                            }
                            else {
                                deferred.resolve(true);
                            }
                        }
                        else {
                            deferred.reject({
                                name: "RegistrationTimeTooRecent",
                                message: "Player hasn't been registered for more than a week!"
                            });
                        }
                    }
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player data", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //return player has consumption record
                    deferred.resolve({ConsumptionRecord: true});
                }
                else {
                    //return player doesn't have consumption record
                    deferred.resolve({ConsumptionRecord: false});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player consumption record", error: error});
            }
        );
        return deferred.promise;
    },

    /*
     * player apply for first top up reward
     * @param {objectId} playerId
     */
    isPlayerIdValidForFirstTopUpReward: function (playerId) {
        var deferred = Q.defer();
        dbPlayerInfo.getPlayerInfo({playerId: playerId}).then(
            function (playerData) {
                //get player's platform reward event data
                if (playerData) {
                    return dbPlayerInfo.isValidForFirstTopUpReward(playerData._id, playerData.platform, true);
                }
                else {
                    deferred.reject({name: "DataError", message: "Player is not found"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject(error);
            }
        );
        return deferred.promise;
    },

    /*
     * player apply for first top up reward
     * @param {ObjectId} playerObjId
     * @param {String} playerId
     * @param {ObjectId} topUpRecordId
     * @param {Boolean} checkConsumption
     */
    applyForFirstTopUpRewardProposal: function (userAgent, playerObjId, playerId, topUpRecordIds, code, ifAdmin) {
        let deferred = Q.defer();
        let platformId = null;
        let player = {};
        let records = [];
        let recordAmount = 0;
        let eventData = {};
        let playerLvlData;
        let deductionAmount = 0;
        let bDoneDeduction = false;
        let adminInfo = ifAdmin;
        let startTime = dbUtility.getCurrentWeekSGTime().startTime;
        let endTime = dbUtility.getCurrentWeekSGTime().endTime;
        let firstRecordId = null;

        let query = playerObjId ? {_id: playerObjId} : {playerId: playerId};
        let recordProm = dbconfig.collection_playerTopUpRecord.find({_id: {$in: topUpRecordIds}});
        let playerProm = dbconfig.collection_players.findOne(query).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean();

        Q.all([playerProm, recordProm]).then(
            data => {
                player = data[0];
                records = data[1];

                //get player's platform reward event data
                platformId = player.platform;
                return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.FIRST_TOP_UP, code);
            }
        ).then(
            eData => {
                eventData = eData;
                let queryFirstOfWeek = {playerId: player._id};
                if (eventData.param.periodType == 1) {
                    queryFirstOfWeek = {playerId: player._id, createTime: {$gte: startTime, $lt: endTime}};
                }
                return dbconfig.collection_playerTopUpRecord.find(queryFirstOfWeek).sort({createTime: 1}).limit(1).lean();
            }
        ).then(
            firstRecordData => {
                if (firstRecordData && firstRecordData[0]) {
                    firstRecordId = String(firstRecordData[0]._id);
                }
                if (firstRecordId && topUpRecordIds.indexOf(firstRecordId) < 0) {
                    deferred.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Top up record is not the first top up record"
                    });
                    return;
                }
                //check all top up records
                let bValid = true;
                if (records.length > 0) {
                    records.forEach(
                        rec => {
                            if (!rec.bDirty && String(rec.playerId) == String(player._id)) {
                                recordAmount += rec.amount;
                            }
                            else {
                                bValid = false;
                            }
                        }
                    );
                }
                if (!bValid) {
                    deferred.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Some top up records have been used"
                    });
                    return;
                }

            },
            function (error) {
                deferred.reject({
                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                    name: "DBError",
                    message: "Error in getting player data",
                    error: error
                });
            }
        ).then(
            function (data) {
                //get player data
                if (eventData) {
                    if (eventData.param.periodType == 0) {
                        return dbPlayerInfo.isValidForFirstTopUpReward(player._id, platformId);
                    } else if (eventData.param.periodType == 1 || eventData.param.periodType == 2) {
                        return dbPlayerInfo.isValidForFirstTopUpRewardPeriod(player, eventData.param);
                    } else {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "Unhandled reward period data."
                        })
                    }
                } else {
                    deferred.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find first top up event data for platform"
                    });
                }
            },
            function (error) {
                deferred.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "Cannot find first top up event data for platform"
                });
            }
        ).then(
            function (bValid) {
                if (!bValid) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "NotValid",
                        message: "Player is not valid for first top up reward"
                    });
                }

                if (!rewardUtility.isValidRewardEvent(constRewardType.FIRST_TOP_UP, eventData)) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "NotValid",
                        message: "Player is not valid for first top up reward"
                    });
                }

                playerLvlData = eventData.param.reward[player.playerLevel.value];
                if (!playerLvlData) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        "message": "Missing player level data."
                    })
                }

                if (recordAmount < playerLvlData.minTopUpAmount) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Topup amount is less than minimum topup requirement"
                    });
                }

                // All conditions have been satisfied.
                deductionAmount = recordAmount;
                //if not use locked amount, no need to deduct credit from player
                if (player.platform && player.platform.useLockedCredit) {
                    return dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform._id, deductionAmount, "applyFirstTopUpReward:Deduction", records);
                }
                else {
                    return false;
                }
            }
        ).then(
            function (bDeduct) {
                bDoneDeduction = bDeduct;
                var rewardAmount = Math.min((recordAmount * playerLvlData.rewardPercentage), playerLvlData.maxRewardAmount);
                var proposalData = {
                    type: eventData.executeProposal,
                    creator: adminInfo ? adminInfo :
                        {
                            type: 'player',
                            name: player.name,
                            id: playerId
                        },
                    data: {
                        playerObjId: player._id,
                        playerId: player.playerId,
                        playerName: player.name,
                        platformId: platformId,
                        periodType: eventData.param.periodType,
                        topUpRecordIds: topUpRecordIds,
                        topUpProposalId: records[0].proposalId,
                        applyAmount: deductionAmount,
                        rewardAmount: rewardAmount,
                        providers: eventData.param.providers,
                        targetEnable: eventData.param.targetEnable,
                        games: eventData.param.games,
                        spendingAmount: Math.floor((rewardAmount + recordAmount) * playerLvlData.spendingTimes),
                        minTopUpAmount: eventData.param.minTopUpAmount,
                        eventId: eventData._id,
                        eventName: eventData.name,
                        eventCode: eventData.code,
                        eventDescription: eventData.description,
                        useLockedCredit: Boolean(player.platform.useLockedCredit)
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS,
                };
                proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                var proms = records.map(rec =>
                    dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                        {_id: rec._id, createTime: rec.createTime, bDirty: {$ne: true}},
                        {bDirty: true, usedType: constRewardType.FIRST_TOP_UP, $push: {usedEvent: eventData._id}},
                        {new: true}
                    )
                );
                return Q.all(proms).then(
                    data => {
                        var bValid = true;
                        if (data && data.length > 0) {
                            data.forEach(
                                nRec => {
                                    if (!nRec || !nRec.bDirty) {
                                        bValid = false;
                                    }
                                }
                            );
                        }
                        if (bValid) {
                            return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
                                data => data,
                                error => {
                                    //clean top up record if create proposal failed
                                    errorUtils.reportError({
                                        name: "DBError",
                                        message: "Create first top up proposal failed",
                                        data: proposalData,
                                        error: error,
                                    });
                                    var proms = [];
                                    records.forEach(
                                        rec => {
                                            proms.push(dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                                                {_id: rec._id, createTime: rec.createTime}, {bDirty: false}
                                            ));
                                        }
                                    );
                                    return Q.all(proms).catch(errorUtils.reportError).then(
                                        () => Q.reject(error)
                                    );
                                }
                            );
                        }
                        else {
                            deferred.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "This top up record has been used"
                            });
                        }
                    }
                );
            }
        ).then(
            function (proposal) {
                deferred.resolve(proposal);
            },
            function (error) {
                if (error && error.message) {
                    deferred.reject(error);
                }
                else {
                    deferred.reject({
                        name: "DBError",
                        message: "Error creating player first top up proposal",
                        error: error
                    });
                }
            }
        );

        return deferred.promise.catch(
            error => Q.resolve().then(
                () => bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, constPlayerCreditChangeType.APPLY_FIRST_TOP_UP_REWARD_REFUND, error)
            ).then(
                () => Q.reject(error)
            )
        );
    },

    isValidForFirstTopUpRewardPeriod: function (playerData, rewardData) {
        var query = {
            platformId: playerData.platform,
            name: constProposalType.FIRST_TOP_UP
        };
        var startDate = dbUtility.getTodaySGTime().startTime;
        if (rewardData.periodType == 1) {
            startDate = dbUtility.getCurrentWeekSGTime().startTime;
        } else if (rewardData.periodType == 2) {
            startDate = dbUtility.getCurrentMonthSGTIme().startTime;
        } else {
            return Q.reject({name: 'DataError', message: 'Invalid reward period'})
        }
        var deferred = Q.defer();
        dbRewardTask.getRewardTask(
            {
                playerId: playerData._id,
                status: constRewardTaskStatus.STARTED,
                useLockedCredit: true
            }
        ).then(
            rewardTask => {
                if (rewardTask) {
                    return deferred.resolve(false)
                }
                else {
                    return dbProposalType.getProposalType(query);
                }
            },
            error => deferred.reject(error)
        ).then(
            pType => {
                if (pType) {
                    return dbProposal.getProposal({
                        type: pType._id,
                        createTime: {
                            $gte: startDate
                        },
                        "data.periodType": rewardData.periodType,
                        "data.playerObjId": playerData._id,
                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS, constProposalStatus.REJECTED]}
                    });
                } else {
                    return deferred.resolve(false);
                }
            },
            error => deferred.reject(error)
        ).then(
            pData => {
                deferred.resolve(!pData);
            },
            error => deferred.reject(error)
        );
        return deferred.promise;
    },

    /*
     * api function for player to apply for provider reward event
     * @param {objectId} playerId
     * @param {objectId} eventId
     * @param {number} amount
     */
    applyForGameProviderRewardAPI: function (userAgent, playerId, code, amount, ifAdmin) {
        var proposalData = {};
        var deferred = Q.defer();
        var adminInfo = ifAdmin;
        //check if playerId and eventId is valid
        dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).then(
            playerData => {
                if (playerData) {
                    let taskProm;
                    let playerProm = Q.resolve(playerData);
                    let eventProm = dbconfig.collection_rewardEvent.findOne({
                        code: code,
                        platform: playerData.platform._id
                    }).populate({
                        path: "type",
                        model: dbconfig.collection_rewardType
                    });

                    if (!playerData.platform.canMultiReward) {
                        taskProm = dbRewardTask.getRewardTask(
                            {
                                playerId: playerData._id,
                                status: constRewardTaskStatus.STARTED,
                                useLockedCredit: true
                            }
                        );
                    }
                    else {
                        taskProm = Q.resolve(false);
                    }

                    return Q.all([playerProm, eventProm, taskProm]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1] && !data[2]) {
                    let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(data[0], data[1]._id);
                    if (playerIsForbiddenForThisReward) {
                        deferred.reject({name: "DataError", message: "Player is forbidden for this reward."});
                    }

                    if (String(data[0].platform._id) == String(data[1].platform)
                        && data[1].type.name == constRewardType.GAME_PROVIDER_REWARD
                        && data[0].validCredit > 0
                        && amount > 0
                        && amount <= data[0].validCredit
                        && rewardUtility.isValidRewardEvent(constRewardType.GAME_PROVIDER_REWARD, data[1]
                        )) {
                        proposalData = {
                            type: data[1].executeProposal,
                            creator: adminInfo ? adminInfo :
                                {
                                    type: 'player',
                                    name: data[0].name,
                                    id: playerId
                                },
                            data: {
                                playerObjId: data[0]._id,
                                playerId: data[0].playerId,
                                playerName: data[0].name,
                                applyAmount: amount,
                                rewardAmount: data[1].param.rewardPercentage * amount,
                                spendingAmount: Math.floor(data[1].param.spendingPercentage * amount),
                                provider: data[1].param.provider,
                                platformId: data[0].platform._id,
                                games: data[1].param.games,
                                eventId: data[1]._id,
                                eventName: data[1].name,
                                eventCode: data[1].code,
                                eventDescription: data[1].description
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
                        proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                        var proposalProm = dbProposal.createProposalWithTypeId(data[1].executeProposal, proposalData);
                        var playerProm = dbconfig.collection_players.findOneAndUpdate(
                            {_id: data[0]._id, platform: data[0].platform._id},
                            {$inc: {validCredit: -amount}},
                            {new: true}
                        );
                        return Q.all([proposalProm, playerProm]);
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Invalid input data"});
                    }
                }
                else {
                    if (data[2]) {
                        deferred.reject({
                            status: constServerCode.PLAYER_HAS_REWARD_TASK,
                            name: "DataError",
                            message: "The player has not unlocked the previous reward task. Not valid for new reward"
                        });
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Cannot get player and reward data"});
                    }
                }
            },
            function (error) {
                deferred.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DBError",
                    message: "Error getting platform reward data",
                    error: error
                });
            }
        ).then(
            function (data) {
                dbLogger.createCreditChangeLog(data[1]._id, data[1].platform, -amount, constRewardType.GAME_PROVIDER_REWARD, data[1].validCredit, null, proposalData.data);
                deferred.resolve(data[0]);
            }, function (error) {
                deferred.reject({name: "DBError", message: "Error creating proposal", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * player apply for provider reward event
     * @param {objectId} playerId
     * @param {objectId} eventId
     * @param {Number} amount
     */
    applyForGameProviderReward: function (platformId, playerId, amount) {
        var deferred = Q.defer();
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.GAME_PROVIDER_REWARD).then(
            function (data) {
                if (data) {
                    var proposalData = {
                        type: data.executeProposal,
                        data: {
                            playerId: playerId,
                            rewardAmount: data.param.rewardAmount,
                            eventDescription: data.description
                        }
                    };
                    dbProposal.createProposalWithTypeId(data.executeProposal, proposalData).then(
                        function (data) {
                            deferred.resolve(data);
                        }, function (error) {
                            deferred.reject({name: "DBError", message: "Error creating proposal", error: error});
                        });
                }
                else {
                    deferred.reject({name: "DataError", message: "Platform doesn't have this reward event"});
                }
            }, function (error) {
                deferred.reject({name: "DBError", message: "Error getting platform reward data", error: error});
            }
        );
        return deferred.promise;
    },

    /*
     * search players by platformId with advanced query
     * @param-data {Json} can include  one or more of the following fields
     */
    applyForPlatformTransactionReward: function (platformId, playerId, topupAmount, playerLevel, bankCardType) {

        // DEBUG: Reward sometime not applied issue
        console.log('applyForPlatformTransactionReward', playerId);

        let deferred = Q.defer();
        let todayTime = dbUtility.getTodaySGTime();
        let curRewardAmount = 0;
        let rewardTypeName = constProposalType.PLATFORM_TRANSACTION_REWARD;
        let proposalProm = dbconfig.collection_proposalType.findOne({
            platformId: platformId,
            name: rewardTypeName
        }).lean().then(
            proposalType => {
                return dbconfig.collection_proposal.aggregate(
                    {
                        $match: {
                            type: proposalType._id,
                            "data.playerId": playerId,
                            status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                            createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                        }
                    },
                    {
                        $group: {
                            _id: "$type",
                            totalAmount: {$sum: "$data.rewardAmount"}
                        }
                    }
                );
            }
        );
        let eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, rewardTypeName);
        let playerLevelProm = dbconfig.collection_playerLevel.findOne({_id: playerLevel}).lean();
        let playerProm = dbconfig.collection_players.findOne({playerId: playerId}).lean();
        let playerLevelData = {};
        let rewardParams = [];
        let playerData = {};
        Q.all([eventProm, proposalProm, playerLevelProm, playerProm]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2] && data[3]) {
                    let rewardEvents = data[0];
                    if (data[3].permission && data[3].permission.banReward) {
                        deferred.resolve("No permission!");
                    }
                    if (data[1] && data[1][0]) {
                        curRewardAmount = data[1][0].totalAmount;
                    }
                    var eventLevelProm = [];
                    rewardParams = data[0];
                    playerLevelData = data[2];
                    playerData = data[3];
                    for (var i = 0; i < rewardEvents.length; i++) {
                        // skip promotion from this event if it is forbidden
                        if (dbPlayerReward.isRewardEventForbidden(data[3], rewardEvents[i]._id)) continue;

                        var temp = dbconfig.collection_playerLevel.findOne({_id: rewardEvents[i].param.playerLevel});
                        eventLevelProm.push(temp);
                    }
                    return Q.all(eventLevelProm);
                }
                else {
                    deferred.resolve("No reward event!");
                }
            }, function (error) {
                deferred.resolve({
                    name: 'DBError',
                    message: "Error during applyForPlatformTransactionReward (early)",
                    error: error
                });
            }
        ).then(
            function (levels) {
                if (levels) { // && levels[0].value >= levels[1].value) {
                    let levelProm = [];
                    for (var i = 0; i < levels.length; i++) {
                        if (playerLevelData.value >= levels[i].value && rewardParams[i].param && curRewardAmount < rewardParams[i].param.maxRewardAmountPerDay
                        // && (!rewardParams[i].param.bankCardType || (rewardParams[i].param.bankCardType && rewardParams[i].param.bankCardType.length > 0 && rewardParams[i].param.bankCardType.indexOf(bankCardType) >= 0))
                        ) {
                            let rewardAmount = Math.min((rewardParams[i].param.maxRewardAmountPerDay - curRewardAmount), rewardParams[i].param.rewardPercentage * topupAmount);
                            let proposalData = {
                                type: rewardParams[i].executeProposal,
                                data: {
                                    playerId: playerId,
                                    playerObjId: playerData._id,
                                    platformId: platformId,
                                    playerName: playerData.name,
                                    rewardAmount: rewardAmount,
                                    eventDescription: rewardParams[i].description,
                                    curRewardAmount: curRewardAmount,
                                    maxRewardAmountPerDay: rewardParams[i].param.maxRewardAmountPerDay,
                                    spendingAmount: rewardAmount*20, //10 times spending amount
                                    eventName: rewardParams[i].name,
                                    eventCode: rewardParams[i].code,
                                }
                            };

                            // DEBUG: Reward sometime not applied issue
                            console.log('applyForPlatformTransactionReward - Before Create Proposal', rewardAmount);

                            let temp = dbProposal.createProposalWithTypeId(rewardParams[i].executeProposal, proposalData);
                            levelProm.push(temp);
                        }
                    }
                    return Q.all(levelProm);
                } else {
                    deferred.resolve(true);
                }
            }, function (err) {
                deferred.reject({name: "DBError", message: "Cannot find player level data.", error: err})
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            }, function (err) {
                deferred.reject({
                    name: "DBError",
                    message: "Error during applyForPlatformTransactionReward (later)",
                    error: err
                });
            }
        );
        return deferred.promise;
    },

    /*
     * search players by platformId with advanced query
     * @param-data {Json} can include  one or more of the following fields
     *  { playerId ,trustLevel, isTestPlayer, isRealPlayer, email,phoneNumber,lastAccessTime, gameCredit }
     */
    getPlayerByAdvanceQuery: function (platformId, data) {
        // if (data && data.phoneNumber) {
        //     data.phoneNumber = rsaCrypto.encrypt(data.phoneNumber);
        // }
        return dbconfig.collection_players.find({
            platform: platformId,
            $and: [data]
        }, {similarPlayers: 0}).limit(constSystemParam.MAX_RECORD_NUM).sort({lastAccessTime: -1}).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).populate({
            path: "bankCardGroup",
            model: dbconfig.collection_platformBankCardGroup
        }).populate({
            path: "merchantGroup",
            model: dbconfig.collection_platformMerchantGroup
        }).populate({
            path: "alipayGroup",
            model: dbconfig.collection_platformAlipayGroup
        }).lean().exec();
    },

    getPaymentPlayerByAdvanceQuery: function (platformId, data, index, limit, sortObj) {
        var resultData = {};
        return dbPlayerInfo.getPagePlayerByAdvanceQuery(platformId, data, index, limit, sortObj).then(
            data => {
                resultData = data;
                var proms = [];
                data.data.map(eachPlayer => {//data.data always valid as returned from 'getPagePlayerByAdvanceQuery'
                    proms.push(dbconfig.collection_players
                        .findOne({_id: eachPlayer._id}).populate({
                            path: "playerLevel",
                            model: dbconfig.collection_playerLevel
                        }).populate({
                            path: "bankCardGroup",
                            model: dbconfig.collection_platformBankCardGroup
                        }).populate({
                            path: "merchantGroup",
                            model: dbconfig.collection_platformMerchantGroup
                        }).populate({
                            path: "alipayGroup",
                            model: dbconfig.collection_platformAlipayGroup
                        }).populate({
                            path: "wechatPayGroup",
                            model: dbconfig.collection_platformWechatPayGroup
                        }).populate({
                            path: "quickPayGroup",
                            model: dbconfig.collection_platformQuickPayGroup
                        }).lean())
                })
                return Q.all(proms).then(newPlayer => {
                    resultData.data = newPlayer;
                    return resultData;
                })
            },
            err => {
                return {error: err};
            })
    },
    getPagePlayerByAdvanceQuery: function (platformId, data, index, limit, sortObj) {
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortObj = sortObj || {registrationTime: -1};

        let advancedQuery = {};
        let isProviderGroup = false;

        //todo encrytion ?
        if (data && data.phoneNumber) {
            data.phoneNumber = {$in: [rsaCrypto.encrypt(data.phoneNumber), data.phoneNumber]};
        }

        function getRewardData(thisPlayer) {
            return dbconfig.collection_rewardTask.find({
                playerId: thisPlayer._id,
                status: constRewardTaskStatus.STARTED,
                useLockedCredit: true
            }).then(
                rewardData => {
                    thisPlayer.rewardInfo = rewardData;
                    return thisPlayer;
                });
        }

        function getRewardGroupData(thisPlayer) {
            return dbconfig.collection_rewardTaskGroup.find({
                platformId: thisPlayer.platform,
                playerId: thisPlayer._id,
                status: {$in: [constRewardTaskStatus.STARTED]}
            }).then(
                rewardGroupData => {
                    thisPlayer.rewardGroupInfo = rewardGroupData;
                    thisPlayer.lockedCredit = rewardGroupData.reduce(
                        (arr, inc) => arr + inc.rewardAmt, 0
                    );
                    return thisPlayer;
                }
            )
        }

        if (data.bankAccount) {
            advancedQuery.bankAccount = new RegExp('.*' + data.bankAccount + '.*', 'i');
        }

        if (data.email) {
            let tempEmail = data.email;
            delete data.email;
            advancedQuery = {
                platform: platformId,
                $and: [
                    data,
                    {$or: [{email: tempEmail}, {qq: tempEmail}]}
                ]
            }
        } else {
            advancedQuery = {
                platform: platformId,
                $and: [data]
            }
        }

        return dbconfig.collection_platform.findOne({
            _id: platformId
        }).lean().then(
            platform => {
                isProviderGroup = Boolean(platform.useProviderGroup);

                return dbconfig.collection_players
                    .find(advancedQuery, {similarPlayers: 0})
                    .sort(sortObj).skip(index).limit(limit).lean().then(
                        players => {
                            let calculatePlayerValueProms = [];
                            for (let i = 0; i < players.length; i++) {
                                let calculateProm = dbPlayerCredibility.calculatePlayerValue(players[i]._id);
                                calculatePlayerValueProms.push(calculateProm);
                            }
                            return Promise.all(calculatePlayerValueProms);

                        }
                    )
            }
        ).then(
            () => {
                var a = dbconfig.collection_players
                    .find(advancedQuery, {similarPlayers: 0})
                    .sort(sortObj).skip(index).limit(limit)
                    .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
                    .populate({path: "partner", model: dbconfig.collection_partner})
                    .populate({path: "referral", model: dbconfig.collection_players, select: 'name'})
                    .populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints, select: 'points'})
                    .lean().then(
                        playerData => {
                            var players = [];
                            for (var ind in playerData) {
                                if (playerData[ind]) {
                                    let newInfo;

                                    if (playerData[ind].referral) {
                                        playerData[ind].referralName$ = playerData[ind].referral.name;
                                        playerData[ind].referral = playerData[ind].referral._id;
                                    }

                                    if (playerData[ind].rewardPointsObjId) {
                                        playerData[ind].point$ = playerData[ind].rewardPointsObjId.points;
                                        playerData[ind].rewardPointsObjId = playerData[ind].rewardPointsObjId._id;
                                    }

                                    if (isProviderGroup) {
                                        newInfo = getRewardGroupData(playerData[ind]);
                                    } else {
                                        newInfo = getRewardData(playerData[ind]);
                                    }

                                    players.push(Q.resolve(newInfo));
                                }
                            }
                            return Q.all(players)
                        }
                    );
                var b = dbconfig.collection_players
                    .find({platform: platformId, $and: [data]}).count();
                return Q.all([a, b]);
            }
        ).then(
            data => {
                return {data: data[0], size: data[1]}
            },
            err => {
                return {error: err};
            }
        );
    },

    getPagePlayerByAdvanceQueryWithTopupTimes: function (platformId, data, index, limit, sortObj) {
        var playerLoginData = {};
        var retData = {};
        return dbPlayerInfo.getPagePlayerByAdvanceQuery(platformId, data, index, limit, sortObj).then(
            data => {
                retData = data;
                var topupProm = [];
                data.data.map(item => {
                    function getData(thisPlayer) {
                        return dbconfig.collection_playerLoginRecord.find({
                            platform: platformId,
                            player: thisPlayer
                        }).count().then(logData => {
                            var id = thisPlayer.toString();
                            playerLoginData[id] = logData;
                            return true;
                        });
                    }

                    var a = getData(item._id)
                    topupProm.push(Q.resolve(a));
                })
                return Q.all(topupProm).then(
                    data => {
                        retData.data.map(item => {
                            var id = (item._id).toString();
                            item.loginTimes = playerLoginData[id];
                            return item;
                        })
                        return retData;
                    }
                )
            }
        )
    },

    /*
     * check the player password is matched against the password in DB using bcrypt
     *  @param include name and password of the player
     */
    playerPasswordCheck: function (playerData) {
        var deferred = Q.defer();
        var db_password = null;

        dbconfig.collection_players.findOne({name: playerData.name}).then(
            function (data) {
                db_password = String(data.password); // hashedPassword from db
                bcrypt.compare(String(playerData.password), db_password, function (err, isMatch) {
                    if (err) {
                        deferred.reject({name: "DataError", message: "Error in matching password", error: err});
                    }
                    deferred.resolve(isMatch);
                });
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error getting player", error: error});
            }
        );
        return deferred.promise;
    },

    /*
     * check the player exists and check password is matched against the password in DB using bcrypt
     *  @param include name and password of the player and some more additional info to log the player's login
     */
    playerLogin: function (playerData, userAgent, inputDevice) {
        let deferred = Q.defer();
        let db_password = null;
        let newAgentArray = [];
        let platformId = null;
        let uaObj = null;
        let playerObj = null;
        let retObj = {};
        let platformPrefix = "";
        let requireLogInCaptcha = null;
        let platformObj = {};
        dbconfig.collection_platform.findOne({platformId: playerData.platformId}).then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;
                    requireLogInCaptcha = platformData.requireLogInCaptcha || false;
                    platformId = platformData._id;
                    platformPrefix = platformData.prefix;
                    playerData.prefixName = platformData.prefix + playerData.name;

                    return dbconfig.collection_players.findOne(
                        {
                            $or: [
                                {
                                    name: playerData.prefixName.toLowerCase(),
                                    platform: platformData._id
                                },
                                {
                                    phoneNumber: playerData.name,
                                    platform: platformData._id
                                }
                            ]
                        }).lean();
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot find platform"});
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error in getting player platform data", error: error});
            }
        ).then(
            data => {
                if (data) {
                    playerObj = data;
                    if (platformObj.onlyNewCanLogin && !playerObj.isNewSystem) {
                        deferred.reject({
                            name: "DataError",
                            message: "Only new system user can login",
                            code: constServerCode.NO_USER_FOUND
                        });
                        return;
                    }
                    db_password = String(data.password); // hashedPassword from db
                    if (dbUtility.isMd5(db_password)) {
                        if (md5(playerData.password) == db_password) {
                            return Q.resolve(true);
                        }
                        else {
                            return Q.resolve(false);
                        }
                    }
                    else {
                        var passDefer = Q.defer();
                        bcrypt.compare(String(playerData.password), db_password, function (err, isMatch) {
                            if (err) {
                                passDefer.reject({
                                    name: "DataError",
                                    message: "Error in matching password",
                                    error: err
                                });
                            }
                            passDefer.resolve(isMatch);
                        });
                        return passDefer.promise;
                    }
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Cannot find player",
                        code: constServerCode.PLAYER_NAME_INVALID
                    });
                }
            }
        ).then(
            isMatch => {
                if (isMatch) {
                    if (playerObj.permission.forbidPlayerFromLogin) {
                        deferred.reject({
                            name: "DataError",
                            message: "Player is not enable",
                            code: constServerCode.PLAYER_IS_FORBIDDEN
                        });
                        return;
                    }
                    newAgentArray = playerObj.userAgent || [];
                    uaObj = {
                        browser: userAgent.browser.name || '',
                        device: userAgent.device.name || '',
                        os: userAgent.os.name || '',
                    };
                    var bExit = false;
                    if(newAgentArray && typeof newAgentArray.forEach == "function" ){
                        newAgentArray.forEach(
                            agent => {
                                if (agent.browser == uaObj.browser && agent.device == uaObj.device && agent.os == uaObj.os) {
                                    bExit = true;
                                }
                            }
                        );
                    }
                    else{
                        newAgentArray = [];
                        bExit = true;
                    }
                    if (!bExit) {
                        newAgentArray.push(uaObj);
                    }
                    var bUpdateIp = false;
                    if (playerData.lastLoginIp && playerData.lastLoginIp != playerObj.lastLoginIp && playerData.lastLoginIp != "undefined") {
                        bUpdateIp = true;
                    }

                    var updateSimilarIpPlayer = false;
                    if (playerData.lastLoginIp && !playerObj.loginIps.includes(playerData.lastLoginIp)) {
                        updateSimilarIpPlayer = true;
                    }

                    // Revert due to IP DB not ready

                    var geo = geoip.lookup(playerData.lastLoginIp);
                    var updateData = {
                        isLogin: true,
                        lastLoginIp: playerData.lastLoginIp,
                        userAgent: newAgentArray,
                        lastAccessTime: new Date().getTime(),
                        $inc: {loginTimes: 1}
                    };
                    var geoInfo = {};
                    if (geo && geo.ll && !(geo.ll[1] == 0 && geo.ll[0] == 0)) {
                        geoInfo = {
                            country: geo ? geo.country : null,
                            city: geo ? geo.city : null,
                            longitude: geo && geo.ll ? geo.ll[1] : null,
                            latitude: geo && geo.ll ? geo.ll[0] : null
                        }
                    }
                    Object.assign(updateData, geoInfo);
                    if (playerData.lastLoginIp && !playerObj.loginIps.includes(playerData.lastLoginIp)) {
                        updateData.$push = {loginIps: playerData.lastLoginIp};
                    }
                    dbconfig.collection_players.findOneAndUpdate({
                        _id: playerObj._id,
                        platform: playerObj.platform
                    }, updateData).populate({
                        path: "playerLevel",
                        model: dbconfig.collection_playerLevel
                    }).then(
                        data => {
                            //add player login record
                            var recordData = {
                                player: data._id,
                                platform: platformId,
                                loginIP: playerData.lastLoginIp,
                                clientDomain: playerData.clientDomain ? playerData.clientDomain : "",
                                userAgent: uaObj
                            };

                            if (platformObj.usePointSystem) {
                                dbRewardPoints.updateLoginRewardPointProgress(playerObj, null, inputDevice).catch(errorUtils.reportError);
                            }

                            Object.assign(recordData, geoInfo);
                            var record = new dbconfig.collection_playerLoginRecord(recordData);
                            return record.save().then(
                                function () {
                                    if (bUpdateIp) {
                                        dbPlayerInfo.updateGeoipws(data._id, platformId, playerData.lastLoginIp);
                                    }

                                    if (updateSimilarIpPlayer) {
                                        // dbPlayerInfo.findAndUpdateSimilarPlayerInfoByField(data, 'lastLoginIp', playerData.lastLoginIp);
                                    }
                                }
                            ).then(
                                () => {
                                    dbconfig.collection_players.findOne({_id: playerObj._id}).populate({
                                        path: "playerLevel",
                                        model: dbconfig.collection_playerLevel
                                    }).lean().then(
                                        res => {
                                            res.name = res.name.replace(platformPrefix, "");
                                            retObj = res;
                                            var a = retObj.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: retObj.bankAccountProvince}) : true;
                                            var b = retObj.bankAccountCity ? pmsAPI.foundation_getCity({cityId: retObj.bankAccountCity}) : true;
                                            var c = retObj.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: retObj.bankAccountDistrict}) : true;
                                            var creditProm = dbPlayerInfo.getPlayerCredit(retObj.playerId);
                                            return Q.all([a, b, c, creditProm]);
                                        }
                                    ).then(
                                        zoneData => {
                                            retObj.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : retObj.bankAccountProvince;
                                            retObj.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : retObj.bankAccountCity;
                                            retObj.bankAccountDistrict = zoneData[2].district ? zoneData[2].district.name : retObj.bankAccountDistrict;
                                            retObj.pendingRewardAmount = zoneData[3] ? zoneData[3].pendingRewardAmount : 0;
                                            retObj.platform.requireLogInCaptcha = requireLogInCaptcha;
                                            deferred.resolve(retObj);
                                        },
                                        errorZone => {
                                            deferred.resolve(retObj);
                                        }
                                    );
                                }
                            );
                        },
                        error => {
                            deferred.reject({
                                name: "DBError",
                                message: "Error in updating player",
                                error: error
                            });
                        }
                    );

                    // // ip location lookup
                    // let updateData = {
                    //     isLogin: true,
                    //     lastLoginIp: playerData.lastLoginIp,
                    //     userAgent: newAgentArray,
                    //     lastAccessTime: new Date().getTime(),
                    // };
                    //
                    // dbGeoIp.lookup(playerData.lastLoginIp).then(
                    //     (locData) => {
                    //         let geoInfo = {};
                    //
                    //         if (locData) {
                    //             geoInfo = {
                    //                 continent: locData.continent,
                    //                 country: locData.country,
                    //                 province: locData.province,
                    //                 city: locData.city,
                    //                 district: locData.district,
                    //                 isp: locData.isp,
                    //                 areaCode: locData.area_code,
                    //                 longitude: locData.longitude,
                    //                 latitude: locData.latitude
                    //             }
                    //         }
                    //
                    //         Object.assign(updateData, geoInfo);
                    //         if (playerData.lastLoginIp && playerData.lastLoginIp != playerObj.lastLoginIp) {
                    //             updateData.$push = {loginIps: playerData.lastLoginIp};
                    //         }
                    //
                    //         return geoInfo;
                    //     }
                    // ).then(
                    //     (geoInfo) => {
                    //         dbconfig.collection_players.findOneAndUpdate({
                    //             _id: playerObj._id,
                    //             platform: playerObj.platform
                    //         }, updateData).populate({
                    //             path: "playerLevel",
                    //             model: dbconfig.collection_playerLevel
                    //         }).then(
                    //             data => {
                    //                 //add player login record
                    //                 var recordData = {
                    //                     player: data._id,
                    //                     platform: platformId,
                    //                     loginIP: playerData.lastLoginIp,
                    //                     clientDomain: playerData.clientDomain ? playerData.clientDomain : "",
                    //                     userAgent: uaObj
                    //                 };
                    //                 Object.assign(recordData, geoInfo);
                    //                 var record = new dbconfig.collection_playerLoginRecord(recordData);
                    //                 return record.save().then(
                    //                     function () {
                    //                         if (bUpdateIp) {
                    //                             return dbPlayerInfo.updateGeoipws(data._id, platformId, playerData.lastLoginIp);
                    //                         }
                    //                     }
                    //                 ).catch(errorUtils.reportError).then(
                    //                     () => {
                    //                         dbconfig.collection_players.findOne({_id: playerObj._id}).populate({
                    //                             path: "playerLevel",
                    //                             model: dbconfig.collection_playerLevel
                    //                         }).lean().then(
                    //                             res => {
                    //                                 res.name = res.name.replace(platformPrefix, "");
                    //                                 retObj = res;
                    //                                 var a = retObj.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: retObj.bankAccountProvince}) : true;
                    //                                 var b = retObj.bankAccountCity ? pmsAPI.foundation_getCity({cityId: retObj.bankAccountCity}) : true;
                    //                                 var c = retObj.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: retObj.bankAccountDistrict}) : true;
                    //                                 var creditProm = dbPlayerInfo.getPlayerCredit(retObj.playerId);
                    //                                 return Q.all([a, b, c, creditProm]);
                    //                             }
                    //                         ).then(
                    //                             zoneData => {
                    //                                 retObj.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : retObj.bankAccountProvince;
                    //                                 retObj.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : retObj.bankAccountCity;
                    //                                 retObj.bankAccountDistrict = zoneData[2].district ? zoneData[2].district.name : retObj.bankAccountDistrict;
                    //                                 retObj.pendingRewardAmount = zoneData[3] ? zoneData[3].pendingRewardAmount : 0;
                    //                                 deferred.resolve(retObj);
                    //                             }, errorZone => {
                    //                                 deferred.resolve(retObj);
                    //                             });
                    //                     }
                    //                 );
                    //             },
                    //             error => {
                    //                 deferred.reject({
                    //                     name: "DBError",
                    //                     message: "Error in updating player",
                    //                     error: error
                    //                 });
                    //             }
                    //         );
                    //     });


                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "User name and password don't match",
                        code: constServerCode.INVALID_USER_PASSWORD
                    });
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
        return deferred.promise;
    },

    playerLoginWithSMS: function (loginData, userAgent, isSMSVerified) {
        let deferred = Q.defer();
        let newAgentArray = [];
        let platformId = null;
        let uaObj = null;
        let playerObj = null;
        let retObj = {};
        let platformPrefix = "";

        dbconfig.collection_platform.findOne({platformId: loginData.platformId}).then(
            platformData => {
                if (platformData) {
                    platformId = platformData._id;
                    let encryptedPhoneNumber = rsaCrypto.encrypt(loginData.phoneNumber);

                    return dbconfig.collection_players.findOne(
                        {
                            $or: [
                                {phoneNumber: encryptedPhoneNumber},
                                {phoneNumber: loginData.phoneNumber}
                            ],
                            platform: platformData._id
                        }
                    ).lean();
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot find platform"});
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error in getting player platform data", error: error});
            }
        ).then(
            data => {
                if (data) {
                    playerObj = data;

                    if (playerObj.permission.forbidPlayerFromLogin) {
                        deferred.reject({
                            name: "DataError",
                            message: "Player is not enable",
                            code: constServerCode.PLAYER_IS_FORBIDDEN
                        });
                        return;
                    }
                    newAgentArray = playerObj.userAgent || [];
                    uaObj = {
                        browser: userAgent.browser.name || '',
                        device: userAgent.device.name || '',
                        os: userAgent.os.name || '',
                    };
                    let bExit = false;
                    if(newAgentArray && typeof newAgentArray.forEach == "function" ){
                        newAgentArray.forEach(
                            agent => {
                                if (agent.browser == uaObj.browser && agent.device == uaObj.device && agent.os == uaObj.os) {
                                    bExit = true;
                                }
                            }
                        );
                    }
                    else{
                        newAgentArray = [];
                        bExit = true;
                    }

                    if (!bExit) {
                        newAgentArray.push(uaObj);
                    }

                    let bUpdateIp = false;
                    if (loginData.lastLoginIp && loginData.lastLoginIp != playerObj.lastLoginIp) {
                        bUpdateIp = true;
                    }

                    let geo = geoip.lookup(loginData.lastLoginIp);
                    let updateData = {
                        isLogin: true,
                        lastLoginIp: loginData.lastLoginIp,
                        userAgent: newAgentArray,
                        lastAccessTime: new Date().getTime(),
                    };
                    let geoInfo = {};
                    if (geo && geo.ll && !(geo.ll[1] == 0 && geo.ll[0] == 0)) {
                        geoInfo = {
                            country: geo ? geo.country : null,
                            city: geo ? geo.city : null,
                            longitude: geo && geo.ll ? geo.ll[1] : null,
                            latitude: geo && geo.ll ? geo.ll[0] : null
                        }
                    }
                    Object.assign(updateData, geoInfo);
                    if (loginData.lastLoginIp && loginData.lastLoginIp != playerObj.lastLoginIp) {
                        updateData.$push = {loginIps: loginData.lastLoginIp};
                    }
                    dbconfig.collection_players.findOneAndUpdate({
                        _id: playerObj._id,
                        platform: playerObj.platform
                    }, updateData).populate({
                        path: "playerLevel",
                        model: dbconfig.collection_playerLevel
                    }).then(
                        data => {
                            //add player login record
                            let recordData = {
                                player: data._id,
                                platform: platformId,
                                loginIP: loginData.lastLoginIp,
                                clientDomain: loginData.clientDomain ? loginData.clientDomain : "",
                                userAgent: uaObj
                            };
                            Object.assign(recordData, geoInfo);
                            let record = new dbconfig.collection_playerLoginRecord(recordData);
                            return record.save().then(
                                function () {
                                    if (bUpdateIp) {
                                        dbPlayerInfo.updateGeoipws(data._id, platformId, playerData.lastLoginIp);
                                    }
                                }
                            ).then(
                                () => {
                                    dbconfig.collection_players.findOne({_id: playerObj._id}).populate({
                                        path: "playerLevel",
                                        model: dbconfig.collection_playerLevel
                                    }).lean().then(
                                        res => {
                                            res.name = res.name.replace(platformPrefix, "");
                                            retObj = res;
                                            let a = retObj.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: retObj.bankAccountProvince}) : true;
                                            let b = retObj.bankAccountCity ? pmsAPI.foundation_getCity({cityId: retObj.bankAccountCity}) : true;
                                            let c = retObj.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: retObj.bankAccountDistrict}) : true;
                                            let creditProm = dbPlayerInfo.getPlayerCredit(retObj.playerId);

                                            return Q.all([a, b, c, creditProm]);
                                        }
                                    ).then(
                                        zoneData => {
                                            retObj.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : retObj.bankAccountProvince;
                                            retObj.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : retObj.bankAccountCity;
                                            retObj.bankAccountDistrict = zoneData[2].district ? zoneData[2].district.name : retObj.bankAccountDistrict;
                                            retObj.pendingRewardAmount = zoneData[3] ? zoneData[3].pendingRewardAmount : 0;
                                            deferred.resolve(retObj);
                                        },
                                        errorZone => {
                                            deferred.resolve(retObj);
                                        }
                                    );
                                }
                            );
                        },
                        error => {
                            deferred.reject({
                                name: "DBError",
                                message: "Error in updating player",
                                error: error
                            });
                        }
                    );
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Cannot find player",
                        code: constServerCode.INVALID_USER_PASSWORD
                    });
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
        return deferred.promise;
    },

    updateGeoipws: function (playerObjId, platformObjId, ip) {
        dbUtility.getGeoIp(ip).then(
            data => {
                if (data) {
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: playerObjId, platform: platformObjId},
                        data
                    ).then();
                }
            }
        ).catch(errorUtils.reportError);
    },

    /*
     * player user Logout
     *  @param include name  of the player and some more additional info to log the player's logout
     *  TODO - may add more fields to update the playerInfo
     */
    playerLogout: function (playerData) {
        let time_now = new Date().getTime();
        let updateData = {isLogin: false, lastAccessTime: time_now};

        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, {playerId: playerData.playerId}, updateData, constShardKeys.collection_players);
    },

    /**
     * check if player has login
     * @param {String} playerId
     */
    isLogin: function (playerId) {
        var deferred = Q.defer();

        dbconfig.collection_players.findOne({playerId: playerId}).then(
            function (data) {
                if (data) {
                    deferred.resolve(data.isLogin);
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Cannot find player",
                        code: constServerCode.INVALID_USER_PASSWORD
                    });
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * get the recent active players
     * @param {} - playerId The total no of players to be returned
     */
    getActivePlayers: function (noOfPlayers, platform) {
        var deferred = Q.defer();
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        dbconfig.collection_players.find({
                platform: platform,
                lastAccessTime: {$gte: startTime}
            }, {similarPlayers: 0}
        ).limit(noOfPlayers).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player", error: error});
            }
        );
        return deferred.promise;
    },

    getLoggedInPlayers: function (noOfPlayers, name, platform) {
        platform = Array.isArray(platform) ? platform : [platform];
        noOfPlayers = noOfPlayers || 20;
        var query = {
            platform: {
                $in: platform
            },
            isLogin: true
        };
        if (name) {
            query.name = {$regex: ".*" + name + ".*"}
        }
        return dbconfig.collection_players
            .find(query, {similarPlayers: 0})
            .limit(noOfPlayers)
    },

    getLoggedInPlayersCount: function (platform) {
        platform = Array.isArray(platform) ? platform : [platform];
        return dbconfig.collection_players.find(
            {
                platform: {
                    $in: platform
                },
                isLogin: true
            }
        ).count();
    },

    getPlayerPermissionLog: function (platform, id, createTime) {
        var query = {
            platform: platform,
            player: id
        }
        if (createTime) {
            query.createTime = createTime;
        }
        return dbconfig.collection_playerPermissionLog.find(query).populate({
            path: "admin",
            model: dbconfig.collection_admin
        })
    },

    getPlayerReferrals: function (platform, playerObjId, index, limit, sortObj) {
        var sortObj = sortObj || {registrationTime: -1};
        var a = dbconfig.collection_players.find({platform: platform, referral: playerObjId}).count();
        var b = dbconfig.collection_players.find({platform: platform, referral: playerObjId}, {similarPlayers: 0})
            .sort(sortObj).skip(index).limit(limit).lean()
        return Q.all([a, b]).then(
            players => {
                return {data: players[1], size: players[0]}
            }
        );
    },

    /**
     * get the total count of currently active player in a platform
     */
    getCurrentActivePlayersCount: function (platform) {
        var deferred = Q.defer();

        var currentTime = new Date().toISOString();
        dbconfig.collection_players.find({
            lastAccessTime: currentTime,
            platform: platform
        }).count().then(
            function (data) {
                deferred.resolve(data);

            }, function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * get the player credit balance
     */
    getCreditBalance: function (query) {
        var deferred = Q.defer();
        dbconfig.collection_players.findOne(query).then(
            function (data) {
                if (data) {
                    deferred.resolve(data.creditBalance);
                }
                else {
                    deferred.resolve(0);
                }
            }, function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
        return deferred.promise;
    },

    getPlayerPendingProposalByType: function (playerObjId, platformObjId, type) {
        return dbconfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: type
        }).lean().then(
            typeData => {
                if (typeData) {
                    return dbconfig.collection_proposal.find({
                        type: typeData._id,
                        "data.playerObjId": String(playerObjId)
                    }).populate({path: "process", model: dbconfig.collection_proposalProcess}).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        ).then(
            proposals => {
                if (proposals && proposals.length > 0) {
                    var bExist = false;
                    proposals.forEach(
                        proposal => {
                            if (proposal.status == constProposalStatus.PENDING || (proposal.process && proposal.process.status == constProposalStatus.PENDING)) {
                                bExist = true;
                            }
                        }
                    );
                    return bExist;
                }
                else {
                    return false;
                }
            }
        );
    },

    /**
     * Transfer credit from platform to game provider
     * 1. Check where is the player's credit
     *
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount
     * @param adminName
     * @param forSync
     */
    transferPlayerCreditToProvider: function (playerId, platform, providerId, amount, adminName, forSync) {
        let deferred = Q.defer();
        let prom0 = forSync
            ? dbconfig.collection_players.findOne({name: playerId})
                .populate({path: "platform", model: dbconfig.collection_platform})
            : dbconfig.collection_players.findOne({playerId: playerId})
                .populate({path: "platform", model: dbconfig.collection_platform});
        let prom1 = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        let playerData, providerData, rewardTaskGroupData;
        let transferAmount = 0;

        Q.all([prom0, prom1]).then(
            data => {
                if (data && data[0] && data[1]) {
                    playerData = data[0];
                    providerData = data[1];

                    return dbRewardTaskGroup.getPlayerRewardTaskGroup(playerData.platform._id, providerData._id, playerData._id, new Date());
                } else {
                    deferred.reject({name: "DataError", message: "Cannot find player or provider"});
                }
            },
            err => {
                deferred.reject({
                    name: "DataError",
                    message: "Failed to retrieve player or provider" + err.message,
                    error: err
                })
            }
        ).then(
            rewardTaskGroup => {
                rewardTaskGroupData = rewardTaskGroup;

                transferAmount += parseFloat(playerData.validCredit.toFixed(2));

                if (playerData.platform.useLockedCredit) {
                    transferAmount += playerData.lockedCredit;
                }

                if (playerData.platform.useProviderGroup && rewardTaskGroupData && rewardTaskGroupData.rewardAmt) {
                    transferAmount += rewardTaskGroupData.rewardAmt;
                }

                if(providerData && providerData.status != constProviderStatus.NORMAL){
                    deferred.reject({
                        status: constServerCode.CP_NOT_AVAILABLE,
                        name: "DataError",
                        errorMessage: "Game is not available on platform"
                    });
                    return;
                }

                // Check if player has enough credit to play
                if (transferAmount < 1 || amount == 0) {
                    deferred.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "DataError",
                        errorMessage: "Player does not have enough credit."
                    });
                    return;
                }

                // Enough credit to proceed
                let platformId = playerData.platform ? playerData.platform.platformId : null;
                // First log before processing
                dbLogger.createPlayerCreditTransferStatusLog(playerData._id, playerData.playerId, playerData.name, playerData.platform._id, platformId, "transferIn",
                    "unknown", providerId, playerData.validCredit + playerData.lockedCredit, playerData.lockedCredit, adminName, null, constPlayerCreditTransferStatus.REQUEST);

                if (playerData.platform.useProviderGroup) {
                    // Platform supporting provider group
                    return dbPlayerCreditTransfer.playerCreditTransferToProviderWithProviderGroup(
                        playerData._id, playerData.platform._id, providerData._id, amount, providerId, playerData.name, playerData.platform.platformId, adminName, providerData.name, forSync);
                } else if (playerData.platform.canMultiReward) {
                    // Platform supporting multiple rewards will use new function first
                    return dbPlayerCreditTransfer.playerCreditTransferToProvider(playerData._id, playerData.platform._id, providerData._id, amount, providerId, playerData.name, playerData.platform.platformId, adminName, providerData.name, forSync);
                } else {
                    return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(playerData._id, playerData.platform._id, providerData._id, amount, providerId, playerData.name, playerData.platform.platformId, adminName, providerData.name, forSync);
                }
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (err) {
                if (!err || !err.hasLog) {
                    let platformId = playerData.platform ? playerData.platform.platformId : null;
                    let platformObjId = playerData.platform ? playerData.platform._id : null;
                    // Second log - failed processing before calling cpmsAPI
                    dbLogger.createPlayerCreditTransferStatusLog(playerData._id, playerData.playerId, playerData.name, platformObjId, platformId, "transferIn",
                        "unknown", providerId, playerData.validCredit + playerData.lockedCredit, playerData.lockedCredit, adminName, err, constPlayerCreditTransferStatus.FAIL);
                }
                deferred.reject(err);
            }
        );
        return deferred.promise;
    },

    /**
     * TODO:: (DEPRECATING) Changing to dbPlayerCreditTransfer.playerCreditTransferToProvider
     * Transfer credit to game provider
     * @param playerObjId
     * @param {objectId} platform
     * @param {objectId} providerId
     * @param {Number} amount
     * @param providerShortId
     * @param userName
     * @param platformId
     * @param adminName
     * @param cpName
     * @param forSync
     */
    transferPlayerCreditToProviderbyPlayerObjId: function (playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync) {
        let deferred = Q.defer();
        let gameAmount = 0;
        let rewardAmount = 0;
        let providerAmount = 0;
        let playerCredit = 0;
        let rewardTaskAmount = 0;
        let rewardDataObj = null;
        let playerData = null;
        let notEnoughtCredit = false;
        let rewardData = null;
        let bUpdateReward = false;
        let transferAmount = 0;
        let bTransfered = false;
        let transferId = new Date().getTime();
        let changedLockCredit = 0;

        return dbconfig.collection_players.findOne({_id: playerObjId}).populate({
            path: "lastPlayedProvider",
            model: dbconfig.collection_gameProvider
        }).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            function (playerData1) {
                if (playerData1) {
                    playerData = playerData1;
                    // Check player have enough credit
                    if ((parseFloat(playerData1.validCredit.toFixed(2)) + playerData1.lockedCredit) < 1
                        || amount == 0) {
                        deferred.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "NumError",
                            errorMessage: "Player does not have enough credit."
                        });
                        notEnoughtCredit = true;
                        return;
                    }
                    // Check player current reward task
                    let rewardProm = null;
                    if (playerData.platform && playerData.platform.useLockedCredit) {
                        rewardProm = dbRewardTask.getPlayerCurRewardTask(playerObjId);
                    }
                    let gameCreditProm = {};
                    if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.status == constGameStatus.ENABLE) {
                        gameCreditProm = cpmsAPI.player_queryCredit(
                            {
                                username: userName,
                                platformId: platformId,
                                providerId: playerData.lastPlayedProvider.providerId
                            }
                        ).then(
                            data => data,
                            error => {
                                return {credit: 0};
                            }
                        );
                    }
                    return Q.all([rewardProm, gameCreditProm]);
                } else {
                    return Q.reject({name: "DataError", message: "Can't find player information."});
                }
            },
            function (err) {
                return Q.reject({name: "DataError", message: "Can't find player information.", error: err});
            }
        ).then(
            function (taskData) {
                rewardData = taskData[0];
                let gameCredit = (taskData[1] && taskData[1].credit) ? parseFloat(taskData[1].credit) : 0;
                if (!notEnoughtCredit) {
                    // Player has enough credit
                    //if amount is less than 0, means transfer all
                    amount = amount > 0 ? amount : parseFloat(playerData.validCredit.toFixed(2));
                    if (!rewardData) {
                        amount = Math.floor(amount);
                        // Player has no reward ongoing
                        gameAmount = amount;
                        rewardData = true;
                        //return true;
                    }
                    else {
                        // Player has ongoing reward
                        rewardDataObj = rewardData;
                        if ((!rewardData.targetProviders || rewardData.targetProviders.length <= 0 ) // target all providers
                            || (rewardData.targetEnable && rewardData.targetProviders.indexOf(providerId) >= 0)//target this provider
                            || (!rewardData.targetEnable && rewardData.targetProviders.indexOf(providerId) < 0)//banded provider
                        ) {
                            if (rewardData.inProvider == true) {//already in provider
                                // if (String(playerData.lastPlayedProvider) != String(providerId)) {
                                //     return Q.reject({name: "DataError", message: "Player is playing a different game"});
                                // }
                                if (rewardData.requiredBonusAmount > 0) {
                                    amount = 0;
                                    gameAmount = amount;
                                }
                                else {
                                    amount = Math.floor(amount);
                                    gameAmount = amount;
                                    rewardData._inputCredit += (amount + gameCredit);
                                    bUpdateReward = true;
                                }
                            } else {
                                //not in provider yet
                                //for player registration reward task
                                if (rewardData.requiredBonusAmount > 0) {
                                    amount = 0;
                                    gameAmount = Math.floor(rewardData.currentAmount);
                                    rewardAmount = Math.floor(rewardData.currentAmount);
                                    rewardTaskAmount = rewardData.currentAmount - gameAmount;
                                    rewardData.currentAmount = rewardTaskAmount;
                                    rewardData.inProvider = true;
                                }
                                else {
                                    //process floating point
                                    gameAmount = Math.floor(amount + rewardData.currentAmount);
                                    var remainingAmount = amount + rewardData.currentAmount - gameAmount;
                                    if (remainingAmount > playerData.validCredit) {
                                        amount = 0;
                                        rewardAmount = Math.floor(rewardData.currentAmount || 0);
                                    }
                                    else {
                                        amount = gameAmount - rewardData.currentAmount;
                                        rewardAmount = rewardData.currentAmount
                                    }
                                    rewardTaskAmount = rewardData.currentAmount - rewardAmount;
                                    rewardData.inProvider = true;
                                    rewardData._inputCredit = amount + gameCredit;
                                    rewardData.currentAmount = rewardTaskAmount;
                                }
                                bUpdateReward = true;
                            }
                        } else {
                            // not this provider
                            amount = Math.floor(amount);
                            gameAmount = amount;
                        }
                    }

                    //return (rewardData);
                    transferAmount = gameAmount;
                    if (transferAmount < 1) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "NumError",
                            errorMessage: "Player does not have enough credit."
                        });
                    }

                    // Deduct amount from player validCredit before transfer
                    // Amount is already floored
                    // let decreaseAmount = amount < playerData.validCredit ? amount : playerData.validCredit;
                    changedLockCredit = transferAmount - amount;
                    let updateObj = {
                        lastPlayedProvider: providerId,
                        $inc: {validCredit: -amount, lockedCredit: -changedLockCredit}
                    };
                    // if (bUpdateReward) {
                    //     updateObj.lockedCredit = rewardData.currentAmount;
                    // }
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: playerObjId, platform: platform},
                        updateObj,
                        {new: true}
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "NumError",
                        errorMessage: "Player does not have enough credit."
                    });
                }
            },
            function (err) {
                return Q.reject({name: "DBError", message: "Cant find player current reward.", error: err});
            }
        ).then(
            //check if player's credit is enough to transfer
            // to prevent concurrent deduction
            function (updateData) {
                if (updateData) {

                    if (updateData.validCredit < -0.02 || updateData.lockedCredit < -0.02) {
                        //reset player credit to 0
                        return dbconfig.collection_players.findOneAndUpdate(
                            {_id: playerObjId, platform: platform},
                            {$inc: {validCredit: amount, lockedCredit: changedLockCredit}},
                            {new: true}
                        ).catch(errorUtils.reportError).then(
                            () => Q.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "NumError",
                                errorMessage: "Player does not have enough credit."
                            })
                        );
                    }

                    playerCredit = updateData.validCredit;
                    //fix float number problem after update
                    if ((updateData.validCredit > -0.02 && updateData.validCredit < 0) || (updateData.lockedCredit > -0.02 && updateData.lockedCredit < 0)) {
                        let uObj = {};
                        if (updateData.validCredit > -0.02 && updateData.validCredit < 0) {
                            playerCredit = 0;
                            uObj.validCredit = 0;
                        }
                        if (updateData.lockedCredit > -0.02 && updateData.lockedCredit < 0) {
                            uObj.lockedCredit = 0;
                        }
                        return dbconfig.collection_players.findOneAndUpdate(
                            {_id: playerObjId, platform: platform},
                            uObj,
                            {new: true}
                        );
                    }
                    else {
                        return true;
                    }

                }
                else {
                    return Q.reject({name: "DataError", message: "Cant update player credit."});
                }
            }
        ).then(
            function (data) {
                if (data) {
                    bTransfered = true;
                    if (forSync) {
                        return true;
                    }
                    return counterManager.incrementAndGetCounter("transferId").then(
                        function (id) {
                            transferId = id;
                            let lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                            // Second log before call cpmsAPI
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform, platformId, "transferIn",
                                id, providerShortId, transferAmount, lockedAmount, adminName, null, constPlayerCreditTransferStatus.SEND);
                            return cpmsAPI.player_transferIn(
                                {
                                    username: userName,
                                    platformId: platformId,
                                    providerId: providerShortId,
                                    transferId: id, //chance.integer({min: 1000000000000000000, max: 9999999999999999999}),
                                    credit: transferAmount
                                }
                            ).then(
                                res => res,
                                error => {
                                    // var lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                                    let status = (error && error.errorMessage && error.errorMessage.indexOf('Request timeout') > -1) ? constPlayerCreditTransferStatus.TIMEOUT : constPlayerCreditTransferStatus.FAIL;
                                    // Third log - transfer in failed
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform, platformId, "transferIn",
                                        id, providerShortId, transferAmount, lockedAmount, adminName, error, status);
                                    error.hasLog = true;
                                    return Q.reject(error);
                                }
                            );
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "NumError",
                        errorMessage: "Player does not have enough credit."
                    });
                }
            }
        ).then(
            function (data) {
                if (data) {
                    if (bUpdateReward) {
                        return dbRewardTask.updateRewardTask(
                            {
                                _id: rewardData._id,
                                platformId: rewardData.platformId
                            }, {
                                inProvider: rewardData.inProvider,
                                _inputCredit: rewardData._inputCredit,
                                currentAmount: rewardData.currentAmount
                            }
                        );
                    }
                    else {
                        return (rewardData);
                    }
                }
            }, function (err) {
                return Q.resolve().then(
                    function () {
                        //change player credit back if transfer failed
                        if (bTransfered) {
                            console.error(err);
                            if (err && err.errorMessage && err.errorMessage.indexOf('Request timeout') > -1) {
                            } else {
                                return dbconfig.collection_players.findOneAndUpdate(
                                    {_id: playerObjId, platform: platform},
                                    {$inc: {validCredit: amount}, lockedAmount: rewardAmount},
                                    {new: true}
                                );
                            }
                        }
                    }
                ).catch(errorUtils.reportError).then(
                    () => Q.reject(err)
                );
            }
        ).then(
            function (res) {
                if (res) {
                    //playerCredit = res.validCredit;
                    // Log credit change when transfer success
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -amount, constPlayerCreditChangeType.TRANSFER_IN, playerCredit, 0, -rewardAmount, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });

                    // Logging Transfer Success
                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform,
                        platformId, constPlayerCreditChangeType.TRANSFER_IN, transferId, providerShortId, transferAmount, rewardAmount, adminName, res, constPlayerCreditTransferStatus.SUCCESS);

                    return {
                        playerId: playerData.playerId,
                        providerId: providerShortId,
                        providerCredit: parseFloat(gameAmount + providerAmount).toFixed(2),
                        playerCredit: parseFloat(playerCredit).toFixed(2),
                        rewardCredit: parseFloat(rewardTaskAmount).toFixed(2),
                        transferCredit: {
                            playerCredit: parseFloat(gameAmount - rewardAmount).toFixed(2),
                            rewardCredit: parseFloat(rewardAmount).toFixed(2)
                        }
                    };
                }
                else {
                    return Q.reject({name: "DataError", message: "Error transfer player credit to provider."});
                }
            }
        );
    },

    /*
     * Transfer credit from game provider
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount
     */
    transferPlayerCreditFromProvider: function (playerId, platform, providerId, amount, adminName, bResolve, maxReward, forSync, isBatch) {
        isBatch = isBatch === true;
        let updateBatchStatus = function (isBatch) {    //uses platform parameter to pass in platformObjId
            if(isBatch) {
                let incrementObj = {};
                if(playerObj) {
                    incrementObj["batchCreditTransferOutStatus." + playerObj.platform._id + ".processedAmount"] = 1;
                } else {
                    incrementObj["batchCreditTransferOutStatus." + platform + ".processedAmount"] = 1;
                }
                if(gameProvider) {
                    dbconfig.collection_gameProvider.findOneAndUpdate({_id: gameProvider._id}, {$inc: incrementObj}).exec();
                } else {
                    dbconfig.collection_gameProvider.findOneAndUpdate({providerId: providerId}, {$inc: incrementObj}).exec();
                }
            }
        };
        var deferred = Q.defer();
        let playerObj;
        let gameProvider;
        var prom0 = forSync
            ? dbconfig.collection_players.findOne({name: playerId})
                .populate({path: "platform", model: dbconfig.collection_platform})
            : dbconfig.collection_players.findOne({playerId: playerId})
                .populate({path: "platform", model: dbconfig.collection_platform});
        var prom1 = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        Q.all([prom0, prom1]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    playerObj = data[0];
                    gameProvider = data[1];

                    dbLogger.createPlayerCreditTransferStatusLog(playerObj._id, playerObj.playerId, playerObj.name, playerObj.platform._id, playerObj.platform.platformId, "transferOut", "unknown",
                        providerId, amount, 0, adminName, null, constPlayerCreditTransferStatus.REQUEST);

                    if (playerObj.platform.useProviderGroup) {
                        // Platform supporting provider group
                        return dbPlayerCreditTransfer.playerCreditTransferFromProviderWithProviderGroup(
                            data[0]._id, data[0].platform._id, data[1]._id, amount, playerId, providerId, data[0].name, data[0].platform.platformId, adminName, data[1].name, bResolve, maxReward, forSync);
                    } else if (playerObj.platform.canMultiReward) {
                        // Platform supporting multiple rewards will use new function first
                        return dbPlayerCreditTransfer.playerCreditTransferFromProvider(data[0]._id, data[0].platform._id, data[1]._id, amount, playerId, providerId, data[0].name, data[0].platform.platformId, adminName, data[1].name, bResolve, maxReward, forSync);
                    }
                    else {
                        return dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(data[0]._id, data[0].platform._id, data[1]._id, amount, playerId, providerId, data[0].name, data[0].platform.platformId, adminName, data[1].name, bResolve, maxReward, forSync);
                    }

                } else {
                    deferred.reject({name: "DataError", message: "Cant find player or provider"});
                }
            },
            function (err) {
                deferred.reject({name: "DataError", message: "Cant find player or provider" + err.message, error: err})
            }
        ).then(
            function (data) {
                updateBatchStatus(isBatch);
                deferred.resolve(data);
            },
            function (err) {
                if (!err || !err.hasLog) {
                    var platformId = playerObj.platform ? playerObj.platform.platformId : null;
                    var platformObjId = playerObj.platform ? playerObj.platform._id : null;
                    dbLogger.createPlayerCreditTransferStatusLog(playerObj._id, playerObj.playerId, playerObj.name, platformObjId, platformId, "transferOut", "unknown",
                        providerId, amount, 0, adminName, err, constPlayerCreditTransferStatus.FAIL);
                }
                updateBatchStatus(isBatch);
                deferred.reject(err);
            }
        );
        return deferred.promise;
    },

    /**
     * TODO:: Need to choose which reward task to add player credit
     * Transfer credit from game provider
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount
     */
    transferPlayerCreditFromProviderbyPlayerObjId: function (playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync) {
        var deferred = Q.defer();
        var providerPlayerObj = null;
        var rewardTask = null;
        var diffAmount = 0;
        var validCreditToAdd = 0;
        var gameCredit = 0;
        var playerCredit = 0;
        var rewardTaskCredit = 0;
        var notEnoughCredit = false;
        var bUpdateTask = false;
        var transferId = new Date().getTime();
        //var bNoCredit = false;
        //dbconfig.collection_providerPlayerCredit.find({playerId: playerObjId, providerId: providerId}).then(
        var initFunc;
        if (forSync) {
            initFunc = Q.resolve({credit: amount});
        } else {
            initFunc = cpmsAPI.player_queryCredit(
                {
                    username: userName,
                    platformId: platformId,
                    providerId: providerShortId
                }
            )
        }
        initFunc.then(
            function (data) {
                if (data) {
                    providerPlayerObj = {gameCredit: data.credit ? parseFloat(data.credit) : 0};
                    if (providerPlayerObj.gameCredit < 1 || amount == 0 || providerPlayerObj.gameCredit < amount) {
                        notEnoughCredit = true;
                        if (bResolve) {
                            return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
                                playerData => {
                                    deferred.resolve(
                                        {
                                            playerId: playerId,
                                            providerId: providerShortId,
                                            providerCredit: providerPlayerObj.gameCredit,
                                            playerCredit: playerData.validCredit,
                                            rewardCredit: playerData.lockedCredit
                                        }
                                    );
                                }
                            );
                        }
                        else {
                            deferred.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "DataError",
                                errorMessage: "Player does not have enough credit."
                            });
                        }
                        return;
                    }
                    return dbconfig.collection_platform.findOne({_id: platform}).lean().then(
                        platformData => {
                            if (platformData.useLockedCredit) {
                                return dbRewardTask.getPlayerCurRewardTask(playerObjId);
                            }
                        }
                    );
                } else {
                    deferred.reject({name: "DataError", message: "Cant find player credit in provider."});
                    return false;
                }
            },
            function (err) {
                if (bResolve) {
                    return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
                        playerData => {
                            deferred.resolve(
                                {
                                    playerId: playerId,
                                    providerId: providerShortId,
                                    providerCredit: 0,
                                    playerCredit: playerData.validCredit,
                                    rewardCredit: playerData.lockedCredit
                                }
                            );
                        }
                    );
                }
                else{
                    deferred.reject(err);
                }
            }
        ).then(
            function (data) {
                if (!notEnoughCredit) {
                    amount = amount > 0 ? Math.floor(amount) : Math.floor(providerPlayerObj.gameCredit);
                    if (data) {
                        rewardTask = data;
                        if ((!rewardTask.targetProviders || rewardTask.targetProviders.length <= 0 ) // target all providers
                            || (rewardTask.targetEnable && rewardTask.targetProviders.indexOf(providerId) >= 0 )//target this provider
                            || (!rewardTask.targetEnable && rewardTask.targetProviders.indexOf(providerId) < 0)//banded provider
                        ) {
                            if (rewardTask.requiredBonusAmount > 0) {
                                //console.log("transferPlayerCreditFromProviderbyPlayerObjId:", rewardTask);
                                //amount = Math.min(amount, rewardTask.requiredBonusAmount);
                                rewardTask.currentAmount = amount;
                                validCreditToAdd = 0;
                                rewardTask.inProvider = false;
                                rewardTaskCredit = rewardTask.currentAmount;
                            }
                            else {
                                diffAmount = Math.floor(providerPlayerObj.gameCredit) - rewardTask._inputCredit;
                                if (diffAmount > 0) {
                                    rewardTask.currentAmount += diffAmount;
                                    validCreditToAdd = rewardTask._inputCredit;
                                    rewardTask.inProvider = false;
                                } else {
                                    validCreditToAdd = Math.floor(providerPlayerObj.gameCredit);
                                    rewardTask.inProvider = false;
                                    rewardTask.currentAmount = 0;
                                    //rewardTask.status = constRewardTaskStatus.NO_CREDIT;
                                }
                                rewardTask._inputCredit = 0;
                                rewardTaskCredit = rewardTask.currentAmount;
                            }
                            bUpdateTask = true;
                        } else {
                            validCreditToAdd = amount;
                        }
                        //return data;
                    } else {
                        validCreditToAdd = amount;
                        //for player registration reward
                        if (maxReward && validCreditToAdd > maxReward) {
                            validCreditToAdd = maxReward;
                        }
                        rewardTask = {currentAmount: 0};
                    }
                    if (forSync) {
                        return true;
                    }
                    return counterManager.incrementAndGetCounter("transferId").then(
                        function (id) {
                            transferId = id;
                            // console.log("player_transferOut:", userName, providerShortId, amount);
                            let lockedAmount = rewardTask && rewardTask.currentAmount ? rewardTask.currentAmount : 0;
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", id,
                                providerShortId, amount, lockedAmount, adminName, null, constPlayerCreditTransferStatus.SEND);
                            return cpmsAPI.player_transferOut(
                                {
                                    username: userName,
                                    platformId: platformId,
                                    providerId: providerShortId,
                                    transferId: id, //chance.integer({min: 1000000000000000000, max: 9999999999999999999}),
                                    credit: amount
                                }
                            ).then(
                                res => res,
                                error => {
                                    // var lockedAmount = rewardTask && rewardTask.currentAmount ? rewardTask.currentAmount : 0;
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", id,
                                        providerShortId, amount, lockedAmount, adminName, error, constPlayerCreditTransferStatus.FAIL);
                                    error.hasLog = true;
                                    return Q.reject(error);
                                }
                            );
                        }
                    );
                }
            },
            function (err) {
                deferred.reject({
                    status: constServerCode.PLAYER_REWARD_INFO,
                    name: "DataError", message: "cannot get current player reward task data.", error: err
                })
            }
        ).then(
            function (data) {
                if (data) {
                    if (bUpdateTask) {
                        return dbconfig.collection_rewardTask.findOneAndUpdate(
                            {_id: rewardTask._id, platformId: rewardTask.platformId},
                            {
                                currentAmount: rewardTask.currentAmount,
                                inProvider: rewardTask.inProvider,
                                _inputCredit: rewardTask._inputCredit
                            },
                            {new: true}
                        ).exec();
                    }
                    else {
                        return rewardTask;
                    }
                }
            },
            function (error) {
                //log transfer error
                deferred.reject(error);
            }
        ).then(
            function (data) {
                if (data) {
                    rewardTask = data;
                    gameCredit = providerPlayerObj.gameCredit - validCreditToAdd - rewardTaskCredit;
                    gameCredit = gameCredit >= 0 ? gameCredit : 0;
                    return true;
                } else {
                    deferred.reject({
                        status: constServerCode.PLAYER_REWARD_INFO,
                        name: "DataError",
                        message: "Error when finding reward information for player"
                    });
                }
            }, function (err) {
                deferred.reject({
                    status: constServerCode.PLAYER_REWARD_INFO,
                    name: "DataError",
                    message: "Error when finding reward information for player",
                    error: err
                });
            }
        ).then(
            function (data) {
                if (data) {
                    var updateObj = {
                        lastPlayedProvider: null,
                        $inc: {validCredit: validCreditToAdd}
                    };
                    // if (bNoCredit) {
                    //     updateObj.lockedCredit = 0;
                    // }
                    // else {
                    updateObj.lockedCredit = rewardTask.currentAmount;
                    //}
                    //move credit to player
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: playerObjId, platform: platform},
                        updateObj,
                        {new: true}
                    )
                }
            },
            function (err) {
                deferred.reject({
                    status: constServerCode.PLAYER_TRANSFER_OUT_ERROR,
                    name: "DBError",
                    message: "Error transfer out player credit.",
                    error: err
                });
            }
        ).then(
            function (res) {
                if (res) {//create log
                    playerCredit = res.validCredit;
                    var lockedCredit = res.lockedCredit;
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, validCreditToAdd, constPlayerCreditChangeType.TRANSFER_OUT, playerCredit, lockedCredit, lockedCredit, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });
                    // Logging Transfer Success
                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform,
                        platformId, constPlayerCreditChangeType.TRANSFER_OUT, transferId, providerShortId, amount, lockedCredit, adminName, res, constPlayerCreditTransferStatus.SUCCESS);

                    // if (rewardTask && rewardTask.status == constRewardTaskStatus.ACHIEVED && rewardTask.isUnlock) {
                    //     //check reward task, to see if can unlock
                    //     //return dbRewardTask.completeRewardTask(rewardTask);
                    //     return
                    // }
                    // else {
                    var rewardCredit = rewardTask ? rewardTask.currentAmount : 0;
                    deferred.resolve(
                        {
                            playerId: playerId,
                            providerId: providerShortId,
                            providerCredit: parseFloat(gameCredit).toFixed(2),
                            playerCredit: parseFloat(playerCredit).toFixed(2),
                            rewardCredit: parseFloat(rewardTaskCredit).toFixed(2),
                            transferCredit: {
                                playerCredit: parseFloat(validCreditToAdd).toFixed(2),
                                rewardCredit: parseFloat(rewardCredit).toFixed(2)
                            }
                        }
                    );
                    // }
                }
                else {
                    deferred.reject({name: "DBError", message: "Error in increasing player credit."})
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error in increasing player credit.", error: err});
            }
        ).then(
            function (data) {
                if (data) {
                    //return transferred credit + reward task amount
                    var rewardCredit = data ? data : 0;
                    deferred.resolve(
                        {
                            playerId: playerId,
                            providerId: providerShortId,
                            providerCredit: parseFloat(gameCredit).toFixed(2),
                            playerCredit: parseFloat(playerCredit).toFixed(2),
                            rewardCredit: parseFloat(rewardTaskCredit).toFixed(2),
                            transferCredit: {
                                playerCredit: parseFloat(validCreditToAdd).toFixed(2),
                                rewardCredit: parseFloat(rewardCredit).toFixed(2)
                            }
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error completing reward task", error: error});
            }
        );
        return deferred.promise;
    },

    /*
     * get player status change log
     * @param {objectId} playerObjId
     */
    getPlayerStatusChangeLog: function (playerObjId) {
        return dbconfig.collection_playerStatusChangeLog.find({_playerId: playerObjId}).sort({createTime: 1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    /*
     * get player credit data only
     * @param {playerId} playerId
     */
    getPlayerCredit: function (playerId) {
        var returnObj = {gameCredit: 0};
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}).populate(
            {path: "lastPlayedProvider", model: dbconfig.collection_gameProvider}
        ).lean().then(
            playerData => {
                if (playerData) {
                    returnObj.validCredit = playerData.validCredit;
                    returnObj.lockedCredit = playerData.lockedCredit;
                    return dbconfig.collection_proposal
                        .find({
                            $or: [
                                {"data.playerId": playerData._id.toString()},
                                {"data.playerObjId": playerData._id.toString()},
                                {"data.playerId": playerData._id},
                                {"data.playerObjId": playerData._id}
                            ],
                            status: constProposalStatus.PENDING,
                            mainType: "Reward"
                        }).populate({path: "type", model: dbconfig.collection_proposalType}).lean().then(
                            proposals => {
                                var sumAmount = 0;
                                for (var key in proposals) {
                                    if (proposals[key] && proposals[key].data) {
                                        var applyAmount = proposals[key].data.applyAmount || 0;
                                        var rewardAmount = proposals[key].data.rewardAmount || 0;
                                        var currentAmount = proposals[key].data.currentAmount || 0;
                                        if (proposals[key].type && (proposals[key].type.name == constProposalType.PLAYER_CONSUMPTION_RETURN || !playerData.platform.useLockedCredit)) {
                                            sumAmount = sumAmount + Number(rewardAmount);
                                        }
                                        else {
                                            sumAmount = sumAmount + Number(applyAmount) + Number(rewardAmount) + Number(currentAmount);
                                        }
                                    }
                                }
                                returnObj.pendingRewardAmount = sumAmount;
                                if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.status == constGameStatus.ENABLE) {
                                    return cpmsAPI.player_queryCredit(
                                        {
                                            username: playerData.name,
                                            platformId: playerData.platform.platformId,
                                            providerId: playerData.lastPlayedProvider.providerId
                                        }
                                    ).then(
                                        creditData => {
                                            returnObj.gameCredit = creditData ? parseFloat(creditData.credit) : 0;
                                            return returnObj;
                                        },
                                        error => {
                                            //if can't query credit use 0 for game credit
                                            return returnObj;
                                        }
                                    );
                                }
                                else {
                                    return returnObj;
                                }

                            }
                        )
                }
                else {
                    return {};
                }
            }
        );
    },

    getPlayerCreditInfo: function (playerId) {
        var creditData = {gameCredit: 0};
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}).populate(
            {path: "lastPlayedProvider", model: dbconfig.collection_gameProvider}
        ).lean().then(
            playerData => {
                if (playerData) {
                    creditData.validCredit = playerData.validCredit;
                    creditData.lockedCredit = playerData.lockedCredit;
                    return dbconfig.collection_rewardTask.findOne({
                        playerId: playerData._id,
                        status: constRewardTaskStatus.STARTED,
                        useLockedCredit: true
                    }).lean().then(
                        taskData => {
                            creditData.taskData = taskData;
                            if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.status == constGameStatus.ENABLE) {
                                return cpmsAPI.player_queryCredit(
                                    {
                                        username: playerData.name,
                                        platformId: playerData.platform.platformId,
                                        providerId: playerData.lastPlayedProvider.providerId
                                    }
                                ).then(
                                    gameData => {
                                        creditData.gameCredit = gameData ? parseFloat(gameData.credit) : 0;
                                        return creditData;
                                    }
                                );
                            }
                            else {
                                return creditData;
                            }

                        }
                    );
                }
                else {
                    return Q.reject({name: "DBError", message: "Cannot find player"});
                }
            }
        );
    },

    getSimilarPlayers: function (playerId) {
        //todo::temp disable similar player display
        return Q.resolve({playerId: playerId, similarData: []});

        // return dbconfig.collection_players.findOne({_id: playerId}).populate({
        //     path: "similarPlayers.playerObjId",
        //     model: dbconfig.collection_players,
        //     select: "playerId name"
        // }).lean().then(
        //     playerData => {
        //         return {playerId: playerData.playerId, similarData: playerData.similarPlayers};
        //     }
        // );
    },

    /*
     * get captcha
     */
    getCaptcha: function (conn) {
        let deferred = Q.defer();
        let captchaCode = parseInt(Math.random() * 9000 + 1000);
        conn.captchaCode = captchaCode;
        let p = new captchapng(80, 30, captchaCode); // width,height,numeric captcha
        p.color(8, 18, 188, 255);  // First color: background (red, green, blue, alpha)
        p.color(18, 188, 8, 255); // Second color: paint (red, green, blue, alpha)


        let img = p.getBase64();
        let imgbase64 = new Buffer(img, 'base64');
        deferred.resolve(imgbase64);
        return deferred.promise;
    },

    /*
     * get reward events of the platform on which a player registered
     * @param {JSON} playerObjId or playerId or name ... etc
     */
    getRewardEventForPlayer: function (query) {
        var deferred = Q.defer();

        var playerPlatformId = null;
        let playerData;

        dbconfig.collection_players.findOne(query).then(
            function (player) {
                if (player) {
                    playerPlatformId = player.platform;
                    playerData = player;
                    return dbconfig.collection_rewardEvent.find({platform: player.platform})
                        .populate({
                            path: "type",
                            model: dbconfig.collection_rewardType
                        })
                } else {
                    deferred.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "No player found matching query"
                    });
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player", error: error});
            }
        ).then(
            function (rewardEvent) {
                if (rewardEvent) {
                    var platformId = null;
                    var rewardEventArray = [];
                    dbconfig.collection_platform.findOne({"_id": playerPlatformId}).then(
                        function (platformData) {
                            platformId = platformData.platformId;
                            for (var i = 0; i < rewardEvent.length; i++) {
                                var rewardEventItem = rewardEvent[i].toObject();
                                delete rewardEventItem.platform;
                                rewardEventItem.platformId = platformId;
                                rewardEventArray.push(rewardEventItem);
                            }
                            deferred.resolve(rewardEventArray);
                        }, function (err) {
                            deferred.reject({
                                name: "DBError",
                                error: err,
                                message: "Error in getting platform ID"
                            });
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting rewardEvent", error: error});
            }
        );

        return deferred.promise;
    },


    getRewardEventForPlatform: function (platformId) {
        var playerPlatformId = null;
        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            function (platform) {
                if (platform) {
                    playerPlatformId = platform._id;
                    return dbconfig.collection_rewardEvent.find({platform: playerPlatformId})
                        .populate({
                            path: "type",
                            model: dbconfig.collection_rewardType
                        }).populate({
                            path: "param.providers",
                            model: dbconfig.collection_gameProvider
                        })
                } else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "No player found matching query"
                    });
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting platform", error: error});
            }
        ).then(
            function (rewardEvent) {
                if (rewardEvent) {
                    var rewardEventArray = [];
                    for (var i = 0; i < rewardEvent.length; i++) {
                        var rewardEventItem = rewardEvent[i].toObject();
                        delete rewardEventItem.platform;
                        rewardEventItem.platformId = platformId;
                        if (rewardEventItem.canApplyFromClient) {
                            rewardEventArray.push(rewardEventItem);
                        }
                    }
                    return rewardEventArray;
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting rewardEvent", error: error});
            }
        );
    },

    getLevelRewardForPlayer: function (query) {
        var deferred = Q.defer();

        dbconfig.collection_players.findOne(query).then(
            function (player) {
                if (player) {
                    return dbconfig.collection_playerLevel.findOne({_id: player.playerLevel});
                } else {
                    deferred.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Cannot find player"
                    });
                    // Prevent the next onFulfilled function from running:
                    return Promise.reject('No player found (deferred already rejected)');
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (playerLevel) {
                var reward = playerLevel.reward;

                // reward is supposed to be an Object.
                // But while we are still developing the Management interface, we may find that we have stored a String, not an Object!
                if (typeof reward === 'string') {
                    try {
                        reward = JSON.parse(reward);
                    } catch (e) {
                        // Leave reward as a string then!
                    }
                }

                deferred.resolve(reward);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player level", error: error});
            }
            //).catch(function (error) {
            //    // This line can be reached if there is an error in the onFulfilled function, e.g. if the try-catch is removed.
            //    // Without this, any error thrown from onFulfilled will just disappear!
            //    deferred.reject({name: "AppError", message: "Error processing playerLevel.reward", error: error});
            //}
        );

        return deferred.promise;
    },

    isValidPlayerName: function (inputData) {
        return dbconfig.collection_platform.findOne({platformId: inputData.platformId}).then(
            platformData => {
                if (platformData) {
                    inputData.name = platformData.prefix + inputData.name;
                    inputData.name = inputData.name.toLowerCase();
                    return dbPlayerInfo.isPlayerNameValidToRegister({name: inputData.name, platform: platformData._id});
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        );
    },

    isValidRealName: inputData => {
        return dbconfig.collection_platform.findOne({platformId: inputData.platformId}).then(
            platformData => {
                if (platformData) {
                    inputData.name = platformData.prefix + inputData.name;
                    inputData.name = inputData.name.toLowerCase();
                    return dbPlayerInfo.isPlayerNameValidToRegister({name: inputData.name, platform: platformData._id});
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        );
    },

    getPlayerPhoneLocation: function (platform, startTime, endTime, player, date, phoneProvince) {
        //todo: active player indicator
        var matchObj = {
            platform: platform
        };
        date = date || 'lastAccessTime';
        matchObj[date] = {
            $gte: startTime,
            $lt: endTime
        }

        var idObj = {}
        if (phoneProvince) {
            matchObj.phoneProvince = phoneProvince;
            idObj = {
                phoneCity: "$phoneCity"
            }
        } else {
            idObj = {
                phoneProvince: "$phoneProvince",
            }
        }
        return dbconfig.collection_players.aggregate(
            [{
                $match: matchObj
            }, {
                $group: {
                    _id: idObj,
                    amount: {$sum: 1},
                }
            }, {
                $sort: {amount: -1}
            }]
        );
    },

    isPlayerNameValidToRegister: function (query) {
        return dbconfig.collection_players.findOne(query).then(
            playerData => {
                if (playerData) {
                    return {isPlayerNameValid: false};
                } else {
                    return {isPlayerNameValid: true};
                }
            }
        );
    },

    isPlayerNameLengthValid: function (playerName, platform) {
        dbconfig.collection_platform.findOne({_id: platform}).then(
            platformData => {
                if ((platformData.playerNameMaxLength > 0 && playerName.length > platformData.playerNameMaxLength) || (platformData.playerNameMinLength > 0 && playerName.length < platformData.playerNameMinLength)) {
                    return {isPlayerNameValid: false};
                } else {
                    return {isPlayerNameValid: true};
                }
            }
        );
    },

    /**
     * To check whether player's real name exist
     * @param query
     * @returns {Promise|Promise.<TResult>}
     */
    isPlayerRealNameExist: query => {
        let chineseRegex = /^[\u4E00-\u9FA5\u00B7\u0020]{0,}$/;
        let retData = {};

        if ((query.realName && !query.realName.match(chineseRegex))) {
            retData.isPlayerRealNameNonChinese = true;
        }

        return dbconfig.collection_platform.findOne({platformId: query.platformId}).then(
            platformData => {
                return dbconfig.collection_players.findOne({realName: query.realName, platform: platformData._id})
            }
        ).then(
            playerData => {
                if (playerData) {
                    retData.isPlayerRealNameExist = true;
                } else {
                    retData.isPlayerRealNameExist = false;
                }

                return retData;
            }
        );
    },

    isPhoneNumberValidToRegister: function (query) {
        return dbconfig.collection_players.findOne(query).then(
            playerData => {
                if (playerData) {
                    return {isPhoneNumberValid: false};
                } else {
                    return {isPhoneNumberValid: true};
                }
            }
        );
    },

    isExceedPhoneNumberValidToRegister: function (query, count) {
        return dbconfig.collection_players.findOne(query).count().then(
            playerDataCount => {
                if (playerDataCount > count) {
                    return {isPhoneNumberValid: false};
                } else {
                    return {isPhoneNumberValid: true};
                }
            }
        );
    },

    getRewardsForPlayer: function (playerId, rewardType, startTime, endTime, startIndex, count) {
        var queryProm = null;
        var playerName = '';
        var queryObject = {
            //todo::refactor the string here
            mainType: "Reward"
        };
        if (startTime) {
            queryObject.createTime = {$gte: new Date(startTime)};
        }
        if (endTime) {
            queryObject.createTime = {$lt: new Date(endTime)};
        }
        if (startTime && endTime) {
            queryObject.createTime = {$gte: new Date(startTime), $lt: new Date(endTime)};
        }

        return dbconfig.collection_players.findOne({playerId: playerId}).catch(
            error => Q.reject({name: "DBError", message: "Error in getting player data", error: error})
        ).then(
            function (player) {
                if (player) {
                    queryObject["data.playerObjId"] = {$in: [String(player._id), player._id]};
                    playerName = player.name;
                    if (rewardType) {
                        return dbconfig.collection_proposalType.findOne({
                            platformId: player.platform,
                            name: rewardType
                        }).catch(
                            error => Q.reject({
                                name: "DBError",
                                message: "Error in getting proposal type",
                                error: error
                            })
                        );
                    }
                    else {
                        return {};
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Player is not found"});
                }
            }
        ).then(
            function (proposalType) {
                if (proposalType) {
                    if (proposalType && proposalType._id) {
                        queryObject.type = proposalType._id;
                    }
                    var countProm = dbconfig.collection_proposal.find(queryObject).count();
                    var rewardProm = dbconfig.collection_proposal.find(queryObject)
                        .populate({
                            path: "type",
                            model: dbconfig.collection_proposalType
                        }).populate({
                            path: "process",
                            model: dbconfig.collection_proposalProcess
                        })
                        .lean().sort({createTime: 1}).skip(startIndex).limit(count);
                    return Q.all([countProm, rewardProm]).catch(
                        error => Q.reject({name: "DBError", message: "Error in finding proposal", error: error})
                    );
                }
                else {
                    return {};
                }
            }
        ).then(
            function (data) {
                //process data
                if (data && data[0] && data[1]) {
                    var proposals = data[1];
                    var res = [];
                    var totalAmount = 0;
                    for (var i = 0; i < proposals.length; i++) {
                        var status = null;
                        if (proposals[i].noSteps) {
                            status = proposals[i].status;
                        }
                        else {
                            status = proposals[i].process ? proposals[i].process.status : proposals[i].status;
                        }
                        res.push(
                            {
                                playerId: playerId,
                                playerName: playerName,
                                createTime: proposals[i].createTime,
                                rewardType: proposals[i].type ? proposals[i].type.name : "",
                                rewardAmount: proposals[i].data.rewardAmount ? Number(proposals[i].data.rewardAmount) : proposals[i].data.currentAmount,
                                eventName: proposals[i].data.eventName || localization.localization.translate(proposals[i].type ? proposals[i].type.name : ""),
                                eventCode: proposals[i].data.eventCode,
                                status: status
                            }
                        );
                        totalAmount += (proposals[i].data.rewardAmount ? Number(proposals[i].data.rewardAmount) : 0);
                    }
                    return {
                        stats: {
                            totalCount: data[0],
                            totalAmount: totalAmount,
                            startIndex: startIndex,
                            requestCount: count
                        },
                        records: res
                    };
                }
                else {
                    return {
                        stats: {
                            totalCount: data[0] || 0,
                            totalAmount: 0,
                            startIndex: startIndex
                        },
                        records: []
                    };
                }
            }
        );
    },

    getGameProviderCredit: function (playerId, providerId) {
        //todo::should call game provider api here
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).exec();
        //var providerProm = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        return playerProm.then(
            function (data) {
                if (data) {
                    return cpmsAPI.player_queryCredit(
                        {
                            username: data.name,
                            platformId: data.platform.platformId,
                            providerId: providerId
                        }
                    );
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in finding player or provider", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    return {
                        providerId: providerId,
                        credit: parseFloat(data.credit)
                    };
                }
                else {
                    return {
                        providerId: providerId,
                        credit: 0
                    };
                }
            },
            function (error) {
                return Q.reject(error);
            }
        );
    },

    // TODO:
    // Now that we have level down processing, we will need to check player level as part of schedule, but checking every player would be very inefficient!
    // In fact we only need to:
    // - Check level-down for players who are *not* on the lowest level, and only if their recent consumption and topupsum were low (lower than the max for their level, or lower than the max for all levels)
    // - We don't actually need to check level-up for any players, since they are checked during topup and comsumption

    /**
     * Check if player can level up after top up or consumption
     *
     * @param {String|ObjectId} playerObjId
     * @returns {Promise.<*>}
     */
    checkPlayerLevelUp: function (playerObjId, platformObjId) {
        if (!platformObjId) {
            throw Error("platformObjId was not provided!");
        }
        else {
            return dbconfig.collection_platform.findOne({"_id": platformObjId}).then(
                (platformData) => {
                    if (platformData.autoCheckPlayerLevelUp) {
                        const playerProm = dbconfig.collection_players.findOne({_id: playerObjId}).populate({
                            path: "playerLevel",
                            model: dbconfig.collection_playerLevel
                        }).lean().exec();

                        const levelsProm = dbconfig.collection_playerLevel.find({
                            platform: platformObjId
                        }).sort({value: 1}).lean().exec();

                        return Q.all([playerProm, levelsProm]).spread(
                            function (player, playerLevels) {
                                return dbPlayerInfo.checkPlayerLevelMigration(player, playerLevels, true, false, false, false );
                            }
                        );
                    }
                    else {
                        return Q.resolve(true);
                    }
                }, (error) => {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            );
        }
    },

    /**
     * Check if player can level up after top up or consumption
     *
     * @param {String|ObjectId} playerObjId
     * @param platformObjId
     * @param topUpAmount
     * @returns {Promise.<*>}
     */
    checkFreeAmountRewardTaskGroup: function (playerObjId, platformObjId, topUpAmount) {
        if (!platformObjId) {
            throw Error("platformObjId was not provided!");
        }
        else {
            let query = {
                platformId: platformObjId,
                playerId: playerObjId,
                providerGroup: null,
                status: constRewardTaskStatus.STARTED
            };

            return dbconfig.collection_rewardTaskGroup.findOne(query).then(
                (rewardTaskGroup) => {
                    if(rewardTaskGroup){
                        return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                            {_id: rewardTaskGroup._id},
                            {$inc :{targetConsumption: topUpAmount,
                                currentAmt: topUpAmount,
                                initAmt: topUpAmount
                            }}
                        )
                    }else{
                        let saveObj = {
                            platformId: platformObjId,
                            playerId: playerObjId,
                            providerGroup: null,
                            status: constRewardTaskStatus.STARTED,
                            initAmt: topUpAmount,
                            rewardAmt: 0,
                            currentAmt: topUpAmount,
                            forbidWithdrawIfBalanceAfterUnlock: 0,
                            forbidXIMAAmt: 0,
                            curConsumption: 0,
                            targetConsumption: topUpAmount || 0
                        };

                        // create new reward group
                        return new dbconfig.collection_rewardTaskGroup(saveObj).save();
                    }
                }, (error) => {
                    return Q.reject({name: "DataError", message: "Cannot find reward task group"});
                }
            );
        }
    },

    /**
     * Check if player can level up manually
     *
     * @param {String|ObjectId} playerObjId
     * @returns {Promise.<*>}
     */
    manualPlayerLevelUp: function (playerObjId, userAgent) {
        return dbconfig.collection_players.findOne({_id: playerObjId}, {platform:1, _id:0}).lean().then(
            (playerData) => {
                return dbconfig.collection_platform.findOne({"_id": playerData.platform}).then(
                    (platformData) => {
                        if (platformData.manualPlayerLevelUp) {
                            const playerProm = dbconfig.collection_players.findOne({_id: playerObjId}).populate({
                                path: "playerLevel",
                                model: dbconfig.collection_playerLevel
                            }).lean().exec();

                            const levelsProm = dbconfig.collection_playerLevel.find({
                                platform: playerData.platform
                            }).sort({value: 1}).lean().exec();

                            return Q.all([playerProm, levelsProm]).spread(
                                function (player, playerLevels) {
                                    if (!player) {
                                        return Q.reject({name: "DataError", message: "Cannot find player"});
                                    }
                                    return dbPlayerInfo.checkPlayerLevelMigration(player, playerLevels, true, false, false, true, userAgent);
                                },
                                function () {
                                    return Q.reject({name: "DataError", message: "Cannot find player"});
                                }
                            );
                        }
                        else {
                            return Q.resolve(true);
                        }
                    }, (error) => {
                        return Q.reject({name: "DataError", message: "Cannot find platform"});
                    }
                );
            }
        );
    },

    getPlayerLevelUpgrade: function (playerId) {

        if (!playerId) {
            return Q.reject({name: "DataError", message: "Can not find the player"})
        }
        return dbconfig.collection_players.findOne({playerId: playerId}).lean()
            .then(playerObj => {
                let platformId = playerObj.platform;

                const playerProm = dbconfig.collection_players.findOne({playerId: playerId}).populate(
                    {
                        path: "playerLevel",
                        model: dbconfig.collection_playerLevel
                    }).lean().exec();

                const levelsProm = dbconfig.collection_playerLevel.find({
                    platform: platformId
                }).sort({value: 1}).lean().exec();

                return Q.all([playerProm, levelsProm]).spread(
                    function (player, playerLevels) {
                        if (!player || !playerLevels)
                            return Q.reject({name: "DataError", message: "Data not found"});

                        return dbPlayerInfo.checkPlayerLevelMigration(player, playerLevels, true, false, false, true);
                    },
                    function () {
                        return Q.reject({name: "DataError", message: "Data not found"});
                    }
                );
            });
    },

    /**
     * Check if player can level down.
     *
     * @param {PlayerInfo} player
     * @param {[PlayerLevel]} playerLevels
     * @param {Boolean} [checkPeriod] - Should be 'DAY' or 'WEEK'.  'WEEK' will perform both daily and weekly level downs.
     * @returns {Promise.<*>}
     */
    checkPlayerLevelDownWithLevels: function (player, playerLevels, checkPeriod) {
        return dbPlayerInfo.checkPlayerLevelMigration(player, playerLevels, false, true, checkPeriod);
    },

    /**
     * Checks, based on the player's {daily,weekly}{TopUp,Consumption}Sum and the playerLevel configs,
     * whether the player's level should be increased or decreased.
     *
     * @consider If this function is slow during platform settlement, then we could consider fetching all the
     * playerLevels beforehand, and passing them to this function, rather than re-fetching them on each call.
     *
     * @param {PlayerInfo} player - The player's .playerLevel must be populated
     * @param {[PlayerLevel]} playerLevels - All the player levels for this platform, sorted by value
     * @param {Boolean} checkLevelUp
     * @param {Boolean} checkLevelDown
     * #param {String} [checkPeriod] - For level down only. We will only consider weekly conditions if checkPeriod is 'WEEK'.
     * @returns {Promise.<*>}
     */
    checkPlayerLevelMigration: function (player, playerLevels, checkLevelUp, checkLevelDown, checkPeriod, showReject, userAgent) {
        if (!player) {
            throw Error("player was not provided!");
        }
        if (!player.playerLevel) {
            throw Error("player's playerLevel is not populated!");
        }
        if (!playerLevels) {
            throw Error("playerLevels was not provided!");
        }

        let errorMsg = '';
        let errorCode = '';
        var playerObj = null;
        var levelUpObj = null;
        var levelDownObj = null;
        var levelErrorMsg = '';
        // A flag to determine LevelUp Stop At Where.
        var levelUpEnd = false;
        let isRewardAssign = false;

        return Promise.resolve(player).then(
            function (player) {
                if (player && player.playerLevel) {
                    // Optimization: No point in checking level up for players who have no topup or consumption
                    // if (checkLevelUp && !checkLevelDown
                    //     && player.dailyTopUpSum === 0 && player.dailyConsumptionSum === 0
                    //     && player.weeklyTopUpSum === 0 && player.weeklyConsumptionSum === 0
                    //     && player.pastMonthTopUpSum === 0 && player.pastMonthConsumptionSum === 0
                    // ) {
                    //     return {};
                    // }
                    playerObj = player;
                    //// Fetch other player levels
                    //var query = {platform: playerObj.platform};
                    //
                    //// Optimization: If only checking level up, then we only need to examine higher levels
                    //if (checkLevelUp && !checkLevelDown) {
                    //    query.value = {$gt: playerObj.playerLevel.value};
                    //}
                    //// Optimization: If only checking level down, then we only need to examine this level and the one before it (we actually fetch all before it)
                    //if (checkLevelDown && !checkLevelUp) {
                    //    query.value = {$lte: playerObj.playerLevel.value};
                    //}
                    //
                    //return dbconfig.collection_playerLevel.find(query).sort({value: 1}).lean();
                    if (playerObj.permission && playerObj.permission.levelChange === false) {
                        return Q.reject({name: "DBError", message: "level change fail, please contact cs"});
                    }

                    if (checkLevelUp && !checkLevelDown) {
                        playerLevels = playerLevels.filter(level => level.value > playerObj.playerLevel.value);
                        if (playerLevels.length == 0) {
                            levelErrorMsg = 'Reached Max Level';
                        }
                    } else if (checkLevelDown && !checkLevelUp) {
                        playerLevels = playerLevels.filter(level => level.value <= playerObj.playerLevel.value);
                        if (playerLevels.length == 0) {
                            levelErrorMsg = 'Reached Min Level';
                        }
                    } else {
                        levelErrorMsg = 'Player Level Not Found';
                    }
                    return Promise.resolve(playerLevels);
                }
                else {
                    return {};
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in finding player", error: error});
            }
        ).then(
            function (levels) {
                let levelObjId = null;
                let levelUpObjId = [];
                let levelUpObjArr = [];
                let levelUpCounter = 0;
                let isSkipAudit = false;

                function createProposal (proposal, inputDevice, index) {
                    return dbProposal.createProposalWithTypeName(playerObj.platform, constProposalType.PLAYER_LEVEL_MIGRATION, {
                        creator: {type: "player", name: playerObj.name, id: playerObj.playerId},
                        data: proposal,
                        inputDevice: inputDevice
                    }).then(
                        createdMigrationProposal => {
                            if (!checkLevelUp) {
                                return Promise.resolve();
                            }

                            if (createdMigrationProposal.status == constProposalStatus.APPROVED ||
                                createdMigrationProposal.status == constProposalStatus.SUCCESS) {
                                isSkipAudit = true;
                            } else {
                                isSkipAudit = false;
                            }

                            return dbconfig.collection_proposalType.findOne({
                                platformId: playerObj.platform,
                                name: constProposalType.PLAYER_LEVEL_UP
                            }).lean();
                        }
                    ).then(
                        proposalTypeData => {
                            if (!checkLevelUp) {
                                return Promise.resolve();
                            }
                            // check if player has level up to this level previously
                            return dbconfig.collection_proposal.findOne({
                                'data.playerObjId': {$in: [ObjectId(playerObj._id), String(playerObj._id)]},
                                'data.platformObjId': {$in: [ObjectId(playerObj.platform), String(playerObj.platform)]},
                                'data.levelValue': levelUpObj.value,
                                type: proposalTypeData._id,
                                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                            }).lean();
                        }
                    ).then(
                        rewardProp => {
                            if (!checkLevelUp) {
                                return Promise.resolve();
                            }
                            if (!rewardProp) {
                                // if this is level up and player has not reach this level before
                                // create level up reward proposal
                                if (levelUpObjArr[index] && levelUpObjArr[index].reward && levelUpObjArr[index].reward.bonusCredit) {
                                    proposal.rewardAmount = levelUpObjArr[index].reward.bonusCredit;
                                    proposal.isRewardTask = levelUpObjArr[index].reward.isRewardTask;
                                    if (proposal.isRewardTask) {
                                        if (levelUpObjArr[index].reward.providerGroup && levelUpObjArr[index].reward.providerGroup !== "free") {
                                            proposal.providerGroup = levelUpObjArr[index].reward.providerGroup;
                                        }
                                        proposal.requiredUnlockAmount = levelUpObjArr[index].reward.requiredUnlockTimes * levelUpObjArr[index].reward.bonusCredit;
                                    }

                                }
                                return dbProposal.createProposalWithTypeName(playerObj.platform, constProposalType.PLAYER_LEVEL_UP, {data: proposal});

                            } else {
                                isRewardAssign = true;
                                return {}
                            }
                        }
                    ).then(
                        proposalResult => {

                            if (!checkLevelUp) {
                                return Promise.resolve();
                            }

                            if (isSkipAudit) {
                                let rewardPrice = [];
                                let prevLevel = Number(playerObj.playerLevel.value) + 1;
                                let currentLevel = levelUpObj.value + 1;
                                let levelUpDistance = levelUpObj.value - playerObj.playerLevel.value;
                                let prevLevelName = playerObj.playerLevel.name || '';
                                let currentLevelName = levelUpObj.name || '';
                                for (var i = 0; i < levelUpDistance; i++) {
                                    rewardPrice.push(levels[i].reward.bonusCredit);
                                }
                                let rewardPriceCount = rewardPrice.length;
                                let mainMessage = '恭喜您从 ' + prevLevelName + ' 升级到 ' + currentLevelName;
                                let subMessage = '';
                                if (!isRewardAssign && (proposalResult.status == constProposalStatus.APPROVED || proposalResult.status == constProposalStatus.SUCCESS)) {
                                    subMessage = ',获得';
                                    rewardPrice.forEach(
                                        function (val, index) {
                                            let colon = '、';
                                            if (index == rewardPrice.length - 1) {
                                                colon = '';
                                            }
                                            subMessage += '' + val + '元' + colon;
                                        }
                                    )
                                    subMessage += '共' + rewardPrice.length + '个礼包';
                                }
                                let message = mainMessage + subMessage;
                                return {message: message}

                            } else {
                                return {message: "升级提案待审核中"}
                            }
                        }
                    )
                }

                if (levels && levels.length > 0) {
                    const topupFieldsByPeriod = {
                        DAY: 'dailyTopUpSum',
                        WEEK: 'weeklyTopUpSum',
                        MONTH: "pastMonthTopUpSum",
                        NONE: 'topUpSum'
                    };
                    const consumptionFieldsByPeriod = {
                        DAY: 'dailyConsumptionSum',
                        WEEK: 'weeklyConsumptionSum',
                        MONTH: "pastMonthConsumptionSum",
                        NONE: 'consumptionSum'
                    };

                    if (checkLevelDown && levels.length > 1) {
                        //for level down, there is no level jump
                        let previousLevel = levels[levels.length - 2];
                        let level = levels[levels.length - 1];

                        const conditionSets = level.levelDownConfig;
                        //currently only support one condition for level down
                        if (conditionSets && conditionSets.length > 0) {
                            const conditionSet = conditionSets[0];
                            var periodMatch = true;
                            //only check weekly condition when it is first day of the week
                            if (conditionSet.topupPeriod == constPlayerLevelPeriod.WEEK || conditionSet.consumptionPeriod == constPlayerLevelPeriod.WEEK) {
                                periodMatch = dbUtility.isFirstDayOfWeekSG();
                            }
                            //only check monthly condition when it is first day of the month
                            else if (conditionSet.topupPeriod == constPlayerLevelPeriod.MONTH || conditionSet.consumptionPeriod == constPlayerLevelPeriod.MONTH) {
                                periodMatch = dbUtility.isFirstDayOfMonthSG();
                            }
                            if (periodMatch) {
                                const topupPeriod = conditionSet.topupPeriod;
                                const topupField = topupFieldsByPeriod[topupPeriod];
                                let playersTopupForPeriod = playerObj[topupField];
                                if (playersTopupForPeriod === undefined) {
                                    playersTopupForPeriod = 0;
                                }
                                let failsTopupRequirements = playersTopupForPeriod < conditionSet.topupMinimum;

                                const consumptionPeriod = conditionSet.consumptionPeriod;
                                const consumptionField = consumptionFieldsByPeriod[consumptionPeriod];
                                let playersConsumptionForPeriod = playerObj[consumptionField];
                                if (playersConsumptionForPeriod === undefined) {
                                    playersConsumptionForPeriod = 0;
                                }
                                let failsConsumptionRequirements = playersConsumptionForPeriod < conditionSet.consumptionMinimum;

                                if (topupField === undefined || consumptionField === undefined) {
                                    console.warn("Invalid topup period '" + topupPeriod + "' or consumption period '" + consumptionPeriod + "' in playerLevel with id: " + level._id);
                                }

                                const failsEnoughConditions =
                                    conditionSet.andConditions
                                        ? failsTopupRequirements || failsConsumptionRequirements
                                        : failsTopupRequirements && failsConsumptionRequirements;

                                // const failsEnoughConditions = failsTopupRequirements || failsConsumptionRequirements;
                                if (failsEnoughConditions) {
                                    levelObjId = previousLevel._id;
                                    levelDownObj = previousLevel;
                                }
                            }
                        }
                    }

                    if (checkLevelUp) {
                        // Check if player can level UP and which level player can level up to
                        for (let i = 0; i < levels.length; i++) {
                            const level = levels[i];

                            if (level.value > playerObj.playerLevel.value) {

                                const conditionSets = level.levelUpConfig;

                                for (let j = 0; j < conditionSets.length; j++) {
                                    const conditionSet = conditionSets[j];

                                    const topupPeriod = conditionSet.topupPeriod;
                                    const topupField = topupFieldsByPeriod[topupPeriod];
                                    const playersTopupForPeriod = playerObj[topupField];
                                    const meetsTopupCondition = playersTopupForPeriod >= conditionSet.topupLimit;

                                    const consumptionPeriod = conditionSet.consumptionPeriod;
                                    const consumptionField = consumptionFieldsByPeriod[consumptionPeriod];
                                    const playersConsumptionForPeriod = playerObj[consumptionField];
                                    const meetsConsumptionCondition = playersConsumptionForPeriod >= conditionSet.consumptionLimit;

                                    if (topupField === undefined || consumptionField === undefined) {
                                        console.warn("Invalid topup period '" + topupPeriod + "' or consumption period '" + consumptionPeriod + "' in playerLevel with id: " + level._id);
                                        continue;
                                    }

                                    const meetsEnoughConditions =
                                        conditionSet.andConditions
                                            ? meetsTopupCondition && meetsConsumptionCondition
                                            : meetsTopupCondition || meetsConsumptionCondition;

                                    if (meetsEnoughConditions) {
                                        levelObjId = level._id;
                                        levelUpObj = level;
                                        levelUpObjId[levelUpCounter] = level._id;
                                        levelUpObjArr[levelUpCounter] = level;
                                        levelUpCounter ++;
                                    } else {

                                        if (!levelUpEnd) {
                                            if (!meetsEnoughConditions) {
                                                errorCode = constServerCode.NO_REACH_TOPUP_CONSUMPTION;
                                                errorMsg = 'NO_REACH_TOPUP_CONSUMPTION';
                                            }
                                            if (!meetsConsumptionCondition && meetsTopupCondition) {
                                                errorCode = constServerCode.NO_REACH_CONSUMPTION;
                                                errorMsg = 'NO_REACH_CONSUMPTION';
                                            }
                                            if (!meetsTopupCondition && meetsConsumptionCondition) {
                                                errorCode = constServerCode.NO_REACH_TOPUP;
                                                errorMsg = 'NO_REACH_TOPUP';
                                            }

                                        }
                                        // because it will loop All the level, so i set a flag in here,
                                        // to show what's the condition the player dont meet .
                                        // otherwise, later state will override the prev state
                                        levelUpEnd = true;
                                    }
                                }

                            }
                        }
                    }

                    if (levelObjId) {
                        // Perform the level up

                        let proposalData = {
                            // levelValue: checkLevelUp?levelUpObj.value:levelDownObj.value,
                            // levelName: checkLevelUp?levelUpObj.name: levelDownObj.name,
                            // levelObjId: levelObjId,
                            levelOldName: playerObj.playerLevel.name,
                            upOrDown: checkLevelUp?"LEVEL_UP":"LEVEL_DOWN",
                            playerObjId: playerObj._id,
                            playerName: playerObj.name,
                            playerId: playerObj.playerId,
                            platformObjId: playerObj.platform
                        };

                        let inputDevice = dbUtility.getInputDevice(userAgent,false);
                        let promResolve = Promise.resolve();

                        // if (checkLevelUp) {
                        //     for (let i = 0; i < levelUpCounter; i++) {
                        //         let tempProposal = JSON.parse(JSON.stringify(proposalData));
                        //         if (i > 0) {
                        //             tempProposal.levelOldName = levelUpObjArr[i - 1].name;
                        //         }
                        //         tempProposal.levelValue = levelUpObjArr[i].value;
                        //         tempProposal.levelName = levelUpObjArr[i].name;
                        //         tempProposal.levelObjId = levelUpObjId[i];
                        //         let proposalProm = function () {
                        //             return createProposal(tempProposal, inputDevice, i);
                        //         }
                        //         promResolve = promResolve.then(proposalProm);
                        //     }
                        //
                        // } else {
                        //     let tempProposal = JSON.parse(JSON.stringify(proposalData));
                        //     tempProposal.levelValue = levelDownObj.value;
                        //     tempProposal.levelName = levelDownObj.name;
                        //     tempProposal.levelObjId = levelObjId;
                        //     let proposalProm = function () {
                        //         return createProposal(tempProposal, inputDevice);
                        //     }
                        //     promResolve = promResolve.then(proposalProm);
                        // }

                        return dbconfig.collection_playerState.findOne({player: playerObj._id}).lean().then(
                            stateRec => {
                                if (!stateRec) {
                                    return new dbconfig.collection_playerState({
                                        player: playerObj._id,
                                        lastApplyLevelUpReward: Date.now()
                                    }).save();
                                } else {
                                    return dbconfig.collection_playerState.findOneAndUpdate({
                                        player: playerObj._id,
                                        lastApplyLevelUpReward: {$lt: new Date() - 1000}
                                    }, {
                                        $currentDate: {lastApplyLevelUpReward: true}
                                    }, {
                                        new: true
                                    });
                                }
                            }
                        ).then(
                            playerState => {
                                if (playerState) {
                                    if (checkLevelUp) {
                                        for (let i = 0; i < levelUpCounter; i++) {
                                            let tempProposal = JSON.parse(JSON.stringify(proposalData));
                                            if (i > 0) {
                                                tempProposal.levelOldName = levelUpObjArr[i - 1].name;
                                            }
                                            tempProposal.levelValue = levelUpObjArr[i].value;
                                            tempProposal.levelName = levelUpObjArr[i].name;
                                            tempProposal.levelObjId = levelUpObjId[i];
                                            let proposalProm = function () {
                                                return createProposal(tempProposal, inputDevice, i);
                                            }
                                            promResolve = promResolve.then(proposalProm);
                                        }

                                    } else {
                                        let tempProposal = JSON.parse(JSON.stringify(proposalData));
                                        tempProposal.levelValue = levelDownObj.value;
                                        tempProposal.levelName = levelDownObj.name;
                                        tempProposal.levelObjId = levelObjId;
                                        let proposalProm = function () {
                                            return createProposal(tempProposal, inputDevice);
                                        }
                                        promResolve = promResolve.then(proposalProm);
                                    }
                                    return promResolve;
                                } else {
                                    return Promise.reject ({
                                            name: "DBError",
                                            message: "level change fail, please contact cs"
                                    })
                                }
                            }
                        );


                        // If there is a reward for this level, give it to the player
                        // if (levelUpObj && levelUpObj.reward && levelUpObj.reward.bonusCredit) {
                        //     //console.log(`Giving the player credit: ${levelUpObj.reward.bonusCredit}`);
                        //     var proposalData = {
                        //         rewardAmount: levelUpObj.reward.bonusCredit,
                        //         isRewardTask: levelUpObj.reward.isRewardTask,
                        //         levelValue: levelUpObj.value,
                        //         levelName: levelUpObj.name,
                        //         levelOldName: playerObj.playerLevel.name,
                        //         playerObjId: playerObj._id,
                        //         playerName: playerObj.name,
                        //         playerId: playerObj.playerId,
                        //         platformObjId: playerObj.platform
                        //     };
                        //     return dbProposal.createProposalWithTypeName(playerObj.platform, constProposalType.PLAYER_LEVEL_UP, {data: proposalData});
                        // }


                    }
                    else {
                        if(showReject){
                            return Q.reject({
                                status: errorCode,
                                name: "DataError",
                                message: errorMsg
                            })
                        }else{
                            Q.resolve(true);
                        }
                    }
                }
                else {
                    // Either player, player.playerLevel, the platform or the platform's playerLevels were not found.
                    //console.warn("No player, playerLevel or platform found for playerObjId: " + playerObjId);
                    // Original code would sometimes expect the player or the playerLevels to be undefined,
                    // if the player had no consumption, or they were already on the highest level.
                    //return "No_Level_Change";
                    if(showReject){
                        return Q.reject({
                            name: "DataError",
                            message: levelErrorMsg
                        })
                    }else{
                        Q.resolve(true);
                    }
                }
            },
            function (error) {
                if (playerObj.permission && playerObj.permission.levelChange === false) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DBError",
                        message: "level change fail, please contact cs"
                    });
                } else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DBError", message: "Error in finding player level", error: error
                    });
                }
            }
        );
    },

    getPlayerAlmostLevelupReport: function (platform, percentage, skip, limit, sortCol, newSummary) {
        var resultArr = [];
        var playerLevelData = {};
        const topupFieldsByPeriod = {
            DAY: 'dailyTopUpSum',
            WEEK: 'weeklyTopUpSum',
            NONE: 'topUpSum'
        };
        const consumptionFieldsByPeriod = {
            DAY: 'dailyConsumptionSum',
            WEEK: 'weeklyConsumptionSum',
            NONE: 'consumptionSum'
        };
        skip = skip || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {percentage: -1};
        return dbPlayerLevel.getPlayerLevel({platform: platform})
            .then(playerLevel => {
                playerLevel.map(level => {
                    playerLevelData[level.value] = level;
                })
                return dbPlayerInfo.getPlayersByPlatform(platform, 0)
            })
            .then(
                players => {
                    if (players && players.length > 0) {
                        for (var index in players) {
                            if (!players[index] || !players[index].playerLevel || !players[index].playerLevel.levelUpConfig) {
                                continue;
                            }
                            // const conditionSets = players[index].playerLevel.levelUpConfig;
                            var nextLevelValue = players[index].playerLevel.value + 1;
                            const conditionSets = playerLevelData[nextLevelValue] ? playerLevelData[nextLevelValue].levelUpConfig : null;
                            if (!conditionSets) {
                                continue;
                            }
                            var playerObj = players[index];
                            var showPercentage = 0;
                            var valid = false;
                            for (let j = 0; j < conditionSets.length; j++) {
                                const conditionSet = conditionSets[j];
                                const topupPeriod = conditionSet.topupPeriod;
                                const topupField = topupFieldsByPeriod[topupPeriod];
                                const playersTopupForPeriod = playerObj[topupField];
                                const meetsTopupCondition = playersTopupForPeriod >= conditionSet.topupLimit * percentage;

                                const consumptionPeriod = conditionSet.consumptionPeriod;
                                const consumptionField = consumptionFieldsByPeriod[consumptionPeriod];
                                const playersConsumptionForPeriod = playerObj[consumptionField];
                                const meetsConsumptionCondition = playersConsumptionForPeriod >= conditionSet.consumptionLimit * percentage;
                                if (topupField === undefined || consumptionField === undefined) {
                                    continue;
                                }

                                let divider = conditionSet.topupLimit + conditionSet.consumptionLimit;
                                var a = (divider !== 0) ? ((playersTopupForPeriod + playersConsumptionForPeriod) / divider ) : 1;
                                if (a > 1) {
                                    a = 1;
                                }
                                if (a >= percentage) {
                                    valid = true;
                                    if (a > showPercentage) {
                                        showPercentage = a;
                                    }
                                }
                            }
                            if (valid) {
                                playerObj.percentage = showPercentage;
                                resultArr.push(playerObj);
                            }
                        }
                        return resultArr;
                    } else {
                        //no player found
                    }
                }
            ).then(
                data => {
                    var key = Object.keys(sortCol)[0];
                    var val = sortCol[key];
                    data.sort((m, n) => {
                        var a = m[key], b = n[key];
                        if (key == "playerLevel.name") {
                            a = m.playerLevel.value;
                            b = n.playerLevel.value;
                        }
                        //console.log(a, b, key == "playerId", key == "name");
                        if (a != null && b != null) {
                            if (key == "name" || key == "playerId" || key == "playerLevel.name") {

                                var test = 0;
                                if (a > b) {
                                    test = 1
                                }
                                if (a < b) {
                                    test = -1
                                }
                                return test * val;
                            } else {
                                return (a - b) * val;
                            }
                        }
                    })
                    var summary = {};
                    if (newSummary) {
                        summary.topupTotal = 0, summary.topupDay = 0, summary.topupWeek = 0;
                        summary.consumTotal = 0, summary.consumDay = 0, summary.consumWeek = 0;
                        data.forEach(item => {
                            summary.topupTotal += item.topUpSum;
                            summary.topupDay += item.dailyTopUpSum;
                            summary.topupWeek += item.weeklyTopUpSum;
                            summary.consumTotal += item.consumptionSum;
                            summary.consumDay += item.dailyConsumptionSum;
                            summary.consumWeek += item.weeklyConsumptionSum;
                        })
                    }
                    return {data: data.slice(skip, skip + limit), size: data.length, summary: summary};
                }
            );
    },

    // report
    getPlayerDomainReport: function (platform, para, index, limit, sortCol) {
        if (para.playerType === 'Partner') {
            return dbPartner.getPartnerDomainReport(platform, para, index, limit, sortCol);
        }
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'registrationTime': -1};
        if (sortCol.phoneArea) {
            let sortOrder = sortCol.phoneArea;
            sortCol = {
                phoneProvince: sortOrder,
                phoneCity: sortOrder
            }
        }
        else if (sortCol.ipArea) {
            let sortOrder = sortCol.ipArea;
            sortCol = {
                province: sortOrder,
                city: sortOrder
            }
        }
        else if (sortCol.os) {
            let sortOrder = sortCol.os;
            sortCol = {
                registrationInterface: sortOrder,
                "userAgent.0.os": sortOrder
            }
        }
        else if (sortCol.browser) {
            let sortOrder = sortCol.browser;
            sortCol = {
                registrationInterface: sortOrder,
                "userAgent.0.browser": sortOrder
            }
        }

        let query = {platform: platform};
        para.startTime ? query.registrationTime = {$gte: new Date(para.startTime)} : null;
        (para.endTime && !query.registrationTime) ? (query.registrationTime = {$lt: new Date(para.endTime)}) : null;
        (para.endTime && query.registrationTime) ? (query.registrationTime['$lt'] = new Date(para.endTime)) : null;
        para.name ? query.name = para.name : null;
        para.realName ? query.realName = para.realName : null;
        para.domain ? query.domain = new RegExp('.*' + para.domain + '.*', 'i') : null;
        para.sourceUrl ? query.sourceUrl = new RegExp('.*' + para.sourceUrl + '.*', 'i') : null;
        para.registrationInterface ? query.registrationInterface = para.registrationInterface : null;
        para.csPromoteWay && para.csPromoteWay.length > 0 ? query.promoteWay = {$in: para.csPromoteWay} : null;
        para.csOfficer && para.csOfficer.length > 0 ? query.csOfficer = {$in: para.csOfficer} : null;

        if (para.isNewSystem === 'old') {
            query.isNewSystem = {$ne: true};
        } else if (para.isNewSystem === 'new') {
            query.isNewSystem = true;
        }

        switch (para.playerType) {
            case 'Test Player':
                query.isRealPlayer = false;
                break;
            case 'Real Player (all)':
                query.isRealPlayer = true;
                break;
            case 'Real Player (Individual)':
                query.isRealPlayer = true;
                query.partner = null;
                break;
            case 'Real Player (Under Partner)':
                query.isRealPlayer = true;
                query.partner = {$ne: null};
        }

        if (para.topUpTimesValue) {
            switch (para.topUpTimesOperator) {
                case '<=':
                    query.topUpTimes = {$lte: para.topUpTimesValue};
                    break;
                case '>=':
                    query.topUpTimes = {$gte: para.topUpTimesValue};
                    break;
                case '=':
                    query.topUpTimes = para.topUpTimesValue;
                    break;
                case 'range':
                    query.topUpTimes = {$gte: para.topUpTimesValue, $lte: para.topUpTimesValueTwo};
                    break;
            }
        }

        if (para.playerValue) {
            switch (para.playerValueOperator) {
                case '<=':
                    query.valueScore = {$lte: para.playerValue};
                    break;
                case '>=':
                    query.valueScore = {$gte: para.playerValue};
                    break;
                case '=':
                    query.valueScore = para.playerValue;
                    break;
                case 'range':
                    query.valueScore = {$gte: para.playerValue, $lte: para.playerValueTwo};
                    break;
            }
        }

        let count = dbconfig.collection_players.find(query).count();
        let detail = dbconfig.collection_players.find(query).sort(sortCol).skip(index).limit(limit)
            .populate({path: 'partner', model: dbconfig.collection_partner}).lean()
            .populate({path: 'csOfficer', model: dbconfig.collection_admin, select: "adminName"}).lean();

        return Q.all([count, detail]).then(
            data => {
                let players = data[1];
                for (let i = 0, len = players.length; i < len; i++) {
                    dbPlayerCredibility.calculatePlayerValue(players[i]._id);
                }

                return {data: data[1], size: data[0]}
            }
        )
    },

    getNewAccountReportData: function (platform, startTime, endTime) {
        var retData = {};
        var timeQuery = {
            $gte: startTime,
            $lt: endTime
        };
        var query = {
            platform: platform,
            registrationTime: timeQuery
        };
        var a = dbconfig.collection_players.find(query).count();
        var b = dbconfig.collection_players.aggregate([{
            $match: query,
        }, {
            $group: {
                _id: "$domain",
                num: {$sum: 1}
            }
        }, {
            $project: {
                domain: "$_id",
                num: "$num"
            }
        }]);
        var partnerQuery = {platform: platform, registrationTime: timeQuery}
        var c = dbconfig.collection_players.aggregate(
            {$match: partnerQuery},
            {
                $group: {
                    _id: "$partner",
                    num: {$sum: 1}
                }
            }
        );
        var topupQuery = {
            platform: platform,
            topUpTimes: {$gt: 0},
            topUpSum: {$gt: 0},
            registrationTime: timeQuery
        };
        var d = dbconfig.collection_players.find(topupQuery).count();

        let topUpMultipleTimesQuery = {
            platform: platform,
            topUpTimes: {$gt: 1},
            topUpSum: {$gt: 0},
            registrationTime: timeQuery
        }

        let e = dbconfig.collection_players.find(topUpMultipleTimesQuery).count();
        // var d = dbconfig.collection_players.find(query, {_id: 1}).lean().then(
        //     players => {
        //         if (players && players.length > 0) {
        //             var playerIds = players.map(player => player._id);
        //             return dbconfig.collection_playerTopUpRecord.aggregate(
        //                 {
        //                     $match: {
        //                         playerId: {$in: playerIds},
        //                         platformId: platform,
        //                         amount: {$gt: 0}
        //                     }
        //                 },
        //                 {
        //                     $group: {
        //                         _id: "$playerId"
        //                     }
        //                 }
        //             ).then(
        //                 topUpPlayers => {
        //                     if (topUpPlayers) {
        //                         return topUpPlayers.length;
        //                     }
        //                     else {
        //                         return 0;
        //                     }
        //                 }
        //             );
        //         }
        //         else {
        //             return 0;
        //         }
        //     }
        // );

        return Q.all([a, b, c, d, e]).then(
            data => {
                retData = data;
                var prop = [];
                if (data && data[2]) {
                    data[2].map(item => {
                        if (item._id) {
                            prop.push(dbconfig.collection_partner.findOne({_id: item._id}));
                        }
                    })
                }
                return Q.all(prop);
            },
            err => {
                return err;
            }
        ).then(partnerData => {
            var partnerDataObj = {};
            partnerData.map(item => {
                partnerDataObj[item._id] = item;
            })
            retData[2].forEach(item => {
                item.partner = partnerDataObj[item._id];
            })
            return retData;
        })
    },

    /*
     * Get player consumption and top up amount for day
     *
     */
    getPlayerStatus: function (playerId, bDay) {
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {
                path: "platform",
                model: dbconfig.collection_platform
            }
        ).then(
            function (playerData) {
                if (playerData && playerData.platform) {
                    //var times = bDay ? dbUtility.getCurrentDailySettlementTime(playerData.platform.dailySettlementHour, playerData.platform.dailySettlementMinute)
                    //    : dbUtility.getCurrentWeeklySettlementTime(playerData.platform.weeklySettlementDay, playerData.platform.weeklySettlementHour, playerData.platform.weeklySettlementMinute);
                    var times = bDay ? dbUtility.getTodaySGTime() : dbUtility.getCurrentWeekSGTime();
                    var startTime = times.startTime;
                    var endTime = times.endTime;
                    var topUpProm = dbconfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                platformId: playerData.platform._id,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                playerId: playerData._id
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId", platformId: "$platformId"},
                                amount: {$sum: "$amount"}
                            }
                        }
                    ).exec();
                    var consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate(
                        {
                            $match: {
                                platformId: playerData.platform._id,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                playerId: playerData._id
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId", platformId: "$platformId"},
                                validAmount: {$sum: "$validAmount"}
                            }
                        }
                    ).exec();
                    return Q.all([topUpProm, consumptionProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cant find player"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in finding player", error: error});
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    return {
                        topUpAmount: data[0][0] ? data[0][0].amount : 0,
                        consumptionAmount: data[1][0] ? data[1][0].validAmount : 0
                    };
                }
                else {
                    return {
                        topUpAmount: 0,
                        consumptionAmount: 0
                    };
                }
            },
            function (error) {
                return Q.reject({
                    name: "DBError",
                    message: "Error in finding player top up and consumption records",
                    error: error
                });
            }
        );
    },

    /*
     * Get player consumption and top up amount for past month
     *
     */
    getPlayerMonthStatus: function (playerId) {
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {
                path: "platform",
                model: dbconfig.collection_platform
            }
        ).then(
            function (playerData) {
                if (playerData && playerData.platform) {
                    var time = dbUtility.getCurrentMonthSGTIme();
                    var endTime = time.endTime;
                    var startTime = time.startTime;

                    var topUpProm = dbconfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                platformId: playerData.platform._id,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                playerId: playerData._id
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId", platformId: "$platformId"},
                                amount: {$sum: "$amount"}
                            }
                        }
                    ).exec();
                    var consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate(
                        {
                            $match: {
                                platformId: playerData.platform._id,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                playerId: playerData._id
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId", platformId: "$platformId"},
                                validAmount: {$sum: "$validAmount"}
                            }
                        }
                    ).exec();
                    return Q.all([topUpProm, consumptionProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cant find player"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in finding player", error: error});
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    return {
                        topUpAmount: data[0][0] ? data[0][0].amount : 0,
                        consumptionAmount: data[1][0] ? data[1][0].validAmount : 0
                    };
                }
                else {
                    return {
                        topUpAmount: 0,
                        consumptionAmount: 0
                    };
                }
            },
            function (error) {
                return Q.reject({
                    name: "DBError",
                    message: "Error in finding player top up and consumption records",
                    error: error
                });
            }
        );
    },
    /*
     * Get all the player level of platform
     * @param {String} playerId
     */
    getPlayerPlatformLevel: function (playerId) {
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            function (data) {
                if (data && data.platform) {
                    return dbconfig.collection_playerLevel.find({platform: data.platform}).sort({value: 1}).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
    },

    /*
     * Get player credit transfer progress
     */
    getTransferProgress: function () {
        //todo::get progress from provider server api
        return Q.resolve({steps: 5, currentStep: 3, stepContent: "get balance."});
    },

    countDailyNewPlayerByPlatform: function (platformId, startDate, endDate) {
        var proms = [];
        var dayStartTime = startDate;
        while (dayStartTime.getTime() < endDate.getTime()) {
            var dayEndTime = new Date(dayStartTime.getTime() + 24 * 60 * 60 * 1000);
            var matchObj = {
                platform: platformId,
                registrationTime: {$gte: dayStartTime, $lt: dayEndTime}
            };
            proms.push(
                dbconfig.collection_players.find(matchObj).count()
            );
            dayStartTime = dayEndTime;
        }
        return Q.all(proms).then(
            data => {
                var i = 0;
                var res = data.map(
                    dayData => {
                        var date = dbUtility.getLocalTimeString(dbUtility.getDayStartTime(new Date(startDate.getTime() + (i++) * 24 * 60 * 60 * 1000)), "YYYY-MM-DD");
                        return {
                            _id: {date: date},
                            number: dayData
                        }
                    }
                );
                return res;
            }
        );
    },

    countDailyPlayerBonusByPlatform: function (platformId, startDate, endDate) {

        return dbconfig.collection_proposalType.find({
            platformId: platformId,
            name: constProposalType.PLAYER_BONUS
        })
            .then(function (typeData) {

                var bonusIds = [];
                if (Array.isArray(typeData)) {

                    for (var type in typeData) {
                        bonusIds.push(ObjectId(typeData[type]._id));
                    }
                } else {
                    bonusIds.push(typeData['_id']);
                }
                var queryObj = {
                    type: {$in: bonusIds}
                };
                if (platformId) {
                    queryObj['data.platformId'] = ObjectId(platformId);
                }
                queryObj.status = {$in: ['Success', 'Approved']};
                if (startDate || endDate) {
                    queryObj.createTime = {};
                }
                if (startDate) {
                    queryObj.createTime["$gte"] = new Date(startDate);
                }
                if (endDate) {
                    queryObj.createTime["$lte"] = new Date(endDate);
                }

                // adjust the timezone
                var timezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
                let positiveTimeOffset = Math.abs(timezoneOffset);

                if (parseInt(timezoneOffset) > 0) {
                    var timezoneAdjust = {
                        year: {$year: {$subtract: ['$createTime', positiveTimeOffset]}},
                        month: {$month: {$subtract: ['$createTime', positiveTimeOffset]}},
                        day: {$dayOfMonth: {$subtract: ['$createTime', positiveTimeOffset]}}
                    }
                } else {
                    var timezoneAdjust = {
                        year: {$year: {$add: ['$createTime', positiveTimeOffset]}},
                        month: {$month: {$add: ['$createTime', positiveTimeOffset]}},
                        day: {$dayOfMonth: {$add: ['$createTime', positiveTimeOffset]}}
                    }
                }

                var proposalProm = dbconfig.collection_proposal.aggregate([
                    {$match: queryObj},
                    {
                        $group: {
                            _id: timezoneAdjust,
                            number: {$sum: '$data.amount'}
                        }
                    }
                ])
                return Q.all([proposalProm]).then(
                    data => {
                        return data[0]
                    }
                );
            });
    },
    countDailyPlayerBonusBySinglePlatform: function (platformId, startDate, endDate, period) {
        var proms = [];
        var dayStartTime = startDate;
        var getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                };
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }

        return dbconfig.collection_proposalType.find({
            platformId: platformId,
            name: constProposalType.PLAYER_BONUS
        })

            .then(function (typeData) {

                var bonusIds = [];
                if (Array.isArray(typeData)) {
                    for (var type in typeData) {
                        bonusIds.push(ObjectId(typeData[type]._id));
                    }
                } else {
                    bonusIds.push(typeData['_id']);
                }
                var queryObj = {
                    type: {$in: bonusIds}
                };

                queryObj['status'] = {$in: ['Success', 'Approved']};

                while (dayStartTime.getTime() < endDate.getTime()) {
                    var dayEndTime = getNextDate.call(this, dayStartTime);

                    queryObj["createTime"] = {$gte: new Date(dayStartTime), $lt: new Date(dayEndTime)};
                    if (platformId != 'all') {
                        queryObj['data.platformId'] = ObjectId(platformId);
                    }
                    proms.push(dbconfig.collection_proposal.find(queryObj));
                    dayStartTime = dayEndTime;
                }

                return Q.all(proms).then(data => {
                    var tempDate = startDate;
                    var res = data.map(dayData => {
                        if (dayData[0]) {
                            var obj = {_id: tempDate, number: dayData[0]['data']['amount']};
                        } else {
                            var obj = {_id: tempDate, number: 0};
                        }

                        tempDate = getNextDate(tempDate);
                        return obj;
                    });
                    return res;
                });
            });
    },
    /* 
     * Get new player count 
     */
    countNewPlayerbyPlatform: function (platformId, startDate, endDate, period) {
        // var options = {};
        // switch (period) {
        //     case 'day':
        //         options.date = {$dateToString: {format: "%Y-%m-%d", date: "$registrationTime"}};
        //         break;
        //     case 'week':
        //         options.week = {$floor: {$divide: [{$subtract: ["$registrationTime", startDate]}, 604800000]}};
        //         break;
        //     case 'month':
        //     default:
        //         options.year = {$year: "$registrationTime"};
        //         options.month = {$month: "$registrationTime"};
        // }
        //
        // var matchingCond = {
        //     registrationTime: {$gte: startDate, $lt: endDate}
        // }
        // if (platformId != 'all') {
        //     matchingCond.platform = platformId;
        // }
        // return dbconfig.collection_players.aggregate(
        //     {
        //         $match: matchingCond
        //     },
        //     {
        //         $group: {_id: options, number: {$sum: 1}}
        //     }).exec();
        var proms = [];
        var dayStartTime = startDate;
        var getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                };
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }
        while (dayStartTime.getTime() < endDate.getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);
            var matchObj = {registrationTime: {$gte: dayStartTime, $lt: dayEndTime}};
            if (platformId != 'all') {
                matchObj.platform = platformId;
            }
            proms.push(dbconfig.collection_players.find(matchObj).count());
            dayStartTime = dayEndTime;
        }
        return Q.all(proms).then(data => {
            var tempDate = startDate;
            var res = data.map(dayData => {
                var obj = {_id: {date: tempDate}, number: dayData}
                tempDate = getNextDate(tempDate);
                return obj;
            });
            return res;
        });

    },

    dashboardTopupORConsumptionGraphData: function (platformId, period, type) {
        var dayDate = dbUtility.getTodaySGTime();
        var weekDates = dbUtility.getTodaySGTime();
        weekDates.startTime = new Date(weekDates.startTime.getTime() - 7 * 24 * 3600 * 1000);
        weekDates.endTime = dayDate.startTime;
        var returnedData;
        var calculation = null;
        switch (type) {
            case 'topup' :
                calculation = {$sum: "$topUpAmount"};
                break;
            case 'consumption' :
                calculation = {$sum: "$consumptionAmount"}
        }
        return dbconfig.collection_platformDaySummary.aggregate(
            {
                $match: {
                    date: {$gte: weekDates.startTime, $lt: weekDates.endTime},
                    platformId: platformId
                }
            },
            {
                $group: {
                    _id: {date: "$date"},//{date: {$dateToString: {format: "%Y-%m-%d", date: "$date"}}},
                    number: calculation
                }
            }
        ).then(
            data => {
                returnedData = Object.assign([], data);
                if (type == "topup") {
                    return dbPlayerTopUpRecord.getTopUpTotalAmountForAllPlatform(dayDate.startTime, dayDate.endTime, platformId)
                } else if (type == "consumption") {
                    return dbPlayerConsumptionRecord.getConsumptionTotalAmountForAllPlatform(dayDate.startTime, dayDate.endTime, platformId)
                }
            }
        ).then(
            data1 => {
                if (data1 && data1[0]) {
                    var newRecord = {};
                    newRecord._id = {date: dayDate.startTime};
                    newRecord.number = data1[0].totalAmount;
                    returnedData.push(newRecord);
                }
                return returnedData;
            }
        ).then(
            data => {
                return data.map(item => {
                    item._id.date = dbUtility.getLocalTimeString(item._id.date, "YYYY-MM-DD");
                    return item
                })
            }
        )
    },
    countTopUpORConsumptionByPlatform: function (platformId, startDate, endDate, period, type) {
        // var options = {};
        // var calculation = null;
        // switch (period) {
        //     case 'day':
        //         options.date = {$dateToString: {format: "%Y-%m-%d", date: "$date"}};
        //         break;
        //     case 'week':
        //         options.week = {$floor: {$divide: [{$subtract: ["$date", startDate]}, 604800000]}};
        //         break;
        //     case 'month':
        //     default:
        //         options.year = {$year: "$date"};
        //         options.month = {$month: "$date"};
        // }
        // switch (type) {
        //     case 'topup' :
        //         calculation = {$sum: "$topUpAmount"};
        //         break;
        //     case 'consumption' :
        //         calculation = {$sum: "$consumptionAmount"}
        // }
        // var matchOption = {
        //     date: {$gte: startDate, $lt: endDate}
        // }
        // if (platformId != 'all') {
        //     matchOption.platformId = platformId;
        // }
        // return dbconfig.collection_platformDaySummary.aggregate(
        //     {
        //         $match: matchOption
        //     },
        //     {
        //         $group: {_id: options, number: calculation}
        //     }).then(
        //     data => {
        //         return data;
        //     }
        // );
        var proms = [];
        var calculation = null;
        switch (type) {
            case 'topup' :
                calculation = {$sum: "$topUpAmount"};
                break;
            case 'consumption' :
                calculation = {$sum: "$consumptionAmount"}
        }
        var dayStartTime = startDate;
        var getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }
        while (dayStartTime.getTime() < endDate.getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);
            var matchObj = {date: {$gte: dayStartTime, $lt: dayEndTime}};
            if (platformId != 'all') {
                matchObj.platformId = platformId;
            }
            proms.push(dbconfig.collection_platformDaySummary.aggregate(
                {$match: matchObj}, {
                    $group: {
                        _id: null,
                        calc: calculation
                    }
                }))
            dayStartTime = dayEndTime;
        }
        return Q.all(proms).then(data => {
            var tempDate = startDate;
            var res = data.map(item => {
                var obj = {_id: {date: tempDate}, number: item[0] ? item[0].calc : 0}
                tempDate = getNextDate(tempDate);
                return obj;
            });
            return res;
        });

    },

    /* 
     * Get active player count 
     */
    countActivePlayerbyPlatform: function (platformId, startDate, endDate) {
        // var options = {};
        // options.date = {$dateToString: {format: "%Y-%m-%d", date: "$date"}};
        //
        // return dbconfig.collection_platformDaySummary.aggregate(
        //     {
        //         $match: {
        //             platformId: platformId,
        //             date: {$gte: startDate, $lt: endDate}
        //         }
        //     },
        //     {
        //         $group: {_id: options, number: {$sum: "$activePlayers"}}
        //     }
        // ).exec();
        return dbconfig.collection_platformDaySummary.find(
            {
                platformId: platformId,
                date: {$gte: startDate, $lt: endDate}
            }
        ).exec();
    },

    /*
     * Get new players
     */
    countNewPlayersAllPlatform: function (startDate, endDate, platform) {
        var matchObj = {
            registrationTime: {$gte: startDate, $lt: endDate},
        }
        if (platform !== 'all') {
            matchObj.platform = platform
        }
        return dbconfig.collection_players.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: "$platform",
                    number: {$sum: 1}
                }
            }
        ).exec().then(
            function (data) {
                return dbconfig.collection_platform.populate(data, {path: '_id', model: dbconfig.collection_platform})
            }
        )
    },

    /*
     * Get active players
     */
    countActivePlayerALLPlatform: function (startTime, endTime) {
        return dbconfig.collection_platformDaySummary.aggregate(
            {
                $match: {
                    date: {$gte: startTime, $lt: endTime}
                }
            },
            {
                $group: {
                    _id: "$platformId",
                    number: {$sum: "$activePlayers"}
                }
            }
        ).exec().then(
            function (data) {
                return dbconfig.collection_platform.populate(data, {path: '_id', model: dbconfig.collection_platform})
            }
        )
    },
    /*
     * Get bonus amount from each platform
     */
    countBonusAmountALLPlatform: function (startTime, endTime) {

        return dbconfig.collection_proposalType.find({
            name: constProposalType.PLAYER_BONUS
        }).populate({path: "platformId", model: dbconfig.collection_platform})
            .then(function (typeData) {

                var bonusIds = [];
                for (var type in typeData) {
                    bonusIds.push(ObjectId(typeData[type]._id));
                }

                var queryObj = {
                    type: {$in: bonusIds}
                };
                queryObj.status = {$in: ['Success', 'Approved']};

                if (startTime || endTime) {
                    queryObj.createTime = {};
                }
                if (startTime) {
                    queryObj.createTime["$gte"] = new Date(startTime);
                }
                if (endTime) {
                    queryObj.createTime["$lte"] = new Date(endTime);
                }

                var proposalProm = dbconfig.collection_proposal.aggregate([
                    {$match: queryObj},
                    {
                        $group: {
                            _id: "$data.platformId",
                            number: {$sum: "$data.amount"}
                        }
                    }
                ])
                return Q.all([proposalProm]).then(
                    data => {
                        return data[0]
                    }
                );
            });
    },

    /*
     * Get bonus list
     */
    getBonusList: function () {
        //get data from provider server
        return pmsAPI.bonus_getBonusList({});
    },

    /*
     * Apply bonus
     */
    applyBonus: function (userAgent, playerId, bonusId, amount, honoreeDetail, bForce, adminInfo) {
        let ximaWithdrawUsed = 0;
        if (amount < 100 && !adminInfo) {
            return Q.reject({name: "DataError", errorMessage: "Amount is not enough"});
        }
        let player = null;
        let bonusDetail = null;
        let bUpdateCredit = false;
        let resetCredit = function (playerObjId, platformObjId, credit, error) {
            //reset player credit if credit is incorrect
            return dbconfig.collection_players.findOneAndUpdate(
                {
                    _id: playerObjId,
                    platform: platformObjId
                },
                {$inc: {validCredit: credit}},
                {new: true}
            ).then(
                resetPlayer => {
                    // dbLogger.createCreditChangeLog(playerObjId, platformObjId, credit, constPlayerCreditChangeType.PLAYER_BONUS_RESET_CREDIT, resetPlayer.validCredit, null, error);
                    if (error) {
                        return Q.reject(error);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "player valid credit abnormal."});
                    }
                }
            );
        };
        bonusId = parseInt(bonusId);
        amount = parseInt(amount);

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "lastPlayedProvider", model: dbconfig.collection_gameProvider}).lean().then(
                playerData => {
                    //check if player has pending proposal to update bank info
                    if (playerData) {
                        return dbconfig.collection_proposalType.findOne({
                            platformId: playerData.platform._id,
                            name: constProposalType.UPDATE_PLAYER_BANK_INFO
                        }).then(
                            proposalType => {
                                if (proposalType) {
                                    return dbconfig.collection_proposal.find({
                                        type: proposalType._id,
                                        "data._id": String(playerData._id)
                                    }).populate(
                                        {path: "process", model: dbconfig.collection_proposalProcess}
                                    ).lean();
                                }
                                else {
                                    return Q.reject({
                                        name: "DataError",
                                        errorMessage: "Cannot find proposal type"
                                    });
                                }
                            }
                        ).then(
                            proposals => {
                                if (proposals && proposals.length > 0) {
                                    var bExist = false;
                                    proposals.forEach(
                                        proposal => {
                                            if (proposal.status == constProposalStatus.PENDING ||
                                                ( proposal.process && proposal.process.status == constProposalStatus.PENDING)) {
                                                bExist = true;
                                            }
                                        }
                                    );
                                    if (!bExist || bForce) {
                                        return playerData;
                                    }
                                    else {
                                        return Q.reject({
                                            name: "DataError",
                                            errorMessage: "Player is updating bank info"
                                        });
                                    }
                                }
                                else {
                                    return playerData;
                                }
                            }
                        );
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot find player"});
                    }
                }
            ).then(
                playerData => {
                    if (playerData) {
                        // if ((!playerData.permission || !playerData.permission.applyBonus) && !bForce) {
                        //     return Q.reject({
                        //         status: constServerCode.PLAYER_NO_PERMISSION,
                        //         name: "DataError",
                        //         errorMessage: "Player does not have this permission"
                        //     });
                        // }
                        // if (!playerData.bankName || !playerData.bankAccountName || !playerData.bankAccountType || !playerData.bankAccountCity
                        //     || !playerData.bankAccount || !playerData.bankAddress || !playerData.phoneNumber) {
                        //     return Q.reject({
                        //         status: constServerCode.PLAYER_INVALID_PAYMENT_INFO,
                        //         name: "DataError",
                        //         errorMessage: "Player does not have valid payment information"
                        //     });
                        // }

                        let todayTime = dbUtility.getTodaySGTime();
                        let creditProm = Q.resolve();

                        if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.status == constGameStatus.ENABLE) {
                            creditProm = dbPlayerInfo.transferPlayerCreditFromProvider(playerData.playerId, playerData.platform._id, playerData.lastPlayedProvider.providerId, -1, null, true);
                        }

                        return creditProm.then(
                            () => {
                                return dbconfig.collection_players.findOne({playerId: playerId})
                                    .populate({path: "platform", model: dbconfig.collection_platform})
                                    .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel})
                                    .lean();
                            }
                        ).then(
                            playerData => {
                                //check if player has enough credit
                                player = playerData;
                                if ((parseFloat(playerData.validCredit).toFixed(2)) < parseFloat(amount)) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                        name: "DataError",
                                        errorMessage: "Player does not have enough credit."
                                    });
                                }
                                return dbconfig.collection_proposal.find(
                                    {
                                        mainType: "PlayerBonus",
                                        createTime: {
                                            $gte: todayTime.startTime,
                                            $lt: todayTime.endTime
                                        },
                                        "data.playerId": playerId,
                                        status: {
                                            $in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]
                                        }
                                    }
                                ).lean();
                            }
                        ).then(
                            todayBonusApply => {
                                let changeCredit = -amount;
                                let finalAmount = amount;
                                let creditCharge = 0;
                                let amountAfterUpdate = player.validCredit - amount;
                                let playerLevelVal = player.playerLevel.value;
                                if (playerData.platform.bonusSetting) {
                                    // let bonusSetting = playerData.platform.bonusSetting.find((item) => {
                                    //     return item.value == playerLevelVal
                                    // });

                                    let bonusSetting = {};

                                    for(let x in playerData.platform.bonusSetting){
                                        if(playerData.platform.bonusSetting[x].value == playerLevelVal){
                                            bonusSetting = playerData.platform.bonusSetting[x];
                                        }
                                    }
                                    if (todayBonusApply.length >= bonusSetting.bonusCharges && bonusSetting.bonusPercentageCharges > 0) {
                                        creditCharge = (finalAmount * bonusSetting.bonusPercentageCharges) * 0.01;
                                        finalAmount = finalAmount - creditCharge;
                                    }
                                }

                                if (playerData.ximaWithdraw) {
                                    ximaWithdrawUsed = Math.min(amount, playerData.ximaWithdraw);
                                }

                                return dbconfig.collection_players.findOneAndUpdate(
                                    {
                                        _id: player._id,
                                        platform: player.platform._id
                                    },
                                    {$inc: {validCredit: changeCredit}},
                                    {new: true}
                                ).then(
                                    //check if player's credit is correct after update
                                    updateRes => dbconfig.collection_players.findOne({_id: player._id})
                                ).then(
                                    newPlayerData => {
                                        if (newPlayerData) {
                                            bUpdateCredit = true;
                                            //to fix float problem...
                                            if (newPlayerData.validCredit < -0.02) {
                                                //credit will be reset below
                                                return Q.reject({
                                                    status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                                    name: "DataError",
                                                    errorMessage: "Player does not have enough credit.",
                                                    data: '(detected after withdrawl)'
                                                });
                                            }
                                            //check if player's credit is correct after update
                                            if (amountAfterUpdate != newPlayerData.validCredit) {
                                                console.log("PlayerBonus: Update player credit failed", amountAfterUpdate, newPlayerData.validCredit);
                                                return Q.reject({
                                                    status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                                    name: "DataError",
                                                    errorMessage: "Update player credit failed",
                                                    data: '(detected after withdrawl)'
                                                });
                                            }
                                            //fix player negative credit
                                            if (newPlayerData.validCredit < 0 && newPlayerData.validCredit > -0.02) {
                                                newPlayerData.validCredit = 0;
                                                dbconfig.collection_players.findOneAndUpdate(
                                                    {_id: newPlayerData._id, platform: newPlayerData.platform},
                                                    {validCredit: 0}
                                                ).then();
                                            }
                                            player.validCredit = newPlayerData.validCredit;
                                            //create proposal
                                            var proposalData = {
                                                creator: adminInfo || {
                                                    type: 'player',
                                                    name: player.name,
                                                    id: playerId
                                                },
                                                playerId: playerId,
                                                playerObjId: player._id,
                                                playerName: player.name,
                                                bonusId: bonusId,
                                                platformId: player.platform._id,
                                                platform: player.platform.platformId,
                                                bankTypeId: player.bankName,
                                                amount: finalAmount,
                                                // bonusCredit: bonusDetail.credit,
                                                curAmount: player.validCredit,
                                                remark: player.remark,
                                                lastSettleTime: new Date(),
                                                honoreeDetail: honoreeDetail,
                                                creditCharge: creditCharge,
                                                ximaWithdrawUsed: ximaWithdrawUsed,
                                                isAutoApproval: player.platform.enableAutoApplyBonus
                                                //requestDetail: {bonusId: bonusId, amount: amount, honoreeDetail: honoreeDetail}
                                            };
                                            var newProposal = {
                                                creator: proposalData.creator,
                                                data: proposalData,
                                                entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                                userType: newPlayerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                            };
                                            newProposal.inputDevice = dbUtility.getInputDevice(userAgent,false);
                                            return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_BONUS, newProposal);
                                        }
                                    });
                            });
                    } else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot find player"});
                    }
                }
            ).then(
                proposal => {
                    if (proposal) {
                        if (bUpdateCredit) {
                            dbLogger.createCreditChangeLog(player._id, player.platform._id, -amount, constProposalType.PLAYER_BONUS, player.validCredit, null, proposal);
                        }
                        dbConsumptionReturnWithdraw.reduceXimaWithdraw(player._id, ximaWithdrawUsed).catch(errorUtils.reportError);
                        return proposal;
                    } else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create bonus proposal"});
                    }
                }
            ).then(
                data => data,
                error => {
                    if (bUpdateCredit) {
                        return resetCredit(player._id, player.platform._id, amount, error);
                    }
                    else {
                        return Q.reject(error);
                    }
                }
            );
    },


    getAllAppliedBonusList: function (platformId, startIndex, count, startTime, endTime, status, sort) {
        var seq = sort ? -1 : 1;
        return dbconfig.collection_proposalType.findOne({
            platformId: platformId,
            name: constProposalType.PLAYER_BONUS
        })
            .then(function (typeData) {
                var bonusIds = [];
                if (Array.isArray(typeData)) {
                    for (var type in typeData) {
                        bonusIds.push(ObjectId(typeData[type]._id));
                    }
                } else {
                    bonusIds.push(typeData['_id']);
                }
                var queryObj = {
                    type: {$in: bonusIds}
                };
                if (platformId) {
                    queryObj['data.platformId'] = ObjectId(platformId);
                }
                if (status) {
                    queryObj.status = {$in: status}
                }
                ;
                if (startTime || endTime) {
                    queryObj.createTime = {};
                }
                if (startTime) {
                    queryObj.createTime["$gte"] = new Date(startTime)
                }
                if (endTime) {
                    queryObj.createTime["$lte"] = new Date(endTime)
                }
                var countProm = dbconfig.collection_proposal.find(queryObj).count();
                var proposalProm = dbconfig.collection_proposal.aggregate([
                    {$match: queryObj},
                    {
                        $group: {
                            _id: {$dateToString: {format: "%Y-%m-%d", date: "$createTime"}},
                            amount: {$sum: '$data.amount'}
                        }
                    }

                ]).sort({'_id': 1})

                return Q.all([proposalProm, countProm]).then(
                    data => {
                        if (data && data[0] && data[1]) {
                            return {
                                stats: {
                                    totalCount: data[1],
                                    startIndex: startIndex,
                                    requestCount: count
                                },
                                records: data[0]
                            }
                        }
                        else {
                            return {
                                stats: {
                                    totalCount: data[1] || 0,
                                    startIndex: startIndex,
                                    requestCount: count
                                },
                                records: []
                            }
                        }
                    }
                );
            })

    },

    /*
     * Get applied bonus list
     */
    getAppliedBonusList: function (playerId, startIndex, count, startTime, endTime, status, sort) {
        var seq = sort ? -1 : 1;
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            playerData => {
                if (playerData) {
                    //get player bonus proposal type
                    return dbconfig.collection_proposalType.findOne({
                        platformId: playerData.platform,
                        name: constProposalType.PLAYER_BONUS
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        ).then(
            typeData => {
                if (typeData) {
                    var queryObj = {
                        "data.playerId": playerId,
                        type: typeData._id
                    };
                    if (status) {
                        queryObj.status = status;
                    }
                    if (startTime || endTime) {
                        queryObj.createTime = {};
                    }
                    if (startTime) {
                        queryObj.createTime["$gte"] = new Date(startTime);
                    }
                    if (endTime) {
                        queryObj.createTime["$lte"] = new Date(endTime);
                    }

                    var countProm = dbconfig.collection_proposal.find(queryObj).count();
                    var proposalProm = dbconfig.collection_proposal.find(queryObj)
                        .populate({
                            path: "platform",
                            model: dbconfig.collection_platform
                        })
                        .sort({createTime: seq}).skip(startIndex).limit(count).lean();

                    return Q.all([proposalProm, countProm]).then(
                        data => {
                            if (data && data[0] && data[1]) {
                                return {
                                    stats: {
                                        totalCount: data[1],
                                        startIndex: startIndex,
                                        requestCount: count
                                    },
                                    records: data[0]
                                }
                            }
                            else {
                                return {
                                    stats: {
                                        totalCount: data[1] || 0,
                                        startIndex: startIndex,
                                        requestCount: count
                                    },
                                    records: []
                                }
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        );
    },

    /*
     * Cancel applied bonus
     */
    cancelAppliedBonus: function (playerId, proposalId) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            data => {
                if (data && data.data && data.data.playerId == playerId) {
                    //todo:: should use a new status here???
                    data.status = constProposalStatus.FAIL;
                    return data.save();
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid proposal Id"});
                }
            }
        );
    },

    /*
     * update applied bonus proposal
     */
    updatePlayerBonusProposal: function (proposalId, bSuccess, remark, bCancel) {
        let proposalData = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).populate({
            path: "type",
            model: dbconfig.collection_proposalType
        }).lean().then(
            data => {
                proposalData = data;
                return dbconfig.collection_proposal.findOneAndUpdate(
                    {_id: data._id, createTime: data.createTime},
                    {
                        status: bSuccess ? constProposalStatus.SUCCESS : bCancel ? constProposalStatus.CANCEL : constProposalStatus.FAIL,
                        "data.lastSettleTime": new Date(),
                        "data.remark": remark
                    }
                );
            }
        ).then(
            data => {
                if (data && data.status != constProposalStatus.SUCCESS && data.status != constProposalStatus.FAIL && data.status != constProposalStatus.CANCEL) {
                    if (!bSuccess) {
                        return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, bSuccess, proposalData);
                    }
                    else {
                        SMSSender.sendByPlayerId(data.data.playerId, constPlayerSMSSetting.APPLY_BONUS);
                        // return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, bSuccess, proposalData);
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid proposal status"});
                }
            }
        );
    },

    /*
     * update top up proposal
     */
    updatePlayerTopupProposal: function (proposalId, bSuccess) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId})
            .populate({path: "type", model: dbconfig.collection_proposalType}).then(
                data => {
                    if (data && data.type && data.status != constProposalStatus.SUCCESS
                        && data.status != constProposalStatus.FAIL) {
                        var status = bSuccess ? constProposalStatus.SUCCESS : constProposalStatus.FAIL;
                        var lastSettleTime = new Date();
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: data._id, createTime: data.createTime},
                            {
                                status: status,
                                "data.lastSettleTime": lastSettleTime
                            }
                        ).then(
                            updateProposal => {
                                if (updateProposal && updateProposal.status != constProposalStatus.SUCCESS
                                    && updateProposal.status != constProposalStatus.FAIL) {
                                    return proposalExecutor.approveOrRejectProposal(data.type.executionType, data.type.rejectionType, bSuccess, data).then(
                                        () => dbconfig.collection_proposal.findOneAndUpdate(
                                            {_id: data._id, createTime: data.createTime},
                                            {
                                                status: status,
                                                "data.lastSettleTime": lastSettleTime
                                            }
                                        )
                                    );
                                }
                            }
                        );
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Invalid proposal id or status"});
                    }
                }
            );
    },

    /*
     * get Player Device Analysis Data
     */
    getPlayerDeviceAnalysisData: function (platform, type, startTime, endTime) {
        return dbconfig.collection_players.aggregate(
            {
                $unwind: "$userAgent",
            },
            {
                $match: {
                    platform: platform,
                    registrationTime: {$gte: startTime, $lt: endTime}
                }
            },
            {
                $group: {
                    _id: {_id: "$_id", userAgent1: "$userAgent." + type,},
                    // cateNum: {$sum: 1}
                }
            },
            {
                $group: {
                    _id: {name: "$_id.userAgent1"},
                    // total: {$avg: "$totalCount"},
                    number: {$sum: 1}
                }
            },
            {
                $sort: {number: -1}
            }
        )
    },

    /*
     * player login to game and return game url
     * @param {String} playerId
     * @param {String} gameId
     */
    loginGame: function (playerId, gameId) {
        var playerData = null;
        var gameData = null;
        //check if player and game are valid
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        });
        var gameProm = dbconfig.collection_game.findOne({gameId: gameId}).populate({
            path: "provider",
            model: dbconfig.collection_gameProvider
        });

        return Q.all([playerProm, gameProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    playerData = data[0];
                    gameData = data[1];
                    //check if player's platform has this game
                    return dbconfig.collection_platformGameStatus.findOne({
                        platform: data[0].platform._id,
                        game: data[1]._id
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player or game id"});
                }
            }
        ).then(
            statusData => {
                if (statusData && statusData.status == constGameStatus.ENABLE) {
                    var prefix = playerData.platform.gameProviderInfo[gameData.provider] ? playerData.platform.gameProviderInfo[gameData.provider].localPrefix : "";
                    var cpPlayerName = prefix + playerData.name;

                    if (!playerData.lastPlayedProvider || String(playerData.lastPlayedProvider) == String(gameData.provider)) {
                        return true;
                    }
                    else {
                        return dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(playerData._id, playerData.platform._id, gameData.provider._id, -1, playerId, gameData.provider.providerId);
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Player's platform doesn't have this game or game is not enabled"
                    });
                }
            }
        ).then(
            data => {
                if (data) {
                    if (playerData.validCredit >= 1) {
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(playerData._id, playerData.platform._id, gameData.provider._id, -1, gameData.provider.providerId);
                    }
                    else {
                        return true;
                    }
                }
                else {
                    return Q.reject({name: "APIError", message: "Failed to transfer player credit"});
                }
            }
        ).then(
            data => {
                if (data) {
                    //todo::get game login url from cp
                    return "google.com";
                }
                else {
                    return Q.reject({name: "APIError", message: "Failed to transfer player credit"});
                }
            }
        );
    },

    authenticate: function (playerId, token, playerIp, conn) {
        var deferred = Q.defer();
        jwt.verify(token, constSystemParam.API_AUTH_SECRET_KEY, function (err, decoded) {
            if (err) {
                // Jwt token error
                deferred.reject({name: "DataError", message: "Token is not authenticated"});
            }
            else {
                dbconfig.collection_players.findOne({playerId: playerId}).then(
                    playerData => {
                        if (playerData) {
                            if (playerData.lastLoginIp == playerIp) {
                                conn.isAuth = true;
                                conn.playerId = playerId;
                                conn.playerObjId = playerData._id;
                                deferred.resolve(true);
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Player ip doesn't match!"});
                            }
                        }
                        else {
                            deferred.reject({name: "DataError", message: "Can't find player"});
                        }
                    }
                );

            }
        });

        return deferred.promise;
    },

    getFavoriteGames: function (playerId) {
        var result = [];

        function getDetailGame(gameId) {
            return dbconfig.collection_game.findOne({_id: gameId})
                .populate({path: "provider", model: dbconfig.collection_gameProvider}).lean()
                .then(data => {
                    if (data) {
                        data.isFavorite = true;
                        if (data.provider && data.provider.providerId) {
                            var providerShortId = data.provider.providerId;
                            data.provider = providerShortId;
                        } else {
                            data.provider = 'unknown';
                        }
                        return data;
                    } else return null;
                });
        }

        return dbconfig.collection_players.findOne({playerId}).lean().then(
            playerData => {
                if (playerData) {
                    if (playerData.favoriteGames) {
                        playerData.favoriteGames.forEach(
                            gameId => {
                                result.push(getDetailGame(gameId));
                            }
                        )
                    }
                    return Q.all(result).then(arr => {
                        return arr.filter(item => {
                            return item;
                        })
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        );
    },

    addFavoriteGame: function (playerId, gameId) {
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId});
        var gameProm = dbconfig.collection_game.findOne({gameId});
        return Q.all([playerProm, gameProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    return dbconfig.collection_players.update(
                        {_id: data[0]._id, platform: data[0].platform},
                        {$addToSet: {favoriteGames: data[1]._id}}
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find game"});
                }
            }
        );
    },

    removeFavoriteGame: function (playerId, gameId) {
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId});
        var gameProm = dbconfig.collection_game.findOne({gameId});
        return Q.all([playerProm, gameProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    return dbconfig.collection_players.update(
                        {_id: data[0]._id, platform: data[0].platform},
                        {$pull: {favoriteGames: data[1]._id}}
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find game"});
                }
            }
        );
    },

    getLoginURL: function (playerId, gameId, ip, lang, clientDomainName, clientType, inputDevice) {
        var platformData = null;
        var providerData = null;
        var playerData = null;
        var bTransferIn = false;
        var gameData = null;
        //transfer out from current provider
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "lastPlayedProvider", model: dbconfig.collection_gameProvider})
            .lean();
        var gameProm = dbconfig.collection_game.findOne({gameId: gameId}).populate({
            path: "provider",
            model: dbconfig.collection_gameProvider
        }).lean();
        return Q.all([playerProm, gameProm]).then(
            data => {
                if (data && data[0] && data[1] && data[1].provider) {
                    playerData = data[0];
                    gameData = data[1];
                    // check if the player is forbidden totally
                    if (playerData.permission.forbidPlayerFromLogin) {
                        return Q.reject({
                            status: constServerCode.PLAYER_IS_FORBIDDEN,
                            name: "DataError",
                            message: "Player is forbidden",
                            playerStatus: playerData.status
                        });
                    }
                    // check if the player is ban for particular game - in other words
                    // check if the provider of login game is in the forbidden list
                    else if (playerData.permission.forbidPlayerFromEnteringGame) {
                        // var isForbidden = playerData.forbidProviders.some(providerId => String(providerId) === String(gameData.provider._id));
                        // if (isForbidden) {
                        return Q.reject({
                            name: "DataError",
                            status: constServerCode.PLAYER_IS_FORBIDDEN,
                            message: "Player is forbidden to the game",
                            playerStatus: playerData.status
                        });
                        // }
                        // } else if (playerData.status === constPlayerStatus.BANNED) {
                        //     return Q.reject({
                        //         status: constServerCode.PLAYER_IS_FORBIDDEN,
                        //         name: "DataError",
                        //         message: "Player is banned",
                        //         playerStatus: playerData.status
                        //     });
                    }

                    if (playerData.forbidProviders && playerData.forbidProviders.length > 0) {
                        for (let i = 0, len = playerData.forbidProviders.length; i < len; i++) {
                            let forbidProvider = playerData.forbidProviders[i];
                            if (gameData.provider._id.toString() === forbidProvider.toString()) {
                                return Q.reject({
                                    name: "DataError",
                                    status: constServerCode.PLAYER_IS_FORBIDDEN,
                                    message: "Player is forbidden to the game",
                                    playerStatus: playerData.status
                                });
                            }
                        }
                    }

                    //check all status
                    if (gameData.status != constGameStatus.ENABLE) {
                        return Q.reject({
                            status: constServerCode.CP_NOT_AVAILABLE,
                            name: "DataError",
                            message: "Game is not available",
                            gameStatus: gameData.status
                        });
                    }

                    // let providerEnabled = true;
                    // let providerInfo = playerData.platform.gameProviderInfo[String(gameData.provider._id)];
                    //
                    // if (providerInfo) {
                    //     providerEnabled = providerInfo.isEnabled;
                    // }

                    // Added checking for platform level disable game provider
                    if (gameData.provider.status != constProviderStatus.NORMAL) {
                        return Q.reject({
                            status: constServerCode.CP_NOT_AVAILABLE,
                            name: "DataError",
                            message: "Provider is not available",
                            providerStatus: gameData.provider.status
                        });
                    }

                    return dbconfig.collection_platformGameStatus.findOne({
                        platform: playerData.platform._id,
                        game: gameData._id
                    }).then(
                        platformGame => {
                            if (platformGame) {
                                if (platformGame.status != constGameStatus.ENABLE) {
                                    return Q.reject({
                                        status: constServerCode.CP_NOT_AVAILABLE,
                                        name: "DataError",
                                        message: "Game is not available on platform",
                                        gameStatus: gameData.status
                                    });
                                }

                                if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.status == constGameStatus.ENABLE && playerData.lastPlayedProvider.providerId != gameData.provider.providerId) {
                                    return dbPlayerInfo.transferPlayerCreditFromProvider(playerData.playerId, playerData.platform._id, playerData.lastPlayedProvider.providerId, -1, null, true);
                                }
                                else {
                                    return {
                                        playerCredit: playerData.validCredit,
                                        rewardCredit: playerData.lockedCredit
                                    };
                                }
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Cannot find platform game data"});
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player or game"});
                }
            }
        ).then(
            data => {
                bTransferIn = (data && ((parseFloat(data.playerCredit) + parseFloat(data.rewardCredit)) >= 1)) ? true : false;
                //console.log("bTransferIn:", bTransferIn, data);
                if (data && gameData && gameData.provider) {
                    if (gameData.provider._id && playerData && playerData.platform && playerData.platform.usePointSystem) {
                        dbRewardPoints.updateLoginRewardPointProgress(playerData, gameData.provider._id, inputDevice).catch(errorUtils.reportError);
                    }

                    providerData = gameData.provider;
                    //transfer in to current provider
                    if (bTransferIn) {
                        return dbPlayerInfo.transferPlayerCreditToProvider(playerData.playerId, playerData.platform._id, gameData.provider.providerId, -1);
                    }
                    else {
                        //allow player to login if player doesn't have enough credit
                        return true;
                        // if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.providerId == gameData.provider.providerId) {
                        //     return true;
                        // }
                        // else {
                        //     //todo::update code here later, for now, it doesn't require credit
                        //     if (gameId == "19D207EB-C09C-4E87-8CFE-0C0DF71CE232") {
                        //         return;
                        //     }
                        //     else {
                        //         return Q.reject({
                        //             status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        //             name: "DataError",
                        //             errorMessage: "Player does not have enough credit."
                        //         });
                        //     }
                        // }
                    }
                } else {
                    return Q.reject({name: "DataError", message: "Cannot find game"});
                }
            }
        ).then(
            data => {
                if (ip == "undefined") {
                    ip = "127.0.0.1";
                }
                var sendData = {
                    username: playerData.name,
                    platformId: playerData.platform.platformId,
                    providerId: providerData.providerId,
                    gameId: gameId,
                    clientDomainName: clientDomainName || "Can not find domain",
                    lang: lang || localization.lang.ch_SP,
                    ip: ip,
                    clientType: clientType || 1
                };
                return cpmsAPI.player_getLoginURL(sendData);
            }
        ).then(
            loginData => {
                dbPlayerInfo.updatePlayerPlayedProvider(playerData._id, providerData._id);
                return {gameURL: loginData.gameURL};
            }
        );
    },

    getTestLoginURL: function (playerId, gameId, ip, lang, clientDomainName, clientType) {

        var platformData = null;
        var providerData = null;
        var playerData = null;

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .then(data => {
                    if (data) {
                        playerData = data;
                        platformData = data.platform;
                        if (playerData.permission.forbidPlayerFromEnteringGame) {
                            return Q.reject({
                                name: "DataError",
                                message: "Player is not enable",
                                status: playerData.status
                            });
                        }
                        return dbconfig.collection_game.findOne({gameId: gameId}).populate({
                            path: "provider",
                            model: dbconfig.collection_gameProvider
                        }).exec();
                    } else {
                        return Q.reject({name: "DataError", message: "Cannot find player"});
                    }
                }
            ).then(gameData => {
                if (gameData) {
                    providerData = gameData.provider.toObject();
                    if (ip == "undefined") {
                        ip = "127.0.0.1";
                    }
                    var sendData = {
                        username: playerData.name,
                        platformId: platformData.platformId,
                        providerId: providerData.providerId,
                        gameId: gameId,
                        clientDomainName: clientDomainName || "Can not find domain",
                        lang: lang || localization.lang.ch_SP,
                        ip: ip,
                        clientType: clientType || 1
                    };
                    //var isHttp = providerData.interfaceType == 1 ? true : false;
                    return cpmsAPI.player_getTestLoginURL(sendData);
                } else {
                    return Q.reject({name: "DataError", message: "Cannot find game"})
                }
            })
            .then(
                loginData => ({gameURL: loginData.gameURL})
            );
    },

    getTestLoginURLWithoutUser: function (platformId, gameId, ip, lang, clientDomainName, clientType) {

        var providerData = null;
        var platformData = null;

        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            data => {
                if (data) {
                    platformData = data;
                    return dbconfig.collection_game.findOne({gameId: gameId}).populate({
                        path: "provider",
                        model: dbconfig.collection_gameProvider
                    }).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            gameData => {
                if (gameData) {
                    providerData = gameData.provider.toObject();
                    if (ip == "undefined") {
                        ip = "127.0.0.1";
                    }
                    var sendData = {
                        platformId: platformData.platformId,
                        providerId: providerData.providerId,
                        gameId: gameId,
                        clientDomainName: clientDomainName || "Can not find domain",
                        lang: lang || localization.lang.ch_SP,
                        ip: ip,
                        clientType: clientType || 1
                    };
                    //var isHttp = providerData.interfaceType == 1 ? true : false;
                    return cpmsAPI.player_getTestLoginURLWithOutUser(sendData);
                } else {
                    return Q.reject({name: "DataError", message: "Cannot find game"});
                }
            }
        ).then(
            loginData => ({gameURL: loginData.gameURL}),
            error => Q.reject({
                status: constServerCode.INVALID_API_USER,
                name: "DataError",
                message: "Please login and try again"
            })
        );
    },

    getGameUserInfo: function (playerId, platformId, providerId) {
        return dbconfig.collection_players.findOne({playerId: playerId}).lean()
            .then(
                data => {
                    if (data) {

                        var sendData = {
                            username: data.name,
                            platformId: platformId,
                            providerId: providerId
                        };
                        return cpmsAPI.player_getGamePassword(sendData);
                    } else {
                        return Q.reject({name: "DataError", message: "Cannot find player"})
                    }
                }
            )
    },

    grabPlayerTransferRecords: function (playerId, platformId, providerId) {
        return dbconfig.collection_players.findOne({playerId: playerId})
            .then(
                data => {
                    if (data) {
                        var sendData = {
                            username: data.name,
                            platformId: platformId,
                            providerId: providerId
                        };
                        return cpmsAPI.player_grabPlayerTransferRecords(sendData);
                    } else {
                        return Q.reject({name: "DataError", message: "Cannot find player"})
                    }
                }
            )
    },

    /*
     * get player online top up types
     */
    getOnlineTopupType: function (playerId, merchantUse, clientType) {
        // merchantUse - 1: merchant, 2: bankcard
        // clientType: 1: browser, 2: mobileApp
        var playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "bankCardGroup", model: dbconfig.collection_platformBankCardGroup}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).lean().then(
            data => {
                if (data && data.platform) {
                    playerData = data;
                    if (merchantUse == 1) {
                        return pmsAPI.merchant_getMerchantList({
                            platformId: data.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        });
                    }
                    else {
                        return pmsAPI.bankcard_getBankcardList({
                            platformId: data.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        });
                    }
                } else {
                    return Q.reject({name: "DataError", message: "Cannot find player"})
                }
            }
        ).then(
            paymentData => {
                if (paymentData) {
                    var resData = [];
                    if (merchantUse == 1 && paymentData.merchants) {
                        if (playerData.merchantGroup && playerData.merchantGroup.merchants && playerData.merchantGroup.merchants.length > 0) {
                            playerData.merchantGroup.merchants.forEach(
                                merchant => {
                                    for (let i = 0; i < paymentData.merchants.length; i++) {
                                        var status = 2;
                                        if (paymentData.merchants[i].merchantNo == merchant) {
                                            status = 1;
                                        }
                                        var bValidType = true;
                                        resData.forEach(type => {
                                            if (type.type == paymentData.merchants[i].topupType) {
                                                bValidType = false;
                                                if (status == 1 && paymentData.merchants[i].status == "ENABLED") {
                                                    type.status = status;
                                                }
                                            }
                                        });
                                        if (bValidType && paymentData.merchants[i].status == "ENABLED" && (paymentData.merchants[i].targetDevices == clientType || paymentData.merchants[i].targetDevices == 3)) {
                                            resData.push({type: paymentData.merchants[i].topupType, status: status});
                                        }
                                    }
                                }
                            );
                        }
                    }
                    else {
                        if (paymentData.data && playerData.bankCardGroup && playerData.bankCardGroup.banks && playerData.bankCardGroup.banks.length > 0) {
                            playerData.bankCardGroup.banks.forEach(
                                bank => {
                                    for (let i = 0; i < paymentData.data.length; i++) {
                                        var status = 2;
                                        if (paymentData.data[i].accountNumber == bank) {
                                            status = 1;
                                        }
                                        var bValidType = true;
                                        resData.forEach(type => {
                                            if (type.type == paymentData.data[i].bankTypeId) {
                                                bValidType = false;
                                                if (status == 1) {
                                                    type.status = status;
                                                }
                                            }
                                        });
                                        if (bValidType) {
                                            resData.push({
                                                type: paymentData.data[i].bankTypeId,
                                                status: status,
                                                accountNumber: paymentData.data[i].accountNumber
                                            });
                                        }
                                    }
                                }
                            );
                        }
                    }
                    return resData;
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find payment data"})
                }
            }
        );
    },

    cancelBonusRequest: function (playerId, proposalId) {

        var proposal = null;
        var bonusId = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.bonusId) {
                        if (proposalData.status != constProposalStatus.PENDING && proposalData.status != constProposalStatus.AUTOAUDIT) {
                            return Q.reject({
                                status: constServerCode.DATA_INVALID,
                                name: "DBError",
                                message: 'This proposal has been processed'
                            });
                        }
                        proposal = proposalData;
                        bonusId = proposalData.data.bonusId;
                        return dbProposal.updateBonusProposal(proposalId, constProposalStatus.CANCEL, bonusId);
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.DATA_INVALID,
                            name: "DBError",
                            message: 'Invalid proposal'
                        });
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            data => {
                if (proposal) {
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": "玩家：" + proposal.data.playerName}
                    );
                }

            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    getManualTopupRequestList: function (playerId) {
        var platformObjectId = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData && playerData.platform) {
                    platformObjectId = playerData.platform._id;
                    return dbconfig.collection_proposalType.findOne({
                        platformId: platformObjectId,
                        name: constProposalType.PLAYER_MANUAL_TOP_UP
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    var queryObject = {
                        "data.playerId": playerId,
                        type: proposalTypeData._id,
                        status: constProposalStatus.PENDING
                    };
                    return dbconfig.collection_proposal.findOne(queryObject);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        ).then(
            proposalData => {
                if( proposalData && proposalData.data && proposalData.data.validTime) {
                    proposalData.restTime = Math.abs(parseInt((new Date().getTime() - new Date(proposalData.data.validTime).getTime()) / 1000));
                }
                return proposalData;
            }
        );
    },

    getQuickpayTopupRequestList: (playerId) => {
        var platformObjectId = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData && playerData.platform) {
                    platformObjectId = playerData.platform._id;
                    return dbconfig.collection_proposalType.findOne({
                        platformId: platformObjectId,
                        name: constProposalType.PLAYER_QUICKPAY_TOP_UP
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    var queryObject = {
                        "data.playerId": playerId,
                        type: proposalTypeData._id,
                        status: constProposalStatus.PENDING
                    };
                    return dbconfig.collection_proposal.findOne(queryObject).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        );
    },

    getQuickpayTopUpRequestList: function (playerId) {
        var platformObjectId = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData && playerData.platform) {
                    platformObjectId = playerData.platform._id;
                    return dbconfig.collection_proposalType.findOne({
                        platformId: platformObjectId,
                        name: constProposalType.PLAYER_QUICKPAY_TOP_UP
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    var queryObject = {
                        "data.playerId": playerId,
                        type: proposalTypeData._id,
                        status: constProposalStatus.PENDING
                    };
                    return dbconfig.collection_proposal.findOne(queryObject).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        );
    },

    getWechatTopupRequestList: function (playerId) {
        var platformObjectId = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData && playerData.platform) {
                    platformObjectId = playerData.platform._id;
                    return dbconfig.collection_proposalType.findOne({
                        platformId: platformObjectId,
                        name: constProposalType.PLAYER_WECHAT_TOP_UP
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    var queryObject = {
                        "data.playerId": playerId,
                        type: proposalTypeData._id,
                        status: constProposalStatus.PENDING
                    };
                    return dbconfig.collection_proposal.findOne(queryObject).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        ).then(
            proposalData => {
                if( proposalData && proposalData.data && proposalData.data.validTime) {
                    proposalData.restTime = Math.abs(parseInt((new Date().getTime() - new Date(proposalData.data.validTime).getTime()) / 1000));
                }
                return proposalData;
            }
        );
    },

    getAlipayTopupRequestList: function (playerId) {
        var platformObjectId = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData && playerData.platform) {
                    platformObjectId = playerData.platform._id;
                    return dbconfig.collection_proposalType.findOne({
                        platformId: platformObjectId,
                        name: constProposalType.PLAYER_ALIPAY_TOP_UP
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    var queryObject = {
                        "data.playerId": playerId,
                        type: proposalTypeData._id,
                        status: constProposalStatus.PENDING
                    };
                    return dbconfig.collection_proposal.findOne(queryObject).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        ).then(
            proposalData => {
                if( proposalData && proposalData.data && proposalData.data.validTime) {
                    proposalData.restTime = Math.abs(parseInt((new Date().getTime() - new Date(proposalData.data.validTime).getTime()) / 1000));
                }
                return proposalData;
            }
        );
    },

    /*
     * player apply for top up return reward
     * @param {String} playerId
     * @param {ObjectId} topUpRecordId
     * @param {String} code
     */
    applyTopUpReturn: function (userAgent, playerId, topUpRecordId, code, ifAdmin) {
        var platformId = null;
        var player = {};
        var record = {};
        var rewardParam;
        var rewardAmount;
        var deductionAmount;
        var bDoneDeduction = false;
        var adminInfo = ifAdmin;

        let eventData, taskData;
        let isProviderGroup = false;

        var recordProm = dbconfig.collection_playerTopUpRecord.findById(topUpRecordId).lean();
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean();

        return Q.all([playerProm, recordProm]).then(
            function (data) {
                // Check player permission to apply this reward
                if (data && data[0] && data[0].permission && data[0].permission.banReward) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        message: "Reward not applicable"
                    });
                }

                //get player's platform reward event data
                if (data && data[0] && data[1] && !data[1].bDirty && String(data[1].playerId) == String(data[0]._id)
                    && !(data[1].proposalId && data[1].proposalId.length > 10)) {
                    player = data[0];
                    record = data[1];
                    platformId = player.platform;
                    isProviderGroup = Boolean(player.platform.useProviderGroup);

                    let taskProm;
                    if (!player.platform.canMultiReward && player.platform.useLockedCredit) {
                        taskProm = dbRewardTask.getRewardTask(
                            {
                                playerId: player._id,
                                status: constRewardTaskStatus.STARTED,
                                useLockedCredit: true
                            }
                        );
                    }
                    else {
                        taskProm = Q.resolve(false);
                    }

                    //get reward event data
                    let eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_TOP_UP_RETURN, code);

                    return Q.all([eventProm, taskProm]);
                }
                else {
                    if (data[1] && data[1].bDirty) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "This top up record has been used"
                        });
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            message: "Cant apply this reward, contact cs"
                        });
                    }
                }
            }
        ).then(
            function (data) {
                if (!data) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find top up return event data for platform"
                    });
                }

                eventData = data[0];
                taskData = data[1];

                let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(player, eventData._id);
                if (playerIsForbiddenForThisReward) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        message: "Player is forbidden for this reward."
                    });
                }

                if (eventData.validStartTime && eventData.validEndTime) {
                    // TODO Temoporary hardcoding: Only can apply 1 time within period
                    return dbconfig.collection_proposalType.findOne({
                        platformId: player.platform._id,
                        name: constProposalType.PLAYER_TOP_UP_RETURN
                    }).lean();
                }
                else {
                    return false;
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    return dbconfig.collection_proposal.findOne({
                        type: proposalTypeData._id,
                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.PROCESSING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        "data.playerObjId": player._id,
                        settleTime: {$gte: eventData.validStartTime, $lt: eventData.validEndTime},
                        "data.eventCode": eventData.code
                    }).lean();
                }
                else {
                    return false;
                }
            }
        ).then(
            appliedProposal => {
                if (!appliedProposal || appliedProposal.length == 0) {
                    if (taskData) {
                        return Q.reject({
                            status: constServerCode.PLAYER_HAS_REWARD_TASK,
                            name: "DataError",
                            message: "The player has not unlocked the previous reward task. Not valid for new reward"
                        });
                    }

                    if (!rewardUtility.isValidRewardEvent(constRewardType.PLAYER_TOP_UP_RETURN, eventData)) {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "Cannot find top up return event data for platform"
                        });
                    }

                    rewardParam = eventData.param.reward[player.playerLevel.value];
                    if (!rewardParam) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "Player is not valid for this reward"
                        });
                    }

                    if (rewardParam.maxDailyRewardAmount <= player.dailyTopUpIncentiveAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "You have reached the max reward amount today"
                        });
                    }

                    if (record.amount < rewardParam.minTopUpAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "Topup amount is less than minimum topup requirement"
                        });
                    }

                    // All requirements are met.  Let's proceed.
                    rewardAmount = Math.min((record.amount * rewardParam.rewardPercentage), rewardParam.maxRewardAmount);
                    deductionAmount = record.amount;

                    let creditProm = Q.resolve(false);
                    if (player.platform.useLockedCredit || player.platform.useProviderGroup) {
                        creditProm = dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform, deductionAmount, "applyTopUpReturn:Deduction", record);
                    }
                    return creditProm.then(
                        function (bDeduct) {
                            bDoneDeduction = bDeduct;

                            var proposalData = {
                                type: eventData.executeProposal,
                                creator: adminInfo ? adminInfo :
                                    {
                                        type: 'player',
                                        name: player.name,
                                        id: playerId
                                    },
                                data: {
                                    playerObjId: player._id,
                                    playerId: player.playerId,
                                    player: player.playerId,
                                    playerName: player.name,
                                    platformId: platformId,
                                    topUpRecordId: topUpRecordId,
                                    topUpProposalId: record.proposalId,
                                    applyAmount: deductionAmount,
                                    rewardAmount: rewardAmount,
                                    targetEnable: eventData.param.targetEnable,
                                    games: eventData.param.games,
                                    spendingAmount: (record.amount + rewardAmount) * rewardParam.spendingTimes,
                                    minTopUpAmount: rewardParam.minTopUpAmount,
                                    useConsumption: eventData.param.useConsumption,
                                    eventId: eventData._id,
                                    eventName: eventData.name,
                                    eventCode: eventData.code,
                                    eventDescription: eventData.description,
                                    useLockedCredit: Boolean(player.platform.useLockedCredit)
                                },
                                entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                userType: constProposalUserType.PLAYERS,
                            };

                            // Provider Group setting
                            if (isProviderGroup) {
                                proposalData.data.providerGroup = eventData.param.providerGroup;
                            } else {
                                proposalData.data.providers = eventData.param.providers;
                            }

                            proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                            return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                                {_id: record._id, createTime: record.createTime, bDirty: {$ne: true}},
                                {
                                    bDirty: true,
                                    usedType: constRewardType.PLAYER_TOP_UP_RETURN,
                                    $push: {usedEvent: eventData._id}
                                },
                                {new: true}
                            ).then(
                                data => {
                                    if (data && data.bDirty) {
                                        return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
                                            data => {
                                                return data;
                                            },
                                            error => {
                                                //clean top up record if create proposal failed
                                                console.error({
                                                    name: "DBError",
                                                    message: "Create player top up return proposal failed",
                                                    data: proposalData
                                                });
                                                return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                                                    {
                                                        _id: record._id,
                                                        createTime: record.createTime
                                                    }, {bDirty: false}
                                                ).catch(errorUtils.reportError).then(
                                                    () => Q.reject(error)
                                                );
                                            }
                                        );
                                    }
                                    else {
                                        return Q.reject({
                                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                            name: "DataError",
                                            message: "This top up record has been used"
                                        });
                                    }
                                }
                            );
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "The player already has this reward. Not Valid for the reward."
                    });
                }
            }
        ).catch(
            error => {
                return Q.resolve().then(
                    () => {
                        return bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, constPlayerCreditChangeType.APPLY_TOP_UP_RETURN_REFUND, error)
                    }
                ).then(
                    () => {
                        return Q.reject(error)
                    }
                )
            }
        );
    },

    /*
     * player apply for consumption incentive reward
     * @param {String} playerId
     * @param {String} code
     */
    applyConsumptionIncentive: function (userAgent, playerId, code, ifAdmin) {
        let platformId = null;
        let player = {};
        let eventParam = {};
        let eventParams = [];
        //get yesterday time frame
        let yerTime = dbUtility.getYesterdaySGTime();
        let playerTopUpAmount = 0;
        let event = {};
        let adminInfo = ifAdmin;

        let playerProm = dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean();
        return playerProm.then(
            data => {
                //get player's platform reward event data
                if (data && data.playerLevel) {
                    player = data;
                    platformId = player.platform._id;

                    let taskProm;
                    if (!player.platform.canMultiReward) {
                        taskProm = dbRewardTask.getRewardTask(
                            {
                                playerId: player._id,
                                status: constRewardTaskStatus.STARTED,
                                useLockedCredit: true
                            }
                        );
                    }
                    else {
                        taskProm = Q.resolve(false);
                    }

                    //get reward event data
                    let eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSUMPTION_INCENTIVE, code);
                    return Q.all([eventProm, taskProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            data => {
                if (data) {
                    let eventData = data[0];
                    let taskData = data[1];
                    if (taskData) {
                        return Q.reject({
                            status: constServerCode.PLAYER_HAS_REWARD_TASK,
                            name: "DataError",
                            message: "The player has not unlocked the previous reward task. Not valid for new reward"
                        });
                    }
                    if (rewardUtility.isValidRewardEvent(constRewardType.PLAYER_CONSUMPTION_INCENTIVE, eventData) && eventData.needApply) {
                        event = eventData;
                        let minTopUpRecordAmount = 0;

                        if (dbPlayerReward.isRewardEventForbidden(player, event._id)) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NO_PERMISSION,
                                name: "DataError",
                                message: "Player is forbidden for this reward."
                            });
                        }

                        // Filter event param based on player level
                        eventParams = eventData.param.reward.filter(reward => {
                            if (reward.minPlayerLevel == player.playerLevel.value) {
                                return reward;
                            }
                        });

                        // Loose filter if no matched param for player level
                        if (eventParams.length == 0) {
                            eventParams = eventData.param.reward.filter(reward => {
                                if (reward.minPlayerLevel <= player.playerLevel.value) {
                                    if (reward.minTopUpRecordAmount > minTopUpRecordAmount) {
                                        minTopUpRecordAmount = reward.minTopUpRecordAmount;
                                    }
                                    return reward;
                                }
                            });
                        }

                        if (eventParams && eventParams.length > 0) {
                            //get yesterday top up amount
                            return dbconfig.collection_playerTopUpRecord.aggregate(
                                {
                                    $match: {
                                        playerId: player._id,
                                        platformId: player.platform._id,
                                        amount: {$gte: minTopUpRecordAmount},
                                        createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime},
                                        $or: [{bDirty: false}, {
                                            bDirty: true,
                                            usedType: constRewardType.PLAYER_TOP_UP_RETURN
                                        }]
                                    }
                                },
                                {
                                    $group: {
                                        _id: {playerId: "$playerId"},
                                        amount: {$sum: "$amount"}
                                    }
                                }
                            );
                        }
                        else {
                            return Q.reject({
                                status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                name: "DataError",
                                message: "Player is not valid for this reward"
                            });
                        }
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "Invalid player consumption incentive event data for platform"
                        });
                    }
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find player consumption incentive event data for platform"
                    });
                }
            }
        ).then(
            topUpData => {
                if (topUpData && topUpData[0] && topUpData[0].amount > 0) {
                    playerTopUpAmount = topUpData[0].amount;

                    //get yesterday bonus credit
                    let bonusProm = dbconfig.collection_proposalType.findOne({
                        platformId: player.platform._id,
                        name: constProposalType.PLAYER_BONUS
                    }).then(
                        typeData => {
                            if (typeData) {
                                return dbconfig.collection_proposal.find(
                                    {
                                        type: typeData._id,
                                        "data.playerObjId": player._id,
                                        "data.platformId": player.platform._id,
                                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.PROCESSING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                        createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime}
                                    }
                                ).lean();
                            }
                            else {
                                return Q.reject({
                                    name: "DataError",
                                    message: "Can not find player bonus proposal type"
                                });
                            }
                        }
                    ).then(
                        bonusData => {
                            if (bonusData && bonusData.length > 0) {
                                let bonusCredit = 0;
                                bonusData.forEach(
                                    data => {
                                        bonusCredit += data.data.amount
                                    }
                                );
                                return bonusCredit;
                            }
                            else {
                                return 0;
                            }
                        }
                    );
                    //get game credit from log
                    let providerCreditProm = dbconfig.collection_playerCreditsDailyLog.findOne({
                        platformObjId: player.platform._id,
                        playerObjId: player._id,
                        createTime: {$gt: yerTime.startTime, $lte: yerTime.endTime}
                    }).lean().then(
                        creditLogData => {
                            if (creditLogData) {
                                return creditLogData.validCredit + creditLogData.lockedCredit + creditLogData.gameCredit;
                            } else {
                                return Q.reject({
                                    status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                    name: "DataError",
                                    message: "Error in getting player balance credit"
                                });
                            }
                        }
                    );
                    return Q.all([bonusProm, providerCreditProm]);
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player does not have enough top up amount"
                    });
                }
            }
        ).then(
            data => {
                if (data) {
                    let curParam = null;
                    let deficitAmount = playerTopUpAmount - data[0] - data[1];

                    // Filter event param by deficit amount
                    eventParams.map(param => {
                        if (deficitAmount >= param.minDeficitAmount) {
                            if (!curParam) {
                                curParam = param;
                            } else {
                                if (param.minDeficitAmount > curParam.minDeficitAmount) {
                                    curParam = param;
                                }
                            }
                        }
                    });

                    if (!curParam) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "Not enough reward amount"
                        });
                    }
                    else {
                        eventParam = curParam;
                    }

                    let proposalData = {
                        type: event.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: player.name,
                                id: playerId
                            },
                        data: {
                            playerObjId: player._id,
                            playerId: player.playerId,
                            playerName: player.name,
                            platformId: platformId,
                            deficitAmount: deficitAmount,
                            curAmount: player.validCredit,
                            providerCreditAmount: data[1],
                            eventId: event._id,
                            eventName: event.name,
                            eventCode: event.code,
                            eventDescription: event.description,
                            useConsumption: Boolean(event.param.useConsumption)
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };
                    proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);

                    // Set percentage to 100% if not available
                    if (eventParam.rewardAmount && !eventParam.rewardPercentage) {
                        // Incentive by fixed amount
                        proposalData.data.rewardAmount = eventParam.rewardAmount;

                        return dbProposal.createProposalWithTypeId(event.executeProposal, proposalData);
                    }
                    else if ((deficitAmount * eventParam.rewardPercentage) >= (eventParam.minRewardAmount - 1)) {
                        // Incentive by percentage
                        proposalData.data.rewardAmount = Math.min((deficitAmount * eventParam.rewardPercentage), eventParam.maxRewardAmount);
                        proposalData.data.spendingAmount = proposalData.data.rewardAmount * eventParam.spendingTimes;

                        return dbProposal.createProposalWithTypeId(event.executeProposal, proposalData);
                    }
                    else {
                        if ((player.validCredit + player.lockedCredit + data[1]) > eventParam.maxPlayerCredit) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                name: "DataError",
                                message: "Player has too much credit"
                            });
                        }
                        else {
                            return Q.reject({
                                status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                name: "DataError",
                                message: "Not enough reward amount"
                            });
                        }
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Can not find player bonus proposal or provider credit"
                    });
                }
            }
        );
    },

    checkExpiredManualTopUp: function (playerId, proposalId) {
        //reset proposal status and ask pms to check
        return Q.resolve(true);
        //todo::update code here
        return dbProposal.getProposal({'proposalId': proposalId}).then(
            proposal => {
                if (proposal && proposal.status == constProposalStatus.EXPIRED) {
                    return dbProposal.updateProposal({'proposalId': proposalId}, {status: constProposalStatus.PENDING}, {new: true})
                        .then(
                            ok => {
                                return pmsAPI.payment_checkExpiredManualTopup(proposal.proposalId)
                            }
                        ).then(
                            res => {
                                if (res && res.data) {
                                    return {
                                        status: 200,
                                        message: "Top up success"
                                    };
                                } else {
                                    dbProposal.updateProposal({'proposalId': proposalId}, {status: constProposalStatus.FAIL}, {new: true})
                                        .then(
                                            last => {
                                                return {
                                                    status: constServerCode.INVALID_API_USER,
                                                    message: "Top up failed."
                                                };
                                            }
                                        );
                                }
                            }
                        )
                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        message: "Proposal not found or not in expired status."
                    })
                }
            }
        )
    },

    applyPlayerTopUpReward: function (userAgent, playerId, code, topUpRecordId, ifAdmin) {
        var platformId = null;
        var player = {};
        var record = {};
        var deductionAmount;
        var bDoneDeduction = false;
        var adminInfo = ifAdmin;

        var recordProm = dbconfig.collection_playerTopUpRecord.findById(topUpRecordId).lean();
        let playerProm = dbconfig.collection_players.findOne(
            {playerId: playerId}
        ).populate({path: "platform", model: dbconfig.collection_platform}).lean();
        return Q.all([playerProm, recordProm]).then(
            data => {
                //get player's platform reward event data
                if (data && data[0] && data[1] && !data[1].bDirty && String(data[1].playerId) == String(data[0]._id)) {
                    player = data[0];
                    record = data[1];
                    platformId = player.platform;

                    let taskProm;
                    if (!player.platform.canMultiReward) {
                        taskProm = dbRewardTask.getRewardTask(
                            {
                                playerId: player._id,
                                status: constRewardTaskStatus.STARTED,
                                useLockedCredit
                            }
                        );
                    }
                    else {
                        taskProm = Q.resolve(false);
                    }

                    //get reward event data
                    var eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_TOP_UP_REWARD, code);
                    return Q.all([eventProm, taskProm]);
                }
                else {
                    if (data[1] && data[1].bDirty) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "This top up record has been used"
                        });
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            message: "Invalid data"
                        });
                    }
                }
            }
        ).then(
            function (data) {
                if (!data) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find player top up reward event data for platform"
                    });
                }

                var eventData = data[0];
                var taskData = data[1];
                if (taskData) {
                    return Q.reject({
                        status: constServerCode.PLAYER_HAS_REWARD_TASK,
                        name: "DataError",
                        message: "The player has not unlocked the previous reward task. Not valid for new reward"
                    });
                }

                if (!rewardUtility.isValidRewardEvent(constRewardType.PLAYER_TOP_UP_REWARD, eventData)) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Invalid player top up reward event data for platform"
                    });
                }

                var rewardParam = eventData.param.reward;
                if (!rewardParam) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player is not valid for this reward"
                    });
                }

                if (record.amount < rewardParam.minTopUpAmount) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Topup amount is less than minimum topup requirement"
                    });
                }

                // All conditions have been satisfied.
                deductionAmount = record.amount;
                return dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform, deductionAmount, constPlayerCreditChangeType.TOP_UP_REWARD_DEDUCTION, record).then(
                    function () {
                        bDoneDeduction = true;

                        var rewardAmount = rewardParam.rewardAmount;
                        var proposalData = {
                            type: eventData.executeProposal,
                            creator: adminInfo ? adminInfo :
                                {
                                    type: 'player',
                                    name: player.name,
                                    id: playerId
                                },
                            data: {
                                playerObjId: player._id,
                                playerId: player.playerId,
                                playerName: player.name,
                                platformId: platformId,
                                topUpRecordId: topUpRecordId,
                                applyAmount: deductionAmount,
                                rewardAmount: rewardAmount,
                                spendingAmount: (record.amount + rewardAmount) * rewardParam.unlockTimes,
                                minTopUpAmount: rewardParam.minTopUpAmount,
                                maxRewardAmount: rewardParam.maxRewardAmount,
                                useConsumption: true,
                                eventId: eventData._id,
                                eventName: eventData.name,
                                eventCode: eventData.code,
                                eventDescription: eventData.description
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
                        proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                        return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                            {_id: record._id, createTime: record.createTime, bDirty: {$ne: true}},
                            {
                                bDirty: true,
                                usedType: constRewardType.PLAYER_TOP_UP_REWARD,
                                $push: {usedEvent: eventData._id}
                            },
                            {new: true}
                        ).then(
                            data => {
                                if (data && data.bDirty) {
                                    return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
                                        data => data,
                                        error => {
                                            //clean top up record if create proposal failed
                                            console.error({
                                                name: "DBError",
                                                message: "Create player top up reward proposal failed",
                                                data: proposalData,
                                                error: error
                                            });
                                            return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                                                {
                                                    _id: record._id,
                                                    createTime: record.createTime
                                                }, {bDirty: false}
                                            ).catch(errorUtils.reportError).then(
                                                () => Q.reject(error)
                                            );
                                        }
                                    );
                                }
                                else {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "This top up record has been used"
                                    });
                                }
                            }
                        );
                    }
                );
            }
        ).catch(
            error => Q.resolve().then(
                () => bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, constPlayerCreditChangeType.APPLY_TOP_UP_REWARD_REFUND, error)
            ).then(
                () => Q.reject(error)
            )
        );
    },

    applyRewardEvent: function (userAgent, playerId, code, data, adminId, adminName) {
        data = data || {};
        let playerInfo = null;
        let adminInfo = '';
        if (adminId && adminName) {
            adminInfo = {
                name: adminName,
                type: 'admin',
                id: adminId
            }
        }

        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            playerData => {
                if (playerData) {
                    playerInfo = playerData;
                    if (playerData.permission && playerData.permission.banReward) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Player do not have permission for reward"
                        });
                    }
                    //check if player's reward task is no credit now
                    return dbRewardTask.checkPlayerRewardTaskStatus(playerData._id).then(
                        taskStatus => {
                            return dbconfig.collection_rewardEvent.findOne({platform: playerData.platform, code: code})
                                .populate({path: "type", model: dbconfig.collection_rewardType}).lean();
                        }
                    );
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Can not find player"
                    });
                }
            }
        ).then(
            rewardEvent => {
                if (rewardEvent && rewardEvent.type) {
                    // Check reward individual permission
                    let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(playerInfo, rewardEvent._id);
                    if (playerIsForbiddenForThisReward) {
                        return Q.reject({name: "DataError", message: "Player is forbidden for this reward."});
                    }

                    //check valid time for reward event
                    let curTime = new Date();
                    if ((rewardEvent.validStartTime && curTime.getTime() < rewardEvent.validStartTime.getTime()) ||
                        (rewardEvent.validEndTime && curTime.getTime() > rewardEvent.validEndTime.getTime())) {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "This reward event is not valid anymore"
                        });
                    }

                    // The following behavior can generate reward task
                    let rewardTaskWithProposalList = [
                        constRewardType.FIRST_TOP_UP,
                        constRewardType.PLAYER_TOP_UP_RETURN,
                        constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
                        constRewardType.PLAYER_LEVEL_UP,
                        constRewardType.PLAYER_TOP_UP_REWARD,
                        constRewardType.PLAYER_REGISTRATION_REWARD,
                        constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD,
                        constRewardType.FULL_ATTENDANCE,
                        constRewardType.GAME_PROVIDER_REWARD,
                        constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD,
                        constRewardType.PLAYER_PACKET_RAIN_REWARD,
                        constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP,
                        constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
                        constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP,
                        constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP
                    ];

                    // Check any consumption after topup upon apply reward
                    let lastTopUpProm = dbconfig.collection_playerTopUpRecord.findOne({_id: data.topUpRecordId});
                    let lastConsumptionProm = dbconfig.collection_playerConsumptionRecord.find({playerId: playerInfo._id}).sort({createTime: -1}).limit(1);
                    let pendingCount = 0;
                    if (playerInfo.platform && playerInfo.platform.useLockedCredit) {
                        pendingCount = dbRewardTask.getPendingRewardTaskCount({
                            mainType: 'Reward',
                            "data.playerObjId": playerInfo._id,
                            status: 'Pending'
                        }, rewardTaskWithProposalList);
                    }

                    let rewardData = {};

                    return Promise.all([lastTopUpProm, lastConsumptionProm, pendingCount]).then(
                        timeCheckData => {
                            rewardData.selectedTopup = timeCheckData[0];

                            //special handling for eu大爆炸 reward
                            if (timeCheckData[0] && timeCheckData[1] && timeCheckData[1][0] && timeCheckData[0].settlementTime < timeCheckData[1][0].createTime
                                && (rewardEvent.type.name != constRewardType.PLAYER_TOP_UP_RETURN || (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN
                                    && (rewardEvent.validStartTime || rewardEvent.validEndTime)))) {
                                // There is consumption after top up
                                if (rewardEvent.type.isGrouped && rewardEvent.condition.allowConsumptionAfterTopUp) {
                                    // Bypass this checking
                                } else {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "There is consumption after top up"
                                    });
                                }
                            }

                            // if there is a pending reward, then no other reward can be applied.
                            if (timeCheckData[2] && timeCheckData[2] > 0) {
                                if (rewardTaskWithProposalList.indexOf(rewardEvent.type.name) != -1) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_PENDING_REWARD_PROPOSAL,
                                        name: "DataError",
                                        message: "Player or partner already has a pending reward proposal for this type"
                                    });
                                }
                            }

                            switch (rewardEvent.type.name) {
                                //first top up
                                case constRewardType.FIRST_TOP_UP:
                                    if (data.topUpRecordId && !data.topUpRecordIds) {
                                        data.topUpRecordIds = [data.topUpRecordId];
                                    }
                                    if (data.topUpRecordIds == null) {
                                        return Q.reject({
                                            status: constServerCode.INVALID_DATA,
                                            name: "Missing top up record ids",
                                            message: "Invalid Data"
                                        });
                                    }
                                    return dbPlayerInfo.applyForFirstTopUpRewardProposal(userAgent, null, playerId, data.topUpRecordIds, code, adminInfo);
                                    break;
                                //provider reward
                                case constRewardType.GAME_PROVIDER_REWARD:
                                    if (data.amount == null) {
                                        return Q.reject({
                                            status: constServerCode.INVALID_DATA,
                                            name: "DataError",
                                            message: "Invalid Data"
                                        });
                                    }
                                    return dbPlayerInfo.applyForGameProviderRewardAPI(userAgent, playerId, code, data.amount, adminInfo);
                                    break;
                                //request consumption rebate
                                case constRewardType.PLAYER_CONSUMPTION_RETURN:
                                    return dbPlayerConsumptionWeekSummary.startCalculatePlayerConsumptionReturn(playerId, true, adminId, code);
                                    break;
                                case constRewardType.PLAYER_TOP_UP_RETURN:
                                    if (data.topUpRecordId == null) {
                                        return Q.reject({
                                            status: constServerCode.INVALID_DATA,
                                            name: "DataError",
                                            message: "Invalid Data"
                                        });
                                    }
                                    return dbPlayerInfo.applyTopUpReturn(userAgent, playerId, data.topUpRecordId, code, adminInfo);
                                    break;
                                case constRewardType.PLAYER_CONSUMPTION_INCENTIVE:
                                    return dbPlayerInfo.applyConsumptionIncentive(userAgent, playerId, code, adminInfo);
                                    break;
                                case constRewardType.PLAYER_TOP_UP_REWARD:
                                    return dbPlayerInfo.applyPlayerTopUpReward(userAgent, playerId, code, data.topUpRecordId, adminInfo);
                                    break;
                                case constRewardType.PLAYER_REFERRAL_REWARD:
                                    return dbPlayerInfo.applyPlayerReferralReward(userAgent, playerId, code, data.referralName, adminInfo);
                                    break;
                                case constRewardType.PLAYER_REGISTRATION_REWARD:
                                    return dbPlayerInfo.applyPlayerRegistrationReward(userAgent, playerId, code, adminInfo);
                                    break;
                                case constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD:
                                    if (data.topUpRecordId == null) {
                                        return Q.reject({
                                            status: constServerCode.INVALID_DATA,
                                            name: "DataError",
                                            message: "Invalid Data"
                                        });
                                    }
                                    return dbPlayerInfo.applyPlayerDoubleTopUpReward(userAgent, playerId, code, data.topUpRecordId, adminInfo);
                                    break;
                                case constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD:
                                    return dbPlayerReward.applyConsecutiveLoginReward(userAgent, playerId, code, adminInfo);
                                    break;
                                case constRewardType.PLAYER_EASTER_EGG_REWARD:
                                    return dbPlayerReward.applyEasterEggReward(playerId, code, adminInfo);
                                    break;
                                case constRewardType.PLAYER_PACKET_RAIN_REWARD:
                                    return dbPlayerReward.applyPacketRainReward(playerId, code, adminInfo);
                                    break;
                                case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                                case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                                case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                                case constRewardType.PLAYER_RANDOM_REWARD_GROUP:
                                case constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP:
                                case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                                    // Check whether platform allowed for reward group
                                    // if (!playerInfo.platform.useProviderGroup) {
                                    //     return Q.reject({
                                    //         status: constServerCode.GROUP_REWARD_NOT_ALLOWED,
                                    //         name: "DataError",
                                    //         message: "This reward only applicable on platform with provider group"
                                    //     });
                                    // }

                                    if (data.applyTargetDate) {
                                        rewardData.applyTargetDate = data.applyTargetDate;
                                    }
                                    rewardData.smsCode = data.smsCode;
                                    return dbPlayerReward.applyGroupReward(playerInfo, rewardEvent, adminInfo, rewardData);
                                    break;
                                default:
                                    return Q.reject({
                                        status: constServerCode.INVALID_DATA,
                                        name: "DataError",
                                        message: "Can not find reward event type"
                                    });
                                    break;
                            }
                        }
                    )
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Can not find reward event"
                    });
                }
            }
        );
    },

    getPlayerCheckInBonus: function (userAgent, playerId) {
        let platformObjId;
        let playersQuery = {
            playerId: playerId
        };
        return dbconfig.collection_players.findOne(playersQuery).lean().then(
            player => {
                platformObjId = player.platform;
                let rewardTypeQuery = {
                    name: constProposalType.PLAYER_CONSECUTIVE_REWARD_GROUP
                };
                return dbconfig.collection_rewardType.findOne(rewardTypeQuery);
            }
        ).then(
            rewardType => {
                if(rewardType) {
                    let rewardEventQuery = {
                        platform: platformObjId,
                        type: rewardType._id
                    };
                    return dbconfig.collection_rewardEvent.find(rewardEventQuery).lean().sort({validStartTime: -1});
                } else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot find reward type for type name"
                    });
                }
            }
        ).then(
            rewardEvents => {
                if(rewardEvents && rewardEvents.length > 0) {
                    return dbPlayerInfo.applyRewardEvent(userAgent, playerId, rewardEvents[0].code);
                } else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot find reward event for platform and type name"
                    });
                }
            }
        )
    },

    getPlayerTransferErrorLog: function (playerObjId) {
        return dbconfig.collection_playerCreditTransferLog.find({
            playerObjId: playerObjId, bUsed: {$ne: true}    //status: constPlayerCreditTransferStatus.FAIL
        }).sort({"createTime": -1}).limit(constSystemParam.MAX_RECORD_NUM);
    },

    verifyPlayerPhoneNumber: function (playerObjId, phoneNumber) {
        var enPhoneNumber = rsaCrypto.encrypt(phoneNumber);
        return dbconfig.collection_players.findOne({
            _id: playerObjId,
            phoneNumber: {$in: [phoneNumber, enPhoneNumber]}
        }).then(
            playerData => {
                return Boolean(playerData);
            }
        )
    },

    verifyPlayerBankAccount: function (playerObjId, bankAccount) {
        return dbconfig.collection_players.findOne({_id: playerObjId, bankAccount: bankAccount}).then(
            playerData => {
                return Boolean(playerData);
            }
        )
    },

    createPlayerClientSourceLog: function (data) {
        var domain = "";
        var url = data.sourceUrl;
        //find & remove protocol (http, ftp, etc.) and get domain
        if (url.indexOf("://") > -1) {
            domain = url.split('/')[2];
        }
        else {
            domain = url.split('/')[0];
        }
        //find & remove port number
        domain = domain.split(':')[0];
        data.domain = domain;

        let platformObjId;

        dbconfig.collection_platform.findOne({platformId: data.platformId}).lean().then(
            function (platform) {
                platformObjId = platform._id;
                return dbconfig.collection_players.findOne(
                    {name: data.playerName, platform: platformObjId}
                ).lean();
            },
            function (error) {
                console.error({
                    message: "Platform not found.",
                    error: error
                })
            }
        ).then(
            function (player) {
                let playerObjId = player._id;
                dbconfig.collection_players.findOneAndUpdate(
                    {_id: playerObjId, platform: platformObjId},
                    {sourceUrl: data.sourceUrl}
                ).lean().exec();
            },
            function (error) {
                console.error({
                    message: "Platform not found.",
                    error: error
                })
            }
        );

        var newLog = new dbconfig.collection_playerClientSourceLog(data);
        return newLog.save();
    },

    getPlayerReferralList: function (playerId, startIndex, requestCount, sort, status) {
        var playerObj = null;
        var seq = sort ? -1 : 1;
        var prefix = "";
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            playerData => {
                if (playerData && playerData.platform) {
                    playerObj = playerData;
                    prefix = playerData.platform.prefix;
                    return dbRewardEvent.getPlatformRewardEventWithTypeName(playerData.platform._id, constRewardType.PLAYER_REFERRAL_REWARD);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            rewardEvent => {
                if (rewardEvent && rewardEvent.param && rewardEvent.param.reward) {
                    //check if player has enough top up amount
                    if (playerObj.topUpSum < rewardEvent.param.minTopUpAmount) {
                        return dbconfig.collection_players.find({referral: playerObj._id}, {similarPlayers: 0}).sort({registrationTime: seq}).lean();
                    }
                    return dbconfig.collection_players.find({referral: playerObj._id}, {similarPlayers: 0}).sort({registrationTime: seq}).lean().then(
                        players => {
                            if (players && players.length > 0) {
                                var proms = [];
                                players.forEach(
                                    player => proms.push(dbPlayerInfo.getPlayerStatusForReferralReward(player, rewardEvent))
                                );
                                return Q.all(proms);
                            }
                            else {
                                return [];
                            }
                        }
                    );
                }
                else {
                    return dbconfig.collection_players.find({referral: playerObj._id}, {similarPlayers: 0}).sort({registrationTime: seq}).lean();
                }
            }
        ).then(
            data => {
                if (data) {
                    var list = data.filter(player => {
                        if (player) {
                            player.rewardStatus = player.rewardStatus || constReferralStatus.INVALID;
                            player.name = player.name.replace(prefix, "");
                        }
                        if (status && player.rewardStatus != status) return false;
                        return player;
                    });
                    return {
                        stats: {
                            startIndex: startIndex,
                            totalCount: list.length
                        },
                        records: list.slice(startIndex, startIndex + requestCount)
                    };
                }
                else {
                    return {
                        stats: {
                            startIndex: startIndex,
                            totalCount: 0
                        },
                        records: []
                    };
                }
            }
        );
    },

    getPlayerStatusForReferralReward: function (playerData, rewardEvent) {
        //check if this player has been used for referral reward
        if (playerData.isReferralReward) {
            playerData.rewardStatus = constReferralStatus.APPLIED;
            return Q.resolve(playerData);
        }
        //check if player is expired for this reward
        var curDate = new Date().getTime();
        var registerDate = new Date(playerData.registrationTime);
        if (curDate - registerDate.getTime() > rewardEvent.param.reward.expirationDays * 24 * 60 * 60 * 1000) {
            playerData.rewardStatus = constReferralStatus.EXPIRED;
            return Q.resolve(playerData);
        }
        //check if player's top up amount is enough
        var endTime = new Date(registerDate.getTime() + rewardEvent.param.reward.validTopUpDays * 24 * 60 * 60 * 1000);
        return dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: playerData.platform,
                    playerId: playerData._id,
                    createTime: {
                        $gte: registerDate,
                        $lt: endTime
                    },
                }
            },
            {
                $group: {
                    _id: {playerId: "$playerId"},
                    amount: {$sum: "$amount"}
                }
            }
        ).then(
            data => {
                if (data && data[0] && data[0].amount >= rewardEvent.param.reward.validTopUpAmount) {
                    playerData.rewardStatus = constReferralStatus.VALID;
                    return playerData;
                }
                else {
                    playerData.rewardStatus = constReferralStatus.INVALID;
                    return playerData;
                }
            }
        );
    },

    applyPlayerReferralReward: function (userAgent, playerId, code, referralName, ifAdmin) {
        var playerObj = null;
        var referralObj = null;
        var rewardEvent = null;
        var adminInfo = ifAdmin;
        var topUpAmount = 0;

        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    return dbRewardEvent.getPlatformRewardEventWithTypeName(playerData.platform, constRewardType.PLAYER_REFERRAL_REWARD, code);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            rewardData => {
                if (rewardData && rewardData.param && rewardData.param.reward) {
                    rewardEvent = rewardData;
                    //check if player has enough top up amount
                    if (playerObj.topUpSum < rewardData.param.reward.minTopUpAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "Player does not have enough top up amount"
                        });
                    }
                    return dbconfig.collection_players.findOne({
                        name: referralName,
                        platform: playerObj.platform
                    }).lean();
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Invalid reward event"
                    });
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    referralObj = playerData;
                    //check if it is the right referral
                    if (String(referralObj.referral) != String(playerObj._id)) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "This referral player is incorrect"
                        });
                    }
                    //check if this player has been used for referral reward
                    if (playerData.isReferralReward) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "This player has been used to apply this reward"
                        });
                    }
                    //check if player is expired for this reward
                    var curDate = new Date().getTime();
                    var registerDate = new Date(playerData.registrationTime);
                    if (curDate - registerDate.getTime() > rewardEvent.param.reward.expirationDays * 24 * 60 * 60 * 1000) {
                        playerData.rewardStatus = constReferralStatus.EXPIRED;
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Referral player is expired for this reward"
                        });
                    }
                    //check if player's top up amount is enough
                    var endTime = new Date(registerDate.getTime() + rewardEvent.param.reward.validTopUpDays * 24 * 60 * 60 * 1000);
                    return dbconfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                platformId: playerData.platform,
                                playerId: playerData._id,
                                createTime: {
                                    $gte: registerDate,
                                    $lt: endTime
                                },
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId"},
                                amount: {$sum: "$amount"}
                            }
                        }
                    ).then(
                        data => {
                            if (data && data[0] && data[0].amount >= rewardEvent.param.reward.validTopUpAmount) {
                                topUpAmount = data[0].amount;
                                return Math.min(data[0].amount * rewardEvent.param.reward.rewardPercentage, rewardEvent.param.reward.maxRewardAmount);
                            }
                            else {
                                return Q.reject({
                                    status: constServerCode.REWARD_EVENT_INVALID,
                                    name: "DataError",
                                    message: "Referral does not have enough topup amount"
                                });
                            }
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Can not find referral player"
                    });
                }
            }
        ).then(
            rewardAmount => {
                if (rewardAmount) {
                    var proposalData = {
                        type: rewardEvent.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: playerObj.name,
                                id: playerId
                            },
                        data: {
                            playerObjId: playerObj._id,
                            playerId: playerObj.playerId,
                            playerName: playerObj.name,
                            realName: playerObj.realName,
                            platformObjId: playerObj.platform,
                            rewardAmount: rewardAmount,
                            eventId: rewardEvent._id,
                            eventName: rewardEvent.name,
                            eventCode: rewardEvent.code,
                            referralName: referralName,
                            referralId: referralObj.playerId,
                            referralTopUpAmount: topUpAmount,
                            eventDescription: rewardEvent.description
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };
                    proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                    return dbProposal.createProposalWithTypeId(rewardEvent.executeProposal, proposalData);
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid reward amount"});
                }
            }
        ).then(
            proposalData => {
                //update referral player status
                return dbconfig.collection_players.findOneAndUpdate({
                    _id: referralObj._id,
                    platform: referralObj.platform
                }, {isReferralReward: true}).then(
                    () => proposalData
                );
            }
        );
    },

    applyPlayerRegistrationReward: function (userAgent, playerId, code, adminInfo) {
        var playerObj = null;
        var rewardEvent = null;

        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    return dbRewardEvent.getPlatformRewardEventWithTypeName(playerData.platform, constRewardType.PLAYER_REGISTRATION_REWARD, code);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            rewardData => {
                if (rewardData && rewardData.param) {
                    rewardEvent = rewardData;
                    //check if player has enough top up amount
                    if (playerObj.validCredit >= 1) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "Player has too much valid credit"
                        });
                    }
                    return dbconfig.collection_proposalType.findOne({
                        platformId: playerObj.platform,
                        name: constProposalType.PLAYER_REGISTRATION_REWARD
                    }).lean().then(
                        proposalTypeData => {
                            if (proposalTypeData) {
                                return dbconfig.collection_proposal.findOne({
                                    type: proposalTypeData._id,
                                    status: {$in: [constProposalStatus.PENDING, constProposalStatus.PROCESSING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                    "data.playerObjId": playerObj._id
                                }).lean();
                            }
                            else {
                                return Q.reject({
                                    name: "DataError",
                                    message: "Cannot find player registration reward proposal type"
                                });
                            }
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Invalid reward event"
                    });
                }
            }
        ).then(
            proposalData => {
                if (!proposalData) {
                    var proposalData = {
                        type: rewardEvent.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: playerObj.name,
                                id: playerId
                            },
                        data: {
                            playerObjId: playerObj._id,
                            playerId: playerObj.playerId,
                            playerName: playerObj.name,
                            platformObjId: playerObj.platform,
                            rewardAmount: rewardEvent.param.rewardAmount,
                            unlockBonusAmount: rewardEvent.param.unlockBonusAmount,
                            eventId: rewardEvent._id,
                            eventName: rewardEvent.name,
                            eventCode: rewardEvent.code,
                            eventDescription: rewardEvent.description
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };
                    proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                    return dbProposal.createProposalWithTypeId(rewardEvent.executeProposal, proposalData);
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player has applied for this reward"
                    });
                }
            }
        );
    },

    applyPlayerDoubleTopUpReward: function (userAgent, playerId, code, topUpRecordId, adminInfo) {
        var platformId = null;
        var player = {};
        var record = {};
        var deductionAmount;
        var bDoneDeduction = false;
        let eventData = {};

        var recordProm = dbconfig.collection_playerTopUpRecord.findById(topUpRecordId).lean();
        let playerProm = dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "playerLevel", model: dbconfig.collection_playerLevel}
        ).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean();
        return Q.all([playerProm, recordProm]).then(
            data => {
                // Check player permission to apply this reward
                if (data && data[0] && data[0].permission && data[0].permission.banReward) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        message: "Reward not applicable"
                    });
                }

                //get player's platform reward event data
                if (data && data[0] && data[1] && !data[1].bDirty && String(data[1].playerId) == String(data[0]._id)) {
                    player = data[0];
                    record = data[1];
                    platformId = player.platform;

                    let taskProm;
                    if (!player.platform.canMultiReward) {
                        taskProm = dbRewardTask.getRewardTask(
                            {
                                playerId: player._id,
                                status: constRewardTaskStatus.STARTED,
                                useLockedCredit: true
                            }
                        );
                    }
                    else {
                        taskProm = Q.resolve(false);
                    }

                    //get reward event data
                    var eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD, code);
                    return eventProm.then(
                        eData => {
                            eventData = eData;

                            let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(player, eventData._id);

                            if (playerIsForbiddenForThisReward) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_NO_PERMISSION,
                                    name: "DataError",
                                    message: "Reward not applicable"
                                });
                            }

                            //get today's double top up reward
                            let rewardProm = dbconfig.collection_proposalType.findOne({
                                name: constProposalType.PLAYER_DOUBLE_TOP_UP_REWARD,
                                platformId: player.platform
                            }).lean().then(
                                type => {
                                    if (type) {
                                        let proposalQuery = {
                                            type: type._id,
                                            "data.playerObjId": player._id,
                                            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.PENDING, constProposalStatus.SUCCESS]}
                                        };
                                        let todayTime = dbUtility.getTodaySGTime();
                                        if (eventData.param.maxRewardTimes == 0) {
                                            proposalQuery["data.eventCode"] = eventData.code;
                                        }
                                        else {
                                            proposalQuery["createTime"] = {
                                                $gte: todayTime.startTime,
                                                $lt: todayTime.endTime
                                            };
                                        }
                                        return dbconfig.collection_proposal.find(proposalQuery).count();
                                    }
                                    else {
                                        return Q.reject({
                                            name: "DataError",
                                            message: "Can not find player double top up reward proposal type"
                                        });
                                    }
                                }
                            );

                            return Q.all([taskProm, rewardProm]);
                        }
                    );
                }
                else {
                    if (data[1] && data[1].bDirty) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "This top up record has been used"
                        });
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            message: "Invalid data"
                        });
                    }
                }
            }
        ).then(
            function (data) {
                if (!data) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find player double top up reward event data for platform"
                    });
                }

                var taskData = data[0];
                if (taskData) {
                    return Q.reject({
                        status: constServerCode.PLAYER_HAS_REWARD_TASK,
                        name: "DataError",
                        message: "The player has not unlocked the previous reward task. Not valid for new reward"
                    });
                }

                if (!rewardUtility.isValidRewardEvent(constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD, eventData)) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Invalid player top up reward event data for platform"
                    });
                }

                let rewardParam = eventData.param.reward;
                if (!rewardParam) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player is not valid for this reward"
                    });
                }

                if (eventData.param && eventData.param.maxRewardTimes != null &&
                    ((eventData.param.maxRewardTimes > 0 && data[1] >= eventData.param.maxRewardTimes) ||
                        (eventData.param.maxRewardTimes == 0 && data[1] > 0))) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player has applied for max reward times"
                    });
                }

                //find player reward amount
                var rewardAmount = 0;
                var maxRewardAmount = 0;
                var consumptionTimes = 0;
                eventData.param.reward.forEach(
                    rewardRow => {
                        if (player.playerLevel.value >= rewardRow.minPlayerLevel && record.amount >= rewardRow.topUpAmount && rewardRow.rewardAmount > rewardAmount) {
                            rewardAmount = rewardRow.rewardAmount;
                            maxRewardAmount = rewardRow.maxRewardAmount;
                            consumptionTimes = rewardRow.consumptionTimes;
                        }
                    }
                );

                if (!rewardAmount || rewardAmount <= 0) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Topup amount is less than minimum topup requirement"
                    });
                }

                // All conditions have been satisfied.
                deductionAmount = record.amount;
                let creditProm = Q.resolve(false);
                if (player.platform.useLockedCredit) {
                    dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform, deductionAmount, "applyPlayerDoubleTopUpReward:Deduction", record);
                }
                return creditProm.then(
                    function (bDeduct) {
                        bDoneDeduction = bDeduct;
                        var proposalData = {
                            type: eventData.executeProposal,
                            creator: adminInfo ? adminInfo :
                                {
                                    type: 'player',
                                    name: player.name,
                                    id: playerId
                                },
                            data: {
                                playerObjId: player._id,
                                playerId: player.playerId,
                                playerName: player.name,
                                platformId: platformId,
                                topUpRecordId: topUpRecordId,
                                applyAmount: deductionAmount,
                                rewardAmount: rewardAmount,
                                spendingAmount: (record.amount + rewardAmount) * consumptionTimes,
                                maxRewardAmount: maxRewardAmount,
                                useConsumption: true,
                                eventId: eventData._id,
                                eventName: eventData.name,
                                eventCode: eventData.code,
                                eventDescription: eventData.description,
                                providers: eventData.param.providers,
                                targetEnable: eventData.param.targetEnable
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
                        proposalData.inputDevice = dbUtility.getInputDevice(userAgent,false);
                        return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                            {_id: record._id, createTime: record.createTime, bDirty: {$ne: true}},
                            {
                                bDirty: true,
                                usedType: constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD,
                                $push: {usedEvent: eventData._id}
                            },
                            {new: true}
                        ).then(
                            data => {
                                if (data && data.bDirty) {
                                    return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
                                        data => data,
                                        error => {
                                            //clean top up record if create proposal failed
                                            console.error({
                                                name: "DBError",
                                                message: "Create player double top up reward proposal failed",
                                                data: proposalData,
                                                error: error
                                            });
                                            return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                                                {
                                                    _id: record._id,
                                                    createTime: record.createTime
                                                }, {bDirty: false}
                                            ).catch(errorUtils.reportError).then(
                                                () => Q.reject(error)
                                            );
                                        }
                                    );
                                }
                                else {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "This top up record has been used"
                                    });
                                }
                            }
                        );
                    }
                );
            }
        ).catch(
            error => Q.resolve().then(
                () => bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, constPlayerCreditChangeType.APPLY_TOP_UP_REWARD_REFUND, error)
            ).then(
                () => Q.reject(error)
            )
        );
    },

    /**
     * Adds the given amount into the player's account, and creates a creditChangeLog record.
     * Can also be used to deduct credits from the account, by providing a negative value.
     *
     * @param {ObjectId} playerObjId
     * @param {ObjectId} platformObjId
     * @param {Number} updateAmount
     * @param {String} reasonType
     * @param {Object} [data]
     * @returns {Promise<PlayerInfo>}
     */
    changePlayerCredit: function changePlayerCredit(playerObjId, platformObjId, updateAmount, reasonType, data) {
        return dbconfig.collection_players.findOneAndUpdate(
            {_id: playerObjId, platform: platformObjId},
            {$inc: {validCredit: updateAmount}},
            {new: true}
        ).then(
            player => {
                if (!player) {
                    return Q.reject({name: "DataError", message: "Can't update player credit: player not found."});
                }
                dbLogger.createCreditChangeLog(playerObjId, platformObjId, updateAmount, reasonType, player.validCredit, null, data);
                return player;
            },
            error => {
                return Q.reject({name: "DBError", message: "Error updating player.", error: error});
            }
        );
    },

    /**
     * Attempts to take the given amount out of the player's account.
     * It resolves if the deduction was successful.
     * If rejects if the deduction failed for any reason.
     *
     * @param {ObjectId} playerObjId
     * @param {ObjectId} platformObjId
     * @param {Number} updateAmount - Must be positive
     * @param {String} reasonType
     * @param {Object} [data]
     * @returns {Promise}
     */
    tryToDeductCreditFromPlayer: function tryToDeductCreditFromPlayer(playerObjId, platformObjId, updateAmount, reasonType, data) {
        return Q.resolve().then(
            () => {
                if (updateAmount < 0) {
                    return Q.reject({
                        name: "DataError",
                        message: "tryToDeductCreditFromPlayer expects a positive value to deduct",
                        updateAmount: updateAmount
                    });
                }
            }
        ).then(
            () => dbconfig.collection_players.findOne({_id: playerObjId, platform: platformObjId}).select('validCredit')
        ).then(
            player => {
                if (player.validCredit < updateAmount) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "DataError",
                        message: "Player does not have enough credit."
                    });
                }
            }
        ).then(
            () => dbPlayerInfo.changePlayerCredit(playerObjId, platformObjId, -updateAmount, reasonType, data)
        ).then(
            player => {
                if (player.validCredit < 0) {
                    // First reset the deduction, then report the problem
                    return Q.resolve().then(
                        () => dbPlayerInfo.refundPlayerCredit(playerObjId, platformObjId, +updateAmount, constPlayerCreditChangeType.DEDUCT_BELOW_ZERO_REFUND, data)
                    ).then(
                        () => Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            message: "Player does not have enough credit.",
                            data: '(detected after withdrawl)'
                        })
                    );
                }
            }
        ).then(
            () => true
        );
    },

    /**
     * Just a conceptual shortcut for changePlayerCredit, could be tweaked in future.
     */
    refundPlayerCredit: function (playerObjId, platformObjId, refundAmount, reasonType, data) {
        return dbPlayerInfo.changePlayerCredit(playerObjId, platformObjId, refundAmount, reasonType, data);
    },

    /**
     * Get Player credit on specific days
     * @param {String} query - The query String.
     */
    getPlayerCreditsDaily: function (playerId, from, to, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'createTime': -1};
        var queryObj = {
            playerObjId: playerId,
            createTime: {
                $gte: new Date(from),
                $lt: new Date(to)
            }
        }
        var a = dbconfig.collection_playerCreditsDailyLog.find(queryObj).count();
        var b = dbconfig.collection_playerCreditsDailyLog.find(queryObj).sort(sortCol).skip(index).limit(limit).lean();

        return Q.all([a, b]).then(
            data => {
                return {size: data[0], data: data[1]}
            }
        )
    },

    updatePlayerReferral: function (playerObjId, referralName) {
        let player, referral;
        dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            playerData => {
                player = playerData;
                return dbconfig.collection_players.findOne({name: referralName}).lean();
            },
            error => {
                return Q.reject({
                    status: constServerCode.DATA_INVALID,
                    name: "DataError",
                    message: "Player not found.",
                    error: error
                });
            }
        ).then(
            referralData => {
                referral = referralData;
                return dbconfig.collection_players.findOneAndUpdate(
                    {
                        _id: player._id,
                        platform: player.platform
                    },
                    {
                        referral: referral._id
                    }
                ).lean();
            },
            error => {
                return Q.reject({
                    status: constServerCode.DATA_INVALID,
                    name: "DataError",
                    message: "Referral not found.",
                    error: error
                });
            }
        ).then(
            data => {
                return data;
            },
            error => {
                return Q.reject({
                    status: constServerCode.DB_ERROR,
                    name: "DBError",
                    message: "Player Update Failed.",
                    error: error
                });
            }
        );
    },

    //todo::send sms to player with content ???
    sendSMStoPlayer: function (playerObjId, type, content) {
        dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            playerData => {
                if (playerData && playerData.phoneNumber && playerData.smsSetting && playerData.smsSetting[type] && content) {
                    //todo:: get channel and send sms
                }
            }
        );
    },

    readMail: (playerId, mailObjId) => {
        return dbconfig.collection_playerMail.findOne({_id: mailObjId}).populate(
            {path: "recipientId", model: dbconfig.collection_players}
        ).then(
            mailData => {
                if (mailData && mailData.recipientId && mailData.recipientId.playerId == playerId) {
                    mailData.hasBeenRead = true;
                    return mailData.save();
                }
                else {
                    return Q.reject({name: "DBError", message: "Invalid Mail id"});
                }
            }
        );
    },

    getUnreadMail: (playerId) => {
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
                    return dbconfig.collection_playerMail.find(
                        {recipientId: playerData._id, recipientType: "player", hasBeenRead: false, bDelete: false}
                    ).lean();
                }
            }
        );
    },

    deleteAllMail: (playerId, hasBeenRead) => {
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            playerData => {
                if (playerData) {
                    let qObj = {recipientId: playerData._id, bDelete: false};
                    if (hasBeenRead !== undefined) {
                        qObj.hasBeenRead = Boolean(hasBeenRead);
                    }
                    return dbconfig.collection_playerMail.update(
                        qObj,
                        {bDelete: true},
                        {multi: true}
                    );
                }
                else {
                    return Q.reject({name: "DBError", message: "Invalid player data"});
                }
            }
        );
    },

    deleteMail: (playerId, mailObjId) => {
        return dbconfig.collection_playerMail.findOne({_id: mailObjId}).populate(
            {path: "recipientId", model: dbconfig.collection_players}
        ).then(
            mailData => {
                if (mailData && mailData.recipientId && mailData.recipientId.playerId == playerId) {
                    mailData.bDelete = true;
                    return mailData.save();
                }
                else {
                    return Q.reject({name: "DBError", message: "Invalid Mail id"});
                }
            }
        );
    },

    updatePlayerCredibilityRemark: (adminName, platformObjId, playerObjId, remarks, comment) => {
        return dbconfig.collection_players.findOneAndUpdate(
            {
                _id: playerObjId,
                platform: platformObjId
            },
            {
                credibilityRemarks: remarks
            }
        ).lean().then(
            playerData => {
                dbPlayerCredibility.createUpdateCredibilityLog(adminName, platformObjId, playerObjId, remarks, comment);
                // dbPlayerCredibility.calculatePlayerValue(playerData._id);
                return playerData;
            }
        );
    },

    updatePlayerPlayedProvider: (playerId, providerId) => {
        let player;
        return dbconfig.collection_players.findOne({_id: playerId}).lean().then(
            playerData => {
                player = playerData;
                if (player.gameProviderPlayed && player.gameProviderPlayed.length > 0) {
                    if (!providerId) {
                        return false;
                    }

                    let providerExisted = false;
                    let length = player.gameProviderPlayed.length;
                    for (let i = 0; i < length; i++) {
                        if (player.gameProviderPlayed[i].toString() === providerId.toString()) {
                            providerExisted = true;
                            break;
                        }
                    }
                    if (providerExisted) {
                        return false;
                    } else {
                        return [providerId];
                    }
                } else {
                    // return dbconfig.collection_playerConsumptionRecord.distinct("providerId", {playerId: player._id});
                    return [providerId];
                }
            }
        ).then(
            providerIds => {
                if (providerIds) {
                    return dbconfig.collection_players.findOneAndUpdate(
                        {
                            _id: player._id,
                            platform: player.platform
                        },
                        {
                            $push: {gameProviderPlayed: {$each: providerIds}}
                        }
                    ).lean();
                } else {
                    return player;
                }
            }
        );
    },

    getPlayerReport: function (platform, query, index, limit, sortCol) {
        limit = limit ? limit : 20;
        index = index ? index : 0;
        query = query ? query : {};

        let startDate = new Date(query.start);
        let endDate = new Date(query.end);
        let getPlayerProm = Promise.resolve("");
        let result = [];
        let resultSum = {
            manualTopUpAmount: 0,
            weChatTopUpAmount: 0,
            aliPayTopUpAmount: 0,
            onlineTopUpAmount: 0,
            topUpTimes: 0,
            topUpAmount: 0,
            bonusTimes: 0,
            bonusAmount: 0,
            rewardAmount: 0,
            consumptionReturnAmount: 0,
            consumptionTimes: 0,
            validConsumptionAmount: 0,
            consumptionBonusAmount: 0,
            profit: 0,
            consumptionAmount: 0,
        };

        if (query.name) {
            getPlayerProm = dbconfig.collection_players.findOne({name: query.name}, {_id: 1}).lean();
        }

        return getPlayerProm.then(
            player => {
                let relevantPlayerQuery = {platformId: platform, createTime: {$gte: startDate, $lte: endDate}};

                if (player) {
                    relevantPlayerQuery.playerId = player._id;
                }

                // relevant players are the players who played any game within given time period
                let consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                    {$match: relevantPlayerQuery},
                    {$group: {_id: "$playerId"}}
                ]);

                let stream = consumptionProm.cursor({batchSize: 100}).allowDiskUse(true).exec();
                let balancer = new SettlementBalancer();

                return balancer.initConns().then(function () {
                    return Q(
                        balancer.processStream(
                            {
                                stream: stream,
                                batchSize: constSystemParam.BATCH_SIZE,
                                makeRequest: function (playerIdObjs, request) {
                                    request("player", "getConsumptionDetailOfPlayers", {
                                        platformId: platform,
                                        startTime: query.start,
                                        endTime: query.end,
                                        query: query,
                                        playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                            return playerIdObj._id;
                                        })
                                    });
                                },
                                processResponse: function (record) {
                                    result = result.concat(record.data);
                                }
                            }
                        )
                    );
                });

            }
        ).then(
            () => {
                //handle sum of field here
                for (let z = 0; z < result.length; z++) {
                    resultSum.manualTopUpAmount += result[z].manualTopUpAmount;
                    resultSum.weChatTopUpAmount += result[z].weChatTopUpAmount;
                    resultSum.aliPayTopUpAmount += result[z].aliPayTopUpAmount;
                    resultSum.onlineTopUpAmount += result[z].onlineTopUpAmount;
                    resultSum.topUpTimes += result[z].topUpTimes;
                    resultSum.topUpAmount += result[z].topUpAmount;
                    resultSum.bonusTimes += result[z].bonusTimes;
                    resultSum.bonusAmount += result[z].bonusAmount;
                    resultSum.rewardAmount += result[z].rewardAmount;
                    resultSum.consumptionReturnAmount += result[z].consumptionReturnAmount;
                    resultSum.consumptionTimes += result[z].consumptionTimes;
                    resultSum.validConsumptionAmount += result[z].validConsumptionAmount;
                    resultSum.consumptionBonusAmount += result[z].consumptionBonusAmount;
                    // resultSum.profit += (result[z].consumptionBonusAmount / result[z].validConsumptionAmount * -100).toFixed(2) / 1;
                    resultSum.consumptionAmount += result[z].consumptionAmount;
                }
                resultSum.profit += (resultSum.consumptionBonusAmount / resultSum.validConsumptionAmount * -100).toFixed(2) / 1;

                // handle index limit sortcol here
                if (Object.keys(sortCol).length > 0) {
                    result.sort(function (a, b) {
                        if (a[Object.keys(sortCol)[0]] > b[Object.keys(sortCol)[0]]) {
                            return 1 * sortCol[Object.keys(sortCol)[0]];
                        } else {
                            return -1 * sortCol[Object.keys(sortCol)[0]];
                        }
                    });
                }
                else {
                    result.sort(function (a, b) {
                        if (a._id > b._id) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                }


                let outputResult = [];

                for (let i = 0, len = limit; i < len; i++) {
                    result[index + i] ? outputResult.push(result[index + i]) : null;
                }

                return {size: result.length, data: outputResult, total: resultSum};
            }
        );
    },

    getDXNewPlayerReport: function (platform, query, index, limit, sortCol) {
        limit = limit ? limit : 20;
        index = index ? index : 0;
        query = query ? query : {};

        let startDate = new Date(query.start);
        let endDate = new Date(query.end);
        let result = [];
        let matchObj = {
            platform: platform,
            registrationTime: {$gte: startDate, $lt: endDate}
        };

        if (query.userType) {
            switch (query.userType) {
                case "1":
                    matchObj.partner = {$exists: false};
                    break;
                case "2":
                    matchObj.partner = {$exists: true};
                    break;
            }
        }

        let stream = dbconfig.collection_players.aggregate({
            $match: matchObj
        }).cursor({batchSize: 100}).allowDiskUse(true).exec();

        let balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {
            return Q(
                balancer.processStream(
                    {
                        stream: stream,
                        batchSize: constSystemParam.BATCH_SIZE,
                        makeRequest: function (playerIdObjs, request) {
                            request("player", "getConsumptionDetailOfPlayers", {
                                platformId: platform,
                                startTime: query.start,
                                endTime: moment(query.start).add(query.days, "day"),
                                query: query,
                                playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                    return playerIdObj._id;
                                }),
                                option: {
                                    isDX: true
                                }
                            });
                        },
                        processResponse: function (record) {
                            result = result.concat(record.data);
                        }
                    }
                )
            );
        }).then(
            () => {
                // handle index limit sortcol here
                if (Object.keys(sortCol).length > 0) {
                    result.sort(function (a, b) {
                        if (a[Object.keys(sortCol)[0]] > b[Object.keys(sortCol)[0]]) {
                            return 1 * sortCol[Object.keys(sortCol)[0]];
                        } else {
                            return -1 * sortCol[Object.keys(sortCol)[0]];
                        }
                    });
                }
                else {
                    result.sort(function (a, b) {
                        if (a._id > b._id) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                }


                let outputResult = [];

                for (let i = 0, len = limit; i < len; i++) {
                    result[index + i] ? outputResult.push(result[index + i]) : null;
                }

                // Output filter promote way
                outputResult = query.csPromoteWay && query.csPromoteWay.length > 0 ? outputResult.filter(e => query.csPromoteWay.indexOf(e.csPromoteWay) >= 0) : outputResult;
                outputResult = query.admins && query.admins.length > 0 ? outputResult.filter(e => query.admins.indexOf(e.csOfficer) >= 0) : outputResult;

                return {size: result.length, data: outputResult};
            }
        );
    },

    verifyUserPassword: function (playerName, playerPassword) {
        return dbconfig.collection_players.findOne({name: playerName}, {password: 1}).lean().then(
            playerData => {
                if (!playerData) {
                    return false;
                }

                let db_password = String(playerData.password);

                if (dbUtility.isMd5(db_password)) {
                    return Boolean(md5(playerPassword) === db_password);
                }
                else {
                    return new Promise(function (resolve, reject) {
                        bcrypt.compare(String(playerPassword), db_password, function (err, isMatch) {
                            if (err) {
                                reject({
                                    name: "DataError",
                                    message: "Error in matching password",
                                    error: err
                                });
                            }
                            resolve(Boolean(isMatch));
                        });
                    });
                }
            }
        );
    },

    getConsumptionDetailOfPlayers: function (platformObjId, startTime, endTime, query, playerObjIds, option) {
        option = option || {};
        let proms = [];
        let proposalType = [];

        return dbconfig.collection_proposalType.find({platformId: platformObjId}, {name: 1}).lean().then(
            proposalTypeData => {
                proposalType = proposalTypeData;
                for (let p = 0, pLength = playerObjIds.length; p < pLength; p++) {
                    let prom;

                    if (option.isDX) {
                        prom = dbconfig.collection_players.findOne({
                            _id: playerObjIds[p]
                        }).then(
                            playerData => {
                                let qStartTime = new Date(playerData.registrationTime);
                                let qEndTime = moment(qStartTime).add(query.days, 'day');

                                return getPlayerRecord(playerObjIds[p], qStartTime, qEndTime, playerData.domain);
                            }
                        );

                        proms.push(prom);
                    } else if (option.isFeedback) {
                        let feedBackIds = playerObjIds;
                        let feedbackData;

                        prom = dbconfig.collection_playerFeedback.findOne({
                            _id: feedBackIds[p]
                        })
                            .populate({path: 'adminId', select: '_id adminName', model: dbconfig.collection_admin})
                            .then(
                                data => {
                                    feedbackData = JSON.parse(JSON.stringify(data));
                                    let qStartTime = new Date(feedbackData.createTime);
                                    let qEndTime = moment(qStartTime).add(query.days, 'day');
                                    return getPlayerRecord(feedbackData.playerId, qStartTime, qEndTime);
                                }
                            ).then(
                                data => {
                                    let playerRecord = JSON.parse(JSON.stringify(data));
                                    if(typeof playerRecord==="object") {
                                        playerRecord.feedback = feedbackData;
                                    }
                                    return playerRecord;
                                }
                            );
                        proms.push(prom);
                    }
                    else {
                        proms.push(getPlayerRecord(playerObjIds[p], new Date(startTime), new Date(endTime)));
                    }

                }

                return Promise.all(proms);
            },
            error => {
                return Promise.reject(error)
            }
        ).then(
            data => {
                return data.filter(result => {
                    return result !== "";
                });
            }
        );

        function getPlayerRecord(playerObjId, startTime, endTime, domain) {
            let result = {_id: playerObjId};
            playerObjId = {$in: [ObjectId(playerObjId), playerObjId]};
            let onlineTopUpTypeId = "";
            let manualTopUpTypeId = "";
            let weChatTopUpTypeId = "";
            let aliPayTopUpTypeId = "";
            let consumptionReturnTypeId = "";

            let consumptionPromMatchObj = {
                playerId: playerObjId,
                createTime: {
                    $gte: new Date(startTime),
                    $lte: new Date(endTime)
                }
            };

            query.providerId ? consumptionPromMatchObj.providerId = ObjectId(query.providerId) : false;

            for (let i = 0, len = proposalType.length; i < len; i++) {
                let proposalTypeObj = proposalType[i];
                if (proposalTypeObj.name === constProposalType.PLAYER_TOP_UP) {
                    onlineTopUpTypeId = proposalTypeObj._id.toString();
                }
                else if (proposalTypeObj.name === constProposalType.PLAYER_MANUAL_TOP_UP) {
                    manualTopUpTypeId = proposalTypeObj._id.toString();
                }
                else if (proposalTypeObj.name === constProposalType.PLAYER_WECHAT_TOP_UP) {
                    weChatTopUpTypeId = proposalTypeObj._id.toString();
                }
                else if (proposalTypeObj.name === constProposalType.PLAYER_ALIPAY_TOP_UP) {
                    aliPayTopUpTypeId = proposalTypeObj._id.toString();
                }
                else if (proposalTypeObj.name === constProposalType.PLAYER_CONSUMPTION_RETURN) {
                    consumptionReturnTypeId = proposalTypeObj._id.toString();
                }
            }

            let consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                {
                    $match: consumptionPromMatchObj
                },
                {
                    $group: {
                        _id: "$gameId",
                        gameId: {"$first": "$gameId"},
                        providerId: {"$first": "$providerId"},
                        count: {$sum: 1},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        bonusAmount: {$sum: "$bonusAmount"}
                    }
                }
            ]).allowDiskUse(true);

            let topUpProm = dbconfig.collection_proposal.aggregate([
                {
                    "$match": {
                        "data.playerObjId": playerObjId,
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "mainType": "TopUp",
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    }
                },
                {
                    "$group": {
                        "_id": "$type",
                        "typeId": {"$first": "$type"},
                        "count": {"$sum": 1},
                        "amount": {"$sum": "$data.amount"}
                    }
                }
            ]);

            let bonusProm = dbconfig.collection_proposal.aggregate([
                {
                    "$match": {
                        "data.playerObjId": playerObjId,
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "mainType": "PlayerBonus",
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    }
                },
                {
                    "$group": {
                        "_id": null,
                        "count": {"$sum": 1},
                        "amount": {"$sum": "$data.amount"}
                    }
                }
            ]);

            let consumptionReturnProm = dbconfig.collection_proposal.aggregate([
                {
                    "$match": {
                        "data.playerObjId": playerObjId,
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "type": ObjectId(consumptionReturnTypeId),
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    }
                },
                {
                    "$group": {
                        "_id": null,
                        "amount": {"$sum": "$data.rewardAmount"}
                    }
                }
            ]);

            let rewardProm = dbconfig.collection_proposal.aggregate([
                {
                    "$match": {
                        "data.playerObjId": playerObjId,
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "mainType": "Reward",
                        "type": {"$ne": ObjectId(consumptionReturnTypeId)},
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    }
                },
                {
                    "$group": {
                        "_id": null,
                        "amount": {"$sum": "$data.rewardAmount"}
                    }
                }
            ]);

            let playerQuery = {_id: playerObjId};
            if (query.playerLevel) {
                playerQuery.playerLevel = query.playerLevel;
            }
            if (query.credibilityRemarks && query.credibilityRemarks.length !== 0) {
                playerQuery.credibilityRemarks = {$in: query.credibilityRemarks};
            }
            if (query.hasOwnProperty('isRealPlayer')) {
                playerQuery.isRealPlayer = query.isRealPlayer;
            }
            if (query.hasOwnProperty('partner')) {
                playerQuery.partner = query.partner;
            }

            // Player Score Query Operator
            if (query.playerScoreValue) {
                switch (query.valueScoreOperator) {
                    case '>=':
                        playerQuery.valueScore = {$gte: query.playerScoreValue};
                        break;
                    case '=':
                        playerQuery.valueScore = {$eq: query.playerScoreValue};
                        break;
                    case '<=':
                        playerQuery.valueScore = {$lte: query.playerScoreValue};
                        break;
                    case 'range':
                        if (query.playerScoreValueTwo) {
                            playerQuery.valueScore = {$gte: query.playerScoreValue, $lte: query.playerScoreValueTwo};
                        }
                        break;
                }
            }

            let playerProm = dbconfig.collection_players.findOne(
                playerQuery, {
                    playerLevel: 1, credibilityRemarks: 1, name: 1, valueScore: 1, registrationTime: 1, accAdmin: 1
                }
            ).lean();

            // Promise domain CS and promote way
            let promoteWayProm = domain ?
                dbconfig.collection_csOfficerUrl.findOne({domain: {$regex: domain, $options: "x"}}).populate({
                    path: 'admin',
                    model: dbconfig.collection_admin
                }).lean() : Promise.resolve(false);

            return Promise.all([consumptionProm, topUpProm, bonusProm, consumptionReturnProm, rewardProm, playerProm, promoteWayProm]).then(
                data => {
                    if (!data[5]) {
                        return "";
                    }

                    result.gameDetail = data[0];
                    result.consumptionTimes = 0;
                    result.consumptionAmount = 0;
                    result.validConsumptionAmount = 0;
                    result.consumptionBonusAmount = 0;

                    let providerDetail = {};
                    for (let i = 0, len = result.gameDetail.length; i < len; i++) {
                        let gameRecord = result.gameDetail[i];
                        let providerId = gameRecord.providerId.toString();
                        result.gameDetail[i].bonusRatio = (result.gameDetail[i].bonusAmount / result.gameDetail[i].validAmount);

                        if (!providerDetail.hasOwnProperty(providerId)) {
                            providerDetail[providerId] = {
                                count: 0,
                                amount: 0,
                                validAmount: 0,
                                bonusAmount: 0
                            };
                        }

                        providerDetail[providerId].count += gameRecord.count;
                        providerDetail[providerId].amount += gameRecord.amount;
                        providerDetail[providerId].validAmount += gameRecord.validAmount;
                        providerDetail[providerId].bonusAmount += gameRecord.bonusAmount;
                        providerDetail[providerId].bonusRatio = (providerDetail[providerId].bonusAmount / providerDetail[providerId].validAmount);
                        result.consumptionTimes += gameRecord.count;
                        result.consumptionAmount += gameRecord.amount;
                        result.validConsumptionAmount += gameRecord.validAmount;
                        result.consumptionBonusAmount += gameRecord.bonusAmount;
                    }

                    result.consumptionBonusRatio = (result.consumptionBonusAmount / result.consumptionBonusRatio);
                    result.providerDetail = providerDetail;


                    // filter irrelevant result base on query
                    if (query.providerId && !providerDetail[query.providerId]) {
                        return "";
                    }

                    if (query.consumptionTimesValue && query.consumptionTimesOperator) {
                        let relevant = true;
                        switch (query.consumptionTimesOperator) {
                            case '>=':
                                relevant = result.consumptionTimes >= query.consumptionTimesValue;
                                break;
                            case '=':
                                relevant = result.consumptionTimes = query.consumptionTimesValue;
                                break;
                            case '<=':
                                relevant = result.consumptionTimes <= query.consumptionTimesValue;
                                break;
                            case 'range':
                                if (query.consumptionTimesValueTwo) {
                                    relevant = result.consumptionTimes >= query.consumptionTimesValue && result.consumptionTimes <= query.consumptionTimesValueTwo;
                                }
                                break;
                        }

                        if (!relevant) {
                            return "";
                        }
                    }

                    if (query.profitAmountValue && query.profitAmountOperator) {
                        let relevant = true;
                        switch (query.profitAmountOperator) {
                            case '>=':
                                relevant = result.consumptionBonusAmount >= query.profitAmountValue;
                                break;
                            case '=':
                                relevant = result.consumptionBonusAmount = query.profitAmountValue;
                                break;
                            case '<=':
                                relevant = result.consumptionBonusAmount <= query.profitAmountValue;
                                break;
                            case 'range':
                                if (query.profitAmountValueTwo) {
                                    relevant = result.consumptionBonusAmount >= query.profitAmountValue && result.consumptionBonusAmount <= query.profitAmountValueTwo;
                                }
                                break;
                        }

                        if (!relevant) {
                            return "";
                        }
                    }

                    // proposal related
                    result.topUpAmount = 0;
                    result.topUpTimes = 0;
                    result.onlineTopUpAmount = 0;
                    result.manualTopUpAmount = 0;
                    result.weChatTopUpAmount = 0;
                    result.aliPayTopUpAmount = 0;

                    let topUpTypeDetail = data[1];
                    for (let i = 0, len = topUpTypeDetail.length; i < len; i++) {
                        let topUpTypeRecord = topUpTypeDetail[i];

                        if (topUpTypeRecord.typeId.toString() === onlineTopUpTypeId) {
                            result.onlineTopUpAmount = topUpTypeRecord.amount;
                        }
                        else if (topUpTypeRecord.typeId.toString() === manualTopUpTypeId) {
                            result.manualTopUpAmount = topUpTypeRecord.amount;
                        }
                        else if (topUpTypeRecord.typeId.toString() === weChatTopUpTypeId) {
                            result.weChatTopUpAmount = topUpTypeRecord.amount;
                        }
                        else if (topUpTypeRecord.typeId.toString() === aliPayTopUpTypeId) {
                            result.aliPayTopUpAmount = topUpTypeRecord.amount;
                        }

                        result.topUpAmount += topUpTypeRecord.amount;
                        result.topUpTimes += topUpTypeRecord.count;
                    }

                    let bonusDetail = data[2][0];
                    result.bonusAmount = bonusDetail && bonusDetail.amount ? bonusDetail.amount : 0;
                    result.bonusTimes = bonusDetail && bonusDetail.count ? bonusDetail.count : 0;

                    let consumptionReturnDetail = data[3][0];
                    result.consumptionReturnAmount = consumptionReturnDetail && consumptionReturnDetail.amount ? consumptionReturnDetail.amount : 0;

                    let rewardDetail = data[4][0];
                    result.rewardAmount = rewardDetail && rewardDetail.amount ? rewardDetail.amount : 0;

                    // filter irrelevant result base on query
                    if (query.topUpTimesValue && query.topUpTimesOperator) {
                        let relevant = true;
                        switch (query.topUpTimesOperator) {
                            case '>=':
                                relevant = result.topUpTimes >= query.topUpTimesValue;
                                break;
                            case '=':
                                relevant = result.topUpTimes = query.topUpTimesValue;
                                break;
                            case '<=':
                                relevant = result.topUpTimes <= query.topUpTimesValue;
                                break;
                            case 'range':
                                if (query.topUpTimesValueTwo) {
                                    relevant = result.topUpTimes >= query.topUpTimesValue && result.topUpTimes <= query.topUpTimesValueTwo;
                                }
                                break;
                        }

                        if (!relevant) {
                            return "";
                        }
                    }

                    if (query.bonusTimesValue && query.bonusTimesOperator) {
                        let relevant = true;
                        switch (query.bonusTimesOperator) {
                            case '>=':
                                relevant = result.bonusTimes >= query.bonusTimesValue;
                                break;
                            case '=':
                                relevant = result.bonusTimes = query.bonusTimesValue;
                                break;
                            case '<=':
                                relevant = result.bonusTimes <= query.bonusTimesValue;
                                break;
                            case 'range':
                                if (query.bonusTimesValueTwo) {
                                    relevant = result.bonusTimes >= query.bonusTimesValue && result.bonusTimes <= query.bonusTimesValueTwo;
                                }
                                break;
                        }

                        if (!relevant) {
                            return "";
                        }
                    }

                    if (query.topUpAmountValue && query.topUpAmountOperator) {
                        let relevant = true;
                        switch (query.topUpAmountOperator) {
                            case '>=':
                                relevant = result.topUpAmount >= query.topUpAmountValue;
                                break;
                            case '=':
                                relevant = result.topUpAmount = query.topUpAmountValue;
                                break;
                            case '<=':
                                relevant = result.topUpAmount <= query.topUpAmountValue;
                                break;
                            case 'range':
                                if (query.topUpAmountValueTwo) {
                                    relevant = result.topUpAmount >= query.topUpAmountValue && result.topUpAmount <= query.topUpAmountValueTwo;
                                }
                                break;
                        }

                        if (!relevant) {
                            return "";
                        }
                    }

                    // player related
                    let playerDetail = data[5];
                    result.credibilityRemarks = playerDetail.credibilityRemarks;
                    result.playerLevel = playerDetail.playerLevel;
                    result.name = playerDetail.name;
                    result.valueScore = playerDetail.valueScore;
                    result.registrationTime = playerDetail.registrationTime;
                    result.endTime = endTime;

                    let csOfficerDetail = data[6];

                    // related admin
                    if (playerDetail.accAdmin) {
                        result.csOfficer = playerDetail.accAdmin;
                    }
                    else if (csOfficerDetail) {
                        result.csOfficer = csOfficerDetail.admin ? csOfficerDetail.admin.adminName : "";
                        result.csPromoteWay = csOfficerDetail.way;
                    }

                    return result;
                }
            );
        }
    },

    setShowInfo: (playerId, field, flag) => {
        let updateQ = {
            viewInfo: {}
        };

        updateQ.viewInfo[field] = flag;

        return dbUtility.findOneAndUpdateForShard(
            dbconfig.collection_players,
            {playerId: playerId},
            updateQ,
            constShardKeys.collection_players
        ).then(
            res => res.viewInfo[field]
        );
    },


    setBonusShowInfo: (playerId, showInfo) => {
        return dbUtility.findOneAndUpdateForShard(
            dbconfig.collection_players,
            {playerId: playerId},
            {"viewInfo.showInfoState": parseInt(showInfo)},
            constShardKeys.collection_players
        )

    },

    createUpdateTopUpGroupLog: (player, adminId, bankGroup, remark) => {
        remark = remark || "";
        let proms = [];
        for (let i = 0; i < Object.keys(bankGroup).length; i++) {
            if (bankGroup.hasOwnProperty(Object.keys(bankGroup)[i])) {
                let bankGroup$ = {};
                bankGroup$[Object.keys(bankGroup)[i]] = bankGroup[Object.keys(bankGroup)[i]];
                let logDetail = {
                    admin: adminId,
                    player: player,
                    topUpGroupNames: bankGroup$,
                    remark: remark
                }

                let createSingleLog = dbconfig.collection_playerTopUpGroupUpdateLog(logDetail)
                    .save().then().catch(errorUtils.reportError);
                proms.push(createSingleLog);
            }
        }
        return Promise.all(proms);
    },

    getPlayerTopUpGroupLog: function (playerId, index, limit) {
        console.log("getPlayerTopUpGroupLog:", playerId, index, limit);
        let logProm = dbconfig.collection_playerTopUpGroupUpdateLog.find({player: playerId}).sort({createTime: -1}).skip(index).limit(limit).populate(
            {path: "admin", select: 'adminName', model: dbconfig.collection_admin}
        ).lean();
        let countProm = dbconfig.collection_playerTopUpGroupUpdateLog.find({player: playerId}).count();

        return Promise.all([logProm, countProm]).then(
            data => {
                if (data) {
                    let logs = data[0];
                    let count = data[1];

                    return {data: logs, size: count};
                }
                else {
                    return {data: [], size: 0};
                }
            }
        )
    },

    createForbidRewardLog: function (playerId, adminId, forbidRewardNames, remark) {
        remark = remark || "";
        let logDetails = {
            player: playerId,
            admin: adminId,
            forbidRewardNames: forbidRewardNames,
            remark: remark
        };
        return dbconfig.collection_playerForbidRewardLog(logDetails).save().then().catch(errorUtils.reportError);
    },

    getForbidRewardLog: function (playerId, startTime, endTime, index, limit) {
        let logProm = dbconfig.collection_playerForbidRewardLog.find({
            player: playerId,
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }).skip(index).limit(limit).sort({createTime: -1}).populate(
            {path: "admin", select: 'adminName', model: dbconfig.collection_admin}
        ).lean();
        let countProm = dbconfig.collection_playerForbidRewardLog.find({player: playerId}).count();

        return Promise.all([logProm, countProm]).then(
            data => {
                let logs = data[0];
                let count = data[1];

                return {data: logs, size: count};
            }
        )
    },

    getForbidRewardPointsEventLog: function (playerId, startTime, endTime, index, limit) {
        let logProm = dbconfig.collection_playerForbidRewardPointsEventLog.find({
            player: playerId,
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }).skip(index).limit(limit).sort({createTime: -1}).populate(
            {path: "admin", select: 'adminName', model: dbconfig.collection_admin}
        ).lean();
        let countProm = dbconfig.collection_playerForbidRewardPointsEventLog.find({player: playerId}).count();

        return Promise.all([logProm, countProm]).then(
            data => {
                let logs = data[0];
                let count = data[1];

                return {data: logs, size: count};
            }
        )
    },

    createForbidRewardPointsEventLog: function (playerId, adminId, forbidRewardPointsEventNames, remark) {
        remark = remark || "";
        let logDetails = {
            player: playerId,
            admin: adminId,
            forbidRewardPointsEventNames: forbidRewardPointsEventNames,
            remark: remark
        };
        return dbconfig.collection_playerForbidRewardPointsEventLog(logDetails).save().then().catch(errorUtils.reportError);
    },

    createForbidGameLog: function (playerId, adminId, forbidGameNames, remark) {
        remark = remark || "";
        let logDetails = {
            player: playerId,
            admin: adminId,
            forbidGameNames: forbidGameNames,
            remark: remark
        };
        return dbconfig.collection_playerForbidGameLog(logDetails).save().then().catch(errorUtils.reportError);
    },

    getForbidGameLog: function (playerId, startTime, endTime, index, limit) {
        let logProm = dbconfig.collection_playerForbidGameLog.find({
            player: playerId,
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }).skip(index).limit(limit).sort({createTime: -1}).populate(
            {path: "admin", select: 'adminName', model: dbconfig.collection_admin}
        ).lean();
        let countProm = dbconfig.collection_playerForbidGameLog.find({player: playerId}).count();

        return Promise.all([logProm, countProm]).then(
            data => {
                let logs = data[0];
                let count = data[1];

                return {data: logs, size: count};
            }
        )
    },

    createForbidTopUpLog: function (playerId, adminId, forbidTopUpNames, remark) {
        remark = remark || "";
        let logDetails = {
            player: playerId,
            admin: adminId,
            forbidTopUpNames: forbidTopUpNames,
            remark: remark
        };
        return dbconfig.collection_playerForbidTopUpLog(logDetails).save().then().catch(errorUtils.reportError);
    },

    getForbidTopUpLog: function (playerId, startTime, endTime, index, limit) {
        let logProm = dbconfig.collection_playerForbidTopUpLog.find({
            player: playerId,
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }).skip(index).limit(limit).sort({createTime: -1}).populate(
            {path: "admin", select: 'adminName', model: dbconfig.collection_admin}
        ).lean();
        let countProm = dbconfig.collection_playerForbidTopUpLog.find({player: playerId}).count();

        return Promise.all([logProm, countProm]).then(
            data => {
                let logs = data[0];
                let count = data[1];

                return {data: logs, size: count};
            }
        )
    },

    comparePhoneNum: function (filterAllPlatform, platformObjId, arrayInputPhone) {
        let oldNewPhone = {$in: []};

        for (let i = 0; i < arrayInputPhone.length; i++) {
            oldNewPhone.$in.push(arrayInputPhone[i]);
            oldNewPhone.$in.push(rsaCrypto.encrypt(arrayInputPhone[i]));
        }

        // if true, user can filter phone across all platform
        if(filterAllPlatform) {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        } else {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone, "platform": ObjectId(platformObjId)}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        }

        let diffPhoneList;
        let samePhoneList;
        let arrayDbPhone = [];

        // display phoneNumber result that matched input phoneNumber
        return dbPhone.then(playerData => {
            // encrypted phoneNumber in DB will be decrypted
            for (let q = 0; q < playerData.length; q ++) {
                if (playerData[q].phoneNumber.length > 20) {
                    playerData[q].phoneNumber = rsaCrypto.decrypt(playerData[q].phoneNumber);
                }
            }

            for (let z = 0; z < playerData.length; z ++) {
                arrayDbPhone.push(playerData[z].phoneNumber);
            }

            // display non duplicated phone numbers
            let diffPhone = arrayInputPhone.filter(item => !arrayDbPhone.includes(item));
            let diffPhoneTotal = diffPhone.length;
            diffPhoneList = diffPhone.join(", ");

            // display duplicated phone numbers
            let samePhone = arrayInputPhone.filter(item => arrayDbPhone.includes(item));
            let samePhoneTotal = samePhone.length;
            samePhoneList = samePhone.join(", ");

            return {samePhoneList: samePhoneList, diffPhoneList: diffPhoneList, samePhoneTotal: samePhoneTotal, diffPhoneTotal: diffPhoneTotal};
        }).then(data => {
            return data;
        });
    },

    uploadPhoneFileCSV: function (filterAllPlatform, platformObjId, arrayPhoneCSV) {
        let oldNewPhone = {$in: []};

        for (let i = 0; i < arrayPhoneCSV.length; i++) {
            oldNewPhone.$in.push(arrayPhoneCSV[i]);
            oldNewPhone.$in.push(rsaCrypto.encrypt(arrayPhoneCSV[i]));
        }

        // if true, user can filter phone across all platform
        if(filterAllPlatform) {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        } else {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone, "platform": ObjectId(platformObjId)}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        }

        let diffPhoneCSV;
        let samePhoneCSV;
        let arrayDbPhone = [];

        // display phoneNumber result that matched input phoneNumber
        return dbPhone.then(playerData => {
            // encrypted phoneNumber in DB will be decrypted
            for (let q = 0; q < playerData.length; q ++) {
                if (playerData[q].phoneNumber.length > 20) {
                    playerData[q].phoneNumber = rsaCrypto.decrypt(playerData[q].phoneNumber);
                }
            }

            for (let z = 0; z < playerData.length; z ++) {
                arrayDbPhone.push(playerData[z].phoneNumber);
            }

            // display non duplicated phone numbers
            let diffPhone = arrayPhoneCSV.filter(item => !arrayDbPhone.includes(item));
            let diffPhoneTotalCSV = diffPhone.length;
            diffPhoneCSV = diffPhone.join(", ");

            // display duplicated phone numbers
            let samePhone = arrayPhoneCSV.filter(item => arrayDbPhone.includes(item));
            let samePhoneTotalCSV = samePhone.length;
            samePhoneCSV = samePhone.join(", ");

            return {samePhoneCSV: samePhoneCSV, diffPhoneCSV: diffPhoneCSV, samePhoneTotalCSV: samePhoneTotalCSV, diffPhoneTotalCSV: diffPhoneTotalCSV};
        }).then(data => {
            return data;
        });
    },

    uploadPhoneFileTXT: function (filterAllPlatform, platformObjId, arrayPhoneTXT) {
        let oldNewPhone = {$in: []};

        for (let i = 0; i < arrayPhoneTXT.length; i++) {
            oldNewPhone.$in.push(arrayPhoneTXT[i]);
            oldNewPhone.$in.push(rsaCrypto.encrypt(arrayPhoneTXT[i]));
        }

        // if true, user can filter phone across all platform
        if(filterAllPlatform) {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        } else {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone, "platform": ObjectId(platformObjId)}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        }

        let diffPhoneTXT;
        let samePhoneTXT;
        let arrayDbPhone = [];

        // display phoneNumber result that matched input phoneNumber
        return dbPhone.then(playerData => {
            // encrypted phoneNumber in DB will be decrypted
            for (let q = 0; q < playerData.length; q ++) {
                if (playerData[q].phoneNumber.length > 20) {
                    playerData[q].phoneNumber = rsaCrypto.decrypt(playerData[q].phoneNumber);
                }
            }

            for (let z = 0; z < playerData.length; z ++) {
                arrayDbPhone.push(playerData[z].phoneNumber);
            }

            // display non duplicated phone numbers
            let diffPhone = arrayPhoneTXT.filter(item => !arrayDbPhone.includes(item));
            let diffPhoneTotalTXT = diffPhone.length;
            diffPhoneTXT = diffPhone.join(", ");

            // display duplicated phone numbers
            let samePhone = arrayPhoneTXT.filter(item => arrayDbPhone.includes(item));
            let samePhoneTotalTXT = samePhone.length;
            samePhoneTXT = samePhone.join(", ");

            return {samePhoneTXT: samePhoneTXT, diffPhoneTXT: diffPhoneTXT, samePhoneTotalTXT: samePhoneTotalTXT, diffPhoneTotalTXT: diffPhoneTotalTXT};
        }).then(data => {
            return data;
        });
    },

    uploadPhoneFileXLS: function (filterAllPlatform, platformObjId, arrayPhoneXLS) {
        let oldNewPhone = {$in: []};

        for (let i = 0; i < arrayPhoneXLS.length; i++) {
            oldNewPhone.$in.push(arrayPhoneXLS[i]);
            oldNewPhone.$in.push(rsaCrypto.encrypt(arrayPhoneXLS[i]));
        }

        // if true, user can filter phone across all platform
        if (filterAllPlatform) {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        } else {
            // display phoneNumber from DB without asterisk masking
            var dbPhone = dbconfig.collection_players.aggregate([
                {$match: {"phoneNumber": oldNewPhone, "platform": ObjectId(platformObjId)}},
                {$project: {name: 1, phoneNumber: 1, _id: 0}}
            ]);
        }

        let diffPhoneXLS;
        let samePhoneXLS;
        let arrayDbPhone = [];

        // display phoneNumber result that matched input phoneNumber
        return dbPhone.then(playerData => {
            // encrypted phoneNumber in DB will be decrypted
            for (let q = 0; q < playerData.length; q++) {
                if (playerData[q].phoneNumber.length > 20) {
                    playerData[q].phoneNumber = rsaCrypto.decrypt(playerData[q].phoneNumber);
                }
            }

            for (let z = 0; z < playerData.length; z++) {
                arrayDbPhone.push(playerData[z].phoneNumber);
            }

            // display non duplicated phone numbers
            let diffPhone = arrayPhoneXLS.filter(item => !arrayDbPhone.includes(item));
            let diffPhoneTotalXLS = diffPhone.length;
            diffPhoneXLS = diffPhone.join(", ");

            // display duplicated phone numbers
            let samePhone = arrayPhoneXLS.filter(item => arrayDbPhone.includes(item));
            let samePhoneTotalXLS = samePhone.length;
            // don't join, remain as array
            samePhoneXLS = samePhone;

            return {
                samePhoneXLS: samePhoneXLS,
                diffPhoneXLS: diffPhoneXLS,
                samePhoneTotalXLS: samePhoneTotalXLS,
                diffPhoneTotalXLS: diffPhoneTotalXLS
            };
        }).then(data => {
            return data;
        });
    },

    getWithdrawalInfo: function(platformId, playerId){
        let result = {
            freeTimes: 0,
            serviceCharge: 0,
            currentFreeAmount: 0,
            freeAmount: 0
        };

        let platformProm = dbconfig.collection_platform.findOne({platformId: platformId});
        let playerProm = dbconfig.collection_players.findOne({playerId:  playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();

        var date = dbUtility.getTodaySGTime();
        var firstDay = date.startTime;
        var lastDay = date.endTime;

        return Promise.all([platformProm, playerProm]).then(data => {
            if(data) {
                let platformDetails = data[0];
                let playerDetails = data[1];
                let bonusDetails = null;
                if(platformDetails){
                    if(platformDetails.useProviderGroup)
                    {
                        if(playerDetails){
                            if(platformDetails.bonusSetting){
                                for(let x in platformDetails.bonusSetting){
                                    if(platformDetails.bonusSetting[x].value == playerDetails.playerLevel.value){
                                        bonusDetails = platformDetails.bonusSetting[x];
                                    }
                                }
                            }

                            if(bonusDetails){
                                result.ximaWithdraw = playerDetails.ximaWithdraw || 0;
                                result.freeTimes = bonusDetails.bonusCharges;
                                result.serviceCharge = parseFloat(bonusDetails.bonusPercentageCharges * 0.01);
                            }

                            let bonusProm = dbconfig.collection_proposal.aggregate([
                                {
                                    "$match": {
                                        "data.playerObjId": playerDetails._id,
                                        "createTime": {
                                            "$gte": firstDay,
                                            "$lt": lastDay
                                        },
                                        "mainType": "PlayerBonus",
                                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS, constProposalStatus.PENDING]}
                                    }
                                },
                                {
                                    "$group": {
                                        "_id": null,
                                        "count": {"$sum": 1},
                                        "amount": {"$sum": "$data.amount"}
                                    }
                                }
                            ]);

                            let sendQuery = {
                                playerId: playerDetails._id,
                                platformId: platformDetails._id,
                                status: constRewardTaskStatus.STARTED
                            }
                            let rewardProm = dbconfig.collection_rewardTaskGroup.find(sendQuery)
                                .populate({path: "providerGroup", select: 'name', model: dbconfig.collection_gameProviderGroup}).lean()
                                .then(rewardDetails => {
                                    if(!rewardDetails){
                                        return "";
                                    }
                                    let lockListArr = [];
                                    rewardDetails.map(r =>{
                                        if(r){
                                            let providerGroupName = "";
                                            let targetCon = r.targetConsumption ? r.targetConsumption : 0;
                                            let ximaAmt = r.forbidXIMAAmt ? r.forbidXIMAAmt : 0;
                                            let curCon = r.curConsumption ? r.curConsumption : 0;
                                            if(r.providerGroup){
                                                providerGroupName = r.providerGroup.name ? r.providerGroup.name : "";
                                            }else{
                                                providerGroupName = "LOCAL_CREDIT";
                                            }

                                            lockListArr.push({name: providerGroupName, lockAmount: targetCon + ximaAmt, currentLockAmount: curCon});
                                        }
                                    });

                                    return lockListArr;
                                });

                            return Promise.all([bonusProm,rewardProm]);
                        }else{
                            return Q.reject({
                                name: "DataError",
                                message: "Player not found"
                            });
                        }
                    }else{
                        return Q.reject({
                            status: constServerCode.PROVIDER_GROUP_IS_OFF,
                            name: "DataError",
                            message: "Provider group is not used."
                        });
                    }
                }else{
                    return Q.reject({
                        name: "DataError",
                        message: "Platform not found"
                    });
                }
            }
            return "";
        }).then(data => {
            if(data){
                let lockListWithoutFreeAmountRewardTaskGroup = [];
                result.freeTimes = result.freeTimes - (data[0] && data[0][0] ? data[0][0].count : 0);
                if(data[1]){
                    lockListWithoutFreeAmountRewardTaskGroup = data[1].filter(function(e){
                        return e.name !== "LOCAL_CREDIT";
                    })
                }

                result.lockList = lockListWithoutFreeAmountRewardTaskGroup;

                data[1].map(d =>{
                    if(d && d.name && d.name == "LOCAL_CREDIT"){
                        result.currentFreeAmount = d.currentLockAmount ? d.currentLockAmount : 0;
                        result.freeAmount = d.lockAmount ? d.lockAmount : 0;
                    }
                })
            }

            return result;
        });
    },

    getCreditDetail: function (playerObjId) {
        let returnData = {
            gameCreditList: [],
            lockedCreditList: []
        };
        let playerDetails = {};
        return dbconfig.collection_players.findOne({_id: playerObjId}, {platform: 1, validCredit: 1, name: 1, _id:0})
            .populate({path: "platform", model: dbconfig.collection_platform, select: ['_id','platformId']}).lean().then(
            (playerData) => {
                playerDetails.name = playerData.name;
                playerDetails.validCredit = playerData.validCredit;
                playerDetails.platformId = playerData.platform.platformId;
                playerDetails.platformObjId = playerData.platform._id;
                returnData.credit = playerData.validCredit;
                return dbconfig.collection_platform.findOne({_id: playerData.platform})
                    .populate({path: "paymentChannels", model: dbconfig.collection_paymentChannel})
                    .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean();
            }).then(
                platformData => {
                    let providerCredit = {gameCreditList: []}

                    if (platformData && platformData.gameProviders.length > 0) {
                        for (let i = 0; i < platformData.gameProviders.length; i++) {
                            providerCredit.gameCreditList[i] = {
                                providerId: platformData.gameProviders[i].providerId,
                                nickName: platformData.gameProviders[i].nickName || platformData.gameProviders[i].name
                            };
                        }
                    }

                    return providerCredit;
                }
        ).then(
            providerList => {
                if (providerList && providerList.gameCreditList && providerList.gameCreditList.length > 0) {
                    let promArray = [];
                    for (let i = 0; i < providerList.gameCreditList.length; i++) {
                        let queryObj = {
                            username: playerDetails.name,
                            platformId: playerDetails.platformId,
                            providerId: providerList.gameCreditList[i].providerId,
                        };
                        let gameCreditProm = cpmsAPI.player_queryCredit(queryObj).then(
                            function (creditData) {
                                return {
                                    providerId: creditData.providerId,
                                    gameCredit: parseFloat(creditData.credit).toFixed(2) || 0,
                                    nickName: providerList.gameCreditList[i].nickName? providerList.gameCreditList[i].nickName: ""
                                };
                            },
                            function (err) {
                                //todo::for debug, to be removed
                                return {
                                    providerId: providerList.gameCreditList[i].providerId,
                                    gameCredit: 'unknown',
                                    nickName: providerList.gameCreditList[i].nickName? providerList.gameCreditList[i].nickName: "",
                                    reason: err
                                };
                            }
                        );
                        promArray.push(gameCreditProm);
                    }
                    return Promise.all(promArray);
                }
            }
        ).then(
            gameCreditList => {
                if (gameCreditList && gameCreditList.length > 0) {
                    for (let i = 0; i < gameCreditList.length; i++) {
                        returnData.gameCreditList[i] = {
                            nickName: gameCreditList[i].nickName? gameCreditList[i].nickName: "",
                            validCredit: gameCreditList[i].gameCredit? gameCreditList[i].gameCredit: ""
                        };
                    }

                    return dbconfig.collection_rewardTaskGroup.find({
                        platformId: playerDetails.platformObjId,
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }).populate({
                        path: "providerGroup",
                        model: dbconfig.collection_gameProviderGroup
                    }).lean();
                }
            }
        ).then(
            rewardTaskGroup => {
                console.log(rewardTaskGroup);

                if (rewardTaskGroup && rewardTaskGroup.length > 0) {
                    for (let i = 0; i < rewardTaskGroup.length; i++) {
                        returnData.lockedCreditList[i] = {
                            nickName: rewardTaskGroup[i].providerGroup? rewardTaskGroup[i].providerGroup.name: "",
                            validCredit: rewardTaskGroup[i].rewardAmt
                        }
                    }
                }
                return returnData;
            }
        );
    },

};

/**
 * Check any limited offer intention pending for apply when top up
 * @param proposalData
 */
function checkLimitedOfferToApply (proposalData) {
    if (proposalData && proposalData.data && proposalData.data.limitedOfferObjId) {
        let topupProposal = proposalData;
        let newProp;

        return dbUtility.findOneAndUpdateForShard(
            dbconfig.collection_proposal,
            {_id: proposalData.data.limitedOfferObjId},
            {
                $set: {
                    'data.topUpProposalObjId': proposalData._id,
                    'data.topUpProposalId': proposalData.proposalId,
                    'data.topUpAmount': proposalData.data.amount
                },
                $currentDate: {settleTime: true}
            },
            constShardKeys.collection_proposal,
            true
        ).then(
            res => {
                newProp = res;

                return dbPlayerUtil.tryToDeductCreditFromPlayer(res.data.playerObjId, res.data.platformId, res.data.applyAmount, res.data.limitedOfferName + ":Deduction", res.data);
            }
        ).then(
            res => {
                if (res) {
                    return dbconfig.collection_proposalType.findOne({
                        platformId: newProp.data.platformObjId,
                        name: constProposalType.PLAYER_LIMITED_OFFER_REWARD
                    }).lean();
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    // Create reward proposal with intention data
                    newProp.data.eventName = newProp.data.eventName.replace(" Intention",'');
                    newProp.data.remark = 'event name: '+ newProp.data.limitedOfferName +'('+ newProp.proposalId +') topup proposal id: ' + topupProposal.proposalId;

                    let proposalData = {
                        type: proposalTypeData._id,
                        creator: newProp.creator,
                        data: newProp.data,
                        entryType: newProp.entryType,
                        userType: newProp.userType,
                        inputDevice: newProp.inputDevice
                    };

                    return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalData);
                }
            }
        ).then(
            res => {
                if (res) {
                    return dbUtility.findOneAndUpdateForShard(
                        dbconfig.collection_proposal,
                        {_id: proposalData.data.limitedOfferObjId},
                        {
                            $set: {
                                'data.rewardProposalObjId': res._id,
                                'data.rewardProposalId': res.proposalId,
                                'data.rewardAmount': res.data.rewardAmount
                            },
                            $currentDate: {settleTime: true}
                        },
                        constShardKeys.collection_proposal,
                        true
                    )
                }
            }
        ).catch(errorUtils.reportError);
    }
}


var proto = dbPlayerInfoFunc.prototype;
proto = Object.assign(proto, dbPlayerInfo);

// This make WebStorm navigation work
module.exports = dbPlayerInfo;
