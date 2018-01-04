const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PaymentService = require("./../../services/client/ClientServices").PaymentService;
const dbPlayerTopUpIntentRecord = require('./../../db_modules/dbPlayerTopUpIntentRecord');
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const constServerCode = require('./../../const/constServerCode');
const dbPlayerTopUpRecord = require('./../../db_modules/dbPlayerTopUpRecord');
const constSystemParam = require('../../const/constSystemParam');
const pmsAPI = require("../../externalAPI/pmsAPI.js");
const constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
const SMSSender = require('../../modules/SMSSender');
const dbPlayerPayment = require('../../db_modules/dbPlayerPayment');
const uaParser = require('ua-parser-js');

var PaymentServiceImplement = function () {
    PaymentService.call(this);
    var self = this;

    //add api handler
    this.createOnlineTopupProposal.expectsData = 'topupType: String, amount: Number';
    this.createOnlineTopupProposal.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }
        var isValidData = Boolean(data && data.hasOwnProperty("topupType") && data.amount && Number.isInteger(data.amount) && data.amount < 10000000);
        var merchantUseType = data.merchantUseType || 1;
        var clientType = data.clientType || 1;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.addOnlineTopupRequest, [data.userAgent, conn.playerId, data, merchantUseType, clientType], isValidData);
    };

    this.getTopupList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getTopupList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, data.bDirty, data.bSinceLastConsumption], isValidData);
    };

    this.getTopupHistory.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getTopupHistory.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.startTime && data.endTime);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;

        let fourteenDayAgo = (new Date).setDate((new Date).getDate() - 14);

        if (data && data.startTime && new Date(data.startTime) < new Date(fourteenDayAgo)) {
            data.startTime = new Date(fourteenDayAgo);
        }

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
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent;
        var isValidData = Boolean(conn.playerId && data && data.bonusId && typeof data.amount === 'number' && data.amount > 0);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.applyBonus, [data.userAgent, conn.playerId, data.bonusId, data.amount, data.honoreeDetail], isValidData, true, false, false).then(
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
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && data.depositMethod && Number.isInteger(data.amount) && data.amount < 10000000);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerTopUpRecord.addManualTopupRequest, [data.userAgent, conn.playerId, data, "CLIENT"], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
                // SMSSender.sendByPlayerId(conn.playerId, constPlayerSMSSetting.MANUAL_TOPUP);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.getCashRechargeStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerTopUpRecord.getCashRechargeStatus, [conn.playerId], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.requestAlipayTopup.expectsData = 'amount: Number|String';
    this.requestAlipayTopup.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && data.alipayName && Number.isInteger(data.amount) && data.amount < 10000000);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.requestAlipayTopup, [data.userAgent, conn.playerId, data.amount, data.alipayName, data.alipayAccount, data.bonusCode, "CLIENT", null, null, data.realName], isValidData);
    };

    this.requestWechatTopup.expectsData = 'amount: Number|String';
    this.requestWechatTopup.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && Number.isInteger(data.amount) && data.amount < 10000000);
        // if ([10, 20, 50, 100].indexOf(data.amount) < 0) {
        //     isValidData = false;
        // }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.requestWechatTopup, [!Boolean(data.notUseQR), data.userAgent, conn.playerId, data.amount, data.wechatName, data.wechatAccount, data.bonusCode, "CLIENT"], isValidData);
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

    this.cancelWechatTopup.expectsData = 'proposalId: String';
    this.cancelWechatTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.cancelWechatTopup, [conn.playerId, data.proposalId], isValidData);
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

    this.getWechatTopupRequestList.expectsData = '';
    this.getWechatTopupRequestList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getWechatTopupRequestList, [conn.playerId], isValidData);
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
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, null, false], isValidData);
    };

    this.getValidTopUpRewardRecordList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getValidTopUpRewardRecordList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort, false, true], isValidData);
    };

    this.getPlayerWechatPayStatus.expectsData = 'playerId: String';
    this.getPlayerWechatPayStatus.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerWechatPayStatus, [conn.playerId], isValidData);
    };

    this.getPlayerAliPayStatus.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerAliPayStatus, [conn.playerId], isValidData);
    };

    this.getAlipaySingleLimit.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPayment.getAlipaySingleLimit, [conn.playerId], isValidData);
    };

    this.getMerchantSingleLimits.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPayment.getMerchantSingleLimits, [conn.playerId], isValidData);
    };

    // quick pay
    this.requestQuickpayTopup.expectsData = 'amount: Number|String';
    this.requestQuickpayTopup.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
        }
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && data.quickpayName);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.requestQuickpayTopup, [conn.playerId, data.amount, data.quickpayName, data.quickpayAccount, "CLIENT"], isValidData);
    };

    this.cancelQuickpayTopup.expectsData = 'proposalId: String';
    this.cancelQuickpayTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.cancelQuickpayTopup, [conn.playerId, data.proposalId], isValidData);
    };

    this.getQuickpayTopupRequestList.expectsData = '';
    this.getQuickpayTopupRequestList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getQuickpayTopupRequestList, [conn.playerId], isValidData);
    };

    this.isFirstTopUp.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.isPlayerFirstTopUp, [conn.playerId], isValidData);
    };

};
var proto = PaymentServiceImplement.prototype = Object.create(PaymentService.prototype);
proto.constructor = PaymentServiceImplement;

module.exports = PaymentServiceImplement;
