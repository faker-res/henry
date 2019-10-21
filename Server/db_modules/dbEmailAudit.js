"use strict";

let dbEmailAuditFunc = function () {
};
module.exports = new dbEmailAuditFunc();

const constSystemParam = require('../const/constSystemParam');
const constProposalStatus = require('../const/constProposalStatus');
const dbAdminInfo = require('./dbAdminInfo');
const dbProposalUtility = require("../db_common/dbProposalUtility");
const dbconfig = require('../modules/dbproperties');
const dbutility = require('../modules/dbutility');
const proposalExecutor = require('../modules/proposalExecutor');
const errorUtils = require("../modules/errorUtils");
const bcrypt = require("bcrypt");
const emailer = require("./../modules/emailer");


let dbEmailAudit = {
    // common
    async emailAudit(proposalId, adminObjId, decision, isMail) {
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
        let proposalProm = dbconfig.collection_proposal.findOne({proposalId}).lean();
        let status = decision === "approve" ? constProposalStatus.APPROVED : constProposalStatus.REJECTED;
        let memo = isMail ? "邮件回复审核" : "";

        let [admin, proposal] = await Promise.all([adminProm, proposalProm]);

        if (!admin) {
            return Promise.reject({message: "Admin not found"});
        }

        if (!proposal) {
            return Promise.reject({message: "Proposal not found"});
        }

        if (proposal.status !== constProposalStatus.PENDING && proposal.status !== constProposalStatus.CSPENDING) {
            return Promise.reject({message: "This proposal is already audited"});
        }

        // todo :: get permission if needed
        let updatedProposal = await dbconfig.collection_proposal.findOneAndUpdate(
            {_id: proposal._id, createTime: proposal.createTime},
            {$inc: {processedTimes: 1}},
            {new: true}
        );

        if (updatedProposal && updatedProposal.processedTimes && updatedProposal.processedTimes > 1) {
            console.log(updatedProposal.proposalId + " This proposal has been processed");
            return Promise.reject({message: "This proposal has been processed"});
        }

        proposal = await dbconfig.collection_proposal.findOneAndUpdate({
            _id: proposal._id,
            status: proposal.status,
            createTime: proposal.createTime
        }, {
            'data.approvedByCs': admin.adminName,
            status: status,
        }, {
            new: true
        }).populate({path: "type", model: dbconfig.collection_proposalType}).lean();

        if (!proposal) {
            // someone changed the status in between these processes
            return Promise.reject({message: "Proposal had been updated in the process of auditing, please try again if necessary"});
        }
        let proposalTypeName = proposal && proposal.type && proposal.type.name;

        let proposalStep = await dbProposalUtility.createProposalProcessStep(proposal, adminObjId, status, memo).catch(errorUtils.reportError);
        let executeResult = await proposalExecutor.approveOrRejectProposal(proposal.type.executionType, proposal.type.rejectionType, Boolean(decision === "approve"), proposal);
        dbEmailAudit.sendAuditedProposalEmailUpdate(proposalTypeName, proposal).catch(errorUtils.reportError);
        return executeResult;
    },

    async sendAuditedProposalEmailUpdate(proposalType, proposal) {
        let relevantFunction = {
            "UpdatePlayerCredit": dbEmailAudit.sendCreditChangeUpdate,
            "AddPlayerRewardTask": dbEmailAudit.sendManualRewardUpdate,
            "FixPlayerCreditTransfer": dbEmailAudit.sendRepairTransferUpdate,
        };

        if (!relevantFunction[proposalType]) {
            return Promise.resolve();
        }
        return relevantFunction[proposalType](proposal);
    },

    // credit change
    getAuditCreditChangeSetting(platformObjId) {
        return dbconfig.collection_auditCreditChangeSetting.findOne({platform: platformObjId}).lean();
    },

    async setAuditCreditChangeSetting(platformObjId, minimumAuditAmount, emailNameExtension, domain, recipient, reviewer) {
        let platform = await dbconfig.collection_platform.findOne({_id: platformObjId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not found"});
        }

        let updateData = {platform: platformObjId};
        if (minimumAuditAmount) {
            updateData.minimumAuditAmount = minimumAuditAmount;
        }
        if (emailNameExtension) {
            updateData.emailNameExtension = emailNameExtension;
        }
        if (recipient) {
            updateData.recipient = recipient;
        }
        if (reviewer) {
            updateData.reviewer = reviewer;
        }
        if (domain) {
            updateData.domain = domain;
        }

        return dbconfig.collection_auditCreditChangeSetting.findOneAndUpdate({platform: platformObjId}, updateData, {
            upsert: true,
            new: true
        }).lean();
    },

    async sendAuditCreditChangeRewardEmail(proposal) {
        if (!proposal || !proposal.data) {
            return;
        }

        let proposalData = proposal.data;

        //for saving message ID
        let ObjId = proposal._id;
        let playerName = proposalData.playerName || "";
        let realName = proposalData.realNameBeforeEdit || "";
        let playerLevel = proposalData.playerLevelName || "";
        let creditBeforeChange = proposalData.curAmount || 0;
        let updateAmount = proposalData.updateAmount || 0;
        let adminName = proposal.creator && proposal.creator.name || "";
        let adminObjId = proposal.creator && proposal.creator.id || "";
        let remark = proposalData.remark || "";
        let proposalId = proposal.proposalId || "";
        let platform = proposalData.platformId ? await dbconfig.collection_platform.findOne({_id: proposalData.platformId}, {name: 1}).lean() : {name: ""};
        let platformName = platform.name || "";
        let createTime = proposal.createTime;

        let emailContents = {
            playerName,
            realName,
            playerLevel,
            creditBeforeChange,
            updateAmount,
            adminName,
            remark,
            proposalId,
            platformName,
            createTime,
            ObjId,
        };

        let setting = await dbEmailAudit.getAuditCreditChangeSetting(platform._id);

        if (!setting) {
            return Promise.reject({message: "Please setup audit credit change setting"});
        }

        if (!setting.minimumAuditAmount || Math.abs(updateAmount) < Number(setting.minimumAuditAmount)) {
            return;
        }
        // let recipientsProm = dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditCreditChangeRecipient");
        // let auditorsProm = dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditCreditChangeAuditor");

        let recipientsProm = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditCreditChangeRecipient");
        // console.log('recipientsProm', recipientsProm);
        let auditorsProm = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditCreditChangeAuditor");
        // console.log('auditorsProm', auditorsProm);

        let [recipients, auditors] = await Promise.all([recipientsProm, auditorsProm]);

        if (!recipients || !recipients.length) {
            // console.log('prom return');
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let proms = [];

        for (let i = 0; i < recipients.length; i++) {
            let recipient = recipients[i];
            if (!recipient) {
                continue;
            }
            console.log('sendAuditCreditChangeRewardEmail recipient', recipient);

            let isReviewer = Boolean(auditors && auditors.length && auditors.map(reviewer => String(reviewer._id)).includes(String(recipient._id)));

            let prom = sendAuditCreditChangeEmail(emailContents, setting.emailNameExtension, setting.domain, recipient._id, isReviewer, setting.domain, allRecipientEmail).catch(err => {
                console.log('send AuditCreditChange email fail', String(recipient._id), err);
                return errorUtils.reportError(err)
            });
            proms.push(prom);
        }

        Promise.all(proms).catch(errorUtils.reportError);
    },

    async sendCreditChangeUpdate (proposal) {
        if (!proposal || !proposal.data) {
            return;
        }
        let proposalData = proposal.data;

        let playerName = proposalData.playerName || "";
        let realName = proposalData.realNameBeforeEdit || "";
        let playerLevel = proposalData.playerLevelName || "";
        let creditBeforeChange = proposalData.curAmount || 0;
        let updateAmount = proposalData.updateAmount || 0;
        let adminName = proposal.creator && proposal.creator.name || "";
        let adminObjId = proposal.creator && proposal.creator.id || "";
        let remark = proposalData.remark || "";
        let proposalId = proposal.proposalId || "";
        let platform = proposalData.platformId ? await dbconfig.collection_platform.findOne({_id: proposalData.platformId}, {name: 1}).lean() : {name: ""};
        let platformName = platform.name || "";
        let createTime = proposal.createTime;
        let hasMsgID;

        let emailContents = {
            playerName,
            realName,
            playerLevel,
            creditBeforeChange,
            updateAmount,
            adminName,
            remark,
            proposalId,
            platformName,
            createTime,
        };

        let setting = await dbEmailAudit.getAuditCreditChangeSetting(platform._id);
        if (!setting) {
            return;
        }

        if (!setting.minimumAuditAmount || Math.abs(updateAmount) < Number(setting.minimumAuditAmount)) {
            return;
        }

        let recipients = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditCreditChangeRecipient");

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let subject = getAuditCreditChangeEmailSubject(setting.emailNameExtension, emailContents.createTime, emailContents.updateAmount, emailContents.playerName);

        let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

        let proposalProcessData = await dbconfig.collection_proposalProcess.findOne({_id: proposal.process}).populate({path: "steps", model: dbconfig.collection_proposalProcessStep}).lean();

        let processStep;
        if (proposalProcessData && proposalProcessData.steps && proposalProcessData.steps.length) {
            processStep = proposalProcessData.steps[proposalProcessData.steps.length - 1];
        }

        if (!processStep && !proposalData.cancelAdmin) {
            return;
        }
        let operator = proposalData.cancelAdmin || processStep && processStep.operator;

        let auditor = await dbconfig.collection_admin.findOne({_id: operator}, {adminName: 1}).lean();

        let stepHtml = generateProposalStepTable(proposal, processStep, auditor);

        let html = generateAuditCreditChangeEmail(emailContents, allRecipientEmail, subject, stepHtml);

        let emailConfig = {
            sender: "no-reply@snsoft.my", // company email?
            recipient: allEmailStr, // admin email
            subject: subject, // title
            body: html, // html content
            isHTML: true
        };

        let proposalProm = await dbconfig.collection_proposal.find({_id: proposal._id}).lean();
        if (!proposalProm) {
            return Promise.reject({
                name: "DataError",
                message: "Error in getting proposal data",
            });
        }
        if(proposalProm.length > 0 && proposalProm[0].data.messageId){
            emailConfig.messageId = proposalProm[0].data.messageId;
            hasMsgID = true;
        }

        return emailer.sendEmail(emailConfig);
    },

    // manual reward
    getAuditManualRewardSetting(platformObjId) {
        return dbconfig.collection_auditManualRewardSetting.findOne({platform: platformObjId}).lean();
    },

    async setAuditManualRewardSetting(platformObjId, minimumAuditAmount, emailNameExtension, domain, recipient, reviewer) {
        let platform = await dbconfig.collection_platform.findOne({_id: platformObjId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not found"});
        }

        let updateData = {platform: platformObjId};
        if (minimumAuditAmount) {
            updateData.minimumAuditAmount = minimumAuditAmount;
        }
        if (emailNameExtension) {
            updateData.emailNameExtension = emailNameExtension;
        }
        if (recipient) {
            updateData.recipient = recipient;
        }
        if (reviewer) {
            updateData.reviewer = reviewer;
        }
        if (domain) {
            updateData.domain = domain;
        }

        return dbconfig.collection_auditManualRewardSetting.findOneAndUpdate({platform: platformObjId}, updateData, {
            upsert: true,
            new: true
        }).lean();
    },

    async sendAuditManualRewardEmail(proposal) {
        if (!proposal || !proposal.data) {
            return Promise.reject({message: "Proposal not found"});
        }
        let proposalData = proposal.data;

        let playerName = proposalData.playerName || "";
        let realName = proposalData.realNameBeforeEdit || "";
        let rewardAmount = proposalData.rewardAmount || 0;
        let providerGroupObjId = proposalData.providerGroup || "";
        let providerGroupProm = providerGroupObjId ? dbconfig.collection_gameProviderGroup.findOne({_id: providerGroupObjId}, {name: 1}).lean() : Promise.resolve();
        let consumptionRequired = proposalData.requiredUnlockAmount || 0;
        let useConsumption = Boolean(proposalData.useConsumption);
        let adminName = proposal.creator && proposal.creator.name || "";
        let adminObjId = proposal.creator && proposal.creator.id || "";
        let proposalId = proposal && proposal.proposalId;
        let comment = proposalData.remark || "";
        let platformObjId = proposalData.platformId || "";
        let platformProm = platformObjId ? dbconfig.collection_platform.findOne({_id: platformObjId}, {name: 1}).lean() : Promise.resolve({name: ""});

        let [providerGroup, platform] = await Promise.all([providerGroupProm, platformProm]);
        let providerGroupName = providerGroup && providerGroup.name || "-";
        let platformName = platform && platform.name || "";
        let createTime = proposal.createTime;
        let ObjId = proposal._id;

        let emailContents = {
            playerName,
            realName,
            rewardAmount,
            providerGroupName,
            consumptionRequired,
            useConsumption,
            adminName,
            proposalId,
            comment,
            platformName,
            createTime,
            ObjId
        };

        let setting = await dbEmailAudit.getAuditManualRewardSetting(platformObjId);

        if (!setting) {
            return Promise.reject({message: "Please setup audit manual reward setting."});
        }

        if (!setting.minimumAuditAmount || Math.abs(rewardAmount) < Number(setting.minimumAuditAmount)) {
            return;
        }

        let recipientsProm = dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditManualRewardRecipient");
        let auditorsProm = dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditManualRewardAuditor");

        let [recipients, auditors] = await Promise.all([recipientsProm, auditorsProm]);

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let proms = [];

        for (let i = 0; i < recipients.length; i++) {
            let recipient = recipients[i];

            if (!recipient) {
                continue;
            }

            let isReviewer = Boolean(auditors && auditors.length && auditors.map(reviewer => String(reviewer._id)).includes(String(recipient._id)));

            let prom = sendAuditManualRewardEmail(emailContents, setting.emailNameExtension, setting.domain, recipient._id, isReviewer, setting.domain, allRecipientEmail).catch(err => {
                console.log('send AuditManualReward email fail', String(recipient._id), err);
                return errorUtils.reportError(err)
            });
            proms.push(prom);
        }

        Promise.all(proms).catch(errorUtils.reportError);
    },

    async sendManualRewardUpdate(proposal) {
        if (!proposal || !proposal.data) {
            return;
        }
        let proposalData = proposal.data;

        let playerName = proposalData.playerName || "";
        let realName = proposalData.realNameBeforeEdit || "";
        let rewardAmount = proposalData.rewardAmount || 0;
        let providerGroupObjId = proposalData.providerGroup || "";
        let providerGroupProm = providerGroupObjId ? dbconfig.collection_gameProviderGroup.findOne({_id: providerGroupObjId}, {name: 1}).lean() : Promise.resolve();
        let consumptionRequired = proposalData.requiredUnlockAmount || 0;
        let useConsumption = Boolean(proposalData.useConsumption);
        let adminName = proposal.creator && proposal.creator.name || "";
        let adminObjId = proposal.creator && proposal.creator.id || "";
        let proposalId = proposal && proposal.proposalId;
        let comment = proposalData.remark || "";
        let platformObjId = proposalData.platformId || "";
        let platformProm = platformObjId ? dbconfig.collection_platform.findOne({_id: platformObjId}, {name: 1}).lean() : Promise.resolve({name: ""});

        let [providerGroup, platform] = await Promise.all([providerGroupProm, platformProm]);
        let providerGroupName = providerGroup && providerGroup.name || "-";
        let platformName = platform && platform.name || "";
        let createTime = proposal.createTime;
        let hasMsgID;
        let emailContents = {
            playerName,
            realName,
            rewardAmount,
            providerGroupName,
            consumptionRequired,
            useConsumption,
            adminName,
            proposalId,
            comment,
            platformName,
            createTime,
        };

        let setting = await dbEmailAudit.getAuditManualRewardSetting(platformObjId);

        if (!setting) {
            return;
        }

        if (!setting.minimumAuditAmount || Math.abs(rewardAmount) < Number(setting.minimumAuditAmount)) {
            return;
        }

        let recipients = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditManualRewardRecipient");

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let subject = getAuditManualRewardEmailSubject(setting.emailNameExtension, emailContents.createTime, emailContents.rewardAmount, emailContents.playerName);

        let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

        let proposalProcessData = await dbconfig.collection_proposalProcess.findOne({_id: proposal.process}).populate({path: "steps", model: dbconfig.collection_proposalProcessStep}).lean();

        let processStep;
        if (proposalProcessData && proposalProcessData.steps && proposalProcessData.steps.length) {
            processStep = proposalProcessData.steps[proposalProcessData.steps.length - 1];
        }

        if (!processStep && !proposalData.cancelAdmin) {
            return;
        }
        let operator = proposalData.cancelAdmin || processStep && processStep.operator;

        let auditor = await dbconfig.collection_admin.findOne({_id: operator}, {adminName: 1}).lean();

        let stepHtml = generateProposalStepTable(proposal, processStep, auditor);

        let html = generateAuditManualRewardEmail(emailContents, allRecipientEmail, subject, stepHtml);

        let emailConfig = {
            sender: "no-reply@snsoft.my", // company email?
            recipient: allEmailStr, // admin email
            subject: subject, // title
            body: html, // html content
            isHTML: true
        };
        //In order to group same subject&sender into conversation, need to get messageID as reference.
        let proposalProm = await dbconfig.collection_proposal.find({_id: proposal._id}).lean();
        if (!proposalProm) {
            return Promise.reject({
                name: "DataError",
                message: "Error in getting proposal data",
            });
        }
        if(proposalProm.length > 0 && proposalProm[0].data.messageId){
            emailConfig.messageId = proposalProm[0].data.messageId;
            hasMsgID = true;
        }

        return emailer.sendEmail(emailConfig);
    },

    // repair credit transfer
    getAuditRepairTransferSetting(platformObjId) {
        return dbconfig.collection_auditRepairTransferSetting.findOne({platform: platformObjId}).lean();
    },

    async setAuditRepairTransferSetting(platformObjId, minimumAuditAmount, emailNameExtension, domain, recipient, reviewer) {
        let platform = await dbconfig.collection_platform.findOne({_id: platformObjId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform not found"});
        }

        let updateData = {platform: platformObjId};
        if (minimumAuditAmount) {
            updateData.minimumAuditAmount = minimumAuditAmount;
        }
        if (emailNameExtension) {
            updateData.emailNameExtension = emailNameExtension;
        }
        if (recipient) {
            updateData.recipient = recipient;
        }
        if (reviewer) {
            updateData.reviewer = reviewer;
        }
        if (domain) {
            updateData.domain = domain;
        }

        return dbconfig.collection_auditRepairTransferSetting.findOneAndUpdate({platform: platformObjId}, updateData, {
            upsert: true,
            new: true
        }).lean();
    },

    async sendAuditRepairTransferEmail(proposal) {
        if (!proposal || !proposal.data) {
            return Promise.reject({message: "Proposal not found"});
        }
        let proposalData = proposal.data;

        let playerName = proposalData.playerName || "";
        let realName = proposalData.realNameBeforeEdit || "";
        let playerLevel = proposalData.playerLevelName || "";
        let transferId = proposalData.transferId || "";
        let creditBeforeChange = proposalData.curAmount || 0;
        let updateAmount = proposalData.updateAmount || 0;
        let adminName = proposal.creator && proposal.creator.name || "";
        let adminObjId = proposal.creator && proposal.creator.id || "";
        let remark = proposalData.remark || "";
        let proposalId = proposal.proposalId || "";
        let platform = proposalData.platformId ? await dbconfig.collection_platform.findOne({_id: proposalData.platformId}, {name: 1}).lean() : {name: ""};
        let platformName = platform.name || "";
        let createTime = proposal.createTime;
        let ObjId = proposal._id;
        let emailContents = {
            playerName,
            realName,
            playerLevel,
            transferId,
            creditBeforeChange,
            updateAmount,
            adminName,
            remark,
            proposalId,
            platformName,
            createTime,
            ObjId
        };

        let setting = await dbEmailAudit.getAuditRepairTransferSetting(platform._id);

        if (!setting) {
            return Promise.reject({message: "Please setup audit repair transfer setting"});
        }

        if (!setting.minimumAuditAmount || Math.abs(updateAmount) < Number(setting.minimumAuditAmount)) {
            return;
        }

        let recipientsProm = dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditRepairTransferRecipient");
        let auditorsProm = dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditRepairTransferAuditor");

        let [recipients, auditors] = await Promise.all([recipientsProm, auditorsProm]);

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let proms = [];

        for (let i = 0; i < recipients.length; i++) {
            let recipient = recipients[i];
            if (!recipient) {
                continue;
            }
            console.log('sendAuditRepairTransferRewardEmail recipient', recipient);

            let isReviewer = Boolean(auditors && auditors.length && auditors.map(reviewer => String(reviewer._id)).includes(String(recipient._id)));

            let prom = sendAuditRepairTransferEmail(emailContents, setting.emailNameExtension, setting.domain, recipient._id, isReviewer, setting.domain, allRecipientEmail).catch(err => {
                console.log('send AuditRepairTransfer email fail', String(recipient._id), err);
                return errorUtils.reportError(err)
            });
            proms.push(prom);
        }

        Promise.all(proms).catch(errorUtils.reportError);
    },

    async sendRepairTransferUpdate(proposal) {
        if (!proposal || !proposal.data) {
            return Promise.reject({message: "Proposal not found"});
        }
        let proposalData = proposal.data;

        let playerName = proposalData.playerName || "";
        let realName = proposalData.realNameBeforeEdit || "";
        let playerLevel = proposalData.playerLevelName || "";
        let transferId = proposalData.transferId || "";
        let creditBeforeChange = proposalData.curAmount || 0;
        let updateAmount = proposalData.updateAmount || 0;
        let adminName = proposal.creator && proposal.creator.name || "";
        let adminObjId = proposal.creator && proposal.creator.id || "";
        let remark = proposalData.remark || "";
        let proposalId = proposal.proposalId || "";
        let platform = proposalData.platformId ? await dbconfig.collection_platform.findOne({_id: proposalData.platformId}, {name: 1}).lean() : {name: ""};
        let platformName = platform.name || "";
        let createTime = proposal.createTime;
        let hasMsgID;
        let emailContents = {
            playerName,
            realName,
            playerLevel,
            transferId,
            creditBeforeChange,
            updateAmount,
            adminName,
            remark,
            proposalId,
            platformName,
            createTime,
        };

        let setting = await dbEmailAudit.getAuditRepairTransferSetting(platform._id);

        if (!setting) {
            return Promise.reject({message: "Please setup audit repair transfer setting"});
        }

        if (!setting.minimumAuditAmount || Math.abs(updateAmount) < Number(setting.minimumAuditAmount)) {
            return;
        }

        let recipients = await dbAdminInfo.getAdminsByPermission(platform._id, "Platform.EmailAudit.auditRepairTransferRecipient");

        if (!recipients || !recipients.length) {
            return;
        }

        let allRecipientEmail = recipients.map(recipient => {
            return recipient.email;
        });

        let subject = getAuditRepairTransferEmailSubject(setting.emailNameExtension, emailContents.createTime, emailContents.updateAmount, emailContents.playerName);

        let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

        let proposalProcessData = await dbconfig.collection_proposalProcess.findOne({_id: proposal.process}).populate({path: "steps", model: dbconfig.collection_proposalProcessStep}).lean();

        let processStep;
        if (proposalProcessData && proposalProcessData.steps && proposalProcessData.steps.length) {
            processStep = proposalProcessData.steps[proposalProcessData.steps.length - 1];
        }

        if (!processStep && !proposalData.cancelAdmin) {
            return;
        }
        let operator = proposalData.cancelAdmin || processStep && processStep.operator;

        let auditor = await dbconfig.collection_admin.findOne({_id: operator}, {adminName: 1}).lean();

        let stepHtml = generateProposalStepTable(proposal, processStep, auditor);

        let html = generateAuditRepairTransferEmail(emailContents, allRecipientEmail, subject, stepHtml);

        let emailConfig = {
            sender: "no-reply@snsoft.my", // company email?
            recipient: allEmailStr, // admin email
            subject: subject, // title
            body: html, // html content
            isHTML: true
        };

        let proposalProm = await dbconfig.collection_proposal.find({_id: proposal._id}).lean();
        if (!proposalProm) {
            return Promise.reject({
                name: "DataError",
                message: "Error in getting proposal data",
            });
        }
        if(proposalProm.length > 0 && proposalProm[0].data.messageId){
            emailConfig.messageId = proposalProm[0].data.messageId;
            hasMsgID = true;
        }

        return emailer.sendEmail(emailConfig);
    },
};

// common func

function generateAuditDecisionLink(host, proposalId, adminObjId, str) {
    // hash = "largeWithdrawal" + proposalId + adminObjId + "approve"/"reject"
    let hashContentRaw = str + "Snsoft" + proposalId + adminObjId;
    let rawLink = `http://${host}/audit/${str}?`;
    rawLink += "proposalId=" + proposalId;
    rawLink += "&adminObjId=" + adminObjId;

    let approveLinkProm = new Promise((resolve, reject) => {
        let approveLink = rawLink + "&decision=approve";
        let hashContent = hashContentRaw + "approve";
        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                reject(err);
            }
            bcrypt.hash(hashContent, salt, function (err, hash) {
                if (err) {
                    reject(err);
                }
                approveLink += "&hash=" + hash;
                resolve(approveLink);
            });
        });
    });

    let rejectLinkProm = new Promise((resolve, reject) => {
        let rejectLink = rawLink + "&decision=reject";
        let hashContent = hashContentRaw + "reject";
        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                reject(err);
            }
            bcrypt.hash(hashContent, salt, function (err, hash) {
                if (err) {
                    reject(err);
                }
                rejectLink += "&hash=" + hash;
                resolve(rejectLink);
            });
        });
    });

    return Promise.all([approveLinkProm, rejectLinkProm]).then(
        data => {
            if (!data || !data[0] || !data[1]) {
                return Promise.reject({message: "Generate decision link failure."});
            }

            return {
                approve: data[0],
                reject: data[1]
            }
        }
    );
}

function generateProposalStepTable (proposalData, proposalStep, auditor) {
    let html = ``;
    let status, cancelTime;

    switch (proposalData.status) {
        case constProposalStatus.PENDING:
            status = "待审核";
            cancelTime = "";
            break;
        case constProposalStatus.APPROVED:
            status = "已审核";
            cancelTime = "";
            break;
        case constProposalStatus.REJECTED:
            status = "失败";
            break;
        case constProposalStatus.FAIL:
            status = "失败";
            cancelTime = dbutility.getLocalTimeString(proposalData.data && proposalData.data.lastSettleTime || proposalData.settleTime, "YYYY/MM/DD HH:mm:ss");
            break;
        case constProposalStatus.SUCCESS:
            status = "成功";
            cancelTime = "";
            break;
        default:
            status = "已取消";
            cancelTime = dbutility.getLocalTimeString(proposalStep && proposalStep.operationTime || proposalData.data && proposalData.data.lastSettleTime || proposalData.settleTime, "YYYY/MM/DD HH:mm:ss");
    }

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">状态</td>
        <td style="border: solid 1px black; padding: 3px">${status}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">${cancelTime ? "取消人" : "审核人"}</td>
        <td style="border: solid 1px black; padding: 3px">${auditor.adminName}</td>
    </tr>`;

    let auditTime = proposalStep ? dbutility.getLocalTimeString(proposalStep.operationTime, "YYYY/MM/DD HH:mm:ss") : "";
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">${cancelTime ? "取消时间" : "审核时间"}</td>
        <td style="border: solid 1px black; padding: 3px">${cancelTime ? cancelTime : auditTime}</td>
    </tr>`;

    let rejectRemark = proposalData.data && proposalData.data.cancelRemark || proposalData.data && proposalData.data.rejectRemark || "";
    console.log('rejectRemark', rejectRemark, proposalData.data.cancelRemark )
    let memo = proposalStep && proposalStep.memo || "";
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">${cancelTime ? "取消原因" : "备注"}</td>
        <td style="border: solid 1px black; padding: 3px">${rejectRemark || memo}</td>
    </tr>`;

    html += `</table>`;

    return html;
}

// audit credit change
async function sendAuditCreditChangeEmail (emailContents, emailName, domain, adminObjId, isReviewer, host, allRecipientEmail) {
    let subject = getAuditCreditChangeEmailSubject(emailName, emailContents.createTime, emailContents.updateAmount, emailContents.playerName);
    let html = generateAuditCreditChangeEmail(emailContents, allRecipientEmail, subject);
    let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";
    let hasMsgID = false;
    let admin = await dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
    if (!admin) {
        console.log("admin not found on sendAuditCreditChangeEmail", adminObjId);
        return Promise.reject({message: "Admin not found."});
    }

    if (isReviewer) {
        let auditLinks = await generateAuditDecisionLink(host, emailContents.proposalId, adminObjId, "AuditCreditChange");
        html += `
            <div style="margin-top: 38px">
                <a href="${auditLinks.approve || ''}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: green; color: white; border-radius: 8px">通过审核</span></a>
                <a href="${auditLinks.reject || ''}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: red; color: white; border-radius: 8px">取消提案</span></a>
            </div>
            `;
    }

    let emailConfig = {
        sender: 'FPMS系统 <no-reply@snsoft.my>', // company email?
        recipient: admin.email, // admin email
        subject: subject, // title
        body: html, // html content
        isHTML: true
        // proposalObjID: emailContents.ObjId
    };

    if (allEmailStr) {
        emailConfig.replyTo = allEmailStr;
    }

    //In order to group same subject&sender into conversation, need to get messageID as reference.
    let proposalProm = await dbconfig.collection_proposal.find({_id: emailContents.ObjId}).lean();
    if (!proposalProm) {
        return Promise.reject({
            name: "DataError",
            message: "Error in getting proposal data",
        });
    }
    if(proposalProm.length > 0 && proposalProm[0].data.messageId){
        emailConfig.messageId = proposalProm[0].data.messageId;
        hasMsgID = true;
    }

    console.log(`sending audit email, AuditCreditChange, ${subject}, ${admin.adminName}, ${admin.email}, ${new Date()}`);

    let emailResult = await emailer.sendEmail(emailConfig);

    console.log(`email result of ${subject}, ${admin.adminName}, ${admin.email}, ${new Date()} -- ${emailResult}`);
    if(!hasMsgID){
        dbconfig.collection_proposal.update({_id: proposalProm[0]._id}, {$set: {'data.messageId': emailResult.messageId}}, function(err, doc){
            if(err){
                console.log('update failed...', err);
            }else{
                console.log('success...', doc);
            }
        });


    }
    return emailResult;
}

function getAuditCreditChangeEmailSubject (emailTitle, date, updateAmount, playerName) {
    let formattedDate = dbutility.getLocalTimeString(date , "YYYY/MM/DD");
    let formattedAmount = dbutility.noRoundTwoDecimalPlaces(updateAmount);
    console.log('email subject', emailTitle);
    console.log('email subject 2', playerName);
    return `${emailTitle} -- 额度加减（${formattedAmount}）： ${playerName} -- ${formattedDate}`;
}

function generateAuditCreditChangeEmail (contents, allEmailArr, emailTitle, stepHtml) {
    let html = ``;

    let allEmailStr = allEmailArr && allEmailArr.length ? allEmailArr.join() : "";

    let emailSubject = emailTitle + " " + dbutility.getLocalTimeString(contents.createTime, "hh:mm:ss A");


    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 78.6%">手工优惠详情</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提案号</td>
        <td style="border: solid 1px black; padding: 3px">${contents.proposalId}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">产品名称</td>
        <td style="border: solid 1px black; padding: 3px">${contents.platformName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">账号</td>
        <td style="border: solid 1px black; padding: 3px">${contents.playerName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">真实姓名</td>
        <td style="border: solid 1px black; padding: 3px">${contents.realName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">等级</td>
        <td style="border: solid 1px black; padding: 3px">${contents.playerLevel}</td>
    </tr>`;



    let creditBeforeChange = dbutility.noRoundTwoDecimalPlaces(contents.creditBeforeChange || 0);
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">当前额度</td>
        <td style="border: solid 1px black; padding: 3px">${creditBeforeChange}</td>
    </tr>`;

    let updateAmount = dbutility.noRoundTwoDecimalPlaces(contents.updateAmount || 0);
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">变更额度</td>
        <td style="border: solid 1px black; padding: 3px">${updateAmount}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提交人</td>
        <td style="border: solid 1px black; padding: 3px">${contents.adminName}</td>
    </tr>`;

    let createTime = dbutility.getLocalTimeString(contents.createTime, "YYYY/MM/DD HH:mm:ss");
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提交时间</td>
        <td style="border: solid 1px black; padding: 3px">${createTime}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">备注</td>
        <td style="border: solid 1px black; padding: 3px; word-wrap: break-word; white-space: normal;">${contents.remark}</td>
    </tr>`;


    html += `</table>`;

    if (stepHtml) {
        html += stepHtml;
    }

    html += `
    <div style="margin-top: 38px">
        <a href="mailto:${allEmailStr}?subject=${emailSubject}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 8px; font-weight: bold; background-color: purple; color: white; border-radius: 8px">发送邮件到给所有收件人</span></a>
    </div>
    `;

    return html;
}

// audit manual reward
async function sendAuditManualRewardEmail (emailContents, emailName, domain, adminObjId, isReviewer, host, allRecipientEmail) {
    let subject = getAuditManualRewardEmailSubject(emailName, emailContents.createTime, emailContents.rewardAmount, emailContents.playerName);
    let html = generateAuditManualRewardEmail(emailContents, allRecipientEmail, subject);
    let hasMsgID = false;
    let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

    let admin = await dbconfig.collection_admin.findOne({_id: adminObjId}).lean();

    if (!admin) {
        console.log("admin not found on sendAuditManualRewardEmail", adminObjId);
        return Promise.reject({message: "Admin not found."});
    }

    if (isReviewer) {
        let auditLinks = await generateAuditDecisionLink(host, emailContents.proposalId, adminObjId, "AuditManualReward");
        html += `
            <div style="margin-top: 38px">
                <a href="${auditLinks.approve || ''}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: green; color: white; border-radius: 8px">通过审核</span></a>
                <a href="${auditLinks.reject || ''}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: red; color: white; border-radius: 8px">取消提案</span></a>
            </div>
            `;
    }

    let emailConfig = {
        sender: 'FPMS系统 <no-reply@snsoft.my>', // company email?
        recipient: admin.email, // admin email
        subject: subject, // title
        body: html, // html content
        isHTML: true
    };

    if (allEmailStr) {
        emailConfig.replyTo = allEmailStr;
    }

    let proposalProm = await dbconfig.collection_proposal.find({_id: emailContents.ObjId}).lean();
    if (!proposalProm) {
        return Promise.reject({
            name: "DataError",
            message: "Error in getting proposal data",
        });
    }
    //In order to group same subject&sender into conversation, need to get messageID as reference.
    if(proposalProm.length > 0 && proposalProm[0].data.messageId){
        emailConfig.messageId = proposalProm[0].data.messageId;
        hasMsgID = true;
    }

    console.log(`sending audit email, AuditManualReward, ${subject}, ${admin.adminName}, ${admin.email}, ${new Date()}`);
    let emailResult = await emailer.sendEmail(emailConfig);
    console.log(`email result of ${subject}, ${admin.adminName}, ${admin.email}, ${new Date()} -- ${emailResult}`);
    //the first proposal will be no message ID, save it, so that following email could group together.
    if(!hasMsgID){
        dbconfig.collection_proposal.update({_id: proposalProm[0]._id}, {$set: {'data.messageId': emailResult.messageId}}, function(err, doc){
            if(err){
                console.log('update failed...', err);
            }else{
                console.log('success...', doc);
            }
        });


    }
    return emailResult;
}

function getAuditManualRewardEmailSubject (emailTitle, date, rewardAmount, playerName) {
    let formattedDate = dbutility.getLocalTimeString(date , "YYYY/MM/DD");
    let formattedAmount = dbutility.noRoundTwoDecimalPlaces(rewardAmount);
    return `${emailTitle} -- 手工优惠（${formattedAmount}）： ${playerName} -- ${formattedDate}`;
}

function generateAuditManualRewardEmail (contents, allEmailArr, emailTitle, stepHtml) {
    let html = ``;

    let allEmailStr = allEmailArr && allEmailArr.length ? allEmailArr.join() : "";

    let emailSubject = emailTitle+ " " + dbutility.getLocalTimeString(contents.createTime, "hh:mm:ss A");


    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 78.6%">手工优惠详情</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提案号</td>
        <td style="border: solid 1px black; padding: 3px">${contents.proposalId}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">产品名称</td>
        <td style="border: solid 1px black; padding: 3px">${contents.platformName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">账号</td>
        <td style="border: solid 1px black; padding: 3px">${contents.playerName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">真实姓名</td>
        <td style="border: solid 1px black; padding: 3px">${contents.realName}</td>
    </tr>`;

    let rewardAmount = dbutility.noRoundTwoDecimalPlaces(contents.rewardAmount || 0);
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">优惠额度</td>
        <td style="border: solid 1px black; padding: 3px">${rewardAmount}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">锁大厅组</td>
        <td style="border: solid 1px black; padding: 3px">${contents.providerGroupName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">解锁优惠额度</td>
        <td style="border: solid 1px black; padding: 3px">${contents.consumptionRequired}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">占用投注记录</td>
        <td style="border: solid 1px black; padding: 3px">${Boolean(contents.useConsumption) ? "是" : "否"}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提交人</td>
        <td style="border: solid 1px black; padding: 3px">${contents.adminName}</td>
    </tr>`;

    let createTime = dbutility.getLocalTimeString(contents.createTime, "YYYY/MM/DD HH:mm:ss");
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提交时间</td>
        <td style="border: solid 1px black; padding: 3px">${createTime}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">备注</td>
        <td style="border: solid 1px black; padding: 3px; word-wrap: break-word; white-space: normal;">${contents.comment}</td>
    </tr>`;


    // let time = dbutility.getLocalTimeString(log.registrationTime, "YYYY/MM/DD HH:mm:ss");
    // html += `<tr>
    //     <td style="border: solid 1px black; padding: 3px">注册时间</td>
    //     <td style="border: solid 1px black; padding: 3px">${time}</td>
    // </tr>`;
    //


    html += `</table>`;

    if (stepHtml) {
        html += stepHtml;
    }

    html += `
    <div style="margin-top: 38px">
        <a href="mailto:${allEmailStr}?subject=${emailSubject}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 8px; font-weight: bold; background-color: purple; color: white; border-radius: 8px">发送邮件到给所有收件人</span></a>
    </div>
    `;

    return html;
}

// repair credit transfer
async function sendAuditRepairTransferEmail (emailContents, emailName, domain, adminObjId, isReviewer, host, allRecipientEmail) {
    let subject = getAuditRepairTransferEmailSubject(emailName, emailContents.createTime, emailContents.updateAmount, emailContents.playerName);
    let html = generateAuditRepairTransferEmail(emailContents, allRecipientEmail, subject);
    let hasMsgID = false;
    let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

    let admin = await dbconfig.collection_admin.findOne({_id: adminObjId}).lean();

    if (!admin) {
        console.log("admin not found on sendAuditRepairTransferEmail", adminObjId);
        return Promise.reject({message: "Admin not found."});
    }

    if (isReviewer) {
        let auditLinks = await generateAuditDecisionLink(host, emailContents.proposalId, adminObjId, "AuditRepairTransfer");
        html += `
            <div style="margin-top: 38px">
                <a href="${auditLinks.approve || ''}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: green; color: white; border-radius: 8px">通过审核</span></a>
                <a href="${auditLinks.reject || ''}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: red; color: white; border-radius: 8px">取消提案</span></a>
            </div>
            `;
    }

    let emailConfig = {
        sender: 'FPMS系统 <no-reply@snsoft.my>', // company email?
        recipient: admin.email, // admin email
        subject: subject, // title
        body: html, // html content
        isHTML: true
    };

    if (allEmailStr) {
        emailConfig.replyTo = allEmailStr;
    }
//In order to group same subject&sender into conversation, need to get messageID as reference.
    let proposalProm = await dbconfig.collection_proposal.find({_id: emailContents.ObjId}).lean();
    if (!proposalProm) {
        return Promise.reject({
            name: "DataError",
            message: "Error in getting proposal data",
        });
    }
    if(proposalProm.length > 0 && proposalProm[0].data.messageId){
        emailConfig.messageId = proposalProm[0].data.messageId;
        hasMsgID = true;
    }

    console.log(`sending audit email, AuditRepairTransfer, ${subject}, ${admin.adminName}, ${admin.email}, ${new Date()}`);
    let emailResult = await emailer.sendEmail(emailConfig);
    console.log(`email result of ${subject}, ${admin.adminName}, ${admin.email}, ${new Date()} -- ${emailResult}`);

    if(!hasMsgID){
        dbconfig.collection_proposal.update({_id: proposalProm[0]._id}, {$set: {'data.messageId': emailResult.messageId}}, function(err, doc){
            if(err){
                console.log('update failed...', err);
            }else{
                console.log('success...', doc);
            }
        });
    }
    return emailResult;
}

function getAuditRepairTransferEmailSubject (emailTitle, date, updateAmount, playerName) {
    let formattedDate = dbutility.getLocalTimeString(date , "YYYY/MM/DD");
    let formattedAmount = dbutility.noRoundTwoDecimalPlaces(updateAmount);
    return `${emailTitle} -- 转账修复（${formattedAmount}）： ${playerName} -- ${formattedDate}`;
}

function generateAuditRepairTransferEmail (contents, allEmailArr, emailTitle, stepHtml) {
    let html = ``;

    let allEmailStr = allEmailArr && allEmailArr.length ? allEmailArr.join() : "";

    let emailSubject = emailTitle + " " + dbutility.getLocalTimeString(contents.createTime, "hh:mm:ss A");


    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 78.6%">手工优惠详情</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提案号</td>
        <td style="border: solid 1px black; padding: 3px">${contents.proposalId}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">产品名称</td>
        <td style="border: solid 1px black; padding: 3px">${contents.platformName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">账号</td>
        <td style="border: solid 1px black; padding: 3px">${contents.playerName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">真实姓名</td>
        <td style="border: solid 1px black; padding: 3px">${contents.realName}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">等级</td>
        <td style="border: solid 1px black; padding: 3px">${contents.playerLevel}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">转账ID</td>
        <td style="border: solid 1px black; padding: 3px">${contents.transferId}</td>
    </tr>`;

    let creditBeforeChange = dbutility.noRoundTwoDecimalPlaces(contents.creditBeforeChange || 0);
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">当前额度</td>
        <td style="border: solid 1px black; padding: 3px">${creditBeforeChange}</td>
    </tr>`;

    let updateAmount = dbutility.noRoundTwoDecimalPlaces(contents.updateAmount || 0);
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">变更额度</td>
        <td style="border: solid 1px black; padding: 3px">${updateAmount}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提交人</td>
        <td style="border: solid 1px black; padding: 3px">${contents.adminName}</td>
    </tr>`;

    let createTime = dbutility.getLocalTimeString(contents.createTime, "YYYY/MM/DD HH:mm:ss");
    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">提交时间</td>
        <td style="border: solid 1px black; padding: 3px">${createTime}</td>
    </tr>`;

    html += `<tr>
        <td style="border: solid 1px black; padding: 3px">备注</td>
        <td style="border: solid 1px black; padding: 3px; word-wrap: break-word; white-space: normal;">${contents.remark}</td>
    </tr>`;


    html += `</table>`;

    if (stepHtml) {
        html += stepHtml;
    }

    html += `
    <div style="margin-top: 38px">
        <a href="mailto:${allEmailStr}?subject=${emailSubject}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 8px; font-weight: bold; background-color: purple; color: white; border-radius: 8px">发送邮件到给所有收件人</span></a>
    </div>
    `;

    return html;
}




let proto = dbEmailAuditFunc.prototype;
proto = Object.assign(proto, dbEmailAudit);

// This make WebStorm navigation work
module.exports = dbEmailAudit;
