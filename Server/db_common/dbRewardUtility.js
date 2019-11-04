const dbUtil = require('./../modules/dbutility');
const dbConfig = require('./../modules/dbproperties');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPropUtil = require('./../db_common/dbProposalUtility');

const constProposalStatus = require('./../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');
const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const constRewardType = require('./../const/constRewardType');
const constServerCode = require('./../const/constServerCode');
const localization = require("../modules/localization");

const dbRewardUtility = {
    // region Reward operation
    findStartedRewardTaskGroup: (platformObjId, playerObjId) => {
        return dbConfig.collection_rewardTaskGroup.findOne({
            platformId: platformObjId,
            playerId: playerObjId,
            status: {$in: [constRewardTaskStatus.STARTED]}
        }).lean();
    },

    // endregion

    // region Reward Time
    getRewardEventIntervalTime: (rewardData, eventData, isNewDefineHalfMonth) => {
        let todayTime = rewardData.applyTargetDate ? dbUtil.getTargetSGTime(rewardData.applyTargetDate) : dbUtil.getTodaySGTime();
        let intervalTime;

        if (eventData.condition.interval) {
            switch (eventData.condition.interval) {
                case "1":
                    intervalTime = todayTime;
                    break;
                case "2":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getWeekTime(rewardData.applyTargetDate) : dbUtil.getCurrentWeekSGTime();
                    break;
                case "3":
                    if (isNewDefineHalfMonth){
                        intervalTime = rewardData.applyTargetDate ? dbUtil.getCurrentHalfMonthSGTIme(rewardData.applyTargetDate) : dbUtil.getCurrentHalfMonthSGTIme();
                    }
                    else{
                        intervalTime = rewardData.applyTargetDate ? dbUtil.getBiWeekSGTIme(rewardData.applyTargetDate) : dbUtil.getCurrentBiWeekSGTIme();
                    }
                    break;
                case "4":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getMonthSGTIme(rewardData.applyTargetDate) : dbUtil.getCurrentMonthSGTIme();
                    break;
                case "6":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getLastMonthSGTImeFromDate(rewardData.applyTargetDate) : dbUtil.getLastMonthSGTime();
                    break;
                case "7":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getYearlySGTIme() : {};
                    break;
                default:
                    if (eventData.validStartTime && eventData.validEndTime) {
                        intervalTime = {startTime: eventData.validStartTime, endTime: eventData.validEndTime};
                    }
                    break;
            }
        }

        return intervalTime;
    },

    getRewardEventIntervalTimeByApplicationDate: (applicationDate, eventData) => {
        let todayTime = applicationDate ? dbUtil.getTargetSGTime(applicationDate) : dbUtil.getTodaySGTime();
        let intervalTime;
        let duration = null;

        switch (eventData.condition.interval) {
            // weekly
            case '2':
                duration = 7;
                break;
            // bi-weekly
            case '3':
                duration = 15;
                break;
            // monthly
            case '4':
                duration = 30;
                break;
        }

        let endDate = dbUtil.getNdaylaterFromSpecificStartTime(duration, todayTime.startTime);
        intervalTime = {startTime: todayTime.startTime, endTime: endDate};

        return intervalTime;
    },

    isRewardValidNow: (eventData) => {
        let isValid = true;

        if (eventData) {
            let dateNow = Date.now();

            if (eventData.validStartTime && eventData.validStartTime.getTime() > dateNow) {
                isValid = false;
            }

            if (eventData.validEndTime && eventData.validEndTime.getTime() < dateNow) {
                isValid = false;
            }
        }

        return isValid;
    },

    /**
     *
     * @param period - refer constRewardPeriod
     * @returns {Query}
     */
    getConsumptionReturnPeriodTime: (period) => {
        let intervalTime;
        if (period) {
            switch (period) {
                case "1":
                    intervalTime = dbUtil.getYesterdayConsumptionReturnSGTime();
                    break;
                case "2":
                    intervalTime = dbUtil.getLastWeekConsumptionReturnSGTime();
                    break;
                case "3":
                    intervalTime = dbUtil.getLastBiWeekConsumptionReturnSGTime();
                    break;
                case "4":
                    intervalTime = dbUtil.getLastMonthConsumptionReturnSGTime();
                    break;
                default:
                    // No interval time. Will return undefined
                    break;
            }
        }

        return intervalTime;
    },
    getConsumptionReturnCurrentPeriodTime: (period) => {
        let intervalTime;
        if (period) {
            switch (period) {
                case "1":
                    intervalTime = dbUtil.getTodayConsumptionReturnSGTime();
                    break;
                case "2":
                    intervalTime = dbUtil.getCurrentWeekConsumptionReturnSGTime();
                    break;
                case "3":
                    intervalTime = dbUtil.getCurrentBiWeekConsumptionReturnSGTime();
                    break;
                case "4":
                    intervalTime = dbUtil.getCurrentMonthConsumptionReturnSGTime();
                    break;
                default:
                    // No interval time. Will return undefined
                    break;
            }
        }

        return intervalTime;
    },

    // endregion

    // region Reward condition
    getPendingRewardTaskCount: function (query, rewardTaskWithProposalList) {
        return dbConfig.collection_proposal.find(query).populate({
            path: "type",
            model: dbConfig.collection_proposalType
        }).lean().then(
            tasks => {
                // if the proposal result is include in the rewardtasklist
                let chosenTask = [];
                tasks.forEach(function (task) {
                    if (task.type) {
                        let tname = task.type.name;
                        if (rewardTaskWithProposalList.indexOf(tname) !== -1) {
                            chosenTask.push(task);
                        }
                    }
                });

                return chosenTask.length;
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error finding player reward task", error: error})
            }
        );
    },

    checkApplyTopUpReturn: (player, topUpReturnCode, userAgentStr, inputData, topUpMethod, isSplitTopUp) => {
        let rewardEvent;
        let intervalTime;
        let applyAmount = inputData.amount? inputData.amount: 0;
        let selectedRewardParam = {};

        if (player.permission && player.permission.banReward) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Player do not have permission for reward"
            });
        }

        return dbConfig.collection_rewardEvent.findOne({
            platform: player.platform,
            code: topUpReturnCode
        }).populate({
            path: "type", model: dbConfig.collection_rewardType
        }).lean().then(
            async rewardEventData => {
                rewardEvent = rewardEventData;

                if (
                    rewardEvent
                    && rewardEvent.type
                    && rewardEvent.type.name
                    && rewardEvent.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP
                ) {
                    // Check reward individual permission
                    let playerIsForbiddenForThisReward = dbRewardUtility.isRewardEventForbidden(player, rewardEvent._id);
                    if (playerIsForbiddenForThisReward) {
                        return Promise.reject({
                            name: "DataError",
                            message: "Player is forbidden for this reward."
                        });
                    }

                    // Set reward param for player level to use
                    if (rewardEvent.condition.isPlayerLevelDiff) {
                        selectedRewardParam = rewardEvent.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id))[0].value;
                    } else {
                        selectedRewardParam = rewardEvent.param.rewardParam[0].value;
                    }

                    //check valid time for reward event
                    let curTime = new Date();
                    if ((rewardEvent.validStartTime && curTime.getTime() < rewardEvent.validStartTime.getTime()) ||
                        (rewardEvent.validEndTime && curTime.getTime() > rewardEvent.validEndTime.getTime())) {
                        return Promise.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "This reward event is not valid anymore"
                        });
                    }

                    // The following behavior can generate reward task
                    let rewardTaskWithProposalList = [
                        constRewardType.PLAYER_TOP_UP_RETURN,
                        constRewardType.PLAYER_TOP_UP_RETURN_GROUP
                    ];

                    let pendingCount = dbRewardUtility.getPendingRewardTaskCount({
                        mainType: 'Reward',
                        "data.playerObjId": player._id,
                        status: 'Pending'
                    }, rewardTaskWithProposalList);

                    let rewardData = {};

                    if (rewardEvent.condition && rewardEvent.condition.interval) {
                        intervalTime = dbRewardUtility.getRewardEventIntervalTime(rewardData, rewardEvent);
                        await dbRewardUtility.checkRewardApplyDeviceDetails(rewardEvent, player, intervalTime);
                    }
                    let todayTime = dbUtil.getTodaySGTime();

                    let eventQuery = {
                        "data.platformObjId": player.platform._id,
                        "data.playerObjId": player._id,
                        "data.eventId": rewardEvent._id,
                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    let topupMatchQuery = {
                        playerId: player._id,
                        platformId: player.platform._id
                    };

                    if (rewardEvent.condition && rewardEvent.condition.topupType && rewardEvent.condition.topupType.length > 0) {
                        topupMatchQuery.topUpType = {$in: rewardEvent.condition.topupType}
                    }

                    if (rewardEvent.condition && rewardEvent.condition.onlineTopUpType && rewardEvent.condition.onlineTopUpType.length > 0) {
                        if (!topupMatchQuery.$and) {
                            topupMatchQuery.$and = [];
                        }

                        topupMatchQuery.$and.push({$or: [{merchantTopUpType: {$in: rewardEvent.condition.onlineTopUpType}}, {merchantTopUpType: {$exists: false}}]});
                    }

                    if (rewardEvent.condition && rewardEvent.condition.bankCardType && rewardEvent.condition.bankCardType.length > 0) {
                        if (!topupMatchQuery.$and) {
                            topupMatchQuery.$and = [];
                        }

                        topupMatchQuery.$and.push({$or: [{bankCardType: {$in: rewardEvent.condition.bankCardType}}, {bankCardType: {$exists: false}}]});
                    }

                    if (intervalTime) {
                        topupMatchQuery.createTime = {
                            $gte: intervalTime.startTime,
                            $lte: intervalTime.endTime
                        };
                        eventQuery.settleTime = {
                            $gte: intervalTime.startTime,
                            $lte: intervalTime.endTime
                        };
                    }
                    let eventInPeriodProm = Promise.resolve([]);
                    if (rewardEvent.param && rewardEvent.param.countInRewardInterval) {
                        eventInPeriodProm = dbConfig.collection_proposal.find(eventQuery).lean();
                    }

                    let topupInPeriodProm = Promise.resolve([]);
                    if (rewardEvent.condition.topUpCountType && rewardEvent.condition) {
                        topupInPeriodProm = dbConfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
                    }
                    // let rewardData = {};

                    return Promise.all([pendingCount, eventInPeriodProm, topupInPeriodProm]).then(
                        timeCheckData => {
                            // rewardData.selectedTopup = timeCheckData[0];
                            let eventInPeriodCount = timeCheckData[1].length;
                            let topupInPeriodCount = timeCheckData[2].length + 1; // + 1 for current top up
                            let rewardAmountInPeriod = timeCheckData[1].reduce((a, b) => a + b.data.rewardAmount, 0);

                            // if there is a pending reward, then no other reward can be applied.
                            if (timeCheckData[0] && timeCheckData[0] > 0) {
                                if (rewardTaskWithProposalList.indexOf(rewardEvent.type.name) !== -1) {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_PENDING_REWARD_PROPOSAL,
                                        name: "DataError",
                                        message: "Player or partner already has a pending reward proposal for this type"
                                    });
                                }
                            }

                            let topUpDevice = dbUtil.getInputDevice(userAgentStr, false);

                            // check device
                            if (dbRewardUtility.checkInterfaceRewardPermission(rewardEvent, topUpDevice)) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Top up device does not match, fail to claim reward"
                                });
                            }

                            // Check top up count within period
                            if (rewardEvent.condition.topUpCountType) {
                                let intervalType = rewardEvent.condition.topUpCountType[0];
                                let value1 = rewardEvent.condition.topUpCountType[1];
                                let value2 = rewardEvent.condition.topUpCountType[2];

                                const hasMetTopupCondition =
                                    intervalType == "1" && topupInPeriodCount >= value1
                                    || intervalType == "2" && topupInPeriodCount <= value1
                                    || intervalType == "3" && topupInPeriodCount == value1
                                    || intervalType == "4" && topupInPeriodCount >= value1 && topupInPeriodCount < value2;

                                if (!hasMetTopupCondition) {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Top up count does not meet period condition, fail to claim reward"
                                    });
                                }
                            }
                            // Check reward apply limit in period
                            if (rewardEvent.param && rewardEvent.param.countInRewardInterval && rewardEvent.param.countInRewardInterval <= eventInPeriodCount) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Reward claimed exceed limit, fail to claim reward"
                                });
                            }

                            // Set reward param step to use
                            if (rewardEvent.param.isMultiStepReward) {
                                if (rewardEvent.param.isSteppingReward) {
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

                            if (applyAmount < selectedRewardParam.minTopUpAmount) {
                                if (isSplitTopUp) {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: localization.localization.translate("Sub top up amount has not met the reward condition")
                                    });
                                } else {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Insufficient top up amount, fail to claim reward"
                                    });
                                }
                            }

                            if (rewardEvent.condition.isDynamicRewardAmount) {
                                // Check reward amount exceed daily limit
                                if (rewardEvent.param.dailyMaxRewardAmount && rewardAmountInPeriod >= rewardEvent.param.dailyMaxRewardAmount) {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Claimed reward reach daily max amount, fail to claim reward"
                                    });
                                }
                                selectedRewardParam.spendingTimes = selectedRewardParam.spendingTimes || 1;
                            }

                            return Promise.resolve(rewardEvent);
                        }
                    )
                }
                else if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                    return dbRewardUtility.checkApplyRetentionReward(player, rewardEvent, applyAmount, userAgentStr, inputData, topUpMethod, true);
                }
                else {
                    return Promise.reject({
                        status: constServerCode.REWARD_EVENT_INVALID,
                        name: "DataError",
                        message: "Can not find reward event"
                    });
                }
            }
        );
    },

    checkPhoneNumberAndBankCard: (eventData, playerData) => {
        let result = true;
        if (playerData && eventData && eventData.condition) {
            if (eventData.condition.requiredPhoneNumber && eventData.condition.requiredBankCard && (!Boolean(playerData.phoneNumber) || !Boolean(playerData.bankAccount))){
                result = false;
            }
            else if(eventData.condition.requiredPhoneNumber && !Boolean(playerData.phoneNumber)){
                result = false;
            }
            else if(eventData.condition.requiredBankCard && !Boolean(playerData.bankAccount)){
                result = false;
            }
        }

        return result
    },

    checkApplyRetentionReward: function (player, rewardEvent, applyAmount, userAgentStr, inputData, topUpMethod, isFrontEndApply) {
        let intervalTime = null;

        //check valid time for reward event
        let curTime = new Date();
        if ((rewardEvent.validStartTime && curTime.getTime() < rewardEvent.validStartTime.getTime()) ||
            (rewardEvent.validEndTime && curTime.getTime() > rewardEvent.validEndTime.getTime())) {
            return Promise.reject({
                status: constServerCode.REWARD_EVENT_INVALID,
                name: "DataError",
                message: "This reward event is not valid anymore"
            });
        }

        // The following behavior can generate reward task
        let rewardTypeWithProposalList = [
            constRewardType.PLAYER_RETENTION_REWARD_GROUP,
        ];

        let pendingCount = dbRewardUtility.getPendingRewardTaskCount({
            mainType: 'Reward',
            "data.playerObjId": player._id,
            status: 'Pending'
        }, rewardTypeWithProposalList);

        let rewardData = {};

        if (rewardEvent.condition && rewardEvent.condition.interval) {
            intervalTime = dbRewardUtility.getRewardEventIntervalTime(rewardData, rewardEvent, true);
        }
        let todayTime = dbUtil.getTodaySGTime();

        // check the total application number
        let eventQuery = {
            lastApplyDate: {$gte: todayTime.startTime, $lte: todayTime.endTime},
            rewardEventObjId: rewardEvent._id,
            platformObjId: player.platform._id
        };

        let topupMatchQuery = {
            playerId: player._id,
            platformId: player.platform._id
        };

        if (rewardEvent.condition && rewardEvent.condition.topupType && rewardEvent.condition.topupType.length > 0) {
            topupMatchQuery.topUpType = {$in: rewardEvent.condition.topupType}
        }

        if (rewardEvent.condition && rewardEvent.condition.onlineTopUpType && rewardEvent.condition.onlineTopUpType.length > 0) {
            if (!topupMatchQuery.$and) {
                topupMatchQuery.$and = [];
            }

            topupMatchQuery.$and.push({$or: [{merchantTopUpType: {$in: rewardEvent.condition.onlineTopUpType}}, {merchantTopUpType: {$exists: false}}]});
        }

        if (rewardEvent.condition && rewardEvent.condition.bankCardType && rewardEvent.condition.bankCardType.length > 0) {
            if (!topupMatchQuery.$and) {
                topupMatchQuery.$and = [];
            }

            topupMatchQuery.$and.push({$or: [{bankCardType: {$in: rewardEvent.condition.bankCardType}}, {bankCardType: {$exists: false}}]});
        }

        if (intervalTime) {
            topupMatchQuery.createTime = {
                $gte: intervalTime.startTime,
                $lte: intervalTime.endTime
            };
            eventQuery.lastApplyDate = {
                $gte: intervalTime.startTime,
                $lte: intervalTime.endTime
            };
        }

        // check the application limit has reached
        let eventInPeriodProm = Promise.resolve([]);
        if (rewardEvent.condition && rewardEvent.condition.quantityLimitInInterval) {
            eventInPeriodProm = dbConfig.collection_playerRetentionRewardGroupRecord.find(eventQuery).count().lean();
        }
        // check the application limit has reached of the whole event
        let eventInLifeTimeProm = Promise.resolve([]);
        if (rewardEvent.condition && rewardEvent.condition.applyLimit) {
            let query = Object.assign({},eventQuery);
            query.lastApplyDate = {
                $gte: rewardEvent.validStartTime,
                $lte: rewardEvent.validEndTime
            };
            query.playerObjId = player._id;
            eventInLifeTimeProm = dbConfig.collection_playerRetentionRewardGroupRecord.find(query).count().lean();
        }

        let topupInPeriodProm = Promise.resolve([]);
        if (rewardEvent.condition && rewardEvent.condition.topUpCountType) {
            topupInPeriodProm = dbConfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
        }

        // check reward apply restriction on ip, phone and IMEI
        let checkHasReceivedProm;

        // get the last applied reward proposal to get the retentionApplicationDate for loginMode 3
        let lastAppliedRewardProposalProm = Promise.resolve();
        if (rewardEvent.condition && rewardEvent.condition.definePlayerLoginMode && rewardEvent.condition.definePlayerLoginMode == 3) {

            let query = {
                'data.eventId': rewardEvent._id,
                'data.platformId': player.platform._id,
                'data.playerObjId': player._id,
                'data.retentionApplicationDate': {$exists: true}
            };
            lastAppliedRewardProposalProm = dbConfig.collection_proposal.findOne(query).sort({createTime: -1}).lean()
        }

        return lastAppliedRewardProposalProm.then(
            lastProposal => {
                console.log("checking last proposal", lastProposal)
                let retentionApplicationDate = lastProposal && lastProposal.data && lastProposal.data.retentionApplicationDate ? lastProposal.data.retentionApplicationDate : null
                console.log("checking retentionApplicationDate", retentionApplicationDate)
                checkHasReceivedProm = dbPropUtil.checkRestrictionOnDeviceForApplyReward(intervalTime, player, rewardEvent, retentionApplicationDate);

                return Promise.all([pendingCount, eventInPeriodProm, topupInPeriodProm, checkHasReceivedProm, eventInLifeTimeProm])
            }
        ).then(
            checkList => {

                let rewardPendingCount = checkList[0];
                let eventInPeriodCount = checkList[1];
                let topupInPeriodCount = isFrontEndApply ? checkList[2].length + 1 : checkList[2].length; /* if apply from font end together with top up, top up record + 1 to include current top up */
                let listHasApplied = checkList[3];
                let eventInLifeTimeCount = checkList[4];

                // if there is a pending reward, then no other reward can be applied.
                if (rewardPendingCount && rewardPendingCount > 0) {
                    if (rewardTypeWithProposalList.indexOf(rewardEvent.type.name) !== -1) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_PENDING_REWARD_PROPOSAL,
                            name: "DataError",
                            message: "Player or partner already has a pending reward proposal for this type"
                        });
                    }
                }

                let matchPlayerId = false;
                let matchIPAddress = false;
                let matchPhoneNum = false;
                let matchMobileDevice = false;

                if (listHasApplied){
                    matchPlayerId = listHasApplied.samePlayerHasReceived || false;
                    matchIPAddress = rewardEvent.condition && rewardEvent.condition.checkSameIP ? (listHasApplied.sameIPAddressHasReceived || false) : false;
                    matchPhoneNum = rewardEvent.condition && rewardEvent.condition.checkSamePhoneNumber ? (listHasApplied.samePhoneNumHasReceived || false) : false;
                    matchMobileDevice = rewardEvent.condition && rewardEvent.condition.checkSameDeviceId ? (listHasApplied.sameDeviceIdHasReceived || false) : false;
                }

                if (matchPlayerId) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "This player has applied for max reward times in event period"
                    });
                }

                if (matchIPAddress) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "This IP address has applied for max reward times in event period"
                    });
                }

                if (matchPhoneNum) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "This phone number has applied for max reward times in event period"
                    });
                }

                if (matchMobileDevice) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "This mobile device has applied for max reward times in event period"
                    });
                }

                // Check reward apply limit in period
                if (rewardEvent.condition && rewardEvent.condition.quantityLimitInInterval && rewardEvent.condition.quantityLimitInInterval <= eventInPeriodCount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Reward claimed exceed limit, fail to claim reward"
                    });
                }
                // Check reward apply limit in the life time of the whole event
                if (rewardEvent.condition && rewardEvent.condition.applyLimit && rewardEvent.condition.applyLimit <= eventInLifeTimeCount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Reward claimed exceed total limit, fail to claim reward"
                    });
                }

                // check the min deposit amount is sufficient to apply the reward
                if (rewardEvent && rewardEvent.condition && rewardEvent.condition.minDepositAmount && applyAmount < rewardEvent.condition.minDepositAmount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "您需要有新存款(" + rewardEvent.condition.minDepositAmount + ")元才能领取此优惠，千万别错过了！"
                    });
                }

                //check device
                if(userAgentStr) {
                    let topUpDevice = dbUtil.getInputDevice(userAgentStr, false);

                    if (dbRewardUtility.checkInterfaceRewardPermission(rewardEvent, topUpDevice)) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Top up device does not match, fail to claim reward"
                        });
                    }
                }

                // check correct topup type
                let correctTopUpType = true;
                let correctMerchantType = true;
                let correctBankCardType = true;

                if (rewardEvent.condition && rewardEvent.condition.topupType && rewardEvent.condition.topupType.length > 0
                    // && rewardEvent.condition.topupType.indexOf(constPlayerTopUpType.MANUAL.toString()) === -1) {
                    && rewardEvent.condition.topupType.indexOf(topUpMethod.toString()) === -1) {
                    correctTopUpType = false;
                }

                if (rewardEvent.condition && rewardEvent.condition.bankCardType && inputData.bankTypeId
                    && rewardEvent.condition.bankCardType.length > 0 && rewardEvent.condition.bankCardType.indexOf(inputData.bankTypeId) === -1) {
                    correctBankCardType = false;
                }

                if (rewardEvent.condition && rewardEvent.condition.onlineTopUpType && inputData.topupType
                    && rewardEvent.condition.onlineTopUpType.length > 0 && rewardEvent.condition.onlineTopUpType.indexOf(inputData.topupType) === -1) {
                    correctMerchantType = false;
                }

                if (!correctTopUpType) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Top up type does not match, fail to claim reward"
                    });
                }
                if (!correctBankCardType) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Bank card type does not match, fail to claim reward"
                    });
                }
                if (!correctMerchantType) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: "Online top up type does not match, fail to claim reward"
                    });
                }
                // Check top up count within period
                if (rewardEvent.condition.topUpCountType) {
                    let intervalType = rewardEvent.condition.topUpCountType[0];
                    let value1 = rewardEvent.condition.topUpCountType[1];
                    let value2 = rewardEvent.condition.topUpCountType[2];

                    const hasMetTopupCondition =
                        intervalType == "1" && topupInPeriodCount >= value1
                        || intervalType == "2" && topupInPeriodCount <= value1
                        || intervalType == "3" && topupInPeriodCount == value1
                        || intervalType == "4" && topupInPeriodCount >= value1 && topupInPeriodCount < value2;

                    if (!hasMetTopupCondition) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                            name: "DataError",
                            message: "Top up count does not meet period condition, fail to claim reward"
                        });
                    }
                }

                if (isFrontEndApply){
                    return Promise.resolve(rewardEvent);
                }
                else{
                    return Promise.resolve(true);
                }
            }
        )
    },

    checkLimitedOfferIntention: (platformObjId, playerObjId, topUpAmount, limitedOfferObjId) => {
        if (!limitedOfferObjId) return false;

        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
        }).lean().then(
            proposalTypeData => {
                if (proposalTypeData) {
                    let query = {
                        'data.platformObjId': platformObjId,
                        'data.playerObjId': playerObjId,
                        'data.applyAmount': topUpAmount,
                        'data.topUpProposalObjId': {$exists: false},
                        type: proposalTypeData._id
                    };
                    if (limitedOfferObjId) {
                        query['data.limitedOfferObjId'] = limitedOfferObjId;
                    }
                    return dbConfig.collection_proposal.findOne(query).sort({createTime: -1}).lean();
                }

                return false;
            }
        ).then(
            intentionProp => {
                if (intentionProp) {
                    return intentionProp;
                } else {
                    return false;
                }
            }
        );
    },

    checkRewardApplyType: (eventData, userAgent, adminInfo) => {
        if (dbUtil.getInputDevice(userAgent, false, adminInfo) != 0 && eventData.condition && eventData.condition.applyType && eventData.condition.applyType == 3) {
            return Promise.reject({
                name: "DataError",
                message: "The way of applying this reward is not correct."
            })
        }
    },

    checkRewardApplyRegistrationInterface: (eventData, rewardData) => {
        if (dbRewardUtility.checkInterfaceRewardPermission(eventData, rewardData)) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This interface is not allowed for reward"
            });
        }
    },

    checkTopupRecordIsDirtyForReward: (eventData, rewardData) => {
        let isUsed = false;

        if (eventData && eventData.type && eventData.type.name && eventData.type.name !== constProposalType.REFERRAL_REWARD_GROUP && rewardData && rewardData.selectedTopup && rewardData.selectedTopup.usedEvent && rewardData.selectedTopup.usedEvent.length > 0) {
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
    },

    checkRewardApplyTopupRecordIsDirty: (eventData, rewardData) => {
        if (dbRewardUtility.checkTopupRecordIsDirtyForReward(eventData, rewardData)) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This top up record has been used"
            });
        }
    },

    checkRewardApplyEnoughTopupCount: (eventData, topupInPeriodCount) => {
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
                return Promise.reject({
                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                    name: "DataError",
                    message: "Top up count has not met period condition"
                });
            }
        }
    },

    checkRewardApplyTopupWithinInterval: (intervalTime, topupCreateTime) => {
        if (intervalTime && !isDateWithinPeriod(topupCreateTime, intervalTime)) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This top up did not happen within reward interval time"
            });
        }
    },

    checkRewardApplyAnyWithdrawAfterTopup: async (eventData, playerData, rewardData) => {
        if (eventData.condition.allowApplyAfterWithdrawal || !rewardData || !rewardData.selectedTopup) {
            return;
        }

        let withdrawPropQuery = {
            'data.platformId': playerData.platform._id,
            'data.playerObjId': playerData._id,
            createTime: {$gt: rewardData.selectedTopup.createTime},
            status: {$nin: [constProposalStatus.PREPENDING, constProposalStatus.REJECTED, constProposalStatus.FAIL, constProposalStatus.CANCEL]}
        };
        let withdrawAfterTopupProp = await dbPropUtil.getOneProposalDataOfType(playerData.platform._id, constProposalType.PLAYER_BONUS, withdrawPropQuery);

        // Check withdrawal after top up condition
        if (withdrawAfterTopupProp) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "There is withdrawal after topup"
            });
        }
    },

    checkTopupRewardApplySpecialDayLimit: async (eventData, specialCount) => {
        if (eventData.param.dailyMaxTotalApplyCount
            && specialCount
            && specialCount.applied
            && eventData.param.dailyMaxTotalApplyCount <= specialCount.applied
        ) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Please improve your hand speed"
            });
        }
    },

    checkRewardApplyPlayerHasPhoneNumberAndBankCard: (eventData, playerData) => {
        if (eventData.condition && eventData.condition.requiredPhoneNumber && eventData.condition.requiredBankCard && !Boolean(playerData.phoneNumber) && !Boolean(playerData.bankAccount)){
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: localization.localization.translate("Please register phone number and bank card before applying this reward, thank you.")
            });
        }

        if (eventData.condition.requiredPhoneNumber && !Boolean(playerData.phoneNumber)) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This player does not have phone number to apply this reward"
            });
        }

        if (eventData.condition.requiredBankCard && !Boolean(playerData.bankAccount)) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Player must have a registered bank card to apply this reward"
            });
        }
    },

    checkRewardApplyDeviceDetails: (eventData, playerData, intervalTime) => {
        // Ignore this check if condition not checked
        if (eventData && eventData.condition && !eventData.condition.checkSameIP
            && !eventData.condition.checkSamePhoneNumber && !eventData.condition.checkSameDeviceId
        ) {
            return;
        }
        // Ignore retention reward for this check for now
        if (eventData.type && eventData.type.name && eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
            return;
        }

        let orArray = [{'data.playerObjId': playerData._id}];

        let ipArray = [];
        if(eventData.condition.checkSameIP){
            if (playerData.loginIps) {
                ipArray = playerData.loginIps;
            }
            if(playerData.lastLoginIp){
                ipArray.push(playerData.lastLoginIp);
            }
            if(ipArray.length > 0){
                orArray.push({'data.lastLoginIp': {$in: ipArray}});
            }
        }
        if (eventData.condition.checkSamePhoneNumber && playerData.phoneNumber) {
            orArray.push({'data.phoneNumber': playerData.phoneNumber})
        }
        if (eventData.condition.checkSameDeviceId && playerData.deviceId) {
            orArray.push({'data.deviceId': playerData.deviceId})
        }

        console.log('ipArray', ipArray);
        console.log('orArray', orArray);

        let matchQuery = {
            "data.eventId": eventData._id,
            "status": {$in: [constProposalStatus.APPROVED, constProposalStatus.APPROVE, constProposalStatus.SUCCESS]},
            createTime: {$gte: intervalTime.startTime, $lte: intervalTime.endTime},
            $or: orArray
        };

        console.log('matchQuery', matchQuery);

        return dbConfig.collection_proposal.find(
            matchQuery,
            {
                createTime: 1,
                status: 1,
                'data.playerObjId': 1,
                'data.eventId': 1,
                'data.lastLoginIp': 1,
                'data.phoneNumber': 1,
                'data.deviceId': 1,
                _id: 0
            }
        ).lean().then(
            countReward => {
                // check playerId
                console.log('countReward', countReward);
                if (countReward && countReward.length) {
                    for (let i = 0; i < countReward.length; i++) {
                        if (eventData.condition.checkSameIP && ipArray.includes(countReward[i].data.lastLoginIp)) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "This IP address has applied for max reward times in event period"
                            });
                        }

                        if (eventData.condition.checkSamePhoneNumber && playerData.phoneNumber === countReward[i].data.phoneNumber) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "This phone number has applied for max reward times in event period"
                            });
                        }

                        if (eventData.condition.checkSameDeviceId && countReward[i].data.deviceId && playerData.deviceId && playerData.deviceId === countReward[i].data.deviceId) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                name: "DataError",
                                message: "This mobile device has applied for max reward times in event period"
                            });
                        }
                    }
                }
            }
        );
    },

    checkRewardApplyEventInPeriodCount: (eventData, eventInPeriodCount) => {
        // Check reward apply limit in period
        if (eventData.param.countInRewardInterval && eventData.param.countInRewardInterval <= eventInPeriodCount) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Player has applied for max reward times in event period"
            });
        }
    },

    checkApplicationNumberExceedsLimit: async (eventData, intervalTime, player) => {
        if (eventData && eventData.param && eventData.param.hasOwnProperty('countInRewardInterval')){
            let count = await proposalCount(eventData, intervalTime)

            console.log("checking proposalCount for consumption reward application", [count, player && player.name ? player.name : null])
            if (count >= eventData.param.countInRewardInterval){
                return Promise.reject({
                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                    name: "DataError",
                    message: "This player has applied for max reward times in event period"
                })
            }
        }

        function proposalCount(eventData, intervalTime) {
            let matchQuery = {
                "data.eventId": eventData._id,
                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.APPROVE, constProposalStatus.SUCCESS]},
                "data.playerObjId": player._id,
                "data.applyTargetDate" : {$gte: intervalTime.startTime, $lte: intervalTime.endTime}
            };

            // console.log("checking matchQuery in consumption reward application", matchQuery)
            return dbConfig.collection_proposal.find(matchQuery).lean().count();
        }
    },

    checkRewardApplyHasAppliedForbiddenReward: async (eventData, intervalTime, playerData) => {
        let hasNotAppliedForbiddenReward = await dbRewardUtility.checkForbidReward(eventData, intervalTime, playerData);

        if (!hasNotAppliedForbiddenReward) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "This player has applied for other reward in event period"
            });
        }
    },

    checkRewardApplyTopUpIsLatest: (eventData, rewardData, topupInPeriodData) => {
        if (!eventData.condition.allowOnlyLatestTopUp || !topupInPeriodData || !topupInPeriodData.length) {
            return;
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
    },

    checkRewardApplyHasConsumptionAfterTopUp: (eventData, rewardData) => {
        if (
            eventData.condition.allowConsumptionAfterTopUp
            || !rewardData || !rewardData.selectedTopup || !rewardData.lastConsumptionData
            || isRandomRewardConsumption(eventData) || (eventData && eventData.type && eventData.type.name === constProposalType.REFERRAL_REWARD_GROUP)
        ) {
            return;
        }

        if (
            rewardData.lastConsumptionData[0]
            && rewardData.selectedTopup.settlementTime < rewardData.lastConsumptionData[0].createTime
        ) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "There is consumption after top up"
            });
        }

        function isRandomRewardConsumption(rewardEvent) {
            return rewardEvent.type.name === constRewardType.PLAYER_RANDOM_REWARD_GROUP && rewardEvent.param.rewardParam
                && rewardEvent.param.rewardParam[0] && rewardEvent.param.rewardParam[0].value
                && rewardEvent.param.rewardParam[0].value[0] && rewardEvent.param.rewardParam[0].value[0].requiredConsumptionAmount
        }
    },

    checkPlayerBirthday: (eventData, playerData) => {
        // check if player apply festival_reward and is he set the birthday
        if (eventData.type.name === constRewardType.PLAYER_FESTIVAL_REWARD_GROUP) {
            // if that's a birthday event and this player didnt set his birthday in profile
            if (eventData.condition.festivalType === "1" && !playerData.DOB) {
                return Promise.reject({status: constServerCode.NO_BIRTHDAY, name: "DataError", message: localization.localization.translate("You need to set your birthday before apply this event")});
            }
        }
        return true;
    },

    checkFestivalOverApplyTimes: (eventData, playerData, rewardData, selectedRewardParam) => {
        let proms = [];
        let platformId = playerData.platform._id;
        let playerObjId = playerData._id;
        let playerBirthday = playerData.DOB;

        let result = {count: 0, festivals: []};

        if (eventData.condition && eventData.condition.festivalType) {
            if (rewardData.festivalItemId) {
                let festivalItem = selectedRewardParam;
                let festivalDate = getFestivalItem(selectedRewardParam, playerBirthday, eventData);
                let isRightApplyTime = checkIfRightApplyTime(festivalItem, festivalDate);

                if (isRightApplyTime) {
                    // if date match , check if the proposal match topup / consumption
                    let prom = checkFestivalProposal(festivalItem, platformId, playerObjId, eventData._id, festivalItem.id);
                    proms.push(prom);
                } else {
                    let errorMsg = localization.localization.translate('Not In the Period of This Reward.');

                    if (selectedRewardParam.rewardType && selectedRewardParam.rewardType == 4 || selectedRewardParam.rewardType == 5 || selectedRewardParam.rewardType == 6) {
                        errorMsg = localization.localization.translate('Your Birthday is Not In the Period of This Reward.');
                    }

                    return Promise.reject({
                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                        name: "DataError",
                        message: errorMsg
                    });
                }
            }
        }

        return Promise.all(proms).then(
            data => {
                if (data && data.length > 0) {
                    data.forEach(item => {
                        if (item && item.status) {
                            result.count += 1;
                            result.festivals.push(item.festivalObjId)
                        }
                    })
                }

                return result;
            }
        )

        function getFestivalItem(selectedRewardParam, playerBirthday, eventData) {
            let result;
            if (selectedRewardParam.rewardType == 4 || selectedRewardParam.rewardType == 5 || selectedRewardParam.rewardType == 6) {
                result = getBirthday(playerBirthday);
            } else {
                // if is festival
                result = getFestivalRewardDate(selectedRewardParam, eventData.param.others);
            }
            return result;
        }

        function getBirthday(playerBirthday) {
            let result = {month: null, day: null};
            let month = new Date(playerBirthday).getMonth() + 1;
            let day = new Date(playerBirthday).getDate();

            result.month = month;
            result.day = day;

            return result;
        }

        function getFestivalRewardDate(reward, festivals) {
            //find the festival date inside the reward param
            let rewardId = reward.festivalId ? reward.festivalId : null;
            let festival;

            if (festivals && festivals.length > 0) {
                festival = festivals.filter(item => String(item.id) === String(rewardId))
            }

            return (festival && festival[0]) ? festival[0] : [];
        }

        function checkIfRightApplyTime(specificDate, festival) {
            // reconstruct the month/time to a timestamp to verify if fulfil the apply time
            let result = false;
            let currentTime = moment(new Date()).toDate();
            // time conversion , add expiredInDay / convert month ,day to a proper date
            let period = getTimePeriod(specificDate.expiredInDay || 0, festival);

            if ( currentTime > moment(period.startTime).toDate() && currentTime < moment(period.endTime).toDate() ) {
                result = true;
            }

            return result;
        }

        function checkFestivalProposal (rewardParam, platformId, playerObjId, eventId, festivalId) {
            let todayTime = dbUtil.getDayTime(new Date());
            let expiredInDay = rewardParam.expiredInDay ? rewardParam.expiredInDay : 0;
            // time conversion , add expiredInDay / convert month ,day to a proper date
            let applyPeriod = getTimePeriod(expiredInDay, todayTime);
            let sendQuery = {
                "data.platformObjId": platformId,
                "data.playerObjId": playerObjId,
                "data.eventId": eventId,
                "createTime": {
                    '$gte': applyPeriod.startTime,
                    '$lte': moment(applyPeriod.endTime).toDate()
                },
                "data.festivalObjId": festivalId,
                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };

            return dbConfig.collection_proposal.find(sendQuery).lean().then(
                data => {
                    let retObj = {status: false, festivalObjId: festivalId};

                    if (data) {
                        // type 3 dont have attribute of applytimes, so make this default:1
                        if (rewardParam.applyTimes && data.length < rewardParam.applyTimes) {
                            retObj.status = true;
                        }
                    }

                    return retObj;
                }
            )
        }

        function getTimePeriod(expiredInDay, festival) {
            let todayTime, year, month, day;
            let fullDate = [];

            if (festival && festival.month && festival.day) {
                year = new Date().getFullYear();

                month = getPlural(festival.month);
                day = getPlural(festival.day);
                fullDate = [year, month, day];
                fullDate = fullDate.join('-');

                //date convertion
                todayTime = {
                    "startTime": moment(fullDate).format('YYYY-MM-DD HH:mm:ss.sss'),
                    "endTime": moment(fullDate).add(1, 'days')
                }
            } else {
                todayTime = dbUtil.getDayTime(new Date());
            }

            let expiredDay = expiredInDay ? Number(expiredInDay) : 0;

            return {
                "startTime": todayTime.startTime,
                "endTime": moment(todayTime.endTime).add(expiredDay, 'days').format('YYYY-MM-DD HH:mm:ss.sss')
            };

            function getPlural (num) {
                return (num < 9) ? "0" + num : num;
            }
        }
    },

    // endregion

    // region Reward permission
    isRewardEventForbidden: (playerData, eventId) => {
        eventId = eventId ? eventId.toString() : "";
        let forbiddenEvents = playerData.forbidRewardEvents || [];
        for (let i = 0, len = forbiddenEvents.length; i < len; i++) {
            let forbiddenEventId = forbiddenEvents[i].toString();
            if (forbiddenEventId === eventId) return true;
        }
        return false;
    },

    checkInterfaceRewardPermission: (eventData, rewardData) => {
        let isForbidInterface = false;

        // Check registration interface condition
        if (eventData.condition.userAgent && eventData.condition.userAgent.length > 0 && rewardData && rewardData.selectedTopup) {
            let registrationInterface = rewardData.selectedTopup.userAgent ? rewardData.selectedTopup.userAgent : 0;

            isForbidInterface = eventData.condition.userAgent.indexOf(registrationInterface.toString()) < 0;
        }

        return isForbidInterface;
    },
    // endregion

    checkForbidReward: (eventData, intervalTime, playerData) => {
        let createTime = {$gte: eventData.condition.validStartTime, $lte: eventData.condition.validEndTime};

        // check during this period interval
        if (intervalTime) {
            createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
        }

        // check if player has applied for other forbidden reward
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
                "createTime": createTime,
                "data.eventId": {$in: forbidRewardEventIds},
                "status": constProposalStatus.APPROVED,
                "data.playerObjId": playerData._id
            };

            if (promoCodeRewardExist) {
                queryMatch = {
                    "createTime": createTime,
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
            return dbConfig.collection_proposal.aggregate(
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
        } else {
            return true;
        }
    },

    //#region Referral Reward Group
    checkPlayerConsumptionRecordForReferralReward: (playerData, intervalTime, referralEventStartTime, referralEventEndTime, proposalTypeData, eventData, player) => {
        return dbConfig.collection_proposal.findOne({
            'data.playerObjId': playerData._id,
            'data.platformObjId': playerData.platform._id,
            createTime: {
                $gte: referralEventStartTime,
                $lte: referralEventEndTime
            },
            type: proposalTypeData._id,
            status: constProposalStatus.APPROVED,
            'data.eventId': eventData._id,
            'data.referralRewardMode': eventData.condition.referralRewardMode,
            'data.referralRewardDetails.playerObjId': player.playerObjId
        }).sort({createTime: -1}).lean().then(
            latestApplyData => {
                let consumptionStartTime = intervalTime ? intervalTime.startTime : eventData.condition.validStartTime;
                let consumptionEndTime = intervalTime ? intervalTime.endTime : eventData.condition.validEndTime;

                let consumptionQuery = {
                    platformId: player.platform,
                    playerId: player.playerObjId,
                    createTime: {
                        $gte: consumptionStartTime,
                        $lte: consumptionEndTime
                    }
                };

                if (player.createTime && consumptionStartTime && (player.createTime.getTime() >= consumptionStartTime.getTime())) {
                    consumptionQuery.createTime.$gte = new Date(player.createTime);
                }

                if (player.validEndTime && consumptionEndTime && (player.validEndTime.getTime() <= consumptionEndTime.getTime())) {
                    consumptionQuery.createTime.$lte = new Date(player.validEndTime);
                }

                if (latestApplyData && latestApplyData.createTime) {
                    consumptionQuery.createTime.$gt = latestApplyData.createTime;
                    console.log('latestApplyData.createTime ===>', latestApplyData.createTime);
                }

                console.log('consumptionStartTime ===>', consumptionStartTime);
                console.log('consumptionEndTime ===>', consumptionEndTime);
                console.log('player ===>', player);
                console.log('consumptionQuery ===>', consumptionQuery);
                console.log('referralRewardMode', eventData.condition.referralRewardMode);

                return dbConfig.collection_playerConsumptionRecord.aggregate([{
                    $match: consumptionQuery
                }, {
                    $group: {
                        _id: "$playerId",
                        validAmount: {$sum: "$validAmount"},
                        createTime: {$last: "$createTime"}
                    }
                }]);
            }
        )
    },

    checkPlayerTotalDepositForReferralReward: (playerData, intervalTime, proposalTypeData, eventData, player) => {
        let referralRewardStartTime = intervalTime ? intervalTime.startTime : eventData.condition.validStartTime;
        let referralRewardEndTime = intervalTime ? intervalTime.endTime : eventData.condition.validEndTime;

        return dbConfig.collection_proposal.findOne({
            'data.playerObjId': playerData._id,
            'data.platformObjId': playerData.platform._id,
            type: proposalTypeData._id,
            status: constProposalStatus.APPROVED,
            'data.eventId': eventData._id,
            'data.referralRewardMode': eventData.condition.referralRewardMode,
            'data.isDynamicRewardTopUpAmount': {$exists: true, $ne: true},
            'data.referralRewardDetails.playerObjId': player.playerObjId
        }).sort({createTime: -1}).lean().then(proposalData => {
            if (!proposalData) {
                let depositQuery = {
                    "data.platformId": player.platform,
                    "data.playerObjId": player.playerObjId,
                    createTime: {
                        $gte: referralRewardStartTime,
                        $lte: referralRewardEndTime
                    },
                    mainType: "TopUp",
                    status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                };

                if (player.createTime && referralRewardStartTime && (player.createTime.getTime() >= referralRewardStartTime.getTime())) {
                    depositQuery.createTime.$gte = new Date(player.createTime);
                }

                if (player.validEndTime && referralRewardEndTime && (player.validEndTime.getTime() <= referralRewardEndTime.getTime())) {
                    depositQuery.createTime.$lte = new Date(player.validEndTime);
                }

                console.log('referralRewardStartTime ===>', referralRewardStartTime);
                console.log('referralRewardEndTime ===>', referralRewardEndTime);
                console.log('player ===>', player);
                console.log('depositQuery ===>', depositQuery);

                return dbConfig.collection_proposal.aggregate([
                    {
                        $match: depositQuery
                    },
                    {
                        $group: {
                            _id: "$data.playerObjId",
                            count: {"$sum": 1},
                            amount: {"$sum": "$data.amount"},
                            createTime: {$last: "$createTime"}
                        }
                    }
                ]).then(
                    data => {
                        if (data && (data.length == 0)) {
                            return [{_id: player.playerObjId, count: 0, amount: 0, createTime: null}];
                        }

                        return data;
                    }
                );
            } else {
                return Promise.resolve();
            }
        });
    },

    checkPlayerFirstDepositForReferralReward: (playerData, intervalTime, proposalTypeData, eventData, player) => {
        let referralRewardStartTime = intervalTime ? intervalTime.startTime : eventData.condition.validStartTime;
        let referralRewardEndTime = intervalTime ? intervalTime.endTime : eventData.condition.validEndTime;

        return dbConfig.collection_proposal.findOne({
            'data.playerObjId': playerData._id,
            'data.platformObjId': playerData.platform._id,
            type: proposalTypeData._id,
            status: constProposalStatus.APPROVED,
            'data.eventId': eventData._id,
            'data.referralRewardMode': eventData.condition.referralRewardMode,
            'data.isDynamicRewardTopUpAmount': {$exists: true, $eq: true},
            'data.referralRewardDetails.playerObjId': player.playerObjId
        }).sort({createTime: -1}).lean().then(proposalData => {
            if (!proposalData) {
                let depositQuery = {
                    "data.platformId": player.platform,
                    "data.playerObjId": player.playerObjId,
                    createTime: {
                        $gte: referralRewardStartTime,
                        $lte: referralRewardEndTime
                    },
                    mainType: "TopUp",
                    status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                };

                if (player.createTime && referralRewardStartTime && (player.createTime.getTime() >= referralRewardStartTime.getTime())) {
                    depositQuery.createTime.$gte = new Date(player.createTime);
                }

                if (player.validEndTime && referralRewardEndTime && (player.validEndTime.getTime() <= referralRewardEndTime.getTime())) {
                    depositQuery.createTime.$lte = new Date(player.validEndTime);
                }

                console.log('referralRewardStartTime ===>', referralRewardStartTime);
                console.log('referralRewardEndTime ===>', referralRewardEndTime);
                console.log('player ===>', player);
                console.log('depositQuery ===>', depositQuery);
                console.log('referralRewardMode', eventData.condition.referralRewardMode);

                let playerAmountProm = dbConfig.collection_proposal.findOne(depositQuery).sort({createTime: 1}).lean();
                let playerTopUpCount = dbConfig.collection_proposal.find(depositQuery).count();

                return Promise.all([playerAmountProm, playerTopUpCount]).then(
                    topUpData => {
                        let playerTopUpData = [];
                        if (topUpData && topUpData[0]) {
                            let detail = {};
                            detail._id = topUpData[0].data && topUpData[0].data.playerObjId;
                            detail.amount = topUpData[0].data && topUpData[0].data.amount;
                            detail.createTime = topUpData[0].createTime;
                            detail.count = topUpData[1] || 0

                            playerTopUpData.push(detail);
                        }

                        return playerTopUpData;
                    }
                )
            } else {
                return Promise.resolve();
            }
        });
    }
    //#endregion
};

module.exports = dbRewardUtility;

function isDateWithinPeriod(date, period) {
    if (period && period.startTime && period.endTime) {
        return date > period.startTime && date < period.endTime;
    }
    return false;
}
