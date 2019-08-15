"use strict";

let dbEmailNotificationFunc = function () {
};
module.exports = new dbEmailNotificationFunc();

const env = require("../config/env").config();
const dbAdminInfo = require('./dbAdminInfo');
const dbconfig = require('../modules/dbproperties');
const emailer = require("./../modules/emailer");
const dbUtil = require('../modules/dbutility');
const localization = require("../modules/localization");
const translate = localization.localization.translate;


let dbEmailNotification = {
    getEmailNotificationConfig(platformObjId) {
        return dbconfig.collection_emailNotificationConfig.findOne({platformObjId: platformObjId}).lean();
    },
    async updateEmailNotificationConfig(platformObjId, doNotify, emailPrefix, includeAdminName, includeOperationTime, includeProposalStepName, includePlatformName) {
        let platform = await dbconfig.collection_platform.findOne({_id: platformObjId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not found"});
        }

        let updateData = {platformObjId: platformObjId};
        if(typeof doNotify === "boolean") {
            updateData.doNotify = doNotify;
        }
        if(emailPrefix && emailPrefix.length>0) {
            updateData.emailPrefix = emailPrefix;
        }
        if(typeof includeAdminName === "boolean") {
            updateData.includeAdminName = includeAdminName;
        }
        if(typeof includeOperationTime === "boolean") {
            updateData.includeOperationTime = includeOperationTime;
        }
        if(typeof includeProposalStepName === "boolean") {
            updateData.includeProposalStepName = includeProposalStepName;
        }
        if(typeof includePlatformName === "boolean") {
            updateData.includePlatformName = includePlatformName;
        }

        return dbconfig.collection_emailNotificationConfig.findOneAndUpdate({platformObjId: platformObjId}, updateData, {
            upsert: true,
            new: true
        }).lean();
    },

    async sendEmailNotification(platformObjId, platformName, processName, adminName) {

        if (!platformObjId || !platformName || !processName || !adminName) {
            console.log('sendEmailNotification input error');
            return;
        }

        let emailNotificationConfig = await dbconfig.collection_emailNotificationConfig.findOne({platformObjId: platformObjId}).lean();
        let doNotify = emailNotificationConfig.doNotify;
        let emailPrefix = emailNotificationConfig.emailPrefix;
        let includeAdminName = emailNotificationConfig.includeAdminName;
        let includeOperationTime = emailNotificationConfig.includeOperationTime;
        let includeProposalStepName = emailNotificationConfig.includeProposalStepName;
        let includePlatformName = emailNotificationConfig.includePlatformName;

        if(doNotify) {
            let recipients = await dbAdminInfo.getAdminsByPermission(platformObjId, "Platform.EmailAudit.auditManualRewardRecipient");
            if (!recipients || !recipients.length) {
                console.log("no recipients");
                return;
            }

            let allRecipientEmail = recipients.map(recipient => {
                return recipient.email;
            });
            let sender = env.mailerNoReply;
            let subject = `${emailPrefix} -- 编辑${translate(processName)}提案流程：${adminName} -- ${dbUtil.getLocalTime(new Date)}`;

            let contentCh = '';
            let contentEn = '';

            if(includeAdminName) {
                contentCh += `<span>操作账号: ${adminName}</span><br/>`;
                contentEn += `<span>Operator: ${adminName}</span><br/>`;
            }
            if(includeOperationTime) {
                contentCh += `<span>操作时间: ${dbUtil.getLocalTime(new Date)}</span><br/>`;
                contentEn += `<span>Operation Date Time: ${dbUtil.getLocalTime(new Date)}</span>`;
            }
            if(includeProposalStepName) {
                contentCh += `<span>提案流程名称: ${translate(processName)}</span><br/>`;
                contentEn += `<span>Proposal Name: ${processName}</span><br/>`;
            }
            if(includePlatformName) {
                contentCh += `<span>平台: ${platformName}</span><br/>`;
                contentEn += `<span>Platform: ${platformName}</span><br/>`;
            }
            let content = `${contentCh} <br/><br/>-<br/><br/> ${contentEn}`;

            let emailConfig = {
                sender,
                subject,
                replyTo: allRecipientEmail,
                recipient: allRecipientEmail,
                body: content,
                isHTML: true
            };
            return await emailer.sendEmail(emailConfig);
        }
    },

};



let proto = dbEmailNotificationFunc.prototype;
proto = Object.assign(proto, dbEmailNotification);

// This make WebStorm navigation work
module.exports = dbEmailNotification;
