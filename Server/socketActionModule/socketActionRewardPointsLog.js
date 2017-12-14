var socketUtil = require('./../modules/socketutility');
var dbRewardPointsLog = require("./../db_modules/dbRewardPointsLog");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionRewardPointsLog(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        getRewardPointsLogsQuery: function getRewardPointsLogsQuery (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardPointsLog.getRewardPointsLogsQuery, [data], actionName, isValidData);
        },

    };

    socketActionRewardPointsLog.actions = this.actions;
};

module.exports = socketActionRewardPointsLog;
