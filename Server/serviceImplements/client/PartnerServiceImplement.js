"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PartnerService = require("./../../services/client/ClientServices").PartnerService;
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var dbPartner = require('../../db_modules/dbPartner');
const dbUtility = require('./../../modules/dbutility');
var constServerCode = require('./../../const/constServerCode');
var constSystemParam = require('./../../const/constSystemParam');
var jwt = require('jsonwebtoken');
var uaParser = require('ua-parser-js');
var geoip = require('geoip-lite');
var localization = require('../../modules/localization').localization;
var constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
var SMSSender = require('../../modules/SMSSender');
var queryPhoneLocation = require('query-mobile-phone-area');

let dbPlayerMail = require('./../../db_modules/dbPlayerMail');
let dbPlayerPartner = require('./../../db_modules/dbPlayerPartner');

var PartnerServiceImplement = function () {
    PartnerService.call(this);
    var self = this;

    this.register.expectsData = 'name: String, realName: String, platformId: String, password: String';
    this.register.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.name && data.realName && data.platformId && data.password && (data.password.length >= constSystemParam.PASSWORD_LENGTH));
        if (data.smsCode || (conn.captchaCode && (conn.captchaCode == data.captcha))) {
            data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
            var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
            if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
                data.lastLoginIp = forwardedIp[0].trim();
            }
            data.loginIps = [data.lastLoginIp];
            var uaString = conn.upgradeReq.headers['user-agent'];
            var ua = uaParser(uaString);
            data.userAgent = [{
                browser: ua.browser.name || '',
                device: ua.device.name || '',
                os: ua.os.name || ''
            }];
            var geo = geoip.lookup(data.lastLoginIp);
            if (geo) {
                data.country = geo.country;
                data.city = geo.city;
                data.longitude = geo.ll ? geo.ll[1] : null;
                data.latitude = geo.ll ? geo.ll[0] : null;
            }
            if (data.phoneNumber) {
                var queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.phoneProvince = queryRes.province;
                    data.phoneCity = queryRes.city;
                    data.phoneType = queryRes.type;
                }
            }
            let byPassSMSCode = Boolean(conn.captchaCode && (conn.captchaCode == data.captcha));
            conn.captchaCode = null;
            data.partnerName = data.name;
            WebSocketUtil.responsePromise(conn, wsFunc, data, dbPartner.createPartnerAPI, [data, byPassSMSCode], isValidData, true, false, true).then(
                partnerData => {
                    conn.partnerId = partnerData.partnerId;
                    conn.partnerObjId = partnerData._id;
                    var profile = {name: partnerData.name, password: partnerData.password};
                    var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        data: partnerData,
                        token: token,
                    }, data);
                }
            );
        }
        else {
            conn.captchaCode = null;
            wsFunc.response(conn, {
                status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                errorMessage: localization.translate("Verification code invalid", conn.lang, conn.platformId),
                data: null
            }, data);
        }
    };

    this.isValidUsername.expectsData = 'name: String, platformId: String';
    this.isValidUsername.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.platformId);
        if (isValidData) {
            data.name = data.name.toLowerCase();
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPartner.isValidPartnerName, [data], isValidData, true, false, true).then(
            function (res) {
                if (res && res.isPlayerNameValid) {
                    // User Exists in db
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        errorMessage: localization.translate("Username is Valid", conn.lang, conn.platformId),
                        data: true,
                    }, data);
                } else {
                    // User does not exist in db, username is available to use
                    wsFunc.response(conn, {
                        status: constServerCode.USERNAME_ALREADY_EXIST,
                        errorMessage: localization.translate("Username already exists", conn.lang, conn.platformId),
                        data: false,
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.authenticate.expectsData = 'partnerId: String, token: String';
    this.authenticate.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerId && data.token);
        var partnerIp = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() !== "undefined"){
                partnerIp = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.authenticate, [data.partnerId, data.token, partnerIp, conn], true, false, false, true);
    };

    //partner login api handler
    this.login.expectsData = 'name: String, password: String';
    this.login.onRequest = function (wsFunc, conn, data) {

        var isValidData = Boolean(data && data.name && data.password);
        data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() !== "undefined"){
                data.lastLoginIp = forwardedIp[0].trim();
            }
        }
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPartner.partnerLoginAPI, [data, ua], isValidData, true, true, true).then(
            function (partnerData) {
                if (conn.noOfAttempt > constSystemParam.NO_OF_LOGIN_ATTEMPT || partnerData.platform.partnerRequireLogInCaptcha) {
                    if ((conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha == 'testCaptcha') {
                        conn.isAuth = true;
                    } else {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.partnerId = null;
                        conn.partnerObjId = null;
                        conn.captchaCode = null;
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_CAPTCHA,
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
                            data: {noOfAttempt: conn.noOfAttempt},

                        }, data);
                        return;
                    }
                } else {
                    conn.isAuth = true;
                }
                conn.partnerId = partnerData.partnerId;
                conn.partnerObjId = partnerData._id;
                conn.noOfAttempt = 0;
                var profile = {name: partnerData.name, password: partnerData.password};
                var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

                partnerData.phoneNumber = dbUtility.encodePhoneNum(partnerData.phoneNumber);
                partnerData.email = dbUtility.encodeEmail(partnerData.email);
                if (partnerData.bankAccount) {
                    partnerData.bankAccount = dbUtility.encodeBankAcc(partnerData.bankAccount);
                }

                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: partnerData,
                    token: token,

                }, data);

            }, function (error) {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.partnerId = null;
                    conn.partnerObjId = null;
                    conn.captchaCode = null;
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_USER_PASSWORD,
                        data: {noOfAttempt: conn.noOfAttempt},
                        errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler)
            .done();
    };

    this.captcha.expectsData = '';
    this.captcha.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getCaptcha, [conn], true, false, false, true);
    };

    //player logout api handler
    this.logout.expectsData = 'partnerId: String';
    this.logout.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerId && (data.partnerId == conn.partnerId));
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPartner.partnerLogout, [data], isValidData, true).then(
            function (res) {
                conn.isAuth = false;
                conn.partnerId = null;
                conn.partnerObjId = null;
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);

            }).catch(WebSocketUtil.errorHandler).done();
    };

    //player get api handler
    this.get.expectsData = '';
    this.get.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartner, [{partnerId: conn.partnerId}], isValidData);
    };

    this.updatePassword.expectsData = 'partnerId: String, oldPassword: String, newPassword: String';
    this.updatePassword.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerId && data.oldPassword && data.newPassword && (data.partnerId == conn.partnerId) && (data.newPassword.length >= constSystemParam.PASSWORD_LENGTH));
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPartner.updatePassword, [data.partnerId, data.oldPassword, data.newPassword], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);
                //SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PASSWORD);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.updatePartnerCommissionType.expectsData = 'partnerId: String, token: String';
    this.updatePartnerCommissionType.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        var isValidData = Boolean(conn.partnerId && data && data.commissionType);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.updatePartnerCommissionType, [userAgent, conn.partnerId, data], isValidData);
    };

    this.fillBankInformation.expectsData = 'partnerId: String';
    this.fillBankInformation.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        var isValidData = Boolean(data && data.partnerId && (data.partnerId == conn.partnerId));
        if (data.bankAccount && !(data.bankAccount.length >= constSystemParam.BANK_ACCOUNT_LENGTH && (/^\d+$/).test(data.bankAccount))) {
            isValidData = false;
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPartner.updatePartnerBankInfo, [userAgent, data.partnerId, data], isValidData, true, true, false).then(
            function (res) {
                if (res) {
                    wsFunc.response(conn, {status: constServerCode.SUCCESS}, data);
                    //SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PAYMENT_INFO);
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.COMMON_ERROR,
                        errorMessage: "Partner is not found"
                    }, data);
                }
            },
            function (error) {
                if (error != "INVALID_DATA") {
                    wsFunc.response(conn, {
                        status: constServerCode.COMMON_ERROR,
                        errorMessage: error
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.getPlayerSimpleList.expectsData = 'partnerId: String';
    this.getPlayerSimpleList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerId && (data.partnerId == conn.partnerId));
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM * 100;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPlayerSimpleList, [data.partnerId, data.queryType, data.startTime, data.endTime, data.startIndex, data.requestCount, data.sort], isValidData);
    };

    this.getPlayerDetailList.expectsData = 'partnerId: String';
    this.getPlayerDetailList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerId && (data.partnerId == conn.partnerId));
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM * 100;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPlayerSimpleList, [data.partnerId, data.queryType, data.startTime, data.endTime, data.startIndex, data.requestCount, data.sort], isValidData);
    };

    this.getDomainList.expectsData = '';
    this.getDomainList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId != null);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getDomainList, [conn.partnerId], isValidData);
    };

    this.getStatistics.expectsData = 'queryType: String';
    this.getStatistics.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId != null && data && data.queryType);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getStatistics, [conn.partnerId, data.queryType], isValidData);
    };

    this.bindPartnerPlayer.expectsData = 'playerName: String';
    this.bindPartnerPlayer.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId && data && data.playerName);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.bindPartnerPlayer, [conn.partnerId, data.playerName], isValidData);
    };

    this.applyBonus.expectsData = 'bonusId: Number|String, amount: Number|String, honoreeDetail: String';
    this.applyBonus.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent;
        var isValidData = Boolean(conn.partnerId && data && data.bonusId && typeof data.amount === 'number' && data.amount > 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.applyBonus, [data.userAgent, conn.partnerId, data.bonusId, data.amount, data.honoreeDetail], isValidData);
    };

    this.getPartnerChildrenReport.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getPartnerChildrenReport.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId && data);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerChildrenReport, [conn.partnerId, data.startTime, data.endTime, data.startIndex, data.requestCount, !data.sort], isValidData);
    };

    this.getPartnerPlayerRegistrationReport.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getPartnerPlayerRegistrationReport.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId && data);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        data.sort = typeof data.sort === 'boolean' ? data.sort : true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerPlayerRegistrationReport, [conn.partnerId, data.startTime, data.endTime, data.domain, data.playerName, data.startIndex, data.requestCount, !data.sort], isValidData);
    };

    this.getBonusRequestList.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getBonusRequestList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getAppliedBonusList, [conn.partnerId, data.startIndex, data.requestCount, data.startTime, data.endTime, data.status, !data.sort], isValidData);
    };

    this.cancelBonusRequest.expectsData = 'proposalId: String';
    this.cancelBonusRequest.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId && data.proposalId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.cancelBonusRequest, [conn.partnerId, data.proposalId], isValidData);
    };

    this.getPartnerPlayerPaymentReport.expectsData = '[startIndex]: Number, [requestCount]: Number';
    this.getPartnerPlayerPaymentReport.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId && data);
        data = data || {};
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerPlayerPaymentReport, [conn.partnerId, new Date(data.startTime), new Date(data.endTime), data.startIndex, data.requestCount, !data.sort], isValidData);
    };

    this.getPartnerCommission.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        data = data || {};
        data.startTime = data.startTime || new Date(0);
        data.endTime = data.endTime || new Date();
        data.startIndex = data.startIndex || 0;
        data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerCommission, [conn.partnerId, new Date(data.startTime), new Date(data.endTime), data.startIndex, data.requestCount], isValidData);
    };

    this.getPartnerCommissionValue.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerCommissionValue, [conn.partnerId], isValidData);
    };

    this.getPartnerPlayerRegistrationStats.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        data = data || {};
        data.startTime = data.startTime || new Date(0);
        data.endTime = data.endTime || new Date();
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerPlayerRegistrationStats, [conn.partnerId, new Date(data.startTime), new Date(data.endTime)], isValidData);
    };

    this.getSMSCode.expectsData = 'phoneNumber: String';
    this.getSMSCode.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.platformId);
        let randomCode = parseInt(Math.random() * 9000 + 1000);
        conn.phoneNumber = data.phoneNumber;
        conn.smsCode = randomCode;
        let captchaValidation = conn.captchaCode && data.captcha && conn.captchaCode.toString() === data.captcha.toString();
        conn.captchaCode = null;
        // wsFunc.response(conn, {status: constServerCode.SUCCESS, data: randomCode}, data);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent'], true);
        if (conn.isAuth && conn.partnerObjId && !data.name) {
            data.name = conn.partnerObjId;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendVerificationCodeToNumber, [conn.phoneNumber, conn.smsCode, data.platformId, captchaValidation, data.purpose, inputDevice, data.name, null, true], isValidData, false, false, true);
    };

    this.updatePhoneNumberWithSMS.expectsData = 'partnerId: String, phoneNumber: Number';
    this.updatePhoneNumberWithSMS.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent
        let isValidData = Boolean(data && data.platformId && data.partnerId && (data.partnerId == conn.partnerId) && (data.phoneNumber || data.newPhoneNumber) && data.smsCode);
        let newPhoneNumber = data.newPhoneNumber ? data.newPhoneNumber : data.phoneNumber;
        let queryRes = queryPhoneLocation(newPhoneNumber);
        if (queryRes) {
            data.phoneProvince = queryRes.province;
            data.phoneCity = queryRes.city;
            data.phoneType = queryRes.type;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.updatePhoneNumberWithSMS, [data.userAgent, data.platformId, data.partnerId, newPhoneNumber, data.smsCode, 1], isValidData);
    };

    //update partner QQ
    this.updatePartnerQQ.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.createPartnerQQProposal, [{partnerId: conn.partnerId}, data], isValidData);
    };

    this.updatePartnerWeChat.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.createPartnerWeChatProposal, [{partnerId: conn.partnerId}, data], isValidData);
    };

    this.updatePartnerEmail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.partnerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.createPartnerEmailProposal, [{partnerId: conn.partnerId}, data], isValidData);
    };

    this.getCommissionRate.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.commissionType);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getCommissionRate, [data.platformId, data.partnerId, data.commissionType], isValidData, false, false, true);
    };

    this.getPartnerFeeRate.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerFeeRate, [data.platformId, data.partnerId], isValidData, false, false, true);
    };

    this.getPartnerBillBoard.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && (data.platformId || data.partnerId) && data.periodCheck && data.periodCheck && data.mode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getPartnerBillBoard, [data.platformId, data.periodCheck, data.recordCount, data.partnerId, data.mode], isValidData, false, false, true);
    };

    this.getCrewActiveInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId && data.period && data.circleTimes);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getCrewActiveInfo, [data.platformId, data.partnerId, data.period, data.circleTimes], isValidData, false, false, true);
    };

    this.getCrewDepositInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId && data.period && data.circleTimes);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getCrewDepositInfo, [data.platformId, data.partnerId, data.period, data.circleTimes], isValidData, false, false, true);
    };

    this.getCrewWithdrawInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId && data.period && data.circleTimes);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getCrewWithdrawInfo, [data.platformId, data.partnerId, data.period, data.circleTimes], isValidData, false, false, true);
    };

    this.getCrewBetInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId && data.period && data.circleTimes);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getCrewBetInfo, [data.platformId, data.partnerId, data.period, data.circleTimes, data.providerGroupId], isValidData, false, false, true);
    };

    this.getNewCrewInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId && data.period && data.circleTimes);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getNewCrewInfo, [data.platformId, data.partnerId, data.period, data.circleTimes], isValidData, false, false, true);
    };

    this.preditCommission.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.preditCommission, [data.platformId, data.partnerId], isValidData, false, false, true);
    };

    this.getCommissionProposalList.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.partnerId && data.startTime && data.endTime);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPartner.getCommissionProposalList, [data.platformId, data.partnerId, data.startTime, data.endTime, data.status], isValidData, false, false, true);
    };
};
var proto = PartnerServiceImplement.prototype = Object.create(PartnerService.prototype);
proto.constructor = PartnerServiceImplement;

module.exports = PartnerServiceImplement;

