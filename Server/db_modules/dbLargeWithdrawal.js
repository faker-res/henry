"use strict";

var dbLargeWithdrawalFunc = function () {
};
module.exports = new dbLargeWithdrawalFunc();

const dbconfig = require("./../modules/dbproperties");
const emailer = require("./../modules/emailer");
const constSystemParam = require('./../const/constSystemParam');
const constProposalStatus = require('./../const/constProposalStatus');
const bcrypt = require("bcrypt");
const errorUtils = require("./../modules/errorUtils");
const pmsAPI = require('../externalAPI/pmsAPI');
const constProposalType = require('../const/constProposalType');
const ObjectId = require('mongoose').Types.ObjectId;
const dbUtility = require('./../modules/dbutility');
const cpmsAPI = require("../externalAPI/cpmsAPI");
var constProposalMainType = require('../const/constProposalMainType');
const proposalExecutor = require('./../modules/proposalExecutor');


const dbLargeWithdrawal = {
    getLargeWithdrawLog: (largeWithdrawLogObjId) => {
        return dbconfig.collection_largeWithdrawalLog.findOne({_id: largeWithdrawLogObjId}).lean();
    },

    fillUpLargeWithdrawalLogDetail: (largeWithdrawalLogObjId) => {
        let largeWithdrawalLog, proposal, player;
        let lastWithdrawalObj;
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

                // return last, last 3 month withdrawal
                let lastWithdrawalProm = dbconfig.collection_proposal.findOne({
                    'data.playerObjId': ObjectId(proposal.data.playerObjId),
                    mainType: constProposalType.PLAYER_BONUS,
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                }).sort({createTime: -1}).lean();
                return Promise.all([lastWithdrawalProm]);
            }
        ).then(
            ([lastWithdraw]) => {
                lastWithdrawalObj = lastWithdraw;
                let largeWithdrawalSettingProm = dbconfig.collection_largeWithdrawalSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
                let todayLargeAmountProm = Promise.resolve(0);
                if (player.platform && player.platform.autoApproveWhenSingleBonusApplyLessThan) {
                    let todayTime = dbUtility.getTodaySGTime();
                    todayLargeAmountProm = dbconfig.collection_largeWithdrawalLog.find({
                        platform: largeWithdrawalLog.platform,
                        withdrawalTime: {
                            $gte: todayTime.startTime,
                            $lt: todayTime.endTime
                        },
                    }).count();
                }
                let bankCityProm = pmsAPI.foundation_getCityList({provinceId: player.bankAccountProvince});
                let gameCreditProm = getTotalUniqueProviderCredit(player);

                let totalTopUpFromLastWithdrawal = Promise.resolve(0); //default amount
                let totalConsumptionFromLastWithdrawal = Promise.resolve(0);
                let totalRewardFromLastWithdrawal = Promise.resolve(0);
                if (lastWithdraw && lastWithdraw.createTime) {
                    totalTopUpFromLastWithdrawal = getTotalTopUpSinceLastWithdrawal(player, lastWithdraw.createTime, proposal.createTime);
                    totalConsumptionFromLastWithdrawal = getTotalConsumptionSinceLastWithdrawal(player, lastWithdraw.createTime, proposal.createTime);
                    totalRewardFromLastWithdrawal = getTotalRewardSinceLastWithdrawal(player, lastWithdraw.createTime, proposal.createTime);

                }


                return Promise.all([largeWithdrawalSettingProm, todayLargeAmountProm, bankCityProm, gameCreditProm, totalTopUpFromLastWithdrawal
                ,totalConsumptionFromLastWithdrawal, totalRewardFromLastWithdrawal]);
            }
        ).then(
            ([largeWithdrawalSetting, todayLargeAmountNo, bankCity, gameCredit, topUpAmtFromLastWithdraw, consumptionAmtFromLastWithdraw
                 , rewardAmtFromLastWithdraw]) => {
                let bankCityName;
                let withdrawalAmount;
                let currentCredit = gameCredit + player.validCredit;
                console.log("walaoreward",rewardAmtFromLastWithdraw)
                if (proposal && proposal.data && proposal.data.hasOwnProperty("amount")) {
                    withdrawalAmount = proposal.data.amount;
                }

                if (bankCity && bankCity.cities && bankCity.cities.length && player.bankAccountCity) {
                    for (let i = 0; i < bankCity.cities.length; i++) {
                        if (bankCity.cities[i].id == player.bankAccountCity) {
                            bankCityName = bankCity.cities[i].name;
                            break;
                        }
                    }
                }

                let updateObj = {
                    emailNameExtension:largeWithdrawalSetting.emailNameExtension,
                    todayLargeAmountNo: todayLargeAmountNo + 1,
                    playerName: player.name,
                    amount: withdrawalAmount,
                    realName: player.realName,
                    playerLevelName: player.playerLevel.name,
                    bankCity: bankCityName,
                    registrationTime: player.registrationTime,
                    // withdrawalTime: proposal.createTime,
                    lastWithdrawalTime: lastWithdrawalObj && lastWithdrawalObj.createTime || "",
                    currentCredit: currentCredit,
                    playerBonusAmount: currentCredit + withdrawalAmount - topUpAmtFromLastWithdraw,
                    playerTotalTopUpAmount: topUpAmtFromLastWithdraw,
                    consumptionReturnAmount: consumptionAmtFromLastWithdraw,
                    rewardAmount: rewardAmtFromLastWithdraw
                };
                
                console.log("walaoeheheheheheh", updateObj)
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

                        let prom = sendLargeWithdrawalDetailMail(largeWithdrawalLog, recipient, isReviewer, host).catch(err => {
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

    largeWithdrawalAudit: (proposalId, adminObjId, decision) => {
        let admin, proposal, largeWithdrawalLog, largeWithdrawalSetting;
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
        let proposalProm = dbconfig.collection_proposal.findOne({proposalId}).lean();

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
                    status: constProposalStatus.APPROVED,
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

                return dbconfig.collection_largeWithdrawalSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
            }
        ).then(
            largeWithdrawalSettingData => {
                if (!largeWithdrawalSettingData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                largeWithdrawalSetting = largeWithdrawalSettingData;

                if (!largeWithdrawalSetting.recipient || !largeWithdrawalSetting.recipient.length) {
                    return [];
                }

                let proms = [];

                largeWithdrawalSetting.recipient.map(recipient => {
                    let prom = sendLargeWithdrawalProposalAuditedInfo(proposal, recipient);
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
    let rawLink = host + "/auditLargeWithdrawalProposal?";
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


function sendLargeWithdrawalDetailMail(largeWithdrawalLog, adminObjId, isReviewer, host) {
    let admin, html;
    html = "todo"

    // get html from large withdrawal log todo

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
                // temp html, replace it with proper html later
                
//                 html = "";
//                 html += "<a href='http://" + auditLinks.approve + "'>Approve</a>";
//                 html += "<a href='http://" + auditLinks.reject + "'>Reject</a>";

            }

            let emailConfig = {
                sender: "no-reply@snsoft.my", // company email?
                recipient: admin.email, // admin email
                subject: "大额提款（" + (largeWithdrawalLog.emailSentTimes + 1) + "）：日期--会员账号--本次提款金额- " + largeWithdrawalLog.emailNameExtension, // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

function sendLargeWithdrawalProposalAuditedInfo(proposalData, adminObjId) {
    let admin, html;
    // get html todo
    html = "Data";
    return dbconfig.collection_admin.findOne({_id: adminObjId}).lean().then(
        adminData => {
            if (!adminData) {
                return Promise.reject({message: "Admin not found."});
            }
            admin = adminData;

            let emailConfig = {
                sender: "no-reply@snsoft.my", // company email?
                recipient: admin.email, // admin email
                subject: "大额提款（" + (largeWithdrawalLog.emailSentTimes + 1) + "）：日期--会员账号--本次提款金额- " + largeWithdrawalLog.emailNameExtension, // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

var proto = dbLargeWithdrawalFunc.prototype;
proto = Object.assign(proto, dbLargeWithdrawal);

// ======== large withdrawal log input common function START ========
function getTotalConsumptionSinceLastWithdrawal (playerObj, lastWithdrawTime, currentWithdrawTime) {
    return dbconfig.collection_playerConsumptionRecord.aggregate([{
        $match: {
            playerId: playerObj._id,
            createTime: {
                $gte: lastWithdrawTime,
                $lt: currentWithdrawTime
            }
        }
    }, {
        $group: {
            _id: null,
            amount: {$sum: "$validAmount"}
        }
    }]).then(
        consumptionData => {
            let consumptionAmount = 0;
            if (consumptionData && consumptionData[0] && consumptionData[0].amount) {
                consumptionAmount = consumptionData[0].amount;
            }
            return consumptionAmount;
        }
    );

};

function getTotalTopUpSinceLastWithdrawal (playerObj, lastWithdrawTime, currentWithdrawTime) {
    return dbconfig.collection_playerTopUpRecord.aggregate([{
        $match: {
            playerId: playerObj._id,
            createTime: {
                $gte: lastWithdrawTime,
                $lt: currentWithdrawTime
            }
        }
    }, {
        $group: {
            _id: null,
            amount: {$sum: "$amount"}
        }
    }]).then(
        topUpData => {
            let topUpAmount = 0;
            if (topUpData && topUpData[0] && topUpData[0].amount) {
                topUpAmount = topUpData[0].amount;
            }
            return topUpAmount;
        }
    );
};

function getTotalRewardSinceLastWithdrawal (playerObj, lastWithdrawTime, currentWithdrawTime) {
    return dbconfig.collection_proposalType.findOne({
        platformId: playerObj.platform,
        name: constProposalType.PLAYER_CONSUMPTION_RETURN
    }).lean().then(
        proposalTypeData => {
            let rewardQuery = {
                'data.playerObjId': {$in: [ObjectId(playerObj._id), String(playerObj._id)]},
                mainType: "Reward",
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                createTime: {
                    $gte: lastWithdrawTime,
                    $lt: currentWithdrawTime
                }
            }
            if (proposalTypeData) {
                rewardQuery.type = {$ne: proposalTypeData._id}
            }
            return dbconfig.collection_proposal.aggregate([{
                $match: rewardQuery
            }, {
                $group: {
                    _id: null,
                    amount: {$sum: "$data.rewardAmount"}
                }
            }]).then(
                rewardData => {
                    let rewardAmount = 0;
                    if (rewardData && rewardData[0] && rewardData[0].amount) {
                        rewardAmount = rewardData[0].amount;
                    }
                    return rewardAmount;
                }
            );
        }
    )
}

function getTotalUniqueProviderCredit (playerObj) {
    let gamePromArr = [];
    return dbconfig.collection_platform.findOne({_id: playerObj.platform})
        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean().then(
        platformData => {
            let totalGameCredit = 0;

            if (platformData && platformData.gameProviders.length > 0) {
                for (let j = 0 ; j < platformData.gameProviders.length; j++) {
                    let provider = platformData.gameProviders[j];
                    let sameLineProviders = provider.sameLineProviders && provider.sameLineProviders[platformData.platformId] || [];

                    for (let k = platformData.gameProviders.length - 1; k > j; k--) {
                        let comparingProvider = platformData.gameProviders[k];
                        if (sameLineProviders.includes(comparingProvider.providerId)) {
                            platformData.gameProviders.splice(k, 1);
                        }
                    }
                }

                for (let i = 0; i < platformData.gameProviders.length; i++) {
                    let queryObj = {
                        username: playerObj.name,
                        platformId: platformData.platformId,
                        providerId: platformData.gameProviders[i].providerId,
                    };
                    let gameCreditProm = cpmsAPI.player_queryCredit(queryObj).catch(err => {
                        console.log("Failed to get credit from CPMS, largeWithdrawLog")
                        return Promise.resolve();
                    })
                    gamePromArr.push(gameCreditProm);
                }
            }
            return Promise.all(gamePromArr).then(
                gameCreditData => {
                    console.log("walaogamecredit",gameCreditData)
                    if (gameCreditData && gameCreditData.length) {
                        gameCreditData.forEach(game => {
                            if (game && game.credit) {
                                totalGameCredit += parseFloat(game.credit);
                            }
                        })
                    }
                    return totalGameCredit;
                }
            )
        }
    );
};
// ======== large withdrawal log input common function END ========

module.exports = dbLargeWithdrawal;