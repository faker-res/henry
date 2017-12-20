(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var rootObj = {};

    //create and add async function to WebSocketService
    var addServiceFunctions = function(sinonet, service, functionNames){
        for( var i = 0; i < functionNames.length; i++ ){
            service[functionNames[i]] = new sinonet.WebSocketAsyncFunction(functionNames[i]);
            service.addFunction(service[functionNames[i]]);
        }
    };

    //create and add sync function to WebSocketService
    var addServiceSyncFunctions = function(sinonet, service, functionNames, keys){
        for( var i = 0; i < functionNames.length; i++ ){
            service[functionNames[i]] = new sinonet.WebSocketSyncFunction(functionNames[i], keys);
            service.addFunction(service[functionNames[i]]);
        }
    };

    var defineConnectionService = function(sinonet){
        var ConnectionService = function(connection){
            sinonet.WebSocketService.call(this, "connection", connection);

            //define functions
            var functionNames = [
                "login",
                "heartBeat"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ConnectionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConnectionService.prototype.constructor = ConnectionService;

        rootObj.ConnectionService = ConnectionService;
    };


    var definePlatformService = function(sinonet){
        var PlatformService = function(connection){
            sinonet.WebSocketService.call(this, "platform", connection);

            //define functions
            var functionNames = [
                "add",
                "update",
                "delete",
                "modifyCode",
                "syncData"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlatformService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlatformService.prototype.constructor = PlatformService;

        rootObj.PlatformService = PlatformService;
    };

    var defineFoundationService = function(sinonet){
        var FoundationService = function(connection){
            sinonet.WebSocketService.call(this, "foundation", connection);

            //define functions
            var functionNames = [
                "getProvinceList",
                "getCityList",
                "getDistrictList",
                "getBankTypeList",
                "getProvince",
                "getCity",
                "getDistrict"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        FoundationService.prototype = Object.create(sinonet.WebSocketService.prototype);
        FoundationService.prototype.constructor = FoundationService;

        rootObj.FoundationService = FoundationService;
    };

    var definePaymentService = function(sinonet){
        var PaymentService = function(connection){
            sinonet.WebSocketService.call(this, "payment", connection);

            //define functions
            var functionNames = [
                //"requestManualBankCard",
                //"requestOnlineMerchant",
                "modifyManualTopupRequest",
                "setProposalIdToOnlineMerchantRequest",
                "setProposalIdToManualTopupRequest"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["requestId"]);

            var functionNames1 = [
                "requestOnlineMerchant",
                "requestManualBankCard",
                "requestRepairingOnlinePay",
                "checkExpiredManualTopup",
                "requestAlipayAccount",
                "requestCancellationPayOrder",
                "requestWeChatAccount",
                "requestWeChatQRAccount",
                "requestMfbAccount",
                "requestProposalSuccess"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames1, ["proposalId"]);

            var functionNames1 = [
                "requestClearProposalLimits"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames1, ["username"]);

            // Quick fix until we decide how to handle unique persistent requestIds for this particular API call.
            // They want us to send a unique ID each time, even after our server has restarted.
            // this.requestManualBankCard.appendSyncKey = function (data, value) {
            //     data.requestId = 'ManualTopUpRequest:' + String(Date.now()) + '.' + String(Math.floor(100000 * Math.random()));
            //     return data;
            // };
        };

        PaymentService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PaymentService.prototype.constructor = PaymentService;

        rootObj.PaymentService = PaymentService;
    };

    var defineBonusService = function(sinonet){
        var BonusService = function(connection){
            sinonet.WebSocketService.call(this, "bonus", connection);

            //define functions
            var functionNames = [
                "getBonusList"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);

            var functionNames1 = [
                "applyBonus",
                "setBonusStatus"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames1, ["proposalId"]);
        };

        BonusService.prototype = Object.create(sinonet.WebSocketService.prototype);
        BonusService.prototype.constructor = BonusService;

        rootObj.BonusService = BonusService;
    };

    var defineBankcardService = function(sinonet){
        var BankcardService = function(connection){
            sinonet.WebSocketService.call(this, "bankcard", connection);

            //define functions
            var functionNames = [
                "getBankcardList",
                "getBankcard",
                "getBankTypeList",
                "getBankType"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        BankcardService.prototype = Object.create(sinonet.WebSocketService.prototype);
        BankcardService.prototype.constructor = BankcardService;

        rootObj.BankcardService = BankcardService;
    };

    var defineMerchantService = function(sinonet){
        var MerchantService = function(connection){
            sinonet.WebSocketService.call(this, "merchant", connection);

            //define functions
            var functionNames = [
                "getMerchantList",
                "getMerchant",
                "getMerchantTypeList",
                "getMerchantType"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        MerchantService.prototype = Object.create(sinonet.WebSocketService.prototype);
        MerchantService.prototype.constructor = MerchantService;

        rootObj.MerchantService = MerchantService;
    };

    var defineAlipayService = function (sinonet) {
        var AlipayService = function (connection) {
            sinonet.WebSocketService.call(this, "aliPay", connection);

            //define functions
            var functionNames = [
                "getAliPayList",
                "getAliPay",
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        AlipayService.prototype = Object.create(sinonet.WebSocketService.prototype);
        AlipayService.prototype.constructor = AlipayService;

        rootObj.AlipayService = AlipayService;
    };

    var defineWechatService = function (sinonet) {
        var WechatService = function (connection) {
            sinonet.WebSocketService.call(this, "weChat", connection);

            //define functions
            var functionNames = [
                "getWechatList",
                "getWechat",
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        WechatService.prototype = Object.create(sinonet.WebSocketService.prototype);
        WechatService.prototype.constructor = WechatService;

        rootObj.WechatService = WechatService;
    };

    var defineQuickPayService = function (sinonet) {
        var QuickPayService = function (connection) {
            sinonet.WebSocketService.call(this, "quickPayment", connection);

            //define functions
            var functionNames = [
                "getQuickPaymentList",
                "getQuickPayment",
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        QuickPayService.prototype = Object.create(sinonet.WebSocketService.prototype);
        QuickPayService.prototype.constructor = QuickPayService;

        rootObj.QuickPayService = QuickPayService;
    };

    var defineReconciliationService = function (sinonet) {
        var ReconciliationService = function (connection) {
            sinonet.WebSocketService.call(this, "reconciliation", connection);

            //define functions
            var functionNames = [
                "getOnlineCashinList",
                "getCashinList",
                "getCashoutList",
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        ReconciliationService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ReconciliationService.prototype.constructor = ReconciliationService;

        rootObj.ReconciliationService = ReconciliationService;
    };


    if (isNode) {
        var sinonet = require("./../../server_common/WebSocketService");
        defineConnectionService(sinonet);
        defineFoundationService(sinonet);
        definePlatformService(sinonet);
        definePaymentService(sinonet);
        defineBonusService(sinonet);
        defineBankcardService(sinonet);
        defineMerchantService(sinonet);
        defineAlipayService(sinonet);
        defineWechatService(sinonet);
        defineQuickPayService(sinonet);
        defineReconciliationService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function (sinonet) {
            defineConnectionService(sinonet);
            defineFoundationService(sinonet);
            definePlatformService(sinonet);
            definePaymentService(sinonet);
            defineBonusService(sinonet);
            defineBankcardService(sinonet);
            defineMerchantService(sinonet);
            defineAlipayService(sinonet);
            defineWechatService(sinonet);
            defineQuickPayService(sinonet);
            defineReconciliationService(sinonet);
            return rootObj;
        });
    }

})();