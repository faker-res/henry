/*
 * Calculate player weekly consumption return event
 */

var Q = require("q");
var constRewardType = require('../const/constRewardType');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');

let consumptionReturnEvent = {

    /*
     * start weekly consumption return event check for platform
     */
    checkPlatformWeeklyConsumptionReturnEvent: function (platformId, selectedEvent) {
        if (selectedEvent && selectedEvent.length > 0) {
            let promArr = [];

            selectedEvent.map(eventData => {
                if (eventData && eventData.param && eventData.param.ratio && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    promArr.push(dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, eventData, eventData.executeProposal, eventData.settlementPeriod));
                }
            });

            return Promise.all(promArr);
        } else {
            return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSUMPTION_RETURN).then(
                eventData => {
                    //check if reward event has the correct data for consecutive top up event
                    //todo::add rate range check here later
                    if (eventData && eventData.param && eventData.param.ratio && eventData.executeProposal) {
                        //get all the players has top up for more than min amount yesterday
                        return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, eventData, eventData.executeProposal, eventData.settlementPeriod);
                    }
                    else {
                        //platform doesn't have this reward event
                        return Promise.resolve(false);
                    }
                },
                error => {
                    return Promise.reject({name: "DBError", message: "Error finding reward events for platform.", error: error});
                }
            ).then(
                data => data,
                error => Promise.reject({name: "DBError", message: "Error checking weekly player consumption return for platform.", error: error})
            );
        }
    }

};

module.exports = consumptionReturnEvent;