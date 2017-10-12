(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientRewardAPITest = function (rewardService) {

        this.rewardService = rewardService;

        this.testRecordId = null;
    };

    var proto = ClientRewardAPITest.prototype;

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

    proto.getRewardList = function (callback, requestData) {
        var data = requestData || {platformId: '0'};

        this.rewardService.getRewardList.request(data);
        this.rewardService.getRewardList.once(callback);
    };

    proto.getPlayerRewardList = function (callback, requestData) {

        var data = requestData || {
            rewardType: "PlayerConsumptionReturn",
            startTime: Date.now() - 1000 * 60 * 60 * 24 * 30,
            endTime: Date.now(),
            startIndex: 0,
            requestCount: 15
        };

        this.rewardService.getPlayerRewardList.request(data);
        this.rewardService.getPlayerRewardList.once(callback);
    };

    proto.getRewardTask = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};

        this.rewardService.getRewardTask.request(data);
        this.rewardService.getRewardTask.once(callback);
    };

    proto.requestConsumeRebate = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};

        this.rewardService.requestConsumeRebate.request(data);
        this.rewardService.requestConsumeRebate.once(callback);
    };

    proto.getConsumeRebateAmount = function (callback, requestData) {
        var data = requestData || {};

        this.rewardService.getConsumeRebateAmount.request(data);
        this.rewardService.getConsumeRebateAmount.once(callback);
    };

    proto.isValidForFirstTopUpReward = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};

        this.rewardService.isValidForFirstTopUpReward.request(data);
        this.rewardService.isValidForFirstTopUpReward.once(callback);
    };

    proto.createFirstTopUpRewardProposal = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};
        this.rewardService.createFirstTopUpRewardProposal.request(data);
        this.rewardService.createFirstTopUpRewardProposal.once(callback);
    };

    proto.applyProviderReward = function (callback, requestData) {

        var data = requestData || {playerId: testPlayerId};
        this.rewardService.applyProviderReward.request(data);
        this.rewardService.applyProviderReward.once(callback);
    };

    proto.getBonusList = function (callback, requestData) {
        var data = requestData || {};
        this.rewardService.getBonusList.request(data);
        this.rewardService.getBonusList.once(callback);
    };

    proto.applyBonus = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId,
                bonusId: 1,
                amount: 40
            };
        this.rewardService.applyBonus.request(data);
        this.rewardService.applyBonus.once(callback);
    };

    proto.getAppliedBonusList = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId};
        this.rewardService.getAppliedBonusList.request(data);
        this.rewardService.getAppliedBonusList.once(callback);
    };

    proto.cancelAppliedBonus = function (callback, requestData) {
        var data = requestData || {proposalId: xxxxx};
        this.rewardService.cancelAppliedBonus.request(data);
        this.rewardService.cancelAppliedBonus.once(callback);
    };

    proto.applyRewardEvent = function (callback, requestData) {
        var sendReq = {
            code: requestData.code,
            data: {
                requestId: requestData.requestId,
                //topUpRecordId: requestData.topUpRecordId,
                topUpRecordIds: [requestData.topUpRecordId],
                code: requestData.code,
                amount: requestData.amount,
                referralName: requestData.referralName
            }
        }
        var data = sendReq ||
            {
                code: 1,
                data: {topUpRecordId: "57e2373910afeeb43039ef43"}
            };
        this.rewardService.applyRewardEvent.request(data);
        this.rewardService.applyRewardEvent.once(callback);
    };

    proto.getPlayerReferralList = function (callback, requestData) {
        var data = requestData || {};
        this.rewardService.getPlayerReferralList.request(data);
        this.rewardService.getPlayerReferralList.once(callback);
    };

    proto.getConsecutiveLoginRewardDay = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.getConsecutiveLoginRewardDay.request(data);
        this.rewardService.getConsecutiveLoginRewardDay.once(callback);
    };

    proto.getTopUpPromoList = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.getTopUpPromoList.request(data);
        this.rewardService.getTopUpPromoList.once(callback);
    };

    proto.getPromoCode = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.getPromoCode.request(data);
        this.rewardService.getPromoCode.once(callback);
    };

    proto.applyPromoCode = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.applyPromoCode.request(data);
        this.rewardService.applyPromoCode.once(callback);
    };

    proto.getLimitedOffers = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.getLimitedOffers.request(data);
        this.rewardService.getLimitedOffers.once(callback);
    };

    proto.applyLimitedOffers = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.applyLimitedOffers.request(data);
        this.rewardService.applyLimitedOffers.once(callback);
    };

    proto.getLimitedOfferBonus = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.getLimitedOfferBonus.request(data);
        this.rewardService.getLimitedOfferBonus.once(callback);
    };

    proto.setLimitedOfferShowInfo = function (callback, requestData) {
        let data = requestData || {};
        this.rewardService.setLimitedOfferShowInfo.request(data);
        this.rewardService.setLimitedOfferShowInfo.once(callback);
    };

    if (isNode) {
        module.exports = ClientRewardAPITest;
    } else {
        define([], function () {
            return ClientRewardAPITest;
        });
    }

})();
