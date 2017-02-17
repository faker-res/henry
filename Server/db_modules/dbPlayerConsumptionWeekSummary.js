"use strict";

var dbPlayerConsumptionWeekSummaryFunc = function () {
};
module.exports = new dbPlayerConsumptionWeekSummaryFunc();

var Q = require('q');
var dbconfig = require('./../modules/dbproperties');
var dbutility = require('./../modules/dbutility');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');
var dbPlayerGameTypeConsumptionWeekSummary = require('../db_modules/dbPlayerGameTypeConsumptionWeekSummary');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
//var constGameType = require('../const/constGameType');
var dbGameType = require('../db_modules/dbGameType');
var constRewardType = require('../const/constRewardType');
var constPlatformStatus = require('../const/constPlatformStatus');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var constSystemParam = require('../const/constSystemParam');
var constShardKeys = require('../const/constShardKeys');
var util = require('util');
var constServerCode = require('../const/constServerCode');
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');

var dbPlayerConsumptionWeekSummary = {

    /**
     * Update or insert consumption week summary
     * @param {Json} data - The week summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.date;
        return dbutility.upsertForShard(
            dbconfig.collection_playerConsumptionWeekSummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_playerConsumptionDaySummary
        );
    },

    /**
     * Calculate platform player consumption week summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     */
    calculatePlatformWeekSummaryForTimeFrame: function (startTime, endTime, platformId) {

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            var stream = dbPlayerConsumptionRecord.streamPlayersWithConsumptionDaySummaryInTimeFrame(startTime, endTime, platformId);

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "playerConsumption_calculatePlatformWeekSummaryForPlayers", {
                            startTime: startTime,
                            endTime: endTime,
                            platformId: platformId,
                            playerObjIds: playerIdObjs.map(playerIdObj => playerIdObj._id)
                        });
                    }
                })
            );

        });
    },

    playerConsumption_calculatePlatformWeekSummaryForPlayers: function (startTime, endTime, platformId, playerObjIds) {
        var deferred = Q.defer();

        dbPlayerConsumptionDaySummary.getPlayersTotalConsumptionForTimeFrame(startTime, endTime, playerObjIds, platformId).then(
            function (data) {
                if (data && data.length > 0) {
                    return data;
                }
                else {
                    //no consumption
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Get player consumption failed!", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        var summary = {
                            playerId: data[i]._id.playerId,
                            platformId: data[i]._id.platformId,
                            date: startTime,
                            amount: data[i].amount,
                            validAmount: data[i].validAmount,
                            times: data[i].times
                        };

                        var prom = dbPlayerConsumptionWeekSummary.upsert(summary);
                        proms.push(prom);
                    }
                    return Q.all(proms);
                }
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                console.error(error);
                deferred.reject({
                    name: "DBError",
                    message: "Update player consumption week summary failed!",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Check platform weekly consumption return event
     * @param {ObjectId} platformId
     * @param {JSON} eventData
     * @param {ObjectId} proposalTypeId
     */
    checkPlatformWeeklyConsumptionReturn: function (platformId, eventData, proposalTypeId) {

        var deferred = Q.defer();

        //dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                var balancer = new SettlementBalancer();
                return balancer.initConns().then(function () {
                    // This collects players who have dirty records in the time range, although dirty records will not actually be used during processing.
                    // var stream = dbPlayerConsumptionRecord.streamPlayersWithConsumptionSummaryInTimeFrame(startTime, endTime, platformId);

                    var query = dbconfig.collection_playerConsumptionSummary.aggregate(
                        [
                            {
                                $match: {
                                    platformId: platformId,
                                    bDirty: false
                                }
                            },
                            {
                                $group: {_id: '$playerId'}
                            }
                        ]
                    );

                    var stream = query.cursor({batchSize: 10000}).allowDiskUse(true).exec();

                    return balancer.processStream(
                        {
                            stream: stream,
                            batchSize: constSystemParam.BATCH_SIZE,
                            makeRequest: function (playerIdObjs, request) {
                                request("player", "checkPlatformWeeklyConsumptionReturnForPlayers", {
                                    platformId: platformId,
                                    eventData: eventData,
                                    proposalTypeId: proposalTypeId,
                                    startTime: settleTime.startTime,
                                    endTime: settleTime.endTime,
                                    playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                        return playerIdObj._id;
                                    })
                                });
                            }
                        }
                    );

                });
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject(error);
            }
        );

        return deferred.promise;
    },

    checkPlatformWeeklyConsumptionReturnForPlayers: function (platformId, eventData, proposalTypeId, startTime, endTime, playerIds, bRequest) {
        var deferred = Q.defer();

        var summaryProm = dbconfig.collection_playerConsumptionSummary.find(
            {
                platformId: platformId,
                playerId: {$in: playerIds},
                bDirty: false
            }
        ).lean();
        var playerLevelProm = dbconfig.collection_players.find({_id: {$in: playerIds}})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();

        var gameTypesProm = dbGameType.getAllGameTypes();

        var processedSummaries = [];

        Q.all([summaryProm, playerLevelProm, gameTypesProm]).spread(
            function (consumptionSummaries, players, allGameTypes) {
                if (consumptionSummaries && players) {

                    // Process the data into key map
                    var consumptionSummariesByKey = {};
                    consumptionSummaries.forEach(
                        function (summary) {
                            var key = String(summary.playerId + ':' + summary.gameType);
                            if (consumptionSummariesByKey[key]) {
                                // This is not supposed to happen: There are not supposed to be multiple summaries with the same key.
                                // But just in case this does happen, let's not lose the player's consumption!
                                consumptionSummariesByKey[key].amount += summary.amount;
                            } else {
                                consumptionSummariesByKey[key] = summary;
                            }
                        }
                    );

                    var proms = [];
                    players.forEach(
                        function (playerData) {
                            var returnAmount = 0;

                            // Check all game types and calculate return amount
                            var thisPlayersConsumptionSummaries = [];
                            var returnDetail = {};
                            for (var type in allGameTypes) {
                                var playerLevel = playerData.playerLevel;
                                var gameType = allGameTypes[type];
                                var typeKey = String(playerData._id + ':' + gameType);
                                var consumptionSummary = consumptionSummariesByKey[typeKey];
                                var eventRatios = eventData.param.ratio[playerLevel.value];
                                var ratio = eventRatios && eventRatios[gameType];

                                if (!eventRatios) {
                                    var msg = util.format("Reward event has no ratios for PlayerLevel \"%s\".  eventData: %j", playerLevel.name, eventData.param);
                                    //deferred.reject(Error(msg));
                                    console.warn(msg);
                                    // Do not create a reward for this game type.  Proceed to the next game type.
                                    ratio = 0;
                                }
                                if (typeof ratio !== 'number') {
                                    var msg = util.format("Reward event has no ratio for gameType=%s at PlayerLevel \"%s\".  eventData: %j", gameType, playerLevel.name, eventData.param);
                                    //deferred.reject(Error(msg));
                                    console.warn(msg);
                                    // Do not create a reward for this game type.  Proceed to the next game type.
                                    ratio = 0;
                                }

                                if (consumptionSummary && playerLevel && ratio) {
                                    var consumeValidAmount = consumptionSummary.validAmount || 0;
                                    returnAmount += consumeValidAmount * ratio;
                                    returnDetail["GameType:" + gameType] = {
                                        consumeValidAmount: consumeValidAmount,
                                        ratio: ratio
                                    };
                                }

                                if (consumptionSummary) {
                                    thisPlayersConsumptionSummaries.push(consumptionSummary);
                                }
                            }

                            // If return reward amount larger than 0, create proposal
                            if (returnAmount > 0) {
                                var summaryIds = thisPlayersConsumptionSummaries.map(summary => summary._id);
                                var proposalData = {
                                    type: proposalTypeId,
                                    entryType: constProposalEntryType.SYSTEM,
                                    userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                    data: {
                                        playerObjId: playerData._id,
                                        platformId: platformId,
                                        playerName: playerData.name,
                                        playerId: playerData.playerId,
                                        eventName: eventData.name,
                                        eventCode: eventData.code,
                                        rewardAmount: parseFloat(returnAmount).toFixed(2),
                                        returnDetail: returnDetail,
                                        summaryIds: summaryIds,
                                        bConsumptionReturnRequest: bRequest
                                    }
                                };
                                proms.push(dbProposal.createProposalWithTypeId(proposalTypeId, proposalData));
                            }
                            processedSummaries = processedSummaries.concat(thisPlayersConsumptionSummaries);
                        }
                    );

                    if (proms.length > 0) {
                        return Q.all(proms);
                    } else {
                        //no consumption return
                        deferred.resolve(null);
                    }
                } else {
                    //no consumption records
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding player consumption week summary",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    // Mark the summaries we have just processed as dirty
                    // Concern: It is possible that a consumptionSummary record has been updated in the time that we have been processing this batch.
                    //          That update amount will be lost (removed from this week, not counted for next week).
                    //          To avoid that, this process should be part of a transaction queue that will lock the record from being updated.
                    var summaryIds = processedSummaries.map(summary => summary._id);
                    // mark record as dirty, remove them if proposal is approved, reset as clean record if proposal is rejected
                    return dbconfig.collection_playerConsumptionSummary.find(
                        {_id: {$in: summaryIds}}
                    ).lean().then(
                        summaryRecords => {
                            //only mark summary dirty if they are not removed , which means the proposal is not approved
                            if( summaryRecords && summaryRecords.length > 0 ){
                                return dbconfig.collection_playerConsumptionSummary.remove(
                                    {_id: {$in: summaryIds}}
                                ).then(
                                    () => {
                                        var summaryProms = processedSummaries.map(
                                            summary => {
                                                summary.bDirty = true;
                                                var dirtySummary = new dbconfig.collection_playerConsumptionSummary(summary);
                                                return dirtySummary.save();
                                            }
                                        );
                                        return Q.all(summaryProms);
                                    }
                                );
                            }
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating player consumption return proposal",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve(true);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error marking player consumption record", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Start calculate consumption return for player
     * @param {ObjectId} playerId
     */
    startCalculatePlayerConsumptionReturn: function (playerId, bRequest) {
        var deferred = Q.defer();
        var platformData = null;
        var playerData = null;
        //check if player platform has consumption return reward event
        dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).then(
            function (data) {
                if (data && data.platform && data.playerLevel) {
                    playerData = data;
                    if (!playerData.permission || !playerData.permission.advanceConsumptionReward || !playerData.playerLevel.canApplyConsumptionReturn) {
                        deferred.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have this permission"
                        });
                        return;
                    }
                    platformData = data.platform;
                    if (platformData.settlementStatus == constPlatformStatus.READY) {
                        return dbRewardEvent.getPlatformRewardEventsWithTypeName(data.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN);
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Platform is not ready for settlement"});
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player data"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player", error: error});
            }
        ).then(
            function (eventsData) {
                if (eventsData) {
                    var proms = [];
                    for (let eventData of eventsData) {
                        proms.push(dbPlayerConsumptionWeekSummary.calculatePlayerConsumptionReturn(playerData, platformData, eventData, bRequest));
                    }
                    return Q.all(proms);
                }
                else {
                    deferred.reject({status: constServerCode.REWARD_EVENT_INVALID, name: "DataError", message: "Incorrect reward event data"});
                }
            },
            function (error) {
                deferred.reject({status: constServerCode.REWARD_EVENT_INVALID, name: "DBError", message: "Error finding reward event", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(true);
            },
            function (error) {
                deferred.reject({
                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                    name: "DBError",
                    message: "Error calculating player consumption return",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Start calculate consumption return for player
     * @param {json} playerData
     * @param {json} platformData
     * @param {json} eventData
     */
    calculatePlayerConsumptionReturn: function (playerData, platformData, eventData, bRequest) {
        return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturnForPlayers(platformData._id, eventData, eventData.executeProposal, null, null, [playerData._id], bRequest);
    },

    /**
     * Get consumption return amount for player
     * @param {String} playerId
     */
    getPlayerConsumptionReturn: function (playerId) {
        var platformData = null;
        var playerData = null;
        //check if player platform has consumption return reward event
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).then(
                function (data) {
                    if (data && data.platform) {
                        playerData = data;
                        platformData = data.platform;
                        return dbRewardEvent.getPlatformRewardEventsWithTypeName(data.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN);
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Player is not found"});
                    }
                },
                function (error) {
                    return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
                }
            ).then(
                function (eventsData) {
                    if (eventsData && eventsData.length > 0) {
                        var proms = [];
                        for (let eventData of eventsData) {
                            proms.push(dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount(platformData._id, eventData.param, eventData.executeProposal, playerData._id));
                        }
                        return Q.all(proms);
                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            message: "Incorrect reward event data",
                            error: new Error()
                        });
                    }
                },
                function (error) {
                    return Q.reject({name: "DBError", message: "Error in getting rewardEvent", error: error});
                }
            ).then(
                function (data) {
                    var res = {totalAmount: 0, totalConsumptionAmount: 0};
                    for (let amounts of data) {
                        Object.keys(amounts).forEach(
                            type => {
                                if (res[type]) {
                                    if (res[type].returnAmount) {
                                        res[type].returnAmount += amounts[type].returnAmount;
                                    }
                                    else {
                                        res[type] += amounts[type];
                                    }
                                }
                                else {
                                    res[type] = amounts[type];
                                }
                            }
                        )
                    }
                    return res;
                }
            );
    },

    getPlayersConsumptionReturnInfo: function (platformId, eventData, playerObjIds) {
        var proms = [];
        playerObjIds.forEach(
            playerObjId => {
                proms.push(dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount(platformId, eventData.param, eventData.executeProposal, playerObjId, true));
            }
        );
        return Q.all(proms).then(
            returnData => {
                return returnData.filter(
                    data => data.totalAmount > 0
                );
            }
        );
    },

    /**
     * Get consumption return amount for player based on event data
     * @param {ObjectId} platformId
     * @param {json} eventData
     * @param {ObjectId} proposalTypeId
     * @param {ObjectId} playerId
     * @param {Boolean} bDetail, if contain detailed player info
     */
    getPlayerConsumptionReturnAmount: function (platformId, eventData, proposalTypeId, playerId, bDetail) {
        var summaryProm = dbconfig.collection_playerConsumptionSummary.find(
            {
                platformId: platformId,
                playerId: playerId,
                bDirty: false
            }
        );
        var playerLevelProm = dbconfig.collection_players.findOne({_id: playerId}).select("playerLevel playerId name")
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().exec();

        var gameTypesProm = dbGameType.getAllGameTypes();

        return Q.all([summaryProm, playerLevelProm, gameTypesProm]).spread(
            function (consumptionSummaries, playerData, allGameTypes) {
                //console.log("consumptionSummaries:", consumptionSummaries);

                // Why is it that sometimes playerData is not found?
                // Perhaps the player was requested because he had consumption records, but the player himself has been removed from the system

                if (consumptionSummaries && playerData) {
                    // Process the data into key map
                    var consumptionSummariesByKey = {};
                    consumptionSummaries.forEach(
                        function (summary) {
                            var key = String(summary.playerId + ':' + summary.gameType);
                            if (consumptionSummariesByKey[key]) {
                                // This is not supposed to happen: There are not supposed to be multiple summaries with the same key.
                                // But just in case this does happen, let's not lose the player's consumption!
                                consumptionSummariesByKey[key].amount += summary.amount;
                            } else {
                                consumptionSummariesByKey[key] = summary;
                            }
                        }
                    );

                    var returnAmount = 0;

                    // Check all game types and calculate return amount
                    var res = {};
                    res.totalConsumptionAmount = 0;
                    for (var type in allGameTypes) {
                        var playerLevel = playerData.playerLevel;
                        var gameType = allGameTypes[type];
                        var typeKey = String(playerData._id + ':' + gameType);
                        var consumptionSummary = consumptionSummariesByKey[typeKey];
                        var eventRatios = eventData.ratio[playerLevel.value];
                        var ratio = eventRatios && eventRatios[gameType];

                        if (!eventRatios) {
                            var msg = util.format("Reward event has no ratios for PlayerLevel \"%s\".  eventData: %j", playerLevel.name, eventData);
                            //return Q.reject(Error(msg));
                            console.warn(msg);
                            ratio = 0;
                        }
                        if (typeof ratio !== 'number') {
                            var msg = util.format("Reward event has no ratio for gameType=%s at PlayerLevel \"%s\".  eventData: %j", gameType, playerLevel.name, eventData);
                            //return Q.reject(Error(msg));
                            console.warn(msg);
                            ratio = 0;
                        }
                        if (consumptionSummary && playerLevel && ratio) {
                            var consumeValidAmount = consumptionSummary.validAmount;
                            var returnForThisGameType = consumeValidAmount * ratio;
                            returnAmount += returnForThisGameType;
                            res.totalConsumptionAmount += consumeValidAmount;
                            res[type] = {
                                consumptionAmount: consumeValidAmount,
                                returnAmount: returnForThisGameType,
                                ratio: ratio
                            };
                        }
                        else {
                            res[type] =
                                {
                                    consumptionAmount: 0,
                                    returnAmount: 0,
                                    ratio: ratio
                                };
                        }
                    }
                    res.totalAmount = returnAmount;
                    if (bDetail) {
                        res.playerId = playerData.playerId;
                        res.playerName = playerData.name;
                    }
                    return res;
                } else {
                    //no consumption records
                    if (bDetail) {
                        return {
                            playerId: playerId,
                            playerName: playerData ? playerData.name : 'Player Not Found',
                            totalAmount: 0
                        };
                    }
                    else {
                        return {totalAmount: 0};
                    }
                }
            },
            function (error) {
                return Q.reject({
                    name: "DBError",
                    message: "Error finding player consumption week summary",
                    error: error
                });
            }
        );
    }

};

//module.exports = dbPlayerConsumptionWeekSummary;
var proto = dbPlayerConsumptionWeekSummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionWeekSummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionWeekSummary;