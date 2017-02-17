var dbPlatformGameGroup = require('./../db_modules/dbPlatformGameGroup');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var socketUtil = require('./../modules/socketutility');

function socketActionGameGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Get platform GameGroup by platform data
         * @param {json} data - platformId
         */
        getPlatformGameGroup: function getPlatformGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.getPlatformGameGroup, [ObjectId(data.platform)], actionName, isValidData);
        },

        /**
         * Create platform GameGroup by GameGroup data
         * @param {json} data - GameGroup data
         */
        addPlatformGameGroup: function addPlatformGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.platform && data.displayName);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.addPlatformGameGroup, [data.platform, data.name, data.parent, data.displayName], actionName, isValidData);
        },

        /**
         * Rename platform GameGroup
         * @param {json} query - query data
         * @param {json} update - update data
         */
        renamePlatformGameGroup: function renamePlatformGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.updatePlatformGameGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Get all the games by platform and the GameGroup
         * @param {json} data - query data
         */
        getGamesByPlatformAndGameGroup: function getGamesByPlatformAndGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.getGameGroupGamesArr, [data], actionName, isValidData);
        },

        /**
         * Get all the games which are not in this GameGroup
         * @param {json} data - query data
         */
        getGamesNotInGameGroup: function getGamesNotInGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.getGamesNotInGameGroup, [data], actionName, isValidData);
        },

        /**
         * Update this GameGroup / Add or Remove games into/from the group
         * @param {json} data - query data
         * @param {json} update - update data
         */
        updatePlatformGameGroup: function updatePlatformGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.updatePlatformGameGroup, [data.query, data.update], actionName, isValidData);
        },
        /**
         * Update gameGroup's parent / Move game group to another parent group
         * @param {json} data - It has to contain groupId curParentGroupId and newParentGroupId
         */
        updateGameGroupParent: function updateGameGroupParent(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.groupId && (data.curParentGroupId != data.newParentGroupId)
                && (data.groupId != data.newParentGroupId));
            socketUtil.emitter(self.socket, dbPlatformGameGroup.updateGameGroupParent, [data.groupId, data.curParentGroupId, data.newParentGroupId], actionName, isDataValid);
        },

        /**
         * Delete game group by id / Delete the GameGroup and all its all sub-groups (all children)
         * @param {json} data - It has to contain ObjId of the group
         */
        deleteGameGroup: function deleteGameGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformGameGroup.removeGameGroup, [data._id], actionName, isValidData);
        },


    };
    socketActionGameGroup.actions = this.actions;
};

module.exports = socketActionGameGroup;