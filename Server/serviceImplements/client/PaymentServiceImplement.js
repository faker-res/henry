/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PaymentService = require("./../../services/client/ClientServices").PaymentService;
var dbPlayerTopUpIntentRecord = require('./../../db_modules/dbPlayerTopUpIntentRecord');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var constServerCode = require('./../../const/constServerCode');
var dbPlayerTopUpRecord = require('./../../db_modules/dbPlayerTopUpRecord');
var constSystemParam = require('../../const/constSystemParam');
var pmsAPI = require("../../externalAPI/pmsAPI.js");
var constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
var SMSSender = require('../../modules/SMSSender');

var PaymentServiceImplement = function () {
    PaymentService.call(this);
    var self = this;

    //add api handler
    this.createOnlineTopupProposal.expectsData = 'topupType: String, amount: Number';
    this.createOnlineTopupProposal.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.hasOwnProperty("topupType") && data.amount);
        var merchantUseType = data.merchantUseType || 1;
        var clientType = data.clientType || 1;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.addOnlineTopupRequest, [conn.playerId, data, merchantUseType, clientType], isValidData);
    };

    this.getTopupList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getTopupList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, null, false], isValidData);
    };

    this.getTopupHistory.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getTopupHistory.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpHistory, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, data.status], isValidData);
    };

    this.getOnlineTopupType.expectsData = 'merchantUse: ?, clientType: ?';
    this.getOnlineTopupType.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.merchantUse && data.clientType);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getOnlineTopupType, [conn.playerId, data.merchantUse, data.clientType], isValidData);
    };

    this.getBonusList.expectsData = '';
    this.getBonusList.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getBonusList, [data], true);
    };

    this.applyBonus.expectsData = 'bonusId: Number|String, amount: Number|String, honoreeDetails: String';
    this.applyBonus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.bonusId && data.amount);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.applyBonus, [conn.playerId, data.bonusId, data.amount, data.honoreeDetail], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
                //SMSSender.sendByPlayerId(conn.playerId, constPlayerSMSSetting.APPLY_BONUS);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.getBonusRequestList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getBonusRequestList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getAppliedBonusList, [conn.playerId, data.startIndex, data.requestCount, data.startTime, data.endTime, data.status, !data.sort], isValidData);
    };

    this.cancelBonusRequest.expectsData = 'proposalId: String';
    this.cancelBonusRequest.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.cancelBonusRequest, [conn.playerId, data.proposalId], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
                SMSSender.sendByPlayerId(conn.playerId, constPlayerSMSSetting.CANCEL_BONUS);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.requestManualTopup.expectsData = 'amount: Number|String, depositMethod: ?, lastBankcardNo: ?, provinceId: String|Number, cityId: String|Number';
    this.requestManualTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && data.depositMethod && data.lastBankcardNo && data.provinceId && data.cityId);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerTopUpRecord.addManualTopupRequest, [conn.playerId, data, "CLIENT"], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
                // SMSSender.sendByPlayerId(conn.playerId, constPlayerSMSSetting.MANUAL_TOPUP);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.requestAlipayTopup.expectsData = 'amount: Number|String';
    this.requestAlipayTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.requestAlipayTopup, [conn.playerId, data.amount], isValidData);
    };

    this.cancelManualTopupRequest.expectsData = 'proposalId: String';
    this.cancelManualTopupRequest.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.cancelManualTopupRequest, [conn.playerId, data.proposalId], isValidData);
    };

    this.cancelAlipayTopup.expectsData = 'proposalId: String';
    this.cancelAlipayTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.cancelAlipayTopup, [conn.playerId, data.proposalId], isValidData);
    };

    this.delayManualTopupRequest.expectsData = 'proposalId: String, delayTime: Number|String';
    this.delayManualTopupRequest.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId && data.delayTime);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.delayManualTopupRequest, [conn.playerId, data.proposalId, data.delayTime], isValidData);
    };

    this.modifyManualTopupRequest.expectsData = 'proposalId: String, amount: Number|String, bankTypeId: ?, lastBankcardNo: ?, provinceId, cityId, districtId';
    this.modifyManualTopupRequest.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId && data.amount && data.amount > 0 && data.bankTypeId && data.lastBankcardNo && data.provinceId && data.cityId && data.districtId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.modifyManualTopupRequest, [conn.playerId, data.proposalId, data], isValidData);
    };

    this.getManualTopupRequestList.expectsData = '';
    this.getManualTopupRequestList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getManualTopupRequestList, [conn.playerId], isValidData);
    };

    this.getAlipayTopupRequestList.expectsData = '';
    this.getAlipayTopupRequestList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getAlipayTopupRequestList, [conn.playerId], isValidData);
    };

    this.manualTopupStatusNotify.addListener(
        function (data) {
            WebSocketUtil.notifyMessageClient(self, "manualTopupStatusNotify", data);
        }
    );

    this.onlineTopupStatusNotify.addListener(
        function (data) {
            WebSocketUtil.notifyMessageClient(self, "onlineTopupStatusNotify", data);
        }
    );

    this.getProvinceList.expectsData = '';
    this.getProvinceList.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, getProvinceList, [], isValidData, false, false, true);

        function getProvinceList() {
            return pmsAPI.foundation_getProvinceList({}).then(data => data.provinces);
        }
    };

    this.getCityList.expectsData = 'provinceId';
    this.getCityList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.provinceId != null);
        WebSocketUtil.performAction(conn, wsFunc, data, getCityList, [data.provinceId], isValidData, false, false, true);

        function getCityList(provinceId) {
            return pmsAPI.foundation_getCityList({provinceId: provinceId}).then(data => data.cities);
        }
    };

    this.getDistrictList.expectsData = 'provinceId, cityId';
    this.getDistrictList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.provinceId != null && data.cityId != null);
        WebSocketUtil.performAction(conn, wsFunc, data, getDistrictList, [data.provinceId, data.cityId], isValidData, false, false, true);

        function getDistrictList(provinceId, cityId) {
            return pmsAPI.foundation_getDistrictList({
                provinceId: provinceId,
                cityId: cityId
            }).then(data => data.districts);
        }
    };

    this.getBankTypeList.expectsData = '';
    this.getBankTypeList.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, getBankTypeList, [], isValidData, false, false, true);

        function getBankTypeList() {
            return pmsAPI.bankcard_getBankTypeList({}).then(data => data.data);
        }
    };

    this.checkExpiredManualTopup.expectsData = 'proposalId: String';
    this.checkExpiredManualTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.checkExpiredManualTopUp, [conn.playerId, data.proposalId], isValidData);
    };

    this.getValidFirstTopUpRecordList.expectsData = 'period, [startIndex]: Number, [requestCount]: Number';
    this.getValidFirstTopUpRecordList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.period && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getValidFirstTopUpRecordList, [conn.playerId, data.period, data.startIndex, data.requestCount, !data.sort], isValidData);
    };

    this.getValidTopUpReturnRecordList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getValidTopUpReturnRecordList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, false, true], isValidData);
    };

    this.getValidTopUpRewardRecordList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getValidTopUpRewardRecordList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, false, true], isValidData);
    };

};
var proto = PaymentServiceImplement.prototype = Object.create(PaymentService.prototype);
proto.constructor = PaymentServiceImplement;

module.exports = PaymentServiceImplement;