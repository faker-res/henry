(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var rootObj = {};

    //create and add async function to WebSocketService
    var addServiceFunctions = function (sinonet, service, functionNames) {
        for (var i = 0; i < functionNames.length; i++) {
            service[functionNames[i]] = new sinonet.WebSocketAsyncFunction(functionNames[i]);
            service.addFunction(service[functionNames[i]]);
        }
    };

    var defineConnectionService = function (sinonet) {
        var ConnectionService = function (connection) {
            sinonet.WebSocketService.call(this, "connection", connection);

            //define functions
            var functionNames = [
                "setLang"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ConnectionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConnectionService.prototype.constructor = ConnectionService;

        rootObj.ConnectionService = ConnectionService;
    };

    //define player service functions
    var definePlayerService = function (sinonet) {
        var PlayerService = function (connection) {
            sinonet.WebSocketService.call(this, "player", connection);

            //define functions
            var functionNames = [
                "create",
                "playerQuickReg",
                "createPlayerPartner",
                "get",
                "getPlayerPartner",
                "update",
                "updatePhoneNumberWithSMS",
                "updatePlayerPartnerPhoneNumberWithSMS",
                "captcha",
                "login",
                "loginPlayerPartner",
                "loginPlayerPartnerWithSMS",
                "logout",
                "logoutPlayerPartner",
                "isLogin",
                "getSMSCode",
                "sendSMSCodeToPlayer",
                "verifyPhoneNumberBySMSCode",
                "updatePaymentInfo",
                "updatePlayerPartnerPaymentInfo",
                "updateSmsSetting",
                "updatePassword",
                "updatePasswordPlayerPartner",
                "updateSMSSetting",
                "isValidUsername",
                "isValidRealName",
                "authenticate",
                "authenticatePlayerPartner",
                "getPlayerDayStatus",
                "getPlayerWeekStatus",
                "getPlayerMonthStatus",
                "updatePhotoUrl",
                "getCredit",
                "getCreditBalance",
                "getMailList",
                "notifyNewMail",
                "sendPlayerMailFromPlayerToPlayer",
                "sendPlayerMailFromPlayerToAdmin",
                "addClientSourceLog",
                "resetPasswordViaPhone",
                "getCreditInfo",
                "readMail",
                "getUnreadMail",
                "deleteAllMail",
                "deleteMail",
                "manualPlayerLevelUp",
                "getWithdrawalInfo",
                "getCardTypeList",
                "getCreditDetail"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlayerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerService.prototype.constructor = PlayerService;

        rootObj.PlayerService = PlayerService;
    };

    var definePlatformService = function (sinonet) {
        var PlatformService = function (connection) {
            sinonet.WebSocketService.call(this, "platform", connection);

            //define functions
            var functionNames = [
                "getPlatformDetails",
                "getPlatformAnnouncements",
                "getConfig",
                "getLiveStream"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlatformService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlatformService.prototype.constructor = PlatformService;

        rootObj.PlatformService = PlatformService;
    };

    //define registration intention service functions
    var defineRegistrationIntentionService = function (sinonet) {
        var RegistrationIntentionService = function (connection) {
            sinonet.WebSocketService.call(this, "registrationIntention", connection);

            //define functions
            var functionNames = [
                "add",
                "update"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        RegistrationIntentionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        RegistrationIntentionService.prototype.constructor = RegistrationIntentionService;

        rootObj.RegistrationIntentionService = RegistrationIntentionService;
    };

    var definePaymentService = function (sinonet) {
        var PaymentService = function (connection) {
            sinonet.WebSocketService.call(this, "payment", connection);

            //define functions
            var functionNames = [
                "getTopupList",
                "applyBonus",
                "getBonusRequestList",
                "getBonusList",
                "cancelBonusRequest",
                "getOnlineTopupType",
                "createOnlineTopupProposal",
                "requestManualTopup",
                "getCashRechargeStatus",
                "cancelManualTopupRequest",
                "delayManualTopupRequest",
                "modifyManualTopupRequest",
                "getManualTopupRequestList",
                "getAlipayTopupRequestList",
                "manualTopupStatusNotify",
                "onlineTopupStatusNotify",
                "getProvinceList",
                "getCityList",
                "getDistrictList",
                "getBankTypeList",
                "checkExpiredManualTopup",
                "getTopupHistory",
                "getValidFirstTopUpRecordList",
                "getValidTopUpReturnRecordList",
                "requestAlipayTopup",
                "cancelAlipayTopup",
                "getValidTopUpRewardRecordList",
                "getWechatTopupRequestList",
                "requestWechatTopup",
                "cancelWechatTopup",
                "getPlayerWechatPayStatus",
                "getAlipaySingleLimit",
                "getMerchantSingleLimits",
                "requestQuickpayTopup",
                "cancelQuickpayTopup",
                "getQuickpayTopupRequestList",
                "isFirstTopUp",
                "getPlayerAliPayStatus",
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PaymentService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PaymentService.prototype.constructor = PaymentService;

        rootObj.PaymentService = PaymentService;
    };

    var defineTopUpIntentionService = function (sinonet) {
        var TopUpIntentionService = function (connection) {
            sinonet.WebSocketService.call(this, "topUpIntention", connection);

            //define functions
            var functionNames = [
                "add",
                "update"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        TopUpIntentionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        TopUpIntentionService.prototype.constructor = TopUpIntentionService;

        rootObj.TopUpIntentionService = TopUpIntentionService;
    };

    var defineConsumptionService = function (sinonet) {
        var ConsumptionService = function (connection) {
            sinonet.WebSocketService.call(this, "consumption", connection);

            //define functions
            var functionNames = [
                "getLastConsumptions",
                "search"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ConsumptionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConsumptionService.prototype.constructor = ConsumptionService;

        rootObj.ConsumptionService = ConsumptionService;
    };

    var definePlayerLevelService = function (sinonet) {
        var PlayerLevelService = function (connection) {
            sinonet.WebSocketService.call(this, "playerLevel", connection);

            //define functions
            var functionNames = [
                "getLevel",
                "getLevelReward",
                "getAllLevel",
                "upgrade"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlayerLevelService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerLevelService.prototype.constructor = PlayerLevelService;

        rootObj.PlayerLevelService = PlayerLevelService;
    };

    var defineRewardService = function (sinonet) {
        var RewardService = function (connection) {
            sinonet.WebSocketService.call(this, "reward", connection);

            //define functions
            var functionNames = [
                "getRewardList",
                "getPlayerRewardList",
                "getRewardTask",
                "requestConsumeRebate",
                "getConsumeRebateAmount",
                "isValidForFirstTopUpReward",
                "createFirstTopUpRewardProposal",
                "applyProviderReward",
                "applyRewardEvent",
                "getPlayerReferralList",
                "getConsecutiveLoginRewardDay",
                "getEasterEggPlayerInfo",
                "getTopUpPromoList",
                "getPromoCode",
                "applyPromoCode",
                "markPromoCodeAsViewed",
                "getLimitedOffers",
                "applyLimitedOffers",
                "getLimitedOfferBonus",
                "setLimitedOfferShowInfo",
                "setBonusShowInfo",
                "getSignInfo",
                "getSignBonus",
                "getSlotInfo",
            ];
            addServiceFunctions(sinonet, this, functionNames);

            this.consumeRebateNotify = new sinonet.WebSocketNotification("consumeRebateNotify");
            this.addFunction(this.consumeRebateNotify);
        };

        RewardService.prototype = Object.create(sinonet.WebSocketService.prototype);
        RewardService.prototype.constructor = RewardService;

        rootObj.RewardService = RewardService;
    };

    var defineRewardPointsService = function (sinonet) {
        var RewardPointsService = function (connection) {
            sinonet.WebSocketService.call(this, "rewardPoints", connection);

            //define functions
            var functionNames = [
                "applyRewardPoint",
                "getLoginRewardPoints",
                "getTopUpRewardPointsEvent",
                "getRewardPointsRanking",
                "getGameRewardPoints",
            ];
            addServiceFunctions(sinonet, this, functionNames);

            // this.consumeRebateNotify = new sinonet.WebSocketNotification("consumeRebateNotify");
            // this.addFunction(this.consumeRebateNotify);
        };

        RewardPointsService.prototype = Object.create(sinonet.WebSocketService.prototype);
        RewardPointsService.prototype.constructor = RewardPointsService;

        rootObj.RewardPointsService = RewardPointsService;
    };

    var defineGameService = function (sinonet) {
        var GameService = function (connection) {
            sinonet.WebSocketService.call(this, "game", connection);

            //define functions
            var functionNames = [
                "getGameTypeList",
                "getGameList",
                "getProviderList",
                "getProviderDetailList",
                "transferToProvider",
                "transferFromProvider",
                "getTransferProgress",
                "getGameProviderCredit",
                "getProviderStatus",
                "notifyProviderStatusUpdate",
                "getLoginURL",
                "getTestLoginURL",
                "getTestLoginURLWithOutUser",
                "getGameUserInfo",
                "modifyGamePassword",
                "grabPlayerTransferRecords",
                "getGameGroupList",
                "getGameGroupInfo",
                "addFavoriteGame",
                "removeFavoriteGame",
                "getFavoriteGames",
                "searchGame",
                "getGameGroupTreeInfo",
                "searchGameByGroup",
                "getGamePassword"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };
        GameService.prototype = Object.create(sinonet.WebSocketService.prototype);
        GameService.prototype.constructor = GameService;

        rootObj.GameService = GameService;
    };

    //define player service functions
    var definePartnerService = function (sinonet) {
        var PartnerService = function (connection) {
            sinonet.WebSocketService.call(this, "partner", connection);

            //define functions
            var functionNames = [
                "register",
                "get",
                "isValidUsername",
                "authenticate",
                "login",
                "logout",
                "captcha",
                "updatePassword",
                "fillBankInformation",
                "getPlayerSimpleList",
                "getPlayerDetailList",
                "getDomainList",
                "getStatistics",
                "bindPartnerPlayer",
                "applyBonus",
                "getBonusRequestList",
                "cancelBonusRequest",
                "getPartnerChildrenReport",
                "getPartnerPlayerPaymentReport",
                "getPartnerPlayerRegistrationReport",
                "getPartnerCommission",
                "getPartnerCommissionValue",
                "getPartnerPlayerRegistrationStats",
                "getSMSCode",
                "updatePhoneNumberWithSMS"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PartnerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PartnerService.prototype.constructor = PartnerService;

        rootObj.PartnerService = PartnerService;
    };

    // Individual services should be declared above, and called in here
    var defineServices = function (sinonet) {
        defineConnectionService(sinonet);
        definePlayerService(sinonet);
        definePlatformService(sinonet);
        definePlayerLevelService(sinonet);
        defineRegistrationIntentionService(sinonet);
        definePaymentService(sinonet);
        defineTopUpIntentionService(sinonet);
        defineConsumptionService(sinonet);
        defineRewardService(sinonet);
        defineRewardPointsService(sinonet);
        defineGameService(sinonet);
        definePartnerService(sinonet);
    };

    if (isNode) {
        var sinonet = require("./../../server_common/WebSocketService");
        defineServices(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function (sinonet) {
            defineServices(sinonet);
            return rootObj;
        });
    }
})();
