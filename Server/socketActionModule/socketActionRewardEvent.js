var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var socketUtil = require('./../modules/socketutility');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbUtil = require('./../modules/dbutility');
var constSettlementPeriod = require('./../const/constSettlementPeriod');
let dbPlayerReward = require('./../db_modules/dbPlayerReward');

function socketActionRewardEvent(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }
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
            if (data && data.platformId && data.platformId._id) {
                platformId = ObjectId(data.platformId._id);
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
            socketUtil.emitter(self.socket, dbRewardEvent.startPlatformRTGEventSettlement, [data.platformId, data.eventCode, getAdminId(), getAdminName()], actionName, isValidData);
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

        getTopUpRewardDayLimit: function getTopUpRewardDayLimit(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.rewardCode);
            socketUtil.emitter(self.socket, dbPlayerReward.getTopUpRewardDayLimit, [data.platformId, data.rewardCode], actionName, isValidData);
        },

        getPlayerRewardRetention: function getPlayerRewardRetention(data) {
            var actionName = arguments.callee.name;
            let diffDays;
            if (data.startTime && data.endTime) {
                let timeDiff =  new Date(data.endTime).getTime() - new Date(data.startTime).getTime();
                if (timeDiff >= 0) {
                    diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                }
            }
            var isValidData = Boolean(data && data.platform && data.eventObjId && data.startTime && data.endTime && data.days && diffDays && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            socketUtil.emitter(self.socket, dbPlayerReward.getPlayerRewardRetention, [ObjectId(data.platform), ObjectId(data.eventObjId), startTime, data.days, data.playerType, diffDays, data.isRealPlayer, data.isTestPlayer, data.hasPartner, data.domainList, data.devices], actionName, isValidData);
        },

        getDomainListFromApplicant: function getDomainListFromApplicant(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.eventObjId && data.startTime && data.endTime && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = dbUtil.getDayStartTime(data.startTime);
            var endTime = dbUtil.getDayEndTime(data.endTime);

            socketUtil.emitter(self.socket, dbPlayerReward.getDomainListFromApplicant, [ObjectId(data.platformId), ObjectId(data.eventObjId), startTime, endTime, data.isRealPlayer, data.isTestPlayer, data.hasPartner, data.playerType], actionName, isValidData);
        },
    };
    socketActionRewardEvent.actions = this.actions;
};

module.exports = socketActionRewardEvent;
