"use strict";

var dbPlayerInfoFunc = function () {
};
module.exports = new dbPlayerInfoFunc();

var Chance = require('chance');
var chance = new Chance();
var Q = require("q");
var bcrypt = require('bcrypt');
var captchapng = require('captchapng');
var geoip = require('geoip-lite');
var jwt = require('jsonwebtoken');
var md5 = require('md5');

var counterManager = require('./../modules/counterManager');
var dbUtility = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var proposalExecutor = require('./../modules/proposalExecutor');

var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
var dbProposal = require('./../db_modules/dbProposal');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');
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
var constProviderStatus = require("./../const/constProviderStatus");
var constPlayerLevelPeriod = require("./../const/constPlayerLevelPeriod");
var constPlayerCreditTransferStatus = require("./../const/constPlayerCreditTransferStatus");
var constReferralStatus = require("./../const/constReferralStatus");
var cpmsAPI = require("../externalAPI/cpmsAPI");
var dbPlayerLevel = require('../db_modules/dbPlayerLevel');

var moment = require('moment-timezone');
var rewardUtility = require("../modules/rewardUtility");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var pmsAPI = require("../externalAPI/pmsAPI.js");
var localization = require("../modules/localization");
var rsaCrypto = require("../modules/rsaCrypto");
var queryPhoneLocation = require('query-mobile-phone-area');
var serverInstance = require("../modules/serverInstance");
var constProposalUserType = require('../const/constProposalUserType');
var constProposalEntryType = require('../const/constProposalEntryType');
var errorUtils = require("../modules/errorUtils.js");
var SMSSender = require('../modules/SMSSender');
var constPlayerSMSSetting = require('../const/constPlayerSMSSetting');

var PLATFORM_PREFIX_SEPARATOR = '';

var dbPlayerInfo = {

    /**
     * Create a new player user
     * @param {json} data - The data of the player user. Refer to playerInfo schema.
     */
    createPlayerInfoAPI: function (inputData) {
        var platformObjId = null;
        var platformPrefix = "";
        if (!inputData) {
            return Q.reject({name: "DataError", message: "No input data is found."});
        }
        else if (inputData.platformId) {
            return dbconfig.collection_platform.findOne({platformId: inputData.platformId}).then(
                platformData => {
                    if (platformData) {
                        platformObjId = platformData._id;
                        platformPrefix = platformData.prefix;
                        return dbPlayerInfo.isPlayerNameValidToRegister({
                            name: inputData.name,
                            platform: platformData._id
                        });
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Cannot find platform"});
                    }
                }
            ).then(
                validData => {
                    if (validData && validData.isPlayerNameValid) {
                        inputData.platform = platformObjId;
                        inputData.name = inputData.name.toLowerCase();
                        delete inputData.platformId;
                        //find player referrer if there is any
                        if (inputData.referral) {
                            var referralName = platformPrefix + inputData.referral;
                            return dbconfig.collection_players.findOne({
                                name: referralName,
                                platform: platformObjId
                            }).then(
                                data => {
                                    if (data) {
                                        inputData.referral = data._id;
                                        return inputData;
                                    }
                                    else {
                                        delete inputData.referral;
                                        return inputData;
                                    }
                                }
                            );
                        }
                        else if (inputData.partnerName) {
                            return dbconfig.collection_partner.findOne({
                                partnerName: inputData.partnerName,
                                platform: platformObjId
                            }).then(
                                data => {
                                    if (data) {
                                        inputData.partner = data._id;
                                        delete inputData.referral;
                                        return inputData;
                                    }
                                    else {
                                        delete inputData.partnerName;
                                        delete inputData.referral;
                                        return inputData;
                                    }
                                }
                            );
                        }
                        //check if player's domain matches any partner
                        else if (inputData.domain) {
                            delete inputData.referral;
                            return dbconfig.collection_partner.findOne({ownDomain: {$elemMatch: {$eq: inputData.domain}}}).then(
                                data => {
                                    if (data) {
                                        inputData.partner = data._id;
                                        delete inputData.referral;
                                        return inputData;
                                    }
                                    else {
                                        delete inputData.referral;
                                        return inputData;
                                    }
                                }
                            );
                        }
                        else {
                            delete inputData.referral;
                            return inputData;
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
                    return dbPlayerInfo.createPlayerInfo(inputData);
                }
            ).then(
                data => {
                    if (data) {
                        dbPlayerInfo.createPlayerLoginRecord(data);
                        //todo::temp disable similar player untill ip is correct
                        dbPlayerInfo.updateGeoipws(data._id, platformObjId, data.lastLoginIp);
                        //return dbPlayerInfo.findAndUpdateSimilarPlayerInfo(data, inputData.phoneNumber);
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
                            return pdata;
                        }
                    )
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
        var playerData = data;
        var newPlayerObjId = data._id;
        var platformObjId = data.platform;
        var proms = [];
        var prom_findByPhNo = dbconfig.collection_players.find({
            phoneNumber: data.phoneNumber,
            platform: platformObjId,
            _id: {$ne: newPlayerObjId}
        });
        proms.push(prom_findByPhNo);

        var prom_findByIp = dbconfig.collection_players.find({
            lastLoginIp: data.lastLoginIp,
            platform: platformObjId,
            _id: {$ne: newPlayerObjId}
        });
        proms.push(prom_findByIp);

        if (data.realName) {
            var prom_findByName = dbconfig.collection_players.find({
                realName: data.realName,
                platform: platformObjId,
                _id: {$ne: newPlayerObjId}
            });
            proms.push(prom_findByName);
        }

        if (data.bankAccount) {
            proms.push(dbconfig.collection_players.find({
                bankAccount: data.bankAccount,
                platform: platformObjId,
                _id: {$ne: newPlayerObjId}
            }));
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
                        var startIndex = Math.max(Math.floor((phoneNumber.length - 4) / 2), 0);
                        var pNumber = phoneNumber.substr(0, startIndex) + "****" + phoneNumber.substr(startIndex + 4);
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
                                content: data[3][q].bankAccount
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
                                                content: playerData.bankAccount
                                            }
                                        }
                                    }
                                )
                            );
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

    createPlayerInfo: function (playerdata, skipReferrals, skipPrefix) {
        var deferred = Q.defer();
        var playerData = null;

        playerdata.name = playerdata.name.toLowerCase();

        dbconfig.collection_platform.findOne({_id: playerdata.platform}).then(
            function (platform) {
                if (platform) {
                    var delimitedPrefix = platform.prefix + PLATFORM_PREFIX_SEPARATOR;
                    //if (playerdata.name.substring(0, delimitedPrefix.length) === delimitedPrefix) {
                    //    // Player name already contains expected platform prefix
                    //}
                    if (!skipPrefix) {
                        playerdata.name = delimitedPrefix.toLowerCase() + playerdata.name;
                    }
                    return dbPlayerInfo.isPlayerNameValidToRegister({
                        name: playerdata.name,
                        platform: playerdata.platform
                    });
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
                    return Q.all([levelProm, platformProm, bankGroupProm, merchantGroupProm, alipayGroupProm]);
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
                apiData = data;
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
                apiData.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : apiData.bankAccountProvince;
                apiData.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : apiData.bankAccountCity;
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
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "partner", model: dbconfig.collection_partner})
            .exec();
    },
    getOnePlayerInfo: function (query) {
        return dbconfig.collection_players.findOne(query, {similarPlayers: 0})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "partner", model: dbconfig.collection_partner})
            .then(data => {
                if (data) {
                    return data;
                } else return Q.reject({message: "incorrect player result"});
            });
    },

    getPlayerPhoneNumber: function (playerObjId) {
        return dbconfig.collection_players.findOne({_id: playerObjId}).then(
            playerData => {
                if (playerData) {
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
                if (Object.keys(oldData).length !== 0) {
                    var newLog = new dbconfig.collection_playerPermissionLog({
                        admin: admin,
                        platform: query.platform,
                        player: query._id,
                        remark: remark,
                        oldData: oldData,
                        newData: permission,
                    });
                    return newLog.save();
                } else return true;
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
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    resetPlayerPassword: function (playerId, newPassword) {
        var deferred = Q.defer();

        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                deferred.reject({name: "DBError", message: "Error updating player password", error: err});
                return;
            }
            bcrypt.hash(newPassword, salt, function (err, hash) {
                if (err) {
                    deferred.reject({name: "DBError", message: "Error updating player password.", error: err});
                    return;
                }
                dbUtility.findOneAndUpdateForShard(
                    dbconfig.collection_players,
                    {_id: playerId},
                    {password: hash},
                    constShardKeys.collection_players
                ).then(
                    function (data) {
                        deferred.resolve(newPassword);
                    },
                    function (error) {
                        deferred.reject({name: "DBError", message: "Error updating player password.", error: error});
                    }
                );
            });
        });

        return deferred.promise;
    },
    /**
     *  Update password
     * @param {String} playerId:xxxx, oldPassword:xxxx, newPassword:xxxx
     *
     */
    updatePassword: function (playerId, currPassword, newPassword) {
        var db_password = null;
        var playerObj = null;
        if (newPassword.length < constSystemParam.PASSWORD_LENGTH) {
            return Q.reject({name: "DataError", message: "Password is too short"});
        }
        // compare the user entered old password and password from db
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            data => {
                if (data) {
                    playerObj = data;
                    db_password = String(data.password);
                    if (dbUtility.isMd5(db_password)) {
                        if (md5(currPassword) == db_password) {
                            return Q.resolve(true);
                        }
                        else {
                            return Q.resolve(false);
                        }
                    }
                    else {
                        var passDefer = Q.defer();
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
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Can not find player"
                    });
                }
            }
        ).then(
            isMatch => {
                if (isMatch) {
                    playerObj.password = newPassword;
                    return playerObj.save();
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

    /**
     * Update player payment info
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerPayment: function (query, updateData) {
        return dbUtility.findOneAndUpdateForShard(dbconfig.collection_players, query, updateData, constShardKeys.collection_players);
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
        var deferred = Q.defer();
        dbconfig.collection_players.findOneAndUpdate(
            {_id: playerId, platform: platformId},
            {$inc: {validCredit: amount}}
        ).then(
            function (res) {
                if (res) {
                    dbLogger.createCreditChangeLog(playerId, platformId, amount, type, operatorId, data);
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
        if (query.playerId) {
            queryObject.playerId = ObjectId(query.playerId);
        }
        if (query.startTime && query.endTime) {
            queryObject.createTime = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
        }
        if (query.providerId) {
            queryObject.providerId = ObjectId(query.providerId);
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
        })
        return Q.all([a, b, c]).then(result => {
            return {data: result[0], size: result[1], summary: result[2] ? result[2][0] : {}};
        })
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
        var b = dbconfig.collection_playerTopUpRecord.find(queryObject).sort(sortCol).skip(index).limit(limit);
        return Q.all([a, b]).then(
            data => {
                return {total: data[0], data: data[1]};
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
        var b = dbconfig.collection_creditChangeLog.find(queryObject).sort(sortCol).skip(index).limit(limit);
        return Q.all([a, b]).then(data => {
            return {total: data[0], data: data[1]};
        })
    },

    /*
     * handle player top up action, update player credit and log
     * @param {objectId} playerId
     * @param {number} amount
     * @param {String} paymentChannelName
     */
    playerTopUp: function (playerId, amount, paymentChannelName, topUpType, proposalData) {
        var deferred = Q.defer();
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
        ).then(
            function (data) {
                if (data) {
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
                        if (topUpType == constPlayerTopUpType.ONLINE) {
                            recordData.bankCardType = proposalData.data.bankCardType;
                        }
                        else if (topUpType == constPlayerTopUpType.MANUAL) {
                            recordData.merchantTopUpType = proposalData.data.topupType;
                        }
                        logData = proposalData.data;
                        recordData.proposalId = proposalData.proposalId;
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
                        default:
                            type = constPlayerCreditChangeType.TOP_UP;
                            break;
                    }
                    var logProm = dbLogger.createCreditChangeLog(playerId, data.platform, amount, type, data.validCredit, null, logData);
                    var levelProm = dbPlayerInfo.checkPlayerLevelUp(playerId, data.platform);
                    //no need to check player reward task status now.
                    //var rewardTaskProm = dbRewardTask.checkPlayerRewardTaskStatus(playerId);
                    return Q.all([recordProm, logProm, levelProm]);
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
                deferred.resolve(data && data[0]);
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
                    dbLogger.createCreditChangeLog(playerId, platformId, amount, "Purchase", data.validCredit);
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

        var deferred = Q.defer();
        var rewardEventData = null;
        var proposalType;
        var playerData = null;
        //todo::add reward task check here??? - Done
        //todo::add check for player's gift redeem record
        //should check player platform first time top up event here???
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.FIRST_TOP_UP).then(
            function (eventData) {
                rewardEventData = eventData;
                if (eventData) {

                    proposalType = eventData.executeProposal;
                    return dbconfig.collection_players.findOne({_id: playerId});
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
                    "data.platformId": data.platform,
                    "data.playerId": data._id,
                    "data.periodType": 0,
                    type: proposalType
                });

            }, function (error) {
                deferred.reject({name: "DataError", message: "Can't find player data", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    deferred.reject({
                        name: "DataError",
                        message: "The player already has this reward. Not Valid for the reward."
                    });
                    return true;

                } else {
                    return dbRewardTask.getPlayerCurRewardTask(playerData._id);
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
                                message: "Player hasn't been rewarded for first time top up event!"
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
    applyForFirstTopUpRewardProposal: function (playerObjId, playerId, topUpRecordIds, code, ifAdmin) {
        var deferred = Q.defer();
        var platformId = null;
        var player = {};
        var records = [];
        var recordAmount = 0;
        var eventData = {};
        var playerLvlData;
        var deductionAmount = 0;
        var bDoneDeduction = false;
        var adminInfo = ifAdmin;

        var query = playerObjId ? {_id: playerObjId} : {playerId: playerId};
        var recordProm = dbconfig.collection_playerTopUpRecord.find({_id: {$in: topUpRecordIds}});
        var playerProm = dbconfig.collection_players.findOne(query).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        });
        Q.all([playerProm, recordProm]).then(
            function (data) {
                player = data[0];
                records = data[1];

                //check all top up records
                var bValid = true;
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

                //get player's platform reward event data
                platformId = player.platform;
                return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.FIRST_TOP_UP, code);
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
            function (eData) {
                eventData = eData;
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

                return dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform, deductionAmount, "applyFirstTopUpReward:Deduction", records);
            }
        ).then(
            function () {
                bDoneDeduction = true;
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
                        applyAmount: deductionAmount,
                        rewardAmount: rewardAmount,
                        providers: eventData.param.providers,
                        targetEnable: eventData.param.targetEnable,
                        games: eventData.param.games,
                        spendingAmount: Math.floor((rewardAmount + recordAmount) * playerLvlData.spendingTimes),
                        minTopUpAmount: eventData.param.minTopUpAmount,
                        eventId: eventData._id,
                        eventName: eventData.name,
                        eventCode: eventData.code
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS,
                };
                var proms = records.map(rec =>
                    dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                        {_id: rec._id, createTime: rec.createTime, bDirty: false},
                        {bDirty: true},
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
                () => bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, "applyFirstTopUpReward:ProposalFailedRefund", error)
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
                status: constRewardTaskStatus.STARTED
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
                        "data.playerId": playerData._id
                    })
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
    applyForGameProviderRewardAPI: function (playerId, code, amount, ifAdmin) {
        var proposalData = {};
        var deferred = Q.defer();
        var adminInfo = ifAdmin;
        //check if playerId and eventId is valid
        dbconfig.collection_players.findOne({playerId: playerId}).then(
            playerData => {
                if (playerData) {
                    var playerProm = Q.resolve(playerData);
                    var eventProm = dbconfig.collection_rewardEvent.findOne({
                        code: code,
                        platform: playerData.platform
                    }).populate({
                        path: "type",
                        model: dbconfig.collection_rewardType
                    });
                    var taskProm = dbRewardTask.getRewardTask(
                        {
                            playerId: playerData._id,
                            status: constRewardTaskStatus.STARTED
                        }
                    );
                    return Q.all([playerProm, eventProm, taskProm]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1] && !data[2]) {
                    if (String(data[0].platform) == String(data[1].platform) && data[1].type.name == constRewardType.GAME_PROVIDER_REWARD
                        && data[0].validCredit > 0 && amount > 0 && amount <= data[0].validCredit && rewardUtility.isValidRewardEvent(constRewardType.GAME_PROVIDER_REWARD, data[1])) {
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
                                platformId: data[0].platform,
                                games: data[1].param.games,
                                eventId: data[1]._id,
                                eventName: data[1].name,
                                eventCode: data[1].code
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
                        var proposalProm = dbProposal.createProposalWithTypeId(data[1].executeProposal, proposalData);
                        var playerProm = dbconfig.collection_players.findOneAndUpdate(
                            {_id: data[0]._id, platform: data[0].platform},
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
                            rewardAmount: data.param.rewardAmount
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
        var deferred = Q.defer();
        var rewardTypeName = constProposalType.PLATFORM_TRANSACTION_REWARD;
        var proposalProm = dbconfig.collection_proposalType.findOne({platformId: platformId, name: rewardTypeName});
        var eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, rewardTypeName);
        var playerLevelProm = dbconfig.collection_playerLevel.findOne({_id: playerLevel});
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId});
        var playerLevelData = {};
        var rewardParams = [];
        var playerData = {};
        Q.all([eventProm, proposalProm, playerLevelProm, playerProm]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2] && data[3]) {
                    if (!data[3].permission || !data[3].permission.transactionReward) {
                        deferred.resolve("No permission!");
                    }
                    var eventLevelProm = [];
                    rewardParams = data[0];
                    playerLevelData = data[2];
                    playerData = data[3];
                    for (var i = 0; i < data[0].length; i++) {
                        var temp = dbconfig.collection_playerLevel.findOne({_id: data[0][i].param.playerLevel});
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
                    var levelProm = [];
                    for (var i = 0; i < levels.length; i++) {
                        if (playerLevelData.value >= levels[i].value && rewardParams[i].param && rewardParams[i].param.bankCardType && rewardParams[i].param.bankCardType.indexOf(bankCardType) >= 0) {

                            var proposalData = {
                                type: rewardParams[i].executeProposal,
                                data: {
                                    playerId: playerId,
                                    playerObjId: playerData._id,
                                    platformId: platformId,
                                    playerName: playerData.name,
                                    rewardAmount: Math.floor(rewardParams[i].param.rewardPercentage * topupAmount)
                                }
                            };
                            var temp = dbProposal.createProposalWithTypeId(rewardParams[i].executeProposal, proposalData);
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
        })
        lean().exec();
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
        //todo encrytion ?
        if (data && data.phoneNumber) {
            data.phoneNumber = {$in: [rsaCrypto.encrypt(data.phoneNumber), data.phoneNumber]};
        }
        function getRewardData(thisPlayer) {
            return dbconfig.collection_rewardTask.find({
                playerId: thisPlayer._id,
                status: constRewardTaskStatus.STARTED
            }).then(
                rewardData => {
                    thisPlayer.rewardInfo = rewardData;
                    return thisPlayer;
                });
        }

        var a = dbconfig.collection_players
            .find({platform: platformId, $and: [data]}, {similarPlayers: 0})
            .sort(sortObj).skip(index).limit(limit)
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "partner", model: dbconfig.collection_partner})
            .lean().then(
                playerData => {
                    var players = [];
                    for (var ind in playerData) {
                        if (playerData[ind]) {
                            var newInfo = getRewardData(playerData[ind]);
                            players.push(Q.resolve(newInfo));
                        }
                    }
                    return Q.all(players)
                }
            );
        var b = dbconfig.collection_players
            .find({platform: platformId, $and: [data]}).count();
        return Q.all([a, b]).then(
            data => {
                return {data: data[0], size: data[1]}
            },
            err => {
                return {error: err};
            }
        )
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
    playerLogin: function (playerData, userAgent) {
        var deferred = Q.defer();
        var db_password = null;
        var newAgentArray = [];
        var platformId = null;
        var uaObj = null;
        var playerObj = null;
        var retObj = {};
        var platformPrefix = "";
        dbconfig.collection_platform.findOne({platformId: playerData.platformId}).then(
            platformData => {
                if (platformData) {
                    platformId = platformData._id;
                    platformPrefix = platformData.prefix;
                    playerData.name = platformData.prefix + playerData.name;
                    return dbconfig.collection_players.findOne({
                        name: playerData.name.toLowerCase(),
                        platform: platformData._id
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
                        code: constServerCode.INVALID_USER_PASSWORD
                    });
                }
            }
        ).then(
            isMatch => {
                if (isMatch) {
                    newAgentArray = playerObj.userAgent || [];
                    uaObj = {
                        browser: userAgent.browser.name || '',
                        device: userAgent.device.name || '',
                        os: userAgent.os.name || '',
                    };
                    var bExit = false;
                    newAgentArray.forEach(
                        agent => {
                            if (agent.browser == uaObj.browser && agent.device == uaObj.device && agent.os == uaObj.os) {
                                bExit = true;
                            }
                        }
                    );
                    if (!bExit) {
                        newAgentArray.push(uaObj);
                    }
                    var bUpdateIp = false;
                    if (playerData.lastLoginIp && playerData.lastLoginIp != playerObj.lastLoginIp) {
                        bUpdateIp = true;
                    }
                    var geo = geoip.lookup(playerData.lastLoginIp);
                    var updateData = {
                        isLogin: true,
                        lastLoginIp: playerData.lastLoginIp,
                        userAgent: newAgentArray,
                        lastAccessTime: new Date().getTime(),
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
                    if (playerData.lastLoginIp && playerData.lastLoginIp != playerObj.lastLoginIp) {
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
                            Object.assign(recordData, geoInfo);
                            var record = new dbconfig.collection_playerLoginRecord(recordData);
                            return record.save().then(
                                function () {
                                    if (bUpdateIp) {
                                        return dbPlayerInfo.updateGeoipws(data._id, platformId, playerData.lastLoginIp);
                                    }
                                }
                            ).catch(errorUtils.reportError).then(
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
                                            deferred.resolve(retObj);
                                        }, errorZone => {
                                            deferred.resolve(retObj);
                                        });
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

        var time_now = new Date().getTime();
        var updateData = {isLogin: false, lastAccessTime: time_now};

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
        noOfPlayers = noOfPlayers || 20;
        var query = {platform: platform, isLogin: true};
        if (name) {
            query.name = {$regex: ".*" + name + ".*"}
        }
        return dbconfig.collection_players
            .find(query, {similarPlayers: 0})
            .limit(noOfPlayers)
    },

    getLoggedInPlayersCount: function (platform) {
        return dbconfig.collection_players.find({platform: platform, isLogin: true}).count();
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

    /*
     * Transfer credit from platform to game provider
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount
     */
    transferPlayerCreditToProvider: function (playerId, platform, providerId, amount, adminName, forSync) {
        var deferred = Q.defer();
        var prom0 = forSync ? dbconfig.collection_players.findOne({name: playerId}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            }) : dbconfig.collection_players.findOne({playerId: playerId}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            });
        var prom1 = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        var playerData = null;
        var providerData = null;
        Q.all([prom0, prom1]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    playerData = data[0];
                    providerData = data[1];
                    if ((data[0].validCredit + data[0].lockedCredit) < 1 || amount == 0 || data[0].validCredit < amount) {
                        deferred.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            errorMessage: "Player does not have enough credit."
                        });
                        return;
                    }
                    return dbPlayerInfo.getPlayerPendingProposalByType(playerData._id, playerData.platform._id, constProposalType.UPDATE_PLAYER_CREDIT).then(
                        hasPendingProposal => {
                            if (hasPendingProposal) {
                                deferred.reject({
                                    status: constServerCode.PLAYER_PENDING_PROPOSAL,
                                    name: "DataError",
                                    message: "Player has pending proposal to update credit"
                                });
                            }
                            else {
                                var platformId = playerData.platform ? playerData.platform.platformId : null;
                                dbLogger.createPlayerCreditTransferStatusLog(playerData._id, playerData.playerId, playerData.name, playerData.platform._id, platformId, "transferIn",
                                    "unknown", providerId, playerData.validCredit, playerData.lockedCredit, adminName, null, constPlayerCreditTransferStatus.REQUEST);
                                return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(playerData._id, playerData.platform._id, providerData._id, amount, providerId, playerData.name, playerData.platform.platformId, adminName, providerData.name, forSync);
                            }
                        }
                    );
                } else {
                    deferred.reject({name: "DataError", message: "Cannot find player or provider"});
                }
            },
            function (err) {
                deferred.reject({
                    name: "DataError",
                    message: "Failed to retrieve player or provider" + err.message,
                    error: err
                })
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (err) {
                if (!err || !err.hasLog) {
                    var platformId = playerData.platform ? playerData.platform.platformId : null;
                    var platformObjId = playerData.platform ? playerData.platform._id : null;
                    dbLogger.createPlayerCreditTransferStatusLog(playerData._id, playerData.playerId, playerData.name, platformObjId, platformId, "transferIn",
                        "unknown", providerId, playerData.validCredit, playerData.lockedCredit, adminName, err, constPlayerCreditTransferStatus.FAIL);
                }
                deferred.reject(err);
            }
        );
        return deferred.promise;
    },

    /*
     * Transfer credit to game provider
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount
     */
    transferPlayerCreditToProviderbyPlayerObjId: function (playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync) {
        var deferred = Q.defer();
        var gameAmount = 0;
        var rewardAmount = 0;
        var providerAmount = 0;
        var playerCredit = 0;
        var rewardTaskAmount = 0;
        var rewardDataObj = null;
        var playerData = null;
        var notEnoughtCredit = false;
        var rewardData = null;
        var bUpdateReward = false;
        var transferAmount = 0;
        var bTransfered = false;
        var transferId = new Date().getTime();
        return dbconfig.collection_players.findOne({_id: playerObjId}).then(
            function (playerData1) {
                if (playerData1) {
                    playerData = playerData1;
                    if ((playerData1.validCredit + playerData1.lockedCredit) < 1 || amount == 0 || playerData1.validCredit < amount) {
                        deferred.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "NumError",
                            errorMessage: "Player does not have enough credit."
                        });
                        notEnoughtCredit = true;
                        return;
                    }
                    return dbRewardTask.getPlayerCurRewardTask(playerObjId)
                } else {
                    return Q.reject({name: "DataError", message: "Can't find player information."});
                }
            },
            function (err) {
                return Q.reject({name: "DataError", message: "Can't find player information.", error: err});
            }
        ).then(
            function (taskData) {
                rewardData = taskData;
                if (!notEnoughtCredit) {
                    //if amount is less than 0, means transfer all
                    amount = amount > 0 ? amount : playerData.validCredit;
                    if (!rewardData) {
                        amount = Math.floor(amount);
                        gameAmount = amount;
                        rewardData = true;
                        //return true;
                    }
                    else {
                        rewardDataObj = rewardData;
                        if ((!rewardData.targetProviders || rewardData.targetProviders.length <= 0 ) // target all providers
                            || (rewardData.targetEnable && rewardData.targetProviders.indexOf(providerId) >= 0)//target this provider
                            || (!rewardData.targetEnable && rewardData.targetProviders.indexOf(providerId) < 0)//banded provider
                        ) {
                            if (rewardData.inProvider == true) {//already in provider
                                if (String(playerData.lastPlayedProvider) != String(providerId)) {
                                    return Q.reject({name: "DataError", message: "Player is playing a different game"});
                                }
                                if (rewardData.requiredBonusAmount > 0) {
                                    amount = 0;
                                    gameAmount = amount;
                                }
                                else {
                                    amount = Math.floor(amount);
                                    gameAmount = amount;
                                    rewardData._inputCredit += amount;
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
                                    rewardData._inputCredit = amount;
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
                    var updateObj = {
                        lastPlayedProvider: providerId,
                        $inc: {validCredit: -amount}
                    };
                    if (bUpdateReward) {
                        updateObj.lockedCredit = rewardData.currentAmount;
                    }
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
            function (updateData) {
                if (updateData) {
                    //console.log("Before transfer credit:", playerData.validCredit);
                    if (updateData.validCredit < 0) {
                        //console.log("Transfer invalid credit", playerData.validCredit);
                        //reset player credit to 0
                        return dbconfig.collection_players.findOneAndUpdate(
                            {_id: playerObjId, platform: platform},
                            {validCredit: 0},
                            {new: true}
                        ).catch(errorUtils.reportError).then(
                            () => Q.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "NumError",
                                errorMessage: "Player does not have enough credit."
                            })
                        );
                    }
                    else {
                        playerCredit = updateData.validCredit;
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
                    //console.log("CPMS transfer credit:", transferAmount);
                    bTransfered = true;
                    if (forSync) {
                        return true;
                    }
                    return counterManager.incrementAndGetCounter("transferId").then(
                        function (id) {
                            transferId = id;
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
                                    var lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform, platformId, "transferIn",
                                        transferId, providerShortId, transferAmount, lockedAmount, adminName, error, constPlayerCreditTransferStatus.FAIL);
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
                        return dbRewardTask.updateRewardTask({
                            _id: rewardData._id,
                            platformId: rewardData.platformId
                        }, rewardData);
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
                            if (err.error && err.error.errorMessage && err.error.errorMessage.indexOf('Request timeout') > -1) {
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
        );//.catch( error => console.log("transfer error:", error));
    },

    /*
     * Transfer credit from game provider
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount
     */
    transferPlayerCreditFromProvider: function (playerId, platform, providerId, amount, adminName, bResolve, maxReward, forSync) {
        var deferred = Q.defer();
        var playerObj = {};
        var prom0 = forSync ? dbconfig.collection_players.findOne({name: playerId}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            }) : dbconfig.collection_players.findOne({playerId: playerId}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            });
        var prom1 = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        Q.all([prom0, prom1]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    playerObj = data[0];
                    return dbPlayerInfo.getPlayerPendingProposalByType(data[0]._id, data[0].platform._id, constProposalType.UPDATE_PLAYER_CREDIT).then(
                        hasPendingProposal => {
                            if (hasPendingProposal) {
                                deferred.reject({
                                    status: constServerCode.PLAYER_PENDING_PROPOSAL,
                                    name: "DataError",
                                    message: "Player has pending proposal to update credit"
                                });
                            }
                            else {
                                dbLogger.createPlayerCreditTransferStatusLog(playerObj._id, playerObj.playerId, playerObj.name, playerObj.platform._id, playerObj.platform.platformId, "transferOut", "unknown",
                                    providerId, amount, 0, adminName, null, constPlayerCreditTransferStatus.REQUEST);
                                return dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(data[0]._id, data[0].platform._id, data[1]._id, amount, playerId, providerId, data[0].name, data[0].platform.platformId, adminName, data[1].name, bResolve, maxReward, forSync);
                            }
                        }
                    );
                } else {
                    deferred.reject({name: "DataError", message: "Cant find player or provider"});
                }
            },
            function (err) {
                deferred.reject({name: "DataError", message: "Cant find player or provider" + err.message, error: err})
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (err) {
                if (!err || !err.hasLog) {
                    var platformId = playerObj.platform ? playerObj.platform.platformId : null;
                    var platformObjId = playerObj.platform ? playerObj.platform._id : null;
                    dbLogger.createPlayerCreditTransferStatusLog(playerObj._id, playerObj.playerId, playerObj.name, platformObjId, platformId, "transferOut", "unknown",
                        providerId, amount, 0, adminName, err, constPlayerCreditTransferStatus.FAIL);
                }
                deferred.reject(err);
            }
        );
        return deferred.promise;
    },

    /*
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
                    return dbRewardTask.getPlayerCurRewardTask(playerObjId);
                } else {
                    deferred.reject({name: "DataError", message: "Cant find player credit in provider."});
                    return false;
                }
            },
            function (err) {
                deferred.reject(err);
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
                                validCreditToAdd = Math.min(amount, rewardTask.requiredBonusAmount);
                                rewardTask.inProvider = false;
                                rewardTaskCredit = rewardTask.currentAmount;
                            }
                            else {
                                diffAmount = providerPlayerObj.gameCredit - rewardTask._inputCredit;
                                if (diffAmount > 0) {
                                    rewardTask.currentAmount += diffAmount;
                                    validCreditToAdd = rewardTask._inputCredit;
                                    rewardTask.inProvider = false;
                                } else {
                                    validCreditToAdd = providerPlayerObj.gameCredit;
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
                                    var lockedAmount = rewardTask && rewardTask.currentAmount ? rewardTask.currentAmount : 0;
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", transferId,
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
                            rewardTask,
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
        var returnObj = {};
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
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
                        }).lean().then(
                            proposals => {
                                var sumAmount = 0;
                                for (var key in proposals) {
                                    if (proposals[key] && proposals[key].data) {
                                        var applyAmount = proposals[key].data.applyAmount || 0;
                                        var rewardAmount = proposals[key].data.rewardAmount || 0;
                                        var currentAmount = proposals[key].data.currentAmount || 0;
                                        sumAmount = sumAmount + Number(applyAmount) + Number(rewardAmount) + Number(currentAmount);
                                    }
                                }
                                returnObj.pendingRewardAmount = sumAmount;
                                return returnObj;
                            }
                        )
                } else return {};
            }
        );
    },

    getPlayerCreditInfo: function (playerId) {
        var creditData = {};
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
                    creditData.validCredit = playerData.validCredit;
                    creditData.lockedCredit = playerData.lockedCredit;
                    return dbconfig.collection_rewardTask.findOne({
                        playerId: playerData._id,
                        status: constRewardTaskStatus.STARTED
                    }).lean().then(
                        taskData => {
                            creditData.taskData = taskData;
                            return creditData;
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
        return dbconfig.collection_players.findOne({_id: playerId}).populate({
            path: "similarPlayers.playerObjId",
            model: dbconfig.collection_players
        }).then(
            playerData => {
                return {playerId: playerData.playerId, similarData: playerData.similarPlayers};
            }
        );
    },

    /*
     * get captcha
     */
    getCaptcha: function (conn) {
        var deferred = Q.defer();
        //todo::update the size and color later
        var captchaCode = parseInt(Math.random() * 9000 + 1000);
        conn.captchaCode = captchaCode;
        var p = new captchapng(80, 30, captchaCode); // width,height,numeric captcha
        p.color(0, 0, 80, 255);  // First color: background (red, green, blue, alpha)
        p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)


        var img = p.getBase64();
        var imgbase64 = new Buffer(img, 'base64');
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

        dbconfig.collection_players.findOne(query).then(
            function (player) {
                if (player) {
                    playerPlatformId = player.platform;
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
                        rewardEventArray.push(rewardEventItem);
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

        return dbconfig.collection_players.findOne({playerId: playerId}).catch(
            error => Q.reject({name: "DBError", message: "Error in getting player data", error: error})
        ).then(
            function (player) {
                if (player) {
                    queryObject["data.playerObjId"] = player._id;
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
                        .lean().skip(startIndex).limit(count);
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
                            status = proposals[i].process.status;
                        }
                        res.push(
                            {
                                playerId: playerId,
                                playerName: playerName,
                                createTime: proposals[i].createTime,
                                rewardType: proposals[i].type ? proposals[i].type.name : "",
                                rewardAmount: proposals[i].data.rewardAmount ? Number(proposals[i].data.rewardAmount) : 0,
                                eventName: proposals[i].data.eventName,
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
        //todo::temp disable player auto level up
        return Q.resolve(true);

        if (!platformObjId) {
            throw Error("platformObjId was not provided!");
        }
        const playerProm = dbconfig.collection_players.findOne({_id: playerObjId}).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).lean().exec();

        const levelsProm = dbconfig.collection_playerLevel.find({
            platform: platformObjId
        }).sort({value: 1}).lean().exec();

        return Q.all([playerProm, levelsProm]).spread(
            function (player, playerLevels) {
                return dbPlayerInfo.checkPlayerLevelMigration(player, playerLevels, true, false);
            }
        );
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
    checkPlayerLevelMigration: function (player, playerLevels, checkLevelUp, checkLevelDown, checkPeriod) {
        if (!player) {
            throw Error("player was not provided!");
        }
        if (!player.playerLevel) {
            throw Error("player's playerLevel is not populated!");
        }
        if (!playerLevels) {
            throw Error("playerLevels was not provided!");
        }

        var playerObj = null;
        var levelUpObj = null;
        return Promise.resolve(player).then(
            function (player) {
                if (player && player.playerLevel) {
                    // Optimization: No point in checking level up for players who have no topup or consumption
                    if (checkLevelUp && !checkLevelDown
                        && player.dailyTopUpSum === 0 && player.dailyConsumptionSum === 0
                        && player.weeklyTopUpSum === 0 && player.weeklyConsumptionSum === 0
                        && player.pastMonthTopUpSum === 0 && player.pastMonthConsumptionSum === 0
                    ) {
                        return {};
                    }

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

                    if (checkLevelUp && !checkLevelDown) {
                        playerLevels = playerLevels.filter(level => level.value > playerObj.playerLevel.value);
                    }
                    if (checkLevelDown && !checkLevelUp) {
                        playerLevels = playerLevels.filter(level => level.value <= playerObj.playerLevel.value);
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

                    let levelObjId = null;

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
                                const playersTopupForPeriod = playerObj[topupField];
                                let failsTopupRequirements = playersTopupForPeriod < conditionSet.topupMinimum;

                                const consumptionPeriod = conditionSet.consumptionPeriod;
                                const consumptionField = consumptionFieldsByPeriod[consumptionPeriod];
                                const playersConsumptionForPeriod = playerObj[consumptionField];
                                let failsConsumptionRequirements = playersConsumptionForPeriod < conditionSet.consumptionMinimum;

                                if (topupField === undefined || consumptionField === undefined) {
                                    console.warn("Invalid topup period '" + topupPeriod + "' or consumption period '" + consumptionPeriod + "' in playerLevel with id: " + level._id);
                                }

                                const failsEnoughConditions = failsTopupRequirements || failsConsumptionRequirements;
                                if (failsEnoughConditions) {
                                    levelObjId = previousLevel._id;
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
                                    }
                                }

                            }
                        }
                    }

                    if (levelObjId) {
                        // Perform the level up
                        return dbconfig.collection_players.findOneAndUpdate(
                            {_id: playerObj._id, platform: playerObj.platform},
                            {playerLevel: levelObjId/*, dailyTopUpSum: 0, dailyConsumptionSum: 0*/},
                            {new: false}
                        ).then(
                            oldPlayerRecord => {
                                // Should we give the player a reward for this level up?
                                //console.log(`Player has upgraded from level ${oldPlayerRecord.playerLevel} to ${levelObjId}`);
                                if (String(oldPlayerRecord.playerLevel) === String(levelObjId)) {
                                    // The player document was already on the desired level!
                                    // This can happen if two migration checks are made in parallel.
                                    // In this case we won't give the reward, because it will be given by the other check.
                                    //return;
                                } else {
                                    // @todo It may be fairer to give the player the reward for every level he passed
                                    //       up through, not just for the top one he reached.

                                    // If there is a reward for this level, give it to the player
                                    if (levelUpObj && levelUpObj.reward && levelUpObj.reward.bonusCredit) {
                                        //console.log(`Giving the player credit: ${levelUpObj.reward.bonusCredit}`);
                                        var proposalData = {
                                            rewardAmount: levelUpObj.reward.bonusCredit,
                                            isRewardTask: levelUpObj.reward.isRewardTask,
                                            levelValue: levelUpObj.value,
                                            levelName: levelUpObj.name,
                                            playerObjId: playerObj._id,
                                            playerName: playerObj.name,
                                            playerId: playerObj.playerId,
                                            platformObjId: playerObj.platform
                                        };
                                        return dbProposal.createProposalWithTypeName(playerObj.platform, constProposalType.PLAYER_LEVEL_UP, {data: proposalData});
                                    }
                                }
                            }
                        );
                    }
                    else {
                        return "No_Level_Change";
                    }
                }
                else {
                    // Either player, player.playerLevel, the platform or the platform's playerLevels were not found.
                    //console.warn("No player, playerLevel or platform found for playerObjId: " + playerObjId);
                    // Original code would sometimes expect the player or the playerLevels to be undefined,
                    // if the player had no consumption, or they were already on the highest level.
                    return "No_Level_Change";
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in finding player level", error: error});
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
    getPlayerDomainReport: function (platform, para, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'registrationTime': -1};
        var query = {platform: platform};
        para.startTime ? query.registrationTime = {$gte: new Date(para.startTime)} : null;
        (para.endTime && !query.registrationTime) ? (query.registrationTime = {$lt: new Date(para.endTime)}) : null;
        (para.endTime && query.registrationTime) ? (query.registrationTime['$lt'] = new Date(para.endTime)) : null;
        para.name ? query.name = para.name : null;
        para.realName ? query.realName = para.realName : null;
        para.topUpTimes != null ? query.topUpTimes = para.topUpTimes : null;
        para.domain ? query.domain = para.domain : null;
        var count = dbconfig.collection_players.find(query).count();
        var detail = dbconfig.collection_players.find(query).sort(sortCol).skip(index).limit(limit)
            .populate({path: 'partnerId', model: dbconfig.collection_partner});
        return Q.all([count, detail]).then(
            data => {
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
            registrationTime: timeQuery,
            isRealPlayer: true,
            isTestPlayer: false
        }
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
            isRealPlayer: true,
            isTestPlayer: false,
            topUpTimes: {$gt: 0},
            topUpSum: {$gt: 0},
            registrationTime: timeQuery
        };
        var d = dbconfig.collection_players.find(topupQuery).count();
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

        return Q.all([a, b, c, d]).then(
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
                    return dbconfig.collection_playerLevel.find({platform: data.platform});
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
     * Get bonus list
     */
    getBonusList: function () {
        //get data from provider server
        return pmsAPI.bonus_getBonusList({});
    },

    /*
     * Apply bonus
     */
    applyBonus: function (playerId, bonusId, amount, honoreeDetail, bForce) {
        if (amount < 100) {
            return Q.reject({name: "DataError", errorMessage: "Amount is not enough"});
        }
        var player = null;
        var bonusDetail = null;
        var bUpdateCredit = false;
        var resetCredit = function (playerObjId, platformObjId, credit, error) {
            //reset player credit if credit is incorrect
            return dbconfig.collection_players.findOneAndUpdate({
                _id: playerObjId,
                platform: platformObjId
            }, {$inc: {validCredit: credit}}).then(
                resetPlayer => {
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
        return pmsAPI.bonus_getBonusList({}).then(
            bonusData => {
                if (bonusData && bonusData.bonuses && bonusData.bonuses.length > 0) {
                    var bValid = false;
                    bonusData.bonuses.forEach(
                        bonus => {
                            if (bonus.bonus_id == bonusId) {
                                bValid = true;
                                bonusDetail = bonus;
                            }
                        }
                    );
                    if (bValid) {
                        return dbconfig.collection_players.findOne({playerId: playerId})
                            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
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
                            );
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Invalid bonus id"});
                    }
                }
                else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find bonus"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    if ((!playerData.permission || !playerData.permission.applyBonus) && !bForce) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have this permission"
                        });
                    }
                    if (playerData.bankName == null || !playerData.bankAccountName || !playerData.bankAccountType || !playerData.bankAccountCity
                        || !playerData.bankAccount || !playerData.bankAddress || !playerData.phoneNumber) {
                        return Q.reject({
                            status: constServerCode.PLAYER_INVALID_PAYMENT_INFO,
                            name: "DataError",
                            errorMessage: "Player does not have valid payment information"
                        });
                    }

                    //check if player has enough credit
                    player = playerData;
                    if ((playerData.validCredit < amount)) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            errorMessage: "Player does not have enough credit."
                        });
                    }
                    //check if player credit balance.
                    //todo::remove credit balance check for now
                    // if ((playerData.creditBalance > 0) && !bForce) {
                    //     return Q.reject({
                    //         status: constServerCode.PLAYER_CREDIT_BALANCE_NOT_ENOUGH,
                    //         name: "DataError",
                    //         errorMessage: "Player does not have enough Expenses.",
                    //         creditBalance: playerData.creditBalance
                    //     });
                    // }

                    var changeCredit = -amount;
                    // if (bForce && (playerData.validCredit < bonusDetail.credit * amount)) {
                    //     changeCredit = -playerData.validCredit;
                    // }
                    return dbconfig.collection_players.findOneAndUpdate(
                        {
                            _id: player._id,
                            platform: player.platform._id
                        },
                        {$inc: {validCredit: changeCredit}},
                        {new: true}
                    ).then(
                        newPlayerData => {
                            if (newPlayerData) {
                                bUpdateCredit = true;
                                // if (bForce && (playerData.validCredit < bonusDetail.credit * amount)) {
                                //     bUpdateCredit = false;
                                // }

                                if (newPlayerData.validCredit < 0) {
                                    //credit will be reset below
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                        name: "DataError",
                                        errorMessage: "Player does not have enough credit.",
                                        data: '(detected after withdrawl)'
                                    });
                                }

                                player.validCredit = newPlayerData.validCredit;
                                //create proposal
                                var proposalData = {
                                    creator: {
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
                                    amount: amount,
                                    bonusCredit: bonusDetail.credit,
                                    curAmount: player.validCredit,
                                    //requestDetail: {bonusId: bonusId, amount: amount, honoreeDetail: honoreeDetail}
                                };
                                var newProposal = {
                                    creator: proposalData.creator,
                                    data: proposalData,
                                    entryType: constProposalEntryType.CLIENT,
                                    userType: newPlayerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                };
                                return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_BONUS, newProposal);
                            }
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find player"});
                }
            }
        ).then(
            proposal => {
                if (proposal) {
                    if (bUpdateCredit) {
                        dbLogger.createCreditChangeLog(player._id, player.platform._id, -amount * proposal.data.bonusCredit, constProposalType.PLAYER_BONUS, player.validCredit, null, proposal);
                    }
                    return proposal;
                } else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot create bonus proposal"});
                }
            }
        ).then(
            data => data,
            error => {
                if (bUpdateCredit) {
                    return resetCredit(player._id, player.platform._id, amount * bonusDetail.credit, error);
                }
                else {
                    return Q.reject(error);
                }
            }
        );
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
                    var proposalProm = dbconfig.collection_proposal.find(queryObj).sort({createTime: seq}).skip(startIndex).limit(count).lean();

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
    updatePlayerBonusProposal: function (proposalId, bSuccess, remark) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).populate({
            path: "type",
            model: dbconfig.collection_proposalType
        }).then(
            data => {
                if (data) {
                    data.status = bSuccess ? constProposalStatus.SUCCESS : constProposalStatus.FAIL;
                    data.data.lastSettleTime = new Date();
                    data.data.remark = remark;
                    if (!bSuccess) {
                        return proposalExecutor.approveOrRejectProposal(data.type.executionType, data.type.rejectionType, bSuccess, data).then(
                            () => data.save()
                        );
                    }
                    else {
                        SMSSender.sendByPlayerId(data.data.playerId, constPlayerSMSSetting.APPLY_BONUS);
                        return data.save();
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid proposal id"});
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
                        data.status = bSuccess ? constProposalStatus.SUCCESS : constProposalStatus.FAIL;
                        data.data.lastSettleTime = new Date();
                        return proposalExecutor.approveOrRejectProposal(data.type.executionType, data.type.rejectionType, bSuccess, data).then(
                            () => data.save()
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

    getLoginURL: function (playerId, gameId, ip, lang, clientDomainName) {
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
                    if (playerData.status == constPlayerStatus.FORBID) {
                        return Q.reject({
                            status: constServerCode.PLAYER_IS_FORBIDDEN,
                            name: "DataError",
                            message: "Player is forbidden",
                            playerStatus: playerData.status
                        });
                    }
                    // check if the player is ban for particular game - in other words
                    // check if the provider of login game is in the forbidden list
                    else if (playerData.status === constPlayerStatus.FORBID_GAME) {
                        var isForbidden = playerData.forbidProviders.some(providerId => String(providerId) === String(gameData.provider._id));
                        if (isForbidden) {
                            return Q.reject({
                                name: "DataError",
                                status: constServerCode.PLAYER_IS_FORBIDDEN,
                                message: "Player is forbidden to the game",
                                playerStatus: playerData.status
                            });
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
                                if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.providerId != gameData.provider.providerId) {
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
                bTransferIn = (data && ((data.playerCredit + parseFloat(data.rewardCredit)) >= 1)) ? true : false;
                //console.log("bTransferIn:", bTransferIn, data);
                if (data && gameData && gameData.provider) {
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
                var sendData = {
                    username: playerData.name,
                    platformId: playerData.platform.platformId,
                    providerId: providerData.providerId,
                    gameId: gameId,
                    clientDomainName: clientDomainName || "Can not find domain",
                    lang: lang || localization.lang.ch_SP,
                    ip: ip
                };
                return cpmsAPI.player_getLoginURL(sendData);
            }
        ).then(
            loginData => ({gameURL: loginData.gameURL})
        );
    },

    getTestLoginURL: function (playerId, gameId, ip, lang, clientDomainName) {

        var platformData = null;
        var providerData = null;
        var playerData = null;

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .then(data => {
                    if (data) {
                        playerData = data;
                        platformData = data.platform;
                        if (playerData.status != constPlayerStatus.NORMAL) {
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
                    var sendData = {
                        username: playerData.name,
                        platformId: platformData.platformId,
                        providerId: providerData.providerId,
                        gameId: gameId,
                        clientDomainName: clientDomainName || "Can not find domain",
                        lang: lang || localization.lang.ch_SP,
                        ip: ip
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

    getGameUserInfo: function (playerId, platformId, providerId) {
        return dbconfig.collection_players.findOne({playerId: playerId})
            .then(
                data => {
                    if (data) {

                        var sendData = {
                            username: data.name,
                            platformId: platformId,
                            providerId: providerId
                        };
                        return cpmsAPI.player_getGameUserInfo(sendData);
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
                                                if (status == 1) {
                                                    type.status = status;
                                                }
                                            }
                                        });
                                        if (bValidType && (paymentData.merchants[i].targetDevices == clientType || paymentData.merchants[i].targetDevices == 3)) {
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
                                            resData.push({type: paymentData.data[i].bankTypeId, status: status});
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
                        if (proposalData.status != constProposalStatus.PENDING) {
                            return Q.reject({
                                status: constServerCode.DATA_INVALID,
                                name: "DBError",
                                message: 'This proposal has been processed'
                            });
                        }
                        proposal = proposalData;
                        bonusId = proposalData.data.bonusId;
                        return dbProposal.updateBonusProposal(proposalId, constProposalStatus.FAIL, bonusId);
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
        );
    },

    /*
     * player apply for top up return reward
     * @param {String} playerId
     * @param {ObjectId} topUpRecordId
     * @param {String} code
     */
    applyTopUpReturn: function (playerId, topUpRecordId, code, ifAdmin) {
        var platformId = null;
        var player = {};
        var record = {};
        var rewardParam;
        var rewardAmount;
        var deductionAmount;
        var bDoneDeduction = false;
        var adminInfo = ifAdmin;

        var recordProm = dbconfig.collection_playerTopUpRecord.findById(topUpRecordId).lean();
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();
        return Q.all([playerProm, recordProm]).then(
            function (data) {
                //get player's platform reward event data
                if (data && data[0] && data[1] && !data[1].bDirty && String(data[1].playerId) == String(data[0]._id)) {
                    player = data[0];
                    record = data[1];
                    platformId = player.platform;
                    var taskProm = dbRewardTask.getRewardTask(
                        {
                            playerId: player._id,
                            status: constRewardTaskStatus.STARTED
                        }
                    );
                    //get reward event data
                    var eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_TOP_UP_RETURN, code);
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
                        message: "Cannot find top up return event data for platform"
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

                return dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform, deductionAmount, "applyTopUpReturn:Deduction", record).then(
                    function () {
                        bDoneDeduction = true;

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
                                applyAmount: deductionAmount,
                                rewardAmount: rewardAmount,
                                providers: eventData.param.providers,
                                targetEnable: eventData.param.targetEnable,
                                games: eventData.param.games,
                                spendingAmount: (record.amount + rewardAmount) * rewardParam.spendingTimes,
                                minTopUpAmount: rewardParam.minTopUpAmount,
                                useConsumption: eventData.param.useConsumption,
                                eventId: eventData._id,
                                eventName: eventData.name,
                                eventCode: eventData.code
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
                        return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                            {_id: record._id, createTime: record.createTime, bDirty: false},
                            {bDirty: true, usedType: constRewardType.PARTNER_TOP_UP_RETURN},
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
        ).catch(
            error => Q.resolve().then(
                () => bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, "applyTopUpReturn:ProposalFailedRefund", error)
            ).then(
                () => Q.reject(error)
            )
        );
    },

    /*
     * player apply for consumption incentive reward
     * @param {String} playerId
     * @param {String} code
     */
    applyConsumptionIncentive: function (playerId, code, ifAdmin) {
        var platformId = null;
        var player = {};
        var eventParam = {};
        //get yesterday time frame
        var yerTime = dbUtility.getYesterdaySGTime();
        var playerTopUpAmount = 0;
        var event = {};
        var adminInfo = ifAdmin;

        var playerProm = dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();
        return playerProm.then(
            data => {
                //get player's platform reward event data
                if (data && data.playerLevel) {
                    player = data;
                    platformId = player.platform;
                    var taskProm = dbRewardTask.getRewardTask(
                        {
                            playerId: player._id,
                            status: constRewardTaskStatus.STARTED
                        }
                    );
                    //get reward event data
                    var eventProm = dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSUMPTION_INCENTIVE, code);
                    return Q.all([eventProm, taskProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            data => {
                if (data) {
                    var eventData = data[0];
                    var taskData = data[1];
                    if (taskData) {
                        return Q.reject({
                            status: constServerCode.PLAYER_HAS_REWARD_TASK,
                            name: "DataError",
                            message: "The player has not unlocked the previous reward task. Not valid for new reward"
                        });
                    }
                    if (rewardUtility.isValidRewardEvent(constRewardType.PLAYER_CONSUMPTION_INCENTIVE, eventData) && eventData.param.needApply) {
                        event = eventData;
                        eventParam = eventData.param.reward[player.playerLevel.value];
                        if (eventParam && (player.validCredit + player.lockedCredit) <= eventParam.maxPlayerCredit) {
                            //get yesterday top up amount
                            return dbconfig.collection_playerTopUpRecord.aggregate(
                                {
                                    $match: {
                                        playerId: player._id,
                                        platformId: player.platform,
                                        amount: {$gte: eventParam.minTopUpRecordAmount},
                                        createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime},
                                        $or: [{bDirty: false}, {
                                            bDirty: true,
                                            usedType: constRewardType.PLAYER_TOP_UP_RETURN
                                        }]
                                    }
                                },
                                {
                                    $group: {
                                        _id: {playerId: "$playerId", platformId: "$platformId"},
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
                    var bonusProm = dbconfig.collection_proposalType.findOne({
                        platformId: player.platform,
                        name: constProposalType.PLAYER_BONUS
                    }).then(
                        typeData => {
                            if (typeData) {
                                return dbconfig.collection_proposal.find(
                                    {
                                        type: typeData._id,
                                        "data.playerObjId": player._id,
                                        "data.platformId": player.platform,
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
                            if (bonusData && bonusData > 0) {
                                var bonusCredit = 0;
                                bonusData.forEach(
                                    data => {
                                        bonusCredit += data.data.amount * data.data.bonusCredit
                                    }
                                );
                                return bonusCredit;
                            }
                            else {
                                return 0;
                            }
                        }
                    );
                    //get all game credit
                    var providerCreditProm = dbconfig.collection_platform.findById(player.platform)
                        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean().then(
                            platformData => {
                                if (platformData && platformData.gameProviders && platformData.gameProviders.length > 0) {
                                    var proms = [];
                                    for (var i = 0; i < platformData.gameProviders.length; i++) {
                                        proms.push(cpmsAPI.player_queryCredit(
                                            {
                                                username: player.name,
                                                platformId: platformData.platformId,
                                                providerId: platformData.gameProviders[i].providerId,
                                            }
                                        ));
                                    }
                                    return Q.all(proms);
                                }
                            }
                        ).then(
                            providerCredit => {
                                if (providerCredit && providerCredit.length > 0) {
                                    var credit = 0;
                                    for (var i = 0; i < providerCredit.length; i++) {
                                        if (providerCredit[i].credit === undefined) {
                                            throw Error(`No credit in response [${i}]: ${JSON.stringify(providerCredit[i])}`);
                                        }
                                        credit += parseFloat(providerCredit[i].credit);
                                    }
                                    return credit;
                                }
                                else {
                                    return 0;
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
                    var validCredit = playerTopUpAmount - data[0] - data[1];
                    if ((validCredit * eventParam.rewardPercentage) >= eventParam.minRewardAmount && (player.validCredit + player.lockedCredit + data[1]) <= eventParam.maxPlayerCredit) {
                        var rewardAmount = Math.min(Math.floor(validCredit * eventParam.rewardPercentage), eventParam.maxRewardAmount);
                        var proposalData = {
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
                                rewardAmount: rewardAmount,
                                spendingAmount: validCredit * eventParam.spendingTimes,
                                eventId: event._id,
                                eventName: event.name,
                                eventCode: event.code
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
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

    applyPlayerTopUpReward: function (playerId, code, topUpRecordId, ifAdmin) {
        var platformId = null;
        var player = {};
        var record = {};
        var deductionAmount;
        var bDoneDeduction = false;
        var adminInfo = ifAdmin;

        var recordProm = dbconfig.collection_playerTopUpRecord.findById(topUpRecordId).lean();
        var playerProm = dbconfig.collection_players.findOne({playerId: playerId}).lean();
        return Q.all([playerProm, recordProm]).then(
            data => {
                //get player's platform reward event data
                if (data && data[0] && data[1] && !data[1].bDirty && String(data[1].playerId) == String(data[0]._id)) {
                    player = data[0];
                    record = data[1];
                    platformId = player.platform;
                    var taskProm = dbRewardTask.getRewardTask(
                        {
                            playerId: player._id,
                            status: constRewardTaskStatus.STARTED
                        }
                    );
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
                return dbPlayerInfo.tryToDeductCreditFromPlayer(player._id, player.platform, deductionAmount, "applyPlayerTopUpReward:Deduction", record).then(
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
                                eventCode: eventData.code
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS,
                        };
                        return dbconfig.collection_playerTopUpRecord.findOneAndUpdate(
                            {_id: record._id, createTime: record.createTime, bDirty: false},
                            {bDirty: true},
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
                () => bDoneDeduction && dbPlayerInfo.refundPlayerCredit(player._id, player.platform, +deductionAmount, "applyPlayerTopUpReward:ProposalFailedRefund", error)
            ).then(
                () => Q.reject(error)
            )
        );
    },

    applyRewardEvent: function (playerId, code, data, adminId, adminName) {
        var adminInfo = '';
        if (adminId && adminName) {
            adminInfo = {
                name: adminName,
                type: 'admin',
                id: adminId
            }
        }

        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
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
                    //check valid time for reward event
                    var curTime = new Date();
                    if ((rewardEvent.validStartTime && curTime.getTime() < rewardEvent.validStartTime.getTime()) ||
                        (rewardEvent.validEndTime && curTime.getTime() > rewardEvent.validEndTime.getTime())) {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "This reward event is not valid anymore"
                        });
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
                            return dbPlayerInfo.applyForFirstTopUpRewardProposal(null, playerId, data.topUpRecordIds, code, adminInfo);
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
                            return dbPlayerInfo.applyForGameProviderRewardAPI(playerId, code, data.amount, adminInfo);
                            break;
                        //request consumption rebate
                        case constRewardType.PLAYER_CONSUMPTION_RETURN:
                            return dbPlayerConsumptionWeekSummary.startCalculatePlayerConsumptionReturn(playerId, true);
                            break;
                        case constRewardType.PLAYER_TOP_UP_RETURN:
                            if (data.topUpRecordId == null) {
                                return Q.reject({
                                    status: constServerCode.INVALID_DATA,
                                    name: "DataError",
                                    message: "Invalid Data"
                                });
                            }
                            return dbPlayerInfo.applyTopUpReturn(playerId, data.topUpRecordId, code, adminInfo);
                            break;
                        case constRewardType.PLAYER_CONSUMPTION_INCENTIVE:
                            //todo::temp fix for msgreen, remove after this reward is updated
                            return Q.reject({
                                status: constServerCode.INVALID_DATA,
                                name: "DataError",
                                message: "Please contact customer service"
                            });
                            // return dbPlayerInfo.applyConsumptionIncentive(playerId, code, adminInfo);
                            break;
                        case constRewardType.PLAYER_TOP_UP_REWARD:
                            return dbPlayerInfo.applyPlayerTopUpReward(playerId, code, data.topUpRecordId, adminInfo);
                            break;
                        case constRewardType.PLAYER_REFERRAL_REWARD:
                            return dbPlayerInfo.applyPlayerReferralReward(playerId, code, data.referralId, adminInfo);
                            break;
                        case constRewardType.PLAYER_REGISTRATION_REWARD:
                            return dbPlayerInfo.applyPlayerRegistrationReward(playerId, code, adminInfo);
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

    applyPlayerReferralReward: function (playerId, code, referralId, ifAdmin) {
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
                        playerId: referralId,
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
                            referralId: referralId,
                            referralName: referralObj.name,
                            referralTopUpAmount: topUpAmount
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };
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

    applyPlayerRegistrationReward: function (playerId, code, adminInfo) {
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
                            eventCode: rewardEvent.code
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };
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
                        () => dbPlayerInfo.refundPlayerCredit(playerObjId, platformObjId, +updateAmount, "deductedBelowZeroRefund", data)
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

    //todo::send sms to player with content ???
    sendSMStoPlayer: function (playerObjId, type, content) {
        dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            playerData => {
                if (playerData && playerData.phoneNumber && playerData.smsSetting && playerData.smsSetting[type] && content) {
                    //todo:: get channel and send sms
                }
            }
        );
    }
};

var proto = dbPlayerInfoFunc.prototype;
proto = Object.assign(proto, dbPlayerInfo);

// This make WebStorm navigation work
module.exports = dbPlayerInfo;