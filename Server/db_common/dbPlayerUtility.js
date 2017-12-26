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
     * @param playerObjId
     * @param stateName
     * @returns {Promise|Promise.<TResult>}
     */
    setPlayerState: (playerObjId, stateName) => {
        let matchQ = {player: playerObjId};

        return dbconfig.collection_playerState.findOne({player: playerObjId}).then(
            stateRec => {
                if (!stateRec) {
                    return new dbconfig.collection_playerState(matchQ).save();
                } else {
                    matchQ[stateName] = {$lt: new Date() - 1000};
                    let updateQChild = {};
                    updateQChild[stateName] = true;
                    let updateQ = {$currentDate: updateQChild};

                    return dbconfig.collection_playerState.findOneAndUpdate(matchQ, updateQ, {new: true});
                }
            }
        )
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
                if (updateAmount < 0 || !Number.isInteger(updateAmount)) {
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
                        () => dbPlayerUtility.refundPlayerCredit(playerObjId, platformObjId, +updateAmount, constPlayerCreditChangeType.DEDUCT_BELOW_ZERO_REFUND, data)
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
                        () => dbPlayerUtility.refundPlayerCredit(playerObjId, platformObjId, +updateAmount, constPlayerCreditChangeType.DEDUCT_BELOW_ZERO_REFUND, data)
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
                dbLogger.createCreditChangeLog(playerObjId, platformObjId, updateAmount, reasonType, player.validCredit, null, data);
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
                if (data) {
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