var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var moment = require('moment-timezone');
var constSystemParam = require('../const/constSystemParam');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');
const constProposalEntryType = require('./../const/constProposalEntryType');
const constProposalUserType = require('./../const/constProposalUserType');
const constProposalType = require ('./../const/constProposalType');
const constServerCode = require ('./../const/constServerCode');
const constProposalStatus = require ('./../const/constProposalStatus');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;

var dbPlayerFeedback = {

    /**
     * Create a new player feedback
     * @param {json} data - The data of the player feedback. Refer to playerFeedback schema.
     */
    createPlayerFeedback: function (playerFeedbackData) {
        //increase player feedback count
        var deferred = Q.defer();
        var playerFeedback = new dbconfig.collection_playerFeedback(playerFeedbackData);
        var feedbackProm = playerFeedback.save();

        let noMoreFeedback = playerFeedbackData.result == constPlayerFeedbackResult.LAST_CALL ? true : false;
        var playerProm = dbconfig.collection_players.findOneAndUpdate(
            {_id: playerFeedbackData.playerId, platform: playerFeedbackData.platform},
            {$inc: {feedbackTimes: 1}, lastFeedbackTime: playerFeedbackData.createTime, noMoreFeedback: noMoreFeedback}
        );

        Q.all([feedbackProm, playerProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    deferred.resolve(data[0]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create player feedback."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating player feedback.", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Get all player Feedbacks information  by  playerId  or _id
     * @param {String} query - Query string
     */
    getPlayerFeedbacks: function (query) {
        return dbconfig.collection_playerFeedback.find(query).sort({createTime: 1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    getAllPlayerFeedbacks: function (query, admin, cs, player, index, limit, sortCol) {
        var adminArr = [];
        var playerArr = [];
        var returnedData = [];
        var playerIdArr = [];
        var total = 0;
        const endTime = query.endTime ? new Date(query.endTime) : new Date();
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {};

        function getTopUpCountWithinPeriod(feedback) {
            return dbconfig.collection_playerTopUpRecord.aggregate([
                {
                    $match: {
                        playerId: feedback.playerId._id,
                        platformId: feedback.platform,
                        createTime: {$gte: feedback.createTime, $lt: endTime}
                    }
                },
                {
                    $group: {
                        _id: "$playerId",
                        topupTimes: {$sum: 1},
                        amount: {$sum: "$amount"}
                    }
                }
            ]).then(
                res => {
                    return {topup: res, time: feedback.createTime}
                }
            );
        }

        if (query.startTime && query.endTime) {
            query.createTime = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
            delete  query.startTime;
            delete  query.endTime;
        }

        let playerProm;
        if (player) {
            playerProm = dbconfig.collection_players.find({name: {$regex: ".*" + player + ".*"}}).lean();
        } else {
            playerProm = [];
        }

        return Promise.all([playerProm]).then(
            data => {
                if (data && data[0]) {
                    data[0].map(item => {
                        playerArr.push(item._id);
                    });
                }

                return dbconfig.collection_admin.find({adminName: {$regex: ".*" + cs + ".*"}}).lean();
            }
        ).then(
            data => {
                data.map(item => {
                    adminArr.push(item._id);
                });
                if (playerArr.length > 0) {
                    query.playerId = {$in: playerArr};
                } else if (playerArr.length == 0 && player) {
                    return [];
                }
                if (adminArr.length > 0) {
                    query.adminId = {$in: adminArr};
                } else if (adminArr.length == 0 && cs) {
                    return [];
                }

                if (query && query.platform && typeof query.platform === "string") {
                    query.platform = new mongoose.mongo.ObjectId(query.platform);
                }

                var a = dbconfig.collection_playerFeedback
                    .find(query)
                    .populate({path: "playerId", model: dbconfig.collection_players})
                    .populate({path: "adminId", model: dbconfig.collection_admin}).lean();
                var b = dbconfig.collection_playerFeedback
                    .find(query).count();
                return Q.all([a, b]);
            }
        ).then(
            data => {
                returnedData = Object.assign([], data[0]);
                total = data[1];
                var proms = [];
                returnedData.forEach(
                    feedback => {
                        // if (feedback.result == constPlayerFeedbackResult.NORMAL) {
                        //     proms.push(
                        //         getTopupCountWithinPeriod(feedback)
                        //     )
                        // } else {
                        //     proms.push(Q.resolve({}));
                        // }

                        proms.push(getTopUpCountWithinPeriod(feedback));
                    }
                );
                return Q.all(proms);
            }
        ).then(
            data => {
                var objPlayerToTopupTimes = {};
                data.forEach(item => {
                    if (item && item.topup && item.topup[0]) {
                        //use playerId and timestamp as the key
                        objPlayerToTopupTimes[item.topup[0]._id + new Date(item.time).getTime()] = item.topup[0];
                    }
                });
                var key = Object.keys(sortCol)[0];
                var val = sortCol[key];

                var finalData = returnedData.map(item => {
                    var newObj = Object.assign({}, item);
                    let keyStr = newObj.playerId._id + new Date(newObj.createTime).getTime();
                    newObj.topupTimes = objPlayerToTopupTimes[keyStr] ? objPlayerToTopupTimes[keyStr].topupTimes : 0;
                    newObj.amount = objPlayerToTopupTimes[keyStr] ? objPlayerToTopupTimes[keyStr].amount : 0;
                    return newObj;
                }).sort((a, b) => {
                    var test = 0;
                    if (a[key] > b[key]) {
                        test = 1
                    }
                    if (a[key] < b[key]) {
                        test = -1
                    }
                    return test * val;
                });
                return {data: finalData.slice(index, index + limit), size: total};
            }
        );
    },

    getPlayerFeedbackReport: function (query, index, limit, sortCol) {

        sortCol = sortCol || {createTime: -1};
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        if (query.startTime && query.endTime) {
            query.createTime = {$gte: query.startTime, $lt: query.endTime};
            delete  query.startTime;
            delete  query.endTime;
        }
        return Q.resolve().then(data => {
            if (query.playerName) {
                return dbconfig.collection_players.findOne({name: query.playerName, platform: query.platform}).then(
                    player => {
                        if (player) {
                            query.playerId = player._id;
                            query.platform = query.platform;
                            delete  query.playerName;
                            return query;
                        } else {
                            return {unknown: false}
                        }
                    }
                )
            } else {
                return query;
            }
        }).then(queryData => {
            var a = dbconfig.collection_playerFeedback.find(queryData)
                .sort(sortCol).skip(index).limit(limit)
                .populate({path: "playerId", model: dbconfig.collection_players})
                .populate({path: "adminId", model: dbconfig.collection_admin}).exec();
            var b = dbconfig.collection_playerFeedback.find(queryData).count();
            return Q.all([a, b]);
        }).then(
            data => {
                return {data: data[0], size: data[1]}
            }
        )
    },

    getPlayerFeedbackReportAdvance: function (platform, query, index, limit, sortCol) {
        limit = limit ? limit : 20;
        index = index ? index : 0;
        query = query ? query : {};

        let startDate = new Date(query.start);
        let endDate = new Date(query.end);
        let result = [];

        let matchObjFeedback = {
            platform: platform,
            createTime: {$gte: startDate, $lt: endDate}
        };
        if(query.result) {
            matchObjFeedback.result = query.result;
        }
        if(query.topic) {
            matchObjFeedback.topic = query.topic;
        }

        switch (query.playerType) {
            case 'Test Player':
                query.isRealPlayer = false;
                break;
            case 'Real Player (all)':
                query.isRealPlayer = true;
                break;
            case 'Real Player (Individual)':
                query.isRealPlayer = true;
                query.partner = null;
                break;
            case 'Real Player (Under Partner)':
                query.isRealPlayer = true;
                query.partner = {$ne: null};
        }
        if("playerType" in query) {
            delete query.playerType;
        }

        let stream = dbconfig.collection_playerFeedback.aggregate([
            {
                $match: matchObjFeedback
            }
        ]).cursor({batchSize: 100}).allowDiskUse(true).exec();

        let balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            return Q(
                balancer.processStream(
                    {
                        stream: stream,
                        batchSize: constSystemParam.BATCH_SIZE,
                        makeRequest: function (feedbackIdObjs, request) {
                            request("player", "getConsumptionDetailOfPlayers", {
                                platformId: platform,
                                startTime: query.start,
                                endTime: moment(query.start).add(query.days, "day"),
                                query: query,
                                playerObjIds: feedbackIdObjs.map(function (feedbackIdObj) {
                                    return feedbackIdObj._id;
                                }),
                                option: {
                                    isFeedback: true
                                }
                            });
                        },
                        processResponse: function (record) {
                            result = result.concat(record.data);
                        }
                    }
                )
            );
        }).then(
            () => {
                // handle index limit sortcol here
                if (Object.keys(sortCol).length > 0) {
                    result.sort(function (a, b) {
                        if (a[Object.keys(sortCol)[0]] > b[Object.keys(sortCol)[0]]) {
                            return 1 * sortCol[Object.keys(sortCol)[0]];
                        } else {
                            return -1 * sortCol[Object.keys(sortCol)[0]];
                        }
                    });
                }
                else {
                    result.sort(function (a, b) {
                        if (a._id > b._id) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                }


                let outputResult = [];
                for (let i = 0, len = limit; i < len; i++) {
                    result[index + i] ? outputResult.push(result[index + i]) : null;
                }

                // Output filter admin (which is CS officer)
                outputResult = query.admins && query.admins.length > 0 ?
                    outputResult.filter(e => {
                        if(e.feedback && e.feedback.adminId && e.feedback.adminId._id) {
                            return query.admins.indexOf(e.feedback.adminId._id) >= 0;
                        }
                        else {
                            return false;
                        }
                    }) :
                    outputResult;

                return {size: outputResult.length, data: outputResult};
            }
        );
    },

    // getPlayerFeedbackQuery: function (query, index) {
    //     index = index || 0;
    //     console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",query);
    //     let match = {};
    //
    //     if(query.platform) {
    //         match.platform = ObjectId(query.platform);
    //         delete query.platform;
    //     }
    //     if(query.credibilityRemarks) {
    //         match.credibilityRemarks = {};
    //         query.credibilityRemarks.forEach(
    //             function(value, key){
    //                 query.credibilityRemarks[key] = ObjectId(value);
    //         });
    //         match.credibilityRemarks['$in'] = query.credibilityRemarks;
    //         delete query.credibilityRemarks;
    //     }
    //     if(query.lastAccessTimeFrom || query.lastAccessTimeTill) {
    //         match.lastAccessTime = {};
    //     }
    //     if(query.lastAccessTimeFrom) {
    //         match.lastAccessTime['$lt'] = new Date(query.lastAccessTimeFrom);
    //         delete query.lastAccessTimeFrom;
    //     }
    //     if(query.lastAccessTimeTill) {
    //         match.lastAccessTime['$gte'] = new Date(query.lastAccessTimeTill);
    //         delete query.lastAccessTimeTill;
    //     }
    //     if(query.lastFeedbackTimeFrom || query.lastFeedbackTimeTill) {
    //         match.lastFeedbackTime = {};
    //     }
    //     if(query.lastFeedbackTimeFrom) {
    //         match.lastFeedbackTime['$lt'] = new Date(query.lastFeedbackTimeFrom);
    //         delete query.lastFeedbackTimeFrom;
    //     }
    //     if(query.lastFeedbackTimeTill) {
    //         match.lastFeedbackTime['$gte'] = new Date(query.lastFeedbackTimeTill);
    //         delete query.lastFeedbackTimeTill;
    //     }
    //     if(query.gameProviderPlayed) {
    //         match.gameProviderPlayed = {};
    //         query.gameProviderPlayed.forEach(
    //             function(value, key){
    //                 query.gameProviderPlayed[key] = ObjectId(value);
    //             });
    //         match.gameProviderPlayed['$in'] = query.gameProviderPlayed;
    //         delete query.gameProviderPlayed;
    //     }
    //     query.noMoreFeedback = {$ne: true};
    //     match = Object.assign(match,query);
    //     console.log("!@#$%^&*()_)(*&^%$#@!",match);
    //
    //     let a = dbconfig.collection_players.aggregate([
    //         {
    //             $match: match
    //         },
    //         {
    //             $skip: index
    //         },
    //         {
    //             $limit: 1
    //         },
    //         {
    //             $lookup: {
    //                 from: "playerCredibilityUpdateLog",
    //                 localField: "_id",
    //                 foreignField: "player",
    //                 as: "playerCredibilityUpdateLog"
    //             }
    //         }
    //     ]).exec(function(err,player) {
    //         console.error("!@#$%^&*()_)(*&^%$#@!",err);
    //         console.log("!@#$%^&*()_)(*&^%$#@!",player);
    //         dbconfig.collection_playerLevel.populate(player, {path: "_id"}), function(err, result) {
    //             return result;
    //         }
    //     });
    //         // find(query).skip(index).limit(1)
    //         // .populate({path: "partner", model: dbconfig.collection_partner})
    //         // .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
    //
    //     let b = dbconfig.collection_players.find(match).count();
    //     return Q.all([a, b]).then(data => {
    //         return {
    //             data: data[0] ? data[0][0] : {},
    //             index: index,
    //             total: data[1]
    //         }
    //     });
    // },

    getSinglePlayerFeedbackQuery: function (query, index) {
        index = index || 0;
        // query.noMoreFeedback = {$ne: true};
        switch (query.playerType) {
            case 'Test Player':
                query.isRealPlayer = false;
                break;
            case 'Real Player (all)':
                query.isRealPlayer = true;
                break;
            case 'Real Player (Individual)':
                query.isRealPlayer = true;
                query.partner = null;
                break;
            case 'Real Player (Under Partner)':
                query.isRealPlayer = true;
                query.partner = {$ne: null};
        }
        if ("playerType" in query) {
            delete query.playerType;
        }
        let playerResult;
        let player = dbconfig.collection_players.find(query).skip(index).limit(1)
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean().then(
                player => {
                    if(player && player.length > 0) {
                        playerResult = player[0];
                        return dbPlayerInfo.getConsumptionDetailOfPlayers(player[0].platform, player[0].registrationTime, new Date().toISOString(), {}, [player[0]._id]);
                    }
                    else {
                        return null;
                    }
                }
            ).then(
                consumptionDetail => {
                    if(consumptionDetail) {
                        return Object.assign(playerResult, {consumptionDetail:consumptionDetail[0]});
                    } else {
                        return playerResult;
                    }
                }
            );
        let count = dbconfig.collection_players.count(query);

        return Q.all([player, count]).then(data => {
            return {
                data: data[0] ? data[0] : {},
                index: index,
                total: data[1]
            }
        });
    },

    getPlayerFeedbackQuery: function (query, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        // query.noMoreFeedback = {$ne: true};
        switch (query.playerType) {
            case 'Test Player':
                query.isRealPlayer = false;
                break;
            case 'Real Player (all)':
                query.isRealPlayer = true;
                break;
            case 'Real Player (Individual)':
                query.isRealPlayer = true;
                query.partner = null;
                break;
            case 'Real Player (Under Partner)':
                query.isRealPlayer = true;
                query.partner = {$ne: null};
        }
        if ("playerType" in query) {
            delete query.playerType;
        }
        let players = dbconfig.collection_players.find(query).skip(index).limit(limit)
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .sort(sortCol).lean();
        let count = dbconfig.collection_players.find(query).count();
        return Q.all([players, count]).then(data => {
            return {
                data: data[0] ? data[0] : {},
                index: index,
                total: data[1]
            }
        });
    },

    /*
     * get the latest 5 feedback record for player
     * @param {objectId} playerId
     */
    getPlayerLastNFeedbackRecord: function (playerId, limit) {
        lilmit = limit || 5;
        return dbconfig.collection_playerFeedback.find({playerId: playerId}).sort({createTime: -1}).limit(limit)
            .populate({path: "adminId", model: dbconfig.collection_admin}).exec();
    },

    getExportedData: function (proposalId, ipAddress) {
        let allowedIP = [
            "122.146.88.32",
        ];

        if (!allowedIP.includes(ipAddress)) {
            return Promise.reject({
                code: constServerCode.INVALID_API_USER,
                message: "IP not authorized"
            })
        }

        return dbconfig.collection_proposal.findOne({proposalId: proposalId})
            .populate({path: "type", model: dbconfig.collection_proposalType})
            .lean().then(
            proposal => {
                if (!proposal || !proposal.type || !proposal.type.name !== constProposalType.BULK_EXPORT_PLAYERS_DATA || proposal.status === constProposalStatus.PENDING) {
                    return Promise.reject({
                        code: constServerCode.INVALID_PROPOSAL,
                        message: "Cannot find proposal"
                    });
                }

                if (proposal.expirationTime < new Date()) {
                    return Promise.reject({
                        code: constServerCode.SESSION_EXPIRED,
                        message: "Current request is expired"
                    });
                }

                if (proposal.status !== constProposalStatus.APPROVED) {
                    return Promise.reject({
                        code: constServerCode.SESSION_EXPIRED,
                        message: "Proposal already used"
                    });
                }

                return dbconfig.collection_proposal.findOneAndUpdate({_id: proposal._id, createTime: proposal.createTime}, {$set: {status: constProposalStatus.SUCCESS}}, {new: true}).lean();
            }
        ).then(
            proposal => {
                if (!proposal) {
                    return Promise.reject({
                        code: constServerCode.CONCURRENT_DETECTED,
                        message: "Concurrent issue detected"
                    });
                }

                return searchPlayerFromExportProposal(proposal);
            }
        )
    }
};

function applyExtractPlayerProposal (title, playerType, playerLevelObjId, playerLevelName, credibilityRemarkObjIdArray, credibilityRemarkNameArray,
                                     lastAccessTimeFrom, lastAccessTimeTo, lastAccessTimeRangeString,
                                     lastFeedbackTimeBefore, depositCountOperator, depositCountFormal, depositCountLater,
                                     playerValueOperator, playerValueFormal, playerValueLater, consumptionTimesOperator,
                                     consumptionTimesFormal, consumptionTimesLater, withdrawalTimesOperator, withdrawalTimesFormal,
                                     withdrawalTimesLater, topUpSumOperator, topUpSumFormal, topUpSumLater, gameProviderIdArray,
                                     gameProviderNameArray, isNewSystem, registrationTimeFrom, registrationTimeTo, platformObjId,
                                     adminInfo, targetExportPlatformObjId, targetExportPlatformName, expirationTime) {
    title = title || "";
    return dbconfig.collection_proposalType.findOne({name: constProposalType.BULK_EXPORT_PLAYERS_DATA, platformId: platformObjId}).lean().then(
        proposalType => {
            if (!proposalType) {
                return Promise.reject({
                    message: "Error in getting proposal type"
                });
            }


            let proposalData = {
                type: proposalType._id,
                creator: adminInfo ? adminInfo : {},
                data: {
                    title,
                    playerType,
                    playerLevel: playerLevelObjId,
                    playerLevelName,
                    credibilityRemarks: credibilityRemarkObjIdArray,
                    credibilityRemarkNames: credibilityRemarkNameArray,
                    lastAccessTimeFrom,
                    lastAccessTimeTo,
                    lastAccessTimeRangeString,
                    lastFeedbackTimeBefore,
                    depositCountOperator,
                    depositCountFormal,
                    depositCountLater,
                    consumptionTimesOperator,
                    consumptionTimesFormal,
                    consumptionTimesLater,
                    withdrawalTimesOperator,
                    withdrawalTimesFormal,
                    withdrawalTimesLater,
                    topUpSumOperator,
                    topUpSumFormal,
                    topUpSumLater,
                    gameProviders: gameProviderIdArray,
                    gameProviderNames: gameProviderNameArray,
                    isNewSystem,
                    registrationTimeTo,
                    platformObjId,
                    targetExportPlatform: targetExportPlatformObjId,
                    targetExportPlatformName,
                    remark: ""
                },
                expirationTime,
                entryType: constProposalEntryType.ADMIN,
                userType: constProposalUserType.SYSTEM_USERS
            };

            return dbProposal.createProposalWithTypeId(proposalType._id, proposalData);
        }
    );
}

function searchPlayerFromExportProposal (proposal) {
    // todo :: add implementation
}

module.exports = dbPlayerFeedback;