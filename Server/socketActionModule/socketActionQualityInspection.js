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
        getUnreadEvaluationRecordByDailyRecord: function getUnreadEvaluationRecordByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.hasOwnProperty('startTime') && data.hasOwnProperty('endTime'));
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getUnreadEvaluationRecordByDailyRecord, [data.startTime, data.endTime, index, size, getAdminId()], actionName, isDataValid);
        },
        getReadEvaluationRecord: function getReadEvaluationRecord(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getReadEvaluationRecord, [data.startTime, data.endTime, index, size, getAdminId()], actionName, isDataValid);
        },
        getReadEvaluationRecordByDailyRecord: function getReadEvaluationRecordByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.hasOwnProperty('startTime') && data.hasOwnProperty('endTime'));
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getReadEvaluationRecordByDailyRecord, [data.startTime, data.endTime, index, size, getAdminId()], actionName, isDataValid);
        },
        getAppealEvaluationRecordByConversationDate: function getAppealEvaluationRecordByConversationDate(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.status);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getAppealEvaluationRecordByConversationDate, [data.startTime, data.endTime, data.status, index, size, getAdminId()], actionName, isDataValid);
        },
        getAppealEvaluationRecordByConversationDateInDailyRecord: function getAppealEvaluationRecordByConversationDateInDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.hasOwnProperty('startTime') &&  data.hasOwnProperty('endTime') && data.hasOwnProperty('status'));
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getAppealEvaluationRecordByConversationDateInDailyRecord, [data.startTime, data.endTime, data.status, index, size, getAdminId()], actionName, isDataValid);
        },
        getAppealEvaluationRecordByAppealDate: function getAppealEvaluationRecordByAppealDate(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.status);
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getAppealEvaluationRecordByAppealDate, [data.startTime, data.endTime, data.status, index, size, getAdminId()], actionName, isDataValid);
        },
        getAppealEvaluationRecordByAppealDateInDailyRecord: function getAppealEvaluationRecordByAppealDateInDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.hasOwnProperty('startTime') &&  data.hasOwnProperty('endTime') && data.hasOwnProperty('status'));
            var index = data.index || 0;
            var size = data.limit || 1;
            socketUtil.emitter(self.socket, dbQualityInspection.getAppealEvaluationRecordByAppealDateInDailyRecord, [data.startTime, data.endTime, data.status, index, size, getAdminId()], actionName, isDataValid);
        },
        getWorkloadReport: function getWorkloadReport(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.qualityAssessor);
            socketUtil.emitter(self.socket, dbQualityInspection.getWorkloadReport, [data.startTime, data.endTime, data.qualityAssessor], actionName, isDataValid);
        },
        getWorkloadReportByDailyRecord: function getWorkloadReportByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.hasOwnProperty('startTime') &&  data.hasOwnProperty('endTime') && data.hasOwnProperty('qualityAssessor'));
            socketUtil.emitter(self.socket, dbQualityInspection.getWorkloadReportByDailyRecord, [data.startTime, data.endTime, data.qualityAssessor], actionName, isDataValid);
        },
        getWorkloadReportByDate: function getWorkloadReportByDate(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.startTime, data.endTime, data.qualityAssessor);
            socketUtil.emitter(self.socket, dbQualityInspection.getWorkloadReportByDate, [data.startTime, data.endTime, data.qualityAssessor], actionName, isDataValid);
        },
        getWorkloadReportByDateInDailyRecord: function getWorkloadReportByDateInDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.hasOwnProperty('startTime') &&  data.hasOwnProperty('endTime') && data.hasOwnProperty('qualityAssessor'));
            socketUtil.emitter(self.socket, dbQualityInspection.getWorkloadReportByDateInDailyRecord, [data.startTime, data.endTime, data.qualityAssessor], actionName, isDataValid);
        },
        searchLive800: function searchLive800(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800, [data], actionName, isDataValid);
        },
        countLive800: function countLive800(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.countLive800, [data], actionName, isDataValid);
        },
        searchLive800ByScheduledRecord: function searchLive800ByScheduledRecord(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800ByScheduledRecord, [data], actionName, isDataValid);
        },
        getTotalNumberOfAppealingRecord: function getTotalNumberOfAppealingRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = true;
            socketUtil.emitter(self.socket, dbQualityInspection.getTotalNumberOfAppealingRecord, [data], actionName, isDataValid);
        },
        getTotalNumberOfAppealingRecordByDailyRecord: function getTotalNumberOfAppealingRecordByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = true;
            socketUtil.emitter(self.socket, dbQualityInspection.getTotalNumberOfAppealingRecordByDailyRecord, [data], actionName, isDataValid);
        },
        getTotalNumberOfAppealingRecordByCS: function getTotalNumberOfAppealingRecordByCS(data){
            var actionName = arguments.callee.name;
            var isDataValid = true;
            socketUtil.emitter(self.socket, dbQualityInspection.getTotalNumberOfAppealingRecordByCS, [getAdminId()], actionName, isDataValid);
        },
        getTotalNumberOfAppealingRecordByCSInDailyRecord: function getTotalNumberOfAppealingRecordByCSInDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = true;
            socketUtil.emitter(self.socket, dbQualityInspection.getTotalNumberOfAppealingRecordByCSInDailyRecord, [getAdminId()], actionName, isDataValid);
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
        markEvaluationRecordAsReadByDailyRecord: function markEvaluationRecordAsReadByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.messageId, data.status);
            socketUtil.emitter(self.socket, dbQualityInspection.markEvaluationRecordAsReadByDailyRecord, [data.messageId, data.status], actionName, isDataValid);
        },
        appealEvaluation: function appealEvaluation(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.appealDetailArr);
            socketUtil.emitter(self.socket, dbQualityInspection.appealEvaluation, [data.appealDetailArr], actionName, isDataValid);
        },
        appealEvaluationByDailyRecord: function appealEvaluationByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data.appealDetailArr);
            socketUtil.emitter(self.socket, dbQualityInspection.appealEvaluationByDailyRecord, [data.appealDetailArr], actionName, isDataValid);
        },
        rateCSConversation: function rateCSConversation(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.rateCSConversation, [data, getAdminId()], actionName, isDataValid);
        },
        rateCSConversationByDailyRecord: function rateCSConversationByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.rateCSConversationByDailyRecord, [data, getAdminId()], actionName, isDataValid);
        },
        rateBatchConversation: function rateBatchConversation(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.rateBatchConversation, [data, getAdminId()], actionName, isDataValid);
        },
        rateBatchConversationByDailyRecord: function rateBatchConversationByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.rateBatchConversationByDailyRecord, [data, getAdminId()], actionName, isDataValid);
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
        getEvaluationProgressRecordByDailyRecord: function getEvaluationProgressRecordByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbQualityInspection.getEvaluationProgressRecordByDailyRecord, [data.platformObjId, data.startDate, data.endDate], actionName, isDataValid);
        },
        summarizeLive800Record: function summarizeLive800Record(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.summarizeLive800Record, [data.startTime,data.endTime], actionName, isDataValid);
        },
        resummarizeLive800Record: function resummarizeLive800Record(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.resummarizeLive800Record, [data.startTime,data.endTime], actionName, isDataValid);
        },
        getLive800Records: function getLive800Records(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.getLive800Records, [data.startTime,data.endTime], actionName, isDataValid);
        },
        searchLive800SettlementRecord: function searchLive800SettlementRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800SettlementRecord, [data], actionName, isDataValid);
        },
        searchLive800SettlementRecordByDailyRecord: function searchLive800SettlementRecordByDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800SettlementRecordByDailyRecord, [data], actionName, isDataValid);
        },
        searchLive800SettlementRecordByDate: function searchLive800SettlementRecordByDate(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800SettlementRecordByDate, [data], actionName, isDataValid);
        },
        searchLive800SettlementRecordByDateInDailyRecord: function searchLive800SettlementRecordByDateInDailyRecord(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.searchLive800SettlementRecordByDateInDailyRecord, [data], actionName, isDataValid);
        },
        getSummarizedLive800RecordCount: function getSummarizedLive800RecordCount(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.getSummarizedLive800RecordCount, [data.startTime,data.endTime], actionName, isDataValid);
        },
        getWorkingCSName: function getWorkingCSName(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.getWorkingCSName, [data], actionName, isDataValid);
        },

        getWechatDeviceNickNameList: function getWechatDeviceNickNameList(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.getWechatDeviceNickNameList, [data.platform], actionName, isDataValid);
        },

        getWechatConversationDeviceList: function getWechatConversationDeviceList(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 1000;
            socketUtil.emitter(self.socket, dbQualityInspection.getWechatConversationDeviceList, [data.platform, data.deviceNickName, data.csName, data.startTime, data.endTime, data.content, data.playerWechatRemark, index, limit], actionName, isDataValid);
        },

        getWechatConversation: function getWechatConversation(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            var index = data.index || 0;
            var limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbQualityInspection.getWechatConversation, [data.platform, data.deviceNickName, data.csName, data.startTime, data.endTime, data.content, data.playerWechatRemark, index, limit, data.sortCol], actionName, isDataValid);
        },

        getWechatConversationReport: function getWechatConversationReport(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            var index = data.index || 0;
            var limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbQualityInspection.getWechatConversationReport, [data.platform, data.deviceNickName, data.csName, data.startTime, data.endTime, index, limit], actionName, isDataValid);
        },

        getQQDeviceNickNameList: function getQQDeviceNickNameList(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.getQQDeviceNickNameList, [data.platform], actionName, isDataValid);
        },

        getQQConversationDeviceList: function getQQConversationDeviceList(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 1000;
            socketUtil.emitter(self.socket, dbQualityInspection.getQQConversationDeviceList, [data.platform, data.deviceNickName, data.csName, data.startTime, data.endTime, data.content, data.playerQQRemark, index, limit], actionName, isDataValid);
        },

        getQQConversation: function getQQConversation(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            var index = data.index || 0;
            var limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbQualityInspection.getQQConversation, [data.platform, data.deviceNickName, data.csName, data.startTime, data.endTime, data.content, data.playerQQRemark, index, limit, data.sortCol], actionName, isDataValid);
        },

        getQQConversationReport: function getQQConversationReport(data){
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.startTime && data.endTime);
            var index = data.index || 0;
            var limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbQualityInspection.getQQConversationReport, [data.platform, data.deviceNickName, data.csName, data.startTime, data.endTime, index, limit], actionName, isDataValid);
        },

        getManualProcessRecord: function getManualProcessRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.adminObjId);
            socketUtil.emitter(self.socket, dbQualityInspection.getManualProcessRecord, [data], actionName, isValidData);
        },

        getManualProcessProposalDetail: function getManualProcessProposalDetail (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId);
            socketUtil.emitter(self.socket, dbQualityInspection.getManualProcessProposalDetail, [data], actionName, isValidData);
        },

        summarizeManualProcessRecord: function summarizeManualProcessRecord (data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.summarizeManualProcessRecord, [data.startTime,data.endTime], actionName, isDataValid);
        },

        getCsByCsDepartment: function (data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.csDepartmentObjIdList);
            socketUtil.emitter(self.socket, dbQualityInspection.getCsByCsDepartment, [data.csDepartmentObjIdList], actionName, isDataValid);
        },

        getAudioRecordData: function(data){
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.startDate && data.endDate && data.data );
            socketUtil.emitter(self.socket, dbQualityInspection.getAudioRecordData, [data.startDate, data.endDate, data.data, data.limit, data.index, data.sortCol], actionName, isDataValid);
        },

        getAudioReportData: function(data){
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.startDate && data.endDate && data.data );
            socketUtil.emitter(self.socket, dbQualityInspection.getAudioReportData, [data.startDate, data.endDate, data.data, data.limit, data.index, data.sortCol], actionName, isDataValid);
        },

        getCsRankingReport: function(data){
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbQualityInspection.getCsRankingReport, [data], actionName, isDataValid);
        },

        summarizeCsRankingData: function(data){
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbQualityInspection.summarizeCsRankingData, [data.startTime, data.endTime], actionName, isDataValid);
        },
    };

    socketActionQualityInspection.actions = this.actions;
};

module.exports = socketActionQualityInspection;