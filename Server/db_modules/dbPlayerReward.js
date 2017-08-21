const Q = require("q");

const constProposalEntryType = require("./../const/constProposalEntryType");
const constProposalStatus = require("./../const/constProposalStatus");
const constProposalType = require("./../const/constProposalType");
const constProposalUserType = require("./../const/constProposalUserType");
const constRewardType = require("./../const/constRewardType");
const constServerCode = require('../const/constServerCode');

const dbProposal = require('./../db_modules/dbProposal');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');

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

    applyPlayerTopUpPromo: (topUpProposalData) => {
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

                            if (Number(promotion.topUpType) === Number(topUpProposalData.data.topupType)) {
                                promotionDetail = promotion;
                                promoEventDetail = promoEvent;
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

            return dbConfig.collection_players.findOne({_id: playerObjId}).populate(
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
                }
            );
        },

    getTopUpPromoList: (playerId, clientType) => {
        let topUpTypeData;

        return new Promise(function (resolve, reject) {
            let topUpTypeDataProm = dbPlayerInfo.getOnlineTopupType(playerId, 1, clientType);
            let playerDataProm = dbConfig.collection_players.findOne({playerId: playerId}).lean();
            let rewardTypeProm = dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_TOP_UP_PROMO});
            Promise.all([topUpTypeDataProm, playerDataProm, rewardTypeProm]).then(
                data => {
                    topUpTypeData = data[0];
                    let playerData = data[1];
                    let rewardTypeData = data[2];

                    return dbConfig.collection_rewardEvent.find({type: rewardTypeData._id, platform: playerData.platform}).sort({_id: -1}).limit(1).lean();
                }
            ).then(
                rewardEventData => {
                    let promotions = rewardEventData[0].param.reward;
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