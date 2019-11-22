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

        getAllTSPhoneListFromPlatforms: function getAllTSPhoneListFromPlatforms(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjIds);
            socketUtil.emitter(self.socket, dbTeleSales.getAllTSPhoneList, [data.platformObjIds], actionName, isValidData);
        },

        getOneTsNewList: function getOneTsNewList (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && ((data.platform && data.name) || data._id));
            socketUtil.emitter(self.socket, dbTeleSales.getOneTsNewList, [data], actionName, isValidData);
        },

        getAdminPhoneList: function getAdminPhoneList(data) {
        let actionName = arguments.callee.name;
        data = data || {};
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

        redistributePhoneNumber:  function redistributePhoneNumber(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data._id);
            socketUtil.emitter(self.socket, dbTeleSales.redistributePhoneNumber, [data._id, data.platform], actionName, isValidData);
        },

        getRecycleBinTsPhoneList: function getRecycleBinTsPhoneList(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 10;
            let sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbTeleSales.getRecycleBinTsPhoneList, [data.platform, data.startTime, data.endTime, data.status, data.name, index, limit, sortCol], actionName, isValidData);
        },

        getTsPhoneListRecyclePhone: function getTsPhoneListRecyclePhone(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.tsPhoneList);
            socketUtil.emitter(self.socket, dbTeleSales.getTsPhoneListRecyclePhone, [data], actionName, isValidData);
        },

        createTsPhoneFeedback: function createTsPhoneFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhone && data.tsPhoneList && data.platform && data.adminId && data.result && data.resultName && data.topic);
            socketUtil.emitter(self.socket, dbTeleSales.createTsPhoneFeedback, [data], actionName, isValidData);
        },

        createTsPhonePlayerFeedback: function createTsPhonePlayerFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.tsPhone && data.tsPhoneList && data.platform && data.adminId);
            socketUtil.emitter(self.socket, dbTeleSales.createTsPhonePlayerFeedback, [data], actionName, isValidData);
        },

        getTsPhoneFeedback: function getTsPhoneFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhone && data.platform);
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

        getTsAssigneesCount: function getTsAssigneesCount(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbTeleSales.getTsAssigneesCount, [data.query], actionName, isValidData);
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

        updateTsPhoneListDecomposedTime: function updateTsPhoneListDecomposedTime(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.tsPhoneListObjId);
            socketUtil.emitter(self.socket, dbTeleSales.updateTsPhoneListDecomposedTime, [data.tsPhoneListObjId], actionName, isValidData);
        },

        updateTsPhoneListStatus: function updateTsPhoneListStatus(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhoneList && data.status);
            socketUtil.emitter(self.socket, dbTeleSales.updateTsPhoneListStatus, [data.tsPhoneList, data.status], actionName, isValidData);
        },

        forceCompleteTsPhoneList: function forceCompleteTsPhoneList(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.tsPhoneList);
            socketUtil.emitter(self.socket, dbTeleSales.forceCompleteTsPhoneList, [data.tsPhoneList], actionName, isValidData);
        },

        decomposeTsPhoneList: function decomposeTsPhoneList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.sourceTsPhoneListName && data.tsPhones);
            socketUtil.emitter(self.socket, dbTeleSales.decomposeTsPhoneList, [data.sourceTsPhoneListName, data.tsPhones], actionName, isValidData);
        },

        reclaimTsPhone: function reclaimTsPhone(data){
        var actionName = arguments.callee.name;
        var isValidData = Boolean(data && data.platformObjId && data.tsPhoneListObjId && data.assignee);
        socketUtil.emitter(self.socket, dbTeleSales.reclaimTsPhone, [data.platformObjId, data.tsPhoneListObjId, data.assignee, data.isNeverUsed], actionName, isValidData);
    },

        getDistributionDetails: function getDistributionDetails(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.tsPhoneListObjId && data.adminNames && data.adminNames.length > 0);
            socketUtil.emitter(self.socket, dbTeleSales.getDistributionDetails, [data.platformObjId, data.tsPhoneListObjId, data.adminNames], actionName, isValidData);
        },

        getTsWorkloadReport: function getTsWorkloadReport(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjIds && data.phoneListObjIds && data.startTime && data.endTime && data.adminObjIds);
            socketUtil.emitter(self.socket, dbTeleSales.getTsWorkloadReport, [data.platformObjIds, data.phoneListObjIds, data.startTime, data.endTime, data.adminObjIds], actionName, isValidData);
        },

        bulkSendSmsToFailCallee: function bulkSendSmsToFailCallee(data) {
            let actionName = arguments.callee.name;
            let adminObjId = getAdminId();
            let adminName = getAdminName();
            let isValidData = Boolean(data && data.tsPhoneDetails && data.channel != null && data.platformId != null  && data.message && adminObjId && adminName);
            if (data) {
                data.delay = data.delay || 0;
            }
            socketUtil.emitter(self.socket, dbTeleSales.bulkSendSmsToFailCallee, [adminObjId, adminName, data, data.tsPhoneDetails], actionName, isValidData);
        },

        exportDecomposedPhone: function exportDecomposedPhone(data) {
            let actionName = arguments.callee.name;
            let adminObjId = getAdminId();
            let adminName = getAdminName();
            let isValidData = Boolean(data && data.sourcePlatform && data.sourceTopicName && data.exportCount && data.targetPlatform && data.phoneTradeObjIdArr && adminObjId && adminName);
            socketUtil.emitter(self.socket, dbTeleSales.manualExportDecomposedPhones, [data.sourcePlatform, data.sourceTopicName, data.exportCount, data.targetPlatform, data.phoneTradeObjIdArr, adminInfo], actionName, isValidData);
        },

        getActivePhoneListNameForAdmin: function getActivePhoneListNameForAdmin(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getActivePhoneListNameForAdmin, [data.platformObjId, getAdminId()], actionName, isValidData);
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

        getTrashClassification: function getTrashClassification(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbTeleSales.getTrashClassification, [data.platformId], actionName, isValidData);
        },

        getCountDecompositionList: function getCountDecompositionList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbTeleSales.getCountDecompositionList, [data.platformId], actionName, isValidData);
        },

        getfeedbackPhoneList: function getfeedbackPhoneList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbTeleSales.getfeedbackPhoneList, [data.platformId], actionName, isValidData);
        },

        getTsPhone: function getTsPhone(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbTeleSales.getTsPhone, [data.query, data.isTSNewList, data.platformObjId, data.isFeedbackPhone], actionName, isValidData);
        },

        dailyTradeTsPhone: function dailyTradeTsPhone(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbTeleSales.dailyTradeTsPhone, [], actionName, isValidData);
        },

        debugTsPhoneList: function debugTsPhoneList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.tsPhoneList);
            socketUtil.emitter(self.socket, dbTeleSales.debugTsPhoneList, [data.tsPhoneList], actionName, isValidData);
        },

        debugTsPhone: function debugTsPhone(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.tsPhone);
            socketUtil.emitter(self.socket, dbTeleSales.debugTsPhone, [data.tsPhone], actionName, isValidData);
        },

        debugTsPhoneNumber: function debugTsPhoneNumber(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.phoneNumber);
            socketUtil.emitter(self.socket, dbTeleSales.debugTsPhoneNumber, [data.phoneNumber], actionName, isValidData);
        },

        getDecomposedNewPhoneRecord: function getDecomposedNewPhoneRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 100;
            let sortCol = data.sortCol || {"tradeTime": -1};
            socketUtil.emitter(self.socket, dbTeleSales.getDecomposedNewPhoneRecord, [data.platformId, data.startTime, data.endTime, index, limit, sortCol], actionName, isValidData);
        },

        getFeedbackPhoneRecord: function getFeedbackPhoneRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 100;
            let sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbTeleSales.getFeedbackPhoneRecord, [data.platformId, data.sourcePlatform, data.topUpTimesOperator, data.topUpTimes, data.topUpTimesTwo, data.startTime, data.endTime, index, limit, sortCol], actionName, isValidData);
        },

        searchTrashClassificationTrade: function searchTrashClassificationTrade(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.phoneLists && data.topic && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbTeleSales.searchTrashClassificationTrade, [data.platformObjId, data.phoneLists, data.topic, data.startTime, data.endTime, data.index, data.limit], actionName, isValidData);
        },

        filterExistingPhonesForDecomposedPhones: function filterExistingPhonesForDecomposedPhones(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.phoneNumbers && data.targetPlatformObjId);
            socketUtil.emitter(self.socket, dbTeleSales.filterExistingPhonesForDecomposedPhones, [data.phoneNumbers, data.targetPlatformObjId], actionName, isValidData);
        },

        getTsPhoneCountDetail: function getTsPhoneCountDetail(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.tsPhoneListObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getTsPhoneCountDetail, [data.tsPhoneListObjId], actionName, isValidData);
        },

        getRegisteredPlayerFromPhoneList: function getRegisteredPlayerFromPhoneList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.tsPhoneListObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getRegisteredPlayerFromPhoneList, [data.tsPhoneListObjId], actionName, isValidData);
        },
    };
    socketActionTeleSales.actions = this.actions;
}

module.exports = socketActionTeleSales;
