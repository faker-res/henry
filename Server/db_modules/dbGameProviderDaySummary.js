const dbconfig = require('./../modules/dbproperties');
const dbUtil = require('../modules/dbutility');
const constServerCode = require('./../const/constServerCode');
const constShardKeys = require('../const/constShardKeys');
const Q = require("q");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var dbGameProviderDaySummary = {

    /**
     * Update or insert game provider day summary
     * @param {Json} data - The game provider day summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.platformId;
        delete upsertData.providerId;
        delete upsertData.gameId;
        delete upsertData.gameType;
        delete upsertData.date;
        return dbUtil.upsertForShard(
            dbconfig.collection_providerDaySummary,
            {
                platformId: data.platformId,
                providerId: data.providerId,
                gameId: data.gameId,
                gameType: data.gameType,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_providerDaySummary
        );
    },

    /**
     * Calculate provider consumption day summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     * @param {ObjectId} providerId - The provider id
     */
    calculateProviderDaySummaryForTimeFrame: function (startTime, endTime, providerId, platformId) {
        let deferred = Q.defer();
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
            matchObj.platformId = {$in: platformId};
        }
        //because this aggregate will not have too many records, so no stream for this
        dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {
                            providerId: "$providerId",
                            gameId: "$gameId",
                            gameType: "$gameType",
                            platformId: "$platformId"
                        },
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        bonusAmount: {$sum: "$bonusAmount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).exec().then(
            function (data) {
                if (data && data.length > 0) {
                    var prom = [];
                    for (var i = 0; i < data.length; i++) {
                        var summary = {
                            providerId: data[i]._id.providerId,
                            gameId: data[i]._id.gameId,
                            gameType: data[i]._id.gameType,
                            platformId: data[i]._id.platformId,
                            date: startTime,
                            amount: data[i].amount,
                            validAmount: data[i].validAmount,
                            bonusAmount: data[i].bonusAmount,
                            consumptionTimes: data[i].times
                        };
                        prom.push(dbGameProviderDaySummary.upsert(summary));
                    }
                    return Q.all(prom);
                }
                else {
                    //todo:: replace string with const???
                    deferred.resolve("No player consumption today!");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player consumption record!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating provider day summary!", error: error});
            }
        );

        return deferred.promise;
    }

};

module.exports = dbGameProviderDaySummary;







