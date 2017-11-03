'use strict';

var dbPropertiesFunc = function () {
};
module.exports = new dbPropertiesFunc();

var mongoose = require('mongoose');

// Tell mongoose which promise library it should use.
mongoose.Promise = Promise;
//mongoose.Promise = require('q').Promise;

var dbConnections = require('./dbConnections');

var db_admin = dbConnections.admindb;
var db_player = dbConnections.playerdb;
var dbLogs = dbConnections.logsdb;

/////////////////////////Schemas/////////////////////////////////////

// We are actually using dbConnections.counterModel instead
//var counterSchema = require('./../schema/counter');

var adminInfoSchema = require('./../schema/admin');
var departmentSchema = require('./../schema/department');
var platformSchema = require('./../schema/platform');
var platformGameStatusSchema = require('./../schema/platformGameStatus');
var playerSchema = require('./../schema/player');

var playerLevelSchema = require('./../schema/playerLevel');
var playerTrustLevelSchema = require('./../schema/playerTrustLevel');
var playerBadRecordSchema = require('./../schema/playerBadRecord');
var playerLoginRecordSchema = require('./../schema/playerLoginRecord');
var playerLevelConsumptionLimitSchema = require('./../schema/playerLevelConsumptionLimit');
var playerFeedbackSchema = require('./../schema/playerFeedback');

var proposalSchema = require('./../schema/proposal');
var proposalProcessSchema = require('./../schema/proposalProcess');
var proposalProcessStepSchema = require('./../schema/proposalProcessStep');

var proposalTypeSchema = require('./../schema/proposalType');
var proposalTypeProcessSchema = require('./../schema/proposalTypeProcess');
var proposalTypeProcessStepSchema = require('./../schema/proposalTypeProcessStep');

var rewardEventSchema = require('./../schema/rewardEvent');
var rewardRuleSchema = require('./../schema/rewardRule');
var rewardParamSchema = require('./../schema/rewardParam');
var rewardTypeSchema = require('./../schema/rewardType');
var rewardConditionSchema = require('./../schema/rewardCondition');
var rewardTaskSchema = require('./../schema/rewardTask');

var roleSchema = require('./../schema/role');
var apiUserSchema = require('./../schema/apiUser');

var gameTypeSchema = require('./../schema/gameType');
var gameSchema = require('./../schema/game');
var gameProviderSchema = require('./../schema/gameProvider');

var partnerSchema = require('./../schema/partner');
var partnerLevelSchema = require('./../schema/partnerLevel');
var partnerLevelConfigSchema = require('./../schema/partnerLevelConfig');

var paymentChannelSchema = require('./../schema/paymentChannel');

var messageTemplateSchema = require('./../schema/messageTemplate');
var platformAnnouncementSchema = require('./../schema/platformAnnouncement');

var playerMailSchema = require('./../schema/playerMail');

let playerFeedbackResultSchema = require('./../schema/playerFeedbackResult');
let playerFeedbackTopicSchema = require('./../schema/playerFeedbackTopic');

/////////////////////////Schema models/////////////////////////////////////
//----------------------------------------admin db properties-----------------------------------------------------------
//var counterModel = db_admin.model('counter', counterSchema, 'counter');

var adminInfoModel = db_admin.model('adminInfo', adminInfoSchema, 'adminInfo');
var departmentModel = db_admin.model('department', departmentSchema, 'department');
var roleModel = db_admin.model('role', roleSchema, 'role');

var proposalTypeModel = db_admin.model('proposalType', proposalTypeSchema, 'proposalType');
var proposalTypeProcessModel = db_admin.model('proposalTypeProcess', proposalTypeProcessSchema, 'proposalTypeProcess');
var proposalTypeProcessStepModel = db_admin.model('proposalTypeProcessStep', proposalTypeProcessStepSchema, 'proposalTypeProcessStep');

var rewardEventModel = db_admin.model('rewardEvent', rewardEventSchema, 'rewardEvent');
var rewardTypeModel = db_admin.model('rewardType', rewardTypeSchema, 'rewardType');
var rewardRuleModel = db_admin.model('rewardRule', rewardRuleSchema, 'rewardRule');
var rewardParamModel = db_admin.model('rewardParam', rewardParamSchema, 'rewardParam');
var rewardConditionModel = db_admin.model('rewardCondition', rewardConditionSchema, 'rewardCondition');

var apiUserModel = db_admin.model('apiUser', apiUserSchema, 'apiUser');
var platformModel = db_admin.model('platform', platformSchema, 'platform');
var platformGameStatusModel = db_admin.model('platformGameStatus', platformGameStatusSchema, 'platformGameStatus');

var gameTypeModel = db_admin.model('gametype', gameTypeSchema, 'gameType');
var gameModel = db_admin.model('game', gameSchema, 'game');
var gameProviderModel = db_admin.model('gameProvider', gameProviderSchema, 'gameProvider');

var paymentChannelModel = db_admin.model('paymentChannel', paymentChannelSchema, 'paymentChannel');

var messageTemplateModel = db_admin.model('messageTemplate', messageTemplateSchema, 'messageTemplate');
var platformAnnouncementModel = db_admin.model('platformAnnouncement', platformAnnouncementSchema, 'platformAnnouncement');

var playerLevelConsumptionLimitModel = db_admin.model("playerLevelConsumptionLimit", playerLevelConsumptionLimitSchema, 'playerLevelConsumptionLimit');

var playerLevelModel = db_admin.model('playerLevel', playerLevelSchema, 'playerLevel');
var playerTrustLevelModel = db_admin.model('playerTrustLevel', playerTrustLevelSchema, 'playerTrustLevel');
var partnerLevelModel = db_admin.model('partnerLevel', partnerLevelSchema, 'partnerLevel');
var partnerLevelConfigModel = db_admin.model('partnerLevelConfig', partnerLevelConfigSchema, 'partnerLevelConfig');

var playerBadRecordModel = db_admin.model('playerBadRecord', playerBadRecordSchema, 'playerBadRecord');

var platformDaySummarySchema = require('./../schema/platformDaySummary');
var platformDaySummaryModel = db_admin.model('platformDaySummary', platformDaySummarySchema, 'platformDaySummary');

var platformGameGroupSchema = require('./../schema/platformGameGroup');
var platformGameGroupModel = db_admin.model('platformGameGroup', platformGameGroupSchema, 'platformGameGroup');

var platformBankCardGroupSchema = require('./../schema/platformBankCardGroup');
var platformBankCardGroupModel = db_admin.model('platformBankCardGroup', platformBankCardGroupSchema, 'platformBankCardGroup');

var platformMerchantGroupSchema = require('./../schema/platformMerchantGroup');
var platformMerchantGroupModel = db_admin.model('platformMerchantGroup', platformMerchantGroupSchema, 'platformMerchantGroup');

var platformAlipayGroupSchema = require('./../schema/platformAlipayGroup');
var platformAlipayGroupModel = db_admin.model('platformAlipayGroup', platformAlipayGroupSchema, 'platformAlipayGroup');

var platformWechatPayGroupSchema = require('./../schema/platformWechatPayGroup');
var platformWechatPayGroupModel = db_admin.model('platformWechatPayGroup', platformWechatPayGroupSchema, 'platformWechatPayGroup');

var partnerCommissionConfigSchema = require('./../schema/partnerCommissionConfig');
var partnerCommissionConfigModel = db_admin.model('partnerCommissionConfig', partnerCommissionConfigSchema, 'partnerCommissionConfig');

let gameProviderGroupSchema = require('./../schema/gameProviderGroup');
let gameProviderGroupModel = db_admin.model('gameProviderGroup', gameProviderGroupSchema, 'gameProviderGroup');

let geoIpSchema = require('./../schema/geoip');
let geoIpModel = db_admin.model('geoIp', geoIpSchema, 'geoIp');

let platformQuickPayGroupSchema = require('./../schema/platformQuickPayGroup');
let platformQuickPayGroupModel = db_admin.model('platformQuickPayGroup', platformQuickPayGroupSchema, 'platformQuickPayGroup');

let playerCredibilityRemarkSchema = require('../schema/playerCredibilityRemark');
let playerCredibilityRemarkModel = db_admin.model('playerCredibilityRemark', playerCredibilityRemarkSchema, 'playerCredibilityRemark');

let csOfficerSchema = require('../schema/csOfficer');
let csOfficerModel = db_admin.model('csOfficer', csOfficerSchema, 'csOfficer');

let csOfficerUrlSchema = require('../schema/csOfficerUrl');
let csOfficerUrlModel = db_admin.model('csOfficerUrl', csOfficerUrlSchema, 'csOfficerUrl');

let csPromoteWaySchema = require('../schema/csPromoteWay');
let csPromoteWayModel = db_admin.model('csPromoteWay', csPromoteWaySchema, 'csPromoteWay');

let promoCodeTypeSchema = require('./../schema/promoCodeType');
let promoCodeTypeModel = db_admin.model('promoCodeType', promoCodeTypeSchema, 'promoCodeType');
let promoCodeUserGroupSchema = require('./../schema/promoCodeUserGroup');
let promoCodeUserGroupModel = db_admin.model('promoCodeUserGroup', promoCodeUserGroupSchema, 'promoCodeUserGroup');

let playerFeedbackResultModel = db_admin.model('playerFeedbackResult', playerFeedbackResultSchema, 'playerFeedbackResult');
let playerFeedbackTopicModel = db_admin.model('playerFeedbackTopic', playerFeedbackTopicSchema, 'playerFeedbackTopic');

//----------------------------------------player db properties-----------------------------------------------------------
var playerModel = db_player.model('playerInfo', playerSchema, 'playerInfo');
var playerFeedbackModel = db_player.model('playerFeedback', playerFeedbackSchema, 'playerFeedback');
var partnerModel = db_player.model('partner', partnerSchema, 'partner');

var rewardTaskModel = db_player.model('rewardTask', rewardTaskSchema, 'rewardTask');

//----------------------------------------logs db properties-----------------------------------------------------------
var playerMailModel = dbLogs.model('playerMail', playerMailSchema, 'playerMail');

var proposalModel = dbLogs.model('proposal', proposalSchema, 'proposal');
var proposalProcessModel = dbLogs.model('proposalProcess', proposalProcessSchema, 'proposalProcess');
var proposalProcessStepModel = dbLogs.model('proposalProcessStep', proposalProcessStepSchema, 'proposalProcessStep');

var systemLogSchema = require('./../schema/logs/systemLog');
var systemLogModel = dbLogs.model('systemLog', systemLogSchema, 'systemLog');

var creditChangeLogSchema = require('./../schema/logs/creditChangeLog');
var creditChangeLogModel = dbLogs.model('creditChangeLog', creditChangeLogSchema, 'creditChangeLog');

var partnerCreditChangeLogSchema = require('./../schema/logs/partnerCreditChangeLog');
var partnerCreditChangeLogModel = dbLogs.model('partnerCreditChangeLog', partnerCreditChangeLogSchema, 'partnerCreditChangeLog');

var rewardLogSchema = require('./../schema/logs/rewardLog');
var rewardLogModel = dbLogs.model('rewardLog', rewardLogSchema, 'rewardLog');

var settlementLogSchema = require('./../schema/logs/settlementLog');
var settlementLogModal = dbLogs.model('settlementLog', settlementLogSchema, 'settlementLog');

var bankInfoLogSchema = require('./../schema/logs/bankInfoLog');
var bankInfoLogModal = dbLogs.model('bankInfoLog', bankInfoLogSchema, 'bankInfoLog');

var playerTopUpRecordSchema = require('./../schema/playerTopupRecord');
var playerTopUpRecordModel = dbLogs.model('playerTopUpRecord', playerTopUpRecordSchema, 'playerTopUpRecord');
var playerLoginRecordModel = dbLogs.model('playerLoginRecord', playerLoginRecordSchema, 'playerLoginRecord');

var playerTopUpIntentRecordSchema = require('./../schema/playerTopUpIntentRecord');
var playerTopUpIntentRecordModel = dbLogs.model('playerTopUpIntentRecord', playerTopUpIntentRecordSchema, 'playerTopUpIntentRecord');

var playerRegistrationIntentRecordSchema = require('./../schema/playerRegistrationIntentRecord');
var playerRegistrationIntentRecordModel = dbLogs.model('playerRegistrationIntentRecord', playerRegistrationIntentRecordSchema, 'playerRegistrationIntentRecord');

var playerTopUpDaySummarySchema = require('./../schema/playerTopUpDaySummary');
var playerTopUpDaySummaryModel = dbLogs.model('playerTopUpDaySummary', playerTopUpDaySummarySchema, 'playerTopUpDaySummary');

var playerTopUpWeekSummarySchema = require('./../schema/playerTopUpWeekSummary');
var playerTopUpWeekSummaryModel = dbLogs.model('playerTopUpWeekSummary', playerTopUpWeekSummarySchema, 'playerTopUpWeekSummary');

var playerConsumptionRecordSchema = require('./../schema/playerConsumptionRecord');
var playerConsumptionRecordModel = dbLogs.model('playerConsumptionRecord', playerConsumptionRecordSchema, 'playerConsumptionRecord');

var playerConsumptionSummarySchema = require('./../schema/playerConsumptionSummary');
var playerConsumptionSummaryModel = dbLogs.model('playerConsumptionSummary', playerConsumptionSummarySchema, 'playerConsumptionSummary');

var playerConsumptionDaySummarySchema = require('./../schema/playerConsumptionDaySummary');
var playerConsumptionDaySummaryModel = dbLogs.model('playerConsumptionDaySummary', playerConsumptionDaySummarySchema, 'playerConsumptionDaySummary');

var playerGameTypeConsumptionDaySummarySchema = require('./../schema/playerGameTypeConsumptionDaySummary');
var playerGameTypeConsumptionDaySummaryModel = dbLogs.model('playerGameTypeConsumptionDaySummary', playerGameTypeConsumptionDaySummarySchema, 'playerGameTypeConsumptionDaySummary');

var playerGameTypeConsumptionWeekSummarySchema = require('./../schema/playerGameTypeConsumptionWeekSummary');
var playerGameTypeConsumptionWeekSummaryModel = dbLogs.model('playerGameTypeConsumptionWeekSummary', playerGameTypeConsumptionWeekSummarySchema, 'playerGameTypeConsumptionWeekSummary');

var playerConsumptionWeekSummarySchema = require('./../schema/playerConsumptionWeekSummary');
var playerConsumptionWeekSummaryModel = dbLogs.model('playerConsumptionWeekSummary', playerConsumptionWeekSummarySchema, 'playerConsumptionWeekSummary');

var partnerWeekSummarySchema = require('./../schema/partnerWeekSummary');
var partnerWeekSummaryModel = dbLogs.model('partnerWeekSummary', partnerWeekSummarySchema, 'partnerWeekSummary');

var partnerChildWeekSummarySchema = require('./../schema/partnerChildWeekSummary');
var partnerChildWeekSummaryModel = dbLogs.model('partnerChildWeekSummary', partnerChildWeekSummarySchema, 'partnerChildWeekSummary');

var partnerRewardRecordSchema = require('./../schema/partnerRewardRecord');
var partnerRewardRecordModel = dbLogs.model('partnerRewardRecord', partnerRewardRecordSchema, 'partnerRewardRecord');

var playerStatusChangeLogSchema = require('./../schema/logs/playerStatusChangeLog');
var playerStatusChangeLogModal = dbLogs.model('playerStatusChangeLog', playerStatusChangeLogSchema, 'playerStatusChangeLog');

var partnerStatusChangeLogSchema = require('./../schema/logs/partnerStatusChangeLog');
var partnerStatusChangeLogModal = dbLogs.model('partnerStatusChangeLog', partnerStatusChangeLogSchema, 'partnerStatusChangeLog');

var gameProviderDaySummarySchema = require('./../schema/gameProviderDaySummary');
var gameProviderDaySummaryModel = dbLogs.model('gameProviderDaySummary', gameProviderDaySummarySchema, 'gameProviderDaySummary');

var gameProviderPlayerDaySummarySchema = require('./../schema/gameProviderPlayerDaySummary');
var gameProviderPlayerDaySummaryModel = dbLogs.model('gameProviderPlayerDaySummary', gameProviderPlayerDaySummarySchema, 'gameProviderPlayerDaySummary');

var playerPermissionLogSchema = require('./../schema/logs/playerPermissionLog');
var playerPermissionLogModel = dbLogs.model('playerPermissionLog', playerPermissionLogSchema, 'playerPermissionLog');

let partnerPermissionLogSchema = require('./../schema/logs/partnerPermissionLog');
let partnerPermissionLogModel = dbLogs.model('partnerPermissionLog', partnerPermissionLogSchema, 'partnerPermissionLog');

var playerCreditTransferLogSchema = require('./../schema/logs/playerCreditTransferLog');
var playerCreditTransferLogModel = dbLogs.model('playerCreditTransferLog', playerCreditTransferLogSchema, 'playerCreditTransferLog');

var playerClientSourceLogSchema = require('./../schema/logs/playerClientSourceLog');
var playerClientSourceLogModel = dbLogs.model('playerClientSourceLog', playerClientSourceLogSchema, 'playerClientSourceLog');

var partnerLoginRecordSchema = require('./../schema/partnerLoginRecord');
var partnerLoginRecordModel = dbLogs.model('partnerLoginRecord', partnerLoginRecordSchema, 'partnerLoginRecord');

let smsLogSchema = require('./../schema/logs/smsLog');
let smsLogModel = dbLogs.model('smsLog', smsLogSchema, 'smsLog');
let smsVerificationLogSchema = require('./../schema/logs/smsVerificationLog');
let smsVerificationLogModel = dbLogs.model('smsVerificationLog', smsVerificationLogSchema, 'smsVerificationLog');
let playerCreditsDailyLogSchema = require('./../schema/logs/playerCreditsDailyLog');
let playerCreditsDailyLogModel = dbLogs.model('playerCreditsDailyLog', playerCreditsDailyLogSchema, 'playerCreditsDailyLog');
let promoCodeSchema = require('./../schema/logs/promoCode');
let promoCodeModel = dbLogs.model('promoCode', promoCodeSchema, 'promoCode');
let playerStateSchema = require('./../schema/logs/playerState');
let playerStateModel = dbLogs.model('playerState', playerStateSchema, 'playerState');

var partnerCommissionRecordSchema = require('./../schema/partnerCommissionRecord');
var partnerCommissionRecordModel = dbLogs.model('partnerCommissionRecord', partnerCommissionRecordSchema, 'partnerCommissionRecord');

var paymentAPILogSchema = require('./../schema/logs/paymentAPILog');
var paymentAPILogModel = dbLogs.model('paymentAPILog', paymentAPILogSchema, 'paymentAPILog');

var syncDataLogSchema = require('./../schema/logs/syncDataLog');
var syncDataLogModel = dbLogs.model('syncDataLog', syncDataLogSchema, 'syncDataLog');

let apiLogSchema = require('./../schema/logs/apiLog');
let apiLogModel = dbLogs.model('apiLog', apiLogSchema, 'apiLog');

let playerCredibilityUpdateLogSchema = require('./../schema/logs/playerCredibilityUpdateLog');
let playerCredibilityUpdateLogModel = dbLogs.model('playerCredibilityUpdateLog', playerCredibilityUpdateLogSchema, 'playerCredibilityUpdateLog');

let playerTopUpGroupUpdateLogSchema = require('./../schema/logs/playerTopUpGroupUpdateLog');
let playerTopUpGroupUpdateLogModel = dbLogs.model('playerTopUpGroupUpdateLog', playerTopUpGroupUpdateLogSchema, 'playerTopUpGroupUpdateLog');

let playerForbidRewardLogSchema = require('./../schema/logs/playerForbidRewardLog');
let playerForbidRewardLogModel = dbLogs.model('playerForbidRewardLog', playerForbidRewardLogSchema, 'playerForbidRewardLog');

let playerForbidGameLogSchema = require('./../schema/logs/playerForbidGameLog');
let playerForbidGameLogModel = dbLogs.model('playerForbidGameLog', playerForbidGameLogSchema, 'playerForbidGameLog');

let playerForbidTopUpLogSchema = require('./../schema/logs/playerForbidTopUpLog');
let playerForbidTopUpLogModel = dbLogs.model('playerForbidTopUpLog', playerForbidTopUpLogSchema, 'playerForbidTopUpLog');

//unique schema
var playerNameSchema = require('./../schema/unique/playerName');
var playerNameModal = db_player.model('playerName', playerNameSchema, 'playerName');
var partnerOwnDomainSchema = require('./../schema/unique/partnerOwnDomain');
var partnerOwnDomainModal = db_player.model('partnerOwnDomain', partnerOwnDomainSchema, 'partnerOwnDomain');
var consumptionOrderNumSchema = require('./../schema/unique/consumptionOrderNum');
var consumptionOrderNumModal = dbLogs.model('consumptionOrderNum', consumptionOrderNumSchema, 'consumptionOrderNum');

var syncDataRequestIdSchema = require('./../schema/unique/syncDataRequestId');
var syncDataRequestIdModal = dbLogs.model('syncDataRequestId', syncDataRequestIdSchema, 'syncDataRequestId');


//todo:: to be removed
// test schema
var providerPlayerCreditSchema = require('./../schema/providerPlayerCredit');
var providerPlayerCreditModal = dbLogs.model('providerPlayerCredit', providerPlayerCreditSchema, 'providerPlayerCredit');

// test schema
var apiResponseTimeLogSchema = require('./../schema/logs/apiResponseTimeLog');
var apiResponseTimeLogModal = dbLogs.model('apiResponseTimeLog', apiResponseTimeLogSchema, 'apiResponseTimeLog');

var dataMigrationErrorLogSchema = require('./../schema/logs/dataMigrationErrorLog');
var dataMigrationErrorLogModel = dbLogs.model('dataMigrationErrorLog', dataMigrationErrorLogSchema, 'dataMigrationErrorLog');


/////////////////////////collections/////////////////////////////////////
var dbProperties = {
    //collection_counter: counterModel,

    collection_admin: adminInfoModel,
    collection_department: departmentModel,
    collection_role: roleModel,

    collection_proposal: proposalModel,
    collection_proposalProcess: proposalProcessModel,
    collection_proposalProcessStep: proposalProcessStepModel,
    collection_proposalType: proposalTypeModel,
    collection_proposalTypeProcess: proposalTypeProcessModel,
    collection_proposalTypeProcessStep: proposalTypeProcessStepModel,

    collection_rewardEvent: rewardEventModel,
    collection_rewardParam: rewardParamModel,
    collection_rewardRule: rewardRuleModel,
    collection_rewardType: rewardTypeModel,
    collection_rewardCondition: rewardConditionModel,
    collection_rewardTask: rewardTaskModel,

    collection_players: playerModel,
    collection_playerLevel: playerLevelModel,
    collection_playerBadRecord: playerBadRecordModel,
    collection_playerTrustLevel: playerTrustLevelModel,
    collection_playerFeedback: playerFeedbackModel,
    collection_playerLoginRecord: playerLoginRecordModel,
    collection_playerLevelConsumptionLevel: playerLevelConsumptionLimitModel,
    collection_playerCredibilityRemark: playerCredibilityRemarkModel,

    collection_apiUser: apiUserModel,
    collection_platform: platformModel,
    collection_platformGameStatus: platformGameStatusModel,
    collection_platformGameGroup: platformGameGroupModel,
    collection_platformBankCardGroup: platformBankCardGroupModel,
    collection_platformMerchantGroup: platformMerchantGroupModel,
    collection_platformAlipayGroup: platformAlipayGroupModel,
    collection_platformWechatPayGroup: platformWechatPayGroupModel,
    collection_platformQuickPayGroup: platformQuickPayGroupModel,

    collection_gameType: gameTypeModel,
    collection_game: gameModel,
    collection_gameProvider: gameProviderModel,
    collection_gameProviderGroup: gameProviderGroupModel,

    collection_partner: partnerModel,
    collection_partnerLevel: partnerLevelModel,
    collection_partnerLevelConfig: partnerLevelConfigModel,
    collection_paymentChannel: paymentChannelModel,

    collection_messageTemplate: messageTemplateModel,
    collection_platformAnnouncement: platformAnnouncementModel,
    collection_partnerCommissionConfig: partnerCommissionConfigModel,

    collection_geoIp: geoIpModel,
    collection_promoCodeType: promoCodeTypeModel,
    collection_promoCodeUserGroup: promoCodeUserGroupModel,

    collection_csOfficer: csOfficerModel,
    collection_csOfficerUrl: csOfficerUrlModel,
    collection_csPromoteWay: csPromoteWayModel,

    collection_playerFeedbackResult: playerFeedbackResultModel,
    collection_playerFeedbackTopic: playerFeedbackTopicModel,

    //logs
    collection_playerMail: playerMailModel,

    collection_platformDaySummary: platformDaySummaryModel,

    collection_playerTopUpRecord: playerTopUpRecordModel,
    collection_playerTopUpIntentRecord: playerTopUpIntentRecordModel,
    collection_playerRegistrationIntentRecord: playerRegistrationIntentRecordModel,
    collection_playerTopUpDaySummary: playerTopUpDaySummaryModel,
    collection_playerTopUpWeekSummary: playerTopUpWeekSummaryModel,
    collection_playerConsumptionRecord: playerConsumptionRecordModel,
    collection_playerConsumptionSummary: playerConsumptionSummaryModel,
    collection_playerConsumptionDaySummary: playerConsumptionDaySummaryModel,
    collection_playerConsumptionWeekSummary: playerConsumptionWeekSummaryModel,
    collection_playerGameTypeConsumptionDaySummary: playerGameTypeConsumptionDaySummaryModel,
    collection_playerGameTypeConsumptionWeekSummary: playerGameTypeConsumptionWeekSummaryModel,

    collection_partnerWeekSummary: partnerWeekSummaryModel,
    collection_partnerChildWeekSummary: partnerChildWeekSummaryModel,
    collection_partnerRewardRecord: partnerRewardRecordModel,

    collection_providerDaySummary: gameProviderDaySummaryModel,
    collection_providerPlayerDaySummary: gameProviderPlayerDaySummaryModel,
    collection_settlementLog: settlementLogModal,
    collection_bankInfoLog: bankInfoLogModal,

    collection_systemLog: systemLogModel,
    collection_creditChangeLog: creditChangeLogModel,
    collection_partnerCreditChangeLog: partnerCreditChangeLogModel,
    collection_rewardLog: rewardLogModel,
    collection_playerStatusChangeLog: playerStatusChangeLogModal,
    collection_playerPermissionLog: playerPermissionLogModel,
    collection_playerCreditsDailyLog: playerCreditsDailyLogModel,
    collection_playerCreditTransferLog: playerCreditTransferLogModel,
    collection_playerClientSourceLog: playerClientSourceLogModel,
    collection_partnerLoginRecord: partnerLoginRecordModel,
    collection_smsLog: smsLogModel,
    collection_smsVerificationLog: smsVerificationLogModel,
    collection_partnerCommissionRecord: partnerCommissionRecordModel,
    collection_paymentAPILog: paymentAPILogModel,
    collection_syncDataLog: syncDataLogModel,
    collection_partnerPermissionLog: partnerPermissionLogModel,
    collection_partnerStatusChangeLog: partnerStatusChangeLogModal,
    collection_apiLog: apiLogModel,
    collection_promoCode: promoCodeModel,
    collection_playerState: playerStateModel,
    collection_playerCredibilityUpdateLog: playerCredibilityUpdateLogModel,
    collection_playerTopUpGroupUpdateLog: playerTopUpGroupUpdateLogModel,
    collection_playerForbidRewardLog: playerForbidRewardLogModel,
    collection_playerForbidGameLog: playerForbidGameLogModel,
    collection_playerForbidTopUpLog: playerForbidTopUpLogModel,

    //unique
    collection_playerName: playerNameModal,
    collection_consumptionOrderNumModal: consumptionOrderNumModal,
    collection_partnerOwnDomain: partnerOwnDomainModal,
    collection_syncDataRequestId: syncDataRequestIdModal,

    //test
    collection_providerPlayerCredit: providerPlayerCreditModal,
    collection_apiResponseTimeLog: apiResponseTimeLogModal,
    collection_dataMigrationErrorLog: dataMigrationErrorLogModel
};

for (var key in dbProperties) {
    var model = dbProperties[key];
    (function (key, model) {
        model.on('index', function (err) {
            if (err) {
                console.warn("Indexing error for model " + key + ": " + err);
            }
        });
    }(key, model));
}

// module.exports = dbProperties;
var proto = dbPropertiesFunc.prototype;
proto = Object.assign(proto, dbProperties);

// This make WebStorm navigation work
module.exports = dbProperties;
