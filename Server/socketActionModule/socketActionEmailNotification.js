const socketUtil = require('./../modules/socketutility');
const dbEmailNotification = require('./../db_modules/dbEmailNotification');


function socketActionEmailNotification (socketIO, socket) {
    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    function getHost() {
        return self.socket.request && self.socket.request.headers && self.socket.request.headers.host
    }

    this.actions = {
        getEmailNotificationConfig: function getEmailNotificationConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailNotification.getEmailNotificationConfig, [data.platformObjId], actionName, isValidData);
        },

        updateEmailNotificationConfig: function updateEmailNotificationConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailNotification.updateEmailNotificationConfig, [data.platformObjId,
                data.doNotify, data.emailPrefix, data.includeAdminName, data.includeOperationTime, data.includeProposalStepName,
                data.includePlatformName], actionName, isValidData);
        },

        getNotifyEditPartnerCommissionSetting: function getNotifyEditPartnerCommissionSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailNotification.getNotifyEditPartnerCommissionSetting, [data.platformObjId], actionName, isValidData);
        },

        updateNotifyEditPartnerCommissionSetting: function updateNotifyEditPartnerCommissionSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailNotification.updateNotifyEditPartnerCommissionSetting, [data.platformObjId,  data.doNotify, data.emailPrefix, data.backEndOnly], actionName, isValidData);
        },

        getNotifyEditChildPartnerSetting: function getNotifyEditChildPartnerSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailNotification.getNotifyEditChildPartnerSetting, [data.platformObjId], actionName, isValidData);
        },

        updateNotifyEditChildPartnerSetting: function updateNotifyEditChildPartnerSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailNotification.updateNotifyEditChildPartnerSetting, [data.platformObjId,  data.doNotify, data.emailPrefix, data.backEndOnly], actionName, isValidData);
        },
    };

    socketActionEmailNotification = this.actions;
}

module.exports = socketActionEmailNotification;