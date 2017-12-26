WebSocketUtil = require("./../../server_common/WebSocketUtil");
var RewardPointsService = require("./../../services/client/ClientServices").RewardPointsService;
var dbRewardEvent = require('./../../db_modules/dbRewardEvent');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var dbRewardPoints = require('./../../db_modules/dbRewardPoints');
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
const dbRewardPointsRanking = require('./../../db_modules/dbRewardPointsRanking');

let RewardPointsServiceImplement = function () {
    RewardPointsService.call(this);
    var self = this;

    this.getLoginRewardPoints.expectsData = '';
    this.getLoginRewardPoints.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.getLoginRewardPoints, [conn.playerId, data.platformId], isValidData, false, false, Boolean(data.platformId));
    };

    this.getGameRewardPoints.expectsData = '';
    this.getGameRewardPoints.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.getGameRewardPoints, [conn.playerId, data.platformId], isValidData, false, false, Boolean(data.platformId));
    };

    this.getRewardPointsRanking.expectsData = 'platformId: String';
    this.getRewardPointsRanking.onRequest = function (wsFunc, conn, data) {
        console.log("getRewardPointsRankingData",data);
        let isValidData = Boolean(data && data.platformId); console.log("isValidData",isValidData);
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPointsRanking.getRewardPointsRanking, [data.platformId, data.totalRank], isValidData, false, false, true);
    };



};


var proto = RewardPointsServiceImplement.prototype = Object.create(RewardPointsService.prototype);
proto.constructor = RewardPointsServiceImplement;

module.exports = RewardPointsServiceImplement;
