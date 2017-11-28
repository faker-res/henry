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

        updateRewardPointsRanking: function updateRewardPointsRanking (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerObjId && data.points && data.playerName && data.playerLevel);
            socketUtil.emitter(self.socket, dbRewardPoints.updateRewardPointsRanking, [data], actionName, isValidData);
        }
    };

    socketActionRewardPoints.actions = this.actions;
};

module.exports = socketActionRewardPoints;
