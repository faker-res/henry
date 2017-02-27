/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Calculate player weekly consumption return event
 */

var Q = require("q");
var constRewardType = require('../const/constRewardType');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');

var consumptionReturnEvent = {

    /*
     * start weekly consumption return event check for platform
     */
    checkPlatformWeeklyConsumptionReturnEvent: function (platformId) {
        var deferred = Q.defer();

        //get platform consecutive top up reward event data and rule data
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSUMPTION_RETURN).then(
            function (eventData) {
                //check if reward event has the correct data for consecutive top up event
                //todo::add rate range check here later
                if (eventData && eventData.param && eventData.param.ratio && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, eventData, eventData.executeProposal);
                }
                else {
                    //platform doesn't have this reward event
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward events for platform.", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error checking weekly player consumption return for platform.", error: error});
            }
        );

        return deferred.promise;
    }

};

module.exports = consumptionReturnEvent;