const socketUtil = require('./../modules/socketutility');
const dbPlayerConsumptionHourSummary = require('./../db_modules/dbPlayerConsumptionHourSummary');

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



    };

    socketActionWinnerMonitor = this.actions;
}

module.exports = socketActionWinnerMonitor;