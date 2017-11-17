var dbPlayerTopUpRecordFunc = function () {
};
module.exports = new dbPlayerTopUpRecordFunc();

const pmsAPI = require("../externalAPI/pmsAPI.js");
const pmsFakeAPI = require("../externalAPI/pmsFakeAPI.js");

const Q = require('q');
const dbconfig = require('./../modules/dbproperties');
const dataUtility = require('./../modules/encrypt');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbProposal = require('./../db_modules/dbProposal');
const dbProposalType = require('./../db_modules/dbProposalType');
const constProposalStatus = require('./../const/constProposalStatus');
const constSystemParam = require('./../const/constSystemParam');
const constProposalType = require('./../const/constProposalType');
const constPlayerTopUpType = require('./../const/constPlayerTopUpType');
const constProposalMainType = require('../const/constProposalMainType');

const counterManager = require("../modules/counterManager.js");
const constManualTopupOperationType = require("../const/constManualTopupOperationType");
const constServerCode = require("../const/constServerCode");
const dbUtility = require("../modules/dbutility");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');
const constShardKeys = require('../const/constShardKeys');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment-timezone');
const serverInstance = require("../modules/serverInstance");
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");

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
        ).allowDiskUse(true).exec();
    },

    /**
     * Get total top up amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    topupReport: function (query, index, limit, sortObj) {
        var queryObj = {
            createTime: {
                $gte: query.startTime ? new Date(query.startTime) : new Date(0),
                $lt: query.endTime ? new Date(query.endTime) : new Date()
            }
        }
        if (query.status && query.status.length > 0) {
            queryObj.status = {$in: convertStringNumber(query.status)};
        }
        return Q.resolve().then(
            () => {
                var str = '';
                if (query && query.mainTopupType == constPlayerTopUpType.ONLINE) {
                    str = constProposalType.PLAYER_TOP_UP;
                } else if (query && query.mainTopupType == constPlayerTopUpType.ALIPAY) {
                    str = constProposalType.PLAYER_ALIPAY_TOP_UP
                } else if (query && query.mainTopupType == constPlayerTopUpType.MANUAL) {
                    str = constProposalType.PLAYER_MANUAL_TOP_UP;
                } else if (query && query.mainTopupType == constPlayerTopUpType.WECHAT) {
                    str = constProposalType.PLAYER_WECHAT_TOP_UP
                } else if (query && query.mainTopupType == constPlayerTopUpType.QUICKPAY) {
                    str = constProposalType.PLAYER_QUICKPAY_TOP_UP
                } else {
                    str = {
                        $in: [
                            constProposalType.PLAYER_TOP_UP,
                            constProposalType.PLAYER_ALIPAY_TOP_UP,
                            constProposalType.PLAYER_MANUAL_TOP_UP,
                            constProposalType.PLAYER_WECHAT_TOP_UP,
                            constProposalType.PLAYER_QUICKPAY_TOP_UP
                        ]
                    };
                }

                if (query.depositMethod && query.depositMethod.length > 0) {
                    queryObj['data.depositMethod'] = {'$in': convertStringNumber(query.depositMethod)};
                }
                if (query.merchantNo && query.merchantNo.length > 0 && (!query.merchantGroup || query.merchantGroup.length == 0)) {
                    queryObj['$or'] = [
                        {'data.merchantNo': {$in: convertStringNumber(query.merchantNo)}},
                        {'data.bankCardNo': {$in: convertStringNumber(query.merchantNo)}},
                        {'data.accountNo': {$in: convertStringNumber(query.merchantNo)}},
                        {'data.alipayAccount': {$in: convertStringNumber(query.merchantNo)}},
                        {'data.wechatAccount': {$in: convertStringNumber(query.merchantNo)}},
                        {'data.weChatAccount': {$in: convertStringNumber(query.merchantNo)}}
                    ]
                }
                if ((!query.merchantNo || query.merchantNo.length == 0) && query.merchantGroup && query.merchantGroup.length > 0) {
                    let mGroupList = [];
                    query.merchantGroup.forEach(item => {
                        if(item.list.length > 0){
                            item.list.forEach(sItem => {
                                mGroupList.push(sItem)
                            })
                        }
                    })
                    // console.log(mGroupList);
                    queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupList)};
                }

                if (query.merchantNo && query.merchantNo.length > 0 && query.merchantGroup && query.merchantGroup.length > 0) {
                    if (query.merchantGroup.length > 0) {
                        let mGroupC = [];
                        let mGroupD = [];
                        query.merchantNo.forEach(item => {
                            mGroupC.push(item);
                        });
                        query.merchantGroup.forEach(item => {
                            item.list.forEach(sItem => {
                                mGroupD.push(sItem)
                            });
                        });

                        if(query.merchantNo.length > 0){
                            queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupC)};
                        }else if(query.merchantGroup.length > 0 && query.merchantNo.length == 0){
                            queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupD)}
                        }

                    }
                }

                if (query.dingdanID) {
                    queryObj['data.requestId'] = query.dingdanID;
                }
                if (query.playerName) {
                    queryObj['data.playerName'] = query.playerName;
                }
                if (query.proposalNo) {
                    queryObj['proposalId'] = query.proposalNo;
                }
                if (query.topupType && query.topupType.length > 0) {
                    queryObj['data.topupType'] = {$in: convertStringNumber(query.topupType)}
                }
                if (query.bankTypeId && query.bankTypeId.length > 0) {
                    queryObj['data.bankTypeId'] = {$in: convertStringNumber(query.bankTypeId)};
                }
                if (query.userAgent && query.userAgent.length > 0) {
                    queryObj['data.userAgent'] = {$in: convertStringNumber(query.userAgent)};
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
                var b = dbconfig.collection_proposal.find(queryObj).sort(sortObj).skip(index).limit(limit)
                    .populate({path: 'type', model: dbconfig.collection_proposalType})
                    .populate({path: "data.playerObjId", model: dbconfig.collection_players})
                    .then(proposals => {
                        proposals = insertRepeatCount(proposals, query.platformId);
                        return proposals
                    });
                var c = dbconfig.collection_proposal.aggregate({$match: queryObj}, {
                    $group: {
                        _id: null,
                        totalAmount: {$sum: "$data.amount"}
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

                const getLastPlayerWithdraw = () => {
                    return dbconfig.collection_proposalType.findOne({
                        name: constProposalType.PLAYER_BONUS,
                        platformId: player.platform
                    }).lean().then(
                        typeData => {
                            if (typeData) {
                                return dbconfig.collection_proposal.find({
                                    type: typeData._id,
                                    status: {
                                        $in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.AUTOAUDIT,
                                            constProposalStatus.PROCESSING, constProposalStatus.SUCCESS, constProposalStatus.UNDETERMINED]
                                    },
                                    "data.playerId": playerId
                                }).sort({createTime: -1}).limit(1).lean();
                            }
                            else {
                                return [];
                            }
                        }
                    );
                };

                return Q.all([getLastConsumptionIfNeeded(), getLastPlayerWithdraw()]).then(function (data) {
                    const latestConsumptionRecord = data[0][0];
                    const lastPlayerWidthDraw = data[1][0];

                    let queryStartTime = 0;
                    if (bSinceLastConsumption && (latestConsumptionRecord && latestConsumptionRecord.createTime || lastPlayerWidthDraw && lastPlayerWidthDraw.createTime)) {
                        queryStartTime = latestConsumptionRecord && latestConsumptionRecord.createTime ? latestConsumptionRecord.createTime.getTime() : 0;
                    }
                    if (lastPlayerWidthDraw && lastPlayerWidthDraw.createTime && lastPlayerWidthDraw && lastPlayerWidthDraw.createTime.getTime() > queryStartTime) {
                        queryStartTime = lastPlayerWidthDraw.createTime.getTime()
                    }
                    if (startTime && new Date(startTime).getTime() > queryStartTime) {
                        queryStartTime = startTime;
                    }
                    const queryEndTime = endTime;

                    var queryObj = {
                        playerId: player._id
                    };
                    if (topUpType) {
                        if (topUpType == 2) {
                            queryObj.topUpType = parseInt(topUpType);
                        }
                        else {
                            queryObj.topUpType = {$ne: 2};
                        }
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
                        if (bDirty == false) {
                            queryObj.bDirty = {$ne: true};
                        }
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

    addOnlineTopupRequest: function (userAgent, playerId, topupRequest, merchantUseType, clientType) {
        var userAgentStr = userAgent;
        var player = null;
        var proposal = null;
        var merchantResponse = null;
        var merchantResult = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).then(
            playerData => {
                if (playerData && playerData.platform) {
                    player = playerData;

                    let firstTopUpProm = dbPlayerTopUpRecord.isPlayerFirstTopUp(player.playerId);
                    let limitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, topupRequest.amount);

                    return Promise.all([firstTopUpProm, limitedOfferProm]);
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
            res => {
                let minTopUpAmount;
                let isPlayerFirstTopUp = res[0];
                let limitedOfferTopUp = res[1];

                if (isPlayerFirstTopUp) {
                    minTopUpAmount = 1;
                } else {
                    minTopUpAmount = player.platform.minTopUpAmount || 0;
                }

                if (topupRequest.amount < minTopUpAmount) {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Top up amount is not enough"
                    });
                }
                if (!player.permission || !player.permission.topupOnline) {
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
                //check player merchant group
                if (!player.merchantGroup || !player.merchantGroup.merchants) {
                    return Q.reject({name: "DataError", message: "Player does not have valid merchant data"});
                }

                if (userAgent) {
                    userAgent = retrieveAgent(userAgent);
                }

                let proposalData = Object.assign({}, topupRequest);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.platformId = player.platform._id;
                proposalData.playerLevel = player.playerLevel;
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.creator = {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };

                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                }

                let newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType.CLIENT,
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };
                newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false);
                return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_TOP_UP, newProposal);
            }
        ).then(
            proposalData => {
                if (proposalData) {
                    proposal = proposalData;
                    let ip = player.lastLoginIp && player.lastLoginIp != 'undefined' ? player.lastLoginIp : "127.0.0.1";
                    var requestData = {
                        proposalId: proposalData.proposalId,
                        platformId: player.platform.platformId,
                        userName: player.name,
                        realName: player.realName,
                        ip: ip,
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

                    // FAKE CALL PMSAPI
                    // return pmsFakeAPI.payment_requestOnlineMerchant();
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

                    merchantResult = merchantResponseData;
                    merchantResponse = merchantResponseData;

                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (merchantResponseData.result.merchantNo) {
                        queryObj['data.merchantNo'] = {'$in': [String(merchantResponseData.result.merchantNo),Number(merchantResponseData.result.merchantNo)]}
                    }
                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    // calculate this card/acc total usage at today
                    return dbconfig.collection_proposal.aggregate(
                        {$match: queryObj},
                        {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                            }
                        })

                    // console.log("merchantResponseData", merchantResponseData);

                    //add request data to proposal and update proposal status to pending
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
            res => {
                var updateData = {
                    status: constProposalStatus.PENDING
                };
                updateData.data = Object.assign({}, proposal.data);
                updateData.data.requestId = merchantResponse.result ? merchantResponse.result.requestId : "";
                updateData.data.merchantNo = merchantResponse.result ? merchantResponse.result.merchantNo : "";
                if (res[0]) {
                    updateData.data.cardQuota = res[0].totalAmount;
                }
                return dbconfig.collection_proposal.findOneAndUpdate(
                    {_id: proposal._id, createTime: proposal.createTime},
                    updateData,
                    {new: true}
                );
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
    addManualTopupRequest: function (userAgent, playerId, inputData, entryType, adminId, adminName, fromFPMS) {
        var player = null;
        var proposal = null;
        var request = null;
        let userAgentStr = userAgent;
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

                    let firstTopUpProm = dbPlayerTopUpRecord.isPlayerFirstTopUp(player.playerId);
                    let limitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, inputData.amount);

                    return Promise.all([firstTopUpProm, limitedOfferProm]);
                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DataError",
                        errorMessage: "Invalid player bankcard group data"
                    });
                }
            }

        ).then(
            res => {
                //disable bankaccount check for now
                // if (inputData.lastBankcardNo.length > 0 && fromFPMS) {
                //     let isCorrectBankAcc = player.bankCardGroup.banks.find((bankAcc) => {
                //         return inputData.lastBankcardNo == bankAcc.slice(-(inputData.lastBankcardNo.length));
                //     });
                //     if (!isCorrectBankAcc) {
                //         return Q.reject({
                //             status: constServerCode.PLAYER_TOP_UP_FAIL,
                //             name: "DataError",
                //             errorMessage: "Bank Account is not correct"
                //         });
                //     }
                // }
                let minTopUpAmount;
                let isPlayerFirstTopUp = res[0];
                let limitedOfferTopUp = res[1];

                if (isPlayerFirstTopUp) {
                    minTopUpAmount = 1;
                } else {
                    minTopUpAmount = player.platform.minTopUpAmount || 0;
                }

                if (inputData.amount < minTopUpAmount) {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Top up amount is not enough"
                    });
                }
                if (!player.permission || !player.permission.topupManual) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        errorMessage: "Player does not have manual topup permission"
                    });
                }
                if (userAgent) {
                    userAgent = retrieveAgent(userAgent);
                }
                let proposalData = Object.assign({}, inputData);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.platformId = player.platform._id;
                proposalData.playerLevel = player.playerLevel;
                proposalData.bankCardType = inputData.bankTypeId;
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.depositMethod = inputData.depositMethod;
                proposalData.realName = inputData.realName;
                proposalData.remark = inputData.remark || "";
                proposalData.lastBankcardNo = inputData.lastBankcardNo || "";
                proposalData.depositTime = inputData.createTime || "";
                proposalData.inputData = inputData;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.creator = entryType == "ADMIN" ? {
                    type: 'admin',
                    name: adminName,
                    id: adminId
                } : {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };

                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                }

                var newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType[entryType],
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };
                newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false);//newProposal.isPartner
                return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_MANUAL_TOP_UP, newProposal);
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
                        provinceId: inputData.provinceId || "",
                        cityId: inputData.cityId,
                        districtId: inputData.districtId || "",
                        groupBankcardList: player.bankCardGroup ? player.bankCardGroup.banks : [],
                        operateType: entryType == "ADMIN" ? 1 : 0,
                        remark: inputData.remark || ''
                    };
                    if (fromFPMS) {
                        let cTime = inputData.createTime ? new Date(inputData.createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        requestData.depositTime = cTimeString || "";
                        requestData.groupBankcardList = inputData.groupBankcardList;
                    }
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
            topupResult => {

                if(topupResult.result){
                    request = topupResult;
                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (topupResult.result.bankCardNo) {
                        queryObj['data.bankCardNo'] = {'$in': [String(topupResult.result.bankCardNo), Number(topupResult.result.bankCardNo)]};
                    }
                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    return dbconfig.collection_proposal.aggregate(
                        {$match: queryObj},
                        {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                            }
                        })
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
            resultData => {
                if (resultData) {
                    //add request data to proposal and update proposal status to pending

                    var updateData = {
                        status: constProposalStatus.PENDING
                    };
                    updateData.data = Object.assign({}, proposal.data);
                    updateData.data.requestId = request.result.requestId;
                    updateData.data.validTime = new Date(request.result.validTime);
                    updateData.data.proposalId = proposal.proposalId;
                    updateData.data.bankCardNo = request.result.bankCardNo;
                    updateData.data.cardOwner = request.result.cardOwner;
                    updateData.data.bankTypeId = request.result.bankTypeId;
                    updateData.data.resultData = request.result;
                    if (resultData[0]) {
                        updateData.data.cardQuota = resultData[0].totalAmount || 0;
                    }
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        updateData,
                        {new: true}
                    );
                }
            }
        ).then(
            data => {
                return {
                    proposalId: data.proposalId,
                    requestId: request.result.requestId,
                    status: data.status,
                    result: request.result,
                    inputData: inputData,
                    restTime: Math.abs(parseInt((new Date().getTime() - new Date(request.result.validTime).getTime()) / 1000))
                };
            }
        );
    },

    getCashRechargeStatus: playerId => {
        let playerObj;

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;

                    return dbconfig.collection_proposalType.findOne({
                        platformId: playerObj.platform._id,
                        name: constProposalType.PLAYER_MANUAL_TOP_UP
                    }).lean();
                }
            }
        ).then(
            propTypeData => {
                if (propTypeData) {
                    return dbconfig.collection_proposal.findOne({
                        "data.platformId": playerObj.platform._id,
                        "data.playerObjId": playerObj._id,
                        "data.validTime": {$gt: new Date()},
                        type: propTypeData._id
                    }).sort({settleTime: -1}).lean();
                }
            }
        ).then(
            res => {
                if (res) {
                    let retData = {
                        proposalId: res.proposalId,
                        requestId: res.data.requestId,
                        status: res.status,
                        result: res.data.resultData,
                        inputData: res.data.inputData,
                        restTime: Math.abs(parseInt((new Date().getTime() - new Date(res.data.validTime).getTime()) / 1000))
                    };

                    if (res.status == constProposalStatus.APPROVED || res.status == constProposalStatus.SUCCESS) {
                        if (!res.data.isViewedByFrontEnd) {
                            return dbconfig.collection_proposal.findOneAndUpdate({
                                _id: res._id,
                                createTime: res.createTime
                            }, {
                                "data.isViewedByFrontEnd": true
                            }).then(
                                res => retData
                            );
                        }
                    } else if (res.status == constProposalStatus.PENDING) {
                        return retData;
                    }
                }
            }
        )
    },

    cancelManualTopupRequest: function (playerId, proposalId, adminName) {
        var proposal = null;
        let cancelTime = new Date();
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
            data => {
                if (proposal) {
                    let cancelBy = adminName ? "客服:" + adminName : "玩家：" + proposal.data.playerName;
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": cancelBy, "settleTime": cancelTime}
                    );
                }
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    cancelAlipayTopup: function (playerId, proposalId, adminName) {
        var proposal = null;
        let cancelTime = new Date();
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
            data => {
                if (proposal) {
                    let cancelBy = adminName ? "客服:" + adminName : "玩家：" + proposal.data.playerName;
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": cancelBy, "settleTime": cancelTime}
                    );
                }
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    cancelWechatTopup: function (playerId, proposalId, adminName) {
        var proposal = null;
        let cancelTime = new Date();
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId) {
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
            data => {
                if (proposal) {
                    let cancelBy = adminName ? "客服:" + adminName : "玩家：" + proposal.data.playerName;
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": cancelBy, "settleTime": cancelTime}
                    );
                }
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
                // delete data.requestId;
                for (var property in data) {
                    if (data.hasOwnProperty(property) && property != "requestId") {
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
        ).allowDiskUse(true).exec().then(
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
                            case constPlayerTopUpType.MANUAL:
                                queryObj.name = {
                                    $in: [constProposalType.PLAYER_MANUAL_TOP_UP, constProposalType.PLAYER_ALIPAY_TOP_UP, constProposalType.PLAYER_WECHAT_TOP_UP]
                                };
                                break;
                            case constPlayerTopUpType.ALIPAY:
                                queryObj.name = constProposalType.PLAYER_ALIPAY_TOP_UP;
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
                        queryObj.name = {
                            $in: [constProposalType.PLAYER_MANUAL_TOP_UP, constProposalType.PLAYER_TOP_UP,
                                constProposalType.PLAYER_ALIPAY_TOP_UP, constProposalType.PLAYER_WECHAT_TOP_UP]
                        };
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
                        switch (record.type.name) {
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
                    var startTime = 0;
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

    requestAlipayTopup: function (userAgent, playerId, amount, alipayName, alipayAccount, bonusCode, entryType, adminId, adminName, remark, createTime) {
        let userAgentStr = userAgent;
        let player = null;
        let proposal = null;
        let request = null;
        let pmsData = null;

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}).then(
                playerData => {
                    if (playerData && playerData.platform && playerData.alipayGroup && playerData.alipayGroup.alipays && playerData.alipayGroup.alipays.length > 0) {
                        player = playerData;

                        let firstTopUpProm = dbPlayerTopUpRecord.isPlayerFirstTopUp(player.playerId);
                        let limitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, amount);

                        return Promise.all([firstTopUpProm, limitedOfferProm]);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            )
            .then(
                res => {
                    let minTopUpAmount = player.platform.minTopUpAmount || 0;
                    let isPlayerFirstTopUp = res[0];
                    let limitedOfferTopUp = res[1];
                    if (isPlayerFirstTopUp) {
                        minTopUpAmount = 1;
                    }
                    if (entryType === "ADMIN") {
                        minTopUpAmount = 1;
                    }
                    if (amount < minTopUpAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_TOP_UP_FAIL,
                            name: "DataError",
                            errorMessage: "Top up amount is not enough"
                        });
                    }
                    if (!player.permission || !player.permission.alipayTransaction) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have this topup permission"
                        });
                    }
                    if (userAgent) {
                        userAgent = retrieveAgent(userAgent);
                    }

                    let proposalData = {};
                    proposalData.playerId = playerId;
                    proposalData.playerObjId = player._id;
                    proposalData.platformId = player.platform._id;
                    proposalData.playerLevel = player.playerLevel;
                    proposalData.platform = player.platform.platformId;
                    proposalData.playerName = player.name;
                    proposalData.realName = player.realName;
                    proposalData.amount = Number(amount);
                    proposalData.alipayName = alipayName;
                    proposalData.alipayAccount = alipayAccount;
                    proposalData.remark = remark;
                    proposalData.userAgent = userAgent ? userAgent : '';
                    if (createTime) {
                        proposalData.depositeTime = new Date(createTime);
                    }
                    if (bonusCode){
                        proposalData.bonusCode = bonusCode;
                    }
                    proposalData.creator = entryType === "ADMIN" ? {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    } : {
                        type: 'player',
                        name: player.name,
                        id: playerId
                    };

                    // Check Limited Offer Intention
                    if (limitedOfferTopUp) {
                        proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    }

                    let newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType[entryType],
                        //createTime: createTime ? new Date(createTime) : new Date(),
                        userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };
                    newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false);
                    return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_ALIPAY_TOP_UP, newProposal);
                })
            .then(
                proposalData => {
                    if (proposalData) {
                        proposal = proposalData;
                        let cTime = createTime ? new Date(createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        let requestData = {
                            proposalId: proposalData.proposalId,
                            platformId: player.platform.platformId,
                            userName: player.name,
                            realName: player.realName || "",
                            aliPayAccount: 1,
                            amount: amount,
                            groupAlipayList: player.alipayGroup ? player.alipayGroup.alipays : [],
                            remark: entryType == "ADMIN" ? remark : (alipayName || remark),
                            createTime: cTimeString,
                            operateType: entryType == "ADMIN" ? 1 : 0
                        };
                        if (alipayAccount) {
                            requestData.groupAlipayList = [alipayAccount];
                        }
                        // console.log("requestData", requestData);
                        return pmsAPI.payment_requestAlipayAccount(requestData);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create alipay top up proposal"});
                    }
                }

            ).then(
                pmsResult => {
                    pmsData = pmsResult;
                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (alipayAccount) {
                        queryObj['data.alipayAccount'] = pmsResult.result.alipayAccount;
                    } else if (alipayName) {
                        queryObj['data.alipayName'] = pmsResult.result.alipayName;
                    } else {
                    }
                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    return dbconfig.collection_proposal.aggregate(
                        {$match: queryObj},
                        {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                            }
                        })
                }
            ).then(
                res => {
                    //console.log("request response", requestData);
                    if (pmsData && pmsData.result) {
                        request = pmsData;
                        //add request data to proposal and update proposal status to pending
                        var updateData = {
                            status: constProposalStatus.PENDING
                        };
                        updateData.data = Object.assign({}, proposal.data);
                        updateData.data.userAlipayName = updateData.data.alipayName;
                        updateData.data.requestId = pmsData.result.requestId;
                        updateData.data.proposalId = proposal.proposalId;
                        updateData.data.alipayAccount = pmsData.result.alipayAccount;
                        updateData.data.alipayName = pmsData.result.alipayName;
                        pmsData.result.alipayQRCode = pmsData.result.alipayQRCode || "";
                        updateData.data.alipayQRCode = pmsData.result.alipayQRCode;
                        if (pmsData.result.validTime) {
                            updateData.data.validTime = new Date(pmsData.result.validTime);
                        }
                        if (res[0]) {
                            updateData.data.cardQuota = res[0].totalAmount;
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
                        result: request.result,
                        restTime: Math.abs(parseInt((new Date().getTime() - new Date(request.result.validTime).getTime()) / 1000))
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

    getPlayerWechatPayStatus: playerId => {
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}).then(
                playerData => {
                    if (playerData && playerData.platform && playerData.wechatPayGroup && playerData.wechatPayGroup.wechats && playerData.wechatPayGroup.wechats.length > 0) {
                        return pmsAPI.weChat_getWechatList({
                            platformId: playerData.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }).then(
                            wechats => {
                                let bValid = false;
                                if (wechats.data && wechats.data.length > 0) {
                                    wechats.data.forEach(
                                        wechat => {
                                            playerData.wechatPayGroup.wechats.forEach(
                                                pWechat => {
                                                    if (pWechat == wechat.accountNumber && wechat.state == "NORMAL") {
                                                        bValid = true;
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }
                                return bValid;
                            }
                        );
                    }
                    else {
                        return false;
                    }
                }
            )
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

    requestWechatTopup: function (userAgent, playerId, amount, wechatName, wechatAccount, bonusCode, entryType, adminId, adminName, remark, createTime) {
        let userAgentStr = userAgent;
        let player = null;
        let proposal = null;
        let request = null;
        let pmsData = null;
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}
            ).lean().then(
                playerData => {
                    if (playerData) {
                        player = playerData;
                        return checkLimitedOfferIntention(player.platform._id, player._id, amount);
                    } else {
                        return Q.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                intentionProp => {
                    let limitedOfferTopUp = intentionProp;
                    if (player && player.platform && player.wechatPayGroup && player.wechatPayGroup.wechats && player.wechatPayGroup.wechats.length > 0) {
                        let minTopUpAmount = player.platform.minTopUpAmount || 0;
                        if (amount < minTopUpAmount) {
                            return Q.reject({
                                status: constServerCode.PLAYER_TOP_UP_FAIL,
                                name: "DataError",
                                errorMessage: "Top up amount is not enough"
                            });
                        }

                        // Check player permission
                        if (!player.permission || player.permission.disableWechatPay) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NO_PERMISSION,
                                name: "DataError",
                                errorMessage: "Player does not have this topup permission"
                            });
                        }
                        if (userAgent) {
                            userAgent = retrieveAgent(userAgent);
                        }
                        let proposalData = {};
                        proposalData.playerId = playerId;
                        proposalData.playerObjId = player._id;
                        proposalData.platformId = player.platform._id;
                        proposalData.playerLevel = player.playerLevel;
                        proposalData.platform = player.platform.platformId;
                        proposalData.playerName = player.name;
                        proposalData.amount = Number(amount);
                        proposalData.wechatName = wechatName;
                        proposalData.wechatAccount = wechatAccount;
                        proposalData.remark = remark;
                        proposalData.userAgent = userAgent ? userAgent : "";
                        if (createTime) {
                            proposalData.depositeTime = new Date(createTime);
                        }
                        if(bonusCode){
                            proposalData.bonusCode = bonusCode;
                        }
                        proposalData.creator = entryType === "ADMIN" ? {
                            type: 'admin',
                            name: adminName,
                            id: adminId
                        } : {
                            type: 'player',
                            name: player.name,
                            id: playerId
                        };
                        // Check Limited Offer Intention
                        if (limitedOfferTopUp) {
                            proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                        }

                        let newProposal = {
                            creator: proposalData.creator,
                            data: proposalData,
                            entryType: constProposalEntryType[entryType],
                            //createTime: createTime ? new Date(createTime) : new Date(),
                            userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                        };
                        newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false);
                        return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_WECHAT_TOP_UP, newProposal);
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
                            // realName: wechatName,//player.realName || "",
                            aliPayAccount: 1,
                            amount: amount,
                            groupWechatList: player.wechatPayGroup ? player.wechatPayGroup.wechats : [],
                            // remark: remark || player.name,
                            createTime: cTimeString,
                            operateType: entryType == "ADMIN" ? 1 : 0
                        };
                        if (remark) {
                            requestData.remark = remark;
                        }
                        if (wechatAccount) {
                            requestData.groupWechatList = [wechatAccount];
                        }
                        //console.log("requestData", requestData);
                        return pmsAPI.payment_requestWeChatQRAccount(requestData);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create wechat top up proposal"});
                    }
                }
            ).then(
                pmsResult => {

                    pmsData = pmsResult;
                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (pmsData.result.weChatAccount) {
                        queryObj['$or'] = [
                            {'data.wechatAccount': pmsData.result.weChatAccount},
                            {'data.weChatAccount': pmsData.result.weChatAccount}
                        ]
                    }
                    if (pmsData.result.weChatName) {
                        queryObj['$or'] = [
                            {'data.wechatName': pmsData.result.weChatName},
                            {'data.weChatName': pmsData.result.weChatName}
                        ]
                    }

                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    return dbconfig.collection_proposal.aggregate(
                        {$match: queryObj},
                        {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                            }
                        })
                }
            ).then(
                res => {
                    //console.log("request response", requestData);
                    if (pmsData && pmsData.result) {
                        request = pmsData;
                        //add request data to proposal and update proposal status to pending
                        var updateData = {
                            status: constProposalStatus.PENDING
                        };
                        updateData.data = Object.assign({}, proposal.data);
                        updateData.data.requestId = pmsData.result.requestId;
                        updateData.data.proposalId = proposal.proposalId;
                        updateData.data.weChatAccount = pmsData.result.weChatAccount;
                        updateData.data.weChatQRCode = pmsData.result.weChatQRCode;
                        if (pmsData.result.validTime) {
                            updateData.data.validTime = new Date(pmsData.result.validTime);
                        }
                        if (res[0]) {
                            updateData.data.cardQuota = res[0].totalAmount || 0;
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
                        result: request.result,
                        restTime: Math.abs(parseInt((new Date().getTime() - new Date(request.result.validTime).getTime()) / 1000))
                    };
                }
            );
    },


    /**
     * add quickpay topup records of the player
     * @param playerId
     * @param amount
     * @param quickpayName
     * @param quickpayAccount
     * @param entryType
     * @param adminId
     * @param adminName
     */
    requestQuickpayTopup: function (playerId, amount, quickpayName, quickpayAccount, entryType, adminId, adminName, remark, createTime) {
        let player = null;
        let proposal = null;
        let request = null;

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).populate({
            path: "quickPayGroup",
            model: dbconfig.collection_platformQuickPayGroup
        }).lean().then(
            playerData => {
                if (playerData) {
                    player = playerData;
                    return checkLimitedOfferIntention(player.platform._id, player._id, amount);
                } else {
                    return Q.reject({name: "DataError", errorMessage: "Invalid player data"});
                }
            }
        ).then(
            intentionProp => {
                let limitedOfferTopUp = intentionProp;

                if (player && player.platform && player.quickPayGroup && player.quickPayGroup.quickpays && player.quickPayGroup.quickpays.length > 0) {
                    let minTopUpAmount = player.platform.minTopUpAmount || 0;
                    if (amount < minTopUpAmount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_TOP_UP_FAIL,
                            name: "DataError",
                            errorMessage: "Top up amount is not enough"
                        });
                    }
                    // if (!playerData.permission || !playerData.permission.quickpayTransaction) {
                    //     return Q.reject({
                    //         status: constServerCode.PLAYER_NO_PERMISSION,
                    //         name: "DataError",
                    //         errorMessage: "Player does not have this permission"
                    //     });
                    // }
                    let proposalData = {};
                    proposalData.playerId = playerId;
                    proposalData.playerObjId = player._id;
                    proposalData.platformId = player.platform._id;
                    proposalData.playerLevel = player.playerLevel;
                    proposalData.platform = player.platform.platformId;
                    proposalData.playerName = player.name;
                    proposalData.amount = Number(amount);
                    proposalData.quickpayName = quickpayName;
                    proposalData.quickpayAccount = quickpayAccount;
                    proposalData.remark = remark;
                    if (createTime) {
                        proposalData.depositeTime = new Date(createTime);
                    }
                    proposalData.creator = entryType === "ADMIN" ? {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    } : {
                        type: 'player',
                        name: player.name,
                        id: playerId
                    };

                    // Check Limited Offer Intention
                    if (limitedOfferTopUp) {
                        proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    }

                    let newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType[entryType],
                        //createTime: createTime ? new Date(createTime) : new Date(),
                        userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };
                    return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_QUICKPAY_TOP_UP, newProposal);
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
                        realName: quickpayName || player.realName || "",
                        amount: amount,
                        groupMfbList: player.quickPayGroup ? player.quickPayGroup.quickpays : [],
                        remark: quickpayName || player.realName || "",
                        // createTime: cTimeString,
                        operateType: entryType == "ADMIN" ? 1 : 0
                    };
                    if (quickpayAccount) {
                        requestData.groupQuickpayList = [quickpayAccount];
                    }
                    //console.log("requestData", requestData);
                    return pmsAPI.payment_requestMfbAccount(requestData);
                }
                else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot create quickpay top up proposal"});
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
                    updateData.data.mfbAccount = requestData.result.mfbAccount;
                    requestData.result.mfbQRCode = requestData.result.mfbQRCode || "";
                    updateData.data.mfbQRCode = requestData.result.mfbQRCode;
                    updateData.data.createTime = requestData.result.createTime;
                    if (requestData.result.validTime) {
                        updateData.data.validTime = new Date(requestData.result.validTime);
                    }
                    // requestData.result.quickpayName = quickpayName;
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

    cancelQuickpayTopup: function (playerId, proposalId) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId) {
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

    isPlayerFirstTopUp: function (playerId) {
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
                    return dbconfig.collection_playerTopUpRecord.findOne({playerId: playerData._id}).lean().then(
                        record => {
                            return record ? false : true;
                        }
                    );
                }
                else {
                    return false;
                }
            }
        );
    }

};

function checkLimitedOfferIntention(platformObjId, playerObjId, topUpAmount) {
    return dbconfig.collection_proposalType.findOne({
        platformId: platformObjId,
        name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
    }).lean().then(
        proposalTypeData => {
            if (proposalTypeData) {
                return dbconfig.collection_proposal.findOne({
                    'data.platformObjId': platformObjId,
                    'data.playerObjId': playerObjId,
                    'data.applyAmount': topUpAmount,
                    'data.topUpProposalObjId': {$exists: false},
                    type: proposalTypeData._id
                }).sort({createTime: -1}).lean();
            }
        }
    ).then(
        intentionProp => {
            if (intentionProp) {
                return intentionProp;
                // return intentionProp.data.expirationTime.getTime() >= new Date().getTime() ? intentionProp : {
                //     proposalId: intentionProp.proposalId,
                //     expired: true
                // };
            } else {
                return false;
            }
        }
    );
}

//
// get account count / merchant count
//

// lets do the most basic version, refactor later
function insertRepeatCount(proposals, platformId) {

    return new Promise(function (resolve) {
        let typeIds = null;
        let getProposalTypesIdProm = typeIds ? Promise.resolve(typeIds) : getTopUpProposalTypeIds(platformId);
        let insertedProposals = [];

        if (!proposals || proposals.length === 0) {
            resolve([]);
        }

        let promises = [];

        for (let i = 0; i < proposals.length; i++) {
            let prom = new Promise(function (res) {
                let proposal = JSON.parse(JSON.stringify(proposals[i]));
                if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
                    insertedProposals[i] = handleSuccessProposal(proposal);
                    res();
                } else {
                    getProposalTypesIdProm.then(
                        typeIdData => {
                            typeIds = typeIdData;
                            return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
                        }
                    ).then(
                        () => {
                            insertedProposals[i] = proposal;
                            res();
                        }
                    )
                }
            });

            promises.push(prom);
        }

        Promise.all(promises).then(
            () => {
                resolve(insertedProposals);
            }
        );

        // NOTE: async loop will probably be necessary if t
        // asyncLoop(proposals.length, function (i, loop) {
        //     let proposal = JSON.parse(JSON.stringify(proposals[i]));
        //     if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
        //         insertedProposals[i] = handleSuccessProposal(proposal);
        //         loop();
        //     } else {
        //         getProposalTypesIdProm.then(
        //             typeIdData => {
        //                 typeIds = typeIdData;
        //                 return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
        //             }
        //         ).then(
        //             () => {
        //                 insertedProposals[i] = proposal;
        //                 loop();
        //             }
        //         )
        //     }
        //
        //
        // }, function returnResult() {
        //     resolve(insertedProposals);
        // });

        function handleFailureMerchant(proposal) {
            let merchantNo = proposal.data.merchantNo;
            let relevantTypeIds = merchantNo ? typeIds : [proposal.type];
            let alipayAccount = proposal.data.alipayAccount ? proposal.data.alipayAccount : "";
            let bankCardNoRegExp;

            if (proposal.data.bankCardNo) {
                let bankCardNoRegExpA = new RegExp(proposal.data.bankCardNo.substring(0, 6) + ".*");
                let bankCardNoRegExpB = new RegExp(".*" + proposal.data.bankCardNo.slice(-4));
                bankCardNoRegExp = [
                    {"data.bankCardNo": bankCardNoRegExpA},
                    {"data.bankCardNo": bankCardNoRegExpB}
                ];
            }

            let prevSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$lte: new Date(proposal.createTime)},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            let nextSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$gte: new Date(proposal.createTime)},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            if (merchantNo) {
                prevSuccessQuery["data.merchantNo"] = merchantNo;
                nextSuccessQuery["data.merchantNo"] = merchantNo;
            }

            if (alipayAccount) {
                prevSuccessQuery["data.alipayAccount"] = alipayAccount;
                nextSuccessQuery["data.alipayAccount"] = alipayAccount;
            }

            if (proposal.data.bankCardNo) {
                prevSuccessQuery["$and"] = bankCardNoRegExp;
                nextSuccessQuery["$and"] = bankCardNoRegExp;
            }

            let prevSuccessProm = dbconfig.collection_proposal.find(prevSuccessQuery).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find(nextSuccessQuery).sort({createTime: 1}).limit(1);

            // for debug usage
            // let pS, nS, fISQ;

            return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                successData => {
                    let prevSuccess = successData[0];
                    let nextSuccess = successData[1];

                    let allCountQuery = {
                        type: {$in: relevantTypeIds}
                    };

                    let currentCountQuery = {
                        type: {$in: relevantTypeIds},
                        createTime: {
                            $lte: new Date(proposal.createTime)
                        }
                    };

                    let firstInStreakQuery = {
                        type: {$in: relevantTypeIds}
                    };

                    if (merchantNo) {
                        allCountQuery["data.merchantNo"] = merchantNo;
                        currentCountQuery["data.merchantNo"] = merchantNo;
                        firstInStreakQuery["data.merchantNo"] = merchantNo;
                    }

                    if (alipayAccount) {
                        allCountQuery["data.alipayAccount"] = alipayAccount;
                        currentCountQuery["data.alipayAccount"] = alipayAccount;
                        firstInStreakQuery["data.alipayAccount"] = alipayAccount;
                    }

                    if (proposal.data.bankCardNo) {
                        allCountQuery["$and"] = bankCardNoRegExp;
                        currentCountQuery["$and"] = bankCardNoRegExp;
                        firstInStreakQuery["$and"] = bankCardNoRegExp;
                    }

                    if (prevSuccess[0]) {
                        let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                        allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                        currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                        firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                    }

                    if (nextSuccess[0]) {
                        allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                        allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                    }

                    // for debug usage
                    // pS = prevSuccess[0];
                    // nS = nextSuccess[0];
                    // fISQ = firstInStreakQuery;

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                    let firstInStreakProm = dbconfig.collection_proposal.find(firstInStreakQuery).sort({createTime: 1}).limit(1);

                    return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                }
            ).then(
                countData => {
                    let allCount = countData[0];
                    let currentCount = countData[1];
                    let firstFailure = countData[2][0];

                    // for debug usage
                    // if (!firstFailure) {
                    //     console.log('t54lwtMaus')
                    //     console.log('proposal |||', proposal)
                    //     console.log('firstFailure |||', firstFailure)
                    //     console.log('prevSuccess |||', pS)
                    //     console.log('nextSuccess |||', nS)
                    //     console.log('firstInStreakQuery |||', fISQ)
                    //     console.log('prevSuccessQuery |||', prevSuccessQuery)
                    //     console.log('nextSuccessQuery |||', nextSuccessQuery)
                    // }

                    proposal.$merchantAllCount = allCount;
                    proposal.$merchantCurrentCount = currentCount;

                    if (!firstFailure || firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
                        proposal.$merchantGapTime = 0;
                    } else {
                        proposal.$merchantGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                    }
                    return proposal;
                }
            );
        }

        function handleFailurePlayer(proposal) {
            let playerName = proposal.data.playerName;

            let prevSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$lte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$gte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: 1}).limit(1);

            return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                successData => {
                    let prevSuccess = successData[0];
                    let nextSuccess = successData[1];

                    let allCountQuery = {
                        type: {$in: typeIds},
                        "data.playerName": playerName
                    };

                    let currentCountQuery = {
                        type: {$in: typeIds},
                        createTime: {
                            $lte: new Date(proposal.createTime)
                        },
                        "data.playerName": playerName
                    };

                    let firstInStreakQuery = {
                        type: {$in: typeIds},
                        "data.playerName": playerName
                    };

                    if (prevSuccess[0]) {
                        let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                        allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                        currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                        firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                    }

                    if (nextSuccess[0]) {
                        allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                        allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                    }

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                    let firstInStreakProm = dbconfig.collection_proposal.findOne(firstInStreakQuery);

                    return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                }
            ).then(
                countData => {
                    let allCount = countData[0];
                    let currentCount = countData[1];
                    let firstFailure = countData[2];

                    proposal.$playerAllCount = allCount;
                    proposal.$playerCurrentCount = currentCount;

                    if (firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
                        proposal.$playerGapTime = 0;
                    } else {
                        proposal.$playerGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                    }
                    return proposal;
                }
            );
        }

        function handleSuccessProposal(proposal) {
            proposal['$merchantAllCount'] = '-';
            proposal['$merchantCurrentCount'] = '-';
            proposal['$merchantGapTime'] = '-';
            proposal['$playerAllCount'] = '-';
            proposal['$playerCurrentCount'] = '-';
            proposal['$playerGapTime'] = '-';
            return proposal;
        }

    });
}

function getTopUpProposalTypeIds(platformId) {
    let mainTopUpTypes = {
        $in: [
            constProposalType.PLAYER_TOP_UP,
            constProposalType.PLAYER_ALIPAY_TOP_UP,
            constProposalType.PLAYER_MANUAL_TOP_UP,
            constProposalType.PLAYER_WECHAT_TOP_UP,
            constProposalType.PLAYER_QUICKPAY_TOP_UP
        ]
    };

    return dbconfig.collection_proposalType.find({platformId: platformId, name: mainTopUpTypes}).lean().then(
        proposalTypes => {
            return proposalTypes.map(type => {
                return type._id;
            });
        }
    );
}
function asyncLoop(count, func, callback) {
    let i = -1;

    let loop = function () {
        i++;
        if (i >= count) {
            if (callback) {
                callback();
            }
            return;
        }
        func(i, loop);
    };
    loop();
}

function getMinutesBetweenDates(startDate, endDate) {
    var diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / 60000);
}

function retrieveAgent(agentInfo) {
    let registrationInterface = '';
    let userAgent = agentInfo;
    if (userAgent == '') {
        registrationInterface = 1;
    } else {
        if (userAgent.browser.name.indexOf("WebKit") !== -1 || userAgent.browser.name.indexOf("WebView") !== -1) {
            registrationInterface = 2;
        }
        else if (userAgent.os.name.indexOf("iOS") !== -1 || userAgent.os.name.indexOf("ndroid") !== -1 || userAgent.browser.name.indexOf("obile") !== -1) {
            registrationInterface = 3;
        } else {
            registrationInterface = 1;
        }
    }
    return registrationInterface;
}

function convertStringNumber(Arr) {
    let Arrs = JSON.parse(JSON.stringify(Arr));
    let result = []
    Arrs.forEach(item => {
        result.push(String(item));
    })
    Arrs.forEach(item=>{
        let currentNum = Number(item);
        if(isNaN(currentNum)==false){
            result.push(currentNum);
        }
    })
    return result;
}

// end of count user /merchant
var proto = dbPlayerTopUpRecordFunc.prototype;
proto = Object.assign(proto, dbPlayerTopUpRecord);

// This make WebStorm navigation work
module.exports = dbPlayerTopUpRecord;
