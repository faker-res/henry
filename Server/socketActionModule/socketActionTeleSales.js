const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbUtil = require('./../modules/dbutility');
const dbPlayerLoginRecord = require('./../db_modules/dbPlayerLoginRecord');
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

        getAdminPhoneReminderList: function getAdminPhoneReminderList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.admin);
            socketUtil.emitter(self.socket, dbTeleSales.getAdminPhoneReminderList, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getTSPhoneListName: function getTSPhoneListName(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbTeleSales.getTSPhoneListName, [data], actionName, isValidData);
        },

        createTsPhoneFeedback: function createTsPhoneFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhone && data.tsPhoneList && data.platform && data.adminId);
            socketUtil.emitter(self.socket, dbTeleSales.createTsPhoneFeedback, [data], actionName, isValidData);
        },

        createTsPhonePlayerFeedback: function createTsPhonePlayerFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.tsPhone && data.tsPhoneList && data.platform && data.adminId);
            socketUtil.emitter(self.socket, dbTeleSales.createTsPhonePlayerFeedback, [data], actionName, isValidData);
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

        updateTsPhoneDistributedPhone: function updateTsPhoneDistributedPhone(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbTeleSales.updateTsPhoneDistributedPhone, [data.query, data.updateData], actionName, isValidData);
        },

        getTsDistributedPhoneReminder: function getTsDistributedPhoneReminder(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.assignee);
            socketUtil.emitter(self.socket, dbTeleSales.getTsDistributedPhoneReminder, [data.platform, data.assignee], actionName, isValidData);
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

        manualPauseTsPhoneListStatus: function manualPauseTsPhoneListStatus(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhoneList && data.status);
            socketUtil.emitter(self.socket, dbTeleSales.manualPauseTsPhoneListStatus, [data.tsPhoneList, data.status], actionName, isValidData);
        },

        forceCompleteTsPhoneList: function forceCompleteTsPhoneList(data){
        var actionName = arguments.callee.name;
        var isValidData = Boolean(data && data.tsPhoneList);
        socketUtil.emitter(self.socket, dbTeleSales.forceCompleteTsPhoneList, [data.tsPhoneList], actionName, isValidData);
    },

        getDistributionDetails: function getDistributionDetails(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.tsPhoneListObjId && data.adminNames && data.adminNames.length > 0);
            socketUtil.emitter(self.socket, dbTeleSales.getDistributionDetails, [data.platformObjId, data.tsPhoneListObjId, data.adminNames], actionName, isValidData);
        },

        getTsWorkloadReport: function getTsWorkloadReport(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.phoneListObjIds && data.startTime && data.endTime && data.adminObjIds);
            socketUtil.emitter(self.socket, dbTeleSales.getTsWorkloadReport, [data.platformObjId, data.phoneListObjIds, data.startTime, data.endTime, data.adminObjIds], actionName, isValidData);
        },

        getTsPlayerRetentionAnalysis: function getTsPlayerRetentionAnalysis(data) {
            let actionName = arguments.callee.name;
            let diffDays;
            if (data.startTime && data.endTime) {
                let timeDiff =  new Date(data.endTime).getTime() - new Date(data.startTime).getTime();
                if (timeDiff >= 0) {
                    diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // + 1 to include end day
                }
            }
            let isValidData = Boolean(data && data.platformObjId && data.startTime && data.endTime && data.days && diffDays && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean' && data.tsPhoneListObjId);
            let startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getPlayerRetention, [ObjectId(data.platformObjId), startTime, data.days, data.playerType, diffDays, data.isRealPlayer, data.isTestPlayer, data.hasPartner, null, data.tsPhoneListObjId], actionName, isValidData);
        },

    };
    socketActionTeleSales.actions = this.actions;
}

module.exports = socketActionTeleSales;
