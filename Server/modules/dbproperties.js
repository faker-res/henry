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
let dbLogs2 = dbConnections.logs2db;

/////////////////////////Schemas/////////////////////////////////////

// We are actually using dbConnections.counterModel instead
//var counterSchema = require('./../schema/counter');

var adminInfoSchema = require('./../schema/admin');
var departmentSchema = require('./../schema/department');
var platformSchema = require('./../schema/platform');
var themeSettingSchema = require('./../schema/themeSetting');
var platformGameStatusSchema = require('./../schema/platformGameStatus');
var playerSchema = require('./../schema/player');

var playerLevelSchema = require('./../schema/playerLevel');
var playerTrustLevelSchema = require('./../schema/playerTrustLevel');
var playerBadRecordSchema = require('./../schema/playerBadRecord');
var playerLoginRecordSchema = require('./../schema/playerLoginRecord');
var playerLevelConsumptionLimitSchema = require('./../schema/playerLevelConsumptionLimit');
var playerFeedbackSchema = require('./../schema/playerFeedback');
let partnerFeedbackSchema = require('./../schema/partnerFeedback');

var proposalSchema = require('./../schema/proposal');
var proposalProcessSchema = require('./../schema/proposalProcess');
var proposalProcessStepSchema = require('./../schema/proposalProcessStep');

var proposalTypeSchema = require('./../schema/proposalType');
var proposalTypeProcessSchema = require('./../schema/proposalTypeProcess');
var proposalTypeProcessStepSchema = require('./../schema/proposalTypeProcessStep');

var rewardEventSchema = require('./../schema/rewardEvent');
var rewardEventGroupSchema = require('./../schema/rewardEventGroup');
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

let partnerFeedbackResultSchema = require('./../schema/partnerFeedbackResult');
let partnerFeedbackTopicSchema = require('./../schema/partnerFeedbackTopic');

let rewardPointsLvlConfigSchema = require('./../schema/rewardPointsLvlConfig');
let rewardPointsSchema = require('./../schema/rewardPoints');
let rewardPointsRandomDataConfigSchema = require('./../schema/rewardPointsRandomDataConfig');
let rewardPointsEventSchema = require('./../schema/rewardPointsEvent');
let rewardPointsTaskSchema = require('./../schema/rewardPointsTask');

let playerPageAdvertisementInfoSchema = require('./../schema/playerPageAdvertisementInfo');
let partnerPageAdvertisementInfoSchema = require('./../schema/partnerPageAdvertisementInfo');

let smsGroupSchema = require('./../schema/smsGroup');
let promoCodeTemplateSchema = require('./../schema/promoCodeTemplate');
let depositGroupSchema = require('./../schema/depositGroup');
let qualityInspectionSchema = require('./../schema/qualityInspection');
let live800RecordDaySummarySchema = require('./../schema/live800RecordDaySummary');
let wcDeviceSchema = require('./../schema/admindb/wcDevice');
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
var rewardEventGroupModel = db_admin.model('rewardEventGroup', rewardEventGroupSchema, 'rewardEventGroup');
var rewardTypeModel = db_admin.model('rewardType', rewardTypeSchema, 'rewardType');
var rewardRuleModel = db_admin.model('rewardRule', rewardRuleSchema, 'rewardRule');
var rewardParamModel = db_admin.model('rewardParam', rewardParamSchema, 'rewardParam');
var rewardConditionModel = db_admin.model('rewardCondition', rewardConditionSchema, 'rewardCondition');
let rewardPointsEventModel = db_admin.model('rewardPointsEvent', rewardPointsEventSchema, 'rewardPointsEvent');
let rewardPointsLvlConfigModel = db_admin.model('rewardPointsLvlConfig', rewardPointsLvlConfigSchema, 'rewardPointsLvlConfig');

var apiUserModel = db_admin.model('apiUser', apiUserSchema, 'apiUser');
var platformModel = db_admin.model('platform', platformSchema, 'platform');
var themeSettingModel = db_admin.model('themeSetting', themeSettingSchema, 'themeSetting');
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

var clientQnATemplateSchema = require('../schema/clientQnATemplate');
var clientQnATemplateModel = db_admin.model('clientQnATemplate', clientQnATemplateSchema, 'clientQnATemplate');

var clientQnATemplateConfigSchema = require('../schema/clientQnATemplateConfig');
var clientQnATemplateConfigModel = db_admin.model('clientQnATemplateConfig', clientQnATemplateConfigSchema, 'clientQnATemplateConfig');

var platformFeeEstimateSchema = require('../schema/platformFeeEstimate');
var platformFeeEstimateModel = db_admin.model('platformFeeEstimate', platformFeeEstimateSchema, 'platformFeeEstimate');

var platformBankCardListSchema = require('./../schema/platformBankCardList');
var platformBankCardListModel = db_admin.model('platformBankCardList', platformBankCardListSchema, 'platformBankCardList');

var platformMerchantGroupSchema = require('./../schema/platformMerchantGroup');
var platformMerchantGroupModel = db_admin.model('platformMerchantGroup', platformMerchantGroupSchema, 'platformMerchantGroup');

var platformMerchantListSchema = require('./../schema/platformMerchantList');
var platformMerchantListModel = db_admin.model('platformMerchantList', platformMerchantListSchema, 'platformMerchantList');

var platformAlipayGroupSchema = require('./../schema/platformAlipayGroup');
var platformAlipayGroupModel = db_admin.model('platformAlipayGroup', platformAlipayGroupSchema, 'platformAlipayGroup');

var platformAlipayListSchema = require('./../schema/platformAlipayList');
var platformAlipayListModel = db_admin.model('platformAlipayList', platformAlipayListSchema, 'platformAlipayList');

var platformWechatPayGroupSchema = require('./../schema/platformWechatPayGroup');
var platformWechatPayGroupModel = db_admin.model('platformWechatPayGroup', platformWechatPayGroupSchema, 'platformWechatPayGroup');

var platformWechatPayListSchema = require('./../schema/platformWechatPayList');
var platformWechatPayListModel = db_admin.model('platformWechatPayList', platformWechatPayListSchema, 'platformWechatPayList');

var partnerCommissionConfigSchema = require('./../schema/partnerCommissionConfig');
var partnerCommissionConfigModel = db_admin.model('partnerCommissionConfig', partnerCommissionConfigSchema, 'partnerCommissionConfig');

var partnerCommissionRateConfigSchema = require('./../schema/partnerCommissionRateConfig');
var partnerCommissionRateConfigModel = db_admin.model('partnerCommissionRateConfig', partnerCommissionRateConfigSchema, 'partnerCommissionRateConfig');

let gameProviderGroupSchema = require('./../schema/gameProviderGroup');
let gameProviderGroupModel = db_admin.model('gameProviderGroup', gameProviderGroupSchema, 'gameProviderGroup');

let keywordFilterSchema = require('./../schema/keywordFilter');
let keywordFilterModel = db_admin.model('keywordFilter', keywordFilterSchema, 'keywordFilter');

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

let dxMissionSchema = require('../schema/dxMission');
let dxMissionModel = db_admin.model('dxMission', dxMissionSchema, 'dxMission');

let largeWithdrawalSettingSchema = require('../schema/largeWithdrawalSetting');
let largeWithdrawalSettingModel = db_admin.model('largeWithdrawalSetting', largeWithdrawalSettingSchema, 'largeWithdrawalSetting');

let largeWithdrawalPartnerSettingSchema = require('../schema/largeWithdrawalPartnerSetting');
let largeWithdrawalPartnerSettingModel = db_admin.model('largeWithdrawalPartnerSetting', largeWithdrawalPartnerSettingSchema, 'largeWithdrawalPartnerSetting');

let largeWithdrawalLogSchema = require('../schema/largeWithdrawalLog');
let largeWithdrawalLogModel = dbLogs2.model('largeWithdrawalLog', largeWithdrawalLogSchema, 'largeWithdrawalLog');

let partnerLargeWithdrawalLogSchema = require('../schema/partnerLargeWithdrawalLog');
let partnerLargeWithdrawalLogModel = dbLogs2.model('partnerLargeWithdrawalLog', partnerLargeWithdrawalLogSchema, 'partnerLargeWithdrawalLog');

let playerFeedbackResultModel = db_admin.model('playerFeedbackResult', playerFeedbackResultSchema, 'playerFeedbackResult');
let playerFeedbackTopicModel = db_admin.model('playerFeedbackTopic', playerFeedbackTopicSchema, 'playerFeedbackTopic');

let partnerFeedbackResultModel = db_admin.model('partnerFeedbackResult', partnerFeedbackResultSchema, 'partnerFeedbackResult');
let partnerFeedbackTopicModel = db_admin.model('partnerFeedbackTopic', partnerFeedbackTopicSchema, 'partnerFeedbackTopic');

let playerPageAdvertisementInfoModel = db_admin.model('playerPageAdvertisementInfo', playerPageAdvertisementInfoSchema, 'playerPageAdvertisementInfo');
let partnerPageAdvertisementInfoModel = db_admin.model('partnerPageAdvertisementInfo', partnerPageAdvertisementInfoSchema, 'partnerPageAdvertisementInfo');

let smsGroupModel = db_admin.model('smsGroup', smsGroupSchema, 'smsGroup');

let promoCodeTemplateModel = db_admin.model('promoCodeTemplate', promoCodeTemplateSchema, 'promoCodeTemplate');

let depositGroupModel = db_admin.model('depositGroup', depositGroupSchema, 'depositGroup');
let wcDeviceModel = db_admin.model('wcDevice', wcDeviceSchema, 'wcDevice');

let platformAutoFeedbackSchema = require('./../schema/platformAutoFeedback');
let platformAutoFeedbackModel = db_admin.model('platformAutoFeedback', platformAutoFeedbackSchema, 'platformAutoFeedback');
let idcIpSchema = require('./../schema/idcIp');
let idcIpModel = db_admin.model('idcIp', idcIpSchema, 'idcIp');

let platformBlacklistIpConfigSchema = require('./../schema/platformBlacklistIpConfig');
let platformBlacklistIpConfigModel = db_admin.model('platformBlacklistIpConfig', platformBlacklistIpConfigSchema, 'platformBlacklistIpConfig');

let platformBlackWhiteListingSchema = require('./../schema/platformBlackWhiteListing');
let platformBlackWhiteListingModel = db_admin.model('platformBlackWhiteListing', platformBlackWhiteListingSchema, 'platformBlackWhiteListing');

//----------------------------------------player db properties-----------------------------------------------------------
var playerModel = db_player.model('playerInfo', playerSchema, 'playerInfo');
var playerFeedbackModel = db_player.model('playerFeedback', playerFeedbackSchema, 'playerFeedback');
let partnerFeedbackModel = db_player.model('partnerFeedback', partnerFeedbackSchema, 'partnerFeedback');
var partnerModel = db_player.model('partner', partnerSchema, 'partner');

var rewardTaskModel = db_player.model('rewardTask', rewardTaskSchema, 'rewardTask');
let rewardPointsModel = db_player.model('rewardPoints', rewardPointsSchema, 'rewardPoints');
let rewardPointsRandomDataConfigModel = db_admin.model('rewardPointsRandomDataConfig', rewardPointsRandomDataConfigSchema, 'rewardPointsRandomDataConfig');
let rewardPointsTaskModel = db_player.model('rewardPointsTask', rewardPointsTaskSchema, 'rewardPointsTask');

let playerDepositTrackingGroupSchema = require('./../schema/playerDepositTrackingGroup');
let playerDepositTrackingGroupModel = db_admin.model('playerDepositTrackingGroup', playerDepositTrackingGroupSchema, 'playerDepositTrackingGroup');

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

let createDemoPlayerLogSchema = require('./../schema/logs/createDemoPlayerLog');
let createDemoPlayerLogModel = dbLogs2.model('createDemoPlayerLog', createDemoPlayerLogSchema, 'createDemoPlayerLog');

let rewardPointsProgressSchema = require('./../schema/logs/rewardPointsProgress');
let rewardPointsProgressModel = dbLogs2.model('rewardPointsProgress', rewardPointsProgressSchema, 'rewardPointsProgress');

let partnerCommissionLogSchema = require('./../schema/logs2/partnerCommissionLog');
let partnerCommissionLogModel = dbLogs2.model('partnerCommissionLog', partnerCommissionLogSchema, 'partnerCommissionLog');

let downLinesRawCommissionDetailSchema = require('./../schema/logs2/downLinesRawCommissionDetail');
let downLinesRawCommissionDetailModel = dbLogs2.model('downLinesRawCommissionDetail', downLinesRawCommissionDetailSchema, 'downLinesRawCommissionDetail');

let callOutMissionSchema = require('./../schema/logs2/callOutMission');
let callOutMissionModel = dbLogs2.model('callOutMission', callOutMissionSchema, 'callOutMission');

let callOutMissionCalleeSchema = require('./../schema/logs2/callOutMissionCallee');
let callOutMissionCalleeModel = dbLogs2.model('callOutMissionCallee', callOutMissionCalleeSchema, 'callOutMissionCallee');

let clientQnASchema = require('./../schema/logs2/clientQnA');
let clientQnAModel = dbLogs2.model('clientQnA', clientQnASchema, 'clientQnA');

let frontendDataSchema = require('./../schema/logs2/frontendData');
let frontendDataModel = dbLogs2.model('frontendData', frontendDataSchema, 'frontendData');

let resetPasswordVerificationSchema = require('./../schema/logs2/resetPasswordVerification');
let resetPasswordVerificationModel = dbLogs2.model('resetPasswordVerification', resetPasswordVerificationSchema, 'resetPasswordVerification');

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
let rewardTaskGroupSchema = require('./../schema/logs/rewardTaskGroup');
let rewardTaskGroupModel = dbLogs.model('rewardTaskGroup', rewardTaskGroupSchema, 'rewardTaskGroup');
let promoCodeActiveTimeSchema = require('./../schema/logs/promoCodeActiveTime');
let promoCodeActiveTimeModel = dbLogs.model('promoCodeActiveTime', promoCodeActiveTimeSchema, 'promoCodeActiveTime');
let clickCountSchema = require('./../schema/logs2/clickCount');
let clickCountModel = dbLogs2.model('clickCount', clickCountSchema, 'clickCount');
let rewardTaskGroupUnlockedRecordSchema = require('./../schema/logs2/rewardTaskGroupUnlockedRecord');
let rewardTaskGroupUnlockedRecordModel = dbLogs2.model('rewardTaskGroupUnlockedRecord', rewardTaskGroupUnlockedRecordSchema, 'rewardTaskGroupUnlockedRecord');
let playerBStateSchema = require('./../schema/logs2/playerBState');
let playerBStateModel = dbLogs2.model('playerBState', playerBStateSchema, 'playerBState');
let partnerCommSettLogSchema = require('./../schema/logs2/partnerCommSettLog');
let partnerCommSettLogModel = dbLogs2.model('partnerCommSettLog', partnerCommSettLogSchema, 'partnerCommSettLog');
let playerOnlineTimeSchema = require('./../schema/logs2/playerOnlineTime');
let playerOnlineTimeModel = dbLogs2.model('playerOnlineTime', playerOnlineTimeSchema, 'playerOnlineTime');
let ipDomainLogSchema = require('./../schema/logs2/ipDomainLog');
let ipDomainLogModel = dbLogs2.model('ipDomainLog', ipDomainLogSchema, 'ipDomainLog');
let tsPhoneListSchema = require('./../schema/logs2/tsPhoneList');
let tsPhoneListModel = dbLogs2.model('tsPhoneList', tsPhoneListSchema, 'tsPhoneList');
let tsPhoneSchema = require('./../schema/logs2/tsPhone');
let tsPhoneModel = dbLogs2.model('tsPhone', tsPhoneSchema, 'tsPhone');
let tsPhoneImportRecordSchema = require('./../schema/logs2/tsPhoneImportRecord');
let tsPhoneImportRecordModel = dbLogs2.model('tsPhoneImportRecord', tsPhoneImportRecordSchema, 'tsPhoneImportRecord');
let tsDistributedPhoneListSchema = require('./../schema/logs2/tsDistributedPhoneList');
let tsDistributedPhoneListModel = dbLogs2.model('tsDistributedPhoneList', tsDistributedPhoneListSchema, 'tsDistributedPhoneList');
let tsDistributedPhoneSchema = require('./../schema/logs2/tsDistributedPhone');
let tsDistributedPhoneModel = dbLogs2.model('tsDistributedPhone', tsDistributedPhoneSchema, 'tsDistributedPhone');
let tsAssigneeSchema = require('./../schema/logs2/tsAssignee');
let tsAssigneeModel = dbLogs2.model('tsAssignee', tsAssigneeSchema, 'tsAssignee');
let tsPhoneFeedbackSchema = require('./../schema/logs2/tsPhoneFeedback');
let tsPhoneFeedbackModel = dbLogs2.model('tsPhoneFeedback', tsPhoneFeedbackSchema, 'tsPhoneFeedback');
let tsCallOutMissionSchema = require('./../schema/logs2/tsCallOutMission');
let tsCallOutMissionModel = dbLogs2.model('tsCallOutMission', tsCallOutMissionSchema, 'tsCallOutMission');
let tsCallOutMissionCalleeSchema = require('./../schema/logs2/tsCallOutMissionCallee');
let tsCallOutMissionCalleeModel = dbLogs2.model('tsCallOutMissionCallee', tsCallOutMissionCalleeSchema, 'tsCallOutMissionCallee');
let tsPhoneTradeSchema = require('./../schema/logs2/tsPhoneTrade');
let tsPhoneTradeModel = dbLogs2.model('tsPhoneTrade', tsPhoneTradeSchema, 'tsPhoneTrade');
let wcGroupControlSessionSchema = require('./../schema/logs2/wcGroupControlSession');
let wcGroupControlSessionModel = dbLogs2.model('wcGroupControlSession', wcGroupControlSessionSchema, 'wcGroupControlSession');
let wcConversationLogSchema = require('./../schema/logs2/wcConversationLog');
let wcConversationLogModel = dbLogs2.model('wcConversationLog', wcConversationLogSchema, 'wcConversationLog');
let wcGroupControlPlayerWechatSchema = require('./../schema/logs2/wcGroupControlPlayerWechat');
let wcGroupControlPlayerWechatModel = dbLogs2.model('wcGroupControlPlayerWechat', wcGroupControlPlayerWechatSchema, 'wcGroupControlPlayerWechat');

let openPromoCodeTemplateSchema = require('./../schema/logs2/openPromoCodeTemplate');
let openPromoCodeTemplateModel = dbLogs2.model('openPromoCodeTemplate', openPromoCodeTemplateSchema, 'openPromoCodeTemplate');

let dxPhoneSchema = require('./../schema/logs2/dxPhone');
let dxPhoneModel = dbLogs2.model('dxPhone', dxPhoneSchema, 'dxPhone');

let playerConsumptionSlipRewardGroupRecordSchema = require('./../schema/logs2/playerConsumptionSlipRewardGroupRecord');
let playerConsumptionSlipRewardGroupRecordModel = dbLogs2.model('playerConsumptionSlipRewardGroupRecord', playerConsumptionSlipRewardGroupRecordSchema, 'playerConsumptionSlipRewardGroupRecord');

let playerRetentionRewardGroupRecordSchema = require('./../schema/logs2/playerRetentionRewardGroupRecord');
let playerRetentionRewardGroupRecordModel = dbLogs2.model('playerRetentionRewardGroupRecord', playerRetentionRewardGroupRecordSchema, 'playerRetentionRewardGroupRecord');

let actionLogSchema = require('./../schema/logs2/actionLog');
let actionLogModel = dbLogs2.model('actionLog', actionLogSchema, 'actionLog');

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

let playerForbidRewardPointsEventLogSchema = require('./../schema/logs/playerForbidRewardPointsEventLog');
let playerForbidRewardPointsEventLogModel = dbLogs.model('playerForbidRewardPointsEventLog', playerForbidRewardPointsEventLogSchema, 'playerForbidRewardPointsEventLog');

let playerForbidGameLogSchema = require('./../schema/logs/playerForbidGameLog');
let playerForbidGameLogModel = dbLogs.model('playerForbidGameLog', playerForbidGameLogSchema, 'playerForbidGameLog');

let playerForbidTopUpLogSchema = require('./../schema/logs/playerForbidTopUpLog');
let playerForbidTopUpLogModel = dbLogs.model('playerForbidTopUpLog', playerForbidTopUpLogSchema, 'playerForbidTopUpLog');

let rewardPointsLogSchema = require('./../schema/logs/rewardPointsLog');
let rewardPointsLogModel = dbLogs.model('rewardPointsLog', rewardPointsLogSchema, 'rewardPointsLog');

let qualityInspectionModel = dbLogs.model('qualityInspection', qualityInspectionSchema, 'qualityInspection');
let live800RecordDaySummaryModel = dbLogs.model('live800RecordDaySummary', live800RecordDaySummarySchema, 'live800RecordDaySummary');

let playerInfoFromExternalSourceSchema = require('./../schema/logs2/playerInfoFromExternalSource');
let playerInfoFromExternalSourceModel = dbLogs2.model('playerInfoFromExternalSource', playerInfoFromExternalSourceSchema, 'playerInfoFromExternalSource');
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
    collection_rewardEventGroup: rewardEventGroupModel,
    collection_rewardParam: rewardParamModel,
    collection_rewardRule: rewardRuleModel,
    collection_rewardType: rewardTypeModel,
    collection_rewardCondition: rewardConditionModel,
    collection_rewardTask: rewardTaskModel,
    collection_rewardPointsLvlConfig: rewardPointsLvlConfigModel,
    collection_rewardPointsEvent: rewardPointsEventModel,
    collection_rewardPoints: rewardPointsModel,
    collection_rewardPointsRandomDataConfig: rewardPointsRandomDataConfigModel,
    collection_rewardPointsTask: rewardPointsTaskModel,

    collection_players: playerModel,
    collection_playerLevel: playerLevelModel,
    collection_playerBadRecord: playerBadRecordModel,
    collection_playerTrustLevel: playerTrustLevelModel,
    collection_playerFeedback: playerFeedbackModel,
    collection_partnerFeedback: partnerFeedbackModel,
    collection_playerLoginRecord: playerLoginRecordModel,
    collection_playerLevelConsumptionLevel: playerLevelConsumptionLimitModel,
    collection_playerCredibilityRemark: playerCredibilityRemarkModel,
    collection_playerDepositTrackingGroup: playerDepositTrackingGroupModel,

    collection_apiUser: apiUserModel,
    collection_platform: platformModel,
    collection_themeSetting: themeSettingModel,
    collection_platformGameStatus: platformGameStatusModel,
    collection_platformGameGroup: platformGameGroupModel,
    collection_platformBankCardGroup: platformBankCardGroupModel,
    collection_clientQnA: clientQnAModel,
    collection_clientQnATemplate: clientQnATemplateModel,
    collection_clientQnATemplateConfig: clientQnATemplateConfigModel,
    collection_resetPasswordVerification: resetPasswordVerificationModel,
    collection_platformFeeEstimate: platformFeeEstimateModel,
    collection_platformBankCardList: platformBankCardListModel,
    collection_platformMerchantGroup: platformMerchantGroupModel,
    collection_platformMerchantList: platformMerchantListModel,
    collection_platformAlipayGroup: platformAlipayGroupModel,
    collection_platformAlipayList: platformAlipayListModel,
    collection_platformWechatPayGroup: platformWechatPayGroupModel,
    collection_platformWechatPayList: platformWechatPayListModel,
    collection_platformQuickPayGroup: platformQuickPayGroupModel,
    collection_autoFeedback: platformAutoFeedbackModel,

    collection_platformBlacklistIpConfig: platformBlacklistIpConfigModel,
    collection_platformBlackWhiteListing: platformBlackWhiteListingModel,

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
    collection_partnerCommissionRateConfig: partnerCommissionRateConfigModel,

    collection_geoIp: geoIpModel,
    collection_promoCodeType: promoCodeTypeModel,
    collection_promoCodeUserGroup: promoCodeUserGroupModel,

    collection_keywordFilter: keywordFilterModel,

    collection_dxMission: dxMissionModel,
    collection_dxPhone: dxPhoneModel,
    collection_playerConsumptionSlipRewardGroupRecord: playerConsumptionSlipRewardGroupRecordModel,
    collection_playerRetentionRewardGroupRecord: playerRetentionRewardGroupRecordModel,

    collection_largeWithdrawalSetting: largeWithdrawalSettingModel,
    collection_largeWithdrawalPartnerSetting: largeWithdrawalPartnerSettingModel,
    collection_largeWithdrawalLog: largeWithdrawalLogModel,
    collection_partnerLargeWithdrawalLog: partnerLargeWithdrawalLogModel,

    collection_actionLog: actionLogModel,

    collection_csOfficer: csOfficerModel,
    collection_csOfficerUrl: csOfficerUrlModel,
    collection_csPromoteWay: csPromoteWayModel,

    collection_playerFeedbackResult: playerFeedbackResultModel,
    collection_playerFeedbackTopic: playerFeedbackTopicModel,

    collection_partnerFeedbackResult: partnerFeedbackResultModel,
    collection_partnerFeedbackTopic: partnerFeedbackTopicModel,

    collection_playerPageAdvertisementInfo: playerPageAdvertisementInfoModel,
    collection_partnerPageAdvertisementInfo: partnerPageAdvertisementInfoModel,

    collection_idcIp: idcIpModel,
    collection_smsGroup: smsGroupModel,
    collection_promoCodeTemplate: promoCodeTemplateModel,
    collection_depositGroup: depositGroupModel,
    collection_wcDevice: wcDeviceModel,

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
    collection_ipDomainLog: ipDomainLogModel,
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
    collection_promoCodeActiveTime: promoCodeActiveTimeModel,
    collection_openPromoCodeTemplate: openPromoCodeTemplateModel,
    collection_playerState: playerStateModel,
    collection_playerCredibilityUpdateLog: playerCredibilityUpdateLogModel,
    collection_playerTopUpGroupUpdateLog: playerTopUpGroupUpdateLogModel,
    collection_playerForbidRewardPointsEventLog: playerForbidRewardPointsEventLogModel,
    collection_playerForbidRewardLog: playerForbidRewardLogModel,
    collection_playerForbidGameLog: playerForbidGameLogModel,
    collection_playerForbidTopUpLog: playerForbidTopUpLogModel,
    collection_playerOnlineTime: playerOnlineTimeModel,
    collection_rewardPointsLog: rewardPointsLogModel,
    collection_rewardTaskGroup: rewardTaskGroupModel,
    collection_createDemoPlayerLog: createDemoPlayerLogModel,
    collection_clickCount: clickCountModel,
    collection_rewardTaskGroupUnlockedRecord: rewardTaskGroupUnlockedRecordModel,
    collection_rewardPointsProgress: rewardPointsProgressModel,
    collection_playerBState: playerBStateModel,
    collection_partnerCommSettLog: partnerCommSettLogModel,
    collection_partnerCommissionLog: partnerCommissionLogModel,
    collection_downLinesRawCommissionDetail: downLinesRawCommissionDetailModel,
    collection_callOutMission: callOutMissionModel,
    collection_callOutMissionCallee: callOutMissionCalleeModel,
    collection_tsPhoneList: tsPhoneListModel,
    collection_tsPhone: tsPhoneModel,
    collection_tsPhoneImportRecord: tsPhoneImportRecordModel,
    collection_tsDistributedPhoneList: tsDistributedPhoneListModel,
    collection_tsDistributedPhone: tsDistributedPhoneModel,
    collection_tsAssignee: tsAssigneeModel,
    collection_tsPhoneFeedback: tsPhoneFeedbackModel,
    collection_tsCallOutMission: tsCallOutMissionModel,
    collection_tsCallOutMissionCallee: tsCallOutMissionCalleeModel,
    collection_tsPhoneTrade: tsPhoneTradeModel,
    collection_frontendData: frontendDataModel,
    collection_wcGroupControlSession: wcGroupControlSessionModel,
    collection_wcConversationLog: wcConversationLogModel,
    collection_wcGroupControlPlayerWechat: wcGroupControlPlayerWechatModel,

    collection_qualityInspection: qualityInspectionModel,
    collection_live800RecordDaySummary: live800RecordDaySummaryModel,
    collection_playerDataFromExternalSource: playerInfoFromExternalSourceModel,
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
