const socketUtil = require('./../modules/socketutility');
const dbCallOutMission = require('./../db_modules/dbCallOutMission');

function socketActionBankCardGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {
        createCallOutMission: function createCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.adminObjId && data.searchFilter && data.searchQuery && data.sortCol);
            socketUtil.emitter(self.socket, dbCallOutMission.createCallOutMission, [data.platformObjId, data.adminObjId, data.searchFilter, data.searchQuery, data.sortCol], actionName, isValidData);
        },

        toggleCallOutMissionStatus: function toggleCallOutMissionStatus(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbCallOutMission.toggleCallOutMissionStatus, [data.platformObjId, data.missionName], actionName, isValidData);
        },

        stopCallOutMission: function stopCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbCallOutMission.stopCallOutMission, [data.platformObjId, data.missionName], actionName, isValidData);
        },

        getUpdatedAdminMissionStatusFromCti: function getUpdatedAdminMissionStatusFromCti(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.adminObjectId);
            socketUtil.emitter(self.socket, dbCallOutMission.getUpdatedAdminMissionStatusFromCti, [data.platformObjId, data.adminObjectId], actionName, isValidData);
        },

    };
    socketActionBankCardGroup.actions = this.actions;
}

module.exports = socketActionBankCardGroup;