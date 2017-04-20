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
var errorUtils = require('./errorUtils');
var dbPartner = require("../db_modules/dbPartner");
var constProposalEntryType = require("../const/constProposalEntryType");
var constProposalUserType = require("../const/constProposalUserType");
var SMSSender = require('./SMSSender');

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
                        if (proposalData.mainType === 'Reward') {
                            return createRewardLogForProposal("GET_FROM_PROPOSAL", proposalData).then(
                                () => responseData
                            );
                        } else {
                            return responseData;
                        }
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
        this.executions.executeUpdatePlayerPhone.des = "Update player phone number";
        this.executions.executeUpdatePlayerBankInfo.des = "Update player bank information";
        this.executions.executeAddPlayerRewardTask.des = "Add player reward task";
        this.executions.executeUpdatePartnerBankInfo.des = "Update partner bank information";
        this.executions.executeUpdatePartnerEmail.des = "Update partner email";
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
        this.executions.executePartnerChildrenCommission.des = "Partner Children Commission";
        this.executions.executePlayerDoubleTopUpReward.des = "Player double top up reward";

        this.rejections.rejectProposal.des = "Reject proposal";
        this.rejections.rejectUpdatePlayerInfo.des = "Reject player top up proposal";
        this.rejections.rejectUpdatePlayerCredit.des = "Reject player update credit proposal";
        this.rejections.rejectFixPlayerCreditTransfer.des = "Reject fix player credit transfer proposal";
        this.rejections.rejectPlayerConsumptionReturnFix.des = "Reject update player credit for consumption return";
        this.rejections.rejectUpdatePlayerEmail.des = "Reject player update email proposal";
        this.rejections.rejectUpdatePlayerPhone.des = "Reject player update phone number proposal";
        this.rejections.rejectUpdatePlayerBankInfo.des = "Reject player update bank information";
        this.rejections.rejectAddPlayerRewardTask.des = "Reject add player reward task";
        this.rejections.rejectUpdatePartnerBankInfo.des = "Reject partner update bank information";
        this.rejections.rejectUpdatePartnerPhone.des = "Reject partner update phone number";
        this.rejections.rejectUpdatePartnerEmail.des = "Reject partner update email";
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
        this.rejections.rejectPartnerChildrenCommission.des = "Reject Partner Children Commission";
        this.rejections.rejectPlayerDoubleTopUpReward.des = "Reject Player double top up return";
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

                return dbPlayerInfo.refundPlayerCredit(playerObjId, platformObjId, refundAmount, reason, proposalData.data)
            }
        );
    },

    refundPlayerApplyAmountIfNeeded: function (proposalData, reason) {
        return Q.resolve().then(
            () => {
                if (proposalData && proposalData.data && proposalData.data.applyAmount) {
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
                        usedRecords = proposalData.data.topUpRecordIds;
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
                            {bDirty: false},
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

    /**
     * execution functions
     * MARK:: all function name must follow the same naming convention
     * Example:: execute + <proposal type name>
     */
    executions: {
        /**
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
                        var changeType = bTransfer ? constProposalType.FIX_PLAYER_CREDIT_TRANSFER : constProposalType.UPDATE_PLAYER_CREDIT;
                        dbLogger.createCreditChangeLogWithLockedCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.updateAmount,
                            changeType, player.validCredit, player.lockedAmount, proposalData.data.changedLockedAmount, null, proposalData.data);
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
            proposalExecutor.executions.executeUpdatePlayerCredit(proposalData, deferred, true);
        },

        /**
         * execution function for player consumption return fix
         */
        executePlayerConsumptionReturnFix: function (proposalData, deferred) {
            //valid data
            if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.updateAmount > 0) {
                changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.updateAmount, constProposalType.PLAYER_CONSUMPTION_RETURN_FIX, proposalData.data).then(
                    res => {
                        SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, constPlayerSMSSetting.CONSUMPTION_RETURN);
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
                proposalData.data.updateData.phoneNumber = rsaCrypto.encrypt(proposalData.data.updateData.phoneNumber);
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
                                playerUpdate
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
                        dbLogger.createBankInfoLog(loggerInfo);
                        SMSSender.sendByPlayerObjId(proposalData.data._id, constPlayerSMSSetting.UPDATE_PAYMENT_INFO);
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
                    deferred.resolve(proposalData);
                },
                function (error) {
                    deferred.reject(error);
                }
            );
        },

        /**
         * execution function for player manual top up proposal type
         */
        executeManualPlayerTopUp: function (proposalData, deferred) {
            //valid data
            if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.amount) {
                dbPlayerInfo.playerTopUp(proposalData.data.playerObjId, Number(proposalData.data.amount), "", constPlayerTopUpType.MANUAL, proposalData).then(
                    function (data) {
                        SMSSender.sendByPlayerId(proposalData.data.playerId, constPlayerSMSSetting.MANUAL_TOPUP);
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
                        dbPlayerInfo.applyForPlatformTransactionReward(proposalData.data.platformId, proposalData.data.playerId, proposalData.data.amount, proposalData.data.playerLevel, proposalData.data.bankCardType).then(
                            data => deferred.resolve(data),
                            error => deferred.reject(error)
                        );
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                );
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
            if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount
                && proposalData.data.spendingAmount) {

                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        //type: constRewardType.FULL_ATTENDANCE
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
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
                        else if (curData.type == constRewardType.FULL_ATTENDANCE) {
                            // @todo We are not creating a new task, but should we create a rewardLog here?
                            var taskData = {
                                $inc: {
                                    requiredUnlockAmount: proposalData.data.spendingAmount,
                                    initAmount: proposalData.data.rewardAmount,
                                    currentAmount: proposalData.data.rewardAmount
                                }
                            };
                            dbRewardTask.updateRewardTask({
                                _id: curData._id,
                                platformId: curData.platformId
                            }, taskData).then(
                                function (data) {
                                    deferred.resolve(data);
                                },
                                function (error) {
                                    deferred.reject({
                                        name: "DBError",
                                        message: "Error updating reward task for consecutive top up",
                                        error: error
                                    });
                                }
                            );
                        }
                        else {
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for consecutive top up",
                            error: error
                        });
                    }
                );
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

                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        //type: constRewardType.GAME_PROVIDER_REWARD,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
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
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for consecutive top up",
                            error: error
                        });
                    }
                );
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

                //todo::update existing reward task here
                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        //type: constRewardType.FIRST_TOP_UP,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
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
                                targetEnable: proposalData.data.targetEnable
                            };
                            if (proposalData.data.providers) {
                                taskData.targetProviders = proposalData.data.providers;
                            }
                            createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.FIRST_TOP_UP, proposalData);
                        }
                        else {
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for first top up",
                            error: error
                        });
                    }
                );
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

                //todo::update existing reward task here
                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
                            var taskData = {
                                playerId: proposalData.data.playerObjId,
                                type: constRewardType.PLAYER_TOP_UP_RETURN,
                                rewardType: constRewardType.PLAYER_TOP_UP_RETURN,
                                platformId: proposalData.data.platformId,
                                requiredUnlockAmount: proposalData.data.spendingAmount,
                                //todo::check current amount init value???
                                currentAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                                initAmount: proposalData.data.rewardAmount + proposalData.data.applyAmount,
                                useConsumption: proposalData.data.useConsumption,
                                eventId: proposalData.data.eventId,
                                applyAmount: proposalData.data.applyAmount,
                                targetEnable: proposalData.data.targetEnable
                            };
                            if (proposalData.data.providers) {
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
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for player top up return",
                            error: error
                        });
                    }
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

                //todo::update existing reward task here
                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
                            var taskData = {
                                playerId: proposalData.data.playerObjId,
                                type: constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
                                rewardType: constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
                                platformId: proposalData.data.platformId,

                                requiredUnlockAmount: proposalData.data.spendingAmount,
                                //todo::check current amount init value???
                                currentAmount: proposalData.data.rewardAmount,
                                initAmount: proposalData.data.rewardAmount,
                                //useConsumption: proposalData.data.useConsumption
                                eventId: proposalData.data.eventId
                            };
                            createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_CONSUMPTION_INCENTIVE, proposalData);
                        }
                        else {
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for player top up return",
                            error: error
                        });
                    }
                );
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
                changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.rewardAmount, constRewardType.PLAYER_CONSUMPTION_RETURN, proposalData.data).then(
                    () => {
                        //remove all consumption summaries
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
                        email: player.email || ""
                    };
                    //console.log("bonus_applyBonus", message);
                    return pmsAPI.bonus_applyBonus(message).then(
                        bonusData => {
                            if (bonusData) {
                                /*
                                 //update proposal status to pending
                                 return dbconfig.collection_proposal.findOneAndUpdate(
                                 {_id: proposalData._id, createTime: proposalData.createTime},
                                 {
                                 status: constProposalStatus.PENDING,
                                 "data.bonusTaskId": bonusData.bonusTaskId
                                 },
                                 {new: true}
                                 );
                                 */
                                //return proposalData;
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
                                /*
                                 //update proposal status to pending
                                 return dbconfig.collection_proposal.findOneAndUpdate(
                                 {_id: proposal._id, createTime: proposal.createTime},
                                 {status: constProposalStatus.PENDING, "data.bonusTaskId": bonusData.bonusTaskId},
                                 {new: true}
                                 );
                                 */
                                //return proposalData;
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
                    dbRewardTask.getRewardTask(
                        {
                            playerId: proposalData.data.playerObjId,
                            status: constRewardTaskStatus.STARTED
                        }
                    ).then(
                        function (curData) {
                            if (!curData) {
                                var taskData = {
                                    playerId: proposalData.data.playerObjId,
                                    type: constRewardType.PLAYER_LEVEL_UP,
                                    rewardType: constRewardType.PLAYER_LEVEL_UP,
                                    platformId: proposalData.data.platformObjId,
                                    //todo::check unlock amount here
                                    requiredUnlockAmount: proposalData.data.requiredUnlockAmount,
                                    currentAmount: proposalData.data.rewardAmount,
                                    initAmount: proposalData.data.rewardAmount,
                                };
                                createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_LEVEL_UP, proposalData);
                            }
                            else {
                                deferred.reject({
                                    name: "DBError",
                                    message: "Player already has reward task ongoing",
                                });
                            }
                        },
                        function (error) {
                            deferred.reject({
                                name: "DBError",
                                message: "Error finding reward task for player top up return",
                                error: error
                            });
                        }
                    );
                }
                else {
                    changePlayerCredit(proposalData.data.playerObjId, proposalData.data.platformObjId, proposalData.data.rewardAmount, constProposalType.PLAYER_LEVEL_UP, proposalData.data).then(deferred.resolve, deferred.reject);
                }
            }
            else {
                deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
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
                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
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
                                applyAmount: proposalData.data.applyAmount
                            };
                            createRewardTaskForProposal(proposalData, taskData, deferred, constRewardType.PLAYER_TOP_UP_REWARD, proposalData);
                        }
                        else {
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for player top up reward",
                            error: error
                        });
                    }
                );
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
            if (proposalData && proposalData.data && proposalData.data.playerId && proposalData.data.platformId) {
                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerId,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
                            dbRewardTask.createRewardTask(proposalData.data).then(
                                deferred.resolve, deferred.reject
                            );
                        }
                        else {
                            deferred.reject({name: "DataError", message: "Player already has reward task"});
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for player top up reward",
                            error: error
                        });
                    }
                );
            }
            else {
                deferred.reject({name: "DataError", message: "Incorrect add player reward task proposal data"});
            }
        },

        executePlayerRegistrationReward: function (proposalData, deferred) {
            //create reward task for related player
            //verify data
            if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount && proposalData.data.unlockBonusAmount != null) {
                if (proposalData.data.unlockBonusAmount > 0) {
                    dbRewardTask.getRewardTask(
                        {
                            playerId: proposalData.data.playerObjId,
                            status: constRewardTaskStatus.STARTED
                        }
                    ).then(
                        function (curData) {
                            if (!curData) {
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
                                deferred.reject({
                                    name: "DBError",
                                    message: "Player already has reward task ongoing",
                                });
                            }
                        },
                        function (error) {
                            deferred.reject({
                                name: "DBError",
                                message: "Error finding reward task for player top up reward",
                                error: error
                            });
                        }
                    );
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
            dbRewardTask.completeRewardTask(proposalData.data).then(deferred.resolve, deferred.reject);
        },

        executePartnerCommission: function (proposalData, deferred) {
            if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                dbconfig.collection_partner.findOneAndUpdate(
                    {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformObjId},
                    {
                        lastCommissionSettleTime: proposalData.data.lastCommissionSettleTime,
                        //
                        negativeProfitAmount: proposalData.data.negativeProfitAmount,
                        $push: {commissionHistory: proposalData.data.commissionLevel},
                        negativeProfitStartTime: proposalData.data.negativeProfitStartTime,
                        $inc: {credits: proposalData.data.commissionAmount}
                    }
                ).then(
                    deferred.resolve, deferred.reject
                );
            }
            else {
                deferred.reject({name: "DataError", message: "Incorrect partner commission proposal data"});
            }
        },

        executePartnerChildrenCommission: function (proposalData, deferred) {
            if (proposalData && proposalData.data && proposalData.data.partnerObjId) {
                dbconfig.collection_partner.findOneAndUpdate(
                    {_id: proposalData.data.partnerObjId, platform: proposalData.data.platformObjId},
                    {
                        lastCommissionSettleTime: proposalData.data.lastCommissionSettleTime,
                        $inc: {credits: proposalData.data.commissionAmountFromChildren}
                    }
                ).then(
                    deferred.resolve, deferred.reject
                );
            }
            else {
                deferred.reject({name: "DataError", message: "Incorrect partner children commission proposal data"});
            }
        },

        /**
         * execution function for player top up return proposal type
         */
        executePlayerDoubleTopUpReward: function (proposalData, deferred) {
            //create reward task for related player
            //verify data
            if (proposalData && proposalData.data && proposalData.data.playerObjId && proposalData.data.rewardAmount) {
                dbRewardTask.getRewardTask(
                    {
                        playerId: proposalData.data.playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }
                ).then(
                    function (curData) {
                        if (!curData) {
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
                            var deferred1 = Q.defer();
                            createRewardTaskForProposal(proposalData, taskData, deferred1, constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD, proposalData);
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
                            deferred.reject({
                                name: "DBError",
                                message: "Player already has reward task ongoing",
                            });
                        }
                    },
                    function (error) {
                        deferred.reject({
                            name: "DBError",
                            message: "Error finding reward task for player top up return",
                            error: error
                        });
                    }
                );
            }
            else {
                deferred.reject({name: "DataError", message: "Incorrect player top up return proposal data"});
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
                return proposalExecutor.refundPlayer(proposalData, -proposalData.data.updateAmount, "rejectUpdatePlayerCredit")
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
         * reject function for UpdatePartnerInfo proposal
         */
        rejectUpdatePartnerInfo: function (proposalData, deferred) {
            deferred.resolve("Proposal is rejected");
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
            proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, "rejectGameProviderReward").then(deferred.resolve, deferred.reject);
        },

        /**
         * reject function for first top up reward
         */
        rejectFirstTopUp: function (proposalData, deferred) {
            //todo::send reject reason to player
            //clean top up records that are used for application
            proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, "rejectFirstTopUp").then(
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
            deferred.resolve("Proposal is rejected");
            //
            // //clean record or reset amount
            // if (proposalData && proposalData.data && proposalData.data.summaryIds) {
            //     dbconfig.collection_playerConsumptionSummary.find(
            //         {_id: {$in: proposalData.data.summaryIds}}
            //     ).lean().then(
            //         summaryRecords => {
            //             if (summaryRecords && summaryRecords.length > 0) {
            //                 var summaryProms = summaryRecords.map(
            //                     summary => {
            //                         dbconfig.collection_playerConsumptionSummary.findOne({
            //                             platformId: summary.platformId,
            //                             playerId: summary.playerId,
            //                             gameType: summary.gameType,
            //                             summaryDay: summary.summaryDay,
            //                             bDirty: false
            //                         }).then(
            //                             cleanRecord => {
            //                                 if (cleanRecord) {
            //                                     //recover amount
            //                                     cleanRecord.amount = cleanRecord.amount + summary.amount;
            //                                     cleanRecord.validAmount = cleanRecord.validAmount + summary.validAmount;
            //                                     return cleanRecord.save().then(
            //                                         () => dbconfig.collection_playerConsumptionSummary.remove({_id: summary._id})
            //                                     );
            //                                 }
            //                                 else {
            //                                     //clean record
            //                                     return dbconfig.collection_playerConsumptionSummary.remove({_id: summary._id}).then(
            //                                         () => {
            //                                             summary.bDirty = false;
            //                                             var newCleanRecord = new dbconfig.collection_playerConsumptionSummary(summary);
            //                                             return newCleanRecord.save();
            //                                         }
            //                                     );
            //                                 }
            //                             }
            //                         );
            //                     }
            //                 );
            //                 return Q.all(summaryProms);
            //             }
            //         }
            //     ).then(
            //         () => deferred.resolve("Proposal is rejected")
            //     );
            // }
            // else {
            //     deferred.resolve("Proposal is rejected");
            // }
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

            deferred.resolve("Proposal is rejected");
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
            deferred.resolve("Proposal is rejected");
        },

        /**
         * reject function for player top up return
         */
        rejectPlayerTopUpReturn: function (proposalData, deferred) {
            //clean top up records that are used for application
            proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, "rejectPlayerTopUpReturn").then(
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
            if (proposalData && proposalData.data && proposalData.data.amount && proposalData.data.bonusCredit) {
                //todo::add more reasons here, ex:cancel request
                return proposalExecutor.refundPlayer(proposalData, proposalData.data.amount * proposalData.data.bonusCredit, "rejectPlayerBonus")
                    .then(
                        res => deferred.resolve("Proposal is rejected"),
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
            proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, "rejectPlayerTopUpReward").then(
                () => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject)
            );
        },

        /**
         * reject function for player referral reward
         */
        rejectPlayerReferralReward: function (proposalData, deferred) {
            if (proposalData && proposalData.data && proposalData.data.referralId) {
                dbUtil.findOneAndUpdateForShard(
                    dbconfig.collection_players,
                    {playerId: proposalData.data.referralId},
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

        rejectPartnerChildrenCommission: function (proposalData, deferred) {
            deferred.resolve("Proposal is rejected");
        },

        rejectPlayerDoubleTopUpReward: function (proposalData, deferred) {
            //clean top up records that are used for application
            proposalExecutor.refundPlayerApplyAmountIfNeeded(proposalData, "rejectPlayerDoubleTopUpReward").then(
                () => proposalExecutor.cleanUsedTopUpRecords(proposalData).then(deferred.resolve, deferred.reject)
            );
        },
    }
};

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
    var rewardTask;

    Q.resolve().then(
        () => dbRewardTask.createRewardTask(taskData).then(
            data => rewardTask = data
        ).catch(
            error => Q.reject({name: "DBError", message: "Error creating reward task for " + rewardType, error: error})
        )
    ).then(
        //() => createRewardLogForProposal(taskData.rewardType, proposalData)
        () => {
            SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, constPlayerSMSSetting.APPLY_REWARD);
            //send message if there is any template created for this reward
            return messageDispatcher.dispatchMessagesForPlayerProposal(proposalData, rewardType, {
                rewardTask: taskData
            });
        }
    ).then(
        function () {
            deferred.resolve(resolveValue || rewardTask);
        },
        function (error) {
            deferred.reject(error);
        }
    );
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
                amount: proposalData.data.rewardAmount || proposalData.data.amount || 0,
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

var proto = proposalExecutorFunc.prototype;
proto = Object.assign(proto, proposalExecutor);

// This make WebStorm navigation work
module.exports = proposalExecutor;