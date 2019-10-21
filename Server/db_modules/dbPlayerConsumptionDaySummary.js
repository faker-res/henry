var dbPlayerConsumptionDaySummaryFunc = function () {
};
module.exports = new dbPlayerConsumptionDaySummaryFunc();

var Q = require('q');
var dbconfig = require('./../modules/dbproperties');
var dbUtil = require('./../modules/dbutility');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');
var dbProposal = require('../db_modules/dbProposal');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var constSystemParam = require('../const/constSystemParam');
var constShardKeys = require('../const/constShardKeys');

var dbPlayerConsumptionDaySummary = {

    /**
     * Update or insert consumption day summary
     * @param {Json} data - The day summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.date;
        return dbUtil.upsertForShard(
            dbconfig.collection_playerConsumptionDaySummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_playerConsumptionDaySummary
        );
    },

    upsertWinRateReportDataDaySummary: function(data){
        let upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.date;

        return dbUtil.upsertForShard(
            dbconfig.collection_winRateReportDataDaySummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                providerId: data.providerId,
                cpGameType: data.cpGameType,
                date: data.date,
                loginDevice: data.loginDevice,
            },
            upsertData,
            constShardKeys.collection_winRateReportDataDaySummary
        );
    },

    createPlayerConsumptionDaySummary: (platformId, playerId, startTime, endTime, amount, validAmount, bonusAmount, times) => {
        let log = {
            platformId: platformId,
            playerId: playerId,
            startTime: startTime,
            endTime: endTime,
            amount: amount,
            validAmount: validAmount,
            bonusAmount: bonusAmount,
            times: times
        };

        return dbconfig.collection_playerConsumptionDaySummary(log).save();
    },

    /**
     * Calculate platform players consumption day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} platformId - The platform id
     */
    calculatePlatformDaySummaryForTimeFrame: function (startTime, endTime, platformId) {
        return this.calculatePlatformDaySummaryForTimeFrameParallel(startTime, endTime, platformId);
    },

    /**
     * Calculate platform players consumption day summary for time frame (in parallel)
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} platformId - The platform id
     */
    calculatePlatformDaySummaryForTimeFrameParallel: function (startTime, endTime, platformId) {

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            var stream = dbPlayerConsumptionRecord.streamPlayersWithConsumptionInTimeFrame(startTime, endTime, platformId);

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: 100,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "calculatePlayersDaySummaryForTimeFrame", {
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            }),
                            platformObjId: platformId,
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                })
            );
        });
    },

    /**
     * This summary might not be accurate at any given time, records may get added, updated or duplicated
     * Experimental, use with caution
     * @param startTime
     * @param endTime
     * @param platformId
     */
    calcDailyPlatformPlayerConsumpSumm: function (startTime, endTime, platformId) {
        console.log('calcDailyPlatformPlayerConsumpSumm', platformId);
        let relevantPlayerQuery = {
            platformId: platformId,
            createTime: {$gte: startTime, $lte: endTime},
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

        return dbconfig.collection_playerConsumptionRecord.aggregate([
            {$match: relevantPlayerQuery},
            {
                $group: {
                    _id: "$playerId",
                    amount: {$sum: 1},
                    validAmount: {$sum: 1},
                    bonusAmount: {$sum: 1},
                    count: {$sum: 1}
                }
            }
        ]).then(
            playersSumm => {
                if (playersSumm && playersSumm.length) {
                    console.log('playersSumm.length', playersSumm.length);
                    playersSumm.forEach(summ => {
                        this.createPlayerConsumptionDaySummary(
                            platformId,
                            summ._id,
                            startTime,
                            endTime,
                            summ.amount,
                            summ.validAmount,
                            summ.bonusAmount,
                            summ.count
                        );
                    })
                }
            }
        )
    },

    /**
     * Calculate player consumption day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param [{ObjectId}] playerObjId - The player object id
     *  @param {ObjectId} platformObjId - The platform object id
     */
    calculatePlayersDaySummaryForTimeFrame: function (startTime, endTime, playerObjIds, platformObjId) {
        var prom1 = dbPlayerConsumptionDaySummary.calculatePlayersDaySummaryForTimeFrameUngrouped(startTime, endTime, playerObjIds, platformObjId)
        return prom1;
        //var prom2 = dbPlayerConsumptionDaySummary.calculatePlayersDaySummaryForTimeFrameGroupedByGameType(startTime, endTime, playerObjIds, platformObjId);
        //return Q.all([prom1, prom2]);
    },

    calculatePlayersDaySummaryForTimeFrameUngrouped: function (startTime, endTime, playerObjIds, platformObjId) {
        return dbPlayerConsumptionDaySummary.calculatePlayersDaySummaryForTimeFrameWithGrouping(startTime, endTime, playerObjIds, platformObjId, null, dbPlayerConsumptionDaySummary);
    },

    calculatePlayersDaySummaryForTimeFrameGroupedByGameType: function (startTime, endTime, playerObjIds, platformObjId) {
        return dbPlayerConsumptionDaySummary.calculatePlayersDaySummaryForTimeFrameWithGrouping(startTime, endTime, playerObjIds, platformObjId, 'gameType', dbPlayerGameTypeConsumptionDaySummary);
    },

    calculatePlayersDaySummaryForTimeFrameWithGrouping: function (startTime, endTime, playerObjIds, platformObjId, extraGroup, whereToUpsert) {
        var deferred = Q.defer();
        // var prom1 = dbPlayerConsumptionRecord.getPlayerTotalConsumptionForTimeFrame(startTime, endTime, playerObjId, platformObjId, false);
        // var prom2 = dbPlayerConsumptionRecord.getPlayerTotalConsumptionForTimeFrame(startTime, endTime, playerObjId, platformObjId, true);
        var prom1 = dbPlayerConsumptionRecord.getPlayersTotalConsumptionForTimeFrameWithGrouping(startTime, endTime, playerObjIds, platformObjId, true, extraGroup);
        //var prom2 = dbPlayerConsumptionRecord.getPlayersTotalConsumptionForTimeFrameWithGrouping(startTime, endTime, playerObjIds, platformObjId, true, extraGroup);

        prom1.then(
            function (consumptionRecords) {
                if (consumptionRecords) {

                    function upsertAmountSummaries() {
                        var proms = [];
                        for (var i = 0; i < consumptionRecords.length; i++) {
                            var summary = {
                                playerId: consumptionRecords[i]._id.playerId,
                                platformId: consumptionRecords[i]._id.platformId,
                                date: startTime,
                                amount: consumptionRecords[i].amount,
                                validAmount: consumptionRecords[i].validAmount,
                                times: consumptionRecords[i].times
                            };
                            if (extraGroup) {
                                summary[extraGroup] = consumptionRecords[i]._id[extraGroup];
                            }
                            // console.log("summary:", summary);
                            var prom = whereToUpsert.upsert(summary);
                            proms.push(prom);
                        }
                        return Q.all(proms);
                    }

                    return upsertAmountSummaries().then(
                        function (amountUpsertResults) {
                            var report = "Upserted " + amountUpsertResults.length + " amount summaries (group=" + extraGroup + ").";
                            deferred.resolve(report);
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Get player consumption record failed!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating player consumption day summary",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Get total consumption amount in a certain period of time
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {objectId} playerObjId
     * @param {objectId} platformObjId
     */
    getPlayerTotalConsumptionForTimeFrame: function (startTime, endTime, playerObjId, platformObjId) {
        return this.getPlayersTotalConsumptionForTimeFrame(startTime, endTime, playerObjId && [playerObjId], platformObjId);
    },

    /**
     * Get total consumption amount in a certain period of time
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {[objectId]} playerObjId
     * @param {objectId} platformObjId
     */
    getPlayersTotalConsumptionForTimeFrame: function (startTime, endTime, playerObjIds, platformObjId) {
        var matchObj = {
            platformId: platformObjId,
            date: {
                $gte: startTime,
                $lt: endTime
            }
        };
        if (playerObjIds) {
            matchObj.playerId = {$in: playerObjIds};
        }
        return dbconfig.collection_playerConsumptionDaySummary.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId"},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        times: {$sum: "$times"}
                    }
                }
            ]
        ).cursor({batchSize: constSystemParam.BATCH_SIZE}).allowDiskUse(true).exec().toArray();
    },

    getPlayersConsumptionSumForAllPlatform: function (startTime, endTime, platform) {
        let matchObj = {
            date: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        };
        if (platform !== 'all') {
            matchObj.platformId = platform
        }
        return dbconfig.collection_playerConsumptionDaySummary.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: "$platformId",
                    totalAmount: {$sum: "$amount"}
                }
            }
        ).then(
            function (data) {
                return dbconfig.collection_platform.populate(data, {path: '_id', model: dbconfig.collection_platform})
            }
        );
    },

    getPlayerConsumptionSummary: (playerObjId) => {
        return dbconfig.collection_playerConsumptionSummary.find({
            playerId: playerObjId
        }).sort({createTime: -1}).limit(10).lean();
    },

    winRateReportDaySummary_calculateWinRateReportDaySummaryForPlayers: function (startTime, endTime, platformId, playerObjIds) {
        return dbPlayerConsumptionRecord.getWinRateReportDataForTimeFrame(startTime, endTime, platformId, playerObjIds).then(
            function (data) {
                if (data && data.length > 0) {
                    return data;
                }
            },
            function (error) {
                return Promise.reject({name: "DBError", message: "Get win rate report day summary failed!", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    let proms = data.map(
                        sum => {
                            sum.date = startTime;
                            sum.createTime = new Date();
                            return dbPlayerConsumptionDaySummary.upsertWinRateReportDataDaySummary(sum);
                        }
                    );
                    return Q.all(proms);
                }
            },
            function (error) {
                return Promise.reject({name: "DBError", message: "Update win rate report data day summary failed!", error: error});
            }
        ).then(
            function (data) {
                return data;
            },
            function (error) {
                return Promise.reject({name: "DBError", message: "Update win rate report data day summary failed!", error: error});
            }
        );
    },
};

//module.exports = dbPlayerConsumptionDaySummary;
var proto = dbPlayerConsumptionDaySummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionDaySummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionDaySummary;