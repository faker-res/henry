(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var PaymentAPITest = function(service){
        this._service = service;

        ////todo::replace id with test data
        //this.testRecordId = null;
    };
    var proto = PaymentAPITest.prototype;

    proto.requestManualBankCard = function(callback, requestData){
        var data = requestData ;
        this._service.requestManualBankCard.request(data);
        var key = this._service.requestManualBankCard.generateSyncKey(data);
        this._service.requestManualBankCard.onceSync(key, callback);
    };

    proto.requestOnlineMerchant = function(callback, requestData){
        var data = requestData ;
        this._service.requestOnlineMerchant.request(data);
        var key = this._service.requestOnlineMerchant.generateSyncKey(data);
        this._service.requestOnlineMerchant.onceSync(key, callback);
    };

    proto.modifyManualTopupRequest = function(callback, requestData){
        var data = requestData;
        this._service.modifyManualTopupRequest.request(data);
        var key = this._service.modifyManualTopupRequest.generateSyncKey(data);
        this._service.modifyManualTopupRequest.onceSync(key, callback);
    };

    proto.setProposalIdToOnlineMerchantRequest = function(callback, requestData){
        var data = requestData;
        this._service.setProposalIdToOnlineMerchantRequest.request(data);
        var key = this._service.setProposalIdToOnlineMerchantRequest.generateSyncKey(data);
        this._service.setProposalIdToOnlineMerchantRequest.onceSync(key, callback);
    };

    proto.setProposalIdToManualTopupRequest = function(callback, requestData){
        var data = requestData;
        this._service.setProposalIdToManualTopupRequest.request(data);
        var key = this._service.setProposalIdToManualTopupRequest.generateSyncKey(data);
        this._service.setProposalIdToManualTopupRequest.onceSync(key, callback);
    };

    proto.requestRepairingOnlinePay = function(callback, requestData){
        var data = requestData;
        this._service.requestRepairingOnlinePay.request(data);
        var key = this._service.requestRepairingOnlinePay.generateSyncKey(data);
        this._service.requestRepairingOnlinePay.onceSync(key, callback);
    };

    proto.checkExpiredManualTopup = function(callback, requestData){
        var data = requestData;
        this._service.checkExpiredManualTopup.request(data);
        var key = this._service.checkExpiredManualTopup.generateSyncKey(data);
        this._service.checkExpiredManualTopup.onceSync(key, callback);
    };

    proto.requestCancellationPayOrder = function(callback, requestData){
        var data = requestData;
        this._service.requestCancellationPayOrder.request(data);
        var key = this._service.requestCancellationPayOrder.generateSyncKey(data);
        this._service.requestCancellationPayOrder.onceSync(key, callback);
    };

    proto.requestClearProposalLimits = function(callback, requestData){
        var data = requestData;
        this._service.requestClearProposalLimits.request(data);
        var key = this._service.requestClearProposalLimits.generateSyncKey(data);
        this._service.requestClearProposalLimits.onceSync(key, callback);
    };

    proto.requestProposalSuccess = function(callback, requestData){
        var data = requestData;
        this._service.requestProposalSuccess.request(data);
        var key = this._service.requestProposalSuccess.generateSyncKey(data);
        this._service.requestProposalSuccess.onceSync(key, callback);
    };

    if(isNode){
        module.exports = PaymentAPITest;
    } else {
        define([], function(){
            return PaymentAPITest;
        });
    }

})();
