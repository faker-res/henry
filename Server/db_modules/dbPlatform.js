"use strict";

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var env = require('../config/env').config();
var dbconfig = require('./../modules/dbproperties');
var constPartnerLevel = require('./../const/constPartnerLevel');
var constPlayerLevel = require('./../const/constPlayerLevel');
const constPlayerRegistrationInterface = require('./../const/constPlayerRegistrationInterface');
var constPlayerTrustLevel = require('./../const/constPlayerTrustLevel');
var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var dbPartnerLevel = require('./../db_modules/dbPartnerLevel');
const dbPlayerReward = require('./../db_modules/dbPlayerReward');
var dbPlayerLevel = require('./../db_modules/dbPlayerLevel');
var dbPlayerTrustLevel = require('./../db_modules/dbPlayerTrustLevel');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbPlatformGameStatus = require('./../db_modules/dbPlatformGameStatus');
var constPlayerLevelPeriod = require('../const/constPlayerLevelPeriod');
var pmsAPI = require('../externalAPI/pmsAPI');
var cpmsAPI = require('../externalAPI/cpmsAPI');
var smsAPI = require('../externalAPI/smsAPI');
var Q = require("q");
var crypto = require('crypto');
var externalUtil = require("../externalAPI/externalUtil.js");
var dbUtility = require('./../modules/dbutility');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var rsaCrypto = require("../modules/rsaCrypto");
var dbRewardEvent = require("../db_modules/dbRewardEvent");
var dbLogger = require('./../modules/dbLogger');

// constants
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalUserType = require('../const/constProposalUserType');
const constProviderStatus = require("./../const/constProviderStatus");
const constRewardTaskStatus = require('../const/constRewardTaskStatus');
const constServerCode = require('../const/constServerCode');
const constSettlementPeriod = require("../const/constSettlementPeriod");
const constSystemParam = require('../const/constSystemParam');
const errorUtils = require('../modules/errorUtils');
const request = require('request');
const constSMSPurpose = require("../const/constSMSPurpose");

function randomObjectId() {
    var id = crypto.randomBytes(12).toString('hex');
    return mongoose.Types.ObjectId(id);
}

var dbPlatform = {
    /**
     * Create a new platform
     * @param {json} data - The data of the platform. Refer to Platform schema.
     * @param {Object} [partnerLevelConfigData] - Optional data for the platform's partnerLevelConfig.  Without this, a default will be created.
     */
    createPlatform: function (platformData, partnerLevelConfigData) {
        var deferred = Q.defer();

        // We give platforms a random ObjectID, so that if 5 platforms are created in quick succession, they and their
        // associated data will not all get stored on the same shard.

        if (platformData) {
            platformData._id = randomObjectId();

            if (platformData.platformId) {
                delete platformData.platformId;
            }
        }

        var platform = new dbconfig.collection_platform(platformData);
        platform.save().then(
            function (data) {
                if (data && data._id) {
                    platformData = data;
                    var proms = [];
                    //create default partner level for platform
                    var value = 0;
                    for (var key in constPartnerLevel) {
                        var platformPartnerLevel = {
                            //todo::update the default data here
                            name: constPartnerLevel[key],
                            value: value++,
                            platform: data._id,
                            demoteWeeks: 4,
                            limitPlayers: 10 * (value + 1),
                            consumptionAmount: 10 * (value + 1),
                            consumptionReturn: 0.2
                        };
                        proms.push(dbPartnerLevel.createPartnerLevel(platformPartnerLevel));
                    }
                    //create default player level for platform
                    value = 0;
                    for (var key in constPlayerLevel) {
                        var platformPlayerLevel = {
                            name: constPlayerLevel[key],
                            value: value++,
                            platform: data._id,
                            levelUpConfig: [
                                {
                                    andConditions: true,
                                    topupLimit: 1000 * (value + 1),
                                    topupPeriod: "WEEK",
                                    consumptionLimit: 10000 * (value + 1),
                                    consumptionPeriod: "WEEK"
                                },
                                {
                                    andConditions: false,
                                    topupLimit: 1000 * (value + 1),
                                    topupPeriod: "DAY",
                                    consumptionLimit: 10000 * (value + 1),
                                    consumptionPeriod: "DAY"
                                }
                            ],
                            levelDownConfig: [
                                {
                                    andConditions: false,
                                    topupMinimum: 10 * value,
                                    topupPeriod: "DAY",
                                    consumptionMinimum: 100 * value,
                                    consumptionPeriod: "DAY"
                                }
                            ]
                        };
                        proms.push(dbPlayerLevel.createPlayerLevel(platformPlayerLevel));
                    }
                    //create default player trust level for platform
                    for (var key in constPlayerTrustLevel) {
                        var platformPlayerTrustLevel = {
                            name: key,
                            value: constPlayerTrustLevel[key],
                            platform: data._id
                        };
                        proms.push(dbPlayerTrustLevel.createPlayerTrustLevel(platformPlayerTrustLevel));
                    }
                    proms.push(dbPlatform.createPlatformProposalTypes(data._id));

                    // Every platform should have a partnerLevelConfig
                    // We create a partnerLevelConfig with dummy data here, which the user can update later
                    partnerLevelConfigData = partnerLevelConfigData || {
                        //todo::update the default value here
                        validPlayerTopUpTimes: 5,
                        validPlayerConsumptionTimes: 10,
                        activePlayerTopUpTimes: 1,
                        activePlayerConsumptionTimes: 1
                    };
                    partnerLevelConfigData.platform = data._id;
                    var partnerLevelConfig = new dbconfig.collection_partnerLevelConfig(partnerLevelConfigData);
                    proms.push(partnerLevelConfig.save());

                    return Q.all(proms);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create platform."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating platform.", error: error});
            }
        ).then(
            function (data) {
                //add platform to PMS
                if (env.mode != "local" && env.mode != "qa") {
                    externalUtil.request(pmsAPI.platform_add(
                        {
                            platformId: platformData.platformId,
                            name: platformData.name,
                            code: platformData.code,
                            description: platformData.description || ""
                        }
                    ));
                }
                deferred.resolve(platformData);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating platform partnerLevel and playerLevel.",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Create all proposal type and process for platform
     * @param {String} platformId
     */
    createPlatformProposalTypes: function (platformId) {
        var proms = [];
        for (var key in constProposalType) {
            proms.push(dbProposalType.createProposalType({platformId: platformId, name: constProposalType[key]}));
        }

        return Q.all(proms);
    },

    /**
     * Search the platform information of the platform by  platformName or _id
     * @param {Object} platformData - Query
     */
    getPlatform: function (platformData) {
        return dbconfig.collection_platform.findOne(platformData)
            .populate({path: "paymentChannels", model: dbconfig.collection_paymentChannel})
            .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean().exec().then(
                platform => {
                    // debug use, delete later
                    if (platform && (platform.platformId == 4 || platform.platformId == 6)) {
                        console.log("whiteList length: ", platform.whiteListingPhoneNumbers && platform.whiteListingPhoneNumbers.length, 'z|^', platform.platformId)
                        console.log("gameProviderInfo: ", JSON.stringify(platform.gameProviderInfo), 'k|^', platform.platformId)
                    }


                    return platform;
                }
            );
    },

    /**
     * Search the platform information API
     * @param {String} platformData - query data
     */
    getPlatformAPI: function (platformData) {
        return dbconfig.collection_platform.find(platformData, {platformId: 1, code: 1, description: 1, name: 1});
    },

    /**
     * Search all the platform information
     */
    getAllPlatforms: function () {
        return dbconfig.collection_platform.find().populate({
            path: "department",
            model: dbconfig.collection_department
        }).exec();
    },

    /**
     * Get platforms
     */
    getPlatforms: function (query) {
        return dbconfig.collection_platform.find(query);
    },

    /**
     * Update platform by platformName or _id of the platform schema
     * @param {Object}  query - The query object
     * @param {Object} updateData - The update object
     */
    updatePlatform: function (query, updateData) {
        if (updateData.dailySettlementTime) {
            var dailyTime = new Date(updateData.dailySettlementTime);
            updateData.dailySettlementHour = dailyTime.getUTCHours();
            updateData.dailySettlementMinute = dailyTime.getUTCMinutes();
        }
        if (updateData.weeklySettlementTime) {
            var weeklyTime = new Date(updateData.weeklySettlementTime);
            updateData.weeklySettlementHour = weeklyTime.getUTCHours();
            updateData.weeklySettlementMinute = weeklyTime.getUTCMinutes();
            updateData.weeklySettlementDay = weeklyTime.getUTCDay();
        }
        if (updateData.usePointSystem) {
            dbPlayerInfo.createPlayerRewardPointsRecord(query, "", true);
        }

        if (!updateData.whiteListingPhoneNumbers || (updateData.whiteListingPhoneNumbers instanceof Array && updateData.whiteListingPhoneNumbers.length === 0)) {
            delete updateData.whiteListingPhoneNumbers;
        }

        if (!updateData.gameProviderNickNames) {
            delete updateData.gameProviderNickNames;
        }

        console.log("updatePlatform platform update:", updateData);

        return dbconfig.collection_platform.findOneAndUpdate(query, updateData, {new: true}).then(
            data => {
                console.log("updatePlatform", data, query, updateData);
                if (env.mode != "local" && env.mode != "qa") {
                    var platformData = {
                        platformId: data.platformId,
                        name: data.name,
                        code: data.code,
                        description: data.description
                    };
                    externalUtil.request(pmsAPI.platform_update(platformData));
                }
                return data;
            }
        );
    },
    getPlatformSetting: function (query) {
        return dbconfig.collection_platform.find(query);
    },

    /**
     * Delete platform by object _id of the platform schema
     * @param {array}  platformObjIds - The object _ids of the platform
     */
    deletePlatform: function (platformObjIds) {
        var playerProm = dbconfig.collection_players.remove({platform: {$in: platformObjIds}}).exec();
        var playerNameProm = dbconfig.collection_playerName.remove({platform: {$in: platformObjIds}}).exec();
        var partnerProm = dbconfig.collection_partner.remove({platform: {$in: platformObjIds}}).exec();
        var partnerLvlConfigProm = dbconfig.collection_partnerLevelConfig.remove({platform: {$in: platformObjIds}}).exec();
        var partnerLvlProm = dbconfig.collection_partnerLevel.remove({platform: {$in: platformObjIds}}).exec();

        var departmentProm = dbconfig.collection_department.update(
            {},
            {$pull: {platforms: {$in: platformObjIds}}},
            {multi: true}
        ).exec();

        var playerLevelProm = dbconfig.collection_playerLevel.remove({platform: {$in: platformObjIds}}).exec();
        var proposalTypeProm = dbconfig.collection_proposalType.remove({platformId: {$in: platformObjIds}}).exec();
        var proposalTypeProcessProm = dbconfig.collection_proposalTypeProcess.remove({platformId: {$in: platformObjIds}}).exec();

        var platformId = null;

        return dbconfig.collection_platform.findOne({_id: platformObjIds[0]})
            .then(
                data => {
                    if (data && data.platformId) {
                        platformId = data.platformId;
                    }
                    var platformProm = dbconfig.collection_platform.remove({_id: {$in: platformObjIds}}).exec();
                    return Q.all([platformProm, playerProm, playerNameProm, partnerProm, departmentProm, partnerLvlConfigProm, partnerLvlProm, playerLevelProm, proposalTypeProm, proposalTypeProcessProm]);
                }
            )
            .then(
                data => {
                    if (platformId && env.mode != "local" && env.mode != "qa") {
                        externalUtil.request(pmsAPI.platform_delete({platformId: platformId}));
                    }
                    return data;
                }
            )
    },
    /**
     * Add platforms to a department and all parent departments
     * @param departmentId
     * @param platformObjIds
     */
    addPlatformsToDepartmentById: function (departmentId, platformObjIds) {
        var deferred = Q.defer();

        //get all parent department
        dbconfig.collection_department.find().then(
            function (data) {
                if (data && data.length > 0) {
                    var allDepartments = {};
                    //add all departments data to key map
                    for (var i = 0; i < data.length; i++) {
                        allDepartments[data[i]._id] = data[i];
                    }
                    var departments = [departmentId];
                    //get all parent departments id
                    var parent = allDepartments[departmentId];
                    while (parent.parent) {
                        departments.push(parent.parent);
                        parent = allDepartments[parent.parent];
                    }
                    return departments;
                }
                else {
                    return [departmentId];
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding parent departments", error: error});
            }
        ).then(
            function (departments) {
                dbconfig.collection_department.update(
                    {
                        _id: {$in: departments}
                    },
                    {
                        $addToSet: {platforms: {$each: platformObjIds}}
                    },
                    {multi: true}
                ).then(
                    function (data) {
                        deferred.resolve(data);
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error adding platform to department",
                            error: error
                        });
                    }
                );
            }
        );

        return deferred.promise;
    },

    /**
     * Sync platforms to API server
     * @param no parameter is needed.
     */

    syncPlatform: function () {
        dbPlatform.syncPMSPlatform();
        dbPlatform.syncCPMSPlatform();
        dbPlatform.syncSMSPlatform();
    },

    syncPMSPlatform: function () {
        if (env.mode != "local" && env.mode != "qa") {
            return dbconfig.collection_platform.find().then(
                platformArr => {
                    var sendObj = [];
                    if (platformArr && platformArr.length > 0) {
                        for (var i in platformArr) {
                            var obj = {
                                platformId: platformArr[i].platformId,
                                name: platformArr[i].name,
                                code: platformArr[i].code,
                                description: platformArr[i].description || ""
                            }
                            sendObj.push(obj)
                        }
                        return externalUtil.request(pmsAPI.platform_syncData({platforms: sendObj}));
                    }
                }
            )
        }
    },

    syncSMSPlatform: function () {
        if (env.mode != "local" && env.mode != "qa") {
            return dbconfig.collection_platform.find().then(
                platformArr => {
                    var sendObj = [];
                    if (platformArr && platformArr.length > 0) {
                        for (var i in platformArr) {
                            var obj = {
                                platformId: platformArr[i].platformId,
                                name: platformArr[i].name,
                                code: platformArr[i].code,
                                description: platformArr[i].description || ""
                            }
                            sendObj.push(obj)
                        }
                        return externalUtil.request(smsAPI.platform_syncData({platforms: sendObj}));
                    }
                }
            )
        }
    },

    /**
     * Remove platforms from department
     * @param are _id of department and _id of platform
     */
    removePlatformsFromDepartmentById: function (departmentId, platformObjIds) {
        return dbconfig.collection_department.update(
            {
                _id: departmentId
            },
            {
                $pull: {platforms: {$in: platformObjIds}}
            }
        ).exec();
    },
    /**
     * Update the department in Platform
     * @param are _id of department and _id of platform
     */
    updateDepartmentToPlatformById: function (platformObjId, departmentId) {
        console.log("updateDepartmentToPlatformById platform update:", {department: departmentId});

        return dbconfig.collection_platform.update(
            {
                _id: platformObjId
            },
            {
                department: departmentId
            }
        ).exec();
    },
    /**
     * remove the department from platform
     * @param platformObjId
     */
    removeDepartmentFromPlatformById: function (platformObjId) {
        console.log("removeDepartmentFromPlatformById platform update:", {department: null});

        return dbconfig.collection_platform.update(
            {
                _id: platformObjId
            },
            {
                department: null
            }
        ).exec();
    },

    /**
     * Add provider to the "gameProviders" array in platform, and also give it a local nickname and a local prefix
     * @param platformObjId
     * @param providerObjId
     * @param localProviderNickName - desired nickname of provider in this platform, or null to unset it (use provider default)
     * @param localProviderPrefix - desired prefix of provider in this platform, or null to unset it (use provider default)
     */
    addProviderToPlatformById: function (platformObjId, providerObjId, localProviderNickName, localProviderPrefix) {
        return dbPlatform.addOrRenameProviderInPlatformById(platformObjId, providerObjId, localProviderNickName, localProviderPrefix);
    },

    /**
     * Rename the nickname and the prefix of the given provider in the given platform
     * @param platformObjId
     * @param providerObjId
     * @param localProviderNickName - new nickname of provider in this platform, or null to unset it (use provider default)
     * @param localProviderPrefix - desired prefix of provider in this platform, or null to unset it (use provider default)
     */
    renameProviderInPlatformById: function (platformObjId, providerObjId, localProviderNickName, localProviderPrefix) {
        return dbPlatform.addOrRenameProviderInPlatformById(platformObjId, providerObjId, localProviderNickName, localProviderPrefix);
    },

    /**
     * Add provider to the "gameProviders" array in platform, and also give it a local nickname and a local prefix
     * @param platform code
     * @param provider code
     * @param localProviderNickName - desired nickname of provider in this platform, or null to unset it (use provider default)
     * @param localProviderPrefix - desired prefix of provider in this platform, or null to unset it (use provider default)
     */
    addProviderToPlatform: function (platformId, providerId, localProviderNickName, localProviderPrefix) {

        var providerProm = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        var platformProm = dbconfig.collection_platform.findOne({platformId: platformId});

        return Q.all([providerProm, platformProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    var nickName = localProviderNickName ? localProviderNickName : data[0].nickName;
                    var prefix = localProviderPrefix ? localProviderPrefix : data[0].prefix;

                    var providerProm = dbPlatform.addOrRenameProviderInPlatformById(data[1]._id, data[0]._id, nickName, prefix);
                    var gameProm = dbPlatformGameStatus.addProviderGamesToPlatform(data[0]._id, data[1]._id);

                    return Q.all([providerProm, gameProm]);
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot find provider or platform. ProviderId:" + providerId + " PlatformId: " + platformId
                    });
                }
            }
        );
    },

    addOrRenameProviderInPlatformById: function (platformObjId, providerObjId, localProviderNickName, localProviderPrefix) {
        let nickNameUpdatePath = "gameProviderInfo." + providerObjId + ".localNickName";
        let prefixUpdatePath = "gameProviderInfo." + providerObjId + ".localPrefix";
        let nickNameUpdate = {};
        nickNameUpdate[nickNameUpdatePath] = localProviderNickName;
        nickNameUpdate[prefixUpdatePath] = localProviderPrefix;

        console.log("addOrRenameProviderInPlatformById platform update:", {
            $addToSet: {gameProviders: {$each: [providerObjId]}},
            $set: nickNameUpdate
        });

        return dbconfig.collection_platform.findOneAndUpdate(
            {
                _id: platformObjId
            },
            {
                $addToSet: {gameProviders: {$each: [providerObjId]}},
                $set: nickNameUpdate
            }
        ).exec();
    },

    updateProviderFromPlatformById: function (platformObjId, providerObjId, isEnable) {
        let statusUpdatePath = "gameProviderInfo." + providerObjId + ".isEnable";
        let statusUpdate = {};
        statusUpdate[statusUpdatePath] = isEnable;

        console.log("updateProviderFromPlatformById platform update:", {
            $addToSet: {gameProviders: {$each: [providerObjId]}},
            $set: statusUpdate
        });

        return dbconfig.collection_platform.findOneAndUpdate(
            {
                _id: platformObjId
            },
            {
                $addToSet: {gameProviders: {$each: [providerObjId]}},
                $set: statusUpdate
            }
        ).exec();
    },

    /**
     * Remove provider attached to a platform
     * @param platform code and provider code
     */
    removeProviderFromPlatform: function (platformId, providerId) {

        var providerProm = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        var platformProm = dbconfig.collection_platform.findOne({platformId: platformId});

        return Q.all([providerProm, platformProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    var providerProm = dbPlatform.removeProviderFromPlatformById(data[1]._id, data[0]._id);
                    var gameProm = dbPlatformGameStatus.removeProviderGamesFromPlatform(data[0]._id, data[1]._id);

                    return Q.all([providerProm, gameProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find provider or platform"});
                }
            }
        );
    },

    /**
     * Remove provider attached to a platform
     * @param platformObjId and  providerObjId
     * Step 1- Find all games under the ProviderId (param) in  Collection - "game"
     * Step 2- Remove the documents where the game _ids resulted in Step1 and platformId(param) are matched in Collection -"platformGameStatus"
     * Step 3 - Remove ProviderId from the "gameProviders" array in Collection - "platform"
     */
    removeProviderFromPlatformById: function (platformObjId, providerObjId) {

        var deferred = Q.defer();
        var gamesUnderProvider = [];

        dbconfig.collection_game.find({provider: providerObjId}).then(
            function (gamesData) {

                for (var i = 0; i < gamesData.length; i++) {
                    gamesUnderProvider.push(gamesData[i]._id);
                }
                return dbconfig.collection_platformGameStatus.remove({$and: [{game: {$in: gamesUnderProvider}}, {platform: platformObjId}]}).exec();
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding game for provider.", error: error});
            }
        ).then(
            function (data) {
                if (data) {

                    console.log("removeProviderFromPlatformById platform update:", {
                        $pull: {gameProviders: providerObjId},
                        $unset: {'gameProviderInfo': '' + providerObjId}
                    });

                    return dbconfig.collection_platform.findOneAndUpdate(
                        {
                            _id: platformObjId
                        },
                        {
                            $pull: {gameProviders: providerObjId},
                            $unset: {'gameProviderInfo': '' + providerObjId}
                        }
                    ).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't remove game  from platform."});
                }
            },
            function (error) {

                deferred.reject({name: "DBError", message: "Error removing game  from platform.", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't remove provider from platform."});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error removing game for provider and platform.",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    /**
     * Sync platform providers data
     * @param platformId
     * @param providerIds
     */
    syncPlatformProvider: function (platformId, providerIds) {
        return dbconfig.collection_platform.findOne({platformId}).populate(
            {path: "gameProviders", model: dbconfig.collection_gameProvider}
        ).then(
            platformData => {
                if (platformData) {
                    var proms = [];
                    //get current provider ids
                    var curProviders = [];
                    if (platformData.gameProviders && platformData.gameProviders.length > 0) {
                        platformData.gameProviders.forEach(provider => curProviders.push(provider.providerId));
                    }
                    //find new provider
                    providerIds.forEach(
                        providerId => {
                            if (curProviders.indexOf(providerId) < 0) {
                                proms.push(dbPlatform.addProviderToPlatform(platformId, providerId));
                            }
                        }
                    );

                    //find delete one
                    curProviders.forEach(
                        curProvider => {
                            if (providerIds.indexOf(curProvider) < 0) {
                                proms.push(dbPlatform.removeProviderFromPlatform(platformId, curProvider));
                            }
                        }
                    );
                    if (proms.length > 0) {
                        return Q.all(proms);
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find platform by platformId"});
                }
            }
        );
    },

    /**
     * Sync all platform providers data
     * @param platformProviders
     */
    syncProviders: function (platformProviders) {
        var proms = [];
        platformProviders.forEach(
            row => {
                if (row.platformId && row.providers && Array.isArray(row.providers)) {
                    proms.push(dbPlatform.syncPlatformProvider(row.platformId, row.providers));
                }
            }
        );
        return Q.all(proms);
    },

    /**
     * Add provider to the "gameProviders" array in Platform
     * @param platformObjId and providerObjId
     */
    getPlatformByAdminId: function (adminId) {
        var deferred = Q.defer();
        //find admin department platforms data
        dbconfig.collection_admin.findOne({_id: adminId})
            .populate({path: "departments", model: dbconfig.collection_department})
            .then(
            function (data) {
                if (data && data.departments && data.departments.length > 0) {
                    //if root department, show all the platforms
                    //else only show department platform
                    if (data.departments[0].parent) {
                        if (data.departments[0].platforms && data.departments[0].platforms.length > 0) {
                            return dbconfig.collection_platform.find({_id: {$in: data.departments[0].platforms}})
                                .populate({path: "csDepartment", model: dbconfig.collection_department})
                                .populate({path: "qiDepartment", model: dbconfig.collection_department}).exec();
                        }
                        else {
                            deferred.reject({name: "DataError", message: "No platform available."});
                        }
                    }
                    else {
                        return dbconfig.collection_platform.find().populate({path: "csDepartment", model: dbconfig.collection_department}).populate({path: "qiDepartment", model: dbconfig.collection_department}).exec();
                    }
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding user.", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform for user", error: error});
            }
        );
        return deferred.promise;
    },

    /*
     * reset player top up and consumption amount for level up check
     * @param {Object}  platformObjId
     * @param {Boolean}  bWeek weekly or daily
     */
    resetPlatformPlayerLevelData: function (platformObjId, bWeek) {
        //if daily settlement, and if it is the first day of the month, then reset monthly amount
        var queryOrArray = [{dailyTopUpSum: {$gt: 0}}, {dailyConsumptionSum: {$gt: 0}}, {dailyTopUpIncentiveAmount: {$gt: 0}}];
        var updateData = {dailyTopUpSum: 0, dailyConsumptionSum: 0, dailyTopUpIncentiveAmount: 0};
        if (dbUtility.isFirstDayOfMonthSG()) {
            queryOrArray.push({pastMonthTopUpSum: {$gt: 0}});
            queryOrArray.push({pastMonthConsumptionSum: {$gt: 0}});
            updateData.pastMonthTopUpSum = 0;
            updateData.pastMonthConsumptionSum = 0;
        }
        //if it is the first day of the week, then reset weekly amount
        if (dbUtility.isFirstDayOfWeekSG()) {
            queryOrArray.push({weeklyTopUpSum: {$gt: 0}});
            queryOrArray.push({weeklyConsumptionSum: {$gt: 0}});
            updateData.weeklyTopUpSum = 0;
            updateData.weeklyConsumptionSum = 0;
        }
        return dbconfig.collection_players.update(
            {
                platform: platformObjId,
                $or: queryOrArray
            },
            updateData,
            {multi: true}
        );
    },

    /**
     * Add paymentChannel to the "paymentChannels" array in Platform
     * @param platformObjId and  paymentObjId
     */
    // addPaymentToPlatformById: function (platformObjId, paymentObjId) {
    //     return dbconfig.collection_platform.findOneAndUpdate(
    //         {
    //             _id: platformObjId
    //         },
    //         {
    //             $addToSet: {paymentChannels: paymentObjId}
    //         }
    //     ).exec();
    // },

    // removePaymentFromPlatformById: function (platformObjId, paymentObjId) {
    //     return dbconfig.collection_platform.findOneAndUpdate(
    //         {
    //             _id: platformObjId
    //         },
    //         {
    //             $pull: {paymentChannels: paymentObjId}
    //         }
    //     ).exec();
    // },

    /**
     * Sync platforms to cpms API server
     * @param no parameter is needed.
     */
    syncCPMSPlatform: function () {
        if (env.mode != "local" && env.mode != "qa") {
            return dbconfig.collection_platform.find().then(
                platformArr => {
                    var sendObj = [];
                    if (platformArr && platformArr.length > 0) {
                        for (var i in platformArr) {
                            var obj = {
                                platformId: platformArr[i].platformId,
                                name: platformArr[i].name,
                                code: platformArr[i].code,
                                description: platformArr[i].description || ""
                            }
                            sendObj.push(obj)
                        }
                        return externalUtil.request(cpmsAPI.player_syncPlatforms({platforms: sendObj}));
                    }
                }
            )
        }
    },

    /**
     * check if username is exist in platform
     * @param platformId
     * @param userName
     */
    isPlatformUserExist: function (platformId, userName) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({platform: platformData._id, name: userName});
                }
                else {
                    return Q.reject({name: "DBError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                return playerData ? true : false;
            }
        );
    },

    /**
     * get platform players that are valid for consumption incentive reward
     * @param platformId
     */
    getConsumptionIncentivePlayer: function (platformId) {
        var platformProm = dbconfig.collection_platform.findOne({platformId: platformId});
        var rewardProm = dbconfig.collection_rewardType.findOne({name: constRewardType.PLAYER_CONSUMPTION_INCENTIVE});
        var eventsData = [];
        //get yesterday time frame
        var yerTime = dbUtility.getYesterdaySGTime();
        var levelMinTopUpRecordAmount = {};
        var platform = {};
        return Q.all([platformProm, rewardProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    platform = data[0];
                    //check consumption incentive reward event on this platform
                    return dbconfig.collection_rewardEvent.find({platform: data[0]._id, type: data[1]._id});
                }
                else {
                    return Q.reject({name: "DBError", message: "Can not find platform"});
                }
            }
        ).then(
            events => {
                if (events && events.length > 0) {
                    eventsData = events;
                    var minTopUpAmount = null;
                    //find mini top up record amount in all reward events
                    for (var i = 0; i < events.length; i++) {
                        for (var level in events[i].param.reward) {
                            if (minTopUpAmount == null || events[i].param.reward[level].minTopUpRecordAmount < minTopUpAmount) {
                                minTopUpAmount = events[i].param.reward[level].minTopUpRecordAmount;
                            }
                            if (levelMinTopUpRecordAmount[level] == null || events[i].param.reward[level].minTopUpRecordAmount < levelMinTopUpRecordAmount[level]) {
                                levelMinTopUpRecordAmount[level] = events[i].param.reward[level].minTopUpRecordAmount;
                            }
                        }
                    }
                    //find all top up players
                    return dbconfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                platformId: platform._id,
                                amount: {$gte: minTopUpAmount},
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
                    ).then(
                        players => {
                            if (players && players.length > 0) {
                                var proms = [];
                                for (var i = 0; i < players.length; i++) {
                                    var playerProm = dbPlatform.checkConsumptionIncentivePlayer(players[i]._id.playerId, yerTime, levelMinTopUpRecordAmount, eventsData._id);
                                    proms.push(playerProm);
                                }
                                return Q.all(proms).then(
                                    names => {
                                        return names.map(name => name);
                                    }
                                );
                            }
                            else {
                                return [];
                            }
                        }
                    );
                }
                else {
                    return [];
                }
            }
        );
    },

    /**
     * check if player is valid for consumption incentive reward
     * @param playerId
     * @param yerTime
     * @param minAmountPerLevel
     */
    checkConsumptionIncentivePlayer: function (playerId, yerTime, minAmountPerLevel, eventObjId) {
        return dbconfig.collection_players.findOne({_id: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().then(
                playerData => {
                    let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(playerData, eventObjId);

                    if (playerData && playerData.playerLevel && playerData.permission && !playerData.permission.banReward && !playerIsForbiddenForThisReward) {
                        var minAmount = minAmountPerLevel[playerData.playerLevel.value];
                        return dbconfig.collection_playerTopUpRecord.aggregate(
                            {
                                $match: {
                                    platformId: playerData.platform,
                                    amount: {$gte: minAmount},
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
                        ).then(
                            topUpData => {
                                if (topUpData && topUpData[0]) {
                                    return playerData.name;
                                }
                            }
                        )
                    }
                }
            );
    },

    startCalculatePlayerConsumptionIncentive: (platformId) => {
        //get platform consecutive top up reward event data and rule data
        return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSUMPTION_INCENTIVE).then(
            function (eventData) {

                if (eventData && eventData.param && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    return dbPlatform.calculatePlatformPlayerConsumptionIncentive(platformId, eventData, eventData.executeProposal);
                }
                else {
                    //platform doesn't have this reward event
                    return Q.resolve(false);
                }
            }
        );
    },

    /**
     * calculate platform player consumption incentive reward
     * @param platformId
     * @param event
     * @param proposalTypeId
     */
    calculatePlatformPlayerConsumptionIncentive: function (platformId, event, proposalTypeId) {
        //get yesterday time frame
        let yerTime = dbUtility.getYesterdaySGTime();
        let minTopUpAmount = null;

        // get the minimum amount to filter out top up records for platform
        for (let level in event.param.reward) {
            if (event.param.reward.hasOwnProperty(level)) {
                if (minTopUpAmount == null || event.param.reward[level].minTopUpRecordAmount < minTopUpAmount) {
                    minTopUpAmount = event.param.reward[level].minTopUpRecordAmount;
                }
            }
        }

        let stream = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: platformId,
                    amount: {$gte: minTopUpAmount},
                    createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime},
                    $or: [{bDirty: false}, {
                        bDirty: true,
                        usedType: constRewardType.PLAYER_TOP_UP_RETURN
                    }]
                }
            },
            {
                $group: {_id: '$playerId'}
            }
        ).cursor({batchSize: 10000}).allowDiskUse(true).exec();

        let balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            return balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "calculatePlatformConsumptionIncentiveForPlayers", {
                            platformId: platformId,
                            eventData: event,
                            proposalTypeId: proposalTypeId,
                            startTime: yerTime.startTime,
                            endTime: yerTime.endTime,
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            })
                        });
                    }
                }
            );
        });
    },

    /**
     * calculate multiple player consumption incentive reward
     * @param playerObjIds
     * @param eventData
     * @param proposalTypeId
     * @param startTime
     * @param endTime
     */
    calculatePlayersConsumptionIncentive: function (playerObjIds, eventData, proposalTypeId, startTime, endTime) {
        let proms = [];
        for (let i = 0; i < playerObjIds.length; i++) {
            proms.push(
                dbPlatform.calculatePlayerConsumptionIncentive(playerObjIds[i], eventData, proposalTypeId, startTime, endTime).then(
                    data => data,
                    error => {
                        errorUtils.reportError(error);
                        return error;
                    }
                )
            );
        }
        return Q.all(proms)
    },

    /**
     * calculate single player consumption incentive reward
     * @param playerObjId
     * @param eventData
     * @param proposalTypeId
     * @param startTime
     * @param endTime
     */
    calculatePlayerConsumptionIncentive: function (playerObjId, eventData, proposalTypeId, startTime, endTime) {
        let platformId = null;
        let player = {};
        let eventParam = {};
        let eventParams = [];
        //get yesterday time frame
        let yerTime = {startTime: new Date(startTime), endTime: new Date(endTime)};
        let playerTopUpAmount = 0;
        let event = {};
        let playerProm = dbconfig.collection_players.findOne({_id: playerObjId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();

        return playerProm.then(
            data => {
                if (data && data.permission && !data.permission.banReward) {
                    //get player's platform reward event data
                    if (data && data.playerLevel) {
                        player = data;
                        return dbPlayerInfo.applyConsumptionIncentive("", data.playerId, eventData.code);
                    }
                }
            }
        )
    },

    /**
     * calculate platform player consumption incentive reward
     * @param platformId
     * @param event
     * @param proposalTypeId
     */
    startPlayerConsecutiveConsumptionSettlement: function (platformId) {
        let yerTime = dbUtility.getYesterdayConsumptionReturnSGTime();
        let minConsumptionAmount = null;
        let allowedProviders;

        //get platform consecutive consumption reward event data and rule data
        return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSECUTIVE_CONSUMPTION_REWARD).then(
            eventData => {
                if (eventData && eventData.param && eventData.executeProposal) {
                    // get minimum amount of consumption records to get to reduce query cost
                    if (eventData.param.reward && eventData.param.reward.length > 0) {
                        // Make sure the reward index is in correct order
                        eventData.param.reward.sort((a, b) => a.index - b.index);
                        minConsumptionAmount = eventData.param.reward[0].minConsumptionAmount;
                        allowedProviders = eventData.param.providers.map(providerObjId => ObjectId(providerObjId));
                    }

                    let stream = dbconfig.collection_playerConsumptionRecord.aggregate(
                        {
                            $match: {
                                platformId: platformId,
                                createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime},
                                providerId: {$in: allowedProviders}
                            }
                        },
                        {
                            $group: {
                                _id: '$playerId',
                                amount: {$sum: '$amount'}
                            }
                        }
                    ).cursor({batchSize: 10000}).allowDiskUse(true).exec();

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(function () {
                        return balancer.processStream(
                            {
                                stream: stream,
                                batchSize: constSystemParam.BATCH_SIZE,
                                makeRequest: function (recSummary, request) {
                                    request("player", "calculatePlatformConsecutiveConsumptionForPlayers", {
                                        recSummary: recSummary,
                                        eventData: eventData
                                    });
                                }
                            }
                        );
                    });
                }
                else {
                    //platform doesn't have this reward event
                    return Q.resolve(false);
                }
            }
        );
    },

    calculatePlatformConsecutiveConsumptionForPlayers:
        (recSummary, eventData) => {
            if (recSummary && recSummary.length > 0) {
                return Promise.all(recSummary.map(summ => dbPlayerReward.applyConsecutiveConsumptionReward(summ._id, summ.amount, eventData)));
            }
        },

    getPlatformConsumptionReturnDetail: function (platformObjId, period) {
        var settleTime = dbUtility.getYesterdayConsumptionReturnSGTime();
        var res = [];
        return dbRewardEvent.getPlatformRewardEventsWithTypeName(platformObjId, constRewardType.PLAYER_CONSUMPTION_RETURN).then(
            eventData => {
                if (eventData && eventData[0]) {
                    //if reward event period doesn't match settlement period, return empty data
                    if (eventData[0].settlementPeriod != period) {
                        return res;
                    }
                    var query = dbconfig.collection_playerConsumptionSummary.aggregate(
                        [
                            {
                                $match: {
                                    platformId: platformObjId,
                                    bDirty: false
                                }
                            },
                            {
                                $group: {_id: '$playerId'}
                            }
                        ]
                    );

                    var stream = query.cursor({batchSize: 1000}).allowDiskUse(true).exec();
                    var balancer = new SettlementBalancer();
                    return balancer.initConns().then(function () {
                        return Q(
                            balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: constSystemParam.BATCH_SIZE,
                                    makeRequest: function (playerIdObjs, request) {
                                        request("player", "getPlatformWeeklyConsumptionReturnInfoForPlayers", {
                                            platformId: platformObjId,
                                            eventData: eventData[0],
                                            startTime: settleTime.startTime,
                                            endTime: settleTime.endTime,
                                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                                return playerIdObj._id;
                                            })
                                        });
                                    },
                                    processResponse: function (record) {
                                        res = res.concat(record.data);
                                    }
                                }
                            )
                        );
                    }).then(
                        data => {
                            return res;
                        }
                    );
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Can not find platform consumption return reward event",
                    });
                }
            }
        );
    },

    checkPlayerLevelDownForPlatform: function (platformObjId) {
        // const todayIsWeeklySettlementDay = dbUtility.getYesterdaySGTime().endTime.getTime() === dbUtility.getLastWeekSGTime().endTime.getTime();
        // const canCheckWeeklyConditions = todayIsWeeklySettlementDay;
        const checkPeriod = constPlayerLevelPeriod.DAY;

        // It is pointless to check PlayerLevel for players already on the lowest (base) level
        const basePlayerLevelProm = dbconfig.collection_playerLevel.findOne({
            platform: platformObjId,
            value: 0
        }).lean();

        return basePlayerLevelProm.then(
            basePlayerLevel => {
                var stream = dbconfig.collection_players.find(
                    {
                        platform: platformObjId,
                        playerLevel: {$ne: basePlayerLevel}
                    }
                ).cursor({batchSize: 1000});

                var balancer = new SettlementBalancer();
                return balancer.initConns().then(function () {
                    return Q(
                        balancer.processStream(
                            {
                                stream: stream,
                                batchSize: 100,
                                makeRequest: function (playerIdObjs, request) {
                                    request("player", "checkPlayerLevelDownForPlayers", {
                                        playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                            return playerIdObj._id;
                                        }),
                                        checkPeriod: checkPeriod,
                                        platformId: platformObjId,
                                    });
                                }
                            }
                        )
                    );
                });
            }
        );
    },

    checkPlayerLevelDownForPlayers: function (playerObjIds, checkPeriod, platformObjId) {
        // Grab all the relevant players records in one go
        const playersProm = dbconfig.collection_players.find({
            _id: {$in: playerObjIds}
        }).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).lean().exec();

        // Grab all levels for this platform
        const levelsProm = dbconfig.collection_playerLevel.find({
            platform: platformObjId
        }).sort({value: 1}).lean().exec();

        return Q.all([playersProm, levelsProm]).spread(
            function (players, playerLevels) {
                const proms = players.map(
                    player => dbPlayerInfo.checkPlayerLevelDownWithLevels(player, playerLevels, checkPeriod).catch(errorUtils.reportError)
                );
                return Q.all(proms);
            }
        );
    },

    getWeeklySettlementTimeForPlatformId: function (platformId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            function (platformData) {
                if (platformData) {
                    return dbUtility.getWeeklySettlementTimeForPlatform(platformData);
                } else {
                    return Q.reject(Error("No platform exists with id: " + platformId));
                }
            }
        );
    },

    searchMailLog: function (data) {
        var query = Object.assign({}, data);
        delete query.startTime;
        delete query.endTime;
        addOptionalTimeLimitsToQuery(data, query, 'createTime');
        //console.log("query:", query);
        return dbconfig.collection_playerMail.find(query).sort({createTime: -1}).limit(100);
    },

    pushNotification: function (data) {
        var appKey = data.appKey;
        var masterKey = data.masterKey;
        var tittle = data.tittle;
        var text = data.text;
        var JPush = require("jpush-sdk");
        var client = JPush.buildClient(appKey, masterKey);

        client.push().setPlatform(JPush.ALL)
            .setAudience(JPush.ALL)
            // .setNotification(text, JPush.ios('ios alert', 'happy', 5))
            .setNotification(text, JPush.ios(text), JPush.android(text, tittle, 1))
            .setMessage('msg content')
            .setOptions(null, 86400, null, true, null)
            .send(function (err, res) {
                if (err) {
                    console.log(err.message);
                    return err;
                } else {
                    console.log('Sendno: ' + res.sendno);
                    console.log('Msg_id: ' + res.msg_id);
                    console.log('res: ' + JSON.stringify(res));
                    return res;
                }
            });
    },

    sendSMS: function (adminObjId, adminName, data) {
        var collect = '', query = {};
        if (data && data.playerId) {
            collect = "collection_players";
            query = {playerId: data.playerId};
        } else if (data && data.partnerId) {
            collect = "collection_partner";
            query = {partnerId: data.partnerId};
        } else {
            return Q.reject(Error("Please indicate sms type"));
        }
        return dbconfig[collect].findOne(query).then(
            playerData => {
                if (!playerData || !playerData.phoneNumber) {
                    // return Q.reject(Error("Error when finding phone number"));
                    return Q.reject({message: "Error when finding phone number", data: data});
                }

                if (playerData.permission && playerData.permission.SMSFeedBack === false) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        errorMessage: "Player does not have this permission"
                    });
                }

                if (playerData.phoneNumber && playerData.phoneNumber.length > 20) {
                    try {
                        playerData.phoneNumber = rsaCrypto.decrypt(playerData.phoneNumber);
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                var sendObj = {
                    tel: playerData.phoneNumber,
                    channel: data.channel,
                    platformId: data.platformId,
                    message: data.message,
                    delay: data.delay
                };
                var recipientName = playerData.name || playerData.partnerName;
                return smsAPI.sending_sendMessage(sendObj).then(
                    retData => {
                        dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, playerData.platform, 'success');
                        return retData;
                    },
                    retErr => {
                        dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, playerData.platform, 'failure', retErr);
                        return Q.reject({message: retErr, data: data});
                    }
                );
            }
        );
    },

    sendNewPlayerSMS: function (adminObjId, adminName, data) {

        var sendObj = {
            tel: data.hasPhone,
            channel: data.channel,
            platformId: data.platformId,
            message: data.message,
            delay: data.delay
        };
        var recipientName = data.name || '';
        return smsAPI.sending_sendMessage(sendObj).then(
            retData => {
                dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platform, 'success');
                return retData;
            },
            retErr => {
                dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platform, 'failure', retErr);
                return Q.reject({message: retErr, data: data});
            }
        );

    },

    searchSMSLog: function (data, index, limit) {
        if (data && (data.playerId || data.partnerId)) {
            index = index || 0;
            limit = limit || constSystemParam.MAX_RECORD_NUM;
            var query = {
                status: data.status === 'all' ? undefined : data.status,
                playerId: data.playerId || undefined,
                partnerId: data.partnerId || undefined,
                type: {$nin: ["registration"]}
            };
            if (data.isAdmin && !data.isSystem) {
                query.adminName = {$exists: true, $ne: null};
            } else if (data.isSystem && !data.isAdmin) {
                query.adminName = {$eq: null};
            }

            // Strip any fields which have value `undefined`
            query = JSON.parse(JSON.stringify(query));
            addOptionalTimeLimitsToQuery(data, query, 'createTime');
            var a = dbconfig.collection_smsLog.find(query).sort({createTime: -1}).skip(index).limit(limit);
            var b = dbconfig.collection_smsLog.find(query).count();
            return Q.all([a, b]).then(
                result => {
                    return {data: result[0], size: result[1]};
                }
            )
        }
    },
    vertificationSMS: function (data, index, limit) {
        var sortCol = data.sortCol || {createTime: -1};
        index = index || 0;
        limit = limit || constSystemParam.MAX_RECORD_NUM;
        let smsVerificationExpireField = "smsVerificationExpireTime"; //to determine whether check player or partner sms expired time
        let fieldOption = {smsVerificationExpireTime: 1};
        let partnerInputDevice =  [
            constPlayerRegistrationInterface.APP_AGENT,
            constPlayerRegistrationInterface.H5_AGENT,
            constPlayerRegistrationInterface.WEB_AGENT
        ];

        if (data.inputDevice && partnerInputDevice.indexOf(Number(data.inputDevice)) >= 0) {
            smsVerificationExpireField = "partnerSmsVerificationExpireTime";
            fieldOption = {partnerSmsVerificationExpireTime: 1};
        }

        if (data.tel == '') {
            delete data.tel;
        }
        var query = {
            type: data.type,
            status: data.status === 'all' ? undefined : data.status,
            playerId: data.playerId || undefined,
            partnerId: data.partnerId || undefined,
            createTime: {
                '$gte': data.startTime,
                '$lte': data.endTime
            },
            tel: data.tel || undefined
        };

        data.recipientName ? query.recipientName = data.recipientName : "";
        data.inputDevice ? query.inputDevice = data.inputDevice : "";
        data.purpose ? query.purpose = data.purpose : "";
        data.platformObjId ? query.platform = data.platformObjId : "";
        data.accountStatus ? query.phoneStatus = data.accountStatus : "";

        // Strip any fields which have value `undefined`
        query = JSON.parse(JSON.stringify(query));
        addOptionalTimeLimitsToQuery(data, query, 'createTime');
        let smsLogCount = 0;
        var a = dbconfig.collection_smsLog.find(query).sort(sortCol).skip(index).limit(limit);
        var b = dbconfig.collection_smsLog.find(query).count();
        let platformProm = dbconfig.collection_platform.findOne({_id: data.platformObjId}, fieldOption).lean();
        return Q.all([a, b, platformProm]).then(
            result => {
                smsLogCount = result[1];

                let smsVerificationExpireTime = result[2] && result[2][smsVerificationExpireField] ? result[2][smsVerificationExpireField] : 5;

                return dbPlatform.getSMSRepeatCount(result[0], smsVerificationExpireTime);
            }
        ).then(
            smsLogsWithCount => {
                if (smsLogsWithCount.length > 0) {
                    let promises =  smsLogsWithCount.map(function (sms) {
                        if (sms.tel) {
                            //check phone number with real player
                            return dbPlatform.checkPhoneNumWithRealPlayer(sms.tel, data.platformObjId, sms).then(
                                smsTel => {
                                    sms.tel = smsTel;
                                    return sms;
                                }
                            );
                        } else {
                            return sms;
                        }
                    });
                    return Q.all(promises);
                }
                return smsLogsWithCount;
            }
        ).then(
            (smsLogsWithCount) => {
                // filter based on Demo Player Account Status: All, Created, Not Created
                // if (data.purpose && data.accountStatus && data.purpose === 'demoPlayer' && data.accountStatus === '') {
                //     console.log('ALL===');
                //     return {
                //         data: smsLogsWithCount,
                //         size: smsLogCount
                //     };
                // } else if (data.purpose && data.accountStatus && data.purpose === 'demoPlayer' && data.accountStatus === 1) {
                //     console.log('CREATED===');
                //     let smsResult = smsLogsWithCount.filter(sms => sms.tel.indexOf('******') > -1);
                //     smsLogCount = smsResult.length;
                //     return {
                //         data: smsResult,
                //         size: smsLogCount
                //     };
                // } else if (data.purpose && data.accountStatus && data.purpose === 'demoPlayer' && data.accountStatus === 2) {
                //     console.log('NOT_CREATED===');
                //     let smsResult = smsLogsWithCount.filter(sms => sms.tel.indexOf('******') === -1);
                //     smsLogCount = smsResult.length;
                //     return {
                //         data: smsResult,
                //         size: smsLogCount
                //     };
                // }

                return {
                    data: smsLogsWithCount,
                    size: smsLogCount
                };
            }
        )
    },

    checkPhoneNumWithRealPlayer: (phone, platformObjId, sms) => {
        let encryptPhone = rsaCrypto.encrypt(phone);

        return dbconfig.collection_players.find(
            {
                phoneNumber: encryptPhone,
                platform: platformObjId,
                isRealPlayer: true // only compare with real player
            }
        ).count().then(
            count => {
                if (count > 0) {
                    // if phone number already exist in real player, update phone status to 1
                    dbconfig.collection_smsLog.findOneAndUpdate(
                        {
                            _id: sms._id
                        },
                        {
                            phoneStatus: 1
                            // $unset: {phoneStatus: ''}
                        }
                    ).exec();

                    //got matching phone number in db, thus need encode
                    sms.tel = dbUtility.encodePhoneNum(sms.tel);
                    return sms.tel;
                } else {
                    // if phone number did not exist in real player, update phone status to 2
                    dbconfig.collection_smsLog.findOneAndUpdate(
                        {
                            _id: sms._id
                        },
                        {
                            phoneStatus: 2
                            // $unset: {phoneStatus: ''}
                        }
                    ).exec();
                    //no match found, return without encode
                    return sms.tel;
                }
            }
        );
    },

    getSMSRepeatCount: (smsLogs, smsVerificationExpireTime) => {
        let smsVerificationExpireDate = new Date();
        smsVerificationExpireDate = smsVerificationExpireDate.setMinutes(smsVerificationExpireDate.getMinutes() - smsVerificationExpireTime);

        if (!(smsLogs && smsLogs.length)) return [];

        let logProms = [];

        for (let i = 0, logLen = smsLogs.length; i < logLen; i++) {
            let log = JSON.parse(JSON.stringify(smsLogs[i]));
            logProms.push(insertLogCount(log));
        }

        return Promise.all(logProms);

        function insertLogCount(log) {
            let tel = log.tel;
            let purpose = log.purpose;
            let isUsed = log.used;

            let lastUsedProm = dbconfig.collection_smsLog.find({
                tel,
                purpose,
                used: true,
                createTime: {$lt: log.createTime}
            }, {createTime: 1}).sort({createTime: -1}).limit(1).lean();
            let nextUsedProm = Promise.resolve(log);

            if (!isUsed) {
                nextUsedProm = dbconfig.collection_smsLog.find({
                    tel,
                    purpose,
                    used: true,
                    createTime: {$gt: log.createTime}
                }, {createTime: 1}).sort({createTime: 1}).limit(1).lean();
            }

            return Promise.all([lastUsedProm, nextUsedProm]).then(
                data => {
                    let lastUsedTime;
                    let nextUsedTime;
                    if (data && data[0] && data[0][0]) lastUsedTime = data[0][0].createTime;
                    if (!isUsed && data && data[1] && data[1][0]) nextUsedTime = data[1][0].createTime;

                    let currentCountMatch = {tel, purpose, createTime: {$lte: log.createTime}};

                    if (lastUsedTime) currentCountMatch.createTime.$gt = lastUsedTime;

                    let currentCountProm = dbconfig.collection_smsLog.find(currentCountMatch).count();

                    let totalCountProm;

                    if (isUsed)
                        totalCountProm = Promise.resolve(0);
                    else {
                        let totalCountMatch = {tel, purpose};
                        if (lastUsedTime) {
                            if (!totalCountMatch.createTime) totalCountMatch.createTime = {};
                            totalCountMatch.createTime.$gt = lastUsedTime;
                        }
                        if (nextUsedTime) {
                            if (!totalCountMatch.createTime) totalCountMatch.createTime = {};
                            totalCountMatch.createTime.$lte = nextUsedTime;
                        }
                        totalCountProm = dbconfig.collection_smsLog.find(totalCountMatch).count();
                    }

                    let nextSMSCountProm;
                    let createTime = Date.parse(log.createTime);

                    if (isUsed)
                        nextSMSCountProm = Promise.resolve(-1);
                    else if (nextUsedTime || createTime < smsVerificationExpireDate || log.invalidated)
                        nextSMSCountProm = Promise.resolve(1);
                    else
                        nextSMSCountProm = dbconfig.collection_smsLog.find({
                            tel,
                            createTime: {$gt: log.createTime}
                        }).limit(1).count(true);

                    return Promise.all([currentCountProm, totalCountProm, nextSMSCountProm]);
                }
            ).then(
                countData => {
                    let currentCount = countData[0];
                    let totalCount = countData[1];
                    let nextSMSExistance = countData[2];

                    currentCount = currentCount || 1;
                    totalCount = totalCount || currentCount;
                    nextSMSExistance = nextSMSExistance > 1 ? 1 : nextSMSExistance;

                    log.currentCount$ = currentCount;
                    log.totalCount$ = totalCount;
                    log.validationStatus$ = nextSMSExistance; // -1 = Used, 0 = Available, 1 = Unavailable

                    return log;
                }
            )
        }
    },
    getPagedPlatformCreditTransferLog: function (playerName, startTime, endTime, provider, type, index, limit, sortCol, status, platformObjId) {
        let queryObject = {};
        sortCol = sortCol || {createTime: -1};
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        let time0 = startTime ? new Date(startTime) : new Date(0);
        let time1 = endTime ? new Date(endTime) : new Date();
        queryObject.createTime = {$gte: time0, $lt: time1};
        queryObject.platformObjId = platformObjId;
        playerName ? queryObject.playerName = playerName : '';

        if (status) {
            queryObject.status = status;
        }
        type ? queryObject.type = new RegExp(["^", type, "$"].join(""), "i") : '';
        provider ? queryObject.providerId = provider : '';

        let countProm = dbconfig.collection_playerCreditTransferLog.find(queryObject).count();
        let recordProm = dbconfig.collection_playerCreditTransferLog.find(queryObject).sort(sortCol).skip(index).limit(limit);
        return Q.all([countProm, recordProm]).then(data => {
            return {total: data[0], data: data[1]};
        })
    },

    updateAutoApprovalConfig: function (query, updateData) {
        console.log("updateAutoApprovalConfig platform update:", updateData);

        return dbconfig.collection_platform.findOneAndUpdate(query, updateData, {new: true});
    },
    generateObjectId: function () {
        return new ObjectId();
    },

    //Player Advertisement
    getPlayerAdvertisementList: function (platformId, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    if (inputDevice) {
                        return dbconfig.collection_playerPageAdvertisementInfo.find({
                            platformId: platformObj._id,
                            inputDevice: inputDevice
                        }).lean();
                    }
                    else {
                        return Q.reject({name: "DBError", message: "Invalid input device"});
                    }
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );

    },

    getSelectedAdvList: function (platformId, id, subject) {
        if (id) {
            if (subject == 'player') {
                return dbconfig.collection_playerPageAdvertisementInfo.findOne({
                    platformId: platformId,
                    _id: id
                }).lean();
            }
            else if (subject == 'partner') {
                return dbconfig.collection_partnerPageAdvertisementInfo.findOne({
                    platformId: platformId,
                    _id: id
                }).lean();
            }
            else {
            }
        }
        else {
            return Q.reject(Error("Id is NULL"));
        }

    },

    createNewPlayerAdvertisementRecord: function (platformId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    if (advertisementCode) {
                        return dbconfig.collection_playerPageAdvertisementInfo.findOne({
                            platformId: platformId,
                            advertisementCode: advertisementCode
                        })
                    } else {
                        return Q.reject({name: "DBError", message: "Advertisement code not valid"});
                    }

                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        ).then(
            existingAdvertisementCodeData => {
                if (existingAdvertisementCodeData) {
                    return Q.reject({name: "DBError", message: "Advertisement code already exists."});
                } else {
                    let newRecordData = {
                        platformId: platformId,
                        orderNo: orderNo,
                        advertisementCode: advertisementCode,
                        title: title,
                        backgroundBannerImage: backgroundBannerImage,
                        imageButton: imageButton,
                        inputDevice: inputDevice,
                        status: 1
                    }
                    let advertistmentRecord = new dbconfig.collection_playerPageAdvertisementInfo(newRecordData);
                    return advertistmentRecord.save();
                }
            }
        );
    },

    deleteAdvertisementRecord: function (platformId, advertisementId) {
        return dbconfig.collection_playerPageAdvertisementInfo.remove({_id: advertisementId, platformId: platformId});
    },

    savePlayerAdvertisementRecordChanges: function (platformId, advertisementId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice) {

        let query = {
            platformId: platformId,
            _id: advertisementId
        }

        let updateData = {
            orderNo: orderNo,
            advertisementCode: advertisementCode,
            title: title,
            backgroundBannerImage: backgroundBannerImage,
            imageButton: imageButton,
            inputDevice: inputDevice
        }
        return dbconfig.collection_playerPageAdvertisementInfo.findOneAndUpdate(query, updateData).then(
            platformObj => {
                if (platformObj) {
                    return platformObj;
                }
            }
        );
    },

    updateAdvertisementRecord: function (platformId, advertisementId, imageButton, subject) {

        let query = {
            platformId: platformId,
            _id: advertisementId
        };

        let updateData = {
            imageButton: imageButton,
        };

        if (subject == 'player') {
            return dbconfig.collection_playerPageAdvertisementInfo.findOneAndUpdate(query, updateData);
        }
        else if (subject == 'partner') {
            return dbconfig.collection_partnerPageAdvertisementInfo.findOneAndUpdate(query, updateData);
        }
        else {
        }
    },

    changeAdvertisementStatus: function (platformId, advertisementId, status) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        _id: advertisementId,
                        status: status ? status : 0
                    }
                    return dbconfig.collection_playerPageAdvertisementInfo.findOneAndUpdate(query, {status: !status});
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        )
    },

    checkDuplicateOrderNoWithId: function (platformId, orderNo, inputDevice, advertisementId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        orderNo: orderNo,
                        inputDevice: inputDevice,
                        _id: advertisementId
                    }
                    return dbconfig.collection_playerPageAdvertisementInfo.findOne(query).then(
                        data => {
                            if (data) {
                                return null;
                            } else {
                                let queryWithoutId = {
                                    platformId: platformId,
                                    orderNo: orderNo,
                                    inputDevice: inputDevice
                                }
                                return dbconfig.collection_playerPageAdvertisementInfo.findOne(queryWithoutId);
                            }

                        }
                    );
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    checkDuplicateAdCodeWithId: function (platformId, advertisementCode, inputDevice, advertisementId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        advertisementCode: advertisementCode,
                        inputDevice: inputDevice,
                        _id: advertisementId
                    }
                    return dbconfig.collection_playerPageAdvertisementInfo.findOne(query).then(
                        data => {
                            if (data) {
                                return null;
                            } else {
                                let queryWithoutId = {
                                    platformId: platformId,
                                    advertisementCode: advertisementCode,
                                    inputDevice: inputDevice
                                }
                                return dbconfig.collection_playerPageAdvertisementInfo.findOne(queryWithoutId);
                            }

                        }
                    );
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    checkDuplicateOrderNo: function (platformId, orderNo, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        orderNo: orderNo,
                        inputDevice: inputDevice
                    };
                    return dbconfig.collection_playerPageAdvertisementInfo.findOne(query);

                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    checkDuplicateAdCode: function (platformId, advertisementCode, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        advertisementCode: advertisementCode,
                        inputDevice: inputDevice
                    };
                    return dbconfig.collection_playerPageAdvertisementInfo.findOne(query);
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },


    getAdvertisementRecordById: function (platformId, advertisementId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        _id: advertisementId
                    }
                    return dbconfig.collection_playerPageAdvertisementInfo.findOne(query);
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    getNextOrderNo: function (platformId, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        inputDevice: inputDevice
                    }
                    return dbconfig.collection_playerPageAdvertisementInfo.findOne(query).sort({orderNo: -1}).limit(1);
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    //Partner Advertisement
    getPartnerAdvertisementList: function (platformId, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    if (inputDevice) {
                        return dbconfig.collection_partnerPageAdvertisementInfo.find({
                            platformId: platformObj._id,
                            inputDevice: inputDevice
                        }).lean();
                    }
                    else {
                        return Q.reject(Error("Invalid input device"));
                    }
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );

    },
    createNewPartnerAdvertisementRecord: function (platformId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let newRecordData = {
                        platformId: platformId,
                        orderNo: orderNo,
                        advertisementCode: advertisementCode,
                        title: title,
                        backgroundBannerImage: backgroundBannerImage,
                        imageButton: imageButton,
                        inputDevice: inputDevice,
                        status: 1
                    }
                    let advertistmentRecord = new dbconfig.collection_partnerPageAdvertisementInfo(newRecordData);
                    return advertistmentRecord.save();
                    0
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    deletePartnerAdvertisementRecord: function (platformId, advertisementId) {
        return dbconfig.collection_partnerPageAdvertisementInfo.remove({_id: advertisementId, platformId: platformId});
    },

    savePartnerAdvertisementRecordChanges: function (platformId, advertisementId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice) {

        let query = {
            platformId: platformId,
            _id: advertisementId
        }

        let updateData = {
            orderNo: orderNo,
            advertisementCode: advertisementCode,
            title: title,
            backgroundBannerImage: backgroundBannerImage,
            imageButton: imageButton,
            inputDevice: inputDevice
        }
        return dbconfig.collection_partnerPageAdvertisementInfo.findOneAndUpdate(query, updateData).then(
            platformObj => {

                return platformObj;

            }
        );
    },

    changePartnerAdvertisementStatus: function (platformId, advertisementId, status) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        _id: advertisementId,
                        status: status ? status : 0
                    }
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOneAndUpdate(query, {status: !status});
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        )
    },

    checkPartnerDuplicateOrderNoWithId: function (platformId, orderNo, inputDevice, advertisementId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        orderNo: orderNo,
                        inputDevice: inputDevice,
                        _id: advertisementId
                    }
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOne(query).then(
                        data => {
                            if (data) {
                                return null;
                            } else {
                                let queryWithoutId = {
                                    platformId: platformId,
                                    orderNo: orderNo,
                                    inputDevice: inputDevice
                                }
                                return dbconfig.collection_partnerPageAdvertisementInfo.findOne(queryWithoutId);
                            }

                        }
                    );
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    checkPartnerDuplicateAdCodeWithId: function (platformId, advertisementCode, inputDevice, advertisementId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        advertisementCode: advertisementCode,
                        inputDevice: inputDevice,
                        _id: advertisementId
                    }
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOne(query).then(
                        data => {
                            if (data) {
                                return null;
                            } else {
                                let queryWithoutId = {
                                    platformId: platformId,
                                    advertisementCode: advertisementCode,
                                    inputDevice: inputDevice
                                }
                                return dbconfig.collection_partnerPageAdvertisementInfo.findOne(queryWithoutId);
                            }

                        }
                    );
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    checkPartnerDuplicateOrderNo: function (platformId, orderNo, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        orderNo: orderNo,
                        inputDevice: inputDevice
                    };
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOne(query);

                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    checkPartnerDuplicateAdCode: function (platformId, advertisementCode, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        advertisementCode: advertisementCode,
                        inputDevice: inputDevice
                    };
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOne(query);
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },


    getPartnerAdvertisementRecordById: function (platformId, advertisementId) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        _id: advertisementId
                    }
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOne(query);
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    getPartnerNextOrderNo: function (platformId, inputDevice) {
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformObj => {
                if (platformObj) {
                    let query = {
                        platformId: platformId,
                        inputDevice: inputDevice
                    }
                    return dbconfig.collection_partnerPageAdvertisementInfo.findOne(query).sort({orderNo: -1}).limit(1);
                } else {
                    return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                }
            }
        );
    },

    getConfig: function (platformId, inputDevice) {
        if (platformId) {
            let returnedObj = {
                wechatList: [],
                qqList: [],
                telList: [],
                live800: "",
                activityList: []
            };
            return dbconfig.collection_platform.findOne({platformId: platformId}).then(
                data => {
                    if (data) {
                        if (data.csWeixin) {
                            returnedObj.wechatList.push({
                                isImg: 0,
                                value: data.csWeixin
                            }, {
                                isImg: 1,
                                value: data.weixinPhotoUrl ? data.weixinPhotoUrl : ""
                            });
                        }

                        if (data.csQQ) {
                            returnedObj.qqList.push({
                                isImg: 0,
                                value: data.csQQ
                            });
                        }

                        if (data.csPhone) {
                            returnedObj.telList.push({
                                isImg: 0,
                                value: data.csPhone
                            });
                        }

                        if (data.csUrl) {
                            returnedObj.live800 = data.csUrl;
                        }
                        if (data.platformId) {
                            return dbconfig.collection_playerPageAdvertisementInfo.find({
                                platformId: data._id,
                                inputDevice: inputDevice
                            }).sort({orderNo: 1}).lean();
                        }
                    } else {
                        return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                    }
                }
            ).then(
                advertisementInfo => {
                    if (advertisementInfo) {
                        advertisementInfo.map(info => {
                            if(info){
                                let activityListObj = {};
                                if (info.advertisementCode) {
                                    activityListObj.code = info.advertisementCode;
                                }

                                if (info.title && info.title.length > 0) {
                                    activityListObj.title = info.title;
                                }

                                if (info.hasOwnProperty('status')) {
                                    activityListObj.status = info.status;
                                }

                                if (info.backgroundBannerImage && info.backgroundBannerImage.url) {
                                    activityListObj.bannerImg = info.backgroundBannerImage.url;
                                }

                                if (info.imageButton && info.imageButton.length > 0) {
                                    let buttonList = [];
                                    info.imageButton.forEach(b => {
                                        if(b){
                                            let buttonObj = {};
                                            if (b.buttonName) {
                                                buttonObj.btn = b.buttonName;
                                            }
                                            if(b.url){
                                                buttonObj.btnImg = b.url;
                                            }
                                            if (b.hyperLink) {
                                                buttonObj.extString = b.hyperLink;
                                            }
                                            buttonList.push(buttonObj);
                                        }
                                    })
                                    activityListObj.btnList = buttonList;
                                } else {
                                    if (info.backgroundBannerImage && info.backgroundBannerImage.hyperLink) {
                                        activityListObj.extString = info.backgroundBannerImage.hyperLink;
                                    }
                                }

                                returnedObj.activityList.push(activityListObj);
                            }
                        })
                        return returnedObj;
                    }
                }
            );
        } else {
            return Q.reject({name: "DBError", message: "Invalid platformId: " + platformId});
        }
    },

    getLiveStream: function (playerObjId) {
        let url = 'https://www.jblshow.com/livestream/liveurl';
        var deferred = Q.defer();
        request.get(url, {strictSSL: false}, (err, res, body) => {
            if (err) {
                deferred.reject(`Get JBL livestream url failed  ${err}`);
            } else {
                let streamInfo = JSON.parse(res.body);
                let streamResult = {};
                if (streamInfo.content) {
                    streamResult = streamInfo.content;
                }
                if (streamInfo.code) {
                    streamResult.code = streamInfo.code;
                }
                deferred.resolve(streamResult);
            }
        });

        let streamInfoProm = deferred.promise;
        // return deferred.promise;

        let urlTokenProm = playerObjId ? dbPlayerInfo.loginJblShow(playerObjId) : Promise.resolve();

        return Promise.all([streamInfoProm, urlTokenProm]).then(
            data => {
                if (!data) {
                    return;
                }
                let streamResult = data[0] || {};
                let urlDetail = data[1];

                if (urlDetail) {
                    let endString = "?username=" + urlDetail.playerName + "&token=" + urlDetail.token;
                    streamResult.url = urlDetail.url + endString;
                }

                return streamResult;
            }
        );
    },

    playerPhoneChat: function (platform, phone, captcha, random) {
        let url = 'https://www.phoneapichat.com/servlet/TelephoneApplication?phone=' + phone + '&captcha=' + captcha + '&platform=' + platform + '&random=' + random;
        var deferred = Q.defer();
        request.get(url, {credentials: true}, (err, res, body) => {
            if (err) {
                deferred.reject(`phoneapichat request failed  ${err}`);
            } else {
                let streamInfo = JSON.parse(res.body);
                let streamResult = {};
                if (streamInfo.content) {
                    streamResult = streamInfo.content;
                }
                if (streamInfo.code) {
                    streamResult.code = streamInfo.code;
                }
                deferred.resolve(streamResult);
            }
        });

        return deferred.promise;
    },

    /**
     * Update the promoCode setting in Platform
     */
    updatePromoCodeSetting: function (platformObjId, promoCodeStartTime, promoCodeEndTime, promoCodeIsActive) {
        console.log("updatePromoCodeSetting platform update:", {
            promoCodeStartTime: promoCodeStartTime,
            promoCodeEndTime: promoCodeEndTime,
            promoCodeIsActive: promoCodeIsActive
        });

        return dbconfig.collection_platform.findOneAndUpdate({_id: platformObjId},
            {
                promoCodeStartTime: promoCodeStartTime,
                promoCodeEndTime: promoCodeEndTime,
                promoCodeIsActive: promoCodeIsActive
            }, {new: true});
    },

    createClickCountLog: (platformId, device, pageName, buttonName) => {
        let todayTime = dbUtility.getTodaySGTime();

        return dbconfig.collection_platform.findOne({platformId: platformId}, '_id').lean().then(
            platformObj => {
                let clickCountObj = {
                    platform: platformObj._id,
                    startTime: todayTime.startTime,
                    endTime: todayTime.endTime,
                    device: device,
                    pageName: pageName,
                    buttonName: buttonName
                };

                dbconfig.collection_clickCount
                    .update(clickCountObj, {$inc: {count: 1}}, {upsert: true})
                    .exec()
                    .catch(errorUtils.reportError);
            }
        )
    },

    getClickCountDevice: (platformId) => {
        let matchObj = {
            platform: platformId
        };

        return dbconfig.collection_clickCount.distinct("device", matchObj);
    },

    getClickCountPageName: (platformId) => {
        let matchObj = {
            platform: platformId
        };

        return dbconfig.collection_clickCount.distinct("pageName", matchObj);
    },

    getClickCountButtonName: (platformId, device, pageName) => {
        let matchObj = {
            platform: platformId,
            device: device,
            pageName: pageName
        };

        return dbconfig.collection_clickCount.distinct("buttonName", matchObj);
    },

    getClickCountAnalysis: (platformId, startDate, endDate, period, device, pageName) => {
        let buttonGroupProms = [];
        let dayStartTime = startDate;
        let getNextDate;

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                };
                break;
            case 'week':
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                };
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                };
        }

        while (dayStartTime.getTime() < endDate.getTime()) {
            let dayEndTime = getNextDate.call(this, dayStartTime);
            let matchObj = {
                startTime: {$gte: dayStartTime},
                endTime: {$lte: dayEndTime},
                device: device,
                pageName: pageName
            };
            let dayStartTimeStr = dayStartTime.toString();
            if (platformId !== 'all') {
                matchObj.platform = platformId;
            }

            let buttonGroupProm = dbconfig.collection_clickCount.aggregate(
                {$match: matchObj},
                {
                    $group: {
                        _id: {"buttonName": "$buttonName"},
                        total: {$sum: "$count"}
                    }
                }
            ).read("secondaryPreferred").then(
                data => {
                    return {
                        date: new Date(dayStartTimeStr),
                        data: data
                    }
                }
            );

            buttonGroupProms.push(buttonGroupProm);
            dayStartTime = dayEndTime;
        }

        return Promise.all([Promise.all(buttonGroupProms)]).then(
            data => {
                let buttonGroup = [];

                if (data && data[0] instanceof Array) {
                    buttonGroup = data[0];
                }

                return buttonGroup;
            }
        );
    },

    getPlatformPartnerSettLog: (platformObjId, modes) => {
        let promArr = [];

        modes.forEach(mode => {
            promArr.push(
                dbconfig.collection_partnerCommSettLog.findOne({
                    platform: platformObjId,
                    settMode: mode,
                    isSettled: true
                }).sort('-startTime').lean().then(
                    modeLog => {
                        let lastSettDate = "-";
                        let nextSettDate = "-";
                        let nextDate = {};
                        let currentCycle = getPartnerCommNextSettDate(mode, getPartnerCommNextSettDate(mode, new Date()));

                        if (modeLog) {
                            lastSettDate =
                                dbUtility.getLocalTimeString(modeLog.startTime, "YYYY-MM-DD")
                                + " - " +
                                dbUtility.getLocalTimeString(modeLog.endTime.getTime() + 1, "YYYY-MM-DD");

                            nextDate = getPartnerCommNextSettDate(mode, modeLog.endTime.getTime() + 1);

                            if (nextDate && currentCycle && nextDate.startTime.getTime() >= currentCycle.startTime.getTime()) {
                                nextDate = {}
                            }
                        } else {
                            nextDate = getPartnerCommNextSettDate(mode);
                        }

                        if (nextDate && nextDate.endTime) {
                            nextSettDate =
                                dbUtility.getLocalTimeString(nextDate.startTime, "YYYY-MM-DD")
                                + " - " +
                                // Offset for display purpose
                                dbUtility.getLocalTimeString(nextDate.endTime.getTime() + 1, "YYYY-MM-DD")
                        }

                        return {
                            mode: mode,
                            lastSettDate: lastSettDate,
                            nextSettDate: nextSettDate,
                            settStartTime: nextDate.startTime,
                            settEndTime: nextDate.endTime
                        }
                    }
                )
            )
        });

        return Promise.all(promArr);
    },

    generatePartnerCommSettPreview: (platformObjId, settMode, startTime, endTime, isSkip = false, toLatest = false) => {
        if (toLatest) {
            let currentCycle = getPartnerCommNextSettDate(settMode, getPartnerCommNextSettDate(settMode, new Date()));
            currentCycle = getPartnerCommNextSettDate(settMode, currentCycle.startTime.getTime() - 1);
            let previousCycle = getPartnerCommNextSettDate(settMode, currentCycle.startTime.getTime() - 1);

            startTime = previousCycle.startTime;
            endTime = previousCycle.endTime;
        }

        return dbconfig.collection_partnerCommSettLog.update({
            platform: platformObjId,
            settMode: settMode,
            startTime: startTime,
            endTime: endTime
        }, {
            isSettled: isSkip
        }, {
            upsert: true,
            new: true
        });
    },

    getAllPartnerCommSettPreview: (platformObjId) => {
        return dbconfig.collection_partnerCommSettLog.find({
            platform: platformObjId,
            isSettled: false
        }).sort('settMode').lean();
    },

    initSettlePartnerComm: (platformObjId, settMode, startTime, endTime) => {
        let partnersProm = dbconfig.collection_partner.find({
            platform: platformObjId
        }, '_id partnerName realName credits').lean();
        let commConfigProm = dbconfig.collection_partnerCommissionConfig.find({
            platform: platformObjId,
            commissionType: settMode
        }).populate({path: 'provider', model: dbconfig.collection_gameProviderGroup}).lean();
        let commRateProm = dbconfig.collection_partnerCommissionRateConfig.find({
            platform: platformObjId
        }).lean();
        let providerGroupProm = dbconfig.collection_gameProviderGroup.find({
            platform: platformObjId
        }).lean();

        return Promise.all([partnersProm, commConfigProm, commRateProm, providerGroupProm]).then(
            res => {
                if (res && res[0] && res[1] && res[2]) {
                    let partners = res[0];
                    let commConfig = res[1];
                    let rateConfig = res[2];
                    let providerGroup = res[3];

                    let providerDetailPromArr = [];
                    let playerConsumpPromArr = [];

                    partners.forEach(partner => {
                        partner.providerComm = partner.providerComm ? partner.providerComm : [];

                        providerDetailPromArr.push(
                            dbconfig.collection_players.find({
                                platform: platformObjId,
                                partner: partner._id
                            }, '_id name realName').lean().then(
                                players => {
                                    players.forEach(player => {
                                        playerConsumpPromArr.push(
                                            dbconfig.collection_playerConsumptionRecord.aggregate({
                                                $match: {
                                                    platformId: ObjectId(platformObjId),
                                                    playerId: ObjectId(player._id),
                                                    createTime: {$gte: new Date(startTime), $lte: new Date(endTime)}
                                                }
                                            }, {
                                                $group: {
                                                    _id: {
                                                        playerId: "$playerId",
                                                        providerId: "$providerId"
                                                    },
                                                    totalConsumptionBonus: {$sum: '$bonusAmount'},
                                                    totalConsumptionValid: {$sum: '$validAmount'}
                                                }
                                            }).then(
                                                consumptionSumm => {
                                                    if (consumptionSumm && consumptionSumm.length > 0) {
                                                        consumptionSumm.forEach(summ => {
                                                            let playerConsumpObj = {
                                                                bonusAmount: summ.totalConsumptionBonus,
                                                                validAmount: summ.totalConsumptionValid,
                                                                playerName: player.name,
                                                                playerRealName: player.realName
                                                            };

                                                            if (partner.providerComm.some(e => String(e.providerObjId) === String(summ._id.providerId))) {
                                                                let existingProviderComm = partner.providerComm.filter(e => String(e.providerObjId) === String(summ._id.providerId))[0];

                                                                existingProviderComm.players.push(playerConsumpObj);
                                                                existingProviderComm.totalConsumptionBonus += summ.totalConsumptionBonus;
                                                                existingProviderComm.totalConsumptionValid += summ.totalConsumptionValid;
                                                            } else {
                                                                partner.providerComm.push({
                                                                    providerObjId: summ._id.providerId,
                                                                    players: [playerConsumpObj],
                                                                    totalConsumptionBonus: summ.totalConsumptionBonus,
                                                                    totalConsumptionValid: summ.totalConsumptionValid
                                                                })
                                                            }
                                                        });
                                                    }
                                                }
                                            ).then(
                                                () => {
                                                    // Process partner.providerComm

                                                }
                                            )
                                        )
                                    });

                                    return Promise.all(playerConsumpPromArr);
                                }
                            )
                        )
                    });

                    return Promise.all(providerDetailPromArr).then(() => res)
                }

            }
        );
    },
};

function addOptionalTimeLimitsToQuery(data, query, fieldName) {
    var createTimeQuery = {};
    if (!data.startTime && !data.endTime) {
        createTimeQuery = undefined;
    } else {
        if (data.startTime) {
            createTimeQuery.$gte = new Date(data.startTime);
        }
        if (data.endTime) {
            createTimeQuery.$lt = new Date(data.endTime);
        }
    }
    if (createTimeQuery) {
        query[fieldName] = createTimeQuery;
    }
}

function getPartnerCommNextSettDate(settMode, curTime = dbUtility.getFirstDayOfYear()) {
    switch (settMode) {
        case 1:
            return dbUtility.getDayTime(curTime);
        case 2:
        case 5:
            if (curTime && curTime.startTime) {
                curTime = curTime.startTime;
            }
            return dbUtility.getWeekTime(curTime);
        case 3:
            return dbUtility.getBiWeekSGTIme(curTime);
        case 4:
            return dbUtility.getMonthSGTIme(curTime);
    }
}

module.exports = dbPlatform;
