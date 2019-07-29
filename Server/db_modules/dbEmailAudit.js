"use strict";

let dbEmailAuditFunc = function () {
};
module.exports = new dbEmailAuditFunc();

const dbconfig = require('../modules/dbproperties');

let dbEmailAudit = {
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
    }
};

let proto = dbEmailAuditFunc.prototype;
proto = Object.assign(proto, dbEmailAudit);

// This make WebStorm navigation work
module.exports = dbEmailAudit;
