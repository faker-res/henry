let socketUtil = require('./../modules/socketutility');
let dbCsOfficer = require('./../db_modules/dbCsOfficer');

function socketActionCsOfficer(socketIO, socket) {
    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
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
            socketUtil.emitter(self.socket, dbCsOfficer.addUrl, [data.platformId, data.officerId, data.domain, data.way], actionName, isValidData);
        },

        deletePromoteWay: function deletePromoteWay(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.promoteWayId && data.platformId);
            socketUtil.emitter(self.socket, dbCsOfficer.deletePromoteWay, [data.promoteWayId, data.platformId], actionName, isValidData);
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
            let isValidData = Boolean(data && data.urlId);
            socketUtil.emitter(self.socket, dbCsOfficer.deleteUrl, [data.urlId], actionName, isValidData);
        },

        updateUrl: function updateUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.urlId && data.domain && data.officerId && data.way);
            socketUtil.emitter(self.socket, dbCsOfficer.updateUrl, [data.urlId, data.domain, data.officerId, data.way], actionName, isValidData);
        },

        searchUrl: function searchUrl(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbCsOfficer.searchUrl, [data.platformId, data.domain, data.admin, data.way], actionName, isValidData);
        }
    };

    socketActionCsOfficer.actions = this.actions;
}

module.exports = socketActionCsOfficer;