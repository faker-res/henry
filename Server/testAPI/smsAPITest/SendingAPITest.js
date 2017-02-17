/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var SendingAPITest = function (service) {
        this._service = service;
    };

    var proto = SendingAPITest.prototype;

    const testApiUserData = {
        userName: "admin",
        password: "cpmsmon"
    };

    proto.sendMessage = function (callback, requestData) {
        var data = requestData || {};
        this._service.sendMessage.request(data);
        var key = this._service.sendMessage.generateSyncKey(data);
        this._service.sendMessage.onceSync(key, function (data) {
            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = SendingAPITest;
    } else {
        define([], function () {
            return SendingAPITest;
        });
    }

})();