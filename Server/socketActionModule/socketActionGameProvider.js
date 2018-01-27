var dbGameProvider = require('./../db_modules/dbGameProvider');
var dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
var dailyProviderSettlement = require('../scheduleTask/dailyProviderSettlement');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var constProviderStatus = require('./../const/constProviderStatus');
var socketUtil = require('./../modules/socketutility');
var serverInstance = require('../modules/serverInstance');
var dbUtil = require('./../modules/dbutility');

function socketActionGame(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create GameProvider by GameProvider data
         * @param {json} data - GameProvider data
         */
        createGameProvider: function createGameProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbGameProvider.createGameProvider, [data], actionName, isValidData);
        },
        /**
         * Get all admin GameProvider
         */
        getAllGameProviders: function getAllGameProviders() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbGameProvider.getAllGameProviders, [{}], actionName);
        },
        /**
         * Get GameProvider by name or _id
         * @param {json} data - Query data. It has to contain name or _id
         */
        getGameProvider: function getGameProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data._id || data.name));
            socketUtil.emitter(self.socket, dbGameProvider.getGameProvider, [data], actionName, isValidData);
        },
        /**
         * Delete GameProvider by id
         * @param {json} data - It has to contain GameProvider id
         */
        deleteGameProvider: function deleteGameProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbGameProvider.delGameProvider, [data], actionName, isValidData);
        },
        /**
         * Update GameProvider by id
         * @param {json} data - It has to contain query(gameProvider Obj id) and updateData
         */
        updateGameProvider: function updateGameProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbGameProvider.updateGameProvider, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Get GameProvider player credit
         * @param {json} data - Query data. It has to contain playerId
         */
        getGameProviderPlayerCredit: function getGameProviderPlayerCredit(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.playerName && data.hasOwnProperty('platform'));
            socketUtil.emitter(self.socket, dbGameProvider.getGameProviderPlayerCredit, [data.playerId, data.playerName, data.platform], actionName, isValidData);
        },

        getPlayerCreditInProvider: function getPlayerCreditInProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.providerId && data.userName && data.platformId);
            socketUtil.emitter(self.socket, dbGameProvider.getPlayerCreditInProvider, [data.userName, data.platformId, data.providerId], actionName, isValidData);
        },

        /**
         * Get GameProvider consumption record
         * @param {json} data - Query data. It has to contain providerObjId
         */
        // getGameProviderConsumptionRecord: function getGameProviderConsumptionRecord(data) {
        //     var actionName = arguments.callee.name;
        //     var isValidData = Boolean(data && data.providerObjId);
        //
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : new Date();
        //     var query = {
        //         createTime: {
        //             $gte: startTime,
        //             $lt: endTime
        //         },
        //         providerId: data.providerObjId,
        //         platformId: data.platformId
        //     };
        //     socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getLatestConsumptionRecord, [query], actionName, isValidData);
        // },

        getPagedGameProviderConsumptionRecord: function getPagedGameProviderConsumptionRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.providerObjId);

            var argArr = [data, ObjectId(data.platformId), ObjectId(data.providerObjId), null, data.index, data.limit, data.sortCol];
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getPagedGameProviderConsumptionRecord, argArr, actionName, isValidData);
        },

        getConsumptionRecordByGameProvider: function getConsumptionRecordByGameProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.providerObjId);

            var argArr = [data, ObjectId(data.platformId), data.providerObjId && data.providerObjId != 'all' ? ObjectId(data.providerObjId) : null, data.playerName, data.index, data.limit, data.sortCol];
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getConsumptionRecordByGameProvider, argArr, actionName, isValidData);
        },

        /**
         * Get all game status
         */
        getAllProviderStatus: function getAllProviderStatus() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constProviderStatus});
        },

        /**
         * Start daily settlement for platform
         * @param {json} data - It has to contain platformId
         */
        startProviderDailySettlement: function startProviderDailySettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.providerId);
            socketUtil.emitter(self.socket, dailyProviderSettlement.fixYesterdayProviderDailySettlement, [ObjectId(data.providerId)], actionName, isValidData);
        },

        /**
         * Manually start daily settlement for provider
         * @param {json} data - It has to contain platformId
         */
        manualDailyProviderSettlement: function manualDailyProviderSettlement(data) {
            var actionName = arguments.callee.name;
            let sevenDayAgo = (new Date).setDate((new Date).getDate() - 7);
            var isValidData = Boolean(data && data.providerId && data.settlementDay && new Date(data.settlementDay) > sevenDayAgo);
            socketUtil.emitter(self.socket, dailyProviderSettlement.manualDailyProviderSettlement, [ObjectId(data.providerId), new Date(data.settlementDay), data.selectedPlatformID], actionName, isValidData);
        },

        /**
         * Get CPMS API server status
         * @param {json} data
         */
        getCPMSAPIStatus: function getCPMSAPIStatus(data) {
            var actionName = arguments.callee.name;
            var cpAPIClient = serverInstance.getCPAPIClient();
            var status = cpAPIClient ? cpAPIClient.isOpen() : false;
            self.socket.emit("_" + actionName, {success: true, data: status});
        },

        getConsumptionIntervalByProvider: function getConsumptionIntervalByProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.providerIds);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getConsumptionIntervalByProvider, [data.providerIds], actionName, isValidData);
        },

        /**
         * Get latest time record of provider
         * @param {json} data - It has to contain platformId
         */
        getProviderLatestTimeRecord: function getProviderLatestTimeRecord(data) {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getProviderLatestTimeRecord, [data.providerId,data.platformObjId], actionName);
        },

        checkTransferInSequence: function checkTransferInSequence(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerObjId && data.providerIdArr);
            socketUtil.emitter(self.socket, dbGameProvider.checkTransferInSequence, [data.platformObjId, data.playerObjId, data.providerIdArr], actionName, isValidData);
        },
    };
    socketActionGame.actions = this.actions;
};

module.exports = socketActionGame;