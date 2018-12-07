const socketUtil = require('./../modules/socketutility');
const dbCallOutMission = require('./../db_modules/dbCallOutMission');
const dbTsCallOutMission = require('./../db_modules/dbTsCallOutMission')

function socketActionBankCardGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }
    this.actions = {
        createCallOutMission: function createCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.adminObjId && data.searchFilter && data.searchQuery && data.sortCol);
            socketUtil.emitter(self.socket, dbCallOutMission.createCallOutMission, [data.platformObjId, data.adminObjId, data.searchFilter, data.searchQuery, data.sortCol, data.selectedPlayers], actionName, isValidData);
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
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbCallOutMission.getUpdatedAdminMissionStatusFromCti, [data.platformObjId, getAdminId(), data.limit, data.index], actionName, isValidData);
        },

        endCallOutMission: function endCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbCallOutMission.confirmMissionFinish, [data.platformObjId, getAdminId(), data.missionName], actionName, isValidData);
        },

        forceStopFPMSMission: function forceStopFPMSMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbCallOutMission.forceStopFPMSMission, [data.platformObjId, getAdminId()], actionName, isValidData);
        },

        createTsCallOutMission: function createTsCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.adminObjId && data.searchFilter && data.searchQuery && data.sortCol);
            socketUtil.emitter(self.socket, dbTsCallOutMission.createCallOutMission, [data.platformObjId, data.adminObjId, data.searchFilter, data.searchQuery, data.sortCol, data.selectedPlayers], actionName, isValidData);
        },

        toggleTsCallOutMissionStatus: function toggleTsCallOutMissionStatus(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbTsCallOutMission.toggleCallOutMissionStatus, [data.platformObjId, data.missionName], actionName, isValidData);
        },

        stopTsCallOutMission: function stopTsCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbTsCallOutMission.stopCallOutMission, [data.platformObjId, data.missionName], actionName, isValidData);
        },

        getTsUpdatedAdminMissionStatusFromCti: function getTsUpdatedAdminMissionStatusFromCti(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTsCallOutMission.getUpdatedAdminMissionStatusFromCti, [data.platformObjId, getAdminId(), data.limit, data.index], actionName, isValidData);
        },

        endTsCallOutMission: function endTsCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTsCallOutMission.confirmMissionFinish, [data.platformObjId, getAdminId(), data.missionName], actionName, isValidData);
        },

        forceStopTsCallOutMission: function forceStopTsCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTsCallOutMission.forceStopFPMSMission, [data.platformObjId, getAdminId()], actionName, isValidData);
        },
    };
    socketActionBankCardGroup.actions = this.actions;
}

module.exports = socketActionBankCardGroup;
