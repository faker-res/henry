const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerReward = require('./../db_modules/dbPlayerReward');
const dbPromoCode = require('./../db_modules/dbPromoCode');

const socketUtil = require('./../modules/socketutility');

function socketActionPromoCode(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    let adminInfo;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    if (getAdminId() && getAdminName()) {
        adminInfo = {
            name: getAdminName(),
            type: 'admin',
            id: getAdminId()
        }
    }

    this.actions = {
        getPromoCodesHistory: function getPromoCodesHistory(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodesHistory, [data], actionName, isValidData);
        },

        getPromoCodeTypes: function getPromoCodeTypes(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeTypes, [data.platformObjId, data.deleteFlag], actionName, isValidData);
        },

        getPromoCodeTypeByObjId: function getPromoCodeTypeByObjId(data) {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeTypeByObjId, [data], actionName, true);
        },

        updatePromoCodeSMSContent: function updatePromoCodeSMSContent(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.promoCodeSMSContent);
            socketUtil.emitter(self.socket, dbPlayerReward.updatePromoCodeSMSContent, [ObjectId(data.platformObjId), data.promoCodeSMSContent, data.isDelete], actionName, isValidData);
        },

        getPromoCodeTemplate: function getPromoCodeTemplate(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.hasOwnProperty("isProviderGroup"));
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeTemplate, [data.platformObjId, data.isProviderGroup], actionName, isValidData);
        },

        getOpenPromoCodeTemplate: function getOpenPromoCodeTemplate(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.hasOwnProperty("isProviderGroup") && data.hasOwnProperty("deleteFlag"));
            socketUtil.emitter(self.socket, dbPlayerReward.getOpenPromoCodeTemplate, [data.platformObjId, data.isProviderGroup, data.deleteFlag], actionName, isValidData);
        },
        
        updatePromoCodeTemplate: function updatePromoCodeTemplate(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.promoCodeTemplate );
            socketUtil.emitter(self.socket, dbPlayerReward.updatePromoCodeTemplate, [ObjectId(data.platformObjId), data.promoCodeTemplate], actionName, isValidData);
        },

        updateOpenPromoCodeTemplate: function updateOpenPromoCodeTemplate(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.openPromoCodeTemplate);
            socketUtil.emitter(self.socket, dbPlayerReward.updateOpenPromoCodeTemplate, [ObjectId(data.platformObjId), data.openPromoCodeTemplate], actionName, isValidData);
        },

        updatePromoCodeIsDeletedFlag: function updatePromoCodeIsDeletedFlag(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.promoCodeTypeObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.updatePromoCodeIsDeletedFlag, [ObjectId(data.platformObjId), ObjectId(data.promoCodeTypeObjId), data.isDeleted], actionName, isValidData);
        },

        checkPromoCodeTypeAvailability: function checkPromoCodeTypeAvailability(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.promoCodeTypeObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.checkPromoCodeTypeAvailability, [data.platformObjId, data.promoCodeTypeObjId], actionName, isValidData);
        },

        generatePromoCode: function generatePromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.newPromoCodeEntry && data.newPromoCodeEntry.promoCodeType);
            socketUtil.emitter(self.socket, dbPlayerReward.generatePromoCode, [ObjectId(data.platformObjId), data.newPromoCodeEntry, data.adminId, data.adminName], actionName, isValidData);
        },

        generateOpenPromoCode: function generateOpenPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.newPromoCodeEntry);
            socketUtil.emitter(self.socket, dbPlayerReward.generateOpenPromoCode, [ObjectId(data.platformObjId), data.newPromoCodeEntry, data.adminId, data.adminName], actionName, isValidData);
        },

        savePromoCodeUserGroup: function savePromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && (data.groupData || data.deleteData));
            let isDelete = Boolean(data.deleteData);
            socketUtil.emitter(self.socket, dbPlayerReward.savePromoCodeUserGroup, [ObjectId(data.platformObjId), isDelete ? data.deleteData : data.groupData, isDelete], actionName, isValidData);
        },

        modifyPlayerPermissionByPromoCode: function modifyPlayerPermissionByPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.adminId && data.platformObjId && (data.addedPlayerNameArr || data.deletedPlayerNameArr));
            socketUtil.emitter(self.socket, dbPlayerReward.modifyPlayerPermissionByPromoCode, [data.adminId, ObjectId(data.platformObjId), data.addedPlayerNameArr, data.deletedPlayerNameArr], actionName, isValidData);
        },

        saveBlockPromoCodeUserGroup: function saveBlockPromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && (data.groupData || (data.deleteData && data.adminId)));
            let isDelete = Boolean(data.deleteData);
            socketUtil.emitter(self.socket, dbPlayerReward.saveBlockPromoCodeUserGroup, [ObjectId(data.platformObjId), isDelete ? data.deleteData : data.groupData, isDelete, data.adminId], actionName, isValidData);
        },

        saveDelayDurationGroup: function saveDelayDurationGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && (data.groupData));
            socketUtil.emitter(self.socket, dbPlayerReward.saveDelayDurationGroup, [ObjectId(data.platformObjId), data.groupData], actionName, isValidData);
        },

        getPromoCodeUserGroup: function getPromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeUserGroup, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        getBlockPromoCodeUserGroup: function getBlockPromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getBlockPromoCodeUserGroup, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        getAllPromoCodeUserGroup: function getAllPromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getAllPromoCodeUserGroup, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        updatePromoCodeGroupMainPermission: function updatePromoCodeGroupMainPermission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerReward.updatePromoCodeGroupMainPermission, [data.checkQuery, data.query, data.updateData], actionName, isValidData);
        },

        updateBatchPromoCodeGroupMainPermission: function updateBatchPromoCodeGroupMainPermission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerReward.updateBatchPromoCodeGroupMainPermission, [data.checkQuery, data.query, data.updateData], actionName, isValidData);
        },

        getDelayDurationGroup: function getDelayDurationGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getDelayDurationGroup, [ObjectId(data.platformObjId), data.duration], actionName, isValidData);
        },

        applyPromoCode: function applyPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.promoCode);
            socketUtil.emitter(self.socket, dbPlayerReward.applyPromoCode, [data.playerId, data.promoCode, adminInfo], actionName, isValidData);
        },

        getPromoCodesMonitor: function getPromoCodesMonitor(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodesMonitor, [ObjectId(data.platformObjId), data.startAcceptedTime, data.endAcceptedTime, data.promoCodeType3Name], actionName, isValidData);
        },

        getPromoCodesAnalysisByType: function getPromoCodesAnalysisByType(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeAnalysis, [ObjectId(data.platformObjId), data], actionName, isValidData);
        },

        getPromoCodesAnalysisByPlayer: function getPromoCodesAnalysisByPlayer(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeAnalysis, [ObjectId(data.platformObjId), data, true], actionName, isValidData);
        },

        updatePromoCodesActive: function updatePromoCodesActive(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.startAcceptedTime && data.endAcceptedTime && data.flag);
            socketUtil.emitter(self.socket, dbPlayerReward.updatePromoCodesActive, [ObjectId(data.platformObjId), data], actionName, isValidData);
        },

        checkPlayerHasPromoCode: function checkPlayerHasPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerName && data.status);
            socketUtil.emitter(self.socket, dbPlayerReward.checkPlayerHasPromoCode, [data], actionName, isValidData);
        },

        disablePromoCode: function disablePromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.promoCode);
            socketUtil.emitter(self.socket, dbPromoCode.disablePromoCode, [data.playerId, data.promoCode], actionName, isValidData);
        },

        disablePromoCodes: function disablePromoCodes(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerIds && data.promoCodes);
            socketUtil.emitter(self.socket, dbPromoCode.disablePromoCodes, [data.playerIds, data.promoCodes], actionName, isValidData);
        },
    };
    socketActionPromoCode.actions = this.actions;
}

module.exports = socketActionPromoCode;
