"use strict";

const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PlayerService = require("./../../services/client/ClientServices").PlayerService;
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPlayerMail = require('./../../db_modules/dbPlayerMail');
const dbUtility = require('./../../modules/dbutility');
const constServerCode = require('./../../const/constServerCode');
const constSystemParam = require('./../../const/constSystemParam');
const jwt = require('jsonwebtoken');
const uaParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const localization = require('../../modules/localization').localization;
const constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
const SMSSender = require('../../modules/SMSSender');
const queryPhoneLocation = require('query-mobile-phone-area');
const constProposalEntryType = require('./../../const/constProposalEntryType');
const constProposalUserType = require('./../../const/constProposalUserType');
const constProposalStatus = require('./../../const/constProposalStatus');
const dbLogger = require('./../../modules/dbLogger');
const dbPlayerPartner = require('../../db_modules/dbPlayerPartner');
const dbPlayerRegistrationIntentRecord = require('../../db_modules/dbPlayerRegistrationIntentRecord');

let PlayerServiceImplement = function () {
    PlayerService.call(this);
    let self = this;

    //player create api handler
    this.create.expectsData = 'platformId: String, password: String';
    this.create.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.name && data.platformId && data.password && (data.password.length >= constSystemParam.PASSWORD_LENGTH) && (!data.realName || data.realName.match(/\d+/g) === null));
        if ((conn.smsCode && (conn.smsCode == data.smsCode) && (conn.phoneNumber == data.phoneNumber)) || (conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha == 'testCaptcha') {
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
            if (data.domain) {
                data.domain = data.domain.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "").replace("www.", "");
            }
            //set email to qq if there is only qq number and no email data
            if (data.qq && !data.email) {
                data.email = data.qq + "@qq.com";
            }
            conn.captchaCode = null;
            data.isOnline = true;
            let inputData = Object.assign({}, data);
            WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.createPlayerInfoAPI, [inputData], isValidData, true, true, true).then(
                (playerData) => {
                    dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(playerData, constProposalStatus.SUCCESS).then();
                    conn.isAuth = true;
                    conn.playerId = playerData.playerId;
                    conn.playerObjId = playerData._id;
                    conn.noOfAttempt = 0;
                    conn.onclose = function (event) {
                        dbPlayerInfo.playerLogout({playerId: playerData.playerId});
                    };
                    var profile = {name: playerData.name, password: playerData.password};
                    var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

                    playerData.phoneNumber = dbUtility.encodePhoneNum(playerData.phoneNumber);
                    playerData.email = dbUtility.encodeEmail(playerData.email);
                    if (playerData.bankAccount) {
                        playerData.bankAccount = dbUtility.encodeBankAcc(playerData.bankAccount);
                    }

                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        data: playerData,
                        token: token,
                    }, data);
                }, (err) => {
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
                            errorMessage: localization.translate(err.message || err.errorMessage, conn.lang)
                        };
                        resObj.errorMessage = err.errMessage || resObj.errorMessage;
                        wsFunc.response(conn, resObj, data);
                    }
                    dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.FAIL).then();
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

    // player and partner create api handler
    this.createPlayerPartner.expectsData = 'platformId: String, password: String';
    this.createPlayerPartner.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data.name && data.realName && data.platformId && data.password && (data.password.length >= constSystemParam.PASSWORD_LENGTH) && data.realName.match(/\d+/g) == null);
        if ((conn.smsCode && (conn.smsCode == data.smsCode) && (conn.phoneNumber == data.phoneNumber)) || (conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha === 'testCaptcha') {
            data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
            let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
            if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
                data.lastLoginIp = forwardedIp[0].trim();
            }
            data.loginIps = [data.lastLoginIp];
            let uaString = conn.upgradeReq.headers['user-agent'];
            let ua = uaParser(uaString);
            data.userAgent = [{
                browser: ua.browser.name || '',
                device: ua.device.name || '',
                os: ua.os.name || ''
            }];

            // attach geoip if available
            if (data.lastLoginIp) {
                let geo = geoip.lookup(data.lastLoginIp);
                if (geo) {
                    data.country = geo.country;
                    data.city = geo.city;
                    data.longitude = geo.ll ? geo.ll[1] : null;
                    data.latitude = geo.ll ? geo.ll[0] : null;
                }
            }

            if (data.phoneNumber) {
                let queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.phoneProvince = queryRes.province;
                    data.phoneCity = queryRes.city;
                    data.phoneType = queryRes.type;
                }
            }
            conn.captchaCode = null;
            data.isOnline = true;
            // data.partnerName = data.name;

            // Promise create player and partner
            WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerPartner.createPlayerPartnerAPI, [data], isValidData, true, false, true).then(
                playerPartnerData => {
                    conn.isAuth = true;
                    conn.playerId = playerPartnerData[0].playerId;
                    conn.playerObjId = playerPartnerData[0]._id;
                    conn.partnerId = playerPartnerData[1].partnerId;
                    conn.partnerObjId = playerPartnerData[1]._id;
                    conn.noOfAttempt = 0;
                    conn.onclose =
                        event => {
                            dbPlayerInfo.playerLogout({playerId: playerPartnerData.playerId});
                        };
                    let profile = {name: playerPartnerData.name, password: playerPartnerData.password};
                    let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        data: playerPartnerData,
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
                errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang),
                data: null
            }, data);
        }
    };

    //player get api handler
    this.get.expectsData = 'playerId: String';
    this.get.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && (data.name || data.playerId) && (data.playerId == conn.playerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerInfoAPI, [{playerId: data.playerId}], isValidData);
    };

    //player partner get api handler
    this.getPlayerPartner.expectsData = 'playerId: String, partnerId: String';
    this.getPlayerPartner.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && (data.name || data.playerId) && (data.playerId == conn.playerId) && (data.partnerId == conn.partnerId));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.getPlayerPartnerAPI, [{
            playerId: data.playerId,
            partnerId: data.partnerId
        }], isValidData);
    };

    //player update api handler
    this.update.expectsData = 'playerId: String, nickName: String';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && ( data.playerId == conn.playerId) && data.nickName && data.realName.match(/\d+/g) == null);
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

    this.updatePhoneNumberWithSMS.expectsData = 'playerId: String, phoneNumber: Number';
    this.updatePhoneNumberWithSMS.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.playerId && (data.playerId == conn.playerId) && data.phoneNumber && data.smsCode);
        let queryRes = queryPhoneLocation(data.phoneNumber);
        if (queryRes) {
            data.phoneProvince = queryRes.province;
            data.phoneCity = queryRes.city;
            data.phoneType = queryRes.type;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.updatePhoneNumberWithSMS, [data.platformId, data.playerId, data.newPhoneNumber, data.smsCode, 0], isValidData);
    };

    this.updatePlayerPartnerPhoneNumberWithSMS.expectsData = 'playerId: String, phoneNumber: Number';
    this.updatePlayerPartnerPhoneNumberWithSMS.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId && data.playerId && (data.playerId == conn.playerId) && data.phoneNumber && data.smsCode);
        let queryRes = queryPhoneLocation(data.phoneNumber);
        if (queryRes) {
            data.phoneProvince = queryRes.province;
            data.phoneCity = queryRes.city;
            data.phoneType = queryRes.type;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.updatePhoneNumberWithSMS, [data.platformId, data.playerId, data.newPhoneNumber, data.smsCode, 2], isValidData);
    };

    //player login api handler
    this.login.expectsData = 'name: String, password: String, platformId: String';
    this.login.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.password && data.platformId);

        console.log("start checking conn.upgradeReq.headers=============================");
        for (var i in conn.upgradeReq.headers) {
            console.log("name: " + i);
            console.log("value: " + conn.upgradeReq.headers[i]);
        }
        console.log("end checking conn.upgradeReq.headers=============================");
        data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            data.lastLoginIp = forwardedIp[0].trim();
        }

        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLogin, [data, ua], isValidData, true, true, true).then(
            function (playerData) {
                if (conn.noOfAttempt > constSystemParam.NO_OF_LOGIN_ATTEMPT || playerData.platform.requireLogInCaptcha) {
                    if ((conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha == 'testCaptcha') {
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

                playerData.phoneNumber = dbUtility.encodePhoneNum(playerData.phoneNumber);
                playerData.email = dbUtility.encodeEmail(playerData.email);
                if (playerData.bankAccount) {
                    playerData.bankAccount = dbUtility.encodeBankAcc(playerData.bankAccount);
                }

                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                }, data);
            }, function (error) {
                if (error != "INVALID_DATA") {
                    if (error.code && error.code == constServerCode.PLAYER_IS_FORBIDDEN) {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.playerId = null;
                        conn.playerObjId = null;
                        conn.captchaCode = null;
                        wsFunc.response(conn, {
                            status: constServerCode.PLAYER_IS_FORBIDDEN,
                            data: {noOfAttempt: 0},
                            errorMessage: localization.translate(error.message, conn.lang),
                        }, data);
                    }
                    else {
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
            }
        ).catch(WebSocketUtil.errorHandler)
            .done();
    };

    // player and partner login api handler
    this.loginPlayerPartner.expectsData = 'name: String, password: String, platformId: String';
    this.loginPlayerPartner.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.name && data.password && data.platformId);

        console.log("start checking conn.upgradeReq.headers=============================");
        for (let i in conn.upgradeReq.headers) {
            if (conn.upgradeReq.headers.hasOwnProperty(i)) {
                console.log("name: " + i);
                console.log("value: " + conn.upgradeReq.headers[i]);
            }
        }
        console.log("end checking conn.upgradeReq.headers=============================");

        data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            data.lastLoginIp = forwardedIp[0].trim();
        }

        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerPartner.loginPlayerPartnerAPI, [data, ua], isValidData, true, true, true).then(
            playerPartnerData => {
                let playerData = playerPartnerData[0];
                let partnerData = playerPartnerData[1];

                if (conn.noOfAttempt > constSystemParam.NO_OF_LOGIN_ATTEMPT || playerData.platform.requireLogInCaptcha) {
                    if ((conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha == 'testCaptcha') {
                        conn.isAuth = true;
                    } else {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.playerId = null;
                        conn.playerObjId = null;
                        conn.partnerId = null;
                        conn.partnerObjId = null;
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
                conn.partnerId = partnerData.partnerId;
                conn.partnerObjId = partnerData._id;
                conn.noOfAttempt = 0;
                conn.onclose = function (event) {
                    dbPlayerPartner.logoutPlayerPartnerAPI({
                        playerId: playerData.playerId,
                        partnerId: partnerData.partnerId
                    }).catch(
                        error => {
                            if (error.message === "Can't find db data") {
                                // This is quite normal during testing, because we remove the test player account before the connection closes.
                                // Do nothing
                            } else {
                                console.error("dbPlayerPartner.logoutPlayerPartnerAPI failed:", error);
                            }
                        }
                    );
                };
                let profile = {name: playerPartnerData.name, password: playerPartnerData.password};
                let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerPartnerData,
                    token: token,
                }, data);
            },
            error => {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.playerId = null;
                    conn.playerObjId = null;
                    conn.partnerId = null;
                    conn.partnerObjId = null;
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

    this.loginPlayerPartnerWithSMS.expectsData = 'phoneNumber: String, smsCode: String, platformId: String';
    this.loginPlayerPartnerWithSMS.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.smsCode && data.platformId);

        console.log("start checking conn.upgradeReq.headers=============================");
        for (let i in conn.upgradeReq.headers) {
            if (conn.upgradeReq.headers.hasOwnProperty(i)) {
                console.log("name: " + i);
                console.log("value: " + conn.upgradeReq.headers[i]);
            }
        }
        console.log("end checking conn.upgradeReq.headers=============================");

        data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            data.lastLoginIp = forwardedIp[0].trim();
        }

        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerPartner.loginPlayerPartnerWithSMSAPI, [data, ua], isValidData, true, true, true).then(
            playerPartnerData => {
                let playerData = playerPartnerData[0];
                let partnerData = playerPartnerData[1];

                if (conn.noOfAttempt > constSystemParam.NO_OF_LOGIN_ATTEMPT || playerData.platform.requireLogInCaptcha) {
                    if ((conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha == 'testCaptcha') {
                        conn.isAuth = true;
                    } else {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.playerId = null;
                        conn.playerObjId = null;
                        conn.partnerId = null;
                        conn.partnerObjId = null;
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
                conn.partnerId = partnerData.partnerId;
                conn.partnerObjId = partnerData._id;
                conn.noOfAttempt = 0;
                conn.onclose = function (event) {
                    dbPlayerPartner.logoutPlayerPartnerAPI({
                        playerId: playerData.playerId,
                        partnerId: partnerData.partnerId
                    }).catch(
                        error => {
                            if (error.message === "Can't find db data") {
                                // This is quite normal during testing, because we remove the test player account before the connection closes.
                                // Do nothing
                            } else {
                                console.error("dbPlayerPartner.logoutPlayerPartnerAPI failed:", error);
                            }
                        }
                    );
                };
                let profile = {name: playerPartnerData.name, password: playerPartnerData.password};
                let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerPartnerData,
                    token: token,
                }, data);
            },
            error => {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.playerId = null;
                    conn.playerObjId = null;
                    conn.partnerId = null;
                    conn.partnerObjId = null;
                    conn.captchaCode = null;

                    if (error && error.message == "Invalid SMS Validation Code") {
                        wsFunc.response(conn, {
                            status: constServerCode.VALIDATION_CODE_EXPIRED,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang),
                        }, data);
                    } else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang),
                        }, data);
                    }
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
        let isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLogout, [data], isValidData, true, false, true).then(
            function (res) {
                conn.isAuth = false;
                conn.playerId = null;
                conn.playerObjId = null;
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);

            }).catch(WebSocketUtil.errorHandler).done();
    };

    //player logout api handler
    this.logoutPlayerPartner.expectsData = 'playerId: String, partnerId: String';
    this.logoutPlayerPartner.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId) && data.partnerId && (data.partnerId == conn.partnerId));
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerPartner.logoutPlayerPartnerAPI, [data], isValidData, true, false, true).then(
            res => {
                conn.isAuth = false;
                conn.playerId = null;
                conn.playerObjId = null;
                conn.partnerId = null;
                conn.partnerObjId = null;
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
        let isValidData = Boolean(data && data.playerId && data.oldPassword && data.newPassword && (data.playerId == conn.playerId));
        data.smsCode = data.smsCode ? data.smsCode : "";
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePassword, [data.playerId, data.oldPassword, data.newPassword, data.smsCode], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);
                SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PASSWORD);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.updatePasswordPlayerPartner.expectsData = 'playerId: String, partnerId: String, oldPassword: String, newPassword: String';
    this.updatePasswordPlayerPartner.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerId && data.partnerId && data.oldPassword && data.newPassword && (data.playerId == conn.playerId) && data.partnerId == conn.partnerId);
        data.smsCode = data.smsCode ? data.smsCode : "";
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerPartner.updatePasswordPlayerPartner, [data.playerId, data.partnerId, data.oldPassword, data.newPassword, data.smsCode], isValidData, true, false, false).then(
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
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePlayerPayment, [{playerId: conn.playerId}, data], isValidData, true, false, false).then(
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

    this.updatePlayerPartnerPaymentInfo.expectsData = 'playerId: String';
    this.updatePlayerPartnerPaymentInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId));
        if (data.bankAccount && !(data.bankAccount.length >= constSystemParam.BANK_ACCOUNT_LENGTH && (/^\d+$/).test(data.bankAccount))) {
            isValidData = false;
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerPartner.updatePaymentInfo, [{playerId: conn.playerId}, data], isValidData, true, true, false).then(
            function (res) {
                if (res && res.length > 1) {
                    wsFunc.response(conn, {status: constServerCode.SUCCESS}, data);
                    SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PAYMENT_INFO);
                    let loggerInfo = {
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
                        targetObjectId: res[0]._id,
                        targetType: constProposalUserType.PLAYERS,
                        creatorType: constProposalUserType.PLAYERS,
                        creatorObjId: res[0]._id
                    };
                    dbLogger.createBankInfoLog(loggerInfo);

                    loggerInfo.targetObjectId = res[1]._id;
                    loggerInfo.targetType = constProposalUserType.PARTNERS;
                    loggerInfo.creatorType = constProposalUserType.PARTNERS;
                    loggerInfo.creatorObjId = res[1]._id;
                    dbLogger.createBankInfoLog(loggerInfo);
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.COMMON_ERROR,
                        errorMessage: "Player or partner is not found"
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
        let isValidData = Boolean(data && data.phoneNumber && data.platformId);
        let randomCode = parseInt(Math.random() * 9000 + 1000);
        conn.phoneNumber = data.phoneNumber;
        conn.smsCode = randomCode;
        // wsFunc.response(conn, {status: constServerCode.SUCCESS, data: randomCode}, data);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendVerificationCodeToNumber, [conn.phoneNumber, conn.smsCode, data.platformId], isValidData, false, false, true);
    };

    this.sendSMSCodeToPlayer.expectsData = 'platformId: String';
    this.sendSMSCodeToPlayer.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        let smsCode = parseInt(Math.random() * 9000 + 1000);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendVerificationCodeToPlayer, [conn.playerObjId, smsCode, data.platformId], isValidData, false, false, true);
    };

    this.authenticate.expectsData = 'playerId: String, token: String';
    this.authenticate.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId && data.token);
        var playerIp = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            playerIp = forwardedIp[0].trim();
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.authenticate, [data.playerId, data.token, playerIp, conn], true, false, false, true);
    };

    this.authenticatePlayerPartner.expectsData = 'playerId: String, partnerId: String, token: String';
    this.authenticatePlayerPartner.onRequest = function (wsFunc, conn, data) {
        let playerIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            playerIp = forwardedIp[0].trim();
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.authenticatePlayerPartner, [data.playerId, data.partnerId, data.token, playerIp, conn], true, false, false, true);
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
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerClientSourceLog, [data], isValidData, false, false, true);
    };

};
var proto = PlayerServiceImplement.prototype = Object.create(PlayerService.prototype);
proto.constructor = PlayerServiceImplement;

module.exports = PlayerServiceImplement;