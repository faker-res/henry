var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constRewardPriority = require('./../const/constRewardPriority');
var constRewardType = require('./../const/constRewardType');
var constProposalType = require('./../const/constProposalType');

let cpmsAPI = require("../externalAPI/cpmsAPI");
let SettlementBalancer = require('../settlementModule/settlementBalancer');

var dbRewardEvent = {

    /**
     * Create a new reward event
     * @param {json} rewardData - The data of the reward event. Refer to reward event schema.
     */
    createRewardEvent: function (data) {
        var rewardName = null;
        if (data.type && data.platform) {
            var deferred = Q.defer();
            dbconfig.collection_rewardType.findOne({_id: data.type}).then(
                function (typeData) {
                    if (typeData) {
                        rewardName = typeData.name;
                        return dbconfig.collection_proposalType.findOne({
                            platformId: data.platform,
                            name: typeData.name
                        }).exec();
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't find reward rule"});
                    }
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error finding reward rule", error: error});
                }
            ).then(
                function (typeData) {
                    if (typeData && typeData._id) {
                        data.executeProposal = typeData._id;
                        data.priority = constRewardPriority[rewardName];
                        var event = new dbconfig.collection_rewardEvent(data);
                        return event.save();
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't find proposal type"});
                    }
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error finding proposal type", error: error});
                }
            ).then(
                function (data) {
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error creating reward event", error: error});
                }
            );
            return deferred.promise;
        }
        else {
            var rewardEvent = new dbconfig.collection_rewardEvent(data);
            return rewardEvent.save();
        }
    },

    /**
     * Get one reward event by query
     * @param {Object} query
     */
    getRewardEvent: function (query) {
        return dbconfig.collection_rewardEvent.findOne(query).exec();
    },

    /**
     * Get platform's reward event with reward type
     * @param {ObjectId} platformId
     * @param {String} rewardTypeName
     */
    getPlatformRewardEventWithTypeName: function (platformId, rewardTypeName, code) {
        var deferred = Q.defer();
        code = code || {$exists: true};
        dbconfig.collection_rewardType.findOne({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData && typeData._id) {
                    return dbconfig.collection_rewardEvent.find(
                        {type: typeData._id, platform: platformId, code: code}
                    ).populate({path: "rewardType", model: dbconfig.collection_rewardType}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward type for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        ).then(
            function (eventData) {
                if (eventData) {
                    if (rewardTypeName == constProposalType.PLATFORM_TRANSACTION_REWARD) {
                        deferred.resolve(eventData);
                    } else {
                        deferred.resolve(eventData[0]);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward event for platform and type name"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding reward event for platform and type name",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Get platform's reward event with reward type
     * @param {ObjectId} platformId
     * @param {String} rewardTypeName
     */
    getPlatformRewardEventsWithTypeName: function (platformId, rewardTypeName) {
        return dbconfig.collection_rewardType.findOne({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData && typeData._id) {
                    return dbconfig.collection_rewardEvent.find(
                        {type: typeData._id, platform: platformId}
                    ).populate({path: "rewardType", model: dbconfig.collection_rewardType}).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find reward type for type name"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        );
    },

    /**
     * Find reward events by query
     * @param {String} query
     */
    getRewardEvents: function (query) {
        return dbconfig.collection_rewardEvent.find(query).populate({
            path: "type",
            model: dbconfig.collection_rewardType
        }).exec();
    },

    /**
     * Update reward event
     * @param {String} query string
     * @param {Json} updateData
     */
    updateRewardEvent: function (query, updateData) {
        return dbconfig.collection_rewardEvent.findOneAndUpdate(query, updateData).exec();
    },

    /**
     * Remove reward events by id
     * @param {Array} ids
     */
    removeRewardEventsById: function (ids) {
        return dbconfig.collection_rewardEvent.remove({_id: {$in: ids}}).exec();
    },

    /*
     * Get all platforms id has the reward event with passed in reward type
     * @param {String} rewardTypeName, reward type name
     */
    getPlatformsIdForRewardType: function (rewardTypeName) {
        var deferred = Q.defer();
        dbconfig.collection_rewardType.find({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData) {
                    var typeIds = [];
                    for (var i = 0; i < typeData.length; i++) {
                        typeIds.push(typeData[i]._id);
                    }
                    //todo::refactor the reward rule here
                    return dbconfig.collection_rewardRule.find({rewardType: {$in: typeIds}}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward type for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        ).then(
            function (ruleData) {
                if (ruleData) {
                    var ruleIds = [];
                    for (var i = 0; i < ruleData.length; i++) {
                        ruleIds.push(ruleData[i]._id);
                    }
                    return dbconfig.collection_rewardEvent.find({rule: {$in: ruleIds}}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward rule for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward rule for reward types", error: error});
            }
        ).then(
            function (eventData) {
                if (eventData) {
                    var platformIds = [];
                    for (var i = 0; i < eventData.length; i++) {
                        platformIds.push(eventData[i].platform);
                    }
                    deferred.resolve(platformIds);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward event for type name"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding reward event for reward types",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    startSavePlayersCredit:
        () => {
            return dbconfig.collection_rewardType.findOne({
                name: constRewardType.PLAYER_CONSUMPTION_INCENTIVE
            }).lean().then(
                rewardType => {
                    return dbconfig.collection_rewardEvent.find({
                        type: rewardType._id
                    })
                }
            ).then(
                rewardEvents => {
                    let platformIds = new Set(rewardEvents.map(rewardEvent => String(rewardEvent.platform)));

                    platformIds.forEach(
                        platformId => {
                            //if there is commission config, start settlement
                            let stream = dbconfig.collection_players.find(
                                {
                                    platform: platformId
                                }
                            ).lean().cursor({batchSize: 100});

                            let balancer = new SettlementBalancer();
                            return balancer.initConns().then(function () {
                                return Q(
                                    balancer.processStream(
                                        {
                                            stream: stream,
                                            batchSize: 10,
                                            makeRequest: function (playerObjs, request) {
                                                request("player", "savePlayerCredit", {
                                                    playerObjId: playerObjs.map(player => {
                                                        return {
                                                            _id: player._id,
                                                            name: player.name,
                                                            platform: player.platform,
                                                            validCredit: player.validCredit,
                                                            lockedCredit: player.lockedCredit
                                                        }
                                                    })
                                                });
                                            }
                                        }
                                    )
                                );
                            });
                        }
                    )


                }
            )
        },

    savePlayerCredit:
        (playerDatas) => {
            playerDatas.map(
                playerData => {
                    return dbconfig.collection_platform.findById(playerData.platform)
                        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean()
                        .then(
                            platformData => {
                                if (platformData && platformData.gameProviders && platformData.gameProviders.length > 0) {
                                    let proms = [];
                                    for (let i = 0; i < platformData.gameProviders.length; i++) {
                                        proms.push(cpmsAPI.player_queryCredit(
                                            {
                                                username: playerData.name,
                                                platformId: platformData.platformId,
                                                providerId: platformData.gameProviders[i].providerId,
                                            }
                                        ));
                                    }
                                    return Q.all(proms);
                                }
                            }
                        ).then(
                            providerCredit => {
                                if (providerCredit && providerCredit.length > 0) {
                                    let credit = 0;
                                    for (let i = 0; i < providerCredit.length; i++) {
                                        if (providerCredit[i].credit === undefined) {
                                            throw Error(`No credit in response [${i}]: ${JSON.stringify(providerCredit[i])}`);
                                        }
                                        credit += parseFloat(providerCredit[i].credit);
                                    }
                                    return credit;
                                }
                                else {
                                    return 0;
                                }
                            }
                        ).then(
                            gameCredit => {
                                let log = new dbconfig.collection_playerCreditsDailyLog({
                                    playerObjId: playerData._id,
                                    platformObjId: playerData.platform,
                                    validCredit: playerData.validCredit,
                                    lockedCredit: playerData.lockedCredit,
                                    gameCredit: gameCredit,
                                    createTime: Date.now()
                                });
                                return log.save();
                            }
                        );
                }
            );




            return Q.resolve(true);
        }

};

module.exports = dbRewardEvent;