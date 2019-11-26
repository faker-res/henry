'use strict';

var dbconfig = require('./../modules/dbproperties');
var dbGame = require('./../db_modules/dbGame');
var constGameStatus = require('./../const/constGameStatus');
var Q = require("q");
var ObjectId = mongoose.Types.ObjectId;

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

    updatePlatformGameGroup: function (query, updateData) {
        return dbconfig.collection_platformGameGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },

    /**
     * Update the  game group
     * @param {json}  query - queryData
     * @param {json}  updateData -  updateData
     */
    updateGameIndexGameGroup: function (query, newIndex, gamesGroup, gameObjId) {

        if (newIndex <= 0){
            return Promise.reject({
                name: "DataError",
                message: "Index cannot set to 0 or smaller than 0"
            })
        }

        if (gamesGroup.length) {
            let fromIndex = gamesGroup.findIndex( game => {
                if (game && game._id){
                    return game._id.toString() == gameObjId.toString()
                }
            });

            if (fromIndex != -1) {
                let updateList = [];
                let element = gamesGroup[fromIndex];

                gamesGroup.splice(fromIndex, 1);
                gamesGroup.splice(newIndex - 1, 0, element);

                gamesGroup.forEach((game, index) => {
                    updateList.push({game: ObjectId(game._id), index: index + 1})
                })

                let updateData = {
                    "$set": {
                        'games': updateList
                    },
                }

                return dbconfig.collection_platformGameGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});

            }
        }


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
        var platformId = null;
        var playerRouteSetting = null;
        return dbconfig.collection_platform.findOne({platformId: query.platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    platformId = platformData.platformId;
                    playerRouteSetting = platformData.playerRouteSetting;
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
                            }).populate({path: "games.game", model: dbconfig.collection_game}).lean();
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
                    console.log("checking ---- gameGroup.games.length 1", [gameGroup && gameGroup.games ? gameGroup.games.length : 0, query.code])
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
                    console.log("checking ---- gameGroup.games.length 2", [gameGroup && gameGroup.games ? gameGroup.games.length : 0, query.code])
                    for (var i = 0; i < gameGroup.games.length; i++) {
                        var game = gameGroup.games[i].game;
                        if (game) {
                            for (var j = 0; j < pltGameStatusArr.length; j++) {
                                if (pltGameStatusArr[j] && game && String(game._id) == String(pltGameStatusArr[j].game)) {
                                    if (pltGameStatusArr[j].status !== constGameStatus.ENABLE && game.status == 1) {
                                        game.status = pltGameStatusArr[j].status;
                                    }

                                    if (pltGameStatusArr[j].smallShow && game.smallShow != pltGameStatusArr[j].smallShow) {
                                        game.smallShow = pltGameStatusArr[j].smallShow;
                                    }
                                }
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

                            if(game.webp && !game.webp.includes("http")){
                                game.webp = playerRouteSetting ? playerRouteSetting + game.webp : (game.sourceURL ? game.sourceURL + game.webp : game.webp);
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
                console.log("checking ---- gameGroup.games.length 3", [gameGroup && gameGroup.games ? gameGroup.games.length : 0, query.code])
                return dbPlatformGameGroup.checkFavoriteGames(playerId, gameGroup.games);
            }
        ).then(
            gameData => {
                let gameInfo = gameData;
                return dbconfig.collection_players.findOne({playerId: playerId, platform: platformObjId}).lean().then(
                    playerData => {
                        if (playerData) {
                            let strProviderObjId;
                            let strForbidProviders;

                            if (providerObjId) {
                                strProviderObjId = providerObjId.toString();
                            }
                            if (playerData.forbidProviders) {
                                strForbidProviders = playerData.forbidProviders.toString();
                            }
                            if (playerData && playerData.permission && (playerData.permission.forbidPlayerFromEnteringGame)) {
                                gameInfo.forEach(
                                    game => {
                                        game.game.status = 2;
                                    }
                                )
                            }
                        }
                        return gameInfo;
                    }
                )
            }
        ).then(
            games => {
                console.log("checking ---- games 5", [games ? games.length: 0, query.code ])
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
                            let providerNeedLoginShow = {};
                            gameData.forEach(
                                game => {
                                    if (game.provider) {
                                        gameProviderMap[String(game.provider._id)] = game.provider.providerId;
                                        if (game.provider.needLoginShow && game.provider.needLoginShow[platformId]) {
                                            providerNeedLoginShow[game.provider._id] = true;
                                        }
                                    }
                                }
                            );

                            for (let i = gameGroup.games.gameList.length - 1; i >=0; i--) {
                                if (!playerId && providerNeedLoginShow[String(gameGroup.games.gameList[i].game.provider)]) {
                                    gameGroup.games.gameList.splice(i, 1);
                                    if (gameGroup.games.stats && gameGroup.games.stats.totalCount) {
                                        gameGroup.games.stats.totalCount -= 1;
                                    }
                                } else {
                                    gameGroup.games.gameList[i].game.provider = gameProviderMap[String(gameGroup.games.gameList[i].game.provider)] || gameGroup.games.gameList[i].game.provider;
                                }
                            }
                            // gameGroup.games.gameList.forEach(
                            //     (game) => {
                            //         game.game.provider = gameProviderMap[String(game.game.provider)] || game.game.provider;
                            //     }
                            // )
                        }
                        console.log("checking ---- games 6", [gameGroup && gameGroup.games && gameGroup.games.gameList? gameGroup.games.gameList.length: 0, query.code ])
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
        let routeSetting;
        if (containGames && containGames !== "false") {
            groupProm = dbconfig.collection_platform.findOne({platformId: platformId}, {playerRouteSetting: 1}).lean().then(
                platformData => {
                    routeSetting = platformData && platformData.playerRouteSetting ? platformData.playerRouteSetting : null;
                    return dbconfig.collection_platformGameGroup.find({platform: platformData._id}).lean().then(
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
            groupProm = dbconfig.collection_platform.findOne({platformId: platformId}, {playerRouteSetting: 1}).lean().then(
                platformData =>
                {
                    routeSetting = platformData && platformData.playerRouteSetting ? platformData.playerRouteSetting : null;
                    return dbconfig.collection_platformGameGroup.find({
                        platform: platformData._id
                    }, {games: 0, parent: 0, platform: 0}).lean();
                }
            );
        }
        return groupProm.then(
            groups => {
                if (groups && groups.length > 0) {
                    var groupMap = {};
                    groups.forEach(
                        group => {
                            if (group) {
                                if (group.gameGroupIconUrl) {
                                    group.gameGroupIconUrl = checkRouteSetting(group.gameGroupIconUrl, routeSetting)
                                }
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
                        console.log("checking --- code", code )
                        var resGroup = groups.find(group => group.code == code);
                        console.log("checking --- resGroup",resGroup)
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
    }

    ,

    /**
     * Get all the games by  platform and gameGroup
     * @param {Json}  query - platform , groupId
     */
    getGameGroupGamesArr: function (query) {
        let gameStatusProm = [];
        let gameGroupData;
        query.status = {$ne: constGameStatus.DELETED};
        return dbconfig.collection_platformGameGroup.findOne(query)
            .populate({
                path: "games.game",
                model: dbconfig.collection_game
            }).lean().then(platformGameGroupData => {
                gameGroupData = platformGameGroupData;
                if(platformGameGroupData && platformGameGroupData.games && platformGameGroupData.games.length > 0){
                    platformGameGroupData.games.forEach(game => {
                        if(game && game.game && game.game._id){
                            let sendQuery = {
                                platform: ObjectId(query.platform),
                                game: ObjectId(game.game._id),
                                status: {$ne: constGameStatus.DELETED}
                            };

                            gameStatusProm.push(dbconfig.collection_platformGameStatus.find(sendQuery))
                        }
                    })

                    return Promise.all(gameStatusProm);
                }
            }).then(
                gameStatusList => {
                    if(gameStatusList && gameStatusList.length > 0){
                        gameStatusList.forEach(gameStatus => {
                            if(gameStatus && gameStatus.length > 0 && gameStatus[0].game && gameGroupData && gameGroupData.games && gameGroupData.games.length > 0){
                                gameGroupData.games.map(game => {
                                    if(game && game.game && game.game._id && game.game._id.toString() == gameStatus[0].game.toString()){
                                        game.game.platformGameStatus = gameStatus[0].status;
                                    }
                                })
                            }
                        })
                    }

                    return gameGroupData;
                }
            );
    }
    ,

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
    }
    ,

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
    }
    ,

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
    }
    ,

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
    }
    ,

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
    }
    ,

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

function checkRouteSetting(url, setting) {
    if (url && (url.indexOf("http") == -1 || url.indexOf("https") == -1 || url.indexOf("") == -1) && setting) {
        url = setting.concat(url.trim());
    }

    return url;
}

module.exports = dbPlatformGameGroup;
