const dbUtil = require('./../modules/dbutility');
const dbConfig = require('./../modules/dbproperties');

const dbPropUtil = require('./../db_common/dbProposalUtility');

const constProposalStatus = require('./../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');
const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const constRewardType = require('./../const/constRewardType');
const constServerCode = require('./../const/constServerCode');

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
                default:
                    if (eventData.validStartTime && eventData.validEndTime) {
                        intervalTime = {startTime: eventData.validStartTime, endTime: eventData.validEndTime};
                    }
                    break;
            }
        }

        return intervalTime;
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

    checkApplyTopUpReturn: (player, topUpReturnCode, userAgentStr, inputData, topUpMethod) => {
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
            rewardEventData => {
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

                            // check correct topup type
                            let correctTopUpType = true;
                            let correctMerchantType = true;
                            let correctBankCardType = true;

                            if (
                                rewardEvent.condition
                                && rewardEvent.condition.topupType
                                && rewardEvent.condition.topupType.length > 0
                                && rewardEvent.condition.topupType.indexOf(topUpMethod.toString()) === -1
                            ) {
                                correctTopUpType = false;
                            }

                            if (
                                rewardEvent.condition
                                && rewardEvent.condition.bankCardType
                                && inputData.bankTypeId
                                && rewardEvent.condition.bankCardType.length > 0
                                && rewardEvent.condition.bankCardType.indexOf(inputData.bankTypeId) === -1
                            ) {
                                correctBankCardType = false;
                            }

                            if (
                                rewardEvent.condition
                                && rewardEvent.condition.onlineTopUpType
                                && inputData.topupType
                                && rewardEvent.condition.onlineTopUpType.length > 0
                                && rewardEvent.condition.onlineTopUpType.indexOf(inputData.topupType) === -1
                            ) {
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

                            if (applyAmount < selectedRewardParam.minTopUpAmount || !correctTopUpType) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Insufficient top up amount, fail to claim reward"
                                });
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

        let topupInPeriodProm = Promise.resolve([]);
        if (rewardEvent.condition && rewardEvent.condition.topUpCountType) {
            topupInPeriodProm = dbConfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
        }

        // check reward apply restriction on ip, phone and IMEI
        let checkHasReceivedProm = dbPropUtil.checkRestrictionOnDeviceForApplyReward(intervalTime, player, rewardEvent);

        return Promise.all([pendingCount, eventInPeriodProm, topupInPeriodProm, checkHasReceivedProm]).then(
            checkList => {

                let rewardPendingCount = checkList[0]
                let eventInPeriodCount = checkList[1];
                let topupInPeriodCount = isFrontEndApply ? checkList[2].length + 1 : checkList[2].length; /* if apply from font end together with top up, top up record + 1 to include current top up */
                let listHasApplied = checkList[3];

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
    }
    // endregion
};

module.exports = dbRewardUtility;