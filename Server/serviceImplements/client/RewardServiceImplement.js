WebSocketUtil = require("./../../server_common/WebSocketUtil");
var RewardService = require("./../../services/client/ClientServices").RewardService;
var dbRewardEvent = require('./../../db_modules/dbRewardEvent');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var constSystemParam = require('./../../const/constSystemParam');
var dbRewardTask = require('./../../db_modules/dbRewardTask');
var dbPlayerConsumptionWeekSummary = require('./../../db_modules/dbPlayerConsumptionWeekSummary');
var Q = require('q');
var constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
var SMSSender = require('../../modules/SMSSender');
var constServerCode = require('./../../const/constServerCode');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbPlayerReward = require('./../../db_modules/dbPlayerReward');

let RewardServiceImplement = function () {
    RewardService.call(this);
    var self = this;

    this.getRewardList.expectsData = 'platformId: String';
    this.getRewardList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getRewardEventForPlatform, [data.platformId], isValidData, false, false, true);
    };

    this.getPlayerRewardList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getPlayerRewardList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getRewardsForPlayer, [conn.playerId, data.rewardType, data.startTime, data.endTime, data.startIndex, data.requestCount], isValidData);
    };

    this.getRewardTask.expectsData = 'playerId: String';
    this.getRewardTask.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardTask.getPlayerCurRewardTaskByPlayerId, [{playerId: data.playerId}], isValidData);
    };

    this.requestConsumeRebate.expectsData = '';
    this.requestConsumeRebate.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.startCalculatePlayerConsumptionReturn, [conn.playerId, true], isValidData);
    };

    this.getConsumeRebateAmount.expectsData = '';
    this.getConsumeRebateAmount.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturn, [conn.playerId], isValidData);
    };

    this.isValidForFirstTopUpReward.expectsData = 'playerId: String';
    this.isValidForFirstTopUpReward.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.isPlayerIdValidForFirstTopUpReward, [data.playerId], isValidData);
    };

    this.createFirstTopUpRewardProposal.expectsData = 'topUpRecordId: [], code: String';
    this.createFirstTopUpRewardProposal.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent;
        var isValidData = Boolean(data && conn.playerId && data.topUpRecordId && data.code);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.applyForFirstTopUpRewardProposal, [data.userAgent, null, conn.playerId, data.topUpRecordId, data.code], isValidData);
    };

    this.applyProviderReward.expectsData = 'code: String, amount: Number|String';
    this.applyProviderReward.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent;
        var isValidData = Boolean(data && data.code && conn.playerId && data.amount);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.applyForGameProviderRewardAPI, [data.userAgent, conn.playerId, data.code, data.amount], isValidData);
    };

    this.applyRewardEvent.expectsData = 'code: String';
    this.applyRewardEvent.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.code);
        data.data = data.data || {};
        data.data.requestId = data.requestId || "";
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent;
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.applyRewardEvent, [data.userAgent, conn.playerId, data.code, data.data], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
                //SMSSender.sendByPlayerId(conn.playerId, constPlayerSMSSetting.APPLY_REWARD);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.getPlayerReferralList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getPlayerReferralList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerReferralList, [conn.playerId, data.startIndex, data.requestCount, !data.sort, data.status], isValidData);
    };

    this.getConsecutiveLoginRewardDay.expectsData = 'playerId: String, code: String';
    this.getConsecutiveLoginRewardDay.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.code && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getConsecutiveLoginRewardDay, [conn.playerId, data.code], isValidData);
    };

    this.getTopUpPromoList.expectsData = 'clientType: Number';
    this.getTopUpPromoList.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.clientType && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getTopUpPromoList, [conn.playerId, data.clientType], isValidData);
    };

    this.getEasterEggPlayerInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getEasterEggPlayerInfo, [data.platformId], isValidData, false, false, true);
    };

    this.getPromoCode.expectsData = 'playerId: String, platformId: String';
    this.getPromoCode.onRequest = function(wsFunc, conn, data){
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getPromoCode, [data.playerId, data.platformId, data.status], isValidData, false, false, true);
    };
    this.applyPromoCode.expectsData = 'platformObjId: String';
    this.applyPromoCode.onRequest = function(wsFunc, conn, data){
        let isValidData = Boolean(data && data.playerName && data.promoCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.applyPromoCode, [ObjectId(data.platformObjId), data.playerName, data.promoCode], isValidData, false, false, true);
    };
    this.getLimitedOffers.expectsData = 'platformId: String';
    this.getLimitedOffers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getLimitedOffers, [data.platformId], isValidData, false, false, true);
    };
    this.applyLimitedOffers.expectsData = 'playerName: String, platformId: String, limitedOfferObjId: String';
    this.applyLimitedOffers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.playerName && data.limitedOfferObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.applyLimitedOffers, [data.platformId, data.playerName, ObjectId(data.limitedOfferObjId)], isValidData, false, false, true);
    };

};


var proto = RewardServiceImplement.prototype = Object.create(RewardService.prototype);
proto.constructor = RewardServiceImplement;

module.exports = RewardServiceImplement;
