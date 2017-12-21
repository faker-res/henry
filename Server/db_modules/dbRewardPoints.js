let dbConfig = require('./../modules/dbproperties');
let dbRewardPointsLvlConfig = require('./../db_modules/dbRewardPointsLvlConfig');
let dbRewardPointsEvent = require('./../db_modules/dbRewardPointsEvent');
let dbUtility = require('./../modules/dbutility');
let errorUtils = require('./../modules/errorUtils');
const constRewardPointsTaskCategory = require('../const/constRewardPointsTaskCategory');
const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');

let dbRewardPoints = {

    getPlayerRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        return dbConfig.collection_rewardPoints.findOne({playerObjId}).lean().then(
            rewardPointsData => {
                if (!rewardPointsData) {
                    return dbRewardPoints.createRewardPoints(playerObjId, playerData);
                }
                else if (playerData && rewardPointsData.playerLevel.toString() !== playerData.playerLevel.toString()) {
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
            playerDataProm = dbConfig.collection_players.findOne({_id: playerObjId}, {platform: 1, name: 1, playerLevel: 1}).lean();
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

                if (dailyMaxPoints-todayApplied < pointEvent.rewardPoints) {
                    pointIncreased = dailyMaxPoints-todayApplied;
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
                let updatePointsProm = dbConfig.collection_rewardPoints.findOneAndUpdate({_id: rewardPoints._id}, {$inc:{points: pointIncreased}}, {new: true}).lean();



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

                return updatePointProgress;
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
                        }
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
                                    if (returnData[i]._id && item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() == returnData[i]._id.toString()
                                        && item.lastUpdateTime >= returnData[i].startTime && item.lastUpdateTime <= returnData[i].endTime) {
                                        delete item.lastUpdateTime;
                                        delete item.rewardPointsEventObjId;
                                        returnData[i].progress = item;
                                        return item;
                                    }
                                }
                            });
                        }
                        returnData.map(item => {
                            delete item._id;
                            delete item.__v;
                            delete item.platformObjId;
                            delete item.category;
                            delete item.customPeriodStartTime;
                            delete item.customPeriodEndTime;
                            return item;
                        });
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
                        }
                        returnData = rewardPointsEvent;
                        for (let i = 0; i < returnData.length; i++) {
                            returnData[i].progress = noProgress;
                            if (returnData[i].period) {
                                let periodTime = getEventPeriodTime(returnData[i]);
                                returnData[i].startTime = periodTime.startTime;
                                returnData[i].endTime = periodTime.endTime;
                            }
                        }
                        returnData.map(item => {
                            delete item._id;
                            delete item.__v;
                            delete item.platformObjId;
                            delete item.category;
                            delete item.customPeriodStartTime;
                            delete item.customPeriodEndTime;
                            return item;
                        });
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

    if(event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {
        eventTargetDestination = event.target.targetDestination;
    }

    return provider ? eventTargetDestination.indexOf(provider.toString()) !== -1 : eventTargetDestination.length === 0;
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

function updateLoginProgressCount (progress, event, provider) {
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


function getEventPeriodStartTime(event) {
    if (!event || !event.period) {
        return false;
    }
    switch(Number(event.period)) {
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
        category: {$in: [
            constRewardPointsLogCategory.LOGIN_REWARD_POINTS,
            constRewardPointsLogCategory.TOPUP_REWARD_POINTS,
            constRewardPointsLogCategory.GAME_REWARD_POINTS
        ]},
        createTime: {$gte: new Date(todayStartTime)}
    }).sort({createTime: -1}).limit(1).lean();
}