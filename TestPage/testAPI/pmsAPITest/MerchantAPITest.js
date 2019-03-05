(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var MerchantAPITest = function(service){
        this._service = service;
    };
    var proto = MerchantAPITest.prototype;

    proto.getMerchantList = function(callback, requestData){
        var data = requestData ;
        this._service.getMerchantList.request(data);
        var key = this._service.getMerchantList.generateSyncKey(data);
        this._service.getMerchantList.onceSync(key, callback);
    };

    proto.getMerchant = function(callback, requestData){
        var data = requestData ;
        this._service.getMerchant.request(data);
        var key = this._service.getMerchant.generateSyncKey(data);
        this._service.getMerchant.onceSync(key, callback);
    };

    proto.getMerchantTypeList = function(callback, requestData){
        var data = requestData ;
        this._service.getMerchantTypeList.request(data);
        var key = this._service.getMerchantTypeList.generateSyncKey(data);
        this._service.getMerchantTypeList.onceSync(key, callback);
    };

    proto.getMerchantType = function(callback, requestData){
        var data = requestData ;
        this._service.getMerchantType.request(data);
        var key = this._service.getMerchantType.generateSyncKey(data);
        this._service.getMerchantType.onceSync(key, callback);
    };

    if(isNode){
        module.exports = MerchantAPITest;
    } else {
        define([], function(){
            return MerchantAPITest;
        });
    }

})();
