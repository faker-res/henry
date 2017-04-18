const dbconfig = require('./../modules/dbproperties');
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constSystemParam = require("../const/constSystemParam.js");
const Q = require("q");
var smsAPI = require('../externalAPI/smsAPI');
var dbLogger = require('./../modules/dbLogger');

const dbPlayerMail = {

    /**
     * Create a new player mail
     * @param {json} data - The data of the player mail. Refer to playerMail schema.
     */
    createPlayerMail: function (playerMailData) {
        const playerMail = new dbconfig.collection_playerMail(playerMailData);
        return playerMail.save();
    },

    sendPlayerMailFromAdminToPlayer: function (platformId, adminId, adminName, playerId, title, content) {
        return dbPlayerMail.createPlayerMail({
            platformId: platformId,
            senderType: 'admin',
            senderId: adminId,
            senderName: adminName,
            recipientType: 'player',
            recipientId: playerId,
            title: title,
            content: content
        }).then(notifyPlayerOfNewMessage);
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
                    return dbconfig.collection_playerMail.find({recipientId: data._id});
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
                return Q.reject({message: retErr, data: data});
            }
        );
    },

    sendVerificationCodeToNumber: function (telNum, code) {
        var a = smsAPI.channel_getChannelList({}).then(data => {
            return data
        });
        var b = dbconfig.collection_platform.find().limit(1).then(data => {
            return data ? data[0] : null;
        });
        return Q.all([a, b]).then(data => {
            var channel = data[0] && data[0].channels && data[0].channels[0] ? data[0].channels[0] : null;
            var platformId = data[1] && data[1].platformId ? data[1].platformId : null;
            if (channel == null || platformId == null) {
                return Q.reject({message: "cannot find platform or sms channel."});
            }
            var sendObj = {
                tel: telNum,
                channel: channel,
                platformId: platformId,
                message: "verification code： " + code,
                delay: data.delay || 0
            }
            smsAPI.sending_sendMessage(sendObj).then(
                retData => {
                    return true;
                },
                retErr => {
                    return Q.reject({message: retErr, data: data});
                }
            );
        })
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
