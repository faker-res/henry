var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var GameService = require("./../../services/provider/ProviderServices").GameService;
var dbGame = require('./../../db_modules/dbGame');
var constServerCode = require("./../../const/constServerCode");

var GameServiceImplement = function () {
    GameService.call(this);

    this.add.expectsData = 'name: String';
    this.add.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name);
        WebSocketUtil.performAction(conn, wsFunc, data,dbGame.createGameAPI, [data], isValidData);
    };

    this.update.expectsData = 'gameId';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameId && (!data.provider));
        WebSocketUtil.performProviderAction(conn, wsFunc, data,dbGame.updateGameAPI, [{gameId: data.gameId}, data], isValidData, data);
    };

    this.delete.expectsData = 'gameId';
    this.delete.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameId);
        WebSocketUtil.performProviderAction(conn, wsFunc, data,dbGame.deleteGameByGameCode, [data.gameId], isValidData, data);
    };

    this.changeStatus.expectsData = 'gameId';
    this.changeStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameId);
        WebSocketUtil.performProviderAction(conn, wsFunc, data,dbGame.updateGameAPI, [{gameId: data.gameId}, data], isValidData, data);
    };

    this.modifyCode.expectsData = 'gameId, oldCode, newCode';
    this.modifyCode.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameId && data.oldCode && data.newCode);
        WebSocketUtil.responsePromise(conn, wsFunc, data,dbGame.updateGameAPI, [{gameId: data.gameId, code: data.oldCode}, {code: data.newCode}], isValidData, true, true).then(
            res => {
                var resObj = {status: constServerCode.SUCCESS, gameId: data.gameId, oldCode: data.oldCode, newCode: data.newCode};
                return wsFunc.response(conn, resObj);
            },
            err => {
                return wsFunc.response(conn, {status: err.code || constServerCode.COMMON_ERROR, errorMessage: err.message, oldCode: data.oldCode, newCode: data.newCode});
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.syncData.expectsData = 'games';
    this.syncData.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.games);
        WebSocketUtil.performAction(conn, wsFunc, data,dbGame.syncGameData, [data.games], isValidData);
    };

    this.getGameList.expectsData = 'providerId';
    this.getGameList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.providerId);
        WebSocketUtil.performAction(conn, wsFunc, data,dbGame.getProviderGames, [data.providerId], isValidData);
    };

};

var proto = GameServiceImplement.prototype = Object.create(GameService.prototype);
proto.constructor = GameServiceImplement;

module.exports = GameServiceImplement;