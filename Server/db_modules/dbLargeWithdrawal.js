"use strict";

var dbLargeWithdrawalFunc = function () {
};
module.exports = new dbLargeWithdrawalFunc();

const dbconfig = require("./../modules/dbproperties");
const dbutility = require("./../modules/dbutility");
const emailer = require("./../modules/emailer");
const constSystemParam = require('./../const/constSystemParam');
const constProposalStatus = require('./../const/constProposalStatus');
const bcrypt = require("bcrypt");
const errorUtils = require("./../modules/errorUtils");
const pmsAPI = require('../externalAPI/pmsAPI');
const proposalExecutor = require('./../modules/proposalExecutor');
const dbProposalProcessStep = require('./../db_modules/dbLargeWithdrawal');


const dbLargeWithdrawal = {
    getLargeWithdrawLog: (largeWithdrawLogObjId) => {
        return dbconfig.collection_largeWithdrawalLog.findOne({_id: largeWithdrawLogObjId}).lean();
    },

    fillUpLargeWithdrawalLogDetail: (largeWithdrawalLogObjId) => {
        let largeWithdrawalLog, proposal, player;
        return dbconfig.collection_largeWithdrawalLog.findOne({_id: largeWithdrawalLogObjId}).lean().then(
            largeWithdrawalLogData => {
                if (!largeWithdrawalLogData) {
                    console.log("no large withdrawal log found:", largeWithdrawalLogObjId);
                    return Promise.reject({message: "no large withdrawal log found"});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                return dbconfig.collection_proposal.findOne({proposalId: largeWithdrawalLog.proposalId}).lean();
            }
        ).then(
            proposalData => {
                if (!proposalData) {
                    console.log("proposal of large withdrawal not found", largeWithdrawalLogObjId);
                    return Promise.reject({message: "proposal of large withdrawal not found"});
                }
                proposal = proposalData;

                if (!proposal || !proposal.data || !proposal.data.playerObjId) {
                    console.log("playerObjId of proposal not found:", largeWithdrawalLog.proposalId);
                    return Promise.reject({message: "playerObjId of proposal not found"});
                }

                return dbconfig.collection_players.findOne({_id: proposal.data.playerObjId})
                    .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();
            }
        ).then(
            playerData => {
                player = playerData;
                // todo :: unfinished work - need to find out all the calculation base on largeWithdrawalSetting
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find player"});
                }

                let bankCityProm = pmsAPI.foundation_getCityList({provinceId: player.bankAccountProvince});
                let updateObj = {
                    realName: player.realName,
                    playerLevelName: player.playerLevel.name,
                };

                return Promise.all([bankCityProm]);
            }
        ).then(
            ([bankCity]) => {
                console.log("bankcity", bankCity)
            }
        );
    },

    sendLargeAmountDetailMail: (largeWithdrawalLogObjId, comment, admin, host) => {
        let largeWithdrawalLog, largeWithdrawalSetting;
        return dbconfig.collection_largeWithdrawalLog.findOneAndUpdate({_id: largeWithdrawalLogObjId}, {comment: comment}, {new: true}).lean().then(
            largeWithdrawalLogData => {
                if (!largeWithdrawalLogData) {
                    return Promise.reject({message: "Large withdrawal log not found."});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                return dbconfig.collection_largeWithdrawalSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
            }
        ).then(
            largeWithdrawalSettingData => {
                if (!largeWithdrawalSettingData) {
                    return Promise.reject({message: "Please setup large withdrawal setting."});
                }
                largeWithdrawalSetting = largeWithdrawalSettingData;

                let proms = [];

                if (largeWithdrawalSetting.recipient && largeWithdrawalSetting.recipient.length) {

                    largeWithdrawalSetting.recipient.map(recipient => {
                        let isReviewer = Boolean(largeWithdrawalSetting.reviewer && largeWithdrawalSetting.reviewer.length && largeWithdrawalSetting.reviewer.map(reviewer => String(reviewer)).includes(String(recipient)));

                        let prom = sendLargeWithdrawalDetailMail(largeWithdrawalLog, largeWithdrawalSetting, recipient, isReviewer, host).catch(err => {
                            console.log('large withdrawal mail to admin failed', recipient, err);
                            return errorUtils.reportError(err);
                        });
                        proms.push(prom);
                    });
                }

                Promise.all(proms).catch(errorUtils.reportError);
                return dbconfig.collection_largeWithdrawalLog.findOneAndUpdate({_id: largeWithdrawalLog._id}, {$inc: {emailSentTimes: 1}}, {new: true}).lean().catch(errorUtils.reportError);
            }
        );
    },

    largeWithdrawalAudit: (proposalId, adminObjId, decision, isMail) => {
        let admin, proposal, largeWithdrawalLog, largeWithdrawalSetting;
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
        let proposalProm = dbconfig.collection_proposal.findOne({proposalId}).lean();
        let status = decision === "approve" ? constProposalStatus.APPROVED : constProposalStatus.REJECTED;
        let memo = isMail ? "邮件回复审核" : "";

        return Promise.all([adminProm, proposalProm]).then(
            data => {
                if (!data) {
                    return Promise.reject({message: "Unknown error"});
                }

                if (!data[0]) {
                    return Promise.reject({message: "Admin not found"});
                }
                admin = data[0];

                if (!data[1]) {
                    return Promise.reject({message: "Proposal not found"});
                }
                proposal = data[1];

                if (proposal.status !== constProposalStatus.PENDING && proposal.status !== constProposalStatus.CSPENDING) {
                    return Promise.reject({message: "This proposal is already audited"});
                }

                if (!proposal.data || !proposal.data.largeWithdrawalLog) {
                    return Promise.reject({message: "Proposal not found"});
                }

                return dbconfig.collection_largeWithdrawalLog.findOne({_id: proposal.data.largeWithdrawalLog}).lean();
            }
        ).then(
            largeWithdrawalLogData => {
                if (!largeWithdrawalLogData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                return dbconfig.collection_largeWithdrawalSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
            }
        ).then(
            largeWithdrawalSettingData => {
                if (!largeWithdrawalSettingData) {
                    return Promise.reject({message: "Please setup large withdrawal setting."});
                }
                largeWithdrawalSetting = largeWithdrawalSettingData;

                let reviewerObjIdStrings = largeWithdrawalSetting.reviewer.map(reviewer => {
                    return String(reviewer);
                });

                if (!reviewerObjIdStrings.includes(adminObjId)) {
                    console.log("You do not have the power of approving this proposal through email:", adminObjId);
                    return Promise.reject({message: "You do not have the power of approving this proposal through email"});
                }

                return dbconfig.collection_proposal.findOneAndUpdate({
                    _id: proposal._id,
                    status: proposal.status,
                    createTime: proposal.createTime
                }, {
                    'data.approvedByCs': admin.adminName,
                    status: status,
                }, {
                    new: true
                }).populate({path: "type", model: dbconfig.collection_proposalType}).lean();
            }
        ).then(
            proposalData => {
                if (!proposalData) {
                    // someone changed the status in between these processes
                    return Promise.reject({message: "Proposal had been updated in the process of auditing, please try again if necessary"});
                }
                proposal = proposalData;

                return createProposalProcessStep(proposal, adminObjId, status, memo).catch(errorUtils.reportError);
            }
        ).then(
            () => {
                return proposalExecutor.approveOrRejectProposal(proposal.type.executionType, proposal.type.rejectionType, Boolean(decision === "approve"), proposal);
            }
        );
    },

    sendProposalUpdateInfoToRecipients: (largeWithdrawalLogObjId, proposal) => {
        let largeWithdrawalLog, largeWithdrawalSetting;
        return dbconfig.collection_largeWithdrawalLog.findOne({_id: largeWithdrawalLogObjId}).lean().then(
            largeWithdrawalLogData => {
                if (!largeWithdrawalLogData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                let largeWithdrawalSettingProm = dbconfig.collection_largeWithdrawalSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
                let proposalProcessProm = dbconfig.collection_proposalProcess.findOne({_id: proposal.process}).populate({path: "steps", model: dbconfig.collection_proposalProcessStep}).lean();

                return Promise.all([largeWithdrawalSettingProm, proposalProcessProm]);
            }
        ).then(
            ([largeWithdrawalSettingData, proposalProcessData]) => {
                if (!largeWithdrawalSettingData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                largeWithdrawalSetting = largeWithdrawalSettingData;

                if (!largeWithdrawalSetting.recipient || !largeWithdrawalSetting.recipient.length) {
                    return [];
                }

                let processStep;
                if (proposalProcessData && proposalProcessData.steps && proposalProcessData.steps[0]) {
                    processStep = proposalProcessData.steps[0];
                }

                let proms = [];

                largeWithdrawalSetting.recipient.map(recipient => {
                    let prom = sendLargeWithdrawalProposalAuditedInfo(proposal, recipient, largeWithdrawalLog, processStep);
                    proms.push(prom);
                });

                return Promise.all(proms);
            }
        );
    },

    getAllPlatformLargeWithdrawalSetting: () => {
        return dbconfig.collection_largeWithdrawalSetting.find({platform: {$exists: true}}).lean().then(
            settings => {
                let outputData = {};
                settings.map(setting => {
                    outputData[setting.platform] = setting;
                });

                return outputData;
            }
        );
    },


};

function generateAuditDecisionLink(host, proposalId, adminObjId) {
    // hash = "largeWithdrawal" + proposalId + adminObjId + "approve"/"reject"
    let hashContentRaw = "largeWithdrawalSnsoft" + proposalId + adminObjId;
    let rawLink = "http://" + host + "/auditLargeWithdrawalProposal?";
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


function sendLargeWithdrawalDetailMail(largeWithdrawalLog, largeWithdrawalSetting, adminObjId, isReviewer, host) {
    let admin, html;
    html = generateLargeWithdrawalDetailEmail(largeWithdrawalLog, largeWithdrawalSetting);

    return dbconfig.collection_admin.findOne({_id: adminObjId}).lean().then(
        adminData => {
            if (!adminData) {
                return Promise.reject({message: "Admin not found."});
            }
            admin = adminData;

            let auditLinksProm = Promise.resolve();

            if (isReviewer) {
                // get button html
                auditLinksProm = generateAuditDecisionLink(host, largeWithdrawalLog.proposalId, adminObjId);
            }

            return auditLinksProm;
        }
    ).then(
        auditLinks => {
            if (auditLinks) {
                html = appendAuditLinks(html, auditLinks);
            }

            let emailConfig = {
                sender: "no-reply@snsoft.my", // company email?
                recipient: admin.email, // admin email
                subject: getLogDetailEmailSubject(largeWithdrawalLog), // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

function sendLargeWithdrawalProposalAuditedInfo(proposalData, adminObjId, log, proposalProcessStep) {
    let admin, html;
    return dbconfig.collection_admin.findOne({_id: adminObjId}).populate({path: "departments", model: dbconfig.collection_department}).lean().then(
        adminData => {
            if (!adminData) {
                return Promise.reject({message: "Admin not found."});
            }
            admin = adminData;

            html = generateLargeWithdrawalAuditedInfoEmail(proposalData, admin, proposalProcessStep);

            let emailConfig = {
                sender: "no-reply@snsoft.my", // company email?
                recipient: admin.email, // admin email
                subject: getLogDetailEmailSubject(log), // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

function generateLargeWithdrawalDetailEmail (log, setting) {
    let html = ``;
    if (!setting) {
        return Promise.reject({message: "Please setup large withdrawal setting."});
    }

    html += `<div style="text-align: left; background-color: #047ea5; color: #FFFFFF; font-weight: bold; padding: 13px; border-radius: 38px; width: 61.8%">A.玩家信息区</div>`;

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">基本信息</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    if (setting.showRealName) {
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">真实姓名</td>
            <td style="border: solid 1px black; padding: 3px">${log.realName}</td>
        </tr>`;
    }
    if (setting.showPlayerLevel) {
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">等级</td>
            <td style="border: solid 1px black; padding: 3px">${log.playerLevelName}</td>
        </tr>`;
    }
    if (setting.showBankCity) {
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">银行城市</td>
            <td style="border: solid 1px black; padding: 3px">${log.bankCity}</td>
        </tr>`;
    }
    if (setting.showRegisterTime) {
        let time = dbutility.getLocalTimeString(log.registrationTime, "YYYY/MM/DD HH:mm:ss");
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">注册时间</td>
            <td style="border: solid 1px black; padding: 3px">${time}</td>
        </tr>`;
    }
    if (setting.showCurrentWithdrawalTime) {
        let time = dbutility.getLocalTimeString(log.withdrawalTime, "YYYY/MM/DD HH:mm:ss");
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">本次提款时间</td>
            <td style="border: solid 1px black; padding: 3px">${time}</td>
        </tr>`;
    }
    if (setting.showLastWithdrawalTime) {
        let time = dbutility.getLocalTimeString(log.lastWithdrawalTime, "YYYY/MM/DD HH:mm:ss");
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">上次提款时间</td>
            <td style="border: solid 1px black; padding: 3px">${time}</td>
        </tr>`;
    }
    if (setting.showCurrentCredit) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.currentCredit);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">账户余额</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }

    html += `</table>`;

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">上次提款至本次提款</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    if (setting.showPlayerBonusAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.playerBonusAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">玩家盈利</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showTotalTopUpAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.playerTotalTopUpAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">存款金额</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showConsumptionReturnAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.consumptionReturnAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">洗码优惠</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showRewardAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.rewardAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">其他优惠</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }

    html += `</table>`;

    if (setting.showConsumptionSectionCount) {
        let belowHundred = dbutility.noRoundTwoDecimalPlaces(log.consumptionAmountTimes.belowHundred);
        let belowThousand = dbutility.noRoundTwoDecimalPlaces(log.consumptionAmountTimes.belowThousand);
        let belowTenThousand = dbutility.noRoundTwoDecimalPlaces(log.consumptionAmountTimes.belowTenThousand);
        let belowHundredThousand = dbutility.noRoundTwoDecimalPlaces(log.consumptionAmountTimes.belowHundredThousand);
        let aboveHundredThousand = dbutility.noRoundTwoDecimalPlaces(log.consumptionAmountTimes.aboveHundredThousand);
        html += `
        <table style="border: solid; border-collapse: collapse; margin-top: 13px;">
            <tr style="background-color: #0b97c4; color: #FFFFFF;">
                <td style="border: solid 1px black; padding: 3px">投注金额区间</td>
                <td style="border: solid 1px black; padding: 3px">0～1百</td>
                <td style="border: solid 1px black; padding: 3px">1百~1千</td>
                <td style="border: solid 1px black; padding: 3px">1千～1万</td>
                <td style="border: solid 1px black; padding: 3px">1万～10万</td>
                <td style="border: solid 1px black; padding: 3px">10万UP</td>
            </tr>
            <tr>
                <td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">笔数</td>
                <td style="border: solid 1px black; padding: 3px">${belowHundred}</td>
                <td style="border: solid 1px black; padding: 3px">${belowThousand}</td>
                <td style="border: solid 1px black; padding: 3px">${belowTenThousand}</td>
                <td style="border: solid 1px black; padding: 3px">${belowHundredThousand}</td>
                <td style="border: solid 1px black; padding: 3px">${aboveHundredThousand}</td>
            </tr>
        </table>
        `;
    }

    if (setting.showGameProviderInfo) {
        let providers = log.gameProviderInfo || [];
        html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

        html += `<tr style="background-color: #0b97c4; color: #FFFFFF;">`;
        html += `<td style="border: solid 1px black; padding: 3px">游戏大厅详情</td>`;
        providers.map(provider => {
            html += `<td style="border: solid 1px black; padding: 3px">${provider.providerName}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">1.总投注笔数</td>`;
        providers.map(provider => {
            html += `<td style="border: solid 1px black; padding: 3px">${provider.consumptionTimes}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">2.报表输赢</td>`;
        providers.map(provider => {
            let num = dbutility.noRoundTwoDecimalPlaces(provider.bonusAmount);
            html += `<td style="border: solid 1px black; padding: 3px">${num}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">3.报表有效投注额</td>`;
        providers.map(provider => {
            let num = dbutility.noRoundTwoDecimalPlaces(provider.validAmount);
            html += `<td style="border: solid 1px black; padding: 3px">${num}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">4.网站营利点</td>`;
        providers.map(provider => {
            let num = dbutility.noRoundTwoDecimalPlaces(provider.siteBonusRatio);
            html += `<td style="border: solid 1px black; padding: 3px">${num}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">5.游戏类型投注额</td>`;
        providers.map(provider => {
            provider.consumptionAmountByType = provider.consumptionAmountByType || {};
            html += `<td style="border: solid 1px black; padding: 3px">`;
            Object.keys(provider.consumptionAmountByType).map(function(key) {
                let val = provider.consumptionAmountByType[key];
                let str = key + ": " + dbutility.noRoundTwoDecimalPlaces(val);
                html += `<span style="white-space: pre-line"> ${str} </span><br>`;
            });
            html += `</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">6.游戏类型报表输赢</td>`;
        providers.map(provider => {
            provider.playerBonusAmountByType = provider.playerBonusAmountByType || {};
            html += `<td style="border: solid 1px black; padding: 3px">`;
            Object.keys(provider.playerBonusAmountByType).map(function(key) {
                let val = provider.consumptionAmountByType[key];
                let str = key + ": " + dbutility.noRoundTwoDecimalPlaces(val);
                html += `<span style="white-space: pre-line"> ${str} </span><br>`;
            });
            html += `</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">7.投注模式分析</td>`;
        providers.map(() => {
            html += `<td style="border: solid 1px black; padding: 3px">（敬请期待）</td>`;
        });
        html += `</tr>`;

        html += `</table>`;
    }

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">最近一笔存款至本次提款</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    if (setting.showLastTopUpBonusAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpPlayerBonusAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">玩家盈利</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showLastTopUpAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">存款金额</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showLastTopUpConsumptionReturnAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpConsumptionReturnAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">洗码优惠</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showLastTopUpRewardAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpRewardAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">其他优惠</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }

    html += `</table>`;

    if (setting.showLastTopUpConsumptionSectionCount) {
        let belowHundred = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpConsumptionAmountTimes.belowHundred);
        let belowThousand = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpConsumptionAmountTimes.belowThousand);
        let belowTenThousand = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpConsumptionAmountTimes.belowTenThousand);
        let belowHundredThousand = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpConsumptionAmountTimes.belowHundredThousand);
        let aboveHundredThousand = dbutility.noRoundTwoDecimalPlaces(log.lastTopUpConsumptionAmountTimes.aboveHundredThousand);
        html += `
        <table style="border: solid; border-collapse: collapse; margin-top: 13px;">
            <tr style="background-color: #0b97c4; color: #FFFFFF;">
                <td style="border: solid 1px black; padding: 3px">投注金额区间</td>
                <td style="border: solid 1px black; padding: 3px">0～1百</td>
                <td style="border: solid 1px black; padding: 3px">1百~1千</td>
                <td style="border: solid 1px black; padding: 3px">1千～1万</td>
                <td style="border: solid 1px black; padding: 3px">1万～10万</td>
                <td style="border: solid 1px black; padding: 3px">10万UP</td>
            </tr>
            <tr>
                <td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">笔数</td>
                <td style="border: solid 1px black; padding: 3px">${belowHundred}</td>
                <td style="border: solid 1px black; padding: 3px">${belowThousand}</td>
                <td style="border: solid 1px black; padding: 3px">${belowTenThousand}</td>
                <td style="border: solid 1px black; padding: 3px">${belowHundredThousand}</td>
                <td style="border: solid 1px black; padding: 3px">${aboveHundredThousand}</td>
            </tr>
        </table>
        `;
    }

    if (setting.showLastTopUpGameProviderInfo) {
        let providers = log.lastTopUpGameProviderInfo || [];
        html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

        html += `<tr style="background-color: #0b97c4; color: #FFFFFF;">`;
        html += `<td style="border: solid 1px black; padding: 3px">游戏大厅详情</td>`;
        providers.map(provider => {
            html += `<td style="border: solid 1px black; padding: 3px">${provider.providerName}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">1.总投注笔数</td>`;
        providers.map(provider => {
            html += `<td style="border: solid 1px black; padding: 3px">${provider.consumptionTimes}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">2.报表输赢</td>`;
        providers.map(provider => {
            let num = dbutility.noRoundTwoDecimalPlaces(provider.bonusAmount);
            html += `<td style="border: solid 1px black; padding: 3px">${num}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">3.报表有效投注额</td>`;
        providers.map(provider => {
            let num = dbutility.noRoundTwoDecimalPlaces(provider.validAmount);
            html += `<td style="border: solid 1px black; padding: 3px">${num}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">4.网站营利点</td>`;
        providers.map(provider => {
            let num = dbutility.noRoundTwoDecimalPlaces(provider.siteBonusRatio);
            html += `<td style="border: solid 1px black; padding: 3px">${num}</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">5.游戏类型投注额</td>`;
        providers.map(provider => {
            provider.consumptionAmountByType = provider.consumptionAmountByType || {};
            html += `<td style="border: solid 1px black; padding: 3px">`;
            Object.keys(provider.consumptionAmountByType).map(function(key) {
                let val = provider.consumptionAmountByType[key];
                let str = key + ": " + dbutility.noRoundTwoDecimalPlaces(val);
                html += `<span style="white-space: pre-line"> ${str} </span><br>`;
            });
            html += `</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">6.游戏类型报表输赢</td>`;
        providers.map(provider => {
            provider.playerBonusAmountByType = provider.playerBonusAmountByType || {};
            html += `<td style="border: solid 1px black; padding: 3px">`;
            Object.keys(provider.playerBonusAmountByType).map(function(key) {
                let val = provider.consumptionAmountByType[key];
                let str = key + ": " + dbutility.noRoundTwoDecimalPlaces(val);
                html += `<span style="white-space: pre-line"> ${str} </span><br>`;
            });
            html += `</td>`;
        });
        html += `</tr>`;

        html += `<tr>`;
        html += `<td style="background-color: #0b97c4; color: #FFFFFF; border: solid 1px black; padding: 3px">7.投注模式分析</td>`;
        providers.map(() => {
            html += `<td style="border: solid 1px black; padding: 3px">（敬请期待）</td>`;
        });
        html += `</tr>`;

        html += `</table>`;
    }

    html += `<div style="text-align: left; background-color: #047ea5; color: #FFFFFF; font-weight: bold; padding: 13px; border-radius: 38px; width: 61.8%; margin-top: 34px;">B.网站数据区</div>`;

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">当天0点到本次提款</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    if (setting.showDayTopUpAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.dayTopUpAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">日存款</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showDayWithdrawAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.dayWithdrawAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">日提款</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showDayTopUpWithdrawDifference) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.dayTopUpBonusDifference);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">日存款-日提款</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }

    html += `</table>`;

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">从开户到本次提款</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    if (setting.showAccountTopUpAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.accountTopUpAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">总存款</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showAccountWithdrawAmount) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.accountWithdrawAmount);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">总提款</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showAccountTopUpWithdrawDifference) {
        let num = dbutility.noRoundTwoDecimalPlaces(log.topUpBonusDifference);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">总存款-总提款</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }

    html += `</table>`;

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">最近3个月玩家报表（每月数据分开）</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    let monthA = log.lastThreeMonthValue.secondLastMonth;
    let monthB = log.lastThreeMonthValue.lastMonth;
    let monthC = log.lastThreeMonthValue.currentMonth;

    if (setting.showLastThreeMonthTopUp) {
        let holder = log.lastThreeMonthTopUp;
        let numA = dbutility.noRoundTwoDecimalPlaces(holder.secondLastMonth);
        let numB = dbutility.noRoundTwoDecimalPlaces(holder.lastMonth);
        let numC = dbutility.noRoundTwoDecimalPlaces(holder.currentMonth);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">存款</td>
            <td style="border: solid 1px black; padding: 3px">(${monthA}月: ${numA}, ${monthB}月: ${numB}, ${monthC}月: ${numC})</td>
        </tr>`;
    }
    if (setting.showLastThreeMonthWithdraw) {
        let holder = log.lastThreeMonthWithdraw;
        let numA = dbutility.noRoundTwoDecimalPlaces(holder.secondLastMonth);
        let numB = dbutility.noRoundTwoDecimalPlaces(holder.lastMonth);
        let numC = dbutility.noRoundTwoDecimalPlaces(holder.currentMonth);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提款</td>
            <td style="border: solid 1px black; padding: 3px">(${monthA}月: ${numA}, ${monthB}月: ${numB}, ${monthC}月: ${numC})</td>
        </tr>`;
    }
    if (setting.showLastThreeMonthTopUpWithdrawDifference) {
        let holder = log.lastThreeMonthTopUpWithdrawDifference;
        let numA = dbutility.noRoundTwoDecimalPlaces(holder.secondLastMonth);
        let numB = dbutility.noRoundTwoDecimalPlaces(holder.lastMonth);
        let numC = dbutility.noRoundTwoDecimalPlaces(holder.currentMonth);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">存款-提款</td>
            <td style="border: solid 1px black; padding: 3px">(${monthA}月: ${numA}, ${monthB}月: ${numB}, ${monthC}月: ${numC})</td>
        </tr>`;
    }
    if (setting.showLastThreeMonthConsumptionAmount) {
        let holder = log.lastThreeMonthConsumptionAmount;
        let numA = dbutility.noRoundTwoDecimalPlaces(holder.secondLastMonth);
        let numB = dbutility.noRoundTwoDecimalPlaces(holder.lastMonth);
        let numC = dbutility.noRoundTwoDecimalPlaces(holder.currentMonth);
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">投注额</td>
            <td style="border: solid 1px black; padding: 3px">(${monthA}月: ${numA}, ${monthB}月: ${numB}, ${monthC}月: ${numC})</td>
        </tr>`;
    }

    html += `</table>`;

    if (setting.allowAdminComment) {
        let str = log.comment || "无";
        html += `<div style="text-align: left; background-color: #047ea5; color: #FFFFFF; font-weight: bold; padding: 13px; border-radius: 38px; width: 61.8%; margin-top: 34px;">C.客服备注说明区</div>`;

        html += `<div style="border: solid; border-collapse: collapse; margin-top: 13px; padding: 5px">${str}</div>`;
    }

    return html;
}

function appendAuditLinks (html, auditLinks) {
    auditLinks = auditLinks || {};
    let approveLink = auditLinks.approve || "";
    let rejectLink = auditLinks.reject || "";

    html += `
    <div style="margin-top: 38px">
        <a href="${approveLink}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: green; color: white; border-radius: 8px">通过审核</span></a>
        <a href="${rejectLink}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 13px; font-weight: bold; background-color: red; color: white; border-radius: 8px">取消提案</span></a>
    </div>
    `;

    return html;
}

function getLogDetailEmailSubject (log) {
    let withdrawalDate = dbutility.getLocalTimeString(log.withdrawalTime , "YYYY/MM/DD");
    let withdrawalAmount = dbutility.noRoundTwoDecimalPlaces(log.amount);
    let str = `大额提款（${log.todayLargeAmountNo}）：${withdrawalDate}--${log.playerName}--${withdrawalAmount}- ${log.emailNameExtension}`;

    return str;
}

function createProposalProcessStep (proposal, adminObjId, status, memo) {
    let proposalTypeProm = dbconfig.collection_proposalType.findOne({_id: proposal.type}).populate({path: "process", model: dbconfig.collection_proposalProcess}).lean();
    let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();

    return Promise.resolve([proposalTypeProm, adminProm]).then(
        ([proposalType, admin]) => {
            if (!proposalType || admin) {
                return Promise.resolve();
            }

            if (!proposalType.process || !proposalType.process.steps || !proposalType.process.steps.length) {
                return Promise.resolve();
            }

            let proposalTypeProcessStepId = proposalType.process.steps[0];

            let proposalProcessStepData = {
                status,
                memo,
                operator: adminObjId,
                operationTime: new Date(),
                type: proposalTypeProcessStepId,
                department: admin.departments && admin.departments[0] || undefined,
                role: admin.roles && admin.roles[0] || undefined,
                createTime: new Date()
            };

            return dbProposalProcessStep.createProposalProcessStep(proposalProcessStepData);
        }
    ).then(
        stepObj => {
            if (!stepObj) {
                return Promise.resolve();
            }

            return dbconfig.collection_proposalProcess.findOneAndUpdate({_id: proposal.process}, {$addToSet: {steps: stepObj._id}}, {new: true}).lean();
        }
    );
}

function generateLargeWithdrawalAuditedInfoEmail (proposalData, admin, proposalProcessStep) {
    let lockStatus = proposalData.isLocked && proposalData.isLocked.adminName || "未锁定";
    let status, cancelTime, decisionColor;
    switch (proposalData.status) {
        case constProposalStatus.APPROVED:
            status = "已审核";
            cancelTime = "";
            decisionColor = "green";
            break;
        case constProposalStatus.FAIL:
            status = "失败";
            cancelTime = dbutility.getLocalTimeString(proposalData.data && proposalData.data.lastSettleTime || proposalData.settleTime, "YYYY/MM/DD HH:mm:ss");
            decisionColor = "red";
            break;
        case constProposalStatus.SUCCESS:
            status = "成功";
            cancelTime = "";
            decisionColor = "green";
            break;
        default:
            status = "已取消";
            cancelTime = dbutility.getLocalTimeString(proposalProcessStep && proposalProcessStep.operationTime || proposalData.data && proposalData.data.lastSettleTime || proposalData.settleTime, "YYYY/MM/DD HH:mm:ss");
            decisionColor = "red";
    }
    let creator = proposalData.creator && proposalData.creator.name || "系统";
    let createTime = dbutility.getLocalTimeString(proposalData.createTime, "YYYY/MM/DD HH:mm:ss");
    let settleTime = dbutility.getLocalTimeString(proposalData.data && proposalData.data.lastSettleTime || proposalData.settleTime, "YYYY/MM/DD HH:mm:ss");


    let html = `
    <div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; width: 38.2%"><b>基本</b></div>
    <div style="margin-top: 8px;">锁定状态：${lockStatus}</div>
    <div style="margin-top: 8px;">名称：玩家提款</div>
    <div style="margin-top: 8px; color: ${decisionColor};">状态：${status}</div>
    <div style="margin-top: 8px;">提案号：${proposalData.proposalId}</div>
    <div style="margin-top: 8px;">创建者：${creator}</div>
    <div style="margin-top: 8px;">创建时间：${createTime}</div>
    <div style="margin-top: 8px;">执行时间：${settleTime}</div>
    <div style="margin-top: 8px;">取消时间：${cancelTime}</div>
    <div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; width: 38.2%; margin-top: 13px;"><b>提案历史过程</b></div>
    `;

    if (proposalProcessStep) {
        let department = admin && admin.departments && admin.departments[0] && admin.departments[0].departmentName || "";
        let auditor = admin.adminName;
        let auditTime = dbutility.getLocalTimeString(proposalProcessStep.operationTime, "YYYY/MM/DD HH:mm:ss");
        let memo = proposalProcessStep.memo || "";

        html += `
        <div style="margin-top: 8px;">部门：${department}</div>
        <div style="margin-top: 8px;">审核人：${auditor}</div>
        <div style="margin-top: 8px;">审核时间：${auditTime}</div>
        <div style="margin-top: 8px; color: ${decisionColor};">备注：${memo}</div>
        `;
    }

    return html;
}

var proto = dbLargeWithdrawalFunc.prototype;
proto = Object.assign(proto, dbLargeWithdrawal);

// ======== large withdrawal log input common function START ========

// ======== large withdrawal log input common function END ========

module.exports = dbLargeWithdrawal;