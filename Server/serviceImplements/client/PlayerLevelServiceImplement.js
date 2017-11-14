var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PlayerLevelService = require("./../../services/client/ClientServices").PlayerLevelService;
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var constServerCode = require('./../../const/constServerCode');

var PlayerLevelServiceImplement = function () {
    PlayerLevelService.call(this);

    this.getLevel.expectsData = '';
    this.getLevel.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerLevel, [{playerId: conn.playerId}], isValidData);
    };

    this.getAllLevel.expectsData = '';
    this.getAllLevel.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerPlatformLevel, [conn.playerId], isValidData);
    };

    this.getLevelReward.expectsData = '';
    this.getLevelReward.onRequest = function (wsFunc, conn, data) {
        var isValidData =  Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getLevelRewardForPlayer, [{playerId: conn.playerId}], isValidData);
    };


    this.upgrade.expectsData= '';
    this.upgrade.onRequest = function (wsFunc, conn, data) {
        var isValidData =  Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerLevelUpgrade, [conn.playerId], isValidData);
    }


};

var proto = PlayerLevelServiceImplement.prototype = Object.create(PlayerLevelService.prototype);
proto.constructor = PlayerLevelServiceImplement;

module.exports = PlayerLevelServiceImplement;

