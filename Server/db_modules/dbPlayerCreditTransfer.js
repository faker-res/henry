const Q = require("q");

const env = require('../config/env').config();

const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
const constPlayerCreditTransferStatus = require("./../const/constPlayerCreditTransferStatus");
const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
const constServerCode = require('./../const/constServerCode');
const constSystemParam = require("../const/constSystemParam.js");

const dbOps = require('./../db_common/dbOperations');

const dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
const dbRewardTask = require('./../db_modules/dbRewardTask');
const dbEbetWallet = require("./../db_modules/dbEbetWallet");

const cpmsAPI = require("../externalAPI/cpmsAPI");

const counterManager = require('./../modules/counterManager');
const dbConfig = require('./../modules/dbproperties');
const dbLogger = require("./../modules/dbLogger");
const errorUtils = require("./../modules/errorUtils");
const ObjectId = mongoose.Types.ObjectId;
const localization = require("../modules/localization");
const translate = localization.localization.translate;

const ebetWalletProviders = dbEbetWallet.getWalletPlatformNames(); // TRAP ALERT :: this apply to all wallet channel, not just EBETwallet

let dbPlayerCreditTransfer = {
    // separate out api calls so it can be test easily
    getPlayerGameCredit: (obj) => {
        return cpmsAPI.player_queryCredit(obj);
    },
    playerTransferIn: (obj) => {
        // Block real player transfer in on cstest environment
        if (env.mode === 'development' && Number(obj.playerId) >= 400000) {
            return Promise.reject({name: "SystemError", message: "Not allowed to transfer from test environment."});
        }
        return cpmsAPI.player_transferIn(obj);
    },
    playerTransferOut: (obj) => {
        if (env.mode === 'development' && Number(obj.playerId) >= 400000) {
            return Promise.reject({name: "SystemError", message: "Not allowed to transfer from test environment."});
        }
        return cpmsAPI.player_transferOut(obj)
    },

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
    playerCreditTransferToProvider: function (playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync) {
        let dPCT = this;
        let gameAmount = 0, regGameAmount = 0;
        let rewardAmount = 0;
        let playerCredit = 0;
        let rewardTaskAmount = 0;
        let rewardDataObj = null;
        let playerData = null;
        let rewardData = null;
        let bUpdateReward = false;
        let validTransferAmount = 0, lockedTransferAmount = 0;
        let bTransfered = false;
        let transferId = new Date().getTime();
        let transferAmount = 0;
        let gameCredit = 0;
        let isFirstRegistrationReward = false;

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
                    let rewardProm = dbRewardTask.getPlayerAllRewardTask(playerObjId);
                    let gameCreditProm = {};
                    if (playerData.lastPlayedProvider) {
                        gameCreditProm = dPCT.getPlayerGameCredit(
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
                // Player has enough credit
                rewardData = taskData[0];
                gameCredit = (taskData[1] && taskData[1].credit) ? parseFloat(taskData[1].credit) : 0;

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
                    rewardData = rewardData.map(reward => {
                        if ((!reward.targetProviders || reward.targetProviders.length <= 0 ) // target all providers
                            || (reward.targetEnable && reward.targetProviders.findIndex(e => String(e) == String(providerId)) >= 0)//target this provider
                            || (!reward.targetEnable && reward.targetProviders.findIndex(e => String(e) == String(providerId)) < 0)//banded provider
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
                                    // let remainingAmount = validTransferAmount + reward.currentAmount - amountToAdd;
                                    // if (remainingAmount > playerData.validCredit) {
                                    //     validTransferAmount = 0;
                                    //     rewardAmount = Math.floor(reward.currentAmount || 0);
                                    // }
                                    // else {
                                    //     validTransferAmount = gameAmount - reward.currentAmount;
                                    //     rewardAmount = reward.currentAmount
                                    // }
                                    rewardTaskAmount = reward.currentAmount - amountToAdd;
                                    reward.inProvider = true;
                                    reward._inputCredit = validTransferAmount + gameCredit;
                                    reward.currentAmount = rewardTaskAmount;
                                }
                                bUpdateReward = true;
                            }
                        } else {
                            // not this provider
                            validTransferAmount = Math.floor(validTransferAmount);
                        }

                        console.log('gameAmount', gameAmount);
                        return reward;
                    })
                }

                lockedTransferAmount = isFirstRegistrationReward ? regGameAmount : gameAmount;
                transferAmount = validTransferAmount + lockedTransferAmount;

                console.log('rewardData', rewardData);
                console.log('validTransferAmount', validTransferAmount);
                console.log('regGameAmount', regGameAmount);
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

                return playerCreditChange(playerObjId, playerData.platform, -validTransferAmount, -lockedTransferAmount, providerId);
            },
            err => Q.reject({name: "DBError", message: "Cant find player current reward.", error: err})
        ).then(
            // Double check if player's credit is enough to transfer
            // to prevent concurrent deduction
            updateData => {
                if (updateData) {
                    if (updateData.validCredit < -0.02 || updateData.lockedCredit < -0.02) {
                        // Player credit is less than expected after deduct, revert the decrement
                        return playerCreditChange(playerObjId, playerData.platform, validTransferAmount, lockedTransferAmount).then(
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
                            return dPCT.playerTransferIn(
                                {
                                    playerId: playerData.playerId,
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
                                    console.log('debug transfer error A:', error);
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
                        // return dbRewardTask.updateRewardTask(
                        //     {
                        //         _id: rewardData._id,
                        //         platformId: rewardData.platformId
                        //     }, {
                        //         inProvider: rewardData.inProvider,
                        //         _inputCredit: rewardData._inputCredit,
                        //         currentAmount: rewardData.currentAmount
                        //     }
                        // );
                        let updProm = [];

                        rewardData.forEach(reward => {
                            if (isFirstRegistrationReward) {
                                if (reward.requiredBonusAmount > 0) {
                                    updProm.push(dbRewardTask.updateRewardTask(
                                        {
                                            _id: reward._id,
                                            platformId: reward.platformId
                                        }, {
                                            inProvider: reward.inProvider,
                                            _inputCredit: reward._inputCredit,
                                            currentAmount: reward.currentAmount
                                        }
                                    ))
                                }
                            }
                            else {
                                updProm.push(dbRewardTask.updateRewardTask(
                                    {
                                        _id: reward._id,
                                        platformId: reward.platformId
                                    }, {
                                        inProvider: reward.inProvider,
                                        _inputCredit: reward._inputCredit,
                                        currentAmount: reward.currentAmount
                                    }
                                ))
                            }
                        });

                        return Promise.all(updProm);
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
                                return playerCreditChange(playerObjId, playerData.platform, validTransferAmount, lockedTransferAmount);
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
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -validTransferAmount, constPlayerCreditChangeType.TRANSFER_IN, playerCredit, 0, -lockedTransferAmount, null, {
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
                        providerCredit: parseFloat(transferAmount + gameCredit).toFixed(2),
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
    playerCreditTransferFromProvider: function (playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync) {
        let pCTFP = this;
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
        let player;

        let initFunc;
        if (forSync) {
            initFunc = Q.resolve({credit: amount});
        } else {
            initFunc = pCTFP.getPlayerGameCredit(
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
                            return dbConfig.collection_players.findOne({_id: playerObjId}).lean().then(
                                playerData => {
                                    player = playerData;
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
                        } else {
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
                console.log('this error is', err)
                deferred.reject(err);
            }
        ).then(
            function (data) {
                if (!notEnoughCredit) {
                    amount = amount > 0 ? Math.floor(amount) : Math.floor(providerPlayerObj.gameCredit);
                    let totalAmountLeftToTransfer = amount;

                    if (data) {
                        rewardTasks = data.reverse(); // to handle reward task decending
                        if (rewardTasks[rewardTasks.length-1] && rewardTasks[rewardTasks.length-1].requiredBonusAmount && rewardTasks[rewardTasks.length-1].requiredBonusAmount > 0) {
                            // handle register bonus separately
                            let rewardTask = rewardTasks[rewardTasks.length-1];
                            rewardTask.currentAmount = amount;
                            validCreditToAdd = 0;
                            rewardTask.inProvider = false;
                            rewardTaskCredit = rewardTask.currentAmount;
                            rewardTask.bUpdateTask = true;

                            for (let i = 0; i < rewardTasks.length; i++) {
                                lockedAmount += rewardTasks[i].currentAmount;
                            }

                            bUpdateTask = true;
                        } else {
                            // filter for relevant reward only
                            let relevantRewards = [];
                            for (let i = 0; i < rewardTasks.length; i++) {
                                let rewardTask = rewardTasks[i];
                                if ((!rewardTask.targetProviders || rewardTask.targetProviders.length <= 0 ) // target all providers
                                    || (rewardTask.targetEnable && rewardTask.targetProviders.findIndex(e => String(e) == String(providerId)) >= 0) // target this provider
                                    || (!rewardTask.targetEnable && rewardTask.targetProviders.findIndex(e => String(e) == String(providerId)) < 0) // banded provider
                                ) {
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

                                if (totalAmountLeftToTransfer >= rewardTask.initAmount) {
                                    // reduce the totalAmountLeftToTransfer since it is used to fill the locked credit/reward valid credit
                                    rewardTask.currentAmount = rewardTask.initAmount;
                                    totalAmountLeftToTransfer -= rewardTask.currentAmount;
                                    rewardTask.inProvider = false;
                                    rewardTask.bUpdateTask = true;

                                    // if the reward is the last one AND totalAmountLeftToTransfer left is more than _inputCredit
                                    if (isOldestReward && totalAmountLeftToTransfer > rewardTask._inputCredit) {
                                        // add the rest to currentAmount (when win money, add to reward first)
                                        let winningAmount = totalAmountLeftToTransfer - rewardTask._inputCredit;
                                        relevantRewards[0].currentAmount += winningAmount;

                                        if (relevantRewards.length !== 1) {
                                            lockedAmount += winningAmount;
                                        }

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
                            return pCTFP.playerTransferOut(
                                {
                                    playerId: player.playerId,
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
                                    console.log('debug transfer error B:', error);
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
                        console.log(rewardTasks);
                        let rewardPromises = [];
                        for (let i = 0; i < rewardTasks.length; i++) {
                            let rewardTask = rewardTasks[i];
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
                        }
                        return Promise.all(rewardPromises);
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
                    return dbConfig.collection_players.findOneAndUpdate(
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
    },

    /**
     * Main transfer in logic
     * Transfer player credit from local to provider (provider group)
     * @param playerObjId
     * @param platform
     * @param {ObjectId} providerId
     * @param amount
     * @param providerShortId
     * @param userName
     * @param platformId
     * @param adminName
     * @param cpName
     * @param forSync
     */
    playerCreditTransferToProviderWithProviderGroup: function (playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync, isUpdateTransferId, currentDate) {
        let dPCT = this;
        let gameAmount = 0;
        let rewardAmount = 0;
        let playerCredit = 0;
        let rewardTaskAmount = 0;
        let validTransferAmount = 0, lockedTransferAmount = 0;
        let bTransfered = false;
        let transferId = new Date().getTime();
        let transferAmount = 0;
        let waitTimeBeforeRequest = 3000;
        let delayTransferIn = ()=>{
            return new Promise ((resolve) => {
                setTimeout(() => {
                        return resolve();
                    }, waitTimeBeforeRequest
                );
            });
        };

        let player, gameProviderGroup, rewardTaskGroupObjId;

        let playerProm = dbConfig.collection_players.findOne({_id: playerObjId}).populate(
            {path: "lastPlayedProvider", model: dbConfig.collection_gameProvider}
        ).lean();
        let providerGroupProm = dbConfig.collection_gameProviderGroup.findOne({
            platform: platform,
            providers: providerId
        }).lean();

        // Search provider group
        return Promise.all([playerProm, providerGroupProm]).then(
            res => {
                player = res[0];
                gameProviderGroup = res[1];

                // Check if player exist
                if (!player) {
                    return Q.reject({name: "DataError", message: "Can't find player information."});
                }

                // Add player's current validCredit to transferAmount first
                // If amount is less than 0, means transfer all
                validTransferAmount += amount > 0 ? amount : Math.floor(parseFloat(player.validCredit.toFixed(2)));
                validTransferAmount = Math.floor(validTransferAmount);

                // Check if there's provider not in a group
                if (gameProviderGroup || !providerId) {
                    let providerGroupId = gameProviderGroup ? gameProviderGroup._id : providerId;

                    // Search for reward task group of this player on this provider
                    return dbConfig.collection_rewardTaskGroup.findOne({
                        platformId: platform,
                        playerId: playerObjId,
                        providerGroup: providerGroupId,
                        status: {$in: [constRewardTaskStatus.STARTED]}
                    }).lean();
                } else {
                    // Group not exist, may be due to provider are not added in a group yet
                    return Promise.reject({name: "DataError", message: "Provider are not added in a group yet."});
                }
            }
        ).then(
            res => {
                let rewardTaskGroup = res;

                if (rewardTaskGroup) {
                    // There is on-going reward task group
                    lockedTransferAmount += parseInt(rewardTaskGroup.rewardAmt);
                    rewardTaskGroup._inputFreeAmt += validTransferAmount;
                    rewardTaskGroupObjId = rewardTaskGroup._id;
                }

                // Calculate total amount needed to transfer to CPMS
                transferAmount = validTransferAmount + lockedTransferAmount;

                // Check player have enough credit
                if (transferAmount < 1 || amount == 0) {
                    // There is no enough credit to transfer
                    return Promise.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "NumError",
                        errorMessage: "Player does not have enough credit."
                    });
                }

                return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId);
            }
        ).then(
            res => {
                if (res && res[0] && res[1]) {
                    let updatedPlayerData = res[0];
                    let updatedGroupData = res[1];

                    // FAILURE CHECK - Check player has negative valid amount after transfer
                    if (updatedPlayerData.validCredit < -0.02) {
                        // Player credit is less than expected after deduct, revert the decrement
                        return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId, true).then(
                            () => Promise.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "NumError",
                                errorMessage: "Player does not have enough credit."
                            })
                        );
                    }

                    playerCredit = updatedPlayerData.validCredit;
                    //fix float number problem after update
                    if ((updatedPlayerData.validCredit > -0.02 && updatedPlayerData.validCredit < 0) || (updatedPlayerData.lockedCredit > -0.02 && updatedPlayerData.lockedCredit < 0)) {
                        let uObj = {};
                        if (updatedPlayerData.validCredit > -0.02 && updatedPlayerData.validCredit < 0) {
                            playerCredit = 0;
                            uObj.validCredit = 0;
                        }
                        if (updatedPlayerData.lockedCredit > -0.02 && updatedPlayerData.lockedCredit < 0) {
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
            }
        ).then(
            res => {
                if (res) {
                    // Operation on player credit is success on FPMS side
                    bTransfered = true;
                    if (forSync) {
                        return true;
                    }

                    return Promise.resolve().then(() => {
                        if (cpName.toUpperCase() === "IPMKENO") {
                            return dbConfig.collection_playerCreditTransferLog.findOne({providerId: providerShortId, playerObjId: playerObjId}).lean().then(log => {
                                if(!log) {
                                    return delayTransferIn;
                                }
                            })
                        }
                    }).then(() => {
                        return counterManager.incrementAndGetCounter("transferId");
                    }).then(
                        id => {
                            transferId = id;

                            if(isUpdateTransferId){
                                dbPlayerInfo.updatePlayerBonusDoubledReward(playerObjId, platform, currentDate, transferId, transferAmount);
                            }
                            //let lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                            // Second log before call cpmsAPI
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, player.playerId, player.name, platform, platformId, "transferIn",
                                id, providerShortId, transferAmount, lockedTransferAmount, adminName, null, constPlayerCreditTransferStatus.SEND);
                            return dPCT.playerTransferIn(
                                {
                                    playerId: player.playerId,
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
                                    let status = (error && error.errorMessage && error.errorMessage.indexOf('Request timeout') > -1) ? constPlayerCreditTransferStatus.TIMEOUT : constPlayerCreditTransferStatus.FAIL;
                                    // Third log - transfer in failed
                                    console.log('debug transfer error C:', error);
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, player.playerId, player.name, platform, platformId, "transferIn",
                                        id, providerShortId, transferAmount, lockedTransferAmount, adminName, error, status);

                                    error.hasLog = true;
                                    return Promise.reject(error);
                                }
                            );
                        }
                    );
                }
            }
        ).then(
            res => {
                if (res) {
                    // CPMS call is success
                    // Log credit change when transfer success
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -validTransferAmount, constPlayerCreditChangeType.TRANSFER_IN, playerCredit, 0, -lockedTransferAmount, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });

                    // Logging Transfer Success
                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, player.playerId, player.name, platform,
                        platformId, constPlayerCreditChangeType.TRANSFER_IN, transferId, providerShortId, transferAmount, lockedTransferAmount, adminName, res, constPlayerCreditTransferStatus.SUCCESS);

                    // End return
                    return dbConfig.collection_rewardTaskGroup.find({
                        platformId: ObjectId(platform),
                        playerId: ObjectId(playerObjId),
                        status: constRewardTaskStatus.STARTED
                    }).lean().then(
                        rewardTaskData => {
                            let lockedCreditPlayer = 0;
                            if (rewardTaskData && rewardTaskData.length > 0) {
                                for (let i = 0; i < rewardTaskData.length; i++) {
                                    if (rewardTaskData[i].rewardAmt)
                                        lockedCreditPlayer += rewardTaskData[i].rewardAmt;
                                }
                            }
                            rewardTaskAmount = lockedCreditPlayer ? lockedCreditPlayer : 0;
                            let responseData = {
		                        playerId: player.playerId,
		                        providerId: providerShortId,
		                        providerCredit: parseFloat(res.credit).toFixed(2),
		                        playerCredit: parseFloat(playerCredit).toFixed(2),
		                        rewardCredit: parseFloat(rewardTaskAmount).toFixed(2),
		                        transferCredit: {
		                            playerCredit: parseFloat(gameAmount - rewardAmount).toFixed(2),
		                            rewardCredit: parseFloat(rewardAmount).toFixed(2)
		                        }
		                    };
                            console.log('MT --checking --providerGroup ', responseData);
		                    return responseData;
                        });

                }
                else {
                    return Q.reject({name: "DataError", message: "Error transfer player credit to provider."});
                }
            },
            err => {
                return Promise.resolve().then(
                    () => {
                        //change player credit back if transfer failed
                        if (bTransfered) {
                            console.error(err);
                            if ( (err && err.errorMessage && err.errorMessage.indexOf('Request timeout') > -1) || (err && err.message && err.message.indexOf('Game is not available') > -1 ) ){
                                // Log credit change also when request timeout since amount already deducted
                                dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -validTransferAmount, constPlayerCreditChangeType.TRANSFER_IN_FAILED, playerCredit, 0, -lockedTransferAmount, null, {
                                    providerId: providerShortId,
                                    providerName: cpName,
                                    transferId: transferId,
                                    adminName: adminName
                                });
                            } else {
                                return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId, true).then(
                                    () => Promise.reject({
                                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                        name: "NumError",
                                        errorMessage: "Player does not have enough credit."
                                    })
                                );
                            }
                        }
                    }
                ).catch(errorUtils.reportError).then(
                    () => Promise.reject(err)
                );
            }
        );
    },

    /**
     * Main transfer out logic
     * - Query and check if in game credit is sufficient
     * @param playerObjId
     * @param platform
     * @param providerId
     * @param amount
     * @param playerId
     * @param providerShortId
     * @param userName
     * @param platformId
     * @param adminName
     * @param cpName
     * @param bResolve - Flag to force resolve this transfer out due to certain condition
     * @param maxReward
     * @param forSync
     */
    playerCreditTransferFromProviderWithProviderGroup: function (playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync, isMultiProvider) {
        let rewardTaskTransferredAmount = 0;
        let validCreditToAdd = 0;
        let gameCredit = 0;
        let playerCredit = 0;
        let rewardTaskCredit = 0;
        let providerPlayerObj;
        let checkBResolve = false;

        // First, need to make sure there's money in provider first
        let creditQuery = forSync ?
            Promise.resolve({credit: amount})
            :
            cpmsAPI.player_queryCredit(
                {
                    username: userName,
                    platformId: platformId,
                    providerId: providerShortId
                }
            );

        return creditQuery.then(
            res => {
                console.log("cpmsAPI.player_queryCredit return res",res);
                if (res) {
                    providerPlayerObj = {gameCredit: res.credit ? parseFloat(res.credit) : 0};

                    // Player has insufficient credit to transfer out, check bResolve
                    if (providerPlayerObj.gameCredit < 1 || amount == 0 || providerPlayerObj.gameCredit < amount) {
                        if (bResolve) {
                            checkBResolve = true;
                            return Promise.reject({message: translate("Insufficient amount to transfer out"), insufficientAmount: true});
                        }
                        else {
                            return Promise.resolve(
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
                    }

                    return dbPlayerCreditTransfer.TransferPlayerCreditFromProviderWithProviderGroup(playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, bResolve, forSync, providerPlayerObj, checkBResolve, adminName, cpName);
                } else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Cant find player credit in provider."
                    });
                }
            },
            err => {
                if (bResolve) {
                    checkBResolve = true;
                    throw new Error("Error when querying CPMS");
                }
                else{
                    return Promise.reject(err);
                }
            }
        ).catch(err => {
            if (!isMultiProvider) {
                return Promise.reject(err);
            }
        });
    },

    /**
     * Main transfer out logic
     * - Check provider group credit
     * @param playerObjId
     * @param platform
     * @param providerId
     * @param amount
     * @param playerId
     * @param providerShortId
     * @param userName
     * @param platformId
     * @param bResolve
     * @param forSync
     * @param providerPlayerObj
     * @param checkBResolve
     * @param adminName
     * @param cpName
     * @param gameProviderGroup
     * @param useEbetWallet
     * @constructor
     */
    TransferPlayerCreditFromProviderWithProviderGroup: async function(playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, bResolve, forSync, providerPlayerObj, checkBResolve, adminName, cpName, gameProviderGroup, useEbetWallet, isEbet) {
        let pCTFP = this;
        let lockedAmount = 0;
        let rewardTaskTransferredAmount = 0;
        let validCreditToAdd = 0;
        let gameCredit = 0;
        let playerCredit = 0;
        let rewardTaskCredit = 0;
        let transferId = new Date().getTime();
        let rewardGroupObj;
        let updateObj = {};
        let eBetWalletObj = {};

        // check if player.lastplayedprovider is the same as current providerid
        console.log("TransferPlayerCreditFromProviderWithProviderGroup**");
        console.log("playerObjId", playerObjId);
        if(!useEbetWallet) {
            let playerData = await dbConfig.collection_players.findOne({_id: playerObjId}).populate({
                path: "lastPlayedProvider",
                model: dbConfig.collection_gameProvider
            }).lean();

            console.log("playerData.lastPlayedProvider", playerData && playerData.lastPlayedProvider ? playerData.lastPlayedProvider : null);
            console.log("gameProviderGroup", gameProviderGroup);
            console.log("providerId", providerId);
            if ((playerData && playerData.lastPlayedProvider && playerData.lastPlayedProvider._id) &&
                playerData.lastPlayedProvider._id != providerId) {
                gameProviderGroup = null;
                providerId = playerData.lastPlayedProvider._id;
            }
            console.log("AFTER MAKE OVER");
            console.log("gameProviderGroup", gameProviderGroup);
            console.log("providerId", providerId);
        }

        return checkProviderGroupCredit(playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, bResolve, forSync, gameProviderGroup, useEbetWallet).then(
            res => {
                if (res && res[1]) {
                    amount = res[0];
                    updateObj = res[1];
                    rewardGroupObj = res[2];
                    if (useEbetWallet === true && res[3]) {
                        eBetWalletObj = res[3];
                    }

                    if (res[0]) {
                        return counterManager.incrementAndGetCounter("transferId").then(
                            function (id) {
                                transferId = id;
                                dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", id,
                                    providerShortId, amount, updateObj.rewardAmt, adminName, null, constPlayerCreditTransferStatus.SEND, isEbet);
                                let playerTransferOutRequestData = {
                                    playerId: playerId,
                                    username: userName,
                                    platformId: platformId,
                                    providerId: providerShortId,
                                    transferId: id, //chance.integer({min: 1000000000000000000, max: 9999999999999999999}),
                                    credit: amount
                                };
                                if (useEbetWallet === true) {
                                    playerTransferOutRequestData.wallet = eBetWalletObj;
                                }
                                console.log("zm check transferout start", userName, id);
                                return pCTFP.playerTransferOut(playerTransferOutRequestData).then(
                                    res => {
                                        // misleading console log message, it just mean transfer out success no matter ebetwallet or not
                                        console.log("zm check transferout end", userName, id);
                                        console.log("ebetwallet pCTFP.playerTransferOut success", res);
                                        return res;
                                    },
                                    error => {
                                        console.log("ebetwallet pCTFP.playerTransferOut error", error);
                                        // let lockedAmount = rewardTask && rewardTask.currentAmount ? rewardTask.currentAmount : 0;
                                        dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform, platformId, "transferOut", id,
                                            providerShortId, amount, updateObj.rewardAmt, adminName, error, constPlayerCreditTransferStatus.FAIL, isEbet);
                                        error.hasLog = true;
                                        return Q.reject(error);
                                    }
                                );
                            }
                        );
                    } else if (res[0] == 0 && res[2]) {  //if the amount is 0 but there is reward task group
                        return true;
                    } else {
                        // should not reach here
                        return errorUtils.reportError(res);
                    }
                }
            }
        ).then(
            res => {
                if (res) {
                    // CPMS Transfer out success
                    // Update reward task group if available
                    if (rewardGroupObj) {
                        return dbConfig.collection_rewardTaskGroup.findOneAndUpdate({
                            _id: rewardGroupObj._id
                        }, {
                            $inc: {
                                rewardAmt: updateObj.rewardAmt,
                                _inputFreeAmt: updateObj._inputFreeAmt,
                                _inputRewardAmt: updateObj._inputRewardAmt,
                            },
                            inProvider: false
                        }).then(
                            preRTG => {
                                // Check if RTG has done operation before setting inProvider = false
                                if (preRTG.status !== constRewardTaskStatus.STARTED) {
                                    // Experimental: Log here
                                    console.log('RT - Unlock after transfer out', preRTG);
                                    console.log('RT - freeAmt', updateObj.freeAmt);

                                    // Since we are going to unlock this, we set freeAmt to 0 to prevent double addition
                                    // updateObj.freeAmt = 0;

                                    return dbConfig.collection_rewardTaskGroup.findOne({
                                        _id: rewardGroupObj._id
                                    }).lean().then(
                                        RTGdata => {
                                            return dbRewardTask.completeRewardTaskGroup(RTGdata, RTGdata.status).then(() => true);
                                        }
                                    );
                                }

                                return true;
                            }
                        )
                    } else {
                        return true;
                    }
                }
            },
            function (error) {
                //log transfer error
                return Promise.reject(error);
            }
        ).then(
            res => {
                if (res) {
                    let updatePlayerObj = {
                        lastPlayedProvider: null,
                        $inc: {validCredit: updateObj.freeAmt}
                    };

                    // DO NOT REMOVE - Log to verify update amount to player
                    console.log(`Updating ${userName} credit ${updateObj.freeAmt} after transfer out`);

                    //move credit to player
                    return dbOps.findOneAndUpdateWithRetry(dbConfig.collection_players, {_id: playerObjId, platform: platform}, updatePlayerObj, {new: true});
                } else {
                    return Q.reject({
                        status: constServerCode.PLAYER_REWARD_INFO,
                        name: "DataError",
                        message: "Error when updating reward group information for player"
                    });
                }
            }, function (err) {
                return Q.reject({
                    status: constServerCode.PLAYER_REWARD_INFO,
                    name: "DataError",
                    message: "Error when finding reward information for player",
                    error: err
                });
            }
        ).then(
            res => {
                if (res) {//create log
                    playerCredit = res.validCredit;
                    let lockedCredit = res.lockedCredit;
                    if(amount != 0) {
                        dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, updateObj.freeAmt, constPlayerCreditChangeType.TRANSFER_OUT, playerCredit, lockedCredit, updateObj.rewardAmt, null, {
                            providerId: providerShortId,
                            providerName: cpName,
                            transferId: transferId,
                            adminName: adminName
                        });
                        // Logging Transfer Success
                        dbLogger.createPlayerCreditTransferStatusLog(playerObjId, playerId, userName, platform,
                            platformId, constPlayerCreditChangeType.TRANSFER_OUT, transferId, providerShortId, amount, updateObj.rewardAmt, adminName, res, constPlayerCreditTransferStatus.SUCCESS, isEbet);
                    }
                    return dbConfig.collection_rewardTaskGroup.find({
                        platformId: ObjectId(platform),
                        playerId: ObjectId(playerObjId),
                        status: constRewardTaskStatus.STARTED
                    }).lean().then(
                        rewardTaskData => {
                            let lockedCreditPlayer = 0;
                            if (rewardTaskData && rewardTaskData.length > 0) {
                                for (let i = 0; i < rewardTaskData.length; i++) {
                                    if (rewardTaskData[i].rewardAmt)
                                        lockedCreditPlayer += rewardTaskData[i].rewardAmt;
                                }
                            }
                            lockedAmount = lockedCreditPlayer ? lockedCreditPlayer : 0;
                            rewardTaskCredit = lockedAmount;

                            return Promise.resolve(
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
                        });

                }
                else {
                    return Promise.reject({name: "DBError", message: "Failed to increase player credit."})
                }
            },
            err => {
                return Promise.reject({name: "DBError", message: "Error in increasing player credit.", error: JSON.stringify(err)});
            }
        ).catch(
            err => {
                if (bResolve && checkBResolve) {
                    return dbConfig.collection_players.findOne({_id: playerObjId}).lean().then(
                        playerData => {
                            return Promise.resolve(
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
                } else {
                    return Promise.reject({
                        name: "DBError",
                        message: JSON.stringify(err)
                    })
                }
            }
        );
    },

    // TRAP ALERT :: providerId here accept provider's ObjectId instead of actual providerId
    playerCreditTransferToEbetWallets: function (playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync, isUpdateTransferId, currentDate) {
        let checkAmountProm = [];
        let transferIn = Promise.resolve();
        let transferInSuccessData = [];
        let hasEbetWalletSettings = false;
        let waitTimePerRequest = 2000; //2seconds for one transaction
        let delayTransferIn = ()=>{
            return new Promise ((resolve) => {
                setTimeout(() => {
                        return resolve();
                    }, waitTimePerRequest
                );
            });
        };

        return dbEbetWallet.getRelevantPOIDsFromPOID(providerId).then(poids => { // get relevent wallet channel group
            return dbConfig.collection_gameProviderGroup.find({
                platform: platform,
                providers: {$in: poids}
            }).populate(
                {path: "providers", model: dbConfig.collection_gameProvider}
            ).lean();
        }).then(groups => {
            if(groups && groups.length > 0) {
                groups.forEach(group => {
                    if(group.hasOwnProperty('ebetWallet') && group.ebetWallet > 0) {
                        hasEbetWalletSettings = true;
                        checkAmountProm.push(
                            dbConfig.collection_rewardTaskGroup.findOne({
                                platformId: platform,
                                playerId: playerObjId,
                                providerGroup: group._id,
                                status: {$in: [constRewardTaskStatus.STARTED]}
                            }).lean().then(rtg => {
                                if(rtg && rtg.rewardAmt > 0) {
                                    transferIn = transferIn.then(() => {
                                        return dbPlayerCreditTransfer.playerCreditTransferToEbetWallet(group, playerObjId, platform,
                                            providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync).then(ret => {
                                            transferInSuccessData.push(ret);
                                        }).catch(err => {
                                            return errorUtils.reportError(err);
                                        });
                                    })
                                        // .then(delayTransferIn);
                                }
                            })
                        );
                    }
                });
                checkAmountProm.push(
                    dbConfig.collection_players.findOne({_id: playerObjId}).lean().then(player => {
                        if(player && Math.floor(parseFloat(player.validCredit)) > 0) {
                            transferIn = transferIn.then(() => {
                                return dbPlayerCreditTransfer.playerCreditTransferToEbetWallet(null, playerObjId, platform,
                                    providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync).then(ret => {
                                    transferInSuccessData.push(ret);
                                }).catch(err => {
                                    errorUtils.reportError(err);
                                    return Promise.reject(err);
                                });
                            });
                        }
                    })
                );
                if(hasEbetWalletSettings) {
                    return Promise.all(checkAmountProm).then(() => {
                        return transferIn;
                    }).then(() => {
                        console.log('transferin promise data',transferInSuccessData);
                        if(transferInSuccessData && transferInSuccessData.length > 0) {
                            if(isUpdateTransferId){
                                console.log("LH check Ebet 1--------------", transferInSuccessData);
                                let totalTransferAmount = transferInSuccessData.reduce((a, b) => a + b.transferAmount, 0);
                                console.log("LH check Ebet 2--------------", totalTransferAmount);
                                dbPlayerInfo.updatePlayerBonusDoubledReward(playerObjId, platform, currentDate, transferInSuccessData[0].transferId, totalTransferAmount);
                            }

                            return Promise.resolve({
                                playerId: transferInSuccessData[0].playerId,
                                providerId: transferInSuccessData[0].providerId,
                                providerCredit: transferInSuccessData[0].providerCredit,
                                playerCredit: transferInSuccessData[0].playerCredit,
                                rewardCredit: transferInSuccessData[0].rewardCredit,
                                transferCredit: {
                                    playerCredit: transferInSuccessData[0].transferCredit.playerCredit,
                                    rewardCredit: transferInSuccessData[0].transferCredit.rewardCredit
                                }
                            });
                        }
                    })
                    .catch(err => {
                        errorUtils.reportError(err);
                        return Promise.reject(err);
                    });
                } else {
                    return Promise.reject({message: "No wallet is set for EBET provider."});
                }
            }
        });
    },

    playerCreditTransferToEbetWallet: function (gameProviderGroup, playerObjId, platform, providerId, amount, providerShortId, userName, platformId, adminName, cpName, forSync) {
        let dPCT = this;
        let gameAmount = 0;
        let rewardAmount = 0;
        let playerCredit = 0;
        let rewardTaskAmount = 0;
        let validTransferAmount = 0, lockedTransferAmount = 0;
        let bTransfered = false;
        let transferId = new Date().getTime();
        let transferAmount = 0;
        let transferWallet = {};
        let isEbet = true;

        let player, rewardTaskGroupObjId;

        let playerProm = dbConfig.collection_players.findOne({_id: playerObjId}).populate(
            {path: "lastPlayedProvider", model: dbConfig.collection_gameProvider}
        ).lean();

        // Search provider group
        return playerProm.then(
            res => {
                player = res;

                // Check if player exist
                if (!player) {
                    return Q.reject({name: "DataError", message: "Can't find player information."});
                }

                // Add player's current validCredit to transferAmount first
                // If amount is less than 0, means transfer all
                validTransferAmount += amount > 0 ? amount : Math.floor(parseFloat(player.validCredit.toFixed(2)));
                validTransferAmount = Math.floor(validTransferAmount);

                // Search for reward task group of this player on this provider
                return gameProviderGroup ?
                    dbConfig.collection_rewardTaskGroup.findOne({
                        platformId: platform,
                        playerId: playerObjId,
                        providerGroup: gameProviderGroup._id,
                        status: {$in: [constRewardTaskStatus.STARTED]}
                    }).lean() : null;
            }
        ).then(
            res => {
                let rewardTaskGroup = res;

                if (rewardTaskGroup) {
                    // There is on-going reward task group
                    validTransferAmount = 0;
                    lockedTransferAmount += parseInt(rewardTaskGroup.rewardAmt);
                    // rewardTaskGroup._inputFreeAmt += validTransferAmount;
                    rewardTaskGroupObjId = rewardTaskGroup._id;
                }

                console.log("transfer in gameProviderGroup", gameProviderGroup);
                // Calculate total amount needed to transfer to CPMS
                transferAmount = validTransferAmount + lockedTransferAmount;
                if(gameProviderGroup) {
                    if (gameProviderGroup.hasOwnProperty('ebetWallet')) {
                        transferWallet[gameProviderGroup.ebetWallet] = lockedTransferAmount;
                    }
                } else {
                    console.log('MT --checking gameProviderGroup', gameProviderGroup, platform, playerObjId, validTransferAmount);
                    transferWallet[0] = validTransferAmount;
                }

                // Check player have enough credit
                if (transferAmount < 1 || amount == 0) {
                    // There is no enough credit to transfer
                    return Promise.reject({
                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                        name: "NumError",
                        errorMessage: "Player does not have enough credit."
                    });
                }

                return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId);
            }
        ).then(
            res => {
                console.log("transfer in second then",gameProviderGroup ? gameProviderGroup.name : 'null', res);
                if (res && res[0] && res[1]) {
                    let updatedPlayerData = res[0];
                    let updatedGroupData = res[1];

                    // FAILURE CHECK - Check player has negative valid amount after transfer
                    if (updatedPlayerData.validCredit < -0.02) {
                        // Player credit is less than expected after deduct, revert the decrement
                        return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId, true).then(
                            () => Promise.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "NumError",
                                errorMessage: "Player does not have enough credit."
                            })
                        );
                    }

                    playerCredit = updatedPlayerData.validCredit;
                    //fix float number problem after update
                    if ((updatedPlayerData.validCredit > -0.02 && updatedPlayerData.validCredit < 0) || (updatedPlayerData.lockedCredit > -0.02 && updatedPlayerData.lockedCredit < 0)) {
                        let uObj = {};
                        if (updatedPlayerData.validCredit > -0.02 && updatedPlayerData.validCredit < 0) {
                            playerCredit = 0;
                            uObj.validCredit = 0;
                        }
                        if (updatedPlayerData.lockedCredit > -0.02 && updatedPlayerData.lockedCredit < 0) {
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
            }
        ).then(
            res => {
                console.log("transfer in third then",gameProviderGroup ? gameProviderGroup.name : 'null', res);
                if (res) {
                    // Operation on player credit is success on FPMS side
                    bTransfered = true;
                    if (forSync) {
                        return true;
                    }

                    return counterManager.incrementAndGetCounter("transferId").then(
                        id => {
                            transferId = id;
                            //let lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                            // Second log before call cpmsAPI
                            dbLogger.createPlayerCreditTransferStatusLog(playerObjId, player.playerId, player.name, platform, platformId, "transferIn",
                                id, providerShortId, transferAmount, lockedTransferAmount, adminName, null, constPlayerCreditTransferStatus.SEND, isEbet);
                            console.log("dPCT.playerTransferIn transferWallet", transferWallet);
                            console.log("zm check transferin start", userName, id);
                            return dPCT.playerTransferIn(
                                {
                                    playerId: player.playerId,
                                    username: userName,
                                    platformId: platformId,
                                    providerId: providerShortId,
                                    transferId: id, //chance.integer({min: 1000000000000000000, max: 9999999999999999999}),
                                    credit: transferAmount,
                                    wallet: transferWallet
                                }
                            ).then(
                                res => {
                                    console.log("zm check transferin end", userName, id);
                                    return res;
                                },
                                error => {
                                    // var lockedAmount = rewardData.currentAmount ? rewardData.currentAmount : 0;
                                    let status = (error && error.errorMessage && error.errorMessage.indexOf('Request timeout') > -1) ? constPlayerCreditTransferStatus.TIMEOUT : constPlayerCreditTransferStatus.FAIL;
                                    // Third log - transfer in failed
                                    console.log('debug transfer error D:', error);
                                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, player.playerId, player.name, platform, platformId, "transferIn",
                                        id, providerShortId, transferAmount, lockedTransferAmount, adminName, error, status, isEbet);

                                    error.hasLog = true;
                                    return Promise.reject(error);
                                }
                            );
                        }
                    );
                }
            }
        ).then(
            res => {
                console.log("dPCT.playerTransferIn res", res);
                if (res && res.wallet && (gameProviderGroup && gameProviderGroup.hasOwnProperty('ebetWallet') && res.wallet[gameProviderGroup.ebetWallet] == 0 ||
                        gameProviderGroup == null && res.wallet[0] == 0)) {
                    // CPMS call is success
                    // Log credit change when transfer success
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -validTransferAmount, constPlayerCreditChangeType.TRANSFER_IN, playerCredit, 0, -lockedTransferAmount, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });

                    // Logging Transfer Success
                    dbLogger.createPlayerCreditTransferStatusLog(playerObjId, player.playerId, player.name, platform,
                        platformId, constPlayerCreditChangeType.TRANSFER_IN, transferId, providerShortId, transferAmount, lockedTransferAmount, adminName, res, constPlayerCreditTransferStatus.SUCCESS, isEbet);

                    return dbConfig.collection_rewardTaskGroup.find({
                        platformId: ObjectId(platform),
                        playerId: ObjectId(playerObjId),
                        status: constRewardTaskStatus.STARTED
                    }).lean().then(
                        rewardTaskData => {
                            let lockedCreditPlayer = 0;
                            if (rewardTaskData && rewardTaskData.length > 0) {
                                for (let i = 0; i < rewardTaskData.length; i++) {
                                    if (rewardTaskData[i].rewardAmt)
                                        lockedCreditPlayer += rewardTaskData[i].rewardAmt;
                                }
                            }
                            rewardTaskAmount = lockedCreditPlayer ? lockedCreditPlayer : 0;
                            let responseData = {
                                playerId: player.playerId,
                                providerId: providerShortId,
                                providerCredit: parseFloat(res.credit).toFixed(2),
                                playerCredit: parseFloat(playerCredit).toFixed(2),
                                rewardCredit: parseFloat(rewardTaskAmount).toFixed(2),
                                transferCredit: {
                                    playerCredit: parseFloat(gameAmount - rewardAmount).toFixed(2),
                                    rewardCredit: parseFloat(rewardAmount).toFixed(2)
                                },
                                transferId: transferId,
                                transferAmount: transferAmount
                            };

                            return responseData;
                        });

                }
                else if (res && res.wallet && (gameProviderGroup && gameProviderGroup.hasOwnProperty('ebetWallet') && res.wallet[gameProviderGroup.ebetWallet] > 0 ||
                        gameProviderGroup == null && res.wallet[0] > 0)) {
                    dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -validTransferAmount, constPlayerCreditChangeType.TRANSFER_IN_FAILED, playerCredit, 0, -lockedTransferAmount, null, {
                        providerId: providerShortId,
                        providerName: cpName,
                        transferId: transferId,
                        adminName: adminName
                    });
                    return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId, true)
                }
                else {
                    return Q.reject({name: "DataError", message: "Error transfer player credit to provider."});
                }
            },
            err => {
                return Promise.resolve().then(
                    () => {
                        //change player credit back if transfer failed
                        if (bTransfered) {
                            console.error(err);
                            if (err && err.errorMessage && err.errorMessage.indexOf('Request timeout') > -1) {
                                // Log credit change also when request timeout since amount already deducted
                                dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platform, -validTransferAmount, constPlayerCreditChangeType.TRANSFER_IN_FAILED, playerCredit, 0, -lockedTransferAmount, null, {
                                    providerId: providerShortId,
                                    providerName: cpName,
                                    transferId: transferId,
                                    adminName: adminName
                                });
                            } else {
                                return playerCreditChangeWithRewardTaskGroup(player._id, player.platform, rewardTaskGroupObjId, validTransferAmount, lockedTransferAmount, providerId, true).then(
                                    () => Promise.reject({
                                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                        name: "NumError",
                                        errorMessage: "Player does not have enough credit."
                                    })
                                );
                            }
                        }
                    }
                ).catch(errorUtils.reportError).then(
                    () => Promise.reject(err)
                );
            }
        );
    },

    playerCreditTransferFromEbetWallets: function (playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync, isMultiProvider) {
        let checkRTGProm = [];
        let transferOut = Promise.resolve();
        let transferOutSuccessData = [];
        let transferOutErrorData = [];
        let gameCredit;
        let hasEbetWalletSettings = false;
        let waitTimePerRequest = 2000; //2seconds for one transaction
        let delayTransferOut = ()=>{
            return new Promise ((resolve) => {
                setTimeout(() => {
                        return resolve();
                    }, waitTimePerRequest
                );
            });
        };

        console.log("playerCreditTransferFromEbetWallets getPlayerGameCredit", { // debug log #22332F
            username: userName,
            platformId: platformId,
            providerId: providerShortId
        })
        return dbPlayerCreditTransfer.getPlayerGameCredit({
            username: userName,
            platformId: platformId,
            providerId: providerShortId
        }).then(res => {
            gameCredit = res;
            console.log("playerCreditTransferFromEbetWallets gameCredit", gameCredit) // debug log #22332F
            return dbEbetWallet.getRelevantPOIDsFromPOID(providerId);
        }).then(poids => {
            if(gameCredit && gameCredit.wallet) {
                return dbConfig.collection_gameProviderGroup.find({
                    platform: platform,
                    providers: {$in: poids},
                }).populate(
                    {path: "providers", model: dbConfig.collection_gameProvider}
                ).lean();
            } else {
                return Promise.reject({message: "Unable to contact CPMS / no wallet in CPMS"});
            }
        }).then(groups => {
            if(groups && groups.length > 0) {
                groups.forEach(group => {
                    if(group.hasOwnProperty('ebetWallet') && group.ebetWallet > 0 && gameCredit.wallet.hasOwnProperty(group.ebetWallet.toString())) {
                        let hasEbet = false;
                        group.providers.forEach(provider => {
                            let providerName = provider.code ? provider.code.toUpperCase() : '';
                            if (ebetWalletProviders.includes(providerName)) {
                                hasEbet = true;
                            }
                        });
                        hasEbetWalletSettings = true;
                        checkRTGProm.push(
                            dbConfig.collection_rewardTaskGroup.findOne({
                                platformId: platform,
                                playerId: playerObjId,
                                providerGroup: group._id,
                                status: constRewardTaskStatus.STARTED
                            }).populate({
                                path: "lastPlayedProvider", model: dbConfig.collection_gameProvider
                            }).lean().then(RTG => {
                                console.log("Reward Task Group filter", RTG);
                                let providerName = RTG && RTG.lastPlayedProvider && RTG.lastPlayedProvider.name ? RTG.lastPlayedProvider.name.toUpperCase() : '';
                                console.log('playerCreditTransferFromEbetWallets group if detail', group.name, providerName, hasEbet, gameCredit.wallet[group.ebetWallet]) // debug log #22332F
                                if((providerName && ebetWalletProviders.includes(providerName)) ||
                                    (hasEbet && gameCredit.wallet[group.ebetWallet] > 0)) {
                                    transferOut = transferOut.then(() => {
                                        return dbPlayerCreditTransfer.playerCreditTransferFromEbetWallet(group, playerObjId, platform, providerId,
                                            amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync).then(ret => {
                                            transferOutSuccessData.push(ret);
                                        }).catch(err => {
                                            transferOutErrorData.push(err);
                                            return errorUtils.reportError(err);
                                        });
                                    })
                                        // .then(delayTransferOut);
                                }
                            })
                        );
                    }
                });
                if(hasEbetWalletSettings) {
                    let freeCreditGroupData = {
                        ebetWallet: 0
                    };
                    // return Promise.all(checkRTGProm).then(() => {
                    //     return dbConfig.collection_rewardTaskGroup.findOne({
                    //         platformId: platform,
                    //         playerId: playerObjId,
                    //         status: {$in: [constRewardTaskStatus.STARTED]},
                    //         $or: [{providerGroup:{ $exists: false }}, {providerGroup: null}]
                    //     }).populate({
                    //         path: "lastPlayedProvider", model: dbConfig.collection_gameProvider
                    //     }).lean()
                    // }).then(RTG => {
                    //     console.log("checkRTG for free credit", RTG);
                    //     if(RTG && RTG.lastPlayedProvider && RTG.lastPlayedProvider.name &&
                    //         (RTG.lastPlayedProvider.name.toUpperCase() === "EBET" || RTG.lastPlayedProvider.name.toUpperCase() === "EBETSLOTS")) {
                    return Promise.all(checkRTGProm).then(() => {
                        console.log('playerCreditTransferFromEbetWallets gameCredit.wallet[0]', gameCredit.wallet[0]) // debug log #22332F
                        if(gameCredit.wallet[0] > 0) {
                            transferOut = transferOut.then(() => {
                                return dbPlayerCreditTransfer.playerCreditTransferFromEbetWallet(freeCreditGroupData, playerObjId, platform, providerId,
                                    amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync).then(ret => {
                                    transferOutSuccessData.push(ret);
                                }).catch(err => {
                                    transferOutErrorData.push(err);
                                    return errorUtils.reportError(err);
                                })
                            });
                        }
                        return transferOut;
                    }).then(() => {
                        console.log('transferOut Success Data',transferOutSuccessData);
                        console.log('transferOut Error Data',transferOutErrorData);
                        let providerCredit = 0, playerCredit = 0, rewardCredit = 0, transferPlayerCredit = 0, transferRewardCredit = 0;
                        transferOutSuccessData.forEach(item => {
                            if(item && item.providerCredit && item.playerCredit && item.rewardCredit &&
                                item.transferCredit.playerCredit && item.transferCredit.rewardCredit) {
                                providerCredit += parseFloat(item.providerCredit);
                                playerCredit += parseFloat(item.playerCredit);
                                rewardCredit += parseFloat(item.rewardCredit);
                                transferPlayerCredit += parseFloat(item.transferCredit.playerCredit);
                                transferRewardCredit += parseFloat(item.transferCredit.rewardCredit);
                            }
                        });
                        if(transferOutSuccessData && transferOutSuccessData.length > 0) {
                            return {
                                playerId: transferOutSuccessData[0].playerId,
                                providerId: transferOutSuccessData[0].providerId,
                                providerCredit: providerCredit.toFixed(2),
                                playerCredit: playerCredit.toFixed(2),
                                rewardCredit: rewardCredit.toFixed(2),
                                transferCredit: {
                                    playerCredit: transferPlayerCredit.toFixed(2),
                                    rewardCredit: transferRewardCredit.toFixed(2)
                                }
                            }
                        } else {
                            return Promise.reject(transferOutErrorData[0]);
                        }
                    })
                    .catch(err => {
                        errorUtils.reportError(err);
                        return Promise.reject(err);
                    });
                } else {
                    return Promise.reject({message: "No wallet is set for EBET provider."});
                }
            }
        }).catch(err => {
            if (!isMultiProvider) {
                return Promise.reject(err);
            }
        });
    },

    playerCreditTransferFromEbetWallet: function (gameProviderGroup, playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, adminName, cpName, bResolve, maxReward, forSync) {
        //let pCTFP = this;
        //let lockedAmount = 0;
        let rewardTaskTransferredAmount = 0;
        let validCreditToAdd = 0;
        let gameCredit = 0;
        let playerCredit = 0;
        let rewardTaskCredit = 0;
        //let transferId = new Date().getTime();
        let providerPlayerObj = 0;

        //let rewardGroupObj;
        //let updateObj = {};
        let checkBResolve = false;
        let useEbetWallet = true;
        let isEbet = true;
        // First, need to make sure there's money in provider first
        let creditQuery = forSync ?
            Promise.resolve({credit: amount})
            :
            cpmsAPI.player_queryCredit(
                {
                    username: userName,
                    platformId: platformId,
                    providerId: providerShortId
                }
            );

        return creditQuery.then(
            res => {
                console.log("cpmsAPI.player_queryCredit return res",res);
                if (res) {
                    providerPlayerObj = {gameCredit: res.credit ? parseFloat(res.credit) : 0};

                    // Player has insufficient credit to transfer out, check bResolve
                    if (providerPlayerObj.gameCredit < 1 || amount == 0 || providerPlayerObj.gameCredit < amount) {
                        if (bResolve) {
                            checkBResolve = true;
                            return Promise.reject({message: translate("Insufficient amount to transfer out"), insufficientAmount: true});
                        }
                        else {
                            return Promise.resolve(
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
                    }

                    return dbPlayerCreditTransfer.TransferPlayerCreditFromProviderWithProviderGroup(playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, bResolve, forSync, providerPlayerObj, checkBResolve, adminName, cpName, gameProviderGroup, useEbetWallet, isEbet);
                } else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Cant find player credit in provider."
                    });
                }
            },
            err => {
                if (bResolve) {
                    checkBResolve = true;
                    throw new Error("Error when querying CPMS");
                }
                else{
                    return Promise.reject(err);
                }
            }
        );
    },

};

/**
 * TODO should we put a general log here to log all the credit change action performed?
 * @param playerObjId
 * @param platformObjId
 * @param incValidCredit
 * @param incLockedCredit
 * @param lastPlayedProviderObjId
 * @returns {*}
 */
function playerCreditChange(playerObjId, platformObjId, incValidCredit, incLockedCredit, lastPlayedProviderObjId) {
    let updateObj = {
        $inc: {validCredit: incValidCredit, lockedCredit: incLockedCredit}
    };

    if (lastPlayedProviderObjId) {
        updateObj.lastPlayedProvider = lastPlayedProviderObjId;
    }

    return dbOps.findOneAndUpdateWithRetry(
        dbConfig.collection_players,
        {_id: playerObjId, platform: platformObjId},
        updateObj,
        {new: true}
    );
}

/**
 *
 * @param playerObjId
 * @param platformObjId
 * @param rewardTaskGroupObjId
 * @param validCredit
 * @param rewardCredit
 * @param targetProviderId
 * @param isRevert
 * @returns {Promise.<*[]>}
 */
function playerCreditChangeWithRewardTaskGroup(playerObjId, platformObjId, rewardTaskGroupObjId, validCredit, rewardCredit, targetProviderId, isRevert) {
    let rewardTaskGroupProm = Promise.resolve(true);
    let updateGroupObj = {};
    let updatePlayerObj = {
        $inc: {validCredit: isRevert ? validCredit : -validCredit}
    };

    if (targetProviderId) {
        updatePlayerObj.lastPlayedProvider = targetProviderId;
    }

    let updatePlayerProm = dbOps.findOneAndUpdateWithRetry(
        dbConfig.collection_players,
        {_id: playerObjId, platform: platformObjId},
        updatePlayerObj,
        {new: true}
    );

    if (rewardTaskGroupObjId) {
        updateGroupObj = {
            $inc: {
                _inputFreeAmt: isRevert ? -validCredit : validCredit,
                _inputRewardAmt: isRevert ? -rewardCredit : rewardCredit,
                rewardAmt: isRevert ? rewardCredit : -rewardCredit
            },
            inProvider: true,
            lastPlayedProvider: targetProviderId
        };

        rewardTaskGroupProm = dbOps.findOneAndUpdateWithRetry(
            dbConfig.collection_rewardTaskGroup,
            {_id: rewardTaskGroupObjId},
            updateGroupObj,
            {new: true}
        );
    }

    return Promise.all([updatePlayerProm, rewardTaskGroupProm]);
}

function checkProviderGroupCredit(playerObjId, platform, providerId, amount, playerId, providerShortId, userName, platformId, bResolve, forSync, gameProviderGroup, useEbetWallet) {
    console.log('--MT --ori-gameProviderGroup', gameProviderGroup);
    // The reason to allow outside gameProviderGroup to pass in is,
    // There are time that would want to pass in other provider group to transferOut whole wallet channel
    let gameProviderGroupProm = gameProviderGroup ? Promise.resolve(gameProviderGroup) :
        dbConfig.collection_gameProviderGroup.findOne({
            platform: platform,
            providers: providerId
        }).lean();

    return gameProviderGroupProm.then(
        res => {
            gameProviderGroup = res;

            if (gameProviderGroup) {
                // Search for reward task group of this player on this provider
                let gameCreditProm = Promise.resolve(false);
                let rewardTaskGroupProm;
                console.log('--MT --gameProviderGroup', gameProviderGroup);
                if(useEbetWallet && gameProviderGroup && !gameProviderGroup._id) {
                    rewardTaskGroupProm = Promise.resolve(null);
                } else {
                    console.log("checkProviderGroupCredit rewardTaskGroupProm", {
                        platformId: platform,
                        playerId: playerObjId,
                        providerGroup: gameProviderGroup._id,
                        status: {$in: [constRewardTaskStatus.STARTED]}
                    })
                    rewardTaskGroupProm = dbConfig.collection_rewardTaskGroup.findOne({
                        platformId: platform,
                        playerId: playerObjId,
                        providerGroup: gameProviderGroup._id,
                        status: {$in: [constRewardTaskStatus.STARTED]}
                    }).lean();
                }

                if (forSync) {
                    gameCreditProm = Promise.resolve({credit: amount});
                } else {
                    console.log('MT --checking getPlayerGameCredit', userName, platformId, providerShortId);
                    gameCreditProm = dbPlayerCreditTransfer.getPlayerGameCredit(
                        {
                            username: userName,
                            platformId: platformId,
                            providerId: providerShortId
                        }
                    )
                }

                return Promise.all([gameCreditProm, rewardTaskGroupProm]);
            } else {
                // Group not exist, may be due to provider are not added in a group yet
                return Promise.reject({name: "DataError", message: "Provider are not added in a group yet."});
            }
        }
    ).then(
        res => {
            let updateObj = {};
            let rewardGroupObj;
            let eBetWalletObj = {};

            if (res && res[0]) {
                let providerPlayerObj = {gameCredit: res[0].credit ? parseInt(res[0].credit) : 0};
                rewardGroupObj = res[1];
                if(useEbetWallet === true) {
                    console.log('--MT --rewardGroupObj', rewardGroupObj);
                    let curWalletCredit = res[0].wallet[gameProviderGroup.ebetWallet];
                    let curWalletCreditRounded = Math.floor(curWalletCredit);
                    eBetWalletObj[gameProviderGroup.ebetWallet] = curWalletCreditRounded;
                    if (rewardGroupObj) {
                        amount = curWalletCreditRounded;
                        updateObj = {
                            rewardAmt: amount,
                            freeAmt: rewardGroupObj._inputFreeAmt,
                            _inputRewardAmt: -rewardGroupObj._inputRewardAmt,
                            _inputFreeAmt: -rewardGroupObj._inputFreeAmt
                        };
                    } else {
                        amount = curWalletCreditRounded;
                        updateObj.freeAmt = amount;
                    }
                    console.log('--MT --updateObj', updateObj);
                } else {
                    // Process transfer amount
                    amount = amount > 0 ? Math.floor(amount) : Math.floor(providerPlayerObj.gameCredit);

                    // Current credit in provider
                    let curGameCredit = providerPlayerObj.gameCredit;

                    // Check current game credit
                    if (curGameCredit < 1 || amount == 0 || curGameCredit < amount) {
                        let notEnoughCredit = true;
                        if (bResolve) {
                            return dbConfig.collection_players.findOne({_id: playerObjId}).lean().then(
                                playerData => {
                                    return {
                                        playerId: playerId,
                                        providerId: providerShortId,
                                        providerCredit: providerPlayerObj.gameCredit,
                                        playerCredit: playerData.validCredit,
                                        rewardCredit: playerData.lockedCredit
                                    }
                                }
                            );
                        } else {
                            return Promise.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "DataError",
                                errorMessage: "Player does not have enough credit."
                            });
                        }
                    }
                    console.log('MT --rewardGroupObj-2', rewardGroupObj);
                    if (rewardGroupObj) {
                        let totalInputCredit = rewardGroupObj._inputRewardAmt + rewardGroupObj._inputFreeAmt;

                        // Check current game credit against reward group credit
                        if (curGameCredit > totalInputCredit) {
                            // Scenario 1: User gains
                            let userProfit = curGameCredit - totalInputCredit;

                            updateObj = {
                                rewardAmt: rewardGroupObj._inputRewardAmt + userProfit,
                                freeAmt: rewardGroupObj._inputFreeAmt,
                                _inputRewardAmt: -rewardGroupObj._inputRewardAmt,
                                _inputFreeAmt: -rewardGroupObj._inputFreeAmt
                            };
                        } else if (curGameCredit < totalInputCredit) {
                            // Scenario 2: User loses
                            let userLoses = totalInputCredit - curGameCredit;
                            let rewardAmt = rewardGroupObj._inputRewardAmt - userLoses;
                            let freeAmt = rewardGroupObj._inputFreeAmt;

                            if (userLoses > rewardGroupObj._inputRewardAmt || rewardAmt < 0) {
                                rewardAmt = 0;
                                let userLosesLeft = userLoses - rewardGroupObj._inputRewardAmt;

                                freeAmt = (userLosesLeft >= rewardGroupObj._inputFreeAmt) ? 0 : rewardGroupObj._inputFreeAmt - userLosesLeft;
                            }

                            updateObj = {
                                rewardAmt: rewardAmt,
                                freeAmt: freeAmt,
                                _inputRewardAmt: -rewardGroupObj._inputRewardAmt,
                                _inputFreeAmt: -rewardGroupObj._inputFreeAmt
                            };
                        } else {
                            // Scenario 3: Break even / Didn't bet
                            updateObj = {
                                rewardAmt: rewardGroupObj._inputRewardAmt,
                                freeAmt: rewardGroupObj._inputFreeAmt,
                                _inputRewardAmt: -rewardGroupObj._inputRewardAmt,
                                _inputFreeAmt: -rewardGroupObj._inputFreeAmt
                            };
                        }
                    } else {
                        // There is no rewardGroupObj found
                        // Possibly due to reward group has archived or NO_CREDIT
                        // All amount goes to player's valid credit
                        console.log('amount', amount);
                        updateObj.freeAmt = amount;
                    }
                }
            } else {
                return Promise.reject({name: "DataError", message: "Cant find player credit in provider."});
            }

            return [amount, updateObj, rewardGroupObj, eBetWalletObj];
        }
    )
}

module.exports = dbPlayerCreditTransfer;
