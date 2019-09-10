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
const dbPartnerCommission = require("./dbPartnerCommission");
const math = require("mathjs");
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
        console.log('dbEmailNotification.sendEmailNotification');

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
                contentEn += `<span>Operation Date Time: ${dbUtil.getLocalTime(new Date)}</span><br/>`;
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
            console.log('sender',sender);
            console.log('subject',subject);
            return await emailer.sendEmail(emailConfig);
        }
    },

    // 编辑代理佣金设置
    getNotifyEditPartnerCommissionSetting(platformObjId) {
        return dbconfig.collection_notifyEditPartnerCommissionSetting.findOne({platformObjId: platformObjId}).lean().then(
            data=> {
                return data
            }
        );
    },

    async updateNotifyEditPartnerCommissionSetting(platformObjId, doNotify, emailPrefix, backEndOnly) {
        let platform = await dbconfig.collection_platform.findOne({_id: platformObjId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not found"});
        }

        let updateData = {
            platformObjId: platformObjId,
            doNotify: Boolean(doNotify),
            backEndOnly: Boolean(backEndOnly),
        };

        if (emailPrefix) {
            updateData.emailPrefix = emailPrefix;
        }

        return dbconfig.collection_notifyEditPartnerCommissionSetting.findOneAndUpdate({platformObjId: platformObjId}, updateData, {
            upsert: true,
            new: true
        }).lean();
    },

    async sendNotifyEditPartnerCommissionEmail(proposal) {
        if (!proposal || !proposal.data || !proposal.data.platformObjId || !proposal.data.newConfigArr || !proposal.data.newConfigArr.length || !proposal.data.oldConfigArr || !proposal.data.oldConfigArr.length) {
            console.log('1', Boolean(proposal.data.newConfigArr))
            console.log('2', Boolean(proposal.data.oldConfigArr))
            return;
        }

        let platform = await dbconfig.collection_platform.findOne({_id: proposal.data.platformObjId}, {name: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not exist"});
        }

        let setting = await dbEmailNotification.getNotifyEditPartnerCommissionSetting(platform._id);
        setting = setting || {};
        if (!setting.doNotify) {
            return;
        }

        if (setting.backEndOnly && proposal.creator && proposal.creator.type !== "admin") {
            return;
        }
        let actionUser = proposal.creator && proposal.creator.name || "";
        let actionUserType = proposal.creator && proposal.creator.type === "admin" ? "客服" : "代理";
        let actionTime = proposal.createTime || "";
        let platformName = platform.name || "";
        let partnerName = proposal.data.partnerName || "";
        let commissionTypeName = dbPartnerCommission.getCommissionTypeName(proposal.data.commissionType);
        let providerGroupNames = [];
        for (let i = 0; i < proposal.data.newConfigArr.length; i++) {
            let providerGroup = await dbconfig.collection_gameProviderGroup.findOne({_id: proposal.data.newConfigArr[i].provider}, {name: 1}).lean();
            if (providerGroup && providerGroup.name) {
                providerGroupNames.push(providerGroup.name);
            }
        }
        // let providerGroupNames = providerGroup.name || "";
        let originalRatios = proposal.data.oldConfigArr.map(rate => {
            return getCommissionRateArray(rate.commissionSetting) || "";
        });
        let updatedRatios = proposal.data.newConfigArr.map(rate => {
            return getCommissionRateArray(rate.commissionSetting) || "";
        });
        let proposalId = proposal.proposalId || "";

        let recipients = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailNotification.notifyEditPartnerCommission");

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let html = ``;

        let formattedDate = dbUtil.getLocalTimeString(actionTime , "YYYY/MM/DD");
        let emailTitle = `${setting.emailPrefix} -- 编辑（${partnerName}）代理佣金： ${actionUser} -- ${formattedDate}`;

        let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

        let emailSubject = emailTitle + " " + dbUtil.getLocalTimeString(actionTime, "hh:ss A");


        html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 78.6%">手工优惠详情</div>`;

        html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提案号</td>
            <td style="border: solid 1px black; padding: 3px">${proposalId}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">产品名称</td>
            <td style="border: solid 1px black; padding: 3px">${platformName}</td>
        </tr>`;


        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">账号</td>
            <td style="border: solid 1px black; padding: 3px">${partnerName}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">佣金种类</td>
            <td style="border: solid 1px black; padding: 3px">${commissionTypeName}</td>
        </tr>`;

        for (let i = 0 ; i < providerGroupNames.length; i++) {
            let providerGroupName = providerGroupNames[i];
            let originalRatio = originalRatios[i];
            let updatedRatio = updatedRatios[i];

            html += `<tr>
                <td style="border: solid 1px black; padding: 3px">${providerGroupName} - 原比例</td>
                <td style="border: solid 1px black; padding: 3px">${originalRatio}</td>
            </tr>`;

            html += `<tr>
                <td style="border: solid 1px black; padding: 3px">${providerGroupName} - 更新后比例</td>
                <td style="border: solid 1px black; padding: 3px">${updatedRatio}</td>
            </tr>`;
        }

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">创建者</td>
            <td style="border: solid 1px black; padding: 3px">${actionUser}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">创建者类型</td>
            <td style="border: solid 1px black; padding: 3px">${actionUserType}</td>
        </tr>`;

        let createTime = dbUtil.getLocalTimeString(actionTime, "YYYY/MM/DD HH:mm:ss");
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提交时间</td>
            <td style="border: solid 1px black; padding: 3px">${createTime}</td>
        </tr>`;


        html += `</table>`;

        let emailConfig = {
            sender: env.mailerNoReply,
            subject: emailSubject,
            replyTo: allEmailStr,
            recipient: allEmailStr,
            body: html,
            isHTML: true
        };

        console.log("sendNotifyEditPartnerCommissionEmail", emailConfig.subject, emailConfig.recipient);
        return emailer.sendEmail(emailConfig).then(o => {
            console.log('email sent', emailConfig.subject, emailConfig.recipient)
        });
    },

    // 编辑下级代理结构
    getNotifyEditChildPartnerSetting(platformObjId) {
        return dbconfig.collection_notifyEditChildPartnerSetting.findOne({platformObjId: platformObjId}).lean().then(
            data=> {
                return data
            }
        );
    },

    async updateNotifyEditChildPartnerSetting(platformObjId, doNotify, emailPrefix, backEndOnly) {
        let platform = await dbconfig.collection_platform.findOne({_id: platformObjId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not found"});
        }

        let updateData = {
            platformObjId: platformObjId,
            doNotify: Boolean(doNotify),
            backEndOnly: Boolean(backEndOnly),
        };

        if (emailPrefix) {
            updateData.emailPrefix = emailPrefix;
        }

        return dbconfig.collection_notifyEditChildPartnerSetting.findOneAndUpdate({platformObjId: platformObjId}, updateData, {
            upsert: true,
            new: true
        }).lean();
    },

    async sendNotifyEditChildPartnerEmail(proposal) {
        if (!proposal || !proposal.data || !proposal.data.platformId) {
            console.log("!proposal", !proposal)
            console.log("!proposal.data", !proposal.data)
            console.log("!proposal.data.platformObjId", !proposal.data.platformObjId)
            return;
        }

        let platform = await dbconfig.collection_platform.findOne({_id: proposal.data.platformId}, {name: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not exist"});
        }

        let setting = await dbEmailNotification.getNotifyEditPartnerCommissionSetting(platform._id);
        setting = setting || {};
        if (!setting.doNotify) {
            return;
        }

        if (setting.backEndOnly && proposal.creator && proposal.creator.type !== "admin") {
            return;
        }
        let actionUser = proposal.creator && proposal.creator.name || "";
        let actionUserType = proposal.creator && proposal.creator.type === "admin" ? "客服" : "代理";
        let actionTime = proposal.createTime || "";
        let platformName = platform.name || "";
        let partnerName = proposal.data.partnerName || "";
        let commissionTypeName = dbPartnerCommission.getCommissionTypeName(proposal.data.commissionType);
        let childCountBefore = Number(proposal.data.curChildPartnerHeadCount || 0);
        let childCountAfter = Number(proposal.data.updateChildPartnerHeadCount || 0);
        proposal.data.curChildPartnerName = proposal.data.curChildPartnerName || [];
        proposal.data.updateChildPartnerName = proposal.data.updateChildPartnerName || [];
        let childPartnerBefore = proposal.data.curChildPartnerName.join(", ");
        let childPartnerAfter = proposal.data.updateChildPartnerName.join(", ");

        let proposalId = proposal.proposalId || "";

        let recipients = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailNotification.notifyEditChildPartner");

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let html = ``;

        let formattedDate = dbUtil.getLocalTimeString(actionTime , "YYYY/MM/DD");
        let emailTitle = `${setting.emailPrefix} -- 编辑（${partnerName}）下级代理： ${actionUser} -- ${formattedDate}`;

        let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

        let emailSubject = emailTitle + " " + dbUtil.getLocalTimeString(actionTime, "hh:ss A");


        html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 78.6%">手工优惠详情</div>`;

        html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提案号</td>
            <td style="border: solid 1px black; padding: 3px">${proposalId}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">产品名称</td>
            <td style="border: solid 1px black; padding: 3px">${platformName}</td>
        </tr>`;


        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">账号</td>
            <td style="border: solid 1px black; padding: 3px">${partnerName}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">佣金种类</td>
            <td style="border: solid 1px black; padding: 3px">${commissionTypeName}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">变更前下级代理人数</td>
            <td style="border: solid 1px black; padding: 3px">${childCountBefore}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">变更后下级代理人数</td>
            <td style="border: solid 1px black; padding: 3px">${childCountAfter}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">变更前下级代理帐号</td>
            <td style="border: solid 1px black; padding: 3px">${childPartnerBefore}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">变更后下级代理帐号</td>
            <td style="border: solid 1px black; padding: 3px">${childPartnerAfter}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">创建者</td>
            <td style="border: solid 1px black; padding: 3px">${actionUser}</td>
        </tr>`;

        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">创建者类型</td>
            <td style="border: solid 1px black; padding: 3px">${actionUserType}</td>
        </tr>`;

        let createTime = dbUtil.getLocalTimeString(actionTime, "YYYY/MM/DD HH:mm:ss");
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提交时间</td>
            <td style="border: solid 1px black; padding: 3px">${createTime}</td>
        </tr>`;


        html += `</table>`;

        let emailConfig = {
            sender: env.mailerNoReply,
            subject: emailSubject,
            replyTo: allEmailStr,
            recipient: allEmailStr,
            body: html,
            isHTML: true
        };

        console.log("sendNotifyEditChildPartnerEmail", emailConfig.subject, emailConfig.recipient);
        return emailer.sendEmail(emailConfig).then(o => {
            console.log('email sent', emailConfig.subject, emailConfig.recipient)
        });
    },
};



let proto = dbEmailNotificationFunc.prototype;
proto = Object.assign(proto, dbEmailNotification);

// This make WebStorm navigation work
module.exports = dbEmailNotification;

function getCommissionRateArray (commissionSetting = []) {
    return commissionSetting.map(setting => {
        return Number(math.chain(setting.commissionRate|| 0).multiply(100).round(2).done() || 0).toString() + "%";
    }).join(", ");
}
