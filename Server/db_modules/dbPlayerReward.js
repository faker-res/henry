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
const constRewardType = require("./../const/constRewardType");
const constServerCode = require('../const/constServerCode');

const dbPlayerUtil = require('../db_common/dbPlayerUtility');

const dbGameProvider = require('../db_modules/dbGameProvider');
const dbProposal = require('./../db_modules/dbProposal');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const dbPlayerPayment = require('../db_modules/dbPlayerPayment');
const dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');

const dbConfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');
const rewardUtility = require("../modules/rewardUtility");

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

    getPromoCodeTypes: (platformObjId) => dbConfig.collection_promoCodeType.find({platformObjId: platformObjId}).lean(),

    getPromoCodeTypeByObjId: (promoCodeTypeObjId) => dbConfig.collection_promoCodeType.findOne({_id: promoCodeTypeObjId}).lean(),

    /*
     * player apply for consecutive login reward
     * @param {String} playerId
     * @param {String} code
     */
    applyConsecutiveLoginReward: function (playerId, code, adminId, adminName, isPrevious) {
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

                    let rewardAmount = (Number(topUpProposalData.data.amount) * Number(promotionDetail.rewardPercentage) / 100);
                    if( rewardAmount > 500 ){
                        rewardAmount = 500;
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
                            spendingAmount: rewardAmount,
                            applyAmount: 0,
                            amount: rewardAmount,
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
            ).then(
                proposalData => {
                    resolve(proposalData);
                }
            ).catch(
                error => {
                    //add debug log
                    console.error(error);
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

    applyConsecutiveConsumptionReward:
        (playerObjId, consumptionAmount, eventData, adminInfo) => {
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
                    if (playerData && playerData.platform && playerData.permission.playerConsecutiveConsumptionReward) {
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
                                    amount: rewardAmount,
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
                    if (playerObj.permission.PlayerPacketRainReward === false) {
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

                    return dbConfig.collection_rewardEvent.find({type: rewardTypeData._id, platform: playerData.platform}).sort({_id: -1}).limit(1).lean();
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
      return dbConfig.collection_platform.findOne({platformId: platformId}).exec()
      .then(
          platformRecord=>{
            if(platformRecord){
              platformData = platformRecord;
              return dbConfig.collection_players.findOne({
                  playerId: playerId,
                  platform: ObjectId(platformRecord._id)
              })
            }else{
              return Q.reject({name: "DataError", message: "Player Not Found"});
            }
       })
       .then(
         playerRecord=>{
           if(playerRecord && playerRecord._id){
               var query = {
                   playerObjId:playerRecord._id,
                   platformObjId:platformData._id
               }
               if(status){
                   query.status = status;
               }
               return dbConfig.collection_promoCode.find(query)
                 .populate({path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType})
                 .populate({path: "allowedProviders", model: dbConfig.collection_gameProvider}).lean();
           }else{
             return Q.reject({name: "DataError", message: "Platform Not Found"});
           }
         }
       )

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
                    .populate({path: "allowedProviders", model: dbConfig.collection_gameProvider})
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
    getDelayDurationGroup: (platformObjId,duration) => dbConfig.collection_platform.find({_id: platformObjId}).lean(),

    applyPromoCode: (platformObjId, playerName, promoCode, adminInfo) => {
        let promoCodeObj, playerObj, topUpProp;
        let isType2Promo = false;

        return expirePromoCode().then(res => {
            return dbConfig.collection_players.findOne({
                platform: platformObjId,
                name: playerName
            })
        }).then(
            playerData => {
                playerObj = playerData;
                return dbConfig.collection_promoCode.find({
                    platformObjId: platformObjId,
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
                            message: "您输入了错误的优惠代码，请确认您的短信内容。"
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
                        message: "您目前尚无可领取优惠，谢谢。"
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
                            message: "您的最新存款已经申请其他优惠，请在重新存款后、投注前申请！"
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
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "您需要有新的存款 '" + promoCodeObj.minTopUpAmount + "元' 才可以领取此优惠，千万别错过了！"
                    })
                }
            }
        ).then(
            consumptionSumm => {
                if (isType2Promo || consumptionSumm.length == 0) {
                    return dbConfig.collection_proposalType.findOne({
                        platformId: platformObjId,
                        name: constProposalType.PLAYER_PROMO_CODE_REWARD
                    }).lean();
                } else {
                    return Q.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "您在最近一笔的存款后已经投注，请在重新存款后、投注前申请！"
                    })
                }
            }
        ).then(
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
                        applyAmount: topUpProp && topUpProp.data.amount ? topUpProp.data.amount : 0,
                        topUpProposal: topUpProp && topUpProp.proposalId ? topUpProp.proposalId : null,
                        useLockedCredit: false,
                        useConsumption: false
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };
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


    }
};

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


var proto = dbPlayerRewardFunc.prototype;
proto = Object.assign(proto, dbPlayerReward);

// This make WebStorm navigation work
module.exports = dbPlayerReward;
