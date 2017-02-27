/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Calculate provider's daily summary
 */
var Q = require('q');

var dbconfig = require('./../modules/dbproperties');
var dbutility = require('./../modules/dbutility');
var dbGameProviderDaySummary = require('../db_modules/dbGameProviderDaySummary');
var dbGameProviderPlayerDaySummary = require('../db_modules/dbGameProviderPlayerDaySummary');

var providerSummary = {

    /*
     * Calculate provider's daily summary
     * @param {objectId} providerId - provider id
     */
    calculateYesterdayProviderSummary: function (providerId) {
        var deferred = Q.defer();

        dbconfig.collection_gameProvider.findOne({_id: providerId}).then(
            function (providerData) {
                if (providerData) {
                    //var settleTime = dbutility.getDailySettlementTime(providerData.dailySettlementHour, providerData.dailySettlementMinute);
                    var settleTime = dbutility.getYesterdaySGTime();
                    return dbGameProviderDaySummary.calculateProviderDaySummaryForTimeFrame(settleTime.startTime, settleTime.endTime, providerId);
                }
                else {
                    deferred.resolve("NoPlatform");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding provider!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating provider day summary", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * Calculate provider's daily summary
     * @param {objectId} providerId - provider id
     */
    calculateTodayProviderSummary: function (providerId) {
        var endTime = new Date();
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        return dbGameProviderDaySummary.calculateProviderDaySummaryForTimeFrame(startTime, endTime, providerId);
    },

    /*
     * Calculate provider's daily summary
     * @param {objectId} providerId - provider id
     */
    calculateYesterdayProviderPlayerSummary: function (providerId) {
        var deferred = Q.defer();

        dbconfig.collection_gameProvider.findOne({_id: providerId}).then(
            function (providerData) {
                if (providerData) {
                    //var settleTime = dbutility.getDailySettlementTime(providerData.dailySettlementHour, providerData.dailySettlementMinute);
                    var settleTime = dbutility.getYesterdaySGTime();
                    return dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForTimeFrame(settleTime.startTime, settleTime.endTime, providerId);
                }
                else {
                    deferred.resolve("NoPlatform");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding provider!", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error calculating provider day summary", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * Calculate provider's daily summary
     * @param {objectId} providerId - provider id
     */
    calculateTodayProviderPlayerSummary: function (providerId) {
        var endTime = new Date();
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        return dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForTimeFrame(startTime, endTime, providerId);
    }
};

module.exports = providerSummary;