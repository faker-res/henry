var socketUtil = require('./../modules/socketutility');
var dbProposal = require('./../db_modules/dbProposal');
var utility = require('./../modules/encrypt');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlayerFeedback = require('./../db_modules/dbPlayerFeedback');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var dbLogger = require("./../modules/dbLogger");
var dbGameProviderDaySummary = require('./../db_modules/dbGameProviderDaySummary');
var dbGameProviderPlayerDaySummary = require('./../db_modules/dbGameProviderPlayerDaySummary');
var dbPlayerConsumptionWeekSummary = require('./../db_modules/dbPlayerConsumptionWeekSummary');
var dbPaymentReconciliation = require('../db_modules/dbPaymentReconciliation');
var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constPlayerTopUpType = require('./../const/constPlayerTopUpType');
var constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbUtil = require('./../modules/dbutility');
var dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
var dbPlayerTopUpDaySummary = require('./../db_modules/dbPlayerTopUpDaySummary');

const dbPlayerReward = require('./../db_modules/dbPlayerReward');
const dbReport = require('./../db_modules/dbReport');

function socketActionReport(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        getProposalStaticsReport: function getProposalStaticsReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.index != null && data.limit != null);
            var query = null;

            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            data ["startTime"] = startTime;
            data["endTime"] = endTime;
            query = utility.buildProposalReportQueryString(data);

            socketUtil.emitter(self.socket, dbProposal.getProposalsByAdvancedQuery, [query, data.index, data.limit, data.sortCol, data.isExport], actionName, isValidData);
        },

        getFinancialPointsReport: function getFinancialPointsReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.index != null && data.limit != null);

            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            data ["startTime"] = startTime;
            data["endTime"] = endTime;
            // if (data.platformId) {
            //     data.platformId = ObjectId(data.platformId);
            // }

            socketUtil.emitter(self.socket, dbProposal.getFinancialPointsReport, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getConsumptionModeReport: function getConsumptionModeReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.index != null && data.limit != null && data.providerId && data.cpGameType && data.betType && data.betType.length);

            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            data ["startTime"] = startTime;
            data["endTime"] = endTime;
            if (data.providerId) {
                data.providerId = ObjectId(data.providerId);
            }

            socketUtil.emitter(self.socket, dbProposal.getConsumptionModeReport, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * Create topup record report
         * @param {json} query - query data. It has to contain correct data format
         */
        topupReport: function topupReport(query) {
            var actionName = arguments.callee.name;
            query.limit = query.limit || 10;
            var isValidData = Boolean(query);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.topupReport, [query, query.index, query.limit, query.sortCol, query.isExport], actionName, isValidData);
        },

        /**
         * Create topup record report
         * @param {json} query - query data. It has to contain correct data format
       */
        operationReport: function operationReport(query) {
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            var endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 20;
            var isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getAllProviderDaySummaryForTimeFrame, [startTime, endTime, ObjectId(query.platformId), query.providerId, 0, 0], actionName, isValidData);
        },
        operationSummaryReport: function operationSummaryReport(query) {
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            var endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 20;
            var isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getAllProviderReportSummaryForTimeFrame, [startTime, endTime, ObjectId(query.platformId), query.providerId, 0], actionName, isValidData);
        },
        operationDifferentReport: function operationDifferentReport(query) {
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            var endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 20;
            var isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getProviderDifferDaySummaryForTimeFrame, [startTime, endTime, ObjectId(query.platformObjId), query.platformId,  ObjectId(query.providerObjId), query.providerId, 0, 0], actionName, isValidData);
        },
        syncBetRecord: function syncBetRecord(query) {
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            var endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 20;
            var isValidData = Boolean(query && query.platformId && query.providerId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.syncBetRecord, [startTime, endTime, query.platformId, query.providerId, 0, 0], actionName, isValidData);
        },
        getProviderGameReport: function getProviderGameReport(query) {
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            var endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            var isValidData = Boolean(query && query.providerId && query.platformId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getAllProviderGameDaySummaryForTimeFrame,
                [startTime, endTime, ObjectId(query.platformId), ObjectId(query.providerId), query.index, query.limit, query.sortCol], actionName, isValidData);
        },
        getProviderGamePlayerReport: function getProviderGamePlayerReport(query) {
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            var endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            var isValidData = Boolean(query && query.gameId && query.providerId && query.platformId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getAllProviderGamePlayerDaySummaryForTimeFrame, [startTime, endTime, ObjectId(query.platformId), ObjectId(query.providerId), ObjectId(query.gameId), query.index, query.limit], actionName, isValidData);
        },

        winRateReport: function winRateReport(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.winRateReport, [startTime, endTime, query.providerId, query.platformList, query.listAll, query.loginDevice], actionName, isValidData);
        },

        winRateReportFromSummary: function winRateReportFromSummary(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.winRateReportFromSummary, [startTime, endTime, query.providerId, query.platformList, query.listAll, query.loginDevice], actionName, isValidData);
        },

        getWinRateByGameType: function getWinRateByGameType(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getWinRateByGameType, [startTime, endTime, query.providerId, query.platformId, query.providerName, query.loginDevice], actionName, isValidData);
        },

        getWinRateByGameTypeFromSummary: function getWinRateByGameTypeFromSummary(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getWinRateByGameTypeFromSummary, [startTime, endTime, query.providerId, query.platformId, query.providerName, query.loginDevice], actionName, isValidData);
        },

        getWinRateByPlayers: function getWinRateByPlayers(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getWinRateByPlayers, [startTime, endTime, query.providerId, query.platformId, query.cpGameType, query.loginDevice], actionName, isValidData);
        },

        getWinRateByPlayersFromSummary: function getWinRateByPlayersFromSummary(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getWinRateByPlayersFromSummary, [startTime, endTime, query.providerId, query.platformId, query.cpGameType, query.loginDevice], actionName, isValidData);
        },

        /**
         * Create player consumption report by playerId based on providerId and consumed time
         * @param {json} query - query data. It has to contain correct data format
         */

        getPlayerProviderReport: function getPlayerProviderReport(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);

            var time = dbUtil.getYesterdaySGTime();
            var startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            var endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            var providerId = data.providerId ? ObjectId(data.providerId) : '';
            var playerId = data.playerId ? data.playerId : '';
            var playerName = data.playerName ? data.playerName : '';
            var platformId = data.platformId ? ObjectId(data.platformId) : '';

            var limit = data.limit || 10;
            var index = data.index || 0;

            if (isValidData) {
                args = [platformId, playerId, playerName, providerId, new Date(startTime), new Date(endTime), index, limit, data.sortCol]
            }
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getPlayersByProvider, args, actionName, isValidData);
        },

        /**
         * Create player consumption report by gameID based on providerId and consumed time
         * @param {json} query - query data. It has to contain correct data format
         */
        getPlayerProviderByGameReport: function getPlayerProviderByGameReport(data) {

            var args = null;
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            var endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            var providerId = data.providerId ? ObjectId(data.providerId) : data.providerId;

            var limit = data.limit || 20;

            var isValidData = Boolean(data && data.playerId);
            if (isValidData) {
                args = [providerId, ObjectId(data.playerId), startTime, endTime];
            }
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getPlayerConsumptionByGame, args, actionName, isValidData);
        },
        /*
         get player consumption return - proposal type "PlayerConsumptionReturn" for the requested platform
         @param {json} query - query data. It has to contain correct data format of platformId, startTime, endTime
         */
        getPlayerConsumptionReturn: function getPlayerConsumptionReturn(data) {

            var args = null;
            var actionName = arguments.callee.name;
            var time = dbUtil.getYesterdaySGTime();
            var startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            var endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            var isValidData = Boolean(data && data.platformId);
            // var limit = data.limit || 20;

            if (isValidData) {
                args = [ObjectId(data.platformId), constProposalType.PLAYER_CONSUMPTION_RETURN, new Date(startTime), new Date(endTime)];
            }
            socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        },
        /*
         get player consumption return - proposal type "PlayerFirstTopUp" for the requested platform
         @param {json} query - query data. It has to contain correct data format of platformId, startTime, endTime
         */
        // getPlayerFirstTopUpReturn: function getPlayerFirstTopUpReturn(data) {
        //
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     // var limit = data.limit || 20;
        //
        //     if (isValidData) {
        //         args = [ObjectId(data.platformId), constProposalType.FIRST_TOP_UP, new Date(startTime), new Date(endTime)];
        //     }
        //     socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        // },

        getRewardProposalReport: function getRewardProposalReport(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startTime && data.endTime);
            if (isValidData) {
                args = [data, new Date(data.startTime), new Date(data.endTime), data.status, data.playerName, data.dayCountAfterRedeemPromo];
            }
            socketUtil.emitter(self.socket, dbProposal.getRewardProposalReport, args, actionName, isValidData);
        },

        getRewardProposalReportByType: function getRewardProposalReportByType(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && data.type && data.code);
            if (isValidData) {
                args = [ObjectId(data.platformId), constProposalType[data.type], data.code, new Date(data.startTime), new Date(data.endTime), data.index, data.limit, data.sortCol];
            }
            socketUtil.emitter(self.socket, dbProposal.getRewardProposalReportByType, args, actionName, isValidData);
        },

        getGameDetailByProvider: function getGameDetailByProvider(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && data.providerId && data.playerId);
            if (isValidData) {
                args = [ObjectId(data.platformId), new Date(data.startTime), new Date(data.endTime), ObjectId(data.providerId), ObjectId(data.playerId)];
            }
            socketUtil.emitter(self.socket, dbProposal.getGameDetailByProvider, args, actionName, isValidData);
        },

        getRewardProposalByType: function getRewardProposalByType(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && data.type && data.code);
            if (isValidData) {
                args = [data, ObjectId(data.platformId), constProposalType[data.type], data.code, new Date(data.startTime), new Date(data.endTime), data.index, data.limit, data.sortCol];
            }
            socketUtil.emitter(self.socket, dbProposal.getRewardProposalByType, args, actionName, isValidData);
        },

        // getPlayerTopUpReturn: function getPlayerTopUpReturn(data) {
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     // var limit = data.limit || 20;
        //
        //     if (isValidData) {
        //         args = [ObjectId(data.platformId), constProposalType.PLAYER_TOP_UP_RETURN, new Date(startTime), new Date(endTime)];
        //     }
        //     socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        // },

        // getPlayerConsumptionIncentiveReturn: function getPlayerConsumptionIncentiveReturn(data) {
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     // var time = dbUtil.getYesterdaySGTime();
        //     // var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     // var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     // var isValidData = Boolean(data && data.platformId);
        //     // // var limit = data.limit || 20;
        //
        //     if (isValidData) {
        //         args = [ObjectId(data.platformId), constProposalType.PLAYER_CONSUMPTION_INCENTIVE, new Date(startTime), new Date(endTime)];
        //     }
        //     socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        // },


        getRewardAnalysisProposal: function getRewardAnalysisProposal(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.period && data.type && data.proposalNameArr && data.proposalNameArr.length);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getRewardAnalysisProposal, [startTime, endTime, data.period, data.platformList, data.type, data.proposalNameArr], actionName, isValidData);
        },

        getPlayerReport: function getPlayerReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.platformId);
            var platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerReport, [platformId, data.query, data.index, data.limit, data.sortCol, data.isExport], actionName, isValidData);
        },

        getDeviceReportFromSummary: function getDeviceReportFromSummary(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.platformId);
            var platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getDeviceReportFromSummary, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        reCalculateDeviceReportSummary: function reCalculateDeviceReportSummary(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            var platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerTopUpDaySummary.reCalculateDeviceReportSummary, [platformId, data.start, data.end, data.name], actionName, isValidData);
        },

        getPlayerReportFromSummary: function getPlayerReportFromSummary(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.platformId);
            var platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerReportFromSummary, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        reCalculatePlayerReportSummary: function reCalculatePlayerReportSummary(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            var platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerTopUpDaySummary.reCalculatePlayerReportSummary, [platformId, data.start, data.end, data.name], actionName, isValidData);
        },

        reCalculateWinRateReportSummary: function reCalculateWinRateReportSummary(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);

            socketUtil.emitter(self.socket, dbPlayerTopUpDaySummary.reCalculateWinRateReportSummary, [data.platformList, data.start, data.end], actionName, isValidData);
        },

        getPlayerDepositAnalysisReport: function getPlayerDepositAnalysisReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.platformId);
            let platformObjId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDepositAnalysisReport, [platformObjId, data.query, data.index, data.limit, data.sortCol, data.query.dailyTotalDeposit, data.query.numberOfDays], actionName, isValidData);
        },

        getPlayerDepositAnalysisDetails: function getPlayerDepositAnalysisDetails(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.query.playerObjId && data.platformId);
            let platformObjId = ObjectId(data.platformId);
            let playerObjId = ObjectId(data.query.playerObjId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDepositAnalysisDetails, [platformObjId, data.query, playerObjId, data.query.dailyTotalDeposit], actionName, isValidData);
        },

        getPlayerDepositTrackingReport: function getPlayerDepositTrackingReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.platformId && data.loginStartTime && data.loginEndTime);
            let platformObjId = ObjectId(data.platformId);
            var loginStartDate = data.loginStartTime ? new Date(data.loginStartTime) : new Date(0);
            var loginEndDate = data.loginEndTime ? new Date(data.loginEndTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDepositTrackingReport, [platformObjId, data.query, data.index, data.limit, data.sortCol, loginStartDate, loginEndDate], actionName, isValidData);
        },


        getDXTrackingReport: function getDXTrackingReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.platformId && ((!data.query.queryStart && !data.query.queryEnd) || (data.query.queryStart && data.query.queryEnd )));
            let platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getDXTrackingReport, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getDXNewPlayerReport: function getDXNewPlayerReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.platformId && ((!data.query.queryStart && !data.query.queryEnd) || (data.query.queryStart && data.query.queryEnd && !data.query.days)));
            let platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getDXNewPlayerReport, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getFeedbackReport: function getFeedbackReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.platformId);
            let platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerFeedback.getPlayerFeedbackReportAdvance, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        // getFullAttendanceProposalReport: function getFullAttendanceProposalReport(data) {
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     socketUtil.emitter(self.socket, dbProposal.getRewardTypeProposals, [data.platformId, constProposalType.FULL_ATTENDANCE, startTime, endTime, 0], actionName, isValidData);
        // },

        // getTransactionProposalReport: function getTransactionProposalReport(data) {
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     socketUtil.emitter(self.socket, dbProposal.getRewardTypeProposals, [data.platformId, constProposalType.PLATFORM_TRANSACTION_REWARD, startTime, endTime, 0], actionName, isValidData);
        // },

        // getPlatformRewardReport: function getPlatformRewardReport(data) {
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     var platformId;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     if (data && data.platformId && ObjectId(data.platformId)) {
        //         platformId = ObjectId(data.platformId);
        //     }
        //     var rewardType = null;
        //     switch (data.type) {
        //         case 'FULL_ATTENDANCE':
        //             rewardType = constRewardType.FULL_ATTENDANCE;
        //             break;
        //         case 'GAME_PROVIDER_REWARD':
        //             rewardType = constRewardType.GAME_PROVIDER_REWARD;
        //             break;
        //         case 'FIRST_TOP_UP':
        //             rewardType = constRewardType.FIRST_TOP_UP;
        //             break;
        //         case 'PLAYER_TOP_UP_RETURN' :
        //             rewardType = constRewardType.PLAYER_TOP_UP_RETURN;
        //             break;
        //         case 'PLAYER_CONSUMPTION_INCENTIVE':
        //             rewardType = constRewardType.PLAYER_CONSUMPTION_INCENTIVE;
        //             break;
        //     }
        //     var isValidData = Boolean(data && rewardType && data.platformId && ObjectId(data.platformId));
        //     if (isValidData) {
        //         args = [rewardType, platformId, startTime, endTime];
        //     }
        //     socketUtil.emitter(self.socket, dbRewardTask.getPlatformRewardReport, args, actionName, isValidData);
        // },

        getPlatformRewardPageReport: function getPlatformRewardPageReport(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var platformId;
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            if (data && data.platformId && ObjectId(data.platformId)) {
                platformId = ObjectId(data.platformId);
            }
            var rewardType = data.type ? constRewardType[data.type] : null;
            var isValidData = Boolean(data && data.type && data.platformId && ObjectId(data.platformId));
            if (isValidData) {
                args = [rewardType, platformId, startTime, endTime, data.index, data.limit, data.sortCol, data.eventId];
            }
            socketUtil.emitter(self.socket, dbRewardTask.getPlatformRewardPageReport, args, actionName, isValidData);
        },
        /*
         get player consumption return - proposal type "PartnerConsumptionReturn" for the requested platform
         @param {json} query - query data. It has to contain correct data format of platformId, startTime, endTime
         */
        // getPartnerConsumptionReturn: function getPartnerConsumptionReturn(data) {
        //
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     // var limit = data.limit || 20;
        //     if (isValidData) {
        //         args = [ObjectId(data.platformId), constProposalType.PARTNER_CONSUMPTION_RETURN, new Date(startTime), new Date(endTime)];
        //     }
        //     socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        // },

        // getPartnerIncentiveReward: function getPartnerIncentiveReward(data) {
        //
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     // var limit = data.limit || 20;
        //     if (isValidData) {
        //         args = [ObjectId(data.platformId), constProposalType.PARTNER_INCENTIVE_REWARD, new Date(startTime), new Date(endTime)];
        //     }
        //     socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        // },

        // getPartnerReferralReward: function getPartnerReferralReward(data) {
        //
        //     var args = null;
        //     var actionName = arguments.callee.name;
        //     var time = dbUtil.getYesterdaySGTime();
        //     var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : time.startTime;
        //     var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : time.endTime;
        //     var isValidData = Boolean(data && data.platformId);
        //     // var limit = data.limit || 20;
        //     if (isValidData) {
        //         args = [ObjectId(data.platformId), constProposalType.PARTNER_REFERRAL_REWARD, new Date(startTime), new Date(endTime)];
        //     }
        //     socketUtil.emitter(self.socket, dbProposal.getProposalsForReward, args, actionName, isValidData);
        // },
        queryCreditChangeLog: function queryCreditChangeLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let sendQuery = {};
            let platformListQuery;

            // if (data && data.platformId) {
            //     sendQuery.platformId = ObjectId(data.platformId);
            // }

            if(data.platformList && data.platformList.length > 0) {
                platformListQuery = {$in: data.platformList.map(item=>{return ObjectId(item)})};
                sendQuery.platformId = platformListQuery;
            }

            if (data && data.operationTime && data.operationTime.startTime) {
                sendQuery.operationTime = {};
                sendQuery.operationTime.$gte = new Date(data.operationTime.startTime);
            }
            if (data && data.operationTime && data.operationTime.endTime) {
                sendQuery.operationTime = sendQuery.operationTime || {};
                sendQuery.operationTime.$lt = new Date(data.operationTime.endTime);
            }
            socketUtil.emitter(self.socket, dbLogger.queryCreditChangeLog, [sendQuery, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * Get all the player topUp type defined in the system
         */
        getAllTopUpType: function getAllTopUpType(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerTopUpType});
        },

        getNewAccountReportData: function getNewAccountReportData(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            var start = data.startTime ? new Date(data.startTime) : new Date(0);
            var end = data.endTime ? new Date(data.endTime) : new Date();
            var platform = ObjectId(data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getNewAccountReportData, [platform, start, end, data.registrationDevice], actionName, isValidData);
        },

        getAllFeedbackResultList: function getAllFeedbackResultList() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerFeedbackResult});
        },
        getPlayerDomainReport: function getPlayerDomainReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDomainReport, [data.platformList, data.query, data.index, data.limit, data.sortCol, data.isExport], actionName, isValidData);
        },

        getPlayerAlmostLevelupReport: function getPlayerAlmostLevelupReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerAlmostLevelupReport, [data.platformList, data.percentage, data.index, data.limit, data.sortCol, data.newSummary], actionName, isValidData);
        },

        getConsumptionIntervalData: function getConsumptionIntervalData(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getConsumptionIntervalData, [ObjectId(data.platform), data.days], actionName, isValidData);
        },

        getMismatchReport: function getMismatchReport(data) {
            let actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.type && data.startTime && data.endTime && (endTime > startTime));

            if (data.type === 'bonus') {
                socketUtil.emitter(self.socket, dbPaymentReconciliation.getBonusReport, [data.platformList, data.type, startTime, endTime], actionName, isValidData);
            }
            else {
                socketUtil.emitter(self.socket, dbPaymentReconciliation.getOnlinePaymentProposalMismatchReport, [data.platformList, data.type, startTime, endTime], actionName, isValidData);
            }

        },

        getLimitedOfferReport: function getLimitedOfferReport(data) {
            let actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.startTime && data.endTime && (endTime > startTime));

            socketUtil.emitter(self.socket, dbPlayerReward.getLimitedOfferReport, [data.platformList, startTime, endTime, data.playerName, data.promoName, data.status, data.level, data.inputDevice], actionName, isValidData);
        },

        testPMSCashoutAPI: function testPMSCashoutAPI(data) {
            let actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.platformId &&data.startTime && data.endTime && (endTime > startTime));
            socketUtil.emitter(self.socket, dbPaymentReconciliation.testCashoutAPI, [data.platformId, startTime, endTime], actionName, isValidData);
        },

        getPlayerAlipayAccReport: function getPlayerAlipayAccReport(data) {
            let actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.startTime && data.endTime && (endTime > startTime));

            socketUtil.emitter(self.socket, dbReport.getPlayerAlipayAccReport, [data.platformList, startTime, endTime, data.playerName, data.alipayAcc, data.alipayName, data.alipayNickname, data.alipayRemark], actionName, isValidData);
        },

        getFinancialReportByDay: function getFinancialReportByDay(data) {
            var actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.startTime && data.endTime && (endTime > startTime) && data.platform && data.displayMethod);

            socketUtil.emitter(self.socket, dbProposal.getFinancialReportByDay, [data], actionName, isValidData);
        },

        getFinancialReportBySum: function getFinancialReportBySum(data) {
            var actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.startTime && data.endTime && (endTime > startTime) && data.platform && data.displayMethod);

            socketUtil.emitter(self.socket, dbProposal.getFinancialReportBySum, [data], actionName, isValidData);
        },

        getProviderConsumptionReport: function getProviderConsumptionReport(data){
            var actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query);

            socketUtil.emitter(self.socket, dbProposal.getProviderConsumptionReport, [data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getPaymentMonitorReport: function getPaymentMonitorReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let time = dbUtil.getYesterdaySGTime();
            data.startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            data.endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            data.limit = data.limit || 10;
            data.index = data.index || 0;
            socketUtil.emitter(self.socket, dbReport.getPaymentMonitorReport, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getReferralRewardReport: function getReferralRewardReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.platformObjId);
            var platformObjId = ObjectId(data.platformObjId);

            socketUtil.emitter(self.socket, dbReport.getReferralRewardReport, [platformObjId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        gameTypeAnalysisReport: function gameTypeAnalysisReport(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.gameTypeAnalysisReport, [startTime, endTime, query.providerId, query.platformId, query.providerName, query.loginDevice, query.csPromoteWay, query.listAllProviders, query.byProviders], actionName, isValidData);
        },

        getGameTypeAnalysisByGameType: function getGameTypeAnalysisByGameType(query) {
            let actionName = arguments.callee.name;
            let time = dbUtil.getYesterdaySGTime();
            let startTime = query.startTime ? new Date(query.startTime) : time.startTime;
            let endTime = query.endTime ? new Date(query.endTime) : time.endTime;
            query.limit = query.limit || 10;
            query.index = query.index || 0;
            let isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getGameTypeAnalysisByGameType, [startTime, endTime, query.providerId, query.platformId, query.providerName, query.loginDevice], actionName, isValidData);
        },
    };
    socketActionReport.actions = this.actions;
};

module.exports = socketActionReport;
