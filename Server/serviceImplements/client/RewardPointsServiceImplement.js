const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const RewardPointsService = require("./../../services/client/ClientServices").RewardPointsService;
const dbRewardPoints = require('./../../db_modules/dbRewardPoints');
const dbUtility = require('./../../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbRewardPointsRanking = require('./../../db_modules/dbRewardPointsRanking');
const dbPlayerRewardPoints = require('./../../db_modules/dbPlayerRewardPoints');

let RewardPointsServiceImplement = function () {
    RewardPointsService.call(this);
    let self = this;

    this.applyRewardPoint.expectsData = "eventObjectId: String";
    this.applyRewardPoint.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.eventObjectId);
        let userInterface = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.applyRewardPoint, [conn.playerObjId, data.eventObjectId, userInterface], isValidData);
    };

    this.applyRewardPoints.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.eventObjectIds);
        let userInterface = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.applyRewardPoints, [conn.playerObjId, data.eventObjectIds, userInterface], isValidData);
    };

    this.deductPointManually.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.pointToDeduct && data.pointToDeduct < 0 && data.remark);
        let userInterface = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.deductPointManually, [conn.playerObjId, data.pointToDeduct, data.remark, userInterface], isValidData);
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

    this.getPointRule.expectsData = '';
    this.getPointRule.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.getPointRule, [conn.playerId, data.platformId], isValidData, false, false, Boolean(data.platformId));
    };


    this.applyPointToCredit.expectsData = '';
    this.applyPointToCredit.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.point)
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerRewardPoints.convertRewardPointsToCredit, [conn.playerId, data.point, "", inputDevice], isValidData, false, false, Boolean(data.platformId));
    };

    this.getMissonList.expectsData = '';
    this.getMissonList.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.getMissonList, [conn.playerId, data.platformId], isValidData, false, false, Boolean(data.platformId));

    };

    this.getPointChangeRecord.expectsData = '';
    this.getPointChangeRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.startTime && data.endTime && data.platformId && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbRewardPoints.getPointChangeRecord, [data.startTime, data.endTime, data.pointType, data.status, data.platformId, conn.playerId], isValidData);

    };
};


var proto = RewardPointsServiceImplement.prototype = Object.create(RewardPointsService.prototype);
proto.constructor = RewardPointsServiceImplement;

module.exports = RewardPointsServiceImplement;
