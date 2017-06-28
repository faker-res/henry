const Q = require("q");

const constPlayerCreditTransferStatus = require("./../const/constPlayerCreditTransferStatus");
const constServerCode = require('./../const/constServerCode');
const constSystemParam = require("../const/constSystemParam.js");

const dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
const dbRewardTask = require('./../db_modules/dbRewardTask');

const cpmsAPI = require("../externalAPI/cpmsAPI");

const counterManager = require('./../modules/counterManager');
const dbConfig = require('./../modules/dbproperties');
const dbLogger = require("./../modules/dbLogger");
const errorUtils = require("./../modules/errorUtils");

const dbPlayerCreditTransfer = {

    /**
     * TODO: NOT YET COMPLETE
     * Transfer player credit from local to provider
     * @param playerObjId
     * @param {String} providerId
     * @param amount
     * @param forSync
     */
    playerCreditTransferToProvider: (playerObjId, providerId, amount, forSync) => {
        let gameAmount = 0;
        let rewardAmount = 0;
        let providerAmount = 0;
        let playerCredit = 0;
        let rewardTaskAmount = 0;
        let rewardDataObj = null;
        let playerData = null;
        let rewardData = null;
        let bUpdateReward = false;
        let transferAmount = 0;
        let bTransfered = false;
        let transferId = new Date().getTime();
        let totalLockedAmount = 0;

        return dbConfig.collection_players.findOne({_id: playerObjId}).then(
            playerData1 => {
                if (playerData1) {
                    playerData = playerData1;
                    // Check player have enough credit
                    if ((parseFloat(playerData1.validCredit.toFixed(2)) + playerData1.lockedCredit) < 1 || amount == 0) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "NumError",
                            errorMessage: "Player does not have enough credit."
                        });
                    }
                    // Check player current reward task
                    return dbRewardTask.getPlayerAllRewardTask(playerObjId)
                } else {
                    return Q.reject({name: "DataError", message: "Can't find player information."});
                }
            },
            err => {
                return Q.reject({name: "DataError", message: "Can't find player information.", error: err});
            }
        ).then(
            taskData => {
                // Player has enough credit
                rewardData = taskData;

                //if amount is less than 0, means transfer all
                transferAmount = amount > 0 ? amount : parseFloat(playerData.validCredit.toFixed(2));

                if (!rewardData) {
                    // Player has no reward ongoing
                    transferAmount = Math.floor(transferAmount);
                    gameAmount = transferAmount;
                    rewardData = true;
                }
                else {
                    // Player has ongoing reward
                    rewardDataObj = rewardData;

                    rewardData = rewardData.forEach(reward => {
                        totalLockedAmount += reward.currentAmount ? reward.currentAmount : 0;

                        if ((!reward.targetProviders || reward.targetProviders.length <= 0 ) // target all providers
                            || (reward.targetEnable && reward.targetProviders.indexOf(providerId) >= 0)//target this provider
                            || (!reward.targetEnable && reward.targetProviders.indexOf(providerId) < 0)//banded provider
                        ) {
                            if (reward.inProvider == true) {
                                // Already in provider
                                // if (String(playerData.lastPlayedProvider) != String(providerId)) {
                                //     return Q.reject({name: "DataError", message: "Player is playing a different game"});
                                // }

                                // For non-player registration reward task
                                if (reward.requiredBonusAmount > 0) {
                                    transferAmount = 0;
                                    gameAmount = transferAmount;
                                }
                                else {
                                    transferAmount = Math.floor(transferAmount);
                                    gameAmount = transferAmount;
                                    reward._inputCredit += transferAmount;
                                    bUpdateReward = true;
                                }
                            } else {
                                //not in provider yet
                                // for player registration reward task
                                if (rewardData.requiredBonusAmount > 0) {
                                    transferAmount = 0;
                                    gameAmount = Math.floor(reward.currentAmount);
                                    rewardAmount = Math.floor(reward.currentAmount);
                                    rewardTaskAmount = reward.currentAmount - gameAmount;
                                    reward.currentAmount = rewardTaskAmount;
                                    reward.inProvider = true;
                                }
                                else {
                                    //process floating point
                                    gameAmount = Math.floor(transferAmount + reward.currentAmount);
                                    let remainingAmount = transferAmount + reward.currentAmount - gameAmount;
                                    if (remainingAmount > playerData.validCredit) {
                                        transferAmount = 0;
                                        rewardAmount = Math.floor(reward.currentAmount || 0);
                                    }
                                    else {
                                        amount = gameAmount - rewardData.currentAmount;
                                        rewardAmount = rewardData.currentAmount
                                    }
                                    rewardTaskAmount = rewardData.currentAmount - rewardAmount;
                                    rewardData.inProvider = true;
                                    rewardData._inputCredit = amount;
                                    rewardData.currentAmount = rewardTaskAmount;
                                }
                                bUpdateReward = true;
                            }
                        } else {
                            // not this provider
                            amount = Math.floor(amount);
                            gameAmount = amount;
                        }
                    })
                }

                transferAmount = gameAmount;
                if (transferAmount < 1) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "NumError",
                        errorMessage: "Player does not have enough credit."
                    });
                }

                // Deduct amount from player validCredit before transfer
                // Amount is already floored
                // let decreaseAmount = amount < playerData.validCredit ? amount : playerData.validCredit;
                let updateObj = {
                    lastPlayedProvider: providerId,
                    $inc: {validCredit: -transferAmount}
                };
                if (bUpdateReward) {
                    updateObj.lockedCredit = rewardData.currentAmount;
                }
                return dbConfig.collection_players.findOneAndUpdate(
                    {_id: playerObjId, platform: playerData.platform},
                    updateObj,
                    {new: true}
                );
            },
            err => {
                return Q.reject({name: "DBError", message: "Cant find player current reward.", error: err});
            }
        ).then(
            // Double check if player's credit is enough to transfer
            // to prevent concurrent deduction
            updateData => {
                if (updateData) {
                    if (updateData.validCredit < -0.02) {
                        // Player credit is less than expected after deduct, revert the decrement
                        return dbConfig.collection_players.findOneAndUpdate(
                            {_id: playerObjId, platform: playerData.platform},
                            {$inc: {validCredit: transferAmount}},
                            {new: true}
                        ).catch(errorUtils.reportError).then(
                            () => Q.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "NumError",
                                errorMessage: "Player does not have enough credit."
                            })
                        );
                    }
                    else {
                        playerCredit = updateData.validCredit;
                        // Fix float number problem after update
                        if (updateData.validCredit > -0.02 && updateData.validCredit < 0) {
                            playerCredit = 0;
                            return dbConfig.collection_players.findOneAndUpdate(
                                {_id: playerObjId, platform: playerData.platform},
                                {validCredit: 0},
                                {new: true}
                            );
                        }
                        else {
                            return true;
                        }
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cant update player credit."});
                }
            }
        ).then(
            data => {
                if (data) {
                    bTransfered = true;
                    if (forSync) {
                        return true;
                    }
                    return counterManager.incrementAndGetCounter("transferId").then(
                        id => {
                            transferId = id;
                            //let lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                            // Second log before call cpmsAPI
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, playerData.platform, platformId, "transferIn",
                                id, providerShortId, transferAmount, lockedAmount, adminName, null, constPlayerCreditTransferStatus.SEND);
                            return cpmsAPI.player_transferIn(
                                {
                                    username: userName,
                                    platformId: platformId,
                                    providerId: providerShortId,
                                    transferId: id, //chance.integer({min: 1000000000000000000, max: 9999999999999999999}),
                                    credit: transferAmount
                                }
                            ).then(
                                res => res,
                                error => {
                                    // var lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                                    let status = (error.error && error.error.errorMessage && error.error.errorMessage.indexOf('Request timeout') > -1) ? constPlayerCreditTransferStatus.TIMEOUT : constPlayerCreditTransferStatus.FAIL;
                                    // Third log - transfer in failed
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform, platformId, "transferIn",
                                        id, providerShortId, transferAmount, lockedAmount, adminName, error, status);
                                    error.hasLog = true;
                                    return Q.reject(error);
                                }
                            );
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "NumError",
                        errorMessage: "Player does not have enough credit."
                    });
                }
            }
        ).then(
            data => {
                if (data) {
                    if (bUpdateReward) {
                        return dbRewardTask.updateRewardTask(
                            {
                                _id: rewardData._id,
                                platformId: rewardData.platformId
                            }, {
                                inProvider: rewardData.inProvider,
                                _inputCredit: rewardData._inputCredit,
                                currentAmount: rewardData.currentAmount
                            }
                        );
                    }
                    else {
                        return (rewardData);
                    }
                }
            },
            err => {
                return Q.resolve().then(
                    () => {
                        //change player credit back if transfer failed
                        if (bTransfered) {
                            console.error(err);
                            if (err.error && err.error.errorMessage && err.error.errorMessage.indexOf('Request timeout') > -1) {
                            } else {
                                return dbConfig.collection_players.findOneAndUpdate(
                                    {_id: playerObjId, platform: playerData.platform},
                                    {$inc: {validCredit: amount}, lockedAmount: rewardAmount},
                                    {new: true}
                                );
                            }
                        }
                    }
                ).catch(errorUtils.reportError).then(
                    () => Q.reject(err)
                );
            }
        ).then(
            res => {
                if (res) {
                    //playerCredit = res.validCredit;
                    // Log credit change when transfer success
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -amount, constPlayerCreditChangeType.TRANSFER_IN, playerCredit, 0, -rewardAmount, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });

                    // Logging Transfer Success
                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform,
                        platformId, constPlayerCreditChangeType.TRANSFER_IN, transferId, providerShortId, transferAmount, rewardAmount, adminName, res, constPlayerCreditTransferStatus.SUCCESS);

                    return {
                        playerId: playerData.playerId,
                        providerId: providerShortId,
                        providerCredit: parseFloat(gameAmount + providerAmount).toFixed(2),
                        playerCredit: parseFloat(playerCredit).toFixed(2),
                        rewardCredit: parseFloat(rewardTaskAmount).toFixed(2),
                        transferCredit: {
                            playerCredit: parseFloat(gameAmount - rewardAmount).toFixed(2),
                            rewardCredit: parseFloat(rewardAmount).toFixed(2)
                        }
                    };
                }
                else {
                    return Q.reject({name: "DataError", message: "Error transfer player credit to provider."});
                }
            }
        );//.catch( error => console.log("transfer error:", error));
    },

    /**
     * Transfer credit from game provider
     * @param {objectId} playerObjId
     * @param {objectId} platform
     * @param {objectId} providerId
     * @param {Number} amount
     * @param {String} playerId
     * @param {String} userName
     * @param {String} platformId
     * @param {String} adminName
     * @param {String} cpName
     * @param {Boolean} bResolve
     * @param {Number} maxReward
     * @param {Boolean} forSync
     *
     * note that transferOut will only be a whole number,
     * and it can only transfer out all the credit for current system
     *
     * e.g. if player have 254.88 game credit,
     *          it will transfer out 254,
     *          leaving the 0.88 in the game as game credit.
     */
    playerCreditTransferFromProvider: (playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync) => {
        let deferred = Q.defer();
        let providerPlayerObj = null;
        let rewardTasks = null;
        let lockedAmount = 0;
        let rewardTaskTransferredAmount = 0;
        let validCreditToAdd = 0;
        let gameCredit = 0;
        let playerCredit = 0;
        let rewardTaskCredit = 0;
        let notEnoughCredit = false;
        let bUpdateTask = false;
        let transferId = new Date().getTime();

        let initFunc;
        if (forSync) {
            initFunc = Q.resolve({credit: amount});
        } else {
            initFunc = cpmsAPI.player_queryCredit(
                {
                    username: userName,
                    platformId: platformId,
                    providerId: providerShortId
                }
            )
        }
        initFunc.then(
            function (data) {
                if (data) {
                    providerPlayerObj = {gameCredit: data.credit ? parseFloat(data.credit) : 0};
                    if (providerPlayerObj.gameCredit < 1 || amount == 0 || providerPlayerObj.gameCredit < amount) {
                        notEnoughCredit = true;
                        if (bResolve) {
                            return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
                                playerData => {
                                    deferred.resolve(
                                        {
                                            playerId: playerId,
                                            providerId: providerShortId,
                                            providerCredit: providerPlayerObj.gameCredit,
                                            playerCredit: playerData.validCredit,
                                            rewardCredit: playerData.lockedCredit
                                        }
                                    );
                                }
                            );
                        }
                        else {
                            deferred.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "DataError",
                                errorMessage: "Player does not have enough credit."
                            });
                        }
                        return;
                    }
                    return dbRewardTask.getPlayerAllRewardTask(playerObjId)
                } else {
                    deferred.reject({name: "DataError", message: "Cant find player credit in provider."});
                    return false;
                }
            },
            function (err) {
                deferred.reject(err);
            }
        ).then(
            function (data) {
                if (!notEnoughCredit) {
                    amount = amount > 0 ? Math.floor(amount) : Math.floor(providerPlayerObj.gameCredit);
                    let totalAmountLeftToTransfer = amount;
                    
                    if (data) {
                        if(data[0].requiredBonusAmount > 0) {
                            // handle register bonus separately
                            rewardTask = data[0];
                            rewardTask.currentAmount = amount;
                            validCreditToAdd = 0;
                            rewardTask.inProvider = false;
                            rewardTaskCredit = rewardTask.currentAmount;
                            rewardTask.bUpdateTask = true;
                        } else {
                            rewardTasks = data.reverse(); // to handle reward task decendingly
                            let totalAmountLeftToTransfer = amount;

                            // filter for relevant reward only
                            let relevantRewards = [];
                            for (let i = 0; i < rewardTasks.length; i++) {
                                let rewardTask = rewardTasks[i];
                                if ((!rewardTask.targetProviders || rewardTask.targetProviders.length <= 0 ) // target all providers
                                    || (rewardTask.targetEnable && rewardTask.targetProviders.indexOf(providerId) >= 0 ) // target this provider
                                    || (!rewardTask.targetEnable && rewardTask.targetProviders.indexOf(providerId) < 0) // banded provider
                                ){
                                    relevantRewards.push(rewardTask)
                                } else {
                                    // since unrelevant provider will not change the currentAmount, their lockedAmount won't change as well
                                    // so add their currentAmount to lockedAmount now
                                    lockedAmount += rewardTask.currentAmount;
                                }
                            }

                            // get the oldest relevant reward
                            let oldestRewardIndex = relevantRewards.length - 1;

                            // iterate through each relevant reward
                            for (let i = 0; i < relevantRewards.length; i++) {
                                let rewardTask = relevantRewards[i];
                                let isOldestReward = (i === oldestRewardIndex);

                                if (totalAmountLeftToTransfer >= rewardTask.currentAmount) {
                                    // reduce the totalAmountLeftToTransfer since it is used to fill the locked credit/reward valid credit
                                    totalAmountLeftToTransfer -= rewardTask.currentAmount;
                                    rewardTask.inProvider = false;
                                    rewardTask.bUpdateTask = true;

                                    // if the reward is the last one AND totalAmountLeftToTransfer left is more than _inputCredit
                                    if(isOldestReward && totalAmountLeftToTransfer > rewardTask._inputCredit) {
                                        // add the rest to currentAmount (when win money, add to reward first)
                                        rewardTask.currentAmount += totalAmountLeftToTransfer - rewardTask._inputCredit;

                                        // the totalAmountLeftToTransfer will hold the valid credit value
                                        totalAmountLeftToTransfer = rewardTask._inputCredit;
                                    }
                                } else {
                                    // the player does not have the credit required to fill up the rewards
                                    // hence, they are losing credits
                                    rewardTask.currentAmount = totalAmountLeftToTransfer;
                                    totalAmountLeftToTransfer = 0;
                                    rewardTask.inProvider = false;
                                    rewardTask.bUpdateTask = true;
                                }

                                // add the rewardTask's currentAmount into lockedAmount
                                lockedAmount += rewardTask.currentAmount;
                                rewardTaskTransferredAmount += rewardTask.currentAmount;
                                bUpdateTask = true;
                            }

                            // the totalAmountLeft that is not transferred into rewardTasks will be transferred into validCredit
                            validCreditToAdd = totalAmountLeftToTransfer > 0 ? totalAmountLeftToTransfer : 0;
                            rewardTaskCredit = lockedAmount;
                        }
                        
                    }
                    if (forSync) {
                        return true;
                    }
                    return counterManager.incrementAndGetCounter("transferId").then(
                        function (id) {
                            transferId = id;
                            // console.log("player_transferOut:", userName, providerShortId, amount);
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", id,
                                providerShortId, amount, lockedAmount, adminName, null, constPlayerCreditTransferStatus.SEND);
                            return cpmsAPI.player_transferOut(
                                {
                                    username: userName,
                                    platformId: platformId,
                                    providerId: providerShortId,
                                    transferId: id, //chance.integer({min: 1000000000000000000, max: 9999999999999999999}),
                                    credit: amount
                                }
                            ).then(
                                res => res,
                                error => {
                                    // let lockedAmount = rewardTask && rewardTask.currentAmount ? rewardTask.currentAmount : 0;
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", id,
                                        providerShortId, amount, lockedAmount, adminName, error, constPlayerCreditTransferStatus.FAIL);
                                    error.hasLog = true;
                                    return Q.reject(error);
                                }
                            );
                        }
                    );
                }
            },
            function (err) {
                deferred.reject({
                    status: constServerCode.PLAYER_REWARD_INFO,
                    name: "DataError", message: "cannot get current player reward task data.", error: err
                })
            }
        ).then(
            function (data) {
                if (data) {
                    if (bUpdateTask) {
                        // QUESTION :: Should input credit reset?
                        // ASSUMPTION :: Yes.
                        for (let i = 0; i < rewardTasks.length; i++) {
                            let rewardTask = rewardTasks[i];
                            let rewardPromises = [];
                            if (rewardTask.bUpdateTask) {
                                let rewardProm = dbConfig.collection_rewardTask.findOneAndUpdate(
                                    {_id: rewardTask._id, platformId: rewardTask.platformId},
                                    {
                                        currentAmount: rewardTask.currentAmount,
                                        inProvider: rewardTask.inProvider,
                                        _inputCredit: 0
                                    },
                                    {new: true}
                                );
                                rewardPromises.push(rewardProm);
                            } else {
                                // pushing the object into promise will return the object as usual, with the same array order
                                rewardPromises.push(rewardTask);
                            }
                            return Promise.all(rewardPromises);
                        }
                    }
                    else {
                        return rewardTasks;
                    }
                }
            },
            function (error) {
                //log transfer error
                deferred.reject(error);
            }
        ).then(
            function (data) {
                if (data) {
                    rewardTasks = data;
                    // note:: transferOut only allow integer, so the decimal amount will stay in the game, hence, the remaining game credit
                    gameCredit = providerPlayerObj.gameCredit - validCreditToAdd - rewardTaskCredit;
                    gameCredit = gameCredit >= 0 ? gameCredit : 0;
                    return true;
                } else {
                    deferred.reject({
                        status: constServerCode.PLAYER_REWARD_INFO,
                        name: "DataError",
                        message: "Error when finding reward information for player"
                    });
                }
            }, function (err) {
                deferred.reject({
                    status: constServerCode.PLAYER_REWARD_INFO,
                    name: "DataError",
                    message: "Error when finding reward information for player",
                    error: err
                });
            }
        ).then(
            function (data) {
                if (data) {
                    let updateObj = {
                        lastPlayedProvider: null,
                        $inc: {validCredit: validCreditToAdd},
                        lockedCredit: lockedAmount
                    };

                    //move credit to player
                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: playerObjId, platform: platform},
                        updateObj,
                        {new: true}
                    )
                }
            },
            function (err) {
                deferred.reject({
                    status: constServerCode.PLAYER_TRANSFER_OUT_ERROR,
                    name: "DBError",
                    message: "Error transfer out player credit.",
                    error: err
                });
            }
        ).then(
            function (res) {
                if (res) {//create log
                    playerCredit = res.validCredit;
                    let lockedCredit = res.lockedCredit;
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, validCreditToAdd, constPlayerCreditChangeType.TRANSFER_OUT, playerCredit, lockedCredit, lockedCredit, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });
                    // Logging Transfer Success
                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform,
                        platformId, constPlayerCreditChangeType.TRANSFER_OUT, transferId, providerShortId, amount, lockedCredit, adminName, res, constPlayerCreditTransferStatus.SUCCESS);

                    deferred.resolve(
                        {
                            playerId: playerId,
                            providerId: providerShortId,
                            providerCredit: parseFloat(gameCredit).toFixed(2),
                            playerCredit: parseFloat(playerCredit).toFixed(2),
                            rewardCredit: parseFloat(rewardTaskCredit).toFixed(2),
                            transferCredit: {
                                playerCredit: parseFloat(validCreditToAdd).toFixed(2),
                                rewardCredit: parseFloat(rewardTaskTransferredAmount).toFixed(2)
                            }
                        }
                    );
                }
                else {
                    deferred.reject({name: "DBError", message: "Error in increasing player credit."})
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error in increasing player credit.", error: err});
            }
        );

        // // no idea what this part does.
        // // there is no 'return' from previous function, only resolve and reject
        // // so I assume this part is the unreachable code
        // .then(
        //     function (data) {
        //         if (data) {
        //             //return transferred credit + reward task amount
        //             let rewardCredit = data ? data : 0;
        //             deferred.resolve(
        //                 {
        //                     playerId: playerId,
        //                     providerId: providerShortId,
        //                     providerCredit: parseFloat(gameCredit).toFixed(2),
        //                     playerCredit: parseFloat(playerCredit).toFixed(2),
        //                     rewardCredit: parseFloat(rewardTaskCredit).toFixed(2),
        //                     transferCredit: {
        //                         playerCredit: parseFloat(validCreditToAdd).toFixed(2),
        //                         rewardCredit: parseFloat(rewardCredit).toFixed(2)
        //                     }
        //                 }
        //             );
        //         }
        //     },
        //     function (error) {
        //         deferred.reject({name: "DBError", message: "Error completing reward task", error: error});
        //     }
        // );
        return deferred.promise;
    }

};

module.exports = dbPlayerCreditTransfer;