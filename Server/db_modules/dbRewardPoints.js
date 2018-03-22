let Q = require("q");
let dbConfig = require('./../modules/dbproperties');
let dbRewardPointsLvlConfig = require('./../db_modules/dbRewardPointsLvlConfig');
let dbPlayerLevel = require('./../db_modules/dbPlayerLevel');
let dbGameProvider = require('./../db_modules/dbGameProvider');
let dbRewardPointsEvent = require('./../db_modules/dbRewardPointsEvent');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbUtility = require('./../modules/dbutility');
let errorUtils = require('./../modules/errorUtils');
let localization = require("../modules/localization");
const constRewardPointsTaskCategory = require('../const/constRewardPointsTaskCategory');
const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');
const constRewardPointsPeriod = require("../const/constRewardPointsPeriod");
const constPlayerTopUpType = require('../const/constPlayerTopUpType');
const constRewardPointsEventPeriod = require('../const/constRewardPointsEventPeriod');
const constRewardPointsUserAgent = require("../const/constRewardPointsUserAgent");
const constRewardPointsEventTopupType = require("../const/constRewardPointsEventTopupType");
const constRewardPointsTopupEventUserAgent = require("../const/constRewardPointsTopupEventUserAgent");
const constServerCode = require('../const/constServerCode');

let dbRewardPoints = {

    getPlayerRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        return dbConfig.collection_rewardPoints.findOne({playerObjId}).lean().then(
            rewardPointsData => {
                if (!rewardPointsData) {
                    return dbRewardPoints.createRewardPoints(playerObjId, playerData);
                }
                else if (playerData && playerData.playerLevel && rewardPointsData.playerLevel && rewardPointsData.playerLevel.toString() !== playerData.playerLevel.toString()) {
                    return dbRewardPoints.updateRewardPointsPlayerLevel(rewardPointsData._id, playerData.playerLevel);
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

        let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategoryWithPopulatePlayerLevel(playerData.platform, constRewardPointsTaskCategory.LOGIN_REWARD_POINTS);
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerData._id, playerData);
        let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(playerData.platform);
        let getplayerLevelProm = getPlayerLevelValue(playerData._id);

        return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm, getplayerLevelProm]).then(
            data => {
                let events = data[0];
                let playerRewardPoints = data[1];
                rewardPointsConfig = data[2];
                let playerLevelData = data[3];

                relevantEvents = events.filter(event => isRelevantLoginEventByProvider(event, provider, inputDevice, playerLevelData));

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

                    let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategoryWithPopulatePlayerLevel(topupProposalData.data.platformId, constRewardPointsTaskCategory.TOPUP_REWARD_POINTS);
                    let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(topupProposalData.data.playerObjId);
                    let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(topupProposalData.data.platformId);
                    let getplayerLevelProm = getPlayerLevelValue(topupProposalData.data.playerObjId);

                    return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm, getplayerLevelProm]).then(
                        data => {
                            let events = data[0];
                            let playerRewardPoints = data[1];
                            rewardPointsConfig = data[2];
                            let playerLevelData = data[3];

                            relevantEvents = events.filter(event => isRelevantTopupEvent(event, topupMainType, topupProposalData, playerLevelData));
                            if (!relevantEvents || relevantEvents.length < 1) {
                                relevantEvents = [];
                            }

                            let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];

                            let rewardProgressListChanged = false;
                            let prom = [];
                            for (let i = 0; i < relevantEvents.length; i++) {
                                let event = relevantEvents[i];
                                let relevantTopupMatchQuery = buildTodayTopupAmountQuery(event, topupProposalData, true);

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

                let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategoryWithPopulatePlayerLevel(platform._id, constRewardPointsTaskCategory.GAME_REWARD_POINTS);
                let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(consumptionRecord.playerId);
                let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(platform._id);
                let getplayerLevelProm = getPlayerLevelValue(consumptionRecord.playerId);

                return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm, getplayerLevelProm]);
            }
        ).then(
            data => {
                if (!data) {
                    return Promise.resolve();
                }

                let events = data[0];
                let playerRewardPoints = data[1];
                rewardPointsConfig = data[2];
                let playerLevelData = data[3];

                relevantEvents = events.filter(event => isRelevantGameEvent(event, consumptionRecord, playerLevelData));

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
                        message: localization.localization.translate("Player already applied for the reward point.")
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
                        status: constServerCode.COMMON_ERROR,
                        name: "DataError",
                        message: "Error in getting player level"
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
                        status: constServerCode.COMMON_ERROR,
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
                    userAgent: inputDevice?inputDevice:0,
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
        let rewardPointsEvent = [];
        let platformObjData = [];
        let platformDataProm = [];
        let rewardPointEventProm = [];
        if (playerId) {
            return dbConfig.collection_players.findOne({playerId: playerId}).lean().then(
                playerData => {
                    if (playerData) {
                        playerObjId = playerData._id;
                        platformDataProm = dbConfig.collection_platform.findOne({_id: playerData.platform}).lean().exec();
                        rewardPointEventProm = dbConfig.collection_rewardPointsEvent.find({
                            platformObjId: playerData.platform,
                            category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS
                        }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});
                        return Promise.all([rewardPointEventProm,platformDataProm])
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find player"});
                    }
                }
            ).then(
                data => {
                        Object.assign(rewardPointsEvent, data[0]);
                        Object.assign(platformObjData, data[1]);
                        return dbConfig.collection_gameProvider.find({}).lean().then(
                            gameProviderObj => {
                                if (!gameProviderObj) {
                                    return Promise.reject({name: "DataError", message: "Cannot find game provider"});
                                }

                                if (rewardPointsEvent && rewardPointsEvent.length > 0) {

                                    rewardPointsEvent.map(event => {
                                        let providerName = [];

                                        if (event.target.targetDestination && event.target.targetDestination.length > 0) {

                                            event.target.targetDestination.forEach(item => {
                                                if (platformObjData[0] && platformObjData[0].gameProviderInfo && platformObjData[0].gameProviderInfo[item] && platformObjData[0].gameProviderInfo[item].localNickName) {
                                                    providerName.push(platformObjData[0].gameProviderInfo[item].localNickName);
                                                }
                                                else {
                                                    gameProviderObj.forEach(gameItem => {
                                                        if (item == gameItem._id.toString()) {
                                                            providerName.push(gameItem.name);
                                                        }
                                                    });
                                                }
                                            })
                                        }
                                        event.target.targetDestination = providerName;
                                        if (event.level && event.level.value){
                                            event.level = event.level.value;
                                        }
                                    
                                    });

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
                            })
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
                            returnData[i].eventObjId = returnData[i]._id;
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

            return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
                platformData => {
                    if (!platformData || !platformData._id) {
                        return Promise.reject({name: "DataError", message: "Cannot find platform"});
                    }
                    Object.assign(platformObjData, platformData);
                    return dbConfig.collection_rewardPointsEvent.find({
                        platformObjId: platformData._id,
                        category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS
                    }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});
                }
            ).then(
                rewardPointsObj => {
                    Object.assign(rewardPointsEvent, rewardPointsObj);
                    return dbConfig.collection_gameProvider.find({_id: {$in: platformObjData.gameProviders}}).lean().then(
                        gameProviderObj => {
                            if (!gameProviderObj) {
                                return Promise.reject({name: "DataError", message: "Cannot find game provider"});
                            }

                            if (rewardPointsEvent && rewardPointsEvent.length > 0) {

                                rewardPointsEvent.map(event => {
                                    let providerName = [];
                                    let providerId = [];
                                    if (event.target.targetDestination && event.target.targetDestination.length > 0) {

                                            event.target.targetDestination.forEach(item => {
                                                if (platformObjData.gameProviderInfo && platformObjData.gameProviderInfo[item] && platformObjData.gameProviderInfo[item].localNickName) {
                                                    providerName.push(platformObjData.gameProviderInfo[item].localNickName);
                                                }
                                                else {
                                                    gameProviderObj.forEach(gameItem => {
                                                        if (item == gameItem._id.toString()) {
                                                            providerName.push(gameItem.name);
                                                        }
                                                    });

                                                }

                                            })
                                    }
                                    event.target.targetDestination = providerName;
                                    if (event.level && event.level.value){
                                        event.level = event.level.value;
                                    }

                                });

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
                                    returnData[i].eventObjId = returnData[i]._id;
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
                })
        }
    },

    getGameRewardPoints: function (playerId, platformId) {
        let returnData;
        let playerObjId;
        let platformDataProm = [];
        let rewardPointEventProm = [];
        let rewardPointsEvent = [];
        let platformObjData = [];
        if (playerId) {
            return dbConfig.collection_players.findOne({playerId: playerId}).lean().then(
                playerData => {
                    if (playerData) {
                        playerObjId = playerData._id;
                        platformDataProm = dbConfig.collection_platform.findOne({_id: playerData.platform}).lean().exec();
                        rewardPointEventProm = dbConfig.collection_rewardPointsEvent.find({
                            platformObjId: playerData.platform,
                            category: constRewardPointsTaskCategory.GAME_REWARD_POINTS
                        }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});
                        return Promise.all([rewardPointEventProm,platformDataProm])
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find player"});
                    }
                }
            ).then(
                data => {
                    Object.assign(rewardPointsEvent, data[0]);
                    Object.assign(platformObjData, data[1]);

                    return dbConfig.collection_gameProvider.find({}).lean().then(
                        gameProviderObj => {
                            if (!gameProviderObj) {
                                return Promise.reject({name: "DataError", message: "Cannot find game provider"});
                            }

                            if (rewardPointsEvent && rewardPointsEvent.length > 0) {

                                rewardPointsEvent.map(event => {
                                    let providerName = [];

                                    if (event.target.targetDestination && event.target.targetDestination.length > 0) {

                                        event.target.targetDestination.forEach(item => {
                                            if (platformObjData[0] && platformObjData[0].gameProviderInfo && platformObjData[0].gameProviderInfo[item] && platformObjData[0].gameProviderInfo[item].localNickName) {
                                                providerName.push(platformObjData[0].gameProviderInfo[item].localNickName);
                                            }
                                            else {
                                                gameProviderObj.forEach(gameItem => {
                                                    if (item == gameItem._id.toString()) {
                                                        providerName.push(gameItem.name);
                                                    }
                                                });

                                            }

                                        })
                                    }
                                    event.target.targetDestination = providerName;
                                    if (event.level && event.level.value){
                                        event.level = event.level.value;
                                    }
                                });

                                returnData = rewardPointsEvent;
                                for (let i = 0; i < returnData.length; i++) {
                                    let noProgress = {
                                        isApplicable: false,
                                        isApplied: false,
                                        count: 0
                                    };
                                    returnData[i].progress = noProgress;
                                    if (returnData[i].period) {
                                        let periodTime = getEventPeriodTime(returnData[i]);
                                        returnData[i].startTime = periodTime.startTime;
                                        returnData[i].endTime = periodTime.endTime;
                                    }
                                    Object.keys(returnData[i].target).forEach(
                                        key => {
                                            if (!returnData[i].target[key]) {
                                                delete returnData[i].target[key];
                                            }
                                        }
                                    );
                                    if (returnData[i].target.singleConsumptionAmount && returnData[i].target.dailyConsumptionCount) {
                                        returnData[i].progress.todayConsumptionCount = 1;
                                    }
                                    else if (returnData[i].target.dailyValidConsumptionAmount) {
                                        returnData[i].progress.todayConsumptionAmountProgress = 0;
                                    }
                                    else if (returnData[i].target.dailyWinGameCount) {
                                        returnData[i].progress.todayWinCount = 1;
                                    }
                                }
                                return dbConfig.collection_rewardPoints.findOne({playerObjId: playerObjId}).lean();
                            }
                        })
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
                            returnData[i].eventObjId = returnData[i]._id;
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
            let platformObjData = [];
            let rewardPointsEvent = [];

            return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
                platformData => {
                    if (!platformData || !platformData._id) {
                        return Promise.reject({name: "DataError", message: "Cannot find platform"});
                    }
                    Object.assign(platformObjData,platformData);
                    return dbConfig.collection_rewardPointsEvent.find({
                        platformObjId: platformData._id,
                        category: constRewardPointsTaskCategory.GAME_REWARD_POINTS
                    }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});
                }
            ).then(
                rewardPointsObj => {

                    Object.assign(rewardPointsEvent, rewardPointsObj);
                    return dbConfig.collection_gameProvider.find({_id: {$in: platformObjData.gameProviders}}).lean().then(
                        gameProviderObj => {
                            if (!gameProviderObj){
                                return Promise.reject({name: "DataError", message: "Cannot find game provider"});
                            }

                            if (rewardPointsEvent && rewardPointsEvent.length > 0) {

                                rewardPointsEvent.map(event => {
                                    let providerName = [];
                                    let providerId = [];
                                    if (event.target.targetDestination && event.target.targetDestination.length > 0) {

                                        event.target.targetDestination.forEach(item => {
                                            if (platformObjData.gameProviderInfo && platformObjData.gameProviderInfo[item] && platformObjData.gameProviderInfo[item].localNickName) {
                                                providerName.push(platformObjData.gameProviderInfo[item].localNickName);
                                            }
                                            else {
                                                gameProviderObj.forEach(gameItem => {
                                                    if (item == gameItem._id.toString()) {
                                                        providerName.push(gameItem.name);
                                                    }
                                                });

                                            }

                                        })
                                    }
                                    event.target.targetDestination = providerName;
                                    if (event.level && event.level.value){
                                        event.level = event.level.value;
                                    }
                                });

                                returnData = rewardPointsEvent;
                                for (let i = 0; i < returnData.length; i++) {
                                    let noProgress = {
                                        isApplicable: false,
                                        isApplied: false,
                                        count: 0
                                    };
                                    returnData[i].progress = noProgress;
                                    if (returnData[i].period) {
                                        let periodTime = getEventPeriodTime(returnData[i]);
                                        returnData[i].startTime = periodTime.startTime;
                                        returnData[i].endTime = periodTime.endTime;
                                    }
                                    Object.keys(returnData[i].target).forEach(
                                        key => {
                                            if (!returnData[i].target[key]) {
                                                delete returnData[i].target[key];
                                            }
                                        }
                                    );

                                    if (returnData[i].target.singleConsumptionAmount && returnData[i].target.dailyConsumptionCount) {
                                        returnData[i].progress.todayConsumptionCount = 1;
                                    }
                                    else if (returnData[i].target.dailyValidConsumptionAmount) {
                                        returnData[i].progress.todayConsumptionAmountProgress = 0;
                                    }
                                    else if (returnData[i].target.dailyWinGameCount) {
                                        returnData[i].progress.todayWinCount = 1;
                                    }

                                }
                                for (let i = 0; i < returnData.length; i++) {
                                    returnData[i].eventObjId = returnData[i]._id;
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
                    );
                }
            )
        }
    },

    getTopUpRewardPointsEvent: function (playerId, platformId) {
        let returnData;
        let playerObjId;
        let rewardPointsEvent = [];
        let platformObjData = [];
        let platformDataProm = [];
        let rewardPointEventProm = [];
        if (playerId) {
            return dbConfig.collection_players.findOne({playerId: playerId}).lean().then(
                playerData => {
                    if (playerData) {
                        playerObjId = playerData._id;
                        platformDataProm = dbConfig.collection_platform.findOne({_id: playerData.platform}).lean().exec();
                        rewardPointEventProm = dbConfig.collection_rewardPointsEvent.find({
                            platformObjId: playerData.platform,
                            category: constRewardPointsTaskCategory.TOPUP_REWARD_POINTS
                        }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});
                        return Promise.all([rewardPointEventProm,platformDataProm])
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find player"});
                    }
                }
            ).then(
                data => {
                    Object.assign(rewardPointsEvent, data[0]);
                    Object.assign(platformObjData, data[1]);
                    return dbConfig.collection_gameProvider.find({}).lean().then(
                        gameProviderObj => {
                            if (!gameProviderObj) {
                                return Promise.reject({name: "DataError", message: "Cannot find game provider"});
                            }

                            if (rewardPointsEvent && rewardPointsEvent.length > 0) {

                                rewardPointsEvent.map(event => {
                                    let providerName = [];

                                    if (event.target.targetDestination && event.target.targetDestination.length > 0) {

                                        event.target.targetDestination.forEach(item => {
                                            if (platformObjData[0] && platformObjData[0].gameProviderInfo && platformObjData[0].gameProviderInfo[item] && platformObjData[0].gameProviderInfo[item].localNickName) {
                                                providerName.push(platformObjData[0].gameProviderInfo[item].localNickName);
                                            }
                                            else {
                                                gameProviderObj.forEach(gameItem => {
                                                    if (item == gameItem._id.toString()) {
                                                        providerName.push(gameItem.name);
                                                    }
                                                });
                                            }
                                        })
                                    }
                                    event.target.targetDestination = providerName;
                                    if (event.level && event.level.value){
                                        event.level = event.level.value;
                                    }
                                });

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
                        })
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
                            returnData[i].eventObjId = returnData[i]._id;
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
            return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
                platformData => {
                    if (!platformData || !platformData._id) {
                        return Promise.reject({name: "DataError", message: "Cannot find platform"});
                    }
                    Object.assign(platformObjData, platformData);
                    return dbConfig.collection_rewardPointsEvent.find({
                        platformObjId: platformData._id,
                        category: constRewardPointsTaskCategory.TOPUP_REWARD_POINTS
                    }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});
                }
            ).then(
                rewardPointsObj => {
                    Object.assign(rewardPointsEvent, rewardPointsObj);
                    return dbConfig.collection_gameProvider.find({_id: {$in: platformObjData.gameProviders}}).lean().then(
                        gameProviderObj => {
                            if (!gameProviderObj) {
                                return Promise.reject({name: "DataError", message: "Cannot find game provider"});
                            }
                            if (rewardPointsEvent && rewardPointsEvent.length > 0) {

                                rewardPointsEvent.map(event => {
                                    let providerName = [];
                                    let providerId = [];
                                    if (event.target.targetDestination && event.target.targetDestination.length > 0) {

                                        event.target.targetDestination.forEach(item => {
                                            if (platformObjData.gameProviderInfo && platformObjData.gameProviderInfo[item] && platformObjData.gameProviderInfo[item].localNickName) {
                                                providerName.push(platformObjData.gameProviderInfo[item].localNickName);
                                            }
                                            else {
                                                gameProviderObj.forEach(gameItem => {
                                                    if (item == gameItem._id.toString()) {
                                                        providerName.push(gameItem.name);
                                                    }
                                                });
                                            }
                                        })
                                    }
                                    event.target.targetDestination = providerName;
                                    if (event.level && event.level.value){
                                        event.level = event.level.value;
                                    }
                                });

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
                                    returnData[i].eventObjId = returnData[i]._id;
                                    delete returnData[i]._id;
                                    delete returnData[i].__v;
                                    delete returnData[i].platformObjId;
                                    delete returnData[i].category;
                                    delete returnData[i].customPeriodStartTime;
                                    delete returnData[i].customPeriodEndTime;
                                }
                                return returnData;
                            }
                        })
                }
            )
        }
    },

    getPointRule: function (playerId, platformId) {
        let player, platform, platformObjId, firstProm, lists, dailyConvertedPoints, dailyAppliedPoints, rewardPoints, rewardPointsObjId;
        let intervalPeriod = null;
        let list = [];

        // display all point rule for each player level
        function addParamToList(listData) {
            if (!listData) {
                return false;
            }

            list.push(listData);
        }

        if (playerId) {
            let playerProm = dbConfig.collection_players.findOne({playerId})
                .populate({path: "platform", model: dbConfig.collection_platform})
                .populate({path: "rewardPointsObjId", model: dbConfig.collection_rewardPoints})
                .lean().then(
                    playerData => {
                        if (!playerData) {
                            return Promise.reject({name: "DataError", message: "Invalid player data"});
                        }
                        player = playerData;
                        platform = playerData.platform;
                        platformObjId = playerData.platform._id;
                        rewardPoints = playerData.rewardPointsObjId.points;
                        rewardPointsObjId = playerData.rewardPointsObjId._id;
                    }
                );
            firstProm = playerProm;
        } else {
            let platformProm = dbConfig.collection_platform.findOne({platformId}).lean().then(
                platformData => {
                    if (!platformData) {
                        return Promise.reject({name: "DataError", message: "Invalid player data"});
                    }
                    platform = platformData;
                    platformObjId = platformData._id;
                }
            );
            firstProm = platformProm;
        }

        return firstProm.then(() => {
            return Q.all([dbRewardPointsLvlConfig.getRewardPointsLvlConfig(platformObjId), dbPlayerLevel.getPlayerLevel({platform: platformObjId}),
                dbGameProvider.getPlatformProviderGroup(platformObjId), dbPlayerInfo.getPlayerRewardPointsDailyConvertedPoints(rewardPointsObjId),
                dbPlayerInfo.getPlayerRewardPointsDailyAppliedPoints(rewardPointsObjId)]).then(
                data => {
                    let rewardPointsLvlConfig = data[0];
                    let allPlayerLvl = data[1];
                    let platformProviderGroup = data[2];
                    if (player) { // only display if found player data
                        dailyConvertedPoints = data[3];
                        dailyAppliedPoints = data[4];
                    }

                    let playerLevelId, playerLevelName, dailyMaxPoints, pointToCreditManualRate, pointToCreditManualMaxPoints;
                    let pointToCreditAutoRate, pointToCreditAutoMaxPoints, spendingAmountOnReward, providerGroupId, providerGroupName;

                    // check is all player level already set rewardPointsLvlConfig
                    allPlayerLvl.forEach((playerLvl) => {
                        rewardPointsLvlConfig = rewardPointsLvlConfig ? rewardPointsLvlConfig : {};
                        rewardPointsLvlConfig.params = rewardPointsLvlConfig.params ? rewardPointsLvlConfig.params : [];
                        playerLevelId = playerLvl.value;
                        playerLevelName = playerLvl.name;

                        rewardPointsLvlConfig.params.forEach((param) => {
                            if (param && playerLvl && param.levelObjId && playerLvl._id && param.levelObjId.toString() === playerLvl._id.toString()) {
                                dailyMaxPoints = param.dailyMaxPoints;
                                pointToCreditManualRate = param.pointToCreditManualRate;
                                pointToCreditManualMaxPoints = param.pointToCreditManualMaxPoints;
                                pointToCreditAutoRate = param.pointToCreditAutoRate;
                                pointToCreditAutoMaxPoints = param.pointToCreditAutoMaxPoints;
                                spendingAmountOnReward = param.spendingAmountOnReward;

                                if (param && !param.providerGroup) {
                                    providerGroupId = "";
                                    providerGroupName = localization.localization.translate("LOCAL_CREDIT");
                                }

                                platformProviderGroup.forEach((provider) => {
                                    if (provider && param && provider._id && param.providerGroup && provider._id.toString() === param.providerGroup.toString()) {
                                        providerGroupId = provider.providerGroupId;
                                        providerGroupName = provider.name;
                                    }
                                });
                            }
                        });

                        // find refreshPeriod
                        intervalPeriod = rewardPointsLvlConfig.intervalPeriod;
                        for (let key in constRewardPointsPeriod) {
                            if (constRewardPointsPeriod[key] === intervalPeriod) {
                                intervalPeriod = key;
                            }
                        }

                        lists = {
                            gradeId: playerLevelId,
                            gradeName: playerLevelName,
                            dailyGetMaxPoint: dailyMaxPoints,
                            preExchangeRate: pointToCreditManualRate,
                            preDailyExchangeMaxPoint: pointToCreditManualMaxPoints,
                            endExchangeRate: pointToCreditAutoRate,
                            endExchangeMaxPoint: pointToCreditAutoMaxPoints,
                            requestedValidBetTimes: spendingAmountOnReward,
                            lockedGroupId: providerGroupId,
                            lockedGroupName: providerGroupName,
                        };
                        addParamToList(lists);
                    });

                    let outputObject = {
                        preDailyExchangedPoint: dailyConvertedPoints,
                        preDailyAppliedPoint: dailyAppliedPoints,
                        userCurrentPoint: rewardPoints,
                        refreshPeriod: intervalPeriod,
                        list: list
                    };
                    return outputObject;
                }
            );
        })
    },

    // this function might need to move to dbRewardPointLog
    createRewardPointsLog: function (logDetails) {
        return dbConfig.collection_rewardPointsLog(logDetails).save();
    },

    getMissonList: function (playerId, platformId) {
        let returnData;
        let platformData = null;
        let playerData = null;
        let topupRewardPointEvent = [];
        let rewardPointRecord = [];
        let rewardPointsProm = [];
        let playerLevelProm = [];
        let playerLevelRecord = [];

        return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformRecord => {
                if (platformRecord) {
                    platformData = platformRecord;
                    return dbConfig.collection_players.findOne({
                        playerId: playerId,
                        platform: platformRecord._id
                    })
                } else {
                    return Promise.reject({name: "DataError", message: "Platform Not Found"});
                }
            })
            .then(playerRecord => {
                let topupRewardPointProm = dbConfig.collection_rewardPointsEvent.find({
                    platformObjId: platformData._id,
                    category: constRewardPointsTaskCategory.TOPUP_REWARD_POINTS,
                    status: true
                }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});

                if (playerRecord) {
                    playerData = playerRecord;
                    rewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerRecord._id);
                    playerLevelProm = getPlayerLevelValue(playerRecord._id);
                }

                return Promise.all([topupRewardPointProm, rewardPointsProm, playerLevelProm])
            })
            .then(playerTopupRewardPointsRecord => {
                topupRewardPointEvent = playerTopupRewardPointsRecord[0] ? playerTopupRewardPointsRecord[0] : [];
                rewardPointRecord = playerTopupRewardPointsRecord[1] ? playerTopupRewardPointsRecord[1] : [];
                playerLevelRecord = playerTopupRewardPointsRecord[2] ? playerTopupRewardPointsRecord[2] : [];

                if(rewardPointRecord){
                    let rewardProgressList = rewardPointRecord && rewardPointRecord.progress ? rewardPointRecord.progress : [];
                    let rewardProgressListChanged = false;
                    let prom = [];
                    if (playerData) {
                        for (let i = 0; i < topupRewardPointEvent.length; i++) {
                            let event = topupRewardPointEvent[i];
                            if (playerLevelRecord && playerLevelRecord.playerLevel && event && event.level && (playerLevelRecord.playerLevel.value >= event.level.value)) {
                                let topupMatchQuery = buildTodayTopupAmountQuery(event, playerData, false);
                                prom.push(dbConfig.collection_playerTopUpRecord.aggregate(
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
                                        let periodTopupAmount = summary && summary[0] && summary[0].amount ? summary[0].amount : 0;
                                        if (periodTopupAmount > 0) {
                                            let eventProgress = getEventProgress(rewardProgressList, event);
                                            let progressChanged = updateTopupProgressCount(eventProgress, event, periodTopupAmount);
                                            rewardProgressListChanged = rewardProgressListChanged || progressChanged;
                                        }
                                    }
                                ));
                            }
                        }
                    }
                    return Promise.all(prom).then(
                        () => {
                            if (rewardProgressListChanged) {
                                return dbConfig.collection_rewardPoints.findOneAndUpdate({
                                    platformObjId: rewardPointRecord.platformObjId,
                                    playerObjId: rewardPointRecord.playerObjId
                                }, {
                                    progress: rewardProgressList
                                }, {new: true}).lean();
                            }
                            else {
                                return Promise.resolve(rewardPointRecord);
                            }
                        }
                    );
                }
            })
            .then(rewardPoints => {
                let limit = 10;
                let sortCol = {points: -1, lastUpdate: 1};

                let loginRewardPointProm = dbConfig.collection_rewardPointsEvent.find({
                    platformObjId: platformData._id,
                    category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS,
                    status: true
                }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});

                let gameRewardPointProm = dbConfig.collection_rewardPointsEvent.find({
                    platformObjId: platformData._id,
                    category: constRewardPointsTaskCategory.GAME_REWARD_POINTS,
                    status: true
                }).populate({path: "level", model: dbConfig.collection_playerLevel}).lean().sort({index: 1});

                let gameProviderProm = dbConfig.collection_gameProvider.find({}).lean();

                let rewardPointsRankingProm = dbConfig.collection_rewardPoints.find({
                    platformObjId: platformData._id
                }, {
                    playerName: 1,
                    playerLevel: 1,
                    points: 1,
                    _id: 0
                }).sort(sortCol).limit(limit)
                    .populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();

                return Promise.all([loginRewardPointProm, gameRewardPointProm, gameProviderProm, rewardPoints, rewardPointsRankingProm])
            })
            .then(data => {
                let loginRewardPointEvent = data[0] ? data[0] : [];
                let gameRewardPointEvent = data[1] ? data[1] : [];
                let gameProvider = data[2] ? data[2] : [];
                let rewardPoints = data[3] ? data[3] : [];
                let rewardPointsRanking = data[4] ? data[4] : [];

                let loginRewardPointListArr = getRewardPointEvent(constRewardPointsTaskCategory.LOGIN_REWARD_POINTS, loginRewardPointEvent, gameProvider, rewardPoints);
                let topupRewardPointListArr = getRewardPointEvent(constRewardPointsTaskCategory.TOPUP_REWARD_POINTS, topupRewardPointEvent, gameProvider, rewardPoints);
                let gameRewardPointListArr = getRewardPointEvent(constRewardPointsTaskCategory.GAME_REWARD_POINTS, gameRewardPointEvent, gameProvider, rewardPoints);
                let rewardPointsRankingListArr = getRewardPointsRanking(rewardPointsRanking);

                returnData = {
                    "loginPointList": loginRewardPointListArr,
                    "rechargePointList": topupRewardPointListArr,
                    "gamePointList": gameRewardPointListArr,
                    "pointRanking": rewardPointsRankingListArr
                }

                return returnData;
            })
    }
};

module.exports = dbRewardPoints;

// If any of the function below is more general than I thought, it might need to move to dbCommon or dbUtility,
// else, it will act as private function of this model


function isRelevantLoginEventByProvider(event, provider, inputDevice, playerLevelData) {
    // if 'OR' flag added in, this part of the code need some adjustment
    let eventTargetDestination = [];

    if (!event.status) {
        return false
    }

    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
        return false;
    }

    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date()) {
        return false;
    }

    if (event.userAgent && event.userAgent !== -1 && Number(event.userAgent) !== Number(inputDevice)) {
        return false;
    }

    // check player level whether achieve reward event level setting
    if (playerLevelData && playerLevelData.playerLevel && event && event.level && (playerLevelData.playerLevel.value < event.level.value)) {
        return false;
    }

    if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {
        eventTargetDestination = event.target.targetDestination;
    }

    return provider ? eventTargetDestination.indexOf(provider.toString()) !== -1 || eventTargetDestination.includes('') : eventTargetDestination.length === 0 || eventTargetDestination.includes('');
}

function isRelevantTopupEvent(event, topupMainType, topupProposalData, playerLevelData) {
    if (!event.status) {
        return false
    }
    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date())
        return false;
    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date())
        return false;
    // check userAgent
    if (event.userAgent && event.userAgent !== -1 && topupProposalData.data.userAgent && Number(event.userAgent) !== Number(topupProposalData.data.userAgent))
        return false;
    // check merchantTopupMainType
    if (event.target && event.target.merchantTopupMainType !== -1 && event.target.merchantTopupMainType &&
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
    // check player level whether achieve reward event level setting
    if (playerLevelData && playerLevelData.playerLevel && event && event.level && (playerLevelData.playerLevel.value < event.level.value)) {
        return false;
    }

    return true;
}

function isRelevantGameEvent(event, consumptionRecord, playerLevelData) {
    if (!event) {
        return false;
    }

    if (!event.status) {
        return false;
    }

    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
        return false;
    }

    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date()) {
        return false;
    }

    if (event.target && event.target.targetDestination && event.target.targetDestination.toString() !== String(consumptionRecord.providerId)) {
        return false;
    }

    if (event.target && event.target.gameType && event.target.gameType.toString() !== String(consumptionRecord.cpGameType)) {
        return false;
    }

    if (event.target && event.target.betType && event.target.betType.length > 0) {
        let relevantBetType = event.target.betType;
        if (!consumptionRecord.betType || relevantBetType.indexOf(consumptionRecord.betType.toString()) < 0) {
            return false;
        }
    }

    // check player level whether achieve reward event level setting
    if (playerLevelData && playerLevelData.playerLevel && event && event.level && (playerLevelData.playerLevel.value < event.level.value)) {
        return false;
    }

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

        if (event.period != 1) {
            if (progress.lastUpdateTime < today.startTime) {
                // add progress count if exceed consecutiveCount when not daily
                progress.count++;
                commonLoginProgressUpdate(progress, provider);
                progressUpdated = true;
            }
        } else {
            if (!progress.isApplicable && progress.lastUpdateTime < today.startTime && progress.count < event.consecutiveCount) {
                // add progress if necessary
                progress.count++;
                commonLoginProgressUpdate(progress, provider);
                progressUpdated = true;
            }
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

    if (!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime) {
        // new progress or expired progress setup
        progress.count = todayTopupAmount >= event.target.dailyTopupAmount ? 1 : 0;
        progress.isApplied = false;
        progress.isApplicable = false;
        progress.lastUpdateTime = new Date();
        progressUpdated = true;
    }
    else {
        let today = dbUtility.getTodaySGTime();
        if (!progress.isApplicable && (progress.lastUpdateTime < today.startTime || progress.count === 0) && progress.count < event.consecutiveCount
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

function buildTodayTopupAmountQuery(event, topupData, isFromUpdate) {
    let today = dbUtility.getTodaySGTime();
    let relevantTopupMatchQuery = {
        playerId: isFromUpdate ? topupData.data.playerObjId : topupData._id,
        platformId: isFromUpdate ? topupData.data.platformId : topupData.platform,
        createTime: {$gte: today.startTime, $lte: today.endTime}
    };

    if(event.userAgent && event.userAgent !== -1)
        relevantTopupMatchQuery.userAgent = event.userAgent.toString();

    if (event.target && event.target.merchantTopupMainType !== -1 && event.target.merchantTopupMainType) {
        relevantTopupMatchQuery.topUpType = event.target.merchantTopupMainType.toString();
        switch (event.target.merchantTopupMainType) {
            case constPlayerTopUpType.MANUAL:
                if(event.target.depositMethod) relevantTopupMatchQuery.depositMethod = event.target.depositMethod.toString();
                if(event.target.bankType) relevantTopupMatchQuery.bankCardType = event.target.bankType.toString();
                break;
            case constPlayerTopUpType.ONLINE:
                if(event.target.merchantTopupType) relevantTopupMatchQuery.merchantTopUpType = event.target.merchantTopupType.toString();
                break;
            case constPlayerTopUpType.ALIPAY:
                break;
            case constPlayerTopUpType.WECHAT:
                break;
            case constPlayerTopUpType.QUICKPAY:
                break;
        }
    } else if(event.target && event.target.merchantTopupMainType === -1) {
        // Accept all topupType, if have select other option still match
        // MANUAL
        let manualTopupOrObj = {topUpType: constPlayerTopUpType.MANUAL.toString()};
        if(event.target.depositMethod) manualTopupOrObj.depositMethod = event.target.depositMethod.toString();
        if(event.target.bankType) manualTopupOrObj.bankCardType = event.target.bankType.toString();
        // ONLINE
        let onlineTopupOrObj = {topUpType: constPlayerTopUpType.ONLINE.toString()};
        if(event.target.merchantTopupType) onlineTopupOrObj.merchantTopUpType = event.target.merchantTopupType.toString();
        // ALIPAY && WECHAT && QUICKPAY
        let otherTopupOrObj = {topUpType: {$in: [constPlayerTopUpType.ALIPAY.toString(), constPlayerTopUpType.WECHAT.toString(), constPlayerTopUpType.QUICKPAY.toString()]}};

        relevantTopupMatchQuery.$or = [manualTopupOrObj, onlineTopupOrObj, otherTopupOrObj];
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
                startTime: event && event.customPeriodStartTime?event.customPeriodStartTime:"",
                endTime: event && event.customPeriodEndTime? event.customPeriodEndTime: ""
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

function getPlayerLevelValue(playerObjId) {
    return dbConfig.collection_players.findOne({
        _id: playerObjId
    },{"playerLevel":1}).populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();
}

function getRewardPointEvent(category, rewardPointEvent, gameProvider, rewardPoints) {
    let rewardPointListArr = [];

    if (rewardPointEvent && rewardPointEvent.length > 0) {
        rewardPointEvent.forEach(reward => {
            let rewardStartTime;
            let rewardEndTime;
            let rewardPeriod;
            let currentGoal = 0;
            let level, levelName;
            let rewards = {};
            let status = 0;
            let providerIds = [];

            if (reward.period) {
                let periodTime = getEventPeriodTime(reward);
                rewardStartTime = periodTime.startTime;
                rewardEndTime = periodTime.endTime;
                rewardPeriod = constRewardPointsEventPeriod[reward.period];
            }

            if (reward.level) {
                level = reward.level.value;
                levelName = reward.level.name;
            }

            if (rewardPoints && rewardPoints.progress && rewardPoints.progress.length > 0) {
                rewardPoints.progress.filter(item => {
                    if (item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() === reward._id.toString()
                        && item.lastUpdateTime >= rewardStartTime && item.lastUpdateTime <= rewardEndTime) {
                        currentGoal = item.count;

                        if (item.isApplied) {
                            status = 2;
                        }
                        else if (item.isApplicable) {
                            status = 1;
                        }
                    }
                });
            }

            switch (category) {
                case constRewardPointsTaskCategory.LOGIN_REWARD_POINTS: {
                    if (reward.target && reward.target.targetDestination && reward.target.targetDestination.length > 0) {
                        reward.target.targetDestination.forEach(item => {
                            if (gameProvider && gameProvider.length > 0) {
                                gameProvider.forEach(gameItem => {
                                    if (item == gameItem._id.toString()) {
                                        providerIds.push(gameItem.providerId);
                                    }
                                });
                            }
                        })
                    }

                    rewards = {
                        "id": reward._id,
                        "refreshPeriod": rewardPeriod,
                        "device": constRewardPointsUserAgent[reward.userAgent ? reward.userAgent.toString() : ""],
                        "title": reward.rewardTitle,
                        "content": reward.rewardContent,
                        "gradeLimit": level,
                        "gradeName": levelName,
                        "point": reward.rewardPoints,
                        "status": status == 0 && (currentGoal >= reward.consecutiveCount) ? 1 : status,
                        "providerId": providerIds,
                        "goal": reward.consecutiveCount,
                        "currentGoal": currentGoal
                    }
                    break;
                }
                case constRewardPointsTaskCategory.TOPUP_REWARD_POINTS: {
                    rewards = {
                        "id": reward._id,
                        "refreshPeriod": rewardPeriod,
                        "device": constRewardPointsTopupEventUserAgent[reward.userAgent ? reward.userAgent.toString() : ""],
                        "depositType": reward.target && reward.target.merchantTopupMainType ? constRewardPointsEventTopupType[reward.target.merchantTopupMainType] : "",
                        "onlineTopupType": reward.target && reward.target.merchantTopupType ? reward.target.merchantTopupType : "",
                        "manualTopupType": reward.target && reward.target.depositMethod ? reward.target.depositMethod : "",
                        "bankCardType": reward.target && reward.target.bankType ? reward.target.bankType : "",
                        "dailyRequestDeposit": reward.target && reward.target.dailyTopupAmount ? reward.target.dailyTopupAmount : 0,
                        "title": reward.rewardTitle,
                        "content": reward.rewardContent,
                        "gradeLimit": level,
                        "gradeName": levelName,
                        "point": reward.rewardPoints,
                        "status": status == 0 && (currentGoal >= reward.consecutiveCount) ? 1 : status,
                        "goal": reward.consecutiveCount,
                        "currentGoal": currentGoal
                    }
                    break;
                }
                case constRewardPointsTaskCategory.GAME_REWARD_POINTS: {
                    let dailyRequestBetCountsAndAmount = [];
                    if (reward.target && reward.target.targetDestination) {
                        if (gameProvider && gameProvider.length > 0) {
                            gameProvider.forEach(gameItem => {
                                if (reward.target.targetDestination == gameItem._id.toString()) {
                                    providerIds.push(gameItem.providerId);
                                }
                            });
                        }
                    }

                    if (reward.target && (reward.target.dailyConsumptionCount || reward.target.singleConsumptionAmount)) {
                        dailyRequestBetCountsAndAmount.push(reward.target.dailyConsumptionCount ? reward.target.dailyConsumptionCount : 0);
                        dailyRequestBetCountsAndAmount.push(reward.target.singleConsumptionAmount ? reward.target.singleConsumptionAmount : 0);
                    }

                    rewards = {
                        "id": reward._id,
                        "refreshPeriod": rewardPeriod,
                        "device": constRewardPointsUserAgent[reward.userAgent ? reward.userAgent.toString() : ""],
                        "gameType": reward.target && reward.target.gameType ? reward.target.gameType : "",
                        "betDetail": reward.target && reward.target.betType ? reward.target.betType : "",
                        "title": reward.rewardTitle,
                        "content": reward.rewardContent,
                        "gradeLimit": level,
                        "gradeName": levelName,
                        "point": reward.rewardPoints,
                        "status": status == 0 && (currentGoal >= reward.consecutiveCount) ? 1 : status,
                        "dailyRequestBetCountsAndAmount": dailyRequestBetCountsAndAmount,
                        "dailyBetConsumption": reward.target && reward.target.dailyValidConsumptionAmount ? reward.target.dailyValidConsumptionAmount : 0,
                        "dailyWinBetCounts": reward.target && reward.target.dailyWinGameCount ? reward.target.dailyWinGameCount : 0,
                        "providerId": providerIds,
                        "goal": reward.consecutiveCount,
                        "currentGoal": currentGoal
                    }
                    break;
                }
            }
            rewardPointListArr.push(rewards);
        });
    }

    return rewardPointListArr;
}

function getRewardPointsRanking(rewardPoints) {
    let rewardPointsRankingListArr = [];

    if(rewardPoints && rewardPoints.length > 0) {
        rewardPoints.forEach(rank => {
            //censor playerName start
            let censoredName, front, censor = "***", rear, level = "";
            front = rank.playerName.substr(0,2);    // extract first char
            rear = rank.playerName.substr(5);       // extract all AFTER the 5th char (exclusive of the 5th, inclusive of the 6th)
            censoredName = front + censor + rear;   // concat all
            censoredName = censoredName.substr(0, rank.playerName.length); // extract original playerName's length, to maintain actual length
            rank.playerName = censoredName;
            //censor playerName end
            if(rank.playerLevel && rank.playerLevel.name) {
                level = rank.playerLevel.name;
            }
            let ranks = {
                "account": rank.playerName,
                "grade": level,
                "totalPoint": rank.points
            }
            rewardPointsRankingListArr.push(ranks);
        });
    }

    return rewardPointsRankingListArr;
}
