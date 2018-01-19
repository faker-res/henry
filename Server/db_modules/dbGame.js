'use strict';

var dbGameFunc = function () {
};
module.exports = new dbGameFunc();

var dbconfig = require('./../modules/dbproperties');
var dbPlatformGameStatus = require('./../db_modules/dbPlatformGameStatus');
var dbProposal = require('./../db_modules/dbProposal');
var constSystemParam = require('./../const/constSystemParam');
var constServerCode = require('./../const/constServerCode');
var constGameStatus = require('../const/constGameStatus');
var constProposalEntryType = require('../const/constProposalEntryType');
var constProposalUserType = require('../const/constProposalUserType');
var constProposalType = require('../const/constProposalType');
var cpmsAPI = require("./../externalAPI/cpmsAPI");
var Q = require("q");

var dbGame = {
    /**
     * Create a new Game
     * @param {json} data - The data of the Game. Refer to Game schema.
     */
    createGameAPI: function (gameData) {
        if (gameData && gameData.providerId && gameData.type) {
            var providerObjId = null;
            var gameObj = null;
            var gameTypeProm = dbconfig.collection_gameType.findOne({gameTypeId: gameData.type});
            var providerProm = dbconfig.collection_gameProvider.findOne({providerId: gameData.providerId});
            return Q.all([providerProm, gameTypeProm]).then(
                data => {
                    if (data && data[0] && data[1]) {
                        var sendData = gameData;
                        sendData.provider = data[0]._id;
                        providerObjId = data[0]._id;
                        delete sendData.providerId;
                        return dbGame.createGame(sendData);
                    } else {
                        if (!data[0]) {
                            return Q.reject({
                                type: "DataError",
                                message: "No gameProvider found matching providerId '" + gameData.providerId + "' - did you mean to send the short ID?"
                            });
                        }
                        else {
                            return Q.reject({
                                type: "DataError",
                                message: "No game type found matching type '" + gameData.type
                            });
                        }
                    }
                }
            ).then(
                game => {
                    //add game to all provider's platform
                    gameObj = game;
                    return dbconfig.collection_platform.find({gameProviders: {$elemMatch: {$eq: providerObjId}}});
                }
            ).then(
                platforms => {
                    if (platforms && platforms.length > 0) {
                        var proms = [];
                        platforms.forEach(
                            platform => {
                                var newRecord = {
                                    platform: platform._id,
                                    game: gameObj._id,
                                    name: gameObj.name,
                                    visible: gameObj.visible
                                };
                                proms.push(dbPlatformGameStatus.createPlatformGameStatus(newRecord));
                            }
                        );
                        return Q.all(proms);
                    }
                }
            ).then(
                data => gameObj,
                error => {
                    console.error("createGameAPI error:", gameData, error);
                    return Q.reject(error);
                }
            );
        } else {
            return Q.reject({
                type: "DataError",
                message: "Either gameData or gameData.providerId or gameData.type was missing",
                data: gameData
            });
        }
    },

    createGame: function (gameData) {
        var game = new dbconfig.collection_game(gameData);
        return game.save();
    },
    /**
     * Create a new Game and add to the platform/platforms
     * @param {json} data - The data of the Game and
     */
    createGameAndAddToProvider: function (data) {
        var gameData = new dbconfig.collection_game(data);
        return gameData.save();
    },
    /**
     *  Add game to the platform/platforms
     * @param {json} data - Id of the Game
     */
    //addGameToPlatform: function (data) {
    //
    //    var platformGameStatus = new dbconfig.collection_platformGameStatus(data);
    //    return platformGameStatus.save();
    //},

    /**
     * Search the game information of the Game by  gameName or _id
     * @param {String} query - Query data
     */
    getGame: function (query) {
        return dbconfig.collection_game.findOne(query).exec();
    },

    /**
     * Check if games are favorite game for player
     * @param {String} playerId
     * @param {Array} games
     */
    checkFavoriteGames: function (playerId, games) {
        if (playerId) {
            return dbconfig.collection_players.findOne({playerId: playerId}).then(
                playerData => {
                    if (playerData) {
                        if (playerData && playerData.favoriteGames && playerData.favoriteGames.length > 0) {
                            games.forEach(
                                game => {
                                    if (playerData.favoriteGames.indexOf(game._id) >= 0) {
                                        game.isFavorite = true;
                                    }
                                }
                            );
                        }
                        return games;
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Cannot find Player"});
                    }
                }
            );
        }
        else {
            return Q.resolve(games);
        }
    },

    /**
     * Search the game information of the Game by  gameType or providerId
     * @param {String} query - Query data
     */
    getGameListAPI: function (query, startIndex, count, playerId) {
        var deferred = Q.defer();
        if (query && query.providerId) {
            var providerObj = {providerId: query.providerId};
            dbconfig.collection_gameProvider.findOne(providerObj).lean().then(
                function (data) {
                    if (data && data._id) {
                        query.provider = data._id;
                        delete query.providerId;
                        deferred.resolve(dbGame.getGameList(query, startIndex, count, playerId));
                    } else {
                        deferred.reject({name: "DataError", message: "Cannot find Provider"})
                    }
                });
        } else {
            dbconfig.collection_players.findOne({playerId: playerId}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            }).lean().then(
                playerData => {
                    if (playerData && playerData.platform) {
                        query.provider = {$in: playerData.platform.gameProviders};
                    }
                    deferred.resolve(dbGame.getGameList(query, startIndex, count, playerId));
                }
            )
        }
        return deferred.promise;
    },

    getGameList: function (query, index, count, playerId) {
        index = index || 0;
        count = count || constSystemParam.MAX_RECORD_NUM;
        query = query || {};
        query.status = {$nin: [constGameStatus.DELETED, String(constGameStatus.DELETED)]};
        var deferred = Q.defer();
        var sum = 0;
        dbconfig.collection_game.find(query).count()
            .then(
                function (num) {
                    if (num) {
                        sum = num;
                        return dbconfig.collection_game.find(query).populate({
                            path: "provider",
                            model: dbconfig.collection_gameProvider
                        }).lean().skip(index).limit(count);
                    } else {
                        deferred.resolve(
                            {
                                stats: {totalCount: 0, startIndex: index},
                                gameList: []
                            }
                        );
                        return true;
                    }
                }
            )
            .then(
                games => dbGame.checkFavoriteGames(playerId, games)
            )
            .then(
                function (data) {
                    if (data && data.length > 0) {
                        data.forEach(game => game.provider = game.provider ? game.provider.providerId : null);
                    }
                    var result = {
                        stats: {totalCount: sum, startIndex: index},
                        gameList: data
                    };
                    deferred.resolve(result);
                },
                function (err) {
                    deferred.reject({name: "DataError", message: "Error finding games.", error: err})
                }
            )
            .catch(
                function (err) {
                    deferred.reject({name: "DBError", message: "Error getting games.", error: err})
                }
            );
        return deferred.promise;
    },

    /**
     * Search the game information of games by _ids
     * @param {String} query - Query string
     */
    getGames: function (query) {
        return dbconfig.collection_game.find({_id: {$in: query._ids}}).exec();
    },

    /**
     * Update game by gameName or _id of the Game schema
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updateGame: function (query, updateData) {
        return dbconfig.collection_game.findOneAndUpdate(query, updateData, {new: true}).exec();
    },

    updateGameAPI: function (query, updateData) {
        return dbconfig.collection_game.findOneAndUpdate(query, updateData, {new: true}).then(
            data => {
                if (data) {
                    return {gameId: query.gameId};
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Failed to find game '" + query.gameId + "'",
                        code: constServerCode.COMMON_ERROR
                    })
                }
            }
        );
    },

    /**
     * updates a set of data
     * @param {array}  gameArr
     */
    syncGameData: function (gameArr) {
        return dbconfig.collection_game.find().then(
            curGames => {
                var proms = [];
                //find new and update
                gameArr.forEach(
                    game => {
                        var isNew = true;
                        for (let i = 0; i < curGames.length; i++) {
                            if (curGames[i].gameId == game.gameId) {
                                isNew = false;
                            }
                        }
                        if (isNew) {
                            proms.push(dbGame.createGameAPI(game));
                        }
                        else {
                            proms.push(dbconfig.collection_game.update({gameId: game.gameId}, game).exec());
                        }
                    }
                );

                //find delete ones
                curGames.forEach(
                    curGame => {
                        var isOld = true;
                        for (let i = 0; i < gameArr.length; i++) {
                            if (gameArr[i].gameId == curGame.gameId) {
                                isOld = false;
                            }
                        }
                        if (isOld) {
                            proms.push(dbGame.deleteGameByGameId(curGame.gameId));
                        }
                    }
                );

                return Q.all(proms);
            }
        );
    },

    /**
     * Delete platform by object _id of the platform schema
     * @param {array}  gameObjIds - The object _ids of the platform
     */

    deleteGameByGameId: function (gameId) {
        var deferred = Q.defer();
        if (gameId) {
            dbconfig.collection_game.findOne({gameId: gameId}).then(
                function (data) {
                    if (data) {
                        deferred.resolve(dbGame.deleteGameById(data._id));
                    } else {
                        deferred.reject({name: "DataError", message: "Cannot find game"});
                    }
                });
        }
        return deferred.promise;
    },

    deleteGameByGameCode: function (gameId) {
        var deferred = Q.defer();
        if (gameId) {
            dbconfig.collection_game.findOne({gameId: gameId}).then(
                function (data) {
                    if (data) {
                        return dbGame.deleteGameById(data._id);
                    } else {
                        deferred.reject({
                            name: "DataError",
                            message: "Cannot find game",
                            code: constServerCode.COMMON_ERROR
                        });
                    }
                }
            ).then(
                data => {
                    if (data) {
                        deferred.resolve({gameId: gameId});
                    } else {
                        deferred.reject(data);
                    }
                }
            );
        }
        return deferred.promise;
    },

    deleteGameById: function (gameObjId) {
        var gameProm = dbconfig.collection_game.remove({_id: gameObjId}).exec();
        var statusProm = dbconfig.collection_platformGameStatus.remove(
            {game: gameObjId}
        ).exec();
        var groupProm = dbconfig.collection_platformGameGroup.update(
            {},
            {$pull: {"games": {game: gameObjId}}},
            {multi: true}
        );
        return Q.all([gameProm, statusProm, groupProm]);
    },

    /**
     * Search the game information  by gameProvider _id
     * @param {String} - _id of gameProvider
     */
    getGamesByProvider: function (providerObjId) {
        return dbconfig.collection_game.find({
            provider: providerObjId,
            status: {$ne: constGameStatus.DELETED}
        }).sort({showPriority: -1}).exec()
    },
    getGamesByProviders: function (ids) {
        var returnData = [];
        var proms = [];
        for (var i in ids) {
            var a = dbGame.getGamesByProvider(ids[i]).then(
                gameData => {
                    return Q.resolve(gameData);
                },
                error => {
                    return Q.resolve(false);
                }
            );
            proms.push(a);
        }
        return Q.all(proms).then(
            data => {
                for (var gameObj in data) {
                    if (data[gameObj]) {
                        returnData = returnData.concat(data[gameObj])
                    }
                }
                return returnData;
            }
        )
    },

    /**
     * Get games under a game Platform and gameProvider
     * @param {String} - _id of gameProvider and _id of gamePlatform
     */
    getGamesByPlatformAndProvider: function (platformObjId, providerObjId) {
        var deferred = Q.defer();

        var gamesUnderProvider = [];
        var gamesUnderProviderAndPlatform = null;
        dbconfig.collection_game.find({provider: providerObjId, status: {$ne: constGameStatus.DELETED}}).then(
            function (gamesData) {
                for (var i = 0; i < gamesData.length; i++) {
                    gamesUnderProvider.push(gamesData[i]._id);
                }
                return dbconfig.collection_platformGameStatus.find({
                    game: {$in: gamesUnderProvider},
                    platform: platformObjId,
                    status: {$ne: constGameStatus.DELETED}
                }).populate({path: "game", model: dbconfig.collection_game}).exec();
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding game for provider.", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find game for provider and platform."});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding game for provider and platform.",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    getGamesNotAttachedToPlatform: function (platformObjId, providerObjId) {
        var deferred = Q.defer();
        var gamesUnderProvider = [];
        var gamesNotUnderPlatform = null;
        dbconfig.collection_game.find({provider: providerObjId, status: {$ne: constGameStatus.DELETED}}).then(
            function (gamesData) {
                for (var i = 0; i < gamesData.length; i++) {
                    gamesUnderProvider.push(String(gamesData[i]._id));
                }
                return dbconfig.collection_platformGameStatus.find(
                    {
                        game: {$in: gamesUnderProvider},
                        platform: platformObjId,
                        status: {$ne: constGameStatus.DELETED}
                    }
                ).exec();
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding game for provider.", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    for (var i = 0; i < data.length; i++) {
                        var index = gamesUnderProvider.indexOf(String(data[i].game));
                        if (index >= 0) {
                            gamesUnderProvider.splice(index, 1);
                        }
                    }
                    return dbconfig.collection_game.find({_id: {$in: gamesUnderProvider}}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find game status for provider and platform."});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding game status for provider and platform.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find game for provider and platform."});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding game for provider and platform.",
                    error: error
                });
            }
        );
        return deferred.promise;

    },

    getProviderGames: function (providerId) {
        return dbconfig.collection_gameProvider.findOne({providerId: providerId}).then(
            function (data) {
                if (data) {
                    return dbconfig.collection_game.find({provider: data._id, status: {$ne: constGameStatus.DELETED}});
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find game provider."});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding game provider.", error: error});
            }
        );
    },

    modifyGamePassword: function(playerId, providerId, newPassword, creator) {
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            playerData => {
                if( playerData && playerData.platform ){
                    let requestData = {
                        username: playerData.name,
                        platformId: playerData.platform.platformId,
                        providerId: providerId,
                        newPassword: newPassword
                    };

                    let proposalData = {
                        creator: creator? creator :
                            {
                                type: 'player',
                                name: playerData.name,
                                id: playerData._id
                            },
                        data: {
                            _id:playerData._id,
                            playerId: playerData.playerId,
                            platformId: playerData.platform,
                            isIgnoreAudit: true,
                            updateGamePassword: true,
                            remark: '修改供应商密码'

                        },
                        entryType: creator ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };
                    return dbProposal.createProposalWithTypeName(playerData.platform,constProposalType.UPDATE_PLAYER_INFO,proposalData).then(
                        () => {
                            return cpmsAPI.player_modifyGamePassword(requestData);
                        }
                    )

                }
                else{
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        );
    },

    syncGameImage: (games) => {
        const gameProms = games.map(
            game => {
                let paramName = "images." + game.platformId;
                let updateObj = {
                };
                updateObj[paramName] = game.imgAddr;
                return dbconfig.collection_game.findOneAndUpdate({gameId: game.gameId}, updateObj);
            }
        );
        return Q.all(gameProms);
    }

};

var proto = dbGameFunc.prototype;
proto = Object.assign(proto, dbGame);

// This make WebStorm navigation work
module.exports = dbGame;


