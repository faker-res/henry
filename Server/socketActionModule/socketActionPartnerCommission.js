var socketUtil = require('./../modules/socketutility');
const dbPartnerCommissionConfig = require('../db_modules/dbPartnerCommissionConfig');
const dbPartnerCommission = require('../db_modules/dbPartnerCommission');

function socketActionPartnerCommission(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    let adminInfo = {};

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
        getPlatformPartnerCommConfig: function getPlatformPartnerCommConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.commissionType);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.getPlatformPartnerCommConfig, [data.platformObjId, data.commissionType], actionName, isValidData);
        },

        updatePlatformPartnerCommConfig: function updatePlatformPartnerCommConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.updatePlatformPartnerCommConfig, [data.platformObjId, data.commissionType, data.providerObjId, data.commissionSetting], actionName, isValidData);
        },

        debugCommCalc: function debugCommCalc (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartnerCommission.calculatePartnerCommission, [data.partnerObjId, data.startTime, data.endTime], actionName, isValidData);
        },

        getNewCurrentPartnerCommissionDetail: function getNewCurrentPartnerCommissionDetail (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && (data.commissionType || data.partnerName));
            socketUtil.emitter(self.socket, dbPartnerCommission.getCurrentPartnerCommissionDetail, [data.platformObjId, data.commissionType, data.partnerName, data.startTime, data.endTime], actionName, isValidData);
        },

        getPartnerCommConfig: function getPartnerCommConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerObjId && data.commissionType);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.getPartnerCommConfig, [data.partnerObjId, data.commissionType, data.isSkipUpdate, data.isGetDefault], actionName, isValidData);
        },

        resetAllPartnerCustomizedCommissionRate: function resetAllPartnerCustomizedCommissionRate (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.commissionType);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.resetAllPartnerCustomizedCommissionRate, [data.platformObjId, data.commissionType, data.isMultiLevel], actionName, isValidData);
        },

        resetGroupPartnerCommissionRate: function resetGroupPartnerCommissionRate (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.commissionType && data.providerGroupObjId);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.resetGroupPartnerCommissionRate, [data.platformObjId, data.commissionType, data.providerGroupObjId], actionName, isValidData);
        },

        checkIsCustomizeCommValid: function checkIsCustomizeCommValid (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerObjId && data.settingObjId && data.field && data.oldConfig && data.newConfig);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.checkIsCustomizeCommValid, [data.partnerObjId, data.oldConfig, data.newConfig], actionName, isValidData);
        },

        checkIsCustomizeAllCommValid: function checkIsCustomizeAllCommValid (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerObjId && data.oldConfigArr && data.newConfigArr);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.checkIsCustomizeAllCommValid, [data.partnerObjId, data.oldConfigArr, data.newConfigArr], actionName, isValidData);
        },

        getChildMainPartner: function getChildMainPartner (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.parentObjId);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.getChildMainPartner, [data.platformObjId, data.parentObjId], actionName, isValidData);
        },

        getChildPartnerDownLineDetails: function getChildPartnerDownLineDetails (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.objId);
            socketUtil.emitter(self.socket, dbPartnerCommission.getChildPartnerDownLineDetails, [data.objId, data.isReport], actionName, isValidData);
        },

        getAllDownlinePartnerWithDetails: function getAllDownlinePartnerWithDetails (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartnerCommission.getAllDownlinePartnerWithDetails, [data.partnerObjId], actionName, isValidData);
        },

        createUpdatePartnerMainCommRateConfig: function createUpdatePartnerMainCommRateConfig(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.createUpdatePartnerMainCommRateConfig, [data.query, data.updateData], actionName, isValidData);
        },

        getPartnerMainCommRateConfig: function getPartnerMainCommRateConfig(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPartnerCommissionConfig.getPartnerMainCommRateConfig, [data.query], actionName, isValidData);
        },

        checkPartnersChild: function checkPartnersChild(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.partnersName && data.partnersName.length);
            socketUtil.emitter(self.socket, dbPartnerCommission.checkPartnersChild, [data.platformObjId, data.partnersName], actionName, isValidData);
        },
    };

    socketActionPartnerCommission.actions = this.actions;
}

module.exports = socketActionPartnerCommission;
