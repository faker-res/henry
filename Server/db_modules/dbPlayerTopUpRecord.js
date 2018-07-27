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
const dbPropUtil = require("../db_common/dbProposalUtility");
const constShardKeys = require('../const/constShardKeys');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment-timezone');
const serverInstance = require("../modules/serverInstance");
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const dbPromoCode = require("../db_modules/dbPromoCode");
const constRewardType = require("./../const/constRewardType");
const dbRewardTask = require('./../db_modules/dbRewardTask');
const dbPlayerReward = require('../db_modules/dbPlayerReward');
const dbRewardUtil = require("./../db_common/dbRewardUtility");
const constRewardTaskStatus = require('../const/constRewardTaskStatus');
const rewardUtility = require("../modules/rewardUtility");
const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
const errorUtils = require("../modules/errorUtils.js");
const localization = require("../modules/localization");
const proposalExecutor = require('./../modules/proposalExecutor');

const dbPlayerUtil = require("../db_common/dbPlayerUtility");

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

    assignTopUpRecordUsedEvent: function (platformObjId, playerObjId, eventObjId, spendingAmount, startTime, endTime, byPassedEvent, usedProposal, rewardType) {
        let topUpQuery = {
            platformId: platformObjId,
            playerId: playerObjId,
        };

        if (startTime) {
            topUpQuery.createTime = {$gte: startTime};
            if (endTime) {
                topUpQuery.createTime.$lte = endTime;
            }
        }

        let updateValue = {
            bDirty: true,
            $push: {usedEvent: eventObjId}
        };

        if (rewardType) {
            updateValue.usedType = rewardType;
        }

        if (usedProposal) {
            updateValue.usedProposal = usedProposal;
        }

        let recordIds = [];

        let rewardEventQuery = {platform: platformObjId};

        if (byPassedEvent && byPassedEvent.length > 0) {
            byPassedEvent.forEach(byPassedEventId => {
                byPassedEvent.push(ObjectId(byPassedEventId));
            });
            rewardEventQuery._id = {$nin: byPassedEvent};
        }

        return dbconfig.collection_rewardEvent.distinct("_id", rewardEventQuery).then(
            rewardEventIds => {
                topUpQuery.usedEvent = {$nin: rewardEventIds};
                return dbconfig.collection_playerTopUpRecord.find(topUpQuery).lean()
            }
        ).then(
            toUpRecords => {
                let curAmount = 0;

                for (var i = 0; i < toUpRecords.length; i++) {
                    let record = toUpRecords[i];
                    recordIds.push(record._id);
                    curAmount += record.amount;
                    if (curAmount >= spendingAmount) {
                        break;
                    }
                }

                dbconfig.collection_playerTopUpRecord.update(
                    {_id: {$in: recordIds}},
                    updateValue,
                    {multi: true}
                ).exec();

                return recordIds;
            }
        );
    },

    /**
     *  Add usedEvent to consumption record
     */
    unassignTopUpRecordUsedEvent: function (recordIds, eventObjId) {
        dbconfig.collection_playerTopUpRecord.update(
            {_id: {$in: recordIds}},
            {bDirty: false, $pull: {usedEvent: eventObjId}},
            {multi: true}
        ).exec();
    },

    unassignTopUpRecordUsedEventByProposal: function (proposalId, eventObjId) {
        dbconfig.collection_playerTopUpRecord.update(
            {usedProposal: proposalId},
            {bDirty: false, $pull: {usedEvent: eventObjId}},
            {multi: true}
        ).exec();
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
                        if (item.list.length > 0) {
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

                        if (query.merchantNo.length > 0) {
                            queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupC)};
                        } else if (query.merchantGroup.length > 0 && query.merchantNo.length == 0) {
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
     * @param query
     * @param queryData
     * @param checkSteps
     * @param skipVerify
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

                        // Check top up intention
                        // Check proposal status
                        // Check top up proposal has processing steps
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
                    }
                    else {
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
    getPlayerTopUpList: function (playerId, topUpType, startTime, endTime, index, count, sort, bDirty, bSinceLastConsumption, bSinceLastPlayerWidthDraw) {
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
                    if (bSinceLastPlayerWidthDraw && lastPlayerWidthDraw && lastPlayerWidthDraw.createTime && lastPlayerWidthDraw && lastPlayerWidthDraw.createTime.getTime() > queryStartTime) {
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
                        queryObj.usedEvent = {$ne: []};
                        if (bDirty == false) {
                            queryObj.usedEvent = [];
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

    addOnlineTopupRequest: function (userAgent, playerId, topupRequest, merchantUseType, clientType, topUpReturnCode, bPMSGroup = false) {
        var userAgentStr = userAgent;
        var player = null;
        var proposal = null;
        var merchantResponse = null;
        var merchantResult = null;
        let merchantGroupList = [];
        let rewardEvent;

        if (topupRequest.bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).populate(
            {path: "playerLevel", model: dbconfig.collection_playerLevel}
            ).then(
            playerData => {
                player = playerData;
                if (player && player._id) {
                    if (!topUpReturnCode) {
                        return Promise.resolve();
                    }

                    return checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, topupRequest, constPlayerTopUpType.ONLINE);

                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DataError",
                        errorMessage: "Cannot find player"
                    });
                }
            }
        ).then(
            eventData => {
                rewardEvent = eventData;
                if (player && player.platform) {

                    let firstTopUpProm = dbPlayerTopUpRecord.isPlayerFirstTopUp(player.playerId);
                    let limitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, topupRequest.amount, topupRequest.limitedOfferObjId);
                    let merchantGroupProm = () => {
                        return pmsAPI.merchant_getMerchantList(
                            {
                                platformId: player.platform.platformId,
                                queryId: serverInstance.getQueryId()
                            }
                        )
                    };
                    let proms = [firstTopUpProm, limitedOfferProm, merchantGroupProm()];
                    if (topupRequest.bonusCode) {
                        let bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, topupRequest.bonusCode, topupRequest.amount);
                        proms.push(bonusCodeCheckProm)
                    }

                    return Promise.all(proms);
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
                merchantGroupList = res[2];
                let bonusCodeValidity = res[3];

                if (isPlayerFirstTopUp) {
                    minTopUpAmount = 1;
                } else {
                    minTopUpAmount = player.platform.minTopUpAmount || 0;
                }

                // check bonus code validity if exist
                if (topupRequest.bonusCode && !bonusCodeValidity) {
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "DataError",
                        errorMessage: "Wrong promo code has entered"
                    });
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
                if( player.playerLevel ){
                    proposalData.playerLevel = player.playerLevel._id;
                }
                proposalData.playerRealName = player.realName;
                proposalData.merchantGroupName = player.merchantGroup && player.merchantGroup.name || "";
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.bPMSGroup = Boolean(bPMSGroup);
                proposalData.creator = {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };
                if (rewardEvent && rewardEvent._id) {
                    proposalData.topUpReturnCode = rewardEvent.code;
                }

                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                    if (topupRequest.limitedOfferObjId)
                        proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
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
                        realName: player.realName || "",
                        ip: ip,
                        topupType: topupRequest.topupType,
                        amount: topupRequest.amount,
                        merchantUseType: merchantUseType,
                        clientType: clientType
                    };
                    // console.log("requestData:", requestData);
                    let groupMerchantList = dbPlayerTopUpRecord.isMerchantValid(player.merchantGroup.merchantNames, merchantGroupList, topupRequest.topupType, clientType);
                    if (groupMerchantList.length > 0 || bPMSGroup) {
                        if(!bPMSGroup){
                            requestData.groupMerchantList = groupMerchantList;
                        }
                        else{
                            requestData.groupMerchantList = [];
                        }
                        return pmsAPI.payment_requestOnlineMerchant(requestData);
                    } else {
                        let errorMsg = "No Any MerchantNo Are Available, Please Change TopUp Method";
                        updateProposalRemark(proposalData, localization.localization.translate(errorMsg)).catch(errorUtils.reportError);
                        return Q.reject({
                            name: "DataError",
                            message: errorMsg,
                            error: Error()
                        });
                    }

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
                    if (merchantResponseData.result && merchantResponseData.result.merchantNo) {
                        queryObj['data.merchantNo'] = {'$in': [String(merchantResponseData.result.merchantNo), Number(merchantResponseData.result.merchantNo)]}
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
            },
            err => {
                updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                return Promise.reject(err);
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
                if (merchantResponse.result && merchantResponse.result.revisedAmount) {
                    updateData.data.inputAmount = topupRequest.amount;
                    updateData.data.amount = merchantResponse.result.revisedAmount;
                }

                let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                updateOnlineTopUpProposalDailyLimit(proposalQuery, merchantResponse.result.merchantNo, merchantUseType).catch(errorUtils.reportError);

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
    isMerchantValid: function (playerMerchantNames, merchantGroup, topupType, clientType) {
        let availableMerchant = [];
        playerMerchantNames.forEach(name => {
            merchantGroup.merchants.forEach(item => {
                if (item.name == name && item.topupType == topupType && item.targetDevices == clientType) {
                    console.log(item);
                    availableMerchant.push(item.merchantNo);
                }
            })
        })
        return availableMerchant;
    },

    /**
     * add manual topup records of the player
     * @param playerID
     * @param inputData
     */
    addManualTopupRequest: function (userAgent, playerId, inputData, entryType, adminId, adminName, fromFPMS, bPMSGroup, topUpReturnCode) {
        var player = null;
        var proposal = null;
        var request = null;
        let userAgentStr = userAgent;
        let rewardEvent;
        let isFPMS = false; // true - use FPMS to manage payment

        if (inputData.bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

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
                        .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
                }
            }
        ).then(
            playerData => {
                player = playerData;
                if (player && player._id) {
                    if (player.platform && player.platform.financialSettlement && player.platform.financialSettlement.financialSettlementToggle) {
                        isFPMS = true;
                    }
                    if (!topUpReturnCode) {
                        return Promise.resolve();
                    }

                    return checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, inputData, constPlayerTopUpType.MANUAL);

                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DataError",
                        errorMessage: "Cannot find player"
                    });
                }
            }
        ).then(
            eventData => {
                rewardEvent = eventData;
                if (player && player.platform && ((player.bankCardGroup && player.bankCardGroup.banks && player.bankCardGroup.banks.length > 0) || bPMSGroup || fromFPMS )) {
                    // player = playerData;

                    let firstTopUpProm = dbPlayerTopUpRecord.isPlayerFirstTopUp(player.playerId);

                    let limitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, inputData.amount, inputData.limitedOfferObjId);
                    let proms = [firstTopUpProm, limitedOfferProm];

                    if (inputData.bonusCode) {
                        let bonusCodeCheckProm;
                        let isOpenPromoCode = inputData.bonusCode.toString().trim().length == 3 ? true : false;
                        if (isOpenPromoCode){
                            bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, inputData.bonusCode, inputData.amount);
                        }
                        else {
                            bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, inputData.bonusCode, inputData.amount);
                        }
                        proms.push(bonusCodeCheckProm)
                    }

                    return Promise.all(proms);
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
                let bonusCodeValidity = res[2];

                if (inputData.bonusCode && !bonusCodeValidity) {
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "DataError",
                        errorMessage: "Wrong promo code has entered"
                    });
                }

                if (isPlayerFirstTopUp) {
                    minTopUpAmount = 1;
                } else {
                    minTopUpAmount = player.platform.minTopUpAmount || 0;
                }

                if (inputData.amount < minTopUpAmount && entryType != "ADMIN") {
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
                proposalData.playerLevel = player.playerLevel._id;
                proposalData.playerRealName = player.realName;
                proposalData.bankCardType = inputData.bankTypeId;
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.depositMethod = inputData.depositMethod;
                proposalData.realName = inputData.realName;
                proposalData.remark = inputData.remark || "";
                proposalData.lastBankcardNo = inputData.lastBankcardNo || "";
                proposalData.bankCardGroupName = player.bankCardGroup && player.bankCardGroup.name || "";
                proposalData.depositTime = inputData.createTime || "";
                proposalData.inputData = inputData;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.bPMSGroup = Boolean(bPMSGroup);
                proposalData.bonusCode = inputData.bonusCode;
                proposalData.topUpReturnCode = topUpReturnCode;
                proposalData.supportMode = inputData.supportMode;
                proposalData.creator = entryType == "ADMIN" ? {
                    type: 'admin',
                    name: adminName,
                    id: adminId
                } : {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };
                if (rewardEvent && rewardEvent._id) {
                    proposalData.topUpReturnCode = rewardEvent.code;
                }
                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                    if (inputData.limitedOfferObjId) {
                        proposalData.remark += '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                        proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                    }

                }

                var newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType[entryType],
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };
                let adminInfo = {};
                if(entryType == "ADMIN"){
                    adminInfo = {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    }
                }
                newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false, adminInfo);//newProposal.isPartner
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
                            depositMethod = "支付宝转账";
                            break;
                        case 5:
                        case "5":
                            depositMethod = "微信转账";
                            break;
                        case 6:
                        case "6":
                            depositMethod = "云闪付转账";
                            break;
                        default:
                            break;
                    }
                    var requestData = {
                        proposalId: proposalData.proposalId,
                        platformId: player.platform.platformId,
                        userName: player.name,
                        realName: inputData.realName || player.realName || "",
                        amount: inputData.amount,
                        ip: player.lastLoginIp || "127.0.0.1",
                        depositMethod: depositMethod,
                        bankTypeId: inputData.bankTypeId,
                        bankCardNo: inputData.lastBankcardNo || "",
                        provinceId: inputData.provinceId || "",
                        cityId: inputData.cityId,
                        districtId: inputData.districtId || "",
                        //groupBankcardList: (player.bankCardGroup && !bPMSGroup) ? player.bankCardGroup.banks : [],
                        operateType: entryType == "ADMIN" ? 1 : 0,
                        remark: inputData.remark || ''
                    };
                    if (!bPMSGroup) {
                        requestData.groupBankcardList = player.bankCardGroup ? player.bankCardGroup.banks : [];
                    }
                    if( inputData.supportMode ){
                        requestData.supportMode = inputData.supportMode;
                    }
                    if (fromFPMS) {
                        let cTime = inputData.createTime ? new Date(inputData.createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        requestData.depositTime = cTimeString || "";
                        requestData.groupBankcardList = inputData.groupBankcardList;
                    }
                    // console.log("requestData", requestData);
                    if (isFPMS) {
                        return dbPlayerTopUpRecord.manualTopUpValidate(requestData, fromFPMS);
                    } else {
                        return pmsAPI.payment_requestManualBankCard(requestData);
                    }
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

                if (topupResult.result) {
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
                    let quotaUsedProm;
                    if (isFPMS && topupResult.result.hasOwnProperty("quotaUsed")) {
                        quotaUsedProm = Promise.resolve([{totalAmount:  topupResult.result.quotaUsed}]);
                    } else {
                        quotaUsedProm = dbconfig.collection_proposal.aggregate(
                            {$match: queryObj},
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                }
                            })
                    }
                    return quotaUsedProm;
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "APIError",
                        errorMessage: "Cannot create manual top up request"
                    });
                }
            },
            err => {
                updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                return Promise.reject(err);
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
                    updateData.data.cardQuota = 0;
                    if (request.result && request.result.changeAmount) {
                        updateData.data.inputAmount = inputData.amount;
                        updateData.data.amount = request.result.changeAmount;
                    }

                    if (resultData[0]) {
                        updateData.data.cardQuota = resultData[0].totalAmount || 0;
                    }

                    if (isFPMS && proposal.noSteps) {
                        updateData.status = constProposalStatus.APPROVED;
                    }

                    let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                    updateManualTopUpProposalBankLimit(proposalQuery, request.result.bankCardNo, isFPMS, player.platform.platformId).catch(errorUtils.reportError);

                    return dbconfig.collection_proposal.findOneAndUpdate(
                        proposalQuery,
                        updateData,
                        {new: true}
                    );
                }
            }
        ).then(
            data => {
                if (isFPMS) {
                    if (data.noSteps) {
                        dbconfig.collection_proposalType.findOne({
                            platformId: player.platform._id,
                            name: constProposalType.PLAYER_MANUAL_TOP_UP
                        }).then(
                            proposalTypeData => {
                                if (!proposalTypeData) {
                                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                                }
                                proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                            }
                        ).catch(errorUtils.reportError);
                    }
                    //update bank daily quota
                    dbconfig.collection_platformBankCardList.findOneAndUpdate(
                        {
                            accountNumber: request.result.bankCardNo,
                            platformId: player.platform.platformId
                        },
                        {
                            $inc: {quotaUsed: inputData.amount}
                        }
                    ).catch(errorUtils.reportError);
                }

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

    wechatpayTopUpValidate: (requestData, wechatpayAccount) => {
        let queryData = {
            platformId: requestData.platformId,
            state: "NORMAL",
            isFPMS: true,
            accountNumber: {$in: requestData.groupWechatList},
            $or: [{singleLimit: {$gte: requestData.amount}}, {singleLimit: {$exists: false}}, {singleLimit: 0}]
        }

        if (wechatpayAccount) {
            queryData.state = {$in: ["NORMAL", "LOCK"]};
        }

        return dbconfig.collection_platformWechatPayList.find(queryData).lean().then(
            wechatpayListData => {
                if (!(wechatpayListData && wechatpayListData.length)) {
                    return Promise.reject({name: "DBError", message: 'Currently no available wechatpay'});
                }
                let selectedWechatpay;

                let filteredWechatpay = wechatpayListData.filter(item => {
                    if (!item.quota || !item.quotaUsed) {
                        return true;
                    }
                    return item.quotaUsed < item.quota
                });

                if (filteredWechatpay.length) {
                    wechatpayListData = wechatpayListData.sort(function (a, b) {
                        return a.quotaUsed - b.quotaUsed;
                    });
                    selectedWechatpay = wechatpayListData[0];
                }


                if (!selectedWechatpay) {
                    return Promise.reject({name: "DBError", message: 'Currently no available wechatpay'});
                }

                let validTime = new Date();
                validTime = validTime.setMinutes(validTime.getMinutes() + 30);

                return {
                    result: {
                        validTime: validTime,
                        requestId: "",
                        name: selectedWechatpay.name,
                        nickname: selectedWechatpay.nickName,
                        weChatAccount: selectedWechatpay.accountNumber,
                        weChatQRCode: "",
                        quotaUsed: selectedWechatpay.quotaUsed
                    }
                }
            }
        )
    },

    alipayTopUpValidate: (requestData, alipayAccount) => {

        let queryData = {
            platformId: requestData.platformId,
            state: "NORMAL",
            isFPMS: true,
            accountNumber: {$in: requestData.groupAlipayList},
            $or: [{singleLimit: {$gte: requestData.amount}}, {singleLimit: {$exists: false}}, {singleLimit: 0}]
        }

        if (alipayAccount) {
            queryData.state = {$in: ["NORMAL", "LOCK"]};
        }

        return dbconfig.collection_platformAlipayList.find(queryData).lean().then(
            alipayListData => {
                if (!(alipayListData && alipayListData.length)) {
                    return Promise.reject({name: "DBError", message: 'Currently no available alipay'});
                }
                let selectedAlipay;

                let filteredAlipay = alipayListData.filter(item => {
                    if (!item.quota || !item.quotaUsed) {
                        return true;
                    }
                    return item.quotaUsed < item.quota
                });

                if (filteredAlipay.length) {
                    alipayListData = alipayListData.sort(function (a, b) {
                        return a.quotaUsed - b.quotaUsed;
                    });
                    selectedAlipay = alipayListData[0];
                }


                if (!selectedAlipay) {
                    return Promise.reject({name: "DBError", message: 'Currently no available alipay'});
                }

                let validTime = new Date();
                validTime = validTime.setMinutes(validTime.getMinutes() + 30);

                return {
                    result: {
                        validTime: validTime,
                        requestId: "",
                        alipayName: selectedAlipay.name,
                        alipayAccount: selectedAlipay.accountNumber,
                        alipayQRCode: "",
                        qrcodeAddress: "",
                        quotaUsed: selectedAlipay.quotaUsed
                    }
                }
            }
        )
    },

    manualTopUpValidate: (requestData, fromFPMS) => {
        let queryData = {
            platformId: requestData.platformId,
            status: "NORMAL",
            isFPMS: true,
            accountNumber: {$in: requestData.groupBankcardList}
        }
        if (fromFPMS) {
            queryData.status = {$in: ["NORMAL", "LOCK"]};
        }
        if (requestData.bankCardNo) {
            queryData.accountNumber = {$regex: requestData.bankCardNo + "$"};
        }

        return dbconfig.collection_platformBankCardList.find(queryData).lean().then(
            bankCardListData => {
                if (!(bankCardListData && bankCardListData.length)) {
                    return Promise.reject({name: "DBError", message: 'Currently no available bank card'});
                }
                let selectedBankCard;
                let isInGroup = false;

                if (!fromFPMS && requestData.bankCardNo) {
                    for (let i = 0; i < bankCardListData.length; i++) {
                        if (requestData.groupBankcardList.indexOf(bankCardListData[i].accountNumber) > -1) {
                            isInGroup = true;
                            break;
                        }
                    }
                } else {
                    isInGroup = true;
                }

                if (isInGroup) {
                    let filteredBank = bankCardListData.filter(item => {
                        if (!item.quota || !item.quotaUsed) {
                            return true;
                        }
                        return item.quotaUsed < item.quota
                    });
                    if (filteredBank.length) {
                        bankCardListData = bankCardListData.sort(function (a, b) {
                            return a.quotaUsed - b.quotaUsed;
                        });
                        selectedBankCard = bankCardListData[0];
                    }
                }

                if (!selectedBankCard) {
                    return Promise.reject({name: "DBError", message: 'Currently no available bank card'});
                }

                let validTime = new Date();
                validTime = validTime.setMinutes(validTime.getMinutes() + 30);

                return {
                    result: {
                        validTime: validTime,
                        requestId: "",
                        cardOwner: selectedBankCard.name,
                        bankCardNo: selectedBankCard.accountNumber,
                        bankTypeId: selectedBankCard.bankTypeId,
                        quotaUsed: selectedBankCard.quotaUsed
                    }
                }
            }
        )
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
                        if (adminName) {
                            return pmsAPI.payment_modifyManualTopupRequest({
                                requestId: proposalData.data.requestId,
                                operationType: constManualTopupOperationType.CANCEL,
                                data: null
                            });
                        }
                        else {
                            return pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId})
                        }
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
            },
            error => {
                if (adminName && error.status == 408) {
                    return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
                }
                else {
                    return Q.reject(error);
                }
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
                        if (adminName) {
                            return pmsAPI.payment_modifyManualTopupRequest({
                                requestId: proposalData.data.requestId,
                                operationType: constManualTopupOperationType.CANCEL,
                                data: null
                            });
                        }
                        else {
                            return pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId})
                        }
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
            },
            error => {
                if (adminName && error.status == 408) {
                    return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
                }
                else {
                    return Q.reject(error);
                }
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

                        if (adminName) {
                            return pmsAPI.payment_modifyManualTopupRequest({
                                requestId: proposalData.data.requestId,
                                operationType: constManualTopupOperationType.CANCEL,
                                data: null
                            });
                        }
                        else {
                            return pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId})
                        }
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
            },
            error => {
                if (adminName && error.status == 408) {
                    return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
                }
                else {
                    return Q.reject(error);
                }
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
                    if (proposalData.data && proposalData.data.playerId == playerId) {
                        proposal = proposalData;

                        if (proposalData.data.requestId) {
                            return pmsAPI.payment_modifyManualTopupRequest({
                                requestId: proposalData.data.requestId,
                                operationType: constManualTopupOperationType.DELAY,
                                data: {delayTime: delayTime}
                            });
                        } else {
                            //no requestId means it is handle by FPMS (using FPMS payment method)
                            return true;
                        }
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
        let matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
        };

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
        ).read("secondaryPreferred").allowDiskUse(true).exec().then(
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
                                queryObj.name = constProposalType.PLAYER_MANUAL_TOP_UP;
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
                    //skip the check here
                    // if (period == 1) {
                    //     return dbPlayerInfo.isValidForFirstTopUpReward(player._id, player.platform);
                    // } else if (period == 2 || period == 3) {
                    //     return dbPlayerInfo.isValidForFirstTopUpRewardPeriod(player, {periodType: (period - 1)});
                    // } else {
                    //     return Q.reject({name: "DataError", message: "Unhandled reward period data."})
                    // }
                    return true;
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

    requestAlipayTopup: function (userAgent, playerId, amount, alipayName, alipayAccount, bonusCode, entryType, adminId, adminName, remark, createTime, realName, limitedOfferObjId, topUpReturnCode, bPMSGroup = false) {
        let userAgentStr = userAgent;
        let player = null;
        let proposal = null;
        let request = null;
        let pmsData = null;
        let rewardEvent;
        let isFPMS = false; // true - use FPMS to manage payment

        if (bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}).then(
                playerData => {
                    player = playerData;
                    if (player && player._id) {
                        if (player.platform && player.platform.financialSettlement && player.platform.financialSettlement.financialSettlementToggle) {
                            isFPMS = true;
                        }
                        if (!topUpReturnCode) {
                            return Promise.resolve();
                        }

                        return checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, {amount:amount}, constPlayerTopUpType.ALIPAY);

                    } else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            errorMessage: "Cannot find player"
                        });
                    }
                }
            ).then(
                eventData => {
                    rewardEvent = eventData;
                    if (player && player.platform && player.alipayGroup && player.alipayGroup.alipays && player.alipayGroup.alipays.length > 0) {

                        let firstTopUpProm = dbPlayerTopUpRecord.isPlayerFirstTopUp(player.playerId);
                        let limitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, amount, limitedOfferObjId);
                        let proms = [firstTopUpProm, limitedOfferProm];

                        if (bonusCode) {
                            let bonusCodeCheckProm;
                            let isOpenPromoCode = bonusCode.toString().trim().length == 3 ? true : false;
                            if (isOpenPromoCode){
                                bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, bonusCode, amount);
                            }
                            else {
                                bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, bonusCode, amount);
                            }
                            proms.push(bonusCodeCheckProm)
                        }

                        return Promise.all(proms);
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
                    let bonusCodeValidity = res[2];

                    if (isPlayerFirstTopUp) {
                        minTopUpAmount = 1;
                    }
                    if (entryType === "ADMIN") {
                        minTopUpAmount = 1;
                    }
                    if (amount < minTopUpAmount && !adminId) {
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
                    proposalData.playerLevel = player.playerLevel._id;
                    proposalData.playerRealName = player.realName;
                    proposalData.aliPayGroupName = player.alipayGroup && player.alipayGroup.name || "";
                    proposalData.platform = player.platform.platformId;
                    proposalData.playerName = player.name;
                    proposalData.realName = realName || player.realName;
                    proposalData.amount = Number(amount);
                    proposalData.alipayName = entryType == "ADMIN" ? remark : (alipayName || remark);
                    proposalData.alipayAccount = alipayAccount;
                    proposalData.remark = remark;
                    proposalData.userAgent = userAgent ? userAgent : '';
                    proposalData.bPMSGroup = Boolean(bPMSGroup);
                    if (createTime) {
                        proposalData.depositeTime = new Date(createTime);
                    }
                    if (bonusCode) {
                        if (bonusCodeValidity) {
                            proposalData.bonusCode = bonusCode;
                        }
                        else {
                            return Promise.reject({
                                status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                                name: "DataError",
                                errorMessage: "Wrong promo code has entered"
                            });
                        }
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
                    if (rewardEvent && rewardEvent._id) {
                        proposalData.topUpReturnCode = rewardEvent.code;
                    }

                    // Check Limited Offer Intention
                    if (limitedOfferTopUp) {
                        proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                        proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                        proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                        if (limitedOfferObjId)
                            proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                    }

                    let newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType[entryType],
                        //createTime: createTime ? new Date(createTime) : new Date(),
                        userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };
                    let adminInfo = {};
                    if(entryType == "ADMIN"){
                        adminInfo = {
                            type: 'admin',
                            name: adminName,
                            id: adminId
                        }
                    }
                    newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false, adminInfo);
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
                            ip: player.lastLoginIp || "127.0.0.1",
                            realName: realName || player.realName || "",
                            aliPayAccount: 1,
                            amount: amount,
                            groupAlipayList: player.alipayGroup ? player.alipayGroup.alipays : [],
                            remark: entryType == "ADMIN" ? remark : (alipayName || remark),
                            createTime: cTimeString,
                            operateType: entryType == "ADMIN" ? 1 : 0
                        };
                        if(!bPMSGroup){
                            if (alipayAccount) {
                                requestData.groupAlipayList = [alipayAccount];
                            }
                        }
                        else{
                            requestData.groupAlipayList = [];
                        }
                        // console.log("requestData", requestData);
                        if (isFPMS) {
                            return dbPlayerTopUpRecord.alipayTopUpValidate(requestData, alipayAccount);
                        } else {
                            return pmsAPI.payment_requestAlipayAccount(requestData);
                        }
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
                    let quotaUsedProm;
                    if (isFPMS && pmsData.result.hasOwnProperty("quotaUsed")) {
                        quotaUsedProm = Promise.resolve([{totalAmount:  pmsData.result.quotaUsed}]);
                    } else {
                        quotaUsedProm = dbconfig.collection_proposal.aggregate(
                            {$match: queryObj},
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                }
                            })
                    }
                    return quotaUsedProm;
                },
                err => {
                    updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                    return Promise.reject(err);
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
                        updateData.data.qrcodeAddress = pmsData.result.qrcodeAddress;
                        if (pmsData.result.validTime) {
                            updateData.data.validTime = new Date(pmsData.result.validTime);
                        }
                        if (res[0]) {
                            updateData.data.cardQuota = res[0].totalAmount;
                        }
                        if (isFPMS && proposal.noSteps) {
                            updateData.status = constProposalStatus.APPROVED;
                        }

                        let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                        updateAliPayTopUpProposalDailyLimit(proposalQuery, request.result.alipayAccount, isFPMS, player.platform.platformId).catch(errorUtils.reportError);

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
                    if (isFPMS) {
                        if (data.noSteps) {
                            dbconfig.collection_proposalType.findOne({
                                platformId: player.platform._id,
                                name: constProposalType.PLAYER_ALIPAY_TOP_UP
                            }).then(
                                proposalTypeData => {
                                    if (!proposalTypeData) {
                                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                                    }
                                    proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                                }
                            ).catch(errorUtils.reportError);
                        }
                        //update alipay daily quota
                        dbconfig.collection_platformAlipayList.findOneAndUpdate(
                            {
                                accountNumber: request.result.alipayAccount,
                                platformId: player.platform.platformId
                            },
                            {
                                $inc: {quotaUsed: amount}
                            }
                        ).catch(errorUtils.reportError);
                    }
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

    getPlayerWechatPayStatus: (playerId, bPMSGroup, userIp) => {
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}).lean().then(
                playerData => {
                    if (playerData && playerData.platform && playerData.wechatPayGroup && playerData.wechatPayGroup.wechats && playerData.wechatPayGroup.wechats.length > 0) {
                        let prom;
                        let pmsQuery = {
                            platformId: playerData.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }

                        if (String(bPMSGroup) == "true") {
                            pmsQuery.ip = userIp;
                            pmsQuery.username = playerData.name;
                            prom = pmsAPI.foundation_requestWechatpayByUsername(pmsQuery);
                        } else {
                            prom = pmsAPI.weChat_getWechatList(pmsQuery);
                        }
                        return prom.then(
                            wechats => {
                                let bValid = false;
                                let maxDeposit = 0;
                                if (String(bPMSGroup) == "true") {
                                    if (wechats.data) {
                                        if (!playerData.permission.disableWechatPay && wechats.data.valid) {
                                            bValid = true;
                                        }
                                        if (wechats.data.hasOwnProperty("maxDepositAmount")) {
                                            maxDeposit = wechats.data.maxDepositAmount;
                                        }
                                    }
                                } else {
                                    if (wechats.data && wechats.data.length > 0) {
                                        wechats.data.forEach(
                                            wechat => {
                                                playerData.wechatPayGroup.wechats.forEach(
                                                    pWechat => {
                                                        if (pWechat == wechat.accountNumber && wechat.state == "NORMAL") {
                                                            if (!playerData.permission.disableWechatPay) {
                                                                bValid = true;
                                                            }
                                                            maxDeposit = wechat.singleLimit > maxDeposit ? wechat.singleLimit : maxDeposit;
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                    }
                                }
                                if (bValid || maxDeposit > 0)
                                    bValid = {valid: bValid, maxDepositAmount: maxDeposit};
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

    getPlayerAliPayStatus: (playerId, bPMSGroup, userIp) => {
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}).then(
                playerData => {
                    if (playerData && playerData.platform && playerData.alipayGroup && playerData.alipayGroup.alipays && playerData.alipayGroup.alipays.length > 0) {
                        let aliPayProm;
                        let pmsQuery = {
                            platformId: playerData.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }

                        if (String(bPMSGroup) == "true") {
                            pmsQuery.ip = userIp;
                            pmsQuery.username = playerData.name;
                            aliPayProm = pmsAPI.foundation_requestAlipayByUsername(pmsQuery);
                        } else {
                            aliPayProm = pmsAPI.alipay_getAlipayList(pmsQuery);
                        }

                        let proposalQuery = {
                            'data.playerObjId': {$in: [ObjectId(playerData._id), String(playerData._id)]},
                            'data.platformId': {$in: [ObjectId(playerData.platform._id), String(playerData.platform._id)]}
                        };

                        let  proposalProm = dbconfig.collection_proposalType.findOne({
                            platformId: playerData.platform._id,
                            name: constProposalType.PLAYER_ALIPAY_TOP_UP
                        }).lean().then(
                            proposalType => {
                                proposalQuery.type = proposalType._id;
                                return dbconfig.collection_proposal.findOne(proposalQuery).sort({createTime: -1}).lean();
                            }
                        );
                        let promArr = [aliPayProm, proposalProm];
                        return Promise.all(promArr).then(
                            res => {
                                let alipays = res[0];
                                let aliProposal = res[1];
                                let bValid = false;
                                let maxDeposit = 0;
                                if (String(bPMSGroup) == "true") {
                                    if (alipays.data) {
                                        if (playerData.permission.alipayTransaction && alipays.data.valid) {
                                            bValid = true;
                                        }
                                        if (alipays.data.hasOwnProperty("maxDepositAmount")) {
                                            maxDeposit = alipays.data.maxDepositAmount;
                                        }
                                    }
                                } else {
                                    if (alipays.data && alipays.data.length > 0) {
                                        alipays.data.forEach(
                                            alipay => {
                                                playerData.alipayGroup.alipays.forEach(
                                                    pAlipay => {
                                                        if (pAlipay == alipay.accountNumber && alipay.state == "NORMAL") {
                                                            if (playerData.permission.alipayTransaction) {
                                                                bValid = true;
                                                            }
                                                            maxDeposit = alipay.singleLimit > maxDeposit ? alipay.singleLimit : maxDeposit;
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                    }
                                }
                                if (bValid || maxDeposit > 0) {
                                    bValid = {
                                        valid: bValid,
                                        maxDepositAmount: maxDeposit,
                                        lastNicknameOrAccount: aliProposal && aliProposal.data && aliProposal.data.userAlipayName? aliProposal.data.userAlipayName: ""
                                    };
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
     * @param useQR
     * @param userAgent
     * @param playerId
     * @param amount
     * @param wechatName
     * @param wechatAccount
     * @param bonusCode
     * @param entryType
     * @param adminId
     * @param adminName
     * @param remark
     * @param createTime
     * @param limitedOfferObjId
     */

    requestWechatTopup: function (useQR, userAgent, playerId, amount, wechatName, wechatAccount, bonusCode, entryType, adminId, adminName, remark, createTime, limitedOfferObjId, topUpReturnCode, bPMSGroup = false) {
        let userAgentStr = userAgent;
        let player = null;
        let proposal = null;
        let request = null;
        let pmsData = null;
        let rewardEvent;
        let isFPMS = false; // true - use FPMS to manage payment

        if (bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}
            ).lean().then(
                playerData => {
                    player = playerData;
                    if (player && player._id) {
                        if (player.platform && player.platform.financialSettlement && player.platform.financialSettlement.financialSettlementToggle) {
                            isFPMS = true;
                        }
                        if (!topUpReturnCode) {
                            return Promise.resolve();
                        }

                        return checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, {amount:amount}, constPlayerTopUpType.WECHAT);

                    } else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            errorMessage: "Cannot find player"
                        });
                    }
                }
            ).then(
                eventData => {
                    rewardEvent = eventData;
                    if (player) {
                        return dbPlayerUtil.setPlayerState(player._id, "WechatTopUp");
                    } else {
                        return Promise.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                playerState => {
                    if (playerState) {
                        let checkLimitedOfferProm = checkLimitedOfferIntention(player.platform._id, player._id, amount, limitedOfferObjId);
                        let proms = [checkLimitedOfferProm];

                        if (bonusCode) {
                            let bonusCodeCheckProm;
                            let isOpenPromoCode = bonusCode.toString().trim().length == 3 ? true : false;
                            if (isOpenPromoCode){
                                bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, bonusCode, amount);
                            }
                            else {
                                bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, bonusCode, amount);
                            }
                            proms.push(bonusCodeCheckProm)
                        }

                        return Promise.all(proms);
                    } else {
                        return Promise.reject({name: "DataError", errorMessage: "Concurrent issue detected"});
                    }
                }
            ).then(
                data => {
                    let limitedOfferTopUp = data[0];
                    let bonusCodeValidity = data[1];

                    if (player && player.platform && player.wechatPayGroup && player.wechatPayGroup.wechats && player.wechatPayGroup.wechats.length > 0) {
                        let minTopUpAmount = player.platform.minTopUpAmount || 0;
                        if (amount < minTopUpAmount && entryType != "ADMIN") {
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
                        proposalData.playerLevel = player.playerLevel._id;
                        proposalData.playerRealName = player.realName;
                        proposalData.wechatPayGroupName = player.wechatPayGroup && player.wechatPayGroup.name || "";
                        proposalData.platform = player.platform.platformId;
                        proposalData.playerName = player.name;
                        proposalData.amount = Number(amount);
                        proposalData.wechatName = wechatName;
                        proposalData.wechatAccount = wechatAccount;
                        proposalData.remark = remark;
                        proposalData.userAgent = userAgent ? userAgent : "";
                        proposalData.bPMSGroup = Boolean(bPMSGroup);
                        if (createTime) {
                            proposalData.depositeTime = new Date(createTime);
                        }
                        if (bonusCode) {
                            if (bonusCodeValidity) {
                                proposalData.bonusCode = bonusCode;
                            }
                            else {
                                return Promise.reject({
                                    status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                                    name: "DataError",
                                    errorMessage: "Wrong promo code has entered"
                                });
                            }
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
                        if (rewardEvent && rewardEvent._id) {
                            proposalData.topUpReturnCode = rewardEvent.code;
                        }
                        // Check Limited Offer Intention
                        if (limitedOfferTopUp) {
                            proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                            proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                            proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName
                            if (limitedOfferObjId)
                                proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                        }

                        let newProposal = {
                            creator: proposalData.creator,
                            data: proposalData,
                            entryType: constProposalEntryType[entryType],
                            //createTime: createTime ? new Date(createTime) : new Date(),
                            userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                        };
                        let adminInfo = {};
                        if(entryType == "ADMIN"){
                            adminInfo = {
                                type: 'admin',
                                name: adminName,
                                id: adminId
                            }
                        }
                        newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false, adminInfo);
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
                            realName: player.realName || "",
                            ip: player.lastLoginIp || "127.0.0.1",
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
                        if(!bPMSGroup){
                            if (wechatAccount) {
                                requestData.groupWechatList = [wechatAccount];
                            }
                        }
                        else{
                            requestData.groupWechatList = [];
                        }
                        //console.log("requestData", requestData);
                        if (isFPMS) {
                            return dbPlayerTopUpRecord.wechatpayTopUpValidate(requestData, wechatAccount);
                        } else {
                            if (useQR) {
                                return pmsAPI.payment_requestWeChatQRAccount(requestData);
                            }
                            else {
                                return pmsAPI.payment_requestWeChatAccount(requestData);
                            }
                        }
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
                    let quotaUsedProm;
                    if (isFPMS && pmsData.result.hasOwnProperty("quotaUsed")) {
                        quotaUsedProm = Promise.resolve([{totalAmount:  pmsData.result.quotaUsed}]);
                    } else {
                        quotaUsedProm = dbconfig.collection_proposal.aggregate(
                            {$match: queryObj},
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                }
                            })
                    }
                    return quotaUsedProm;
                },
                err => {
                    updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                    return Promise.reject(err);
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
                        updateData.data.name = pmsData.result.name;
                        updateData.data.nickname = pmsData.result.nickname;
                        if (pmsData.result.validTime) {
                            updateData.data.validTime = new Date(pmsData.result.validTime);
                        }
                        if (res[0]) {
                            updateData.data.cardQuota = res[0].totalAmount || 0;
                        }
                        if (isFPMS && proposal.noSteps) {
                            updateData.status = constProposalStatus.APPROVED;
                        }

                        let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                        updateWeChatPayTopUpProposalDailyLimit(proposalQuery, request.result.weChatAccount, isFPMS, player.platform.platformId).catch(errorUtils.reportError);

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
                    if (isFPMS) {
                        if (data.noSteps) {
                            dbconfig.collection_proposalType.findOne({
                                platformId: player.platform._id,
                                name: constProposalType.PLAYER_WECHAT_TOP_UP
                            }).then(
                                proposalTypeData => {
                                    if (!proposalTypeData) {
                                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                                    }
                                    proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                                }
                            ).catch(errorUtils.reportError);
                        }
                        //update wechatpay daily quota
                        dbconfig.collection_platformWechatPayList.findOneAndUpdate(
                            {
                                accountNumber: request.result.weChatAccount,
                                platformId: player.platform.platformId
                            },
                            {
                                $inc: {quotaUsed: amount}
                            }
                        ).catch(errorUtils.reportError);
                    }
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
                        proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
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
            },
            err => {
                updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                return Promise.reject(err);
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
    },

    addTestTopUp: function (platformId, name, type, requestData, amount, createTime) {
        let proposalType = null;
        let playerObj = {};
        let currentTime = new Date();
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({platform: platformData._id, name: name}).lean();
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    switch (type) {
                        case 1: //online
                            proposalType = constProposalType.PLAYER_TOP_UP;
                            return dbPlayerTopUpRecord.addOnlineTopupRequest(null, playerData.playerId, requestData, 1, requestData.clientType);
                            break;
                        case 2: //bankcard
                            proposalType = constProposalType.PLAYER_MANUAL_TOP_UP;
                            return dbPlayerTopUpRecord.addManualTopupRequest(null, playerData.playerId, requestData, "CLIENT");
                            break;
                        case 3: //alipay
                            proposalType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                            return dbPlayerTopUpRecord.requestAlipayTopup(null, playerData.playerId, amount, "test", "test", requestData.bonusCode, "CLIENT");
                            break;
                        case 4: //wechat
                            proposalType = constProposalType.PLAYER_WECHAT_TOP_UP;
                            return dbPlayerTopUpRecord.requestWechatTopup(!Boolean(requestData.useQR), null, playerData.playerId, amount, "test", "test", requestData.bonusCode, "CLIENT");
                            break;
                    }
                }
            }
        ).then(
            topUpResult => {
                if (topUpResult && topUpResult.proposalId) {
                    return dbconfig.collection_proposal.findOne({proposalId: topUpResult.proposalId}).lean().then(
                        pData => {
                            if (pData) {
                                return dbProposal.updateTopupProposal(pData.proposalId, constProposalStatus.SUCCESS, pData.data.requestId, 1).catch(
                                    error => {
                                        console.error(error);
                                    }
                                );
                            }
                        }
                    ).then(
                        data => topUpResult
                    );
                }
            }
        ).then(
            topUpResult => {
                if (topUpResult) {
                    if (createTime) {
                        console.log('createTime ricco1', createTime);
                        let proposalProm = dbconfig.collection_proposal.findOne({
                            proposalId: topUpResult.proposalId
                        }).lean().then(
                            proposalData => {
                                if (proposalData) {
                                    return dbconfig.collection_proposal.remove({_id: proposalData._id}).then(
                                        res => {
                                            delete proposalData._id;
                                            delete proposalData.proposalId;
                                            proposalData.createTime = dbUtility.getSGTimeOf(createTime);
                                            proposalData.settleTime = dbUtility.getSGTimeOf(createTime);
                                            let newProposal = new dbconfig.collection_proposal(proposalData);
                                            return newProposal.save();
                                        }
                                    );
                                }
                            }
                        );
                        let recordProm = dbconfig.collection_playerTopUpRecord.find({
                            playerId: playerObj._id,
                            platformId: playerObj.platform,
                            amount: amount,
                            createTime: {$gte: currentTime}
                        }).sort({createTime: -1}).limit(1).lean().then(
                            recordData => {
                                if (recordData && recordData[0]) {
                                    return dbconfig.collection_playerTopUpRecord.remove({_id: recordData[0]._id}).then(
                                        res => {
                                            delete recordData[0]._id;
                                            recordData[0].createTime = dbUtility.getSGTimeOf(createTime);
                                            recordData[0].settlementTime = dbUtility.getSGTimeOf(createTime);
                                            let newRecord = new dbconfig.collection_playerTopUpRecord(recordData[0]);
                                            return newRecord.save();
                                        }
                                    );
                                }
                            }
                        );
                        return Q.all([proposalProm, recordProm]);
                    }
                    else {
                        return topUpResult;
                    }
                }
            }
        );
    },

    requestProposalSuccessPMS: function (proposalId, status) {
        return pmsAPI.payment_requestProposalSuccess({proposalId: proposalId, status: status}).then(
            topUpResult => {
                if (topUpResult) {
                    return dbconfig.collection_proposal.findOne({proposalId: proposalId}).lean().then(
                        pData => {
                            if (pData) {
                                return dbProposal.updateTopupProposal(pData.proposalId, constProposalStatus.SUCCESS, pData.data.requestId, 1);
                            }
                        }
                    );
                }
            }
        );
    }

};

function checkLimitedOfferIntention(platformObjId, playerObjId, topUpAmount, limitedOfferObjId) {
    if (!limitedOfferObjId) return false;

    return dbconfig.collection_proposalType.findOne({
        platformId: platformObjId,
        name: constProposalType.PLAYER_LIMITED_OFFER_INTENTION
    }).lean().then(
        proposalTypeData => {
            if (proposalTypeData) {
                let query = {
                    'data.platformObjId': platformObjId,
                    'data.playerObjId': playerObjId,
                    'data.applyAmount': topUpAmount,
                    'data.topUpProposalObjId': {$exists: false},
                    type: proposalTypeData._id
                };
                if (limitedOfferObjId) {
                    query['data.limitedOfferObjId'] = limitedOfferObjId;
                }
                return dbconfig.collection_proposal.findOne(query).sort({createTime: -1}).lean();
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
    Arrs.forEach(item => {
        let currentNum = Number(item);
        if (isNaN(currentNum) == false) {
            result.push(currentNum);
        }
    })
    return result;
}

function checkInterfaceRewardPermission(eventData, device) {
    let isForbidInterface = false;

    // Check registration interface condition
    if (eventData.condition.userAgent && eventData.condition.userAgent.length > 0 && device >= 0) {
        let registrationInterface = device ? device : 0;

        isForbidInterface = eventData.condition.userAgent.indexOf(registrationInterface.toString()) < 0;
    }

    return isForbidInterface;
}

function checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, inputData, topUpMethod) {
    let rewardEvent;
    let taskData;
    let rewardParam;
    let intervalTime;
    let applyAmount = inputData.amount? inputData.amount: 0;
    let selectedRewardParam = {};

    if (player.permission && player.permission.banReward) {
        return Q.reject({
            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
            name: "DataError",
            message: "Player do not have permission for reward"
        });
    }
    return dbRewardTask.checkPlayerRewardTaskStatus(player._id).then(
        taskStatus => {
            return dbconfig.collection_rewardEvent.findOne({
                platform: player.platform,
                code: topUpReturnCode
            }).populate({path: "type", model: dbconfig.collection_rewardType}).lean();
        }
    ).then(
        rewardEventData => {
            rewardEvent = rewardEventData;
            if (rewardEvent && rewardEvent.type && rewardEvent.type.name && (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN_GROUP
                    || rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN)) {
                // Check reward individual permission
                let playerIsForbiddenForThisReward = dbPlayerReward.isRewardEventForbidden(player, rewardEvent._id);
                if (playerIsForbiddenForThisReward) {
                    return Q.reject({
                        name: "DataError",
                        message: "Player is forbidden for this reward."
                    });
                }

                if (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN) {
                    let taskProm;
                    if (!player.platform.canMultiReward && player.platform.useLockedCredit) {
                        taskProm = dbRewardTask.getRewardTask(
                            {
                                playerId: player._id,
                                status: constRewardTaskStatus.STARTED,
                                useLockedCredit: true
                            }
                        );
                    }
                    else {
                        taskProm = Q.resolve(false);
                    }
                    return taskProm.then(
                        rewardTaskData => {
                            taskData = rewardTaskData;
                            return dbconfig.collection_proposal.findOne({
                                // type: proposalTypeData._id,
                                status: {$in: [constProposalStatus.PENDING, constProposalStatus.PROCESSING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                "data.playerObjId": player._id,
                                settleTime: {$gte: rewardEvent.validStartTime, $lt: rewardEvent.validEndTime},
                                "data.eventCode": rewardEvent.code
                            }).lean();
                        }
                    ).then(
                        appliedProposal => {
                            if (!appliedProposal) {
                                if (taskData) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_HAS_REWARD_TASK,
                                        name: "DataError",
                                        message: "The player has not unlocked the previous reward task. Not valid for new reward"
                                    });
                                }

                                if (!rewardUtility.isValidRewardEvent(constRewardType.PLAYER_TOP_UP_RETURN, rewardEvent)) {
                                    return Q.reject({
                                        status: constServerCode.REWARD_EVENT_INVALID,
                                        name: "DataError",
                                        message: "Cannot find top up return event data for platform"
                                    });
                                }

                                rewardParam = rewardEvent.param.reward[player.playerLevel.value];
                                if (!rewardParam) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                        name: "DataError",
                                        message: "Player is not valid for this reward"
                                    });
                                }

                                if (rewardParam.maxDailyRewardAmount <= player.dailyTopUpIncentiveAmount) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                        name: "DataError",
                                        message: "Claimed reward reach daily max amount, fail to claim reward"
                                    });
                                }

                                if (applyAmount < rewardParam.minTopUpAmount) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                        name: "DataError",
                                        message: "Insufficient top up amount, fail to claim reward"
                                    });
                                }
                                return Promise.resolve(rewardEvent);
                            } else {
                                return Q.reject({
                                    status: constServerCode.PLAYER_NOT_VALID_FOR_REWARD,
                                    name: "DataError",
                                    message: "The player already has this reward. Not Valid for the reward."
                                });
                            }

                        }
                    )

                } else {
                    // Set reward param for player level to use
                    if (rewardEvent.condition.isPlayerLevelDiff) {
                        selectedRewardParam = rewardEvent.param.rewardParam.filter(e => e.levelId == String(player.playerLevel._id))[0].value;
                    } else {
                        selectedRewardParam = rewardEvent.param.rewardParam[0].value;
                    }

                    //check valid time for reward event
                    let curTime = new Date();
                    if ((rewardEvent.validStartTime && curTime.getTime() < rewardEvent.validStartTime.getTime()) ||
                        (rewardEvent.validEndTime && curTime.getTime() > rewardEvent.validEndTime.getTime())) {
                        return Q.reject({
                            status: constServerCode.REWARD_EVENT_INVALID,
                            name: "DataError",
                            message: "This reward event is not valid anymore"
                        });
                    }

                    // The following behavior can generate reward task
                    let rewardTaskWithProposalList = [
                        constRewardType.PLAYER_TOP_UP_RETURN,
                        constRewardType.PLAYER_TOP_UP_RETURN_GROUP
                    ];

                    let pendingCount = Promise.resolve(0);
                    if (player.platform && player.platform.useLockedCredit) {
                        pendingCount = dbRewardTask.getPendingRewardTaskCount({
                            mainType: 'Reward',
                            "data.playerObjId": player._id,
                            status: 'Pending'
                        }, rewardTaskWithProposalList);
                    }

                    let rewardData = {};

                    if (rewardEvent.condition && rewardEvent.condition.interval) {
                        intervalTime = dbRewardUtil.getRewardEventIntervalTime(rewardData, rewardEvent);
                    }
                    let todayTime = dbUtility.getTodaySGTime();

                    let eventQuery = {
                        "data.platformObjId": player.platform._id,
                        "data.playerObjId": player._id,
                        "data.eventId": rewardEvent._id,
                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        settleTime: {$gte: todayTime.startTime, $lt: todayTime.endTime}
                    };

                    let topupMatchQuery = {
                        playerId: player._id,
                        platformId: player.platform._id
                    };

                    if (rewardEvent.condition && rewardEvent.condition.topupType && rewardEvent.condition.topupType.length > 0) {
                        topupMatchQuery.topUpType = {$in: rewardEvent.condition.topupType}
                    }

                    if (rewardEvent.condition && rewardEvent.condition.onlineTopUpType && rewardEvent.condition.onlineTopUpType.length > 0) {
                        if (!topupMatchQuery.$and) {
                            topupMatchQuery.$and = [];
                        }

                        topupMatchQuery.$and.push({$or: [{merchantTopUpType: {$in: rewardEvent.condition.onlineTopUpType}}, {merchantTopUpType: {$exists: false}}]});
                    }

                    if (rewardEvent.condition && rewardEvent.condition.bankCardType && rewardEvent.condition.bankCardType.length > 0) {
                        if (!topupMatchQuery.$and) {
                            topupMatchQuery.$and = [];
                        }

                        topupMatchQuery.$and.push({$or: [{bankCardType: {$in: rewardEvent.condition.bankCardType}}, {bankCardType: {$exists: false}}]});
                    }

                    if (intervalTime) {
                        topupMatchQuery.createTime = {
                            $gte: intervalTime.startTime,
                            $lte: intervalTime.endTime
                        };
                        eventQuery.settleTime = {
                            $gte: intervalTime.startTime,
                            $lte: intervalTime.endTime
                        };
                    }
                    let eventInPeriodProm = Promise.resolve([]);
                    if (rewardEvent.param && rewardEvent.param.countInRewardInterval) {
                        eventInPeriodProm = dbconfig.collection_proposal.find(eventQuery).lean();
                    }

                    let topupInPeriodProm = Promise.resolve([]);
                    if (rewardEvent.condition.topUpCountType && rewardEvent.condition) {
                        topupInPeriodProm = dbconfig.collection_playerTopUpRecord.find(topupMatchQuery).lean();
                    }
                    // let rewardData = {};

                    return Promise.all([pendingCount, eventInPeriodProm, topupInPeriodProm]).then(
                        timeCheckData => {
                            // rewardData.selectedTopup = timeCheckData[0];
                            let eventInPeriodCount = timeCheckData[1].length;
                            let topupInPeriodCount = timeCheckData[2].length + 1; // + 1 for current top up
                            let rewardAmountInPeriod = timeCheckData[1].reduce((a, b) => a + b.data.rewardAmount, 0);

                            // if there is a pending reward, then no other reward can be applied.
                            if (timeCheckData[0] && timeCheckData[0] > 0) {
                                if (rewardTaskWithProposalList.indexOf(rewardEvent.type.name) != -1) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_PENDING_REWARD_PROPOSAL,
                                        name: "DataError",
                                        message: "Player or partner already has a pending reward proposal for this type"
                                    });
                                }
                            }

                            let topUpDevice = dbUtility.getInputDevice(userAgentStr, false);

                            //check device
                            if (checkInterfaceRewardPermission(rewardEvent, topUpDevice)) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Top up device does not match, fail to claim reward"
                                });
                            }
                            // check correct topup type
                            let correctTopUpType = true;
                            let correctMerchantType = true;
                            let correctBankCardType = true;

                            if (rewardEvent.condition && rewardEvent.condition.topupType && rewardEvent.condition.topupType.length > 0
                                // && rewardEvent.condition.topupType.indexOf(constPlayerTopUpType.MANUAL.toString()) === -1) {
                                && rewardEvent.condition.topupType.indexOf(topUpMethod.toString()) === -1) {
                                correctTopUpType = false;
                            }

                            if (rewardEvent.condition && rewardEvent.condition.bankCardType && inputData.bankTypeId
                                && rewardEvent.condition.bankCardType.length > 0 && rewardEvent.condition.bankCardType.indexOf(inputData.bankTypeId) === -1) {
                                correctBankCardType = false;
                            }

                            if (rewardEvent.condition && rewardEvent.condition.onlineTopUpType && inputData.topupType
                                && rewardEvent.condition.onlineTopUpType.length > 0 && rewardEvent.condition.onlineTopUpType.indexOf(inputData.topupType) === -1) {
                                correctMerchantType = false;
                            }


                            if (!correctTopUpType) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Top up type does not match, fail to claim reward"
                                });
                            }
                            if (!correctBankCardType) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Bank card type does not match, fail to claim reward"
                                });
                            }
                            if (!correctMerchantType) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Online top up type does not match, fail to claim reward"
                                });
                            }
                            // Check top up count within period
                            if (rewardEvent.condition.topUpCountType) {
                                let intervalType = rewardEvent.condition.topUpCountType[0];
                                let value1 = rewardEvent.condition.topUpCountType[1];
                                let value2 = rewardEvent.condition.topUpCountType[2];

                                const hasMetTopupCondition =
                                    intervalType == "1" && topupInPeriodCount >= value1
                                    || intervalType == "2" && topupInPeriodCount <= value1
                                    || intervalType == "3" && topupInPeriodCount == value1
                                    || intervalType == "4" && topupInPeriodCount >= value1 && topupInPeriodCount < value2;

                                if (!hasMetTopupCondition) {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                        name: "DataError",
                                        message: "Top up count does not meet period condition, fail to claim reward"
                                    });
                                }
                            }
                            // Check reward apply limit in period
                            if (rewardEvent.param && rewardEvent.param.countInRewardInterval && rewardEvent.param.countInRewardInterval <= eventInPeriodCount) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Reward claimed exceed limit, fail to claim reward"
                                });
                            }

                            // Set reward param step to use
                            if (rewardEvent.param.isMultiStepReward) {
                                if (rewardEvent.param.isSteppingReward) {
                                    let eventStep = eventInPeriodCount >= selectedRewardParam.length ? selectedRewardParam.length - 1 : eventInPeriodCount;
                                    selectedRewardParam = selectedRewardParam[eventStep];
                                } else {
                                    let firstRewardParam = selectedRewardParam[0];
                                    selectedRewardParam = selectedRewardParam.filter(e => applyAmount >= e.minTopUpAmount).sort((a, b) => b.minTopUpAmount - a.minTopUpAmount);
                                    selectedRewardParam = selectedRewardParam[0] || firstRewardParam || {};
                                }
                            } else {
                                selectedRewardParam = selectedRewardParam[0];
                            }

                            if (applyAmount < selectedRewardParam.minTopUpAmount || !correctTopUpType) {
                                return Q.reject({
                                    status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                    name: "DataError",
                                    message: "Insufficient top up amount, fail to claim reward"
                                });
                            }

                            if (rewardEvent.condition.isDynamicRewardAmount) {
                                // Check reward amount exceed daily limit
                                if (rewardEvent.param.dailyMaxRewardAmount) {
                                    if (rewardAmountInPeriod >= rewardEvent.param.dailyMaxRewardAmount) {
                                        return Q.reject({
                                            status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                                            name: "DataError",
                                            message: "Claimed reward reach daily max amount, fail to claim reward"
                                        });
                                    }
                                }
                                selectedRewardParam.spendingTimes = selectedRewardParam.spendingTimes || 1;
                            }

                            return Promise.resolve(rewardEvent);
                        }
                    )
                }
            }
            else {
                return Q.reject({
                    status: constServerCode.REWARD_EVENT_INVALID,
                    name: "DataError",
                    message: "Can not find reward event"
                });
            }
        }
    );
}

// end of count user /merchant
var proto = dbPlayerTopUpRecordFunc.prototype;
proto = Object.assign(proto, dbPlayerTopUpRecord);

// This make WebStorm navigation work
module.exports = dbPlayerTopUpRecord;

function updateManualTopUpProposalBankLimit (proposalQuery, bankCardNo, isFPMS, platformId) {
    let prom;
    if (isFPMS && platformId) {
        prom = dbconfig.collection_platformBankCardList.findOne({accountNumber: bankCardNo, platformId: platformId}).lean().then(
            bankCardList => {
                return {data: bankCardList}
            }
        );
    } else {
        prom = pmsAPI.bankcard_getBankcard({accountNumber: bankCardNo});
    }
    return prom.then(
        bankCard => {
            if (bankCard && bankCard.data && bankCard.data.quota) {
                return dbconfig.collection_proposal.update(proposalQuery, {"data.dailyCardQuotaCap": bankCard.data.quota});
            }
        }
    );
}

function updateAliPayTopUpProposalDailyLimit (proposalQuery, accNo, isFPMS, platformId) {
    let prom;
    if (isFPMS && platformId) {
        prom = dbconfig.collection_platformAlipayList.findOne({accountNumber: accNo, platformId: platformId}).lean().then(
            alipayList => {
                return {data: alipayList}
            }
        );
    } else {
        prom = pmsAPI.alipay_getAlipay({accountNumber: accNo});
    }
    return prom.then(
        aliPay => {
            if (aliPay && aliPay.data && (aliPay.data.quota || aliPay.data.singleLimit)) {
                return dbconfig.collection_proposal.update(proposalQuery, {
                    "data.dailyCardQuotaCap": aliPay.data.quota?  aliPay.data.quota: 0,
                    "data.singleLimit": aliPay.data.singleLimit?  aliPay.data.singleLimit: 0
                });
            }
        }
    );
}

function updateWeChatPayTopUpProposalDailyLimit (proposalQuery, accNo, isFPMS, platformId) {
    let prom;
    if (isFPMS && platformId) {
        prom = dbconfig.collection_platformWechatPayList.findOne({accountNumber: accNo, platformId: platformId}).lean().then(
            wechatList => {
                return {data: wechatList}
            }
        );
    } else {
        prom = pmsAPI.weChat_getWechat({accountNumber: accNo});
    }
    return prom.then(
        wechatPay => {
            if (wechatPay && wechatPay.data && (wechatPay.data.quota || wechatPay.data.singleLimit )) {
                return dbconfig.collection_proposal.update(proposalQuery, {
                    "data.dailyCardQuotaCap": wechatPay.data.quota?  wechatPay.data.quota: 0,
                    "data.singleLimit": wechatPay.data.singleLimit?  wechatPay.data.singleLimit: 0
                });
            }
        }
    );
}

function updateOnlineTopUpProposalDailyLimit (proposalQuery, merchantNo) {
    let merchantObj;
    return pmsAPI.merchant_getMerchant({merchantNo: merchantNo}).then(
        merchantData => {
            merchantObj = merchantData;
            if (merchantData && merchantData.merchant && merchantData.merchant.merchantTypeId) {
                return pmsAPI.merchant_getMerchantType({merchantTypeId: merchantData.merchant.merchantTypeId})
            }
        }
    ).then(
        merchantType => {
            if (merchantObj && merchantObj.merchant && (merchantObj.merchant.permerchantLimits || merchantObj.merchant.transactionForPlayerOneDay)) {
                return dbconfig.collection_proposal.update(proposalQuery, {
                    "data.permerchantLimits": merchantObj.merchant.permerchantLimits ? merchantObj.merchant.permerchantLimits : 0,
                    "data.transactionForPlayerOneDay": merchantObj.merchant.transactionForPlayerOneDay ? merchantObj.merchant.transactionForPlayerOneDay : 0,
                    "data.merchantUseName": merchantType && merchantType.merchantType && merchantType.merchantType.name ? merchantType.merchantType.name : ""
                });
            }
        }
    )
}

function updateProposalRemark (proposalData, remark) {
    if(proposalData && proposalData._id){
        return dbconfig.collection_proposal.findByIdAndUpdate(proposalData._id, {'data.remark': remark})
    }
    else{
        return Promise.resolve(true);
    }

}
