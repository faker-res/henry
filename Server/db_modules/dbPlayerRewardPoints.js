let Q = require('q');
let errorUtils = require('../modules/errorUtils');
let dbConfig = require('../modules/dbproperties');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const constServerCode = require('../const/constServerCode');
const constProposalEntryType = require("./../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');
const constProposalType = require('../const/constProposalType');
const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');

let dbUtility = require('./../modules/dbutility');
let dbProposal = require('./../db_modules/dbProposal');
let dbRewardPoints = require('../db_modules/dbRewardPoints');
let dbRewardPointsTask = require('../db_modules/dbRewardPointsTask');
let dbRewardPointsLog = require('../db_modules/dbRewardPointsLog');
let dbRewardPointsLvlConfig = require('../db_modules/dbRewardPointsLvlConfig');
var dbLogger = require("./../modules/dbLogger");

let dbPlayerRewardPoints = {

    /**
     * Convert reward points to credit
     * @param playerId
     * @param convertRewardPointsAmount
     * @param remark
     * @param adminId
     * @param adminName
     */
    convertRewardPointsToCredit: (playerId, convertRewardPointsAmount, remark, adminId, adminName) => {
        let playerInfo = null;
        let playerLvlRewardPointsConfig = null;
        let playerRewardPoints = null;
        let rewardPointsProposalType = null;
        let adminInfo = '';
        if (adminId && adminName) {
            adminInfo = {
                name: adminName,
                type: 'admin',
                id: adminId
            }
        }
        return dbConfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbConfig.collection_platform})
            .lean().then(
                playerData => {
                    if (playerData) {
                        playerInfo = playerData;
                        if (playerData.permission && playerData.permission.rewardPointTask === false) {
                            return Q.reject({
                                status: constServerCode.PLAYER_CONVERT_REWARD_POINTS_FAIL,
                                name: "DataError",
                                message: "Player do not have permission for convert reward points to credit"
                            });
                        }

                        return dbConfig.collection_proposalType.findOne({
                            platformId: playerInfo.platform,
                            name: constProposalType.PLAYER_CONVERT_REWARD_POINTS
                        }).lean();

                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            message: "Can not find player"
                        });
                    }
                }
            ).then(
                proposalType => {
                    if (proposalType) {
                        rewardPointsProposalType = proposalType;
                        return dbRewardPointsLvlConfig.getRewardPointsLvlConfig(playerInfo.platform._id).lean();
                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            message: "Can not find reward points proposal type"
                        });
                    }
                }
            ).then(
                rewardPointsLvlConfig => {
                    if (rewardPointsLvlConfig) {
                        playerLvlRewardPointsConfig = rewardPointsLvlConfig.params.filter(playerLvlConfig => playerLvlConfig.levelObjId.toString() == playerInfo.playerLevel.toString())[0];
                        if (!playerLvlRewardPointsConfig) {
                            return Q.reject({
                                name: "DataError",
                                message: "Can not match player level with reward points level config"
                            });
                        }
                        return dbRewardPoints.getPlayerRewardPoints(ObjectId(playerInfo._id));
                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            message: "Can not find reward points config"
                        });
                    }
                }
            ).then(
                rewardPoints => {
                    if (rewardPoints) {
                        playerRewardPoints = rewardPoints;
                        if (playerRewardPoints.points < convertRewardPointsAmount) {
                            return Q.reject({
                                name: "DataError",
                                message: "Player does not have enough reward points"
                            });
                        }
                        let todayTime = dbUtility.getTodaySGTime();
                        return dbConfig.collection_rewardPointsTask.aggregate(
                            {
                                $match: {
                                    createTime: {
                                        $gte: todayTime.startTime,
                                        $lt: todayTime.endTime
                                    },
                                    rewardPointsObjId: ObjectId(rewardPoints._id),
                                }
                            },
                            {
                                $group: {
                                    _id: "$rewardPointsObjId",
                                    amount: {$sum: "$rewardPoints"}
                                }
                            }
                        ).then(
                            rewardPointsTask => {
                                if (rewardPointsTask && rewardPointsTask[0]) {
                                    return rewardPointsTask[0].amount;
                                }
                                else {
                                    // No rewardPointsTask
                                    return 0;
                                }
                            }
                        );
                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            message: "Player does not have enough reward points"
                        });
                    }
                }
            ).then(
                todayConvertedRewardPoints => {
                    if ((todayConvertedRewardPoints + convertRewardPointsAmount) > playerLvlRewardPointsConfig.pointToCreditManualMaxPoints) {
                        return Q.reject({
                            name: "DataError",
                            message: "Player convert amount reach daily reward points convert limit"
                        });
                    } else {
                        let convertCredit = Math.floor(convertRewardPointsAmount / playerLvlRewardPointsConfig.pointToCreditManualRate);
                        let spendingAmount = convertCredit * playerLvlRewardPointsConfig.spendingAmountOnReward;
                        let proposalData = {
                            type: rewardPointsProposalType._id,
                            creator: adminInfo ? adminInfo :
                                {
                                    type: 'player',
                                    name: playerInfo.name,
                                    id: playerInfo._id
                                },
                            data: {
                                playerObjId: playerInfo._id,
                                playerId: playerInfo.playerId,
                                playerRewardPointsObjId: playerRewardPoints._id,
                                playerName: playerInfo.name,
                                realName: playerInfo.realName,
                                platformObjId: playerInfo.platform._id,
                                beforeRewardPoints: playerRewardPoints.points,
                                afterRewardPoints: playerRewardPoints.points - convertRewardPointsAmount,
                                convertedRewardPoints: convertRewardPointsAmount,
                                convertCredit: convertCredit,
                                rewardAmount: convertCredit,
                                spendingAmount: spendingAmount,
                                providerGroup: playerLvlRewardPointsConfig.providerGroup,
                                remark: remark
                            },
                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: constProposalUserType.PLAYERS
                        };
                        return dbProposal.createProposalWithTypeId(rewardPointsProposalType._id, proposalData);
                    }
                }
            )
    },

    /**
     * Adds the given amount into the player's RewardPoint, and creates a RewardPointChangeLog record.
     * Can also be used to deduct RewardPoint from the account, by providing a negative value.
     *
     * @param {ObjectId} playerObjId
     * @param {ObjectId} platformObjId
     * @param {Number} updateAmount
     * @param {String} remark
     * @param {Number} status
     * @param {ObjectId} rewardPointsTaskObjId  If create rewardPointsTask
     */
    changePlayerRewardPoint: (playerObjId, platformObjId, updateAmount, remark, status, rewardPointsTaskObjId=null) => {
        let playerRewardPoints;
        let oldPoint;
        let afterChangedRewardPoints;
        return dbConfig.collection_players.findOne({_id: playerObjId, platform: platformObjId}).lean()
            .then(
                player => {
                    if (!player) {
                        return Q.reject({
                            name: "DataError",
                            message: "Can not find player"
                        });
                    }
                    return dbRewardPoints.getPlayerRewardPoints(ObjectId(player._id));
                },
                error => {
                    return Q.reject({name: "DBError", message: "Error updating player.", error: error});
                }
            ).then(
                rewardPoints => {
                    if (rewardPoints) {
                        playerRewardPoints = rewardPoints;
                        oldPoint = playerRewardPoints.points;
                        afterChangedRewardPoints = playerRewardPoints.points + updateAmount;

                        if (afterChangedRewardPoints < 0) {
                            return Q.reject({
                                name: "DataError",
                                message: "Player does not have enough reward points"
                            });
                        }

                        return dbConfig.collection_rewardPoints.update(
                            {_id: playerRewardPoints._id},
                            {$inc: {points: updateAmount}}
                        );
                    } else {
                        return Q.reject({
                            name: "DataError",
                            message: "Player does not have enough reward points"
                        });
                    }
                }
            ).then(
                () => {
                    let logData = {
                        rewardPointsObjId:playerRewardPoints._id,
                        rewardPointsTaskObjId:rewardPointsTaskObjId,
                        category: constRewardPointsLogCategory.EARLY_POINT_CONVERSION,
                        oldPoints:playerRewardPoints.points,
                        newPoints:afterChangedRewardPoints,
                        remark:remark,
                        status:status
                    };
                    dbLogger.createRewardPointsLog(logData);
                }
            )
    },

};

module.exports = dbPlayerRewardPoints;
