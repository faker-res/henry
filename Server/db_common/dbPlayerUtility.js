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

const dbPlayerUtility = {
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
};

module.exports = dbPlayerUtility;