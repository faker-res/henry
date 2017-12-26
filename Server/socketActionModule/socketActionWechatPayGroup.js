let dbPlatformWechatPayGroup = require('./../db_modules/dbPlatformWechatPayGroup');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

let socketUtil = require('./../modules/socketutility');

function socketActionWechatPayGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Get platform WechatPayGroup by platform data
         * @param {json} data - platformId
         */
        getPlatformWechatPayGroup: function getPlatformWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.getPlatformWechatPayGroup, [ObjectId(data.platform)], actionName, isValidData);
        },

        /**
         * Create platform WechatPayGroup by WechatPayGroup data
         * @param {json} data - WechatPayGroup data
         */
        addPlatformWechatPayGroup: function addPlatformWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.name && data.platform && data.code && data.displayName);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.addPlatformWechatPayGroup, [data.platform, data.name, data.code, data.displayName], actionName, isValidData);
        },

        /**
         * Rename platform WechatPayGroup
         * @param {json} data - query data
         */
        renamePlatformWechatPayGroup: function renamePlatformWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.updatePlatformWechatPayGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Get all the alipay account by platform
         * @param {json} data - query data
         */
        getAllWechatpaysByWechatpayGroup: function getAllWechatpaysByWechatpayGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);

            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.getAllWechatpaysByWechatpayGroup, [data.platform], actionName, isValidData);
        },

        /**
         * Get all the alipay account by platform with isInGroup field
         * @param {json} data - query data
         */
        getAllWechatpaysByWechatpayGroupWithIsInGroup: function getAllWechatpaysByWechatpayGroupWithIsInGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.wechatGroup);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.getAllWechatpaysByWechatpayGroupWithIsInGroup, [data.platform, data.wechatGroup], actionName, isValidData);
        },

        /**
         * Get all the games by platform and the WechatPayGroup
         * @param {json} data - query data
         */
        getIncludedWechatsByWechatPayGroup: function getIncludedWechatsByWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.alipayGroup);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.getIncludedWechatsByWechatPayGroup, [data.platform, data.alipayGroup], actionName, isValidData);
        },

        /**
         * Get all the games which are not in this WechatPayGroup
         * @param {json} data - query data
         */
        getExcludedWechatsByWechatPayGroup: function getExcludedWechatsByWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.alipayGroup);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.getExcludedWechatsByWechatPayGroup, [data.platform, data.alipayGroup], actionName, isValidData);
        },

        /**
         * Update this WechatPayGroup / Add or Remove games into/from the group
         * @param {json} data - query data
         */
        updatePlatformWechatPayGroup: function updatePlatformWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.updatePlatformWechatPayGroup, [data.query, data.update], actionName, isValidData);
        },
        /**
         * Delete game group by id / Delete the WechatPayGroup and all its all sub-groups (all children)
         * @param {json} data - It has to contain ObjId of the group
         */
        deleteWechatPayGroup: function deleteWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.removeWechatPayGroup, [data._id], actionName, isValidData);
        },

        /**
         * Set default game group by platform and default group id
         * @param {json} data
         */
        setPlatformDefaultWechatPayGroup: function setPlatformDefaultWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.default);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.setPlatformDefaultWechatPayGroup, [data.platform, data.default], actionName, isValidData);
        },

        /**
         * Add multiple players to WechatPayGroup group
         * @param {json} data
         */
        addPlayersToWechatPayGroup: function addPlayersToWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.weChatGroupObjId && data.playerObjIds && data.playerObjIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.addPlayersToWechatPayGroup, [data.weChatGroupObjId, data.playerObjIds], actionName, isValidData);
        },

        addAllPlayersToWechatPayGroup: function addAllPlayersToWechatPayGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.weChatGroupObjId && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatformWechatPayGroup.addAllPlayersToWechatPayGroup, [data.weChatGroupObjId, data.platformObjId], actionName, isValidData);
        },

    };
    socketActionWechatPayGroup.actions = this.actions;
}

module.exports = socketActionWechatPayGroup;