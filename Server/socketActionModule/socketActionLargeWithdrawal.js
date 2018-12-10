const socketUtil = require('./../modules/socketutility');
const dbLargeWithrawal = require('./../db_modules/dbLargeWithdrawal');


function socketActionLargeWithdrawal (socketIO, socket) {
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
        getLargeWithdrawLog: function getLargeWithdrawLog (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.logObjId);
            socketUtil.emitter(self.socket, dbLargeWithrawal.getLargeWithdrawLog, [data.logObjId], actionName, isValidData);
        },

        getAllPlatformLargeWithdrawalSetting: function getAllPlatformLargeWithdrawalSetting (data) {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbLargeWithrawal.getAllPlatformLargeWithdrawalSetting, [], actionName, true);
        },

        sendLargeAmountDetailMail: function sendLargeAmountDetailMail (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.logObjId);
            socketUtil.emitter(self.socket, dbLargeWithrawal.sendLargeAmountDetailMail, [data.logObjId, data.comment, getAdminId(), getHost()], actionName, isValidData);
        },

        getPartnerLargeWithdrawLog: function getPartnerLargeWithdrawLog (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.logObjId);
            socketUtil.emitter(self.socket, dbLargeWithrawal.getPartnerLargeWithdrawLog, [data.logObjId], actionName, isValidData);
        },

        getAllPlatformPartnerLargeWithdrawalSetting: function getAllPlatformPartnerLargeWithdrawalSetting (data) {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbLargeWithrawal.getAllPlatformPartnerLargeWithdrawalSetting, [], actionName, true);
        },

        sendPartnerLargeAmountDetailMail: function sendPartnerLargeAmountDetailMail (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.logObjId);
            socketUtil.emitter(self.socket, dbLargeWithrawal.sendPartnerLargeAmountDetailMail, [data.logObjId, data.comment, getAdminId(), getHost()], actionName, isValidData);
        },

        largeWithdrawalAudit: function largeWithdrawalAudit (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.proposalId);
            let decision = data.isApprove ? "approve" : "reject";
            socketUtil.emitter(self.socket, dbLargeWithrawal.largeWithdrawalAudit, [data.proposalId, getAdminId(), decision, data.isPartner], actionName, isValidData);
        },

        recalculateLargeWithdrawalLog: function recalculateLargeWithdrawalLog (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.logObjId);
            socketUtil.emitter(self.socket, dbLargeWithrawal.fillUpLargeWithdrawalLogDetail, [data.logObjId], actionName, isValidData);
        },

        recalculatePartnerLargeWithdrawalLog: function recalculatePartnerLargeWithdrawalLog (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.logObjId);
            socketUtil.emitter(self.socket, dbLargeWithrawal.fillUpPartnerLargeWithdrawalLogDetail, [data.logObjId], actionName, isValidData);
        },
    };

    socketActionLargeWithdrawal = this.actions;
}

module.exports = socketActionLargeWithdrawal;