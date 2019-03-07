(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var FoundationAPITest = function(service){
        this._service = service;

        ////todo::replace id with test data
        //this.testRecordId = null;
    };
    var proto = FoundationAPITest.prototype;


    if (isNode) {


    }

    proto.getProvinceList = function(callback, requestData){
        var data = requestData ;
        this._service.getProvinceList.request(data);
        var key = this._service.getProvinceList.generateSyncKey(data);
        this._service.getProvinceList.onceSync(key, callback);
    };

    proto.getCityList = function(callback, requestData){
        var data = requestData ;
        this._service.getCityList.request(data);
        var key = this._service.getCityList.generateSyncKey(data);
        this._service.getCityList.onceSync(key, callback);
    };

    proto.getDistrictList = function(callback, requestData){
        var data = requestData;
        this._service.getDistrictList.request(data);
        var key = this._service.getDistrictList.generateSyncKey(data);
        this._service.getDistrictList.onceSync(key, callback);
    };

    proto.getCity = function(callback, requestData){
        var data = requestData;
        this._service.getCity.request(data);
        var key = this._service.getCity.generateSyncKey(data);
        this._service.getCity.onceSync(key, callback);
    };

    proto.getProvince = function(callback, requestData){
        var data = requestData;
        this._service.getProvince.request(data);
        var key = this._service.getProvince.generateSyncKey(data);
        this._service.getProvince.onceSync(key, callback);
    };

    proto.getDistrict = function(callback, requestData){
        var data = requestData;
        this._service.getDistrict.request(data);
        var key = this._service.getDistrict.generateSyncKey(data);
        this._service.getDistrict.onceSync(key, callback);
    };


    proto.getBankTypeList = function(callback, requestData){
        var data = requestData;
        this._service.getBankTypeList.request(data);
        var key = this._service.getBankTypeList.generateSyncKey(data);
        this._service.getBankTypeList.onceSync(key, callback);
    };

    if(isNode){
        module.exports = FoundationAPITest;
    } else {
        define([], function(){
            return FoundationAPITest;
        });
    }

})();
