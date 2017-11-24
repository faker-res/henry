var socketUtil = require('./../modules/socketutility');
var dbRewardPointsLvlConfig = require("./../db_modules/dbRewardPointsLvlConfig");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionRewardPointsLvlConfig(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        getRewardPointsLvlConfig: function getRewardPointsLvlConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardPointsLvlConfig.getRewardPointsLvlConfig, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        upsertRewardPointsLvlConfig: function upsertRewardPointsLvlConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.rewardPointsLvlConfig);
            socketUtil.emitter(self.socket, dbRewardPointsLvlConfig.upsertRewardPointsLvlConfig, [data.rewardPointsLvlConfig], actionName, isValidData);
        }
    };

    socketActionRewardPointsLvlConfig.actions = this.actions;
};

module.exports = socketActionRewardPointsLvlConfig;
