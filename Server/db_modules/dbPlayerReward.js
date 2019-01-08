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
const constProposalMainType = require('../const/constProposalMainType');
const constProposalStatus = require("./../const/constProposalStatus");
const constProposalType = require("./../const/constProposalType");
const constProposalUserType = require("./../const/constProposalUserType");
const constRewardApplyType = require("./../const/constRewardApplyType");
const constRewardPeriod = require("./../const/constRewardPeriod");
const constRewardType = require("./../const/constRewardType");
const constServerCode = require('../const/constServerCode');
const constPromoCodeTemplateGenre = require("./../const/constPromoCodeTemplateGenre");

const dbPlayerUtil = require('../db_common/dbPlayerUtility');
const dbProposalUtil = require('../db_common/dbProposalUtility');
const dbRewardUtil = require("./../db_common/dbRewardUtility");

const dbGameProvider = require('../db_modules/dbGameProvider');
const dbProposal = require('./../db_modules/dbProposal');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const dbPlayerMail = require('../db_modules/dbPlayerMail');
const dbPlayerPayment = require('../db_modules/dbPlayerPayment');
const dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
const dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
const dbPlayerFeedback = require('./../db_modules/dbPlayerFeedback');
const dbRewardTask = require('./../db_modules/dbRewardTask');
const dbPropUtil = require('./../db_common/dbProposalUtility');

const dbConfig = require('./../modules/dbproperties');
const dbUtility = require('./../modules/dbutility');
const errorUtils = require("./../modules/errorUtils.js");
const rewardUtility = require("../modules/rewardUtility");
const SMSSender = require('../modules/SMSSender');
const messageDispatcher = require("../modules/messageDispatcher.js");
const localization = require("../modules/localization");

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

    getSlotInfo: function (playerId, rewardCode, platformId) {
        let player, platform, playerLevel, firstProm, event, intervalTime;
        let list = [];
        let canApply = false;
        let isRewardAmountDynamic = false;

        function addParamToList(selectedParam, status) {
            if (!selectedParam) {
                return false;
            }

            let listItem = {
                minDeposit: selectedParam.minTopUpAmount,
                status
            };

            if (isRewardAmountDynamic) {
                listItem.promoRate = parseFloat((selectedParam.rewardPercentage * 100).toFixed(2)) + "%";
                listItem.promoLimit = selectedParam.maxRewardInSingleTopUp;
                listItem.betTimes = selectedParam.spendingTimes;
            }
            else {
                listItem.promoAmount = selectedParam.rewardAmount;
                listItem.betTimes = selectedParam.spendingTimesOnReward;
            }

            list.push(listItem);
        }

        if (playerId) {
            let playerProm = dbConfig.collection_players.findOne({playerId})
                .populate({path: "playerLevel", model: dbConfig.collection_playerLevel})
                .populate({path: "platform", model: dbConfig.collection_platform})
                .lean().then(playerData => {
                    if (!playerData) {
                        return Promise.reject({name: "DataError", message: "Invalid player data"});
                    }

                    player = playerData;
                    platform = playerData.platform;
                    playerLevel = playerData.playerLevel;
                });
            firstProm = playerProm;
        } else {
            let platformProm = dbConfig.collection_platform.findOne({platformId}).lean().then(platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Invalid player data"});
                }

                platform = platformData;
            });
            firstProm = platformProm;
        }

        return firstProm.then(() => {
            return dbRewardEvent.getPlatformRewardEventWithTypeName(platform._id, constRewardType.PLAYER_TOP_UP_RETURN_GROUP, rewardCode);
        }).then(eventData => {
            event = eventData;
            let currentTime = new Date();
            if (!event) {
                return Promise.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "Error in getting rewardEvent"
                });
            }

            if (event.validStartTime && event.validStartTime > currentTime || event.validEndTime && event.validEndTime < currentTime) {
                return Promise.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "This reward event is not valid anymore"
                });
            }

            intervalTime = getIntervalPeriodFromEvent(event);

            let similarRewardProposalProm = Promise.resolve([]);
            let lastTopUpProm = Promise.resolve([]);
            let numberOfTopUpProm = Promise.resolve(0);
            let lastConsumptionProm = Promise.resolve([]);
            let lastValidWithdrawalProm = Promise.resolve([]);

            if (!player) {
                return Promise.all([similarRewardProposalProm, lastTopUpProm, numberOfTopUpProm, lastConsumptionProm, lastValidWithdrawalProm]);
            }

            let rewardProposalQuery = {
                "data.platformObjId": platform._id,
                "data.playerObjId": player._id,
                "data.eventId": event._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };

            let lastConsumptionQuery = {
                platformId: platform._id,
                playerId: player._id
            };

            let lastValidWithdrawalQuery = {
                mainType: "PlayerBonus",
                "data.playerId": player.playerId,
                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.PENDING, constProposalStatus.SUCCESS, constProposalStatus.AUTOAUDIT]}
            };

            let lastTopUpQuery = {playerId: player._id};

            if (intervalTime) {
                rewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                lastTopUpQuery.settlementTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).sort({createTime: -1}).lean();

            lastTopUpProm = dbConfig.collection_playerTopUpRecord.find(lastTopUpQuery).sort({createTime: -1}).limit(1).lean();

            lastConsumptionProm = dbConfig.collection_playerConsumptionRecord.find(lastConsumptionQuery).sort({createTime: -1}).limit(1).lean();

            lastValidWithdrawalProm = dbConfig.collection_proposal.find(lastValidWithdrawalQuery).sort({createTime: -1}).limit(1).lean();

            numberOfTopUpProm = dbConfig.collection_playerTopUpRecord.find(lastTopUpQuery).count();

            return Promise.all([similarRewardProposalProm, lastTopUpProm, numberOfTopUpProm, lastConsumptionProm, lastValidWithdrawalProm]);
        }).then(data => {
            if (!data || !data[0] || !data[1] || !data[3] || !data[4]) {
                return Promise.reject({
                    status: constServerCode.DOCUMENT_NOT_FOUND,
                    message: "Error in finding proposal"
                });
            }
            let rewardProposals = data[0];
            let lastTopUp = data[1][0];
            let numberOfTopUpWithinPeriod = data[2];
            let lastConsumptionRecord = data[3][0];
            let lastWithdrawalProposal = data[4][0];
            // check is last top up used
            let isTopUpUsed = checkTopupRecordIsDirtyForReward(event, {selectedTopup: lastTopUp});

            // big big null check
            if (!event || !event.param || !event.param.rewardParam || !event.param.rewardParam[0] || !event.param.rewardParam[0].value || !event.param.rewardParam[0].value[0] || !event.condition) {
                return Promise.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "Invalid reward event"
                });
            }

            let isReachCountLimit = event.param && event.param.countInRewardInterval && rewardProposals.length > event.param.countInRewardInterval;
            isRewardAmountDynamic = event.condition.isDynamicRewardAmount || isRewardAmountDynamic;

            let isTopUpCountValid = true;
            if (event.condition.topUpCountType && (event.condition.topUpCountType[1] || event.condition.topUpCountType[2])) {
                isTopUpCountValid = false;
                switch(event.condition.topUpCountType[0]) {
                    case "1":
                        if (numberOfTopUpWithinPeriod >= event.condition.topUpCountType[1]) {
                            isTopUpCountValid = true;
                        }
                        break;
                    case "2":
                        if (numberOfTopUpWithinPeriod <= event.condition.topUpCountType[1]) {
                            isTopUpCountValid = true;
                        }
                        break;
                    case "3":
                        if (numberOfTopUpWithinPeriod === event.condition.topUpCountType[1]) {
                            isTopUpCountValid = true;
                        }
                        break;
                    case "4":
                        if (numberOfTopUpWithinPeriod >= event.condition.topUpCountType[1] && numberOfTopUpWithinPeriod < event.condition.topUpCountType[2]) {
                            isTopUpCountValid = true;
                        }
                        break;
                }
            }

            let isTopUpTypeValid = false;
            if (lastTopUp) {
                isTopUpTypeValid = true;
                if(!lastTopUp.userAgent) {
                    lastTopUp.userAgent = "0";
                }

                if (event.condition.userAgent && event.condition.userAgent.length > 0 && event.condition.userAgent.indexOf(lastTopUp.userAgent) === -1) {
                    isTopUpTypeValid = false;
                }

                if (event.condition.topupType && event.condition.topupType.length > 0 && event.condition.topupType.indexOf(lastTopUp.topUpType) === -1) {
                    isTopUpTypeValid = false;
                }

                if (event.condition.onlineTopUpType && lastTopUp.merchantTopUpType && event.condition.onlineTopUpType.length > 0 && event.condition.onlineTopUpType.indexOf(lastTopUp.merchantTopUpType) === -1) {
                    isTopUpTypeValid = false;
                }

                if (event.condition.bankCardType && lastTopUp.bankCardType && event.condition.bankCardType.length > 0 && event.condition.bankCardType.indexOf(lastTopUp.bankCardType) === -1) {
                    isTopUpTypeValid = false;
                }

                if (!event.condition.allowConsumptionAfterTopUp && lastConsumptionRecord && lastTopUp.settlementTime < lastConsumptionRecord.createTime) {
                    isTopUpTypeValid = false;
                }

                if (!event.condition.allowApplyAfterWithdrawal && lastWithdrawalProposal && lastTopUp.createTime < lastWithdrawalProposal.createTime) {
                    isTopUpTypeValid = false;
                }
            }

            let isApplicableRewardCondition = isTopUpTypeValid && isTopUpCountValid && !isReachCountLimit && !isTopUpUsed;

            let paramOfLevel = event.param.rewardParam[0].value;

            if (event.condition.isPlayerLevelDiff && player) {
                let rewardParam = event.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id));
                if (rewardParam && rewardParam[0] && rewardParam[0].value) {
                    paramOfLevel = rewardParam[0].value;
                }
            }

            if (event.param.isSteppingReward) {
                for (let i = 0; i < rewardProposals.length; i++) {
                    let selectedParamIndex = Math.min(i, paramOfLevel.length - 1);
                    let selectedParam = paramOfLevel[selectedParamIndex];

                    addParamToList(selectedParam, 2); // applied
                }

                let nextRewardParamIndex = Math.min(list.length, paramOfLevel.length - 1);
                let nextRewardParam = paramOfLevel[nextRewardParamIndex];

                if (isApplicableRewardCondition && lastTopUp && lastTopUp.amount >= nextRewardParam.minTopUpAmount && !checkTopupRecordIsDirtyForReward(event, {selectedTopup: lastTopUp})) {
                    canApply = true;
                    addParamToList(nextRewardParam, 1); // applicable
                }

                for (let i = list.length; i < paramOfLevel.length; i++) {
                    let selectedParam = paramOfLevel[i];
                    addParamToList(selectedParam, 0); // not applicable
                }
            }
            else {
                let applicableParamIndex = -1;

                console.log('isApplicableRewardCondition', isApplicableRewardCondition);
                console.log('lastTopUp', lastTopUp);

                if (isApplicableRewardCondition && lastTopUp && lastTopUp.amount) {
                    for (let i = 0; i < paramOfLevel.length; i++) {
                        let selectedParam = paramOfLevel[i];
                        if (selectedParam.minTopUpAmount <= lastTopUp.amount) {
                            canApply = true;
                            applicableParamIndex = i;
                        }
                    }
                }

                console.log('applicableParamIndex', applicableParamIndex);
                console.log('paramOfLevel', paramOfLevel);

                for (let i = 0; i < paramOfLevel.length; i++) {
                    let selectedParam = paramOfLevel[i];
                    let status = applicableParamIndex === i ? 1 : 0; // applicable : not applicable
                    addParamToList(selectedParam, status);
                }
            }

            let outputObject = {
                startTime: intervalTime.startTime,
                endTime: intervalTime.endTime,
                list: list
            };

            if (canApply) {
                outputObject.topUpRecordId = lastTopUp._id;
            }

            if (event.param.countInRewardInterval) {
                outputObject.maxApplyTimes = event.param.countInRewardInterval;
                outputObject.appliedTimes = rewardProposals.length;
            }

            return outputObject;
        });
    },

    getRandBonusInfo: (playerId, rewardCode, platformId) => {
        let player, platform, playerLevel, firstProm, event, intervalTime, timeSet;
        let allTimeSet = [];
        let displayTimeSet = [];
        let gradeList = [];
        let Open = [];
        let get = [];
        let giveup = [];
        let bonusList = [];
        let currentTime = new Date();
        let gameProviderGroupName = null;

        // display all period start time for current day in ascending order
        function orderedTimeSet(startTime) {
            let startTimeInt = parseInt(startTime);
            allTimeSet.push(startTimeInt);
            allTimeSet.sort(function(a, b) {return a - b});
            displayTimeSet = allTimeSet.map(time => {
                return ('00' + time).slice(-2).concat(':00');
            });
            timeSet = [...displayTimeSet].join("/");
        }

        // display all reward param for each player level
        function addParamToGradeList(gradeListData, playerLevelData) {
            if (!gradeListData) {
                return false;
            }
            let playerLevelName = null;
            let playerLevelValue = null;

            gradeListData.forEach(gradeListItem => {
                playerLevelData.forEach(playerLevel => {
                    if (playerLevel._id.toString() === gradeListItem.levelId) {
                        playerLevelName = playerLevel.name;
                        playerLevelValue = playerLevel.value;
                    }
                });

                let gradeLists = {
                    gradeId: playerLevelValue,
                    gradeName: playerLevelName, // display in chinese
                    requestDeposit: gradeListItem.value[0].requiredTopUpAmount,
                    requestBetAmount: gradeListItem.value[0].requiredConsumptionAmount,
                    totalChances: gradeListItem.value[0].numberParticipation,
                    bet: gradeListItem.value[0].spendingTimesOnReward
                };
                gradeList.push(gradeLists);
            });
        }

        function addParamToOpen(openData) {
            if (!openData) {
                return false;
            }

            orderedTimeSet(openData.startTime);
            Open.push(openData);
        }

        function addParamToGet(getData) {
            if (!getData) {
                return false;
            }

            get.push(getData);
        }

        function addParamToGiveup(giveupData) {
            if (!giveupData) {
                return false;
            }

            orderedTimeSet(giveupData.startTime);
            giveup.push(giveupData);
        }

        // display all players who applied for random reward within reward interval period
        function addParamToBonusList(bonusListRewardProposals) {
            if (!bonusListRewardProposals) {
                return false;
            }

            for (let z = 0; z < bonusListRewardProposals.length; z++) {
                bonusList[z] = {
                    accountNo: bonusListRewardProposals[z].data.playerName,
                    bonus: bonusListRewardProposals[z].data.rewardAmount,
                    time: bonusListRewardProposals[z].settleTime
                };
            }
        }

        if (playerId) {
            let playerProm = dbConfig.collection_players.findOne({playerId})
                .populate({path: "playerLevel", model: dbConfig.collection_playerLevel})
                .populate({path: "platform", model: dbConfig.collection_platform})
                .lean().then(playerData => {
                    if (!playerData) {
                        return Promise.reject({name: "DataError", message: "Invalid player data"});
                    }

                    player = playerData;
                    platform = playerData.platform;
                    playerLevel = playerData.playerLevel;
                });
            firstProm = playerProm;
        } else {
            let platformProm = dbConfig.collection_platform.findOne({platformId}).lean().then(platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Invalid player data"});
                }

                platform = platformData;
            });
            firstProm = platformProm;
        }

        return firstProm.then(() => {
            return dbRewardEvent.getPlatformRewardEventWithTypeName(platform._id, constRewardType.PLAYER_RANDOM_REWARD_GROUP, rewardCode);
        }).then(eventData => {
            event = eventData;
            if (!event) {
                return Promise.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "Error in getting rewardEvent"
                });
            }

            if (event.validStartTime && event.validStartTime > currentTime || event.validEndTime && event.validEndTime < currentTime) {
                return Promise.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "This reward event is not valid anymore"
                });
            }

            intervalTime = getIntervalPeriodFromEvent(event);

            let similarRewardProposalProm = Promise.resolve([]);
            let similarTopUpProm = Promise.resolve([]);
            let similarConsumptionProposalProm = Promise.resolve([]);
            let bonusListRewardProposalProm = Promise.resolve([]);
            let playerLevelProm = Promise.resolve([]);
            let gameProviderProm = Promise.resolve([]);
            let gameProviderGroupProm = Promise.resolve([]);

            if (!player) {
                return Promise.all([similarRewardProposalProm, similarTopUpProm, similarConsumptionProposalProm, bonusListRewardProposalProm, playerLevelProm, gameProviderProm, gameProviderGroupProm]);
            }

            // queries
            let rewardProposalQuery = {
                "data.platformObjId": platform._id,
                "data.playerObjId": player._id,
                "data.eventId": event._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };
            let topUpRecordQuery = {playerId: player._id};
            let consumptionProposalQuery = {playerId: player._id};
            let bonusListRewardProposalQuery = {
                "data.platformObjId": platform._id,
                "data.eventId": event._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };
            let platformGameProviderQuery = {_id: {$in: platform.gameProviders}};

            // check query is within reward interval period
            if (intervalTime) {
                rewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                topUpRecordQuery.settlementTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                consumptionProposalQuery.insertTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                bonusListRewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).sort({createTime: -1}).lean();
            similarTopUpProm = dbConfig.collection_playerTopUpRecord.find(topUpRecordQuery).sort({createTime: -1}).lean();
            similarConsumptionProposalProm = dbConfig.collection_playerConsumptionRecord.find(consumptionProposalQuery).sort({createTime: -1}).lean();
            bonusListRewardProposalProm = dbConfig.collection_proposal.find(bonusListRewardProposalQuery).sort({createTime: -1}).lean();
            playerLevelProm = dbConfig.collection_playerLevel.find({platform: platform._id}).lean();
            gameProviderProm = dbConfig.collection_gameProvider.find(platformGameProviderQuery).lean();
            gameProviderGroupProm = dbConfig.collection_gameProviderGroup.find({platform: platform._id}).lean();

            return Promise.all([similarRewardProposalProm, similarTopUpProm, similarConsumptionProposalProm, bonusListRewardProposalProm, playerLevelProm, gameProviderProm, gameProviderGroupProm]);
        }).then(data => {
            if (!data || !data[0] || !data[1] || !data[2] || !data[3] || !data[4] || !data[5] || !data[6]) {
                return Promise.reject({
                    status: constServerCode.DOCUMENT_NOT_FOUND,
                    message: "Error in finding proposal"
                });
            }
            let rewardProposals = data[0];
            let topUpRecords = data[1];
            let consumptionProposals = data[2];
            let bonusListRewardProposals = data[3];
            let playerLevelData = data[4];
            let gameProviderList = data[5];
            let gameProviderGroupList = data[6];

            // big big null check
            if (!event || !event.param || !event.param.rewardParam || !event.param.rewardParam[0] || !event.param.rewardParam[0].value || !event.param.rewardParam[0].value[0] || !event.condition) {
                return Promise.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "Invalid reward event"
                });
            }

            let paramOfLevel = event.param.rewardParam[0].value;
            let selectedParam = null;
            let rewardParam = null;
            let consumptionProviderList = [];

            // find param for matching player level
            if (event.condition.isPlayerLevelDiff && player) {
                rewardParam = event.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id));
                if (rewardParam && rewardParam[0] && rewardParam[0].value) {
                    selectedParam = rewardParam[0].value[0];
                }
            } else {
                selectedParam = paramOfLevel[0];
            }

            if (event.condition.rewardAppearPeriod) {
                let todayWeekOfDay = moment(new Date()).tz('Asia/Singapore').day();
                let dayOfHour = moment(new Date()).tz('Asia/Singapore').hours();

                let openData, getData, giveupData;
                let totalValidTopup = 0;
                let totalAvailableTopup = 0;
                let totalValidConsumption = 0;
                let openID = 0;
                let getID = 0;
                let giveupID = 0;

                // find availableDeposit // total top up amount that is valid and still unused to apply reward
                for (let w = 0; w < topUpRecords.length; w++) {
                    if (topUpRecords[w].amount >= selectedParam.requiredTopUpAmount && topUpRecords[w].bDirty === false) {
                        totalValidTopup += topUpRecords[w].amount;
                    }
                }

                // find availableDepositTimes // total number of valid top up that is still unused or available to apply reward
                for (let x = 0; x < topUpRecords.length; x++) {
                    if (topUpRecords[x].amount >= selectedParam.requiredTopUpAmount && topUpRecords[x].bDirty === false) {
                        totalAvailableTopup++;
                    }
                }

                // find availableBetAmount // total consumption amount that is valid
                for (let y = 0; y < consumptionProposals.length; y++) {
                    if (consumptionProposals[y].amount >= selectedParam.requiredConsumptionAmount) {
                        totalValidConsumption += consumptionProposals[y].amount;
                    }
                }

                // find betSource // display consumption provider name in chinese
                if (event.condition.consumptionProvider.length === gameProviderList.length) {
                    consumptionProviderList = "所有平台";
                } else {
                    event.condition.consumptionProvider.forEach(consumptionProvider => {
                        gameProviderList.forEach(gameProvider => {
                            if (gameProvider._id.toString() === consumptionProvider) {
                                consumptionProviderList.push(gameProvider.name);
                            }
                        })
                    })
                }

                // find lockedGroup // display gameProviderGroup name in chinese
                if (event.condition.providerGroup) {
                    gameProviderGroupList.forEach(gameProviderGroup => {
                        if (gameProviderGroup._id.toString() === event.condition.providerGroup) {
                            gameProviderGroupName = gameProviderGroup.name;
                        }
                    });
                }

                if (event.param.rewardParam) {
                    addParamToGradeList(event.param.rewardParam, playerLevelData);
                }

                event.condition.rewardAppearPeriod.forEach(appearPeriod => {
                    // status 0 - reward event not yet started, countdown to start time
                    if (appearPeriod.startDate == todayWeekOfDay && appearPeriod.startTime > dayOfHour && appearPeriod.endTime > dayOfHour) {
                        openID++;
                        openID = ('000' + openID).slice(-3);

                        let startTimeInt = parseInt(appearPeriod.startTime);
                        let startTimeSetHours = currentTime.setHours(startTimeInt,0,0);
                        let countdownToStartTime = parseInt((startTimeSetHours - new Date().getTime()) / 1000);

                        let eventStartTime = ('00' + appearPeriod.startTime).slice(-2).concat(':00');
                        let eventEndTime = ('00' + appearPeriod.endTime).slice(-2).concat(':00');

                        openData = {
                            id: openID,
                            startTime: eventStartTime,
                            endTime: eventEndTime,
                            timeLeft: countdownToStartTime,
                            status: 0,
                            condition: {
                                availableDeposit: totalValidTopup,
                                availableDepositTimes: totalAvailableTopup,
                                betSource: consumptionProviderList,
                                availableBetAmount: totalValidConsumption,
                                availableChances: selectedParam.numberParticipation - rewardProposals.length,
                                usedChances: rewardProposals.length,
                                depositDevice: event.condition.userAgent,
                                depositType: event.condition.topupType,
                                onlineTopupType: event.condition.onlineTopUpType,
                                bankCardType: event.condition.bankCardType
                            }
                        };
                        addParamToOpen(openData);
                    }

                    // status 1 - reward event started
                    if (appearPeriod.startDate == todayWeekOfDay && appearPeriod.startTime <= dayOfHour && appearPeriod.endTime > dayOfHour) {
                        openID++;
                        openID = ('000' + openID).slice(-3);

                        let eventStartTime = ('00' + appearPeriod.startTime).slice(-2).concat(':00');
                        let eventEndTime = ('00' + appearPeriod.endTime).slice(-2).concat(':00');

                        openData = {
                            id: openID,
                            startTime: eventStartTime,
                            endTime: eventEndTime,
                            status: 1,
                            condition: {
                                availableDeposit: totalValidTopup,
                                availableDepositTimes: totalAvailableTopup,
                                betSource: consumptionProviderList,
                                availableBetAmount: totalValidConsumption,
                                availableChances: selectedParam.numberParticipation - rewardProposals.length,
                                usedChances: rewardProposals.length,
                                depositDevice: event.condition.userAgent,
                                depositType: event.condition.topupType,
                                onlineTopupType: event.condition.onlineTopUpType,
                                bankCardType: event.condition.bankCardType
                            }
                        };
                        addParamToOpen(openData);
                    }

                    // status 2 - display already applied reward, within reward interval period (daily)
                    if (appearPeriod.startDate == todayWeekOfDay && appearPeriod.startTime <= dayOfHour) { // same day and event already started
                        let isValidGet = false;
                        let listValidRewardAmount = [];

                        for (let z = 0; z < rewardProposals.length; z++) {
                            let showRewardPeriod = rewardProposals[z].data.rewardAppearPeriod;

                            // if found matching proposal, display getData; player already applied reward during this period
                            if (appearPeriod.startTime === showRewardPeriod.startTime && appearPeriod.endTime === showRewardPeriod.endTime) {
                                let listAmount = rewardProposals[z].data.rewardAmount;
                                listValidRewardAmount.push(listAmount);
                                isValidGet = true;
                            }
                        }

                        if (isValidGet) {
                            getID++;
                            getID = ('000' + getID).slice(-3);

                            let eventStartTime = ('00' + appearPeriod.startTime).slice(-2).concat(':00');
                            let eventEndTime = ('00' + appearPeriod.endTime).slice(-2).concat(':00');

                            getData = {
                                id: getID,
                                startTime: eventStartTime,
                                endTime: eventEndTime,
                                status: 2,
                                amountList: listValidRewardAmount,
                                condition: {
                                    availableDeposit: totalValidTopup,
                                    availableDepositTimes: totalAvailableTopup,
                                    betSource: consumptionProviderList,
                                    availableBetAmount: totalValidConsumption,
                                    availableChances: selectedParam.numberParticipation - rewardProposals.length,
                                    usedChances: rewardProposals.length,
                                    depositDevice: event.condition.userAgent,
                                    depositType: event.condition.topupType,
                                    onlineTopupType: event.condition.onlineTopUpType,
                                    bankCardType: event.condition.bankCardType
                                }
                            };
                            addParamToGet(getData);
                        }
                    }

                    // status 3 - display reward event did not apply, event already ended
                    if (appearPeriod.startDate == todayWeekOfDay && appearPeriod.startTime < dayOfHour && appearPeriod.endTime < dayOfHour) { // same day and event already ended
                        let isValidGiveup = true;

                        for (let z = 0; z < rewardProposals.length; z++) {
                            let showRewardPeriod = rewardProposals[z].data.rewardAppearPeriod;

                            // if found matching proposal, don't display; player already applied reward during this period
                            if (appearPeriod.startTime === showRewardPeriod.startTime && appearPeriod.endTime === showRewardPeriod.endTime) {
                                isValidGiveup = false;
                            }
                        }

                        if (isValidGiveup) {
                            giveupID++;
                            giveupID = ('000' + giveupID).slice(-3);

                            let eventStartTime = ('00' + appearPeriod.startTime).slice(-2).concat(':00');
                            let eventEndTime = ('00' + appearPeriod.endTime).slice(-2).concat(':00');

                            giveupData = {
                                id: giveupID,
                                startTime: eventStartTime,
                                endTime: eventEndTime,
                                status: 3,
                                condition: {
                                    availableDeposit: totalValidTopup,
                                    availableDepositTimes: totalAvailableTopup,
                                    betSource: consumptionProviderList,
                                    availableBetAmount: totalValidConsumption,
                                    availableChances: selectedParam.numberParticipation - rewardProposals.length,
                                    usedChances: rewardProposals.length,
                                    depositDevice: event.condition.userAgent,
                                    depositType: event.condition.topupType,
                                    onlineTopupType: event.condition.onlineTopUpType,
                                    bankCardType: event.condition.bankCardType
                                }
                            };
                            addParamToGiveup(giveupData);
                        }
                    }
                });
            }

            if (bonusListRewardProposals) {
                addParamToBonusList(bonusListRewardProposals);
            }

            let outputObject = {
                lockedGroup: gameProviderGroupName,
                currentGradeId: playerLevel.value,
                currentGradeName: playerLevel.name,
                time: timeSet,
                gradeList: gradeList,
                open: Open,
                get: get,
                giveup: giveup,
                bonusList: bonusList
            };
            return outputObject;
        });
    },

    getPlayerConsumptionSlipRewardDetail: (rewardData, playerId, code, applyTargetTime, isBulkApply, isFrontEndCheck) => {
        // reward event code is an optional value, getting the latest relevant event by default
        let currentTime = applyTargetTime || new Date();
        let today = applyTargetTime ? dbUtility.getDayTime(applyTargetTime) : dbUtility.getTodaySGTime();
        let platformId = null;
        let player, event, selectedParam, intervalTime, paramOfLevel, similarProposalCount = 0;
        let outputList = [];
        let unusedList = [];
        let applyList = [];
        let result = {};
        let bypassDirtyEvent;
        let totalTopUpAmount = 0;
        let usedTopUpRecord = [];

        return dbConfig.collection_players.findOne({playerId: playerId}).lean().then(data => {
            //get player's platform reward event data
            if (data && data.playerLevel) {

                player = data;
                platformId = player.platform;

                return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP, code);
            }
            else {
                return Q.reject({name: "DataError", message: "Invalid player data"});
            }
        }).then(eventData => {
            event = eventData;

            // check if reward valid for targetDate
            if (event.validStartTime && event.validStartTime > currentTime || event.validEndTime && event.validEndTime < currentTime) {
                return Q.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "This reward event is not valid anymore"
                });
            }

            intervalTime = getIntervalPeriodFromEvent(event, applyTargetTime);

            let similarRewardProposalCount = 0;

            if (!player) {
                return similarRewardProposalCount;
            }

            let rewardProposalQuery = {
                "data.platformObjId": player.platform,
                "data.playerObjId": player._id,
                "data.eventId": event._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };

            if (!intervalTime) {
                return Promise.reject({
                    name: "DataError",
                    message: "Interval time is not found"
                })
            } else {
                rewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                // if isBulkApply, the successful proposal's settleTime will be at the current moment, which has to be considered in the searching range
                // this can prevent redundant reawrd proposal being generated
                if (isBulkApply){
                    rewardProposalQuery.settleTime.$lt = dbUtility.getTodaySGTime().endTime;
                }
                similarRewardProposalCount = dbConfig.collection_proposal.find(rewardProposalQuery).lean().count();
            }

            return similarRewardProposalCount;
        }).then(proposalCount => {

            similarProposalCount = proposalCount;

            return dbConfig.collection_playerTopUpRecord.aggregate({
                $match: {
                    playerId: player._id,
                    createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime},
                }
            },
            {
                $group: {
                    _id: "$playerId",
                    amountSum: {$sum: "$amount"},

                }
            })

        }).then(
            playerTopUpRecord => {

                if (playerTopUpRecord && playerTopUpRecord[0] && playerTopUpRecord[0].amountSum){
                    totalTopUpAmount = playerTopUpRecord[0].amountSum;

                }

                let searchQuery = {
                    platformObjId: ObjectId(player.platform),
                    rewardEventObjId: ObjectId(event._id),
                    playerObjId: ObjectId(player._id),
                    consumptionCreateTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime},
                    isUsed: false,
                };

                let sortCol = rewardData.sortCol || {consumptionCreateTime: -1};
                let index = rewardData.index || 0;
                let limit = rewardData.limit || 100;

                let consumptionSlipRewardGroupProm = Promise.resolve([]);
                let consumptionSlipRewardGroupTotalCountProm = Promise.resolve(0);

                if (rewardData.appliedRewardList && rewardData.appliedRewardList.length) {
                    consumptionSlipRewardGroupProm = dbConfig.collection_playerConsumptionSlipRewardGroupRecord.find({_id: {$in: rewardData.appliedRewardList}, isUsed: false}).lean();
                }
                else if (isFrontEndCheck){

                    consumptionSlipRewardGroupProm = dbConfig.collection_playerConsumptionSlipRewardGroupRecord.find(searchQuery).sort(sortCol).populate({path: "gameProvider", model: dbConfig.collection_gameProvider}).lean();
                    consumptionSlipRewardGroupTotalCountProm = dbConfig.collection_playerConsumptionSlipRewardGroupRecord.find(searchQuery).lean().count();
                }
                else{
                    searchQuery.$or = [ {'condition.requiredTopUpAmount': {$gte: 0, $lte: totalTopUpAmount} }, {'condition.requiredTopUpAmount': {$exists: false}}, {'condition.requiredTopUpAmount': null}];
                    consumptionSlipRewardGroupProm = dbConfig.collection_playerConsumptionSlipRewardGroupRecord.find(searchQuery).sort(sortCol).skip(index).limit(limit).populate({path: "gameProvider", model: dbConfig.collection_gameProvider}).lean();
                    consumptionSlipRewardGroupTotalCountProm = dbConfig.collection_playerConsumptionSlipRewardGroupRecord.find(searchQuery).lean().count();
                }

                return Promise.all([consumptionSlipRewardGroupProm, consumptionSlipRewardGroupTotalCountProm])

            }).then(
                retData => {

                if (retData && retData.length) {

                    let consumptionSlipRecord = retData[0];
                    let totalCount = retData[1];

                    // if there is appliedRewardList, it is applying the reward, not preview
                    if (rewardData.appliedRewardList && rewardData.appliedRewardList.length){
                        let retList = [];

                        if (consumptionSlipRecord && consumptionSlipRecord.length){
                            consumptionSlipRecord.forEach(
                                record => {

                                    for (let i = 0; i < record.condition.length; i++){

                                        if (record.condition[i] && record.condition[i].hasOwnProperty('requiredTopUpAmount') && totalTopUpAmount >= record.condition[i].requiredTopUpAmount || 0){
                                            let selectedCondition = record.condition[i];

                                            for (let key of Object.keys(selectedCondition)){
                                                record[key] = selectedCondition[key];
                                            }
                                            // record.targetDate = intervalTime;
                                            retList.push(record);
                                            break;
                                        }
                                    }
                                }
                            )
                        }
                        return {
                            availableQuantity: event.condition && event.condition.countInRewardInterval ? event.condition.countInRewardInterval : 1,
                            appliedCount: similarProposalCount,
                            list: retList,
                        }
                    }

                    // filter again the rewardEvent with the topUpAmount of the interval
                    if (consumptionSlipRecord && consumptionSlipRecord.length) {
                        // check if is called from front-end
                        if (isFrontEndCheck){
                            consumptionSlipRecord.forEach(

                                record => {

                                    if (record.condition) {

                                        for (let i = 0; i < record.condition.length; i++) {

                                            let selectedCondition = record.condition[i];

                                            if (record.condition[i] && record.condition[i].requiredTopUpAmount && totalTopUpAmount >= record.condition[i].requiredTopUpAmount) {

                                                for (let key of Object.keys(selectedCondition)){
                                                    record[key] = selectedCondition[key];
                                                }
                                                outputList.push(record);
                                                break;
                                            }
                                            else if (!record.condition[i].requiredTopUpAmount) {

                                                for (let key of Object.keys(selectedCondition)){
                                                    record[key] = selectedCondition[key];
                                                }
                                                applyList.push(record);
                                                break;
                                            }
                                            else if (i == record.condition.length - 1) {

                                                for (let key of Object.keys(selectedCondition)){
                                                    record[key] = selectedCondition[key];
                                                }

                                                unusedList.push(record);
                                            }
                                        }

                                    }
                                }
                            )

                            result = {
                                availableQuantity: event.condition && event.condition.countInRewardInterval ? event.condition.countInRewardInterval : 1,
                                appliedCount: similarProposalCount,
                                topUpAmountInterval: totalTopUpAmount,
                                list: outputList,
                                applyList: applyList,
                                unusedList: unusedList,
                            }

                        }
                        else{
                            consumptionSlipRecord.forEach(

                                record => {

                                   if (record && record.condition){
                                       for (let i = 0; i < record.condition.length; i++){
                                           if (record.condition[i] && record.condition[i].hasOwnProperty('requiredTopUpAmount') && totalTopUpAmount >= record.condition[i].requiredTopUpAmount|| 0){
                                               let selectedCondition = record.condition[i];

                                               for (let key of Object.keys(selectedCondition)){
                                                   record[key] = selectedCondition[key];
                                               }
                                               outputList.push(record);
                                               break;
                                           }
                                       }
                                   }

                                }
                            )

                            result = {
                                availableQuantity: event.condition && event.condition.countInRewardInterval ? event.condition.countInRewardInterval : 1,
                                appliedCount: similarProposalCount,
                                topUpAmountInterval: totalTopUpAmount,
                                list: outputList,
                                size: totalCount
                            }
                        }

                    }

                }

                return result
            }
        )

    },

    //isCheckToday only for getRewardApplicationData, to check today consecutive reward only
    getPlayerConsecutiveRewardDetail: (playerId, code, isApply, platform, applyTargetTime, isCheckToday, isBulkApply) => {
        // reward event code is an optional value, getting the latest relevant event by default
        let currentTime = applyTargetTime || new Date();
        let today = applyTargetTime ? dbUtility.getDayTime(applyTargetTime) : dbUtility.getTodaySGTime();
        let platformId = null;
        let player, event, selectedParam, intervalTime, paramOfLevel;
        let outputList = [];
        let playerProm = dbConfig.collection_players.findOne({playerId: playerId})
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();
        let platformProm = dbConfig.collection_platform.findOne({platformId: platform}).lean();
        let firstProm;
        if (playerId) {
            firstProm = playerProm;
        } else {
            firstProm = platformProm;
        }
        let requiredDeposit = 0;
        let numberOfParam = 1;
        let consecutiveNumber = 1;
        let requiredBet = 0;
        let requireBoth = false;
        let isSharedWithXIMA = false;
        let forbidWithdrawIfBalanceAfterUnlock = 0;
        let lastConsumption;

        function insertOutputList(status, step, bonus, requestedTimes, targetDate, forbidWithdrawAfterApply, remark, isSharedWithXIMA, meetRequirement, requiredConsumptionMet, requiredTopUpMet, usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock, spendingAmount) {
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
                listItem.forbidWithdrawIfBalanceAfterUnlock = forbidWithdrawIfBalanceAfterUnlock;
                if (spendingAmount){
                    listItem.spendingAmount = spendingAmount;
                }
            }

            outputList.push(listItem);
        }

        return firstProm.then(data => {
            //get player's platform reward event data
            if (data) {
                if (data.playerLevel) {
                    // when first prom is player
                    player = data;
                    platformId = player.platform;
                }

                if (data.platformId) {
                    // when first prom is platform
                    platformId = data._id
                }

                //get reward event data
                return dbRewardEvent.getPlatformRewardEventWithTypeName(platformId, constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP, code);
            }
            else {
                return Q.reject({name: "DataError", message: "Invalid player data"});
            }
        }).then(eventData => {
            event = eventData;

            isSharedWithXIMA = Boolean(event && event.condition && event.condition.isSharedWithXIMA);

            // let currentTime = new Date();
            // check if reward valid for targetDate
            if (event.validStartTime && event.validStartTime > currentTime || event.validEndTime && event.validEndTime < currentTime) {
                return Q.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "This reward event is not valid anymore"
                });
            }

            intervalTime = getIntervalPeriodFromEvent(event, applyTargetTime);

            let similarRewardProposalProm = Promise.resolve([]);

            if (!player) {
                return similarRewardProposalProm;
            }

            let rewardProposalQuery = {
                "data.platformObjId": player.platform,
                "data.playerObjId": player._id,
                "data.eventId": event._id,
                status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };

            if (!intervalTime) {
                // get last similar reward proposal
                similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).sort({"data.consecutiveNumber": -1, createTime: -1}).limit(1).lean();
            } else {
                rewardProposalQuery.settleTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).sort({"data.consecutiveNumber": -1, createTime: -1}).lean();
            }

            if(player.playerLevel && player.playerLevel._id && event && event.param && event.param.rewardParam && event.param.rewardParam.length > 0 ){
                event.param.rewardParam.forEach(param => {
                    if(param && param.levelId == player.playerLevel._id && param.value && param.value.length > 0){
                        forbidWithdrawIfBalanceAfterUnlock = param.value[0].forbidWithdrawIfBalanceAfterUnlock || 0;
                    }
                })
            }

            return similarRewardProposalProm;
        }).then(rewardProposalData => {

            requiredDeposit = event.param.requiredTopUpAmount;
            requiredBet = event.param.requiredConsumptionAmount;
            requireBoth = event.param.operatorOption;
            let startCheckTime, latestRewardProposal;
            paramOfLevel = event.param.rewardParam[0].value;

            if (event.condition.isPlayerLevelDiff && player) {
                let rewardParam = event.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id));
                if (rewardParam && rewardParam[0] && rewardParam[0].value) {
                    paramOfLevel = rewardParam[0].value;
                }
            }

            if (event.param.isMultiStepReward) {
                numberOfParam = paramOfLevel.length; // number of step
            }

            if (isCheckToday) {
                startCheckTime = today.startTime;
            } else {
                startCheckTime = event.validStartTime > intervalTime.startTime ? event.validStartTime : intervalTime.startTime;
                // if bulkApply, ignore the lastReward data as it should not be taken into consideration of the next cycle
                if (!isBulkApply && rewardProposalData && rewardProposalData.length ){
                        latestRewardProposal = rewardProposalData[0];
                        let lastRewardDate = dbUtility.getTargetSGTime(latestRewardProposal.data.applyTargetDate).startTime;
                        let nextDay = lastRewardDate.setDate(lastRewardDate.getDate() + 1);
                        startCheckTime = nextDay;
                        consecutiveNumber = latestRewardProposal.data.consecutiveNumber + 1;
                }
                // if (!rewardProposalData || rewardProposalData.length === 0) {
                //     startCheckTime = event.validStartTime > intervalTime.startTime ? event.validStartTime : intervalTime.startTime;
                // } else {
                //     latestRewardProposal = rewardProposalData[0];
                //     let lastRewardDate = dbUtility.getTargetSGTime(latestRewardProposal.data.applyTargetDate).startTime;
                //     let nextDay = lastRewardDate.setDate(lastRewardDate.getDate() + 1);
                //     startCheckTime = nextDay;
                //     consecutiveNumber = latestRewardProposal.data.consecutiveNumber + 1;
                // }
            }

            selectedParam = paramOfLevel[Math.min(consecutiveNumber - 1, paramOfLevel.length - 1)];

            if (consecutiveNumber !== 1) {
                for (let i = 0; i < consecutiveNumber - 1; i++) {
                    let bonus = paramOfLevel[i].rewardAmount;
                    let requestedTimes = paramOfLevel[i].spendingTimes || 1;

                    insertOutputList(2, i + 1, bonus, requestedTimes);
                }
            }

            let checkRequirementMeetProms = [];

            // let today = dbUtility.getTodaySGTime();
            let currentDay = dbUtility.getTargetSGTime(startCheckTime);

            while (currentDay.startTime <= today.startTime && player) {
                checkRequirementMeetProms.push(isDayMeetRequirement(event, player, currentDay, requiredBet, requiredDeposit, requireBoth, isCheckToday));
                currentDay = dbUtility.getTargetSGTime(currentDay.endTime);
            }

            // add in for dynamic case
            let consumptionIntervalProm;
            let topUpIntervalProm;
            if (event.condition.isDynamicRewardAmount){
                consumptionIntervalProm = dbConfig.collection_playerConsumptionRecord.aggregate([
                    {$match:
                        {
                            playerId: player._id,
                            createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime},
                            providerId: {$in: event.condition.consumptionProvider}

                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: {$sum: "$validAmount"}
                        }
                    }
                ]);

                topUpIntervalProm = dbConfig.collection_playerTopUpRecord.find({
                    playerId: player._id,
                    createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime},
                }).lean();

            }
            else{
                consumptionIntervalProm = Promise.resolve([]);
                topUpIntervalProm = Promise.resolve([]);
            }

            let lastConsumptionProm = Promise.resolve([]);

            if (player && player._id) {
                let consumptionQuery = {
                    platformId: ObjectId(platformId),
                    playerId: player._id,
                    createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime}
                };

                lastConsumptionProm = dbConfig.collection_playerConsumptionRecord.find(consumptionQuery).sort({createTime: -1}).limit(1).lean();
            }

            return Promise.all([Promise.all(checkRequirementMeetProms), consumptionIntervalProm, topUpIntervalProm, lastConsumptionProm]);
        }).then(checkAllResults => {
            if (checkAllResults && checkAllResults.length > 0) {

                let checkResults = checkAllResults[0];
                let consumptionResults = checkAllResults[1];
                let topUpResults = checkAllResults[2];
                lastConsumption = checkAllResults[3] && checkAllResults[3][0] ? checkAllResults[3][0] : null;

                console.log("yH checking-- checkResults", checkResults)

                let consumptionAmount = 0;
                let totalTopUpAmount = 0;
                let usedTopUpRecord = [];
                if (event.condition.isDynamicRewardAmount){
                    consumptionAmount = (consumptionResults && consumptionResults[0] && consumptionResults[0].total) ? consumptionResults[0].total : 0;
                    let bypassDirtyEvent;

                    if (event.condition.ignoreAllTopUpDirtyCheckForReward && event.condition.ignoreAllTopUpDirtyCheckForReward.length > 0) {
                        bypassDirtyEvent = event.condition.ignoreAllTopUpDirtyCheckForReward;
                        for (let a = 0; a  < bypassDirtyEvent.length; a++) {
                            bypassDirtyEvent[a] = bypassDirtyEvent[a].toString();
                        }
                    }

                    for (let i = 0; i < topUpResults.length; i++) {
                        let record = topUpResults[i];
                        if (bypassDirtyEvent) {
                            let isSubset = record.usedEvent.every(event => {
                                return bypassDirtyEvent.indexOf(event.toString()) > -1;
                            });
                            if (!isSubset)
                                continue;
                        } else {
                            if (record.bDirty)
                                continue;
                        }

                        totalTopUpAmount += record.amount;
                        usedTopUpRecord.push(record._id)
                    }
                }

                if (checkResults.length === 1) {
                    let result = checkResults[0];
                    if (result.meetRequirement) {

                        if (event.condition.isDynamicRewardAmount){

                            if(consumptionAmount >= selectedParam.totalConsumptionInInterval){
                                let bonus = result.topUpDayAmount * selectedParam.rewardPercentage;
                                let requestedTimes =  selectedParam.hasOwnProperty('spendingTimes') ? selectedParam.spendingTimes : 1;

                                bonus = checkRewardBonusLimit(bonus, event, selectedParam.maxRewardInSingleTopUp);

                                let spendingAmount = (bonus + (result.actualAmount || result.topUpDayAmount)) * requestedTimes;
                                insertOutputList(1, consecutiveNumber, bonus, requestedTimes, result.targetDate,
                                    selectedParam.forbidWithdrawAfterApply, selectedParam.remark, isSharedWithXIMA,
                                    result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock, spendingAmount);
                            }

                        }
                        else {

                            let bonus = selectedParam.rewardAmount;
                            let requestedTimes = selectedParam.spendingTimes || 1;

                            insertOutputList(1, consecutiveNumber, bonus, requestedTimes, result.targetDate,
                                selectedParam.forbidWithdrawAfterApply, selectedParam.remark, isSharedWithXIMA,
                                result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock);
                        }
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

                        if (event.condition.isDynamicRewardAmount){
                            for (let i = consecutiveNumber - 1; i < currentMaxStreak; i++) {
                                let currentParamNo = Math.min(i, numberOfParam - 1);
                                let step = i + 1;
                                let result = maxStreakDetail[i - (consecutiveNumber - 1)];
                                let targetDate = result.targetDate;
                                let currentParam = paramOfLevel[currentParamNo];
                                let topupAmount = result.topUpDayAmount;
                                if (event.condition.applyType == 3){
                                    // special handing for Settlement case - JBL
                                    topupAmount = totalTopUpAmount;
                                }

                                if(consumptionAmount >= currentParam.totalConsumptionInInterval) {
                                    let bonus = topupAmount* currentParam.rewardPercentage;
                                    bonus = checkRewardBonusLimit(bonus, event, currentParam.maxRewardInSingleTopUp);
                                    let requestedTimes = currentParam.hasOwnProperty('spendingTimes') ? currentParam.spendingTimes : 1;
                                    let spendingAmount = (bonus + topupAmount) * requestedTimes;

                                    insertOutputList(1, step, bonus, requestedTimes, targetDate,
                                        currentParam.forbidWithdrawAfterApply, currentParam.remark, isSharedWithXIMA,
                                        result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock, spendingAmount);
                                }
                            }
                        }else {
                            for (let i = consecutiveNumber - 1; i < currentMaxStreak; i++) {
                                let currentParamNo = Math.min(i, numberOfParam - 1);
                                let step = i + 1;
                                let currentParam = paramOfLevel[currentParamNo];
                                let bonus = currentParam.rewardAmount;
                                let result = maxStreakDetail[i - (consecutiveNumber - 1)];
                                let targetDate = result.targetDate;
                                let requestedTimes = currentParam.spendingTimes || 1;

                                insertOutputList(1, step, bonus, requestedTimes, targetDate,
                                    currentParam.forbidWithdrawAfterApply, currentParam.remark, isSharedWithXIMA,
                                    result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock);
                            }
                        }
                    } else if (event.condition.requireNonBreakingCombo) {
                        // restart combo check trace back from today, if today's combo check is higher than consecutiveNumber, allow apply for today only
                        let currentStreak = 0;
                        let streakFromPastApplied = true;
                        let result = checkResults[checkResults.length - 1]
                        let targetDate = result.targetDate;

                        for (let i = checkResults.length - 1; i >= 0; i--) {
                            let result = checkResults[i];

                            if (result.meetRequirement) {
                                currentStreak++;
                            } else {
                                streakFromPastApplied = false;
                                break;
                            }
                        }

                        if (event.condition.isDynamicRewardAmount){
                            let currentParamNo = Math.min(currentStreak-1, numberOfParam - 1);
                            let currentParam = paramOfLevel[currentParamNo];
                            if ((streakFromPastApplied || currentStreak >= consecutiveNumber) && consumptionAmount >= currentParam.totalConsumptionInInterval) {
                                let bonus = totalTopUpAmount * currentParam.rewardPercentage;
                                bonus = checkRewardBonusLimit(bonus, event, currentParam.maxRewardInSingleTopUp);
                                let requestedTimes = currentParam.hasOwnProperty('spendingTimes') ? currentParam.spendingTimes : 1;
                                let spendingAmount = (bonus + totalTopUpAmount) * requestedTimes;
                                insertOutputList(1, consecutiveNumber, bonus, requestedTimes, targetDate,
                                    currentParam.forbidWithdrawAfterApply, currentParam.remark, isSharedWithXIMA,
                                   result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock, spendingAmount);
                            }
                        }
                        else{
                           let requestedTimes = selectedParam.spendingTimes || 1;
                           if (streakFromPastApplied || currentStreak >= consecutiveNumber) {
                               let bonus = selectedParam.rewardAmount;

                               insertOutputList(1, consecutiveNumber, bonus, requestedTimes, targetDate,
                                   selectedParam.forbidWithdrawAfterApply, selectedParam.remark, isSharedWithXIMA,
                                   result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock);
                           }
                        }

                    } else if (event.condition.allowReclaimMissedRewardDay) {
                        // trace back toward start check date and see how many can be apply, assign accordingly
                        let currentStreak = consecutiveNumber - 1;

                        if (event.condition.isDynamicRewardAmount){
                            for (let i = 0; i < checkResults.length; i++) {
                                let result = checkResults[i];
                                if (result.meetRequirement) {

                                    let currentParamNo = Math.min(currentStreak, numberOfParam - 1);
                                    let currentParam = paramOfLevel[currentParamNo];
                                    if(consumptionAmount >= currentParam.totalConsumptionInInterval) {
                                        let bonus = result.topUpDayAmount * currentParam.rewardPercentage;
                                        bonus = checkRewardBonusLimit(bonus, event, currentParam.maxRewardInSingleTopUp);
                                        let requestedTimes = currentParam.hasOwnProperty('spendingTimes') ? currentParam.spendingTimes : 1;
                                        let spendingAmount = (bonus + result.topUpDayAmount) * requestedTimes;

                                        insertOutputList(1, currentStreak + 1, bonus, requestedTimes, result.targetDate,
                                            currentParam.forbidWithdrawAfterApply, currentParam.remark, isSharedWithXIMA,
                                            result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock, spendingAmount);
                                        currentStreak++;
                                    }
                                }
                            }
                        }
                        else{
                            for (let i = 0; i < checkResults.length; i++) {
                                let result = checkResults[i];
                                if (result.meetRequirement) {
                                    let currentParamNo = Math.min(currentStreak, numberOfParam - 1);
                                    let currentParam = paramOfLevel[currentParamNo];
                                    let bonus = currentParam.rewardAmount;
                                    let requestedTimes = currentParam.spendingTimes || 1;

                                    insertOutputList(1, currentStreak + 1, bonus, requestedTimes, result.targetDate,
                                        currentParam.forbidWithdrawAfterApply, currentParam.remark, isSharedWithXIMA,
                                        result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock);
                                    currentStreak++;
                                }
                            }
                        }

                    } else {
                        // check today only, if requirement met, allow apply for today
                        let result = checkResults[checkResults.length - 1];
                        if (result.meetRequirement) {
                            if (event.condition.isDynamicRewardAmount){
                                if(consumptionAmount >= selectedParam.totalConsumptionInInterval) {
                                    let bonus = result.topUpDayAmount * selectedParam.rewardPercentage;
                                    bonus = checkRewardBonusLimit(bonus, event, selectedParam.maxRewardInSingleTopUp);
                                    let requestedTimes = selectedParam.hasOwnProperty('spendingTimes') ? selectedParam.spendingTimes : 1;
                                    let spendingAmount = (bonus + result.topUpDayAmount) * requestedTimes;

                                    insertOutputList(1, consecutiveNumber, bonus, requestedTimes, result.targetDate,
                                        selectedParam.forbidWithdrawAfterApply, selectedParam.remark, isSharedWithXIMA,
                                        result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock, spendingAmount);
                                }
                            }
                            else{
                                let bonus = selectedParam.rewardAmount;
                                let requestedTimes = selectedParam.spendingTimes || 1;

                                insertOutputList(1, consecutiveNumber, bonus, requestedTimes, result.targetDate,
                                    selectedParam.forbidWithdrawAfterApply, selectedParam.remark, isSharedWithXIMA,
                                    result.meetRequirement, result.requiredConsumptionMet, result.requiredTopUpMet, result.usedTopUpRecord, forbidWithdrawIfBalanceAfterUnlock);
                            }

                        }
                    }
                }
            }

            // // for not dynamic case
            // if (!event.condition.isDynamicRewardAmount) {
            for (let i = outputList.length; i < paramOfLevel.length; i++) {
                let bonus = paramOfLevel[i].rewardAmount;
                let requestedTimes = paramOfLevel[i].spendingTimes || 1;

                insertOutputList(0, i + 1, bonus, requestedTimes);
            }
            // }

            if (isCheckToday) {
                return {
                    startTime: event.validStartTime,
                    endTime: event.validEndTime,
                    deposit: event.param.requiredTopUpAmount,
                    effectiveBet: event.param.requiredConsumptionAmount,
                    checkResult: checkAllResults[0],
                    list: outputList[0],
                    lastConsumptionDetail: lastConsumption
                }
            }

            return {
                startTime: event.validStartTime,
                endTime: event.validEndTime,
                deposit: event.param.requiredTopUpAmount,
                effectiveBet: event.param.requiredConsumptionAmount,
                list: outputList,
                lastConsumptionDetail: lastConsumption
            }
        });

        function checkRewardBonusLimit(bonus, event, maxRewardInSingleTopUp){
            if ( bonus && event && event.param && !isNaN(parseInt(event.param.dailyMaxRewardAmount)) && !isNaN(parseInt(maxRewardInSingleTopUp)) ) {
                if (bonus > maxRewardInSingleTopUp) {
                    bonus = maxRewardInSingleTopUp;
                }

                if (bonus > event.param.dailyMaxRewardAmount) {
                    bonus = event.param.dailyMaxRewardAmount;
                }
            }
            return bonus
        }

        function isDayMeetRequirement(event, playerData, targetDate, requiredConsumptionAmount, requiredTopUpAmount, operatorOption, isCheckToday) {
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

            // if (!event.condition.isSharedWithXIMA) {
            //     consumptionSumQuery.bDirty = false;
            // }

            let consumptionProm = dbConfig.collection_playerConsumptionRecord.aggregate([
                {$match: consumptionSumQuery},
                {
                    $group: {
                        _id: null,
                        total: {$sum: "$validAmount"}
                    }
                }
            ]);

            return Promise.all([topUpProm, consumptionProm]).then(data => {
                let topUpRecords = data[0];
                let consumptionData = data[1];

                console.log('riccoDebug - 1223', topUpRecords, consumptionData);

                let consumptionAmount = (consumptionData && consumptionData[0] && consumptionData[0].total) ? consumptionData[0].total : 0;
                let requiredConsumptionMet = false;
                let requiredTopUpMet = false;
                let actualAmount = 0;

                if (consumptionAmount >= requiredConsumptionAmount)
                    requiredConsumptionMet = true;

                let bypassDirtyEvent;

                if (event.condition.ignoreAllTopUpDirtyCheckForReward && event.condition.ignoreAllTopUpDirtyCheckForReward.length > 0) {
                    bypassDirtyEvent = event.condition.ignoreAllTopUpDirtyCheckForReward;
                    for (let a = 0; a  < bypassDirtyEvent.length; a++) {
                        bypassDirtyEvent[a] = bypassDirtyEvent[a].toString();
                    }
                }

                let totalTopUpAmount = 0;
                let usedTopUpRecord = [];
                for (let i = 0; i < topUpRecords.length; i++) {
                    let record = topUpRecords[i];
                    let amount = record.oriAmount || record.amount;
                    actualAmount = record.amount;
                    if (bypassDirtyEvent) {
                        let isSubset = record.usedEvent.every(event => {
                            return bypassDirtyEvent.indexOf(event.toString()) > -1;
                        });
                        if (!isSubset)
                            continue;
                    } else {
                        if (record.bDirty)
                            continue;
                    }

                    totalTopUpAmount += amount;
                    usedTopUpRecord.push(record._id)
                    if (!event.condition.isDynamicRewardAmount && totalTopUpAmount >= requiredTopUpAmount) {
                        requiredTopUpMet = true;
                        break;
                    }
                }

                if (totalTopUpAmount >= requiredTopUpAmount) {
                    requiredTopUpMet = true;
                }

                let meetRequirement = false;
                if (operatorOption) {
                    // AND
                    meetRequirement = requiredConsumptionMet && requiredTopUpMet;
                } else {
                    // OR
                    meetRequirement = requiredConsumptionMet || requiredTopUpMet;
                }

                let response = {targetDate, meetRequirement, requiredConsumptionMet, requiredTopUpMet, topUpDayAmount: totalTopUpAmount, actualAmount: actualAmount};
                // let response = {targetDate, meetRequirement, requiredConsumptionMet, requiredTopUpMet};
                if (isApply && meetRequirement && requiredTopUpMet) {
                    response.usedTopUpRecord = usedTopUpRecord;
                }
                if (isCheckToday) {
                    response.totalTopUpAmount = totalTopUpAmount;
                    response.consumptionAmount = consumptionAmount;
                }

                return response;
            });
        }
    },

    getPromoCodeTypes: (platformObjId, deleteFlag) => dbConfig.collection_promoCodeType.find({
        platformObjId: platformObjId,
        $or: [
            {deleteFlag: {$exists: false}},
            {deleteFlag: deleteFlag}
        ]
    }).lean().then(promoCodeType => {
        let promoCodeTypeList = promoCodeType;
        // get the auto promoCode template
        let promoCodeTemplate = dbConfig.collection_promoCodeTemplate.find({platformObjId: platformObjId}).lean();
        let openPromoCodeTemplate = dbConfig.collection_openPromoCodeTemplate.find({platformObjId: platformObjId}).lean();

        return Promise.all([promoCodeTemplate, openPromoCodeTemplate]).then(result => {

            return promoCodeTypeList.concat(result[0], result[1]);
        })
    }),

    getPromoCodeTypeByObjId: (promoCodeTypeObjId) => dbConfig.collection_promoCodeType.findOne({_id: promoCodeTypeObjId}).lean(),

    promoCodeTemplateByObjId: (promoCodeTemplateObjId) => dbConfig.collection_promoCodeTemplate.findOne({_id: promoCodeTemplateObjId}).lean(),

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
                            player.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);
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

                        if (dbRewardUtil.isRewardEventForbidden(player, promoEvent._id)) {
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

                    let playerIsForbiddenForThisReward = dbRewardUtil.isRewardEventForbidden(playerObj, eventData._id);

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

                    let playerIsForbiddenForThisReward = dbRewardUtil.isRewardEventForbidden(playerObj, eventData._id);

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
        let topUpTypeData, aliPayLimitData, weChatPayDetail;

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
                    weChatPayDetail = data[2];
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
                        status: weChatPayDetail && weChatPayDetail.valid ? 1 : 2,
                        maxDepositAmount: weChatPayDetail && weChatPayDetail.maxDepositAmount ? weChatPayDetail.maxDepositAmount : 0
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
    getPromoCode: (playerId, platformId, status, emptyBonusList) => {
        let platformData = null;
        var playerData = null;
        var promoListData = null;

        return expirePromoCode()
            .then(() => dbConfig.collection_platform.findOne({platformId: platformId}).lean())
            .then(
                platformRecord => {
                    if (platformRecord) {
                        platformData = platformRecord;
                        if (playerId) {
                            return dbConfig.collection_players.findOne({
                                playerId: playerId,
                                platform: ObjectId(platformRecord._id)
                            });
                        }
                        return Promise.resolve();
                    } else {
                        return Promise.reject({name: "DataError", message: "Platform does not exist"});
                    }
                })
            .then(
                playerRecord => {
                    // get the  ExtraBonusInfor state of the player: enable or disable the msg showing
                    if (playerRecord && playerRecord._id) {
                        // if (playerRecord.permission && playerRecord.permission.banReward) {
                        //     return Q.reject({name: "DataError", message: "Player does not have this permission"});
                        // }

                        let showInfoState;
                        let oneMonthAgoDate = moment(new Date()).subtract(1, 'months').toDate();

                        if (playerRecord.viewInfo) {
                            showInfoState = (playerRecord.viewInfo.showInfoState) ? 1 : 0;
                        } else {
                            showInfoState = 1;
                        }

                        var query = {
                            "playerObjId": playerRecord._id,
                            "platformObjId": platformData._id,
                            createTime: {$gte: oneMonthAgoDate, $lt: new Date()}
                        };

                        if (status) {
                            query.status = status;
                        }
                        playerData = playerRecord;

                        let populateCond = platformData.useProviderGroup
                            ? {
                                path: "allowedProviders",
                                model: dbConfig.collection_gameProviderGroup,
                                populate: {path: "providers", model: dbConfig.collection_gameProvider}
                            }
                            : {path: "allowedProviders", model: dbConfig.collection_gameProvider};

                        let promoCodesProm = dbConfig.collection_promoCode.find(query)
                            .populate({path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType})
                            .populate({path: "promoCodeTemplateObjId", model: dbConfig.collection_promoCodeTemplate})
                            .populate(populateCond).lean();

                        let bonusUrlProm = Promise.resolve();

                        if (Number(platformData.platformId) === 6) {
                            // due to dependency loop, require dbPlatform only when needed to prevent ('function not found') error
                            let dbPlatform = require('../db_modules/dbPlatform');
                            bonusUrlProm = dbPlatform.getLiveStream(playerData._id).catch(errorUtils.reportError);
                        }

                        return Promise.all([promoCodesProm, bonusUrlProm])
                            .then(
                                data => {
                                    let promocodes = data && data[0] ? data[0] : [];
                                    let bonusUrl = data && data[1] ? data[1].url : false;
                                    let usedListArr = [];
                                    let noUseListArr = [];
                                    let expiredListArr = [];
                                    let bonusListArr = [];

                                    promocodes.forEach(promocode => {
                                        if(promocode.promoCodeTemplateObjId) {
                                            promocode.promoCodeTypeObjId = promocode.promoCodeTemplateObjId;
                                        }
                                        if (promocode.promoCodeTypeObjId == null) {
                                            return;
                                        }

                                        let providers = [];
                                        let providerGroupName, dayLeft, usedTime;
                                        let status = promocode.status;
                                        let condition = promoCondition(promocode);
                                        let title = getPromoTitle(promocode);

                                        promocode.allowedProviders.forEach(provider => {
                                            if (platformData.useProviderGroup) {
                                                provider.providers.map(e => {
                                                    if (platformData.gameProviderInfo && platformData.gameProviderInfo[String(e._id)]) {
                                                        providers.push(platformData.gameProviderInfo[String(e._id)].localNickName);
                                                    }
                                                });

                                                providerGroupName = provider.name;
                                            } else {
                                                if (platformData.gameProviderInfo && platformData.gameProviderInfo[String(provider._id)]) {
                                                    providers.push(platformData.gameProviderInfo[String(provider._id)].localNickName);
                                                }
                                            }
                                        });

                                        if (!promocode.bannerText) {
                                            dayLeft = moment(promocode.expirationTime).diff(moment(new Date()), 'days');
                                        }

                                        if (promocode.acceptedTime) {
                                            usedTime = promocode.acceptedTime;
                                        }

                                        let promo = {
                                            "title": title,
                                            "validBet": promocode.requiredConsumption,
                                            "games": providers,
                                            "groupName": providerGroupName,
                                            "condition": condition,
                                            "expireTime": promocode.expirationTime,
                                            "bonusCode": promocode.code,
                                            "tag": promocode.bannerText,
                                            "dayLeft": dayLeft,
                                            "isSharedWithXIMA": promocode.isSharedWithXIMA,
                                            "isViewed": promocode.isViewed,
                                            "usedTime": usedTime
                                        };
                                        if (promocode.maxRewardAmount) {
                                            promo.bonusLimit = promocode.maxRewardAmount;
                                        }
                                        if (status == "1") {
                                            noUseListArr.push(promo);
                                        } else if (status == "2") {
                                            if (bonusUrl && promocode.isActive) {
                                                promo.bonusUrl = bonusUrl;
                                            }
                                            usedListArr.push(promo);
                                        } else if (status == "3") {
                                            expiredListArr.push(promo);
                                        } else if (status == "4") {
                                            bonusListArr.push(promo);
                                        }
                                    });

                                    return {
                                        "showInfo": showInfoState,
                                        "usedList": usedListArr,
                                        "noUseList": noUseListArr,
                                        "expiredList": expiredListArr,
                                        "bonusList": bonusListArr
                                    };
                                });
                    } else {
                        return {
                            "showInfo": 1,
                            "usedList": [],
                            "noUseList": [],
                            "expiredList": [],
                            "bonusList": []
                        }
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
                                            '$gte': moment().subtract(3, 'days'),
                                            '$lte': new Date()
                                        }
                                    };
                                    return dbConfig.collection_proposal.find(queryObj).populate(
                                        {
                                            path: "type",
                                            model: dbConfig.collection_proposalType
                                        }).sort({"createTime": -1}).limit(20).lean()

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
                                if (data) {
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
                                }
                            })
                        allProm.push(prom)
                    })
                    return Promise.all(allProm)
                }
            )
            .then(
                data => {
                    if (data.length > 0) {
                        data = data.filter(item => {
                            return item != null
                        })
                    }
                    let result = promoListData;
                    result.bonusList = data;

                    if (emptyBonusList) {
                        result.bonusList = [];
                    }

                    return result;
                }
            )

    },
    customAccountMask: (str) => {
        str = str || '';
        let strLength = str.length;
        let subtractNo = -(strLength - 6);
        if (strLength <= 6) {
            return str.substring(0, 3) + "***"
        } else {
            return str.substring(0, 3) + "***" + str.slice(subtractNo);
        }

    },

    checkPlayerHasPromoCode: (searchQuery) => {
        console.log('searchQuery===99', searchQuery);
        return expirePromoCode().then(res => {
            return dbConfig.collection_players.findOne({
                platform: searchQuery.platformObjId,
                name: searchQuery.playerName
            }).lean();
        }).then(
            playerData => {
                console.log('playerData===99', playerData);
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

                return dbConfig.collection_promoCode.find(query).lean();
            }
        )
    },

    getPromoCodesHistory: (searchQuery) => {
        let playerObjId;

        function sortByCreateTime(a, b){
            if(new Date(a.createTime).getTime() < new Date(b.createTime).getTime()){
                return searchQuery.sortCol && searchQuery.sortCol.createTime ? -searchQuery.sortCol.createTime : 1;
            }else if(new Date(a.createTime).getTime() > new Date(b.createTime).getTime()){
                return searchQuery.sortCol && searchQuery.sortCol.createTime ? searchQuery.sortCol.createTime : -1;
            }

            return 0;
        }


        let openQuery = {};
        let query = {
            platformObjId: searchQuery.platformObjId
        };

        return expirePromoCode().then(() => {return expirePromoCode(true)}).then(() => {
            return dbConfig.collection_players.findOne({
                platform: searchQuery.platformObjId,
                name: searchQuery.playerName
            }).lean();
        }).then(
            playerData => {

                if (playerData) {
                    query.playerObjId = playerData._id;
                    playerObjId = playerData._id;
                } else if (searchQuery.playerName) {
                    return [];
                }

                if (searchQuery.status) {
                    query.status = searchQuery.status
                }

                if (searchQuery.startCreateTime) {
                    query.createTime = {$gte: searchQuery.startCreateTime, $lt: searchQuery.endCreateTime};
                    openQuery.createTime = {$gte: searchQuery.startCreateTime, $lt: searchQuery.endCreateTime};
                }

                if (searchQuery.startAcceptedTime) {
                    query.acceptedTime = {$gte: searchQuery.startAcceptedTime, $lt: searchQuery.endAcceptedTime};
                    openQuery.createTime = {$gte: searchQuery.startAcceptedTime, $lt: searchQuery.endAcceptedTime};
                }

                // get the promoCode not from deleted promoCodeType
                // query.isDeleted = false;

                let openPromoCodeProm = [];
                let promoCodeProm = dbConfig.collection_promoCode.find(query)
                    .populate({path: "playerObjId", model: dbConfig.collection_players})
                    .populate({
                        path: "promoCodeTypeObjId",
                        model: dbConfig.collection_promoCodeType
                    })
                    .populate({
                        path: "promoCodeTemplateObjId",
                        model: dbConfig.collection_promoCodeTemplate
                    })
                    .populate({
                        path: "allowedProviders",
                        model: searchQuery.isProviderGroup ? dbConfig.collection_gameProviderGroup : dbConfig.collection_gameProvider
                    })
                    .sort(searchQuery.sortCol).lean();

                if (query.status != constPromoCodeStatus.AVAILABLE){
                    openPromoCodeProm = dbConfig.collection_proposalType.findOne({
                        platformId: ObjectId(searchQuery.platformObjId),
                        name: constProposalType.PLAYER_PROMO_CODE_REWARD
                    }).lean().then(
                        proposalType => {
                            if(proposalType){
                                let findQuery = {
                                    type: proposalType._id,
                                    'data.eventCode': 'KFSYHDM',
                                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                                    createTime: openQuery.createTime
                                };

                                if (playerObjId){
                                    findQuery['data.playerObjId'] = playerObjId;
                                }

                                return dbConfig.collection_proposal.find(findQuery).populate({
                                    path: "data.providerGroup",
                                    model: searchQuery.isProviderGroup ? dbConfig.collection_gameProviderGroup : dbConfig.collection_gameProvider
                                }).sort(searchQuery.sortCol).lean();
                            }else{
                                return Promise.reject({
                                    name: "DataError",
                                    message: "Cannot find the Proposal Type"
                                })
                            }
                        }
                    )
                }

                return Promise.all([promoCodeProm, openPromoCodeProm])
            }
        ).then(
            res => {
                if (res && res.length == 2){

                    let f1 = searchQuery.promoCodeType ? res[0].filter(e =>
                        (e.promoCodeTypeObjId &&  e.promoCodeTypeObjId.type && e.promoCodeTypeObjId.type == searchQuery.promoCodeType) ||
                        (e.promoCodeTemplateObjId &&  e.promoCodeTemplateObjId.type && e.promoCodeTemplateObjId.type == searchQuery.promoCodeType)
                    ) : res[0];
                    let f2 = searchQuery.promoCodeSubType ? f1.filter(e =>
                        (e.promoCodeTypeObjId &&  e.promoCodeTypeObjId.name && e.promoCodeTypeObjId.name == searchQuery.promoCodeSubType) ||
                        (e.promoCodeTemplateObjId &&  e.promoCodeTemplateObjId.name && e.promoCodeTemplateObjId.name == searchQuery.promoCodeSubType)
                    ) : f1;

                    // special handling for openPromoCode as its structure is different
                    let f1Open = searchQuery.promoCodeType ? res[1].filter(e => e.data.promoCodeTypeValue == searchQuery.promoCodeType) : res[1];
                    let f2Open = searchQuery.promoCodeSubType ? f1Open.filter(e => e.data.promoCodeName == searchQuery.promoCodeSubType) : f1Open;

                    if (query.status == constPromoCodeStatus.EXPIRED){
                        f2Open = f2Open.filter(p => {
                           if(p && p.data && p.data.templateId){
                               return new Date(p.data.openExpirationTime$).getTime() < new Date().getTime()
                           }
                        })
                    }

                    // append promoCodeStatus to the openPromoCode for color displaying (according to status)
                    f2Open.forEach( item => {
                        if (item && item.data && item.data.templateId){
                            if (new Date(item.data.openExpirationTime$).getTime() < new Date().getTime()){
                                item.data.promoCodeStatus$ = constPromoCodeStatus.EXPIRED;
                            }
                            else{
                                item.data.promoCodeStatus$ = constPromoCodeStatus.ACCEPTED;
                            }
                        }
                    })

                    let f2All = f2.concat(f2Open);

                    // sorting by follow sortCol
                    f2All.sort(sortByCreateTime);

                    return {
                        size: Object.keys(f2All).length,
                        data: f2All.splice(searchQuery.index, searchQuery.limit)
                    };

                }
                else{
                   return {
                       size: 0,
                       data: []
                   }
                }
            }
        ).catch(errorUtils.reportError);
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
                delete entry._id;

                upsertProm.push(dbConfig.collection_promoCodeType.findOneAndUpdate(
                    {
                        platformObjId: platformObjId,
                        name: entry.name,
                        type: entry.type,
                        deleteFlag: false
                    },
                    entry,
                    {upsert: true, setDefaultsOnInsert: true}
                ));
            });
        }

        return Promise.all(upsertProm);
    },

    getPromoCodeTemplate: (platformObjId, isProviderGroup) => dbConfig.collection_promoCodeTemplate.find({
        platformObjId: ObjectId(platformObjId),
        isProviderGroup: Boolean(isProviderGroup),
        $or: [
            {genre: {$exists: false}},
            {genre: constPromoCodeTemplateGenre.GENERAL}
        ],
    }).lean(),

    getOpenPromoCodeTemplate: (platformObjId, isProviderGroup, deleteFlag) => {
        return dbConfig.collection_openPromoCodeTemplate.find({
            platformObjId: ObjectId(platformObjId),
            isProviderGroup: Boolean(isProviderGroup),
            isDeleted: Boolean(deleteFlag),
            $or: [
                {genre: {$exists: false}},
                {genre: constPromoCodeTemplateGenre.GENERAL}
            ],
        }).lean().then(
            template => {
                if (template && template.length > 0) {
                    let proposalProm = [];
                    return dbConfig.collection_proposalType.findOne({
                        platformId: ObjectId(platformObjId),
                        name: constProposalType.PLAYER_PROMO_CODE_REWARD
                    }).lean().then(proposalType => {
                        if (proposalType) {
                            template.forEach(t => {
                                if (t && t._id) {
                                    proposalProm.push(dbConfig.collection_proposal.aggregate([
                                        {
                                            $match: {
                                                type: ObjectId(proposalType._id),
                                                'data.templateId': ObjectId(t._id),
                                                createTime: {$gte: t.createTime, $lt: t.expirationTime},
                                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                                            }
                                        },
                                        {
                                            $group: {
                                                _id: "$data.templateId",
                                                count: {$sum: 1}
                                            }
                                        }

                                    ]))
                                }
                            })
                            return Promise.all(proposalProm);
                        }
                    }).then(retProposal => {
                        if (retProposal) {

                            template.forEach(t => {
                                if (t && t._id) {
                                    let index = retProposal.findIndex(p => {
                                        if (p[0] && p[0]._id) {

                                            return p[0]._id.toString() == t._id.toString();
                                        }
                                    });
                                    if (index != -1) {
                                        t.receivedQuantity = retProposal[index][0].count;
                                    }
                                }
                            })

                            return template;
                        }
                    })
                }
                else {
                    return [];
                }
            }
        ).catch(errorUtils.reportError);
    },

    updatePromoCodeTemplate: (platformObjId, promoCodeTemplate) => {
        let prom = [];

        promoCodeTemplate.forEach(entry => {

            if (entry) {

                if (entry.hasOwnProperty("__v")) {
                    delete entry.__v;
                }

                if (entry._id && entry.deletedStatus) {

                    prom.push(dbConfig.collection_promoCodeTemplate.remove({
                        _id: ObjectId(entry._id)
                    }))
                }
                else {

                    if (entry._id) {
                        delete entry._id;
                    }

                    prom.push(dbConfig.collection_promoCodeTemplate.findOneAndUpdate(
                        {
                            platformObjId: platformObjId,
                            name: entry.name,
                            type: entry.type,
                        },
                        entry,
                        {upsert: true, setDefaultsOnInsert: true}
                    ));
                }
            }

        });

        return Promise.all(prom);
    },

    updateOpenPromoCodeTemplate: (platformObjId, promoCodeTemplate) => {
        let prom = [];

        promoCodeTemplate.forEach(entry => {

            if (entry) {

                if (entry.hasOwnProperty("__v")) {
                    delete entry.__v;
                }

                if (entry.deletedStatus) {

                    prom.push(dbConfig.collection_openPromoCodeTemplate.remove({
                        name: entry.name,
                        code: entry.code,
                        type: entry.type,
                        platformObjId: entry.platformObjId
                    }))
                }
                else {

                    if (entry._id) {
                        delete entry._id;
                    }

                    if (entry.code) {
                        delete entry.code;
                    }

                    prom.push(dbConfig.collection_openPromoCodeTemplate.findOneAndUpdate(
                        {
                            platformObjId: platformObjId,
                            name: entry.name,
                            type: entry.type,
                        },
                        entry,
                        {upsert: true, setDefaultsOnInsert: true}
                    ));
                }
            }

        });

        return Promise.all(prom);
    },

    updatePromoCodeIsDeletedFlag: (platformObjId, promoCodeTypeObjId, isDeleted) => {
        return dbConfig.collection_promoCode.update({
            platformObjId: platformObjId,
            promoCodeTypeObjId: promoCodeTypeObjId
        }, {
            $set: {
                isDeleted: isDeleted
            }
        }, {
            multi: true
        }).exec();

    },

    //batch support for generatePromoCode()
    //params is an array of objects which includes:
    //platformObjId, newPromoCodeEntry, adminObjId, adminName, [feedbackData]
    generatePromoCodes: (params) => {
        let generatePromoCodeProm = [];
        params.map(param => {
            generatePromoCodeProm.push(
                dbPlayerReward.generatePromoCode(param.platformObjId, param.newPromoCodeEntry, param.adminObjId, param.adminName).then(promoCode => {
                    if(promoCode && param.feedbackData) {
                        let feedbackData = param.feedbackData;
                        feedbackData.createTime = new Date();
                        return dbPlayerFeedback.createPlayerFeedback(feedbackData);
                    } else {
                        return Promise.resolve();
                    }
                }).catch(err => {
                    console.log("generatePromoCodes Error ", param.newPromoCodeEntry, err);
                })
            );
        });
        return Promise.all(generatePromoCodeProm);
    },

    generatePromoCode: (platformObjId, newPromoCodeEntry, adminObjId, adminName) => {
        console.log('platformObjId===11', platformObjId);
        console.log('newPromoCodeEntry===11', newPromoCodeEntry);
        console.log('adminObjId===11', adminObjId);
        console.log('adminName===11', adminName);
        let player;
        // Check if player exist
        return dbConfig.collection_players.findOne({
            platform: platformObjId,
            name: newPromoCodeEntry.playerName
        }).lean().then(
            playerData => {
                console.log('playerData===22', playerData);
                if (playerData) {
                    player = playerData;

                    return dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", true);
                }
                else {
                    return Promise.reject({name: "DataError", message: "Invalid player data"});
                }
            }
        ).then(
            playerState => {
                console.log('playerState===33', playerState);
                if (playerState) {
                    newPromoCodeEntry.playerObjId = player._id;
                    newPromoCodeEntry.code = dbUtility.generateRandomPositiveNumber(1000, 9999);
                    newPromoCodeEntry.status = constPromoCodeStatus.AVAILABLE;
                    newPromoCodeEntry.adminId = adminObjId;
                    newPromoCodeEntry.adminName = adminName;

                    return dbConfig.collection_promoCodeActiveTime.findOne({
                        platform: platformObjId,
                        startTime: {$lt: new Date()},
                        endTime: {$gt: new Date()}
                    }).lean();
                }
            }
        ).then(
            activeTimeRes => {
                console.log('activeTimeRes===44', activeTimeRes);
                if (activeTimeRes) {
                    newPromoCodeEntry.isActive = true;
                }

                return new dbConfig.collection_promoCode(newPromoCodeEntry).save();
            }
        ).then(
            newPromoCode => {
                console.log('newPromoCode===55', newPromoCode);
                if (newPromoCode) {
                    if (newPromoCodeEntry.allowedSendSms && player.smsSetting && player.smsSetting.PromoCodeSend) {
                        SMSSender.sendPromoCodeSMSByPlayerId(newPromoCodeEntry.playerObjId, newPromoCodeEntry, adminObjId, adminName);
                    }
                    messageDispatcher.dispatchMessagesForPromoCode(platformObjId, newPromoCodeEntry, adminName, adminObjId);
                    dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                    return newPromoCode.code;
                }

            }
        ).catch(
            err => {
                dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                throw err;
            }
        )
    },

    generateOpenPromoCode: (platformObjId, newPromoCodeEntry, adminObjId, adminName) => {

        newPromoCodeEntry.code = dbUtility.generateRandomPositiveNumber(100, 999);
        newPromoCodeEntry.status = constPromoCodeStatus.AVAILABLE;
        newPromoCodeEntry.adminId = adminObjId;
        newPromoCodeEntry.adminName = adminName;

        return dbConfig.collection_promoCodeActiveTime.findOne({
            platform: platformObjId,
            startTime: {$lt: new Date()},
            endTime: {$gt: new Date()}
        }).lean().then(activeTimeRes => {

            if (activeTimeRes) {
                newPromoCodeEntry.isActive = true;
            }

            return new dbConfig.collection_openPromoCodeTemplate(newPromoCodeEntry).save();

        }).then (newPromoCode => {
            if (newPromoCode) {
                // if (newPromoCodeEntry.allowedSendSms && player.smsSetting && player.smsSetting.PromoCodeSend) {
                //     SMSSender.sendPromoCodeSMSByPlayerId(newPromoCodeEntry.playerObjId, newPromoCodeEntry, adminObjId, adminName);
                // }
                // messageDispatcher.dispatchMessagesForPromoCode(platformObjId, newPromoCodeEntry, adminName, adminObjId);
                // dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                return newPromoCode;
            }

        }).catch(
            err => {
                // dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                throw err;
            }
        )
    },

    modifyPlayerPermissionByPromoCode: (adminId, platformObjId, addedPlayerNameArr, deletedPlayerNameArr) => {
        let promArr = [];
        if (addedPlayerNameArr && addedPlayerNameArr.length) {
            let addBanPermission = dbConfig.collection_players.update(
                {platform: platformObjId, name: {$in: addedPlayerNameArr}}, {forbidPromoCode: true}, {multi: true});
            promArr.push(addBanPermission);
        }
        if (deletedPlayerNameArr && deletedPlayerNameArr.length) {
            let deleteBanPermission = dbConfig.collection_players.update(
                {platform: platformObjId, name: {$in: deletedPlayerNameArr}}, {forbidPromoCode: false}, {multi: true});
            promArr.push(deleteBanPermission);
        }

        return Promise.all(promArr).then(
            () => {
                let deletedPlayerProm = Promise.resolve([])
                let addedPlayerProm = Promise.resolve([]);
                if (addedPlayerNameArr && addedPlayerNameArr.length) {
                    addedPlayerProm = dbConfig.collection_players.find({
                        platform: platformObjId,
                        name: {$in: addedPlayerNameArr}
                    }).lean();
                }
                if (deletedPlayerNameArr && deletedPlayerNameArr.length) {
                    deletedPlayerProm = dbConfig.collection_players.find({
                        platform: platformObjId,
                        name: {$in: deletedPlayerNameArr}
                    }).lean();
                }
                return Promise.all([addedPlayerProm, deletedPlayerProm])
            }
        ).then(
            ([addedPlayer, deletedPlayer]) => {
                if (addedPlayer && addedPlayer.length) {
                    addedPlayer.forEach(player => {
                        let logDetails = {
                            player: player._id,
                            admin: adminId,
                            forbidRewardNames: ["优惠代码"],
                            remark: "（关闭）新增玩家至封锁群组"
                        };
                        dbConfig.collection_playerForbidRewardLog(logDetails).save().then().catch(errorUtils.reportError);
                    });
                }

                if (deletedPlayer && deletedPlayer.length) {
                    deletedPlayer.forEach(player => {
                        let logDetails = {
                            player: player._id,
                            admin: adminId,
                            forbidRewardNames: [],
                            remark: "（开启）从封锁群组删除玩家"
                        };
                        dbConfig.collection_playerForbidRewardLog(logDetails).save().then().catch(errorUtils.reportError);
                    });
                }
            }
        );

    },

    // check the availability of promoCodeType
    checkPromoCodeTypeAvailability: (platformObjId, promoCodeTypeObjId) => {
        return expirePromoCode().then(() => {
            return dbConfig.collection_promoCode.findOne({
                platformObjId: platformObjId,
                promoCodeTypeObjId: promoCodeTypeObjId
            }).sort({expirationTime: -1}).lean();
        }).then(data => {
            let result = {
                // for the promoCodeType that been used in generate promoCode, keep the record by set the deleteFlag
                deleteFlag: false,
                // for the promoCodeType that is not applied, delete from the dB
                delete: false,
            };

            if (data) {
                if (data && data.status) {
                    result.deleteFlag = data.status != constPromoCodeStatus.AVAILABLE;
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid data"});
                }
            }
            else {
                result.delete = true;
            }

            return result;
        });
    },

    savePromoCodeUserGroup: (platformObjId, data, isDelete) => {
        let saveArr = [];

        if (isDelete) {
            return dbConfig.collection_promoCodeUserGroup.remove({_id: data});
        } else {
            if (data && data.length > 0) {
                data.map(grp => {
                    grp.platformObjId = platformObjId;

                    if (grp && grp._id) { // for existing group data
                        let saveObj = {
                            name: grp.name,
                            color: grp.color,
                            playerNames: grp.playerNames || []
                        };

                        saveArr.push(dbConfig.collection_promoCodeUserGroup.findOneAndUpdate({
                            _id: grp._id
                        }, saveObj, {upsert: true}));
                    } else if (grp && !grp._id) { // for new group data
                        let insertObj = {
                            platformObjId: grp.platformObjId,
                            name: grp.name,
                            color: grp.color,
                            playerNames: grp.playerNames || []
                        };

                        let newGroup = new dbConfig.collection_promoCodeUserGroup(insertObj);
                        return newGroup.save();
                    }
                });
            }
        }

        return Promise.all(saveArr);
    },

    saveBlockPromoCodeUserGroup: (platformObjId, data, isDelete, adminId) => {
        let saveArr = [];

        if (isDelete) {
            return dbConfig.collection_promoCodeUserGroup.findOne({_id: data}).lean().then(
                groupData => {
                    if (groupData && groupData.playerNames && groupData.playerNames.length) {
                        dbConfig.collection_players.update({
                            platform: groupData.platformObjId,
                            name: {$in: groupData.playerNames}
                        }, {forbidPromoCode: false}, {multi: true}).catch(errorUtils.reportError);

                         dbConfig.collection_players.find({
                                    platform: groupData.platformObjId,
                                    name: {$in: groupData.playerNames}
                                }).lean().then(
                             deletedPlayer => {
                                 if (deletedPlayer && deletedPlayer.length) {
                                     deletedPlayer.forEach(player => {
                                         let logDetails = {
                                             player: player._id,
                                             admin: adminId,
                                             forbidRewardNames: [],
                                             remark: "（开启）从封锁群组删除玩家"
                                         };
                                         dbConfig.collection_playerForbidRewardLog(logDetails).save().then().catch(errorUtils.reportError);
                                     });
                                 }
                             }
                        ).catch(errorUtils.reportError);

                    }

                    return dbConfig.collection_promoCodeUserGroup.remove({_id: data});
                }
            )
        } else {
            if (data && data.length > 0) {
                data.map(grp => {
                    grp.platformObjId = platformObjId;

                    if (grp && grp._id) { // for existing group data
                        let saveObj = {
                            name: grp.name,
                            color: grp.color,
                            playerNames: grp.playerNames || [],
                            isBlockPromoCodeUser: true
                        };

                        saveArr.push(dbConfig.collection_promoCodeUserGroup.findOneAndUpdate({
                            _id: grp._id
                        }, saveObj, {upsert: true}));
                    } else if (grp && !grp._id) { // for new group data
                        let insertObj = {
                            platformObjId: grp.platformObjId,
                            name: grp.name,
                            color: grp.color,
                            playerNames: grp.playerNames || [],
                            isBlockPromoCodeUser: true
                        };

                        let newGroup = new dbConfig.collection_promoCodeUserGroup(insertObj);
                        return newGroup.save();
                    }
                });
            }
        }

        return Promise.all(saveArr);
    },

    updatePromoCodeGroupMainPermission: function (checkQuery, query, updateData) {
        let isUpsert = true;
        if (updateData.$pull) {
            isUpsert = false;
        }

        let checkProm = Promise.resolve(false);
        if (checkQuery) {
            checkProm = dbConfig.collection_promoCodeUserGroup.findOne(checkQuery).lean();
        }
        return checkProm.then(
            promoCodeData => {
                if (promoCodeData) {
                    if (!promoCodeData.isBlockPromoCodeUser) {
                        dbConfig.collection_promoCodeUserGroup.findOneAndUpdate({_id: promoCodeData._id}, {$pull: {playerNames: checkQuery.playerNames}}).lean().catch(errorUtils.reportError);
                    } else {
                        // return Q.reject({name: "DataError", message: "Player already in promo code blocked group"});
                        return true;
                    }
                }
                return dbConfig.collection_promoCodeUserGroup.findOneAndUpdate(query, updateData, {upsert: isUpsert}).lean();
            }
        )
    },

    updateBatchPromoCodeGroupMainPermission: function (checkQuery, query, updateData) {
        let isUpsert = true;
        if (updateData.$pull) {
            isUpsert = false;
        }

        let checkProm = Promise.resolve(false);
        if (checkQuery) {
            checkProm = dbConfig.collection_promoCodeUserGroup.update(checkQuery,{$pull: {playerNames: checkQuery.playerNames}},{multi: true})
        }
        return checkProm.then(
            () => {
                if (updateData.$pull) {
                    return dbConfig.collection_promoCodeUserGroup.update(query, updateData, {multi: true})
                } else {
                    return dbConfig.collection_promoCodeUserGroup.findOneAndUpdate(query, updateData, {upsert: true}).lean();
                }
            }
        )
    },

    saveDelayDurationGroup: (platformObjId, data) => {
        let saveObj = {consumptionTimeConfig: data};

        console.log("saveDelayDurationGroup platform update:", saveObj);

        return dbConfig.collection_platform.findOneAndUpdate({
            _id: platformObjId
        }, saveObj);

    },

    getPromoCodeUserGroup: (platformObjId) => dbConfig.collection_promoCodeUserGroup.find({platformObjId: platformObjId, isBlockPromoCodeUser: {$ne: true}, isBlockByMainPermission: {$ne: true}}).lean(),
    getBlockPromoCodeUserGroup: (platformObjId) => dbConfig.collection_promoCodeUserGroup.find({platformObjId: platformObjId, isBlockPromoCodeUser: true}).lean().then(
        groupData => {
            // to sort default group to first one
            if (groupData && groupData.length) {
                for (let i = 0; i < groupData.length; i++) {
                    if (i != 0 && groupData[i].isDefaultGroup) {
                        let temp = groupData[0];
                        groupData[0] = groupData[i];
                        groupData[i] = temp;
                    }
                }
            }
            return groupData;
        }
    ),
    getAllPromoCodeUserGroup: (platformObjId) => dbConfig.collection_promoCodeUserGroup.find({platformObjId: platformObjId}).lean(),
    getDelayDurationGroup: (platformObjId, duration) => dbConfig.collection_platform.find({_id: platformObjId}).lean(),

    applyPromoCode: (playerId, promoCode, adminInfo, userAgent) => {
        let promoCodeObj, playerObj, topUpProp;
        let isType2Promo = false;
        let platformObjId = '';
        let topUpAmount = 0;
        return expirePromoCode().then(res => {
            return dbConfig.collection_players.findOne({
                playerId: playerId
            })
        }).then(
            playerData => {
                playerObj = playerData;
                platformObjId = playerObj.platform;
                if (playerObj && playerObj.forbidPromoCode) {
                    return Q.reject({name: "DataError", message: "Player does not have this permission"});
                }
                return dbPlayerUtil.setPlayerBState(playerObj._id, "ApplyPromoCode", true);
            }
        ).then(
            playerState => {
                if (playerState) {
                    return dbConfig.collection_promoCode.find({
                        platformObjId: playerObj.platform,
                        playerObjId: playerObj._id,
                        status: constPromoCodeStatus.AVAILABLE
                    }).populate({
                        path: "promoCodeTypeObjId", model: dbConfig.collection_promoCodeType
                    }).populate({
                        path: "promoCodeTemplateObjId", model: dbConfig.collection_promoCodeTemplate
                    }).lean();
                } else {
                    return Promise.reject({
                      name: "DataError",
                      errorMessage: "Concurrent issue detected",
                      status: constServerCode.CONCURRENT_DETECTED
                    });
                }
            }
        ).then(
            promoCodeObjs => {
                if (promoCodeObjs && promoCodeObjs.length > 0) {
                    promoCodeObjs.some(e => {
                        if (e.code == promoCode) {
                            if(e.promoCodeTemplateObjId) {
                                e.promoCodeTypeObjId = e.promoCodeTemplateObjId;
                            }
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
                            status: constServerCode.PLAYER_NOT_MINTOPUP,
                            name: "ConditionError",
                            message: "Topup has been used for other reward"
                        })
                    }

                    // Check latest top up has sufficient amount to apply
                    if ([1, 3].indexOf(promoCodeObj.promoCodeTypeObjId.type) > -1 && topUpProp.data.amount < promoCodeObj.minTopUpAmount) {

                        return Promise.reject({
                            status: constServerCode.PLAYER_NOT_MINTOPUP,
                            name: "ConditionError",
                            // message: "Topup amount '$" + promoCodeObj.minTopUpAmount + "' is needed for this reward"
                            message: "你需要有新存款（" + promoCodeObj.minTopUpAmount + "元）才能领取此优惠，千万别错过了！"
                        })
                    }

                    if(typeof topUpProp.data.actualAmountReceived != "undefined"){
                        topUpAmount = Number(topUpProp.data.actualAmountReceived);
                    }else{
                        topUpAmount = topUpProp.data.amount;
                    }

                    // Process amount and requiredConsumption for type 3 promo code
                    if (promoCodeObj.promoCodeTypeObjId.type == 3) {
                        promoCodeObj.amount = topUpProp.data.amount * promoCodeObj.amount * 0.01;
                        if (promoCodeObj.amount > promoCodeObj.maxRewardAmount) {
                            promoCodeObj.amount = promoCodeObj.maxRewardAmount;
                        }
                        promoCodeObj.requiredConsumption = (topUpAmount + promoCodeObj.amount) * promoCodeObj.requiredConsumption;
                    }

                    let consumptionRecordProm = dbConfig.collection_playerConsumptionRecord.findOne({
                        playerId: { $in: [ObjectId(promoCodeObj.playerObjId), String(promoCodeObj.playerObjId)] },
                        platformId: { $in: [ObjectId(platformObjId), String(platformObjId)] },
                        createTime: { $gte: topUpProp.settleTime, $lt: new Date() }
                    }).lean();

                    let topUpRecordProm = dbConfig.collection_playerTopUpRecord.findOne({proposalId: topUpProp.proposalId}).lean();

                    return Promise.all([consumptionRecordProm, topUpRecordProm]);
                } else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_MINTOPUP,
                        name: "ConditionError",
                        // message: "Topup amount '$" + promoCodeObj.minTopUpAmount + "' is needed for this reward"
                        message: "你需要有新存款（" + promoCodeObj.minTopUpAmount + "元）才能领取此优惠，千万别错过了！"
                    })
                }
            }
        ).then(
            data => {
                if (data && data[1]) {
                    let topUpRecord = data[1];
                    if (topUpRecord.bDirty || (topUpRecord.usedEvent && topUpRecord.usedEvent.length > 0)) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NOT_MINTOPUP,
                            name: "ConditionError",
                            message: "Topup has been used for other reward"
                        });
                    }
                }

                // if player apply for topup return , then he cannot apply promo code
                if (topUpProp && topUpProp.data && topUpProp.data.topUpReturnCode) {
                    return Q.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: localization.localization.translate("Cannot apply 2 reward in 1 top up")
                    });
                }


                let consumptionRec = data[0];

                if (!consumptionRec || isType2Promo) {
                    // Try deduct player credit first if it is type-C promo code
                    if (promoCodeObj.isProviderGroup && promoCodeObj.allowedProviders.length > 0 && promoCodeObj.promoCodeTypeObjId.type == 3 && topUpProp && topUpProp.data && topUpAmount) {
                        return dbPlayerUtil.tryToDeductCreditFromPlayer(playerObj._id, platformObjId, topUpAmount, promoCodeObj.promoCodeTypeObjId.name + ":Deduction", topUpProp.data)
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Promise.reject({
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
                // determine applyAmount
                let applyAmt = topUpProp && topUpAmount ? topUpAmount : 0;

                if (promoCodeObj.promoCodeTypeObjId.type === 1) { applyAmt = 0 }

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
                        disableWithdraw: promoCodeObj.disableWithdraw,
                        PROMO_CODE_TYPE: promoCodeObj.promoCodeTypeObjId.name,
                        promoCodeTypeValue: promoCodeObj.promoCodeTypeObjId.type,
                        applyAmount: applyAmt,
                        topUpProposal: topUpProp && topUpProp.proposalId ? topUpProp.proposalId : null,
                        useLockedCredit: false,
                        useConsumption: !promoCodeObj.isSharedWithXIMA,
                        promoCodeName: promoCodeObj.bannerText,
                        eventName: "优惠代码",
                        eventCode: "YHDM",
                        remark: promoCodeObj.remark
                        },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };
                proposalData.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);

                if (promoCodeObj.allowedProviders) {
                    if (promoCodeObj.isProviderGroup) {
                        proposalData.data.providerGroup = promoCodeObj.allowedProviders;
                    } else {
                        proposalData.data.providers = promoCodeObj.allowedProviders;
                    }
                }

                return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalData);
            }
        ).then(
            newProp => {
                if (topUpProp) {
                    // Since promo code do not have its own event, it does not have eventObjId
                    // Hence this object id will be use specifically for promo code throughout system as eventObjId
                    addUsedRewardToTopUpRecord(topUpProp.proposalId, "59ca08a3ef187c1ccec863b9").catch(errorUtils.reportError);
                }

                return dbConfig.collection_promoCode.findOneAndUpdate({
                    _id: promoCodeObj._id
                }, {
                    acceptedTime: new Date(),
                    status: constPromoCodeStatus.ACCEPTED,
                    proposalId: newProp.proposalId,
                    acceptedAmount: newProp.data.rewardAmount,
                    topUpAmount: newProp.data.applyAmount || topUpAmount || 0
                })
            }
        ).then(() => {
            dbPlayerUtil.setPlayerBState(playerObj._id, "ApplyPromoCode", false).catch(errorUtils.reportError);
            promoCodeObj.promoCodeTypeObjId = promoCodeObj.promoCodeTypeObjId._id;
            return promoCodeObj;

        }).catch(err=>{
            if (err.status === constServerCode.CONCURRENT_DETECTED) {
                // Ignore concurrent request for now
            } else {
                // Set BState back to false
                dbPlayerUtil.setPlayerBState(playerObj._id, "ApplyPromoCode", false).catch(errorUtils.reportError);
            }
            throw err;
        })
    },

    applyOpenPromoCode: (playerId, promoCode, adminInfo, userAgent, lastLoginIp) => {
        let promoCodeObj, playerObj, topUpProp;
        let isType2Promo = false;
        let platformObjId = '';
        let topUpAmount = 0;
        return expirePromoCode(true).then(res => {
            return dbConfig.collection_players.findOne({
                playerId: playerId
            })
        }).then(
            playerData => {
                playerObj = playerData;
                platformObjId = playerObj.platform;
                if (playerObj && playerObj.forbidPromoCode) {
                    return Q.reject({name: "DataError", message: "Player does not have this permission"});
                }
                return dbPlayerUtil.setPlayerBState(playerObj._id, "ApplyPromoCode", true);
            }
        ).then(
            playerState => {
                if (playerState) {
                    return dbConfig.collection_openPromoCodeTemplate.find({
                        platformObjId: playerObj.platform,
                        code: promoCode,
                        status: constPromoCodeStatus.AVAILABLE
                    }).lean();
                } else {
                    return Promise.reject({name: "DataError", errorMessage: "Concurrent issue detected"});
                }
            }
        ).then(
            promoCodeObjs => {
                if (promoCodeObjs && promoCodeObjs.length != 0) {
                    // if there is valid openPromoCode, check proposal
                    promoCodeObj = promoCodeObjs[0];

                    return dbConfig.collection_proposalType.findOne({
                        platformId: platformObjId,
                        name: constProposalType.PLAYER_PROMO_CODE_REWARD
                    }).lean().then (proposalType => {
                        if(proposalType) {

                            let proposalProm = dbConfig.collection_proposal.find({
                                type: ObjectId(proposalType._id),
                                'data.promoCode': parseInt(promoCode),
                                createTime: { $gte: promoCodeObj.createTime, $lt: promoCodeObj.expirationTime},
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                            }).lean().count();

                            let playerProposalProm = dbConfig.collection_proposal.find({
                                type: ObjectId(proposalType._id),
                                'data.promoCode': parseInt(promoCode),
                                'data.playerId': playerId,
                                createTime: { $gte: promoCodeObj.createTime, $lt: promoCodeObj.expirationTime},
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                            }).lean().count();

                            let ipProposalProm;

                            if (lastLoginIp){
                                ipProposalProm = dbConfig.collection_proposal.find({
                                    type: ObjectId(proposalType._id),
                                    'data.promoCode': parseInt(promoCode),
                                    'data.lastLoginIp': lastLoginIp,
                                    createTime: { $gte: promoCodeObj.createTime, $lt: promoCodeObj.expirationTime},
                                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                                }).read("secondaryPreferred").lean().count();
                            }
                            else{
                                ipProposalProm = Promise.resolve(0);
                            }


                            return Promise.all([proposalProm, playerProposalProm, ipProposalProm]);

                        }
                        else{
                            return Promise.reject({name: "DataError", errorMessage: "Proposal Type is not found"});
                        }

                    });

                } else {
                    return Q.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "No available promo code at the moment"
                    })
                }
            }
        ).then(
            proposalData => {

                if (proposalData && proposalData.length == 3) {

                    let totalAppliedNumber = proposalData[0];
                    let playerAppliedNumber = proposalData[1];
                    let ipAppliedNumber = proposalData[2];

                    let totalLimit = promoCodeObj.totalApplyLimit || 0;
                    let playerLimit = promoCodeObj.applyLimitPerPlayer || 0;
                    let ipLimit = promoCodeObj.ipLimit || 0;

                    if (totalAppliedNumber >= totalLimit){
                        return Q.reject({
                            status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                            name: "ConditionError",
                            message: "Exceed the total application limit"
                        })
                    }

                    if (playerAppliedNumber >= playerLimit){
                        return Q.reject({
                            status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                            name: "ConditionError",
                            message: "Exceed the total application limit of the player"
                        })
                    }

                    if (ipAppliedNumber >= ipLimit){
                        return Q.reject({
                            status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                            name: "ConditionError",
                            message: "Exceed the total application limit from the same IP"
                        })
                    }

                    if (!promoCodeObj.minTopUpAmount) {
                            isType2Promo = true;
                            return true;
                    } else {
                        let searchQuery = {
                            'data.platformId': platformObjId,
                            'data.playerObjId': playerObj._id,
                            settleTime: {$gte: promoCodeObj.createTime, $lt: new Date()},
                            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                            mainType: "TopUp"
                        };
                        // Search Top Up Proposal After Received Promo Code
                        return dbConfig.collection_proposal.find(searchQuery).sort({createTime: -1}).limit(1).lean();
                    }

                }
                else{
                    return Promise.reject({name: "DataError", errorMessage: "Proposal data is not found"});
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
                            status: constServerCode.PLAYER_NOT_MINTOPUP,
                            name: "ConditionError",
                            message: "Topup has been used for other reward"
                        })
                    }

                    // Check latest top up has sufficient amount to apply
                    if ([1, 3].indexOf(promoCodeObj.type) > -1 && topUpProp.data.amount < promoCodeObj.minTopUpAmount) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NOT_MINTOPUP,
                            name: "ConditionError",
                            // message: "Topup amount '$" + promoCodeObj.minTopUpAmount + "' is needed for this reward"
                            message: "你需要有新存款（" + promoCodeObj.minTopUpAmount + "元）才能领取此优惠，千万别错过了！"
                        })
                    }

                    if(typeof topUpProp.data.actualAmountReceived != "undefined"){
                        topUpAmount = Number(topUpProp.data.actualAmountReceived);
                    }else{
                        topUpAmount = topUpProp.data.amount;
                    }

                    // Process amount and requiredConsumption for type 3 promo code
                    if (promoCodeObj.type == 3) {
                        promoCodeObj.amount$ = promoCodeObj.amount;
                        promoCodeObj.amount = topUpProp.data.amount * promoCodeObj.amount * 0.01;
                        if (promoCodeObj.amount > promoCodeObj.maxRewardAmount) {
                            promoCodeObj.amount = promoCodeObj.maxRewardAmount;
                        }
                        promoCodeObj.requiredConsumption$ = promoCodeObj.requiredConsumption;
                        promoCodeObj.requiredConsumption = (topUpAmount + promoCodeObj.amount) * promoCodeObj.requiredConsumption;
                    }

                    let consumptionRecordProm = dbConfig.collection_playerConsumptionRecord.findOne({
                        playerId: { $in: [ObjectId(playerObj._id), String(playerObj._id)] },
                        platformId: { $in: [ObjectId(platformObjId), String(platformObjId)] },
                        createTime: { $gte: topUpProp.settleTime, $lt: new Date() }
                    }).lean();

                    let topUpRecordProm = dbConfig.collection_playerTopUpRecord.findOne({proposalId: topUpProp.proposalId}).lean();

                    return Promise.all([consumptionRecordProm, topUpRecordProm]);
                } else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_MINTOPUP,
                        name: "ConditionError",
                        // message: "Topup amount '$" + promoCodeObj.minTopUpAmount + "' is needed for this reward"
                        message: "你需要有新存款（" + promoCodeObj.minTopUpAmount + "元）才能领取此优惠，千万别错过了！"
                    })
                }
            }
        ).then(
            data => {
                if (data && data[1]) {
                    let topUpRecord = data[1];
                    if (topUpRecord.bDirty || (topUpRecord.usedEvent && topUpRecord.usedEvent.length > 0)) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NOT_MINTOPUP,
                            name: "ConditionError",
                            message: "Topup has been used for other reward"
                        });
                    }
                }

                // if player apply for topup return , then he cannot apply promo code
                if (topUpProp && topUpProp.data && topUpProp.data.topUpReturnCode) {
                    return Q.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: localization.localization.translate("Cannot apply 2 reward in 1 top up")
                    });
                }


                let consumptionRec = data[0];

                if (!consumptionRec || isType2Promo) {
                    // Try deduct player credit first if it is type-C promo code
                    if (promoCodeObj.isProviderGroup && promoCodeObj.allowedProviders.length > 0 && promoCodeObj.type == 3 && topUpProp && topUpProp.data && topUpAmount) {
                        return dbPlayerUtil.tryToDeductCreditFromPlayer(playerObj._id, platformObjId, topUpAmount, promoCodeObj.name + ":Deduction", topUpProp.data)
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    return Promise.reject({
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
                // determine applyAmount
                let applyAmt = topUpProp && topUpAmount ? topUpAmount : 0;

                if (promoCodeObj.type === 1) { applyAmt = 0 }

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
                        templateId: ObjectId(promoCodeObj._id),
                        playerObjId: playerObj._id,
                        playerId: playerObj.playerId,
                        playerName: playerObj.name,
                        realName: playerObj.realName,
                        platformObjId: playerObj.platform._id,
                        rewardAmount: promoCodeObj.amount,
                        spendingAmount: promoCodeObj.requiredConsumption,
                        promoCode: promoCodeObj.code,
                        disableWithdraw: promoCodeObj.disableWithdraw,
                        PROMO_CODE_TYPE: promoCodeObj.name,
                        promoCodeTypeValue: promoCodeObj.type,
                        applyAmount: applyAmt,
                        topUpProposal: topUpProp && topUpProp.proposalId ? topUpProp.proposalId : null,
                        useLockedCredit: false,
                        useConsumption: !promoCodeObj.isSharedWithXIMA,
                        promoCodeName: promoCodeObj.name,
                        eventName: "开放式优惠代码",
                        eventCode: "KFSYHDM",
                        remark: promoCodeObj.remark,
                        // special handling for history
                        amount$: promoCodeObj.type === 3 ? promoCodeObj.amount$ : promoCodeObj.amount,
                        requiredConsumption$: promoCodeObj.type === 3 ? promoCodeObj.requiredConsumption$ : promoCodeObj.requiredConsumption,
                        minTopUpAmount$: promoCodeObj.minTopUpAmount || null,
                        maxRewardAmount$: promoCodeObj.maxRewardAmount || null,
                        openExpirationTime$: promoCodeObj.expirationTime,
                        openCreateTime$: promoCodeObj.createTime,
                        isProviderGroup$: promoCodeObj.isProviderGroup,
                        lastLoginIp: lastLoginIp || null
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };

                proposalData.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);
                if (promoCodeObj.isProviderGroup) {
                    proposalData.data.providerGroup = promoCodeObj.allowedProviders || [];
                } else {
                    proposalData.data.providers = promoCodeObj.allowedProviders || [];
                }

                return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalData);
            }
        ).then(
            newProp => {
                if (topUpProp) {
                    // Since promo code do not have its own event, it does not have eventObjId
                    // Hence this object id will be use specifically for promo code throughout system as eventObjId
                    addUsedRewardToTopUpRecord(topUpProp.proposalId, "59ca08a3ef187c1ccec863b9").catch(errorUtils.reportError);
                }
                dbPlayerUtil.setPlayerBState(playerObj._id, "ApplyPromoCode", false).catch(errorUtils.reportError);
                return promoCodeObj;

        }).catch(err=>{
            if (err.status === constServerCode.CONCURRENT_DETECTED) {
                // Ignore concurrent request for now
            } else {
                // Set BState back to false
                dbPlayerUtil.setPlayerBState(playerObj._id, "ApplyPromoCode", false).catch(errorUtils.reportError);
            }
            throw err;
        })
    },

    getPromoCodesMonitor: (platformObjId, startAcceptedTime, endAcceptedTime, promoCodeType3Name) => {
        let monitorObjs;
        let promoCodeQuery = {
            'data.platformId': platformObjId,
            settleTime: {$gte: startAcceptedTime, $lt: endAcceptedTime},
            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            // We only want type 3 promo code
            "data.promoCodeTypeValue": 3
        };

        if (promoCodeType3Name) {
            promoCodeQuery["data.PROMO_CODE_TYPE"] = promoCodeType3Name
        }

        return dbProposalUtil.getProposalDataOfType(platformObjId, constProposalType.PLAYER_PROMO_CODE_REWARD, promoCodeQuery).then(
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
                        acceptedTime: p.settleTime,
                        isSharedWithXIMA: !p.data.useConsumption
                    }
                });

                monitorObjs.forEach((elem, index) => {
                    let withdrawPropQuery = {
                        'data.platformId': elem.platformObjId,
                        'data.playerObjId': elem.playerObjId,
                        settleTime: {$gt: elem.acceptedTime},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                    };

                    delProm.push(
                        dbProposalUtil.getOneProposalDataOfType(elem.platformObjId, constProposalType.PLAYER_BONUS, withdrawPropQuery).then(
                            withdrawProp => {
                                if (withdrawProp) {
                                    monitorObjs[index].nextWithdrawProposalId = withdrawProp.proposalId;
                                    monitorObjs[index].nextWithdrawAmount = withdrawProp.data.amount;
                                    monitorObjs[index].nextWithdrawTime = withdrawProp.settleTime;
                                }
                            }
                        )
                    );
                });

                return Promise.all(delProm);
            }
        ).then(
            () => {
                let proms = [];

                monitorObjs = monitorObjs.filter(e => e.nextWithdrawProposalId);

                monitorObjs.forEach((elem, index) => {
                    proms.push(
                        getPlayerConsumptionSummary(elem.platformObjId, elem.playerObjId, elem.acceptedTime, elem.nextWithdrawTime).then(
                            res => {
                                monitorObjs[index].consumptionBeforeWithdraw = res && res[0] ? dbUtility.noRoundTwoDecimalPlaces(res[0].validAmount) : 0;

                                return dbPlayerUtil.getPlayerCreditByObjId(elem.playerObjId);
                            }
                        ).then(
                            creditRes => {
                                monitorObjs[index].playerCredit = creditRes ? creditRes.gameCredit + dbUtility.noRoundTwoDecimalPlaces(creditRes.validCredit) + dbUtility.noRoundTwoDecimalPlaces(creditRes.lockedCredit) : 0;

                                return dbConfig.collection_proposal.find({
                                    'data.platformId': elem.platformObjId,
                                    'data.playerObjId': elem.playerObjId,
                                    settleTime: {$gt: elem.nextWithdrawTime},
                                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                                    mainType: "TopUp",
                                    'data.promoCode': {$exists: true}
                                }).sort({settleTime: 1}).limit(1).lean();
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
            () => monitorObjs
        )
    },

    getPromoCodeAnalysis: (platformObjId, data, isByPlayer) => {
        let playerProm = dbConfig.collection_players.findOne({
            platform: platformObjId,
            name: data.playerName
        }).lean();

        let index = data.index || 0;
        let limit = data.limit || 10;
        let querySort;
        if (data.sortCol) {
            querySort = data.sortCol;
        } else {
            querySort = {
                "sendCount": -1
            }
        }
        querySort._id = 1;

        let promoTypeQ = {
            platformObjId: platformObjId,
            type: data.promoCodeType
        };

        if (data.promoCodeSubType) {
            promoTypeQ.name = data.promoCodeSubType;
        }

        let promoTypeProm = dbConfig.collection_promoCodeType.find(promoTypeQ).lean();
        let promoTemplateProm = dbConfig.collection_promoCodeTemplate.find(promoTypeQ).lean();

        return Promise.all([playerProm, promoTypeProm, promoTemplateProm]).then(res => {
            let playerData = res[0];
            let promoCodeTypeData = res[1];
            let promoCodeTemplateData = res[2];
            let promoCodeTypeObjIds = promoCodeTypeData.map(e => e._id);
            let promoCodeTemplateObjIds = promoCodeTemplateData.map(e => e._id);

            let matchObj = {
                platformObjId: platformObjId,
                createTime: {$gte: new Date(data.startCreateTime), $lt: new Date(data.endCreateTime)}
            };

            if (playerData && playerData._id) {
                matchObj.playerObjId = playerData._id;
            }

            if (promoCodeTypeObjIds && promoCodeTypeObjIds.length > 0 && promoCodeTemplateObjIds && promoCodeTemplateObjIds.length > 0) {
                matchObj['$or'] = [
                    {promoCodeTypeObjId: {$in: promoCodeTypeObjIds}},
                    {promoCodeTemplateObjId: {$in: promoCodeTemplateObjIds}}
                ];
            } else if (promoCodeTypeObjIds && promoCodeTypeObjIds.length > 0) {
                matchObj.promoCodeTypeObjId = {$in: promoCodeTypeObjIds};
            } else if (promoCodeTemplateObjIds && promoCodeTemplateObjIds.length > 0) {
                matchObj.promoCodeTemplateObjId = {$in: promoCodeTemplateObjIds};
            }
            let aggregateQ;
            let distinctField;
            let summaryQ;
            if (isByPlayer) {
                aggregateQ =
                    [{
                        $match: matchObj
                    },
                        {
                            $project: {
                                playerObjId: 1,
                                acceptedCount: {$cond: [{$eq: ['$status', 2]}, 1, 0]},
                                acceptedAmount: 1,
                                amount: 1,
                                topUpAmount: 1,
                                totalRecord: {$sum: 1}
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
                        },
                        {$sort: querySort},
                        {$skip: index},
                        {$limit: limit}];

                summaryQ = [{
                    $match: matchObj
                },
                    {
                        $project: {
                            playerObjId: 1,
                            acceptedCount: {$cond: [{$eq: ['$status', 2]}, 1, 0]},
                            acceptedAmount: 1,
                            amount: 1,
                            topUpAmount: 1,
                            totalRecord: {$sum: 1}
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            amount: {$sum: "$amount"},
                            acceptedCount: {$sum: "$acceptedCount"},
                            acceptedAmount: {$sum: "$acceptedAmount"},
                            sendCount: {$sum: 1},
                            topUpAmount: {$sum: "$topUpAmount"}
                        }
                    }];

                distinctField = "playerObjId";
            } else {
                aggregateQ = [{
                    $match: matchObj
                },
                    {
                        $project: {
                            playerObjId: 1,
                            promoCodeTypeObjId: 1,
                            promoCodeTemplateObjId: 1,
                            acceptedCount: {$cond: [{$eq: ['$status', 2]}, 1, 0]},
                            acceptedAmount: 1,
                            amount: 1
                        }
                    },
                    {
                        $group: {
                            _id: {promoCodeTypeObjId: "$promoCodeTypeObjId", promoCodeTemplateObjId: "$promoCodeTemplateObjId"},
                            amount: {$sum: "$amount"},
                            acceptedCount: {$sum: "$acceptedCount"},
                            acceptedAmount: {$sum: "$acceptedAmount"},
                            sendCount: {$sum: 1},
                            totalPlayer: {$addToSet: {$cond: [{$eq: ['$acceptedCount', 1]}, "$playerObjId", "$null"]}}
                        }
                    },
                    {$sort: querySort},
                    {$skip: index},
                    {$limit: limit}];

                summaryQ = [{
                    $match: matchObj
                },
                    {
                        $project: {
                            playerObjId: 1,
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
                            sendCount: {$sum: 1},
                            totalPlayer: {$addToSet: {$cond: [{$eq: ['$acceptedCount', 1]}, "$playerObjId", "$null"]}}
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            amount: {$sum: "$amount"},
                            acceptedCount: {$sum: "$acceptedCount"},
                            acceptedAmount: {$sum: "$acceptedAmount"},
                            sendCount: {$sum: "$sendCount"},
                            totalPlayer:{ $sum:{ $size: "$totalPlayer"} }
                        }
                    }
                    ];
                distinctField = "promoCodeTypeObjId"
            }

            let prom = dbConfig.collection_promoCode.aggregate(aggregateQ).read("secondaryPreferred");
            let promCount = dbConfig.collection_promoCode.distinct(distinctField, matchObj);
            let promSummary = dbConfig.collection_promoCode.aggregate(summaryQ).read("secondaryPreferred");

            return Promise.all([prom, promCount, promSummary]);
        })
    },

    /**
     *
     * @param platformId
     * @param playerId
     * @param status
     * @param {Number} period - In past X hours
     * @returns {Promise<T>}
     */
    getLimitedOffers: (platformId, playerId, status, period) => {
        let platformObj;
        let rewardTypeData;
        let intPropTypeObj;
        let timeSet;
        let rewards;
        let playerObj;
        let levelObj;

        if (status) {
            status = Number(status);
        }

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
                rewardTypeData = res[0];
                intPropTypeObj = res[1];
                playerObj = res[2];

                return dbConfig.collection_playerLevel.find({
                    platform: platformObj._id
                }).sort({value: 1}).lean()
            }
        ).then(
            allLevelData => {
                levelObj = allLevelData;
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
                    let rewardPeriod = eventData.param.period;
                    rewards = eventData.param.reward;
                    timeSet = new Set();
                    let promArr = [];

                    rewards = rewards.filter(reward => {
                        return Number(reward.status) === 0;
                    });

                    // Set reward status
                    rewards.map(e => {
                        let status = 0;
                        timeSet.add(String(e.hrs + ":" + e.min));

                        e.startTime = moment().set({hour: e.hrs, minute: e.min, second: 0});
                        e.upTime = moment(e.startTime).subtract(e.inStockDisplayTime, 'minute');
                        e.downTime = moment(e.startTime).add(e.outStockDisplayTime, 'minute');

                        for (let i = 0; i < levelObj.length; i++) {
                            if (e.requiredLevel && e.requiredLevel.toString() == levelObj[i]._id.toString()) {
                                // e.requiredLevel = levelObj[i].name;
                                e.level = levelObj[i].name;
                            }
                        }

                        if (new Date().getTime() >= dbUtility.getLocalTime(e.startTime).getTime()
                            && new Date().getTime() < dbUtility.getLocalTime(e.downTime).getTime()) {
                            status = 1;
                        }

                        let proposalQuery = {
                            'data.platformObjId': platformObj._id,
                            'data.limitedOfferObjId': e._id,
                            type: intPropTypeObj._id
                        };

                        // Find intention within current reward period
                        if (rewardPeriod) {
                            let intentionTime;

                            switch (Number(rewardPeriod)) {
                                case constRewardPeriod.DAILY:
                                    intentionTime = dbUtility.getTodaySGTime();
                                    break;
                                case constRewardPeriod.WEEKLY:
                                    intentionTime = dbUtility.getCurrentWeekSGTime();
                                    break;
                                case constRewardPeriod.BIWEEKLY:
                                    intentionTime = dbUtility.getCurrentBiWeekSGTIme();
                                    break;
                                case constRewardPeriod.MONTHLY:
                                    intentionTime = dbUtility.getCurrentMonthSGTIme();
                                    break;
                            }

                            if (intentionTime) {
                                proposalQuery.createTime = {$gte: intentionTime.startTime, $lte: intentionTime.endTime};
                            }
                        }

                        // Find player's limited offer application
                        if (period) {
                            let timeInPassPeriodHours = dbUtility.getSGTimeOfPassHours(period);
                            if (proposalQuery.createTime) {
                                proposalQuery.createTime.$lte = timeInPassPeriodHours.endTime;
                                proposalQuery.createTime.$gte = proposalQuery.createTime.$gte > timeInPassPeriodHours.startTime ? proposalQuery.createTime.$gte : timeInPassPeriodHours.startTime;
                            }
                            else {
                                proposalQuery.createTime = {
                                    $gte: timeInPassPeriodHours.startTime,
                                    $lte: timeInPassPeriodHours.endTime
                                };
                            }
                        }

                        promArr.push(
                            dbConfig.collection_proposal.aggregate({
                                $match: proposalQuery
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
                                        let isOwnByPlayer = false;
                                        summ.map(f => {
                                            if (String(f._id) == String(playerId)) {
                                                status = 2;

                                                // Player paid
                                                if (f.paidCount > 0) {
                                                    status = 3;
                                                }
                                                isOwnByPlayer = true;
                                            }

                                            totalPromoCount += f.count;
                                        });

                                        if (totalPromoCount >= e.qty && !isOwnByPlayer) {
                                            status = 4;
                                        }

                                        if (status == 2 && new Date().getTime() > dbUtility.getLocalTime(e.downTime).getTime()) {
                                            status = 5;
                                        }
                                    }

                                    e.status = status;

                                    if (status == 2) {
                                        return dbConfig.collection_proposal.find({
                                            'data.platformObjId': platformObj._id,
                                            'data.limitedOfferObjId': e._id,
                                            type: intPropTypeObj._id,
                                            'data.playerId': playerId
                                        }).sort({createTime:-1}).limit(1).lean().then(
                                            proposalArray => {
                                                if (proposalArray && proposalArray[0]) {
                                                    return proposalArray[0];
                                                }
                                            }
                                        );
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

                        // Get provider group name from object ids
                        if (e.providers && e.providers.length > 0) {
                            let providerIds = e.providers;

                            promArr.push(
                                dbGameProvider.getGameProviders({_id: {$in: providerIds}}).then(providerObjs => {
                                    e.providers = providerObjs.map(g => g.name);
                                })
                            )
                        } else if (e && e.providerGroup) {
                            promArr.push(
                                dbGameProvider.getProviderGroupById(e.providerGroup).then(
                                    providerGroup => {
                                        if (providerGroup) {
                                            e.providerGroup = providerGroup.name
                                        }
                                    }
                                )
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
            () => {
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

                // Filter by status if any
                if (status && status !== 0) {
                    rewards = rewards.filter(e => {
                        if (period) {
                            return (e.status == status )
                        } else {
                            return (e.status == status ) && (new Date().getTime() < new Date(dbUtility.getLocalTime(e.downTime)).getTime()) && (new Date().getTime() >= new Date(dbUtility.getLocalTime(e.upTime)).getTime())
                        }
                    })
                } else if (status === 0) {
                    rewards = rewards.filter(e => {
                        return (e.status == status ) && (new Date().getTime() < new Date(dbUtility.getLocalTime(e.downTime)).getTime()) && (new Date().getTime() >= new Date(dbUtility.getLocalTime(e.upTime)).getTime())
                    })
                } else {
                    rewards = rewards.filter(e => {
                        return (new Date().getTime() < new Date(dbUtility.getLocalTime(e.downTime)).getTime()) && (new Date().getTime() >= new Date(dbUtility.getLocalTime(e.upTime)).getTime())
                    })
                }

                let orderedTimeSet = new Set(Array.from(timeSet).sort());

                return {
                    time: [...orderedTimeSet].join("/"),
                    showInfo: playerObj && playerObj.viewInfo ? playerObj.viewInfo.limitedOfferInfo : 1,
                    secretList: rewards.filter(e => Boolean(e.displayOriPrice) === false),
                    normalList: rewards.filter(e => Boolean(e.displayOriPrice) === true)
                }
            }
        );
    },

    applyLimitedOffers: (playerId, limitedOfferObjId, adminInfo, userAgent) => {
        let playerObj;
        let limitedOfferObj;
        let platformObj;
        let eventObj;
        let proposalTypeObj;
        let requiredLevelName;

        return dbConfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform", model: dbConfig.collection_platform
        }).populate({
            path: "playerLevel", model: dbConfig.collection_playerLevel
        }).lean().then(
            playerData => {
                if (playerData) {

                    if (playerData.permission && playerData.permission.banReward) {
                        return Q.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Player do not have permission for reward"
                        });
                    }

                    playerObj = playerData;
                    platformObj = playerData.platform;

                    //check if player is valid for reward
                    // if (playerObj.permission.PlayerLimitedOfferReward === false) {
                    //     return Q.reject({
                    //         status: constServerCode.PLAYER_NO_PERMISSION,
                    //         name: "DataError",
                    //         message: "Reward not applicable"
                    //     });
                    // }

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
                        }
                    });
                });

                if (dbRewardUtil.isRewardEventForbidden(playerObj, eventObj._id)) {
                    return Q.reject({name: "DataError", message: "Player does not have permission for this limited offer. Please contact cs for more detail."});
                }

                if (!dbRewardUtil.isRewardValidNow(eventObj)) {
                    return Promise.reject({
                        name: "DataError",
                        message: "This reward event is not valid anymore"
                    });
                }

                return dbConfig.collection_playerLevel.find({
                    platform: platformObj._id
                }).sort({value: 1}).lean();
            }
        ).then(
            allLevelData => {
                if (allLevelData && allLevelData.length > 0) {
                    let levelValue = 0;
                    let isReachMinLevel = false;

                    if (limitedOfferObj.requiredLevel) {
                        for (let i = 0; i < allLevelData.length; i++) {
                            if (limitedOfferObj.requiredLevel.toString() == allLevelData[i]._id.toString()) {
                                levelValue = allLevelData[i].value;
                                requiredLevelName = allLevelData[i].name;
                                break;
                            }
                        }
                    }

                    if (playerObj.playerLevel.value >= levelValue) {
                        isReachMinLevel = true;
                    }

                    if (isReachMinLevel) {
                        return dbConfig.collection_proposalType.findOne({
                            platformId: platformObj._id,
                            name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
                        }).lean();
                    } else {
                        return Q.reject({
                            status: constServerCode.FAILED_LIMITED_OFFER_CONDITION,
                            name: "DataError",
                            message: "Player level is not enough"
                        });
                    }
                } else {
                    return Q.reject({name: "DataError", message: "Error in getting player level"});
                }
            }
        ).then(
            proposalTypeData => {
                proposalTypeObj = proposalTypeData;
                let matchQuery = {
                    'data.platformObjId': platformObj._id,
                    'data.limitedOfferObjId': limitedOfferObj._id,
                    type: proposalTypeData._id
                };
                let queryTime = getRewardPeriodToTime(eventObj.param.period);
                if(queryTime && queryTime.startTime && queryTime.endTime)
                    matchQuery.createTime =  {$gte: queryTime.startTime, $lt: queryTime.endTime};
                return dbConfig.collection_proposal.aggregate({
                    $match: matchQuery
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
                    let totalCount = offerCount.reduce((sum, offerCount) =>sum + offerCount.count,0);
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
                        // return Q.reject({
                        //     status: constServerCode.FAILED_LIMITED_OFFER_CONDITION,
                        //     name: "DataError",
                        //     message: "Reward not applicable"
                        // });
                        return dbConfig.collection_proposal.findOne({
                            'data.limitedOfferObjId': {$in: [ObjectId(limitedOfferObj._id), String(limitedOfferObj._id)]},
                            'data.playerObjId': {$in: [ObjectId(playerObj._id), String(playerObj._id)]}
                        }).lean().then(
                            proposalData => {
                                if (proposalData && proposalData.data && proposalData.data.expirationTime) {
                                    proposalData.timeLeft = Math.abs(parseInt((new Date().getTime() - new Date(proposalData.data.expirationTime).getTime()) / 1000));
                                }
                                return proposalData;
                            }
                        );
                    }
                }

                let inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);
                let repeatDay = "";
                let selectedProvider = "";
                let isSelectAllProvider = false;
                if (limitedOfferObj.repeatWeekDay && limitedOfferObj.repeatWeekDay.length > 0) {
                    for (let i = 0; i < limitedOfferObj.repeatWeekDay.length; i++) {
                        switch (limitedOfferObj.repeatWeekDay[i]) {
                            case "1":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Mon";
                                break;
                            case "2":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Tue";
                                break;
                            case "3":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Wed";
                                break;
                            case "4":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Thu";
                                break;
                            case "5":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Fri";
                                break;
                            case "6":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Sat";
                                break;
                            case "7":
                                if (repeatDay) repeatDay += ", ";
                                repeatDay += "Sun";
                                break;
                        }
                    }
                }

                let expirationTime = new Date();
                expirationTime.setMinutes(expirationTime.getMinutes() + (Math.abs(Number(limitedOfferObj.limitTime)) || 30));

                // create reward proposal
                console.log("yH checking----limitedOfferObj.name",  limitedOfferObj.name)
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
                        // expirationTime: moment().add((Number(limitedOfferObj.limitTime) || 30), 'm').toDate(),
                        expirationTime: expirationTime,
                        eventId: eventObj._id,
                        eventName: eventObj.name + ' Intention',
                        eventCode: eventObj.code,
                        eventDescription: eventObj.description,
                        requiredLevel: requiredLevelName ? requiredLevelName : "",
                        remark: 'event name: ' + limitedOfferObj.name,
                        originalPrice: limitedOfferObj.oriPrice + "（" + (limitedOfferObj.displayOriPrice ? '显示' : '隐藏') + "）",
                        Quantity: limitedOfferObj.qty,
                        limitApplyPerPerson: limitedOfferObj.limitPerson,
                        topUpDuration: (limitedOfferObj.limitTime || 30) + "分钟",
                        startTime: moment().set({
                            hour: limitedOfferObj.hrs,
                            minute: limitedOfferObj.min,
                            second: 0
                        }).toDate(),
                        limitedOfferApplyTime: moment().toDate(),
                        repeatDay: repeatDay ? repeatDay : "",
                        // selectedProvider: selectedProvider? selectedProvider: ""
                        providerGroup: limitedOfferObj.providerGroup,
                        spendingTimes: limitedOfferObj.bet
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS,
                    inputDevice: inputDevice
                };

                let endTime = moment(proposalData.data.startTime).add(limitedOfferObj.outStockDisplayTime,'m').toDate();
                if (proposalData.data.expirationTime > endTime) {
                    proposalData.data.expirationTime = endTime;
                    let topUpDuration = Math.abs(parseInt((new Date().getTime() - new Date(proposalData.data.expirationTime).getTime()) / 1000));
                    proposalData.data.topUpDuration = (Math.floor((topUpDuration/60))) + "分钟";
                }
                return dbConfig.collection_platform.findOne({_id: playerObj.platform})
                    .populate({path: "gameProviders", model: dbConfig.collection_gameProvider}).lean().then(
                        providerData => {
                            if (limitedOfferObj.providers && limitedOfferObj.providers.length > 0
                                && providerData && providerData.gameProviders && providerData.gameProviders.length > 0) {
                                for (let j = 0; j < providerData.gameProviders.length; j++) {
                                    for (let k = 0; k < limitedOfferObj.providers.length; k++) {
                                        if (limitedOfferObj.providers[k] == providerData.gameProviders[j]._id.toString()) {
                                            if (selectedProvider) selectedProvider += ", "
                                            selectedProvider += providerData.gameProviders[j].name;
                                        }
                                    }
                                }
                                if (limitedOfferObj.providers.length == providerData.gameProviders.length) {
                                    isSelectAllProvider = true;
                                }
                                if (isSelectAllProvider) {
                                    selectedProvider = "ALL"
                                }
                                proposalData.data.selectedProvider = selectedProvider ? selectedProvider : "";
                            }

                            return dbProposal.createProposalWithTypeId(proposalTypeObj._id, proposalData).then(
                                proposalData => {
                                    if (proposalData && proposalData.data && proposalData.data.expirationTime) {
                                        proposalData.timeLeft = Math.abs(parseInt((new Date().getTime() - new Date(proposalData.data.expirationTime).getTime()) / 1000));
                                    }
                                    return proposalData;
                                }
                            );
                        }
                    );

            }
        )
    },

    getLimitedOfferReport: (platformObjId, startTime, endTime, playerName, promoName, status, level, inputDevice) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
        }).lean().then(
            propType => {
                if (propType) {
                    let levelArray = [];
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

                    if (inputDevice && inputDevice.length > 0) {
                        matchQ.inputDevice = {$in: inputDevice};
                    }

                    if (level && level.length > 0) {
                        let levelName = [];
                        let bNormal = false;
                        for (let i = 0; i < level.length; i++) {
                            if (level[i].value == 0) {
                                bNormal = true;
                                //check if data.requiredLevel field is exist but no data
                                levelName.push("");
                            }
                            levelName.push(level[i].name);
                        }
                        if (!bNormal && levelName.length > 0) {
                            matchQ['data.requiredLevel'] = {$in: levelName};
                        }
                        else if (bNormal && levelName.length > 0) {
                            matchQ.$or = [];
                            matchQ.$or.push({"data.requiredLevel": {$in: levelName}});
                            matchQ.$or.push({"data.requiredLevel": {$exists: false}});
                        }
                    }
                    return dbConfig.collection_proposal.find(matchQ).lean();
                }
            }
        ).then(
            intProps => {
                if (intProps && intProps.length > 0) {
                    let promArr = [];
                    let validProposal = [];
                    let acceptedProposal = [];
                    let expiredProposal = [];
                    let returnedArray = [];

                    intProps.forEach(proposal => {
                        if (proposal.hasOwnProperty("data") && proposal.data.topUpProposalId && !proposal.data.rewardProposalId) {
                            promArr.push(
                                dbConfig.collection_proposal.findOne({
                                    mainType: constProposalMainType.PlayerLimitedOfferReward,
                                    'data.topUpProposalId': proposal.data.topUpProposalId
                                }, {
                                    proposalId: 1
                                }).lean().then(
                                    rewardProposal => {
                                        if (rewardProposal && rewardProposal.proposalId) {
                                            proposal.data.rewardProposalId = rewardProposal.proposalId;
                                        }
                                    }
                                )
                            );
                        }
                    });

                    return Promise.all(promArr).then(
                        () => {
                            for (let j = 0; j < intProps.length; j++) {
                                if (intProps[j].data) {
                                    if ((intProps[j].data.expirationTime > new Date()) && !intProps[j].data.topUpProposalId) {
                                        intProps[j].claimStatus = "STILL VALID";
                                    } else if ((intProps[j].data.expirationTime < new Date()) && !intProps[j].data.topUpProposalId) {
                                        intProps[j].claimStatus = "EXPIRED";
                                    } else {
                                        intProps[j].claimStatus = "ACCEPTED";
                                    }
                                }
                            }

                            if (status && status.length > 0) {
                                for (let i = 0; i < status.length; i++) {
                                    if (status[i] == "STILL VALID") {
                                        validProposal = intProps.filter(function (event) {
                                            if (event && event.data) {
                                                return (event.data.expirationTime > new Date()) && (!event.data.topUpProposalId);
                                            }
                                        });
                                    }

                                    if (status[i] == "ACCEPTED") {
                                        acceptedProposal = intProps.filter(function (event) {
                                            if (event && event.data) {
                                                return (event.data.topUpProposalId);
                                            }
                                        });
                                    }

                                    if (status[i] == "EXPIRED") {
                                        expiredProposal = intProps.filter(function (event) {
                                            if (event && event.data) {
                                                return (event.data.expirationTime < new Date()) && (!event.data.topUpProposalId);
                                            }
                                        });
                                    }
                                }
                            } else {
                                return intProps;
                            }

                            return returnedArray.concat(validProposal).concat(acceptedProposal).concat(expiredProposal).sort(function (a, b) {
                                return a.proposalId - b.proposalId
                            });
                        }
                    );
                }
            }
        )
    },

    getLimitedOfferBonus: (platformId, period = 4) => {
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

                let startTime = moment().subtract(period, "hours");

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
                        accountNo: dbUtility.encodePlayerName(e.data.playerName),
                        bonus: e.data.applyAmount + e.data.rewardAmount,
                        time: e.createTime
                    }
                })
            }
        )


    },

    updatePromoCodesActive: (platformObjId, data) => {
        if (data.flag) {
            dbConfig.collection_promoCode.update({
                platformObjId: platformObjId,
                acceptedTime: {$not: {$gte: new Date(data.startAcceptedTime), $lt: new Date(data.endAcceptedTime)}},
                isActive: true
            }, {
                $set: {
                    isActive: false
                }
            }, {
                multi: true
            }).exec().catch(errorUtils.reportError);

            dbConfig.collection_promoCodeActiveTime({
                platform: platformObjId,
                startTime: new Date(data.startAcceptedTime),
                endTime: new Date(data.endAcceptedTime)
            }).save().catch(errorUtils.reportError);
        }

        return dbConfig.collection_promoCode.update({
            platformObjId: platformObjId,
            acceptedTime: {$gte: new Date(data.startAcceptedTime), $lt: new Date(data.endAcceptedTime)}
        }, {
            $set: {
                isActive: data.flag
            }
        }, {
            multi: true
        }).exec();
    },

    checkRewardParamForBonusDoubledRewardGroup: (eventData, playerData, intervalTime, selectedProviderList, forceSettled) => {
        let selectedRewardParam = null;
        let rewardParam;
        let bonusAmount = 0;
        let rate = 0;
        let totalBetAmount = 0;
        let playerBonusDoubledRewardGroupRecord;
        let consumptionRecordList;
        let todayTime = dbUtility.getTodaySGTime();
        let newEndTime = new Date();
        let isAbnormal = false

        if (!selectedProviderList){
            return Promise.reject({
                name: "DataError",
                message: "game provider is not selected"
            })
        }

        // Set reward param for player level to use
        if (eventData.condition.isPlayerLevelDiff) {
            rewardParam = eventData.param.rewardParam.filter(e => e.levelId == String(playerData.playerLevel))[0].value;
        } else {
            rewardParam = eventData.param.rewardParam[0].value;
        }

        let recordQuery = {
            platformObjId: playerData.platform._id,
            rewardEventObjId: eventData._id,
            playerObjId: playerData._id,
            isApplying: true,
            lastApplyDate: {$gte: todayTime.startTime, $lte: todayTime.endTime}
        };

        if (intervalTime) {
            recordQuery.lastApplyDate = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
        }

        return dbConfig.collection_playerBonusDoubledRewardGroupRecord.findOne(recordQuery).lean().then(
            recordData => {
                console.log("checking playerBonusDoubledRewardGroupRecord when settle the reward bonus", recordData)
                playerBonusDoubledRewardGroupRecord = recordData;
                // special handling for abnormal case where transfer-in record is lost
                if (recordData && (!recordData.transferInAmount || !recordData.transferInTime && !recordData.gameProviderObjId)){
                    isAbnormal = true;
                    return;
                }

                if (recordData && recordData.transferInAmount && recordData.transferInTime && recordData.gameProviderObjId && (recordData.transferOutTime || forceSettled)){
                    // get the win-lose amount
                    let matchQuery = {
                        providerId: {$in: selectedProviderList.map(p => ObjectId(p))},
                        playerId: playerData._id,
                        platformId: playerData.platform._id,
                        // createTime: {$gte: recordData.transferInTime, $lt: recordData.transferOutTime}
                    };

                    if (forceSettled){
                        matchQuery.createTime = {$gte: recordData.transferInTime, $lt: newEndTime};
                    }
                    else{
                        matchQuery.createTime = {$gte: recordData.transferInTime, $lt: recordData.transferOutTime}
                    }

                    console.log("checking matchQuery", [playerData.playerId, matchQuery])

                    return dbConfig.collection_playerConsumptionRecord.aggregate([
                        {$match: matchQuery},
                        {$group: {
                            _id: null,
                            bonusAmount: {$sum: "$bonusAmount"},
                            consumptionRecordList: {$addToSet: "$_id"},
                            betAmount: {$sum: "$amount"},
                        }}
                    ]).read("secondaryPreferred");
                }
                else{
                    return Promise.reject({
                        name: "DataError",
                        message: "The requirement is not fulfilled"
                    })
                }
            }
        ).then(
            consumptionRecord => {
                console.log("checking consumptionRecord", [playerData.playerId, consumptionRecord])
                if (consumptionRecord && consumptionRecord.length && playerBonusDoubledRewardGroupRecord && rewardParam){
                    bonusAmount = consumptionRecord[0].bonusAmount;
                    consumptionRecordList = consumptionRecord[0].consumptionRecordList;
                    totalBetAmount = consumptionRecord[0].betAmount;
                    let transferInAmount = playerBonusDoubledRewardGroupRecord.transferInAmount;
                    rate = bonusAmount/transferInAmount;

                    selectedRewardParam = rewardParam.filter(e => rate >= e.multiplier).sort((a, b) => b.multiplier - a.multiplier);
                    selectedRewardParam = selectedRewardParam[0] || null;
                }
                console.log("checking returnList", [playerData.playerId, {selectedRewardParam: selectedRewardParam, winLoseAmount: bonusAmount, winTimes: rate, totalBetAmount: totalBetAmount}]);
                let returnList = {
                    selectedRewardParam: selectedRewardParam,
                    record: playerBonusDoubledRewardGroupRecord,
                    consumptionRecordList: consumptionRecordList,
                    winLoseAmount: bonusAmount,
                    winTimes: rate,
                    totalBetAmount: totalBetAmount
                };

                console.log("checking is isAbnormal", isAbnormal)
                if (forceSettled || isAbnormal){
                    returnList.newEndTime = newEndTime;
                }
                return returnList;
            }
        )
    },

    /**
     *
     * @param userAgent
     * @param playerData
     * @param eventData
     * @param adminInfo
     * @param rewardData
     * @param isPreview
     * @param isBulkApply - if it is settlement apply from backstage, is bulk apply
     * @returns {Promise.<TResult>}
     */
    applyGroupReward: (userAgent, playerData, eventData, adminInfo, rewardData, isPreview, isBulkApply) => {
        rewardData = rewardData || {};

        let todayTime = rewardData.applyTargetDate ? dbUtility.getTargetSGTime(rewardData.applyTargetDate).startTime : dbUtility.getTodaySGTime();
        rewardData.applyTargetDate = rewardData.applyTargetDate || todayTime.startTime;
        // let todayTime = rewardData.applyTargetDate ? dbUtility.getTargetSGTime(rewardData.applyTargetDate): dbUtility.getYesterdaySGTime();
        let rewardAmount = 0, spendingAmount = 0, applyAmount = 0, actualAmount = 0;
        let promArr = [];
        let selectedRewardParam = {};
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
        let showRewardPeriod = {};
        let intervalRewardSum = 0, intervalConsumptionSum = 0, intervalTopupSum = 0, intervalBonusSum = 0, playerCreditLogSum = 0;
        let lastConsumptionRecord;
        let baccaratConsumptionRecord;
        let lastConsumptionProm;

        let ignoreTopUpBdirtyEvent = eventData.condition.ignoreAllTopUpDirtyCheckForReward;

        // reject the reward application if it is applied from front-end but the setting is settlement (back-end)
        if (dbUtility.getInputDevice(userAgent, false, adminInfo) != 0 && eventData.condition && eventData.condition.applyType && eventData.condition.applyType == 3){
            return Promise.reject({
                name: "DataError",
                message: "The way of applying this reward is not correct."
            })
        }

        // Set reward param for player level to use
        if (eventData.condition.isPlayerLevelDiff) {
            selectedRewardParam = eventData.param.rewardParam.filter(e => e.levelId == String(playerData.playerLevel))[0].value;
        } else {
            selectedRewardParam = eventData.param.rewardParam[0].value;
        }

        // Get interval time
        if (eventData.condition.interval) {
            intervalTime = dbRewardUtil.getRewardEventIntervalTime(rewardData, eventData);
            if (eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                intervalTime = dbRewardUtil.getRewardEventIntervalTime(rewardData, eventData, true);
            }
        }

        let topupMatchQuery = {
            playerId: playerData._id,
            platformId: playerData.platform._id
        };

        let eventQueryPeriodTime = dbRewardUtil.getRewardEventIntervalTime({applyTargetDate: new Date()}, eventData);
        let eventQuery = {
            "data.platformObjId": playerData.platform._id,
            "data.playerObjId": playerData._id,
            "data.eventId": eventData._id,
            status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            $or: [
                {"data.applyTargetDate": {$gte: todayTime.startTime, $lt: todayTime.endTime}},
                {"data.applyTargetDate": {$exists: false}, createTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}}
            ],
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

        // Check registration interface condition
        if (dbRewardUtil.checkInterfaceRewardPermission(eventData, rewardData)) {
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
            if (rewardData.applyTargetDate) {
                eventQuery["$or"] = [
                    {"data.applyTargetDate": {$gte: eventQueryPeriodTime.startTime, $lt: eventQueryPeriodTime.endTime}},
                    {"data.applyTargetDate": {$exists: false}, createTime: {$gte: eventQueryPeriodTime.startTime, $lt: eventQueryPeriodTime.endTime}}
                ];
            } else {
                eventQuery["$or"] = [
                    {"data.applyTargetDate": {$gte: intervalTime.startTime, $lt: intervalTime.endTime}},
                    {"data.applyTargetDate": {$exists: false}, createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime}}
                ];
            }
            // NOTE :: Use apply target date instead. There are old records that does not have applyTargetDate field,
            // so createTime is checked if applyTargetDate does not exist - Huat
        }

        let topupInPeriodProm = dbConfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
        let eventInPeriodProm = dbConfig.collection_proposal.find(eventQuery).lean();

        // reward specific promise
        if (eventData.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP || eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
            if (rewardData && rewardData.selectedTopup) {
                selectedTopUp = rewardData.selectedTopup;
                applyAmount = rewardData.selectedTopup.oriAmount || rewardData.selectedTopup.amount;
                actualAmount = rewardData.selectedTopup.amount;

                let withdrawPropQuery = {
                    'data.platformId': playerData.platform._id,
                    'data.playerObjId': playerData._id,
                    createTime: {$gt: selectedTopUp.createTime},
                    status: {$nin: [constProposalStatus.PREPENDING, constProposalStatus.REJECTED, constProposalStatus.FAIL, constProposalStatus.CANCEL]}
                };

                promArr.push(dbProposalUtil.getOneProposalDataOfType(playerData.platform._id, constProposalType.PLAYER_BONUS, withdrawPropQuery));

                if (eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                    // check is there consumption after the top up
                    let consumptionPropQuery = {
                        platformId: playerData.platform._id,
                        playerId: playerData._id,
                        createTime: {$gt: selectedTopUp.createTime},
                    };
                    promArr.push(dbConfig.collection_playerConsumptionRecord.findOne(consumptionPropQuery).lean());

                    // check the requirement
                    promArr.push(dbRewardUtil.checkApplyRetentionReward(playerData, eventData, applyAmount, null, selectedTopUp.topUpType, selectedTopUp));
                }
            }
        }

        if (eventData.type.name === constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP) {
            let playerRewardDetailProm = dbPlayerReward.getPlayerConsecutiveRewardDetail(playerData.playerId, eventData.code, true, null, rewardData.applyTargetDate, null, isBulkApply);
            promArr.push(playerRewardDetailProm);
        }

        if (eventData.type.name === constRewardType.BACCARAT_REWARD_GROUP) {
            let playerRewardDetailProm = dbPlayerReward.getPlayerBaccaratRewardDetail(null, playerData.playerId, eventData.code, true, rewardData.applyTargetDate);
            promArr.push(playerRewardDetailProm);
        }

        if (eventData.type.name === constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP) {
            // set the settlement date for eventQuery and topupMatchQuery based on intervalTime
            if(intervalTime){
                eventQuery["$or"] = [
                    {"data.applyTargetDate": {$gte: intervalTime.startTime, $lt: intervalTime.endTime}},
                    {"data.applyTargetDate": {$exists: false}, createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime}}
                ];
                topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            let rewardDetailProm = [];

            if (!isPreview && !isBulkApply && !rewardData.appliedRewardList){

                return Promise.reject({
                    name: "DataError",
                    message: "No data is selected"
                })
            }

            rewardDetailProm = dbPlayerReward.getPlayerConsumptionSlipRewardDetail(rewardData, playerData.playerId, eventData.code, rewardData.applyTargetDate, isBulkApply);

            promArr.push(rewardDetailProm);
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
                isDuplicate: {$ne: true},
            };

            if (intervalTime) {
                consumptionMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                // eventQuery["data.applyTargetDate"] = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                eventQuery["$or"] = [
                    {"data.applyTargetDate": {$gte: intervalTime.startTime, $lt: intervalTime.endTime}},
                    {"data.applyTargetDate": {$exists: false}, createTime: {$gte: intervalTime.startTime, $lt: intervalTime.endTime}}
                ];

                topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            if (eventData.condition.consumptionProvider && eventData.condition.consumptionProvider.length > 0) {
                let consumptionProviders = [];
                eventData.condition.consumptionProvider.forEach(providerId => {
                    consumptionProviders.push(ObjectId(providerId));
                });
                consumptionMatchQuery.providerId = {$in: consumptionProviders};
            }

            let periodConsumptionProm = dbConfig.collection_playerConsumptionRecord.aggregate([
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

            let periodTopupProm = dbConfig.collection_playerTopUpRecord.aggregate(
                {
                    $match: topupMatchQuery
                }
            );
            promArr.push(periodTopupProm);
            let periodPropsProm = dbConfig.collection_proposal.find(eventQuery).lean();
            promArr.push(periodPropsProm);

            lastConsumptionProm = dbConfig.collection_playerConsumptionRecord.find(consumptionMatchQuery).sort({createTime: -1}).limit(1).lean();

            // check reward apply restriction on ip, phone and IMEI
            let checkHasReceivedProm = dbProposalUtil.checkRestrictionOnDeviceForApplyReward(intervalTime, playerData, eventData);
            promArr.push(checkHasReceivedProm);
        }


        if (eventData.type.name == constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP) {
            let promiseUsed = [];
            let calculateLosses;

            // set the settlement date for eventQuery and topupMatchQuery based on intervalTime
            if(intervalTime){
                eventQuery["$or"] = [
                    {"data.applyTargetDate": {$gte: new Date(intervalTime.startTime), $lt: new Date(intervalTime.endTime)}},
                    {"data.applyTargetDate": {$exists: false}, createTime: {$gte: new Date(intervalTime.startTime), $lt: new Date(intervalTime.endTime)}}
                ];
                topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
            }

            // special settlement time handling for for this case: the settlement endTime will be the previewing-time
            if (rewardData.previewDate) {
                eventQuery["$or"] = [
                    {"data.applyTargetDate": {$gte: new Date(intervalTime.startTime), $lte: dbUtility.getSGTimeOf(rewardData.previewDate)}},
                    {"data.applyTargetDate": {$exists: false}, createTime: {$gte: new Date(intervalTime.startTime), $lte: dbUtility.getSGTimeOf(rewardData.previewDate)}}
                ];
                topupMatchQuery.createTime = {$gte: intervalTime.startTime, $lt: dbUtility.getSGTimeOf(rewardData.previewDate)};
            }

            console.log("checking in PLAYER_LOSE_RETURN_REWARD_GROUP --eventQuery", eventQuery)
            console.log("checking in PLAYER_LOSE_RETURN_REWARD_GROUP --topupMatchQuery", topupMatchQuery)

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

                    // if there is
                    if (rewardData.previewDate){
                        bonusQuery.settleTime = {$gte: intervalTime.startTime, $lte: dbUtility.getSGTimeOf(rewardData.previewDate)};
                    }

                    console.log('checking bonusQuery', bonusQuery)


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
                    if (intervalTime) {
                        totalTopupMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                    }

                    if (rewardData.previewDate){
                        totalTopupMatchQuery.createTime = {$gte: intervalTime.startTime, $lte: dbUtility.getSGTimeOf(rewardData.previewDate)};
                    }

                    console.log("checking totalTopupMatchQuery", totalTopupMatchQuery)


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

                    if (intervalTime) {
                        creditsDailyLogQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
                    }

                    if (rewardData.previewDate){
                        creditsDailyLogQuery.createTime = {$gte: intervalTime.startTime, $lte: dbUtility.getSGTimeOf(rewardData.previewDate)};
                    }

                    console.log("checking creditsDailyLogQuery", creditsDailyLogQuery)

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

                    allRewardProm = dbConfig.collection_proposal.aggregate(
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

                    if (rewardData.previewDate) {
                        consumptionQuery.createTime = {$gte: intervalTime.startTime, $lte: dbUtility.getSGTimeOf(rewardData.previewDate)};
                        if (allRewardProm) allRewardQuery.settleTime = {
                            $gte: intervalTime.startTime,
                            $lte:  dbUtility.getSGTimeOf(rewardData.previewDate)
                        };
                    }
                    // promArr.push(totalConsumptionAmount);
                    // if (allRewardProm) promArr.push(allRewardProm);
                    lastConsumptionProm = dbConfig.collection_playerConsumptionRecord.find(consumptionQuery).sort({createTime: -1}).limit(1).lean();

                    break;
                default:
                // reject error
            }
            eventInPeriodProm = dbConfig.collection_proposal.find(eventQuery).lean();
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

            lastConsumptionProm = dbConfig.collection_playerConsumptionRecord.find(consumptionQuery).sort({createTime: -1}).limit(1).lean();
        }

        if (eventData.type.name === constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP) {
            console.log('first if - ');
            let freeTrialQuery = {
                platformId: playerData.platform._id,
                playerId: playerData._id,
                createTime: {$gte: eventData.condition.validStartTime, $lte: eventData.condition.validEndTime}
            };

            // check during this period interval
            if (intervalTime) {
                freeTrialQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            }

            lastConsumptionProm = dbConfig.collection_playerConsumptionRecord.find(freeTrialQuery).sort({createTime: -1}).limit(1).lean();

            // check reward apply limit in period
            let countInRewardInterval = dbConfig.collection_proposal.aggregate(
                {
                    $match: {
                        "createTime": freeTrialQuery.createTime,
                        "data.eventId": eventData._id,
                        "status": constProposalStatus.APPROVED,
                        "data.playerObjId": playerData._id,
                        /*
                        $or: [
                            {'data.playerObjId': playerData._id},
                            {'data.lastLoginIp': playerData.lastLoginIp},
                            {'data.phoneNumber': playerData.phoneNumber},
                            {'data.deviceId': playerData.deviceId},
                        ]
                        */
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
            ).read("secondaryPreferred").then(
                countReward => { // display approved proposal data during this event period
                    console.log('proposal aggregate - 1', countReward.length);
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
            let checkSMSProm = Promise.resolve(true); // default promise as true if sms checking is not required
            if (eventData.condition.needSMSVerification && !adminInfo) {
                checkSMSProm = dbPlayerMail.verifySMSValidationCode(playerData.phoneNumber, playerData.platform, rewardData.smsCode);
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
                checkForbidRewardProm = dbConfig.collection_proposal.aggregate(
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

            promArr.push(countInRewardInterval.then(data => {console.log('countInRewardInterval'); return data;}));
            promArr.push(checkSMSProm.then(data => {console.log('checkSMSProm'); return data;}));
            promArr.push(checkForbidRewardProm.then(data => {console.log('checkForbidRewardProm'); return data;}).catch(errorUtils.reportError));
        }

        return Promise.all([topupInPeriodProm, eventInPeriodProm, Promise.all(promArr), lastConsumptionProm]).then(
            data => {
                let topupInPeriodData = data[0];
                let eventInPeriodData = data[1];
                let rewardSpecificData = data[2];
                lastConsumptionRecord = data[3] && data[3][0] ? data[3][0] : {};
                let topupInPeriodCount = topupInPeriodData.length;
                let eventInPeriodCount = eventInPeriodData.length;
                let rewardAmountInPeriod = eventInPeriodData.reduce((a, b) => a + b.data.rewardAmount, 0);

                // Check reward apply limit in period
                if (eventData.param.countInRewardInterval && eventData.param.countInRewardInterval <= eventInPeriodCount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Player has applied for max reward times in event period"
                    });
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
                            if (intervalTime && !isDateWithinPeriod(selectedTopUp.createTime, intervalTime)) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "This top up did not happen within reward interval time"
                                });
                            }

                            // Check withdrawal after top up condition
                            if (!eventData.condition.allowApplyAfterWithdrawal && rewardSpecificData && rewardSpecificData[0]) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "There is withdrawal after topup"
                                });
                            }

                            let lastTopUpRecord = topupInPeriodData[topupInPeriodData.length-1];

                            if (eventData.condition.allowOnlyLatestTopUp && lastTopUpRecord && rewardData && rewardData.selectedTopup) {
                                if (lastTopUpRecord._id.toString() !== rewardData.selectedTopup._id.toString()) {
                                    return Promise.reject({
                                        status: constServerCode.INVALID_DATA,
                                        name: "DataError",
                                        message: "This is not the latest top up record"
                                    });
                                }
                            }

                            // check correct topup type
                            let correctTopUpType = true;

                            if (eventData.condition.topupType && eventData.condition.topupType.length > 0 && eventData.condition.topupType.indexOf(selectedTopUp.topUpType) === -1) {
                                correctTopUpType = false;
                            }

                            if (eventData.condition.onlineTopUpType && selectedTopUp.merchantTopUpType && eventData.condition.onlineTopUpType.length > 0 && eventData.condition.onlineTopUpType.indexOf(selectedTopUp.merchantTopUpType) === -1) {
                                correctTopUpType = false;
                            }

                            if (eventData.condition.bankCardType && selectedTopUp.bankCardType && eventData.condition.bankCardType.length > 0 && eventData.condition.bankCardType.indexOf(selectedTopUp.bankCardType) === -1) {
                                correctTopUpType = false;
                            }

                            // Set reward param step to use
                            if (eventData.param.isMultiStepReward) {
                                if (eventData.param.isSteppingReward) {
                                    let eventStep = eventInPeriodCount >= selectedRewardParam.length ? selectedRewardParam.length - 1 : eventInPeriodCount;
                                    selectedRewardParam = selectedRewardParam[eventStep];
                                } else {
                                    let firstRewardParam = selectedRewardParam[0];
                                    selectedRewardParam = selectedRewardParam.filter(e => Math.trunc(applyAmount) >= Math.trunc(e.minTopUpAmount)).sort((a, b) => b.minTopUpAmount - a.minTopUpAmount);
                                    selectedRewardParam = selectedRewardParam[0] || firstRewardParam || {};
                                }
                            } else {
                                selectedRewardParam = selectedRewardParam[0];
                            }

                            if (applyAmount < selectedRewardParam.minTopUpAmount || !correctTopUpType) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "您需要有新存款(" + selectedRewardParam.minTopUpAmount + ")元才能领取此优惠，千万别错过了！"
                                });
                            }

                            if (eventData.condition.isDynamicRewardAmount) {
                                rewardAmount = applyAmount * selectedRewardParam.rewardPercentage;
                                if (selectedRewardParam.maxRewardInSingleTopUp && selectedRewardParam.maxRewardInSingleTopUp > 0) {
                                    rewardAmount = Math.min(rewardAmount, Number(selectedRewardParam.maxRewardInSingleTopUp));
                                }

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

                                selectedRewardParam.spendingTimes = selectedRewardParam.spendingTimes || 1;
                                //spendingAmount = (applyAmount + rewardAmount) * selectedRewardParam.spendingTimes;
                                spendingAmount = (actualAmount + rewardAmount) * selectedRewardParam.spendingTimes;
                            } else {
                                rewardAmount = selectedRewardParam.rewardAmount;
                                selectedRewardParam.spendingTimesOnReward = selectedRewardParam.spendingTimesOnReward || 0;
                                spendingAmount = selectedRewardParam.rewardAmount * selectedRewardParam.spendingTimesOnReward;
                            }

                            // Set top up record update flag
                            isUpdateTopupRecord = true;

                            // Set player valid credit update flag
                            if (/*eventData.condition.providerGroup &&*/ eventData.condition.isDynamicRewardAmount) {
                                isUpdateValidCredit = true;
                            }
                        }
                        else {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Invalid top up"
                            });
                        }
                        break;

                    case constRewardType.PLAYER_RETENTION_REWARD_GROUP:
                        let lastTopUpRecord = null;

                        // rewardSpecificData[2] is the result of the checking list; return true if pass all the checks
                        if (rewardData && rewardData.selectedTopup && rewardSpecificData[2]) {
                            if (intervalTime && !isDateWithinPeriod(selectedTopUp.createTime, intervalTime)) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "This top up did not happen within reward interval time"
                                });
                            }

                            if (topupInPeriodData && topupInPeriodData.length){
                                lastTopUpRecord = topupInPeriodData[topupInPeriodData.length-1];
                            }

                            if (eventData.condition.allowOnlyLatestTopUp && lastTopUpRecord && rewardData && rewardData.selectedTopup) {
                                // check if the top up record is the latest
                                if (lastTopUpRecord._id.toString() !== rewardData.selectedTopup._id.toString()) {
                                    return Promise.reject({
                                        status: constServerCode.INVALID_DATA,
                                        name: "DataError",
                                        message: "This is not the latest top up record"
                                    });
                                }

                                //check if there is consumption after this top up
                                if (rewardSpecificData && rewardSpecificData[1]){
                                    return Promise.reject({
                                        status: constServerCode.INVALID_DATA,
                                        name: "DataError",
                                        message: "There is consumption after top up"
                                    });
                                }

                                //check if there is withdrawal after this top up
                                if (rewardSpecificData && rewardSpecificData[0]){
                                    return Promise.reject({
                                        status: constServerCode.INVALID_DATA,
                                        name: "DataError",
                                        message: "There is withdrawal after top up"
                                    });
                                }
                            }

                            // applying reward
                            let retRewardData = dbPlayerReward.applyRetentionRewardParamLevel(eventData, applyAmount, selectedRewardParam);

                            if (retRewardData && retRewardData.selectedRewardParam && retRewardData.rewardAmount != null && retRewardData.spendingAmount != null){
                                rewardAmount = retRewardData.rewardAmount;
                                spendingAmount = retRewardData.spendingAmount;
                                selectedRewardParam = retRewardData.selectedRewardParam
                                consecutiveNumber = retRewardData.consecutiveNumber || null;
                            }
                            else{
                                return Promise.reject({
                                    status: constServerCode.INVALID_DATA,
                                    name: "DataError",
                                    message: "Cannot get the reward data"
                                })
                            }

                            // Set top up record update flag
                            isUpdateTopupRecord = true;

                            // Set player valid credit update flag
                            if (/*eventData.condition.providerGroup &&*/ eventData.condition.isDynamicRewardAmount) {
                                isUpdateValidCredit = true;
                            }
                        }
                        else {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Invalid top up"
                            });
                        }
                        break;

                    case constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP:
                        isMultiApplication = true;
                        applyAmount = 0;

                        let playerRewardFinalList = rewardSpecificData[0];

                        console.log("checking this playerRewardFinalList", [playerData.playerId, playerRewardFinalList])

                        if (playerRewardFinalList.appliedCount >= playerRewardFinalList.availableQuantity){
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Exceeded available application quantity"
                            })
                        }

                        if (!rewardSpecificData || !rewardSpecificData[0]) {
                            return Q.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "No available consumption list for the reward"
                            });
                        }

                        if (playerRewardFinalList && playerRewardFinalList.list && playerRewardFinalList.list.length){

                            if (isBulkApply){
                                // sorting from high rewardAmount to low rewardAmount to apply
                                playerRewardFinalList.list.sort((a, b) => {
                                    if (parseFloat(a.rewardAmount) < parseFloat(b.rewardAmount))
                                        return 1;
                                    if (parseFloat(a.rewardAmount) > parseFloat(b.rewardAmount))
                                        return -1;

                                    return 0;
                                })

                            }

                            let applicableNumber = playerRewardFinalList.availableQuantity - playerRewardFinalList.appliedCount;
                            // if isBulkApply/backStage/frontEnd apply -> select the list based on the applicableNumber to apply
                            if (playerRewardFinalList.list.length > applicableNumber && !isPreview){

                                for(let i = 0; i < applicableNumber; i++){

                                    if (rewardData.appliedRewardList){
                                        // arrange the playerRewardFinalList.list based on the order when the input is keyed in
                                        let index = playerRewardFinalList.list.findIndex( p => {
                                            if (p._id && rewardData.appliedRewardList[i]) {
                                                return p._id.toString() == rewardData.appliedRewardList[i]
                                            }
                                            else
                                            {
                                                return false;
                                            }
                                        })
                                        if (index != -1 && playerRewardFinalList.list[index]){
                                            playerRewardFinalList.list[index].spendingAmount = (playerRewardFinalList.list[index].spendingTimes || 1) * playerRewardFinalList.list[index].rewardAmount;
                                            playerRewardFinalList.list[index].isSharedWithXIMA = eventData.condition && eventData.condition.isSharedWithXIMA ? eventData.condition.isSharedWithXIMA : false;
                                            playerRewardFinalList.list[index].targetDate = intervalTime;
                                            applicationDetails.push(playerRewardFinalList.list[index]);
                                        }
                                    }
                                    // for the case of isBulkApply
                                    else{
                                        playerRewardFinalList.list[i].spendingAmount = (playerRewardFinalList.list[i].spendingTimes || 1) * playerRewardFinalList.list[i].rewardAmount;
                                        playerRewardFinalList.list[i].isSharedWithXIMA = eventData.condition && eventData.condition.isSharedWithXIMA ? eventData.condition.isSharedWithXIMA : false;
                                        playerRewardFinalList.list[i].targetDate = intervalTime;
                                        applicationDetails.push(playerRewardFinalList.list[i]);
                                    }
                                }
                            }
                            // if isPreview/ the application quantity <= applicableNumber -> select all the available records
                            else {
                                playerRewardFinalList.list.forEach(
                                    data => {
                                        data.spendingAmount = (data.spendingTimes || 1) * data.rewardAmount;
                                        data.isSharedWithXIMA = eventData.condition && eventData.condition.isSharedWithXIMA ? eventData.condition.isSharedWithXIMA : false;
                                        data.targetDate = intervalTime
                                    }
                                )
                                applicationDetails = playerRewardFinalList.list;
                            }
                        }

                        console.log("yH checking---applicationDetails", [playerData.playerId, applicationDetails])

                        if (applicationDetails && applicationDetails.length < 1) {
                            return Q.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "No available consumption list for the reward"
                            });
                        }

                        break;
                    // type 2
                    case constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP:
                        isMultiApplication = true;
                        applyAmount = 0;

                        if (!rewardSpecificData || !rewardSpecificData[0]) {
                            return Q.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Not Valid for the reward."
                            });
                        }

                        let playerRewardDetail = rewardSpecificData[0];

                        let rewardInfoList = playerRewardDetail.list;

                        console.log("yH checking--- rewardInfoList", rewardInfoList)

                        lastConsumptionRecord = playerRewardDetail && playerRewardDetail.lastConsumptionDetail ? playerRewardDetail.lastConsumptionDetail : {};

                        for (let i = 0; i < rewardInfoList.length; i++) {
                            let listItem = rewardInfoList[i];

                            if (listItem.status == 1) {
                                let rewardAmount = parseFloat(listItem.bonus);
                                let spendingAmount = listItem.spendingAmount ? listItem.spendingAmount : listItem.requestedTimes * rewardAmount;
                                let consecutiveNumber = listItem.step;
                                let targetDate = listItem.targetDate;
                                let forbidWithdrawAfterApply = listItem.forbidWithdrawAfterApply;
                                let remark = listItem.remark;
                                let isSharedWithXIMA = listItem.isSharedWithXIMA;
                                let requiredConsumptionMet = listItem.requiredConsumptionMet;
                                let requiredTopUpMet = listItem.requiredTopUpMet;
                                let forbidWithdrawIfBalanceAfterUnlock = listItem.forbidWithdrawIfBalanceAfterUnlock;

                                applicationDetails.push({
                                    rewardAmount,
                                    spendingAmount,
                                    consecutiveNumber,
                                    targetDate,
                                    forbidWithdrawAfterApply,
                                    remark,
                                    isSharedWithXIMA,
                                    requiredConsumptionMet,
                                    requiredTopUpMet,
                                    forbidWithdrawIfBalanceAfterUnlock
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
                        let isReachedTopUpInPeriod = false;

                        if (eventInPeriodData && eventInPeriodData.length > 0) {
                            console.log("lose return hit number of apply", playerData && playerData.name? playerData.name: "");
                            // player already applied the reward within the period timeframe
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Reward already hit maximum number of apply. Please contact cs."
                            });
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
                            if (topUpinPeriod >= selectedRewardParam[j].minDeposit) {
                                isReachedTopUpInPeriod = true;
                            }
                            if (topUpinPeriod >= selectedRewardParam[j].minDeposit && loseAmount >= selectedRewardParam[j].minLoseAmount) {
                                selectedRewardParam = selectedRewardParam [j];
                                break;
                            }
                            if (j == 0) {
                                if (!isReachedTopUpInPeriod) {
                                    console.log("lose return top up amount does not meet", playerData && playerData.name? playerData.name: "");
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Player's top up amount does not meet condition in period"
                                    });
                                } else {
                                    console.log("lose return lose amount does not meet", playerData && playerData.name? playerData.name: "");
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Player's lose amount does not meet condition in period"
                                    });
                                }
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

                    // type 4 投注额优惠（组）
                    case constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP:
                        if (eventInPeriodCount && eventInPeriodCount > 0) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: localization.localization.translate("This player has applied for max reward times in event period")
                            });
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
                            // console.log('rewardSpecificData[0]',rewardSpecificData[0]); --- check 3 test results, need [1, 1, 1] to pass checking
                            let matchPlayerId = rewardSpecificData[0][0];
                            let matchIPAddress = rewardSpecificData[0][1];
                            let matchPhoneNum = rewardSpecificData[0][2];
                            let matchMobileDevice = rewardSpecificData[0][3];
                            let matchForbidRewardEvent = rewardSpecificData[2];

                            if (!matchPlayerId) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: localization.localization.translate("This player has applied for max reward times in event period")
                                });
                            }

                            if (!matchIPAddress) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: localization.localization.translate("This IP address has applied for max reward times in event period")
                                });
                            }

                            if (!matchPhoneNum) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: localization.localization.translate("This phone number has applied for max reward times in event period")
                                });
                            }

                            if (!matchMobileDevice) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: localization.localization.translate("This mobile device has applied for max reward times in event period")
                                });
                            }

                            if (!matchForbidRewardEvent) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: localization.localization.translate("This player has applied for other reward in event period")
                                });
                            }
                        }
                        else {
                            return Q.reject({
                                status: constServerCode.INVALID_PARAM,
                                name: "DataError",
                                message: localization.localization.translate("Reward Amount and Spending Times cannot be empty. Please check reward condition.")
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
                        let checkHasReceived = rewardSpecificData[3];
                        let applyRewardTimes = periodProps.length;
                        let topUpAmount = topUpRecords.reduce((sum, value) => sum + value.amount, 0);
                        let consumptionAmount = consumptionRecords.reduce((sum, value) => sum + value.validAmount, 0);
                        let applyRewardAmount = periodProps.reduce((sum, value) => sum + value.data.useConsumptionAmount, 0);
                        useTopUpAmount = 0;
                        useConsumptionAmount = 0;
                        //periodProps.reduce((sum, value) => sum + value, 1);
                        if(topUpRecords.length > 0){
                            topUpRecords.sort(function(a, b){
                                return a.amount - b.amount;
                            })
                        }

                        let sameIPAddressHasReceived = checkHasReceived && checkHasReceived.sameIPAddressHasReceived ? checkHasReceived.sameIPAddressHasReceived : "";
                        let samePhoneNumHasReceived = checkHasReceived && checkHasReceived.samePhoneNumHasReceived ? checkHasReceived.samePhoneNumHasReceived : "";
                        let sameDeviceIdHasReceived = checkHasReceived && checkHasReceived.sameDeviceIdHasReceived ? checkHasReceived.sameDeviceIdHasReceived : "";

                        if (sameIPAddressHasReceived) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: localization.localization.translate("This IP address has applied for max reward times in event period")
                            });
                        }

                        if (samePhoneNumHasReceived) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: localization.localization.translate("This phone number has applied for max reward times in event period")
                            });
                        }

                        if (sameDeviceIdHasReceived) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: localization.localization.translate("This mobile device has applied for max reward times in event period")
                            });
                        }

                        if (selectedRewardParam.numberParticipation && applyRewardTimes < selectedRewardParam.numberParticipation) {
                            let meetTopUpCondition = false, meetConsumptionCondition = false;
                            if (topUpAmount >= (selectedRewardParam.requiredTopUpAmount? selectedRewardParam.requiredTopUpAmount: 0)) {
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
                                let useConsumptionRecordAmount = 0;
                                //For set consumption bDirty Use
                                consumptionRecords.forEach((consumptionRecord) => {
                                    if (useConsumptionRecordAmount < selectedRewardParam.requiredConsumptionAmount) {
                                        useConsumptionRecordAmount += consumptionRecord.validAmount;
                                        updateConsumptionRecordIds.push(consumptionRecord._id);
                                    }
                                });
                                isUpdateMultiConsumptionRecord = true;
                                useConsumptionAmount = selectedRewardParam.requiredConsumptionAmount;
                                meetConsumptionCondition = consumptionAmount - applyRewardAmount >= selectedRewardParam.requiredConsumptionAmount;
                            } else {
                                meetConsumptionCondition = true;
                            }

                            if (selectedRewardParam.operatorOption) { // true = and, false = or
                                if (!meetTopUpCondition) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Player does not have enough top up amount"
                                    });
                                }
                                if (!meetConsumptionCondition) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Player does not have enough consumption"
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
                                message: "Player reach participate limit"
                            });
                        }

                        break;

                    // case 7
                    // baccarat reward
                    case constRewardType.BACCARAT_REWARD_GROUP:
                        applyAmount = 0;

                        if (!rewardSpecificData || !rewardSpecificData[0]) {
                            return Q.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "Not Valid for the reward."
                            });
                        }
                        // lastConsumptionRecord
                        baccaratConsumptionRecord = rewardSpecificData[0].lastBConsumption;

                        let baccaratRewardList = rewardSpecificData[0].list;
                        let baccaratRewardAppliedAmount = rewardSpecificData[0].totalAppliedBefore;

                        rewardAmount = 0;
                        spendingAmount = 0;
                        let forbidWithdrawAfterApply = rewardSpecificData[0].forbidWithdrawAfterApply;
                        let forbidWithdrawIfBalanceAfterUnlock = rewardSpecificData[0].forbidWithdrawIfBalanceAfterUnlock;
                        let remark;
                        let maxApply = eventData && eventData.condition && eventData.condition.intervalMaxRewardAmount || 0;

                        for (let i = 0; i < baccaratRewardList.length; i++) {
                            let consumptionApplication = baccaratRewardList[i];
                            if (!remark) {
                                remark = consumptionApplication.remark;
                            }

                            if (maxApply && rewardAmount + consumptionApplication.rewardAmount + baccaratRewardAppliedAmount >= maxApply) {
                                let currentBRewardAmount = maxApply - rewardAmount - baccaratRewardAppliedAmount;
                                let currentBSpendingAmount = consumptionApplication.spendingAmount * (currentBRewardAmount/consumptionApplication.rewardAmount);
                                rewardAmount = maxApply - baccaratRewardAppliedAmount;
                                spendingAmount += currentBSpendingAmount;
                                break;
                            }

                            rewardAmount += consumptionApplication.rewardAmount;
                            spendingAmount += consumptionApplication.spendingAmount;
                        }
                        selectedRewardParam = {
                            baccaratRewardList,
                            forbidWithdrawAfterApply,
                            forbidWithdrawIfBalanceAfterUnlock,
                            baccaratRewardAppliedAmount,
                            maxApply,
                            remark
                        };
                        break;

                    default:
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            message: "Can not find grouped reward event type"
                        });
                }

                //check if it is for preview purpose
                if (isPreview){
                    let previewData = {};

                    if (eventData.type.name === constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP) {
                        if (eventData.condition && eventData.condition.defineLoseValue && typeof(eventData.condition.defineLoseValue) != 'undefined') {
                            previewData.defineLoseValue = eventData.condition.defineLoseValue;

                            if (eventData.condition.defineLoseValue.indexOf("2") > -1 || eventData.condition.defineLoseValue.indexOf("3") > -1) {
                                previewData.intervalRewardSum = intervalRewardSum;
                                previewData.intervalConsumptionSum = intervalConsumptionSum;
                            } else if (eventData.condition.defineLoseValue.indexOf("1") > -1) {
                                // if (selectedRewardParam && selectedRewardParam.rewardAmount) {
                                //     previewData.data.maxReward = selectedRewardParam.rewardAmount;
                                // }
                                previewData.intervalTopupSum = intervalTopupSum;
                                previewData.intervalBonusSum = intervalBonusSum;
                                previewData.playerCreditLogSum = playerCreditLogSum;
                            }

                            previewData.defineLoseValue = eventData.condition.defineLoseValue;
                        }

                        if (selectedRewardParam && selectedRewardParam.maxReward) {
                            previewData.maxReward = selectedRewardParam.maxReward;
                        }

                        if (eventData.condition.interval){
                            previewData.interval = eventData.condition.interval;
                        }

                        if (selectedRewardParam && selectedRewardParam.rewardPercent) {
                            previewData.rewardPercent = selectedRewardParam.rewardPercent;
                        }

                        if (intervalTime){
                            previewData.startTime = intervalTime.startTime;
                            previewData.endTime = intervalTime.endTime;
                        }

                        if(rewardData.previewDate){
                            previewData.endTime = rewardData.previewDate;
                        }

                        if(rewardAmount){
                            previewData.rewardAmount = rewardAmount;
                        }

                        if(spendingAmount){
                            previewData.spendingAmount = spendingAmount;
                        }

                    }
                    else if (eventData.type.name === constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP && rewardSpecificData[0]) {
                       return rewardSpecificData[0];
                    }

                    return previewData
                }


                // Decide whether deduct player credit
                if (isUpdateValidCredit && playerData.platform.useProviderGroup) {
                    let deductAmount = actualAmount && actualAmount > 0 ? actualAmount : applyAmount;
                    // Decide whether player has enough free amount to apply
                    if (playerData.validCredit >= deductAmount) {
                        // Player has enough amount in validCredit
                        return dbPlayerUtil.tryToDeductCreditFromPlayer(playerData._id, playerData.platform._id, deductAmount, eventData.name + ":Deduction", rewardData.selectedTopup, true);
                    } else {
                        // Player doesn't have enough validCredit, proceed to check in game credit
                        return dbPlayerUtil.getProviderGroupInGameCreditByObjId(playerData._id, playerData.platform._id, eventData.condition.providerGroup).then(
                            res => {
                                if (res && res.totalInGameCredit >= deductAmount) {
                                    // Player has enough credit in game provider to apply reward
                                    let transferOutPromArr = [];

                                    if (res && res.providerId && res.providerId.length > 0) {
                                        res.providerId.map(
                                            providerId => transferOutPromArr.push(dbPlayerInfo.transferPlayerCreditFromProvider(playerData.playerId, playerData.platform._id, providerId, -1, null, true))
                                        );

                                        return Promise.all(transferOutPromArr);
                                    }
                                } else {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                        name: "DataError",
                                        message: "Player free amount is less than required top up amount"
                                    })
                                }
                            }
                        ).then(
                            transferComplete => {
                                if (transferComplete) {
                                    // Player has enough amount in validCredit
                                    return dbPlayerUtil.tryToDeductCreditFromPlayer(playerData._id, playerData.platform._id, deductAmount, eventData.name + ":Deduction", rewardData.selectedTopup, true);
                                }
                            }
                        );
                    }
                } else {
                    return true;
                }
            }
        ).then(
            amountCheckComplete => {
                if (amountCheckComplete) {

                    if (isPreview){
                        return amountCheckComplete;
                    }

                    if (isMultiApplication) {
                        let asyncProms = Promise.resolve();
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
                                    isIgnoreAudit: eventData.condition && (typeof(eventData.condition.isIgnoreAudit) === "boolean" && eventData.condition.isIgnoreAudit === true) || (Number.isInteger(eventData.condition.isIgnoreAudit) && eventData.condition.isIgnoreAudit >= applyDetail.rewardAmount),
                                    forbidWithdrawAfterApply: Boolean(applyDetail.forbidWithdrawAfterApply && applyDetail.forbidWithdrawAfterApply === true),
                                    remark: applyDetail.remark,
                                    useConsumption: Boolean(!applyDetail.isSharedWithXIMA),
                                    providerGroup: eventData.condition.providerGroup,
                                    forbidWithdrawIfBalanceAfterUnlock: applyDetail.forbidWithdrawIfBalanceAfterUnlock ? applyDetail.forbidWithdrawIfBalanceAfterUnlock : 0,
                                    consumptionSlipNo: applyDetail.consumptionSlipNo || null,
                                },
                                entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                userType: constProposalUserType.PLAYERS
                            };
                            proposalData.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);

                            if (applyDetail.consecutiveNumber) {
                                proposalData.data.consecutiveNumber = applyDetail.consecutiveNumber;
                            }

                            if (applyDetail.targetDate) {
                                proposalData.data.applyTargetDate = applyDetail.targetDate.startTime;
                            }

                            if (lastConsumptionRecord && Object.keys(lastConsumptionRecord).length > 0) {
                                proposalData.data.betTime = lastConsumptionRecord.createTime;
                                proposalData.data.betType = lastConsumptionRecord.betType;
                                proposalData.data.betAmount = lastConsumptionRecord.validAmount;
                                proposalData.data.winAmount = lastConsumptionRecord.bonusAmount;
                                proposalData.data.winTimes = lastConsumptionRecord.winRatio;
                            }

                            let addUsedEventToConsumptionProm = Promise.resolve([]);
                            if (applyDetail.requiredConsumptionMet) {
                                // special handling for PLAYER_CONSECUTIVE_REWARD_GROUP with settlement -> set all the consumption to be dirty to prevent redundant reward proposal
                                // being generated when clicking settlement more than one time
                                if (eventData.type.name == constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP && eventData.condition.applyType == 3 && i == applicationDetails.length-1){
                                    addUsedEventToConsumptionProm = dbPlayerConsumptionRecord.assignConsumptionUsedEvent(
                                        playerData.platform._id, playerData._id, eventData._id, eventData.param.requiredConsumptionAmount,
                                        intervalTime.startTime, intervalTime.endTime, eventData.condition.consumptionProvider, null, null, true
                                    )
                                }
                                else {
                                    addUsedEventToConsumptionProm = dbPlayerConsumptionRecord.assignConsumptionUsedEvent(
                                        playerData.platform._id, playerData._id, eventData._id, eventData.param.requiredConsumptionAmount,
                                        applyDetail.targetDate.startTime, applyDetail.targetDate.endTime, eventData.condition.consumptionProvider
                                    )
                                }
                            }
                            else if (eventData.type.name == constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP){
                                addUsedEventToConsumptionProm = dbPlayerConsumptionRecord.assignConsumptionUsedEventByObjId(applyDetail.targetDate.startTime, applyDetail.targetDate.endTime, applyDetail.consumptionRecordObjId, eventData._id)
                            }

                            let addUsedEventToTopUpProm = Promise.resolve([]);
                            if (applyDetail.requiredTopUpMet) {
                                // special handling for PLAYER_CONSECUTIVE_REWARD_GROUP with settlement -> set all the top up to be dirty to prevent redundant reward proposal
                                // being generated when clicking settlement more than one time
                                if (eventData.type.name == constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP && eventData.condition.applyType == 3 && i == applicationDetails.length-1){
                                    addUsedEventToTopUpProm = dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(
                                        playerData.platform._id, playerData._id, eventData._id, eventData.param.requiredTopUpAmount,
                                        intervalTime.startTime, intervalTime.endTime, eventData.condition.ignoreAllTopUpDirtyCheckForReward, null, null, true
                                    )
                                }
                                else {
                                    addUsedEventToTopUpProm = dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(
                                        playerData.platform._id, playerData._id, eventData._id, eventData.param.requiredTopUpAmount,
                                        applyDetail.targetDate.startTime, applyDetail.targetDate.endTime, eventData.condition.ignoreAllTopUpDirtyCheckForReward
                                    )
                                }
                            }
                            else if (eventData.type.name == constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP){
                                addUsedEventToTopUpProm = dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(
                                    playerData.platform._id, playerData._id, eventData._id, applyDetail.requiredTopUpAmount,
                                    applyDetail.targetDate.startTime, applyDetail.targetDate.endTime, eventData.condition.ignoreAllTopUpDirtyCheckForReward
                                )
                            }

                            let addUsedToAppliedListProm = Promise.resolve([]);
                            if (eventData.type.name == constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP){
                                addUsedToAppliedListProm = dbConfig.collection_playerConsumptionSlipRewardGroupRecord.findOneAndUpdate({_id: applyDetail._id}, {isUsed: true}).lean();
                            }

                            asyncProms = asyncProms.then(() => {
                                return Promise.all([addUsedEventToConsumptionProm, addUsedEventToTopUpProm, addUsedToAppliedListProm]).then(
                                    data => {
                                        if (data[0] && data[0].length > 0) {
                                            proposalData.data.usedConsumption = data[0];
                                        }

                                        if (data[1] && data[1].length > 0) {
                                            proposalData.data.usedTopUp = data[1];
                                        }
                                        if (data[2] && Object.keys(data[2]).length > 0) {
                                            proposalData.data.betTime = data[2].consumptionCreateTime;
                                            proposalData.data.betType = data[2].betType;
                                            proposalData.data.betAmount = data[2].validAmount;
                                            proposalData.data.winAmount = data[2].bonusAmount;
                                            proposalData.data.winTimes = data[2].winRatio;
                                        }
                                        return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData);
                                    }
                                );
                            });
                        }

                        return asyncProms;
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
                                isIgnoreAudit: eventData.condition && (typeof(eventData.condition.isIgnoreAudit) === "boolean" && eventData.condition.isIgnoreAudit === true) || (Number.isInteger(eventData.condition.isIgnoreAudit) && eventData.condition.isIgnoreAudit >= rewardAmount),
                                forbidWithdrawAfterApply: Boolean(selectedRewardParam.forbidWithdrawAfterApply && selectedRewardParam.forbidWithdrawAfterApply === true),
                                remark: selectedRewardParam.remark,
                                useConsumption: Boolean(!eventData.condition.isSharedWithXIMA),
                                providerGroup: eventData.condition.providerGroup,
                                // Use this flag for auto apply reward
                                isGroupReward: true,
                                // If player credit is more than this number after unlock reward group, will ban bonus
                                forbidWithdrawIfBalanceAfterUnlock: selectedRewardParam.forbidWithdrawIfBalanceAfterUnlock ? selectedRewardParam.forbidWithdrawIfBalanceAfterUnlock : 0,
                                isDynamicRewardAmount: Boolean(eventData.condition.isDynamicRewardAmount)
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS
                        };
                        proposalData.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);

                        // Extra required Information for PLAYER_LOSE_RETURN_REWARD_GROUP
                        if (eventData.type.name == constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP && intervalTime){
                            proposalData.data.settlementStartTime = intervalTime.startTime;
                            proposalData.data.settlementEndTime = rewardData.previewDate ? rewardData.previewDate : intervalTime.endTime;
                        }
                        // Custom proposal data field
                        if (applyAmount > 0) {
                            proposalData.data.applyAmount = applyAmount;
                        }

                        if (consecutiveNumber) {
                            proposalData.data.consecutiveNumber = consecutiveNumber;
                        }

                        if (rewardData && rewardData.selectedTopup && rewardData.selectedTopup.proposalId &&
                            (eventData.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP || eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP)) {
                            proposalData.data.topUpProposalId = rewardData.selectedTopup.proposalId;
                            proposalData.data.actualAmount = actualAmount;
                        }

                        if (rewardData.applyTargetDate) {
                            proposalData.data.applyTargetDate = new Date(rewardData.applyTargetDate);
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

                        if (eventData.type.name === constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP || eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                            proposalData.data.lastLoginIp = playerData.lastLoginIp;
                            proposalData.data.phoneNumber = playerData.phoneNumber;
                            if (playerData.deviceId) {
                                proposalData.data.deviceId = playerData.deviceId;
                            }
                        }

                        if (eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP && eventData.condition
                            && eventData.condition.definePlayerLoginMode && typeof(eventData.condition.definePlayerLoginMode) != 'undefined'){
                            proposalData.data.definePlayerLoginMode = eventData.condition.definePlayerLoginMode;
                        }

                        if (eventData.type.name === constRewardType.PLAYER_RANDOM_REWARD_GROUP) {
                            proposalData.data.rewardAppearPeriod = showRewardPeriod;
                            proposalData.data.lastLoginIp = playerData.lastLoginIp;
                            proposalData.data.phoneNumber = playerData.phoneNumber;
                            if (playerData.deviceId) {
                                proposalData.data.deviceId = playerData.deviceId;
                            }
                        }

                        if (eventData.type.name === constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP) {
                            if (eventData.condition && eventData.condition.defineLoseValue && typeof(eventData.condition.defineLoseValue) != 'undefined') {
                                proposalData.data.defineLoseValue = eventData.condition.defineLoseValue;

                                if (eventData.condition.defineLoseValue.indexOf("2") > -1 || eventData.condition.defineLoseValue.indexOf("3") > -1) {
                                    proposalData.data.intervalRewardSum = intervalRewardSum;
                                    proposalData.data.intervalConsumptionSum = intervalConsumptionSum;
                                } else if (eventData.condition.defineLoseValue.indexOf("1") > -1) {
                                    if (selectedRewardParam && selectedRewardParam.rewardAmount) {
                                        proposalData.data.maxReward = selectedRewardParam.rewardAmount;
                                    }
                                    proposalData.data.intervalTopupSum = intervalTopupSum;
                                    proposalData.data.intervalBonusSum = intervalBonusSum;
                                    proposalData.data.playerCreditLogSum = playerCreditLogSum;
                                }
                            }

                            if (selectedRewardParam && selectedRewardParam.maxReward) {
                                proposalData.data.maxReward = selectedRewardParam.maxReward;
                            }

                            if (selectedRewardParam && selectedRewardParam.rewardPercent) {
                                proposalData.data.rewardPercent = selectedRewardParam.rewardPercent;
                            }
                        }

                        if (lastConsumptionRecord && Object.keys(lastConsumptionRecord).length > 0) {
                            proposalData.data.betTime = lastConsumptionRecord.createTime;
                            proposalData.data.betAmount = lastConsumptionRecord.validAmount;
                            proposalData.data.betType = lastConsumptionRecord.betType;
                            proposalData.data.winAmount = lastConsumptionRecord.bonusAmount;
                            proposalData.data.winTimes = lastConsumptionRecord.winRatio;
                        }

                        if (eventData.type.name === constRewardType.BACCARAT_REWARD_GROUP) {
                            proposalData.data.baccaratRewardList = selectedRewardParam.baccaratRewardList;
                            proposalData.data.eventStartTime = intervalTime.startTime;
                            proposalData.data.eventEndTime = intervalTime.endTime;
                            proposalData.data.intervalType = eventData.condition && eventData.condition.interval;
                            proposalData.data.playerLevel = playerData.playerLevel;
                            proposalData.data.intervalRewardAmount = selectedRewardParam.baccaratRewardAppliedAmount;
                            proposalData.data.intervalMaxRewardAmount = selectedRewardParam.maxApply;
                            if (baccaratConsumptionRecord && Object.keys(baccaratConsumptionRecord).length > 0) {
                                proposalData.data.betTime = baccaratConsumptionRecord.createTime;
                                proposalData.data.betAmount = baccaratConsumptionRecord.validAmount;
                                proposalData.data.winAmount = baccaratConsumptionRecord.bonusAmount;
                                proposalData.data.winResult = [baccaratConsumptionRecord.hostResult, baccaratConsumptionRecord.playerResult];
                            }
                        }

                        return dbProposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
                            proposalData => {
                                let postPropPromArr = [];
                                // save a record for the playerRetentionRewardGroup
                                if (eventData && eventData.type && eventData.type.name && eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP){

                                    let newRetentionData = {
                                        playerObjId: playerData._id,
                                        platformObjId: playerData.platform._id,
                                        rewardEventObjId: eventData._id,
                                        topUpRecordObjId: rewardData.selectedTopup._id,
                                        applyTopUpAmount: applyAmount,
                                        actualTopUpAmount: actualAmount,
                                        lastApplyDate: todayTime.startTime,
                                        lastReceivedDate: todayTime.startTime,
                                        accumulativeDay: 1
                                    };
                                    let newRecord = new dbConfig.collection_playerRetentionRewardGroupRecord(newRetentionData);

                                    postPropPromArr.push(newRecord.save());
                                }

                                if (proposalData && proposalData._id) {
                                    if (isUpdateTopupRecord) {
                                        postPropPromArr.push(dbConfig.collection_playerTopUpRecord.findOneAndUpdate(
                                            {
                                                _id: rewardData.selectedTopup._id,
                                                createTime: rewardData.selectedTopup.createTime,
                                                // bDirty: {$ne: true}
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

                                    if (isSetUsedTopUpRecord) {
                                        if (intervalTime) {
                                            postPropPromArr.push(dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(playerData.platform._id, playerData._id, eventData._id, useTopUpAmount, null, null, ignoreTopUpBdirtyEvent));
                                        } else {
                                            postPropPromArr.push(dbPlayerTopUpRecord.assignTopUpRecordUsedEvent(playerData.platform._id, playerData._id, eventData._id, useTopUpAmount, intervalTime.startTime, intervalTime.endTime, ignoreTopUpBdirtyEvent));
                                        }
                                    }
                                    if(eventData.type.name === constRewardType.PLAYER_RANDOM_REWARD_GROUP) {
                                        let randomRewardRes = {
                                            amount: rewardAmount
                                        }
                                        return Promise.all(postPropPromArr).then(
                                            () => {
                                                  return Promise.resolve(randomRewardRes);
                                            });
                                    }

                                    return Promise.all(postPropPromArr).then(() => {
                                        return {
                                            rewardAmount: rewardAmount
                                        }
                                    });
                                }
                                else {
                                    return proposalData;
                                }
                            }
                        );
                    }
                }
            }
        );
    },

    checkRewardParamLevel: function (value, eventData, intervalMode){
        let intervalTime = dbRewardUtil.getRewardEventIntervalTime({}, eventData, true);
        let paramLevel = value? value.length : null;
        let dayLimit = null;

        if (intervalMode && intervalMode == 3){
            // half-monthly - firstHalfMonth: 15 days; secondHalfMonth: the rest of the days
            let isFirstHalf = new Date() >= intervalTime.startTime ? false : true;

            if (isFirstHalf){
                dayLimit = 15;
            }
            else{
                let period = dbUtility.getCurrentMonthSGTIme();
                dayLimit = period.endTime.getDate() - intervalTime.startTime.getDate() + 1;
            }
        }
        else if(intervalMode && intervalMode == 4){
            // monthly
            let period = dbUtility.getCurrentMonthSGTIme();
            dayLimit = period.endTime.getDate();
        }

        if (dayLimit && paramLevel) {
            while(paramLevel > dayLimit){
                let index = paramLevel-1;
                if (value.length-1 >= index) {
                    value.splice(index, 1);
                }
                paramLevel = paramLevel -1;
            }
        }

        return value;
    },

    getRetentionRewardList: function (returnData, rewardData, eventData, selectedRewardParam, rewardProposals, targetedParamResult, todayHasApplied) {
        let outputList = [];
        let intervalTime = dbRewardUtil.getRewardEventIntervalTime({}, eventData, true);
        let defineLoginMode = eventData.condition.definePlayerLoginMode || null;
        let intervalMode = eventData.condition.interval || null;

        if (selectedRewardParam && selectedRewardParam.length) {
            setDefaultParam(selectedRewardParam, eventData, intervalMode);
            // check if the reward date is expired
            setExpiredParam(outputList, targetedParamResult, defineLoginMode, intervalTime, todayHasApplied);
        }
        else {
            return Promise.reject({
                name: "DataError",
                errorMessage: "Reward param is not found"
            })
        }

        if (rewardProposals && rewardProposals.length) {
            if (defineLoginMode == 1) {
                let latestRewardProposal = rewardProposals[0];
                let accumulativeCount = latestRewardProposal.data && latestRewardProposal.data.consecutiveNumber ? latestRewardProposal.data.consecutiveNumber : 0 ;

                for (let i = 0; i < accumulativeCount; i++) {
                    let rewardAmount = selectedRewardParam[i].rewardAmount || null;
                    let spendingTimes = selectedRewardParam[i].spendingTimes || null;
                    let maxRewardAmount = selectedRewardParam[i].maxRewardAmountInSingleReward || null;
                    let rewardPercentage = selectedRewardParam[i].rewardPercentage || null;
                    let step = i + 1;

                    insertOutputList(i, 2, step);
                }
            }
            else if (defineLoginMode == 2) {
                rewardProposals.forEach(
                    (proposal, i) => {
                        let index = null;
                        let rewardAmount = selectedRewardParam[i].rewardAmount || null;
                        let spendingTimes = selectedRewardParam[i].spendingTimes || null;
                        let maxRewardAmount = selectedRewardParam[i].maxRewardAmountInSingleReward || null;
                        let rewardPercentage = selectedRewardParam[i].rewardPercentage || null;
                        let loginDay = proposal.data && proposal.data.applyTargetDate ? proposal.data.applyTargetDate : null;
                        if (loginDay) {
                            index = dbPlayerReward.applyRetentionRewardParamLevel(eventData, null, selectedRewardParam, null, loginDay).selectedIndex;
                        }
                        insertOutputList(index, 2, null, loginDay);
                    }
                )
            }
        }

        return outputList;

        function insertOutputList(index, status, step, loginDay) {
            if (index != null) {
                outputList[index].status = status;
                if (step) {
                    outputList[index].step = step;
                }
                if (loginDay) {
                    outputList[index].loginDay = loginDay;
                }
            }
            return outputList;
        }

        function setDefaultParam(selectedRewardParam, eventData, intervalMode){
            // remove extra unused param level
            selectedRewardParam = dbPlayerReward.checkRewardParamLevel(selectedRewardParam, eventData, intervalMode);

            selectedRewardParam.forEach(
                (param, i) => {
                    let rewardObject = {
                        status: 0
                    };

                    if (param.spendingTimes){
                        rewardObject.spendingTimes = param.spendingTimes;
                    }

                    if (param.maxRewardAmountInSingleReward) {
                        rewardObject.maxRewardAmount = param.maxRewardAmountInSingleReward;
                    }

                    if (param.rewardPercentage) {
                        rewardObject.rewardPercentage = param.rewardPercentage;
                    }

                    if (param.rewardAmount) {
                        rewardObject.rewardAmount = param.rewardAmount;
                    }

                    if (defineLoginMode == 1) {
                        rewardObject.step = i + 1;
                    }
                    else if (defineLoginMode == 2) {
                        if (i == 0) {
                            rewardObject.loginDay = intervalTime.startTime;
                        }
                        else {
                            rewardObject.loginDay = dbUtility.getNdaylaterFromSpecificStartTime(i, intervalTime.startTime);
                        }

                    }
                    return outputList.push(rewardObject);
                }
            )
        }

        function setExpiredParam(outputList, targetedParamResult, loginMode, intervalTime, todayHasApplied){
            let selectedIndex = null;
            if (targetedParamResult && targetedParamResult.hasOwnProperty('selectedIndex')) {
                selectedIndex = targetedParamResult.selectedIndex;
            }
            if (todayHasApplied) {
                selectedIndex = selectedIndex - 1;
            }

            if (outputList && outputList.length && selectedIndex != null) {
                if (loginMode && loginMode == 1){
                    // accumulative day
                    let dayDiff = dbUtility.getTodaySGTime().startTime.getDate() - intervalTime.startTime.getDate();
                    let expiredLength = dayDiff - selectedIndex;
                    if (expiredLength >= 0) {
                        for (let i = 0; i < expiredLength; i++) {
                            let expiredIndex = outputList.length - 1 - i;
                            outputList[expiredIndex].status = 3 //expired
                        }
                    }
                }
                else if (loginMode && loginMode == 2) {
                    for (let i = 0; i < selectedIndex; i++) {
                        outputList[i].status = 3 //expired
                    }
                }
            }
        }

    },

    applyRetentionRewardParamLevel: function (eventData, applyAmount, selectedRewardParam, playerRetentionRewardRecord, appliedDate, rewardProposals) {
        let rewardAmount = null;
        let spendingAmount = null;
        let selectedIndex = null;
        let consecutiveNumber = null;

        if (eventData && eventData.condition && eventData.condition.definePlayerLoginMode) {
            // 1 - accumulative day (the first application always start with level 1 regardless of the interval)
            if (eventData.condition.definePlayerLoginMode == 1) {
                if (playerRetentionRewardRecord) {
                    selectedIndex = playerRetentionRewardRecord.accumulativeDay ? playerRetentionRewardRecord.accumulativeDay : 0;
                }
                else if (rewardProposals && rewardProposals.length){
                    let latestRewardProposal = rewardProposals[0];

                    if (latestRewardProposal && latestRewardProposal.data && latestRewardProposal.data.hasOwnProperty('consecutiveNumber')){
                        selectedIndex = latestRewardProposal.data.consecutiveNumber;
                    }
                }
                else{
                    selectedIndex = 0;
                }
                consecutiveNumber = selectedIndex + 1;
            }
            else if (eventData.condition.definePlayerLoginMode == 2) {
                // 2 - exact date
                let applyDate = appliedDate? new Date(appliedDate).getDate() : new Date().getDate();

                if (applyDate && eventData.condition.interval && eventData.condition.interval == 2) {
                    applyDate = appliedDate ? new Date(appliedDate).getDay() : new Date().getDay();
                    // weekly
                    selectedIndex = applyDate - 1;
                }
                else if (applyDate && eventData.condition.interval && eventData.condition.interval == 3) {
                    // bi-weekly
                    if (applyDate >= 16) {
                        selectedIndex = applyDate - 16; // reset the index back to zero ( a new bi-weekly interval)
                    }
                    else {
                        selectedIndex = applyDate - 1;
                    }
                }
                else if (applyDate && eventData.condition.interval && eventData.condition.interval == 4) {
                    // monthly
                    selectedIndex = applyDate - 1;
                }
            }

            if (selectedIndex > selectedRewardParam.length - 1) {
                selectedIndex = selectedRewardParam.length - 1 // set to the max length
            }

            if (selectedIndex == null) {
                return Promise.reject({
                    status: constServerCode.INVALID_DATA,
                    name: "DataError",
                    message: "no available definePlayerLoginMode"
                })
            }

            if (applyAmount) {
                if (eventData.condition.isDynamicRewardAmount) {
                    if (selectedRewardParam[selectedIndex] && selectedRewardParam[selectedIndex].hasOwnProperty('rewardPercentage')) {
                        rewardAmount = applyAmount * selectedRewardParam[selectedIndex].rewardPercentage;

                        if (selectedRewardParam[selectedIndex] && selectedRewardParam[selectedIndex].maxRewardAmountInSingleReward && selectedRewardParam[selectedIndex].maxRewardAmountInSingleReward > 0) {
                            rewardAmount = Math.min(rewardAmount, Number(selectedRewardParam[selectedIndex].maxRewardAmountInSingleReward));
                        }
                    }
                }
                else {
                    if (selectedRewardParam[selectedIndex] && selectedRewardParam[selectedIndex].hasOwnProperty('rewardAmount')) {
                        rewardAmount = selectedRewardParam[selectedIndex].rewardAmount;
                    }
                }
                selectedRewardParam[selectedIndex].spendingTimes = selectedRewardParam[selectedIndex].spendingTimes || 1;
                spendingAmount = rewardAmount * selectedRewardParam[selectedIndex].spendingTimes;
            }

            return {
                rewardAmount: rewardAmount,
                spendingAmount: spendingAmount,
                selectedRewardParam: selectedRewardParam[selectedIndex],
                selectedIndex: selectedIndex,
                consecutiveNumber: consecutiveNumber
            };

        }
        else {
            return null;
        }
    },

    getDistributedRetentionReward: function (rewardEvent, playerData, applyAmount, rewardParam, playerRetentionRecord, userAgent){
        let rewardAmount;
        let spendingAmount;
        let selectedRewardParam;
        let consecutiveNumber;

        // get the reward
        let retRewardData = dbPlayerReward.applyRetentionRewardParamLevel(rewardEvent, applyAmount, rewardParam, playerRetentionRecord);
        if (retRewardData && retRewardData.selectedRewardParam && retRewardData.rewardAmount != null && retRewardData.spendingAmount != null){
            rewardAmount = retRewardData.rewardAmount;
            spendingAmount = retRewardData.spendingAmount;
            selectedRewardParam = retRewardData.selectedRewardParam;
            consecutiveNumber = retRewardData.consecutiveNumber || null;
            return dbProposal.createRewardProposal(rewardEvent, playerData, selectedRewardParam, playerRetentionRecord, consecutiveNumber, applyAmount, rewardAmount, spendingAmount, playerRetentionRecord._id, userAgent)
        }
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
                        validStartTime: {$lte: new Date()},
                        validEndTime: {$gt: new Date()}
                    }).lean();
                }
            }
        ).then(
            rewardEvents => {
                if (rewardEvents && rewardEvents.length > 0 && playerObj && playerObj.playerId && data) {
                    let p = Promise.resolve();
                    rewardEvents.forEach(event => {
                        if (event && event.code) {
                            p = p.then(() => dbPlayerInfo.applyRewardEvent(null, playerObj.playerId, event.code, data))
                        }
                    });

                    return p;
                }
            }
        )
    },

    checkConsumptionSlipRewardGroup: function (playerData, consumptionRecord) {
        // check zor the consumptionSlipRewardEvent
        return dbConfig.collection_rewardType.findOne({name: constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP}).then(
            rewardType => {
                if (!rewardType){
                    return Promise.reject({
                        name: "DataError",
                        message: "reward type is not found"
                    })
                }
                // if there is more than one rewardEvent with the same rewardEvent type
                return dbConfig.collection_rewardEvent.find({platform: playerData.platform, type: rewardType._id})
            }
        ).then(
            rewardEvent => {
                // check if more than one of the rewardEvent with the same type
                if(rewardEvent && rewardEvent.length){
                    rewardEvent.forEach(
                        reward => {
                            if(reward){
                                checkAvailableConsumptionRecord(reward, consumptionRecord, playerData);
                            }
                        }
                    )
                }
                else{
                    return Promise.reject({
                        name: "DataError",
                        message: "reward event is not found"
                    })
                }

            }
        )

        function checkRequirementMatched (consumptionRecord, endingDigit, refBonusRatio, refMinConsumption, refGameProvider){
            let isEndingDigitMatched = false;
            let isBonusRatioMatched = false;
            let isMinConsumptionMatched = false;
            let isGameProviderMatched = false;

            let bonusAmount = consumptionRecord.bonusAmount || 0;
            let amount = consumptionRecord.amount || 0;

            // check if the orderNo ending digits are matched
            if (!endingDigit || (endingDigit && consumptionRecord.orderNo.toString().endsWith(endingDigit.toString()))){
                isEndingDigitMatched = true;
            }

            // check the bonus ratio matched with the application requirement
            let checkBonusRatio = 0;

            if (bonusAmount && amount){
                checkBonusRatio = bonusAmount/amount;
            }

            if(!refBonusRatio || checkBonusRatio >= refBonusRatio){
                isBonusRatioMatched = true;
            }

            // check if amount matched with the application requirement
            if (amount >= refMinConsumption){
                isMinConsumptionMatched = true;
            }

            // check if gameProvider matched with the application requirement
            let index = null;
            if (refGameProvider.length){
                index = refGameProvider.indexOf(consumptionRecord.providerId.toString())
            }

            if (!refGameProvider.length || index != -1){
                isGameProviderMatched = true;
            }

            return (isEndingDigitMatched && isBonusRatioMatched && isMinConsumptionMatched && isGameProviderMatched)

        };

        // function to check if the consumption record is valid for the application
        function checkAvailableConsumptionRecord(rewardEvent, consumptionRecord, playerData) {
            let newRecordProm = [];
            let paramOfLevel = null;

            // 1st, getting rewardParamLevel
            if (rewardEvent.condition.isPlayerLevelDiff) {
                let rewardParam = rewardEvent.param.rewardParam.filter(e => e.levelId == String(playerData.playerLevel));
                if (rewardParam && rewardParam[0] && rewardParam[0].value) {
                    paramOfLevel = rewardParam[0].value.reverse();
                }
            }
            else{
                paramOfLevel = rewardEvent.param.rewardParam[0].value.reverse();
            }

            //2nd, fit the consumption record into each rewardParamLevel, if match the condition -> save into the recordDB
            if (paramOfLevel && paramOfLevel.length) {
                let conditionList = [];
                for (let i=0; i < paramOfLevel.length; i ++){
                    let eachLevel = paramOfLevel[i];
                    let bonusRatio = eachLevel && eachLevel.hasOwnProperty('bonusRatio') ? eachLevel.bonusRatio : null;
                    let consumptionSlipEndingDigit = eachLevel && eachLevel.hasOwnProperty('consumptionSlipEndingDigit') ? eachLevel.consumptionSlipEndingDigit : null;
                    if (eachLevel.consumptionSlipEndingDigit == ""){
                        eachLevel.consumptionSlipEndingDigit = null;
                    }
                    let minConsumptionAmount = eachLevel && eachLevel.hasOwnProperty('minConsumptionAmount') ? eachLevel.minConsumptionAmount : 0;
                    let spendingTimes = eachLevel && eachLevel.hasOwnProperty('spendingTimes') ? eachLevel.spendingTimes : 1;
                    let maxRewardAmountInSingleReward = eachLevel && eachLevel.hasOwnProperty('maxRewardAmountInSingleReward') ? eachLevel.maxRewardAmountInSingleReward : 0;
                    let topUpAmount = eachLevel && eachLevel.hasOwnProperty('topUpAmount') ? eachLevel.topUpAmount : 0;
                    let gameProvider = rewardEvent.condition && rewardEvent.condition.consumptionSlipProviderSource ? rewardEvent.condition.consumptionSlipProviderSource : [];
                    let rewardMultiplier = eachLevel && eachLevel.hasOwnProperty('rewardAmount') ? eachLevel.rewardAmount : 1;

                    if (consumptionRecord && consumptionRecord.orderNo){

                        let isMatched = checkRequirementMatched (consumptionRecord, consumptionSlipEndingDigit, bonusRatio, minConsumptionAmount, gameProvider);
                        if (isMatched){
                            let rewardAmount = (consumptionRecord.amount || 0)* rewardMultiplier;
                            let list = {
                                requiredOrderNoEndingDigit: eachLevel.consumptionSlipEndingDigit,
                                requiredBonusRatio: bonusRatio,
                                requiredTopUpAmount: topUpAmount,
                                requiredConsumptionAmount: minConsumptionAmount,
                                maxRewardAmount: maxRewardAmountInSingleReward,
                                rewardMultiplier: rewardMultiplier,
                                rewardAmount: (maxRewardAmountInSingleReward && rewardAmount >= maxRewardAmountInSingleReward ) ? maxRewardAmountInSingleReward: rewardAmount,
                                spendingTimes: spendingTimes,
                                remark: eachLevel.remark || null,
                                forbidWithdrawAfterApply: eachLevel.forbidWithdrawAfterApply,
                                forbidWithdrawIfBalanceAfterUnlock: eachLevel.forbidWithdrawIfBalanceAfterUnlock,

                            };

                            conditionList.push(list);
                        }
                    }
                }

                if (conditionList && conditionList.length) {
                    let record = {
                            rewardEventObjId: rewardEvent._id,
                            platformObjId: playerData.platform,
                            playerObjId: playerData._id,
                            consumptionSlipNo: consumptionRecord.orderNo,
                            bonusAmount: consumptionRecord.bonusAmount || 0,
                            winRatio: consumptionRecord.winRatio || 0,
                            validAmount: consumptionRecord.validAmount || 0,
                            betType: consumptionRecord.betType,
                            consumptionAmount: consumptionRecord.amount || 0,
                            consumptionCreateTime: consumptionRecord.createTime,
                            consumptionRecordObjId: consumptionRecord._id,
                            gameProvider: consumptionRecord.providerId,
                            condition: conditionList

                        };

                    let newRecord = new dbConfig.collection_playerConsumptionSlipRewardGroupRecord(record);

                    newRecordProm.push(newRecord.save());
                }
            }
            return Promise.all(newRecordProm);
        }
    },

    markPromoCodeAsViewed: function (playerId, promoCode) {
        return dbConfig.collection_players.findOne({playerId: playerId}, {platform: 1}).lean().then(
            playerData => {
                if (playerData) {
                    let playerObjId = playerData._id;
                    let platformObjId = playerData.platform;

                    return dbConfig.collection_promoCode.findOneAndUpdate(
                        {
                            playerObjId: playerObjId,
                            platformObjId: platformObjId,
                            code: promoCode,
                            isViewed: {$ne: true}
                        },
                        {$set: {isViewed: true}},
                        {new: true}
                    ).lean();
                }
            }
        );
    },

    getRewardRanking: function (platformId, playerId, promoCode, sortType, startTime, endTime, usePaging, requestPage, count) {
        let platformRecord;
        let rewardEventRecord;
        let rewardRecord;
        let rankingRecord;
        let statsObj;
        let isPaging = usePaging || true;
        let index = 0;
        let currentPage = requestPage || 1;
        let pageNo = null;
        let limit = count || 10;
        let totalCount = 0;
        let totalPage = 1;
        let sortCol = {};
        let totalReceiveCount = 0;
        let totalAmount = 0;
        let totalDeposit = 0;

        if (typeof currentPage != 'number' || typeof limit != 'number') {
            return Promise.reject({name: "DataError", message: "Incorrect parameter type"});
        }

        if (currentPage <= 0) {
            pageNo = 0;
        } else {
            pageNo = currentPage;
        }

        index = ((pageNo - 1) * limit);
        currentPage = pageNo;

        return dbConfig.collection_platform.findOne({platformId: platformId}, {_id: 1, platformId: 1, name: 1}).lean().then(
            platformData => {
                if (platformData && platformData._id) {
                    platformRecord = platformData;

                    return dbConfig.collection_rewardEvent.findOne({platform: platformRecord._id, code: promoCode}).lean();
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            rewardEventData => {
                if (rewardEventData && rewardEventData._id) {
                    rewardEventRecord = rewardEventData;
                    let intervalTime;

                    if (rewardEventRecord) {
                        intervalTime = getIntervalPeriodFromEvent(rewardEventRecord);

                        if (!startTime && intervalTime) {
                            startTime = intervalTime.startTime;
                        }

                        if (!endTime && intervalTime) {
                            endTime = intervalTime.endTime;
                        }
                    }

                    let matchQuery = {
                        "data.platformId": platformRecord._id,
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "data.eventId": rewardEventRecord._id,
                        "mainType": "Reward",
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    };

                    if (sortType == 1) {
                        sortCol = { 'highestAmount': -1 };
                    } else if ( sortType == 2) {
                        sortCol = { 'totalReceiveAmount': -1 };
                    } else if ( sortType == 3) {
                        sortCol = { 'receiveCount': -1 };
                    } else if ( sortType == 4) {
                        sortCol = { 'createTime': -1 };
                    } else {
                        return Promise.reject({name: "DataError", message: "Sort order supported digit 1 to 4 only"});
                    }

                    let countProm = dbConfig.collection_proposal.aggregate([
                        {
                            $match: matchQuery
                        },
                        {
                            $group: {
                                "_id": "$data.playerObjId"
                            }
                        },
                        {
                            $group: {
                                "_id": null,
                                "size": {$sum: 1}
                            }
                        }
                    ]).read("secondaryPreferred");

                    let rewardProm = dbConfig.collection_proposal.aggregate([
                        {
                            $match: matchQuery
                        },
                        {
                            $group: {
                                "_id": "$data.playerObjId",
                                "username": {$first: "$data.playerName"},
                                "receiveCount": {$sum: 1},
                                "totalReceiveAmount": {$sum: "$data.rewardAmount"},
                                "highestAmount": {$max: "$data.rewardAmount"},
                                "createTime": {$max: "$createTime"}
                            }
                        },
                        {
                            $sort: sortCol
                        }
                    ]).read("secondaryPreferred");

                    let sumRewardProm = dbConfig.collection_proposal.aggregate([
                        {
                            $match: matchQuery
                        },
                        {
                            $group: {
                                "_id": null,
                                "totalAmount": {$sum: "$data.rewardAmount"},
                                "totalReceiveCount": {$sum: 1},
                                "totalDeposit": {$sum: "$data.actualAmount"}
                            }
                        }
                    ]).read("secondaryPreferred");

                    return Promise.all([countProm,rewardProm, sumRewardProm]).then(
                        data => {
                            totalCount = data && data[0] && data[0][0] && data[0][0].size ? data[0][0].size : 0;
                            totalPage = Math.ceil(totalCount / limit);
                            totalReceiveCount = data && data[2] && data[2][0] && data[2][0].totalReceiveCount ? data[2][0].totalReceiveCount : 0;
                            totalAmount = data && data[2] && data[2][0] && data[2][0].totalAmount ? data[2][0].totalAmount : 0;
                            totalDeposit = data && data[2] && data[2][0] && data[2][0].totalDeposit ? data[2][0].totalDeposit : 0;

                            let playerRank = Promise.resolve({});
                            if (playerId) {
                                playerRank = getPlayerRewardRanking(data[1], playerId);
                            }

                            let result = data[1] && data[1].length > 0 ? (isPaging === true || isPaging === "true") ? data[1].slice(index, index + limit) : data[1] : [];

                            return Promise.all([result, playerRank]);
                        }
                    );

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find reward event data"});
                }
            }
        ).then(
            rewardData => {
                let proms = [];

                rewardRecord = rewardData && rewardData[0] && rewardData[0].length > 0 ? rewardData[0] : [];
                rankingRecord = rewardData && rewardData[1] ? rewardData[1] : {};

                if (rewardRecord && rewardRecord.length > 0) {
                    rewardRecord.forEach(
                        reward => {
                            if (reward) {
                                let query = {
                                    "data.playerObjId" : ObjectId(reward._id),
                                    "data.platformId": platformRecord._id,
                                    "createTime": {
                                        "$gte": new Date(startTime),
                                        "$lte": new Date(endTime)
                                    },
                                    "data.eventId": rewardEventRecord._id,
                                    "mainType": "Reward",
                                    "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                };

                                proms.push(getLastRewardDetail(query));
                            }
                        }
                    );
                }

                return Promise.all(proms).then(
                    allPlayerLastRewardData => {

                        let rankPlayerLastRewardProm = Promise.resolve({});

                        if (rankingRecord && Object.keys(rankingRecord).length > 0 && rankingRecord._id) {
                            let query = {
                                "data.playerObjId" : ObjectId(rankingRecord._id),
                                "data.platformId": platformRecord._id,
                                "createTime": {
                                    "$gte": new Date(startTime),
                                    "$lte": new Date(endTime)
                                },
                                "data.eventId": rewardEventRecord._id,
                                "mainType": "Reward",
                                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                            };

                            rankPlayerLastRewardProm = getLastRewardDetail(query);

                            return Promise.all([rankPlayerLastRewardProm]).then(
                                rankPlayerLastRewardData => {

                                    if (rankPlayerLastRewardData && rankPlayerLastRewardData[0]) {
                                        delete rankPlayerLastRewardData[0].playerObjId;
                                        delete rankingRecord._id;
                                        delete rankingRecord.createTime;

                                        rankingRecord.data = rankPlayerLastRewardData[0];
                                    }

                                    return allPlayerLastRewardData;
                                }
                            )
                        } else {
                            return allPlayerLastRewardData;
                        }
                    }
                );
            }
        ).then(
            lastRewardData => {
                statsObj = {};
                statsObj.totalCount = totalCount;
                statsObj.totalPage = (isPaging === true || isPaging === "true") ? totalPage : 1;
                statsObj.currentPage = currentPage;
                statsObj.totalReceiveCount = totalReceiveCount;
                statsObj.totalAmount = totalAmount;
                statsObj.totalPlayerCount = totalCount;
                statsObj.totalDeposit = totalDeposit;

                if (rewardRecord && rewardRecord.length > 0 && lastRewardData && lastRewardData.length > 0) {
                    rewardRecord.forEach(reward => {
                        let indexNo = lastRewardData.findIndex(x => x && x.playerObjId && reward && reward._id && (x.playerObjId.toString() == reward._id.toString()));

                        if (indexNo != -1) {
                            delete lastRewardData[indexNo].playerObjId;
                            reward.data = lastRewardData[indexNo];
                        }

                        delete reward._id;
                        delete reward.createTime;
                    });
                }

                return {stats: statsObj, rewardRanking: rewardRecord, playerRanking: rankingRecord};
            }
        )
    },

    getPlayerBaccaratRewardDetail: (platformId, playerId, eventCode, isApply, applyTargetTime) => {
        let player, platform, event, isSharedWithXIMA, intervalTime, rewardCriteria;
        let currentTime = applyTargetTime || new Date();
        let totalApplied = 0, intervalMaxRewardAmount = 0;
        let outputList = [];
        let forbidWithdrawAfterApply = false;
        let forbidWithdrawIfBalanceAfterUnlock = 0;
        let applicableBConsumption = [];
        let lastBConsumption;

        return getPlatformAndPlayerFromId(platformId, playerId).then(
            data => {
                ([platform, player] = data);

                return dbRewardEvent.getPlatformRewardEventWithTypeName(platform._id, constRewardType.BACCARAT_REWARD_GROUP, eventCode);
            }
        ).then(
            eventData => {
                event = eventData;

                isSharedWithXIMA = Boolean(event && event.condition && event.condition.isSharedWithXIMA);

                if (event.validStartTime && event.validStartTime > currentTime || event.validEndTime && event.validEndTime < currentTime) {
                    return Q.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "This reward event is not valid anymore"
                    });
                }

                intervalTime = getIntervalPeriodFromEvent(event, applyTargetTime);

                let similarRewardProposalProm = Promise.resolve([]);

                if (!player) {
                    return similarRewardProposalProm;
                }

                let rewardProposalQuery = {
                    "data.platformObjId": player.platform,
                    "data.playerObjId": player._id,
                    "data.eventId": event._id,
                    status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                };

                if (intervalTime) {
                    rewardProposalQuery["data.applyTargetDate"] = {$gte: intervalTime.startTime, $lt: intervalTime.endTime};
                }
                similarRewardProposalProm = dbConfig.collection_proposal.find(rewardProposalQuery).lean();

                if (player.playerLevel && player.playerLevel._id && event && event.param && event.param.rewardParam && event.param.rewardParam.length > 0) {
                    event.param.rewardParam.forEach(param => {
                        if (param && param.levelId == player.playerLevel._id && param.value && param.value.length > 0) {
                            forbidWithdrawIfBalanceAfterUnlock = param.value[0].forbidWithdrawIfBalanceAfterUnlock || 0;
                        }
                    });
                }

                return similarRewardProposalProm;
            }
        ).then(
            rewardProposalData => {
                rewardProposalData.map(proposal => {
                    if (proposal && proposal.data && proposal.data.rewardAmount) {
                        totalApplied += Number(proposal.data.rewardAmount);
                    }
                });

                if (event && event.condition && event.condition.intervalMaxRewardAmount) {
                    intervalMaxRewardAmount = event.condition.intervalMaxRewardAmount;
                    if (totalApplied >= intervalMaxRewardAmount && isApply) {
                        // update error message later if necessary
                        return Promise.reject({status: constServerCode.INTERVAL_REWARD_CAPPED, message: `您本日申请额度已达红利上限(${intervalMaxRewardAmount}元），请明天再来唷！`});
                    }
                }

                rewardCriteria = event.param.rewardParam[0].value;

                if (event.condition.isPlayerLevelDiff && player) {
                    let rewardParam = event.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id));
                    if (rewardParam && rewardParam[0] && rewardParam[0].value) {
                        rewardCriteria = rewardParam[0].value;
                    }
                }

                let proms = [];

                for (let i = 0; i < rewardCriteria.length; i++) {
                    let criteria = rewardCriteria[i];
                    if (!criteria) {
                        continue;
                    }

                    let betType = criteria.betType = handlingBaccaratBetTypeList(criteria.betType);

                    let consumptionMetQuery = {
                        player: player._id,
                        createTime: {
                            $gte: intervalTime.startTime,
                            $lt: intervalTime.endTime,
                        },
                        provider: criteria.sourceProvider,
                        hostResult: Number(criteria.hostResult),
                        playerResult: Number(criteria.playerResult),
                        betDetails: {
                            $elemMatch: {
                                separatedBetType: {$in: betType},
                                separatedBetAmount: {$gte: criteria.minBetAmount}
                            }
                        }
                    };

                    if (isApply) {
                        consumptionMetQuery.bUsed = {$ne: true};
                    }

                    let consumptionMetProm = dbConfig.collection_baccaratConsumption.find(consumptionMetQuery).sort({createTime: -1}).lean().then(
                        bConsumptions => {
                            if (!bConsumptions || !bConsumptions.length) {
                                return false;
                            }

                            return {bConsumptions, criteria}
                        }
                    );

                    proms.push(consumptionMetProm);
                }

                return Promise.all(proms);
            }
        ).then(
            consumptionMet => {
                for (let i = 0; i < consumptionMet.length; i++) {
                    let isApplicable = consumptionMet[i];
                    if (!isApplicable) {
                        continue;
                    }

                    // rewardApplicable = true;
                    let bConsumptions = isApplicable.bConsumptions;
                    let criteria = isApplicable.criteria;
                    if (isApplicable.bConsumptions && isApplicable.bConsumptions.length) {
                        if (lastBConsumption) {
                            if (lastBConsumption.createTime && isApplicable.bConsumptions[0].createTime
                                && new Date(lastBConsumption.createTime).getTime() < new Date(isApplicable.bConsumptions[0].createTime).getTime()) {
                                lastBConsumption = isApplicable.bConsumptions[0];
                            }
                        } else {
                            lastBConsumption = isApplicable.bConsumptions[0];
                        }
                    };
                    for (let i = 0; i < bConsumptions.length; i++) {
                        insertOutputList(bConsumptions[i], criteria);
                    }
                }

                if (Boolean(outputList.length) && isApply) {
                    return handleApplicationOutput(totalApplied, outputList);
                }

                if (!isApply) {
                    return {
                        forbidWithdrawAfterApply,
                        forbidWithdrawIfBalanceAfterUnlock,
                        totalAppliedBefore: totalApplied,
                        list: outputList
                    }
                }

                return applyFailedError(rewardCriteria[0]);
            }
        );

        function insertOutputList (bConsumption, criteria) {
            if (!bConsumption.betDetails) {
                return;
            }
            forbidWithdrawAfterApply = forbidWithdrawAfterApply || criteria.forbidWithdrawAfterApply;
            forbidWithdrawIfBalanceAfterUnlock = Number(criteria.forbidWithdrawIfBalanceAfterUnlock) && Number(criteria.forbidWithdrawIfBalanceAfterUnlock) < forbidWithdrawIfBalanceAfterUnlock ? Number(criteria.forbidWithdrawIfBalanceAfterUnlock) : forbidWithdrawIfBalanceAfterUnlock;

            let applyDetail = {
                bConsumption: String(bConsumption._id),
                roundNo: bConsumption.roundNo,
                consumptionTime: bConsumption.createTime,
                providerObjId: criteria.sourceProvider,
                winResult: [bConsumption.hostResult, bConsumption.playerResult],
                remark: criteria.remark
            };

            let betType;
            let betAmount = 0;

            for (let i = 0; i < bConsumption.betDetails.length; i++) {
                let detail = bConsumption.betDetails[i];
                if (!detail) {
                    continue;
                }

                if (criteria && criteria.betTypes && !(criteria.betTypes.includes(detail.separatedBetType))) {
                    continue;
                }

                if (detail.separatedBetAmount <= betAmount) {
                    continue;
                }

                betType = detail.separatedBetType;
                betAmount = detail.separatedBetAmount;
            }

            applyDetail.betType = betType;
            applyDetail.betAmount = betAmount;
            applyDetail.rewardAmount = betAmount * criteria.rewardAmount;
            applyDetail.spendingTimes = criteria.spendingTimes;
            applyDetail.spendingAmount = applyDetail.rewardAmount * criteria.spendingTimes;

            if (!isApply) {
                applyDetail.isValid = !bConsumption.bUsed;
            }

            let existedApplyIndex = outputList.findIndex((val) => {return val == String(bConsumption._id)});
            if (existedApplyIndex != -1) {
                let existedApply = outputList[existedApplyIndex];
                if (existedApply.rewardAmount >= applyDetail.rewardAmount) {
                    return; // keep the older if the older is higher amount
                }

                outputList.splice(existedApplyIndex, 1);
            }
            else {
                applicableBConsumption.push(String(bConsumption._id));
            }

            outputList.push(applyDetail);
        }

        function handleApplicationOutput (totalAppliedBefore, list) {
            let updateUsedPromiseChain = Promise.resolve();
            let updatedBConsumption = [];

            for (let i = 0; i < applicableBConsumption.length; i++) {
                let bConsumption = applicableBConsumption[i];

                updateUsedPromiseChain = updateUsedPromiseChain.then(() => {
                    return dbConfig.collection_baccaratConsumption.findOneAndUpdate({_id: bConsumption, bUsed:false}, {bUsed: true}, {new: true, projection: {_id: 1}}).lean();
                }).then(
                    data => {
                        if (!data) {
                            for (let j = 0; j < updatedBConsumption.length; j++) {
                                dbConfig.collection_baccaratConsumption.update({_id: updatedBConsumption[i]}, {bUsed: false}).catch(err => {
                                    console.log("fail to turn baccarat consumption back to bUsed false", updatedBConsumption[i], err);
                                });
                            }

                            return Promise.reject({status: constServerCode.CONCURRENT_DETECTED, message: "Concurrent issue detected."});
                        }

                        updatedBConsumption.push(bConsumption);
                    }
                );
            }

            return updateUsedPromiseChain.then(
                () => {
                    return {totalAppliedBefore, list, forbidWithdrawAfterApply, forbidWithdrawIfBalanceAfterUnlock, lastBConsumption};
                }
            );
        }

        function applyFailedError (criteria) {
            let provider;
            let query = {
                player: player._id,
                createTime: {
                    $gte: intervalTime.startTime,
                    $lt: intervalTime.endTime,
                },
                bUsed: {$ne: true},
                provider: criteria.sourceProvider
            };

            return dbConfig.collection_gameProvider.findOne({_id: criteria.sourceProvider}, {name: 1}).lean().then(
                providerData => {
                    if (!providerData) {
                        return Promise.reject({message: "Provider not found"});
                    }
                    provider = providerData;

                    return dbConfig.collection_baccaratConsumption.findOne(query, {_id:1}).lean();
                }
            ).then(
                record => {
                    if (!record) {
                        return Promise.reject({status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD, message: `查询您今日暂无${provider.name}百家乐投注记录，请先投注`});
                    }
                    query.betDetails = {
                        $elemMatch: {
                            separatedBetType: {$in: criteria.betType},
                        }
                    };

                    return dbConfig.collection_baccaratConsumption.findOne(query, {_id:1}).lean();
                }
            ).then(
                record => {
                    if (!record) {
                        let betTypeString = criteria.betType && criteria.betType.join && criteria.betType.join() || "指定";
                        return Promise.reject({status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD, message: `查询您今日暂无下注'${betTypeString}'项目记录，请先投注`});
                    }
                    query.betDetails = {
                        $elemMatch: {
                            separatedBetType: {$in: criteria.betType},
                            separatedBetAmount: {$gte: criteria.minBetAmount}
                        }
                    };

                    return dbConfig.collection_baccaratConsumption.findOne(query, {_id:1}).lean();
                }
            ).then(
                record => {
                    if (!record) {
                        return Promise.reject({status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD, message: `查询您单局下注金额不满足条件（最低${criteria.minBetAmount}元）请调整下注金额再进行投注`});
                    }

                    return Promise.reject({status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD, message: "Bet result does not satisfy the reward criteria. Please continue to test your luck."})
                }
            );
        }
    },
};

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

function isDateWithinPeriod(date, period) {
    if (period && period.startTime && period.endTime) {
        return date > period.startTime && date < period.endTime;
    }
    return false;
}

function getIntervalPeriodFromEvent(event, applyTargetTime) {
    let intervalTime = dbUtility.getTodaySGTime();
    if (event && event.condition) {
        switch (event.condition.interval) {
            case "1":
                intervalTime = applyTargetTime ? dbUtility.getDayTime(applyTargetTime) : dbUtility.getTodaySGTime();
                break;
            case "2":
                intervalTime = applyTargetTime ? dbUtility.getWeekTime(applyTargetTime) : dbUtility.getCurrentWeekSGTime();
                break;
            case "3":
                intervalTime = applyTargetTime ? dbUtility.getBiWeekSGTIme(applyTargetTime) : dbUtility.getCurrentBiWeekSGTIme();
                break;
            case "4":
                intervalTime = applyTargetTime ? dbUtility.getMonthSGTIme(applyTargetTime) : dbUtility.getCurrentMonthSGTIme();
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

/**
 * Expire promo code in all platforms pass expirationTime
 */
function expirePromoCode(isOpenPromoCode) {

    if (isOpenPromoCode){
        return dbConfig.collection_openPromoCodeTemplate.update({
            status: constPromoCodeStatus.AVAILABLE,
            expirationTime: {$lte: new Date()}
        }, {
            status: constPromoCodeStatus.EXPIRED
        }, {
            multi: true
        });
    }
    else{
        return dbConfig.collection_promoCode.update({
            status: constPromoCodeStatus.AVAILABLE,
            expirationTime: {$lte: new Date()}
        }, {
            status: constPromoCodeStatus.EXPIRED
        }, {
            multi: true
        });
    }

}

function promoCondition(promo) {
    let proMsg = '';

    if (promo.minTopUpAmount) {
        proMsg += "有新存款<span class=\"c_color\">(" + promo.minTopUpAmount + "以上)" + "</span>";

        if (promo && promo.promoCodeTypeObjId && promo.promoCodeTypeObjId.type == 3) {
            proMsg += ' 且尚未投注';
        }
    }
    // if (promo.maxTopUpAmount) {
    //     proMsg += ", 存款上限<span class=\"c_color\">(" + promo.maxTopUpAmount + ")" + "</span>";
    // }

    if (!proMsg) {
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

function getRewardPeriodToTime (rewardPeriod) {
    let time = null;

    switch (rewardPeriod) {
        case "1":
            time = dbUtility.getTodaySGTime();
            break;
        case "2":
            time =  dbUtility.getCurrentWeekSGTime();
            break;
        case "3":
            time =  dbUtility.getCurrentBiWeekSGTIme();
            break;
        case "4":
            time =  dbUtility.getCurrentMonthSGTIme();
            break;
        default:
            time = dbUtility.getTodaySGTime();
            break;
    }

    return time;
}

function addUsedRewardToTopUpRecord(topUpProposalId, rewardEvent) {
    return dbConfig.collection_playerTopUpRecord.findOne({proposalId: topUpProposalId}).lean().then(
        topUpRecord => {
            if (topUpRecord) {
                return dbConfig.collection_playerTopUpRecord.findOneAndUpdate({
                    _id: topUpRecord._id,
                    createTime: topUpRecord.createTime,
                    platformId: topUpRecord.platformId
                }, {
                    $push: {usedEvent: rewardEvent},
                    bDirty: true
                }).lean().exec();
            }
            return Promise.resolve();
        }
    );
}

function getPlayerRewardRanking(rewardRecord, playerId) {
    let rankNo = 0;
    let playerRankingData = {};

    return dbConfig.collection_players.findOne({playerId: playerId}, {_id: 1}).lean().then(
        playerData => {
            if (playerData && playerData._id) {

                if(rewardRecord && rewardRecord.length > 0) {
                    for (let x = 0, len = rewardRecord.length; x < len; x++) {
                        let rank = rewardRecord[x];

                        if (rank) {
                            rankNo = rankNo + 1;
                        }

                        if (rank._id && (playerData._id.toString() == rank._id.toString())) {
                            playerRankingData = JSON.parse(JSON.stringify(rank));
                            playerRankingData.index = rankNo;
                            break;
                        }
                    }

                    return playerRankingData;
                }
            } else {
                return Promise.reject({name: "DataError", message: "Invalid player data"});
            }
        }
    );
}

function getLastRewardDetail(query) {
    let result = {};

    return dbConfig.collection_proposal.findOne(query).sort({createTime: -1}).lean().then(
        lastProposalData => {
            if (lastProposalData) {
                result.playerObjId = lastProposalData.data.playerObjId;
                result.rewardAmount = lastProposalData.data.rewardAmount;
                result.depositAmount = lastProposalData.data.actualAmount;
                result.rewardTime = lastProposalData.createTime;
                result.betTime = lastProposalData.data.betTime;
                result.betType = lastProposalData.data.betType;
                result.betAmount = lastProposalData.data.betAmount;
                result.winAmount = lastProposalData.data.winAmount;
                result.winTimes = lastProposalData.data.winTimes;
                result.winResult = lastProposalData.data.winResult;
            }
            return result;
        }
    );
}

function getPlatformAndPlayerFromId(platformId, playerId) {
    let player;
    if (playerId) {
        return dbConfig.collection_players.findOne({playerId}).populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Player is not found"});
                }

                player = playerData;

                return dbConfig.collection_platform.findOne({_id: player.platform}).lean();
            }
        ).then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Platform does not exist"});
                }

                return [platformData, player];
            }
        );
    }
    else {
        return dbConfig.collection_platform({platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Platform does not exist"});
                }

                return [platformData];
            }
        );
    }
}

function handlingBaccaratBetTypeList (betType) {
    for (let i = 0; i < betType.length; i++) {
        if (betType[i] == "庄免佣、庄(免佣)") {
            betType.push("庄免佣");
            betType.push("庄(免佣)");
        }

        if (betType[i] == "超级六、幸運六、超级六(免佣)") {
            betType.push("超级六");
            betType.push("幸運六");
            betType.push("超级六(免佣)");
        }
    }

    let deleteIndex = betType.indexOf("庄免佣、庄(免佣)");
    if (deleteIndex > -1) {
        betType.splice(deleteIndex, 1);
    }

    deleteIndex = betType.indexOf("超级六、幸運六、超级六(免佣)");
    if (deleteIndex > -1) {
        betType.splice(deleteIndex, 1);
    }

    return betType;
}

var proto = dbPlayerRewardFunc.prototype;
proto = Object.assign(proto, dbPlayerReward);

// This make WebStorm navigation work
module.exports = dbPlayerReward;
