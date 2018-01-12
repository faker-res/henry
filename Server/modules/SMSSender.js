'use strict';

const dbconfig = require('./dbproperties');
const constPlayerSMSSetting = require('../const/constPlayerSMSSetting');
const constMessageType = require('../const/constMessageType');
const smsAPI = require('../externalAPI/smsAPI');
const localization = require("../modules/localization").localization;
const errorUtils = require("../modules/errorUtils.js");
const dbLogger = require('./dbLogger');
const SMSSender = {

    sendByPlayerId: function (playerId, type, proposalData) {
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
                                if(template.type === constMessageType.UPDATE_PASSWORD)
                                    template.content = template.content.replace('{{executeTime}}', new Date());
                                if(proposalData){
                                    let metaData = {proposalData: proposalData};
                                    template.content = renderTemplate(template.content, metaData);
                                }

                                var messageData = {
                                    channel: defaultChannel,
                                    tel: playerData.phoneNumber,
                                    platformId: platformId,
                                    message: template.content,
                                    delay: 0
                                };

                                let logData =  {
                                    purpose: type,
                                    playerId: playerId,
                                    channel: defaultChannel,
                                    platformId: platformId,
                                    tel: playerData.phoneNumber,
                                    message: template.content
                                };
                                if(proposalData)logData.proposalId =  proposalData.proposalId;
                                return smsAPI.sending_sendMessage(messageData).then(
                                    () => {
                                        dbLogger.createSMSLog(null, null, playerData.name, logData, {tel: playerData.phoneNumber}, null, 'success');
                                    },
                                    error => {
                                        dbLogger.createSMSLog(null, null, playerData.name, logData, {tel: playerData.phoneNumber}, null, 'failure');
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

    sendByPlayerObjId: function (playerObjId, type, proposalData) {
        dbconfig.collection_players.findOne({_id: playerObjId}).then(
            playerData => {
                if( playerData ){
                    SMSSender.sendByPlayerId(playerData.playerId, type, proposalData);
                }
            }
        ).then().catch(errorUtils.reportError);
    }

};

// Note that these functions are cloned from platformController.js
// Please keep them in sync!
/**
 * @param templateString
 * @param metaData
 * @returns {*}
 */

function renderTemplate(templateString, metaData) {
    const inputIsHTML = isHTML(templateString);

    if (inputIsHTML) {
        templateString = templateString.replace(/\n\n/g, '<p>').replace(/\n/g, '<br>');
    }

    const renderedString = templateString.replace(
        /{{([^}]*)}}/g,
        function (match, expr) {
            let value = lookupPath(metaData, expr);
            if (value === null || value === undefined) {
                value = '';
            }
            if (inputIsHTML) {
                value = stringToHTML(value);
            }
            return '' + value;
        }
    );

    return renderedString;
}
function lookupPath(obj, path) {
    const parts = path.split('.');
    parts.forEach(part => obj = obj[part]);
    return obj;
}
function isHTML(str) {
    return str.match(/<\w*>/);
}
function stringToHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

module.exports = SMSSender;