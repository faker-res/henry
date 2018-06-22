var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constRewardPriority = require('./../const/constRewardPriority');
var constRewardType = require('./../const/constRewardType');
var constProposalType = require('./../const/constProposalType');
const constSystemParam = require("./../const/constSystemParam");
const constGameStatus = require('./../const/constGameStatus');

let cpmsAPI = require("../externalAPI/cpmsAPI");
let SettlementBalancer = require('../settlementModule/settlementBalancer');

let dbUtil = require('../modules/dbutility');
let dbPlayerInfo = require("../db_modules/dbPlayerInfo");
let errorUtils = require("../modules/errorUtils");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

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
                    ).populate({path: "rewardType", model: dbconfig.collection_rewardType}).sort({_id: -1}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot find reward type for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        ).then(
            function (eventData) {
                if (eventData && eventData.length > 0) {
                    if (rewardTypeName == constProposalType.PLATFORM_TRANSACTION_REWARD) {
                        deferred.resolve(eventData);
                    } else {
                        deferred.resolve(eventData[0]);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot find reward event for platform and type name"});
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

    getPlatformRewardEventWithCode: function (platformId, rewardTypeName, eventCode) {
        return dbconfig.collection_rewardType.findOne({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData && typeData._id) {
                    return dbconfig.collection_rewardEvent.find(
                        {type: typeData._id, platform: platformId, code: eventCode}
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

    startSavePlayersCredit: (platformId, bManual) => {
        let queryTime = dbUtil.getYesterdaySGTime();
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
                let settlePlayerCredit = platformId => {
                    // System log
                    console.log('[Save player credits] Settling platform:', platformId, queryTime);

                    // Get summary of player with top up yesterday
                    let stream = dbconfig.collection_playerTopUpRecord.aggregate([
                        {
                            $match: {
                                platformId: ObjectId(platformId),
                                createTime: {
                                    $gte: queryTime.startTime,
                                    $lt: queryTime.endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$playerId",
                                topUpCount: {$sum: 1}
                            }
                        }]
                    ).cursor({batchSize: 100}).allowDiskUse(true).exec();

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(
                        () => {
                            // System log to make sure balancer is working
                            console.log('[Save player credits] Settlement Server initialized');

                            return Q(
                                balancer.processStream(
                                    {
                                        stream: stream,
                                        batchSize: 1,
                                        makeRequest: function (playerObjs, request) {
                                            request("player", "savePlayerCredit", {
                                                playerObjId: playerObjs.map(player => {
                                                    return {
                                                        _id: player._id
                                                    }
                                                }),
                                                bManual: bManual
                                            });
                                        }
                                    }
                                ).then(
                                    data => console.log("savePlayerCredit settle success:", data),
                                    error => console.log("savePlayerCredit settle failed:", error)
                                )
                            );
                        },
                        error => console.log('[Save player credits] Settlement Server initialization error:', error)
                    );
                };

                if (platformId) {
                    // Work on single platform only
                    return settlePlayerCredit(platformId);
                }
                else {
                    // Work on all platforms
                    let platformIds = new Set(rewardEvents.map(rewardEvent => String(rewardEvent.platform)));

                    platformIds.forEach(
                        platformId => {
                            //if there is commission config, start settlement
                            settlePlayerCredit(platformId);
                        }
                    );
                }
            }
        )
    },

    savePlayerCredit: (playerObjIds, bManual, retries) => {
        let queryTime = dbUtil.getYesterdaySGTime();
        let proms = [];
        let playerData, platformData;
        let failedQueryPlayers = [];
        let numRetry = retries || 0;
        let isPlayerSettled = false;

        playerObjIds.forEach(
            playerObjId => {
                proms.push(
                    dbconfig.collection_players.findOne({
                        _id: playerObjId
                    }).populate({
                        path: "platform",
                        model: dbconfig.collection_platform,
                        populate: {
                            path: "gameProviders",
                            model: dbconfig.collection_gameProvider
                        }
                    }).lean().then(
                        player => {
                            playerData = player;
                            platformData = player.platform;

                            if (player.isTestPlayer) {
                                return true;
                            }

                            // Check whether player already have record for yesterday
                            return dbconfig.collection_playerCreditsDailyLog.findOne({
                                playerObjId: playerData._id,
                                platformObjId: playerData.platform._id,
                                createTime: queryTime.endTime
                            }).lean();
                        }
                    ).then(
                        creditLog => {
                            if (!creditLog && platformData && platformData.gameProviders && platformData.gameProviders.length > 0) {
                                let proms = [];

                                for (let i = 0; i < platformData.gameProviders.length; i++) {
                                    if (platformData.gameProviders[i].status == constGameStatus.ENABLE) {
                                        proms.push(
                                            cpmsAPI.player_queryCredit(
                                                {
                                                    username: playerData.name,
                                                    platformId: platformData.platformId,
                                                    providerId: platformData.gameProviders[i].providerId,
                                                }
                                            ).then(
                                                data => data,
                                                error => {
                                                    //todo:: skip qt for now
                                                    if (platformData.gameProviders[i].providerId != 46) {
                                                        // Failed when querying CPMS on this provider
                                                        failedQueryPlayers.push(playerObjId);

                                                        return Q.reject(error);
                                                    }
                                                    else {
                                                        return {
                                                            credit : 0
                                                        };
                                                    }
                                                }
                                            )
                                        )
                                    }
                                }
                                return Q.all(proms);
                            }
                            else {
                                isPlayerSettled = true;
                            }
                        }
                    ).then(
                        providerCredit => {
                            // Will only enter when all providers successfully queried
                            if (providerCredit && providerCredit.length > 0) {
                                let credit = 0;
                                for (let i = 0; i < providerCredit.length; i++) {
                                    if (providerCredit[i].credit === undefined) {
                                        providerCredit[i].credit = 0;
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
                            if (!isPlayerSettled) {
                                return dbconfig.collection_playerCreditsDailyLog.update({
                                        playerObjId: playerData._id,
                                        platformObjId: playerData.platform._id,
                                        createTime: bManual ? 0 : queryTime.endTime
                                    },
                                    {
                                        playerObjId: playerData._id,
                                        platformObjId: playerData.platform._id,
                                        validCredit: playerData.validCredit,
                                        lockedCredit: playerData.lockedCredit,
                                        gameCredit: gameCredit,
                                    },
                                    {
                                        upsert: true
                                    }
                                );
                            }
                        }
                    ).catch(
                        error => {
                            // System log when querying game credit timeout / error
                            console.log("ERROR: player_queryCredit failed for player", playerData.name, error);
                        }
                    )
                );
            }
        );

        return Q.all(proms).then(
            () => {
                if (failedQueryPlayers.length > 0) {
                    // Increment retry count
                    numRetry++;

                    // Retry for 3 times with 1 minute delay, may be configurable
                    if (numRetry <= 3) {
                        // SYSTEM LOG
                        console.log('[Save player credits] Players to retry:', failedQueryPlayers, "Retry No.", numRetry);

                        setTimeout(
                            () => dbRewardEvent.savePlayerCredit(failedQueryPlayers, bManual, numRetry), 60000
                        )
                    }
                }
            }
        );
    },

    startPlatformRTGEventSettlement: function (platformObjId, eventCode) {
        let applyTargetDate;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
 
        let eventProm = dbconfig.collection_rewardEvent.findOne({code: eventCode}).lean();

        let rewardTypesProm = dbconfig.collection_rewardType.find({isGrouped: true}).lean();

        return Promise.all([platformProm, eventProm, rewardTypesProm]).then(
            data => {
                if (!data) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Error in getting ID"
                    });
                }

                let platform = data[0];
                let event = data[1];
                let rewardTypes = data[2] || [];

                if (!platform) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Cannot find platform"
                    });
                }

                if (!event) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Error in getting rewardEvent"
                    });
                }

                let settleTime =  getIntervalPeriodFromEvent(event, getIntervalPeriodFromEvent(event).startTime.setMinutes(getIntervalPeriodFromEvent(event).startTime.getMinutes() - 10));

                if (event && event.condition && ["1", "2", "3", "4"].includes(event.condition.interval)) {
                    let currentPeriodStartTime = getIntervalPeriodFromEvent(event).startTime;
                    applyTargetDate = currentPeriodStartTime.setMinutes(currentPeriodStartTime.getMinutes() - 10);
                }
                else if (event.validStartTime && event.validEndTime) {
                    let validEndTime = new Date(event.validEndTime);
                    applyTargetDate = validEndTime.setMinutes(validEndTime.getMinutes() - 10);
                }

                let streamProm;
                let rewardTypeName = {};
                if (rewardTypes && rewardTypes.length > 0) {
                    rewardTypes.map(rewardType => {
                        switch (rewardType.name) {
                            case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                            case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                            case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                            case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                                rewardTypeName[String(rewardType._id)] = rewardType.name;
                        }
                    });
                }

                let aggregateParam = [
                    {
                        $match: {
                            platformId: platform._id,
                            createTime: {$gte: settleTime.startTime, $lt: settleTime.endTime}
                        }
                    },
                    {
                        $group: {_id: '$playerId'}
                    }
                ];

                switch (rewardTypeName[String(event.type)]) {
                    case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                        // need top up
                        streamProm = dbconfig.collection_playerTopUpRecord.aggregate(aggregateParam).then(
                            players => {
                                let playerObjIds = [];
                                players.map(player => {
                                    playerObjIds.push(player._id);
                                });
                                return dbconfig.collection_players.find({_id: {$in: playerObjIds}}, {playerId: 1}).cursor({batchSize: 10});
                            }
                        );
                        break;
                    case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                    case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                        // need consumption
                        streamProm = dbconfig.collection_playerConsumptionRecord.aggregate(aggregateParam).then(
                            players => {
                                let playerObjIds = [];
                                players.map(player => {
                                    playerObjIds.push(player._id);
                                });
                                return dbconfig.collection_players.find({_id: {$in: playerObjIds}}, {playerId: 1}).cursor({batchSize: 10});
                            }
                        );
                        break;
                    case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                        // need either consumption or top up
                        let consumptionPlayerProm = dbconfig.collection_playerConsumptionRecord.aggregate(aggregateParam);
                        let topUpPlayerProm = dbconfig.collection_playerTopUpRecord.aggregate(aggregateParam);

                        streamProm = Promise.all([consumptionPlayerProm, topUpPlayerProm]).then(
                            data => {
                                let consumptionPlayers, topUpPlayers;
                                ([consumptionPlayers, topUpPlayers] = data);

                                let playerObjIds = [];
                                consumptionPlayers.map(player => {
                                    playerObjIds.push(String(player._id));
                                });
                                topUpPlayers.map(player => {
                                    playerObjIds.push(String(player._id));
                                });

                                playerObjIds = Array.from(new Set(playerObjIds)); // remove duplicated values
                                return dbconfig.collection_players.find({_id: {$in: playerObjIds}}, {playerId: 1}).cursor({batchSize: 10});
                            }
                        );

                        break;
                    default:
                        streamProm = Promise.resolve(dbconfig.collection_players.find({platform: platformObjId}).cursor({batchSize: 10}));
                }

                streamProm.then(
                    stream => {
                        let balancer = new SettlementBalancer();
                        return balancer.initConns().then(function () {
                            return Q(
                                balancer.processStream(
                                    {
                                        stream: stream,
                                        batchSize: constSystemParam.BATCH_SIZE,
                                        makeRequest: function (players, request) {
                                            request("player", "bulkPlayerApplyReward", {
                                                playerIdArray: players.map(function (playerIdObj) {
                                                    return playerIdObj.playerId;
                                                }),
                                                eventCode,
                                                applyTargetDate
                                            });
                                        }
                                    }
                                )
                            );
                        });
                    }
                );
            }
        );
    },

    bulkPlayerApplyReward: function (playerIdArray, eventCode, applyTargetDate) {
        let proms = [];
        for (let i = 0; i < playerIdArray.length; i++) {
            let prom = dbPlayerInfo.applyRewardEvent(0, playerIdArray[i], eventCode, {applyTargetDate}, null, null, true).catch(err => {
                console.error("rejectedId:", playerIdArray[i], "eventCode", eventCode, " error:", err)
                errorUtils.reportError(err)
            });
            proms.push(prom);
        }

        return Promise.all(proms);
    },

};

module.exports = dbRewardEvent;

function getIntervalPeriodFromEvent(event, applyTargetTime) {
    let intervalTime = dbUtil.getTodaySGTime();
    if (event && event.condition) {
        switch (event.condition.interval) {
            case "1":
                intervalTime = applyTargetTime ? dbUtil.getDayTime(applyTargetTime) : dbUtil.getTodaySGTime();
                break;
            case "2":
                intervalTime = applyTargetTime ? dbUtil.getWeekTime(applyTargetTime) : dbUtil.getCurrentWeekSGTime();
                break;
            case "3":
                intervalTime = applyTargetTime ? dbUtil.getBiWeekSGTIme(applyTargetTime) : dbUtil.getCurrentBiWeekSGTIme();
                break;
            case "4":
                intervalTime = applyTargetTime ? dbUtil.getMonthSGTIme(applyTargetTime) : dbUtil.getCurrentMonthSGTIme();
                break;
            default:
                if (event.validStartTime && event.validEndTime) {
                    intervalTime = {startTime: event.validStartTime, endTime: event.validEndTime};
                }
                break;
        }
    }

    return intervalTime;
}