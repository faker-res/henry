var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constSystemParam = require('../const/constSystemParam');
var mongoose = require('mongoose');
var constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');

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

        function getTopupCoountWithinPeriod(feedback) {
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
                        if (feedback.result == constPlayerFeedbackResult.NORMAL) {
                            proms.push(
                                getTopupCoountWithinPeriod(feedback)
                            )
                        } else {
                            proms.push(Q.resolve({}));
                        }
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

    getPlayerFeedbackQuery: function (query, index) {
        index = index || 0;
        query["$where"] = "(this.lastAccessTime > this.lastFeedbackTime || !this.lastFeedbackTime )&& !this.noMoreFeedback";
        var a = dbconfig.collection_players.find(query).skip(index).limit(1)
            .populate({path: "partner", model: dbconfig.collection_partner});
        var b = dbconfig.collection_players.find(query).count();
        return Q.all([a, b]).then(data => {
            return {
                data: data[0] ? data[0][0] : {},
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
        return dbconfig.collection_playerFeedback.find({playerId: playerId}).sort({createTime: 1}).limit(limit)
            .populate({path: "adminId", model: dbconfig.collection_admin}).exec();
    }
};

module.exports = dbPlayerFeedback;