(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientPlatformAPITest = function (service) {
        this._service = service;

    };
    var testPlatformId = null;
    var proto = ClientPlatformAPITest.prototype;

    if (isNode)     {

        var dbPlatform = require('./../../db_modules/dbPlatform');
        var Q = require('q');

        dbPlatform.getPlatform({
                name: "testClientPlatform"  // get Platform
            }
        ).then(
            function (data) {
                testPlatformId = data.platformId;
            },
            function (error) {
               // deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
            }
        );
    }

    proto.getPlatformDetails = function (callback, requestData) {
        var data = requestData || {
                platformId: testPlatformId
            };
        this._service.getPlatformDetails.request(data);
        this._service.getPlatformDetails.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getPlatformAnnouncements = function (callback, requestData) {
        var data = requestData || {
                platformId: testPlatformId
            };
        this._service.getPlatformAnnouncements.request(data);
        this._service.getPlatformAnnouncements.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getConfig = function (callback, requestData) {
        var data = requestData || {
            platformId: testPlatformId
        };
        this._service.getConfig.request(data);
        this._service.getConfig.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getLiveStream = function (callback, requestData) {

        this._service.getLiveStream.request(requestData);
        this._service.getLiveStream.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    proto.playerPhoneChat = function (callback, requestData) {

        this._service.playerPhoneChat.request(requestData);
        this._service.playerPhoneChat.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    proto.searchConsumptionRecord = function (callback, requestData) {

        this._service.searchConsumptionRecord.request(requestData);
        this._service.searchConsumptionRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    if (isNode) {
        module.exports = ClientPlatformAPITest;
    } else {
        define([], function () {
            return ClientPlatformAPITest;
        });
    }

})();
