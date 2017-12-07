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
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');
const constRewardPointsPeriod = require('../const/constRewardPointsPeriod');
const constSystemParam = require('../const/constSystemParam');

let dbUtility = require('./../modules/dbutility');
let dbProposal = require('./../db_modules/dbProposal');
let dbRewardPoints = require('../db_modules/dbRewardPoints');
let dbRewardPointsLog = require('../db_modules/dbRewardPointsLog');
let dbRewardPointsLvlConfig = require('../db_modules/dbRewardPointsLvlConfig');
var dbLogger = require("./../modules/dbLogger");
let dbUtil = require('../modules/dbutility');

let SettlementBalancer = require('../settlementModule/settlementBalancer');

let dbPlayerRewardPoints = {

    /**
     * Manual convert reward points to credit
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
                        if (playerData.permission && playerData.permission.rewardPointsTask === false) {
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
                        return dbConfig.collection_rewardTask.aggregate(
                            {
                                $match: {
                                    createTime: {
                                        $gte: todayTime.startTime,
                                        $lt: todayTime.endTime
                                    },
                                    "data.rewardPointsObjId": ObjectId(rewardPoints._id),
                                    "data.category": constRewardPointsLogCategory.EARLY_POINT_CONVERSION
                                }
                            },
                            {
                                $group: {
                                    _id: "$playerId",
                                    amount: {$sum: "$data.convertedRewardPointsAmount"}
                                }
                            }
                        ).then(
                            rewardTask => {
                                if (rewardTask && rewardTask[0]) {
                                    return rewardTask[0].amount;
                                }
                                else {
                                    // No rewardTask
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
                                remark: remark,
                                category: constRewardPointsLogCategory.EARLY_POINT_CONVERSION
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
     * @param {Number} category
     * @param {String} remark
     * @param {Number} status
     * @param {ObjectId} rewardPointsTaskObjId  If create rewardPointsTask
     */
    changePlayerRewardPoint: (playerObjId, platformObjId, updateAmount, category, remark, status = constRewardPointsLogStatus.PROCESSED, rewardPointsTaskObjId = null) => {
        let playerRewardPoints;
        let oldPoint;
        let afterChangedRewardPoints;
        let playerInfo;
        return dbConfig.collection_players.findOne({_id: playerObjId, platform: platformObjId}).lean()
            .then(
                player => {
                    if (!player) {
                        return Q.reject({
                            name: "DataError",
                            message: "Can not find player"
                        });
                    }
                    playerInfo = player;
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
                        rewardPointsObjId: playerRewardPoints._id,
                        rewardPointsTaskObjId: rewardPointsTaskObjId,
                        category: category,
                        oldPoints: playerRewardPoints.points,
                        newPoints: afterChangedRewardPoints,
                        playerName: playerInfo.name,
                        playerLevelName: playerInfo.playerLevel,
                        amount: updateAmount,
                        remark: remark,
                        status: status
                    };
                    dbLogger.createRewardPointsLog(logData);
                }
            )
    },

    startConvertPlayersRewardPoints: () => {
        let AllRewardPointsLvlConfigs;
        let queryTime = dbUtil.getYesterdaySGTime();
        let queryObj = {
            $or: [
                {$and: [{"intervalPeriod": constRewardPointsPeriod.Custom}, {"customPeriodEndTime": {$lt: queryTime.endTime}}, {"lastRunAutoPeriodTime": null}]},
                {"intervalPeriod": constRewardPointsPeriod.Daily}
            ]
        };
        if (dbUtil.isFirstDayOfMonthSG()) {
            queryObj.$or.push({"intervalPeriod": constRewardPointsPeriod.Monthly});
        }

        if (dbUtil.isFirstDayOfWeekSG()) {
            queryObj.$or.push({"intervalPeriod": constRewardPointsPeriod.Weekly});
        }

        if (dbUtil.isHalfMonthDaySG()) {
            queryObj.$or.push({"intervalPeriod": constRewardPointsPeriod.Biweekly});
        }

        if (dbUtil.isFirstDayOfYearSG()) {
            queryObj.$or.push({"intervalPeriod": constRewardPointsPeriod.Yearly});
        }

        //Get platform ids from rewardPointsLvlConfig, ignore platform without rewardPointsLvlConfig.
        return dbConfig.collection_rewardPointsLvlConfig.find(queryObj).populate({
            path: 'platformObjId',
            model: dbConfig.collection_platform
        }).lean().then(
            rewardPointsLvlConfigs => {
                let settlePlayerRewardPoints = platformId => {
                    // System log
                    console.log('[Convert player reward points] Settling platform:', platformId, queryTime);

                    // Get player reward points, ignore player does not have reward points
                    let stream = dbConfig.collection_rewardPoints.find({
                        platformObjId: ObjectId(platformId),
                        points: {$gt: 0}
                    }).cursor({batchSize: 1000});

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(
                        () => {
                            // System log to make sure balancer is working
                            console.log('[Convert player reward points] Settlement Server initialized');

                            return Q(
                                balancer.processStream(
                                    {
                                        stream: stream,
                                        batchSize: constSystemParam.BATCH_SIZE,
                                        makeRequest: function (rewardPoints, request) {
                                            request("player", "autoConvertPlayerRewardPoints", {
                                                playerObjIds: rewardPoints.map(rewardPoint => {
                                                    return {
                                                        _id: rewardPoint.playerObjId
                                                    }
                                                })
                                            });
                                        }
                                    }
                                ).then(
                                    data => console.log("convertPlayerRewardPoints settle success:", data),
                                    error => console.log("convertPlayerRewardPoints settle failed:", error)
                                )
                            );
                        },
                        error => console.log('[Convert player reward points] Settlement Server initialization error:', error)
                    );
                };
                // Work on all platforms
                AllRewardPointsLvlConfigs = rewardPointsLvlConfigs;
                let platformIds = new Set(rewardPointsLvlConfigs.map(rewardPointsLvlConfig => String(rewardPointsLvlConfig.platformObjId._id)));
                platformIds.forEach(
                    platformId => {
                        settlePlayerRewardPoints(platformId);
                    }
                );
            }
        ).then(
            () => {
                //Update reward point config last run time
                let rewardPointsLvlConfigIds = AllRewardPointsLvlConfigs.map(rewardPointsLvlConfig => String(rewardPointsLvlConfig._id));
                dbRewardPointsLvlConfig.updateRewardPointsLvlConfigLastRunTime(rewardPointsLvlConfigIds);
            }
        )
    },

    autoConvertPlayerRewardPoints: (playerObjIds) => {
        let proms = [];


        playerObjIds.forEach(
            playerObjId => {
                let playerInfo, platformData, playerLvlRewardPointsConfig, playerRewardPoints, rewardPointsProposalType,
                    isRewardPointsConfigSet = true;
                proms.push(
                    dbConfig.collection_players.findOne({
                        _id: playerObjId
                    }).populate({
                        path: "platform",
                        model: dbConfig.collection_platform
                    }).lean().then(
                        player => {
                            playerInfo = player;
                            platformData = player.platform;
                            return dbConfig.collection_proposalType.findOne({
                                platformId: platformData._id,
                                name: constProposalType.PLAYER_CONVERT_REWARD_POINTS
                            }).lean();
                        }
                    ).then(
                        proposalType => {
                            rewardPointsProposalType = proposalType;
                            if (!rewardPointsProposalType) {
                                console.log("ERROR: player_convertRewardPoints failed for player", playerInfo.name, "can not find proposal type for reward points");
                            }
                            return dbRewardPointsLvlConfig.getRewardPointsLvlConfig(playerInfo.platform._id).lean();
                        }
                    ).then(
                        rewardPointsLvlConfig => {
                            playerLvlRewardPointsConfig = rewardPointsLvlConfig.params.filter(playerLvlConfig => playerLvlConfig.levelObjId.toString() == playerInfo.playerLevel.toString())[0];
                            if (!(playerLvlRewardPointsConfig && playerLvlRewardPointsConfig.pointToCreditAutoRate &&
                                    playerLvlRewardPointsConfig.pointToCreditAutoMaxPoints && playerLvlRewardPointsConfig.spendingAmountOnReward)) {
                                isRewardPointsConfigSet = false;
                                console.log("ERROR: player_convertRewardPoints failed for player", playerInfo.name, "reward points config for player level no config");
                            }
                            return dbConfig.collection_rewardPoints.findOne({
                                playerObjId: playerInfo._id
                            }).lean();
                        }
                    ).then(
                        rewardPoints => {
                            //Player no rewardPoints, do nothing
                            if (rewardPoints && isRewardPointsConfigSet && rewardPointsProposalType) {
                                playerRewardPoints = rewardPoints;
                                let convertRewardPoints = playerRewardPoints.points > playerLvlRewardPointsConfig.pointToCreditAutoMaxPoints ? playerLvlRewardPointsConfig.pointToCreditAutoMaxPoints : playerRewardPoints.points;
                                let convertCredit = Math.floor(convertRewardPoints / playerLvlRewardPointsConfig.pointToCreditAutoRate);
                                let spendingAmount = convertCredit * playerLvlRewardPointsConfig.spendingAmountOnReward;
                                let proposalData = {
                                    type: rewardPointsProposalType._id,
                                    creator: {type: 'system'},
                                    data: {
                                        playerObjId: playerInfo._id,
                                        playerId: playerInfo.playerId,
                                        playerRewardPointsObjId: playerRewardPoints._id,
                                        playerName: playerInfo.name,
                                        realName: playerInfo.realName,
                                        platformObjId: playerInfo.platform._id,
                                        beforeRewardPoints: playerRewardPoints.points,
                                        afterRewardPoints: 0,
                                        convertedRewardPoints: playerRewardPoints.points, //use all player reward points, for changePlayerRewardPoint
                                        convertCredit: convertCredit,
                                        rewardAmount: convertCredit,
                                        spendingAmount: spendingAmount,
                                        providerGroup: playerLvlRewardPointsConfig.providerGroup,
                                        category: constRewardPointsLogCategory.PERIOD_POINT_CONVERSION
                                    }
                                };
                                return dbProposal.createProposalWithTypeId(rewardPointsProposalType._id, proposalData);
                            }
                            return rewardPoints;
                        }
                    ).catch(
                        error => {
                            // System log when timeout / error
                            console.log("ERROR: player_convertRewardPoints failed for player", playerInfo.name, error);
                        }
                    )
                );
            }
        );

        return Q.all(proms);
    }

};

module.exports = dbPlayerRewardPoints;
