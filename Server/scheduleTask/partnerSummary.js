/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var dbPartnerWeekSummary = require('../db_modules/dbPartnerWeekSummary');
var dbutility = require("../modules/dbutility.js");
var dbconfig = require("../modules/dbproperties.js");

var partnerSummary = {

    /*
     * Calculate partner's week summary
     * @param {objectId} platformId - platform id
     */
    calculateWeekSummary: function(platformId){
        //return dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        return dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                return dbPartnerWeekSummary.calculatePlatformPartnerWeekSummary(platformId, settleTime.startTime, settleTime.endTime).then(
                    () => dbPartnerWeekSummary.calculatePlatformPartnerChildWeekSummary(platformId, settleTime.startTime, settleTime.endTime)
                );
            }
        );
    },

    performPartnerLevelMigration: function(platformId){
        //return dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        return dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                return dbPartnerWeekSummary.performPartnerLevelMigration(platformId, settleTime.startTime, settleTime.endTime);
            }
        );
    }

};

module.exports = partnerSummary;