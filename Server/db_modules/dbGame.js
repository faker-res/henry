'use strict';

var dbGameFunc = function () {
};
module.exports = new dbGameFunc();

const dbutility = require('./../modules/dbutility');
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
var ebetRTN = require("./../modules/ebetRTN");
var dbconfig = require('./../modules/dbproperties');
var dbPlatformGameStatus = require('./../db_modules/dbPlatformGameStatus');
var dbProposal = require('./../db_modules/dbProposal');
var constSystemParam = require('./../const/constSystemParam');
var constEBETBaccaratResult = require('./../const/constEBETBaccaratResult');
var constServerCode = require('./../const/constServerCode');
var constGameStatus = require('../const/constGameStatus');
var constProviderStatus = require('../const/constProviderStatus');
var constProposalEntryType = require('../const/constProposalEntryType');
var constProposalUserType = require('../const/constProposalUserType');
var constProposalType = require('../const/constProposalType');
var constEBETBaccaratTableStatus = require('../const/constEBETBaccaratTableStatus');
var constEBETBaccaratPairResult = require('../const/constEBETBaccaratPairResult');
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
    getGameListAPI: function (query, startIndex, count, playerId, platformId) {
        let providerProm = Promise.resolve();
        if (query && query.providerId) {
            let providerQuery = {providerId: query.providerId};
            providerProm = dbconfig.collection_gameProvider.findOne(providerQuery).lean();
        }

        let platformProm = Promise.resolve();
        if (platformId) {
            platformProm = dbconfig.collection_platform.findOne({platformId: platformId}).lean();
        }

        let playerProm = Promise.resolve();
        if (playerId) {
            playerProm = dbconfig.collection_players.findOne({playerId: playerId}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            }).lean();
        }

        return Promise.all([providerProm, platformProm, playerProm]).then(
            data => {
                let provider, platform, player;
                if (!data) {
                    return ;
                }

                if (data[0]) {
                    provider = data[0];
                }

                if (data[1]) {
                    platform = data[1];
                }

                if (data[2]) {
                    player = data[2];
                }

                let bannedProvider = [];

                if (player) {
                    bannedProvider = player.forbidProviders;
                    platform = player.platform;
                }

                if (platform) {
                    let gameProviderInfo = platform.gameProviderInfo || {};
                    let gameProviderInfoKeys = Object.keys(gameProviderInfo);

                    for (let i = 0; i < gameProviderInfoKeys.length; i++) {
                        let key = gameProviderInfoKeys[i];
                        let provider = gameProviderInfo[key];
                        if (provider && provider.isEnable === false) {
                            bannedProvider.push(key);
                        }
                    }
                }

                if (provider) {
                    query.provider = provider._id;
                    delete query.providerId;
                }

                if (!query.provider) {
                    query.provider = {$in: platform.gameProviders};
                }

                return dbGame.getGameList(query, startIndex, count, playerId, bannedProvider, platform.platformId);
            }
        );
    },

    getGameList: function (query, index, count, playerId, bannedProvider, platformId) {
        bannedProvider = bannedProvider || [];
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
                    let games = [];
                    if (data && data.length > 0) {
                        games = data;

                        for (let i = 0; i < games.length; i++) {
                            let game = games[i];

                            if (game.provider) {
                                bannedProvider = bannedProvider.map(providerId => {
                                    return String(providerId);
                                });

                                if (platformId) {
                                    game.provider.status = dbutility.getPlatformSpecificProviderStatus(game.provider, platformId);
                                }

                                if (bannedProvider.indexOf(String(game.provider._id)) >= 0) {
                                    game.provider.status = constProviderStatus.MAINTENANCE;
                                }

                                if (game.provider.status != constProviderStatus.NORMAL) {
                                    game.status = constGameStatus.MAINTENANCE;
                                }
                            }
                            game.provider = game.provider ? game.provider.providerId : null;
                        }
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
        console.log('MT --checking syncData -1');
        return dbconfig.collection_game.find().then(
            curGames => {
                console.log('MT --checking syncData -2');
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
        ).then(
            data => {
                console.log('MT --checking syncData -3');
                return true
            },
            error => {
                return Q.reject({name: "DBError", message: "Sync data failed.", error: error});
            }
        )
    },

    /**
     * updates a set of data
     * @param {array}  gameArr
     */
    syncWebp: function (gameArr) {
        console.log('MT --checking syncWebp')
        let proms = [];
        if (gameArr.length && gameArr.length > 0) {
            gameArr.forEach(game => {
                console.log(game)
                let prom = dbconfig.collection_game.findOneAndUpdate({gameId: game.gameId}, {webp: game.webp}).exec()
                proms.push(prom);
            })
        }
        return Promise.all(proms).then(
            data => {
                let result = [];
                data.forEach( item => {
                    if (item && item.gameId && item.webp && item.name && item.code) {
                        result.push({'gameId': item.gameId, 'webp': item.webp, 'name': item.name, 'code':item.code });
                    } else {
                        result.push({});
                    }
                })
                return result;
            }
        )
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
    getGamesByProviderAndFPMS: function (platformObjId, providerObjId) {
        let proms = [];
        let gameList = [];

        return dbconfig.collection_game.find({
            provider: providerObjId,
            status: {$ne: constGameStatus.DELETED}
        }).sort({showPriority: -1}).lean()
            .then(data => {
                if (data && data.length > 0) {
                    data.forEach(gameData => {

                        let game = gameData;
                        let prom = dbconfig.collection_platformGameStatus.find({
                            game: {$in: game._id},
                            platform: platformObjId
                        }).populate({path: "game", model: dbconfig.collection_game})
                            .then(platformGameStatus => {

                                if (platformGameStatus && platformGameStatus.length > 0) {
                                    game.platformGameStatus = platformGameStatus[0].status
                                } else {
                                    game.platformGameStatus = 5;
                                }
                                return game;
                            })
                        proms.push(prom);
                    });
                }
                return Q.all(proms)
            })
    },
    updatePlatformGameStatus: function(platformObjId, game, status){
        // update fpms game status
        let gameData = { platform: platformObjId };
        let updateData=  { status:status};

        if(game._id){
            gameData.game = game._id;
        }
        if(game.name){
            updateData.name = game.name
        }
        return dbconfig.collection_platformGameStatus.findOneAndUpdate(
            gameData,
            updateData,
            {new: true, upsert: true}
        ).exec();
    },
    updatePlatformGameDisplay: function(platformObjId, game, gameDisplay){
        // update fpms game status
        let gameData = {};
        let updateData=  { gameDisplay: gameDisplay};

        if(game._id){
            gameData._id = game._id;
        }
        return dbconfig.collection_game.findOneAndUpdate(
            gameData,
            updateData,
            {new: true}
        ).exec();
    },
    updatePlatformGameOrientation: function(platformObjId, game, orientation){
        // update fpms game status
        let gameData = {};
        let updateData=  {};
        let orientationSetting;
        if(game._id){
            gameData._id = game._id;
        }

        return dbconfig.collection_game.findOne({'_id':game._id})
        .then( data => {
            if (data) {
                orientationSetting = data.orientationSetting ? data.orientationSetting : {};
                orientationSetting[platformObjId] = String(orientation);
                updateData = { 'orientationSetting': orientationSetting }

                return dbconfig.collection_game.findOneAndUpdate(
                    gameData,
                    updateData,
                    {new: true}
                ).exec();
            }
        })
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
                }).populate({path: "game", model: dbconfig.collection_game});
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

    modifyGamePassword: function(playerId, providerId, newPassword, creator, inputDevice) {
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
                        inputDevice: inputDevice ? inputDevice : 0
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
    },

    renameGame: (platformObjId, gameObjId, newName) => {
        if(!platformObjId || !gameObjId){
            return;
        }

        let platform;

        return dbconfig.collection_platform.findOne({_id: platformObjId}).then(
            platformData => {
                if(platformData && platformData.platformId){
                    platform = platformData;

                    return dbconfig.collection_game.findOne({_id: gameObjId});
                }
            }
        ).then(
            gameData => {
                if(gameData){
                    let changedNameObj = {};
                    changedNameObj[platform.platformId] = newName;

                    if(gameData.changedName && gameData.changedName.hasOwnProperty(platform.platformId)){
                        if(newName){
                            gameData.changedName[platform.platformId] = newName;
                        }else{
                            delete gameData.changedName[platform.platformId];
                        }

                    }else{
                        gameData.changedName = Object.assign(gameData.changedName || {}, changedNameObj);
                    }

                    return dbconfig.collection_game.findOneAndUpdate({_id: gameObjId}, {changedName: gameData.changedName});
                }
            }
        )
    },

    updateImageUrl: (data, fileData) => {
        return cpmsAPI.game_updateImageUrl(data, fileData);
    },

    getLiveGameInfo: (count, switchNotify, conn) => {
        switchNotify = switchNotify == "true" || switchNotify == true? true: false; // may accept "false"
        conn.EBETNotify = switchNotify;// for notifyLiveGameStatus usage
        if(!switchNotify) {
            return Promise.resolve();
        }

        const constTableStatus = { // refer constEBETBaccaratTableStatus
            30001: 1,
            30002: 2,
            30003: 0
        };
        const constBaccaratResult = { // refer constEBETBaccaratResult
            60: 0,
            68: 2,
            80: 1,
        };
        let sortedLuZhuData = {};
        let returnData = {
            stats: {totalCount: 0},
            list: []
        };
        return ebetRTN.query(1, count).then(
            luZhuData => {
                if (!(luZhuData && luZhuData.data && luZhuData.data.length)) {
                    return returnData;
                }

                luZhuData.data.forEach(
                    luZhu => {
                        let luZhuDetails = luZhu && luZhu.data;
                        if (!sortedLuZhuData[luZhu.table]) {
                            sortedLuZhuData[luZhu.table] = {
                                tableNumber: luZhu.table,
                                dealerName: luZhuDetails && luZhuDetails.dealer || "",
                                status: constTableStatus[luZhu.notifyType],
                                totalMakers: 0,
                                totalPlayer: 0,
                                totalTie: 0,
                                historyList: []
                            };

                            if (luZhuDetails && luZhuDetails.hasOwnProperty("betTimeSec")) {
                                sortedLuZhuData[luZhu.table].countdown = luZhuDetails.betTimeSec;
                            }

                        }
                        if (!sortedLuZhuData[luZhu.table].dealerName && luZhuDetails && luZhuDetails.dealer) {
                            sortedLuZhuData[luZhu.table].dealerName = luZhuDetails.dealer;
                        }

                        if (!sortedLuZhuData[luZhu.table].hasOwnProperty("countdown") && luZhuDetails && luZhuDetails.hasOwnProperty("betTimeSec")) {
                            sortedLuZhuData[luZhu.table].countdown = luZhuDetails.betTimeSec;
                        }

                        if (luZhu.notifyType && luZhu.notifyType == constEBETBaccaratTableStatus.PAYOUT) {
                            let luZhuBaccarat = luZhuDetails && luZhuDetails.result && luZhuDetails.result.baccarat;
                            let baccaratWinner = luZhuBaccarat && luZhuBaccarat.winner;
                            let bankerPoints;
                            let playerPoints;
                            let pairResult = constEBETBaccaratPairResult.NO_PAIR;
                            if (luZhuBaccarat && luZhuBaccarat.bankerCard && luZhuBaccarat.bankerCard.length) {
                                bankerPoints = 0;
                                luZhuBaccarat.bankerCard.forEach(
                                    bankerCard => {
                                        let points = Number(bankerCard.substring(1));
                                        if (!isNaN(points)) {
                                            bankerPoints += points;
                                        }
                                    }
                                )
                                bankerPoints %= 10;
                            }

                            if (luZhuBaccarat && luZhuBaccarat.playerCard && luZhuBaccarat.playerCard.length) {
                                playerPoints = 0;
                                luZhuBaccarat.playerCard.forEach(
                                    playerCard => {
                                        let points = Number(playerCard.substring(1));
                                        if (!isNaN(points)) {
                                            playerPoints += points;
                                        }
                                    }
                                )
                                playerPoints %= 10;
                            }

                            if (luZhuBaccarat.bankerPair && luZhuBaccarat.playerPair) {
                                pairResult = constEBETBaccaratPairResult.BANK_PLAYER_PAIR;
                            } else if (luZhuBaccarat.bankerPair) {
                                pairResult = constEBETBaccaratPairResult.BANKER_PAIR;
                            } else if (luZhuBaccarat.playerPair) {
                                pairResult = constEBETBaccaratPairResult.PLAYER_PAIR;
                            }

                            if (baccaratWinner) {
                                if (baccaratWinner == constEBETBaccaratResult.BANKER) {
                                    sortedLuZhuData[luZhu.table].totalMakers += 1;
                                } else if (baccaratWinner == constEBETBaccaratResult.PLAYER) {
                                    sortedLuZhuData[luZhu.table].totalPlayer += 1;
                                } else if (baccaratWinner == constEBETBaccaratResult.TIE) {
                                    sortedLuZhuData[luZhu.table].totalTie += 1;
                                }
                            }

                            let historyObj = {
                                bureauNo: luZhuDetails && luZhuDetails.roundId,
                                result: baccaratWinner && constBaccaratResult[baccaratWinner],
                                makersPoints: bankerPoints,
                                playerPoints: playerPoints,
                                pair: pairResult
                            }
                            sortedLuZhuData[luZhu.table].historyList.push(historyObj);
                        }
                    }
                );

                for (let key in sortedLuZhuData) {
                    returnData.list.push(sortedLuZhuData[key]);
                }

                returnData.stats.totalCount = returnData.list.length;
                return returnData;
            }
        )
    },

    notifyLiveGameStatus: (data) => {
        var wsMessageClient = serverInstance.getWebSocketMessageClient();
        if (wsMessageClient) {
            const constTableStatus = { // refer constEBETBaccaratTableStatus
                30001: 1,
                30002: 2,
                30003: 0
            };

            const constBaccaratResult = { // refer constEBETBaccaratResult
                60: 0,
                68: 2,
                80: 1,
            };

            if (data && data.data) {
                try {
                    data.data = JSON.parse(data.data);
                } catch (e) {
                }
            }

            let luZhuData = data && data.data && data.data.tableEventData;
            let sendData = {};


            if (luZhuData) {
                sendData.status = constTableStatus[luZhuData.notifyType];
                sendData.tableNumber = luZhuData.table;
                sendData.dealerName = luZhuData.data && luZhuData.data.dealer || ""

                if (luZhuData.notifyType == constEBETBaccaratTableStatus.PAYOUT) {
                    sendData.dealerName = luZhuData.data.dealer;

                    let luZhuBaccarat = luZhuData && luZhuData.data && luZhuData.data.result && luZhuData.data.result.baccarat;
                    let baccaratWinner = luZhuBaccarat && luZhuBaccarat.winner;
                    let bankerPoints;
                    let playerPoints;
                    let pairResult = constEBETBaccaratPairResult.NO_PAIR;
                    if (luZhuBaccarat && luZhuBaccarat.bankerCard && luZhuBaccarat.bankerCard.length) {
                        bankerPoints = 0;
                        luZhuBaccarat.bankerCard.forEach(
                            bankerCard => {
                                let points = Number(bankerCard.substring(1));
                                if (!isNaN(points)) {
                                    bankerPoints += points;
                                }
                            }
                        )
                        bankerPoints %= 10;
                    }

                    if (luZhuBaccarat && luZhuBaccarat.playerCard && luZhuBaccarat.playerCard.length) {
                        playerPoints = 0;
                        luZhuBaccarat.playerCard.forEach(
                            playerCard => {
                                let points = Number(playerCard.substring(1));
                                if (!isNaN(points)) {
                                    playerPoints += points;
                                }
                            }
                        )
                        playerPoints %= 10;
                    }

                    if (luZhuBaccarat.bankerPair && luZhuBaccarat.playerPair) {
                        pairResult = constEBETBaccaratPairResult.BANK_PLAYER_PAIR;
                    } else if (luZhuBaccarat.bankerPair) {
                        pairResult = constEBETBaccaratPairResult.BANKER_PAIR;
                    } else if (luZhuBaccarat.playerPair) {
                        pairResult = constEBETBaccaratPairResult.PLAYER_PAIR;
                    }

                    sendData.result = baccaratWinner && constBaccaratResult[baccaratWinner];
                    sendData.makersPoints = bankerPoints;
                    sendData.playerPoints = playerPoints;
                    sendData.pair = pairResult;


                } else if (luZhuData.notifyType == constEBETBaccaratTableStatus.BETTING && luZhuData.data && luZhuData.data.hasOwnProperty("betTimeSec")) {
                    sendData.countdown = luZhuData.data.betTimeSec
                }
            }
            sendData.clientAPIServerNo = global.clientAPIServerNo;
            wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "game", "notifyLiveGameStatus", sendData);
        }
        return data;
    },
};

var proto = dbGameFunc.prototype;
proto = Object.assign(proto, dbGame);

// This make WebStorm navigation work
module.exports = dbGame;
