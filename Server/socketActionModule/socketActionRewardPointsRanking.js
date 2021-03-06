var socketUtil = require('./../modules/socketutility');
var dbRewardPointsRanking = require("../db_modules/dbRewardPointsRanking");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionRewardPointsRanking(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        getRewardPoints: function getRewardPoints (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            var limit = data.limit || 10;
            var index = data.index || 0;
            socketUtil.emitter(self.socket, dbRewardPointsRanking.getRewardPoints, [ObjectId(data.platformObjId),index, limit, data.sortCol], actionName, isValidData);
        },

        getRewardPointsRandom: function getRewardPointsRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            var limit = data.limit || 10;
            var index = data.index || 0;
            socketUtil.emitter(self.socket, dbRewardPointsRanking.getRewardPointsRandom, [ObjectId(data.platformObjId),index, limit, data.sortCol], actionName, isValidData);
        },

        updateRewardPointsRankingRandom: function updateRewardPointsRankingRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.platformObjId && data.points && data.playerName && data.playerLevel && data.lastUpdate);
            let query = {};
            let updateData = {};
            if (isValidData) {
                query = {
                    _id: ObjectId(data._id),
                    platformObjId: ObjectId(data.platformObjId)
                };
                updateData = {
                    points: data.points,
                    playerName: data.playerName,
                    playerLevel: data.playerLevel,
                    lastUpdate: data.lastUpdate
                }
            }
            socketUtil.emitter(self.socket, dbRewardPointsRanking.updateRewardPointsRankingRandom, [query, updateData], actionName, isValidData);
        },

        deleteRewardPointsRankingRandom: function deleteRewardPointsRankingRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardPointsRanking.deleteRewardPointsRankingRandom, [data], actionName, isValidData);
        },

        deleteMultipleRewardPointsRankingRandom: function deleteMultipleRewardPointsRankingRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjIds && data.playerObjIds.length > 0);
            socketUtil.emitter(self.socket, dbRewardPointsRanking.deleteMultipleRewardPointsRankingRandom, [data], actionName, isValidData);
        },

        getRewardPointsRandomDataConfig: function getRewardPointsRandomDataConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardPointsRanking.getRewardPointsRandomDataConfig, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        insertRewardPointsRandom: function insertRewardPointsRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = false;
            for (let i = 0; i < data.length; i++) {
                if (data && data[i].platformObjId && data[i].playerName && data[i].points && data[i].playerLevel) {
                    isValidData = true;
                    if (!isValidData)
                        break;
                } else {
                    isValidData = false;
                    break;
                }
            }
            socketUtil.emitter(self.socket, dbRewardPointsRanking.insertRewardPointsRandom, [data], actionName, isValidData);
        },

        upsertRewardPointsRandomDataConfig: function upsertRewardPointsRandomDataConfig (data) {
            let isValidData = Boolean(data && data.platformObjId);
            if (data && data.condition) {
                for (let i = 0; i < data.condition.length; i++) {
                    if (data.condition[i] && data.condition[i].prefix && data.condition[i].minAccountLength && data.condition[i].maxAccountLength
                        && (data.condition[i].isRandomAlphabet || data.condition[i].isRandomDigit) && data.condition[i].minRewardPoints
                        && data.condition[i].maxRewardPoints  && data.condition[i].lowestLevel
                        && (data.condition[i].maxRewardPoints >= data.condition[i].minRewardPoints) && (data.condition[i].maxAccountLength >= data.condition[i].minAccountLength)) {
                        if (!data.condition[i].randomCount) {
                            data.condition[i].randomCount = 0;
                        }
                        isValidData = (isValidData && true);
                        if (!isValidData)
                            break;
                    } else {
                        isValidData = (isValidData && false);
                        break;
                    }
                }
            } else {
                isValidData = false;
            }
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbRewardPointsRanking.upsertRewardPointsRandomDataConfig, [data], actionName, isValidData);
        }
    };

    socketActionRewardPointsRanking.actions = this.actions;
};

module.exports = socketActionRewardPointsRanking;
