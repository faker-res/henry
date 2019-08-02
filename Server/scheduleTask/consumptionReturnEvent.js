/*
 * Calculate player weekly consumption return event
 */

var Q = require("q");
const constProposalStatus = require('../const/constProposalStatus');
var constRewardType = require('../const/constRewardType');
const constSettlementPeriod = require('../const/constSettlementPeriod');

var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');

const dbConfig = require('./../modules/dbproperties');
const dbUtil = require('./../modules/dbutility');

let consumptionReturnEvent = {

    /*
     * start weekly consumption return event check for platform
     */
    checkPlatformWeeklyConsumptionReturnEvent: function (platformId, selectedEvent, adminId, adminName) {

        console.log("#xima, checkPlatformWeeklyConsumptionReturnEvent1");
        if (selectedEvent && selectedEvent.length > 0) {
            let promArr = [];
            selectedEvent.map(eventData => {
                if (eventData && eventData.param && eventData.param.ratio && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    promArr.push(dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, eventData, eventData.executeProposal, eventData.settlementPeriod, adminId, adminName));
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
                        return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturn(platformId, eventData, eventData.executeProposal, eventData.settlementPeriod, adminId, adminName);
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
    },

    checkHasSettledXIMA: function (platformObjId, selectedEvent) {

        if (selectedEvent && selectedEvent.length > 0) {
            let promArr = [];
            let isSettled = false;
            selectedEvent.map(eventData => {
                if (eventData && eventData.settlementPeriod) {
                    let thisPeriod = eventData.settlementPeriod == constSettlementPeriod.DAILY
                        ? dbUtil.getTodayConsumptionReturnSGTime()
                        : dbUtil.getCurrentWeekConsumptionReturnSGTime();

                    promArr.push(dbConfig.collection_proposal.findOne({
                            'data.platformId': platformObjId,
                            'data.eventCode': eventData.code,
                            createTime: {$gte: thisPeriod.startTime, $lt: thisPeriod.endTime},
                            status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                            'data.bConsumptionReturnRequest': {$exists: false}
                        }).lean().then(
                            prop => {
                                if (prop) { isSettled = true }
                            }
                        )
                    )
                }
            });

            return Promise.all(promArr).then(() => isSettled);
        }
    }
};

module.exports = consumptionReturnEvent;
