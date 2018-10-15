const Q = require("q");

const cpmsAPI = require("../externalAPI/cpmsAPI");

const constGameStatus = require('./../const/constGameStatus');
const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
const constProposalStatus = require('./../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');
const constServerCode = require('../const/constServerCode');

const dbconfig = require('./../modules/dbproperties');
const dbLogger = require("./../modules/dbLogger");
const errorUtils = require("./../modules/errorUtils.js");

const dbProviderUtil = require("./../db_common/dbProviderUtility");

const dbPlayerUtility = {
    //region State

    /**
     * Enforce some API calls can only be execute once concurrently, typically when applying rewards
     * To use a new state, please add the stateName into playerState.js schema first
     * @param playerObjId
     * @param stateName
     * @returns {Promise|Promise.<TResult>}
     */
    setPlayerState: (playerObjId, stateName) => {
        stateName = "last" + stateName;

        let matchQ = {player: playerObjId};
        let updateQChild = {};
        updateQChild[stateName] = true;
        let updateQ = {$currentDate: updateQChild};
        let offSetTime = new Date() - 1000;

        return dbconfig.collection_playerState.findOne({player: playerObjId}).lean().then(
            stateRec => {
                if (!stateRec) {
                    return new dbconfig.collection_playerState(matchQ).save();
                } else {
                    if (stateRec[stateName]) {
                        // Double layer time verification
                        if (stateRec[stateName].getTime() > offSetTime) {
                            return false;
                        } else {
                            matchQ[stateName] = {$lt: offSetTime};
                        }
                    }

                    return dbconfig.collection_playerState.findOneAndUpdate(matchQ, updateQ, {new: true});
                }
            }
        )
    },

    /**
     *
     * @param playerObjId
     * @param stateName
     * @param bFlag - on/off flag
     */
    setPlayerBState: (playerObjId, stateName, bFlag, lastUpdateTime) => {
        let matchQ = {player: playerObjId};
        let updateQChild = {};
        updateQChild[stateName] = bFlag;
        let updateQ = {$set: updateQChild};
        //update time when set flag to false only
        if (lastUpdateTime) {
            if (bFlag) {
                // matchQ.$or = [];
                // let searchQ1 = {};
                // searchQ1[lastUpdateTime] = {$lt: new Date() - 300000};
                // matchQ.$or.push(searchQ1);
                //
                // let searchQ2 = {};
                // searchQ2[lastUpdateTime] = {$exists: false};
                // matchQ.$or.push(searchQ2);
                //
                // let searchQ3 = {};
                // searchQ3[stateName] = false;
                // matchQ.$or.push(searchQ3);

                updateQ.$currentDate = {};
                updateQ.$currentDate[lastUpdateTime] = true;
            }
        }
        let allowExec = true;

        return dbconfig.collection_playerBState.findOneAndUpdate(
            matchQ,
            updateQ,
            {
                new: false,
                upsert: true
            }
        ).then(
            beforeRec => {
                if (beforeRec && beforeRec[stateName] === bFlag) {
                    allowExec = false;
                    // if state locked more than 5 minutes, allow execute (prevent state locked forever)
                    if (lastUpdateTime && bFlag && beforeRec[lastUpdateTime] && (beforeRec[lastUpdateTime].getTime() <= new Date() - 300000)) {
                        allowExec = true;
                    }
                }
                return allowExec;
            },
            err => {
                // errorUtils.reportError(err);
                console.log("Player B state error", playerObjId, stateName);
                return false;
            }
        );
    },


    //endregion

    //region Credit

    getPlayerCreditByObjId: function (playerObjId) {
        let returnObj = {gameCredit: 0};
        return dbconfig.collection_players.findOne({_id: playerObjId}).populate(
            {path: "platform", model: dbconfig.collection_platform}).populate(
            {path: "lastPlayedProvider", model: dbconfig.collection_gameProvider}
        ).lean().then(
            playerData => {
                if (playerData) {
                    returnObj.validCredit = playerData.validCredit;
                    returnObj.lockedCredit = playerData.lockedCredit;
                    return dbconfig.collection_proposal
                        .find({
                            $or: [
                                {"data.playerId": playerData._id.toString()},
                                {"data.playerObjId": playerData._id.toString()},
                                {"data.playerId": playerData._id},
                                {"data.playerObjId": playerData._id}
                            ],
                            status: constProposalStatus.PENDING,
                            mainType: "Reward"
                        }).populate({path: "type", model: dbconfig.collection_proposalType}).lean().then(
                            proposals => {
                                let sumAmount = 0;
                                for (let key in proposals) {
                                    if (proposals.hasOwnProperty(key) && proposals[key].data) {
                                        let applyAmount = proposals[key].data.applyAmount || 0;
                                        let rewardAmount = proposals[key].data.rewardAmount || 0;
                                        let currentAmount = proposals[key].data.currentAmount || 0;
                                        if (proposals[key].type && (proposals[key].type.name == constProposalType.PLAYER_CONSUMPTION_RETURN || !playerData.platform.useLockedCredit)) {
                                            sumAmount = sumAmount + Number(rewardAmount);
                                        }
                                        else {
                                            sumAmount = sumAmount + Number(applyAmount) + Number(rewardAmount) + Number(currentAmount);
                                        }
                                    }
                                }
                                returnObj.pendingRewardAmount = sumAmount;
                                if (playerData.lastPlayedProvider && playerData.lastPlayedProvider.status == constGameStatus.ENABLE) {
                                    return cpmsAPI.player_queryCredit(
                                        {
                                            username: playerData.name,
                                            platformId: playerData.platform.platformId,
                                            providerId: playerData.lastPlayedProvider.providerId
                                        }
                                    ).then(
                                        creditData => {
                                            returnObj.gameCredit = creditData ? parseFloat(creditData.credit) : 0;
                                            return returnObj;
                                        }
                                    );
                                }
                                else {
                                    return returnObj;
                                }

                            }
                        )
                }
                else {
                    return {};
                }
            }
        );
    },

    /**
     *
     * @param playerObjId
     * @param platformObjId
     * @param updateAmount
     * @param reasonType
     * @param data
     */
    tryToDeductCreditFromPlayer: (playerObjId, platformObjId, updateAmount, reasonType, data) => {
        let playerCreditBeforeDeduct = 0;

        return Q.resolve().then(
            () => {
                if (updateAmount && updateAmount < 0) {
                    return Promise.reject({
                        name: "DataError",
                        message: "tryToDeductCreditFromPlayer expects a positive value to deduct",
                        updateAmount: updateAmount
                    });
                }
            }
        ).then(
            () => dbconfig.collection_players.findOne({_id: playerObjId, platform: platformObjId}).select('validCredit')
        ).then(
            player => {
                if (player) {
                    if (player.validCredit < updateAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            message: "Player does not have enough credit."
                        });
                    } else {
                        return playerCreditBeforeDeduct = player.validCredit;
                    }
                } else {
                    return Q.reject({
                        status: constServerCode.DOCUMENT_NOT_FOUND,
                        name: "DataError",
                        message: "Can't update player credit: player not found."
                    });
                }
            }
        ).then(
            () => dbPlayerUtility.changePlayerCredit(playerObjId, platformObjId, -updateAmount, reasonType, data)
        ).then(
            player => {
                if (player.validCredit < 0) {
                    // First reset the deduction, then report the problem
                    return Q.resolve().then(
                        () => dbPlayerUtility.changePlayerCredit(playerObjId, platformObjId, +updateAmount, constPlayerCreditChangeType.DEDUCT_BELOW_ZERO_REFUND, data)
                    ).then(
                        () => Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            message: "Player does not have enough credit.",
                            data: '(detected after withdrawl)'
                        })
                    );
                } else if (playerCreditBeforeDeduct - updateAmount != player.validCredit) {
                    // First reset the deduction, then report the problem
                    return Q.resolve().then(
                        () => dbPlayerUtility.changePlayerCredit(playerObjId, platformObjId, +updateAmount, constPlayerCreditChangeType.DEDUCT_BELOW_ZERO_REFUND, data)
                    ).then(
                        () => Q.reject({
                            status: constServerCode.ABNORMAL_CREDIT_DEDUCTION,
                            name: "DataError",
                            message: "Abnormal credit deduction",
                            data: '(detected after deduct credit)'
                        })
                    );
                } else {
                    return true;
                }
            }
        )
    },

    changePlayerCredit: function changePlayerCredit(playerObjId, platformObjId, updateAmount, reasonType, data) {
        return dbconfig.collection_players.findOneAndUpdate(
            {_id: playerObjId, platform: platformObjId},
            {$inc: {validCredit: updateAmount}},
            {new: true}
        ).then(
            player => {
                if (!player) {
                    return Q.reject({name: "DataError", message: "Can't update player credit: player not found."});
                }
                dbLogger.createCreditChangeLogWithLockedCredit(playerObjId, platformObjId, updateAmount, reasonType, player.validCredit, 0, 0, null, data);
                return player;
            },
            error => {
                return Q.reject({name: "DBError", message: "Error updating player.", error: error});
            }
        );
    },

    /**
     *
     * @param playerObjId
     * @param platformObjId
     * @param {ObjectID} providerGroupId - True: check providers in provider group, false: all providers
     * @returns {Promise<T>}
     */
    getProviderGroupInGameCreditByObjId: function (playerObjId, platformObjId, providerGroupId) {
        let providersCreditProm = Promise.resolve();

        if (providerGroupId) {
            providersCreditProm = dbProviderUtil.getProvidersDetailInProviderGroup(providerGroupId).then(
                providerGroup => {
                    if (providerGroup && providerGroup.providers && providerGroup.providers.length > 0) {
                        let promArr = [];

                        providerGroup.providers.map(provider => {
                            promArr.push(dbPlayerUtility.getProviderCreditByObjId(playerObjId, provider.providerId));
                        });

                        return Promise.all(promArr);
                    }
                }
            );
        } else {
            // Check credit in all providers
            providersCreditProm = dbconfig.collection_platform.find({_id: platformObjId})
                    .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean().then(
                platform => {
                    if (platform && platform.gameProviders && platform.gameProviders.length > 0) {
                        let promArr = [];

                        platform.gameProviders.map(provider => {
                            promArr.push(dbPlayerUtility.getProviderCreditByObjId(playerObjId, provider.providerId));
                        });

                        return Promise.all(promArr);
                    }
                }
            )
        }

        return providersCreditProm.then(
            res => {
                let retData = {
                    providerId: [],
                    totalInGameCredit: 0
                };

                if (res && res.length > 0) {
                    res.map(
                        data => {
                            if (data && data.credit) {
                                retData.providerId.push(data.providerId);
                                retData.totalInGameCredit += data.credit;
                            }
                        }
                    )
                }

                return retData;
            }
        );
    },

    getProviderCreditByObjId: (playerObjId, providerId) => {
        return dbconfig.collection_players.findOne({_id: playerObjId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).then(
            data => {
                if (data && data.isRealPlayer) {
                    return cpmsAPI.player_queryCredit(
                        {
                            username: data.name,
                            platformId: data.platform.platformId,
                            providerId: providerId
                        }
                    );
                }
            }
        ).then(
            data => {
                if (data) {
                    return {
                        providerId: providerId,
                        credit: Math.floor(parseFloat(data.credit))
                    }
                }
                else {
                    return {
                        providerId: providerId,
                        credit: 0
                    }
                }
            }
        ).catch(
            error => {
                // Don't care what happened to provider, just return 0
                return {
                    providerId: providerId,
                    credit: 0
                };
            }
        );
    },

    getPlayerValidCredit: (playerObjId) => dbconfig.collection_players.findOne({_id: playerObjId}, {_id: 0, validCredit: 1}).lean().then(res => res.validCredit),

    //endregion

    //region Permission

    /**
     *
     * @param platformObjId
     * @param playerObjId
     * @param permissionArr - Permission in player.permission, [[name in string, on/off]. ...[,]]
     */
    setPlayerPermission: (platformObjId, playerObjId, permissionArr) => {
        let permissionString;
        let updateData = {
            $set: {}
        };

        if (permissionArr && permissionArr.length > 0) {
            permissionArr.forEach(e => {
                permissionString = "permission." + e[0];
                updateData.$set[permissionString] = e[1];
            })
        }

        return dbconfig.collection_players.findOneAndUpdate(
            {_id: playerObjId, platform: platformObjId},
            updateData
        );
    },

    /**
     * @param adminObjId
     * @param platformObjId
     * @param playerObjId
     * @param remark
     * @param oldPermissionObj - Permission in player.permission, [[name in string, on/off]. ...[,]]
     * @param newPermissionObj - Permission in player.permission, [[name in string, on/off]. ...[,]]
     */
    addPlayerPermissionLog: (adminObjId, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj) => {
        let isSystem = !(adminObjId);
        let query = {
            admin: adminObjId,
            platform: platformObjId,
            player: playerObjId,
            remark: remark,
            oldData: oldPermissionObj,
            newData: newPermissionObj,
            isSystem: isSystem
        };
        return dbconfig.collection_playerPermissionLog(query).save();
    },

    //endregion
};

module.exports = dbPlayerUtility;
