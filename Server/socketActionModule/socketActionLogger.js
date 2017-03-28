/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var socketUtil = require('./../modules/socketutility');
var dbApiResponseTimeLog = require('./../db_modules/dbApiResponseTimeLog');
var dbSettlementLog = require('./../db_modules/dbSettlementLog');
var constSystemParam = require('../const/constSystemParam');
var dbPlayerLoginRecord = require('./../db_modules/dbPlayerLoginRecord');
var dbPlayerMail = require('../db_modules/dbPlayerMail');
var dbUtil = require('./../modules/dbutility');
var dbLogger = require("./../modules/dbLogger");
var constProposalUserType = require('../const/constProposalUserType');

function socketActionLogger(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    this.actions = {

        /**
         * Create a new api user
         * @param {json} data - api-user data
         */
        getApiLoggerAllServiceName: function getApiLoggerAllServiceName(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbApiResponseTimeLog.getApiLoggerAllServiceName, [], actionName, true);
        },
        getApiLoggerAllFunctionNameOfService: function getApiLoggerAllFunctionNameOfService(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.service);
            socketUtil.emitter(self.socket, dbApiResponseTimeLog.getApiLoggerAllFunctionNameOfService, [data.service], actionName, isValidData);
        },

        getApiResponseTimeQuery: function getApiResponseTimeQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.service && data.functionName);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbApiResponseTimeLog.getApiResponseTimeQuery, [data.startDate, data.endDate, data.service, data.functionName, data.providerId], actionName, isValidData);
        },

        getClientSourceQuery: function getClientSourceQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getClientSourceQuery, [data], actionName, isValidData);
        },
        getClientSourcePara: function getClientSourcePara(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerLoginRecord.getClientSourcePara, [], actionName, true);
        },

        getSettlementHistory: function getSettlementHistory(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbSettlementLog.getLastSettlementRecord, [data.query, constSystemParam.MAX_RECORD_NUM], actionName, isValidData);
        },

        getPaymentHistory: function getPaymentHistory(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.objectId && data.type);
            var query = {
                targetObjectId: data.objectId,
                targetType: constProposalUserType[data.type]
            }
            socketUtil.emitter(self.socket, dbLogger.getPaymentHistory, [query], actionName, isValidData);
        },
        sendSMStoNumber: function sendSMStoNumber(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.phoneNumber && data.channel != null && data.platformId != null && data.message);
            socketUtil.emitter(self.socket, dbPlayerMail.sendSMStoNumber, [getAdminId(), getAdminName(), data], actionName, isValidData);
        }
    };
    socketActionLogger.actions = this.actions;
};

module.exports = socketActionLogger;