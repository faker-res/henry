const dbPlatformQuickPayGroup = require('./../db_modules/dbPlatformQuickPayGroup');
const mongoose = require('mongoose');
const socketUtil = require('./../modules/socketutility');
const pmsAPI = require('../externalAPI/pmsAPI');
const serverInstance = require("../modules/serverInstance");
const ObjectId = mongoose.Types.ObjectId;

function socketActionQuickPayGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Get platform QuickPayGroup by platform data
         * @param {json} data - platformId
         */
        getPlatformQuickPayGroup: function getPlatformQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.getPlatformQuickPayGroup, [ObjectId(data.platform)], actionName, isValidData);
        },

        /**
         * Create platform QuickPayGroup by QuickPayGroup data
         * @param {json} data - QuickPayGroup data
         */
        addPlatformQuickPayGroup: function addPlatformQuickPayGroup(data) {
            console.log(data);
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.name && data.platform && data.code && data.displayName);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.addPlatformQuickPayGroup, [data.platform, data.name, data.code, data.displayName], actionName, isValidData);
        },

        /**
         * Rename platform QuickPayGroup
         * @param {json} query - query data
         * @param {json} update - update data
         */
        renamePlatformQuickPayGroup: function renamePlatformQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.updatePlatformQuickPayGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Get all the games by platform and the BankCardGroup
         * @param {json} data - query data
         */
        getIncludedQuickPayByQuickPayGroup: function getIncludedQuickPayByQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.quickPayGroup);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.getIncludedQuickPayByQuickPayGroup, [data.platform, data.quickPayGroup], actionName, isValidData);
        },

        /**
         * Get all the games which are not in this BankCardGroup
         * @param {json} data - query data
         */
        getExcludedQuickPayByQuickPayGroup: function getExcludedQuickPayByQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.quickPayGroup);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.getExcludedQuickPayByQuickPayGroup, [data.platform, data.quickPayGroup], actionName, isValidData);
        },

        /**
         * Update this QuickPayGroup / Add or Remove games into/from the group
         * @param {json} data - query data
         * @param {json} update - update data
         */
        updatePlatformQuickPayGroup: function updatePlatformQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.updatePlatformQuickPayGroup, [data.query, data.update], actionName, isValidData);
        },
        
        /**
         * Delete game group by id / Delete the QuickPayGroup and all its all sub-groups (all children)
         * @param {json} data - It has to contain ObjId of the group
         */
        deleteQuickPayGroup: function deleteQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.removeQuickPayGroup, [data._id], actionName, isValidData);
        },

        /**
         * Set default game group by platform and default group id
         * @param {json} data
         */
        setPlatformDefaultQuickPayGroup: function setPlatformDefaultQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.default);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.setPlatformDefaultQuickPayGroup, [data.platform, data.default], actionName, isValidData);
        },

        /**
         * Add multiple players to bank card group
         * @param {json} data
         */
        addPlayersToQuickPayGroup: function addPlayersToQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.bankQuickPayGroupObjId && data.playerObjIds && data.playerObjIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.addPlayersToQuickPayGroup, [data.bankQuickPayGroupObjId, data.playerObjIds], actionName, isValidData);
        },

        /**
         * Add all players to QuickPay group
         * @param {json} data
         */
        addAllPlayersToQuickPayGroup: function addAllPlayersToQuickPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.bankQuickPayGroupObjId && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatformQuickPayGroup.addAllPlayersToQuickPayGroup, [data.bankQuickPayGroupObjId, data.platformObjId], actionName, isValidData);
        },

    };
    socketActionQuickPayGroup.actions = this.actions;
};

module.exports = socketActionQuickPayGroup;