const Q = require("q");

const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
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
     * @param platform
     * @param {String} providerId
     * @param amount
     * @param providerShortId
     * @param userName
     * @param platformId
     * @param adminName
     * @param cpName
     * @param forSync
     */
    playerCreditTransferToProvider: (playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync) => {
        let gameAmount = 0, regGameAmount = 0;
        let rewardAmount = 0;
        let providerAmount = 0;
        let playerCredit = 0;
        let rewardTaskAmount = 0;
        let rewardDataObj = null;
        let playerData = null;
        let rewardData = null;
        let bUpdateReward = false;
        let validTransferAmount = 0, lockedTransferAmount = 0;
        let bTransfered = false;
        let transferId = new Date().getTime();
        let changedLockCredit = 0;
        let totalLockedAmount = 0;
        let transferAmount = 0;

        return dbConfig.collection_players.findOne({_id: playerObjId}).populate(
            {path: "lastPlayedProvider", model: dbConfig.collection_gameProvider}
        ).lean().then(
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
                    let rewardProm = dbRewardTask.getPlayerCurRewardTask(playerObjId);
                    let gameCreditProm = {};
                    if (playerData.lastPlayedProvider) {
                        gameCreditProm = cpmsAPI.player_queryCredit(
                            {
                                username: userName,
                                platformId: platformId,
                                providerId: playerData.lastPlayedProvider.providerId
                            }
                        );
                    }
                    return Q.all([rewardProm, gameCreditProm]);
                } else {
                    return Q.reject({name: "DataError", message: "Can't find player information."});
                }
            },
            err => {
                return Q.reject({name: "DataError", message: "Can't find player information.", error: err});
            }
        ).then(
            taskData => {
                console.log('2nd Step', taskData);
                // Player has enough credit
                rewardData = taskData[0];
                let gameCredit = (taskData[1] && taskData[1].credit) ? parseFloat(taskData[1].credit) : 0;
                let isFirstRegistrationReward = false;

                //if amount is less than 0, means transfer all
                validTransferAmount = amount > 0 ? amount : parseFloat(playerData.validCredit.toFixed(2));
                validTransferAmount = Math.floor(validTransferAmount);

                if (!rewardData) {
                    // Player has no reward ongoing
                    validTransferAmount = Math.floor(validTransferAmount);
                    rewardData = true;
                }
                else {
                    // Player has ongoing reward
                    rewardDataObj = rewardData;

                    rewardData = rewardData.forEach(reward => {
                        if ((!reward.targetProviders || reward.targetProviders.length <= 0 ) // target all providers
                            || (reward.targetEnable && reward.targetProviders.indexOf(providerId) >= 0)//target this provider
                            || (!reward.targetEnable && reward.targetProviders.indexOf(providerId) < 0)//banded provider
                        ) {
                            if (reward.inProvider == true) {
                                // Already in provider
                                // if (String(playerData.lastPlayedProvider) != String(providerId)) {
                                //     return Q.reject({name: "DataError", message: "Player is playing a different game"});
                                // }

                                if (reward.requiredBonusAmount > 0) {
                                    // For player registration reward task
                                    // Valid Credit is not required to transfer registration reward task
                                    // Usually won't pass here, the decision to not transfer is decided in getLoginURL
                                    validTransferAmount = 0;
                                    regGameAmount = validTransferAmount;
                                    isFirstRegistrationReward = true;
                                }
                                else {
                                    // For non - player registration reward task
                                    // Cases that player reload and have more validCredit to play in same provider
                                    // inputCredit will add up with previous input credit, if any
                                    reward._inputCredit += validTransferAmount;
                                    bUpdateReward = true;
                                }
                            } else {
                                // Not in provider yet
                                if (reward.requiredBonusAmount > 0) {
                                    // For player registration reward task
                                    // Valid Credit is not required to transfer registration reward task
                                    validTransferAmount = 0;
                                    regGameAmount = Math.floor(reward.currentAmount);
                                    // reward.currentAmount may have value less than 1 that cannot bring to provider
                                    rewardTaskAmount = reward.currentAmount - regGameAmount;
                                    reward.currentAmount = rewardTaskAmount;
                                    reward.inProvider = true;
                                    isFirstRegistrationReward = true;
                                }
                                else {
                                    //process floating point
                                    // Add up the reward tasks current amount
                                    let amountToAdd = Math.floor(reward.currentAmount);
                                    gameAmount += amountToAdd;
                                    // Check whether need to trasnfer validAmount
                                    let remainingAmount = validTransferAmount + reward.currentAmount - amountToAdd;
                                    if (remainingAmount > playerData.validCredit) {
                                        validTransferAmount = 0;
                                        rewardAmount = Math.floor(reward.currentAmount || 0);
                                    }
                                    else {
                                        validTransferAmount = gameAmount - reward.currentAmount;
                                        rewardAmount = reward.currentAmount
                                    }
                                    rewardTaskAmount = reward.currentAmount - amountToAdd;
                                    reward.inProvider = true;
                                    reward._inputCredit = validTransferAmount;
                                    reward.currentAmount = rewardTaskAmount;
                                }
                                bUpdateReward = true;
                            }
                        } else {
                            // not this provider
                            validTransferAmount = Math.floor(validTransferAmount);
                        }
                    })
                }

                transferAmount = validTransferAmount + gameAmount;
                lockedTransferAmount = isFirstRegistrationReward ? regGameAmount : gameAmount;

                console.log('validTransferAmount', validTransferAmount);
                console.log('gameAmount', gameAmount);
                console.log('transferAmount', transferAmount);
                console.log('lockedTransferAmount', lockedTransferAmount);

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
                changedLockCredit = lockedTransferAmount - validTransferAmount;
                let updateObj = {
                    lastPlayedProvider: providerId,
                    $inc: {validCredit: -validTransferAmount, lockedCredit: -changedLockCredit}
                };
                // if (bUpdateReward) {
                //     updateObj.lockedCredit = totalLockedAmount;
                // }

                // TODO: Change this to update with retry
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
                    if (updateData.validCredit < -0.02 || updateData.lockedCredit < -0.02) {
                        // TODO Change this to update with retry
                        // Player credit is less than expected after deduct, revert the decrement
                        return dbConfig.collection_players.findOneAndUpdate(
                            {_id: playerObjId, platform: playerData.platform},
                            {$inc: {validCredit: validTransferAmount, lockedCredit: changedLockCredit}},
                            {new: true}
                        ).catch(errorUtils.reportError).then(
                            () => Q.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "NumError",
                                errorMessage: "Player does not have enough credit."
                            })
                        );
                    }

                    playerCredit = updateData.validCredit;
                    //fix float number problem after update
                    if ((updateData.validCredit > -0.02 && updateData.validCredit < 0) || (updateData.lockedCredit > -0.02 && updateData.lockedCredit < 0)) {
                        let uObj = {};
                        if (updateData.validCredit > -0.02 && updateData.validCredit < 0) {
                            playerCredit = 0;
                            uObj.validCredit = 0;
                        }
                        if (updateData.lockedCredit > -0.02 && updateData.lockedCredit < 0) {
                            uObj.lockedCredit = 0;
                        }
                        return dbConfig.collection_players.findOneAndUpdate(
                            {_id: playerObjId, platform: platform},
                            uObj,
                            {new: true}
                        );
                    }
                    else {
                        return true;
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
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerData.playerId, playerData.name, platform, platformId, "transferIn",
                                id, providerShortId, transferAmount, lockedTransferAmount, adminName, null, constPlayerCreditTransferStatus.SEND);
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
                                        id, providerShortId, transferAmount, lockedTransferAmount, adminName, error, status);
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
     * @param {objectId} platform
     * @param {objectId} playerId
     * @param {objectId} providerId
     * @param {Number} amount //to fix these params later
     */
    playerCreditTransferFromProvider: (playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync) => {
        let deferred = Q.defer();
        let providerPlayerObj = null;
        let rewardTasks = null;
        // let diffAmount = 0;
        let lockedAmount = 0;
        let validCreditToAdd = 0;
        let gameCredit = 0;
        let playerCredit = 0;
        let rewardTaskCredit = 0;
        let notEnoughCredit = false;
        let bUpdateTask = false;
        let transferId = new Date().getTime();
        //let bNoCredit = false;
        //dbconfig.collection_providerPlayerCredit.find({playerId: playerObjId, providerId: providerId}).then(
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
                            // QUESTION :: Is it possible to have transfer amount differ from in game credit?
                            // ASSUMPTION :: No. Since only transfer all in and out is possible, transfer amount should always be the same as in game credit.
                            // So, amount transfer is used to determine whether the player is winning or losing

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
                                    lockedAmount = rewardTask.currentAmount;
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
                        $inc: {validCredit: validCreditToAdd}
                    };
                    // if (bNoCredit) {
                    //     updateObj.lockedCredit = 0;
                    // }
                    // else {
                    updateObj.lockedCredit = rewardTask.currentAmount;
                    //}
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

                    // if (rewardTask && rewardTask.status == constRewardTaskStatus.ACHIEVED && rewardTask.isUnlock) {
                    //     //check reward task, to see if can unlock
                    //     //return dbRewardTask.completeRewardTask(rewardTask);
                    //     return
                    // }
                    // else {
                    let rewardCredit = rewardTask ? rewardTask.currentAmount : 0;
                    deferred.resolve(
                        {
                            playerId: playerId,
                            providerId: providerShortId,
                            providerCredit: parseFloat(gameCredit).toFixed(2),
                            playerCredit: parseFloat(playerCredit).toFixed(2),
                            rewardCredit: parseFloat(rewardTaskCredit).toFixed(2),
                            transferCredit: {
                                playerCredit: parseFloat(validCreditToAdd).toFixed(2),
                                rewardCredit: parseFloat(rewardCredit).toFixed(2)
                            }
                        }
                    );
                    // }
                }
                else {
                    deferred.reject({name: "DBError", message: "Error in increasing player credit."})
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error in increasing player credit.", error: err});
            }
        ).then(
            function (data) {
                if (data) {
                    //return transferred credit + reward task amount
                    let rewardCredit = data ? data : 0;
                    deferred.resolve(
                        {
                            playerId: playerId,
                            providerId: providerShortId,
                            providerCredit: parseFloat(gameCredit).toFixed(2),
                            playerCredit: parseFloat(playerCredit).toFixed(2),
                            rewardCredit: parseFloat(rewardTaskCredit).toFixed(2),
                            transferCredit: {
                                playerCredit: parseFloat(validCreditToAdd).toFixed(2),
                                rewardCredit: parseFloat(rewardCredit).toFixed(2)
                            }
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error completing reward task", error: error});
            }
        );
        return deferred.promise;
    }

};

module.exports = dbPlayerCreditTransfer;