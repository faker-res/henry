const dbRewardTask = require('./../db_modules/dbRewardTask');
const dbRewardTaskGroup = require('./../db_modules/dbRewardTaskGroup');
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
         * TODO: (DEPRECATING) To change to getPlayerAllRewardTask after implement multiple player reward tasks
         * Get player's current reward task
         * @param {json} data - data has to contain _id
         */
        getPlayerCurRewardTask: function getPlayerCurRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerCurRewardTask, [data.playerId], actionName, isValidData);
        },

        /**
         * TODO: (DEPRECATING) To change to getPlayerAllRewardTask after implement multiple player reward tasks
         * @param data
         */
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
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerRewardTask, [data, data.index, data.limit, data.sortCol, data.useProviderGroup], actionName, isValidData);
        },
        getRewardTaskGroupProposal: function getRewardTaskGroupProposal(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTask.getRewardTaskGroupProposal, [data], actionName, isValidData);
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
            let userAgent = "";
            socketUtil.emitter(self.socket, dbPlayerReward.applyConsecutiveLoginReward, [userAgent, data.playerId, data.code, getAdminId(), getAdminName(), true], actionName, isValidData);
        },

        /**
         * Created: 12-06-2017
         * Get player's current reward task
         * @param {Object} data - data has to contain _id
         */
        getPlayerAllRewardTask: function getPlayerAllRewardTask(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerAllRewardTask, [data.playerId], actionName, isValidData);
        },

        /**
         *
         * @param data
         */
        getPlayerAllRewardTaskDetailByPlayerObjId: function getPlayerAllRewardTaskDetailByPlayerObjId(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerAllRewardTaskDetailByPlayerObjId, [data], actionName, isValidData);
        },

        getPlayerAllRewardTaskGroupDetailByPlayerObjId: function getPlayerAllRewardTaskGroupDetailByPlayerObjId(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId, [data], actionName, isValidData);
        },

        /**
         *
         * @param {Object} data
         */
        unlockRewardTaskInRewardTaskGroup: function unlockRewardTaskInRewardTaskGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.rewardTaskGroupId);
            // let isValidData = Boolean(data && data.rewardTaskGroupId && data.incRewardAmount && data.incConsumptionAmount);
            socketUtil.emitter(self.socket, dbRewardTaskGroup.unlockRewardTaskInRewardTaskGroup, [data.rewardTaskGroupId, data.incRewardAmount, data.incConsumptionAmount], actionName, isValidData);
        }
    };
    socketActionRewardTask.actions = this.actions;
};

module.exports = socketActionRewardTask;