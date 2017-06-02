const Q = require("q");

const constProposalEntryType = require("./../const/constProposalEntryType");
const constProposalStatus = require("./../const/constProposalStatus");
const constProposalType = require("./../const/constProposalType");
const constProposalUserType = require("./../const/constProposalUserType");
const constRewardType = require("./../const/constRewardType");
const constServerCode = require('../const/constServerCode');

const dbProposal = require('./../db_modules/dbProposal');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');

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
    applyConsecutiveLoginReward: function (playerId, code, ifAdmin) {
        let platformId = null;
        let player = {};
        let todayTime = dbUtility.getTodaySGTime();
        let event = {};
        let adminInfo = ifAdmin;
        let todayTopUpAmount, todayBonusAmount;

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

                        // TODO:: Refactor this two into common functions

                        // Check player top up amount and consumption amount has hitted requirement
                        let topupProm = dbConfig.collection_playerTopUpRecord.aggregate(
                            {
                                $match: {
                                    playerId: player._id,
                                    platformId: player.platform,
                                    createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
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
                                if (String(summary[0]._id.playerId) == String(player._id)) {
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
                                    playerId: player._id,
                                    platformId: player.platform,
                                    createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
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
                                if (String(summary[0]._id.playerId) == String(player._id)) {
                                    return summary[0].validAmount;
                                }
                                else {
                                    // No consumption record will return 0
                                    return 0;
                                }
                            }
                        );

                        return Promise.all([topupProm, consumptionProm]);
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
            data => {
                todayTopUpAmount = data[0];
                todayBonusAmount = data[1];

                let curWeekTime = dbUtility.getCurrentWeekSGTime();

                if (todayTopUpAmount >= event.param.dailyTopUpAmount && todayBonusAmount >= event.param.dailyConsumptionAmount) {
                    // Check proposals for this week's reward apply
                    return dbConfig.collection_proposal.find({
                        type: event.executeProposal,
                        'data.platformId': platformId,
                        'data.playerId': player.playerId,
                        createTime: {$gte: curWeekTime.startTime, $lt: curWeekTime.endTime},
                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    });
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                        name: "DataError",
                        message: "Player does not have enough top up or consumption amount"
                    });
                }
            }
        ).then(
            proposals => {
                if (proposals) {
                    let dayIndex = proposals.length + 1;
                    let curReward = null;
                    let todayTime = dbUtility.getTodaySGTime();
                    let isApplied = false;

                    // Check if player has applied today
                    proposals.some(
                        (elem, index, arr) => {
                            isApplied = elem.createTime >= todayTime.startTime && elem.createTime < todayTime.endTime;

                            return isApplied;
                        }
                    );

                    if (isApplied) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Player has already applied for this reward"
                        });
                    }

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
                                name: player.name,
                                id: playerId
                            },
                        data: {
                            playerObjId: player._id,
                            playerId: player.playerId,
                            playerName: player.name,
                            platformId: platformId,
                            dayIndex: dayIndex,
                            todayTopUpAmount: todayTopUpAmount,
                            todayBonusAmount: todayBonusAmount,
                            rewardAmount: curReward.rewardAmount,
                            spendingAmount: curReward.rewardAmount * curReward.consumptionTimes,
                            eventId: event._id,
                            eventName: event.name,
                            eventCode: event.code,
                            eventDescription: event.description
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                    };

                    return dbProposal.createProposalWithTypeId(event.executeProposal, proposalData);
                }
            }
        );
    },
};

module.exports = dbPlayerReward;