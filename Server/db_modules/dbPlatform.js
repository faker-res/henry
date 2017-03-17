"use strict";

var env = require('../config/env').config();
var dbconfig = require('./../modules/dbproperties');
var constPartnerLevel = require('./../const/constPartnerLevel');
var constPlayerLevel = require('./../const/constPlayerLevel');
var constPlayerTrustLevel = require('./../const/constPlayerTrustLevel');
var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var dbPartnerLevel = require('./../db_modules/dbPartnerLevel');
var dbPlayerLevel = require('./../db_modules/dbPlayerLevel');
var dbPlayerTrustLevel = require('./../db_modules/dbPlayerTrustLevel');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbPlatformGameStatus = require('./../db_modules/dbPlatformGameStatus');
var constPlayerLevelPeriod = require('../const/constPlayerLevelPeriod');
var pmsAPI = require('../externalAPI/pmsAPI');
var cpmsAPI = require('../externalAPI/cpmsAPI');
var smsAPI = require('../externalAPI/smsAPI');
var Q = require("q");
var mongoose = require('mongoose');
var crypto = require('crypto');
var externalUtil = require("../externalAPI/externalUtil.js");
var dbUtility = require('./../modules/dbutility');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var constSystemParam = require('../const/constSystemParam');
var constProposalStatus = require('../const/constProposalStatus');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var rsaCrypto = require("../modules/rsaCrypto");
var dbRewardEvent = require("../db_modules/dbRewardEvent");
const constSettlementPeriod = require("../const/constSettlementPeriod");
var dbLogger = require('./../modules/dbLogger');

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
        platformData._id = randomObjectId();

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
            .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).exec();
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
                    return Q.reject({name: "DataError", message: "Cannot find provider or platform"});
                }
            }
        );
    },

    addOrRenameProviderInPlatformById: function (platformObjId, providerObjId, localProviderNickName, localProviderPrefix) {
        var nickNameUpdatePath = "gameProviderInfo." + providerObjId;
        var nickNameUpdate = {};
        nickNameUpdate[nickNameUpdatePath] = {
            localNickName: localProviderNickName,
            localPrefix: localProviderPrefix
        };

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
        var statusUpdatePath = "gameProviderInfo." + providerObjId;
        var statusUpdate = {};
        statusUpdate[statusUpdatePath] = {
            isEnable: isEnable
        };

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
            .populate({path: "departments", model: dbconfig.collection_department}).then(
            function (data) {
                if (data && data.departments && data.departments.length > 0) {
                    //if root department, show all the platforms
                    //else only show department platform
                    if (data.departments[0].parent) {
                        if (data.departments[0].platforms && data.departments[0].platforms.length > 0) {
                            return dbconfig.collection_platform.find({_id: {$in: data.departments[0].platforms}}).exec();
                        }
                        else {
                            deferred.reject({name: "DataError", message: "No platform available."});
                        }
                    }
                    else {
                        return dbconfig.collection_platform.find().exec();
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
                                bDirty: false
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
                                    var playerProm = dbPlatform.checkConsumptionIncentivePlayer(players[i]._id.playerId, yerTime, levelMinTopUpRecordAmount);
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
    checkConsumptionIncentivePlayer: function (playerId, yerTime, minAmountPerLevel) {
        return dbconfig.collection_players.findOne({_id: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().then(
                playerData => {
                    if (playerData && playerData.playerLevel) {
                        var minAmount = minAmountPerLevel[playerData.playerLevel.value];
                        return dbconfig.collection_playerTopUpRecord.aggregate(
                            {
                                $match: {
                                    platformId: playerData.platform,
                                    amount: {$gte: minAmount},
                                    createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime},
                                    bDirty: false
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

    /**
     * calculate platform player consumption incentive reward
     * @param platformId
     * @param event
     * @param proposalTypeId
     */
    calculatePlatformPlayerConsumptionIncentive: function (platformId, event, proposalTypeId) {
        //get yesterday time frame
        var yerTime = dbUtility.getYesterdaySGTime();
        var minTopUpAmount = null;
        for (var level in event.param.reward) {
            if (minTopUpAmount == null || event.param.reward[level].minTopUpRecordAmount < minTopUpAmount) {
                minTopUpAmount = event.param.reward[level].minTopUpRecordAmount;
            }
        }

        var stream = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: platformId,
                    amount: {$gte: minTopUpAmount},
                    createTime: {$gte: yerTime.startTime, $lt: yerTime.endTime},
                    bDirty: false
                }
            },
            {
                $group: {_id: '$playerId'}
            }
        ).cursor({batchSize: 10000}).allowDiskUse(true).exec();

        var balancer = new SettlementBalancer();
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
        var proms = [];
        for (var i = 0; i < playerObjIds.length; i++) {
            proms.push(dbPlatform.calculatePlayerConsumptionIncentive(playerObjIds[i], eventData, proposalTypeId, startTime, endTime));
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
        var platformId = null;
        var player = {};
        var eventParam = {};
        //get yesterday time frame
        var yerTime = {startTime: new Date(startTime), endTime: new Date(endTime)};
        var playerTopUpAmount = 0;
        var event = {};
        var playerProm = dbconfig.collection_players.findOne({_id: playerObjId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();
        return playerProm.then(
            data => {
                //get player's platform reward event data
                if (data && data.playerLevel) {
                    player = data;
                    platformId = player.platform;
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
                                    bDirty: false
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
                        return Q.reject({name: "DataError", message: "Player is not valid for this reward"});
                    }
                }
                else {
                    return Q.reject({
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
                        name: "DataError",
                        message: "Player does not have enought top up amount"
                    });
                }
            }
        ).then(
            data => {
                if (data) {
                    var validCredit = playerTopUpAmount - data[0] - data[1];
                    if ((validCredit * eventParam.rewardPercentage) >= eventParam.minRewardAmount && data[1] <= eventParam.maxPlayerCredit) {
                        var rewardAmount = Math.min(Math.floor(validCredit * eventParam.rewardPercentage), eventParam.maxRewardAmount);
                        var proposalData = {
                            type: event.executeProposal,
                            creator: {
                                type: 'player',
                                name: player.name,
                                id: player.playerId
                            },
                            data: {
                                playerId: player._id,
                                player: player.playerId,
                                playerName: player.name,
                                platformId: platformId,
                                rewardAmount: rewardAmount,
                                spendingAmount: validCredit * eventParam.spendingTimes,
                                eventName: eventData.name,
                                eventCode: eventData.code
                            }
                        };
                        return dbProposal.createProposalWithTypeId(event.executeProposal, proposalData);
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Can not find player bonus proposal or provider credit"
                    });
                }
            }
        ).catch(
            error => console.log({
                name: "DataError",
                message: "Player is not valid for player consumption incentive reward",
                error: error
            })
        ).then(
            data => {
                return data
            }
        );
    },

    getPlatformConsumptionReturnDetail: function (platformObjId, period) {
        var settleTime = dbUtility.getYesterdaySGTime();
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
                                batchSize: constSystemParam.BATCH_SIZE,
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
                    player => dbPlayerInfo.checkPlayerLevelDownWithLevels(player, playerLevels, checkPeriod)
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

    searchSMSLog: function (data, index, limit) {
        index = index || 0;
        limit = limit || constSystemParam.MAX_RECORD_NUM;
        var query = {
            status: data.status === 'all' ? undefined : data.status,
            playerId: data.playerId || undefined,
            partnerId: data.partnerId || undefined,
        };
        // Strip any fields which have value `undefined`
        query = JSON.parse(JSON.stringify(query));
        addOptionalTimeLimitsToQuery(data, query, 'createTime');
        //console.log("query:", query);
        var a = dbconfig.collection_smsLog.find(query).sort({createTime: -1}).skip(index).limit(limit);
        var b = dbconfig.collection_smsLog.find(query).count();
        return Q.all([a, b]).then(
            result => {
                return {data: result[0], size: result[1]};
            }
        )
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

module.exports = dbPlatform;
