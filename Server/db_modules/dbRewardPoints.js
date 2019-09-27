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
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerUtil = require('./../db_common/dbPlayerUtility');

let dbRewardPoints = {

    getPlayerRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        return dbConfig.collection_rewardPoints.findOne({playerObjId}).lean().then(
            rewardPointsData => {
                if (!rewardPointsData) {
                    return dbRewardPoints.createRewardPoints(playerObjId, playerData);
                }
                else if (playerData && playerData.playerLevel && rewardPointsData.playerLevel && rewardPointsData.playerLevel.toString() !== (playerData.playerLevel._id || playerData.playerLevel).toString()) {
                    return dbRewardPoints.updateRewardPointsPlayerLevel(rewardPointsData._id, (playerData.playerLevel._id || playerData.playerLevel));
                }
                else if (playerData && String(playerData.rewardPointsObjId) != String(rewardPointsData._id)) {
                    dbRewardPoints.updatePlayerRewardPointObjectId(playerObjId, playerData.platform, rewardPointsData._id).catch(errorUtils.reportError);
                }
                else if (playerData && playerData.playerLevel && !rewardPointsData.playerLevel) {
                    return dbRewardPoints.updateRewardPointsPlayerLevel(rewardPointsData._id, (playerData.playerLevel._id || playerData.playerLevel));
                }

                return rewardPointsData;
            }
        );
    },

    updateRewardPointsPlayerLevel: (rewardPointsObjId, playerLevelObjId) => {
        return dbConfig.collection_rewardPoints.findOneAndUpdate({_id: rewardPointsObjId}, {playerLevel: playerLevelObjId}, {new: true}).lean();
    },

    deductPointManually: (playerObjId, updateAmount, remark, userDevice) => {
        let playerInfo;
        return dbConfig.collection_players.findOne({_id: ObjectId(playerObjId)}).lean().then(
            playerData => {
                if (playerData) {
                    playerInfo = playerData;
                    return dbPlayerUtil.setPlayerBState(playerInfo._id, "deductRewardPoint", true);
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        ).then(
            playerBState => {
                if (playerBState) {
                    return dbPlayerInfo.updatePlayerRewardPointsRecord(playerObjId, playerInfo.platform, updateAmount, remark, null, null, playerInfo.name, userDevice);
                } else {
                    return Promise.reject({
                        name: "DBError",
                        status: constServerCode.CONCURRENT_DETECTED,
                        message: "Deduct rewardPoints Fail, please try again later"
                    })
                }
            }
        ).then(
            data => {
                // Reset BState
                dbPlayerUtil.setPlayerBState(playerInfo._id, "deductRewardPoint", false).catch(errorUtils.reportError);
                return data;
            }
        ).catch(
            err => {
                if (err.status === constServerCode.CONCURRENT_DETECTED) {
                    // Ignore concurrent request for now
                } else {
                    // Set BState back to false
                    dbPlayerUtil.setPlayerBState(playerInfo._id, "deductRewardPoint", false).catch(errorUtils.reportError);
                }

                console.log('Deduct rewardPoint error', playerInfo.playerId, err);
                throw err;
            }
        );
    },

    createRewardPoints: (playerObjId, playerData) => {
        // playerData is an optional parameter
        let playerDataProm = Promise.resolve(playerData);
        let player;

        if (!playerData) {
            playerDataProm = dbConfig.collection_players.findOne({_id: playerObjId}, {
                platform: 1,
                name: 1,
                playerLevel: 1
            }).lean();
        }

        return playerDataProm.then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Invalid player."
                    });
                }

                player = playerData;

                let newRewardPointsData = {
                    platformObjId: player.platform,
                    playerObjId: playerObjId,
                    playerName: player.name,
                    playerLevel: player.playerLevel
                };

                let newRewardPoints = new dbConfig.collection_rewardPoints(newRewardPointsData);
                return newRewardPoints.save();
            }
        ).then(
            newRewardPoints => {
                if (newRewardPoints && newRewardPoints._id) {
                    dbRewardPoints.updatePlayerRewardPointObjectId(player._id, player.platform, newRewardPoints._id).catch(errorUtils.reportError);
                }
                return newRewardPoints;
            }
        );
    },

    updatePlayerRewardPointObjectId: (playerObjId, platformObjId, rewardPointObjectId) => {
        return dbConfig.collection_players.findOneAndUpdate({_id: playerObjId, platform: platformObjId}, {rewardPointsObjId: rewardPointObjectId}, {new: true}).lean();
    },

    updateLoginRewardPointProgress: (playerData, provider, inputDevice) => {
        let relevantEvents = [];
        let rewardPointsConfig;
        let playerRewardPoints;

        let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategoryWithPopulatePlayerLevel(playerData.platform, constRewardPointsTaskCategory.LOGIN_REWARD_POINTS);
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerData._id, playerData);
        let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(playerData.platform);
        let getplayerLevelProm = getPlayerLevelValue(playerData._id);

        return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm, getplayerLevelProm]).then(
            data => {
                let events = data[0];
                playerRewardPoints = data[1];
                rewardPointsConfig = data[2];
                let playerLevelData = data[3];

                relevantEvents = events.filter(event => isRelevantLoginEventByProvider(event, provider, inputDevice, playerLevelData, playerData));

                if (!relevantEvents || relevantEvents.length < 1) {
                    // return Promise.reject({
                    //     name: "DataError",
                    //     message: "No relevant valid event."
                    // });
                    relevantEvents = [];
                }

                // let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];
                let rewardProgressProm = [];
                if (relevantEvents.length) {
                    relevantEvents.forEach(relevantData => {
                        if (relevantData._id) {
                            let eventPeriodStartTime = getEventPeriodStartTime(relevantData);
                            let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                rewardPointsObjId: playerRewardPoints._id,
                                rewardPointsEventObjId: relevantData._id,
                                createTime: {$gte: eventPeriodStartTime}
                            }).lean();
                            rewardProgressProm.push(rewardProm);
                        }
                    });
                }

                return Promise.all(rewardProgressProm).then(
                    progressData => {
                        let rewardProgressList = progressData && progressData.length ? progressData : [];
                        let updateRewardArr = [];
                        for (let j = rewardProgressList.length - 1; j >= 0; j--) {
                            if (!rewardProgressList[j]) {
                                rewardProgressList.splice(j,1);
                            }
                        }

                        // let rewardProgressListChanged = false;

                        for (let i = 0; i < relevantEvents.length; i++) {
                            let event = relevantEvents[i];
                            let eventProgress = getEventProgress(rewardProgressList, event);
                            eventProgress.rewardPointsObjId = playerRewardPoints._id;
                            let progressChanged = updateLoginProgressCount(eventProgress, event, provider);
                            // rewardProgressListChanged = rewardProgressListChanged || progressChanged;
                            if (progressChanged) {
                                let updateRewardProm;
                                if (eventProgress._id) {
                                    let objId = eventProgress._id;
                                    delete eventProgress._id;
                                    delete eventProgress.createTime;

                                    updateRewardProm = dbConfig.collection_rewardPointsProgress.findOneAndUpdate({
                                        _id: ObjectId(objId)
                                    },
                                        eventProgress
                                    , {new: true}).lean();
                                } else {
                                    updateRewardProm = dbConfig.collection_rewardPointsProgress(eventProgress).save();
                                }
                                updateRewardArr.push(updateRewardProm);
                            } else {
                                updateRewardArr.push(Promise.resolve(eventProgress));
                            }
                        }
                        return Promise.all(updateRewardArr);
                    });

                // if (rewardProgressListChanged) {
                //     return dbConfig.collection_rewardPoints.findOneAndUpdate({
                //         platformObjId: playerRewardPoints.platformObjId,
                //         playerObjId: playerRewardPoints.playerObjId
                //     }, {
                //         progress: rewardProgressList
                //     }, {new: true}).lean();
                // }
                // else {
                //     return Promise.resolve(playerRewardPoints);
                // }
            }
        ).then(
            playerRewardPointsData => {
                playerRewardPoints.progress = [];
                if (rewardPointsConfig && Number(rewardPointsConfig.applyMethod) === 2) {
                    let promResolve = Promise.resolve();
                    // send to apply
                    let rewardProgressList = playerRewardPointsData && playerRewardPointsData.length ? playerRewardPointsData : [];
                    for (let i = 0; i < rewardProgressList.length; i++) {
                        if (rewardProgressList[i]) {
                            playerRewardPoints.progress.push(rewardProgressList[i]);
                        }
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
                    let playerRewardPoints

                    let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategoryWithPopulatePlayerLevel(topupProposalData.data.platformId, constRewardPointsTaskCategory.TOPUP_REWARD_POINTS);
                    let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(topupProposalData.data.playerObjId);
                    let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(topupProposalData.data.platformId);
                    let getplayerLevelProm = getPlayerLevelValue(topupProposalData.data.playerObjId);

                    return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getRewardPointsLvlConfigProm, getplayerLevelProm]).then(
                        data => {
                            let events = data[0];
                            playerRewardPoints = data[1];
                            rewardPointsConfig = data[2];
                            let playerLevelData = data[3];

                            // Get relevent reward point events
                            relevantEvents = events.filter(event => isRelevantTopupEvent(event, topupMainType, topupProposalData, playerLevelData));
                            if (!relevantEvents || relevantEvents.length < 1) {
                                relevantEvents = [];
                            }

                            // let rewardProgressList = playerRewardPoints && playerRewardPoints.progress ? playerRewardPoints.progress : [];
                            let rewardProgressProm = [];
                            if (relevantEvents.length) {
                                relevantEvents.forEach(relevantData => {
                                    if (relevantData._id) {
                                        let eventPeriodStartTime = getEventPeriodStartTime(relevantData);
                                        let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                            rewardPointsObjId: playerRewardPoints._id,
                                            rewardPointsEventObjId: relevantData._id,
                                            createTime: {$gte: eventPeriodStartTime}
                                        }).lean();
                                        rewardProgressProm.push(rewardProm);
                                    }
                                });
                            }

                            return Promise.all(rewardProgressProm).then(
                                progressData => {
                                    let rewardProgressList = progressData && progressData.length ? progressData : [];
                                    for (let j = rewardProgressList.length - 1; j >= 0; j--) {
                                        if (!rewardProgressList[j]) {
                                            rewardProgressList.splice(j, 1);
                                        }
                                    }

                                    // let rewardProgressListChanged = false;
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
                                                eventProgress.rewardPointsObjId = playerRewardPoints._id;
                                                let progressChanged = updateTopupProgressCount(eventProgress, event, periodTopupAmount);
                                                // rewardProgressListChanged = rewardProgressListChanged || progressChanged;
                                                if (progressChanged) {
                                                    if (eventProgress._id) {
                                                        let objId = eventProgress._id;
                                                        delete eventProgress._id;
                                                        delete eventProgress.createTime;

                                                        return dbConfig.collection_rewardPointsProgress.findOneAndUpdate({
                                                                _id: ObjectId(objId)
                                                            },
                                                            eventProgress
                                                            , {new: true}).lean();
                                                    } else {
                                                        return dbConfig.collection_rewardPointsProgress(eventProgress).save();
                                                    }
                                                } else {
                                                    return Promise.resolve(eventProgress);
                                                }
                                            }
                                        ));
                                    }
                                    return Q.all(prom)
                                });

                        }
                    ).then(
                        playerRewardPointsData => {
                            playerRewardPoints.progress = [];
                            if (rewardPointsConfig && Number(rewardPointsConfig.applyMethod) === 2) {
                                let promResolve = Promise.resolve();
                                // send to apply
                                let rewardProgressList = playerRewardPointsData && playerRewardPointsData.length ? playerRewardPointsData : [];
                                for (let i = 0; i < rewardProgressList.length; i++) {
                                    if (rewardProgressList[i]) {
                                        playerRewardPoints.progress.push(rewardProgressList[i]);
                                    }
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
        let playerRewardPoints;
        let events = [];
        let playerLevelData = {};
        let gameProviders = [];
        let specialCaseProviderObjIds = [];


        return dbConfig.collection_platform.findOne({_id: consumptionRecord.platformId}).lean().then(
            platformData => {
                platform = platformData;

                if (!platform.usePointSystem) {
                    return Promise.resolve();
                }

                return dbRewardPointsLvlConfig.getRewardPointsLvlConfig(platform._id);
            }
        ).then(
            configData => {
                rewardPointsConfig = configData;

                if (!rewardPointsConfig || Number(rewardPointsConfig.applyMethod) !== 2) {
                    return Promise.resolve();
                }

                let getRewardPointEventsProm = dbRewardPointsEvent.getRewardPointsEventByCategoryWithPopulatePlayerLevel(platform._id, constRewardPointsTaskCategory.GAME_REWARD_POINTS);
                let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(consumptionRecord.playerId);
                let getPlayerLevelProm = getPlayerLevelValue(consumptionRecord.playerId);
                let getGameProvidersProm = dbGameProvider.getGameProviders({_id: {$in: platform.gameProviders}});
                let specialCaseProviderProms = getSpecialCaseProviderObjIds();

                return Promise.all([getRewardPointEventsProm, getRewardPointsProm, getPlayerLevelProm, getGameProvidersProm, specialCaseProviderProms]);
            }
        ).then(
            data => {
                if (!data) {
                    return Promise.resolve();
                }

                events = data[0];
                playerRewardPoints = data[1];
                playerLevelData = data[2];
                gameProviders = data[3];
                specialCaseProviderObjIds = data[4] || specialCaseProviderObjIds;

                relevantEvents = events.filter(event => isRelevantGameEvent(event, consumptionRecord, playerLevelData, specialCaseProviderObjIds));

                relevantEvents.map(event => {
                    dbRewardPoints.applyRewardPoint(consumptionRecord.playerId, event._id, 0).catch(errorUtils.reportError);
                });

                return Promise.resolve();

        //                             updateRewardProm = dbConfig.collection_rewardPointsProgress.findOneAndUpdate({
        //                                     _id: ObjectId(objId)
        //                                 },
        //                                 eventProgress
        //                                 , {new: true}).lean();
        //                         } else {
        //                             updateRewardProm = dbConfig.collection_rewardPointsProgress(eventProgress).save();
        //                         }
        //                         updateRewardArr.push(updateRewardProm);
        //                     } else {
        //                         updateRewardArr.push(Promise.resolve(eventProgress));
        //                     }
        //                 }
        //                 return Promise.all(updateRewardArr);
        //                 // if (rewardProgressListChanged) {
        //                 //     return dbConfig.collection_rewardPoints.findOneAndUpdate({
        //                 //         platformObjId: playerRewardPoints.platformObjId,
        //                 //         playerObjId: playerRewardPoints.playerObjId
        //                 //     }, {
        //                 //         progress: rewardProgressList
        //                 //     }, {new: true}).lean();
        //                 // }
        //                 // else {
        //                 //     return Promise.resolve(playerRewardPoints);
        //                 // }
        //             });
        //     }
        // ).then(
        //     playerRewardPointsData => {
        //         if (playerRewardPoints) {
        //             playerRewardPoints.progress = [];
        //         }
        //         if (rewardPointsConfig && Number(rewardPointsConfig.applyMethod) === 2) {
        //             let promResolve = Promise.resolve();
        //             // send to apply
        //             let rewardProgressList = playerRewardPointsData && playerRewardPointsData.length ? playerRewardPointsData : [];
        //             for (let i = 0; i < rewardProgressList.length; i++) {
        //                 if (rewardProgressList[i]) {
        //                     playerRewardPoints.progress.push(rewardProgressList[i]);
        //                 }
        //                 if (rewardProgressList[i].isApplicable && !rewardProgressList[i].isApplied) {
        //                     let eventData;
        //                     let rewardPointToApply = rewardProgressList[i].rewardPointsEventObjId || "";
        //                     for (let j = 0; j < relevantEvents.length; j++) {
        //                         if (relevantEvents[j]._id.toString() === rewardPointToApply.toString()) {
        //                             eventData = relevantEvents[j];
        //                         }
        //                     }
        //                     let applyRewardProm = function () {
        //                         return dbRewardPoints.applyRewardPoint(consumptionRecord.playerId, rewardPointToApply, 0) // user agent will update when data receive from provider updated
        //                             .catch(errorUtils.reportError);
        //
        //                     };
        //                     promResolve = promResolve.then(applyRewardProm);
        //                 }
        //             }
        //         }
        //         return playerRewardPoints;
            }
        )
    },

    applyRewardPoint: (playerObjId, rewardPointsEventObjId, inputDevice, rewardPointsConfig) => {
        let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(playerObjId);
        let getRewardPointEventProm = dbConfig.collection_rewardPointsEvent.findOne({_id: rewardPointsEventObjId}).lean();
        let getPlayerLevelProm = dbConfig.collection_players.findOne({_id: playerObjId})
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel, select: 'name'}).lean();

        let pointEvent, rewardPoints, progress, currentPlayerLevelName;

        return dbPlayerUtil.setPlayerBState(playerObjId, 'applyRewardPoint', true).then(
            playerState => {
                if (playerState) {
                    return Promise.all([getRewardPointsProm, getRewardPointEventProm, getPlayerLevelProm])
                } else {
                    return Promise.reject({
                        name: "DBError",
                        status: constServerCode.CONCURRENT_DETECTED,
                        message: "Apply Reward Fail, please try again later"
                    })
                }
            }
        ).then(
            data => {
                // let eventPeriodStartTime = getEventPeriodStartTime(relevantData);
                // relevantEvents = events.filter(event => isRelevantLoginEventByProvider(event, provider, inputDevice, playerLevelData));
                if (!data) {
                    data = [{}, {}, {}];
                }

                rewardPoints = data[0];
                pointEvent = data[1];
                currentPlayerLevelName = data[2] && data[2].playerLevel && data[2].playerLevel.name ? data[2].playerLevel.name : '';
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

                if(data[2] && data[2].forbidRewardPointsEvent && data[2].forbidRewardPointsEvent.length && pointEvent && pointEvent._id && data[2].forbidRewardPointsEvent.map(p => {return p.toString()}).includes(pointEvent._id.toString())){
                    return Promise.reject({
                        name: "DataError",
                        message: "Reward point event is forbidden."
                    });
                }

                if (!rewardPoints._id) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Invalid reward point."
                    });
                }

                let eventPeriodStartTime = getEventPeriodStartTime(pointEvent);

                let isPlayerApplicableProm;

                if (pointEvent.category === constRewardPointsTaskCategory.GAME_REWARD_POINTS) {
                    isPlayerApplicableProm = checkGameRewardPointDetail(playerObjId, pointEvent._id).then(detail => {
                        if (!detail.status || detail.status == 0) {
                            return Promise.reject({
                                name: "DataError",
                                message: "Not applicable for reward point."
                            });
                        }

                        if (detail.status == 2) {
                            return Promise.reject({
                                name: "DataError",
                                message: localization.localization.translate("Player already applied for the reward point.")
                            });
                        }

                        return detail;
                    });
                }
                else {
                    isPlayerApplicableProm = dbConfig.collection_rewardPointsProgress.findOne({
                        rewardPointsObjId: rewardPoints._id,
                        rewardPointsEventObjId: pointEvent._id,
                        createTime: {$gte: eventPeriodStartTime}
                    }).lean().then(pointsProgressData => {
                        if (pointsProgressData) {
                            progressList.push(pointsProgressData);
                        } else {
                            return Promise.reject({
                                name: "DataError",
                                message: "Invalid reward point progress."
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

                        if (progress.lastUpdateTime < eventPeriodStartTime) {
                            // the progress is inherited from last period
                            return Promise.reject({
                                name: "DataError",
                                message: "Not applicable for reward point."
                            });
                        }

                        return progress;
                    });
                }

                return isPlayerApplicableProm;
            }
        ).then(
            () => {
                let getLastRewardPointLogProm = getTodayLastRewardPointEventLog(rewardPoints._id, currentPlayerLevelName);

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
                    rewardPointsEventObjId: pointEvent._id,
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
                    rewardTarget: pointEvent.target,
                    platformId: pointEvent.platformObjId
                };

                let logDetailProm = Promise.resolve(logDetail);

                // update player point value
                let updatePointsProm = dbConfig.collection_rewardPoints.findOneAndUpdate({_id: rewardPoints._id}, {$inc: {points: pointIncreased}}, {new: true}).lean();

                let setEventAsAppliedProm = Promise.resolve(true);
                if (progress) {
                    setEventAsAppliedProm = dbConfig.collection_rewardPointsProgress.findOneAndUpdate(
                        {_id: ObjectId(progress._id)},
                        {isApplied: true},
                        {new: true}
                    ).lean();
                }

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

                return Promise.all([
                    dbRewardPoints.createRewardPointsLog(logDetail).catch(errorUtils.reportError),
                    // Reset BState
                    dbPlayerUtil.setPlayerBState(playerObjId, 'applyRewardPoint', false).catch(errorUtils.reportError)
                ]).then(() => logDetail);
            }
        ).catch(
            err => {
                if (err.status === constServerCode.CONCURRENT_DETECTED) {
                    // Ignore concurrent request for now
                } else {
                    // Set BState back to false
                    dbPlayerUtil.setPlayerBState(playerObjId, "applyRewardPoint", false).catch(errorUtils.reportError);
                }

                throw err;
            }
        );
    },

    applyRewardPoints: (playerObjId, rewardPointsEventObjIds, inputDevice, rewardPointsConfig) => {
        if(rewardPointsEventObjIds && rewardPointsEventObjIds.length > 0){
            let p = Promise.resolve();
            rewardPointsEventObjIds.forEach(
                rewardPointsEventObjId => {
                    p = p.then(() => dbRewardPoints.applyRewardPoint(playerObjId, rewardPointsEventObjId, inputDevice, rewardPointsConfig));
                }
            );
            return p;
        }
        else{
            return Promise.reject(false)
        }
    },

    getLoginRewardPoints: function (playerId, platformId) {
        let playerObj;
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
                        playerObj = playerData;
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

                                        if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {

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
                                        if (event.target) {
                                            event.target.targetDestination = providerName;
                                        }
                                        if (event.level && (event.level.value || event.level.value === 0)){
                                            event.level = event.level.value;
                                        }
                                    
                                    });

                                    let noProgress = {
                                        isApplicable: false,
                                        isApplied: false,
                                        count: 0
                                    };

                                    let rewardProgressProm = [];
                                    returnData = rewardPointsEvent;
                                    for (let i = 0; i < returnData.length; i++) {
                                        returnData[i].progress = noProgress;
                                        if (returnData[i].period) {
                                            let periodTime = getEventPeriodTime(returnData[i]);
                                            returnData[i].startTime = periodTime.startTime;
                                            returnData[i].endTime = periodTime.endTime;
                                        }
                                        let eventPeriodStartTime = getEventPeriodStartTime(returnData[i]);
                                        let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                            rewardPointsObjId: playerObj.rewardPointsObjId,
                                            rewardPointsEventObjId: returnData[i]._id,
                                            createTime: {$gte: eventPeriodStartTime}
                                        }).lean();
                                        rewardProgressProm.push(rewardProm);
                                    }

                                    return Promise.all(rewardProgressProm);
                                    // return dbConfig.collection_rewardPoints.findOne({playerObjId: playerObjId}).lean();
                                }
                            })
                }
            ).then(
                rewardPointsProgressData => {
                    if (rewardPointsProgressData) {
                        if (rewardPointsProgressData.length > 0) {
                            rewardPointsProgressData.filter(item => {
                                for (let i = 0; i < returnData.length; i++) {
                                    if (returnData[i]._id && item && item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() === returnData[i]._id.toString()
                                        && item.lastUpdateTime >= returnData[i].startTime && item.lastUpdateTime <= returnData[i].endTime) {
                                        delete item.lastUpdateTime;
                                        delete item.rewardPointsEventObjId;
                                        delete item._id;
                                        delete item.rewardPointsObjId;
                                        delete item.createTime;
                                        delete item.__v;
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
                                    if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {

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
                                    if (event.target) {
                                        event.target.targetDestination = providerName;
                                    }
                                    if (event.level && (event.level.value || event.level.value === 0)){
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
        let playerObj;
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
                        playerObj = playerData;
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

                                    if (event && event.target && event.target.targetDestination) {
                                        let item = event.target.targetDestination;
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
                                    }
                                    if (event.target) {
                                        event.target.targetDestination = providerName;
                                    }
                                    if (event.level && (event.level.value || event.level.value === 0)){
                                        event.level = event.level.value;
                                    }
                                });

                                let rewardProgressProm = [];
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
                                    let eventPeriodStartTime = getEventPeriodStartTime(returnData[i]);
                                    let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                        rewardPointsObjId: playerObj.rewardPointsObjId,
                                        rewardPointsEventObjId: returnData[i]._id,
                                        createTime: {$gte: eventPeriodStartTime}
                                    }).lean();
                                    rewardProgressProm.push(rewardProm);
                                }

                                return Promise.all(rewardProgressProm);
                                // return dbConfig.collection_rewardPoints.findOne({playerObjId: playerObjId}).lean();
                            }
                        })
                }
            ).then(
                rewardPointsProgressData => {
                    if (rewardPointsProgressData) {
                        if (rewardPointsProgressData.length > 0) {
                            rewardPointsProgressData.filter(item => {
                                for (let i = 0; i < returnData.length; i++) {
                                    if (returnData[i]._id && item && item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() === returnData[i]._id.toString()
                                        && item.lastUpdateTime >= returnData[i].startTime && item.lastUpdateTime <= returnData[i].endTime) {
                                        delete item.lastUpdateTime;
                                        delete item.rewardPointsEventObjId;
                                        delete item._id;
                                        delete item.rewardPointsObjId;
                                        delete item.createTime;
                                        delete item.__v;
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
                                    if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {

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
                                    if (event.target) {
                                        event.target.targetDestination = providerName;
                                    }
                                    if (event.level && (event.level.value || event.level.value === 0)){
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
        let playerObj;
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
                        playerObj = playerData;
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

                                    if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {

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
                                    if (event.target) {
                                        event.target.targetDestination = providerName;
                                    }
                                    if (event.level && (event.level.value || event.level.value === 0)){
                                        event.level = event.level.value;
                                    }
                                });

                                let noProgress = {
                                    isApplicable: false,
                                    isApplied: false,
                                    count: 0
                                };

                                let rewardProgressProm = [];
                                returnData = rewardPointsEvent;
                                for (let i = 0; i < returnData.length; i++) {
                                    returnData[i].progress = noProgress;
                                    if (returnData[i].period) {
                                        let periodTime = getEventPeriodTime(returnData[i]);
                                        returnData[i].startTime = periodTime.startTime;
                                        returnData[i].endTime = periodTime.endTime;
                                    }
                                    let eventPeriodStartTime = getEventPeriodStartTime(returnData[i]);
                                    let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                        rewardPointsObjId: playerObj.rewardPointsObjId,
                                        rewardPointsEventObjId: returnData[i]._id,
                                        createTime: {$gte: eventPeriodStartTime}
                                    }).lean();
                                    rewardProgressProm.push(rewardProm);
                                }

                                return Promise.all(rewardProgressProm);
                                // return dbConfig.collection_rewardPoints.findOne({playerObjId: playerObjId}).lean();
                            }
                        })
                }
            ).then(
                rewardPointsProgressData => {
                    if (rewardPointsProgressData) {
                        if (rewardPointsProgressData.length > 0) {
                            rewardPointsProgressData.filter(item => {
                                for (let i = 0; i < returnData.length; i++) {
                                    if (returnData[i]._id && item && item.rewardPointsEventObjId && item.rewardPointsEventObjId.toString() === returnData[i]._id.toString()
                                        && item.lastUpdateTime >= returnData[i].startTime && item.lastUpdateTime <= returnData[i].endTime) {
                                        delete item.lastUpdateTime;
                                        delete item.rewardPointsEventObjId;
                                        delete item._id;
                                        delete item.rewardPointsObjId;
                                        delete item.createTime;
                                        delete item.__v;
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
                                    if (event && event.target && event.target.targetDestination && event.target.targetDestination.length > 0) {

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
                                    if (event.target) {
                                        event.target.targetDestination = providerName;
                                    }
                                    if (event.level && (event.level.value || event.level.value === 0)){
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
            if(player && player._id && platformObjId) {
                let rewardPointsProm = dbConfig.collection_rewardPoints.findOne({
                    platformObjId: platformObjId,
                    playerObjId: player._id
                }).lean();

                return Promise.all([rewardPointsProm]);
            }
        }).then(rewardPointsData => {
            let rewardPointsRecord = rewardPointsData && rewardPointsData[0] ? rewardPointsData[0] : [];

            if (rewardPointsRecord) {
                if (rewardPointsRecord.points) {
                    rewardPoints = rewardPointsRecord.points;
                }
                if (rewardPointsRecord._id) {
                    rewardPointsObjId = rewardPointsRecord._id;
                }
            }

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
        let returnData = {};
        let platformData = null;
        let playerData = null;
        let topupRewardPointEvent = [];
        let rewardPointRecord = [];
        let rewardPointsProm = [];
        let playerLevelProm = [];
        let playerLevelRecord = [];
        let displayFrontEndRewardPointsRankingData = null;

        let loginRewardPointEvent;
        let gameRewardPointEvent;
        let gameProvider;
        let rewardPointsRanking;

        return dbConfig.collection_platform.findOne({platformId: platformId}, {_id: 1, displayFrontEndRewardPointsRankingData: 1}).lean().then(
            platformRecord => {
                if (platformRecord) {
                    platformData = platformRecord;
                    if (platformData.hasOwnProperty('displayFrontEndRewardPointsRankingData')) {
                        displayFrontEndRewardPointsRankingData = platformData.displayFrontEndRewardPointsRankingData;
                    } else {
                        displayFrontEndRewardPointsRankingData = true;
                    }
                    return dbConfig.collection_players.findOne({
                        playerId: playerId,
                        platform: platformRecord._id
                    }, {
                        _id: 1,
                        platform: 1,
                        permission: 1
                    }).lean();
                } else {
                    return Promise.reject({name: "DataError", message: "Platform Not Found"});
                }
            })
            .then(playerRecord => {
                let topupRewardPointProm = dbConfig.collection_rewardPointsEvent.find({
                    platformObjId: platformData._id,
                    category: constRewardPointsTaskCategory.TOPUP_REWARD_POINTS,
                    status: true
                }).populate({path: "level", model: dbConfig.collection_playerLevel, select: {'name': 1, 'value': 1}}).lean().sort({index: 1});

                if (playerRecord) {
                    if(playerRecord && playerRecord.permission && playerRecord.permission.hasOwnProperty("rewardPointsTask") && (playerRecord.permission.rewardPointsTask.toString() == 'false')){
                        return Promise.reject({name: "DataError", message: "Player does not have permission for reward point task"});
                    }
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
                    let rewardProgressProm = [];

                    if (topupRewardPointEvent.length) {
                        for (let x = 0, len = topupRewardPointEvent.length; x < len; x++) {
                            let relevantData = topupRewardPointEvent[x];

                            if (relevantData && relevantData._id) {
                                let eventPeriodStartTime = getEventPeriodStartTime(relevantData);
                                let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                    rewardPointsObjId: rewardPointRecord._id,
                                    rewardPointsEventObjId: relevantData._id,
                                    createTime: {$gte: eventPeriodStartTime}
                                }).lean();
                                rewardProgressProm.push(rewardProm);
                            }
                        }
                    }

                    return Promise.all(rewardProgressProm).then(
                        progressData => {
                            let rewardProgressList = progressData && progressData.length ? progressData : [];
                            for (let j = rewardProgressList.length - 1; j >= 0; j--) {
                                if (!rewardProgressList[j]) {
                                    rewardProgressList.splice(j, 1);
                                }
                            }

                            let prom = [];
                            if (playerData) {
                                for (let i = 0, rewardEvent = topupRewardPointEvent.length; i < rewardEvent; i++) {
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
                                                let eventProgress = getEventProgress(rewardProgressList, event);
                                                eventProgress.rewardPointsObjId = rewardPointRecord._id;
                                                let progressChanged = updateTopupProgressCount(eventProgress, event, periodTopupAmount);
                                                if (progressChanged && periodTopupAmount > 0) {
                                                    if (eventProgress._id) {
                                                        let objId = eventProgress._id;
                                                        delete eventProgress._id;
                                                        delete eventProgress.createTime;

                                                        return dbConfig.collection_rewardPointsProgress.findOneAndUpdate({
                                                                _id: ObjectId(objId)
                                                            },
                                                            eventProgress
                                                            , {new: true}).lean();
                                                    } else {
                                                        return dbConfig.collection_rewardPointsProgress(eventProgress).save();
                                                    }
                                                } else {
                                                    return Promise.resolve(eventProgress);
                                                }
                                            }
                                        ));
                                    }
                                }
                                return Promise.all(prom);
                            }
                        },
                        err => {
                            return Promise.reject({
                                name: "DataError",
                                message: "Error finding reward progress.",
                                error: err
                            })
                        });
                }
            })
            .then(rewardPoints => {
                let sortCol = {points: -1, lastUpdate: 1};

                let loginRewardPointProm = dbConfig.collection_rewardPointsEvent.find({
                    platformObjId: platformData._id,
                    category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS,
                    status: true
                }).populate({path: "level", model: dbConfig.collection_playerLevel, select: {'name': 1, 'value': 1}}).lean().sort({index: 1});

                let gameRewardPointProm = dbConfig.collection_rewardPointsEvent.find({
                    platformObjId: platformData._id,
                    category: constRewardPointsTaskCategory.GAME_REWARD_POINTS,
                    status: true
                }).populate({path: "level", model: dbConfig.collection_playerLevel, select: {'name': 1, 'value': 1}}).lean().sort({index: 1});

                let gameProviderProm = dbConfig.collection_gameProvider.find({}).lean();

                let rewardPointsRankingProm = dbConfig.collection_rewardPoints.aggregate(
                    {$match: {platformObjId: platformData._id}},
                    {$sort: sortCol},
                    {$limit: 1000},
                    {
                        $project: {
                            playerObjId: 1,
                            playerName: 1,
                            playerLevel: 1,
                            points: 1,
                            _id: 0
                        }
                    }
                ).then(
                    rankings => {
                        return dbConfig.collection_playerLevel.populate(rankings, {
                            path: 'playerLevel',
                            model: dbConfig.collection_playerLevel,
                            select: {name: 1}
                        });
                    }
                );

                let playerRewardPointProm = Promise.resolve(false);
                if (playerData) {
                    playerRewardPointProm = dbConfig.collection_rewardPoints.findOne({
                        platformObjId: platformData._id,
                        playerObjId: playerData._id
                    }, 'playerLevel points').populate({
                        path: 'playerLevel',
                        model: dbConfig.collection_playerLevel,
                        select: {name: 1}
                    }).lean();
                }

                return Promise.all([loginRewardPointProm, gameRewardPointProm, gameProviderProm, rewardPointsRankingProm, playerRewardPointProm])
            })
            .then(data => {
                let limit = 10;

                loginRewardPointEvent = data[0] ? data[0] : [];
                gameRewardPointEvent = data[1] ? data[1] : [];
                gameProvider = data[2] ? data[2] : [];
                rewardPointsRanking = data[3] ? data[3] : [];
                let playerRewardPoint = data[4] ? data[4] : [];

                if (rewardPointsRanking && rewardPointsRanking.length > 0) {
                    let rewardPointsRankingListArr = getRewardPointsRanking(rewardPointsRanking.slice(0, limit));

                    // determine whether to display reward points ranking data for front end
                    if (displayFrontEndRewardPointsRankingData) {
                        returnData.pointRanking = rewardPointsRankingListArr;
                    } else {
                        returnData.pointRanking = [];
                    }

                    if (playerData) {
                        let playerPointInfoListArr = getPlayerPointInfo(rewardPointsRanking, playerData, playerLevelRecord);
                        if (!(playerPointInfoListArr && playerPointInfoListArr.length) && playerRewardPoint) {
                            playerPointInfoListArr = [{
                                "rank": "1000+",
                                "grade": playerRewardPoint.playerLevel && playerRewardPoint.playerLevel.name || "等级不存在",
                                "totalPoint": playerRewardPoint.points
                            }]
                        }
                        returnData.playerPointInfo = playerPointInfoListArr;
                    }
                }

                let gameRewardProm = [];
                if(gameRewardPointEvent && gameRewardPointEvent.length > 0){
                    for (let x = 0, len = gameRewardPointEvent.length; x < len; x++) {
                        let item = gameRewardPointEvent[x];

                        if (item && item._id) {
                            let eventPeriodStartTime = getEventPeriodStartTime(item);
                            let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                rewardPointsObjId: rewardPointRecord._id,
                                rewardPointsEventObjId: item._id,
                                createTime: {$gte: eventPeriodStartTime}
                            }).lean();

                            if (playerData && playerData._id) {
                                rewardProm = checkGameRewardPointDetail(playerData._id, item._id);
                            }

                            gameRewardProm.push(rewardProm);
                        }
                    }
                }

                return Promise.all(gameRewardProm).then(
                    gameRewardPointsData => {
                        if (gameRewardPointsData && gameRewardPointsData.length) {
                            for (let j = gameRewardPointsData.length - 1; j >= 0; j--) {
                                if (!gameRewardPointsData[j]) {
                                    gameRewardPointsData.splice(j, 1);
                                }
                            }
                        }
                        if (playerData && playerData._id) {
                            returnData.gamePointList = gameRewardPointsData;
                        }
                        else {
                            returnData.gamePointList = getRewardPointEvent(constRewardPointsTaskCategory.GAME_REWARD_POINTS, gameRewardPointEvent, gameProvider, gameRewardPointsData);
                        }
                    }
                );

            }).then(
                () => {
                    let loginRewardProm = [];
                    if(loginRewardPointEvent && loginRewardPointEvent.length > 0){
                        for (let x = 0, len = loginRewardPointEvent.length; x < len; x++) {
                            let item = loginRewardPointEvent[x];

                            if (item && item._id) {
                                let eventPeriodStartTime = getEventPeriodStartTime(item);
                                let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                    rewardPointsObjId: rewardPointRecord._id,
                                    rewardPointsEventObjId: item._id,
                                    createTime: {$gte: eventPeriodStartTime}
                                }).lean();
                                loginRewardProm.push(rewardProm);
                            }
                        }
                    }

                    return Promise.all(loginRewardProm).then(
                        loginRewardPointsData => {
                            if (loginRewardPointsData && loginRewardPointsData.length) {
                                for (let j = loginRewardPointsData.length - 1; j >= 0; j--) {
                                    if (!loginRewardPointsData[j]) {
                                        loginRewardPointsData.splice(j, 1);
                                    }
                                }
                            }
                            returnData.loginPointList =  getRewardPointEvent(constRewardPointsTaskCategory.LOGIN_REWARD_POINTS, loginRewardPointEvent, gameProvider, loginRewardPointsData);
                        }
                    );
            }).then(
                () => {
                    let topUpRewardProm = [];
                    if(topupRewardPointEvent && topupRewardPointEvent.length > 0){
                        for (let x = 0, len = topupRewardPointEvent.length; x < len; x++) {
                            let item = topupRewardPointEvent[x];

                            if (item && item._id) {
                                let eventPeriodStartTime = getEventPeriodStartTime(item);
                                let rewardProm = dbConfig.collection_rewardPointsProgress.findOne({
                                    rewardPointsObjId: rewardPointRecord._id,
                                    rewardPointsEventObjId: item._id,
                                    createTime: {$gte: eventPeriodStartTime}
                                }).lean();
                                topUpRewardProm.push(rewardProm);
                            }
                        }
                    }

                    return Promise.all(topUpRewardProm).then(
                        topUpRewardPointsData => {
                            if (topUpRewardPointsData && topUpRewardPointsData.length) {
                                for (let j = topUpRewardPointsData.length - 1; j >= 0; j--) {
                                    if (!topUpRewardPointsData[j]) {
                                        topUpRewardPointsData.splice(j, 1);
                                    }
                                }
                            }
                            returnData.rechargePointList =  getRewardPointEvent(constRewardPointsTaskCategory.TOPUP_REWARD_POINTS, topupRewardPointEvent, gameProvider, topUpRewardPointsData);
                            return returnData;
                        }
                    );
            })
    },

    getPointChangeRecord: function (startTime, endTime, pointType, status, platformId, playerId) {
        let platformObj;
        const constPlayerRegistrationInterface = {
            0: 'BACKSTAGE',
            1: 'WEB_PLAYER',
            2: 'WEB_AGENT',
            3: 'H5_PLAYER',
            4: 'H5_AGENT',
            5: 'APP_PLAYER',
            6: 'APP_AGENT'
        };
        return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platformObj = platformData;
                return dbConfig.collection_players.findOne({platform:platformObj._id, playerId: playerId}).lean();
            }
        ).then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find player"});
                }
                let rewardQuery = {
                    playerName: playerData.name,
                    platformId: platformObj._id,
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)}
                };
                if (status) {
                    rewardQuery.status = Number(status);
                }
                if (pointType) {
                    rewardQuery.category = Number(pointType);
                }
                return dbConfig.collection_rewardPointsLog.find(rewardQuery).sort({createTime: -1}).lean();
            }
        ).then(
            rewardPointsData => {
                let returnData = [];
                for (let i = 0; i < rewardPointsData.length; i++) {
                    let tempObj = {
                        pointRecordId: rewardPointsData[i].pointLogId,
                        pointType: rewardPointsData[i].category,
                        title: rewardPointsData[i].rewardTitle || "",
                        device: localization.localization.translate(constPlayerRegistrationInterface[rewardPointsData[i].userAgent]),
                        status: rewardPointsData[i].status,
                        beforePoint: rewardPointsData[i].oldPoints,
                        afterPoint: rewardPointsData[i].newPoints,
                        pointChange: rewardPointsData[i].amount,
                        dailyClaimedPoint: rewardPointsData[i].currentDayAppliedAmount || 0,
                        dailyClaimMaxPoint: rewardPointsData[i].maxDayApplyAmount || 0,
                        createTime: rewardPointsData[i].createTime,
                        playerLevelText: rewardPointsData[i].playerLevelName,
                        remark: rewardPointsData[i].remark || "",
                    }
                    returnData.push(tempObj)
                }
                return returnData;
            }
        )
    }
};

module.exports = dbRewardPoints;

// If any of the function below is more general than I thought, it might need to move to dbCommon or dbUtility,
// else, it will act as private function of this model


function isRelevantLoginEventByProvider(event, provider, inputDevice, playerLevelData, playerData) {
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

    // check if player is forbidden from applying reward points
    if (playerData && playerData.forbidRewardPointsEvent && playerData.forbidRewardPointsEvent.length && event && event._id && playerData.forbidRewardPointsEvent.map(p => {return p.toString()}).includes(event._id.toString())) {
        return false
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

function isRelevantGameEvent(event, consumptionRecord, playerLevelData, specialCaseProviderObjIds) {
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

    if (event.target && event.target.targetDestination && event.target.gameType) {
        if (specialCaseProviderObjIds.includes(String(event.target.targetDestination))) {
            let gameTypes = event.target.gameType;
            let gameTypeSPC = gameTypes.split(',').map(item => item.trim()); // SPC - special case
            let matchGameTypeSPC = 0;

            for (let x = 0; x < gameTypeSPC.length; x++) {
                if (gameTypeSPC[x] === String(consumptionRecord.cpGameType)) {
                    matchGameTypeSPC++;
                    break;
                }
            }

            if (matchGameTypeSPC === 0) {
                return false;
            }
        } else {
            if (String(event.target.gameType) !== String(consumptionRecord.cpGameType)) {
                return false;
            }
        }
    }

    if (event.target && event.target.betType && event.target.betType.length > 0) {
        let relevantBetType = event.target.betType;
        let delimiters = [' ','|','@',','];
        let betTypes = consumptionRecord && consumptionRecord.betType ? consumptionRecord.betType.split(new RegExp('[' + delimiters.join('') + ']', 'g')).filter(function(el) {return el.length != 0}) : [];

        if (betTypes && betTypes.length > 0) {
            let matchBetTypes = [];

            betTypes.forEach(betType => {
                relevantBetType.forEach(eventBetType => {
                    if (betType == eventBetType) {
                        matchBetTypes.push(betType);
                    }
                });
            });

            if(matchBetTypes && matchBetTypes.length == 0) {
                return false;
            }
        } else {
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
        delete progress.turnQualifiedLoginDate;
        progress.$unset = {turnQualifiedLoginDate: 1};
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

    if (!progress.turnQualifiedLoginDate && progress.isApplicable) {
        progress.turnQualifiedLoginDate = new Date();
        if (progress.$unset) {
            delete progress.$unset;
        }
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
        progress.count = ((todayTopupAmount >= event.target.dailyTopupAmount) || (event.target.singleTopupAmount && todayTopupAmount >= event.target.singleTopupAmount)) ? 1 : 0;
        progress.isApplied = false;
        progress.isApplicable = false;
        progress.lastUpdateTime = new Date();
        progressUpdated = true;
    }
    else {
        let today = dbUtility.getTodaySGTime();
        if (!progress.isApplicable && (progress.lastUpdateTime < today.startTime || progress.count === 0) && progress.count < event.consecutiveCount
            && ((todayTopupAmount >= event.target.dailyTopupAmount) || (event.target.singleTopupAmount && todayTopupAmount >= event.target.singleTopupAmount))) {
            progress.count++;
            progress.lastUpdateTime = new Date();
            progressUpdated = true;
        }
    }

    if (event.target && ((event.target.dailyTopupAmount &&
        todayTopupAmount >= event.target.dailyTopupAmount) || (event.target.singleTopupAmount && todayTopupAmount >= event.target.singleTopupAmount)) && progress.count >= event.consecutiveCount) {
        progress.isApplicable = true;
        progressUpdated = true;
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

function getTodayLastRewardPointEventLog(pointObjId, currentPlayerLevelName) {
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
        createTime: {$gte: new Date(todayStartTime)},
        playerLevelName: currentPlayerLevelName
    }).sort({createTime: -1}).limit(1).lean();
}

function getPlayerLevelValue(playerObjId) {
    return dbConfig.collection_players.findOne({
        _id: playerObjId
    },{"playerLevel":1}).populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean();
}

function getRewardPointEvent(category, rewardPointEvent, gameProvider, rewardPointsProgress) {
    let rewardPointListArr = [];

    if (rewardPointEvent && rewardPointEvent.length > 0) {
        for (let x = 0, len = rewardPointEvent.length; x < len; x++) {
            let reward = rewardPointEvent[x];
            let rewardStartTime;
            let rewardEndTime;
            let rewardPeriod;
            let currentGoal = 0;
            let level, levelName;
            let rewards = {};
            let status = 0;
            let providerIds = [];
            let turnQualifiedLoginDate;

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

            if (rewardPointsProgress && rewardPointsProgress.length > 0) {
                for (let x = 0, len = rewardPointsProgress.length; x < len; x++) {
                    let progressData = rewardPointsProgress[x];

                    if (progressData && progressData.rewardPointsEventObjId && progressData.rewardPointsEventObjId.toString() === reward._id.toString()
                        && progressData.lastUpdateTime >= rewardStartTime && progressData.lastUpdateTime <= rewardEndTime) {
                        currentGoal = progressData.count;
                        turnQualifiedLoginDate = progressData.turnQualifiedLoginDate || "";
                        if (progressData.isApplied) {
                            status = 2;
                        }
                        else if (progressData.isApplicable) {
                            status = 1;
                        }
                    }
                }
            }

            switch (category) {
                case constRewardPointsTaskCategory.LOGIN_REWARD_POINTS: {
                    if (reward.target && reward.target.targetDestination && reward.target.targetDestination.length > 0) {
                        for (let x = 0, len = reward.target.targetDestination.length; x < len; x++) {
                            let targetDestinationObjId = reward.target.targetDestination[x];

                            if (gameProvider && gameProvider.length > 0) {
                                for (let y in gameProvider) {
                                    let gameProviderData = gameProvider[y];

                                    if (targetDestinationObjId && gameProviderData && gameProviderData._id && (targetDestinationObjId == gameProviderData._id)) {
                                        providerIds.push(gameProviderData.providerId);
                                    }
                                }
                            }
                        }
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
                        "pointMode": reward.pointMode,
                        "status": status == 0 && (currentGoal >= reward.consecutiveCount) ? 1 : status,
                        "providerId": providerIds,
                        "goal": reward.consecutiveCount,
                        "currentGoal": reward && reward.hasOwnProperty('consecutiveCount') && currentGoal && currentGoal > reward.consecutiveCount ? reward.consecutiveCount : currentGoal,
                        "turnQualifiedLoginDate": turnQualifiedLoginDate
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
                        "currentGoal": reward && reward.hasOwnProperty('consecutiveCount') && currentGoal && currentGoal > reward.consecutiveCount ? reward.consecutiveCount : currentGoal
                    }
                    break;
                }
                case constRewardPointsTaskCategory.GAME_REWARD_POINTS: {
                    let dailyRequestBetCountsAndAmount = [];
                    if (reward.target && reward.target.targetDestination) {
                        if (gameProvider && gameProvider.length > 0) {
                            for (let x = 0, len = gameProvider.length; x < len; x++) {
                                let gameProviderData = gameProvider[x];
                                if (reward.target.targetDestination && gameProviderData && gameProviderData._id && (reward.target.targetDestination == gameProviderData._id.toString())) {
                                    providerIds.push(gameProviderData.providerId);
                                }
                            }
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
                        "currentGoal": reward && reward.hasOwnProperty('consecutiveCount') && currentGoal && currentGoal > reward.consecutiveCount ? reward.consecutiveCount : currentGoal
                    }
                    break;
                }
            }
            rewardPointListArr.push(rewards);
        }
    }

    return rewardPointListArr;
}

function getRewardPointsRanking(rewardPoints) {
    let rewardPointsRankingListArr = [];
    let rankNo = 0;

    if(rewardPoints && rewardPoints.length > 0) {
        for (let x = 0, len = rewardPoints.length; x < len; x++) {
            let rank = rewardPoints[x];

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
            rankNo = rankNo + 1;
            let ranks = {
                "account": rank.playerName,
                "grade": level,
                "totalPoint": rank.points,
                "rank": rankNo
            }
            rewardPointsRankingListArr.push(ranks);
        }
    }

    return rewardPointsRankingListArr;
}

function getPlayerPointInfo(rewardPointsData, playerData, playerLevelRecord) {
    let playerPointInfoListArr = [];
    let rankNo = 0;
    let level = "";

    if (rewardPointsData && rewardPointsData.length > 0) {
        rewardPointsData.map(rewardPoint => {
            rankNo = rankNo + 1;
            rewardPoint.rank = rankNo;
        });

        if (playerData && playerData._id) {
            for (let x in rewardPointsData) {
                let playerRank = rewardPointsData[x];
                if (playerRank.playerObjId
                    && (playerRank.playerObjId.toString() == playerData._id.toString())
                    && playerLevelRecord && playerLevelRecord.playerLevel && playerLevelRecord.playerLevel._id && playerRank.playerLevel &&  playerRank.playerLevel._id
                    && (playerLevelRecord.playerLevel._id.toString() == playerRank.playerLevel._id.toString())) {

                    if(playerRank.playerLevel && playerRank.playerLevel.name) {
                        level = playerRank.playerLevel.name;
                    }

                    let playerPointInfo = {
                        "rank": playerRank.rank,
                        "grade": level,
                        "totalPoint": playerRank.points
                    }

                    playerPointInfoListArr.push(playerPointInfo);
                    break;
                }
            }
        }
    }

    return playerPointInfoListArr;
}

function checkGameRewardPointDetail(playerObjId, rewardPointEventObjId) {
    let player = {};
    let platform = {};
    let rewardPointEvent = {};
    let rewardPoint = {};
    let rewardPointsLvlConfig = {};
    let gameProviders = [];
    let eventPeriod;

    return dbConfig.collection_players.findOne({_id: playerObjId}, {_id: 1, platform: 1, name: 1}).populate({path: "platform", model: dbConfig.collection_platform, select: {_id: 1, gameProviders: 1}}).lean().then(
        playerData => {
            if (!playerData) {
                return Promise.reject({name: "DataError", message: "Player Not Found"});
            }

            player = playerData;
            platform = playerData.platform;

            let getRewardPointEventProm = dbConfig.collection_rewardPointsEvent.findOne({_id: rewardPointEventObjId})
                .populate({path: "level", model: dbConfig.collection_playerLevel, select: {'name': 1, 'value': 1}}).lean();
            let getRewardPointsProm = dbRewardPoints.getPlayerRewardPoints(player._id);
            let getRewardPointsLvlConfigProm = dbRewardPointsLvlConfig.getRewardPointsLvlConfig(platform._id);
            let getGameProvidersProm = dbGameProvider.getGameProviders({_id: {$in: platform.gameProviders}});

            return Promise.all([getRewardPointEventProm, getRewardPointsProm, getRewardPointsLvlConfigProm, getGameProvidersProm]);
        }
    ).then(
        data => {
            rewardPointEvent = data[0];
            rewardPoint = data[1];
            rewardPointsLvlConfig = data[2];
            gameProviders = data[3];

            if (!rewardPointEvent) {
                return Promise.reject({
                    message: "Unknown error"
                })
            }

            eventPeriod = getEventPeriodTime(rewardPointEvent);

            return dbConfig.collection_rewardPointsLog.findOne({
                createTime: {
                    $gte: eventPeriod.startTime,
                    $lt: eventPeriod.endTime
                },
                rewardPointsEventObjId: rewardPointEvent._id,
                playerName: player.name,
                platformId: platform._id,
                category: constRewardPointsLogCategory.GAME_REWARD_POINTS
            }).lean();
        }
    ).then(
        appliedLog => {
            let output = {
                id: rewardPointEventObjId,
                refreshPeriod: getIntervalPeriodString(rewardPointEvent.period),
                gameType: rewardPointEvent.target && rewardPointEvent.target.gameType ? rewardPointEvent.target.gameType : "",
                betDetail: rewardPointEvent.target && rewardPointEvent.target.betType ? rewardPointEvent.target.betType : "",
                title: rewardPointEvent.rewardTitle,
                content: rewardPointEvent.rewardContent,
                gradeLimit: rewardPointEvent.level && rewardPointEvent.level.value || 0,
                gradeName: rewardPointEvent.level && rewardPointEvent.level.name || "",
                device: constRewardPointsUserAgent[rewardPointEvent.userAgent ? rewardPointEvent.userAgent.toString() : ""],
                dailyRequestBetCountsAndAmount: [0, 0],
                dailyBetConsumption: 0,
                dailyWinBetCounts: 0,
                point: rewardPointEvent.rewardPoints,
                status: 0, // not-applicable
                providerId: getTargetDestinationProviderIds(rewardPointEvent, gameProviders),
                goal: rewardPointEvent.consecutiveCount,
                currentGoal: 0,
            };

            if (rewardPointEvent.target && (rewardPointEvent.target.dailyConsumptionCount || rewardPointEvent.target.singleConsumptionAmount)) {
                output.dailyRequestBetCountsAndAmount = [(rewardPointEvent.target && rewardPointEvent.target.dailyConsumptionCount || 0), (rewardPointEvent.target && rewardPointEvent.target.singleConsumptionAmount || 0)];
            }

            if (rewardPointEvent.target && rewardPointEvent.target.dailyValidConsumptionAmount) {
                output.dailyBetConsumption = rewardPointEvent.target.dailyValidConsumptionAmount;
            }

            if (rewardPointEvent.target && rewardPointEvent.target.dailyWinGameCount) {
                output.dailyWinBetCounts = rewardPointEvent.target.dailyWinGameCount;
            }

            if (appliedLog) {
                output.currentGoal = rewardPointEvent.consecutiveCount;
                output.status = 2; // applied

                return output;
            }
            else {
                return getCurrentStatusOfGameRewardPoint(player._id, rewardPointEvent, eventPeriod.startTime, eventPeriod.endTime, output);
            }
        }
    )
}

function getCurrentStatusOfGameRewardPoint (playerObjId, event, startTime, endTime, output) {
    if (!event || !event.target || !playerObjId) {
        return output;
    }

    let progressCountProm = Promise.resolve(0);
    if (playerObjId) {
        if (event.target.singleConsumptionAmount && event.target.dailyConsumptionCount) {
            progressCountProm = getProgressBaseOnConsumptionCount(playerObjId, event, startTime, endTime, output);
        }
        else if (event.target.dailyValidConsumptionAmount) {
            progressCountProm = getProgressBaseOnConsumptionAmount(playerObjId, event, startTime, endTime, output);
        }
        else if (event.target.dailyWinGameCount) {
            progressCountProm = getProgressBaseOnDailyWinGameCount(playerObjId, event, startTime, endTime, output);
        }
    }

    return progressCountProm.then(
        count => {
            if (count >= event.consecutiveCount) {
                output.status = 1; // applicable
                output.currentGoal = event.consecutiveCount;
            }
            else {
                output.currentGoal = count;
            }

            return output;
        }
    );
}

function getProgressBaseOnConsumptionCount (playerObjId, event, startTime, endTime, output) {
    let specialCaseProviderObjIds = [];
    if (!event || !event.target) {
        return output;
    }

    let singleConsumptionAmount = event.target.singleConsumptionAmount;
    let dailyConsumptionCount = event.target.dailyConsumptionCount;

    return getSpecialCaseProviderObjIds().then(
        specialCaseProviderObjIdsArr => {
            specialCaseProviderObjIds = specialCaseProviderObjIdsArr;
            let daysInPeriod = sliceTimeFrameToDaily(startTime, endTime);

            let proms = [];

            daysInPeriod.map(day => {
                let query = {
                    createTime: {$gte: new Date(day.startTime), $lt: new Date(day.endTime)},
                    playerId: playerObjId,
                    validAmount: {$gte: singleConsumptionAmount},
                };

                if (event.target.targetDestination) {
                    query.providerId = event.target.targetDestination;
                }

                let prom = dbConfig.collection_playerConsumptionRecord.find(query).read("secondaryPreferred").lean();
                proms.push(prom);
            });

            return Promise.all(proms);
        }
    ).then(
        daysConsumption => {
            let currentGoals = 0;

            daysConsumption.map(dayConsumption => {
                let eligibleConsumptions = dayConsumption.filter(consumption => {
                    return isEligibleConsumption(consumption, event, specialCaseProviderObjIds);
                });

                if (eligibleConsumptions.length >= dailyConsumptionCount) {
                    currentGoals++;
                }
            });

            return currentGoals;
        }
    );
}

function getProgressBaseOnConsumptionAmount (playerObjId, event, startTime, endTime, output) {
    let specialCaseProviderObjIds = [];
    if (!event || !event.target) {
        return output;
    }

    let dailyValidConsumptionAmount = Number(event.target.dailyValidConsumptionAmount);

    return getSpecialCaseProviderObjIds().then(
        specialCaseProviderObjIdsArr => {
            specialCaseProviderObjIds = specialCaseProviderObjIdsArr;
            let daysInPeriod = sliceTimeFrameToDaily(startTime, endTime);

            let proms = [];

            daysInPeriod.map(day => {
                let query = {
                    createTime: {$gte: new Date(day.startTime), $lt: new Date(day.endTime)},
                    playerId: playerObjId,
                };

                if (event.target.targetDestination) {
                    query.providerId = event.target.targetDestination;
                }

                let prom = dbConfig.collection_playerConsumptionRecord.find(query).read("secondaryPreferred").lean();
                proms.push(prom);
            });

            return Promise.all(proms);
        }
    ).then(
        daysConsumption => {
            let currentGoals = 0;

            daysConsumption.map(dayConsumption => {
                let eligibleConsumptions = dayConsumption.filter(consumption => {
                    return isEligibleConsumption(consumption, event, specialCaseProviderObjIds);
                });

                let totalValidAmount = 0;

                eligibleConsumptions.map(consumption => {
                    if(event.target.betType && event.target.betType.length > 0) {
                        consumption.betDetails.forEach(detail => {
                            if (event.target.betType.indexOf(detail.separatedBetType) > -1) {
                                totalValidAmount += Number(detail.separatedBetAmount);
                            }
                        });
                    } else {
                        totalValidAmount += Number(consumption.validAmount);
                    }
                });

                if (totalValidAmount >= dailyValidConsumptionAmount) {
                    currentGoals++
                }
            });

            return currentGoals;
        }
    );
}

function getProgressBaseOnDailyWinGameCount (playerObjId, event, startTime, endTime, output) {
    let specialCaseProviderObjIds = [];
    if (!event || !event.target) {
        return output;
    }

    let dailyWinGameCount = Number(event.target.dailyWinGameCount);

    return getSpecialCaseProviderObjIds().then(
        specialCaseProviderObjIdsArr => {
            specialCaseProviderObjIds = specialCaseProviderObjIdsArr;
            let daysInPeriod = sliceTimeFrameToDaily(startTime, endTime);

            let proms = [];

            daysInPeriod.map(day => {
                let query = {
                    createTime: {$gte: new Date(day.startTime), $lt: new Date(day.endTime)},
                    playerId: playerObjId,
                    bonusAmount: {$gt: 0},
                };

                if (event.target.targetDestination) {
                    query.providerId = event.target.targetDestination;
                }

                let prom = dbConfig.collection_playerConsumptionRecord.find(query).read("secondaryPreferred").lean();
                proms.push(prom);
            });

            return Promise.all(proms);
        }
    ).then(
        daysConsumption => {
            let currentGoals = 0;

            daysConsumption.map(dayConsumption => {
                let eligibleConsumptions = dayConsumption.filter(consumption => {
                    return isEligibleConsumption(consumption, event, specialCaseProviderObjIds);
                });

                if (eligibleConsumptions.length >= dailyWinGameCount) {
                    currentGoals++;
                }
            });

            return currentGoals;
        }
    );
}

function sliceTimeFrameToDaily(startTime, endTime) {
    let timeFrames = [];
    let protectiveCount = 0;

    endTime = new Date(endTime);
    let nextStartTime = new Date(startTime);
    let nextEndTime = new Date(dbUtility.getDayTime(nextStartTime).endTime);
    while (nextEndTime < endTime) {
        protectiveCount++;
        if (protectiveCount > 367) {
            break;
        }
        timeFrames.push({startTime: new Date(nextStartTime), endTime: new Date(nextEndTime)});

        let nextPeriod = dbUtility.getDayTime(new Date(nextEndTime).setMinutes(nextEndTime.getMinutes() + 10));
        nextStartTime = new Date(nextPeriod.startTime);
        nextEndTime = new Date(nextPeriod.endTime);
    }
    timeFrames.push({startTime: nextStartTime, endTime: endTime});

    return timeFrames;
}

function getSpecialCaseProviderObjIds () {
    let specialCaseProviderIds = [
        18, // PT
        41, // MG-EBET
        45, // DT
        46, // QT
        47, // BY
        57, // ISBSLOTS
    ];
    return dbConfig.collection_gameProvider.find({providerId: {$in: specialCaseProviderIds}}, {_id: 1}).lean().then(
        specialCaseProviders => {
            let objIds = [];
            specialCaseProviders.map(provider => {
                objIds.push(String(provider._id));
            });

            return objIds;
        }
    );
}

function getIntervalPeriodString (int) {
    let intervalPeriod = int;
    for (let key in constRewardPointsPeriod) {
        if (constRewardPointsPeriod[key] === intervalPeriod) {
            intervalPeriod = key;
        }
    }
    return intervalPeriod;
}

function getTargetDestinationProviderIds (event, gameProviders) {
    let providerIds = [];
    if (event.target && event.target.targetDestination) {
        if (gameProviders && gameProviders.length > 0) {
            gameProviders.forEach(provider => {
                if (event.target.targetDestination == provider._id.toString()) {
                    providerIds.push(provider.providerId);
                }
            });
        }
    }

    return providerIds;
}

function isEligibleConsumption (consumption, event, specialCaseProviderObjIds) {
    if (event.target.targetDestination && event.target.gameType) {
        if (specialCaseProviderObjIds.includes(String(event.target.targetDestination))) {
            let gameTypes = event.target.gameType;
            let gameTypeSPC = gameTypes.split(',').map(item => item.trim()); // SPC - special case
            let matchGameTypeSPC = 0;

            for (let x = 0; x < gameTypeSPC.length; x++) {
                if (gameTypeSPC[x] === String(consumption.cpGameType)) {
                    // for matching game type
                    matchGameTypeSPC++;
                }
            }

            // no matching game type
            if (matchGameTypeSPC === 0) {
                return false;
            }
        } else {
            if (String(event.target.gameType) !== String(consumption.cpGameType)) {
                return false;
            }
        }
    }

    if (event.target && event.target.betType && event.target.betType.length > 0) {
        let relevantBetType = event.target.betType;
        let delimiters = [' ','|','@'];
        let betTypes = consumption && consumption.betType ? consumption.betType.split(new RegExp('[' + delimiters.join('') + ']', 'g')).filter(function(el) {return el.length != 0}) : [];

        if (betTypes && betTypes.length > 0) {
            let matchBetTypes = [];

            betTypes.forEach(betType => {
                relevantBetType.forEach(eventBetType => {
                    if (betType == eventBetType) {
                        matchBetTypes.push(betType);
                    }
                });
            });

            if(matchBetTypes && matchBetTypes.length == 0) {
                return false;
            }
        } else {
            return false;
        }
    }

    return true;
}