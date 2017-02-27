/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var PlayerAPITest = function (service) {
        this._service = service;

        //this.testRecordId = null;

    };
    var proto = PlayerAPITest.prototype;

    proto.addPlayer = function (callback, requestData) {

        var data = requestData || {};
        this._service.addPlayer.request(data);
        var key = this._service.addPlayer.generateSyncKey(data);
        this._service.addPlayer.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };

    proto.addTestPlayer = function (callback, requestData) {

        var data = requestData || {};
        this._service.addTestPlayer.request(data);
        var key = this._service.addTestPlayer.generateSyncKey(data);
        this._service.addTestPlayer.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.getLoginURL = function (callback, requestData) {

        var data = requestData || {};
        this._service.getLoginURL.request(data);
        var key = this._service.getLoginURL.generateSyncKey(data);
        this._service.getLoginURL.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.getTestLoginURL = function (callback, requestData) {

        var data = requestData || {};
        this._service.getTestLoginURL.request(data);
        var key = this._service.getTestLoginURL.generateSyncKey(data);
        this._service.getTestLoginURL.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.getConsumptionRecords = function (callback, requestData) {

        var data = requestData || {};
        this._service.getConsumptionRecords.request(data);
        var key = this._service.getConsumptionRecords.generateSyncKey(data);
        this._service.getConsumptionRecords.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.getTransferRecords = function (callback, requestData) {

        var data = requestData || {};
        this._service.getTransferRecords.request(data);
        var key = this._service.getTransferRecords.generateSyncKey(data);
        this._service.getTransferRecords.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.queryCredit = function (callback, requestData) {

        var data = requestData || {};
        this._service.queryCredit.request(data);
        var key = this._service.queryCredit.generateSyncKey(data);
        this._service.queryCredit.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };

    proto.queryCreditByPlatformId = function (callback, requestData) {

        var data = requestData || {};
        this._service.queryCreditByPlatformId.request(data);
        var key = this._service.queryCreditByPlatformId.generateSyncKey(data);
        this._service.queryCreditByPlatformId.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.transferIn = function (callback, requestData) {

        var data = requestData || {};
        this._service.transferIn.request(data);
        var key = this._service.transferIn.generateSyncKey(data);
        this._service.transferIn.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.transferOut = function (callback, requestData) {

        var data = requestData || {};
        this._service.transferOut.request(data);
        var key = this._service.transferOut.generateSyncKey(data);
        this._service.transferOut.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.checkUserOnline = function (callback, requestData) {

        var data = requestData || {};
        this._service.checkUserOnline.request(data);
        var key = this._service.checkUserOnline.generateSyncKey(data);
        this._service.checkUserOnline.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.getGameUserInfo = function (callback, requestData) {

        var data = requestData || {};
        this._service.getGameUserInfo.request(data);
        var key = this._service.getGameUserInfo.generateSyncKey(data);
        this._service.getGameUserInfo.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };


    proto.modifyGamePassword = function (callback, requestData) {

        var data = requestData || {};
        this._service.modifyGamePassword.request(data);
        var key = this._service.modifyGamePassword.generateSyncKey(data);
        this._service.modifyGamePassword.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };
    
    proto.grabPlayerTransferRecords = function (callback, requestData) {

        var data = requestData || {};
        this._service.grabPlayerTransferRecords.request(data);
        var key = this._service.grabPlayerTransferRecords.generateSyncKey(data);
        this._service.grabPlayerTransferRecords.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };

    proto.checkExist = function (callback, requestData) {

        var data = requestData || {};
        this._service.checkExist.request(data);
        var key = this._service.checkExist.generateSyncKey(data);
        this._service.checkExist.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });

    };

    proto.syncPlatforms = function (callback, requestData) {

        var data = requestData || {};
        this._service.syncPlatforms.request(data);
        var key = this._service.syncPlatforms.generateSyncKey(data);
        this._service.syncPlatforms.onceSync(key, function (data) {

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });

    };
    
    if (isNode) {
        module.exports = PlayerAPITest;
    } else {
        define([], function () {
            return PlayerAPITest;
        });
    }

})();