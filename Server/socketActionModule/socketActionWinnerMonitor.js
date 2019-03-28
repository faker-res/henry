const socketUtil = require('./../modules/socketutility');
const dbPlayerConsumptionHourSummary = require('./../db_modules/dbPlayerConsumptionHourSummary');
const dbLargeWithdrawal = require('./../db_modules/dbLargeWithdrawal');

function socketActionWinnerMonitor (socketIO, socket) {
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
        setWinnerMonitorConfig: function setWinnerMonitorConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.winnerMonitorData);
            socketUtil.emitter(self.socket, dbPlayerConsumptionHourSummary.setWinnerMonitorConfig, [data.platformObjId, data.winnerMonitorData], actionName, isValidData);
        },

        getWinnerMonitorConfig: function getWinnerMonitorConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionHourSummary.getWinnerMonitorConfig, [data.platformObjId], actionName, isValidData);
        },

        getWinnerMonitorData: function getWinnerMonitorData (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbPlayerConsumptionHourSummary.getWinnerMonitorData, [data.platformObjId, data.startTime, data.endTime, data.providerObjId, data.playerName], actionName, isValidData);
        },

        getLastWithdrawalTime: function getLastWithdrawalTime (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionHourSummary.getLastWithdrawalTime, [data.playerObjId], actionName, isValidData);
        },

        getTotalPlayerCreditNumber: function getTotalPlayerCreditNumber (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbLargeWithdrawal.getTotalPlayerCreditNumber, [data.playerObjId], actionName, isValidData);
        },

        getConsumptionTimesByTime: function getConsumptionTimesByTime (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbLargeWithdrawal.getConsumptionTimesByTime, [data.playerObjId, data.startTime, data.endTime], actionName, isValidData);
        },

        getThreeMonthPlayerCreditSummary: function getThreeMonthPlayerCreditSummary (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbLargeWithdrawal.getThreeMonthPlayerCreditSummary, [data.playerObjId], actionName, isValidData);
        },
    };

    socketActionWinnerMonitor = this.actions;
}

module.exports = socketActionWinnerMonitor;