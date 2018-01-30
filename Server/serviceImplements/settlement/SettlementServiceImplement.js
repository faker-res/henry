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
const dbRewardTask = require('./../../db_modules/dbRewardTask');
const dbRewardEvent = require('./../../db_modules/dbRewardEvent');
const dbPlayerMail = require("./../../db_modules/dbPlayerMail");
const dbPlayerRewardPoints = require('./../../db_modules/dbPlayerRewardPoints');
const dbRewardTaskGroup = require('./../../db_modules/dbRewardTaskGroup');

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

    this.checkPlatformWeeklyConsumptionReturnForPlayers.expectsData = 'platformId, eventData: {}, proposalTypeId, startTime: Date, endTime: Date, playerObjIds: []';
    this.checkPlatformWeeklyConsumptionReturnForPlayers.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.eventData && data.proposalTypeId && data.startTime && data.endTime && data.playerObjIds);
        var args = [ObjectId(data.platformId), data.eventData, ObjectId(data.proposalTypeId), new Date(data.startTime), new Date(data.endTime), mapIdsToMongooseIds(data.playerObjIds)];
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
        var isValidData = Boolean(data && data.platformId && data.checkPeriod && data.playerObjIds);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.checkPlayerLevelDownForPlayers, [data.playerObjIds, data.checkPeriod, data.platformId], isValidData);
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
        var args = [ObjectId(data.platformId), data.startTime, data.endTime, data.query, data.playerObjIds, data.option];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getConsumptionDetailOfPlayers, args, isValidData);
    };

    this.checkPlatformPlayersRewardTask.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerObjIds);
        var args = [mapIdsToMongooseIds(data.playerObjIds)];
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardTask.checkPlatformPlayersRewardTask, args, isValidData);
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
        let args = [data.proposals, data.platformObj, data.useProviderGroup];
        WebSocketUtil.performAction(conn, wsFunc, data, dbAutoProposal.processAutoProposals, args, isValidData);
    };

    this.performPlatformPlayerLevelSettlement.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerObjIds && data.levels);
        let args = [data.playerObjIds, data.platformObjId, data.levels, data.startTime, data.endTime, data.upOrDown, data.platformPeriod];
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
        let args = [data.playerIdArray, data.eventCode, data.applyTargetDate];
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardEvent.bulkPlayerApplyReward, args, isValidData);
    };

    this.batchCreditTransferOut.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.providerId && data.platformObjId && data.adminName);
        data.credit = -1;
        isValidData = data.credit == 0 ? false : isValidData;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.transferPlayerCreditFromProvider, [data.playerId, data.platformObjId, data.providerId, data.credit, data.adminName, null, null, null, data.isBatch], isValidData);
    };

    this.performUnlockPlatformProviderGroup.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.rewardTaskGroup);
        let args = [data.rewardTaskGroup];
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardTaskGroup.performUnlockPlatformProviderGroup, args, isValidData);
    };
};

let proto = SettlementServiceImplement.prototype = Object.create(PlayerService.prototype);
proto.constructor = SettlementServiceImplement;

module.exports = SettlementServiceImplement;