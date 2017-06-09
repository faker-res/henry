(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ConsumptionAPITest = function (service) {
        this._service = service;
        this.testRecordId = null;
    };

    var proto = ConsumptionAPITest.prototype;
    var playerObjId = !isNode && window.testPlayerObjId;
    var playerName = !isNode && window.playerName;
    var platformObjId = !isNode && window.testPlatformId;
    var gameObjId = !isNode && window.testGameId;
    var gameProviderObjId = !isNode && window.testProviderId;
    var gameType = null;

    ////////////////////  Init Data before the service functions - Start ///////////////////////////

    if (isNode) {

        var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
        var dbPlatform = require('./../../db_modules/dbPlatform');
        var dbGame = require('./../../db_modules/dbGame');
        var dbGameProvider = require('./../../db_modules/dbGameProvider');

        var Q = require("q");

        proto.initGetPlayer = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlayerInfo.getPlayerInfo({
                    name: "testclientplayer"
                }
            ).then(
                function (data) {
                    playerObjId = data._id;
                    playerName = data.name;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting player", error: error});
                }
            );
            return deferred.promise;
        };
        proto.initGetPlatform = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlatform.getPlatform({
                    name: "testClientPlatform"
                }
            ).then(
                function (data) {
                    platformObjId = data._id;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };
        proto.initGetGame = function (callback, requestData) {
            var deferred = Q.defer();
            dbGame.getGame({
                    name: "testClientGame"
                }
            ).then(
                function (data) {
                    gameObjId = data._id;
                    gameType = data.type;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };
    }

    ////////////////////  Init Data before the service functions - End ///////////////////////////

    proto.transferIn = function (callback, requestData) {

        var data = requestData ||
            {
                playerObjId: playerObjId,
                amount: 10
            };
        this._service.transferIn.request(data);
        var self = this;
        this._service.transferIn.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.transferOut = function (callback, requestData) {
        var data = requestData ||
            {
                playerObjId: playerObjId,
                amount: 20
            };
        this._service.transferOut.request(data);
        var self = this;
        this._service.transferOut.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addMissingConsumption = function (callback, requestData) {
        var data = requestData ||
            {
                name: !isNode && playerName,
                providerId: !isNode && window.testProviderId,
                gameId: !isNode && window.testGameId,
                amount: 10,
                validAmount: 5,
                createTime: Date.now(),
                detail: 'detail'
            };
        // We need to get the latest values for testProviderId and testGameId above, because this module's vars might
        // have been empty the first time it loaded, and if requirejs caches the module, they will never be set!
        this._service.addMissingConsumption.request(data);
        var self = this;
        this._service.addMissingConsumption.once(function (data) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addConsumption = function (callback, requestData) {
        var data = requestData ||
            {
                name: !isNode && playerName,
                providerId: !isNode && window.testProviderId,
                gameId: !isNode && window.testGameId,
                amount: 10,
                validAmount: 5,
                createTime: Date.now(),
                detail: 'detail'
            };
        // We need to get the latest values for testProviderId and testGameId above, because this module's vars might
        // have been empty the first time it loaded, and if requirejs caches the module, they will never be set!
        this._service.addConsumption.request(data);
        var self = this;
        this._service.addConsumption.once(function (data) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updateTransferProgress = function (callback, requestData) {
        var data = requestData || {};
        this._service.updateTransferProgress.request(data);
        var self = this;
        this._service.updateTransferProgress.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addConsumptionList = function (callback, requestData) {
        var data = JSON.parse(requestData) ||
            {consumptionList : [
                {
                    "userName": "vince91",
                    "platformId": "1",
                    "providerId": "18",
                    "gameId": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
                    gameType: 7,
                    "roundNo": 1,
                    "amount": 1000,
                    "validAmount": 900,
                    "bonusAmount": 100,
                    "orderNo": "1",
                    "createTime": "2015-01-01",
                    "orderTime": "2015-01-01",
                    "settlementTime": "2015-01-01",
                    "content": "test1",
                    "result": "test2",
                    "playDetail": "test3"
                },
                {
                    "userName": "vince911",
                    "platformId": "1",
                    "providerId": "18",
                    "gameId": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
                    gameType: 7,
                    "gameRound": 1,
                    "amount": 1200,
                    "validAmount": 1200,
                    "bonusAmount": 0,
                    "commissionAmount": 0,
                    "orderNo": "2"
                }
            ]};
        // We need to get the latest values for testProviderId and testGameId above, because this module's vars might
        // have been empty the first time it loaded, and if requirejs caches the module, they will never be set!
        this._service.addConsumptionList.request(data);
        var self = this;
        this._service.addConsumptionList.once(function (data) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.correctConsumptionList = function (callback, requestData) {
        var data = JSON.parse(requestData) ||
            {consumptionList : [
                {
                    "userName": "vince91",
                    "platformId": "1",
                    "providerId": "18",
                    "gameId": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
                    gameType: 7,
                    "roundNo": 1,
                    "amount": 1100,
                    "validAmount": 1100,
                    "bonusAmount": 0,
                    "orderNo": "1",
                    "createTime": "2015-01-01",
                    "orderTime": "2015-01-01",
                    "settlementTime": "2015-01-01",
                    "content": "test1",
                    "result": "test2",
                    "playDetail": "test3"
                },
                {
                    "userName": "vince91",
                    "platformId": "1",
                    "providerId": "18",
                    "gameId": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
                    gameType: 7,
                    "gameRound": 1,
                    "amount": 1200,
                    "validAmount": 1200,
                    "bonusAmount": 0,
                    "commissionAmount": 0,
                    "orderNo": "2"
                }
            ]};
        // We need to get the latest values for testProviderId and testGameId above, because this module's vars might
        // have been empty the first time it loaded, and if requirejs caches the module, they will never be set!
        this._service.correctConsumptionList.request(data);
        var self = this;
        this._service.correctConsumptionList.once(function (data) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ConsumptionAPITest;
    } else {
        define([], function () {
            return ConsumptionAPITest;
        });
    }


})();