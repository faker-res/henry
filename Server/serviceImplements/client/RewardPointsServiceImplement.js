const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const RewardPointsService = require("./../../services/client/ClientServices").RewardPointsService;
const dbRewardPoints = require('./../../db_modules/dbRewardPoints');
const dbUtility = require('./../../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbRewardPointsRanking = require('./../../db_modules/dbRewardPointsRanking');

let RewardPointsServiceImplement = function () {
    RewardPointsService.call(this);
    let self = this;

    this.applyRewardPoint.expectsData = "eventObjectId: String";
    this.applyRewardPoint.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.eventObjectId);
        let userInterface = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.applyRewardPoint, [conn.playerObjId, data.eventObjectId, userInterface], isValidData);
    };

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
	
    this.getTopUpRewardPointsEvent.expectsData = '';
    this.getTopUpRewardPointsEvent.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.getTopUpRewardPointsEvent, [conn.playerId, data.platformId], isValidData, false, false, Boolean(data.platformId));
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
