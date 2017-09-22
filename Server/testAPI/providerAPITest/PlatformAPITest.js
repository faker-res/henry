(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var PlatformAPITest = function (service) {
        this._service = service;
        //this.testGameId = null;
    };

    var date = new Date().getTime();
    var proto = PlatformAPITest.prototype;
    var testGameId = null;
    var providerId = null;
    if (isNode) {

        var dbGameProvider = require('./../../db_modules/dbGameProvider');

        var Q = require('q');

        proto.initGetProvider = function (callback, requestData) {
            var deferred = Q.defer();
            dbGameProvider.getAllGameProviders()
                .then(
                    function (data) {
                        providerId = data[0].providerId;
                        deferred.resolve(data[0]);
                    },
                    function (error) {
                        deferred.reject({name: "DBError", message: "Error in getting provider", error: error});
                    }
                );
            return deferred.promise;
        };
    }
    var testPlayerObjId = !isNode && window.testPlayerObjId;
    var testPlayerId = !isNode && window.testPlayerId;
    proto.getPlatformList = function (callback, requestData) {
        //todo:: update test data here
        var data = requestData || {};
        this._service.getPlatformList.request(data);
        this._service.getPlatformList.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getPlatform = function (callback, requestData) {
        var data = requestData || {};
        this._service.getPlatform.request(data);
        this._service.getPlatform.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addProvider = function (callback, requestData) {
        var data = requestData || {};
        this._service.addProvider.request(data);
        this._service.addProvider.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.removeProvider = function (callback, requestData) {
        var data = requestData || {};
        this._service.removeProvider.request(data);
        this._service.removeProvider.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncProviders = function (callback, requestData) {
        var data = requestData || {platformProviders:[
                {platformId: 1, providers: ["1", "1469604047734"]},
                {platformId: 1339, providers: []}
            ]};
        this._service.syncProviders.request(data);
        this._service.syncProviders.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.isUserExist = function (callback, requestData) {
        var data = requestData || {};
        this._service.isUserExist.request(data);
        this._service.isUserExist.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getConsumptionIncentivePlayer = function (callback, requestData) {
        var data = requestData || {};
        this._service.getConsumptionIncentivePlayer.request(data);
        this._service.getConsumptionIncentivePlayer.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getPlayerInfoByName = function (callback, requestData) {
        let data = requestData || {name: 'testclientplayer'};
        this._service.getPlayerInfoByName.request(data);
        this._service.getPlayerInfoByName.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = PlatformAPITest;
    } else {
        define([], function () {
            return PlatformAPITest;
        });
    }
})();