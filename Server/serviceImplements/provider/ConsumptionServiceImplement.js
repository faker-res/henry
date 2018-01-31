'use strict'

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ConsumptionService = require("./../../services/provider/ProviderServices").ConsumptionService;

var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var dbPlayerConsumptionRecord = require('./../../db_modules/dbPlayerConsumptionRecord');
var constServerCode = require('./../../const/constServerCode');

var constMessageClientTypes = require('./../../const/constMessageClientTypes');


var ConsumptionServiceImplement = function () {
    ConsumptionService.call(this);

    var self = this;

    this.transferIn.expectsData = 'playerId, providerId, amount: Number';
    this.transferIn.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.providerId && typeof data.amount === 'number' && data.amount > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.transferPlayerCreditToProvider, [data.playerId, null, data.providerId, data.amount], isValidData);
    };

    this.transferOut.expectsData = 'playerId, providerId';
    this.transferOut.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.providerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.transferPlayerCreditFromProvider, [data.playerId, null, data.providerId, -1], isValidData);
    };

    this.addConsumption.expectsData = 'userName, platformId, providerId, gameId, amount: Number, validAmount: Number';
    this.addConsumption.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.userName && data.hasOwnProperty("platformId") && data.hasOwnProperty("providerId") && data.hasOwnProperty("gameId")
            && typeof data.amount === 'number' && data.amount >= 0 && typeof data.validAmount === 'number' && data.validAmount >= 0);

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord, [data], isValidData);

        // for (let i = 0; i < 100; i++) {
        //     WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord, [data], isValidData);
        // }
    };

    this.addMissingConsumption.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.userName && data.hasOwnProperty("platformId") && data.hasOwnProperty("providerId") && data.hasOwnProperty("gameId")
            && typeof data.amount === 'number' && data.amount >= 0 && typeof data.validAmount === 'number' && data.validAmount >= 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.addMissingConsumption, [data], isValidData);
    };

    this.updateTransferProgress.expectsData = 'playerId, data';
    this.updateTransferProgress.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.data);
        self.sendMessage(constMessageClientTypes.CLIENT, "game", "getTransferProgress", data);
        wsFunc.response(conn, {status: constServerCode.SUCCESS, data: {playerId: data.playerId}});
    };

    this.addConsumptionList.expectsData = '';
    this.addConsumptionList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.consumptionList && data.consumptionList.length > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.sendExternalPlayerConsumptionListSettlement, [data], isValidData);
    };

    this.correctConsumptionList.expectsData = '';
    this.correctConsumptionList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.consumptionList && data.consumptionList.length > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.sendExternalUpdatePlayerConsumptionListSettlement, [data], isValidData);
    };

    this.updateConsumption.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.userName && data.hasOwnProperty("platformId") && data.hasOwnProperty("providerId") && data.hasOwnProperty("gameId")
            && typeof data.amount === 'number' && data.amount >= 0 && typeof data.validAmount === 'number' && data.validAmount >= 0 && data.orderNo);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.updateConsumptionRecord, [data], isValidData);
    };

};

var proto = ConsumptionServiceImplement.prototype = Object.create(ConsumptionService.prototype);
proto.constructor = ConsumptionServiceImplement;

module.exports = ConsumptionServiceImplement;