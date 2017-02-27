/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var Q = require("q");
var dbconfig = require('./../modules/dbproperties');
var promiseUtils = require('./../modules/promiseUtils');

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

var platformRewardSettlement = {

    /*
     * Calculate weekly reward event settlement for platform
     * @param {objectId} platformId - platform id
     */
    startPlatformRewardEventSettlement: function (platformId, period) {
        var deferred = Q.defer();

        //find all reward events for this platform
        dbconfig.collection_rewardEvent.find({platform: platformId})
            .populate({path: "type", model: dbconfig.collection_rewardType}).then(
            function (data) {
                if (data && data.length > 0) {
                    //find reward events that needs settlement
                    const events = data.filter(
                        d => d.needSettlement
                    );
                    //sort events based on priority (highest first)
                    events.sort(
                        (a, b) => b.priority - a.priority
                    );
                    // Settle each event in turn
                    var processEvent = function (event) {
                        //check if reward event is valid and if settlement period is correct
                        if (rewardUtil.isValidRewardEvent(event.type.name, event) && event.settlementPeriod == period) {
                            //check reward event valid time
                            var curTime = new Date();
                            if ((event.validStartTime && curTime.getTime() < event.validStartTime.getTime()) ||
                                (event.validEndTime && curTime.getTime() > event.validEndTime.getTime())) {
                                return;
                            }
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
                                case constRewardType.PLAYER_CONSUMPTION_INCENTIVE:
                                    if (event && event.param) {
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

module.exports = platformRewardSettlement;


