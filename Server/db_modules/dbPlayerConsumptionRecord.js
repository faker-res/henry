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
const dbRewardPoints = require('../db_modules/dbRewardPoints');
const constShardKeys = require('../const/constShardKeys');
const constSystemParam = require('../const/constSystemParam');
const SettlementBalancer = require('../settlementModule/settlementBalancer');
const promiseUtils = require("../modules/promiseUtils.js");
const constServerCode = require('../const/constServerCode');
const dataUtils = require("../modules/dataUtils.js");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const constProposalType = require('./../const/constProposalType');
const constProposalStatus = require('./../const/constProposalStatus');
const errorUtils = require('./../modules/errorUtils');
const constGameStatus = require('../const/constGameStatus');
let dbUtility = require('./../modules/dbutility');

let dbGameProvider = require('../db_modules/dbGameProvider');
let dbPlayerReward = require('../db_modules/dbPlayerReward');
let dbRewardTaskGroup = require('../db_modules/dbRewardTaskGroup');
let dbPlatform = require("../db_modules/dbPlatform.js");
const dbPlayerConsumptionHourSummary = require("../db_modules/dbPlayerConsumptionHourSummary");
const dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');

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

        var a = dbconfig.collection_playerConsumptionRecord.find(matchObj).read("secondaryPreferred")
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
    getConsumptionRecordByGameProvider: function (data, platformId, providerObjId, playerName, index, limit, sortCol, showSumOnly) {
        var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
        var endTime = data.endTime ? new Date(data.endTime) : new Date();
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1};

        let gameSearch;
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
        if(platformId instanceof Array){
            matchObj.platformId = {$in: platformId.map(p => ObjectId(p))};
        }else {
            matchObj.platformId = platformId;
        }

        if (data.cpGameType) {
            gameSearch = dbconfig.collection_game.find({name: new RegExp('.*' + data.cpGameType + '.*', 'i')}, {_id:1}).lean();
        } else {
            gameSearch = false;
        }

        let playerProm;

        if (playerName) {
            let playerQuery = {
                name: playerName
            };

            if(platformId instanceof Array){
                playerQuery.platform = {$in: platformId};
            }else {
                playerQuery.platform = platformId;
            }
            playerProm = dbconfig.collection_players.find(playerQuery, {_id: 1}).lean();
        }
        else {
            playerProm = Promise.resolve('noData');
        }

        return Promise.all([playerProm, gameSearch]).then(
            resData => {

                if (resData){

                    let playerData = resData[0];
                    let gameDataId = resData[1];

                    if (playerData !== 'noData') {
                        if (playerData && playerData.length) {
                            matchObj.playerId = {$in: playerData.map(p => p._id)};
                        }
                        else {
                            return Promise.all([[], 0, []]);
                        }
                    }

                    if (gameDataId){
                        if(gameDataId.length == 0 && data.roundNoOrPlayNo) {
                            matchObj.cpGameType = new RegExp('.*' + data.cpGameType + '.*', 'i');
                            matchObj.$or = [{roundNo: data.roundNoOrPlayNo}, {playNo: data.roundNoOrPlayNo}];
                        }
                        else if(gameDataId.length > 0 && data.roundNoOrPlayNo){
                            matchObj.$and = [{$or: [ {cpGameType: new RegExp('.*' + data.cpGameType + '.*', 'i')}, {gameId: {$in: gameDataId} }]},
                                                {$or: [{roundNo: data.roundNoOrPlayNo}, {playNo: data.roundNoOrPlayNo}]}];
                        }
                        else if(gameDataId.length > 0 && !data.roundNoOrPlayNo) {
                            matchObj.$or = [{cpGameType: new RegExp('.*' + data.cpGameType + '.*', 'i')}, {gameId: {$in: gameDataId}}]
                        }
                        else if(gameDataId.length == 0 && !data.roundNoOrPlayNo) {
                            matchObj.cpGameType = new RegExp('.*' + data.cpGameType + '.*', 'i');
                        }
                        else{

                        }
                    }
                    else{
                        if(data.roundNoOrPlayNo){
                            matchObj.$or = [{roundNo: data.roundNoOrPlayNo}, {playNo: data.roundNoOrPlayNo}];
                        }
                    }
                    if(showSumOnly){
                        // if only want to show the sum of consumption result
                        var a = [];
                    }else{
                        var a = dbconfig.collection_playerConsumptionRecord.find(matchObj)
                            .populate({path: "playerId", model: dbconfig.collection_players})
                            .populate({path: "gameId", model: dbconfig.collection_game})
                            .populate({path: "platformId", model: dbconfig.collection_platform})
                            .populate({path: "providerId", model: dbconfig.collection_gameProvider})
                            .sort(sortCol).skip(index).limit(limit);
                    }
                    var b = dbconfig.collection_playerConsumptionRecord.find(matchObj).count();
                    var c = dbconfig.collection_playerConsumptionRecord.aggregate({
                            $match: matchObj
                        },
                        {
                            $group: {
                                _id: null,
                                validAmount: {$sum: "$validAmount"},
                                bonusAmount: {$sum: "$bonusAmount"},
                                amount: {$sum: "$amount"},
                            }
                        });
                    return Q.all([a, b, c]);
                }
                else{
                    return [[], 0, []];
                }
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
        let referralRecord;
        var newRecord = new dbconfig.collection_playerConsumptionRecord(data);
        newRecord.save().then(
            function (data) {
                record = data;
                if (record) {
                    //update player consumption sum
                    dbPlayerConsumptionHourSummary.updateSummary(record.platformId, record.playerId, record.providerId, record.createTime, record.amount, record.validAmount, record.bonusAmount, 1, record.loginDevice).catch(err => {
                        console.error('update hour summary failed', err);
                    });
                    var playerProm = dbconfig.collection_players.findOneAndUpdate(
                        {_id: record.playerId, platform: record.platformId},
                        {
                            $inc: {
                                consumptionSum: record.validAmount,
                                dailyConsumptionSum: isSameDay ? record.validAmount : 0,
                                weeklyConsumptionSum: record.validAmount,
                                pastMonthConsumptionSum: record.validAmount,
                                consumptionTimes: 1,
                                bonusAmountSum: record.bonusAmount,
                                dailyBonusAmountSum: record.bonusAmount,
                                weeklyBonusAmountSum: record.bonusAmount,
                                pastMonthBonusAmountSum: record.bonusAmount,
                                creditBalance: -record.validAmount
                            },
                        }
                    ).exec();
                    return playerProm;
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating consumption record", error: error});
            }
        ).then(
            function (data) {
                //ensure credit balance isn't less than 0
                if (record) {
                    var creditProm = dbconfig.collection_players.findOneAndUpdate(
                        {_id: record.playerId, platform: record.platformId, creditBalance: {$lt: 0}},
                        {creditBalance: 0},
                        {new: true}
                    ).lean().exec();
                    var levelProm = dbPlayerInfo.checkPlayerLevelUp(record.playerId, record.platformId).catch(errorUtils.reportError);
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
            () => {
                if (record && !record.bDirty) {
                    //check player's reward task
                    return dbRewardTask.checkPlayerRewardTaskForConsumption(record);
                }
                else {
                    return true;
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error in checking player level", error: error});
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
                                return dbconfig.collection_playerTopUpRecord.find({
                                    playerId: record.playerId,
                                    createTime: {$gte: rewardTime}
                                }).sort({createTime: 1}).limit(1).lean().then(
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
                    let recordDateNoon = new Date(moment(record.createTime).tz('Asia/Singapore').startOf('day').toDate().getTime() + 12 * 60 * 60 * 1000);
                    let summaryDay = recordDateNoon;
                    if (record.createTime.getTime() < recordDateNoon.getTime()) {
                        summaryDay = new Date(recordDateNoon.getTime() - 24 * 60 * 60 * 1000);
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
            function (error) {
                deferred.reject({name: "DBError", message: "Error checking player reward task", error: error});
            }
        ).then(
            function (data) {
                if (record.playerId) {
                    return dbconfig.collection_players.findOne({_id: record.playerId}).populate({path: "referral", model: dbconfig.collection_players}).lean().then(
                        playerData => {
                            if (playerData && playerData.referral) {
                                referralRecord = playerData.referral
                            }

                            return data;
                        }
                    );
                }

                return data;
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error getting player", error: error});
            }
        ).then(
            function (data) {
                if (data[0]) {
                    dbPlayerReward.checkAvailableRewardGroupTaskToApply(data[0].platform, data[0], {}).catch(errorUtils.reportError);
                }
                if (referralRecord) {
                    dbPlayerReward.checkAvailableReferralRewardGroupTaskToApply(record.platformId, referralRecord, '1').catch(errorUtils.reportError);
                }
                if (record) {
                    dbRewardPoints.updateGameRewardPointProgress(record).catch(errorUtils.reportError);
                }
                deferred.resolve(record);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in creating player consumption", error: error});
            }
        );

        return deferred.promise;
    },



    /**
     * @param data
     * @param platformObj
     */
    createPlayerConsumptionRecordForProviderGroup: (data, platformObj) => {
        let isSameDay = dbUtility.isSameDaySG(data.createTime, Date.now());
        let record = null;
        let newRecord = new dbconfig.collection_playerConsumptionRecord(data);
        let playerData;
        let referralRecord;

        return newRecord.save().then(
            res => {
                record = res;

                if (record) {
                    // Update player consumption sum
                    dbPlayerConsumptionHourSummary.updateSummary(record.platformId, record.playerId, record.providerId, record.createTime, record.amount, record.validAmount, record.bonusAmount, 1, record.loginDevice).catch(err => {
                        console.error('update hour summary failed', err);
                    });
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: record.playerId, platform: record.platformId},
                        {
                            $inc: {
                                consumptionSum: record.validAmount,
                                dailyConsumptionSum: isSameDay ? record.validAmount : 0,
                                weeklyConsumptionSum: record.validAmount,
                                pastMonthConsumptionSum: record.validAmount,
                                bonusAmountSum: record.bonusAmount,
                                dailyBonusAmountSum: record.bonusAmount,
                                weeklyBonusAmountSum: record.bonusAmount,
                                pastMonthBonusAmountSum: record.bonusAmount,
                                consumptionTimes: 1
                            }
                        },
                        {new: true}
                    ).exec();
                }
                else {
                    return Promise.reject({name: "DBError", message: "Error creating consumption record", error: error});
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error creating consumption record", error: error});
            }
        ).then(
            (playerUpdatedData) => {
                playerData = playerUpdatedData;
                // Check auto player level up
                dbPlayerInfo.checkPlayerLevelUp(record.playerId, record.platformId).catch(errorUtils.reportError);
                return dbRewardTask.checkPlayerRewardTaskGroupForConsumption(record, platformObj);
            },
            error => {
                return Q.reject({
                    name: "DBError",
                    message: "Error in updating player consumption sum",
                    error: error
                });
            }
        ).then(
            returnableAmt => {
                let readyXIMAAmt = returnableAmt ? returnableAmt : 0;
                let nonXIMAAmt = record.validAmount - readyXIMAAmt;

                return updateConsumptionSumamry(record, readyXIMAAmt, nonXIMAAmt);
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error checking player reward task group", error: error});
            }
        ).then(
            () => {
                return dbconfig.collection_players.findOne({_id: record.playerId}).populate({path: "referral", model: dbconfig.collection_players}).lean().then(
                    player => {
                        if (player && player.referral) {
                            referralRecord = player.referral;
                        }

                        return player;
                    }
                );
            }
        ).then(
            () => {
                if (playerData) {
                    dbPlayerReward.checkAvailableRewardGroupTaskToApply(playerData.platform, playerData, {}).catch(errorUtils.reportError);
                    // check for the consumptionSlip rewardEvent
                    dbPlayerReward.checkConsumptionSlipRewardGroup(playerData, record).catch(errorUtils.reportError);
                }
                if (referralRecord) {
                    dbPlayerReward.checkAvailableReferralRewardGroupTaskToApply(record.platformId, referralRecord, '1').catch(errorUtils.reportError);
                }
                if (record) {
                    dbRewardPoints.updateGameRewardPointProgress(record).catch(errorUtils.reportError);
                }
                return record
            },
            error => {
                return Promise.reject({
                    name: "DBError",
                    message: "Error in upserting consumption summary record",
                    error: error
                });
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
                        message: "orderNo exists",
                        data: recordData
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
     * @param recordData
     * @param {Boolean} resolveError
     */
    createExternalPlayerConsumptionRecord: function (recordData, resolveError) {
        let verifiedData = null;
        let providerId = recordData.providerId;
        let providerName;
        let isProviderGroup = false;
        let platformObj;

        return dbconfig.collection_platform.findOne({platformId: recordData.platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;

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
                    return resolveError ? Q.resolve(false) : Q.reject({
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
                    recordData.loginDevice = data[0].loginDevice;
                    recordData.platformId = data[0].platform;
                    recordData.gameId = data[1]._id;
                    recordData.gameType = data[1].type;
                    recordData.providerId = data[2]._id;
                    providerName = data[2].name;
                    recordData.winRatio = 0;
                    if(recordData.bonusAmount && recordData.validAmount){
                        recordData.winRatio = recordData.bonusAmount / recordData.validAmount;
                    }
                    delete recordData.name;

                    if (recordData.LIST) {
                        recordData.betDetails = recordData.LIST;
                        delete recordData.LIST;
                    }

                    if (isProviderGroup) {
                        return dbPlayerConsumptionRecord.createPlayerConsumptionRecordForProviderGroup(recordData, platformObj);
                    } else {
                        return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(recordData);
                    }
                } else {
                    const missingList = [];
                    let code = constServerCode.COMMON_ERROR;
                    if (verifiedData && !verifiedData[0]) {
                        code = constServerCode.NO_USER_FOUND;
                        missingList.push("userName");
                    }
                    if (verifiedData && !verifiedData[1]) {
                        missingList.push("gameId");
                    }
                    if (verifiedData && !verifiedData[2]) {
                        missingList.push("providerId");
                    }
                    return resolveError ? Q.resolve(false) : Q.reject({
                        code: code,
                        name: "DataError",
                        message: "Could not find documents matching: " + missingList.join(', '),
                        data: recordData
                    });
                }
            }
        ).then(
            newRecord => {
                let providerObjId;
                if (newRecord && newRecord.toObject) {
                    newRecord = newRecord.toObject();
                    providerObjId = newRecord.providerId;
                    newRecord.providerId = providerId;
                    createBaccaratConsumption(providerObjId, providerName, newRecord);
                }

                return newRecord;
            }
        ).catch(
            function (error) {
                console.error("createExternalPlayerConsumptionRecord", error);
                return resolveError ? Q.resolve(false) : Q.reject(error);
            }
        );
    },

    /**
     *  Update player consumption record
     * @param {Json} data
     * @param {Boolean} resolveError
     */
    updateExternalPlayerConsumptionRecord: function (recordData, resolveError) {
        let createTime = dbUtility.getNDaysAgoFromSpecificStartTime(new Date(), 7); // record must not older than 7 days
        return dbconfig.collection_playerConsumptionRecord.findOne({orderNo: recordData.orderNo, createTime: {$gte: createTime}}).lean().then(
            data => {
                if (data) {
                    if (data.validAmount != recordData.validAmount) {
                      //var amountDiff = recordData.validAmount - data.validAmount;
                      return dbPlayerConsumptionRecord.updatePlayerConsumptionRecordAmount(data, recordData, resolveError);
                    }
                    else {
                      return dbPlayerConsumptionRecord.updateExternalPlayerConsumptionRecordData(data, recordData, resolveError);
                    }
                } else {
                    let code = constServerCode.CONSUMPTION_ORDERNO_NOT_FOUND;
                    return resolveError ? Q.resolve(false) : Q.reject({
                        code: code,
                        name: "DataError",
                        message: "Consumption update not found: ",
                        data: recordData
                    });
                }
            }
        ).catch(
            function (error) {
                console.error("updateExternalPlayerConsumptionRecord", error);
                return resolveError ? Q.resolve(false) : Q.reject({
                    code: error.code,
                    name: "DBError",
                    message: "Error in updating player consumption record",
                    error: error
                });
            }
        );
    },

    updateExternalPlayerConsumptionRecordData: function (oldData, updateData, resolveError) {
        let providerName;
        let recordData = Object.assign({}, updateData);
        let amount = updateData.amount - oldData.amount;
        let validAmount = updateData.validAmount - oldData.validAmount;
        let bonusAmount = updateData.bonusAmount - oldData.bonusAmount;
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
                    return resolveError ? Q.resolve(false) : Q.reject({
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
                    providerName = data[2].name;
                    recordData.updateTime = new Date();
                    if(recordData.bonusAmount && recordData.validAmount){
                        recordData.winRatio = recordData.bonusAmount / recordData.validAmount;
                    }

                    let consumptionRecordQuery = {
                        _id: oldData._id,
                        createTime: oldData.createTime,
                        updateTime: oldData.updateTime ? new Date(oldData.updateTime) : {$exists: false}
                    };

                    delete recordData.name;

                    if (recordData.LIST) {
                        recordData.betDetails = recordData.LIST;
                        delete recordData.LIST;
                    }
                    return dbconfig.collection_playerConsumptionRecord.findOneAndUpdate(consumptionRecordQuery, recordData, {new: true}).then(
                        newRecord => {
                            if (newRecord && newRecord.toObject) {
                                newRecord = newRecord.toObject();
                                let providerObjId = newRecord.providerId;
                                newRecord.providerId = providerId;
                                createBaccaratConsumption(providerObjId, providerName, newRecord, oldData._id);
                                // update RTG only if consumption record is updated
                                findRTGToUpdate(oldData, recordData);
                                dbPlayerConsumptionHourSummary.updateSummary(newRecord.platformId, newRecord.playerId, newRecord.providerId, newRecord.createTime, amount, validAmount, bonusAmount, 0, newRecord.loginDevice).catch(err => {
                                    console.error('update hour summary failed', err);
                                });
                            }else{
                                let code = constServerCode.CONSUMPTION_UPDATE_NOT_SUCCESS;
                                return resolveError ? Q.resolve(false) : Q.reject({
                                    code: code,
                                    name: "DataError",
                                    message: "Consumption update not success: ",
                                    data: updateData
                                });
                            }
                            return newRecord;
                        }
                    );
                } else {
                    const missingList = [];
                    let code = constServerCode.COMMON_ERROR;
                    if (!data[0]) {
                        code = constServerCode.NO_USER_FOUND;
                        missingList.push("playerId");
                    }
                    if (!data[1]) {
                        missingList.push("gameId");
                    }
                    if (!data[2]) {
                        missingList.push("providerId");
                    }
                    console.error("updateExternalPlayerConsumptionRecordData", "Could not find documents matching");
                    return resolveError ? Q.resolve(false) : Q.reject({
                        code: code,
                        name: "DataError",
                        message: "Could not find documents matching: " + missingList.join(', '),
                        data: updateData
                    });
                }
            }
        ).catch(
            function (error) {
                console.error("updateExternalPlayerConsumptionRecordData", error);
                return resolveError ? Q.resolve(false) : Q.reject({
                    code: error.code,
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
                        },
                        {
                            new: true
                        }
                    );
                }
            }
        ).then(
            data => {
                if (data && data.dailyConsumptionSum && data.weeklyConsumptionSum && data.pastMonthConsumptionSum && data.name) {
                    // debug log for consumption sum
                    console.log("updateDataId: ", updateData && updateData._id, "|| player:", data.name, "|| dailyConsumptionSum:", data.dailyConsumptionSum, "|| weeklyConsumptionSum:", data.weeklyConsumptionSum, "|| pastMonthConsumptionSum", data.pastMonthConsumptionSum);
                }
                //ensure credit balance isn't less than 0
                var creditProm = dbconfig.collection_players.findOneAndUpdate(
                    {_id: record.playerId, platform: record.platformId, creditBalance: {$lt: 0}},
                    {creditBalance: 0}
                ).exec();
                var levelProm = dbPlayerInfo.checkPlayerLevelUp(record.playerId, record.platformId);
                return Q.all([creditProm, levelProm]);
            }
        ).then(() => record);
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

    searchPlatformConsumption: function(platformId, startTime, endTime, startIndex, requestCount, minBonusAmount, minAmount, minValidAmount, isRanking){
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if( platformData ){
                    let sortObj = {createTime: 1};
                    let queryObj = {
                        platformId: platformData._id,
                        createTime: {$gte: startTime, $lt: endTime},
                        bonusAmount: {$gte: minBonusAmount}
                    };
                    if(minAmount != null){
                        queryObj.amount = {$gte: minAmount};
                    }
                    if(minValidAmount != null){
                        queryObj.validAmount = {$gte: minValidAmount};
                    }

                    if (isRanking && (isRanking === true || isRanking === "true")) {
                        queryObj = {
                            platformId: platformData._id,
                            createTime: {$gte: startTime, $lt: endTime}
                        };

                        sortObj = {winRatio: -1};
                    }

                    return dbconfig.collection_playerConsumptionRecord.find(queryObj).sort(sortObj).skip(startIndex).limit(Number(requestCount)).lean().populate({
                        path: "gameId",
                        model: dbconfig.collection_game
                    }).populate({
                        path: "providerId",
                        model: dbconfig.collection_gameProvider
                    }).populate({
                        path: "playerId",
                        model: dbconfig.collection_players
                    });
                }
            }
        ).then(
            recordData => {
                let playerBonusListArray = [];
                if(recordData && recordData.length > 0){
                    recordData.forEach(
                        record => {
                            record.providerId = record.providerId.providerId;
                            record.playerName = dbUtility.encodePlayerName(record.playerId.name);
                            let playerBonusListObj = {};
                            playerBonusListObj.playerName = record.playerName;
                            playerBonusListObj.bonusAmount = record.bonusAmount;
                            playerBonusListObj.providerId = record.providerId || "";
                            playerBonusListObj.cpGameType = record.cpGameType || "";
                            playerBonusListObj.winRatio = record.winRatio || record.bonusAmount / record.validAmount || 0;

                            if (!playerBonusListArray.some(el => el.playerName === record.playerName) && playerBonusListArray.length < 10) {
                                playerBonusListArray.push(playerBonusListObj);
                            }

                            delete record.playerId;
                        }
                    );
                }

                if (isRanking && (isRanking === true || isRanking === "true")) {
                    return playerBonusListArray;
                } else {
                    return recordData;
                }
            }
        );
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
        var prom3 = dbconfig.collection_platform.find({}, { _id: 1, platformId: 1, name: 1}).lean();
        let platformList;
        let provider;
        Q.all([prom0, prom1, prom2, prom3]).then(
            function (id) {
                var pid = id[0] ? id[0]._id : null;
                var gid = id[1] ? id[1]._id : null;
                var playerObjId = id[2] ? id[2]._id : null;
                platformList = id[3] ? id[3] : null;
                provider = id[0] ? id[0] : null;
                return dbPlayerConsumptionRecord.search(startTime, endTime, playerObjId, pid, gid, startIndex, count);
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    var records = [];
                    for (var i = 0; i < data[0].length; i++) {
                        var record = Object.assign({}, data[0][i]);
                        record.totalAmount = record.validAmount + (record.bonusAmount || 0);
                        record.name = dbPlayerConsumptionRecord.findGameName(platformList, record);
                        delete record.gameId;
                        records.push(record);
                    }
                    let option1 = {};

                    if (data[1].length > 0) {
                        option1 = {
                            totalCount: data[1][0].totalCount,
                            totalAmount: data[1][0].totalAmount,
                            totalValidAmount: data[1][0].totalValidAmount,
                            totalBonusAmount: data[1][0].totalBonusAmount,
                            startIndex: startIndex,
                            requestCount: count
                        };
                    }

                    let option2 = {
                        totalCount: 0,
                        totalAmount: 0,
                        totalValidAmount: 0,
                        totalBonusAmount: 0,
                        startIndex: startIndex,
                        requestCount: count
                    };

                    if (providerId) {
                        option1.name = ( provider && provider.name ) ? provider.name : '';
                        option1.chName = ( provider && provider.chName ) ? provider.chName : '';
                        option2.name = ( provider && provider.name ) ? provider.name : '';
                        option2.chName = ( provider && provider.chName ) ? provider.chName : '';
                    }
                    var stats = data[1].length > 0 ? option1 : option2;

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
    findGameName: function(platformList, gameData){
        let gameName = '';
        let platform = platformList.filter(item=> { return item._id.equals(gameData.platformId) });
        let platformNo = (platform && platform[0] && platform[0].platformId ) ? platform[0].platformId : 0;
        if( gameData.gameId && gameData.gameId.changedName && gameData.gameId.changedName[platformNo] ) {
            gameName = gameData.gameId.changedName[platformNo];
        }else{
            gameName = (gameData && gameData.gameId && gameData.gameId.name) ? gameData.gameId.name : '';
        }
        return gameName;
    },
    search: function (startTime, endTime, playerObjId, providerId, gameId, startIndex, count) {
        startIndex = startIndex || 0;
        startIndex = Number(startIndex);
        count = count || constSystemParam.MAX_RECORD_NUM;
        count = Number(count);
        startTime = startTime || new Date(0);
        endTime = endTime || new Date();
        var query = {
            createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
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
        var recordsProm = dbconfig.collection_playerConsumptionRecord.find(query).sort({createTime: -1}).lean().skip(startIndex).limit(count)
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

    assignConsumptionUsedEventByObjId: function (startTime, endTime, consumptionRecordObjId, eventObjId, usedProposal, rewardType) {

        let consumptionQuery = {
            _id: consumptionRecordObjId,
            bDirty: false
        };

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

        return dbconfig.collection_playerConsumptionRecord.update(consumptionQuery, updateValue).lean();

    },

    /**
     *  Add usedEvent to consumption record
     */
    assignConsumptionUsedEvent: function (platformObjId, playerObjId, eventObjId, spendingAmount, startTime, endTime, providers, usedProposal, rewardType, isNoLimit) {
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
                    if (!isNoLimit && curAmount >= spendingAmount) {
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


    getPlayerConsumptionDetailByPlatform: function (startTime, endTime, platformId) {
        let matchObj = {
            platform: platformId,
            startTime: {$gte: startTime, $lt: endTime}
        };

        return dbconfig.collection_playerConsumptionHourSummary.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: "$platform",
                    totalAmount: {$sum: "$consumptionValidAmount"},
                    userIds: {$addToSet: "$player"},
                }
            }
        ).read("secondaryPreferred").allowDiskUse(true).exec();
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

    streamPlayersWithConsumptionAndProposalInTimeFrame: function streamPlayersWithConsumptionAndProposalInTimeFrame(startTime, endTime, platformId) {
        let consumptionPlayerObjIdList = [];
        let proposalPlayerObjIdList = [];
        startTime = new Date(startTime);
        endTime = new Date(endTime);

        console.log('streamPlayersWithConsumptionAndProposalInTimeFrame', startTime, endTime, platformId);

        return dbconfig.collection_playerConsumptionRecord.aggregate(
            [
                {
                    $match: {
                        createTime: {$gte: startTime, $lt: endTime},
                        platformId: platformId,
                        isDuplicate: {$ne: true}
                    }
                },
                {
                    $group: {
                        _id: '$playerId'
                    }
                }
            ]
        ).then(
            consumptionPlayerList => {

                console.log('consumptionPlayerList', consumptionPlayerList.length);

                if(consumptionPlayerList && consumptionPlayerList.length > 0){
                    consumptionPlayerObjIdList = consumptionPlayerList.map(c => c._id);
                }

                return dbconfig.collection_proposal.aggregate(
                    [
                        {
                            $match: {
                                createTime: {$gte: startTime, $lt: endTime},
                                mainType: {$in: ["TopUp", "PlayerBonus"]},
                                "data.platformId": platformId,
                                "data.playerObjId": {$nin: consumptionPlayerObjIdList}
                            }
                        },
                        {
                            $group: {
                                _id: '$data.playerObjId'
                            }
                        }
                    ]
                );
            }
        ).then(
            proposalPlayerList => {

                console.log('proposalPlayerList', proposalPlayerList.length);

                if(proposalPlayerList && proposalPlayerList.length > 0){
                    proposalPlayerObjIdList = proposalPlayerList.map(p => p._id);
                }

                return consumptionPlayerObjIdList.concat(proposalPlayerObjIdList)
            }
        );
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
    getProviderLatestTimeRecord: function (providerIdArr, platformObjId) {
        let platformData;
        let proms = [];
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformDetail => {
                if(platformDetail && platformDetail.gameProviders){
                    platformData = platformDetail;

                    return dbconfig.collection_gameProvider.find({_id: {$in: platformDetail.gameProviders}});
                }
            }
        ).then(
            gameProviderDetail => {
                if(gameProviderDetail && gameProviderDetail.length > 0){
                    gameProviderDetail.map(gameProvider => {
                        if(gameProvider){
                            let endTime = new Date();
                            let startTime = dbUtility.getNdaylaterFromSpecificStartTime(-30,endTime);
                            let query = {
                                providerId: gameProvider._id,
                                platformId: platformObjId,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                }
                            }

                            let playerConsumptionRecordData = dbconfig.collection_playerConsumptionRecord.findOne(query).sort({createTime: -1}).limit(1).lean().then(
                                playerConsumption => {
                                    if(playerConsumption){
                                        return {gameProviderName: gameProvider.name || "", data: playerConsumption};
                                    }else{
                                        return {gameProviderName: gameProvider.name || "", data: null};
                                    }
                                }
                            )

                            proms.push(playerConsumptionRecordData);
                        }
                    })

                    return Promise.all(proms);
                }
            }
        ).then(
            result => {
                let resultArr = [];
                if(result && result.length > 0){
                    result.map(r => {
                        if(r){
                            var recordStatus = {gameProviderName: r.gameProviderName, createTime: "", delayStatusColor: "rgb(255,255,255)"};

                            if(r.data){
                                var currentDate = new Date();
                                var latestCreateTime = r.data.createTime ? new Date(r.data.createTime) : new Date();
                                var difference = currentDate.getTime() - latestCreateTime.getTime();
                                var resultInMinutes = Number.isFinite(difference) ? Math.round(difference / 60000) : 0;

                                recordStatus.createTime = latestCreateTime;

                                if (platformData && platformData.consumptionTimeConfig) {
                                    let consumptionTimeConfig = platformData.consumptionTimeConfig;
                                    if (consumptionTimeConfig && consumptionTimeConfig.length > 0) {
                                        consumptionTimeConfig = consumptionTimeConfig.sort(function (configA, configB) {
                                            return configA.duration - configB.duration;
                                        });

                                        for (let i = 0; i < consumptionTimeConfig.length; i++) {
                                            recordStatus.delayStatusColor = consumptionTimeConfig[i].color;
                                            if (resultInMinutes <= consumptionTimeConfig[i].duration) break;
                                        }
                                    }
                                }
                            }

                            resultArr.push(recordStatus);
                        }
                    })

                    return resultArr;
                }
            }
        )
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

    winRateReportFromSummary: async function (startTime, endTime, providerId, platformList, listAll, loginDevice) {
        let participantsProm;
        let groupById = null;
        let returnedObj;
        let platformListQuery;
        let platformQuery = {};
        let loginDeviceQuery;

        if(platformList && platformList.length > 0) {
            platformListQuery = {$in: platformList.map(item=>{return ObjectId(item)})};
            platformQuery = { platformObjIdList: platformList.map(item=>{return ObjectId(item)})};
        }

        if (loginDevice && loginDevice.length > 0) {
            loginDeviceQuery = {$in: loginDevice};
        }

        const matchObj = {
            date: {
                $gte: startTime,
                $lt: endTime
            }
        };

        if (platformListQuery) {
            matchObj.platformId = platformListQuery;
        }

        if (providerId && providerId !== 'all') {
            matchObj.providerId = ObjectId(providerId);
        }

        if (loginDeviceQuery) {
            matchObj.loginDevice = loginDeviceQuery;
        }

        if (listAll) {
            //find the number of player consumption (non-repeat), with different provider
            groupById = {"providerId": "$providerId", "platformId": "$platformId"};
            participantsProm = dbconfig.collection_winRateReportDataDaySummary.aggregate([
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: groupById,
                        playerId: { $addToSet: "$playerId" }
                    }
                }
            ]).read("secondaryPreferred");
        } else {
            //find the number of player consumption (non-repeat), include all providers
            participantsProm = dbconfig.collection_winRateReportDataDaySummary.distinct('playerId', matchObj).read("secondaryPreferred");
        }

        let totalAmountProm = dbconfig.collection_winRateReportDataDaySummary.aggregate([
            {
                $match: matchObj
            },
            {
                $group: {
                    // _id: listAll ? "$providerId" : null,
                    _id: groupById,
                    total_amount: { $sum: "$consumptionAmount"},
                    validAmount: { $sum: "$consumptionValidAmount"},
                    consumptionTimes: { $sum: "$consumptionTimes"},
                    bonusAmount: { $sum: "$consumptionBonusAmount" }
                }
            }
        ]).read("secondaryPreferred");

        let gameProviderProm = dbPlatform.getProviderListByPlatform(platformQuery).then(data => {
            return data ? data : [];
        });

        let allPlatformGameProm = dbPlatform.getAllProviderListByPlatform(platformQuery).then(data => {
            return data ? data : [];
        });

        return Promise.all([participantsProm, totalAmountProm, gameProviderProm, allPlatformGameProm]).then(
            data => {
                let participantNumber = 0;
                let consumptionTimes = 0;
                let totalAmount = 0;
                let validAmount = 0;
                let bonusAmount = 0;
                let returnData = [];
                let totalSumData = data[1] ? data[1] : [];
                let gameProviders = data[2];
                let participantData = data[0] ? data[0] : [];
                let allPlatformGameProviders = data[3];

                console.log('totalSumData', totalSumData);

                if (!listAll && data && data[0] && data[1] && data[1][0]) {
                    participantNumber = data[0].length;
                    consumptionTimes = data[1][0].consumptionTimes;
                    totalAmount = data[1][0].total_amount;
                    validAmount = data[1][0].validAmount;
                    bonusAmount = data[1][0].bonusAmount;
                    // return sum of "all" provider winrate data
                    returnData = dbPlayerConsumptionRecord.getAllSumWinRate(providerId, gameProviders, participantNumber, consumptionTimes, totalAmount, validAmount, bonusAmount);
                } else if (listAll && data && data[0] && data[1] && data[1][0]) {
                    // return  detail of each provider's winrate data
                    returnData = dbPlayerConsumptionRecord.getProvidersWinRate(allPlatformGameProviders, participantData, totalSumData);
                }
                return returnData;
            }
        ).then(
            returnedData => {
                returnedObj = returnedData;
                let twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

                if (new Date(endTime) > twoDaysAgo) {
                    startTime = twoDaysAgo;
                    return dbPlayerConsumptionRecord.winRateReport(startTime, endTime, providerId, platformList, listAll);
                }
            }
        ).then(
            twoDaysWinRateReportData => {
                console.log('twoDaysWinRateReportData', twoDaysWinRateReportData && twoDaysWinRateReportData.length);
                if (twoDaysWinRateReportData && twoDaysWinRateReportData.length > 0) {
                    twoDaysWinRateReportData.forEach(
                        twoDaysData => {
                            let indexNo = returnedObj.findIndex(r => r && r.providerId && twoDaysData && twoDaysData.providerId
                                                                       && r.providerId.toString() === twoDaysData.providerId.toString()
                                                                       && r.platformObjId && twoDaysData.platformObjId
                                                                       && r.platformObjId.toString() === twoDaysData.platformObjId.toString());

                            if (indexNo === -1) {
                                if (returnedObj && returnedObj[0]) {
                                    returnedObj[0].consumptionTimes += twoDaysData.consumptionTimes;
                                    returnedObj[0].totalAmount += twoDaysData.totalAmount;
                                    returnedObj[0].validAmount += twoDaysData.validAmount;
                                    returnedObj[0].bonusAmount += twoDaysData.bonusAmount;
                                    let profit = (-returnedObj[0].bonusAmount / returnedObj[0].validAmount * 100) || 0;
                                    profit = profit.toFixed(2);
                                    returnedObj[0].profit = Math.round(profit * 100) / 100;
                                }
                            } else {
                                returnedObj[indexNo].consumptionTimes += twoDaysData.consumptionTimes;
                                returnedObj[indexNo].totalAmount += twoDaysData.totalAmount;
                                returnedObj[indexNo].validAmount += twoDaysData.validAmount;
                                returnedObj[indexNo].bonusAmount += twoDaysData.bonusAmount;
                                let profit = (-returnedObj[indexNo].bonusAmount / returnedObj[indexNo].validAmount * 100) || 0;
                                profit = profit.toFixed(2);
                                returnedObj[indexNo].profit = Math.round(profit * 100) / 100;
                            }
                        }
                    )
                }
                return returnedObj;
            }
        );
    },

    winRateReport: function (startTime, endTime, providerId, platformList, listAll, loginDevice) {
        let participantsProm;
        let platformListQuery;
        let platformQuery = {};
        let loginDeviceQuery;

        if(platformList && platformList.length > 0) {
            platformListQuery = {$in: platformList.map(item=>{return ObjectId(item)})};
            platformQuery = { platformObjIdList: platformList.map(item=>{return ObjectId(item)})};
        }

        if (loginDevice && loginDevice.length > 0) {
            loginDeviceQuery = {$in: loginDevice};
        }

        const matchObj = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            isDuplicate: {
                $ne: true
            }
        };

        if (platformListQuery) {
            matchObj.platformId = platformListQuery;
        }

        if (providerId && providerId !== 'all') {
            matchObj.providerId = ObjectId(providerId);
        }

        if (loginDeviceQuery) {
            matchObj.loginDevice = loginDeviceQuery;
        }

        let groupById = null;
        if (listAll) {
            //find the number of player consumption (non-repeat), with different provider
            groupById = {"providerId": "$providerId", "platformId": "$platformId"};
            participantsProm = dbconfig.collection_playerConsumptionRecord.aggregate([{
                    $match: matchObj
                },
                {
                    $group: {
                        _id: groupById,
                        playerId: { $addToSet: "$playerId" }
                    }
                }
            ]).read("secondaryPreferred");
        } else {
            //find the number of player consumption (non-repeat), include all providers
            participantsProm = dbconfig.collection_playerConsumptionRecord.distinct('playerId', matchObj).read("secondaryPreferred");
        }

        let totalAmountProm = dbconfig.collection_playerConsumptionRecord.aggregate([{
                $match: matchObj
            },
            {
                $group: {
                    _id: groupById,
                    total_amount: { $sum: "$amount"},
                    validAmount: { $sum: "$validAmount"},
                    consumptionTimes: { $sum: { $cond: ["$count", "$count", 1] }},
                    bonusAmount: { $sum: "$bonusAmount" }
                }
            }
        ]).read("secondaryPreferred");

        let gameProviderProm = dbPlatform.getProviderListByPlatform(platformQuery).then(data => {
            return data ? data : [];
        });

        let allPlatformGameProm = dbPlatform.getAllProviderListByPlatform(platformQuery).then(data => {
            return data ? data : [];
        });

        return Promise.all([participantsProm, totalAmountProm, gameProviderProm, allPlatformGameProm]).then(
            data => {
                let participantNumber = 0;
                let consumptionTimes = 0;
                let totalAmount = 0;
                let validAmount = 0;
                let bonusAmount = 0;
                let returnData = [];
                let totalSumData = data[1] ? data[1] : [];
                let gameProviders = data[2];
                let participantData = data[0] ? data[0] : [];
                let allPlatformGameProviders = data[3];

                if (!listAll && data && data[0] && data[1] && data[1][0]) {
                    participantNumber = data[0].length;
                    consumptionTimes = data[1][0].consumptionTimes;
                    totalAmount = data[1][0].total_amount;
                    validAmount = data[1][0].validAmount;
                    bonusAmount = data[1][0].bonusAmount;
                    // return sum of "all" provider winrate data
                    returnData = dbPlayerConsumptionRecord.getAllSumWinRate(providerId, gameProviders, participantNumber, consumptionTimes, totalAmount, validAmount, bonusAmount);
                } else if (listAll && data && data[0] && data[1] && data[1][0]) {
                    // return  detail of each provider's winrate data
                    returnData = dbPlayerConsumptionRecord.getProvidersWinRate(allPlatformGameProviders, participantData, totalSumData);
                }
                return returnData;
            }
        );
    },

    getAllSumWinRate: function (providerId, gameProviders, participantNumber, consumptionTimes, totalAmount, validAmount, bonusAmount) {
        // return sum of "all" provider winrate data
        let result = [];
        let gameProviderName = gameProviders.filter(provider => {
            if (provider._id.equals(ObjectId(providerId))) {
                return provider
            }
        })
        gameProviderName = (gameProviderName && gameProviderName[0] && gameProviderName[0].name) ? gameProviderName[0].name : '';
        if (!providerId) {
            gameProviderName = 'AllProviders';
        }
        let profit = (-bonusAmount / validAmount * 100) || 0
        profit = profit.toFixed(2);
        result = [{
            providerId: providerId,
            providerName: gameProviderName,
            participantNumber: participantNumber,
            consumptionTimes: consumptionTimes,
            totalAmount: totalAmount,
            validAmount: validAmount,
            bonusAmount: bonusAmount,
            profit: profit
        }]
        return result;
    },

    getProvidersWinRate: function (gameProviders, participantData, totalSumData) {
        // return  detail of each provider's winrate data
        let result = [];
        if (gameProviders && gameProviders.length > 0) {
            gameProviders.forEach(provider => {
                console.log('provider xxx', provider);
                console.log('participantData xxx', participantData);
                console.log('totalSumData xxx', totalSumData);
                //count how many player consumption (non-repeat)
                let providerSum;
                let participant;
                let participantNumber = 0;
                if (participantData && participantData.length > 0) {
                    participant = participantData.filter(item => {
                        return item._id.providerId.equals(provider._id) && item._id.platformId.equals(provider.platformObjId);
                    })
                    participant = (participant && participant[0]) ? participant[0] : null;
                    participantNumber = (participant && participant.playerId) ? participant.playerId.length : 0;
                }
                //pair the provider - dump aggregate data into that provider object
                let sumData = totalSumData.filter(sum => {
                    if (sum._id.providerId.equals(provider._id) && sum._id.platformId.equals(provider.platformObjId)) {
                        return sum;
                    }
                })
                sumData = (sumData && sumData[0]) ? sumData[0] : [];
                providerSum = {
                    platformObjId: provider.platformObjId,
                    platformName: provider.platformName,
                    providerId: provider._id,
                    providerName: provider.name,
                    participantNumber: participantNumber || 0,
                    consumptionTimes: sumData.consumptionTimes || 0,
                    totalAmount: sumData.total_amount || 0,
                    validAmount: sumData.validAmount || 0,
                    bonusAmount: sumData.bonusAmount || 0,
                    profit: (-sumData.bonusAmount / sumData.validAmount * 100) || 0
                }
                providerSum.profit = (Math.round(providerSum.profit * 100) / 100) || 0
                result.push(providerSum);
            })
        }
        return result;

    },

    getWinRateByGameType: function (startTime, endTime, providerId, platformId, providerName, loginDevice) {
        let loginDeviceQuery;
        // display winrate data by specific gametype (in a provider)
        const matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
            platformId: ObjectId(platformId),
            isDuplicate: {$ne: true}
        };

        if (providerId && providerId !== 'all') {
            matchObj.providerId = ObjectId(providerId);
        }

        if (loginDevice && loginDevice.length > 0) {
            loginDeviceQuery = {$in: loginDevice};
        }

        let groupData = {"providerId": "$providerId", "cpGameType": "$cpGameType", "loginDevice": "$loginDevice"};
        let groupObjIdData = {'cpGameType': '$cpGameType', 'loginDevice': '$loginDevice'};
        if (loginDeviceQuery) {
            matchObj.loginDevice = loginDeviceQuery;
        }

        // the player are non-repeatable
        let participantsProm = dbconfig.collection_playerConsumptionRecord.aggregate([{
                $match: matchObj
            },
            {
                $project: {
                    'loginDevice': {$substr:["$loginDevice",0,4]},
                    'providerId' : 1,
                    'cpGameType': 1,
                    'playerId': 1
                }
            },
            {
                $group: {
                    _id: groupData,
                    playerId: {
                        $addToSet: "$playerId"
                    }
                }
            }
        ]).read("secondaryPreferred");

        let totalAmountProm = dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: matchObj
            },
            {
                $project: {
                    'loginDevice': {$substr:["$loginDevice",0,4]},
                    'cpGameType': 1,
                    'amount': 1,
                    'validAmount': 1,
                    'count': 1,
                    'bonusAmount': 1
                }
            },
            {
                $group: {
                    _id: groupObjIdData,
                    total_amount: {$sum: "$amount"},
                    validAmount: {$sum: "$validAmount"},
                    consumptionTimes: {$sum: {$cond: ["$count", "$count", 1]}},
                    bonusAmount: {$sum: "$bonusAmount"}
                }
            }
        ]).read("secondaryPreferred");

        return Promise.all([participantsProm, totalAmountProm]).then(
            data => {
                let participantNumber = 0;
                let result = [];
                let participantData = data[0] ? data[0] : [];
                let totalSumData = data[1] ? data[1] : [];
                result = dbPlayerConsumptionRecord.getGameTypeWinRateData(providerId, providerName, participantNumber, totalSumData, participantData);
                return result;
            }
        )
    },

    getWinRateByGameTypeFromSummary: function (startTime, endTime, providerId, platformId, providerName, loginDevice) {
        let returnedObj;
        let loginDeviceQuery;
        // display winrate data by specific gametype (in a provider)
        const matchObj = {
            date: {$gte: startTime, $lt: endTime},
            platformId: ObjectId(platformId),
        };

        if (providerId && providerId !== 'all') {
            matchObj.providerId = ObjectId(providerId);
        }

        if (loginDevice && loginDevice.length > 0) {
            loginDeviceQuery = {$in: loginDevice};
        }

        let groupData = {"providerId": "$providerId", "cpGameType": "$cpGameType", "loginDevice": "$loginDevice"};
        let groupObjIdData = {'cpGameType': '$cpGameType', 'loginDevice': '$loginDevice'};
        if (loginDeviceQuery) {
            matchObj.loginDevice = loginDeviceQuery;
        }

        // the player are non-repeatable
        let participantsProm = dbconfig.collection_winRateReportDataDaySummary.aggregate([{
                $match: matchObj
            },
            {
                $group: {
                    _id: groupData,
                    playerId: {
                        $addToSet: "$playerId"
                    }
                }
            }
        ]).read("secondaryPreferred");

        let totalAmountProm = dbconfig.collection_winRateReportDataDaySummary.aggregate([
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: groupObjIdData,
                    total_amount: { $sum: "$consumptionAmount"},
                    validAmount: { $sum: "$consumptionValidAmount"},
                    consumptionTimes: { $sum: "$consumptionTimes"},
                    bonusAmount: { $sum: "$consumptionBonusAmount" }
                }
            }
        ]).read("secondaryPreferred");

        return Promise.all([participantsProm, totalAmountProm]).then(
            data => {
                let participantNumber = 0;
                let participantData = data[0] ? data[0] : [];
                let totalSumData = data[1] ? data[1] : [];

                return dbPlayerConsumptionRecord.getGameTypeWinRateData(providerId, providerName, participantNumber, totalSumData, participantData);
            }
        ).then(
            returnedData => {
                returnedObj = returnedData;
                let twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

                if (new Date(endTime) > twoDaysAgo) {
                    startTime = twoDaysAgo;
                    return dbPlayerConsumptionRecord.getWinRateByGameType(startTime, endTime, providerId, platformId, providerName, loginDevice);
                }
            }
        ).then(
            twoDaysWinRateReportData => {
                if (twoDaysWinRateReportData && twoDaysWinRateReportData.data && twoDaysWinRateReportData.data.length > 0) {
                    twoDaysWinRateReportData.data.forEach(
                        twoDaysData => {
                            let indexNo;
                            let isCpGameTypeAndLoginDeviceExist = false;

                            if(twoDaysData && twoDaysData.providerId && twoDaysData.cpGameType && twoDaysData.loginDevice){
                                isCpGameTypeAndLoginDeviceExist = true;
                            }

                            if (isCpGameTypeAndLoginDeviceExist) {
                                indexNo = returnedObj.data.findIndex(r => r && r.providerId && r.cpGameType && r.loginDevice
                                    && twoDaysData && twoDaysData.providerId && twoDaysData.cpGameType && twoDaysData.loginDevice
                                    && r.providerId.toString() === twoDaysData.providerId.toString()
                                    && r.cpGameType.toString() === twoDaysData.cpGameType.toString()
                                    && r.loginDevice.toString() === twoDaysData.loginDevice.toString());
                            } else {
                                indexNo = returnedObj.data.findIndex(r => r && r.providerId && r.cpGameType && twoDaysData && twoDaysData.providerId && twoDaysData.cpGameType
                                    && r.providerId.toString() === twoDaysData.providerId.toString()
                                    && r.cpGameType.toString() === twoDaysData.cpGameType.toString());
                            }

                            if (indexNo === -1) {
                                returnedObj.data.push(twoDaysData);
                            } else {
                                returnedObj.data[indexNo].consumptionTimes += twoDaysData.consumptionTimes;
                                returnedObj.data[indexNo].totalAmount += twoDaysData.totalAmount;
                                returnedObj.data[indexNo].validAmount += twoDaysData.validAmount;
                                returnedObj.data[indexNo].bonusAmount += twoDaysData.bonusAmount;
                                let profit = (-returnedObj.data[indexNo].bonusAmount / returnedObj.data[indexNo].validAmount * 100) || 0;
                                profit = profit.toFixed(2);
                                returnedObj.data[indexNo].profit = Math.round(profit * 100) / 100;
                            }
                        }
                    );

                    returnedObj.summaryData.consumptionTimes += twoDaysWinRateReportData.summaryData.consumptionTimes;
                    returnedObj.summaryData.totalAmount += twoDaysWinRateReportData.summaryData.totalAmount;
                    returnedObj.summaryData.validAmount += twoDaysWinRateReportData.summaryData.validAmount;
                    returnedObj.summaryData.bonusAmount += twoDaysWinRateReportData.summaryData.bonusAmount;
                    let profit = (-returnedObj.summaryData.bonusAmount / returnedObj.summaryData.validAmount * 100) || 0;
                    profit = profit.toFixed(2);
                    returnedObj.summaryData.profit = Math.round(profit * 100) / 100;
                    if (twoDaysWinRateReportData.summaryData.participantArr && twoDaysWinRateReportData.summaryData.participantArr.length > 0) {
                        twoDaysWinRateReportData.summaryData.participantArr.forEach(player => {
                            returnedObj.summaryData.participantArr.push(player);
                        })
                    }
                }


                return returnedObj;
            }
        );
    },

    getGameTypeWinRateData: function (providerId, providerName, participantNumber, totalSumData, participantData) {
        let participantArr = [];
        let summaryData = {
            consumptionTimes: 0,
            totalAmount: 0,
            validAmount: 0,
            bonusAmount: 0,
            profit: 0
        };
        if (participantData && totalSumData && totalSumData.length > 0) {
            let providerSum;
            let participant;
            let participantNumber = 0;
            let consumptionTimes = 0;
            totalSumData.forEach(item => {
                // calculate the non-repeat player number
                if (participantData && participantData.length > 0) {
                    participant = participantData.filter(party => {
                        if (party._id && party._id.cpGameType && party._id.loginDevice
                            && item._id && item._id.cpGameType && item._id.loginDevice
                            && (party._id.cpGameType == item._id.cpGameType)
                            && (String(party._id.loginDevice) === String(item._id.loginDevice))){
                            // meet cpGameType and loginDevice requirement
                            return item;
                        } else if (
                            party._id && party._id.cpGameType && !party._id.loginDevice
                            && item._id && item._id.cpGameType && !item._id.loginDevice
                            && (party._id.cpGameType == item._id.cpGameType)) {
                            // meet only cpGameType requirement but not loginDevice
                            return item;
                        } else if (
                            party._id && !party._id.cpGameType && party._id.providerId && party._id.loginDevice
                            && item._id && !item._id.cpGameType && item._id.loginDevice
                            && (party._id.providerId == providerId)
                            && (String(party._id.loginDevice) === String(item._id.loginDevice))) {
                            // meet only loginDevice requirement but not cpGameType
                            return item;
                        } else if (
                            party._id && !party._id.cpGameType && !party._id.loginDevice && party._id.providerId
                            && !item._id.cpGameType && !item._id.loginDevice
                            && (party._id.providerId == providerId)) {
                            // meet only providerId requirement but not cpGameType and loginDevice
                            return item;
                        }
                    })
                    participant = (participant && participant.length) ? participant[0] : null;
                    participantNumber = (participant && participant.playerId && participant.playerId.length) ? participant.playerId.length : 0

                    if (participant && participant.playerId && participant.playerId.length) {
                        participant.playerId.forEach(player => {
                            participantArr.push(player);
                        })
                    }
                }
                if (item && item._id && item._id.cpGameType) {
                    item.cpGameType = item._id.cpGameType;
                } else if (item && item._id && !item._id.cpGameType) {
                    item.cpGameType = item._id;
                }
                if (item && item._id && item._id.loginDevice) {
                    item.loginDevice = item._id.loginDevice;
                }
                item.totalAmount = item.total_amount;
                item.providerName = providerName;
                item.participantNumber = participantNumber;
                item.providerId = providerId;
                item.profit = (-item.bonusAmount / item.validAmount * 100);
                item.profit = Math.round(item.profit * 100) / 100

                summaryData.consumptionTimes += consumptionTimes;
                summaryData.totalAmount += item.total_amount;
                summaryData.validAmount += item.validAmount;
                summaryData.bonusAmount += item.bonusAmount;
                return item;
            });
        }
        summaryData.profit = ((-summaryData.bonusAmount / summaryData.validAmount * 100));
        summaryData.participantArr = participantArr
        return {
            data: totalSumData,
            summaryData: summaryData
        }
    },

    getWinRateByPlayers: function (startTime, endTime, providerId, platformId, cpGameType, loginDevice) {
        const matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
            platformId: ObjectId(platformId),
            isDuplicate: {$ne: true}
        };

        matchObj.providerId = ObjectId(providerId);
        matchObj.cpGameType = cpGameType;
        if(!cpGameType || cpGameType == 'null'){
            matchObj.cpGameType = { $exists: false }
        }

        if (loginDevice) {
            matchObj.loginDevice = loginDevice;
        }

        if (providerId && !loginDevice){
            matchObj.loginDevice = { $exists: false }
        }

        let participantsProm = dbconfig.collection_playerConsumptionRecord.distinct('playerId', matchObj).read("secondaryPreferred");
        let totalAmountProm = dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: '$playerId',
                    total_amount: {$sum: "$amount"},
                    validAmount: {$sum: "$validAmount"},
                    consumptionTimes: {$sum: {$cond: ["$count", "$count", 1]}},
                    bonusAmount: {$sum: "$bonusAmount"}
                }
            }
        ]).read("secondaryPreferred");

        return Promise.all([participantsProm, totalAmountProm]).then(
            data => {
                let participantNumber = 0;
                let consumptionTimes = 0;
                let totalAmount = 0;
                let validAmount = 0;
                let bonusAmount = 0;
                let returnData = [];
                let totalSumData = data[1] ? data[1] : [];
                let playersProm = [];
                let summaryData = {
                    consumptionTimes : 0,
                    totalAmount: 0,
                    validAmount: 0,
                    bonusAmount: 0,
                    profit:0
                };

                let providerSum;
                totalSumData.forEach((item) => {
                    let playerProm = dbconfig.collection_players.findOne({_id : Object(item._id)}, {_id : 1, name : 1}).then(player =>{
                        item.playerName = player.name;
                        item.totalAmount = item.total_amount;
                        item.profit = (-item.bonusAmount/item.validAmount*100) || 0;
                        item.profit = Math.round(item.profit * 100) / 100;

                        summaryData.consumptionTimes += item.consumptionTimes;
                        summaryData.totalAmount += item.total_amount;
                        summaryData.validAmount += item.validAmount;
                        summaryData.bonusAmount += item.bonusAmount;
                        return item;
                    })
                    playersProm.push(playerProm);
                });

                return Promise.all(playersProm).then(players => {
                    summaryData.profit = (-summaryData.bonusAmount/summaryData.validAmount*100)|| 0;
                    return { data: players, summaryData:summaryData }
                })
            }
        )
    },

    getWinRateByPlayersFromSummary: function (startTime, endTime, providerId, platformId, cpGameType, loginDevice) {
        let returnedObj;
        const matchObj = {
            date: {$gte: startTime, $lt: endTime},
            platformId: ObjectId(platformId)
        };

        matchObj.providerId = ObjectId(providerId);
        matchObj.cpGameType = cpGameType;
        if(!cpGameType || cpGameType == 'null'){
            matchObj.cpGameType = { $exists: false }
        }

        if (loginDevice) {
            matchObj.loginDevice = loginDevice;
        }

        if (providerId && !loginDevice){
            matchObj.loginDevice = { $exists: false }
        }

        let participantsProm = dbconfig.collection_winRateReportDataDaySummary.distinct('playerId', matchObj).read("secondaryPreferred");
        let totalAmountProm = dbconfig.collection_winRateReportDataDaySummary.aggregate([
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: '$playerId',
                    total_amount: { $sum: "$consumptionAmount"},
                    validAmount: { $sum: "$consumptionValidAmount"},
                    consumptionTimes: { $sum: "$consumptionTimes"},
                    bonusAmount: { $sum: "$consumptionBonusAmount" }
                }
            }
        ]).read("secondaryPreferred");

        return Promise.all([participantsProm, totalAmountProm]).then(
            data => {
                let totalSumData = data[1] ? data[1] : [];
                let playersProm = [];
                let summaryData = {
                    consumptionTimes : 0,
                    totalAmount: 0,
                    validAmount: 0,
                    bonusAmount: 0,
                    profit:0
                };

                totalSumData.forEach((item) => {
                    let playerProm = dbconfig.collection_players.findOne({_id : Object(item._id)}, {_id : 1, name : 1}).then(player =>{
                        item.playerName = player.name;
                        item.totalAmount = item.total_amount;
                        item.profit = (-item.bonusAmount/item.validAmount*100) || 0;
                        item.profit = Math.round(item.profit * 100) / 100;

                        summaryData.consumptionTimes += item.consumptionTimes;
                        summaryData.totalAmount += item.total_amount;
                        summaryData.validAmount += item.validAmount;
                        summaryData.bonusAmount += item.bonusAmount;
                        return item;
                    });
                    playersProm.push(playerProm);
                });

                return Promise.all(playersProm).then(players => {
                    summaryData.profit = (-summaryData.bonusAmount / summaryData.validAmount * 100) || 0;
                    return {data: players, summaryData: summaryData}
                })
            }
        ).then(
            returnedData => {
                returnedObj = returnedData;
                let twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

                if (new Date(endTime) > twoDaysAgo) {
                    startTime = twoDaysAgo;
                    return dbPlayerConsumptionRecord.getWinRateByPlayers(startTime, endTime, providerId, platformId, cpGameType, loginDevice);
                }
            }
        ).then(
            twoDaysWinRateReportData => {
                console.log('twoDaysWinRateReportData', twoDaysWinRateReportData && twoDaysWinRateReportData.length);
                if (twoDaysWinRateReportData && twoDaysWinRateReportData.data && twoDaysWinRateReportData.data.length > 0) {
                    twoDaysWinRateReportData.data.forEach(
                        twoDaysData => {
                            let indexNo = returnedObj.data.findIndex(r => r && r._id && twoDaysData && twoDaysData._id
                                                                            && r._id.toString() === twoDaysData._id.toString());

                            if (indexNo === -1) {
                                returnedObj.data.push(twoDaysData);
                            } else {
                                returnedObj.data[indexNo].consumptionTimes += twoDaysData.consumptionTimes;
                                returnedObj.data[indexNo].totalAmount += twoDaysData.totalAmount;
                                returnedObj.data[indexNo].validAmount += twoDaysData.validAmount;
                                returnedObj.data[indexNo].bonusAmount += twoDaysData.bonusAmount;
                                let profit = (-returnedObj.data[indexNo].bonusAmount / returnedObj.data[indexNo].validAmount * 100) || 0;
                                profit = profit.toFixed(2);
                                returnedObj.data[indexNo].profit = Math.round(profit * 100) / 100;
                            }
                        }
                    )

                    returnedObj.summaryData.consumptionTimes += twoDaysWinRateReportData.summaryData.consumptionTimes;
                    returnedObj.summaryData.totalAmount += twoDaysWinRateReportData.summaryData.totalAmount;
                    returnedObj.summaryData.validAmount += twoDaysWinRateReportData.summaryData.validAmount;
                    returnedObj.summaryData.bonusAmount += twoDaysWinRateReportData.summaryData.bonusAmount;
                    let profit = (-returnedObj.summaryData.bonusAmount / returnedObj.summaryData.validAmount * 100) || 0;
                    profit = profit.toFixed(2);
                    returnedObj.summaryData.profit = Math.round(profit * 100) / 100;
                    if (twoDaysWinRateReportData.summaryData.participantArr && twoDaysWinRateReportData.summaryData.participantArr.length > 0) {
                        twoDaysWinRateReportData.summaryData.participantArr.forEach(player => {
                            returnedObj.summaryData.participantArr.push(player);
                        })
                    }
                }

                return returnedObj;
            }
        );
    },

    getWinRateReportDataForTimeFrame: function (startTime, endTime, platformId, playerIds) {
        let consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: {
                    platformId: platformId,
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    playerId: {$in: playerIds},
                    isDuplicate: {$ne: true}
                }
            },
            {
                $group: {
                    _id: {playerId: "$playerId", platformId: "$platformId", providerId: "$providerId", cpGameType: "$cpGameType", loginDevice: "$loginDevice"},
                    count: {$sum: {$cond: ["$count", "$count", 1]}},
                    amount: {$sum: "$amount"},
                    validAmount: {$sum: "$validAmount"},
                    bonusAmount: {$sum: "$bonusAmount"}
                }
            }
        ]).read("secondaryPreferred").allowDiskUse(true);

        return consumptionProm.then(
            result => {
                let consumptionDetails = result;
                let playerReportDaySummary = [];

                console.log('getWinRateReportDataForTimeFrame', startTime, endTime, playerIds.length, consumptionDetails.length);

                if (consumptionDetails && consumptionDetails.length > 0) {
                    consumptionDetails.forEach(
                        consumption => {
                            if (consumption && consumption._id && consumption._id.playerId) {
                                let indexNo = playerReportDaySummary.findIndex(p =>
                                    p.playerId == consumption._id.playerId
                                    && p.providerId == consumption._id.providerId
                                    && p.cpGameType == consumption._id.cpGameType
                                    && p.loginDevice == consumption._id.loginDevice
                                );

                                if (indexNo === -1) {
                                    playerReportDaySummary.push({
                                        playerId: consumption._id.playerId,
                                        platformId: consumption._id.platformId,
                                        consumptionTimes: consumption.count,
                                        consumptionAmount: consumption.amount,
                                        consumptionValidAmount: consumption.validAmount,
                                        consumptionBonusAmount: consumption.bonusAmount,
                                        cpGameType: consumption._id.cpGameType,
                                        providerId: consumption._id.providerId,
                                        loginDevice: consumption._id.loginDevice
                                    });
                                } else {
                                    if (!isNullOrUndefined(playerReportDaySummary[indexNo].consumptionTimes)) {
                                        playerReportDaySummary[indexNo].consumptionTimes += consumption.count;
                                    } else {
                                        playerReportDaySummary[indexNo].consumptionTimes = consumption.count;
                                    }

                                    if (!isNullOrUndefined(playerReportDaySummary[indexNo].consumptionAmount)) {
                                        playerReportDaySummary[indexNo].consumptionAmount += consumption.amount;
                                    } else {
                                        playerReportDaySummary[indexNo].consumptionAmount = consumption.amount;
                                    }

                                    if (!isNullOrUndefined(playerReportDaySummary[indexNo].consumptionValidAmount)) {
                                        playerReportDaySummary[indexNo].consumptionValidAmount += consumption.validAmount;
                                    } else {
                                        playerReportDaySummary[indexNo].consumptionValidAmount = consumption.validAmount;
                                    }

                                    if (!isNullOrUndefined(playerReportDaySummary[indexNo].consumptionBonusAmount)) {
                                        playerReportDaySummary[indexNo].consumptionBonusAmount += consumption.bonusAmount;
                                    } else {
                                        playerReportDaySummary[indexNo].consumptionBonusAmount = consumption.bonusAmount;
                                    }

                                    // if (!isNullOrUndefined(playerReportDaySummary[indexNo].cpGameType)) {
                                    //     playerReportDaySummary[indexNo].cpGameType = null;
                                    // } else {
                                    //     playerReportDaySummary[indexNo].cpGameType = consumption._id.cpGameType;
                                    // }
                                    //
                                    // if (!isNullOrUndefined(playerReportDaySummary[indexNo].providerId)) {
                                    //     playerReportDaySummary[indexNo].providerId = null;
                                    // } else {
                                    //     playerReportDaySummary[indexNo].providerId = consumption._id.providerId;
                                    // }
                                }
                            }
                        }
                    )
                }

                console.log('playerReportDaySummary.length', playerReportDaySummary.length);

                return playerReportDaySummary;
            }
        ).catch(
            error => {
                console.log("win rate report data summary error - ", error);
                return error;
            }
        );

        function isNullOrUndefined (e) {
            return typeof e === "undefined" || e === null
        }
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

function updateConsumptionSumamry(record, readyXIMAAmt, nonXIMAAmt) {
    // Update consumption summary record (XIMA purpose)
    let recordDateNoon = new Date(moment(record.createTime).tz('Asia/Singapore').startOf('day').toDate().getTime() + 12 * 60 * 60 * 1000);
    let summaryDay = recordDateNoon;
    let consumptionAmount = readyXIMAAmt;

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

    let updateData = {
        $inc: {amount: consumptionAmount, validAmount: consumptionAmount, nonXIMAAmt: nonXIMAAmt}
    };

    return dbPlayerConsumptionRecord.upsert(query, updateData);
}

function updateRTG (RTG, incBonusAmt, validAmtToAdd, oldData) {
    return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
        _id: RTG._id
    }, {
        $inc: {
            currentAmt: incBonusAmt,
            curConsumption: validAmtToAdd
        }
    }, {
        new: true
    }).populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup}).lean().then(
        updatedRTG => {

            console.log('LK checking RTG before status update-- 2', updatedRTG.curConsumption + "/" + updatedRTG.targetConsumption);
            let rewardTaskUnlockedProgress = Promise.resolve();

            // Debug negative RTG curConsumption
            if (updatedRTG && updatedRTG.curConsumption && updatedRTG.curConsumption < 0 && oldData) {
                console.log('updateRTG has negative!', validAmtToAdd, RTG._id)
            }

            // Update consumption summary
            let summAdjustXIMAAmt = 0, summAdjustNonXIMAAmt = 0;

            if (updatedRTG && updatedRTG.forbidXIMAAmt > 0) {
                let offsetDiff = updatedRTG.curConsumption - updatedRTG.forbidXIMAAmt;
                let curConsumptionBeforeUpdate = updatedRTG.curConsumption - validAmtToAdd;

                if (offsetDiff <= 0 && curConsumptionBeforeUpdate <= updatedRTG.forbidXIMAAmt) {
                    // Scenario 1: curConsumption is less than forbidXIMAAmt before and after update
                    summAdjustNonXIMAAmt = validAmtToAdd;
                } else if (offsetDiff <= 0 && curConsumptionBeforeUpdate > updatedRTG.forbidXIMAAmt) {
                    // Scenario 2: curConsumption is more than forbidXIMAAmt before update, but is less than after update
                    summAdjustXIMAAmt = updatedRTG.forbidXIMAAmt - curConsumptionBeforeUpdate;
                    summAdjustNonXIMAAmt = validAmtToAdd - summAdjustNonXIMAAmt;
                } else if (offsetDiff > 0 && curConsumptionBeforeUpdate < updatedRTG.forbidXIMAAmt) {
                    // Scenario 3: curConsumption is less than forbidXIMAAmt before update, but is more than after update
                    summAdjustNonXIMAAmt = updatedRTG.forbidXIMAAmt - curConsumptionBeforeUpdate;
                    summAdjustXIMAAmt = validAmtToAdd - summAdjustNonXIMAAmt;
                } else {
                    // Scenario 4: curConsumption is more than forbidXIMAAmt before and after update
                    summAdjustXIMAAmt = validAmtToAdd;
                }
            } else {
                // All credit reflect on summary valid credit
                summAdjustXIMAAmt = validAmtToAdd;
            }

            // update the locked reward tasks
            rewardTaskUnlockedProgress = dbRewardTask.unlockRewardTaskInRewardTaskGroup(updatedRTG, updatedRTG.playerId).then( rewards => {
                if (rewards){
                    return dbRewardTask.getRewardTasksRecord(rewards, updatedRTG);
                }
            });

            // Update consumption summary upon updating consumption record
            updateConsumptionSumamry(oldData, summAdjustXIMAAmt, summAdjustNonXIMAAmt).catch(errorUtils.reportError);

            // Unlock reward task group if necessary
            if (updatedRTG) {
                dbconfig.collection_platform.findOne({_id: oldData.platformId}).then(
                    platform => {
                        // debugging platform is null
                        if (!platform) {
                            console.log('PLATFORM IS NULL! FIX THIS!!');
                            console.log('oldData**', oldData);
                            console.log('oldData.platformId**', oldData.platformId);
                            platform = {};
                        }

                        // Check whether RTG status changed
                        let statusUpdObj = {
                            unlockTime: new Date()
                        };

                        // Check whether player has lost all credit
                        platform.autoApproveLostThreshold = platform.autoApproveLostThreshold || 0;
                        if (updatedRTG.currentAmt <= platform.autoApproveLostThreshold) {
                            statusUpdObj.status = constRewardTaskStatus.NO_CREDIT;
                        }

                        if (updatedRTG.curConsumption >= updatedRTG.targetConsumption + updatedRTG.forbidXIMAAmt) {
                            statusUpdObj.status = constRewardTaskStatus.ACHIEVED;
                        }

                        console.log('LK checking RTG update status obj--', statusUpdObj);
                        if (statusUpdObj.status) {
                            let updateProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                {_id: updatedRTG._id},
                                statusUpdObj
                            );

                            return Promise.all([rewardTaskUnlockedProgress, updateProm]).then(
                                res => {
                                    console.log("checking unlock record", res[0])
                                    console.log("checking update rewardTaskGroup", res[1])
                                    if (res && res[1]) {
                                        if (res[0]){
                                            console.log("checking unlockedStatus, playerId", statusUpdObj.status, updatedRTG.playerId);
                                            dbRewardTask.updateUnlockedRewardTasksRecord(res[0], statusUpdObj.status, updatedRTG.playerId, updatedRTG.platformId).catch(errorUtils.reportError);
                                        }
                                        // Concurrency measurement
                                        if( res[1].status === constRewardTaskStatus.STARTED) {
                                            return dbRewardTask.completeRewardTaskGroup(updatedRTG, statusUpdObj.status)
                                        }
                                    }
                                }
                            )
                            // return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                            //     {
                            //         _id: updatedRTG._id
                            //     },
                            //     statusUpdObj
                            // ).then(res => {
                            //     // Concurrency measurement
                            //     if (res && res.status === constRewardTaskStatus.STARTED) {
                            //         return dbRewardTask.completeRewardTaskGroup(updatedRTG, statusUpdObj.status)
                            //     }
                            // })
                        }
                    }
                ).catch(errorUtils.reportError);
            }
        }
    );
}

function findRTGToUpdate (oldData, newData) {
    let incBonusAmt = 0, incValidAmt = 0;

    if (oldData && newData && (oldData.bonusAmount != newData.bonusAmount || oldData.validAmount != newData.validAmount)) {
        incBonusAmt = newData.bonusAmount - oldData.bonusAmount || 0;
        incValidAmt = newData.validAmount - oldData.validAmount || 0;

        if (incValidAmt < 0){
            console.log("checking for negative consumption (newValidAmount, oldValidAmount, incValidAmt, playerObjId)", newData.validAmount, oldData.validAmount, incValidAmt, oldData.playerId)
            incValidAmt = 0
        }
        console.log('LK checking update RTG playerId--', oldData.playerId);
        return dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId({_id: oldData.playerId}, newData.updateTime).then(
            RTGs => {
                if (RTGs && RTGs.length) {
                    let validAmtToAdd = 0;
                    let validBonusToAdd = 0;
                    let filteredRTG = [];
                    let freeRTG = {};

                    // Filter RTGs
                    RTGs.filter(RTG => {
                        if (RTG) {
                            console.log('LK checking get RTG detail--', RTG.curConsumption);
                            if (RTG.providerGroup && RTG.providerGroup.providers && RTG.providerGroup.providers.length) {
                                RTG.providerGroup.providers.forEach(provider => {
                                    if (String(provider) === String(oldData.providerId)) {
                                        filteredRTG.push(RTG);
                                    }
                                })
                            } else {
                                freeRTG = RTG;
                            }
                        }
                    });

                    if (freeRTG) { filteredRTG.push(freeRTG) }

                    filteredRTG.forEach(RTG => {
                        if (RTG && RTG._id) {
                            // Check current RTG amounts
                            // Deny happening of negative RTG curConsumption
                            let curConsumption = RTG.curConsumption > 0 ? RTG.curConsumption : 0;
                            let targetConsumption = RTG.targetConsumption + RTG.forbidXIMAAmt;
                            let currentDifference = targetConsumption - curConsumption;

                            if (incValidAmt <= currentDifference) {
                                validAmtToAdd = incValidAmt;
                                incValidAmt = 0;
                            } else {
                                validAmtToAdd = currentDifference;
                                incValidAmt -= currentDifference;
                            }

                            // LBKeno condition where bonusAmount is sent on first time
                            if (RTG.currentAmt + incBonusAmt >= 0) {
                                validBonusToAdd = incBonusAmt;
                                incBonusAmt = 0;
                            } else {
                                validBonusToAdd = -RTG.currentAmt;

                                if (incBonusAmt >= 0) {
                                    incBonusAmt -= RTG.currentAmt;
                                } else {
                                    incBonusAmt += RTG.currentAmt;
                                }
                            }

                            // Find available RTG to update
                            updateRTG(RTG, validBonusToAdd, validAmtToAdd, oldData);
                        }
                    })
                }
            }
        )
    }
}

function createBaccaratConsumption (providerObjId, providerName, consumptionRecord, oldConsumtionObjId) {
    let regexPattern = new RegExp('百家乐','g');
    let pairResultObj = {}; // for ebet only
    if (consumptionRecord && consumptionRecord.cpGameType && consumptionRecord.result && regexPattern.test(consumptionRecord.cpGameType)) {
        let baccaratResult;
        if (consumptionRecord.providerId ==  '56'/*"18"*/) { // EBET // todo :: change back to 56 for live
            baccaratResult = readEBETBaccaratResult(consumptionRecord.result, pairResultObj);
        } else if (consumptionRecord.providerId == '16') { // AG
            baccaratResult = readAGBaccaratResult(consumptionRecord.result);
        } else if (consumptionRecord.providerId == '55') { // BYLIVE
            baccaratResult = readBYBaccaratResult(consumptionRecord.result);
        }

        if (baccaratResult && baccaratResult.hasOwnProperty("host") && baccaratResult.hasOwnProperty("player")) {
            let saveData = {
                platform: consumptionRecord.platformId,
                player: consumptionRecord.playerId,
                roundNo: consumptionRecord.roundNo || "",
                bonusAmount: consumptionRecord.bonusAmount || 0,
                validAmount: consumptionRecord.validAmount || 0,
                provider: providerObjId || consumptionRecord.providerId ,
                providerName: providerName || "",
                hostResult: baccaratResult.host || 0,
                playerResult: baccaratResult.player || 0,
                betDetails: consumptionRecord.betDetails || [],
                bUsed: false,
                insertTime: consumptionRecord.insertTime,
                createTime: consumptionRecord.createTime,
                consumption: consumptionRecord._id
            };

            if (pairResultObj.host) {
                saveData.hostPairResult = pairResultObj.host;
            }
            if (pairResultObj.player) {
                saveData.playerPairResult = pairResultObj.player;
            }

            if (oldConsumtionObjId) {
                delete saveData.consumption;
                dbconfig.collection_baccaratConsumption.findOneAndUpdate({consumption: oldConsumtionObjId}, saveData).catch(errorUtils.reportError);
            } else {
                dbconfig.collection_baccaratConsumption(saveData).save().catch(errorUtils.reportError);
            }
        }
    }
}

function readAGBaccaratResult (resultStr) {
    let strSplit;
    resultStr = resultStr || "";
    strSplit = resultStr.split(",");
    let playerStr = "";
    let hostStr = "";
    if (!strSplit || !strSplit[0] || !strSplit[1]) {
        return false;
    }
    else if (strSplit[0].includes("闲")) {
        [playerStr, hostStr] = strSplit;
    }
    else if (strSplit[1].includes("闲")) {
        [hostStr, playerStr] = strSplit;
    }
    else {
        return false;
    }

    return {
        host: getBaccaratNumber(hostStr),
        player: getBaccaratNumber(playerStr)
    };

    function getBaccaratNumber (str) {
        let total = 0;
        for (let i = 0; i <= 9; i++) {
            total += (dbUtility.countOccurrenceInString(str, String(i)) * i);
        }

        return total;
    }
}

function readBYBaccaratResult (resultStr) {
    resultStr = resultStr || "";

    let strSplit = resultStr.split(",");
    if (!strSplit || !strSplit[0] || !strSplit[1]) {
        return false;
    }

    return {
        host: Number(strSplit[0]),
        player: Number(strSplit[1])
    };
}

function readEBETBaccaratResult (resultStr, pairResultObj) {
    let strSplit;
    resultStr = resultStr || "";
    strSplit = resultStr.split(")(");
    let playerStr = "";
    let hostStr = "";
    if (!strSplit || !strSplit[0] || !strSplit[1]) {
        return false;
    }
    else if (strSplit[0].includes("闲")) {
        [playerStr, hostStr] = strSplit;
    }
    else if (strSplit[1].includes("闲")) {
        [hostStr, playerStr] = strSplit;
    }
    else {
        return false;
    }

    return {
        host: getBaccaratNumber(hostStr, "host"),
        player: getBaccaratNumber(playerStr, "player")
    };

    function getBaccaratNumber (str, pairObjField) {
        let total = 0;
        let splitedResult = str.split("|");
        let firstTwoResult = splitedResult && splitedResult[0] && splitedResult[1] && String(splitedResult[0] + splitedResult[1]) || "";

        total += dbUtility.countOccurrenceInString(str, "Ace");
        if (pairResultObj && firstTwoResult) {
            let checkPairArr = ["Ace", "Jack", "Queen", "King"];
            for (let j = 0; j < checkPairArr.length; j++) {
                if (dbUtility.countOccurrenceInString(firstTwoResult, checkPairArr[j]) == 2) {
                    pairResultObj[pairObjField] = checkPairArr[j];
                    break;
                }
            }
        }
        for (let i = 2; i <= 10; i++) {
            total += (dbUtility.countOccurrenceInString(str, String(i)) * i);
            if (pairResultObj && !pairResultObj[pairObjField]) {
                if (dbUtility.countOccurrenceInString(firstTwoResult, String(i)) == 2) {
                    pairResultObj[pairObjField] = String(i);
                }
            }
        }

        total %= 10;

        return total;
    }
}

// module.exports = dbPlayerConsumptionRecord;
var proto = dbPlayerConsumptionRecordFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionRecord);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionRecord;
