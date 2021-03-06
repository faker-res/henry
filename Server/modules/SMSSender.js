'use strict';

const dbconfig = require('./dbproperties');
const constPlayerSMSSetting = require('../const/constPlayerSMSSetting');
const constMessageType = require('../const/constMessageType');
const smsAPI = require('../externalAPI/smsAPI');
const localization = require("../modules/localization").localization;
const errorUtils = require("../modules/errorUtils.js");
const dbLogger = require('./dbLogger');
const constPromoCodeLegend = require("../const/constPromoCodeLegend.js");
const moment = require('moment-timezone');

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
                                // if(template.type === constMessageType.UPDATE_PASSWORD)
                                    template.content = template.content.replace('{{executeTime}}', moment(new Date()).format("YYYY/MM/DD HH:mm:ss"));
                                if(proposalData){
                                    if(proposalData.createTime)
                                        template.content = template.content.replace('{{proposalData.createTime}}', moment(proposalData.createTime).format("YYYY/MM/DD HH:mm:ss"));
                                    if(proposalData.settleTime)
                                        //use current Date for settleTime, because settleTime only update after proposalExecutor ,
                                        //and sendMessageToPlayer will call before settleTime update
                                        template.content = template.content.replace('{{proposalData.settleTime}}', moment(new Date()).format("YYYY/MM/DD HH:mm:ss"));
                                    let metaData = {proposalData: proposalData};
                                    if(proposalData.data.rewardAmount)
                                        template.content = template.content.replace('{{proposalData.data.rewardAmount}}', proposalData.data.rewardAmount.toFixed(2));
                                    if(proposalData.data.amount)
                                        template.content = template.content.replace('{{proposalData.data.amount}}', proposalData.data.amount.toFixed(2));
                                    if(proposalData.data.lastSettleTime)
                                        template.content = template.content.replace('{{proposalData.data.lastSettleTime}}', moment(proposalData.data.lastSettleTime).format("YYYY/MM/DD HH:mm:ss"));
                                    if(proposalData.data.playerName)
                                        template.content = template.content.replace('{{playerName}}', proposalData.data.playerName);
                                    if(proposalData.newPassword)
                                        template.content = template.content.replace('{{newPassword}}', proposalData.newPassword);
                                    if(proposalData.data.promoCode)
                                        template.content = template.content.replace('{{proposalData.data.promoCode}}', proposalData.data.promoCode);
                                    if(proposalData.data.productName)
                                        template.content = template.content.replace('{{proposalData.data.productName}}', proposalData.data.productName);
                                    // the time when the promoCode is expired
                                    if(proposalData.data.expirationTime)
                                        template.content = template.content.replace('{{proposalData.data.expirationTime}}', proposalData.data.expirationTime);
                                    if(proposalData.data.rewardPointsVariable)
                                        template.content = template.content.replace('{{proposalData.data.rewardPointsVariable}}', proposalData.data.rewardPointsVariable);

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
                                        dbLogger.createSMSLog(null, null, playerData.name, logData, {tel: playerData.phoneNumber}, null, 'failure',error);
                                        //todo::refactor this to properly while loop
                                        // if( nextChannel != null ){
                                        //     var nextMessageData = {
                                        //         channel: nextChannel,
                                        //         tel: playerData.phoneNumber,
                                        //         platformId: platformId,
                                        //         message: template.content,
                                        //         delay: 0
                                        //     };
                                        //     return smsAPI.sending_sendMessage(nextMessageData);
                                        // }
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
    },

    sendPromoCodeSMSByPlayerId(playerObjId, promoData, adminObjId, adminName, channel, platformObjId) {
        // var defaultChannel = null;
        var platformId = null;
        var phoneNumber = null;
        var nextChannel = null;
        let playerId = null;
        dbconfig.collection_players.findOne({_id: playerObjId}).populate({
            path: "platform", model: dbconfig.collection_platform
        }).then(
            playerData => {
                if (playerData && playerData.platform && playerData.receiveSMS) {
                    platformId = playerData.platform.platformId;
                    phoneNumber = playerData.phoneNumber;
                    playerId = playerData.playerId;

                    //get sms channel
                    smsAPI.getUsableChannel_getUsableChannelList({platformId: platformId}).then(
                        channelData => {
                            if (channelData && channelData.channels && channelData.channels.length > 1) {
                                // defaultChannel = 2;
                                let rawContent = promoData.promoCodeType ? promoData.promoCodeType.smsContent : promoData.smsContent;
                                let messageContent = SMSSender.contentModifier(rawContent,promoData);

                                let messageData = {
                                    channel: channel,
                                    tel: playerData.phoneNumber,
                                    platformId: platformId,
                                    message: messageContent,
                                    delay: 0
                                };

                                let logData = {
                                    playerId: playerId,
                                    channel: channel,
                                    platformId: platformId,
                                    tel: playerData.phoneNumber,
                                    message: messageContent,
                                };

                                let adminObjId$ = adminObjId ? adminObjId : null;
                                let adminName$ = adminName ? adminName : null;

                                return smsAPI.sending_sendMessage(messageData).then(
                                    () => {
                                        dbLogger.createSMSLog(adminObjId$, adminName$, playerData.name, logData, {tel: playerData.phoneNumber}, platformObjId, 'success');
                                    },
                                    error => {
                                        dbLogger.createSMSLog(adminObjId$, adminName$, playerData.name, logData, {tel: playerData.phoneNumber}, platformObjId, 'failure');
                                    }
                                );
                            }
                        }
                    ).then().catch(errorUtils.reportError);
                }
            }
        );
    },

    contentModifier: function(messageContent, promoData){
        Object.keys(constPromoCodeLegend).forEach(e => {
            let indexCode = constPromoCodeLegend[e];
            let codePositionIndex = messageContent.indexOf("(" + indexCode + ")");
            let contentToReplace = "";

            switch (indexCode) {
                case "X":
                    contentToReplace = promoData.amount;
                    break;
                case "D":
                    contentToReplace = promoData.minTopUpAmount;
                    break;
                case "Y":
                    contentToReplace = promoData.requiredConsumption;
                    break;
                case "Z":
                    contentToReplace = promoData.expirationTime;
                    break;
                case "P":
                    contentToReplace = promoData.allowedProviders || localization.translate("ALL_PROVIDERS");
                    break;
                case "Q":
                    contentToReplace = promoData.code;
                    break;
                case "M":
                    contentToReplace = promoData.maxRewardAmount;
                    break;
                default:
                    break;
            }

            if (codePositionIndex > -1) {
                messageContent = messageContent.substr(0, codePositionIndex) + contentToReplace + messageContent.substr(codePositionIndex + 3);
            }
        });

        return messageContent;
    },

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