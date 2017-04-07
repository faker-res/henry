var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ProviderService = require("./../../services/provider/ProviderServices").ProviderService;
var dbGameProvider = require('./../../db_modules/dbGameProvider');
var constServerCode = require("../../const/constServerCode");

var ProviderServiceImplement = function () {
    ProviderService.call(this);

    this.add.expectsData = 'code, name';
    this.add.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.code && data.name);
        WebSocketUtil.performAction(conn, wsFunc,  data,dbGameProvider.createGameProvider, [data], isValidData)
    };

    this.update.expectsData = 'providerId';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.providerId);
        WebSocketUtil.performProviderAction(conn, wsFunc,  data,dbGameProvider.updateGameProvider, [{providerId: data.providerId}, data], isValidData, data);
    };

    this.delete.expectsData = 'providerId';
    this.delete.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.providerId);
        WebSocketUtil.performProviderAction(conn, wsFunc,  data,dbGameProvider.delGameProviderByProviderId, [data.providerId], isValidData, data);
    };

    this.changeStatus.expectsData = 'providerId, status';
    this.changeStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.providerId && data.status);
        WebSocketUtil.performProviderAction(conn, wsFunc,  data,dbGameProvider.updateGameProvider, [{providerId: data.providerId}, data], isValidData, data);
    };

    this.getProviderList.expectsData = '';
    this.getProviderList.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc,  data,dbGameProvider.getAllGameProviders, [{}], true);
    };

    this.modifyCode.expectsData = 'oldCode, newCode';
    this.modifyCode.onRequest = function(wsFunc, conn, data) {
        var isValidData = Boolean(data && data.oldCode && data.newCode);
        WebSocketUtil.responsePromise(conn, wsFunc,  data,dbGameProvider.updateGameProvider, [{code: data.oldCode}, {code: data.newCode}], isValidData, true, true).then(
            res => {
                if( res){
                    wsFunc.response(conn, {status: constServerCode.SUCCESS, oldCode: data.oldCode, newCode:data.newCode});
                }
                else{
                    //if can't find provider to update, response error invalid data
                    wsFunc.response(conn, {status: constServerCode.INVALID_DATA, errorMessage: "Invalid Data", oldCode: data.oldCode, newCode:data.newCode});
                }
            },
            err=> {
                return wsFunc.response(conn, {status: err.code || constServerCode.COMMON_ERROR, errorMessage: err.message, oldCode: data.oldCode, newCode:data.newCode});
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.syncData.expectsData = 'providers: []+';
    this.syncData.onRequest = function(wsFunc, conn, data) {
        var isValidData = true;
        if( data && data.providers && data.providers.length > 0 ){
            for( var i = 0; i < data.providers.length; i++ ){
                var record = data.providers[i];
                if( !(record && record.hasOwnProperty("providerId")) ){
                    isValidData = false;
                }
            }
        }
        else{
            isValidData = false;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbGameProvider.updateGameProviders, [data.providers], isValidData);
    }

};

var proto = ProviderServiceImplement.prototype = Object.create(ProviderService.prototype);
proto.constructor = ProviderServiceImplement;

module.exports = ProviderServiceImplement;
