/*
 * Calculate partner weekly Incentive reward event
 */

var Q = require("q");
var constRewardType = require('../const/constRewardType');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbPartnerWeekSummary = require('../db_modules/dbPartnerWeekSummary');

var partnerIncentiveRewardEvent = {

    /*
     * start weekly partner referral reward event - check for platform
     */
    checkPartnerIncentiveRewardEvent: function (platformId) {
        //get platform incentive reward event data and rule data
        return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PARTNER_INCENTIVE_REWARD).then(
            function (eventData) {

                if (eventData && eventData.condition && eventData.executeProposal) {

                    //get all the partners who are deserved for incentive reward
                    // return the proposals for all qualified partners
                    return dbPartnerWeekSummary.checkPartnerWeeklyIncentiveReward(platformId, eventData);
                }
                else {
                    //platform doesn't have this reward event
                    return false;
                }
            }
        );
    }

};

module.exports = partnerIncentiveRewardEvent;
