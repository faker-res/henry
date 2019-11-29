'use strict';

var dbconfig = require('../modules/dbproperties');
var Q = require("q");

var dbGameType = {

    /**
     * Resolves with something like:
     *     { '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', testGameTypeCode1475837090183: 'testGameTypeCode1475837090183' }
     *
     * @returns {Promise<*>}
     */
    getAllGameTypes: function () {
        return dbGameType.getGameTypeList().then(
            function (gameTypes) {
                var allGameTypes = {};
                gameTypes.forEach(function (gameType) {
                    var GAMETYPE = gameType.gameTypeId;
                    allGameTypes[GAMETYPE] = gameType.gameTypeId;
                });
                return allGameTypes;
            }
        );
    },

    getAllGameTypesName: function () {
        return dbGameType.getGameTypeList().then(
            function (gameTypes) {
                var allGameTypes = {};
                gameTypes.forEach(function (gameType) {
                    var GAMETYPE = gameType.gameTypeId;
                    allGameTypes[GAMETYPE] = gameType.name;
                });
                return allGameTypes;
            }
        );
    },

    getAllGameTypesAPI: function () {
        return dbconfig.collection_gameType.find({}, {_id:0, gameTypeId:1, code:1, name:1});
    },

    addGameType: function (data) {
        var newGameType = new dbconfig.collection_gameType(data);
        return newGameType.save();
    },

    updateGameType: function (query, update) {
        return dbconfig.collection_gameType.findOneAndUpdate(query, update, {new: true}).exec();
    },

    deleteGameTypeByQuery: function (query) {
        return dbconfig.collection_gameType.remove(query).exec().then(
            (result) => {
                result.gameTypeId = query.gameTypeId;
                return result;
            }
        );
    },

    getPlatformGameTypeConfig: function (platformObjId) {
        return dbconfig.collection_gameTypeConfig.find({platform: platformObjId})
            .populate({path: "gameType", model: dbconfig.collection_gameType})
            .lean().then(
                config => {
                    if (config && config.length) {
                        config.map(data => {
                            if (data && data.gameType.name) {
                                data.gameTypeId = data.gameType._id;
                                data.gameTypeName = data.gameType.name;
                            }
                        })
                    }
                    return config;
                }
            );
    },

    updatePlatformGameTypeConfig: (platformObjId, gameTypeConfig) => {
        let promArr = [];

        gameTypeConfig.map(e => {
            if (e._id) {
                e.gameType = e.gameTypeId;
                delete e.gameTypeId;
                promArr.push(
                    dbconfig.collection_gameTypeConfig.findOneAndUpdate({
                        platform: platformObjId,
                        _id: e._id
                    }, e, {upsert: true, new: true})
                )
            } else {
                e.platform = platformObjId;
                e.gameType = e.gameTypeId;
                delete e.gameTypeId;
                promArr.push(new dbconfig.collection_gameTypeConfig(e).save())
            }
        });

        return Promise.all(promArr).then(
            () => {
                return dbGameType.getPlatformGameTypeConfig(platformObjId);
            }
        );
    },

    deletePlatformGameTypeConfig: (gameTypeConfigObjId) => {
        return dbconfig.collection_gameTypeConfig.remove({
            _id: gameTypeConfigObjId
        });
    },

    syncData: function (gameTypeUpdates) {
        //compare type data
        return dbconfig.collection_gameType.find().then(
            curTypes => {
                var proms = [];
                //find new type and update type
                gameTypeUpdates.forEach(
                    type => {
                        var isNew = true;
                        for( let i = 0; i < curTypes.length; i++ ){
                            if( curTypes[i].gameTypeId == type.gameTypeId ){
                                isNew = false;
                            }
                        }
                        if( isNew ){
                            proms.push( dbGameType.addGameType(type) );
                        }
                        else{
                            proms.push( dbconfig.collection_gameType.update({gameTypeId: type.gameTypeId}, type).exec() );
                        }
                    }
                );

                //find delete one
                curTypes.forEach(
                    curType => {
                        var isOld = true;
                        for( let i = 0; i < gameTypeUpdates.length; i++ ){
                            if( gameTypeUpdates[i].gameTypeId == curType.gameTypeId ){
                                isOld = false;
                            }
                        }
                        if(isOld){
                            proms.push( dbGameType.deleteGameTypeByQuery({gameTypeId: curType.gameTypeId}) );
                        }
                    }
                );

                return Q.all(proms);
            }
        );
    },

    /**
     * Resolves with something like:
     *     [
     *         { _id: 5796c16293148a9a0dff8207, code: 'SPORT', description: '体育类游戏，FIFA手游戏，足球经理让你乐翻天', gameTypeId: '6', name: '体育', __v: 0 },
     *         { _id: 5796c16293148a9a0dff8209, code: 'CHESS', description: '益智娱乐，老少皆宜', gameTypeId: '8', name: '棋牌', __v: 0 },
     *         ...
 *         ]
     *
     * @returns {Promise<Array<GameType>>}
     */
    getGameTypeList: function () {
        return dbconfig.collection_gameType.find({name: {$exists: true}}).sort({name: 1}).lean();
    }
};

module.exports = dbGameType;