var dbRewardEventFunc = function () {
};
module.exports = new dbRewardEventFunc();

var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constRewardPriority = require('./../const/constRewardPriority');
var constRewardType = require('./../const/constRewardType');
var constProposalType = require('./../const/constProposalType');
const constProposalStatus = require('./../const/constProposalStatus');
const constProposalMainType = require('../const/constProposalMainType');
const constSystemParam = require("./../const/constSystemParam");
const constGameStatus = require('./../const/constGameStatus');
const constServerCode = require('../const/constServerCode');
const dbPlayerReward = require('../db_modules/dbPlayerReward');
const dbProposalUtil = require('../db_common/dbProposalUtility');
const dbPlayerConsumptionWeekSummary = require('./../db_modules/dbPlayerConsumptionWeekSummary');
const dbGameType = require('../db_modules/dbGameType');
const dbPropUtil = require('./../db_common/dbProposalUtility');

let cpmsAPI = require("../externalAPI/cpmsAPI");
let SettlementBalancer = require('../settlementModule/settlementBalancer');

let dbUtil = require('../modules/dbutility');
const dbRewardUtil = require("./../db_common/dbRewardUtility");
let dbPlayerInfo = require("../db_modules/dbPlayerInfo");
let errorUtils = require("../modules/errorUtils");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var dbRewardEvent = {

    /**
     * Create a new reward event
     * @param {json} rewardData - The data of the reward event. Refer to reward event schema.
     */
    createRewardEvent: function (data) {
        var rewardName = null;
        if (data.type && data.platform) {
            var deferred = Q.defer();
            dbconfig.collection_rewardType.findOne({_id: data.type}).then(
                function (typeData) {
                    if (typeData) {
                        rewardName = typeData.name;
                        return dbconfig.collection_proposalType.findOne({
                            platformId: data.platform,
                            name: typeData.name
                        }).exec();
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't find reward rule"});
                    }
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error finding reward rule", error: error});
                }
            ).then(
                function (typeData) {
                    if (typeData && typeData._id) {
                        data.executeProposal = typeData._id;
                        data.priority = constRewardPriority[rewardName];
                        var event = new dbconfig.collection_rewardEvent(data);
                        return event.save();
                    }
                    else {
                        deferred.reject({name: "DataError", message: "Can't find proposal type"});
                    }
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error finding proposal type", error: error});
                }
            ).then(
                function (data) {
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error creating reward event", error: error});
                }
            );
            return deferred.promise;
        }
        else {
            var rewardEvent = new dbconfig.collection_rewardEvent(data);
            return rewardEvent.save();
        }
    },

    createRewardEventGroup: function (data) {
        return dbconfig.collection_rewardEventGroup(data).save();
    },

    /**
     * Get one reward event by query
     * @param {Object} query
     */
    getRewardEvent: function (query) {
        return dbconfig.collection_rewardEvent.findOne(query).exec();
    },

    /**
     * Get platform's reward event with reward type
     * @param {ObjectId} platformId
     * @param {String} rewardTypeName
     */
    getPlatformRewardEventWithTypeName: function (platformId, rewardTypeName, code) {
        var deferred = Q.defer();
        code = code || {$exists: true};
        dbconfig.collection_rewardType.findOne({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData && typeData._id) {
                    return dbconfig.collection_rewardEvent.find(
                        {type: typeData._id, platform: platformId, code: code}
                    ).populate({path: "rewardType", model: dbconfig.collection_rewardType}).sort({_id: -1}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot find reward type for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        ).then(
            function (eventData) {
                if (eventData && eventData.length > 0) {
                    if (rewardTypeName == constProposalType.PLATFORM_TRANSACTION_REWARD) {
                        deferred.resolve(eventData);
                    } else {
                        deferred.resolve(eventData[0]);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot find reward event for platform and type name"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding reward event for platform and type name",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    /**
     * Get platform's reward event with reward type
     * @param {ObjectId} platformId
     * @param {String} rewardTypeName
     */
    getPlatformRewardEventsWithTypeName: function (platformId, rewardTypeName) {
        return dbconfig.collection_rewardType.findOne({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData && typeData._id) {
                    return dbconfig.collection_rewardEvent.find(
                        {type: typeData._id, platform: platformId}
                    ).populate({path: "rewardType", model: dbconfig.collection_rewardType}).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find reward type for type name"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        );
    },

    getPlatformRewardEventWithCode: function (platformId, rewardTypeName, eventCode) {
        return dbconfig.collection_rewardType.findOne({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData && typeData._id) {
                    return dbconfig.collection_rewardEvent.find(
                        {type: typeData._id, platform: platformId, code: eventCode}
                    ).populate({path: "rewardType", model: dbconfig.collection_rewardType}).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find reward type for type name"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        );
    },

    getRewardApplicationData: function (playerObjId, platformId, code) {
        playerObjId = ObjectId(playerObjId);
        platformId = String(platformId);
        let playerObj;

        return dbconfig.collection_players.findOne({_id: playerObjId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Can not find player"});
                }
                playerObj = playerData;
                if (playerData.permission && playerData.permission.banReward) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Player do not have permission for reward"
                    });
                }

                return dbconfig.collection_rewardEvent.findOne({
                    platform: playerData.platform,
                    code: code
                }).populate({path: "type", model: dbconfig.collection_rewardType}).lean();
            }
        ).then(
            rewardEvent => {
                if (!(rewardEvent && rewardEvent.type)) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Can not find reward event"
                    });
                }
                let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(playerObj, rewardEvent._id);
                if (playerIsForbiddenForThisReward) {
                    return Q.reject({name: "DataError", message: "Player is forbidden for this reward."});
                }
                //check valid time for reward event
                let curTime = new Date();
                if ((rewardEvent.validStartTime && curTime.getTime() < rewardEvent.validStartTime.getTime()) ||
                    (rewardEvent.validEndTime && curTime.getTime() > rewardEvent.validEndTime.getTime())) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "This reward event is not valid anymore"
                    });
                }
                switch (rewardEvent.type.name) {
                    case constRewardType.PLAYER_CONSUMPTION_RETURN:
                        let returnData = {
                            status: 2,
                            condition: {
                                ximaRatios: []
                            }
                        };
                        return dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturn(playerObj.playerId, rewardEvent.code).then(
                            ximaData => {
                                if (ximaData) {
                                    // Check minimum xima amount
                                    if (ximaData && ximaData.event && ximaData.event.param && ximaData.event.param.earlyXimaMinAmount && ximaData.totalAmount && ximaData.totalAmount < ximaData.event.param.earlyXimaMinAmount) {
                                        // Not enough xima amount
                                        returnData.status = 2;
                                    } else {
                                        returnData.status = 1;
                                    }

                                    returnData.result = {
                                        rewardAmount: ximaData.totalAmount? ximaData.totalAmount: 0,
                                        betTimes: ximaData.event && ximaData.event.param && ximaData.event.param.consumptionTimesRequired? ximaData.event.param.consumptionTimesRequired: 0,
                                    };
                                    delete ximaData.totalAmount;
                                    delete ximaData.totalConsumptionAmount;
                                    delete ximaData.event;
                                    delete ximaData.settleTime;
                                    return dbGameType.getAllGameTypesName().then(
                                        gameType => {
                                            for (let key in ximaData) {
                                                if (gameType[key]) {
                                                    let ximaObj = {
                                                        gameType: gameType[key],
                                                        ratio: ximaData[key].ratio || 0,
                                                        amountBet: ximaData[key].consumptionAmount || 0
                                                    };
                                                    returnData.condition.ximaRatios.push(ximaObj);
                                                }
                                            }
                                            return returnData;
                                        }
                                    )
                                } else {
                                    return returnData;
                                }
                            }
                        );
                        break;
                    case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                    case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                    case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                    case constRewardType.PLAYER_RANDOM_REWARD_GROUP:
                    case constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP:
                    case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                    case constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP:
                    case constRewardType.PLAYER_RETENTION_REWARD_GROUP:
                        if (rewardEvent.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP && rewardEvent.condition && !rewardEvent.condition.hasOwnProperty('definePlayerLoginMode')){
                            return Promise.reject({
                                name: "DataError",
                                message: "Login mode is not found"
                            })
                        }
                        let intervalTime;
                        if (rewardEvent.condition.interval) {
                            intervalTime = dbRewardUtil.getRewardEventIntervalTime({}, rewardEvent);
                        }

                        let topupMatchQuery = {
                            playerId: playerObj._id,
                            platformId: playerObj.platform._id
                        };

                        let eventQuery = {
                            "data.platformObjId": playerObj.platform._id,
                            "data.playerObjId": playerObj._id,
                            "data.eventId": rewardEvent._id,
                            status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        };

                        if (rewardEvent.condition.topupType && rewardEvent.condition.topupType.length > 0) {
                            topupMatchQuery.topUpType = {$in: rewardEvent.condition.topupType}
                        }

                        if (rewardEvent.condition.onlineTopUpType && rewardEvent.condition.onlineTopUpType.length > 0) {
                            if (!topupMatchQuery.$and) {
                                topupMatchQuery.$and = [];
                            }

                            topupMatchQuery.$and.push({$or: [{merchantTopUpType: {$in: rewardEvent.condition.onlineTopUpType}}, {merchantTopUpType: {$exists: false}}]});
                        }

                        if (rewardEvent.condition.bankCardType && rewardEvent.condition.bankCardType.length > 0) {
                            if (!topupMatchQuery.$and) {
                                topupMatchQuery.$and = [];
                            }

                            topupMatchQuery.$and.push({$or: [{bankTypeId: {$in: rewardEvent.condition.bankCardType}}, {bankTypeId: {$exists: false}}]});
                        }

                        if (intervalTime) {
                            topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                            eventQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                        }

                        let topUpProm = null;

                        if (rewardEvent.condition.allowOnlyLatestTopUp) {
                            topUpProm = dbconfig.collection_playerTopUpRecord.find(topupMatchQuery).sort({createTime: -1}).limit(1).lean();
                        } else {
                            topUpProm = dbconfig.collection_playerTopUpRecord.find(topupMatchQuery).sort({createTime: 1}).lean();
                        }

                        let lastConsumptionProm = dbconfig.collection_playerConsumptionRecord.find({playerId: playerObjId}).sort({createTime: -1}).limit(1).lean();
                        let eventInPeriodProm = dbconfig.collection_proposal.find(eventQuery).lean();

                        return Promise.all([topUpProm, lastConsumptionProm, eventInPeriodProm]).then(
                            data => {
                                let topUpData =  data[0];
                                let consumptionData =  data[1];
                                let eventInPeriodData = data[2];
                                let eventInPeriodCount = eventInPeriodData.length;
                                let topUpAfterConsumption = [];

                                // filter top up record after consumption
                                if (!rewardEvent.condition.allowConsumptionAfterTopUp) {
                                    if (topUpData && topUpData.length > 0 && consumptionData && consumptionData.length > 0) {
                                        topUpData.forEach(topUp => {
                                            if (topUp && consumptionData[0] && topUp.settlementTime > consumptionData[0].createTime) {
                                                topUpAfterConsumption.push(topUp);
                                            }
                                        })
                                    }
                                }

                                function checkRewardEventWithTopUp(topUpDataObj) {
                                    return dbRewardEvent.checkRewardEventGroupApplicable(playerObj, rewardEvent, {selectedTopup: topUpDataObj}).then(
                                        checkRewardData => {
                                            // Check reward apply limit in period
                                            if (rewardEvent.param.countInRewardInterval && rewardEvent.param.countInRewardInterval <= eventInPeriodCount) {
                                                checkRewardData.status = 3;
                                            }

                                            if (rewardEvent.type.name == constRewardType.PLAYER_RETENTION_REWARD_GROUP && checkRewardData.condition && checkRewardData.condition.deposit && checkRewardData.condition.deposit.hasOwnProperty('status')){
                                                checkRewardData.status = checkRewardData.condition.deposit.status;
                                            }

                                            if (rewardEvent.type.name == constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP) {
                                                if (checkRewardData.condition.deposit.status == 1 || checkRewardData.condition.bet.status == 1) {
                                                    checkRewardData.status = 1;
                                                }
                                                else{
                                                    checkRewardData.status = 2;
                                                }
                                            }
                                            else {
                                                if (checkRewardData.status == 1 && (checkRewardData.condition.deposit.status == 2 || checkRewardData.condition.bet.status == 2 || checkRewardData.condition.telephone.status == 2 || checkRewardData.condition.ip.status == 2 || checkRewardData.condition.SMSCode.status == 2)) {
                                                    checkRewardData.status = 2;
                                                }
                                            }


                                            if (checkRewardData.condition.device.status == 0) {
                                                delete checkRewardData.condition.device;}

                                            if (checkRewardData.condition.telephone.status == 0) {
                                                delete checkRewardData.condition.telephone;
                                            }
                                            if (checkRewardData.condition.ip.status == 0) {
                                                delete checkRewardData.condition.ip;
                                            }
                                            if (checkRewardData.condition.SMSCode.status == 0) {
                                                delete checkRewardData.condition.SMSCode;
                                            }
                                            if (checkRewardData.condition.deposit.status == 1 && topUpDataObj) {
                                                checkRewardData.condition.deposit.details = {
                                                    id: topUpDataObj._id,
                                                    amount: topUpDataObj.amount
                                                };
                                            }
                                            if (checkRewardData.condition.deposit.status == 0 && rewardEvent.type.name !== constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                                                delete checkRewardData.condition.deposit;
                                            }
                                            if (checkRewardData.condition.bet.status == 0) {
                                                delete checkRewardData.condition.bet;
                                            }
                                            if (checkRewardData.status == 2 || checkRewardData.status == 3) {
                                                delete checkRewardData.result;
                                            }

                                            if (rewardEvent.code){
                                                checkRewardData.code = rewardEvent.code;
                                            }
                                            if (rewardEvent.name){
                                                checkRewardData.eventName = rewardEvent.name;
                                            }
                                            if (rewardEvent.type && rewardEvent.type.name){
                                                checkRewardData.rewardType = rewardEvent.type.name;
                                            }

                                            return checkRewardData;
                                        }
                                    );
                                }

                                let promArr = [];
                                if (topUpData && topUpData.length) {
                                    if (rewardEvent.condition && rewardEvent.condition.hasOwnProperty('allowConsumptionAfterTopUp') && !rewardEvent.condition.allowConsumptionAfterTopUp) {
                                        if (consumptionData && consumptionData.length === 0) { // if no consumption, use all valid top up
                                            for (let i = 0; i < topUpData.length; i++) {
                                                promArr.push(checkRewardEventWithTopUp(topUpData[i]));
                                            }
                                        } else if (topUpAfterConsumption && topUpAfterConsumption.length > 0) { // if got top up after consumption
                                            for (let i = 0; i < topUpAfterConsumption.length; i++) {
                                                promArr.push(checkRewardEventWithTopUp(topUpAfterConsumption[i]));
                                            }
                                        } else { // if no top up after consumption
                                            promArr.push(checkRewardEventWithTopUp(null));
                                        }
                                    } else {
                                        for (let i = 0; i < topUpData.length; i++) {
                                            promArr.push(checkRewardEventWithTopUp(topUpData[i]));
                                        }
                                    }
                                } else {
                                    promArr.push(checkRewardEventWithTopUp(null));
                                }

                                return Promise.all(promArr).then(
                                    res => {
                                        if (res && res.length) {
                                            let topUpDetails = [];
                                            let returnData;
                                            for (let j = 0; j < res.length; j++) {
                                                if (res[j].condition.deposit && res[j].condition.deposit.status == 1 && res[j].condition.deposit.details) {
                                                    topUpDetails.push(res[j].condition.deposit.details)
                                                }
                                                if (j == 0) {
                                                    returnData = res[j];
                                                    continue;
                                                }
                                                if (returnData.status != 1) {
                                                    returnData = res[j];
                                                } else if (returnData.status == 1 && res[j].status == 1) {
                                                    returnData = res[j];
                                                }
                                            }

                                            if (returnData.condition.deposit) {
                                                returnData.condition.deposit.details = topUpDetails;
                                            }

                                            let gameProviderProm = Promise.resolve(returnData);
                                            if (returnData.condition.bet && returnData.condition.bet.gameGroup && returnData.condition.bet.gameGroup.length) {
                                                gameProviderProm = dbconfig.collection_gameProvider.populate(returnData, {
                                                    path: 'condition.bet.gameGroup',
                                                    model: dbconfig.collection_gameProvider,
                                                    select: "providerId name"
                                                })
                                            }
                                            return gameProviderProm.then(
                                                populatedGameGroup => {
                                                    if (populatedGameGroup.result && populatedGameGroup.result.providerGroup) {
                                                        return dbconfig.collection_gameProviderGroup.populate(populatedGameGroup, {
                                                            path: 'result.providerGroup',
                                                            model: dbconfig.collection_gameProviderGroup,
                                                            select: "providerGroupId name providers"
                                                        }).then(
                                                            populatedProviderGroup => {
                                                                if (populatedProviderGroup.result.providerGroup.providers && populatedProviderGroup.result.providerGroup.providers.length) {
                                                                    return dbconfig.collection_gameProvider.populate(populatedProviderGroup, {
                                                                        path: 'result.providerGroup.providers',
                                                                        model: dbconfig.collection_gameProvider,
                                                                        select: "providerId name"
                                                                    })
                                                                }
                                                                return populatedProviderGroup;
                                                            }
                                                        )
                                                    } else {
                                                        return populatedGameGroup;
                                                    }
                                                }
                                            )

                                        } else {
                                            return Q.reject({
                                                name: "DataError",
                                                message: "Check reward application fail"
                                            });
                                        }
                                    }
                                )
                            }
                        );
                        break;
                    default:
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            message: "Can not find reward event type"
                        });
                }
            }
        )

    },

    checkRewardEventGroupApplicable: function (playerData, eventData, rewardData) {
        let todayTime = dbUtil.getTodaySGTime();
        let intervalTime;
        let selectedRewardParam = {};
        rewardData = rewardData || {};
        let rewardAmount = 0, spendingAmount = 0, applyAmount = 0;
        let promArr = [];
        let isMultiApplication = false;
        let allRewardProm;
        let selectedTopUp;
        let showRewardPeriod = {};
        let intervalRewardSum = 0, intervalConsumptionSum = 0, intervalTopupSum = 0, intervalBonusSum = 0, playerCreditLogSum = 0;
        let ignoreTopUpBdirtyEvent = eventData && eventData.condition && eventData.condition.ignoreAllTopUpDirtyCheckForReward || {};

        let returnData = {
            status: 1,  // 1: success, 2: fail
            condition: {
                deposit: {
                    status: 0,
                    allAmount: 0,
                    times: 0,
                },
                bet: {
                    status: 0,
                    needBet: 0,
                    alreadyBet: 0,
                    gameGroup: []
                },
                telephone: {status: 0},
                ip: {status: 0},
                SMSCode: {status: 0},
                device: {status: 0}
            },
            result: {
                rewardAmount: 0,
                betAmount: 0,
                betTimes: 0,
                xima: 2
            }
        };

        //check isSharedWithXIMA
        if (eventData.condition.isSharedWithXIMA) {
            returnData.result.xima = 1;
        }

        // Select reward param for player level to use
        if (eventData.condition.isPlayerLevelDiff) {
            selectedRewardParam = eventData.param.rewardParam.filter(e => e.levelId == String(playerData.playerLevel))[0].value;
        } else {
            selectedRewardParam = eventData.param.rewardParam[0].value;
        }

        // Get interval time
        if (eventData.condition.interval) {
            intervalTime = dbRewardUtil.getRewardEventIntervalTime(rewardData, eventData);

            if (eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP){
                intervalTime = dbRewardUtil.getRewardEventIntervalTime(rewardData, eventData, true);
            }
        }

        let topupMatchQuery = {
            playerId: playerData._id,
            platformId: playerData.platform._id
        };

        let eventQuery = {
            "data.platformObjId": playerData.platform._id,
            "data.playerObjId": playerData._id,
            "data.eventId": eventData._id,
            status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
        };

        if (eventData.condition.topupType && eventData.condition.topupType.length > 0) {
            topupMatchQuery.topUpType = {$in: eventData.condition.topupType}
        }

        if (eventData.condition.onlineTopUpType && eventData.condition.onlineTopUpType.length > 0) {
            if (!topupMatchQuery.$and) {
                topupMatchQuery.$and = [];
            }

            topupMatchQuery.$and.push({$or: [{merchantTopUpType: {$in: eventData.condition.onlineTopUpType}}, {merchantTopUpType: {$exists: false}}]});
        }

        if (eventData.condition.bankCardType && eventData.condition.bankCardType.length > 0) {
            if (!topupMatchQuery.$and) {
                topupMatchQuery.$and = [];
            }

            topupMatchQuery.$and.push({$or: [{bankTypeId: {$in: eventData.condition.bankCardType}}, {bankTypeId: {$exists: false}}]});
        }

        if (eventData.condition.consumptionProvider && eventData.condition.consumptionProvider.length > 0) {
            returnData.condition.bet.gameGroup = eventData.condition.consumptionProvider;
        }


        if (intervalTime) {
            topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            eventQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
        }

        let topupInPeriodProm = dbconfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
        let eventInPeriodProm = dbconfig.collection_proposal.find(eventQuery).lean();

        // reward specific promise
        if (eventData.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP) {
            if (rewardData && rewardData.selectedTopup) {
                selectedTopUp = rewardData.selectedTopup;
                applyAmount = rewardData.selectedTopup.amount;

                let withdrawPropQuery = {
                    'data.platformId': playerData.platform._id,
                    'data.playerObjId': playerData._id,
                    createTime: {$gt: selectedTopUp.createTime},
                    status: {$nin: [constProposalStatus.PREPENDING, constProposalStatus.REJECTED, constProposalStatus.FAIL, constProposalStatus.CANCEL]}
                };

                promArr.push(dbProposalUtil.getOneProposalDataOfType(playerData.platform._id, constProposalType.PLAYER_BONUS, withdrawPropQuery));
            }
        }

        if (eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
            let consumptionProm = Promise.resolve();
            let withdrawalProm = Promise.resolve();
            let accumulativeCountProm = Promise.resolve();
            let checkHasReceivedProm = Promise.resolve();
            let todayHasAppliedProm = Promise.resolve();
            let appliedCountQuery = {
                lastApplyDate: {$gte: dbUtil.getTodaySGTime().startTime, $lte: dbUtil.getTodaySGTime().endTime},
                rewardEventObjId: ObjectId(eventData._id),
                platformObjId: ObjectId(playerData.platform._id)
            };
            let rewardProposalQuery = {
                "data.platformObjId": playerData.platform._id,
                "data.playerObjId": playerData._id,
                "data.eventId": eventData._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},

            };
            if (intervalTime){
                appliedCountQuery.lastApplyDate = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                rewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            // check apply limit for the reward
            let appliedCountProm = dbconfig.collection_playerRetentionRewardGroupRecord.find(appliedCountQuery).count();

            todayHasAppliedProm = dbconfig.collection_proposal.findOne(Object.assign({}, rewardProposalQuery, {settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}})).lean();

            // check reward apply restriction on ip, phone and IMEI
            checkHasReceivedProm =  dbPropUtil.checkRestrictionOnDeviceForApplyReward(intervalTime, playerData, eventData);

            if (eventData.condition.definePlayerLoginMode && eventData.condition.definePlayerLoginMode == 1){
                accumulativeCountProm = dbconfig.collection_proposal.find(rewardProposalQuery).sort({'data.accumulativeCount': -1, createTime: -1}).lean();
            }
            else if (eventData.condition.definePlayerLoginMode && eventData.condition.definePlayerLoginMode == 2){
                accumulativeCountProm = dbconfig.collection_proposal.find(rewardProposalQuery).sort({createTime: -1}).lean();
            }

            if (rewardData && rewardData.selectedTopup) {
                selectedTopUp = rewardData.selectedTopup;
                applyAmount = rewardData.selectedTopup.amount;

                if (eventData.condition && eventData.condition.allowOnlyLatestTopUp){
                    //will check is there consumption or withdrawal after the latestTopUp
                    let withdrawPropQuery = {
                        'data.platformId': playerData.platform._id,
                        'data.playerObjId': playerData._id,
                        createTime: {$gt: selectedTopUp.createTime},
                        status: {$nin: [constProposalStatus.PREPENDING, constProposalStatus.REJECTED, constProposalStatus.FAIL, constProposalStatus.CANCEL]}
                    };

                    withdrawalProm = dbProposalUtil.getOneProposalDataOfType(playerData.platform._id, constProposalType.PLAYER_BONUS, withdrawPropQuery);

                    let consumptionPropQuery = {
                        platformId: playerData.platform._id,
                        playerId: playerData._id,
                        createTime: {$gt: selectedTopUp.createTime},
                    };

                    consumptionProm = dbconfig.collection_playerConsumptionRecord.findOne(consumptionPropQuery).lean();
                }
            }
            promArr.push(appliedCountProm);
            promArr.push(withdrawalProm);
            promArr.push(consumptionProm);
            promArr.push(accumulativeCountProm);
            promArr.push(checkHasReceivedProm);
            promArr.push(todayHasAppliedProm);
        }

        if (eventData.type.name === constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP) {
            let playerRewardDetailProm = dbPlayerReward.getPlayerConsecutiveRewardDetail(playerData.playerId, eventData.code, true, null, rewardData.applyTargetDate, true);
            promArr.push(playerRewardDetailProm);
        }

        if (eventData.type.name === constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP) {
            let consumptionSlipRewardProm = dbPlayerReward.getPlayerConsumptionSlipRewardDetail(rewardData, playerData.playerId, eventData.code, rewardData.applyTargetDate, false, true);
            promArr.push(consumptionSlipRewardProm);
        }

        if (eventData.type.name === constRewardType.PLAYER_RANDOM_REWARD_GROUP) {
            if (eventData.condition.rewardAppearPeriod && eventData.condition.rewardAppearPeriod[0] && eventData.condition.rewardAppearPeriod[0].startTime) {
                let isValid = false;
                let todayWeekOfDay = moment(new Date()).tz('Asia/Singapore').day();
                let dayOfHour = moment(new Date()).tz('Asia/Singapore').hours();
                eventData.condition.rewardAppearPeriod.forEach(appearPeriod => {
                    if (appearPeriod.startDate <= todayWeekOfDay && appearPeriod.startTime <= dayOfHour &&
                        appearPeriod.endDate >= todayWeekOfDay && appearPeriod.endTime > dayOfHour
                    ) {
                        isValid = true;

                        // to display reward event appear time in proposal
                        showRewardPeriod.startDate = appearPeriod.startDate;
                        showRewardPeriod.startTime = appearPeriod.startTime;
                        showRewardPeriod.endDate = appearPeriod.endDate;
                        showRewardPeriod.endTime = appearPeriod.endTime;
                    }
                });

                if (!isValid) {
                    return Q.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "The period of the reward has not yet opened"
                    });
                }
            }
            let consumptionMatchQuery = {
                createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime},
                //bDirty: false,
                playerId: playerData._id,
            };

            if (intervalTime) {
                consumptionMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                eventQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            if (eventData.condition.consumptionProvider && eventData.condition.consumptionProvider.length > 0) {
                returnData.condition.bet.gameGroup = eventData.condition.consumptionProvider;
                let consumptionProviders = [];
                eventData.condition.consumptionProvider.forEach(providerId => {
                    consumptionProviders.push(ObjectId(providerId));
                });
                consumptionMatchQuery.providerId = {$in: consumptionProviders};
            }

            let periodConsumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                {$match: consumptionMatchQuery},
            ]);

            promArr.push(periodConsumptionProm);
            topupMatchQuery.amount = {$gte: selectedRewardParam[0].requiredTopUpAmount};
            topupMatchQuery.$or = [{'bDirty': false}];

            if (eventData.condition.ignoreTopUpDirtyCheckForReward && eventData.condition.ignoreTopUpDirtyCheckForReward.length > 0) {
                let ignoreUsedTopupReward = [];
                ignoreUsedTopupReward = eventData.condition.ignoreTopUpDirtyCheckForReward.map(function (rewardId) {
                    return ObjectId(rewardId)
                });
                topupMatchQuery.$or.push({'usedEvent': {$in: ignoreUsedTopupReward}});
            }

            let periodTopupProm = dbconfig.collection_playerTopUpRecord.aggregate(
                {
                    $match: topupMatchQuery
                }
            );
            promArr.push(periodTopupProm);
            let periodPropsProm = dbconfig.collection_proposal.find(eventQuery).lean();
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

                    if (intervalTime) {
                        bonusQuery.settleTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                    }


                    let totalBonusProm = dbconfig.collection_proposal.aggregate(
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
                    if (intervalTime) {
                        totalTopupMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                    }

                    let totalTopupProm = dbconfig.collection_playerTopUpRecord.aggregate(
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

                    if (intervalTime) {
                        creditsDailyLogQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                    }

                    let totalCreditsDailyProm = dbconfig.collection_playerCreditsDailyLog.aggregate([
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

                    // let promiseUsed = [];
                    promiseUsed.push(totalBonusProm);
                    promiseUsed.push(totalTopupProm);
                    promiseUsed.push(totalCreditsDailyProm);

                    calculateLosses = Promise.all(promiseUsed).then(data => {
                        let bonusAmt = data[0];
                        let topUpAmt = data[1];
                        let creditDailyAmt = data[2];

                        intervalBonusSum = data[0];
                        intervalTopupSum = data[1];
                        playerCreditLogSum = data[2];

                        return topUpAmt - bonusAmt - creditDailyAmt;

                    });

                    promArr.push(calculateLosses);
                    break;
                case "2":
                    let allRewardQuery = {
                        "data.platformId": playerData.platform._id,
                        "data.playerObjId": {$in: [ObjectId(playerData._id),playerData._id.toString()]},
                        mainType: "Reward",
                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    allRewardProm = dbconfig.collection_proposal.aggregate(
                        {
                            $match: allRewardQuery
                        },
                        {
                            $group: {
                                _id: null,
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

                    let totalConsumptionAmount = dbconfig.collection_playerConsumptionRecord.aggregate([
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
                        intervalConsumptionSum = data[0] * -1;
                        if (data[1]) {
                            let allRewardAmount = data[1];
                            intervalRewardSum = data[1];
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
                returnData.condition.bet.gameGroup = eventData.condition.consumptionProviderSource;
                consumptionQuery.providerId = {$in: eventData.condition.consumptionProviderSource};
            }

            let consumptions = dbconfig.collection_playerConsumptionRecord.find(consumptionQuery).lean();
            promArr.push(consumptions);
        }

        if (eventData.type.name === constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP) {
            let freeTrialQuery = {
                platformId: playerData.platform._id,
                playerId: playerData._id,
                createTime: {$gte: eventData.condition.validStartTime, $lte: eventData.condition.validEndTime}
            };

            // check during this period interval
            if (intervalTime) {
                freeTrialQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            }

            // check reward apply limit in period
            let countInRewardInterval = dbconfig.collection_proposal.aggregate(
                {
                    $match: {
                        "createTime": freeTrialQuery.createTime,
                        "data.eventId": eventData._id,
                        "status": constProposalStatus.APPROVED,
                        "data.playerObjId": playerData._id
                    }
                },
                {
                    $project: {
                        createTime: 1,
                        status: 1,
                        'data.playerObjId': 1,
                        'data.eventId': 1,
                        'data.lastLoginIp': 1,
                        'data.phoneNumber': 1,
                        'data.deviceId': 1,
                        _id: 0
                    }
                }
            ).then(
                countReward => { // display approved proposal data during this event period
                    let resultArr = [];
                    let samePlayerObjIdResult;
                    let sameIPAddressResult;
                    let samePhoneNumResult;
                    let sameMobileDeviceResult;
                    let samePlayerId = 0;
                    let sameIPAddress = 0;
                    let samePhoneNum = 0;
                    let sameMobileDevice = 0;

                    // check playerId
                    if (countReward) {
                        for (let i = 0; i < countReward.length; i++) {
                            // check if same player  has already received this reward
                            if (playerData._id.toString() === countReward[i].data.playerObjId.toString()) {
                                samePlayerId++;
                            }
                        }

                        if (samePlayerId >= 1) {
                            samePlayerObjIdResult = 0; //fail
                        } else {
                            samePlayerObjIdResult = 1;
                        }
                        resultArr.push(samePlayerObjIdResult);
                    } else {
                        samePlayerObjIdResult = 0;
                        resultArr.push(samePlayerObjIdResult);
                    }

                    if (eventData.condition.checkIPFreeTrialReward) {
                        returnData.condition.ip.status = 1;
                    }
                    // check IP address
                    if (playerData.lastLoginIp !== '' && eventData.condition.checkIPFreeTrialReward) {
                        // execute if IP is not empty
                        for (let i = 0; i < countReward.length; i++) {
                            // check if same IP address  has already received this reward
                            if (playerData.lastLoginIp === countReward[i].data.lastLoginIp) {
                                sameIPAddress++;
                            }
                        }

                        if (sameIPAddress >= 1) {
                            sameIPAddressResult = 0; //fail
                        } else {
                            sameIPAddressResult = 1;
                        }
                        resultArr.push(sameIPAddressResult);
                    } else {
                        // if last login IP is empty, skip IP checking, player register from backend, new player never login
                        sameIPAddressResult = 1;
                        resultArr.push(sameIPAddressResult);
                    }

                    // check phone number
                    if (eventData.condition.checkPhoneFreeTrialReward) {
                        returnData.condition.telephone.status = 1;
                        for (let i = 0; i < countReward.length; i++) {
                            // check if same phone number has already received this reward
                            if (playerData.phoneNumber === countReward[i].data.phoneNumber) {
                                samePhoneNum++;
                            }
                        }

                        if (samePhoneNum >= 1) {
                            samePhoneNumResult = 0; //fail
                        } else {
                            samePhoneNumResult = 1;
                        }
                        resultArr.push(samePhoneNumResult);
                    } else {
                        samePhoneNumResult = 1;
                        resultArr.push(samePhoneNumResult);
                    }

                    // check mobile device
                    if (eventData.condition.checkIsMobileDeviceAppliedBefore) {
                        for (let i = 0; i < countReward.length; i++) {
                            // check if same mobile device has already received this reward
                            if (playerData.deviceId === countReward[i].data.deviceId) {
                                sameMobileDevice++;
                            }
                        }

                        if (sameMobileDevice >= 1) {
                            sameMobileDeviceResult = 0; //fail
                        } else {
                            sameMobileDeviceResult = 1;
                        }
                        resultArr.push(sameMobileDeviceResult);
                    } else {
                        sameMobileDeviceResult = 1;
                        resultArr.push(sameMobileDeviceResult);
                    }

                    return resultArr;
                }
            );

            // check sms verification
            if (eventData.condition.needSMSVerification) {
                returnData.condition.SMSCode.status = 1;
            }

            // check if player has applied for other forbidden reward
            let checkForbidRewardProm = Promise.resolve(true); // default promise as true if checking is not required
            if (eventData.condition.forbidApplyReward && eventData.condition.forbidApplyReward.length > 0) {
                let forbidRewardEventIds = eventData.condition.forbidApplyReward;
                let promoCodeRewardExist = false;

                for (let x = 0; x  < forbidRewardEventIds.length; x++) {
                    forbidRewardEventIds[x] = ObjectId(forbidRewardEventIds[x]);

                    // check if promo code reward (优惠代码) included in forbid reward, ID was hardcoded
                    if (forbidRewardEventIds[x].toString() === '59ca08a3ef187c1ccec863b9') {
                        promoCodeRewardExist = true;
                    }
                }

                let queryMatch = {
                    "createTime": freeTrialQuery.createTime,
                    "data.eventId": {$in: forbidRewardEventIds},
                    "status": constProposalStatus.APPROVED,
                    "data.playerObjId": playerData._id
                };

                if (promoCodeRewardExist) {
                    queryMatch = {
                        "createTime": freeTrialQuery.createTime,
                        "status": constProposalStatus.APPROVED,
                        "data.playerObjId": playerData._id,
                        $or: [
                            {
                                "data.eventId": {$in: forbidRewardEventIds}
                            },
                            {
                                "data.eventCode" : "YHDM",
                                "data.eventName" : "优惠代码"
                            },
                        ]
                    };
                }

                // check other reward apply in period
                checkForbidRewardProm = dbconfig.collection_proposal.aggregate(
                    {
                        $match: queryMatch
                    },
                    {
                        $project: {
                            createTime: 1,
                            status: 1,
                            'data.playerObjId': 1,
                            'data.eventId': 1,
                            'data.eventCode': 1,
                            'data.eventName': 1,
                            _id: 0
                        }
                    }
                ).read("secondaryPreferred").then(
                    countReward => {
                        if (countReward && countReward.length > 0) {
                            return false;
                        } else {
                            return true;
                        }
                    }
                ).catch(
                    error => {
                        //add debug log
                        console.error("checkForbidRewardProm:", error);
                        throw error;
                    }
                );
            }

            promArr.push(countInRewardInterval);
            promArr.push(checkForbidRewardProm);
        }

        return Promise.all([topupInPeriodProm, eventInPeriodProm, Promise.all(promArr)]).then(
            data => {
                let topupInPeriodData = data[0];
                let eventInPeriodData = data[1];
                let rewardSpecificData = data[2];

                let topupInPeriodCount = topupInPeriodData.length;
                let eventInPeriodCount = eventInPeriodData.length;
                let rewardAmountInPeriod = eventInPeriodData.reduce((a, b) => a + b.data.rewardAmount, 0);

                // Check reward apply limit in period
                if (eventData.param.countInRewardInterval && eventData.param.countInRewardInterval <= eventInPeriodCount) {
                    returnData.status = 2;
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

                    let topUpTimes;
                    switch (intervalType) {
                        case "1":
                            topUpTimes = ">=" + value1;
                            break;
                        case "2":
                            topUpTimes = "<=" + value1;
                            break;
                        case "3":
                            topUpTimes = "==" + value1;
                            break;
                        case "4":
                            topUpTimes = [">=" + value1, "<" + value2];
                            break;
                    }
                    if (!returnData.condition.deposit.status && value1) {
                        returnData.condition.deposit.status = 1;
                    }
                    returnData.condition.deposit.times = topUpTimes;

                    if (!hasMetTopupCondition) {
                        returnData.condition.deposit.status = 2;
                    }
                    else{
                        returnData.condition.deposit.status = 1;
                    }

                    if (eventData.type.name == constRewardType.PLAYER_RETENTION_REWARD_GROUP && returnData.condition.deposit && returnData.condition.deposit.status == 1){
                        if (checkTopupRecordIsDirtyForReward(eventData, rewardData)) {
                            returnData.condition.deposit.status = 2;
                        }
                    }
                }

                // Count reward amount and spending amount
                switch (eventData.type.name) {
                  
                    case constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP:
                        let consumptionSlipRewardDetail = rewardSpecificData[0];
                        
                        returnData.condition.deposit.list = [];
                        returnData.condition.bet.list = [];

                        if (consumptionSlipRewardDetail.list && consumptionSlipRewardDetail.list.length){

                            returnData.condition.deposit.status = 1;
                            consumptionSlipRewardDetail.list.forEach(
                               detail => {
                                   returnData.condition.deposit.list.push({
                                       id: detail._id || null,
                                       no: detail.consumptionSlipNo || null,
                                       time: detail.consumptionCreateTime || null,
                                       betAmount: detail.consumptionAmount || null,
                                       winAmount: detail.bonusAmount || null,
                                       rewardAmount: detail.rewardAmount || null,
                                       spendingTimes: detail.spendingTimes || null,
                                       depositAmount: detail.requiredTopUpAmount || null,
                                       status: 1,
                                       gameProvider: detail.gameProvider && detail.gameProvider.name ?  detail.gameProvider.name : null,
                                       endingDigitMatched: detail.requiredOrderNoEndingDigit || null

                                   })
                               }
                           )
                        }
                        else{
                            returnData.condition.deposit.status = 2;
                        }

                        if (consumptionSlipRewardDetail.unusedList && consumptionSlipRewardDetail.unusedList.length){
                            consumptionSlipRewardDetail.unusedList.forEach(
                                detail => {
                                    returnData.condition.deposit.list.push({
                                        id: detail._id || null,
                                        no: detail.consumptionSlipNo || null,
                                        time: detail.consumptionCreateTime || null,
                                        betAmount: detail.consumptionAmount || null,
                                        winAmount: detail.bonusAmount || null,
                                        rewardAmount: detail.rewardAmount || null,
                                        spendingTimes: detail.spendingTimes || null,
                                        depositAmount: detail.requiredTopUpAmount || null,
                                        gameProvider: detail.gameProvider && detail.gameProvider.name ?  detail.gameProvider.name : null,
                                        status: 2,
                                        endingDigitMatched: detail.requiredOrderNoEndingDigit || null
                                    })
                                }
                            )
                        }

                        if(consumptionSlipRewardDetail.applyList && consumptionSlipRewardDetail.applyList.length){
                            
                            returnData.condition.bet.status = 1;
                            consumptionSlipRewardDetail.applyList.forEach(
                                detail => {
                                    returnData.condition.bet.list.push({
                                        id: detail._id || null,
                                        no: detail.consumptionSlipNo || null,
                                        time: detail.consumptionCreateTime || null,
                                        betAmount: detail.consumptionAmount || null,
                                        winAmount: detail.bonusAmount || null,
                                        rewardAmount: detail.rewardAmount || null,
                                        spendingTimes: detail.spendingTimes || null,
                                        gameProvider: detail.gameProvider && detail.gameProvider.name ?  detail.gameProvider.name : null,
                                        status: 1,
                                        endingDigitMatched: detail.requiredOrderNoEndingDigit || null
                                    })
                                }
                            )
                        }

                        if (returnData.result.hasOwnProperty('rewardAmount')){
                            delete returnData.result.rewardAmount;
                        }
                        if (returnData.result.hasOwnProperty('betAmount')){
                            delete returnData.result.betAmount;
                        }
                        if (returnData.result.hasOwnProperty('betTimes')){
                            delete returnData.result.betTimes;
                        }
                        if (consumptionSlipRewardDetail.hasOwnProperty('availableQuantity')){
                            returnData.result.quantityLimit = consumptionSlipRewardDetail.availableQuantity
                        }
                        if (consumptionSlipRewardDetail.hasOwnProperty('appliedCount')){
                            returnData.result.appliedCount = consumptionSlipRewardDetail.appliedCount
                        }
                        if (consumptionSlipRewardDetail.hasOwnProperty('topUpAmountInterval')){
                            returnData.result.topUpAmountInterval = consumptionSlipRewardDetail.topUpAmountInterval
                        }
                        if (consumptionSlipRewardDetail.hasOwnProperty('availableQuantity') && consumptionSlipRewardDetail.hasOwnProperty('appliedCount') && consumptionSlipRewardDetail.appliedCount >= consumptionSlipRewardDetail.availableQuantity){
                            returnData.status = 3;
                        }

                        break;
                    case constRewardType.PLAYER_RETENTION_REWARD_GROUP:
                        // rewardSpecificData[0] - the number of player has applied
                        // rewardSpecificData[1] - consumption after top up
                        // rewardSpecificData[2] - withdrawal after top up
                        // rewardSpecificData[3] - the similiar reward proposal
                        // rewardSpecificData[4] - the phone, ip, imei checking
                        // rewardSpecificData[5] - check if today has applied or gotten the reward
                        let matchPlayerId = false;
                        let matchIPAddress = false;
                        let matchPhoneNum = false;
                        let matchMobileDevice = false;
                        let todayHasApplied = rewardSpecificData[5] ? true: false;

                        if (rewardSpecificData[4]) {
                            matchPlayerId = rewardSpecificData[4].samePlayerHasReceived || false;
                            matchIPAddress = eventData.condition && eventData.condition.checkSameIP ? (rewardSpecificData[4].sameIPAddressHasReceived || false) : false;
                            matchPhoneNum = eventData.condition && eventData.condition.checkSamePhoneNumber ? (rewardSpecificData[4].samePhoneNumHasReceived || false) : false;
                            matchMobileDevice = eventData.condition && eventData.condition.checkSameDeviceId ? (rewardSpecificData[4].sameDeviceIdHasReceived || false) : false;
                        }

                        if (!returnData.condition.deposit.hasOwnProperty('list')){
                            returnData.condition.deposit.list = [];
                        }

                        let retRewardData = dbPlayerReward.applyRetentionRewardParamLevel(eventData, applyAmount, selectedRewardParam, null, null, rewardSpecificData[3]);

                        returnData.condition.deposit.list = dbPlayerReward.getRetentionRewardList(returnData, rewardData, eventData, selectedRewardParam, rewardSpecificData[3], retRewardData, todayHasApplied);

                        // if today has applied/received reward -> skip the following checking
                        // if returnData.condition.deposit.status != 1 meaning it is already failed to fulfill the top up requirment, so no need to go thru the checking
                        if (retRewardData && retRewardData.hasOwnProperty('selectedIndex') && !todayHasApplied && returnData.condition.deposit.status == 1) {
                            // check if first time apply: if matchPlayerId == true -> has already applied
                            if (matchPlayerId){
                                // set the status to 1 (fulfilled but not yet apply/receive) as it will be given once the player login
                                returnData.condition.deposit.list[retRewardData.selectedIndex].status = 1;
                            }
                            else {
                                returnData.condition.deposit.list[retRewardData.selectedIndex].status = returnData.condition.deposit.status;
                                // check if there is consumption nor withdrawal after top up
                                if (eventData.condition && eventData.condition.allowOnlyLatestTopUp && (rewardSpecificData[1] || rewardSpecificData[2])) {
                                    returnData.condition.deposit.list[retRewardData.selectedIndex].status = 0; // not eligible for the reward
                                }

                                if (matchPlayerId) {
                                    returnData.condition.deposit.list[retRewardData.selectedIndex].status = 2; // has applied the reward
                                }

                                if (matchIPAddress || matchPhoneNum || matchMobileDevice) {
                                    returnData.condition.deposit.list[retRewardData.selectedIndex].status = 0;
                                }

                                if (eventData.condition && eventData.condition.checkSameIP) {
                                    returnData.condition.ip.status = matchIPAddress ? 2 : 1;
                                }

                                if (eventData.condition && eventData.condition.checkSamePhoneNumber) {
                                    returnData.condition.telephone.status = matchPhoneNum ? 2 : 1;
                                }

                                if (eventData.condition && eventData.condition.checkSameDeviceId) {
                                    returnData.condition.device.status = matchMobileDevice ? 2 : 1;
                                }

                                // check if the application limit has reached
                                if (eventData.condition && eventData.condition.quantityLimitInInterval && rewardSpecificData[2] >= eventData.condition.quantityLimitInInterval) {
                                    returnData.condition.list[retRewardData.selectedIndex].status = 0;
                                }

                                // check correct topup type
                                let checkCorrectTopUpType = true;
                                if ((rewardData && rewardData.selectedTopup)) {
                                    if (intervalTime && !isDateWithinPeriod(selectedTopUp.createTime, intervalTime)) {
                                        returnData.condition.deposit.list[retRewardData.selectedIndex].status = 0;
                                    }

                                    if (eventData.condition.topupType && eventData.condition.topupType.length > 0 && eventData.condition.topupType.indexOf(selectedTopUp.topUpType) === -1) {
                                        checkCorrectTopUpType = false;
                                    }

                                    if (eventData.condition.onlineTopUpType && selectedTopUp.merchantTopUpType && eventData.condition.onlineTopUpType.length > 0 && eventData.condition.onlineTopUpType.indexOf(selectedTopUp.merchantTopUpType) === -1) {
                                        checkCorrectTopUpType = false;
                                    }

                                    if (eventData.condition.bankCardType && selectedTopUp.bankCardType && eventData.condition.bankCardType.length > 0 && eventData.condition.bankCardType.indexOf(selectedTopUp.bankCardType) === -1) {
                                        checkCorrectTopUpType = false;
                                    }

                                    if (!checkCorrectTopUpType) {
                                        returnData.condition.deposit.list[retRewardData.selectedIndex].status = 0;
                                    }

                                    if (eventData.condition && eventData.condition.minDepositAmount) {
                                        let minDepositAmount = eventData.condition.minDepositAmount;
                                        returnData.condition.deposit.allAmount = minDepositAmount;

                                        if (applyAmount < minDepositAmount) {
                                            returnData.condition.deposit.list[retRewardData.selectedIndex].status = 0;
                                        }
                                    }
                                }
                                else {
                                    returnData.condition.deposit.list[retRewardData.selectedIndex].status = 0;
                                }

                                if (returnData.condition.deposit.list[retRewardData.selectedIndex].status == 1) {
                                    // get the reward amount
                                    if (retRewardData && retRewardData.selectedRewardParam && retRewardData.rewardAmount != null && retRewardData.spendingAmount != null) {
                                        returnData.result.rewardAmount = retRewardData.rewardAmount;
                                        if (retRewardData.selectedRewardParam && retRewardData.selectedRewardParam.spendingTimes) {
                                            returnData.result.betTimes = retRewardData.selectedRewardParam.spendingTimes;
                                        }
                                    }
                                }
                            }
                        }
                        // total number of applicants
                        returnData.result.appliedCount = rewardSpecificData[0] || 0;

                        if (eventData.condition && eventData.condition.quantityLimitInInterval) {
                            returnData.result.quantityLimit = eventData.condition.quantityLimitInInterval;
                        }

                        if (todayHasApplied){
                            // retRewardData.selectedIndex-1 as retRewardData.selectedIndex is the index of the next iteration
                            returnData.condition.deposit.status = returnData.condition.deposit.list[retRewardData.selectedIndex-1].status;
                        }
                        else{
                            returnData.condition.deposit.status = returnData.condition.deposit.list[retRewardData.selectedIndex].status;
                        }
                        break;

                    case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                            if (!returnData.condition.deposit.status) {
                                returnData.condition.deposit.status = 1;
                            }

                            // Check withdrawal after top up condition
                            if (!eventData.condition.allowApplyAfterWithdrawal && rewardSpecificData && rewardSpecificData[0]) {
                                returnData.condition.deposit.status = 2;
                            }

                            // check correct topup type
                            let correctTopUpType = true;
                            if ((rewardData && rewardData.selectedTopup)) {
                                if (intervalTime && !isDateWithinPeriod(selectedTopUp.createTime, intervalTime)) {
                                    returnData.condition.deposit.status = 2;
                                }

                                if (eventData.condition.topupType && eventData.condition.topupType.length > 0 && eventData.condition.topupType.indexOf(selectedTopUp.topUpType) === -1) {
                                    correctTopUpType = false;
                                }

                                if (eventData.condition.onlineTopUpType && selectedTopUp.merchantTopUpType && eventData.condition.onlineTopUpType.length > 0 && eventData.condition.onlineTopUpType.indexOf(selectedTopUp.merchantTopUpType) === -1) {
                                    correctTopUpType = false;
                                }

                                if (eventData.condition.bankCardType && selectedTopUp.bankCardType && eventData.condition.bankCardType.length > 0 && eventData.condition.bankCardType.indexOf(selectedTopUp.bankCardType) === -1) {
                                    correctTopUpType = false;
                                }
                            } else {
                                returnData.condition.deposit.status = 2;
                                correctTopUpType = false;
                            }

                            // Set reward param step to use
                            if (eventData.param.isMultiStepReward) {
                                if (eventData.param.isSteppingReward) {
                                    let eventStep = eventInPeriodCount >= selectedRewardParam.length ? selectedRewardParam.length - 1 : eventInPeriodCount;
                                    selectedRewardParam = selectedRewardParam[eventStep];
                                } else {
                                    let firstRewardParam = selectedRewardParam[0];
                                    selectedRewardParam = selectedRewardParam.filter(e => applyAmount >= e.minTopUpAmount).sort((a, b) => b.minTopUpAmount - a.minTopUpAmount);
                                    selectedRewardParam = selectedRewardParam[0] || firstRewardParam || {};
                                }
                            } else {
                                selectedRewardParam = selectedRewardParam[0];
                            }

                            returnData.condition.deposit.allAmount = selectedRewardParam.minTopUpAmount;
                            if (applyAmount < selectedRewardParam.minTopUpAmount || !correctTopUpType) {
                                returnData.condition.deposit.status = 2;
                            }

                            if (eventData.condition.isDynamicRewardAmount) {
                                rewardAmount = applyAmount * selectedRewardParam.rewardPercentage;
                                if (selectedRewardParam.maxRewardInSingleTopUp && selectedRewardParam.maxRewardInSingleTopUp > 0) {
                                    rewardAmount = Math.min(rewardAmount, Number(selectedRewardParam.maxRewardInSingleTopUp));
                                }

                                // Check reward amount exceed daily limit
                                if (eventData.param.dailyMaxRewardAmount) {
                                    if (rewardAmountInPeriod >= eventData.param.dailyMaxRewardAmount) {
                                        returnData.condition.deposit.status = 2;
                                    } else if (rewardAmount + rewardAmountInPeriod > eventData.param.dailyMaxRewardAmount) {
                                        rewardAmount = eventData.param.dailyMaxRewardAmount - rewardAmountInPeriod;
                                    }
                                }

                                selectedRewardParam.spendingTimes = selectedRewardParam.spendingTimes || 1;
                                spendingAmount = (applyAmount + rewardAmount) * selectedRewardParam.spendingTimes;
                                returnData.result.betTimes = selectedRewardParam.spendingTimes;
                            } else {
                                rewardAmount = selectedRewardParam.rewardAmount;
                                selectedRewardParam.spendingTimesOnReward = selectedRewardParam.spendingTimesOnReward || 0;
                                spendingAmount = selectedRewardParam.rewardAmount * selectedRewardParam.spendingTimesOnReward;
                                returnData.result.betTimes = selectedRewardParam.spendingTimesOnReward;
                            }

                            if (rewardAmount) {
                                returnData.result.rewardAmount = rewardAmount;
                            }

                            // // Set top up record update flag
                            // isUpdateTopupRecord = true;
                            //
                            // // Set player valid credit update flag
                            // if (/*eventData.condition.providerGroup &&*/ eventData.condition.isDynamicRewardAmount) {
                            //     isUpdateValidCredit = true;
                            // }

                        break;

                    // type 2
                    case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                        isMultiApplication = true;
                        applyAmount = 0;
                        delete returnData.condition.deposit.times;

                        let playerRewardDetail = rewardSpecificData[0];
                        if (playerRewardDetail.checkResult) {
                            if (playerRewardDetail.deposit) {
                                if (!returnData.condition.deposit.status) {
                                    returnData.condition.deposit.status = 1;
                                }
                                returnData.condition.deposit.allAmount = playerRewardDetail.deposit;
                                if (!playerRewardDetail.checkResult.requiredTopUpMet) {
                                    returnData.condition.deposit.status = 2;
                                }
                            }
                            if (playerRewardDetail.effectiveBet) {
                                if (!returnData.condition.bet.status) {
                                    returnData.condition.bet.status = 1;
                                }
                                returnData.condition.bet.needBet = playerRewardDetail.effectiveBet - playerRewardDetail.checkResult.consumptionAmount;
                                returnData.condition.bet.alreadyBet = playerRewardDetail.checkResult.consumptionAmount;
                                if (!playerRewardDetail.checkResult.requiredConsumptionMet) {
                                    returnData.condition.bet.status = 2;
                                }
                            }
                        }

                        returnData.result.rewardAmount = playerRewardDetail.list.bonus;
                        returnData.result.betAmount = playerRewardDetail.effectiveBet;
                        returnData.result.betTimes = playerRewardDetail.list.requestedTimes;

                        break;

                    // type 3
                    case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                        let loseAmount = rewardSpecificData[0];
                        let selectedCondition;

                        if (eventInPeriodData && eventInPeriodData.length > 0) {
                            returnData.status = 2;
                        }

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
                            selectedCondition = selectedRewardParam [j];
                            if (topUpinPeriod >= selectedRewardParam[j].minDeposit && loseAmount >= selectedRewardParam[j].minLoseAmount) {
                                selectedCondition = selectedRewardParam [j];
                                break;
                            }

                        }

                        if (selectedCondition) {
                            if (selectedCondition.minDeposit) {
                                if (!returnData.condition.deposit.status) {
                                    returnData.condition.deposit.status = 1;
                                }
                                returnData.condition.deposit.allAmount = selectedCondition.minDeposit;
                                if (topUpinPeriod < selectedCondition.minDeposit) {
                                    returnData.condition.deposit.status = 2;
                                }
                            }
                            if (selectedCondition.minLoseAmount) {
                                if (!returnData.condition.bet.status) {
                                    returnData.condition.bet.status = 1;
                                }
                                returnData.condition.bet.needBet = selectedCondition.minLoseAmount;
                                returnData.condition.bet.alreadyBet = loseAmount;
                                if (loseAmount < selectedCondition.minLoseAmount) {
                                    returnData.condition.bet.status = 2;
                                }
                            }
                        }

                        if (eventData.condition.isDynamicRewardAmount) {
                            let rewardAmountTemp = loseAmount * (selectedCondition.rewardPercent / 100);
                            if (rewardAmountTemp > selectedCondition.maxReward) {
                                rewardAmount = selectedCondition.maxReward;
                            } else {
                                rewardAmount = rewardAmountTemp;
                            }

                        } else {
                            rewardAmount = selectedCondition.rewardAmount;
                        }
                        spendingAmount = rewardAmount * selectedCondition.spendingTimes;

                        returnData.result.rewardAmount = rewardAmount;
                        returnData.result.betAmount = selectedCondition.minLoseAmount;
                        returnData.result.betTimes = selectedCondition.spendingTimes;
                        // return returnData;
                        break;

                    // type 4 投注额优惠（组）
                    case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                        if (eventInPeriodCount && eventInPeriodCount > 0) {
                            returnData.status = 2;
                        }

                        if (!returnData.condition.bet.status) {
                            returnData.condition.bet.status = 1;
                        }

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
                            returnData.condition.bet.status = 2;
                        }

                        if (selectedRewardParam && selectedRewardParam.minConsumptionAmount) {
                            returnData.condition.bet.needBet = selectedRewardParam.minConsumptionAmount;
                            returnData.condition.bet.alreadyBet = totalConsumption;
                        }

                        rewardAmount = selectedRewardParam.rewardAmount;
                        spendingAmount = selectedRewardParam.rewardAmount * selectedRewardParam.spendingTimes;
                        returnData.result.rewardAmount = rewardAmount;
                        returnData.result.betAmount = selectedRewardParam.minConsumptionAmount;
                        returnData.result.betTimes = selectedRewardParam.spendingTimes;
                        // return returnData;
                        break;

                    // type 5
                    case constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP:
                        selectedRewardParam = selectedRewardParam[0];

                        if (selectedRewardParam.rewardAmount && selectedRewardParam.spendingTimes) {
                            let matchPlayerId = rewardSpecificData[0][0];
                            let matchIPAddress = rewardSpecificData[0][1];
                            let matchPhoneNum = rewardSpecificData[0][2];
                            let matchMobileDevice = rewardSpecificData[0][3];
                            let matchForbidRewardEvent = rewardSpecificData[1];

                            if (!matchPlayerId) {
                                returnData.status = 2;
                            }

                            if (!matchIPAddress) {
                                returnData.condition.ip.status = 2;
                            }

                            if (!matchPhoneNum) {
                                returnData.condition.telephone.status = 2;
                            }

                            if (!matchMobileDevice) {
                                returnData.condition.telephone.status = 2;
                            }

                            if (!matchForbidRewardEvent) {
                                returnData.condition.telephone.status = 2;
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
                        returnData.result.rewardAmount = rewardAmount;
                        returnData.result.betTimes = selectedRewardParam.spendingTimes;
                        break;

                    // type 6
                    case constRewardType.PLAYER_RANDOM_REWARD_GROUP:
                        selectedRewardParam = selectedRewardParam[0];
                        let consumptionRecords = rewardSpecificData[0];
                        let topUpRecords = rewardSpecificData[1];
                        let periodProps = rewardSpecificData[2];
                        let applyRewardTimes = periodProps.length;
                        let topUpAmount = topUpRecords.reduce((sum, value) => sum + value.amount, 0);
                        let consumptionAmount = consumptionRecords.reduce((sum, value) => sum + value.validAmount, 0);
                        let applyRewardAmount = periodProps.reduce((sum, value) => sum + value.data.useConsumptionAmount, 0);


                        if (selectedRewardParam.requiredTopUpAmount) {
                            if (!returnData.condition.deposit.status) {
                                returnData.condition.deposit.status = 1;
                            }
                            returnData.condition.deposit.allAmount = selectedRewardParam.requiredTopUpAmount;
                            if (topUpAmount < selectedRewardParam.requiredTopUpAmount) {
                                returnData.condition.deposit.status = 2;
                            }
                        }

                        if (selectedRewardParam.requiredConsumptionAmount) {
                            if (!returnData.condition.bet.status) {
                                returnData.condition.bet.status = 1;
                            }
                            returnData.condition.bet.needBet = selectedRewardParam.requiredConsumptionAmount;
                            returnData.condition.bet.alreadyBet = consumptionAmount - applyRewardAmount;
                            if ((consumptionAmount - applyRewardAmount) < selectedRewardParam.requiredConsumptionAmount) {
                                returnData.condition.bet.status = 2;
                            }
                        }

                        if (selectedRewardParam.numberParticipation && applyRewardTimes < selectedRewardParam.numberParticipation) {
                            let meetTopUpCondition = false, meetConsumptionCondition = false;
                            if (topUpAmount >= (selectedRewardParam.requiredTopUpAmount? selectedRewardParam.requiredTopUpAmount: 0)) {
                                meetTopUpCondition = true;
                            }

                            if (selectedRewardParam.requiredConsumptionAmount) {
                                meetConsumptionCondition = consumptionAmount - applyRewardAmount >= selectedRewardParam.requiredConsumptionAmount;
                            } else {
                                meetConsumptionCondition = true;
                            }

                            if (selectedRewardParam.operatorOption) { // true = and, false = or
                                if (!meetTopUpCondition) {
                                    returnData.status = 2;
                                }
                                if (!meetConsumptionCondition) {
                                    returnData.status = 2;
                                }
                            } else {
                                if (!(meetTopUpCondition || meetConsumptionCondition)) {
                                    returnData.status = 2;
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

                            // let pNumber = Math.random() * totalProbability;
                            // combination.some(
                            //     eReward => {
                            //         if (pNumber <= eReward.totalProbability) {
                            //             rewardAmount = eReward.rewardAmount;
                            //         }
                            //         return rewardAmount;
                            //     }
                            // );
                            // spendingAmount = rewardAmount * selectedRewardParam.spendingTimesOnReward;
                            // returnData.result.rewardAmount = rewardAmount;
                            returnData.result.betAmount = selectedRewardParam.requiredConsumptionAmount;
                            returnData.result.betTimes = selectedRewardParam.spendingTimesOnReward;
                        }
                        else {
                            return Q.reject({
                                status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                name: "DataError",
                                message: "Player reach participate limit"
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
                // Check whether top up record is dirty
                if (eventData.condition.providerGroup) {
                    returnData.result.providerGroup = eventData.condition.providerGroup;
                }
                if (returnData.condition.deposit && returnData.condition.deposit.status == 1) {
                    if (checkTopupRecordIsDirtyForReward(eventData, rewardData)) {
                        returnData.condition.deposit.status = 2;
                    }
                }
                return returnData;
            }
        )


    } ,

    /**
     * Find reward events by query
     * @param {String} query
     */
    getRewardEvents: function (query) {
        return dbconfig.collection_rewardEvent.find(query).populate({
            path: "type",
            model: dbconfig.collection_rewardType
        }).exec();
    },

    getRewardEventGroup: function (query) {
        return dbconfig.collection_rewardEventGroup.find(query).lean().then(
            groupData => {
                groupData.unshift({name: "默认组别*"});
                return groupData;
            }
        );
    },

    /**
     * Update reward event
     * @param {String} query string
     * @param {Json} updateData
     */
    updateRewardEvent: function (query, updateData) {
        return dbconfig.collection_rewardEvent.findOneAndUpdate(query, updateData).exec();
    },

    updateRewardEventGroup: function (query, updateData) {
        return dbconfig.collection_rewardEventGroup.findOneAndUpdate(query, updateData, {upsert: true}).exec();
    },

    /**
     * Remove reward events by id
     * @param {Array} ids
     */
    removeRewardEventsById: function (ids) {
        return dbconfig.collection_rewardEvent.remove({_id: {$in: ids}}).exec();
    },

    removeRewardEventGroup: function (query) {
        return dbconfig.collection_rewardEventGroup.remove(query).exec();
    },


    /*
     * Get all platforms id has the reward event with passed in reward type
     * @param {String} rewardTypeName, reward type name
     */
    getPlatformsIdForRewardType: function (rewardTypeName) {
        var deferred = Q.defer();
        dbconfig.collection_rewardType.find({name: rewardTypeName}).then(
            function (typeData) {
                if (typeData) {
                    var typeIds = [];
                    for (var i = 0; i < typeData.length; i++) {
                        typeIds.push(typeData[i]._id);
                    }
                    //todo::refactor the reward rule here
                    return dbconfig.collection_rewardRule.find({rewardType: {$in: typeIds}}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward type for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward type for type name", error: error});
            }
        ).then(
            function (ruleData) {
                if (ruleData) {
                    var ruleIds = [];
                    for (var i = 0; i < ruleData.length; i++) {
                        ruleIds.push(ruleData[i]._id);
                    }
                    return dbconfig.collection_rewardEvent.find({rule: {$in: ruleIds}}).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward rule for type name"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding reward rule for reward types", error: error});
            }
        ).then(
            function (eventData) {
                if (eventData) {
                    var platformIds = [];
                    for (var i = 0; i < eventData.length; i++) {
                        platformIds.push(eventData[i].platform);
                    }
                    deferred.resolve(platformIds);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't find reward event for type name"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding reward event for reward types",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    startSavePlayersCredit: (platformId, bManual) => {
        let queryTime = dbUtil.getYesterdaySGTime();
        return dbconfig.collection_rewardType.findOne({
            name: constRewardType.PLAYER_CONSUMPTION_INCENTIVE
        }).lean().then(
            rewardType => {
                return dbconfig.collection_rewardEvent.find({
                    type: rewardType._id
                })
            }
        ).then(
            rewardEvents => {
                let settlePlayerCredit = platformId => {
                    // System log
                    console.log('[Save player credits] Settling platform:', platformId, queryTime);

                    // Get summary of player with top up yesterday
                    let stream = dbconfig.collection_playerTopUpRecord.aggregate([
                        {
                            $match: {
                                platformId: ObjectId(platformId),
                                createTime: {
                                    $gte: queryTime.startTime,
                                    $lt: queryTime.endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$playerId",
                                topUpCount: {$sum: 1}
                            }
                        }]
                    ).cursor({batchSize: 100}).allowDiskUse(true).exec();

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(
                        () => {
                            // System log to make sure balancer is working
                            console.log('[Save player credits] Settlement Server initialized');

                            return Q(
                                balancer.processStream(
                                    {
                                        stream: stream,
                                        batchSize: 1,
                                        makeRequest: function (playerObjs, request) {
                                            request("player", "savePlayerCredit", {
                                                playerObjId: playerObjs.map(player => {
                                                    return {
                                                        _id: player._id
                                                    }
                                                }),
                                                bManual: bManual
                                            });
                                        }
                                    }
                                ).then(
                                    data => console.log("savePlayerCredit settle success:", data),
                                    error => console.log("savePlayerCredit settle failed:", error)
                                )
                            );
                        },
                        error => console.log('[Save player credits] Settlement Server initialization error:', error)
                    );
                };

                if (platformId) {
                    // Work on single platform only
                    return settlePlayerCredit(platformId);
                }
                else {
                    // Work on all platforms
                    let platformIds = new Set(rewardEvents.map(rewardEvent => String(rewardEvent.platform)));

                    platformIds.forEach(
                        platformId => {
                            //if there is commission config, start settlement
                            settlePlayerCredit(platformId);
                        }
                    );
                }
            }
        )
    },

    savePlayerCredit: (playerObjIds, bManual, retries) => {
        let queryTime = dbUtil.getYesterdaySGTime();
        let proms = [];
        let playerData, platformData;
        let failedQueryPlayers = [];
        let numRetry = retries || 0;
        let isPlayerSettled = false;

        playerObjIds.forEach(
            playerObjId => {
                proms.push(
                    dbconfig.collection_players.findOne({
                        _id: playerObjId
                    }).populate({
                        path: "platform",
                        model: dbconfig.collection_platform,
                        populate: {
                            path: "gameProviders",
                            model: dbconfig.collection_gameProvider
                        }
                    }).lean().then(
                        player => {
                            playerData = player;
                            platformData = player.platform;

                            if (player.isTestPlayer) {
                                return true;
                            }

                            // Check whether player already have record for yesterday
                            return dbconfig.collection_playerCreditsDailyLog.findOne({
                                playerObjId: playerData._id,
                                platformObjId: playerData.platform._id,
                                createTime: queryTime.endTime
                            }).lean();
                        }
                    ).then(
                        creditLog => {
                            if (!creditLog && platformData && platformData.gameProviders && platformData.gameProviders.length > 0) {
                                let proms = [];

                                for (let i = 0; i < platformData.gameProviders.length; i++) {
                                    if (platformData.gameProviders[i].status == constGameStatus.ENABLE) {
                                        proms.push(
                                            cpmsAPI.player_queryCredit(
                                                {
                                                    username: playerData.name,
                                                    platformId: platformData.platformId,
                                                    providerId: platformData.gameProviders[i].providerId,
                                                }
                                            ).then(
                                                data => data,
                                                error => {
                                                    //todo:: skip qt for now
                                                    if (platformData.gameProviders[i].providerId != 46) {
                                                        // Failed when querying CPMS on this provider
                                                        failedQueryPlayers.push(playerObjId);

                                                        return Q.reject(error);
                                                    }
                                                    else {
                                                        return {
                                                            credit : 0
                                                        };
                                                    }
                                                }
                                            )
                                        )
                                    }
                                }
                                return Q.all(proms);
                            }
                            else {
                                isPlayerSettled = true;
                            }
                        }
                    ).then(
                        providerCredit => {
                            // Will only enter when all providers successfully queried
                            if (providerCredit && providerCredit.length > 0) {
                                let credit = 0;
                                for (let i = 0; i < providerCredit.length; i++) {
                                    if (providerCredit[i].credit === undefined) {
                                        providerCredit[i].credit = 0;
                                    }
                                    credit += parseFloat(providerCredit[i].credit);
                                }
                                return credit;
                            }
                            else {
                                return 0;
                            }
                        }
                    ).then(
                        gameCredit => {
                            if (!isPlayerSettled) {
                                return dbconfig.collection_playerCreditsDailyLog.update({
                                        playerObjId: playerData._id,
                                        platformObjId: playerData.platform._id,
                                        createTime: bManual ? 0 : queryTime.endTime
                                    },
                                    {
                                        playerObjId: playerData._id,
                                        platformObjId: playerData.platform._id,
                                        validCredit: playerData.validCredit,
                                        lockedCredit: playerData.lockedCredit,
                                        gameCredit: gameCredit,
                                    },
                                    {
                                        upsert: true
                                    }
                                );
                            }
                        }
                    ).catch(
                        error => {
                            // System log when querying game credit timeout / error
                            console.log("ERROR: player_queryCredit failed for player", playerData.name, error);
                        }
                    )
                );
            }
        );

        return Q.all(proms).then(
            () => {
                if (failedQueryPlayers.length > 0) {
                    // Increment retry count
                    numRetry++;

                    // Retry for 3 times with 1 minute delay, may be configurable
                    if (numRetry <= 3) {
                        // SYSTEM LOG
                        console.log('[Save player credits] Players to retry:', failedQueryPlayers, "Retry No.", numRetry);

                        setTimeout(
                            () => dbRewardEvent.savePlayerCredit(failedQueryPlayers, bManual, numRetry), 60000
                        )
                    }
                }
            }
        );
    },

    startPlatformRTGEventSettlement: function (platformObjId, eventCode) {
        let applyTargetDate;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
 
        let eventProm = dbconfig.collection_rewardEvent.findOne({code: eventCode}).lean();

        let rewardTypesProm = dbconfig.collection_rewardType.find({isGrouped: true}).lean();

        return Promise.all([platformProm, eventProm, rewardTypesProm]).then(
            data => {
                if (!data) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Error in getting ID"
                    });
                }

                let platform = data[0];
                let event = data[1];
                let rewardTypes = data[2] || [];

                if (!platform) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Cannot find platform"
                    });
                }

                if (!event) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Error in getting rewardEvent"
                    });
                }

                let settleTime =  getIntervalPeriodFromEvent(event, getIntervalPeriodFromEvent(event).startTime.setMinutes(getIntervalPeriodFromEvent(event).startTime.getMinutes() - 10));

                if (event && event.condition && ["1", "2", "3", "4"].includes(event.condition.interval)) {
                    let currentPeriodStartTime = getIntervalPeriodFromEvent(event).startTime;
                    applyTargetDate = currentPeriodStartTime.setMinutes(currentPeriodStartTime.getMinutes() - 10);
                }
                else if (event.validStartTime && event.validEndTime) {
                    let validEndTime = new Date(event.validEndTime);
                    applyTargetDate = validEndTime.setMinutes(validEndTime.getMinutes() - 10);
                }

                let streamProm;
                let rewardTypeName = {};
                if (rewardTypes && rewardTypes.length > 0) {
                    rewardTypes.map(rewardType => {
                        switch (rewardType.name) {
                            case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                            case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                            case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                            case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                            case constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP:
                                rewardTypeName[String(rewardType._id)] = rewardType.name;
                        }
                    });
                }

                let aggregateParam = [
                    {
                        $match: {
                            platformId: platform._id,
                            createTime: {$gte: settleTime.startTime, $lt: settleTime.endTime}
                        }
                    },
                    {
                        $group: {_id: '$playerId'}
                    }
                ];

                switch (rewardTypeName[String(event.type)]) {
                    case constRewardType.PLAYER_TOP_UP_RETURN_GROUP:
                    case constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP:
                        // need top up
                        streamProm = dbconfig.collection_playerTopUpRecord.aggregate(aggregateParam).then(
                            players => {
                                let playerObjIds = [];
                                players.map(player => {
                                    playerObjIds.push(player._id);
                                });
                                return dbconfig.collection_players.find({_id: {$in: playerObjIds}}, {playerId: 1}).cursor({batchSize: 10});
                            }
                        );
                        break;
                    case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                    case constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP:
                        // need consumption
                        streamProm = dbconfig.collection_playerConsumptionRecord.aggregate(aggregateParam).then(
                            players => {
                                let playerObjIds = [];
                                players.map(player => {
                                    playerObjIds.push(player._id);
                                });
                                return dbconfig.collection_players.find({_id: {$in: playerObjIds}}, {playerId: 1}).cursor({batchSize: 10});
                            }
                        );
                        break;
                    case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                        // need either consumption or top up
                        let consumptionPlayerProm = dbconfig.collection_playerConsumptionRecord.aggregate(aggregateParam);
                        let topUpPlayerProm = dbconfig.collection_playerTopUpRecord.aggregate(aggregateParam);

                        streamProm = Promise.all([consumptionPlayerProm, topUpPlayerProm]).then(
                            data => {
                                let consumptionPlayers, topUpPlayers;
                                ([consumptionPlayers, topUpPlayers] = data);

                                let playerObjIds = [];
                                consumptionPlayers.map(player => {
                                    playerObjIds.push(String(player._id));
                                });
                                topUpPlayers.map(player => {
                                    playerObjIds.push(String(player._id));
                                });

                                playerObjIds = Array.from(new Set(playerObjIds)); // remove duplicated values
                                return dbconfig.collection_players.find({_id: {$in: playerObjIds}}, {playerId: 1}).cursor({batchSize: 10});
                            }
                        );

                        break;
                    default:
                        streamProm = Promise.resolve(dbconfig.collection_players.find({platform: platformObjId}).cursor({batchSize: 10}));
                }

                streamProm.then(
                    stream => {
                        let balancer = new SettlementBalancer();
                        return balancer.initConns().then(function () {
                            return Q(
                                balancer.processStream(
                                    {
                                        stream: stream,
                                        batchSize: constSystemParam.BATCH_SIZE,
                                        makeRequest: function (players, request) {
                                            request("player", "bulkPlayerApplyReward", {
                                                playerIdArray: players.map(function (playerIdObj) {
                                                    return playerIdObj.playerId;
                                                }),
                                                eventCode,
                                                applyTargetDate
                                            });
                                        }
                                    }
                                )
                            );
                        });
                    }
                );
            }
        );
    },

    bulkPlayerApplyReward: function (playerIdArray, eventCode, applyTargetDate) {
        let proms = [];
        for (let i = 0; i < playerIdArray.length; i++) {
            let prom = dbPlayerInfo.applyRewardEvent(0, playerIdArray[i], eventCode, {applyTargetDate}, null, null, true).catch(err => {
                console.error("rejectedId:", playerIdArray[i], "eventCode", eventCode, " error:", err)
                errorUtils.reportError(err)
            });
            proms.push(prom);
        }

        return Promise.all(proms);
    },

};

module.exports = dbRewardEvent;

function checkTopupRecordIsDirtyForReward(eventData, rewardData) {
    let isUsed = false;

    if (rewardData && rewardData.selectedTopup && rewardData.selectedTopup.usedEvent && rewardData.selectedTopup.usedEvent.length > 0) {
        if (eventData.condition.ignoreTopUpDirtyCheckForReward && eventData.condition.ignoreTopUpDirtyCheckForReward.length > 0) {
            rewardData.selectedTopup.usedEvent.map(eventId => {
                let isOneMatch = false;
                eventData.condition.ignoreTopUpDirtyCheckForReward.map(eventIgnoreId => {
                    if (String(eventId) == String(eventIgnoreId)) {
                        isOneMatch = true;
                    }
                });
                // If one of the reward matched in ignore list, dirty check for this reward is ignored
                isUsed = isOneMatch ? isUsed : true;
            })
        } else {
            isUsed = true;
        }
    }

    return isUsed;
}

function isDateWithinPeriod(date, period) {
    if (period && period.startTime && period.endTime) {
        return date > period.startTime && date < period.endTime;
    }
    return false;
}

function getIntervalPeriodFromEvent(event, applyTargetTime) {
    let intervalTime = dbUtil.getTodaySGTime();
    if (event && event.condition) {
        switch (event.condition.interval) {
            case "1":
                intervalTime = applyTargetTime ? dbUtil.getDayTime(applyTargetTime) : dbUtil.getTodaySGTime();
                break;
            case "2":
                intervalTime = applyTargetTime ? dbUtil.getWeekTime(applyTargetTime) : dbUtil.getCurrentWeekSGTime();
                break;
            case "3":
                intervalTime = applyTargetTime ? dbUtil.getBiWeekSGTIme(applyTargetTime) : dbUtil.getCurrentBiWeekSGTIme();
                break;
            case "4":
                intervalTime = applyTargetTime ? dbUtil.getMonthSGTIme(applyTargetTime) : dbUtil.getCurrentMonthSGTIme();
                break;
            default:
                if (event.validStartTime && event.validEndTime) {
                    intervalTime = {startTime: event.validStartTime, endTime: event.validEndTime};
                }
                break;
        }
    }

    return intervalTime;
}

var proto = dbRewardEventFunc.prototype;
proto = Object.assign(proto, dbRewardEvent);

// This make WebStorm navigation work
module.exports = dbRewardEvent;