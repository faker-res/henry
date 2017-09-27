'use strict';

var dbRewardTaskFunc = function () {
};
module.exports = new dbRewardTaskFunc();

var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constRewardType = require('./../const/constRewardType');
var constRewardDataSource = require('./../const/constRewardDataSource');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var constPlayerCreditChangeType = require('./../const/constPlayerCreditChangeType');
var constServerCode = require('../const/constServerCode');
var dbLogger = require("./../modules/dbLogger");
var constSystemParam = require('../const/constSystemParam');
var constShardKeys = require("../const/constShardKeys");
var constProposalType = require("../const/constProposalType");
var dbUtil = require("../modules/dbutility.js");
var errorUtils = require("../modules/errorUtils.js");
var cpmsAPI = require("../externalAPI/cpmsAPI");
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbGameProvider = require('../db_modules/dbGameProvider');

var dbRewardTask = {

    /**
     * Create a new reward
     * @param {Object} rewardData - The data of the reward. Refer to reward schema.
     * @param adminId
     * @param adminName
     */
    manualCreateRewardTask: function (rewardData, adminId, adminName) {
        return dbRewardTask.checkPlayerRewardTaskStatus(rewardData.playerId).then(
            taskStatus => {
                return dbRewardTask.getPlayerCurRewardTask(rewardData.playerId);
            }
        ).then(data => {
            if (data && !data.platformId.canMultiReward && data.platformId.useLockedCredit) {
                return Q.reject({
                    status: constServerCode.PLAYER_HAS_REWARD_TASK,
                    message: "The player has not unlocked the previous reward task. Not valid for new reward"
                })
            } else {
                //return dbRewardTask.createRewardTask(rewardData);
                //create reward task proposal for player
                return dbProposal.createProposalWithTypeNameWithProcessInfo(rewardData.platformId, constProposalType.ADD_PLAYER_REWARD_TASK, {
                    creator: {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    }, data: rewardData
                });
            }
        })
    },

    /**
     *
     * @param rewardData
     */
    createRewardTask: (rewardData) => {
        let deferred = Q.defer();
        rewardData.bonusAmount = rewardData.initAmount;
        let rewardTask = new dbconfig.collection_rewardTask(rewardData);
        let taskProm = rewardTask.save();
        let playerProm = {validCredit: 0};

        dbconfig.collection_platform.findOne({_id: rewardData.platformId}).lean().then(
            platformData => {
                if (rewardData.useLockedCredit) {
                    if (platformData.canMultiReward) {
                        // Player's locked credit will increase from current lockedAmount
                        playerProm = dbconfig.collection_players.findOneAndUpdate(
                            {_id: rewardData.playerId, platform: rewardData.platformId},
                            {$inc: {lockedCredit: rewardData.initAmount}}
                        ).exec();
                    }
                    else {
                        playerProm = dbconfig.collection_players.findOneAndUpdate(
                            {_id: rewardData.playerId, platform: rewardData.platformId},
                            {lockedCredit: rewardData.initAmount}
                        ).exec();
                    }
                }
                return Promise.all([taskProm, playerProm]);
            }
        ).then(
            data => {
                if (data && data[0] && data[1]) {
                    if (rewardData.useLockedCredit) {
                        dbLogger.createCreditChangeLogWithLockedCredit(
                            rewardData.playerId, rewardData.platformId, 0, rewardData.rewardType,
                            data[1].validCredit, rewardData.currentAmount, rewardData.currentAmount, null, data[0]);
                    }
                    deferred.resolve(data[0]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot create reward task"});
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error creating reward task", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Get one reward task
     * @param {String} query - The query String.
     */
    getRewardTask: function (query) {
        return dbconfig.collection_rewardTask
            .findOne(query)
            .exec();
    },

    getPlayerRewardTask: function (playerId, from, to, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'createTime': -1};
        var queryObj = {
            playerId: playerId,
            createTime: {
                $gte: new Date(from),
                $lt: new Date(to)
            }
        }
        var a = dbconfig.collection_rewardTask.find(queryObj).count();
        var b = dbconfig.collection_rewardTask.find(queryObj).sort(sortCol).skip(index).limit(limit)
            .populate({path: "targetProviders", model: dbconfig.collection_gameProvider}).lean();
        return Q.all([a, b]).then(
            data => {
                return {size: data[0], data: data[1]}
            }
        )
    },

    /**
     * Get total count of specific user's pending proposal
     */

    getPendingRewardTaskCount: function (query, rewardTaskWithProposalList) {
        var deferred = Q.defer();

        dbconfig.collection_proposal
            .find(query)
            .populate({
                path: "type",
                model: dbconfig.collection_proposalType
            })
            .lean().then(
            function (tasks) {
                // if the proposal result is include in the rewardtasklist
                var chosenTask = [];
                tasks.forEach(function (task) {
                    if (task.type) {
                        var tname = task.type.name;
                        if (rewardTaskWithProposalList.indexOf(tname) != -1) {
                            chosenTask.push(task);
                        }
                    }
                });
                deferred.resolve(chosenTask.length);

            }, function (error) {
                deferred.reject({name: "DBError", message: "Error finding player reward task", error: error})
            }
        );
        return deferred.promise;
    },
    /**
     * TODO: (DEPRECATING) To change to getPlayerAllRewardTask after implement multiple player reward tasks
     * Get player's current reward task
     * @param {String} is player Object Id
     */
    getPlayerCurRewardTask: function (playerId) {
        return dbconfig.collection_rewardTask.findOne({
            playerId: playerId,
            status: constRewardTaskStatus.STARTED
        }).populate({
            path: "platformId",
            model: dbconfig.collection_platform
        }).exec();
    },

    /**
     * Get player's all available reward task
     * @param {String} playerId player Object Id
     */
    getPlayerAllRewardTask: function (playerId) {
        return dbconfig.collection_rewardTask.find({
            playerId: playerId,
            status: constRewardTaskStatus.STARTED
        }).sort({createdTime: 1}).lean().exec();
    },

    /**
     * Get player's current reward task
     * @param {JSON} is player Object Id
     */
    getPlayerCurRewardTaskByPlayerId: function (query) {
        var deferred = Q.defer();

        dbconfig.collection_players.findOne(query).then(
            function (data) {
                if (data) {
                    var playerObjId = data._id;
                    return dbconfig.collection_rewardTask.findOne(({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    })).populate({
                        path: "targetProviders",
                        model: dbconfig.collection_gameProvider
                    }).populate({
                        path: "eventId",
                        model: dbconfig.collection_rewardEvent
                    }).lean();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "No player found matching query"
                    });
                }

            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting reward task", error: error});
            }
        ).then(function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting reward task", error: error});
            });
        return deferred.promise;
    },


    /**
     * Created: 20170612
     * Purpose: Get player reward tasks by player object id
     * @param query
     */
    getPlayerAllRewardTaskDetailByPlayerObjId: (query) => {
        return dbconfig.collection_players.findOne(query).then(
            playerData => {
                if (playerData) {
                    let playerObjId = playerData._id;

                    return dbconfig.collection_rewardTask.find({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }).populate({
                        path: "targetProviders",
                        model: dbconfig.collection_gameProvider
                    }).populate({
                        path: "eventId",
                        model: dbconfig.collection_rewardEvent
                    }).lean();
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "No player found matching query"
                    });
                }

            },
            error => Q.reject({name: "DBError", message: "Error in getting reward task", error: error})
        ).then(
            rewardTasks => rewardTasks,
            error => Q.reject({name: "DBError", message: "Error in getting reward task", error: error})
        );
    },

    /**
     * Update reward task
     * @param {String} query - The query String.
     * @param {Json} updateData - The update data.
     */
    updateRewardTask: function (query, updateData) {
        //return dbconfig.collection_rewardTask.findOneAndUpdate(query, updateData).exec();
        return dbUtil.findOneAndUpdateForShard(dbconfig.collection_rewardTask, query, updateData, constShardKeys.collection_rewardTask);
    },

    /**
     * Remove reward tasks by id
     * @param {String} query - The query String.
     */
    removeRewardTasksById: function (ids) {
        return dbconfig.collection_rewardTask.remove({_id: {$in: ids}}).exec();
    },

    /**
     * check and update player's reward task info when player consume credit
     * @param {ObjectId} playerId - The player id.
     * @param {Object} consumptionRecord - consumptionRecord object
     */
    checkPlayerRewardTaskForConsumption: function (consumptionRecord) {
        let deferred = Q.defer();
        let bDirty = false;
        let bTaskAchieved = false;
        let createTime = new Date(consumptionRecord.createTime);

        // Starting from multiple reward, the oldest reward task will be taken to use
        dbconfig.collection_rewardTask.find(
            {
                playerId: consumptionRecord.playerId,
                status: constRewardTaskStatus.STARTED,
                createTime: {$lt: createTime},
                $or: [
                    {$and: [{targetEnable: true}, {$or: [{targetProviders: consumptionRecord.providerId}, {targetProviders: []}]}]},
                    {$and: [{targetEnable: false}, {targetProviders: {$not: {$elemMatch: {$eq: consumptionRecord.providerId}}}}]}
                ],
                // $
                // $or: [{targetGames: consumptionRecord.gameId}, {targetGames: []}],
                isUnlock: false
            }
        ).sort({createTime: 1}).limit(1).lean().then(
            tasks => {
                let taskData = tasks ? tasks[0] : null;
                return taskData ? taskData : false;
            },
            error => {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding consecutive top up reward task.",
                    error: error
                });
            }
        ).then(
            function (taskData) {
                if (taskData) {
                    taskData.unlockedAmount += (taskData.requiredBonusAmount > 0 ? 0 : consumptionRecord.validAmount);
                    taskData.bonusAmount += consumptionRecord.bonusAmount;
                    taskData.unlockedBonusAmount += (taskData.requiredBonusAmount > 0 ? consumptionRecord.bonusAmount : 0);

                    let bAchieved = false;
                    //for first top up reward, even after there is no credit left, still need to check consumption amount later
                    if (taskData.bonusAmount < 1 && taskData.rewardType != constRewardType.FIRST_TOP_UP) {
                        taskData.isUnlock = true;
                        taskData.unlockTime = createTime;
                        taskData.status = constRewardTaskStatus.NO_CREDIT;
                    }
                    //check player registration reward task
                    else if (taskData.unlockedBonusAmount >= taskData.requiredBonusAmount && taskData.requiredBonusAmount > 0) {
                        taskData.isUnlock = true;
                        taskData.status = constRewardTaskStatus.ACHIEVED;
                        taskData.unlockTime = createTime;
                        bAchieved = true;
                    }
                    else if (taskData.unlockedAmount >= taskData.requiredUnlockAmount && taskData.requiredUnlockAmount > 0) {
                        taskData.isUnlock = true;
                        taskData.status = constRewardTaskStatus.ACHIEVED;
                        taskData.unlockTime = createTime;
                        bAchieved = true;
                    }

                    return dbconfig.collection_rewardTask.findOneAndUpdate(
                        {_id: taskData._id, platformId: taskData.platformId},
                        {
                            $inc: {
                                unlockedAmount: (taskData.requiredBonusAmount > 0 ? 0 : consumptionRecord.validAmount),
                                bonusAmount: consumptionRecord.bonusAmount,
                                unlockedBonusAmount: (taskData.requiredBonusAmount > 0 ? consumptionRecord.bonusAmount : 0),
                            },
                            isUnlock: taskData.isUnlock,
                            status: taskData.status,
                            unlockTime: taskData.unlockTime
                        }
                    ).then(
                        newTaskData => {
                            var proms = [];
                            if (!newTaskData.isUnlock && bAchieved) {
                                bTaskAchieved = true;
                                proms.push(Q.resolve(taskData));
                            }
                            else {
                                proms.push(Q.resolve(taskData));
                            }
                            if (newTaskData.useConsumption && (bTaskAchieved || !bAchieved)) {
                                bDirty = true;
                                proms.push(dbconfig.collection_playerConsumptionRecord.findOneAndUpdate(
                                    {_id: consumptionRecord._id, createTime: consumptionRecord.createTime},
                                    {bDirty: true}
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
                    message: "Error finding consecutive top up reward task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data[0]) {
                    //if reward task is unlocked and it is ACHIEVED, give the reward task reward to player
                    //if (data[0].isUnlock && data[0].status == constRewardTaskStatus.ACHIEVED) {
                    if (bTaskAchieved) {
                        if (data[0].requiredBonusAmount > 0) {
                            //transfer player credit out if it is player registration reward task
                            return dbconfig.collection_players.findOne({_id: consumptionRecord.playerId}).populate(
                                {path: "lastPlayedProvider", model: dbconfig.collection_gameProvider}
                            ).lean().then(
                                playerObj => {
                                    if (playerObj && playerObj.lastPlayedProvider) {
                                        return dbPlayerInfo.transferPlayerCreditFromProvider(playerObj.playerId, null, playerObj.lastPlayedProvider.providerId, -1, null, null, data[0].requiredBonusAmount);
                                    }
                                    else {
                                        return dbRewardTask.completeRewardTask(data[0]);
                                    }
                                }
                            );
                        }
                        else {
                            return dbRewardTask.completeRewardTask(data[0]);
                        }
                    }
                    else {
                        return bDirty;
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't update reward task and consumption record"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating reward task and consumption record",
                    error: error
                });
            }
        ).then(
            function (data) {
                //check consumption record create time with last reward task
                if (!bDirty) {
                    dbconfig.collection_rewardTask.find(
                        {
                            playerId: consumptionRecord.playerId,
                            status: constRewardTaskStatus.NO_CREDIT,
                            isUnlock: true,
                            createTime: {$lt: createTime},
                            unlockTime: {$gte: createTime}
                        }
                    ).sort({unlockTime: -1}).lean().then(
                        noCreditTask => {
                            if (noCreditTask && noCreditTask[0] && noCreditTask[0].useConsumption) {
                                deferred.resolve(true);
                            }
                            else {
                                deferred.resolve(false);
                            }
                        }
                    );
                }
                else {
                    deferred.resolve(bDirty);
                }

            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error completing reward task", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * apply for manual unlock reward task
     * @param data
     * @param adminId
     * @param adminName
     */
    manualUnlockRewardTask: function (data, adminId, adminName) {
        let taskData = data[0];

        if (taskData) {
            let platformId = taskData.platformId;
            let proposalData = Object.assign({}, taskData);

            proposalData.playerObjId = taskData.playerId;
            proposalData.amount = Number(taskData.currentAmount);

            //check reward task status here
            return dbconfig.collection_rewardTask.findOne({_id: taskData._id}).lean().then(
                rewardTask => {
                    if (rewardTask && rewardTask.status == constRewardTaskStatus.STARTED) {
                        return dbProposal.createProposalWithTypeName(platformId, constProposalType.MANUAL_UNLOCK_PLAYER_REWARD,
                            {creator: {type: 'admin', name: adminName, id: adminId}, data: proposalData});
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Invalid reward task data or status"});
                    }
                }
            );
        } else {
            return Q.reject({name: "DataError", message: "Cannot find player or payment channel"});
        }
    },

    /**
     * complete a reward task and give the reward amount to player
     * @param {Object} taskData - reward task object
     */
    completeRewardTask: function (taskData) {
        let updateData = {};
        let inputCreditChange;
        return new Promise((resolve, reject) => {
            // Check that we have the input we need to proceed
            if (!taskData._id) {
                return Q.reject({
                    name: "DataError",
                    message: "Cannot update task with no _id: " + JSON.stringify(taskData)
                });
            }
            if (!taskData.platformId) {
                return Q.reject({
                    name: "DataError",
                    message: "Cannot update task with no platformId: " + JSON.stringify(taskData)
                });
            }

            let bUpdateProposal = false;
            let originalStatus = taskData.status;
            let rewardAmount = taskData.currentAmount;

            if (taskData.requiredBonusAmount > 0 && rewardAmount > taskData.requiredBonusAmount) {
                rewardAmount = taskData.requiredBonusAmount;
            }
            taskData.status = constRewardTaskStatus.COMPLETED;
            const taskProm = dbRewardTask.findOneAndUpdateWithRetry(
                dbconfig.collection_rewardTask,
                {_id: taskData._id, platformId: taskData.platformId},
                {status: constRewardTaskStatus.COMPLETED}
            );

            //if reward task if player top up return, increase the daily amount
            // if (taskData.type == constRewardType.PLAYER_TOP_UP_RETURN) {
            //     updateData.$inc.dailyTopUpIncentiveAmount = taskData.currentAmount;
            // }
            //if reward task if player top up reward, check max reward amount
            // if (taskData.type == constRewardType.PLAYER_TOP_UP_REWARD && taskData.currentAmount > taskData.maxRewardAmount) {
            //     bUpdateProposal = true;
            //     rewardAmount = taskData.maxRewardAmount;
            //     updateData.$inc = {validCredit: taskData.maxRewardAmount};
            // }

            dbconfig.collection_platform.findOne({_id: taskData.platformId}).lean().then(
                platformData => {
                    if (platformData.canMultiReward) {
                        // Changed from update lockedCredit from 0 to -rewardAmount
                        updateData = {
                            $inc: {validCredit: rewardAmount, lockedCredit: -rewardAmount},
                        };

                        if (taskData.inProvider) {
                            inputCreditChange = {
                                $inc: {_inputCredit: taskData.initAmount}
                            }
                        }
                    }
                    else {
                        updateData = {
                            $inc: {validCredit: rewardAmount},
                            lockedCredit: 0
                        };
                    }

                    return taskProm;
                }
            ).then(
                rewardTask => {
                    // This is the old document we have replaced. If the old document had already been marked as completed by another process, then we will not proceed.
                    if (rewardTask && rewardTask.status != constRewardTaskStatus.COMPLETED) {
                        if (inputCreditChange) {
                            // If there are other tasks available increase the _inputCredit so the amount that will moved to validCredit when transfer out will increase
                            return dbRewardTask.updateWithRetry(
                                dbconfig.collection_rewardTask,
                                {
                                    playerId: taskData.playerId,
                                    platformId: taskData.platformId,
                                    status: constRewardTaskStatus.STARTED
                                },
                                inputCreditChange,
                                {multi: true}
                            ).then(
                                () => {
                                    if (taskData.useLockedCredit) {
                                        return dbRewardTask.findOneAndUpdateWithRetry(
                                            dbconfig.collection_players,
                                            {_id: taskData.playerId, platform: taskData.platformId},
                                            updateData,
                                            {new: true}
                                        );
                                    }
                                    else {
                                        return true;
                                    }
                                },
                                error => {
                                    console.log(error);
                                    return false;
                                }
                            )
                        } else {
                            if (taskData.useLockedCredit) {
                                return dbRewardTask.findOneAndUpdateWithRetry(
                                    dbconfig.collection_players,
                                    {_id: taskData.playerId, platform: taskData.platformId},
                                    updateData,
                                    {new: true}
                                );
                            }
                            else {
                                return true;
                            }
                        }
                    }
                    else {
                        reject({name: "DataError", message: "Incorrect reward task status"});
                    }
                },
                error => {
                    console.log("Update reward task to complete failed", error, rewardTask);
                    reject({name: "DataError", message: "Fail to update reward task", error: error});
                }
            ).then(
                data => {
                    if (data) {
                        if (taskData.useLockedCredit) {
                            dbLogger.createCreditChangeLogWithLockedCredit(taskData.playerId, taskData.platformId, rewardAmount, taskData.type + ":unlock", data.validCredit, 0, -rewardAmount, null, taskData);
                        }
                        resolve(taskData.currentAmount);
                    }
                    else {
                        reject({name: "DataError", message: "Can't update reward task and player credit"});
                    }
                },
                error => {
                    console.log("Update player credit failed when complete reward task", error, taskData);
                    reject({
                        name: "DBError",
                        message: "Error updating reward task and player credit",
                        error: error
                    });
                }
            );
        })
    },

    findOneAndUpdateWithRetry: function (model, query, update, options) {
        const maxAttempts = 4;
        const delayBetweenAttempts = 500;

        const attemptUpdate = (currentAttemptCount) => {
            return model.findOneAndUpdate(query, update, options).catch(
                error => {
                    if (currentAttemptCount >= maxAttempts) {
                        // This is a bad situation, so we log a lot to help debugging
                        console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed.  query=`, query, `update=`, update, `error=`, error);
                        return Q.reject({
                            name: 'DBError',
                            message: "Failed " + currentAttemptCount + " attempts to findOneAndUpdate",
                            //collection: '...',
                            query: query,
                            update: update,
                            error: error
                        });
                    }

                    console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed with "${error}", retrying...`);
                    return Q.delay(delayBetweenAttempts).then(
                        () => attemptUpdate(currentAttemptCount + 1)
                    );
                }
            );
        };

        return attemptUpdate(1);
    },

    updateWithRetry: function (model, query, update, options) {
        const maxAttempts = 4;
        const delayBetweenAttempts = 500;

        const attemptUpdate = (currentAttemptCount) => {
            return model.update(query, update, options).catch(
                error => {
                    if (currentAttemptCount >= maxAttempts) {
                        // This is a bad situation, so we log a lot to help debugging
                        console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed.  query=`, query, `update=`, update, `error=`, error);
                        return Q.reject({
                            name: 'DBError',
                            message: "Failed " + currentAttemptCount + " attempts to update",
                            //collection: '...',
                            query: query,
                            update: update,
                            error: error
                        });
                    }

                    console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed with "${error}", retrying...`);
                    return Q.delay(delayBetweenAttempts).then(
                        () => attemptUpdate(currentAttemptCount + 1)
                    );
                }
            );
        };

        return attemptUpdate(1);
    },

    getPlatformRewardAnalysis: function (type, period, platformId, startDate, endDate) {
        //refractorTime
        // var options = {};
        // switch (period) {
        //     case 'day':
        //         options.date = {$dateToString: {format: "%Y-%m-%d", date: "$createTime"}};
        //         break;
        //     case 'week':
        //         options.week = {$floor: {$divide: [{$subtract: ["$createTime", startTime]}, 604800000]}};
        //         break;
        //     case 'month':
        //     default:
        //         options.year = {$year: "$createTime"};
        //         options.month = {$month: "$createTime"};
        // }
        // return dbconfig.collection_proposalType.findOne({
        //     platformId: platformId,
        //     name: type
        // }).then(
        //     function (data) {
        //         var typeId = data._id;
        //         return dbconfig.collection_proposal
        //             .aggregate(
        //                 {
        //                     $match: {
        //                         'data.platformId': platformId,
        //                         createTime: {$gte: startTime, $lt: endTime},
        //                         type: typeId
        //                     }
        //                 },
        //                 {
        //                     $group: {_id: options, number: {$sum: 1}, amount: {$sum: '$data.rewardAmount'}}
        //                 }
        //             ).exec()
        //     })
        var proms = [];
        var dayStartTime = startDate;
        var getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }
        return dbconfig.collection_proposalType.findOne({
            platformId: platformId,
            name: type
        }).then(function (data) {
            var typeId = data._id;
            while (dayStartTime.getTime() < endDate.getTime()) {
                var dayEndTime = getNextDate.call(this, dayStartTime);
                var matchObj = {
                    platformId: platformId,
                    loginTime: {$gte: dayStartTime, $lt: dayEndTime},
                    type: typeId
                };
                proms.push(dbconfig.collection_proposal
                    .aggregate(
                        {
                            $match: {
                                'data.platformId': platformId,
                                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                                type: typeId
                            }
                        },
                        {
                            $group: {_id: null, number: {$sum: 1}, amount: {$sum: '$data.rewardAmount'}}
                        }
                    ))
                dayStartTime = dayEndTime;
            }
            return Q.all(proms)
        }).then(data => {
            var i = 0;
            var tempDate = startDate;
            var res = data.map(item => {
                var date = tempDate;
                var obj = {
                    _id: {date: date},
                    number: item[0] ? item[0].number : 0,
                    amount: item[0] ? item[0].amount : 0
                }
                tempDate = getNextDate(tempDate);
                return obj;
            });
            return res;
        });

    },

    getPlatformRewardPageReport: function (constType, platformId, startTime, endTime, index, limit, sortCol, evnetId) {
        index = Math.min(index, constSystemParam.REPORT_MAX_RECORD_NUM);
        limit = limit || 10;
        sortCol = sortCol || {"createTime": -1};
        var matchObj = constType ? {
            platformId: platformId,
            type: constType,
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            eventId: evnetId
        } : {
            platformId: platformId,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        }

        var a = dbconfig.collection_rewardTask.find(matchObj).sort(sortCol).skip(index).limit(limit)
            .populate({path: "playerId", model: dbconfig.collection_players})
            .populate({path: "data.playerId", model: dbconfig.collection_players});
        var b = dbconfig.collection_rewardTask.find(matchObj).count();
        var c = dbconfig.collection_rewardTask.aggregate(
            {$match: matchObj}, {
                $group: {
                    _id: null,
                    unlockedAmountSum: {$sum: "$unlockedAmount"},
                    currentAmountSum: {$sum: "$currentAmount"}
                }
            })
        return Q.all([a, b, c]).then(
            data => {
                var summaryObj = data[2] ? data[2][0] : {};
                return {data: data[0], size: data[1], summary: summaryObj};
            }
        )
    },

    /**
     * // TODO:: Might need to get oldest reward to update
     * @param playerObjId
     * @returns {*}
     */
    checkPlayerRewardTaskStatus: function (playerObjId) {
        var playerObj = null;
        var taskObj = null;
        return dbconfig.collection_players.findOne({_id: playerObjId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    var providerProm = dbconfig.collection_gameProvider.find({_id: {$in: playerData.platform.gameProviders}}).lean();
                    var taskProm = dbconfig.collection_rewardTask.findOne({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED,
                        //inProvider: true
                    }).lean();
                    return Q.all([providerProm, taskProm]);
                }
            }
        ).then(
            data => {
                if (data && data[0] && data[0].length > 0 && data[1]) {
                    taskObj = data[1];
                    var proms = data[0].map(
                        provider => dbGameProvider.getPlayerCreditInProvider(playerObj.name,
                            playerObj.platform.platformId, provider.providerId)
                    );
                    return Q.all(proms)
                }
            }
        ).then(
            creditData => {
                if (creditData && taskObj) {
                    var playerCredit = playerObj.lockedCredit + playerObj.validCredit;
                    var totalCredit = 0;
                    creditData.forEach(
                        credit => {
                            var gameCredit = (parseFloat(credit.gameCredit) || 0);
                            totalCredit += gameCredit < 1 ? 0 : gameCredit;
                        });
                    if (totalCredit < 1 && playerCredit < 1 && taskObj.rewardType != constRewardType.FIRST_TOP_UP) {
                        return dbconfig.collection_rewardTask.findOneAndUpdate(
                            {_id: taskObj._id, platformId: taskObj.platformId},
                            {
                                status: constRewardTaskStatus.NO_CREDIT,
                                isUnlock: true,
                                unlockTime: new Date()
                            }
                        );
                    }
                }
            }
        );
    },

    checkPlatformPlayerRewardTask: function (platformObjId) {
        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {
            //if there is commission config, start settlement
            var stream = dbconfig.collection_rewardTask.find(
                {
                    platformId: platformObjId,
                    status: constRewardTaskStatus.STARTED,
                    inProvider: true
                }
            ).cursor({batchSize: 100});

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "checkPlatformPlayersRewardTask", {
                            playerObjIds: playerIdObjs.map(playerIdObj => playerIdObj.playerId)
                        });
                    }
                })
            );
        });
    },

    checkPlatformPlayersRewardTask: function (playerObjIds) {
        var proms = playerObjIds.map(
            playerObjId => dbRewardTask.checkPlayerRewardTaskStatus(playerObjId)
        );
        return Q.all(proms);
    },

    fixPlayerRewardAmount: function (playerId) {
        let playerObj = null;
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform}
            ).lean().then(
                playerData => {
                    if (playerData) {
                        playerObj = playerData;

                        if (!playerObj.platform.canMultiReward) {
                            return dbconfig.collection_rewardTask.findOne(
                                {playerId: playerData._id, status: constRewardTaskStatus.STARTED}
                            ).lean();
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can not find player"});
                    }
                }
            ).then(
                taskData => {
                    if (taskData) {
                        return Q.reject({name: "DataError", message: "Reward task is not completed"});
                    }
                    else {
                        if (playerObj.lockedCredit >= 1) {
                            playerObj.validCredit += playerObj.lockedCredit;
                            return dbconfig.collection_players.findOneAndUpdate({
                                _id: playerObj._id,
                                platform: playerObj.platform
                            }, {
                                $inc: {validCredit: playerObj.lockedCredit},
                                lockedCredit: 0
                            }).then(() => {
                                playerObj.fixedStatus = 'fixed';
                                playerObj.lockedCredit = 0;
                                return playerObj;
                            });
                        } else {
                            playerObj.fixedStatus = 'unnecessary';
                            return playerObj;
                        }
                    }
                }
            );
    }

};

var proto = dbRewardTaskFunc.prototype;
proto = Object.assign(proto, dbRewardTask);

// This make WebStorm navigation work
module.exports = dbRewardTask;
