(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientPlayerLevelAPITest = function (playerLevelService) {
        this.playerLevelService = playerLevelService;

        this.testRecordId = null;
    };

    var proto = ClientPlayerLevelAPITest.prototype;

    var testPlayerId = !isNode && window.testPlayerId;

////////////////// Start - Init Data if running on server /////////////////
    if (isNode) {

        var dbPlayer = require('./../../db_modules/dbPlayerInfo');
        var playerName = "testclientplayer";
        var Q = require('q');

        proto.initGetPlayerInfo = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlayer.getPlayerInfo({name: playerName}
            ).then(
                function (data) {
                    testPlayerId = data.playerId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };
    }
////////////////// End - Init Data if running on server /////////////////

    proto.getLevel = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};
        this.playerLevelService.getLevel.request(data);
        this.playerLevelService.getLevel.once(callback);
    };

    proto.getLevelReward = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId};
        this.playerLevelService.getLevelReward.request(data);
        this.playerLevelService.getLevelReward.once(callback);
    };

    proto.getAllLevel = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};
        this.playerLevelService.getAllLevel.request(data);
        this.playerLevelService.getAllLevel.once(callback);
    };

    proto.upgrade = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};
        this.playerLevelService.upgrade.request(data);
        this.playerLevelService.upgrade.once(callback);
    };

    if(isNode){
        module.exports = ClientPlayerLevelAPITest;
    } else {
        define([], function(){
            return ClientPlayerLevelAPITest;
        });
    }

})();
