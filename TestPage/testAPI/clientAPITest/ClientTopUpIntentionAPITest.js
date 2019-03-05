(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var testPlayerId = !isNode && window.testPlayerId;

    var ClientTopUpIntentionAPITest = function (service) {
        this._service = service;

        this.testPaymentIntentionId = null;
    };

    var testPaymentIntentionId = null;
    var testPlatformId = null;
    var proto = ClientTopUpIntentionAPITest.prototype;

    if (isNode) {
        var dbPlayer = require('./../../db_modules/dbPlayerInfo');
        var dbconfig = require('./../../modules/dbproperties');
        var playerName = "testclientplayer";
        var Q = require('q');

        proto.initGetPlayer= function (callback, requestData) {
            var deferred = Q.defer();

            dbconfig.collection_players.findOne({name: playerName}).populate({
                path: "platform",
                model: dbconfig.collection_platform
            }).then(
                //dbPlayer.getPlayerInfo({name: playerName}).then(
                function (data) {
                    console.log("initGetPlayer: data.platform.platformId",  data.platform.platformId);
                    if (data) {
                        testPlayerId = data.playerId;
                        testPlatformId = data.platform.platformId;
                        deferred.resolve(data);
                    } else {
                        console.warn("ClientTopUpIntentionAPITest.js: Failed to find player with playerName '%s'", playerName);
                    }
                }
            ).catch(
                function (error) {
                    console.warn("ClientTopUpIntentionAPITest.js: Error in getting player with playerName '%s'", playerName, error);
                }
            );
            return deferred.promise;
        }

    }

    proto.add = function (callback, requestData) {
        var date = new Date().getTime();
        var data = requestData ||
            {
                playerId: testPlayerId,
                topUpAmount: 10,
                topupChannel: '2',
                platformId: testPlatformId
            };
        this._service.add.request(data);
        var self = this;
        this._service.add.once(function (data) {
            //self.testPaymentIntentionId = data._id;
            testPaymentIntentionId = data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.update = function (callback, requestData) {
        var data = requestData ||
            {
                //_id: this.testPaymentIntentionId,
                _id: testPaymentIntentionId,
                operationList: ["name: testPlayer"],
            };
        this._service.update.request(data);
        this._service.update.once(callback);
    };

    if (isNode) {
        module.exports = ClientTopUpIntentionAPITest;
    } else {
        define([], function () {
            return ClientTopUpIntentionAPITest;
        });
    }

})();
