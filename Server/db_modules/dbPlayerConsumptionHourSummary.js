"use strict";
let dbPlayerConsumptionHourSummaryFunc = function () {
};
module.exports = new dbPlayerConsumptionHourSummaryFunc();

const dbconfig = require('./../modules/dbproperties');
const constProposalType = require('./../const/constProposalType');
const constProposalStatus = require('./../const/constProposalStatus');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerConsumptionHourSummary = {
    updateSummary: (platformObjId, playerObjId, providerObjId, createTime, amount, validAmount, bonusAmount, times, loginDevice) => {
        let startTime = new Date(createTime);
        startTime.setMinutes(0);
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);

        let providerObjIdProm = Promise.resolve(providerObjId);
        if (String(providerObjId).length !== 24) {
            providerObjIdProm = dbconfig.collection_gameProvider.findOne({providerId: providerObjId}, {_id: 1}).lean().then(
                data => {
                    if (!data || !data._id) {
                        return Promise.reject({message: "provider not found"});
                    }

                    providerObjId = data._id;
                }
            )
        }

        return providerObjIdProm.then(
            () => {
                return dbconfig.collection_playerConsumptionHourSummary.findOneAndUpdate(
                    {platform: platformObjId, player: playerObjId, provider: providerObjId, startTime: startTime, loginDevice: loginDevice},
                    {$inc: {consumptionAmount: amount, consumptionValidAmount: validAmount, consumptionBonusAmount: bonusAmount, consumptionTimes: times, loginDevice: loginDevice}},
                    {upsert: true, new: true}
                ).lean();
            }
        ).then(
            summary => {
                // console.log('playerConsumptionHourSummary', summary.playerObjId, summary.createTime, summary.amount, summary.validAmount, summary.bonusAmount, summary.times);
                return summary;
            }
        );
    },

    setWinnerMonitorConfig: (platformObjId, winnerMonitorData) => {
        if (!(winnerMonitorData instanceof Array)) {
            return [];
        }
        let proms = [];
        for (let i = 0; i < winnerMonitorData.length; i++) {
            let providerConfig = winnerMonitorData[i];
            if (!providerConfig || !providerConfig.providerObjId) {
                continue;
            }

            providerConfig.companyWinRatio = providerConfig.companyWinRatio || 0;
            providerConfig.playerWonAmount = providerConfig.playerWonAmount || 0;
            providerConfig.consumptionTimes = providerConfig.consumptionTimes || 0;

            let prom = dbconfig.collection_winnerMonitorConfig.findOneAndUpdate(
                {
                    platform: platformObjId,
                    provider: providerConfig.providerObjId
                },
                {
                    companyWinRatio: providerConfig.companyWinRatio,
                    playerWonAmount: providerConfig.playerWonAmount,
                    consumptionTimes: providerConfig.consumptionTimes,
                },
                {
                    upsert: true,
                    new: true
                }
            ).lean();
            proms.push(prom);
        }

        return Promise.all(proms);
    },

    getWinnerMonitorConfig: (platformObjId) => {
        return dbconfig.collection_winnerMonitorConfig.find({platform: platformObjId}).lean();
    },

    getWinnerMonitorData: (platformObjId, startTime, endTime, providerObjId, playerName) => {
        let configQuery = {platform: platformObjId};
        if (providerObjId) {
            configQuery.provider = providerObjId;
        }

        let configProm = dbconfig.collection_winnerMonitorConfig.find(configQuery).lean();
        let playerProm = Promise.resolve();
        if (playerName) {
            playerProm = dbconfig.collection_players.findOne({name: playerName, platform: platformObjId}).lean();
        }

        return Promise.all([configProm, playerProm]).then(
            ([configsData, playerData]) => {
                if (!configsData || !configsData.length) {
                    return Promise.reject({message: "Setting not set, please go config to set it"});
                }

                if (playerName && !playerData) {
                    return Promise.reject({message: "player not found"});
                }

                let proms = [];

                for (let i = 0; i < configsData.length; i++) {
                    let config = configsData[i];

                    let firstMatchQuery = {
                        platform: ObjectId(config.platform),
                        startTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                        provider: ObjectId(config.provider)
                    };

                    if (playerData) {
                        firstMatchQuery.player = playerData._id;
                    }

                    let prom = dbconfig.collection_playerConsumptionHourSummary.aggregate([
                        {
                            $match: firstMatchQuery
                        },
                        {
                            $group: {
                                _id: "$player",
                                platform: {$first: "$platform"},
                                player: {$first: "$player"},
                                provider: {$first: "$provider"},
                                consumptionAmount: {$sum: "$consumptionAmount"},
                                consumptionValidAmount: {$sum: "$consumptionValidAmount"},
                                consumptionBonusAmount: {$sum: "$consumptionBonusAmount"},
                                consumptionTimes: {$sum: "$consumptionTimes"},
                            }
                        },
                        {
                            $project: {
                                platform: 1,
                                player: 1,
                                provider: 1,
                                consumptionAmount: 1,
                                consumptionValidAmount: 1,
                                consumptionBonusAmount: 1,
                                consumptionTimes: 1,
                                bonusValidRatio: {
                                    $divide: [
                                        {
                                            $multiply: [
                                                100,
                                                "$consumptionBonusAmount"
                                            ]
                                        },
                                        {
                                            $cond: {
                                                if: {
                                                    $gt: ["$consumptionValidAmount", 0]
                                                },
                                                then: "$consumptionValidAmount",
                                                else: 0.01
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                bonusValidRatio: {$gte: config.companyWinRatio},
                                consumptionBonusAmount: {$gte: config.playerWonAmount},
                                consumptionTimes: {$gte: config.consumptionTimes}
                            }
                        }
                    ]).read("secondaryPreferred").allowDiskUse(true);

                    proms.push(prom);
                }

                return Promise.all(proms);
            }
        ).then(
            resultData => {
                let filteredResult = resultData.flat();
                let proms = [];

                for (let i = 0; i < filteredResult.length; i++) {
                    let result = filteredResult[i];

                    let playerProm = dbconfig.collection_players.findOne({_id: result.player})
                        .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}) // todo :: add "select"
                        .populate({path: 'credibilityRemarks', model: dbconfig.collection_playerCredibilityRemark}) // todo :: add "select"
                        .populate({path: 'platform', model: dbconfig.collection_platform, select: {platformId: 1, name: 1}})
                        .lean();
                    let providerProm = dbconfig.collection_gameProvider.findOne({_id: result.provider}).lean(); // todo :: add projection

                    let prom = Promise.all([playerProm, providerProm]).then(
                        ([player, provider]) => {
                            result.player = player;
                            result.provider = provider;
                            return result;
                        }
                    );

                    proms.push(prom);
                }
                return Promise.all(proms);
            }
        );


    },

    getLastWithdrawalTime: (playerObjId) => {
        return dbconfig.collection_proposal.findOne({
            'data.playerObjId': ObjectId(playerObjId),
            mainType: constProposalType.PLAYER_BONUS,
            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
        }).sort({createTime: -1}).lean().then(
            proposal => {
                if (!proposal) {
                    return {
                        lastWithdrawalTime: "",
                        proposalId: ""
                    }
                }
                return {
                    lastWithdrawalTime: proposal.createTime,
                    proposalId: proposal.proposalId
                }
            }
        );
    },

    debugSummaryRecord: (platformObjId, startTime, endTime) => {
        return dbconfig.collection_playerConsumptionHourSummary.find({
            platform: platformObjId,
            startTime: {$gte: new Date(startTime), $lt: new Date(endTime)}
        }).sort({_id: -1}).lean();
    },
};

let proto = dbPlayerConsumptionHourSummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionHourSummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionHourSummary;
