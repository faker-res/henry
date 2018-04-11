var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var DXMissionService = require("./../../services/client/ClientServices").DXMissionService;
var dbDxMission = require('./../../db_modules/dbDxMission');
var constServerCode = require('./../../const/constServerCode');

var DXMissionServiceImplement = function () {
    DXMissionService.call(this);

    this.getDxMission.expectsData = '';
    this.getDxMission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.getDxMission, [{playerId: conn.playerId}], isValidData);
    };

    this.createDxMission.expectsData = '';
    this.createDxMission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.createDxMission, [{playerId: conn.playerId}], isValidData);
    };

    this.updateDxMission.expectsData = '';
    this.updateDxMission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId)
        WebSocketUtil.performAction(conn, wsFunc, data, dbDxMission.updateDxMission, [{playerId: conn.playerId}], isValidData);
    }

};

var proto = DXMissionServiceImplement.prototype = Object.create(DXMissionService.prototype);
proto.constructor = DXMissionServiceImplement;

module.exports = DXMissionServiceImplement;
