const Q = require("q");

const cpmsAPI = require("../externalAPI/cpmsAPI");

const constGameStatus = require('./../const/constGameStatus');
const constProposalStatus = require('./../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');

const dbconfig = require('./../modules/dbproperties');

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
};

module.exports = dbPlayerUtility;