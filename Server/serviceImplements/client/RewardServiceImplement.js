var WebSocketUtil = require("./../../server_common/WebSocketUtil");
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

var RewardServiceImplement = function () {
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
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.startCalculatePlayerConsumptionReturn, [conn.playerId], isValidData);
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
        var isValidData = Boolean(data && conn.playerId && data.topUpRecordId && data.code);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.applyForFirstTopUpRewardProposal, [null, conn.playerId, data.topUpRecordId, data.code], isValidData);
    };

    this.applyProviderReward.expectsData = 'code: String, amount: Number|String';
    this.applyProviderReward.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.code && conn.playerId && data.amount);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.applyForGameProviderRewardAPI, [conn.playerId, data.code, data.amount], isValidData);
    };

    this.applyRewardEvent.expectsData = 'code: String';
    this.applyRewardEvent.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.code);
        data.data = data.data || {};
        data.data.requestId = data.requestId || "";
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.applyRewardEvent, [conn.playerId, data.code, data.data], isValidData, true, false, false).then(
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

};


var proto = RewardServiceImplement.prototype = Object.create(RewardService.prototype);
proto.constructor = RewardServiceImplement;

module.exports = RewardServiceImplement;
