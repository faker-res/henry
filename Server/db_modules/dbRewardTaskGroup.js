'use strict';

const dbconfig = require('./../modules/dbproperties');
const dbRewardTask = require('./../db_modules/dbRewardTask');

const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const constServerCode = require('../const/constServerCode');
const constSystemParam = require('./../const/constSystemParam');
const errorUtils = require("../modules/errorUtils.js");
const SettlementBalancer = require('../settlementModule/settlementBalancer');
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

    addRemainingConsumptionToFreeAmountRewardTaskGroup: (platformId, playerId, createTime, remainCurConsumption, remainBonusAmt = 0) => {
        let remainingAmount = remainCurConsumption;

        console.log('LK RemainingConsumption RTG update checking--', playerId);
        return dbconfig.collection_rewardTaskGroup.find({
            platformId: platformId,
            playerId: playerId,
            providerGroup: null,
            status: {$in: [constRewardTaskStatus.STARTED]},
            createTime: {$lt: createTime}
        }).sort({createTime: 1}).lean().then(
            RTGs => {
                console.log('LK RemainingConsumption RTG list--', RTGs);
                if (RTGs && RTGs.length) {
                    let promArr = [];

                    RTGs.forEach(RTG => {
                        console.log('LK RemainingConsumption RTG detail--', RTG);
                        if (remainingAmount > 0) {
                            let requiredConsumption = RTG.targetConsumption + RTG.forbidXIMAAmt - RTG.curConsumption;
                            let status, unlockTime;

                            if (RTG.currentAmt + remainBonusAmt < 1){
                                status = constRewardTaskStatus.NO_CREDIT;
                                unlockTime = createTime;
                            }
                            else if (remainingAmount >= requiredConsumption) {
                                status = constRewardTaskStatus.ACHIEVED;
                                unlockTime = createTime;
                            } else {
                                requiredConsumption = remainingAmount;
                            }

                            let updObj = {
                                $inc: {
                                    currentAmt: remainBonusAmt,
                                    curConsumption: requiredConsumption ? requiredConsumption : 0
                                }
                            };

                            if (status && unlockTime) {
                                updObj.status = status;
                                updObj.unlockTime = unlockTime;
                            }

                            console.log('LK RemainingConsumption RTG update obj--', updObj);
                            promArr.push(
                                dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                    {_id: RTG._id},
                                    updObj
                                ).then(updatedData => {
                                    if (updatedData && updatedData.status === constRewardTaskStatus.STARTED) {
                                        // Transfer amount to player if reward is achieved
                                        if (updObj.status === constRewardTaskStatus.ACHIEVED) {
                                            return dbRewardTask.completeRewardTaskGroup(updatedData, updObj.status);
                                        }
                                    }
                                })
                            );

                            remainingAmount -= requiredConsumption;
                        }
                    });

                    return Promise.all(promArr);
                }
            }
        )
    },

    deletePlatformProviderGroup: (gameProviderGroupObjId) => {
        return dbconfig.collection_rewardTaskGroup.find({
            providerGroup: {$in: gameProviderGroupObjId, $ne: null},
            status: constRewardTaskStatus.STARTED
        }).lean().then(
            rewardTaskGroups => {
                let proms = [];

                if (rewardTaskGroups && rewardTaskGroups.length > 0) {
                    rewardTaskGroups.forEach(grp => {
                        let updObj = {
                            status: constRewardTaskStatus.SYSTEM_UNLOCK,
                            unlockTime: new Date()
                        };

                        console.log('RTG unlock due to provider group delete', grp._id);

                        proms.push(
                            dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                                _id: grp._id
                            }, updObj
                            ).then(res => {
                                // Concurrency measurement
                                if (res && res.status === constRewardTaskStatus.STARTED) {
                                    return dbRewardTask.completeRewardTaskGroup(res, updObj.status)
                                }
                            })
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

    getPlayerAllRewardTaskGroupDetailByPlayerObjId: (query, createTime) => {
        return dbconfig.collection_players.findOne(query).lean().then(
            playerData => {
                if (playerData) {
                    let playerObjId = playerData._id;
                    let rtgQ = {
                        platformId: playerData.platform,
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    };

                    if (createTime) {
                        rtgQ.createTime = {$lt: createTime}
                    }

                    return dbconfig.collection_rewardTaskGroup.find(rtgQ).populate({
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
     * @param {ObjectId} adminId
     * @param {String} adminName
     * @returns {Promise}
     */
    unlockRewardTaskInRewardTaskGroup: (rewardTaskGroupId, incRewardAmount, incConsumptionAmount, adminId, adminName) => {
        let unlockTime = new Date();

        // Debug log
        console.log('unlockRewardTaskInRewardTaskGroup', rewardTaskGroupId, incRewardAmount, incConsumptionAmount, adminId, adminName);

        return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
            _id: ObjectId(rewardTaskGroupId)
        }, {
            $inc: {
                currentAmt: -incRewardAmount,
                curConsumption: incConsumptionAmount
            },
            unlockBy: adminName,
            unlockTime: unlockTime
        }, {
            new: true
        }).then(
            updatedData => {
                if (updatedData
                    && (updatedData.currentAmt <= 0 || updatedData.curConsumption >= updatedData.targetConsumption + updatedData.forbidXIMAAmt)
                    // Concurrency measurement
                    && updatedData.unlockTime.getTime() === unlockTime.getTime()
                ) {
                    return dbRewardTask.completeRewardTaskGroup(updatedData, constRewardTaskStatus.MANUAL_UNLOCK);
                }
            }
        );
    },

    createRewardTaskGroupUnlockedRecord: (data) => {
        let query = {
            platformId: ObjectId(data.platformId),
            playerId: ObjectId(data.playerId),
            proposalNumber: data.proposalNumber,
            topupProposalNumber: data.topupProposalNumber,
            'rewardTask.type': data.rewardTask.type,
            targetProviderGroup: data.targetProviderGroup,

        };
        return dbconfig.collection_rewardTaskGroupUnlockedRecord.findOne(query).lean().then( inData => {
            if (!inData){
                var rewardTaskGroupUnlockedRecord = new dbconfig.collection_rewardTaskGroupUnlockedRecord(data);
                return rewardTaskGroupUnlockedRecord.save();
            }else{
                return;
            }
        })
    },


    startPlatformUnlockRewardTaskGroup: (platformObjId) => {
        let stream = dbconfig.collection_rewardTaskGroup.find(
            {
                platformId: ObjectId(platformObjId),
                status: constRewardTaskStatus.STARTED
            }
        ).cursor({batchSize: 10000});

        let balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            return balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (rewardTaskGroup, request) {
                        request("player", "performUnlockPlatformProviderGroup", {
                            rewardTaskGroup: rewardTaskGroup
                        });
                    }
                }
            );
        });
    },

    performUnlockPlatformProviderGroup: (rewardTaskGroup, adminInfo) => {
        let promsArr = [];
        rewardTaskGroup.map(reward => {
            promsArr.push(
                dbRewardTaskGroup.unlockRewardTaskInRewardTaskGroup(
                    reward._id,
                    reward.targetConsumption,
                    reward.targetConsumption + reward.forbidXIMAAmt,
                    adminInfo.id,
                    adminInfo.name
                ).catch(errorUtils.reportError));
        });

        return Promise.all(promsArr);
    },

    unlockPlayerRewardTask: (playerObjId, adminInfo) => {
        return dbconfig.collection_rewardTaskGroup.find(
            {
                playerId: ObjectId(playerObjId),
                status: constRewardTaskStatus.STARTED
            }
        ).lean().then(
            rewardTaskGroups => {
                return dbRewardTaskGroup.performUnlockPlatformProviderGroup(rewardTaskGroups, adminInfo);
            }
        );
    },

    unlockRewardTaskGroupByObjId: (rewardTaskGroup) => {
        let updObj = {
            status: constRewardTaskStatus.SYSTEM_UNLOCK,
            unlockTime: new Date()
        };

        console.log('system unlock rtg', rewardTaskGroup._id)

        return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
            _id: rewardTaskGroup._id
        }, updObj).then(res => {
            // Concurrency measurement
            if (res && res.status === constRewardTaskStatus.STARTED) {
                return dbRewardTask.completeRewardTaskGroup(res, updObj.status)
            }
        });
    },

    getPrevious10PlayerRTG: (platformId, playerId) => {
        return dbconfig.collection_rewardTaskGroup.find({
            platformId: platformId,
            playerId: playerId
        }).sort({createTime:-1}).limit(30).lean();
    },

};

module.exports = dbRewardTaskGroup;