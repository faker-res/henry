'use strict';

const dbconfig = require('./../modules/dbproperties');
const dbRewardTask = require('./../db_modules/dbRewardTask');

const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const constServerCode = require('../const/constServerCode');
let ObjectId = mongoose.Types.ObjectId;

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
                    }).lean().then(
                        rewardTaskLog => {
                            if (rewardTaskLog) {
                                return rewardTaskLog;
                            } else {
                                return dbconfig.collection_rewardTaskGroup.findOne({
                                    platformId: platformId,
                                    playerId: playerId,
                                    providerGroup: null,
                                    status: {$in: [constRewardTaskStatus.STARTED]},
                                    createTime: {$lt: createTime}
                                }).lean()
                            }
                        }
                    );
                }
            }
        )
    },

    getFreeAmountRewardTaskGroup: (platformId, playerId, createTime) => {

        return dbconfig.collection_rewardTaskGroup.findOne({
            platformId: platformId,
            playerId: playerId,
            providerGroup: null,
            status: constRewardTaskStatus.STARTED,
            createTime: {$lt: createTime}
        }).lean();
    },

    addRemainingConsumptionToFreeAmountRewardTaskGroup: (platformId, playerId, createTime, remainCurConsumption) => {
        return dbconfig.collection_rewardTaskGroup.findOne({
            platformId: platformId,
            playerId: playerId,
            providerGroup: null,
            status: {$in: [constRewardTaskStatus.STARTED]},
            createTime: {$lt: createTime}
        }).lean().then(freeRewardTaskGroup =>{
            if(freeRewardTaskGroup){
                freeRewardTaskGroup.curConsumption += remainCurConsumption ? remainCurConsumption : 0;
                //freeRewardTaskGroup.currentAmt += consumptionRecord.bonusAmount;

                // Check whether player has lost all credit
                if (freeRewardTaskGroup.currentAmt < 1){
                    freeRewardTaskGroup.status = constRewardTaskStatus.NO_CREDIT;
                    freeRewardTaskGroup.unlockTime = createTime;
                }
                // Consumption reached
                else if (freeRewardTaskGroup.curConsumption >= freeRewardTaskGroup.targetConsumption + freeRewardTaskGroup.forbidXIMAAmt) {
                    freeRewardTaskGroup.status = constRewardTaskStatus.ACHIEVED;
                    freeRewardTaskGroup.unlockTime = createTime;
                }

                let updObj = {
                    $inc: {
                        //currentAmt: consumptionRecord.bonusAmount,
                        curConsumption: remainCurConsumption ? remainCurConsumption : 0
                    },
                    status: freeRewardTaskGroup.status,
                    unlockTime: freeRewardTaskGroup.unlockTime
                };

                return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                    {_id: freeRewardTaskGroup._id},
                    updObj,
                    {new: true}
                );
            }
        }).then(updatedData => {
            if (updatedData) {
                // Transfer amount to player if reward is achieved
                if (updatedData.status == constRewardTaskStatus.ACHIEVED) {
                    return dbRewardTask.completeRewardTaskGroup(updatedData, updatedData.status);
                }
            }
        })
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
                                () => dbRewardTask.completeRewardTaskGroup(grp, constRewardTaskStatus.SYSTEM_UNLOCK)
                            )
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

    /**
     * For FPMS manual unlock use only
     * @param {ObjectId} rewardTaskGroupId
     * @param {Number} incRewardAmount
     * @param {Number} incConsumptionAmount
     */
    unlockRewardTaskInRewardTaskGroup: (rewardTaskGroupId, incRewardAmount, incConsumptionAmount) => {
        return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
            _id: ObjectId(rewardTaskGroupId)
        }, {
            $inc: {
                currentAmt: -incRewardAmount,
                curConsumption: incConsumptionAmount
            }
        }, {
            new: true
        }).then(
            updatedData => {
                if (updatedData && (updatedData.currentAmt <= 0 || updatedData.curConsumption >= updatedData.targetConsumption)) {
                    return dbRewardTask.completeRewardTaskGroup(updatedData, constRewardTaskStatus.MANUAL_UNLOCK);
                }
            }
        );
    },
};

module.exports = dbRewardTaskGroup;