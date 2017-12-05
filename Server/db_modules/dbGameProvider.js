"use strict";

var dbconfig = require('./../modules/dbproperties');
var constServerCode = require('./../const/constServerCode');
var dbGame = require('./../db_modules/dbGame');
var cpmsAPI = require("./../externalAPI/cpmsAPI");
var Q = require("q");

let SettlementBalancer = require('../settlementModule/settlementBalancer');

var dbGameProvider = {

    /**
     * Create a new gameProvider
     * @param {json} data - The data of the gameProvider. Refer to gameProvider schema.
     */
    createGameProvider: function (gameProviderData) {
        var gameProvider = new dbconfig.collection_gameProvider(gameProviderData);
        return gameProvider.save();
    },

    /**
     * Get the information of all the gameProviders
     */
    getAllGameProviders: function () {
        return dbconfig.collection_gameProvider.find().exec();
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
        var queryObj = {
            username: userName,
            platformId: platformId,
            providerId: providerId,
        };
        return cpmsAPI.player_queryCredit(queryObj).then(
            function (creditData) {
                return {
                    providerId: creditData.providerId,
                    gameCredit: parseFloat(creditData.credit).toFixed(2) || 0,
                };
            },
            function (err) {
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
    getGameProvidersByPlayerAPI: function (query, bDetail) {
        var deferred = Q.defer();
        var providerList = [];

        dbconfig.collection_players.findOne(query).then(
            function (data) {
                var platformObjId = data.platform;
                return dbconfig.collection_platform.findOne({_id: platformObjId})
                    .populate({path: "gameProviders", model: dbconfig.collection_gameProvider});
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting players. " + error.message,
                    error: error,
                    status: constServerCode.DB_ERROR
                });
            }
        ).then(function (data) {
                if (data) {
                    //update nick name and prefix for this platform
                    for (var i = 0; i < data.gameProviders.length; i++) {
                        var thisProvider = data.gameProviders[i];
                        var thisProviderId = thisProvider._id;
                        var gameProviderNickNameData = data.gameProviderInfo && data.gameProviderInfo[thisProviderId] || {};
                        if (gameProviderNickNameData.localNickName) {
                            thisProvider.nickName = gameProviderNickNameData.localNickName;
                        }
                        if (gameProviderNickNameData.localPrefix) {
                            thisProvider.prefix = gameProviderNickNameData.localPrefix;
                        }
                    }
                    if (bDetail) {
                        deferred.resolve(data.gameProviders);
                    }
                    else {
                        var providers = data.gameProviders.map(
                            (gameProvider) => ({
                                providerId: gameProvider.providerId,
                                name: gameProvider.name,
                                nickName: gameProvider.nickName,
                                prefix: gameProvider.prefix,
                                status: gameProvider.status
                            })
                        );
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

    getPlatformProviderGroup: (platformObjId) => {
        return dbconfig.collection_gameProviderGroup.find({
            platform: platformObjId
        }).lean();
    },

    updatePlatformProviderGroup: (platformObjId, gameProviderGroup) => {
        let promArr = [];

        gameProviderGroup.map(e => {
            promArr.push(
                dbconfig.collection_gameProviderGroup.findOneAndUpdate({
                    platform: platformObjId,
                    name: e.name
                }, e, {upsert: true})
            )
        });

        return Promise.all(promArr);
    },

    batchCreditTransferOut: (providerObjId, providerId, startDate, endDate) => {
        let query = {
            providerId: providerId,
            createTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
        let result = {
            providerObjId: providerObjId,
            processing: true,
            processedAmount: 43,
            totalAmount: 1563,
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
        let balancer = new SettlementBalancer();

        return balancer.initConns().then(
            () => {
                // System log to make sure balancer is working
                console.log('[batch credit transfer out] Settlement Server initialized');
                // transferPlayerCreditFromProvider: function (playerId, platform, providerId, amount, adminName, bResolve, maxReward, forSync) {
                return Q(
                    balancer.processStream(
                        {
                            stream: stream,
                            batchSize: 1,
                            makeRequest: function (playerIdList, request) {
                                request("player", "batchCreditTransferOut", {
                                    providerId: providerId,
                                    playerId: playerIdList.map(playerId => {console.log(playerId); return playerId._id;})
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
    },
};

module.exports = dbGameProvider;