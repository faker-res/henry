let socketUtil = require('./../modules/socketutility');
let dbCsOfficer = require('./../db_modules/dbCsOfficer');

function socketActionCsOfficer(socketIO, socket) {
    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    this.actions = {
        // example format, to-be-deleted
        // testNewSocketAction: function testNewSocketAction(data) {
        //     var actionName = arguments.callee.name;
        //     var isValidData = Boolean(true);
        //     socketUtil.emitter(self.socket, dbCsOfficer.testNewApi, [], actionName, isValidData);
        // },
        // createOfficer: function createOfficer(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformId && data.name);
        //     socketUtil.emitter(self.socket, dbCsOfficer.createOfficer, [data.platformId, data.name], actionName, isValidData);
        // },

        // getAllOfficer: function getAllOfficer(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformId);
        //     socketUtil.emitter(self.socket, dbCsOfficer.getAllOfficer, [data.platformId], actionName, isValidData);
        // },

        addPromoteWay: function addPromoteWay(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.name && data.platformId);
            socketUtil.emitter(self.socket, dbCsOfficer.addPromoteWay, [data.name, data.platformId], actionName, isValidData);
        },

        getAllPromoteWay: function getAllPromoteWay(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbCsOfficer.getAllPromoteWay, [data.platformId], actionName, isValidData);
        },

        addUrl: function addUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.officerId && data.domain);
            socketUtil.emitter(self.socket, dbCsOfficer.addUrl, [data.platformId, data.officerId, data.domain, data.way, getAdminId()], actionName, isValidData);
        },

        deletePromoteWay: function deletePromoteWay(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.promoteWayId && data.platformId);
            socketUtil.emitter(self.socket, dbCsOfficer.deletePromoteWay, [data.promoteWayId, data.platformId, data.promoteWayName], actionName, isValidData);
        },

        deleteOfficer: function deleteOfficer(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.officerId);
            socketUtil.emitter(self.socket, dbCsOfficer.deleteOfficer, [data.officerId], actionName, isValidData);
        },

        getAllUrl: function getAllUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbCsOfficer.getAllUrl, [data.platformId], actionName, isValidData);
        },

        deleteUrl: function deleteUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.urlId && data.platformId && typeof data.ignoreChecking == 'boolean');
            socketUtil.emitter(self.socket, dbCsOfficer.deleteUrl, [data.urlId, data.platformId, data.ignoreChecking], actionName, isValidData);
        },

        updateUrl: function updateUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.urlId && data.domain && data.officerId && data.way && data.platformId && typeof data.ignoreChecking == 'boolean');
            socketUtil.emitter(self.socket, dbCsOfficer.updateUrl, [data.urlId, data.domain, data.officerId, data.way, data.platformId, data.ignoreChecking, getAdminId()], actionName, isValidData);
        },

        searchUrl: function searchUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbCsOfficer.searchUrl, [data.platformIds, data.domain, data.admin, data.way], actionName, isValidData);
        }
    };

    socketActionCsOfficer.actions = this.actions;
}

module.exports = socketActionCsOfficer;
