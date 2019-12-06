"use strict";

var dbGameProviderFunc = function () {
};
module.exports = new dbGameProviderFunc();

const dbutility = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var constServerCode = require('./../const/constServerCode');
let constProviderStatus = require('./../const/constProviderStatus');
var dbGame = require('./../db_modules/dbGame');
var cpmsAPI = require("./../externalAPI/cpmsAPI");
var Q = require("q");
const errorUtils = require('./../modules/errorUtils');
const constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus');

let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;
let SettlementBalancer = require('../settlementModule/settlementBalancer');

const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');

var dbGameProvider = {

    /**
     * Create a new gameProvider
     * @param {json} gameProviderData - The data of the gameProvider. Refer to gameProvider schema.
     * @return {json} gameProvider object
     */
    createGameProvider: function(gameProviderData) {
        let gameProvider = new dbconfig.collection_gameProvider(gameProviderData);
        return gameProvider.save();
    },

    /**
     * Get the information of all the gameProviders
     */
    getAllGameProviders: function (hideDisabledProvider) {
        let query = {name: {$exists: true}};
        if (hideDisabledProvider) {
            query.status = {$ne: constProviderStatus.HALT};
        }
        return dbconfig.collection_gameProvider.find(query).sort({name: 1}).exec();
    },

    /**
     * Get the information of the gameProvider by gameProvider name or _id
     * @param {String} query - Query string
     */
    getGameProvider: function (query) {
        return dbconfig.collection_gameProvider.findOne(query).exec();
    },

    getGameProviders: function (query) {
        return dbconfig.collection_gameProvider.find(query).exec();
    },

    /**
     * delete the information of the gameProvider by _id
     * @param - _id of GameProvider
     */
    delGameProvider: function (gameProviderObjId) {
        var providerProm = dbconfig.collection_gameProvider.remove({_id: gameProviderObjId}).exec();
        //remove game provider from all platform
        var platformProm = dbconfig.collection_platform.update(
            {gameProviders: {$elemMatch: {$eq: gameProviderObjId}}},
            {$pull: {gameProviders: gameProviderObjId}, $unset: {'gameProviderInfo': String(gameProviderObjId)}},
            {multi: true}
        );

        console.log("delGameProvider platform update:", {$pull: {gameProviders: gameProviderObjId}, $unset: {'gameProviderInfo': String(gameProviderObjId)}});

        //remove all provider games
        var gameProm = dbconfig.collection_game.find({provider: gameProviderObjId}).then(
            games => {
                if (games && games.length > 0) {
                    var proms = [];
                    games.forEach(
                        game => proms.push(dbGame.deleteGameById(game._id))
                    );
                    return Q.all(proms);
                }
            }
        );
        return Q.all([providerProm, platformProm, gameProm]);
    },

    /**
     * delete the information of the gameProvider by code
     * @param - code of GameProvider
     */
    delGameProviderByCode: function (providerCode) {
        //return dbconfig.collection_gameProvider.remove({code: providerCode}).exec();
        return dbconfig.collection_gameProvider.findOne({code: providerCode}).then(
            providerData => {
                if (providerData) {
                    return dbGameProvider.delGameProvider(providerData._id);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find game provider"});
                }
            }
        )
    },
    /**
     * delete the information of the gameProvider by providerId
     * @param -  GameProviderId
     */
    delGameProviderByProviderId: function (providerId) {

        return dbconfig.collection_gameProvider.findOne({providerId: providerId}).then(
            providerData => {
                if (providerData) {
                    return dbGameProvider.delGameProvider(providerData._id);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find game provider"});
                }
            }
        )
    },


    /**
     * update the information of the gameProvider by _id
     * @param {Object} query - The query object
     * @param {Object} updateData - The update data
     */
    updateGameProvider: function (query, updateData) {
        return dbconfig.collection_gameProvider.findOneAndUpdate(query, updateData, {new: true}).exec();
    },

    updateGameProviderStatus: function (providerId, platformId, status) {
        if (!platformId) {
            return dbGameProvider.updateGameProvider({providerId: providerId}, {platformStatusFromCPMS: {}, status: status});
        }

        let key = "platformStatusFromCPMS." + platformId;
        let setObject = {};
        setObject[key] = status;
        return dbconfig.collection_gameProvider.findOneAndUpdate({providerId: providerId}, {$set: setObject}, {new: true}).exec();
    },

    /**
     * update the information of the all gameProviders in the array
     * @param [ {gameProvider1},{gameProvider2}] - an array of provider objects

     */
    updateGameProviders: function (providersArray) {
        //compare provider data
        return dbconfig.collection_gameProvider.find().then(
            curProviders => {
                var proms = [];
                //find new provider and update provider
                providersArray.forEach(
                    provider => {
                        var isNew = true;
                        for (let i = 0; i < curProviders.length; i++) {
                            if (curProviders[i].providerId == provider.providerId) {
                                isNew = false;
                            }
                        }
                        if (isNew) {
                            proms.push(dbGameProvider.createGameProvider(provider));
                        }
                        else {
                            proms.push(dbconfig.collection_gameProvider.update({providerId: provider.providerId}, provider).exec());
                        }
                    }
                );

                //find delete one
                curProviders.forEach(
                    curProvider => {
                        var isOld = true;
                        for (let i = 0; i < providersArray.length; i++) {
                            if (providersArray[i].providerId == curProvider.providerId) {
                                isOld = false;
                            }
                        }
                        if (isOld) {
                            proms.push(dbGameProvider.delGameProviderByProviderId(curProvider.providerId));
                        }
                    }
                );

                return Q.all(proms);
            }
        );
    },

    /*
     * get all credits in game providers server
     * @param {objectId} playerId
     */
    getGameProviderPlayerCredit: function (playerId, playerName, platform) {
        var platformResult;
        var returnResult = [];

        return dbconfig.collection_platform.findOne({platformId: platform}).populate({
            path: "gameProviders",
            model: dbconfig.collection_gameProvider
        }).lean().then(
            function (data) {
                if (data && data.gameProviders && data.gameProviders.length > 0) {
                    var result = [];
                    platformResult = data.gameProviders;
                    var providerMap = {};
                    data.gameProviders.forEach(provider => providerMap[provider.providerId] = provider.name);
                    for (var prov = 0; prov < platformResult.length; prov++) {
                        var queryObj = {
                            username: playerName,
                            platformId: platform,
                            providerId: platformResult[prov].providerId,
                        };
                        var provObj = platformResult[prov];
                        var check = new Promise(function (resolve, reject) {
                            cpmsAPI.player_queryCredit(queryObj).then(
                                function (creditData) {
                                    var obj = {
                                        providerId: creditData.providerId,
                                        name: providerMap[creditData.providerId],
                                        gameCredit: creditData.credit || 0,
                                    };
                                    resolve(obj);
                                },
                                function (err) {
                                    //todo::for debug, to be removed
                                    console.error("queryCredit error:", err);
                                    resolve(null);
                                }
                            );
                        });
                        result.push(check);
                    }
                    return Q.all(result);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform or providers"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding game provider.", error: error});
            }
        ).then(
            function (data) {
                return data.filter(a => {
                    return a
                });
            },
            //todo::for debug, to be removed
            function (error) {
                console.error("getGameProviderPlayerCredit error:", error);
            }
        )
    },

    getPlayerCreditInProvider: function (userName, platformId, providerId) {
        let queryObj = {
            username: userName,
            platformId: platformId,
            providerId: providerId,
        };
        return cpmsAPI.player_queryCredit_NAM(queryObj).then(
            function(creditData) {
                return {
                    providerId: creditData.providerId,
                    gameCredit: parseFloat(creditData.credit).toFixed(2) || 0,
                };
            },
            function(err) {
                //todo::for debug, to be removed
                return {
                    providerId: providerId,
                    gameCredit: 'unknown',
                    reason: err
                };
            }
        );
    },

    /*
     get the list of game providers from the platform of a player
     @param {JSON} can be , _id or playerId
     */
    getGameProvidersByPlayerAPI: function (query, bDetail, platformId) {
        var deferred = Q.defer();
        let player;

        dbconfig.collection_players.findOne(query).lean().then(
            playerData => {
                let platformQ = {};

                if (playerData) {
                    player = playerData;
                    platformQ["_id"] = playerData.platform;
                } else {
                    platformQ["platformId"] = platformId;
                }

                return dbconfig.collection_platform.findOne(platformQ)
                    .populate({path: "gameProviders", model: dbconfig.collection_gameProvider})
                    .lean();
            },
            error => {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting players. " + error.message,
                    error: error,
                    status: constServerCode.DB_ERROR
                });
            }
        ).then(
            data => {
                if (data) {
                    let platform = data;
                    let forbiddenProviders = player && player.forbidProviders ? player.forbidProviders.map(providerId => String(providerId)) : [];
                    let gameProviderInfo = platform.gameProviderInfo || {};
                    let gameProviderInfoKeys = Object.keys(gameProviderInfo);

                    for (let i = 0; i < gameProviderInfoKeys.length; i++) {
                        let key = gameProviderInfoKeys[i];
                        let provider = gameProviderInfo[key];
                        if (provider && provider.isEnable === false) {
                            forbiddenProviders.push(key);
                        }
                    }

                    //update nick name and prefix for this platform
                    for (let i = 0; i < data.gameProviders.length; i++) {
                        let thisProvider = data.gameProviders[i];
                        let thisProviderId = thisProvider._id;
                        let gameProviderNickNameData = data.gameProviderInfo && data.gameProviderInfo[thisProviderId] || {};

                        if (gameProviderNickNameData.localNickName) {
                            thisProvider.nickName = gameProviderNickNameData.localNickName;
                        }

                        if (gameProviderNickNameData.localPrefix) {
                            thisProvider.prefix = gameProviderNickNameData.localPrefix;
                        }
                    }

                    if (bDetail) {
                        // filter out disabled provider
                        data.gameProviders = data.gameProviders.filter(item => {return item.status != constProviderStatus.HALT});
                        deferred.resolve(data.gameProviders);
                    }
                    else {
                        let providers = data.gameProviders.map(
                            (gameProvider) => {
                                let gameProviderStatus = dbutility.getPlatformSpecificProviderStatus(gameProvider, platform.platformId);
                                if (player && player.permission &&  player.permission.forbidPlayerFromEnteringGame) {
                                    gameProviderStatus = constProviderStatus.MAINTENANCE;
                                }

                                if (forbiddenProviders.indexOf(String(gameProvider._id)) >= 0) {
                                    gameProviderStatus = constProviderStatus.MAINTENANCE;
                                }
                                return {
                                    providerId: gameProvider.providerId,
                                    name: gameProvider.name,
                                    nickName: gameProvider.nickName,
                                    chName: gameProvider.chName ? gameProvider.chName : '',
                                    prefix: gameProvider.prefix,
                                    status: gameProviderStatus
                                };
                            }
                        );
                        // filter out disabled provider
                        providers = providers.filter(item => {return item.status != constProviderStatus.HALT});
                        deferred.resolve(providers);
                    }
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "No platform providers found",
                        error: "No providers found",
                        status: constServerCode.OPERATION_FAIL
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting platform and provider data",
                    error: error,
                    status: constServerCode.DB_ERROR
                });
            });

        return deferred.promise;
    },

    getProviderStatus: function (playerId, providerId) {
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            function (data) {
                return dbconfig.collection_platform.findOne({_id: data.platform})
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (platformData) {
                if (platformData && platformData.gameProviders && platformData.gameProviders.length > 0) {
                    var queryObj = {_id: {$in: platformData.gameProviders}};
                    if (providerId) {
                        queryObj.providerId = providerId
                    }
                    return dbconfig.collection_gameProvider.find(
                        queryObj,
                        {_id: 0, providerId: 1, runTimeStatus: 1}
                    );
                }
                else {
                    return Q.resolve([]);
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
    },

    getProviderGroupById: providerGroupId => {
        return dbconfig.collection_gameProviderGroup.findOne({
            _id: providerGroupId
        }).lean();
    },

    getPlatformProviderGroup: (platformObjId) => {
        return dbconfig.collection_gameProviderGroup.find({
            platform: platformObjId
        }).lean();
    },

    getProviderGroupByProviderId: (platformObjId, providerId) => {
        return dbconfig.collection_gameProviderGroup.findOne({
            platform: platformObjId,
            providers: providerId
        }).lean();
    },

    /**
     *
     * @param platformObjId
     * @param gameProviderGroup
     * @param socketActionLog - Just for socket action logs record
     * @returns {*}
     */
    updatePlatformProviderGroup: (platformObjId, gameProviderGroup, socketActionLog) => {
        let promArr = [];

        gameProviderGroup.map(e => {
            if (e.providerGroupObjId) {
                promArr.push(
                    dbconfig.collection_gameProviderGroup.findOneAndUpdate({
                        platform: platformObjId,
                        _id: e.providerGroupObjId
                    }, e, {upsert: true, new: true})
                )
            } else {
                delete e.providerGroupObjId
                e.platform = ObjectId(platformObjId);
                promArr.push(new dbconfig.collection_gameProviderGroup(e).save())
            }
        });

        return Promise.all(promArr).then(
            data => {
                ['1', '2', '3', '4', '5'].map(commissionType => {
                    removeDeletedGroupCommissionConfig(platformObjId, commissionType).catch(errorUtils.reportError);
                });
                return data;
            }
        );
    },

    batchCreditTransferOut: (providerObjId, platformObjId, providerId, startDate, endDate, adminName) => {
        let query = {
            platformObjId: ObjectId(platformObjId),
            providerId: providerId,
            createTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            type: {
                $in: ["TransferIn", "transferIn"]
            }
        };
        let result = {
            providerObjId: providerObjId,
            processedAmount: 0,
            totalAmount: 0,
        };
        let stream = dbconfig.collection_playerCreditTransferLog.aggregate([
            {
                $match: query
            },
            {
                $group: {
                    _id: "$playerId",
                }
            }]
        ).cursor({batchSize: 100}).allowDiskUse(true).exec();


        let setObj = {};
        setObj["batchCreditTransferOutStatus." + platformObjId + ".processedAmount"] = 0;
        return dbconfig.collection_playerCreditTransferLog.distinct("playerId", query).then(
            playerIdList => {
                let setObj = {};
                setObj["batchCreditTransferOutStatus." + platformObjId + ".processedAmount"] = 0;
                setObj["batchCreditTransferOutStatus." + platformObjId + ".totalAmount"] = playerIdList.length;
                return dbconfig.collection_gameProvider.findOneAndUpdate({_id: providerObjId}, {$set: setObj}, {new: true});
            }
        ).then(
            gameProvider => {
                let balancer = new SettlementBalancer();
                balancer.initConns().then(
                    () => {
                        // System log to make sure balancer is working
                        console.log('[batch credit transfer out] Settlement Server initialized');
                        Q(
                            balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: 1,
                                    makeRequest: function (playerIdList, request) {
                                        request("player", "batchCreditTransferOut", {
                                            playerId: playerIdList.map(playerId => {return playerId._id;})[0],
                                            platformObjId: platformObjId,
                                            providerId: providerId,
                                            adminName: adminName,
                                            isBatch: true
                                        });
                                    }
                                }
                            ).then(
                                data => console.log("batchCreditTransferOut settle success:", data),
                                error => console.log("batchCreditTransferOut settle failed:", error)
                            )
                        );
                    },
                    error => console.log('[batch credit transfer out] Settlement Server initialization error:', error)
                );

                result.processedAmount = gameProvider.batchCreditTransferOutStatus[platformObjId].processedAmount;
                result.totalAmount = gameProvider.batchCreditTransferOutStatus[platformObjId].totalAmount;
                return result;
            }
        );
    },

    checkTransferInSequence: (platformObjId, playerObjId, providerIdArr) => {
        let promArr = [];
        let retData = [];

        providerIdArr.map(providerId => {
            promArr.push(
                dbconfig.collection_creditChangeLog.find({
                    platformId: platformObjId,
                    playerId: playerObjId,
                    operationType: constPlayerCreditChangeType.TRANSFER_IN,
                    'data.providerId': providerId
                }).sort({operationTime: -1}).limit(1).lean().then(
                    changeLog => {
                        if (changeLog && changeLog[0]) {
                            retData.push({
                                providerId: providerId,
                                operationTime: changeLog[0].operationTime
                            });
                        }
                    }
                )
            )
        });

        return Promise.all(promArr).then(() => retData);
    },

    checkGameCredit: (platformObjId, playerObjId, providerIdArr, playerData) => {
        let promArr = [];
        let retData = [];
        let totalCredit = 0;
        let gameCredit = 0;
        let freeCredit = 0;

        providerIdArr.map(providerId => {
            promArr.push(
                // check if the player's valid credit + provider credit <= 0
                dbGameProvider.getPlayerCreditInProvider(playerData.name, playerData.platform.platformId, providerId).then(
                    gameCreditInProvider => {
                        if (gameCreditInProvider && gameCreditInProvider.gameCredit){
                            gameCredit = parseFloat(gameCreditInProvider.gameCredit);
                        }

                        freeCredit = parseFloat(playerData.validCredit || 0);
                        totalCredit = gameCredit + freeCredit;

                        retData.push({
                            providerId: providerId,
                            gameCredit: gameCredit,
                            freeCredit: freeCredit,
                            totalCredit: totalCredit// gameCredit In gameProvider
                        });
                    }
                )
            )
        });

        return Promise.all(promArr).then(() => retData);
    },

    getGameProviderByPlatformList: function(platformIdList){
        let providerList = [];
        if(platformIdList && platformIdList.length > 0){
            return dbconfig.collection_platform.find({_id: {$in: platformIdList}}).lean().then(
                platformDetails => {
                    if(platformDetails && platformDetails.length > 0){
                        platformDetails.forEach(
                            platform => {
                                if(platform && platform.gameProviders && platform.gameProviders.length > 0){
                                    platform.gameProviders.forEach(
                                        gameProvider => {
                                            if(gameProvider){
                                                let indexNo = providerList.findIndex(p => p == gameProvider);

                                                if(indexNo == -1){
                                                    providerList.push(gameProvider);
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        )
                    }

                    return dbconfig.collection_gameProvider.find({_id: {$in: providerList}},{_id: 1, name: 1}).lean();
                }
            );
        }else{
            return dbconfig.collection_gameProvider.find({},{_id: 1, name: 1}).lean();
        }
    },

    getQueryCreditTimeOutRecords: function(platformId, providerId, startTime, endTime) {
        return dbconfig.collection_queryCreditTimeout.find({
            platformId: platformId,
            providerId: providerId,
            createTime: {
                $gte: new Date(startTime),
                $lte: new Date(endTime)
            }
        }).lean();
    }
};

var proto = dbGameProviderFunc.prototype;
proto = Object.assign(proto, dbGameProvider);

// This make WebStorm navigation work
module.exports = dbGameProvider;

function removeDeletedGroupCommissionConfig (platformObjId, commissionType) {
    if (!platformObjId) return;
    let providerGroups, commissionConfigs;

    let providerGroupsProm = dbconfig.collection_gameProviderGroup.find({platform: platformObjId}, {_id: 1}).lean();
    let commissionConfigsProm = dbconfig.collection_partnerCommissionConfig.find({platform: platformObjId, partner: {$exists: false}, commissionType: commissionType}, {provider: 1}).lean();

    return Promise.all([providerGroupsProm, commissionConfigsProm]).then(
        data => {
            ([providerGroups, commissionConfigs] = data);

            if (!providerGroups && providerGroups.length <= 0) return;
            if (!commissionConfigs && commissionConfigs.length <= 0) return;

            let providerGroupObjIds = providerGroups.map(providerGroup => {
                return String(providerGroup._id);
            });

            let existedProvider = [];
            let proms = [];

            commissionConfigs.map(commissionConfig => {
                if (!providerGroupObjIds.includes(String(commissionConfig.provider)) || existedProvider.includes(String(commissionConfig.provider))) {
                    let prom = dbconfig.collection_partnerCommissionConfig.remove({_id: commissionConfig._id}).catch(errorUtils.reportError);
                    proms.push(prom);
                } else {
                    existedProvider.push(String(commissionConfig.provider));
                }
            });

            return Promise.all(proms);
        }
    );
}
