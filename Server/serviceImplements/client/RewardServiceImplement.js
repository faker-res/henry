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
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getRewardsForPlayer, [conn.playerId, data.rewardType, data.startTime, data.endTime, data.startIndex, data.requestCount, data.eventCode, conn.platformId], isValidData);
    };

    this.getRewardTask.expectsData = 'playerId: String';
    this.getRewardTask.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardTask.getPlayerCurRewardTaskByPlayerId, [{playerId: data.playerId}], isValidData);
    };

    this.requestConsumeRebate.expectsData = '';
    this.requestConsumeRebate.onRequest = function (wsFunc, conn, data) {
        data = data || {};
        var isValidData = Boolean(data && conn.playerId);
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.startCalculatePlayerConsumptionReturn, [conn.playerId, true, false, data.eventCode, userAgent], isValidData);
    };

    this.getConsumeRebateAmount.expectsData = '';
    this.getConsumeRebateAmount.onRequest = function (wsFunc, conn, data) {
        data = data || {};
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturn, [conn.playerId, data.eventCode], isValidData);
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

    this.getSignInfo.expectsData = '';
    this.getSignInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getPlayerConsecutiveRewardDetail, [conn.playerId, data.code, false, data.platformId], isValidData, false, false, Boolean(data.platformId));
    };

    this.getSignBonus.expectsData = '';
    this.getSignBonus.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerCheckInBonus, [userAgent, conn.playerId], isValidData);
    };

    this.getSlotInfo.expectsData = '';
    this.getSlotInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getSlotInfo, [conn.playerId, data.code, data.platformId], isValidData, false, false, Boolean(data.platformId));
    };

    this.getRandBonusInfo.expectsData = '';
    this.getRandBonusInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getRandBonusInfo, [conn.playerId, data.rewardCode, conn.platformId], isValidData);
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

    this.getPromoCode.expectsData = 'platformId: String';
    this.getPromoCode.onRequest = function(wsFunc, conn, data){
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getPromoCode, [conn.playerId, data.platformId, data.status], isValidData, false, false, true);
    };
    this.applyPromoCode.expectsData = 'promoCode: Number|String';
    this.applyPromoCode.onRequest = function(wsFunc, conn, data){
        let isValidData = Boolean(data && conn.playerId && data.promoCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.applyPromoCode, [conn.playerId, data.promoCode], isValidData, false, false, true);
    };

    this.markPromoCodeAsViewed.expectsData = 'promoCode: Number|String';
    this.markPromoCodeAsViewed.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.promoCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.markPromoCodeAsViewed, [conn.playerId, data.promoCode], isValidData);
    };

    this.getLimitedOffers.expectsData = 'platformId: String';
    this.getLimitedOffers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getLimitedOffers, [data.platformId, conn.playerId, data.status, data.period], isValidData, false, false, true);
    };
    this.applyLimitedOffers.expectsData = 'limitedOfferObjId: String';
    this.applyLimitedOffers.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.limitedOfferObjId);
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.applyLimitedOffers, [conn.playerId, ObjectId(data.limitedOfferObjId), null, userAgent], isValidData);
    };

    this.getLimitedOfferBonus.expectsData = 'platformId: String';
    this.getLimitedOfferBonus.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerReward.getLimitedOfferBonus, [data.platformId, data.period], isValidData, false, false, true);
    };

    this.setLimitedOfferShowInfo.expectsData = 'showInfo: Number|String';
    this.setLimitedOfferShowInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data);

        if (conn.viewInfo) {
            conn.viewInfo.limitedOfferInfo = data.showInfo;
        } else {
            conn.viewInfo = {limitedOfferInfo: data.showInfo};
        }

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.setShowInfo, [conn.playerId, "limitedOfferInfo", data.showInfo], isValidData, false, false, true);
    };

    // to enable or disable showing ShowInfo
    this.setBonusShowInfo.expectsData = 'setShowInfo: Number|String';
    this.setBonusShowInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data);

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.setBonusShowInfo, [conn.playerId, data.setShowInfo], isValidData);
    };
};


var proto = RewardServiceImplement.prototype = Object.create(RewardService.prototype);
proto.constructor = RewardServiceImplement;

module.exports = RewardServiceImplement;
