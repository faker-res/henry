var socketUtil = require('./../modules/socketutility');
var dbProposal = require('./../db_modules/dbProposal');
var utility = require('./../modules/encrypt');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
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

const dbPlayerReward = require('./../db_modules/dbPlayerReward');

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

            socketUtil.emitter(self.socket, dbProposal.getProposalsByAdvancedQuery, [query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * Create topup record report
         * @param {json} query - query data. It has to contain correct data format
         */
        topupReport: function topupReport(query) {
            var actionName = arguments.callee.name;
            query.limit = query.limit || 10;
            var isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.topupReport, [query, query.index, query.limit, query.sortCol], actionName, isValidData);
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
            let isValidData = Boolean(query && query.platformId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.winRateReport, [startTime, endTime, query.providerId, query.platformId], actionName, isValidData);
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

        getRewardProposalReportByType: function getRewardProposalReportByType(data) {
            var args = null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && data.type && data.code);
            if (isValidData) {
                args = [ObjectId(data.platformId), constProposalType[data.type], data.code, new Date(data.startTime), new Date(data.endTime), data.index, data.limit, data.sortCol];
            }
            socketUtil.emitter(self.socket, dbProposal.getRewardProposalReportByType, args, actionName, isValidData);
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

        getPlayerReport: function getPlayerReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.platformId);
            var platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerReport, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getDXNewPlayerReport: function getDXNewPlayerReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.platformId && data.query.days);
            let platformId = ObjectId(data.platformId);

            socketUtil.emitter(self.socket, dbPlayerInfo.getDXNewPlayerReport, [platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
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
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);

            var sendQuery = {};
            if (data && data.platformId) {
                sendQuery.platformId = ObjectId(data.platformId);
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
            socketUtil.emitter(self.socket, dbPlayerInfo.getNewAccountReportData, [platform, start, end], actionName, isValidData);
        },

        getAllFeedbackResultList: function getAllFeedbackResultList() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerFeedbackResult});
        },
        getPlayerDomainReport: function getPlayerDomainReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDomainReport, [data.platform, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getPlayerAlmostLevelupReport: function getPlayerAlmostLevelupReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerAlmostLevelupReport, [data.platform, data.percentage, data.index, data.limit, data.sortCol, data.newSummary], actionName, isValidData);
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
            let isValidData = Boolean(data && data.platform && data.platformId && data.type && data.startTime && data.endTime && (endTime > startTime));

            if (data.type === 'bonus') {
                socketUtil.emitter(self.socket, dbPaymentReconciliation.getBonusReport, [ObjectId(data.platform), data.platformId, data.type, startTime, endTime], actionName, isValidData);
            }
            else {
                socketUtil.emitter(self.socket, dbPaymentReconciliation.getOnlinePaymentProposalMismatchReport, [ObjectId(data.platform), data.platformId, data.type, startTime, endTime], actionName, isValidData);
            }

        },

        getLimitedOfferReport: function getLimitedOfferReport(data) {
            let actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.platformObjId && data.startTime && data.endTime && (endTime > startTime));

            socketUtil.emitter(self.socket, dbPlayerReward.getLimitedOfferReport, [ObjectId(data.platformObjId), startTime, endTime, data.playerName, data.promoName], actionName, isValidData);
        },

        testPMSCashoutAPI: function testPMSCashoutAPI(data) {
            let actionName = arguments.callee.name;
            let startTime = new Date(data.startTime);
            let endTime = new Date(data.endTime);
            let isValidData = Boolean(data && data.platformId &&data.startTime && data.endTime && (endTime > startTime));
            socketUtil.emitter(self.socket, dbPaymentReconciliation.testCashoutAPI, [data.platformId, startTime, endTime], actionName, isValidData);
        }
    };
    socketActionReport.actions = this.actions;
};

module.exports = socketActionReport;