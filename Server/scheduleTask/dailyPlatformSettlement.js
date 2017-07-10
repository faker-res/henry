/*
 * Daily platform settlement
 */

var Q = require("q");
var dbUtil = require('./../modules/dbutility');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlatform = require('../db_modules/dbPlatform');
var constPlatformStatus = require('../const/constPlatformStatus');
var playerSummary = require('./playerSummary');
var dbconfig = require('./../modules/dbproperties');
var constRewardType = require('../const/constRewardType');
const rewardUtil = require("../modules/rewardUtility");
var promiseUtils = require("../modules/promiseUtils");
const constSettlementPeriod = require("../const/constSettlementPeriod");
var platformRewardSettlement = require("./platformRewardSettlement");
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbLogger = require('../modules/dbLogger');
var dbPartner = require('../db_modules/dbPartner');
var dbRewardTask = require('../db_modules/dbRewardTask');
var moment = require('moment-timezone');

var dailyPlatformSettlement = {

    /*
     * Start daily settlement for platform, check status and start calculation
     * @param {Platform} platformData - the platform document
     */
    startDailyPlatformSettlement: function (platformData) {
        var deferred = Q.defer();

        //check platform's current status and settlement time
        var curTime = new Date();
        var dailySettlementTime = moment().tz('Asia/Singapore').toDate().setHours(platformData.dailySettlementHour, platformData.dailySettlementMinute, 0, 0);

        var dailySettlementStartTime = dbUtil.getYesterdaySGTime().startTime;
        //if platform is not doing any settlement and settlement time has been reached and last settlement time is older
        if (platformData && platformData._id && platformData.canAutoSettlement && platformData.settlementStatus == constPlatformStatus.READY
            && dailySettlementTime <= curTime.getTime() &&
            ( !platformData.lastDailySettlementTime || dailySettlementTime > platformData.lastDailySettlementTime.getTime() )) {

            dbPlatform.updatePlatform({_id: platformData._id}, {settlementStatus: constPlatformStatus.DAILY_SETTLEMENT}).then(
                function (data) {
                    //start daily settlement for all the params
                    if (data) {
                        return dailyPlatformSettlement.calculateDailyPlatformSettlement(platformData._id);
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't update platform status!"});
                    }
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error updating platform status!", error: error});
                }
            ).then(
                //change platform status back to ready when settlement finished
                function (data) {
                    var now = new Date();
                    return dbPlatform.updatePlatform(
                        {_id: platformData._id},
                        {lastDailySettlementTime: now, settlementStatus: constPlatformStatus.READY}
                    );
                },
                function (error) {
                    deferred.reject({
                        name: "DBError",
                        message: "Error doing daily settlement for platform!",
                        error: error
                    });
                    //mark the platform as having failed settlement
                    var now = new Date();
                    return dbPlatform.updatePlatform(
                        {_id: platformData._id},
                        {settlementStatus: constPlatformStatus.DAILY_ERROR}
                    );
                }
            ).then(
                function (data) {
                    //if update status successfully, daily settlement is finished
                    if (data) {
                        deferred.resolve(true);
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't update platform status!"});
                    }

                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error updating platform status!", error: error});
                }
            );
        }
        else {
            deferred.resolve(false);
        }

        return deferred.promise.then(
            data => {
                if (data) {
                    dbLogger.createSettlementLog("platform", "daily", platformData._id, dailySettlementStartTime, true, data);
                    return data;
                }
            },
            error => {
                dbLogger.createSettlementLog("platform", "daily", platformData._id, dailySettlementStartTime, false, error);
                return Q.reject(error);
            }
        );
    },

    /*
     * Manually retry daily settlement for platform
     * @param {objectId} platformId - platform id
     */
    manualDailyPlatformSettlement: function (platformId, bFix) {
        var platformObjId = null;
        var curTime = new Date();
        var bUpdateStatus = true;
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    var checkStatus = bFix ? constPlatformStatus.DAILY_ERROR : constPlatformStatus.READY;
                    if (platformData.settlementStatus == checkStatus &&
                        (!platformData.lastDailySettlementTime || !dbUtil.isSameDaySG(platformData.lastDailySettlementTime, curTime))) {
                        return dbPlatform.updatePlatform({_id: platformObjId}, {settlementStatus: constPlatformStatus.DAILY_SETTLEMENT});
                    }
                    else {
                        bUpdateStatus = false;
                        if (platformData.settlementStatus != checkStatus) {
                            return Q.reject({
                                name: "DataError",
                                message: "Can not start platform daily settlement now because of incorrect status"
                            });
                        }
                        else {
                            return Q.reject({
                                name: "DataError",
                                message: "Can not start platform daily settlement now because this platform has been settled today"
                            });
                        }
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform"});
                }
            }
        ).then(
            data => {
                return dailyPlatformSettlement.calculateDailyPlatformSettlement(platformObjId);
            }
        ).then(
            data => {
                var now = new Date();
                return dbPlatform.updatePlatform(
                    {_id: platformObjId},
                    {lastDailySettlementTime: now, settlementStatus: constPlatformStatus.READY}
                );
            },
            error => {
                //mark the platform as having failed settlement
                if (bUpdateStatus) {
                    return dbPlatform.updatePlatform(
                        {_id: platformId},
                        {settlementStatus: constPlatformStatus.DAILY_ERROR}
                    ).then(
                        () => Q.reject(error)
                    );
                }
                else {
                    return Q.reject(error)
                }
            }
        ).then(
            data => {
                if (data) {
                    dbLogger.createSettlementLog("platform", "daily", platformObjId, curTime, true);
                    return true;
                }
            },
            error => {
                dbLogger.createSettlementLog("platform", "daily", platformObjId, curTime, false, error);
                return Q.reject(error);
            }
        );
    },

    /*
     * Calculate daily settlement for platform
     * @param {objectId} platformId - platform id
     */
    calculateDailyPlatformSettlement: function (platformId) {
        return Q.resolve().then(
            () => playerSummary.calculateYesterdayPlayerConsumptionSummary(platformId).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error calculating player consumption summary!",
                    error: error
                })
            )
        ).then(
            () => playerSummary.calculateYesterdayPlayerTopUpSummary(platformId).catch(
                error => Q.reject({name: "DBError", message: "Error calculating player top up summary!", error: error})
            )
        ).then(
            () => playerSummary.calculateYesterdayActiveValidPlayerSummary(platformId).catch(
                error => Q.reject({name: "DBError", message: "Error calculating platform day summary!", error: error})
            )
        ).then(
            () => platformRewardSettlement.startPlatformRewardEventSettlement(platformId, constSettlementPeriod.DAILY).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error performing platform reward event settlement!",
                    error: error
                })
            )
        ).then(
            // We want to do this before the player level data is reset below
            () => dbPlatform.checkPlayerLevelDownForPlatform(platformId).catch(
                error => Q.reject({name: "DBError", message: "Error checking player level down!", error: error})
            )
        ).then(
            () => dbPlatform.resetPlatformPlayerLevelData(platformId).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error resetting platform player level data!",
                    error: error
                })
            )
        );
        //reward task unlock logic is updated so no need this settlement any more
        //     .then(
        //     //check player reward task status
        //     () => dbRewardTask.checkPlatformPlayerRewardTask(platformId)
        // );
    },

    /**
     * Performs a "temporary settlement" which does not update the settlementTimes, so the settlement can be
     * re-calculated again later at the usual settlement time.  This is used to prepare data for the report.
     *
     * @param platformObjId
     * @param bUpdate
     * @param isToday
     */
    manualPlatformPartnerCommissionSettlement: function (platformObjId, bUpdate, isToday) {
        return Q.resolve().then(
            //settlement for partner commission
            () => dbPartner.startPlatformPartnerCommissionSettlement(platformObjId, bUpdate, isToday).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error performing manual platform partner commission settlement!",
                    error: error
                })
            )
        )
        .then(
            //settlement for partner children commission
            () => dbPartner.startPlatformPartnerChildrenCommissionSettlement(platformObjId, bUpdate, isToday).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error performing manual platform partner children commission settlement!",
                    error: error
                })
            )
        );
    },

    /*
     * Todo:: only for testing
     * Calculate daily settlement for platform
     * @param {objectId} platformId - platform id
     */
    calculateTodayPlatformSettlement: function (platformId) {
        return playerSummary.calculateTodayPlayerConsumptionSummary(platformId).then(
            function (data) {
                //if update status successfully, go for next task
                return playerSummary.calculateTodayPlayerTopUpSummary(platformId);
            },
            function (error) {
                return Q.reject({
                    name: "DBError",
                    message: "Error calculating player consumption summary!",
                    error: error
                });
            }
        );
    },

    /*
     * Calculate daily reward event settlement for platform
     * @param {objectId} platformId - platform id
     */
    startDailyPlatformRewardEventSettlement: function (platformId) {
        var deferred = Q.defer();

        //find all reward events for this platform
        dbconfig.collection_rewardEvent.find({platform: platformId})
            .populate({path: "type", model: dbconfig.collection_rewardType}).then(
            function (data) {
                if (data && data.length > 0) {
                    //find reward events that needs settlement
                    const events = data.filter(
                        d => !d.needApply
                    );
                    //sort events based on priority (highest first)
                    events.sort(
                        (a, b) => b.priority - a.priority
                    );
                    // Settle each event in turn
                    var processEvent = function (event) {
                        if (rewardUtil.isValidRewardEvent(event.type.name, event)) {
                            switch (event.type.name) {
                                case constRewardType.PLAYER_CONSUMPTION_INCENTIVE:
                                    if (event && event.param && !event.param.needApply) {
                                        return dbPlatform.calculatePlatformPlayerConsumptionIncentive(platformId, event, event.executeProposal);
                                    }
                                    break;
                                default:
                                    // Some events are processed by others parts of the system, so we just skip them here.
                                    break;
                            }
                        }
                    };
                    var processEventWithTiming = function (event) {
                        console.time(event.type.name);
                        return Q(processEvent(event)).then(
                            () => console.timeEnd(event.type.name)
                        );
                    };
                    //return promiseUtils.each(events, processEvent);
                    return promiseUtils.each(events, processEventWithTiming);
                }
                else {
                    deferred.resolve("No reward event!");
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward event for platform", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve("Done!");
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error calculating reward event for platform",
                    error: error
                });
            }
        );

        return deferred.promise;
    }

};

module.exports = dailyPlatformSettlement;
