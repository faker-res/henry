"use strict";

var dbLargeWithdrawalFunc = function () {
};
module.exports = new dbLargeWithdrawalFunc();

const dbconfig = require("./../modules/dbproperties");
const dbutility = require("./../modules/dbutility");
const dbProposalUtility = require("./../db_common/dbProposalUtility");
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
const constProposalMainType = require('../const/constProposalMainType');
const constPlayerRegistrationInterface = require('../const/constPlayerRegistrationInterface');
const proposalExecutor = require('./../modules/proposalExecutor');
const RESTUtils = require('./../modules/RESTUtils');


const dbLargeWithdrawal = {
    getLargeWithdrawLog: (largeWithdrawLogObjId) => {
        return dbconfig.collection_largeWithdrawalLog.findOne({_id: largeWithdrawLogObjId}).lean();
    },

    getPartnerLargeWithdrawLog: (largeWithdrawLogObjId) => {
        return dbconfig.collection_partnerLargeWithdrawalLog.findOne({_id: largeWithdrawLogObjId}).lean();
    },

    fillUpLargeWithdrawalLogDetail: (largeWithdrawalLogObjId) => {
        let largeWithdrawalLog, proposal, player;
        let lastWithdrawalObj;
        let updateObj;
        let debugStep = 0;
        return dbconfig.collection_largeWithdrawalLog.findOne({_id: largeWithdrawalLogObjId}).lean().then(
            largeWithdrawalLogData => {
                debugStep++;
                if (!largeWithdrawalLogData) {
                    console.log("no large withdrawal log found:", largeWithdrawalLogObjId);
                    return Promise.reject({message: "no large withdrawal log found"});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                return dbconfig.collection_proposal.findOne({proposalId: largeWithdrawalLog.proposalId}).lean();
            }
        ).then(
            proposalData => {
                debugStep++;
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
                debugStep++;
                player = playerData;
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find player"});
                }

                // return last withdrawal, top up time
                let lastWithdrawalProm = dbconfig.collection_proposal.findOne({
                    'data.playerObjId': ObjectId(proposal.data.playerObjId),
                    mainType: constProposalType.PLAYER_BONUS,
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                }).sort({createTime: -1}).lean();

                let lastTopUpProm = dbconfig.collection_playerTopUpRecord.findOne({
                    playerId: ObjectId(proposal.data.playerObjId),
                }).sort({createTime: -1}).lean();

                return Promise.all([lastWithdrawalProm, lastTopUpProm]);
            }
        ).then(
            ([lastWithdraw, lastTopUp]) => {
                debugStep++;
                lastWithdrawalObj = lastWithdraw;
                let lastWithdrawalCreateTime = lastWithdraw && lastWithdraw.createTime || new Date("1990-01-01");
                let lastTopUpCreateTime = lastTopUp && lastTopUp.createTime || new Date("1990-01-01");
                let largeWithdrawalSettingProm = dbconfig.collection_largeWithdrawalSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
                let todayTime = dbUtility.getTargetSGTime(proposal.createTime);
                let currentMonthDate = dbUtility.getCurrentMonthSGTIme();
                let lastMonthDate = dbUtility.getLastMonthSGTime();
                let secondLastMonthDate = dbUtility.getSecondLastMonthSGTime();

                let todayLargeAmountProm = dbconfig.collection_largeWithdrawalLog.find({
                    platform: largeWithdrawalLog.platform,
                    withdrawalTime: {
                        $gte: todayTime.startTime,
                        $lte: proposal.createTime
                    },
                }).count();

                //let bankCityProm = pmsAPI.foundation_getCityList({provinceId: player.bankAccountProvince}).catch(err => {return traceError("foundation_getCityList", err)});
                let bankCityProm = RESTUtils.getPMS2Services("postCityList", {provinceId: player.bankAccountProvince}).catch(err => {return traceError("postCityList", err)});
                let gameCreditProm = getTotalUniqueProviderCredit(player).catch(err => {return traceError("getTotalUniqueProviderCredit", err)});

                let totalTopUpFromLastWithdrawal = Promise.resolve(0); //default amount
                let totalXIMAFromLastWithdrawal = Promise.resolve(0);
                let totalRewardFromLastWithdrawal = Promise.resolve(0);
                let consumptionTimesFromLastWithdrawal = Promise.resolve({
                    belowHundred: 0,
                    belowThousand: 0,
                    belowTenThousand: 0,
                    belowHundredThousand: 0,
                    aboveHundredThousand: 0
                });
                let providerInfoFromLastWithdrawal = Promise.resolve([]);
                totalTopUpFromLastWithdrawal = getTotalTopUpByTime(player, lastWithdrawalCreateTime, proposal.createTime).catch(err => {return traceError("getTotalTopUpByTime6", err)});
                totalXIMAFromLastWithdrawal = getTotalXIMAByTime(player, lastWithdrawalCreateTime, proposal.createTime).catch(err => {return traceError("getTotalXIMAByTime", err)});
                totalRewardFromLastWithdrawal = getTotalRewardByTime(player, lastWithdrawalCreateTime, proposal.createTime).catch(err => {return traceError("getTotalRewardByTime8", err)});
                consumptionTimesFromLastWithdrawal = getConsumptionTimesByTime(player, lastWithdrawalCreateTime, proposal.createTime).catch(err => {return traceError("getConsumptionTimesByTime7", err)});
                providerInfoFromLastWithdrawal = getProviderInfoByTime(player, lastWithdrawalCreateTime, proposal.createTime).catch(err => {return traceError("getProviderInfoByTime9", err)});
                let totalTopUpFromLastTopUp = Promise.resolve(0);
                let totalXIMAFromLastTopUp = Promise.resolve(0);
                let totalRewardFromLastTopUp = Promise.resolve(0);
                let consumptionTimesFromLastTopUp = Promise.resolve({
                    belowHundred: 0,
                    belowThousand: 0,
                    belowTenThousand: 0,
                    belowHundredThousand: 0,
                    aboveHundredThousand: 0
                });
                let providerInfoFromLastTopUp = Promise.resolve([]);
                let todayTopUpAmt = getTotalTopUpByTime(player, todayTime.startTime, todayTime.endTime).catch(err => {return traceError("getTotalTopUpByTime1", err)});
                let todayWithdrawalAmt = getTotalWithdrawalByTime(player, todayTime.startTime, todayTime.endTime).catch(err => {return traceError("getTotalWithdrawalByTime1", err)});
                let totalTopUpAmt = getTotalTopUpByTime(player).catch(err => {return traceError("getTotalTopUpByTime2", err)});
                let totalWithdrawalAmt = getTotalWithdrawalByTime(player).catch(err => {return traceError("getTotalWithdrawalByTime2", err)});

                let currentMonthTopUpAmt = getTotalTopUpByTime(player, currentMonthDate.startTime, currentMonthDate.endTime).catch(err => {return traceError("getTotalTopUpByTime3", err)});
                let lastMonthTopUpAmt = getTotalTopUpByTime(player, lastMonthDate.startTime, lastMonthDate.endTime).catch(err => {return traceError("getTotalTopUpByTime4", err)});
                let secondLastMonthTopUpAmt = getTotalTopUpByTime(player, secondLastMonthDate.startTime, secondLastMonthDate.endTime).catch(err => {return traceError("getTotalTopUpByTime5", err)});

                let currentMonthWithdrawAmt = getTotalWithdrawalByTime(player, currentMonthDate.startTime, currentMonthDate.endTime).catch(err => {return traceError("getTotalWithdrawalByTime3", err)});
                let lastMonthWithdrawAmt = getTotalWithdrawalByTime(player, lastMonthDate.startTime, lastMonthDate.endTime).catch(err => {return traceError("getTotalWithdrawalByTime4", err)});
                let secondLastMonthWithdrawAmt = getTotalWithdrawalByTime(player, secondLastMonthDate.startTime, secondLastMonthDate.endTime).catch(err => {return traceError("getTotalWithdrawalByTime5", err)});

                let currentMonthConsumptionAmt = getTotalConsumptionByTime(player, currentMonthDate.startTime, currentMonthDate.endTime).catch(err => {return traceError("getTotalConsumptionByTime3", err)});
                let lastMonthConsumptionAmt = getTotalConsumptionByTime(player, lastMonthDate.startTime, lastMonthDate.endTime).catch(err => {return traceError("getTotalConsumptionByTime4", err)});
                let secondLastMonthConsumptionAmt = getTotalConsumptionByTime(player, secondLastMonthDate.startTime, secondLastMonthDate.endTime).catch(err => {return traceError("getTotalConsumptionByTime5", err)});

                if (lastTopUp && lastTopUp.createTime) {
                    totalTopUpFromLastTopUp = lastTopUp.amount ? lastTopUp.amount : 0;
                }
                totalXIMAFromLastTopUp = getTotalXIMAByTime(player, lastTopUpCreateTime, proposal.createTime).catch(err => {return traceError("getTotalXIMAByTimeD", err)});
                totalRewardFromLastTopUp = getTotalRewardByTime(player, lastTopUpCreateTime, proposal.createTime).catch(err => {return traceError("getTotalRewardByTimeD", err)});
                consumptionTimesFromLastTopUp = getConsumptionTimesByTime(player, lastTopUpCreateTime, proposal.createTime).catch(err => {return traceError("getConsumptionTimesByTimeD", err)});
                providerInfoFromLastTopUp = getProviderInfoByTime(player, lastTopUpCreateTime, proposal.createTime).catch(err => {return traceError("getProviderInfoByTimeD", err)});


                return Promise.all([largeWithdrawalSettingProm, todayLargeAmountProm, bankCityProm, gameCreditProm, totalTopUpFromLastWithdrawal
                    , totalXIMAFromLastWithdrawal, totalRewardFromLastWithdrawal, consumptionTimesFromLastWithdrawal, providerInfoFromLastWithdrawal
                    , totalTopUpFromLastTopUp, totalXIMAFromLastTopUp, totalRewardFromLastTopUp, consumptionTimesFromLastTopUp, providerInfoFromLastTopUp
                    , todayTopUpAmt, todayWithdrawalAmt, totalTopUpAmt, totalWithdrawalAmt, currentMonthTopUpAmt, lastMonthTopUpAmt, secondLastMonthTopUpAmt
                    , currentMonthWithdrawAmt, lastMonthWithdrawAmt, secondLastMonthWithdrawAmt, currentMonthConsumptionAmt, lastMonthConsumptionAmt, secondLastMonthConsumptionAmt]);
            }
        ).then(
            ([largeWithdrawalSetting, todayLargeAmountNo, bankCity, gameCredit, topUpAmtFromLastWithdraw, totalXIMAFromLastWithdraw
                 , rewardAmtFromLastWithdraw, consumptionTimesFromLastWithdraw, providerInfoFromLastWithdraw, totalTopUpFromLastTopUp
                 , totalXIMAFromLastTopUp, totalRewardFromLastTopUp, consumptionTimesFromLastTopUp, providerInfoFromLastTopUp
                 , todayTopUpAmt, todayWithdrawalAmt, totalTopUpAmt, totalWithdrawalAmt, currentMonthTopUpAmt, lastMonthTopUpAmt, secondLastMonthTopUpAmt
                , currentMonthWithdrawAmt, lastMonthWithdrawAmt, secondLastMonthWithdrawAmt, currentMonthConsumptionAmt, lastMonthConsumptionAmt, secondLastMonthConsumptionAmt]) => {
                debugStep++;
                let bankCityName;
                let withdrawalAmount;
                let currentCredit = gameCredit + player.validCredit;
                let currentMonth = dbUtility.getCurrentMonthSGTIme().endTime.getMonth() + 1; // month count from zero

                if (proposal && proposal.data && proposal.data.hasOwnProperty("amount")) {
                    withdrawalAmount = proposal.data.amount;
                }

                if (bankCity && bankCity.data && bankCity.data.length && player.bankAccountCity) {
                    for (let i = 0; i < bankCity.data.length; i++) {
                        if (bankCity.data[i].id == player.bankAccountCity) {
                            bankCityName = bankCity.data[i].name;
                            break;
                        }
                    }
                }

                updateObj = {
                    emailNameExtension: largeWithdrawalSetting.emailNameExtension,
                    todayLargeAmountNo: todayLargeAmountNo,
                    playerName: player.name,
                    amount: withdrawalAmount || 0,
                    realName: player.realName,
                    playerLevelName: player.playerLevel.name,
                    bankCity: bankCityName,
                    registrationTime: player.registrationTime,
                    lastWithdrawalTime: lastWithdrawalObj && lastWithdrawalObj.createTime || "",
                    currentCredit: currentCredit,
                    playerBonusAmount: currentCredit + withdrawalAmount - topUpAmtFromLastWithdraw,
                    playerTotalTopUpAmount: topUpAmtFromLastWithdraw,
                    consumptionReturnAmount: totalXIMAFromLastWithdraw,
                    rewardAmount: rewardAmtFromLastWithdraw,
                    consumptionAmountTimes: {
                        belowHundred: consumptionTimesFromLastWithdraw.belowHundred || 0,
                        belowThousand: consumptionTimesFromLastWithdraw.belowThousand || 0,
                        belowTenThousand: consumptionTimesFromLastWithdraw.belowTenThousand || 0,
                        belowHundredThousand: consumptionTimesFromLastWithdraw.belowHundredThousand || 0,
                        aboveHundredThousand: consumptionTimesFromLastWithdraw.aboveHundredThousand || 0
                    },
                    gameProviderInfo: providerInfoFromLastWithdraw,
                    lastTopUpPlayerBonusAmount: currentCredit + withdrawalAmount - totalTopUpFromLastTopUp,
                    lastTopUpAmount: totalTopUpFromLastTopUp,
                    lastTopUpConsumptionReturnAmount: totalXIMAFromLastTopUp,
                    lastTopUpRewardAmount: totalRewardFromLastTopUp,
                    lastTopUpConsumptionAmountTimes: {
                        belowHundred: consumptionTimesFromLastTopUp.belowHundred || 0,
                        belowThousand: consumptionTimesFromLastTopUp.belowThousand || 0,
                        belowTenThousand: consumptionTimesFromLastTopUp.belowTenThousand || 0,
                        belowHundredThousand: consumptionTimesFromLastTopUp.belowHundredThousand || 0,
                        aboveHundredThousand: consumptionTimesFromLastTopUp.aboveHundredThousand || 0
                    },
                    lastTopUpGameProviderInfo: providerInfoFromLastTopUp,
                    dayTopUpAmount: todayTopUpAmt,
                    dayWithdrawAmount: todayWithdrawalAmt,
                    dayTopUpBonusDifference: todayTopUpAmt - todayWithdrawalAmt,
                    accountTopUpAmount: totalTopUpAmt,
                    accountWithdrawAmount: totalWithdrawalAmt,
                    topUpBonusDifference: totalTopUpAmt - totalWithdrawalAmt,
                    lastThreeMonthValue: {
                        currentMonth: currentMonth,
                        lastMonth: currentMonth - 1,
                        secondLastMonth: currentMonth - 2
                    },
                    lastThreeMonthTopUp: {
                        currentMonth: currentMonthTopUpAmt,
                        lastMonth: lastMonthTopUpAmt,
                        secondLastMonth: secondLastMonthTopUpAmt
                    },
                    lastThreeMonthWithdraw: {
                        currentMonth: currentMonthWithdrawAmt,
                        lastMonth: lastMonthWithdrawAmt,
                        secondLastMonth: secondLastMonthWithdrawAmt
                    },
                    lastThreeMonthTopUpWithdrawDifference: {
                        currentMonth: currentMonthTopUpAmt - currentMonthWithdrawAmt,
                        lastMonth: lastMonthTopUpAmt - lastMonthWithdrawAmt,
                        secondLastMonth: secondLastMonthTopUpAmt - secondLastMonthWithdrawAmt
                    },
                    lastThreeMonthConsumptionAmount: {
                        currentMonth: currentMonthConsumptionAmt,
                        lastMonth: lastMonthConsumptionAmt,
                        secondLastMonth: secondLastMonthConsumptionAmt
                    }
                };

                return dbconfig.collection_largeWithdrawalLog.findOneAndUpdate({_id: largeWithdrawalLogObjId}, updateObj, {new: true}).lean().catch(err => {
                    // debug use
                    console.log("fill up failure", largeWithdrawalLogObjId, updateObj);
                    return Promise.reject(err);
                });
            }
        ).catch(
            err => {
                console.trace('fill up error trace', largeWithdrawalLogObjId, debugStep, updateObj);
                return Promise.reject(err);
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


                let recipientsProm = Promise.resolve();
                if (largeWithdrawalSetting.recipient && largeWithdrawalSetting.recipient.length) {
                    recipientsProm = dbconfig.collection_admin.find({_id: {$in: largeWithdrawalSetting.recipient}}).lean();
                }

                return recipientsProm;
            }
        ).then(
            recipientsData => {
                let allRecipientEmail = recipientsData.map(recipient => {
                    return recipient.email;
                });

                let proms = [];

                if (largeWithdrawalSetting.recipient && largeWithdrawalSetting.recipient.length) {
                    largeWithdrawalSetting.recipient.map(recipient => {
                        let isReviewer = Boolean(largeWithdrawalSetting.reviewer && largeWithdrawalSetting.reviewer.length && largeWithdrawalSetting.reviewer.map(reviewer => String(reviewer)).includes(String(recipient)));

                        let prom = sendLargeWithdrawalDetailMail(largeWithdrawalLog, largeWithdrawalSetting, recipient, isReviewer, host, allRecipientEmail).catch(err => {
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

    fillUpPartnerLargeWithdrawalLogDetail: (logObjId) => {
        let log, partner, proposal, setting, todayLargeAmount, bankCityName, lastWithdrawalDate, downLinePlayerAmount, downlinePartnerAmount;
        let todayTime = dbUtility.getTodaySGTime();
        let updateData = {};
        return dbconfig.collection_partnerLargeWithdrawalLog.findOne({_id: logObjId}).lean().then(
            logData => {
                if (!logData) {
                    console.log("no partner large withdrawal log found:", logObjId);
                    return Promise.reject({message: "no partner large withdrawal log found"});
                }
                log = logData;

                let proposalProm = dbconfig.collection_proposal.findOne({proposalId: log.proposalId}).read("secondaryPreferred").lean();
                let settingProm = dbconfig.collection_largeWithdrawalPartnerSetting.findOne({platform: log.platform}).lean();

                return Promise.all([proposalProm, settingProm]);
            }
        ).then(
            ([proposalData, settingData]) => {
                if (!proposalData) {
                    console.log("proposal of partner large withdrawal not found", logObjId);
                    return Promise.reject({message: "proposal of partner large withdrawal not found"});
                }
                proposal = proposalData;
                todayTime = dbUtility.getTargetSGTime(proposal.createTime);

                if (!proposal.data || !proposal.data.partnerObjId) {
                    console.log("partnerObjId of proposal not found:", log.proposalId);
                    return Promise.reject({message: "partnerObjId of proposal not found"});
                }

                if (!settingData) {
                    return Promise.reject({name: "DataError", message: "Please setup large withdrawal setting."});
                }
                setting = settingData;


                return dbconfig.collection_partner.findOne({_id: proposal.data.partnerObjId}).lean();

            }
        ).then(
            partnerData => {
                if (!partnerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }
                partner = partnerData;

                let todayLargeAmountProm = dbconfig.collection_partnerLargeWithdrawalLog.find({
                    platform: log.platform,
                    withdrawalTime: {
                        $gte: todayTime.startTime,
                        $lte: proposal.createTime
                    },
                }).read("secondaryPreferred").count();

                //let bankCityProm = pmsAPI.foundation_getCityList({provinceId: partner.bankAccountProvince});
                let bankCityProm = RESTUtils.getPMS2Services("postCityList", {provinceId: partner.bankAccountProvince});
                let lastWithdrawalProm = dbconfig.collection_proposal.findOne({
                    'data.partnerObjId': proposal.data.partnerObjId,
                    mainType: constProposalType.PLAYER_BONUS,
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
                    createTime: {$lt: proposal.createTime}
                }).sort({createTime: -1}).read("secondaryPreferred").lean();

                let downLinePlayerProm = dbconfig.collection_players.find({partner: partner._id}, {_id: 1}).read("secondaryPreferred").lean();
                let downLinePartnerProm = dbconfig.collection_partner.find({parent: partner._id}, {_id: 1}).read("secondaryPreferred").lean();

                return Promise.all([todayLargeAmountProm, bankCityProm, lastWithdrawalProm, downLinePlayerProm, downLinePartnerProm]);
            }
        ).then(
            ([todayLargeAmountData, bankCityData, lastWithdrawalData, downLinePlayerData, downLinePartnerData]) => {
                todayLargeAmount = (todayLargeAmountData || 0) + 1;

                bankCityName = "";
                if (bankCityData && bankCityData.data && bankCityData.data.length && partner.bankAccountCity) {
                    for (let i = 0; i < bankCityData.data.length; i++) {
                        if (bankCityData.data[i].id == partner.bankAccountCity) {
                            bankCityName = bankCityData.data[i].name;
                            break;
                        }
                    }
                }

                lastWithdrawalDate = lastWithdrawalData && lastWithdrawalData.createTime || null;

                downLinePlayerAmount = downLinePlayerData && downLinePlayerData.length || 0;
                downlinePartnerAmount = downLinePartnerData && downLinePartnerData.length || 0;

                let proposalsQuery = {
                    "data.platformId": {$in:[String(log.platform), log.platform]},
                    "data.partnerName": partner.partnerName,
                    createTime: {
                        $lte: proposal.createTime,
                    }
                };

                if (lastWithdrawalDate) {
                    proposalsQuery.createTime.$gte = lastWithdrawalDate;
                }

                return dbconfig.collection_proposal.find(proposalsQuery).populate({path: "type", model: dbconfig.collection_proposalType}).sort({createTime: -1}).read("secondaryPreferred").lean();
            }
        ).then(
            periodProposals => {
                let proposalsAfterLastWithdrawal = periodProposals.map(prop => {
                    let detail = {};
                    detail.proposalId = prop.proposalId;
                    detail.creatorName = prop.creator && prop.creator.name ? prop.creator.name : "";
                    detail.inputDevice = prop.inputDevice || 0;
                    detail.proposalMainType = prop.mainType;
                    detail.proposalType = prop.type && prop.type.name ? prop.type.name : "";
                    detail.status = prop.status;
                    detail.relatedUser = partner.partnerName;
                    detail.amount = prop.data && prop.data.amount ? prop.data.amount : 0;
                    detail.createTime = prop.createTime || "";
                    detail.remark = prop.data && prop.data.remark? prop.data.remark : "";
                    return detail;
                });

                let commissionTypeName = "";

                switch (partner.commissionType) {
                    case 0:
                        commissionTypeName = "关闭";
                        break;
                    case 1:
                        commissionTypeName = "1天-输赢值";
                        break;
                    case 2:
                        commissionTypeName = "7天-输赢值";
                        break;
                    case 3:
                        commissionTypeName = "半月-输赢值";
                        break;
                    case 4:
                        commissionTypeName = "1月-输赢值";
                        break;
                    case 5:
                        commissionTypeName = "7天-投注额";
                        break;
                    case 6:
                        commissionTypeName = "代理前端自选（未选择）";
                        break;
                }

                updateData = {
                    emailNameExtension: setting.emailNameExtension || "",
                    todayLargeAmountNo: todayLargeAmount,
                    partnerName: partner.partnerName,
                    amount: proposal.data && proposal.data.amount || 0,
                    realName: partner.realName || "",
                    commissionTypeName: commissionTypeName,
                    bankCity: bankCityName,
                    registrationTime: partner.registrationTime,
                    withdrawalTime: proposal.createTime,
                    lastWithdrawalTime: lastWithdrawalDate,
                    currentCredit: partner.credits || 0,
                    downLinePlayerAmount: downLinePlayerAmount,
                    downLinePartnerAmount: downlinePartnerAmount,
                    proposalsAfterLastWithdrawal: proposalsAfterLastWithdrawal,
                };

                return dbconfig.collection_partnerLargeWithdrawalLog.findOneAndUpdate({_id: log._id}, updateData, {new: true}).lean();
            }
        ).catch(err => {
            console.log("fill up partner large withdrawal failed", logObjId, updateData, err);
            return Promise.reject(err);
        });
    },

    sendPartnerLargeAmountDetailMail: (largeWithdrawalLogObjId, comment, admin, host) => {
        let largeWithdrawalLog, largeWithdrawalSetting;
        return dbconfig.collection_partnerLargeWithdrawalLog.findOneAndUpdate({_id: largeWithdrawalLogObjId}, {comment: comment}, {new: true}).lean().then(
            largeWithdrawalLogData => {
                if (!largeWithdrawalLogData) {
                    return Promise.reject({message: "Partner large withdrawal log not found."});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                return dbconfig.collection_largeWithdrawalPartnerSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
            }
        ).then(
            largeWithdrawalSettingData => {
                if (!largeWithdrawalSettingData) {
                    return Promise.reject({message: "Please setup partner large withdrawal setting."});
                }
                largeWithdrawalSetting = largeWithdrawalSettingData;


                let recipientsProm = Promise.resolve([]);
                if (largeWithdrawalSetting.recipient && largeWithdrawalSetting.recipient.length) {
                    recipientsProm = dbconfig.collection_admin.find({_id: {$in: largeWithdrawalSetting.recipient}}).lean();
                }

                return recipientsProm;
            }
        ).then(
            recipientsData => {
                let allRecipientEmail = recipientsData.map(recipient => {
                    return recipient.email;
                });

                let proms = [];

                if (largeWithdrawalSetting.recipient && largeWithdrawalSetting.recipient.length) {
                    largeWithdrawalSetting.recipient.map(recipient => {
                        let isReviewer = Boolean(largeWithdrawalSetting.reviewer && largeWithdrawalSetting.reviewer.length && largeWithdrawalSetting.reviewer.map(reviewer => String(reviewer)).includes(String(recipient)));

                        let prom = sendPartnerLargeWithdrawalDetailMail(largeWithdrawalLog, largeWithdrawalSetting, recipient, isReviewer, host, allRecipientEmail).catch(err => {
                            console.log('partner large withdrawal mail to admin failed', recipient, err);
                            return errorUtils.reportError(err);
                        });
                        proms.push(prom);
                    });
                }

                Promise.all(proms).catch(errorUtils.reportError);
                return dbconfig.collection_partnerLargeWithdrawalLog.findOneAndUpdate({_id: largeWithdrawalLog._id}, {$inc: {emailSentTimes: 1}}, {new: true}).lean().catch(errorUtils.reportError);
            }
        );
    },

    largeWithdrawalAudit: (proposalId, adminObjId, decision, isMail, isPartner) => {
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

                if (isPartner && (!proposal.data || !proposal.data.partnerLargeWithdrawalLog)) {
                    return Promise.reject({message: "Proposal not found"});
                }

                if (!isPartner && (!proposal.data || !proposal.data.largeWithdrawalLog)) {
                    return Promise.reject({message: "Proposal not found"});
                }

                if (isPartner) {
                    return dbconfig.collection_partnerLargeWithdrawalLog.findOne({_id: proposal.data.partnerLargeWithdrawalLog}).lean();
                }
                return dbconfig.collection_largeWithdrawalLog.findOne({_id: proposal.data.largeWithdrawalLog}).lean();
            }
        ).then(
            largeWithdrawalLogData => {
                if (!largeWithdrawalLogData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                largeWithdrawalLog = largeWithdrawalLogData;

                if (isPartner) {
                    return dbconfig.collection_largeWithdrawalPartnerSetting.findOne({platform: largeWithdrawalLog.platform}).lean();
                }
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
                return dbconfig.collection_proposal.findOneAndUpdate(
                    {_id: proposal._id, createTime: proposal.createTime},
                    {$inc: {processedTimes: 1}},
                    {new: true}
                ).lean();
            }
        ).then(
            updatedProposal => {
                if (updatedProposal && updatedProposal.processedTimes && updatedProposal.processedTimes > 1) {
                    console.log(updatedProposal.proposalId + " This proposal has been processed");
                    return Promise.reject({message: "This proposal has been processed"});
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

                return dbProposalUtility.createProposalProcessStep(proposal, adminObjId, status, memo).catch(errorUtils.reportError);
            }
        ).then(
            () => {
                return proposalExecutor.approveOrRejectProposal(proposal.type.executionType, proposal.type.rejectionType, Boolean(decision === "approve"), proposal);
            }
        );
    },

    sendProposalUpdateInfoToRecipients: (logObjId, proposal, bSuccess, isPartner) => {
        let log, setting;
        let settingModel = isPartner ? dbconfig.collection_largeWithdrawalPartnerSetting : dbconfig.collection_largeWithdrawalSetting;
        let logModel = isPartner ? dbconfig.collection_partnerLargeWithdrawalLog : dbconfig.collection_largeWithdrawalLog;
        return logModel.findOne({_id: logObjId}).lean().then(
            logData => {
                if (!logData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                log = logData;

                if (!bSuccess && !log.emailSentTimes) {
                    // no email sending is necessary if its a reject without previous email sent
                    return [{}];
                }

                let settingProm = settingModel.findOne({platform: log.platform}).lean();
                let proposalProcessProm = dbconfig.collection_proposalProcess.findOne({_id: proposal.process}).populate({path: "steps", model: dbconfig.collection_proposalProcessStep}).lean();

                return Promise.all([settingProm, proposalProcessProm]);
            }
        ).then(
            ([settingData, proposalProcessData]) => {
                if (!settingData) {
                    return Promise.reject({message: "Large withdrawal log not found"});
                }
                setting = settingData;

                if (!setting.recipient || !setting.recipient.length) {
                    return [];
                }

                let processStep;
                if (proposalProcessData && proposalProcessData.steps && proposalProcessData.steps.length) {
                    processStep = proposalProcessData.steps[proposalProcessData.steps.length - 1];
                }

                // let proms = [];
                //
                // setting.recipient.map(recipient => {
                //     let prom = sendLargeWithdrawalProposalAuditedInfo(proposal, recipient, log, processStep, bSuccess, isPartner);
                //     proms.push(prom);
                // });
                //
                // return Promise.all(proms);

                return bulkSendProposalAuditedInfo(proposal, setting.recipient, log, processStep, bSuccess, isPartner);
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

    getAllPlatformPartnerLargeWithdrawalSetting: () => {
        return dbconfig.collection_largeWithdrawalPartnerSetting.find({platform: {$exists: true}}).lean().then(
            settings => {
                let outputData = {};
                settings.map(setting => {
                    outputData[setting.platform] = setting;
                });

                return outputData;
            }
        );
    },

    getTotalPlayerCreditNumber: (playerObjId) => {
        let validCredit = 0;
        return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            player => {
                if (!player) {
                    return Promise.reject({message: "Player not found."});
                }
                validCredit = player.validCredit || 0;
                return getTotalUniqueProviderCredit(player);
            }
        ).then(
            gameCredit => {
                return gameCredit + validCredit;
            }
        )
    },

    getConsumptionTimesByTime: (playerObjId, startTime, endTime) => {
        return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            player => {
                if (!player) {
                    return Promise.reject({message: "Player not found."});
                }
                return getConsumptionTimesByTime(player, startTime, endTime);
            }
        );
    },

    getThreeMonthPlayerCreditSummary: (playerObjId) => {
        return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            player => {
                if (!player) {
                    return Promise.reject({message: "Player not found."});
                }
                let currentMonthDate = dbUtility.getCurrentMonthSGTIme();
                let lastMonthDate = dbUtility.getLastMonthSGTime();
                let secondLastMonthDate = dbUtility.getSecondLastMonthSGTime();

                let currentMonthTopUpAmt = getTotalTopUpByTime(player, currentMonthDate.startTime, currentMonthDate.endTime).catch(err => {return traceError("getTotalTopUpByTime3", err)});
                let lastMonthTopUpAmt = getTotalTopUpByTime(player, lastMonthDate.startTime, lastMonthDate.endTime).catch(err => {return traceError("getTotalTopUpByTime4", err)});
                let secondLastMonthTopUpAmt = getTotalTopUpByTime(player, secondLastMonthDate.startTime, secondLastMonthDate.endTime).catch(err => {return traceError("getTotalTopUpByTime5", err)});

                let currentMonthWithdrawAmt = getTotalWithdrawalByTime(player, currentMonthDate.startTime, currentMonthDate.endTime).catch(err => {return traceError("getTotalWithdrawalByTime3", err)});
                let lastMonthWithdrawAmt = getTotalWithdrawalByTime(player, lastMonthDate.startTime, lastMonthDate.endTime).catch(err => {return traceError("getTotalWithdrawalByTime4", err)});
                let secondLastMonthWithdrawAmt = getTotalWithdrawalByTime(player, secondLastMonthDate.startTime, secondLastMonthDate.endTime).catch(err => {return traceError("getTotalWithdrawalByTime5", err)});

                let currentMonthConsumptionAmt = getTotalConsumptionByTime(player, currentMonthDate.startTime, currentMonthDate.endTime).catch(err => {return traceError("getTotalConsumptionByTime3", err)});
                let lastMonthConsumptionAmt = getTotalConsumptionByTime(player, lastMonthDate.startTime, lastMonthDate.endTime).catch(err => {return traceError("getTotalConsumptionByTime4", err)});
                let secondLastMonthConsumptionAmt = getTotalConsumptionByTime(player, secondLastMonthDate.startTime, secondLastMonthDate.endTime).catch(err => {return traceError("getTotalConsumptionByTime5", err)});

                return Promise.all([currentMonthTopUpAmt, lastMonthTopUpAmt, secondLastMonthTopUpAmt, currentMonthWithdrawAmt, lastMonthWithdrawAmt, secondLastMonthWithdrawAmt, currentMonthConsumptionAmt, lastMonthConsumptionAmt, secondLastMonthConsumptionAmt]);
            }
        ).then(
            ([currentMonthTopUpAmt, lastMonthTopUpAmt, secondLastMonthTopUpAmt, currentMonthWithdrawAmt, lastMonthWithdrawAmt, secondLastMonthWithdrawAmt, currentMonthConsumptionAmt, lastMonthConsumptionAmt, secondLastMonthConsumptionAmt]) => {
                let currentMonth = dbUtility.getCurrentMonthSGTIme().endTime.getMonth() + 1;

                return {
                    lastThreeMonthValue: {
                        currentMonth: currentMonth,
                        lastMonth: currentMonth - 1,
                        secondLastMonth: currentMonth - 2
                    },
                    lastThreeMonthTopUp: {
                        currentMonth: currentMonthTopUpAmt,
                        lastMonth: lastMonthTopUpAmt,
                        secondLastMonth: secondLastMonthTopUpAmt
                    },
                    lastThreeMonthWithdraw: {
                        currentMonth: currentMonthWithdrawAmt,
                        lastMonth: lastMonthWithdrawAmt,
                        secondLastMonth: secondLastMonthWithdrawAmt
                    },
                    lastThreeMonthTopUpWithdrawDifference: {
                        currentMonth: currentMonthTopUpAmt - currentMonthWithdrawAmt,
                        lastMonth: lastMonthTopUpAmt - lastMonthWithdrawAmt,
                        secondLastMonth: secondLastMonthTopUpAmt - secondLastMonthWithdrawAmt
                    },
                    lastThreeMonthConsumptionAmount: {
                        currentMonth: currentMonthConsumptionAmt,
                        lastMonth: lastMonthConsumptionAmt,
                        secondLastMonth: secondLastMonthConsumptionAmt
                    }
                }
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

function generatePartnerAuditDecisionLink(host, proposalId, adminObjId) {
    // hash = "largeWithdrawal" + proposalId + adminObjId + "approve"/"reject"
    let hashContentRaw = "largeWithdrawalSnsoftPartner" + proposalId + adminObjId;
    let rawLink = "http://" + host + "/auditPartnerLargeWithdrawalProposal?";
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

function sendLargeWithdrawalDetailMail(largeWithdrawalLog, largeWithdrawalSetting, adminObjId, isReviewer, host, allRecipientEmail) {
    let admin, html;
    let consoleLogMessage;
    html = generateLargeWithdrawalDetailEmail(largeWithdrawalLog, largeWithdrawalSetting, allRecipientEmail);

    let allEmailStr = allRecipientEmail && allRecipientEmail.length ? allRecipientEmail.join() : "";

    return dbconfig.collection_admin.findOne({_id: adminObjId}).lean().then(
        adminData => {
            if (!adminData) {
                return Promise.reject({message: "Admin not found."});
            }
            admin = adminData;

            let auditLinksProm = Promise.resolve();

            if (isReviewer) {
                // get button html
                let domainUsed = largeWithdrawalSetting.domain || host;
                auditLinksProm = generateAuditDecisionLink(domainUsed, largeWithdrawalLog.proposalId, adminObjId);
            }

            return auditLinksProm;
        }
    ).then(
        auditLinks => {
            if (auditLinks) {
                html = appendAuditLinks(html, auditLinks);
            }

            let subject = getLogDetailEmailSubject(largeWithdrawalLog);

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
            consoleLogMessage = `${subject}, ${admin.adminName}, ${admin.email}, ${new Date()}`;
            console.log("sending large withdrawal email", consoleLogMessage);

            return emailer.sendEmail(emailConfig);
        }
    ).then(
        emailResult => {
            console.log("email result of", consoleLogMessage, "||", emailResult);
            return emailResult;
        }
    );
}

function sendPartnerLargeWithdrawalDetailMail(largeWithdrawalLog, largeWithdrawalSetting, adminObjId, isReviewer, host, allRecipientEmail) {
    let admin, html;
    html = generatePartnerLargeWithdrawalDetailEmail(largeWithdrawalLog, largeWithdrawalSetting, allRecipientEmail);

    return dbconfig.collection_admin.findOne({_id: adminObjId}).lean().then(
        adminData => {
            if (!adminData) {
                return Promise.reject({message: "Admin not found."});
            }
            admin = adminData;

            let auditLinksProm = Promise.resolve();

            if (isReviewer) {
                // get button html
                let domainUsed = largeWithdrawalSetting.domain || host;
                auditLinksProm = generatePartnerAuditDecisionLink(domainUsed, largeWithdrawalLog.proposalId, adminObjId);
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
                subject: getLogDetailEmailSubject(largeWithdrawalLog, true), // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

function sendLargeWithdrawalProposalAuditedInfo(proposalData, adminObjId, log, proposalProcessStep, bSuccess, isPartner) {
    let admin, html;

    let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
    let auditorProm = dbconfig.collection_admin.findOne({_id: proposalProcessStep.operator}).lean();
    let auditorDepartmentProm = dbconfig.collection_department.findOne({_id: proposalProcessStep.department}).lean();

    return Promise.all([adminProm, auditorProm, auditorDepartmentProm]).then(
        ([adminData, auditorData, auditorDepartmentData]) => {
            if (!adminData) {
                return Promise.reject({message: "Admin not found."});
            }
            admin = adminData;

            html = generateLargeWithdrawalAuditedInfoEmail(proposalData, proposalProcessStep, auditorData, auditorDepartmentData, bSuccess);

            let emailConfig = {
                sender: "no-reply@snsoft.my", // company email?
                recipient: admin.email, // admin email
                subject: getLogDetailEmailSubject(log, isPartner), // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

function bulkSendProposalAuditedInfo (proposalData, adminObjIds, log, proposalProcessStep, bSuccess, isPartner) {
    let admins, html, adminEmails;
    let adminsProm = dbconfig.collection_admin.find({_id: {$in: adminObjIds}}).lean();
    let auditorProm = dbconfig.collection_admin.findOne({_id: proposalProcessStep.operator}).lean();
    let auditorDepartmentProm = dbconfig.collection_department.findOne({_id: proposalProcessStep.department}).lean();

    return Promise.all([adminsProm, auditorProm, auditorDepartmentProm]).then(
        ([adminsData, auditorData, auditorDepartmentData]) => {
            if (!adminsData) {
                return Promise.reject({message: "Admin not found."});
            }
            admins = adminsData;

            adminEmails = admins.map(admin => {
                return admin.email;
            });

            let adminEmailsStr = adminEmails.join();

            html = generateLargeWithdrawalAuditedInfoEmail(proposalData, proposalProcessStep, auditorData, auditorDepartmentData, bSuccess);

            let emailConfig = {
                sender: "no-reply@snsoft.my", // company email?
                recipient: adminEmailsStr, // admin email
                subject: getLogDetailEmailSubject(log, isPartner), // title
                body: html, // html content
                isHTML: true
            };

            return emailer.sendEmail(emailConfig);
        }
    );
}

function generateLargeWithdrawalDetailEmail (log, setting, allEmailArr) {
    let html = ``;
    if (!setting) {
        return Promise.reject({message: "Please setup large withdrawal setting."});
    }

    let allEmailStr = allEmailArr && allEmailArr.length ? allEmailArr.join() : "";

    let emailSubject = getLogDetailEmailSubject(log) + " " + dbutility.getLocalTimeString(log.withdrawalTime, "hh:ss A");

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
    if (setting.showProposalId) {
        let num = log.proposalId;
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提款提案号</td>
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
                let val = provider.playerBonusAmountByType[key];
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
                let val = provider.playerBonusAmountByType[key];
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

    html += `
    <div style="margin-top: 38px">
        <a href="mailto:${allEmailStr}?subject=${emailSubject}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 8px; font-weight: bold; background-color: purple; color: white; border-radius: 8px">发送邮件到给所有收件人</span></a>
    </div>
    `;

    return html;
}

function generatePartnerLargeWithdrawalDetailEmail (log, setting, allEmailArr) {
    let html = ``;
    if (!setting) {
        return Promise.reject({message: "Please setup partner large withdrawal setting."});
    }

    let allEmailStr = allEmailArr && allEmailArr.length ? allEmailArr.join() : "";

    let emailSubject = getLogDetailEmailSubject(log) + " " + dbutility.getLocalTimeString(log.withdrawalTime, "hh:ss A");

    html += `<div style="text-align: left; background-color: #047ea5; color: #FFFFFF; font-weight: bold; padding: 13px; border-radius: 38px; width: 61.8%">A.代理信息区</div>`;

    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">代理基本信息</div>`;

    html += `<table style="border: solid; border-collapse: collapse; margin-top: 13px;">`;

    if (setting.showRealName) {
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">真实姓名</td>
            <td style="border: solid 1px black; padding: 3px">${log.realName}</td>
        </tr>`;
    }
    if (setting.showCommissionType) {
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">佣金模式</td>
            <td style="border: solid 1px black; padding: 3px">${log.commissionTypeName}</td>
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
    if (setting.showTotalDownlinePlayersCount) {
        let num = log.downLinePlayerAmount;
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">下线总玩家数</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showTotalDownlinePartnersCount) {
        let num = log.downLinePartnerAmount;
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">下线总玩家数</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }
    if (setting.showProposalId) {
        let num = log.proposalId;
        html += `<tr>
            <td style="border: solid 1px black; padding: 3px">提款提案号</td>
            <td style="border: solid 1px black; padding: 3px">${num}</td>
        </tr>`;
    }

    html += `</table>`;

    html += `<div style="text-align: left; background-color: #047ea5; color: #FFFFFF; font-weight: bold; padding: 13px; border-radius: 38px; width: 61.8%; margin-top: 34px;">B.提案数据区</div>`;
    html += `<div style="text-align: left; background-color: #0b97c4; color: #FFFFFF; padding: 8px; border-radius: 38px; margin-top: 21px; width: 38.2%">提案数据</div>`;

    if (setting.showAllPartnerRelatedProposal) {
        html += `
        <table style="border: solid; border-collapse: collapse; margin-top: 13px;">
            <tr style="background-color: #0b97c4; color: #FFFFFF;">
                <td style="border: solid 1px black; padding: 3px">提案 ID</td>
                <td style="border: solid 1px black; padding: 3px">创建者</td>
                <td style="border: solid 1px black; padding: 3px">入口</td>
                <td style="border: solid 1px black; padding: 3px">提案类型</td>
                <td style="border: solid 1px black; padding: 3px">提案子类型</td>
                <td style="border: solid 1px black; padding: 3px">提案状态</td>
                <td style="border: solid 1px black; padding: 3px">涉及帐号</td>
                <td style="border: solid 1px black; padding: 3px">涉及额度</td>
                <td style="border: solid 1px black; padding: 3px">加入时间</td>
                <td style="border: solid 1px black; padding: 3px">备注</td>
            </tr>`;
        if (log && log.proposalsAfterLastWithdrawal && log.proposalsAfterLastWithdrawal.length) {
            log.proposalsAfterLastWithdrawal.forEach(proposal => {
                let amount = dbutility.noRoundTwoDecimalPlaces(proposal.amount);
                let createTime = proposal.createTime ? dbutility.getLocalTimeString(proposal.createTime, "YYYY/MM/DD HH:mm:ss") : "";
                let inputDeviceStr = getInputDeviceString(proposal.inputDevice);
                let proposalStatusStr = getProposalStatusString(proposal.status);
                let proposalTypeStr = getProposalTypeString(proposal.proposalType);
                let proposalMainTypeStr = getProposalMainTypeString(proposal.proposalMainType);
                html += `<tr>
                <td style="border: solid 1px black; padding: 3px">${proposal.proposalId}</td>
                <td style="border: solid 1px black; padding: 3px">${proposal.creatorName}</td>
                <td style="border: solid 1px black; padding: 3px">${inputDeviceStr}</td>
                <td style="border: solid 1px black; padding: 3px">${proposalMainTypeStr}</td>
                <td style="border: solid 1px black; padding: 3px">${proposalTypeStr}</td>
                <td style="border: solid 1px black; padding: 3px">${proposalStatusStr}</td>
                <td style="border: solid 1px black; padding: 3px">${proposal.relatedUser}</td>
                <td style="border: solid 1px black; padding: 3px">${amount}</td>
                <td style="border: solid 1px black; padding: 3px">${createTime}</td>
                <td style="border: solid 1px black; padding: 3px">${proposal.remark}</td>
                </tr>`;
            });
        }
        html += `</table>`;
    }

    let str = log.comment || "无";
    html += `<div style="text-align: left; background-color: #047ea5; color: #FFFFFF; font-weight: bold; padding: 13px; border-radius: 38px; width: 61.8%; margin-top: 34px;">C.客服备注说明区</div>`;

    html += `<div style="border: solid; border-collapse: collapse; margin-top: 13px; padding: 5px">${str}</div>`;


    html += `
    <div style="margin-top: 38px">
        <a href="mailto:${allEmailStr}?subject=${emailSubject}" target="_blank" style="margin: 8px;"><span style="display: inline-block; padding: 8px; font-weight: bold; background-color: purple; color: white; border-radius: 8px">发送邮件到给所有收件人</span></a>
    </div>
    `;

    return html;
}

function getProposalMainTypeString(inputData) {
    let text = "";
    switch (inputData) {
        case "TopUp":
            text = "充值";
            break;
        case "PlayerBonus":
            text = "玩家提款";
            break;
        case "Reward":
            text = "优惠";
            break;
        case "UpdatePlayer":
            text = "玩家资料";
            break;
        case "UpdatePartner":
            text = "代理资料";
            break;
        case "Intention":
            text = "意向";
            break;
        case "Others":
            text = "其它";
            break;
    }
    return text;
}


function getProposalTypeString(inputData) {
    let text = "";
    switch(inputData) {
        case constProposalType.UPDATE_PARTNER_BANK_INFO:
            text = "编辑代理银行资料";
            break;
        case constProposalType.UPDATE_PARTNER_PHONE:
            text = "编辑代理电话资料";
            break;
        case constProposalType.UPDATE_PARTNER_EMAIL:
            text = "编辑代理电邮资料";
            break;
        case constProposalType.UPDATE_PARTNER_QQ:
            text = "编辑代理QQ资料";
            break;
        case constProposalType.UPDATE_PARTNER_WECHAT:
            text = "编辑代理微信资料";
            break;
        case constProposalType.UPDATE_PARTNER_INFO:
            text = "编辑代理基本资料";
            break;
        case constProposalType.UPDATE_PARTNER_COMMISSION_TYPE:
            text = "编辑代理佣金模式";
            break;
        case constProposalType.UPDATE_PARTNER_REAL_NAME:
            text = "编辑代理真实姓名";
            break;
        case constProposalType.CUSTOMIZE_PARTNER_COMM_RATE:
            text = "客制化代理参数";
            break;
        case constProposalType.UPDATE_CHILD_PARTNER:
            text = "编辑下级代理架构";
            break;
        case constProposalType.PARTNER_CREDIT_TRANSFER_TO_DOWNLINE:
            text = "代理转帐至下线玩家";
            break;
        case constProposalType.DOWNLINE_RECEIVE_PARTNER_CREDIT:
            text = "下线玩家接收代理转帐";
            break;
        case constProposalType.UPDATE_PARENT_PARTNER_COMMISSION:
            text = "一级代理佣金";
            break;
        case constProposalType.SETTLE_PARTNER_COMMISSION:
            text = "代理佣金";
            break;
        case constProposalType.PARTNER_CONSUMPTION_RETURN:
            text = "代理洗码";
            break;
        case constProposalType.PARTNER_INCENTIVE_REWARD:
            text = "代理优惠";
            break;
        case constProposalType.PARTNER_REFERRAL_REWARD:
            text = "代理推荐人优惠";
            break;
        case constProposalType.PLATFORM_TRANSACTION_REWARD:
            text = "银行转账优惠";
            break;
        case constProposalType.PARTNER_TOP_UP_RETURN:
            text = "代理充值优惠";
            break;
        case constProposalType.PARTNER_BONUS:
            text = "代理提款";
            break;
        case constProposalType.PARTNER_COMMISSION:
            text = "代理佣金(旧)";
            break;
        case constProposalType.UPDATE_PARTNER_CREDIT:
            text = "更改代理额度";
            break;
    }
    return text;
}

function getProposalStatusString(inputData) {
    let text = "";
    switch(inputData) {
        case constProposalStatus.PREPENDING:
            text = "异常";
            break;
        case constProposalStatus.PENDING:
            text = "待审核";
            break;
        case constProposalStatus.AUTOAUDIT:
            text = "自动审核";
            break;
        case constProposalStatus.PROCESSING:
            text = "处理中";
            break;
        case constProposalStatus.APPROVED:
            text = "成功";
            break;
        case constProposalStatus.REJECTED:
            text = "失败";
            break;
        case constProposalStatus.SUCCESS:
            text = "成功";
            break;
        case constProposalStatus.FAIL:
            text = "失败";
            break;
        case constProposalStatus.CANCEL:
            text = "已取消";
            break;
        case constProposalStatus.EXPIRED:
            text = "过期";
            break;
        case constProposalStatus.UNDETERMINED:
            text = "待定";
            break;
        case constProposalStatus.RECOVER:
            text = "恢复在处理";
            break;
        case constProposalStatus.ATTEMPT:
            text = "尝试";
            break;
        case constProposalStatus.MANUAL:
            text = "手动";
            break;
        case constProposalStatus.CSPENDING:
            text = "待客服审核";
            break;
        case constProposalStatus.NOVERIFY:
            text = "免验";
            break;
        case constProposalStatus.APPROVE:
            text = "已审核";
            break;
    }
    return text;
}

function getInputDeviceString(inputData) {
    let text = "";
    switch(inputData) {
        case constPlayerRegistrationInterface.BACKSTAGE:
            text = "后台";
            break;
        case constPlayerRegistrationInterface.WEB_PLAYER:
            text = "WEB玩家";
            break;
        case constPlayerRegistrationInterface.WEB_AGENT:
            text = "WEB代理";
            break;
        case constPlayerRegistrationInterface.H5_PLAYER:
            text = "H5玩家";
            break;
        case constPlayerRegistrationInterface.H5_AGENT:
            text = "H5代理";
            break;
        case constPlayerRegistrationInterface.APP_PLAYER:
            text = "APP玩家";
            break;
        case constPlayerRegistrationInterface.APP_AGENT:
            text = "APP代理";
            break;
    }
    return text;
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

function getLogDetailEmailSubject (log, isPartner) {
    let withdrawalDate = dbutility.getLocalTimeString(log.withdrawalTime , "YYYY/MM/DD");
    let withdrawalAmount = dbutility.noRoundTwoDecimalPlaces(log.amount);
    let name = isPartner ? log.partnerName : log.playerName;
    let strTitle = isPartner ? "代理大额提款" : "大额提款";
    let str = `${strTitle}（${log.todayLargeAmountNo}）：${withdrawalDate}--${name}--${withdrawalAmount}- ${log.emailNameExtension}`;

    return str;
}



function generateLargeWithdrawalAuditedInfoEmail (proposalData, proposalProcessStep, auditor, auditorDepartment, bSuccess) {
    let lockStatus = proposalData.isLocked && proposalData.isLocked.adminName || "未锁定";
    let status, cancelTime, decisionColor;
    if (proposalData.status == constProposalStatus.PENDING) {
        proposalData.status = bSuccess ? constProposalStatus.APPROVED : constProposalStatus.CANCEL;
    }

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
        let departmentName = auditorDepartment && auditorDepartment.departmentName || "";
        let auditorName = auditor && auditor.adminName || "";
        let auditTime = dbutility.getLocalTimeString(proposalProcessStep.operationTime, "YYYY/MM/DD HH:mm:ss");
        let memo = proposalProcessStep.memo || "";

        html += `
        <div style="margin-top: 8px;">部门：${departmentName}</div>
        <div style="margin-top: 8px;">审核人：${auditorName}</div>
        <div style="margin-top: 8px;">审核时间：${auditTime}</div>
        <div style="margin-top: 8px; color: ${decisionColor};">备注：${memo}</div>
        `;
    }

    return html;
}

var proto = dbLargeWithdrawalFunc.prototype;
proto = Object.assign(proto, dbLargeWithdrawal);

// ======== large withdrawal log input common function START ========
function getProviderInfoByTime (playerObj, startTime, endTime) {
    let gameProviderInfo = [];
    return dbconfig.collection_platform.findOne({_id: playerObj.platform})
        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean().then(
            platformData => {
                let providerObjIds = [];
                if (platformData && platformData.gameProviders && platformData.gameProviders.length) {
                    platformData.gameProviders.forEach(provider => {
                        providerObjIds.push(ObjectId(provider._id));
                        gameProviderInfo.push({
                            providerObjId: provider._id,
                            providerName: provider.name,
                            consumptionTimes: 0,
                            bonusAmount: 0,
                            validAmount: 0,
                            siteBonusRatio: 0,
                            consumptionAmountByType: {},
                            playerBonusAmountByType: {}
                        });
                    })
                }

                return dbconfig.collection_playerConsumptionRecord.aggregate([{
                    $match: {
                        providerId: {$in: providerObjIds},
                        playerId: playerObj._id,
                        createTime: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    }
                }, {
                    $group: {
                        _id: {"providerId": "$providerId", "cpGameType": "$cpGameType"},
                        times: {$sum: 1},
                        bonusAmount: {$sum: "$bonusAmount"},
                        validAmount: {$sum: "$validAmount"}
                    }
                }])
            }
        ).then(
            cpGameTypeData => {
                if (cpGameTypeData && cpGameTypeData[0] && cpGameTypeData.length) {
                    gameProviderInfo.forEach(provider => {
                        cpGameTypeData.forEach(cpGame => {
                            if (provider.providerObjId && cpGame._id && cpGame._id.providerId && String(cpGame._id.providerId) == String(provider.providerObjId)) {
                                provider.consumptionTimes += cpGame.times;
                                provider.bonusAmount += cpGame.bonusAmount;
                                provider.validAmount += cpGame.validAmount;
                                provider.consumptionAmountByType[cpGame._id.cpGameType] = cpGame.validAmount;
                                provider.playerBonusAmountByType[cpGame._id.cpGameType] = cpGame.bonusAmount;
                                provider.siteBonusRatio += (provider.bonusAmount / provider.validAmount) || 0;
                            }
                        })
                    })
                }
                return gameProviderInfo;
            }
        );
}

function getTotalWithdrawalByTime (playerObj, startTime, endTime) {
    let matchQuery = {
        'data.playerObjId': playerObj._id,
        mainType: constProposalType.PLAYER_BONUS,
        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
    }
    if (startTime && endTime) {
        matchQuery.createTime = {
            $gte: startTime,
                $lt: endTime
        }
    }
    return dbconfig.collection_proposal.aggregate([{
        $match: matchQuery
    },
        {
            $group: {
                _id: null,
                amount: {$sum: "$data.amount"}
            }
        }
    ]).read("secondaryPreferred").then(
        withdrawalData => {
            let withdrawalAmount = 0;
            if (withdrawalData && withdrawalData[0] && withdrawalData[0].amount) {
                withdrawalAmount = withdrawalData[0].amount;
            }
            return withdrawalAmount;
        }
    );
}

function getConsumptionTimesByTime (playerObj, startTime, endTime) {
    let groupObj = {
        _id: null,
        belowHundred: {$sum: {$cond: [{"$lt": ["$validAmount", 100]}, 1, 0]}},
        belowThousand: {$sum: {$cond: [{$and: [{"$gte": ["$validAmount", 100]}, {"$lt": ["$validAmount", 1000]}]}, 1, 0]}},
        belowTenThousand: {$sum: {$cond: [{$and: [{"$gte": ["$validAmount", 1000]}, {"$lt": ["$validAmount", 10000]}]}, 1, 0]}},
        belowHundredThousand: {$sum: {$cond: [{$and: [{"$gte": ["$validAmount", 10000]}, {"$lt": ["$validAmount", 100000]}]}, 1, 0]}},
        aboveHundredThousand: {$sum: {$cond: [{"$gte": ["$validAmount", 100000]}, 1, 0]}}
    };
    return dbconfig.collection_playerConsumptionRecord.aggregate([{
        $match: {
            playerId: playerObj._id,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        }
    }, {
        $group: groupObj
    }]).then(
        consumptionData => {
            let defaultData = {
                belowHundred: 0,
                belowThousand: 0,
                belowTenThousand: 0,
                belowHundredThousand: 0,
                aboveHundredThousand: 0
            };
            if (consumptionData && consumptionData[0] && consumptionData.length) {
                return consumptionData[0]
            }
            return defaultData;
        }
    );

}

function getTotalConsumptionByTime (playerObj, startTime, endTime) {
    return dbconfig.collection_playerConsumptionRecord.aggregate([{
        $match: {
            playerId: playerObj._id,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        }
    }, {
        $group: {
            _id: null,
            amount: {$sum: "$validAmount"}
        }
    }]).read("secondaryPreferred").then(
        consumptionData => {
            let consumptionAmount = 0;
            if (consumptionData && consumptionData[0] && consumptionData[0].amount) {
                consumptionAmount = consumptionData[0].amount;
            }
            return consumptionAmount;
        }
    );

}

function getTotalTopUpByTime (playerObj, startTime, endTime) {
    let matchQuery = {
        mainType: "TopUp",
        'data.playerObjId': playerObj._id,
        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]},
    }
    if (startTime && endTime) {
        matchQuery.createTime = {
            $gte: startTime,
            $lt: endTime
        }
    }

    return dbconfig.collection_proposal.aggregate([{
        $match: matchQuery
    }, {
        $group: {
            _id: null,
            amount: {$sum: "$data.amount"}
        }
    }]).read("secondaryPreferred").then(
        topUpData => {
            let topUpAmount = 0;
            if (topUpData && topUpData[0] && topUpData[0].amount) {
                topUpAmount = topUpData[0].amount;
            }
            return topUpAmount;
        }
    );
}

function getTotalRewardByTime (playerObj, startTime, endTime) {
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
                    $gte: startTime,
                    $lt: endTime
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
            }]).read("secondaryPreferred").then(
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

function getTotalXIMAByTime (playerObj, startTime, endTime) {
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
                    $gte: startTime,
                    $lt: endTime
                }
            }
            if (proposalTypeData) {
                rewardQuery.type = proposalTypeData._id
            }
            return dbconfig.collection_proposal.aggregate([{
                $match: rewardQuery
            }, {
                $group: {
                    _id: null,
                    amount: {$sum: "$data.rewardAmount"}
                }
            }]).read("secondaryPreferred").then(
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
}

function traceError(functionName, err) {
    console.log("fill up prom error:", functionName);
    return Promise.reject(err);
}
// ======== large withdrawal log input common function END ========

module.exports = dbLargeWithdrawal;