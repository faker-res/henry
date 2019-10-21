var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PlayerService = require("./../../settlementService/SettlementServices").PlayerService;

const dbAutoProposal = require('./../../db_modules/dbAutoProposal');
const dbPlayerConsumptionDaySummary = require('./../../db_modules/dbPlayerConsumptionDaySummary');
const dbPlayerConsumptionWeekSummary = require('./../../db_modules/dbPlayerConsumptionWeekSummary');
const dbPlayerGameTypeConsumptionWeekSummary = require('./../../db_modules/dbPlayerGameTypeConsumptionWeekSummary');
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPlayerLevel = require('./../../db_modules/dbPlayerLevel');
const dbPlayerTopUpDaySummary = require('./../../db_modules/dbPlayerTopUpDaySummary');
const dbPlayerTopUpWeekSummary = require('./../../db_modules/dbPlayerTopUpWeekSummary');
const dbGameProviderPlayerDaySummary = require('./../../db_modules/dbGameProviderPlayerDaySummary');
const dbPartnerWeekSummary = require("../../db_modules/dbPartnerWeekSummary.js");
const dbPlayerConsumptionRecord = require('./../../db_modules/dbPlayerConsumptionRecord');
const dbPlatform = require('./../../db_modules/dbPlatform');
const dbPartner = require('./../../db_modules/dbPartner');
const dbPlayerReward = require('./../../db_modules/dbPlayerReward');
const dbTeleSales = require('./../../db_modules/dbTeleSales');
const dbRewardTask = require('./../../db_modules/dbRewardTask');
const dbRewardEvent = require('./../../db_modules/dbRewardEvent');
const dbPlayerMail = require("./../../db_modules/dbPlayerMail");
const dbPlayerRewardPoints = require('./../../db_modules/dbPlayerRewardPoints');
const dbRewardTaskGroup = require('./../../db_modules/dbRewardTaskGroup');
const dbPlayerTopUpRecord = require('./../../db_modules/dbPlayerTopUpRecord');
const dbPartnerCommission = require('./../../db_modules/dbPartnerCommission');
const dbPropUtil = require('./../../db_common/dbProposalUtility');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var SettlementServiceImplement = function () {
    PlayerService.call(this);

    // mongoose find queries can work with ids as strings
    // but aggregate queries only work if ids are actual ObjectIds
    // so for aggregate queries we should convert any incoming id strings to ObjectIds

    var mapIdsToMongooseIds = ids => ids.map(id => ObjectId(id));

    this.calculatePlayersDaySummaryForTimeFrame.expectsData = 'startTime: Date, endTime: Date, playerObjIds: [], platformObjId: ObjectId';
    this.calculatePlayersDaySummaryForTimeFrame.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.playerObjIds && data.platformObjId);
        var args = [new Date(data.startTime), new Date(data.endTime), mapIdsToMongooseIds(data.playerObjIds), ObjectId(data.platformObjId)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionDaySummary.calculatePlayersDaySummaryForTimeFrame, args, isValidData);
    };

    this.checkPlatformWeeklyConsumptionReturnForPlayers.expectsData = 'platformId, eventData: {}, proposalTypeId, startTime: Date, endTime: Date, playerObjIds: [], adminName, adminID';
    this.checkPlatformWeeklyConsumptionReturnForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.proposalTypeId && data.startTime && data.endTime && data.playerObjIds);
        var args = [ObjectId(data.platformId), data.eventData, ObjectId(data.proposalTypeId), new Date(data.startTime), new Date(data.endTime), mapIdsToMongooseIds(data.playerObjIds), data.adminName, data.adminID];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.checkPlatformWeeklyConsumptionReturnForPlayers, args, isValidData);
    };

    this.gameTypeConsumption_calculatePlatformWeekSummaryForPlayers.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.gameTypeConsumption_calculatePlatformWeekSummaryForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerGameTypeConsumptionWeekSummary.gameTypeConsumption_calculatePlatformWeekSummaryForPlayers, args, isValidData);
    };

    this.playerConsumption_calculatePlatformWeekSummaryForPlayers.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.playerConsumption_calculatePlatformWeekSummaryForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.playerConsumption_calculatePlatformWeekSummaryForPlayers, args, isValidData);
    };

    this.playerTopUpDaySummary_calculatePlatformDaySummaryForPlayers.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.playerTopUpDaySummary_calculatePlatformDaySummaryForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpDaySummary.playerTopUpDaySummary_calculatePlatformDaySummaryForPlayers, args, isValidData);
    };

    this.playerReportDaySummary_calculatePlatformDaySummaryForPlayers.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.playerReportDaySummary_calculatePlatformDaySummaryForPlayers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        let args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpDaySummary.playerReportDaySummary_calculatePlatformDaySummaryForPlayers, args, isValidData);
    };

    this.winRateReportDaySummary_calculateWinRateReportDaySummaryForPlayers.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.winRateReportDaySummary_calculateWinRateReportDaySummaryForPlayers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        let args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionDaySummary.winRateReportDaySummary_calculateWinRateReportDaySummaryForPlayers, args, isValidData);
    };

    this.calculateDaySummary.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.calculateDaySummary.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        let args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpDaySummary.calculateDaySummary, args, isValidData);
    };

    this.playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer.onRequest = function (wsFunc, conn, data){
        var isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpDaySummary.playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer, args, isValidData);
    };

    this.playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers.expectsData = 'platformId, startTime: Date, endTime: Date, playerObjIds: []';
    this.playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpWeekSummary.playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers, args, isValidData);
    };

    this.checkPlatformFullAttendanceForPlayers.expectsData = 'eventData: {}, proposalTypeId, platformId, playerObjIds: []';
    this.checkPlatformFullAttendanceForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.eventData && data.proposalTypeId && data.platformId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), data.eventData, ObjectId(data.proposalTypeId), ObjectId(data.platformId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpDaySummary.checkPlatformFullAttendanceForPlayers, args, isValidData);
    };

    this.calculateProviderPlayersDaySummaryForTimeFrame.expectsData = 'providerId, startTime: Date, endTime: Date, playerObjIds: []';
    this.calculateProviderPlayersDaySummaryForTimeFrame.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.providerId && data.playerObjIds);
        var args = [new Date(data.startTime), new Date(data.endTime), ObjectId(data.providerId), mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForPlayers, args, isValidData);
    };

    this.calculatePartnerWeekSummaryForPartners.expectsData = 'platformId, partnerIds: [], startTime: Date, endTime: Date';
    this.calculatePartnerWeekSummaryForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.calculatePartnerWeekSummaryForPartners, args, isValidData);
    };

    this.calculatePartnerChildWeekSummaryForPartners.expectsData = 'platformId, partnerIds: [], startTime: Date, endTime: Date';
    this.calculatePartnerChildWeekSummaryForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.calculatePartnerChildWeekSummaryForPartners, args, isValidData);
    };

    this.performPartnerLevelMigrationForPartners.expectsData = 'platformId, partnerIds: [], startTime: Date, endTime: Date';
    this.performPartnerLevelMigrationForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.performPartnerLevelMigrationForPartners, args, isValidData);
    };

    this.checkPlatformWeeklyConsumptionReturnForPartners.expectsData = 'platformId, eventData: {}, proposalTypeId, partnerIds: [], startTime: Date, endTime: Date';
    this.checkPlatformWeeklyConsumptionReturnForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.proposalTypeId && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), data.eventData, data.proposalTypeId, mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.checkPlatformWeeklyConsumptionReturnForPartners, args, isValidData);
    };

    this.checkPartnerWeeklyReferralRewardForPartners.expectsData = 'platformId, eventData: {}, partnerIds: [], startTime: Date, endTime: Date';
    this.checkPartnerWeeklyReferralRewardForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), data.eventData, mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.checkPartnerWeeklyReferralRewardForPartners, args, isValidData);
    };

    this.checkPartnerWeeklyIncentiveRewardForPartners.expectsData = 'platformId, eventData: {}, partnerIds: [], startTime: Date, endTime: Date';
    this.checkPartnerWeeklyIncentiveRewardForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), data.eventData, mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.checkPartnerWeeklyIncentiveRewardForPartners, args, isValidData);
    };

    this.createExternalPlayerConsumptionList.expectsData = 'consumptionList: []+';
    this.createExternalPlayerConsumptionList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.consumptionList && data.consumptionList.length > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.createExternalPlayerConsumptionList, [data.consumptionList], isValidData);
    };

    this.updateExternalPlayerConsumptionList.expectsData = 'consumptionList: []+';
    this.updateExternalPlayerConsumptionList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.consumptionList && data.consumptionList.length > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.updateExternalPlayerConsumptionList, [data.consumptionList], isValidData);
    };

    this.calculatePlatformConsumptionIncentiveForPlayers.expectsData = 'platformId, eventData: {}, proposalTypeId, playerObjIds: [], startTime: Date, endTime: Date';
    this.calculatePlatformConsumptionIncentiveForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.proposalTypeId && data.playerObjIds && data.startTime && data.endTime);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.calculatePlayersConsumptionIncentive, [data.playerObjIds, data.eventData, data.proposalTypeId, data.startTime, data.endTime], isValidData);
    };

    this.checkPlayerLevelDownForPlayers.expectsData = 'platformId, checkPeriod: String, playerObjIds: []';
    this.checkPlayerLevelDownForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.checkPeriod && data.playerObjIds && data.playerLevelsObj && data.playerLevelsObj.length);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.checkPlayerLevelDownForPlayers, [data.playerObjIds, data.checkPeriod, data.platformId, data.playerLevelsObj], isValidData);
    };

    this.checkPlatformWeeklyTopUpReturnForPartners.expectsData = 'platformId, eventData: {}, proposalTypeId, partnerIds: [], startTime: Date, endTime: Date';
    this.checkPlatformWeeklyTopUpReturnForPartners.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.proposalTypeId && data.partnerIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformId), data.eventData, data.proposalTypeId, mapIdsToMongooseIds(data.partnerIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerWeekSummary.checkPlatformWeeklyTopUpReturnForPartners, args, isValidData);
    };

    this.getPlatformWeeklyConsumptionReturnInfoForPlayers.expectsData = 'platformId, eventData: {}, playerObjIds: []';
    this.getPlatformWeeklyConsumptionReturnInfoForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.playerObjIds);
        var args = [ObjectId(data.platformId), data.eventData, mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.getPlayersConsumptionReturnInfo, args, isValidData);
    };

    this.calculatePartnersCommission.expectsData = 'platformObjId: ObjectId, configData: {}, partnerObjIds: [], startTime: Date, endTime: Date';
    this.calculatePartnersCommission.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformObjId && data.configData && data.partnerObjIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformObjId), data.configData, mapIdsToMongooseIds(data.partnerObjIds), new Date(data.startTime), new Date(data.endTime), data.settlementTimeToSave];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.calculatePartnersCommission, args, isValidData);
    };

    this.calculatePartnersChildrenCommission.expectsData = 'platformObjId: ObjectId, childrenCommissionRate: Number|String, partnerObjIds: [], startTime: Date, endTime: Date';
    this.calculatePartnersChildrenCommission.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformObjId && data.childrenCommissionRate && data.partnerObjIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformObjId), data.childrenCommissionRate, mapIdsToMongooseIds(data.partnerObjIds), new Date(data.startTime), new Date(data.endTime), data.settlementTimeToSave];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.calculatePartnersChildrenCommission, args, isValidData);
    };

    this.getConsumptionDetailOfPlayers.expectsData = 'platformObjId: ObjectId, playerObjIds: [], startTime: Date, endTime: Date, query: {}';
    this.getConsumptionDetailOfPlayers.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && data.playerObjIds);
        var args = [ObjectId(data.platformId), data.startTime, data.endTime, data.query, data.playerObjIds, data.option, data.isPromoteWay, data.customStartTime, data.customEndTime];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getConsumptionDetailOfPlayers, args, isValidData);
    };

    this.getConsumptionDetailOfPlayerByLoginDevice.expectsData = 'platformObjId: ObjectId, playerObjIds: [], startTime: Date, endTime: Date, query: {}';
    this.getConsumptionDetailOfPlayerByLoginDevice.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.startTime && data.endTime && data.playerObjIds);
        var args = [ObjectId(data.platformId), data.startTime, data.endTime, data.query, data.playerObjIds, data.option, data.isPromoteWay, data.customStartTime, data.customEndTime];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getConsumptionDetailOfPlayerByLoginDevice, args, isValidData);
    };

    this.getPartnerPlayersCommissionInfo.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformObjId && data.configData && data.playerObjIds && data.startTime && data.endTime);
        var args = [ObjectId(data.platformObjId), data.configData, mapIdsToMongooseIds(data.playerObjIds), new Date(data.startTime), new Date(data.endTime)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerPlayersCommissionInfo, args, isValidData);
    };

    this.savePlayerCredit.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerObjId);
        let args = [data.playerObjId, data.bManual];
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardEvent.savePlayerCredit, args, isValidData);
    };

    this.markDuplicatedConsumptionRecords.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.dupsSummariesData);
        let args = [data.dupsSummariesData];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.markDuplicatedConsumptionRecords, args, isValidData);
    };

    this.processAutoProposals.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.proposals && data.platformObj);
        let args = [data.proposals, data.platformObj];
        WebSocketUtil.performAction(conn, wsFunc, data, dbAutoProposal.processAutoProposals, args, isValidData);
    };

    this.processPartnerAutoProposals.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.proposals && data.platformObj);
        let args = [data.proposals, data.platformObj];
        WebSocketUtil.performAction(conn, wsFunc, data, dbAutoProposal.processPartnerAutoProposals, args, isValidData);
    };


    this.performPlatformPlayerLevelSettlement.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerObjIds && data.levels);
        let args = [data.playerObjIds, data.platformObjId, data.levels, data.startTime, data.endTime, data.upOrDown, data.platformPeriod, data.disableAutoPlayerLevelUpReward, data.adminId, data.adminName, data.isPlayer];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerLevel.performPlatformPlayerLevelSettlement, args, isValidData);
    };
    this.sendPlayerMailFromAdminToPlayer.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.adminId && data.adminName && data.playerIds && data.title && data.content);
        let args = [data.platformId, data.adminId, data.adminName, data.playerIds, data.title, data.content];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendPlayerMailFromAdminToPlayer, args, isValidData);
    };

    this.calculatePlatformConsecutiveConsumptionForPlayers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.recSummary && data.eventData);
        let args = [data.recSummary, data.eventData];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.calculatePlatformConsecutiveConsumptionForPlayers, args, isValidData);
    };

    this.autoConvertPlayerRewardPoints.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerObjIds);
        let args = [data.playerObjIds];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerRewardPoints.autoConvertPlayerRewardPoints, args, isValidData);
    };

    this.bulkPlayerApplyReward.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerIdArray && data.eventCode && data.applyTargetDate);
        let args = [data.playerIdArray, data.eventCode, data.applyTargetDate, data.adminID, data.adminName];
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardEvent.bulkPlayerApplyReward, args, isValidData);
    };

    this.batchCreditTransferOut.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.providerId && data.platformObjId && data.adminName);
        data.credit = -1;
        isValidData = data.credit == 0 ? false : isValidData;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.transferPlayerCreditFromProviderSettlement, [data.playerId, data.platformObjId, data.providerId, data.credit, data.adminName], isValidData);
    };

    this.performUnlockPlatformProviderGroup.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.rewardTaskGroup);
        let args = [data.rewardTaskGroup];
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardTaskGroup.performUnlockPlatformProviderGroup, args, isValidData);
    };

    this.getConsumptionActivePlayerAfterTopupQueryMatch.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.platformId && data.dayStartTime && data.dayEndTime && data.consumptionCollectionName);
        let args = [data.platformId, data.dayStartTime, data.dayEndTime, data.activePlayerConsumptionTimes, data.activePlayerConsumptionAmount, data.activePlayerValue, data.partnerLevelConfig,  data.consumptionCollectionName, data.isFilterValidPlayer, data.playerObjs, data.isRealPlayer, data.isTestPlayer, data.hasPartner];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getConsumptionActivePlayerAfterTopupQueryMatch, args, isValidData);
    };

    this.settlePartnersComm.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.partnerObjIdArr && data.commissionType && data.startTime && data.endTime);
        let args = [data.partnerObjIdArr, data.commissionType, data.startTime, data.endTime, data.isSkip];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerCommission.settlePartnersCommission, args, isValidData);
    };

    this.settlePartnersCommission.onRequest = (wsFunc, conn, data) => {
        // deprecated, use settlePartnersComm instead
        let isValidData = Boolean(data && data.partnerObjIdArr && data.commissionType && data.startTime && data.endTime);
        let args = [data.partnerObjIdArr, data.commissionType, data.startTime, data.endTime, data.isSkip];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.settlePartnersCommission, args, isValidData);
    };

    this.settlePartnersBillBoard.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.playerObjIds && data.type && data.startTime && data.endTime);
        let args = [data.playerObjIds, data.type, data.startTime, data.endTime];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.settlePartnersBillBoard, args, isValidData);
    };

    this.settlePartnersActivePlayer.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.players && data.platformId && data.startTime && data.endTime && data.periodCheck);
        let args = [data.players, data.platformId, data.startTime, data.endTime, data.periodCheck];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.settlePartnersActivePlayer, args, isValidData);
    };

    this.getCurrentPartnersCommission.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.partnerObjIdArr && data.commissionType);
        let args = [data.partnerObjIdArr, data.commissionType, data.startTime, data.endTime];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.generateCurrentPartnersCommissionDetail, args, isValidData);
    };

    this.getAllPlayerCommissionRawDetails.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.playerObjIds && data.commissionType && data.startTime && data.endTime && data.providerGroups && data.topUpTypes && data.rewardTypes && data.activePlayerRequirement);
        let args = [data.playerObjIds, data.commissionType, data.startTime, data.endTime, data.providerGroups, data.topUpTypes, data.rewardTypes, data.activePlayerRequirement];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.handleGetAllPlayerCommissionRawDetails, args, isValidData);
    };

    this.findPartnersForCommissionReport.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.platform && data.partners && data.startTime && data.endTime);
        let args = [data.platform, data.partners, data.startTime, data.endTime];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.findPartnersForCommissionReport, args, isValidData);
    };

    this.tsPhoneCheckIsExistsAllPlatform.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.platformObjIds && data.platformObjIds.length && data.tsPhonesTrade && data.tsPhonesTrade.length);
        let args = [data.platformObjIds, data.tsPhonesTrade];
        WebSocketUtil.performAction(conn, wsFunc, data, dbTeleSales.tsPhoneCheckIsExistsAllPlatform, args, isValidData);
    };

    this.generatePromoCodes.onRequest = (wsFunc, conn, data) => {
        let isValidData = true;
        let args = [data];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.generatePromoCodes, args, isValidData);
    };

    this.topupRecordInsertRepeatCount.onRequest = (wsFunc, conn, data) => {
        let isValidData = true;
        let args = [data.proposals, data.platformId, data.query];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.topupRecordInsertRepeatCount, args, isValidData);
    };

    this.generateCurrentPartnersCommissionDetail.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.partnerObjIdArr);
        let args = [data.partnerObjIdArr, data.startTime, data.endTime, data.commissionType];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartnerCommission.generateCurrentPartnersCommissionDetail, args, isValidData);
    };

    this.calculateProposalsTotalAmount.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data && data.proposalArr);
        let args = [data.proposalArr];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPropUtil.calculateProposalsTotalAmount, args, isValidData);
    };

    this.getDXTrackingData.onRequest = (wsFunc, conn, data) => {
        let isValidData = true;
        let args = [data.playerInfo, data.playerIds, data.query, data.bonusProposalType];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getDXTrackingData, args, isValidData);
    };
};

let proto = SettlementServiceImplement.prototype = Object.create(PlayerService.prototype);
proto.constructor = SettlementServiceImplement;

module.exports = SettlementServiceImplement;
