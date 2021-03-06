(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var BankcardAPITest = function(service){
        this._service = service;
    };
    var proto = BankcardAPITest.prototype;

    proto.getBankcardList = function(callback, requestData){
        var data = requestData ;
        this._service.getBankcardList.request(data);
        var key = this._service.getBankcardList.generateSyncKey(data);
        this._service.getBankcardList.onceSync(key, callback);
    };

    proto.getBankcard = function(callback, requestData){
        var data = requestData ;
        this._service.getBankcard.request(data);
        var key = this._service.getBankcard.generateSyncKey(data);
        this._service.getBankcard.onceSync(key, callback);
    };

    proto.getBankTypeList = function(callback, requestData){
        var data = requestData ;
        this._service.getBankTypeList.request(data);
        var key = this._service.getBankTypeList.generateSyncKey(data);
        this._service.getBankTypeList.onceSync(key, callback);
    };

    proto.getBankType = function(callback, requestData){
        var data = requestData ;
        this._service.getBankType.request(data);
        var key = this._service.getBankType.generateSyncKey(data);
        this._service.getBankType.onceSync(key, callback);
    };

    proto.bankCardByGroupReq = function(callback, requestData){
        let data = requestData && requestData.platformId ? requestData : {
            "platformId": "100"
        };
        data.queryId = data.queryId ? Number(data.queryId) : data.queryId;
        this._service.bankCardByGroupReq.request(data);
        let key = this._service.bankCardByGroupReq.generateSyncKey(data);
        this._service.bankCardByGroupReq.onceSync(key, callback);
    };

    proto.bankCardByUserReq = function(callback, requestData){
        let data = requestData && requestData.platformId ? requestData : {
            "platformId": "100",
            "userName": "111"
        };
        data.queryId = data.queryId ? Number(data.queryId) : data.queryId;
        this._service.bankCardByUserReq.request(data);
        let key = this._service.bankCardByUserReq.generateSyncKey(data);
        this._service.bankCardByUserReq.onceSync(key, callback);
    };

    if(isNode){
        module.exports = BankcardAPITest;
    } else {
        define([], function(){
            return BankcardAPITest;
        });
    }

})();
