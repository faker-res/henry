/*
 * Calculate partner weekly Referral reward event
 */

var Q = require("q");
var constRewardType = require('../const/constRewardType');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbPartnerWeekSummary = require('../db_modules/dbPartnerWeekSummary');

var partnerReferralRewardEvent = {

    /*
     * start weekly partner referral reward event - check for platform
     */
    checkPartnerReferralRewardEvent: function (platformId) {
        var deferred = Q.defer();

        //get platform consecutive top up reward event data and rule data
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PARTNER_REFERRAL_REWARD).then(
            function (eventData) {

                //check if reward event has the correct data for consecutive top up event
                //todo::add rate range check here later
                if (eventData && eventData.condition && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday

                    return dbPartnerWeekSummary.checkPartnerWeeklyReferralReward(platformId, eventData);
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
                deferred.reject({name: "DBError", message: "Error checking partner consumption return for platform.", error: error});
            }
        );

        return deferred.promise;
    }

};

module.exports = partnerReferralRewardEvent;