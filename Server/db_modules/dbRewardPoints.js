let Q = require("q");
let dbConfig = require('./../modules/dbproperties');
let dbRewardPointsLvlConfig = require('./../db_modules/dbRewardPointsLvlConfig');
let dbRewardPointsEvent = require('./../db_modules/dbRewardPointsEvent');
let dbUtility = require('./../modules/dbutility');
let errorUtils = require('./../modules/errorUtils');
const constRewardPointsTaskCategory = require('../const/constRewardPointsTaskCategory');
const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');
const constPlayerTopUpType = require('../const/constPlayerTopUpType');

let dbRewardPoints = {

    getPlayerRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        return dbConfig.collection_rewardPoints.findOne({playerObjId}).lean().then(
            rewardPointsData => {
                if (!rewardPointsData) {
                    return dbRewardPoints.createRewardPoints(playerObjId, playerData);
                }
                else if (playerData && playerData.playerLevel && rewardPointsData.playerLevel && rewardPointsData.playerLevel.toString() !== playerData.playerLevel.toString()) {
                    return dbRewardPoints.updateRewardPointsPlayerLevel(rewardPointsData._id, playerObjId);
                }

                return rewardPointsData;
            }
        )
    },

    updateRewardPointsPlayerLevel: (rewardPointsObjId, playerLevelObjId) => {
        return dbConfig.collection_rewardPoints.findOneAndUpdate({_id: rewardPointsObjId}, {playerLevel: playerLevelObjId}, {new: true}).lean();
    },

    createRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        let playerDataProm = Promise.resolve(playerData);

        if (!playerData) {
            playerDataProm = dbConfig.collection_players.findOne({_id: playerObjId}, {
                platform: 1,
                name: 1,
                playerLevel: 1
            }).lean();
        }

        return playerDataProm.then(
            player => {
                if (!player) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Invalid player."
                    });
                }

                let newRewardPointsData = {
                    platformObjId: player.platform,
                    playerObjId: playerObjId,
                    playerName: player.name,
                    playerLevel: player.playerLevel
                };

                let newRewardPoints = new dbConfig.collection_rewardPoints(newRewardPointsData);
                return newRewardPoints.save();
            }
        );
    },

    updateLoginRewardPointProgress: (playerData, provider, inputDevice) => {
        let relevantEvents = [];
        let rewardPointsConfig;

        let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategory(playerData.platform, constRewardPointsTaskCategory.LOGIN_REWARD_POINTS);
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerData._id, playerData);
        let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(playerData.platform);

        return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm]).then(
            data => {
                let events = data[0];
                let playerRewardPoints = data[1];
                rewardPointsConfig = data[2];

                relevantEvents = events.filter(event => isRelevantLoginEventByProvider(event, provider, inputDevice));

                if (!relevantEvents || relevantEvents.length < 1) {
                    // return Promise.reject({
                    //     name: "DataError",
                    //     message: "No relevant valid event."
                    // });
                    relevantEvents = [];
                }

                let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];

                let rewardProgressListChanged = false;
                for (let i = 0; i < relevantEvents.length; i++) {
                    let event = relevantEvents[i];
                    let eventProgress = getEventProgress(rewardProgressList, event);
                    let progressChanged = updateLoginProgressCount(eventProgress, event, provider);
                    rewardProgressListChanged = rewardProgressListChanged || progressChanged;
                }

                if (rewardProgressListChanged) {
                    return dbConfig.collection_rewardPoints.findOneAndUpdate({
                        platformObjId: playerRewardPoints.platformObjId,
                        playerObjId: playerRewardPoints.playerObjId
                    }, {
                        progress: rewardProgressList
                    }, {new: true}).lean();
                }
                else {
                    return Promise.resolve(playerRewardPoints);
                }
            }
        ).then(
            playerRewardPoints => {
                if (rewardPointsConfig && Number(rewardPointsConfig.applyMethod) === 2) {
                    let promResolve = Promise.resolve();
                    // send to apply
                    let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];
                    for (let i = 0; i < rewardProgressList.length; i++) {
                        if (rewardProgressList[i].isApplicable && !rewardProgressList[i].isApplied) {
                            let eventData;
                            let rewardPointToApply = rewardProgressList[i].rewardPointsEventObjId || "";
                            for (let j = 0; j < relevantEvents.length; j++) {
                                if (relevantEvents[j]._id.toString() === rewardPointToApply.toString()) {
                                    eventData = relevantEvents[j];
                                }
                            }
                            let applyRewardProm = function () {
                                return dbRewardPoints.applyRewardPoint(playerData._id, rewardPointToApply, inputDevice)
                                    .catch(errorUtils.reportError);

                            };
                            promResolve = promResolve.then(applyRewardProm);
                        }
                    }
                }
                return playerRewardPoints;
            }
        )
    },

    updateTopupRewardPointProgress: (topupProposalData, topupMainType) => {
        return dbConfig.collection_platform.findOne({_id: topupProposalData.data.platformId}).lean().then(
            (platformObj) => {
                if (platformObj.usePointSystem) {
                    let relevantEvents = [];
                    let rewardPointsConfig;

                    let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategory(topupProposalData.data.platformId, constRewardPointsTaskCategory.TOPUP_REWARD_POINTS);
                    let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(topupProposalData.data.playerObjId);
                    let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(topupProposalData.data.platformId);

                    return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm]).then(
                        data => {
                            let events = data[0];
                            let playerRewardPoints = data[1];
                            rewardPointsConfig = data[2];
                            relevantEvents = events.filter(event => isRelevantTopupEvent(event, topupMainType, topupProposalData));
                            if (!relevantEvents || relevantEvents.length < 1) {
                                relevantEvents = [];
                            }

                            let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];

                            let rewardProgressListChanged = false;
                            let prom = [];
                            for (let i = 0; i < relevantEvents.length; i++) {
                                let event = relevantEvents[i];
                                let relevantTopupMatchQuery = buildTodayTopupAmountQuery(event, topupProposalData);

                                prom.push(dbConfig.collection_playerTopUpRecord.aggregate(
                                    {
                                        $match: relevantTopupMatchQuery
                                    },
                                    {
                                        $group: {
                                            _id: {playerId: "$playerId"},
                                            amount: {$sum: "$amount"}
                                        }
                                    }
                                ).then(
                                    summary => {
                                        let periodTopupAmount = summary && summary[0] && summary[0].amount ? summary[0].amount : 0;
                                        let eventProgress = getEventProgress(rewardProgressList, event);
                                        let progressChanged = updateTopupProgressCount(eventProgress, event, periodTopupAmount);
                                        rewardProgressListChanged = rewardProgressListChanged || progressChanged;
                                    }
                                ));
                            }
                            return Q.all(prom).then(
                                () => {
                                    if (rewardProgressListChanged) {
                                        return dbConfig.collection_rewardPoints.findOneAndUpdate({
                                            platformObjId: playerRewardPoints.platformObjId,
                                            playerObjId: playerRewardPoints.playerObjId
                                        }, {
                                            progress: rewardProgressList
                                        }, {new: true}).lean();
                                    }
                                    else {
                                        return Promise.resolve(playerRewardPoints);
                                    }
                                }
                            );
                        }
                    ).then(
                        playerRewardPoints => {
                            if (rewardPointsConfig && Number(rewardPointsConfig.applyMethod) === 2) {
                                let promResolve = Promise.resolve();
                                // send to apply
                                let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];
                                for (let i = 0; i < rewardProgressList.length; i++) {
                                    if (rewardProgressList[i].isApplicable && !rewardProgressList[i].isApplied) {
                                        let eventData;
                                        let rewardPointToApply = rewardProgressList[i].rewardPointsEventObjId || "";
                                        for (let j = 0; j < relevantEvents.length; j++) {
                                            if (relevantEvents[j]._id.toString() === rewardPointToApply.toString()) {
                                                eventData = relevantEvents[j];
                                            }
                                        }
                                        let applyRewardProm = function () {
                                            return dbRewardPoints.applyRewardPoint(topupProposalData.data.playerObjId, rewardPointToApply, topupProposalData.inputDevice)
                                                .catch(errorUtils.reportError);

                                        };
                                        promResolve = promResolve.then(applyRewardProm);
                                    }
                                }
                            }
                            return playerRewardPoints;
                        }
                    )
                } else {
                    return Promise.resolve();
                }
            }
        );
    },

    updateGameRewardPointProgress: (consumptionRecord) => {
        if (!consumptionRecord || !consumptionRecord.platformId || !consumptionRecord.providerId) {
            return Promise.resolve();
        }
        let platform;
        let relevantEvents = [];
        let rewardPointsConfig;

        return dbConfig.collection_platform.findOne({_id: consumptionRecord.platformId}).lean().then(
            platformData => {
                platform = platformData;

                if (!platform.usePointSystem) {
                    return Promise.resolve();
                }

                let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategory(platform._id, constRewardPointsTaskCategory.GAME_REWARD_POINTS);
                let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(consumptionRecord.playerId);
                let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(platform._id);

                return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm]);
            }
        ).then(
            data => {
                if (!data) {
                    return Promise.resolve();
                }

                let events = data[0];
                let playerRewardPoints = data[1];
                rewardPointsConfig = data[2];

                relevantEvents = events.filter(event => isRelevantGameEvent(event, consumptionRecord));

                let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];

                let rewardProgressListChanged = false;
                for (let i = 0; i < relevantEvents.length; i++) {
                    let event = relevantEvents[i];
                    let eventProgress = getEventProgress(rewardProgressList, event);
                    let progressChanged = updateGameProgressCount(eventProgress, event, consumptionRecord);
                    rewardProgressListChanged = rewardProgressListChanged || progressChanged;
                }

                if (rewardProgressListChanged) {
                    return dbConfig.collection_rewardPoints.findOneAndUpdate({
                        platformObjId: playerRewardPoints.platformObjId,
                        playerObjId: playerRewardPoints.playerObjId
                    }, {
                        progress: rewardProgressList
                    }, {new: true}).lean();
                }
                else {
                    return Promise.resolve(playerRewardPoints);
                }
            }
        ).then(
            playerRewardPoints => {
                if (rewardPointsConfig && Number(rewardPointsConfig.applyMethod) === 2) {
                    let promResolve = Promise.resolve();
                    // send to apply
                    let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];
                    for (let i = 0; i < rewardProgressList.length; i++) {
                        if (rewardProgressList[i].isApplicable && !rewardProgressList[i].isApplied) {
                            let eventData;
                            let rewardPointToApply = rewardProgressList[i].rewardPointsEventObjId || "";
                            for (let j = 0; j < relevantEvents.length; j++) {
                                if (relevantEvents[j]._id.toString() === rewardPointToApply.toString()) {
                                    eventData = relevantEvents[j];
                                }
                            }
                            let applyRewardProm = function () {
                                return dbRewardPoints.applyRewardPoint(consumptionRecord.playerId, rewardPointToApply, 0) // user agent will update when data receive from provider updated
                                    .catch(errorUtils.reportError);

                            };
                            promResolve = promResolve.then(applyRewardProm);
                        }
                    }
                }
                return playerRewardPoints;
            }
        )
    },

    applyRewardPoint: (playerObjId, rewardPointsEventObjId, inputDevice, rewardPointsConfig) => {
        // eventData and playerRewardPoints are optional parameter
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerObjId);
        let getRewardPointEventProm = dbConfig.collection_rewardPointsEvent.findOne({_id: rewardPointsEventObjId}).lean();

        let pointEvent, rewardPoints, progress;

        return Promise.all([getRewardPointsProm, getRewardPointEventProm]).then(
            data => {
                if (!data) {
                    data = [{}, {}];
                }

                rewardPoints = data[0];
                pointEvent = data[1];
                let progressList = [];

                if (!pointEvent) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event not found."
                    });
                }

                if (pointEvent.customPeriodEndTime && new Date(pointEvent.customPeriodEndTime) < new Date()) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event already expired."
                    });
                }

                if (pointEvent.customPeriodStartTime && new Date(pointEvent.customPeriodStartTime) > new Date()) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event is not started."
                    });
                }

                if (rewardPoints && rewardPoints.progress) {
                    progressList = rewardPoints.progress;
                } else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Invalid reward point."
                    });
                }

                progress = getEventProgress(progressList, pointEvent);

                if (!progress.isApplicable) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Not applicable for reward point."
                    });
                }

                if (progress.isApplied) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Player already applied for the reward point."
                    });
                }

                let eventPeriodStartTime = getEventPeriodStartTime(pointEvent);

                if (progress.lastUpdateTime < eventPeriodStartTime) {
                    // the progress is inherited from last period
                    return Promise.reject({
                        name: "DataError",
                        message: "Not applicable for reward point."
                    });
                }

                let getLastRewardPointLogProm = getTodayLastRewardPointEventLog(rewardPoints._id);

                let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(rewardPoints.platformObjId);

                let playerLevelProm = dbConfig.collection_playerLevel.findOne({_id: rewardPoints.playerLevel}, {name: 1}).lean();

                if (rewardPointsConfig) {
                    getRewardPointsLvlConfigProm = Promise.resolve(rewardPointsConfig);
                }

                return Promise.all([getLastRewardPointLogProm, getRewardPointsLvlConfigProm, playerLevelProm]);
            }
        ).then(
            data => {
                if (!data) {
                    data = [[], {}, {}];
                }

                let lastRewardPointLogArr = data[0];
                let rewardPointConfig = data[1];
                let playerLevel = data[2];
                let playerLevelName;

                if (playerLevel && playerLevel.name) {
                    playerLevelName = playerLevel.name
                }
                else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Player already applied max amount of points for today."
                    });
                }

                let todayApplied = 0;
                if (lastRewardPointLogArr && lastRewardPointLogArr[0]) {
                    let log = lastRewardPointLogArr[0];
                    todayApplied = log.currentDayAppliedAmount + log.amount;
                }

                // need playerlevel
                let configLevelParam = {dailyMaxPoints: 10};
                if (rewardPointConfig && rewardPointConfig.params) {
                    let params = rewardPointConfig.params;
                    for (let i = 0; i < params.length; i++) {
                        let param = params[i];
                        if (param && param.levelObjId && rewardPoints.playerLevel) {
                            if (param.levelObjId.toString() === rewardPoints.playerLevel.toString()) {
                                configLevelParam = param;
                                break;
                            }
                        }
                    }
                }

                let dailyMaxPoints = configLevelParam.dailyMaxPoints;

                if (Number(dailyMaxPoints) <= Number(todayApplied)) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Player already applied max amount of points for today."
                    });
                }

                let pointIncreased = pointEvent.rewardPoints;
                let remarks = "";

                if (dailyMaxPoints - todayApplied < pointEvent.rewardPoints) {
                    pointIncreased = dailyMaxPoints - todayApplied;
                    remarks = "达到单日积分上线";
                }

                let preUpdatePoint = rewardPoints.points;
                let postUpdatePoint = rewardPoints.points + pointIncreased;

                let logDetail = {
                    rewardPointsObjId: rewardPoints._id,
                    creator: rewardPoints.playerName,
                    category: pointEvent.category,
                    rewardTitle: pointEvent.rewardTitle,
                    rewardContent: pointEvent.rewardContent,
                    rewardPeriod: pointEvent.rewardPeriod,
                    userAgent: inputDevice,
                    status: constRewardPointsLogStatus.PROCESSED,
                    playerName: rewardPoints.playerName,
                    oldPoints: preUpdatePoint,
                    newPoints: postUpdatePoint,
                    amount: pointIncreased,
                    currentDayAppliedAmount: todayApplied, // should not include current reward
                    maxDayApplyAmount: dailyMaxPoints,
                    playerLevelName: playerLevelName,
                    remark: remarks,
                    rewardTarget: pointEvent.target
                };

                let logDetailProm = Promise.resolve(logDetail);

                // update player point value
                let updatePointsProm = dbConfig.collection_rewardPoints.findOneAndUpdate({_id: rewardPoints._id}, {$inc: {points: pointIncreased}}, {new: true}).lean();


                // set event as applied
                let setEventAsAppliedProm = dbConfig.collection_rewardPoints.findOneAndUpdate({
                        _id: rewardPoints._id,
                        progress: {$elemMatch: {rewardPointsEventObjId: pointEvent._id}}
                    },
                    {
                        "progress.$.isApplied": true
                    }).lean();

                return Promise.all([updatePointsProm, setEventAsAppliedProm, logDetailProm]);
            }
        ).then(
            data => {
                if (!data) {
                    data = [];
                }

                let updatePoints = data[0];
                let updatePointProgress = data[1];
                let logDetail = data[2];

                if (!updatePoints || !updatePointProgress) {
                    return Promise.reject({
                        name: "DBError",
                        message: "Player point or progress update failed."
                    });
                }

                dbRewardPoints.createRewardPointsLog(logDetail).catch(errorUtils.reportError);

                return logDetail;
            }
        );
    },

    getLoginRewardPoints: function (playerId, platformId) {
        let returnData;
        let playerObjId;
        if (playerId) {
            return dbConfig.collection_players.findOne({playerId: playerId}).lean().then(
                playerData => {
                    if (playerData) {
                        playerObjId = playerData._id;
                        return dbConfig.collection_rewardPointsEvent.find({
                            platformObjId: playerData.platform,
                            category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS
                        }).lean().sort({index: 1});
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find player"});
                    }
                }
            ).then(
                rewardPointsEvent => {
                    if (rewardPointsEvent && rewardPointsEvent.length > 0) {
                        let noProgress = {
                            isApplicable: false,
                            isApplied: false,
                            count: 0
                        };
                        returnData = rewardPointsEvent;
                        for (let i = 0; i < returnData.length; i++) {
                            returnData[i].progress = noProgress;
                            if (returnData[i].period) {
                                let periodTime = getEventPeriodTime(returnData[i]);
                                returnData[i].startTime = periodTime.startTime;
                                returnData[i].endTime = periodTime.endTime;
                            }
                        }
                        return dbConfig.collection_rewardPoints.findOne({playerObjId: playerObjId}).lean();
                    }
                }
            ).then(
                rewardPointsData => {
                    if (rewardPointsData) {
                        if (rewardPointsData.progress && rewardPointsData.progress.length > 0) {
                            rewardPointsData.progress.filter(item => {
                                for (let i = 0; i < returnData.length; i++) {
                                    if (returnData[i]._id && item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() === returnData[i]._id.toString()
                                        && item.lastUpdateTime >= returnData[i].startTime && item.lastUpdateTime <= returnData[i].endTime) {
                                        delete item.lastUpdateTime;
                                        delete item.rewardPointsEventObjId;
                                        returnData[i].progress = item;
                                        return item;
                                    }
                                }
                            });
                        }
                        for (let i = 0; i < returnData.length; i++) {
                            delete returnData[i]._id;
                            delete returnData[i].__v;
                            delete returnData[i].platformObjId;
                            delete returnData[i].category;
                            delete returnData[i].customPeriodStartTime;
                            delete returnData[i].customPeriodEndTime;
                        }

                        return {data: returnData};
                    }
                }
            );
        }
        if (platformId && !playerId) {
            return dbConfig.collection_platform.findOne({platformId: platformId}).then(
                platformData => {
                    if (!platformData || !platformData._id) {
                        return Promise.reject({name: "DataError", message: "Cannot find platform"});
                    }
                    return dbConfig.collection_rewardPointsEvent.find({
                        platformObjId: platformData._id,
                        category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS
                    }).lean().sort({index: 1});
                }
            ).then(
                rewardPointsEvent => {
                    if (rewardPointsEvent && rewardPointsEvent.length > 0) {
                        let noProgress = {
                            isApplicable: false,
                            isApplied: false,
                            count: 0
                        };
                        returnData = rewardPointsEvent;
                        for (let i = 0; i < returnData.length; i++) {
                            returnData[i].progress = noProgress;
                            if (returnData[i].period) {
                                let periodTime = getEventPeriodTime(returnData[i]);
                                returnData[i].startTime = periodTime.startTime;
                                returnData[i].endTime = periodTime.endTime;
                            }
                        }
                        for (let i = 0; i < returnData.length; i++) {
                            delete returnData[i]._id;
                            delete returnData[i].__v;
                            delete returnData[i].platformObjId;
                            delete returnData[i].category;
                            delete returnData[i].customPeriodStartTime;
                            delete returnData[i].customPeriodEndTime;
                        }
                        return returnData;
                    }
                }
            )
        }
    },

    getTopUpRewardPointsEvent: function (playerId, platformId) {
        let returnData;
        let playerObjId;
        if (playerId) {
            return dbConfig.collection_players.findOne({playerId: playerId}).lean().then(
                playerData => {
                    if (playerData) {
                        playerObjId = playerData._id;
                        return dbConfig.collection_rewardPointsEvent.find({
                            platformObjId: playerData.platform,
                            category: constRewardPointsTaskCategory.TOPUP_REWARD_POINTS
                        }).lean().sort({index: 1});
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find player"});
                    }
                }
            ).then(
                rewardPointsEvent => {
                    if (rewardPointsEvent && rewardPointsEvent.length > 0) {
                        let noProgress = {
                            isApplicable: false,
                            isApplied: false,
                            count: 0
                        };
                        returnData = rewardPointsEvent;
                        for (let i = 0; i < returnData.length; i++) {
                            returnData[i].progress = noProgress;
                            if (returnData[i].period) {
                                let periodTime = getEventPeriodTime(returnData[i]);
                                returnData[i].startTime = periodTime.startTime;
                                returnData[i].endTime = periodTime.endTime;
                            }
                        }
                        return dbConfig.collection_rewardPoints.findOne({playerObjId: playerObjId}).lean();
                    }
                }
            ).then(
                rewardPointsData => {
                    if (rewardPointsData) {
                        if (rewardPointsData.progress && rewardPointsData.progress.length > 0) {
                            rewardPointsData.progress.filter(item => {
                                for (let i = 0; i < returnData.length; i++) {
                                    if (returnData[i]._id && item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() === returnData[i]._id.toString()
                                        && item.lastUpdateTime >= returnData[i].startTime && item.lastUpdateTime <= returnData[i].endTime) {
                                        delete item.lastUpdateTime;
                                        delete item.rewardPointsEventObjId;
                                        returnData[i].progress = item;
                                        return item;
                                    }
                                }
                            });
                        }
                        for (let i = 0; i < returnData.length; i++) {
                            delete returnData[i]._id;
                            delete returnData[i].__v;
                            delete returnData[i].platformObjId;
                            delete returnData[i].category;
                            delete returnData[i].customPeriodStartTime;
                            delete returnData[i].customPeriodEndTime;
                        }

                        return {data: returnData};
                    }
                }
            );
        }
        if (platformId && !playerId) {
            return dbConfig.collection_platform.findOne({platformId: platformId}).then(
                platformData => {
                    if (!platformData || !platformData._id) {
                        return Promise.reject({name: "DataError", message: "Cannot find platform"});
                    }
                    return dbConfig.collection_rewardPointsEvent.find({
                        platformObjId: platformData._id,
                        category: constRewardPointsTaskCategory.TOPUP_REWARD_POINTS
                    }).lean().sort({index: 1});
                }
            ).then(
                rewardPointsEvent => {
                    if (rewardPointsEvent && rewardPointsEvent.length > 0) {
                        let noProgress = {
                            isApplicable: false,
                            isApplied: false,
                            count: 0
                        };
                        returnData = rewardPointsEvent;
                        for (let i = 0; i < returnData.length; i++) {
                            returnData[i].progress = noProgress;
                            if (returnData[i].period) {
                                let periodTime = getEventPeriodTime(returnData[i]);
                                returnData[i].startTime = periodTime.startTime;
                                returnData[i].endTime = periodTime.endTime;
                            }
                        }
                        for (let i = 0; i < returnData.length; i++) {
                            delete returnData[i]._id;
                            delete returnData[i].__v;
                            delete returnData[i].platformObjId;
                            delete returnData[i].category;
                            delete returnData[i].customPeriodStartTime;
                            delete returnData[i].customPeriodEndTime;
                        }
                        return returnData;
                    }
                }
            )
        }
    },

    // this function might need to move to dbRewardPointLog
    createRewardPointsLog: function (logDetails) {
        return dbConfig.collection_rewardPointsLog(logDetails).save();
    }
};

module.exports = dbRewardPoints;

// If any of the function below is more general than I thought, it might need to move to dbCommon or dbUtility,
// else, it will act as private function of this model


function isRelevantLoginEventByProvider(event, provider, inputDevice) {
    // if 'OR' flag added in, this part of the code need some adjustment
    let eventTargetDestination = [];

    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
        return false;
    }

    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date()) {
        return false;
    }

    if (event.userAgent && Number(event.userAgent) !== Number(inputDevice)) {
        return false;
    }

    if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {
        eventTargetDestination = event.target.targetDestination;
    }

    return provider ? eventTargetDestination.indexOf(provider.toString()) !== -1 : eventTargetDestination.length === 0;
}

function isRelevantTopupEvent(event, topupMainType, topupProposalData) {
    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date())
        return false;
    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date())
        return false;
    // check userAgent
    if (event.userAgent && Number(event.userAgent) !== Number(topupProposalData.data.userAgent))
        return false;
    // check merchantTopupMainType
    if (event.target && event.target.merchantTopupMainType &&
        Number(event.target.merchantTopupMainType) !== Number(topupMainType))
        return false;
    // check merchantTopupType
    if (Number(topupMainType) === Number(constPlayerTopUpType.ONLINE) &&
        event.target && event.target.merchantTopupType &&
        Number(event.target.merchantTopupType) !== Number(topupProposalData.data.topupType))
        return false;
    // check depositMethod
    if (Number(topupMainType) === Number(constPlayerTopUpType.MANUAL) &&
        event.target && event.target.depositMethod &&
        Number(event.target.depositMethod) !== Number(topupProposalData.data.depositMethod))
        return false;
    // check bankType
    if (Number(topupMainType) === Number(constPlayerTopUpType.MANUAL) &&
        event.target && event.target.bankType &&
        Number(event.target.bankType) !== Number(topupProposalData.data.bankTypeId))
        return false;

    return true;
}

function isRelevantGameEvent(event, consumptionRecord) {
    if (!event) {
        return false;
    }

    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
        return false;
    }

    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date()) {
        return false;
    }

    // temp ignore interface/UA check, todo :: add when data is available

    if (event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {
        let eventTargetDestination = event.target.targetDestination;
        if (!consumptionRecord.providerId || eventTargetDestination.indexOf(consumptionRecord.providerId.toString()) < 0) {
            return false;
        }
    }

    if (event.target && event.target.gameType && event.target.gameType.length > 0) {
        let relevantGameTypes = event.target.gameType;
        if (!consumptionRecord.gameType || relevantGameTypes.indexOf(consumptionRecord.gameType.toString()) < 0) {
            return false;
        }
    }

    // temp ignore bet type check, todo :: add when data is available

    return true;
}

function getEventProgress(rewardProgressList, event) {
    rewardProgressList = rewardProgressList || [];
    if (!event || !event._id) {
        return false;
    }

    for (let i = 0; i < rewardProgressList.length; i++) {
        if (!rewardProgressList[i].rewardPointsEventObjId) {
            continue;
        }

        if (rewardProgressList[i].rewardPointsEventObjId.toString() === event._id.toString()) {
            return rewardProgressList[i];
        }
    }

    // if progress not found, init one
    let newProgressIndex = rewardProgressList.length;
    rewardProgressList.push({rewardPointsEventObjId: event._id});

    return rewardProgressList[newProgressIndex];
}

function updateLoginProgressCount(progress, event, provider) {
    progress = progress || {rewardPointsEventObjId: event._id};
    let progressUpdated = false;

    let eventPeriodStartTime = getEventPeriodStartTime(event);

    if (!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime) {
        // new progress or expired progress setup
        progress.count = 1;
        progress.isApplied = false;
        progress.isApplicable = false;
        commonLoginProgressUpdate(progress, provider);
        progressUpdated = true;
    }
    else {
        let today = dbUtility.getTodaySGTime();
        if (!progress.isApplicable && progress.lastUpdateTime < today.startTime && progress.count < event.consecutiveCount) {
            // add progress if necessary
            progress.count++;
            commonLoginProgressUpdate(progress, provider);
            progressUpdated = true;
        }
        // do nothing otherwise
    }

    if (progress.count >= event.consecutiveCount) {
        progress.isApplicable = true;
    }
    return progressUpdated;
}

function updateGameProgressCount(progress, event, consumptionRecord) {
    progress = progress || {rewardPointsEventObjId: event._id};

    if (!event.target) {
        return false;
    }

    let progressUpdated = false;
    let eventPeriodStartTime = getEventPeriodStartTime(event);

    if (event.target.singleConsumptionAmount && event.target.dailyConsumptionCount) {
        // case scenario 1
        progressUpdated = updateProgressBaseOnConsumptionCount(progress, event.target.singleConsumptionAmount, event.target.dailyConsumptionCount, consumptionRecord, eventPeriodStartTime);
    }
    else if (event.target.dailyValidConsumptionAmount) {
        // case scenario 2
        progressUpdated = updateProgressBaseOnConsumptionAmount(progress, event.target.dailyValidConsumptionAmount, consumptionRecord, eventPeriodStartTime);
    }
    else if (event.target.dailyWinGameCount) {
        // case scenario 3
        progressUpdated = updateProgressBaseOnDailyWinGameCount(progress, event.target.dailyWinGameCount, consumptionRecord, eventPeriodStartTime);
    }

    if (progress.count >= event.consecutiveCount) {
        progress.isApplicable = true;
    }

    return progressUpdated;
}

function updateProgressBaseOnConsumptionCount(progress, singleConsumptionAmount, dailyConsumptionCount, consumptionRecord, eventPeriodStartTime) {
    if (consumptionRecord.validAmount < singleConsumptionAmount) {
        return false;
    }

    let todayStartTime = dbUtility.getTodaySGTime().startTime;

    if (!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime) {
        // a fresh start
        progress.isApplied = false;
        progress.isApplicable = false;
        progress.todayConsumptionCount = 1;
        progress.count = 0;
    }
    else if (progress.lastUpdateTime < todayStartTime) {
        // not a fresh start, but a fresh day
        if (progress.isApplicable) {
            return false
        }

        progress.todayConsumptionCount = 1;
    } else {
        // not a fresh start nor a fresh day
        if (progress.todayConsumptionCount >= dailyConsumptionCount || progress.isApplicable) {
            return false;
        }

        progress.todayConsumptionCount++;
    }

    progress.lastUpdateTime = new Date();
    if (progress.todayConsumptionCount >= dailyConsumptionCount) {
        progress.count++;
    }

    return true;
}

function updateProgressBaseOnConsumptionAmount (progress, dailyValidConsumptionAmount, consumptionRecord, eventPeriodStartTime) {
    let todayStartTime = dbUtility.getTodaySGTime().startTime;

    dailyValidConsumptionAmount = Number(dailyValidConsumptionAmount);

    if (!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime) {
        // a fresh start
        progress.isApplied = false;
        progress.isApplicable = false;
        progress.todayConsumptionAmountProgress = consumptionRecord.validAmount;
        progress.count = 0;
    }
    else if (progress.lastUpdateTime < todayStartTime) {
        // not a fresh start, but a fresh day
        if (progress.isApplicable) {
            return false
        }

        progress.todayConsumptionAmountProgress = consumptionRecord.validAmount;
    } else {
        // not a fresh start nor a fresh day
        if (progress.todayConsumptionAmountProgress >= dailyValidConsumptionAmount || progress.isApplicable) {
            return false;
        }

        progress.todayConsumptionAmountProgress += consumptionRecord.validAmount;
    }

    progress.lastUpdateTime = new Date();
    if (progress.todayConsumptionAmountProgress >= dailyValidConsumptionAmount) {
        progress.todayConsumptionAmountProgress = dailyValidConsumptionAmount;
        progress.count++;
    }

    return true;
}

function updateProgressBaseOnDailyWinGameCount (progress, dailyWinGameCount, consumptionRecord, eventPeriodStartTime) {
    if (consumptionRecord.bonusAmount <= 0) {
        return false;
    }

    dailyWinGameCount = Number(dailyWinGameCount);
    let todayStartTime = dbUtility.getTodaySGTime().startTime;

    if (!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime) {
        // a fresh start
        progress.isApplied = false;
        progress.isApplicable = false;
        progress.todayWinCount = 1;
        progress.count = 0;
    }
    else if (progress.lastUpdateTime < todayStartTime) {
        // not a fresh start, but a fresh day
        if (progress.isApplicable) {
            return false
        }

        progress.todayWinCount = 1;
    } else {
        // not a fresh start nor a fresh day
        if (progress.todayWinCount >= dailyWinGameCount || progress.isApplicable) {
            return false;
        }

        progress.todayWinCount++;
    }

    progress.lastUpdateTime = new Date();
    if (progress.todayWinCount >= dailyWinGameCount) {
        progress.count++;
    }

    return true;
}

function updateTopupProgressCount(progress, event, todayTopupAmount) {
    progress = progress || {rewardPointsEventObjId: event._id};
    let progressUpdated = false;

    let eventPeriodStartTime = getEventPeriodStartTime(event);

    if ((!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime)
        && todayTopupAmount >= event.target.dailyTopupAmount) {
        // new progress or expired progress setup
        progress.count = 1;
        progress.isApplied = false;
        progress.isApplicable = false;
        progress.lastUpdateTime = new Date();
        progressUpdated = true;
    }
    else {
        let today = dbUtility.getTodaySGTime();
        if (!progress.isApplicable && progress.lastUpdateTime < today.startTime && progress.count < event.consecutiveCount
            && todayTopupAmount >= event.target.dailyTopupAmount) {
            progress.count++;
            progress.lastUpdateTime = new Date();
            progressUpdated = true;
        }
    }

    if (event.target && event.target.dailyTopupAmount &&
        todayTopupAmount >= event.target.dailyTopupAmount && progress.count >= event.consecutiveCount) {
        progress.isApplicable = true;
    }
    return progressUpdated;
}

function buildTodayTopupAmountQuery(event, topupProposalData) {
    let today = dbUtility.getTodaySGTime();
    let relevantTopupMatchQuery = {
        playerId: topupProposalData.data.playerObjId,
        platformId: topupProposalData.data.platformId,
        userAgent: event.userAgent.toString(),
        createTime: {$gte: today.startTime, $lte: today.endTime}
    };

    if (event.target && event.target.merchantTopupMainType) {
        relevantTopupMatchQuery.topUpType = event.target.merchantTopupMainType.toString();
        switch (event.target.merchantTopupMainType) {
            case constPlayerTopUpType.MANUAL:
                relevantTopupMatchQuery.depositMethod = event.target.depositMethod.toString();
                relevantTopupMatchQuery.bankCardType = event.target.bankType.toString();
                break;
            case constPlayerTopUpType.ONLINE:
                relevantTopupMatchQuery.merchantTopUpType = event.target.merchantTopupType.toString();
                break;
            case constPlayerTopUpType.ALIPAY:
                break;
            case constPlayerTopUpType.WECHAT:
                break;
            case constPlayerTopUpType.QUICKPAY:
                break;

        }
    }
    return relevantTopupMatchQuery;
}

function getEventPeriodStartTime(event) {
    if (!event || !event.period) {
        return false;
    }
    switch (Number(event.period)) {
        case 1:
            return dbUtility.getTodaySGTime().startTime;
        case 2:
            return dbUtility.getCurrentWeekSGTime().startTime;
        case 3:
            return dbUtility.getCurrentBiWeekSGTIme().startTime;
        case 4:
            return dbUtility.getCurrentMonthSGTIme().startTime;
        case 5:
            return dbUtility.getCurrentYearSGTime().startTime;
        case 6:
            if (event.customPeriodStartTime) {
                return event.customPeriodStartTime;
            }
        // go to default if custom period start time does not exist
        default:
            return false;
    }
}

function getEventPeriodTime(event) {
    if (!event || !event.period) {
        return false;
    }
    switch(Number(event.period)) {
        case 1:
            return dbUtility.getTodaySGTime();
        case 2:
            return dbUtility.getCurrentWeekSGTime();
        case 3:
            return dbUtility.getCurrentBiWeekSGTIme();
        case 4:
            return dbUtility.getCurrentMonthSGTIme();
        case 5:
            return dbUtility.getCurrentYearSGTime();
        case 6:
            // if (event.customPeriodStartTime) {
            //     return event.customPeriodStartTime;
            // }
            return {
                startTime: event.customPeriodStartTime?event.customPeriodStartTime:"",
                endTime: event.customPeriodEndTime? event.customPeriodEndTime: ""
            };
        // go to default if custom period start time does not exist
        default:
            return false;
    }
}

function commonLoginProgressUpdate(progress, provider) {
    progress.lastUpdateTime = new Date();
    if (provider) {
        progress.targetDestination = provider;
    }
}

function getTodayLastRewardPointEventLog(pointObjId) {
    let todayStartTime = dbUtility.getTodaySGTime().startTime;

    return dbConfig.collection_rewardPointsLog.find({
        rewardPointsObjId: pointObjId,
        category: {
            $in: [
                constRewardPointsLogCategory.LOGIN_REWARD_POINTS,
                constRewardPointsLogCategory.TOPUP_REWARD_POINTS,
                constRewardPointsLogCategory.GAME_REWARD_POINTS
            ]
        },
        createTime: {$gte: new Date(todayStartTime)}
    }).sort({createTime: -1}).limit(1).lean();
}