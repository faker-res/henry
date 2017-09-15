const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerReward = require('./../db_modules/dbPlayerReward');

const socketUtil = require('./../modules/socketutility');

function socketActionPromoCode(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
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
            let isValidData = Boolean(data && data.platformObjId && data.groupData);
            socketUtil.emitter(self.socket, dbPlayerReward.savePromoCodeUserGroup, [ObjectId(data.platformObjId), data.groupData], actionName, isValidData);
        },

        getPromoCodeUserGroup: function getPromoCodeUserGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.getPromoCodeUserGroup, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        applyPromoCode: function applyPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.promoCodeObjId);
            socketUtil.emitter(self.socket, dbPlayerReward.applyPromoCode, [ObjectId(data.platformObjId), ObjectId(data.promoCodeObjId)], actionName, isValidData);
        }
    };
    socketActionPromoCode.actions = this.actions;
}

module.exports = socketActionPromoCode;