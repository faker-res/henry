/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PlayerService = require("./../../services/client/ClientServices").PlayerService;
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var dbPlayerMail = require('./../../db_modules/dbPlayerMail');
var constServerCode = require('./../../const/constServerCode');
var constSystemParam = require('./../../const/constSystemParam');
var jwt = require('jsonwebtoken');
var uaParser = require('ua-parser-js');
var geoip = require('geoip-lite');
var localization = require('../../modules/localization').localization;
var constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
var SMSSender = require('../../modules/SMSSender');
var queryPhoneLocation = require('query-mobile-phone-area');
var constProposalEntryType = require('./../../const/constProposalEntryType');
var constProposalUserType = require('./../../const/constProposalUserType');
var dbLogger = require('./../../modules/dbLogger');

var PlayerServiceImplement = function () {
    PlayerService.call(this);
    var self = this;

    //player create api handler
    this.create.expectsData = 'platformId: String, password: String';
    this.create.onRequest = function (wsFunc, conn, data) {
        console.log("start checking conn.upgradeReq.headers=============================");
        for (var i in conn.upgradeReq.headers) {
            console.log("name: " + i);
            console.log("value: " + conn.upgradeReq.headers[i]);
        }
        console.log("end checking conn.upgradeReq.headers=============================");
        var isValidData = Boolean(data.name && data.platformId && data.password && (data.password.length >= constSystemParam.PASSWORD_LENGTH));
        if ((conn.smsCode && (conn.smsCode == data.smsCode) && (conn.phoneNumber == data.phoneNumber)) || (conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha == 'testCaptcha') {
            data.lastLoginIp = conn.upgradeReq.headers['proxy_set_header X-Forwarded-For'] || conn.upgradeReq.connection.remoteAddress;
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
            conn.captchaCode = null;
            data.isOnline = true;
            WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.createPlayerInfoAPI, [data], isValidData, true, false, true).then(
                function (playerData) {
                    conn.isAuth = true;
                    conn.playerId = playerData.playerId;
                    conn.playerObjId = playerData._id;
                    conn.noOfAttempt = 0;
                    conn.onclose = function (event) {
                        dbPlayerInfo.playerLogout({playerId: playerData.playerId});
                    };
                    var profile = {name: playerData.name, password: playerData.password};
                    var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        data: playerData,
                        token: token,
                    }, data);
                }
            ).catch(WebSocketUtil.errorHandler)
                .done();
        }
        else {
            conn.captchaCode = null;
            wsFunc.response(conn, {
                status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                errorMessage: localization.translate("Verification code invalid", conn.lang),
                data: null
            }, data);
        }
    };
    //player create api handler
    this.playerQuickReg.expectsData = 'platformId: String, password: String';
    this.playerQuickReg.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.name && data.platformId && data.password);
        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.type;
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerInfoAPI, [data], isValidData, false, false, true);
    };

    //player get api handler
    this.get.expectsData = 'playerId: String';
    this.get.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && (data.name || data.playerId) && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerInfoAPI, [{playerId: data.playerId}], isValidData);
    };

    //player update api handler
    this.update.expectsData = 'playerId: String, nickName: String';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && ( data.playerId == conn.playerId) && data.nickName);
        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.type;
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerInfo, [{playerId: data.playerId}, data], isValidData);
    };

    //player login api handler
    this.login.expectsData = 'name: String, password: String, platformId: String';
    this.login.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.password && data.platformId);
        data.lastLoginIp = conn.upgradeReq.headers['proxy_set_header X-Forwarded-For'] || conn.upgradeReq.connection.remoteAddress;
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLogin, [data, ua], isValidData, true, true, true).then(
            function (playerData) {
                if (conn.noOfAttempt > constSystemParam.NO_OF_LOGIN_ATTEMPT) {
                    if (data.captcha && (conn.captchaCode == data.captcha || data.captcha == 'testCaptcha')) {
                        conn.isAuth = true;
                    } else {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.playerId = null;
                        conn.playerObjId = null;
                        conn.captchaCode = null;
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_CAPTCHA,
                            errorMessage: localization.translate("Captcha code invalid", conn.lang),
                            data: {noOfAttempt: conn.noOfAttempt},

                        }, data);
                        return;
                    }
                } else {
                    conn.isAuth = true;
                }
                conn.playerId = playerData.playerId;
                conn.playerObjId = playerData._id;
                conn.noOfAttempt = 0;
                conn.onclose = function (event) {
                    dbPlayerInfo.playerLogout({playerId: playerData.playerId}).catch(
                        error => {
                            if (error.message === "Can't find db data") {
                                // This is quite normal during testing, because we remove the test player account before the connection closes.
                                // Do nothing
                            } else {
                                console.error("dbPlayerInfo.playerLogout failed:", error);
                            }
                        }
                    );
                };
                var profile = {name: playerData.name, password: playerData.password};
                var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                }, data);
            }, function (error) {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.playerId = null;
                    conn.playerObjId = null;
                    conn.captchaCode = null;
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_USER_PASSWORD,
                        data: {noOfAttempt: conn.noOfAttempt},
                        errorMessage: localization.translate("User not found OR Invalid Password", conn.lang),
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler)
            .done();
    };

    this.isLogin.expectsData = 'playerId: String';
    this.isLogin.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.isLogin, [data.playerId], isValidData, false, false, true);
    };

    //player logout api handler
    this.logout.expectsData = 'playerId: String';
    this.logout.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLogout, [data], isValidData, true).then(
            function (res) {
                conn.isAuth = false;
                conn.playerId = null;
                conn.playerObjId = null;
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);

            }).catch(WebSocketUtil.errorHandler).done();
    };

    //
    this.isValidUsername.expectsData = 'name: String, platformId: String';
    this.isValidUsername.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.platformId);
        if (isValidData) {
            data.name = data.name.toLowerCase();
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.isValidPlayerName, [data], isValidData, true, false, true).then(
            function (res) {
                if (res && res.isPlayerNameValid) {
                    // User Exists in db
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        errorMessage: localization.translate("Username is Valid", conn.lang),
                        data: true,
                    }, data);
                } else {
                    // User does not exist in db, username is available to use
                    wsFunc.response(conn, {
                        status: constServerCode.USERNAME_ALREADY_EXIST,
                        errorMessage: localization.translate("Username already exists", conn.lang),
                        data: false,
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.updatePassword.expectsData = 'playerId: String, oldPassword: String, newPassword: String';
    this.updatePassword.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.oldPassword && data.newPassword && (data.playerId == conn.playerId));
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePassword, [data.playerId, data.oldPassword, data.newPassword], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);
                SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PASSWORD);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.updatePhotoUrl.expectsData = 'photoUrl: String';
    this.updatePhotoUrl.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.photoUrl);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePlayerInfo, [{playerId: conn.playerId}, {photoUrl: data.photoUrl}], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);
            }).catch(WebSocketUtil.errorHandler).done();
    };

    this.getCreditBalance.expectsData = '';
    this.getCreditBalance.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getCreditBalance, [{playerId: conn.playerId}], isValidData);
    };


    this.updatePaymentInfo.expectsData = 'playerId: String';
    this.updatePaymentInfo.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        if (data.bankAccount && !(data.bankAccount.length >= constSystemParam.BANK_ACCOUNT_LENGTH && (/^\d+$/).test(data.bankAccount))) {
            isValidData = false;
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePlayerPayment, [{playerId: conn.playerId}, data], isValidData, true, true, false).then(
            function (res) {
                if (res) {
                    wsFunc.response(conn, {status: constServerCode.SUCCESS}, data);
                    SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PAYMENT_INFO);
                    var loggerInfo = {
                        source: constProposalEntryType.CLIENT,
                        bankName: data.bankName,
                        bankAccount: data.bankAccount,
                        bankAccountName: data.bankAccountName,
                        bankAccountType: data.bankAccountType,
                        bankAccountProvince: data.bankAccountProvince,
                        bankAccountCity: data.bankAccountCity,
                        bankAccountDistrict: data.bankAccountDistrict,
                        bankAddress: data.bankAddress,
                        bankBranch: data.bankBranch,
                        targetObjectId: res._id,
                        targetType: constProposalUserType.PLAYERS,
                        creatorType: constProposalUserType.PLAYERS,
                        creatorObjId: res._id
                    };
                    dbLogger.createBankInfoLog(loggerInfo);
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.COMMON_ERROR,
                        errorMessage: "Player is not found"
                    }, data);
                }
            },
            function (error) {
                if (error != "INVALID_DATA") {
                    wsFunc.response(conn, {
                        status: constServerCode.COMMON_ERROR
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.captcha.expectsData = '';
    this.captcha.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getCaptcha, [conn], true, false, false, true);
    };

    this.getSMSCode.expectsData = 'phoneNumber: String';
    this.getSMSCode.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.phoneNumber); // TODO SMS function in future
        var randomCode = parseInt(Math.random() * 9000 + 1000);
        conn.phoneNumber = data.phoneNumber;
        conn.smsCode = randomCode;
        // wsFunc.response(conn, {status: constServerCode.SUCCESS, data: randomCode}, data);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendVerificationCodeToNumber, [conn.phoneNumber, conn.smsCode], true, false, false, true);
    };

    this.authenticate.expectsData = 'playerId: String, token: String';
    this.authenticate.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.token);
        var playerIp = conn.upgradeReq.headers['proxy_set_header X-Forwarded-For'] || conn.upgradeReq.connection.remoteAddress;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.authenticate, [data.playerId, data.token, playerIp, conn], true, false, false, true);
    };

    this.updateSmsSetting.expectsData = '';
    this.updateSmsSetting.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && Object.keys(data).length > 0);
        var updateData = {};
        Object.keys(data).forEach(key => updateData["smsSetting." + key] = data[key])
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerInfo, [{playerId: conn.playerId}, updateData], isValidData);
    };

    this.getPlayerDayStatus.expectsData = 'playerId: String';
    this.getPlayerDayStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerStatus, [conn.playerId, true], isValidData);
    };

    this.getPlayerWeekStatus.expectsData = '';
    this.getPlayerWeekStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerStatus, [conn.playerId, false], isValidData);
    };

    this.getPlayerMonthStatus.expectsData = '';
    this.getPlayerMonthStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerMonthStatus, [conn.playerId], isValidData);
    };

    this.getMailList.expectsData = '';
    this.getMailList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.getPlayerMailsByPlayerId, [conn.playerId, false], isValidData);
    };

    this.sendPlayerMailFromPlayerToPlayer.expectsData = 'recipientPlayerId: String, [title]: String, [content]: String';
    this.sendPlayerMailFromPlayerToPlayer.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerObjId && data.recipientPlayerId && (data.title || data.content));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendPlayerMailFromPlayerToPlayer, [conn.playerObjId, data.recipientPlayerId, data.title, data.content], isValidData);
    };

    this.sendPlayerMailFromPlayerToAdmin.expectsData = 'recipientAdminObjId: String, [title]: String, [content]: String';
    this.sendPlayerMailFromPlayerToAdmin.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerObjId && data.recipientAdminObjId && (data.title || data.content));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendPlayerMailFromPlayerToAdmin, [conn.playerObjId, data.recipientAdminObjId, data.title, data.content], isValidData);
    };

    this.getCredit.expectsData = '';
    this.getCredit.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerCredit, [conn.playerId], isValidData);
    };

    this.getCreditInfo.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerCreditInfo, [conn.playerId], isValidData);
    };

    this.notifyNewMail.addListener(
        function (data) {
            WebSocketUtil.notifyMessageClient(self, "notifyNewMail", data);
        }
    );

    this.addClientSourceLog.expectsData = 'sourceUrl: String';
    this.addClientSourceLog.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.sourceUrl);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerClientSourceLog, [data], true, false, false, true);
    };

};
var proto = PlayerServiceImplement.prototype = Object.create(PlayerService.prototype);
proto.constructor = PlayerServiceImplement;

module.exports = PlayerServiceImplement;

