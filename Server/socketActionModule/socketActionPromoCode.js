const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerReward = require('./../db_modules/dbPlayerReward');

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
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeTypes, [ObjectId(data.platformObjId)], actionName, isValidData);
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

        generatePromoCode: function generatePromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.newPromoCodeEntry);
            socketUtil.emitter(self.socket, dbPlayerReward.generatePromoCode, [ObjectId(data.platformObjId), data.newPromoCodeEntry], actionName, isValidData);
        },

        savePromoCodeUserGroup: function savePromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && (data.groupData || data.deleteData));
            let isDelete = Boolean(data.deleteData);
            socketUtil.emitter(self.socket, dbPlayerReward.savePromoCodeUserGroup, [ObjectId(data.platformObjId), isDelete ? data.deleteData : data.groupData, isDelete], actionName, isValidData);
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

        getDelayDurationGroup: function getDelayDurationGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getDelayDurationGroup, [ObjectId(data.platformObjId), data.duration], actionName, isValidData);
        },

        applyPromoCode: function applyPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerName && data.promoCode);
            socketUtil.emitter(self.socket, dbPlayerReward.applyPromoCode, [ObjectId(data.platformObjId), data.playerName, data.promoCode, adminInfo], actionName, isValidData);
        },

        getPromoCodesMonitor: function getPromoCodesMonitor(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodesMonitor, [ObjectId(data.platformObjId), data.startAcceptedTime, data.endAcceptedTime], actionName, isValidData);
        },

        getPromoCodesAnalysis: function getPromoCodesAnalysis(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeAnalysis, [ObjectId(data.platformObjId), data], actionName, isValidData);
        }
    };
    socketActionPromoCode.actions = this.actions;
}

module.exports = socketActionPromoCode;
