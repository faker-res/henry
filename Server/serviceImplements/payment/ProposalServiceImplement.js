/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ProposalService = require("./../../services/payment/PaymentServices").ProposalService;
var dbProposal = require('./../../db_modules/dbProposal');
var dbPlayerTopUpRecord = require('./../../db_modules/dbPlayerTopUpRecord');
var dbPlatformBankCardGroup = require('./../../db_modules/dbPlatformBankCardGroup');
var dbPlatformMerchantGroup = require('./../../db_modules/dbPlatformMerchantGroup');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var constServerCode = require('./../../const/constServerCode');
var constProposalStatus = require('./../../const/constProposalStatus');
var dbUtil = require('./../../modules/dbutility');
var dbLogger = require('../../modules/dbLogger');
const localization = require("../../modules/localization").localization;
const lang = require("../../modules/localization").lang;

var resLogHandler = function (conn, wsFunc, data, res, functionName) {
    var resObj = {status: constServerCode.SUCCESS, data: res};
    var ip = conn.upgradeReq.connection.remoteAddress;
    var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
    if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
        ip = forwardedIp[0].trim();
    }
    dbLogger.createPaymentAPILog({
        service: "payment",
        functionName: functionName,
        requestData: data,
        responseData: resObj,
        requestIp: ip
    });
    wsFunc.response(conn, resObj, data);
};

var errorLogHandler = function (conn, wsFunc, data, err, functionName) {
    if (err && err.status) {
        if (err.errorMessage || err.message) {
            var msg = err.errorMessage || err.message;
            err.errorMessage = localization.translate(msg, conn.lang);
        }
        wsFunc.response(conn, err, data);
    }
    else {
        var errorCode = err && err.code || constServerCode.COMMON_ERROR;
        var resObj = {
            status: errorCode,
            errorMessage: localization.translate(err.message || err.errorMessage, conn.lang),
            data: null
        };
        resObj.errorMessage = err.errMessage || resObj.errorMessage;
        var ip = conn.upgradeReq.connection.remoteAddress;
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            ip = forwardedIp[0].trim();
        }
        dbLogger.createPaymentAPILog({
            service: "payment",
            functionName: functionName,
            requestData: data,
            responseData: resObj,
            requestIp: ip
        });
        wsFunc.response(conn, resObj, data);
    }
};

var ProposalServiceImplement = function () {
    ProposalService.call(this);

    //update api handler
    this.topupSuccess.expectsData = 'proposalId, playerId, amount: Number';
    this.topupSuccess.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.proposalId && data.playerId && typeof data.amount === 'number' && data.amount > 0);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerTopUpRecord.playerTopUpSuccess, [{proposalId: data.proposalId}, data], isValidData, true).then(
            function (updateData) {
                if (updateData) {
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        proposalId: data.proposalId
                    });
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_PAYMENT_SERVICE_GATEWAY
                    });
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.topupFail.expectsData = 'proposalId';
    this.topupFail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.proposalId);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerTopUpRecord.playerTopUpFail, [{proposalId: data.proposalId}], isValidData, true).then(
            function (updateData) {
                if (updateData) {
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        proposalId: data.proposalId
                    });
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_PAYMENT_SERVICE_GATEWAY
                    });
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.applyBonusFail.expectsData = 'proposalId';
    this.applyBonusFail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerBonusProposal, [data.proposalId, false], isValidData);
    };

    this.applyBonusSuccess.expectsData = 'proposalId';
    this.applyBonusSuccess.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerBonusProposal, [data.proposalId, true], isValidData);
    };

    this.setTopupProposalStatus.expectsData = 'proposalId, orderStatus, depositId';
    this.setTopupProposalStatus.onRequest = function (wsFunc, conn, data) {
        console.log("setTopupProposalStatus:", data);
        var isValidData = Boolean(data && data.proposalId && data.orderStatus && data.depositId);
        var statusText;
        switch (Number(data.orderStatus)) {
            case 1:
                statusText = constProposalStatus.SUCCESS;
                break;
            case 2:
                statusText = constProposalStatus.FAIL;
                break;
            case 3:
                statusText = constProposalStatus.PENDING;
                break;
            case 4:
                statusText = constProposalStatus.PROCESSING;
                break;
            case 5:
                statusText = constProposalStatus.EXPIRED;
                break;
            default:
                isValidData = false;
                break;
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbProposal.updateTopupProposal, [data.proposalId, statusText, data.depositId, data.orderStatus], isValidData, true, true).then(
            res => {
                resLogHandler(conn, wsFunc, data, res, "setTopupProposalStatus");
            },
            err => {
                errorLogHandler(conn, wsFunc, data, err, "setTopupProposalStatus");
            }
        );
    };

    this.setBonusProposalStatus.expectsData = 'proposalId, orderStatus, bonusId';
    this.setBonusProposalStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.proposalId && data.orderStatus && data.bonusId);
        var statusText;
        switch (Number(data.orderStatus)) {
            case 1:
                statusText = constProposalStatus.SUCCESS;
                break;
            case 2:
                statusText = constProposalStatus.FAIL;
                break;
            case 3:
                 statusText = constProposalStatus.PROCESSING;
                 break;
            // case 3:
            //     statusText = constProposalStatus.PENDING;
            //     break;
            // case 4:
            //     statusText = constProposalStatus.PROCESSING;
            //     break;
            default:
                isValidData = false;
                break;
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbProposal.updateBonusProposal, [data.proposalId, statusText, data.bonusId, data.remark], isValidData, true, true).then(
            res => {
                resLogHandler(conn, wsFunc, data, res, "setBonusProposalStatus");
            },
            err => {
                errorLogHandler(conn, wsFunc, data, err, "setBonusProposalStatus");
            }
        );
    };

    this.getProposalById.expectsData = 'proposalId';
    this.getProposalById.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.proposalId);
        var query = {
            proposalId: data.proposalId
        };
        WebSocketUtil.performAction(conn, wsFunc, data, dbProposal.getProposal, [query], isValidData);
    };

    this.getProposalList.expectsData = 'queryId';
    this.getProposalList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.queryId);

        var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
        var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : new Date();
        var pageNum = data.pageNum || 0;
        var pageSize = data.pageSize || 20;
        var skip = pageSize * pageNum;

        WebSocketUtil.performAction(conn, wsFunc, data, dbProposal.getTopupProposals, [data.queryId, startTime, endTime, data.platformCode, skip, pageSize], isValidData);
    };

    this.getBankcardListByGroup.expectsData = 'platformId, groupId';
    this.getBankcardListByGroup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.groupId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformBankCardGroup.getBanksInPlatformBankcardGroup, [data.platformId, data.groupId], isValidData);
    };

    this.getMerchantIdListByGroup.expectsData = 'platformId, groupId';
    this.getMerchantIdListByGroup.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.groupId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatformMerchantGroup.getMerchantsInPlatformMerchantGroup, [data.platformId, data.groupId], isValidData);
    };
};

var proto = ProposalServiceImplement.prototype = Object.create(ProposalService.prototype);
proto.constructor = ProposalServiceImplement;

module.exports = ProposalServiceImplement;