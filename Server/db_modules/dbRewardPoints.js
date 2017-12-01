let dbConfig = require('./../modules/dbproperties');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;
let dbRewardPointsLvlConfig = require('./../db_modules/dbRewardPointsLvlConfig');
let dbRewardPointsEvent = require('./../db_modules/dbRewardPointsEvent');
let dbUtility = require('./../modules/dbutility');
const constRewardPointsTaskCategory = require ('../const/constRewardPointsTaskCategory');

let dbRewardPoints = {

    getPlayerRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        return dbConfig.collection_rewardPoints.findOne({playerObjId}).lean().then(
            rewardPointsData => {
                if (!rewardPointsData) {
                    return createRewardPoints(playerObjId, playerData);
                }
                else if (playerData && rewardPointsData.playerLevel.toString() !== playerData.playerLevel.toString()) {
                    return updateRewardPointsPlayerLevel(rewardPointsData._id, playerObjId);
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

    updateLoginRewardPointProgress: (playerData, provider) => {
        let relevantEvents = [];

        let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategory(playerData.platform, constRewardPointsTaskCategory.LOGIN_REWARD_POINTS);
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerData._id, playerData);
        let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(playerData.platform);

        return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm]).then(
            data => {
                let events = data[0];
                let playerRewardPoints = data[1];
                let rewardPointsConfig = data[2];

                relevantEvents = events.filter(event => isRelevantLoginEventByProvider(event, provider));

                if (!relevantEvents || relevantEvents.length < 1) {
                    return Promise.reject({
                        name: "DataError",
                        message: "No relevant valid event."
                    });
                }

                let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];

                let rewardProgressListChanged = false;
                for (let i = 0; i < relevantEvents.length; i++) {
                    let event = relevantEvents[i];
                    eventProgress = getEventProgress(rewardProgressList, event);
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
                if (rewardPointsConfig && rewardPointsConfig.applyMethod == 2) {
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
                            dbRewardPoints.applyRewardPoint(playerData._id, rewardPointToApply, eventData, playerRewardPoints).catch(err =>{
                                console.error(err);
                            });
                        }
                    }
                }

                return playerRewardPoints;
            }
        )
    },

    applyRewardPoint: (playerObjId, rewardPointsEventObjId, eventData, playerRewardPoints, rewardPointsConfig) => {
        // eventData and playerRewardPoints are optional parameter
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerObjId);
        let getRewardPointEventProm = dbConfig.collection_rewardPointsEvent.findOne({_id: rewardPointsEventObjId}).lean();

        if (eventData) {
            getRewardPointEventProm = Promise.resolve(eventData);
        }

        if (playerRewardPoints) {
            getRewardPointsProm = Promise.resolve(playerRewardPoints);
        }

        let pointEvent, rewardPoints, progress;

        return Promise.all([getRewardPointsProm, getRewardPointEventProm]).then(
            data => {
                rewardPoints = data[0];
                pointEvent = data[1];
                let progressList = [];

                if (!pointEvent) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event not found."
                    });
                }

                if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event already expired."
                    });
                }

                if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date()) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event is not started."
                    });
                }

                if (rewardPoints && rewardPoints.progress) {
                    progressList = rewardPoints.progress;
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

                // todo :: TBC



            }

        )

    }
};

module.exports = dbRewardPoints;

// If any of the function below is more general than I thought, it might need to move to dbCommon or dbUtility,
// else, it will act as private function of this model


function isRelevantLoginEventByProvider(event, provider) {
    // if 'OR' flag added in, this part of the code need some adjustment
    let eventTargetDestination = [];

    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
        return false;
    }

    if (event.customPeriodStartTime && new Date(event.customPeriodStartTime) > new Date()) {
        return false;
    }

    if(event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {
        eventTargetDestination = event.target.targetDestination;
    }

    return provider ? eventTargetDestination.indexOf(provider) !== -1 : eventTargetDestination.length === 0;
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
        if (!progress.isApplicable && progress.lastUpdateTime < today.startTime && progress.count < event.consecutiveNumber) {
            // add progress if necessary
            progress.count++;
            commonLoginProgressUpdate(progress, provider);
            progressUpdated = true;
        }
        // do nothing otherwise
    }

    if (progress.count >= event.consecutiveNumber) {
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

function commonLoginProgressUpdate(progress, provider) {
    progress.lastUpdateTime = new Date();
    if (provider) {
        progress.targetDestination = provider;
    }
}
