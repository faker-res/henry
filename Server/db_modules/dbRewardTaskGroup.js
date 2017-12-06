'use strict';

const dbconfig = require('./../modules/dbproperties');
const dbRewardTask = require('./../db_modules/dbRewardTask');

const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const constServerCode = require('../const/constServerCode');

let dbRewardTaskGroup = {
    getPlayerRewardTaskGroup: (platformId, providerId, playerId, createTime) => {
        return dbconfig.collection_gameProviderGroup.findOne({
            platform: platformId,
            providers: providerId
        }).lean().then(
            gameProviderGroup => {
                if (gameProviderGroup) {
                    // Search for reward task group of this player on this provider
                    return dbconfig.collection_rewardTaskGroup.findOne({
                        platformId: platformId,
                        playerId: playerId,
                        providerGroup: gameProviderGroup._id,
                        status: {$in: [constRewardTaskStatus.STARTED]},
                        createTime: {$lt: createTime}
                    }).lean();
                }
            }
        )
    },

    deletePlatformProviderGroup: (gameProviderGroupObjId) => {
        return dbconfig.collection_rewardTaskGroup.find({
            providerGroup: gameProviderGroupObjId,
            status: constRewardTaskStatus.STARTED
        }).then(
            rewardTaskGroups => {
                let proms = [];

                if (rewardTaskGroups && rewardTaskGroups.length > 0) {
                    rewardTaskGroups.forEach(grp => {
                        let updObj = {
                            status: constRewardTaskStatus.SYSTEM_UNLOCK,
                            unlockTime: new Date()
                        };

                        proms.push(
                            dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                                _id: grp._id
                            }, updObj).then(
                                () => dbRewardTask.completeRewardTaskGroup(grp)
                            )
                        );
                    });
                }

                return Promise.all(proms);
            }
        ).then(
            () => {
                //For Reward Points Task
                return dbconfig.collection_rewardPointsTask.find({
                    providerGroup: gameProviderGroupObjId,
                    status: constRewardTaskStatus.STARTED
                })
            }
        ).then(
            rewardPointsTasks => {
                let proms = [];

                if (rewardPointsTasks && rewardPointsTasks.length > 0) {
                    rewardPointsTasks.forEach(task => {
                        let updObj = {
                            status: constRewardTaskStatus.SYSTEM_UNLOCK,
                            unlockTime: new Date()
                        };

                        proms.push(
                            dbconfig.collection_rewardPointsTask.findOneAndUpdate({
                                _id: task._id
                            }, updObj)
                        );
                    });
                }
                return Promise.all(proms);
            }
        ).then(
            () => {
                // Delete this game provider group
                return dbconfig.collection_gameProviderGroup.remove({
                    _id: gameProviderGroupObjId
                });
            }
        )
    },

    getPlayerAllRewardTaskGroupDetailByPlayerObjId: (query) => {
        return dbconfig.collection_players.findOne(query).then(
            playerData => {
                if (playerData) {
                    let playerObjId = playerData._id;

                    return dbconfig.collection_rewardTaskGroup.find({
                        platformId: playerData.platform,
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }).populate({
                        path: "providerGroup",
                        model: dbconfig.collection_gameProviderGroup
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
};

module.exports = dbRewardTaskGroup;