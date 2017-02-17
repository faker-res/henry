/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var testPlayerId = !isNode && window.testPlayerId;

    var testPlatformId = !isNode && window.testPlatformId;

    var ClientConsumptionAPITest = function(service){
        this._service = service;

        //todo::replace id with test data
        this.testRecordId = null;
    };
    var proto = ClientConsumptionAPITest.prototype;

    var testPlayerObjId = null;
    var providerId = null;
    var gameId = null;

    if (isNode) {

        var dbPlayer = require('./../../db_modules/dbPlayerInfo');
        var dbGame =  require('./../../db_modules/dbGame');
        var dbGameProvider = require('./../../db_modules/dbGameProvider');
        var playerName = "testclientplayer";
        var providerName = "testClientProvider";
        var gameName = "testClientGame";
        var Q = require('q');

        proto.initGetPlayerInfo = function (callback, requestData) {

            var deferred = Q.defer();
            dbPlayer.getPlayerInfo({name: playerName}).then(
                function (data) {
                    testPlayerId = data.playerId;
                    testPlayerObjId = data._id;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };

        proto.initGetProvider = function (callback, requestData) {
            var deferred = Q.defer();
            dbGameProvider.getGameProvider({name: providerName})
                .then(
                function (data) {
                    providerId = data.providerId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting provider", error: error});
                }
            );
            return deferred.promise;
        };

        proto.initGetGame = function (callback, requestData) {
            var deferred = Q.defer();
            dbGame.getGame({name: gameName})
                .then(
                function (data) {
                    gameId = data.gameId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting provider", error: error});
                }
            );
            return deferred.promise;
        };
    }

    proto.getLastConsumptions = function(callback, requestData){
        var data = requestData || {
                playerObjId: testPlayerObjId,
                startIndex : 0,
                requestCount: 15
            };
        this._service.getLastConsumptions.request(data);
        this._service.getLastConsumptions.once(callback);
    };

    proto.search = function(callback, requestData){
        var data = requestData || {
                startTime: "2016-01-01",
                endTime: "2050-12-31",
                providerId: providerId || '1',
                gameId: gameId || '1',
                startIndex : 0,
                requestCount: 15
            };
        this._service.search.request(data);
        this._service.search.once(callback);
    };

    if(isNode){
        module.exports = ClientConsumptionAPITest;
    } else {
        define([], function(){
            return ClientConsumptionAPITest;
        });
    }

})();