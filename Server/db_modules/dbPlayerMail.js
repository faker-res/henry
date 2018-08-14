var dbPlayerMailFunc = function () {
};
module.exports = new dbPlayerMailFunc();
const dbconfig = require('./../modules/dbproperties');
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constMessageType = require("../const/constMessageType.js");
const constSystemParam = require("../const/constSystemParam.js");
const Q = require("q");
var smsAPI = require('../externalAPI/smsAPI');
var dbLogger = require('./../modules/dbLogger');
const dbPlayerRegistrationIntentRecord = require('./../db_modules/dbPlayerRegistrationIntentRecord.js');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment-timezone');
const SettlementBalancer = require('../settlementModule/settlementBalancer');
const constSMSPurpose = require('../const/constSMSPurpose');
const queryPhoneLocation = require('query-mobile-phone-area');
const constProposalStatus = require('../const/constProposalStatus');
const constRegistrationIntentRecordStatus = require('../const/constRegistrationIntentRecordStatus');
const dbUtility = require('./../modules/dbutility');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constServerCode = require('../const/constServerCode');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbPartner = require('./../db_modules/dbPartner');
const rsaCrypto = require('./../modules/rsaCrypto');
const errorUtils = require('../modules/errorUtils');
const localization = require("../modules/localization");

const dbPlayerMail = {

    /**
     * Create a new player mail
     * @param {json} data - The data of the player mail. Refer to playerMail schema.
     */
    createPlayerMail: function (playerMailData) {
        const playerMail = new dbconfig.collection_playerMail(playerMailData);
        return playerMail.save();
    },

    sendPlayerMailFromAdminToPlayer: function (platformId, adminId, adminName, playerIds, title, content) {
        playerIds = Array.isArray(playerIds) ? playerIds : [playerIds];

        let proms = playerIds.reduce((tempProms, playerId) => {
            tempProms.push(
                dbPlayerMail.createPlayerMail({
                    platformId: platformId,
                    senderType: 'admin',
                    senderId: adminId,
                    senderName: adminName,
                    recipientType: 'player',
                    recipientId: playerId,
                    title: title,
                    content: content
                })
            );
            return tempProms;
        }, []);

        return Q.all(proms).then((results) => {
            if (results) {
                let notifyProm = [];
                results.forEach((result) => {
                    // from mongoose object to js object
                    result = result.toObject();
                    delete result.senderName;
                    notifyProm.push(notifyPlayerOfNewMessage(result));
                });
                return Q.all(notifyProm);
            }
        });
    },

    sendPlayerMailFromAdminToPartner: function (platformId, adminId, adminName, partnerIds, title, content) {
        partnerIds = Array.isArray(partnerIds) ? partnerIds : [partnerIds];

        let proms = partnerIds.reduce((tempProms, partnerId) => {
            tempProms.push(
                dbPlayerMail.createPlayerMail({
                    platformId: platformId,
                    senderType: 'admin',
                    senderId: adminId,
                    senderName: adminName,
                    recipientType: 'partner',
                    recipientId: partnerId,
                    title: title,
                    content: content
                })
            );
            return tempProms;
        }, []);

        return Q.all(proms).then((results) => {
            if (results) {
                let notifyProm = [];
                results.forEach((result) => {
                    // from mongoose object to js object
                    result = result.toObject();
                    delete result.senderName;
                    notifyProm.push(notifyPartnerOfNewMessage(result));
                });
                return Q.all(notifyProm);
            }
        });
    },

    sendPlayerMailFromAdminToAllPlayers: function (platformId, adminId, adminName, title, content) {
        let stream = dbconfig.collection_players.find({platform: ObjectId(platformId)}).cursor({batchSize: 10000});
        let balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            return balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (users, request) {

                        var playerIds = [];
                        for (user in users) {
                            if (users[user]._id) {
                                playerIds.push(users[user]._id);
                            }
                        }
                        request("player", "sendPlayerMailFromAdminToPlayer", {
                            platformId: platformId,
                            adminId: adminId,
                            adminName: adminName,
                            playerIds: playerIds,
                            title: title,
                            content: content
                        });
                    }
                }
            );
        });

    },
    sendPlayerMailFromPlayerTo: function (senderPlayer, recipientType, recipientObjId, title, content) {
        return dbPlayerMail.createPlayerMail({
            platformId: senderPlayer.platform,
            senderType: 'player',
            senderId: senderPlayer._id,
            senderName: senderPlayer.name,
            recipientType: recipientType,
            recipientId: recipientObjId,
            title: title,
            content: content
        });
    },

    sendPlayerMailFromPlayerToPlayer: function (senderPlayerObjId, recipientPlayerId, title, content) {
        const findSender = dbconfig.collection_players.findById(senderPlayerObjId);
        const findRecipient = dbconfig.collection_players.findOne({playerId: recipientPlayerId});

        return Q.all([findSender, findRecipient]).spread(
            function (senderPlayer, recipientPlayer) {
                return dbPlayerMail.sendPlayerMailFromPlayerTo(senderPlayer, 'player', recipientPlayer._id, title, content);
            }
        ).then(notifyPlayerOfNewMessage);
    },

    sendPlayerMailFromPlayerToAdmin: function (senderPlayerObjId, recipientAdminObjId, title, content) {
        return dbconfig.collection_players.findById(senderPlayerObjId).then(
            function (senderPlayer) {
                return dbPlayerMail.sendPlayerMailFromPlayerTo(senderPlayer, 'admin', recipientAdminObjId, title, content);
            }
        );
    },

    /**
     * Get all player mails information  by  playerId  or _id
     * @param {String} query - Query string
     */
    getPlayerMails: function (query) {
        return dbconfig.collection_playerMail.find(query).sort({createTime: 1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    /**
     * Get all player mail by playerId
     * @param {String} playerId - playerId
     */
    getPlayerMailsByPlayerId: function (playerId) {
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
            playerData => {
                if (playerData) {
                    let returnArr = [];
                    let mailQ = {
                        recipientId: playerData._id,
                        bDelete: false
                    };

                    if (playerData.platform.unreadMailMaxDuration) {
                        let duration = playerData.platform.unreadMailMaxDuration;
                        let todayDate = new Date();
                        // get today end time
                        let todayEndDate = new Date(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0).getTime() + 24 * 3600 * 1000);

                        let endDate = todayEndDate.toISOString();
                        let startDate = new Date(new Date(todayEndDate.setMonth(todayEndDate.getMonth() - duration))).toISOString();

                        mailQ.createTime = {$gte: startDate, $lt: endDate};
                    }

                    return dbconfig.collection_playerMail.find(mailQ).lean().then(
                        playerMailData => {
                            if(playerMailData && playerMailData.length > 0) {
                                returnArr = playerMailData.map(playerMail => {
                                    if(playerMail){
                                        if(playerMail.senderType){
                                            delete playerMail.senderType;
                                        }

                                        if(playerMail.senderName){
                                            delete playerMail.senderName;
                                        }

                                        return playerMail;
                                    }
                                });
                            }

                            return returnArr;
                        }
                    );
                }
                else {
                    return Promise.reject({name: "DataError", message: "Player is not found"});
                }
            },
            function (error) {
                return Promise.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
    },

    getPlayerMailsByPartnerId: function (partnerId) {
        return dbconfig.collection_partner.findOne({partnerId: partnerId})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                partnerData => {
                    if (partnerData) {
                        let returnArr = [];
                        let mailQ = {
                            recipientId: partnerData._id,
                            bDelete: false
                        };

                        if (partnerData.platform.partnerUnreadMailMaxDuration) {
                            let duration = partnerData.platform.partnerUnreadMailMaxDuration;
                            let todayDate = new Date();
                            // get today end time
                            let todayEndDate = new Date(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0).getTime() + 24 * 3600 * 1000);

                            let endDate = todayEndDate.toISOString();
                            let startDate = new Date(new Date(todayEndDate.setMonth(todayEndDate.getMonth() - duration))).toISOString();

                            mailQ.createTime = {$gte: startDate, $lt: endDate};
                        }

                        return dbconfig.collection_playerMail.find(mailQ).lean().then(
                            playerMailData => {
                                if(playerMailData && playerMailData.length > 0) {
                                    returnArr = playerMailData.map(playerMail => {
                                        if(playerMail){
                                            if(playerMail.senderType){
                                                delete playerMail.senderType;
                                            }

                                            if(playerMail.senderName){
                                                delete playerMail.senderName;
                                            }

                                            return playerMail;
                                        }
                                    });
                                }

                                return returnArr;
                            }
                        );
                    }
                    else {
                        return Promise.reject({name: "DataError", message: "Partner is not found"});
                    }
                },
                function (error) {
                    return Promise.reject({name: "DBError", message: "Error in getting partner data", error: error});
                }
            );
    },

    sendSMStoNumber: function (adminObjId, adminName, data) {
        var sendObj = {
            tel: data.phoneNumber,
            channel: data.channel,
            platformId: data.platformId,
            message: data.message,
            delay: data.delay || 0
        };

        return dbPlayerMail.isFilteredKeywordExist(sendObj.message, data.platformId, "sms", data.channel).then(
            exist => {
                if (exist) {
                    return Promise.reject({errorMessage: "Content consist of sensitive keyword."})
                }

                return smsAPI.sending_sendMessage(sendObj).then(
                    retData => {
                        dbLogger.createSMSLog(adminObjId, adminName, data.phoneNumber, data, sendObj, null, 'success');
                        return retData;
                    },
                    retErr => {
                        dbLogger.createSMSLog(adminObjId, adminName, data.phoneNumber, data, sendObj, null, 'failure', retErr);
                        return Q.reject({message: retErr, error: retErr});
                    }
                );
            }
        );
    },

    sendVerificationSMS: function (platformObjId, platformId, data, verifyCode, purpose, inputDevice, playerName) {
        var sendObj = {
            tel: data.tel,
            channel: data.channel,
            platformId: data.platformId,
            message: data.message,
            delay: data.delay || 0,
        };
        return smsAPI.sending_sendMessage(sendObj).then(
            retData => {
                console.log(retData);
                console.log('[smsAPI] Sent verification code to: ', data.tel);
                dbLogger.createRegisterSMSLog("registration", platformObjId, platformId, data.tel, verifyCode, sendObj.channel, purpose, inputDevice, playerName, 'success');
                return retData;
            },
            retErr => {
                dbLogger.createRegisterSMSLog("registration", platformObjId, platformId, data.tel, verifyCode, sendObj.channel, purpose, inputDevice, playerName, 'failure', retErr);
                errorUtils.reportError(retErr);
                return dbPlayerMail.failSMSErrorOutHandler(data.tel);
            }
        );
    },

    failSMSErrorOutHandler: function (tel) {
        return dbconfig.collection_smsLog.find({tel: tel, status: 'success'}).sort({_id:-1}).limit(1).lean().then(
            logData => {
                let failSMSCountQuery = {
                    tel: tel,
                    status: 'failure'
                };
                if (logData && logData[0] && logData[0].createTime) {
                    failSMSCountQuery.createTime = {
                        $gt: logData[0].createTime
                    }
                }

                return dbconfig.collection_smsLog.find(failSMSCountQuery).count();
            }
        ).then(
            failedSMSCount => {
                if (failedSMSCount >= 5) {
                    return Promise.reject({
                        status: constServerCode.SMS_RETRY_FAILS_EXCEED,
                        name: "DataError",
                        message: "SMS failure for more than 5 times, please contact customer service"
                    });

                }
                else {
                    return Promise.reject({
                        status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                        name: "DataError",
                        message: "SMS failure, please retry"
                    });
                }
            },
            err => {
                errorUtils.reportError(err);
                return Promise.reject({
                    status: constServerCode.SMS_RETRY_FAILS_EXCEED,
                    name: "DataError",
                    message: "SMS failure for more than 5 times, please contact customer service"
                });
            }
        );
    },

    sendVerificationCodeToNumber: function (telNum, code, platformId, captchaValidation, purpose, inputDevice, playerName, inputData = {}, isPartner, partnerObjId) {
        let lastMin = moment().subtract(1, 'minutes');
        let channel = null;
        let platformObjId = null;
        let template = null;
        let lastMinuteHistory = null;
        let platform;
        let isFailedSms = false;
        let partner = null;
        let getPlatform = dbconfig.collection_platform.findOne({platformId: platformId}).lean();
        let seletedDb = dbPlayerInfo;
        let sameTelPermission = "allowSamePhoneNumberToRegister";
        let samTelCount = "samePhoneNumberRegisterCount";
        let whiteListPhone = "whiteListingPhoneNumbers";
        let requireCaptchaInSMS = "requireCaptchaInSMS";
        if (isPartner) {
            sameTelPermission = "partnerAllowSamePhoneNumberToRegister";
            samTelCount = "partnerSamePhoneNumberRegisterCount";
            requireCaptchaInSMS = "partnerRequireCaptchaInSMS";
            seletedDb = dbPartner;
        }
        let isSpam = false;

        return getPlatform.then(
            platformData => {
                if (platformData) {
                    platform = platformData;
                    platformObjId = platform._id;
                    // verify captcha if necessary
                    if (platform[requireCaptchaInSMS]) {
                        if (!captchaValidation) {
                            return Q.reject({
                                status: constServerCode.INVALID_CAPTCHA,
                                name: "DataError",
                                message: "Invalid image captcha"
                            });
                        }
                    }

                    if (isPartner) {
                        return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
                            partnerData => {
                                if (partnerData && partnerData.phoneNumber) {
                                    telNum = rsaCrypto.decrypt(partnerData.phoneNumber);
                                }
                            }
                        )
                    } else {
                        return dbconfig.collection_players.findOne({
                            platform: platformObjId,
                            name: playerName
                        }).lean().then(
                            playerData => {
                                if (playerData && playerData.phoneNumber) {
                                    telNum = rsaCrypto.decrypt(playerData.phoneNumber);
                                }
                            }
                        )
                    }
                } else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Platform does not exist"
                    });
                }
            }
        ).then(
            () => {
                if (telNum) {
                    /*
                    if (purpose && purpose == constSMSPurpose.REGISTRATION) {
                        let letterNumber = /^[0-9a-zA-Z]+$/;
                        // let prefixLength = platform.prefix ?　platform.prefix.length : 0;

                        if(!playerName.match(letterNumber)){
                            return Q.reject({
                                status: constServerCode.DATA_INVALID,
                                name: "DBError",
                                message: "Username must be alphanumeric"
                            });
                        }

                        if(platform.playerNameMinLength > 0){
                            if(playerName && playerName.length < platform.playerNameMinLength){
                                return Q.reject({
                                    status: constServerCode.DATA_INVALID,
                                    name: "DBError",
                                    message: localization.localization.translate("Username must be at least") + " " + platform.playerNameMinLength + " " + localization.localization.translate("characters")
                                });
                            }

                        }

                        if(platform.playerNameMaxLength > 0){
                            if(playerName && playerName.length > platform.playerNameMaxLength){
                                return Q.reject({
                                    status: constServerCode.DATA_INVALID,
                                    name: "DBError",
                                    message: localization.localization.translate("Username must be less than") + " " + platform.playerNameMaxLength + " " + localization.localization.translate("characters")
                                });
                            }
                        }
                    }
                    */

                    let pName = playerName; //could be player or partner
                    let letterNumber = /^[0-9a-zA-Z]+$/;
                    let pPrefix = isPartner ? platform.partnerPrefix : (inputData.partnerId ? platform.partnerCreatePlayerPrefix : platform.prefix);

                    // check pName must start with prefix
                    if (purpose && purpose === constSMSPurpose.REGISTRATION || purpose === constSMSPurpose.PARTNER_REGISTRATION) {
                        if (pName && pName.indexOf(pPrefix) !== 0) {
                            if (isPartner) {
                                return Q.reject({
                                    status: constServerCode.PARTNER_NAME_INVALID,
                                    name: "DataError",
                                    message: localization.localization.translate("Partner name should use ") + pPrefix + localization.localization.translate(" as prefix.")
                                });
                            } else {
                                // check if player is created by partner
                                if (inputData.partnerId) {
                                    return Promise.reject({
                                        status: constServerCode.PLAYER_NAME_INVALID,
                                        name: "DBError",
                                        message: localization.localization.translate("Player name created by partner should use ") + pPrefix + localization.localization.translate(" as prefix.")
                                    });
                                } else {
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NAME_INVALID,
                                        name: "DBError",
                                        message: localization.localization.translate("Player name should use ") + pPrefix + localization.localization.translate(" as prefix.")
                                    });
                                }
                            }
                        }
                    }

                    if(pName && !pName.match(letterNumber)) {
                        return Q.reject({
                            status: constServerCode.DATA_INVALID,
                            name: "DBError",
                            message: localization.localization.translate("Username must be alphanumeric")
                        });
                    }

                    if (purpose && purpose === constSMSPurpose.REGISTRATION) {
                        if ((platform.playerNameMaxLength > 0 && pName.length > platform.playerNameMaxLength) || (platform.playerNameMinLength > 0 && pName.length < platform.playerNameMinLength)) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NAME_INVALID,
                                name: "DBError",
                                message: localization.localization.translate("Player name should be between ") + platform.playerNameMinLength + " - " + platform.playerNameMaxLength + localization.localization.translate(" characters."),
                            });
                        }
                    }

                    if (purpose && purpose === constSMSPurpose.PARTNER_REGISTRATION && isPartner) {
                        if ((platform.partnerNameMaxLength > 0 && pName.length > platform.partnerNameMaxLength) || (platform.partnerNameMinLength > 0 && pName.length < platform.partnerNameMinLength)) {
                            return Q.reject({
                                status: constServerCode.PARTNER_NAME_INVALID,
                                name: "DBError",
                                message: localization.localization.translate("Partner name should be between ") + platform.partnerNameMinLength + " - " + platform.partnerNameMaxLength + localization.localization.translate(" characters."),
                            });
                        }
                    }

                    if(telNum && platform.blackListingPhoneNumbers){
                        let indexNo = platform.blackListingPhoneNumbers.findIndex(p => p == telNum);

                        if(indexNo != -1){
                            isSpam = true;
                            return Q.reject({name: "DataError", message: localization.localization.translate("This phone number is already used. Please insert other phone number.")});
                        }
                    }

                    let smsChannelProm = smsAPI.channel_getChannelList({});
                    let smsVerificationLogProm = dbconfig.collection_smsVerificationLog.findOne({
                        tel: telNum,
                        createTime: {$gt: lastMin}
                    }).lean();
                    let messageTemplateProm = dbconfig.collection_messageTemplate.findOne({
                        platform: platformObjId,
                        type: constMessageType.SMS_VERIFICATION,
                        format: "sms"
                    }).lean();

                    let validPhoneNumberProm = Promise.resolve({isPhoneNumberValid: true});
                    if (purpose === constSMSPurpose.REGISTRATION || purpose === constSMSPurpose.PARTNER_REGISTRATION || purpose === constSMSPurpose.NEW_PHONE_NUMBER) {
                        if (!(platform[whiteListPhone]
                                && platform[whiteListPhone].length > 0
                                && platform[whiteListPhone].indexOf(telNum) > -1)) {
                            let query = {
                                phoneNumber: rsaCrypto.encrypt(telNum.toString()),
                                platform: platformObjId,
                                isRealPlayer: true
                            };
                            if (isPartner) {
                                delete query.isRealPlayer;
                            }
                            if (platform[sameTelPermission] === true) {
                                validPhoneNumberProm =  seletedDb.isExceedPhoneNumberValidToRegister(query, platform[samTelCount]);
                            } else {
                                validPhoneNumberProm = seletedDb.isPhoneNumberValidToRegister(query);
                            }
                        }
                    }

                    let getPartnerProm = [];
                    if (isPartner && !playerName && partnerObjId) {
                        getPartnerProm = dbconfig.collection_partner.findOne({_id: partnerObjId}).lean();
                    }


                    return Promise.all([smsChannelProm, smsVerificationLogProm, messageTemplateProm, validPhoneNumberProm, getPartnerProm]);
                }
            }
        ).then(
            function (data) {
                if (data) {
                    channel = data[0] && data[0].channels && data[0].channels[0] ? 1 : 2;
                    lastMinuteHistory = data[1];
                    template = data[2];
                    let phoneValidation = data[3];
                    partner = data[4] ? data[4] : null;

                    if (isPartner) {
                        if (partner && partner.partnerName) {
                            playerName = partner.partnerName;
                        }
                    }

                    if (!phoneValidation || !phoneValidation.isPhoneNumberValid) {
                        isSpam = true;
                        if (purpose === constSMSPurpose.NEW_PHONE_NUMBER) {
                            return Promise.reject({
                                status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                                message: "New phone number is already used. Please insert other phone number."
                            });
                        }

                        return Promise.reject({
                            status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                            message: "This phone number is already used. Please insert other phone number."
                        });
                    }

                    if (!template) {
                        return Q.reject({message: 'Template not set for current platform'});
                    }


                    template.content = template.content.replace('{{smsCode}}', code);
                    template.content = template.content.replace('smsCode', code); // for backward compatibility
                    template.content = template.content.replace('{{sendTime}}', new Date());
                    if (channel === null || platformId === null) {
                        return Q.reject({message: "cannot find platform or sms channel."});
                    }

                    // Check whether verification sms sent in last minute
                    if (lastMinuteHistory && lastMinuteHistory.tel) {
                        isSpam = true;
                        return Q.reject({
                            status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                            message: "Verification SMS already sent within last minute"
                        });
                    }


                    let saveObj = {
                        tel: telNum,
                        channel: channel,
                        platformObjId: platformObjId,
                        platformId: platformId,
                        code: code,
                        delay: 0
                    };

                    let sendObj = {
                        tel: telNum,
                        channel: channel,
                        platformId: platformId,
                        message: template.content,
                        delay: 0
                    };
                    // Log the verification SMS before send
                    new dbconfig.collection_smsVerificationLog(saveObj).save().catch(errorUtils.reportError);
                    return dbPlayerMail.sendVerificationSMS(platformObjId, platformId, sendObj, code, purpose, inputDevice, playerName);
                }
            }
        ).then(
            smsData => {
                if (inputData && inputData.lastLoginIp && inputData.lastLoginIp != "undefined") {
                    var ipData = dbUtility.getIpLocationByIPIPDotNet(inputData.lastLoginIp);

                    if(ipData){
                        inputData.ipArea = ipData;
                    }else{
                        inputData.ipArea = {'province':'', 'city':''};
                    }
                }
                return smsData;
            },
            error => {
                isFailedSms = true;
                return Promise.reject(error)
            }
        ).then(
            retData => {
                console.log('[smsAPI] Sent verification code to: ', telNum);
                if (retData) {
                    if (purpose && purpose == constSMSPurpose.REGISTRATION) {
                        if (inputData) {
                            if (inputData.playerId) {
                                delete inputData.playerId;
                            }
                            //inputData = inputData || {};
                            inputData.smsCode = code;

                            if (inputData.phoneNumber) {
                                var queryRes = queryPhoneLocation(inputData.phoneNumber);
                                if (queryRes) {
                                    inputData.phoneProvince = queryRes.province;
                                    inputData.phoneCity = queryRes.city;
                                    inputData.phoneType = queryRes.type;
                                }

                                if (inputData.password) {
                                    delete inputData.password;
                                }

                                if (inputData.confirmPass) {
                                    delete inputData.confirmPass;
                                }

                                let proposalData = {
                                    creator: inputData.adminInfo || {
                                        type: 'player',
                                        name: inputData.name,
                                        id: inputData.playerId ? inputData.playerId : ""
                                    }
                                };

                                let newProposal = {
                                    creator: proposalData.creator,
                                    data: inputData,
                                    entryType: inputData.adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                    userType: inputData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                    inputDevice: inputDevice ? inputDevice : 0,
                                    status: constProposalStatus.PENDING
                                };

                                dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentionProposal(platformObjId, newProposal, constProposalStatus.PENDING);
                            }

                            let newIntentData = {
                                data: inputData,
                                status: constRegistrationIntentRecordStatus.VERIFICATION_CODE,
                                name: inputData.name
                            };
                            let newRecord = new dbconfig.collection_playerRegistrationIntentRecord(newIntentData);
                            return newRecord.save().then(data => {
                                return true;
                            });
                        }
                    }
                }

                return true;
            },
            error => {
                if (isFailedSms && purpose && purpose == constSMSPurpose.REGISTRATION && !isSpam) {
                    if (inputData && inputData.lastLoginIp && inputData.lastLoginIp != "undefined") {
                        var ipData = dbUtility.getIpLocationByIPIPDotNet(inputData.lastLoginIp);

                        if(ipData){
                            inputData.ipArea = ipData;
                        }else{
                            inputData.ipArea = {'province':'', 'city':''};
                        }

                        if (inputData) {
                            if (inputData.playerId) {
                                delete inputData.playerId;
                            }
                            inputData.smsCode = code;

                            if (inputData.phoneNumber) {
                                var queryRes = queryPhoneLocation(inputData.phoneNumber);
                                if (queryRes) {
                                    inputData.phoneProvince = queryRes.province;
                                    inputData.phoneCity = queryRes.city;
                                    inputData.phoneType = queryRes.type;
                                }

                                if (inputData.password) {
                                    delete inputData.password;
                                }

                                if (inputData.confirmPass) {
                                    delete inputData.confirmPass;
                                }

                                let proposalData = {
                                    creator: inputData.adminInfo || {
                                        type: 'player',
                                        name: inputData.name,
                                        id: inputData.playerId ? inputData.playerId : ""
                                    }
                                };

                                let newProposal = {
                                    creator: proposalData.creator,
                                    data: inputData,
                                    entryType: inputData.adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                    userType: inputData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                    inputDevice: inputDevice ? inputDevice : 0,
                                    status: constProposalStatus.PENDING
                                };

                                dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentionProposal(platformObjId, newProposal, constProposalStatus.PENDING);
                            }

                            let newIntentData = {
                                data: inputData,
                                status: constRegistrationIntentRecordStatus.VERIFICATION_CODE,
                                name: inputData.name
                            };
                            let newRecord = new dbconfig.collection_playerRegistrationIntentRecord(newIntentData);
                            newRecord.save().then(data => {
                                return true;
                            });
                        }
                    }

                }

                return Promise.reject(error);
            }
        );
    },

    sendVerificationCodeToPlayer: function (playerId, smsCode, platformId, captchaValidation, purpose, inputDevice) {
        let blackListingPhoneNumber = [];
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platform => {
                if(platform){
                    let platformObjId = platform._id;
                    blackListingPhoneNumber = platform.blackListingPhoneNumbers || [];
                    return dbconfig.collection_players.findOne({
                        playerId: playerId,
                        platform: platformObjId
                    }, {similarPlayers: 0}).lean();
                }
            },
            error => {
                return Q.reject({name: "DBError", message: "Error in getting platform data", error: error});
            }
        ).then(
            player => {
                // block send SMS code to player if it is Demo player and meet purpose condition
                if (player && !player.isRealPlayer && purpose && (purpose === 'oldPhoneNumber' || purpose === 'newPhoneNumber' || purpose === 'updateBankInfo' || purpose === 'freeTrialReward')) {
                    return Q.reject({
                        name: "DataError",
                        message: "Demo player cannot perform this action"
                    })
                }

                if(blackListingPhoneNumber.length > 0 && player.phoneNumber){
                    let indexNo = blackListingPhoneNumber.findIndex(p => p == player.phoneNumber);

                    if(indexNo != -1){
                        return Q.reject({name: "DataError", message: localization.localization.translate("Sending failed, phone number is invalid")});
                    }
                }

                return dbPlayerMail.sendVerificationCodeToNumber(player.phoneNumber, smsCode, platformId, captchaValidation, purpose, inputDevice, player.name);
            },
            error => {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
    },

    verifyPhoneNumberBySMSCode: function (playerId, smsCode) {
        let smsDetail = {};

        return dbconfig.collection_players.findOne({playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .lean().then(
            data => {
                if (!data || !data.platform) {
                    return Promise.reject({
                        name: "DBError",
                        message: "Error in getting player data"
                    })
                }
                let playerData = data;
                let platformData = data.platform;

                return dbPlayerMail.verifySMSValidationCode(playerData.phoneNumber, platformData, smsCode);
            }
        ).then(
            isVerify => {
                return Boolean(isVerify);
            }
        );
    },

    verifySMSValidationCode: function (phoneNumber, platformData, smsCode, playerName, isPartner) {
        if (!platformData) {
            platformData = {};
        }
        let smsVerificationExpireTime = "smsVerificationExpireTime"
        if (isPartner) {
            smsVerificationExpireTime = "partnerSmsVerificationExpireTime"
        }

        let expireTime = platformData[smsVerificationExpireTime] || 5;
        let smsExpiredDate = new Date();
        smsExpiredDate = smsExpiredDate.setMinutes(smsExpiredDate.getMinutes() - expireTime);

        let smsVerificationLogQuery = {
            platformObjId: platformData._id,
            tel: phoneNumber,
            createTime: {$gte: smsExpiredDate}
        };

        let smsProm = dbconfig.collection_smsVerificationLog.find(smsVerificationLogQuery).sort({createTime: -1}).limit(1).lean();

        return smsProm.then(
            verificationSMS => {
                if (!verificationSMS || !verificationSMS[0] || !verificationSMS[0].code) {
                    return Promise.reject({
                        status: constServerCode.VALIDATION_CODE_EXPIRED,
                        name: "ValidationError",
                        message: "There is no valid SMS Code. Please get another one."
                    });
                }

                verificationSMS = verificationSMS[0];

                if (verificationSMS.code == smsCode) {
                    return dbconfig.collection_smsVerificationLog.remove({
                        _id: verificationSMS._id
                    }).then(
                        () => {
                            dbLogger.logUsedVerificationSMS(verificationSMS.tel, verificationSMS.code, playerName);
                            return verificationSMS;
                        }
                    );
                }

                if (verificationSMS.loginAttempts > 3) {
                    // Safety - remove sms verification code after 5 attempts to prevent brute force attack
                    return dbconfig.collection_smsVerificationLog.remove(
                        {_id: verificationSMS._id}
                    ).then(() => {
                        dbLogger.logInvalidatedVerificationSMS(verificationSMS.tel, verificationSMS.code);
                        return Promise.reject({
                            status: constServerCode.VALIDATION_CODE_EXCEED_ATTEMPT,
                            name: "ValidationError",
                            message: "SMS validation code invalidated. Please get another one."
                        });
                    });
                }

                return dbconfig.collection_smsVerificationLog.findOneAndUpdate(
                    {_id: verificationSMS._id},
                    {$inc: {loginAttempts: 1}}
                ).then(() => {
                    return Promise.reject({
                        status: constServerCode.VALIDATION_CODE_INVALID,
                        name: "ValidationError",
                        message: "Incorrect SMS Validation Code"
                    });
                });
            }
        );
    },

    isFilteredKeywordExist: (string, platform, type, smsChannel) => {
        string = String(string);

        let platformProm = Promise.resolve({_id: platform});
        if (String(platform).length !== 24) {
            platformProm = dbconfig.collection_platform.findOne({platformId: platform}, {_id: 1}).lean();
        }

        return platformProm.then(
            platform => {
                if (!platform || !platform._id) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Platform not found.",
                    });
                }
                let platformObjId = platform._id;

                let filterQuery = {platform: platformObjId, type: type};
                if (type == "sms" && smsChannel) {
                    filterQuery.smsChannel = smsChannel;
                }
                return dbconfig.collection_keywordFilter.findOne(filterQuery).lean().then(
                    filter => {
                        if (filter && filter.keywords && filter.keywords.length) {
                            let keywords = filter.keywords
                            for (let i = 0; i < keywords.length; i++) {
                                if (string.includes(keywords[i])) {
                                    return true;
                                }
                            }
                        }

                        return false;
                    }
                );
            }
        );

    },

    setFilteredKeywords: (keywords, platform, type, smsChannel) => {
        let platformProm = Promise.resolve({_id: platform});
        if (String(platform).length !== 24) {
            platformProm = dbconfig.collection_platform.findOne({platformId: platform}, {_id: 1}).lean();
        }

        return platformProm.then(
            platform => {
                if (!platform || !platform._id) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Platform not found.",
                    });
                }
                let platformObjId = platform._id;

                let filterQuery = {platform: platformObjId, type: type};
                if (type == "sms" && smsChannel) {
                    filterQuery.smsChannel = smsChannel;
                }
                return dbconfig.collection_keywordFilter.findOneAndUpdate(filterQuery, {$addToSet: {keywords: {$each: keywords}}},  {upsert: true, new: true}).lean();
            }
        );

    },

    getFilteredKeywords: (platform, type, smsChannel) => {
        let platformProm = Promise.resolve({_id: platform});
        if (String(platform).length !== 24) {
            platformProm = dbconfig.collection_platform.findOne({platformId: platform}, {_id: 1}).lean();
        }

        return platformProm.then(
            platform => {
                if (!platform || !platform._id) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Platform not found.",
                    });
                }
                let platformObjId = platform._id;

                let filterQuery = {platform: platformObjId, type: type};
                if (type == "sms" && smsChannel) {
                    filterQuery.smsChannel = smsChannel;
                }
                return dbconfig.collection_keywordFilter.findOne(filterQuery).lean();
            }
        );
    },

    removeFilteredKeywords: (keywords, platform, type, smsChannel) => {
        let platformProm = Promise.resolve({_id: platform});
        if (String(platform).length !== 24) {
            platformProm = dbconfig.collection_platform.findOne({platformId: platform}, {_id: 1}).lean();
        }

        return platformProm.then(
            platform => {
                if (!platform || !platform._id) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Platform not found.",
                    });
                }
                let platformObjId = platform._id;

                let filterQuery = {platform: platformObjId, type: type};
                if (type == "sms" && smsChannel) {
                    filterQuery.smsChannel = smsChannel;
                }
                return dbconfig.collection_keywordFilter.findOneAndUpdate(filterQuery, {$pullAll: {keywords: keywords}},  {new: true}).lean();
            }
        );
    },

    getAllFilteredKeyword: (platform) => {
        return dbconfig.collection_keywordFilter.find({platform: platform}).lean();
    },
};

const notifyPlayerOfNewMessage = (data) => {
    var wsMessageClient = serverInstance.getWebSocketMessageClient();
    if (wsMessageClient) {
        wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "player", "notifyNewMail", data);
    }
    return data;
};

const notifyPartnerOfNewMessage = (data) => {
    var wsMessageClient = serverInstance.getWebSocketMessageClient();
    if (wsMessageClient) {
        wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "partner", "notifyNewMail", data);
    }
    return data;
};

var proto = dbPlayerMailFunc.prototype;
proto = Object.assign(proto, dbPlayerMail);

module.exports = dbPlayerMail;
