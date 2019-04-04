var dbPlatformMerchantGroup = require('./../db_modules/dbPlatformMerchantGroup');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var socketUtil = require('./../modules/socketutility');

let RESTUtils = require('./../modules/RESTUtils');

function socketActionMerchantGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Get platform MerchantGroup by platform data
         * @param {json} data - platformId
         */
        getPlatformMerchantGroup: function getPlatformMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getPlatformMerchantGroup, [ObjectId(data.platform)], actionName, isValidData);
        },

        /**
         * Create platform MerchantGroup by MerchantGroup data
         * @param {json} data - MerchantGroup data
         */
        addPlatformMerchantGroup: function addPlatformMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.platform && data.code && data.displayName);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.addPlatformMerchantGroup, [data.platform, data.name, data.code, data.displayName], actionName, isValidData);
        },

        /**
         * Rename platform MerchantGroup
         * @param {json} query - query data
         * @param {json} update - update data
         */
        renamePlatformMerchantGroup: function renamePlatformMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.updatePlatformMerchantGroupInfo, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Get all the games by platform and the BankCardGroup
         * @param {json} data - query data
         */
        getMerchantByMerchantGroup: function getMerchantByMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.merchantGroup);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getMerchantsByMerchantGroup, [data.platform, data.merchantGroup], actionName, isValidData);
        },

        /**
         * Get all the games by platform and the BankCardGroup
         * @param {json} data - query data
         */
        getIncludedMerchantByMerchantGroup: function getIncludedMerchantByMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.merchantGroup);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getIncludedMerchantsByMerchantGroup, [data.platform, data.merchantGroup], actionName, isValidData);
        },

        /**
         * Get all the games which are not in this BankCardGroup
         * @param {json} data - query data
         */
        getExcludedMerchantByMerchantGroup: function getExcludedMerchantByMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.merchantGroup);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getExcludedMerchantsByMerchantGroup, [data.platform, data.merchantGroup], actionName, isValidData);
        },

        /**
         * Update this MerchantGroup / Add or Remove games into/from the group
         * @param {json} data - query data
         * @param {json} update - update data
         */
        updatePlatformMerchantGroup: function updatePlatformMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.updatePlatformMerchantGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Delete game group by id / Delete the MerchantGroup and all its all sub-groups (all children)
         * @param {json} data - It has to contain ObjId of the group
         */
        deleteMerchantGroup: function deleteMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.removeMerchantGroup, [data._id, data.platform], actionName, isValidData);
        },

        /**
         * Set default game group by platform and default group id
         * @param {json} data
         */
        setPlatformDefaultMerchantGroup: function setPlatformDefaultMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.default);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.setPlatformDefaultMerchantGroup, [data.platform, data.default], actionName, isValidData);
        },

        /**
         * Get merchant type list
         * @param {json} data
         */
        getMerchantTypeList: function getMerchantTypeList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getMerchantTypeList, [data.platform], actionName, isValidData);
        },

        getMerchantList: function getMerchantList(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postMerchantList", {platformId: data.platformId}], actionName, true);
        },

        getMerchantNBankCard: function getMerchantNBankCard(data){
          var actionName = arguments.callee.name;
          var isValidData = Boolean(data);
          socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getMerchantNBankCard, [data.platformId], actionName, isValidData);
        },

        /**
         * Add multiple players to bank card group
         * @param {json} data
         */
        addPlayersToMerchantGroup: function addPlayersToMerchantGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.bankMerchantGroupObjId && data.playerObjIds && data.playerObjIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.addPlayersToMerchantGroup, [data.bankMerchantGroupObjId, data.playerObjIds, data.platform], actionName, isValidData);
        },

        /**
         * Add all players to bank card group
         * @param {json} data
         */
        addAllPlayersToMerchantGroup: function addAllPlayersToMerchantGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.bankMerchantGroupObjId && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.addAllPlayersToMerchantGroup, [data.bankMerchantGroupObjId, data.platformObjId], actionName, isValidData);
        },
        syncMerchantNoScript: function syncMerchantNoScript(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.syncMerchantNoScript, [data.platformId], actionName, isValidData);
        },

        updateCustomizeRatePlatformMerchantList: function updateCustomizeRatePlatformMerchantList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.name && data.merchantNo);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.updateCustomizeRatePlatformMerchantList, [data.platformId, data.name, data.merchantNo, data.customizeRate], actionName, isValidData);
        },

        getPlatformMerchantList: function getPlatformMerchantList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getPlatformMerchantList, [data.platformId], actionName, isValidData);
        },

        getPMSMerchantGroup: function getPMSMerchantGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatformMerchantGroup.getPMSMerchantGroup, [data.platformId, data.topUpSystemType], actionName, isValidData);
        }
    };
    socketActionMerchantGroup.actions = this.actions;
};

module.exports = socketActionMerchantGroup;
