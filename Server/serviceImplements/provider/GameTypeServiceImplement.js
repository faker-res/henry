var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var GameTypeService = require("./../../services/provider/ProviderServices").GameTypeService;
var dbGameType = require('./../../db_modules/dbGameType');
var constServerCode = require("../../const/constServerCode");

var GameTypeServiceImplement = function () {
    GameTypeService.call(this);

    this.add.expectsData = 'gameTypeId, code, name';
    this.add.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameTypeId && data.code && data.name);
        WebSocketUtil.performAction(conn, wsFunc, data,dbGameType.addGameType, [data], isValidData);
    };

    this.update.expectsData = 'gameTypeId, [code], [name], [description]';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameTypeId && (data.code || data.name || data.description));
        WebSocketUtil.performProviderAction(conn, wsFunc, data,dbGameType.updateGameType, [{gameTypeId: data.gameTypeId}, data], isValidData, data);
    };

    this.modifyCode.expectsData = 'oldCode, newCode';
    this.modifyCode.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.oldCode && data.newCode);
        WebSocketUtil.responsePromise(conn, wsFunc, data,dbGameType.updateGameType, [{code: data.oldCode}, {code: data.newCode}], isValidData, true, true).then(
            res => {
                if( res){
                    wsFunc.response(conn, {status: constServerCode.SUCCESS, oldCode: data.oldCode, newCode:data.newCode});
                }
                else{
                    wsFunc.response(conn, {status: constServerCode.INVALID_DATA, errorMessage: "Invalid Data", oldCode: data.oldCode, newCode:data.newCode});
                }
            },
            err=> {
                return wsFunc.response(conn, {status: err.code || constServerCode.COMMON_ERROR, errorMessage: err.message, oldCode: data.oldCode, newCode:data.newCode});
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.delete.expectsData = 'gameTypeId';
    this.delete.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.gameTypeId);
        WebSocketUtil.performProviderAction(conn, wsFunc, data,dbGameType.deleteGameTypeByQuery, [{gameTypeId: data.gameTypeId}], isValidData, data);
    };

    this.syncData.expectsData = 'gameTypes: []';
    this.syncData.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && Array.isArray(data.gameTypes));
        WebSocketUtil.performAction(conn, wsFunc, data,dbGameType.syncData, [data.gameTypes], isValidData);
    };

    this.getGameTypeList.expectsData = '';
    this.getGameTypeList.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data,dbGameType.getGameTypeList, [], isValidData);
    };

};

var proto = GameTypeServiceImplement.prototype = Object.create(GameTypeService.prototype);
proto.constructor = GameTypeServiceImplement;

module.exports = GameTypeServiceImplement;