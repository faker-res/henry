const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PaymentService = require("./../../services/client/ClientServices").PaymentService;
const dbPlayerTopUpIntentRecord = require('./../../db_modules/dbPlayerTopUpIntentRecord');
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPlatformBankCardGroup = require('./../../db_modules/dbPlatformBankCardGroup');
const constServerCode = require('./../../const/constServerCode');
const dbPlayerTopUpRecord = require('./../../db_modules/dbPlayerTopUpRecord');
const constSystemParam = require('../../const/constSystemParam');
const pmsAPI = require("../../externalAPI/pmsAPI.js");
const constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
const SMSSender = require('../../modules/SMSSender');
const dbPlayerPayment = require('../../db_modules/dbPlayerPayment');
const uaParser = require('ua-parser-js');
const dbUtility = require('./../../modules/dbutility');

const RESTUtils = require('./../../modules/RESTUtils');

const dbOtherPayment = require('./../../db_modules/externalAPI/dbOtherPayment');

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

        let lastLoginIp = dbUtility.getIpAddress(conn);
        var isValidData = Boolean(data && data.hasOwnProperty("topupType") && data.hasOwnProperty("merchantName") && data.amount && Number.isInteger(data.amount) && data.amount < 10000000);
        var merchantUseType = data.merchantUseType || 1;
        var clientType = data.clientType || 1;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.addOnlineTopupRequest, [data.userAgent, conn.playerId, data, merchantUseType, clientType, data.topUpReturnCode, data.bPMSGroup, lastLoginIp], isValidData);
    };

    this.getTopupList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getTopupList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        if( !data.bSincelastPlayerWidthDraw ){
          data.bSincelastPlayerWidthDraw = true;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerTopUpList, [conn.playerId, data.topUpType, data.startTime, data.endTime, data.startIndex, data.requestCount,
          !data.sort, data.bDirty, data.bSinceLastConsumption, data.bSinceLastPlayerWidthDraw], isValidData);
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

    this.getOnlineTopupType.expectsData = 'clientType: ?';
    this.getOnlineTopupType.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn && conn.playerId && data && data.clientType);
        let userIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                userIp = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getOnlineTopupType, [conn.playerId, data.clientType, data.bPMSGroup, userIp], isValidData);
    };

    this.applyBonus.expectsData = 'amount: Number|String';
    this.applyBonus.onRequest = function(wsFunc, conn, data) {
        data.userAgent = conn['upgradeReq']['headers']['user-agent'];
        let isValidData = Boolean(conn.playerId && data && typeof data.amount === 'number' && data.amount > 0);
        let param = [
            data.userAgent, conn.playerId, data.amount, data.honoreeDetail, null, null, null, null, data.bankId
        ];

        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPlayerInfo.applyBonus, param, isValidData, true, false, false
        ).then(
            function(res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.getBonusRequestList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getBonusRequestList.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        let param = [
            conn.playerId, data.startIndex, data.requestCount, data.startTime, data.endTime, data.status, !data.sort
        ];
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getAppliedBonusList, param, isValidData);
    };

    this.cancelBonusRequest.expectsData = 'proposalId: String';
    this.cancelBonusRequest.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId && data.proposalId);
        let param = [conn.playerId, data.proposalId];

        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPlayerInfo.cancelBonusRequest, param, isValidData, true, false, false
        ).then(
            function(res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.requestManualTopup.expectsData = 'amount: Number|String, depositMethod: ?, lastBankcardNo: ?, provinceId: String|Number, cityId: String|Number';
    this.requestManualTopup.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }
       
        let lastLoginIp = dbUtility.getIpAddress(conn);
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && data.depositMethod && Number.isInteger(data.amount) && data.amount < 10000000);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerTopUpRecord.addManualTopupRequest, [data.userAgent, conn.playerId, data, "CLIENT", false, false, false,
            data.bPMSGroup, data.topUpReturnCode, lastLoginIp], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: res
                }, data);
                // SMSSender.sendByPlayerId(conn.playerId, constPlayerSMSSetting.MANUAL_TOPUP);
            }
        ).catch(WebSocketUtil.errorHandler);
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
        ).catch(WebSocketUtil.errorHandler);
    };

    this.requestAlipayTopup.expectsData = 'amount: Number|String';
    this.requestAlipayTopup.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }

       
        let lastLoginIp = dbUtility.getIpAddress(conn);
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && data.alipayName && Number.isInteger(data.amount) && data.amount < 10000000);
        console.log("LH Check Alipay Topup 1---------------", conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.requestAlipayTopup, [data.userAgent, conn.playerId, data.amount, data.alipayName, data.alipayAccount,
            data.bonusCode, "CLIENT", null, null, null, null, data.realName, data.limitedOfferObjId, data.topUpReturnCode, data.bPMSGroup, lastLoginIp], isValidData);
    };

    this.requestWechatTopup.expectsData = 'amount: Number|String';
    this.requestWechatTopup.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            let userAgent = uaParser(userAgentConn);
            data.userAgent = userAgent;
        }


        let lastLoginIp = dbUtility.getIpAddress(conn);
        var isValidData = Boolean(data && conn.playerId && data.amount && data.amount > 0 && Number.isInteger(data.amount) && data.amount < 10000000);
        // if ([10, 20, 50, 100].indexOf(data.amount) < 0) {
        //     isValidData = false;
        // }

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.requestWechatTopup, [!Boolean(data.notUseQR), data.userAgent, conn.playerId, data.amount, data.wechatName,
            data.wechatAccount, data.bonusCode, "CLIENT", null, null, null, new Date(), data.limitedOfferObjId, data.topUpReturnCode, data.bPMSGroup, lastLoginIp], isValidData);

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

    this.getProvinceList.expectsData = '';
    this.getProvinceList.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, getProvinceList, [], isValidData, false, false, true);

        function getProvinceList() {
            return RESTUtils.getPMS2Services("postProvinceList", {}).then(data => data.data);
            //return pmsAPI.foundation_getProvinceList({}).then(data => data.provinces);
        }
    };

    this.getCityList.expectsData = 'provinceId';
    this.getCityList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.provinceId != null);
        WebSocketUtil.performAction(conn, wsFunc, data, getCityList, [data.provinceId], isValidData, false, false, true);

        function getCityList(provinceId) {
            return RESTUtils.getPMS2Services("postCityList", {provinceId: provinceId}).then(data => data.data);
            //return pmsAPI.foundation_getCityList({provinceId: provinceId}).then(data => data.cities);
        }
    };

    this.getDistrictList.expectsData = 'provinceId, cityId';
    this.getDistrictList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.provinceId != null && data.cityId != null);
        WebSocketUtil.performAction(conn, wsFunc, data, getDistrictList, [data.provinceId, data.cityId], isValidData, false, false, true);

        function getDistrictList(provinceId, cityId) {
            return RESTUtils.getPMS2Services("postDistrictList", {provinceId: provinceId, cityId: cityId}).then(data => data.data);
            // return pmsAPI.foundation_getDistrictList({provinceId: provinceId, cityId: cityId}).then(data => data.districts);
        }
    };

    this.checkExpiredManualTopup.expectsData = 'proposalId: String';
    this.checkExpiredManualTopup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.checkExpiredManualTopUp, [conn.playerId, data.proposalId], isValidData);
    };

    this.getBankTypeList.expectsData = '';
    this.getBankTypeList.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformBankCardGroup.getWithdrawalBankTypeList, [data.platformId], isValidData, false, false, true);

        // function getBankTypeList() {
        //     return RESTUtils.getPMS2Services("postBankTypeList", {}).then(data => {
        //         // bankflag: 1   // 提款银行类型
        //         // bankflag: 0   // 存款银行类型
        //         // Hank requested to display bankflag 1 only
        //         if (data && data.data) {
        //             let withdrawalBank = data.data.filter(bank => bank.bankflag === 1);
        //             return withdrawalBank;
        //         }
        //     });
        // }
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
        let userIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                userIp = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerWechatPayStatus, [conn.playerId, data.bPMSGroup, userIp], isValidData);
    };

    this.getPlayerAliPayStatus.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        let userIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                userIp = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpRecord.getPlayerAliPayStatus, [conn.playerId, data.bPMSGroup, userIp], isValidData);
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

    this.requestBankTypeByUserName.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.clientType);
        let userIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                userIp = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPayment.requestBankTypeByUserName, [conn.playerId, data.clientType, userIp, data.supportMode], isValidData);
    };

    /**
     * PMS通用支付产品专用
     */
    this.getMinMaxCommonTopupAmount.expectsData = 'amount: Number';
    this.getMinMaxCommonTopupAmount.onRequest = function (wsFunc, conn, data) {
        if (data) {
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            data.userAgent = uaParser(userAgentConn);
            data.clientType = data.clientType || '1';
        }

        let lastLoginIp = dbUtility.getIpAddress(conn);
        let isValidData = Boolean(data && data.clientType && conn && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPayment.getMinMaxCommonTopupAmount, [conn.playerId, data.clientType, lastLoginIp], isValidData);
    };

    this.createCommonTopupProposal.expectsData = 'amount: Number';
    this.createCommonTopupProposal.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            data.userAgent = uaParser(userAgentConn);
            data.clientType = data.clientType || '1';
        }

        let lastLoginIp = dbUtility.getIpAddress(conn);
        let isValidData = Boolean(data);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPayment.createCommonTopupProposal, [conn.playerId, data, lastLoginIp, "CLIENT"], isValidData);
    };

    this.createFixedTopupProposal.expectsData = 'amount: Number';
    this.createFixedTopupProposal.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            data.userAgent = uaParser(userAgentConn);
            data.clientType = data.clientType || '1';
        }

        let lastLoginIp = dbUtility.getIpAddress(conn);
        let isValidData = Boolean(data);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPayment.createFixedTopupProposal, [conn.playerId, data, lastLoginIp, data.platformId], isValidData);
    };

    /**
     * fukuaipay 快付财务系统专用
     * @type {string}
     */
    this.createFKPTopupProposal.expectsData = 'amount: Number';
    this.createFKPTopupProposal.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            data.userAgent = uaParser(userAgentConn);
        }

        let lastLoginIp = dbUtility.getIpAddress(conn);
        let isValidData = Boolean(data && data.amount && Number.isInteger(data.amount) && data.amount < 10000000);
        let bankCode = data.bankCode || 'CASHIER';
        WebSocketUtil.performAction(conn, wsFunc, data, dbOtherPayment.addFKPTopupRequest, [data.userAgent, conn.playerId, data, data.topUpReturnCode, lastLoginIp, bankCode], isValidData);
    };

    this.applyFKPWithdraw.expectsData = 'amount: Number';
    this.applyFKPWithdraw.onRequest = function (wsFunc, conn, data) {
        if (data) {
            data.amount = Number(data.amount);
            let userAgentConn = conn['upgradeReq']['headers']['user-agent'];
            data.userAgent = uaParser(userAgentConn);
        }

        let lastLoginIp = dbUtility.getIpAddress(conn);
        let isValidData = Boolean(data && data.amount && Number.isInteger(data.amount) && data.amount < 10000000);
        WebSocketUtil.performAction(conn, wsFunc, data, dbOtherPayment.applyFKPBonus, [data.userAgent, conn.playerId, data, lastLoginIp], isValidData);
    };

    this.getPlayerConsumptionSum.expectsData = '';
    this.getPlayerConsumptionSum.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.name);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerConsumptionSum, [data.platformId, data.name], isValidData);
    };

    this.notifyCreditChange.addListener(
        data => {
            WebSocketUtil.notifyMessageClient(self, "notifyCreditChange", data);
        }
    );

};
var proto = PaymentServiceImplement.prototype = Object.create(PaymentService.prototype);
proto.constructor = PaymentServiceImplement;

module.exports = PaymentServiceImplement;
