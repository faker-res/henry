var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var socketUtil = require('./../modules/socketutility');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbUtil = require('./../modules/dbutility');
var constSettlementPeriod = require('./../const/constSettlementPeriod');

function socketActionRewardEvent(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {
        /**
         * Create reward event
         *  @param {json} data - reward rule data
         */
        createRewardEvent: function createRewardEvent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbRewardEvent.createRewardEvent, [data], actionName, isValidData);
        },

        createRewardEventGroup: function createRewardEventGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.platform);
            socketUtil.emitter(self.socket, dbRewardEvent.createRewardEventGroup, [data], actionName, isValidData);
        },

        /**
         * Get one Reward event
         * @param {json} data - data has to contain _id
         */
        getRewardEventById: function getRewardEventById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbRewardEvent.getRewardEvent, [data], actionName, isValidData);
        },

        /**
         * Get all reward events for platform
         * @param {json} data - data has to contain platform
         */
        getAllPromoCode: function getAllPromoCode() {
            var actionName = arguments.callee.name;
            var isValidData = true;
            socketUtil.emitter(self.socket, dbRewardEvent.getAllPromoCode, [], actionName, isValidData);
        },

        getRewardEventsForPlatform: function getRewardEventsForPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbRewardEvent.getRewardEvents, [{platform: data.platform}], actionName, isValidData);
        },

        getRewardEventGroup: function getRewardEventGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbRewardEvent.getRewardEventGroup, [{platform: data.platform}], actionName, isValidData);
        },

        /**
         * Update one Reward event
         *  @param {json} data - data has to contain query and updateData
         */
        updateRewardEvent: function updateRewardEvent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbRewardEvent.updateRewardEvent, [data.query, data.updateData], actionName, isValidData);
        },

        updateRewardEventGroup: function updateRewardEventGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbRewardEvent.updateRewardEventGroup, [data.query, data.updateData], actionName, isValidData);
        },

        updateForbidRewardEvents: function updateForbidRewardEvents(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardEvent.updateForbidRewardEvents, [data], actionName, isValidData);
        },

        updateExpiredRewardEventToGroup: function updateExpiredRewardEventToGroup(data) {
        var actionName = arguments.callee.name;
        var isValidData = Boolean(data && data.query && data.updateData);
        socketUtil.emitter(self.socket, dbRewardEvent.updateExpiredRewardEventToGroup, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * delete Reward events by id
         * @param {json} data - data has to contain _ids
         */
        deleteRewardEventByIds: function deleteRewardEventByIds(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbRewardEvent.removeRewardEventsById, [data._ids, data.name, data.platform], actionName, isValidData);
        },

        removeRewardEventGroup: function removeRewardEventGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbRewardEvent.removeRewardEventGroup, [data.query], actionName, isValidData);
        },

        /**
         * get Reward events data
         * @param {json} data - data has to contain _ids
         */
        getPlatformRewardAnalysis: function getPlatformRewardAnalysis(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var platformId;
            var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : new Date();
            if (data && data.platformId && ObjectId(data.platformId)) {
                platformId = ObjectId(data.platformId);
            }
            var isValidData = Boolean(data && data.type && data.period && platformId && data.eventName);
            if (isValidData) {
                args = [data.type, data.period, platformId, startTime, endTime, data.eventName];
            }
            socketUtil.emitter(self.socket, dbRewardTask.getPlatformRewardAnalysis, args, actionName, isValidData);
        },
        /**
         * Get all settlement period
         */
        getAllSettlementPeriod: function getAllSettlementPeriod(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constSettlementPeriod});
        },

        startPlatformRTGEventSettlement: function startPlatformRTGEventSettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.eventCode);
            socketUtil.emitter(self.socket, dbRewardEvent.startPlatformRTGEventSettlement, [data.platformId, data.eventCode], actionName, isValidData);
        },
        /**
        * Assign Random Reward to Specific Player
        */
        assignRandomRewardToUser: function assignRandomRewardToUser(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.reward && data.randomRewards);
            socketUtil.emitter(self.socket, dbRewardEvent.assignRandomRewardToUser, [data.randomRewards, data.platformId, data.reward, data.creator], actionName, isValidData);
        },

        editRandomRewardToUser: function editRandomRewardToUser(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.reward && data.randomRewards);
            socketUtil.emitter(self.socket, dbRewardEvent.editRandomRewardToUser, [data.randomRewards, data.platformId, data.reward, data.creator], actionName, isValidData);
        },

        getRandomRewardDetail: function getRandomRewardDetail(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardEvent.getRandomRewardDetail, [data], actionName, isValidData);
        },

        getRewardByPlatform: function getRewardByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRewardEvent.getRewardEvents, [data.platform], actionName, isValidData);
        },
    };
    socketActionRewardEvent.actions = this.actions;
};

module.exports = socketActionRewardEvent;
