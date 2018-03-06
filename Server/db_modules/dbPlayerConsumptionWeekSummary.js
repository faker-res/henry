"use strict";

var dbPlayerConsumptionWeekSummaryFunc = function () {
};
module.exports = new dbPlayerConsumptionWeekSummaryFunc();

var Q = require('q');
var dbconfig = require('./../modules/dbproperties');
var dbutility = require('./../modules/dbutility');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerReward = require('../db_modules/dbPlayerReward');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbGameType = require('../db_modules/dbGameType');
var constRewardType = require('../const/constRewardType');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var constSystemParam = require('../const/constSystemParam');
var constShardKeys = require('../const/constShardKeys');
var util = require('util');
var constServerCode = require('../const/constServerCode');

const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');
const constSettlementPeriod = require('../const/constSettlementPeriod');

const dbOps = require("../db_common/dbOperations");
const dbPropUtil = require("../db_common/dbProposalUtility");

var dbPlayerConsumptionWeekSummary = {

    /**
     * Update or insert consumption week summary
     * @param {Json} data - The week summary data
     */
    upsert: function (data) {
        var upsertData = JSON.parse(JSON.stringify(data));
        delete upsertData.playerId;
        delete upsertData.platformId;
        delete upsertData.date;
        return dbutility.upsertForShard(
            dbconfig.collection_playerConsumptionWeekSummary,
            {
                playerId: data.playerId,
                platformId: data.platformId,
                date: data.date
            },
            upsertData,
            constShardKeys.collection_playerConsumptionDaySummary
        );
    },

    /**
     * Calculate platform player consumption week summary for time frame
     * @param {Date} startTime - It has to be at 00:00 for a specific date
     * @param {Date} endTime - The end time
     */
    calculatePlatformWeekSummaryForTimeFrame: function (startTime, endTime, platformId) {

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            var stream = dbPlayerConsumptionRecord.streamPlayersWithConsumptionDaySummaryInTimeFrame(startTime, endTime, platformId);

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "playerConsumption_calculatePlatformWeekSummaryForPlayers", {
                            startTime: startTime,
                            endTime: endTime,
                            platformId: platformId,
                            playerObjIds: playerIdObjs.map(playerIdObj => playerIdObj._id)
                        });
                    }
                })
            );

        });
    },

    playerConsumption_calculatePlatformWeekSummaryForPlayers: function (startTime, endTime, platformId, playerObjIds) {
        var deferred = Q.defer();

        dbPlayerConsumptionDaySummary.getPlayersTotalConsumptionForTimeFrame(startTime, endTime, playerObjIds, platformId).then(
            function (data) {
                if (data && data.length > 0) {
                    return data;
                }
                else {
                    //no consumption
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Get player consumption failed!", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    var proms = [];
                    for (var i = 0; i < data.length; i++) {
                        var summary = {
                            playerId: data[i]._id.playerId,
                            platformId: data[i]._id.platformId,
                            date: startTime,
                            amount: data[i].amount,
                            validAmount: data[i].validAmount,
                            times: data[i].times
                        };

                        var prom = dbPlayerConsumptionWeekSummary.upsert(summary);
                        proms.push(prom);
                    }
                    return Q.all(proms);
                }
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                console.error(error);
                deferred.reject({
                    name: "DBError",
                    message: "Update player consumption week summary failed!",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Check platform weekly consumption return event
     * @param {ObjectId} platformId
     * @param {JSON} eventData
     * @param {ObjectId} proposalTypeId
     */
    checkPlatformWeeklyConsumptionReturn: function (platformId, eventData, proposalTypeId, period) {

        var settleTime = period == constSettlementPeriod.DAILY ? dbutility.getYesterdayConsumptionReturnSGTime() : dbutility.getLastWeekConsumptionReturnSGTime();
        var balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            // This collects players who have dirty records in the time range, although dirty records will not actually be used during processing.
            // var stream = dbPlayerConsumptionRecord.streamPlayersWithConsumptionSummaryInTimeFrame(startTime, endTime, platformId);

            var query = dbconfig.collection_playerConsumptionSummary.aggregate(
                [
                    {
                        $match: {
                            platformId: platformId,
                            summaryDay: {$gte: settleTime.startTime, $lt: settleTime.endTime},
                            bDirty: false
                        }
                    },
                    {
                        $group: {_id: '$playerId'}
                    }
                ]
            );

            var stream = query.cursor({batchSize: 1000}).allowDiskUse(true).exec();

            return balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "checkPlatformWeeklyConsumptionReturnForPlayers", {
                            platformId: platformId,
                            eventData: eventData,
                            proposalTypeId: proposalTypeId,
                            startTime: settleTime.startTime,
                            endTime: settleTime.endTime,
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            })
                        });
                    }
                }
            );
        });
    },

    checkPlatformWeeklyConsumptionReturnForPlayers: function (platformId, eventData, proposalTypeId, startTime, endTime, playerIds, bRequest, userAgent, adminId=null, adminName=null, isForceApply) {
        var deferred = Q.defer();

        var summaryProm = dbconfig.collection_playerConsumptionSummary.find(
            {
                platformId: platformId,
                playerId: {$in: playerIds},
                summaryDay: {$gte: startTime, $lt: endTime},
                bDirty: false
            }
        ).lean();
        var playerLevelProm = dbconfig.collection_players.find({_id: {$in: playerIds}})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();

        var gameTypesProm = dbGameType.getAllGameTypes();

        var processedSummaries = [];
        let platformProm = dbconfig.collection_platform.findOne({_id: platformId}).lean();

        Q.all([summaryProm, playerLevelProm, gameTypesProm, platformProm]).spread(
            function (consumptionSummaries, players, allGameTypes, platformData) {
                if (consumptionSummaries && players) {
                    // Process the data into key map
                    var consumptionSummariesByKey = {};
                    consumptionSummaries.forEach(
                        function (summary) {
                            var key = String(summary.playerId + ':' + summary.gameType);
                            if (consumptionSummariesByKey[key]) {
                                // This is not supposed to happen: There are not supposed to be multiple summaries with the same key.
                                // But just in case this does happen, let's not lose the player's consumption!
                                consumptionSummariesByKey[key].amount += summary.amount;
                                consumptionSummariesByKey[key].validAmount += summary.validAmount;
                            } else {
                                consumptionSummariesByKey[key] = summary;
                            }
                        }
                    );

                    var proms = [];
                    players.forEach(
                        function (playerData) {
                            if (playerData && playerData.permission && !(playerData.permission.banReward)) {
                                //check if platform only allow new system users
                                if( platformData && platformData.onlyNewCanLogin && !playerData.isNewSystem ){
                                    return;
                                }

                                if (dbPlayerReward.isRewardEventForbidden(playerData, eventData._id)) {
                                    return;
                                }

                                var returnAmount = 0;

                                // Check all game types and calculate return amount
                                let thisPlayersConsumptionSummaries = [];
                                let returnDetail = {}, nonXIMADetail = {};
                                let applyAmount = 0;
                                let totalNonXIMAAmt = 0;

                                for (var type in allGameTypes) {
                                    var playerLevel = playerData.playerLevel;
                                    var gameType = allGameTypes[type];
                                    var typeKey = String(playerData._id + ':' + gameType);
                                    var consumptionSummary = consumptionSummariesByKey[typeKey];
                                    var eventRatios = eventData.param.ratio[playerLevel.value];
                                    var ratio = eventRatios && eventRatios[gameType];


                                    if (!eventRatios) {
                                        // var msg = util.format("Reward event has no ratios for PlayerLevel \"%s\".  eventData: %j", playerLevel.name, eventData.param);
                                        //deferred.reject(Error(msg));
                                        // console.warn(msg);
                                        // Do not create a reward for this game type.  Proceed to the next game type.
                                        ratio = 0;
                                    }
                                    if (typeof ratio !== 'number') {
                                        // var msg = util.format("Reward event has no ratio for gameType=%s at PlayerLevel \"%s\".  eventData: %j", gameType, playerLevel.name, eventData.param);
                                        //deferred.reject(Error(msg));
                                        // console.warn(msg);
                                        // Do not create a reward for this game type.  Proceed to the next game type.
                                        ratio = 0;
                                    }

                                    if (consumptionSummary && playerLevel && ratio > 0) {
                                        let consumeValidAmount = consumptionSummary.validAmount || 0;
                                        let nonXIMAAmt = consumptionSummary.nonXIMAAmt || 0;
                                        returnAmount += consumeValidAmount * ratio;
                                        returnDetail["GameType:" + gameType] = {
                                            consumeValidAmount: consumeValidAmount,
                                            ratio: ratio
                                        };
                                        nonXIMADetail["GameType:" + gameType] = {
                                            nonXIMAAmt: nonXIMAAmt
                                        };
                                        applyAmount += consumeValidAmount;
                                        totalNonXIMAAmt += nonXIMAAmt;
                                    }

                                    if (consumptionSummary && ratio > 0) {
                                        thisPlayersConsumptionSummaries.push(consumptionSummary);
                                    }
                                }

                                // If return reward amount larger than 1, create proposal
                                var bReturn = true; //Boolean(returnAmount >= 1);
                                if (bRequest && !isForceApply) {
                                    //todo:: move the 100 here to system param
                                    bReturn = Boolean(returnAmount >= eventData.param.earlyXimaMinAmount);
                                }
                                if (bReturn) {
                                    var summaryIds = thisPlayersConsumptionSummaries.map(summary => summary._id);
                                    let spendingAmount = returnAmount < 0.01 ? 0 : returnAmount;
                                    spendingAmount = Number.isInteger(eventData.param.consumptionTimesRequired)? spendingAmount *eventData.param.consumptionTimesRequired : spendingAmount;
                                    var proposalData = {
                                        type: proposalTypeId,
                                        entryType: bRequest ? constProposalEntryType.CLIENT : constProposalEntryType.SYSTEM,
                                        userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                        data: {
                                            playerObjId: playerData._id,
                                            platformId: platformId,
                                            playerName: playerData.name,
                                            playerId: playerData.playerId,
                                            eventName: eventData.name,
                                            eventCode: eventData.code,
                                            rewardAmount: returnAmount < 0.01 ? 0 : returnAmount,
                                            spendingAmount: spendingAmount,
                                            returnDetail: returnDetail,
                                            nonXIMADetail: nonXIMADetail,
                                            summaryIds: summaryIds,
                                            bConsumptionReturnRequest: bRequest,
                                            consumeValidAmount: applyAmount,
                                            totalNonXIMAAmt: totalNonXIMAAmt,
                                            eventDescription: eventData.description,
                                            startTime: startTime,
                                            endTime: endTime,
                                            isIgnoreAudit: eventData.param && Number.isInteger(eventData.param.isIgnoreAudit) && eventData.param.isIgnoreAudit >= returnAmount,
                                        }
                                    };

                                    if (adminId && adminName) {
                                        proposalData.creator = {
                                            name: adminName,
                                            type: 'admin',
                                            id: adminId
                                        }
                                    } else if (userAgent) {
                                        // userAgent no null means is not system
                                        proposalData.inputDevice = dbutility.getInputDevice(userAgent);
                                        proposalData.creator = {
                                            type: 'player',
                                            name: playerData.name,
                                            id: playerData.playerId
                                        }
                                    }

                                    let postProm = Promise.resolve();

                                    if (platformData.useProviderGroup) {
                                        let proposalQ = {
                                            createTime: {$gte: startTime, $lt: endTime},
                                            'data.platformId': platformId,
                                            'data.playerObjId': playerData._id,
                                            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                            'data.bConsumptionReturnRequest': true,
                                        };

                                        let doneXIMAConsumption = {};

                                        postProm = dbPropUtil.getProposalDataOfType(platformId, constProposalType.PLAYER_CONSUMPTION_RETURN, proposalQ).then(
                                            props => {
                                                if (props && props.length > 0) {
                                                    props.map(prop => {
                                                        Object.keys(prop.data.returnDetail).forEach(el => {
                                                            doneXIMAConsumption[el] && doneXIMAConsumption[el].consumeValidAmount
                                                                ? doneXIMAConsumption[el].consumeValidAmount += prop.data.returnDetail[el].consumeValidAmount
                                                                : doneXIMAConsumption[el] = prop.data.returnDetail[el];

                                                            if (prop.data.nonXIMADetail[el] && prop.data.nonXIMADetail[el].nonXIMAAmt) {
                                                                doneXIMAConsumption[el].consumeValidAmount += prop.data.nonXIMADetail[el].nonXIMAAmt;
                                                            }
                                                        });
                                                    })
                                                }

                                                return dbconfig.collection_playerConsumptionRecord.aggregate(
                                                    {
                                                        $match: {
                                                            platformId: platformId,
                                                            createTime: {
                                                                $gte: startTime,
                                                                $lt: endTime
                                                            },
                                                            playerId: playerData._id
                                                        }
                                                    },
                                                    {
                                                        $group: {
                                                            _id: "$gameType",
                                                            validAmount: {$sum: "$validAmount"}
                                                        }
                                                    }
                                                )
                                            }
                                        ).then(
                                            rec => {
                                                let totalConsumptionRec = rec && rec.length > 0 ? rec.reduce((a, b) => a + b.validAmount, 0) : 0;
                                                let totalConsumptionSummary = proposalData.data.consumeValidAmount + proposalData.data.totalNonXIMAAmt;

                                                if (totalConsumptionRec != totalConsumptionSummary) {
                                                    // Recalculate consumption return amount
                                                    rec.forEach(el => {
                                                        // Offset consumption return dirty amount
                                                        // Skip when return amount is 0
                                                        if (proposalData.data.returnDetail["GameType:" + el._id] && proposalData.data.returnDetail["GameType:" + el._id].consumeValidAmount) {
                                                            let consumedValidAmount = 0;
                                                            let curValidAmt = proposalData.data.returnDetail["GameType:" + el._id].consumeValidAmount;
                                                            let curNonXIMAAmt = proposalData.data.nonXIMADetail["GameType:" + el._id].nonXIMAAmt;

                                                            if (doneXIMAConsumption["GameType:" + el._id]) {
                                                                consumedValidAmount = doneXIMAConsumption["GameType:" + el._id].consumeValidAmount;
                                                            }

                                                            let consumpDiff = el.validAmount - curValidAmt - curNonXIMAAmt - consumedValidAmount;
                                                            let returnRatio = proposalData.data.returnDetail["GameType:" + el._id] ? proposalData.data.returnDetail["GameType:" + el._id].ratio : 0;

                                                            // Offset if it matters
                                                            if (consumpDiff > 0.01) {
                                                                proposalData.data.returnDetail["GameType:" + el._id].consumeValidAmount += consumpDiff;
                                                                proposalData.data.rewardAmount += consumpDiff * returnRatio;
                                                                proposalData.data.spendingAmount += consumpDiff * returnRatio;
                                                                proposalData.data.consumeValidAmount += consumpDiff;
                                                            }
                                                        }
                                                    });
                                                }

                                                return dbProposal.createProposalWithTypeId(proposalTypeId, proposalData);
                                            }
                                        )
                                    } else {
                                        postProm = dbProposal.createProposalWithTypeId(proposalTypeId, proposalData);
                                    }

                                    proms.push(postProm);
                                    //only if proposal is created then add summary ids
                                    processedSummaries = processedSummaries.concat(thisPlayersConsumptionSummaries);
                                }
                            }
                        }
                    );

                    if (proms.length > 0) {
                        return Q.all(proms);
                    } else {
                        //todo::update the error message here for client
                        //no consumption return
                        deferred.resolve(null);
                    }
                } else {
                    //no consumption records
                    deferred.resolve(null);
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding player consumption week summary",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data) {
                    // Mark the summaries we have just processed as dirty
                    // Concern: It is possible that a consumptionSummary record has been updated in the time that we have been processing this batch.
                    //          That update amount will be lost (removed from this week, not counted for next week).
                    //          To avoid that, this process should be part of a transaction queue that will lock the record from being updated.
                    var summaryIds = processedSummaries.map(summary => summary._id);
                    // mark record as dirty, remove them if proposal is approved, reset as clean record if proposal is rejected
                    return dbconfig.collection_playerConsumptionSummary.find(
                        {_id: {$in: summaryIds}}
                    ).lean().then(
                        summaryRecords => {
                            //only mark summary dirty if they are not removed , which means the proposal is not approved
                            if (summaryRecords && summaryRecords.length > 0) {
                                return dbOps.removeWithRetry(dbconfig.collection_playerConsumptionSummary, {_id: {$in: summaryIds}}).then(
                                    () => {
                                        var summaryProms = processedSummaries.map(
                                            summary => {
                                                summary.bDirty = true;
                                                return dbconfig.collection_playerConsumptionSummary.findOne(
                                                    {
                                                        playerId: summary.playerId,
                                                        platformId: summary.platformId,
                                                        gameType: summary.gameType,
                                                        summaryDay: summary.summaryDay,
                                                        bDirty: summary.bDirty
                                                    }
                                                ).lean().then(
                                                    summaryData => {
                                                        if (summaryData) {
                                                            // summaryData.amount += summary.amount;
                                                            // summaryData.validAmount += summary.validAmount;
                                                            // summaryData.consumptionRecords.concat(summary.consumptionRecords);
                                                            return dbconfig.collection_playerConsumptionSummary.findOneAndUpdate(
                                                                {
                                                                    _id: summaryData._id,
                                                                    platformId: summaryData.platformId,
                                                                    playerId: summaryData.playerId,
                                                                    gameType: summaryData.gameType,
                                                                    summaryDay: summaryData.summaryDay,
                                                                    bDirty: true
                                                                },
                                                                {
                                                                    $inc: {amount: summary.amount, validAmount: summary.validAmount},
                                                                }
                                                            );
                                                        }
                                                        else {
                                                            var dirtySummary = new dbconfig.collection_playerConsumptionSummary(summary);
                                                            return dirtySummary.save();
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                        return Q.all(summaryProms);
                                    }
                                );
                            }
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating player consumption return proposal",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve(true);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error marking player consumption record", error: error});
            }
        ).catch(
            error => console.log(error)
        );

        return deferred.promise;
    },

    /**
     * Start calculate consumption return for player
     * @param {ObjectId} playerId
     */
    startCalculatePlayerConsumptionReturn: function (playerId, bRequest, bAdmin, eventCode,userAgent, adminName, isForceApply) {
        var deferred = Q.defer();
        var platformData = null;
        var playerData = null;
        let eventData = null;
        //check if player platform has consumption return reward event
        dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).then(
            function (data) {
                if (data && data.platform && data.playerLevel) {
                    playerData = data;
                    if (playerData.permission && playerData.permission.banReward || !playerData.playerLevel.canApplyConsumptionReturn) {
                        deferred.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have this permission"
                        });
                        return;
                    }

                    // if (playerData.forbidRewardEvents && playerData.forbidRewardEvents.indexOf("advanceConsumptionReward") !== -1) {
                    //     deferred.reject({
                    //         status: constServerCode.PLAYER_NO_PERMISSION,
                    //         name: "DataError",
                    //         errorMessage: "Player does not have this permission"
                    //     });
                    //     return;
                    // }

                    platformData = data.platform;
                    if( eventCode ){
                        return dbRewardEvent.getPlatformRewardEventWithCode(data.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN, eventCode);
                    }
                    else{
                        return dbRewardEvent.getPlatformRewardEventsWithTypeName(data.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player data"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding player", error: error});
            }
        ).then(
            function (eventsData) {
                if (eventsData) {
                    eventData = eventsData[0] ? eventsData[0]:null;
                    return dbconfig.collection_players.findOneAndUpdate({
                        _id: playerData._id,
                        platform: playerData.platform._id
                    }, {isConsumptionReturn: true}).then(
                        updatePlayer => {
                            if (playerData.forbidRewardEvents.includes(eventData._id.toString())) {
                                deferred.reject({
                                    status: constServerCode.PLAYER_NO_PERMISSION,
                                    name: "DataError",
                                    errorMessage: "Player do not have permission to apply consumption return"
                                });
                            }
                            if (!updatePlayer.isConsumptionReturn || bAdmin) {
                                return dbconfig.collection_proposalType.findOne({platformId: platformData._id, name: constProposalType.PLAYER_CONSUMPTION_RETURN}).lean();
                            }
                            else {
                                deferred.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Player is applying consumption return"
                                });
                            }
                        }
                    ).then(
                        proposalType => {
                            if (!proposalType) {
                                eventsData = [];
                                deferred.reject({
                                    name: "DataError",
                                    message: "Error in getting proposal type"
                                });
                            }

                            return dbconfig.collection_proposal.findOne({
                                type: proposalType._id,
                                status: constProposalStatus.PENDING,
                                "data.playerId": playerData.playerId
                            }).lean();
                        }
                    ).then(
                        rewardProposal => {
                            if (rewardProposal) {
                                eventsData = [];
                                deferred.reject({
                                    name: "DataError",
                                    message: "Player or partner already has a pending proposal for this type"
                                });
                            }

                            let proms = [];
                            for (let eventData of eventsData) {
                                if (dbPlayerReward.isRewardEventForbidden(playerData, eventsData._id)) {
                                    continue;
                                }
                                proms.push(dbPlayerConsumptionWeekSummary.calculatePlayerConsumptionReturn(playerData, platformData, eventData, bRequest, userAgent, bAdmin, adminName, isForceApply));
                            }

                            return Q.all(proms).then(
                                data => {
                                    //reset consumption return status
                                    dbconfig.collection_players.findOneAndUpdate({
                                        _id: playerData._id,
                                        platform: playerData.platform._id
                                    }, {isConsumptionReturn: false}).then();
                                    return data;
                                },
                                error => {
                                    //reset consumption return status
                                    dbconfig.collection_players.findOneAndUpdate({
                                        _id: playerData._id,
                                        platform: playerData.platform._id
                                    }, {isConsumptionReturn: false}).then();
                                    return Q.reject(error);
                                }
                            );
                        }
                    );
                }
                else {
                    deferred.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Incorrect reward event data"
                    });
                }
            },
            function (error) {
                deferred.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DBError",
                    message: "Error finding reward event",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data[0]) {
                    deferred.resolve(true);
                }
                else {
                    deferred.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DBError",
                        message: eventData && eventData.param && eventData.param.earlyXimaMinAmount ? "您的洗码额度不足"+eventData.param.earlyXimaMinAmount+"元，无法提前结算洗码，谢谢": "您的洗码额度不足，无法提前结算洗码，谢谢"
                    });
                }
            },
            function (error) {
                deferred.reject({
                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                    name: "DBError",
                    message: "Error calculating player consumption return",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Start calculate consumption return for player
     * @param {json} playerData
     * @param {json} platformData
     * @param {json} eventData
     */
    calculatePlayerConsumptionReturn: function (playerData, platformData, eventData, bRequest, userAgent = null, adminId=null, adminName=null, isForceApply = false) {
        let settleTime = eventData.settlementPeriod == constSettlementPeriod.DAILY ? dbutility.getYesterdayConsumptionReturnSGTime() : dbutility.getLastWeekConsumptionReturnSGTime();
        if (bRequest) {
            if(eventData.settlementPeriod == constSettlementPeriod.DAILY){
                settleTime = dbutility.getTodayConsumptionReturnSGTime();
            }
            else{
                settleTime = dbutility.getCurrentWeekConsumptionReturnSGTime();
            }
        }
        return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturnForPlayers(platformData._id, eventData, eventData.executeProposal, settleTime.startTime, new Date(), [playerData._id], bRequest, userAgent, adminId, adminName, isForceApply);
    },

    /**
     * Get consumption return amount for player
     * @param {String} playerId
     * @param eventCode
     */
    getPlayerConsumptionReturn: function (playerId, eventCode) {
        let platformData = null;
        let playerData = null;
        let eventObj = null;

        //check if player platform has consumption return reward event
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                data => {
                    if (data && data.platform) {
                        playerData = data;
                        platformData = data.platform;

                        if (eventCode) {
                            return dbRewardEvent.getPlatformRewardEventWithCode(data.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN, eventCode);
                        }
                        else{
                            return dbRewardEvent.getPlatformRewardEventsWithTypeName(data.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN);
                        }
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Player is not found"});
                    }
                },
                function (error) {
                    return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
                }
            ).then(
                function (eventsData) {
                    if (eventsData && eventsData.length > 0) {
                        eventObj = eventsData[0];
                        var proms = [];
                        for (let eventData of eventsData) {
                            proms.push(dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount(platformData._id, eventData, eventData.executeProposal, playerData._id, false, true));
                        }
                        return Q.all(proms);
                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            message: "Incorrect reward event data",
                            error: new Error()
                        });
                    }
                },
                function (error) {
                    return Q.reject({name: "DBError", message: "Error in getting rewardEvent", error: error});
                }
            ).then(
                function (data) {
                    var res = {totalAmount: 0, totalConsumptionAmount: 0, event: eventObj};
                    for (let amounts of data) {
                        Object.keys(amounts).forEach(
                            type => {
                                if (res[type]) {
                                    if (res[type].returnAmount) {
                                        res[type].returnAmount += amounts[type].returnAmount;
                                    }
                                    else {
                                        res[type] += amounts[type];
                                    }
                                }
                                else {
                                    res[type] = amounts[type];
                                }
                            }
                        )
                    }
                    return res;
                }
            );
    },

    getPlayersConsumptionReturnInfo: function (platformId, eventData, playerObjIds) {
        var proms = [];
        playerObjIds.forEach(
            playerObjId => {
                proms.push(dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount(platformId, eventData, eventData.executeProposal, playerObjId, true));
            }
        );
        return Q.all(proms).then(
            returnData => {
                return returnData.filter(
                    data => data.totalAmount > 0
                );
            }
        );
    },

    /**
     * Get consumption return amount for player based on event data
     * @param {ObjectId} platformId
     * @param event
     * @param {ObjectId} proposalTypeId
     * @param {ObjectId} playerId
     * @param {Boolean} bDetail, if contain detailed player info
     * @param bRequest - Is user triggered early settlement
     */
    getPlayerConsumptionReturnAmount: function (platformId, event, proposalTypeId, playerId, bDetail, bRequest) {
        let settleTime = event.settlementPeriod == constSettlementPeriod.DAILY ? dbutility.getYesterdayConsumptionReturnSGTime() : dbutility.getLastWeekConsumptionReturnSGTime();
        if (bRequest) {
            if(event.settlementPeriod == constSettlementPeriod.DAILY){
                settleTime = dbutility.getTodayConsumptionReturnSGTime();
            }
            else{
                settleTime = dbutility.getCurrentWeekConsumptionReturnSGTime();
            }
        }
        let eventData = event.param;
        let summaryDay = {$gte: settleTime.startTime};
        //if preview for settlement, only calculate for settlement time
        //if preview for player request, calculate data until now
        if (bDetail) {
            summaryDay["$lt"] = settleTime.endTime;
        }
        let summaryProm = dbconfig.collection_playerConsumptionSummary.find(
            {
                platformId: platformId,
                playerId: playerId,
                summaryDay: summaryDay,
                bDirty: false
            }
        ).lean();
        let playerLevelProm = dbconfig.collection_players.findOne({_id: playerId}).select("playerLevel playerId name")
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().exec();

        let gameTypesProm = dbGameType.getAllGameTypes();

        let doneXIMAConsumption = {};
        let proposalQ = {
            createTime: summaryDay,
            'data.platformId': platformId,
            'data.playerObjId': playerId,
            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            'data.bConsumptionReturnRequest': true,
        };
        let consumptionRecProm = dbPropUtil.getProposalDataOfType(platformId, constProposalType.PLAYER_CONSUMPTION_RETURN, proposalQ).then(
            props => {
                if (props && props.length > 0) {
                    props.map(prop => {
                        Object.keys(prop.data.returnDetail).forEach(el => {
                            doneXIMAConsumption[el] && doneXIMAConsumption[el].consumeValidAmount
                                ? doneXIMAConsumption[el].consumeValidAmount += prop.data.returnDetail[el].consumeValidAmount
                                : doneXIMAConsumption[el] = prop.data.returnDetail[el];

                            if (prop.data.nonXIMADetail[el] && prop.data.nonXIMADetail[el].nonXIMAAmt) {
                                doneXIMAConsumption[el].consumeValidAmount += prop.data.nonXIMADetail[el].nonXIMAAmt;
                            }
                        });
                    });
                }

                return dbconfig.collection_playerConsumptionRecord.aggregate(
                    {
                        $match: {
                            platformId: platformId,
                            createTime: summaryDay,
                            playerId: playerId
                        }
                    },
                    {
                        $group: {
                            _id: "$gameType",
                            validAmount: {$sum: "$validAmount"}
                        }
                    }
                )
            }
        );

        let platformProm = dbconfig.collection_platform.findOne({_id: platformId}).lean();

        return Q.all([summaryProm, playerLevelProm, gameTypesProm, consumptionRecProm, platformProm]).spread(
            function (consumptionSummaries, playerData, allGameTypes, consumptionRecSumm, platformData) {
                // Why is it that sometimes playerData is not found?
                // Perhaps the player was requested because he had consumption records, but the player himself has been removed from the system

                if (consumptionSummaries && playerData) {
                    // Process the data into key map
                    let consumptionSummariesByKey = {};
                    consumptionSummaries.forEach(
                        function (summary) {
                            let key = String(summary.playerId + ':' + summary.gameType);
                            if (consumptionSummariesByKey[key]) {
                                // This is not supposed to happen: There are not supposed to be multiple summaries with the same key.
                                // But just in case this does happen, let's not lose the player's consumption!
                                consumptionSummariesByKey[key].amount += summary.amount;
                                consumptionSummariesByKey[key].validAmount += summary.validAmount;
                            } else {
                                consumptionSummariesByKey[key] = summary;
                            }
                        }
                    );
                    let returnAmount = 0;

                    // Check all game types and calculate return amount
                    let res = {};
                    res.settleTime = settleTime;
                    res.totalConsumptionAmount = 0;
                    for (let type in allGameTypes) {
                        let playerLevel = playerData.playerLevel;
                        let gameType = allGameTypes[type];
                        let typeKey = String(playerData._id + ':' + gameType);
                        let consumptionSummary = consumptionSummariesByKey[typeKey];
                        let eventRatios = eventData.ratio[playerLevel.value];
                        let ratio = eventRatios && eventRatios[gameType];

                        if (!eventRatios) {
                            let msg = util.format("Reward event has no ratios for PlayerLevel \"%s\".  eventData: %j", playerLevel.name, eventData);
                            //return Q.reject(Error(msg));
                            console.warn(msg);
                            ratio = 0;
                        }
                        if (typeof ratio !== 'number') {
                            let msg = util.format("Reward event has no ratio for gameType=%s at PlayerLevel \"%s\".  eventData: %j", gameType, playerLevel.name, eventData);
                            //return Q.reject(Error(msg));
                            console.warn(msg);
                            ratio = 0;
                        }
                        if (consumptionSummary && playerLevel && ratio >= 0) {
                            let consumeValidAmount = consumptionSummary.validAmount;
                            let returnForThisGameType = consumeValidAmount * ratio;
                            returnAmount += returnForThisGameType;
                            res.totalConsumptionAmount += consumeValidAmount;
                            res[type] = {
                                consumptionAmount: consumeValidAmount,
                                returnAmount: returnForThisGameType,
                                ratio: ratio
                            };
                        }
                        else {
                            res[type] =
                                {
                                    consumptionAmount: 0,
                                    returnAmount: 0,
                                    ratio: ratio
                                };
                        }
                    }
                    res.totalAmount = returnAmount < 1 ? 0 : returnAmount;

                    if (platformData.useProviderGroup) {
                        let totalConsumptionRec = consumptionRecSumm && consumptionRecSumm.length > 0 ? consumptionRecSumm.reduce((a, b) => a + b.validAmount, 0) : 0;

                        if (totalConsumptionRec != res.totalConsumptionAmount) {
                            // Recalculate consumption return amount
                            let totalAmtDiff = 0;

                            consumptionRecSumm.forEach(el => {
                                // Offset consumption return dirty amount
                                el.validAmount -= doneXIMAConsumption["GameType:" + el._id] ? doneXIMAConsumption["GameType:" + el._id].consumeValidAmount : 0;

                                let consumpDiff = el.validAmount - res[el._id].consumptionAmount;
                                res[el._id].consumptionAmount += consumpDiff;
                                res[el._id].returnAmount += consumpDiff * res[el._id].ratio;

                                totalAmtDiff += consumpDiff * res[el._id].ratio;
                            });

                            res.totalAmount += totalAmtDiff;
                        }
                    }

                    if (bDetail) {
                        res.playerId = playerData.playerId;
                        res.playerName = playerData.name;
                    }
                    return res;
                } else {
                    //no consumption records
                    if (bDetail) {
                        return {
                            settleTime: settleTime,
                            playerId: playerId,
                            playerName: playerData ? playerData.name : 'Player Not Found',
                            totalAmount: 0
                        };
                    }
                    else {
                        console.log("LH check consumption return reward 8-3", {settleTime: settleTime, totalAmount: 0});
                    }
                }
            },
            function (error) {
                return Promise.reject({
                    name: "DBError",
                    message: "Error finding player consumption week summary",
                    error: error
                });
            }
        );
    }

};

//module.exports = dbPlayerConsumptionWeekSummary;
var proto = dbPlayerConsumptionWeekSummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionWeekSummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionWeekSummary;
