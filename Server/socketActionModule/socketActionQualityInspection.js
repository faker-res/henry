var socketUtil = require('./../modules/socketutility');
const dbQualityInspection = require('./../db_modules/dbQualityInspection');

function socketActionQualityInspection(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }
    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    var self = this;
    this.actions = {

        showLive800: function showLive800(data) {
            var actionName = arguments.callee.name;
            data = true;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.connectMysql, [], actionName, isDataValid);
        },
        getUnreadEvaluationRecord: function getUnreadEvaluationRecord(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getUnreadEvaluationRecord, [data.startTime, data.endTime, index, size, getAdminId()], actionName, isDataValid);
        },
        getReadEvaluationRecord: function getReadEvaluationRecord(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getReadEvaluationRecord, [data.startTime, data.endTime, index, size, getAdminId()], actionName, isDataValid);
        },
        getAppealEvaluationRecordByConversationDate: function getAppealEvaluationRecordByConversationDate(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.status);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getAppealEvaluationRecordByConversationDate, [data.startTime, data.endTime, data.status, index, size, getAdminId()], actionName, isDataValid);
        },
        getAppealEvaluationRecordByAppealDate: function getAppealEvaluationRecordByAppealDate(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.status);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getAppealEvaluationRecordByAppealDate, [data.startTime, data.endTime, data.status, index, size, getAdminId()], actionName, isDataValid);
        },
        getWorkloadReport: function getWorkloadReport(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.qualityAssessor);
            socketUtil.emitter(self.socket, dbQualityInspection.getWorkloadReport, [data.startTime, data.endTime, data.qualityAssessor], actionName, isDataValid);
        },
        searchLive800: function searchLive800(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800, [data], actionName, isDataValid);
        },
        searchLive800Record: function searchLive800Record(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800Record, [data], actionName, isDataValid);
        },
        countLive800: function countLive800(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.countLive800, [data], actionName, isDataValid);
        },
        getProgressReportByOperator: function getProgressReportByOperator(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.getProgressReportByOperator, [data.companyId, data.operatorId, data.startTime, data.endTime], actionName, isDataValid);
        },
        markEvaluationRecordAsRead: function markEvaluationRecordAsRead(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.messageId, data.status);
            socketUtil.emitter(self.socket, dbQualityInspection.markEvaluationRecordAsRead, [data.messageId, data.status], actionName, isDataValid);
        },
        appealEvaluation: function appealEvaluation(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.appealDetailArr);
            socketUtil.emitter(self.socket, dbQualityInspection.appealEvaluation, [data.appealDetailArr], actionName, isDataValid);
        },
        rateCSConversation: function rateCSConversation(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.rateCSConversation, [data, getAdminId()], actionName, isDataValid);
        },
        rateBatchConversation: function rateBatchConversation(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.rateBatchConversation, [data, getAdminId()], actionName, isDataValid);
        },
        getEvaluationRecordYearMonth: function getEvaluationRecordYearMonth(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbQualityInspection.getEvaluationRecordYearMonth, [data.platformObjId], actionName, isDataValid);
        },
        getEvaluationProgressRecord: function getEvaluationProgressRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbQualityInspection.getEvaluationProgressRecord, [data.platformObjId, data.startDate, data.endDate], actionName, isDataValid);
        },
        summarizeLive800Record: function summarizeLive800Record(data){
            var actionName = arguments.callee.name;
            var isDataValid = true;
            socketUtil.emitter(self.socket, dbQualityInspection.summarizeLive800Record, [], actionName, isDataValid);
        }


    };

    socketActionQualityInspection.actions = this.actions;
};

module.exports = socketActionQualityInspection;