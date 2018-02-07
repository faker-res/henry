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
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.player && data.date);
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerLoginLocation, [ObjectId(data.platform), startTime, endTime, data.player, data.date], actionName, isValidData);
        },
        /**
         * getPlayerLoginLocationInCountry
         * @param {json} data - It has to contain platform and country name
         */
        getPlayerLoginLocationInCountry: function getPlayerLoginLocationInCountry(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.country && data.startTime && data.endTime && data.player && data.date);
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerLoginLocationInCountry, [ObjectId(data.platform), data.country, startTime, endTime, data.player, data.date], actionName, isValidData);
        },

        /**
         * Get login player count
         * @param {json} data - data contains _id
         */
        countLoginPlayerbyPlatform: function countLoginPlayerbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.countLoginPlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
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
            var isValidData = Boolean(data && data.platformId);
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerDomainAnalysisData, [ObjectId(data.platformId), startTime, endTime], actionName, isValidData);
        },
        /**
         * getPlayerRetention
         * @param {json} data - It has to contain platform and retention parameters
         */
        getPlayerRetention: function getPlayerRetention(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.startTime && data.days);
            var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerRetention, [ObjectId(data.platform), startTime, data.days], actionName, isValidData);
        }
    };
    socketActionPartner.actions = this.actions;
};

module.exports = socketActionPartner;