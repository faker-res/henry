var Q = require('q');
var dbconfig = require('./../modules/dbproperties');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var constSystemParam = require('../const/constSystemParam');

var dbPlayerGameTypeConsumptionWeekSummary = {

    /**
     * Update or insert consumption week summary
     * @param {Json} data - The week summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.gameType;
        delete upsertData.date;
        return dbUtil.upsertForShard(dbconfig.collection_playerGameTypeConsumptionWeekSummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                gameType: data.gameType,
                date: data.date
            },
            upsertData
        );
    },

    /**
     * Calculate platform player game type consumption week summary for time frame
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
                        request("player", "gameTypeConsumption_calculatePlatformWeekSummaryForPlayers", {
                            startTime: startTime,
                            endTime: endTime,
                            platformId: platformId,
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            })
                        });
                    }
                })
            );

        });
    },

    gameTypeConsumption_calculatePlatformWeekSummaryForPlayers: function (startTime, endTime, platformId, playerIds) {
        var deferred = Q.defer();

        dbPlayerGameTypeConsumptionDaySummary.getPlayersTotalGameTypeConsumptionForTimeFrame(startTime, endTime, playerIds, platformId).then(
            function (data) {
                if (data && data.length > 0) {
                    return data;
                }
                else {
                    deferred.reject("No player consumption for this game type last week!");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Get player consumption for this game type failed!", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        var summary = {
                            playerId: data[i]._id.playerId,
                            platformId: data[i]._id.platformId,
                            gameType: data[i]._id.gameType,
                            date: startTime,
                            amount: data[i].amount,
                            validAmount: data[i].validAmount
                        };

                        var prom = dbPlayerGameTypeConsumptionWeekSummary.upsert(summary);
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
                deferred.reject({name: "DBError", message: "Update player game type consumption week summary failed!", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Calculate player game type consumption week summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     */
    // No longer used
    /*
    calculatePlayerWeekSummaryForTimeFrame: function (startTime, endTime, playerId, platformId) {
        var deferred = Q.defer();

        dbPlayerGameTypeConsumptionDaySummary.getPlayersTotalGameTypeConsumptionForTimeFrame(startTime, endTime, [playerId], platformId).then(
            function (data) {
                if (data && data.length > 0) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        var summary = {
                            playerId: data[i]._id.playerId,
                            platformId: data[i]._id.platformId,
                            gameType: data[i]._id.gameType,
                            date: startTime,
                            amount: data[i].amount,
                            validAmount: data[i].validAmount
                        };

                        var prom = dbPlayerGameTypeConsumptionWeekSummary.upsert(summary);
                        proms.push(prom);
                    }
                    return Q.all(proms);
                }
                else {
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Get player consumption for this game type failed!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Update player game type consumption week summary failed!", error: error});
            }
        );

        return deferred.promise;
    },
    */

    /**
     * Clear the player week consumption records valid amount(dirty) for time frame
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {ObjectId} playerObjId
     * @param {ObjectId} platformId
     */
    /*
    markPlayerRecordDirtyForTimeFrame: function(startTime, endTime, playerObjId, platformObjId) {
        return this.markPlayersRecordsDirtyForTimeFrame(startTime, endTime, playerObjId && [playerObjId], platformObjId);
    },
    */

    /**
     * Clear the player week consumption records valid amount(dirty) for time frame
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {[ObjectId]} playerObjIds
     * @param {ObjectId} platformId
     */
    /*
    markPlayersRecordsDirtyForTimeFrame: function(startTime, endTime, playerObjIds, platformObjId) {
        var query = {
            platformId: platformObjId,
            date: {
                $gte: startTime,
                $lt: endTime
            }
        };
        if(playerObjIds){
            query.playerId = {$in: playerObjIds};
        }
        return dbconfig.collection_playerGameTypeConsumptionWeekSummary.update(
            query,
            {validAmount: 0},
            {multi: true}
        ).exec();
    }
    */

};

module.exports = dbPlayerGameTypeConsumptionWeekSummary;
