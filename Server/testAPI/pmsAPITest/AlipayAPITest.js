/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var AlipayAPITest = function(service){
        this._service = service;

        //todo::replace id with test data
        this.testRecordId = null;
    };
    var proto = AlipayAPITest.prototype;

    if (isNode) {


    }

    proto.getAliPay = function(callback, requestData){
        var data = requestData;
        this._service.getAliPay.request(data);
        var key = this._service.getAliPay.generateSyncKey(data);
        this._service.getAliPay.onceSync(key, callback);
    };

    proto.getAliPayList = function(callback, requestData){
        var data = requestData;
        this._service.getAliPayList.request(data);
        var key = this._service.getAliPayList.generateSyncKey(data);
        this._service.getAliPayList.onceSync(key, callback);
    };

    if(isNode){
        module.exports = AlipayAPITest;
    } else {
        define([], function(){
            return AlipayAPITest;
        });
    }

})();
