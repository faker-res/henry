(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var BonusAPITest = function(service){
        this._service = service;

        //todo::replace id with test data
        this.testRecordId = null;
    };
    var proto = BonusAPITest.prototype;

    var testPlayerObjId = null;
    var providerId = null;
    var gameId = null;

    if (isNode) {


    }

    proto.getBonusList = function(callback, requestData){
        var data = requestData;
        this._service.getBonusList.request(data);
        var key = this._service.getBonusList.generateSyncKey(data);
        this._service.getBonusList.onceSync(key, callback);
    };

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
