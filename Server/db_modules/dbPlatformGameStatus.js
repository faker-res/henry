/**
 * Created by hninpwinttin on 22/1/16.
 */

var dbPlatformGameStatusFunc = function () {
};
module.exports = new dbPlatformGameStatusFunc();

var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
var Q = require('q');
var constSystemParam = require('../const/constSystemParam');
var dbPlatformGameGroup = require("../db_modules/dbPlatformGameGroup");
var dbGame = require("../db_modules/dbGame");

var dbPlatformGameStatus = {

    /**
     * Create a platformGameStatus ( addGameToAPlatform )
     * @param {json} data - The data of the Game. Refer to Game schema.
     */
    createPlatformGameStatus: function (gameData) {
        var platformGameStatus = new dbconfig.collection_platformGameStatus(gameData);
        return platformGameStatus.save();
    },

    createPlatformGamesStatus: function (platform, games) {
        var arr = [];
        var result = {success: [], fail: []};
        games.forEach(
            game => {
                var newRecord = {
                    platform: platform,
                    game: game.game,
                    name: game.name,
                    visible: game.visible
                };
                arr.push(dbPlatformGameStatus.createPlatformGameStatus(newRecord).then(
                    data => {
                        result.success.push(data);
                        return true;
                    },
                    err => {
                        result.fail.push(err);
                        return true;
                    })
                );
            }
        );
        return Q.all(arr)
            .then(data => {
                return result;
            })
    },

    deletePlatformGameStatus: function (data) {
        return dbconfig.collection_platformGameStatus.remove({game: data.game, platform: data.platform}).exec();
    },
    detachPlatformGamesStatus: function (platform, games) {
        var arr = [];
        var result = {success: [], fail: []};
        games.forEach(
            game => {
                var newRecord = {
                    platform: platform,
                    game: game.game,
                };
                arr.push(dbPlatformGameStatus.deletePlatformGameStatus(newRecord).then(
                    data => {
                        result.success.push(data);
                        return true;
                    },
                    err => {
                        result.fail.push(err);
                        return true;
                    })
                );
            }
        );
        return Q.all(arr)
            .then(data => {
                return result;
            })
    },

    updatePlatformGameStatus: function (query, data) {
        var game = mongoose.Types.ObjectId(query.game);
        var platform = mongoose.Types.ObjectId(query.platform);


        return dbconfig.collection_platformGameStatus.findOneAndUpdate(
            {game: game, platform: platform},
            data
        ).exec();
    },

    addProviderGamesToPlatform: function (providerObjId, platformObjId) {
        //find all provider games
        return dbconfig.collection_game.find({provider: providerObjId}).then(
            games => {
                if (games && games.length > 0) {
                    var proms = [];
                    games.forEach(
                        game => {
                            var newRecord = {
                                platform: platformObjId,
                                game: game._id,
                                name: game.name,
                                visible: game.visible
                            };
                            proms.push(dbPlatformGameStatus.createPlatformGameStatus(newRecord));
                        }
                    );
                    return Q.all(proms);
                }
            }
        );
    },

    removeProviderGamesFromPlatform: function (providerObjId, platformObjId) {
        //find all provider games
        return dbconfig.collection_game.find({provider: providerObjId}).then(
            games => {
                if (games && games.length > 0) {
                    var proms = [];
                    games.forEach(
                        game => proms.push(dbPlatformGameStatus.deletePlatformGameStatus({
                            platform: platformObjId,
                            game: game._id
                        }))
                    );
                    return Q.all(proms);
                }
            }
        );
    },

    getGroupGames: function (platformId, groupCode) {
        if (groupCode != null) {
            return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
                platformData => {
                    if (platformData) {
                        return dbconfig.collection_platformGameGroup.findOne({
                            code: groupCode,
                            platform: platformData._id
                        }).lean()
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Cannot find platform"});
                    }
                }
            ).then(
                groupData => {
                    if (groupData) {
                        return dbPlatformGameGroup.getAllSubTreeIdById(groupData._id);
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Cannot find game group"});
                    }
                }
            ).then(
                groupIds => {
                    return dbconfig.collection_platformGameGroup.find({_id: {$in: groupIds}}).lean();
                }
            ).then(
                groups => {
                    if (groups) {
                        var games = [];
                        for (var i = 0; i < groups.length; i++) {
                            games = games.concat(groups[i].games.map(game => String(game.game)));
                        }
                        return games;
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Cannot find game groups"});
                    }
                }
            );
        }
        else {
            return Q.resolve(null);
        }
    },

    searchGame: function (platformId, name, type, groupCode, playerId, playGameType) {
        function getGameType(type) {
            if (type != null) {
                return dbconfig.collection_game.find({type: type}, {_id: 1}).lean();
            }
            else {
                return Q.resolve(null);
            }
        }

        var platformGames = null;
        var typeProm = getGameType(type);
        var platformProm = dbconfig.collection_platform.findOne({platformId: platformId}).lean();
        var groupProm = dbPlatformGameStatus.getGroupGames(platformId, groupCode);
        return Q.all([platformProm, typeProm, groupProm]).then(
            data => {
                if (data && data[0]) {
                    var queryObj = {
                        platform: data[0]._id
                    };
                    if (name) {
                        queryObj.name = {$regex: name};
                    }
                    var games = null;
                    var bGames = groupCode != null || type != null ? true : false;
                    if (data[1]) {
                        games = data[1].map(type => type._id);
                    }
                    if (data[2]) {
                        var groupGames = data[2];//.games.map(game => game.game);
                        if (games) {
                            //and game arrays
                            games = games.filter(
                                function (obj) {
                                    return groupGames.some(function (game) {
                                        return game && game.gameId == obj.gameId;
                                    });
                                }
                            )
                        }
                        else {
                            games = groupGames;
                        }
                    }
                    if (games && games.length > 0) {
                        queryObj.game = {$in: games};
                    }
                    if (bGames && games.length == 0) {
                        return [];
                    }
                    else {
                        return dbconfig.collection_platformGameStatus.find(queryObj).lean().limit(constSystemParam.MAX_RECORD_NUM);
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform or game"});
                }
            }
        ).then(
            data => {
                platformGames = data;
                if (platformGames && platformGames.length > 0) {
                    platformGames = platformGames.filter(game => game.status != 4);
                    var queryObj = {_id: {$in: platformGames.map(game => game.game)}};
                    if( playGameType ){
                        queryObj.playGameType = playGameType;
                    }
                    return dbconfig.collection_game.find(queryObj)
                        .populate({path: "provider", model: dbconfig.collection_gameProvider}).lean();
                }
                else {
                    return platformGames;
                }
            }
        ).then(
            games => {
                if (games && games.length > 0) {
                    var platformGamesMap = {};
                    platformGames.forEach(game => platformGamesMap[game.game] = game);
                    games.forEach(
                        game => {
                            if (platformGamesMap[game._id] && platformGamesMap[game._id].smallShow) {
                                game.smallShow = platformGamesMap[game._id].smallShow;
                            }
                            game.provider = game.provider.providerId;
                        }
                    );
                    return games;
                }
                else {
                    return games;
                }
            }
        ).then(
            games => dbGame.checkFavoriteGames(playerId, games)
        );
    },

    searchGameByGroup: function (platformId, groups) {
        var findCommonElements = function (arrs) {
            var resArr = [];
            for (var i = arrs[0].length - 1; i > 0; i--) {
                for (var j = arrs.length - 1; j > 0; j--) {
                    if (arrs[j].indexOf(arrs[0][i]) == -1) {
                        break;
                    }
                }
                if (j === 0) {
                    resArr.push(arrs[0][i]);
                }
            }
            return resArr;
        };
        var platformGames = null;
        var proms = [];
        groups.forEach(
            group => {
                proms.push(dbPlatformGameStatus.getGroupGames(platformId, group));
            }
        );
        return Q.all(proms).then(
            groupGames => {
                if (groupGames && groupGames.length > 0) {
                    var resGames = findCommonElements(groupGames);
                    return dbconfig.collection_platformGameStatus.find({game: {$in: resGames}}).lean();
                }
                else {
                    return [];
                }
            }
        ).then(
            data => {
                platformGames = data;
                if (platformGames && platformGames.length > 0) {
                    return dbconfig.collection_game.find({_id: {$in: platformGames.map(game => game.game)}})
                        .populate({path: "provider", model: dbconfig.collection_gameProvider}).lean();
                }
                else {
                    return platformGames;
                }
            }
        ).then(
            games => {
                if (games && games.length > 0) {
                    var platformGamesMap = {};
                    platformGames.forEach(game => platformGamesMap[game.game] = game);
                    games.forEach(
                        game => {
                            if (platformGamesMap[game._id] && platformGamesMap[game._id].smallShow) {
                                game.smallShow = platformGamesMap[game._id].smallShow;
                            }
                            game.provider = game.provider.providerId;
                        }
                    );
                    return games;
                }
                else {
                    return games;
                }
            }
        );
    }

};

var proto = dbPlatformGameStatusFunc.prototype;
proto = Object.assign(proto, dbPlatformGameStatus);

// This make WebStorm navigation work
module.exports = dbPlatformGameStatus;


