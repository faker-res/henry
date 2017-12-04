'use strict';

var dbPlayerRewardFunc = function () {
};
module.exports = new dbPlayerRewardFunc();

const Q = require("q");
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constPromoCodeStatus = require("./../const/constPromoCodeStatus");
const constProposalEntryType = require("./../const/constProposalEntryType");
const constProposalStatus = require("./../const/constProposalStatus");
const constProposalType = require("./../const/constProposalType");
const constProposalUserType = require("./../const/constProposalUserType");
const constRewardApplyType = require("./../const/constRewardApplyType");
const constRewardType = require("./../const/constRewardType");
const constServerCode = require('../const/constServerCode');

const dbPlayerUtil = require('../db_common/dbPlayerUtility');
var constProposalMainType = require('../const/constProposalMainType');

const dbGameProvider = require('../db_modules/dbGameProvider');
const dbProposal = require('./../db_modules/dbProposal');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const dbPlayerPayment = require('../db_modules/dbPlayerPayment');
const dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
const dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');

const dbConfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');
const errorUtils = require("./../modules/errorUtils.js");
const rewardUtility = require("../modules/rewardUtility");

let rsaCrypto = require("../modules/rsaCrypto");

let dbPlayerReward = {
    getConsecutiveLoginRewardDay: function (playerId, code) {
        let platformId = null;
        let player = {};
        let playerProm = dbConfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();

        return playerProm.then(
            data => {
                //get player's platform reward event data
                if (data && data.playerLevel) {
                    player = data;
                    platformId = player.platform;

                    //get reward event data
                    return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD, code);
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            data => {
                if (data) {
                    let eventData = data;
                    let curWeekTime = dbUtility.getCurrentWeekSGTime();

                    if (rewardUtility.isValidRewardEvent(constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD, eventData) && eventData.needApply) {
                        // Check proposals for this week's reward apply
                        return dbConfig.collection_proposal.find({
                            type: eventData.executeProposal,
                            'data.platformId': platformId,
                            'data.playerId': player.playerId,
                            createTime: {$gte: curWeekTime.startTime, $lt: curWeekTime.endTime},
                            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                        });
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "Invalid player consecutive login event data for platform"
                        });
                    }
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find player consecutive login event data for platform"
                    });
                }
            }
        ).then(
            proposals => {
                if (proposals) {
                    let dayIndex = proposals.length + 1;
                    let todayTime = dbUtility.getTodaySGTime();
                    let isApplied = false;

                    // Check if player has applied today
                    proposals.some(
                        (elem, index, arr) => {
                            isApplied = elem.createTime >= todayTime.startTime && elem.createTime < todayTime.endTime;

                            return isApplied;
                        }
                    );

                    return {
                        dayIndex: isApplied ? proposals.length : dayIndex,
                        isApplied: isApplied
                    };
                }
            }
        )
    },

    getPlayerConsecutiveRewardDetail: (playerId, code, isApply) => {
        // reward event code is an optional value, getting the latest relevant event by default
        let platformId = null;
        let player, event, selectedParam, intervalTime, paramOfLevel;
        let outputList = [];
        let playerProm = dbConfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();
        let requiredDeposit = 0;
        let numberOfParam = 1;
        let consecutiveNumber = 1;
        let requiredBet = 0;
        let requireBoth = false;

        function insertOutputList (status, step, bonus, requestedTimes, targetDate, forbidWithdrawAfterApply, remark, isSharedWithXIMA, meetRequirement, requiredConsumptionMet, requiredTopUpMet, usedTopUpRecord) {
            let listItem = {
                status, // 0 - unavailable, 1 - available, 2 - applied
                step,
                bonus,
                requestedTimes
            };

            if (targetDate) listItem.targetDate = targetDate;

            if (isApply) {
                listItem.forbidWithdrawAfterApply = forbidWithdrawAfterApply;
                listItem.remark = remark;
                listItem.isSharedWithXIMA = isSharedWithXIMA;
                listItem.meetRequirement = meetRequirement;
                listItem.requiredConsumptionMet = requiredConsumptionMet;
                listItem.requiredTopUpMet = requiredTopUpMet;
                listItem.usedTopUpRecord = usedTopUpRecord;
            }

            outputList.push(listItem);
        }

        return playerProm.then(data => {
            //get player's platform reward event data
            if (data && data.playerLevel) {
                player = data;
                platformId = player.platform;

                //get reward event data
                return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP, code);
            }
            else {
                return Q.reject({name: "DataError", message: "Invalid player data"});
            }
        }).then(eventData => {
            event = eventData;
            let currentTime = new Date();
            // check if reward valid for targetDate
            if (event.validStartTime && event.validStartTime > currentTime || event.validEndTime && event.validEndTime < currentTime) {
                return Q.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "This reward event is not valid anymore"
                });
            }

            if (event.condition) {
                switch (event.condition.interval) {
                    case "1":
                        intervalTime = dbUtility.getTodaySGTime();
                        break;
                    case "2":
                        intervalTime = dbUtility.getCurrentWeekSGTime();
                        break;
                    case "3":
                        intervalTime = dbUtility.getCurrentBiWeekSGTIme();
                        break;
                    case "4":
                        intervalTime = dbUtility.getCurrentMonthSGTIme();
                        break;
                    default:
                        if (event.validStartTime && event.validEndTime) {
                            intervalTime = {startTime: event.validStartTime, endTime: event.validEndTime};
                        }
                        break;
                }
            }

            let similarRewardProposalProm;

            let rewardProposalQuery = {
                "data.platformObjId": player.platform,
                "data.playerObjId": player._id,
                "data.eventId": event._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };
            console.log(rewardProposalQuery);

            if (!intervalTime) {
                // get last similar reward proposal
                similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).sort({createTime: -1}).limit(1).lean();
            } else {
                rewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).sort({createTime: -1}).lean();
            }

            return similarRewardProposalProm;
        }).then(rewardProposalData => {
            requiredDeposit = event.param.requiredTopUpAmount;
            requiredBet = event.param.requiredConsumptionAmount;
            requireBoth = event.param.operatorOption;
            let startCheckTime, latestRewardProposal;
            paramOfLevel = event.param.rewardParam[0].value;

            if (event.condition.isPlayerLevelDiff) {
                let rewardParam = event.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id));
                if (rewardParam && rewardParam[0] && rewardParam[0].value) {
                    paramOfLevel = rewardParam[0].value;
                }
            }

            if (event.param.isMultiStepReward) {
                numberOfParam = paramOfLevel.length; // number of step
            }

            if (!rewardProposalData || rewardProposalData.length === 0) {
                startCheckTime = event.validStartTime > intervalTime.startTime ? event.validStartTime : intervalTime.startTime;
            } else {
                latestRewardProposal = rewardProposalData[0];
                let lastRewardDate = dbUtility.getTargetSGTime(latestRewardProposal.data.applyTargetDate).startTime;
                let nextDay = lastRewardDate.setDate(lastRewardDate.getDate()+1);
                startCheckTime = nextDay;
                consecutiveNumber = latestRewardProposal.data.consecutiveNumber + 1;
            }

            selectedParam = paramOfLevel[Math.min(consecutiveNumber - 1, paramOfLevel.length - 1)];

            if (consecutiveNumber !== 1) {
                for (let i = 0; i < consecutiveNumber - 1; i++) {
                    let bonus = paramOfLevel[i].rewardAmount;
                    let requestedTimes = paramOfLevel[i].spendingTimes || 1;

                    insertOutputList(2, i+1, bonus, requestedTimes);
                }
            }

            let checkRequirementMeetProms = [];

            let today = dbUtility.getTodaySGTime();
            let currentDay = dbUtility.getTargetSGTime(startCheckTime);
            while (currentDay.startTime <= today.startTime) {
                checkRequirementMeetProms.push(isDayMeetRequirement(event, player, currentDay, requiredBet, requiredDeposit, requireBoth));
                currentDay = dbUtility.getTargetSGTime(currentDay.endTime);
            }

            return Promise.all(checkRequirementMeetProms);
        }).then(checkResults => {
            if (checkResults) {
                if (checkResults.length === 1) {
                    let result = checkResults[0];
                    if (result.meetRequirement) {
                        let bonus = selectedParam.rewardAmount;
                        let requestedTimes = selectedParam.spendingTimes || 1;

                        insertOutputList(1, consecutiveNumber, bonus, requestedTimes, result.targetDate,
                            selectedParam.forbidWithdrawAfterApply, selectedParam.remark, selectedParam.isSharedWithXIMA,
                            result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord);
                    }
                } else if (checkResults.length > 1) {
                    if (event.condition.requireNonBreakingCombo && event.condition.allowReclaimMissedRewardDay) {

                        let currentStreak = consecutiveNumber - 1;
                        let currentMaxStreak = consecutiveNumber - 1;
                        // let currentStreakDetail = [];
                        let maxStreakDetail = [];

                        for (let i = 0; i < checkResults.length; i++) {
                            let result = checkResults[i];
                            if (result.meetRequirement) {
                                currentStreak++;
                                // currentStreakDetail.push(result.targetDate);

                                if (currentStreak > currentMaxStreak) {
                                    currentMaxStreak = currentStreak;
                                    // maxStreakDetail = currentStreakDetail;
                                    maxStreakDetail.push(result);
                                }
                            } else {
                                currentStreak = 0;
                                // currentStreakDetail = [];
                            }
                        }

                        for (let i = consecutiveNumber - 1; i < currentMaxStreak; i++) {
                            let currentParamNo = Math.min(i, numberOfParam - 1);
                            let step = i + 1;
                            let currentParam = paramOfLevel[currentParamNo];
                            let bonus = currentParam.rewardAmount;
                            let result = maxStreakDetail[i - (consecutiveNumber - 1)];
                            let targetDate = result.targetDate;
                            let requestedTimes = currentParam.spendingTimes || 1;

                            insertOutputList(1, step, bonus, requestedTimes, targetDate,
                                currentParam.forbidWithdrawAfterApply, currentParam.remark, currentParam.isSharedWithXIMA,
                                result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord);
                        }
                    } else if (event.condition.requireNonBreakingCombo) {
                        // restart combo check trace back from today, if today's combo check is higher than consecutiveNumber, allow apply for today only
                        let currentStreak = 0;
                        let streakFromPastApplied = true;
                        let result = checkResults[checkResults.length -1]
                        let targetDate = result.targetDate;
                        let requestedTimes = selectedParam.spendingTimes || 1;

                        for (let i = checkResults.length -1; i >= 0; i--) {
                            let result = checkResults[i];

                            if (result.meetRequirement) {
                                currentStreak++;
                            } else {
                                streakFromPastApplied = false;
                                break;
                            }
                        }

                        if (streakFromPastApplied || currentStreak >= consecutiveNumber) {
                            let bonus = selectedParam.rewardAmount;

                            insertOutputList(1, consecutiveNumber, bonus, requestedTimes, targetDate,
                                selectedParam.forbidWithdrawAfterApply, selectedParam.remark, selectedParam.isSharedWithXIMA,
                                result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord);
                        }
                    } else if (event.condition.allowReclaimMissedRewardDay) {
                        // trace back toward start check date and see how many can be apply, assign accordingly
                        let currentStreak = consecutiveNumber - 1;

                        for (let i = 0; i < checkResults.length; i++) {
                            let result = checkResults[i];
                            if (result.meetRequirement) {
                                let currentParamNo = Math.min(currentStreak, numberOfParam - 1);
                                let currentParam = paramOfLevel[currentParamNo];
                                let bonus = currentParam.rewardAmount;
                                let requestedTimes = currentParam.spendingTimes || 1;

                                insertOutputList(1, currentStreak+1, bonus, requestedTimes, result.targetDate,
                                    currentParam.forbidWithdrawAfterApply, currentParam.remark, currentParam.isSharedWithXIMA,
                                    result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord);
                                currentStreak++;
                            }
                        }
                    } else {
                        // check today only, if requirement met, allow apply for today
                        let result = checkResults[checkResults.length - 1];
                        if (result.meetRequirement) {
                            let bonus = selectedParam.rewardAmount;
                            let requestedTimes = selectedParam.spendingTimes || 1;

                            insertOutputList(1, consecutiveNumber, bonus, requestedTimes, result.targetDate,
                                selectedParam.forbidWithdrawAfterApply, selectedParam.remark, selectedParam.isSharedWithXIMA,
                                result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord);
                        }
                    }
                }
            }

            for (let i = outputList.length; i < paramOfLevel.length; i++) {
                let bonus = paramOfLevel[i].rewardAmount;
                let requestedTimes = paramOfLevel[i].spendingTimes || 1;

                insertOutputList(0, i+1, bonus, requestedTimes);
            }

            return {
                startTime: event.validStartTime,
                endTime: event.validEndTime,
                deposit: event.param.requiredTopUpAmount,
                effectiveBet: event.param.requiredConsumptionAmount,
                list: outputList
            }
        });

        function isDayMeetRequirement (event, playerData, targetDate, requiredConsumptionAmount, requiredTopUpAmount, operatorOption) {
            let playerObjId = ObjectId(playerData._id);
            let startTime = new Date(targetDate.startTime);
            let endTime = new Date(targetDate.endTime);

            let topUpSumQuery = {
                playerId: playerObjId,
                createTime: {$gte: startTime, $lt: endTime}
            };

            let topUpProm = dbConfig.collection_playerTopUpRecord.find(topUpSumQuery).lean();

            let consumptionSumQuery = {
                playerId: playerObjId,
                createTime: {$gte: startTime, $lt: endTime}
            };

            if (event.condition.consumptionProvider && event.condition.consumptionProvider.length > 0) {
                let providers = event.condition.consumptionProvider;
                for (let i = 0; i < providers.length; i++) {
                    providers[i] = ObjectId(providers[i]);
                }
                consumptionSumQuery.providerId = {$in: event.condition.consumptionProvider};
            }

            if (!event.condition.isSharedWithXIMA) {
                consumptionSumQuery.bDirty = false;
            }

            let consumptionProm = dbConfig.collection_playerConsumptionRecord.aggregate([
                {$match: consumptionSumQuery},
                {$group: {
                    _id: null,
                    total: {$sum: "$validAmount"}
                }}
            ]);

            return Promise.all([topUpProm, consumptionProm]).then(data => {
                let topUpRecords = data[0];
                let consumptionData = data[1];
                let consumptionAmount = (consumptionData && consumptionData[0] && consumptionData[0].total) ? consumptionData[0].total : 0;
                let requiredConsumptionMet = false;
                let requiredTopUpMet = false;

                if (consumptionAmount >= requiredConsumptionAmount)
                    requiredConsumptionMet = true;

                let bypassDirtyEvent;

                if (event.condition.ignoreAllTopUpDirtyCheckForReward && event.condition.ignoreAllTopUpDirtyCheckForReward.length > 0) {
                    bypassDirtyEvent = event.condition.ignoreAllTopUpDirtyCheckForReward;
                }

                let totalTopUpAmount = 0;
                let usedTopUpRecord = [];
                for (let i = 0; i < topUpRecords.length; i++) {
                    let record = topUpRecords[i];
                    if (bypassDirtyEvent) {
                        let isSubset = record.usedEvent.every(event => {
                            return bypassDirtyEvent.indexOf(event) > -1;
                        });
                        if (!isSubset)
                            continue;
                    } else {
                        if (record.bDirty)
                            continue;
                    }

                    totalTopUpAmount += record.amount;
                    usedTopUpRecord.push(record._id)
                    if (totalTopUpAmount >= requiredTopUpAmount) {
                        requiredTopUpMet = true;
                        break;
                    }
                }

                let meetRequirement = false;

                if (operatorOption) {
                    // AND
                    meetRequirement = requiredConsumptionMet && requiredTopUpMet;
                } else {
                    // OR
                    meetRequirement = requiredConsumptionMet || requiredTopUpMet;
                }

                let response = {targetDate, meetRequirement, requiredConsumptionMet, requiredTopUpMet};
                if (isApply && meetRequirement && requiredTopUpMet) {
                    response.usedTopUpRecord = usedTopUpRecord;
                }

                return response;
            });
        }
    },

    getPromoCodeTypes: (platformObjId) => dbConfig.collection_promoCodeType.find({platformObjId: platformObjId}).lean(),

    getPromoCodeTypeByObjId: (promoCodeTypeObjId) => dbConfig.collection_promoCodeType.findOne({_id: promoCodeTypeObjId}).lean(),

    /*
     * player apply for consecutive login reward
     * @param {String} playerId
     * @param {String} code
     */
    applyConsecutiveLoginReward: function (userAgent, playerId, code, adminId, adminName, isPrevious) {
        let platformId = null;
        let player = {};
        let todayTime = dbUtility.getTodaySGTime();
        let event = {};
        let adminInfo = {};
        if (adminId && adminName) {
            adminInfo = {
                name: adminName,
                type: 'admin',
                id: adminId
            }
        }

        let playerProm = dbConfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();
        return playerProm.then(
            data => {
                //get player's platform reward event data
                if (data && data.playerLevel) {
                    player = data;
                    platformId = player.platform;

                    //get reward event data
                    return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD, code);
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            data => {
                if (data) {
                    let eventData = data;

                    if (rewardUtility.isValidRewardEvent(constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD, eventData) && eventData.needApply) {
                        event = eventData;

                        if (isPrevious) {
                            let queryTime = todayTime;
                            let curWeekTime = dbUtility.getCurrentWeekSGTime();
                            let dateArr = [];

                            while (queryTime.startTime.getTime() != curWeekTime.startTime.getTime()) {
                                queryTime = dbUtility.getPreviousSGDayOfDate(queryTime.startTime);
                                dateArr.push({
                                    startTime: new Date(queryTime.startTime),
                                    endTime: new Date(queryTime.endTime)
                                });
                            }
                            let bProposal = false;
                            player.inputDevice = dbUtility.getInputDevice(userAgent, false);
                            let proc = () => {
                                queryTime = dateArr.pop();
                                return processConsecutiveLoginRewardRequest(player, queryTime, event, adminInfo, isPrevious).then(
                                    data => {
                                        if (data) {
                                            bProposal = true;
                                        }
                                        if (dateArr && dateArr.length > 0) {
                                            proc();
                                        }
                                    }
                                );
                            };

                            return proc().then(
                                data => {
                                    if (!bProposal) {
                                        return Q.reject({
                                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                            name: "DataError",
                                            message: "Player does not match the condition for this reward"
                                        });
                                    }
                                }
                            );
                        }
                        else {
                            return processConsecutiveLoginRewardRequest(player, todayTime, event, adminInfo);
                        }
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "Invalid player consecutive login event data for platform"
                        });
                    }
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find player consecutive login event data for platform"
                    });
                }
            }
        );
    },

    /*
     * player apply for consecutive login reward
     * @param {Object} topUpProposalData
     * @param {String} type (e.g. 'online', 'aliPay')
     */
    applyPlayerTopUpPromo: (topUpProposalData, type) => {
        type = type || 'online';
        let player;

        return new Promise(function (resolve) {
            dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_TOP_UP_PROMO}).lean().then(
                rewardTypeData => {
                    let rewardEventQuery = {
                        platform: topUpProposalData.data.platformId,
                        type: rewardTypeData._id
                    };

                    let playerProm = dbConfig.collection_players.findOne({_id: topUpProposalData.data.playerObjId}).lean();
                    let rewardEventProm = dbConfig.collection_rewardEvent.find(rewardEventQuery).lean();

                    return Promise.all([rewardEventProm, playerProm]);
                }
            ).then(
                data => {
                    let promoEvents = data[0];
                    player = data[1];
                    if (!promoEvents || promoEvents.length <= 0) {
                        // there is no promotion event going on
                        return;
                    }

                    let promoEventDetail, promotionDetail;
                    for (let i = 0; i < promoEvents.length; i++) {
                        let promoEvent = promoEvents[i];

                        if (dbPlayerReward.isRewardEventForbidden(player, promoEvent._id)) {
                            // the player is not valid for this promotion
                            continue;
                        }

                        for (let j = 0; j < promoEvent.param.reward.length; j++) {
                            let promotion = promoEvent.param.reward[j];

                            switch (true) {
                                case (type === 'online' && Number(promotion.topUpType) == Number(topUpProposalData.data.topupType)):
                                case (type === 'weChat' && Number(promotion.topUpType) == 98):
                                case (type === 'aliPay' && Number(promotion.topUpType) == 99):
                                    promotionDetail = promotion;
                                    promoEventDetail = promoEvent;
                                    break;
                                default:
                            }

                            if (promotionDetail) {
                                break;
                            }
                        }

                        if (promoEventDetail) {
                            break;
                        }
                    }

                    if (!promotionDetail) {
                        // there is no relevant promotion
                        console.error("applyPlayerTopUpPromo:there is no relevant promotion");
                        return;
                    }

                    promotionDetail.rewardPercentage = promotionDetail.rewardPercentage || 0;

                    let rewardAmount = (Number(topUpProposalData.data.amount) * Number(promotionDetail.rewardPercentage) / 100);
                    if (rewardAmount > 500) {
                        rewardAmount = 500;
                    }

                    let todaySGTime = dbUtility.getTodaySGTime();
                    return dbConfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: promoEventDetail.executeProposal,
                                "data.eventCode": promoEventDetail.code,
                                "data.playerObjId": topUpProposalData.data.playerObjId,
                                createTime: {
                                    $gte: todaySGTime.startTime,
                                    $lt: todaySGTime.endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: {type: "$type"},
                                amount: {$sum: "$data.rewardAmount"}
                            }
                        }
                    ).then(
                        summaryData => {
                            if (summaryData && summaryData[0] && summaryData[0].amount >= 500) {
                                Q.reject({
                                    status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                    name: "DataError",
                                    message: "Cant apply this reward, contact cs"
                                });
                            }
                            else {
                                if (summaryData && summaryData[0] && (rewardAmount + summaryData[0].amount) > 500) {
                                    rewardAmount = Math.max(0, 500 - summaryData[0].amount);
                                }

                                let proposalData = {
                                    type: promoEventDetail.executeProposal,

                                    data: {
                                        playerObjId: topUpProposalData.data.playerObjId,
                                        playerId: topUpProposalData.data.playerId,
                                        playerName: topUpProposalData.data.playerName,
                                        platformId: topUpProposalData.data.platformId,
                                        platform: topUpProposalData.data.platform,
                                        rewardAmount: rewardAmount,
                                        spendingAmount: rewardAmount * 20, //10 times spending amount
                                        applyAmount: 0,
                                        // amount: rewardAmount,
                                        eventId: promoEventDetail._id,
                                        eventName: promoEventDetail.name,
                                        eventCode: promoEventDetail.code,
                                        eventDescription: promoEventDetail.description
                                    },
                                    entryType: constProposalEntryType.SYSTEM,
                                    userType: constProposalUserType.PLAYERS
                                };

                                return dbProposal.createProposalWithTypeId(promoEventDetail.executeProposal, proposalData);
                            }
                        }
                    );

                }
            ).then(
                proposalData => {
                    resolve(proposalData);
                }
            ).catch(
                error => {
                    //add debug log
                    console.error("applyPlayerTopUpPromo:", error);
                    resolve(error);
                }
            );

        });

    },

    applyEasterEggReward: (playerId, code, adminInfo) => {
        let playerObj = {};
        let eventData = {};
        return dbConfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbConfig.collection_platform}
        ).then(
            playerData => {
                if (playerData && playerData.platform) {
                    playerObj = playerData;
                    return dbRewardEvent.getPlatformRewardEventWithTypeName(playerData.platform._id, constRewardType.PLAYER_EASTER_EGG_REWARD, code);
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            eventObj => {
                if (eventObj && eventObj.param && eventObj.param.reward) {
                    eventData = eventObj;

                    //check if player is valid for reward
                    //find player's easter egg reward
                    return dbConfig.collection_proposalType.findOne({
                        name: constProposalType.PLAYER_EASTER_EGG_REWARD,
                        platformId: playerObj.platform._id
                    }).lean().then(
                        typeData => {
                            if (typeData) {
                                return dbConfig.collection_proposal.find({
                                    type: typeData._id,
                                    "data.playerName": playerObj.name,
                                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.PENDING]},
                                }).sort({createTime: -1}).limit(1).lean();
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Cannot find "});
                            }
                        }
                    ).then(
                        proposalsData => {
                            let lastRewardTime = dbUtility.getTodaySGTime().startTime;
                            if (proposalsData && proposalsData[0]) {
                                lastRewardTime = proposalsData[0].createTime;
                            }
                            return dbConfig.collection_playerTopUpRecord.findOne({
                                playerId: playerObj._id,
                                createTime: {$gte: lastRewardTime},
                                amount: {$gte: eventData.param.minTopUpAmount}
                            }).lean();
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Cannot find player easter egg event data for platform"
                    });
                }
            }
        ).then(
            record => {
                if (record && !playerObj.applyingEasterEgg) {
                    //update player easter egg lock
                    return dbConfig.collection_players.findOneAndUpdate(
                        {_id: playerObj._id, platform: playerObj.platform._id},
                        {applyingEasterEgg: true}
                    ).lean();
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player does not match the condition for this reward"
                    });
                }
            }
        ).then(
            playerData => {
                if (playerData && !playerData.applyingEasterEgg) {
                    playerObj = playerData;
                    //calculate player reward amount
                    let totalProbability = 0;
                    eventData.param.reward.forEach(
                        eReward => {
                            totalProbability += eReward.probability;
                        }
                    );
                    let pNumber = Math.floor(Math.random() * totalProbability);
                    //minimum one reward
                    let rewardAmount = 1;
                    let startPro = 0;
                    eventData.param.reward.forEach(
                        eReward => {
                            if (pNumber >= startPro && pNumber <= (startPro + eReward.probability)) {
                                rewardAmount = eReward.rewardAmount;
                            }
                            startPro += eReward.probability;
                        }
                    );

                    // create reward proposal
                    let proposalData = {
                        type: eventData.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: playerObj.name,
                                id: playerId
                            },
                        data: {
                            playerObjId: playerObj._id,
                            playerId: playerObj.playerId,
                            playerName: playerObj.name,
                            realName: playerObj.realName,
                            platformObjId: playerObj.platform._id,
                            rewardAmount: rewardAmount,
                            spendingAmount: rewardAmount * Number(eventData.param.consumptionTimes),
                            applyAmount: 0,
                            amount: rewardAmount,
                            eventId: eventData._id,
                            eventName: eventData.name,
                            eventCode: eventData.code,
                            eventDescription: eventData.description,
                            providers: eventData.param.providers,
                            useConsumption: eventData.param.useConsumption,
                            useLockedCredit: Boolean(playerObj.platform.useLockedCredit)
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS
                    };
                    return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData);
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player does not match the condition for this reward"
                    });
                }
            }
        );
    },

    getEasterEggPlayerInfo: (platformId) => {
        let platformObj = {};
        return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;
                    return dbConfig.collection_proposalType.findOne({
                        name: constProposalType.PLAYER_EASTER_EGG_REWARD,
                        platformId: platformData._id
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            typeData => {
                if (typeData) {
                    return dbConfig.collection_proposal.find({
                        type: typeData._id,
                        status: constProposalStatus.APPROVED
                    }).sort({createTime: -1}).limit(100).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find easter egg reward proposal type"});
                }
            }
        ).then(
            proposalDatas => {
                let res = [];
                if (proposalDatas && proposalDatas.length > 0) {
                    proposalDatas.forEach(
                        pData => {
                            res.push({username: pData.data.playerName, amount: pData.data.rewardAmount});
                        }
                    );
                }
                return res;
            }
        );
    },

    applyConsecutiveConsumptionReward: (playerObjId, consumptionAmount, eventData, adminInfo) => {
        let playerObj = {};
        let rewardParam = null;
        let rewardAmount = 0;
        let yerTime = dbUtility.getYesterdayConsumptionReturnSGTime();

        return dbConfig.collection_players.findOne({
            _id: playerObjId
            // isNewSystem: true
        }).populate(
            {path: "platform", model: dbConfig.collection_platform}
        ).then(
            playerData => {
                if (playerData && playerData.platform && playerData.permission && !playerData.permission.banReward) {
                    playerObj = playerData;

                    let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(playerObj, eventData._id);

                    if (playerIsForbiddenForThisReward) return;

                    eventData.param.reward.forEach(
                        reward => {
                            if (consumptionAmount >= reward.minConsumptionAmount) {
                                rewardParam = reward;
                                rewardAmount = reward.rewardAmount;
                            }
                        }
                    );

                    if (rewardParam && rewardAmount) {
                        // create reward proposal
                        let proposalData = {
                            type: eventData.executeProposal,
                            creator: adminInfo ? adminInfo :
                                {
                                    type: 'player',
                                    name: playerObj.name,
                                    id: playerObj.playerId
                                },
                            data: {
                                playerObjId: playerObj._id,
                                playerId: playerObj.playerId,
                                playerName: playerObj.name,
                                realName: playerObj.realName,
                                platformObjId: playerObj.platform._id,
                                rewardAmount: rewardAmount,
                                spendingAmount: rewardAmount * Number(rewardParam.spendingTimes),
                                applyAmount: 0,
                                consumptionAmount: consumptionAmount,
                                // amount: rewardAmount,
                                settlementStartTime: yerTime.startTime,
                                settlementEndTime: yerTime.endTime,
                                eventId: eventData._id,
                                eventName: eventData.name,
                                eventCode: eventData.code,
                                eventDescription: eventData.description,
                                providers: eventData.param.providers,
                                useConsumption: eventData.param.useConsumption,
                                useLockedCredit: Boolean(playerObj.platform.useLockedCredit)
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS
                        };

                        return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData);
                    }
                }
            }
        );
    },

    applyPacketRainReward: (playerId, code, adminInfo) => {
        let playerObj = {};
        let eventData = {};
        let todayTime = dbUtility.getTodaySGTime();

        return dbConfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbConfig.collection_platform}
        ).then(
            playerData => {
                if (playerData && playerData.platform) {
                    playerObj = playerData;

                    // Check player state
                    return dbConfig.collection_playerState.findOne({player: playerObj._id});
                } else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            stateRec => {
                if (!stateRec) {
                    return new dbConfig.collection_playerState({
                        player: playerObj._id
                    }).save();
                } else {
                    return dbConfig.collection_playerState.findOneAndUpdate({
                        player: playerObj._id,
                        lastApplyPacketRainReward: {$lt: new Date() - 1000}
                    }, {
                        $currentDate: {lastApplyPacketRainReward: true}
                    }, {
                        new: true
                    });
                }
            }
        ).then(
            stateRec => {
                if (stateRec) {
                    //check if player is valid for reward
                    if (playerObj.permission && playerObj.permission.banReward) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            message: "Reward not applicable"
                        });
                    }

                    let promEvent = dbRewardEvent.getPlatformRewardEventWithTypeName(playerObj.platform._id, constRewardType.PLAYER_PACKET_RAIN_REWARD, code);
                    let promTopUp = dbConfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                playerId: playerObj._id,
                                platformId: playerObj.platform._id,
                                createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId"},
                                amount: {$sum: "$amount"}
                            }
                        }
                    ).then(
                        summary => {
                            if (summary && summary[0]) {
                                return summary[0].amount;
                            }
                            else {
                                // No topup record will return 0
                                return 0;
                            }
                        }
                    );
                    let todayPropsProm = dbConfig.collection_proposalType.findOne({
                        name: constProposalType.PLAYER_PACKET_RAIN_REWARD,
                        platformId: playerObj.platform._id
                    }).lean().then(
                        typeData => {
                            if (typeData) {
                                return dbConfig.collection_proposal.find({
                                    type: typeData._id,
                                    "data.playerObjId": playerObj._id,
                                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.PENDING]},
                                    settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                                }).lean();
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Cannot find reward"});
                            }
                        }
                    );

                    return Promise.all([promEvent, promTopUp, todayPropsProm]);
                } else {
                    return Q.reject({name: "ConcurrencyError", message: "Multiple calls detected!"});
                }
            }
        ).then(
            data => {
                eventData = data[0];
                let topUpSum = data[1];
                let todayPacketCount = data[2].length ? data[2].length : 0;

                // Check if reward data is valid
                // Check if player has take more than allowed packet today
                if (eventData && eventData.param && eventData.param.reward
                    && eventData.param.dailyApplyLimit && todayPacketCount < eventData.param.dailyApplyLimit) {

                    let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(playerObj, eventData._id);

                    if (playerIsForbiddenForThisReward)
                        deferred.reject({name: "DataError", message: "Player is forbidden for this reward."});

                    //calculate player reward amount
                    let rewardAmount = 0;
                    let totalProbability = 0;
                    // TODO RESET STATE WHEN CATCHING ERROR
                    let curMinTopUpAmount = -1;
                    let curReward = null;
                    let combination = [];

                    eventData.param.reward.forEach(
                        eReward => {
                            if (topUpSum >= eReward.minTopUpAmount && eReward.minTopUpAmount > curMinTopUpAmount) {
                                curMinTopUpAmount = eReward.minTopUpAmount;
                                curReward = eReward;
                                totalProbability = 0;
                                combination = [];
                                totalProbability += eReward.data.ratio1.probability ? eReward.data.ratio1.probability : 0;
                                combination.push({
                                    totalProbability: totalProbability,
                                    rewardAmount: eReward.data.ratio1.rewardAmount
                                });
                                totalProbability += eReward.data.ratio2.probability ? eReward.data.ratio2.probability : 0;
                                combination.push({
                                    totalProbability: totalProbability,
                                    rewardAmount: eReward.data.ratio2.rewardAmount
                                });
                                totalProbability += eReward.data.ratio3.probability ? eReward.data.ratio3.probability : 0;
                                combination.push({
                                    totalProbability: totalProbability,
                                    rewardAmount: eReward.data.ratio3.rewardAmount
                                });
                            }
                        }
                    );

                    // Player's top up amount is not enough for this reward
                    if (!curReward) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                            name: "DataError",
                            message: "Please topup to enjoy reward"
                        })
                    }

                    let pNumber = Math.floor(Math.random() * totalProbability);

                    combination.some(
                        eReward => {
                            if (pNumber <= eReward.totalProbability) {
                                rewardAmount = eReward.rewardAmount;
                            }
                            return rewardAmount;
                        }
                    );

                    // create reward proposal
                    let proposalData = {
                        type: eventData.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: playerObj.name,
                                id: playerId
                            },
                        data: {
                            playerObjId: playerObj._id,
                            playerId: playerObj.playerId,
                            playerName: playerObj.name,
                            realName: playerObj.realName,
                            platformObjId: playerObj.platform._id,
                            rewardAmount: rewardAmount,
                            eventId: eventData._id,
                            eventName: eventData.name,
                            eventCode: eventData.code,
                            eventDescription: eventData.description
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS
                    };
                    return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData);
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Please try again packet rain reward again tomorrow"
                    });
                }
            }
        );
    },

    getTopUpPromoList: (playerId, clientType) => {
        let topUpTypeData, aliPayLimitData, weChatPayAvailability;

        return new Promise(function (resolve, reject) {
            let topUpTypeDataProm = dbPlayerInfo.getOnlineTopupType(playerId, 1, clientType);
            let aliPayLimitProm = dbPlayerPayment.getAlipaySingleLimit(playerId);
            let weChatAvailableProm = dbPlayerTopUpRecord.getPlayerWechatPayStatus(playerId);
            let playerDataProm = dbConfig.collection_players.findOne({playerId: playerId}).lean();
            let rewardTypeProm = dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_TOP_UP_PROMO});
            Promise.all([topUpTypeDataProm, aliPayLimitProm, weChatAvailableProm, playerDataProm, rewardTypeProm]).then(
                data => {
                    topUpTypeData = data[0];
                    aliPayLimitData = data[1];
                    weChatPayAvailability = data[2];
                    let playerData = data[3];
                    let rewardTypeData = data[4];

                    return dbConfig.collection_rewardEvent.find({
                        type: rewardTypeData._id,
                        platform: playerData.platform
                    }).sort({_id: -1}).limit(1).lean();
                }
            ).then(
                rewardEventData => {
                    let promotions = rewardEventData[0].param.reward;

                    if (aliPayLimitData) {
                        aliPayLimitData.type = 99;
                        aliPayLimitData.status = aliPayLimitData.bValid ? 1 : 2;
                        topUpTypeData.push(aliPayLimitData)
                    }

                    let weChatPayData = {
                        type: 98,
                        status: weChatPayAvailability ? 1 : 2
                    };
                    topUpTypeData.push(weChatPayData);

                    let promotionLength = promotions.length;
                    let topUpTypeDataLength = topUpTypeData.length;

                    for (let i = 0; i < topUpTypeDataLength; i++) {
                        // let topUpType = topUpTypeData[i];
                        for (let j = 0; j < promotionLength; j++) {
                            // let promotion = promotions[j];
                            if (Number(topUpTypeData[i].type) === Number(promotions[j].topUpType)) {
                                topUpTypeData[i].rewardPercentage = promotions[j].rewardPercentage;
                                topUpTypeData[i].rewardDes = promotions[j].rewardDes;
                                topUpTypeData[i].index = promotions[j].index;
                                break;
                            }
                        }
                    }

                    resolve(topUpTypeData);
                }
            ).catch(
                error => {
                    reject(error);
                }
            )
        });
    },
    getPromoCode: (playerId, platformId, status) => {
        let platformData = null;
        var playerData = null;
        var promoListData = null;

        if(!playerId){
            return Q.reject({
                status: constServerCode.INVALID_API_USER,
                name: "DataError",
                message:"用户未登录!"
            })
        }
        return dbConfig.collection_platform.findOne({platformId: platformId}).exec()
            .then(
                platformRecord => {
                    if (platformRecord) {
                        platformData = platformRecord;
                        return dbConfig.collection_players.findOne({
                            playerId: playerId,
                            platform: ObjectId(platformRecord._id)
                        })
                    } else {
                        return Q.reject({name: "DataError", message: "Player Not Found"});
                    }
                })
            .then(
                playerRecord => {
                    // get the  ExtraBonusInfor state of the player: enable or disable the msg showing
                    if (playerRecord && playerRecord._id) {
                        let showInfoState;
                        if (playerRecord.viewInfo) {
                            showInfoState = (playerRecord.viewInfo.showInfoState) ? 1 : 0;
                        } else {
                            showInfoState = 1;
                        }

                        var query = {
                            "playerObjId": playerRecord._id,
                            "platformObjId": platformData._id
                        }
                        if (status) {
                            query.status = status;
                        }
                        playerData = playerRecord;

                        return dbConfig.collection_promoCode.find(query)
                            .populate({path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType})
                            .populate({path: "allowedProviders", model: dbConfig.collection_gameProvider}).lean()
                            .then(
                                promocodes => {
                                    let usedListArr = [];
                                    let noUseListArr = [];
                                    let expiredListArr = [];
                                    let bonusListArr = [];

                                    promocodes.forEach(promocode => {
                                        let providers = [];
                                        let status = promocode.status;
                                        let condition = promoCondition(promocode);
                                        let title = getPromoTitle(promocode);

                                        promocode.allowedProviders.forEach(provider => {
                                            providers.push(provider.name);
                                        })

                                        let promo = {
                                            "title": title,
                                            "validBet": promocode.requiredConsumption,
                                            "games": providers,
                                            "condition": condition,
                                            "expireTime": promocode.expirationTime,
                                            "bonusCode": promocode.code,
                                            "tag": promocode.bannerText,
                                        }
                                        if (promocode.maxTopUpAmount) {
                                            promo.bonusLimit = promocode.maxTopUpAmount;
                                        }
                                        if (status == "1") {
                                            noUseListArr.push(promo);
                                        } else if (status == "2") {
                                            promo.bonusUrl = playerData.name;
                                            usedListArr.push(promo);
                                        } else if (status == "3") {
                                            expiredListArr.push(promo);
                                        } else if (status == "4") {
                                            bonusListArr.push(promo);
                                        }
                                    });
                                    let result = {
                                        "showInfo": showInfoState,
                                        "usedList": usedListArr,
                                        "noUseList": noUseListArr,
                                        "expiredList": expiredListArr,
                                        "bonusList": bonusListArr
                                    }
                                    return result;
                                });
                    } else {
                        return Q.reject({name: "DataError", message: "Platform Not Found"});
                    }
                }
            )
            .then(
                promoList => {
                    promoListData = promoList
                    if (promoList) {
                        return dbConfig.collection_proposalType.findOne({
                            platformId: ObjectId(platformData._id),
                            name: constProposalType.PLAYER_PROMO_CODE_REWARD
                        }).lean()
                            .then(
                                proposalType => {
                                    var queryObj = {
                                        "data.platformId": ObjectId(platformData._id),
                                        "type": Object(proposalType._id),
                                        "status": {$in: ["Success", "Approved"]},
                                        "settleTime": {
                                            '$gte': moment().subtract(4, 'hours'),
                                            '$lte': new Date()
                                        }
                                    };
                                    return dbConfig.collection_proposal.find(queryObj).populate(
                                        {
                                            path: "type",
                                            model: dbConfig.collection_proposalType
                                        }).sort({"createTime": -1}).limit(10).lean()

                                }
                            )
                    } else {
                        return Q.reject({name: "DataError", message: "Platform Not Found"});
                    }
                }
            )
            .then(
                proposalData => {
                    let approvedProposal = [];
                    let allProm = [];

                    proposalData.map(proposal => {
                        let proposalId = proposal.proposalId || 'none';
                        let prom = dbConfig.collection_promoCode.findOne({proposalId: proposalId}).then(
                            data => {
                                let bannerText = '';
                                if (data.bannerText) {
                                    bannerText = data.bannerText;
                                }
                                let bonusNum = proposal.data.rewardAmount;
                                let accountNo = dbPlayerReward.customAccountMask(proposal.data.playerName);
                                let record = {
                                    "accountNo": accountNo,
                                    "bonus": bonusNum,
                                    "time": proposal.settleTime,
                                    "name": bannerText
                                }
                                approvedProposal.push(record);
                                return record;
                            })
                        allProm.push(prom)
                    })
                    return Promise.all(allProm)
                }
            )
            .then(
                data => {
                    let result = promoListData;
                    result.bonusList = data;
                    return result;
                },
                err => {
                    console.log(err);
                }
            )

    },
    customAccountMask: (str)=> {
        str = str || '';
        let strLength = str.length;
        let subtractNo = - (strLength - 6);
        if(strLength <= 6){
            return str.substring(0, 3) + "***"
        }else{
            return str.substring(0, 3) + "***" + str.slice(subtractNo);
        }

    },
    getPromoCodesHistory: (searchQuery) => {
        return expirePromoCode().then(res => {
            return dbConfig.collection_players.findOne({
                platform: searchQuery.platformObjId,
                name: searchQuery.playerName
            }).lean();
        }).then(
            playerData => {
                let query = {
                    platformObjId: searchQuery.platformObjId
                };

                if (playerData) {
                    query.playerObjId = playerData._id;
                } else if (searchQuery.playerName) {
                    return [];
                }

                if (searchQuery.status) {
                    query.status = searchQuery.status
                }

                if (searchQuery.startCreateTime) {
                    query.createTime = {$gte: searchQuery.startCreateTime, $lt: searchQuery.endCreateTime}
                }

                if (searchQuery.startAcceptedTime) {
                    query.acceptedTime = {$gte: searchQuery.startAcceptedTime, $lt: searchQuery.endAcceptedTime}
                }

                return dbConfig.collection_promoCode.find(query)
                    .populate({path: "playerObjId", model: dbConfig.collection_players})
                    .populate({path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType})
                    .populate({
                        path: "allowedProviders",
                        model: searchQuery.isProviderGroup ? dbConfig.collection_gameProviderGroup : dbConfig.collection_gameProvider
                    })
                    .sort(searchQuery.sortCol).lean();
            }
        ).then(
            res => {
                let f1 = searchQuery.promoCodeType ? res.filter(e => e.promoCodeTypeObjId.type == searchQuery.promoCodeType) : res;
                let f2 = searchQuery.promoCodeSubType ? f1.filter(e => e.promoCodeTypeObjId.name == searchQuery.promoCodeSubType) : f1;

                return {
                    size: Object.keys(f2).length,
                    data: f2.splice(searchQuery.index, searchQuery.limit)
                };
            }
        )
    },

    updatePromoCodeSMSContent: (platformObjId, promoCodeSMSContent, isDelete) => {
        let upsertProm = [];

        if (isDelete) {
            upsertProm.push(dbConfig.collection_promoCodeType.remove({
                platformObjId: platformObjId,
                name: promoCodeSMSContent[0].name,
                type: promoCodeSMSContent[0].type
            }));
        } else {
            promoCodeSMSContent.forEach(entry => {
                upsertProm.push(dbConfig.collection_promoCodeType.findOneAndUpdate(
                    {platformObjId: platformObjId, name: entry.name, type: entry.type},
                    entry,
                    {upsert: true}
                ));
            });
        }

        return Promise.all(upsertProm);
    },

    generatePromoCode: (platformObjId, newPromoCodeEntry) => {
        // Check if player exist
        return dbConfig.collection_players.findOne({
            platform: platformObjId,
            name: newPromoCodeEntry.playerName
        }).lean().then(
            playerData => {
                if (playerData) {
                    newPromoCodeEntry.playerObjId = playerData._id;
                    newPromoCodeEntry.code = dbUtility.generateRandomPositiveNumber(1000, 9999);
                    newPromoCodeEntry.status = constPromoCodeStatus.AVAILABLE;

                    return new dbConfig.collection_promoCode(newPromoCodeEntry).save();
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            newPromoCode => {
                return newPromoCode.code;
            }
        )
    },

    savePromoCodeUserGroup: (platformObjId, data, isDelete) => {
        let saveArr = [];

        if (isDelete) {
            return dbConfig.collection_promoCodeUserGroup.remove({_id: data});
        } else {
            if (data && data.length > 0) {
                data.map(grp => {
                    grp.platformObjId = platformObjId;

                    let saveObj = {
                        platformObjId: grp.platformObjId,
                        name: grp.name,
                        color: grp.color,
                        playerNames: grp.playerNames || []
                    };

                    saveArr.push(dbConfig.collection_promoCodeUserGroup.findOneAndUpdate({
                        name: grp.name
                    }, saveObj, {upsert: true}));
                });
            }
        }

        return Promise.all(saveArr);
    },

    saveDelayDurationGroup: (platformObjId, data) => {
        let saveObj = {consumptionTimeConfig: data};

        return dbConfig.collection_platform.findOneAndUpdate({
            _id: platformObjId
        }, saveObj);

    },

    getPromoCodeUserGroup: (platformObjId) => dbConfig.collection_promoCodeUserGroup.find({platformObjId: platformObjId}).lean(),
    getDelayDurationGroup: (platformObjId, duration) => dbConfig.collection_platform.find({_id: platformObjId}).lean(),

    applyPromoCode: (playerId, promoCode, adminInfo) => {
        let promoCodeObj, playerObj, topUpProp;
        let isType2Promo = false;
        let platformObjId = '';

        return expirePromoCode().then(res => {
            return dbConfig.collection_players.findOne({
                playerId: playerId
            })
        }).then(
            playerData => {
                playerObj = playerData;
                platformObjId = playerObj.platform;
                return dbConfig.collection_promoCode.find({
                    platformObjId: playerData.platform,
                    playerObjId: playerObj._id,
                    status: constPromoCodeStatus.AVAILABLE
                }).populate({
                    path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType
                }).lean();
            }
        ).then(
            promoCodeObjs => {
                if (promoCodeObjs && promoCodeObjs.length > 0) {
                    promoCodeObjs.some(e => {
                        if (e.code == promoCode) {
                            return promoCodeObj = e;
                        }
                    });

                    if (!promoCodeObj) {
                        return Q.reject({
                            status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                            name: "ConditionError",
                            message: "Wrong promo code has entered"
                        })
                    }

                    if (!promoCodeObj.minTopUpAmount) {
                        isType2Promo = true;
                        return true;
                    } else {
                        let searchQuery = {
                            'data.platformId': platformObjId,
                            'data.playerObjId': promoCodeObj.playerObjId,
                            settleTime: {$gte: promoCodeObj.createTime, $lt: new Date()},
                            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                            mainType: "TopUp"
                        };

                        if (promoCodeObj.promoCodeTypeObjId.type == 3) {
                            searchQuery["data.amount"] = {$gte: promoCodeObj.minTopUpAmount}
                        }

                        // Search Top Up Proposal After Received Promo Code
                        return dbConfig.collection_proposal.find(searchQuery).sort({createTime: -1}).limit(1).lean();
                    }
                } else {
                    return Q.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "No available promo code at the moment"
                    })
                }
            }
        ).then(
            topUpProposal => {
                if (isType2Promo || (topUpProposal && topUpProposal.length > 0)) {
                    if (isType2Promo) {
                        return true;
                    }

                    topUpProp = topUpProposal[0];

                    if (topUpProp.data.promoCode) {
                        return Q.reject({
                            status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                            name: "ConditionError",
                            message: "Topup has been used for other reward"
                        })
                    }

                    // Process amount and requiredConsumption for type 3 promo code
                    if (promoCodeObj.promoCodeTypeObjId.type == 3) {
                        promoCodeObj.amount = topUpProp.data.amount * promoCodeObj.amount * 0.01;
                        promoCodeObj.requiredConsumption = (topUpProp.data.amount + promoCodeObj.amount) * promoCodeObj.requiredConsumption;
                    }

                    return dbConfig.collection_playerConsumptionRecord.aggregate(
                        {
                            $match: {
                                playerId: {$in: [ObjectId(promoCodeObj.playerObjId), String(promoCodeObj.playerObjId)]},
                                platformId: {$in: [ObjectId(platformObjId), String(platformObjId)]},
                                createTime: {$gte: topUpProp.settleTime, $lt: new Date()}
                            }
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId"},
                                amount: {$sum: "$amount"}
                            }
                        });
                } else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_MINTOPUP,
                        name: "ConditionError",
                        message: "Topup amount '$" + promoCodeObj.minTopUpAmount + "' is needed for this reward"
                    })
                }
            }
        ).then(
            consumptionSumm => {
                if (isType2Promo || consumptionSumm.length == 0) {
                    // Try deduct player credit first if it is type-C promo code
                    if (promoCodeObj.isProviderGroup && promoCodeObj.promoCodeTypeObjId.type == 3 && topUpProp && topUpProp.data && topUpProp.data.amount) {
                        return dbPlayerUtil.tryToDeductCreditFromPlayer(playerObj._id, platformObjId, topUpProp.data.amount, promoCodeObj.promoCodeTypeObjId.name + ":Deduction", topUpProp.data)
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Q.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "There is consumption after topup"
                    })
                }
            }
        ).then(() => {
            return dbConfig.collection_proposalType.findOne({
                platformId: platformObjId,
                name: constProposalType.PLAYER_PROMO_CODE_REWARD
            }).lean();
        }).then(
            proposalTypeData => {
                // create reward proposal
                let proposalData = {
                    type: proposalTypeData._id,
                    creator: adminInfo ? adminInfo :
                        {
                            type: 'player',
                            name: playerObj.name,
                            id: playerObj._id
                        },
                    data: {
                        playerObjId: playerObj._id,
                        playerId: playerObj.playerId,
                        playerName: playerObj.name,
                        realName: playerObj.realName,
                        platformObjId: playerObj.platform._id,
                        rewardAmount: promoCodeObj.amount,
                        spendingAmount: promoCodeObj.requiredConsumption,
                        promoCode: promoCodeObj.code,
                        PROMO_CODE_TYPE: promoCodeObj.promoCodeTypeObjId.name,
                        promoCodeTypeValue: promoCodeObj.promoCodeTypeObjId.type,
                        applyAmount: topUpProp && topUpProp.data.amount ? topUpProp.data.amount : 0,
                        topUpProposal: topUpProp && topUpProp.proposalId ? topUpProp.proposalId : null,
                        useLockedCredit: false,
                        useConsumption: !promoCodeObj.isSharedWithXIMA
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };

                if (promoCodeObj.isProviderGroup) {
                    proposalData.data.providerGroup = promoCodeObj.allowedProviders;
                } else {
                    proposalData.data.providers = promoCodeObj.allowedProviders;
                }

                return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalData);
            }
        ).then(
            newProp => {
                return dbConfig.collection_promoCode.findOneAndUpdate({
                    _id: promoCodeObj._id
                }, {
                    acceptedTime: new Date(),
                    status: constPromoCodeStatus.ACCEPTED,
                    proposalId: newProp.proposalId,
                    acceptedAmount: newProp.data.rewardAmount,
                    topUpAmount: newProp.data.applyAmount
                })
            }
        )
    },

    getPromoCodesMonitor: (platformObjId, startAcceptedTime, endAcceptedTime) => {
        let promoCodeObjs;
        let monitorObjs;

        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: constProposalType.PLAYER_PROMO_CODE_REWARD
        }).lean().then(
            proposalType => {
                return dbConfig.collection_proposal.find({
                    'data.platformId': platformObjId,
                    type: proposalType._id,
                    settleTime: {$gte: startAcceptedTime, $lt: endAcceptedTime},
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                })
            }
        ).then(
            promoCodeData => {
                let delProm = [];

                monitorObjs = promoCodeData.map(p => {
                    return {
                        promoCodeProposalId: p.proposalId,
                        platformObjId: p.data.platformId,
                        playerObjId: p.data.playerObjId,
                        playerName: p.data.playerName,
                        topUpAmount: p.data.applyAmount,
                        rewardAmount: p.data.rewardAmount,
                        promoCodeType: p.data.PROMO_CODE_TYPE,
                        spendingAmount: p.data.spendingAmount,
                        acceptedTime: p.settleTime
                    }
                });

                monitorObjs.forEach((elem, index, arr) => {
                    delProm.push(dbConfig.collection_proposalType.findOne({
                        platformId: elem.platformObjId,
                        name: constProposalType.PLAYER_BONUS
                    }).then(
                        propType => {
                            return dbConfig.collection_proposal.findOne({
                                'data.platformId': elem.platformObjId,
                                'data.playerObjId': elem.playerObjId,
                                type: propType._id,
                                settleTime: {$gt: elem.acceptedTime},
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                            })
                        }
                    ).then(
                        withdrawProp => {
                            if (withdrawProp) {
                                monitorObjs[index].nextWithdrawProposalId = withdrawProp.proposalId;
                                monitorObjs[index].nextWithdrawAmount = withdrawProp.data.amount;
                                monitorObjs[index].nextWithdrawTime = withdrawProp.settleTime;
                            }
                        }
                    ));
                });

                return Promise.all(delProm);
            }
        ).then(
            data => {
                let proms = [];

                monitorObjs = monitorObjs.filter(e => e.nextWithdrawProposalId);

                monitorObjs.forEach((elem, index, arr) => {
                    proms.push(
                        getPlayerConsumptionSummary(elem.platformObjId, elem.playerObjId, elem.acceptedTime, elem.nextWithdrawTime).then(
                            res => {
                                monitorObjs[index].consumptionBeforeWithdraw = res && res[0] ? res[0].bonusAmount : 0;

                                return dbPlayerUtil.getPlayerCreditByObjId(elem.playerObjId);
                            }
                        ).then(
                            creditRes => {
                                monitorObjs[index].playerCredit = creditRes ? creditRes.gameCredit + creditRes.validCredit + creditRes.lockedCredit : 0;

                                return dbConfig.collection_proposal.find({
                                    'data.platformId': elem.platformObjId,
                                    'data.playerObjId': elem.playerObjId,
                                    settleTime: {$gt: elem.nextWithdrawTime},
                                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                                    mainType: "TopUp"
                                }).sort({settleTime: -1}).limit(1).lean();
                            }
                        ).then(
                            topUpRes => {
                                monitorObjs[index].nextTopUpAmount = topUpRes && topUpRes[0] ? topUpRes[0].data.amount : 0;
                            }
                        )
                    )
                });

                return Promise.all(proms);
            }
        ).then(
            res => monitorObjs
        )
    },

    getPromoCodeAnalysis: (platformObjId, data) => {
        let playerProm = dbConfig.collection_players.findOne({
            platform: platformObjId,
            name: data.playerName
        }).lean();

        let promoTypeQ = {
            platformObjId: platformObjId,
            type: data.promoCodeType
        };

        if (data.promoCodeSubType) {
            promoTypeQ.name = data.promoCodeSubType;
        }

        let promoTypeProm = dbConfig.collection_promoCodeType.find(promoTypeQ).lean();

        return Promise.all([playerProm, promoTypeProm]).then(res => {
            let playerData = res[0];
            let promoCodeTypeData = res[1];
            let promoCodeTypeObjIds = promoCodeTypeData.map(e => e._id);

            let matchObj = {
                platformObjId: platformObjId,
                createTime: {$gte: new Date(data.startCreateTime), $lt: new Date(data.endCreateTime)}
            };

            if (playerData && playerData._id) {
                matchObj.playerObjId = playerData._id;
            }

            if (promoCodeTypeObjIds && promoCodeTypeObjIds.length > 0) {
                matchObj.promoCodeTypeObjId = {$in: promoCodeTypeObjIds}
            }

            let promByType = dbConfig.collection_promoCode.aggregate(
                {
                    $match: matchObj
                },
                {
                    $project: {
                        promoCodeTypeObjId: 1,
                        acceptedCount: {$cond: [{$eq: ['$status', 2]}, 1, 0]},
                        acceptedAmount: 1,
                        amount: 1
                    }
                },
                {
                    $group: {
                        _id: "$promoCodeTypeObjId",
                        amount: {$sum: "$amount"},
                        acceptedCount: {$sum: "$acceptedCount"},
                        acceptedAmount: {$sum: "$acceptedAmount"},
                        sendCount: {$sum: 1}
                    }
                }
            );

            let promByPlayer = dbConfig.collection_promoCode.aggregate(
                {
                    $match: matchObj
                },
                {
                    $project: {
                        playerObjId: 1,
                        acceptedCount: {$cond: [{$eq: ['$status', 2]}, 1, 0]},
                        acceptedAmount: 1,
                        amount: 1,
                        topUpAmount: 1
                    }
                },
                {
                    $group: {
                        _id: "$playerObjId",
                        amount: {$sum: "$amount"},
                        acceptedCount: {$sum: "$acceptedCount"},
                        acceptedAmount: {$sum: "$acceptedAmount"},
                        sendCount: {$sum: 1},
                        topUpAmount: {$sum: "$topUpAmount"}
                    }
                }
            );

            return Promise.all([promByType, promByPlayer]);
        })
    },

    getLimitedOffers: (platformId, playerId, status) => {
        let platformObj;
        let intPropTypeObj;
        let timeSet;
        let rewards;
        let playerObj;

        return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;

                    let rewardTypeProm = dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_LIMITED_OFFERS_REWARD}).lean();
                    let intentionTypeProm = dbConfig.collection_proposalType.findOne({
                        platformId: platformObj._id,
                        name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
                    }).lean();
                    let playerProm = dbConfig.collection_players.findOne({
                        playerId: playerId
                    }).lean();

                    return Promise.all([rewardTypeProm, intentionTypeProm, playerProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Platform Not Found"});
                }
            }
        ).then(
            res => {
                let rewardTypeData = res[0];
                intPropTypeObj = res[1];
                playerObj = res[2];

                if (rewardTypeData) {
                    let rewardEventQuery = {
                        platform: platformObj._id,
                        type: rewardTypeData._id
                    };

                    return dbConfig.collection_rewardEvent.findOne(rewardEventQuery).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Reward Type Not Found"});
                }
            }
        ).then(
            eventData => {
                if (eventData) {
                    rewards = eventData.param.reward;
                    timeSet = new Set();
                    let promArr = [];

                    rewards.map(e => {
                        let status = 0;
                        timeSet.add(String(e.hrs + ":" + e.min));

                        e.startTime = moment().set({hour: e.hrs, minute: e.min, second: 0});
                        e.upTime = moment(e.startTime).subtract(e.inStockDisplayTime, 'minute');
                        e.downTime = moment(e.startTime).add(e.outStockDisplayTime, 'minute');

                        if (new Date().getTime() >= dbUtility.getLocalTime(e.startTime).getTime()
                            && new Date().getTime() < dbUtility.getLocalTime(e.downTime).getTime()) {
                            status = 1;
                        }

                        promArr.push(
                            dbConfig.collection_proposal.aggregate({
                                $match: {
                                    'data.platformObjId': platformObj._id,
                                    'data.limitedOfferObjId': e._id,
                                    type: intPropTypeObj._id
                                }
                            }, {
                                $project: {
                                    "data.playerId": 1,
                                    paidCount: {$cond: [{$not: ['$data.topUpProposalId']}, 0, 1]}
                                }
                            }, {
                                $group: {
                                    _id: "$data.playerId",
                                    count: {$sum: 1},
                                    paidCount: {$sum: "$paidCount"}
                                }
                            }).then(
                                summ => {
                                    if (playerId) {
                                        let totalPromoCount = 0;

                                        summ.map(f => {
                                            if (String(f._id) == String(playerId)) {
                                                status = 2;

                                                if (f.paidCount > 0) {
                                                    status = 3;
                                                }
                                            }

                                            totalPromoCount += f.count;
                                        });

                                        if (totalPromoCount >= e.limitTime) {
                                            status = 4;
                                        }

                                        if (status == 2 && new Date().getTime() > dbUtility.getLocalTime(e.downTime).getTime()) {
                                            status = 5;
                                        }
                                    }

                                    e.status = status;

                                    if (status == 2) {
                                        return dbConfig.collection_proposal.findOne({
                                            'data.platformObjId': platformObj._id,
                                            'data.limitedOfferObjId': e._id,
                                            type: intPropTypeObj._id,
                                            'data.playerId': playerId
                                        }).lean();
                                    }
                                }
                            ).then(
                                intProp => {
                                    if (intProp) {
                                        e.expirationTime = new Date(dbUtility.getLocalTime(intProp.data.expirationTime));
                                    }
                                }
                            )
                        );

                        if (e.providers && e.providers.length > 0) {
                            let providerIds = e.providers;

                            promArr.push(
                                dbGameProvider.getGameProviders({_id: {$in: providerIds}}).then(providerObjs => {
                                    e.providers = providerObjs.map(g => g.name);
                                })
                            )
                        }
                    });

                    return Promise.all(promArr);
                }
                else {
                    return Q.reject({name: "DataError", message: "Event Data Not Found"});
                }
            }
        ).then(
            offerSumm => {
                // Filter by status if any
                rewards = rewards.filter(e => (!status || status == e.status)
                    && new Date().getTime() < new Date(dbUtility.getLocalTime(e.downTime)).getTime()
                    && new Date().getTime() >= new Date(dbUtility.getLocalTime(e.upTime)).getTime());


                rewards.map(e => {
                    // Get time left when count down to start time
                    if (e.status == 0) {
                        e.timeLeft = Math.abs(parseInt((new Date().getTime() - new Date(e.startTime).getTime()) / 1000));
                    }

                    // Get time left till expire
                    // set expiry status if no payment is made
                    if (e.status == 2) {
                        if (new Date(e.expirationTime).getTime() >= (new Date().getTime())) {
                            e.timeLeft = Math.abs(parseInt((new Date().getTime() - new Date(e.expirationTime).getTime()) / 1000));
                        }
                        else {
                            e.status = 5;
                        }
                    }

                    // Interpret providers
                    e.providers = e.providers && e.providers.length > 0 ? [...e.providers].join(",") : "所有平台"
                });

                return {
                    time: [...timeSet].join("/"),
                    showInfo: playerObj && playerObj.viewInfo ? playerObj.viewInfo.limitedOfferInfo : 1,
                    secretList: rewards.filter(e => Boolean(e.displayOriPrice) === false),
                    normalList: rewards.filter(e => Boolean(e.displayOriPrice) === true)
                }
            }
        );
    },

    applyLimitedOffers: (playerId, limitedOfferObjId, adminInfo) => {
        let playerObj;
        let limitedOfferObj;
        let platformObj;
        let eventObj;
        let proposalTypeObj;

        return dbConfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform", model: dbConfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    platformObj = playerData.platform;

                    //check if player is valid for reward
                    if (playerObj.permission.PlayerLimitedOfferReward === false) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            message: "Reward not applicable"
                        });
                    }

                    return dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_LIMITED_OFFERS_REWARD}).lean();
                } else {
                    return Q.reject({name: "DataError", message: "Player Not Found"});
                }
            }
        ).then(
            rewardTypeData => {
                let rewardEventQuery = {
                    platform: platformObj._id,
                    type: rewardTypeData._id
                };

                return dbConfig.collection_rewardEvent.find(rewardEventQuery).lean();
            }
        ).then(
            eventData => {
                eventData.map(e => {
                    e.param.reward.map(f => {
                        if (String(f._id) == String(limitedOfferObjId)) {
                            eventObj = e;
                            limitedOfferObj = f;

                            if (dbPlayerReward.isRewardEventForbidden(playerObj, eventObj._id)) {
                                return Q.reject({name: "DataError", message: "Player is forbidden for this reward."});
                            }
                        }
                    })
                });

                return dbConfig.collection_proposalType.findOne({
                    platformId: platformObj._id,
                    name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
                }).lean();
            }
        ).then(
            proposalTypeData => {
                proposalTypeObj = proposalTypeData;
                return dbConfig.collection_proposal.aggregate({
                    $match: {
                        'data.platformObjId': platformObj._id,
                        'data.limitedOfferObjId': limitedOfferObj._id,
                        type: proposalTypeData._id
                    }
                }, {
                    $group: {
                        _id: "$data.playerObjId",
                        count: {$sum: 1}
                    }
                });
            }
        ).then(
            offerCount => {
                if (offerCount && offerCount.length > 0) {
                    let totalCount = offerCount.reduce((a, b) => a.count + b.count);
                    let isPurchased = false;

                    if (totalCount >= limitedOfferObj.qty) {
                        return Q.reject({
                            status: constServerCode.FAILED_LIMITED_OFFER_CONDITION,
                            name: "DataError",
                            message: "Reward not applicable"
                        });
                    }

                    offerCount.forEach((el, idx, arr) => {
                        if (String(el._id) == String(playerObj._id) && el.count >= limitedOfferObj.limitPerson) {
                            isPurchased = true;
                        }
                    });

                    if (isPurchased) {
                        return Q.reject({
                            status: constServerCode.FAILED_LIMITED_OFFER_CONDITION,
                            name: "DataError",
                            message: "Reward not applicable"
                        });
                    }
                }

                // create reward proposal
                let proposalData = {
                    type: proposalTypeObj._id,
                    creator: adminInfo ? adminInfo :
                        {
                            type: 'player',
                            name: playerObj.name,
                            id: playerObj._id
                        },
                    data: {
                        playerObjId: playerObj._id,
                        playerId: playerObj.playerId,
                        playerName: playerObj.name,
                        realName: playerObj.realName,
                        platformObjId: platformObj._id,
                        limitedOfferObjId: limitedOfferObj._id,
                        applyAmount: limitedOfferObj.offerPrice,
                        rewardAmount: limitedOfferObj.oriPrice - limitedOfferObj.offerPrice,
                        spendingAmount: limitedOfferObj.oriPrice * limitedOfferObj.bet,
                        limitedOfferName: limitedOfferObj.name,
                        expirationTime: moment().add(30, 'm').toDate(),
                        eventId: eventObj._id,
                        eventName: eventObj.name,
                        eventCode: eventObj.code,
                        eventDescription: eventObj.description
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };
                return dbProposal.createProposalWithTypeId(proposalTypeObj._id, proposalData);
            }
        )
    },

    getLimitedOfferReport: (platformObjId, startTime, endTime, playerName, promoName) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
        }).lean().then(
            propType => {
                let matchQ = {
                    "data.platformObjId": platformObjId,
                    type: propType._id,
                    createTime: {$gte: startTime, $lt: endTime}
                };

                if (playerName) {
                    matchQ['data.playerName'] = playerName;
                }

                if (promoName) {
                    matchQ['data.limitedOfferName'] = promoName;
                }

                return dbConfig.collection_proposal.find(matchQ).lean();
            }
        ).then(
            intProps => intProps
        )
    },

    isRewardEventForbidden: function (playerData, eventId) {
        eventId = eventId ? eventId.toString() : "";
        // return playerData.forbidRewardEvents.indexOf()
        let forbiddenEvents = playerData.forbidRewardEvents || [];
        for (let i = 0, len = forbiddenEvents.length; i < len; i++) {
            let forbiddenEventId = forbiddenEvents[i].toString();
            if (forbiddenEventId === eventId) return true;
        }
        return false;
    },

    getLimitedOfferBonus: (platformId) => {
        let platformObj;
        let intPropTypeObj;

        return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;

                    return dbConfig.collection_proposalType.findOne({
                        platformId: platformObj._id,
                        name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Platform Not Found"});
                }
            }
        ).then(
            res => {
                intPropTypeObj = res;

                let startTime = moment().subtract(4, "hours");

                return dbConfig.collection_proposal.find({
                    'data.platformObjId': platformObj._id,
                    type: intPropTypeObj._id,
                    createTime: {$gte: startTime},
                    'data.topUpProposalId': {$exists: true}
                }).lean();
            }
        ).then(
            res => {
                return res.map(e => {
                    return {
                        accountNo: e.data.playerName,
                        bonus: e.data.applyAmount + e.data.rewardAmount,
                        time: e.createTime
                    }
                })
            }
        )


    },
    updatePromoCodesActive: (platformObjId, data) => {
        return dbConfig.collection_promoCode.update({
            platformObjId: platformObjId,
            createTime: {$gte: new Date(data.startCreateTime), $lt: new Date(data.endCreateTime)}
        }, {
            $set: {
                isActive: data.flag
            }
        }, {
            multi: true
        }).exec();
    },

    /**
     *
     * @param playerData
     * @param eventData
     * @param adminInfo
     * @param rewardData
     * @returns {Promise.<TResult>}
     */
    applyGroupReward: (playerData, eventData, adminInfo, rewardData) => {
        let todayTime = rewardData.applyTargetDate ? dbUtility.getTargetSGTime(rewardData.applyTargetDate) : dbUtility.getTodaySGTime();
        // let todayTime = rewardData.applyTargetDate ? dbUtility.getTargetSGTime(rewardData.applyTargetDate): dbUtility.getYesterdaySGTime();
        let rewardAmount = 0, spendingAmount = 0, applyAmount = 0;
        let promArr = [];
        let selectedRewardParam;
        let intervalTime;
        let isUpdateTopupRecord = false;
        let isUpdateMultiTopupRecord = false;
        let isUpdateMultiConsumptionRecord = false;
        let isSetUsedTopUpRecord = false;
        let consecutiveNumber;
        let isMultiApplication = false;
        let applicationDetails = [];
        // For Type 6 use
        let useTopUpAmount;
        let useConsumptionAmount;
        let allRewardProm;
        let isUpdateValidCredit = false;
        let selectedTopUp;
        let updateTopupRecordIds = [];
        let updateConsumptionRecordIds = [];

        let ignoreTopUpBdirtyEvent = eventData.condition.ignoreAllTopUpDirtyCheckForReward;

        // Get interval time
        if (eventData.condition.interval) {
            switch (eventData.condition.interval) {
                case "1":
                    intervalTime = todayTime;
                    break;
                case "2":
                    intervalTime = dbUtility.getCurrentWeekSGTime();
                    break;
                case "3":
                    intervalTime = dbUtility.getCurrentBiWeekSGTIme();
                    break;
                case "4":
                    intervalTime = dbUtility.getCurrentMonthSGTIme();
                    break;
                default:
                    if (eventData.validStartTime && eventData.validEndTime) {
                        intervalTime = {startTime: eventData.validStartTime, endTime: eventData.validEndTime};
                    }
                    break;
            }
        }

        let topupMatchQuery = {
            playerId: playerData._id,
            platformId: playerData.platform._id,
            createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
        };

        let eventQuery = {
            "data.platformObjId": playerData.platform._id,
            "data.playerObjId": playerData._id,
            "data.eventId": eventData._id,
            status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
        };

        let todayTopupProm = dbConfig.collection_playerTopUpRecord.aggregate(
            {
                $match: topupMatchQuery
            },
            {
                $group: {
                    _id: {playerId: "$playerId"},
                    amount: {$sum: "$amount"}
                }
            }
        ).then(
            summary => {
                if (summary && summary[0]) {
                    return summary[0].amount;
                }
                else {
                    // No topup record will return 0
                    return 0;
                }
            }
        );

        let todayPropsProm = dbConfig.collection_proposal.find(eventQuery).lean();

        // Check registration interface condition
        if (checkInterfaceRewardPermission(eventData, rewardData)) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This interface is not allowed for reward"
            });
        }

        // Check whether top up record is dirty
        if (checkTopupRecordIsDirtyForReward(eventData, rewardData)) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This top up record has been used"
            });
        }

        if (intervalTime) {
            topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            eventQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
        }

        let topupInPeriodProm = dbConfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
        let eventInPeriodProm = dbConfig.collection_proposal.find(eventQuery).lean();

        // reward specific promise
        if (eventData.type.name === constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP) {
            let playerRewardDetailProm = dbPlayerReward.getPlayerConsecutiveRewardDetail(playerData.playerId, eventData.code, true);
            promArr.push(playerRewardDetailProm);
        }

        if (eventData.type.name === constRewardType.PLAYER_RANDOM_REWARD_GROUP) {
            let consumptionMatchQuery = {
                createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime},
            };

            if (intervalTime) {
                consumptionMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                eventQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            if (eventData.condition.consumptionProvider && eventData.condition.consumptionProvider.length > 0) {
                let consumptionProviders = [];
                eventData.condition.consumptionProvider.forEach(providerId => {
                    consumptionProviders.push(ObjectId(providerId));
                });

                consumptionMatchQuery.providerId = {$in: eventData.condition.consumptionProvider}
            }

            let periodConsumptionProm = dbConfig.collection_playerConsumptionRecord.aggregate([
                {$match: consumptionMatchQuery},
            ]);

            promArr.push(periodConsumptionProm);

            topupMatchQuery.$or = [{'bDirty': false}];
            if (eventData.condition.ignoreTopUpDirtyCheckForReward && eventData.condition.ignoreTopUpDirtyCheckForReward.length > 0) {
                let ignoreUsedTopupReward = [];
                ignoreUsedTopupReward = eventData.condition.ignoreTopUpDirtyCheckForReward.map(function (rewardId) {
                    return ObjectId(rewardId)
                });
                topupMatchQuery.$or.push({'usedEvent': {$in: ignoreUsedTopupReward}});
            }

            let periodTopupProm = dbConfig.collection_playerTopUpRecord.aggregate(
                {
                    $match: topupMatchQuery
                }
            );
            promArr.push(periodTopupProm);
            let periodPropsProm = dbConfig.collection_proposal.find(eventQuery).lean();
            promArr.push(periodPropsProm);
        }


        if (eventData.type.name == constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP) {
            let promiseUsed = [];
            let calculateLosses;
            switch (eventData.condition.defineLoseValue) {
                case "1":
                    let bonusQuery = {
                        "data.platformId": playerData.platform._id,
                        "data.playerObjId": playerData._id,
                        mainType: constProposalMainType.PlayerBonus,
                        // "data.eventId": eventData._id,
                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.AUTOAUDIT, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };


                    let totalBonusProm = dbConfig.collection_proposal.aggregate(
                        {
                            $match: bonusQuery
                        },
                        {
                            $group: {
                                _id: {playerId: "$data.playerObjId"},
                                amount: {$sum: "$data.amount"}
                            }
                        }
                    ).then(
                        summary => {
                            if (summary && summary[0]) {
                                return summary[0].amount;
                            }
                            else {
                                // No bonus record will return 0
                                return 0;
                            }
                        }
                    );

                    let totalTopupMatchQuery = {
                        playerId: playerData._id,
                        platformId: playerData.platform._id,
                        createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    let totalTopupProm = dbConfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: totalTopupMatchQuery
                        },
                        {
                            $group: {
                                _id: {playerId: "$playerId"},
                                amount: {$sum: "$amount"}
                            }
                        }
                    ).then(
                        summary => {
                            if (summary && summary[0]) {
                                return summary[0].amount;
                            }
                            else {
                                // No topup record will return 0
                                return 0;
                            }
                        }
                    );

                    let creditsDailyLogQuery = {
                        playerObjId: playerData._id,
                        createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };


                    let totalCreditsDailyProm = dbConfig.collection_playerCreditsDailyLog.aggregate([
                        {"$match": creditsDailyLogQuery},
                        {
                            "$group": {
                                _id: {playerId: "$playerObjId"},
                                amount: {$sum: {$sum: ["$validCredit", "$lockedCredit", "$gameCredit"]}}
                            }
                        }
                    ]).then(
                        summary => {
                            if (summary && summary[0]) {
                                return summary[0].amount;
                            }
                            else {
                                // No CreditsDaily record will return 0
                                return 0;
                            }
                        }
                    );

                    if (intervalTime) {
                        bonusQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                        totalTopupProm.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                        creditsDailyLogQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                    }
                    // let promiseUsed = [];
                    promiseUsed.push(totalBonusProm);
                    promiseUsed.push(totalTopupProm);
                    promiseUsed.push(totalCreditsDailyProm);

                    calculateLosses = Promise.all(promiseUsed).then(data => {
                        let bonusAmt = data[0];
                        let topUpAmt = data[1];
                        let creditDailyAmt = data[2];

                        return topUpAmt - bonusAmt - creditDailyAmt;

                    });

                    promArr.push(calculateLosses);
                    break;
                case "2":
                    let allRewardQuery = {
                        "data.platformId": playerData.platform._id,
                        "data.playerObjId": playerData._id,
                        mainType: "Reward",
                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    allRewardProm = dbConfig.collection_proposal.aggregate(
                        {
                            $match: allRewardQuery
                        },
                        {
                            $group: {
                                _id: {playerId: "$data.playerObjId"},
                                amount: {$sum: "$data.rewardAmount"}
                            }
                        }
                    ).then(
                        summary => {
                            if (summary && summary[0]) {
                                return summary[0].amount;
                            }
                            else {
                                // No bonus record will return 0
                                return 0;
                            }
                        }
                    );
                case "3":
                    let consumptionQuery = {
                        playerId: playerData._id,
                        createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    if (eventData.condition.consumptionProvider && eventData.condition.consumptionProvider.length > 0) {
                        let consumptionProviders = [];
                        eventData.condition.consumptionProvider.forEach(providerId => {
                            consumptionProviders.push(ObjectId(providerId));
                        });

                        consumptionQuery.providerId = {$in: consumptionProviders}
                    }

                    let totalConsumptionAmount = dbConfig.collection_playerConsumptionRecord.aggregate([
                        {$match: consumptionQuery},
                        {
                            $group: {
                                _id: null,
                                amount: {$sum: "$bonusAmount"}
                            }
                        }
                    ]).then(
                        summary => {
                            if (summary && summary[0]) {
                                return summary[0].amount * -1;
                            }
                            else {
                                // No bonus record will return 0
                                return 0;
                            }
                        }
                    );

                    promiseUsed.push(totalConsumptionAmount);

                    if (allRewardProm) promiseUsed.push(allRewardProm);

                    calculateLosses = Promise.all(promiseUsed).then(data => {
                        let consumptionAmount = data[0];
                        if (data[1]) {
                            let allRewardAmount = data[1];
                            return consumptionAmount - allRewardAmount;
                        } else {
                            return consumptionAmount;
                        }
                    });

                    promArr.push(calculateLosses);


                    if (intervalTime) {
                        consumptionQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                        if (allRewardProm) allRewardQuery.settleTime = {
                            $gte: intervalTime.startTime,
                            $lte: intervalTime.endTime
                        };
                    }
                    // promArr.push(totalConsumptionAmount);
                    // if (allRewardProm) promArr.push(allRewardProm);
                    break;
                default:
                // reject error
            }
        }


        if (eventData.type.name === constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP) {
            let consumptionQuery = {
                platformId: playerData.platform._id,
                playerId: playerData._id,
                createTime: {$gte: eventData.condition.validStartTime, $lte: eventData.condition.validEndTime}
            };
            if (intervalTime) {
                consumptionQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            }
            if (eventData.condition.consumptionProviderSource) {
                consumptionQuery.providerId = {$in: eventData.condition.consumptionProviderSource};
            }

            let consumptions = dbConfig.collection_playerConsumptionRecord.find(consumptionQuery).lean();
            promArr.push(consumptions);
        }

        if (eventData.type.name === constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP) {
            // check IP address
            if (eventData.condition.checkIPFreeTrialReward) {
                // find matching IP address
                let matchIPAddress = dbConfig.collection_players.aggregate(
                    {
                        $match: {
                            "lastLoginIp": playerData.lastLoginIp
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            lastLoginIp: 1,
                            _id: 0
                        }
                    }
                ).then(
                    lastLoginIP => {
                        // including this player, check if got another same IP address
                        if (lastLoginIP.length >= 2) {
                            return 0;
                        }
                        else {
                            return lastLoginIP[0];
                        }
                    }
                );
                promArr.push(matchIPAddress);
            }

            // check phone number
            if (eventData.condition.checkPhoneFreeTrialReward) {
                // find matching phone number
                let matchPhoneNum = dbConfig.collection_players.aggregate(
                    {
                        $match: {
                            "phoneNumber": rsaCrypto.encrypt(playerData.phoneNumber)
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            phoneNumber: 1,
                            _id: 0
                        }
                    }
                ).then(
                    phone => {
                        // including this player, check if got another same phone number
                        if (phone.length >= 2) {
                            return 0;
                        }
                        else {
                            return phone[0];
                        }
                    }
                );
                promArr.push(matchPhoneNum);
            }
        }

        return Promise.all([todayTopupProm, todayPropsProm, topupInPeriodProm, eventInPeriodProm, Promise.all(promArr)]).then(
            data => {
                let topUpSum = data[0];
                let todayPacketCount = data[1].length ? data[1].length : 0;
                let topupInPeriodData = data[2];
                let eventInPeriodData = data[3];
                let rewardSpecificData = data[4];

                let topupInPeriodCount = topupInPeriodData.length;
                let eventInPeriodCount = eventInPeriodData.length;
                let rewardAmountInPeriod = eventInPeriodData.reduce((a, b) => a + b.data.rewardAmount, 0);

                // Check reward apply limit in period
                if (eventData.param.countInRewardInterval && eventData.param.countInRewardInterval <= eventInPeriodCount) {
                    return Q.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Player has applied for max reward times in event period"
                    });
                }

                // Set reward param for player level to use
                if (eventData.condition.isPlayerLevelDiff) {
                    selectedRewardParam = eventData.param.rewardParam.filter(e => e.levelId == String(playerData.playerLevel))[0].value;
                } else {
                    selectedRewardParam = eventData.param.rewardParam[0].value;
                }

                // Check top up count within period
                if (eventData.condition.topUpCountType) {
                    let intervalType = eventData.condition.topUpCountType[0];
                    let value1 = eventData.condition.topUpCountType[1];
                    let value2 = eventData.condition.topUpCountType[2];

                    const hasMetTopupCondition =
                        intervalType == "1" && topupInPeriodCount >= value1
                        || intervalType == "2" && topupInPeriodCount <= value1
                        || intervalType == "3" && topupInPeriodCount == value1
                        || intervalType == "4" && topupInPeriodCount >= value1 && topupInPeriodCount < value2;

                    if (!hasMetTopupCondition) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Top up count has not met period condition"
                        });
                    }
                }

                // Count reward amount and spending amount
                switch (eventData.type.name) {
                    case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                        if (rewardData && rewardData.selectedTopup) {
                            selectedTopUp = rewardData.selectedTopup;
                            applyAmount = rewardData.selectedTopup.amount;

                            // Set reward param step to use
                            if (eventData.param.isMultiStepReward) {
                                if (eventData.param.isSteppingReward) {
                                    let eventStep = eventInPeriodCount >= selectedRewardParam.length ? selectedRewardParam.length - 1 : eventInPeriodCount;
                                    selectedRewardParam = selectedRewardParam[eventStep];
                                } else {
                                    selectedRewardParam = selectedRewardParam.filter(e => applyAmount >= e.minTopUpAmount).sort((a, b) => b.minTopUpAmount - a.minTopUpAmount);
                                    selectedRewardParam = selectedRewardParam[0];
                                }
                            } else {
                                selectedRewardParam = selectedRewardParam[0];
                            }

                            if (applyAmount < selectedRewardParam.minTopUpAmount) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Top up amount is not enough"
                                });
                            }

                            if (eventData.condition.isDynamicRewardAmount) {
                                rewardAmount = applyAmount * selectedRewardParam.rewardPercentage;

                                // Check reward amount exceed daily limit
                                if (eventData.param.dailyMaxRewardAmount) {
                                    if (rewardAmountInPeriod >= eventData.param.dailyMaxRewardAmount) {
                                        return Q.reject({
                                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                            name: "DataError",
                                            message: "Player has applied for max reward times"
                                        });
                                    } else if (rewardAmount + rewardAmountInPeriod > eventData.param.dailyMaxRewardAmount) {
                                        rewardAmount = eventData.param.dailyMaxRewardAmount - rewardAmountInPeriod;
                                    }
                                }

                                spendingAmount = (applyAmount + rewardAmount) * selectedRewardParam.spendingTimes;
                            } else {
                                rewardAmount = selectedRewardParam.rewardAmount;
                                spendingAmount = selectedRewardParam.rewardAmount * selectedRewardParam.spendingTimesOnReward;
                            }

                            // Set top up record update flag
                            isUpdateTopupRecord = true;

                            // Set player valid credit update flag
                            if (eventData.condition.providerGroup) {
                                isUpdateValidCredit = true;
                            }
                        }
                        break;

                    // type 2
                    case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                        isMultiApplication = true;
                        applyAmount = 0;

                        if (!rewardSpecificData || !rewardSpecificData[0]) {
                            if (todayProposal.length > 0) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Cant apply this reward, contact cs"
                                });
                            }
                        }

                        let playerRewardDetail = rewardSpecificData[0];

                        let rewardInfoList = playerRewardDetail.list;

                        for (let i = 0; i < rewardInfoList.length; i++) {
                            let listItem = rewardInfoList[i];

                            if (listItem.status == 1) {
                                let rewardAmount = listItem.bonus;
                                let spendingAmount = listItem.requestedTimes * rewardAmount;
                                let consecutiveNumber = listItem.step;
                                let targetDate = listItem.targetDate;
                                let forbidWithdrawAfterApply = listItem.forbidWithdrawAfterApply;
                                let remark = listItem.remark;
                                let isSharedWithXIMA = listItem.isSharedWithXIMA;
                                let requiredConsumptionMet = listItem.requiredConsumptionMet;
                                let requiredTopUpMet = listItem.requiredTopUpMet;

                                applicationDetails.push({
                                    rewardAmount,
                                    spendingAmount,
                                    consecutiveNumber,
                                    targetDate,
                                    forbidWithdrawAfterApply,
                                    remark,
                                    isSharedWithXIMA,
                                    requiredConsumptionMet,
                                    requiredTopUpMet
                                });
                            }
                        }
                        if (applicationDetails && applicationDetails.length < 1) {
                            return Q.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Not Valid for the reward."
                            });
                        }

                        break;

                    // type 3
                    case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                        let loseAmount = rewardSpecificData[0];

                        let topUpinPeriod = 0;

                        for (let i = 0; i < topupInPeriodData.length; i++) {
                            let record = topupInPeriodData[i];
                            for (let j = 0; j < record.usedEvent.length; j++) {
                                record.usedEvent[j] = record.usedEvent[j].toString();
                            }
                            if (ignoreTopUpBdirtyEvent && ignoreTopUpBdirtyEvent.length > 0) {
                                let isSubset = record.usedEvent.every(event => {
                                    return ignoreTopUpBdirtyEvent.indexOf(event) > -1;
                                });
                                if (!isSubset)
                                    continue;
                            } else {
                                if (record.bDirty)
                                    continue;
                            }

                            topUpinPeriod += record.amount;
                        }

                        selectedRewardParam = selectedRewardParam.sort(function (a, b) {
                            var aDeposit = a.minDeposit;
                            var bDeposit = b.minDeposit;
                            var aTopUp = a.minLoseAmount;
                            var bTopUp = b.minLoseAmount;

                            if (aDeposit == bDeposit) {
                                return (aTopUp < bTopUp) ? -1 : (aTopUp > bTopUp) ? 1 : 0;
                            }
                            else {
                                return (aDeposit < bDeposit) ? -1 : 1;
                            }
                        });

                        for (let j = selectedRewardParam.length - 1; j >= 0; j--) {
                            if (topUpinPeriod >= selectedRewardParam[j].minDeposit && loseAmount >= selectedRewardParam[j].minLoseAmount) {
                                selectedRewardParam = selectedRewardParam [j];
                                break;
                            }
                            if (j == 0) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Player's lose amount does not meet condition"
                                });
                            }
                        }

                        if (selectedRewardParam && selectedRewardParam.minDeposit) {
                            isSetUsedTopUpRecord = true;
                        }

                        // applyAmount = selectedRewardParam.minDeposit;
                        useTopUpAmount = selectedRewardParam.minDeposit;

                        if (eventData.condition.isDynamicRewardAmount) {
                            let rewardAmountTemp = loseAmount * (selectedRewardParam.rewardPercent / 100);
                            if (rewardAmountTemp > selectedRewardParam.maxReward) {
                                rewardAmount = selectedRewardParam.maxReward;
                            } else {
                                rewardAmount = rewardAmountTemp;
                            }

                        } else {
                            rewardAmount = selectedRewardParam.rewardAmount;
                        }
                        spendingAmount = rewardAmount * selectedRewardParam.spendingTimes;
                        break;




                    // type 4
                    case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                        // （领优惠前）检查投注额来源游戏厅
                        let consumptions = rewardSpecificData[0];
                        let totalConsumption = 0;
                        for (let x in consumptions) {
                            totalConsumption += consumptions[x].validAmount;
                        }

                        // Set reward param step to use
                        if (eventData.param.isMultiStepReward) {
                            selectedRewardParam = selectedRewardParam.filter(e => e.minConsumptionAmount <= totalConsumption).sort((a, b) => b.minConsumptionAmount - a.minConsumptionAmount);
                            selectedRewardParam = selectedRewardParam[0];
                        } else {
                            selectedRewardParam = selectedRewardParam[0];
                        }

                        if (!selectedRewardParam || totalConsumption < selectedRewardParam.minConsumptionAmount) {
                            return Q.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Consumption amount is not enough"
                            });
                        }

                        rewardAmount = selectedRewardParam.rewardAmount;
                        spendingAmount = selectedRewardParam.rewardAmount * selectedRewardParam.spendingTimes;
                        break;

                    // type 5
                    case constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP:
                        selectedRewardParam = selectedRewardParam[0];

                        if (selectedRewardParam.rewardAmount && selectedRewardParam.spendingTimes) {
                            let matchIPAddress = rewardSpecificData[0];
                            let matchPhoneNum = rewardSpecificData[1];

                            if (!matchIPAddress) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Another player found using the same IP Address"
                                });
                            }

                            if (!matchPhoneNum) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Another player found using the same phone number"
                                });
                            }
                        }
                        else {
                            return Q.reject({
                                status: constServerCode.INVALID_PARAM,
                                name: "DataError",
                                message: "Reward Amount and Spending Times cannot be empty. Please check reward condition."
                            });
                        }

                        rewardAmount = selectedRewardParam.rewardAmount;
                        spendingAmount = selectedRewardParam.rewardAmount * selectedRewardParam.spendingTimes;
                        break;

                    // type 6
                    case constRewardType.PLAYER_RANDOM_REWARD_GROUP:
                        selectedRewardParam = selectedRewardParam[0];
                        let consumptionRecords = rewardSpecificData[0];
                        let topUpRecords = rewardSpecificData[1];
                        let periodProps = rewardSpecificData[2];
                        let applyRewardTimes = periodProps.length;
                        let topUpAmount = topUpRecords.reduce((sum, value) => sum + value.amount, 0);
                        let consumptionAmount = consumptionRecords.reduce((sum, value) => sum + value.amount, 0);
                        useTopUpAmount = 0;
                        useConsumptionAmount = 0;
                        //periodProps.reduce((sum, value) => sum + value, 1);

                        if (selectedRewardParam.numberParticipation && applyRewardTimes < selectedRewardParam.numberParticipation) {
                            let meetTopUpCondition = false, meetConsumptionCondition = false;
                            if (topUpAmount >= selectedRewardParam.requiredTopUpAmount) {
                                let useTopupRecordAmount = 0;
                                //For set topup bDirty Use
                                topUpRecords.forEach((topUpRecord) => {
                                    if (useTopupRecordAmount < selectedRewardParam.requiredTopUpAmount) {
                                        useTopupRecordAmount += topUpRecord.amount;
                                        updateTopupRecordIds.push(topUpRecord._id);
                                    }
                                });
                                useTopUpAmount = selectedRewardParam.requiredTopUpAmount;
                                meetTopUpCondition = true;
                                isUpdateMultiTopupRecord = true;
                            }

                            if (selectedRewardParam.requiredConsumptionAmount) {
                                if (eventData.condition.useConsumptionRecord) {
                                    let useConsumptionRecordAmount = 0;
                                    //For set consumption bDirty Use
                                    consumptionRecords.forEach((consumptionRecord) => {
                                        if (useConsumptionRecordAmount < selectedRewardParam.requiredConsumptionAmount) {
                                            useConsumptionRecordAmount += consumptionRecord.amount;
                                            updateConsumptionRecordIds.push(consumptionRecord._id);
                                        }
                                    });
                                    isUpdateMultiConsumptionRecord = true;
                                }
                                useConsumptionAmount = selectedRewardParam.requiredConsumptionAmount;
                                meetConsumptionCondition = consumptionAmount >= selectedRewardParam.requiredConsumptionAmount;
                            } else {
                                meetConsumptionCondition = true;
                            }

                            if (selectedRewardParam.operatorOption) { // true = and, false = or
                                if (!(meetTopUpCondition && meetConsumptionCondition)) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Player does not have enough top up or consumption amount"
                                    });
                                }
                            } else {
                                if (!(meetTopUpCondition || meetConsumptionCondition)) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Player does not have enough top up or consumption amount"
                                    });
                                }
                                //Only use one of the condition, reset another
                                if (meetTopUpCondition && meetConsumptionCondition) {
                                    // if both condition true, then use TopUpAmount first
                                    useConsumptionAmount = 0;
                                    isUpdateMultiConsumptionRecord = false;
                                } else {
                                    if (meetTopUpCondition) {
                                        useConsumptionAmount = 0;
                                        isUpdateMultiConsumptionRecord = false;
                                    }
                                    if (meetConsumptionCondition) {
                                        useTopUpAmount = 0;
                                        isUpdateMultiTopupRecord = false;
                                    }
                                }
                            }

                            //calculate player reward amount
                            let totalProbability = 0;
                            let combination = [];

                            selectedRewardParam.rewardPercentageAmount.forEach(
                                percentageAmount => {
                                    totalProbability += percentageAmount.percentage ? percentageAmount.percentage : 0;
                                    combination.push({
                                        totalProbability: totalProbability,
                                        rewardAmount: percentageAmount.amount
                                    });
                                }
                            );

                            let pNumber = Math.random() * totalProbability;
                            combination.some(
                                eReward => {
                                    if (pNumber <= eReward.totalProbability) {
                                        rewardAmount = eReward.rewardAmount;
                                    }
                                    return rewardAmount;
                                }
                            );
                            spendingAmount = rewardAmount * selectedRewardParam.spendingTimesOnReward;
                        }
                        else {
                            return Q.reject({
                                status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                name: "DataError",
                                message: "Please try again random reward tomorrow"
                            });
                        }

                        break;

                    default:
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            message: "Can not find grouped reward event type"
                        });
                }

                if (isMultiApplication) {
                    let proms = [];
                    for (let i = 0; i < applicationDetails.length; i++) {
                        let applyDetail = applicationDetails[i];
                        let proposalData = {
                            type: eventData.executeProposal,
                            creator: adminInfo ? adminInfo :
                                {
                                    type: 'player',
                                    name: playerData.name,
                                    id: playerData._id
                                },
                            data: {
                                playerObjId: playerData._id,
                                playerId: playerData.playerId,
                                playerName: playerData.name,
                                realName: playerData.realName,
                                platformObjId: playerData.platform._id,
                                rewardAmount: applyDetail.rewardAmount,
                                spendingAmount: applyDetail.spendingAmount,
                                eventId: eventData._id,
                                eventName: eventData.name,
                                eventCode: eventData.code,
                                eventDescription: eventData.description,
                                isIgnoreAudit: Boolean(eventData.condition && eventData.condition.isIgnoreAudit === true),
                                forbidWithdrawAfterApply: Boolean(applyDetail.forbidWithdrawAfterApply && applyDetail.forbidWithdrawAfterApply === true),
                                remark: applyDetail.remark,
                                useConsumption: Boolean(!applyDetail.isSharedWithXIMA),
                                providerGroup: eventData.condition.providerGroup
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS
                        };

                        if (applyDetail.consecutiveNumber) {
                            proposalData.data.consecutiveNumber = applyDetail.consecutiveNumber;
                        }

                        if (applyDetail.targetDate) {
                            proposalData.data.applyTargetDate = applyDetail.targetDate.startTime;
                        }

                        let addUsedEventToConsumptionProm = Promise.resolve([]);
                        if (applyDetail.requiredConsumptionMet) {
                            addUsedEventToConsumptionProm = dbPlayerConsumptionRecord.assignConsumptionUsedEvent(
                                playerData.platform._id, playerData._id, eventData._id, eventData.param.requiredConsumptionAmount,
                                applyDetail.targetDate.startTime, applyDetail.targetDate.endTime, eventData.condition.consumptionProvider
                            )
                        }

                        let addUsedEventToTopUpProm = Promise.resolve([]);
                        if (applyDetail.requiredTopUpMet) {
                            addUsedEventToTopUpProm = dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(
                                playerData.platform._id, playerData._id, eventData._id, eventData.param.requiredTopUpMet,
                                applyDetail.targetDate.startTime, applyDetail.targetDate.endTime, eventData.condition.ignoreAllTopUpDirtyCheckForReward
                            )
                        }

                        let prom = Promise.all([addUsedEventToConsumptionProm, addUsedEventToTopUpProm]).then(
                            data => {
                                if (data[0] && data[0].length > 0) {
                                    proposalData.data.usedConsumption = data[0];
                                }

                                if (data[1] && data[1].length > 0) {
                                    proposalData.data.usedTopUp = data[1];
                                }

                                return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData);
                            }
                        );
                        proms.push(prom);
                    }

                    return Promise.all(proms);
                }
                else {
                    // create reward proposal
                    let proposalData = {
                        type: eventData.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: playerData.name,
                                id: playerData._id
                            },
                        data: {
                            playerObjId: playerData._id,
                            playerId: playerData.playerId,
                            playerName: playerData.name,
                            realName: playerData.realName,
                            platformObjId: playerData.platform._id,
                            rewardAmount: rewardAmount,
                            spendingAmount: spendingAmount,
                            eventId: eventData._id,
                            eventName: eventData.name,
                            eventCode: eventData.code,
                            eventDescription: eventData.description,
                            isIgnoreAudit: Boolean(eventData.condition && eventData.condition.isIgnoreAudit === true),
                            forbidWithdrawAfterApply: Boolean(selectedRewardParam.forbidWithdrawAfterApply && selectedRewardParam.forbidWithdrawAfterApply === true),
                            remark: selectedRewardParam.remark,
                            useConsumption: Boolean(!eventData.condition.isSharedWithXIMA),
                            providerGroup: eventData.condition.providerGroup,
                            // Use this flag for auto apply reward
                            isGroupReward: true
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS
                    };

                    // Custom proposal data field
                    if (applyAmount > 0) {
                        proposalData.data.applyAmount = applyAmount;
                    }

                    if (consecutiveNumber) {
                        proposalData.data.consecutiveNumber = consecutiveNumber;
                    }

                    if (rewardData.applyTargetDate) {
                        proposalData.data.applyTargetDate = todayTime.startTime;
                    }

                    if (useTopUpAmount !== null) {
                        proposalData.data.useTopUpAmount = useTopUpAmount;
                    }

                    if (useConsumptionAmount !== null) {
                        proposalData.data.useConsumptionAmount = useConsumptionAmount;
                    }

                    if (selectedTopUp && selectedTopUp._id) {
                        proposalData.data.topUpRecordId = selectedTopUp._id;
                    }

                    return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
                        proposalData => {
                            if (proposalData && proposalData._id) {
                                let postPropPromArr = [];

                                if (isUpdateTopupRecord) {
                                    postPropPromArr.push(dbConfig.collection_playerTopUpRecord.findOneAndUpdate(
                                        {
                                            _id: rewardData.selectedTopup._id,
                                            createTime: rewardData.selectedTopup.createTime,
                                            bDirty: {$ne: true}
                                        },
                                        {
                                            bDirty: true,
                                            usedType: eventData.type.name,
                                            $push: {usedEvent: eventData._id}
                                        },
                                        {new: true}
                                    ));
                                }

                                if (isUpdateMultiTopupRecord && updateTopupRecordIds.length > 0) {
                                    postPropPromArr.push(dbConfig.collection_playerTopUpRecord.update(
                                        {_id: {$in: updateTopupRecordIds}},
                                        {
                                            bDirty: true,
                                            usedType: eventData.type.name,
                                            $push: {usedEvent: eventData._id}
                                        },
                                        {multi: true}
                                    ));
                                }

                                if (isUpdateMultiConsumptionRecord && updateConsumptionRecordIds.length > 0) {
                                    postPropPromArr.push(dbConfig.collection_playerConsumptionRecord.update(
                                        {_id: {$in: updateConsumptionRecordIds}},
                                        {
                                            bDirty: true,
                                        },
                                        {multi: true}
                                    ));
                                }

                                if (isUpdateValidCredit) {
                                    postPropPromArr.push(dbPlayerUtil.tryToDeductCreditFromPlayer(playerData._id, playerData.platform._id, applyAmount, eventData.name + ":Deduction", rewardData.selectedTopup));
                                }

                                if (isSetUsedTopUpRecord) {
                                    if (intervalTime) {
                                        postPropPromArr.push(dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(playerData.platform._id, playerData._id, eventData._id, useTopUpAmount,null,null,ignoreTopUpBdirtyEvent));
                                    } else {
                                        postPropPromArr.push(dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(playerData.platform._id, playerData._id, eventData._id, useTopUpAmount, intervalTime.startTime, intervalTime.endTime, ignoreTopUpBdirtyEvent));
                                    }
                                }

                                return Promise.all(postPropPromArr);
                            }
                            else {
                                return proposalData;
                            }
                        }
                    );
                }
            }
        );
    },

    /**
     * Now cater for auto apply after each top up
     * @param platformObjId
     * @param playerObj
     * @param data
     * @returns {*|Promise<any>}
     */
    checkAvailableRewardGroupTaskToApply: (platformObjId, playerObj, data) => {
        return dbConfig.collection_rewardType.find({
            isGrouped: true
        }).lean().then(
            rewardTypes => {
                if (rewardTypes && rewardTypes.length > 0) {
                    return dbConfig.collection_rewardEvent.find({
                        platform: platformObjId,
                        type: {$in: rewardTypes.map(e => e._id)},
                        "condition.applyType": constRewardApplyType.AUTO_APPLY,
                    }).lean();
                }
            }
        ).then(
            rewardEvents => {
                if (rewardEvents && rewardEvents.length > 0 && playerObj && playerObj.playerId && data) {
                    rewardEvents.forEach(event => {
                        if (event && event.code) {
                            dbPlayerInfo.applyRewardEvent(null, playerObj.playerId, event.code, data).catch(errorUtils.reportError);
                        }
                    });
                }
            }
        )
    }
};

function checkInterfaceRewardPermission(eventData, rewardData) {
    let isForbidInterface = false;

    // Check registration interface condition
    if (eventData.condition.userAgent && eventData.condition.userAgent.length > 0 && rewardData && rewardData.selectedTopup) {
        let registrationInterface = rewardData.selectedTopup.userAgent ? rewardData.selectedTopup.userAgent : 0;

        isForbidInterface = eventData.condition.userAgent.indexOf(registrationInterface) < 0;
    }

    return isForbidInterface;
}

function checkTopupRecordIsDirtyForReward(eventData, rewardData) {
    let isUsed = false;

    if (eventData.condition.ignoreTopUpDirtyCheckForReward && eventData.condition.ignoreTopUpDirtyCheckForReward.length > 0
        && rewardData && rewardData.selectedTopup && rewardData.usedEvent && rewardData.usedEvent.length > 0) {
        rewardData.usedEvent.map(eventId => {
            eventData.condition.ignoreTopUpDirtyCheckForReward.map(eventIgnoreId => {
                if (String(eventId) == String(eventIgnoreId)) {
                    isUsed = true;
                }
            })
        })
    }

    return isUsed;
}

function processConsecutiveLoginRewardRequest(playerData, inputDate, event, adminInfo, isPrevious) {
    let todayTopUpAmount = 0, todayBonusAmount = 0;

    // Check player top up amount and consumption amount has hitted requirement
    let topupProm = dbConfig.collection_playerTopUpRecord.aggregate(
        {
            $match: {
                playerId: playerData._id,
                platformId: playerData.platform,
                createTime: {$gte: inputDate.startTime, $lt: inputDate.endTime}
            }
        },
        {
            $group: {
                _id: {playerId: "$playerId", platformId: "$platformId"},
                amount: {$sum: "$amount"}
            }
        }
    ).then(
        summary => {
            if (summary && summary[0]) {
                return summary[0].amount;
            }
            else {
                // No topup record will return 0
                return 0;
            }
        }
    );

    let consumptionProm = dbConfig.collection_playerConsumptionRecord.aggregate(
        {
            $match: {
                playerId: playerData._id,
                platformId: playerData.platform,
                createTime: {$gte: inputDate.startTime, $lt: inputDate.endTime}
            }
        },
        {
            $group: {
                _id: {playerId: "$playerId", platformId: "$platformId"},
                validAmount: {$sum: "$validAmount"}
            }
        }
    ).then(
        summary => {
            if (summary && summary[0]) {
                return summary[0].validAmount;
            }
            else {
                // No consumption record will return 0
                return 0;
            }
        }
    );

    return Promise.all([topupProm, consumptionProm]).then(
        data => {
            todayTopUpAmount = data[0];
            todayBonusAmount = data[1];

            let curWeekTime = dbUtility.getCurrentWeekSGTime();

            if (todayTopUpAmount >= event.param.dailyTopUpAmount && todayBonusAmount >= event.param.dailyConsumptionAmount) {
                // Check proposals for this week's reward apply
                return dbConfig.collection_proposal.find({
                    type: event.executeProposal,
                    'data.platformId': playerData.platform,
                    'data.playerId': playerData.playerId,
                    createTime: {$gte: curWeekTime.startTime, $lt: curWeekTime.endTime},
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                });
            }
            else {
                if (!isPrevious) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player does not have enough top up or consumption amount"
                    });
                }
            }
        }
    ).then(
        proposals => {
            if (proposals) {
                let dayIndex = proposals.length + 1;
                let curReward = null;
                let todayTime = dbUtility.getTodaySGTime();
                let isApplied = false;
                let isToday = todayTime.startTime.getTime() == inputDate.startTime.getTime()
                    && todayTime.endTime.getTime() == inputDate.endTime.getTime();

                // Check if player has applied on this date
                proposals.some(
                    (elem, index, arr) => {
                        isApplied = elem.data.applyForDate.getTime() == inputDate.startTime.getTime();

                        return isApplied;
                    }
                );

                if (isApplied && isToday) {
                    return Q.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Player has already applied for this reward"
                    });
                }

                if (!isApplied) {
                    event.param.reward.some(
                        (elem, index, arr) => {
                            if (elem.dayIndex == dayIndex) {
                                curReward = elem;
                                return elem.dayIndex == dayIndex;
                            }
                        }
                    );

                    let proposalData = {
                        type: event.executeProposal,
                        creator: adminInfo ? adminInfo :
                            {
                                type: 'player',
                                name: playerData.name,
                                id: playerData.playerId
                            },
                        data: {
                            playerObjId: playerData._id,
                            playerId: playerData.playerId,
                            playerName: playerData.name,
                            platformId: playerData.platform,
                            dayIndex: dayIndex,
                            todayTopUpAmount: todayTopUpAmount,
                            todayBonusAmount: todayBonusAmount,
                            rewardAmount: curReward.rewardAmount,
                            spendingAmount: curReward.rewardAmount * curReward.consumptionTimes,
                            applyForDate: inputDate.startTime,
                            eventId: event._id,
                            eventName: event.name,
                            eventCode: event.code,
                            eventDescription: event.description
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                        inputDevice: playerData.inputDevice
                    };

                    if (isPrevious) {
                        proposalData.data.isPrevious = isPrevious;
                    }

                    return dbProposal.createProposalWithTypeId(event.executeProposal, proposalData);
                }
            }
        }
    );
}

function getPlayerConsumptionSummary(platformId, playerId, dateFrom, dateTo) {
    let matchObj = {
        platformId: ObjectId(platformId),
        createTime: {
            $gte: new Date(dateFrom),
            $lt: new Date(dateTo)
        },
        playerId: ObjectId(playerId)
    };

    let groupObj = {
        _id: {playerId: "$playerId", platformId: "$platformId"},
        validAmount: {$sum: "$validAmount"},
        bonusAmount: {$sum: "$bonusAmount"}
    };

    return dbConfig.collection_playerConsumptionRecord.aggregate(
        {
            $match: matchObj
        },
        {
            $group: groupObj
        }
    );
}


/**
 * Expire promo code in all platforms pass expirationTime
 */
function expirePromoCode() {
    return dbConfig.collection_promoCode.update({
        status: constPromoCodeStatus.AVAILABLE,
        expirationTime: {$lte: new Date()}
    }, {
        status: constPromoCodeStatus.EXPIRED
    }, {
        multi: true
    });
}

function promoCondition(promo) {
    let proMsg = ''
    if (promo.minTopUpAmount) {
        proMsg += "有新存款<span class=\"c_color\">(" + promo.minTopUpAmount + "以上)" + "</span>";
    }
    if (promo.maxTopUpAmount) {
        proMsg += ", 存款上限<span class=\"c_color\">(" + promo.maxTopUpAmount + ")" + "</span>";
    }
    if (promo.disableWithdraw) {
        proMsg += ' 且尚未投注';
    }
    if (!promo.minTopUpAmount && !promo.disableWithdraw) {
        proMsg += '无';
    }
    return proMsg;
}

function getPromoTitle(promo) {
    let promoTitle = '';
    if (promo.promoCodeTypeObjId.type == 3) {
        promoTitle = promo.amount + '%';
    } else {
        promoTitle = promo.amount + '元';
    }
    return promoTitle;
}

var proto = dbPlayerRewardFunc.prototype;
proto = Object.assign(proto, dbPlayerReward);

// This make WebStorm navigation work
module.exports = dbPlayerReward;
