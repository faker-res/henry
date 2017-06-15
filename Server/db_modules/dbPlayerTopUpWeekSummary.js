var Q = require('q');
var dbUtil = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbProposal = require('../db_modules/dbProposal');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var constShardKeys = require('../const/constShardKeys');
var constSystemParam = require('../const/constSystemParam');

var dbPlayerTopUpWeekSummary = {

    /**
     * Update or insert top up week summary
     * @param {Json} data - The week summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.date;
        return dbUtil.upsertForShard(
            dbconfig.collection_playerTopUpWeekSummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_playerTopUpWeekSummary
        );
    },

    /**
     * Calculate player top up week summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     */
    calculatePlatformWeekSummaryForTimeFrame: function (startTime, endTime, platformId) {
        //todo: refactor this code later
        return Q.resolve(true);

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            var stream = dbPlayerConsumptionRecord.streamPlayersWithTopUpDaySummaryInTimeFrame(startTime, endTime, platformId);

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: 300,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers", {
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

    playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers: function (startTime, endTime, platformId, playerObjIds) {
        var deferred = Q.defer();
        dbPlayerTopUpDaySummary.getPlayersTotalTopUpForTimeFrame(startTime, endTime, platformId, playerObjIds).then(
            function (data) {
                if (data && data.length > 0) {
                    return data;
                }
                else {
                    console.error("No player top up last week!");
                    deferred.resolve(false);
                }
            },
            function (error) {
                //console.error("Get player top up failed!", error);
                deferred.reject({name: "DBError", message: "Get player top up failed!", error: error});
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
                            times: data[i].times
                        };

                        var prom = dbPlayerTopUpWeekSummary.upsert(summary);
                        proms.push(prom);
                    }
                    return Q.all(proms);
                }
            }
        ).then(
            function (data) {
                //todo::add done handler here
                deferred.resolve(data);
            },
            function (error) {
                //console.error(error);
                deferred.reject({name: "DBError", message: "Update player top up week summary failed!", error: error});
            }
        );

        return deferred.promise;
    }

};

module.exports = dbPlayerTopUpWeekSummary;