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
                    notifyProm.push(notifyPlayerOfNewMessage(result));
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
        return dbconfig.collection_players.findOne({playerId: playerId}).then(
            function (data) {
                if (data) {
                    return dbconfig.collection_playerMail.find({recipientId: data._id, bDelete: false});
                }
                else {
                    return Q.reject({name: "DataError", message: "Player is not found"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
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
    },

    sendVertificationSMS: function (platformObjId, platformId, data, verifyCode, purpose, inputDevice, playerName) {
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
                return Q.reject({message: retErr, error: retErr});
            }
        );
    },

    sendVerificationCodeToNumber: function (telNum, code, platformId, captchaValidation, purpose, inputDevice, playerName, inputData) {
        let lastMin = moment().subtract(1, 'minutes');
        let channel = null;
        let platformObjId = null;
        let template = null;
        let lastMinuteHistory = null;
        let platform;
        let getPlatform = dbconfig.collection_platform.findOne({platformId: platformId}).lean();


        // if(inputData && inputData.lastLoginIp && inputData.lastLoginIp != "undefined"){
        //     dbUtility.getGeoIp(inputData.lastLoginIp).then(
        //         ipData=>{
        //             if(inputData) {
        //                 inputData.ipArea = ipData;
        //             }
        //         })
        // }

        return getPlatform.then(
            function (platformData) {
                if (platformData) {
                    platform = platformData;
                    platformObjId = platform._id;
                    // verify captcha if necessary
                    if (platform.requireCaptchaInSMS) {
                        if (!captchaValidation) {
                            return Q.reject({
                                name: "DataError",
                                message: "Invalid image captcha"
                            });
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

                    return Promise.all([smsChannelProm, smsVerificationLogProm, messageTemplateProm]);
                } else {
                    return Q.reject({
                        name: "DataError",
                        message: "Platform does not exist"
                    });
                }
            }
        ).then(
            function (data) {
                if (data) {
                    channel = data[0] && data[0].channels && data[0].channels[0] ? data[0].channels[0] : 2;
                    lastMinuteHistory = data[1];
                    template = data[2];

                    if (!template) {
                        return Q.reject({message: 'Template not set for current platform'});
                    }

                    template.content = template.content.replace('smsCode', code);

                    if (channel === null || platformId === null) {
                        return Q.reject({message: "cannot find platform or sms channel."});
                    }

                    // Check whether verification sms sent in last minute
                    if (lastMinuteHistory && lastMinuteHistory.tel) {
                        return Q.reject({message: "Verification SMS already sent within last minute"});
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
                    new dbconfig.collection_smsVerificationLog(saveObj).save();
                    return dbPlayerMail.sendVertificationSMS(platformObjId, platformId, sendObj, code, purpose, inputDevice, playerName);
                }
            }
        ).then(
            smsData => {
                if (inputData && inputData.lastLoginIp && inputData.lastLoginIp != "undefined") {
                    return dbUtility.getGeoIp(inputData.lastLoginIp).then(
                        ipData => {
                            if (ipData) {
                                inputData.ipArea = ipData;
                            }
                            return smsData;
                        },
                        error => smsData
                    );
                }
                return smsData;
            }
        ).then(
            retData => {
                console.log('[smsAPI] Sent verification code to: ', telNum);
                if (retData) {
                    if (inputData) {
                        if (inputData.playerId) {
                            delete inputData.playerId;
                        }

                        //if (purpose == constSMSPurpose.REGISTRATION) {
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
                                inputDevice: inputDevice ? inputDevice : 0
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

                return true;
            }
        );
    },

    sendVerificationCodeToPlayer: function (playerId, smsCode, platformId, captchaValidation, purpose, inputDevice) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platform => {
                let platformObjId = platform._id;
                return dbconfig.collection_players.findOne({
                    playerId: playerId,
                    platform: platformObjId
                }, {similarPlayers: 0}).lean();
            },
            error => {
                return Q.reject({name: "DBError", message: "Error in getting platform data", error: error});
            }
        ).then(
            player => {
                return dbPlayerMail.sendVerificationCodeToNumber(player.phoneNumber, smsCode, platformId, captchaValidation, purpose, inputDevice, player.name);
            },
            error => {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        );
    }
};

const notifyPlayerOfNewMessage = (data) => {
    var wsMessageClient = serverInstance.getWebSocketMessageClient();
    if (wsMessageClient) {
        wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "player", "notifyNewMail", data);
    }
    return data;
};

module.exports = dbPlayerMail;
