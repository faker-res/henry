/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Calculate player reward for consecutive top up
 */

var Q = require("q");
var constRewardType = require('../const/constRewardType');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardRule = require('../db_modules/dbRewardRule');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');

var consecutiveTopUpEvent = {

    /*
     * start consecutive top up event check for valid platforms
     */
    startConsecutiveTopUpEventCheck: function () {
        var deferred = Q.defer();
        //get all platforms has consecutive top up event
        dbRewardEvent.getPlatformsIdForRewardType(constRewardType.CONSECUTIVE_TOP_UP).then(
            function (data) {
                return data;
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding platforms for consecutive top up event.", error: error});
            }
        ).then(
            function (platformData) {
                //check all the players has top up for more than event's min amount
                if (platformData && platformData.length > 0) {
                    var proms = [];
                    for (var i = 0; i < platformData.length; i++) {
                        proms.push(consecutiveTopUpEvent.checkPlatformConsecutiveTopUpPlayers(platformData[i]));
                    }
                    Q.all(proms).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject(error);
                        }
                    ).catch(
                        function(error){
                            deferred.reject(error);
                        }
                    );
                }
                else {
                    deferred.resolve(platformData);
                }
            }
        );
        return deferred.promise;
    },

    /*
     * Check player's top up summary and consecutive top up conditions
     * Run after daily settlement is finished
     */
    checkPlatformConsecutiveTopUpPlayers: function (platformId) {
        var deferred = Q.defer();

        //get platform consecutive top up reward event data and rule data
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.CONSECUTIVE_TOP_UP).then(
            function (eventData) {
                //check if reward event has the correct data for consecutive top up event
                if (eventData && eventData.param && eventData.param.minAmount && eventData.param.numOfDays && eventData.param.rewardAmount
                    && eventData.param.spendingAmount && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    dbPlayerTopUpDaySummary.getPlayersByTopUpAmount(platformId, eventData.param.minAmount).then(
                        function (data) {
                            return data;
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Error finding player more then top up amount.", error: error});
                        }
                    ).then(
                        function (data) {
                            if (data && data.length > 0) {
                                //check for each player if they has been consecutively top up and create related proposal
                                var proms = [];
                                for (var i = 0; i < data.length; i++) {
                                    proms.push(dbPlayerTopUpDaySummary.checkConsecutiveTopUpAndCreateProposal(data[i].playerId, platformId, eventData.param, eventData.executeProposal));
                                }
                                Q.all(proms).then(
                                    function (data) {
                                        deferred.resolve(data);
                                    },
                                    function (error) {
                                        deferred.reject(error);
                                    }
                                ).catch(function (error) {
                                    deferred.reject(error);
                                });
                            } else {
                                //if there isn't any player top up more than min amount, finish the event for the platform
                                deferred.resolve(data);
                            }

                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect reward event data."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward events for platform.", error: error});
            }
        );

        return deferred.promise;
    },

    /*
     * Check player's top up summary and consecutive top up conditions
     * Run after daily settlement is finished
     */
    checkPlatformFullAttendancePlayers: function (platformId) {
        var deferred = Q.defer();

        //get platform consecutive top up reward event data and rule data
        dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.FULL_ATTENDANCE).then(
            function (eventData) {
                //todo::update the event format check here, create module for event data format check
                //check if reward event has the correct data for consecutive top up event
                if (eventData && eventData.param && eventData.param.rewardAmount && eventData.param.spendingAmount && eventData.executeProposal) {
                    //get all the players has top up for more than min amount yesterday
                    return dbPlayerTopUpDaySummary.checkPlatformFullAttendanceStream(platformId, eventData, eventData.executeProposal);
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
                deferred.reject({name: "DBError", message: "Error checking weekly consecutive top up for platform.", error: error});
            }
        );

        return deferred.promise;
    }

};

module.exports = consecutiveTopUpEvent;