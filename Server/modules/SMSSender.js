/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

'use strict';

const dbconfig = require('./dbproperties');
const constPlayerSMSSetting = require('../const/constPlayerSMSSetting');
const constMessageType = require('../const/constMessageType');
const smsAPI = require('../externalAPI/smsAPI');
const localization = require("../modules/localization").localization;
const errorUtils = require("../modules/errorUtils.js");

const SMSSender = {

    sendByPlayerId: function (playerId, type) {
        var defaultChannel = null;
        var platformId = null;
        var phoneNumber = null;
        var nextChannel = null;
        dbconfig.collection_players.findOne({playerId: playerId}).populate({
            path: "platform", model: dbconfig.collection_platform
        }).then(
            playerData => {
                if (playerData && playerData.platform && playerData.receiveSMS && playerData.smsSetting && playerData.smsSetting[type]) {
                    platformId = playerData.platform.platformId;
                    phoneNumber = playerData.phoneNumber;
                    //get sms channel
                    smsAPI.channel_getChannelList({}).then(
                        channelData => {
                            if (channelData && channelData.channels && channelData.channels.length > 0) {
                                defaultChannel = channelData.channels[0];
                                if( channelData.channels.length > 1 ){
                                    nextChannel = channelData.channels[1];
                                }
                                //get message template
                                return dbconfig.collection_messageTemplate.findOne({
                                    platform: playerData.platform._id,
                                    type: type,
                                    format: "sms"
                                }).lean();
                            }
                        }
                    ).then(
                        template => {
                            if (template && template.content) {
                                var messageData = {
                                    channel: defaultChannel,
                                    tel: playerData.phoneNumber,
                                    platformId: platformId,
                                    message: template.content,
                                    delay: 0
                                };

                                return smsAPI.sending_sendMessage(messageData).then(
                                    () => {},
                                    error => {
                                        //todo::refactor this to properly while loop
                                        if( nextChannel != null ){
                                            var nextMessageData = {
                                                channel: nextChannel,
                                                tel: playerData.phoneNumber,
                                                platformId: platformId,
                                                message: template.content,
                                                delay: 0
                                            };
                                            return smsAPI.sending_sendMessage(nextMessageData);
                                        }
                                    }
                                );
                            }
                        }
                    ).then().catch(errorUtils.reportError);
                }
            }
        );
    },

    sendByPlayerObjId: function (playerObjId, type) {
        dbconfig.collection_players.findOne({_id: playerObjId}).then(
            playerData => {
                if( playerData ){
                    SMSSender.sendByPlayerId(playerData.playerId, type);
                }
            }
        ).then().catch(errorUtils.reportError);
    }

};

module.exports = SMSSender;