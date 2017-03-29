/******************************************************************
 *  NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var dbconfig = require('./../modules/dbproperties');
var dbUtil = require('../modules/dbutility');
var dbProposal = require('./../db_modules/dbProposal');
var dbPartner = require("./dbPartner.js");
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var util = require('util');

var Q = require("q");
var dataUtils = require("../modules/dataUtils.js");
//var constGameType = require('../const/constGameType');
var dbGameType = require('../db_modules/dbGameType');
var dbutility = require("../modules/dbutility.js");
var constShardKeys = require('../const/constShardKeys');

var partnerValidConsumptionSum = null;
var partnerLevelConsumptionAmount = null;

var dbPartnerWeekSummary = {


    /**
     * Create a the information of a partner summary of the week
     * @param {json} data - The data of the partner user's level. Refer to PartnerLevel schema.
     */
    createPartnerWeekSummary: function (partnerWeekSummaryData) {
        var partnerWeekSummary = new dbconfig.collection_partnerWeekSummary(partnerWeekSummaryData);
        return partnerWeekSummary.save();
    },

    /**
     * Get the information of a partner summary of the week by  _id
     * @param {String} query - Query string
     */
    getPartnerWeekSummary: function (query) {
        return dbconfig.collection_partnerWeekSummary.findOne(query).exec();
    },

    /**
     * Calculate week summary for platform partners
     * @param {ObjectId} platformId
     * @param {date} startTime
     * @param {date} endTime
     */
    calculatePlatformPartnerWeekSummary: function (platform, startTime, endTime) {
        // Note that we will gather (this * average_number_of_players_per_partner) player ids, so we may want to keep the batch size small!
        const partnerProcessorBatchSize = 500;

        var partnerStream = dbconfig.collection_partner.find({platform: platform})
        //.populate({path: 'level', model: dbconfig.collection_partnerLevel})
            .cursor({batchSize: partnerProcessorBatchSize});

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            return Q(
                balancer.processStream({
                    stream: partnerStream,
                    batchSize: partnerProcessorBatchSize,
                    makeRequest: function (partners, request) {
                        request("player", "calculatePartnerWeekSummaryForPartners", {
                            platformId: platform,
                            partnerIds: partners.map(p => p._id),
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                })
            );

        });

        /*
         return streamUtils.processStreamInParallelizedBatches(
         partnerStream,
         partnerProcessorBatchSize,
         partner => dbPartnerWeekSummary.calculatePartnerWeekSummary(platform, partner, startTime, endTime)
         );
         */

        /*
         // Process the partners level-by-level (deepest level first)
         return dbconfig.collection_partner.findOne({platform: platform}).sort('-depthInTree').then(
         function (deepest) {
         var deepestDepth = deepest.depthInTree;
         console.log("[log] (" + (new Error()).stack.split('\n')[1].replace(/^ *at /, '').split('/').slice(-2).join('/') + ") deepestDepth:", deepestDepth);

         // Note that we will request this * average_number_of_child_nodes records, so we may want to keep the batch size small.
         const partnerProcessorBatchSize = 500;

         function doOneLevel (depth) {
         var partnerStream = dbconfig.collection_partner.find({platform: platform, depthInTree: depth}).populate("level")
         .cursor({batchSize: partnerProcessorBatchSize}).stream();

         return streamUtils.processStreamInBatches(
         partnerStream,
         partnerProcessorBatchSize,
         function (partnerBatch) {
         console.log("Processing a batch of " + partnerBatch.length + " partners...");
         var proms = partnerBatch.map(
         partner => dbPartnerWeekSummary.calculatePartnerWeekSummary(platform, partner, startTime, endTime)
         );
         return Q.all(proms);
         }
         );
         }

         function doAllLevelsStartingWith (currentDepth) {
         return doOneLevel(currentDepth).then(
         function (message) {
         // console.log("[log] (" + (new Error()).stack.split('\n')[1].replace(/^ *at /, '').split('/').slice(-2).join('/') + ") message:", message);
         // 0 is the "top level"; we should do it.
         if (currentDepth > 0) {
         return doAllLevelsStartingWith(currentDepth - 1); // recurses
         } else {
         return "Done all levels"; // resolves
         }
         }
         )
         }

         return doAllLevelsStartingWith(deepestDepth);
         }
         );
         */
    },

    calculatePartnerWeekSummaryForPartners: function (platformId, partnerIds, startTime, endTime) {
        return dbconfig.collection_partnerLevelConfig.findOne({platform: platformId}).then(
            function (partnerLevelConfig) {
                return dbconfig.collection_partner.find({
                    _id: {$in: partnerIds}
                }).populate({path: 'level', model: dbconfig.collection_partnerLevel}).then(
                    function (partners) {
                        var proms = partners.map(
                            partner => dbPartnerWeekSummary.calculatePartnerWeekSummary(platformId, partner, startTime, endTime, partnerLevelConfig)
                        );
                        return Q.all(proms);
                    }
                );
            }
        );
    },

    /**
     * Calculate week summary for partner
     * @param {ObjectId} platformId
     * @param {Object} partner Note that partner.level should be populated.
     * @param {date} startTime
     * @param {date} endTime
     */
    calculatePartnerWeekSummary: function (platformId, partner, startTime, endTime, partnerLevelConfig) {
        var partnerId = partner._id;
        var partnerLevel = partner.level;

        return dbconfig.collection_players.find(
            {
                platform: platformId,
                partner: partnerId
                // status: true
            }
        ).select("_id").lean().then(
            function (playerData) {
                if (playerData.length > 0) {
                    var playerIds = playerData.map(player => player._id);
                    const matchPlayerSummaries = {
                        platformId: platformId,
                        playerId: {$in: playerIds},
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    };
                    const consumptionSummariesProm = dbconfig.collection_playerConsumptionWeekSummary.find(matchPlayerSummaries);
                    const topUpSummariesProm = dbconfig.collection_playerTopUpWeekSummary.find(matchPlayerSummaries);

                    return Q.all([consumptionSummariesProm, topUpSummariesProm]).then(
                        function (data) {
                            const consumptionSummaries = data[0];
                            const topUpSummaries = data[1];
                            const consumptionSummariesByPlayerId = dataUtils.byKey(consumptionSummaries, 'playerId');
                            const topUpSummariesByPlayerId = dataUtils.byKey(topUpSummaries, 'playerId');

                            var validPlayerCount = 0;
                            var activePlayerCount = 0;
                            var consumptionSum = 0;
                            var validConsumptionSum = 0;
                            playerIds.forEach(
                                function (playerId) {
                                    const consumptionSummary = consumptionSummariesByPlayerId[playerId];
                                    const topUpSummary = topUpSummariesByPlayerId[playerId];
                                    if (consumptionSummary && topUpSummary) {
                                        var playerIsValid = consumptionSummary.times >= partnerLevelConfig.validPlayerConsumptionTimes
                                            && topUpSummary.times >= partnerLevelConfig.validPlayerTopUpTimes;

                                        var playerIsActive = consumptionSummary.times >= partnerLevelConfig.activePlayerConsumptionTimes
                                            && topUpSummary.times >= partnerLevelConfig.activePlayerTopUpTimes;

                                        if (playerIsValid) {
                                            validPlayerCount++;
                                        }
                                        if (playerIsActive) {
                                            activePlayerCount++;
                                        }
                                    }
                                    if (consumptionSummary) {
                                        consumptionSum += consumptionSummary.amount;
                                        validConsumptionSum += consumptionSummary.validAmount;
                                    }
                                }
                            );

                            var createSummary = consumptionSum > 0 || validConsumptionSum > 0 || validPlayerCount > 0 || activePlayerCount > 0;

                            if (createSummary) {
                                var summaryData = {
                                    partnerId: partnerId,
                                    partnerLevel: partnerLevel.value,
                                    platformId: platformId,
                                    consumptionSum: consumptionSum,
                                    validConsumptionSum: validConsumptionSum,
                                    validPlayers: validPlayerCount,
                                    activePlayers: activePlayerCount,
                                    date: startTime
                                };

                                // This was simple, but it would create a whole new set of records if the process was run again.
                                // We don't want that!
                                //var partnerWeekSummary = new dbconfig.collection_partnerWeekSummary(summaryData);
                                //return partnerWeekSummary.save();

                                // This will ensure that if a summary already exists, it is overwritten, not duplicated:
                                return dbUtil.upsertForShard(
                                    dbconfig.collection_partnerWeekSummary,
                                    {
                                        platformId: platformId,
                                        partnerId: partnerId,
                                        date: startTime
                                    },
                                    summaryData,
                                    constShardKeys.collection_partnerWeekSummary
                                );

                            } else {
                                return Q.resolve("No activity for this partner");
                            }
                        }
                    );
                } else {
                    return Q.resolve("No players for partner");
                }
            }
        );
    },

    /**
     * Calculate week summary for platform partners
     * @param {ObjectId} platformId
     * @param {date} startTime
     * @param {date} endTime
     */
    calculatePlatformPartnerChildWeekSummary: function (platform, startTime, endTime) {
        // Note that we will load (this * average_number_of_child_nodes) partnerWeekSummary records into memory, so we may want to keep the batch size small!
        const partnerProcessorBatchSize = 500;

        var partnerStream = dbconfig.collection_partner.find({platform: platform})
            .cursor({batchSize: partnerProcessorBatchSize});

        /*
         return streamUtils.processStreamInParallelizedBatches(
         partnerStream,
         partnerProcessorBatchSize,
         partner => dbPartnerWeekSummary.calculatePartnerChildWeekSummary(platform, partner, startTime, endTime)
         );
         */

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            return Q(
                balancer.processStream({
                    stream: partnerStream,
                    batchSize: partnerProcessorBatchSize,
                    makeRequest: function (partners, request) {
                        request("player", "calculatePartnerChildWeekSummaryForPartners", {
                            platformId: platform,
                            partnerIds: partners.map(p => p._id),
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                })
            );

        });

    },

    calculatePartnerChildWeekSummaryForPartners: function (platformId, partnerIds, startTime, endTime) {
        return dbconfig.collection_partner.find({
            _id: {$in: partnerIds}
        }).populate({path: 'level', model: dbconfig.collection_partnerLevel}).then(
            function (partners) {
                var proms = partners.map(
                    partner => dbPartnerWeekSummary.calculatePartnerChildWeekSummary(platformId, partner, startTime, endTime)
                );
                return Q.all(proms);
            }
        );
    },

    /**
     * Updates week summary for partner, relative to his children.
     * Generated many partnerChildWeekSummary records, and updates the partnerWeekSummary.
     * @param {ObjectId} platformId
     * @param {Object} partner Note that partner.level should be populated.
     * @param {date} startTime
     * @param {date} endTime
     */
    calculatePartnerChildWeekSummary: function (platformId, partner, startTime, endTime) {
        var partnerId = partner._id;
        var partnerLevel = partner.level;

        return dbconfig.collection_partnerWeekSummary.find(
            {
                partnerId: {$in: partner.children},
                date: startTime
            }
        ).then(
            function (childSummaries) {
                var proms = [];
                var totalAmount = 0;
                var totalValidAmount = 0;

                childSummaries.forEach(function (summary) {
                    totalAmount += summary.consumptionSum;
                    totalValidAmount += summary.validConsumptionSum;

                    if (summary.consumptionSum > 0 || summary.validConsumptionSum > 0) {
                        var partnerChildWeekSummary = {
                            partnerId: partnerId,
                            childId: summary.partnerId,
                            partnerLevel: partnerLevel.value,
                            platformId: platformId,
                            date: startTime,
                            childAmount: summary.consumptionSum,
                            childValidAmount: summary.validConsumptionSum
                        };

                        // If the calculation is re-run, this will throw an error for trying to create a duplicate record:
                        // var prom = dbconfig.collection_partnerChildWeekSummary(partnerChildWeekSummary).save();

                        // This should update the existing document, if there is one:
                        var prom = dbUtil.upsertForShard(
                            dbconfig.collection_partnerChildWeekSummary,
                            {
                                platformId: platformId,
                                partnerId: partnerId,
                                childId: summary.partnerId,
                                date: startTime
                            },
                            partnerChildWeekSummary,
                            constShardKeys.collection_partnerChildWeekSummary
                        );

                        proms.push(prom);
                    }
                });

                if (totalAmount > 0 || totalValidAmount > 0) {
                    var prom = dbUtil.upsertForShard(
                        dbconfig.collection_partnerWeekSummary,
                        {platformId: platformId, partnerId: partnerId, date: startTime},
                        {
                            childAmount: totalAmount,
                            childValidAmount: totalValidAmount
                        },
                        constShardKeys.collection_partnerWeekSummary
                    );
                    proms.push(prom);
                }

                return Q.all(proms);
            }
        );

        // return dbconfig.collection_partnerWeekSummary.aggregate(
        //     [
        //         {
        //             $match: {
        //                 platformId: platformId,
        //                 partnerId: {$in: partner.children},
        //                 date: {
        //                     $gte: startTime,
        //                     $lt: endTime
        //                 }
        //             }
        //         },
        //         {
        //             $group: {
        //                 _id: {platformId: "$platformId"},
        //                 amount: {$sum: "$consumptionSum"},
        //                 validAmount: {$sum: "$validConsumptionSum"}
        //             }
        //         }
        //     ]
        // ).exec().then(
        //     function (data) {
        //         console.log("[log] (" + (new Error()).stack.split('\n')[1].replace(/^ *at /, '').split('/').slice(-2).join('/') + ") data:", data);
        //         if (data && data[0]) {
        //             var sums = data[0];
        //             if (sums.amount > 0 || sums.validAmount > 0) {
        //                 /*
        //                 var partnerChildWeekSummary = {
        //                     partnerId: partner._id,
        //                     childId: {type: Schema.ObjectId},
        //                     partnerLevel: {type: Number},
        //                     platformId: {type: Schema.ObjectId},
        //                     date: startTime,
        //                     childAmount: sums.amount,
        //                     childValidAmount: sums.validAmount
        //                 };
        //                 */
        //             }
        //         }
        //     }
        // );
    },

    performPartnerLevelMigration: function (platform, startTime, endTime) {
        // Less to process, batch size can be larger for this one
        const partnerProcessorBatchSize = 1000;

        var partnerStream = dbconfig.collection_partner.find({platform: platform})
            .cursor({batchSize: partnerProcessorBatchSize});

        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {

            return Q(
                balancer.processStream({
                    stream: partnerStream,
                    batchSize: partnerProcessorBatchSize,
                    makeRequest: function (partners, request) {
                        request("player", "performPartnerLevelMigrationForPartners", {
                            platformId: platform,
                            partnerIds: partners.map(p => p._id),
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                })
            );

        });

    },

    performPartnerLevelMigrationForPartners: function (platformId, partnerIds, startTime, endTime) {
        // Cleanup: this partnerLevel promise could be combined with the two promises below, to Q.all() all 3 at once.
        return dbconfig.collection_partnerLevel.find({platform: platformId}).then(
            function (partnerLevelsArray) {
                const partnerLevelsByValue = dataUtils.byKey(partnerLevelsArray, 'value');

                const partnersProm = dbconfig.collection_partner.find({_id: {$in: partnerIds}}).populate({
                    path: 'level',
                    model: dbconfig.collection_partnerLevel
                });

                const summariesProm = dbconfig.collection_partnerWeekSummary.find({
                    platformId: platformId,
                    partnerId: {$in: partnerIds},
                    date: startTime
                });

                return Q.all([partnersProm, summariesProm]).then(
                    function (data) {
                        const partnersById = dataUtils.byKey(data[0], '_id');
                        const summariesById = dataUtils.byKey(data[1], 'partnerId');

                        var proms = [];
                        partnerIds.forEach(function (partnerId) {
                            const partner = partnersById[partnerId];

                            // If migration is run twice, we should not process a partner multiple times.
                            // (Because that could result in them being promoted twice, or their failMeetingTargetWeeks being incremented twice!)
                            if (partner.datePartnerLevelMigrationWasLastProcessed.getTime() < startTime.getTime()) {

                                // If the partner has no summary, that means they had no activity, so we create some dummy data to reflect that.
                                const summary = summariesById[partnerId] || {
                                        consumptionSum: 0,
                                        validConsumptionSum: 0,
                                        validPlayers: 0,
                                        activePlayers: 0
                                    };

                                const currentLevel = partner.level;
                                // The next and previous levels may be undefined.  So be ready to deal with that below.
                                const nextLevel = partnerLevelsByValue[currentLevel.value + 1];
                                const previousLevel = partnerLevelsByValue[currentLevel.value - 1];

                                const markDone = () => {
                                    partner.datePartnerLevelMigrationWasLastProcessed = startTime;
                                    return partner.save();
                                    // Or if we want to avoid save middleware:
                                    //return dbUtil.findOneAndUpdateForShard(
                                    //    dbconfig.collection_partner,
                                    //    {_id: partner._id},
                                    //    {datePartnerLevelMigrationWasLastProcessed: startTime},
                                    //    constShardKeys.collection_partner
                                    //);
                                };

                                // NOTE: We should only produce one promise per partner below, since all promises will be executed in parallel

                                if (nextLevel && summary.validPlayers >= nextLevel.limitPlayers && summary.validConsumptionSum >= nextLevel.consumptionAmount) {

                                    // Promote the partner immediately
                                    proms.push(dbPartner.promotePartner(partner, currentLevel, nextLevel).then(markDone));

                                } else if (summary.validPlayers >= currentLevel.limitPlayers && summary.validConsumptionSum >= currentLevel.consumptionAmount) {

                                    // We are happy with the partner
                                    // If he has any failMeetingTargetWeeks, clear them
                                    if (partner.failMeetingTargetWeeks > 0) {
                                        proms.push(dbPartner.updatePartner({_id: partnerId}, {failMeetingTargetWeeks: 0}).then(markDone));
                                    }

                                } else {

                                    // The partner did not reach the targets for the current level
                                    // Increase partner's failMeetingTargetWeeks, or actually demote the partner
                                    const failMeetingTargetWeeks = partner.failMeetingTargetWeeks + 1;

                                    if (previousLevel && failMeetingTargetWeeks >= currentLevel.demoteWeeks) {
                                        // Demote this partner!
                                        proms.push(dbPartner.demotePartner(partner, currentLevel, previousLevel).then(markDone));
                                    } else {
                                        proms.push(dbPartner.updatePartner({_id: partnerId}, {failMeetingTargetWeeks: failMeetingTargetWeeks}).then(markDone));
                                    }

                                }

                            }
                        });
                        return Q.all(proms);
                    }
                );
            }
        );
    },

    /**
     * Check platform weekly consumption return event
     * @param {ObjectId} platformId
     * @param {JSON} eventData
     * @param {ObjectId} proposalTypeId
     */
    checkPlatformWeeklyConsumptionReturn: function (platformId, eventData, proposalTypeId) {
        //return dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        return dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                // We will be grabbing the gametype day consumption summaries for every player belonging to each partner
                // Better keep this number low!
                const partnerProcessorBatchSize = 100;

                var partnerStream = dbconfig.collection_partner.find({platform: platformId})
                    .cursor({batchSize: partnerProcessorBatchSize});

                var balancer = new SettlementBalancer();

                return balancer.initConns().then(function () {

                    return Q(
                        balancer.processStream({
                            stream: partnerStream,
                            batchSize: partnerProcessorBatchSize,
                            makeRequest: function (partners, request) {
                                request("player", "checkPlatformWeeklyConsumptionReturnForPartners", {
                                    platformId: platformId,
                                    eventData: eventData,
                                    proposalTypeId: proposalTypeId,
                                    partnerIds: partners.map(p => p._id),
                                    startTime: settleTime.startTime,
                                    endTime: settleTime.endTime
                                });
                            }
                        })
                    );

                });

            }
        );
    },

    checkPlatformWeeklyTopUpReturn: function (platformId, eventData, proposalTypeId) {
        return dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {
                const partnerProcessorBatchSize = 100;

                var partnerStream = dbconfig.collection_partner.find({platform: platformId})
                    .cursor({batchSize: partnerProcessorBatchSize});

                var balancer = new SettlementBalancer();

                return balancer.initConns().then(function () {

                    return Q(
                        balancer.processStream({
                            stream: partnerStream,
                            batchSize: partnerProcessorBatchSize,
                            makeRequest: function (partners, request) {
                                request("player", "checkPlatformWeeklyTopUpReturnForPartners", {
                                    platformId: platformId,
                                    eventData: eventData,
                                    proposalTypeId: proposalTypeId,
                                    partnerIds: partners.map(p => p._id),
                                    startTime: settleTime.startTime,
                                    endTime: settleTime.endTime
                                });
                            }
                        })
                    );

                });

            }
        );
    },

    checkPlatformWeeklyConsumptionReturnForPartners: function (platformId, eventData, proposalTypeId, partnerIds, startTime, endTime) {
        return dbconfig.collection_partner.find({_id: {$in: partnerIds}}).populate({
            path: 'level',
            model: dbconfig.collection_partnerLevel
        }).then(
            function (partners) {
                const proms = partners.map(
                    partner => dbPartnerWeekSummary.checkPlatformWeeklyConsumptionReturnForOnePartner(platformId, eventData, proposalTypeId, partner, startTime, endTime)
                );
                return Q.all(proms);
            }
        );
    },

    /**
     * @param partner - An actual partner document (not a partnerId), with the level field populated.
     * @returns {Promise}
     */
    checkPlatformWeeklyConsumptionReturnForOnePartner: function (platformId, eventData, proposalTypeId, partner, startTime, endTime) {

        const partnerLevel = partner.level;

        if (partnerLevel.value < eventData.condition.partnerLevel) {
            return Q.resolve("This partner does not have a high enough level");
        }

        if (partner.dateConsumptionReturnRewardWasLastAwarded.getTime() >= startTime.getTime()) {
            return Q.resolve("Already done this partner");
        }

        const allEventRewardRates = eventData.param.rewardPercentage.data;

        const rewardRatesAtThisPartnersLevel = allEventRewardRates[partnerLevel.value];

        if (!rewardRatesAtThisPartnersLevel) {
            const msg = util.format("Reward event _id=%s has no rewardPercentages for PartnerLevel \"%s\"", eventData._id, partnerLevel.name);
            return Q.reject(new Error(msg));
        }

        return dbGameType.getAllGameTypes().then(
            function (allGameTypes) {

                // Find the list of players for this partner
                // Then sum all consumptions by those players, grouped by gameType
                return dbconfig.collection_players.find({partner: partner._id}).select('_id').lean().then(
                    function (players) {
                        const playerIds = players.map(p => p._id);

                        const matchPlayerSummaries = {
                            platformId: platformId,
                            playerId: {$in: playerIds},
                            date: {
                                $gte: startTime,
                                $lt: endTime
                            }
                        };

                        return dbconfig.collection_providerPlayerDaySummary.aggregate(
                            [
                                {$match: matchPlayerSummaries},
                                {
                                    $group: {
                                        _id: {gameType: "$gameType"},
                                        amount: {$sum: "$amount"},
                                        validAmount: {$sum: "$validAmount"},
                                        consumptionTimes: {$sum: "$consumptionTimes"}
                                    }
                                }
                            ]
                        ).exec();
                    }
                ).then(
                    function (data) {

                        const totalsByGameType = {};
                        data.forEach(function (item) {
                            totalsByGameType[item._id.gameType] = item;
                        });

                        let rewardAmount = 0;

                        for (let type in allGameTypes) {
                            const gameType = allGameTypes[type];

                            const totals = totalsByGameType[gameType];

                            if (!totals) {
                                // There was no consumption for any of the players for this gameType
                                continue;
                            }

                            const consumptionSum = totals.validAmount;

                            const rewardRate = rewardRatesAtThisPartnersLevel[gameType];

                            if (rewardRate) {
                                const consumptionReturn = consumptionSum * rewardRate;

                                rewardAmount += consumptionReturn;
                            } else {
                                const msg = util.format("Reward event _id=%s has no rewardPercentage for gameType=%s at PartnerLevel \"%s\"", eventData._id, gameType, partnerLevel.name);
                                return Q.reject(Error(msg));
                            }
                        }

                        if (rewardAmount > 0) {
                            const proposalData = {
                                type: proposalTypeId,
                                data: {
                                    partnerId: partner._id,
                                    partnerName: partner.partnerName,
                                    platformId: platformId,
                                    rewardAmount: rewardAmount,
                                    eventName: eventData.name,
                                    eventCode: eventData.code,
                                    eventDescription: eventData.description
                                }
                            };

                            const createProposalForPartner = dbProposal.createProposalWithTypeId(proposalTypeId, proposalData);

                            const markPartnerAsDone = function () {
                                partner.dateConsumptionReturnRewardWasLastAwarded = startTime;
                                return partner.save();
                            };

                            return createProposalForPartner.then(markPartnerAsDone);
                        } else {
                            return Q.resolve("No reward for this partner");
                        }

                    }
                );

            }
        );

    },

    /**
     * Check partner weekly referral reward event
     * @param {ObjectId} platformId
     * @param {JSON} eventCondition
     * @param {ObjectId} proposalTypeId
     */
    checkPartnerWeeklyReferralReward: function (platformId, eventData) {
        //return dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        return dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {

                // This process is fairly gentle, so the number can go high.
                const partnerProcessorBatchSize = 500;

                var partnerStream = dbconfig.collection_partner.find({platform: platformId})
                    .cursor({batchSize: partnerProcessorBatchSize});

                var balancer = new SettlementBalancer();

                return balancer.initConns().then(function () {

                    return Q(
                        balancer.processStream({
                            stream: partnerStream,
                            batchSize: partnerProcessorBatchSize,
                            makeRequest: function (partners, request) {
                                request("player", "checkPartnerWeeklyReferralRewardForPartners", {
                                    platformId: platformId,
                                    eventData: eventData,
                                    partnerIds: partners.map(p => p._id),
                                    startTime: settleTime.startTime,
                                    endTime: settleTime.endTime
                                });
                            }
                        })
                    );

                });

            }
        );
    },

    checkPartnerWeeklyReferralRewardForPartners: function (platformId, eventData, partnerIds, startTime, endTime) {
        var deferred = Q.defer();

        const eventCondition = eventData.condition;
        const proposalTypeId = eventData.executeProposal;

        // eventCondition.partnerLevel is a level name, but we want the level's value, so look it up
        dbconfig.collection_partnerLevel.findOne({platform: platformId, name: eventCondition.partnerLevel}).then(
            function (partnerLevel) {
                return partnerLevel.value;
            }
        ).then(
            function (minimumPartnerLevel) {
                // Collect summaries for all partners which meet the conditions
                // (Alternatively we could select partners with the condition that they have no dateReceivedReferralReward and their totalReferrals > 0)
                return dbconfig.collection_partnerWeekSummary.find(
                    {
                        partnerId: {$in: partnerIds},
                        platformId: platformId,
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        partnerLevel: {
                            $lte: minimumPartnerLevel
                        },
                        validConsumptionSum: {
                            $gte: 0
                        }
                    }
                ).populate({path: 'partnerId', model: dbconfig.collection_partner})
            }
        ).then(
            function (summaryData) {
                const proms = [];

                summaryData.forEach(function (summary) {
                    const partner = summary.partnerId;

                    // We will only give this reward if the partner has not received it before
                    if (!partner.dateReceivedReferralReward) {

                        // @todo We should use totalReferrals, but it is not being calculated yet!
                        //const totalReferrals = partner.totalReferrals;

                        // So for now we are using this
                        const totalReferrals = summary.validPlayers;

                        if (totalReferrals > 0) {
                            const rewardAmounts = eventData.param.rewardAmount.data;
                            const index = Math.min(totalReferrals - 1, rewardAmounts.length - 1);
                            const rewardAmount = rewardAmounts[index];

                            if (rewardAmount > 0) {
                                const proposalData = {
                                    type: proposalTypeId,
                                    data: {
                                        partnerId: partner._id,
                                        partnerName: partner.partnerName,
                                        platformId: platformId,
                                        rewardAmount: rewardAmount,
                                        eventName: eventData.name,
                                        eventCode: eventData.code,
                                        eventDescription: eventData.description
                                    }
                                };

                                proms.push(dbProposal.createProposalWithTypeId(proposalTypeId, proposalData));
                            }
                        }
                    }
                });

                return Q.all(proms);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding platform partner week summary.",
                    error: error
                });
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error creating partner consumption return proposal",
                    error: error
                });
            }
        );

        return deferred.promise;
    },

    // checkPartnerWeeklyIncentiveReward
    checkPartnerWeeklyIncentiveReward: function (platformId, eventData) {
        //return dbutility.getWeeklySettlementTimeForPlatformId(platformId).then(
        return dbutility.getLastWeekSGTimeProm().then(
            function (settleTime) {

                // This process is fairly gentle, so the number can go high.
                const partnerProcessorBatchSize = 500;

                const matchPartners = {
                    platform: platformId,
                    dateReceivedIncentiveReward: null       // NOTE: This is important!
                };

                var partnerStream = dbconfig.collection_partner.find(matchPartners)
                    .cursor({batchSize: partnerProcessorBatchSize});

                var balancer = new SettlementBalancer();

                return balancer.initConns().then(function () {

                    return Q(
                        balancer.processStream({
                            stream: partnerStream,
                            batchSize: partnerProcessorBatchSize,
                            makeRequest: function (partners, request) {
                                request("player", "checkPartnerWeeklyIncentiveRewardForPartners", {
                                    platformId: platformId,
                                    eventData: eventData,
                                    partnerIds: partners.map(p => p._id),
                                    startTime: settleTime.startTime,
                                    endTime: settleTime.endTime
                                });
                            }
                        })
                    );

                });

            }
        );
    },

    checkPartnerWeeklyIncentiveRewardForPartners: function (platformId, eventData, partnerIds, startTime, endTime) {
        const eventCondition = eventData.condition;
        const proposalTypeId = eventData.executeProposal;

        // eventCondition.partnerLevel is a level name, but we want the level's value, so look it up
        return dbconfig.collection_partnerLevel.findOne({platform: platformId, name: eventCondition.partnerLevel}).then(
            function (partnerLevel) {
                return partnerLevel.value;
            }
        ).then(
            function (minimumPartnerLevel) {
                return dbconfig.collection_partnerWeekSummary.find(
                    {
                        platformId: platformId,
                        partnerId: {$in: partnerIds},
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        // For efficiency, the partner level condition could move up to the calling function (the query for the initial partner stream)
                        partnerLevel: {$gte: minimumPartnerLevel},
                        validConsumptionSum: {$gte: eventCondition.validConsumptionSum}
                    }
                ).then(
                    function (summaries) {
                        // create proposals for the qualified partners
                        const proms = [];
                        summaries.forEach(function (summary) {
                            const partnerId = summary.partnerId;

                            const proposalData = {
                                type: proposalTypeId,
                                data: {
                                    partnerId: partnerId,
                                    platformId: platformId,
                                    rewardAmount: eventData.condition.rewardAmount,
                                    eventName: eventData.name,
                                    eventCode: eventData.code,
                                    eventDescription: eventData.description
                                }
                            };

                            proms.push(dbProposal.createProposalWithTypeId(proposalTypeId, proposalData));
                        });
                        return Q.all(proms);
                    }
                );
            }
        );
    },

    checkPlatformWeeklyTopUpReturnForPartners: function (platformId, eventData, proposalTypeId, partnerIds, startTime, endTime) {
        return dbconfig.collection_partner.find({_id: {$in: partnerIds}}).populate({
            path: 'level',
            model: dbconfig.collection_partnerLevel
        }).then(
            function (partners) {
                const proms = partners.map(
                    partner => dbPartnerWeekSummary.checkPlatformWeeklyTopUpReturnForOnePartner(platformId, eventData, proposalTypeId, partner, startTime, endTime)
                );
                return Q.all(proms);
            }
        );
    },

    checkPlatformWeeklyTopUpReturnForOnePartner: function (platformId, eventData, proposalTypeId, partner, startTime, endTime) {
        // Find the list of players for this partner
        var levelConfig = null;
        //check if player has this reward for this time period
        return dbconfig.collection_proposal.findOne(
            {
                type: proposalTypeId,
                "data.partnerId":  partner._id,
                "data.platformId": platformId,
                "data.startTime": startTime
            }
        ).then(
            proposalData => {
                if( !proposalData ){
                    return dbconfig.collection_players.find({partner: partner._id}).select('_id').lean()
                }
            }
        ).then(
            function (players) {
                if( players ){
                    const playerIds = players.map(p => p._id);
                    //find all valid top up records
                    levelConfig = eventData.param.reward[partner.level.value];
                    if (levelConfig) {
                        const matchPlayerSummaries = {
                            platformId: platformId,
                            playerId: {$in: playerIds},
                            createTime: {
                                $gte: startTime,
                                $lt: endTime
                            },
                            amount: {$gte: levelConfig.minTopUpAmount}
                        };

                        return dbconfig.collection_playerTopUpRecord.aggregate(
                            [
                                {$match: matchPlayerSummaries},
                                {
                                    $group: {
                                        _id: {platformId: "$platformId"},
                                        amount: {$sum: "$amount"}
                                    }
                                }
                            ]
                        ).exec();
                    }
                }
            }
        ).then(
            data => {
                if(data && data[0] && data[0].amount > 0){
                    var topUpAmount = data[0].amount;
                    var rewardAmount = Math.min( Math.floor(topUpAmount * levelConfig.rewardPercentage), levelConfig.maxRewardAmount );
                    if(rewardAmount > 0){
                        const proposalData = {
                            type: proposalTypeId,
                            data: {
                                partnerId:  partner._id,
                                partnerName: partner.partnerName,
                                platformId: platformId,
                                rewardAmount: rewardAmount,
                                startTime: startTime,
                                eventName: eventData.name,
                                eventCode: eventData.code,
                                eventDescription: eventData.description
                            }
                        };
                        return dbProposal.createProposalWithTypeId(proposalTypeId, proposalData).then(
                            data => rewardAmount
                        );
                    }
                }
            }
        );

    }

};

module.exports = dbPartnerWeekSummary;
