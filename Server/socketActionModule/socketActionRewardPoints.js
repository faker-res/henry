var socketUtil = require('./../modules/socketutility');
var dbRewardPoints = require("./../db_modules/dbRewardPoints");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionRewardPoints(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        getRewardPoints: function getRewardPoints (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            var limit = data.limit || 10;
            var index = data.index || 0;
            socketUtil.emitter(self.socket, dbRewardPoints.getRewardPoints, [ObjectId(data.platformObjId),index, limit, data.sortCol], actionName, isValidData);
        },

        getRewardPointsRandom: function getRewardPointsRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            var limit = data.limit || 10;
            var index = data.index || 0;
            socketUtil.emitter(self.socket, dbRewardPoints.getRewardPointsRandom, [ObjectId(data.platformObjId),index, limit, data.sortCol], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbRewardPoints.updateRewardPointsRankingRandom, [query, updateData], actionName, isValidData);
        },

        deleteRewardPointsRankingRandom: function deleteRewardPointsRankingRandom (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardPoints.deleteRewardPointsRankingRandom, [data], actionName, isValidData);
        },

        getRewardPointsRandomDataConfig: function getRewardPointsRandomDataConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardPoints.getRewardPointsRandomDataConfig, [ObjectId(data.platformObjId)], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbRewardPoints.insertRewardPointsRandom, [data], actionName, isValidData);
        },

        upsertRewardPointsRandomDataConfig: function upsertRewardPointsRandomDataConfig (data) {
            let isValidData = Boolean(data && data.platformObjId);
            if (data && data.condition) {
                for (let i = 0; i < data.condition.length; i++) {
                    if (data.condition && data.condition[i].prefix && data.condition[i].minAccountLength && data.condition[i].maxAccountLength
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
            socketUtil.emitter(self.socket, dbRewardPoints.upsertRewardPointsRandomDataConfig, [data], actionName, isValidData);
        }
    };

    socketActionRewardPoints.actions = this.actions;
};

module.exports = socketActionRewardPoints;
