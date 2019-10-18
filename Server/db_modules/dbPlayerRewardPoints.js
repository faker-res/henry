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
const constPlayerRegistrationInterface = require('../const/constPlayerRegistrationInterface');

let dbUtility = require('./../modules/dbutility');
let dbProposal = require('./../db_modules/dbProposal');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPlayerUtil = require('./../db_common/dbPlayerUtility');
let dbRewardPoints = require('../db_modules/dbRewardPoints');
let dbRewardPointsLog = require('../db_modules/dbRewardPointsLog');
let dbRewardPointsLvlConfig = require('../db_modules/dbRewardPointsLvlConfig');
var dbLogger = require("./../modules/dbLogger");
let dbUtil = require('../modules/dbutility');

let SettlementBalancer = require('../settlementModule/settlementBalancer');
let localization = require("../modules/localization");

let dbPlayerRewardPoints = {

    /**
     * Manual convert reward points to credit
     * @param playerId
     * @param convertRewardPointsAmount
     * @param remark
     * @param {Number} userAgent based on constPlayerRegistrationInterface
     * @param adminId
     * @param adminName
     */
    convertRewardPointsToCredit: (playerId, convertRewardPointsAmount, remark, userAgent, adminId, adminName) => {
        let playerInfo = null;
        let playerLvlRewardPointsConfig = null;
        let playerRewardPoints = null;
        let rewardPointsProposalType = null;
        let actualConvertRewardPointsAmount = 0;
        let rewardPointsRemainder = 0;
        let convertCredit = 0;
        let limitReach = false;
        let adminInfo = '';
        if (adminId && adminName) {
            adminInfo = {
                name: adminName,
                type: 'admin',
                id: adminId
            }
        }

        if (convertRewardPointsAmount < 0) {
            return Q.reject({
                status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                name: "DataError",
                message: "Convert reward points amount must greater than 0"
            });
        }
        return dbConfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbConfig.collection_platform}
        ).lean().then(
            playerData => {
                if (playerData) {
                    playerInfo = playerData;
                    if (playerData.permission && playerData.permission.rewardPointsTask === false) {
                        return Q.reject({
                            status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                            name: "DataError",
                            errorMessage: "Player do not have permission for convert reward points to credit"
                        });
                    }

                    return dbPlayerUtil.setPlayerBState(playerInfo._id, "convertRewardPointsToCredit", true).then(
                        playerState => {
                            if (playerState) {
                                //check if player's reward task is no credit now
                                return dbConfig.collection_proposalType.findOne({
                                    platformId: playerInfo.platform,
                                    name: constProposalType.PLAYER_CONVERT_REWARD_POINTS
                                }).lean();
                            } else {
                                return Promise.reject({
                                    name: "DBError",
                                    status: constServerCode.CONCURRENT_DETECTED,
                                    message: "Apply Reward Fail, please try again later"
                                })
                            }
                        }
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                        name: "DataError",
                        errorMessage: "Can not find player"
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
                        status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                        name: "DataError",
                        errorMessage: "Can not find reward points proposal type"
                    });
                }
            }
        ).then(
            rewardPointsLvlConfig => {
                if (rewardPointsLvlConfig) {
                    playerLvlRewardPointsConfig = rewardPointsLvlConfig.params.filter(playerLvlConfig => playerLvlConfig.levelObjId.toString() == playerInfo.playerLevel.toString())[0];
                    if (!playerLvlRewardPointsConfig) {
                        return Q.reject({
                            status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                            name: "DataError",
                            errorMessage: "Can not match player level with reward points level config"
                        });
                    }
                    return dbRewardPoints.getPlayerRewardPoints(ObjectId(playerInfo._id));
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                        name: "DataError",
                        errorMessage: "Can not find reward points config"
                    });
                }
            }
        ).then(
            rewardPoints => {
                if (rewardPoints) {
                    playerRewardPoints = rewardPoints;
                    if (playerRewardPoints.points < convertRewardPointsAmount) {
                        return Q.reject({
                            status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                            name: "DataError",
                            errorMessage: "Player does not have enough reward points"
                        });
                    }
                    let todayTime = dbUtility.getTodaySGTime();
                    return dbPlayerInfo.getPlayerRewardPointsDailyConvertedPoints(rewardPoints._id);
                }
                else {
                    return Q.reject({
                        status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                        name: "DataError",
                        errorMessage: "Player does not have enough reward points"
                    });
                }
            }
        ).then(
            todayConvertedRewardPoints => {
                if (todayConvertedRewardPoints >= playerLvlRewardPointsConfig.pointToCreditManualMaxPoints) {
                    return Q.reject({
                        status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                        name: "DataError",
                        errorMessage: localization.localization.translate("Redemption failed") + ", " + localization.localization.translate("daily reward point redemption limit is reach") + " (" + playerLvlRewardPointsConfig.pointToCreditManualMaxPoints + ") " + localization.localization.translate("reward points")
                    });
                } else {
                    if (Number(todayConvertedRewardPoints) + Number(convertRewardPointsAmount) > playerLvlRewardPointsConfig.pointToCreditManualMaxPoints) {
                        //this variable store the remaining reward points left before reaching the daily limit
                        let pointsLeftToReachQuota =  playerLvlRewardPointsConfig.pointToCreditManualMaxPoints - todayConvertedRewardPoints;
                        // actualConvertRewardPointsAmount = pointsLeftToReachQuota - (pointsLeftToReachQuota % playerLvlRewardPointsConfig.pointToCreditManualRate);

                        actualConvertRewardPointsAmount = pointsLeftToReachQuota;

                        limitReach = true;
                    }else{
                        // actualConvertRewardPointsAmount = convertRewardPointsAmount - (convertRewardPointsAmount % playerLvlRewardPointsConfig.pointToCreditManualRate);

                        actualConvertRewardPointsAmount = Number(convertRewardPointsAmount);
                    }

                    rewardPointsRemainder = convertRewardPointsAmount - actualConvertRewardPointsAmount;

                    if(!Number.isInteger(actualConvertRewardPointsAmount) || actualConvertRewardPointsAmount < playerLvlRewardPointsConfig.pointToCreditManualRate){
                        return Q.reject({
                            status: constServerCode.REWARD_POINTS_CONVERT_FAIL,
                            name: "DataError",
                            errorMessage: "Redemption failed, the points to be redeemed are less than the minimum credit (1)"
                        });
                    }

                    // convertCredit = Math.floor(actualConvertRewardPointsAmount / playerLvlRewardPointsConfig.pointToCreditManualRate);
                    convertCredit = Number(parseFloat(actualConvertRewardPointsAmount / playerLvlRewardPointsConfig.pointToCreditManualRate).toFixed(2));

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
                            afterRewardPoints: playerRewardPoints.points - actualConvertRewardPointsAmount,
                            convertedRewardPoints: actualConvertRewardPointsAmount,
                            convertCredit: convertCredit,
                            rewardAmount: convertCredit,
                            spendingAmount: spendingAmount,
                            providerGroup: playerLvlRewardPointsConfig.providerGroup,
                            remark: remark,
                            rewardPointsConvertCategory: constRewardPointsLogCategory.EARLY_POINT_CONVERSION,
                            exchangeRatio: playerLvlRewardPointsConfig.pointToCreditManualRate + ":1",
                            currentDayAppliedAmount: todayConvertedRewardPoints,
                            maxDayApplyAmount: playerLvlRewardPointsConfig.pointToCreditManualMaxPoints
                        },
                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                        userType: constProposalUserType.PLAYERS,
                        inputDevice: userAgent
                    };
                    return dbProposal.createProposalWithTypeId(rewardPointsProposalType._id, proposalData).then(
                        data => {
                            //minus from RP
                            dbPlayerRewardPoints.changePlayerRewardPoint(playerInfo._id, playerInfo.platform._id, -actualConvertRewardPointsAmount,
                                constRewardPointsLogCategory.EARLY_POINT_CONVERSION, remark, userAgent, adminName || playerInfo.name);

                            // Reset BState
                            dbPlayerUtil.setPlayerBState(playerInfo._id, "convertRewardPointsToCredit", false).catch(errorUtils.reportError);

                            return data;
                        },
                        err => {return Q.reject(err);}
                    );
                }
            }
        ).then(
            result => {
                if(typeof rewardPointsRemainder !== "undefined"){
                    if(rewardPointsRemainder == 0){
                        return Q.resolve({message: localization.localization.translate("Redemption succeeded: used") + " " +" (" +
                        actualConvertRewardPointsAmount + ") " + localization.localization.translate("reward points, to redeem") +
                        " (" + convertCredit + ") " + localization.localization.translate("credit")});
                    }else{
                        if(limitReach){
                            return Q.resolve({message: localization.localization.translate("Redemption succeeded: used")  + " " +" (" +
                            actualConvertRewardPointsAmount + ") " + localization.localization.translate("reward points, to redeem") + " (" +
                            convertCredit + ") " + localization.localization.translate("credit") + ". " + localization.localization.translate("Remaining") +
                            " (" + rewardPointsRemainder + ") " + localization.localization.translate("reward points has exceed the redemption limit, has been returned to your account")});
                        }

                        return Q.resolve({message: localization.localization.translate("Redemption succeeded: used")  +" (" + actualConvertRewardPointsAmount +
                        ") " + localization.localization.translate("reward points, to redeem") + " (" + convertCredit + ") " +
                        localization.localization.translate("credit") + ". " + localization.localization.translate("Remaining") + " (" +
                        rewardPointsRemainder + ") " + localization.localization.translate("reward points not enough to redeem (1) credit, has been returned to your account")});
                    }
                }
            }
        ).catch(
            err => {
                if (err.status === constServerCode.CONCURRENT_DETECTED) {
                    // Ignore concurrent request for now
                } else {
                    // Set BState back to false
                    dbPlayerUtil.setPlayerBState(playerInfo._id, "convertRewardPointsToCredit", false).catch(errorUtils.reportError);
                }

                throw err;
            }
        );
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
     * @param {Number} userAgent based on constPlayerRegistrationInterface
     * @param {String} creatorName  creator name
     * @param {Number} [status]
     * @param {Number}  [currentDayAppliedAmount]  RP(reward point) to credit: daily pointToCredit Points / Apply RP event: daily get Points
     * @param {Number} [maxDayApplyAmount]        RP(reward point) to credit: pointToCreditMaxPoints / Apply RP event: dailyMaxPoints
     * @param {ObjectId} [rewardPointsTaskObjId]  If create rewardPointsTask
     * @param {ObjectId} [proposalId]  If create proposalId
     */
    changePlayerRewardPoint: (playerObjId, platformObjId, updateAmount, category, remark, userAgent, creatorName, status = constRewardPointsLogStatus.PROCESSED, currentDayAppliedAmount = null, maxDayApplyAmount = null, rewardPointsTaskObjId = null, proposalId = null) => {
        let playerRewardPoints;
        let oldPoint;
        let afterChangedRewardPoints;
        let playerInfo;
        updateAmount = updateAmount && Number.isInteger(updateAmount) ? updateAmount : 0;

        return dbConfig.collection_players.findOne({_id: playerObjId, platform: platformObjId})
            .populate({path: "playerLevel", model: dbConfig.collection_playerLevel}).lean()
            .then(
                player => {
                    if (!player) {
                        return Q.reject({
                            name: "DataError",
                            message: "Can not find player"
                        });
                    }
                    playerInfo = player;
                    return dbRewardPoints.getPlayerRewardPoints(ObjectId(player._id), playerInfo);
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

                        return dbConfig.collection_rewardPoints.findOneAndUpdate(
                            {_id: playerRewardPoints._id},
                            {$inc: {points: updateAmount}},
                            {new: true}
                        );
                    } else {
                        return Q.reject({
                            name: "DataError",
                            message: "Player does not have enough reward points"
                        });
                    }
                }
            ).then(
                (rewardPoints) => {
                    if(category !== constRewardPointsLogCategory.EARLY_POINT_CONVERSION && category !== constRewardPointsLogCategory.PERIOD_POINT_CONVERSION) {
                        if (proposalId && (category !== constRewardPointsLogCategory.POINT_REDUCTION
                                && category !== constRewardPointsLogCategory.POINT_REDUCTION_CANCELLED
                                && category !== constRewardPointsLogCategory.EARLY_POINT_CONVERSION_CANCELLED
                                && category !== constRewardPointsLogCategory.PERIOD_POINT_CONVERSION_CANCELLED)) {
                            dbRewardPointsLog.updateConvertRewardPointsLog(proposalId, constRewardPointsLogStatus.PROCESSED, rewardPointsTaskObjId);
                        } else {
                            let logData = {
                                rewardPointsObjId: playerRewardPoints._id,
                                rewardPointsTaskObjId: rewardPointsTaskObjId,
                                category: category,
                                oldPoints: playerRewardPoints.points,
                                newPoints: afterChangedRewardPoints,
                                playerName: playerInfo.name,
                                playerLevelName: playerInfo.playerLevel.name,
                                amount: updateAmount,
                                remark: remark,
                                status: status,
                                userAgent: userAgent,
                                currentDayAppliedAmount: currentDayAppliedAmount,
                                maxDayApplyAmount: maxDayApplyAmount,
                                proposalId: proposalId,
                                creator: creatorName,
                                platformId: platformObjId
                            };

                            dbLogger.createRewardPointsLog(logData);
                        }
                    }
                    return rewardPoints;
                }
            )
    },

    /**
     * Attempts to take the given amount out of the player's RewardPoint.
     * resolves if the deduction was successful.
     * rejects and rollback if the deduction failed for any reason.
     *
     * @param {ObjectId} playerObjId
     * @param {ObjectId} platformObjId
     * @param {Number} updateAmount negative value
     * @param {Number} category
     * @param {String} remark
     * @param {Number} userAgent based on constPlayerRegistrationInterface
     * @param {String} creatorName  creator name
     * @param {Number} [status]
     * @param {Number}  [currentDayAppliedAmount]  RP(reward point) to credit: daily pointToCredit Points / Apply RP event: daily get Points
     * @param {Number} [maxDayApplyAmount]        RP(reward point) to credit: pointToCreditMaxPoints / Apply RP event: dailyMaxPoints
     * @param {ObjectId} [rewardPointsTaskObjId]  If create rewardPointsTask
     * @param {ObjectId} [proposalId]  If create proposalId
     */
    tryToDeductRewardPointFromPlayer: (playerObjId, platformObjId, updateAmount, category, remark, userAgent, creatorName, status = constRewardPointsLogStatus.PROCESSED, currentDayAppliedAmount = null, maxDayApplyAmount = null, rewardPointsTaskObjId = null, proposalId = null) => {
        return dbConfig.collection_rewardPoints.findOne({
            playerObjId: playerObjId,
            platformObjId: platformObjId
        }).select('points')
            .then(
                rewardPoints => {
                    if (rewardPoints.points < updateAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_REWARD_POINTS,
                            name: "DataError",
                            message: "Player does not have enough reward points"
                        });
                    }
                }
            ).then(
                () => dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, updateAmount, category, remark, userAgent, creatorName, status, currentDayAppliedAmount, maxDayApplyAmount, rewardPointsTaskObjId, proposalId)
            ).then(
                rewardPoints => {
                    if (rewardPoints.points < 0) {
                        // reset the deduction, remove rewardTask & proposal & log just create, then report the problem
                        return dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, -updateAmount, category, remark, userAgent, creatorName, status, currentDayAppliedAmount, maxDayApplyAmount, rewardPointsTaskObjId, proposalId)
                            .then(
                                () => {
                                    let removeRewardTaskProm = dbConfig.collection_rewardTask.remove({proposalId: proposalId});
                                    let removeProposalProm = dbConfig.collection_proposal.remove({proposalId: proposalId});
                                    return Q.all([removeRewardTaskProm, removeProposalProm]).then(
                                        () => dbConfig.collection_rewardPointsLog.remove({proposalId: proposalId})
                                    )
                                }
                            ).then(
                                () => Q.reject({
                                    status: constServerCode.PLAYER_NOT_ENOUGH_REWARD_POINTS,
                                    name: "DataError",
                                    message: "Player does not have enough reward points",
                                    data: '(detected after deducted)'
                                })
                            );
                    }
                }
            );
    },

    startConvertPlayersRewardPoints: () => {
        console.log("start Convert Players Reward Points");
        let AllRewardPointsLvlConfigs;
        let queryTime = dbUtil.getYesterdaySGTime();
        return dbConfig.collection_platform.find({usePointSystem : true}).lean().then(
            platforms => {
                let usePointSystemPlatformIds = platforms.map(platform => platform._id);

                let queryObj = {
                    "platformObjId": {$in : usePointSystemPlatformIds},
                    $or: [
                        {$and: [{"intervalPeriod": constRewardPointsPeriod.Custom}, {"customPeriodEndTime": {$lte: queryTime.endTime}}, {"lastRunAutoPeriodTime": null}]},
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
                }).lean()
            }
        ).then(
            rewardPointsLvlConfigs => {
                console.log("rewardPointsLvlConfigs",rewardPointsLvlConfigs);
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
                                        batchSize: 100,
                                        makeRequest: function (rewardPoints, request) {
                                            request("player", "autoConvertPlayerRewardPoints", {
                                                playerObjIds: rewardPoints.map(rewardPoint => {
                                                    return rewardPoint.playerObjId;
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

        if (playerObjIds && playerObjIds.length) {
            playerObjIds.forEach(
                playerObjId => {
                    let playerInfo = {}, platformData, playerLvlRewardPointsConfig, playerRewardPoints, rewardPointsProposalType,
                        isRewardPointsConfigSet = true;

                    if (!playerObjId || String(playerObjId).length !== 24) {
                        return;
                    }

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
                                    name: constProposalType.PLAYER_AUTO_CONVERT_REWARD_POINTS
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
                                        creator: {type: 'system', name: "system"},
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
                                            rewardPointsConvertCategory: constRewardPointsLogCategory.PERIOD_POINT_CONVERSION,
                                            exchangeRatio: playerLvlRewardPointsConfig.pointToCreditAutoRate + ":1",
                                            currentDayAppliedAmount: 0,
                                            maxDayApplyAmount: playerLvlRewardPointsConfig.pointToCreditAutoMaxPoints
                                        },
                                        inputDevice: constPlayerRegistrationInterface.BACKSTAGE,
                                    };

                                    return dbProposal.createProposalWithTypeId(rewardPointsProposalType._id, proposalData).then(
                                        data => {
                                            //minus from RP
                                            dbPlayerRewardPoints.changePlayerRewardPoint(playerInfo._id, playerInfo.platform._id, -convertRewardPoints,
                                                constRewardPointsLogCategory.PERIOD_POINT_CONVERSION, null, constPlayerRegistrationInterface.BACKSTAGE, "system");
                                            return data;
                                        },
                                        err => {return Q.reject(err);}
                                    );
                                }
                                return rewardPoints;
                            }
                        ).catch(
                            error => {
                                // System log when timeout / error
                                console.log("ERROR: player_convertRewardPoints failed for player", playerInfo ? playerInfo.name : playerObjId, error);
                            }
                        )
                    );
                }
            );
        }

        return Q.all(proms);
    }

};

module.exports = dbPlayerRewardPoints;
