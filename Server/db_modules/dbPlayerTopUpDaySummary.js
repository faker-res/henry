var Q = require('q');
var Stream = require('stream')
var dbconfig = require('./../modules/dbproperties');
var dbutility = require('./../modules/dbutility');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var constSystemParam = require('../const/constSystemParam');
var constRewardTaskStatus = require("./../const/constRewardTaskStatus");
var constRewardType = require("./../const/constRewardType");
var constShardKeys = require("./../const/constShardKeys");
var dataUtils = require("../modules/dataUtils.js");

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbPlayerTopUpDaySummary = {

    /**
     * Update or insert top up day summary
     * @param {Json} data - The day summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.date;
        return dbutility.upsertForShard(
            dbconfig.collection_playerTopUpDaySummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_playerTopUpDaySummary
        );
    },

    /**
     * Calculate player top up day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     */
    calculatePlatformDaySummaryForTimeFrame: function (startTime, endTime, platformId) {

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            var stream = dbPlayerConsumptionRecord.streamPlayersWithTopUpInTimeFrame(startTime, endTime, platformId);

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "playerTopUpDaySummary_calculatePlatformDaySummaryForPlayers", {
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

    playerTopUpDaySummary_calculatePlatformDaySummaryForPlayers: function (startTime, endTime, platformId, playerObjIds) {
        var deferred = Q.defer();

        dbPlayerTopUpRecord.getPlayersTotalTopUpForTimeFrame(startTime, endTime, platformId, playerObjIds).then(
            function (data) {
                if (data && data.length > 0) {
                    return data;
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Get player top up failed!", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    var proms = data.map(
                        sum => {
                            var summary = {
                                playerId: sum._id.playerId,
                                platformId: sum._id.platformId,
                                date: startTime,
                                amount: sum.amount,
                                times: sum.times
                            };
                            return dbPlayerTopUpDaySummary.upsert(summary);
                        }
                    );
                    return Q.all(proms);
                }
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Update player top up day summary failed!", error: error});
            }
        );
        return deferred.promise;
    },

    calculatePlatformActiveValidPlayerDaySummaryForTimeFrame: function (startTime, endTime, platformId) {
        var matchObj = {
            platformId: platformId,
            date: {
                $gte: startTime,
                $lt: endTime
            }
        };

        var consumptionProm = dbconfig.collection_playerConsumptionDaySummary.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: {platformId: "$platformId"},
                    amount: {$sum: "$amount"},
                    validAmount: {$sum: "$validAmount"},
                    times: {$sum: "$times"}
                }
            }
        ).exec();

        var topUpProm = dbconfig.collection_playerTopUpDaySummary.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: {platformId: "$platformId"},
                    amount: {$sum: "$amount"},
                    times: {$sum: "$times"}
                }
            }
        ).exec();

        return Q.all([consumptionProm, topUpProm]).then(
            function (data) {

                if (data && data[0] && data[1]) {

                    var consumptionSummaries = data[0];
                    var topUpSummaries = data[1];

                    var summary = {
                        validPlayers: 0, activePlayers: 0
                    };
                    if ((consumptionSummaries[0] || topUpSummaries[0] )) {
                        summary = {
                            validPlayers: 0, activePlayers: 0,
                            consumptionAmount: (consumptionSummaries[0] && consumptionSummaries[0].amount) ? consumptionSummaries[0].amount : 0,
                            consumptionValidAmount: (consumptionSummaries[0] && consumptionSummaries[0].validAmount) ? consumptionSummaries[0].validAmount : 0,
                            consumptionTimes: (consumptionSummaries[0] && consumptionSummaries[0].times) ? consumptionSummaries[0].times : 0,
                            topUpAmount: (topUpSummaries[0] && topUpSummaries[0].amount) ? topUpSummaries[0].amount : 0,
                            topUpTimes: (topUpSummaries[0] && topUpSummaries[0].times) ? topUpSummaries[0].times : 0
                        }
                    }
                    return dbutility.upsertForShard(
                        dbconfig.collection_platformDaySummary,
                        {
                            platformId: platformId,
                            date: startTime
                        },
                        summary,
                        constShardKeys.collection_platformDaySummary
                    )
                }
            }).then(
            function (data) {
                var stream = dbPlayerConsumptionRecord.streamPlayersWithConsumptionInTimeFrame(startTime, endTime, platformId);
                var balancer = new SettlementBalancer();
                return balancer.initConns().then(function () {

                    return Q(
                        balancer.processStream({
                            stream: stream,
                            batchSize: constSystemParam.BATCH_SIZE,
                            makeRequest: function (playerIdObjs, request) {

                                request("player", "playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer", {
                                    startTime: startTime,
                                    endTime: endTime,
                                    platformId: platformId,
                                    playerObjIds: playerIdObjs.map(playerIdObj => playerIdObj._id)
                                });
                            }
                        })
                    );
                });
            }
        )
    },

    playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer: function (startTime, endTime, platformId, playerObjIds) {

        var playerIds = {};
        return dbconfig.collection_partnerLevelConfig.findOne({platform: platformId}).then(
            function (partnerLevelConfig) {

                if (partnerLevelConfig && playerObjIds.length > 0) {

                    playerIds = playerObjIds;
                    const matchPlayerSummaries = {
                        platformId: platformId,
                        playerId: {$in: playerIds},
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    };
                    const consumptionSummariesProm = dbconfig.collection_playerConsumptionDaySummary.find(matchPlayerSummaries);
                    const topUpSummariesProm = dbconfig.collection_playerTopUpDaySummary.find(matchPlayerSummaries);

                    return Q.all([consumptionSummariesProm, topUpSummariesProm]).then(
                        function (data) {
                            const consumptionSummaries = data[0];
                            const topUpSummaries = data[1];
                            const consumptionSummariesByPlayerId = dataUtils.byKey(consumptionSummaries, 'playerId');
                            const topUpSummariesByPlayerId = dataUtils.byKey(topUpSummaries, 'playerId');

                            var validPlayerCount = 0;
                            var activePlayerCount = 0;

                            playerIds.forEach(
                                function (playerId) {
                                    const consumptionSummary = consumptionSummariesByPlayerId[playerId];
                                    const topUpSummary = topUpSummariesByPlayerId[playerId];
                                    if (consumptionSummary && topUpSummary) {
                                        var playerIsValid = consumptionSummary.times >= partnerLevelConfig.validPlayerConsumptionTimes
                                            && topUpSummary.times >= partnerLevelConfig.validPlayerTopUpTimes;

                                        var playerIsActive = consumptionSummary.times >= partnerLevelConfig.activePlayerConsumptionTimes
                                            && topUpSummary.times >= partnerLevelConfig.activePlayerTopUpTimes;

                                        if (playerIsValid) {
                                            validPlayerCount++;
                                        }
                                        if (playerIsActive) {
                                            activePlayerCount++;
                                        }

                                    }
                                }
                            );

                            var createSummary = validPlayerCount > 0 || activePlayerCount > 0;

                            if (createSummary) {

                                return dbutility.upsertForShard(
                                    dbconfig.collection_platformDaySummary,
                                    {
                                        platformId: platformId,
                                        date: startTime
                                    },
                                    {
                                        $inc: {validPlayers: validPlayerCount, activePlayers: activePlayerCount},
                                    },
                                    constShardKeys.collection_platformDaySummary
                                );
                            } else {
                                return Q.resolve("No activity for this platform");
                            }
                        }
                    );
                }
            }
        );
    },

    /**
     * Check if player consecutively top up for the past num of days
     * @param {ObjectId} playerId
     * @param {ObjectId} platformId
     * @param {Number} numOfDays
     * @param {Number} topUpMinAmount
     */
    checkConsecutiveTopUpForPastDays: function (playerId, platformId, numOfDays, minAmount) {
        var deferred = Q.defer();

        var time = dbutility.getTodaySGTime();
        var startTime = time.startTime;
        var endTime = time.endTime;
        startTime.setDate(endTime.getDate() - numOfDays);

        dbconfig.collection_playerTopUpDaySummary.find(
            {
                $and: [
                    {playerId: playerId},
                    {platformId: platformId},
                    {bDirty: {$ne: true}},
                    {
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    },
                    {amount: {$gte: minAmount}}
                ]
            }
        ).then(
            function (data) {
                if (data && data.length === numOfDays) {
                    deferred.resolve(true);
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player top up day summary.", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Mark player consecutively top up for the past num of days
     * @param {ObjectId} playerId
     * @param {ObjectId} platformId
     * @param {Number} numOfDays
     * @param {Number} topUpMinAmount
     */
    markConsecutiveTopUpForPastDays: function (playerId, platformId, numOfDays, minAmount) {
        var deferred = Q.defer();

        var time = dbutility.getTodaySGTime();
        var startTime = time.startTime;
        var endTime = time.endTime;
        startTime.setDate(endTime.getDate() - numOfDays);

        dbconfig.collection_playerTopUpDaySummary.update(
            {
                $and: [
                    {playerId: playerId},
                    {platformId: platformId},
                    {bDirty: {$ne: true}},
                    {
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    },
                    {amount: {$gte: minAmount}}
                ]
            },
            {bDirty: true},
            {multi: true}
        ).then(
            function (data) {
                if (data && data.ok) {
                    deferred.resolve(true);
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player top up day summary.", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Get players has top up for more than min amount
     * @param {Number} minAmount
     */
    getPlayersByTopUpAmount: function (platformId, minAmount) {
        var deferred = Q.defer();

        var time = dbutility.getYesterdaySGTime();
        var startTime = time.startTime;
        var endTime = time.endTime;
        
        dbconfig.collection_playerTopUpDaySummary.find(
            {
                $and: [
                    {
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    },
                    {platformId: platformId},
                    {amount: {$gte: minAmount}}
                ]
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding player more then top up amount.",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    /**
     * get num of days player has consecutively top up for more than min amount
     * @param {ObjectId} playerId
     * @param {ObjectId} platformId
     * @param {Number} numOfDays
     * @param {Number} minAmount
     */
    // getConsecutiveTopUpDays: function (playerId, platformId, numOfDays, minAmount) {
    //     var deferred = Q.defer();
    //     var endTime = new Date();
    //     endTime.setHours(0, 0, 0, 0);
    //
    //     //should count today's top up as well???
    //     //endTime.setDate(endTime.getDate() + 1);
    //     var startTime = new Date();
    //     startTime.setHours(0, 0, 0, 0);
    //     startTime.setDate(endTime.getDate() - numOfDays);
    //
    //     dbconfig.collection_playerTopUpDaySummary.find(
    //         {
    //             $and: [
    //                 {playerId: playerId},
    //                 {platformId: platformId},
    //                 {bDirty: {$ne: true}},
    //                 {
    //                     date: {
    //                         $gte: startTime,
    //                         $lt: endTime
    //                     }
    //                 },
    //                 {amount: {$gte: minAmount}}
    //             ]
    //         }
    //     ).sort({date: -1}).then(
    //         function (data) {
    //             if (data && data.length > 0) {
    //                 var count = 0;
    //                 for (var i = 0; i < data.length; i++) {
    //                     var curDate = new Date();
    //                     curDate.setHours(0, 0, 0, 0);
    //                     curDate.setDate(endTime.getDate() - (i + 1));
    //                     if (data[i].date.getTime() === curDate.getTime()) {
    //                         count++;
    //                     }
    //                     else {
    //                         break;
    //                     }
    //                 }
    //                 deferred.resolve(count);
    //             }
    //             else {
    //                 deferred.resolve(0);
    //             }
    //         },
    //         function (error) {
    //             deferred.reject({name: "DBError", message: "Error finding player top up day summary.", error: error});
    //         }
    //     );
    //
    //     return deferred.promise;
    // },

    /**
     * check if player has top up for more than minAmount and create related proposals
     * @param {ObjectId} playerId
     * @param {ObjectId} platformId
     * @param {Object} eventData
     * @param {ObjectId} proposalTypeId
     */
    checkConsecutiveTopUpAndCreateProposal: function (playerId, platformId, eventData, proposalTypeId) {
        var deferred = Q.defer();
        dbPlayerTopUpDaySummary.checkConsecutiveTopUpForPastDays(playerId, platformId, eventData.numOfDays, eventData.minAmount).then(
            function (bValid) {
                if (bValid) {
                    var proposalData = {
                        type: proposalTypeId,
                        data: {
                            playerId: playerId,
                            platformId: platformId,
                            rewardAmount: eventData.rewardAmount,
                            spendingAmount: eventData.spendingAmount
                        }
                    };
                    dbProposal.createProposalWithTypeId(proposalTypeId, proposalData).then(
                        function (data) {
                            if (data) {
                                return dbPlayerTopUpDaySummary.markConsecutiveTopUpForPastDays(playerId, platformId, eventData.numOfDays, eventData.minAmount);
                            }
                            else {
                                deferred.reject({
                                    name: "DBError",
                                    message: "Can't create proposal for consecutive top up event"
                                });
                            }
                        },
                        function (error) {
                            deferred.reject(error);
                        }
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject(error);
                        }
                    );
                } else {
                    deferred.resolve(bValid);
                }
            },
            function (error) {
                deferred.reject(error);
            }
        );
        return deferred.promise;
    },

    findTopUpPlayersForFullAttendanceInTimeFrame: function (startTime, endTime, platformId, eventData) {
        return dbconfig.collection_playerTopUpDaySummary.aggregate(
            [
                //find player's day top up summary with amount larger than minAmount for past week
                {
                    $match: {
                        platformId: platformId,
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        amount: {$gte: eventData.minTopUpAmount}
                    }
                },
                //group the records and count number of days for players
                {
                    $group: {
                        _id: "$playerId",
                        count: {$sum: 1}
                    }
                },
                //only return player who top up more than minAmount for at least numOfDays
                {$match: {count: {$gte: eventData.numOfTopUpDays}}}
            ]
        ).cursor({batchSize: 10000}).allowDiskUse(true);
    },

    findConsumptionPlayersForFullAttendanceInTimeFrame: function (startTime, endTime, platformId, eventData) {
        return dbconfig.collection_playerConsumptionDaySummary.aggregate(
            //find player's day consumption day summary with amount larger than minAmount for past week
            {
                $match: {
                    platformId: platformId,
                    date: {
                        $gte: startTime,
                        $lt: endTime
                    },
                    amount: {$gte: eventData.minConsumeAmount}
                }
            },
            //group the records and count number of days for players
            {
                $group: {
                    _id: "$playerId",
                    count: {$sum: 1}
                }
            },
            //only return player who top up more than minAmount for at least numOfDays
            {$match: {count: {$gte: eventData.numOfConsumeDays}}}
        ).cursor({batchSize: 10000}).allowDiskUse(true);
    },

    /**
     * find all players match the full attendance reward event condition
     * @param {date} startTime
     * @param {date} endTime
     * @param {ObjectId} platformId
     * @param {Object} eventData
     */
    findPlayersForFullAttendanceInTimeFrame: function (startTime, endTime, platformId, eventData) {
        var deferred = Q.defer();
        if (eventData.checkTopUp && eventData.checkConsumption) {
            var prom1 = dbPlayerTopUpDaySummary.findTopUpPlayersForFullAttendanceInTimeFrame(startTime, endTime, platformId, eventData).exec().toArray();
            var prom2 = dbPlayerTopUpDaySummary.findConsumptionPlayersForFullAttendanceInTimeFrame(startTime, endTime, platformId, eventData).exec().toArray();

            Q.all([prom1, prom2]).then(
                function (data) {
                    if (data && data[0] && data[1]) {
                        var res = null;
                        var array1 = data[0].map(playerIdObj => playerIdObj._id);
                        var array2 = data[1].map(playerIdObj => playerIdObj._id);
                        if (eventData.andTopUpConsume) {
                            res = dbutility.andArrays(array1, array2);
                        }
                        else {
                            res = dbutility.difArrays(array1, array2);
                        }
                        if (res && res.length > 0) {
                            var readable = new Stream.Readable({objectMode: true});
                            const writable = new Stream.Writable({objectMode: true});
                            writable._write = (object, encoding, done) => {
                                // ready to process the next chunk
                                done();
                            };
                            readable.pipe(writable);

                            res.forEach(item => readable.push({_id: item}));
                            readable.push(null);
                            readable.pause();
                            deferred.resolve(readable);
                        }
                        else {
                            deferred.resolve(null);
                        }
                    }
                    else {
                        deferred.reject({
                            name: "DataError",
                            message: "Can't find player for full attendance.",
                            error: error
                        });
                    }
                }
            ).catch(
                function (error) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding player top up day summary.",
                        error: error
                    });
                }
            );
        }
        else {
            if (eventData.checkTopUp) {
                deferred.resolve(dbPlayerTopUpDaySummary.findTopUpPlayersForFullAttendanceInTimeFrame(startTime, endTime, platformId, eventData).exec());
            }
            else {
                deferred.resolve(dbPlayerTopUpDaySummary.findConsumptionPlayersForFullAttendanceInTimeFrame(startTime, endTime, platformId, eventData).exec());
            }
        }
        return deferred.promise;
    },

    /*
     streamPlayersForConsecutiveTopUpInTimeFrame: function (startTime, endTime, platformId, eventData) {
     //get all players
     return dbconfig.collection_playerTopUpDaySummary.aggregate(
     [
     //find player's day top up summary with amount larger than minAmount for past week
     {
     $match: {
     platformId: platformId,
     bDirty: {$ne: true},
     date: {
     $gte: startTime,
     $lt: endTime
     },
     amount: {$gte: eventData.minTopUpAmount}
     }
     },
     //group the records and count number of days for players
     {
     $group: {
     _id: {playerId: "$playerId", platformId: "$platformId"},
     validAmount: {$sum: "$validAmount"},
     count: {$sum: 1}
     }
     },
     //only return player who top up more than minAmount for at least numOfDays
     {$match: {count: {$gte: eventData.numOfTopUpDays}}}
     ]
     ).cursor({batchSize: 10000}).allowDiskUse(true).exec().stream();
     },
     */

    /**
     * Check platform weekly consecutively top up event
     * @param {ObjectId} platformId
     * @param {JSON} eventData
     * @param {ObjectId} proposalTypeId
     */
    checkPlatformFullAttendanceStream: function (platformId, eventData, proposalTypeId) {
        if (eventData.param.checkTopUp && eventData.param.checkConsumption && !eventData.param.andTopUpConsume) {
            var topUpEventData = Object.assign({}, eventData);
            topUpEventData.param = Object.assign({}, eventData.param);
            topUpEventData.param.checkConsumption = false;
            var topUpProm = dbPlayerTopUpDaySummary.checkPlatformFullAttendance(platformId, topUpEventData, proposalTypeId);
            var consumeProm = dbPlayerTopUpDaySummary.checkPlatformFullAttendance(platformId, eventData, proposalTypeId);
            return Q.all([topUpProm, consumeProm]);
        }
        else {
            return dbPlayerTopUpDaySummary.checkPlatformFullAttendance(platformId, eventData, proposalTypeId);
        }
    },

    checkPlatformFullAttendance: function (platformId, eventData, proposalTypeId) {
        var deferred = Q.defer();

        //dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                var balancer = new SettlementBalancer();

                balancer.initConns().then(function () {
                    return dbPlayerTopUpDaySummary.findPlayersForFullAttendanceInTimeFrame(settleTime.startTime, settleTime.endTime, platformId, eventData.param);
                }).then(
                    function (stream) {
                        if (stream) {
                            stream.resume();
                            return balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: constSystemParam.BATCH_SIZE,
                                    makeRequest: function (playerIdObjs, request) {
                                        request("player", "checkPlatformFullAttendanceForPlayers", {
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
                        }
                        else {
                            deferred.resolve(stream);
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding player for full attendance.",
                            error: error
                        });
                    }
                ).then(
                    function (data) {
                        deferred.resolve(data);
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error process stream for full attendance.",
                            error: error
                        });
                    }
                );
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform", error: error});
            }
        );
        return deferred.promise;
    },

    getPlayersForFullAttendanceAndProvider: function (startTime, endTime, eventData, platformId, playerObjIds) {
        var deferred = Q.defer();

        var proms = [];
        for (var i = 0; i < eventData.providers.length; i++) {
            var pid = ObjectId(eventData.providers[i].providerObjId);
            var matchObj = {
                platformId: platformId,
                playerId: {$in: playerObjIds},
                providerId: pid,
                date: {
                    $gte: startTime,
                    $lt: endTime
                },
                amount: {$gte: eventData.minConsumeAmount}
            };
            if (eventData.providers[i].games && eventData.providers[i].games.length > 0) {
                var games = eventData.providers[i].games.map(game => ObjectId(game));
                matchObj.gameId = {$in: games};
            }
            var prom = dbconfig.collection_providerPlayerDaySummary.aggregate(
                //find player's day consumption day summary with amount larger than minAmount for past week
                {
                    $match: matchObj
                },
                //group the records and count number of days for players
                {
                    $group: {
                        _id: "$playerId",
                        count: {$sum: 1}
                    }
                },
                //only return player who top up more than minAmount for at least numOfDays
                {$match: {count: {$gte: eventData.numOfConsumeDays}}}
            ).exec();
            proms.push(prom);
        }
        Q.all(proms).then(
            function (data) {
                if (data && data.length > 0) {
                    var players = data[0].map(player => player._id);
                    for (var i = 1; i < data.length; i++) {
                        players = dbutility.andArrays(players, data[i].map(player => player._id));
                    }
                    deferred.resolve(players);
                }
                else {
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding valid player", error: error});
            }
        );

        return deferred.promise;
    },

    getPlayersForFullAttendanceOrProvider: function (startTime, endTime, eventData, platformId, playerObjIds) {
        var deferred = Q.defer();

        var proms = [];
        for (var i = 0; i < eventData.providers.length; i++) {
            var pid = ObjectId(eventData.providers[i].providerObjId);
            var matchObj = {
                platformId: platformId,
                playerId: {$in: playerObjIds},
                providerId: pid,
                date: {
                    $gte: startTime,
                    $lt: endTime
                },
                amount: {$gte: eventData.minConsumeAmount}
            };
            if (eventData.providers[i].games && eventData.providers[i].games.length > 0) {
                var games = eventData.providers[i].games.map(game => ObjectId(game));
                matchObj.gameId = {$in: games};
            }
            var prom = dbconfig.collection_providerPlayerDaySummary.aggregate(
                //find player's day consumption day summary with amount larger than minAmount for past week
                {
                    $match: matchObj
                },
                //group the records and count number of days for players
                {
                    $group: {
                        _id: "$playerId",
                        count: {$sum: 1}
                    }
                },
                //only return player who top up more than minAmount for at least numOfDays
                {$match: {count: {$gte: eventData.numOfConsumeDays}}}
            ).exec();
            proms.push(prom);
        }
        Q.all(proms).then(
            function (data) {
                if (data && data.length > 0) {
                    var players = data[0].map(player => player._id);
                    for (var i = 1; i < data.length; i++) {
                        players = dbutility.orArrays(players, data[i].map(player => player._id));
                    }
                    deferred.resolve(players);
                }
                else {
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding valid player", error: error});
            }
        );

        return deferred.promise;
    },

    //check if player has other reward task besides full attendance
    checKFullAttendanceRewardTaskForPlayers: function (playerObjIds) {
        var deferred = Q.defer();
        dbconfig.collection_rewardTask.aggregate(
            {
                $match: {
                    playerId: {$in: playerObjIds},
                    //type: {$ne: constRewardType.FULL_ATTENDANCE},
                    status: constRewardTaskStatus.STARTED
                }
            },
            //group the records and count number of days for players
            {
                $group: {
                    _id: "$playerId"
                }
            }
        ).exec().then(
            function (data) {
                if (data && data.length > 0) {
                    var taskPlayers = data.map(player => player._id);
                    var res = dbutility.difArrays(taskPlayers, playerObjIds);
                    deferred.resolve(res);
                }
                else {
                    deferred.resolve(playerObjIds);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player reward task", error: error});
            }
        );
        return deferred.promise;
    },

    //todo::add provider and game check here
    checkPlatformFullAttendanceForPlayers: function (startTime, endTime, eventData, proposalTypeId, platformId, playerObjIds) {
        //check if players are valid for full attendance reward
        //check player consumption records based on event data's provider and game
        var deferred = Q.defer();

        dbPlayerTopUpDaySummary.checKFullAttendanceRewardTaskForPlayers(playerObjIds).then(
            function (data) {
                if (data && data.length > 0) {
                    if (eventData.param.checkConsumption && eventData.param.providers && eventData.param.providers.length > 0) {
                        //if condition for providers is and
                        if (eventData.param.andProvider) {
                            return dbPlayerTopUpDaySummary.getPlayersForFullAttendanceAndProvider(startTime, endTime, eventData.param, platformId, playerObjIds);
                        }
                        //if condition for providers is or
                        else {
                            return dbPlayerTopUpDaySummary.getPlayersForFullAttendanceOrProvider(startTime, endTime, eventData.param, platformId, playerObjIds);
                        }
                    }
                    else {
                        return playerObjIds;
                    }
                }
                else {
                    deferred.resolve("NoPlayer");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player reward task", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        var proposalData = {
                            type: proposalTypeId,
                            data: {
                                playerObjId: data[i],
                                platformId: platformId,
                                rewardAmount: eventData.param.rewardAmount,
                                spendingAmount: eventData.param.spendingAmount,
                                settlementEndTime: endTime,
                                settlementStartTime: startTime,
                                eventId: eventData._id,
                                eventName: eventData.name,
                                eventCode: eventData.code
                            }
                        };
                        proms.push(
                            function (proposalData) {
                                return dbconfig.collection_proposal.findOne(
                                    {
                                        type: proposalTypeId,
                                        "data.playerId": data[i],
                                        "data.eventId": eventData._id,
                                        "data.settlementEndTime": endTime
                                    }
                                ).then(
                                    function (data) {
                                        if (data) {
                                            return false;
                                        }
                                        else {
                                            return dbProposal.createProposalWithTypeId(proposalTypeId, proposalData);
                                        }
                                    }
                                )
                            }(proposalData)
                        );
                    }
                    Q.all(proms).then(
                        function (data) {
                            deferred.resolve(data);
                        }
                    ).catch(
                        function (error) {
                            deferred.reject({
                                name: "DBError",
                                message: "Error create proposal for full attendance.",
                                error: error
                            });
                        }
                    );
                }
                else {
                    deferred.resolve("NoPlayer");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding valid players", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Check platform weekly consecutively top up event
     * @param {ObjectId} platformId
     * @param {JSON} eventData
     * @param {ObjectId} proposalTypeId
     */
    /*
    checkPlatformFullAttendance: function (platformId, eventData, proposalTypeId) {
        var deferred = Q.defer();
        var endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);
        //check for past week
        startTime.setDate(endTime.getDate() - 7);

        //get all players
        dbconfig.collection_playerTopUpDaySummary.aggregate(
            [
                //find player's day top up summary with amount larger than minAmount for past week
                {
                    $match: {
                        platformId: platformId,
                        bDirty: {$ne: true},
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        amount: {$gte: eventData.minTopUpAmount}
                    }
                },
                //group the records and count number of days for players
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId"},
                        validAmount: {$sum: "$validAmount"},
                        count: {$sum: 1}
                    }
                },
                //only return player who top up more than minAmount for at least numOfDays
                {$match: {count: {$gte: eventData.numOfTopUpDays}}}
            ]
        ).exec().then(
            function (data) {
                if (data && data.length > 0) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        var proposalData = {
                            type: proposalTypeId,
                            data: {
                                playerId: data[i]._id.playerId,
                                platformId: platformId,
                                rewardAmount: eventData.rewardAmount,
                                spendingAmount: eventData.spendingAmount
                            }
                        };
                        proms.push(dbProposal.createProposalWithTypeId(proposalTypeId, proposalData));
                    }
                    return Q.all(proms);
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player top up day summary.", error: error});
            }
        ).then(
            function (data) {
                //todo::can check how many proposals are created successfully here
                deferred.resolve(true);
            },
            function (error) {
                console.error(error);
                deferred.reject({name: "DBError", message: "Error creating proposal for weekly consecutive top up.", error: error});
            }
        );

        return deferred.promise;
    },
    */

    /**
     * Get total top up amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    getPlayersTotalTopUpForTimeFrame: function (startTime, endTime, platformId, playerIds) {
        return dbconfig.collection_playerTopUpDaySummary.aggregate(
            [
                {
                    //todo::add dirty record check here to avoid reuse same record
                    $match: {
                        platformId: platformId,
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        playerId: {$in: playerIds}
                    }
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId"},
                        amount: {$sum: "$amount"},
                        times: {$sum: "$times"}
                    }
                }
            ]
        ).exec();
    }

};

module.exports = dbPlayerTopUpDaySummary;