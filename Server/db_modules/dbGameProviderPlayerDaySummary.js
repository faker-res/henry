const dbconfig = require('./../modules/dbproperties');
const dbUtil = require('../modules/dbutility');
const SettlementBalancer = require('../settlementModule/settlementBalancer');
const constSystemParam = require('../const/constSystemParam');
const constServerCode = require('./../const/constServerCode');
const constShardKeys = require('../const/constShardKeys');
const Q = require("q");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var dbGameProviderPlayerDaySummary = {

    /**
     * Update or insert game provider day summary
     * @param {Json} data - The game provider day summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.providerId;
        delete upsertData.gameId;
        delete upsertData.gameType;
        delete upsertData.date;
        return dbUtil.upsertForShard(
            dbconfig.collection_providerPlayerDaySummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                providerId: data.providerId,
                gameId: data.gameId,
                gameType: data.gameType,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_providerPlayerDaySummary
        );
    },

    /**
     * This is slightly different from dbPlayerConsumptionRecord.streamPlayersWithConsumptionInTimeFrame because it matches based on providerId instead of platformId.
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    streamPlayersWithConsumptionInTimeFrame: function (startTime, endTime, providerId, platformId) {
        if (platformId) {
            platformId = Array.isArray(platformId) ? platformId.map(id => ObjectId(id)) : [ObjectId(platformId)];
        }
        let matchObj = {
            providerId: providerId,
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            $or: [
                {isDuplicate: {$exists: false}},
                {
                    $and: [
                        {isDuplicate: {$exists: true}},
                        {isDuplicate: false}
                    ]
                }
            ]
        };
        if (platformId) {
            matchObj.platformId = {
                $in: platformId
            };
        }
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: "$playerId"
                    }
                }
            ]
        ).cursor({batchSize: 10000}).allowDiskUse(true).exec();
    },

    /**
     * Calculate provider players consumption day summary for time frame (in parallel)
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    calculateProviderPlayerDaySummaryForTimeFrame: function (startTime, endTime, providerId, platformId) {
        let balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {
            let stream = dbGameProviderPlayerDaySummary.streamPlayersWithConsumptionInTimeFrame(startTime, endTime, providerId, platformId);

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "calculateProviderPlayersDaySummaryForTimeFrame", {
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            }),
                            providerId: providerId,
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                })
            );

        });

    },

    /**
     * Calculate provider players consumption day summary for time frame (in parallel)
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    calculateProviderPlayerDaySummaryForPlayers: function (startTime, endTime, providerId, playerObjIds) {
        var deferred = Q.defer();

        dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: {
                        playerId: {$in: playerObjIds},
                        providerId: providerId,
                        createTime: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        $or: [
                            {isDuplicate: {$exists: false}},
                            {
                                $and: [
                                    {isDuplicate: {$exists: true}},
                                    {isDuplicate: false}
                                ]
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: {
                            playerId: "$playerId",
                            platformId: "$platformId",
                            providerId: "$providerId",
                            gameId: "$gameId",
                            gameType: "$gameType"
                        },
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        bonusAmount: {$sum: "$bonusAmount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).cursor({batchSize: 10000}).allowDiskUse(true).exec().toArray().then(
            function (data) {
                if (data && data.length > 0) {
                    var prom = [];
                    for (var i = 0; i < data.length; i++) {
                        let summary = {
                            playerId: data[i]._id.playerId,
                            platformId: data[i]._id.platformId,
                            providerId: data[i]._id.providerId,
                            gameId: data[i]._id.gameId,
                            gameType: data[i]._id.gameType,
                            date: startTime,
                            amount: data[i].amount,
                            validAmount: data[i].validAmount,
                            bonusAmount: data[i].bonusAmount,
                            consumptionTimes: data[i].times
                        };
                        prom.push(
                            dbconfig.collection_providerPlayerDaySummary.remove(
                                {
                                    playerId: summary.playerId,
                                    platformId: summary.platformId,
                                    providerId: summary.providerId,
                                    gameId: summary.gameId,
                                    gameType: summary.gameType,
                                    date: {
                                        $gte: startTime, $lt: endTime
                                    }
                                }
                            ).then(
                                data => dbGameProviderPlayerDaySummary.upsert(summary)
                            )
                        );
                    }
                    return Q.all(prom);
                } else {
                    //todo:: replace string with const???
                    deferred.resolve("No player consumption today!");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player consumption records!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating provider player day summary!",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Calculate provider consumption day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    getAllProviderReportSummaryForTimeFrame: function (startTime, endTime, platformId, proId, limit) {
        "use strict";
        var deferred = Q.defer();
        var result = {};
        var queryObj = {
            date: {
                $gte: startTime,
                $lt: endTime
            },
            platformId: platformId,
        };
        // if (proId) {
        //     queryObj.providerId = proId;
        // }
        dbconfig.collection_providerPlayerDaySummary.distinct('playerId', queryObj)
            .then(
                function (data) {
                    if (data) {
                        result.total_player = data.length;
                        if (data.length > 0) {
                            var matchObj = {
                                date: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                platformId: platformId
                            };
                            return dbconfig.collection_providerPlayerDaySummary.aggregate(
                                [
                                    {
                                        $match: matchObj
                                    },
                                    {
                                        $group: {
                                            _id: "$platformId",
                                            total_amount: {$sum: "$amount"},
                                            total_consumption: {$sum: "$consumptionTimes"},
                                            validAmount: {$sum: "$validAmount"},
                                            bonusAmount: {$sum: "$bonusAmount"}
                                        }
                                    }
                                ]
                            ).exec();
                        }
                        else {
                            deferred.resolve({success: true, data: result});
                        }
                    }
                }, function (err) {
                    deferred.reject({name: "DBError", message: "error in getting player count", error: err});
                })
            .then(
                function (data) {
                    if (data) {
                        result.total_amount = data[0].total_amount;
                        result.total_consumption = data[0].total_consumption;
                        result.validAmount = data[0].validAmount;
                        result.bonusAmount = data[0].bonusAmount;
                        deferred.resolve({success: true, data: result});
                    }
                    else {
                        deferred.resolve({success: true, data: {}});
                    }
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error in getAllProviderReportSummaryForTimeFrame",
                        error: err
                    });
                });
        return deferred.promise;
    },

    getAllProviderDaySummaryForTimeFrame: function (startTime, endTime, platformId, proId, index, count) {
        var deferred = Q.defer();
        dbconfig.collection_providerPlayerDaySummary.distinct('providerId', {
            date: {
                $gte: startTime,
                $lt: endTime
            },
            platformId: platformId,
        })
            .then(
                function (data) {
                    if (data && data.length > 0) {
                        var providerData = [];
                        for (var i = 0; i < data.length; i++) {
                            // if (i + 1 <= limit) {
                            if (!proId || proId == data[i]) {
                                var temp = dbGameProviderPlayerDaySummary.getProviderDaySummaryForTimeFrame(startTime, endTime, platformId, data[i], index, count);
                                providerData.push(temp);
                            }
                            // }
                        }
                        if (providerData.length > 0) {
                            return Q.all(providerData);
                        }
                    }
                }, function (err) {
                    deferred.reject({name: "DBError", message: "error in finding providers", error: err});
                })
            .then(
                function (data) {
                    var res = [];
                    //remove null from array
                    if (data && data.length > 0) {
                        for (var i = 0; i < data.length; i++) {
                            if (data[i]) {
                                res.push(data[i]);
                            }
                        }
                    }
                    deferred.resolve({success: true, data: res});
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error in getAllProviderDaySummaryForTimeFrame",
                        error: err
                    });
                });
        return deferred.promise;
    },

    getProviderDaySummaryForTimeFrame: function (startTime, endTime, platformId, providerId, index, count) {
        var deferred = Q.defer();
        // console.log('data', startTime, endTime, platformId, providerId);
        var result = {};
        dbconfig.collection_gameProvider.findOne({_id: providerId})
            .then(
                function (data) {
                    if (data) {
                        result._id = data._id;
                        result.providerId = data.providerId;
                        result.providerName = data.name;

                        return dbconfig.collection_providerPlayerDaySummary.distinct('playerId', {
                            date: {
                                $gte: startTime,
                                $lt: endTime
                            },
                            platformId: platformId,
                            providerId: providerId
                        })
                    }
                },
                function (error) {
                    deferred.resolve({
                        data: {
                            providerId: providerId
                        }
                        // name: "DBError",
                        // message: "Error finding data!",
                    });
                }
            )
            .then(
                function (data) {
                    if (data) {
                        result.total_player = data.length;
                        return dbconfig.collection_providerPlayerDaySummary.aggregate([
                            {
                                $match: {
                                    date: {
                                        $gte: startTime,
                                        $lt: endTime
                                    },
                                    platformId: platformId,
                                    providerId: providerId
                                }
                            }, {
                                $group: {
                                    _id: "$platformId",
                                    total_amount: {$sum: "$amount"},
                                    total_consumption: {$sum: "$consumptionTimes"},
                                    validAmount: {$sum: "$validAmount"},
                                    bonusAmount: {$sum: "$bonusAmount"}
                                }
                            }
                        ]).exec();
                    }
                },
                function (error) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding data!",
                        error: error
                    });
                }
            )
            .then(
                function (data) {
                    if (data && data.length > 0) {
                        result.amount = data[0].total_amount;
                        result.consumption = data[0].total_consumption;
                        result.validAmount = data[0].validAmount;
                        result.bonusAmount = data[0].bonusAmount;
                        deferred.resolve(result);
                    } else {
                        deferred.resolve();
                    }
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding amount data. ",
                        error: err
                    })
                }
            );
        return deferred.promise;
    },

    getAllProviderGameDaySummaryForTimeFrame: function (startTime, endTime, platformId, providerId, index, limit, sortCol) {
        var deferred = Q.defer();
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {};
        var size = 0;
        // dbconfig.collection_game.find({provider: providerId});
        dbconfig.collection_providerPlayerDaySummary.distinct('gameId', {
            date: {
                $gte: startTime,
                $lt: endTime
            },
            platformId: platformId,
            providerId: providerId
        })
            .then(
                function (data) {
                    size = data ? data.length : 0;
                    if (data && data.length > 0) {
                        var proms = [];
                        for (var i = 0; i < data.length; i++) {
                            // if (i + 1 <= limit) {
                            var prom = dbGameProviderPlayerDaySummary.getGameDaySummaryForTimeFrame(startTime, endTime, platformId, providerId, data[i]);
                            proms.push(prom);
                            // }
                        }
                        return Q.all(proms);
                    }
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding provider data. ",
                        error: err
                    });
                }
            )
            .then(
                function (data) {
                    var totalTimes = 0;
                    var totalConsumption = 0;
                    var totalValidConsumption = 0;
                    var totalBonusAmount = 0;
                    data.map(item => {
                        totalTimes += parseInt(item.consumption);
                        totalConsumption += parseFloat(item.amount);
                        totalValidConsumption += parseFloat(item.validAmount);
                        totalBonusAmount += parseFloat(item.bonusAmount);
                    })
                    deferred.resolve({
                        data: data.slice(index, index + limit), size: data.length,
                        summary: {
                            times: totalTimes,
                            consumption: totalConsumption,
                            validConsumption: totalValidConsumption,
                            bonusAmount: totalBonusAmount
                        }
                    });
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding amount data. ",
                        error: err
                    })
                }
            )
        return deferred.promise;
    },

    getGameDaySummaryForTimeFrame: function (startTime, endTime, platformId, providerId, gameId) {
        var deferred = Q.defer();
        var result = {};
        dbconfig.collection_game.findOne({_id: gameId})
            .then(
                function (data) {
                    if (data) {
                        result._id = data._id;
                        result.gameId = data.gameId;
                        result.name = data.name;
                        console.log('report', gameId);
                        return dbconfig.collection_providerPlayerDaySummary.distinct('playerId', {
                            date: {
                                $gte: startTime,
                                $lt: endTime
                            },
                            platformId: platformId,
                            providerId: providerId,
                            gameId: gameId
                        })
                    }
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding game data. " + err,
                        error: err
                    })
                })
            .then(
                function (data) {
                    if (data) {
                        if (data.length > 0) {
                            result.total_player = data.length;
                        } else result.total_player = 0;
                        return dbconfig.collection_providerPlayerDaySummary.aggregate([
                            {
                                $match: {
                                    date: {
                                        $gte: startTime,
                                        $lt: endTime
                                    },
                                    platformId: platformId,
                                    providerId: providerId,
                                    gameId: gameId
                                }
                            }, {
                                $group: {
                                    _id: "$platformId",
                                    total_amount: {$sum: "$amount"},
                                    validAmount: {$sum: "$validAmount"},
                                    bonusAmount: {$sum: "$bonusAmount"},
                                    total_consumption: {$sum: "$consumptionTimes"}
                                }
                            }
                        ]).exec()
                    } else {
                        return true;
                    }
                },
                function (error) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding data!",
                        error: error
                    });
                }
            )
            .then(
                function (data) {
                    if (data && data.length > 0) {
                        result.amount = data[0].total_amount;
                        result.consumption = data[0].total_consumption;
                        result.validAmount = data[0].validAmount;
                        result.bonusAmount = data[0].bonusAmount;
                    } else {
                        result.amount = 0;
                        result.consumption = 0;
                        result.validAmount = 0;
                        result.bonusAmount = 0;
                    }
                    deferred.resolve(result);
                }, function (err) {
                    deferred.reject({name: "DBError", message: "Error in getGameDaySummaryForTimeFrame", error: err});
                }
            );
        return deferred.promise;
    },
    getAllProviderGamePlayerDaySummaryForTimeFrame: function (startTime, endTime, platformId, providerId, gameId, index, limit) {
        var deferred = Q.defer();
        dbconfig.collection_providerPlayerDaySummary.distinct('playerId', {
            date: {
                $gte: startTime,
                $lt: endTime
            },
            platformId: platformId,
            providerId: providerId,
            gameId: gameId,
        })
        // dbconfig.collection_players.find({platform: platformId})
            .then(
                function (data) {
                    if (data && data.length > 0) {
                        var proms = [];
                        for (var i = 0; i < data.length; i++) {
                            // if (i + 1 <= limit) {
                            var prom = dbGameProviderPlayerDaySummary.getGamePlayerDaySummaryForTimeFrame(startTime, endTime, platformId, providerId, gameId, data[i]);
                            proms.push(prom);
                            // }
                        }
                        return Q.all(proms);
                    } else {
                        deferred.reject({
                            name: "DataError",
                            message: "Error finding game. ",
                        })
                    }
                }, function (err) {
                    deferred.reject({
                        name: 'DBError',
                        message: "Error in getAllProviderGamePlayerDaySummaryForTimeFrame",
                        error: err
                    });
                }
            )
            .then(
                function (data) {
                    var totalTimes = 0;
                    var totalConsumption = 0;
                    var totalValidConsumption = 0;
                    var totalBonus = 0;
                    data.filter(item => {
                        return item._id
                    }).map(item => {
                        totalTimes += parseInt(item.consumption);
                        totalConsumption += parseFloat(item.amount);
                        totalValidConsumption += parseFloat(item.validAmount);
                        totalBonus += parseFloat(item.bonusAmount);
                    });
                    deferred.resolve({
                        data: data.slice(index, index + limit), size: data.length,
                        summary: {
                            times: totalTimes,
                            consumption: totalConsumption,
                            validConsumption: totalValidConsumption,
                            bonusAmount: totalBonus
                        }
                    });
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding amount data. ",
                        error: err
                    })
                }
            )
        return deferred.promise;
    },
    getGamePlayerDaySummaryForTimeFrame: function (startTime, endTime, platformId, providerId, gameId, playerId) {
        var deferred = Q.defer();
        var result = {};
        dbconfig.collection_players.findOne({_id: playerId})
            .then(
                function (data) {
                    if (data) {
                        result._id = data._id;
                        result.playerId = data.playerId;
                        result.name = data.name;
                        return dbconfig.collection_providerPlayerDaySummary.aggregate([
                            {
                                $match: {
                                    date: {
                                        $gte: startTime,
                                        $lt: endTime
                                    },
                                    platformId: platformId,
                                    providerId: providerId,
                                    gameId: gameId,
                                    playerId: playerId
                                }
                            }, {
                                $group: {
                                    _id: "$platformId",
                                    total_amount: {$sum: "$amount"},
                                    validAmount: {$sum: "$validAmount"},
                                    bonusAmount: {$sum: "$bonusAmount"},
                                    total_consumption: {$sum: "$consumptionTimes"}
                                }
                            }
                        ]).exec()
                    }
                },
                function (error) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding data!",
                        error: error
                    });
                }
            )
            .then(
                function (data) {
                    if (data && data.length > 0) {
                        result.amount = data[0].total_amount;
                        result.consumption = data[0].total_consumption;
                        result.bonusAmount = data[0].bonusAmount;
                        result.validAmount = data[0].validAmount;
                    } else result.consumption = 0;
                    deferred.resolve(result);
                }, function (err) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error finding consumption data. " + err,
                        error: err
                    });
                }
            );
        return deferred.promise;
    },

    /**
     * Accumulated consumption report of a player played (consumed in games) within a provider for time frame (in parallel)
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    getPlayersByProvider: function (platformId, playerId, playerName, providerId, startTime, endTime, index, count, sortCol) {
        index = index || 0;
        count = count || constSystemParam.MAX_RECORD_NUM;
        sortCol = sortCol || {};
        var summaryData = null;
        var deferred = Q.defer();
        var playerDeferred = Q.defer();

        var matchObj = {
            date: {
                $gte: startTime,
                $lt: endTime
            },
            platformId: platformId
        };
        if (providerId) {
            matchObj.providerId = providerId;
        }
        if (playerId || playerName) {
            let searchQuery = {};
            if (playerId) {
                searchQuery.playerId = playerId;
            }
            if (playerName) {
                searchQuery.name = playerName;
            }

            // Converting the playerId from request data to player _id for upcoming search purpose
            dbconfig.collection_players.findOne(searchQuery).then(
                function (data) {
                    // check if this player is in the platform selected in the query form
                    if (data && data.platform && String(data.platform) == String(platformId)) {
                        matchObj.playerId = data._id;
                        playerDeferred.resolve(matchObj);
                    } else {
                        playerDeferred.reject({
                            name: "DBError",
                            message: "The user does not exist in the platform."
                        })
                    }
                },
                function (error) {
                    playerDeferred.reject({
                        name: "DBError",
                        message: "Error finding in player data. " + error,
                        error: error
                    });
                }
            );
        } else {
            playerDeferred.resolve(matchObj);
        }
        playerDeferred.promise.then(
            function (match) {
                dbconfig.collection_providerPlayerDaySummary.aggregate([
                    {$match: match},
                    {
                        $group: {
                            _id: {playerId: "$playerId"},
                            totalConsumedAmount: {$sum: "$amount"},
                            timesConsumed: {$sum: "$consumptionTimes"},
                            validAmount: {$sum: "$validAmount"}
                        }
                    }
                ]).skip(index).exec().then(
                    function (data) {
                        // Short playerId is the desired format in the final result to the View
                        // In order to do so, search the player to grab playerId
                        summaryData = data;
                        if (data && data.length > 0) {
                            var proms = [];
                            for (var i = 0; i < data.length; i++) {
                                //  if (i + 1 <= limit) {
                                var prom_player = dbconfig.collection_players.findOne({"_id": ObjectId(data[i]._id.playerId)});
                                proms.push(prom_player);
                                //   }
                            }
                            return Q.all(proms);
                        } else {
                            return false;
                        }
                    },
                    function (error) {

                        deferred.reject({
                            name: "DBError",
                            message: "Error finding player consumption day summary!",
                            error: error
                        });
                    }
                ).then(
                    function (data) {

                        var playerData = data;
                        // Mapping player _id and playerId
                        var players = {};
                        var playerNames = {};
                        for (var j = 0; j < playerData.length; j++) {
                            if (playerData[j] && !players[playerData[j]._id]) {
                                players[playerData[j]._id] = playerData[j].playerId;
                                playerNames[playerData[j]._id] = playerData[j].name;
                            }
                        }

                        // After mapping, convert the _id (as key) to playerId using map
                        var playerSummArray = [];
                        var sumAmount = 0;
                        var sumValidAmount = 0;
                        var sumTimesConsumed = 0;

                        for (var i = 0; i < summaryData.length; i++) {
                            sumAmount += summaryData[i].totalConsumedAmount;
                            sumValidAmount += summaryData[i].validAmount;
                            sumTimesConsumed += summaryData[i].timesConsumed;
                            var playerGame = {
                                _id: {
                                    playerId: players[summaryData[i]._id.playerId],
                                    playerName: playerNames[summaryData[i]._id.playerId],
                                    playerObjId: summaryData[i]._id.playerId  // this playerObjId is meant for subsequent query, not meant for display purpose in view
                                },
                                totalConsumedAmount: parseFloat(summaryData[i].totalConsumedAmount).toFixed(2),
                                validAmount: parseFloat(summaryData[i].validAmount).toFixed(2),
                                timesConsumed: summaryData[i].timesConsumed
                            };
                            playerSummArray.push(playerGame);
                        }
                        var key = Object.keys(sortCol)[0];
                        var val = sortCol[key];

                        playerSummArray.sort((a, b) => {
                            var test = 0;
                            if (a[key] > b[key]) {
                                test = 1
                            }
                            if (a[key] < b[key]) {
                                test = -1
                            }
                            return test * val;
                        });
                        deferred.resolve({
                            data: playerSummArray.slice(index, index + count),
                            size: playerSummArray.length,
                            summary: {
                                amount: sumAmount,
                                validAmount: sumValidAmount,
                                timesConsumed: sumTimesConsumed,
                            }
                        });
                    }
                ).catch(
                    function (error) {
                        deferred.reject({name: "DBError", message: "Error in getPlayersByProvider. " + error.message, error: error});
                    }
                );
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getPlayersByProvider. " + error.message, error: error});
            }
        );
        return deferred.promise;

    },
    /**
     * Accumulated consumption report of a player consumption in each game within a provider for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    getPlayerConsumptionByGame: function (providerId, playerId, startTime, endTime) {
        var summaryData = null;
        var deferred = Q.defer();
        var matchObj = {
            date: {
                $gte: startTime,
                $lt: endTime
            },
            playerId: playerId
        };
        if (providerId) {
            matchObj.providerId = providerId;
        }
        ;
        dbconfig.collection_providerPlayerDaySummary.aggregate([
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: {
                        gameId: "$gameId",
                        playerId: "$playerId",
                        providerId: "$providerId"
                    },
                    totalConsumedAmount: {$sum: "$amount"},
                    validAmount: {$sum: "$validAmount"},
                    timesConsumed: {$sum: "$consumptionTimes"},
                }
            }

        ]).exec().then(
            function (data) {
                summaryData = data;
                if (data && data.length > 0) {
                    var proms = [];
                    var proms1 = [];
                    for (var i = 0; i < data.length; i++) {
                        var prom_game = dbconfig.collection_game.findOne({"_id": ObjectId(data[i]._id.gameId)});
                        var prom_provider = dbconfig.collection_gameProvider.findOne({"_id": ObjectId(data[i]._id.providerId)});
                        proms.push(prom_game);
                        proms1.push(prom_provider);

                    }
                    return Q.all([Q.all(proms), Q.all(proms1)]);
                } else {
                    deferred.resolve(false);
                }
            },
            function (error) {

                deferred.reject({
                    name: "DBError",
                    message: "Error finding player consumption day summary !",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    var gameData = data[0];
                    var providerData = data[1];

                    var games = {};
                    for (var j = 0; j < gameData.length; j++) {
                        if (!games[gameData[j]._id]) {
                            games[gameData[j]._id] = gameData[j].name;
                        }
                    }

                    var providers = {};
                    for (var j = 0; j < providerData.length; j++) {
                        if (!providers[providerData[j]._id]) {
                            providers[providerData[j]._id] = providerData[j].name;
                        }
                    }

                    var playerGameArray = [];
                    for (var i = 0; i < summaryData.length; i++) {
                        var playerGame = {
                            _id: {
                                gameName: games[summaryData[i]._id.gameId],
                                playerId: summaryData[i]._id.playerId,
                                providerName: providers[summaryData[i]._id.providerId],
                            },
                            totalConsumedAmount: parseFloat(summaryData[i].totalConsumedAmount).toFixed(2),
                            validAmount: parseFloat(summaryData[i].validAmount).toFixed(2),
                            timesConsumed: summaryData[i].timesConsumed
                        };
                        playerGameArray.push(playerGame);
                    }

                    deferred.resolve(playerGameArray);
                }
            }, function (err) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding amount data. ",
                    error: err
                })
            }
        );
        return deferred.promise;
    },

    getPlayerDailyExpenseSummary: function (query, index, limit, sortCol) {
        var queryObject = {};
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1}

        if (query.playerId) {
            queryObject.playerId = ObjectId(query.playerId);
        }
        if (query.startTime && query.endTime) {
            queryObject.date = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
        }
        if (query.providerId) {
            queryObject.providerId = mongoose.Types.ObjectId(query.providerId);
        }
        if (query.dirty != null) {
            queryObject.bDirty = query.dirty;
        }

        var a = dbconfig.collection_providerPlayerDaySummary
            .find(queryObject)
            .populate({path: "playerId", model: dbconfig.collection_players})
            .populate({path: "providerId", model: dbconfig.collection_gameProvider})
            .populate({path: "gameId", model: dbconfig.collection_game}).lean()
            .sort(sortCol).skip(index).limit(limit);
        var b = dbconfig.collection_providerPlayerDaySummary.find(queryObject).count();
        var c = dbconfig.collection_providerPlayerDaySummary.aggregate({$match: queryObject}, {
            $group: {
                _id: false,
                validAmountSum: {$sum: "$validAmount"},
                amountSum: {$sum: "$amount"},
                bonusAmountSum: {$sum: "$bonusAmount"},
                commissionAmountSum: {$sum: "$commissionAmount"}
            }
        })
        return Q.all([a, b, c]).then(result => {
            return {data: result[0], size: result[1], summary: result[2] ? result[2][0] : {}};
        })
    }


}

module.exports = dbGameProviderPlayerDaySummary;







