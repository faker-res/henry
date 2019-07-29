const socketUtil = require('./../modules/socketutility');
const dbEmailAudit = require('./../db_modules/dbEmailAudit');


function socketActionEmailAudit (socketIO, socket) {
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
        // credit change
        getAuditCreditChangeSetting: function getAuditCreditChangeSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailAudit.getAuditCreditChangeSetting, [data.platformObjId], actionName, isValidData);
        },

        setAuditCreditChangeSetting: function setAuditCreditChangeSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailAudit.setAuditCreditChangeSetting, [data.platformObjId, data.minimumAuditAmount, data.emailNameExtension, data.domain, data.recipient, data.reviewer], actionName, isValidData);
        },



        // manual reward
        getAuditManualRewardSetting: function getAuditManualRewardSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailAudit.getAuditManualRewardSetting, [data.platformObjId], actionName, isValidData);
        },

        setAuditManualRewardSetting: function setAuditManualRewardSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbEmailAudit.setAuditManualRewardSetting, [data.platformObjId, data.minimumAuditAmount, data.emailNameExtension, data.domain, data.recipient, data.reviewer], actionName, isValidData);
        },

    };

    socketActionEmailAudit = this.actions;
}

module.exports = socketActionEmailAudit;