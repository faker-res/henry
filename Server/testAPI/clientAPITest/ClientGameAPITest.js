(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var testPlayerId = !isNode && window.testPlayerId;
    var testPlayerObjId = !isNode && window.testPlayerObjId;
    var providerId = !isNode && window.testProviderId;
    var ClientGameAPITest = function (gameService) {
        this.gameService = gameService;
        this.testRecordId = null;
    };

    var proto = ClientGameAPITest.prototype;

////////////////// Start - Init Data if running on server /////////////////
    if (isNode) {

        var dbPlayer = require('./../../db_modules/dbPlayerInfo');
        var dbGameProvider = require('./../../db_modules/dbGameProvider');
        var playerName = "testclientplayer";
        var providerName = "testClientProvider";
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
    }
////////////////// End - Init Data if running on server /////////////////


    var testGame = null;
    proto.getGameTypeList = function (callback, requestData) {

        this.gameService.getGameTypeList.request({});
        this.gameService.getGameTypeList.once(callback);
    };
    proto.getGameList = function (callback, requestData) {
        var data = requestData || {};
        this.gameService.getGameList.request(data);
        this.gameService.getGameList.once(callback);
    };

    proto.getGameGroupInfo = function (callback, requestData) {
        var data = requestData || {};
        this.gameService.getGameGroupInfo.request(data);
        this.gameService.getGameGroupInfo.once(callback);
    };

    proto.getGameGroupTreeInfo = function (callback, requestData) {
        var data = requestData || {};
        this.gameService.getGameGroupTreeInfo.request(data);
        this.gameService.getGameGroupTreeInfo.once(callback);
    };

    proto.getGameGroupList = function (callback, requestData) {
        var data = requestData;
        this.gameService.getGameGroupList.request(data);
        this.gameService.getGameGroupList.once(callback);
    };


    proto.getProviderList = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId};
        this.gameService.getProviderList.request(data);
        this.gameService.getProviderList.once(callback);
    };

    proto.getProviderDetailList = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId};
        this.gameService.getProviderDetailList.request(data);
        this.gameService.getProviderDetailList.once(callback);
    };

    proto.getProviderStatus = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId};
        this.gameService.getProviderStatus.request(data);
        this.gameService.getProviderStatus.once(callback);
    };

    proto.transferToProvider = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, providerId: providerId, amount: 30};
        this.gameService.transferToProvider.request(data);
        this.gameService.transferToProvider.once(callback);
    };

    proto.transferFromProvider = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, providerId: providerId, amount: 10};
        this.gameService.transferFromProvider.request(data);
        this.gameService.transferFromProvider.once(callback);
    };

    proto.getGameProviderCredit = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, providerId: providerId};
        this.gameService.getGameProviderCredit.request(data);
        this.gameService.getGameProviderCredit.once(callback);
    };

    proto.getTransferProgress = function (callback, requestData) {
        var data = requestData || {};
        this.gameService.getTransferProgress.request(data);
        var self = this;
        var responseFunc = function (data) {
            //if( data.data.currentStep >= data.data.steps ){
            //self.gameService.getTransferProgress.removeListener(responseFunc);
            //}
            callback(data);
        };
        this.gameService.getTransferProgress.addListener(responseFunc);
    };

    proto.notifyProviderStatusUpdate = function (callback, requestData) {
        var data = requestData || {};
        this.gameService.notifyProviderStatusUpdate.request(data);
        var self = this;
        var responseFunc = function (data) {
            if (data.data.runTimeStatus >= 3) {
                self.gameService.notifyProviderStatusUpdate.removeListener(responseFunc);
            }
            callback(data);
        };
        this.gameService.notifyProviderStatusUpdate.addListener(responseFunc);
    };

    proto.getLoginURL = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, gameId: providerId};
        this.gameService.getLoginURL.request(data);
        this.gameService.getLoginURL.once(callback);
    };

    proto.getTestLoginURL = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, gameId: providerId};
        this.gameService.getTestLoginURL.request(data);
        this.gameService.getTestLoginURL.once(callback);
    };

    proto.getTestLoginURLWithoutUser = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, gameId: providerId};
        this.gameService.getTestLoginURLWithoutUser.request(data);
        this.gameService.getTestLoginURLWithoutUser.once(callback);
    };

    proto.getGameUserInfo = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, gameId: providerId};
        this.gameService.getGameUserInfo.request(data);
        this.gameService.getGameUserInfo.once(callback);
    };

    proto.modifyGamePassword = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, gameId: providerId};
        this.gameService.modifyGamePassword.request(data);
        this.gameService.modifyGamePassword.once(callback);
    };

    proto.grabPlayerTransferRecords = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, gameId: providerId};
        this.gameService.grabPlayerTransferRecords.request(data);
        this.gameService.grabPlayerTransferRecords.once(callback);
    };

    proto.getFavoriteGames = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId};
        this.gameService.getFavoriteGames.request(data);
        this.gameService.getFavoriteGames.once(callback);
    };

    proto.addFavoriteGame = function (callback, requestData) {
        var data = requestData || {gameId: providerId};
        this.gameService.addFavoriteGame.request(data);
        this.gameService.addFavoriteGame.once(callback);
    };

    proto.removeFavoriteGame = function (callback, requestData) {
        var data = requestData || {gameId: providerId};
        this.gameService.removeFavoriteGame.request(data);
        this.gameService.removeFavoriteGame.once(callback);
    };

    proto.searchGame = function (callback, requestData) {
        var data = requestData || {platfomrId: providerId};
        this.gameService.searchGame.request(data);
        this.gameService.searchGame.once(callback);
    };

    proto.searchGameByGroup = function (callback, requestData) {
        var data = requestData || {platformId: 4, groups: [3, 4, 5]};
        this.gameService.searchGameByGroup.request(data);
        this.gameService.searchGameByGroup.once(callback);
    };

    proto.getGamePassword = function (callback, requestData) {
        var data = requestData || {platformId: 1};
        this.gameService.getGamePassword.request(data);
        this.gameService.getGamePassword.once(callback);
    };

    proto.modifyGamePassword = function (callback, requestData) {
        var data = requestData || {platformId: 1};
        this.gameService.modifyGamePassword.request(data);
        this.gameService.modifyGamePassword.once(callback);
    };

    if (isNode) {
        module.exports = ClientGameAPITest;
    } else {
        define([], function () {
            return ClientGameAPITest;
        });
    }

})();
