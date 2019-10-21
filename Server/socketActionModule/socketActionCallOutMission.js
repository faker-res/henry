const socketUtil = require('./../modules/socketutility');
const dbCallOutMission = require('./../db_modules/dbCallOutMission');
const dbTsCallOutMission = require('./../db_modules/dbTsCallOutMission');
const dbCtiCallOut = require('./../db_modules/dbCtiCallOut');

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
            socketUtil.emitter(self.socket, dbCallOutMission.createCallOutMission, [data.platformObjId, data.adminObjId, data.searchFilter, data.searchQuery, data.sortCol, data.selectedPlayers, data.backEndQuery], actionName, isValidData);
        },

        toggleCallOutMissionStatus: function toggleCallOutMissionStatus(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbCallOutMission.toggleCallOutMissionStatus, [data.platformObjId, data.missionName, getAdminId()], actionName, isValidData);
        },

        stopCallOutMission: function stopCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbCallOutMission.stopCallOutMission, [data.platformObjId, data.missionName, getAdminId()], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbTsCallOutMission.createCallOutMission, [data.platformObjId, data.adminObjId, data.searchFilter, data.searchQuery, data.sortCol, data.selectedPhones], actionName, isValidData);
        },

        toggleTsCallOutMissionStatus: function toggleTsCallOutMissionStatus(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbTsCallOutMission.toggleCallOutMissionStatus, [data.platformObjId, data.missionName, getAdminId()], actionName, isValidData);
        },

        stopTsCallOutMission: function stopTsCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.missionName);
            socketUtil.emitter(self.socket, dbTsCallOutMission.stopCallOutMission, [data.platformObjId, data.missionName, getAdminId()], actionName, isValidData);
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

        checkTsCtiMissionMode: function checkTsCtiMissionMode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTsCallOutMission.checkTsCtiMissionMode, [data.platformObjId, getAdminId()], actionName, isValidData);
        },

        addCtiUrlSubDomain: function addCtiUrlSubDomain(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.urlSubDomain);
            socketUtil.emitter(self.socket, dbCtiCallOut.addCtiUrlSubDomain, [data.urlSubDomain], actionName, isValidData);
        },

        removeCtiUrlSubDomain: function removeCtiUrlSubDomain(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.ctiUrlObjId);
            socketUtil.emitter(self.socket, dbCtiCallOut.removeCtiUrlSubDomain, [data.ctiUrlObjId], actionName, isValidData);
        },

        getCtiUrlSubDomainList: function getCtiUrlSubDomainList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbCtiCallOut.getCtiUrlSubDomainList, [], actionName, isValidData);
        },
    };
    socketActionBankCardGroup.actions = this.actions;
}

module.exports = socketActionBankCardGroup;
