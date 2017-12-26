(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientRewardPointsAPITest = function (rewardPointsService) {

        this.rewardPointsService = rewardPointsService;

        this.testRecordId = null;
    };

    var proto = ClientRewardPointsAPITest.prototype;

    var testPlayerId = !isNode && window.testPlayerId;
    var testPlayerObjId = !isNode && window.testPlayerObjId;

////////////////// Start - Init Data if running on server /////////////////
    if (isNode) {

        var dbPlayer = require('./../../db_modules/dbPlayerInfo');
        var dbRewardEvent = require('./../../db_modules/dbRewardEvent');
        var playerName = "testclientplayer";
        var Q = require('q');

        var testPlatformId = null;
        var testRewardEventId = null;

        proto.initGetPlayerInfo = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlayer.getPlayerInfo({name: playerName}
            ).then(
                function (data) {
                    testPlayerId = data.playerId;
                    testPlayerObjId = data._id;
                    testPlatformId = data.platform;
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

    proto.applyRewardPoint = function (callback, requestData) {
        let data = requestData || {};

        this.rewardPointsService.applyRewardPoint.request(data);
        this.rewardPointsService.applyRewardPoint.once(callback);
    };

    proto.getLoginRewardPoints = function (callback, requestData) {
        let data = requestData || {};

        this.rewardPointsService.getLoginRewardPoints.request(data);
        this.rewardPointsService.getLoginRewardPoints.once(callback);
    };

    proto.getRewardPointsRanking = function (callback, requestData) {
        let data = requestData || {};

        this.rewardPointsService.getRewardPointsRanking.request(data);
        this.rewardPointsService.getRewardPointsRanking.once(callback);
    };

    if (isNode) {
        module.exports = ClientRewardPointsAPITest;
    } else {
        define([], function () {
            return ClientRewardPointsAPITest;
        });
    }

})();
