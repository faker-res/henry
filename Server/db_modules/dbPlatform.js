"use strict";

var dbPlatformFunc = function () {
};
module.exports = new dbPlatformFunc();

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
const dbPlayerMail = require("./../db_modules/dbPlayerMail");
const dbPartner = require("./../db_modules/dbPartner");
const qrCode = require('qrcode');
const http = require('http');
const https = require('https');
const localization = require("../modules/localization");
const dbProposal = require('./../db_modules/dbProposal');

// constants
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalUserType = require('../const/constProposalUserType');
const constProviderStatus = require("./../const/constProviderStatus");
const constRewardTaskStatus = require('../const/constRewardTaskStatus');
const constServerCode = require('../const/constServerCode');
const constSettlementPeriod = require("../const/constSettlementPeriod");
const constRewardPointsTaskCategory = require("../const/constRewardPointsTaskCategory");
const constSystemParam = require('../const/constSystemParam');
const errorUtils = require('../modules/errorUtils');
const request = require('request');
const constSMSPurpose = require("../const/constSMSPurpose");
const constPartnerCommissionLogStatus = require("../const/constPartnerCommissionLogStatus");

const Client = require('ftp');
const admZip = require('adm-zip');

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

            // if (platformData.platformId) {
            //     delete platformData.platformId;
            // }
        }

        var platform = new dbconfig.collection_platform(platformData);

        dbconfig.collection_platform.findOne({platformId: platformData.platformId}).then(data => {
            if (data) {
                deferred.reject({name: "DataError", message: "Duplicate Platform ID."});
            } else {
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
            }
        });

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
     * get few basic platform settings
     * @param query
     */
    getBasicPlatformSetting: function (query) {
        return dbconfig.collection_platform.findOne(query, {
            _id: 0,
            platformId: 1,
            name: 1,
            prefix: 1,
            partnerPrefix: 1
        }).lean().then(data => {
            if (data) {
                data.platformName = data.name ? data.name : "";
                data.playerAccountPrefix = data.prefix ? data.prefix : "";
                data.partnerAccountPrefix = data.partnerPrefix ? data.partnerPrefix : "";

                delete data.name;
                delete data.prefix;
                delete data.partnerPrefix;

                return data;
            }
        });
    },

    /**
     * get QR code image from targetUrl
     * @param targetUrl
     */
    turnUrlToQr: function (targetUrl) {
        return new Promise((resolve, reject) => {
            return qrCode.toDataURL(targetUrl, (err, imgCode) => {
                return err ? reject({
                    name: "DBError",
                    message: "Error in getting QR code",
                    error: err
                }) : resolve(imgCode);
            });
        });
    },

    getTemplateSetting: function (platformId, url) {
        let result = [];

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(platformData => {
            if (!platformData) {
                return Promise.reject({
                    name: "DBError",
                    message: "Could not find the platform"
                });
            }

            if (!url) {
                // get back preset template setting
                if (platformData.presetModuleSetting && platformData.presetModuleSetting.length > 0) {

                    result.push({
                        templateId: null, functionList: platformData.presetModuleSetting.filter(p => {
                            return p.displayStatus == 1
                        })
                    });

                }

            } else {
                // get the special template setting
                if (platformData.specialModuleSetting && platformData.specialModuleSetting.length > 0) {

                    let functionList = [];

                    platformData.specialModuleSetting.forEach(module => {

                        if (module.domainName && module.domainName.findIndex(p => p.toLowerCase() == url.trim().toLowerCase()) != -1) {

                            if (module.content && module.content.length > 0) {
                                module.content = module.content.filter(p => {
                                    return p.displayStatus == 1
                                })
                            }
                            result.push({templateId: module._id, functionList: module.content});

                        }
                    })

                }
            }

            return result

        })
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

    getOnePlatformSetting: function (query) {
        return dbconfig.collection_platform.findOne(query).lean()
    },

    getPlatformFeeEstimateSetting: function (platformObjId) {
    platformObjId = ObjectId(platformObjId);
    return dbconfig.collection_platformFeeEstimate.findOne({platform: platformObjId}).lean().then(
        platformFeeData => {
            if (!platformFeeData) {
                return dbconfig.collection_platformFeeEstimate({platform: platformObjId}).save();
            } else {
                return platformFeeData;
            }
        }
    );
},

    updatePlatformFeeEstimateSetting: function (query, updateData) {
        return dbconfig.collection_platformFeeEstimate.findOneAndUpdate(query, updateData, {upsert: true}).lean();
    },

    getLargeWithdrawalSetting: function (platformObjId) {
        platformObjId = ObjectId(platformObjId);
        return dbconfig.collection_largeWithdrawalSetting.findOne({platform: platformObjId}).lean().then(
            largeWithdrawalData => {
                if (!largeWithdrawalData) {
                    return dbconfig.collection_largeWithdrawalSetting({platform: platformObjId}).save();
                } else {
                    return largeWithdrawalData;
                }
            }
        );
    },

    getLargeWithdrawalPartnerSetting: function (platformObjId) {
        platformObjId = ObjectId(platformObjId);
        return dbconfig.collection_largeWithdrawalPartnerSetting.findOne({platform: platformObjId}).lean().then(
            largeWithdrawalData => {
                if (!largeWithdrawalData) {
                    return dbconfig.collection_largeWithdrawalPartnerSetting({platform: platformObjId}).save();
                } else {
                    return largeWithdrawalData;
                }
            }
        );
    },

    updateLargeWithdrawalSetting: function (query, updateData) {
        return dbconfig.collection_largeWithdrawalSetting.findOneAndUpdate(query, updateData, {upsert: true}).lean();
    },

    updateLargeWithdrawalPartnerSetting: function (query, updateData) {
        return dbconfig.collection_largeWithdrawalPartnerSetting.findOneAndUpdate(query, updateData, {upsert: true}).lean();
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
                    // var nickName = localProviderNickName ? localProviderNickName : data[0].nickName;
                    // var prefix = localProviderPrefix ? localProviderPrefix : data[0].prefix;

                    // var providerProm = dbPlatform.addOrRenameProviderInPlatformById(data[1]._id, data[0]._id, nickName, prefix);
                    var providerProm = dbconfig.collection_platform.findOneAndUpdate(
                        {
                            _id: data[1]._id
                        },
                        {
                            $addToSet: {gameProviders: {$each: [data[0]._id]}}
                        }
                    ).lean();
                    var gameProm = dbPlatformGameStatus.addProviderGamesToPlatform(data[0]._id, data[1]._id);

                    return Q.all([providerProm, gameProm]);

                    // return dbPlatformGameStatus.addProviderGamesToPlatform(data[0]._id, data[1]._id);
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
        if (localProviderNickName) {
            nickNameUpdate[nickNameUpdatePath] = localProviderNickName;
        }
        if (localProviderPrefix) {
            nickNameUpdate[prefixUpdatePath] = localProviderPrefix;
        }

        let query = {
            $addToSet: {gameProviders: {$each: [providerObjId]}}
        };

        if (localProviderNickName || localProviderPrefix) {
            query.$set = nickNameUpdate
        }

        console.log("addOrRenameProviderInPlatformById platform update:", {
            $addToSet: {gameProviders: {$each: [providerObjId]}},
            $set: nickNameUpdate
        });

        return dbconfig.collection_platform.findOneAndUpdate(
            {
                _id: platformObjId
            },
            query
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
     * @param sameLineProviders
     */
    syncPlatformProvider: function (platformId, providerIds, sameLineProviders) {
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

                    // Update same line providers
                    if (sameLineProviders && sameLineProviders.length) {
                        sameLineProviders.forEach(providers => {
                            if (providers && providers.length) {
                                providers.forEach(provider => {
                                    let key = "sameLineProviders." + platformId;
                                    let setObj = {};
                                    setObj[key] = providers;

                                    proms.push(
                                        dbconfig.collection_gameProvider.findOneAndUpdate({providerId: provider}, {
                                            $set: setObj
                                        })
                                    )
                                })
                            }
                        })
                    }


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
                    proms.push(dbPlatform.syncPlatformProvider(row.platformId, row.providers, row.sameLineProviders));
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
                        let rootDepartIndex = data.departments.findIndex(d => !d.parent || (d.parent && (d.parent == "" || d.parent == null)));
                        if(rootDepartIndex == -1){
                            let platformProm = [];
                            data.departments.forEach(
                                department => {
                                    if(department && department.platforms && department.platforms.length > 0){
                                        platformProm.push(dbconfig.collection_platform.find({_id: {$in: department.platforms}})
                                            .populate({path: "csDepartment", model: dbconfig.collection_department})
                                            .populate({path: "qiDepartment", model: dbconfig.collection_department}).exec());
                                    }
                                }
                            )

                            return Promise.all(platformProm).then(
                                departmentData => {
                                    let platformList = [];
                                    if(departmentData && departmentData.length > 0){
                                        departmentData.forEach(
                                            department => {
                                                if(department && department.length > 0){
                                                    department.forEach(data => {
                                                        if(data){
                                                            platformList.push(data);
                                                        }
                                                    })
                                                }
                                            }
                                        )
                                    }
                                    platformList = platformList.filter(function (a) {
                                        return !this[a._id] && (this[a._id] = true);
                                    }, Object.create(null));
                                    return platformList;
                                }
                            );
                        }else{
                            return dbconfig.collection_platform.find().populate({
                                path: "csDepartment",
                                model: dbconfig.collection_department
                            }).populate({path: "qiDepartment", model: dbconfig.collection_department}).exec();
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

    // getPlatformByAdminId: function (adminId) {
    //     var deferred = Q.defer();
    //     //find admin department platforms data
    //     dbconfig.collection_admin.findOne({_id: adminId})
    //         .populate({path: "departments", model: dbconfig.collection_department})
    //         .then(
    //             function (data) {
    //                 if (data && data.departments && data.departments.length > 0) {
    //                     //if root department, show all the platforms
    //                     //else only show department platform
    //                     if (data.departments[0].parent) {
    //                         if (data.departments[0].platforms && data.departments[0].platforms.length > 0) {
    //                             console.log("AAAAAAAAAAAAAAAAAAAAAAA",data.departments)
    //                             return dbconfig.collection_platform.find({_id: {$in: data.departments[0].platforms}})
    //                                 .populate({path: "csDepartment", model: dbconfig.collection_department})
    //                                 .populate({path: "qiDepartment", model: dbconfig.collection_department}).exec();
    //                         }
    //                         else {
    //                             deferred.reject({name: "DataError", message: "No platform available."});
    //                         }
    //                     }
    //                     else {
    //                         return dbconfig.collection_platform.find().populate({
    //                             path: "csDepartment",
    //                             model: dbconfig.collection_department
    //                         }).populate({path: "qiDepartment", model: dbconfig.collection_department}).exec();
    //                     }
    //                 }
    //             },
    //             function (error) {
    //                 deferred.reject({name: "DBError", message: "Error finding user.", error: error});
    //             }
    //         ).then(
    //         function (data) {
    //             deferred.resolve(data);
    //         },
    //         function (error) {
    //             deferred.reject({name: "DBError", message: "Error finding platform for user", error: error});
    //         }
    //     );
    //     return deferred.promise;
    // },

    /*
     * reset player top up and consumption amount for level up check
     * @param {Object}  platformObjId
     * @param {Boolean}  bWeek weekly or daily
     */
    resetPlatformPlayerLevelData: function (platformObjId, bWeek) {
        //if daily settlement, and if it is the first day of the month, then reset monthly amount
        var queryOrArray = [{dailyTopUpSum: {$gt: 0}}, {dailyConsumptionSum: {$gt: 0}}, {dailyWithdrawSum: {$gt: 0}}, {dailyBonusAmountSum: {$gt: 0}}, {dailyTopUpIncentiveAmount: {$gt: 0}}];
        var updateData = {
            dailyTopUpSum: 0,
            dailyConsumptionSum: 0,
            dailyWithdrawSum: 0,
            dailyBonusAmountSum: 0,
            dailyTopUpIncentiveAmount: 0
        };
        if (dbUtility.isFirstDayOfMonthSG()) {
            queryOrArray.push({pastMonthTopUpSum: {$gt: 0}});
            queryOrArray.push({pastMonthConsumptionSum: {$gt: 0}});
            queryOrArray.push({pastMonthWithdrawSum: {$gt: 0}});
            queryOrArray.push({pastMonthBonusAmountSum: {$ne: 0}});
            updateData.pastMonthTopUpSum = 0;
            updateData.pastMonthConsumptionSum = 0;
            updateData.pastMonthWithdrawSum = 0;
            updateData.pastMonthBonusAmountSum = 0;
        }
        //if it is the first day of the week, then reset weekly amount
        if (dbUtility.isFirstDayOfWeekSG()) {
            queryOrArray.push({weeklyTopUpSum: {$gt: 0}});
            queryOrArray.push({weeklyConsumptionSum: {$gt: 0}});
            queryOrArray.push({weeklyWithdrawSum: {$gt: 0}});
            queryOrArray.push({weeklyBonusAmountSum: {$ne: 0}});
            updateData.weeklyTopUpSum = 0;
            updateData.weeklyConsumptionSum = 0;
            updateData.weeklyWithdrawSum = 0;
            updateData.weeklyBonusAmountSum = 0;
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

                return dbPlayerMail.isFilteredKeywordExist(data.message, data.platformId, "sms", data.channel).then(
                    exist => {
                        if (exist) {
                            return Promise.reject({errorMessage: "Content consist of sensitive keyword."});
                        }

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
            }
        );
    },

    bulkSendSMS: (adminObjId, adminName, data, playerIds) => {
        let proms = [];
        if (playerIds && playerIds.length) {
            playerIds.map(playerId => {
                let clonedData = Object.assign({}, data);
                clonedData.playerId = playerId;
                let prom = dbPlatform.sendSMS(adminObjId, adminName, clonedData).catch(error => {
                    console.error("Sms failed for playerId:", playerId, "- error:", error);
                    errorUtils.reportError(error);
                    return {playerId, error}
                });

                proms.push(prom);
            });
        }

        return Promise.resolve(proms);
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
        if (data) {
            index = index || 0;
            limit = limit || constSystemParam.MAX_RECORD_NUM;
            var query = {
                status: data.status === 'all' ? undefined : data.status,
                type: {$nin: ["registration"]}
            };
            if (data.isAdmin && !data.isSystem) {
                query.adminName = {$exists: true, $ne: null};
            } else if (data.isSystem && !data.isAdmin) {
                query.adminName = {$eq: null};
            }
            if (data.playerId) {
                query.playerId = data.playerId;
            }
            if (data.partnerId) {
                query.partnerId = data.partnerId;
            }
            if (data.platformId) {
                query.platformId = data.platformId;
            }
            // Strip any fields which have value `undefined`
            query = JSON.parse(JSON.stringify(query));
            addOptionalTimeLimitsToQuery(data, query, 'createTime');
            var a = dbconfig.collection_smsLog.find(query).sort({createTime: -1}).skip(index).limit(limit);
            var b = dbconfig.collection_smsLog.find(query).count();
            return Q.all([a, b]).then(
                result => {
                    if(result[0].length > 0){
                        result[0] = excludeTelNum(result[0]);
                    }
                    return {data: result[0], size: result[1]};
                }
            )
        }
    },
    getExternalUserInfo: function (data, index, limit){
        var sortCol = data.sortCol || {createTime: -1};
        index = index || 0;
        limit = limit || constSystemParam.MAX_RECORD_NUM;

        var query = {
            platformId: data.platformId,
            createTime: {
                '$gte': data.startTime,
                '$lte': data.endTime
            },
        };

        let returnData = {};
        returnData.totalCount = 0;
        returnData.userInfoData = [];

        let a = dbconfig.collection_playerDataFromExternalSource.find(query).sort(sortCol).skip(index).limit(limit);
        let b = dbconfig.collection_playerDataFromExternalSource.find(query).count();

        return Q.all([a, b]).then( result => {
            if (result && result[0] && result[1]){

               returnData.totalCount = result[1];
               returnData.userInfoData = result[0];
            }
            return returnData
        })
    },
    vertificationSMS: function (data, index, limit) {
        var sortCol = data.sortCol || {createTime: -1};
        index = index || 0;
        limit = limit || constSystemParam.MAX_RECORD_NUM;
        let smsVerificationExpireField = "smsVerificationExpireTime"; //to determine whether check player or partner sms expired time
        let fieldOption = {smsVerificationExpireTime: 1};
        let partnerInputDevice = [
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
                    let promises = smsLogsWithCount.map(function (sms) {
                        if (sms.tel) {
                            if (sms.purpose == constSMSPurpose.PARTNER_REGISTRATION || sms.purpose == constSMSPurpose.PARTNER_OLD_PHONE_NUMBER || sms.purpose == constSMSPurpose.PARTNER_NEW_PHONE_NUMBER
                                || sms.purpose == constSMSPurpose.PARTNER_UPDATE_PASSWORD || sms.purpose == constSMSPurpose.PARTNER_UPDATE_BANK_INFO_FIRST || sms.purpose == constSMSPurpose.PARTNER_UPDATE_BANK_INFO) {
                                //check phone number with partner
                                return dbPlatform.checkPhoneNumWithPartner(sms.tel, data.platformObjId, sms).then(
                                    smsTel => {
                                        sms.tel = smsTel;
                                        return sms;
                                    }
                                );
                            } else {
                                //check phone number with real player
                                return dbPlatform.checkPhoneNumWithRealPlayer(sms.tel, data.platformObjId, sms).then(
                                    smsTel => {
                                        sms.tel = smsTel;
                                        return sms;
                                    }
                                );
                            }

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
        let oldEncryptPhone = rsaCrypto.oldEncrypt(phone);

        return dbconfig.collection_players.find(
            {
                phoneNumber: {$in: [encryptPhone, oldEncryptPhone]},
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

    checkPhoneNumWithPartner: (phone, platformObjId, sms) => {
        let encryptPhone = rsaCrypto.encrypt(phone);
        let oldEncryptPhone = rsaCrypto.oldEncrypt(phone);

        return dbconfig.collection_partner.find(
            {
                phoneNumber: {$in: [encryptPhone, oldEncryptPhone]},
                platform: platformObjId,
            }
        ).count().then(
            count => {
                if (count > 0) {
                    // if phone number already exist in partner, update phone status to 1
                    dbconfig.collection_smsLog.findOneAndUpdate(
                        {
                            _id: sms._id
                        },
                        {
                            phoneStatus: 1
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
        let updObj = {$set: updateData};
        return dbconfig.collection_platform.findOneAndUpdate(query, updObj, {new: true});
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

    createNewPlayerAdvertisementRecord: function (platformId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice, showInRealServer) {
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
                        showInRealServer: showInRealServer,
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

    savePlayerAdvertisementRecordChanges: function (platformId, advertisementId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice, showInRealServer) {

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
            inputDevice: inputDevice,
            showInRealServer: showInRealServer
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
    createNewPartnerAdvertisementRecord: function (platformId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice, showInRealServer) {
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
                        showInRealServer: showInRealServer,
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

    savePartnerAdvertisementRecordChanges: function (platformId, advertisementId, orderNo, advertisementCode, title, backgroundBannerImage, imageButton, inputDevice, showInRealServer) {

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
            inputDevice: inputDevice,
            showInRealServer: showInRealServer
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

    getConfig: function (platformId, inputDevice, subject) {
        if (platformId && subject) {

            let returnedObj;
            let listName;
            let platformData;
            let playerLevels = [];
            let themeIdList = [];
            let themeStyleObjId = null;

            if (subject == 'player') {
                returnedObj = {
                    wechatList: [],
                    qqList: [],
                    telList: [],
                    live800: "",
                    activityList: [],
                    platformLogoUrl: [],
                    SkypeList: [],
                    emailList: [],
                    wechatQRUrl: [],
                    displayUrl: [],
                    playerSpreadUrl: [],
                };
                listName = [
                    ['csEmailImageUrlList', 'emailList'],
                    ['csPhoneList', 'telList'],
                    ['csQQList', 'qqList'],
                    ['csUrlList', 'live800'],
                    ['csWeixinList', 'wechatList'],
                    ['csSkypeList', 'SkypeList'],
                    ['csDisplayUrlList', 'displayUrl'],
                    ['playerInvitationUrlList', 'playerSpreadUrl'],
                    ['weixinPhotoUrlList', 'wechatQRUrl'],
                    ['playerWebLogoUrlList', 'platformLogoUrl']
                ];
            }
            else if (subject == 'partner') {
                returnedObj = {
                    partnerEmail: [],
                    partnerCSPhoneNumber: [],
                    partnerCSQQNumber: [],
                    partnerCSWechatNumber: "",
                    partnerActivityList: [],
                    partnerCSWechatQRUrl: [],
                    partnerCSSkypeNumber: [],
                    partnerDisplayUrl: [],
                    partnerPlatformLogoUrl: [],
                    partnerLive800Url: [],
                    partnerSpreadUrl: [],
                };
                listName = [
                    ['csPartnerEmailList', 'partnerEmail'],
                    ['csPartnerPhoneList', 'partnerCSPhoneNumber'],
                    ['csPartnerUrlList', 'partnerLive800Url'],
                    ['csPartnerQQList', 'partnerCSQQNumber'],
                    ['csPartnerWeixinList', 'partnerCSWechatNumber'],
                    ['csPartnerSkypeList', 'partnerCSSkypeNumber'],
                    ['csPartnerDisplayUrlList', 'partnerDisplayUrl'],
                    ['partnerInvitationUrlList', 'partnerSpreadUrl'],
                    ['partnerWeixinPhotoUrlList', 'partnerCSWechatQRUrl'],
                    ['partnerWebLogoUrlList', 'partnerPlatformLogoUrl']
                ];
            }
            else {
                return Q.reject({name: "DBError", message: "Missing of default param: 'partner' or 'player'."});
            }
            return dbconfig.collection_platform.findOne({platformId: platformId}).populate({path: 'partnerThemeSetting.themeStyleId', model: dbconfig.collection_themeSetting}).populate({path: 'playerThemeSetting.themeStyleId', model: dbconfig.collection_themeSetting}).lean().then(
                data => {
                    if (data) {

                        platformData = data;
                        return dbconfig.collection_playerLevel.find({platform: platformData._id}).lean();
                    } else {
                        return Q.reject({name: "DBError", message: "No platform exists with id: " + platformId});
                    }
                }
            ).then(
                playerLevelData => {
                    if (playerLevelData && playerLevelData.length) {
                        playerLevels = playerLevelData;
                    }

                    listName.forEach(list => {
                        if (platformData[list[0]]) {

                            returnedObj[list[1]] = dbPlatform.appendRouteSetting(platformData, list[0], subject);

                        }
                    });

                    if (subject === 'player') {
                        returnedObj.accountMaxLength = platformData.playerNameMaxLength ? platformData.playerNameMaxLength : 0;
                        returnedObj.accountMinLength = platformData.playerNameMinLength ? platformData.playerNameMinLength : 0;
                        returnedObj.passwordMaxLength = platformData.playerPasswordMaxLength ? platformData.playerPasswordMaxLength : 0;
                        returnedObj.passwordMinLength = platformData.playerPasswordMinLength ? platformData.playerPasswordMinLength : 0;
                        returnedObj.accountPrefix = platformData.prefix ? platformData.prefix : "";
                        returnedObj.minDepositAmount = platformData.minTopUpAmount ? platformData.minTopUpAmount : 0;
                        returnedObj.needSMSForTrailAccount = platformData.requireSMSVerificationForDemoPlayer ? 1 : 0;
                        returnedObj.needSMSForRegister = platformData.requireSMSVerification ? 1 : 0;
                        returnedObj.needSMSForModifyPassword = platformData.requireSMSVerificationForPasswordUpdate ? 1 : 0;
                        returnedObj.needSMSForModifyBankInfo = platformData.requireSMSVerificationForPaymentUpdate ? 1 : 0;
                        returnedObj.needImageCodeForLogin = platformData.requireLogInCaptcha ? 1 : 0;
                        returnedObj.needImageCodeForSendSMSCode = platformData.requireCaptchaInSMS ? 1 : 0;
                        returnedObj.twoStepsForModifyPhoneNumber = platformData.usePhoneNumberTwoStepsVerification ? 1 : 0;
                        returnedObj.cdnOrFtpLink = platformData.playerRouteSetting ? platformData.playerRouteSetting : "";
                        // returnedObj.themeStyle = platformData.playerThemeSetting && platformData.playerThemeSetting.themeStyleId && platformData.playerThemeSetting.themeStyleId.themeStyle ? platformData.playerThemeSetting.themeStyleId.themeStyle : "";
                        returnedObj.withdrawFeeNoDecimal = platformData.withdrawalFeeNoDecimal ? 1 : 0;
                        console.log("checking --- yH platformData.playerThemeSetting", platformData.playerThemeSetting)

                        if (platformData.playerThemeSetting && platformData.playerThemeSetting.themeStyleId && platformData.playerThemeSetting.themeIdObjId) {
                            
                            let themeSetting = platformData.playerThemeSetting.themeStyleId;
                            themeStyleObjId = platformData.playerThemeSetting.themeIdObjId;

                            // search for the themeID for player
                            if (themeSetting && themeSetting.themeStyle) {
                                returnedObj.themeStyle = themeSetting.themeStyle;
                                returnedObj.themeID = "";
                                let themeIdObj = [];
                                if (themeSetting.content && themeSetting.content.length && themeStyleObjId) {

                                    for (let i = 0; i < themeSetting.content.length; i++) {
                                        if (themeSetting.content[i]._id && themeSetting.content[i].themeId) {

                                            if (themeSetting.content[i]._id.toString() == themeStyleObjId.toString()) {
                                                returnedObj.themeID = themeSetting.content[i].themeId;
                                            }
                                            themeIdList.push({themeID: themeSetting.content[i].themeId, remark:themeSetting.content[i].remark });
                                        }
                                    }
                                }

                                returnedObj.themeIDList = themeIdList;
                            }

                        }
                    }

                    if (subject === 'partner') {
                        returnedObj.accountMaxLength = platformData.partnerNameMaxLength ? platformData.partnerNameMaxLength : 0;
                        returnedObj.accountMinLength = platformData.partnerNameMinLength ? platformData.partnerNameMinLength : 0;
                        returnedObj.passwordMaxLength = platformData.partnerPasswordMaxLength ? platformData.partnerPasswordMaxLength : 0;
                        returnedObj.passwordMinLength = platformData.partnerPasswordMinLength ? platformData.partnerPasswordMinLength : 0;
                        returnedObj.accountPrefix = platformData.partnerPrefix ? platformData.partnerPrefix : "";
                        returnedObj.prefixForPartnerCreatePlayer = platformData.partnerCreatePlayerPrefix ? platformData.partnerCreatePlayerPrefix : "";
                        returnedObj.needSMSForRegister = platformData.partnerRequireSMSVerification ? 1 : 0;
                        returnedObj.needSMSForModifyPassword = platformData.partnerRequireSMSVerificationForPasswordUpdate ? 1 : 0;
                        returnedObj.needSMSForModifyBankInfo = platformData.partnerRequireSMSVerificationForPaymentUpdate ? 1 : 0;
                        returnedObj.needImageCodeForLogin = platformData.partnerRequireLogInCaptcha ? 1 : 0;
                        returnedObj.needImageCodeForSendSMSCode = platformData.partnerRequireCaptchaInSMS ? 1 : 0;
                        returnedObj.twoStepsForModifyPhoneNumber = platformData.partnerUsePhoneNumberTwoStepsVerification ? 1 : 0;
                        returnedObj.defaultCommissionType = platformData.partnerDefaultCommissionGroup ? platformData.partnerDefaultCommissionGroup : 0;
                        returnedObj.cndOrFtpLink = platformData.partnerRouteSetting ? platformData.partnerRouteSetting : "";
                        // returnedObj.themeStyle = platformData.partnerThemeSetting && platformData.partnerThemeSetting.themeStyleId && platformData.partnerThemeSetting.themeStyleId.themeStyle ? platformData.partnerThemeSetting.themeStyleId.themeStyle : "";
                        console.log("checking --- yH platformData.partnerThemeSetting", platformData.partnerThemeSetting)
                        if (platformData.partnerThemeSetting && platformData.partnerThemeSetting.themeStyleId && platformData.partnerThemeSetting.themeIdObjId) {
                            let themeSetting = platformData.partnerThemeSetting.themeStyleId;
                            themeStyleObjId = platformData.partnerThemeSetting.themeIdObjId;

                            // search for the themeID for patner
                            if (themeSetting && themeSetting.themeStyle) {
                                returnedObj.themeStyle = themeSetting.themeStyle;
                                returnedObj.themeID = "";
                                if (themeSetting.content && themeSetting.content.length && themeStyleObjId) {

                                    for (let i = 0; i < themeSetting.content.length; i++) {
                                        if (themeSetting.content[i]._id && themeSetting.content[i].themeId) {

                                            if (themeSetting.content[i]._id.toString() == themeStyleObjId.toString()) {
                                                returnedObj.themeID = themeSetting.content[i].themeId;
                                            }
                                            themeIdList.push({themeID: themeSetting.content[i].themeId, remark:themeSetting.content[i].remark});
                                        }
                                    }
                                }

                                returnedObj.themeIDList = themeIdList;
                            }

                        }
                    }

                    returnedObj.callBackToUserLines = [];
                    if (platformData.callRequestLineConfig && platformData.callRequestLineConfig.length) {
                        platformData.callRequestLineConfig.map(line => {

                            let lineDetail = {
                                lineId: line.lineId,
                                status: line.status,
                                levelLimit: null
                            };

                            playerLevels.map(playerLevel => {
                                if (String(playerLevel._id) == line.minLevel) {
                                    lineDetail.levelLimit = playerLevel.value
                                }
                            });

                            returnedObj.callBackToUserLines.push(lineDetail);
                        });
                    }

                    if (platformData.platformId) {
                        if (subject == 'player') {
                            return dbconfig.collection_playerPageAdvertisementInfo.find({
                                platformId: platformData._id,
                                inputDevice: inputDevice
                            }).sort({orderNo: 1}).lean();
                        }
                        else if (subject == 'partner') {
                            return dbconfig.collection_partnerPageAdvertisementInfo.find({
                                platformId: platformData._id,
                                inputDevice: inputDevice
                            }).sort({orderNo: 1}).lean();
                        }
                        else {
                            return Q.reject({
                                name: "DBError",
                                message: "No advertisement Information exists with id: " + platformId
                            });
                        }
                    }

                }
            ).then(
                advertisementInfo => {
                    if (advertisementInfo) {
                        advertisementInfo.map(info => {
                            if (info) {
                                let activityListObj = {};

                                activityListObj.showInRealServer = 1;

                                if (info.hasOwnProperty("showInRealServer") && !info.showInRealServer) {
                                    activityListObj.showInRealServer = 0;
                                }

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

                                    if (info.backgroundBannerImage.url.indexOf("http") === -1) {
                                        if (subject === 'player' && platformData.playerRouteSetting) {
                                            activityListObj.bannerImg = platformData.playerRouteSetting.trim() + info.backgroundBannerImage.url.trim();
                                        } else if (subject === 'partner' && platformData.partnerRouteSetting) {
                                            activityListObj.bannerImg = platformData.partnerRouteSetting.trim() + info.backgroundBannerImage.url.trim();
                                        } else {
                                            activityListObj.bannerImg = info.backgroundBannerImage.url.trim();
                                        }
                                    } else {
                                        activityListObj.bannerImg = info.backgroundBannerImage.url.trim();
                                    }

                                }

                                if (info.imageButton && info.imageButton.length > 0) {
                                    let buttonList = [];
                                    info.imageButton.forEach(b => {
                                        if (b) {
                                            let buttonObj = {};
                                            if (b.buttonName) {
                                                buttonObj.btn = b.buttonName;
                                            }
                                            if (b.url) {
                                                if (b.url.indexOf("http") === -1) {
                                                    if (subject === 'player' && platformData.playerRouteSetting) {
                                                        buttonObj.btnImg = platformData.playerRouteSetting.trim() + b.url.trim();
                                                    } else if (subject === 'partner' && platformData.partnerRouteSetting) {
                                                        buttonObj.btnImg = platformData.partnerRouteSetting.trim() + b.url.trim();
                                                    } else {
                                                        buttonObj.btnImg = b.url.trim();
                                                    }
                                                } else {
                                                    buttonObj.btnImg = b.url.trim();
                                                }

                                            }
                                            if (b.hyperLink) {
                                                buttonObj.extString = b.hyperLink;
                                            }
                                            buttonList.push(buttonObj);
                                        }
                                    });
                                    activityListObj.btnList = buttonList;
                                } else {
                                    if (info.backgroundBannerImage && info.backgroundBannerImage.hyperLink) {
                                        activityListObj.extString = info.backgroundBannerImage.hyperLink;
                                    }
                                }

                                if (subject == 'player') {
                                    returnedObj.activityList.push(activityListObj);
                                }
                                else if (subject == 'partner') {
                                    returnedObj.partnerActivityList.push(activityListObj);
                                }
                                else {
                                    return Q.reject({
                                        name: "DBError",
                                        message: "Missing of default param: 'partner' or 'player'."
                                    });
                                }
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

    appendRouteSetting: function (data, list, subject) {
        if (data && list) {

            // check if the "http / https" exist or not
            if (data[list].length > 0) {
                data[list].forEach(pair => {

                    if (pair.content.indexOf(',') !== -1) {
                        let splitString = pair.content.split(',');

                        if (splitString && splitString.length > 0) {
                            let comString = [];
                            splitString.forEach(indString => {

                                if (pair.isImg === 1 && indString.indexOf("http") === -1) {
                                    if (subject === 'player' && data.playerRouteSetting) {
                                        comString.push(data.playerRouteSetting.trim() + indString.trim());
                                    } else if (subject === 'partner' && data.partnerRouteSetting) {
                                        comString.push(data.partnerRouteSetting.trim() + indString.trim());
                                    } else {
                                        comString.push(indString.trim());
                                    }
                                }
                                else {
                                    comString.push(indString.trim());
                                }

                            });
                            pair.content = comString.join(',');
                        }
                    }
                    else {
                        if (pair.isImg === 1 && pair.content.indexOf("http") === -1) {
                            if (subject === 'player' && data.playerRouteSetting) {
                                pair.content = data.playerRouteSetting.trim() + pair.content.trim();
                            } else if (subject === 'partner' && data.partnerRouteSetting) {
                                pair.content = data.partnerRouteSetting.trim() + pair.content.trim();
                            } else {
                                pair.content = pair.content.trim();
                            }
                        } else {
                            pair.content = pair.content.trim();
                        }
                    }

                })
            }
            return data[list];
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

    createClickCountLog: (platformId, device, pageName, buttonName, registerClickApp = false, registerClickWeb = false, registerClickH5 = false, ipAddress, domain) => {
        let todayTime = dbUtility.getTodaySGTime();
        registerClickApp = registerClickApp === 'true' ? true : registerClickApp;
        registerClickWeb = registerClickWeb === 'true' ? true : registerClickWeb;
        registerClickH5 = registerClickH5 === 'true' ? true : registerClickH5;

        return dbconfig.collection_platform.findOne({platformId: platformId}, '_id').lean().then(
            platformObj => {
                let clickCountObj = {
                    platform: platformObj._id,
                    startTime: todayTime.startTime,
                    endTime: todayTime.endTime,
                    device: device,
                    pageName: pageName,
                    buttonName: buttonName,
                    // domain: domain
                };

                // domain is optional
                if (domain) {
                    clickCountObj.domain = domain;
                }

                let countObj = {};
                let uniqueIp = {};

                switch (true) {
                    case registerClickApp:
                        countObj = {
                            count: 1,
                            registerClickAppCount: 1
                        };
                        uniqueIp = {appIpAddresses: ipAddress};
                        break;
                    case registerClickWeb:
                        countObj = {
                            count: 1,
                            registerClickWebCount: 1
                        };
                        uniqueIp = {webIpAddresses: ipAddress};
                        break;
                    case registerClickH5:
                        countObj = {
                            count: 1,
                            registerClickH5Count: 1
                        };
                        uniqueIp = {H5IpAddresses: ipAddress};
                        break;
                    default:
                        countObj = {count: 1};
                        uniqueIp = {ipAddresses: ipAddress};
                }

                dbconfig.collection_clickCount
                    .update(clickCountObj, {$inc: countObj, $addToSet: uniqueIp}, {upsert: true})
                    .exec()
                    .catch(errorUtils.reportError);

                // ip domain binding log
                // dbPlatform.addIpDomainLog(platformId, domain, ipAddress).catch(errorUtils.reportError);
            }
        )
    },

    deleteClickCountRecord: (query) => {
        return dbconfig.collection_clickCount.remove(query);
    },

    getClickCountDeviceAndPage: (platformId) => {
        let matchObj = {
            platform: platformId
        };
        let returnData = {
            device: [],
            devicePage: {},
            domain: {},
            buttonName: {}
        }
        return dbconfig.collection_clickCount.distinct("device", matchObj).then(
            deviceArr => {
                if (deviceArr && deviceArr.length) {
                    returnData.device = deviceArr;
                    let promArr = [];
                    deviceArr.forEach(device => {
                        promArr.push(dbconfig.collection_clickCount.distinct("pageName", {
                            platform: platformId,
                            device: device
                        }))
                    });
                    return Promise.all(promArr).then(
                        deviceData => {
                            if (deviceData && deviceData.length == returnData.device.length) {
                                let pageNamePromArr = [];
                                let buttonNamePromArr = [];
                                returnData.device.forEach(
                                    (deviceName, index) => {
                                        returnData.devicePage[deviceName] = deviceData[index];
                                        if (deviceData[index] && deviceData[index].length) {
                                            deviceData[index].forEach(pageName=> {
                                                pageNamePromArr.push(dbconfig.collection_clickCount.distinct("domain", {
                                                    platform: platformId,
                                                    device: deviceName,
                                                    pageName: pageName
                                                }));
                                                buttonNamePromArr.push(dbconfig.collection_clickCount.distinct("buttonName", {
                                                    platform: platformId,
                                                    device: deviceName,
                                                    pageName: pageName
                                                }));
                                            });
                                        }
                                    }
                                );

                                return Promise.all([Promise.all(pageNamePromArr), Promise.all(buttonNamePromArr)]).then(
                                    ([domainData, buttonNameData]) => {
                                        if (domainData && domainData.length == pageNamePromArr.length && buttonNameData && buttonNameData.length == buttonNamePromArr.length) {
                                            let index = 0;
                                            returnData.device.forEach(
                                                (deviceName) => {
                                                    returnData.devicePage[deviceName].forEach((pageName) => {
                                                        returnData.domain[deviceName] = returnData.domain[deviceName] || {};
                                                        returnData.domain[deviceName][pageName] = domainData[index];
                                                        returnData.buttonName[deviceName] = returnData.buttonName[deviceName] || {};
                                                        returnData.buttonName[deviceName][pageName] = buttonNameData[index];
                                                        index++;
                                                    });

                                                }
                                            )
                                        }
                                        return returnData;
                                    }
                                )
                            }
                            return returnData;
                        }
                    )
                } else {
                    return returnData;
                }
            }
        );
    },

    getClickCountPageName: (platformId, device) => {
        let matchObj = {
            platform: platformId,
            device: device
        };

        return dbconfig.collection_clickCount.distinct("pageName", matchObj);
    },

    getClickCountDomain: (platformId, device, pageName) => {
        let matchObj = {
            platform: platformId,
            device: device,
            pageName: pageName
        };

        return dbconfig.collection_clickCount.distinct("domain", matchObj);
    },

    getClickCountButtonName: (platformId, device, pageName, domain) => {
        let matchObj = {
            platform: platformId,
            device: device,
            pageName: pageName
        };

        // domain is optional
        if (domain) {
            matchObj.domain = domain;
        }

        return dbconfig.collection_clickCount.distinct("buttonName", matchObj);
    },

    getClickCountAnalysis: (platformId, startDate, endDate, period, device, pageName, domain) => {
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

            // domain is optional
            if (domain) {
                matchObj.domain = domain;
            }

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

    addPlayerToDepositTrackingReport: (platformObjId, playerObjId) => {
        let query = {
            platform: platformObjId,
            _id: playerObjId,
        };

        return dbconfig.collection_players.findOne(query, {isDepositTracked: 1}).then(
            playerData => {
                if (!playerData) return Q.reject({name: "DataError", message: localization.localization.translate("Invalid player data")});

                // toggle tracking on or off based on existing tracking status
                let updateStatus = !playerData.isDepositTracked || false;

                let updateData = {
                    isDepositTracked: updateStatus
                };

                return dbconfig.collection_players.findOneAndUpdate(query, updateData, {new: true});
            }
        );
    },

    getDepositTrackingGroup: (platformId) => {
        return dbconfig.collection_playerDepositTrackingGroup.find({platform: platformId}).lean().exec();
    },

    addDepositTrackingGroup: (platformObjId, groupData, modifyData) => {
        let groupProm = Promise.resolve(true);
        let modifyProm = Promise.resolve(true);
        let proms1 = [];
        let proms2 = [];

        // for new data
        if (groupData && groupData.length > 0) {
            for (let x = 0; x < groupData.length; x++) {
                // only save group name that didn't exist
                let query = {
                    name: groupData[x].name,
                    platform: platformObjId,
                };

                let newData = {
                    name: groupData[x].name,
                    platform: platformObjId,
                    remark: groupData[x].remark || "",
                };

                // upsert: create new document if group name is not duplicate
                groupProm = dbconfig.collection_playerDepositTrackingGroup.findOneAndUpdate(query, newData, {upsert: true, new: true});
                proms1.push(groupProm);
            }
        }

        // for existing data
        if (modifyData && modifyData.length > 0) {
            for (let z = 0; z < modifyData.length; z++) {
                let upDateQuery = {
                    _id: modifyData[z]._id,
                    platform: platformObjId,
                };

                let updateData = {
                    name: modifyData[z].name,
                    remark: modifyData[z].remark || "",
                };

                modifyProm = dbconfig.collection_playerDepositTrackingGroup.findOneAndUpdate(upDateQuery, updateData, {new: true});
                proms2.push(modifyProm);
            }
        }

        return Promise.all([Promise.all(proms1), Promise.all(proms2)]).then(
            result => {
                if (result) {
                    let newData = result[0];
                    let existingData = result[1];

                    return {newData: newData, existingData: existingData};
                }
            }
        );
    },

    deleteDepositTrackingGroup: (platformObjId, trackingGroupObjId) => {
        return dbconfig.collection_playerDepositTrackingGroup.remove({_id: trackingGroupObjId, platform: platformObjId}).exec().then(
            () => {
                let query = {
                    platform: platformObjId,
                    depositTrackingGroup: trackingGroupObjId,
                };

                // need remove deposit tracking group for related players
                return dbconfig.collection_players.find(query).lean().then(
                    playerData => {
                        let proms = [];
                        if (playerData && playerData.length > 0) {
                            for (let index in playerData) {
                                let player = playerData[index];

                                let removeQuery = {
                                    _id: player._id,
                                    platform: platformObjId
                                };

                                // remove field
                                let updateData = {
                                    $unset: {depositTrackingGroup: ""}
                                };

                                let removeProm = dbconfig.collection_players.findOneAndUpdate(removeQuery, updateData, {new: true});
                                proms.push(removeProm);
                            }
                        }
                        return Q.all(proms);
                    }
                ).then(
                    removedTrackingGroup => {
                        return removedTrackingGroup;
                    }
                );
            }
        );
    },

    getBlacklistIpConfig: () => {
        return dbconfig.collection_platformBlacklistIpConfig.find({}).lean().exec();
    },

    getBlacklistIpIsEffective: (ipAddress) => {
        let query = {
            isEffective: true
        };
        if (ipAddress) {
            query.ip = ipAddress
        }
        return dbconfig.collection_platformBlacklistIpConfig.find(query).lean().exec();
    },

    deleteBlacklistIpConfig: (blacklistIpID) => {
        return dbconfig.collection_platformBlacklistIpConfig.remove({_id: blacklistIpID}).lean().exec().then(
            () => {
                return dbPlatform.getBlacklistIpConfig();
            }
        );
    },

    saveBlacklistIpConfig: (insertData, updateData, adminName) => {
        let insertProm = Promise.resolve(true);
        let updateProm = Promise.resolve(true);
        let proms1 = [];
        let proms2 = [];

        // for new data
        if (insertData && insertData.length > 0) {
            for (let x = 0; x < insertData.length; x++) {
                // only insert ip that didn't exist
                let query = {
                    ip: insertData[x].ip,
                };

                let newData = {
                    ip: insertData[x].ip,
                    remark: insertData[x].remark || "",
                    adminName: adminName,
                    isEffective: insertData[x].isEffective
                };

                // upsert: create new document if ip is not duplicate
                insertProm = dbconfig.collection_platformBlacklistIpConfig.findOneAndUpdate(query, newData, {upsert: true, new: true});
                proms1.push(insertProm);
            }
        }

        // for existing data
        if (updateData && updateData.length > 0) {
            for (let z = 0; z < updateData.length; z++) {
                let upDateQuery = {
                    _id: updateData[z]._id,
                };

                let oldData = {
                    ip: updateData[z].ip,
                    remark: updateData[z].remark || "",
                    isEffective: updateData[z].isEffective
                };

                updateProm = dbconfig.collection_platformBlacklistIpConfig.findOneAndUpdate(upDateQuery, oldData, {new: true});
                proms2.push(updateProm);
            }
        }

        return Promise.all([Promise.all(proms1), Promise.all(proms2)]).then(
            result => {
                if (result) {
                    let newData = result[0];
                    let existingData = result[1];

                    return {newData: newData, existingData: existingData};
                }
            }
        );
    },

    getPlatformPartnerSettLog: (platformObjId, modes) => {
        let promArr = [];
        let partnerSettDetail = {};

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
                            settEndTime: nextDate.endTime,
                        }
                    }
                )
            )
        });

        return Promise.all(promArr).then(
            result => {
                if (result) {
                    let promArr = [];
                    partnerSettDetail = result;

                    result.map(r => {
                        if (r && r.settStartTime && r.settEndTime) {
                            promArr.push(dbPlatform.isPreview(r.settStartTime, r.settEndTime, platformObjId, r.mode));
                        }
                    });

                    return Promise.all(promArr);
                }
            }
        ).then(
            checkPreviewResult => {
                if (checkPreviewResult) {
                    partnerSettDetail.map(settDetail => {
                        if (settDetail) {
                            checkPreviewResult.forEach(checkPreview => {
                                if (checkPreview) {
                                    if (settDetail.mode == checkPreview.settMode && settDetail.settStartTime == checkPreview.startTime && settDetail.settEndTime == checkPreview.endTime) {
                                        settDetail.isPreview = checkPreview.isPreview;
                                    }
                                }
                            })
                        }
                    });

                    return partnerSettDetail;
                }
            }
        );
    },

    isPreview: (startTime, endTime, platformObjId, settMode) => {
        let query = {
            platform: platformObjId,
            startTime: startTime,
            endTime: endTime,
            settMode: settMode,
            isSettled: false,
            isSkipped: false
        }

        return dbconfig.collection_partnerCommSettLog.findOne(query).then(
            result => {
                if (result) {
                    return {
                        settMode: settMode,
                        startTime: startTime,
                        endTime: endTime,
                        isPreview: true
                    }
                } else {
                    return {
                        settMode: settMode,
                        startTime: startTime,
                        endTime: endTime,
                        isPreview: false
                    }
                }
            }
        )
    },

    generatePartnerCommSettPreview: (platformObjId, settMode, startTime, endTime, isSkip = false, toLatest = false) => {
        if (toLatest) {
            let currentCycle = getPartnerCommNextSettDate(settMode, getPartnerCommNextSettDate(settMode, new Date()));
            currentCycle = getPartnerCommNextSettDate(settMode, currentCycle.startTime.getTime() - 1);
            let previousCycle = getPartnerCommNextSettDate(settMode, currentCycle.startTime.getTime() - 1);

            startTime = previousCycle.startTime;
            endTime = previousCycle.endTime;
        }

        return dbconfig.collection_partner.find({platform: platformObjId, commissionType: settMode}).count().then(
            partnerCount => {
                if (partnerCount && partnerCount > 0) {
                    calculatePartnerCommissionInfo(platformObjId, settMode, startTime, endTime, isSkip).catch(errorUtils.reportError);

                    return dbconfig.collection_partnerCommSettLog.update({
                        platform: platformObjId,
                        settMode: settMode,
                        startTime: startTime,
                        endTime: endTime
                    }, {
                        isSettled: isSkip,
                        isSkipped: isSkip
                    }, {
                        upsert: true,
                        new: true
                    });
                } else {
                    return Q.reject({name: "DBError", error: "Cannot preview, setting is incomplete"});
                }
            }
        );
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

    getPlatformPartnerSettlementStatus: (platformObjId, commissionType, startTime, endTime) => {
        return dbconfig.collection_partnerCommSettLog.find({
            platform: platformObjId,
            settMode: parseInt(commissionType),
            $or: [{
                startTime: {
                    $gte: startTime,
                    $lte: endTime
                },
                endTime: {
                    $gte: startTime,
                    $lte: endTime
                }
            }]
        }).lean().then(
            data => {
                let statusList = {};
                data.forEach(v => {
                    let status = null;
                    if (v.isSettled && v.isSkipped) {
                        status = constPartnerCommissionLogStatus.SKIPPED;
                    } else if (v.isSettled && !v.isSkipped) {
                        status = constPartnerCommissionLogStatus.EXECUTED;
                    } else if (!v.isSettled && !v.isSkipped) {
                        status = constPartnerCommissionLogStatus.PREVIEW;
                    }
                    let startDate = dbUtility.getTargetSGTime(v.startTime).startTime;
                    let logEndTime = new Date(v.endTime).getTime() - 2 * 60 * 1000;    //minus 2 minutes in case end time is the start time of next day, i.e. 00:00:00
                    let endDate = dbUtility.getTargetSGTime(logEndTime).startTime;
                    let timeDiff = Math.abs(endDate - startDate);
                    let diffDay = Math.ceil(timeDiff / (1000 * 3600 * 24));

                    if (status !== null) {
                        for (let x = 0; x <= diffDay; x++) {
                            let convertedDate = new Date(startDate.getTime() + 8 * 3600 * 1000 + (x * 24 * 3600 * 1000));
                            let refDate = convertedDate.getUTCDate();
                            let refMonth = convertedDate.getUTCMonth() + 1;
                            let refYear = convertedDate.getUTCFullYear();

                            if (!statusList[refYear]) {
                                statusList[refYear] = {};
                            }
                            if (!statusList[refYear][refMonth]) {
                                statusList[refYear][refMonth] = {};
                            }
                            if (!statusList[refYear][refMonth].hasOwnProperty(refDate) || statusList[refYear][refMonth][refDate] === constPartnerCommissionLogStatus.SKIPPED) {
                                statusList[refYear][refMonth][refDate] = status;
                            }
                        }
                    }
                });
                return statusList;
            }
        );
    },

    getClientData: function (platformId) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                return platformData ? platformData.clientData : "";
            }
        );
    },

    saveClientData: function (platformId, clientData) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_platform.findOneAndUpdate({_id: platformData._id}, {clientData: clientData}).then(
                        res => {
                            return clientData;
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        message: "can not find platform"
                    });
                }
            }
        );
    },

    savePlayerInformationFromPopUp: function (data) {

        let prom = [];

        console.log("YH------CHECKING------", data);

        if (data && data.length > 0){

            data.forEach( inData => {
                if (inData) {

                    var platformId = inData.platformId || "";
                    var phoneNumber = inData.phoneNumber || "";
                    var name = inData.name || "";
                    var createTime = inData.createTime? new Date(inData.createTime) : new Date();

                    prom.push(checkAndInsertRecord(platformId, phoneNumber, name, createTime));
                }
            })
        }

        return Promise.all(prom);

        function checkAndInsertRecord (platformId, phoneNumber, name, createTime){
            // return dbconfig.collection_playerDataFromExternalSource.findOne({
            //         platformId: platformId,
            //         phoneNumber: phoneNumber,
            //         name: name,
            //     }
            // ).then(res => {
            //     if (!res) {
                    let dataTobeSaved = {
                        platformId: platformId || "",
                        phoneNumber: phoneNumber || "",
                        name: name || "",
                        createTime: createTime || new Date()
                    };

                    console.log("YH---checking savingData", dataTobeSaved);

                    let playerData = new dbconfig.collection_playerDataFromExternalSource(dataTobeSaved);
                    return playerData.save().then().catch(err => errorUtils.reportError(err));
                // }
                // else {
                //     return;
                // }
            // })
        }
    },

    callBackToUser: (platformId, phoneNumber, randomNumber, captcha, lineId, playerId) => {
        let platform, url, platformString;
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({
                        status: constServerCode.INVALID_PLATFORM,
                        name: "DBError",
                        message: "Platform does not exist"
                    });
                }

                if (phoneNumber && platformData.blackListingPhoneNumbers) {
                    let indexNo = platformData.blackListingPhoneNumbers.findIndex(p => p == phoneNumber);

                    if (indexNo != -1) {
                        return Q.reject({
                            name: "DataError",
                            message: localization.localization.translate("Invalid phone number, unable to call")
                        });
                    }
                }

                platform = platformData;
                let platformStringArray = platform.callRequestLineConfig;

                if (!platform.callRequestUrlConfig || !platformStringArray) {
                    return Promise.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DBError",
                        message: "Error finding db data"
                    });
                }

                let stringProm = getPlatformStringForCallback(platformStringArray, playerId, lineId);
                let playerProm = null;
                if(playerId){
                    playerProm = dbconfig.collection_players.findOne({playerId: playerId}).lean();
                }
                return Promise.all([stringProm, playerProm]);
            }
        ).then(
            data => {
                platformString = data&&data[0] ? data[0] : "";
                if( !phoneNumber || (phoneNumber && phoneNumber.indexOf("*") > 0) ){
                    phoneNumber = data&&data[1] ? data[1].phoneNumber : phoneNumber;
                }

                url = platform.callRequestUrlConfig;

                let path = "/servlet/TelephoneApplication?phone=" + phoneNumber + "&captcha=" + captcha + "&platform=" + platformString + "&random=" + randomNumber + "&callback=jsonp1";

                let link = url + path;

                return new Promise((resolve, reject) => {
                    let options = {
                        jsonp: false,
                        json: true,
                        jsonpCallback:"jsonp1",
                        dataType: "jsonp",
                        strictSSL: false
                    };
                    request.get(link, options, (err, res, body) => {
                        if (err) {
                            reject({code: constServerCode.EXTERNAL_API_FAILURE, message: err});
                        } else {
                            console.log('callBackToUser API output:', body);
                            let bodyJson = body.replace("jsonp1(", "").replace(")", "").replace(/'/g, '"');
                            try {
                                bodyJson = JSON.parse(String(bodyJson));
                            } catch (e) {
                                console.error(e);
                            }
                            console.log('callBackToUser API json:', bodyJson, bodyJson.code, bodyJson.msg);
                            if (bodyJson && bodyJson.code == "0") {
                                resolve(true);
                            }
                            else {
                                reject({
                                    code: constServerCode.EXTERNAL_API_FAILURE,
                                    message: bodyJson ? bodyJson.msg : ""
                                });
                            }
                        }
                    });
                });
            }
        );
    },

    getOMCaptcha: (platformId) => {
        let platform, url;
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({
                        status: constServerCode.INVALID_PLATFORM,
                        name: "DBError",
                        message: "Platform does not exist"
                    });
                }

                platform = platformData;

                if (!platform.callRequestUrlConfig) {
                    return Promise.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DBError",
                        message: "Error finding db data"
                    });
                }

                url = platform.callRequestUrlConfig;

                let requestProtocol = http;
                if (url.startsWith('https')) {
                    requestProtocol = https;
                }

                let randomNumber = Math.random();

                let path = "/servlet/GetMaCode?random=" + randomNumber;

                let link = url + path;

                return new Promise((resolve, reject) => {
                    requestProtocol.get(link, (resp) => {
                        resp.setEncoding('base64');
                        let body = "data:" + resp.headers["content-type"] + ";base64,";
                        resp.on('data', (data) => {
                            body += data
                        });
                        resp.on('end', () => {
                            resolve({
                                randomNumber: randomNumber,
                                b64ImgDataUrl: body
                            });
                        });
                    }).on('error', (e) => {
                        console.error(e);
                        reject({code: constServerCode.EXTERNAL_API_FAILURE, message: e.message});
                    });
                });

            }
        )
    },

    updatePlatformFinancialPoints: function (platformId, typeName, proposalData) {
        //get proposal type id
        let ptProm = dbconfig.collection_proposalType.findOne({platformId: platformId, name: typeName}).exec();

        return ptProm.then(
            (proposalType) => {
                if (!proposalType) {
                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                }
                //check if there is pending proposal for this type
                let queryObj = {
                    type: proposalType._id,
                    status: constProposalStatus.PENDING,
                    "data.playerObjId": proposalData.data.playerObjId
                }

                return dbconfig.collection_proposal.findOne(queryObj).lean()
            }
        ).then(
            pendingProposal => {
                if (pendingProposal) {
                    return Q.reject({
                        name: "DBError",
                        message: "Player or partner already has a pending proposal for this type"
                    });
                }
                return dbconfig.collection_platform.findOne({_id: platformId}).lean();
            }
        ).then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", errorMessage: "Cannot find platform"});
                }
                proposalData.data.pointsBefore = dbUtility.noRoundTwoDecimalPlaces(platformData.financialPoints);
                proposalData.data.pointsAfter = dbUtility.noRoundTwoDecimalPlaces(platformData.financialPoints + proposalData.data.updateAmount);
                return dbProposal.createProposalWithTypeNameWithProcessInfo(platformId, typeName, proposalData)
            }
        )
    },

    changePlatformFinancialPoints: function (platformObjId, amount) {
        return dbconfig.collection_platform.findOneAndUpdate({_id: platformObjId},
            {
                $inc: {
                    financialPoints: amount
                }
            }
        )
    },

    replicatePlatformSetting: (fromPlatformObjId, toPlatformObjId) => {
        let replicateFrom, replicateTo;
        let oldNewPlayerLevelObjId = {};

        let replicateFromProm = dbconfig.collection_platform.findOne({_id: fromPlatformObjId}).lean();
        let replicateToProm = dbconfig.collection_platform.findOne({_id: toPlatformObjId}).lean();

        return Promise.all([replicateFromProm, replicateToProm]).then(platforms => {
            ([replicateFrom, replicateTo] = platforms);

            if (!replicateFrom || !replicateTo) {
                return Promise.reject({message: "Platform not found."});
            }

            let platformKeysToCopy = [
                "minTopUpAmount",
                "allowSameRealNameToRegister",
                "allowSamePhoneNumberToRegister",
                "demoPlayerValidDays",
                "samePhoneNumberRegisterCount",
                "canMultiReward",
                "autoCheckPlayerLevelUp",
                "manualPlayerLevelUp",
                "platformBatchLevelUp",
                "playerLevelUpPeriod",
                "playerLevelDownPeriod",
                "requireLogInCaptcha",
                "requireCaptchaInSMS",
                "onlyNewCanLogin",
                "useLockedCredit",
                "playerNameMaxLength",
                "playerNameMinLength",
                "playerPasswordMaxLength",
                "playerPasswordMinLength",
                "prefix",
                "bonusSetting",
                "requireSMSVerification",
                "requireSMSVerificationForDemoPlayer",
                "requireSMSVerificationForPasswordUpdate",
                "requireSMSVerificationForPaymentUpdate",
                "smsVerificationExpireTime",
                "useProviderGroup",
                "whiteListingPhoneNumbers",
                "blackListingPhoneNumbers",
                "usePointSystem",
                "usePhoneNumberTwoStepsVerification",
                "playerForbidApplyBonusNeedCsApproval",
                "unreadMailMaxDuration",
                "manualRewardSkipAuditAmount",
                "useEbetWallet",
                "partnerNameMaxLength",
                "partnerNameMinLength",
                "partnerPasswordMaxLength",
                "partnerPasswordMinLength",
                "partnerPrefix",
                "partnerCreatePlayerPrefix",
                "partnerAllowSamePhoneNumberToRegister",
                "partnerAllowSameRealNameToRegister",
                "partnerSamePhoneNumberRegisterCount",
                "partnerRequireSMSVerification",
                "partnerRequireSMSVerificationForPasswordUpdate",
                "partnerRequireSMSVerificationForPaymentUpdate",
                "partnerSmsVerificationExpireTime",
                "partnerRequireLogInCaptcha",
                "partnerRequireCaptchaInSMS",
                "partnerUsePhoneNumberTwoStepsVerification",
                "partnerUnreadMailMaxDuration",
                "partnerDefaultCommissionGroup",
                "consumptionTimeConfig",
                "enableAutoApplyBonus",
                "manualAuditFirstWithdrawal",
                "manualAuditAfterBankChanged",
                "manualAuditBanWithdrawal",
                "autoApproveWhenSingleBonusApplyLessThan",
                "autoApproveWhenSingleDayTotalBonusApplyLessThan",
                "autoApproveLostThreshold",
                "autoApproveConsumptionOffset",
                "autoApproveProfitTimes",
                "autoApproveProfitTimesMinAmount",
                "autoApproveBonusProfitOffset",
                "autoUnlockWhenInitAmtLessThanLostThreshold",
                "consecutiveTransferInOut",
                "monitorMerchantCount",
                "monitorPlayerCount",
                "monitorMerchantUseSound",
                "monitorPlayerUseSound",
                "monitorMerchantSoundChoice",
                "monitorPlayerSoundChoice",
                "playerValueConfig",
                "csEmailImageUrlList",
                "csPhoneList",
                "csUrlList",
                "csSkypeList",
                "csDisplayUrlList",
                "playerInvitationUrlList",
                "weixinPhotoUrlList",
                "playerWebLogoUrlList",
                "csPartnerEmailList",
                "csPartnerPhoneList",
                "csPartnerUrlList",
                "csPartnerQQList",
                "csPartnerWeixinList",
                "csPartnerSkypeList",
                "csPartnerDisplayUrlList",
                "partnerInvitationUrlList",
                "partnerWeixinPhotoUrlList",
                "partnerWebLogoUrlList",
            ];

            let platformDataToCopy = {};
            platformKeysToCopy.map(key => {
                if (replicateFrom[key]) {
                    platformDataToCopy[key] = replicateFrom[key];
                }
            });

            let copyPlatformDataProm = dbconfig.collection_platform.findOneAndUpdate({_id: replicateTo._id}, platformDataToCopy, {new: true}).lean();

            // victor and zheming says not to make it harder to read just to save lines of code, so I'll keep it as it is
            // 玩家等级
            // playerLevel schema
            let copyPlayerLevelProm = dbconfig.collection_playerLevel.remove({platform: replicateTo._id}).then(
                () => {
                    return dbconfig.collection_playerLevel.find({platform: replicateFrom._id}).lean()
                }
            ).then(
                playerLevels => {
                    let proms = [];
                    playerLevels.map(playerLevel => {
                        let playerLevelId = playerLevel._id;
                        delete playerLevel._id;
                        playerLevel.platform = replicateTo._id;
                        let prom = dbconfig.collection_playerLevel(playerLevel).save().then(
                            newPlayerLevel => {
                                if (newPlayerLevel) {
                                    oldNewPlayerLevelObjId[String(playerLevelId)] = String(newPlayerLevel._id);
                                }
                            }
                        ).catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 有效/活跃玩家
            // partnerlevelconfig
            let copyPartnerLevelConfigProm = dbconfig.collection_partnerLevelConfig.remove({platform: replicateTo._id}).then(
                () => {
                    return dbconfig.collection_partnerLevelConfig.find({platform: replicateFrom._id}).lean();
                }
            ).then(
                partnerLevelConfigs => {
                    let proms = [];
                    partnerLevelConfigs.map(partnerLevelConfig => {
                        delete partnerLevelConfig._id;
                        partnerLevelConfig.platform = replicateTo._id;
                        let prom = dbconfig.collection_partnerLevelConfig(partnerLevelConfig).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 玩家信用
            // playerCredibilityRemark
            let copyPlayerCredibilityRemarkProm = dbconfig.collection_playerCredibilityRemark.remove({platform: replicateTo._id}).then(
                () => {
                    return dbconfig.collection_playerCredibilityRemark.find({platform: replicateFrom._id}).lean();
                }
            ).then(
                playerCredibilityRemarks => {
                    let proms = [];
                    playerCredibilityRemarks.map(playerCredibilityRemark => {
                        delete playerCredibilityRemark._id;
                        playerCredibilityRemark.platform = replicateTo._id;
                        let prom = dbconfig.collection_playerCredibilityRemark(playerCredibilityRemark).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 短信组设置
            // smsGroup
            let oldNewSmsId = {};
            let copySmsGroupProm = dbconfig.collection_smsGroup.remove({platformObjId: replicateTo._id}).then(
                () => {
                    return dbconfig.collection_smsGroup.find({platformObjId: replicateFrom._id}).lean();
                }
            ).then(
                smsGroups => {
                    let asyncProms = Promise.resolve();
                    smsGroups.map(smsGroup => {
                        let oldSmsId = smsGroup.smsId;
                        delete smsGroup._id;
                        delete smsGroup.smsId;
                        smsGroup.platformObjId = replicateTo._id;
                        asyncProms = asyncProms.then(() => {
                            return dbconfig.collection_smsGroup(smsGroup).save();
                        }).then(
                            newSmsGroup => {
                                if (newSmsGroup && newSmsGroup.smsId) {
                                    oldNewSmsId[oldSmsId] = newSmsGroup.smsId;
                                }
                            }
                        ).catch(errorUtils.reportError);
                    });

                    return asyncProms;
                }
            ).then(
                () => dbconfig.collection_smsGroup.find({platformObjId: replicateTo._id}).lean()
            ).then(
                newGroups => {
                    if (!newGroups || newGroups.length < 1) {
                        return [];
                    }

                    let proms = [];

                    newGroups.map(newGroup => {
                        if (newGroup.smsParentSmsId != -1 && oldNewSmsId[newGroup.smsParentSmsId]) {
                            let prom = dbconfig.collection_smsGroup.update({_id: newGroup._id}, {smsParentSmsId: oldNewSmsId[newGroup.smsParentSmsId]});
                            proms.push(prom);
                        }
                    });

                    return Promise.all(proms);
                }
            );

            // 敏感词设置
            // keywordFilter
            let copyKeywordFilterProm = dbconfig.collection_keywordFilter.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_keywordFilter.find({platform: replicateFrom._id}).lean()
            ).then(
                keywordFilters => {
                    let proms = [];
                    keywordFilters.map(keywordFilter => {
                        delete keywordFilter._id;
                        keywordFilter.platform = replicateTo._id;
                        let prom = dbconfig.collection_keywordFilter(keywordFilter).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 消息模版
            // messageTemplate
            let copyMessageTemplateProm = dbconfig.collection_messageTemplate.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_messageTemplate.find({platform: replicateFrom._id}).lean()
            ).then(
                messageTemplates => {
                    let proms = [];
                    messageTemplates.map(messageTemplate => {
                        delete messageTemplate._id;
                        messageTemplate.platform = replicateTo._id;
                        let prom = dbconfig.collection_messageTemplate(messageTemplate).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 公告版
            // platformAnnouncement
            let copyPlatformAnnouncemenetProm = dbconfig.collection_platformAnnouncement.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_platformAnnouncement.find({platform: replicateFrom._id}).lean()
            ).then(
                platformAnnouncements => {
                    let proms = [];
                    platformAnnouncements.map(platformAnnouncement => {
                        delete platformAnnouncement._id;
                        platformAnnouncement.platform = replicateTo._id;
                        let prom = dbconfig.collection_platformAnnouncement(platformAnnouncement).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 游戏组 // 不用包含的游戏，只要组的设置
            // platformGameGroup (where games should be empty array)
            let oldNewPlatformGameGroupId = {};
            let copyPlatformGameGroupProm = dbconfig.collection_platformGameGroup.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_platformGameGroup.find({platform: replicateFrom._id}).lean()
            ).then(
                platformGameGroups => {
                    let asyncProms = Promise.resolve();
                    platformGameGroups.map(platformGameGroup => {
                        let platformGameGroupId = String(platformGameGroup._id);
                        delete platformGameGroup._id;
                        delete platformGameGroup.groupId;
                        delete platformGameGroup.code;
                        platformGameGroup.games = [];
                        platformGameGroup.platform = replicateTo._id;
                        asyncProms = asyncProms.then(() => {
                            return dbconfig.collection_platformGameGroup(platformGameGroup).save();
                        }).then(newPlatformGameGroup => {
                            oldNewPlatformGameGroupId[platformGameGroupId] = newPlatformGameGroup._id;
                        }).catch(errorUtils.reportError);
                    });

                    return asyncProms;
                }
            ).then(
                () => dbconfig.collection_platformGameGroup.find({platform: replicateTo._id}).lean()
            ).then(
                newGameGroups => {
                    let proms = [];

                    newGameGroups.map(newGameGroup => {
                        let childrenIds = [];
                        let parentId = "";
                        let needUpdate = false;
                        if (newGameGroup.children && newGameGroup.children.length > 0) {
                            needUpdate = true;
                            newGameGroup.children.map(child => {
                                if (oldNewPlatformGameGroupId[String(child)]) {
                                    childrenIds.push(oldNewPlatformGameGroupId[String(child)]);
                                }
                            });
                        }

                        if (newGameGroup.parent && oldNewPlatformGameGroupId[String(newGameGroup.parent)]) {
                            needUpdate = true;
                            parentId = oldNewPlatformGameGroupId[String(newGameGroup.parent)]
                        }

                        if (needUpdate) {
                            let updateData = {};
                            if (childrenIds.length > 0) {
                                updateData.children = childrenIds;
                            }
                            if (parentId) {
                                updateData.parent = parentId;
                            }

                            let prom = dbconfig.collection_platformGameGroup.update({_id: newGameGroup._id}, updateData);
                            proms.push(prom)
                        }
                    });

                    return Promise.all(proms);
                }
            );

            // 优惠 // 除了『锁定大厅』内的配置，因为此时尚无游戏供应商，无法分组。
            // rewardEvent (ignore provider group setting, fix reward event inter-relationship)
            let oldNewEventObjId = {};
            let copyRewardEventProm = dbconfig.collection_rewardEvent.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_rewardEvent.find({platform: replicateFrom._id}).populate({
                    path: "executeProposal",
                    model: dbconfig.collection_proposalType
                }).lean()
            ).then(
                rewardEvents => {
                    let proms = [];
                    rewardEvents.map(rewardEvent => {
                        let rewardEventId = String(rewardEvent._id);
                        delete rewardEvent._id;
                        if (rewardEvent.condition) delete rewardEvent.condition.providerGroup;
                        rewardEvent.platform = replicateTo._id;

                        let prom = dbconfig.collection_proposalType.findOne({
                            platformId: replicateTo._id, name: rewardEvent.executeProposal.name
                        }).lean().then(
                            replToPropType => {
                                if (replToPropType && replToPropType._id) {
                                    rewardEvent.executeProposal = replToPropType._id;

                                    dbconfig.collection_rewardEvent(rewardEvent).save().then(newRewardEvent => {
                                        oldNewEventObjId[rewardEventId] = String(newRewardEvent._id);
                                        return newRewardEvent;
                                    }).catch(errorUtils.reportError);
                                }
                            }
                        );
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            ).then(
                () => dbconfig.collection_rewardEvent.find({platform: replicateTo._id}).lean()
            ).then(
                newRewardEvents => {
                    let proms = [];
                    if (!newRewardEvents || newRewardEvents.length < 1) {
                        return [];
                    }

                    newRewardEvents.map(newRewardEvent => {
                        if (newRewardEvent && newRewardEvent.condition && newRewardEvent.condition.ignoreTopUpDirtyCheckForReward && newRewardEvent.condition.ignoreTopUpDirtyCheckForReward.length > 0) {
                            let updatedParam = [];
                            newRewardEvent.condition.ignoreTopUpDirtyCheckForReward.map(rewardEventId => {
                                if (oldNewEventObjId[String(rewardEventId)]) {
                                    updatedParam.push(oldNewEventObjId[String(rewardEventId)]);
                                }
                            });

                            let prom = dbconfig.collection_rewardEvent.update({_id: newRewardEvent._id}, {"condition.ignoreTopUpDirtyCheckForReward": updatedParam});
                            proms.push(prom);
                        }
                    });

                    return Promise.all(proms);
                }
            );

            // 充值分组 - 银行卡组
            // platformBankCardGroup
            let copyPlatformBankCardGroupProm = dbconfig.collection_platformBankCardGroup.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_platformBankCardGroup.find({platform: replicateFrom._id}).lean()
            ).then(
                platformBankCardGroups => {
                    let proms = [];
                    platformBankCardGroups.map(platformBankCardGroup => {
                        delete platformBankCardGroup._id;
                        platformBankCardGroup.platform = replicateTo._id;
                        platformBankCardGroup.banks = [];
                        platformBankCardGroup.groupId = Math.random().toString(36).substring(4, 10);
                        let prom = dbconfig.collection_platformBankCardGroup(platformBankCardGroup).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 充值分组 - 商户组
            // platformMerchantGroup
            let copyPlatformMerchantGroupProm = dbconfig.collection_platformMerchantGroup.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_platformMerchantGroup.find({platform: replicateFrom._id}).lean()
            ).then(
                platformMerchantGroups => {
                    let proms = [];
                    platformMerchantGroups.map(platformMerchantGroup => {
                        delete platformMerchantGroup._id;
                        platformMerchantGroup.platform = replicateTo._id;
                        platformMerchantGroup.merchants = [];
                        platformMerchantGroup.merchantNames = [];
                        platformMerchantGroup.groupId = Math.random().toString(36).substring(4, 10);
                        let prom = dbconfig.collection_platformMerchantGroup(platformMerchantGroup).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 充值分组 - 个人支付宝
            // platformAlipayGroup
            let copyPlatformAlipayGroupProm = dbconfig.collection_platformAlipayGroup.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_platformAlipayGroup.find({platform: replicateFrom._id}).lean()
            ).then(
                platformAlipayGroups => {
                    let proms = [];
                    platformAlipayGroups.map(platformAlipayGroup => {
                        delete platformAlipayGroup._id;
                        platformAlipayGroup.platform = replicateTo._id;
                        platformAlipayGroup.alipays = [];
                        platformAlipayGroup.groupId = Math.random().toString(36).substring(4, 10);
                        let prom = dbconfig.collection_platformAlipayGroup(platformAlipayGroup).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 充值分组 - 个人微信
            // platformWechatPayGroup
            let copyPlatformWechatPayGroupProm = dbconfig.collection_platformWechatPayGroup.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_platformWechatPayGroup.find({platform: replicateFrom._id}).lean()
            ).then(
                platformWechatPayGroups => {
                    let proms = [];
                    platformWechatPayGroups.map(platformWechatPayGroup => {
                        delete platformWechatPayGroup._id;
                        platformWechatPayGroup.platform = replicateTo._id;
                        platformWechatPayGroup.wechats = [];
                        platformWechatPayGroup.groupId = Math.random().toString(36).substring(4, 10);
                        let prom = dbconfig.collection_platformWechatPayGroup(platformWechatPayGroup).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 回访主题
            // playerFeedbackTopic
            let copyPlayerFeedbackTopicProm = dbconfig.collection_playerFeedbackTopic.remove({platform: replicateTo._id}).then(
                () => dbconfig.collection_playerFeedbackTopic.find({platform: replicateFrom._id}).lean()
            ).then(
                playerFeedbackTopics => {
                    let proms = [];
                    playerFeedbackTopics.map(playerFeedbackTopic => {
                        delete playerFeedbackTopic._id;
                        playerFeedbackTopic.platform = replicateTo._id;
                        let prom = dbconfig.collection_playerFeedbackTopic(playerFeedbackTopic).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 回访结果
            // playerFeedbackResult
            // let copyPlayerFeedbackResultProm = dbconfig.collection_playerFeedbackResult.remove({platform: replicateTo._id}).then(
            //     () => dbconfig.collection_playerFeedbackResult.find({platform: replicateFrom._id}).lean()
            // ).then(
            //     playerFeedbackResults => {
            //         let proms = [];
            //         playerFeedbackResults.map(playerFeedbackResult => {
            //             delete playerFeedbackResult._id;
            //             playerFeedbackResult.platform = replicateTo._id;
            //             let prom = dbconfig.collection_playerFeedbackResult(playerFeedbackResult).save().catch(errorUtils.reportError);
            //             proms.push(prom);
            //         });
            //
            //         return Promise.all(proms);
            //     }
            // );

            // 玩家前端展示 - 广告
            // playerPageAdvertisementInfo
            let copyPlayerPageAdvertisementInfoProm = dbconfig.collection_playerPageAdvertisementInfo.remove({platformId: replicateTo._id}).then(
                () => dbconfig.collection_playerPageAdvertisementInfo.find({platformId: replicateFrom._id}).lean()
            ).then(
                playerPageAdvertisementInfos => {
                    let proms = [];
                    playerPageAdvertisementInfos.map(playerPageAdvertisementInfo => {
                        delete playerPageAdvertisementInfo._id;
                        playerPageAdvertisementInfo.platformId = replicateTo._id;
                        let prom = dbconfig.collection_playerPageAdvertisementInfo(playerPageAdvertisementInfo).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            // 代理前端展示 - 广告
            // playerPageAdvertisementInfo
            let copyPartnerPageAdvertisementInfoProm = dbconfig.collection_partnerPageAdvertisementInfo.remove({platformId: replicateTo._id}).then(
                () => dbconfig.collection_partnerPageAdvertisementInfo.find({platformId: replicateFrom._id}).lean()
            ).then(
                partnerPageAdvertisementInfos => {
                    let proms = [];
                    partnerPageAdvertisementInfos.map(partnerPageAdvertisementInfo => {
                        delete partnerPageAdvertisementInfo._id;
                        partnerPageAdvertisementInfo.platformId = replicateTo._id;
                        let prom = dbconfig.collection_partnerPageAdvertisementInfo(partnerPageAdvertisementInfo).save().catch(errorUtils.reportError);
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            );

            return Promise.all([
                copyPlatformDataProm,
                copyPlayerLevelProm,
                copyPartnerLevelConfigProm,
                copyPlayerCredibilityRemarkProm,
                copySmsGroupProm,
                copyKeywordFilterProm,
                copyMessageTemplateProm,
                copyPlatformAnnouncemenetProm,
                copyPlatformGameGroupProm,
                copyRewardEventProm,
                copyPlatformBankCardGroupProm,
                copyPlatformMerchantGroupProm,
                copyPlatformAlipayGroupProm,
                copyPlatformWechatPayGroupProm,
                copyPlayerFeedbackTopicProm,
                // copyPlayerFeedbackResultProm, // temporally feedbackResult is not base on platform
                copyPlayerPageAdvertisementInfoProm,
                copyPartnerPageAdvertisementInfoProm,
            ]);
        }).then(
            () => {
                // this section will handle those that require other section's data in order to proceed

                // 积分规则
                // rewardPointsLvlConfig
                let copyRewardPointsLvlConfigProm = dbconfig.collection_rewardPointsLvlConfig.remove({platformObjId: replicateTo._id}).then(
                    () => dbconfig.collection_rewardPointsLvlConfig.find({platformObjId: replicateFrom._id}).lean()
                ).then(
                    rewardPointsLvlConfigs => {
                        let proms = [];
                        rewardPointsLvlConfigs.map(rewardPointsLvlConfig => {
                            delete rewardPointsLvlConfig._id;
                            rewardPointsLvlConfig.platformObjId = replicateTo._id;
                            if (rewardPointsLvlConfig.params && rewardPointsLvlConfig.params.length > 0) {
                                rewardPointsLvlConfig.params = rewardPointsLvlConfig.params.map(lvlSetting => {
                                    if (lvlSetting.levelObjId && oldNewPlayerLevelObjId[String(lvlSetting.levelObjId)]) {
                                        lvlSetting.levelObjId = oldNewPlayerLevelObjId[String(lvlSetting.levelObjId)];
                                    }
                                    return lvlSetting;
                                });
                            }
                            let prom = dbconfig.collection_rewardPointsLvlConfig(rewardPointsLvlConfig).save().catch(errorUtils.reportError);
                            proms.push(prom);
                        });

                        return Promise.all(proms);
                    }
                );

                // 积分活动 - 登入积分、游戏积分
                // rewardPointsEvent
                let copyRewardPointEventProm = dbconfig.collection_rewardPointsEvent.remove({
                    platformObjId: replicateTo._id,
                    category: {$in: [constRewardPointsTaskCategory.LOGIN_REWARD_POINTS, constRewardPointsTaskCategory.TOPUP_REWARD_POINTS]}
                }).then(
                    () => dbconfig.collection_rewardPointsEvent.find({
                        platformObjId: replicateFrom._id,
                        category: {$in: [constRewardPointsTaskCategory.LOGIN_REWARD_POINTS, constRewardPointsTaskCategory.TOPUP_REWARD_POINTS]}
                    }).lean()
                ).then(
                    rewardPointsEvents => {
                        let proms = [];
                        rewardPointsEvents.map(rewardPointsEvent => {
                            delete rewardPointsEvent._id;
                            rewardPointsEvent.platformObjId = replicateTo._id;
                            rewardPointsEvent.level = oldNewPlayerLevelObjId[String(rewardPointsEvent.level)] || rewardPointsEvent.level;

                            let prom = dbconfig.collection_rewardPointsEvent(rewardPointsEvent).save().catch(errorUtils.reportError);
                            proms.push(prom);
                        });

                        return Promise.all(proms);
                    }
                );

                return Promise.all([copyRewardPointsLvlConfigProm, copyRewardPointEventProm]);
            }
        );
    },

    addIpDomainLog: function (platformId, domain, ipAddress, sourceUrl) {
        let platformObjId;
        let todayTime = dbUtility.getTodaySGTime();

        return dbconfig.collection_platform.findOne({
            platformId: platformId
        }, '_id').lean().then(
            platform => {
                if (platform && platform._id) {
                    platformObjId = platform._id;

                    let logQ = {
                        platform: platformObjId,
                        domain: domain,
                        ipAddress: ipAddress,
                        createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    if (sourceUrl) {
                        logQ.sourceUrl = sourceUrl;
                    }

                    return dbconfig.collection_ipDomainLog.findOne(logQ).lean();
                }
            }
        ).then(
            ipDomainLog => {
                if (ipDomainLog) {
                    dbconfig.collection_ipDomainLog.findByIdAndUpdate(ipDomainLog._id, {
                        createTime: new Date()
                    })
                } else {
                    let newLog = {
                        platform: platformObjId,
                        domain: domain,
                        ipAddress: ipAddress,
                        createTime: new Date()
                    };

                    if (sourceUrl) {
                        newLog.sourceUrl = sourceUrl;
                    }

                    dbconfig.collection_ipDomainLog(newLog).save().catch(errorUtils.reportError);
                }
            }
        )
    },

    getIpDomainAnalysis: (platform, startTime, endTime, canRepeat, domain) => {
        if (domain) {
            if (canRepeat) {
                return calculateIpDomainDayAnalysis(platform, startTime, endTime, domain);
            } else {
                return calculateUniqueIpDomainDayAnalysis(platform, startTime, endTime, domain);
            }
        } else {
            if (canRepeat) {
                return calculateIpDomainAnalysis(platform, startTime, endTime);
            } else {
                return calculateUniqueIpDomainAnalysis(platform, startTime, endTime);
            }
        }
    },

    getUniqueIpDomainsWithinTimeFrame: (platform, startTime, endTime) => {
        return dbconfig.collection_ipDomainLog.distinct("domain", {
            platform: platform,
            createTime: {$gte: new Date(startTime), $lt: new Date(endTime)}
        });
    },

    getLockedLobbyConfig: function (platformId) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData && platformData._id) {
                    return dbconfig.collection_gameProviderGroup.find({platform: platformData._id}, {_id:0, name: 1, providerGroupId: 1}).lean()
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            gameProviderGroupData => {
                if (gameProviderGroupData && gameProviderGroupData.length > 0) {
                    gameProviderGroupData.map(providerGroup => {
                        providerGroup.nickName = providerGroup.name;
                        providerGroup.id = providerGroup.providerGroupId;

                        delete providerGroup.name;
                        delete providerGroup.providerGroupId;
                    });
                }

                return gameProviderGroupData ? gameProviderGroupData : [];
            }
        );
    },

    saveFrontEndData: function (platformId, token, page, data) {
        return dbconfig.collection_platform.findOne({platformId: platformId}, {_id: 1}).lean().then(
            platformData => {
                if (platformData && platformData._id) {
                    let query = {
                        platform: platformData._id,
                        page: page
                    };

                    let updateData = {
                        platform: platformData._id,
                        page: page,
                        data: data
                    };

                    return dbconfig.collection_frontendData.findOneAndUpdate(query, updateData,  {upsert: true, new: true}).lean();

                } else {
                    return Promise.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        errorMessage: "Cannot find platform"
                    });
                }
            }
        );
    },

    getFrontEndData: function (platformId, page) {
        return dbconfig.collection_platform.findOne({platformId: platformId}, {_id: 1}).lean().then(
            platformData => {
                if (platformData && platformData._id) {
                    return dbconfig.collection_frontendData.findOne({platform: platformData._id, page: page}).lean().then(
                        frontendData => {
                            return frontendData && frontendData.data ? frontendData.data : "";
                        }
                    );
                } else {
                    return Promise.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        errorMessage: "Cannot find platform"
                    });
                }
            }
        )

    },

    sendFileFTP: function(platformId, token, fileStream, fileName) {
        let ftpClient = new Client();
        let deferred = Q.defer();
        let url = constSystemParam.FTP_URL + "/" + platformId + "/" + fileName;
        let zipFileDirectory = "";
        ftpClient.on('ready', function() {
            if (fileName.includes(".zip")) {
                var zip = new admZip(fileStream);
                var zipEntries = zip.getEntries();
                zipEntries.forEach(function (zipEntry) {
                    let indexOfFileType = fileName.indexOf(".");
                    zipFileDirectory = fileName.substring(0, indexOfFileType);

                    if(!zipEntry.isDirectory){
                        let lastIndex = zipEntry.entryName.lastIndexOf("/") || 0;
                        let directory = zipEntry.entryName.substring(0, lastIndex);
                        let fName = zipEntry.entryName.substring(lastIndex + 1);
                        let zipFileStream = zip.readFile(zipEntry); // decompressed buffer of the entry

                        ftpClient.list("/" + platformId, function(err, list){
                            if (err){
                                deferred.reject({
                                    status: constServerCode.DB_ERROR,
                                    name: "DataError",
                                    errorMessage: "Failed to get folder list: " + err
                                });
                            }

                            let folderIndex = list.findIndex(l => l.name == zipFileDirectory);

                            if(folderIndex > -1){
                                deferred.reject({
                                    status: constServerCode.DB_ERROR,
                                    name: "DataError",
                                    errorMessage: "Folder name exists"
                                });
                            }
                        });

                        ftpClient.mkdir("/" + platformId + "/" + directory, true, function (err) {
                            if (err) {
                                deferred.reject({
                                    status: constServerCode.DB_ERROR,
                                    name: "DataError",
                                    errorMessage: "Failed to create folder: " + err
                                });
                            }

                        });

                        ftpClient.cwd("/" + platformId + "/" + directory, function (err, currentDir) {
                            if (err) {
                                deferred.reject({
                                    status: constServerCode.DB_ERROR,
                                    name: "DataError",
                                    errorMessage: "Change directory failed: " + err
                                });
                            }

                        });

                        ftpClient.put(zipFileStream, fName, function (err) {
                            if (err) {
                                deferred.reject({
                                    status: constServerCode.DB_ERROR,
                                    name: "DataError",
                                    errorMessage: "Failed to create file: " + err
                                });
                            }

                            deferred.resolve({result: "success", url: constSystemParam.FTP_URL + "/" + platformId + "/" + zipFileDirectory});
                            ftpClient.end();
                        });
                    }
                })
            }else if(fileName.includes(".jpg") || fileName.includes(".png")){ // if file type is jpg or png, compress before upload to ftp, max 500 images per month

                let tinify = require('tinify');
                tinify.key = constSystemParam.TINIFY_API_KEY;

                tinify.fromBuffer(fileStream).toBuffer(function(err, buffer){

                    if(err){
                        deferred.reject({
                            status: constServerCode.DB_ERROR,
                            name: "DataError",
                            errorMessage: "Failed to compress file " + err
                        });
                    }
                    //get current directory list
                    ftpClient.list("/", function (err, list) {
                        if (err) {
                            deferred.reject({
                                status: constServerCode.DB_ERROR,
                                name: "DataError",
                                errorMessage: "Failed to get directory list: " + err
                            });
                        }

                        if (list && list.length > 0) {
                            //check if folder is exist in directory
                            let folderIndex = list.findIndex(l => l.name == platformId);
                            if (folderIndex > -1) {
                                ftpClient.cwd(platformId, function (err, currentDir) {
                                    if (err) {
                                        deferred.reject({
                                            status: constServerCode.DB_ERROR,
                                            name: "DataError",
                                            errorMessage: err
                                        });
                                    }

                                    // if folder is exists,  get list and check if file name is exists
                                    ftpClient.list(function (err, fileList) {
                                        if (err) {
                                            deferred.reject({
                                                status: constServerCode.DB_ERROR,
                                                name: "DataError",
                                                errorMessage: "Failed to get directory list: " + err
                                            });
                                        }

                                        if (fileList && fileList.length > 0) {
                                            let fileIndex = fileList.findIndex(f => f.name == fileName);
                                            if (fileIndex > -1) {
                                                deferred.reject({
                                                    status: constServerCode.DB_ERROR,
                                                    name: "DataError",
                                                    errorMessage: "File name exists"
                                                });
                                            }
                                        }

                                        ftpClient.put(buffer, fileName, function (err) {
                                            if (err) {
                                                deferred.reject({
                                                    status: constServerCode.DB_ERROR,
                                                    name: "DataError",
                                                    errorMessage: "Failed to create file: " + err
                                                });
                                            }

                                            deferred.resolve({result: "success", url: url});
                                            ftpClient.end();
                                        });
                                    });
                                });
                            }
                        }else{
                            ftpClient.mkdir(platformId, false, function(err){
                                if(err) {
                                    deferred.reject({
                                        status: constServerCode.DB_ERROR,
                                        name: "DataError",
                                        errorMessage: "Failed to create folder: " + err
                                    });
                                }

                                ftpClient.cwd(platformId, function (err, currentDir) {
                                    if(err){
                                        deferred.reject({
                                            status: constServerCode.DB_ERROR,
                                            name: "DataError",
                                            errorMessage: err
                                        });
                                    }

                                    ftpClient.put(fileStream, fileName, function (err) {
                                        if (err) {
                                            deferred.reject({
                                                status: constServerCode.DB_ERROR,
                                                name: "DataError",
                                                errorMessage: "Failed to create file: " + err
                                            });
                                        }

                                        deferred.resolve({result: "success", url: url});
                                        ftpClient.end();
                                    });
                                });
                            });
                        };
                    });
                });
            }else{ // any type other than .zip, .jpg and .png
                //get current directory list
                ftpClient.list("/", function (err, list) {
                    if (err) {
                        deferred.reject({
                            status: constServerCode.DB_ERROR,
                            name: "DataError",
                            errorMessage: "Failed to get directory list: " + err
                        });
                    }

                    if (list && list.length > 0) {
                        //check if folder is exist in directory
                        let folderIndex = list.findIndex(l => l.name == platformId);
                        if (folderIndex > -1) {
                            ftpClient.cwd(platformId, function (err, currentDir) {
                                if (err) {
                                    deferred.reject({
                                        status: constServerCode.DB_ERROR,
                                        name: "DataError",
                                        errorMessage: err
                                    });
                                }

                                // if folder is exists,  get list and check if file name is exists
                                ftpClient.list(function (err, fileList) {
                                    if (err) {
                                        deferred.reject({
                                            status: constServerCode.DB_ERROR,
                                            name: "DataError",
                                            errorMessage: "Failed to get directory list: " + err
                                        });
                                    }

                                    if (fileList && fileList.length > 0) {
                                        let fileIndex = fileList.findIndex(f => f.name == fileName);
                                        if (fileIndex > -1) {
                                            deferred.reject({
                                                status: constServerCode.DB_ERROR,
                                                name: "DataError",
                                                errorMessage: "File name exists"
                                            });
                                        }
                                    }

                                    ftpClient.put(fileStream, fileName, function (err) {
                                        if (err) {
                                            deferred.reject({
                                                status: constServerCode.DB_ERROR,
                                                name: "DataError",
                                                errorMessage: "Failed to create file: " + err
                                            });
                                        }

                                        deferred.resolve({result: "success", url: url});
                                        ftpClient.end();
                                    });
                                });
                            });
                        }
                    }else{
                        ftpClient.mkdir(platformId, false, function(err){
                            if(err) {
                                deferred.reject({
                                    status: constServerCode.DB_ERROR,
                                    name: "DataError",
                                    errorMessage: "Failed to create folder: " + err
                                });
                            }

                            ftpClient.cwd(platformId, function (err, currentDir) {
                                if(err){
                                    deferred.reject({
                                        status: constServerCode.DB_ERROR,
                                        name: "DataError",
                                        errorMessage: err
                                    });
                                }

                                ftpClient.put(fileStream, fileName, function (err) {
                                    if (err) {
                                        deferred.reject({
                                            status: constServerCode.DB_ERROR,
                                            name: "DataError",
                                            errorMessage: "Failed to create file: " + err
                                        });
                                    }

                                    deferred.resolve({result: "success", url: url});
                                    ftpClient.end();
                                });
                            });
                        });
                    };
                });
            }
        });

        ftpClient.connect(constSystemParam.FTP_CONNECTION_PROPERTIES);

        return deferred.promise;

    },
};

function getPlatformStringForCallback(platformStringArray, playerId, lineId) {
    lineId = lineId || 0;
    let platformString = "";

    let requiredLevelProm = "";
    platformStringArray.map(line => {
        if (lineId == line.lineId) {
            platformString = line.lineName;
            if (line.minLevel) {
                requiredLevelProm = dbconfig.collection_playerLevel.findOne({_id: line.minLevel}).lean();
            }
        }
    });

    if (!platformString) {
        return Promise.reject({message: "Invalid line ID"});
    }

    if (!requiredLevelProm) {
        return platformString;
    }

    let playerProm = "";
    if (playerId) {
        playerProm = dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "playerLevel",
            model: dbconfig.collection_playerLevel
        }).lean();
    }

    if (!playerProm) {
        return Promise.reject({message: "Please login and try again"});
    }

    return Promise.all([requiredLevelProm, playerProm]).then(
        data => {
            let requiredPlayerLevel, player;
            ([requiredPlayerLevel, player] = data);

            if (!requiredPlayerLevel) {
                return platformString;
            }

            if (!player || !player.playerLevel || requiredPlayerLevel.value < player.playerLevel.value) {
                return Promise.reject({message: "Player level is not enough"});
            }

            return platformString;
        }
    );
}

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

function calculatePartnerCommissionInfo(platformObjId, commissionType, startTime, endTime, isSkip) {
    let stream = dbconfig.collection_partner.find({
        platform: platformObjId,
        commissionType: commissionType
    }, {_id: 1}).cursor({batchSize: 100});

    let balancer = new SettlementBalancer();
    return balancer.initConns().then(function () {
        return balancer.processStream(
            {
                stream: stream,
                batchSize: 100,
                makeRequest: function (partners, request) {
                    request("player", "settlePartnersCommission", {
                        commissionType: commissionType,
                        startTime: startTime,
                        endTime: endTime,
                        isSkip: Boolean(isSkip),
                        partnerObjIdArr: partners.map(function (partner) {
                            return partner._id;
                        })
                    });
                }
            }
        );
    });
}

function excludeTelNum(data){
    // mask tel number
    data = data.map(item=>{
        if(item.tel){
            item.tel = dbUtility.encodePhoneNum(item.tel);
        }
        if(item.error && item.error.tel){
            item.error.tel = dbUtility.encodePhoneNum(item.error.tel);
        }
        return item;
    })
    return data;
}

function calculateIpDomainDayAnalysis (platform, startTime, endTime, domain) {
    let timeFrames = dbUtility.sliceTimeFrameToDaily(startTime, endTime);

    let proms = [];

    timeFrames.map(timeFrame => {
        let ipDomainCountProm = dbconfig.collection_ipDomainLog.find({
            createTime: {
                $gte: timeFrame.startTime,
                $lt: timeFrame.endTime
            },
            platform: platform,
            domain: domain
        }).count().read("secondaryPreferred");

        proms.push(ipDomainCountProm);
    });

    return Promise.all(proms).then(
        ipDomainCounts => {
            let output = [];
            if (ipDomainCounts && ipDomainCounts.length) {
                for (let i = 0; i < timeFrames.length; i++) {
                    let dayCount = {
                        date: timeFrames[i].startTime,
                        count: ipDomainCounts[i] || 0
                    };
                    output.push(dayCount);
                }
            }
            return output;
        }
    );
}

function calculateUniqueIpDomainDayAnalysis (platform, startTime, endTime, domain) {
    let timeFrames = dbUtility.sliceTimeFrameToDaily(startTime, endTime);

    let proms = [];

    timeFrames.map(timeFrame => {
        let ipDomainCountProm = dbconfig.collection_ipDomainLog.aggregate([
            {
                $match: {
                    createTime: {
                        $gte: timeFrame.startTime,
                        $lt: timeFrame.endTime
                    },
                    platform: ObjectId(platform),
                    domain: domain
                }
            }, {
                $group: {
                    _id: "$ipAddress"
                }
            }, {
                $group: {
                    _id: null,
                    count: {$sum: 1}
                }
            }
        ]).read("secondaryPreferred");

        proms.push(ipDomainCountProm);
    });

    return Promise.all(proms).then(
        ipDomainCounts => {
            let output = [];
            if (ipDomainCounts && ipDomainCounts.length) {
                for (let i = 0; i < timeFrames.length; i++) {
                    let dayCount = {
                        date: timeFrames[i].startTime,
                        count: ipDomainCounts[i] && ipDomainCounts[i][0] && ipDomainCounts[i][0].count || 0
                    };
                    output.push(dayCount);
                }
            }
            return output;
        }
    );
}

function calculateIpDomainAnalysis (platform, startTime, endTime) {
    return dbconfig.collection_ipDomainLog.aggregate([
        {
            $match: {
                createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                platform: ObjectId(platform)
            }
        }, {
            $group: {
                _id: "$domain",
                count: {$sum: 1}
            }
        }
    ]).read("secondaryPreferred").then(
        data => {
            let output = [];
            if (data && data.length) {
                data.map(domain => {
                    let domainData = {};
                    domainData.domain = domain._id;
                    domainData.count = domain.count;
                    output.push(domainData);
                });
            }
            return output;
        }
    );
}

function calculateUniqueIpDomainAnalysis (platform, startTime, endTime) {
    return dbconfig.collection_ipDomainLog.aggregate([
        {
            $match: {
                createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                platform: ObjectId(platform)
            }
        }, {
            $group: {
                _id: {domain: "$domain", ipAddress: "$ipAddress"}
            }
        }, {
            $group: {
                _id: "$_id.domain",
                count: {$sum: 1}
            }
        }
    ]).read("secondaryPreferred").then(
        data => {
            let output = [];
            if (data && data.length) {
                data.map(domain => {
                    let domainData = {};
                    domainData.domain = domain._id;
                    domainData.count = domain.count;
                    output.push(domainData);
                });
            }
            return output;
        }
    );
}

var proto = dbPlatformFunc.prototype;
proto = Object.assign(proto, dbPlatform);

module.exports = dbPlatform;
