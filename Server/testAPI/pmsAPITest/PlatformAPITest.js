/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var PlatformAPITest = function(service){
        this._service = service;

        ////todo::replace id with test data
        //this.testRecordId = null;
    };
    var proto = PlatformAPITest.prototype;


    if (isNode) {

    }

    proto.add = function(callback, requestData){
        var data = requestData ;
        this._service.add.request(data);
        this._service.add.once(callback);
    };

    proto.delete = function(callback, requestData){
        var data = requestData ;
        this._service.delete.request(data);
        this._service.delete.once(callback);
    };

    proto.update = function(callback, requestData){
        var data = requestData;
        this._service.update.request(data);
        this._service.update.once(callback);
    };

    proto.modifyCode = function(callback, requestData){
        var data = requestData;
        this._service.modifyCode.request(data);
        this._service.modifyCode.once(callback);
    };

    proto.syncData = function(callback, requestData){
        var data = requestData;
        this._service.syncData.request(data);
        this._service.syncData.once(callback);
    };

    if(isNode){
        module.exports = PlatformAPITest;
    } else {
        define([], function(){
            return PlatformAPITest;
        });
    }

})();
