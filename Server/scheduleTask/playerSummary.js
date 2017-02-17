/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Calculate player's daily and weekly summary
 */
var Q = require('q');

var dbconfig = require('./../modules/dbproperties');
var dbutility = require('./../modules/dbutility');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
var dbPlayerGameTypeConsumptionWeekSummary = require('../db_modules/dbPlayerGameTypeConsumptionWeekSummary');
var dbPlatform = require('../db_modules/dbPlatform');

var playerSummary = {

    /*
     * Calculate player's daily total top up amount and save into summary
     * @param {objectId} platformId - platform id
     */
    calculateYesterdayPlayerTopUpSummary: function (platformId) {
        var deferred = Q.defer();

        dbconfig.collection_platform.findOne({_id: platformId}).then(
            function (platformData) {
                if (platformData) {
                    //var settleTime = dbutility.getDailySettlementTime(platformData.dailySettlementHour, platformData.dailySettlementMinute);
                    var settleTime = dbutility.getYesterdaySGTime();
                    return dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(settleTime.startTime, settleTime.endTime, platformId);
                }
                else {
                    deferred.resolve("NoPlatform");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating platform day summary", error: error});
            }
        );

        return deferred.promise;
    },

    // getTopUp and consumption summary and calculate for valid and active
    calculateYesterdayActiveValidPlayerSummary: function (platformId) {
        var deferred = Q.defer();
        dbconfig.collection_platform.findOne({_id: platformId}).then(
            function (platformData) {
                if (platformData) {
                    //var settleTime = dbutility.getDailySettlementTime(platformData.dailySettlementHour, platformData.dailySettlementMinute);
                    var settleTime = dbutility.getYesterdaySGTime();
                    return dbPlayerTopUpDaySummary.calculatePlatformActiveValidPlayerDaySummaryForTimeFrame(settleTime.startTime, settleTime.endTime, platformId);
                } else {
                    deferred.resolve("NoPlatform");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating platform day summary", error: error});
            }
        );
        return deferred.promise;
    },

    /*
     * Calculate player's daily total top up amount and save into summary
     * @param {objectId} platformId - platform id
     */
    calculateTodayPlayerTopUpSummary: function (platformId) {
        var time = dbutility.getTodaySGTime();
        return dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(time.startTime, time.endTime, platformId);
    },

    /*
     * Calculate player's weekly total top up amount and save into summary
     * @param {objectId} platformId - platform id
     */
    calculateLastWeekPlayerTopUpSummary: function (platformId) {
        var deferred = Q.defer();

        //dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                return dbPlayerTopUpWeekSummary.calculatePlatformWeekSummaryForTimeFrame(settleTime.startTime, settleTime.endTime, platformId);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating platform weekly top up summary", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * Calculate player's daily total consumption amount and save into summary
     * @param {objectId} platformId - platform id
     */
    calculateYesterdayPlayerConsumptionSummary: function (platformId) {
        var deferred = Q.defer();

        dbconfig.collection_platform.findOne({_id: platformId}).then(
            function (platformData) {
                if (platformData) {
                    //var settleTime = dbutility.getDailySettlementTime(platformData.dailySettlementHour, platformData.dailySettlementMinute);
                    var settleTime = dbutility.getYesterdaySGTime();
                    return dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(settleTime.startTime, settleTime.endTime, platformId);
                }
                else {
                    deferred.resolve("NoPlatform");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating platform day summary", error: error});
            }
        );

        // var prom2 = dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, platformId);

        return deferred.promise;
    },

    /*
     * Calculate player's daily total consumption amount and save into summary
     * @param {objectId} platformId - platform id
     */
    calculateTodayPlayerConsumptionSummary: function (platformId) {
        var time = dbutility.getTodaySGTime();
        var prom1 = dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(time.startTime, time.endTime, platformId);
        // var prom2 = dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, platformId);
        // return Q.all([prom1, prom2]);
        return prom1;
    },

    /*
     * Todo::to be removed
     * Calculate player's daily total game type consumption amount and save into summary
     * @param {objectId} platformId - platform id
     */
    /*
     calculateYesterdayPlayerGameTypeConsumptionSummary: function(platformId){
     var endTime = new Date();
     endTime.setHours(0, 0, 0, 0);
     var startTime = new Date();
     startTime.setHours(0, 0, 0, 0);
     startTime.setDate(endTime.getDate() - 1);

     return dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, platformId);
     },
     */

    /*
     * Calculate player's weekly total consume amount and save into summary
     * @param {objectId} platformId - platform id
     */
    calculateLastWeekPlayerConsumptionSummary: function (platformId) {
        //var prom2 = dbPlayerGameTypeConsumptionWeekSummary.calculatePlatformWeekSummaryForTimeFrame(startTime, endTime, platformId);
        var deferred = Q.defer();

        //dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                return dbPlayerConsumptionWeekSummary.calculatePlatformWeekSummaryForTimeFrame(settleTime.startTime, settleTime.endTime, platformId);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platform!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating platform weekly consumption summary", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * Calculate player's weekly total consume amount and save into summary
     * @param {objectId} platformId - platform id
     */
    // calculateLastWeekPlayerGameTypeConsumptionSummary: function(platformId){
    //     var endTime = new Date();
    //     endTime.setHours(0, 0, 0, 0);
    //     var startTime = new Date();
    //     startTime.setHours(0, 0, 0, 0);
    //     startTime.setDate(endTime.getDate() - 7);
    //
    //     return dbPlayerGameTypeConsumptionWeekSummary.calculatePlatformWeekSummaryForTimeFrame(startTime, endTime, platformId);
    // }

};

module.exports = playerSummary;