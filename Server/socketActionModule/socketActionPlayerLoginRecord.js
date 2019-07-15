/**
 * Created by hninpwinttin on 26/1/16.
 */
var encrypt = require('./../modules/encrypt');
var dbPlayerLoginRecord = require('./../db_modules/dbPlayerLoginRecord');
var socketUtil = require('./../modules/socketutility');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbUtil = require('./../modules/dbutility');

function socketActionPartner(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create PlayerLoginRecord: by PlayerLoginRecord data
         * @param {json} data - Player data. It has to contain correct data format
         */
        createPlayerLoginRecord: function createPlayerLoginRecord(data) {

            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.player);
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.createPlayerLoginRecord, [data], actionName, isValidData);
        },
        /**
         * getPlayerLoginLocation
         * @param {json} data - It has to contain _id of platform)
         */
        getPlayerLoginLocation: function getPlayerLoginLocation(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.player && data.date && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerLoginLocation, [ObjectId(data.platform), startTime, endTime, data.player, data.date, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },
        /**
         * getPlayerLoginLocationInCountry
         * @param {json} data - It has to contain platform and country name
         */
        getPlayerLoginLocationInCountry: function getPlayerLoginLocationInCountry(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.country && data.startTime && data.endTime && data.player && data.date && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerLoginLocationInCountry, [ObjectId(data.platform), data.country, startTime, endTime, data.player, data.date, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },
        /**
         * Get login player device count
         * @param {json} data - data contains _id
         */
        countLoginPlayerDevicebyPlatform: function countLoginPlayerDevicebyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.countLoginPlayerDevicebyPlatform, [ObjectId(data.platformId), startTime, endTime, data.period, data.isRealPlayer, data.isTestPlayer, data.hasPartner, data.isDuplicateLogin], actionName, isValidData);
        },
        /**
         * Get login player count
         * @param {json} data - data contains _id
         */
        countLoginPlayerbyPlatform: function countLoginPlayerbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.countLoginPlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime, data.period, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },

        countLoginPlayerbyPlatformWeek: function countLoginPlayerbyPlatformWeek(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.countLoginPlayerbyPlatformWeek, [startTime, endTime, platform], actionName, isValidData);
        },

        /**
         * Get login player count
         * @param {json} data - data contains _id
         */
        countLoginPlayerAllPlatform: function countLoginPlayerAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.countLoginPlayerbyPlatform, [platform, startTime, endTime, 'day'], actionName, isValidData);
        },
        getIpHistory: function getIpHistory(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getIpHistory, [ObjectId(data.playerId)], actionName, isValidData);
        },

        getPlayerDomainAnalysisData: function getPlayerDomainAnalysisData(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerDomainAnalysisData, [ObjectId(data.platformId), startTime, endTime, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },
        /**
         * getPlayerRetention
         * @param {json} data - It has to contain platform and retention parameters
         */
        getDomainList: function getDomainList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = dbUtil.getDayStartTime(data.startTime);
            var endTime = dbUtil.getDayEndTime(data.endTime);
            
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getDomainList, [ObjectId(data.platformId), startTime, endTime, data.isRealPlayer, data.isTestPlayer, data.hasPartner, data.playerType], actionName, isValidData);
        },

        getPlayerRetention: function getPlayerRetention(data) {
            var actionName = arguments.callee.name;
            let diffDays;
            if (data.startTime && data.endTime) {
                let timeDiff =  new Date(data.endTime).getTime() - new Date(data.startTime).getTime();
                if (timeDiff >= 0) {
                    diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // + 1 to include end day
                }
            }
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.days && diffDays && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerRetention, [ObjectId(data.platform), startTime, data.days, data.playerType, diffDays, data.isRealPlayer, data.isTestPlayer, data.hasPartner, data.domainList, null, data.devices], actionName, isValidData);
        },
        /**
         * getPlayerLoginRecord
         * @param {json} data - It has to contain platform and retention parameters
         */

        getPlayerLoginRecord: function getPlayerLoginRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            var inputDeviceType = data.inputDeviceType;
            var period = data.period;
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerLoginRecord, [platform, startTime, endTime, period, inputDeviceType], actionName, isValidData);
       },


    };
    socketActionPartner.actions = this.actions;
};

module.exports = socketActionPartner;
