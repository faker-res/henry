"use strict";

const Q = require("q");
const dbconfig = require("./dbproperties.js");
const dbPlayerMail = require("../db_modules/dbPlayerMail");
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbMessageTemplate = require("../db_modules/dbMessageTemplate.js");
const emailer = require("../modules/emailer");
const serverInstance = require("./serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constPromoCodeLegend = require("../const/constPromoCodeLegend.js");
const constMessageType = require("../const/constMessageType.js");
const assert = require('assert');
const moment = require('moment-timezone');
const messageDispatcher = {

    /**
     * @param {Proposal} proposalData - proposalData.type should be populated
     * @param {Object} metaData - Data that might be used in the template
     * @returns {Promise}
     */
    dispatchMessagesForPlayerProposal: function (proposalData, messageType, metaData) {
        //const messageType = proposalData.type.name;
        const playerId = proposalData.data.playerObjId;
        // Fetch any data which might be used in the template
        return dbPlayerInfo.getPlayerInfo({_id: playerId}).then(
            function (player) {
                metaData.proposalData = proposalData;
                metaData.player = player;
                metaData.recipientId = player._id;
                metaData.recipientType = 'player';
                metaData.senderType = 'System';
                metaData.platformId = proposalData.data.platformId;
                //const platformId = metaData.proposalData.data.platformId;
                // const platformId = metaData.platformId;
                const platformId = player.platform;
                return messageDispatcher.dispatchMessagesOfType(platformId, messageType, metaData);
            }
        )
    },

    dispatchMessagesOfType: function (platformId, messageType, metaData) {
        return dbMessageTemplate.getMessageTemplates({platform: platformId, type: messageType}).then(
            function (templates) {
                //console.log("templates:", templates);
                const proms = templates.map(
                    messageTemplate => messageDispatcher.renderTemplateAndSendMessage(messageTemplate, metaData)
                );
                return Q.all(proms);
            }
        );
    },

    dispatchMessagesForPromoCode: function (platformObjId, metaData, adminName) {
        let providerNameList = [];
        const playerId = metaData.playerObjId;
        // Fetch any data which might be used in the template
        return dbPlayerInfo.getPlayerInfo({_id: playerId}).then(
            function (player) {
                //metaData.proposalData = proposalData;
                metaData.player = player;
                metaData.recipientId = player._id;
                metaData.recipientType = 'player';
                metaData.senderType = 'admin';
                metaData.senderName = adminName ? adminName: "";
                metaData.platformId = platformObjId;
                const platformId = platformObjId;

                let proms = [];
                let providerProm = [];
                let gameProviderProm;
                if(metaData && metaData.allowedProviders){
                    if(metaData.isProviderGroup){
                        return Promise.all([messageDispatcher.getProviderNameByProviderGroupId(metaData.allowedProviders)]);
                    }else{
                        return Promise.all([messageDispatcher.getProviderNameByProviderId(metaData.allowedProviders)]);
                    }
                }
            }
        ).then(
            data => {
                if(data){
                    if(metaData.isProviderGroup) {
                        if(data.length > 0 && data[0].name){
                            metaData.allowedProviders = data[0].name;
                        }
                    }else{
                        if(data[0] && data[0].length > 0){
                            metaData.allowedProviders = data[0]
                        }
                    }
                }

                let messageContent = messageDispatcher.contentModifier(metaData.promoCodeType.smsContent,metaData);

                let messageTemplate = {
                    format: 'internal',
                    subject: metaData.promoCodeType.smsTitle,
                    content: messageContent
                }

                messageDispatcher.renderTemplateAndSendMessage(messageTemplate, metaData);
            }
        );
    },

    getProviderNameByProviderGroupId: function(providerGroupId){
        return dbconfig.collection_gameProviderGroup.findOne({_id: providerGroupId},{name: 1});
    },

    getProviderNameByProviderId(providerIdArr){
        let gameProviderProm = [];
        let gameProviderNameArr = [];

        providerIdArr.forEach(providerId => {
            gameProviderProm.push(dbconfig.collection_gameProvider.findOne({_id: providerId}));
        })

        return Promise.all(gameProviderProm).then(
            gameProviderData => {
            if(gameProviderData && gameProviderData.length > 0){
                gameProviderData.forEach(gameProvider => {
                    gameProviderNameArr.push(gameProvider.name);
                })
            }

            return gameProviderNameArr;
        })
    },

    contentModifier: function(messageContent, metaData){
        Object.keys(constPromoCodeLegend).forEach(e => {
            let indexCode = constPromoCodeLegend[e];
            let codePositionIndex = messageContent.indexOf("(" + indexCode + ")");
            let contentToReplace = "";

            switch (indexCode) {
                case "X":
                    contentToReplace = metaData.amount;
                    break;
                case "D":
                    contentToReplace = metaData.minTopUpAmount;
                    break;
                case "Y":
                    contentToReplace = metaData.requiredConsumption;
                    break;
                case "Z":
                    contentToReplace = metaData.expirationTime;
                    break;
                case "P":
                    contentToReplace = metaData.allowedProviders;
                    break;
                case "Q":
                    contentToReplace = metaData.code;
                    break;
                case "M":
                    contentToReplace = metaData.maxRewardAmount;
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

    /**
     * @param messageTemplate - The parameters in the messageTemplate should match the metaData for the given situation.
     *
     * @param {Object} metaData - The metaData can vary depending on the situation.  But in general...
     * @param {Player} metaData.player - The recipient of the message
     * @param {Platform} [metaData.platform] - if sending email, either platform or platformId is required
     * @param {String} [metaData.platformId] - platformId, if sending internal mail
     * @param {Object} [metaData.proposalData] - proposal data, if needed by the template
     *
     * @returns {Promise}
     */
    renderTemplateAndSendMessage: function (messageTemplate, metaData) {
        const renderedSubject = typeof messageTemplate.subject === 'string' && renderTemplate(messageTemplate.subject, metaData);
        const contentIsHTML = isHTML(messageTemplate.content);
        if(messageTemplate.type === constMessageType.UPDATE_PASSWORD)
            messageTemplate.content = messageTemplate.content.replace('{{executeTime}}', moment(new Date()).format("YYYY/MM/DD HH:mm:ss"));
        if(metaData.proposalData && metaData.proposalData.createTime)
            messageTemplate.content = messageTemplate.content.replace('{{proposalData.createTime}}', moment(metaData.proposalData.createTime).format("YYYY/MM/DD HH:mm:ss"));
        const renderedContent = renderTemplate(messageTemplate.content, metaData);
        return messageDispatcher.sendMessage(messageTemplate.format, metaData, renderedContent, renderedSubject, contentIsHTML);
    },

    sendMessage: function (format, metaData, renderedContent, renderedSubject, contentIsHTML) {
        if (format === 'email') {
            const recipientEmail = metaData.player.email;
            assert(metaData.platform || metaData.platformId);
            return getPlatformFromMetaData(metaData).then(function (platform) {
                return emailer.sendEmail(
                    {
                        sender: platform.csEmail,
                        recipient: recipientEmail,
                        subject: renderedSubject,
                        body: renderedContent,
                        isHTML: contentIsHTML
                    }
                );
            });
        }
        else if (format === 'internal') {
            // @todo We may want to pass the details of this message from outside (e.g. in metaData), since they won't always be proposal approvals
            //create a new mail for player
            assert(metaData.player && metaData.platformId);
            var newMail = {
                platformId: metaData.platformId,
                senderType: metaData.senderType,
                senderId: metaData.senderId,
                //senderName: metaData.senderName,
                recipientType: metaData.recipientType,
                recipientId: metaData.recipientId,
                // playerId: metaData.player._id,
                title: renderedSubject,
                content: renderedContent
            };
            return dbPlayerMail.createPlayerMail(newMail).then(
                function (data) {
                    var wsMessageClient = serverInstance.getWebSocketMessageClient();
                    if (wsMessageClient) {
                        wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "player", "notifyNewMail", data);
                    }
                    return data;
                }
            );
        }
        // @todo SMS format
        else {
            // return Q.reject("I do not know how to dispatch a message with format '" + format + "'.");
        }
    }

};

function getPlatformFromMetaData(metaData) {
    // No need to lookup if we already have it
    return metaData.platform && metaData.platform._id
        ? Q.resolve(metaData.platform)
        : dbconfig.collection_platform.findById(metaData.platformId);
}

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


module.exports = messageDispatcher;