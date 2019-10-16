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
var constGameStatus = require("./../const/constGameStatus");

var dbPlatformGameStatus = {

    /**
     * Create a platformGameStatus ( addGameToAPlatform )
     * @param {json} data - The data of the Game. Refer to Game schema.
     */
    createPlatformGameStatus: function (gameData) {
        var platformGameStatus = new dbconfig.collection_platformGameStatus(gameData);
        return platformGameStatus.save();
    },

    // purpose : we want to avoid generate duplicate fpms game status
    // if dont exist , then we create it, if exist , then we update it.
    createIFNotPlatformGameStatus: function (gameData) {
        let query = {};
        let updateData = {
            name: gameData.name,
            visible: gameData.visible
        };

        if(gameData.game){
            query.game = gameData.game;
        }

        if(gameData.platform){
            query.platform = gameData.platform;
        }

        return dbconfig.collection_platformGameStatus.findOneAndUpdate(
            gameData,
            {
                $set:updateData,
                $setOnInsert : {
                    status: constGameStatus.ENABLE,
                    maintenanceHour: null,
                    maintenanceMinute: null
                }
            },
            {new: true, upsert: true}
        ).lean();
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
                arr.push(dbPlatformGameStatus.createIFNotPlatformGameStatus(newRecord).then(
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
        var game = query.game;
        var platform = mongoose.Types.ObjectId(query.platform);
        game.forEach((element)=> {
            element = mongoose.Types.ObjectId(element)
        });

        return dbconfig.collection_platformGameStatus.update(
            {game: {$in: game}, platform: platform},
            data,
            {multi: true}
        ).exec();
    },

    updateProviderNeedLoginShow: function (platformId, gameProviderObjId, needLoginShow) {
        let updateData = {};
        updateData[`needLoginShow.${platformId}`] = needLoginShow;
        return dbconfig.collection_gameProvider.update({_id: gameProviderObjId}, updateData);
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
                            proms.push(dbPlatformGameStatus.createIFNotPlatformGameStatus(newRecord));
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

    searchGame: function (platformId, name, type, groupCode, playerId, playGameType, providerId) {
        let platformGames = null;
        let typeProm = getGameType(type);
        let platformProm = dbconfig.collection_platform.findOne({platformId: platformId}).lean();
        let groupProm = dbPlatformGameStatus.getGroupGames(platformId, groupCode);
        let playerRouteSetting = null;
        let gamesInGroup = null;

        return Promise.all([platformProm, typeProm, groupProm]).then(
            data => {
                if (data && data[0]) {
                    playerRouteSetting = data[0].playerRouteSetting;

                    let games = null;
                    let bGames = groupCode != null || type != null;

                    let queryObj = {
                        platform: data[0]._id
                    };

                    if (name) {
                        queryObj.name = new RegExp(name);
                    }

                    if (data[1]) {
                        games = data[1].map(type => type._id);
                    }

                    if (data[2]) {
                        let groupGames = data[2];//.games.map(game => game.game);
                        gamesInGroup =  data[2];

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

                    if (bGames && (!games || games.length === 0)) {
                        return [];
                    }
                    else {
                        return dbconfig.collection_platformGameStatus.find(queryObj).lean();
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform or game"});
                }
            }
        ).then(
            data => {
                platformGames = data;
                let changedNameSearch = {};
                let queryObj = {
                    $or: []
                };
                let queryField;

                if (platformGames && platformGames.length > 0) {
                    queryObj.$or.push({_id: {$in: platformGames.map(game => game.game)}});
                }

                if (name && platformId) {
                    // changedNameSearch[platformId] = {$regex: new RegExp(name)};
                    queryField = 'changedName.' + platformId;
                    changedNameSearch = {$regex: new RegExp(name)};
                }

                if (queryField && changedNameSearch) {
                    let customNameObj = {};
                    customNameObj[queryField] = changedNameSearch;
                    if (gamesInGroup && gamesInGroup.length) {
                        queryObj.$or.push({$and: [customNameObj, {_id: {$in: gamesInGroup}}]});
                    } else {
                        queryObj.$or.push(customNameObj);
                    }
                }

                if (playGameType) {
                    queryObj.playGameType = playGameType;
                }

                return dbconfig.collection_game.find(queryObj)
                    .populate({path: "provider", model: dbconfig.collection_gameProvider}).lean()
                    .then(games => games ? games : platformGames);
            }
        ).then(
            games => {
                if (games && games.length > 0) {
                    if(providerId){
                        games = games.filter(game => game.status != 4 && game.provider.providerId == providerId);
                    }else{
                        games = games.filter(game => game.status != 4);
                    }

                    // display the status of collection_game with the status in collection_dbPlatformGameStatus
                    games.map( game => {
                        let filteredPlatformGame = platformGames.find( platformGame => {
                            return platformGame.game.toString() == game._id.toString() && platformGame.status != game.status
                        })

                        if (filteredPlatformGame){
                            return game.status = filteredPlatformGame.status
                        }
                    });

                    var platformGamesMap = {};

                    platformGames.forEach(game => platformGamesMap[game.game] = game);
                    games.forEach(
                        game => {
                            if (platformGamesMap[game._id] && platformGamesMap[game._id].smallShow) {
                                game.smallShow = platformGamesMap[game._id].smallShow;
                            }

                            let gameChangedName = {};
                            if(game.changedName && platformId){
                                Object.keys(game.changedName).forEach(function(key) {
                                    if(key == platformId){
                                        gameChangedName[key] = game.changedName[key];
                                        return;
                                    }
                                });
                                game.changedName = gameChangedName;
                            }

                            let gameChangedImage = {};
                            if(game.images && platformId){
                                Object.keys(game.images).forEach(function(key) {
                                    if(key == platformId){
                                        if(game.images[key] && !game.images[key].includes("http")){
                                            gameChangedImage[key] = playerRouteSetting ? playerRouteSetting + game.images[key] : (game.sourceURL ? game.sourceURL + game.images[key] : game.images[key]);
                                        }else{
                                            gameChangedImage[key] = game.images[key];
                                        }

                                        return;
                                    }
                                });
                                game.images = gameChangedImage;
                            }

                            if(game.bigShow && !game.bigShow.includes("http")){
                                game.bigShow = playerRouteSetting ? playerRouteSetting + game.bigShow : (game.sourceURL ? game.sourceURL + game.bigShow : game.bigShow);
                            }

                            if(game.smallShow && !game.smallShow.includes("http")){
                                game.smallShow = playerRouteSetting ? playerRouteSetting + game.smallShow : (game.sourceURL ? game.sourceURL + game.smallShow : game.smallShow);
                            }

                            if (game.webp && !game.webp.includes("http")) {
                                game.webp = playerRouteSetting ? playerRouteSetting + game.webp : (game.sourceURL ? game.sourceURL + game.webp : game.webp);
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

        function getGameType(type) {
            if (type != null) {
                return dbconfig.collection_game.find({type: type}, {_id: 1}).lean();
            }
            else {
                return Q.resolve(null);
            }
        }
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
