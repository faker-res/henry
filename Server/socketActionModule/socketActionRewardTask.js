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

        createPlayerRewardTask: function createPlayerRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.platformId && data.currentAmount);
            socketUtil.emitter(self.socket, dbRewardTask.manualCreateReward, [data, getAdminId(), getAdminName()], actionName, isValidData);
        },

        getConsumeRebateAmount: function getConsumeRebateAmount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            let eventCode = data.eventCode? data.eventCode: "";
            socketUtil.emitter(self.socket, dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturn, [data.playerId,eventCode], actionName, isValidData);
        },
        getPlayerRewardTask: function getPlayerRewardTask(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerRewardTask, [data, data.index, data.limit, data.sortCol, data.useProviderGroup], actionName, isValidData);
        },
        getPlayerRewardTaskUnlockedRecord: function getPlayerRewardTaskUnlockedRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbRewardTask.getPlayerRewardTaskUnlockedRecord, [data], actionName, isValidData);
        },
        getRewardTaskGroupProposal: function getRewardTaskGroupProposal(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTask.getRewardTaskGroupProposal, [data], actionName, isValidData);
        },
        getRewardTaskGroupProposalById: function getRewardTaskGroupProposalById(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTask.getRewardTaskGroupProposalById, [data], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbRewardTaskGroup.unlockRewardTaskInRewardTaskGroup, [data.rewardTaskGroupId, data.incRewardAmount, data.incConsumptionAmount, getAdminId(), getAdminName(), data.platform, data.playerId], actionName, isValidData);
        },

        createRewardTaskGroupUnlockedRecord: function createRewardTaskGroupUnlockedRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.unlockTime);
            socketUtil.emitter(self.socket, dbRewardTaskGroup.createRewardTaskGroupUnlockedRecord, [data], actionName, isValidData);
        },

        startPlatformUnlockRewardTaskGroup: function startPlatformUnlockRewardTaskGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardTaskGroup.startPlatformUnlockRewardTaskGroup, [data.platformObjId], actionName, isValidData);
        },

        getConsumptionReturnPeriodTime: function getConsumptionReturnPeriodTime(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.period);
            socketUtil.emitter(self.socket, dbRewardTask.getConsumptionReturnPeriodTime, [data.period], actionName, isValidData);
        },

        getConsumptionReturnCurrentPeriodTime: function getConsumptionReturnCurrentPeriodTime(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.period);
            socketUtil.emitter(self.socket, dbRewardTask.getConsumptionReturnCurrentPeriodTime, [data.period], actionName, isValidData);
        },

        getPrevious10PlayerRTG: function getPrevious10PlayerRTG(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardTaskGroup.getPrevious10PlayerRTG, [data.platformId, data.playerId], actionName, isValidData);
        },
    };
    socketActionRewardTask.actions = this.actions;
};

module.exports = socketActionRewardTask;