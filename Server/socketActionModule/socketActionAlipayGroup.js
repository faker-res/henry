var dbPlatformAlipayGroup = require('./../db_modules/dbPlatformAlipayGroup');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var socketUtil = require('./../modules/socketutility');
var pmsAPI = require('../externalAPI/pmsAPI');
var serverInstance = require("../modules/serverInstance");

function socketActionAlipayGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Get platform AlipayGroup by platform data
         * @param {json} data - platformId
         */
        getPlatformAlipayGroup: function getPlatformAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.getPlatformAlipayGroup, [ObjectId(data.platform)], actionName, isValidData);
        },

        /**
         * Create platform AlipayGroup by AlipayGroup data
         * @param {json} data - AlipayGroup data
         */
        addPlatformAlipayGroup: function addPlatformAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.platform && data.code && data.displayName);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.addPlatformAlipayGroup, [data.platform, data.name, data.code, data.displayName], actionName, isValidData);
        },

        /**
         * Rename platform AlipayGroup
         * @param {json} query - query data
         * @param {json} update - update data
         */
        renamePlatformAlipayGroup: function renamePlatformAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.updatePlatformAlipayGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Get all the alipay account by platform
         * @param {json} data - query data
         */
        getAllAlipaysByAlipayGroup: function getAllAlipaysByAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);

            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.getAllAlipaysByAlipayGroup, [data.platform], actionName, isValidData);
        },

        /**
         * Get all the alipay account by platform with isInGroup field
         * @param {json} data - query data
         */
        getAllAlipaysByAlipayGroupWithIsInGroup: function getAllAlipaysByAlipayGroupWithIsInGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.alipayGroup);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.getAllAlipaysByAlipayGroupWithIsInGroup, [data.platform, data.alipayGroup], actionName, isValidData);
        },

        /**
         * Get all the games by platform and the BankCardGroup
         * @param {json} data - query data
         */
        getIncludedAlipayByAlipayGroup: function getIncludedAlipayByAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.alipayGroup);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.getIncludedAlipaysByAlipayGroup, [data.platform, data.alipayGroup], actionName, isValidData);
        },

        /**
         * Get all the games which are not in this BankCardGroup
         * @param {json} data - query data
         */
        getExcludedAlipayByAlipayGroup: function getExcludedAlipayByAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.alipayGroup);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.getExcludedAlipaysByAlipayGroup, [data.platform, data.alipayGroup], actionName, isValidData);
        },

        /**
         * Update this AlipayGroup / Add or Remove games into/from the group
         * @param {json} data - query data
         * @param {json} update - update data
         */
        updatePlatformAlipayGroup: function updatePlatformAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.updatePlatformAlipayGroup, [data.query, data.update], actionName, isValidData);
        },
        /**
         * Delete game group by id / Delete the AlipayGroup and all its all sub-groups (all children)
         * @param {json} data - It has to contain ObjId of the group
         */
        deleteAlipayGroup: function deleteAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.removeAlipayGroup, [data._id], actionName, isValidData);
        },

        /**
         * Set default game group by platform and default group id
         * @param {json} data
         */
        setPlatformDefaultAlipayGroup: function setPlatformDefaultAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.default);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.setPlatformDefaultAlipayGroup, [data.platform, data.default], actionName, isValidData);
        },

        /**
         * Add multiple players to bank card group
         * @param {json} data
         */
        addPlayersToAlipayGroup: function addPlayersToAlipayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.bankAlipayGroupObjId && data.playerObjIds && data.playerObjIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.addPlayersToAlipayGroup, [data.bankAlipayGroupObjId, data.playerObjIds], actionName, isValidData);
        },

        /**
         * Add all players to AliPay group
         * @param {json} data
         */
        addAllPlayersToAlipayGroup: function addAllPlayersToAlipayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.bankAlipayGroupObjId && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatformAlipayGroup.addAllPlayersToAlipayGroup, [data.bankAlipayGroupObjId, data.platformObjId], actionName, isValidData);
        },

    };
    socketActionAlipayGroup.actions = this.actions;
};

module.exports = socketActionAlipayGroup;