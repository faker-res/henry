const moment = require('moment-timezone');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbconfig = require('./../modules/dbproperties');
const dbProposal = require('./../db_modules/dbProposal');
const dbUtil = require('./../modules/dbutility');
const errorUtils = require('../modules/errorUtils');

const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constSystemParam = require('./../const/constSystemParam');
const constPlayerLevelUpPeriod = require('./../const/constPlayerLevelUpPeriod');
const constServerCode = require('../const/constServerCode');

const SettlementBalancer = require('../settlementModule/settlementBalancer');

let dbPlayerLevelInfo = {

    /**
     * Create a new playerLevel
     * @param {json} data - The data of the playerLevel. Refer to playerLevel schema.
     */
    createPlayerLevel: function (playerLevelData) {
        var playerLevel = new dbconfig.collection_playerLevel(playerLevelData);
        return playerLevel.save();
    },

    /**
     * Update a playerLevel information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerLevel: function (query, updateData) {
        return dbconfig.collection_playerLevel.findOneAndUpdate(query, updateData);
    },

    /**
     * Get playerLevel information
     * @param {String}  query - The query string
     */
    getPlayerLevel: function (query) {
        return dbconfig.collection_playerLevel.find(query);
    },

    /**
     * Delete playerLevel information
     * @param {String}  - ObjectId of the playerLevel
     */
    deletePlayerLevel: function (playerLevelObjId) {
        return dbconfig.collection_playerLevel.remove({_id: playerLevelObjId});
    },

    startPlatformPlayerLevelSettlement: (platformObjId, upOrDown) => {
        // let lastMonth = dbUtil.getLastMonthSGTime();
        let period = {};

        return dbconfig.collection_platform.findOne({"_id": platformObjId}).then(
            (platformData) => {
                let platformPeriod = upOrDown ? platformData.playerLevelUpPeriod : platformData.playerLevelDownPeriod;
                if (platformPeriod) {
                    if (platformPeriod == constPlayerLevelUpPeriod.DAY) {
                        period = dbUtil.getYesterdaySGTime();
                    } else if (platformPeriod == constPlayerLevelUpPeriod.WEEK) {
                        period = dbUtil.getLastWeekSGTime();
                    } else if (platformPeriod == constPlayerLevelUpPeriod.MONTH) {
                        period = dbUtil.getLastMonthSGTime();
                    }
                } else {
                    period = dbUtil.getLastMonthSGTime();
                }

                // if (!upOrDown) {
                //     period.startTime = moment(period.startTime).add(12, 'hours').toDate();
                //     period.endTime = moment(period.endTime).add(12, 'hours').toDate();
                // }
                console.log('check level time', period);

                return dbconfig.collection_playerLevel.find({platform: platformObjId}).sort({value: 1}).lean().then(
                    levels => {
                        let stream = dbconfig.collection_players.find(
                            {platform: platformObjId}
                        ).cursor({batchSize: 10000});

                        let balancer = new SettlementBalancer();
                        return balancer.initConns().then(function () {
                            return balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: constSystemParam.BATCH_SIZE,
                                    makeRequest: function (playerIdObjs, request) {
                                        request("player", "performPlatformPlayerLevelSettlement", {
                                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                                return playerIdObj._id;
                                            }),
                                            platformObjId: platformObjId,
                                            levels: levels,
                                            startTime: period.startTime,
                                            endTime: period.endTime,
                                            upOrDown: upOrDown
                                        });
                                    }
                                }
                            );
                        });
                    }
                )

            }, (error) => {
                return Q.reject({name: "DataError", message: "Cannot find platform"});
            }
        );
    },

    /**
     *
     * @param playerObjIds
     * @param platformObjId
     * @param levels
     * @param startTime
     * @param endTime
     * @param {Boolean} upOrDown - True: Level up; False: Level Down
     * @returns {Promise.<boolean>}
     */
    performPlatformPlayerLevelSettlement: (playerObjIds, platformObjId, levels, startTime, endTime, upOrDown) => {
        let promsArr = [];
        playerObjIds.map(player => {
            promsArr.push(dbPlayerLevelInfo.processPlayerLevelMigration(player, platformObjId, levels, startTime, endTime, upOrDown).catch(errorUtils.reportError));
        });

        return Promise.all(promsArr);
    },

    /**
     * @TODO This function currently only work on monthly basis for previous month
     * @param {String} playerObjId
     * @param platformObjId
     * @param levels
     * @param startTime
     * @param endTime
     * @param {Boolean} upOrDown - True: Level up; False: Level Down
     */
    processPlayerLevelMigration: (playerObjId, platformObjId, levels, startTime, endTime, upOrDown) => {
        // let consumptionTime = dbUtil.getLastMonthConsumptionReturnSGTime();

        let playerProm = dbconfig.collection_players.findOne({_id: playerObjId})
            .populate(
                {path: "playerLevel", model: dbconfig.collection_playerLevel}
                // ,{path: "platform", model: dbconfig.collection_platform, select: ["playerLevelUpPeriod","playerLevelDownPeriod"]}]
            ).lean();

        let topUpProm = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: ObjectId(platformObjId),
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    playerId: ObjectId(playerObjId)
                }
            },
            {
                $group: {
                    _id: "$playerId",
                    amount: {$sum: "$amount"}
                }
            }
        );

        let consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate(
            {
                $match: {
                    platformId: ObjectId(platformObjId),
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    playerId: ObjectId(playerObjId)
                }
            },
            {
                $group: {
                    _id: "$playerId",
                    validAmount: {$sum: "$validAmount"}
                }
            }
        );

        return Promise.all([playerProm, topUpProm, consumptionProm]).then(
            data => {
                let playerData = data[0];
                let topUpSummary = data[1][0];
                let consumptionSummary = data[2][0];
                let levelObjId = null;
                let levelUpObjId = [];
                let levelUpObj = null, levelDownObj = null;
                let levelUpObjArr = []
                let levelUpCounter = 0;
                let oldPlayerLevelName = playerData.playerLevel.name;

                let playersTopupForPeriod = topUpSummary && topUpSummary.amount ? topUpSummary.amount : 0;
                let playersConsumptionForPeriod = consumptionSummary && consumptionSummary.validAmount ? consumptionSummary.validAmount : 0;

                // filter levels
                let checkingUpLevels = levels.filter(level => level.value > playerData.playerLevel.value);
                let checkingDownLevels = levels.filter(level => level.value <= playerData.playerLevel.value);

                
                if (playerData.permission && playerData.permission.levelChange === false) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DBError",
                        message: "level change fail, please contact cs"});
                }

                // Check level up
                // Only player with top up or consumption last month worth checking
                if (playersTopupForPeriod > 0 || playersConsumptionForPeriod > 0) {
                    if (upOrDown) {
                        // Check if player can level UP and which level player can level up to
                        for (let i = 0; i < checkingUpLevels.length; i++) {
                            const level = checkingUpLevels[i];

                            if (level.value > playerData.playerLevel.value) {
                                const conditionSets = level.levelUpConfig;

                                for (let j = 0; j < conditionSets.length; j++) {
                                    const conditionSet = conditionSets[j];

                                    const meetsTopupCondition = playersTopupForPeriod >= conditionSet.topupLimit;
                                    const meetsConsumptionCondition = playersConsumptionForPeriod >= conditionSet.consumptionLimit;

                                    const meetsEnoughConditions =
                                        conditionSet.andConditions
                                            ? meetsTopupCondition && meetsConsumptionCondition
                                            : meetsTopupCondition || meetsConsumptionCondition;

                                    if (meetsEnoughConditions) {
                                        levelObjId = level._id;
                                        levelUpObj = level;
                                        levelUpObjId[levelUpCounter] = level._id;
                                        levelUpObjArr[levelUpCounter] = level;
                                        levelUpCounter ++;
                                    }


                                }
                            }
                        }
                    }

                    // Check level down
                    if (playerData.playerLevel.value > 0 && !levelUpObj) {
                        // Check if player can level DOWN and which level player can level down to
                        for (let i = 0; i < checkingDownLevels.length; i++) {
                            const level = checkingDownLevels[i];

                            if (level.value <= playerData.playerLevel.value) {
                                const conditionSets = level.levelDownConfig;

                                for (let j = 0; j < conditionSets.length; j++) {
                                    const conditionSet = conditionSets[j];

                                    // if minimum is not set, always return true for the condition
                                    const meetsTopupCondition = playersTopupForPeriod >= conditionSet.topupMinimum;
                                    const meetsConsumptionCondition = playersConsumptionForPeriod >= conditionSet.consumptionMinimum;

                                    let meetsEnoughConditions = false;

                                    if (conditionSet.topupMinimum >= 0 || conditionSet.consumptionMinimum >= 0) {
                                        if (conditionSet.andConditions) {
                                            meetsEnoughConditions = meetsTopupCondition && meetsConsumptionCondition
                                        } else {
                                            // if (conditionSet.topupMinimum <= 0) {
                                            //     meetsEnoughConditions = meetsConsumptionCondition;
                                            // } else if (conditionSet.consumptionMinimum <= 0) {
                                            //     meetsEnoughConditions = meetsTopupCondition;
                                            // } else {
                                                meetsEnoughConditions = meetsTopupCondition || meetsConsumptionCondition
                                            // }
                                        }
                                    } else {
                                        levelObjId = playerData.playerLevel.value > 0 ? levels[0]._id : null;
                                        levelDownObj = levels[0];
                                    }
                                    if (meetsEnoughConditions) {
                                        levelObjId = level._id;
                                        levelDownObj = level;
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    // Player with level more than 0 and has no top up or consumption
                    levelObjId = playerData.playerLevel.value > 0 ? levels[0]._id : null;
                    levelDownObj = levels[0];
                }
                if (levelObjId && String(levelObjId) != String(playerData.playerLevel._id) && ((upOrDown && levelUpObj) || (!upOrDown && levelDownObj))) {
                    let proposalData = {
                        levelOldName: oldPlayerLevelName,
                        upOrDown: upOrDown ? "LEVEL_UP" : "LEVEL_DOWN",
                        playerObjId: playerData._id,
                        playerName: playerData.name,
                        playerId: playerData.playerId,
                        platformObjId: playerData.platform
                    };

                    let promResolve = Promise.resolve();

                    if (upOrDown) {
                        for (let i = 0; i < levelUpCounter; i++) {
                            let tempProposal = JSON.parse(JSON.stringify(proposalData));
                            if (i > 0) {
                                tempProposal.levelOldName = levelUpObjArr[i - 1].name;
                            }
                            tempProposal.levelValue = levelUpObjArr[i].value;
                            tempProposal.levelName = levelUpObjArr[i].name;
                            tempProposal.levelObjId = levelUpObjId[i];
                            let proposalProm = function () {
                                return createProposal(tempProposal, i);
                            }
                            promResolve = promResolve.then(proposalProm);
                        }

                    } else {
                        let tempProposal = JSON.parse(JSON.stringify(proposalData));
                        tempProposal.levelValue = levelDownObj.value;
                        tempProposal.levelName = levelDownObj.name;
                        tempProposal.levelObjId = levelObjId;
                        let proposalProm = function () {
                            return createProposal(tempProposal);
                        }
                        promResolve = promResolve.then(proposalProm);
                    }

                    return promResolve;

                    function createProposal (proposal, index) {
                        return dbProposal.createProposalWithTypeName(playerData.platform, constProposalType.PLAYER_LEVEL_MIGRATION, {data: proposal}).then(
                            createdMigrationProposal => {
                                if (upOrDown) {
                                    return dbconfig.collection_proposalType.findOne({
                                        platformId: platformObjId,
                                        name: constProposalType.PLAYER_LEVEL_UP
                                    }).lean();
                                }
                            }
                        ).then(
                            proposalTypeData => {
                                // check if player has level up to this level previously
                                if (upOrDown) {
                                    return dbconfig.collection_proposal.findOne({
                                        'data.playerObjId': {$in: [ObjectId(playerData._id), String(playerData._id)]},
                                        'data.platformObjId': {$in: [ObjectId(playerData.platform), String(playerData.platform)]},
                                        'data.levelValue': proposal.levelValue,
                                        type: proposalTypeData._id,
                                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                    }).lean();
                                }
                            }
                        ).then(
                            rewardProp => {
                                if (upOrDown && !rewardProp) {
                                    // if this is level up and player has not reach this level before
                                    // create level up reward proposal
                                    if (levelUpObjArr[index] && levelUpObjArr[index].reward && levelUpObjArr[index].reward.bonusCredit) {
                                        proposal.rewardAmount = levelUpObjArr[index].reward.bonusCredit;
                                        proposal.isRewardTask = levelUpObjArr[index].reward.isRewardTask;
                                        if (proposal.isRewardTask) {
                                            if (levelUpObjArr[index].reward.providerGroup && levelUpObjArr[index].reward.providerGroup !== "free") {
                                                proposal.providerGroup = levelUpObjArr[index].reward.providerGroup;
                                            }
                                            proposal.requiredUnlockAmount = levelUpObjArr[index].reward.requiredUnlockTimes * levelUpObjArr[index].reward.bonusCredit;
                                        }

                                        return dbProposal.createProposalWithTypeName(playerData.platform, constProposalType.PLAYER_LEVEL_UP, {data: proposal});
                                    }
                                }
                            }
                        );
                    }

                }
            }
        );
    }
};

module.exports = dbPlayerLevelInfo;