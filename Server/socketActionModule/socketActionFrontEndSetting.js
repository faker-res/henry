let dbFrontEndSetting = require('./../db_modules/dbFrontEndSetting');
let socketUtil = require('./../modules/socketutility');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

function socketActionFrontEndSetting(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        saveFrontEndPopUpAdvSetting: function saveFrontEndPopUpAdvSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveFrontEndPopUpAdvSetting, [data], actionName, isValidData);
        },

        updateFrontEndGameSetting: function updateFrontEndGameSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.dataList);

            socketUtil.emitter(self.socket, dbFrontEndSetting.updateFrontEndGameSetting, [data.dataList, data.deletedList], actionName, isValidData);
        },

        updatePopUpAdvertisementSetting: function updatePopUpAdvertisementSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.dataList);

            socketUtil.emitter(self.socket, dbFrontEndSetting.updatePopUpAdvertisementSetting, [data.dataList, data.deletedList], actionName, isValidData);
        },

        getFrontEndGameSettingByObjId: function getFrontEndGameSettingByObjId (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.gameSettingObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getFrontEndGameSettingByObjId, [data.gameSettingObjId], actionName, isValidData);
        },

        saveFrontEndGameSetting: function saveFrontEndGameSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.gameSettingObj);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveFrontEndGameSetting, [data.gameSettingObj], actionName, isValidData);
        },

        getFrontEndGameSetting: function getFrontEndGameSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getFrontEndGameSetting, [data.platformObjId], actionName, isValidData);
        },

        getFrontEndRewardCategory: function getFrontEndRewardCategory (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getFrontEndRewardCategory, [data.platformObjId], actionName, isValidData);
        },

        getFrontEndRewardSetting: function getFrontEndRewardSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getFrontEndRewardSetting, [data.platformObjId], actionName, isValidData);
        },

        saveFrontEndRewardCategory: function saveFrontEndRewardCategory (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.categoryName);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveFrontEndRewardCategory, [data.platformObjId, data.categoryName], actionName, isValidData);
        },

        updateRewardSetting: function updateRewardSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.dataList);

            socketUtil.emitter(self.socket, dbFrontEndSetting.updateRewardSetting, [data.dataList, data.deletedList, data.deletedCategoryList], actionName, isValidData);
        },

        saveFrontEndRewardSetting: function saveFrontEndRewardSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveFrontEndRewardSetting, [data], actionName, isValidData);
        },

        getFrontEndPopUpAdvertisementSetting: function getFrontEndPopUpAdvertisementSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getFrontEndPopUpAdvertisementSetting, [data.platformObjId], actionName, isValidData);
        },

        saveSkinSetting: function saveSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.device && data.name);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveSkinSetting, [data], actionName, isValidData);
        },

        savePartnerSkinSetting: function savePartnerSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.device && data.name);

            socketUtil.emitter(self.socket, dbFrontEndSetting.savePartnerSkinSetting, [data], actionName, isValidData);
        },

        getSkinSetting: function getSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getSkinSetting, [data.platformObjId], actionName, isValidData);
        },

        getPartnerSkinSetting: function getPartnerSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getPartnerSkinSetting, [data.platformObjId], actionName, isValidData);
        },

        removeSkinSetting: function removeSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.skinSettingObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.removeSkinSetting, [data.skinSettingObjId], actionName, isValidData);
        },

        removePartnerSkinSetting: function removePartnerSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.skinSettingObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.removePartnerSkinSetting, [data.skinSettingObjId], actionName, isValidData);
        },

        saveUrlConfig: function saveUrlConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveUrlConfig, [data], actionName, isValidData);
        },

        savePartnerUrlConfig: function savePartnerUrlConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.savePartnerUrlConfig, [data], actionName, isValidData);
        },

        getUrlConfig: function getUrlConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getUrlConfig, [data.platformObjId], actionName, isValidData);
        },

        getPartnerUrlConfig: function getPartnerUrlConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getPartnerUrlConfig, [data.platformObjId], actionName, isValidData);
        },

        saveCarouselSetting: function saveCarouselSetting (data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.device);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveCarouselSetting, [data], actionName, isValidData);
        },

        getCarouselSetting: function getCarouselSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getCarouselSetting, [data.platformObjId, data.isPartner], actionName, isValidData);
        },

        updateCarouselSetting: function updateCarouselSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.dataList);

            socketUtil.emitter(self.socket, dbFrontEndSetting.updateCarouselSetting, [data.dataList, data.deletedList, data.isPartner], actionName, isValidData);
        },
    };
    socketActionFrontEndSetting.actions = this.actions;
}

module.exports = socketActionFrontEndSetting;
