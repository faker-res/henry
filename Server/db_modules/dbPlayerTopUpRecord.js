var dbPlayerTopUpRecordFunc = function () {
};
module.exports = new dbPlayerTopUpRecordFunc();

var Q = require('q');
var dbconfig = require('./../modules/dbproperties');
var dataUtility = require('./../modules/encrypt');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbProposal = require('./../db_modules/dbProposal');
var dbProposalType = require('./../db_modules/dbProposalType');
var constProposalStatus = require('./../const/constProposalStatus');
var constSystemParam = require('./../const/constSystemParam');
var constProposalType = require('./../const/constProposalType');
var constPlayerTopUpType = require('./../const/constPlayerTopUpType');
var constProposalMainType = require('../const/constProposalMainType');
var pmsAPI = require("../externalAPI/pmsAPI.js");
var counterManager = require("../modules/counterManager.js");
const constManualTopupOperationType = require("../const/constManualTopupOperationType");
const constServerCode = require("../const/constServerCode");
var dbUtility = require("../modules/dbutility");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');
var constShardKeys = require('../const/constShardKeys');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var moment = require('moment-timezone');

var dbPlayerTopUpRecord = {
    /**
     * Get top up record in a certain period of time
     * @param {Json} data
     */
    createPlayerTopUpRecord: function (data) {
        var newRecord = new dbconfig.collection_playerTopUpRecord(data);
        return newRecord.save();
    },

    /**
     * Get top up record in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    getRecordForTimeFrame: function (startTime, endTime) {
        return dbconfig.collection_playerTopUpRecord.find(
            {
                createTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).exec();
    },

    /**
     * Get total top up amount of a platform in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    getPlayersTotalTopUpForTimeFrame: function (startTime, endTime, platformId, playerIds) {
        return dbconfig.collection_playerTopUpRecord.aggregate(
            [
                {
                    $match: {
                        platformId: platformId,
                        createTime: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        playerId: {$in: playerIds}
                    }
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId"},
                        amount: {$sum: "$amount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).exec();
    },

    /**
     * Get total top up amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    topupReport: function (query, index, limit, sortObj) {
        // console.log('query', query);
        var queryObj = {
            createTime: {
                $gte: query.startTime ? new Date(query.startTime) : new Date(0),
                $lt: query.endTime ? new Date(query.endTime) : new Date()
            }
        }
        if (query.status && query.status.length > 0) {
            queryObj.status = {$in: query.status};
        }
        return Q.resolve().then(
            () => {
                var str = '';
                if (query && query.mainTopupType == constPlayerTopUpType.ONLINE) {
                    str = constProposalType.PLAYER_TOP_UP;
                    query.topupType ? queryObj['data'] = {'topupType': query.topupType} : '';
                } else if (query && query.mainTopupType == constPlayerTopUpType.ALIPAY) {
                    str = constProposalType.PLAYER_ALIPAY_TOP_UP
                } else if (query && query.mainTopupType == constPlayerTopUpType.MANUAL) {
                    str = constProposalType.PLAYER_MANUAL_TOP_UP;
                    query.depositMethod ? queryObj['data'] = {'depositMethod': query.depositMethod} : '';
                } else {
                    str = {
                        $in: [constProposalType.PLAYER_TOP_UP,
                            constProposalType.PLAYER_ALIPAY_TOP_UP,
                            constProposalType.PLAYER_MANUAL_TOP_UP]
                    };
                    queryObj['$or'] = [];
                    query.topupType ? queryObj['$or'].push({
                        'data.topupType': query.topupType
                    }) : queryObj['$or'].push({
                        'data.topupType': {$exists: true}
                    });
                    query.depositMethod ? queryObj['$or'].push({
                        'data.depositMethod': query.depositMethod
                    }) : queryObj['$or'].push({
                        'data.depositMethod': {$exists: true}
                    });
                    queryObj['$or'].push({
                        $and: [
                            {'data.topupType': {$exists: false}},
                            {'data.depositMethod': {$exists: false}}
                        ]
                    })

                }
                return dbconfig.collection_proposalType.find({platformId: query.platformId, name: str});
            }
        ).then(
            proposalType => {
                var typeIds = proposalType.map(type => {
                    return type._id;
                });
                queryObj.type = {$in: typeIds};
                // console.log('queryObj', JSON.stringify(queryObj, null, 4));
                var a = dbconfig.collection_proposal.find(queryObj).count();
                var b = dbconfig.collection_proposal.find(queryObj).sort(sortObj).skip(index).limit(limit);
                var c = dbconfig.collection_proposal.aggregate({$match: queryObj}, {
                    $group: {
                        _id: null,
                        totalAmount: {$sum: "$data.amount"},
                    }
                });
                return Q.all([a, b, c])
            }
        ).then(
            data => {
                return {data: data[1], size: data[0], total: data[2][0] ? data[2][0].totalAmount : 0};
            }
        )

        // dbProposalType.getProposalTypeByPlatformId(query.platformId).then(data => {
        //     console.log('data', data);
        // });

        // var matchObj = {
        //     createTime: {
        //         $gte: query.startTime ? new Date(query.startTime) : new Date(0),
        //         $lt: query.endTime ? new Date(query.endTime) : new Date()
        //     },
        //     platformId: ObjectId(query.platformId)
        // };
        // sortObj = sortObj || {};
        // index = index || 0;
        // count = Math.min(count, constSystemParam.REPORT_MAX_RECORD_NUM);
        // if (query.type && query.type != 'all') {
        //     matchObj.topUpType = query.type;
        // }
        // if (query.paymentChannel && query.paymentChannel != 'all') {
        //     matchObj.paymentId = query.paymentChannel;
        // }
        // var a = dbconfig.collection_playerTopUpRecord.find(matchObj).count();
        // var b = dbconfig.collection_playerTopUpRecord.find(matchObj).populate({
        //     path: "playerId",
        //     model: dbconfig.collection_players
        // }).sort(sortObj).skip(index).limit(count);
        //
        // var c = dbconfig.collection_playerTopUpRecord.aggregate(
        //     {
        //         $match: matchObj
        //     },
        //     {
        //         $group: {
        //             _id: null,
        //             totalAmount: {$sum: "$amount"},
        //         }
        //     }
        // ).exec();
        // return Q.all([a, b, c]).then(
        //     data => {
        //         return {data: data[1], size: data[0], total: data[2][0] ? data[2][0].totalAmount : 0};
        //     }
        // )
    },

    /**
     * Top up success
     * @param {Json} query
     * @param {Json} update
     */
    playerTopUpSuccess: function (query, queryData, checkSteps, skipVerify) {
        var deferred = Q.defer();
        var topupIntentionObj = {};
        var proposalObj = {};
        var player = {};
        var isValidForTransaction = false;
        dbconfig.collection_proposal.findOne(query)
            .then(
                function (data) {
                    if (data && data.data.playerId && data.data.topUpAmount) {
                        topupIntentionObj = data.data;
                        proposalObj = data;
                        isValidForTransaction = topupIntentionObj.validForTransactionReward;
                        if (!skipVerify && ((topupIntentionObj.topUpAmount != queryData.amount) || (topupIntentionObj.playerId != queryData.playerId))) {
                            deferred.reject({
                                name: "DataError",
                                message: "Proposal property does not match with record."
                            });
                        } else if (data.status == constProposalStatus.SUCCESS || data.status == constProposalStatus.FAIL) {
                            deferred.reject({name: "DataError", message: "Proposal has been processed."});
                        } else if (!checkSteps && !data.noSteps) {
                            return dbProposal.updateProposal({
                                _id: proposalObj._id,
                                createTime: proposalObj.createTime
                            }, {status: constProposalStatus.PENDING}).then(
                                function (data) {
                                    deferred.resolve(data);
                                },
                                function (error) {
                                    deferred.reject({
                                        name: "DBError",
                                        message: "Error updating proposal status",
                                        error: error
                                    });
                                }
                            );
                        }
                        else {
                            return dbconfig.collection_players.findOne({playerId: topupIntentionObj.playerId});
                        }
                    } else {
                        deferred.reject({name: "DataError", message: "Can't find proposal information"});
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Can't find proposal " + query});
                }
            )
            .then(
                function (playerData) {
                    if (playerData) {
                        player = playerData;
                        var sendQuery = {
                            _id: playerData._id
                        };
                        return dbPlayerInfo.playerTopUp(sendQuery, topupIntentionObj.topUpAmount, proposalObj.data.channelName)
                    } else {
                        deferred.reject({name: "DataError", message: "Can't find player"});
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Can't find player"});
                }
            )
            .then(
                function (data) {
                    if (data) {
                        return dbProposal.updateProposal({
                            _id: proposalObj._id,
                            createTime: proposalObj.createTime
                        }, {status: constProposalStatus.SUCCESS});
                    }
                },
                function (err) {
                    deferred.reject({
                        name: "DataError",
                        message: "error in updating player topup record.",
                        error: err
                    });
                }
            ).then(
            function (data) {
                if (data) {
                    //todo:: check top up payment channel type here
                    if (isValidForTransaction) {
                        return dbPlayerInfo.applyForPlatformTransactionReward(player.platform, player._id, topupIntentionObj.topUpAmount, player.playerLevel);
                    } else {
                        deferred.resolve(data);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create player top up record"});
                }
            },
            function (error) {
                deferred.reject({name: "DataError", error: error, message: "error in creating topup record"});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({
                    name: "DataError",
                    message: "Error in checking transaction reward event",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    /**
     * Top up Fail
     * @param {Json} query
     * @param {Json} update
     */
    playerTopUpFail: function (query, bCancel) {
        var deferred = Q.defer();
        var topupIntentionObj = {};
        var proposalObj = {};
        dbconfig.collection_proposal.findOne(query)
            .then(
                function (data) {
                    topupIntentionObj = data.data;
                    proposalObj = data;
                    if (data.status == constProposalStatus.SUCCESS || data.status == constProposalStatus.FAIL) {
                        deferred.reject({name: "DataError", message: "Proposal has been processed."});
                        return false;
                    }
                    return true;
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Can't find proposal " + query});
                }
            )
            .then(
                function (data) {
                    if (data) {
                        return dbProposal.updateProposal(
                            {_id: proposalObj._id, createTime: proposalObj.createTime},
                            {status: bCancel ? constProposalStatus.CANCEL : constProposalStatus.FAIL}
                        );
                    }
                    else {
                        deferred.resolve(data);
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Error in finding topup proposal"});
                }
            ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (err) {
                deferred.reject({name: "DataError", error: err, message: "Error in updating topup proposal"});
            }
        );
        return deferred.promise;
    },

    /**
     * Get the topup records of the player
     * @param playerID, the start index and max no of record to be returned
     */

    getPlayerTopUpRecord: function (playerId, index, count) {

        var deferred = Q.defer();
        var playerObjId = null;
        dbconfig.collection_players.findOne({playerId: playerId}).exec().then(
            function (data) {

                playerObjId = data._id;

                var prom1 = dbconfig.collection_playerTopUpRecord.find({playerId: playerObjId}).skip(index).limit(count);
                var prom2 = dbconfig.collection_playerTopUpRecord.find({playerId: playerObjId}).count();

                Q.all([prom1, prom2]).then(
                    function (data) {
                        if (data && data[0]) {

                            deferred.resolve(data);
                        }
                        else {
                            deferred.reject({name: "DataError", message: "Error in getting player topup"});
                        }
                    }).catch(deferred.reject);

            }, function (error) {

                deferred.reject({name: "DBError", message: "Error in getting player topup", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Get the topup records of the player
     * @param {String} playerId
     * @param {String} topUpType
     * @param {Number|Date} startTime
     * @param {Number|Date} endTime
     * @param {Number} index
     * @param {Number} count
     * @param {Boolean} [sort]
     * @param {Boolean} [bDirty] - Only returns records which are dirty or not dirty as specified, or all records if undefined/null
     * @param {Boolean} [bSinceLastConsumption] - Only returns records after the player's last consumption
     * @returns {Promise.<{stats, records}>}
     */
    getPlayerTopUpList: function (playerId, topUpType, startTime, endTime, index, count, sort, bDirty, bSinceLastConsumption) {
        "use strict";
        var seq = sort ? -1 : 1;
        return dbconfig.collection_players.findOne({playerId: playerId}).exec().then(
            function (player) {
                if (!player) {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }

                const getLastConsumptionIfNeeded = () => {
                    if (bSinceLastConsumption) {
                        return dbconfig.collection_playerConsumptionRecord.find({
                            playerId: player._id,
                            platformId: player.platform
                        }).sort({createTime: -1}).limit(1).lean();
                    } else {
                        return Q.resolve([]);
                    }
                };

                return getLastConsumptionIfNeeded().then(function (latestConsumptionRecords) {
                    const latestConsumptionRecord = latestConsumptionRecords[0]; // We probably could have used .findOne().sort().limit()

                    let queryStartTime = 0;
                    if (bSinceLastConsumption && latestConsumptionRecord && latestConsumptionRecord.createTime) {
                        queryStartTime = latestConsumptionRecord.createTime.getTime();
                    }
                    if (startTime && new Date(startTime).getTime() > queryStartTime) {
                        queryStartTime = startTime;
                    }
                    const queryEndTime = endTime;

                    var queryObj = {
                        playerId: player._id
                    };
                    if (topUpType) {
                        queryObj.topUpType = parseInt(topUpType);
                    }
                    if (queryStartTime || queryEndTime) {
                        queryObj.createTime = {};
                    }
                    if (queryStartTime) {
                        queryObj.createTime["$gte"] = new Date(queryStartTime);
                    }
                    if (queryEndTime) {
                        queryObj.createTime["$lt"] = new Date(queryEndTime);
                    }
                    if (bDirty != null) {
                        queryObj.bDirty = bDirty;
                    }
                    var countProm = dbconfig.collection_playerTopUpRecord.find(queryObj).count();
                    var recordProm = dbconfig.collection_playerTopUpRecord.find(queryObj)
                        .populate({
                            path: "playerId",
                            model: dbconfig.collection_players
                        })
                        .populate({
                            path: "platformId",
                            model: dbconfig.collection_platform
                        })
                        .skip(index).limit(count).sort({createTime: seq}).lean();
                    return Q.all([recordProm, countProm]);
                });
            }, function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (data) {
                var totalAmount = 0;
                if (data && data[0] && data[0].length > 0) {
                    for (var i = 0; i < data[0].length; i++) {
                        var record = data[0][i];
                        record.playerId = record.playerId.playerId;
                        record.platformId = record.platformId.platformId;
                        totalAmount += record.amount;
                    }
                }

                var stats = {
                    totalCount: data[1],
                    totalAmount: totalAmount,
                    startIndex: index,
                    requestCount: count
                };
                return {
                    stats: stats,
                    records: data[0]
                };
            }, function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player topup records", error: error});
            }
        );
    },

    /**
     * add online topup process
     * @param playerID
     * @param topupRequest
     * @param {Number} topupRequest.amount
     * @param {Number} topupRequest.topupType
     */
    addOnlineTopupRequest: function (playerId, topupRequest, merchantUseType, clientType) {
        var player = null;
        var proposal = null;
        var merchantResponse = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).then(
            playerData => {
                if (playerData && playerData.platform) {
                    player = playerData;
                    var minTopUpAmount = playerData.platform.minTopUpAmount || 0;
                    if (topupRequest.amount < minTopUpAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_TOP_UP_FAIL,
                            name: "DataError",
                            errorMessage: "Top up amount is not enough"
                        });
                    }
                    if (!playerData.permission || !playerData.permission.topupOnline) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have online topup permission"
                        });
                    }
                    //check player foridb topup type list
                    if (player.forbidTopUpType && player.forbidTopUpType.indexOf(topupRequest.topupType) >= 0) {
                        return Q.reject({name: "DataError", message: "Top up type is forbidden for this player"});
                    }
                    var proposalData = Object.assign({}, topupRequest);
                    proposalData.playerId = playerId;
                    proposalData.playerObjId = playerData._id;
                    proposalData.platformId = playerData.platform._id;
                    proposalData.playerLevel = playerData.playerLevel;
                    proposalData.platform = playerData.platform.platformId;
                    proposalData.playerName = playerData.name;
                    proposalData.creator = {
                        type: 'player',
                        name: playerData.name,
                        id: playerId
                    };
                    var newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType.CLIENT,
                        userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };
                    return dbProposal.createProposalWithTypeName(playerData.platform._id, constProposalType.PLAYER_TOP_UP, newProposal);
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot find player for online top up proposal",
                        error: Error()
                    });
                }
            }
        ).then(
            proposalData => {
                if (proposalData) {
                    proposal = proposalData;
                    var requestData = {
                        proposalId: proposalData.proposalId,
                        platformId: player.platform.platformId,
                        userName: player.name,
                        realName: player.realName,
                        ip: player.lastLoginIp,
                        topupType: topupRequest.topupType,
                        amount: topupRequest.amount,
                        groupMerchantList: player.merchantGroup.merchants,
                        merchantUseType: merchantUseType,
                        clientType: clientType
                    };
                    // console.log("requestData:", requestData);
                    return pmsAPI.payment_requestOnlineMerchant(requestData);
                    //     .catch(
                    //     err => Q.reject({name: "DataError", message: "Failure with requestOnlineMerchant", error: err, requestData: requestData})
                    // );
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot create online top up proposal",
                        error: Error()
                    });
                }
            }
            //err => Q.reject({name: "DBError", message: 'Error in creating online top up proposal', error: err})
        ).then(
            merchantResponseData => {
                if (merchantResponseData) {
                    // console.log("merchantResponseData", merchantResponseData);
                    merchantResponse = merchantResponseData;
                    //add request data to proposal and update proposal status to pending
                    var updateData = {
                        status: constProposalStatus.PENDING
                    };
                    updateData.data = Object.assign({}, proposal.data);
                    updateData.data.requestId = merchantResponseData.result ? merchantResponseData.result.requestId : "";
                    updateData.data.merchantNo = merchantResponseData.result ? merchantResponseData.result.merchantNo : "";
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        updateData,
                        {new: true}
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "APIError",
                        message: "Cannot create online top up request",
                        error: Error()
                    });
                }
            }
        ).then(
            proposalData => {
                return {
                    proposalId: proposalData.proposalId,
                    topupType: topupRequest.topupType,
                    amount: topupRequest.amount,
                    createTime: proposalData.createTime,
                    status: proposalData.status,
                    topupDetail: merchantResponse.result
                    //requestId: merchantResponse.result.requestId,
                    //result: merchantResponse.result,
                };
            }
        );
        //     .catch(
        //     err => Q.reject({name: "DBError", message: 'Error performing online top up proposal', error: err})
        // );
    },

    /**
     * add manual topup records of the player
     * @param playerID
     * @param inputData
     */
    addManualTopupRequest: function (playerId, inputData, entryType, adminId, adminName) {
        var player = null;
        var proposal = null;
        var request = null;

        return dbPlayerInfo.getManualTopupRequestList(playerId).then(
            retData => {
                if (retData) {
                    return Q.reject({
                        status: constServerCode.PLAYER_PENDING_PROPOSAL,
                        name: "DataError",
                        errorMessage: "Player has pending manual topup request already."
                    });
                } else {
                    return dbconfig.collection_players.findOne({playerId: playerId})
                        .populate({path: "platform", model: dbconfig.collection_platform})
                        .populate({path: "bankCardGroup", model: dbconfig.collection_platformBankCardGroup})
                }
            }
        ).then(
            playerData => {
                if (playerData && playerData.platform && playerData.bankCardGroup && playerData.bankCardGroup.banks && playerData.bankCardGroup.banks.length > 0) {
                    player = playerData;
                    var minTopUpAmount = playerData.platform.minTopUpAmount || 0;
                    if (inputData.amount < minTopUpAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_TOP_UP_FAIL,
                            name: "DataError",
                            errorMessage: "Top up amount is not enough"
                        });
                    }
                    if (!playerData.permission || !playerData.permission.topupManual) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have manual topup permission"
                        });
                    }
                    var proposalData = Object.assign({}, inputData);
                    proposalData.playerId = playerId;
                    proposalData.playerObjId = playerData._id;
                    proposalData.platformId = playerData.platform._id;
                    proposalData.playerLevel = playerData.playerLevel;
                    proposalData.bankCardType = inputData.bankTypeId;
                    proposalData.platform = playerData.platform.platformId;
                    proposalData.playerName = playerData.name;
                    proposalData.depositMethod = inputData.depositMethod;
                    proposalData.realName = inputData.realName;
                    proposalData.remark = inputData.remark || "";
                    proposalData.lastBankcardNo = inputData.lastBankcardNo;
                    proposalData.creator = entryType == "ADMIN" ? {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    } : {
                        type: 'player',
                        name: playerData.name,
                        id: playerId
                    };
                    var newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType[entryType],
                        userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };
                    return dbProposal.createProposalWithTypeName(playerData.platform._id, constProposalType.PLAYER_MANUAL_TOP_UP, newProposal);
                }
                else {
                    return Q.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DataError",
                        errorMessage: "Invalid player bankcard group data"
                    });
                }
            }
        ).then(
            proposalData => {
                if (proposalData) {
                    proposal = proposalData;
                    var depositMethod = "";
                    switch (inputData.depositMethod) {
                        case 1:
                        case "1":
                            depositMethod = "网银转账";
                            break;
                        case 2:
                        case "2":
                            depositMethod = "ATM";
                            break;
                        case 3:
                        case "3":
                            depositMethod = "柜台存款";
                            break;
                        case 4:
                        case "4":
                            depositMethod = "其他";
                            break;
                        default:
                            break;
                    }
                    var requestData = {
                        proposalId: proposalData.proposalId,
                        platformId: player.platform.platformId,
                        userName: player.name,
                        realName: inputData.realName || "",
                        amount: inputData.amount,
                        ip: player.lastLoginIp,
                        depositMethod: depositMethod,
                        bankTypeId: inputData.bankTypeId,
                        bankCardNo: inputData.lastBankcardNo || "",
                        provinceId: inputData.provinceId,
                        cityId: inputData.cityId,
                        districtId: inputData.districtId || "",
                        groupBankcardList: player.bankCardGroup ? player.bankCardGroup.banks : []
                    };
                    // console.log("requestData", requestData);
                    return pmsAPI.payment_requestManualBankCard(requestData);
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Cannot create manual top up proposal"
                    });
                }
            }
        ).then(
            requestData => {
                if (requestData && requestData.result) {
                    request = requestData;
                    //add request data to proposal and update proposal status to pending
                    var updateData = {
                        status: constProposalStatus.PENDING
                    };
                    updateData.data = Object.assign({}, proposal.data);
                    updateData.data.requestId = requestData.result.requestId;
                    updateData.data.validTime = new Date(requestData.result.validTime);
                    updateData.data.proposalId = proposal.proposalId;
                    updateData.data.bankCardNo = requestData.result.bankCardNo;
                    updateData.data.cardOwner = requestData.result.cardOwner;
                    updateData.data.bankTypeId = requestData.result.bankTypeId;

                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        updateData,
                        {new: true}
                    );
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "APIError",
                        errorMessage: "Cannot create manual top up request"
                    });
                }
            }
        ).then(
            data => {
                return {
                    proposalId: data.proposalId,
                    requestId: request.result.requestId,
                    status: data.status,
                    result: request.result
                };
            }
        );
    },

    cancelManualTopupRequest: function (playerId, proposalId) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.requestId) {
                        proposal = proposalData;

                        return pmsAPI.payment_modifyManualTopupRequest({
                            requestId: proposalData.data.requestId,
                            operationType: constManualTopupOperationType.CANCEL,
                            data: null
                        });
                    }
                    else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            request => {
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    cancelAlipayTopup: function (playerId, proposalId) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.requestId) {
                        proposal = proposalData;

                        return pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalId});
                    }
                    else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            request => {
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    cancelWechatTopup: function (playerId, proposalId) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.requestId) {
                        proposal = proposalData;

                        return pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalId});
                    }
                    else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            request => {
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    delayManualTopupRequest: function (playerId, proposalId, delayTime) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.requestId) {
                        proposal = proposalData;

                        return pmsAPI.payment_modifyManualTopupRequest({
                            requestId: proposalData.data.requestId,
                            operationType: constManualTopupOperationType.DELAY,
                            data: {delayTime: delayTime}
                        });
                    }
                    else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            data => {
                return dbconfig.collection_proposal.findOneAndUpdate({
                    createTime: proposal.createTime,
                    _id: proposal._id
                }, {
                    status: constProposalStatus.PENDING,
                    "data.validTime": new Date(proposal.data.validTime.getTime() + 60 * delayTime * 1000)
                }, {new: true})
            }
        ).then(
            data => {
                return {proposalId: proposalId, delayTime: delayTime, newValidTime: data.data.validTime}
            }
        );
    },

    modifyManualTopupRequest: function (playerId, proposalId, data) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.requestId) {
                        proposal = proposalData;

                        return pmsAPI.payment_modifyManualTopupRequest({
                            requestId: proposalData.data.requestId,
                            operationType: constManualTopupOperationType.MODIFY,
                            data: data
                        });
                    }
                    else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            modifyData => {
                var updateData = {};
                delete data.proposalId;
                delete data.requestId;
                for (var property in data) {
                    if (data.hasOwnProperty(property)) {
                        if (data[property] != proposal.data[property]) {
                            updateData["data." + property] = data[property];
                        }
                    }
                }
                if (dataUtility.isEmptyObject(updateData)) {
                    return true;
                }
                else {
                    return dbconfig.collection_proposal.findOneAndUpdate({
                            _id: proposal._id,
                            createTime: proposal.createTime
                        },
                        {$set: updateData},
                        {new: true}
                    );
                }
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    getTopUpTotalAmountForAllPlatform: function (startTime, endTime, platform) {
        var matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
            platformId: platform
        }
        if (platform !== 'all') {
            matchObj.platformId = platform
        }
        return dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: "$platformId",
                    totalAmount: {$sum: "$amount"}
                }
            }
        ).exec().then(
            function (data) {
                return dbconfig.collection_platform.populate(data, {path: '_id'})
            }
        );
    },

    /**
     * Get the topup history of the player
     * @param playerID
     * @param topUpType
     * @param startTime
     * @param endTime
     * @param index
     * @param count
     * @param sort
     */
    getPlayerTopUpHistory: function (playerId, topUpType, startTime, endTime, index, count, sort, status) {
        var seq = sort ? -1 : 1;
        var playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            function (data) {
                if (data) {
                    playerData = data;
                    //get online top up and manual top up proposal type
                    var queryObj = {
                        platformId: data.platform
                    };
                    if (topUpType) {
                        switch (parseInt(topUpType)) {
                            case constPlayerTopUpType.ONLINE:
                                queryObj.name = constProposalType.PLAYER_TOP_UP;
                                break;
                            case constPlayerTopUpType.ALIPAY:
                                queryObj.name = constProposalType.PLAYER_ALIPAY_TOP_UP;
                                break;
                            case constPlayerTopUpType.MANUAL:
                                queryObj.name = constProposalType.PLAYER_MANUAL_TOP_UP;
                                break;
                            case constPlayerTopUpType.WECHAT:
                                queryObj.name = constProposalType.PLAYER_WECHAT_TOP_UP;
                                break;
                            default:
                                queryObj.name = constProposalType.PLAYER_TOP_UP;
                                break;
                        }
                    }
                    else {
                        queryObj.name = {$in: [constProposalType.PLAYER_MANUAL_TOP_UP, constProposalType.PLAYER_TOP_UP,
                            constProposalType.PLAYER_ALIPAY_TOP_UP, constProposalType.PLAYER_WECHAT_TOP_UP]}
                    }
                    return dbconfig.collection_proposalType.find(queryObj).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (proposalTypes) {
                if (proposalTypes && proposalTypes.length > 0) {
                    var queryObj = {
                        "data.playerObjId": playerData._id,
                        type: {$in: proposalTypes.map(type => type._id)}
                        //status: status || constProposalStatus.SUCCESS
                    };
                    if (status) {
                        queryObj.status = status;
                    }
                    else {
                        queryObj.status = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    }
                    if (startTime || endTime) {
                        queryObj.createTime = {};
                    }
                    if (startTime) {
                        queryObj.createTime["$gte"] = new Date(startTime);
                    }
                    if (endTime) {
                        queryObj.createTime["$lt"] = new Date(endTime);
                    }
                    var countProm = dbconfig.collection_proposal.find(queryObj).count();
                    var recordProm = dbconfig.collection_proposal.find(queryObj)
                        .populate({path: "type", model: dbconfig.collection_proposalType})
                        .skip(index).limit(count).sort({createTime: seq}).lean();
                    return Q.all([recordProm, countProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find top up proposal types"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting proposal type", error: error});
            }
        ).then(
            function (data) {
                var totalAmount = 0;
                if (data && data[0] && data[0].length > 0) {
                    for (var i = 0; i < data[0].length; i++) {
                        var record = data[0][i];
                        switch(record.type.name){
                            case constProposalType.PLAYER_MANUAL_TOP_UP:
                                record.type = 1;
                                break;
                            case constProposalType.PLAYER_TOP_UP:
                                record.type = 2;
                                break;
                            case constProposalType.PLAYER_ALIPAY_TOP_UP:
                                record.type = 3;
                                break;
                            case constProposalType.PLAYER_WECHAT_TOP_UP:
                                record.type = 4;
                                break;
                        }
                        //record.type = record.type.name == constProposalType.PLAYER_MANUAL_TOP_UP ? 1 : 2;
                        totalAmount += data[0][i].data ? Number(data[0][i].data.amount) : 0;
                    }
                }

                var stats = {
                    totalCount: data[1],
                    totalAmount: totalAmount,
                    startIndex: index,
                    requestCount: count
                };
                return {
                    stats: stats,
                    records: data[0]
                };
            }, function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player topup history", error: error});
            }
        );
    },

    /**
     * Get the topup records that
     * @param playerId
     * @param period
     * @param index
     * @param count
     * @param sort
     */
    getValidFirstTopUpRecordList: function (playerId, period, index, count, sort) {
        var seq = sort ? -1 : 1;
        var player = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            data => {
                if (data) {
                    player = data;
                    //check if player is valid for first top up
                    if (period == 1) {
                        return dbPlayerInfo.isValidForFirstTopUpReward(player._id, player.platform);
                    } else if (period == 2 || period == 3) {
                        return dbPlayerInfo.isValidForFirstTopUpRewardPeriod(player, {periodType: (period - 1)});
                    } else {
                        return Q.reject({name: "DataError", message: "Unhandled reward period data."})
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"})
                }
            }
        ).then(
            isValid => {
                if (isValid) {
                    var startTime = null;
                    if (period == 2) {
                        startTime = dbUtility.getCurrentWeekSGTime().startTime;
                    }
                    else if (period == 3) {
                        startTime = dbUtility.getCurrentMonthSGTIme().startTime;
                    }
                    return dbPlayerTopUpRecord.getPlayerTopUpList(playerId, null, startTime, null, index, count, sort, false, true);
                }
                else {
                    var stats = {
                        totalCount: 0,
                        totalAmount: 0,
                        startIndex: index,
                        requestCount: count
                    };
                    return {
                        stats: stats,
                        records: []
                    };
                }
            }
        )
    },

    /**
     * add alipay topup records of the player
     * @param playerId
     * @param amount
     * @param alipayName
     * @param alipayAccount
     * @param entryType
     * @param adminId
     * @param adminName
     */
    requestAlipayTopup: function (playerId, amount, alipayName, alipayAccount, entryType, adminId, adminName, remark, createTime) {
        let player = null;
        let proposal = null;
        let request = null;

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}).then(
                playerData => {
                    if (playerData && playerData.platform && playerData.alipayGroup && playerData.alipayGroup.alipays && playerData.alipayGroup.alipays.length > 0) {
                        player = playerData;
                        let minTopUpAmount = playerData.platform.minTopUpAmount || 0;
                        if (amount < minTopUpAmount) {
                            return Q.reject({
                                status: constServerCode.PLAYER_TOP_UP_FAIL,
                                name: "DataError",
                                errorMessage: "Top up amount is not enough"
                            });
                        }
                        if (!playerData.permission || !playerData.permission.alipayTransaction) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NO_PERMISSION,
                                name: "DataError",
                                errorMessage: "Player does not have this permission"
                            });
                        }
                        let proposalData = {};
                        proposalData.playerId = playerId;
                        proposalData.playerObjId = playerData._id;
                        proposalData.platformId = playerData.platform._id;
                        proposalData.playerLevel = playerData.playerLevel;
                        proposalData.platform = playerData.platform.platformId;
                        proposalData.playerName = playerData.name;
                        proposalData.amount = Number(amount);
                        proposalData.alipayName = alipayName;
                        proposalData.alipayAccount = alipayAccount;
                        proposalData.remark = remark;
                        if(createTime){
                            proposalData.depositeTime = new Date(createTime);
                        }
                        proposalData.creator = entryType === "ADMIN" ? {
                            type: 'admin',
                            name: adminName,
                            id: adminId
                        } : {
                            type: 'player',
                            name: playerData.name,
                            id: playerId
                        };
                        let newProposal = {
                            creator: proposalData.creator,
                            data: proposalData,
                            entryType: constProposalEntryType[entryType],
                            //createTime: createTime ? new Date(createTime) : new Date(),
                            userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                        };
                        return dbProposal.createProposalWithTypeName(playerData.platform._id, constProposalType.PLAYER_ALIPAY_TOP_UP, newProposal);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                proposalData => {
                    if (proposalData) {
                        proposal = proposalData;
                        let cTime = createTime ? new Date(createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        let requestData = {
                            proposalId: proposalData.proposalId,
                            platformId: player.platform.platformId,
                            userName: player.name,
                            realName: alipayName,//player.realName || "",
                            aliPayAccount: 1,
                            amount: amount,
                            groupAlipayList: player.alipayGroup ? player.alipayGroup.alipays : [],
                            remark: remark,
                            createTime: cTimeString,
                        };
                        if (alipayAccount) {
                            requestData.groupAlipayList = [alipayAccount];
                        }
                        //console.log("requestData", requestData);
                        return pmsAPI.payment_requestAlipayAccount(requestData);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create alipay top up proposal"});
                    }
                }
            ).then(
                requestData => {
                    //console.log("request response", requestData);
                    if (requestData && requestData.result) {
                        request = requestData;
                        //add request data to proposal and update proposal status to pending
                        var updateData = {
                            status: constProposalStatus.PENDING
                        };
                        updateData.data = Object.assign({}, proposal.data);
                        updateData.data.requestId = requestData.result.requestId;
                        updateData.data.proposalId = proposal.proposalId;
                        updateData.data.alipayAccount = requestData.result.alipayAccount;
                        updateData.data.alipayQRCode = requestData.result.alipayQRCode;
                        if (requestData.result.validTime) {
                            updateData.data.validTime = new Date(requestData.result.validTime);
                        }
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposal._id, createTime: proposal.createTime},
                            updateData,
                            {new: true}
                        );
                    }
                    else {
                        return Q.reject({name: "APIError", errorMessage: "Cannot create manual top up request"});
                    }
                }
            ).then(
                data => {
                    return {
                        proposalId: data.proposalId,
                        requestId: request.result.requestId,
                        status: data.status,
                        result: request.result
                    };
                }
            );
    },

    getValidTopUpRecordList: function (rewardInfo, playerId, playerObjId) {
        var rewardType = (rewardInfo && rewardInfo.type) ? rewardInfo.type.name : null;
        var period = (rewardInfo && rewardInfo.param) ? parseInt(rewardInfo.param.periodType) : 0;
        if (rewardType == "FirstTopUp") {
            return dbPlayerTopUpRecord.getValidFirstTopUpRecordList(playerId, period + 1, 0, constSystemParam.REPORT_MAX_RECORD_NUM, -1).then(data => {
                return data.records;
            })
        } else {
            return dbPlayerInfo.getPlayerTopUpRecords({playerId: playerObjId}, true)
        }
    },

    /**
     * add wechat topup records of the player
     * @param playerId
     * @param amount
     * @param alipayName
     * @param alipayAccount
     * @param entryType
     * @param adminId
     * @param adminName
     */
    requestWechatTopup: function (playerId, amount, wechatName, wechatAccount, entryType, adminId, adminName, remark, createTime) {
        let player = null;
        let proposal = null;
        let request = null;

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}).then(
                playerData => {
                    if (playerData && playerData.platform && playerData.wechatPayGroup && playerData.wechatPayGroup.wechats && playerData.wechatPayGroup.wechats.length > 0) {
                        player = playerData;
                        let minTopUpAmount = playerData.platform.minTopUpAmount || 0;
                        if (amount < minTopUpAmount) {
                            return Q.reject({
                                status: constServerCode.PLAYER_TOP_UP_FAIL,
                                name: "DataError",
                                errorMessage: "Top up amount is not enough"
                            });
                        }
                        //todo::add wechat pay permission later
                        // if (!playerData.permission || !playerData.permission.wech) {
                        //     return Q.reject({
                        //         status: constServerCode.PLAYER_NO_PERMISSION,
                        //         name: "DataError",
                        //         errorMessage: "Player does not have this permission"
                        //     });
                        // }
                        let proposalData = {};
                        proposalData.playerId = playerId;
                        proposalData.playerObjId = playerData._id;
                        proposalData.platformId = playerData.platform._id;
                        proposalData.playerLevel = playerData.playerLevel;
                        proposalData.platform = playerData.platform.platformId;
                        proposalData.playerName = playerData.name;
                        proposalData.amount = Number(amount);
                        proposalData.wechatName = wechatName;
                        proposalData.wechatAccount = wechatAccount;
                        proposalData.remark = remark;
                        if(createTime){
                            proposalData.depositeTime = new Date(createTime);
                        }
                        proposalData.creator = entryType === "ADMIN" ? {
                            type: 'admin',
                            name: adminName,
                            id: adminId
                        } : {
                            type: 'player',
                            name: playerData.name,
                            id: playerId
                        };
                        let newProposal = {
                            creator: proposalData.creator,
                            data: proposalData,
                            entryType: constProposalEntryType[entryType],
                            //createTime: createTime ? new Date(createTime) : new Date(),
                            userType: playerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                        };
                        return dbProposal.createProposalWithTypeName(playerData.platform._id, constProposalType.PLAYER_WECHAT_TOP_UP, newProposal);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                proposalData => {
                    if (proposalData) {
                        proposal = proposalData;
                        let cTime = createTime ? new Date(createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        let requestData = {
                            proposalId: proposalData.proposalId,
                            platformId: player.platform.platformId,
                            userName: player.name,
                            realName: wechatName,//player.realName || "",
                            aliPayAccount: 1,
                            amount: amount,
                            groupWechatList: player.wechatPayGroup ? player.wechatPayGroup.wechats : [],
                            remark: remark || player.name,
                            createTime: cTimeString,
                        };
                        if (wechatAccount) {
                            requestData.groupWechatList = [wechatAccount];
                        }
                        //console.log("requestData", requestData);
                        return pmsAPI.payment_requestWeChatAccount(requestData);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create wechat top up proposal"});
                    }
                }
            ).then(
                requestData => {
                    //console.log("request response", requestData);
                    if (requestData && requestData.result) {
                        request = requestData;
                        //add request data to proposal and update proposal status to pending
                        var updateData = {
                            status: constProposalStatus.PENDING
                        };
                        updateData.data = Object.assign({}, proposal.data);
                        updateData.data.requestId = requestData.result.requestId;
                        updateData.data.proposalId = proposal.proposalId;
                        updateData.data.weChatAccount = requestData.result.weChatAccount;
                        updateData.data.weChatQRCode = requestData.result.weChatQRCode;
                        if (requestData.result.validTime) {
                            updateData.data.validTime = new Date(requestData.result.validTime);
                        }
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposal._id, createTime: proposal.createTime},
                            updateData,
                            {new: true}
                        );
                    }
                    else {
                        return Q.reject({name: "APIError", errorMessage: "Cannot create manual top up request"});
                    }
                }
            ).then(
                data => {
                    return {
                        proposalId: data.proposalId,
                        requestId: request.result.requestId,
                        status: data.status,
                        result: request.result
                    };
                }
            );
    },

};

var proto = dbPlayerTopUpRecordFunc.prototype;
proto = Object.assign(proto, dbPlayerTopUpRecord);

// This make WebStorm navigation work
module.exports = dbPlayerTopUpRecord;