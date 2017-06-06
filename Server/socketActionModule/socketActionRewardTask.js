const dbRewardTask = require('./../db_modules/dbRewardTask');
const socketUtil = require('./../modules/socketutility');
const dbPlayerConsumptionWeekSummary = require('./../db_modules/dbPlayerConsumptionWeekSummary');
const dbPlayerReward = require('./../db_modules/dbPlayerReward');

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
        getPlayerRewardTask: function getPlayerRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerRewardTask, [data.playerId, data.from, data.to, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        manualUnlockRewardTask: function manualUnlockRewardTask(data) {
            // [0]: TaskData, [1]: PlayerData
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data[0] && data[1] && data[0].playerId && data[0].platformId);
            socketUtil.emitter(self.socket, dbRewardTask.manualUnlockRewardTask, [data, getAdminId(), getAdminName()], actionName, isValidData);
        },

        fixPlayerRewardAmount: function fixPlayerRewardAmount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.fixPlayerRewardAmount, [data.playerId], actionName, isValidData);
        },

        applyPreviousConsecutiveLoginReward: function applyPreviousConsecutiveLoginReward(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.code);
            socketUtil.emitter(self.socket, dbPlayerReward.applyPreviousConsecutiveLoginReward, [data.playerId, data.code], actionName, isValidData);
        }
    };
    socketActionRewardTask.actions = this.actions;
};

module.exports = socketActionRewardTask;