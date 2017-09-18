const Q = require("q");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constProposalEntryType = require("./../const/constProposalEntryType");
const constProposalStatus = require("./../const/constProposalStatus");
const constProposalType = require("./../const/constProposalType");
const constProposalUserType = require("./../const/constProposalUserType");
const constRewardType = require("./../const/constRewardType");
const constServerCode = require('../const/constServerCode');

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
        return new Promise(function (resolve) {
            let rewardEventQuery = {
                platform: topUpProposalData.data.platformId
            };

            dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_TOP_UP_PROMO}).lean().then(
                rewardTypeData => {
                    let rewardEventQuery = {
                        platform: topUpProposalData.data.platformId,
                        type: rewardTypeData._id,
                        validStartTime: {$lte: topUpProposalData.createTime},
                        validEndTime: {$gte: topUpProposalData.createTime}
                    };

                    return dbConfig.collection_rewardEvent.find(rewardEventQuery).lean();
                }
            ).then(
                promoEvents => {
                    if (!promoEvents || promoEvents.length <= 0) {
                        // there is no promotion event going on
                        return;
                    }

                    let promoEventDetail, promotionDetail;
                    for (let i = 0; i < promoEvents.length; i++) {
                        let promoEvent = promoEvents[i];
                        for (let j = 0; j < promoEvent.param.reward.length; j++) {
                            let promotion = promoEvent.param.reward[j];

                            switch (true) {
                                case (type === 'online' && Number(promotion.topUpType) === Number(topUpProposalData.data.topupType)):
                                case (type === 'weChat' && Number(promotion.topUpType) === 98):
                                case (type === 'aliPay' && Number(promotion.topUpType) === 99):
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
                        return;
                    }

                    let rewardAmount = (Number(topUpProposalData.data.amount) * promotionDetail.rewardPercentage / 100);

                    let proposalData = {
                        type: promoEventDetail.executeProposal,

                        data: {
                            playerObjId: topUpProposalData.data.playerObjId,
                            playerId: topUpProposalData.data.playerId,
                            playerName: topUpProposalData.data.playerName,
                            platformId: topUpProposalData.data.platformId,
                            platform: topUpProposalData.data.platform,
                            rewardAmount: rewardAmount,
                            spendingAmount: 0,
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
                _id: playerObjId,
                isNewSystem: true
            }).populate(
                {path: "platform", model: dbConfig.collection_platform}
            ).then(
                playerData => {
                    if (playerData && playerData.platform && playerData.permission.playerConsecutiveConsumptionReward) {
                        playerObj = playerData;
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

                    //check if player is valid for reward
                    if (playerObj.permission.PlayerPacketRainReward === false) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            message: "Reward not applicable"
                        });
                    }

                    let promEvent = dbRewardEvent.getPlatformRewardEventWithTypeName(playerData.platform._id, constRewardType.PLAYER_PACKET_RAIN_REWARD, code);
                    let promTopUp = dbConfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                playerId: playerData._id,
                                platformId: playerData.platform._id,
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
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid player data"});
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
                    //calculate player reward amount
                    let rewardAmount = 0;
                    let totalProbability = 0;
                    let curMinTopUpAmount = 0;
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

    getPromoCodesHistory: (searchQuery) => {
        return dbConfig.collection_players.findOne({
            platform: searchQuery.platformObjId,
            name: searchQuery.playerName
        }).lean().then(
            playerData => {
                let query = {
                    platformObjId: searchQuery.platformObjId
                };

                if (playerData) {
                    query.playerObjId = playerData._id;
                }

                return dbConfig.collection_promoCode.find(query)
                    .populate({path: "playerObjId", model: dbConfig.collection_players})
                    .populate({path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType})
                    .populate({path: "allowedProviders", model: dbConfig.collection_gameProvider}).lean();
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

    savePromoCodeUserGroup: (platformObjId, groupData) => {
        let saveArr = [];

        if (groupData && groupData.length > 0) {
            groupData.map(grp => {
                grp.platformObjId = platformObjId;
                saveArr.push(dbConfig.collection_promoCodeUserGroup.findOneAndUpdate({
                    platformObjId: platformObjId,
                    name: grp.name
                }, grp, {upsert: true}));
            });
        }
        ;

        return Promise.all(saveArr);
    },

    getPromoCodeUserGroup: (platformObjId) => dbConfig.collection_promoCodeUserGroup.find({platformObjId: platformObjId}).lean(),

    applyPromoCode: (platformObjId, playerName, promoCode, adminInfo) => {
        let promoCodeObj, playerObj, topUpProp;

        return dbConfig.collection_players.findOne({
            platform: platformObjId,
            name: playerName
        }).then(
            playerData => {
                playerObj = playerData;

                return dbConfig.collection_promoCode.find({
                    platformObjId: platformObjId,
                    playerObjId: playerObj._id,
                    acceptedTime: {$exists: false}
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
                if (topUpProposal && topUpProposal.length > 0) {
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
                if (consumptionSumm.length == 0) {
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
                        applyAmount: topUpProp.data.amount,
                        topUpProposal: topUpProp.proposalId,
                        useLockedCredit: false,
                        useConsumption: false
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };
                return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalData);
            }
        ).then(
            data => {
                return dbConfig.collection_promoCode.findOneAndUpdate({
                    _id: promoCodeObj._id
                }, {
                    acceptedTime: new Date()
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

                console.log('monitorObjs', monitorObjs);

                monitorObjs.forEach((elem, index, arr) => {
                    dbConfig.collection_proposal.findOne({
                        'data.platformId': elem.platformObjId,
                        'data.playerObjId': elem.playerObjId,
                        settleTime: {$gt: elem.acceptedTime},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                        mainType: {$in: ["TopUp", "Reward"]}
                    })
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

module.exports = dbPlayerReward;