var proposalExecutorFunc = function () {
};
module.exports = new proposalExecutorFunc();

var dbconfig = require('./../modules/dbproperties');
var dbUtil = require('./../modules/dbutility');
var constRewardType = require('./../const/constRewardType');
var constProposalType = require('./../const/constProposalType');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerFeedback = require('../db_modules/dbPlayerFeedback');
var dbLogger = require("./../modules/dbLogger");
var constRewardTaskStatus = require("./../const/constRewardTaskStatus");
var constShardKeys = require("./../const/constShardKeys");
var constPlayerCreditChangeType = require("../const/constPlayerCreditChangeType");
var constProposalStatus = require("../const/constProposalStatus");
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constPromoCodeTemplateGenre = require('../const/constPromoCodeTemplateGenre');
const constRandomRewardType = require('../const/constRandomRewardType');
const constFestivalRewardType = require('../const/constFestivalRewardType');
var Q = require("q");
var mongoose = require('mongoose');
var messageDispatcher = require("./messageDispatcher.js");
var constMessageType = require("../const/constMessageType.js");
var pmsAPI = require("../externalAPI/pmsAPI.js");
var constPlayerSMSSetting = require("../const/constPlayerSMSSetting");
const serverInstance = require("./serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
var queryPhoneLocation = require('cellocate');

const rsaCrypto = require("../modules/rsaCrypto");
const RESTUtils = require("../modules/RESTUtils");

const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const constPMSClientType = require("../const/constPMSClientType");
const constPlayerTopUpType = require("../const/constPlayerTopUpType");
const constClientQnA = require("../const/constClientQnA");
var dbRewardType = require("../db_modules/dbRewardType.js");
var dbRewardEvent = require("../db_modules/dbRewardEvent.js");
var dbRewardLog = require("../db_modules/dbRewardLog.js");
var dbPlayerReward = require("../db_modules/dbPlayerReward")
var errorUtils = require('./errorUtils');
var dbPartner = require("../db_modules/dbPartner");
var dbProposal = require("../db_modules/dbProposal");
var dbPlatform = require("../db_modules/dbPlatform");
var constProposalEntryType = require("../const/constProposalEntryType");
var constProposalUserType = require("../const/constProposalUserType");
const constFinancialPointsType = require("../const/constFinancialPointsType");
var SMSSender = require('./SMSSender');
//Reward Points
const constRewardPointsLogCategory = require("../const/constRewardPointsLogCategory");
const constRewardPointsLogStatus = require("../const/constRewardPointsLogStatus");
const dbEmailNotification = require("../db_modules/dbEmailNotification");
let dbRewardPoints = require("../db_modules/dbRewardPoints.js");
let dbPlayerRewardPoints = require("../db_modules/dbPlayerRewardPoints.js");
let dbRewardPointsLog = require("../db_modules/dbRewardPointsLog.js");
let dbRewardTaskGroup = require("../db_modules/dbRewardTaskGroup");
let dbOperation = require("../db_common/dbOperations");
const dbTeleSales = require("../db_modules/dbTeleSales");
let dbPlayerCredibility = require('../db_modules/dbPlayerCredibility');

let dbConsumptionReturnWithdraw = require("../db_modules/dbConsumptionReturnWithdraw");
const constManualTopupOperationType = require("../const/constManualTopupOperationType");
var cpmsAPI = require("../externalAPI/cpmsAPI");

const moment = require('moment-timezone');
const ObjectId = mongoose.Types.ObjectId;
const dbPlayerUtil = require("../db_common/dbPlayerUtility");
const dbLargeWithdrawal = require("../db_modules/dbLargeWithdrawal");
const dbPartnerCommissionConfig = require("../db_modules/dbPartnerCommissionConfig");
const dbPropUtil = require("../db_common/dbProposalUtility");

const extConfig = require('../config/externalPayment/paymentSystems');
const rp = require('request-promise');

/**
 * Proposal executor
 ***/
var proposalExecutor = {

    /**
     * get all execution types
     */
    getAllExecutionTypes: function () {
        var types = {};
        for (var key in proposalExecutor.executions) {
            types[key] = proposalExecutor.executions[key].des;
        }
        return types;
    },

    /**
     * get all rejection types
     */
    getAllRejectionTypes: function () {
        var types = {};
        for (var key in proposalExecutor.rejections) {
            types[key] = proposalExecutor.rejections[key].des;
        }
        return types;
    },

    approveOrRejectProposal: function (executionType, rejectionType, bApprove, proposalData, rejectIfMissing) {
        const isNewFunc =
            executionType === 'executeFixPlayerCreditTransfer'
            || executionType === 'executeUpdatePlayerCredit'
            || executionType === 'executePlayerConsumptionReturn'
            || executionType === 'executeManualExportTsPhone'

            // Top up
            || executionType === 'executePlayerTopUp'
            || executionType === 'executePlayerAlipayTopUp'
            || executionType === 'executePlayerQuickpayTopUp'
            || executionType === 'executePlayerWechatTopUp'
            || executionType === 'executeManualPlayerTopUp'
            || executionType === 'executePlayerFKPTopUp'
            // || executionType === 'executePlayerCommonTopUp'
            || executionType === 'executePlayerAssignTopUp'

            // Group reward
            || executionType === 'executePlayerLoseReturnRewardGroup'
            || executionType === 'executePlayerRetentionRewardGroup'
            || executionType === 'executePlayerBonusDoubledRewardGroup'
            || executionType === 'executeBaccaratRewardGroup'
            || executionType === 'executePlayerRandomRewardGroup'
            || executionType === 'executePlayerFestivalRewardGroup'

            // Auction reward
            || executionType === 'executeAuctionPromoCode'
            || executionType === 'executeAuctionOpenPromoCode'
            || executionType === 'executeAuctionRewardPromotion'
            || executionType === 'executeAuctionRealPrize'
            || executionType === 'executePlayerAuctionPromotionReward'
            || executionType === 'executeAuctionRewardPointChange'

        if (isNewFunc) {
            return proposalExecutor.approveOrRejectProposal2(executionType, rejectionType, bApprove, proposalData, rejectIfMissing);
        } else {
            "use strict";
            if (bApprove) {
                if (proposalExecutor.executions[executionType]) {
                    const deferred = Q.defer();
                    proposalExecutor.executions[executionType](proposalData, deferred);
                    return deferred.promise.then(
                        responseData => {
                            return dbconfig.collection_proposal.findOneAndUpdate({
                                _id: proposalData._id,
                                createTime: proposalData.createTime
                            }, {
                                settleTime: new Date()
                            }).then(
                                res => {
                                    if (proposalData.mainType === 'Reward' && executionType != "executeManualUnlockPlayerReward") {
                                        return createRewardLogForProposal("GET_FROM_PROPOSAL", proposalData).then(
                                            () => responseData
                                        );
                                    } else {
                                        return responseData;
                                    }
                                }
                            );
                        }
                    );
                }
                else {
                    return rejectIfMissing ? Q.reject({name: "DBError", message: "Incorrect execution type"}) : Q.resolve();
                }
            }
            else {
                if (proposalExecutor.rejections[rejectionType]) {
                    const deferred = Q.defer();
                    proposalExecutor.rejections[rejectionType](proposalData, deferred);
                    return deferred.promise;
                }
                else {
                    return rejectIfMissing ? Q.reject({name: "DBError", message: "Incorrect execution type"}) : Q.resolve();
                }
            }
        }
    },

    /**
     * Try fix approval executed halfway issue
     * @param executionType
     * @param rejectionType
     * @param bApprove
     * @param proposalData
     * @param rejectIfMissing
     * @returns {*}
     */
    approveOrRejectProposal2: (executionType, rejectionType, bApprove, proposalData, rejectIfMissing) => {
        "use strict";
        if (bApprove) {
            if (proposalExecutor.executions[executionType]) {
                return proposalExecutor.executions[executionType](proposalData).then(
                    responseData => {
                        return dbconfig.collection_proposal.findOneAndUpdate({
                            _id: proposalData._id,
                            createTime: proposalData.createTime
                        }, {
                            settleTime: new Date()
                        }).then(
                            res => {
                                if (proposalData.mainType === 'Reward' && executionType !== "executeManualUnlockPlayerReward") {
                                    return createRewardLogForProposal("GET_FROM_PROPOSAL", proposalData).then(
                                        () => responseData
                                    );
                                } else {
                                    return responseData;
                                }
                            }
                        );
                    }
                );
            }
            else {
                return rejectIfMissing ? Q.reject({name: "DBError", message: "Incorrect execution type"}) : Q.resolve();
            }
        }
        else {
            if (proposalExecutor.rejections[rejectionType]) {
                const deferred = Q.defer();
                proposalExecutor.rejections[rejectionType](proposalData, deferred);
                return deferred.promise;
            }
            else {
                return rejectIfMissing ? Q.reject({name: "DBError", message: "Incorrect execution type"}) : Q.resolve();
            }
        }
    },

    sendMessageToPlayer: sendMessageToPlayer,

        init: function () {
            this.executions.executeUpdatePlayerInfo.des = "Update player information";
            this.executions.executeUpdatePlayerInfoPartner.des = "Update player partner";
            this.executions.executeUpdatePlayerInfoLevel.des = "Update player level";
            this.executions.executeUpdatePlayerInfoAccAdmin.des = "Update player acc admin";
            this.executions.executeUpdatePlayerCredit.des = "Update player credit";
            this.executions.executeFixPlayerCreditTransfer.des = "Fix player credit transfer";
            this.executions.executePlayerConsumptionReturnFix.des = "Update player credit for consumption return";
            this.executions.executeUpdatePlayerEmail.des = "Update player email";
            this.executions.executeUpdatePlayerQQ.des = "Update player QQ";
            this.executions.executeUpdatePlayerWeChat.des = "Update player WeChat";
            this.executions.executeUpdatePlayerPhone.des = "Update player phone number";
            this.executions.executeUpdatePlayerBankInfo.des = "Update player bank information";
            this.executions.executeAddPlayerRewardTask.des = "Add player reward task";
            this.executions.executeUpdatePartnerBankInfo.des = "Update partner bank information";
            this.executions.executeUpdatePartnerCredit.des = "Update partner credit";
            this.executions.executeUpdatePartnerEmail.des = "Update partner email";
            this.executions.executeUpdatePartnerQQ.des = "Update partner QQ";
            this.executions.executeUpdatePartnerWeChat.des = "Update partner WeChat";
            this.executions.executeUpdatePartnerPhone.des = "Update partner phone number";
            this.executions.executeUpdatePartnerInfo.des = "Update partner information";
            this.executions.executeUpdatePartnerCommissionType.des = "Update partner commission type";
            this.executions.executeUpdateChildPartner.des = "Update child partner",
            this.executions.executePlayerTopUp.des = "Help player top up";
            this.executions.executeFullAttendance.des = "Player full attendance reward";
            this.executions.executeGameProviderReward.des = "Player top up for Game Provider reward";
            this.executions.executeFirstTopUp.des = "Player first top up";
            this.executions.executePlatformTransactionReward.des = "Platform Transaction Reward";
            this.executions.executePartnerReferralReward.des = "Partner Referral Reward";
            this.executions.executePartnerIncentiveReward.des = "Partner Incentive Reward";
            this.executions.executePartnerConsumptionReturn.des = "Partner consumption return Reward";
            this.executions.executePlayerConsumptionReturn.des = "Player consumption return Reward";
            this.executions.executeManualPlayerTopUp.des = "Player manual top up";
            this.executions.executePlayerAlipayTopUp.des = "Player manual top up";
            this.executions.executePlayerAssignTopUp.des = "Player assign top up";
            this.executions.executePlayerBonus.des = "Player bonus";
            this.executions.executePlayerTopUpReturn.des = "Player top up return";
            this.executions.executePlayerConsumptionIncentive.des = "Player consumption incentive";
            this.executions.executePlayerLevelUp.des = "Player Level Up";
            this.executions.executePlayerLevelMaintain.des = "Player Level Maintain";
            this.executions.executePartnerTopUpReturn.des = "Partner Top Up Return";
            this.executions.executePlayerTopUpReward.des = "Player Top Up Reward";
            this.executions.executePlayerReferralReward.des = "Player Referral Reward";
            this.executions.executePartnerBonus.des = "Partner bonus";
            this.executions.executePlayerRegistrationReward.des = "Player Registration Reward";
            this.executions.executeManualUnlockPlayerReward.des = "Manual Unlock Player Reward";
            this.executions.executePartnerCommission.des = "Partner commission";
            this.executions.executePlayerDoubleTopUpReward.des = "Player double top up reward";
            this.executions.executePlayerWechatTopUp.des = "Player wechat top up";
            this.executions.executePlayerConsecutiveLoginReward.des = "Player Consecutive Login Reward";
            this.executions.executePlayerRegistrationIntention.des = "Player Registration Intention";
            this.executions.executePlayerEasterEggReward.des = "Player Easter Egg Reward";
            this.executions.executePlayerQuickpayTopUp.des = "Player Quickpay Top Up";
            this.executions.executePlayerTopUpPromo.des = "Player Top Up Promo";
            this.executions.executePlayerConsecutiveConsumptionReward.des = "Player Consecutive Consumption Reward";
            this.executions.executePlayerLevelMigration.des = "Player Level Migration";
            this.executions.executePlayerPacketRainReward.des = "Player Packet Rain Reward";
            this.executions.executePlayerPromoCodeReward.des = "Player Promo Code Reward";
            this.executions.executeDxReward.des = "Player Promo Code Reward";
            this.executions.executePlayerLimitedOfferReward.des = "Player Limited Offer Reward";
            this.executions.executePlayerTopUpReturnGroup.des = "Player Top Up Return Group Reward";
            this.executions.executePlayerRandomRewardGroup.des = "Player Random Reward Group Reward";
            this.executions.executePlayerConsecutiveRewardGroup.des = "Player Consecutive Group Reward";
            this.executions.executePlayerLoseReturnRewardGroup.des = "Player Lose Return Group Reward";
            this.executions.executePlayerConsumptionRewardGroup.des = "Player Consumption Group Reward";
            this.executions.executePlayerFreeTrialRewardGroup.des = "Player Free Trial Reward Group";
            this.executions.executePlayerAddRewardPoints.des = "Player Add Reward Points";
            this.executions.executePlayerMinusRewardPoints.des = "Player Minus Reward Points";
            this.executions.executePlayerConvertRewardPoints.des = "Player Convert Reward Points";
            this.executions.executePlayerAutoConvertRewardPoints.des = "Player Auto Convert Reward Points";
            this.executions.executeCustomizePartnerCommRate.des = "Customize Partner Commmission Rate";
            this.executions.executeSettlePartnerCommission.des = "Settle Partner Commission";
            this.executions.executeUpdateParentPartnerCommission.des = "Update Parent Partner Commission";
            this.executions.executePartnerCreditTransferToDownline.des = "Partner Credit Transfer To Downline";
            this.executions.executeBulkExportPlayerData.des = "Bulk Export Player Data";
            this.executions.executeFinancialPointsAdd.des = "Add Platform Financial Points";
            this.executions.executeFinancialPointsDeduct.des = "Deduct Platform Financial Points";
            this.executions.executeUpdatePlayerRealName.des = "Update player real name";
            this.executions.executeUpdatePartnerRealName.des = "Update partner real name";
            this.executions.executePlayerConsumptionSlipRewardGroup.des = "Player Consumption Slip Reward";
            this.executions.executePlayerRetentionRewardGroup.des = "Player Retention Reward";
            this.executions.executePlayerBonusDoubledRewardGroup.des = "Player Bonus Doubled Reward";
            this.executions.executePlayerFKPTopUp.des = "Player Fukuaipay Top Up";
            // this.executions.executePlayerCommonTopUp.des = "Player Common PMS Top Up";
            this.executions.executeManualExportTsPhone.des = "Export Telesales Phone Across Platform";
            this.executions.executeBaccaratRewardGroup.des = "Player Baccarat Reward";
            this.executions.executeAuctionPromoCode.des = "Auction Promo Code";
            this.executions.executeAuctionOpenPromoCode.des = "Auction Open Promo Code";
            this.executions.executeAuctionRewardPromotion.des = "Auction Reward Promotion";
            this.executions.executePlayerAuctionPromotionReward.des = "player Auction Reward Promotion";
            this.executions.executeAuctionRealPrize.des = "Auction Real Prize";
            this.executions.executeAuctionRewardPointChange.des = "Auction Reward Point Change";
            this.executions.executePlayerFestivalRewardGroup.des = 'Player Festival Reward';
            this.executions.executeReferralRewardGroup.des = "Referral Reward Group Reward";

            this.rejections.rejectProposal.des = "Reject proposal";
            this.rejections.rejectUpdatePlayerInfo.des = "Reject player top up proposal";
            this.rejections.rejectUpdatePlayerInfoPartner.des = "Reject player partner";
            this.rejections.rejectUpdatePlayerInfoLevel.des = "Reject player level";
            this.rejections.rejectUpdatePlayerInfoAccAdmin.des = "Reject player acc admin";
            this.rejections.rejectUpdatePlayerCredit.des = "Reject player update credit proposal";
            this.rejections.rejectFixPlayerCreditTransfer.des = "Reject fix player credit transfer proposal";
            this.rejections.rejectPlayerConsumptionReturnFix.des = "Reject update player credit for consumption return";
            this.rejections.rejectUpdatePlayerEmail.des = "Reject player update email proposal";
            this.rejections.rejectUpdatePlayerQQ.des = "Reject player update QQ proposal";
            this.rejections.rejectUpdatePlayerWeChat.des = "Reject player update WeChat proposal";
            this.rejections.rejectUpdatePlayerPhone.des = "Reject player update phone number proposal";
            this.rejections.rejectUpdatePlayerBankInfo.des = "Reject player update bank information";
            this.rejections.rejectAddPlayerRewardTask.des = "Reject add player reward task";
            this.rejections.rejectUpdatePartnerBankInfo.des = "Reject partner update bank information";
            this.rejections.rejectUpdatePartnerPhone.des = "Reject partner update phone number";
            this.rejections.rejectUpdatePartnerEmail.des = "Reject partner update email";
            this.rejections.rejectUpdatePartnerWeChat.des = "Reject partner update weChat";
            this.rejections.rejectUpdatePartnerInfo.des = "Reject partner update information";
            this.rejections.rejectUpdatePartnerCommissionType.des = "Reject partner update commission type";
            this.rejections.rejectUpdateChildPartner.des = "Reject update child partner";
            this.rejections.rejectFullAttendance.des = "Reject player full attendance reward";
            this.rejections.rejectGameProviderReward.des = "Reject player for Game Provider Reward";
            this.rejections.rejectFirstTopUp.des = "Reject First Top up reward";
            this.rejections.rejectPlatformTransactionReward.des = "Reject Transaction Reward";
            this.rejections.rejectPartnerReferralReward.des = "Partner Referral Reward";
            this.rejections.rejectPartnerConsumptionReturn.des = "Reject Partner consumption return Reward";
            this.rejections.rejectPlayerConsumptionReturn.des = "Reject Player consumption return Reward";
            this.rejections.rejectPlayerTopUp.des = "Reject Player Top up";
            this.rejections.rejectPlayerAlipayTopUp.des = "Reject Player Top up";
            this.rejections.rejectManualPlayerTopUp.des = "Reject Player Manual Top up";
            this.rejections.rejectPlayerAssignTopUp.des = "Reject Player Assign Manual Top up";
            this.rejections.rejectPlayerBonus.des = "Reject Player bonus";
            this.rejections.rejectPlayerTopUpReturn.des = "Reject Player top up return";
            this.rejections.rejectPlayerConsumptionIncentive.des = "Reject Player consumption incentive";
            this.rejections.rejectPlayerLevelUp.des = "Reject Player Level Up";
            this.rejections.rejectPlayerLevelMaintain.des = "Reject Player Level Maintain";
            this.rejections.rejectPartnerTopUpReturn.des = "Reject Partner Top Up Return";
            this.rejections.rejectPlayerTopUpReward.des = "Reject Player Top Up Reward";
            this.rejections.rejectPlayerReferralReward.des = "Reject Player Referral Reward";
            this.rejections.rejectPartnerBonus.des = "Reject Partner bonus";
            this.rejections.rejectPlayerRegistrationReward.des = "Reject Player Registration Reward";
            this.rejections.rejectManualUnlockPlayerReward.des = "Reject Manual Unlock Player Reward";
            this.rejections.rejectPartnerCommission.des = "Reject Partner commission";
            this.rejections.rejectPlayerDoubleTopUpReward.des = "Reject Player double top up return";
            this.rejections.rejectPlayerWechatTopUp.des = "Reject Player Top up";
            this.rejections.rejectPlayerConsecutiveLoginReward.des = "Reject Player Consecutive Login Reward";
            this.rejections.rejectPlayerRegistrationIntention.des = "Reject Player Registration Intention";
            this.rejections.rejectPlayerEasterEggReward.des = "Reject Player Easter Egg Reward";
            this.rejections.rejectPlayerTopUpPromo.des = "Reject Player Top Up Promo";
            this.rejections.rejectPlayerConsecutiveConsumptionReward.des = "Reject Player Consecutive Consumption Reward";
            this.rejections.rejectPlayerLevelMigration.des = "Reject Player Level Migration";
            this.rejections.rejectPlayerPacketRainReward.des = "Reject Player Packet Rain Reward";
            this.rejections.rejectPlayerPromoCodeReward.des = "Reject Player Promo Code Reward";
            this.rejections.rejectDxReward.des = "Reject Player Promo Code Reward";
            this.rejections.rejectPlayerLimitedOfferReward.des = "Reject Player Limited Offer Reward";
            this.rejections.rejectPlayerTopUpReturnGroup.des = "Reject Player Top Up Return Group Reward";
            this.rejections.rejectReferralRewardGroup.des = "Reject Referral Reward Group Reward";
            this.rejections.rejectPlayerRandomRewardGroup.des = "Reject Player Random Reward Group Reward";
            this.rejections.rejectPlayerConsecutiveRewardGroup.des = "Reject Player Consecutive Group Reward";
            this.rejections.rejectPlayerLoseReturnRewardGroup.des = "Reject Player Lose Return Group Reward";
            this.rejections.rejectPlayerConsumptionRewardGroup.des = "Reject Player Consumption Group Reward";
            this.rejections.rejectPlayerFreeTrialRewardGroup.des = "Reject Player Free Trial Reward Group";
            this.rejections.rejectPlayerAddRewardPoints.des = "Reject Player Add Reward Points";
            this.rejections.rejectPlayerMinusRewardPoints.des = "Reject Player Minus Reward Points";
            this.rejections.rejectPlayerConvertRewardPoints.des = "Reject Player Convert Reward Points";
            this.rejections.rejectPlayerAutoConvertRewardPoints.des = "Reject Player Auto Convert Reward Points";
            this.rejections.rejectCustomizePartnerCommRate.des = "Reject Customize Partner Commmission Rate";
            this.rejections.rejectSettlePartnerCommission.des = "Reject Settle Partner Commission";
            this.rejections.rejectUpdateParentPartnerCommission.des = "Reject Update Parent Partner Commission";
            this.rejections.rejectPartnerCreditTransferToDownline.des = "Reject Partner Credit Transfer To Downline";
            this.rejections.rejectBulkExportPlayerData.des = "Reject Bulk Export Player Data";
            this.rejections.rejectFinancialPointsAdd.des = "Reject Add Platform Financial Points";
            this.rejections.rejectFinancialPointsDeduct.des = " Reject Deduct Platform Financial Points";
            this.rejections.rejectUpdatePlayerRealName.des = "Reject player update real name proposal";
            this.rejections.rejectUpdatePartnerRealName.des = "Reject partner update real name proposal";
            this.rejections.rejectPlayerConsumptionSlipRewardGroup.des = "reject Player Consumption Slip Reward";
            this.rejections.rejectPlayerRetentionRewardGroup.des = "reject Player Retention Reward";
            this.rejections.rejectPlayerBonusDoubledRewardGroup.des = "reject Player Bonus Doubled Reward";
            this.rejections.rejectPlayerFKPTopUp.des = "reject Player Fukuaipay Top Up";
            // this.rejections.rejectPlayerCommonTopUp.des = "reject Player Common PMS Top Up";
            this.rejections.rejectManualExportTsPhone.des = "reject Export Telesales Phone Across Platform";
            this.rejections.rejectBaccaratRewardGroup.des = "reject Player Baccarat Reward";
            this.rejections.rejectAuctionPromoCode.des = "Reject Auction Promo Code";
            this.rejections.rejectAuctionOpenPromoCode.des = "Reject Auction Open Promo Code";
            this.rejections.rejectAuctionRewardPromotion.des = "Reject Auction Reward Promotion";
            this.rejections.rejectePlayerAuctionPromotionReward.des = "Reject Player Auction Reward Promotion";
            this.rejections.rejectAuctionRealPrize.des = "Reject Auction Real Prize";
            this.rejections.rejectAuctionRewardPointChange.des = "Reject Auction Reward Point Change";
            this.rejections.rejectPlayerFestivalRewardGroup.des = "Reject Player Festival";
        },

        refundPlayer: function (proposalData, refundAmount, reason) {
            return Q.resolve().then(
                () => {
                    if (!proposalData || !proposalData.data) {
                        return Q.reject({name: "DataError", message: "Invalid proposal data"});
                    }
                    // It is safe to throw inside a .then().  It is equivalent to returning a rejection, just a lazy way.
                    // Rejecting with Errors give us the benefit of a stack trace.
                    const playerObjId = proposalData.data.playerObjId || proposalData.data.playerId;
                    if (!playerObjId) {
                        throw Error("No playerObjId, needed for refund");
                    }
                    // (At the time of writing, proposalData.data.platformObjId was never actually used)
                    const platformObjId = proposalData.data.platformObjId || proposalData.data.platformId;
                    if (!platformObjId) {
                        throw Error("No platformObjId, needed for refund");
                    }

                    proposalData.data.proposalId = proposalData.proposalId;

                    return dbPlayerInfo.refundPlayerCredit(playerObjId, platformObjId, refundAmount, reason, proposalData.data)
                }
            );
        },

        refundPlayerApplyAmountIfNeeded: function (proposalData, reason) {
            return Q.resolve().then(
                () => {
                    if (proposalData && proposalData.data && proposalData.data.applyAmount && (proposalData.data.useLockedCredit || proposalData.data.isGroupReward)) {
                        // We should give a refund
                        return proposalExecutor.refundPlayer(proposalData, proposalData.data.applyAmount, reason);
                    }
                }
            ).then(
                () => "Proposal is rejected"
            );
        },

        cleanUsedTopUpRecords: function (proposalData) {
            return Q.resolve().then(
                () => {
                    var usedRecords = [];
                    if (proposalData && proposalData.data) {
                        if (proposalData.data.topUpRecordIds) {
                            if (proposalData.data.topUpRecordIds.constructor === Array) {
                                usedRecords = proposalData.data.topUpRecordIds;
                            } else {
                                usedRecords.push(proposalData.data.topUpRecordIds);
                            }
                        }
                        if (proposalData.data.topUpRecordId) {
                            usedRecords.push(proposalData.data.topUpRecordId);
                        }
                    }
                    if (usedRecords.length > 0) {
                        var proms = usedRecords.map(
                            recordObjId => dbUtil.findOneAndUpdateForShard(
                                dbconfig.collection_playerTopUpRecord,
                                {_id: recordObjId},
                                {bDirty: false, $pull: {usedEvent: ObjectId(proposalData.data.eventId)}},
                                constShardKeys.collection_playerTopUpRecord
                            )
                        );
                        return Q.all(proms);
                    }
                }
            ).then(
                () => "Proposal is rejected"
            );
        },

        refundPartner: function (proposalData, refundAmount, reason) {
            return Q.resolve().then(
                () => {
                    if (!proposalData || !proposalData.data) {
                        return Q.reject({name: "DataError", message: "Invalid proposal data"});
                    }
                    // It is safe to throw inside a .then().  It is equivalent to returning a rejection, just a lazy way.
                    // Rejecting with Errors give us the benefit of a stack trace.
                    const partnerObjId = proposalData.data.partnerObjId || proposalData.data.partnerId;
                    if (!partnerObjId) {
                        throw Error("No partnerObjId, needed for refund");
                    }
                    // (At the time of writing, proposalData.data.platformObjId was never actually used)
                    const platformObjId = proposalData.data.platformObjId || proposalData.data.platformId;
                    if (!platformObjId) {
                        throw Error("No platformObjId, needed for refund");
                    }

                    return dbPartner.refundPartnerCredit(partnerObjId, platformObjId, refundAmount, reason, proposalData.data)
                }
            );
        },

        /**
         * execution functions
         * MARK:: all function name must follow the same naming convention
         * Example:: execute + <proposal type name>
         */
        executions: {
            /**
             * TODO:: Might need to check which rewardTask is used
             * execution function for update player credit proposal type
             */
            executeUpdatePlayerCredit: function (proposalData, bTransfer) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateAmount != null) {
                    //changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.updateAmount, constProposalType.UPDATE_PLAYER_CREDIT, proposalData.data).then(deferred.resolve, deferred.reject);
                    //check player reward task
                    let updateObj = {
                        $inc: {
                            validCredit: proposalData.data.updateAmount > 0 ? proposalData.data.updateAmount : 0
                        }
                    };

                    return dbconfig.collection_players.findOneAndUpdate(
                        {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                        updateObj,
                        {new: true}
                    ).then(
                        newPlayer => {
                            //make sure credit can not be negative number
                            if (newPlayer.validCredit < 0 || newPlayer.validCredit < Number.EPSILON) {
                                newPlayer.validCredit = 0;
                                return newPlayer.save();
                            }

                            return newPlayer;
                        }
                    ).then(
                        player => {
                            if (!player) {
                                return Promise.reject({
                                    name: "DataError",
                                    message: "Can't update player credit: player not found."
                                });
                            }
                            //mark credit transfer log as used
                            if (proposalData.data.transferId) {
                                dbUtil.findOneAndUpdateForShard(
                                    dbconfig.collection_playerCreditTransferLog,
                                    {transferId: proposalData.data.transferId},
                                    {bUsed: true},
                                    constShardKeys.collection_playerCreditTransferLog
                                ).then().catch(console.error);
                            }
                            let changeType = bTransfer ? constProposalType.FIX_PLAYER_CREDIT_TRANSFER : constProposalType.UPDATE_PLAYER_CREDIT;

                            proposalData.data.proposalId = proposalData.proposalId;

                            if (proposalData.data.updateAmount > 0) {
                                dbLogger.createCreditChangeLogWithLockedCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.updateAmount,
                                    changeType, player.validCredit, player.lockedAmount, proposalData.data.changedLockedAmount, null, proposalData.data);
                            }

                            return player;
                        },
                        error => {
                            return Promise.reject({name: "DBError", message: "Error updating player.", error: error});
                        }
                    );
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for fix player credit transfer
             */
            executeFixPlayerCreditTransfer: function (proposalData) {
                return isTransferIdRepaired(proposalData.data.transferId).then(
                    isRepaired => {
                        if (!isRepaired) {
                            setTransferIdAsRepaired(proposalData.data.transferId).catch(errorUtils.reportError);

                            return dbconfig.collection_platform.findOne({_id: proposalData.data.platformId}).lean();
                        }
                        else {
                            return Promise.reject({name: "DataError", message: "This transfer has been repaired."});
                        }
                    },
                    err => {
                        return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error(err)});
                    }
                ).then(
                    platform => {
                        if (platform) {
                            if (platform.useProviderGroup) {
                                proposalData.data.proposalId = proposalData.proposalId;
                                return fixTransferCreditWithProposalGroup(proposalData.data.transferId, proposalData.data.updateAmount, proposalData.data);
                            }
                            else {
                                proposalExecutor.executions.executeUpdatePlayerCredit(proposalData, true);
                            }
                        }
                    }
                );
            },

            /**
             * execution function for player consumption return fix
             */
            executePlayerConsumptionReturnFix: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateAmount > 0) {
                    changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.updateAmount, constProposalType.PLAYER_CONSUMPTION_RETURN_FIX, proposalData.data).then(
                        res => {
                            SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, constMessageType.PLAYER_CONSUMPTION_RETURN_SUCCESS);
                        }
                    ).then(deferred.resolve, deferred.reject);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data"});
                }
            },

            /**
             * execution function for update player email proposal type
             */
            executeUpdatePlayerEmail: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateData && proposalData.data.updateData.email) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data.playerObjId},
                        proposalData.data.updateData,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player email", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player email proposal data"});
                }
            },

            /**
             * execution function for update player qq proposal type
             */
            executeUpdatePlayerQQ: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateData && proposalData.data.updateData.qq) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data.playerObjId},
                        proposalData.data.updateData,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player QQ", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player QQ proposal data"});
                }
            },

            /**
             * execution function for update player weChat proposal type
             */
            executeUpdatePlayerWeChat: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateData && proposalData.data.updateData.wechat) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data.playerObjId},
                        proposalData.data.updateData,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player weChat", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player weChat proposal data"});
                }
            },

            /**
             * execution function for update player partner proposal type
             */
            executeUpdatePlayerInfoPartner: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data._id) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data._id},
                        proposalData.data,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            if (data && proposalData.data.platformId && proposalData.data.partner && proposalData.data._id) {
                                let platformObjId = proposalData.data.platformId._id || proposalData.data.platformId;
                                checkIsPlayerBindToPartner(proposalData.data._id, platformObjId);
                            }
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player partner", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player partner proposal data"});
                }
            },

            /**
             * execution function for update player level proposal type
             */
            executeUpdatePlayerInfoLevel: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data._id) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data._id},
                        proposalData.data,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player level", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player level proposal data"});
                }
            },

            /**
             * execution function for update player acc admin proposal type
             */
            executeUpdatePlayerInfoAccAdmin: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data._id) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data._id},
                        proposalData.data,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player acc admin", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player acc admin proposal data"});
                }
            },

            /**
             * execution function for update player phone number proposal type
             */
            executeUpdatePlayerPhone: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateData && proposalData.data.updateData.phoneNumber) {
                    var queryRes = queryPhoneLocation(proposalData.data.updateData.phoneNumber);
                    if (queryRes) {
                        proposalData.data.updateData.phoneProvince = queryRes.province;
                        proposalData.data.updateData.phoneCity = queryRes.city;
                        proposalData.data.updateData.phoneType = queryRes.sp;
                    }
                    // for send message to player before encrypt phone number
                    let phoneNumberLast4Digit = proposalData.data.updateData.phoneNumber.substr(proposalData.data.updateData.phoneNumber.length - 4);
                    proposalData.data.updateData.phoneNumber = rsaCrypto.encrypt(proposalData.data.updateData.phoneNumber);
                    // when the update is success, reset previous error count at Q&A page, let then able to do run though the Q&A again.
                    proposalData.data.updateData.qnaWrongCount = {updatePhoneNumber : 0};
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {_id: proposalData.data.playerObjId},
                        proposalData.data.updateData,
                        constShardKeys.collection_players
                    ).then(
                        function (data) {
                            // reference constMessageTypeParam
                            // take last 4 phonenumber send message to player
                            proposalData.data.phoneNumber = phoneNumberLast4Digit;
                            sendMessageToPlayer (proposalData,constMessageType.UPDATE_PHONE_INFO_SUCCESS,{});
                            if (proposalData.data.playerObjId && proposalData.data.platformId && proposalData.data.updateData.phoneNumber) {
                                let platformObjId = proposalData.data.platformId._id || proposalData.data.platformId;
                                let playerObjId = proposalData.data.playerObjId._id || proposalData.data.playerObjId;
                                checkSimilarPhoneForPlayers(playerObjId, platformObjId, proposalData.data.updateData.phoneNumber);
                            }
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({
                                name: "DataError",
                                message: "Failed to update player phone number",
                                error: err
                            });
                        }
                    );

                    createPhoneNumberBindingRecord({
                        platform: proposalData.data.platformId,
                        _id: proposalData.data.playerObjId,
                        phoneNumber: rsaCrypto.legacyEncrypt(proposalData.data.updateData.phoneNumber)
                    });
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player phone number proposal data"});
                }

                function createPhoneNumberBindingRecord (playerData) {
                    return dbconfig.collection_phoneNumberBindingRecord({
                        platformObjId: playerData.platform,
                        playerObjId: playerData._id,
                        phoneNumber: playerData.phoneNumber
                    }).save();
                }
            },

            /**
             * execution function for update player info proposal type
             */
            executeUpdatePlayerInfo: function (proposalData, deferred) {
                //valid data
                let playerObj;
                if (proposalData && proposalData.data && proposalData.data._id) {
                    var curPartnerId = null;
                    dbconfig.collection_players.findOne({_id: proposalData.data._id}).then(
                        function (data) {
                            if (data) {
                                playerObj = data;
                                curPartnerId = data.partner;
                                var proms = [];
                                if (proposalData.data.hasOwnProperty("partner") && !proposalData.data.partner) {
                                    proposalData.data.partner = null;
                                }

                                var playerUpdate = Object.assign({}, proposalData.data);
                                delete playerUpdate.platformId;
                                delete playerUpdate.playerId;
                                delete playerUpdate._id;
                                delete playerUpdate.name;
                                if(playerUpdate.updateGamePassword || playerUpdate.updatePassword)
                                    delete playerUpdate.remark;

                                if(playerUpdate.updatePassword) {
                                    playerUpdate["qnaWrongCount.forgotPassword"] = 0;
                                    playerUpdate["hasPassword"] = true;
                                }

                                proms.push(
                                    dbconfig.collection_players.findOneAndUpdate(
                                        {_id: data._id, platform: data.platform},
                                        playerUpdate
                                    )
                                );

                                if (proposalData.data.hasOwnProperty("partner") && String(proposalData.data.partner) != String(curPartnerId)) {
                                    if (curPartnerId) {
                                        proms.push(
                                            dbconfig.collection_partner.findOneAndUpdate(
                                                {_id: curPartnerId, platform: data.platform},
                                                {$inc: {totalReferrals: -1}}
                                            )
                                        );
                                    }
                                    if (proposalData.data.partner) {
                                        proms.push(
                                            dbconfig.collection_partner.findOneAndUpdate(
                                                {_id: proposalData.data.partner, platform: data.platform},
                                                {$inc: {totalReferrals: 1}}
                                            )
                                        );
                                    }
                                }

                                if (playerUpdate && playerUpdate.hasOwnProperty('referral')) {
                                    let referralProm = dbconfig.collection_platformReferralConfig.findOne({platform: data.platform}).then(
                                        config => {
                                            if (config && config.enableUseReferralPlayerId && (config.enableUseReferralPlayerId.toString() === 'true')) {
                                                if (playerUpdate.referral) {

                                                    return dbconfig.collection_referralLog.findOne({playerObjId: data._id, platform: data.platform, isValid: true}).then(
                                                        referralLogData => {
                                                            let updateProm = Promise.resolve(true);
                                                            if (referralLogData) {
                                                                updateProm = dbconfig.collection_referralLog.findOneAndUpdate(
                                                                    {
                                                                        platform: data.platform,
                                                                        playerObjId: data._id,
                                                                        isValid: true
                                                                    },
                                                                    {
                                                                        isValid: false,
                                                                        validEndTime: new Date()
                                                                    });
                                                            }

                                                            return updateProm.then(() => {
                                                                let bindReferralTime =  new Date();

                                                                let referralLog = {
                                                                    referral: playerUpdate.referral,
                                                                    playerObjId: data._id,
                                                                    platform: data.platform,
                                                                    createTime: new Date(bindReferralTime),
                                                                    referralPeriod: config.referralPeriod || '5'
                                                                };

                                                                if (config.referralPeriod) {
                                                                    let referralIntervalTime = dbUtil.getReferralConfigIntervalTime(config.referralPeriod, new Date(bindReferralTime));

                                                                    if (referralIntervalTime) {
                                                                        referralLog.validEndTime = referralIntervalTime.endTime;
                                                                    }
                                                                }

                                                                return new dbconfig.collection_referralLog(referralLog).save();
                                                            })
                                                        }
                                                    )


                                                } else {
                                                    return dbconfig.collection_referralLog.findOneAndUpdate(
                                                        {
                                                            platform: data.platform,
                                                            playerObjId: data._id,
                                                            isValid: true
                                                        },
                                                        {
                                                            isValid: false,
                                                            validEndTime: new Date()
                                                        });
                                                }
                                            }
                                        }
                                    )

                                    proms.push(referralProm);
                                }

                                return Q.all(proms);
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Failed to update player info"});
                            }
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to find player info", error: error});
                        }
                    ).then(
                        function (data) {
                            //reset client QnA security question wrong count
                            // dbconfig.collection_clientQnA.findOneAndUpdate({type: constClientQnA.FORGOT_PASSWORD, playerObjId: playerObj._id}, {totalWrongCount: 0}).catch(errorUtils.reportError);
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to update player info", error: error});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for update player real name proposal type
             */
            executeUpdatePlayerRealName: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.realNameAfterEdit) {

                    dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).then(
                        data => {
                            if(data && data._id && data.platform){
                                return dbconfig.collection_players.findOneAndUpdate(
                                    {_id: data._id, platform: data.platform},
                                    {realName: proposalData.data.realNameAfterEdit, bankAccountName: proposalData.data.realNameAfterEdit,"qnaWrongCount.editName": 0}
                                );
                            }else{
                                deferred.reject({name: "DataError", message: "Incorrect player data", error: Error()});
                            }
                        }
                    ).then(
                        data => {
                            deferred.resolve(data);
                        }
                    )
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for update player info proposal type
             */
            executeUpdatePlayerBankInfo: function (proposalData, deferred) {
                //valid data
                let updateMultipleBankInfo = false;
                let playerData;
                if (proposalData && proposalData.data && proposalData.data._id) {
                    var curPartnerId = null;
                    dbconfig.collection_players.findOne({_id: proposalData.data._id}).then(
                        function (data) {
                            playerData = data;
                            if (data) {
                                var playerUpdate = Object.assign({}, proposalData.data);
                                delete playerUpdate.platformId;
                                delete playerUpdate.playerId;
                                delete playerUpdate.playerName;
                                delete playerUpdate._id;
                                if(playerUpdate.bankName && playerUpdate.bankAccountName){
                                    playerUpdate.realName = playerUpdate.bankAccountName;
                                }
                                if (playerUpdate.bankName2 || playerUpdate.bankName3) {
                                    updateMultipleBankInfo = true;
                                }

                                let propQuery = {
                                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                    'data.platformId': data.platform,
                                    'data.playerName': proposalData.data.playerName,
                                    'data.playerId': proposalData.data.playerId,
                                };

                                return dbPropUtil.getProposalDataOfType(data.platform, constProposalType.UPDATE_PLAYER_BANK_INFO, propQuery).then(
                                    proposal => {
                                        if (proposal && proposal.length > 1) {
                                            if (playerUpdate.isDeleteBank2 || playerUpdate.isDeleteBank3) {
                                                return dbconfig.collection_playerMultipleBankDetailInfo.findOneAndUpdate(
                                                    {playerObjId: proposalData.data._id, platformObjId: data.platform},
                                                    playerUpdate,
                                                    {upsert: true, new: true}
                                                ).lean();
                                            }
                                            if (updateMultipleBankInfo) {
                                                return dbconfig.collection_playerMultipleBankDetailInfo.findOneAndUpdate(
                                                    {playerObjId: proposalData.data._id, platformObjId: data.platform},
                                                    playerUpdate,
                                                    {upsert: true, new: true}
                                                ).lean().then(
                                                    bankData => {
                                                        if (bankData && bankData._id) {
                                                            return dbconfig.collection_players.findOneAndUpdate(
                                                                {_id: data._id, platform: data.platform},
                                                                {multipleBankDetailInfo: bankData._id},
                                                                {upsert: true, new: true}
                                                            ).populate({
                                                                path: "multipleBankDetailInfo",
                                                                model: dbconfig.collection_playerMultipleBankDetailInfo
                                                            }).lean();
                                                        }
                                                    }
                                                );
                                            } else {
                                                return dbconfig.collection_players.findOneAndUpdate(
                                                    {_id: data._id, platform: data.platform},
                                                    playerUpdate,
                                                    {returnNewDocument: true}
                                                ).lean();
                                            }
                                        } else {
                                            if (playerUpdate.bankAccountName) {
                                                playerUpdate.realName = playerUpdate.bankAccountName;
                                            }

                                            return dbconfig.collection_players.findOneAndUpdate(
                                                {_id: data._id, platform: data.platform},
                                                playerUpdate,
                                                {returnNewDocument: true}
                                            ).lean();
                                        }
                                    }
                                );
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Failed to find player info"});
                            }
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to find player info", error: error});
                        }
                    ).then(data => {
                        let bankAccountBindingRecord = new dbconfig.collection_bankAccountBindingRecord({
                            platformObjId: playerData.platform,
                            playerObjId: playerData._id,
                            bankAccount: proposalData.data.bankAccount,
                            bankName: proposalData.data.bankName
                        });
                        return bankAccountBindingRecord.save().then(() => {
                            return data;
                        });
                    }).then(
                        function (data) {
                            let loggerInfo = {};
                            if (proposalData.data.bankName) {
                                loggerInfo = {
                                    bankName: proposalData.data.bankName,
                                    bankAccount: proposalData.data.bankAccount,
                                    bankAccountName: proposalData.data.bankAccountName,
                                    bankAccountType: proposalData.data.bankAccountType,
                                    bankAccountProvince: proposalData.data.bankAccountProvince,
                                    bankAccountCity: proposalData.data.bankAccountCity,
                                    bankAccountDistrict: proposalData.data.bankAccountDistrict,
                                    bankAddress: proposalData.data.bankAddress,
                                    bankBranch: proposalData.data.bankBranch,
                                };
                            } else if (proposalData.data.bankName2) {
                                loggerInfo = {
                                    bankName2: proposalData.data.bankName2,
                                    bankAccount2: proposalData.data.bankAccount2,
                                    bankAccountName2: proposalData.data.bankAccountName2,
                                    bankAccountType2: proposalData.data.bankAccountType2,
                                    bankAccountProvince2: proposalData.data.bankAccountProvince2,
                                    bankAccountCity2: proposalData.data.bankAccountCity2,
                                    bankAccountDistrict2: proposalData.data.bankAccountDistrict2,
                                    bankAddress2: proposalData.data.bankAddress2,
                                    bankBranch2: proposalData.data.bankBranch2,
                                };
                            } else if (proposalData.data.bankName3) {
                                loggerInfo = {
                                    bankName3: proposalData.data.bankName3,
                                    bankAccount3: proposalData.data.bankAccount3,
                                    bankAccountName3: proposalData.data.bankAccountName3,
                                    bankAccountType3: proposalData.data.bankAccountType3,
                                    bankAccountProvince3: proposalData.data.bankAccountProvince3,
                                    bankAccountCity3: proposalData.data.bankAccountCity3,
                                    bankAccountDistrict3: proposalData.data.bankAccountDistrict3,
                                    bankAddress3: proposalData.data.bankAddress3,
                                    bankBranch3: proposalData.data.bankBranch3,
                                };
                            }

                            loggerInfo.source = constProposalEntryType.ADMIN;
                            loggerInfo.targetObjectId = proposalData.data._id;
                            loggerInfo.targetType = constProposalUserType.PLAYERS;
                            loggerInfo.creatorType = constProposalUserType.SYSTEM_USERS;
                            loggerInfo.creatorObjId = proposalData.creator ? proposalData.creator.id : null;

                            // dbPlayerInfo.findAndUpdateSimilarPlayerInfoByField(data, 'bankAccount', proposalData.data.bankAccount).then();
                            dbLogger.createBankInfoLog(loggerInfo);
                            //SMSSender.sendByPlayerObjId(proposalData.data._id, constPlayerSMSSetting.UPDATE_PAYMENT_INFO);
                            //bankcardLast4Number(new) send message to player
                            if (proposalData.data.bankAccount) {
                                proposalData.data.bankAccount = proposalData.data.bankAccount.substr(proposalData.data.bankAccount.length - 4);
                                proposalData.data.playerObjId = proposalData.data._id;
                                sendMessageToPlayer(proposalData, constMessageType.UPDATE_BANK_INFO_SUCCESS, {});
                            } else if (proposalData.data.bankAccount2) {
                                proposalData.data.bankAccount2 = proposalData.data.bankAccount2.substr(proposalData.data.bankAccount2.length - 4);
                                proposalData.data.playerObjId = proposalData.data._id;
                                sendMessageToPlayer(proposalData, constMessageType.UPDATE_BANK_INFO_SUCCESS, {});
                            } else if (proposalData.data.bankAccount3) {
                                proposalData.data.bankAccount3 = proposalData.data.bankAccount3.substr(proposalData.data.bankAccount3.length - 4);
                                proposalData.data.playerObjId = proposalData.data._id;
                                sendMessageToPlayer(proposalData, constMessageType.UPDATE_BANK_INFO_SUCCESS, {});
                            }
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to update player info", error: error});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for update partner bank info proposal type
             */
            executeUpdatePartnerBankInfo: function (proposalData, deferred) {
                //data validation
                //todo::update by using partner name for now since it is unique
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.platformId) {
                    dbconfig.collection_partner.findOne({partnerName: proposalData.data.partnerName, platform: proposalData.data.platformId}).then(
                        function (data) {
                            if (data) {
                                var partnerUpdate = Object.assign({}, proposalData.data);
                                delete partnerUpdate.platformId;
                                delete partnerUpdate.partnerId;
                                delete partnerUpdate.partnerName;
                                delete partnerUpdate._id;
                                // if(partnerUpdate.bankAccountName){
                                //     partnerUpdate.realName = partnerUpdate.bankAccountName;
                                // }

                                let propQuery = {
                                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                    'data.platformId': data.platform,
                                    'data.partnerName': proposalData.data.partnerName,
                                    'data.partnerId': proposalData.data.partnerId
                                };

                                return dbPropUtil.getProposalDataOfType(data.platform, constProposalType.UPDATE_PARTNER_BANK_INFO, propQuery).then(
                                    proposal => {
                                        if (proposal && proposal.length > 1) {
                                            return dbconfig.collection_partner.findOneAndUpdate(
                                                {_id: data._id, platform: data.platform},
                                                partnerUpdate,
                                                {returnNewDocument: true}
                                            );
                                        } else {
                                            if(partnerUpdate.bankAccountName){
                                                partnerUpdate.realName = partnerUpdate.bankAccountName;
                                            }

                                            return dbconfig.collection_partner.findOneAndUpdate(
                                                {_id: data._id, platform: data.platform},
                                                partnerUpdate,
                                                {returnNewDocument: true}
                                            );
                                        }
                                    }
                                );
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Failed to find partner"});
                            }
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to find partner", error: error});
                        }
                    ).then(
                        function (data) {
                            var loggerInfo = {
                                source: constProposalEntryType.ADMIN,
                                bankName: proposalData.data.bankName,
                                bankAccount: proposalData.data.bankAccount,
                                bankAccountName: proposalData.data.bankAccountName,
                                bankAccountType: proposalData.data.bankAccountType,
                                bankAccountProvince: proposalData.data.bankAccountProvince,
                                bankAccountCity: proposalData.data.bankAccountCity,
                                bankAccountDistrict: proposalData.data.bankAccountDistrict,
                                bankAddress: proposalData.data.bankAddress,
                                bankBranch: proposalData.data.bankBranch,
                                targetObjectId: proposalData.data._id,
                                targetType: constProposalUserType.PARTNERS,
                                creatorType: constProposalUserType.SYSTEM_USERS,
                                creatorObjId: proposalData.creator ? proposalData.creator.id : null
                            }
                            dbLogger.createBankInfoLog(loggerInfo);
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to update player info", error: error});
                        }
                    ).then(
                        dbUtil.findOneAndUpdateForShard(
                            dbconfig.collection_partner,
                            {
                                partnerName: proposalData.data.partnerName,
                                platform: proposalData.data.platformId
                            },
                            proposalData.data.updateData,
                            constShardKeys.collection_partner
                        ).then(
                            function (data) {
                                deferred.resolve(data);
                            },
                            function (err) {
                                deferred.reject({name: "DataError", message: "Failed to update partner bank info", error: err});
                            }
                        )
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner bank info proposal data"});
                }
            },

            /**
             * execution function for update partner phone proposal type
             */
            executeUpdatePartnerPhone: function (proposalData, deferred) {
                //data validation
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.phoneNumber && proposalData.data.platformId) {
                    proposalData.data.updateData.phoneNumber = rsaCrypto.encrypt(proposalData.data.updateData.phoneNumber);
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {
                            partnerName: proposalData.data.partnerName,
                            platform: proposalData.data.platformId
                        },
                        proposalData.data.updateData,
                        constShardKeys.collection_partner
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({
                                name: "DataError",
                                message: "Failed to update partner phone number",
                                error: err
                            });
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner phone number proposal data"});
                }
            },

            /**
             * execution function for update partner email proposal type
             */
            executeUpdatePartnerEmail: function (proposalData, deferred) {
                //data validation
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.email && proposalData.data.platformId) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {
                            partnerName: proposalData.data.partnerName,
                            platform: proposalData.data.platformId
                        },
                        proposalData.data.updateData,
                        constShardKeys.collection_partner
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update partner email", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner email proposal data"});
                }
            },

            /**
             * execution function for update partner QQ proposal type
             */
            executeUpdatePartnerQQ: function (proposalData, deferred) {
                //data validation
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.qq && proposalData.data.platformId) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {
                            partnerName: proposalData.data.partnerName,
                            platform: proposalData.data.platformId
                        },
                        proposalData.data.updateData,
                        constShardKeys.collection_partner
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update partner email", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner email proposal data"});
                }
            },

            /**
             * execution function for update partner weChat proposal type
             */
            executeUpdatePartnerWeChat: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.wechat && proposalData.data.platformId) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {
                            partnerName: proposalData.data.partnerName,
                            platform: proposalData.data.platformId
                        },
                        proposalData.data.updateData,
                        constShardKeys.collection_partner
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update partner weChat", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner weChat proposal data"});
                }
            },

            /**
             * execution function for update partner email proposal type
             */
            executeUpdatePartnerInfo: function (proposalData, deferred) {
                //data validation
                if (proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.updateData) {
                    result = '';

                    function getParent(id) {
                        return dbconfig.collection_partner.findOne({_id: id}).then(
                            data => {
                                if (!data || !data.parent) return true;
                                if (data.parent != proposalData.data.partnerObjId) {
                                    return getParent(data.parent);
                                } else return false;
                            }
                        );
                    }

                    var validUpdate = Q.resolve(true);
                    if (proposalData.data.updateData.parent) {
                        validUpdate = getParent(proposalData.data.updateData.parent)
                    }
                    if (String(proposalData.data.updateData.parent) == String(proposalData.data.partnerObjId)) {
                        validUpdate = Q.resolve(false);
                    }
                    return validUpdate.then(testResult => {
                        if (testResult) {
                            var proms = [];
                            if (proposalData.data.updateData.hasOwnProperty("parent")) {
                                //update current parent and new parent children
                                proms.push(
                                    dbconfig.collection_partner.findOne({_id: proposalData.data.partnerObjId}).lean().then(
                                        partnerData => {
                                            if (partnerData && String(partnerData.parent) != String(proposalData.data.parent)) {
                                                var partnerProms = [];
                                                if (proposalData.data.updateData.parent) {
                                                    partnerProms.push(
                                                        dbconfig.collection_partner.findOneAndUpdate(
                                                            {_id: proposalData.data.parent, platform: partnerData.platform},
                                                            {$addToSet: {children: proposalData.data.partnerObjId}}
                                                        )
                                                    );
                                                }
                                                if (partnerData.parent) {
                                                    partnerProms.push(dbconfig.collection_partner.findOneAndUpdate(
                                                        {_id: partnerData.parent, platform: partnerData.platform},
                                                        {$pull: {children: proposalData.data.partnerObjId}}
                                                    ))
                                                }
                                                return Q.all(partnerProms);
                                            }
                                        }
                                    )
                                );
                            }
                            Q.resolve().then(
                                () => {
                                    return dbPartner.updatePartnerDomain(proposalData.data.partnerObjId, proposalData.data.updateData.ownDomain);
                                }
                            ).then(
                                () => Q.all(proms)
                            ).then(
                                () => {
                                    dbUtil.findOneAndUpdateForShard(
                                        dbconfig.collection_partner,
                                        {_id: proposalData.data.partnerObjId},
                                        proposalData.data.updateData,
                                        constShardKeys.collection_partner
                                    ).then(
                                        function (data) {
                                            deferred.resolve(data);
                                        },
                                        function (err) {
                                            deferred.reject({
                                                name: "DataError",
                                                message: "Failed to update partner info",
                                                error: err
                                            });
                                        }
                                    );
                                },
                                error => {
                                    deferred.reject({
                                        name: "DataError",
                                        message: "Failed to update partner info because of incorrect update data",
                                        error: error
                                    });
                                }
                            );
                        } else {
                            deferred.reject({message: "partner cannot be its own ancestor"});
                        }
                    })
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner info proposal data"});
                }
            },

            /**
             * execution function for update partner real name proposal type
             */
            executeUpdatePartnerRealName: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.realNameAfterEdit) {

                    dbconfig.collection_partner.findOne({_id: proposalData.data.partnerObjId}).then(
                        data => {
                            if(data && data._id && data.platform){
                                return dbconfig.collection_partner.findOneAndUpdate(
                                    {_id: data._id, platform: data.platform},
                                    {realName: proposalData.data.realNameAfterEdit}
                                );
                            }else{
                                deferred.reject({name: "DataError", message: "Incorrect partner data", error: Error()});
                            }
                        }
                    ).then(
                        data => {
                            deferred.resolve(data);
                        }
                    )
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for update partner email proposal type
             */
            executeUpdatePartnerCommissionType: function (proposalData, deferred) {
                //data validation
                if (proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.updateData) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {_id: proposalData.data.partnerObjId},
                        proposalData.data.updateData,
                        constShardKeys.collection_partner
                    ).then(
                        function (data) {
                            dbPartnerCommissionConfig.updateMainPartnerCommissionData(data.parent, data._id, data.platform, data.commissionType);
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({
                                name: "DataError",
                                message: "Failed to update partner commission type",
                                error: err
                            });
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update partner commission type proposal data"});
                }
            },

            executeUpdateChildPartner: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.platformId && proposalData.data.partnerObjId && proposalData.data.updateChildPartnerName) {
                    let childPartnerData = [];
                    let removedChildPartnerArr = [];
                    let newChildPartnerArr = [];
                    let proms = [];

                    let partnerProm = Promise.resolve();

                    if (proposalData.data.updateChildPartnerName.length) {
                        let query = {
                            partnerName: {$in: proposalData.data.updateChildPartnerName},
                            platform: proposalData.data.platformId
                        };
                        partnerProm = dbconfig.collection_partner.find(query, {_id: 1}).lean();

                        newChildPartnerArr = proposalData.data.updateChildPartnerName.filter((x) => proposalData.data.curChildPartnerName.indexOf(x) === -1);
                    }

                    dbEmailNotification.sendNotifyEditChildPartnerEmail(proposalData).catch(err => {
                        console.log("sendNotifyEditChildPartnerEmail fail", proposalData.proposalId, err);
                    });

                    partnerProm.then(childPartner => {
                        childPartnerData = childPartner ? childPartner : [];

                        if (proposalData.data.curChildPartnerName && proposalData.data.curChildPartnerName.length > 0) {
                            removedChildPartnerArr = proposalData.data.curChildPartnerName.filter((x) => proposalData.data.updateChildPartnerName.indexOf(x) === -1);

                            let removedQuery = {
                                partnerName: {$in: removedChildPartnerArr},
                                platform: proposalData.data.platformId
                            };

                            return dbconfig.collection_partner.find(removedQuery, {_id: 1}).lean();
                        }
                    }).then(removedChildPartner => {
                        if (removedChildPartner && removedChildPartner.length > 0) {
                            for (let i = 0, len = removedChildPartner.length; i < len; i++) {
                                if (removedChildPartner[i] && removedChildPartner[i]._id) {

                                    proms.push(dbconfig.collection_partner.findOneAndUpdate(
                                        {_id: removedChildPartner[i]._id, platform: proposalData.data.platformId},
                                        {$unset: {parent: 1}}
                                        )
                                    );
                                }
                            }

                            if (!childPartnerData.length && proposalData.data.updateChildPartnerHeadCount == 0) {
                                proms.push(dbconfig.collection_partner.findOneAndUpdate(
                                    {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformId},
                                    {$unset: {children: 1}}
                                    )
                                );
                            }

                        }

                        if (childPartnerData && childPartnerData.length > 0) {
                            let childPartnerObjIdArr = [];
                            for (let i = 0, len = childPartnerData.length; i < len; i++) {
                                if (childPartnerData[i] && childPartnerData[i]._id) {
                                    childPartnerObjIdArr.push(childPartnerData[i]._id);

                                    proms.push(dbconfig.collection_partner.findOneAndUpdate(
                                        {_id: childPartnerData[i]._id, platform: proposalData.data.platformId},
                                        {parent: proposalData.data.partnerObjId}
                                        )
                                    );
                                }
                            }

                            if (childPartnerObjIdArr && childPartnerObjIdArr.length > 0) {
                                proms.push(dbconfig.collection_partner.findOneAndUpdate(
                                    {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformId},
                                    {children: childPartnerObjIdArr}
                                    )
                                );
                            }
                        }

                        // proms.push(dbPartnerCommissionConfig.assignPartnerMultiLvlComm(proposalData, removedChildPartnerArr, newChildPartnerArr));

                        if (proms && proms.length > 0) {
                            Q.all(proms).then(
                                async function (data) {
                                    if (proposalData.data.skipCommissionSetting) {
                                        return deferred.resolve(data);
                                    }
                                    return dbPartnerCommissionConfig.assignPartnerMultiLvlComm(proposalData, removedChildPartnerArr, newChildPartnerArr).then(
                                        () => {
                                            deferred.resolve(data);
                                        },
                                        error => {
                                            deferred.reject({name: "DBError", message: "Failed to update child partner commission", error: error});
                                        }
                                    );
                                },
                                function (error) {
                                    deferred.reject({name: "DBError", message: "Failed to update child partner", error: error});
                                }
                            );
                        } else {
                            deferred.reject({name: "DBError", message: "Failed to update child partner", error: error});
                        }
                    });
                } else {
                    deferred.reject({name: "DBError", message: "Incorrect update child partner proposal data", error: error});
                }
            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerTopUp: function (proposalData) {
                let topUpAmount = Number(proposalData.data.amount);
                let oriAmount = 0;

                if (proposalData.data.hasOwnProperty("actualAmountReceived")) {
                    topUpAmount = Number(proposalData.data.actualAmountReceived);
                    oriAmount = Number(proposalData.data.amount);
                }

                return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, topUpAmount, "", constPlayerTopUpType.ONLINE, proposalData, oriAmount).then(
                    data => {
                        dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.ONLINE).catch(errorUtils.reportError);
                        sendMessageToPlayer (proposalData,constMessageType.ONLINE_TOPUP_SUCCESS,{});
                        return proposalData;
                    },
                    error => {
                        return Promise.reject(error);
                    }
                )
            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerAlipayTopUp: function (proposalData) {
                return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.ALIPAY, proposalData).then(
                    data => {
                        dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.ALIPAY).catch(errorUtils.reportError);
                        sendMessageToPlayer (proposalData,constMessageType.ALIPAY_TOPUP_SUCCESS,{});
                        return proposalData;
                    },
                    error => Promise.reject(error)
                )
            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerQuickpayTopUp: function (proposalData) {
                return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.QUICKPAY, proposalData).then(
                    data => {
                        return proposalData;
                    },
                    error => Promise.reject(error)
                );
            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerWechatTopUp: function (proposalData) {
                return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.WECHAT, proposalData).then(
                    data => {
                        dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.WECHAT).catch(errorUtils.reportError);
                        sendMessageToPlayer (proposalData,constMessageType.WECHAT_TOPUP_SUCCESS,{});
                        return proposalData;
                    },
                    error => Promise.reject(error)
                )

            },

            /**
             * execution function for player manual top up proposal type
             */
            executeManualPlayerTopUp: function (proposalData) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.amount) {
                    return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.MANUAL, proposalData).then(
                        data => {
                            dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.MANUAL).catch(errorUtils.reportError);
                            sendMessageToPlayer(proposalData,constMessageType.MANUAL_TOPUP_SUCCESS,{});
                            return proposalData;
                        },
                        error => Promise.reject(error)
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for player manual top up proposal type
             */
            executePlayerAssignTopUp: function (proposalData) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.amount) {
                    return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.MANUAL, proposalData).then(
                        data => {
                            dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.MANUAL).catch(errorUtils.reportError);
                            sendMessageToPlayer(proposalData,constMessageType.MANUAL_TOPUP_SUCCESS,{});
                            return proposalData;
                        },
                        error => Promise.reject(error)
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            executePlayerFKPTopUp: function (proposalData) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.amount) {
                    return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.FUKUAIPAY, proposalData).then(
                        () => {
                            dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.FUKUAIPAY).catch(errorUtils.reportError);
                            sendMessageToPlayer(proposalData, constMessageType.FUKUAIPAY_TOPUP_SUCCESS, {});
                            return proposalData;
                        },
                        error => Promise.reject(error)
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            // executePlayerCommonTopUp: function (proposalData) {
            //     //valid data
            //     if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.amount) {
            //         return dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.COMMON, proposalData).then(
            //             () => {
            //                 dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.COMMON).catch(errorUtils.reportError);
            //                 sendMessageToPlayer(proposalData, constMessageType.COMMON_TOPUP_SUCCESS, {});
            //                 return proposalData;
            //             },
            //             error => Promise.reject(error)
            //         )
            //     }
            //     else {
            //         return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
            //     }
            // },

            executeManualExportTsPhone: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.exportTargetPlatformObjId) {
                    let proposalId = proposalData && proposalData.data && proposalData.data.phoneTradeProposalId? proposalData.data.phoneTradeProposalId: proposalData.proposalId;
                    return dbconfig.collection_tsPhoneTrade.find({proposalId: proposalId}).lean().then(
                        tsPhoneTrades => {
                            let objIds = tsPhoneTrades.map(trade => trade._id);

                            return dbTeleSales.exportDecomposedPhones(objIds, proposalData.data.exportTargetPlatformObjId);
                        }
                    );
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for weekly consecutive top up proposal type
             */
            executeFullAttendance: function (proposalData, deferred) {
                //create reward task for related player
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount && proposalData.data.spendingAmount) {
                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.FULL_ATTENDANCE,
                        rewardType: constRewardType.FULL_ATTENDANCE,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        //todo::check current amount init value???
                        currentAmount: proposalData.data.rewardAmount,
                        platformId: proposalData.data.platformId,
                        initAmount: proposalData.data.rewardAmount,
                        eventId: proposalData.data.eventId
                    };
                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.FULL_ATTENDANCE);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect consecutive top up proposal data"});
                }
            },

            /**
             * execution function for game provider reward
             */
            executeGameProviderReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.GAME_PROVIDER_REWARD,
                        rewardType: constRewardType.GAME_PROVIDER_REWARD,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        //todo::check current amount init value???
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        platformId: proposalData.data.platformId,
                        eventId: proposalData.data.eventId
                    };
                    if (proposalData.data.provider) {
                        taskData.targetProviders = [proposalData.data.provider];
                    }
                    if (proposalData.data.games && proposalData.data.games.length > 0) {
                        taskData.targetGames = proposalData.data.games;
                    }
                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.GAME_PROVIDER_REWARD);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect game provider reward proposal data"});
                }
            },

            /**
             * execution function for platform transaction reward
             */
            executePlatformTransactionReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.rewardAmount, constProposalType.PLATFORM_TRANSACTION_REWARD, proposalData.data).then(
                    ).then(deferred.resolve, deferred.reject);
                }
                else {
                    deferred.resolve(false);
                }
            },

            /**
             * execution function for partner referral reward
             */
            executePartnerReferralReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerId && proposalData.data.rewardAmount) {

                    var rewardAmt = proposalData.data.rewardAmount;
                    var updatePartner = {
                        $inc: {credits: rewardAmt},
                        dateReceivedReferralReward: new Date()
                    };
                    dbconfig.collection_partner.findOneAndUpdate({
                        _id: proposalData.data.partnerId,
                        platform: proposalData.data.platformId
                    }, updatePartner).exec().then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update partner info", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },
            /**
             * execution function for partner incentive reward
             */
            executePartnerIncentiveReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerId && proposalData.data.rewardAmount) {

                    var rewardAmt = proposalData.data.rewardAmount;
                    var updatePartner = {
                        $inc: {credits: rewardAmt},
                        dateReceivedIncentiveReward: new Date()
                    };
                    dbconfig.collection_partner.findOneAndUpdate({
                        _id: proposalData.data.partnerId,
                        platform: proposalData.data.platformId
                    }, updatePartner).exec().then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update partner info", error: err});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for first top up proposal type
             */
            executeFirstTopUp: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.FIRST_TOP_UP,
                        rewardType: constRewardType.FIRST_TOP_UP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        //todo::check current amount init value???
                        currentAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        initAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount,
                        targetEnable: proposalData.data.targetEnable,
                        useLockedCredit: proposalData.data.useLockedCredit
                    };
                    if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    }
                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.FIRST_TOP_UP, proposalData);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect first top up proposal data"});
                }
            },

            /**
             * execution function for player top up return proposal type
             */
            executePlayerTopUpReturn: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_TOP_UP_RETURN,
                        rewardType: constRewardType.PLAYER_TOP_UP_RETURN,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        //todo::check current amount init value???
                        currentAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        initAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount,
                        targetEnable: proposalData.data.targetEnable,
                        useLockedCredit: proposalData.data.useLockedCredit
                    };

                    // Target providers or providerGroup
                    if (proposalData.data.providerGroup) {
                        taskData.providerGroup = proposalData.data.providerGroup;
                    }
                    else if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    }

                    var deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_TOP_UP_RETURN, proposalData);
                    deferred1.promise.then(
                        data => {
                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                {$inc: {dailyTopUpIncentiveAmount: proposalData.data.rewardAmount}}
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
                }
            },

            /**
             * execution function for player consumption incentive proposal type
             */
            executePlayerConsumptionIncentive: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    if (!proposalData.data.spendingAmount) {
                        let updatePlayer = {
                            $inc: {validCredit: proposalData.data.rewardAmount}
                        };
                        dbconfig.collection_players.findOneAndUpdate(
                            {
                                _id: proposalData.data.playerObjId,
                                platform: proposalData.data.platformId
                            },
                            updatePlayer,
                            {new: true}
                        ).lean().then(
                            function (data) {
                                dbLogger.createCreditChangeLogWithLockedCredit(
                                    data._id, data.platform,
                                    proposalData.data.rewardAmount,
                                    proposalData.type.name,
                                    data.validCredit,
                                    0, 0, null, proposalData);
                                deferred.resolve(data);
                            },
                            function (err) {
                                deferred.reject({name: "DataError", message: "Failed to update player info", error: err});
                            }
                        );
                    }
                    else {
                        let taskData = {
                            playerId: proposalData.data.playerObjId,
                            type: constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
                            rewardType: constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
                            platformId: proposalData.data.platformId,

                            requiredUnlockAmount: proposalData.data.spendingAmount,
                            //todo::check current amount init value???
                            currentAmount: proposalData.data.rewardAmount,
                            initAmount: proposalData.data.rewardAmount,
                            useConsumption: proposalData.data.useConsumption,
                            eventId: proposalData.data.eventId
                        };
                        createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_CONSUMPTION_INCENTIVE, proposalData);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
                }
            },

            /**
             * execution function for first top up proposal type
             */
            executePartnerConsumptionReturn: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.partnerId && proposalData.data.rewardAmount) {
                    dbconfig.collection_partner.findOneAndUpdate(
                        {_id: proposalData.data.partnerId, platform: proposalData.data.platformId},
                        {$inc: {credits: proposalData.data.rewardAmount}}
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject({
                                name: "DBError",
                                message: "Error updating partner credit for partner consumption return",
                                error: error
                            });
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect partner consumption return proposal data"});
                }
            },

            /**
             * execution function for player consumption return
             */
            executePlayerConsumptionReturn: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount >= 0 && proposalData.data.platformId) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_CONSUMPTION_RETURN,
                        rewardType: constRewardType.PLAYER_CONSUMPTION_RETURN,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount ? proposalData.data.spendingAmount: 0,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        applyAmount: 0,
                    };
                    proposalData.data.proposalId = proposalData.proposalId;
                    console.log("Check CR execute proposal id",proposalData.proposalId)
                    console.log("Check CR execute player id",taskData.playerId)
                    return dbconfig.collection_platform.findOne({_id: proposalData.data.platformId}).lean().then(
                        platformData => {
                            let promiseUse;
                            if (platformData && platformData.useProviderGroup && proposalData && proposalData.data && proposalData.data.spendingAmount) {
                                // add to the unlocked progress bar if there is consumptionTimeRequired for XIMA; if there is consumptionTimeRequired, spendingAmount will be provided
                                promiseUse = dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData, constRewardType.PLAYER_CONSUMPTION_RETURN);
                            } else {
                                promiseUse = changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.rewardAmount, constRewardType.PLAYER_CONSUMPTION_RETURN, proposalData.data);
                            }
                            return promiseUse.then(
                                () => {
                                    //remove all consumption summaries
                                    if (!Number(proposalData.data.spendingAmount)) {
                                        dbConsumptionReturnWithdraw.addXimaWithdraw(proposalData.data.playerObjId, proposalData.data.rewardAmount).catch(errorUtils.reportError);
                                    }
                                    if(proposalData.data.rewardAmount > 0){
                                        sendMessageToPlayer(proposalData,constRewardType.PLAYER_CONSUMPTION_RETURN,{});
                                    }
                                    dbOperation.removeWithRetry(dbconfig.collection_playerConsumptionSummary, {_id: {$in: proposalData.data.summaryIds}}).catch(errorUtils.reportError);
                                },
                                err => {
                                    console.log("check CR execute reject",err)
                                    return Promise.reject(err);
                                }
                            );
                        }
                    ).catch(errorUtils.reportError);
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player consumption return proposal data"});
                }
            },

            executePlayerBonus: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.largeWithdrawalLog) {
                    if (dbLargeWithdrawal.sendProposalUpdateInfoToRecipients) {
                        dbLargeWithdrawal.sendProposalUpdateInfoToRecipients(proposalData.data.largeWithdrawalLog, proposalData, true).catch(err => {
                            console.log("Send large withdrawal proposal update info failed", proposalData.data.largeWithdrawalLog, err);
                            return errorUtils.reportError(err);
                        });
                    }
                    else {
                        console.log('dbLargeWithdrawal', dbLargeWithdrawal)
                    }
                }
                dbconfig.collection_players.findOne({playerId: proposalData.data.playerId})
                    .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                    player => {
                        if (!player) {
                            return Q.reject({
                                name: "DataError",
                                message: "Player is not found",
                                data: {proposal: proposalData}
                            });
                        }

                        if (proposalData.status == constProposalStatus.CANCEL || proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.FAIL) {
                            return Q.reject({
                                name: "DataError",
                                message: "Invalid proposal status",
                                data: {proposal: proposalData}
                            });
                        }

                        // var decryptedPhoneNo = player.phoneNumber;
                        //
                        // if (player.phoneNumber && player.phoneNumber.length > 20) {
                        //     try {
                        //         decryptedPhoneNo = rsaCrypto.decrypt(player.phoneNumber);
                        //     }
                        //     catch (err) {
                        //         console.log(err);
                        //         decryptedPhoneNo = "";
                        //     }
                        // }

                       let cTime = proposalData && proposalData.createTime ? new Date(proposalData.createTime) : new Date();
                       let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                       let message = {
                           proposalId: proposalData.proposalId,
                           platformId: player.platform.platformId,
                           amount: proposalData.data.amount,
                           bankTypeId: player.bankName || "",
                           accountName: player.bankAccountName || "",
                           accountCity: player.bankAccountCity || "",
                           accountProvince: player.bankAccountProvince || "",
                           accountNo: player.bankAccount ? player.bankAccount.replace(/\s/g, '') : "",
                           bankAddress: player.bankAddress || "",
                           bankName: player.bankName || "",
                           loginName: player.name || "",
                           applyTime: cTimeString,
                           clientType: dbUtil.pmsClientType(proposalData.inputDevice),
                           entryType: proposalData.entryType,
                           remark: proposalData.data && proposalData.data.honoreeDetail
                        };

                       console.log('check status before postWithdraw player:', proposalData.status);
                       console.log('withdrawAPIAddr player req:', message);

                       return RESTUtils.getPMS2Services('postWithdraw', message, proposalData.data.bonusSystemType).then(
                           function (bonusData) {
                               console.log('bonus post success', bonusData);
                               if (bonusData) {
                                   // sendMessageToPlayer(proposalData,constMessageType.WITHDRAW_SUCCESS,{});
                                   increasePlayerWithdrawalData(player._id, player.platform._id, proposalData.data.amount).catch(errorUtils.reportError);
                                   // return bonusData;
                                   return dbPlatform.changePlatformFinancialPoints(player.platform._id, -proposalData.data.amount).then(
                                       platformData => {
                                           if (!platformData) {
                                               return Q.reject({
                                                   name: "DataError",
                                                   errorMessage: "Cannot find platform"
                                               });
                                           }
                                           let dataToUpdate = {
                                               "data.pointsBefore": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints),
                                               "data.pointsAfter": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints - proposalData.data.amount)
                                           };
                                           dbProposal.updateProposalData({_id: proposalData._id}, dataToUpdate).catch(errorUtils.reportError);
                                           return bonusData;
                                       });
                               }
                               else {
                                   return Q.reject({
                                       name: "DataError",
                                       errorMessage: "Cannot request bonus"
                                   });
                               }
                           })

                       // else {
                       //     return pmsAPI.bonus_applyBonus(message).then(
                       //         bonusData => {
                       //             if (bonusData) {
                       //                 // sendMessageToPlayer(proposalData,constMessageType.WITHDRAW_SUCCESS,{});
                       //                 increasePlayerWithdrawalData(player._id, player.platform._id, proposalData.data.amount).catch(errorUtils.reportError);
                       //                 // return bonusData;
                       //                 return dbPlatform.changePlatformFinancialPoints(player.platform._id, -proposalData.data.amount).then(
                       //                     platformData => {
                       //                         if (!platformData) {
                       //                             return Q.reject({
                       //                                 name: "DataError",
                       //                                 errorMessage: "Cannot find platform"
                       //                             });
                       //                         }
                       //                         let dataToUpdate = {
                       //                             "data.pointsBefore": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints),
                       //                             "data.pointsAfter": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints - proposalData.data.amount)
                       //                         };
                       //                         dbProposal.updateProposalData({_id: proposalData._id}, dataToUpdate).catch(errorUtils.reportError);
                       //                         return bonusData;
                       //                     }
                       //                 );
                       //             }
                       //             else {
                       //                 return Q.reject({
                       //                     name: "DataError",
                       //                     errorMessage: "Cannot request bonus"
                       //                 });
                       //             }
                       //         }
                       //     );
                       // }
                    }
                ).then(deferred.resolve, deferred.reject);
            },

            executePartnerBonus: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerLargeWithdrawalLog) {
                    if (dbLargeWithdrawal.sendProposalUpdateInfoToRecipients) {
                        dbLargeWithdrawal.sendProposalUpdateInfoToRecipients(proposalData.data.partnerLargeWithdrawalLog, proposalData, true, true).catch(err => {
                            console.log("Send large withdrawal proposal update info failed", proposalData.data.partnerLargeWithdrawalLog, err);
                            return errorUtils.reportError(err);
                        });
                    }
                    else {
                        console.log('dbLargeWithdrawal', dbLargeWithdrawal)
                    }
                }
                dbconfig.collection_partner.findOne({partnerId: proposalData.data.partnerId})
                    .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                    partner => {
                        if (!partner) {
                            return Q.reject({
                                name: "DataError",
                                message: "Partner is not found",
                                data: {proposal: proposalData}
                            });
                        }

                        let cTime = proposalData && proposalData.createTime ? new Date(proposalData.createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        var message = {
                            proposalId: proposalData.proposalId,
                            platformId: partner.platform.platformId,
                            amount: proposalData.data.amount,
                            bankTypeId: partner.bankName || "",
                            accountName: partner.bankAccountName || "",
                            accountCity: partner.bankAccountCity || "",
                            accountProvince: partner.bankAccountProvince || "",
                            accountNo: partner.bankAccount ? partner.bankAccount.replace(/\s/g, '') : "",
                            bankAddress: partner.bankAddress || "",
                            bankName: partner.bankName || "",
                            loginName: partner.partnerName || "",
                            applyTime: cTimeString,
                            clientType: dbUtil.pmsClientType(proposalData.inputDevice),
                            entryType: proposalData.entryType,
                            remark: proposalData.data && proposalData.data.honoreeDetail
                        };

                        console.log('withdrawAPIAddr partner req:', message);

                        return RESTUtils.getPMS2Services('postWithdraw', message, proposalData.data.bonusSystemType).then(
                            function (bonusData) {
                                console.log('partner bonus post success', bonusData);
                                if (bonusData) {
                                    return dbPlatform.changePlatformFinancialPoints(partner.platform._id, -proposalData.data.amount).then(
                                        platformData => {
                                            if (!platformData) {
                                                return Q.reject({name: "DataError", errorMessage: "Cannot find platform"});
                                            }

                                            let dataToUpdate = {
                                                "data.pointsBefore": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints),
                                                "data.pointsAfter": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints - proposalData.data.amount)
                                            };
                                            dbProposal.updateProposalData({_id: proposalData._id}, dataToUpdate).catch(errorUtils.reportError);
                                            return bonusData;
                                        }
                                    )
                                }
                                else {
                                    return Q.reject({name: "DataError", errorMessage: "Cannot request bonus"});
                                }
                            })

                        // else {
                        //     return pmsAPI.bonus_applyBonus(message).then(
                        //         bonusData => {
                        //             if (bonusData) {
                        //                 return dbPlatform.changePlatformFinancialPoints(partner.platform._id, -proposalData.data.amount).then(
                        //                     platformData => {
                        //                         if (!platformData) {
                        //                             return Q.reject({name: "DataError", errorMessage: "Cannot find platform"});
                        //                         }
                        //
                        //                         let dataToUpdate = {
                        //                             "data.pointsBefore": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints),
                        //                             "data.pointsAfter": dbUtil.noRoundTwoDecimalPlaces(platformData.financialPoints - proposalData.data.amount)
                        //                         };
                        //                         dbProposal.updateProposalData({_id: proposalData._id}, dataToUpdate).catch(errorUtils.reportError);
                        //                         return bonusData;
                        //                     }
                        //                 )
                        //             }
                        //             else {
                        //                 return Q.reject({name: "DataError", errorMessage: "Cannot request bonus"});
                        //             }
                        //         }
                        //     );
                        // }
                    }
                ).then(deferred.resolve, deferred.reject);
            },

            /**
             * execution function for player level up proposal type
             */
            executePlayerLevelUp: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && proposalData.data.rewardAmount) {
                    if (proposalData.data.isRewardTask) {
                        var taskData = {
                            playerId: proposalData.data.playerObjId,
                            type: constRewardType.PLAYER_LEVEL_UP,
                            rewardType: constRewardType.PLAYER_LEVEL_UP,
                            platformId: proposalData.data.platformObjId,
                            //todo::check unlock amount here
                            requiredUnlockAmount: proposalData.data.requiredUnlockAmount || 0,
                            providerGroup: proposalData.data.providerGroup,
                            currentAmount: proposalData.data.rewardAmount,
                            initAmount: proposalData.data.rewardAmount,
                        };
                        createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_LEVEL_UP, proposalData);
                    }
                    else {
                        changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constProposalType.PLAYER_LEVEL_UP, proposalData.data).then(deferred.resolve, deferred.reject);
                        sendMessageToPlayer(proposalData,constMessageType.PLAYER_LEVEL_UP_SUCCESS,{});
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player level up reward proposal data"});
                }
            },

            executePlayerLevelMaintain: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && proposalData.data.rewardAmount) {
                    if (proposalData.data.isRewardTask) {
                        var taskData = {
                            playerId: proposalData.data.playerObjId,
                            type: constRewardType.PLAYER_LEVEL_MAINTAIN,
                            rewardType: constRewardType.PLAYER_LEVEL_MAINTAIN,
                            platformId: proposalData.data.platformObjId,
                            //todo::check unlock amount here
                            requiredUnlockAmount: proposalData.data.requiredUnlockAmount || 0,
                            providerGroup: proposalData.data.providerGroup,
                            currentAmount: proposalData.data.rewardAmount,
                            initAmount: proposalData.data.rewardAmount,
                        };
                        createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_LEVEL_MAINTAIN, proposalData);
                    }
                    else {
                        changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constProposalType.PLAYER_LEVEL_MAINTAIN, proposalData.data).then(deferred.resolve, deferred.reject);
                        sendMessageToPlayer(proposalData,constMessageType.PLAYER_LEVEL_MAINTAIN_SUCCESS,{});
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player level up reward proposal data"});
                }
            },

            /**
             * execution function for player level migration proposal type
             */
            executePlayerLevelMigration: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId) {
                    // Perform the level migration
                    dbconfig.collection_players.findOneAndUpdate(
                        {_id: proposalData.data.playerObjId, platform: proposalData.data.platformObjId},
                        {playerLevel: proposalData.data.levelObjId},
                        {new: false}
                    ).then(
                        (data) => {
                            let messageType;
                            if (proposalData.data && proposalData.data.upOrDown == "LEVEL_UP") {
                                messageType = constMessageType.PLAYER_LEVEL_UP_MIGRATION_SUCCESS;
                            } else {
                                messageType = constMessageType.PLAYER_LEVEL_DOWN_MIGRATION_SUCCESS;
                            }
                            sendMessageToPlayer(proposalData,messageType,{});
                            deferred.resolve(data);
                    }, deferred.reject
                    );

                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player level migration proposal data"});
                }
            },

            /**
             * execution function for partner top up return proposal type
             */
            executePartnerTopUpReturn: function (proposalData, deferred) {
                //verify data
                if (proposalData && proposalData.data && proposalData.data.partnerId && proposalData.data.platformId && proposalData.data.rewardAmount) {
                    //todo::add partner credit change log here
                    dbconfig.collection_partner.findOneAndUpdate(
                        {_id: proposalData.data.partnerId, platform: proposalData.data.platformId},
                        {$inc: {credits: proposalData.data.rewardAmount}}
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (error) {
                            deferred.reject({
                                name: "DBError",
                                message: "Error updating partner credit for partner consumption return",
                                error: error
                            });
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect partner consumption return proposal data"});
                }
            },

            /**
             * execution function for player top up reward proposal type
             */
            executePlayerTopUpReward: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_TOP_UP_REWARD,
                        rewardType: constRewardType.PLAYER_TOP_UP_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        //todo::check current amount init value???
                        currentAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        initAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        useConsumption: proposalData.data.useConsumption,
                        eventId: proposalData.data.eventId,
                        maxRewardAmount: proposalData.data.maxRewardAmount,
                        proposalId: proposalData.proposalId,
                        applyAmount: proposalData.data.applyAmount,
                        rewardAmount: proposalData.data.rewardAmount
                    };
                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_TOP_UP_REWARD, proposalData);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
                }
            },

            /**
             * execution function for player referral reward proposal type
             */
            executePlayerReferralReward: function (proposalData, deferred) {
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && proposalData.data.rewardAmount) {
                    changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constProposalType.PLAYER_REFERRAL_REWARD, proposalData.data).then(
                        //() => createRewardLogForProposal(constRewardType.PLAYER_REFERRAL_REWARD, proposalData)
                    ).then(deferred.resolve, deferred.reject);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player referral reward proposal data"});
                }
            },

            executeAddPlayerRewardTask: function (proposalData, deferred) {
                if (!(proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.platformId)) {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect add player reward task proposal data"
                    });
                }
                proposalData.data.rewardAmount = proposalData.data.initAmount || 0;
                createRewardTaskForProposal(proposalData, proposalData.data, deferred, constProposalType.ADD_PLAYER_REWARD_TASK, proposalData);

                // dbRewardTask.getRewardTask({
                //     playerId: proposalData.data.playerId,
                //     status: constRewardTaskStatus.STARTED,
                //     useLockedCredit: true
                // }).then(
                //     function (curData) {
                //         if(curData) {
                //             dbconfig.collection_platform.findOne({_id: proposalData.data.platformId}).then(
                //                 function(platformData) {
                //                     if (platformData.canMultiReward || !platformData.useLockedCredit) {
                //                         dbRewardTask.createRewardTask(proposalData.data).then(
                //                             deferred.resolve, deferred.reject
                //                         );
                //                     } else {
                //                         deferred.reject({name: "DataError", message: "Player already has reward task"});
                //                     }
                //                 },
                //                 function(error) {
                //                     deferred.reject({
                //                         name: "DBError",
                //                         message: "Failed to get reward task data."
                //                     });
                //                 }
                //             );
                //         } else {
                //             dbRewardTask.createRewardTask(proposalData.data).then(
                //                 deferred.resolve, deferred.reject
                //             );
                //         }
                //     },
                //     function (error) {
                //         deferred.reject({
                //             name: "DBError",
                //             message: "Error finding reward task for player top up reward",
                //             error: error
                //         });
                //     }
                // );
            },

            executePlayerRegistrationReward: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount && proposalData.data.unlockBonusAmount != null) {
                    if (proposalData.data.unlockBonusAmount > 0) {

                        var taskData = {
                            playerId: proposalData.data.playerObjId,
                            type: constRewardType.PLAYER_REGISTRATION_REWARD,
                            rewardType: constRewardType.PLAYER_REGISTRATION_REWARD,
                            platformId: proposalData.data.platformObjId,
                            requiredBonusAmount: proposalData.data.unlockBonusAmount,
                            currentAmount: proposalData.data.rewardAmount,
                            initAmount: proposalData.data.rewardAmount,
                            eventId: proposalData.data.eventId,
                            proposalId: proposalData.proposalId
                        };
                        createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_REGISTRATION_REWARD, proposalData);

                    }
                    else {
                        changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constProposalType.PLAYER_REGISTRATION_REWARD, proposalData.data).then(deferred.resolve, deferred.reject);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
                }
            },

            executeManualUnlockPlayerReward: function (proposalData, deferred) {
                // Set proposalId in proposalData.data
                proposalData = setProposalIdInData(proposalData);

                if (proposalData.data && proposalData.data.providerGroup) {
                    dbRewardTask.completeRewardTaskGroup(proposalData.data, constRewardTaskStatus.MANUAL_UNLOCK).then(deferred.resolve, deferred.reject);
                } else {
                    dbRewardTask.completeRewardTask(proposalData.data).then(deferred.resolve, deferred.reject);
                }
            },

            executePartnerCommission: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                    dbconfig.collection_partner.findOneAndUpdate(
                        {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformObjId},
                        {
                            lastCommissionSettleTime: proposalData.data.lastCommissionSettleTime,
                            lastChildrenCommissionSettleTime: proposalData.data.lastCommissionSettleTime,
                            negativeProfitAmount: proposalData.data.negativeProfitAmount,
                            $push: {commissionHistory: proposalData.data.commissionLevel},
                            negativeProfitStartTime: proposalData.data.negativeProfitStartTime,
                            $inc: {credits: proposalData.data.commissionAmount + proposalData.data.commissionAmountFromChildren}
                        }
                    ).then(
                        deferred.resolve, deferred.reject
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect partner commission proposal data"});
                }
            },

            /**
             * execution function for player top up return proposal type
             */
            executePlayerDoubleTopUpReward: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {

                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD,
                        rewardType: constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        initAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                        useConsumption: proposalData.data.useConsumption,
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount
                    };
                    if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    }
                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD, proposalData);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
                }
            },

            /**
             * execution function for update partner credit proposal type
             */
            executeUpdatePartnerCredit: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.updateAmount != null) {
                    // changePartnerCredit(proposalData.data.partnerObjId, proposalData.data.platformId, proposalData.data.updateAmount, constProposalType.UPDATE_PARTNER_CREDIT, proposalData.data).then(deferred.resolve, deferred.reject);

                    var updateObj = {
                        $inc: {
                            credits: proposalData.data.updateAmount > 0 ? proposalData.data.updateAmount : 0
                        }
                    };
                    return dbconfig.collection_partner.findOneAndUpdate(
                        {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformId},
                        updateObj,
                        {new: true}
                    ).then(
                        partner => {
                            if (!partner) {
                                deferred.reject({
                                    name: "DataError",
                                    message: "Can't update partner credit: partner not found."
                                });
                                return;
                            }

                            var changeType = constProposalType.UPDATE_PARTNER_CREDIT;
                            dbLogger.createPartnerCreditChangeLog(proposalData.data.partnerObjId, proposalData.data.platformId, proposalData.data.updateAmount, changeType, partner.credits, null, proposalData.data);
                            deferred.resolve(partner);
                        },
                        error => {
                            deferred.reject({name: "DBError", message: "Error updating partner.", error: error});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            executePlayerConsecutiveLoginReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    //todo: Currently the no rewardTask is created, but direct credit to player
                    let updatePlayer = {
                        $inc: {validCredit: proposalData.data.rewardAmount}
                    };

                    dbconfig.collection_players.findOneAndUpdate({
                        _id: proposalData.data.playerObjId,
                        platform: proposalData.data.platformId
                    }, updatePlayer, {new: true}).lean().then(
                        function (data) {
                            dbLogger.createCreditChangeLogWithLockedCredit(
                                data._id, data.platform,
                                proposalData.data.rewardAmount,
                                proposalData.type.name,
                                data.validCredit,
                                0, 0, null, proposalData);
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update player info", error: err});
                        }
                    );

                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player consecutive login reward proposal data"
                    });
                }
            },

            executePlayerEasterEggReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    var taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_EASTER_EGG_REWARD,
                        rewardType: constRewardType.PLAYER_EASTER_EGG_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.applyAmount,
                        initAmount: proposalData.data.applyAmount,
                        eventId: proposalData.data.eventId,
                        useLockedCredit: proposalData.data.useLockedCredit,
                        useConsumption: Boolean(proposalData.data.useConsumption)
                    };
                    if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    }

                    dbconfig.collection_players.findOneAndUpdate({
                        _id: proposalData.data.playerObjId,
                        platform: proposalData.data.platformId
                    }, {applyingEasterEgg: false}).then(
                        data => {
                            createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_EASTER_EGG_REWARD, proposalData);
                        },
                        error => {
                            deferred.reject({
                                name: "DBError",
                                message: "Failed to update playerinfo for applyingEasterEgg",
                                error: error
                            });
                        }
                    )
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player consecutive login reward proposal data"
                    });
                }
            },

            executePlayerTopUpPromo: function (proposalData, deferred) {
                dbPlayerInfo.updatePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.rewardAmount, proposalData.type.name, proposalData.data.playerName, proposalData.data).then(
                    successData => {
                        deferred.resolve(successData);
                    },
                    error => {
                        deferred.reject(error);
                    }
                );
            },

            /**
             * execution function for player intention proposal
             */
            executePlayerRegistrationIntention: function (proposalData, deferred) {
                // for message template
                if(proposalData.data && proposalData.data.realName && proposalData.status === constProposalStatus.APPROVED) {
                    let platformObjId =proposalData.data.platform?proposalData.data.platform:proposalData.data.platformId;
                    // this proposal data's player name no include platform prefix;
                    dbconfig.collection_platform.findOne({_id:platformObjId}).then(
                        (platform) => {
                            let playerName = platform.prefix + proposalData.data.name;
                            return dbconfig.collection_players.findOne({name:playerName,platform:platform._id})
                                .populate({path: "playerLevel", model: dbconfig.collection_playerLevel});
                        }
                    ).then(
                        (player) => {
                            if(player) {
                                dbconfig.collection_proposal.update({
                                    _id: proposalData._id,
                                }, {"data.playerLevelName": player.playerLevel.name}).exec();
                                proposalData.data.playerName = proposalData.data.name;
                                proposalData.data.playerObjId = player._id;
                                proposalData.data.platformId = proposalData.data.platform;
                                sendMessageToPlayer(proposalData,constMessageType.PLAYER_REGISTER_INTENTION_SUCCESS,{});
                            }

                        }
                    );
                }
                deferred.resolve(proposalData);
            },

            executePlayerConsecutiveConsumptionReward: function (proposalData, deferred) {
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && proposalData.data.rewardAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constRewardType.PLAYER_CONSECUTIVE_CONSUMPTION_REWARD, proposalData.data).then(deferred.resolve, deferred.reject);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect partner consumption return proposal data"});
                }
            },

            executePlayerPacketRainReward: function (proposalData, deferred) {
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && proposalData.data.rewardAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;

                    // Clear state
                    dbconfig.collection_playerState.findOneAndUpdate({
                        player: proposalData.data.playerObjId
                    }, {
                        'state.applyingPacketRainReward': false
                    }).then(
                        success => {
                            changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constRewardType.PLAYER_PACKET_RAIN_REWARD, proposalData.data).then(deferred.resolve, deferred.reject);
                        },
                        err => {
                            deferred.reject(error);
                        }
                    )
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player packet rain proposal data"});
                }
            },

            executePlayerPromoCodeReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_PROMO_CODE_REWARD,
                        rewardType: constRewardType.PLAYER_PROMO_CODE_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        eventId: proposalData.data.eventId,
                        useLockedCredit: proposalData.data.useLockedCredit,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        applyAmount: proposalData.data.applyAmount
                    };

                    // Target providers or providerGroup
                    if (proposalData.data.providerGroup && proposalData.data.providerGroup.length > 0) {
                        taskData.providerGroup = proposalData.data.providerGroup;

                        // Lock apply amount to reward if type-C promo code
                        if (proposalData.data.promoCodeTypeValue == 3) {
                            taskData.initAmount += proposalData.data.applyAmount;
                            taskData.currentAmount += proposalData.data.applyAmount;
                        }
                    }
                    else if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    }

                    let prom;

                    if (proposalData.data.applyAmount) {
                        prom = dbUtil.findOneAndUpdateForShard(
                            dbconfig.collection_proposal,
                            {
                                proposalId: proposalData.data.topUpProposal,
                                'data.platformId': proposalData.data.platformId
                            },
                            {'data.promoCode': proposalData.data.promoCode},
                            constShardKeys.collection_proposal
                        );
                    } else {
                        prom = Promise.resolve();
                    }

                    if (proposalData.data.disableWithdraw) {
                        disablePlayerWithdrawal(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.proposalId).catch(errorUtils.reportError);
                    }

                    prom.then(
                        data => {
                            createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_PROMO_CODE_REWARD, proposalData);
                        },
                        error => {
                            deferred.reject({
                                name: "DBError",
                                message: "Failed to update topup proposal for promo code",
                                error: error
                            });
                        }
                    )
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player promo code reward proposal data"
                    });
                }
            },

            executeDxReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.DX_REWARD,
                        rewardType: constRewardType.DX_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        eventId: proposalData.data.eventId,
                        useLockedCredit: proposalData.data.useLockedCredit,
                        forbidWithdrawIfBalanceAfterUnlock: proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                    };

                    if (proposalData.data.providerGroup) {
                        taskData.providerGroup = proposalData.data.providerGroup;
                    }
                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.DX_REWARD, proposalData);
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player DX reward proposal data"
                    });
                }
            },

            executePlayerLimitedOfferReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let amount = proposalData.data.actualAmount ? proposalData.data.actualAmount : proposalData.data.applyAmount;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_LIMITED_OFFERS_REWARD,
                        rewardType: constRewardType.PLAYER_LIMITED_OFFERS_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        applyAmount: proposalData.data.applyAmount,
                        currentAmount: amount + proposalData.data.rewardAmount,
                        initAmount: amount + proposalData.data.rewardAmount,
                        eventId: proposalData.data.eventId
                    };

                    if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    } else {
                        taskData.providerGroup = proposalData.data.providerGroup;
                    }

                    if(proposalData.data.actualAmount){
                        taskData.actualAmount = proposalData.data.actualAmount;
                    }

                    proposalData.data.proposalId = proposalData.proposalId;

                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_LIMITED_OFFERS_REWARD, proposalData);
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player promo code reward proposal data"
                    });
                }
            },

            executePlayerTopUpReturnGroup: function (proposalData, deferred) {
                console.log('executePlayerTopUpReturnGroup');
                if (proposalData && proposalData.data && proposalData.data.playerObjId && (proposalData.data.rewardAmount || (proposalData.data.applyAmount && proposalData.data.isDynamicRewardAmount))) {
                    let amount = proposalData.data.actualAmount ? proposalData.data.actualAmount : proposalData.data.applyAmount;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
                        rewardType: constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                        initAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount,
                        providerGroup: proposalData.data.providerGroup
                    };

                    if(proposalData.data.actualAmount){
                        taskData.actualAmount = proposalData.data.actualAmount;
                    }

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_TOP_UP_RETURN_GROUP, proposalData);
                    deferred1.promise.then(
                        data => {
                            console.log("executePlayerTopUpReturnGroup deferred1.promise.then data", data);
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            ).then(
                                playerData => {
                                    if(proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply){
                                        let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                        let newPermissionObj = {applyBonus: false};
                                        let remark = "优惠提案：" + proposalData.proposalId +  "(领取优惠后禁用提款)";
                                        dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                    return playerData;
                                }
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return group proposal data"});
                }
            },

            executeReferralRewardGroup: function (proposalData, deferred) {
                console.log('executeReferralRewardGroup');
                if (proposalData && proposalData.data && proposalData.data.playerObjId && !isNaN(parseInt(proposalData.data.rewardAmount)) ) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.REFERRAL_REWARD_GROUP,
                        rewardType: constRewardType.REFERRAL_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount,
                        providerGroup: proposalData.data.providerGroup
                    };

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.REFERRAL_REWARD_GROUP, proposalData);
                    deferred1.promise.then(
                        data => {
                            console.log("executeReferralRewardGroup deferred1.promise.then data", data);
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            ).then(
                                playerData => {
                                    if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                        let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                        let newPermissionObj = {applyBonus: false};
                                        let remark = "优惠提案：" + proposalData.proposalId + "(领取优惠后禁用提款)";
                                        dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                    return playerData;
                                }
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                } else {
                    deferred.reject({name: "DataError", message: "Incorrect referral reward group proposal data"});
                }
            },

            executePlayerFestivalRewardGroup: function (proposalData) {
                console.log('MT --executePlayerFestivalRewardGroup', proposalData);
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.hasOwnProperty('rewardType')) {
                    let rtgData;
                    let providerGroup$;
                    let createRTGProm = Promise.resolve(true);
                    console.log('MT --checking proposalData.data.providerGroup', proposalData.data.providerGroup);
                    return dbconfig.collection_gameProviderGroup.findOne({_id: ObjectId(proposalData.data.providerGroup)}).lean().then(
                        providerGroup => {
                            proposalData.data.allowedProvider$ = providerGroup && providerGroup.name ? providerGroup.name : "自由额度";
                            providerGroup$ = proposalData.data.allowedProvider$;
                            // type 1 festival
                            console.log('MT --checking festival created');
                            if (proposalData.data && proposalData.data.rewardType && (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                                let amount = proposalData.data.actualAmount ? proposalData.data.actualAmount : (proposalData.data.applyAmount || 0);
                                let taskData = {
                                    playerId: proposalData.data.playerObjId,
                                    type: constRewardType.PLAYER_FESTIVAL_REWARD_GROUP,
                                    rewardType: constRewardType.PLAYER_FESTIVAL_REWARD_GROUP,
                                    platformId: proposalData.data.platformId,
                                    requiredUnlockAmount: proposalData.data.spendingAmount,
                                    currentAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                                    initAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                                    useConsumption: Boolean(proposalData.data.useConsumption),
                                    eventId: proposalData.data.eventId,
                                    applyAmount: proposalData.data.applyAmount || 0,
                                    providerGroup: proposalData.data.providerGroup
                                };

                                createRTGProm = createRTGForProposal(proposalData, taskData, constRewardType.PLAYER_FESTIVAL_REWARD_GROUP, proposalData).then(
                                    data => {
                                        console.log('MT --checking reward task group created', data);
                                        rtgData = data;
                                        let updateData = {$set: {}};

                                        if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                            updateData.$set["permission.applyBonus"] = false;
                                        }

                                        return dbconfig.collection_players.findOneAndUpdate(
                                            {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                            updateData
                                        )
                                    }
                                ).then(
                                    playerData => {
                                        if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                            let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                            let newPermissionObj = {applyBonus: false};
                                            let remark = "优惠提案：" + proposalData.proposalId + "(领取优惠后禁用提款)";
                                            dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                        }
                                        console.log('MT --checking reward task group created 2');
                                        return rtgData;
                                    }
                                )
                            }

                            return createRTGProm;
                        })

                    }
            },
            executePlayerRandomRewardGroup: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.hasOwnProperty('rewardType')) {
                    let rtgData;
                    let providerGroup$;
                    let createRTGProm = Promise.resolve(true);

                    return dbconfig.collection_gameProviderGroup.findOne({_id: ObjectId(proposalData.data.providerGroup)}).lean().then(
                        providerGroup => {
                            proposalData.data.allowedProvider$ = providerGroup && providerGroup.name ? providerGroup.name : "自由额度";
                            providerGroup$ = proposalData.data.allowedProvider$;

                            if (proposalData.data && proposalData.data.rewardType && proposalData.data.rewardType == constRandomRewardType.CREDIT && (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                                let amount = proposalData.data.actualAmount ? proposalData.data.actualAmount : (proposalData.data.applyAmount || 0);
                                let taskData = {
                                    playerId: proposalData.data.playerObjId,
                                    type: constRewardType.PLAYER_RANDOM_REWARD_GROUP,
                                    rewardType: constRewardType.PLAYER_RANDOM_REWARD_GROUP,
                                    platformId: proposalData.data.platformId,
                                    requiredUnlockAmount: proposalData.data.spendingAmount,
                                    currentAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                                    initAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                                    useConsumption: Boolean(proposalData.data.useConsumption),
                                    eventId: proposalData.data.eventId,
                                    applyAmount: proposalData.data.applyAmount || 0,
                                    providerGroup: proposalData.data.providerGroup
                                };

                                createRTGProm = createRTGForProposal(proposalData, taskData, constRewardType.PLAYER_RANDOM_REWARD_GROUP, proposalData).then(
                                    data => {
                                        rtgData = data;
                                        let updateData = {$set: {}};

                                        if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                            updateData.$set["permission.applyBonus"] = false;
                                        }

                                        return dbconfig.collection_players.findOneAndUpdate(
                                            {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                            updateData
                                        )
                                    }
                                ).then(
                                    playerData => {
                                        if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                            let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                            let newPermissionObj = {applyBonus: false};
                                            let remark = "优惠提案：" + proposalData.proposalId + "(领取优惠后禁用提款)";
                                            dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                        }

                                        return rtgData;
                                    }
                                )
                            }
                            else if (proposalData.data && proposalData.data.rewardType && (proposalData.data.rewardType == constRandomRewardType.PROMOCODE_B_DEPOSIT || proposalData.data.rewardType == constRandomRewardType.PROMOCODE_B_NO_DEPOSIT || proposalData.data.rewardType == constRandomRewardType.PROMOCODE_C)
                                && (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                                let code = null;
                                let expirationDate = null;
                                let isProviderGroup = null;
                                let player;
                                let newPromoCodeEntry = {};
                                let platformObjId = proposalData && proposalData.data && proposalData.data.platformId ? proposalData.data.platformId : null;
                                let playerName = proposalData && proposalData.data && proposalData.data.playerName ? proposalData.data.playerName : null;
                                let promoCodeDetail = proposalData.data && proposalData.data.rewardDetail ? proposalData.data.rewardDetail : null;

                                let promoCodeTemplate = null;
                                if (!promoCodeDetail || (promoCodeDetail && !promoCodeDetail.templateObjId)){
                                    return Promise.reject({
                                        name: "DataError",
                                        message: "Cannot find promo code template ObjectId to generate promo code"
                                    })
                                }

                                createRTGProm = dbconfig.collection_promoCodeTemplate.findOne({_id: promoCodeDetail.templateObjId}).lean().then(
                                    retPromoCodeTemplate => {
                                        if (!retPromoCodeTemplate){
                                            return Promise.reject({
                                                name: "DataError",
                                                message: "Cannot get the promo code template"
                                            })
                                        }
                                        promoCodeTemplate = retPromoCodeTemplate;
                                        console.log("checking promoCodeTemplate", promoCodeTemplate)
                                        return dbconfig.collection_players.findOne({
                                            platform: platformObjId,
                                            name: playerName
                                        }).lean()
                                    }
                                ).then(
                                    playerData => {
                                        if (playerData) {
                                            player = playerData;

                                            return dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", true);
                                        } else {
                                            return Promise.reject({name: "DataError", message: "Invalid player data"});
                                        }
                                    }
                                ).then(
                                    playerState => {
                                        if (playerState) {
                                            newPromoCodeEntry.playerObjId = player._id;
                                            newPromoCodeEntry.code = dbUtil.generateRandomPositiveNumber(1000, 9999);
                                            newPromoCodeEntry.status = constPromoCodeStatus.AVAILABLE;
                                            newPromoCodeEntry.platformObjId = platformObjId;
                                            newPromoCodeEntry.promoCodeTemplateObjId = promoCodeTemplate._id;
                                            newPromoCodeEntry.hasPromoCodeTemplateObjId = true;
                                            newPromoCodeEntry.isSharedWithXIMA = promoCodeTemplate.isSharedWithXIMA;
                                            newPromoCodeEntry.disableWithdraw = promoCodeTemplate.disableWithdraw;
                                            newPromoCodeEntry.requiredConsumption = promoCodeTemplate.requiredConsumption;
                                            newPromoCodeEntry.amount = promoCodeTemplate.amount;
                                            newPromoCodeEntry.minTopUpAmount = promoCodeTemplate.minTopUpAmount;
                                            newPromoCodeEntry.isProviderGroup = promoCodeTemplate.isProviderGroup;
                                            newPromoCodeEntry.isDeleted = promoCodeTemplate.isDeleted;
                                            newPromoCodeEntry.allowedProviders = promoCodeTemplate.allowedProviders;
                                            newPromoCodeEntry.forbidWithdrawIfBalanceAfterUnlock = promoCodeTemplate.forbidWithdrawIfBalanceAfterUnlock;
                                            newPromoCodeEntry.createTime = new Date();
                                            let todayEndTime = dbUtil.getTodaySGTime().endTime;
                                            newPromoCodeEntry.expirationTime = dbUtil.getNdaylaterFromSpecificStartTime(promoCodeDetail.expiredInDay, todayEndTime);
                                            if (promoCodeDetail.maxRewardAmount) {
                                                newPromoCodeEntry.maxRewardAmount = promoCodeTemplate.maxRewardAmount;
                                            }
                                            code =  newPromoCodeEntry.code;
                                            expirationDate =  newPromoCodeEntry.expirationTime;
                                            isProviderGroup = newPromoCodeEntry.isProviderGroup;

                                            return dbconfig.collection_promoCodeActiveTime.findOne({
                                                platform: platformObjId,
                                                startTime: {$lt: new Date()},
                                                endTime: {$gt: new Date()}
                                            }).lean();
                                        }
                                    }
                                ).then(
                                    activeTimeRes => {
                                        if (activeTimeRes) {
                                            newPromoCodeEntry.isActive = true;
                                        }

                                        let updateData = {
                                            'data.promoCode': code || null,
                                            'data.expirationTime': expirationDate || null,
                                            'data.isProviderGroup': isProviderGroup || false,
                                            'data.allowedProvider$': providerGroup$ || false,
                                        };

                                        if (promoCodeTemplate.minTopUpAmount){
                                            updateData['data.minTopUpAmount'] = promoCodeTemplate.minTopUpAmount;
                                        }
                                        if (promoCodeTemplate.maxRewardAmount){
                                            updateData['data.maxRewardAmount'] = promoCodeTemplate.maxRewardAmount;
                                        }

                                        if (proposalData.data && proposalData.data.rewardType && (proposalData.data.rewardType == constRandomRewardType.PROMOCODE_B_DEPOSIT || proposalData.data.rewardType == constRandomRewardType.PROMOCODE_B_NO_DEPOSIT)){
                                            // if (promoCodeTemplate.amount){
                                            //     updateData['data.rewardAmount'] = promoCodeTemplate.amount;
                                            // }

                                            if (promoCodeTemplate.requiredConsumption){
                                                updateData['data.spendingAmount'] = promoCodeTemplate.requiredConsumption;
                                            }
                                        }
                                        else if (proposalData.data && proposalData.data.rewardType && proposalData.data.rewardType == constRandomRewardType.PROMOCODE_C){
                                            // if (promoCodeTemplate.amount){
                                            //     updateData['data.rewardPercentage'] = promoCodeTemplate.amount;
                                            // }

                                            if (promoCodeTemplate.requiredConsumption){
                                                updateData['data.spendingTimes'] = promoCodeTemplate.requiredConsumption;
                                            }
                                        }

                                        console.log("checking newPromoCodeEntry", newPromoCodeEntry)
                                        let promoCodeProm = new dbconfig.collection_promoCode(newPromoCodeEntry).save();
                                        let updateProposalProm = dbconfig.collection_proposal.findOneAndUpdate({_id: ObjectId(proposalData._id)}, updateData, {new: true}).lean();
                                        return Promise.all([promoCodeProm, updateProposalProm])
                                    }
                                ).then(
                                    retData => {
                                        if (retData[1] && retData[1].data){

                                            if (retData[1].data.rewardType && retData[1].data.rewardType == constRandomRewardType.PROMOCODE_B_DEPOSIT){
                                                sendMessageToPlayer(retData[1], constMessageType.RANDOM_REWARD_PROMO_CODE_B_DEPOSIT_SUCCESS, {});
                                            }
                                            else if (retData[1].data.rewardType && retData[1].data.rewardType == constRandomRewardType.PROMOCODE_B_NO_DEPOSIT){
                                                sendMessageToPlayer(retData[1], constMessageType.RANDOM_REWARD_PROMO_CODE_B_NO_DEPOSIT_SUCCESS, {});
                                            }
                                            else if (retData[1].data.rewardType && retData[1].data.rewardType == constRandomRewardType.PROMOCODE_C){
                                                sendMessageToPlayer(retData[1], constMessageType.RANDOM_REWARD_PROMO_CODE_C_SUCCESS, {});
                                            }
                                            dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                                            return retData[1]
                                        }
                                    }
                                ).catch(
                                    err => {
                                        console.log("checking error message", err)
                                        dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                                        throw err;
                                    }
                                )
                            }
                            else if (proposalData.data && proposalData.data.rewardType && proposalData.data.rewardType == constRandomRewardType.REWARD_POINTS && proposalData.data.hasOwnProperty("rewardedRewardPoint") && (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                                let userDevice = proposalData.inputDevice;
                                let playerObjId = proposalData.data.playerObjId;
                                let platformObjId = proposalData.data.platformId;
                                let updateAmount = proposalData.data.rewardedRewardPoint;
                                let remark = (proposalData.data.eventName || null) + ": " + proposalData.data.rewardName;
                                let creator = 'System';

                                sendMessageToPlayer(proposalData, constMessageType.RANDOM_REWARD_REWARD_POINTS_SUCCESS, {});
                                createRTGProm = dbPlayerInfo.updatePlayerRewardPointsRecord (playerObjId, platformObjId, updateAmount, remark, null, null, creator, userDevice)
                            }
                            else if (proposalData.data && proposalData.data.rewardType && proposalData.data.rewardType == constRandomRewardType.REAL_PRIZE && (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                                sendMessageToPlayer(proposalData, constMessageType.RANDOM_REWARD_REAL_PRIZE_SUCCESS, {});
                            }
                            else if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.hasOwnProperty("rewardRewardPoints") &&
                                (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED ||
                                    proposalData.status == constProposalStatus.APPROVE)) {
                                let userDevice = proposalData.inputDevice;
                                let playerObjId = proposalData.data.playerObjId;
                                let platformObjId = proposalData.data.platformId;
                                let updateAmount = proposalData.data.rewardPointsVariable;
                                let remark = proposalData.data.productName;
                                let creator = proposalData.data.seller || 'System';

                                sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_POINT_CHANGE_SUCCESS, {});
                                createRTGProm = dbPlayerInfo.updatePlayerRewardPointsRecord (playerObjId, platformObjId, updateAmount, remark, null, null, creator, userDevice)
                            }

                            return createRTGProm;
                        }
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player random reward proposal data"});
                }

                // to generate promoCodeTemplate
                function generatePromoCodeTemplate(rewardData, platformObjId) {
                    let allowedProviderList = [];
                    if (rewardData.allowedProvider){
                        allowedProviderList.push(ObjectId(rewardData.providerGroup));
                    }
                    let obj = {
                        platformObjId: platformObjId,
                        allowedProviders: allowedProviderList,
                        name: rewardData.title,
                        isSharedWithXIMA: rewardData.isSharedWithXIMA,
                        isProviderGroup: true,
                        genre: constPromoCodeTemplateGenre.RANDOM_REWARD,
                        expiredInDay: rewardData.expiredInDay,
                        disableWithdraw: rewardData.disableWithdraw,
                        forbidWithdrawIfBalanceAfterUnlock: rewardData.forbidWithdrawIfBalanceAfterUnlock,
                        minTopUpAmount: rewardData.minTopUpAmount,
                        createTime: new Date ()
                    }

                    if (rewardData.rewardType == constRandomRewardType.PROMOCODE_C){
                        obj.amount = rewardData.amountPercent*100;
                        obj.maxRewardAmount = rewardData.maxRewardAmount;
                        obj.requiredConsumption = rewardData.requiredConsumptionDynamic;
                        obj.type = 3; // dynamic case
                    }
                    else if (rewardData.rewardType == constRandomRewardType.PROMOCODE_B_DEPOSIT){
                        obj.amount = rewardData.amount;
                        obj.requiredConsumption = rewardData.requiredConsumptionFixed;
                        obj.minTopUpAmount = rewardData.minTopUpAmount;
                        obj.type = 1; // with top up requirement + fixed reward amount
                    }
                    else if (rewardData.rewardType == constRandomRewardType.PROMOCODE_B_NO_DEPOSIT){
                        obj.amount = rewardData.amount;
                        obj.requiredConsumption = rewardData.requiredConsumptionFixed;
                        obj.type = 2; // with top up requirement + fixed reward amount
                    }

                    let record = new dbconfig.collection_promoCodeTemplate(obj);
                    return record.save();
                }
            },

            executePlayerConsecutiveRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && !isNaN(parseInt(proposalData.data.rewardAmount)) ) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: 0,
                        providerGroup: proposalData.data.providerGroup
                    };

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP, proposalData);
                    deferred1.promise.then(
                        data => {
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            ).then(
                                playerData => {
                                    if(proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply){
                                        let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                        let newPermissionObj = {applyBonus: false};
                                        let remark = "优惠提案：" + proposalData.proposalId +  "(领取优惠后禁用提款)";
                                        dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                    return playerData;
                                }
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return group proposal data"});
                }
            },

            executePlayerConsumptionSlipRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && !isNaN(parseInt(proposalData.data.rewardAmount)) ) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: 0,
                        providerGroup: proposalData.data.providerGroup
                    };

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_CONSUMPTION_SLIP_REWARD_GROUP, proposalData);
                    deferred1.promise.then(
                        data => {
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            ).then(
                                playerData => {
                                    if(proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply){
                                        let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                        let newPermissionObj = {applyBonus: false};
                                        let remark = "优惠提案：" + proposalData.proposalId +  "(领取优惠后禁用提款)";
                                        dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                    return playerData;
                                }
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player top up return group proposal data"});
                }
            },

             executePlayerRetentionRewardGroup: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && (proposalData.data.rewardAmount || (proposalData.data.applyAmount && proposalData.data.isDynamicRewardAmount))) {
                    let rtgData;
                    /// applyAmount is 0 when getting the reward thru login
                    let amount = proposalData.data.actualAmount ? proposalData.data.actualAmount : (proposalData.data.applyAmount || 0);
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_RETENTION_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_RETENTION_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                        initAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount || 0,
                        providerGroup: proposalData.data.providerGroup
                    };

                    return createRTGForProposal(proposalData, taskData, constRewardType.PLAYER_RETENTION_REWARD_GROUP, proposalData).then(
                        data => {
                            rtgData = data;
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            return dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            )
                        }
                    ).then(
                        playerData => {
                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                let newPermissionObj = {applyBonus: false};
                                let remark = "优惠提案：" + proposalData.proposalId + "(领取优惠后禁用提款)";
                                dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                            }

                            return rtgData;
                        }
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player retention group proposal data"});
                }
            },

            executePlayerBonusDoubledRewardGroup: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId) {
                    let rtgData;
                    let amount = proposalData.data.actualAmount ? proposalData.data.actualAmount : (proposalData.data.applyAmount || 0);
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_BONUS_DOUBLED_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_BONUS_DOUBLED_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                        initAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + amount : proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount || 0,
                        providerGroup: proposalData.data.providerGroup
                    };

                    return createRTGForProposal(proposalData, taskData, constRewardType.PLAYER_BONUS_DOUBLED_REWARD_GROUP, proposalData).then(
                        data => {
                            rtgData = data;
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            return dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            )
                        }
                    ).then(
                        playerData => {
                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                let newPermissionObj = {applyBonus: false};
                                let remark = "优惠提案：" + proposalData.proposalId + "(领取优惠后禁用提款)";
                                dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                            }

                            return rtgData;
                        }
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player bonus doubled group proposal data"});
                }
            },

            executePlayerLoseReturnRewardGroup: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let rtgData;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: 0,
                        providerGroup: proposalData.data.providerGroup
                    };

                    return createRTGForProposal(proposalData, taskData, constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP, proposalData).then(
                        data => {
                            rtgData = data;
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            return dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            )
                        }
                    ).then(
                        playerData => {
                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                let newPermissionObj = {applyBonus: false};
                                let remark = "优惠提案：" + proposalData.proposalId + "(领取优惠后禁用提款)";
                                dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                            }

                            return rtgData;
                        }
                    )
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player lose return group proposal data"});
                }
            },

            executePlayerConsumptionRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount,
                        providerGroup: proposalData.data.providerGroup
                    };

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP, proposalData);
                    deferred1.promise.then(
                        data => {
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            ).then(
                                playerData => {
                                    if(proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply){
                                        let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                        let newPermissionObj = {applyBonus: false};
                                        let remark = "优惠提案：" + proposalData.proposalId +  "(领取优惠后禁用提款)";
                                        dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                    return playerData;
                                }
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player consumption return group proposal data"
                    });
                }
            },

            executePlayerFreeTrialRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        providerGroup: proposalData.data.providerGroup,
                        lastLoginIp: proposalData.data.lastLoginIp,
                        phoneNumber: proposalData.data.phoneNumber
                    };

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP, proposalData);
                    deferred1.promise.then(
                        data => {
                            let updateData = {$set: {}};

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            ).then(
                                playerData => {
                                    if(proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply){
                                        let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                        let newPermissionObj = {applyBonus: false};
                                        let remark = "优惠提案：" + proposalData.proposalId +  "(领取优惠后禁用提款)";
                                        dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj);
                                    }
                                    return playerData;
                                }
                            ).then(
                                () => {
                                    deferred.resolve(data);
                                },
                                deferred.reject
                            );
                        },
                        deferred.reject
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player free trial reward group proposal data"});
                }
            },

            executeBaccaratRewardGroup: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let rtgData;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.BACCARAT_REWARD_GROUP,
                        rewardType: constRewardType.BACCARAT_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        providerGroup: proposalData.data.providerGroup
                    };

                    return createRTGForProposal(proposalData, taskData, constRewardType.BACCARAT_REWARD_GROUP, proposalData).then(
                        data => {
                            let updateData = {$set: {}};
                            rtgData = data;

                            if (proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply) {
                                updateData.$set["permission.applyBonus"] = false;
                            }

                            return dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateData
                            );
                        }
                    ).then(
                        playerData => {
                            if(proposalData.data.hasOwnProperty('forbidWithdrawAfterApply') && proposalData.data.forbidWithdrawAfterApply){
                                let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                let newPermissionObj = {applyBonus: false};
                                let remark = "优惠提案：" + proposalData.proposalId +  "(领取优惠后禁用提款)";
                                dbPlayerUtil.addPlayerPermissionLog(null, proposalData.data.platformId, proposalData.data.playerObjId, remark, oldPermissionObj, newPermissionObj).catch(
                                    err => {
                                        console.log("Fail to update player permission for reward pid:", proposalData.proposalId, err);
                                    }
                                );
                            }
                            return rtgData;
                        }
                    );
                }
                else {
                    return Promise.reject({name: "DataError", message: "Incorrect player free trial reward group proposal data"});
                }
            },

            executePlayerAddRewardPoints: function (proposalData, deferred) {
                if(proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && Number.isInteger(proposalData.data.updateAmount) && proposalData.data.category) {
                    let playerObjId = proposalData.data.playerObjId;
                    let platformObjId = proposalData.data.platformObjId;
                    let updateAmount = proposalData.data.updateAmount;
                    let category = proposalData.data.category;
                    let remark = proposalData.data.remark;
                    let userAgent = proposalData.data.userAgent;
                    let adminName = proposalData.data.adminName;

                    dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, updateAmount, category, remark, userAgent, adminName,
                        null, null, null, null, proposalData.proposalId).then(
                        data => {
                            deferred.resolve(data);
                        }
                    );
                } else {
                    deferred.reject({name: "DataError", message: "Incorrect player add reward points proposal data"});
                }
            },

            executePlayerMinusRewardPoints: function (proposalData, deferred) {
                if(proposalData.proposalId) {
                    dbRewardPointsLog.updateConvertRewardPointsLog(proposalData.proposalId, constRewardPointsLogStatus.PROCESSED, null);
                    deferred.resolve(true);
                } else {
                    deferred.reject({name: "DataError", message: "Incorrect player minus reward points proposal data"});
                }
            },

            executePlayerConvertRewardPoints: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.playerRewardPointsObjId) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        platformId: proposalData.data.platformObjId,
                        type: constRewardType.PLAYER_EARLY_POINT_CONVERSION,
                        rewardType: constRewardType.PLAYER_EARLY_POINT_CONVERSION,
                        currentAmount: proposalData.data.convertCredit,
                        initAmount: proposalData.data.convertCredit,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        providerGroup: proposalData.data.providerGroup,
                        applyAmount: 0,
                        data: {
                            category: constRewardPointsLogCategory.EARLY_POINT_CONVERSION,
                            convertedRewardPointsAmount: proposalData.data.convertedRewardPoints,
                            rewardPointsObjId: proposalData.data.playerRewardPointsObjId
                        },

                    };
                    let deferred1 = Q.defer();
                    createRewardPointsTaskForProposal(proposalData, taskData, deferred1, constProposalType.PLAYER_CONVERT_REWARD_POINTS, proposalData);
                    deferred1.promise.then(
                        data => deferred.resolve(data),
                        error => deferred.reject(error)
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player convert reward points proposal data"});
                }
            },

            executePlayerAutoConvertRewardPoints: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.playerRewardPointsObjId) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        platformId: proposalData.data.platformObjId,
                        type: constRewardType.PLAYER_PERIOD_POINT_CONVERSION,
                        rewardType: constRewardType.PLAYER_PERIOD_POINT_CONVERSION,
                        currentAmount: proposalData.data.convertCredit,
                        initAmount: proposalData.data.convertCredit,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        providerGroup: proposalData.data.providerGroup,
                        applyAmount: 0,
                        data: {
                            category: constRewardPointsLogCategory.PERIOD_POINT_CONVERSION,
                            convertedRewardPointsAmount: proposalData.data.convertedRewardPoints,
                            rewardPointsObjId: proposalData.data.playerRewardPointsObjId
                        },
                    };
                    let deferred1 = Q.defer();
                    createRewardPointsTaskForProposal(proposalData, taskData, deferred1, constProposalType.PLAYER_AUTO_CONVERT_REWARD_POINTS, proposalData);
                    deferred1.promise.then(
                        data => deferred.resolve(data),
                        error => deferred.reject(error)
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player auto convert reward points proposal data"});
                }
            },

            executeCustomizePartnerCommRate: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                    let prom = Promise.resolve(true);

                    if (proposalData.data.settingObjId) {
                        if (proposalData.data.isPlatformRate) {
                            prom = updatePartnerCommRateConfig(proposalData);
                        } else {
                            if (proposalData.data.isMultiLevel) {
                                prom = dbPartnerCommissionConfig.updatePartnerMultiLvlCommissionConfig(proposalData);
                            } else {
                                prom = updatePartnerCommissionConfig(proposalData);
                            }
                        }
                    }

                    if (proposalData.data.isResetAll) {
                        if (proposalData.data.isMultiLevel) {
                            prom = dbPartnerCommissionConfig.resetPartnerMultiLvlCommissionData(proposalData);
                        } else {
                            prom = resetAllCustomizedCommissionRate(proposalData);
                        }
                    }

                    if (proposalData.data.isEditAll) {
                        if (proposalData.data.newConfigArr && proposalData.data.newConfigArr.length > 0) {
                            if (proposalData.data.isMultiLevel) {
                                prom = dbPartnerCommissionConfig.updateAllMultiLvlCustomizeCommissionRate(proposalData);
                            } else {
                                prom = updateAllCustomizeCommissionRate(proposalData);
                            }
                        }
                    }

                    prom.then(
                        data => {
                            updatePartnerCommissionType(proposalData);
                            dbEmailNotification.sendNotifyEditPartnerCommissionEmail(proposalData).catch(err => {
                                console.log("sendNotifyEditPartnerCommissionEmail failed", err);
                            });
                            deferred.resolve(data);
                        },
                        error => deferred.reject(error)
                    )
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect customize partner commission rate data"});
                }
            },

            executeSettlePartnerCommission: function (proposalData, deferred) {
                const constPartnerCommissionLogStatus = require("./../const/constPartnerCommissionLogStatus");
                if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    return dbPartner.changePartnerCredit(proposalData.data.partnerObjId, proposalData.data.platformObjId, proposalData.data.amount, constProposalType.SETTLE_PARTNER_COMMISSION, proposalData).then(
                        partnerCreditChanged => {
                            if (proposalData.data.settleType == constPartnerCommissionLogStatus.EXECUTED_THEN_RESET) {
                                let originalRemark = proposalData.data.remark && proposalData.data.remark.slice(6);
                                let remark = "(" + proposalData.proposalId + ") " + originalRemark;
                                return dbPartner.applyClearPartnerCredit(proposalData.data.partnerObjId, {commissionType: proposalData.data.commissionType, _id: proposalData.data.logObjId}, proposalData.data.adminName, remark);
                            }
                            return Promise.resolve();
                        }
                    ).then(
                        data => deferred.resolve(data),
                        error => deferred.reject(error)
                    );
                }
            },

            executeUpdateParentPartnerCommission: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    return dbPartner.changePartnerCredit(proposalData.data.partnerObjId, proposalData.data.platformObjId, proposalData.data.amount, constProposalType.UPDATE_PARENT_PARTNER_COMMISSION, proposalData).then(
                        data => deferred.resolve(data),
                        error => deferred.reject(error)
                    );
                }
            },

            executePartnerCreditTransferToDownline: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    return dbPartner.changePartnerCredit(proposalData.data.partnerObjId, proposalData.data.platformObjId, proposalData.data.amount, constProposalType.PARTNER_CREDIT_TRANSFER_TO_DOWNLINE, proposalData).then(
                        data => {
                            return dbPlayerInfo.creditTransferedFromPartner(proposalData.proposalId, proposalData.data.platformObjId).then(
                                creditTransferedData => deferred.resolve(creditTransferedData),
                                error => deferred.reject(error)
                            )
                        },
                        error => deferred.reject(error)
                    );
                }
            },

            executeBulkExportPlayerData: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.proposalId) {
                    return dbPlayerFeedback.getExportedData(proposalData.proposalId).then(
                        data => deferred.resolve(data),
                        error => deferred.reject(error)
                    );
                } else {
                    return deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            executeFinancialPointsAdd: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.platformId && proposalData.data.updateAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    return dbPlatform.changePlatformFinancialPoints(proposalData.data.platformId, proposalData.data.updateAmount)
                        .then(
                            data => deferred.resolve(data),
                            error => deferred.reject(error)
                        );
                } else {
                    deferred.reject({name: "DataError", message: "Invalid input data"});
                }
            },

            executeFinancialPointsDeduct: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.platformId && proposalData.data.updateAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    return dbPlatform.changePlatformFinancialPoints(proposalData.data.platformId, proposalData.data.updateAmount)
                        .then(
                            data => deferred.resolve(data),
                            error => deferred.reject(error)
                        );
                } else {
                    deferred.reject({name: "DataError", message: "Invalid input data"});
                }
            },

            executeAuctionPromoCode: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.templateObjId && (proposalData.status == constProposalStatus.PENDING)) {
                    if (proposalData.data.type == 1){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_PROMO_CODE_B_PENDING, {});
                    }
                    else if (proposalData.data.type == 3){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_PROMO_CODE_C_PENDING, {});
                    }
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && proposalData.data.templateObjId && (proposalData.status == constProposalStatus.REJECTED)) {

                    if (proposalData.data.type == 1){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_PROMO_CODE_B_REJECT, {});
                    }
                    else if (proposalData.data.type == 3){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_PROMO_CODE_C_REJECT, {});
                    }
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && proposalData.data.templateObjId && (proposalData.status == constProposalStatus.SUCCESS ||
                    proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                    let code = null;
                    let expirationDate = null;
                    let isProviderGroup = null;
                    let promoCodeTemplateData = null;
                    let player;
                    let newPromoCodeEntry = {};
                    let platformObjId = proposalData && proposalData.data && proposalData.data.platformId ? proposalData.data.platformId : null;
                    let playerName = proposalData && proposalData.data && proposalData.data.playerName ? proposalData.data.playerName : null;

                    return dbconfig.collection_promoCodeTemplate.findOne({_id: ObjectId(proposalData.data.templateObjId)}).lean().then(
                        promoCodeTemplate => {
                            if (promoCodeTemplate && promoCodeTemplate._id) {
                                promoCodeTemplateData = promoCodeTemplate;
                                // Check if player exist
                                return dbconfig.collection_players.findOne({
                                    platform: platformObjId,
                                    name: playerName
                                }).lean();
                            }
                        }
                    ).then(
                        playerData => {
                            if (playerData) {
                                player = playerData;

                                return dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", true);
                            } else {
                                return Promise.reject({name: "DataError", message: "Invalid player data"});
                            }
                        }
                    ).then(
                        playerState => {
                            if (playerState) {
                                newPromoCodeEntry.playerObjId = player._id;
                                newPromoCodeEntry.code = dbUtil.generateRandomPositiveNumber(1000, 9999);
                                newPromoCodeEntry.status = constPromoCodeStatus.AVAILABLE;
                                newPromoCodeEntry.platformObjId = platformObjId;
                                newPromoCodeEntry.promoCodeTemplateObjId = promoCodeTemplateData._id;
                                newPromoCodeEntry.hasPromoCodeTemplateObjId = true;
                                newPromoCodeEntry.isSharedWithXIMA = promoCodeTemplateData.isSharedWithXIMA;
                                newPromoCodeEntry.disableWithdraw = promoCodeTemplateData.disableWithdraw;
                                newPromoCodeEntry.requiredConsumption = promoCodeTemplateData.requiredConsumption;
                                newPromoCodeEntry.amount = promoCodeTemplateData.amount;
                                newPromoCodeEntry.minTopUpAmount = promoCodeTemplateData.minTopUpAmount;
                                newPromoCodeEntry.isProviderGroup = promoCodeTemplateData.isProviderGroup;
                                newPromoCodeEntry.isDeleted = promoCodeTemplateData.isDeleted;
                                newPromoCodeEntry.allowedProviders = promoCodeTemplateData.allowedProviders;
                                newPromoCodeEntry.createTime = new Date();
                                let todayEndTime = dbUtil.getTodaySGTime().endTime;
                                newPromoCodeEntry.expirationTime = dbUtil.getNdaylaterFromSpecificStartTime(promoCodeTemplateData.expiredInDay, todayEndTime);
                                if (promoCodeTemplateData.maxRewardAmount) {
                                    newPromoCodeEntry.maxRewardAmount = promoCodeTemplateData.maxRewardAmount;
                                }
                                code =  newPromoCodeEntry.code;
                                expirationDate =  newPromoCodeEntry.expirationTime;
                                isProviderGroup = newPromoCodeEntry.isProviderGroup;

                                return dbconfig.collection_promoCodeActiveTime.findOne({
                                    platform: platformObjId,
                                    startTime: {$lt: new Date()},
                                    endTime: {$gt: new Date()}
                                }).lean();
                            }
                        }
                    ).then(
                        activeTimeRes => {
                            if (activeTimeRes) {
                                newPromoCodeEntry.isActive = true;
                            }

                            let updateData = {
                                'data.promoCode': code || null,
                                'data.expirationTime': expirationDate || null,
                                'data.isProviderGroup': isProviderGroup || false,
                            };

                            let promoCodeProm = new dbconfig.collection_promoCode(newPromoCodeEntry).save();
                            let updateProposalProm = dbconfig.collection_proposal.findOneAndUpdate({_id: ObjectId(proposalData._id)}, updateData, {new: true}).lean();
                            return Promise.all([promoCodeProm, updateProposalProm])
                        }
                    ).then(
                        retData => {
                            if (retData[1] && retData[1].data){

                                if (retData[1].data.type && retData[1].data.type == 1){
                                    sendMessageToPlayer(retData[1], constMessageType.AUCTION_PROMO_CODE_B_SUCCESS, {});
                                }
                                else if (retData[1].data.type && retData[1].data.type == 3){
                                    sendMessageToPlayer(retData[1], constMessageType.AUCTION_PROMO_CODE_C_SUCCESS, {});
                                }
                                dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                                return retData[1]
                            }
                        }
                    ).catch(
                        err => {
                            console.log("checking error message", err)
                            dbPlayerUtil.setPlayerBState(player._id, "generatePromoCode", false).catch(errorUtils.reportError);
                            throw err;
                        }
                    )
                }
                else {
                    return Promise.resolve();
                }
            },

            executeAuctionOpenPromoCode: function (proposalData) {
                console.log("checking proposal data.status", proposalData.status)

                if (proposalData && proposalData.data && proposalData.data.templateObjId && (proposalData.status == constProposalStatus.SUCCESS ||
                    proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                    let code = null;
                    let expirationDate = null;
                    let isProviderGroup = null;
                    // find the open promo code template to update its expiration time and the status
                    return dbconfig.collection_openPromoCodeTemplate.findOne({_id: ObjectId(proposalData.data.templateObjId)}).lean().then(
                        openPromoCodeTemplate => {
                            if (openPromoCodeTemplate && openPromoCodeTemplate.hasOwnProperty("expiredInDay")){
                                let todayEndTime = dbUtil.getTodaySGTime().endTime;
                                expirationDate = dbUtil.getNdaylaterFromSpecificStartTime(openPromoCodeTemplate.expiredInDay, todayEndTime);
                                code = openPromoCodeTemplate.code;
                                isProviderGroup = openPromoCodeTemplate.isProviderGroup;
                                let updateObj = {
                                    expirationTime: expirationDate,
                                    status: constPromoCodeStatus.AVAILABLE
                                };

                                return dbconfig.collection_openPromoCodeTemplate.findOneAndUpdate({_id: openPromoCodeTemplate._id}, updateObj, {new:true}).lean();
                            }
                            return Promise.resolve();
                        }
                    ).then(
                        () => {
                            let updateData = {
                                'data.promoCode': code || null,
                                'data.expirationTime': expirationDate || null,
                                'data.isProviderGroup': isProviderGroup || false,
                            };

                            return dbconfig.collection_proposal.findOneAndUpdate({_id: ObjectId(proposalData._id)}, updateData, {new: true}).lean();
                        }
                    ).then(
                        updatedProposalData => {
                            if (updatedProposalData && updatedProposalData.data){

                                if (updatedProposalData.data.type && updatedProposalData.data.type == 1){
                                    sendMessageToPlayer(updatedProposalData, constMessageType.AUCTION_OPEN_PROMO_CODE_B_SUCCESS, {});
                                }
                                else if (updatedProposalData.type && updatedProposalData.data.type == 3){
                                    sendMessageToPlayer(updatedProposalData, constMessageType.AUCTION_OPEN_PROMO_CODE_C_SUCCESS, {});
                                }

                                return updatedProposalData
                            }
                        }
                    ).catch(
                        err => {
                            console.log("error when execute the auction openPromoCode", err);
                        }

                    )
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.PENDING)) {
                    if (proposalData.data.type == 1){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_OPEN_PROMO_CODE_B_PENDING, {});
                    }
                    else if (proposalData.data.type == 3){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_OPEN_PROMO_CODE_C_PENDING, {});
                    }
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.REJECTED)) {
                    if (proposalData.data.type == 1){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_OPEN_PROMO_CODE_B_REJECT, {});
                    }
                    else if (proposalData.data.type == 3){
                        sendMessageToPlayer(proposalData, constMessageType.AUCTION_OPEN_PROMO_CODE_C_REJECT, {});
                    }
                    return Promise.resolve(proposalData);
                }
                else {
                    return Promise.resolve();
                }
            },

            executePlayerAuctionPromotionReward: function (proposalData) {
                if (!(proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.platformId)) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Incorrect player auction promotion reward proposal data"
                    });
                }

                let taskData = {
                    playerId: proposalData.data.playerObjId,
                    platformId: proposalData.data.platformId,
                    requiredUnlockAmount: proposalData.data.requiredUnlockAmount,
                    currentAmount: proposalData.data.rewardAmount,
                    initAmount: proposalData.data.rewardAmount,
                    useConsumption: Boolean(proposalData.data.useConsumption),
                    applyAmount: proposalData.data.applyAmount || 0,
                    providerGroup: proposalData.data.providerGroup,
                    requiredUnlockAmount: proposalData.data.requiredUnlockAmount,
                    useConsumption: proposalData.data.useConsumption,
                    isGroupReward: proposalData.data.isGroupReward,
                    type: constProposalType.PLAYER_AUCTION_PROMOTION_REWARD,
                    rewardType: constProposalType.PLAYER_AUCTION_PROMOTION_REWARD,
                    eventCode:  "manualReward",
                };

                return createRTGForProposal(proposalData, taskData, constProposalType.PLAYER_AUCTION_PROMOTION_REWARD, proposalData);
            },

            executeAuctionRewardPromotion: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformId && (proposalData.status == constProposalStatus.SUCCESS ||
                    proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                    // create reward proposal
                    return dbconfig.collection_proposalType.findOne({
                        platformId: ObjectId(proposalData.data.platformId),
                        name: constProposalType.PLAYER_AUCTION_PROMOTION_REWARD
                    }).lean().then(
                        proposalTypeData => {
                            if (!proposalTypeData){
                                return Promise.reject({
                                    name: "DataError",
                                    message: "Cannot find proposal type"
                                })
                            }

                            let proposalObj = {
                                type: proposalTypeData._id,
                                creator:
                                    {
                                        type: 'player',
                                        name: proposalData.data.playerName,
                                        id: proposalData.data.playerObjId
                                    },
                                data: {
                                    playerId: proposalData.data.playerObjId,
                                    playerObjId: proposalData.data.playerObjId,
                                    platformId: proposalData.data.platformId,
                                    requiredUnlockAmount: proposalData.data.requiredUnlockAmount,
                                    rewardAmount: proposalData.data.rewardAmount,
                                    useConsumption: Boolean(proposalData.data.useConsumption),
                                    applyAmount: proposalData.data.applyAmount || 0,
                                    providerGroup: proposalData.data.providerGroup,
                                    requiredUnlockAmount: proposalData.data.requiredUnlockAmount,
                                    useConsumption: proposalData.data.useConsumption,
                                    isGroupReward: proposalData.data.isGroupReward,
                                    type: constProposalType.PLAYER_AUCTION_PROMOTION_REWARD,
                                    rewardType: constProposalType.PLAYER_AUCTION_PROMOTION_REWARD,
                                    eventCode:  "manualReward",
                                },
                                entryType: constProposalEntryType.CLIENT,
                                userType: constProposalUserType.PLAYERS
                            };

                            proposalObj.inputDevice = proposalData.inputDevice;

                            sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_PROMOTION_SUCCESS, {});
                            return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalObj);
                        }
                    )
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.PENDING)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_PROMOTION_PENDING, {});
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.REJECTED)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_PROMOTION_REJECT, {});
                    return Promise.resolve(proposalData);
                }
                else {
                    return Promise.resolve();
                }
            },

            executeAuctionRealPrize: function (proposalData) {
                if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.SUCCESS ||
                    proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.APPROVE)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REAL_PRIZE_SUCCESS, {});
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.PENDING)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REAL_PRIZE_PENDING, {});
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.REJECTED)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REAL_PRIZE_REJECT, {});
                    return Promise.resolve(proposalData);
                }
                else {
                    return Promise.resolve();
                }
            },

            executeAuctionRewardPointChange: function (proposalData) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.hasOwnProperty("rewardPointsVariable") &&
                    (proposalData.status == constProposalStatus.SUCCESS || proposalData.status == constProposalStatus.APPROVED ||
                    proposalData.status == constProposalStatus.APPROVE)) {

                    let userDevice = proposalData.inputDevice;
                    let playerObjId = proposalData.data.playerObjId;
                    let platformObjId = proposalData.data.platformId;
                    let updateAmount = proposalData.data.rewardPointsVariable;
                    let remark = proposalData.data.productName;
                    let creator = proposalData.data.seller || 'System';

                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_POINT_CHANGE_SUCCESS, {});
                    return dbPlayerInfo.updatePlayerRewardPointsRecord (playerObjId, platformObjId, updateAmount, remark, null, null, creator, userDevice)
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.PENDING)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_POINT_CHANGE_PENDING, {});
                    return Promise.resolve(proposalData);
                }
                else if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.REJECTED)) {
                    sendMessageToPlayer(proposalData, constMessageType.AUCTION_REWARD_POINT_CHANGE_REJECT, {});
                    return Promise.resolve(proposalData);
                }
                else {
                    return Promise.resolve();
                }
            },

        },

        /**
         * rejection functions
         * MARK:: all function name must follow the same naming convention
         * Example:: reject + <proposal type name>
         */
        rejections: {
            /**
             * common reject function for proposal
             */
            rejectProposal: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerCredit proposal
             */
            rejectUpdatePlayerCredit: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.updateAmount < 0) {
                    //todo::add more reasons here, ex:cancel request
                    return proposalExecutor.refundPlayer(proposalData, -proposalData.data.updateAmount, constPlayerCreditChangeType.REJECT_UPDATE_PLAYER_CREDIT)
                        .then(
                            res => deferred.resolve("Proposal is rejected"),
                            error => deferred.reject(error)
                        );
                }
                else {
                    deferred.resolve("Proposal is rejected");
                }
            },

            /**
             * reject function for FixPlayerCreditTransfer proposal
             */
            rejectFixPlayerCreditTransfer: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for PlayerConsumptionReturnFix proposal
             */
            rejectPlayerConsumptionReturnFix: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerEmail proposal
             */
            rejectUpdatePlayerEmail: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerQQ proposal
             */
            rejectUpdatePlayerQQ: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerQQ proposal
             */
            rejectUpdatePlayerWeChat: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerPhone proposal
             */
            rejectUpdatePlayerPhone: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerInfo proposal
             */
            rejectUpdatePlayerInfo: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerInfoPartner proposal
             */
            rejectUpdatePlayerInfoPartner: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerInfoLevel proposal
             */
            rejectUpdatePlayerInfoLevel: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerInfoAccAdmin proposal
             */
            rejectUpdatePlayerInfoAccAdmin: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerRealName proposal
             */
            rejectUpdatePlayerRealName: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePlayerBankInfo proposal
             */
            rejectUpdatePlayerBankInfo: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerBankInfo proposal
             */
            rejectUpdatePartnerBankInfo: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerPhone proposal
             */
            rejectUpdatePartnerPhone: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerEmail proposal
             */
            rejectUpdatePartnerEmail: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerWeChat proposal
             */
            rejectUpdatePartnerWeChat: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerInfo proposal
             */
            rejectUpdatePartnerInfo: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerRealName proposal
             */
            rejectUpdatePartnerRealName: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerCommissionType proposal
             */
            rejectUpdatePartnerCommissionType: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdateChildPartner proposal
             */
            rejectUpdateChildPartner: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for UpdatePartnerCredit proposal
             */
            rejectUpdatePartnerCredit: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.updateAmount < 0) {
                    //todo::add more reasons here, ex:cancel request
                    return proposalExecutor.refundPartner(proposalData, -proposalData.data.updateAmount, "rejectUpdatePartnerCredit")
                        .then(
                            res => deferred.resolve("Proposal is rejected"),
                            error => deferred.reject(error)
                        );
                }
                else {
                    deferred.resolve("Proposal is rejected");
                }
            },


            /**
             * reject function for FullAttendance proposal
             */
            rejectFullAttendance: function (proposalData, deferred) {
                //todo::send reject reason to player
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for game provider reward
             */
            rejectGameProviderReward: function (proposalData, deferred) {
                //todo::send reject reason to player
                proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, constPlayerCreditChangeType.REJECT_GAME_PROVIDER_REWARD).then(deferred.resolve, deferred.reject);
            },

            /**
             * reject function for first top up reward
             */
            rejectFirstTopUp: function (proposalData, deferred) {
                //todo::send reject reason to player
                //clean top up records that are used for application
                proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, constPlayerCreditChangeType.REJECT_FIRST_TOP_UP).then(
                    () => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject)
                );

            },

            /**
             * reject function for platform Transaction reward
             */
            rejectPlatformTransactionReward: function (proposalData, deferred) {
                //todo::send reject reason to player
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for partner referral reward
             */
            rejectPartnerReferralReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for partner incentive reward
             */
            rejectPartnerIncentiveReward: function (proposalData, deferred) {
                //todo::send reject reason to player
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for partner consumption return reward
             */
            rejectPartnerConsumptionReturn: function (proposalData, deferred) {
                //todo::send reject reason to partner
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for manual export ts phone
             */
            rejectManualExportTsPhone: function (proposalData, deferred) {
                let proposalId = proposalData && proposalData.data && proposalData.data.phoneTradeProposalId? proposalData.data.phoneTradeProposalId: proposalData.proposalId;
                dbconfig.collection_tsPhoneTrade.find({proposalId: proposalId}).lean().then(
                    tsPhoneTrades => {
                        let objIds = tsPhoneTrades.map(trade => trade._id);

                        let proms = [];

                        objIds.map(objId => {
                            let prom = dbconfig.collection_tsPhoneTrade.update({_id: objId}, {$unset: {proposalId: ""}}).catch(
                                err => {
                                    console.log("unset proposalId failed for phonetrade", objId, err);
                                }
                            );

                            proms.push(prom);
                        });

                        return Promise.all(proms);
                    }
                ).catch(err => {
                    console.log("rejectManualExportTsPhone failed", err);
                });

                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for partner consumption return reward
             */
            rejectPlayerConsumptionReturn: function (proposalData, deferred) {
                // deferred.resolve("Proposal is rejected");

                //clean record or reset amount
                if (proposalData && proposalData.data && proposalData.data.summaryIds) {
                    dbconfig.collection_playerConsumptionSummary.find(
                        {_id: {$in: proposalData.data.summaryIds}}
                    ).lean().then(
                        summaryRecords => {
                            if (summaryRecords && summaryRecords.length > 0) {
                                var summaryProms = summaryRecords.map(
                                    summary => {
                                        dbconfig.collection_playerConsumptionSummary.findOne({
                                            platformId: summary.platformId,
                                            playerId: summary.playerId,
                                            gameType: summary.gameType,
                                            summaryDay: summary.summaryDay,
                                            bDirty: false
                                        }).lean().then(
                                            cleanRecord => {
                                                if (cleanRecord) {
                                                    //recover amount
                                                    // cleanRecord.amount = cleanRecord.amount + summary.amount;
                                                    // cleanRecord.validAmount = cleanRecord.validAmount + summary.validAmount;
                                                    return dbconfig.collection_playerConsumptionSummary.findOneAndUpdate(
                                                        {
                                                            _id: cleanRecord._id,
                                                            platformId: cleanRecord.platformId,
                                                            playerId: cleanRecord.playerId,
                                                            gameType: cleanRecord.gameType,
                                                            summaryDay: cleanRecord.summaryDay,
                                                            bDirty: false
                                                        },
                                                        {
                                                            $inc: {amount: summary.amount, validAmount: summary.validAmount},
                                                        }
                                                    ).then(
                                                        () => dbconfig.collection_playerConsumptionSummary.remove({_id: summary._id})
                                                    );
                                                }
                                                else {
                                                    //clean record
                                                    return dbconfig.collection_playerConsumptionSummary.remove({_id: summary._id}).then(
                                                        () => {
                                                            summary.bDirty = false;
                                                            var newCleanRecord = new dbconfig.collection_playerConsumptionSummary(summary);
                                                            return newCleanRecord.save();
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                );
                                return Q.all(summaryProms);
                            }
                        }
                    ).then(
                        () => deferred.resolve("Proposal is rejected")
                    );
                }
                else {
                    deferred.resolve("Proposal is rejected");
                }
            },

            /**
             * reject function for player top up
             */
            rejectPlayerTopUp: function (proposalData, deferred) {
                let paymentSystemId;

                if (proposalData && proposalData.data && proposalData.data.topUpSystemType) {
                    paymentSystemId = proposalData.data.topUpSystemType;
                }

                RESTUtils.getPMS2Services("postCancelTopup", {proposalId: proposalData.proposalId}, paymentSystemId).then(deferred.resolve, deferred.reject);
            },

            rejectPlayerFKPTopUp: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player alipay top up
             */
            rejectPlayerAlipayTopUp: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.topUpSystemType
                    && proposalData.data.topUpSystemName && proposalData.data.topUpSystemName !== 'FPMS') {
                    let data = {
                        proposalId: proposalData.proposalId
                    };

                    return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType).then(deferred.resolve, deferred.reject);
                } else {
                    //deduct alipay daily quota
                    if (proposalData.data && proposalData.data.alipayAccount && proposalData.data.platform && proposalData.data.amount) {
                        dbconfig.collection_platformAlipayList.findOneAndUpdate(
                            {
                                accountNumber: proposalData.data.alipayAccount,
                                platformId: proposalData.data.platform
                            },
                            {
                                $inc: {quotaUsed: -proposalData.data.amount}
                            }
                        ).then(
                            deferred.resolve, deferred.reject
                        );
                    } else {
                        deferred.reject("Proposal is rejected");
                    }
                }
            },

            /**
             * reject function for player wechat top up
             */
            rejectPlayerWechatTopUp: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.topUpSystemType
                    && proposalData.data.topUpSystemName && proposalData.data.topUpSystemName !== 'FPMS') {
                    let data = {
                        proposalId: proposalData.proposalId
                    };

                    return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType).then(deferred.resolve, deferred.reject);
                } else {
                    //deduct wechatpay daily quota
                    if (proposalData.data && proposalData.data.weChatAccount && proposalData.data.platform && proposalData.data.amount) {
                        dbconfig.collection_platformWechatPayList.findOneAndUpdate(
                            {
                                accountNumber: proposalData.data.weChatAccount,
                                platformId: proposalData.data.platform
                            },
                            {
                                $inc: {quotaUsed: -proposalData.data.amount}
                            }
                        ).then(
                            deferred.resolve, deferred.reject
                        );
                    } else {
                        deferred.reject("Proposal is rejected");
                    }
                }
                //deferred.resolve("Proposal is rejected")
            },

            /**
             * reject function for player top up return
             */
            rejectPlayerTopUpReturn: function (proposalData, deferred) {
                //clean top up records that are used for application
                proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, constPlayerCreditChangeType.REJECT_PLAYER_TOP_UP_RETURN).then(
                    () => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject)
                );
            },

            /**
             * reject function for player consumption incentive
             */
            rejectPlayerConsumptionIncentive: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player manual top up
             */
            rejectManualPlayerTopUp: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.topUpSystemType
                    && proposalData.data.topUpSystemName && proposalData.data.topUpSystemName !== 'FPMS') {
                    let data = {
                        proposalId: proposalData.proposalId
                    };

                    return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType).then(deferred.resolve, deferred.reject);
                } else {
                    //deduct bank daily quota
                    if (proposalData.data && proposalData.data.bankCardNo && proposalData.data.platform && proposalData.data.amount) {
                        dbconfig.collection_platformBankCardList.findOneAndUpdate(
                            {
                                accountNumber: proposalData.data.bankCardNo,
                                platformId: proposalData.data.platform
                            },
                            {
                                $inc: {quotaUsed: -proposalData.data.amount}
                            }
                        ).then(
                            deferred.resolve, deferred.reject
                        );
                    } else {
                        deferred.reject("Proposal is rejected");
                    }
                }
            },

            /**
             * reject function for player assign manual top up
             */
            rejectPlayerAssignTopUp: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.topUpSystemType
                    && proposalData.data.topUpSystemName && proposalData.data.topUpSystemName !== 'FPMS') {
                    let data = {
                        proposalId: proposalData.proposalId
                    };

                    return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType).then(deferred.resolve, deferred.reject);
                } else {
                    //deduct bank daily quota
                    if (proposalData.data && proposalData.data.bankCardNo && proposalData.data.platform && proposalData.data.amount) {
                        dbconfig.collection_platformBankCardList.findOneAndUpdate(
                            {
                                accountNumber: proposalData.data.bankCardNo,
                                platformId: proposalData.data.platform
                            },
                            {
                                $inc: {quotaUsed: -proposalData.data.amount}
                            }
                        ).then(
                            deferred.resolve, deferred.reject
                        );
                    } else {
                        deferred.reject("Proposal is rejected");
                    }
                }
            },

            /**
             * reject function for player bonus
             */
            rejectPlayerBonus: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.largeWithdrawalLog) {
                    if (dbLargeWithdrawal.sendProposalUpdateInfoToRecipients) {
                        dbLargeWithdrawal.sendProposalUpdateInfoToRecipients(proposalData.data.largeWithdrawalLog, proposalData, false, false).catch(err => {
                            console.log("Send large withdrawal proposal update info failed", proposalData.data.largeWithdrawalLog, err);
                            return errorUtils.reportError(err);
                        });
                    }
                    else {
                        console.log("dbLargeWithdrawal", dbLargeWithdrawal);
                    }
                }
                if (proposalData && proposalData.data && proposalData.data.amount) {
                    //todo::add more reasons here, ex:cancel request

                    if (proposalData.data.ximaWithdrawUsed) {
                        dbConsumptionReturnWithdraw.addXimaWithdraw(proposalData.data.playerObjId, proposalData.data.ximaWithdrawUsed).catch(errorUtils.reportError);
                    }

                    // return proposalExecutor.refundPlayer(proposalData, proposalData.data.amount * proposalData.data.bonusCredit, "rejectPlayerBonus")
                    proposalData.data.creditCharge = proposalData.data.creditCharge || 0;
                    return proposalExecutor.refundPlayer(proposalData, proposalData.data.amount + proposalData.data.creditCharge, constPlayerCreditChangeType.REJECT_PLAYER_BONUS)
                        .then(

                            res => {
                                proposalData.cancelTime = moment(new Date()).format("YYYY/MM/DD HH:mm:ss");
                                sendMessageToPlayer (proposalData,constMessageType.WITHDRAW_CANCEL,{});
                                return deferred.resolve("Proposal is rejected");
                            },
                            error => deferred.reject(error)
                        );
                }
                else {
                    deferred.reject({name: "DataError", message: "Invalid proposal data"});
                }
            },

            /**
             * reject function for player bonus
             */
            rejectPartnerBonus: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.partnerLargeWithdrawalLog) {
                    if (dbLargeWithdrawal.sendProposalUpdateInfoToRecipients) {
                        dbLargeWithdrawal.sendProposalUpdateInfoToRecipients(proposalData.data.partnerLargeWithdrawalLog, proposalData, false, true).catch(err => {
                            console.log("Send large withdrawal proposal update info failed", proposalData.data.partnerLargeWithdrawalLog, err);
                            return errorUtils.reportError(err);
                        });
                    }
                    else {
                        console.log('dbLargeWithdrawal', dbLargeWithdrawal)
                    }
                }

                if (proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.platformId && proposalData.data.amount) {
                    return dbconfig.collection_partner.findOneAndUpdate(
                        {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformId},
                        {$inc: {credits: proposalData.data.amount }},
                        // {$inc: {credits: proposalData.data.amount * proposalData.data.bonusCredit}},
                        {new: true}
                    ).then(
                        function (res) {
                            if (res) {
                                //return dbLogger.createCreditChangeLog(playerObjId, platformId, updateAmount, reasonType, res.validCredit, null, data);
                                return deferred.resolve("Proposal is rejected");
                            }
                            else {
                                return deferred.reject({name: "DataError", message: "Can't update player credit."});
                            }
                        },
                        function (error) {
                            return deferred.reject({name: "DBError", message: "Error updating player.", error: error});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Invalid proposal data"});
                }
            },

            /**
             * reject function for player consumption incentive
             */
            rejectPlayerConsumptionIncentive: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player level up
             */
            rejectPlayerLevelUp: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player level maintain
             */
            rejectPlayerLevelMaintain: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player top up return
             */
            rejectPartnerTopUpReturn: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player top up reward
             */
            rejectPlayerTopUpReward: function (proposalData, deferred) {
                proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, constPlayerCreditChangeType.REJECT_PLAYER_TOP_UP_REWARD).then(
                    () => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject)
                );
            },

            /**
             * reject function for player referral reward
             */
            rejectPlayerReferralReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.referralName) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_players,
                        {name: proposalData.data.referralName},
                        {isReferralReward: false},
                        constShardKeys.collection_players
                    ).then(
                        () => deferred.resolve("Proposal is rejected"),
                        error => deferred.reject(error)
                    );
                }
                else {
                    deferred.reject("Invalid proposal data");
                }
            },

            /**
             * reject function for add player reward task
             */
            rejectAddPlayerRewardTask: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player registration reward
             */
            rejectPlayerRegistrationReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for manual unlock player reward
             */
            rejectManualUnlockPlayerReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPartnerCommission: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerDoubleTopUpReward: function (proposalData, deferred) {
                //clean top up records that are used for application
                proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, constPlayerCreditChangeType.REJECT_PLAYER_DOUBLE_TOP_UP_REWARD).then(
                    () => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject)
                );
            },

            rejectPlayerConsecutiveLoginReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerEasterEggReward: function (proposalData, deferred) {
                dbconfig.collection_players.findOneAndUpdate({
                    _id: proposalData.data.playerObjId,
                    platform: proposalData.data.platformId
                }, {applyingEasterEgg: false}).then(
                    data => {
                        deferred.resolve("Proposal is rejected");
                    },
                    error => {
                        deferred.reject({
                            name: "DBError",
                            message: "Failed to update playerinfo for applyingEasterEgg",
                            error: error
                        });
                    }
                );
            },

            rejectPlayerTopUpPromo: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject create player intention proposal
             */
            rejectPlayerRegistrationIntention: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerConsecutiveConsumptionReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerLevelMigration: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerPacketRainReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerPromoCodeReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectDxReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerLimitedOfferReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerTopUpReturnGroup: function (proposalData, deferred) {
                //clean top up records that are used for application
                let refundProm = Promise.resolve();

                if (proposalData.data.isDynamicRewardAmount) {
                    refundProm = proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, constPlayerCreditChangeType.REJECT_PLAYER_TOP_UP_RETURN);
                }

                refundProm.then(() => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject));
            },

            rejectReferralRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerFestivalRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerRandomRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerConsumptionSlipRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerRetentionRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerBonusDoubledRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerConsecutiveRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerLoseReturnRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerConsumptionRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerFreeTrialRewardGroup: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectBaccaratRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.baccaratRewardList && proposalData.data.baccaratRewardList.length) {
                    for (let i = 0; i < proposalData.data.baccaratRewardList.length; i++) {
                        baccaratConsumption = baccaratRewardList[i];
                        dbconfig.collection_baccaratConsumption.findOneAndUpdate({_id: baccaratConsumption.bConsumption}, {bUsed: false}, {new: true, projection: "_id"}).lean().then(
                            data => {
                                if (!data) {
                                    return Promise.reject({message: "fail to update bConsumption bUsed to false"});
                                }
                            }
                        ).catch(err => {
                            console.log('fail to update bConsumption bUsed to false', err, baccaratConsumption);
                        });
                    }
                }
                deferred.resolve("Proposal is rejected")
            },

            rejectPlayerAddRewardPoints: function (proposalData, deferred) {
                dbRewardPointsLog.updateConvertRewardPointsLog(proposalData.proposalId, constRewardPointsLogStatus.CANCELLED, null);
                deferred.resolve("Proposal is rejected");
            },

            rejectPlayerMinusRewardPoints: function (proposalData, deferred) {
                let playerObjId = proposalData.data.playerObjId;
                let platformObjId = proposalData.data.platformObjId;
                let category = constRewardPointsLogCategory.POINT_REDUCTION_CANCELLED;
                let remark = proposalData.data.remark + " Proposal No: " + proposalData.proposalId;
                let userAgent = proposalData.data.userAgent;
                let adminName = proposalData.data.adminName;
                let updateAmount = Math.abs(proposalData.data.updateAmount);

                dbRewardPointsLog.updateConvertRewardPointsLog(proposalData.proposalId, constRewardPointsLogStatus.CANCELLED, null);
                dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, updateAmount, category, remark, userAgent,
                    adminName, constRewardPointsLogStatus.PROCESSED, null, null, null, proposalData.proposalId).then(
                    () => {
                        deferred.resolve("Proposal is rejected");
                    }
                );
            },

            rejectPlayerConvertRewardPoints: function (proposalData, deferred) {
                let playerObjId = proposalData.data.playerObjId;
                let platformObjId = proposalData.data.platformObjId;
                let category = constRewardPointsLogCategory.EARLY_POINT_CONVERSION_CANCELLED;
                let remark = proposalData.data.remark + " Proposal No: " + proposalData.proposalId;
                let userAgent = proposalData.inputDevice;
                let adminName = proposalData.creator.name;
                let updateAmount = Math.abs(proposalData.data.convertedRewardPoints);

                dbRewardPointsLog.updateConvertRewardPointsLog(proposalData.proposalId, constRewardPointsLogStatus.CANCELLED, null);
                dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, updateAmount, category, remark, userAgent,
                    adminName, constRewardPointsLogStatus.PROCESSED, null, null, null, proposalData.proposalId).then(
                    () => {
                        deferred.resolve("Proposal is rejected");
                    }
                );
            },

            rejectPlayerAutoConvertRewardPoints: function (proposalData, deferred) {
                let playerObjId = proposalData.data.playerObjId;
                let platformObjId = proposalData.data.platformObjId;
                let category = constRewardPointsLogCategory.PERIOD_POINT_CONVERSION_CANCELLED;
                let remark = proposalData.data.remark
                    ? proposalData.data.remark + " Proposal No: " + proposalData.proposalId : "Proposal No: " + proposalData.proposalId;
                let userAgent = proposalData.inputDevice;
                let adminName = proposalData.creator.name;
                let updateAmount = Math.abs(proposalData.data.convertedRewardPoints);

                dbRewardPointsLog.updateConvertRewardPointsLog(proposalData.proposalId, constRewardPointsLogStatus.CANCELLED, null);
                dbPlayerRewardPoints.changePlayerRewardPoint(playerObjId, platformObjId, updateAmount, category, remark, userAgent,
                    adminName, constRewardPointsLogStatus.PROCESSED, null, null, null, proposalData.proposalId).then(
                    () => {
                        deferred.resolve("Proposal is rejected");
                    }
                );
            },

            rejectFinancialPointsAdd: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectFinancialPointsDeduct: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectCustomizePartnerCommRate: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectSettlePartnerCommission: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectPartnerCreditTransferToDownline: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectUpdateParentPartnerCommission: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectBulkExportPlayerData: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectAuctionPromoCode: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectAuctionOpenPromoCode: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectAuctionRewardPromotion: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectePlayerAuctionPromotionReward: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectAuctionRealPrize: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },

            rejectAuctionRewardPointChange: function (proposalData, deferred) {
                deferred.resolve("Proposal is rejected");
            },
        }
    }
;

proposalExecutor.init();

function changePlayerCredit(playerObjId, platformId, updateAmount, reasonType, data) {
    return dbPlayerInfo.changePlayerCredit(playerObjId, platformId, updateAmount, reasonType, data);
}

/**
 * DEPRECATING: Moving to createRTGForProposal
 * @param proposalData
 * @param taskData
 * @param deferred
 * @param rewardType
 * @param [resolveValue] - Optional.  Without this, resolves with the newly created reward task.
 */
function createRewardTaskForProposal(proposalData, taskData, deferred, rewardType, resolveValue) {
    console.log('createRewardTaskForProposal');
    let rewardTask, platform, gameProviderGroup, playerRecord;
    //check if player object id is in the proposal data
    if (!(proposalData && proposalData.data && proposalData.data.playerObjId)) {
        deferred.reject({name: "DBError", message: "Invalid reward proposal data"});
        return;
    }

    // Add proposalId in reward data
    taskData.proposalId = proposalData.proposalId;

    let gameProviderGroupProm = Promise.resolve(false);
    let platformProm = dbconfig.collection_platform.findOne({_id: proposalData.data.platformId})
        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean();
    let playerProm = dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).lean();

    // Check whether game provider group exist
    if (proposalData.data.providerGroup && proposalData.data.providerGroup.toString().length === 24) {
        gameProviderGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: proposalData.data.providerGroup})
            .populate({path: "providers", model: dbconfig.collection_gameProvider}).lean();
    }

    Promise.all([gameProviderGroupProm, platformProm, playerProm]).then(
        res => {
            gameProviderGroup = res[0];
            platform = res[1];
            playerRecord = res[2];
            let calCreditArr = [];
            return dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId({_id: playerRecord._id})
                .then(rtgData => {
                    console.log("createRewardTaskForProposal Promise.all.then rtgData", rtgData);
                    if (rtgData && rtgData.length) {
                        rtgData.forEach(rtg => {
                            if(rtg){
                                if (rtg.providerGroup && rtg.providerGroup._id) {
                                    rtg.totalCredit = rtg.rewardAmt || 0;
                                    let calCreditProm = dbconfig.collection_gameProviderGroup.findOne({_id: rtg.providerGroup._id})
                                        .populate({path: "providers", model: dbconfig.collection_gameProvider}).lean().then(
                                            providerGroup => {
                                                if (providerGroup && providerGroup.providers && providerGroup.providers.length) {
                                                    return getProviderCredit(providerGroup.providers, playerRecord.name, platform.platformId).then(
                                                        credit => {
                                                            if(credit){
                                                                rtg.totalCredit += credit
                                                            }

                                                            return rtg;
                                                        }
                                                    );
                                                }
                                            }
                                        );

                                    calCreditArr.push(calCreditProm);
                                } else if (!rtg.providerGroup) {
                                    rtg.totalCredit = playerRecord && playerRecord.validCredit ? playerRecord.validCredit : 0;
                                    let calCreditProm = getProviderCredit(platform.gameProviders, playerRecord.name, platform.platformId).then(
                                        credit => {
                                            console.log("createRewardTaskForProposal Promise.all.then getProviderCredit .then credit",credit);
                                            if(credit){
                                                rtg.totalCredit += credit;
                                            }
                                            console.log("createRewardTaskForProposal Promise.all.then getProviderCredit .then rtg",rtg);
                                            return rtg;
                                        }
                                    );

                                    calCreditArr.push(calCreditProm);
                                }
                            }
                        });

                        return Promise.all(calCreditArr);
                    }
                }
            );
        }
    ).then(
        rewardTaskGroup => {
            if(rewardTaskGroup){
                let rtgArr = [];

                rewardTaskGroup.forEach(
                    rtg => {
                        console.log("LH Check RTG unlock 1 -------------------", rtg);
                        console.log("LH Check RTG unlock 2 -------------------", platform.autoUnlockWhenInitAmtLessThanLostThreshold);
                        console.log("LH Check RTG unlock 3 -------------------", platform.autoApproveLostThreshold );
                        if(rtg && platform && rtg._id && rtg.totalCredit && platform.autoUnlockWhenInitAmtLessThanLostThreshold
                            && platform.autoApproveLostThreshold && rtg.totalCredit <= platform.autoApproveLostThreshold){
                            console.log("LH Check RTG unlock 4 -------------------");
                            rtgArr.push(dbRewardTaskGroup.unlockRewardTaskGroupByObjId(rtg));
                            dbRewardTask.unlockRewardTaskInRewardTaskGroup(rtg, rtg.playerId).then( rewards => {
                                if (rewards){

                                    return dbRewardTask.getRewardTasksRecord(rewards, rtg, proposalData);
                                }
                            }).then( records => {

                                if (records){

                                    return dbRewardTask.updateUnlockedRewardTasksRecord(records, "NoCredit", rtg.playerId, rtg.platformId).catch(errorUtils.reportError);
                                }
                            })

                        }
                    }
                );

                return Promise.all(rtgArr).catch(err => {
                    // without current catch, the then chain might be broken
                    console.log('unlockRewardTaskGroupByObjId error', err);
                    return errorUtils.reportError(err)
                });
            }
        }
    ).then(() => {
        // Create different process flow for lock provider group reward
        console.log('reward here is reached')
        if (platform.useProviderGroup) {
            if (proposalData.data.providerGroup && gameProviderGroup) {
                let deductFreeAmtProm = Promise.resolve();
                if (proposalData.data.isDynamicRewardAmount || (proposalData.data.promoCode && proposalData.data.promoCodeTypeValue && proposalData.data.promoCodeTypeValue == 3)
                    || proposalData.data.limitedOfferObjId) {
                    deductFreeAmtProm = dbRewardTask.deductTargetConsumptionFromFreeAmountProviderGroup(taskData, proposalData);
                }

                return deductFreeAmtProm.then(
                    () => {
                        console.log('deduct function run succeed');
                        return dbRewardTask.createRewardTaskWithProviderGroup(taskData, proposalData);
                    },
                    error => {
                        console.error("Error deduct target consumption from free amount provider group", error);
                        deferred.reject({
                            name: "DBError",
                            message: "Error deduct target consumption from free amount provider group",
                            error: error
                        })
                    }
                ).then(
                    output => {
                        if (!output) {
                            return deferred;
                        }
                        console.log("reward task group created", output);

                        dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                        sendMessageToPlayer(proposalData, rewardType, {rewardTask: taskData});
                        return deferred.resolve(resolveValue || taskData);
                    },
                    error => {
                        console.error("Error creating reward task with provider group", error);
                        deferred.reject({
                            name: "DBError",
                            message: "Error creating reward task with provider group",
                            error: error
                        });
                    }
                );
            } else {
                return dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData, rewardType).then(
                    data => {
                        console.log("createRewardTaskForProposal Promise.all.then.then.then.then data", data);
                        rewardTask = data;
                        dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                        sendMessageToPlayer(proposalData, rewardType, {rewardTask: taskData});
                        return deferred.resolve(resolveValue || taskData);
                    }
                ).catch(
                    error => {
                        console.error("Error adding consumption value into free amount provider group", error);
                        return deferred.reject({
                            name: "DBError",
                            message: "Error adding consumption value into free amount provider group",
                            error: error
                        });
                    }
                );
            }
        } else {
            //check if player has reward task and if player's platform support multi reward
            dbconfig.collection_rewardTask.findOne(
                {
                    playerId: proposalData.data.playerObjId,
                    status: constRewardTaskStatus.STARTED,
                    useLockedCredit: true
                }
            ).populate(
                {path: "platformId", model: dbconfig.collection_platform}
            ).lean().then(
                curTask => {
                    if (!curTask || (curTask && curTask.platformId && curTask.platformId.canMultiReward)) {
                        return;
                    }
                    else {
                        return Q.reject({name: "DBError", message: "Player already has reward task ongoing"});
                    }
                }
            ).then(
                () => dbRewardTask.createRewardTask(taskData).then(
                    data => rewardTask = data
                ).catch(
                    error => Q.reject({
                        name: "DBError",
                        message: "Error creating reward task for " + rewardType,
                        error: error
                    })
                )
            ).then(
                () => {
                    if (!taskData.useLockedCredit) {
                        return dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).lean().then(
                            playerData => {
                                dbPlayerInfo.changePlayerCredit(proposalData.data.playerObjId, playerData.platform, proposalData.data.rewardAmount, rewardType, proposalData);
                            }
                        );
                    }
                }
            ).then(
                //() => createRewardLogForProposal(taskData.rewardType, proposalData)
                () => {
                    sendMessageToPlayer(proposalData,rewardType,{rewardTask: taskData});
                }
            ).then(
                function () {
                    dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                    deferred.resolve(resolveValue || rewardTask);
                },
                function (error) {
                    deferred.reject(error);
                }
            );
        }
    });
}

/**
 * createRewardTaskForProposal without deferred
 * @param proposalData
 * @param taskData
 * @param rewardType
 * @param [resolveValue] - Optional.  Without this, resolves with the newly created reward task.
 */
function createRTGForProposal(proposalData, taskData, rewardType, resolveValue) {
    let rewardTask, platform, gameProviderGroup, playerRecord;
    //check if player object id is in the proposal data
    if (!(proposalData && proposalData.data && proposalData.data.playerObjId)) {
        return Promise.reject({name: "DBError", message: "Invalid reward proposal data"});
    }

    // Add proposalId in reward data
    taskData.proposalId = proposalData.proposalId;

    let gameProviderGroupProm = Promise.resolve(false);
    let platformProm = dbconfig.collection_platform.findOne({_id: proposalData.data.platformId})
        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider}).lean();
    let playerProm = dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).lean();

    // Check whether game provider group exist
    if (proposalData.data.providerGroup && proposalData.data.providerGroup.toString().length === 24) {
        gameProviderGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: proposalData.data.providerGroup})
            .populate({path: "providers", model: dbconfig.collection_gameProvider}).lean();
    }

    console.log('createRTGForProposal', taskData);

    return Promise.all([gameProviderGroupProm, platformProm, playerProm]).then(
        res => {
            [gameProviderGroup, platform, playerRecord] = res;

            return dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId({_id: playerRecord._id})
        }
    ).then(
        rtgData => {
            let calCreditArr = [];

            if (rtgData && rtgData.length) {
                rtgData.forEach(rtg => {
                    if(rtg){
                        if (rtg.providerGroup && rtg.providerGroup._id) {
                            rtg.totalCredit = rtg.rewardAmt || 0;

                            let calCreditProm = dbconfig.collection_gameProviderGroup.findOne({_id: rtg.providerGroup._id})
                                .populate({path: "providers", model: dbconfig.collection_gameProvider}).lean().then(
                                    providerGroup => {
                                        if (providerGroup && providerGroup.providers && providerGroup.providers.length) {
                                            return getProviderCredit(providerGroup.providers, playerRecord.name, platform.platformId).then(
                                                credit => {
                                                    if (credit) {
                                                        rtg.totalCredit += credit
                                                    }

                                                    return rtg;
                                                }
                                            );
                                        }
                                    }
                                );

                            calCreditArr.push(calCreditProm);
                        } else if (!rtg.providerGroup) {
                            rtg.totalCredit = playerRecord && playerRecord.validCredit ? playerRecord.validCredit : 0;
                            let calCreditProm = getProviderCredit(platform.gameProviders, playerRecord.name, platform.platformId).then(
                                credit => {
                                    if(credit){
                                        rtg.totalCredit += credit;
                                    }

                                    return rtg;
                                }
                            );

                            calCreditArr.push(calCreditProm);
                        }
                    }
                });

                return Promise.all(calCreditArr).then(data => data, err => err);
            }
        }
    ).then(
        rewardTaskGroup => {
            if(rewardTaskGroup){
                let rtgArr = [];

                rewardTaskGroup.forEach(
                    rtg => {
                        if(rtg && platform && rtg._id && rtg.totalCredit && platform.autoUnlockWhenInitAmtLessThanLostThreshold
                            && platform.autoApproveLostThreshold && rtg.totalCredit <= platform.autoApproveLostThreshold){
                            rtgArr.push(dbRewardTaskGroup.unlockRewardTaskGroupByObjId(rtg));
                            dbRewardTask.unlockRewardTaskInRewardTaskGroup(rtg, rtg.playerId).then( rewards => {
                                if (rewards){
                                    return dbRewardTask.getRewardTasksRecord(rewards, rtg, proposalData);
                                }
                            }).then( records => {

                                if (records){

                                    return dbRewardTask.updateUnlockedRewardTasksRecord(records, "NoCredit", rtg.playerId, rtg.platformId).catch(errorUtils.reportError);
                                }
                            })

                        }
                    }
                );

                return Promise.all(rtgArr).catch(err => {
                    // without current catch, the then chain might be broken
                    return errorUtils.reportError(err)
                });
            }
        }
    ).then(() => {
        // Done pre-checking
        if (proposalData.data.providerGroup && gameProviderGroup) {
            let deductFreeAmtProm = Promise.resolve();
            if (proposalData.data.isDynamicRewardAmount || (proposalData.data.promoCode && proposalData.data.promoCodeTypeValue && proposalData.data.promoCodeTypeValue == 3)
                || proposalData.data.limitedOfferObjId) {
                deductFreeAmtProm = dbRewardTask.deductTargetConsumptionFromFreeAmountProviderGroup(taskData, proposalData);
            }

            return deductFreeAmtProm.then(
                () => dbRewardTask.createRewardTaskWithProviderGroup(taskData, proposalData),
                error => {
                    console.error("Error deduct target consumption from free amount provider group", error);
                    return Promise.reject({
                        name: "DBError",
                        message: "Error deduct target consumption from free amount provider group",
                        error: error
                    })
                }
            ).then(
                output => {
                    if (!output) {
                        return;
                    }
                    dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                    sendMessageToPlayer(proposalData, rewardType, {rewardTask: taskData});
                    return resolveValue || taskData;
                },
                error => {
                    console.error("Error creating reward task with provider group", error);
                    return Promise.reject({
                        name: "DBError",
                        message: "Error creating reward task with provider group",
                        error: error
                    });
                }
            );
        } else {
            // No provider group
            return dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData, rewardType).then(
                data => {
                    rewardTask = data;
                    dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                    sendMessageToPlayer(proposalData, rewardType, {rewardTask: taskData});
                    return resolveValue || taskData;
                }
            ).catch(
                error => {
                    console.error("Error adding consumption value into free amount provider group", error);
                    return Promise.reject({
                        name: "DBError",
                        message: "Error adding consumption value into free amount provider group",
                        error: error
                    });
                }
            );
        }

    })
}

function sendMessageToPlayer (proposalData,type,metaDataObj) {
    //type that need to add 'Success' status
    let needSendMessageRewardTypes = [constRewardType.PLAYER_PROMO_CODE_REWARD, constRewardType.PLAYER_CONSUMPTION_RETURN, constRewardType.PLAYER_LIMITED_OFFERS_REWARD,constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
        constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP,constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP, constRewardType.PLAYER_RANDOM_REWARD_GROUP,
        constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP,constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP,constRewardType.PLAYER_LEVEL_UP, constRewardType.PLAYER_RETENTION_REWARD_GROUP, constRewardType.PLAYER_LEVEL_MAINTAIN
    ];

    // type reference to constMessageType or constMessageTypeParam.name
    let messageType = type;
    if(needSendMessageRewardTypes.indexOf(type)!==-1){
        messageType = type + 'Success';
    }

    console.log("checking messageType", messageType)
    let providerProm = Promise.resolve();
    if ((messageType == messageType.PLAYER_LEVEL_UP_SUCCESS || messageType == messageType.PLAYER_LEVEL_MAINTAIN_SUCCESS) && proposalData && proposalData.data && proposalData.data.providerGroup) {
        providerProm = dbconfig.collection_gameProviderGroup.findOne({
            _id:ObjectId(proposalData.data.providerGroup)
        });
    }
    providerProm.then(
        providerData => {
            if (messageType == constMessageType.PLAYER_LEVEL_UP_SUCCESS || messageType == messageType.PLAYER_LEVEL_MAINTAIN_SUCCESS) {
                if (providerData && providerData.name) {
                    proposalData.data.providerGroup = providerData.name;
                } else {
                    proposalData.data.providerGroup = '自由额度';
                }
                if (proposalData && proposalData.data && !proposalData.data.requiredUnlockAmount) {
                    proposalData.data.requiredUnlockAmount = 0;
                }
            }

            SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, messageType, proposalData);
            // Currently can't see it's dependable when provider group is off, and maybe causing manual reward task can't be proporly executed
            // Changing into async function
            //dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData).catch(errorUtils.reportError);
            //send message if there is any template created for this reward
            return messageDispatcher.dispatchMessagesForPlayerProposal(proposalData, messageType, metaDataObj).catch(err=>{console.error(err)});
        })

}

function disablePlayerWithdrawal(playerObjId, platformObjId, proposalId) {
    return dbconfig.collection_players.findOneAndUpdate({
        _id: playerObjId,
        platform: platformObjId
    }, {
        $set: {"permission.applyBonus": false}
    }).lean().then(
        playerData => {
            let oldData = {"applyBonus": true};
            if (playerData && playerData.permission && playerData.permission.applyBonus === false) {
                oldData.applyBonus = false;
            }

            let newData = {"applyBonus": false};

            let remark = "优惠提案：" + proposalId;

            let newLog = new dbconfig.collection_playerPermissionLog({
                isSystem: true,
                platform: platformObjId,
                player: playerObjId,
                remark: remark,
                oldData: oldData,
                newData: newData,
            });
            newLog.save().catch(errorUtils.reportError);

            return playerData;
        }
    )
}

function createRewardLogForProposal(rewardTypeName, proposalData) {
    rewardTypeName = proposalData.type.name;

    // We need to fetch some things in order to create the log
    var rewardType;
    var rewardEvent;

    return Q.resolve().then(
        () => {
            if (rewardTypeName == constRewardType.PLAYER_LEVEL_UP) {
                rewardType = {
                    name: constRewardType.PLAYER_LEVEL_UP
                }
                return true;
            }
            if (rewardTypeName == constProposalType.PLAYER_CONSUMPTION_RETURN_FIX) {
                rewardType = {
                    name: constProposalType.PLAYER_CONSUMPTION_RETURN_FIX
                }
                return true;
            }
            return dbRewardType.getRewardType({name: rewardTypeName}).then(
                data => (rewardType = (data || {})) || Q.reject({
                    name: "DBError",
                    message: "Could not find reward type",
                    rewardTypeName: rewardTypeName
                })
            );
        }
    ).then(
        () => {
            if (rewardTypeName != constRewardType.PLAYER_LEVEL_UP && rewardTypeName != constProposalType.PLAYER_CONSUMPTION_RETURN_FIX) {
                return dbRewardEvent.getRewardEvent({
                    platform: proposalData.data.platformId,
                    type: rewardType._id
                }).then(
                    data => rewardEvent = data
                );
            }
        }
    ).then(
        () => {
            var rewardLog = {
                platform: proposalData.data.platformId,
                player: proposalData.data.playerId || proposalData.data.playerObjId,
                rewardType: rewardType._id,
                rewardTypeName: rewardTypeName,
                amount: proposalData.data.rewardAmount || proposalData.data.amount || proposalData.data.updateAmount || 0,
                createTime: Date.now(),
            };
            if (rewardEvent) {
                Object.assign(rewardLog, {
                    rewardEventId: rewardEvent._id,
                    rewardEventName: rewardEvent.name,
                    rewardEventCode: rewardEvent.code,
                });
            }

            return Q.resolve().then(
                () => fetchPlayerObjIdAndPlayerIdForRewardLog(rewardLog)
            ).then(
                () => dbRewardLog.createRewardLog(rewardLog)
            ).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error creating reward log",
                    error: error,
                    rewardLog: rewardLog
                })
            );
        }
    ).catch(
        error => {
            // If there is no corresponding reward reward type in the DB, then warn that we could not create
            // the rewardLog, but do not reject the proposal execution.
            if (error && error.message === "Could not find reward type") {
                errorUtils.reportError({
                    name: "DBError",
                    message: "It looks like this proposal was marked as a reward, although it has no corresponding reward type.  So we could not log this reward.",
                    error: error,
                    data: {
                        "proposalData.mainType:": proposalData.mainType,
                        "proposalData.type.name:": proposalData.type.name,
                        proposalData: proposalData,
                    },
                });
            } else {
                return Q.reject(error);
            }
        }
    );
}

function fixTransferCreditWithProposalGroup(transferId, creditAmount, proposalData) {
    let transferLog, player, provider, creditChangeLog;
    let changedValidCredit = 0, changedLockedCredit = 0, totalCreditAmount = creditAmount;

    return dbconfig.collection_playerCreditTransferLog.findOne({transferId}).lean().then(
        transferLogData => {
            if (!transferLogData) {
                return;
            }

            transferLog = transferLogData;

            return dbconfig.collection_gameProvider.findOne({providerId: transferLog.providerId}).lean();
        }
    ).then(
        providerData => {
            if (!providerData) {
                return;
            }

            provider = providerData;

            let playerProm = dbconfig.collection_players.findOne({_id: transferLog.playerObjId}).lean();

            let creditChangeLogProm = dbconfig.collection_creditChangeLog.findOne({
                platformId: transferLog.platformObjId,
                transferId: transferId
            }).lean();

            return Promise.all([playerProm, creditChangeLogProm]);
        }
    ).then(
        data => {
            if (!data || !data[0]) {
                return;
            }

            player = data[0];
            creditChangeLog = data[1];

            return dbRewardTaskGroup.getPlayerRewardTaskGroup(
                transferLog.platformObjId,
                provider._id,
                transferLog.playerObjId,
                transferLog.createTime
            );
        }
    ).then(
        rewardTaskGroup => {
            if (rewardTaskGroup && rewardTaskGroup._inputRewardAmt) {
                let inputFreeAmt = rewardTaskGroup._inputFreeAmt;
                let inputRewardAmt = rewardTaskGroup._inputRewardAmt;

                if (creditChangeLog) {
                    // Transfer in money missing
                    inputFreeAmt = -creditChangeLog.amount;
                    inputRewardAmt = -creditChangeLog.changedLockedAmount;
                } else {
                    // Transfer out money missing
                    if (creditAmount <= inputRewardAmt) {
                        inputRewardAmt = creditAmount;
                    } else {
                        inputFreeAmt = creditAmount - inputRewardAmt;
                    }
                }

                changedValidCredit = inputFreeAmt;
                changedLockedCredit = inputRewardAmt;

                let updateRewardTaskGroupProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                    _id: rewardTaskGroup._id,
                    platformId: rewardTaskGroup.platformId
                }, {
                    $inc: {
                        rewardAmt: inputRewardAmt,
                    },
                }, {
                    new: true
                }).lean();

                let updateValidCredit = dbconfig.collection_players.findOneAndUpdate({
                    _id: player._id,
                    platform: player.platform
                }, {
                    $inc: {
                        validCredit: inputFreeAmt > 0 ? inputFreeAmt : 0
                    }
                }, {
                    new: true
                });

                return Promise.all([updateValidCredit, updateRewardTaskGroupProm]);
            }
            else {
                changedValidCredit = creditAmount;

                let updateValidCredit = dbconfig.collection_players.findOneAndUpdate({
                    _id: player._id,
                    platform: player.platform
                }, {
                    $inc: {
                        validCredit: creditAmount > 0 ? creditAmount : 0
                    }
                }, {
                    new: true
                });

                return Promise.all([updateValidCredit]);
            }
        }
    ).then(
        updatedData => {
            if (!updatedData || !updatedData[0]) {
                return;
            }

            let updatedPlayer = updatedData[0];
            if (updatedPlayer.validCredit < 0) {
                updatedPlayer.validCredit = 0;
                return updatedPlayer.save();
            }
            return updatedPlayer;
        },
        error => {
            return Promise.reject({name: "DBError", message: "Error updating player.", error: error});
        }
    ).then(
        updatedPlayer => {
            dbLogger.createCreditChangeLogWithLockedCredit(player._id, player.platform, changedValidCredit, constProposalType.FIX_PLAYER_CREDIT_TRANSFER, updatedPlayer.validCredit, null, changedLockedCredit, null, proposalData);
            return updatedPlayer;
        }
    );
}

function setTransferIdAsRepaired(transferId) {
    return dbconfig.collection_playerCreditTransferLog.update({transferId}, {isRepaired: true}, {multi: true});
}

function isTransferIdRepaired(transferId) {
    return dbconfig.collection_playerCreditTransferLog.find({transferId, isRepaired: true}, {_id: 1}).limit(1).lean().then(
        log => {
            return Boolean(log && log[0]);
        }
    );
}

function increasePlayerWithdrawalData(playerObjId, platformObjId, amount) {
    return dbconfig.collection_players.findOneAndUpdate({_id: playerObjId, platform: platformObjId},
        {
            $inc: {
                withdrawTimes: 1,
                dailyWithdrawSum: amount,
                weeklyWithdrawSum: amount,
                pastMonthWithdrawSum: amount,
                withdrawSum: amount
            }
        }).lean().exec();
}

/**
 * @param proposalData
 * @param taskData
 * @param deferred
 * @param rewardPointsType
 * @param [resolveValue] - Optional.  Without this, resolves with the newly created reward task.
 */
function createRewardPointsTaskForProposal(proposalData, taskData, deferred, rewardPointsType, resolveValue) {
    let rewardTask, gameProviderGroup, playerRewardPoint, platform;
    if (!(proposalData && proposalData.data && proposalData.data.playerObjId)) {
        deferred.reject({name: "DBError", message: "Invalid reward points proposal data"});
        return;
    }
    // Add proposalId in reward points data
    taskData.proposalId = proposalData.proposalId;
    proposalData.data.remark = proposalData.data.remark ? proposalData.data.remark + " Proposal No: " + proposalData.proposalId : "Proposal No: " + proposalData.proposalId;

    let gameProviderGroupProm = Promise.resolve(false);
    // Check whether game provider group exist
    if (proposalData.data.providerGroup) {
        gameProviderGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: proposalData.data.providerGroup}).lean();
    }

    let playerRewardPointProm = dbRewardPoints.getPlayerRewardPoints(taskData.playerId);
    let platformProm = dbconfig.collection_platform.findOne({_id: proposalData.data.platformId}).lean();

    Promise.all([gameProviderGroupProm, playerRewardPointProm, platformProm]).then(
        res => {
            gameProviderGroup = res[0];
            playerRewardPoint = res[1];
            platform = res[2];
            let createRewardTaskProm = Promise.resolve();

            if (platform.useProviderGroup) {
                if (proposalData.data.providerGroup && gameProviderGroup) {
                    createRewardTaskProm = dbRewardTask.createRewardTaskWithProviderGroup(taskData, proposalData);
                } else {
                    createRewardTaskProm = dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData, rewardPointsType);
                }
            } else {
                createRewardTaskProm = dbRewardTask.createRewardTask(taskData).then(
                    (data) => {
                        return dbPlayerInfo.changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.convertCredit, rewardPointsType, proposalData).then(
                            () => data
                        )
                    }
                )
            }
            createRewardTaskProm.then(
                data => rewardTask = data
            ).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error creating reward points task for " + rewardPointsType,
                    error: error
                })
            ).then(
                () => {
                    return dbconfig.collection_rewardPoints.findOne({_id: proposalData.data.playerRewardPointsObjId}).lean().then(
                        playerRewardPoints => {
                            return dbRewardPointsLog.updateConvertRewardPointsLog(taskData.proposalId, constRewardPointsLogStatus.PROCESSED, rewardTask._id);
                        }
                    );
                }
            ).then(
                (data) => deferred.resolve(resolveValue || rewardTask),
                (error) => deferred.reject(error)
            );

        }
    );
}

// The rewardLog we are about to create may have player type ObjectId or player type String, passed from the proposal.
// This function will detect which type we were given, and fetch both.
function fetchPlayerObjIdAndPlayerIdForRewardLog(rewardLog) {
    const givenPlayerId = rewardLog.player;

    if (!givenPlayerId) {
        // It seems there is no player involved in this reward, e.g. it could be a partner reward.
        return;
    }

    return Q.resolve().then(
        () => {
            // Try ObjectId if possible
            if (looksLikeObjectId(givenPlayerId)) {
                const playerQuery = {_id: givenPlayerId};
                return dbconfig.collection_players.findOne(playerQuery).select('_id playerId');
            }
        }
    ).then(
        player => {
            if (player) {
                return player;
            } else {
                // Try String
                const playerQuery = {playerId: String(givenPlayerId)};
                return dbconfig.collection_players.findOne(playerQuery).select('_id playerId');
            }
        }
    ).then(
        player => {
            if (player) {
                rewardLog.player = player._id;
                rewardLog.playerId = player.playerId;
            } else {
                return Q.reject({
                    name: "DBError",
                    message: "Could not find player with givenPlayerId",
                    givenPlayerId: givenPlayerId
                });
            }
        }
    );
}

function looksLikeObjectId(thing) {
    const isObjectId = thing instanceof mongoose.Types.ObjectId;
    const looksLikeObjectId = String(thing).length === 24 && mongoose.Types.ObjectId.isValid(String(thing));
    return isObjectId || looksLikeObjectId;
}

function setProposalIdInData(proposal) {
    if (proposal && proposal.data) {
        proposal.data.proposalId = proposal.proposalId;
    }

    return proposal;
}
function updatePartnerCommissionType (proposalData) {
    let platformId;
    if(proposalData && proposalData.data && proposalData.data.platformObjId){
        platformId = proposalData.data.platformObjId;
    }
    if(proposalData && proposalData.data && proposalData.data.newRate && proposalData.data.newRate.platform){
        platformId = proposalData.data.newRate.platform;
    }
    if(platformId && proposalData.data.partnerObjId){
        dbUtil.findOneAndUpdateForShard(
            dbconfig.collection_partner,
            {
                _id: proposalData.data.partnerObjId,
                platform: platformId
            },
            { commissionType: proposalData.data.commissionType },
            constShardKeys.collection_partner
        )
    }
}

function updatePartnerCommissionConfig (proposalData) {
    let qObj = {
        platform: proposalData.data.newRate.platform,
        provider: proposalData.data.newRate.provider,
        commissionType: proposalData.data.newRate.commissionType,
        partner: proposalData.data.partnerObjId
    };

    if (proposalData.data.isRevert) {
        return dbconfig.collection_partnerCommissionConfig.findOneAndRemove(qObj)
    } else {
        proposalData.data.newRate.partner = proposalData.data.partnerObjId;
        delete proposalData.data.newRate._id;
        delete proposalData.data.newRate.__v;

        return dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(qObj, proposalData.data.newRate, {new: true, upsert: true})
    }
}

function updatePartnerCommRateConfig (proposalData) {
    let qObj = {
        platform: proposalData.data.newRate.platform,
        partner: proposalData.data.partnerObjId
    };
    let collectionName;
    if (proposalData.data.isMultiLevel) {
        collectionName = "collection_partnerMainCommRateConfig"
    } else {
        collectionName = "collection_partnerCommissionRateConfig"
    }
    if (proposalData.data.isDelete) {
        return dbconfig[collectionName].findOneAndRemove(qObj);
    } else {
        proposalData.data.newRate.partner = proposalData.data.partnerObjId;
        delete proposalData.data.newRate._id;
        delete proposalData.data.newRate.__v;
        delete proposalData.data.newRate.isEditing;
        return dbconfig[collectionName].findOneAndUpdate(qObj, proposalData.data.newRate, {new: true, upsert: true});
    }
}

function resetAllCustomizedCommissionRate (proposalData) {
    if(!proposalData.data || !proposalData.data.partnerObjId) {
        return;
    }
    return dbconfig.collection_partnerCommissionConfig.remove({
        partner: proposalData.data.partnerObjId,
        platform: proposalData.data.platformObjId,
        commissionType: proposalData.data.commissionType
    });
    // let customConfigProm = dbconfig.collection_partnerCommissionConfig.find({
    //     partner: proposalData.data.partnerObjId,
    //     platform: proposalData.data.platformObjId,
    //     commissionType: proposalData.data.commissionType
    // }).lean();
    //
    // let defaultConfigProm = dbconfig.collection_partnerCommissionConfig.find({
    //     partner: { "$exists" : false },
    //     platform: proposalData.data.platformObjId,
    //     commissionType: proposalData.data.commissionType
    // }).lean();
    //
    // return Promise.all([customConfigProm, defaultConfigProm]).then(
    //     data => {
    //         let customConfig = data[0];
    //         let defaultConfig = data[1];
    //
    //         if (defaultConfig && customConfig && defaultConfig.length > 0 && customConfig.length > 0) {
    //             defaultConfig.forEach(dConfig => {
    //                 if (dConfig && dConfig.commissionSetting && dConfig.commissionSetting.length > 0) {
    //                     customConfig.forEach(cConfig => {
    //                         if (cConfig && cConfig.commissionSetting && cConfig.commissionSetting.length > 0) {
    //                             if (String(dConfig.provider) === String(cConfig.provider)) {
    //                                 //custom config will be removed
    //                                 dbconfig.collection_partnerCommissionConfig.remove({
    //                                     partner: proposalData.data.partnerObjId,
    //                                     platform: proposalData.data.platformObjId,
    //                                     commissionType: proposalData.data.commissionType,
    //                                     provider: cConfig.provider,
    //                                 }).exec();
    //                             }
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //         return data;
    //     },
    //     error => {
    //         return error;
    //     }
    // );
}

function updateAllCustomizeCommissionRate (proposalData) {
    let proms = [];

    if (proposalData && proposalData.data && proposalData.data.newConfigArr && proposalData.data.newConfigArr.length > 0) {
        proposalData.data.newConfigArr.forEach(newConfig => {
            if (newConfig) {
                let qObj = {
                    platform: newConfig.platform,
                    provider: newConfig.provider,
                    commissionType: newConfig.commissionType,
                    partner: proposalData.data.partnerObjId
                };

                newConfig.partner = proposalData.data.partnerObjId;
                delete newConfig._id;
                delete newConfig.__v;

                proms.push(dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(qObj, newConfig, {new: true, upsert: true}))
            }
        });

        return Promise.all(proms).then(
            data => {
                return data;
            },
            error => {
                return error;
            }
        )
    }
}

function getProviderCredit(providers, playerName, platformId) {
    let promArr = [];
    let providerCredit = 0;
    let cpmsAPI = require('../externalAPI/cpmsAPI');

    providers.forEach(provider => {
        if (provider) {
            promArr.push(
                cpmsAPI.player_queryCredit(
                    {
                        username: playerName,
                        platformId: platformId,
                        providerId: provider.providerId
                    }
                ).then(
                    data => {
                        console.log("proposalExecutor.js getProviderCredit()", data);
                        return data;
                    },
                    error => {
                        console.log("error when getting provider credit", error);
                        return {credit: 0};
                    }
                )
            );
        }
    });

    return Promise.all(promArr)
        .then(providerCreditData => {
            providerCreditData.forEach(provider => {
                if (provider && provider.hasOwnProperty("credit")) {
                    providerCredit += !isNaN(provider.credit) ? parseFloat(provider.credit) : 0;
                }
            });
            return providerCredit;
        });
}
function getPlayerCreditInProviders (playerData, platformData) {
    return dbRewardTaskGroup.getPlayerAllRewardTaskGroupDetailByPlayerObjId({_id: playerData._id}).then(
        rtgData => {
            let calCreditArr = [];

            if (rtgData && rtgData.length) {
                rtgData.forEach(rtg => {
                    if(rtg){
                        if (rtg.providerGroup && rtg.providerGroup._id) {
                            rtg.totalCredit = rtg.rewardAmt || 0;

                            let calCreditProm = dbconfig.collection_gameProviderGroup.findOne({_id: rtg.providerGroup._id}).populate({
                                path: "providers", model: dbconfig.collection_gameProvider
                            }).lean().then(
                                providerGroup => {
                                    if (providerGroup && providerGroup.providers && providerGroup.providers.length) {
                                        return getProviderCredit(providerGroup.providers, playerData.name, platformData.platformId).then(
                                            credit => {
                                                if (credit) {
                                                    rtg.totalCredit += credit
                                                }

                                                return rtg;
                                            }
                                        );
                                    }
                                }
                            );

                            calCreditArr.push(calCreditProm);
                        } else if (!rtg.providerGroup) {
                            rtg.totalCredit = playerData && playerData.validCredit ? playerData.validCredit : 0;
                            let calCreditProm = getProviderCredit(platform.gameProviders, playerData.name, platformData.platformId).then(
                                credit => {
                                    if(credit){
                                        rtg.totalCredit += credit;
                                    }

                                    return rtg;
                                }
                            );

                            calCreditArr.push(calCreditProm);
                        }
                    }
                });

                return Promise.all(calCreditArr).then(data => data, err => err);
            }
        }
    )
}

function checkSimilarPhoneForPlayers (playerId, platformId, phoneNumber) {
    let playerObjId = playerId ? ObjectId(playerId) : "";
    let platformObjId = platformId ? ObjectId(platformId) : "";
    let encryptedPhoneNumber = phoneNumber ? {$in: [rsaCrypto.encrypt(phoneNumber), rsaCrypto.oldEncrypt(phoneNumber), phoneNumber]} : "";
    let similarPhoneCredibilityRemarkObjId = null;

    let similarPhoneCountProm = dbconfig.collection_players.find({
        _id: {$ne: playerObjId},
        platform: platformObjId,
        phoneNumber: encryptedPhoneNumber,
        isRealPlayer: true,
    }).count();

    let selectedPlayerProm = dbconfig.collection_players.findOne({
        _id: playerObjId,
        platform: platformObjId,
        isRealPlayer: true,
    }).lean();

    let fixedCredibilityRemarksProm = dbPlayerCredibility.getFixedCredibilityRemarks(platformObjId).then(
        remark => {
            if (remark && remark.length > 0) {
                let index = remark.findIndex(x => x && x.name && (x.name === '电话重复') && (x.score || x.score === 0));

                if (index > -1) {
                    return ObjectId(remark[index]._id);
                }
            }
        }
    );

    return Promise.all([similarPhoneCountProm, selectedPlayerProm, fixedCredibilityRemarksProm]).then(
        data => {
            let totalCount = data[0];
            let selectedPlayer = data[1];
            similarPhoneCredibilityRemarkObjId = data[2];

            let credibilityRemarks = [];
            // if there is other player with similar phone in playerData, selected player need to add this credibility remark
            if (totalCount > 0) {
                if (selectedPlayer.credibilityRemarks && selectedPlayer.credibilityRemarks.length > 0) {
                    if (selectedPlayer.credibilityRemarks.some(e => e && similarPhoneCredibilityRemarkObjId && e.toString() === similarPhoneCredibilityRemarkObjId.toString())) {
                        // if similarPhoneCredibilityRemarkObjId already exist
                    } else {
                        // if similarPhoneCredibilityRemarkObjId didn't exist
                        selectedPlayer.credibilityRemarks.push(similarPhoneCredibilityRemarkObjId);
                        credibilityRemarks = selectedPlayer.credibilityRemarks;
                        dbPlayerInfo.updatePlayerCredibilityRemark('System', platformObjId, selectedPlayer._id, credibilityRemarks, '电话重复');
                    }
                } else {
                    // player didn't have any credibility remarks, auto add
                    credibilityRemarks.push(similarPhoneCredibilityRemarkObjId);
                    dbPlayerInfo.updatePlayerCredibilityRemark('System', platformObjId, selectedPlayer._id, credibilityRemarks, '电话重复');
                }
            }
        }
    );
}

function checkIsPlayerBindToPartner (playerId, platformId) {
    let playerObjId = playerId ? ObjectId(playerId) : "";
    let platformObjId = platformId ? ObjectId(platformId) : "";
    let partnerCredibilityRemarkObjId = null;

    let selectedPlayerProm = dbconfig.collection_players.findOne({
        _id: playerObjId,
        platform: platformObjId,
        isRealPlayer: true,
    }).lean();

    let fixedCredibilityRemarksProm = dbconfig.collection_playerCredibilityRemark.findOne({
        platform: platformObjId,
        name: "代理开户",
        isFixed: true
    }, '_id').lean().then(
        remark => {
            if (remark) {
                return remark;
            } else {
                return dbconfig.collection_playerCredibilityRemark({
                    platform: platformObjId,
                    name: "代理开户",
                    score: 0,
                    isFixed: true
                }).save();
            }
        }
    ).then(
        fixedRemark => {
            if (fixedRemark && fixedRemark._id) {
                return fixedRemark._id;
            }
        }
    )

    return Promise.all([selectedPlayerProm, fixedCredibilityRemarksProm]).then(
        data => {
            let selectedPlayer = data[0];
            partnerCredibilityRemarkObjId = data[1];

            let credibilityRemarks = [];
            // if there is other player with similar phone in playerData, selected player need to add this credibility remark

            if (selectedPlayer.credibilityRemarks && selectedPlayer.credibilityRemarks.length > 0) {
                if (selectedPlayer.credibilityRemarks.some(e => e && partnerCredibilityRemarkObjId && e.toString() === partnerCredibilityRemarkObjId.toString())) {
                    // if partnerCredibilityRemarkObjId already exist
                } else {
                    // if partnerCredibilityRemarkObjId didn't exist
                    selectedPlayer.credibilityRemarks.push(partnerCredibilityRemarkObjId);
                    credibilityRemarks = selectedPlayer.credibilityRemarks;
                    dbPlayerInfo.updatePlayerCredibilityRemark('System', platformObjId, selectedPlayer._id, credibilityRemarks, '代理开户');
                }
            } else {
                // player didn't have any credibility remarks, auto add
                credibilityRemarks.push(partnerCredibilityRemarkObjId);
                dbPlayerInfo.updatePlayerCredibilityRemark('System', platformObjId, selectedPlayer._id, credibilityRemarks, '代理开户');
            }
        }
    );
}

var proto = proposalExecutorFunc.prototype;
proto = Object.assign(proto, proposalExecutor);

// This make WebStorm navigation work
module.exports = proposalExecutor;
