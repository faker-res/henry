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
const errorUtils = require("../modules/errorUtils.js");

const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');
const constSettlementPeriod = require('../const/constSettlementPeriod');
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");

const dbOps = require("../db_common/dbOperations");
const dbPlayerUtil = require('../db_common/dbPlayerUtility');
const dbPropUtil = require("../db_common/dbProposalUtility");
const dbRewardUtil = require('../db_common/dbRewardUtility');

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
    checkPlatformWeeklyConsumptionReturn: function (platformId, eventData, proposalTypeId, period, adminID, adminName) {

        var settleTime = period == constSettlementPeriod.DAILY ? dbutility.getYesterdayConsumptionReturnSGTime() : dbutility.getLastWeekConsumptionReturnSGTime();
        var balancer = new SettlementBalancer();
        console.log('admin', adminName + " : " + adminID);
        return balancer.initConns().then(function () {

            let query = dbconfig.collection_playerConsumptionRecord.aggregate(
                [
                    {
                        $match: {
                            platformId: platformId,
                            createTime: {$gte: settleTime.startTime, $lt: settleTime.endTime}
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
                            }),
                            adminName: adminName,
                            adminID: adminID
                        });
                    }
                }
            );

        });

    },

    checkPlatformWeeklyConsumptionReturnForPlayers: function (platformId, eventData, proposalTypeId, startTime, endTime, playerIds, adminName, adminId , bRequest, userAgent, isForceApply) {
        let isLessThanEnoughReward = false;
        let processedSummaries = [];
        let promArr = [];
        if (playerIds && playerIds.length) {
            // Loop through players
            playerIds.forEach(player => {
                promArr.push(
                    dbconfig.collection_players.findById(player).populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().then(
                        playerData => {
                            // Skip banned player when batch settlement
                            if (
                                playerData
                                && playerData.permission
                                && playerData.permission.forbidPlayerConsumptionReturn
                            ) {
                                return;
                            }

                            if (dbRewardUtil.isRewardEventForbidden(playerData, eventData._id)) {
                                return;
                            }

                            // Get player consumption records
                            let recProm = dbconfig.collection_playerConsumptionRecord.aggregate(
                                {
                                    $match: {
                                        platformId: platformId,
                                        createTime: {
                                            $gte: startTime,
                                            $lt: endTime
                                        },
                                        playerId: playerData._id,
                                        $or: [
                                            {isDuplicate: {$exists: false}},
                                            {
                                                $and: [
                                                    {isDuplicate: {$exists: true}},
                                                    {isDuplicate: false}
                                                ]
                                            }
                                        ]
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$gameType",
                                        validAmount: {$sum: "$validAmount"}
                                    }
                                }
                            );

                            // Get player consumption summary
                            let summaryProm = dbconfig.collection_playerConsumptionSummary.find(
                                {
                                    platformId: platformId,
                                    playerId: playerData._id,
                                    summaryDay: {$gte: startTime, $lt: endTime},
                                    bDirty: false
                                }
                            ).lean();

                            // Get player done xima proposal
                            let proposalQ = {
                                createTime: {$gte: startTime, $lt: endTime},
                                'data.platformId': platformId,
                                'data.playerObjId': playerData._id,
                                'data.eventCode': eventData.code,
                                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                'data.bConsumptionReturnRequest': true
                            };

                            // Get this period settled xima proposal
                            let thisPeriodTime = eventData.settlementPeriod == constSettlementPeriod.DAILY
                                ? dbutility.getTodayConsumptionReturnSGTime()
                                : dbutility.getCurrentWeekConsumptionReturnSGTime();
                            let thisPeriodProposal = {
                                createTime: {$gte: thisPeriodTime.startTime, $lt: thisPeriodTime.endTime},
                                'data.platformId': platformId,
                                'data.playerObjId': playerData._id,
                                'data.eventCode': eventData.code,
                                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                'data.bConsumptionReturnRequest': {$exists: false}
                            };

                            let pastProm = dbPropUtil.getProposalDataOfType(platformId, constProposalType.PLAYER_CONSUMPTION_RETURN, proposalQ);
                            let thisPeriodPropProm = Promise.resolve(false);
                            if (!bRequest) {
                                thisPeriodPropProm = dbPropUtil.getProposalDataOfType(platformId, constProposalType.PLAYER_CONSUMPTION_RETURN, thisPeriodProposal);
                            }

                            let lastConsumptionProm = dbconfig.collection_playerConsumptionRecord.find({
                                platformId: platformId,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                playerId: playerData._id
                            }).sort({createTime: -1}).limit(1).lean();

                            return Promise.all([Promise.resolve(playerData), recProm, summaryProm, pastProm, thisPeriodPropProm, lastConsumptionProm]);
                        }
                    ).then(
                        promArrRes => {
                            if (promArrRes) {
                                let [playerData, recSumm, consumptionSumm, pastProps, thisPeriodProps, lastConsumption] = promArrRes;

                                let returnAmount = 0;
                                let returnDetail = {};
                                let doneXIMAConsumption = {};
                                let nonXIMADetail = {};
                                let summaryIds = [];
                                let applyAmount = 0;
                                let totalNonXIMAAmt = 0;
                                let thisPlayerSummaries = [];

                                let playerLevel = playerData.playerLevel;
                                let eventRatios = eventData.param.ratio[playerLevel.value];

                                // Done xima proposals
                                if (pastProps && pastProps.length) {
                                    pastProps.map(prop => {
                                        if (prop.data && prop.data.returnDetail) {
                                            Object.keys(prop.data.returnDetail).forEach(el => {
                                                doneXIMAConsumption[el] && doneXIMAConsumption[el].consumeValidAmount
                                                    ? doneXIMAConsumption[el].consumeValidAmount = Number(doneXIMAConsumption[el].consumeValidAmount) + Number(prop.data.returnDetail[el].consumeValidAmount)
                                                    : doneXIMAConsumption[el] = prop.data.returnDetail[el];

                                                if (prop.data.nonXIMADetail && prop.data.nonXIMADetail[el] && prop.data.nonXIMADetail[el].nonXIMAAmt) {
                                                    doneXIMAConsumption[el].consumeValidAmount = Number(doneXIMAConsumption[el].consumeValidAmount) + Number(prop.data.nonXIMADetail[el].nonXIMAAmt);
                                                }
                                            });
                                        }
                                    })
                                }

                                // Settled xima proposals
                                if (thisPeriodProps && thisPeriodProps.length) {
                                    thisPeriodProps.map(prop => {
                                        if (prop.data && prop.data.returnDetail) {
                                            Object.keys(prop.data.returnDetail).forEach(el => {
                                                doneXIMAConsumption[el] && doneXIMAConsumption[el].consumeValidAmount
                                                    ? doneXIMAConsumption[el].consumeValidAmount = Number(doneXIMAConsumption[el].consumeValidAmount) + Number(prop.data.returnDetail[el].consumeValidAmount)
                                                    : doneXIMAConsumption[el] = prop.data.returnDetail[el];

                                                if (prop.data.nonXIMADetail && prop.data.nonXIMADetail[el] && prop.data.nonXIMADetail[el].nonXIMAAmt) {
                                                    doneXIMAConsumption[el].consumeValidAmount = Number(doneXIMAConsumption[el].consumeValidAmount) + Number(prop.data.nonXIMADetail[el].nonXIMAAmt);
                                                }
                                            });
                                        }
                                    })
                                }

                                // Go through record summaries
                                if (recSumm && recSumm.length) {
                                    recSumm.forEach(el => {
                                        let gameType = el._id;
                                        let totalValidConsumption = el.validAmount ? el.validAmount : 0;
                                        let nonXIMAAmt = 0;
                                        let consumedValidAmount = 0;
                                        let ratio = eventRatios && eventRatios[gameType];
                                        let consumptionSummary = consumptionSumm.filter(summ => summ.gameType === gameType);

                                        // Process return ratio
                                        if (!eventRatios || typeof ratio !== 'number') {
                                            ratio = 0;
                                        }

                                        if (ratio > 0) {
                                            // Get amount that done xima for this provider
                                            if (doneXIMAConsumption["GameType:" + el._id] && doneXIMAConsumption["GameType:" + el._id].consumeValidAmount) {
                                                consumedValidAmount = doneXIMAConsumption["GameType:" + el._id].consumeValidAmount;
                                            }

                                            // Get non xima detail of this game type
                                            if (consumptionSummary && consumptionSummary.length) {
                                                consumptionSummary.forEach(summ => {
                                                    if (summ.nonXIMAAmt) {
                                                        nonXIMAAmt += Number(summ.nonXIMAAmt);
                                                    }
                                                    summaryIds.push(summ._id);
                                                    thisPlayerSummaries.push(summ);
                                                });

                                                if (nonXIMAAmt) {
                                                    totalNonXIMAAmt += nonXIMAAmt;
                                                    nonXIMADetail["GameType:" + gameType] = {
                                                        nonXIMAAmt: nonXIMAAmt
                                                    };
                                                }
                                            }

                                            // Get amount that are available to xima
                                            let freeConsumption = totalValidConsumption - nonXIMAAmt - consumedValidAmount;
                                            applyAmount += freeConsumption;

                                            // Get return detail of this game type
                                            returnDetail["GameType:" + gameType] = {
                                                consumeValidAmount: freeConsumption,
                                                ratio: ratio
                                            };

                                            returnAmount += freeConsumption * ratio;
                                        }


                                    });
                                }

                                if (returnAmount >= 0.01) {
                                    // Generate xima proposal
                                    let proposalData = {
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
                                            eventId: eventData._id,
                                            rewardAmount: returnAmount < 0.01 ? 0 : returnAmount,
                                            returnDetail: returnDetail,
                                            nonXIMADetail: nonXIMADetail,
                                            summaryIds: summaryIds,
                                            bConsumptionReturnRequest: bRequest,
                                            consumeValidAmount: applyAmount,
                                            totalNonXIMAAmt: totalNonXIMAAmt,
                                            eventDescription: eventData.description,
                                            startTime: startTime,
                                            endTime: endTime
                                        }
                                    };

                                    if (eventData.param.consumptionTimesRequired && eventData.param.consumptionTimesRequired > 0) {
                                        proposalData.data.spendingAmount = proposalData.data.rewardAmount * eventData.param.consumptionTimesRequired;
                                    }

                                    if (lastConsumption && lastConsumption.length > 0) {
                                        let lastConsumptionDetail = lastConsumption[0] ? lastConsumption[0] : {};

                                        proposalData.data.betTime = lastConsumptionDetail.createTime;
                                        proposalData.data.betAmount = lastConsumptionDetail.validAmount;
                                        proposalData.data.betType = lastConsumptionDetail.betType;
                                        proposalData.data.winAmount = lastConsumptionDetail.bonusAmount;
                                        proposalData.data.winTimes = lastConsumptionDetail.winRatio;
                                    }

                                    if (adminId && adminName) {
                                        proposalData.creator = {
                                            name: adminName,
                                            type: 'admin',
                                            id: adminId
                                        }
                                    } else if (bRequest) {
                                        // if userAgent is null, inputDevice should be H5 player or partner
                                        proposalData.inputDevice = dbutility.getInputDevice(userAgent);
                                        proposalData.creator = {
                                            type: 'player',
                                            name: playerData.name,
                                            id: playerData.playerId
                                        }
                                    } else {
                                        proposalData.inputDevice = constPlayerRegistrationInterface.BACKSTAGE;
                                    }

                                    // Check whether ignore audit
                                    proposalData.data.isIgnoreAudit = eventData.param
                                        && Number.isInteger(eventData.param.isIgnoreAudit)
                                        && eventData.param.isIgnoreAudit >= proposalData.data.rewardAmount;

                                    // Check minimum xima amount
                                    if (eventData && eventData.param && eventData.param.earlyXimaMinAmount
                                        && bRequest && !isForceApply && proposalData.data.rewardAmount < eventData.param.earlyXimaMinAmount)
                                    {
                                        // Not enough xima amount
                                        isLessThanEnoughReward = true;
                                    } else {
                                        processedSummaries = processedSummaries.concat(thisPlayerSummaries);
                                        return dbProposal.createProposalWithTypeId(proposalTypeId, proposalData);
                                    }
                                } else if (bRequest && returnAmount === 0) {
                                    isLessThanEnoughReward = true;
                                }

                                return Promise.resolve(true);
                            }
                        }
                    ).catch(
                        err => {
                            if (!bRequest) {
                                return Promise.resolve();
                            } else {
                                throw err;
                            }
                        }
                    )
                )
            });

            return Promise.all(promArr).then(
                function (data) {
                    if (data) {
                        if (isLessThanEnoughReward) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DBError",
                                message: eventData && eventData.param && eventData.param.earlyXimaMinAmount ? "您的洗码额度不足"+eventData.param.earlyXimaMinAmount+"元，无法提前结算洗码，谢谢": "您的洗码额度不足，无法提前结算洗码，谢谢"
                            });;
                        } else {
                            let summaryIds = processedSummaries.map(summary => summary._id);
                            // mark record as dirty, remove them if proposal is approved, reset as clean record if proposal is rejected
                            return dbconfig.collection_playerConsumptionSummary.find(
                                {_id: {$in: summaryIds}}
                            ).lean().then(
                                summaryRecords => {
                                    //only mark summary dirty if they are not removed , which means the proposal is not approved
                                    if (summaryRecords && summaryRecords.length > 0) {
                                        return dbOps.removeWithRetry(dbconfig.collection_playerConsumptionSummary, {_id: {$in: summaryIds}})
                                    }
                                }
                            ).then(
                                () => {
                                    let summaryProms = processedSummaries.map(
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
                                                        summary.dirtyDate = Date.now();
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
                },
                function (error) {
                    return Promise.reject({
                        name: "DBError",
                        message: "Error creating player consumption return proposal",
                        error: error
                    });
                }
            )
        }
    },

    /**
     * Start calculate consumption return for player
     * @param {ObjectId} playerId
     */
    startCalculatePlayerConsumptionReturn: function (playerId, bRequest, bAdmin, eventCode, userAgent, adminName, isForceApply, isFrontEnd) {
        let platformData = null;
        let playerData = null;
        let eventData = null;
        //check if player platform has consumption return reward event
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "platform", model: dbconfig.collection_platform}).then(
            function (data) {
                if (data && data.platform && data.playerLevel) {
                    playerData = data;
                    platformData = data.platform;

                    if (!playerData.playerLevel.canApplyConsumptionReturn) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have this permission"
                        });
                    }

                    let stateProm = Promise.resolve(true);

                    if (isFrontEnd) {
                        stateProm = dbPlayerUtil.setPlayerBState(playerData._id, "applyXIMAFrontEnd", true);
                    }

                    return stateProm;
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player data"});
                }
            },
            function (error) {
                return Promise.reject({name: "DBError", message: "Error finding player", error: error});
            }
        ).then(
            playerState => {
                if (playerState) {
                    if( eventCode ){
                        return dbRewardEvent.getPlatformRewardEventWithCode(playerData.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN, eventCode);
                    }
                    else{
                        return dbRewardEvent.getPlatformRewardEventsWithTypeName(playerData.platform._id, constRewardType.PLAYER_CONSUMPTION_RETURN);
                    }
                }
                else {
                    return Promise.reject({
                        name: "DBError",
                        status: constServerCode.CONCURRENT_DETECTED,
                        message: "Apply Reward Fail, please try again later"
                    })
                }
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
                                return Promise.reject({
                                    status: constServerCode.PLAYER_NO_PERMISSION,
                                    name: "DataError",
                                    errorMessage: "Player do not have permission to apply consumption return"
                                });
                            }
                            if (!updatePlayer.isConsumptionReturn || bAdmin) {
                                return dbconfig.collection_proposalType.findOne({platformId: platformData._id, name: constProposalType.PLAYER_CONSUMPTION_RETURN}).lean();
                            }
                            else {
                                return Promise.reject({
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
                                return Promise.reject({
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
                                return Promise.reject({
                                    name: "DataError",
                                    message: "Player or partner already has a pending proposal for this type"
                                });
                            }

                            let proms = [];
                            let curTime = new Date();
                            let invalidEventCount = 0;
                            let isDetectEventNotStart = false;
                            let isDetectEventEnd = false;
                            for (let eventData of eventsData) {
                                let isValidEvent = true;
                                if (eventData.validStartTime && (curTime.getTime() < eventData.validStartTime.getTime())) {
                                    isDetectEventNotStart = true;
                                    isValidEvent = false;
                                    invalidEventCount++;
                                } else if (eventData.validEndTime && (curTime.getTime() > eventData.validEndTime.getTime())) {
                                    isDetectEventEnd = true;
                                    isValidEvent = false;
                                    invalidEventCount++;
                                }
                                if (dbRewardUtil.isRewardEventForbidden(playerData, eventsData._id)) {
                                    continue;
                                }
                                if (isValidEvent) {
                                    proms.push(dbPlayerConsumptionWeekSummary.calculatePlayerConsumptionReturn(playerData, platformData, eventData, bRequest, userAgent, bAdmin, adminName, isForceApply));
                                }
                            }

                            if (invalidEventCount && eventsData && invalidEventCount == eventsData.length) {
                                if (isDetectEventNotStart && isDetectEventEnd) {
                                    return Promise.reject({
                                        status: constServerCode.REWARD_EVENT_INVALID,
                                        name: "DataError",
                                        errorMessage: "This reward event is expired"
                                    });
                                } else if (isDetectEventNotStart && !isDetectEventEnd) {
                                    return Promise.reject({
                                        status: constServerCode.REWARD_EVENT_INVALID,
                                        name: "DataError",
                                        errorMessage: "This reward event is not valid anymore"
                                    });
                                } else if (!isDetectEventNotStart && isDetectEventEnd) {
                                    return Promise.reject({
                                        status: constServerCode.REWARD_EVENT_INVALID,
                                        name: "DataError",
                                        errorMessage: "This reward event is expired"
                                    });
                                }
                            }

                            return Q.all(proms).then(
                                data => {
                                    //reset consumption return status
                                    dbconfig.collection_players.findOneAndUpdate({
                                        _id: playerData._id,
                                        platform: playerData.platform._id
                                    }, {isConsumptionReturn: false}).then();

                                    // Set BState to false
                                    dbPlayerUtil.setPlayerBState(playerData._id, "applyXIMAFrontEnd", false).catch(errorUtils.reportError);

                                    return data;
                                }
                            );
                        }
                    ).catch(
                        error => {
                            //reset consumption return status
                            dbconfig.collection_players.findOneAndUpdate({
                                _id: playerData._id,
                                platform: playerData.platform._id
                            }, {isConsumptionReturn: false}).then();

                            // Set BState to false
                            dbPlayerUtil.setPlayerBState(playerData._id, "applyXIMAFrontEnd", false).catch(errorUtils.reportError);

                            return Promise.reject(error);
                        }
                    );
                }
                else {
                    return Promise.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Incorrect reward event data"
                    });
                }
            }
        ).catch(
            err => {
                if (err.status === constServerCode.CONCURRENT_DETECTED) {
                    // Ignore concurrent request for now
                } else {
                    // Set BState back to false
                    dbPlayerUtil.setPlayerBState(playerData._id, "applyXIMAFrontEnd", false).catch(errorUtils.reportError);
                }

                throw err;
            }
        )
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
        return dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturnForPlayers(platformData._id, eventData, eventData.executeProposal, settleTime.startTime, new Date(), [playerData._id], adminName, adminId, bRequest, userAgent,  isForceApply);
    },

    /**
     * Get consumption return amount for player
     * @param {String} playerId
     * @param eventCode
     */
    getPlayerConsumptionReturn: function (playerId, eventCode, isShowProviderId) {
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
                            if (isShowProviderId) {
                                proms.push(dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount(platformData._id, eventData, eventData.executeProposal, playerData._id, false, true, true, platformData));
                            } else {
                                proms.push(dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount(platformData._id, eventData, eventData.executeProposal, playerData._id, false, true));
                            }
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
                    var res = {};
                    if (isShowProviderId) {
                        // this mode will only have 1 event, if problem occurs please check total event
                        res = {
                            totalAmount: 0,
                            totalConsumptionAmount: 0,
                            event: eventObj,
                            list: []
                        };
                        let consumeData = data && data[0] || null;
                        if (consumeData) {
                            res.totalAmount = consumeData.totalAmount? Number(consumeData.totalAmount.toFixed(2)): 0;
                            res.totalConsumptionAmount = consumeData.totalConsumptionAmount? Number(consumeData.totalConsumptionAmount.toFixed(2)): 0;
                            res.startTime = consumeData.settleTime && consumeData.settleTime.startTime;
                            res.endTime = consumeData.settleTime && consumeData.settleTime.endTime;

                            if (consumeData.gameType) {
                                for (let gameType in consumeData.gameType) {
                                    res.list.push(consumeData.gameType[gameType]);
                                }
                            }
                        }
                    } else {
                        res = {totalAmount: 0, totalConsumptionAmount: 0, event: eventObj};
                        for (let amounts of data) {
                            Object.keys(amounts).forEach(
                                type => {
                                    // console.log('amounts', amounts[type]);
                                    // res[type] = null
                                    if (res[type]) {
                                        if (res[type].hasOwnProperty("returnAmount")) {
                                            console.log('amount return', amounts[type].returnAmount);
                                            res[type].returnAmount += amounts[type].returnAmount;
                                            res[type].returnAmount = res[type].returnAmount.toFixed(2);
                                        } else {
                                            res[type] += amounts[type];
                                        }
                                    } else {
                                        res[type] = amounts[type];
                                        if (res[type].hasOwnProperty("returnAmount")) {
                                            res[type].returnAmount = res[type].returnAmount.toFixed(2);
                                        }
                                    }

                                    if (res.totalAmount) {
                                        res.totalAmount = Number(res.totalAmount.toFixed(2));
                                    }
                                    if (res.totalConsumptionAmount) {
                                        res.totalConsumptionAmount = Number(res.totalConsumptionAmount.toFixed(2));
                                    }
                                }
                            )
                        }
                    }
                    // console.log('res', res);
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
     * @param isShowProviderId - for getConsumeRebateAmount API only
     * @param platformObj - for getConsumeRebateAmount API only
     */
    getPlayerConsumptionReturnAmount: function (platformId, event, proposalTypeId, playerId, bDetail, bRequest, isShowProviderId, platformObj) {
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

        return dbconfig.collection_players.findById(playerId).populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().then(
            playerData => {
                // Get player consumption records
                let recPromGroup = {
                    $group: {
                        _id: "$gameType",
                        validAmount: {$sum: "$validAmount"}
                    }
                }

                if (isShowProviderId) {
                    recPromGroup.$group.providerId = {$addToSet: "$providerId"}
                }

                let recProm = dbconfig.collection_playerConsumptionRecord.aggregate(
                    {
                        $match: {
                            platformId: platformId,
                            createTime: summaryDay,
                            playerId: playerData._id,
                            $or: [
                                {isDuplicate: {$exists: false}},
                                {
                                    $and: [
                                        {isDuplicate: {$exists: true}},
                                        {isDuplicate: false}
                                    ]
                                }
                            ]
                        }
                    },
                    recPromGroup
                );

                if (isShowProviderId) {
                    recProm = recProm.then(
                        recData => {
                            if (recData && recData.length) {
                                return dbconfig.collection_gameProvider.populate(recData, {
                                    path: 'providerId',
                                    model: dbconfig.collection_gameProvider,
                                    select: "providerId name"
                                })

                            } else {
                                return recData;
                            }
                        }
                    )
                }

                // Get player consumption summary
                let summaryProm = dbconfig.collection_playerConsumptionSummary.find(
                    {
                        platformId: platformId,
                        playerId: playerData._id,
                        summaryDay: summaryDay,
                        bDirty: false
                    }
                ).lean();

                // Get player done xima proposal
                let proposalQ = {
                    createTime: summaryDay,
                    'data.platformId': platformId,
                    'data.playerObjId': playerData._id,
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                    'data.bConsumptionReturnRequest': true,
                };

                let pastProm = dbPropUtil.getProposalDataOfType(platformId, constProposalType.PLAYER_CONSUMPTION_RETURN, proposalQ);
                let gameTypesProm = dbGameType.getAllGameTypes();
                if (isShowProviderId) {
                    gameTypesProm = dbGameType.getAllGameTypesName();
                }

                return Promise.all([Promise.resolve(playerData), recProm, summaryProm, pastProm, gameTypesProm]);
            }
        ).then(
            promArrRes => {
                if (promArrRes) {
                    let [playerData, recSumm, consumptionSumm, pastProps, allGameTypes] = promArrRes;

                    let returnAmount = 0;
                    let returnDetail = {};
                    let doneXIMAConsumption = {};
                    let nonXIMADetail = {};
                    let summaryIds = [];
                    let applyAmount = 0;
                    let totalNonXIMAAmt = 0;
                    let thisPlayerSummaries = [];

                    let playerLevel = playerData.playerLevel;
                    let eventRatios = eventData.ratio[playerLevel.value];

                    // Done xima proposals
                    if (pastProps && pastProps.length) {
                        pastProps.map(prop => {
                            if (prop.data && prop.data.returnDetail) {
                                Object.keys(prop.data.returnDetail).forEach(el => {
                                    doneXIMAConsumption[el] && doneXIMAConsumption[el].consumeValidAmount
                                        ? doneXIMAConsumption[el].consumeValidAmount = Number(doneXIMAConsumption[el].consumeValidAmount) + Number(prop.data.returnDetail[el].consumeValidAmount)
                                        : doneXIMAConsumption[el] = prop.data.returnDetail[el];

                                    if (prop.data.nonXIMADetail && prop.data.nonXIMADetail[el] && prop.data.nonXIMADetail[el].nonXIMAAmt) {
                                        doneXIMAConsumption[el].consumeValidAmount = Number(doneXIMAConsumption[el].consumeValidAmount) + Number(prop.data.nonXIMADetail[el].nonXIMAAmt);
                                    }
                                });
                            }
                        })
                    }

                    // Go through record summaries
                    // Generate return summary
                    let res = {};
                    res.settleTime = settleTime;
                    res.totalConsumptionAmount = 0;
                    let selectedGameTypeObj;
                    if (isShowProviderId) { // different obj structure
                        res.gameType = {};
                        selectedGameTypeObj = res.gameType;
                    } else {
                        selectedGameTypeObj = res;
                    }

                    if (recSumm && recSumm.length) {
                        recSumm.forEach(el => {
                            let gameType = el._id;
                            let totalValidConsumption = el.validAmount ? el.validAmount : 0;
                            let nonXIMAAmt = 0;
                            let consumedValidAmount = 0;
                            let ratio = eventRatios && eventRatios[gameType];
                            let consumptionSummary = consumptionSumm.filter(summ => summ.gameType === gameType);

                            // Process return ratio
                            if (!eventRatios || typeof ratio !== 'number') {
                                ratio = 0;
                            }

                            if (ratio > 0) {
                                // Get amount that done xima for this provider
                                if (doneXIMAConsumption["GameType:" + el._id] && doneXIMAConsumption["GameType:" + el._id].consumeValidAmount) {
                                    consumedValidAmount = doneXIMAConsumption["GameType:" + el._id].consumeValidAmount;
                                }

                                // Get non xima detail of this game type
                                if (consumptionSummary && consumptionSummary.length) {
                                    consumptionSummary.forEach(summ => {
                                        if (summ.nonXIMAAmt) {
                                            nonXIMAAmt += Number(summ.nonXIMAAmt);
                                        }
                                        summaryIds.push(summ._id);
                                        thisPlayerSummaries.push(summ);
                                    });

                                    if (nonXIMAAmt) {
                                        totalNonXIMAAmt += nonXIMAAmt;
                                        nonXIMADetail["GameType:" + gameType] = {
                                            nonXIMAAmt: nonXIMAAmt
                                        };
                                    }
                                }

                                console.log('totalValidConsumption', totalValidConsumption);
                                console.log('nonXIMAAmt', nonXIMAAmt);
                                console.log('consumedValidAmount', consumedValidAmount);

                                // Get amount that are available to xima
                                let freeConsumption = Number(totalValidConsumption) - Number(nonXIMAAmt) - Number(consumedValidAmount);
                                applyAmount += freeConsumption;

                                // Get return detail of this game type
                                returnDetail["GameType:" + gameType] = {
                                    consumeValidAmount: freeConsumption,
                                    ratio: ratio
                                };

                                returnAmount += freeConsumption * ratio;
                                res.totalConsumptionAmount += freeConsumption;
                                selectedGameTypeObj[gameType] = {
                                    consumptionAmount: freeConsumption,
                                    returnAmount: freeConsumption * ratio,
                                    nonXIMAAmt: nonXIMAAmt,
                                    ratio: ratio
                                };

                            } else {
                                selectedGameTypeObj[gameType] = {
                                    consumptionAmount: 0,
                                    returnAmount: 0,
                                    nonXIMAAmt: 0,
                                    ratio: ratio
                                };

                            }
                            if (isShowProviderId) {
                                if (el.providerId && el.providerId.length) {
                                    let providerListArr = [];
                                    el.providerId.forEach(provider => {
                                        let tempObj = {
                                            providerId: provider.providerId,
                                            nickName: provider.name
                                        }

                                        let providerIdString = String(provider._id);

                                        if (providerIdString && platformObj && platformObj.gameProviderInfo
                                        && platformObj.gameProviderInfo[providerIdString] && platformObj.gameProviderInfo[providerIdString].localNickName) {
                                            tempObj.nickName = platformObj.gameProviderInfo[providerIdString].localNickName;
                                        }

                                        providerListArr.push(tempObj)
                                    })
                                    selectedGameTypeObj[gameType].providerList = providerListArr;
                                } else {
                                    selectedGameTypeObj[gameType].providerList = [];
                                }
                                selectedGameTypeObj[gameType].gameType =  allGameTypes[gameType] || String(gameType);
                            }
                        });
                    }

                    res.totalAmount = returnAmount < 1 ? 0 : returnAmount;

                    if (bDetail) {
                        res.playerId = playerData.playerId;
                        res.playerName = playerData.name;
                    }

                    // Add in others provider as placeholder
                    Object.keys(allGameTypes).forEach(gameType => {
                        let ratio = eventRatios && eventRatios[gameType];

                        // Process return ratio
                        if (!eventRatios || typeof ratio !== 'number') {
                            ratio = 0;
                        }

                        if (!selectedGameTypeObj[gameType] && ratio >= 0) {
                            selectedGameTypeObj[gameType] = {
                                consumptionAmount: 0,
                                returnAmount: 0,
                                nonXIMAAmt: 0,
                                ratio: ratio
                            };

                            if (isShowProviderId) {
                                selectedGameTypeObj[gameType].providerList = [];
                                selectedGameTypeObj[gameType].gameType = allGameTypes[gameType] || String(gameType);
                            }
                        }
                    });

                    return res;
                } else {
                    //no consumption records
                    if (bDetail) {
                        return {
                            settleTime: settleTime,
                            playerId: playerId,
                            playerName: 'Player Not Found',
                            totalAmount: 0
                        };
                    }
                }
            }
        )
    }
};

//module.exports = dbPlayerConsumptionWeekSummary;
var proto = dbPlayerConsumptionWeekSummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionWeekSummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionWeekSummary;
