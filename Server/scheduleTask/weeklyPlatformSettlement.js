/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Daily platform settlement
 */

var Q = require("q");
var dbconfig = require('./../modules/dbproperties');
var promiseUtils = require('./../modules/promiseUtils');
var dbLogger = require('../modules/dbLogger');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlatform = require('../db_modules/dbPlatform');
var constPlatformStatus = require('../const/constPlatformStatus');
var constRewardType = require('../const/constRewardType');
var playerSummary = require('./playerSummary');
var partnerSummary = require("./partnerSummary.js");
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
var dbPartnerWeekSummary = require("../db_modules/dbPartnerWeekSummary.js");
var dbutility = require("../modules/dbutility.js");
const rewardUtil = require("../modules/rewardUtility");
const constSettlementPeriod = require("../const/constSettlementPeriod");
var platformRewardSettlement = require("./platformRewardSettlement");

var weeklyPlatformSettlement = {

    /*
     * Start daily settlement for platform, check status and start calculation
     * @param {Platform} platformData - the platform document
     */
    startWeeklyPlatformSettlement: function (platformData) {
        var deferred = Q.defer();

        //check platform's current status and settlement time
        var curTime = new Date();

        const settlementTime = dbutility.getWeeklySettlementTimeForPlatform(platformData).endTime;

        //if platform is not doing any settlement and settlement time has been reached and last settlement time is older
        if (platformData && platformData._id && platformData.canAutoSettlement && platformData.settlementStatus == constPlatformStatus.READY
            && settlementTime <= curTime.getTime() &&
            ( !platformData.lastWeeklySettlementTime || settlementTime > platformData.lastWeeklySettlementTime.getTime() )) {

            dbPlatform.updatePlatform({_id: platformData._id}, {settlementStatus: constPlatformStatus.WEEKLY_SETTLEMENT}).then(
                function (data) {
                    //start weekly settlement for all the params
                    if (data) {
                        return weeklyPlatformSettlement.calculateWeeklyPlatformSettlement(platformData._id);
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
                        {lastWeeklySettlementTime: now, settlementStatus: constPlatformStatus.READY}
                    );
                },
                function (error) {
                    console.log(error);
                    deferred.reject({
                        name: "DBError",
                        message: "Error doing weekly settlement for platform!",
                        error: error
                    });
                    var now = new Date();
                    //mark the platform as having failed settlement
                    return dbPlatform.updatePlatform(
                        {_id: platformData._id},
                        {settlementStatus: constPlatformStatus.WEEKLY_ERROR}
                    );
                }
            ).then(
                function (data) {
                    //if update status successfully, weekly settlement is finished
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
        return deferred.promise;
    },

    manualWeeklyPlatformSettlement: function (platformId, bFix) {
        var platformObjId = null;
        var curTime = new Date();
        var bUpdateStatus = true;
        return dbconfig.collection_platform.findOne({_id: platformId}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    var checkStatus = bFix ? constPlatformStatus.WEEKLY_ERROR : constPlatformStatus.READY;
                    //check if platform is doing settlement now, if platform has done settlement for last week and if it is the first day of the month
                    if (platformData.settlementStatus == checkStatus &&
                        (!platformData.lastWeeklySettlementTime || platformData.lastWeeklySettlementTime.toDateString() !== curTime.toDateString())) {
                        return dbPlatform.updatePlatform({platformObjId}, {settlementStatus: constPlatformStatus.WEEKLY_SETTLEMENT});
                    }
                    else {
                        bUpdateStatus = false;
                        if (platformData.settlementStatus != checkStatus) {
                            return Q.reject({
                                name: "DataError",
                                message: "Can not start platform weekly settlement now because of incorrect status"
                            });
                        }
                        else {
                            return Q.reject({
                                name: "DataError",
                                message: "Can not start platform weekly settlement now because this platform has been settled today"
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
                return weeklyPlatformSettlement.calculateWeeklyPlatformSettlement(platformObjId);
            }
        ).then(
            data => {
                var now = new Date();
                return dbPlatform.updatePlatform(
                    {_id: platformObjId},
                    {lastWeeklySettlementTime: now, settlementStatus: constPlatformStatus.READY}
                );
            },
            error => {
                var now = new Date();
                if (bUpdateStatus) {
                    return dbPlatform.updatePlatform(
                        {_id: platformObjId},
                        {settlementStatus: constPlatformStatus.WEEKLY_ERROR}
                    ).then(
                        () => Q.reject(error)
                    );
                }
                else {
                    return Q.reject(error);
                }
            }
        );
    },

    /*
     * Calculate weekly settlement for platform
     * @param {objectId} platformId - platform id
     */
    calculateWeeklyPlatformSettlement: function (platformId) {
        // Note that these catches will allow the later settlements to run.  They will not inform the caller of the failure, but they will log it.
        var settlementTime = null; //dbutility.getLastWeekSGTimeProm().startTime;
        var errArr = [];
        var a = dbutility.getLastWeekSGTimeProm(); //dbPlatform.getWeeklySettlementTimeForPlatformId(platformId)；
        return Q.resolve(a).then(
            function (a) {
                settlementTime = a.startTime;
                return weeklyPlatformSettlement.generateWeeklyPlatformSummaries(platformId);
            }
            // ).catch(
            //     function (error) {
            //         errArr.push(error);
            //         console.error(new Date(), "generateWeeklyPlatformSummaries failed!", error);
            //     }
        ).then(
            function () {
                //return weeklyPlatformSettlement.startWeeklyPlatformRewardEventSettlement(platformId);
                return platformRewardSettlement.startPlatformRewardEventSettlement(platformId, constSettlementPeriod.WEEKLY);
            }
            // ).catch(
            //     function (error) {
            //         errArr.push(error);
            //         console.error(new Date(), "startWeeklyPlatformRewardEventSettlement failed!", error);
            //     }
        ).then(
            function () {
                return partnerSummary.performPartnerLevelMigration(platformId);
            }
            // ).catch(
            //     function (error) {
            //         errArr.push(error);
            //         console.error(new Date(), "performPartnerLevelMigration failed!", error);
            //     }
        ).then(
            // function (data) {
            //     var dbData = {
            //         type: "platform",
            //         interval: "weekly",
            //         id: platformId,
            //         settlementTime: settlementTime
            //     };
            //     if (errArr.length == 0) {
            //         dbData.result = true;
            //     } else if (errArr.length > 0) {
            //         dbData.data = errArr;
            //         dbData.result = false;
            //     }
            //     var settleData = new dbconfig.collection_settlementLog(dbData);
            //     settleData.save();
            //     return data;
            // }
            data => {
                if (data) {
                    dbLogger.createSettlementLog("platform", "weekly", platformId, settlementTime, true);
                    return data;
                }
            },
            error => {
                dbLogger.createSettlementLog("platform", "weekly", platformId, settlementTime, false, error);
                return Q.reject(error);
            }
        );
    },

    generateWeeklyPlatformSummaries: function (platformId) {
        return Q.resolve().then(
            () => {
                return playerSummary.calculateLastWeekPlayerConsumptionSummary(platformId);
            }
            // ).catch(
            //     function (error) {
            //         console.error(new Date(), "calculateLastWeekPlayerConsumptionSummary failed!", error);
            //     }
        ).then(
            () => {
                return playerSummary.calculateLastWeekPlayerTopUpSummary(platformId);
            }
            // ).catch(
            //     function (error) {
            //         console.error(new Date(), "calculateLastWeekPlayerTopUpSummary failed!", error);
            //     }
        ).then(
            () => {
                return partnerSummary.calculateWeekSummary(platformId);
            }
            // ).catch(
            //     function (error) {
            //         console.error(new Date(), "calculateWeekSummary failed!", error);
            //     }
            // ).then(
            //     () => {
            //         return dbPlatform.resetPlatformPlayerLevelData(platformId, true);
            //     }
        );
        //     .catch(
        //     function (error) {
        //         console.error(new Date(), "resetPlatformPlayerLevelData failed!", error);
        //     }
        // );
    },

    /*
     * Calculate weekly reward event settlement for platform
     * @param {objectId} platformId - platform id
     */
    startWeeklyPlatformRewardEventSettlement: function (platformId) {
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
                                case constRewardType.FULL_ATTENDANCE:
                                    return dbPlayerTopUpDaySummary.checkPlatformFullAttendanceStream(platformId, event, event.executeProposal);
                                    break;
                                case constRewardType.PLAYER_CONSUMPTION_RETURN:
                                    return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, event, event.executeProposal);
                                    break;
                                case constRewardType.PARTNER_CONSUMPTION_RETURN:
                                    return dbPartnerWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, event, event.executeProposal);
                                    break;
                                case constRewardType.PARTNER_REFERRAL_REWARD:
                                    return dbPartnerWeekSummary.checkPartnerWeeklyReferralReward(platformId, event, event.executeProposal);
                                    break;
                                case constRewardType.PARTNER_INCENTIVE_REWARD:
                                    return dbPartnerWeekSummary.checkPartnerWeeklyIncentiveReward(platformId, event, event.executeProposal);
                                    break;
                                case constRewardType.PARTNER_TOP_UP_RETURN:
                                    return dbPartnerWeekSummary.checkPlatformWeeklyTopUpReturn(platformId, event, event.executeProposal);
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

module.exports = weeklyPlatformSettlement;