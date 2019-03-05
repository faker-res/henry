(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var WechatPayAPITest = function(service){
        this._service = service;

        //todo::replace id with test data
        this.testRecordId = null;
    };
    var proto = WechatPayAPITest.prototype;

    if (isNode) {


    }

    proto.getWechat = function(callback, requestData){
        var data = requestData;
        this._service.getWechat.request(data);
        var key = this._service.getWechat.generateSyncKey(data);
        this._service.getWechat.onceSync(key, callback);
    };

    proto.getWechatList = function(callback, requestData){
        var data = requestData;
        this._service.getWechatList.request(data);
        var key = this._service.getWechatList.generateSyncKey(data);
        this._service.getWechatList.onceSync(key, callback);
    };

    if(isNode){
        module.exports = WechatPayAPITest;
    } else {
        define([], function(){
            return WechatPayAPITest;
        });
    }

})();
