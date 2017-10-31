const moment = require('moment-timezone');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbconfig = require('./../modules/dbproperties');
const dbProposal = require('./../db_modules/dbProposal');
const dbUtil = require('./../modules/dbutility');

const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('../const/constProposalType');
const constSystemParam = require('./../const/constSystemParam');

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
        let lastMonth = dbUtil.getLastMonthSGTime();
        if (!upOrDown){
            lastMonth.startTime = moment(lastMonth.startTime).add(12, 'hours').toDate();
            lastMonth.endTime = moment(lastMonth.endTime).add(12, 'hours').toDate();
        }

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
                                    startTime: lastMonth.startTime,
                                    endTime: lastMonth.endTime,
                                    upOrDown: upOrDown
                                });
                            }
                        }
                    );
                });
            }
        )
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
            promsArr.push(dbPlayerLevelInfo.processPlayerLevelMigration(player, platformObjId, levels, startTime, endTime, upOrDown));
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
        let consumptionTime = dbUtil.getLastMonthConsumptionReturnSGTime();

        let playerProm = dbconfig.collection_players.findOne({_id: playerObjId})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();

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
                        $gte: new Date(consumptionTime.startTime),
                        $lt: new Date(consumptionTime.endTime)
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
                let levelUpObj = null, levelDownObj = null;
                let oldPlayerLevelName = playerData.playerLevel.name;

                let playersTopupForPeriod = topUpSummary && topUpSummary.amount ? topUpSummary.amount : 0;
                let playersConsumptionForPeriod = consumptionSummary && consumptionSummary.validAmount ? consumptionSummary.validAmount : 0;

                // filter levels
                let checkingUpLevels = levels.filter(level => level.value > playerData.playerLevel.value);
                let checkingDownLevels = levels.filter(level => level.value <= playerData.playerLevel.value);

                // Check level up
                // Only player with top up or consumption last month worth checking
                if (playersTopupForPeriod > 0 || playersConsumptionForPeriod > 0) {
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
                                }


                            }
                        }
                    }

                    // Check level down
                    if (playerData.playerLevel.value > 0 && !levelUpObj) {
                        // Check if player can level UP and which level player can level up to
                        for (let i = 0; i < checkingDownLevels.length; i++) {
                            const level = checkingDownLevels[i];

                            if (level.value <= playerData.playerLevel.value) {
                                const conditionSets = level.levelDownConfig;

                                for (let j = 0; j < conditionSets.length; j++) {
                                    const conditionSet = conditionSets[j];

                                    // if minimum is not set, always return true for the condition
                                    const meetsTopupCondition = playersTopupForPeriod >= conditionSet.topupMinimum;
                                    const meetsConsumptionCondition = playersConsumptionForPeriod >= conditionSet.consumptionMinimum;

                                    const meetsEnoughConditions =
                                        conditionSet.topupMinimum <= 0
                                            ? conditionSet.consumptionMinimum <= 0
                                            ? false
                                            : meetsConsumptionCondition
                                            : conditionSet.consumptionMinimum <= 0
                                            ? meetsTopupCondition
                                            : conditionSet.andConditions
                                                ? meetsTopupCondition && meetsConsumptionCondition
                                                : meetsTopupCondition || meetsConsumptionCondition;

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
                        levelValue: upOrDown ? levelUpObj.value : levelDownObj.value,
                        levelName: upOrDown ? levelUpObj.name : levelDownObj.name,
                        levelObjId: levelObjId,
                        levelOldName: oldPlayerLevelName,
                        upOrDown: upOrDown ? "LEVEL_UP" : "LEVEL_DOWN",
                        playerObjId: playerData._id,
                        playerName: playerData.name,
                        playerId: playerData.playerId,
                        platformObjId: playerData.platform
                    };

                    return dbProposal.createProposalWithTypeName(playerData.platform, constProposalType.PLAYER_LEVEL_MIGRATION, {data: proposalData}).then(
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
                                    'data.levelValue': levelUpObj.value,
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
                                if (levelUpObj && levelUpObj.reward && levelUpObj.reward.bonusCredit) {
                                    proposalData.rewardAmount = levelUpObj.reward.bonusCredit;
                                    proposalData.isRewardTask = levelUpObj.reward.isRewardTask;

                                    return dbProposal.createProposalWithTypeName(playerData.platform, constProposalType.PLAYER_LEVEL_UP, {data: proposalData});
                                }
                            }
                        }
                    );

                }
            }
        );
    }
};

module.exports = dbPlayerLevelInfo;