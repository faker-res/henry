var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var moment = require('moment-timezone');
var constSystemParam = require('../const/constSystemParam');
var mongoose = require('mongoose');
const dbutility = require('./../modules/dbutility');
const dbProposal = require('./../db_modules/dbProposal');
const constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');
const constProposalEntryType = require('./../const/constProposalEntryType');
const constProposalUserType = require('./../const/constProposalUserType');
const constProposalType = require ('./../const/constProposalType');
const constServerCode = require ('./../const/constServerCode');
const constProposalStatus = require ('./../const/constProposalStatus');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const errorUtils = require("../modules/errorUtils.js");
const rsaCrypto = require("../modules/rsaCrypto");
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
            {$inc: {feedbackTimes: 1}, lastFeedbackTime: playerFeedbackData.createTime, lastFeedbackTopic: playerFeedbackData.topic, noMoreFeedback: noMoreFeedback}
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

    bulkCreatePlayerFeedback: (playersFeedbackData) => {
        let playerIds = playersFeedbackData.playerId;
        let proms = [];

        playerIds.map(playerId => {
            let clonedPlayersFeedbackData = JSON.parse(JSON.stringify(playersFeedbackData));
            clonedPlayersFeedbackData.playerId = playerId;

            let prom = dbPlayerFeedback.createPlayerFeedback(clonedPlayersFeedbackData);
            proms.push(prom);
        });

        return Promise.all(proms);
    },

    /**
     * Get all player Feedbacks information  by  playerId  or _id
     * @param {String} query - Query string
     */
    getPlayerFeedbacks: function (query) {
        return dbconfig.collection_playerFeedback.find(query).sort({createTime: 1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    getAllPlayerFeedbacks: function (query, admin, player, index, limit, sortCol, topUpTimesOperator, topUpTimesValue, topUpTimesValueTwo, platformList) {
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
            ]).read("secondaryPreferred").then(
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

                // return dbconfig.collection_admin.find({adminName: {$regex: ".*" + cs + ".*"}}).lean();
                return dbconfig.collection_admin.find({adminName: admin}).lean();
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
                } else if (adminArr.length == 0 && admin) {
                    return [];
                }

                // if (query && query.platform && typeof query.platform === "string") {
                //     query.platform = new mongoose.mongo.ObjectId(query.platform);
                // }

                if (platformList && platformList.length > 0) {
                    query.platform = {$in: platformList};
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

                if (topUpTimesValue) {
                    switch (topUpTimesOperator) {
                        case '<=':
                            finalData = finalData.filter(p => {return p.topupTimes <= topUpTimesValue});
                            total= finalData.length;
                            break;
                        case '>=':
                            finalData = finalData.filter(p => {return p.topupTimes >= topUpTimesValue});
                            total= finalData.length;
                            break;
                        case '=':
                            finalData = finalData.filter(p => {return p.topupTimes == topUpTimesValue});
                            total= finalData.length;
                            break;
                        case 'range':
                            finalData = finalData.filter(p => {return p.topupTimes >= topUpTimesValue && p.topupTimes <= topUpTimesValueTwo});
                            total= finalData.length;
                            break;
                    }
                }

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

        if (query.admins && query.admins.length) {
            query.admins = query.admins.map(e => ObjectId(e));
            console.log('query.admins', query.admins);
            matchObjFeedback.adminId = {$in: query.admins}
        }

        let stream = dbconfig.collection_playerFeedback.aggregate([
            {
                $match: matchObjFeedback
            },
            {
                $group: {_id: '$_id'}
            }
        ]).cursor({batchSize: 500}).allowDiskUse(true).exec();

        let balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            return Q(
                balancer.processStream(
                    {
                        stream: stream,
                        batchSize: 50,
                        makeRequest: function (feedbackIdObjs, request) {
                            console.log('make request');
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
                            console.log('request result', record);
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

        if (query.csOfficer && query.csOfficer.length) {
            let noneCSOfficerQuery = {}, csOfficerArr = [];

            query.csOfficer.forEach(item => {
                if (item == "") {
                    noneCSOfficerQuery = {csOfficer: {$exists: false}};
                } else {
                    csOfficerArr.push(ObjectId(item));
                }
            });

            if (Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0 && csOfficerArr.length > 0) {
                query.$or = [noneCSOfficerQuery, {csOfficer: {$in: csOfficerArr}}];
                delete query.csOfficer;

            } else if ((Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0) && !csOfficerArr.length) {
                query.csOfficer = {$exists: false};

            } else if (csOfficerArr.length > 0 && !Object.keys(noneCSOfficerQuery).length){
                query.csOfficer = {$in: csOfficerArr};

            }
        }

        let playerResult;
        let player = dbconfig.collection_players.find(query).skip(index).limit(1)
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).sort({lastAccessTime: -1}).lean().then(
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

        if (query.csOfficer && query.csOfficer.length) {
            let noneCSOfficerQuery = {}, csOfficerArr = [];

            query.csOfficer.forEach(item => {
                if (item == "") {
                    noneCSOfficerQuery = {csOfficer: {$exists: false}};
                } else {
                    csOfficerArr.push(ObjectId(item));
                }
            });

            if (Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0 && csOfficerArr.length > 0) {
                query.$or = [noneCSOfficerQuery, {csOfficer: {$in: csOfficerArr}}];
                delete query.csOfficer;

            } else if ((Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0) && !csOfficerArr.length) {
                query.csOfficer = {$exists: false};

            } else if (csOfficerArr.length > 0 && !Object.keys(noneCSOfficerQuery).length){
                query.csOfficer = {$in: csOfficerArr};

            }
        }
        let players = dbconfig.collection_players.find(query).skip(index).limit(limit)
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .sort(sortCol).lean();
        let count = dbconfig.collection_players.find(query, { _id: 1}).lean();
        return Q.all([players, count]).then(data => {
            let total = data[1].length ? data[1].length : 0;
            if(data[0] && data[0].length){
                console.log('=CallOutMission= callout query result', data[0].length);
            }

            return {
                data: data[0] ? data[0] : {},
                index: index,
                total: total
            }
        });
    },

    createExportPlayerProposal: function (exportData) {
        applyExtractPlayerProposal(exportData.title, exportData.playerType, exportData.playerLevelObjId, exportData.playerLevelName, exportData.credibilityRemarkObjIdArray,
            exportData.credibilityRemarkNameArray, exportData.credibilityRemarkFilterObjIdArray, exportData.credibilityRemarkFilterNameArray, exportData.callPermission , exportData.lastAccessTimeFrom, exportData.lastAccessTimeTo, exportData.lastAccessTimeRangeString,
            exportData.lastFeedbackTimeBefore, exportData.depositCountOperator, exportData.depositCountFormal, exportData.depositCountLater, exportData.bonusAmountOperator,
            exportData.bonusAmountFormal, exportData.bonusAmountLater, exportData.playerValueOperator, exportData.playerValueFormal, exportData.playerValueLater,
            exportData.consumptionTimesOperator, exportData.consumptionTimesFormal, exportData.consumptionTimesLater, exportData.withdrawalTimesOperator,
            exportData.withdrawalTimesFormal, exportData.withdrawalTimesLater, exportData.topUpSumOperator, exportData.topUpSumFormal, exportData.topUpSumLater,
            exportData.gameProviderIdArray, exportData.gameProviderNameArray, exportData.isNewSystem, exportData.registrationTimeFrom, exportData.registrationTimeTo,
            exportData.platformObjId, exportData.adminInfo, exportData.targetExportPlatformObjId, exportData.targetExportPlatformName, exportData.expirationTime, exportData.dataCount);
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

    getExportedData: function (proposalId) {
        let proposal = {};
        let players, originPlatform, targetPlatform;

        return dbconfig.collection_proposal.findOne({proposalId: proposalId})
            .populate({path: "type", model: dbconfig.collection_proposalType})
            .lean().then(
                proposal => {
                    if (!proposal || !proposal.type || proposal.type.name !== constProposalType.BULK_EXPORT_PLAYERS_DATA) {
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


                    return dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposal._id,
                        createTime: proposal.createTime
                    }, {$set: {status: constProposalStatus.SUCCESS}}, {new: true}).lean();
                }
            ).then(
                proposalRecord => {
                    if (!proposalRecord) {
                        return Promise.reject({
                            code: constServerCode.CONCURRENT_DETECTED,
                            message: "Concurrent issue detected"
                        });
                    }

                    proposal = proposalRecord;

                    let originPlatformProm = Promise.resolve();
                    if (proposal.data && proposal.data.platformId) {
                        originPlatformProm = dbconfig.collection_platform.findOne({_id: proposal.data.platformId}, {platformId: 1}).lean();
                    }

                    let targetPlatformProm = Promise.resolve();
                    if (proposal.data && proposal.data.targetExportPlatform) {
                        targetPlatformProm = dbconfig.collection_platform.findOne({_id: proposal.data.targetExportPlatform}, {platformId: 1}).lean();
                    }

                    let playersProm = searchPlayerFromExportProposal(proposal);

                    return Promise.all([playersProm, originPlatformProm, targetPlatformProm]);
                }
            ).then(
                data => {
                    players = data[0];
                    originPlatform = data[1];
                    targetPlatform = data[2];

                    players = players || [];

                    let proms = [];

                    // use findOne to search again to get non encoded phone number
                    players.map(player => {
                        let prom = dbconfig.collection_players.findOne({_id: player._id}).lean();
                        proms.push(prom);
                    });

                    return Promise.all(proms);
                }
            ).then(
                playersData => {
                    players = playersData;
                    players = players || [];

                    let targetPlatformId = targetPlatform && targetPlatform._id;

                    players.map(player => {
                        let playerData = {
                            playerName: player.name,
                            realName: player.realName,
                            gender: player.gender? "Male": "Female",
                            DOB: player.DOB,
                            encodedPhoneNumber: dbutility.encodePhoneNum(dbutility.decryptPhoneNumber(player.phoneNumber)),
                            phoneNumber: rsaCrypto.encrypt(player.phoneNumber),
                            wechat: player.wechat,
                            qq: player.qq,
                            email: player.email,
                            remark: player.remark,
                            sourcePlatform: player.platform,
                            targetPlatform: targetPlatformId,
                            topUpTimes: player.topUpTimes,
                            lastAccessTime: player.lastAccessTime,
                        };

                        dbconfig.collection_feedbackPhoneTrade(playerData).save().catch(errorUtils.reportError);
                    });

                }
            )
    }
};

function applyExtractPlayerProposal (title, playerType, playerLevelObjId, playerLevelName, credibilityRemarkObjIdArray, credibilityRemarkNameArray,
                                     credibilityRemarkFilterObjIdArray, credibilityRemarkFilterNameArray, callPermission,
                                     lastAccessTimeFrom, lastAccessTimeTo, lastAccessTimeRangeString,
                                     lastFeedbackTimeBefore, depositCountOperator, depositCountFormal, depositCountLater,
                                     bonusAmountOperator, bonusAmountFormal, bonusAmountLater,
                                     playerValueOperator, playerValueFormal, playerValueLater, consumptionTimesOperator,
                                     consumptionTimesFormal, consumptionTimesLater, withdrawalTimesOperator, withdrawalTimesFormal,
                                     withdrawalTimesLater, topUpSumOperator, topUpSumFormal, topUpSumLater, gameProviderIdArray,
                                     gameProviderNameArray, isNewSystem, registrationTimeFrom, registrationTimeTo, platformObjId,
                                     adminInfo, targetExportPlatformObjId, targetExportPlatformName, expirationTime, exportCount) {
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
                    credibilityRemarksFilter: credibilityRemarkFilterObjIdArray,
                    credibilityRemarkFilterNames: credibilityRemarkFilterNameArray,
                    callPermission,
                    lastAccessTimeFrom,
                    lastAccessTimeTo,
                    lastAccessTimeRangeString,
                    lastFeedbackTimeBefore,
                    depositCountOperator,
                    depositCountFormal,
                    depositCountLater,
                    bonusAmountOperator,
                    bonusAmountFormal,
                    bonusAmountLater,
                    playerValueOperator,
                    playerValueFormal,
                    playerValueLater,
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
                    registrationTimeFrom,
                    registrationTimeTo,
                    platformId: platformObjId,
                    targetExportPlatform: targetExportPlatformObjId,
                    targetExportPlatformName,
                    exportCount,
                    remark: ""
                },
                expirationTime: new Date(expirationTime),
                entryType: constProposalEntryType.ADMIN,
                userType: constProposalUserType.SYSTEM_USERS
            };

            return dbProposal.createProposalWithTypeId(proposalType._id, proposalData);
        }
    );
}

function searchPlayerFromExportProposal (proposal) {
    let query = {};

    if (!(proposal && proposal.data)) {
        return;
    }

    let proposalData = proposal.data;

    if (proposalData.platformId) {
        query.platform = proposalData.platformId;
    }

    switch (proposalData.playerType) {
        case 'Test Player':
            query.isRealPlayer = false;
            break;
        case 'Real Player (Individual)':
            query.isRealPlayer = true;
            query.partner = null;
            break;
        case 'Real Player (Under Partner)':
            query.isRealPlayer = true;
            query.partner = {$ne: null};
            break;
        case 'Real Player (all)':
        default:
            query.isRealPlayer = true;
            break;
    }

    if (proposalData.playerLevel && String(proposalData.playerLevel).length === 24) {
        query.playerLevel = proposalData.playerLevel;
    }

    if (proposalData.credibilityRemarks && proposalData.credibilityRemarks.length > 0) {
        let tempArr = [];
        if (proposalData.credibilityRemarks.includes("")) {
            proposalData.credibilityRemarks.forEach(remark => {
                if (remark != "") {
                    tempArr.push(remark);
                }
            });
            query.$or = [{credibilityRemarks: []}, {credibilityRemarks: {$exists: false}}, {credibilityRemarks: {$in: tempArr}}];
        } else {
            query.credibilityRemarks = {$in: proposalData.credibilityRemarks};
        }
    }

    if (proposalData.credibilityRemarksFilter && proposalData.credibilityRemarksFilter.length > 0) {
        let tempArr = [];
        if (proposalData.credibilityRemarksFilter.includes("")) {
            proposalData.credibilityRemarksFilter.forEach(remark => {
                if (remark != "") {
                    tempArr.push(remark);
                }
            });
            query.$and = [{credibilityRemarks: {$ne: []}}, {credibilityRemarks: {$exists: true}}, {credibilityRemarks: {$nin: tempArr}}];
        } else {
            if (query.credibilityRemarks && query.credibilityRemarks.$in) {
                query.$and = [{credibilityRemarks: {$nin: proposalData.credibilityRemarksFilter}}];
            }
            else {
                query.credibilityRemarks = {$nin: proposalData.credibilityRemarksFilter};
            }
        }
    }

    if (proposalData.callPermission == 'true') {
        query['permission.phoneCallFeedback'] = {$ne: false};
    } else if (proposalData.callPermission == 'false') {
        query['permission.phoneCallFeedback'] = false;
    }

    if (proposalData.lastAccessTimeFrom || proposalData.lastAccessTimeTo) {
        query.lastAccessTime = {};
        if (proposalData.lastAccessTimeFrom) {
            query.lastAccessTime.$gte = proposalData.lastAccessTimeFrom;
        }

        if (proposalData.lastAccessTimeTo) {
            query.lastAccessTime.$lte = proposalData.lastAccessTimeTo;
        }
    }

    if (proposalData.registrationTimeFrom || proposalData.registrationTimeTo) {
        query.registrationTime = {};
        if (proposalData.registrationTimeFrom) {
            query.registrationTime.$gte = proposalData.registrationTimeFrom;
        }

        if (proposalData.registrationTimeTo) {
            query.registrationTime.$lte = proposalData.registrationTimeTo;
        }
    }

    if (proposalData.lastFeedbackTimeBefore) {
        let lastFeedbackTimeExist = {
            lastFeedbackTime: null
        };
        let lastFeedbackTime = {
            lastFeedbackTime: {
                $lt: proposalData.lastFeedbackTimeBefore
            }
        };

        let orClause = [];

        orClause.push(lastFeedbackTimeExist);
        orClause.push(lastFeedbackTime);

        if (query.hasOwnProperty("$or")) {
            if (query.$and) {
                query.$and.push({$or: query.$or});
                query.$and.push({$or: orClause});
            } else {
                query.$and = [{$or: query.$or}, {$or: orClause}];
            }
            delete query.$or;
        } else {
            query["$or"] = orClause;
        }
    }

    if (proposalData.depositCountOperator && proposalData.depositCountFormal != null) {
        query.topUpTimes = getMongoQueryForNumber(proposalData.depositCountOperator, proposalData.depositCountFormal, proposalData.depositCountLater);
    }

    if (proposalData.playerValueOperator && proposalData.playerValueFormal != null) {
        query.valueScore = getMongoQueryForNumber(proposalData.playerValueOperator, proposalData.playerValueFormal, proposalData.playerValueLater);
    }

    if (proposalData.consumptionTimesOperator && proposalData.consumptionTimesFormal != null) {
        query.consumptionTimes = getMongoQueryForNumber(proposalData.consumptionTimesOperator, proposalData.consumptionTimesFormal, proposalData.consumptionTimesLater);
    }

    if (proposalData.bonusAmountOperator && proposalData.bonusAmountFormal != null) {
        query.bonusAmountSum = getMongoQueryForNumber(proposalData.bonusAmountOperator, proposalData.bonusAmountFormal, proposalData.bonusAmountLater);
    }

    if (proposalData.withdrawalTimesOperator && proposalData.withdrawalTimesFormal != null) {
        query.withdrawalTimes = getMongoQueryForNumber(proposalData.withdrawalTimesOperator, proposalData.withdrawalTimesFormal, proposalData.withdrawalTimesLater);
    }

    if (proposalData.topUpSumOperator && proposalData.topUpSumFormal != null) {
        query.topUpSum = getMongoQueryForNumber(proposalData.topUpSumOperator, proposalData.topUpSumFormal, proposalData.topUpSumLater);
    }

    if (proposalData.gameProviders && proposalData.gameProviders.length > 0) {
        query.gameProviderPlayed = {$in: proposalData.gameProviders};
    }

    if (proposalData.isNewSystem === "old") {
        query.isNewSystem = {$ne: true};
    } else if (proposalData.isNewSystem === "new") {
        query.isNewSystem = true;
    }

    return dbconfig.collection_players.find(query, {similarPlayers: 0, userAgent: 0, games: 0, favoriteGames: 0, loginIps:0})
        .populate({path: 'credibilityRemarks', model: dbconfig.collection_playerCredibilityRemark})
        .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel})
        .populate({path: 'gameProviderPlayed', model: dbconfig.collection_gameProvider})
        .lean();
}


function getMongoQueryForNumber (operator, formalValue, laterValue) {
    switch (operator) {
        case ">=":
            return {
                $gte: formalValue
            };
        case "=":
            return formalValue;
        case "<=":
            return {
                $lte: formalValue
            };
        case "range":
            if (laterValue != null) {
                return {
                    $lte: laterValue,
                    $gte: formalValue
                };
            }
    }
}

module.exports = dbPlayerFeedback;
