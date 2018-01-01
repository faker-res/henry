/**
 *  Can remove, replace by rewardTask
 *
 * */
let Q = require('q');
let errorUtils = require('../modules/errorUtils');
let dbConfig = require('../modules/dbproperties');
let dbLogger = require("./../modules/dbLogger");
var dbUtil = require("../modules/dbutility.js");
var constShardKeys = require("../const/constShardKeys");
let constRewardTaskStatus = require('./../const/constRewardTaskStatus');
let constProposalType = require('./../const/constProposalType');

let dbRewardPointsTask = {

    createRewardPointsTask: (rewardPointsTaskData) => {
        let deferred = Q.defer();
        let rewardPointsTask = new dbConfig.collection_rewardPointsTask(rewardPointsTaskData);
        let taskProm = rewardPointsTask.save();

        taskProm.then(
            data => {
                deferred.resolve(data);
            },
            error => {
                deferred.reject({name: "DBError", message: "Error creating reward points task", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Update reward points task
     * @param {String} query - The query String.
     * @param {Json} updateData - The update data.
     */
    updateRewardPointsTask: function (query, updateData) {
        return dbConfig.collection_rewardPointsTask.findOneAndUpdate(query, updateData);
    },

    /**
     * check and update player's reward points task info when player consume credit
     * @param {Object} consumptionRecord - consumptionRecord object
     */
    checkPlayerRewardPointsTaskForConsumption: function (consumptionRecord) {
        let deferred = Q.defer();
        let bDirty = false;
        let bTaskAchieved = false;
        let createTime = new Date(consumptionRecord.createTime);

        dbConfig.collection_gameProviderGroup.findOne({
            platform: consumptionRecord.platformId,
            providers: consumptionRecord.providerId
        }).lean().then(
            (providerGroup) => {
                // the oldest reward points task will be taken to use
                let queryObj = {
                    playerObjId: consumptionRecord.playerId,
                    status: constRewardTaskStatus.STARTED,
                    createTime: {$lt: createTime},
                    isUnlock: false,
                    $or: [
                        {providerGroup: null}
                    ],
                };
                if (providerGroup && providerGroup._id) {
                    queryObj.$or.push({providerGroup: providerGroup._id});
                }
                return dbConfig.collection_rewardPointsTask.find(queryObj).sort({createTime: 1}).limit(1).lean();
            }
        ).then(
            tasks => {
                let taskData = tasks ? tasks[0] : null;
                return taskData ? taskData : false;
            },
            error => {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding reward points task.",
                    error: error
                });
            }
        ).then(
            function (taskData) {
                if (taskData) {
                    taskData.unlockedAmount += consumptionRecord.validAmount;
                    let bAchieved = false;
                    if (taskData.unlockedAmount >= taskData.requiredUnlockAmount && taskData.requiredUnlockAmount > 0) {
                        taskData.isUnlock = true;
                        taskData.status = constRewardTaskStatus.ACHIEVED;
                        taskData.unlockTime = createTime;
                        bAchieved = true;
                    }

                    return dbConfig.collection_rewardPointsTask.findOneAndUpdate(
                        {_id: taskData._id, platformId: taskData.platformId},
                        {
                            $inc: {
                                unlockedAmount: consumptionRecord.validAmount,
                            },
                            isUnlock: taskData.isUnlock,
                            status: taskData.status,
                            unlockTime: taskData.unlockTime
                        }
                    ).lean().then(
                        newTaskData => {
                            var proms = [];
                            if (!newTaskData.isUnlock && bAchieved) {
                                bTaskAchieved = true;
                            }
                            proms.push(Q.resolve(taskData));
                            if (bTaskAchieved || !bAchieved) {
                                bDirty = true;
                                proms.push(dbConfig.collection_playerConsumptionRecord.findOneAndUpdate(
                                    {_id: consumptionRecord._id, createTime: consumptionRecord.createTime},
                                    {
                                        bDirty: true,
                                        usedType: constProposalType.PLAYER_CONVERT_REWARD_POINTS,
                                        usedTaskId: taskData._id
                                    }
                                ));
                            }
                            return Q.all(proms);
                        }
                    );
                }
                else {
                    return [true];
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding reward points task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data[0]) {
                    if (bTaskAchieved) {
                        let taskData = data[0];
                        return dbConfig.collection_rewardPointsTask.findOneAndUpdate(
                            {_id: taskData._id, platformId: taskData.platformId},
                            {status: constRewardTaskStatus.COMPLETED}
                        );
                    }
                    else {
                        return bDirty;
                    }
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Can't update reward points task and consumption record"
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating reward points task and consumption record",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve(bDirty);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error completing reward task", error: error});
            }
        );

        return deferred.promise;
    },

};

module.exports = dbRewardPointsTask;
