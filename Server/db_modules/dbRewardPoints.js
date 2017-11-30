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

                for (let i = 0; i < relevantEvents.length; i++) {
                    let event = relevantEvents[i];
                    eventProgress = getEventProgress(rewardProgressList, event);
                    updateLoginProgressCount(eventProgress, event, provider);
                }

                if (rewardPointsConfig && rewardPointsConfig.applyMethod == 2) {
                    // send to apply
                }

            }
        )
    }
};

module.exports = dbRewardPoints;

function isRelevantLoginEventByProvider(event, provider) {
    // if 'OR' flag added in, this part of the code need some adjustment
    let eventTargetDestination = [];

    // customPeriodEndTime check
    if (event.customPeriodEndTime && new Date(event.customPeriodEndTime) < new Date()) {
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

    let eventPeriodStartTime = getEventPeriodStartTime(event);

    if (!progress.lastUpdateTime || eventPeriodStartTime && progress.lastUpdateTime < eventPeriodStartTime) {
        // new progress or expired progress setup
        progress.count = 1;
        progress.isApplied = false;
        progress.isApplicable = false;
        commonLoginProgressUpdate(progress, provider);
    }
    else {
        let today = dbUtility.getTodaySGTime();
        if (!progress.isApplicable && progress.lastUpdateTime < today.startTime && progress.count < event.consecutiveNumber) {
            // add progress if necessary
            progress.count++;
            commonLoginProgressUpdate(progress, provider);
        }
        // do nothing otherwise
    }

    if (progress.count >= event.consecutiveNumber) {
        progress.isApplicable = true;
    }
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