'use strict';
var dbPlayerConsumptionRecordFunc = function () {
};
module.exports = new dbPlayerConsumptionRecordFunc();

const Q = require('q');
const env = require('../config/env');
const moment = require('moment-timezone');
const dbconfig = require('./../modules/dbproperties');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const constRewardType = require('./../const/constRewardType');
const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const dbRewardTask = require('../db_modules/dbRewardTask');
const constShardKeys = require('../const/constShardKeys');
const constSystemParam = require('../const/constSystemParam');
const SettlementBalancer = require('../settlementModule/settlementBalancer');
const promiseUtils = require("../modules/promiseUtils.js");
const constGameStatus = require("./../const/constGameStatus");
const constServerCode = require('../const/constServerCode');
const dataUtils = require("../modules/dataUtils.js");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const constProposalType = require('./../const/constProposalType');
const constProposalStatus = require('./../const/constProposalStatus');

let dbUtility = require('./../modules/dbutility');

function attemptOperationWithRetries(operation, maxAttempts, delayBetweenAttempts) {
    // Defaults
    if (maxAttempts === undefined) {
        maxAttempts = 20;
    }
    if (delayBetweenAttempts === undefined) {
        delayBetweenAttempts = 500;
    }

    var attemptsMade = 0;
    var makeAttempt = () => {
        attemptsMade++;
        return operation()
            .catch(
                error => {
                    if (attemptsMade >= maxAttempts) {
                        return Q.reject(error);
                    } else {
                        console.log("Attempted operation failed, will retry (%s/%s): %s", attemptsMade, maxAttempts, error);
                        return promiseUtils.delay(delayBetweenAttempts).then(makeAttempt);
                    }
                }
            );
    };
    return makeAttempt();
}

/**
 * Should not be run on the same record concurrently.
 * Otherwise it may attempt to create two new records at the same time.
 */
function realUpsert(query, updateData) {
    var shardKeys = constShardKeys.collection_playerConsumptionSummary;
    var model = dbconfig.collection_playerConsumptionSummary;
    return model.findOne(query).then(
        function (data) {
            if (data) {
                console.log("Updating consumptionSummary for %s", JSON.stringify(query));
                var shardQuery = {};
                shardKeys.forEach((shardKey) => {
                    shardQuery[shardKey] = data[shardKey]
                });
                return model.findOneAndUpdate(shardQuery, updateData);
            }
            else {
                console.log("Creating consumptionSummary for %s", JSON.stringify(query));
                var newModel = new model(query);
                return newModel.save().then(
                    function (newData) {
                        var shardQuery = {};
                        shardKeys.forEach((shardKey) => {
                            shardQuery[shardKey] = newData[shardKey]
                        });
                        return model.findOneAndUpdate(shardQuery, updateData, {new: true}).then(
                            function (data) {
                                return data;
                            },
                            function (error) {
                                return Q.reject({name: "DBError", message: "Error updating db data", error: error});
                            }
                        );
                    },
                    function (error) {
                        return Q.reject({name: "DBError", message: "Error creating db data", error: error});
                    }
                );
            }
        },
        function (error) {
            return Q.reject({name: "DBError", message: "Error finding db data", error: error});
        }
    );
}

var dbPlayerConsumptionRecord = {

    consumptionRecordTimer: null,
    consumptionRecordMap: {},
    consumptionRecordQueue: [],

    /**
     * Get latest consumption record for query
     * @param {Object} query
     */
    getLatestConsumptionRecord: function (query) {
        return dbconfig.collection_playerConsumptionRecord.find(query).populate({
            path: "playerId",
            model: dbconfig.collection_players
        }).populate({
            path: "platformId",
            model: dbconfig.collection_platform
        }).sort({createTime: -1}).limit(20);
    },

    getPagedGameProviderConsumptionRecord: function (data, platformId, providerObjId, gameId, index, limit, sortCol) {
        var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
        var endTime = data.endTime ? new Date(data.endTime) : new Date();
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1};

        var matchObj = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            isDuplicate: {$ne: true}
        };
        if (providerObjId) {
            matchObj.providerId = providerObjId
        }
        if (platformId) {
            matchObj.platformId = platformId
        }
        if (gameId) {
            matchObj.gameId = gameId
        }

        var a = dbconfig.collection_playerConsumptionRecord.find(matchObj)
            .populate({path: "playerId", model: dbconfig.collection_players})
            .populate({path: "gameId", model: dbconfig.collection_game})
            .populate({path: "platformId", model: dbconfig.collection_platform})
            .sort(sortCol).skip(index).limit(limit);
        var b = dbconfig.collection_playerConsumptionRecord.find(matchObj).count();
        var c = dbconfig.collection_playerConsumptionRecord.aggregate({
                $match: matchObj
            },
            {
                $group: {
                    _id: null,
                    validAmountAll: {$sum: "$validAmount"},
                    amountAll: {$sum: "$amount"},
                    bonusAmountAll: {$sum: "$bonusAmount"},
                    commissionAmountAll: {$sum: "$commissionAmount"},
                }
            });
        return Q.all([a, b, c]).then(result => {
            return {data: result[0], count: result[1], summary: result[2] ? result[2][0] : {}}
        })
    },
    getConsumptionRecordByGameProvider: function (data, platformId, providerObjId, playerName, index, limit, sortCol) {
        var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
        var endTime = data.endTime ? new Date(data.endTime) : new Date();
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1};

        var matchObj = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            isDuplicate: {$ne: true}
        };
        if (providerObjId) {
            matchObj.providerId = providerObjId;
        }
        if (platformId) {
            matchObj.platformId = platformId;
        }

        let playerProm;

        if (playerName) {
            playerProm = dbconfig.collection_players.findOne({name: playerName}, {_id: 1}).lean();
        }
        else {
            playerProm = Promise.resolve('noData');
        }

        return playerProm.then(
            playerData => {
                if (playerData !== 'noData') {
                    if(playerData){
                        matchObj.playerId = playerData._id;
                    }
                    else {
                        return Promise.all([[], 0, []]);
                    }
                }

                var a = dbconfig.collection_playerConsumptionRecord.find(matchObj)
                    .populate({path: "playerId", model: dbconfig.collection_players})
                    .populate({path: "gameId", model: dbconfig.collection_game})
                    .populate({path: "platformId", model: dbconfig.collection_platform})
                    .populate({path: "providerId", model: dbconfig.collection_gameProvider})
                    .sort(sortCol).skip(index).limit(limit);

                var b = dbconfig.collection_playerConsumptionRecord.find(matchObj).count();
                var c = dbconfig.collection_playerConsumptionRecord.aggregate({
                        $match: matchObj
                    },
                    {
                        $group: {
                            _id: null,
                            validAmountAll: {$sum: "$validAmount"},
                            amountAll: {$sum: "$amount"},
                            bonusAmountAll: {$sum: "$bonusAmount"},
                            commissionAmountAll: {$sum: "$commissionAmount"},
                        }
                    });
                return Q.all([a, b, c]);
            }
        ).then(result => {
            return {data: result[0], count: result[1], summary: result[2] ? result[2][0] : {}}
        });
    },
    /**
     * Upsert without shardkey
     * This function can be run on the same record asynchronously.  It will avoid race conditions by using a queue.
     * @param {Object} query
     * @param {Object} updateData
     */
    upsert: function (query, updateData, processQueue) {
        // Upsert the document without queueing it, but retry if Mongo says there was a collision.
        // If we have defined a unique index on the collection, then Mongo will tell us if there is a collision, in which case we will retry.
        // (If we haven't defined a unique index, duplicate records may be created, which we don't want.)
        return attemptOperationWithRetries(
            () => dbconfig.collection_playerConsumptionSummary.findOneAndUpdate(query, updateData, {
                upsert: true,
                new: true
            })
        );

        // Use our own method to deal with new/existing case.
        // But again, if we don't have a unique index, it might conflict if it tries to create two identical records at the same time.
        // The code does not yet handle that case.
        //return realUpsert(query, updateData);

        // Add an upsert request to the queue, and trigger the queue to start running if it isn't already.
        // This is safe as long as we only upsert consumption records using this queue
        //return new Promise(function(resolve, reject){
        //    dbPlayerConsumptionRecord.consumptionRecordQueue.push( {query: query, updateData: updateData, resolve: resolve, reject: reject} );
        //    dbPlayerConsumptionRecord.processConsumptionRecordQueue();
        //});
    },

    /**
     * Process the consumption record queue
     */
    processConsumptionRecordQueue: function () {
        if (dbPlayerConsumptionRecord.consumptionRecordTimer) {
            return;
        }
        else {
            dbPlayerConsumptionRecord.consumptionRecordTimer = 1;
            processNext();
        }

        function processNext() {
            // The map should be empty at this point
            if (dbPlayerConsumptionRecord.consumptionRecordQueue.length > 0) {
                var proms = [];
                dbPlayerConsumptionRecord.consumptionRecordQueue = dbPlayerConsumptionRecord.consumptionRecordQueue.filter(
                    function (record, i) {
                        var key = keyForQuery(record.query);
                        // console.log("dbPlayerConsumptionRecord.consumptionRecordMap:", dbPlayerConsumptionRecord.consumptionRecordMap);
                        // console.log("key:", key);

                        if (dbPlayerConsumptionRecord.consumptionRecordMap[key]) {
                            // We cannot process this record right now, because one is already ongoing
                            // Keep this record for processing later
                            return true;
                        }
                        else {
                            dbPlayerConsumptionRecord.consumptionRecordMap[key] = true;
                            var prom = realUpsert(record.query, record.updateData).then(
                                function () {
                                    delete dbPlayerConsumptionRecord.consumptionRecordMap[key];
                                    record.resolve();
                                }
                            ).catch(
                                function (err) {
                                    // Tell the consumption record request why we could not complete
                                    record.reject(err);
                                    // (Optional) Also tell the queue runner that there was an error
                                    return Q.reject(err);
                                }
                            );
                            proms.push(prom);
                            // We can drop this record from the list
                            return false;
                        }
                    }
                );

                // console.log("Processing %s, with %s still queued.", proms.length, dbPlayerConsumptionRecord.consumptionRecordQueue.length);

                // Once all those promises are done, we can do another round
                // (This is still not really optimal: When key A is finished, it will wait for keys B and C to also finish, before starting another key A.
                // This could be improved, e.g. by having a separate queue, or processing task, for each key.)
                Q.all(proms).then(
                    function () {
                        dbPlayerConsumptionRecord.consumptionRecordTimer = setTimeout(processNext, 10);
                    },
                    function (err) {
                        errorUtils.reportError(err);
                        // Something went wrong.  We don't want to stop running the queue entirely.
                        // But we also don't want to retry to soon.  So we delay for 10 seconds.
                        // During a temporary problem (e.g. connection to mongo) this will not lose more consumption records by making them fail too.
                        // And it will reduce the amount of logs produced, if the problem is temporary or permanent.
                        dbPlayerConsumptionRecord.consumptionRecordTimer = setTimeout(processNext, 10 * 1000);
                    }
                ).done();
            }
            else {
                dbPlayerConsumptionRecord.consumptionRecordTimer = null;
            }
        }

        function keyForQuery(query) {
            return Object_entries(query).map(entry => entry.join(': ')).join(', ');
        }

        function Object_entries(obj) {
            return Object.keys(obj).map(prop => [prop, obj[prop]]);
        }
    },

    /**
     * Create player consumption record
     * @param {Json} data
     */
    createPlayerConsumptionRecord: function (data) {
        let isSameDay = dbUtility.isSameDaySG(data.createTime, Date.now());
        let deferred = Q.defer();
        let record = null;
        var newRecord = new dbconfig.collection_playerConsumptionRecord(data);
        newRecord.save().then(
            function (data) {
                record = data;
                if (record && !record.bDirty) {
                    //check player's reward task
                    return dbRewardTask.checkPlayerRewardTaskForConsumption(record);
                }
                else {
                    return true;
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating consumption record", error: error});
            }
        ).then(
            //check if player has double top up reward and if this consumption record is from double top up reward
            checkResult => {
                if (!checkResult) {
                    const rewardProposalProm = dbconfig.collection_proposalType.findOne(
                        {name: constProposalType.PLAYER_DOUBLE_TOP_UP_REWARD, platformId: record.platformId}
                    ).lean().then(
                        pType => {
                            return dbconfig.collection_proposal.find({
                                type: pType._id,
                                "data.playerObjId": record.playerId,
                                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                createTime: {$lt: record.createTime}
                            }).sort({createTime: -1}).limit(1).lean();
                        }
                    );
                    return rewardProposalProm.then(
                        data => {
                            if (data && data.length > 0) {
                                let rewardTime = new Date(data[0].createTime);
                                return dbconfig.collection_playerTopUpRecord.find({playerId: record.playerId, createTime: {$gte: rewardTime}}).sort({createTime: 1}).limit(1).lean().then(
                                    tRecord => {
                                        let topUpTime = new Date();
                                        if (tRecord && tRecord.length > 0) {
                                            topUpTime = new Date(tRecord[0].createTime);
                                        }
                                        const recordTime = new Date(record.createTime);
                                        if (topUpTime.getTime() > rewardTime.getTime() && recordTime.getTime() > rewardTime.getTime() && recordTime.getTime() < topUpTime.getTime()) {
                                            return true;
                                        }
                                        if (topUpTime.getTime() < rewardTime.getTime() && recordTime.getTime() > rewardTime.getTime()) {
                                            return true;
                                        }
                                        return checkResult;
                                    }
                                );


                            }
                            else {
                                return checkResult;
                            }
                        }
                    );
                }
                else {
                    return checkResult;
                }
            }
        ).then(
            function (bDirty) {
                if (!bDirty) {
                    //update consumption summary record
                    let recordDateNoon = new Date(moment(record.createTime).tz('Asia/Singapore').startOf('day').toDate().getTime() + 12*60*60*1000);
                    let summaryDay = recordDateNoon;
                    if( record.createTime.getTime() < recordDateNoon.getTime() ){
                        summaryDay = new Date(recordDateNoon.getTime() - 24*60*60*1000);
                    }
                    var query = {
                        playerId: record.playerId,
                        platformId: record.platformId,
                        gameType: record.gameType,
                        summaryDay: summaryDay,
                        bDirty: false
                    };
                    var updateData = {
                        $inc: {amount: record.amount, validAmount: record.validAmount}
                        //$push: {consumptionRecords: record._id}
                    };
                    return dbPlayerConsumptionRecord.upsert(query, updateData);
                }
                else {
                    return record;
                }
            },
            function (error){
                deferred.reject({name: "DBError", message: "Error checking player reward task", error: error});
            }
        ).then(
            function (data) {
                if (record) {
                    //update player consumption sum
                    var playerProm = dbconfig.collection_players.findOneAndUpdate(
                        {_id: record.playerId, platform: record.platformId},
                        {
                            $inc: {
                                consumptionSum: record.validAmount,
                                dailyConsumptionSum: isSameDay? record.validAmount:0,
                                weeklyConsumptionSum: record.validAmount,
                                pastMonthConsumptionSum: record.validAmount,
                                consumptionTimes: 1,
                                creditBalance: -record.validAmount
                            }
                        }
                    ).exec();
                    return playerProm;
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in creating player consumption", error: error});
            }
        ).then(
            function (data) {
                //ensure credit balance isn't less than 0
                if (record) {
                    var creditProm = dbconfig.collection_players.findOneAndUpdate(
                        {_id: record.playerId, platform: record.platformId, creditBalance: {$lt: 0}},
                        {creditBalance: 0}
                    ).exec();
                    var levelProm = dbPlayerInfo.checkPlayerLevelUp(record.playerId, record.platformId).then(
                        data => data,
                        error => console.error
                    );
                    return Q.all([creditProm, levelProm]);
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in updating player or consumption summary, or in checking reward task",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve(record);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in checking player level", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * TODO:: WORK IN PROGRESS
     * @param data
     */
    createPlayerConsumptionRecordForProviderGroup: function (data) {
        let isSameDay = dbUtility.isSameDaySG(data.createTime, Date.now());
        let record = null;
        let newRecord = new dbconfig.collection_playerConsumptionRecord(data);

        return newRecord.save().then(
            res => {
                record = res;

                if (record) {
                    // check player's on-going reward task group
                    return dbRewardTask.checkPlayerRewardTaskGroupForConsumption(record);
                }
                else {
                    return Q.reject({name: "DBError", message: "Error creating consumption record", error: error});
                }
            },
            error => {
                return Q.reject({name: "DBError", message: "Error creating consumption record", error: error});
            }
        ).then(
            checkRes => {
                if (checkRes && !checkRes.bDirty) {
                    // Update consumption summary record (XIMA purpose)
                    let recordDateNoon = new Date(moment(record.createTime).tz('Asia/Singapore').startOf('day').toDate().getTime() + 12 * 60 * 60 * 1000);
                    let summaryDay = recordDateNoon;
                    let consumptionAmount = record.validAmount ? record.validAmount : record.amount;

                    if (record.createTime.getTime() < recordDateNoon.getTime()) {
                        summaryDay = new Date(recordDateNoon.getTime() - 24 * 60 * 60 * 1000);
                    }
                    let query = {
                        playerId: record.playerId,
                        platformId: record.platformId,
                        gameType: record.gameType,
                        summaryDay: summaryDay,
                        bDirty: false
                    };
                    //
                    // // Handle left over amount from partial XIMA
                    // if (checkRes && checkRes.nonDirtyAmount > 0) {
                    //     consumptionAmount = checkRes.nonDirtyAmount;
                    // }

                    let updateData = {
                        $inc: {amount: consumptionAmount, validAmount: consumptionAmount}
                    };
                    return dbPlayerConsumptionRecord.upsert(query, updateData);
                }
            },
            error => {
                return Q.reject({name: "DBError", message: "Error checking player reward task group", error: error});
            }
        ).then(
            () => {
                // Update player consumption sum
                return dbconfig.collection_players.findOneAndUpdate(
                    {_id: record.playerId, platform: record.platformId},
                    {
                        $inc: {
                            consumptionSum: record.validAmount,
                            dailyConsumptionSum: isSameDay? record.validAmount:0,
                            weeklyConsumptionSum: record.validAmount,
                            pastMonthConsumptionSum: record.validAmount,
                            consumptionTimes: 1
                        }
                    }
                ).exec();
            },
            error => {
                return Q.reject({
                    name: "DBError",
                    message: "Error in upserting consumption summary record",
                    error: error
                });
            }
        ).then(
            () => {
                // Check auto player level up
                return dbPlayerInfo.checkPlayerLevelUp(record.playerId, record.platformId).then(
                    data => data,
                    error => console.error
                );
            },
            error => {
                return Q.reject({
                    name: "DBError",
                    message: "Error in updating player consumption sum",
                    error: error
                });
            }
        ).then(
            data => record,
            error => {
                return Q.reject({name: "DBError", message: "Error in checking player level", error: error});
            }
        );
    },

    addMissingConsumption: function (recordData, resolveError) {
        return dbconfig.collection_playerConsumptionRecord.findOne({orderNo: recordData.orderNo}).lean().then(
            record => {
                if (record) {
                    return Q.reject({
                        status: constServerCode.CONSUMPTION_ORDERNO_ERROR,
                        name: "DataError",
                        message: "orderNo exists"
                    });
                }
                else {
                    return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(recordData, resolveError);
                }
            }
        );
    },

    /**
     *  Create player consumption record
     * @param {Json} data
     * @param {Boolean} resolveError
     */
    createExternalPlayerConsumptionRecord: function (recordData, resolveError) {
        let verifiedData = null;
        let providerId = recordData.providerId;
        let isProviderGroup = false;

        return dbconfig.collection_platform.findOne({platformId: recordData.platformId}).then(
            platformData => {
                if (platformData) {
                    // Check useProviderGroup flag
                    isProviderGroup = Boolean(platformData.useProviderGroup);

                    var prom1 = dbconfig.collection_players.findOne({
                        name: recordData.userName,
                        platform: platformData._id
                    }).lean();
                    var prom2 = dbconfig.collection_game.findOne({gameId: recordData.gameId}).lean().then(
                        game => {
                            if (game) {
                                return game;
                            } else {
                                // try harder
                                if (recordData.code) {
                                    return dbconfig.collection_game.findOne({code: recordData.code}).lean().then(
                                        gameByCode => {
                                            if (gameByCode) {
                                                return gameByCode;
                                            }
                                            else {
                                                if (recordData.aliasCode) {
                                                    return dbconfig.collection_game.findOne({aliasCode: {$elemMatch: {$eq: recordData.aliasCode}}}).then(
                                                        gameByAliasCode => {
                                                            if (gameByAliasCode) {
                                                                return gameByAliasCode;
                                                            }
                                                        }
                                                    );
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    );
                    var prom3 = dbconfig.collection_gameProvider.findOne({providerId: recordData.providerId}).lean();

                    return Q.all([prom1, prom2, prom3]);
                }
                else {
                    return resolveError ? Q.resolve(null) : Q.reject({
                        name: "DataError",
                        message: "Can't find platform"
                    });
                }
            }
        ).then(
            data => {
                verifiedData = data;
                if (data && data[0] && data[1] && data[2]) {
                    // Verify the game exists in the requested plaform or the game is from the requested provider, if yes allow to create consumption
                    var prom_gamePlatform = dbconfig.collection_platformGameStatus.findOne({
                        $and: [
                            {game: verifiedData[1]._id}, {platform: verifiedData[0].platform}]
                    });
                    var prom_gameProvider = dbconfig.collection_game.findOne({
                        $and: [
                            {_id: verifiedData[1]._id}, {provider: verifiedData[2]._id}]
                    });
                    return Q.all([prom_gamePlatform, prom_gameProvider]);
                }
                else {
                    return true;
                }
            }
        ).then(
            platformGameData => {
                if (verifiedData && verifiedData[0] && verifiedData[1] && verifiedData[2] && platformGameData && (platformGameData[0] || platformGameData[1])) {
                    var data = verifiedData;
                    recordData.playerId = data[0]._id;
                    recordData.platformId = data[0].platform;
                    recordData.gameId = data[1]._id;
                    recordData.gameType = data[1].type;
                    recordData.providerId = data[2]._id;
                    delete recordData.name;

                    if (isProviderGroup) {
                        return dbPlayerConsumptionRecord.createPlayerConsumptionRecordForProviderGroup(recordData);
                    } else {
                        return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(recordData);
                    }
                } else {
                    const missingList = [];
                    if (verifiedData && !verifiedData[0]) {
                        missingList.push("userName");
                    }
                    if (verifiedData && !verifiedData[1]) {
                        missingList.push("gameId");
                    }
                    if (verifiedData && !verifiedData[2]) {
                        missingList.push("providerId");
                    }
                    return resolveError ? Q.resolve(null) : Q.reject({
                        name: "DataError",
                        message: "Could not find documents matching: " + missingList.join(', '),
                        data: recordData
                    });
                }
            }
        ).then(
            newRecord => {
                if (newRecord && newRecord.toObject) {
                    newRecord = newRecord.toObject();
                    newRecord.providerId = providerId;
                }
                return newRecord;
            }
        ).catch(
            function (error) {
                console.error("createExternalPlayerConsumptionRecord", error);
                return resolveError ? Q.resolve(null) : Q.reject(error);
            }
        );
    },

    updateConsumptionRecord: (recordData) => {
        return dbconfig.collection_playerConsumptionRecord.findOne({orderNo: recordData.orderNo}).lean().then(
            data => {
                if (data) {
                    return dbPlayerConsumptionRecord.updateExternalPlayerConsumptionRecordData(data, recordData);
                }
            }
        );
    },

    /**
     *  Update player consumption record
     * @param {Json} data
     * @param {Boolean} resolveError
     */
    updateExternalPlayerConsumptionRecord: function (recordData, resolveError) {
        return dbconfig.collection_playerConsumptionRecord.findOne({orderNo: recordData.orderNo}).lean().then(
            data => {
                if (data) {
                    if (data.bDirty) {
                        if (data.validAmount != recordData.validAmount) {
                            recordData.amount -= data.amount;
                            recordData.validAmount -= data.validAmount;
                            recordData.bonusAmount -= data.bonusAmount;
                            recordData.commissionAmount -= data.commissionAmount;
                            return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(recordData, resolveError);
                        }
                        else {
                            return dbPlayerConsumptionRecord.updateExternalPlayerConsumptionRecordData(data, recordData, resolveError);
                        }
                    }
                    else {
                        if (data.validAmount != recordData.validAmount) {
                            //var amountDiff = recordData.validAmount - data.validAmount;
                            return dbPlayerConsumptionRecord.updatePlayerConsumptionRecordAmount(data, recordData, resolveError);
                        }
                        else {
                            return dbPlayerConsumptionRecord.updateExternalPlayerConsumptionRecordData(data, recordData, resolveError);
                        }
                    }
                }
                else {
                    return dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(recordData, resolveError);
                }
            }
        ).catch(
            function (error) {
                console.error("updateExternalPlayerConsumptionRecord", error);
                return resolveError ? Q.resolve(null) : Q.reject({
                    name: "DBError",
                    message: "Error in updating player consumption record",
                    error: error
                });
            }
        );
    },

    updateExternalPlayerConsumptionRecordData: function (oldData, updateData, resolveError) {
        var recordData = Object.assign({}, updateData);
        return dbconfig.collection_platform.findOne({platformId: recordData.platformId}).then(
            platformData => {
                if (platformData) {
                    var prom1 = dbconfig.collection_players.findOne({
                        name: recordData.userName,
                        platform: platformData._id
                    });
                    var prom2 = dbconfig.collection_game.findOne({gameId: recordData.gameId});
                    var prom3 = dbconfig.collection_gameProvider.findOne({providerId: recordData.providerId});

                    return Q.all([prom1, prom2, prom3]);
                }
                else {
                    console.error("updateExternalPlayerConsumptionRecordData", "Can't find platform");
                    return resolveError ? Q.resolve(null) : Q.reject({
                        name: "DataError",
                        message: "Can't find platform",
                        data: updateData
                    });
                }
            }
        ).then(
            data => {
                if (data && data[0] && data[1] && data[2]) {
                    let providerId = recordData.providerId;
                    recordData.playerId = data[0]._id;
                    recordData.platformId = data[0].platform;
                    recordData.gameId = data[1]._id;
                    recordData.gameType = data[1].type;
                    recordData.providerId = data[2]._id;

                    delete recordData.name;
                    return dbconfig.collection_playerConsumptionRecord.findOneAndUpdate({
                        _id: oldData._id,
                        createTime: oldData.createTime
                    }, recordData, {new: true}).then(
                        newRecord => {
                            if(newRecord){
                                newRecord.providerId = providerId;
                            }
                            return newRecord;
                        }
                    );
                } else {
                    const missingList = [];
                    if (!data[0]) {
                        missingList.push("playerId");
                    }
                    if (!data[1]) {
                        missingList.push("gameId");
                    }
                    if (!data[2]) {
                        missingList.push("providerId");
                    }
                    console.error("updateExternalPlayerConsumptionRecordData", "Could not find documents matching");
                    return resolveError ? Q.resolve(null) : Q.reject({
                        name: "DataError",
                        message: "Could not find documents matching: " + missingList.join(', '),
                        data: updateData
                    });
                }
            }
        ).catch(
            function (error) {
                console.error("updateExternalPlayerConsumptionRecordData", error);
                return resolveError ? Q.resolve(null) : Q.reject({
                    name: "DBError",
                    message: "Error in updating player consumption record",
                    error: error,
                    data: updateData
                });
            }
        );
    },

    /**
     * update player consumption record amount
     * @param {json} oldData
     * @param {json} updateData
     */
    updatePlayerConsumptionRecordAmount: function (oldData, updateData, resolveError) {
        var amount = updateData.amount - oldData.amount;
        var validAmount = updateData.validAmount - oldData.validAmount;
        var record = null;
        return dbPlayerConsumptionRecord.updateExternalPlayerConsumptionRecordData(oldData, updateData, resolveError).then(
            data => {
                if (data) {
                    record = data;
                    //update consumption summary record
                    var query = {
                        playerId: data.playerId,
                        platformId: data.platformId,
                        gameType: data.gameType,
                        bDirty: false
                    };
                    var updateData = {
                        $inc: {amount: amount, validAmount: validAmount},
                        $push: {consumptionRecords: data._id}
                    };
                    return dbconfig.collection_playerConsumptionSummary.findOneAndUpdate(query, updateData, {
                        upsert: true,
                        new: true
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't update player consumption record"});
                }
            }
        ).then(
            data => {
                if (record) {
                    //update player consumption sum
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: record.playerId, platform: record.platformId},
                        {
                            $inc: {
                                consumptionSum: validAmount,
                                dailyConsumptionSum: validAmount,
                                weeklyConsumptionSum: validAmount,
                                pastMonthConsumptionSum: validAmount,
                                creditBalance: -validAmount
                            }
                        }
                    );
                }
            }
        ).then(
            data => {
                //ensure credit balance isn't less than 0
                var creditProm = dbconfig.collection_players.findOneAndUpdate(
                    {_id: record.playerId, platform: record.platformId, creditBalance: {$lt: 0}},
                    {creditBalance: 0}
                ).exec();
                var levelProm = dbPlayerInfo.checkPlayerLevelUp(record.playerId, record.platformId);
                return Q.all([creditProm, levelProm]);
            }
        );
    },

    /**
     * Send consumption list to settlement server for creation
     * @param {Array} list
     */
    sendExternalPlayerConsumptionListSettlement: function (data) {
        var balancer = new SettlementBalancer();
        return Q(balancer.initConns().then(function () {
            return balancer.request("player", "createExternalPlayerConsumptionList", data);
        }).then(
            data => data ? data.data : data
        )).finally(function () {
            setTimeout(balancer.close.bind(balancer), 5000);
            //balancer.close();
        });
    },

    /**
     * Send consumption list to settlement server for modification
     * @param {Array} list
     */
    sendExternalUpdatePlayerConsumptionListSettlement: function (data) {
        var balancer = new SettlementBalancer();
        return Q(balancer.initConns().then(function () {
            return balancer.request("player", "updateExternalPlayerConsumptionList", data);
        }).then(
            data => data ? data.data : data
        )).finally(function () {
            setTimeout(balancer.close.bind(balancer), 5000);
            //balancer.close();
        });
    },

    /**
     *  Create player consumption record list
     * @param {Array} list
     */
    createExternalPlayerConsumptionList: function (list) {
        var proms = [];
        for (let i = 0; i < list.length; i++) {
            proms.push(dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord(list[i], true));
        }
        return Q.all(proms).then(
            lists => {
                return lists;
            }
        );
    },

    /**
     *  update player consumption record list
     * @param {Array} list
     */
    updateExternalPlayerConsumptionList: function (list) {
        var proms = [];
        for (let i = 0; i < list.length; i++) {
            proms.push(dbPlayerConsumptionRecord.updateExternalPlayerConsumptionRecord(list[i], true));
        }
        return Q.all(proms).then(
            lists => {
                return lists;
            }
        );
    },

    getLastConsumptionsAPI: function (playerId, index, count) {
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            function (player) {
                return dbPlayerConsumptionRecord.getLastConsumptions(player._id, index, count);
            }
        ).catch(
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player ID", error: error});
            }
        );
    },

    /**
     * Get latest consumption records
     * @param {Number} count
     */
    getLastConsumptions: function (playerObjId, index, count) {
        var deferred = Q.defer();
        var prom1 = dbconfig.collection_playerConsumptionRecord.find({playerId: playerObjId}).skip(index).limit(count);
        var prom2 = dbconfig.collection_playerConsumptionRecord.find({playerId: playerObjId}).count();

        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0]) {
                    deferred.resolve({
                        stats: {
                            totalCount: data[1],
                            startIndex: index,
                        },
                        records: data[0]
                    });
                }
                else {
                    deferred.reject({name: "DataError", message: "No player consumptions found"});
                }
            }
        ).catch(
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player consumptions", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * search consumption record
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {objectId} providerId
     * @param {objectId} gameId
     */
    searchAPI: function (playerId, startTime, endTime, providerId, gameId, startIndex, count) {
        var deferred = Q.defer();
        var prom0 = dbconfig.collection_gameProvider.findOne({providerId: providerId});
        var prom1 = dbconfig.collection_game.findOne({gameId: gameId});
        var prom2 = dbconfig.collection_players.findOne({playerId: playerId});
        Q.all([prom0, prom1, prom2]).then(
            function (id) {
                var pid = id[0] ? id[0]._id : null;
                var gid = id[1] ? id[1]._id : null;
                var playerObjId = id[2] ? id[2]._id : null;
                return dbPlayerConsumptionRecord.search(startTime, endTime, playerObjId, pid, gid, startIndex, count);
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    var records = [];
                    for (var i = 0; i < data[0].length; i++) {
                        var record = Object.assign({}, data[0][i]);
                        record.totalAmount = record.validAmount + (record.bonusAmount || 0);
                        record.name = data[0][i].gameId.name;
                        delete record.gameId;
                        records.push(record);
                    }
                    var stats = data[1].length > 0 ?
                        {
                            totalCount: data[1][0].totalCount,
                            totalAmount: data[1][0].totalAmount,
                            totalValidAmount: data[1][0].totalValidAmount,
                            totalBonusAmount: data[1][0].totalBonusAmount,
                            startIndex: startIndex,
                            requestCount: count
                        } :
                        {
                            totalCount: 0,
                            totalAmount: 0,
                            totalValidAmount: 0,
                            totalBonusAmount: 0,
                            startIndex: startIndex,
                            requestCount: count
                        };
                    deferred.resolve(
                        {
                            stats: stats,
                            records: records
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "No consumption records found"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error searching consumption records", error: error});
            }
        ).catch(
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting ID", error: error});
            });
        return deferred.promise;
    },

    search: function (startTime, endTime, playerObjId, providerId, gameId, startIndex, count) {
        startIndex = startIndex || 0;
        startIndex = Number(startIndex);
        count = count || constSystemParam.MAX_RECORD_NUM;
        count = Number(count);
        startTime = startTime || new Date(0);
        endTime = endTime || new Date();
        var query = {
            $and: [
                {createTime: {$gte: new Date(startTime)}},
                {createTime: {$lt: new Date(endTime)}}
            ]
        };
        if (playerObjId) {
            query.playerId = playerObjId;
        }
        if (providerId) {
            query.providerId = providerId;
        }
        if (gameId) {
            query.gameId = gameId;
        }
        var recordsProm = dbconfig.collection_playerConsumptionRecord.find(query).lean().skip(startIndex).limit(count)
            .populate({
                path: "gameId",
                model: dbconfig.collection_game
            }).exec();

        var countProm = dbconfig.collection_playerConsumptionRecord.aggregate(
            {
                $match: query
            },
            {
                $group: {
                    _id: "$playerId",
                    totalCount: {$sum: 1},
                    totalAmount: {$sum: "$amount"},
                    totalValidAmount: {$sum: "$validAmount"},
                    totalBonusAmount: {$sum: "$bonusAmount"}
                }
            }
        ).exec();
        return Q.all([recordsProm, countProm]);
    },

    /**
     * Get top up record in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    getRecordForTimeFrame: function (startTime, endTime) {
        return dbconfig.collection_playerConsumptionRecord.find(
            {
                createTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).exec();
    },

    /**
     * Check record for ConsecutiveTopUpTask
     * @param {ObjectId} playerId - The date info
     * @param {ObjectId} platformId - The date info
     * @param {Date} startTime - The date info
     * @param {Number} spendingAmount - The date info
     * @param {Number} rewardAmount - The date info
     */
    checkRecordForConsecutiveTopUpTask: function (taskId, playerId, platformId, startTime, spendingAmount, rewardAmount) {
        var deferred = Q.defer();
        let rewardTask;

        dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: {
                        playerId: playerId,
                        platformId: platformId,
                        createTime: {
                            $gte: startTime
                        },
                        //usedType: {$exists: false},
                        bDirty: false
                    }
                },
                {
                    $group: {
                        _id: {playerId: "$playerId"},
                        amount: {$sum: "amount"},
                        validAmount: {$sum: "validAmount"}
                    }
                }
            ]
        ).allowDiskUse(true).exec().then(
            //check player's consumption amount after reward task was created and update reward task status accordingly
            function (data) {
                if (data && data.length == 1 && data[0].validAmount >= spendingAmount) {
                    return dbconfig.collection_rewardTask.findOneAndUpdate(
                        {_id: taskId},
                        {status: constRewardTaskStatus.ACHIEVED}
                    ).exec();
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding Consumption Record for ConsecutiveTopUp task.",
                    error: error
                });
            }
        ).then(
            //mark related record with reward type
            function (data) {
                if (data) {
                    rewardTask = data;
                    return dbconfig.collection_playerConsumptionRecord.find(
                        {
                            playerId: playerId,
                            platformId: platformId,
                            createTime: {
                                $gte: startTime
                            },
                            //usedType: {$exists: false},
                            bDirty: false
                            // TODO: This function needs updating
                        }
                    ).sort({createTime: 1}).exec();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Can't update player credit for ConsecutiveTopUp task."
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating player credit for ConsecutiveTopUp task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    var recordIds = [];
                    var curAmount = 0;
                    for (var i = 0; i < data.length; i++) {
                        recordIds.push(data[i]._id);
                        curAmount += data[i].amount;
                        if (curAmount >= spendingAmount) {
                            break;
                        }
                    }
                    return dbconfig.collection_playerConsumptionRecord.update(
                        {_id: {$in: recordIds}},
                        {
                            usedType: constRewardType.CONSECUTIVE_TOP_UP,
                            bDirty: true,
                            $push: {usedEvent: rewardTask.eventId},
                            usedTaskId: rewardTask._id
                        },
                        {multi: true}
                    ).exec();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Can't find player consumption record for ConsecutiveTopUp task."
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding player consumption record for ConsecutiveTopUp task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(true);
                }
                else {
                    deferred.reject({
                        name: "DBError",
                        message: "Error updating player consumption record for ConsecutiveTopUp task."
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating player consumption record for ConsecutiveTopUp task.",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     *  Add usedEvent to consumption record
     */
    assignConsumptionUsedEvent: function (platformObjId, playerObjId, eventObjId, spendingAmount, startTime, endTime, providers, usedProposal, rewardType) {
        // providers have to be an array
        let consumptionQuery = {
            platformId: platformObjId,
            playerId: playerObjId,
            bDirty: false
        };

        if (startTime) {
            consumptionQuery.createTime = {$gte: startTime};
            if (endTime) {
                consumptionQuery.createTime.$lte = endTime;
            }
        }

        if (providers && providers.length > 0) {
            consumptionQuery.providerId = {$in: providers};
        }

        let updateValue = {
            bDirty: true,
            $push: {usedEvent: eventObjId}
        };

        if (rewardType) {
            updateValue.usedType = rewardType;
        }

        if (usedProposal) {
            updateValue.usedProposal = usedProposal;
        }

        let recordIds = [];

        return dbconfig.collection_playerConsumptionRecord.find(consumptionQuery).lean().then(
            consumptionRecords => {
                let curAmount = 0;

                for (var i = 0; i < consumptionRecords.length; i++) {
                    let record = consumptionRecords[i];
                    recordIds.push(record._id);
                    curAmount += record.amount;
                    if (curAmount >= spendingAmount) {
                        break;
                    }
                }

                dbconfig.collection_playerConsumptionRecord.update(
                    {_id: {$in: recordIds}},
                    updateValue,
                    {multi: true}
                ).exec();

                return recordIds;
            }
        )
    },

    /**
     *  Add usedEvent to consumption record
     */
    unassignConsumptionUsedEvent: function (recordIds, eventObjId) {
        return dbconfig.collection_playerConsumptionRecord.update(
            {_id: {$in: recordIds}},
            {bDirty: false, $pull: {usedEvent: eventObjId}},
            {multi: true}
        ).exec();
    },

    unassignConsumptionUsedEventByProposalId: function (proposalId, eventObjId) {
        return dbconfig.collection_playerConsumptionRecord.update(
            {usedProposal: proposalId},
            {bDirty: false, $pull: {usedEvent: eventObjId}},
            {multi: true}
        ).exec();
    },


    /**
     * Check record for weekly ConsecutiveTopUpTask
     * @param {ObjectId} playerId - The date info
     * @param {ObjectId} platformId - The date info
     * @param {Date} startTime - The date info
     * @param {Number} spendingAmount - The date info
     * @param {Number} rewardAmount - The date info
     */
    checkRecordForFullAttendanceTask: function (taskId, playerId, platformId, startTime, spendingAmount, rewardAmount) {
        var deferred = Q.defer();
        let rewardTask;

        dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: {
                        playerId: playerId,
                        platformId: platformId,
                        createTime: {
                            $gte: startTime
                        },
                        //usedType: {$exists: false}
                        bDirty: false
                    }
                },
                {
                    $group: {
                        _id: {playerId: "$playerId"},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "validAmount"}
                    }
                }
            ]
        ).allowDiskUse(true).exec().then(
            //check player's consumption amount after reward task was created and update reward task status accordingly
            function (data) {
                if (data && data.length == 1 && data[0].validAmount >= spendingAmount) {
                    return dbconfig.collection_rewardTask.findOneAndUpdate(
                        {_id: taskId},
                        {status: constRewardTaskStatus.ACHIEVED}
                    ).exec();
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding Consumption Record for ConsecutiveTopUp task.",
                    error: error
                });
            }
        ).then(
            //mark related record with reward type
            function (data) {
                if (data) {
                    rewardTask = data;
                    return dbconfig.collection_playerConsumptionRecord.find(
                        {
                            playerId: playerId,
                            platformId: platformId,
                            createTime: {
                                $gte: startTime
                            },
                            //usedType: {$exists: false}
                            bDirty: false
                            // TODO: This function needs updating
                        }
                    ).sort({createTime: 1}).exec();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Can't update player credit for ConsecutiveTopUp task."
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating player credit for ConsecutiveTopUp task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    var recordIds = [];
                    var curAmount = 0;
                    for (var i = 0; i < data.length; i++) {
                        recordIds.push(data[i]._id);
                        curAmount += data[i].amount;
                        if (curAmount >= spendingAmount) {
                            break;
                        }
                    }
                    return dbconfig.collection_playerConsumptionRecord.update(
                        {_id: {$in: recordIds}},
                        {
                            usedType: constRewardType.FULL_ATTENDANCE,
                            bDirty: true,
                            $push: {usedEvent: rewardTask.eventId},
                            usedTaskId: rewardTask._id
                        },
                        {multi: true}
                    ).exec();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Can't find player consumption record for ConsecutiveTopUp task."
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding player consumption record for ConsecutiveTopUp task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(true);
                }
                else {
                    deferred.reject({
                        name: "DBError",
                        message: "Error updating player consumption record for ConsecutiveTopUp task."
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating player consumption record for ConsecutiveTopUp task.",
                    error: error
                });
            }
        );

        return deferred.promise;
    },


    /**
     * Get total consumption amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     * @param {ObjectId} playerId - The player id
     * @param {Boolean} includeDirty - If include dirty record
     */
    getPlayerTotalConsumptionForTimeFrame: function (startTime, endTime, playerId, platformId, includeDirty) {
        var matchObj = {
            platformId: platformId,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        };
        if (playerId) {
            matchObj.playerId = playerId;
        }
        if (!includeDirty) {
            matchObj.bDirty = false;
        }
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId"},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).cursor({batchSize: 5000}).allowDiskUse(true).exec().toArray();
    },

    /**
     * Get total consumption amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     * @param {ObjectId} playerId - The player id
     * @param {Boolean} includeDirty - If include dirty record
     */
    /*
     getPlayersTotalConsumptionForTimeFrame: function (startTime, endTime, playerIds, platformId, includeDirty) {
     var matchObj = {
     platformId: platformId,
     createTime: {
     $gte: startTime,
     $lt: endTime
     }
     };
     if(playerIds){
     matchObj.playerId = { $in: playerIds };
     }
     if( !includeDirty ){
     matchObj.bDirty = false;
     }
     return dbconfig.collection_playerConsumptionRecord.aggregate(
     [
     {
     $match: matchObj
     },
     {
     $group: {
     _id: {playerId: "$playerId", platformId: "$platformId"},
     amount: {$sum: "$amount"}
     }
     }
     ]
     ).cursor({batchSize: 5000}).allowDiskUse(true).exec().toArray();
     },
     */

    /**
     * Get total consumption amount in a certain period of time
     * This function aims to perform the functionality of both getPlayersTotalConsumptionForTimeFrame and getPlayersTotalGameTypeConsumptionForTimeFrame.
     * @param {Date} startTime,endTime - The date info
     * @param {[ObjectId]} playerIds - The player ids
     * @param {[ObjectId]} platformId - The platform id
     * @param {Boolean} includeDirty - If include dirty record
     * @param {String} extraGroup
     */
    getPlayersTotalConsumptionForTimeFrameWithGrouping: function (startTime, endTime, playerIds, platformId, includeDirty, extraGroup) {
        var matchObj = {
            platformId: platformId,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        };
        if (playerIds) {
            matchObj.playerId = {$in: playerIds};
        }
        if (!includeDirty) {
            matchObj.bDirty = false;
        }
        var groupingObj = {
            playerId: "$playerId", platformId: "$platformId"
        };
        if (extraGroup) {
            groupingObj[extraGroup] = "$" + extraGroup;
        }
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: groupingObj,
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).cursor({batchSize: 100}).allowDiskUse(true).exec().toArray();
    },

    /**
     * Get total game type consumption amount in a certain period of time for player
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {ObjectId} platformId
     * @param {ObjectId} playerObjId
     */
    getPlayerTotalGameTypeConsumptionForTimeFrame: function (startTime, endTime, playerObjId, platformObjId, includeDirty) {
        var matchObj = {
            platformId: platformObjId,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        };
        if (playerObjId) {
            matchObj.playerId = playerObjId;
        }
        if (!includeDirty) {
            matchObj.bDirty = false;
        }
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId", gameType: "$gameType"},
                        amount: {$sum: "$amount"},
                        validAmount: {$sum: "$validAmount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).cursor({batchSize: 5000}).allowDiskUse(true).exec().toArray();
    },

    getConsumptionTotalAmountForAllPlatform: function (startTime, endTime, platform) {
        let matchObj = {
            createTime: {$gte: startTime, $lt: endTime}
        };
        if (platform !== 'all') {
            matchObj.platformId = platform
        }
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: "$platformId",
                    totalAmount: {$sum: "$amount"}
                }
            }
        ).allowDiskUse(true).exec().then(
            function (data) {
                return dbconfig.collection_platform.populate(data, {path: '_id', model: dbconfig.collection_platform})
            }
        );
    },

    /**
     * Get total game type consumption amount in a certain period of time for all players, or one player
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {ObjectId} playerObjId
     * @param {ObjectId} platformId
     */
    /*
     markPlayerRecordDirtyForTimeFrame: function (startTime, endTime, playerObjId, platformObjId) {
     return this.markPlayersRecordsDirtyForTimeFrame(startTime, endTime, playerObjId && [playerObjId], platformObjId);
     },
     */

    /**
     * Get total game type consumption amount in a certain period of time for given players
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {[ObjectId]} playerObjIds
     * @param {ObjectId} platformId
     */
    /*
     markPlayersRecordsDirtyForTimeFrame: function (startTime, endTime, playerObjIds, platformObjId) {
     var query = {
     platformId: platformObjId,
     createTime: {
     $gte: startTime,
     $lt: endTime
     }
     };
     if(playerObjIds){
     query.playerId = {$in: playerObjIds};
     }
     return dbconfig.collection_playerConsumptionRecord.update(
     query,
     {bDirty: true},
     {multi: true}
     ).exec();
     },
     */

    // TODO: The below are not specific to consumption records, therefore they belong in a different file.

    streamDocumentsInTimeFrame: function streamDocumentsInTimeFrame(collection, dateField, startTime, endTime, match, group) {
        match[dateField] = {
            $gte: startTime,
            $lt: endTime
        };

        // collection.find(match).then(function (data) { console.log("I found %s documents while searching for", data.length, JSON.stringify(match)); });

        var query = collection.aggregate(
            [
                {$match: match},
                {$group: group}
            ]
        );

        return query.cursor({batchSize: 1000}).allowDiskUse(true).exec();
    },

    streamPlayerRecordsInTimeFrame: function streamPlayerRecordsInTimeFrame(collection, dateField, startTime, endTime, platformId) {
        return dbPlayerConsumptionRecord.streamDocumentsInTimeFrame(
            collection,
            dateField,
            startTime,
            endTime,
            // Match:
            {platformId: platformId},
            // Group:
            {_id: '$playerId'}
        );
    },

    streamPlayersWithConsumptionInTimeFrame: function streamPlayersWithConsumptionInTimeFrame(startTime, endTime, platformId) {
        return dbPlayerConsumptionRecord.streamPlayerRecordsInTimeFrame(dbconfig.collection_playerConsumptionRecord, 'createTime', startTime, endTime, platformId);
    },

    streamPlayersWithConsumptionDaySummaryInTimeFrame: function streamPlayersWithConsumptionDaySummaryInTimeFrame(startTime, endTime, platformId) {
        return dbPlayerConsumptionRecord.streamPlayerRecordsInTimeFrame(dbconfig.collection_playerConsumptionDaySummary, 'date', startTime, endTime, platformId);
    },

    // streamPlayersWithConsumptionWeekSummaryInTimeFrame: function streamPlayersWithConsumptionWeekSummaryInTimeFrame(startTime, endTime, platformId) {
    //     return dbPlayerConsumptionRecord.streamPlayerRecordsInTimeFrame(dbconfig.collection_playerConsumptionWeekSummary, 'date', startTime, endTime, platformId);
    // },

    streamPlayersWithTopUpInTimeFrame: function streamPlayersWithTopUpInTimeFrame(startTime, endTime, platformId) {
        return dbPlayerConsumptionRecord.streamPlayerRecordsInTimeFrame(dbconfig.collection_playerTopUpRecord, 'createTime', startTime, endTime, platformId);
    },

    streamPlayersWithTopUpDaySummaryInTimeFrame: function streamPlayersWithTopUpDaySummaryInTimeFrame(startTime, endTime, platformId) {
        return dbPlayerConsumptionRecord.streamPlayerRecordsInTimeFrame(dbconfig.collection_playerTopUpDaySummary, 'date', startTime, endTime, platformId);
    },

    // streamPlayersWithConsumptionSummaryInTimeFrame: function streamPlayersWithConsumptionSummaryInTimeFrame(startTime, endTime, platformId) {
    //     return dbPlayerConsumptionRecord.streamPlayerRecordsInTimeFrame(dbconfig.collection_playerConsumptionSummary, 'createTime', startTime, endTime, platformId);
    // }
    getConsumptionIntervalData: function (platform, days) {
        var seconds = days == 1 ? 24 * 3600 * 1000 : 2 * 24 * 3600 * 1000;
        var startDate = new Date(Date.now() - seconds);
        startDate.setMinutes(Math.floor(startDate.getMinutes() / 5) * 5, 0, 0, 0);
        var nowDate = new Date(startDate.getTime() + seconds);
        var timeArr = dataUtils.getTimeIntervalArr(startDate, nowDate, 5 * 60 * 1000);
        var proms = [];

        function getData(time0, time1, platform) {
            return dbPlayerConsumptionRecord.getConsumptionTotalAmountForAllPlatform(time0, time1, platform).then(data => {
                return {time0: time0, time1: time1, count: (data && data[0]) ? data[0].totalAmount : 0};
            })
        }

        timeArr.forEach(timeFrame => {
            proms.push(getData(timeFrame[0], timeFrame[1], platform));
        })
        return Q.all(proms)
    },
    getConsumptionIntervalByProvider: function (providers) {
        providers = providers || [];
        var proms = [];
        providers.forEach(provider => {
            proms.push(Q.resolve(dbPlayerConsumptionRecord.getConsumptionIntervalForProvider(provider)));
        });
        return Q.all(proms);
    },
    getConsumptionIntervalForProvider: function (providerId) {
        const duration = 2 * 3600 * 1000;
        var startDate = new Date(Date.now() - duration);
        startDate.setMinutes(Math.floor(startDate.getMinutes() / 5) * 5, 0, 0, 0);
        var nowDate = new Date(startDate.getTime() + duration);
        var timeArr = dataUtils.getTimeIntervalArr(startDate, nowDate, 5 * 60 * 1000);
        var proms = [];

        function getData(time0, time1, providerId) {
            return dbPlayerConsumptionRecord.getConsumptionTotalAmountForProvider(time0, time1, ObjectId(providerId)).then(data => {
                return {
                    time0: time0,
                    time1: time1,
                    count: (data && data[0]) ? data[0].totalAmount : 0
                };
            })
        }

        timeArr.forEach(timeFrame => {
            proms.push(getData(timeFrame[0], timeFrame[1], providerId));
        })
        return Q.all(proms).then(result => {
            return {
                providerId: providerId,
                data: result
            }
        })
    },
    getProviderLatestTimeRecord: function(providerId,platformObjId) {
        let platform;

        let gameProviderProm = dbconfig.collection_gameProvider.findOne({providerId: providerId}).lean();
        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

        return Promise.all([gameProviderProm, platformProm]).then(
            data => {
                let gameProviderData = data[0];
                platform = data[1];
                return dbconfig.collection_playerConsumptionRecord.findOne({providerId: gameProviderData._id}).sort({createTime: -1}).limit(1).lean();
            }
        ).then(
            lastestConsumptionRecord => {
                if (!lastestConsumptionRecord) return

                var currentDate = new Date();
                var latestCreateTime = new Date(lastestConsumptionRecord.createTime);
                var difference = currentDate - latestCreateTime ;
                var resultInMinutes = Math.round(difference / 60000);
                var recordStatus = {createTime: latestCreateTime, delayStatusColor:"rgb(255,255,255)" };

                if(platform){
                    let consumptionTimeConfig = platform.consumptionTimeConfig;
                    if(consumptionTimeConfig && consumptionTimeConfig.length > 0){
                        consumptionTimeConfig = consumptionTimeConfig.sort(function(configA, configB){
                            return configA.duration - configB.duration;
                        });

                        for(let i =0; i < consumptionTimeConfig.length; i ++) {
                            recordStatus.delayStatusColor = consumptionTimeConfig[i].color;
                            if (resultInMinutes <= consumptionTimeConfig[i].duration) break;
                        }
                    }
                }

                return recordStatus;
            }
        );
    },
    getConsumptionTotalAmountForProvider: function (startTime, endTime, providerId) {
        const matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
            providerId: providerId
        };
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            {$match: matchObj},
            {
                $group: {
                    _id: null,
                    totalAmount: {$sum: "$amount"}
                }
            }
        );
    },

    winRateReport: function (startTime, endTime, providerId, platformId) {
        const matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
            platformId: ObjectId(platformId)
        };

        if (providerId && providerId !== 'all') {
            matchObj.providerId = ObjectId(providerId);
        }

        let participantsProm = dbconfig.collection_playerConsumptionRecord.distinct('playerId', matchObj);

        let consumptionTimesProm = dbconfig.collection_playerConsumptionRecord.find(matchObj).count();

        let totalAmountProm = dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: matchObj
            },
            {
                $group: {
                    _id:null,
                    total_amount: {$sum: "$amount"},
                    validAmount: {$sum: "$validAmount"},
                    bonusAmount: {$sum: "$bonusAmount"}
                }
            }
        ]);

        return Promise.all([participantsProm, consumptionTimesProm, totalAmountProm]).then(
            data => {
                let participantNumber = 0;
                let consumptionTimes = 0;
                let totalAmount = 0;
                let validAmount = 0;
                let bonusAmount = 0;
                if (data && data[0] && data[1] && data[2]) {
                    participantNumber = data[0].length;
                    consumptionTimes = data[1];
                    totalAmount = data[2][0].total_amount;
                    validAmount = data[2][0].validAmount;
                    bonusAmount = data[2][0].bonusAmount;
                }

                let returnData = {
                    participantNumber: participantNumber,
                    consumptionTimes: consumptionTimes,
                    totalAmount: totalAmount,
                    validAmount: validAmount,
                    bonusAmount: bonusAmount
                };

                return returnData;
            }
        );

    },

    markDuplicatedConsumptionRecords: dupsSummaries => {
        if (dupsSummaries.length > 0) {
            let markDupsProm = [];

            dupsSummaries.map(
                dupsSummary => {
                    // mark duplicates consumption records
                    let dupsToMark = Number(dupsSummary.count) - 1;
                    let markDups = {isDuplicate: true};

                    for (let i = 0; i < dupsToMark; i++) {
                        markDupsProm.push(dbUtility.findOneAndUpdateForShard(
                            dbconfig.collection_playerConsumptionRecord,
                            {
                                _id: dupsSummary.uniqueIds[i]
                            },
                            markDups,
                            constShardKeys.collection_playerConsumptionRecord
                        ));
                    }
                }
            );

            return Q.all(markDupsProm);
        }
        else {
            // No duplicate found
            return Q.resolve();
        }
    }

};

// module.exports = dbPlayerConsumptionRecord;
var proto = dbPlayerConsumptionRecordFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionRecord);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionRecord;