'use strict';

var dbconfig = require('./../modules/dbproperties');
var dbGame = require('./../db_modules/dbGame');
var constGameStatus = require('./../const/constGameStatus');
var Q = require("q");

var dbPlatformGameGroup = {

    /**
     * Create a new game group
     * @param {String}  platform - platform ObjId
     * @param {String}  parent -  its parent GameGroup ObjId
     * @param {String}  name, code, displayName
     */
    addPlatformGameGroup: function (platform, name, parent, displayName) {
        return dbPlatformGameGroup.createGameGroupWithParent({
            name: name,
            //code: code,
            displayName: displayName,
            platform: platform,
            parent: parent,
            games: []
        });
    },

    /**
     * Update the  game group
     * @param {json}  query - queryData
     * @param {json}  updateData -  updateData
     */
    updatePlatformGameGroup: function (query, updateData) {
        return dbconfig.collection_platformGameGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },

    /**
     * Get all the game groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformGameGroup: function (platformId) {
        return dbconfig.collection_platformGameGroup.aggregate(
            {
                $match: {
                    platform: platformId
                }
            }
        ).exec();
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
                                    if (game.game && playerData.favoriteGames.indexOf(game.game._id) >= 0) {
                                        game.game.isFavorite = true;
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
     * Get all the games in the group
     * @param {String}  query - code
     * @param {String}  query - platformId
     * @param {Number} [startIndex]
     * @param {Number} [count]
     * @returns {*}
     */
    getGameGroupGames: function (query, startIndex, count, playerId, providerId) {
        var gameStatusDataProm = [];
        var platformObjId = null;
        var gameGroup = [];
        var providerObjId = null;
        return dbconfig.collection_platform.findOne({platformId: query.platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    var providerProm = Q.resolve(null);
                    if (providerId != null) {
                        providerProm = dbconfig.collection_gameProvider.findOne({providerId}).lean();
                    }
                    return providerProm.then(
                        providerData => {
                            if (providerData) {
                                providerObjId = providerData._id;
                            }
                            return dbconfig.collection_platformGameGroup.findOne({
                                platform: platformObjId,
                                code: query.code
                            })
                                .populate({path: "games.game", model: dbconfig.collection_game}).lean();
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            gameGroupData => {
                if (gameGroupData) {
                    gameGroup = gameGroupData;
                    if (gameGroupData && gameGroupData.games && gameGroupData.games.length > 0) {
                        gameGroupData.games.forEach(
                            game => {
                                if (game && game.game) {
                                    gameStatusDataProm.push(dbconfig.collection_platformGameStatus.findOne({
                                        game: game.game._id,
                                        platform: platformObjId
                                    }).lean());
                                }
                            }
                        );
                    }
                    return Q.all(gameStatusDataProm);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find game group"});
                }
            }
        ).then(
            pltGameStatusData => {
                if (pltGameStatusData) {
                    var pltGameStatusArr = pltGameStatusData;

                    //remove all null games and filter game by providerId
                    gameGroup.games = gameGroup.games.filter(game => {
                        if (!game.game) {
                            return false;
                        }
                        if (game.game.status == 4) {
                            return false;
                        }
                        if (providerObjId && String(game.game.provider) != String(providerObjId)) {
                            return false;
                        }
                        return true;
                    });

                    for (var i = 0; i < gameGroup.games.length; i++) {
                        var game = gameGroup.games[i].game;
                        if (game) {
                            for (var j = 0; j < pltGameStatusArr.length; j++) {
                                if (pltGameStatusArr[j] && game && String(game._id) == String(pltGameStatusArr[j].game)) {
                                    if (pltGameStatusArr[j].smallShow && game.smallShow != pltGameStatusArr[j].smallShow) {
                                        game.smallShow = pltGameStatusArr[j].smallShow;
                                    }
                                }
                            }
                        }
                    }
                }
                //sort and limit returned games
                if (typeof count === 'number' && typeof startIndex === 'number') {
                    gameGroup.stats = {
                        totalCount: gameGroup.games.length,
                        startIndex: startIndex
                    };
                    gameGroup.games.sort(
                        function (a, b) {
                            return a.index - b.index;
                        }
                    );
                    gameGroup.games = gameGroup.games.slice(startIndex, startIndex + count);
                }
                return dbPlatformGameGroup.checkFavoriteGames(playerId, gameGroup.games);
            }
        ).then(
            games => {
                gameGroup.games = {
                    stats: gameGroup.stats,
                    gameList: games
                };
                delete gameGroup.stats;
                //get providerid for games
                var gameObjIds = gameGroup.games.gameList.map(game => game.game._id);
                return dbconfig.collection_game.find({_id: {$in: gameObjIds}}).populate({
                    path: "provider",
                    model: dbconfig.collection_gameProvider
                }).lean().then(
                    gameData => {
                        if (gameData && gameData.length > 0) {
                            var gameProviderMap = {};
                            gameData.forEach(
                                game => {
                                    if (game.provider) {
                                        gameProviderMap[String(game.provider._id)] = game.provider.providerId;
                                    }
                                }
                            );
                            gameGroup.games.gameList.forEach(
                                game => {
                                    game.game.provider = gameProviderMap[String(game.game.provider)] || game.game.provider;
                                }
                            )
                        }
                        return gameGroup;
                    }
                );
            }
        );
    },

    /**
     * Get game group tree data
     * @param {String}  code
     * @param {String}  platformId
     * @param {Boolean}  containGames
     */
    getGameGroupTree: function (code, platformId, containGames, playerId, startIndex, count) {
        var groupProm = null;
        if (containGames && containGames !== "false") {
            groupProm = dbconfig.collection_platform.findOne({platformId: platformId}).then(
                platformData => {
                    return dbconfig.collection_platformGameGroup.find({platform: platformData._id}).then(
                        groups => {
                            if (groups && groups.length > 0) {
                                var proms = groups.map(
                                    group => dbPlatformGameGroup.getGameGroupGames({
                                        code: group.code,
                                        platformId: platformId
                                    }, null, null, playerId)
                                );
                                return Q.all(proms);
                            }
                            else {
                                return Q.reject({name: 'DataError', message: 'Cannot find platform game group'});
                            }
                        }
                    );
                }
            );
        }
        else {
            groupProm = dbconfig.collection_platform.findOne({platformId: platformId}).then(
                platformData => dbconfig.collection_platformGameGroup.find({platform: platformData._id})
            );
        }
        return groupProm.then(
            groups => {
                if (groups && groups.length > 0) {
                    var groupMap = {};
                    groups.forEach(
                        group => {
                            if (group) {
                                groupMap[group._id] = group;
                            }
                        }
                    );
                    //process each node to update node's children
                    groups.forEach(
                        group => {
                            if (group && group.children && group.children.length > 0) {
                                var children = [];
                                for (let i = 0; i < group.children.length; i++) {
                                    if (groupMap[group.children[i]]) {
                                        children.push(groupMap[group.children[i]]);
                                    }
                                }
                                group.children = children;
                                group.children.sort(function (a, b) {
                                    return a.code - b.code;
                                });
                            }
                        }
                    );
                    if (code) {
                        var resGroup = groups.find(group => group.code == code);
                        return {
                            stats: {
                                totalCount: resGroup ? 1 : 0,
                                startIndex: startIndex
                            },
                            gameGroups: resGroup ? [resGroup] : []
                        };
                    }
                    else {
                        var resGroups = groups.filter(group => !group.parent);
                        return {
                            stats: {
                                totalCount: resGroups.length,
                                startIndex: startIndex
                            },
                            gameGroups: resGroups.slice(startIndex, startIndex + count)
                        };
                    }
                }
                else {
                    return Q.reject({name: 'DataError', message: 'Cannot find platform game group'});
                }
            }
        );
    },

    /**
     * Get all the games by  platform and gameGroup
     * @param {Json}  query - platform , groupId
     */
    getGameGroupGamesArr: function (query) {
        query.status = {$ne: constGameStatus.DELETED};
        return dbconfig.collection_platformGameGroup.findOne(query)
            .populate({
                path: "games.game",
                model: dbconfig.collection_game
            }).exec();
    },

    /**
     * Get all the games which are unattached to the gameGroup in the platform
     * @param {Json}  query - platform , groupId
     */
    getGamesNotInGameGroup: function (query) {
        var gamesId = [];
        var resultArr = [];
        return dbconfig.collection_platformGameGroup.findOne(query)
            .then(
                data => {
                    if (data && data.games) {
                        gamesId = data.games.map(a => {
                            if (a.game) {
                                return a.game.toString();
                            }
                        });
                        return dbconfig.collection_platformGameStatus.find(
                            {
                                platform: query.platform,
                                status: {$ne: constGameStatus.DELETED}
                            }
                        ).populate({
                            path: "game",
                            model: dbconfig.collection_game
                        }).exec();
                    } else
                        return dbconfig.collection_platformGameStatus.find(
                            {
                                platform: query.platform,
                                status: {$ne: constGameStatus.DELETED}
                            }
                        ).populate({
                            path: "game",
                            model: dbconfig.collection_game
                        }).exec();
                }
            ).then(
                games => {
                    if (games) {
                        resultArr = games.filter(game => {
                            if (game && game.game && game.game._id && game.game.status != constGameStatus.DELETED) {
                                return (gamesId.indexOf(game.game._id.toString()) == -1);
                            } else return false;
                        })
                        return resultArr;
                    } else return [];
                }
            );
    },

    /**
     * Get all the game groups by platformId
     * @param {String}  query - platformId
     */
    getGameGroupList: function (platformId, startIndex, count) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            data => {
                if (data) {
                    var countProm = dbconfig.collection_platformGameGroup.find({platform: data._id}).count();
                    var recordProm = dbconfig.collection_platformGameGroup.find({platform: data._id})
                        .lean().skip(startIndex).limit(count);
                    return Q.all([countProm, recordProm]);
                }
                else {
                    return Q.reject({name: 'DataError', message: 'Cannot find platform'});
                }
            }
        ).then(
            function (data) {
                var count = data[0] || 0;
                var records = data[1] || [];
                return {
                    stats: {
                        totalCount: count,
                        startIndex: startIndex
                    },
                    records: records
                };
            }
        );
    },

    /**
     * Create a new gameGroup with Parent
     * @param {json} data - The data of the gameGroupData. Refer to platformGameGroup schema.
     */
    createGameGroupWithParent: function (gameGroupData) {
        var deferred = Q.defer();
        var gameGroup = new dbconfig.collection_platformGameGroup(gameGroupData);
        gameGroup.save().then(
            function (newData) {
                if (!newData) {
                    deferred.reject({name: "DBError", message: "Failed to create new game group."});
                }
                dbconfig.collection_platformGameGroup.update(
                    {_id: gameGroupData.parent},
                    {$addToSet: {children: newData._id}}
                ).exec().then(
                    function (data) {
                        deferred.resolve(newData);
                    },
                    function (err) {
                        deferred.reject({
                            name: "DBError",
                            message: "Failed to add new game group as child.",
                            error: err
                        });
                    }
                );
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Failed to create new game group.", error: err});
            }
        );
        return deferred.promise;
    },

    /**
     * Update the game group parent (Move the group to different parent)
     * @param {objectId} groupId - objectId of the group which to be moved
     * @param {objectId} curParentGroupId - ObjId current parent
     * @param {objectId} newParentGroupId - ObjId of new parent
     */
    updateGameGroupParent: function (groupId, curParentGroupId, newParentGroupId) {
        var deferred = Q.defer();
        var parentProm = dbconfig.collection_platformGameGroup.update(
            {
                _id: curParentGroupId
            },
            {
                $pull: {children: {$in: [groupId]}}
            }
        ).exec();
        var parent1Prom = dbconfig.collection_platformGameGroup.update(
            {
                _id: newParentGroupId
            },
            {
                $addToSet: {children: groupId}
            }
        ).exec();
        var groupProm = dbconfig.collection_platformGameGroup.update(
            {
                _id: groupId
            },
            {
                parent: newParentGroupId
            }
        ).exec();
        Q.all([parentProm, parent1Prom, groupProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("update GameGroup Parent error", error);
                deferred.reject({message: "Failed to update gameGroup parent!", error: error});
            });

        return deferred.promise;
    },

    /**
     * Remove/Delete  a group and its all children
     * @param {objectId} groupObjId
     */
    removeGameGroup: function (groupObjId) {
        var deferred = Q.defer();

        return dbPlatformGameGroup.getAllSubTreeIdById(groupObjId).then(
            data => {
                if (data) {
                    var parentProm = dbconfig.collection_platformGameGroup.update(
                        {},
                        {$pull: {children: groupObjId}},
                        {multi: true}).exec();

                    var removeAllSubGroupProm = dbconfig.collection_platformGameGroup.remove({_id: {$in: data}}).exec();

                    return Q.all([parentProm, removeAllSubGroupProm]);
                } else {

                    return Q.reject({name: "DataError", message: "Failed to remove gameGroup tree!"});
                }
            }
        );
    },

    /**
     * Get the list of the gameGroup's all children objId
     * @param {String} groupObjId - gameGroup ObjId
     */

    getAllSubTreeIdById: function (groupObjId) {
        var deferred = Q.defer();
        dbconfig.collection_platformGameGroup.find().then(
            function (data) {
                if (data && data.length > 0) {
                    var allGroups = {};
                    //add all groups data to key map
                    for (var i = 0; i < data.length; i++) {
                        allGroups[data[i]._id] = data[i];
                    }
                    var groupsTree = [];
                    //Get subtree for groups
                    for (var j = 0; j < data.length; j++) {
                        var group = data[j];
                        var parent = group;
                        while (parent) {
                            if (String(parent._id) == groupObjId) {
                                groupsTree.push(group._id);
                                break;
                            }
                            else {
                                parent = parent.parent ? allGroups[parent.parent] : null;
                            }
                        }
                    }
                    deferred.resolve(groupsTree);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find all groups"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Failed to find all groups", error: error});
            }
        );
        return deferred.promise;
    }
};

module.exports = dbPlatformGameGroup;