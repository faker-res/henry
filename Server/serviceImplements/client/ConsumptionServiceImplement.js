var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ConsumptionService = require("./../../services/client/ClientServices").ConsumptionService;
var dbPlayerConsumptionRecord = require('./../../db_modules/dbPlayerConsumptionRecord');
var constSystemParam = require('../../const/constSystemParam');

var ConsumptionServiceImplement = function(){
    ConsumptionService.call(this);

    //getLastConsumptions api handler
    this.getLastConsumptions.expectsData = 'playerId: String';
    this.getLastConsumptions.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(conn.playerId);
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbPlayerConsumptionRecord.getLastConsumptionsAPI, [conn.playerId, data.startIndex, data.requestCount], isValidData
        );
    };

    //search api handler
    this.search.expectsData = '';
    this.search.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(conn.playerId);
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbPlayerConsumptionRecord.searchAPI,
            [conn.playerId, data.startTime, data.endTime, data.providerId, data.gameId, data.startIndex, data.requestCount], isValidData
        );
    };

};

var proto = ConsumptionServiceImplement.prototype = Object.create(ConsumptionService.prototype);
proto.constructor = ConsumptionServiceImplement;

module.exports = ConsumptionServiceImplement;