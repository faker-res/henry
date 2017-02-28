var dbRewardTask = require('./../db_modules/dbRewardTask');
var socketUtil = require('./../modules/socketutility');
var dbPlayerConsumptionWeekSummary = require('./../db_modules/dbPlayerConsumptionWeekSummary');

function socketActionRewardTask(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    var self = this;
    this.actions = {

        /**
         * Get player's current reward task
         * @param {json} data - data has to contain _id
         */
        getPlayerCurRewardTask: function getPlayerCurRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerCurRewardTask, [data.playerId], actionName, isValidData);
        },

        getPlayerCurRewardTaskDetailByPlayerId: function getPlayerCurRewardTaskDetailByPlayerId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerCurRewardTaskByPlayerId, [data], actionName, isValidData);
        },

        createPlayerRewardTask: function createPlayerRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.platformId && data.currentAmount);
            socketUtil.emitter(self.socket, dbRewardTask.manualCreateRewardTask, [data, getAdminId(), getAdminName()], actionName, isValidData);
        },

        getConsumeRebateAmount: function getConsumeRebateAmount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturn, [data.playerId], actionName, isValidData);
        },

        manualUnlockRewardTask: function manualUnlockRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.completeRewardTask, [data], actionName, isValidData);
        }
    };
    socketActionRewardTask.actions = this.actions;
};

module.exports = socketActionRewardTask;