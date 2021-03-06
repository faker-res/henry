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
        'updateAdmin', 'attachRolesToUsersById', 'createUpdatePartnerInfoProposal', 'createUpdatePartnerCommissionTypeProposal', 'attachRoleToUserByName', 'resetAdminPassword',
        'detachRolesFromUsersById', 'detachRoleFromUserByName',
        'createRole', 'createRoleForDepartment', 'attachRolesToDepartmentsById',
        'deleteRolesById', 'updateRole',
        'addPlatformsToDepartmentById', 'removePlatformsFromDepartmentById', 'updatePlatform', 'deletePlatformById',
        'createPlatform', 'startPlatformDailySettlement', 'startPlatformWeeklySettlement',
        'createPlayer', 'createTestPlayerForPlatform', 'deletePlayersById', 'createUpdatePlayerInfoProposal', 'updatePlayer', 'updatePlayerStatus',
        'createUpdatePlayerEmailProposal', 'createUpdatePlayerQQProposal','createUpdatePlayerWeChatProposal', 'createUpdatePlayerPhoneProposal', 'updatePlayerPayment', 'resetPlayerPassword',
        'applyManualTopUpRequest', 'applyBonusRequest', 'applyRewardEvent', 'createUpdatePlayerCreditProposal', 'updatePlayerPermission',
        'createPlayerFeedback',
        'createPartnerWithParent', 'createPartner', 'createPlayerLoginRecord', 'deletePartnersById', 'deletePlayerLoginRecord', 'updatePartner',
        'createUpdatePartnerPhoneProposal', 'createUpdatePartnerEmailProposal', 'createUpdatePartnerQQProposal', 'createUpdatePartnerWeChatProposal','createUpdatePartnerBankInfoProposal', 'resetPartnerPassword',
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
        'getPartnersByAdvancedQuery': true,
        'getQueryProposalsForAdminId': true,
        'getPlayerProposalsForAdminId': true,
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

        "getPlatformProviderGroup": true,
        "getPMSPaymentGroup": true,
        "getPMSUserPaymentGroup": true,
        "getPMSAlipayGroup": true,
        "getPMSMerchantGroup": true,
        "getPMSBankCardGroup": true,
        "getPMSWechatPayGroup": true,

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
        "getAllGameTypes": true,
        "getRewardEventsForPlatform": true,

        "getWinnerMonitorConfig": true,

        //todo::to be added to permission list
        "getCredibilityRemarks": true,
        "countConsumptionByPlatform": true,
        "countTopUpbyPlatform": true,
        "countTopUpCountbyPlatform": true,
        "getPlayerRetention": true,
        "getAllActions": true,
        "getAdminInfo": true,
        "updateProposalTypeExpiryDuration": true,
        "getRewardPeriodTime": true,
    },

    /**
     * all views
     *
     * This will created later as a clone of linkedViews, but with all arrays replaced by true
     */
    views: null,

    linkedViews: {
        Player: {
            "Player": {
                Read: ['getPlayersByPlatform', 'getPlayerInfo', 'getPlayerCreditChangeLogs', 'getPlayerTrustLevelList', "getDepartmentTreeById",
                    'getPlayersCountByPlatform', 'getPlatform', 'getPlayerStatusChangeLog', 'getPlayerForAttachGroup',
                    'getIpHistory', 'getPlayerTrustLevelByPlatformId', 'getPlayerLevelByPlatformId', 'getSimilarPlayers', 'getPlayerCreditInProvider', "getAdminInfo", 'getUpdateCredibilityLog', 'getPlayerTopUpGroupLog',
                    'getProviderLatestTimeRecord', 'checkTransferInSequence', 'getConsumptionRecordByGameProvider'],
                AdvancedSearch: ['getPlayerByAdvanceQuery'],
                Create: ['createPlayer', 'checkPlayerNameValidity'],
                CreateTrial: ['createTestPlayerForPlatform'],
                // Delete: ['deletePlayersById'],
                Edit: ['createUpdatePlayerInfoProposal', 'updatePlayer', 'updatePlayerStatus', 'checkPlayerNameValidity', 'updatePlayerReferral','createUpdateTopUpGroupLog'],
                EditContact: ['createUpdatePlayerEmailProposal', 'createUpdatePlayerPhoneProposal', 'createUpdatePlayerQQProposal','createUpdatePlayerWeChatProposal'],
                PaymentInformation: ['updatePlayerPayment', 'createUpdatePlayerBankInfoProposal', 'verifyPlayerBankAccount'],
                PaymentInformationHistory: ['getPaymentHistory'],
                ResetPassword: ['resetPlayerPassword'],
                PlayerExpenses: ['getPlayerConsumptionRecords', 'getPlayerTotalConsumptionForTimeFrame', 'playerPurchase'],
                PlayerPermission: ['updatePlayerPermission'],
                CallPlayer: ['getPlayerPhoneNumber'],
                PermissionHistory: ['getPlayerPermissionLog'],
                mailLog: ['searchMailLog'],
                smsLog: ['searchSMSLog'],
                sendSMS: ['sendSMSToPlayer'],
                RepairPayment: ['getPlayerPendingPaymentProposal', 'submitRepairPaymentProposal'],
                RepairTransaction: ['getPlayerTransferErrorLogs', 'getPagedPlayerCreditChangeLogs'],
                ConsumptionReturnFix: ['createReturnFixProposal'],
                ManualUnlockRewardTask: ['manualUnlockRewardTask'],
                PlatformCreditTransferLog: ['getPagedPlatformCreditTransferLog', 'getAllPlayerCreditTransferStatus'],
                NewPlayerList: ['getQueryProposalsForAdminId', 'getPlayerProposalsForAdminId'],
                ModifyGamePassword: ['modifyGamePassword'],
                PlayerApiLog: ['getPlayerActionLog'],
                TriggerAutoProposal: ['triggerAutoProposal'],
                playerApiLog: ['getPlayerApiLog'],
                UpdatePlayerCredibility: ['updatePlayerCredibilityRemark'],
                ClearPlayerState: ['resetPlayerState'],
                BindMultiplePaymentInformation: [],
                UnbindPhoneDeviceId: ['unbindPhoneDeviceId'],
            },
            "Reward": {
                AddRewardTask: ['createPlayerRewardTask'],
                applyReward: ['applyPreviousConsecutiveLoginReward'],
                RewardHistory: ['queryRewardProposal', 'getPlatformRewardProposal'],
                rewardTaskLog: ['getPlayerRewardTask'],
            },
            "RewardPoints": {
                RewardPointsChange: ['createPlayerRewardPointsRecord', 'updatePlayerRewardPointsRecord'],
                RewardPointsConvert: ['getPlayerRewardPointsConversionRate', 'getPlayerRewardPointsDailyLimit', 'getPlayerRewardPointsDailyConvertedPoints', 'convertRewardPointsToCredit'],
            },
            "Bonus": {
                applyBonus: ['applyBonusRequest'],
                BonusHistory: [],
            },
            "Feedback": {
                AddFeedback: [],
                FeedbackHistory: ['getPlayerFeedbackReport'],
                ModifyFeedbackResult: ['createPlayerFeedbackResult', 'deletePlayerFeedbackResult'],
                ModifyFeedbackTopic: ['createPlayerFeedbackTopic', 'deletePlayerFeedbackTopic'],
            },
            "Disable": {
                ForbidTopupTypes: [],
                ForbidRewards: [],
                ForbidProviders: [],
                ForbidRewardPointsEvent: [],
                ForbidPromoCode: [],
            },
            "TopUp": {
                ApplyManualTopup: ['applyManualTopUpRequest', 'cancelManualTopupRequest'],
                ApplyAlipayTopup: ['getAlipayTopUpRequestList', 'applyAlipayTopUpRequest', 'cancelAlipayTopup'],
                ApplyWechatPayTopup: ['getWechatPayTopUpRequestList', 'applyWechatPayTopUpRequest', 'cancelWechatPayTopup'],
                ApplyQuickpayTopup: ['getQuickpayTopUpRequestList', 'applyQuickpayTopUpRequest', 'cancelQuickpayTopup'],
                ApplyAssignTopup: ['applyAssignTopUpRequest', 'cancelAssignTopupRequest'],
                TopupRecord: ['getPlayerTopUpRecords'],
            },
            "Credit": {
                CreditAdjustment: ['createUpdatePlayerCreditProposal'],
                CreditChangeLog: ['getPlayerCreditChangeLogsByQuery', 'getPagedPlayerCreditChangeLogs'],
                playerDailyCreditLog :['playerCreditDailyLog'],
            },
            Proposal: {
                "Force Pairing": ['forcePairingWithReferenceNumber']
            }
        },
        Partner: {
            "Partner": {
                Read: ['getPartnersByPlatform', 'partnerLevel/getByPlatform', 'getPartnersPlayerInfo', 'getPartner', 'getChildrenPartner', 'getAllPartner', 'getPartnerActivePlayers',
                    'getPartnerValidPlayers', 'getPartnerReferralPlayers', 'getPartnerActivePlayersForPastWeek', 'getAllGameProviders', 'getPartnerIPHistory', 'getDuplicatePhoneNumber',
                    'getReferralsList', 'getDailyActivePlayerCount', 'getWeeklyActivePlayerCount', 'getMonthlyActivePlayerCount', 'getValidPlayersCount', 'getTotalChildrenDeposit',
                    'getTotalChildrenBalance', 'getAdminInfo'],
                AdvancedSearch: ['getPartnersByAdvancedQuery'],
                Create: ['createPartnerWithParent', 'createPartner', 'createPlayerLoginRecord'],
                Delete: ['deletePartnersById', 'deletePlayerLoginRecord'],
                Edit: ['updatePartner', 'checkPartnerFieldValidity', 'checkOwnDomainValidity', 'createUpdatePartnerInfoProposal'],
                EditContact: ['createUpdatePartnerPhoneProposal', 'createUpdatePartnerEmailProposal', 'createUpdatePartnerQQProposal','createUpdatePartnerWeChatProposal','verifyPartnerPhoneNumber'],
                BankDetail: ['createUpdatePartnerBankInfoProposal', 'verifyPartnerBankAccount'],
                EditChildPartner: ['updateChildPartner', 'checkChildPartnerNameValidity', 'getChildPartnerRecords'],
                EditCommission: ['updatePartner', 'checkPartnerFieldValidity', 'createUpdatePartnerCommissionTypeProposal', 'customizePartnerCommission'],
                ResetPassword: ['resetPartnerPassword'],
                ApplyBonus: ['applyPartnerBonusRequest'],
                PartnerPermission: ['updatePartnerPermission'],
                sendSMS: [],
                partnerApiLog: [],
                CreditAdjustment: ['createUpdatePartnerCreditProposal'],
                SettleCommission: ['getAllPartnerCommSettPreview'],
                PartnerCreditTransferToDownline: ['transferPartnerCreditToPlayer'],
                PermissionHistory: ['getPartnerPermissionLog'],
            },
            "Feedback": {
                AddFeedback: ['getAllPartnerFeedbackResults', 'getAllPartnerFeedbackTopics'],
                FeedbackHistory: ['getPartnerFeedbackReport'],
                ModifyFeedbackResult: ['createPartnerFeedbackResult', 'deletePartnerFeedbackResult'],
                ModifyFeedbackTopic: ['createPartnerFeedbackTopic', 'deletePartnerFeedbackTopic'],
            },
            "Config": {
                ValidActiveUpdate: [],
                PartnerBasic: [],
                AutoApproval: [],
                largeWithdrawalSetting: [],
                PartnerDisplay: [],
                PartnerAdvertisement: [],
                partnerPosterAds: [],
                emailNotificationConfig: ["updateNotifyEditPartnerCommissionSetting", "updateNotifyEditChildPartnerSetting"],
                commissionBillboard: ["getPartnerCommissionBillBoard"],
            },
            "Report": {
                PLAYERPARTNER_REPORT: [],
                PARTNERPLAYERBOUNS_REPORT: [],
                REAL_TIME_COMMISSION_REPORT: [],
                PARTNER_SETTLEMENT_HISTORY_REPORT: [],
                PARTNER_PROFIT_REPORT: ['getPartnerProfitReport'],
            },
            "Settlement": {
                PREVIEW: [],
                SETTLEMENT: [],
            },
            "EmailNotification": {
                "notifyEditPartnerCommission": [],
                "notifyEditChildPartner": [],
            },
        },
        Platform: {
            "PlatformSetting": {
                Read: ['getAllPlatforms', 'getPlatform', 'getDepartmentsByPlatformId', 'getPlatformAnnouncementsByPlatformId', 'getPlatformAnnouncementById', 'getAllGameTypes', 'getPlayerLvlPeriodConst', 'getAllGameStatus', 'getAllMessageTypes', 'syncPlatform',
                    'getPlatformBankCardGroup', 'getPlatformMerchantGroup', 'getPlatformAlipayGroup','getConsumptionRecordByGameProvider','getProfitDisplayDetailByPlatform', 'getPlayerConsumptionDetailByPlatform'],
                CreatePlatform: ['createPlatform', 'getDepartmentTreeById'],
                DeletePlatform: ['deletePlatformById'],
                EditForAllTab: ['updatePlatform'],
                ReplicateSetting: ['replicatePlatformSetting']
                //DailySettlement: ['startPlatformDailySettlement', 'getPlatformConsumptionReturnDetail', 'fixPlatformDailySettlement'],
               // WeeklySettlement: ['startPlatformWeeklySettlement', 'getPlatformConsumptionReturnDetail', 'fixPlatformWeeklySettlement'],
                //RewardSettlement: ['startPlatformRewardEventSettlement', 'startPlatformRTGEventSettlement'],
                //SettlementHistory: ['getSettlementHistory'],
                //PartnerCommissionSettlement: ['startPlatformPartnerCommissionSettlement'],
                //transferPlayerCreditFromProvider: ['transferAllPlayersCreditFromProvider'],
                //PlayerConsumptionIncentiveSettlement: ['startPlatformPlayerConsumptionIncentiveSettlement'],
                //PlayerConsumptionReturnSettlement: ['startPlatformPlayerConsumptionReturnSettlement', 'getYesterdayConsumptionReturnSGTime'],
                //PlayerLevelSettlement: ['startPlatformPlayerLevelSettlement'],
                //PlayerConsecutiveConsumptionSettlement: ['startPlayerConsecutiveConsumptionSettlement'],
                //BackstageSettings: [],
                //PlayerDisplayData: [],
                //PartnerDisplayData: [],
                //SystemSettlement: [],
                //FrontendModuleSetting: [],
                //ThemeSelect: [],
            },
            "PlayerDisplayData": {
                Read: [],
                MAIN_PAGE_ADVERTISEMENT: ['createNewXBETAdvertisement', 'getXBETAdvertisement', 'updateXBETAdvertisement', 'deleteXBETAdvertisementRecord', 'changeXBETAdvertisementStatus'],
                FIRST_TIME_ENTRY_ADVERTISEMENT: ['createNewXBETAdvertisement', 'getXBETAdvertisement', 'updateXBETAdvertisement', 'deleteXBETAdvertisementRecord', 'changeXBETAdvertisementStatus'],
                FIRST_TIME_LOGIN_ADVERTISEMENT: ['createNewXBETAdvertisement', 'getXBETAdvertisement', 'updateXBETAdvertisement', 'deleteXBETAdvertisementRecord', 'changeXBETAdvertisementStatus'],
                REWARD_POINTS_SHOP_ADVERTISEMENT: ['createNewXBETAdvertisement', 'getXBETAdvertisement', 'updateXBETAdvertisement', 'deleteXBETAdvertisementRecord', 'changeXBETAdvertisementStatus'],
            },
            "PartnerDisplayData": {
                Read: []
            },
            "SystemSettlement": {
                Read: [],
                PlayerLevelSettlement: ['startPlatformPlayerLevelSettlement'],
                PartnerCommissionSettlement: ['startPlatformPartnerCommissionSettlement'],
                PlayerConsumptionReturnSettlement: ['startPlatformPlayerConsumptionReturnSettlement', 'getYesterdayConsumptionReturnSGTime'],
                SystemRewardGroupSettlement: []
            },
            "FrontendModule": {
                Read: []
            },
            "ThemeSelect": {
                Read: []
            },
            "BackstageSettings": {
                Read: []
            },
            "AutoFeedback": {
                Read: [],
                Create: [],
                Overview: [],
                Update: []
            },
            "Feedback": {
                Read: ['getPlayerFeedbacks', 'getPlayerFeedbackResults', 'getPlayerLastNFeedbackRecord', 'getAllPlayerFeedbacks', 'getDepartmentDetailsByPlatformObjId', 'getPlayerFeedbackQuery'],
                Export: [],
                Create: ['createPlayerFeedback'],
                BulkCall: [],
                ModifyFeedbackResult: ['createPlayerFeedbackResult', 'deletePlayerFeedbackResult'],
                ModifyFeedbackTopic: ['createPlayerFeedbackTopic', 'deletePlayerFeedbackTopic']
            },
            "FeedbackQuery": {
                Read: ['getPlayerFeedbackQuery', 'getPlayerFeedbackResults', 'getAllPlayerFeedbacks']
            },
            // "Partner": {
            //     Read: ['getPartnersByPlatform', 'partnerLevel/getByPlatform', 'getPartnersPlayerInfo', 'getPartner', 'getChildrenPartner', 'getAllPartner', 'getPartnerActivePlayers',
            //         'getPartnerValidPlayers', 'getPartnerReferralPlayers', 'getPartnerActivePlayersForPastWeek', 'getAllGameProviders', 'getPartnerIPHistory', 'getDuplicatePhoneNumber',
            //         'getReferralsList', 'getDailyActivePlayerCount', 'getWeeklyActivePlayerCount', 'getMonthlyActivePlayerCount', 'getValidPlayersCount', 'getTotalChildrenDeposit',
            //         'getTotalChildrenBalance', 'getAdminInfo'],
            //     AdvancedSearch: ['getPartnersByAdvancedQuery'],
            //     Create: ['createPartnerWithParent', 'createPartner', 'createPlayerLoginRecord'],
            //     Delete: ['deletePartnersById', 'deletePlayerLoginRecord'],
            //     Edit: ['updatePartner', 'checkPartnerFieldValidity', 'checkOwnDomainValidity', 'createUpdatePartnerInfoProposal'],
            //     EditContact: ['createUpdatePartnerPhoneProposal', 'createUpdatePartnerEmailProposal', 'createUpdatePartnerQQProposal','createUpdatePartnerWeChatProposal','verifyPartnerPhoneNumber'],
            //     BankDetail: ['createUpdatePartnerBankInfoProposal', 'verifyPartnerBankAccount'],
            //     EditChildPartner: ['updateChildPartner', 'checkChildPartnerNameValidity', 'getChildPartnerRecords'],
            //     EditCommission: ['updatePartner', 'checkPartnerFieldValidity', 'createUpdatePartnerCommissionTypeProposal', 'customizePartnerCommission'],
            //     ResetPassword: ['resetPartnerPassword'],
            //     ApplyBonus: ['applyPartnerBonusRequest'],
            //     PartnerPermission: ['updatePartnerPermission'],
            //     AddFeedback: ['getAllPartnerFeedbackResults', 'getAllPartnerFeedbackTopics'],
            //     FeedbackHistory: ['getPartnerFeedbackReport'],
            //     ModifyFeedbackResult: ['createPartnerFeedbackResult', 'deletePartnerFeedbackResult'],
            //     ModifyFeedbackTopic: ['createPartnerFeedbackTopic', 'deletePartnerFeedbackTopic'],
            //     sendSMS: [],
            //     partnerApiLog: [],
            //     CreditAdjustment: ['createUpdatePartnerCreditProposal'],
            //     SettleCommission: ['getAllPartnerCommSettPreview'],
            //     PartnerCreditTransferToDownline: ['transferPartnerCreditToPlayer']
            // },
            "Game": {
                Read: ['getAllGameProviders', 'getGamesByPlatformAndProvider', 'getGamesNotAttachedToPlatform'],
                // AttachProvider: ['addProviderToPlatformById'],
                EditAttachedProvider: ['renameProviderInPlatformById', 'updateProviderFromPlatformById'],
                BatchCreditTransferOut: ['batchCreditTransferOut'],
                // DetachProvider: ['removeProviderFromPlatformById'],
                AttachGame: ['attachGameToPlatform', 'attachGamesToPlatform'],
                DetachGame: ['detachGameFromPlatform', 'updateGameStatusToPlatform', 'detachGamesFromPlatform'],
                // MAINTENANCE: [],
                EnableGame: [],
                MaintainGame: ['updateGameStatusToPlatform'],
                DisableGame: ['updateGameStatusToPlatform'],
                UploadImage: [],
                EditGameName: ['renameGame']
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
                EditGameName: ['renameGame']
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
            "ClientAutoQnA": {
                Read: ['getClientQnAProcessStep', 'getClientQnASecurityQuesConfig'],
                Update: ['editClientQnAConfig']
            },
            "ConfigRead": {
                Read: ['getPlayerLevelByPlatformId', 'getPlayerTrustLevelByPlatformId', 'getPartnerLevelConfig', 'getPlatformAnnouncements'],
                // PlayerLevelUpdate: [],
                // XBET_PLAYER_LEVEL_CONFIG: ['updatePlayerLevel'],
                // PlayerLevelCreate: [],
                PlayerLevelRead: ['getPlayerLevelByPlatformId'],
                // ValidActiveUpdate: [],
                ValidActiveRead: ['getPartnerLevelConfig'],
                PartnerCommissionRead: ['getPartnerCommissionConfig','getPartnerCommissionRateConfig', 'getPartnerCommissionConfigWithGameProviderGroup'],
                PartnerBasicRead:[],
                platformBasicRead: [],
                bonusBasicRead:[],
                DownloadTranslationCSVRead: [],
                TopUpAmountConfigRead: [],
                referralRead: [],
                autoApprovalRead: [],
                MonitorRead: [],
                PlayerValueRead: [],
                CredibilityRead: [],
                providerGroupRead: [],
                smsGroupRead: [],
                sensitiveKeywordRead:[],
                // AddCtiUrl: ['addCtiUrlSubDomain'],
                // RemoveCtiUrl: ['removeCtiUrlSubDomain'],
                BulkCallRead: [],
                DecomposeAfterNDaysRead: [],
                AutoExportListOrMaxNumOfTxnEverydayRead: [],
                CallRequestRead: [],
                // blacklistIpConfig: [],
                phoneFilterConfigRead: [],
                financialSettlementConfigRead: [],
                largeWithdrawalSettingRead: [],
                emailAuditConfigRead: [],
                emailNotificationConfigRead: [],
                platformFeeEstimateSettingRead: [],
                WeChatGroupControlRead: [],
                qqGroupControlRead: [],
                WinnerMonitorRead: [],
                defaultFeedbackConfigRead: [],

                // PartnerLevelCreate: [],
                // PartnerLevelUpdate: [],
                // PlatformAnnouncementCreate: ['createPlatformAnnouncement'],
                // PlatformAnnouncementRead: ['getPlatformAnnouncements'],
                // PlatformAnnouncementUpdate: ['updatePlatformAnnouncement'],
                // PlatformAnnouncementDelete: ['deletePlatformAnnouncementByIds'],
                // Trust: ['getPlayerTrustLevelByPlatformId'],
            },
            "ConfigEdit": {
                // Read: [],
                // PlayerLevelRead: [],
                // PlayerLevelUpdate: ['updatePlayerLevel'],
                // XBET_PLAYER_LEVEL_CONFIG: ['updatePlayerLevel'],
                // PlayerLevelCreate: ['createPlayerLevel'],
                PlayerLevelEdit : ['updatePlayerLevel', 'createPlayerLevel' ],
                // ValidActiveRead: [],
                ValidActiveEdit: ['updatePartnerLevelConfig'],
                PartnerCommissionEdit: ['createPartnerCommissionConfig', 'updatePartnerCommissionLevel', 'createUpdatePartnerCommissionRateConfig','createUpdatePartnerCommissionConfigWithGameProviderGroup','updateParentCommissionRateConfig'],
                PartnerBasicEdit:[],
                platformBasicEdit: [],
                bonusBasicEdit:['bonusBasic'],
                DownloadTranslationCSVEdit: ['downloadTranslationCSV'],
                TopUpAmountConfigEdit: ['updatePlatformTopUpAmount'],
                referralEdit: ['updateReferralConfig'],
                autoApprovalEdit: ['updateAutoApprovalConfig'],
                MonitorEdit: [],
                PlayerValueEdit: ['updatePlayerValueConfig','updatePlayerLevelScores'],
                CredibilityEdit: ['updateCredibilityRemarksInBulk'],
                providerGroupEdit: ['deletePlatformProviderGroup'],
                gameTypeConfigEdit: ['deleteGameTypeConfig'],
                smsGroupEdit: [],
                sensitiveKeywordEdit:[],
                // AddCtiUrl: ['addCtiUrlSubDomain'],
                // RemoveCtiUrl: ['removeCtiUrlSubDomain'],
                BulkCallEdit: ['addCtiUrlSubDomain', 'removeCtiUrlSubDomain'],
                DecomposeAfterNDaysEdit: [],
                AutoExportListOrMaxNumOfTxnEverydayEdit: [],
                // blacklistIpConfig: [],
                CallRequestEdit: [],
                phoneFilterConfigEdit: [],
                financialSettlementConfigEdit: ['updateAllAdminInfo', 'updatePlatform', 'updatePlatformFinancialPoints', 'updatePlatformAllBankCardGroup', 'updatePlatformAllWechatPayGroup', 'updatePlatformAllAlipayGroup'],
                largeWithdrawalSettingEdit: ['updateLargeWithdrawalSetting', 'updateLargeWithdrawalPartnerSetting'],
                emailAuditConfigEdit: ['setAuditCreditChangeSetting', 'setAuditManualRewardSetting'],
                emailNotificationConfigEdit: ['updateEmailNotificationConfig'],
                platformFeeEstimateSettingEdit: ['updatePlatformFeeEstimateSetting'],
                WeChatGroupControlEdit: [],
                qqGroupControlEdit: [],
                WinnerMonitorEdit: ['setWinnerMonitorConfig'],
                defaultFeedbackConfigEdit: ['updatePlatform'],

                // PartnerLevelCreate: ['createPartnerLevel'],
                // PartnerLevelUpdate: ['partnerLevel/update'],
                // PlatformAnnouncementCreate: ['createPlatformAnnouncement'],
                // PlatformAnnouncementRead: ['getPlatformAnnouncements'],
                // PlatformAnnouncementUpdate: ['updatePlatformAnnouncement'],
                // PlatformAnnouncementDelete: ['deletePlatformAnnouncementByIds'],
                // Trust: ['getPlayerTrustLevelByPlatformId'],
            },
            "Announcement": {
                PlatformAnnouncementCreate: ['createPlatformAnnouncement'],
                PlatformAnnouncementRead: ['getPlatformAnnouncements', 'getPlatformAnnouncementsByPlatformId'],
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
                Read: ['sendSMStoNumber','getDepartmentDetailsByPlatformObjId'],
                SMSSendLog: ['searchSMSLog'],
                SendGroupMessage: []
            },
            "UrlShortener": {
                Read: ['exportShortUrlToExcel']
            },
            "vertificationSMS": {
                Read: ['vertificationSMSQuery']
            },
            "getExternalUserInfo": {
                Read: ['getExternalUserInfo']
            },
            "promoCode": {
                Read: ['getPromoCodeTypes', 'getPromoCodeUserGroup', 'getBlockPromoCodeUserGroup', 'getAllPromoCodeUserGroup'],
                createPromoCode: ['generatePromoCode', 'checkPlayerHasPromoCode'],
                promoCodeHistory: ['getPromoCodesHistory'],
                sendSMS: [],
                monitorTypeB: [],
                monitor: [],
                smsContentConfig: [],
                userGroupConfig: [],
                activatePromoCode: ['updatePromoCodesActive'],
                applyPromoCode: [],
                promoCodeAnalysis: ['getPromoCodeTypeByObjId'],
                promoCodeTemplate: ['updatePromoCodeTemplate'],
                openPromoCodeTemplate: ['updateOpenPromoCodeTemplate'],
                maxRewardAmountSetting: [],
            },
            "RegistrationUrlConfig": {
                Read: ['getAllOfficer', 'getAllPromoteWay', 'getAllUrl', 'getAdminNameByDepartment'],
                Create: ['createOfficer', 'addPromoteWay', 'addUrl'],
                Delete: ['deletePromoteWay', 'deleteOfficer', 'deleteUrl'],
                Update: ['updateUrl'],
                ignore90DaysEditingRestriction: []
            },
            "devFunc": {
                Read: ['triggerSavePlayersCredit']
            },
            "phoneNumFilter": {
                Read: [],
                FilterAllPlatform: []
            },
            "rewardPoints": {
                Read: ['getRewardPointsLvlConfig', 'getRewardPointsEvent', 'getRewardPointsEventById', 'getRewardPointsEventByCategory','getRewardPoints','getRewardPointsRandom'
                    ,'getRewardPointsRandomDataConfig'],
                Create: ['createRewardPointsEvent','insertRewardPointsRandom','upsertRewardPointsRandomDataConfig'],
                Delete: ['deleteRewardPointsEventById','deleteRewardPointsRankingRandom'],
                Update: ['upsertRewardPointsLvlConfig', 'updateRewardPointsEvent','updateRewardPointsRankingRandom'],
                rewardPointsRule: [],
                loginRewardPoints: [],
                topupRewardPoints: [],
                gameRewardPoints: [],
                rewardPointsRanking: [],
                rewardPointsLog: []
            },
            "batchPermit": {
                Read: [],
                Update: ['updateBatchPlayerCredibilityRemark', 'updateBatchPlayerPermission', 'updateBatchPlayerForbidRewardEvents', 'updateBatchPlayerForbidProviders', 'updateBatchPlayerForbidPaymentType', 'updateBatchPlayerForbidRewardPointsEvent'],
            },
            "FrontendConfiguration": {
                Read: []
            },
            "FrontEndConfiguration": {
                Read: [],
                popularRecommendation: [],
                firstPageSetting: [],
                rewardPointClarification: [],
                carouselConfiguration: ['getCarouselSetting', 'saveCarouselSetting', 'updateCarouselSetting'],
                urlConfiguration: ['getSkinSetting', 'saveUrlConfig', 'getUrlConfig'],
                popUpAdvertisement: [],
                skinManagement: ['getSkinSetting', 'saveSkinSetting', 'removeSkinSetting'],
                rewardSetting: [],
                gameSetting: [],
                scriptDescription:[],
                registrationGuidance:[],
                partnerUrlConfiguration: [],
                partnerSkinManagement: ['getSkinSetting', 'saveUrlConfig', 'getUrlConfig'],
            },
            "AuctionSystem": {
                Read: [],
                Create: [],
                createProduct: [],
                monitoringSystem: [],
            },
            "EmailAudit": {
                "auditCreditChangeRecipient": [],
                "auditCreditChangeAuditor": [],
                "auditManualRewardRecipient": [],
                "auditManualRewardAuditor": [],
                "auditRepairTransferRecipient": [],
                "auditRepairTransferAuditor": [],
                CanReceiveLargeWithdrawalEmail: [],
                CanAuditLargeWithdrawal: [],
                CanReceivePartnerLargeWithdrawalEmail: [],
                CanAuditPartnerLargeWithdrawal: [],
            },
        },
        Report: {
            General: {
                Read: ['getPlatform', 'getProposalTypeByPlatformId', "getAllGameTypes", "getPlayerLevelByPlatformId", "getRewardEventsForPlatform", "getPromoCodeTypes", "getPlatformPartnerSettlementStatus"],
                TOPUP_REPORT: ['topupReport', "getMerchantTypeList"],
                PROPOSAL_REPORT: ['getProposalStaticsReport'],
                FINANCIAL_POINTS_REPORT: ['getFinancialPointsReport'],
                CONSUMPTION_MODE_REPORT: ['getConsumptionModeReport'],
                PROVIDER_REPORT: ['operationReport', 'operationSummaryReport'],
                PLAYER_EXPENSE_REPORT: ['getPlayerProviderReport', 'getProviderGamePlayerReport', 'getProviderGameReport', 'getPlayerProviderByGameReport', 'manualDailyProviderSettlement'],
                PLAYER_REPORT: ['getPlayerReport', 'manualDailyProviderSettlement', 'getGames'],
                DEVICE_REPORT: ['getDeviceReport', 'manualDailyProviderSettlement', 'getGames'],
                PLAYER_DEPOSIT_ANALYSIS_REPORT: ['getPlayerDepositAnalysisReport', 'getPlayerDepositAnalysisDetails', 'addPlayerToDepositTrackingReport'],
                PLAYER_DEPOSIT_TRACKING_REPORT: ['getPlayerDepositTrackingReport', 'getDepositTrackingGroup', 'addDepositTrackingGroup', 'deleteDepositTrackingGroup', 'modifyPlayerDepositTrackingGroup', 'removePlayerFromDepositTrackingReport', 'getPlayerDepositTrackingMonthlyDetails', 'getPlayerDepositTrackingDailyDetails'],
                NEWACCOUNT_REPORT: ['getPlayerDomainAnalysisData', 'getNewAccountReportData', 'getAllAdminInfo', 'getAllPromoteWay', 'getPartnerLevelConfig', 'getAllUrl'],
                DX_TRACKING_REPORT: ['getDXTrackingReport'],
                DX_NEWACCOUNT_REPORT: ['getDXNewPlayerReport', 'getAllPromoteWay', 'getDepartmentDetailsByPlatformObjId'],
                PLAYERPARTNER_REPORT: ['getPartnerPlayers', 'getPartnerSummaryReport', 'getPartnerPlayerBonusReport'],
                PARTNERPLAYERBOUNS_REPORT: ['getPartnerPlayerBonusReport'],
                PARTNERCOMMISSION_REPORT: ['getPartnerCommissionReport'],
                PLAYERDOMAIN_REPORT: ['getPlayerDomainReport', 'getDepartmentDetailsByPlatformObjId'],
                WINRATE_REPORT: ['winRateReport'],
                FEEDBACK_REPORT: ['getDepartmentDetailsByPlatformObjId'],
                PARTNER_SETTLEMENT_HISTORY_REPORT: [],
                REAL_TIME_COMMISSION_REPORT: ['getCurrentPartnerCommissionDetail'],
                PAST_COMMISSION_SETTLEMENT: ['settlePastCommission'],
                PLAYER_ALIPAY_ACCOUNT_REPORT: ['getPlayerAlipayAccReport'],
                FINANCIAL_REPORT: ['getFinancialReportByDay', 'getFinancialReportBySum', 'getDepositGroups'],
                GAME_TYPE_ANALYSIS_REPORT: [],
                DepositGroupSetting: ['addNewDepositGroup', 'updateDepositGroups', 'deleteDepositGroup'],
                ReCalculateReport: ['reCalculatePlayerReportSummary'],
                PLATFORM_OVERVIEW_REPORT: ['getPlatformOverviewReport']
            },
            Reward: {
                Read: ['getPlatformRewardPageReport', 'getRewardProposalReportByType','getRewardProposalReport'],
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
                LIMITED_OFFER_REPORT: ['getLimitedOfferReport'],
                WECHAT_GROUP_REPORT:['getWechatControlSession'],
                QQ_GROUP_REPORT:['getQQControlSession'],
                PROVIDER_CONSUMPTION_REPORT:['getProviderConsumptionReport'],
                PAYMENT_MONITOR_REPORT: ['getPaymentMonitorLockedAdmin', 'getPaymentMonitorReport']
            },
            Proposal: {
                "Force Pairing": ['forcePairingWithReferenceNumber']
            },
        },
        Operation: {
            Proposal: {
                Read: ['getProposalTypeByPlatformId', "getFullProposalProcess", 'getQueryApprovalProposalsForAdminId', "getQueryProposalsForAdminId", "getRewardEventsForPlatform", "getPromoCodeTypes"],
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
                largeWithdrawal: [],
                updatePlayerBonusStatus: ['setBonusProposalStatus'],
                CsApproveProposal:["approveCsPendingAndChangeStatus"],
                "Force Pairing": ['forcePairingWithReferenceNumber']
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
                TopUp: ['getTopUpTotalAmountForAllPlatform','getTopupAnalysisByPlatform'],
                NewPlayer: ['countNewPlayerbyPlatform', 'countNewPlayers'],
                ActivePlayer: ['countActivePlayerbyPlatform', 'countActivePlayerALLPlatform'],
                PlayerRetention: ['getPlayerRetention'],
                Bonus: ['getAnalysisBonusRequestList','getAnalysisSingleBonusRequestList'],
                ApiResponseTime: ['getApiLoggerAllServiceName', 'getApiLoggerAllFunctionNameOfService', 'getApiResponseTimeQuery'],
                ConsumptionInterval: ['getConsumptionIntervalData'],
                ClientSource: ['getClientSourceQuery'],
                LoginPlayer: ['countLoginPlayerbyPlatform'],
                AppPlayer: ['countAppPlayer'],
                ValidActivePlayer: ['countValidActivePlayerbyPlatform'],
                OnlineTopupSuccessRate: ['getOnlineTopupAnalysisByPlatform'],
                TopupMethodRate: ['getTopUpMethodAnalysisByPlatform','getTopUpMethodCountByPlatform'],
                DemoPlayer: ['getDemoPlayerAnalysis'],
                ClickCount: ['getClickCountAnalysis'],
                DeleteClickCount: ['deleteClickCountRecord'],
                PlayerDomain: ['getPlayerDomainAnalysisData'],
                ManualApproval: ['getManualApprovalRecords'],
                FrontEndRegistrationAttritionRate: ['getSpecificProposalTypeByName', 'getRegistrationClickCountRecords'],
                WithdrawalSpeed: ['getWithdrawalProposal', 'getProposalByObjId'],
                IpDomain: ['getIpDomainReport'],
                PlayerOnlineTime: ['getOnlineTimeLogByPlatform']
            }
        },
        Monitor: {
            Payment:{
                Read: ['getPaymentMonitorResult']
            },
            WechatGroupControl:{
                Read: []
            },
            "Payment Monitor Total":{
                Read: ['']
            },
            ConsumptionRecord:{
                Read: []
            },
            AttemptCreate:{
                Read: []
            },
            WinnerMonitor: {
                Read:["getWinnerMonitorData"]
            },
            QQGroupControl:{
                Read: ['getQQGroupControlSessionMonitor', 'getQQGroupControlSessionHistory']
            },
        },
        Payment: {
            "BankCardGroup": {
                Read: ['getPlatformBankCardGroup', 'getIncludedBankCardByBankCardGroup', 'getExcludedBankCardByBankCardGroup'],
                Create: ['addPlatformBankCardGroup', 'addPlayersToBankCardGroup'],
                Update: ['updatePlatformBankCardGroup', 'setPlatformDefaultBankCardGroup', 'syncBankCardGroupData'],
                Delete: ['deleteBankCardGroup'],
                AddPlayer: ['addPlayersToBankCardGroup'],
                AddAllPlayer: ['addAllPlayersToBankCardGroup'],
                CreateBankCard: ['createNewBankCardAcc'],
                EditBankCard: ['updateBankCardAcc', 'deleteBankCardAcc'],
                UpdateCardGroupType: []
            },
            "MerchantGroup": {
                Read: ['getPlatformMerchantGroup', 'getMerchantTypeList', 'getIncludedMerchantByMerchantGroup', 'getExcludedMerchantByMerchantGroup', 'getServiceChargeSetting'],
                Create: ['addPlatformMerchantGroup', 'addPlayersToMerchantGroup'],
                Update: ['renamePlatformMerchantGroup', 'updatePlatformMerchantGroup', 'setPlatformDefaultMerchantGroup'],
                Delete: ['deleteMerchantGroup'],
                AddPlayer: ['addPlayersToMerchantGroup'],
                AddAllPlayer: ['addAllPlayersToMerchantGroup'],
                UpdateCardGroupType: [],
                EditServiceChargeRatio: ['updateCustomizeRatePlatformMerchantList'],
                ServiceChangeSetting: ['updateServiceChargeSetting']
            },
            "AlipayGroup": {
                Read: ['getPlatformAliPayGroup'],
                Create: ['addPlatformAlipayGroup'],
                Update: ['renamePlatformAlipayGroup', 'setPlatformDefaultAlipayGroup', 'getPlayerForAttachGroup', 'addPlayersToAlipayGroup'],
                Delete: ["deleteAlipayGroup"],
                AddPlayer: ['addPlayersToAlipayGroup'],
                AddAllPlayer: ['addAllPlayersToAlipayGroup'],
                CreateAlipay: ['createNewAlipayAcc'],
                EditAlipay: ['updateAlipayAcc', 'deleteAlipayAcc'],
                UpdateCardGroupType: []
            },
            "WechatPayGroup": {
                Read: ['getPlatformWechatPayGroup'],
                Create: ['addPlatformWechatPayGroup'],
                Update: ['renamePlatformWechatPayGroup', 'setPlatformDefaultWechatPayGroup', 'addPlayersToWechatPayGroup'],
                Delete: ["deleteWechatPayGroup"],
                AddPlayer: ['addPlayersToWechatPayGroup'],
                AddAllPlayer: ['addAllPlayersToWechatPayGroup'],
                CreateWechatPay: ['createNewWechatpayAcc'],
                EditWechatPay: ['updateWechatPayAcc', 'deleteWechatPayAcc'],
                UpdateCardGroupType: []
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
                Expense: ['getPagedGameConsumptionRecord'],
                UploadGamePic: []
            }
        },
        Dashboard: {
            Platform: {
                Read: ['countLoginPlayerbyPlatformWeek', 'getTopUpTotalAmountForAllPlatform',  'getPlayerConsumptionSumForAllPlatform', 'getBonusRequestList', 'countNewPlayers']
            },
            Operation: {
                Read: ['getAllPlatformAvailableProposalsForAdminId', 'getAllRewardProposal']

            },
            Statistics: {
                Read: ['countLoginPlayerAllPlatform', 'countTopUpORConsumptionAllPlatform', 'countNewPlayerAllPlatform', 'getProfitDisplayDetailByPlatform', 'getPlayerConsumptionDetailByPlatform', 'countNewPlayers']
            }
        },
        Admin: {
            Department: {
                Read: ['getDepartmentTreeById', 'getDepartmentTreeByIdWithUser', 'getAllDepartments', 'getAllRolesforAdmin', 'getUnAttachDepartments', 'getPotentialChildren', 'getDepartmentTreeByIds'],
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
                EditAdminRole: ['getDepartmentRolesForAdmin', 'attachDetachRolesFromUsersById'],
                ViewLog: ['getAdminActionLog'],
                UpdateUserDepartment: ['updateAdminDepartment']
            },
            Role: {
                Read: ['getAttachedRolesforAdmin', 'getAllViews', 'getUnAttachedRolesforAdmin', 'getAllRolesForAdmin', 'getRole', 'getAllRole', 'getAttachedRolesForDepartment', 'getUnAttachedRolesForDepartment'],
                Create: ['createRole', 'createRoleForDepartment', 'attachRolesToDepartmentsById'],
                Delete: ['deleteRolesById'],
                Update: ['updateRole']
            },
            platform: {
                Read: ['getPlatform', 'getAllPlatforms'],
                //Move: ['addPlatformsToDepartmentById', 'removePlatformsFromDepartmentById'],
                //Create: ['createPlatform'],
                Edit: ['updatePlatform'],
                //Delete: ['deletePlatformById']
            },
            KeyServer: {
                Read: []
            }
        },
        QualityInspection: {
            QualityInsectionSetting: {
                Read: [],
                Edit: ['updatePlatform','summarizeLive800Record'],
                queryByQualityInspectionDate: []
            },
            Live800Record: {
                Read: ['searchLive800'],
                Edit: ['rateCSConversation','rateBatchConversation'],
                queryByProduct: [],
                queryByCSAccount: [],
                queryByLive800Account: [],
                queryByLive800Date: [],
                queryByEvaluationStatus: [],
                queryByQualityAssessor: []
            },
            QualityInsectionEvaluation: {
                Read: ['getUnreadEvaluationRecord','getReadEvaluationRecord','getAppealEvaluationRecordByConversationDate','getAppealEvaluationRecordByAppealDate'],
                Edit: ['markEvaluationRecordAsRead','appealEvaluation'],
                queryByQualityAssessor: [],
                queryByQualityInspectionDate: [],
                queryByAppealDate: [],
                queryByAppealStatus: []
            },
            QualityInsectionCSReport: {
                Read: ['searchLive800Record'],
                queryByProduct: [],
                queryByCSAccount: [],
                queryByLive800Account: [],
                queryByLive800Date: []
            },
            QualityInsectionReport: {
                Read: ['getWorkloadReport','getEvaluationProgressRecord'],
                queryByQualityAssessor: [],
                queryByQualityInspectionDate: [],
                queryByProduct: []
            },
            WechatConversationRecord: {
                Read:['getWechatDeviceNickNameList', 'getWechatDeviceNickNameList', 'getWechatConversationDeviceList', 'getWechatConversation']
            },
            WechatConversationReport: {
                Read: ['getWechatDeviceNickNameList', 'getWechatConversationReport']
            },
            CsAudioRecordingSystem: {
                Read: ['getAudioRecordData', 'getAudioReportData']
            },
            ManualProcessReport: {
                Read: ['getManualProcessRecord', 'getManualProcessProposalDetail'],
                Edit: ['summarizeManualProcessRecord'],
            },
           CsRankingReport: {
                Read: ['getCsRankingReport'],
                Edit: ['summarizeCsRankingData'],
            }
        },
        TeleMarketing: {
            "SMSMission": {
                Read: [],
                Create: [],
                Update: [],
                Delete: [],
            },
            "DXMission": {
                Read: [],
                Create: [],
                Update: [],
                Delete: [],
            },
            "phoneNumFilter": {
                Read: ['comparePhoneNum', 'uploadPhoneFileTXT', 'uploadPhoneFileXLS', 'importDiffPhoneNum', 'getAllDxMission', 'importTSNewList'],
                FilterAllPlatform: [],
            },
            "Overview": {
                Read: ["getTeleMarketingOverview","getDXPhoneNumberInfo","sendSMSToDXPlayer","getDXPlayerInfo"],
                Create: [],
                Update: [],
                Delete: [],
                queryByTaskName: [],
                queryByCreationStartDate: [],
                queryByCreationEndDate: [],
                queryByTotalImportedList: [],
                queryByTotalPlayerRegistration: [],
                queryByTotalPlayerDeposit: [],
                queryByTotalPlayerMultiDeposit: [],
                queryByTotalValidPlayer: [],
                queryByTotalDepositAmount: [],
                queryByTotalValidConsumption: [],
            },
            PHONE_LIST_ANALYSE_AND_MANAGEMENT: {
                Read: ['getDepartmentDetailsByPlatformObjId', 'getAdminNameByDepartment']
            },
            MY_PHONE_LIST_OR_REMINDER_PHONE_LIST: {
                Read: ['getAllPromoteWay']
            },
            "WORKLOAD REPORT": {
                Read: []
            },
            RECYCLE_BIN: {
                Read: []
            }
        },
        ThemeControl: {
            "ThemeControl": {
                Read: [],
                Edit: []
            },
            "playerTheme": {
                Read: [],
                Edit: []
            },
            "partnerTheme": {
                Read: [],
                Edit: []
            },
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

                    // console.warn("[roleChecker.js] Everybody can call action '%s' because it has no access rules!  Please add '%s' to roleChecker.linkedViews or roleChecker.publicActions.", socketAction, socketAction);
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
                // console.warn("TODO: Please add action '%s' (from '%s' category), to roleChecker.linkedViews or roleChecker.publicActions, otherwise no client (or all clients) will be able to call it.", actionName, categoryName);
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
