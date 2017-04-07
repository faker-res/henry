/*
 * Calculate partner weekly consumption return event
 */

var Q = require("q");
var constRewardType = require('../const/constRewardType');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbPartnerWeekSummary = require('../db_modules/dbPartnerWeekSummary');

var partnerConsumptionReturnEvent = {

    /*
     * start weekly partner consumption return event check for platform
     */
    checkPlatformWeeklyConsumptionReturnEvent: function (platformId) {
        //get platform consecutive top up reward event data and rule data
        return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PARTNER_CONSUMPTION_RETURN).then(
            function (eventData) {
                //check if reward event has the correct data for partner consumption return event
                if (eventData && eventData.condition && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    return dbPartnerWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, eventData, eventData.executeProposal);
                }
                else {
                    return "Platform doesn't have this reward event";
                }
            }
        );
    }

};

module.exports = partnerConsumptionReturnEvent;