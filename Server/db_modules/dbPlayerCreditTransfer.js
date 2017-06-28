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
     * Transfer player credit from provider to local
     * @param {String} playerId
     * @param {String} providerId
     */
    playerCreditTransferFromProvider: (playerId, providerId) => {

    }

};

module.exports = dbPlayerCreditTransfer;