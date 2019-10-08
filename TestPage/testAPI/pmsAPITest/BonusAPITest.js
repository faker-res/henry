(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var BonusAPITest = function(service){
        this._service = service;

        //todo::replace id with test data
        this.testRecordId = null;
    };
    var proto = BonusAPITest.prototype;

    proto.applyBonus = function(callback, requestData){
        var data = requestData;
        this._service.applyBonus.request(data);
        var key = this._service.applyBonus.generateSyncKey(data);
        this._service.applyBonus.onceSync(key, callback);
    };

    if(isNode){
        module.exports = BonusAPITest;
    } else {
        define([], function(){
            return BonusAPITest;
        });
    }

})();
