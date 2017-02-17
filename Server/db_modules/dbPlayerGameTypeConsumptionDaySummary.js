var Q = require('q');
var dbconfig = require('./../modules/dbproperties');
var dbUtil = require('./../modules/dbutility');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbProposal = require('../db_modules/dbProposal');
var constSystemParam = require('./../const/constSystemParam');

var dbPlayerGameTypeConsumptionDaySummary = {

    /**
     * Update or insert game type consumption day summary
     * @param {Json} data - The day summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.gameType;
        delete upsertData.date;
        return dbUtil.upsertForShard(dbconfig.collection_playerGameTypeConsumptionDaySummary,
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
     * Calculate platform players game type consumption day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} platformId - The platform id
     */
    calculatePlatformDaySummaryForTimeFrame: function (startTime, endTime, platformId) {
        throw new Error("dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame is deprecated.  This is now calculated as part of dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame");

        var deferred = Q.defer();

        // var prom1 = dbPlayerConsumptionRecord.getPlayerTotalGameTypeConsumptionForTimeFrame(startTime, endTime, null, platformId, false);
        var prom2 = dbPlayerConsumptionRecord.getPlayerTotalGameTypeConsumptionForTimeFrame(startTime, endTime, null, platformId, true);

        prom2.then(
            function (consumptionRecords) {
                if (consumptionRecords) {
                    var proms = [];
                    for( var i = 0; i < consumptionRecords.length; i++ ){
                        var consumptionRecord = consumptionRecords[i];
                        var summary = {
                            playerId: consumptionRecord._id.playerId,
                            platformId: consumptionRecord._id.platformId,
                            gameType: consumptionRecord._id.gameType,
                            date: startTime,
                            amount: consumptionRecord.amount
                        };
                        proms.push(dbPlayerGameTypeConsumptionDaySummary.upsert(summary));
                    }
                    if(proms.length > 0){
                        return Q.all(proms);
                    }
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error find player game type consumption record", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error create player game type consumption day summary", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Calculate player game type consumption day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} platformId - The platform id
     */
    /*
    calculatePlayerDaySummaryForTimeFrame: function (startTime, endTime, playerObjId, platformObjId) {
        var deferred = Q.defer();

        var prom1 = dbPlayerConsumptionRecord.getPlayerTotalGameTypeConsumptionForTimeFrame(startTime, endTime, playerObjId, platformObjId, false);
        var prom2 = dbPlayerConsumptionRecord.getPlayerTotalGameTypeConsumptionForTimeFrame(startTime, endTime, playerObjId, platformObjId, true);
        
        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1] ) {
                    var proms = [];
                    for( var i = 0; i < data[1].length; i++ ){
                        var summary = {
                            playerId: data[1][i]._id.playerId,
                            platformId: data[1][i]._id.platformId,
                            gameType: data[1][i]._id.gameType,
                            date: startTime,
                            amount: data[1][i].amount
                        };
                        proms.push(dbPlayerGameTypeConsumptionDaySummary.upsert(summary));
                    }
                    for( var i = 0; i < data[0].length; i++ ){
                        var summary = {
                            playerId: data[0][i]._id.playerId,
                            platformId:data[0][i]._id.platformId,
                            gameType: data[0][i]._id.gameType,
                            date: startTime,
                            validAmount: data[0][i].amount
                        };
                        proms.push(dbPlayerGameTypeConsumptionDaySummary.upsert(summary));
                    }
                    if(proms.length > 0){
                        return Q.all(proms);
                    }
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error find player game type consumption record", error: error});
            }
        ).then(
            function(data){
                deferred.resolve(data);
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error create player game type consumption day summary", error: error});
            }
        );

        return deferred.promise;
    },
    */

    /**
     * Get total game type consumption amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     * @param {ObjectId} platformId - The platform id
     * @param {String} gameType - The game type
     */
    /*
    getPlayerTotalGameTypeConsumptionForTimeFrame: function (startTime, endTime, playerObjId, platformObjId) {
        var matchObj = {
            platformId: platformObjId,
            date: {
                $gte: startTime,
                $lt: endTime
            }
        };
        if(playerObjId){
            matchObj.playerId = playerObjId;
        }
        return dbconfig.collection_playerGameTypeConsumptionDaySummary.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId", gameType: "$gameType"},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"}
                    }
                }
            ]
        ).allowDiskUse(true).exec();
        // TODO: In stress tests, this is failing with: aggregation result exceeds maximum document size (16MB)
        // If I replace it with .cursor({batchSize: 1000}).allowDiskUse(true).exec().toArray();
        // then I get an out-of-memory error from Node instead.
    },
    */

    /**
     * Get total game type consumption amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     * @param [{ObjectId}] playerObjIds - A batch of players to calculate
     * @param {ObjectId} platformId - The platform id
     */
    getPlayersTotalGameTypeConsumptionForTimeFrame: function (startTime, endTime, playerObjIds, platformObjId) {
        var matchObj = {
            platformId: platformObjId,
            date: {
                $gte: startTime,
                $lt: endTime
            },
            playerId: {$in: playerObjIds}
        };
        return dbconfig.collection_playerGameTypeConsumptionDaySummary.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId", gameType: "$gameType"},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"}
                    }
                }
            ]
        ).cursor({batchSize: constSystemParam.BATCH_SIZE}).allowDiskUse(true).exec().toArray();
    },

    /**
     * Clear the player day consumption records valid amount(dirty) for time frame
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
     * Clear the player day consumption records valid amount(dirty) for time frame
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
        return dbconfig.collection_playerGameTypeConsumptionDaySummary.update(
            query,
            {validAmount: 0},
            {multi: true}
        ).exec();
    }
    */

};

module.exports = dbPlayerGameTypeConsumptionDaySummary;

