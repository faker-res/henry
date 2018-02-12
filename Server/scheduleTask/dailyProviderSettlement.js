/*
 * Daily provider settlement
 */

var Q = require("q");
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbGameProvider = require('../db_modules/dbGameProvider');
var dbGameProviderPlayerDaySummary = require("../db_modules/dbGameProviderPlayerDaySummary");
var dbGameProviderDaySummary = require("../db_modules/dbGameProviderDaySummary");
var providerSummary = require('./providerSummary');
var dbconfig = require('./../modules/dbproperties');
var dbLogger = require('../modules/dbLogger');
var dbutility = require('../modules/dbutility');

const constSettlementStatus = require('../const/constPlatformStatus');
const constSystemParam = require('../const/constSystemParam');

let dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');

let SettlementBalancer = require('../settlementModule/settlementBalancer');

let dailyProviderSettlement = {

    /*
     * Start daily settlement for provider, check status and start calculation
     * @param {objectId} providerId - provider id
     */
    startDailyProviderSettlement: function (providerData) {
        var deferred = Q.defer();

        //check provider's current status and settlement time
        var curTime = new Date();
        var dailySettlementTime = new Date();
        dailySettlementTime.setHours(providerData.dailySettlementHour);
        dailySettlementTime.setMinutes(providerData.dailySettlementMinute);
        dailySettlementTime.setSeconds(0);
        dailySettlementTime.setMilliseconds(0);

        let settleTime = dbutility.getYesterdaySGTime();

        //if provider is not doing any settlement and settlement time has been reached and last settlement time is older
        if (providerData && providerData._id && providerData.settlementStatus == constSettlementStatus.READY
            && dailySettlementTime.getTime() <= curTime.getTime() &&
            ( !providerData.lastDailySettlementTime || dailySettlementTime.getTime() > providerData.lastDailySettlementTime.getTime() )) {

            dbGameProvider.updateGameProvider({_id: providerData._id}, {settlementStatus: constSettlementStatus.DAILY_SETTLEMENT}).then(
                data => {
                    //start daily settlement for all the params
                    if (data) {
                        return dailyProviderSettlement.calculateDailyProviderSettlement(providerData._id, settleTime);
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't update provider status!"});
                    }
                },
                error => {
                    deferred.reject({name: "DBError", message: "Error updating provider status!", error: error});
                }
            ).then(
                //change provider status back to ready when settlement finished
                function (data) {
                    var now = new Date();
                    return dbGameProvider.updateGameProvider(
                        {_id: providerData._id},
                        {lastDailySettlementTime: now, settlementStatus: constSettlementStatus.READY}
                    );
                },
                function (error) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error doing daily settlement for provider!",
                        error: error
                    });
                    //mark the settlement as having failed
                    return dbGameProvider.updateGameProvider(
                        {_id: providerData._id},
                        {settlementStatus: constSettlementStatus.DAILY_ERROR}
                    );
                }
            ).then(
                function (data) {
                    //if update status successfully, daily settlement is finished
                    if (data) {
                        deferred.resolve(true);
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't update provider status!"});
                    }
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error updating provider status!", error: error});
                }
            );
        }
        else {
            deferred.resolve(false);
        }

        return deferred.promise.then(
            data => {
                if (data) {
                    dbLogger.createSettlementLog("provider", "daily", providerData._id, dailySettlementTime, true, data);
                    return data;
                }
            },
            error => {
                dbLogger.createSettlementLog("provider", "daily", providerData._id, dailySettlementTime, false, error);
                return Q.reject(error);
            }
        );
    },

    fixYesterdayProviderDailySettlement: function(providerId){
        let settleTime = dbutility.getYesterdaySGTime();
        return dbconfig.collection_gameProvider.findOne({_id: providerId}).then(
            providerData => {
                if (providerData && providerData.settlementStatus == constSettlementStatus.DAILY_ERROR) {
                    return dbGameProvider.updateGameProvider({_id: providerData._id}, {settlementStatus: constSettlementStatus.DAILY_SETTLEMENT});
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find provider or provider is already settled"});
                }
            }
        ).then(
            data => {
                return dailyProviderSettlement.calculateDailyProviderSettlement(providerId, settleTime);
            }
        ).then(
            data => {
                return dbGameProvider.updateGameProvider(
                    {_id: providerId},
                    {settlementStatus: constSettlementStatus.READY}
                );
            },
            error => {
                return dbGameProvider.updateGameProvider(
                    {_id: providerId},
                    {settlementStatus: constSettlementStatus.DAILY_ERROR}
                ).then(
                    () => Q.reject(error)
                );
            }
        ).then(
            data => {
                if (data) {
                    dbLogger.createSettlementLog("provider", "daily", providerId, settleTime.startTime, true, data);
                    return data;
                }
            },
            error => {
                dbLogger.createSettlementLog("provider", "daily", providerId, settleTime.startTime, false, error);
                return Q.reject(error);
            }
        );
    },

    manualDailyProviderSettlement: function (providerId, settlementDay, platformId) {
        let startTime = dbutility.getDayStartTime(settlementDay);
        let endTime = dbutility.getDayEndTime(settlementDay);
        let providerObj = null;
        return dbconfig.collection_gameProvider.findOne({_id: providerId}).then(
            providerData => {
                if (providerData && providerData.settlementStatus == constSettlementStatus.READY) {
                    providerObj = providerData;
                    return dbGameProvider.updateGameProvider({_id: providerData._id}, {settlementStatus: constSettlementStatus.DAILY_SETTLEMENT});
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find provider or provider is not ready"});
                }
            }
        ).then(
            data => {
                if( providerObj ){
                    return removeDuplicatedConsumptionRecords(startTime, endTime, providerObj._id);
                }
            }
        ).then(
            data => {
                return dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForTimeFrame(startTime, endTime, providerId, platformId);
            }
        ).then(
            data => {
                return dbGameProviderDaySummary.calculateProviderDaySummaryForTimeFrame(startTime, endTime, providerId, platformId);
            }
        ).then(
            data => {
                return dbGameProvider.updateGameProvider(
                    {_id: providerId},
                    {settlementStatus: constSettlementStatus.READY}
                );
            },
            error => {
                return dbGameProvider.updateGameProvider(
                    {_id: providerId},
                    {settlementStatus: constSettlementStatus.DAILY_ERROR}
                ).then(
                    () => Q.reject(error)
                );
            }
        ).then(
            data => {
                if (data) {
                    dbLogger.createSettlementLog("provider", "daily", providerId, startTime, true, data);
                    return data;
                }
            },
            error => {
                dbLogger.createSettlementLog("provider", "daily", providerId, startTime, false, error);
                return Q.reject(error);
            }
        );
    },

    /*
     * Calculate daily settlement for provider
     * @param {objectId} providerId - provider id
     */
    calculateDailyProviderSettlement: function (providerId, settleTime) {
        let deferred = Q.defer();

        //todo::add more daily settlement calculation here
        removeDuplicatedConsumptionRecords(settleTime.startTime, settleTime.endTime, providerId).then(
            () => {
                return providerSummary.calculateYesterdayProviderPlayerSummary(providerId)
            }
        ).then(
            data => {
                return providerSummary.calculateYesterdayProviderSummary(providerId);
            },
            error => {
                deferred.reject({
                    name: "DBError",
                    message: "Error calculating provider player daily summary!",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve("Provider " + providerId + " daily settlement done");
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating provider daily summary!", error: error});
            }
        );

        return deferred.promise;
    },

    /* Todo:: for testing only
     * Calculate today settlement for provider
     * @param {objectId} providerId - provider id
     */
    calculateTodayProviderSettlement: function (providerId) {
        var deferred = Q.defer();

        //todo::add more daily settlement calculation here
        providerSummary.calculateTodayProviderPlayerSummary(providerId).then(
            function (data) {
                return providerSummary.calculateTodayProviderSummary(providerId);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error calculating provider player daily summary!",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve("Provider " + providerId + " daily settlement done");
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating provider daily summary!", error: error});
            }
        );

        return deferred.promise;
    }
};

let removeDuplicatedConsumptionRecords = function (startTime, endTime, providerObjId) {
    
    // Find duplicate consumption records
    let balancer = new SettlementBalancer();
    let stream = dbconfig.collection_playerConsumptionRecord.aggregate(
        {
            $match: {
                createTime: {
                    $gte: startTime,
                    $lt: endTime
                },
                providerId: providerObjId
            }
        },
        {
            $group: {
                _id: {orderNo: '$orderNo'},
                uniqueIds: {$addToSet: "$_id"},
                count: {$sum: 1}
            }
        },
        {
            $match: {
                count: { $gte: 2 }
            }
        }
    ).cursor({batchSize: 100}).allowDiskUse(true).exec();

    return balancer.initConns().then(() => {
        return Q(
            balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (dupsSummariesData, request) {
                        request("player", "markDuplicatedConsumptionRecords", {
                            dupsSummariesData: dupsSummariesData
                        });
                    }
                }
            )
        )
    }
    )
};

module.exports = dailyProviderSettlement;
