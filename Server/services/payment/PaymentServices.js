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

    var defineConnectionService = function(sinonet){
        var ConnectionService = function(connection){
            sinonet.WebSocketService.call(this, "connection", connection);

            //define functions
            this.login = new sinonet.WebSocketAsyncFunction("login");
            this.addFunction(this.login);

            this.heartBeat = new sinonet.WebSocketAsyncFunction("heartBeat");
            this.addFunction(this.heartBeat);
        };

        ConnectionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConnectionService.prototype.constructor = ConnectionService;

        rootObj.ConnectionService = ConnectionService;
    };

    var definePaymentChannelService = function(sinonet){
        var PaymentChannelService = function(connection){
            sinonet.WebSocketService.call(this, "paymentChannel", connection);

            //define functions
            this.add = new sinonet.WebSocketAsyncFunction("add");
            this.addFunction(this.add);

            this.update = new sinonet.WebSocketAsyncFunction("update");
            this.addFunction(this.update);

            this.delete = new sinonet.WebSocketAsyncFunction("delete");
            this.addFunction(this.delete);

            this.changeStatus = new sinonet.WebSocketAsyncFunction("changeStatus");
            this.addFunction(this.changeStatus);

            this.all = new sinonet.WebSocketAsyncFunction("all");
            this.addFunction(this.all);
        };

        PaymentChannelService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PaymentChannelService.prototype.constructor = PaymentChannelService;

        rootObj.PaymentChannelService = PaymentChannelService;
    };

    var defineProposalService = function(sinonet){
        var ProposalService = function(connection){
            sinonet.WebSocketService.call(this, "proposal", connection);

            //define functions
            var functionNames = [
                "topupSuccess",
                "topupFail",
                "applyBonusSuccess",
                "applyBonusFail",
                "setTopupProposalStatus",
                "setBonusProposalStatus",
                "getProposalById",
                "getProposalList",
                "getBankcardListByGroup",
                "getMerchantIdListByGroup",
                "setUpdateCreditProposalStatus",
                "addTestTopUp"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ProposalService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ProposalService.prototype.constructor = ProposalService;

        rootObj.ProposalService = ProposalService;
    };

    var definePaymentDataService = function(sinonet){
        var PaymentDataService = function(connection){
            sinonet.WebSocketService.call(this, "paymentData", connection);

            //define functions
            var functionNames = [
                "deleteMerchant",
                "deleteBankcard",
                "deleteAlipay"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PaymentDataService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PaymentDataService.prototype.constructor = PaymentDataService;

        rootObj.PaymentDataService = PaymentDataService;
    };

    if(isNode){
        var sinonet = require("./../../server_common/WebSocketService");
        defineConnectionService(sinonet);
        definePaymentChannelService(sinonet);
        defineProposalService(sinonet);
        definePaymentDataService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function(sinonet){
            defineConnectionService(sinonet);
            definePaymentChannelService(sinonet);
            defineProposalService(sinonet);
            definePaymentDataService(sinonet);
            return rootObj;
        });
    }

})();