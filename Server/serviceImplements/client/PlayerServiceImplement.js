"use strict";

const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const PlayerService = require("./../../services/client/ClientServices").PlayerService;
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPlayerMail = require('./../../db_modules/dbPlayerMail');
const dbUtility = require('./../../modules/dbutility');
const constServerCode = require('./../../const/constServerCode');
const constSystemParam = require('./../../const/constSystemParam');
const constPlayerRegistrationInterface = require('./../../const/constPlayerRegistrationInterface');
const jwt = require('jsonwebtoken');
const uaParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const localization = require('../../modules/localization').localization;
const constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
const SMSSender = require('../../modules/SMSSender');
const queryPhoneLocation = require('cellocate');
const constProposalEntryType = require('./../../const/constProposalEntryType');
const constProposalUserType = require('./../../const/constProposalUserType');
const constProposalStatus = require('./../../const/constProposalStatus');
const constDevice = require('./../../const/constDevice');
const constMessageType = require('./../../const/constMessageType');
const dbLogger = require('./../../modules/dbLogger');
const dbPlayerOnlineTime = require('../../db_modules/dbPlayerOnlineTime');
const dbPlayerPartner = require('../../db_modules/dbPlayerPartner');
const dbPlayerRegistrationIntentRecord = require('../../db_modules/dbPlayerRegistrationIntentRecord');
const dbPlatform = require('./../../db_modules/dbPlatform');
const errorUtils = require("./../../modules/errorUtils");
const mobileDetect = require('mobile-detect');

let PlayerServiceImplement = function () {
    PlayerService.call(this);
    let self = this;

    //player create api handler
    //added case
    this.create.expectsData = 'platformId: String, password: String';
    this.create.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.name && data.platformId && data.password /*&& (data.password.length >= constSystemParam.PASSWORD_LENGTH)*/ && (!data.realName || data.realName.match(/\d+/g) === null));
        data.lastLoginIp = dbUtility.getIpAddress(conn);
        data.loginIps = [data.lastLoginIp];
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        var md = new mobileDetect(uaString);
        data.userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || (md && md.mobile()) ? md.mobile() : 'PC',
            os: ua.os.name || ''
        }];
        data.ua = ua;
        data.md = md;
        data.inputDevice = inputDevice;

        let connPartnerId = null;

        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }

        if (data.domain) {
            //for ad tracking debug
            console.log("Player registration domain:", data.domain);
            let reporoId = dbUtility.getParameterByName("rcid", data.domain);
            if (reporoId) {
                data.reporoId = reporoId;
            }
            console.log("Player registration reporoId:", reporoId);
            data.domain = data.domain.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "").replace("www.", "");
        }
        if(data.lastLoginIp && data.lastLoginIp != "undefined"){
            var ipData = dbUtility.getIpLocationByIPIPDotNet(data.lastLoginIp);
            if(ipData){
                data.ipArea = ipData;
                data.country = ipData.country || null;
                data.city = ipData.city || null;
                data.province = ipData.province || null;
            }else{
                data.ipArea = {'province':'', 'city':''};
                data.country = "";
                data.city = "";
                data.province = "";
            }
        }

        //set email to qq if there is only qq number and no email data
        if (data.qq && !data.email) {
            data.email = data.qq + "@qq.com";
        }

        // data.partnerId = "";
        //for partner player registration
        let byPassSMSCode = data.isTestPlayer || Boolean(conn.captchaCode && (conn.captchaCode == data.captcha));
        conn.captchaCode = null;
        data.isOnline = true;
        // console.log("yH checking---conn", conn)
        if (conn.partnerId){
            connPartnerId = conn.partnerId;
        }

        if (data.deviceType) {
            data.registrationDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.registrationDevice = String(data.registrationDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     if (constDevice[key].indexOf("P") == -1) {
            //         playerLoginDeviceArr.push(constDevice[key]);
            //     }
            // }
            // if (!playerLoginDeviceArr.includes(data.registrationDevice)) {
            //     isValidData = false;
            // }
        }

        let inputData = Object.assign({}, data);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.createPlayerInfoAPI, [inputData, byPassSMSCode, null, null, data.isAutoCreate, connPartnerId], isValidData, true, true, true).then(
            (playerData) => {
                data.playerId = data.playerId ? data.playerId : playerData.playerId;
                data.remarks = playerData.partnerName ? localization.translate("PARTNER", conn.lang, conn.platformId) + ": " + playerData.partnerName : "";
                if(playerData && playerData.partnerId){
                    data.partnerId = playerData.partnerId;
                }

                dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.SUCCESS).then(
                    isUpdateData=> {
                        if (!(isUpdateData[0] && isUpdateData[0]._id)) {
                            dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.NOVERIFY, inputDevice).catch(errorUtils.reportError);
                        }
                    }
                );

                //dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.SUCCESS).then();
                //dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.SUCCESS).then();
                conn.isAuth = true;
                conn.playerId = playerData.playerId;
                conn.playerObjId = playerData._id;
                conn.noOfAttempt = 0;
                conn.onclose = function (event) {
                    dbPlayerInfo.playerLogout({playerId: playerData.playerId});
                };
                var profile = {name: playerData.name, password: playerData.password};
                var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

                if (playerData.phoneNumber) {
                    playerData.phoneNumber = dbUtility.encodePhoneNum(playerData.phoneNumber);
                }
                playerData.email = dbUtility.encodeEmail(playerData.email);
                if (playerData.bankAccount) {
                    playerData.bankAccount = dbUtility.encodeBankAcc(playerData.bankAccount);
                }

                let isHitReferralLimitFlag = false;
                if (playerData && playerData.isHitReferralLimit && playerData.isHitReferralLimit.toString() === 'true') {
                    isHitReferralLimitFlag = playerData.isHitReferralLimit;
                    delete playerData.isHitReferralLimit;
                }

                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                    isHitReferralLimit: isHitReferralLimitFlag
                }, data);
            }, (err) => {

                console.log(err);
                if (err && err.status) {
                    if (err.errorMessage || err.message) {
                        var msg = err.errorMessage || err.message;
                        err.errorMessage = localization.translate(msg, conn.lang, conn.platformId);
                    }
                    wsFunc.response(conn, err, data);
                }
                else {
                    var errorCode = err && err.code || constServerCode.COMMON_ERROR;
                    var resObj = {
                        status: errorCode,
                        errorMessage: localization.translate(err.message || err.errorMessage, conn.lang, conn.platformId)
                    };

                    resObj.errorMessage = err.errMessage || resObj.errorMessage;
                    wsFunc.response(conn, resObj, data);
                }
                console.log("createPlayerRegistrationIntentRecordAPI FAIL", err);
                if (err && err.status != constServerCode.USERNAME_ALREADY_EXIST) {
                    if(data && data.partnerName && data.partnerName != ""){
                        dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.FAIL).then();
                    }else{
                        dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.FAIL).then();
                    }
                    //dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.FAIL).then();
                    //dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.FAIL).then();
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.createGuestPlayer.onRequest = function (wsFunc, conn, data) {
        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        let userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || '',
            os: ua.os.name || ''
        }];

        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        if(data.deviceId || data.guestDeviceId) {
            inputDevice = constPlayerRegistrationInterface.APP_NATIVE_PLAYER;
        }
        var md = new mobileDetect(uaString);
        data.ua = ua;
        data.md = md;
        data.inputDevice = inputDevice;

        let lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp && forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                lastLoginIp = forwardedIp[0].trim();
            }
        }
        let loginIps = [lastLoginIp];

        let country, city, province, longitude, latitude;
        let geo = dbUtility.getIpLocationByIPIPDotNet(lastLoginIp);
        if (geo) {
            country = geo.country;
            city = geo.city;
            province = geo.province || null;
            longitude = geo.ll ? geo.ll[1] : null;
            latitude = geo.ll ? geo.ll[0] : null;
        }
        if (data.phoneNumber) {
            let queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }
        let deviceData = {userAgent, lastLoginIp, loginIps, country, city, province, longitude, latitude};

        let isValidData = Boolean(data && data.platformId && data.guestDeviceId);

        if (data.deviceType) {
            data.registrationDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.registrationDevice = String(data.registrationDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(data.registrationDevice)) {
            //     isValidData = false;
            // }
        }

        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.createGuestPlayer, [data, deviceData], isValidData, true, false, true).then(
            (playerData) => {
                data.playerId = data.playerId ? data.playerId : playerData.playerId;
                data.name = playerData.name ? playerData.name : null;
                data.remarks = playerData.partnerName ? localization.translate("PARTNER", conn.lang, conn.platformId) + ": " + playerData.partnerName : "";
                if(playerData && playerData.partnerId){
                    data.partnerId = playerData.partnerId;
                }
                data.promoteWay = playerData.promoteWay ? playerData.promoteWay : "";
                data.csOfficer = playerData.csOfficer ? playerData.csOfficer : "";
                data.domain = playerData.domain ? playerData.domain : "";
                data.ipArea = {'province': province|| '', 'city': city || '', 'country': country || ''};
                data.csOfficer = playerData.csOfficer ? playerData.csOfficer : "";

                dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.SUCCESS).then(
                    isUpdateData => {
                        console.log("checking isUpdateData", isUpdateData)
                        if (!(isUpdateData[0] && isUpdateData[0]._id)) {
                            console.log("checking data.platformId", data.platformId)
                            dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.NOVERIFY, inputDevice).catch(errorUtils.reportError);
                        }
                    }
                );

                conn.isAuth = true;
                conn.playerId = playerData.playerId;
                conn.playerObjId = playerData._id;
                // conn.noOfAttempt = 0;
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

                if (playerData.guestDeviceId) {
                    delete playerData.guestDeviceId;
                }

                let isHitReferralLimitFlag = false;
                if (playerData && playerData.isHitReferralLimit && playerData.isHitReferralLimit.toString() === 'true') {
                    isHitReferralLimitFlag = playerData.isHitReferralLimit;
                    delete playerData.isHitReferralLimit;
                }

                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                    isHitReferralLimit: isHitReferralLimitFlag
                }, data);
            }, (err) => {

                console.log(err);
                if (err && err.status) {
                    if (err.errorMessage || err.message) {
                        var msg = err.errorMessage || err.message;
                        err.errorMessage = localization.translate(msg, conn.lang, conn.platformId);
                    }
                    wsFunc.response(conn, err, data);
                }
                else {
                    var errorCode = err && err.code || constServerCode.COMMON_ERROR;
                    var resObj = {
                        status: errorCode,
                        errorMessage: localization.translate(err.message || err.errorMessage, conn.lang, conn.platformId)
                    };

                    resObj.errorMessage = err.errMessage || resObj.errorMessage;
                    wsFunc.response(conn, resObj, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.getLastPlayedGameInfo.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getLastPlayedGameInfo, [conn.playerObjId], true, false, false, false);
    };

    //player create api handler
    //added case
    this.playerQuickReg.expectsData = 'platformId: String, password: String';
    this.playerQuickReg.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.name && data.platformId && data.password);
        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerInfoAPI, [data], isValidData, false, false, true);
    };

    // player and partner create api handler
    this.createPlayerPartner.expectsData = 'platformId: String, password: String';
    this.createPlayerPartner.onRequest = (wsFunc, conn, data) => {
        let isValidData = Boolean(data.name && data.realName && data.platformId && data.password && (data.password.length >= constSystemParam.PASSWORD_LENGTH) && data.realName.match(/\d+/g) == null);
        if ((conn.smsCode && (String(conn.smsCode) == String(data.smsCode)) && (String(conn.phoneNumber) == String(data.phoneNumber)))
            || (conn.captchaCode && (conn.captchaCode == data.captcha)) || data.captcha === 'testCaptcha') {
            data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
            let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
            if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
                if(forwardedIp[0].trim() != "undefined"){
                    data.lastLoginIp = forwardedIp[0].trim();
                }
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
                let geo = dbUtility.getIpLocationByIPIPDotNet(data.lastLoginIp);
                if (geo) {
                    data.country = geo.country;
                    data.city = geo.city;
                    data.province = geo.province;
                    data.longitude = geo.ll ? geo.ll[1] : null;
                    data.latitude = geo.ll ? geo.ll[0] : null;
                }
            }

            if (data.phoneNumber) {
                let queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.phoneProvince = queryRes.province;
                    data.phoneCity = queryRes.city;
                    data.phoneType = queryRes.sp;
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
            ).catch(WebSocketUtil.errorHandler);
        }
        else {
            conn.captchaCode = null;
            wsFunc.response(conn, {
                status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang, conn.platformId),
                data: null
            }, data);
        }
    };

    //player get api handler
    //added case
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
    this.update.expectsData = 'playerId: String, nickName: String, birthday: Date, gender: String';
    this.update.onRequest = function (wsFunc, conn, data) {
        // data.nickName && (!data.realName || data.realName.match(/\d+/g) == null)
        var isValidData = Boolean(data && conn.playerId && (data.gender || (new Date(data.DOB).getTime() <= new Date().getTime() )));
        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerInfoClient, [{playerId: conn.playerId}, data, inputDevice], isValidData, false, false, true);
    };

    //update player QQ
    this.updatePlayerQQ.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerQQProposal, [{playerId: conn.playerId}, data, inputDevice], isValidData);
    };

    this.updatePlayerWeChat.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerWeChatProposal, [{playerId: conn.playerId}, data, inputDevice], isValidData);
    };

    this.updatePlayerEmail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerEmailProposal, [{playerId: conn.playerId}, data, inputDevice], isValidData);
    };


    this.updatePhoneNumberWithSMS.expectsData = 'playerId: String, phoneNumber: Number';
    this.updatePhoneNumberWithSMS.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent;
        let isValidData = Boolean(data && data.platformId && data.playerId && (data.playerId == conn.playerId) && data.smsCode);
        // data.phoneNumber = data.phoneNumber || "";
        data.newPhoneNumber = data.newPhoneNumber || "";
        // let queryRes = queryPhoneLocation(data.phoneNumber);
        // if (queryRes) {
        //     data.phoneProvince = queryRes.province;
        //     data.phoneCity = queryRes.city;
        //     data.phoneType = queryRes.type;
        // }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.updatePhoneNumberWithSMS, [data.userAgent, data.platformId, data.playerId, String(data.newPhoneNumber), data.smsCode, 0], isValidData);
    };

    this.updatePlayerPartnerPhoneNumberWithSMS.expectsData = 'playerId: String, phoneNumber: Number';
    this.updatePlayerPartnerPhoneNumberWithSMS.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        data.userAgent = userAgent
        let isValidData = Boolean(data && data.platformId && data.playerId && (data.playerId == conn.playerId) && data.phoneNumber && data.smsCode);
        let queryRes = queryPhoneLocation(data.phoneNumber);
        if (queryRes) {
            data.phoneProvince = queryRes.province;
            data.phoneCity = queryRes.city;
            data.phoneType = queryRes.sp;
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.updatePhoneNumberWithSMS, [data.userAgent, data.platformId, data.playerId, data.newPhoneNumber, data.smsCode, 2], isValidData);
    };

    //player login api handler
    //added case
    this.login.expectsData = 'name: String, password: String, platformId: String';
    this.login.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.name && data.password && data.platformId);
        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        let md = new mobileDetect(uaString);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        if(data.deviceId || data.guestDeviceId) {
            inputDevice = constPlayerRegistrationInterface.APP_NATIVE_PLAYER;
        }

        data.lastLoginIp = dbUtility.getIpAddress(conn);

        if (data.deviceType) {
            data.loginDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.loginDevice = String(data.loginDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(data.loginDevice)) {
            //     isValidData = false;
            // }
        }

        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLogin, [data, ua, inputDevice, md, data.checkLastDeviceId], isValidData, true, true, true).then(
            playerData => {
                if (conn.noOfAttempt >= constSystemParam.NO_OF_LOGIN_ATTEMPT || playerData.platform.requireLogInCaptcha) {
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
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
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
                conn.viewInfo = playerData.viewInfo;
                conn.platformId = data.platformId;
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

                const appDevices = [constPlayerRegistrationInterface.APP_AGENT, constPlayerRegistrationInterface.APP_PLAYER,
                    constPlayerRegistrationInterface.APP_NATIVE_PLAYER, constPlayerRegistrationInterface.APP_NATIVE_PARTNER];
                let expireDuration;
                if (inputDevice && appDevices.includes(Number(inputDevice))) {
                    expireDuration = 60 * 60 * 24 * 30;
                } else {
                    expireDuration = 60 * 60 * 5;
                }

                var profile = {name: playerData.name, password: playerData.password};
                var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: expireDuration});

                if (playerData.phoneNumber) {
                    playerData.phoneNumber = dbUtility.encodePhoneNum(playerData.phoneNumber);
                }
                playerData.email = dbUtility.encodeEmail(playerData.email);
                if (playerData.bankAccount) {
                    playerData.bankAccount = dbUtility.encodeBankAcc(playerData.bankAccount);
                }

                // Trace user online time
                dbPlayerOnlineTime.loginTimeLog(playerData._id, playerData.platform._id, token).catch(errorUtils.reportError);

                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                }, data);
            },
            error => {
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
                            errorMessage: localization.translate(error.message, conn.lang, conn.platformId),
                        }, data);
                    }
                    else {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.playerId = null;
                        conn.playerObjId = null;
                        conn.captchaCode = null;
                        wsFunc.response(conn, {
                            status: error.code || constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                        }, data);
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    // player and partner login api handler
    this.loginPlayerPartner.expectsData = 'name: String, password: String, platformId: String';
    this.loginPlayerPartner.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.name && data.password && data.platformId);

        data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                data.lastLoginIp = forwardedIp[0].trim();
            }
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
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
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
                        errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.loginPlayerPartnerWithSMS.expectsData = 'phoneNumber: String, smsCode: String, platformId: String';
    this.loginPlayerPartnerWithSMS.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.smsCode && data.platformId);

        data.lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                data.lastLoginIp = forwardedIp[0].trim();
            }
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
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
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
                            errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang, conn.platformId),
                        }, data);
                    } else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                        }, data);
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    //added case
    this.isLogin.expectsData = 'playerId: String';
    this.isLogin.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.isLogin, [data.playerId], isValidData, false, false, true);
    };

    //player logout api handler
    //added case
    this.logout.expectsData = 'playerId: String';
    this.logout.onRequest = function (wsFunc, conn, data) {
        let isValidData = true;
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLogout, [{playerId: conn.playerId}], isValidData, true, false, true).then(
            function (res) {
                conn.isAuth = false;
                conn.playerId = null;
                conn.playerObjId = null;
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);

            }).catch(WebSocketUtil.errorHandler);
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
            }).catch(WebSocketUtil.errorHandler);
    };

    //
    //added case
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
        ).catch(WebSocketUtil.errorHandler);
    };

    this.isValidRealName.expectsData = 'realName: String, platformId: String';
    this.isValidRealName.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.realName && data.platformId);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.isPlayerRealNameExist, [data], isValidData, true, false, true).then(
            res => {
                if (res && res.isPlayerRealNameExist) {
                    // User Exists in db
                    wsFunc.response(conn, {
                        status: constServerCode.PLAYER_REALNAME_EXIST,
                        errorMessage: localization.translate("Realname already exists", conn.lang, conn.platformId),
                        data: true,
                    }, data);
                }
                else if (res && res.isPlayerRealNameNonChinese) {
                    wsFunc.response(conn, {
                        status: constServerCode.PLAYER_REALNAME_MUST_BE_CHINESE,
                        errorMessage: localization.translate("Realname should be chinese character", conn.lang, conn.platformId),
                        data: true,
                    }, data);
                }
                else {
                    // Passed
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        errorMessage: localization.translate("Success", conn.lang, conn.platformId),
                        data: true,
                    }, data);
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    //added case
    this.updatePassword.expectsData = 'playerId: String, oldPassword: String, newPassword: String';
    this.updatePassword.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        let isValidData = Boolean(data && data.playerId && data.oldPassword && data.newPassword && (data.playerId == conn.playerId));
        data.smsCode = data.smsCode ? data.smsCode : "";
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePassword, [data.playerId, data.oldPassword, data.newPassword, data.smsCode, userAgent], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                    data: res
                }, data);
                //SMSSender.sendByPlayerId(data.playerId, constPlayerSMSSetting.UPDATE_PASSWORD);
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.settingPlayerPassword.expectsData = 'playerId: String, password: String';
    this.settingPlayerPassword.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        let isValidData = Boolean(data && data.password);
        data.smsCode = data.smsCode ? data.smsCode : "";
        let isAppFirstPWD = true;
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePassword, [conn.playerId, null, data.password, data.smsCode, userAgent, isAppFirstPWD], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                    data: res
                }, data);
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.inquireAccountByPhoneNumber.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.smsCode && data.phoneNumber);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.inquireAccountByPhoneNumber, [data.platformId, data.phoneNumber, data.smsCode], isValidData, false, false, true);
    };

    this.resetPassword.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        var isValidData = Boolean(data && data.platformId && data.name && (!(data.answer && !data.answer.length)) && (Boolean(data.phoneNumber) === Boolean(data.smsCode)));
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.resetPassword, [data.platformId, data.name, data.smsCode, data.answer, data.phoneNumber, data.code, userAgent], isValidData, false, false, true);
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
        ).catch(WebSocketUtil.errorHandler);
    };

    //added case
    this.updatePhotoUrl.expectsData = 'photoUrl: String';
    this.updatePhotoUrl.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.photoUrl);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePlayerInfo, [{playerId: conn.playerId}, {photoUrl: data.photoUrl}], isValidData, true, false, false).then(
            function (res) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, // operation successful
                }, data);
            }).catch(WebSocketUtil.errorHandler);
    };

    //added case
    this.getCreditBalance.expectsData = '';
    this.getCreditBalance.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getCreditBalance, [{playerId: conn.playerId}], isValidData);
    };


    this.updatePaymentInfo.expectsData = 'playerId: String';
    this.updatePaymentInfo.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        let isValidData = Boolean(data && data.playerId && (data.playerId == conn.playerId) && data.bankName);
        if (data.bankAccount && !(data.bankAccount.length >= constSystemParam.BANK_ACCOUNT_LENGTH && (/^\d+$/).test(data.bankAccount))) {
            isValidData = false;
        }
        if (data.bankAddress) {
            data.bankAddress = data.bankAddress.replace(/[`~【】 。、“”……·!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\uFF00-\uFFEF]/gi, ""); // remove special characters
        }
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.updatePlayerPayment, [userAgent, {playerId: conn.playerId}, data, null, false], isValidData, true, false, false).then(
            function (res) {
                if (res) {
                    wsFunc.response(conn, {status: constServerCode.SUCCESS}, data);
                    /*// reference to constmessageTypeParam
                    let sendMessageData = {
                         data:{bankAccount: data.bankAccount.substr(data.bankAccount.length - 4)},
                         createTime: new Date(),
                         proposalId:'' // API call skip proposal, so does not have proposalId
                    }
                    SMSSender.sendByPlayerId(data.playerId, constMessageType.UPDATE_BANK_INFO_SUCCESS , sendMessageData);
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
                    dbLogger.createBankInfoLog(loggerInfo);*/
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.COMMON_ERROR,
                        errorMessage: "Player is not found"
                    }, data);
                }
            }
            // ,
            // function (error) {
            //     if (error != "INVALID_DATA") {
            //         wsFunc.response(conn, {
            //             status: constServerCode.COMMON_ERROR
            //         }, data);
            //     }
            // }
        ).catch(WebSocketUtil.errorHandler);
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
        ).catch(WebSocketUtil.errorHandler);
    };

    this.captcha.expectsData = '';
    this.captcha.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getCaptcha, [conn], true, false, false, true);
    };

    this.getSMSCode.expectsData = 'phoneNumber: String, name: String, purpose: String, partnerName: String';
    this.getSMSCode.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.platformId);
        let randomCode = parseInt(Math.random() * 9000 + 1000);
        conn.phoneNumber = data.phoneNumber;
        conn.smsCode = randomCode;
        let captchaValidation = conn.captchaCode && data.captcha && conn.captchaCode.toString() === data.captcha.toString();
        conn.captchaCode = null;
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        // wsFunc.response(conn, {status: constServerCode.SUCCESS, data: randomCode}, data);
        data.lastLoginIp = dbUtility.getIpAddress(conn);
        data.ipAddress = data.lastLoginIp;
        data.loginIps = [data.lastLoginIp];
        data.ipArea = {'province':'', 'city':''};
        if (conn.isAuth && conn.playerId && !data.name) {
            data.playerId = conn.playerId;
        }

        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        data.userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || '',
            os: ua.os.name || ''
        }];

        data.remarks = data.partnerName ? localization.translate("PARTNER", conn.lang, conn.platformId) + ": " + data.partnerName : "";

        if (data.phoneNumber && data.phoneNumber.toString().length === 11) {
            WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendVerificationCodeToNumber, [conn.phoneNumber, conn.smsCode, data.platformId, captchaValidation, data.purpose, inputDevice, data.name, data, false, null, data.useVoiceCode], isValidData, false, false, true);
        } else {
            conn.captchaCode = null;
            wsFunc.response(conn, {
                status: constServerCode.INVALID_PHONE_NUMBER,
                errorMessage: localization.translate("Invalid phone number", conn.lang, conn.platformId),
                data: null
            }, data);
        }
    };

    this.sendSMSCodeToPlayer.expectsData = 'platformId: String';
    this.sendSMSCodeToPlayer.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.platformId);
        let smsCode = parseInt(Math.random() * 9000 + 1000);
        let captchaValidation = conn.captchaCode && data.captcha && conn.captchaCode.toString() === data.captcha.toString();
        conn.captchaCode = null;
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        let requestIp = dbUtility.getIpAddress(conn);
        let inputData = {};
        inputData.ipAddress = dbUtility.getIpAddress(conn);

        // Spam check temporary log
        console.log('sendSMSCodeToPlayer IP: ', requestIp);

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.sendVerificationCodeToPlayer, [conn.playerId, smsCode, data.platformId, captchaValidation, data.purpose, inputDevice, inputData, data.useVoiceCode], isValidData);
    };

    this.verifyPhoneNumberBySMSCode.expectsData = 'smsCode: String';
    this.verifyPhoneNumberBySMSCode.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.smsCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerMail.verifyPhoneNumberBySMSCode, [conn.playerId, data.smsCode], isValidData);
    };

    this.getPlayerBillBoard.expectsData = 'smsCode: String';
    this.getPlayerBillBoard.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && (data.platformId || data.playerId) && ((data.hourCheck && data.hourCheck <= 24) || data.periodCheck) && !(data.hourCheck && data.periodCheck) && data.mode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.prepareGetPlayerBillBoard, [data.platformId, data.periodCheck, data.hourCheck, data.recordCount, data.playerId, data.mode, data.providerId], isValidData, false, false, true);
    };

    this.authenticate.expectsData = 'playerId: String, token: String';
    this.authenticate.onRequest = function(wsFunc, conn, data) {
        let isValidData = Boolean(data && data.playerId && data.token);
        let playerIp = dbUtility.getIpAddress(conn);
        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        let md = new mobileDetect(uaString);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);

        let loginDevice;
        if(data.isLogin && data.deviceType) {
            loginDevice = String(data.deviceType);
            if (data.subPlatformId) {
                loginDevice = String(loginDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(loginDevice)) {
            //     isValidData = false;
            // }
        }

        WebSocketUtil.performAction(
            conn, wsFunc, data, dbPlayerInfo.authenticate,
            [data.playerId, data.token, playerIp, conn, data.isLogin, ua, md, inputDevice, data.clientDomain, loginDevice], true, false, false, true
        );
    };

    this.authenticatePlayerPartner.expectsData = 'playerId: String, partnerId: String, token: String';
    this.authenticatePlayerPartner.onRequest = function (wsFunc, conn, data) {
        let playerIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                playerIp = forwardedIp[0].trim();
            }
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerPartner.authenticatePlayerPartner, [data.playerId, data.partnerId, data.token, playerIp, conn], true, false, false, true);
    };

    //added case
    this.updateSmsSetting.expectsData = '';
    this.updateSmsSetting.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && Object.keys(data).length > 0);
        var updateData = {};
        Object.keys(data).forEach(key => updateData["smsSetting." + key] = data[key])
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerInfo, [{playerId: conn.playerId}, updateData], isValidData);
    };

    this.getSmsStatus.expectsData = 'playerId: String';
    this.getSmsStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerSmsStatus, [conn.playerId], isValidData);
    };

    this.setSmsStatus.expectsData = 'playerId: String';
    this.setSmsStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && conn.playerId && data.status);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.setPlayerSmsStatus, [conn.playerId, data.status], isValidData);
    };

    this.getPlayerDayStatus.expectsData = 'playerId: String';
    this.getPlayerDayStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerStatus, [conn.playerId, true, data.providerIds], isValidData);
    };

    this.getPlayerAnyDayStatus.expectsData = 'playerId: String';
    this.getPlayerAnyDayStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerAnyDayStatus, [conn.playerId, data.providerIds, data.startTime], isValidData);
    };

    //added case
    this.getPlayerWeekStatus.expectsData = '';
    this.getPlayerWeekStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerStatus, [conn.playerId, false, data.providerIds], isValidData);
    };

    //added case
    this.getPlayerMonthStatus.expectsData = '';
    this.getPlayerMonthStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPlayerMonthStatus, [conn.playerId, data.providerIds], isValidData);
    };

    //added case
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
            // console.log("notifyNewMail:", data);
            WebSocketUtil.notifyMessageClient(self, "notifyNewMail", data);
        }
    );

    this.addClientSourceLog.expectsData = 'sourceUrl: String';
    this.addClientSourceLog.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.sourceUrl);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createPlayerClientSourceLog, [data], isValidData, false, false, true);
    };

    this.resetPasswordViaPhone.expectsData = 'platformId: String, password: String, smsCode: String, phoneNumber: String';
    this.resetPasswordViaPhone.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.platformId && data.phoneNumber && data.password && (data.password.length >= constSystemParam.PASSWORD_LENGTH));
        if ((conn.smsCode && (conn.smsCode == data.smsCode) && (conn.phoneNumber == data.phoneNumber))) {
            WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.resetPlayerPasswordByPhoneNumber, [data.phoneNumber, data.password, data.platformId, true], isValidData, false, false, true);
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

    this.readMail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.mailObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.readMail, [conn.playerId, data.mailObjId], isValidData, false, false, true);
    };

    this.deleteAllMail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.deleteAllMail, [conn.playerId, data.hasBeenRead], isValidData, false, false, true);
    };

    this.deleteMail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId && data && data.mailObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.deleteMail, [conn.playerId, data.mailObjId], isValidData, false, false, true);
    };

    this.getUnreadMail.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getUnreadMail, [conn.playerId], isValidData, false, false, true);
    };


    this.manualPlayerLevelUp.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.manualPlayerLevelUp, [conn.playerObjId, userAgent], isValidData);
    };

    //added case
    this.getWithdrawalInfo.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getWithdrawalInfo, [data.platformId, conn.playerId], isValidData);
    };

    //added case
    this.getCreditDetail.onRequest = function (wsFunc, conn, data) {
        var isValidData = true;
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getCreditDetail, [conn.playerObjId], isValidData, null, null, false, true);
    };

    this.loginJblShow.onRequest = function (wsFunc, conn, data) {
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.loginJblShow, [conn.playerObjId], true);
    };

    this.createDemoPlayer.onRequest = function (wsFunc, conn, data) {
        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        let userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || '',
            os: ua.os.name || ''
        }];
        let userAgentString = uaString;

        let lastLoginIp = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp && forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                lastLoginIp = forwardedIp[0].trim();
            }
        }
        let loginIps = [lastLoginIp];

        let country, city, province, longitude, latitude;
        let geo = dbUtility.getIpLocationByIPIPDotNet(lastLoginIp);
        if (geo) {
            country = geo.country;
            city = geo.city;
            province = geo.province || null;
            longitude = geo.ll ? geo.ll[1] : null;
            latitude = geo.ll ? geo.ll[0] : null;
        }
        let deviceData = {userAgent, lastLoginIp, loginIps, country, city, province, longitude, latitude};

        let isValidData = Boolean(data && data.platformId);
        let phoneNumber = data.phoneNumber? data.phoneNumber: null;

        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.createDemoPlayer, [data.platformId, data.smsCode, data.phoneNumber, deviceData, userAgentString], isValidData, false, false, true);
    };

    this.changeBirthdayDate.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerObjId && data && data.date);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.changeBirthdayDate, [conn.playerObjId, data.date, inputDevice], isValidData);
    };

    this.getClientData.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getClientData, [conn.playerId], isValidData);
    };

    this.saveClientData.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId && data && data.clientData && typeof data.clientData == "string");
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.saveClientData, [conn.playerId, data.clientData], isValidData);
    };

    this.callBackToUser.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId && data.randomNumber && data.captcha);
        let ipAddress = dbUtility.getIpAddress(conn);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.callBackToUser, [data.platformId, data.phoneNumber, data.randomNumber, data.captcha, data.lineId, conn.playerId, ipAddress], isValidData, false, false, true);
    };

    this.getOMCaptcha.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlatform.getOMCaptcha, [data.platformId], isValidData, false, false, true);
    };

    this.getReceiveTransferList.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data.platformId && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getReceiveTransferList, [data.platformId, conn.playerId, data.startTime, data.endTime, data.requestPage, data.count], isValidData);
    };

    this.setPhoneNumber.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.number);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.setPhoneNumber, [conn.playerId, data.number, data.smsCode], isValidData)
    };

    this.playerLoginOrRegisterWithSMS.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.smsCode && data.platformId);
        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);

        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        if(data.deviceId || data.guestDeviceId) {
            inputDevice = constPlayerRegistrationInterface.APP_NATIVE_PLAYER;
        }
        var md = new mobileDetect(uaString);
        data.ua = ua;
        data.md = md;
        data.inputDevice = inputDevice;

        let lastLoginIp = dbUtility.getIpAddress(conn);
        data.lastLoginIp = lastLoginIp;

        let country, city, province, longitude, latitude;
        let geo = dbUtility.getIpLocationByIPIPDotNet(lastLoginIp);
        if (geo) {
            country = geo.country;
            city = geo.city;
            province = geo.province || null;
            longitude = geo.ll ? geo.ll[1] : null;
            latitude = geo.ll ? geo.ll[0] : null;
        }
        if (data.phoneNumber) {
            let queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }

        if (data.deviceType) {
            data.loginDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.loginDevice = String(data.loginDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(data.loginDevice)) {
            //     isValidData = false;
            // }
        }

        data.registrationDevice = data.loginDevice;

        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.playerLoginOrRegisterWithSMS, [data, ua, data.checkLastDeviceId], isValidData, true, true, true).then(
            player => {
                let playerData = player[0] || player;

                data.playerId = data.playerId ? data.playerId : player.playerId;
                data.name = player.name ? player.name : null;
                data.remarks = player.partnerName ? localization.translate("PARTNER", conn.lang, conn.platformId) + ": " + player.partnerName : "";
                if(player && player.partnerId){
                    data.partnerId = player.partnerId;
                }
                data.promoteWay = player.promoteWay ? player.promoteWay : "";
                data.csOfficer = player.csOfficer ? player.csOfficer : "";
                data.domain = player.domain ? player.domain : "";
                data.ipArea = {'province': province|| '', 'city': city || '', 'country': country || ''};
                data.csOfficer = player.csOfficer ? player.csOfficer : "";

                // 1.手机号登录不产生注册意向
                // 2.手机号注册产生注册意向，并由【免验】归类到【尝试】
                if (player && player.isRegister) {
                    dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.SUCCESS).then(
                        isUpdateData => {
                            console.log("checking isUpdateData", isUpdateData)
                            if (!(isUpdateData[0] && isUpdateData[0]._id)) {
                                console.log("checking data.platformId", data.platformId)
                                dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI(data, constProposalStatus.SUCCESS, inputDevice).catch(errorUtils.reportError);
                            }
                        }
                    );
                }

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
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
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

                let isHitReferralLimitFlag = false;
                if (playerData && playerData.isHitReferralLimit && playerData.isHitReferralLimit.toString() === 'true') {
                    isHitReferralLimitFlag = playerData.isHitReferralLimit;
                    delete playerData.isHitReferralLimit;
                }

                let profile = {name: playerData.name, password: playerData.password};
                let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                    isHitReferralLimit: isHitReferralLimitFlag
                }, data);
            },
            error => {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.playerId = null;
                    conn.playerObjId = null;
                    conn.captchaCode = null;

                    if (error && error.message == "Invalid SMS Validation Code") {
                        wsFunc.response(conn, {
                            status: constServerCode.VALIDATION_CODE_EXPIRED,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang, conn.platformId),
                        }, data);
                    } else if (error && error.isRegisterError) {
                        wsFunc.response(conn, {
                            status: constServerCode.DEVICE_ID_ERROR,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate(error.message),
                        }, data);
                    } else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                        }, data);
                    }

                    console.log("createPlayerRegistrationIntentRecordAPI FAIL", error);
                    if (error && error.status != constServerCode.USERNAME_ALREADY_EXIST) {
                        dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordAPI(data, constProposalStatus.FAIL);
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.phoneNumberLoginWithPassword.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.password && data.platformId);
        let uaString = conn.upgradeReq.headers['user-agent'];
        let ua = uaParser(uaString);
        let md = new mobileDetect(uaString);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);

        data.lastLoginIp = dbUtility.getIpAddress(conn);

        if (data.deviceType) {
            data.loginDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.loginDevice = String(data.loginDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(data.loginDevice)) {
            //     isValidData = false;
            // }
        }

        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.phoneNumberLoginWithPassword, [data, ua, inputDevice, md, data.checkLastDeviceId], isValidData, true, true, true).then(
            playerData => {
                if (conn.noOfAttempt >= constSystemParam.NO_OF_LOGIN_ATTEMPT || playerData.platform.requireLogInCaptcha) {
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
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
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
                conn.viewInfo = playerData.viewInfo;
                conn.platformId = data.platformId;
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

                if (playerData.phoneNumber) {
                    playerData.phoneNumber = dbUtility.encodePhoneNum(playerData.phoneNumber);
                }
                playerData.email = dbUtility.encodeEmail(playerData.email);
                if (playerData.bankAccount) {
                    playerData.bankAccount = dbUtility.encodeBankAcc(playerData.bankAccount);
                }

                // Trace user online time
                dbPlayerOnlineTime.loginTimeLog(playerData._id, playerData.platform._id, token).catch(errorUtils.reportError);

                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token,
                }, data);
            },
            error => {
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
                            errorMessage: localization.translate(error.message, conn.lang, conn.platformId),
                        }, data);
                    }
                    else {
                        conn.noOfAttempt++;
                        conn.isAuth = false;
                        conn.playerId = null;
                        conn.playerObjId = null;
                        conn.captchaCode = null;
                        wsFunc.response(conn, {
                            status: error.code || constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                        }, data);
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.getBindBankCardList.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && conn.playerId && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getBindBankCardList, [conn.playerId, data.platformId], isValidData, false, false, true);
    };

    this.updateDeviceId.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.deviceId && conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updateDeviceId, [conn.playerId, data.deviceId], isValidData)
    };

    this.generateUpdatePasswordToken.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.name && data.platformId && data.phoneNumber && data.smsCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.generateUpdatePasswordToken, [data.platformId, data.name, data.phoneNumber, data.smsCode], isValidData, false, false, true);
    };

    this.updatePasswordWithToken.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.token && data.password);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePasswordWithToken, [data.token, data.password], isValidData, false, false, true);
    };

    this.checkIsAppPlayerAndAppliedReward.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn && conn.playerObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.checkIsAppPlayerAndAppliedReward, [conn.playerObjId], isValidData);
    };

    this.getPromoShortUrl.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.url && data.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getPromoShortUrl, [data], isValidData);
    };

    this.registerByPhoneNumberAndPassword.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.phoneNumber && data.smsCode);
        data.lastLoginIp = dbUtility.getIpAddress(conn);
        data.loginIps = [data.lastLoginIp];
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        var md = new mobileDetect(uaString);
        data.userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || (md && md.mobile()) ? md.mobile() : 'PC',
            os: ua.os.name || ''
        }];
        data.ua = ua;
        data.md = md;
        data.inputDevice = inputDevice;

        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }

        if(data.lastLoginIp && data.lastLoginIp != "undefined"){
            var ipData = dbUtility.getIpLocationByIPIPDotNet(data.lastLoginIp);
            if(ipData){
                data.ipArea = ipData;
                data.country = ipData.country || null;
                data.city = ipData.city || null;
                data.province = ipData.province || null;
            }else{
                data.ipArea = {'province':'', 'city':''};
                data.country = "";
                data.city = "";
                data.province = "";
            }
        }

        if (data.deviceType) {
            data.registrationDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.registrationDevice = String(data.registrationDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(data.registrationDevice)) {
            //     isValidData = false;
            // }
        }

        let inputData = Object.assign({}, data);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.registerByPhoneNumberAndPassword, [inputData], isValidData, true, true, true).then(
            player => {
                let playerData = player[0] || player;

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
                            errorMessage: localization.translate("Captcha code invalid", conn.lang, conn.platformId),
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

                let profile = {name: playerData.name, password: playerData.password};
                let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token
                }, data);
            },
            error => {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.playerId = null;
                    conn.playerObjId = null;
                    conn.captchaCode = null;

                    if (error && error.message == "Invalid SMS Validation Code") {
                        wsFunc.response(conn, {
                            status: constServerCode.VALIDATION_CODE_EXPIRED,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang, conn.platformId),
                        }, data);
                    } else if (error && error.isRegisterError) {
                        wsFunc.response(conn, {
                            status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate(error.message),
                        }, data);
                    } else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                        }, data);
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.loginByPhoneNumberAndPassword.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId && data.phoneNumber);
        data.lastLoginIp = dbUtility.getIpAddress(conn);
        data.loginIps = [data.lastLoginIp];
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        var md = new mobileDetect(uaString);
        data.userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || (md && md.mobile()) ? md.mobile() : 'PC',
            os: ua.os.name || ''
        }];
        data.ua = ua;
        data.md = md;
        data.inputDevice = inputDevice;

        if (data.phoneNumber) {
            var queryRes = queryPhoneLocation(data.phoneNumber);
            if (queryRes) {
                data.phoneProvince = queryRes.province;
                data.phoneCity = queryRes.city;
                data.phoneType = queryRes.sp;
            }
        }

        if(data.lastLoginIp && data.lastLoginIp != "undefined"){
            var ipData = dbUtility.getIpLocationByIPIPDotNet(data.lastLoginIp);
            if(ipData){
                data.ipArea = ipData;
                data.country = ipData.country || null;
                data.city = ipData.city || null;
                data.province = ipData.province || null;
            }else{
                data.ipArea = {'province':'', 'city':''};
                data.country = "";
                data.city = "";
                data.province = "";
            }
        }

        if (data.deviceType) {
            data.loginDevice = String(data.deviceType);
            if (data.subPlatformId) {
                data.loginDevice = String(data.loginDevice) + String(data.subPlatformId);
            }
            // let playerLoginDeviceArr = [];
            // for (let key in constDevice) {
            //     playerLoginDeviceArr.push(constDevice[key]);
            // }
            // if (!playerLoginDeviceArr.includes(data.loginDevice)) {
            //     isValidData = false;
            // }
        }

        let inputData = Object.assign({}, data);
        WebSocketUtil.responsePromise(conn, wsFunc, data, dbPlayerInfo.loginByPhoneNumberAndPassword, [inputData, ua, inputDevice, md], isValidData, true, true, true).then(
            player => {
                let playerData = player[0] || player;

                conn.isAuth = true;
                conn.playerId = playerData.playerId;
                conn.playerObjId = playerData._id;
                conn.noOfAttempt = 0;

                let profile = {name: playerData.name, password: playerData.password};
                let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    data: playerData,
                    token: token
                }, data);
            },
            error => {
                if (error != "INVALID_DATA") {
                    conn.noOfAttempt++;
                    conn.isAuth = false;
                    conn.playerId = null;
                    conn.playerObjId = null;
                    conn.captchaCode = null;

                    if (error && error.message == "Invalid SMS Validation Code") {
                        wsFunc.response(conn, {
                            status: constServerCode.VALIDATION_CODE_EXPIRED,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("Invalid SMS Validation Code", conn.lang, conn.platformId),
                        }, data);
                    } else if (error && error.isRegisterError) {
                        wsFunc.response(conn, {
                            status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate(error.message),
                        }, data);
                    } else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_USER_PASSWORD,
                            data: {noOfAttempt: conn.noOfAttempt},
                            errorMessage: localization.translate("User not found OR Invalid Password", conn.lang, conn.platformId),
                        }, data);
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler);
    };

    this.setPhoneNumberAndPassword.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.phoneNumber && data.password && data.smsCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.setPhoneNumberAndPassword, [conn.playerId, data.phoneNumber, data.password, data.smsCode], isValidData);
    };

    this.updatePasswordByPhoneNumber.expectsData = 'newPassword: String';
    this.updatePasswordByPhoneNumber.onRequest = function (wsFunc, conn, data) {
        let userAgent = conn['upgradeReq']['headers']['user-agent'];
        let isValidData = Boolean(data && data.platformId && data.phoneNumber && data.newPassword && data.smsCode);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePasswordByPhoneNumber, [data.platformId, data.phoneNumber, data.newPassword, data.smsCode, userAgent], isValidData, false, false, true);
    };

    this.getBankcardInfo.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(data && data.bankcard);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getBankcardInfo, [data.bankcard], isValidData, false, false, true)
    };

    this.updatePlayerAvatar.onRequest = function (wsFunc, conn, data) {
        let isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.updatePlayerAvatar, [{playerId: conn.playerId}, data], isValidData);
    };
};
var proto = PlayerServiceImplement.prototype = Object.create(PlayerService.prototype);
proto.constructor = PlayerServiceImplement;

module.exports = PlayerServiceImplement;
