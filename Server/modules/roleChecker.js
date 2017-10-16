"use strict";

var memCache = require('memory-cache');
var Q = require("q");
var dbAdminInfo = require('./../db_modules/dbAdminInfo');
var commonAPIs = require('./../modules/commonAPIs');
var errorUtils = require("./errorUtils.js");

var roleChecker = {

    filterActions: [
        'createDepartment', 'createDepartmentWithParent', 'deleteDepartmentsById', 'updateDepartmentParent', 'updateAdminDepartment', 'updateDepartment',
        'createAdmin', 'fixPlatformDailySettlement', 'fixPlatformWeeklySettlement', 'createAdminForDepartment', 'deleteAdminInfosById', 'addUsersToDepartmentsById', 'removeUsersFromDepartmentsById', 'getUnAttachedUsersForDepartment',
        'updateAdmin', 'attachRolesToUsersById', 'createUpdatePartnerInfoProposal', 'attachRoleToUserByName', 'resetAdminPassword',
        'detachRolesFromUsersById', 'detachRoleFromUserByName',
        'createRole', 'createRoleForDepartment', 'attachRolesToDepartmentsById',
        'deleteRolesById', 'updateRole',
        'addPlatformsToDepartmentById', 'removePlatformsFromDepartmentById', 'updatePlatform', 'deletePlatformById',
        'createPlatform', 'startPlatformDailySettlement', 'startPlatformWeeklySettlement',
        'createPlayer', 'createTestPlayerForPlatform', 'deletePlayersById', 'createUpdatePlayerInfoProposal', 'updatePlayer', 'updatePlayerStatus',
        'createUpdatePlayerEmailProposal', 'createUpdatePlayerQQProposal', 'createUpdatePlayerPhoneProposal', 'updatePlayerPayment', 'resetPlayerPassword',
        'applyManualTopUpRequest', 'applyBonusRequest', 'applyRewardEvent', 'createUpdatePlayerCreditProposal', 'updatePlayerPermission',
        'createPlayerFeedback',
        'createPartnerWithParent', 'createPartner', 'createPlayerLoginRecord', 'deletePartnersById', 'deletePlayerLoginRecord', 'updatePartner',
        'createUpdatePartnerPhoneProposal', 'createUpdatePartnerEmailProposal', 'createUpdatePartnerBankInfoProposal', 'resetPartnerPassword',
        'addProviderToPlatformById', 'renameProviderInPlatformById', 'updateProviderFromPlatformById', 'removeProviderFromPlatformById', 'attachGameToPlatform', 'detachGameFromPlatform',
        'updateGameStatusToPlatform',
        'addPlatformGameGroup', 'updateGameGroupParent', 'renamePlatformGameGroup', 'updatePlatformGameGroup', 'deleteGameGroup',
        'createRewardRuleWithType', 'createRewardCondition', 'createRewardEvent', 'deleteRewardRuleByIds', 'deleteRewardEventByIds', 'updateRewardRule', 'updateRewardTask', 'updateRewardEvent',
        'createProposalTypeProcess', 'updateProposalType', 'updateProposalTypeProcessStep', 'updateProposalProcessStep',
        'updateProposalTypeProcessSteps', 'deleteProposalTypes', 'deleteProposalTypeProcessStepById', 'deleteProposalProcessByIds', 'updateProposalTypeExpiryDuration', 'getProposalTypeExpirationDuration',
        'updatePlayerLevel', 'createPlayerLevel', 'createPartnerLevel', 'partnerLevel/update', 'createPlatformAnnouncement',
        'updatePlatformAnnouncement', 'deletePlatformAnnouncementByIds', 'updatePartnerLevelConfig',
        'createMessageTemplate', 'deleteMessageTemplateByIds', 'updateMessageTemplate',
        'addPlatformBankCardGroup', 'addPlayersToBankCardGroup', 'updatePlatformBankCardGroup', 'setPlatformDefaultBankCardGroup', 'syncBankCardGroupData',
        'deleteBankCardGroup',
        'addPlatformMerchantGroup', 'addPlayersToMerchantGroup', 'renamePlatformMerchantGroup', 'updatePlatformMerchantGroup', 'setPlatformDefaultMerchantGroup',
        'deleteMerchantGroup', 'addPlatformAlipayGroup',
        'renamePlatformAlipayGroup', 'setPlatformDefaultAlipayGroup', 'getPlayerForAttachGroup', 'addPlayersToAlipayGroup',
        'deleteAlipayGroup', 'updateGameProvider', 'startProviderDailySettlement', 'delayManualTopupRequest', 'createPartnerCommissionConfig', 'updatePartnerCommissionLevel', 'getPartnerCommissionConfig',
        'applyPartnerBonusRequest', 'addPlatformWechatPayGroup',
        'getPlatformQuickPayGroup','addPlatformQuickpayGroup','renamePlatformQuickpayGroup', 'setPlatformDefaultQuickpayGroup', 'getPlayerForAttachGroup', 'addPlayersToQuickpayGroup',
        'deleteQuickpayGroup','addPlayersToQuickpayGroup','addAllPlayersToQuickpayGroup'
    ],

    publicActions: {

        // common public actions
        'getAllRolesforAdmin': true,
        'getAllGameStatus': true,
        'playerLogin': true,
        'getPlayerLvlPeriodConst': true,
        'getAllPaymentChannels': true,
        'sendPlayerMailFromAdminToPlayer': true,
        'getAdminMailList': true,
        'getAllTopUpType': true,
        'getDepositMethodList': true,
        'getAllSettlementPeriod': true,
        'getIncludedAlipayByAlipayGroup': true,
        'getExcludedAlipayByAlipayGroup': true,
        'getIncludedWechatsByWechatPayGroup': true,
        'getExcludedWechatsByWechatPayGroup': true,
        'getPlatformByAdminId': true,
        'getPlayerStatusList': true,
        'getZoneList': true,
        'getDepartment': true,
        'getZone': true,
        'getAPIServerStatus': true,
        "updatePlatformAlipayGroup": true,
        "getSMSChannelList": true,
        'getAllProposalStatus': true,
        'getProposalUserTypeList': true,
        'getProposalPriorityList': true,
        'getProposalEntryTypeList': true,
        "updateAdmin": true,   //for updating admin password
        "countLoginPlayerbyPlatformWeek": true,
        "getTopUpTotalAmountForAllPlatform": true,
        "getPlayerConsumptionSumForAllPlatform": true,
        "getPlayerConsumptionDaySummarySumForAllPlatform": true,
        "countNewPlayers": true,
        "getBankTypeList": true,
        "getAllRewardTypes": true,
        "getLoggedInPlayersCount": true,
        "getLoggedInPlayers": true,
        "getAllAdminActions": true,
        "getProvinceList": true,
        "getCityList": true,
        "getDistrictList": true,
        "getProvince": true,
        "getCity": true,
        "getDistrict": true,
        "getClientSourceQuery": true,
        "getClientSourcePara": true,
        'verifyPlayerPhoneNumber': true,
        'vm.verifyPlayerBankAccount': true,
        'getPlatformProposal': true,
        'getApprovalProposalsForAdminId': true,
        'getRewardTypesConfig': true,
        'getPlayerConsumptionReturn': true,
        'getPagePlayerByAdvanceQuery': true,
        'getQueryProposalsForAdminId': true,
        "getOnePlayerInfo": true,
        "getManualTopupRequestList": true,
        "queryBonusProposal": true,
        "getPagePlayerByAdvanceQueryWithTopupTimes": true,
        "getPagePlayerTopUpRecords": true,
        "getPlayerReferrals": true,
        "lockProposalById": true,
        "unlockProposalById": true,
        "getConsumeRebateAmount": true,
        "manualPlatformPartnerCommissionSettlement": true,
        "getPaymentInfoHistory": true,
        "getPlayerLevelByPlatformId": true,
        "getPlayerTrustLevelByPlatformId": true,
        "countActivePlayerALLPlatform": true,
        "cancelProposal": true,
        "playerTopUp": true,
        'applyRewardEvent': true,
        'getPlayerCurRewardTaskDetailByPlayerId': true,
        'getIncludedQuickPaysByQuickPayGroup': true,
        'getExcludedQuickPaysByQuickPayGroup': true,
        "updatePlatformQuickPayGroup": true,
        "getMerchantList": true,
        "getBonusRequestList": true,
        "getYesterdaySGTime": true,
        "getLastMonthSGTime": true,
        "getLastMonthConsumptionReturnSGTime": true,

        // API Actions - can be ignored
        'createApiUser': true,
        'deleteApiUser': true,
        'checkPlayerPasswordMatch': true,
        'transferPlayerCreditToProvider': true,
        'transferPlayerCreditFromProvider': true,
        'applyForGameProviderReward': true,
        'sendPlayerMailFromPlayerToAdmin': true,
        'sendPlayerMailFromPlayerToPlayer': true,
        'sendPlayerMailFromAdminToAllPlayers': true,
        'playerLogout': true,
        'getMailList': true,

        // This block can be removed in future - actions on test purpose
        'createPlayerTopUpIntentRecord': true,
        'updatePlayerTopUpIntentRecord': true,
        'getPlayerTopUpIntentRecord': true,
        'getPlayerTopUpIntentRecordStatusList': true,
        'getPlayerRegistrationIntentRecord': true,
        'deletePlayerRegistrationIntentRecord': true,
        'createPlayerRegistrationIntentRecord': true,
        'updatePlayerRegistrationIntentRecord': true,
        'getPlayerTopUpIntentRecordByPlatform': true,
        'getPlayerRegistrationIntentRecordByPlatform': true,

        "createGameProvider": true,
        "deleteGameProvider": true,

        "getGameTypeList": true,

        //todo::to be added to permission list
        "countTopUpORConsumptionbyPlatform": true,
        "getPlayerRetention": true,
        "getAllActions": true,
        "getAdminInfo": true,
        "updateProposalTypeExpiryDuration": true
    },

    /**
     * all views
     *
     * This will created later as a clone of linkedViews, but with all arrays replaced by true
     */
    views: null,

    linkedViews: {
        Dashboard: {
            Platform: {
                Read: ['countLoginPlayerbyPlatformWeek', 'getTopUpTotalAmountForAllPlatform',  'getPlayerConsumptionSumForAllPlatform', 'getBonusRequestList', 'countNewPlayers']
            },
            Operation: {
                Read: ['getAllPlatformAvailableProposalsForAdminId', 'getAllRewardProposal']

            },
            Statistics: {
                Read: ['countLoginPlayerAllPlatform', 'countTopUpORConsumptionAllPlatform', 'countNewPlayerAllPlatform']
            }
        },
        Admin: {
            Department: {
                Read: ['getDepartmentTreeById', 'getDepartmentTreeByIdWithUser', 'getAllDepartments', 'getAllRolesforAdmin', 'getUnAttachDepartments', 'getPotentialChildren'],
                Create: ['createDepartment', 'createDepartmentWithParent'],
                Delete: ['deleteDepartmentsById'],
                Move: ['updateDepartmentParent', 'removeChildrenById', 'addChildrenById'],
                Update: ['updateAdminDepartment', 'updateDepartment']
            },
            User: {
                Read: ['getAdminInfo', 'getAllAdminInfo', 'getFullAdminInfo', 'getFullAdminInfos', 'getAdminActionLog'],
                Create: ['createAdmin', 'createAdminForDepartment'],
                Delete: ['deleteAdminInfosById'],
                Move: ['addUsersToDepartmentsById', 'removeUsersFromDepartmentsById', 'getUnAttachedUsersForDepartment'],
                Update: [],
                ResetPassword: ['resetAdminPassword'],
                AttachRole: ['getUnAttachedDepartmentsforAdmin', 'getUnAttachedDepartmentRolesForAdmin', 'attachRolesToUsersById', 'getUnAttachUsers', 'attachRoleToUserByName'],
                DetachRole: ['getAttachedDepartmentRolesforAdmin', 'detachRolesFromDepartmentsById', 'detachRolesFromUsersById', 'detachRoleFromUserByName'],
                ViewLog: ['getAdminActionLog']
            },
            Role: {
                Read: ['getAttachedRolesforAdmin', 'getAllViews', 'getUnAttachedRolesforAdmin', 'getAllRolesForAdmin', 'getRole', 'getAllRole', 'getAttachedRolesForDepartment', 'getUnAttachedRolesForDepartment'],
                Create: ['createRole', 'createRoleForDepartment', 'attachRolesToDepartmentsById'],
                Delete: ['deleteRolesById'],
                Update: ['updateRole']
            },
            Platform: {
                Read: ['getPlatform', 'getAllPlatforms'],
                Move: ['addPlatformsToDepartmentById', 'removePlatformsFromDepartmentById'],
                Create: ['createPlatform'],
                Edit: ['updatePlatform'],
                Delete: ['deletePlatformById']
            },
            PlayerMail: {
                Read: []
            }
        },
        Platform: {
            "Platform": {
                Read: ['getAllPlatforms', 'getPlatform', 'getDepartmentsByPlatformId', 'getPlatformAnnouncementsByPlatformId', 'getPlatformAnnouncementById', 'getAllGameTypes', 'getPlayerLvlPeriodConst', 'getAllGameStatus', 'getAllMessageTypes', 'syncPlatform',
                    'getPlatformBankCardGroup', 'getPlatformMerchantGroup', 'getPlatformAlipayGroup'],
                Create: ['createPlatform', 'getDepartmentTreeById'],
                Delete: ['deletePlatformById'],
                Edit: ['updatePlatform'],
                DailySettlement: ['startPlatformDailySettlement', 'getPlatformConsumptionReturnDetail', 'fixPlatformDailySettlement'],
                WeeklySettlement: ['startPlatformWeeklySettlement', 'getPlatformConsumptionReturnDetail', 'fixPlatformWeeklySettlement'],
                RewardSettlement: ['startPlatformRewardEventSettlement'],
                SettlementHistory: ['getSettlementHistory'],
                PartnerCommissionSettlement: ['startPlatformPartnerCommissionSettlement'],
                transferPlayerCreditFromProvider: ['transferAllPlayersCreditFromProvider'],
                PlayerConsumptionIncentiveSettlement: ['startPlatformPlayerConsumptionIncentiveSettlement'],
                PlayerConsumptionReturnSettlement: ['startPlatformPlayerConsumptionReturnSettlement', 'getYesterdayConsumptionReturnSGTime'],
                PlayerLevelSettlement: ['startPlatformPlayerLevelSettlement'],
                PlayerConsecutiveConsumptionSettlement: ['startPlayerConsecutiveConsumptionSettlement']
            },
            "Player": {
                Read: ['getPlayersByPlatform', 'getPlayerInfo', 'getPlayerCreditChangeLogs', 'getPlayerTrustLevelList', "getDepartmentTreeById",
                    'getPlayersCountByPlatform', 'getPlatform', 'getPlayerStatusChangeLog', 'getPlayerForAttachGroup',
                    'getIpHistory', 'getPlayerTrustLevelByPlatformId', 'getPlayerLevelByPlatformId', 'getSimilarPlayers', 'getPlayerCreditInProvider', "getAdminInfo", 'getUpdateCredibilityLog'],
                AdvancedSearch: ['getPlayerByAdvanceQuery'],
                Create: ['createPlayer', 'checkPlayerNameValidity'],
                CreateTrial: ['createTestPlayerForPlatform'],
                // Delete: ['deletePlayersById'],
                ForbidTopupTypes: [],
                AddFeedback: [],
                FeedbackHistory: [],
                Edit: ['createUpdatePlayerInfoProposal', 'updatePlayer', 'updatePlayerStatus', 'checkPlayerNameValidity', 'updatePlayerReferral'],
                EditContact: ['createUpdatePlayerEmailProposal', 'createUpdatePlayerPhoneProposal', 'createUpdatePlayerQQProposal'],
                PaymentInformation: ['updatePlayerPayment', 'createUpdatePlayerBankInfoProposal', 'verifyPlayerBankAccount'],
                PaymentInformationHistory: ['getPaymentHistory'],
                ResetPassword: ['resetPlayerPassword'],
                ApplyManualTopup: ['applyManualTopUpRequest', 'cancelManualTopupRequest'],
                ApplyAlipayTopup: ['getAlipayTopUpRequestList', 'applyAlipayTopUpRequest', 'cancelAlipayTopup'],
                ApplyWechatPayTopup: ['getWechatPayTopUpRequestList', 'applyWechatPayTopUpRequest', 'cancelWechatPayTopup'],
                ApplyQuickpayTopup: ['getQuickpayTopUpRequestList', 'applyQuickpayTopUpRequest', 'cancelQuickpayTopup'],
                TopupRecord: ['getPlayerTopUpRecords'],
                applyBonus: ['applyBonusRequest'],
                BonusHistory: [],
                CreditAdjustment: ['createUpdatePlayerCreditProposal'],
                CreditChangeLog: ['getPlayerCreditChangeLogsByQuery', 'getPagedPlayerCreditChangeLogs'],
                PlayerExpenses: ['getPlayerConsumptionRecords', 'getPlayerTotalConsumptionForTimeFrame', 'playerPurchase'],
                AddRewardTask: ['createPlayerRewardTask'],
                applyReward: ['applyPreviousConsecutiveLoginReward'],
                RewardHistory: ['queryRewardProposal', 'getPlatformRewardProposal'],
                PlayerPermission: ['updatePlayerPermission'],
                CallPlayer: [],
                PermissionHistory: ['getPlayerPermissionLog'],
                mailLog: ['searchMailLog'],
                smsLog: ['searchSMSLog'],
                sendSMS: ['sendSMSToPlayer'],
                RepairPayment: ['getPlayerPendingPaymentProposal', 'submitRepairPaymentProposal'],
                RepairTransaction: ['getPlayerTransferErrorLogs', 'getPagedPlayerCreditChangeLogs'],
                ConsumptionReturnFix: ['createReturnFixProposal'],
                ManualUnlockRewardTask: ['manualUnlockRewardTask'],
                PlatformCreditTransferLog: ['getPagedPlatformCreditTransferLog', 'getAllPlayerCreditTransferStatus'],
                NewPlayerList:['getQueryProposalsForAdminId'],
                ModifyGamePassword: ['modifyGamePassword'],
                ClearProposalLimit: ['requestClearProposalLimit'],
                TriggerAutoProposal: ['triggerAutoProposal'],
                TriggerSavePlayersCredit: ['triggerSavePlayersCredit'],
                playerDailyCreditLog :['playerCreditDailyLog'],
                playerApiLog: ['getPlayerApiLog'],
                rewardTaskLog: ['getPlayerRewardTask'],
                UpdatePlayerCredibility: ['updatePlayerCredibilityRemark']
            },
            "Feedback": {
                Read: ['getPlayerFeedbacks', 'getPlayerFeedbackResults', 'getPlayerLastNFeedbackRecord', 'getAllPlayerFeedbacks'],
                Create: ['createPlayerFeedback']
            },
            "FeedbackQuery": {
                Read: ['getPlayerFeedbackQuery', 'getPlayerFeedbackResults', 'getAllPlayerFeedbacks']
            },
            "Partner": {
                Read: ['getPartnersByPlatform', 'partnerLevel/getByPlatform', 'getPartnersPlayerInfo', 'getPartner', 'getChildrenPartner', 'getAllPartner', 'getPartnerActivePlayers',
                    'getPartnerValidPlayers', 'getPartnerReferralPlayers', 'getPartnerActivePlayersForPastWeek', 'getAllGameProviders', 'getPartnerIPHistory'],
                AdvancedSearch: ['getPartnersByAdvancedQuery'],
                Create: ['createPartnerWithParent', 'createPartner', 'createPlayerLoginRecord'],
                Delete: ['deletePartnersById', 'deletePlayerLoginRecord'],
                Edit: ['updatePartner', 'checkPartnerFieldValidity', 'checkOwnDomainValidity', 'createUpdatePartnerInfoProposal'],
                EditContact: ['createUpdatePartnerPhoneProposal', 'createUpdatePartnerEmailProposal'],
                BankDetail: ['createUpdatePartnerBankInfoProposal', 'verifyPlayerBankAccount'],
                ResetPassword: ['resetPartnerPassword'],
                ApplyBonus: ['applyPartnerBonusRequest'],
                PartnerPermission: ['updatePartnerPermission'],
                CreditAdjustment: ['createUpdatePartnerCreditProposal']
            },
            "Game": {
                Read: ['getAllGameProviders', 'getGamesByPlatformAndProvider', 'getGamesNotAttachedToPlatform'],
                // AttachProvider: ['addProviderToPlatformById'],
                EditAttachedProvider: ['renameProviderInPlatformById', 'updateProviderFromPlatformById'],
                // DetachProvider: ['removeProviderFromPlatformById'],
                AttachGame: ['attachGameToPlatform', 'attachGamesToPlatform'],
                DetachGame: ['detachGameFromPlatform', 'updateGameStatusToPlatform', 'detachGamesFromPlatform'],
                // MAINTENANCE: [],
                EnableGame: [],
                MaintainGame: ['updateGameStatusToPlatform'],
                DisableGame: ['updateGameStatusToPlatform'],
                // MaintenanceTime: ['updateGameStatusToPlatform']
            },
            "GameGroup": {
                Read: ['getPlatformGameGroup', 'getGamesByPlatformAndGameGroup', 'getGamesNotInGameGroup'],
                Create: ['addPlatformGameGroup'],
                Move: ['updateGameGroupParent'],
                Update: ['renamePlatformGameGroup', 'updatePlatformGameGroup'],
                Delete: ['deleteGameGroup'],
                RemoveGameFromGroup: ['updatePlatformGameGroup'],
                AddGameToGroup: ['updatePlatformGameGroup'],
            },
            // "PaymentChannel": {
            //     Read: ['getAllPaymentChannel'],
            //     AttachChannel: ['addPaymentToPlatformById'],
            //     DetachChannel: ['removePaymentFromPlatformById']
            // },
            "Reward": {
                Read: ['getRewardRuleById', 'getPlayerCurRewardTask', 'getRewardEventsForPlatform', 'getRewardEventById', 'getAllRewardRule', 'getPlayerAllRewardTask', 'getPlayerAllRewardTaskDetailByPlayerObjId'],
                Add: ['createRewardRuleWithType', 'createRewardCondition', 'createRewardEvent'],
                Delete: ['deleteRewardRuleByIds', 'deleteRewardEventByIds'],
                Update: ['updateRewardRule', 'updateRewardTask', 'updateRewardEvent'],
            },
            "Proposal": {
                Create: ['createProposalTypeProcess', 'addStepToProposalTypeProcess', 'createProposal', 'createProposalType', 'createProposalTypeProcessStep'],
                Read: ['getAllProposalType', 'getProposalType', 'getProposalTypeByPlatformId', 'getProposalTypeByType', 'getAllProposalExecutionType', 'getAllProposalRejectionType', 'getProposalTypeProcess',
                    'getProposalTypeProcessSteps', 'getFullProposalProcess', 'getProposal', "getAdminInfo", 'getProposalTypeExpirationDuration'],
                Update: ['updateProposalType', 'updateProposalTypeProcessStep', 'updateProposalProcessStep', 'updateProposalTypeProcessSteps'],
                Delete: ['deleteProposalTypes', 'deleteProposalTypeProcessStepById', 'deleteProposalProcessByIds']
            },
            "Config": {
                Read: ['getPlayerLevelByPlatformId', 'getPlayerTrustLevelByPlatformId', 'getPartnerLevelConfig', 'getPlatformAnnouncements'],
                PlayerLevelRead: ['getPlayerLevelByPlatformId'],
                PlayerLevelUpdate: ['updatePlayerLevel'],
                PlayerLevelCreate: ['createPlayerLevel'],
                PartnerLevelCreate: ['createPartnerLevel'],
                PartnerLevelUpdate: ['partnerLevel/update'],
                // PlatformAnnouncementCreate: ['createPlatformAnnouncement'],
                // PlatformAnnouncementRead: ['getPlatformAnnouncements'],
                // PlatformAnnouncementUpdate: ['updatePlatformAnnouncement'],
                // PlatformAnnouncementDelete: ['deletePlatformAnnouncementByIds'],
                // Trust: ['getPlayerTrustLevelByPlatformId'],
                ValidActiveRead: ['getPartnerLevelConfig'],
                ValidActiveUpdate: ['updatePartnerLevelConfig'],
                PartnerCommission: ['createPartnerCommissionConfig', 'updatePartnerCommissionLevel', 'getPartnerCommissionConfig'],
                platformBasic: [],
                autoApproval: ['updateAutoApprovalConfig'],
                Monitor: [],
                PlayerValue: ['updatePlayerValueConfig','updatePlayerLevelScores'],
                Credibility: ['updateCredibilityRemarksInBulk']
            },
            "Announcement": {
                PlatformAnnouncementCreate: ['createPlatformAnnouncement'],
                PlatformAnnouncementRead: ['getPlatformAnnouncements'],
                PlatformAnnouncementUpdate: ['updatePlatformAnnouncement'],
                PlatformAnnouncementDelete: ['deletePlatformAnnouncementByIds'],
            },
            "MessageTemplate": {
                Read: ['getMessageTemplateById', 'getMessageTemplatesForPlatform', 'getAllMessageTypes'],
                Create: ['createMessageTemplate'],
                Delete: ['deleteMessageTemplateByIds'],
                Update: ['updateMessageTemplate']
            },
            "groupMessage": {
                Read: ['sendSMStoNumber'],
                SMSSendLog: ['searchSMSLog'],
                SendGroupMessage: []
            },
            "vertificationSMS": {
                Read: ['vertificationSMSQuery']
            },
            "promoCode": {
                Read: ['getPromoCodeTypes', 'getPromoCodeUserGroup'],
                createPromoCode: ['generatePromoCode'],
                promoCodeHistory: ['getPromoCodesHistory'],
                sendSMS: [],
                monitor: [],
                smsContentConfig: [],
                userGroupConfig: [],
                activatePromoCode: [],
                applyPromoCode: [],
                promoCodeAnalysis: ['getPromoCodeTypeByObjId']
            },
            "RegistrationUrlConfig": {
                Read: ['getAllOfficer', 'getAllPromoteWay', 'getAllUrl', 'getAdminNameByDepartment'],
                Create: ['createOfficer', 'addPromoteWay', 'addUrl'],
                Delete: ['deletePromoteWay', 'deleteOfficer', 'deleteUrl'],
                Update: ['updateUrl']
            }
        },
        Payment: {
            "BankCardGroup": {
                Read: ['getPlatformBankCardGroup', 'getIncludedBankCardByBankCardGroup', 'getExcludedBankCardByBankCardGroup'],
                Create: ['addPlatformBankCardGroup', 'addPlayersToBankCardGroup'],
                Update: ['updatePlatformBankCardGroup', 'setPlatformDefaultBankCardGroup', 'syncBankCardGroupData'],
                Delete: ['deleteBankCardGroup'],
                AddPlayer: ['addPlayersToBankCardGroup'],
                AddAllPlayer: ['addAllPlayersToBankCardGroup']
            },
            "MerchantGroup": {
                Read: ['getPlatformMerchantGroup', 'getMerchantTypeList', 'getIncludedMerchantByMerchantGroup', 'getExcludedMerchantByMerchantGroup'],
                Create: ['addPlatformMerchantGroup', 'addPlayersToMerchantGroup'],
                Update: ['renamePlatformMerchantGroup', 'updatePlatformMerchantGroup', 'setPlatformDefaultMerchantGroup'],
                Delete: ['deleteMerchantGroup'],
                AddPlayer: ['addPlayersToMerchantGroup'],
                AddAllPlayer: ['addAllPlayersToMerchantGroup']
            },
            "AlipayGroup": {
                Read: ['getPlatformAliPayGroup'],
                Create: ['addPlatformAlipayGroup'],
                Update: ['renamePlatformAlipayGroup', 'setPlatformDefaultAlipayGroup', 'getPlayerForAttachGroup', 'addPlayersToAlipayGroup'],
                Delete: ["deleteAlipayGroup"],
                AddPlayer: ['addPlayersToAlipayGroup'],
                AddAllPlayer: ['addAllPlayersToAlipayGroup']
            },
            "WechatPayGroup": {
                Read: ['getPlatformWechatPayGroup'],
                Create: ['addPlatformWechatPayGroup'],
                Update: ['renamePlatformWechatPayGroup', 'setPlatformDefaultWechatPayGroup', 'addPlayersToWechatPayGroup'],
                Delete: ["deleteWechatPayGroup"],
                AddPlayer: ['addPlayersToWechatPayGroup'],
                AddAllPlayer: ['addAllPlayersToWechatPayGroup']
            },
            "QuickPayGroup": {
                Read: ['getPlatformQuickPayGroup'],
                Create: ['addPlatformQuickpayGroup'],
                Update: ['renamePlatformQuickpayGroup', 'setPlatformDefaultQuickpayGroup', 'getPlayerForAttachGroup', 'addPlayersToQuickpayGroup'],
                Delete: ['deleteQuickpayGroup'],
                AddPlayer: ['addPlayersToQuickpayGroup'],
                AddAllPlayer: ['addAllPlayersToQuickpayGroup']
            }
        },
        Provider: {
            "Provider": {
                Read: ['getAllGameProviders', 'getGameProvider', 'getGameProviderPlayerCredit', 'getAllGameTypes', 'getAllProviderStatus', 'getCPMSAPIStatus'],
                //Create: ['createGameProvider'],
                Update: ['updateGameProvider'],
                //Delete: ['removeProviderFromPlatformById','deleteGameProvider'],
                GameTypeRead: [],
                // GameTypeUpdate: ['updateGameType'],
                // GameTypeCreate: ['addGameType'],
                // GameTypeDelete: ['deleteGameTypeByName'],
                Settle: ['startProviderDailySettlement', 'manualDailyProviderSettlement'],
                Expense: ['getPagedGameProviderConsumptionRecord'],
                monitor: []
            },
            "Game": {
                Read: ['getGamesByProviderId', 'getGame', 'getGames', 'getGamesByProviders'],
                // Create: ['createGameAndAddToProvider', 'createGame'],
                Update: ['updateGame'],
                // Delete: ['deleteGameById'],
                Expense: ['getPagedGameConsumptionRecord']
            }
        },
        Operation: {
            Proposal: {
                Read: ['getProposalTypeByPlatformId', "getFullProposalProcess", 'getQueryApprovalProposalsForAdminId', "getQueryProposalsForAdminId"],
                ProposalListRead: ['getAvailableProposalsForAdminId'],
                ProposalListDetail: ['getAvailableProposalsForAdminId'],
                ApproveProposal: ["updateProposalProcessStep"],
                RejectProposal: ["updateProposalProcessStep"],
                RepairPayment: ['getPlayerPendingPaymentProposal', 'submitRepairPaymentProposal'],
                // TopupIntentionRead: ['getPlayerTopUpIntentRecordByPlatform', 'getPlayerTopUpIntentRecordStatusList'],
                // TopupIntentionDetail: ['getPlayerTopUpIntentRecordByPlatform'],
                // NewAccountListRead: ['getPlayerRegistrationIntentRecordByPlatform'],
                // NewAccountListDetail: ['getPlayerRegistrationIntentRecordByPlatform'],
                delayManualTopupRequest: ['delayManualTopupRequest'],
                queryByProposalId: [],
                queryByProposalType: [],
                queryByProposalStatus: [],
                queryByProposalCredit: [],
                queryByProposalPlayer: [],
                queryByProposalDate: [],
                updatePlayerBonusStatus: ['setBonusProposalStatus']
            },
            Player: {
                Read: ['getCurrentActivePlayersCount', 'getActivePlayers'],
                smsPlayer: ['sendSMSToPlayer'],
                CallPlayer: ['getPlayerPhoneNumber']
            }
        },
        Analysis: {
            "Analysis": {
                Read: [],
                Location: ['getPlayerLoginLocation', 'getPlayerLoginLocationInCountry', 'getPlayerPhoneLocation', 'getPlayerPhoneLocationInProvince'],
                Login: ['countLoginPlayerbyPlatform'],
                Reward: ['getPlatformRewardAnalysis'],
                Device: ['getPlayerDeviceAnalysisData'],
                Consumption: ['getPlayerConsumptionSumForAllPlatform'],
                TopUp: ['getTopUpTotalAmountForAllPlatform'],
                NewPlayer: ['countNewPlayerbyPlatform', 'countNewPlayers'],
                ActivePlayer: ['countActivePlayerbyPlatform', 'countActivePlayerALLPlatform'],
                PlayerRetention: ['getPlayerRetention'],
                Bonus: ['getAnalysisBonusRequestList','getAnalysisSingleBonusRequestList'],
                ApiResponseTime: ['getApiLoggerAllServiceName', 'getApiLoggerAllFunctionNameOfService', 'getApiResponseTimeQuery'],
                ConsumptionInterval: ['getConsumptionIntervalData'],
                ClientSource: [],

            }
        },
        Report: {
            General: {
                Read: ['getPlatform', 'getProposalTypeByPlatformId'],
                TOPUP_REPORT: ['topupReport'],
                PROPOSAL_REPORT: ['getProposalStaticsReport'],
                PROVIDER_REPORT: ['operationReport', 'operationSummaryReport'],
                PLAYER_EXPENSE_REPORT: ['getPlayerProviderReport', 'getProviderGamePlayerReport', 'getProviderGameReport', 'getPlayerProviderByGameReport', 'manualDailyProviderSettlement'],
                PLAYER_REPORT: ['getPlayerReport', 'manualDailyProviderSettlement'],
                NEWACCOUNT_REPORT: ['getPlayerDomainAnalysisData', 'getNewAccountReportData'],
                DX_NEWACCOUNT_REPORT: ['getDXNewPlayerReport', 'getAllPromoteWay', 'getDepartmentDetailsByPlatformObjId'],
                PLAYERPARTNER_REPORT: ['getPartnerPlayers', 'getPartnerSummaryReport', 'getPartnerPlayerBonusReport'],
                PARTNERPLAYERBOUNS_REPORT: ['getPartnerPlayerBonusReport'],
                PARTNERCOMMISSION_REPORT: ['getPartnerCommissionReport'],
                PLAYERDOMAIN_REPORT: ['getPlayerDomainReport'],
                WINRATE_REPORT: ['winRateReport']
            },
            Reward: {
                Read: ['getPlatformRewardPageReport', 'getRewardProposalReportByType'],
                // PlayerConsumption: ['getPlayerConsumptionReturn'],
                // FullAttendance: ['getFullAttendanceProposalReport'],
                // FirstTopUp: ['getPlayerFirstTopUpReturn'],
                // Provider: ['getPlatformRewardReport'],
                // Transaction: ['getTransactionProposalReport'],
                // PartnerConsumption: ['getPartnerConsumptionReturn'],
                // PartnerIncentive: ['getPartnerIncentiveReward'],
                // PartnerReferral: ['getPartnerReferralReward'],
                // PlayerTopUpReturn: ['getPlayerTopUpReturn'],
                // PlayerConsumptionReturn: ['getPlayerConsumptionIncentiveReturn']
            },
            Miscellaneous: {
                Read: [],
                PLAYER_FEEDBACK_REPORT: ['getPlayerFeedbackReport', 'getAllFeedbackResultList'],
                CREDIT_CHANGE_REPORT: ['queryCreditChangeLog'],
                PLAYER_ALMOST_LEVELUP_REPORT: ['getPlayerAlmostLevelupReport'],
                ACTIONLOG_REPORT: ['getActionLogPageReport'],
                ONLINE_PAYMENT_MISMATCH_REPORT: ['getMismatchReport'],
                LIMITED_OFFER_REPORT: ['getLimitedOfferReport']
            }
        },
        Monitor: {
            Payment:{
                Read: ['getPaymentMonitorResult']
            }
        }
    },

    /**
     * This will be a reversed, single level version of linkedViews, allowing quick lookup by action name.
     *
     * For example, this shows that the action 'getAllAdminInfo' can be called by a user who has either read access or
     * update access on Admin.Department.
     *
     *   {
     *
     *     ...
     *
     *     getAllAdminInfo: {
     *       'Admin.Department.Read': true,
     *       'Admin.Department.Update': true
     *     },
     *
     *     ...
     *
     *   }
     */
    accessControlListsByAction: null,

    /**
     * Get all actions based on socket action class module
     * Be careful not to call thisfunction too early, the module's actions don't get initialised until after the socket has connected!
     */
    /*
     getAllPotentialSocketActions: function () {
     var allSockets = {
     "admin": require('./../socketActionModule/socketActionAdmin').actions,
     "department": require('./../socketActionModule/socketActionDepartment').actions,
     "role": require('./../socketActionModule/socketActionRole').actions,
     "platform": require('./../socketActionModule/socketActionPlatform').actions,
     "partnerLevel": commonAPIs.partnerLevel,
     "game": require('./../socketActionModule/socketActionGame').actions,
     "gameProvider": require('./../socketActionModule/socketActionGameProvider').actions,
     "gameStatus": require('./../socketActionModule/socketActionPlatformGameStatus').actions,
     "player": require('./../socketActionModule/socketActionPlayer').actions,
     "proposalOperation": require('./../socketActionModule/socketActionProposal').actions,
     "proposalWorkFlow": require('./../socketActionModule/socketActionProposalType').actions,
     "report": require('./../socketActionModule/socketActionReport').actions,
     "rewardRule": require('./../socketActionModule/socketActionRewardRule').actions,
     "rewardType": require('./../socketActionModule/socketActionRewardType').actions,
     "rewardEvent": require('./../socketActionModule/socketActionRewardEvent').actions,
     "rewardTask": require('./../socketActionModule/socketActionRewardTask').actions
     };

     var allActions = {};
     for (var key in allSockets) {
     allActions[key] = {};
     for (var action in allSockets[key]) {
     allActions[key][action] = action;
     }
     }
     return allActions;
     },
     */

    getSocketActions: function () {
        return roleChecker.accessControlListsByAction;
    },

    /**
     * Get category for socket action
     */
    /*
     getSocketActionCategory: function (actionName) {
     var actionData = roleChecker.getAllPotentialSocketActions();
     for (var key in actionData) {
     if (actionData[key][actionName]) {
     return key;
     }
     }
     return null;
     },
     */

    /**
     * Check if socket actions are allowed based on role data
     * @param {Socket} socket - The socket object
     * @param {String} socketAction - The socket action name
     */
    isValid: function (socket, socketAction) {
        return this.getAdminUserRoles(socket).then(
            function (roles) {
                if (roleChecker.publicActions[socketAction]) {
                    return true;
                }

                var aclForAction = roleChecker.accessControlListsByAction[socketAction];
                //console.log("[roleChecker.js] action: %s aclForAction:", socketAction, aclForAction);

                if (!aclForAction) {
                    // If there are no access rules for the requested action, then we should reject

                    // @todo We should return false here, once we have set up ACLs for all the actions

                    //console.warn("[roleChecker.js] Nobody can call action '%s' because it has no access rules!  (Except for superuser.)  Please add '%s' to roleChecker.linkedViews.", socketAction, socketAction);
                    //return false;

                    console.warn("[roleChecker.js] Everybody can call action '%s' because it has no access rules!  Please add '%s' to roleChecker.linkedViews or roleChecker.publicActions.", socketAction, socketAction);
                    return true;
                } else {
                    // Check to see if one of the ACL requirements is satisfied by one of the user's roles
                    for (var accessRule in aclForAction) {
                        var path = accessRule.split('.');
                        var category = path[0];
                        var section = path[1];
                        var permission = path[2];

                        //check roles actions data
                        for (var i = 0; i < roles.length; i++) {
                            //var actions = roles[i].actions;
                            var actions = roles[i].views;
                            if (!actions) {
                                continue;
                            }
                            //if actions is all, means has all permissions
                            if (actions["all"]) {
                                return true;
                            }

                            /*
                             //if action category is all means has all the permission for this category
                             var actionCategory = roleChecker.getSocketActionCategory(socketAction);
                             //if can't find category for the action, means this action doesn't need permission
                             if (!actionCategory) {
                             return true;
                             }
                             if (actions[actionCategory] && actions[actionCategory]["all"]) {
                             return true;
                             }
                             //check each action
                             for (var key in actions) {
                             if (actions[key] && actions[key][socketAction]) {
                             return true;
                             }
                             }
                             */

                            if (actions[category] && actions[category][section] && actions[category][section][permission]) {
                                //console.log("[roleChecker.js] Admin '%s' has permission to call action '%s' by rule: %s", socket.decoded_token && socket.decoded_token.adminName, socketAction, accessRule);
                                return true;
                            }
                        }
                    }

                    /* Do not warn when running tests, since this is expected */
                    if (typeof describe === 'undefined' && socket.decoded_token && socket.decoded_token.adminName === 'Test Admin') {
                        console.warn("[roleChecker.js] Rejecting request from admin '%s' to call action '%s'", socket.decoded_token && socket.decoded_token.adminName, socketAction);
                    }
                    return false;
                }
            }
        ).catch(
            function (err) {
                errorUtils.reportError(err);
                return false;
            }
        );
    },

    /**
     * Get adminUser's roles information
     * @param {Socket} socket - The socket object
     */
    getAdminUserRoles: function (socket) {
        var deferred = Q.defer();
        if (socket && socket.decoded_token && socket.decoded_token.adminName && socket.decoded_token._id) {
            var cachedRoles = memCache.get(socket.decoded_token.adminName);
            //TODO::always get data from db for now
            if (cachedRoles && false) {
                deferred.resolve(cachedRoles);
            } else {
                dbAdminInfo.getAllRolesForAdmin(socket.decoded_token._id).then(
                    function (roles) {
                        if (roles) {
                            //save role data to cache
                            memCache.put(socket.decoded_token.adminName, roles);
                            deferred.resolve(roles);
                        } else {
                            deferred.reject({name: "DBError", message: "Incorrect db data"});
                        }
                    },
                    function (err) {
                        deferred.reject(err);
                    }
                );
            }
        } else {
            deferred.reject({name: "DataError", message: "Incorrect socket data"});
        }
        return deferred.promise;
    }

};

function cloneWithoutArrays(obj) {
    const outObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const val = obj[key];
            const isArray = val instanceof Array;
            const isPlainObject = val.constructor.name === 'Object';
            const isBoolean = val === true || val === false;
            const outVal = isPlainObject ? cloneWithoutArrays(val)
                : isArray ? true
                    : isBoolean ? val
                        : undefined;
            if (outVal === undefined) {
                throw Error("Unexpected value in tree: " + val + "  Supported values are arrays, objects and booleans.");
            }
            outObj[key] = outVal;
        }
    }
    return outObj;
}

function flattenTree(obj) {
    const accessControlListsByAction = {};
    const path = [];

    traverse(obj, path);

    //console.log("accessControlListsByAction:", accessControlListsByAction);

    function traverse(obj, path) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const val = obj[key];
                const isArray = val instanceof Array;
                const isPlainObject = val.constructor.name === 'Object';
                const isBoolean = val === true || val === false;
                const fullPath = path.join('.') + '.' + key;
                if (isPlainObject) {
                    path.push(key);
                    traverse(val, path);
                    path.pop();
                } else if (isArray) {
                    const type = key;
                    //const outPath = path.slice(0);
                    const outPath = path.join('.');
                    val.forEach(function (actionName) {
                        if (!accessControlListsByAction[actionName]) {
                            accessControlListsByAction[actionName] = {};
                        }
                        accessControlListsByAction[actionName][fullPath] = true;
                    });
                } else if (isBoolean) {
                    console.warn("todo: Should be an array of allowed actions: roleChecker.linkedViews." + fullPath);
                } else {
                    throw Error("Unexpected value '" + val + "' at '" + fullPath + "' in tree.  Supported values are arrays, objects and booleans.");
                }
            }
        }
    }

    return accessControlListsByAction;
}

function checkForMissingACLs() {
    var allSocketActionModules = require('../serverAction/socketAllActions').allSocketActionModules;
    // console.log("allSocketActionModules", allSocketActionModules);
    allSocketActionModules.forEach(function (moduleFunc) {
        var moduleName = moduleFunc.name;

        var categoryName = moduleName.replace(/^socketAction/, '');
        var category = moduleFunc.actions;

        if (category == null) {
            /* Do not warn when running tests, since this is expected */
            if (typeof describe === 'undefined') {
                // console.warn('Cannot check ACLs: category for module %s was empty!  This can happen if no connection/listener has been established yet.', moduleName);
            }
        }

        for (var actionName in category) {
            if (!roleChecker.accessControlListsByAction[actionName] && !roleChecker.publicActions[actionName]) {
                console.warn("TODO: Please add action '%s' (from '%s' category), to roleChecker.linkedViews or roleChecker.publicActions, otherwise no client (or all clients) will be able to call it.", actionName, categoryName);
            }
        }
    });
}


// Initialisation:

roleChecker.views = cloneWithoutArrays(roleChecker.linkedViews);

roleChecker.accessControlListsByAction = flattenTree(roleChecker.linkedViews);

// Don't do this immediately.  getAllPotentialSocketActions doesn't work until after the DB has been connected!
setTimeout(checkForMissingACLs, 10000);


module.exports = roleChecker;
