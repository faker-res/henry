const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerReward = require('./../db_modules/dbPlayerReward');
const dbPromoCode = require('./../db_modules/dbPromoCode');
const dbTeleSales = require('./../db_modules/dbTeleSales');

const socketUtil = require('./../modules/socketutility');

function socketActionTeleSales(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    let adminInfo;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    if (getAdminId() && getAdminName()) {
        adminInfo = {
            name: getAdminName(),
            type: 'admin',
            id: getAdminId()
        }
    }

    this.actions = {
        getAllTSPhoneList: function getAllTSPhoneList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getAllTSPhoneList, [data.platformObjId], actionName, isValidData);
        },

        getOneTsNewList: function getOneTsNewList (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && ((data.platform && data.name) || data._id));
            socketUtil.emitter(self.socket, dbTeleSales.getOneTsNewList, [data], actionName, isValidData);
        },

        getAdminPhoneList: function getAdminPhoneList(data) {
        let actionName = arguments.callee.name;
        let isValidData = Boolean(data && data.platform && data.admin);
        socketUtil.emitter(self.socket, dbTeleSales.getAdminPhoneList, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
    },

        getTSPhoneListName: function getTSPhoneListName(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbTeleSales.getTSPhoneListName, [data], actionName, isValidData);
        },

        createTsPhoneFeedback: function createTsPhoneFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhone && data.platform && data.adminId);
            socketUtil.emitter(self.socket, dbTeleSales.createTsPhoneFeedback, [data], actionName, isValidData);
        },

        getTsPhoneFeedback: function getTsPhoneFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhone && data.platform && data.adminId);
            socketUtil.emitter(self.socket, dbTeleSales.getTsPhoneFeedback, [data], actionName, isValidData);
        },

        searchTsSMSLog: function searchTsSMSLog(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsDistributedPhone);
            socketUtil.emitter(self.socket, dbTeleSales.searchTsSMSLog, [data, data.index, data.limit], actionName, isValidData);
        },

        getTsDistributedPhoneDetail: function getTsDistributedPhoneDetail (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.tsDistributedPhoneObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getTsDistributedPhoneDetail, [data.tsDistributedPhoneObjId], actionName, isValidData);
        },

        distributePhoneNumber: function distributePhoneNumber (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.tsListObjId);
            socketUtil.emitter(self.socket, dbTeleSales.distributePhoneNumber, [data], actionName, isValidData);
        },

        getTsPhoneImportRecord: function getTsPhoneImportRecord (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && ((data.platform && data.tsPhoneList) || data._id));
            socketUtil.emitter(self.socket, dbTeleSales.getTsPhoneImportRecord, [data], actionName, isValidData);
        },

        updateTsPhoneList: function updateTsPhoneList (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbTeleSales.updateTsPhoneList, [data.query, data.updateData], actionName, isValidData);
        },

        getTsAssignees: function getTsAssignees(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhoneListObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getTsAssignees, [data.tsPhoneListObjId], actionName, isValidData);
        },

        updateTsAssignees: function updateTsAssignees(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.tsPhoneListObjId && data.assignees && data.assignees.length > 0);
            socketUtil.emitter(self.socket, dbTeleSales.updateTsAssignees, [data.platformObjId, data.tsPhoneListObjId, data.assignees], actionName, isValidData);
        },

        removeTsAssignees: function removeTsAssignees(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.tsPhoneListObjId && data.adminNames && data.adminNames.length > 0);
            socketUtil.emitter(self.socket, dbTeleSales.removeTsAssignees, [data.platformObjId, data.tsPhoneListObjId, data.adminNames], actionName, isValidData);
        },

        getDistributionDetails: function getDistributionDetails(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.tsPhoneListObjId && data.adminNames && data.adminNames.length > 0);
            socketUtil.emitter(self.socket, dbTeleSales.getDistributionDetails, [data.platformObjId, data.tsPhoneListObjId, data.adminNames], actionName, isValidData);
        }

    };
    socketActionTeleSales.actions = this.actions;
}

module.exports = socketActionTeleSales;
