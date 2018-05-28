const socketUtil = require('./../modules/socketutility');
const dbCallOutMission = require('./../db_modules/dbCallOutMission');

function socketActionBankCardGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {
        createCallOutMission: function createCallOutMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.adminObjId && data.searchFilter && data.searchQuery && data.sortCol);
            socketUtil.emitter(self.socket, dbCallOutMission.createCallOutMission, [data.platformObjId, data.adminObjId, data.searchFilter, data.searchQuery, data.sortCol], actionName, isValidData);
        },



    };
    socketActionBankCardGroup.actions = this.actions;
};

module.exports = socketActionBankCardGroup;