var Q = require("q");
var geoip = require('geoip-lite');
var queryPhoneLocation = require('query-mobile-phone-area');
var encrypt = require('./../modules/encrypt');
var dbconfig = require("../modules/dbproperties");
var dbDepartment = require("../db_modules/dbDepartment");
var dbAdminInfo = require("../db_modules/dbAdminInfo");
var dbPlatform = require("../db_modules/dbPlatform");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");
var dbPlayerConsumptionRecord = require("../db_modules/dbPlayerConsumptionRecord");
var dbPlayerTopUpRecord = require("../db_modules/dbPlayerTopUpRecord");
var dbPlayerFeedback = require("../db_modules/dbPlayerFeedback");
var dbPartner = require("../db_modules/dbPartner");
var pmsAPI = require("../externalAPI/pmsAPI");
var serverInstance = require("../modules/serverInstance");
const constPlayerLevel = require("../const/constPlayerLevel");
const constProposalStatus = require('../const/constProposalStatus');
const constProposalMainType = require('../const/constProposalMainType');
const constProposalType = require('../const/constProposalType');
const constRewardTaskStatus = require('../const/constRewardTaskStatus');
var dbProposal = require('../db_modules/dbProposal');
var dbLogger = require('../modules/dbLogger');
var proposalExecutor = require('../modules/proposalExecutor');
var moment = require('moment-timezone');

var dbMigration = {

    errorHandler: function (service, functionName, data, error) {
        //tmp error log for debugging
        console.error(service, functionName, data, error);
        dbLogger.createDataMigrationErrorLog(service, functionName, data, error);
        //dbMigration.removeRequestId(data.requestId);
        return Q.reject(error);
    },

    resHandler: function (data, service, functionName) {
        dbLogger.createSyncDataLog(service, functionName, data);
        return data;
    },

    createRequestId: function (requestId) {
        var newRequestId = new dbconfig.collection_syncDataRequestId({requestId: requestId});
        return newRequestId.save();
    },

    removeRequestId: function (requestId) {
        dbconfig.collection_syncDataRequestId.remove({requestId: requestId}).then();
    },

    createDepartment: function (data) {
        data.departmentName = data.name;
        //default parent is admin department
        if (!data.parent) {
            data.parent = "admin";
        }
        //create department under admin
        return dbMigration.createRequestId(data.requestId).then(
            reId => {
                return dbconfig.collection_department.findOne({departmentName: data.parent});
            }
        ).then(
            rootDepart => {
                if (rootDepart) {
                    data.parent = rootDepart._id;
                    return dbDepartment.createDepartmentWithParent(data);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find root department"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "admin", "createDepartment"),
            error => dbMigration.errorHandler("admin", "createDepartment", data, error)
        );
    },

    createUser: function (data) {
        data.adminName = data.name;
        data.password = "Ms1234%"; //default password
        var salt = encrypt.generateSalt();
        var hashpassword = encrypt.createHash(data.password, salt);
        data.password = hashpassword;
        data.salt = salt;

        if (data.department) {
            //create department under admin
            return dbMigration.createRequestId(data.requestId).then(
                reId => {
                    return dbconfig.collection_department.findOne({departmentName: data.department});
                }
            ).then(
                depart => {
                    if (depart) {
                        data.departments = [depart._id];
                        return dbAdminInfo.createAdminUserWithDepartment(data);
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can not find root department"});
                    }
                }
            ).then(
                res => dbMigration.resHandler(data, "admin", "createUser"),
                error => dbMigration.errorHandler("admin", "createUser", data, error)
            );
        }
        else {
            var error = {name: "DataError", message: "Invalid data", error: "department is required"};
            dbLogger.createDataMigrationErrorLog("admin", "createUser", data, error);
            return Q.reject(error);
            // We could probably do that in two lines:
            //var error = {name: "DataError", message: "Invalid data", error: "department is required"};
            //return dbMigration.errorHandler("admin", "createUser", data, error);
        }
    },

    createPlatform: function (data) {
        return dbMigration.createRequestId(data.requestId).then(
            reId => {
                return dbPlatform.createPlatform(data);
            }
        ).then(
            res => dbMigration.resHandler(data, "admin", "createPlatform"),
            error => dbMigration.errorHandler("player", "createPlatform", data, error)
        );
    },

    createPlayer: function (data) {
        if (data.lastLoginIp) {
            var geo = geoip.lookup(data.lastLoginIp);
            if (geo) {
                data.country = geo.country;
                data.city = geo.city;
                data.longitude = geo.ll ? geo.ll[1] : null;
                data.latitude = geo.ll ? geo.ll[0] : null;
            }
        }

        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.type;
            }
        }

        return dbconfig.collection_platform.findOne({platformId: data.platform}).lean().then(
            platformData => {
                if (platformData) {
                    data.platform = platformData._id;
                    var playerLevel = data.playerLevel ? data.playerLevel : 0;
                    return dbconfig.collection_playerLevel.findOne({value: playerLevel, platform: platformData._id})
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerLevelData => {
                if (playerLevelData) {
                    data.playerLevel = playerLevelData._id;
                    // return dbPlayerInfo.createPlayerInfo(data);
                    return data;
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player level"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    if (playerData.partner) {
                        //add partner to player if this player has partner
                        return dbconfig.collection_partner.findOne({partnerName: playerData.partner}).then(
                            partnerData => {
                                if (partnerData) {
                                    playerData.partner = partnerData._id;
                                    return playerData;
                                }
                                else {
                                    return Q.reject({name: "DataError", message: "Can not find player partner"});
                                }
                            }
                        );
                    }
                    else {
                        return playerData;
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            //find bank name id based on code
            playerData => {
                if (playerData.bankName != null) {
                    return pmsAPI.bankcard_getBankTypeList({}).then(
                        list => {
                            if (list && list.data && list.data.length > 0) {
                                var type = list.data.find(bankType => bankType.bankTypeId == data.bankName);
                                if (type) {
                                    playerData.bankName = type.id;
                                    return data;
                                }
                                else {
                                    return Q.reject({name: "DataError", message: "Can not find bank type id"});
                                }
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Can not find bank type list"});
                            }
                        }
                    );
                }
                else {
                    return playerData;
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return dbPlayerInfo.createPlayerInfo(playerData, true, true);
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    dbPlayerInfo.updateGeoipws(playerData._id, playerData.platform, playerData.lastLoginIp);
                    return dbPlayerInfo.findAndUpdateSimilarPlayerInfo(playerData, data.phoneNumber);
                }
                else {
                    return playerData;
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "admin", "createPlayer"),
            error => dbMigration.errorHandler("player", "createPlayer", data, error)
        );
    },

    createPlayerConsumptionRecord: function (data) {
        var platformId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {

                    platformId = platformData._id;
                    var playerProm = dbconfig.collection_players.findOne({name: data.playerName, platform: platformId});
                    var providerProm = dbconfig.collection_gameProvider.findOne({code: data.provider});
                    return Q.all([playerProm, providerProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerProviderData => {
                if (playerProviderData && playerProviderData[0] && playerProviderData[1]) {
                    data.platformId = platformId;
                    data.playerId = playerProviderData[0]._id;
                    data.providerId = playerProviderData[1]._id;
                    var aliasQuery = ".*" + data.game + "*.";
                    return dbconfig.collection_game.findOne(
                        {
                            $or: [{code: data.game}, {aliasCode: {$regex: aliasQuery}}, {code: data.game + "_h5"}],
                            provider: playerProviderData[1]._id
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", message: "Can not find player or game provider"});
                }
            }
        ).then(
            gameData => {
                if (gameData) {
                    data.gameId = gameData._id;
                    data.gameType = gameData.type;

                    delete data.playerName;
                    delete data.platform;
                    delete data.game;
                    return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(data);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find game"});
                }
            }
        ).then(
            dbMigration.resHandler,
            error => {
                if (error && error.message) {
                    error.message += " orderNo:" + data.orderNo;
                }
                return dbMigration.errorHandler("player", "createPlayerConsumptionRecord", data, error)
            }
        );
    },

    createPlayerTopUpRecord: function (data) {
        var platformObjId = null;
        var playerObj = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    return dbconfig.collection_players.findOne({name: data.playerName, platform: platformObjId});
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    data.playerId = playerData._id;
                    data.platformId = platformObjId;
                    delete data.playerName;
                    delete data.platform;
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return dbPlayerTopUpRecord.createPlayerTopUpRecord(data);
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            record => {
                return dbconfig.collection_players.findOneAndUpdate(
                    {_id: playerObj._id, platform: playerObj.platform},
                    {
                        $inc: {
                            //validCredit: amount,
                            topUpSum: data.amount,
                            //dailyTopUpSum: amount,
                            //weeklyTopUpSum: amount,
                            topUpTimes: 1,
                            creditBalance: data.amount
                        }
                    }
                )
            }
        ).then(
            rest => dbMigration.resHandler(data, "player", "createPlayerTopUpRecord"),
            error => dbMigration.errorHandler("player", "createPlayerTopUpRecord", data, error)
        );
    },

    createPlayerFeedback: function (data) {
        var platformId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformId = platformData._id;
                    var playerProm = dbconfig.collection_players.findOne({name: data.playerName, platform: platformId});
                    var adminProm = dbconfig.collection_admin.findOne({adminName: data.creator});
                    return Q.all([playerProm, adminProm]);
                }
            }
        ).then(
            promData => {
                if (promData && promData[0] && promData[1]) {
                    data.adminId = promData[1]._id;
                    data.playerId = promData[0]._id;
                    delete data.playerName;
                    //delete data.platform;
                    data.platform = platformId;
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return dbPlayerFeedback.createPlayerFeedback(data);
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player or admin"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "createPlayerFeedback"),
            error => {
                return dbMigration.errorHandler("player", "createPlayerFeedback", data, error)
            }
        );
    },

    createPlayerLoginRecord: function (data) {
        var platformId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformId = platformData._id;
                    var playerProm = dbconfig.collection_players.findOne({name: data.playerName, platform: platformId});
                    return Q.resolve(playerProm);
                }
            }
        ).then(
            promData => {
                if (promData) {
                    data.player = promData._id;
                    delete data.playerName;
                    //delete data.platform; 
                    data.platform = platformId;
                    data.loginTime = data.loginTime ? new Date(data.loginTime) : null;
                    data.logoutTime = data.logoutTime ? new Date(data.logoutTime) : null;
                    data.userAgent = data.userAgent || {};
                    data.data = data.data
                    var record = new dbconfig.collection_playerLoginRecord(data);
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return record.save();
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", message: "Can not find player or admin"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "createPlayerLoginRecord"),
            error => dbMigration.errorHandler("player", "createPlayerLoginRecord", data, error)
        );
    },

    createPlayerCreditTransferLog: function (data) {
        var platformObjId = null;
        var saveData = {};
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    saveData.platformId = platformData.platformId;
                    var playerProm = dbconfig.collection_players.findOne({
                        name: data.playerName,
                        platform: platformObjId
                    });
                    var providerProm = dbconfig.collection_gameProvider.findOne({code: data.providerCode});
                    return Q.all([playerProm, providerProm]);
                }
            }
        ).then(
            dbData => {
                if (dbData && dbData[0] && dbData[1]) {
                    var promData = dbData[0], provider = dbData[1];
                    saveData.playerObjId = promData._id;
                    saveData.platformObjId = platformObjId;
                    saveData.adminName = data.adminName;
                    saveData.playerId = promData.playerId;
                    saveData.type = data.type;
                    saveData.transferId = data.transferId;
                    saveData.providerId = provider.providerId;
                    saveData.amount = data.amount;
                    saveData.lockedAmount = data.lockedAmount;
                    saveData.createTime = data.createTime ? new Date(data.createTime) : null;
                    saveData.apiRes = data.apiRes;
                    saveData.data = data.data
                    var record = new dbconfig.collection_playerCreditTransferLog(saveData);
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return record.save();
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", message: "Can not find player or admin or provider"});
                }
            }
        ).then(
            rest => dbMigration.resHandler(data, "player", "createPlayerLoginRecord"),
            error => dbMigration.errorHandler("player", "createPlayerLoginRecord", data, error)
        );
    },

    createProposal: function (typeName, platform, creator, creatorType, createTime, entryType, userType, status, proposalData, inputData) {
        var creatorObj = {};
        creatorType = creatorType || 'system';
        var prom1 = Q.resolve({});
        if (creatorType == 'admin') {
            prom1 = dbconfig.collection_admin.findOne({adminName: creator});
        } else if (creatorType == 'player') {
            prom1 = dbconfig.collection_players.findOne({name: creator});
        }
        var prom2 = dbconfig.collection_platform.findOne({platformId: platform});
        var prom3 = Q.resolve({});
        if (proposalData && proposalData.loginname) {
            prom3 = dbconfig.collection_players.findOne({name: proposalData.loginname});
        }
        return Q.all([prom1, prom2, prom3]).then(
            data => {
                if (data && data[1]) {
                    var platformObj = data[1], user = data[0], player = data[2];
                    if (user) {
                        if (creatorType == 'admin') {
                            creatorObj = {
                                name: user.adminName,
                                type: 'admin',
                                id: user._id
                            };
                        } else if (creatorType == 'player') {
                            creatorObj = {
                                name: user.name,
                                type: 'player',
                                id: user._id
                            };
                            proposalData.playerObjId = user._id;
                            proposalData.playerId = user._id;
                            proposalData.playerShorId = user.playerId;
                            proposalData.platformObjId = user.platform;
                            proposalData.platformId = platform;
                            proposalData.playerName = user.name;
                        }
                    }
                    if (player) {
                        proposalData.playerObjId = player._id;
                        proposalData.playerId = player._id;
                        proposalData.playerShorId = player.playerId;
                        proposalData.platformObjId = player.platform;
                        proposalData.platformId = platform;
                        proposalData.playerName = player.name;
                    }
                    var newProposalData = proposalData;
                    return dbMigration.proposalDataConverter(typeName, proposalData).then(
                        convertData => {
                            newProposalData = convertData;
                            return dbconfig.collection_proposalType.findOne({
                                platformId: platformObj._id,
                                name: typeName
                            })
                        }
                    ).then(
                        proposalType => {
                            if (proposalType) {
                                createTime = createTime || new Date();

                                var expiredDate = moment(createTime).add('hour', proposalType.expirationDuration).format('YYYY-MM-DD HH:mm:ss.sss');
                            
                                var newRecord = {
                                    mainType: constProposalMainType[typeName],
                                    type: proposalType._id,
                                    creator: creatorObj,
                                    createTime: createTime,
                                    data: newProposalData,
                                    entryType: entryType,
                                    userType: userType,
                                    status: status,
                                    noSteps: true,
                                    expirationTime: expiredDate
                                };
                                return dbMigration.createRequestId(inputData.requestId).then(
                                    reId => {
                                        return dbProposal.createProposal(newRecord);
                                    }
                                ).then(
                                    data => {
                                        return data;
                                    },
                                    err => {
                                        dbMigration.removeRequestId(data.requestId);
                                        return Q.reject({
                                            name: "DataError",
                                            message: "Error when creating proposal.",
                                            err: err
                                        });
                                    }
                                );
                            } else {
                                return Q.reject({name: "DataError", message: "Can not find proposalType in platform"});
                            }
                        }
                    )
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            },
            err => {
                return Q.reject({name: "DataError", message: "Can not find platform or creator", err: err});
            }
        ).then(
            proposal => {
                if (proposal) {
                    //if it is top up proposal and successful, create top up record
                    if ((typeName == constProposalType.PLAYER_TOP_UP || typeName == constProposalType.PLAYER_MANUAL_TOP_UP || typeName == constProposalType.PLAYER_ALIPAY_TOP_UP)
                        && status == constProposalStatus.SUCCESS) {
                        var record = {
                            playerName: String(proposalData.playerName).toLowerCase(),
                            platform: platform,
                            amount: proposalData.amount,
                            topUpType: typeName == constProposalType.PLAYER_TOP_UP ? 2 : (typeName == constProposalType.PLAYER_MANUAL_TOP_UP ? 1 : 3),
                            createTime: createTime,
                            bDirty: false,
                            proposalId: proposal.proposalId,
                            requestId: inputData.requestId + proposal.proposalId
                        };
                        return dbMigration.createPlayerTopUpRecord(record);
                    }
                }
            }
        ).then(
            res => dbMigration.resHandler(inputData, "proposal", "createProposal"),
            error => dbMigration.errorHandler("proposal", "createProposal", inputData, error)
        );
    },

    createPartner: function (data) {
        return dbconfig.collection_platform.findOne({platformId: data.platform}).lean().then(
            platformData => {
                if (platformData) {
                    data.platform = platformData._id;
                    if (data.parent) {
                        return dbconfig.collection_partner.findOne({partnerName: data.parent.toLowerCase()}).lean().then(
                            parentData => {
                                if (parentData) {
                                    data.parent = parentData._id;
                                    return data;
                                }
                                else {
                                    return Q.reject({name: "DataError", message: "Can not find parent partner"});
                                }
                            }
                        );
                    }
                    else {
                        return data;
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            //find bank name id based on code
            partnerData => {
                if (data.bankName != null) {
                    return pmsAPI.bankcard_getBankTypeList({}).then(
                        list => {
                            if (list && list.data && list.data.length > 0) {
                                var type = list.data.find(bankType => bankType.bankTypeId == data.bankName);
                                if (type) {
                                    data.bankName = type.id;
                                    return data;
                                }
                                else {
                                    return Q.reject({name: "DataError", message: "Can not find bank type id"});
                                }
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Can not find bank type list"});
                            }
                        }
                    );
                }
                else {
                    return partnerData;
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    if (partnerData.parent) {
                        return dbPartner.createPartnerWithParent(partnerData);
                    }
                    else {
                        return dbPartner.createPartner(partnerData);
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid partner data"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "partner", "createPartner"),
            error => dbMigration.errorHandler("partner", "createPartner", data, error)
        );
    },

    createPartnerLoginRecord: function (data) {
        var platformId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformId = platformData._id;
                    return dbconfig.collection_partner.findOne({
                        partnerName: data.partnerName,
                        platform: platformId
                    }).lean();
                }
            }
        ).then(
            promData => {
                if (promData) {
                    data.partner = promData._id;
                    delete data.partnerName;
                    //delete data.platform; 
                    data.platform = platformId;
                    data.loginTime = data.loginTime ? new Date(data.loginTime) : null;
                    data.logoutTime = data.logoutTime ? new Date(data.logoutTime) : null;
                    data.userAgent = data.userAgent || {};
                    data.data = data.data;
                    var record = new dbconfig.collection_partnerLoginRecord(data);
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return record.save();
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", message: "Can not find partner"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "createPartnerLoginRecord"),
            error => dbMigration.errorHandler("player", "createPartnerLoginRecord", data, error)
        );
    },

    createPlayerRewardTask: function (data) {
        var platformObjId = null;
        var playerObjId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).lean().then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    data.platformId = platformData._id;
                    return dbconfig.collection_players.findOne({name: data.playerName, platform: platformObjId}).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObjId = playerData._id;
                    data.playerId = playerData._id;
                    if (data.targetProviders && data.targetProviders.length > 0) {
                        return dbconfig.collection_gameProvider.find({name: {$in: data.targetProviders}}).lean();
                    }
                    else {
                        return null;
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            providerData => {
                if (providerData && providerData.length > 0) {
                    data.targetProviders = providerData.map(provider => provider._id);
                }
                else {
                    delete data.targetProviders;
                }
                //check if this player has pending reward task
                if (!data.status || data.status == constRewardTaskStatus.STARTED) {
                    return dbconfig.collection_rewardTask.findOne({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }).lean();
                }
                else {
                    return null;
                }
            }
        ).then(
            taskData => {
                if (!taskData) {
                    var rewardTask = new dbconfig.collection_rewardTask(data);
                    return dbMigration.createRequestId(data.requestId).then(
                        reId => {
                            return rewardTask.save();
                        }
                    ).then(
                        newTask => {
                            if (data.status == constRewardTaskStatus.STARTED && !data.inProvider) {
                                return dbconfig.collection_players.findOneAndUpdate(
                                    {_id: playerObjId, platform: data.platformId},
                                    {lockedCredit: data.currentAmount}
                                );
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "This player already has started reward task"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "createPlayerRewardTask"),
            error => dbMigration.errorHandler("player", "createPlayerRewardTask", data, error)
        );
    },

    proposalDataConverter: function (type, proposalData) {
        var convertData = Object.assign({}, proposalData);
        switch (type) {
            case constProposalType.PLAYER_TOP_UP:
            case constProposalType.PLAYER_ALIPAY_TOP_UP:
                convertData.platform = proposalData.platformObjId;
                convertData.playerName = proposalData.loginname;
                break;
            case constProposalType.PLAYER_MANUAL_TOP_UP:
                convertData.platform = proposalData.platformObjId;
                convertData.playerName = proposalData.loginname;
                convertData.depositMethod = dbMigration.getDepositMethod(proposalData.manner);
                convertData.bankCardNo = proposalData.accountNo;
                return dbMigration.getPaymentCityInfo(proposalData).then(
                    cityInfo => {
                        var cityData = cityInfo || {};
                        convertData.provinceId = cityData.provinceId;
                        convertData.cityId = cityData.cityId;
                        convertData.districtId = cityData.districtId;

                        return pmsAPI.bankcard_getBankTypeList({
                            platformId: proposalData.platformId,
                            queryId: serverInstance.getQueryId()
                        });
                    }
                ).then(
                    cList => {
                        if (cList && cList.data && cList.data.length > 0) {
                            for (var i = 0; i < cList.data.length; i++) {
                                if (cList.data[i].name.indexOf(proposalData.corpBankName) >= 0 || (proposalData.corpBankName && proposalData.corpBankName.indexOf(cList.data[i].name) >= 0)) {
                                    convertData.bankTypeId = cList.data[i].id;
                                    convertData.bankCardType = cList.data[i].id;
                                }
                            }
                        }
                        return convertData;
                    }
                );
                break;
            default:
                convertData.platform = proposalData.platformObjId;
                convertData.playerName = proposalData.loginname;
                break;
        }
        return Q.resolve(convertData);
    },

    getDepositMethod: function (manner) {
        switch (manner) {
            case "网银转账":
                return 1;
            case "ATM":
                return 2;
            default:
                return 3;
        }
    },

    getPaymentCityInfo: function (proposalData) {
        var provinceId = null;
        var cityId = null;
        var districtId = null;

        return pmsAPI.foundation_getProvinceList({}).then(
            pList => {
                if (pList && pList.provinces && pList.provinces.length > 0) {
                    for (var i = 0; i < pList.provinces.length > 0; i++) {
                        if (pList.provinces[i].name == proposalData.province) {
                            provinceId = pList.provinces[i].id;
                            return pmsAPI.foundation_getCityList({provinceId: provinceId});
                        }
                    }
                }
            }
        ).then(
            cList => {
                if (cList && cList.cities && cList.cities.length > 0) {
                    for (var i = 0; i < cList.cities.length > 0; i++) {
                        if (cList.cities[i].name == proposalData.city) {
                            cityId = cList.cities[i].id;
                            return pmsAPI.foundation_getDistrictList({provinceId: provinceId, cityId: cityId});
                        }
                    }
                }
            }
        ).then(
            dList => {
                if (dList && dList.districts && dList.districts.length > 0) {
                    for (var i = 0; i < dList.districts.length > 0; i++) {
                        if (dList.districts[i].name == proposalData.country) {
                            districtId = dList.districts[i].id;
                        }
                    }
                }
                return {
                    provinceId: provinceId,
                    cityId: cityId,
                    districtId: districtId
                };
            },
            error => {
                return {};
            }
        );
    },

    createPlayerCreditChangeLog: function (data) {
        var platformObjId = null;
        var playerObjId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).lean().then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    data.platformId = platformData._id;
                    return dbconfig.collection_players.findOne({name: data.playerName, platform: platformObjId}).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObjId = playerData._id;
                    data.playerId = playerData._id;
                    if (data.data && data.data.pno) {
                        return dbconfig.collection_proposal.findOne({"data.pno": data.data.pno}).then(
                            proposalData => {
                                if (proposalData) {
                                    data.data.proposalId = proposalData.proposalId;
                                }
                                return data;
                            }
                        );
                    }
                    else {
                        return data;
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player data"});
                }
            }
        ).then(
            data => {
                var record = new dbconfig.collection_creditChangeLog(data);
                return dbMigration.createRequestId(data.requestId).then(
                    reId => {
                        return record.save();
                    }
                );
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "createPlayerCreditChangeLog"),
            error => dbMigration.errorHandler("player", "createPlayerCreditChangeLog", data, error)
        );
    },

    createPlayerClientSourceLog: function (data) {
        var record = new dbconfig.collection_playerClientSourceLog(data);
        return dbMigration.createRequestId(data.requestId).then(
            reId => {
                return record.save();
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "createPlayerClientSourceLog"),
            error => dbMigration.errorHandler("player", "createPlayerClientSourceLog", data, error)
        );
    },

    addPlayerPartner: function (data) {
        var playerObj = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({
                        platform: platformData._id,
                        name: data.playerName.toLowerCase()
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    return dbconfig.collection_partner.findOne({
                        platform: playerData.platform,
                        partnerName: data.partnerName.toLowerCase()
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    return dbconfig.collection_players.findOneAndUpdate({
                        _id: playerObj._id,
                        platform: playerObj.platform
                    }, {partner: partnerData._id});
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find partner"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "addPlayerPartner"),
            error => dbMigration.errorHandler("player", "addPlayerPartner", data, error)
        );
    },

    addPlayerReferral: function (data) {
        var playerObj = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({
                        platform: platformData._id,
                        name: data.playerName
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    return dbconfig.collection_players.findOne({
                        platform: playerData.platform,
                        name: data.referralName
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            referralData => {
                if (referralData) {
                    return dbconfig.collection_players.findOneAndUpdate({
                        _id: playerObj._id,
                        platform: playerObj.platform
                    }, {referral: referralData._id});
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find referral"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "addPlayerReferral"),
            error => dbMigration.errorHandler("player", "addPlayerReferral", data, error)
        );
    },

    updateLastPlayedProvider: function (inputData) {
        var platformProm = dbconfig.collection_platform.findOne({platformId: inputData.platform}).lean();
        var providerProm = dbconfig.collection_gameProvider.findOne({providerId: inputData.providerId}).lean();

        return Q.all([platformProm, providerProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    return dbconfig.collection_players.findOne({
                        name: inputData.playerName,
                        platform: data[0]._id
                    }).then(
                        playerData => {
                            if (playerData) {
                                playerData.lastPlayedProvider = data[1]._id;
                                return playerData.save();
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Can not find player"});
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform or provider"});
                }
            }
        ).then(
            res => dbMigration.resHandler(inputData, "player", "updateLastPlayedProvider"),
            error => dbMigration.errorHandler("player", "updateLastPlayedProvider", inputData, error)
        );
    },

    updatePlayerCredit: function (inputData) {
        return dbconfig.collection_platform.findOne({platformId: inputData.platform}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({
                        name: inputData.playerName,
                        platform: platformData._id
                    }).then(
                        playerData => {
                            if (playerData) {
                                playerData.validCredit = inputData.validCredit;
                                return playerData.save();
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Can not find player"});
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            res => dbMigration.resHandler(inputData, "player", "updatePlayerCredit"),
            error => dbMigration.errorHandler("player", "updatePlayerCredit", inputData, error)
        );
    },

    updatePlayerLevel: function (inputData) {
        return dbconfig.collection_platform.findOne({platformId: inputData.platform}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({
                        name: inputData.playerName,
                        platform: platformData._id
                    }).then(
                        playerData => {
                            if (playerData) {
                                return dbconfig.collection_playerLevel.findOne({
                                    platform: playerData.platform,
                                    name: inputData.levelName
                                }).then(
                                    levelData => {
                                        if (levelData) {
                                            playerData.playerLevel = levelData._id;
                                            return playerData.save();
                                        }
                                        else {
                                            return Q.reject({name: "DataError", message: "Can not find player level"});
                                        }
                                    }
                                );
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Can not find player"});
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            res => dbMigration.resHandler(inputData, "player", "updatePlayerCredit"),
            error => dbMigration.errorHandler("player", "updatePlayerCredit", inputData, error)
        );
    },

    validateProposalData: function (typeName, proposalData) {
        var bValid = false;
        //check proposal parameters for each type
        switch (typeName) {
            case "UpdatePlayerInfo":
                bValid = true;
                break;
            case "UpdatePlayerCredit":
                if (proposalData && proposalData.updateAmount != null) {
                    bValid = true;
                }
                break;
            case "UpdatePlayerEmail":
                if (proposalData && proposalData.updateData && proposalData.updateData.email != null) {
                    bValid = true;
                }
                break;
            case "UpdatePlayerPhone":
                if (proposalData && proposalData.updateData && proposalData.updateData.phoneNumber != null) {
                    bValid = true;
                }
                break;
            case "UpdatePlayerQQ":
                if (proposalData && proposalData.updateData && proposalData.updateData.qq != null) {
                    bValid = true;
                }
                break;
            case "UpdatePlayerWeChat":
                if (proposalData && proposalData.updateData && proposalData.updateData.weChat != null) {
                    bValid = true;
                }
                break;
            case "UpdatePlayerBankInfo":
                bValid = true;
                break;
            case "AddPlayerRewardTask":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "UpdatePartnerBankInfo":
                if (proposalData && proposalData.updateData) {
                    bValid = true;
                }
                break;
            case "UpdatePartnerPhone":
                if (proposalData && proposalData.updateData && proposalData.updateData.phoneNumber) {
                    bValid = true;
                }
                break;
            case "UpdatePartnerEmail":
                if (proposalData && proposalData.updateData && proposalData.updateData.email) {
                    bValid = true;
                }
                break;
            case "UpdatePartnerInfo":
                if (proposalData && proposalData.updateData) {
                    bValid = true;
                }
                break;
            case "FullAttendance":
                if (proposalData && proposalData.rewardAmount != null && proposalData.spendingAmount != null) {
                    bValid = true;
                }
                break;
            case "PlayerConsumptionReturn":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "PartnerConsumptionReturn":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "FirstTopUp":
                if (proposalData && proposalData.rewardAmount != null && proposalData.applyAmount != null && proposalData.spendingAmount != null) {
                    bValid = true;
                }
                break;
            case "PartnerIncentiveReward":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "PartnerReferralReward":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "GameProviderReward":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "PlatformTransactionReward":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "ManualPlayerTopUp":
                if (proposalData && proposalData.amount != null) {
                    bValid = true;
                }
                break;
            case "PlayerAlipayTopUp":
                if (proposalData && proposalData.amount != null) {
                    bValid = true;
                }
                break;
            case "PlayerTopUp":
                if (proposalData && proposalData.amount != null) {
                    bValid = true;
                }
                break;
            case "PlayerBonus":
                if (proposalData && proposalData.bonusId != null && proposalData.amount != null && proposalData.bonusCredit != null) {
                    bValid = true;
                }
                break;
            case "PlayerTopUpReturn":
                if (proposalData && proposalData.rewardAmount != null && proposalData.applyAmount != null && proposalData.spendingAmount != null) {
                    bValid = true;
                }
                break;
            case "PlayerConsumptionIncentive":
                if (proposalData && proposalData.rewardAmount != null && proposalData.spendingAmount != null) {
                    bValid = true;
                }
                break;
            case "PlayerLevelUp":
                if (proposalData && proposalData.rewardAmount != null) {
                    bValid = true;
                }
                break;
            case "PartnerTopUpReturn":
                //there shouldn't be any proposal use this type for data sync
                break;
            case "PlayerTopUpReward":
                if (proposalData && proposalData.rewardAmount != null && proposalData.applyAmount != null && proposalData.spendingAmount != null) {
                    bValid = true;
                }
                break;
            case "PlayerReferralReward":
                if (proposalData && proposalData.rewardAmount != null) {
                    bValid = true;
                }
                break;
            case "PartnerBonus":
                if (proposalData && proposalData.bonusId != null && proposalData.amount != null && proposalData.bonusCredit != null) {
                    bValid = true;
                }
                break;
            case "PlayerConsumptionReturnFix":
                if (proposalData && proposalData.updateAmount != null) {
                    bValid = true;
                }
                break;
            case "PlayerRegistrationReward":
                if (proposalData && proposalData.rewardAmount != null && proposalData.unlockBonusAmount != null) {
                    bValid = true;
                }
                break;
            default:
                break;
        }
        return bValid;
    },

    syncProposal: function (typeName, platform, creator, creatorType, createTime, entryType, userType, status, proposalData, requestData) {
        var bPartnerProposal = false;
        //data validation
        var dataValidationProm = Q.resolve().then(
            () => {
                //check proposal status
                if (status != constProposalStatus.SUCCESS && status != constProposalStatus.FAIL) {
                    return Q.reject({name: "DataError", message: "Invalid proposal status"});
                }
                var bValid = dbMigration.validateProposalData(typeName, proposalData);

                if (!bValid) {
                    return Q.reject({name: "DataError", message: "Invalid proposal data"});
                }
                var userProm = dbconfig.collection_players.findOne({name: proposalData.loginname}).lean();
                var partnerProposalType = ["PartnerBonus", "UpdatePartnerBankInfo", "UpdatePartnerPhone", "UpdatePartnerEmail", "UpdatePartnerInfo", ""];
                if (partnerProposalType.indexOf(typeName) >= 0) {
                    bPartnerProposal = true;
                    proposalData.partnerName = proposalData.loginname;
                    userProm = dbconfig.collection_partner.findOne({partnerName: proposalData.loginname}).lean();
                }
                else {
                    proposalData.playerName = proposalData.loginname;
                }
                return userProm.then(
                    userData => {
                        if (userData) {
                            return userData;
                        }
                        else {
                            return Q.reject({name: "DataError", message: "Can not find user"});
                        }
                    }
                );
            }
        );

        var creatorObj = {};
        creatorType = creatorType || 'system';
        var prom1 = Q.resolve({});
        if (creatorType == 'admin') {
            prom1 = dbconfig.collection_admin.findOne({adminName: creator}).lean();
        } else if (creatorType == 'player') {
            prom1 = dbconfig.collection_players.findOne({name: creator}).lean();
        }
        var prom2 = dbconfig.collection_platform.findOne({platformId: platform}).lean();
        var prom3 = Q.resolve({});
        if (!bPartnerProposal && proposalData && proposalData.loginname) {
            prom3 = dbconfig.collection_players.findOne({name: proposalData.loginname}).lean();
        }
        return Q.all([prom1, prom2, prom3, dataValidationProm]).then(
            data => {
                if (data && data[1]) {
                    var platformObj = data[1], user = data[0], player = data[2];
                    var partner = null;
                    if (bPartnerProposal) {
                        partner = data[3];
                    }
                    if (user) {
                        if (creatorType == 'admin') {
                            creatorObj = {
                                name: user.adminName,
                                type: 'admin',
                                id: user._id
                            };
                        } else if (creatorType == 'player') {
                            creatorObj = {
                                name: user.name,
                                type: 'player',
                                id: user._id
                            };
                            proposalData._id = user._id;
                            proposalData.playerObjId = user._id;
                            proposalData.playerId = user.playerId;
                            //proposalData.playerShorId = user.playerId;
                            proposalData.platformObjId = user.platform;
                            proposalData.platformId = user.platform;
                        }
                    }
                    if (player) {
                        proposalData._id = player._id;
                        proposalData.playerObjId = player._id;
                        proposalData.playerId = player.playerId;
                        //proposalData.playerShorId = player.playerId;
                        proposalData.platformObjId = player.platform;
                        proposalData.platformId = player.platform;
                    }
                    if (partner) {
                        proposalData.partnerObjId = partner._id;
                        proposalData.platformObjId = partner.platform;
                        proposalData.platformId = partner.platform;
                        proposalData.partnerName = partner.partnerName;
                    }
                    var newProposalData = proposalData;
                    return dbMigration.proposalDataConverter(typeName, proposalData).then(
                        convertData => {
                            newProposalData = convertData;
                            return dbconfig.collection_proposalType.findOne({
                                platformId: platformObj._id,
                                name: typeName
                            })
                        }
                    ).then(
                        proposalType => {
                            if (proposalType) {
                                createTime = createTime || new Date();
                                newProposalData.requestId = requestData.requestId;

                                var expiredDate = moment(createTime).add('hour', proposalType.expirationDuration).format('YYYY-MM-DD HH:mm:ss.sss');

                                var newRecord = {
                                    mainType: constProposalMainType[typeName],
                                    type: proposalType._id,
                                    creator: creatorObj,
                                    createTime: createTime,
                                    data: newProposalData,
                                    entryType: entryType,
                                    userType: userType,
                                    status: status,
                                    noSteps: true,
                                    expirationTime: expiredDate
                                };
                                var newRequestId = new dbconfig.collection_syncDataRequestId({requestId: requestData.requestId});
                                return newRequestId.save().then(
                                    res => {
                                        return dbProposal.createProposal(newRecord).then(
                                            data => {
                                                return data;
                                            },
                                            err => {
                                                dbconfig.collection_syncDataRequestId.remove({requestId: requestData.requestId}).then();
                                                return Q.reject({
                                                    name: "DataError",
                                                    message: "Error when creating proposal.",
                                                    err: err
                                                });
                                            }
                                        );
                                    }
                                );

                            } else {
                                return Q.reject({name: "DataError", message: "Can not find proposalType in platform"});
                            }
                        }
                    )
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            },
            err => {
                return Q.reject({name: "DataError", message: "Can not find platform or creator", err: err});
            }
        ).then(
            proposal => {
                if (proposal) {
                    //if proposal is success, execute proposal data
                    if (typeName != "PlayerBonus" && typeName != "PartnerBonus") {
                        if (status == constProposalStatus.SUCCESS) {
                            var executionType = "execute" + typeName;
                            var rejectionType = "reject" + typeName;
                            var newProposal = proposal.toObject();
                            newProposal.type = {name: typeName};
                            return proposalExecutor.approveOrRejectProposal(executionType, rejectionType, true, newProposal);
                        }
                    }
                    else {
                        if (status == constProposalStatus.SUCCESS) {
                            //update player credit if it is bonus proposal
                            //for sync data, use amount only
                            var updateAmount = proposal.data.amount;
                            if (typeName == "PlayerBonus") {
                                return dbPlayerInfo.changePlayerCredit(proposal.data.playerObjId, proposal.data.platformObjId, -updateAmount, typeName, proposal.data).then(
                                    player => {
                                        console.error("Player credits is below zero.", player);
                                        if (player && player.validCredit < 0) {
                                            player.validCredit = 0;
                                            return player.save();
                                        }
                                    }
                                );
                            }
                            else {
                                return dbconfig.collection_partner.findOneAndUpdate(
                                    {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformId},
                                    {$inc: {credits: -updateAmount}},
                                    {new: true}
                                ).then(
                                    newPartnerData => {
                                        if (newPartnerData && newPartnerData.credits < 0) {
                                            console.error("Partner credits is below zero.", newPartnerData);
                                            return dbconfig.collection_partner.findOneAndUpdate(
                                                {
                                                    _id: proposalData.data.partnerObjId,
                                                    platform: proposalData.data.platformId
                                                },
                                                {credits: 0},
                                                {new: true}
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    }

                }
            }
        ).then(
            data => dbMigration.resHandler(requestData, "syncData", "syncProposal"),
            error => dbMigration.errorHandler("syncData", "syncProposal", requestData, error)
        );
    },

    syncPlayerLoginRecord: function (data) {
        var platformId = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformId = platformData._id;
                    var playerProm = dbconfig.collection_players.findOne({name: data.playerName, platform: platformId});
                    return Q.resolve(playerProm);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            promData => {
                if (promData) {
                    data.player = promData._id;
                    delete data.playerName;
                    data.platform = platformId;
                    data.loginTime = data.loginTime ? new Date(data.loginTime) : null;
                    data.logoutTime = data.logoutTime ? new Date(data.logoutTime) : null;
                    if (data.browser || data.device || data.os) {
                        data.userAgent = {
                            browser: data.browser || '',
                            device: data.device || '',
                            os: data.os || '',
                        }
                    }
                    data.userAgent = data.userAgent || {};
                    var record = new dbconfig.collection_playerLoginRecord(data);

                    var newAgentArray = promData.userAgent || [];
                    var uaObj = {
                        browser: data.browser || '',
                        device: data.device || '',
                        os: data.os || '',
                    };
                    var bExit = false;
                    newAgentArray.forEach(
                        agent => {
                            if (agent.browser == uaObj.browser && agent.device == uaObj.device && agent.os == uaObj.os) {
                                bExit = true;
                            }
                        }
                    );
                    var updateData = {};
                    if (!bExit) {
                        newAgentArray.push(uaObj);
                        updateData.userAgent = newAgentArray;
                    }
                    if (promData.lastAccessTime.getTime() < data.loginTime.getTime()) {
                        updateData.lastLoginIp = data.loginIP;
                        updateData.lastAccessTime = data.loginTime;
                        var geo = geoip.lookup(data.loginIP);
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
                    }
                    // if (data.loginIP && data.loginIP != promData.lastLoginIp) {
                    //     updateData.$push = {loginIps: data.loginIP};
                    // }
                    dbconfig.collection_players.findOneAndUpdate({
                        _id: promData._id,
                        platform: promData.platform
                    }, updateData).exec();

                    var newRequestId = new dbconfig.collection_syncDataRequestId({requestId: data.requestId});
                    return newRequestId.save().then(
                        res => {
                            return record.save().then(
                                () => {
                                },
                                error => {
                                    dbconfig.collection_syncDataRequestId.remove({requestId: data.requestId}).then();
                                    return Q.reject(error);
                                }
                            );
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", message: "Can not find player or admin"});
                }
            }
        ).then(
            res => dbMigration.resHandler(data, "syncData", "syncPlayerLoginRecord"),
            error => dbMigration.errorHandler("syncData", "syncPlayerLoginRecord", data, error)
        );
    },

    transferPlayerCreditToProvider: function (playerId, platform, providerId, amount, adminName, forSync, requestData) {
        var newRequestId = new dbconfig.collection_syncDataRequestId({requestId: requestData.requestId});
        return newRequestId.save().then(
            res => {
                return dbPlayerInfo.transferPlayerCreditToProvider(playerId, platform, providerId, amount, adminName, forSync).then(
                    data => dbMigration.resHandler(requestData, "syncData", "transferPlayerCreditToProvider"),
                    error => {
                        dbconfig.collection_syncDataRequestId.remove({requestId: requestData.requestId}).then();
                        return dbMigration.errorHandler("syncData", "transferPlayerCreditToProvider", requestData, error);
                    }
                );
            }
        );

    },

    transferPlayerCreditFromProvider: function (playerId, platform, providerId, amount, adminName, bResolve, maxReward, forSync, requestData) {
        var newRequestId = new dbconfig.collection_syncDataRequestId({requestId: requestData.requestId});
        return newRequestId.save().then(
            res => {
                return dbPlayerInfo.transferPlayerCreditFromProvider(playerId, platform, providerId, amount, adminName, bResolve, maxReward, forSync).then(
                    data => dbMigration.resHandler(requestData, "syncData", "transferPlayerCreditFromProvider"),
                    error => {
                        dbconfig.collection_syncDataRequestId.remove({requestId: requestData.requestId}).then();
                        return dbMigration.errorHandler("syncData", "transferPlayerCreditFromProvider", requestData, error);
                    }
                );
            }
        );
    },

    updatePlayer: function (data) {
        var platformObjId = null;
        var playerObj = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    return dbconfig.collection_players.findOne({
                        name: data.playerName,
                        platform: platformObjId
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    var partnerProm = null;
                    var referralProm = null;
                    var playerLevelProm = null;
                    if (data.updateData.partnerName != null) {
                        partnerProm = dbconfig.collection_partner.findOne({
                            partnerName: data.updateData.partnerName,
                            platform: platformObjId
                        });
                    }
                    if (data.updateData.referralName) {
                        referralProm = dbconfig.collection_players.findOne({
                            name: data.updateData.referralName,
                            platform: platformObjId
                        });
                    }
                    if (data.updateData.playerLevelName) {
                        playerLevelProm = dbconfig.collection_playerLevel.findOne({
                            name: data.updateData.playerLevelName,
                            platform: platformObjId
                        });
                    }
                    return Q.all([partnerProm, referralProm, playerLevelProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            }
        ).then(
            promData => {
                if(promData){
                    delete data.updateData.partner;
                    delete data.updateData.referral;
                    delete data.updateData.playerLevel;
                    if(promData[0]){
                        data.updateData.partner = promData[0]._id;
                    }
                    if(promData[1]){
                        data.updateData.referral = promData[1]._id;
                    }
                    if(promData[2]){
                        data.updateData.playerLevel = promData[2]._id;
                    }
                }
                return dbconfig.collection_players.findOneAndUpdate({_id: playerObj._id, platform: platformObjId}, data.updateData);
            }
        ).then(
            res => dbMigration.resHandler(data, "player", "updatePlayer"),
            error => dbMigration.errorHandler("player", "updatePlayer", data, error)
        );
    },

    updatePartner: function(data){
        var platformObjId = null;
        var partnerObj = null;
        return dbconfig.collection_platform.findOne({platformId: data.platform}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    return dbconfig.collection_partner.findOne({
                        partnerName: data.partnerName,
                        platform: platformObjId
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            partnerData => {
                if(partnerData){
                    var parentProm = null;
                    partnerObj = partnerData;
                    if( data.updateData.parentName ){
                        parentProm = dbconfig.collection_partner.findOne({parentName: data.updateData.parentName, platform: platformObjId});
                    }
                    return Q.resolve(parentProm);
                }
                else{
                    return Q.reject({name: "DataError", message: "Can not find partner"});
                }
            }
        ).then(
            parentData => {
                if( parentData ){
                    data.updateData.parent = parentData._id;
                }
                return dbconfig.collection_partner.findOneAndUpdate({_id: partnerObj._id, platform: partnerObj.platform}, data.updateData);
            }
        ).then(
            res => dbMigration.resHandler(data, "partner", "updatePartner"),
            error => dbMigration.errorHandler("partner", "updatePartner", data, error)
        );
    }

};

module.exports = dbMigration;
