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
var dbLogger = require("./../modules/dbLogger");
var constRewardTaskStatus = require("./../const/constRewardTaskStatus");
var constShardKeys = require("./../const/constShardKeys");
var constPlayerCreditChangeType = require("../const/constPlayerCreditChangeType");
var constProposalStatus = require("../const/constProposalStatus");
var Q = require("q");
var mongoose = require('mongoose');
var messageDispatcher = require("./messageDispatcher.js");
var constMessageType = require("../const/constMessageType.js");
var pmsAPI = require("../externalAPI/pmsAPI.js");
var constPlayerSMSSetting = require("../const/constPlayerSMSSetting");
const serverInstance = require("./serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
var queryPhoneLocation = require('query-mobile-phone-area');
var rsaCrypto = require("../modules/rsaCrypto");
const constPlayerTopUpType = require("../const/constPlayerTopUpType");
var dbRewardType = require("../db_modules/dbRewardType.js");
var dbRewardEvent = require("../db_modules/dbRewardEvent.js");
var dbRewardLog = require("../db_modules/dbRewardLog.js");
var dbPlayerReward = require("../db_modules/dbPlayerReward")
var errorUtils = require('./errorUtils');
var dbPartner = require("../db_modules/dbPartner");
var constProposalEntryType = require("../const/constProposalEntryType");
var constProposalUserType = require("../const/constProposalUserType");
var SMSSender = require('./SMSSender');
//Reward Points
const constRewardPointsLogCategory = require("../const/constRewardPointsLogCategory");
const constRewardPointsLogStatus = require("../const/constRewardPointsLogStatus");
let dbRewardPoints = require("../db_modules/dbRewardPoints.js");
let dbPlayerRewardPoints = require("../db_modules/dbPlayerRewardPoints.js");
let dbRewardPointsLog = require("../db_modules/dbRewardPointsLog.js");

let dbConsumptionReturnWithdraw = require("../db_modules/dbConsumptionReturnWithdraw");

const moment = require('moment-timezone');
const ObjectId = mongoose.Types.ObjectId;

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
                            }, {settleTime: new Date()}).then(
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
        },

        init: function () {
            this.executions.executeUpdatePlayerInfo.des = "Update player information";
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
            this.executions.executeUpdatePartnerPhone.des = "Update partner phone number";
            this.executions.executeUpdatePartnerInfo.des = "Update partner information";
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
            this.executions.executePlayerBonus.des = "Player bonus";
            this.executions.executePlayerTopUpReturn.des = "Player top up return";
            this.executions.executePlayerConsumptionIncentive.des = "Player consumption incentive";
            this.executions.executePlayerLevelUp.des = "Player Level Up";
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
            this.executions.executePlayerLimitedOfferReward.des = "Player Limited Offer Reward";
            this.executions.executePlayerTopUpReturnGroup.des = "Player Top Up Return Group Reward";
            this.executions.executePlayerRandomRewardGroup.des = "Player Random Reward Group Reward";
            this.executions.executePlayerConsecutiveRewardGroup.des = "Player Consecutive Group Reward";
            this.executions.executePlayerLoseReturnRewardGroup.des = "Player Lose Return Group Reward";
            this.executions.executePlayerConsumptionRewardGroup.des = "Player Consumption Group Reward";
            this.executions.executePlayerFreeTrialRewardGroup.des = "Player Free Trial Reward Group";
            this.executions.executePlayerConvertRewardPoints.des = "Player Convert Reward Points";

            this.rejections.rejectProposal.des = "Reject proposal";
            this.rejections.rejectUpdatePlayerInfo.des = "Reject player top up proposal";
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
            this.rejections.rejectPlayerBonus.des = "Reject Player bonus";
            this.rejections.rejectPlayerTopUpReturn.des = "Reject Player top up return";
            this.rejections.rejectPlayerConsumptionIncentive.des = "Reject Player consumption incentive";
            this.rejections.rejectPlayerLevelUp.des = "Reject Player Level Up";
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
            this.rejections.rejectPlayerQuickpayTopUp.des = "Reject Player Quickpay Top Up";
            this.rejections.rejectPlayerTopUpPromo.des = "Reject Player Top Up Promo";
            this.rejections.rejectPlayerConsecutiveConsumptionReward.des = "Reject Player Consecutive Consumption Reward";
            this.rejections.rejectPlayerLevelMigration.des = "Reject Player Level Migration";
            this.rejections.rejectPlayerPacketRainReward.des = "Reject Player Packet Rain Reward";
            this.rejections.rejectPlayerPromoCodeReward.des = "Reject Player Promo Code Reward";
            this.rejections.rejectPlayerLimitedOfferReward.des = "Reject Player Limited Offer Reward";
            this.rejections.rejectPlayerTopUpReturnGroup.des = "Reject Player Top Up Return Group Reward";
            this.rejections.rejectPlayerRandomRewardGroup.des = "Reject Player Random Reward Group Reward";
            this.rejections.rejectPlayerConsecutiveRewardGroup.des = "Reject Player Consecutive Group Reward";
            this.rejections.rejectPlayerLoseReturnRewardGroup.des = "Reject Player Lose Return Group Reward";
            this.rejections.rejectPlayerConsumptionRewardGroup.des = "Reject Player Consumption Group Reward";
            this.rejections.rejectPlayerFreeTrialRewardGroup.des = "Reject Player Free Trial Reward Group";
            this.rejections.rejectPlayerConvertRewardPoints.des = "Player Convert Reward Points";
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
                    if (proposalData && proposalData.data && proposalData.data.applyAmount && (proposalData.data.useLockedCredit || proposalData.data.providerGroup)) {
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
            executeUpdatePlayerCredit: function (proposalData, deferred, bTransfer) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateAmount != null) {
                    //changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.updateAmount, constProposalType.UPDATE_PLAYER_CREDIT, proposalData.data).then(deferred.resolve, deferred.reject);
                    //check player reward task
                    return dbconfig.collection_rewardTask.findOne({
                        playerId: proposalData.data.playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }).then(
                        taskData => {
                            if (taskData && proposalData.data.updateLockedAmount != null) {
                                taskData.inProvider = false;
                                taskData._inputCredit = 0;
                                taskData.currentAmount = proposalData.data.updateLockedAmount;
                                return taskData.save();
                            }
                        }
                    ).then(
                        data => {
                            var updateObj = {
                                $inc: {
                                    validCredit: proposalData.data.updateAmount > 0 ? proposalData.data.updateAmount : 0
                                }
                            };
                            if (proposalData.data.updateLockedAmount != null) {
                                updateObj.lockedCredit = proposalData.data.updateLockedAmount;
                                //updateObj.lastPlayedProvider = null;
                            }
                            return dbconfig.collection_players.findOneAndUpdate(
                                {_id: proposalData.data.playerObjId, platform: proposalData.data.platformId},
                                updateObj,
                                {new: true}
                            ).then(
                                newPlayer => {
                                    //make sure credit can not be negative number
                                    if (newPlayer.validCredit < 0) {
                                        newPlayer.validCredit = 0;
                                    }
                                    if (newPlayer.lockedCredit < 0) {
                                        newPlayer.lockedCredit = 0;
                                    }
                                    return newPlayer.save();
                                }
                            );
                        }
                    ).then(
                        player => {
                            if (!player) {
                                deferred.reject({
                                    name: "DataError",
                                    message: "Can't update player credit: player not found."
                                });
                                return;
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
                            deferred.resolve(player);
                        },
                        error => {
                            deferred.reject({name: "DBError", message: "Error updating player.", error: error});
                        }
                    );
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
                }
            },

            /**
             * execution function for fix player credit transfer
             */
            executeFixPlayerCreditTransfer: function (proposalData, deferred) {
                isTransferIdRepaired(proposalData.data.transferId).then(
                    isRepaired => {
                        if (!isRepaired) {
                            setTransferIdAsRepaired(proposalData.data.transferId).catch(errorUtils.reportError);

                            return dbconfig.collection_platform.findOne({_id: proposalData.data.platformId}).lean();
                        }
                        else {
                            deferred.reject({name: "DataError", message: "This transfer has been repaired."});
                        }
                    },
                    err => {
                        deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error(err)});
                    }
                ).then(
                    platform => {
                        if (platform && platform.useProviderGroup) {
                            proposalData.data.proposalId = proposalData.proposalId;
                            fixTransferCreditWithProposalGroup(proposalData.data.transferId, proposalData.data.updateAmount, proposalData.data).then(
                                deferred.resolve, deferred.reject);
                        }
                        else {
                            proposalExecutor.executions.executeUpdatePlayerCredit(proposalData, deferred, true);
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
             * execution function for update player phone number proposal type
             */
            executeUpdatePlayerPhone: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateData && proposalData.data.updateData.phoneNumber) {
                    var queryRes = queryPhoneLocation(proposalData.data.updateData.phoneNumber);
                    if (queryRes) {
                        proposalData.data.updateData.phoneProvince = queryRes.province;
                        proposalData.data.updateData.phoneCity = queryRes.city;
                        proposalData.data.updateData.phoneType = queryRes.type;
                    }
                    // for send message to player before encrypt phone number
                    let phoneNumberLast4Digit = proposalData.data.updateData.phoneNumber.substr(proposalData.data.updateData.phoneNumber.length - 4);
                    proposalData.data.updateData.phoneNumber = rsaCrypto.encrypt(proposalData.data.updateData.phoneNumber);
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
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect update player phone number proposal data"});
                }
            },

            /**
             * execution function for update player info proposal type
             */
            executeUpdatePlayerInfo: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data._id) {
                    var curPartnerId = null;
                    dbconfig.collection_players.findOne({_id: proposalData.data._id}).then(
                        function (data) {
                            if (data) {
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
             * execution function for update player info proposal type
             */
            executeUpdatePlayerBankInfo: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data._id) {
                    var curPartnerId = null;
                    dbconfig.collection_players.findOne({_id: proposalData.data._id}).then(
                        function (data) {
                            if (data) {
                                var playerUpdate = Object.assign({}, proposalData.data);
                                delete playerUpdate.platformId;
                                delete playerUpdate.playerId;
                                delete playerUpdate.playerName;
                                delete playerUpdate._id;

                                return dbconfig.collection_players.findOneAndUpdate(
                                    {_id: data._id, platform: data.platform},
                                    playerUpdate,
                                    {returnNewDocument: true}
                                );
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Failed to find player info"});
                            }
                        },
                        function (error) {
                            deferred.reject({name: "DBError", message: "Failed to find player info", error: error});
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
                                targetType: constProposalUserType.PLAYERS,
                                creatorType: constProposalUserType.SYSTEM_USERS,
                                creatorObjId: proposalData.creator ? proposalData.creator.id : null
                            }
                            dbPlayerInfo.findAndUpdateSimilarPlayerInfoByField(data, 'bankAccount', proposalData.data.bankAccount).then();
                            dbLogger.createBankInfoLog(loggerInfo);
                            //SMSSender.sendByPlayerObjId(proposalData.data._id, constPlayerSMSSetting.UPDATE_PAYMENT_INFO);
                            //bankcardLast4Number(new) send message to player
                            if (proposalData.data.bankAccount) {
                                proposalData.data.bankAccount = proposalData.data.bankAccount.substr(proposalData.data.bankAccount.length - 4);
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
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {partnerName: proposalData.data.partnerName},
                        proposalData.data.updateData,
                        constShardKeys.collection_partner
                    ).then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject({name: "DataError", message: "Failed to update partner bank info", error: err});
                        }
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
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.phoneNumber) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {partnerName: proposalData.data.partnerName},
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
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.email) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {partnerName: proposalData.data.partnerName},
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
                if (proposalData && proposalData.data && proposalData.data.partnerName && proposalData.data.updateData && proposalData.data.updateData.qq) {
                    dbUtil.findOneAndUpdateForShard(
                        dbconfig.collection_partner,
                        {partnerName: proposalData.data.partnerName},
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
                                    if (proposalData.data.updateData.ownDomain) {
                                        return dbPartner.updatePartnerDomain(proposalData.data.partnerObjId, proposalData.data.updateData.ownDomain);
                                    }
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
             * execution function for player top up proposal type
             */
            executePlayerTopUp: function (proposalData, deferred) {
                dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.ONLINE, proposalData).then(
                    function (data) {
                        var wsMessageClient = serverInstance.getWebSocketMessageClient();
                        if (wsMessageClient) {
                            wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                                {
                                    proposalId: proposalData.proposalId,
                                    amount: proposalData.data.amount,
                                    handleTime: new Date(),
                                    status: proposalData.status,
                                    playerId: proposalData.data.playerId
                                }
                            );
                        }
                        dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.ONLINE);
                        let applyPlayerTopUpPromo = dbPlayerReward.applyPlayerTopUpPromo(proposalData);
                        let applyPromoCode = null;
                        if (proposalData.data.bonusCode) {
                            applyPromoCode = dbPlayerReward.applyPromoCode(proposalData.data.playerId, proposalData.data.bonusCode);
                        }
                        Promise.all([applyPlayerTopUpPromo, applyPromoCode]).then(
                            data => {
                                sendMessageToPlayer (proposalData,constMessageType.ONLINE_TOPUP_SUCCESS,{});
                                deferred.resolve(proposalData);
                            },
                            error => {
                                deferred.reject(error)
                            }
                        )

                    },
                    function (error) {
                        deferred.reject(error);
                    }
                )
            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerAlipayTopUp: function (proposalData, deferred) {
                dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.ALIPAY, proposalData).then(
                    function (data) {
                        //todo::add top up notify here ???
                        // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                        // if (wsMessageClient) {
                        //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                        //         {
                        //             proposalId: proposalData.proposalId,
                        //             amount: proposalData.data.amount,
                        //             handleTime: new Date(),
                        //             status: proposalData.status,
                        //             playerId: proposalData.data.playerId
                        //         }
                        //     );
                        // }
                        dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.ALIPAY);
                        let applyPlayerTopUpPromo = dbPlayerReward.applyPlayerTopUpPromo(proposalData, 'aliPay');
                        let applyPromoCode = null;
                        if (proposalData.data.bonusCode) {
                            applyPromoCode = dbPlayerReward.applyPromoCode(proposalData.data.playerId, proposalData.data.bonusCode);
                        }
                        Promise.all([applyPlayerTopUpPromo, applyPromoCode]).then(
                            data => {
                                sendMessageToPlayer (proposalData,constMessageType.ALIPAY_TOPUP_SUCCESS,{});
                                deferred.resolve(proposalData);
                            },
                            error => {
                                deferred.reject(error)
                            }
                        )
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                )

            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerQuickpayTopUp: function (proposalData, deferred) {
                dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.QUICKPAY, proposalData).then(
                    function (data) {
                        //todo::add top up notify here ???
                        // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                        // if (wsMessageClient) {
                        //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                        //         {
                        //             proposalId: proposalData.proposalId,
                        //             amount: proposalData.data.amount,
                        //             handleTime: new Date(),
                        //             status: proposalData.status,
                        //             playerId: proposalData.data.playerId
                        //         }
                        //     );
                        // }
                        deferred.resolve(proposalData);
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                );
            },

            /**
             * execution function for player top up proposal type
             */
            executePlayerWechatTopUp: function (proposalData, deferred) {
                dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.WECHAT, proposalData).then(
                    function (data) {
                        //todo::add top up notify here ???
                        // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                        // if (wsMessageClient) {
                        //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                        //         {
                        //             proposalId: proposalData.proposalId,
                        //             amount: proposalData.data.amount,
                        //             handleTime: new Date(),
                        //             status: proposalData.status,
                        //             playerId: proposalData.data.playerId
                        //         }
                        //     );
                        // }
                        dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.WECHAT);
                        let applyPlayerTopUpPromo = dbPlayerReward.applyPlayerTopUpPromo(proposalData, 'weChat');
                        let applyPromoCode = null;
                        if (proposalData.data.bonusCode) {
                            applyPromoCode = dbPlayerReward.applyPromoCode(proposalData.data.playerId, proposalData.data.bonusCode);
                        }
                        Promise.all([applyPlayerTopUpPromo, applyPromoCode]).then(
                            data => {
                                sendMessageToPlayer (proposalData,constMessageType.WECHAT_TOPUP_SUCCESS,{});
                                deferred.resolve(proposalData);
                            },
                            error => {
                                deferred.reject(error)
                            }
                        )
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                )

            },

            /**
             * execution function for player manual top up proposal type
             */
            executeManualPlayerTopUp: function (proposalData, deferred) {
                //valid data
                if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.amount) {
                    dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.MANUAL, proposalData).then(
                        function (data) {

                            sendMessageToPlayer(proposalData,constMessageType.MANUAL_TOPUP_SUCCESS,{});
                            // SMSSender.sendByPlayerId(proposalData.data.playerId, constMessageType.MANUAL_TOPUP_SUCCESS);
                            // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                            // if (wsMessageClient) {
                            //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "manualTopupStatusNotify",
                            //         {
                            //             proposalId: proposalData.proposalId,
                            //             amount: proposalData.data.amount,
                            //             handleTime: new Date(),
                            //             status: proposalData.status,
                            //             playerId: proposalData.data.playerId
                            //         }
                            //     );
                            // }
                            // DEBUG: Reward sometime not applied issue
                            console.log('applyForPlatformTransactionReward - Start', proposalData.proposalId);
                            dbRewardPoints.updateTopupRewardPointProgress(proposalData, constPlayerTopUpType.MANUAL);
                            // return dbPlayerInfo.applyForPlatformTransactionReward(proposalData.data.platformId, proposalData.data.playerId, proposalData.data.amount, proposalData.data.playerLevel, proposalData.data.bankCardType);
                            let applyforTransactionReward = dbPlayerInfo.applyForPlatformTransactionReward(proposalData.data.platformId, proposalData.data.playerId, proposalData.data.amount, proposalData.data.playerLevel, proposalData.data.bankCardType);
                            let applyPromoCode = null;
                            if (proposalData.data.bonusCode) {
                                applyPromoCode = dbPlayerReward.applyPromoCode(proposalData.data.playerId, proposalData.data.bonusCode);
                            }
                            Promise.all([applyforTransactionReward, applyPromoCode]).then(
                                data => {
                                    deferred.resolve(proposalData);
                                },
                                error => {
                                    deferred.reject(error)
                                }
                            )
                        },
                        function (error) {
                            deferred.reject(error);
                        }
                    )
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect proposal data", error: Error()});
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
             * execution function for first top up proposal type
             */
            executePlayerConsumptionReturn: function (proposalData, deferred) {
                //create reward task for related player
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount >= 0) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.rewardAmount, constRewardType.PLAYER_CONSUMPTION_RETURN, proposalData.data).then(
                        () => {
                            //remove all consumption summaries
                            if (!Number(proposalData.data.spendingAmount)) {
                                dbConsumptionReturnWithdraw.addXimaWithdraw(proposalData.data.playerObjId, proposalData.data.rewardAmount).catch(errorUtils.reportError);
                            }
                            sendMessageToPlayer(proposalData,constRewardType.PLAYER_CONSUMPTION_RETURN,{});
                            return dbconfig.collection_playerConsumptionSummary.remove(
                                {_id: {$in: proposalData.data.summaryIds}}
                            );
                        }
                    ).then(deferred.resolve, deferred.reject);
                }
                else {
                    deferred.reject({name: "DataError", message: "Incorrect player consumption return proposal data"});
                }
            },

            executePlayerBonus: function (proposalData, deferred) {
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

                        var decryptedPhoneNo = player.phoneNumber;

                        if (player.phoneNumber && player.phoneNumber.length > 20) {
                            try {
                                decryptedPhoneNo = rsaCrypto.decrypt(player.phoneNumber);
                            }
                            catch (err) {
                                console.log(err);
                                decryptedPhoneNo = "";
                            }
                        }
                        let cTime = proposalData && proposalData.createTime ? new Date(proposalData.createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        var message = {
                            proposalId: proposalData.proposalId,
                            platformId: player.platform.platformId,
                            bonusId: proposalData.data.bonusId,
                            amount: proposalData.data.amount,
                            bankTypeId: player.bankName || "",
                            accountName: player.bankAccountName || "",
                            accountType: player.bankAccountType || "",
                            accountCity: player.bankAccountCity || "",
                            accountNo: player.bankAccount || "",
                            bankAddress: player.bankAddress || "",
                            bankName: player.bankName || "",
                            phone: decryptedPhoneNo || "",
                            email: player.email || "",
                            loginName: player.name || "",
                            applyTime: cTimeString
                        };
                        //console.log("bonus_applyBonus", message);
                        return pmsAPI.bonus_applyBonus(message).then(
                            bonusData => {
                                if (bonusData) {
                                    sendMessageToPlayer(proposalData,constMessageType.WITHDRAW_SUCCESS,{});
                                    return bonusData;
                                }
                                else {
                                    return Q.reject({name: "DataError", errorMessage: "Cannot request bonus"});
                                }
                            }
                        );
                    }
                ).then(deferred.resolve, deferred.reject);
            },

            executePartnerBonus: function (proposalData, deferred) {
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

                        var decryptedPhoneNo = partner.phoneNumber;

                        if (partner.phoneNumber && partner.phoneNumber.length > 20) {
                            try {
                                decryptedPhoneNo = rsaCrypto.decrypt(partner.phoneNumber);
                            }
                            catch (err) {
                                console.error(err);
                                decryptedPhoneNo = "";
                            }
                        }

                        var message = {
                            proposalId: proposalData.proposalId,
                            platformId: partner.platform.platformId,
                            bonusId: proposalData.data.bonusId,
                            amount: proposalData.data.amount,
                            bankTypeId: partner.bankName || "",
                            accountName: partner.bankAccountName || "",
                            accountType: partner.bankAccountType || "",
                            accountCity: partner.bankAccountCity || "",
                            accountNo: partner.bankAccount || "",
                            bankAddress: partner.bankAddress || "",
                            bankName: partner.bankName || "",
                            phone: decryptedPhoneNo || "",
                            email: partner.email || ""
                        };
                        return pmsAPI.bonus_applyBonus(message).then(
                            bonusData => {
                                if (bonusData) {
                                    return bonusData;
                                }
                                else {
                                    return Q.reject({name: "DataError", errorMessage: "Cannot request bonus"});
                                }
                            }
                        );
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
                    ).then(deferred.resolve, deferred.reject);
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
                        newPartner => {
                            //make sure credit can not be negative number
                            if (newPartner.credits < 0) {
                                newPartner.credits = 0;
                            }
                            return newPartner.save();
                        }
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
                    if (proposalData.data.providerGroup) {
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

            executePlayerLimitedOfferReward: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_LIMITED_OFFERS_REWARD,
                        rewardType: constRewardType.PLAYER_LIMITED_OFFERS_REWARD,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        applyAmount: proposalData.data.applyAmount,
                        currentAmount: proposalData.data.applyAmount + proposalData.data.rewardAmount,
                        initAmount: proposalData.data.applyAmount + proposalData.data.rewardAmount,
                        eventId: proposalData.data.eventId
                    };

                    if (proposalData.data.providers) {
                        taskData.targetProviders = proposalData.data.providers;
                    } else {
                        taskData.providerGroup = proposalData.data.providerGroup;
                    }

                    createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_LIMITED_OFFERS_REWARD, proposalData);
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Incorrect player promo code reward proposal data"
                    });
                }
            },

            executePlayerTopUpReturnGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
                        rewardType: constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + proposalData.data.applyAmount : proposalData.data.rewardAmount,
                        initAmount: proposalData.data.isDynamicRewardAmount ? proposalData.data.rewardAmount + proposalData.data.applyAmount : proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: proposalData.data.applyAmount,
                        providerGroup: proposalData.data.providerGroup
                    };

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_TOP_UP_RETURN_GROUP, proposalData);
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

            executePlayerRandomRewardGroup: function (proposalData, deferred) {
                //verify data
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.platformObjId && proposalData.data.rewardAmount) {
                    proposalData.data.proposalId = proposalData.proposalId;
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        type: constRewardType.PLAYER_RANDOM_REWARD_GROUP,
                        rewardType: constRewardType.PLAYER_RANDOM_REWARD_GROUP,
                        platformId: proposalData.data.platformId,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        currentAmount: proposalData.data.rewardAmount,
                        initAmount: proposalData.data.rewardAmount,
                        useConsumption: Boolean(proposalData.data.useConsumption),
                        eventId: proposalData.data.eventId,
                        applyAmount: 0,
                        rewardAppearPeriod: proposalData.data.rewardAppearPeriod,
                        providerGroup: proposalData.data.providerGroup
                    };
                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_RANDOM_REWARD_GROUP, proposalData);
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
                    deferred.reject({name: "DataError", message: "Incorrect player random reward group proposal data"});
                }
            },

            executePlayerConsecutiveRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
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

            executePlayerLoseReturnRewardGroup: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
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

                    let deferred1 = Q.defer();
                    createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP, proposalData);
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
                    deferred.reject({name: "DataError", message: "Incorrect player lose return group proposal data"});
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

            executePlayerConvertRewardPoints: function (proposalData, deferred) {
                if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.playerRewardPointsObjId) {
                    let isPeriodPointConversion = proposalData.creator.type == 'system';
                    let taskData = {
                        playerId: proposalData.data.playerObjId,
                        platformId: proposalData.data.platformObjId,
                        type: isPeriodPointConversion ? constRewardType.PLAYER_PERIOD_POINT_CONVERSION : constRewardType.PLAYER_EARLY_POINT_CONVERSION,
                        rewardType: isPeriodPointConversion ? constRewardType.PLAYER_PERIOD_POINT_CONVERSION : constRewardType.PLAYER_EARLY_POINT_CONVERSION,
                        currentAmount: proposalData.data.convertCredit,
                        initAmount: proposalData.data.convertCredit,
                        requiredUnlockAmount: proposalData.data.spendingAmount,
                        providerGroup: proposalData.data.providerGroup,
                        applyAmount: 0,
                        data: {
                            category: isPeriodPointConversion ? constRewardPointsLogCategory.PERIOD_POINT_CONVERSION : constRewardPointsLogCategory.EARLY_POINT_CONVERSION,
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
                                        }).then(
                                            cleanRecord => {
                                                if (cleanRecord) {
                                                    //recover amount
                                                    cleanRecord.amount = cleanRecord.amount + summary.amount;
                                                    cleanRecord.validAmount = cleanRecord.validAmount + summary.validAmount;
                                                    return cleanRecord.save().then(
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
                var wsMessageClient = serverInstance.getWebSocketMessageClient();
                if (wsMessageClient) {
                    wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                        {
                            proposalId: proposalData.proposalId,
                            amount: proposalData.data.amount,
                            handleTime: new Date(),
                            status: proposalData.status,
                            playerId: proposalData.data.playerId
                        }
                    );
                }

                pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId}).then(
                    deferred.resolve, deferred.reject
                );
            },

            /**
             * reject function for player alipay top up
             */
            rejectPlayerAlipayTopUp: function (proposalData, deferred) {
                // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                // if (wsMessageClient) {
                //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                //         {
                //             proposalId: proposalData.proposalId,
                //             amount: proposalData.data.amount,
                //             handleTime: new Date(),
                //             status: proposalData.status,
                //             playerId: proposalData.data.playerId
                //         }
                //     );
                // }
                // pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId}).then(
                //     deferred.resolve, deferred.reject
                // );
                deferred.resolve("Proposal is rejected")
            },

            /**
             * reject function for player quickpay top up
             */
            rejectPlayerQuickpayTopUp: function (proposalData, deferred) {
                // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                // if (wsMessageClient) {
                //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                //         {
                //             proposalId: proposalData.proposalId,
                //             amount: proposalData.data.amount,
                //             handleTime: new Date(),
                //             status: proposalData.status,
                //             playerId: proposalData.data.playerId
                //         }
                //     );
                // }
                pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId}).then(
                    deferred.resolve, deferred.reject
                );
            },

            /**
             * reject function for player wechat top up
             */
            rejectPlayerWechatTopUp: function (proposalData, deferred) {
                // var wsMessageClient = serverInstance.getWebSocketMessageClient();
                // if (wsMessageClient) {
                //     wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "onlineTopupStatusNotify",
                //         {
                //             proposalId: proposalData.proposalId,
                //             amount: proposalData.data.amount,
                //             handleTime: new Date(),
                //             status: proposalData.status,
                //             playerId: proposalData.data.playerId
                //         }
                //     );
                // }
                // pmsAPI.payment_requestCancellationPayOrder({proposalId: proposalData.proposalId}).then(
                //     deferred.resolve, deferred.reject
                // );
                deferred.resolve("Proposal is rejected")
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
                var wsMessageClient = serverInstance.getWebSocketMessageClient();
                if (wsMessageClient) {
                    wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "payment", "manualTopupStatusNotify",
                        {
                            proposalId: proposalData.proposalId,
                            amount: proposalData.data.amount,
                            handleTime: new Date(),
                            status: proposalData.status,
                            playerId: proposalData.data.playerId
                        }
                    );
                }
                deferred.resolve("Proposal is rejected");
            },

            /**
             * reject function for player bonus
             */
            rejectPlayerBonus: function (proposalData, deferred) {
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
                if (proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.platformId && proposalData.data.amount && proposalData.data.bonusCredit) {
                    return dbconfig.collection_partner.findOneAndUpdate(
                        {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformId},
                        {$inc: {credits: proposalData.data.amount * proposalData.data.bonusCredit}},
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

            rejectPlayerRandomRewardGroup: function (proposalData, deferred) {
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

            rejectPlayerConvertRewardPoints: function (proposalData, deferred) {
                dbRewardPointsLog.updateConvertRewardPointsLog(proposalData.proposalId, constRewardPointsLogStatus.CANCELLED, null);
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
 * @param proposalData
 * @param taskData
 * @param deferred
 * @param rewardType
 * @param [resolveValue] - Optional.  Without this, resolves with the newly created reward task.
 */
function createRewardTaskForProposal(proposalData, taskData, deferred, rewardType, resolveValue) {
    let rewardTask, platform, gameProviderGroup;
    //check if player object id is in the proposal data
    if (!(proposalData && proposalData.data && proposalData.data.playerObjId)) {
        deferred.reject({name: "DBError", message: "Invalid reward proposal data"});
        return;
    }

    // Add proposalId in reward data
    taskData.proposalId = proposalData.proposalId;

    let gameProviderGroupProm = Promise.resolve(false);
    let platformProm = dbconfig.collection_platform.findOne({_id: proposalData.data.platformId}).lean();

    // Check whether game provider group exist
    if (proposalData.data.providerGroup && proposalData.data.providerGroup.toString().length === 24) {
        gameProviderGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: proposalData.data.providerGroup}).lean();
    }

    Promise.all([gameProviderGroupProm, platformProm]).then(
        res => {
            gameProviderGroup = res[0];
            platform = res[1];

            // Create different process flow for lock provider group reward
            if (platform.useProviderGroup) {
                if (proposalData.data.providerGroup && gameProviderGroup) {
                    dbRewardTask.createRewardTaskWithProviderGroup(taskData, proposalData).then(() =>{
                        dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                    }).catch(
                        error => Q.reject({
                            name: "DBError",
                            message: "Error creating reward task with provider group",
                            error: error
                        })
                    );
                    sendMessageToPlayer(proposalData,rewardType,{rewardTask: taskData});
                    if (proposalData.data.isDynamicRewardAmount || (proposalData.data.promoCode && proposalData.data.promoCodeTypeValue && proposalData.data.promoCodeTypeValue == 3)
                    || proposalData.data.limitedOfferObjId) {
                        dbRewardTask.deductTargetConsumptionFromFreeAmountProviderGroup(taskData, proposalData).then(() =>{
                            dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                        }).catch(
                            error => Q.reject({
                                name: "DBError",
                                message: "Error deduct target consumption from free amount provider group",
                                error: error
                            })
                        );
                    }
                } else {
                    dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData, rewardType).then(
                        data => {
                            rewardTask = data;
                            dbConsumptionReturnWithdraw.clearXimaWithdraw(proposalData.data.playerObjId).catch(errorUtils.reportError);
                            return sendMessageToPlayer(proposalData,rewardType,{rewardTask: taskData});
                        }
                    ).catch(
                        error => errorUtils.reportError(error)
                        //    Q.reject({
                        //    name: "DBError",
                        //    message: "Error adding consumption value into free amount provider group",
                        //    error: error
                        // })
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

            return deferred.resolve(resolveValue);
        }
    );
}
function sendMessageToPlayer (proposalData,type,metaDataObj) {
    //type that need to add 'Success' status
    let needSendMessageRewardTypes = [constRewardType.PLAYER_PROMO_CODE_REWARD, constRewardType.PLAYER_CONSUMPTION_RETURN, constRewardType.PLAYER_LIMITED_OFFERS_REWARD,constRewardType.PLAYER_TOP_UP_RETURN_GROUP,
        constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP,constRewardType.PLAYER_CONSECUTIVE_REWARD_GROUP,
        constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP,constRewardType.PLAYER_FREE_TRIAL_REWARD_GROUP,
    ];

    // type reference to constMessageType or constMessageTypeParam.name
    let messageType = type;
    if(needSendMessageRewardTypes.indexOf(type)!==-1){
         messageType = type + 'Success';
    }
    
    SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, messageType, proposalData);
    // Currently can't see it's dependable when provider group is off, and maybe causing manual reward task can't be proporly executed
    // Changing into async function
    //dbRewardTask.insertConsumptionValueIntoFreeAmountProviderGroup(taskData, proposalData).catch(errorUtils.reportError);
    //send message if there is any template created for this reward
    return messageDispatcher.dispatchMessagesForPlayerProposal(proposalData, messageType, metaDataObj).catch(err=>{console.error(err)});

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
    let transferLog, providerGroup, player, provider, creditChangeLog;
    let changedValidCredit = 0, changedLockedCredit = 0;
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

            let gameProviderGroupProm = dbconfig.collection_gameProviderGroup.findOne({
                platform: transferLog.platformObjId,
                providers: provider._id,
            }).lean();

            let playerProm = dbconfig.collection_players.findOne({_id: transferLog.playerObjId}).lean();

            let creditChangeLogProm = dbconfig.collection_creditChangeLog.findOne({
                platformId: transferLog.platformObjId,
                transferId: transferId
            }).lean();

            return Promise.all([gameProviderGroupProm, playerProm, creditChangeLogProm]);
        }
    ).then(
        data => {
            if (!data || !data[0] || !data[1]) {
                return;
            }
            providerGroup = data[0];
            player = data[1];
            creditChangeLog = data[2];

            return dbconfig.collection_rewardTaskGroup.findOne({
                platformId: transferLog.platformObjId,
                playerId: transferLog.playerObjId,
                providerGroup: providerGroup._id,
                status: constRewardTaskStatus.STARTED
            }).lean();
        }
    ).then(
        rewardTaskGroup => {
            console.log("DEBUG LOG :: Getting reward task group for repair transfer ID: " + transferId + " as", rewardTaskGroup);
            console.log("DEBUG LOG :: Player original credit:", player.validCredit);
            if (rewardTaskGroup && rewardTaskGroup._inputRewardAmt) {
                let inputFreeAmt = rewardTaskGroup._inputFreeAmt;
                let inputRewardAmt = rewardTaskGroup._inputRewardAmt;

                if (creditChangeLog) {
                    inputFreeAmt = -creditChangeLog.amount;
                    inputRewardAmt = -creditChangeLog.changedLockedAmount;
                }

                changedValidCredit = inputFreeAmt;
                changedLockedCredit = inputRewardAmt;
                let lockedAmount = inputRewardAmt;
                let validCredit = inputFreeAmt;

                let updateRewardTaskGroupProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                    _id: rewardTaskGroup._id,
                    platformId: rewardTaskGroup.platformId
                }, {
                    // rewardAmt: lockedAmount,
                    $inc: {
                        rewardAmt: lockedAmount,
                    },
                    // _inputRewardAmt: 0,
                    // _inputFreeAmt: 0,
                    // inProvider: false
                }, {
                    new: true
                }).lean();

                let updateValidCredit = dbconfig.collection_players.findOneAndUpdate({
                    _id: player._id,
                    platform: player.platform
                }, {
                    $inc: {
                        validCredit: validCredit > 0 ? validCredit : 0
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
            }
            if (updatedPlayer.lockedCredit < 0) {
                updatedPlayer.lockedCredit = 0;
            }
            return updatedPlayer.save();
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
                            let rewardPointsLogStatus = proposalData.status == constProposalStatus.APPROVED ? constRewardPointsLogStatus.PROCESSED : constRewardPointsLogStatus.PENDING;
                            let updateAmount = proposalData.data.convertedRewardPoints >= 0 ? -Math.abs(proposalData.data.convertedRewardPoints) : Math.abs(proposalData.data.convertedRewardPoints);
                            return dbPlayerRewardPoints.tryToDeductRewardPointFromPlayer(playerRewardPoints.playerObjId, playerRewardPoints.platformObjId,
                                updateAmount, taskData.data.category, proposalData.data.remark,
                                proposalData.inputDevice, proposalData.creator.name, rewardPointsLogStatus, proposalData.data.currentDayAppliedAmount, proposalData.data.maxDayApplyAmount,
                                rewardTask._id, taskData.proposalId);
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

var proto = proposalExecutorFunc.prototype;
proto = Object.assign(proto, proposalExecutor);

// This make WebStorm navigation work
module.exports = proposalExecutor;
