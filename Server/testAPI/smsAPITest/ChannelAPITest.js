/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ChannelAPITest = function (service) {
        this._service = service;
    };

    var proto = ChannelAPITest.prototype;

    proto.getChannelList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getChannelList.request(data);
        var key = this._service.getChannelList.generateSyncKey(data);
        this._service.getChannelList.onceSync(key, function (data) {
            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ChannelAPITest;
    } else {
        define([], function () {
            return ChannelAPITest;
        });
    }

})();