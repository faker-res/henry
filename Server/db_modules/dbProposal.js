'use strict';

var proposalFunc = function () {
};
module.exports = new proposalFunc();

var dbconfig = require('./../modules/dbproperties');

var encrypt = require('./../modules/encrypt');
var Q = require("q");
var constProposalType = require('./../const/constProposalType');
var constProposalStepStatus = require('./../const/constProposalStepStatus');
var constProposalStatus = require('./../const/constProposalStatus');
var constProposalMainType = require('./../const/constProposalMainType');
var constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus.js");
var constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface.js");
var dbProposalProcess = require('./../db_modules/dbProposalProcess');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPartner = require('./../db_modules/dbPartner');
var dbRewardPointsLog = require('./../db_modules/dbRewardPointsLog');
var dbLogger = require('./../modules/dbLogger');
var proposalExecutor = require('./../modules/proposalExecutor');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbutility = require('./../modules/dbutility');
var dbProposalUtility = require('./../db_common/dbProposalUtility');
var pmsAPI = require('../externalAPI/pmsAPI');
var moment = require('moment-timezone');
var errorUtils = require("../modules/errorUtils.js");
var constRewardType = require('./../const/constRewardType');
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constSystemParam = require("../const/constSystemParam.js");
const constServerCode = require("../const/constServerCode.js");
const constPlayerTopUpType = require("../const/constPlayerTopUpType");
const constMaxDateTime = require("../const/constMaxDateTime");
const constPlayerCreditTransferStatus = require("../const/constPlayerCreditTransferStatus");
const constFinancialPointsType = require("../const/constFinancialPointsType");
const constProposalEntryType = require("./../const/constProposalEntryType");
const constProposalUserType = require('./../const/constProposalUserType');
const localization = require("../modules/localization");
const dbPlayerUtil = require("../db_common/dbPlayerUtility");
let rsaCrypto = require("../modules/rsaCrypto");

var proposal = {

    /**
     * Create a new proposal
     * @param {json} proposalData - The data of the proposal. Refer to proposal schema.
     */
    createProposal: function (proposalData) {
        var proposal = new dbconfig.collection_proposal(proposalData);
        return proposal.save();
    },

    /**
     * Create a new proposal with type name
     * @param {string} platformObjId -
     * @param {string} typeName - Type name
     * @param {Object} proposalData - The data of the proposal
     */
    createProposalWithTypeName: function (platformId, typeName, proposalData) {
        let deferred = Q.defer();
        let plyProm = null;
        // create proposal for partner
        if (proposalData.isPartner || (proposalData.data && proposalData.data.isPartner)) {
            let partnerId = proposalData.data.partnerObjId ? proposalData.data.partnerObjId : proposalData.data._id;
            // query related partner info
            plyProm = dbconfig.collection_partner.findOne({_id: partnerId})
                .populate({path: 'level', model: dbconfig.collection_partnerLevel});
        }
        else {
            let playerId = proposalData.data.playerObjId ? proposalData.data.playerObjId : proposalData.data._id;
            proposalData.data.playerName = proposalData.data.name ? proposalData.data.name : "";
            // query related player info
            plyProm = dbconfig.collection_players.findOne({_id: playerId})
                .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel});
        }

        //get proposal type id
        let ptProm = dbconfig.collection_proposalType.findOne({platformId: platformId, name: typeName}).exec();
        //create process for proposal
        let ptpProm = dbProposalProcess.createProposalProcessWithType(platformId, typeName);

        proposal.createProposalDataHandler(ptProm, ptpProm, plyProm, proposalData, deferred);

        return deferred.promise;
    },

    checkUpdateCreditProposal: function (platformId, typeName, proposalData) {
        //get proposal type id
        let ptProm = dbconfig.collection_proposalType.findOne({platformId: platformId, name: typeName}).exec();

        return ptProm.then(
            (proposalType) => {
                //check if player or partner has pending proposal for this type
                let queryObj;

                if (proposalData.isPartner) {
                    queryObj = {
                        type: proposalType._id,
                        status: constProposalStatus.PENDING,
                        "data.partnerObjId": proposalData.data.partnerObjId
                    }
                }
                else {
                    queryObj = {
                        type: proposalType._id,
                        status: constProposalStatus.PENDING,
                        "data.playerObjId": proposalData.data.playerObjId
                    }
                }

                return dbconfig.collection_proposal.findOne(queryObj).lean().then(
                    pendingProposal => {
                        //for online top up and player consumption return, there can be multiple pending proposals
                        if (pendingProposal) {
                            return Q.reject({
                                name: "DBError",
                                message: "Player or partner already has a pending proposal for this type"
                            });
                        }
                    }
                )
            }
        ).then(
            () => {
                if (proposalData && proposalData.data && proposalData.data.updateAmount < 0 && proposalData.isPartner) {
                    return dbPartner.tryToDeductCreditFromPartner(proposalData.data.partnerObjId, platformId, -proposalData.data.updateAmount, "editPartnerCredit:Deduction", proposalData.data);
                }
                else if (proposalData && proposalData.data && proposalData.data.updateAmount < 0) {
                    return dbPlayerInfo.tryToDeductCreditFromPlayer(proposalData.data.playerObjId, platformId, -proposalData.data.updateAmount, /*"editPlayerCredit:Deduction"*/ "UpdatePlayerCredit", proposalData.data);
                }
                return true;
            }
        ).then(
            () => {
                return proposal.createProposalWithTypeNameWithProcessInfo(platformId, typeName, proposalData)
            }
        ).then(
            proposalData => {
                if (proposalData && proposalData.data && proposalData.data.updateAmount < 0 && !proposalData.isPartner) {
                    dbconfig.collection_creditChangeLog.findOne({
                        playerId: proposalData.data.playerObjId,
                        operationType: /*"editPlayerCredit:Deduction"*/"UpdatePlayerCredit",
                        operationTime: {$gte: new Date(new Date().setSeconds(new Date().getSeconds()-15))}
                    }).lean().then(
                        creditChangeLog => {
                            if(!creditChangeLog) {
                                return Promise.resolve();
                            }

                            return dbconfig.collection_creditChangeLog.findOneAndUpdate({
                                _id: creditChangeLog._id,
                                operationTime: creditChangeLog.operationTime
                            }, {
                                "data.proposalId": proposalData.proposalId
                            }).lean();
                        }
                    ).catch(errorUtils.reportError);
                }

                return proposalData;
            }
        );
    },

    applyRepairCreditTransfer: function (platformId, proposalData) {
        if (proposalData.data && (!proposalData.data.transferId || (proposalData.data.transferId && proposalData.data.transferId == "unknown"))) {
            return Promise.reject({
                name: "DBError",
                message: "This transaction does not have valid transfer ID"
            });
        }

        function isRepairableTransfer(transferId) {
            return dbconfig.collection_playerCreditTransferLog.find({
                transferId,
                isRepaired: {$ne: true},
                status: {$ne: constPlayerCreditTransferStatus.SUCCESS}
            }, {_id: 1}).limit(1).read("secondaryPreferred").lean().then(
                log => {
                    return Boolean(log && log[0]);
                }
            );
        }

        return isRepairableTransfer(proposalData.data.transferId).then(
            isRepairable => {
                if (!isRepairable) {
                    return Promise.reject({
                        name: "DBError",
                        message: "This transfer is not repairable."
                    });
                }

                return proposal.createProposalWithTypeNameWithProcessInfo(platformId, constProposalType.FIX_PLAYER_CREDIT_TRANSFER, proposalData);
            }
        );
    },

    createProposalWithTypeNameWithProcessInfo: function (platformId, typeName, proposalData, smsLogInfo) {
        function getStepInfo(result) {
            return dbconfig.collection_proposalProcess.findOne({_id: result.process})
                .then(processData => {
                    if (processData) {
                        return dbconfig.collection_proposalProcessStep.findOne({_id: processData.currentStep})
                            .populate({path: 'type', model: dbconfig.collection_proposalType})
                            .populate({path: 'department', model: dbconfig.collection_department})
                            .populate({path: 'role', model: dbconfig.collection_role});
                    } else {
                        return null;
                    }
                }).then(
                    stepData => {
                        result.stepInfo = stepData;
                        return result;
                    }
                )
        }

        return proposal.createProposalWithTypeName(platformId, typeName, proposalData).then(
            data => {
                if (smsLogInfo && data && data.proposalId)
                    dbLogger.updateSmsLogProposalId(smsLogInfo.tel, smsLogInfo.message, data.proposalId);

                if (data && data.process) {
                    return getStepInfo(Object.assign({}, data));
                } else {
                    return data;
                }
            },
            error => {
                return Q.reject(error);
            }
        );
    },

    createRewardProposal: function (eventData, playerData, selectedRewardParam, rewardGroupRecord, consecutiveNumber, applyAmount, rewardAmount, spendingAmount, retentionRecordObjId, userAgent, adminInfo){
        // get the rewardType
        return dbconfig.collection_rewardType.findOne({_id: eventData.type}).lean().then(
            rewardType => {
                if (!rewardType){
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "rewardType is not found"
                    })
                }

                // create reward proposal
                let proposalData = {
                    type: eventData.executeProposal,
                    creator: adminInfo ? adminInfo :
                        {
                            type: 'player',
                            name: playerData.name,
                            id: playerData._id
                        },
                    data: {
                        playerObjId: playerData._id,
                        playerId: playerData.playerId,
                        playerName: playerData.name,
                        realName: playerData.realName,
                        platformObjId: playerData.platform._id,
                        rewardAmount: rewardAmount,
                        spendingAmount: spendingAmount,
                        eventId: eventData._id,
                        eventName: eventData.name,
                        eventCode: eventData.code,
                        eventDescription: eventData.description,
                        isIgnoreAudit: eventData.condition && (typeof(eventData.condition.isIgnoreAudit) === "boolean" && eventData.condition.isIgnoreAudit === true) || (Number.isInteger(eventData.condition.isIgnoreAudit) && eventData.condition.isIgnoreAudit >= rewardAmount),
                        forbidWithdrawAfterApply: Boolean(selectedRewardParam.forbidWithdrawAfterApply && selectedRewardParam.forbidWithdrawAfterApply === true),
                        remark: selectedRewardParam.remark,
                        useConsumption: Boolean(!eventData.condition.isSharedWithXIMA),
                        providerGroup: eventData.condition.providerGroup,
                        // Use this flag for auto apply reward
                        isGroupReward: true,
                        // If player credit is more than this number after unlock reward group, will ban bonus
                        forbidWithdrawIfBalanceAfterUnlock: selectedRewardParam.forbidWithdrawIfBalanceAfterUnlock ? selectedRewardParam.forbidWithdrawIfBalanceAfterUnlock : 0,
                        isDynamicRewardAmount: Boolean(eventData.condition.isDynamicRewardAmount)
                    },
                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                    userType: constProposalUserType.PLAYERS
                };
                proposalData.inputDevice = dbutility.getInputDevice(userAgent, false, adminInfo);

                // Custom proposal data field
                // if (applyAmount > 0) {
                //     proposalData.data.applyAmount = applyAmount;
                // }

                if (consecutiveNumber) {
                    proposalData.data.consecutiveNumber = consecutiveNumber;
                }

                if (rewardGroupRecord && rewardGroupRecord.topUpRecordObjId && rewardGroupRecord.topUpRecordObjId.proposalId &&
                    eventData.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                    proposalData.data.topUpProposalId = rewardGroupRecord.topUpRecordObjId.proposalId;
                    // proposalData.data.actualAmount = rewardGroupRecord.topUpRecordObjId.amount;
                }

                proposalData.data.applyTargetDate = new Date(dbutility.getTodaySGTime().startTime);

                // if (useTopUpAmount !== null) {
                //     proposalData.data.useTopUpAmount = useTopUpAmount;
                // }

                // if (useConsumptionAmount !== null) {
                //     proposalData.data.useConsumptionAmount = useConsumptionAmount;
                // }

                if (rewardGroupRecord && rewardGroupRecord.topUpRecordObjId && rewardGroupRecord.topUpRecordObjId._id) {
                    proposalData.data.topUpRecordId = rewardGroupRecord.topUpRecordObjId._id;
                }

                if (rewardType.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP) {
                    proposalData.data.lastLoginIp = playerData.lastLoginIp;
                    proposalData.data.phoneNumber = playerData.phoneNumber;
                    if (playerData.deviceId){
                        proposalData.data.deviceId = playerData.deviceId;
                    }
                }

                if (rewardType.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP && eventData.condition
                    && eventData.condition.definePlayerLoginMode && typeof(eventData.condition.definePlayerLoginMode) != 'undefined'){
                    proposalData.data.definePlayerLoginMode = eventData.condition.definePlayerLoginMode;
                }

                return proposal.createProposalWithTypeId(eventData.executeProposal, proposalData)
            }
        ).then(
            () => {
                // update playerRetentionRewardRecord
                let updateQuery = {lastReceivedDate: dbutility.getTodaySGTime().startTime};
                if (eventData && eventData.condition && eventData.condition.definePlayerLoginMode){
                    if (eventData.condition.definePlayerLoginMode == 1){
                        // accumulative
                        updateQuery.$inc = {accumulativeDay: 1};
                    }
                }

                return dbconfig.collection_playerRetentionRewardGroupRecord.findOneAndUpdate({_id: retentionRecordObjId}, updateQuery)
            }
        )
    },

    /**
     * Create a new proposal with type ids
     * @param {ObjectId} typeId - Type id
     * @param {Object} proposalData - The data of the proposal
     */
    createProposalWithTypeId: function (typeId, proposalData) {
        let deferred = Q.defer();
        let playerId = proposalData.data.playerObjId ? proposalData.data.playerObjId : proposalData.data._id;
        let plyProm;

        //get proposal type id
        let ptProm = dbconfig.collection_proposalType.findOne({_id: typeId}).exec();
        let ptpProm = dbProposalProcess.createProposalProcessWithTypeId(typeId);
        if (proposalData.isPartner) {
            plyProm = dbconfig.collection_partner.findOne({_id: partnerId})
                .populate({path: 'level', model: dbconfig.collection_partnerLevel});
        }
        else {
            plyProm = dbconfig.collection_players.findOne({_id: playerId})
                .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel});
        }

        proposal.createProposalDataHandler(ptProm, ptpProm, plyProm, proposalData, deferred);
        return deferred.promise;
    },

    /**
     * Get one proposal by _id
     * @param ptProm - Propm
     * @param {json} ptpProm - Promise create proposal process
     * @param {json} plyProm - Promise player info
     * @param {Object} proposalData - Proposal Data
     * @param {json} deferred - Promise from parent
     */
    createProposalDataHandler: function (ptProm, ptpProm, plyProm, proposalData, deferred) {
        let bExecute = false;
        let proposalTypeData = null;
        let pendingProposalData = null;

        Q.all([ptProm, ptpProm, plyProm]).then(
            //create proposal with process
            function (data) {
                if (data && data[0] && data[1]) {
                    proposalTypeData = data[0];
                    proposalData.type = data[0]._id;
                    proposalData.data.platformId = data[0].platformId;
                    proposalData.mainType = constProposalMainType[data[0].name];

                    // Proposal process step check
                    if (data[1] === constSystemParam.PROPOSAL_NO_STEP || proposalData.data.isIgnoreAudit) {
                        bExecute = true;
                        proposalData.noSteps = true;
                        proposalData.status = proposalData.status || constProposalStatus.APPROVED;
                    } else if (data[1]._id) {
                        proposalData.process = data[1]._id;
                        proposalData.status = constProposalStatus.PENDING;
                    }

                    // Set top up type proposal to pre-pending
                    if (
                        data[0].name == constProposalType.PLAYER_TOP_UP
                        || data[0].name == constProposalType.PLAYER_MANUAL_TOP_UP
                        || data[0].name == constProposalType.PLAYER_ALIPAY_TOP_UP
                        || data[0].name == constProposalType.PLAYER_WECHAT_TOP_UP
                        || data[0].name == constProposalType.PLAYER_QUICKPAY_TOP_UP
                        || data[0].name == constProposalType.PLAYER_ASSIGN_TOP_UP
                    ) {
                        bExecute = false;
                        proposalData.status = constProposalStatus.PREPENDING;
                    }

                    // For third party payment system, we just set the proposal to pending without any process
                    if (
                        data[0].name === constProposalType.PLAYER_FKP_TOP_UP
                        || data[0].name === constProposalType.PLAYER_COMMON_TOP_UP
                    ) {
                        bExecute = false;
                        proposalData.status = constProposalStatus.PENDING;
                    }

                    //check if player or partner has pending proposal for this type
                    let queryObj = {
                        type: proposalData.type,
                        "data.platformId": data[0].platformId,
                        status: {$in: [constProposalStatus.CSPENDING, constProposalStatus.PENDING, constProposalStatus.PROCESSING, constProposalStatus.AUTOAUDIT]}
                    };
                    let queryParam = ["playerObjId", "playerId", "_id", "partnerName", "partnerId"];
                    queryParam.forEach(
                        param => {
                            if (proposalData.data && proposalData.data[param]) {
                                queryObj[("data." + param)] = proposalData.data[param];
                            }
                        }
                    );

                    // Player modify payment info
                    if (data[0].name == constProposalType.UPDATE_PLAYER_BANK_INFO && proposalData.data.isPlayerInit) {
                        proposalData.status = constProposalStatus.SUCCESS;
                    }

                    // Player modify phone number
                    let phoneUpdateProposalType = [constProposalType.UPDATE_PLAYER_PHONE, constProposalType.UPDATE_PARTNER_PHONE];
                    if (phoneUpdateProposalType.includes(data[0].name) && proposalData.data.isPlayerInit) {
                        proposalData.status = constProposalStatus.SUCCESS;
                        // auto approve, set the noSteps to true
                        proposalData.noSteps = true;
                    }

                    // attach player info if available
                    if (data[2]) {
                        if (proposalData.isPartner) {
                            proposalData.data.partnerName = data[2].partnerName;
                            if(data[2].level){
                                proposalData.data.proposalPartnerLevel = data[2].level.name;
                                proposalData.data.proposalPartnerLevelValue = data[2].level.value;
                            }
                        }
                        else {
                            proposalData.data.playerName = data[2].name;
                            if( data[2].playerLevel ){
                                proposalData.data.proposalPlayerLevelValue = data[2].playerLevel.value;
                                proposalData.data.playerLevelName = data[2].playerLevel.name;
                                proposalData.data.proposalPlayerLevel = data[2].playerLevel.name;
                            }
                        }
                    }

                    // SCHEDULED AUTO APPROVAL
                    if (proposalTypeData.name == constProposalType.PLAYER_BONUS && proposalData.data.isAutoApproval) {
                        proposalData.status = constProposalStatus.AUTOAUDIT;
                    }

                    if (proposalTypeData.name == constProposalType.PARTNER_BONUS && proposalData.data.isAutoApproval) {
                        proposalData.status = constProposalStatus.AUTOAUDIT;
                    }

                    if (proposalTypeData.name == constProposalType.PLAYER_BONUS && proposalData.data.needCsApproved) {
                        bExecute = false;
                        proposalData.status = constProposalStatus.CSPENDING;
                    }

                    if (proposalTypeData.name == constProposalType.PARTNER_BONUS && proposalData.data.needCsApproved) {
                        bExecute = false;
                        proposalData.status = constProposalStatus.CSPENDING;
                    }

                    if(proposalData.data && data[2]){
                        proposalData.data.realNameBeforeEdit = data[2].realName;
                        proposalData.data.realNameAfterEdit = proposalData.data.realName;

                        if(proposalTypeData.name == constProposalType.UPDATE_PLAYER_REAL_NAME){
                            proposalData.data.playerId = data[2].playerId;
                        }else if(proposalTypeData.name == constProposalType.UPDATE_PARTNER_REAL_NAME){
                            proposalData.data.partnerId = data[2].partnerId;
                        }
                    }

                    return dbconfig.collection_proposal.findOne(queryObj).lean().then(
                        pendingProposal => {
                            pendingProposalData = pendingProposal;

                            // for player update bank info, check if first time bound to the bank info
                            if (proposalData && proposalData.data && proposalData.mainType && proposalData.mainType == "UpdatePlayer"
                                && proposalTypeData._id && proposalTypeData.name == constProposalType.UPDATE_PLAYER_BANK_INFO
                                && proposalData.data.platformId && proposalData.data.playerName && proposalData.data.playerId) {

                                return dbconfig.collection_proposal.findOne({
                                    type: proposalTypeData._id,
                                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                    'data.platformId': proposalData.data.platformId,
                                    'data.playerId': proposalData.data.playerId,
                                    'data.playerName': proposalData.data.playerName
                                }).lean().then(bankInfoProposal => {
                                    if (!bankInfoProposal) {
                                        return {isFirstBankInfo: true};
                                    }
                                });

                            } else if (proposalData && proposalData.data && proposalData.mainType && proposalData.mainType == "UpdatePartner"
                                && proposalTypeData._id && proposalTypeData.name == constProposalType.UPDATE_PARTNER_BANK_INFO
                                && proposalData.data.platformId && proposalData.data.partnerName && proposalData.data.partnerId) {

                                return dbconfig.collection_proposal.findOne({
                                    type: proposalTypeData._id,
                                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                    'data.platformId': proposalData.data.platformId,
                                    'data.partnerId': proposalData.data.partnerId,
                                    'data.partnerName': proposalData.data.partnerName
                                }).lean().then(bankInfoProposal => {
                                    if (!bankInfoProposal) {
                                        return {isFirstBankInfo: true};
                                    }
                                });

                            }
                        }).then(bankInfoProposal => {
                            // add remark if first time bound to the bank info
                            if (bankInfoProposal && bankInfoProposal.hasOwnProperty('isFirstBankInfo') && bankInfoProposal.isFirstBankInfo) {
                                proposalData.data.remark = localization.localization.translate("First time bound to the bank info");
                            }

                            //for online top up and player consumption return, there can be multiple pending proposals
                            if (pendingProposalData
                                && data[0].name != constProposalType.PLAYER_TOP_UP
                                //&& data[0].name != constProposalType.PLAYER_CONSUMPTION_RETURN
                                && data[0].name != constProposalType.PLAYER_REGISTRATION_INTENTION
                                && data[0].name != constProposalType.PLAYER_CONSECUTIVE_REWARD_GROUP
                                && data[0].name != constProposalType.PLAYER_LEVEL_MIGRATION
                                && data[0].name != constProposalType.PLAYER_LEVEL_UP
                                && data[0].name != constProposalType.BULK_EXPORT_PLAYERS_DATA
                                && data[0].name !== constProposalType.PLAYER_COMMON_TOP_UP
                            ) {
                                deferred.reject({
                                    name: "DBError",
                                    message: "Player or partner already has a pending proposal for this type"
                                });
                            }
                            else {
                                if (proposalTypeData.name == constProposalType.PLAYER_BONUS || proposalTypeData.name == constProposalType.PARTNER_BONUS) {
                                    return dbconfig.collection_platform.findOne({_id: data[0].platformId}, {financialPoints: 1, financialSettlement: 1}).lean().then(
                                        platformData => {
                                            if (!platformData) {
                                                deferred.reject({name: "DataError", message: "Cannot find platform"});
                                            }

                                            if (platformData.financialSettlement && !platformData.financialSettlement.financialSettlementToggle && platformData.financialSettlement.financialPointsDisableWithdrawal
                                                && platformData.financialSettlement.hasOwnProperty("minFinancialPointsDisableWithdrawal") && proposalData.data.hasOwnProperty("amount")) {
                                                if ((platformData.financialPoints - proposalData.data.amount) < platformData.financialSettlement.minFinancialPointsDisableWithdrawal) {
                                                    bExecute = false;
                                                    proposalData.status = constProposalStatus.PENDING;
                                                    proposalData.data.remark = proposalData.data.remark? proposalData.data.remark + ", " + localization.localization.translate("Insuficient financial points"): localization.localization.translate("Insuficient financial points");
                                                }
                                            }
                                            var proposalProm = proposal.createProposal(proposalData);
                                            var platProm = dbconfig.collection_platform.findOne({_id: data[0].platformId});
                                            return Q.all([proposalProm, platProm, data[0].expirationDuration]);
                                        }
                                    );
                                } else {
                                    var proposalProm = proposal.createProposal(proposalData);
                                    var platProm = dbconfig.collection_platform.findOne({_id: data[0].platformId});
                                    return Q.all([proposalProm, platProm, data[0].expirationDuration]);
                                }

                            }
                        }
                    );
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating proposal with type", error: error});
            }
        ).then(
            function (data) {
                if (data && data[0] && data[1] && data[2] != null) {
                    if((data[0].mainType === constProposalMainType.PlayerAddRewardPoints
                            || data[0].mainType === constProposalMainType.PlayerConvertRewardPoints
                            || data[0].mainType === constProposalMainType.PlayerAutoConvertRewardPoints)
                        && (proposalTypeData.name === constProposalType.PLAYER_ADD_REWARD_POINTS
                            || proposalTypeData.name === constProposalType.PLAYER_CONVERT_REWARD_POINTS
                            || proposalTypeData.name === constProposalType.PLAYER_AUTO_CONVERT_REWARD_POINTS)){
                        dbRewardPointsLog.createRewardPointsLogByProposalData(data[0]);
                    }

                    //notify the corresponding clients with new proposal
                    var wsMessageClient = serverInstance.getWebSocketMessageClient();
                    let expiredDate = null;

                    if (wsMessageClient) {
                        wsMessageClient.sendMessage(constMessageClientTypes.MANAGEMENT, "management", "notifyNewProposal", data);
                    }

                    if (proposalData.expirationTime) {
                        expiredDate = new Date(proposalData.expirationTime);
                    }
                    else if (data[2] == 0) {
                        expiredDate = constMaxDateTime;
                    }
                    else {
                        expiredDate = moment(data[0].createTime).add('minutes', data[2]).format('YYYY-MM-DD HH:mm:ss.sss');
                    }


                    // We need the type to be populated, because messageDispatcher wants to read proposalData.type.name
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: data[0]._id, createTime: data[0].createTime},
                        {
                            //proposalId: (data[1].prefix + data[0].proposalId),
                            expirationTime: expiredDate
                        },
                        {new: true}
                    ).populate({path: 'type', model: dbconfig.collection_proposalType}).lean();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Can't create proposal or find platform"
                    });
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating proposal", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    if (bExecute) {
                        proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                            .then(
                                () => deferred.resolve(data),
                                err => deferred.reject(err)
                            );
                    }
                    else {
                        deferred.resolve(data);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create proposal"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error updating proposal", error: error});
            }
        );
    },

    /**
     * Get one proposal by _id
     * @param {json} query - The query string
     */
    getProposal: function (query) {
        return dbconfig.collection_proposal.findOne(query).exec();
    },

    getPlatformProposal: function (platform, proposalId) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId})
            .populate({path: "type", model: dbconfig.collection_proposalType})
            .populate({path: "process", model: dbconfig.collection_proposalProcess})
            .populate({path: "data.allowedProviders", model: dbconfig.collection_gameProvider})
            .then(
                proposalData => {
                    let allProm = [];
                    if (proposalData && proposalData.process && proposalData.process.steps) {
                        for (let x = 0; x < proposalData.process.steps.length; x++) {
                            let proposalProcessStepObjId = proposalData.process.steps[x];
                            allProm.push(
                                dbconfig.collection_proposalProcessStep.findOne({_id: proposalProcessStepObjId})
                                    .populate({path: "department", model: dbconfig.collection_department})
                                    .populate({path: "operator", model: dbconfig.collection_admin})
                            );
                        }
                        return Q.all(allProm).then(
                            function (processSteps) {
                                proposalData.process.steps = [];
                                for (let x in processSteps) {
                                    proposalData.process.steps.push(processSteps[x]);
                                }
                                return proposalData;
                            }
                        )
                    } else {
                        return proposalData;
                    }
                }
            ).then(proposalData => {
                if (proposalData && proposalData.type && proposalData.type.name && proposalData.type.name == constProposalType.UPDATE_PLAYER_PHONE && proposalData.data.playerObjId) {
                    return dbconfig.collection_players.findOne({_id: ObjectId(proposalData.data.playerObjId)}, {playerId: 1}).lean().then(player => {
                        if (player && player.playerId) {
                            proposalData.data.playerId = player.playerId;
                        }
                        return proposalData;
                    })
                } else {
                    return proposalData;
                }
            })
            .then(
                proposalData => {
                    if (proposalData && proposalData.type && proposalData.type.name && proposalData.type.name == constProposalType.UPDATE_PLAYER_PHONE
                        && proposalData.data && proposalData.data.updateData && Object.keys(proposalData.data.updateData)[0]
                        && Object.keys(proposalData.data.updateData)[0] == 'phoneNumber' && proposalData.status && proposalData.status != constProposalStatus.PENDING) {
                        proposalData.data.updateData.phoneNumber = dbutility.encodePhoneNum(proposalData.data.updateData.phoneNumber);
                    }

                    if (proposalData && proposalData.data && proposalData.data.phone) {
                        proposalData.data.phone = dbutility.encodePhoneNum(proposalData.data.phone);
                    }
                    if (proposalData && proposalData.data && proposalData.data.phoneNumber) {
                        proposalData.data.phoneNumber = dbutility.encodePhoneNum(proposalData.data.phoneNumber);
                    }

                    if (proposalData.type && proposalData.type.name && proposalData.type.name == constProposalType.PLAYER_MANUAL_TOP_UP && proposalData && proposalData.data && proposalData.data.bankCardNo) {
                        proposalData.data.bankCardNo = dbutility.encodeBankAcc(proposalData.data.bankCardNo);
                    }

                    if (proposalData && proposalData.type && platform.indexOf(proposalData.type.platformId.toString()) > -1) {
                        return proposalData;
                    } else {
                        return null;
                    }
                }
            )
    },

    getProposalByPlayerIdAndType: function (query) {
        return dbconfig.collection_proposal.find({type: ObjectId(query.type), "data._id": {$in: [query.playerObjId, ObjectId(query.playerObjId)]}}).exec();
    },

    getProposalByPartnerIdAndType: function (query) {
        return dbconfig.collection_proposal.find({type: ObjectId(query.type), "data._id": {$in: [query.partnerObjId, ObjectId(query.partnerObjId)]}}).exec();
    },

    /**
     * Get multiple proposal by ids
     * @param {json} ids - Array of proposal ids
     */
    getProposals: function (ids) {
        return dbconfig.collection_proposal.find({_id: {$in: ids}}).exec();
    },

    /**
     * Update proposal data by _id
     * @param {json} query - The query string
     * @param {json} updateData - The update data
     */
    updateProposal: function (query, updateData) {
        return dbconfig.collection_proposal.findOneAndUpdate(query, updateData, {new: true}).exec();
    },
    updateProposalRemarks: function (query, updateData) {
        return proposal.getProposal(query).then(
            proposalData => {
                if (proposalData && proposalData.proposalId && proposalData.createTime) {
                    let updateQuery = {
                        _id: proposalData._id,
                        createTime: proposalData.createTime
                    }
                    return proposal.updateProposal(updateQuery,updateData);
                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_PROPOSAL,
                        name: "DataError",
                        message: "Cannot find proposal",
                    });
                }
        });
    },
    updatePlayerIntentionRemarks: function (id, remarks) {
        let updateData = {};
        updateData['data.remarks'] = remarks;
        return dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate({_id: ObjectId(id)}, updateData, {new: true}).exec();
    },
    updateTopupProposal: function (proposalId, status, requestId, orderStatus, remark, callbackData) {
        let proposalObj = null;
        let type = constPlayerTopUpType.ONLINE;

        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                proposalObj = proposalData;

                // Check passed in amount vs proposal amount
                if (callbackData && callbackData.amount && proposalData.data.amount && Number(callbackData.amount) !== Number(proposalData.data.amount)) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Invalid top up amount"
                    });
                }

                if (proposalData && proposalData.data && (proposalData.data.bankCardType != null || proposalData.data.bankTypeId != null || proposalData.data.bankCardNo != null)) {
                    type = constPlayerTopUpType.MANUAL;
                }
                if (proposalData && proposalData.data && (proposalData.data.alipayAccount != null || proposalData.data.alipayQRCode != null)) {
                    type = constPlayerTopUpType.ALIPAY;
                }
                if (proposalData && proposalData.data && (proposalData.data.weChatAccount != null || proposalData.data.weChatQRCode != null)) {
                    type = constPlayerTopUpType.WECHAT;
                }
                if (proposalData
                    && proposalData.data
                    && (proposalData.status == constProposalStatus.PREPENDING || (
                            (
                                proposalData.status == constProposalStatus.PENDING
                                || proposalData.status == constProposalStatus.PROCESSING
                                || proposalData.status == constProposalStatus.EXPIRED
                                || proposalData.status == constProposalStatus.RECOVER
                                || proposalData.status == constProposalStatus.CANCEL
                            )
                            && proposalData.data
                        && (proposalData.data.requestId == requestId || !proposalData.data.requestId)))) {
                    return proposalData;
                }
                else {
                    var errorMessage = "Invalid proposal";
                    if (!proposalData) {
                        errorMessage = "Cannot find proposal";
                    }
                    else if (proposalData.status != constProposalStatus.PENDING) {
                        errorMessage = "Invalid proposal status:" + proposalData.status;
                    }
                    else if (proposalData.data && proposalData.data.requestId != requestId) {
                        errorMessage = "Invalid requestId";
                    }
                    return Q.reject({
                        status: proposalData && proposalData.status == constProposalStatus.SUCCESS ?  constServerCode.INVALID_PROPOSAL : constServerCode.INVALID_PARAM,
                        name: "DataError",
                        message: errorMessage,
                        data: {
                            proposalId: proposalId,
                            orderStatus: status == constProposalStatus.SUCCESS ? 1 : 2,
                            depositId: requestId,
                            type: type
                        }
                    });
                }
            }
        ).then(
            data => {
                if (status == constProposalStatus.SUCCESS) {
                    // Debug credit missing after top up issue
                    console.log('updatePlayerTopupProposal', proposalId);
                    return dbPlayerInfo.updatePlayerTopupProposal(proposalId, true, remark, callbackData);
                } else if (status == constProposalStatus.FAIL) {
                    return dbPlayerInfo.updatePlayerTopupProposal(proposalId, false, remark, callbackData);
                }
                else {
                    //update proposal for experiation
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposalObj._id, createTime: proposalObj.createTime},
                        {status: status}
                    );
                }
            }
        ).then(
            data => {
                return {
                    proposalId: proposalId,
                    orderStatus: orderStatus,
                    depositId: requestId,
                    type: type
                };
            },
            error => {
                if (!error.data) {
                    return Q.reject({
                        status: constServerCode.COMMON_ERROR,
                        name: "DataError",
                        message: error.message || error,
                        data: {
                            proposalId: proposalId,
                            orderStatus: orderStatus,
                            depositId: requestId,
                            type: type
                        }
                    });
                }
                else {
                    return Q.reject(error);
                }
            }
        );
    },

    updateBonusProposal: function (proposalId, status, bonusId, remark) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData && (proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.CSPENDING
                    || proposalData.status == constProposalStatus.PENDING || proposalData.status == constProposalStatus.AUTOAUDIT
                        || proposalData.status == constProposalStatus.PROCESSING || proposalData.status == constProposalStatus.UNDETERMINED || proposalData.status == constProposalStatus.RECOVER) && proposalData.data && proposalData.data.bonusId == bonusId) {
                    return proposalData;
                }
                else {
                    var errorMessage = "Invalid proposal";
                    if (!proposalData) {
                        errorMessage = "Cannot find proposal";
                    }
                    else if (proposalData.status != constProposalStatus.APPROVED || proposalData.status == constProposalStatus.FAIL || proposalData.status == constProposalStatus.CANCEL) {
                        errorMessage = "Invalid proposal status:" + proposalData.status;
                    }
                    else if (proposalData.data && proposalData.data.bonusId != bonusId) {
                        errorMessage = "Invalid bonusId";
                    }
                    return Q.reject({
                        status: constServerCode.INVALID_PROPOSAL,
                        name: "DataError",
                        message: errorMessage,
                        proposalId: proposalId
                    });
                }
            }
        ).then(
            data => {
                if (status == constProposalStatus.SUCCESS) {
                    return dbPlayerInfo.updatePlayerBonusProposal(proposalId, true);
                } else if (status == constProposalStatus.FAIL || status == constProposalStatus.CANCEL) {
                    return dbPlayerInfo.updatePlayerBonusProposal(proposalId, false, remark, Boolean(status == constProposalStatus.CANCEL));
                } else if (status == constProposalStatus.PENDING
                    || status == constProposalStatus.PROCESSING
                    || status == constProposalStatus.UNDETERMINED
                    || status == constProposalStatus.RECOVER
                ) {
                    return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
                        proposalData => {
                            return dbconfig.collection_proposal.findOneAndUpdate({
                                proposalId: proposalId,
                                createTime: proposalData.createTime
                            }, {status: status});
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Invalid status"});
                }
            }
        ).then(
            data => ({
                proposalId: proposalId,
                orderStatus: status == constProposalStatus.SUCCESS ? 1 : 2,
                bonusId: bonusId
            }),
            error => {
                if (!error.proposalId) {
                    return Q.reject({
                        status: constServerCode.INVALID_PROPOSAL,
                        name: "DataError",
                        message: error.message || error,
                        proposalId: proposalId
                    });
                }
                else {
                    return Q.reject(error);
                }
            }
        );
    },

    //todo: implement this function later
    setUpdateCreditProposalStatus: () => {

    },

    /**
     * Get one proposal by array of ids
     * @param {json} proposalIds - The array of ids
     */
    deleteProposalByIds: function (proposalIds) {
        return dbconfig.collection_proposal.remove({_id: {$in: proposalIds}}).exec();
    },

    /**
     * Approve or reject Proposal Process current Step
     * @param {ObjectId} proposalId - The id of the proposal
     * @param {ObjectId} adminId - The id of the admin user
     * @param {String} memo - memo of the step
     * @param {Boolean} bApprove - memo of the step
     */
    updateProposalProcessStep: function (proposalId, adminId, memo, bApprove) {
        var deferred = Q.defer();
        var nextStepId = null;
        var proposalData = null;
        let proposalObj;
        let proposalProcessData;
        let playerData;
        let bankAccount = "";
        let bankName = "";
        //find proposal
        dbconfig.collection_proposal.findOne({_id: proposalId}).populate(
            {
                path: "type",
                model: dbconfig.collection_proposalType
            }
        ).populate(
            {
                path: "process",
                model: dbconfig.collection_proposalProcess
            }
        ).populate(
            {
                path: "data.platformId",
                select: "financialPoints financialSettlement",
                model: dbconfig.collection_platform
            }
        ).populate(
            {
                path: "data.playerObjId",
                select: "bankAccount bankName",
                model: dbconfig.collection_players
            }
        ).then(
            function (data) {
                //todo::add proposal or process status check here
                // if (data && remark) {
                //     dbconfig.collection_proposal.findOneAndUpdate({_id: proposalId, createTime: data.createTime}, {
                //         $addToSet: {remark: {admin: adminId, content: remark}}
                //     }, {new: true}).exec();
                // }

                if (bApprove && data && data.mainType == "TopUp") {
                    return Promise.reject({name: "DataError", message: "This proposal require PMS to approve."});
                }

                //save bankAccount and bankName, put back objId to data.data.playerObjId to prevent error
                if(data && data.data && data.data.playerObjId && data.data.playerObjId.bankAccount){
                    // bankAccount = data.data.playerObjId.bankAccount;
                    // bankName = data.data.playerObjId.bankName;
                    data.data.bankAccountWhenApprove = data.data.playerObjId.bankAccount;
                    data.data.bankNameWhenApprove = data.data.playerObjId.bankName;
                    data.data.playerObjId = data.data.playerObjId._id;
                }

                if (bApprove && data.type && (data.type.name ==  constProposalType.PLAYER_BONUS || data.type.name == constProposalType.PARTNER_BONUS)) {
                    let platformData = data && data.data && data.data.platformId? data.data.platformId: null;
                    if (platformData && platformData.financialSettlement && !platformData.financialSettlement.financialSettlementToggle && platformData.financialSettlement.financialPointsDisableWithdrawal
                        && platformData.financialSettlement.hasOwnProperty("minFinancialPointsDisableWithdrawal") && data.data.hasOwnProperty("amount")) {
                        if ((platformData.financialPoints - data.data.amount) < platformData.financialSettlement.minFinancialPointsDisableWithdrawal) {
                            let remark = localization.localization.translate("Insuficient financial points");
                            dbconfig.collection_proposal.findOneAndUpdate(
                                {_id: data._id, createTime: data.createTime},
                                {"data.remark": remark}
                            ).catch(errorUtils.reportError);
                            deferred.reject({name: "DBError", message: "Insuficient financial points"});
                            return Promise.reject("Insuficient financial points");
                        }
                    }
                }
                if (data.status != constProposalStatus.PENDING) {
                    deferred.reject({name: "DBError", message: "Proposal is not in Pending status."});
                    return;
                }
                if (data && data.process) {
                    if (data.status == constProposalStatus.PREPENDING) {
                        deferred.reject({name: "DataError", message: "Incorrect proposal status"});
                    }
                    else {
                        //get full info of process
                        proposalData = data;
                        return dbconfig.collection_proposalProcess.findOne({_id: data.process})
                            .populate({path: "currentStep", model: dbconfig.collection_proposalProcessStep})
                            .populate({path: "type", model: dbconfig.collection_proposalTypeProcess}).exec();
                    }
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't find proposal"});
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error finding proposal", error: err});
            }
        ).then(
            //find proposal process and create finished step for process
            function (data) {
                proposalProcessData = data;
                if(proposalData.type.name !=  constProposalType.PLAYER_BONUS){
                    return Promise.resolve(true);
                }else{
                    return Promise.resolve(isBankInfoMatched(proposalData, proposalData.data.playerId));
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: err && err.message || "Error finding proposal process", error: err});
            }
        ).then(
            function(data){
                let bIsBankInfoMatched = typeof data != "undefined" ? data : true;
                if(bIsBankInfoMatched == true){
                    if (proposalProcessData && proposalProcessData.currentStep && proposalProcessData.steps) {
                        var curTime = new Date();
                        nextStepId = bApprove ? proposalProcessData.currentStep.nextStepWhenApprove : proposalProcessData.currentStep.nextStepWhenReject;
                        var stepData = {
                            status: bApprove ? constProposalStepStatus.APPROVED : constProposalStepStatus.REJECTED,
                            operator: adminId,
                            memo: memo,
                            operationTime: curTime,
                            isLocked: null
                        };

                        return dbconfig.collection_proposalProcessStep.findOneAndUpdate(
                            {_id: proposalProcessData.currentStep._id, createTime: proposalProcessData.currentStep.createTime},
                            stepData
                        ).exec();
                    }
                    else {
                        deferred.reject({name: "DBError", message: "Can't find proposal process"});
                    }
                }else{
                    deferred.reject({name: "DBError", message: "Bank Info Not Matched"});
                }

            },
            function(err){
                if (proposalProcessData && proposalProcessData.currentStep && proposalProcessData.steps) {
                    var curTime = new Date();
                    nextStepId = bApprove ? proposalProcessData.currentStep.nextStepWhenApprove : proposalProcessData.currentStep.nextStepWhenReject;
                    var stepData = {
                        status: bApprove ? constProposalStepStatus.APPROVED : constProposalStepStatus.REJECTED,
                        operator: adminId,
                        memo: memo,
                        operationTime: curTime,
                        isLocked: null
                    };

                    return dbconfig.collection_proposalProcessStep.findOneAndUpdate(
                        {_id: proposalProcessData.currentStep._id, createTime: proposalProcessData.currentStep.createTime},
                        stepData
                    ).exec();
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't find proposal process"});
                }
            }
        ).then(
            //update process info
            function (data) {
                if (data) {
                    var status = bApprove ? constProposalStatus.APPROVED : constProposalStatus.REJECTED;
                    if (nextStepId) {
                        return dbconfig.collection_proposalProcess.findOneAndUpdate(
                            {_id: proposalData.process._id, createTime: proposalData.process.createTime},
                            {
                                currentStep: nextStepId,
                                status: constProposalStatus.PENDING,
                                isLocked: null
                            }
                        );
                    }
                    else {
                        return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, bApprove, proposalData, true)
                            .then(
                                data => dbconfig.collection_proposalProcess.findOneAndUpdate(
                                        {_id: proposalData.process._id, createTime: proposalData.process.createTime},
                                        {
                                            currentStep: null,
                                            status: status,
                                            isLocked: null
                                        },
                                        {new: true}
                                    )
                            ).then(
                                () => {
                                    let updateData = {status: status, isLocked: null};
                                    return dbconfig.collection_proposal.findOneAndUpdate(
                                        {_id: proposalData._id, createTime: proposalData.createTime},
                                        updateData,
                                        {new: true}
                                    ).then(data => {
                                        proposalObj = data;

                                        let prom = Promise.resolve(true);

                                        if (proposalObj && proposalObj.mainType === constProposalType.PLAYER_BONUS && proposalObj.data && proposalObj.data.playerObjId && proposalObj.data.platformId) {
                                            prom = dbconfig.collection_players.findOne({_id: proposalObj.data.playerObjId, platform: proposalObj.data.platformId}, {permission: 1, _id: 1, platform: 1})
                                                .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                                                    playerData => {
                                                        if (playerData && playerData.permission && playerData.permission.hasOwnProperty('applyBonus')
                                                            && playerData.permission.applyBonus.toString() == 'false' && playerData.platform
                                                            && playerData.platform.playerForbidApplyBonusNeedCsApproval && proposalObj.status == constProposalStatus.APPROVED
                                                            && proposalObj.data.needCsApproved) {

                                                            return dbconfig.collection_playerPermissionLog.findOne({
                                                                player: playerData._id,
                                                                platform: proposalObj.data.platformId,
                                                                isSystem: false
                                                            }).sort({createTime: -1}).lean().then(
                                                                manualPermissionSetting => {

                                                                    let platformObjId = proposalObj.data.platformId;
                                                                    let playerObjId = proposalObj.data.playerObjId;
                                                                    let oldPermissionObj = {applyBonus: playerData.permission.applyBonus};
                                                                    let newPermissionObj = {applyBonus: true};
                                                                    let remark = "";

                                                                    if (manualPermissionSetting) {
                                                                        if(manualPermissionSetting.newData && manualPermissionSetting.newData.hasOwnProperty('applyBonus')
                                                                            && manualPermissionSetting.newData.applyBonus.toString() == 'true') {

                                                                            remark = "提款提案号：" + proposalObj.proposalId;
                                                                            autoEnableBonusPermission(proposalObj, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj);

                                                                        }
                                                                    } else {
                                                                        remark = "提款提案号：" + proposalObj.proposalId;
                                                                        autoEnableBonusPermission(proposalObj, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj);
                                                                    }
                                                                }
                                                            )
                                                        }
                                                    }

                                                );
                                        }

                                        return prom.then(() => {
                                            return proposalObj;
                                        });
                                    })
                                }
                            );
                    }
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't update proposal process step"});
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error find proposal process step", error: err});
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't update proposal process"});
                }
            },
            function (err) {
                if(err && err.errorMessage && err.errorMessage == "Bank Info Not Matched"){
                    deferred.reject({name: "DBError", message: err.errorMessage, error: err});
                }else{
                    deferred.reject({name: "DBError", message: "Error creating proposal process step", error: err});
                }
            }
        );
        return deferred.promise;
    },

    cancelProposal: function (proposalId, adminId, remark, adminObjId) {
        return dbconfig.collection_proposal.findOne({_id: proposalId})
            .populate({path: "process", model: dbconfig.collection_proposalProcess})
            .populate({path: "type", model: dbconfig.collection_proposalType})
            .then(
                function (proposalData) {
                    if (proposalData) {
                        var proposalStatus = proposalData.status || proposalData.process.status;

                        if (((proposalData.type.name === constProposalType.PLAYER_BONUS
                                && (proposalStatus === constProposalStatus.PENDING || proposalStatus === constProposalStatus.AUTOAUDIT || proposalStatus === constProposalStatus.CSPENDING))
                                || (proposalData.creator.name.toString() == adminId.toString())
                                && (proposalStatus === constProposalStatus.PENDING || proposalStatus === constProposalStatus.AUTOAUDIT))) {
                            return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, false, proposalData, true)
                                .then(successData => {
                                    let updateData = {
                                        "data.lastSettleTime": Date.now(),
                                        settleTime: Date.now(),
                                        noSteps: true,
                                        process: null,
                                        status: constProposalStatus.CANCEL,
                                        "data.cancelBy": "客服：" + adminId
                                    };
                                    if (proposalData.type.name == constProposalType.PLAYER_BONUS || proposalData.type.name == constProposalType.PARTNER_BONUS) {
                                        dbProposalUtility.createProposalProcessStep(proposalData, adminObjId, constProposalStatus.CANCEL, remark).catch(errorUtils.reportError);
                                        delete updateData.process;
                                    }
                                    return dbconfig.collection_proposal.findOneAndUpdate(
                                        {_id: proposalData._id, createTime: proposalData.createTime},
                                        updateData,
                                        {new: true}
                                    );
                                })
                        }
                        else {
                            return Q.reject({message: "incorrect proposal status or authentication."});
                        }
                    }
                    else {
                        return Q.reject({message: "incorrect proposal data!"});
                    }
                }
            );
    },

    autoCancelProposal: function (proposalData) {
        if (proposalData) {
            var reject = true;
            var proposalStatus = proposalData.status || proposalData.process.status;

            if (proposalStatus != constProposalStatus.PENDING) {
                reject = false;
            }

            if (reject) {
                return proposalExecutor.approveOrRejectProposal(proposalData.type.executionType, proposalData.type.rejectionType, false, proposalData, true)
                    .then(successData => {
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposalData._id, createTime: proposalData.createTime},
                            {
                                noSteps: true,
                                process: null,
                                status: constProposalStatus.CANCEL,
                                "data.cancelBy": "秒杀礼包已过期"
                            },
                            {new: true}
                        );
                    })
                    .then( // todo :: for debug only, check if proposalData found actually have wrong expire time. delete when it doesn't need anymore (may be 2 months without this issue)
                        data => {
                            console.log("autoCancelProposal successful", proposalData, data);
                            return data;
                        }
                    );
            }
            else {
                return Q.reject({message: "incorrect proposal status or authentication."});
            }
        }
        else {
            return Q.reject({message: "incorrect proposal data!"});
        }
    },

    getAllPlatformAvailableProposalsForAdminId: function (adminId, platform) {
        var platformArr = [];
        return proposal.getAvailableProposalsByAdminId(adminId, platform)
            .then(
                data => {
                    var result = [];
                    if (data && data.length > 0) {
                        for (var i in data) {
                            if (data[i].length > 0) {
                                result = result.concat(data[i]);
                            }
                        }
                        return result;
                    }
                }
            )
    },

    getPlatformProposals: function (platformId) {
        return dbconfig.collection_proposalType.find({platformId: platformId}).lean().then(
            types => {
                if (types && types.length > 0) {
                    var proposalTypesId = [];
                    for (var i = 0; i < types.length; i++) {
                        proposalTypesId.push(types[i]._id);
                    }
                    return dbconfig.collection_proposal.find({type: {$in: proposalTypesId}}).populate({
                        path: 'type',
                        model: dbconfig.collection_proposalType
                    }).populate({
                        path: 'process',
                        model: dbconfig.collection_proposalProcess
                    }).sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM * 10).lean()
                        .then(
                            data => {
                                data.map(item => function (item) {
                                    if (item.data && item.data.phone) {
                                        item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                    }
                                    if (item.data && item.data.phoneNumber) {
                                        item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
                                    }

                                    return item;
                                });
                            }
                        )
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform proposal types"});
                }
            }
        );
    },

    /**
     * Get all available proposals for admin user
     * @param {ObjectId} adminId - The id of the admin user
     * @param {ObjectId} platformId - The id of the platform
     */
    getAvailableProposalsByAdminId: function (adminId, platformId) {
        var deferred = Q.defer();
        var proposalTypesId = [];

        var prom1 = dbconfig.collection_proposalType.find({platformId: platformId}).exec();
        var prom2 = dbconfig.collection_admin.findOne({_id: adminId}).exec();
        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    for (var i = 0; i < data[0].length; i++) {
                        proposalTypesId.push(data[0][i]._id);
                    }
                    //find all related proposal type process step based on user's department and role
                    return dbconfig.collection_proposalProcessStep.find(
                        {$and: [{department: {$in: data[1].departments}}, {role: {$in: data[1].roles}}]}
                    ).exec();
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't find admin user"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding admin user", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //get all proposal process with current step in found steps
                    var stepIds = [];
                    for (var i = 0; i < data.length; i++) {
                        stepIds.push(data[i]._id);
                    }
                    return dbconfig.collection_proposalProcess.find(
                        {steps: {$elemMatch: {$in: stepIds}}}
                    ).exec();
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching process", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //get all proposal process with current step in found steps
                    var processIds = [];
                    for (var i = 0; i < data.length; i++) {
                        processIds.push(data[i]._id);
                    }
                    return dbconfig.collection_proposal.find(
                        {
                            type: {$in: proposalTypesId},
                            $or: [
                                {process: {$in: processIds}},
                                {noSteps: true}
                            ]
                        }
                    ).populate({path: 'type', model: dbconfig.collection_proposalType})
                        .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                        .sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM * 10).lean();
                }
                else {
                    //return all no step proposal
                    return dbconfig.collection_proposal.find(
                        {
                            type: {$in: proposalTypesId},
                            noSteps: true
                        }).populate({path: 'type', model: dbconfig.collection_proposalType})
                        .sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM * 10).lean();
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        ).then(
            function (data) {
                //populate player id if it is ObjectId
                //deferred.resolve(data);
                var proms = [];
                data.forEach(
                    record => {
                        if (record.data && record.data.phone) {
                            record.data.phone = dbutility.encodePhoneNum(record.data.phone);
                        }
                        if (record.data && record.data.phoneNumber) {
                            record.data.phoneNumber = dbutility.encodePhoneNum(record.data.phoneNumber);
                        }

                        if (record.data && record.data.playerId && mongoose.Types.ObjectId.isValid(record.data.playerId)) {
                            proms.push(
                                dbconfig.collection_players.findOne({_id: record.data.playerId}, {
                                    name: 1,
                                    playerId: 1
                                }).lean().then(
                                    recordPlayer => {
                                        record.data.playerId = recordPlayer;
                                        return record;
                                    }
                                )
                            );
                        }
                        else {
                            proms.push(record);
                        }
                    }
                );
                return Q.all(proms);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        );
        return deferred.promise;
    },

    getApprovalProposalsByAdminId: function (adminId, platformId) {
        var deferred = Q.defer();
        var proposalTypesId = [];

        var prom1 = dbconfig.collection_proposalType.find({platformId: platformId}).exec();
        var prom2 = dbconfig.collection_admin.findOne({_id: adminId}).exec();
        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    for (var i = 0; i < data[0].length; i++) {
                        proposalTypesId.push(data[0][i]._id);
                    }
                    //find all related proposal type process step based on user's department and role
                    return dbconfig.collection_proposalProcessStep.find(
                        {$and: [{department: {$in: data[1].departments}}, {role: {$in: data[1].roles}}]}
                    ).exec();
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't find admin user"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding admin user", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //get all proposal process with current step in found steps
                    var stepIds = [];
                    for (var i = 0; i < data.length; i++) {
                        stepIds.push(data[i]._id);
                    }
                    return dbconfig.collection_proposalProcess.find(
                        {steps: {$elemMatch: {$in: stepIds}}}
                    ).exec();
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching process", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //get all proposal process with current step in found steps
                    var processIds = [];
                    for (var i = 0; i < data.length; i++) {
                        processIds.push(data[i]._id);
                    }
                    return dbconfig.collection_proposal.find(
                        {
                            type: {$in: proposalTypesId},
                            $and: [
                                {process: {$in: processIds}},
                                {noSteps: false}
                            ],
                            process: {$exists: true},
                        }
                    ).populate({path: 'type', model: dbconfig.collection_proposalType})
                        .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                        .sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM * 10).lean();
                }
                else {
                    return [];
                    //return all no step proposal
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        ).then(
            function (data) {
                //populate player id if it is ObjectId
                //deferred.resolve(data);
                var proms = [];
                data.forEach(
                    record => {
                        if (record && record.process && record.process.status != constProposalStatus.PENDING) {
                            return;
                        } else if (record.data && record.data.playerId && mongoose.Types.ObjectId.isValid(record.data.playerId)) {
                            proms.push(
                                dbconfig.collection_players.findOne({_id: record.data.playerId}, {
                                    name: 1,
                                    playerId: 1
                                }).lean().then(
                                    recordPlayer => {
                                        record.data.playerId = recordPlayer;
                                        return record;
                                    }
                                )
                            );
                        }
                        else {
                            proms.push(record);
                        }
                    }
                );
                return Q.all(proms);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        );
        return deferred.promise;
    },

    getQueryApprovalProposalsForAdminId: function (adminId, platformId, typeArr = [], credit, relateUser, startTime, endTime, index, size, sortCol) {//need
        var proposalTypesId = [];
        var totalCount = 0;
        var finalSummary = [];
        size = Math.min(size, constSystemParam.REPORT_MAX_RECORD_NUM);

        let maxDiffTime = constSystemParam.PROPOSAL_SEARCH_MAX_TIME_FRAME;
        let searchInterval = Math.abs(new Date(startTime).getTime() - new Date(endTime).getTime());
        if (searchInterval > maxDiffTime) {
            return Promise.reject({
                name: "DataError",
                message: "Exceed proposal search max time frame"
            });
        }

        var prom1 = dbconfig.collection_proposalType.find({platformId: {$in: platformId}}).exec();
        var prom2 = dbconfig.collection_admin.findOne({_id: adminId}).exec();
        return Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    for (var i = 0; i < data[0].length; i++) {
                        if (!typeArr.length || typeArr.indexOf(data[0][i].name) !== -1) {
                            proposalTypesId.push(data[0][i]._id);
                        }
                    }
                    //find all related proposal type process step based on user's department and role
                    return dbconfig.collection_proposalProcessStep.find(
                        {
                            department: {$in: data[1].departments},
                            role: {$in: data[1].roles},
                            status: constProposalStatus.PENDING,
                            createTime: {
                                $gte: startTime,
                                $lt: endTime
                            }
                        }
                    ).exec();
                }
                else {
                    return Q.reject({name: "DBError", message: "Can't find admin user"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding admin user", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //get all proposal process with current step in found steps
                    var stepIds = [];
                    for (var i = 0; i < data.length; i++) {
                        stepIds.push(data[i]._id);
                    }
                    return dbconfig.collection_proposalProcess.find(
                        {currentStep: {$in: stepIds}, status: constProposalStatus.PENDING}
                    ).populate({path: "type", model: dbconfig.collection_proposalTypeProcess}).exec();
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding matching process", error: error});
            }
        ).then(
            function (data) {
                if (data && data.length > 0) {
                    //get all proposal process with current step in found steps
                    var processIds = [];
                    for (var i = 0; i < data.length; i++) {
                        if (!data[i].type || typeArr.indexOf(data[i].type.name) != -1 || !typeArr.length) {
                            processIds.push(data[i]._id);
                        }
                    }
                    var queryObj = {
                        createTime: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        noSteps: false,
                        status: constProposalStatus.PENDING
                    };

                    if (processIds && processIds.length > 0) {
                        queryObj.process = {$in: processIds};
                    }

                    if (proposalTypesId && proposalTypesId.length > 0) {
                        queryObj.type = {$in: proposalTypesId};
                    }

                    if (relateUser) {
                        queryObj["$and"] = queryObj["$and"] || [];
                        queryObj["$and"].push({"$or": [{"data.playerName": relateUser}, {"data.partnerName": relateUser}]});
                    }
                    if (credit) {
                        queryObj["$or"] = [
                            {"data.amount": credit},
                            {"data.rewardAmount": credit}
                        ];
                    }
                    var a = dbconfig.collection_proposal.find(queryObj)
                        .populate({path: 'type', model: dbconfig.collection_proposalType})
                        .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                        // .populate({path: 'remark.admin', model: dbconfig.collection_admin})
                        .populate({path: 'data.providers', model: dbconfig.collection_gameProvider})
                        .populate({path: 'isLocked', model: dbconfig.collection_admin})
                        .sort(sortCol).skip(index).limit(size).then(data => {
                            function getPlayerLevel(info) {
                                var playerObjId = info && info.data ? info.data.playerObjId : null;
                                if (!playerObjId) return info;
                                return dbPlayerInfo.getPlayerInfo({_id: playerObjId}).then(playerInfo => {
                                    if (playerInfo.playerLevel) {
                                        info.data.playerLevelName = playerInfo.playerLevel.name;
                                        info.data.playerLevelValue = playerInfo.playerLevel.value;
                                    }
                                    return info;
                                })
                            }

                            function encodePhoneNum(item) {
                                if (item.data && item.data.phone) {
                                    item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                }
                                if (item.data && item.data.phoneNumber) {
                                    item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
                                }
                                return item;
                            }

                            var result = data.map(item => getPlayerLevel(item));
                            result = data.map(item => encodePhoneNum(item));
                            return Q.all(result);
                        })
                    var b = dbconfig.collection_proposal.find(queryObj).count();
                    var c = dbconfig.collection_proposal.aggregate(
                        {
                            $match: queryObj
                        }, {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                                totalRewardAmount: {$sum: "$data.rewardAmount"},
                                totalTopUpAmount: {$sum: "$data.topUpAmount"},
                                totalUpdateAmount: {$sum: "$data.updateAmount"},
                                totalNegativeProfitAmount: {$sum: "$data.negativeProfitAmount"},
                                totalCommissionAmount: {$sum: "$data.commissionAmount"}
                            }
                        }
                    ).read("secondaryPreferred");
                    return Q.all([a, b, c]);
                }
                else {
                    //return all no step proposal
                    return Q.all([Q.resolve([]), Q.resolve(0), Q.resolve([])]);
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        ).then(
            function (resultData) {
                var proms = [];
                var data = resultData[0];
                totalCount = resultData[1];
                finalSummary = resultData[2] ? resultData[2][0] : {};
                data.forEach(
                    record => {
                        if (record.data && record.data.playerObjId && mongoose.Types.ObjectId.isValid(record.data.playerObjId)) {
                            proms.push(
                                dbconfig.collection_players.findOne({_id: record.data.playerObjId}, {
                                    name: 1,
                                    playerId: 1
                                }).lean().then(
                                    recordPlayer => {
                                        record.data.playerId = recordPlayer.playerId;
                                        return record;
                                    }
                                )
                            );
                        }
                        else {
                            proms.push(record);
                        }
                    }
                );
                return Q.all(proms);
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error finding matching proposal", error: error});
            }
        ).then(data => {
            var summaryObj = {};
            if (finalSummary) {
                summaryObj = {
                    amount: finalSummary.totalAmount + finalSummary.totalRewardAmount + finalSummary.totalTopUpAmount + finalSummary.totalUpdateAmount + finalSummary.totalNegativeProfitAmount + finalSummary.totalCommissionAmount
                }
            }
            return {data: data, size: totalCount, summary: summaryObj};
        });
    },

    getQueryProposalsForPlatformId: function (platformId, typeArr, statusArr, credit, userName, relateUser, relatePlayerId, entryType, startTime, endTime, index, size, sortCol, displayPhoneNum, playerId, eventName, promoTypeName, inputDevice, partnerId) {//need
        platformId = Array.isArray(platformId) ? platformId : [platformId];

        return dbconfig.collection_proposalType.find({platformId: {$in: platformId}}).lean().then(//removed , prom2
            data => {
                if (data) {
                    let types = data;

                    if (types && types.length > 0) {
                        let proposalTypesId = [];

                        // can directly pass object id into this
                        for (let i = 0; i < types.length; i++) {
                            if ((!typeArr || (typeArr && typeArr.length == 0)) || typeArr.indexOf(types[i].name) != -1) {
                                proposalTypesId.push(types[i]._id);
                            }
                        }

                        let queryObj = {
                            type: {$in: proposalTypesId},
                            createTime: {
                                $gte: new Date(startTime),
                                $lt: new Date(endTime)
                            }
                        };

                        let maxDiffTime = constSystemParam.PROPOSAL_SEARCH_MAX_TIME_FRAME;
                        let searchInterval = Math.abs(queryObj.createTime.$gte.getTime() - queryObj.createTime.$lt.getTime());
                        if (searchInterval > maxDiffTime) {
                            return Promise.reject({
                                name: "DataError",
                                message: "Exceed proposal search max time frame"
                            });
                        }

                        if (statusArr) {
                            queryObj.status = {$in: statusArr}
                        }

                        if (userName) {
                            queryObj['data.name'] = userName;
                        }

                        if (relateUser) {
                            queryObj["$and"] = [];
                            queryObj["$and"].push({
                                $or: [
                                    {"data.playerName": relateUser},
                                    {"data.partnerName": relateUser}
                                ]
                            })
                        }
                        if (relatePlayerId) {
                            queryObj["$and"] = [];
                            queryObj["$and"].push({
                                $or: [
                                    {"data.playerId": relatePlayerId},
                                    {"data.partnerId": relatePlayerId}
                                ]
                            })
                        }

                        if (playerId) {
                            queryObj["$or"] = [
                                {"data._id": {$in: [playerId, ObjectId(playerId)]}},
                                {"data.playerObjId": {$in: [playerId, ObjectId(playerId)]}}
                            ];
                        }

                        if (partnerId) {
                            queryObj["$or"] = [
                                {"data._id": {$in: [partnerId, ObjectId(partnerId)]}},
                                {"data.partnerObjId": {$in: [partnerId, ObjectId(partnerId)]}}
                            ];
                        }

                        if (eventName && eventName.length > 0) {
                            // queryObj["$and"] = queryObj["$and"] || [];
                            // let dataCheck = {"data.eventName": {$in: eventName}};
                            // let existCheck = {"data.eventName": {$exists: false}};
                            // let orQuery = [dataCheck, existCheck];
                            // queryObj["$and"].push({$or: orQuery});

                            queryObj["data.eventName"] = {$in: eventName};
                        }

                        if (promoTypeName && promoTypeName.length > 0) {
                            queryObj["data.PROMO_CODE_TYPE"] = {$in: promoTypeName};
                        }

                        if (credit) {
                            queryObj["$and"] = queryObj["$and"] || [];
                            queryObj["$and"].push({
                                $or: [
                                    {"data.amount": credit},
                                    {"data.rewardAmount": credit}
                                ]
                            })
                        }
                        if (entryType) {
                            queryObj.entryType = entryType;
                        }

                        inputDevice ? queryObj.inputDevice = inputDevice : null;
                        var sortKey = (Object.keys(sortCol))[0];
                        var a = sortKey != 'relatedAmount' ?
                            dbconfig.collection_proposal.find(queryObj)// .read("secondaryPreferred")
                                .populate({path: 'type', model: dbconfig.collection_proposalType})
                                .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                                // .populate({path: 'remark.admin', model: dbconfig.collection_admin})
                                .populate({path: 'data.providers', model: dbconfig.collection_gameProvider})
                                .populate({path: 'isLocked', model: dbconfig.collection_admin})
                                .populate({path: 'data.playerObjId', model: dbconfig.collection_players})
                                //.populate({path: 'data.playerObjId.csOfficer', model: dbconfig.collection_csOfficerUrl})
                                .sort(sortCol).skip(index).limit(size).lean()
                                .then(
                                    pdata => {
                                        pdata.map(item => {
                                            // only displayPhoneNum equal true, encode the phone num
                                            if (item.data && item.data.phone && !displayPhoneNum) {
                                                item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                            }
                                            if (item.data && item.data.phoneNumber && !displayPhoneNum) {
                                                item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
                                            }
                                            if (item.data && item.data.updateData) {
                                                switch (Object.keys(item.data.updateData)[0]) {
                                                    case "phoneNumber":
                                                        if (item && item.status && item.status != constProposalStatus.PENDING) {
                                                            item.data.updateData.phoneNumber = dbutility.encodePhoneNum(item.data.updateData.phoneNumber);
                                                        }
                                                        break;
                                                    case "email":
                                                        let startIndex = Math.max(Math.floor((item.data.updateData.email.length - 4) / 2), 0);
                                                        item.data.updateData.email = item.data.updateData.email.substr(0, startIndex) + "****" + item.data.updateData.email.substr(startIndex + 4);
                                                        break;
                                                    case "qq":
                                                        let qqNumber = item.data.updateData.qq.substr(0, item.data.updateData.qq.indexOf("@"));
                                                        let qqIndex = Math.max(Math.floor((qqNumber.length - 4) / 2), 0);
                                                        let qqNumberEncoded = qqNumber.substr(0, qqIndex) + "****" + qqNumber.substr(qqIndex + 4);
                                                        item.data.updateData.qq = qqNumberEncoded + "@qq.com";
                                                        break;
                                                    case "weChat":
                                                        let weChatIndex = Math.max(Math.floor((item.data.updateData.weChat.length - 4) / 2), 0);
                                                        item.data.updateData.weChat = item.data.updateData.weChat.substr(0, weChatIndex) + "****" + item.data.updateData.weChat.substr(weChatIndex + 4);
                                                        break;
                                                    case "wechat":
                                                        let wechatIndex = Math.max(Math.floor((item.data.updateData.wechat.length - 4) / 2), 0);
                                                        item.data.updateData.wechat = item.data.updateData.wechat.substr(0, wechatIndex) + "****" + item.data.updateData.wechat.substr(wechatIndex + 4);
                                                        break;
                                                    case "bankAccount":
                                                        item.data.updateData.bankAccount = dbutility.encodeBankAcc(item.data.updateData.bankAccount);
                                                        break;
                                                }
                                            }
                                            return item
                                        })

                                        return pdata;
                                    })
                            :
                            dbconfig.collection_proposal.aggregate(
                                {$match: queryObj},
                                {
                                    $project: {
                                        docId: "$_id",
                                        relatedAmount: {$sum: ["$data.amount", "$data.rewardAmount", "$data.topUpAmount", "$data.updateAmount", "$data.negativeProfitAmount", "$data.commissionAmount"]}
                                    }
                                }, {$sort: sortCol}, {$skip: index}, {$limit: size}).read("secondaryPreferred").then(
                                aggr => {
                                    var retData = [];

                                    function getDoc(id) {
                                        return dbconfig.collection_proposal.findOne({_id: id})
                                            .populate({path: 'type', model: dbconfig.collection_proposalType})
                                            .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                                            // .populate({path: 'remark.admin', model: dbconfig.collection_admin})
                                            .populate({path: 'data.providers', model: dbconfig.collection_gameProvider})
                                            .populate({path: 'isLocked', model: dbconfig.collection_admin})
                                    }

                                    for (var index in aggr) {
                                        var prom = getDoc(aggr[index].docId);
                                        // only displayPhoneNum equal true, encode the phone num
                                        if (prom.data && prom.data.phone && !displayPhoneNum) {
                                            prom.data.phone = dbutility.encodePhoneNum(prom.data.phone);
                                        }
                                        if (prom.data && prom.data.phoneNumber && !displayPhoneNum) {
                                            prom.data.phoneNumber = dbutility.encodePhoneNum(prom.data.phoneNumber);
                                        }

                                        if (prom.data && prom.data.userAgent) {
                                            prom.inputDevice = dbutility.getInputDevice(prom.data.userAgent, false);
                                        }
                                        retData.push(prom);
                                    }
                                    return Q.all(retData);
                                });
                        var b = dbconfig.collection_proposal.find(queryObj).read("secondaryPreferred").count();
                        var c = dbconfig.collection_proposal.aggregate(
                            {
                                $match: queryObj
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                    totalRewardAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.rewardAmount", NaN]}, 0, "$data.rewardAmount"
                                            ]
                                        }
                                    },
                                    // totalRewardAmount: {$sum: "$data.rewardAmount"},
                                    totalTopUpAmount: {$sum: "$data.topUpAmount"},
                                    totalUpdateAmount: {$sum: "$data.updateAmount"},
                                    totalNegativeProfitAmount: {$sum: "$data.negativeProfitAmount"},
                                    totalCommissionAmount: {$sum: "$data.commissionAmount"}
                                }
                            }
                        ).read("secondaryPreferred");
                        return Q.all([a, b, c])
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can not find platform proposal types"});
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
                }
            }
        ).then(returnData => {
            var summaryObj = {};
            if (returnData[2] && returnData[2][0]) {
                summaryObj = {
                    amount: returnData[2][0].totalAmount + returnData[2][0].totalRewardAmount + returnData[2][0].totalTopUpAmount + returnData[2][0].totalUpdateAmount + returnData[2][0].totalNegativeProfitAmount + returnData[2][0].totalCommissionAmount
                };
            }

            if(returnData[0] && returnData[0].length > 0 && statusArr){
                let indexOfApprovedStatus = statusArr.findIndex(s => s == "approved");
                let indexOfSuccessStatus = statusArr.findIndex(s => s == "Success");
                if(indexOfApprovedStatus == -1 && indexOfSuccessStatus > -1){
                    returnData[0] = returnData[0].filter(r => !((r.type.name == "PlayerBonus" || r.type.name == "PartnerBonus" || r.type.name == "BulkExportPlayerData") && r.status == "Approved"));
                }else if(indexOfApprovedStatus > -1 && indexOfSuccessStatus == -1){
                    returnData[0] = returnData[0].filter(r => !((r.type.name != "PlayerBonus" && r.type.name != "PartnerBonus" && r.type.name != "BulkExportPlayerData" ) && r.status == "Approved"));
                }
            }

            return {data: returnData[0], size: returnData[1], summary: summaryObj};
        });
    },
    getDuplicatePlayerPhoneNumber: function (platformId, typeArr, statusArr, userName, phoneNumber, startTime, endTime, index, size, sortCol, displayPhoneNum, proposalId) {//need
        platformId = Array.isArray(platformId) ? platformId : [platformId];

        //check proposal without process
        var prom1 = dbconfig.collection_proposalType.find({platformId: {$in: platformId}}).lean();

        let playerProm = [];
        return Q.all([prom1]).then(//removed , prom2
            data => {
                if (data && data[0]) { // removed  && data[1]
                    var types = data[0];
                    // var processes = data[1];
                    if (types && types.length > 0) {
                        var proposalTypesId = [];
                        for (var i = 0; i < types.length; i++) {
                            if (!typeArr || typeArr.indexOf(types[i].name) != -1) {
                                proposalTypesId.push(types[i]._id);
                            }
                        }
                        let selectedPlatformId = platformId[0];

                        var a = dbconfig.collection_players.find({
                            platform: ObjectId(selectedPlatformId),
                            phoneNumber: {$in: [rsaCrypto.encrypt(phoneNumber), rsaCrypto.oldEncrypt(phoneNumber)]}
                        }).populate({
                            path: 'playerLevel',
                            model: dbconfig.collection_playerLevel
                        });
                        var b = dbconfig.collection_partner.find({
                            platform: ObjectId(selectedPlatformId),
                            phoneNumber: phoneNumber
                        }).populate({
                            path: 'level',
                            model: dbconfig.collection_partnerLevel
                        });
                        return Q.all([a, b])
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can not find platform proposal types"});
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
                }
            }).then(data => {

            let duplicateList = [];
            let plyData = [];
            let partnerData = [];
            plyData = proposal.getPlayerIpAreaFromRecord(platformId, data[0]);
            partnerData = proposal.getPartnerIpAreaFromRecord(platformId, data[1]);

            return Promise.all([plyData, partnerData]).then(
                ydata => {
                    let concatList = [];
                    if (!ydata[0]) {
                        ydata[0] = [];
                    }
                    if (!ydata[1]) {
                        ydata[1] = [];
                    }
                    let duplicateList = ydata[0].concat(ydata[1]);
                    let resultSize = ydata[0].length + ydata[1].length;
                    let result = {data: duplicateList, size: resultSize};
                    return result;
                },
                err => {
                    console.log(err);
                }
            )

        })
    },
    getPlayerRegistrationIPArea: function (platformId, id, type) {
        let query = {};
        if (type == 'playerId') {
            query = {'data.playerId': id}
        } else {
            query = {'data.partnerId': id}
        }
        query.status = 3;

        return dbconfig.collection_proposal.findOne(query)
            .then(data => {
                if (data) {
                    let result = data;
                    return result;
                } else {
                    return {};
                }
            })
    },
    getPlayerIpAreaFromRecord: function (platformId, playersData) {
        let result = [];
        playersData.forEach(item => {
            let prom = proposal.getPlayerRegistrationIPArea(platformId, item.playerId, 'playerId').then(data => {
                let ipArea = {};
                if (data.data) {
                    ipArea = data.data.ipArea ? data.data.ipArea : {};
                }
                let playerUnitData = {
                    'data': {
                        'playerId': item.playerId ? item.playerId : '',
                        'realName': item.realName ? item.realName : '',
                        'lastLoginIp': item.lastLoginIp ? item.lastLoginIp : '',
                        'topUpTimes': item.topUpTimes,
                        'smsCode': '',
                        'remarks': '',
                        'device': '',
                        'promoteWay': '',
                        'csOfficer': '',
                        'registrationTime': item.registrationTime ? item.registrationTime : "",
                        'lastAccessTime': item.lastAccessTime ? item.lastAccessTime : "",
                        'proposalId': '',
                        'playerLevel': item.playerLevel,
                        'credibilityRemarks': item.credibilityRemarks ? item.credibilityRemarks : "",
                        'valueScore': item.valueScore ? item.valueScore : 0,
                        'phoneProvince': item.phoneProvince ? item.phoneProvince : '',
                        'phoneCity': item.phoneCity ? item.phoneCity : '',
                        'ipArea': ipArea,
                        'name': item.name ? item.name : '',
                        'forbidPlayerFromLogin': item.permission ? item.permission.forbidPlayerFromLogin : false
                    }
                };
                return playerUnitData;
            });
            result.push(prom);
        });
        return Promise.all(result);
    },
    getPartnerIpAreaFromRecord: function (platformId, partnerData) {

        let result = [];
        partnerData.forEach(item => {
            let prom = proposal.getPlayerRegistrationIPArea(platformId, item.playerId, 'partnerId').then(data => {
                let ipArea = {};
                if (data.data) {
                    ipArea = data.data.ipArea ? data.data.ipArea : {};
                }
                let partnerUnitData = {
                    'data': {
                        'name': item.partnerName ? item.partnerName : '',
                        'playerId': item.playerId ? item.playerId : '',
                        'realName': item.realName ? item.realName : '',
                        'lastLoginIp': item.lastLoginIp ? item.lastLoginIp : '',
                        'topUpTimes': item.topUpTimes,
                        'smsCode': '',
                        'remarks': '',
                        'device': '',
                        'promoteWay': '',
                        'csOfficer': '',
                        'registrationTime': item.registrationTime ? item.registrationTime : "",
                        'lastAccessTime': item.lastAccessTime ? item.lastAccessTime : "",
                        'proposalId': '',
                        'playerLevel': item.level,
                        'credibilityRemarks': item.credibilityRemarks ? item.credibilityRemarks : "",
                        'valueScore': item.valueScore ? item.valueScore : '',
                        'phoneProvince': item.phoneProvince ? item.phoneProvince : '',
                        'phoneCity': item.phoneCity ? item.phoneCity : '',
                        'ipArea': ipArea,
                        'forbidPlayerFromLogin': item.permission ? item.permission.forbidPlayerFromLogin : false
                    },
                }
                return partnerUnitData;
            })
            result.push(prom);
        })
        return Promise.all(result);
    },
    // getPlayerProposalsForPlatformId: function (platformId, typeArr, statusArr, userName, phoneNumber, startTime, endTime, index, size, sortCol, displayPhoneNum, proposalId) {//need
    //     platformId = Array.isArray(platformId) ? platformId : [platformId];
    //
    //     //check proposal without process
    //     var prom1 = dbconfig.collection_proposalType.find({platformId: {$in: platformId}}).lean();
    //
    //     let playerProm = [];
    //     return Q.all([prom1]).then(//removed , prom2
    //         data => {
    //             if (data && data[0]) { // removed  && data[1]
    //                 var types = data[0];
    //                 // var processes = data[1];
    //                 if (types && types.length > 0) {
    //                     var proposalTypesId = [];
    //                     for (var i = 0; i < types.length; i++) {
    //                         if (!typeArr || typeArr.indexOf(types[i].name) != -1) {
    //                             proposalTypesId.push(types[i]._id);
    //                         }
    //                     }
    //
    //                     var queryObj = {
    //                         status: {$in: statusArr},
    //                         data:  { $exists: true, $ne: null }
    //                     };
    //                     if (startTime && endTime) {
    //                         queryObj['createTime'] = {
    //                             $gte: new Date(startTime),
    //                             $lt: new Date(endTime)
    //                         }
    //                     }
    //                     if (userName) {
    //                         queryObj['data.name'] = userName;
    //                     }
    //                     if (phoneNumber) {
    //                         queryObj['data.phoneNumber'] = phoneNumber;
    //                     }
    //
    //                     if (size >= 0) {
    //                         var a = dbconfig.collection_playerRegistrationIntentRecord.find(queryObj)
    //                             //.populate({path: 'playerId', model: dbconfig.collection_players})
    //                             .sort(sortCol).skip(index).limit(size).lean()
    //                             .then(
    //                                 pdata => {
    //                                     pdata.map(item => {
    //                                         // only displayPhoneNum equal true, encode the phone num
    //                                         if (item.data && item.data.phone && !displayPhoneNum) {
    //                                             item.data.phone = dbutility.encodePhoneNum(item.data.phone);
    //                                         }
    //                                         if (item.data && item.data.phoneNumber && !displayPhoneNum) {
    //                                             item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
    //                                         }
    //                                         if (item.data && (item.data.playerId || item.data.name || item.data.phoneNumber)) {
    //                                             item.data.phoneNumber = item.data.phoneNumber ? item.data.phoneNumber : "";
    //                                             item.data.smsCode = item.data.smsCode ? item.data.smsCode : "";
    //                                             playerProm.push(proposal.getPlayerDetails(item.data.playerId, item.data.name, item.data.phoneNumber, item.data.smsCode, proposalTypesId));
    //                                         }
    //
    //                                         return item
    //                                     })
    //
    //                                     return pdata;
    //                                 })
    //                             .then(proposals => {
    //                                 proposals = insertPlayerRepeatCount(proposals, platformId[0]);
    //
    //                                 return proposals
    //                             })
    //                     } else {
    //                         a = dbconfig.collection_playerRegistrationIntentRecord.find(queryObj)
    //                             .then(
    //                                 pdata => {
    //                                     pdata.map(item => {
    //                                         // only displayPhoneNum equal true, encode the phone num
    //                                         if (item.data && item.data.phone && !displayPhoneNum) {
    //                                             item.data.phone = dbutility.encodePhoneNum(item.data.phone);
    //                                         }
    //                                         if (item.data && item.data.phoneNumber && !displayPhoneNum) {
    //                                             item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
    //                                         }
    //                                         if (item.data && (item.data.playerId || item.data.name || item.data.phoneNumber)) {
    //                                             item.data.phoneNumber = item.data.phoneNumber ? item.data.phoneNumber : "";
    //                                             item.data.smsCode = item.data.smsCode ? item.data.smsCode : "";
    //                                             playerProm.push(proposal.getPlayerDetails(item.data.playerId, item.data.name, item.data.phoneNumber, item.data.smsCode, proposalTypesId));
    //                                         }
    //
    //                                         return item
    //                                     })
    //
    //                                     return pdata;
    //                                 })
    //                             .then(proposals => {
    //                                 proposals = insertPlayerRepeatCount(proposals, platformId[0]);
    //
    //                                 return proposals
    //                             })
    //                     }
    //
    //                     var b = dbconfig.collection_playerRegistrationIntentRecord.find(queryObj).count();
    //                     return Q.all([a, b])
    //                 }
    //                 else {
    //                     return Q.reject({name: "DataError", message: "Can not find platform proposal types"});
    //                 }
    //             }
    //             else {
    //                 return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
    //             }
    //         }
    //     ).then(returnData => {
    //         return Q.all(playerProm).then(data => {
    //
    //             data.map(d => {
    //                 if (d && ((d[0] && d[0].playerId) || (d[1] && d[1].data.name) || (d[1] && d[1].data.phoneNumber))) {
    //                     for (var i = 0; i < returnData[0].length; i++) {
    //                         if (d[0] && d[0].playerId && d[0].playerId == returnData[0][i].data.playerId) {
    //                             if (d[0].csOfficer) {
    //                                 returnData[0][i].data.csOfficer = d[0].csOfficer.adminName;
    //                             }
    //                             if (d[0].promoteWay) {
    //                                 returnData[0][i].data.promoteWay = d[0].promoteWay;
    //                             }
    //                             if (d[0].registrationTime) {
    //                                 returnData[0][i].data.registrationTime = d[0].registrationTime;
    //                             }
    //                             if (d[0].topUpTimes) {
    //                                 returnData[0][i].data.topUpTimes = d[0].topUpTimes;
    //                             }
    //                             if (d[0].userAgent) {
    //                                 for (var j = 0; j < d[0].userAgent.length; j++) {
    //                                     returnData[0][i].data.device = dbutility.getInputDevice(d[0].userAgent, false);
    //                                 }
    //                             }
    //                             if (d[0].playerLevel) {
    //                                 returnData[0][i].data.playerLevel = d[0].playerLevel;
    //                             }
    //                             if (d[0].credibilityRemarks) {
    //                                 returnData[0][i].data.credibilityRemarks = d[0].credibilityRemarks;
    //                             }
    //                             if (d[0].valueScore) {
    //                                 returnData[0][i].data.valueScore = d[0].valueScore;
    //                             }
    //                             if (d[0].lastAccessTime) {
    //                                 returnData[0][i].data.lastAccessTime = d[0].lastAccessTime;
    //                             }
    //                             if (d[0].status) {
    //                                 returnData[0][i].data.playerStatus = d[0].status;
    //                             }
    //                             if(d[0].smsSetting){
    //                                 returnData[0][i].data.smsSetting = d[0].smsSetting
    //                             }
    //                             if(d[0].receiveSMS){
    //                                 returnData[0][i].data.receiveSMS = d[0].receiveSMS
    //                             }
    //                         }
    //
    //                         if (d[1] && d[1].data && d[1].data.name && d[1].data.name == returnData[0][i].data.name) {
    //                             if (d[1].proposalId && returnData[0][i].data.phoneNumber == d[1].data.phoneNumber) {
    //                                 returnData[0][i].data.proposalId = d[1].proposalId;
    //                             }
    //                         }else if(d[1] && d[1].data && d[1].data.phoneNumber && d[1].data.phoneNumber == returnData[0][i].data.phoneNumber){
    //                             if (d[1].proposalId) {
    //                                 returnData[0][i].data.proposalId = d[1].proposalId;
    //                             }
    //                         }
    //                     }
    //                 }
    //             })
    //
    //             return {data: returnData[0], size: returnData[1]};
    //         })
    //
    //     });
    // },

    getDuplicatePlayerRealName: function (platformId, realName, index, limit, sortCol) {
        index = index || 0;
        sortCol = sortCol || {createTime: 1};
        let sameRealNamePlayerCount = 0;

        let sameRealNamePlayerCountProm = dbconfig.collection_players.find({platform: platformId, realName: realName}).count();
        let sameRealNamePlayerProm = dbconfig.collection_players.find({platform: platformId, realName: realName})
            .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel})
            .sort(sortCol).skip(index).limit(limit).lean();

        return Promise.all([sameRealNamePlayerCountProm, sameRealNamePlayerProm]).then(
            data => {
                let playerIpArea = [];
                let sameRealNamePlayerRecord = data && data[1] ? data[1] : [];
                sameRealNamePlayerCount = data[0];

                if (sameRealNamePlayerRecord && sameRealNamePlayerRecord.length > 0) {
                    playerIpArea = proposal.getPlayerIpAreaFromRecord(platformId, sameRealNamePlayerRecord);
                }

                return Promise.all([playerIpArea]).then(
                    data => {
                        let duplicateRealNamePlayerList = data && data[0] ? data[0] : [];
                        let result = {data: duplicateRealNamePlayerList, size: sameRealNamePlayerCount};

                        return result;
                    },
                    err => {
                        console.log(err);
                    });
            });
    },

    getDuplicatePhoneNumber: function (platformId, phoneNumber, index, limit, sortCol, isPlayer) {
        index = index || 0;
        sortCol = sortCol || {createTime: 1};
        let duplicatePhoneNumberCount = 0;
        let duplicatePhoneNumberCountProm, duplicatePhoneNumberProm;
        let encryptPhone = rsaCrypto.encrypt(phoneNumber);
        let oldEncryptPhone = rsaCrypto.oldEncrypt(phoneNumber);

        if (isPlayer) {
            duplicatePhoneNumberCountProm = dbconfig.collection_players.find({platform: platformId, phoneNumber: {$in: [encryptPhone, oldEncryptPhone]}}).count();
            duplicatePhoneNumberProm = dbconfig.collection_players.find({platform: platformId, phoneNumber: {$in: [encryptPhone, oldEncryptPhone]}})
                .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel})
                .sort(sortCol).skip(index).limit(limit).lean();
        } else {
            duplicatePhoneNumberCountProm = dbconfig.collection_partner.find({platform: platformId, phoneNumber: {$in: [encryptPhone, oldEncryptPhone]}}).count();
            duplicatePhoneNumberProm = dbconfig.collection_partner.find({platform: platformId, phoneNumber: {$in: [encryptPhone, oldEncryptPhone]}})
                .sort(sortCol).skip(index).limit(limit).lean();
        }


        return Promise.all([duplicatePhoneNumberCountProm, duplicatePhoneNumberProm]).then(
            data => {
                let phoneNumberIpArea = [];
                let duplicatePhoneNumberRecord = data && data[1] ? data[1] : [];
                duplicatePhoneNumberCount = data[0];

                if (duplicatePhoneNumberRecord && duplicatePhoneNumberRecord.length > 0) {
                    if (isPlayer) {
                        phoneNumberIpArea = proposal.getPlayerIpAreaFromRecord(platformId, duplicatePhoneNumberRecord);
                    } else {
                        phoneNumberIpArea = proposal.getPartnerIpAreaFromRecord(platformId, duplicatePhoneNumberRecord);
                    }
                }

                return Promise.all([phoneNumberIpArea]).then(
                    data => {
                        let duplicatePhoneNumberList = data && data[0] ? data[0] : [];
                        let result = {data: duplicatePhoneNumberList, size: duplicatePhoneNumberCount};

                        return result;
                    },
                    err => {
                        console.log(err);
                    });
            });
    },

    getPlayerProposalsForPlatformId: function (platformId, typeArr, statusArr, userName, phoneNumber, startTime, endTime, index, size, sortCol, displayPhoneNum, proposalId, attemptNo = 0, unlockSizeLimit = false) {//need
        platformId = Array.isArray(platformId) ? platformId : [platformId];
        //check proposal without process
        let prom1 = dbconfig.collection_proposalType.find({platformId: {$in: platformId}}).lean();
        let playerProm = [];
        return Q.all([prom1]).then(//removed , prom2
            data => {
                if (data && data[0]) { // removed  && data[1]
                    var types = data[0];
                    // var processes = data[1];
                    if (types && types.length > 0) {
                        var proposalTypesId = [];
                        for (var i = 0; i < types.length; i++) {
                            if (!typeArr || typeArr.indexOf(types[i].name) != -1) {
                                if (types[i]._id) {
                                    proposalTypesId.push(types[i]._id);
                                }
                            }
                        }

                        var queryObj = {
                            type: {$in: proposalTypesId},
                            status: {$in: statusArr},
                            data: {$exists: true, $ne: null}
                        };
                        if (startTime && endTime) {
                            queryObj['createTime'] = {
                                $gte: new Date(startTime),
                                $lt: new Date(endTime)
                            }
                        }
                        if (userName) {
                            queryObj['data.name'] = userName;
                        }
                        if (phoneNumber) {
                            queryObj['data.phoneNumber'] = phoneNumber;
                        }

                        let proposalProm = [];
                        proposalProm = dbconfig.collection_proposal.find(queryObj)

                        if (!unlockSizeLimit) {
                            proposalProm = proposalProm.sort(sortCol).skip(index).limit(size).lean();

                        } else {
                            proposalProm = proposalProm.limit(50).lean();

                        }

                        proposalProm = proposalProm.then(
                            pdata => {
                                pdata.map(item => {
                                    // only displayPhoneNum equal true, encode the phone num
                                    if (item.data && item.data.phone && !displayPhoneNum) {
                                        item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                    }
                                    if (item.data && item.data.phoneNumber && !displayPhoneNum) {
                                        item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
                                    }
                                    if (item.data && item.data.playerId) {
                                        playerProm.push(proposal.getPlayerDetails(item.data.playerId));
                                    }

                                    return item;
                                });

                                return pdata;
                            })
                            .then(proposals => {
                                proposals = insertPlayerRepeatCount(proposals, platformId[0]);
                                return proposals
                            });

                        let proposalCount = dbconfig.collection_proposal.find(queryObj).lean().count();

                        return Q.all([proposalProm, proposalCount])
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can not find platform proposal types"});
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
                }
            }
        ).then(returnData => {
            return Q.all(playerProm).then(data => {
                data.map(d => {
                    if (d && d.playerId) {
                        for (var i = 0; i < returnData[0].length; i++) {

                            if (d && d.playerId && returnData[0][i].data.playerId && d.playerId == returnData[0][i].data.playerId) {
                                if (d.csOfficer) {
                                    returnData[0][i].data.csOfficer = d.csOfficer.adminName;
                                }
                                if (d.promoteWay) {
                                    returnData[0][i].data.promoteWay = d.promoteWay;
                                }

                                if (d.registrationTime) {
                                    returnData[0][i].data.registrationTime = d.registrationTime;
                                }
                                if (d.topUpTimes) {
                                    returnData[0][i].data.topUpTimes = d.topUpTimes;
                                }
                                // if (d.userAgent) {
                                //     for (var j = 0; j < d.userAgent.length; j++) {
                                //         returnData[0][i].data.device = dbutility.getInputDevice(d.userAgent, false);
                                //     }
                                // }
                                if (d.playerLevel) {
                                    returnData[0][i].data.playerLevel = d.playerLevel;
                                }
                                if (d.credibilityRemarks) {
                                    returnData[0][i].data.credibilityRemarks = d.credibilityRemarks;
                                }
                                if (d.valueScore) {
                                    returnData[0][i].data.valueScore = d.valueScore;
                                }
                                if (d.lastAccessTime) {
                                    returnData[0][i].data.lastAccessTime = d.lastAccessTime;
                                }
                                if (d.status) {
                                    returnData[0][i].data.playerStatus = d.status;
                                }
                                if (d.smsSetting) {
                                    returnData[0][i].data.smsSetting = d.smsSetting
                                }
                                if (d.receiveSMS) {
                                    returnData[0][i].data.receiveSMS = d.receiveSMS
                                }
                            }
                        }
                    }
                })

                let dataArr = [];
                if (attemptNo && attemptNo != 0 && attemptNo != -1) {
                    returnData[0].map(r => {
                        if (r.$playerAllCount == attemptNo) {
                            dataArr.push(r);
                        }
                    })
                } else {
                    dataArr = returnData[0];
                }

                if(dataArr && dataArr.length > 0){
                    for (var i = 0; i < dataArr.length; i++) {
                        if (dataArr[i] && dataArr[i].inputDevice) {
                            dataArr[i].device = dataArr[i].inputDevice;
                        }
                    }
                }

                return {data: dataArr, size: returnData[1]};
            })

        });
    },

    getPlayerDetails: function (playerID) {
        return dbconfig.collection_players.findOne({playerId: playerID})
            .populate({path: 'csOfficer', model: dbconfig.collection_admin, select: "adminName"})
            .populate({path: 'playerLevel', model: dbconfig.collection_playerLevel})
            .lean().then(
                data => {
                    return data ? data : "";
                }
            );
    },

    getPlayerSelfRegistrationRecordList: function (startTime, endTime, statusArr, platformObjId) {
        var totalHeadCount = 0;
        var returnArr = [];
        var recordArr = [];
        var prom = [];
        return dbconfig.collection_proposalType.findOne({platformId : {$in: platformObjId}, name: "PlayerRegistrationIntention"}).then(proposalType =>{
            if(proposalType && proposalType._id){
                let proposalTypesId = proposalType._id;
                var queryObj = {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    type: proposalType._id,
                    data: {$exists: true, $ne: null}
                };

                if (statusArr) {
                    queryObj.status = {$in: statusArr};
                }

                return dbconfig.collection_proposal.distinct("data.phoneNumber", queryObj).lean().then(dataList => {
                    dataList.map(phoneNumber => {
                        prom.push(dbconfig.collection_proposal.find({'data.phoneNumber': phoneNumber, type: proposalTypesId, data: {$exists: true, $ne: null}}).lean().sort({createTime: 1}));
                        //totalHeadCount += 1;
                    })
                    return Q.all(prom);
                })
            }else {
                return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
            }
        }).then(details => {
            details.map(data => {
                let currentArrNo = 1;
                data.map(d => {
                    if (!recordArr.find(r => r.phoneNumber == d.data.phoneNumber)) {
                        recordArr.push({phoneNumber: d.data.phoneNumber, status: d.status, attemptNo: 1, arrNo: 1});
                        currentArrNo = 1;
                    } else {
                        var indexNo = recordArr.findIndex(r => r.phoneNumber == d.data.phoneNumber && r.arrNo == currentArrNo);
                        if (recordArr[indexNo].status == constProposalStatus.SUCCESS || recordArr[indexNo].status == constProposalStatus.MANUAL
                        || d.data.status == constProposalStatus.MANUAL) {
                            recordArr.push({
                                phoneNumber: d.data.phoneNumber,
                                status: d.status,
                                attemptNo: 1,
                                arrNo: currentArrNo + 1
                            });
                            currentArrNo = currentArrNo + 1;
                        } else {
                            recordArr[indexNo].status = d.status;
                            recordArr[indexNo].attemptNo = recordArr[indexNo].attemptNo + 1;
                        }
                    }
                })
            })
            return recordArr;
        }).then(playerAttemptNumber => {
            var firstFail = playerAttemptNumber.filter(function (event) {
                return (event.status == constProposalStatus.PENDING) && event.attemptNo == 1
            }).length;
            var secondFail = playerAttemptNumber.filter(function (event) {
                return (event.status == constProposalStatus.PENDING) && event.attemptNo == 2
            }).length;
            var thirdFail = playerAttemptNumber.filter(function (event) {
                return (event.status == constProposalStatus.PENDING) && event.attemptNo == 3
            }).length;
            var fouthFail = playerAttemptNumber.filter(function (event) {
                return (event.status == constProposalStatus.PENDING) && event.attemptNo == 4
            }).length;
            var fifthFail = playerAttemptNumber.filter(function (event) {
                return (event.status == constProposalStatus.PENDING) && event.attemptNo == 5
            }).length;
            var fifthUpFail = playerAttemptNumber.filter(function (event) {
                return (event.status == constProposalStatus.PENDING) && event.attemptNo > 5
            }).length;

            var firstSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 1
            }).length;
            var secondSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 2
            }).length;
            var thirdSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 3
            }).length;
            var fouthSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 4
            }).length;
            var fifthSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 5
            }).length;
            var fifthUpSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo > 5
            }).length;

            totalHeadCount = firstFail + secondFail + thirdFail + fouthFail + fifthFail + fifthUpFail
                            + firstSuccess + secondSuccess + thirdSuccess + fouthSuccess + fifthSuccess + fifthUpSuccess;

            var firstFailPercent = totalHeadCount ? (firstFail / totalHeadCount * 100).toFixed(2) : 0;
            var secondFailPercent = totalHeadCount ? (secondFail / totalHeadCount * 100).toFixed(2) : 0;
            var thirdFailPercent = totalHeadCount ? (thirdFail / totalHeadCount * 100).toFixed(2) : 0;
            var fouthFailPercent = totalHeadCount ? (fouthFail / totalHeadCount * 100).toFixed(2) : 0;
            var fifthFailPercent = totalHeadCount ? (fifthFail / totalHeadCount * 100).toFixed(2) : 0;
            var fifthUpFailPercent = totalHeadCount ? (fifthUpFail / totalHeadCount * 100).toFixed(2) : 0;

            var firstSuccessPercent = totalHeadCount ? (firstSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var secondSuccessPercent = totalHeadCount ? (secondSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var thirdSuccessPercent = totalHeadCount ? (thirdSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var fouthSuccessPercent = totalHeadCount ? (fouthSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var fifthSuccessPercent = totalHeadCount ? (fifthSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var fifthUpSuccessPercent = totalHeadCount ? (fifthUpSuccess / totalHeadCount * 100).toFixed(2) : 0;

            var arr = [];

            arr.push({
                selfRegistrationTotalSuccess: "HEAD_COUNT",
                totalAttempt: totalHeadCount,
                firstFail: firstFail,
                secondFail: secondFail,
                thirdFail: thirdFail,
                fouthFail: fouthFail,
                fifthFail: fifthFail,
                fifthUpFail: fifthUpFail,
                firstSuccess: firstSuccess,
                secondSuccess: secondSuccess,
                thirdSuccess: thirdSuccess,
                fouthSuccess: fouthSuccess,
                fifthSuccess: fifthSuccess,
                fifthUpSuccess: fifthUpSuccess
            })

            arr.push({
                selfRegistrationTotalSuccess: "PERCENTAGE",
                totalAttempt: 100.00,
                firstFail: firstFailPercent,
                secondFail: secondFailPercent,
                thirdFail: thirdFailPercent,
                fouthFail: fouthFailPercent,
                fifthFail: fifthFailPercent,
                fifthUpFail: fifthUpFailPercent,
                firstSuccess: firstSuccessPercent,
                secondSuccess: secondSuccessPercent,
                thirdSuccess: thirdSuccessPercent,
                fouthSuccess: fouthSuccessPercent,
                fifthSuccess: fifthSuccessPercent,
                fifthUpSuccess: fifthUpSuccessPercent
            })

            return arr;

        });
    },

    getPlayerManualRegistrationRecordList: function (startTime, endTime, statusArr, platformObjId) {
        var totalHeadCount = 0;
        var returnArr = [];
        var recordArr = [];
        var prom = [];

        return dbconfig.collection_proposalType.findOne({platformId : {$in: platformObjId}, name: "PlayerRegistrationIntention"}).then(proposalType =>{
            if(proposalType && proposalType._id){
                let proposalTypesId = proposalType._id;
                var queryObj = {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    type: proposalType._id,
                    data: {$exists: true, $ne: null}
                };

                if (statusArr) {
                    queryObj.status = {$in: statusArr};
                }

                return dbconfig.collection_proposal.distinct("data.phoneNumber", queryObj).lean().then(dataList => {
                    dataList.map(phoneNumber => {
                        prom.push(dbconfig.collection_proposal.find({'data.phoneNumber': phoneNumber, type: proposalTypesId, data: {$exists: true, $ne: null}}).lean().sort({createTime: 1}));
                    })
                    return Q.all(prom);
                })
            }else {
                return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
            }
        }).then(details => {
            details.map(data => {
                let currentArrNo = 1;
                data.map(d => {
                    if (!recordArr.find(r => r.phoneNumber == d.data.phoneNumber)) {
                        recordArr.push({phoneNumber: d.data.phoneNumber, status: d.status, attemptNo: 1, arrNo: 1});
                        currentArrNo = 1;
                    } else {
                        var indexNo = recordArr.findIndex(r => r.phoneNumber == d.data.phoneNumber && r.arrNo == currentArrNo);
                        if (recordArr[indexNo].status == constProposalStatus.SUCCESS || recordArr[indexNo].status == constProposalStatus.MANUAL
                            || d.data.status == constProposalStatus.MANUAL) {
                            recordArr.push({
                                phoneNumber: d.data.phoneNumber,
                                status: d.status,
                                attemptNo: 1,
                                arrNo: currentArrNo + 1
                            });
                            currentArrNo = currentArrNo + 1;
                        } else {
                            recordArr[indexNo].status = d.status;
                            recordArr[indexNo].attemptNo = recordArr[indexNo].attemptNo + 1;
                        }
                    }
                })
            })
            return recordArr;
        }).then(playerAttemptNumber => {
            var manualSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.MANUAL
            }).length;
            var firstSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 1
            }).length;
            var secondSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 2
            }).length;
            var thirdSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 3
            }).length;
            var fouthSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 4
            }).length;
            var fifthSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo == 5
            }).length;
            var fifthUpSuccess = playerAttemptNumber.filter(function (event) {
                return event.status == constProposalStatus.SUCCESS && event.attemptNo > 5
            }).length;

            totalHeadCount = manualSuccess + firstSuccess + secondSuccess + thirdSuccess + fouthSuccess + fifthSuccess + fifthUpSuccess;

            var manualSuccessPercent = totalHeadCount ? (manualSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var firstSuccessPercent = totalHeadCount ? (firstSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var secondSuccessPercent = totalHeadCount ? (secondSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var thirdSuccessPercent = totalHeadCount ? (thirdSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var fouthSuccessPercent = totalHeadCount ? (fouthSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var fifthSuccessPercent = totalHeadCount ? (fifthSuccess / totalHeadCount * 100).toFixed(2) : 0;
            var fifthUpSuccessPercent = totalHeadCount ? (fifthUpSuccess / totalHeadCount * 100).toFixed(2) : 0;

            var returnArr = [];

            returnArr.push({
                manualRegistrationTotalSuccess: "HEAD_COUNT",
                totalSuccess: totalHeadCount,
                manualSuccess: manualSuccess,
                firstSuccess: firstSuccess,
                secondSuccess: secondSuccess,
                thirdSuccess: thirdSuccess,
                fouthSuccess: fouthSuccess,
                fifthSuccess: fifthSuccess,
                fifthUpSuccess: fifthUpSuccess
            })

            returnArr.push({
                manualRegistrationTotalSuccess: "PERCENTAGE",
                totalSuccess: 100.00,
                manualSuccess: manualSuccessPercent,
                firstSuccess: firstSuccessPercent,
                secondSuccess: secondSuccessPercent,
                thirdSuccess: thirdSuccessPercent,
                fouthSuccess: fouthSuccessPercent,
                fifthSuccess: fifthSuccessPercent,
                fifthUpSuccess: fifthUpSuccessPercent
            })

            return returnArr;
        });
    },

    getPlayerRegistrationIntentRecordByStatus: function (platformId, typeArr, statusArr, userName, phoneNumber, startTime, endTime, index, size, sortCol, displayPhoneNum, proposalId, attemptNo, unlockSizeLimit) {
        var returnArr = [];
        var recordArr = [];
        var prom = [];
        var finalArr = [];

        return dbconfig.collection_proposalType.findOne({platformId : {$in: platformId}, name: "PlayerRegistrationIntention"}).then(proposalType =>{
            if(proposalType && proposalType._id){
                let proposalTypesId = proposalType._id;
                var queryObj = {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    type: proposalType._id,
                    data: {$exists: true, $ne: null}
                };

                if (statusArr) {
                    queryObj.status = {$in: statusArr};
                }

                return dbconfig.collection_proposal.distinct("data.phoneNumber", queryObj).lean().then(dataList => {
                    dataList.map(phoneNumber => {
                        prom.push(dbconfig.collection_proposal.find({'data.phoneNumber': phoneNumber, type: proposalTypesId, data: {$exists: true, $ne: null}}).lean().sort({createTime: 1}));
                    })
                    return Q.all(prom);
                })
            }else {
                return Q.reject({name: "DataError", message: "Can not find platform proposal related data"});
            }
        }).then(details => {
            details.map(data => {
                let currentArrNo = 1;
                data.map(d => {
                    if (!recordArr.find(r => r.phoneNumber == d.data.phoneNumber)) {
                        recordArr.push({phoneNumber: d.data.phoneNumber, status: d.status, attemptNo: 1, arrNo: 1});
                        currentArrNo = 1;
                    } else {
                        var indexNo = recordArr.findIndex(r => r.phoneNumber == d.data.phoneNumber && r.arrNo == currentArrNo);
                        if (recordArr[indexNo].status == constProposalStatus.SUCCESS || recordArr[indexNo].status == constProposalStatus.MANUAL
                            || d.data.status == constProposalStatus.MANUAL) {
                            recordArr.push({
                                phoneNumber: d.data.phoneNumber,
                                status: d.status,
                                attemptNo: 1,
                                arrNo: currentArrNo + 1
                            });
                            currentArrNo = currentArrNo + 1;
                        } else {
                            recordArr[indexNo].status = d.status;
                            recordArr[indexNo].attemptNo = recordArr[indexNo].attemptNo + 1;
                        }
                    }
                })
            })
            return recordArr;
        }).then(playerAttemptNumber => {
            if (attemptNo == 0) {
                return playerAttemptNumber.filter(function (event) {
                    return statusArr.includes(event.status) && event.attemptNo > 5
                });
            } else if (attemptNo < 0) {
                return playerAttemptNumber.filter(function (event) {
                    return statusArr.includes(event.status)
                });
            } else {
                return playerAttemptNumber.filter(function (event) {
                    return statusArr.includes(event.status) && event.attemptNo == attemptNo
                });
            }
        }).then(data => {
            data.map(d => {
                phoneNumber = d.phoneNumber

                let p = proposal.getPlayerProposalsForPlatformId(platformId, typeArr, statusArr, userName, phoneNumber, startTime, endTime, index, size, sortCol, displayPhoneNum, proposalId, attemptNo, unlockSizeLimit);
                returnArr.push(p);
            })
        }).then(data => {
            return Promise.all(returnArr);
        }).then(finalData => {

            finalData.map(final => {
                final.data.map(f => {
                        if (attemptNo == 0) {
                            if(statusArr.includes(f.status) && f.$playerAllCount > 5 && f.$playerCurrentCount == f.$playerAllCount){
                                if(!finalArr.find(r => r.data.phoneNumber == f.data.phoneNumber && r.data.name == f.data.name)){
                                    finalArr.push(f);
                                }
                            }
                        } else if (attemptNo < 0) {
                            if(statusArr.includes(f.status) && f.$playerCurrentCount == f.$playerAllCount){
                                if(!finalArr.find(r => r.data.phoneNumber == f.data.phoneNumber && r.data.name == f.data.name)){
                                    finalArr.push(f);
                                }
                            }
                        } else {
                            if(statusArr.includes(f.status) && f.$playerAllCount == attemptNo && f.$playerCurrentCount == f.$playerAllCount){
                                if(!finalArr.find(r => r.data.phoneNumber == f.data.phoneNumber && r.data.name == f.data.name)){
                                    finalArr.push(f);
                                }
                            }
                        }
                    }
                )
            })

            return finalArr;
        });
    },

    /**
     * Get all available proposals for the selected platform and selected proposal types
     * @param {JSON} -  startTime, endTime, platformId (ObjectId), type{ObjectId), status
     *
     */
    getProposalsByAdvancedQuery: function (reqData, index, count, sortObj) {
        //count = Math.min(count, constSystemParam.REPORT_MAX_RECORD_NUM)
        sortObj = sortObj || {};
        var dataDeferred = Q.defer();
        var deferred = Q.defer();
        var proposalTypeList = [];
        var queryData = reqData;
        var resultArray = null;
        var totalSize = 0;
        var summary = {};
        let isApprove = false;
        let isSuccess = false;

        if (reqData.inputDevice) {
            reqData.inputDevice = Number(reqData.inputDevice);
        }

        if (reqData.status) {
            if (reqData.status == constProposalStatus.SUCCESS) {
                isSuccess = true;
                reqData.status = {
                    $in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]
                };
            }
            if (reqData.status == constProposalStatus.FAIL) {
                reqData.status = {
                    $in: [constProposalStatus.FAIL, constProposalStatus.REJECTED]
                };
            }
            if (reqData.status == constProposalStatus.APPROVE) {
                isApprove = true;
                reqData.status = {
                    $in: [constProposalStatus.APPROVED]
                };
            }
        }
        if (!reqData.type && reqData.platformId) {
            let searchQuery = {
                platformId: ObjectId(reqData.platformId)
            }

            if(isApprove){
                searchQuery.name = {$in:["BulkExportPlayerData", "PlayerBonus","PartnerBonus"]} ;
            }

            dbconfig.collection_proposalType.find(searchQuery).then(
                function (data) {
                    if (data && data.length > 0) {
                        for (var i = 0; i < data.length; i++) {
                            (proposalTypeList.push(ObjectId(data[i]._id)));
                        }
                    }
                    else {
                        dataDeferred.reject({
                            name: "DataError",
                            message: "No proposal type found in the selected platform.",
                        });
                    }
                    return proposalTypeList;
                },
                function (error) {
                    dataDeferred.reject({
                        name: "DBError",
                        message: "Error in searching proposal types in the selected platform.",
                        error: error
                    })
                }
            ).then(
                function (proposalTypeIdList) { // all proposal type ids of this platform
                    delete queryData.platformId;
                    var a = dbconfig.collection_proposal.find({
                        type: {$in: proposalTypeIdList},
                        $and: [queryData]
                    }).read("secondaryPreferred").count();
                    var b = dbconfig.collection_proposal.find({
                        type: {$in: proposalTypeIdList},
                        $and: [queryData]
                    }).sort(sortObj).skip(index).limit(count).populate({
                        path: "process",
                        model: dbconfig.collection_proposalProcess
                    }).populate({path: "type", model: dbconfig.collection_proposalType});
                    var c = dbconfig.collection_proposal.aggregate([
                        {
                            $match: {
                                type: {$in: proposalTypeIdList},
                                $and: [queryData]
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                                totalRewardAmount: {
                                    $sum: {
                                        $cond: [
                                            {$eq: ["$data.rewardAmount", NaN]},
                                            0,
                                            "$data.rewardAmount"
                                        ]
                                    }
                                },
                                // totalRewardAmount: {$sum: "$data.rewardAmount"},
                                totalTopUpAmount: {$sum: "$data.topUpAmount"},
                                totalUpdateAmount: {$sum: "$data.updateAmount"},
                                totalNegativeProfitAmount: {$sum: "$data.negativeProfitAmount"},
                                totalCommissionAmount: {$sum: "$data.commissionAmount"}
                            }
                        }
                    ]).read("secondaryPreferred");
                    return Q.all([a, b, c]);
                },
                function (error) {
                    dataDeferred.reject({
                        name: "DBError",
                        message: "Error in getting proposal type Ids in the selected platform.",
                        error: error
                    })
                }
            ).then(
                function (data) {
                    if (data && data[1]) {
                        totalSize = data[0];
                        resultArray = Object.assign([], data[1]);
                        summary = data[2];

                        if(resultArray && resultArray.length > 0 && isSuccess){
                            resultArray = resultArray.filter(r => !((r.type.name == "PlayerBonus" || r.type.name == "PartnerBonus" || r.type.name == "BulkExportPlayerData") && r.status == "Approved"));
                        }

                        dataDeferred.resolve(resultArray);
                    }
                },
                function (error) {
                    dataDeferred.reject({
                        name: "DBError",
                        message: "Error in getting proposals in the selected platform.",
                        error: error
                    })
                }
            );
        }
        else {
            if (reqData.type && reqData.type.length > 0) {
                let arr = reqData.type.map(item => {
                    return ObjectId(item);
                });
                reqData.type = {$in: arr}
            }

            let a, b, c;
            if(isApprove){
                let searchQuery = {
                    platformId: ObjectId(reqData.platformId),
                    name: {$in:["BulkExportPlayerData", "PlayerBonus","PartnerBonus"]}
                };

                a = dbconfig.collection_proposalType.find(searchQuery).then(
                    proposalType => {
                        delete reqData.platformId;
                        if(proposalType && proposalType.length > 0){
                            let proposalTypeIdList = [];
                            proposalType.forEach(p => {
                                if(p && p._id){
                                    let indexNo = reqData.type.$in.findIndex(r => r == p.id);

                                    if(indexNo != -1){
                                        proposalTypeIdList.push(p._id);
                                    }
                                }
                            });

                            reqData.type = {$in: proposalTypeIdList};
                        }

                        return dbconfig.collection_proposal.find(reqData).lean().count();
                    }
                );

                b = dbconfig.collection_proposalType.find(searchQuery).then(
                    proposalType => {
                        delete reqData.platformId;
                        if(proposalType && proposalType.length > 0){
                            let proposalTypeIdList = [];
                            proposalType.forEach(p => {
                                if(p && p._id){
                                    let indexNo = reqData.type.$in.findIndex(r => r == p.id);

                                    if(indexNo != -1){
                                        proposalTypeIdList.push(p._id);
                                    }
                                }
                            });

                            reqData.type = {$in: proposalTypeIdList};
                        }

                        return dbconfig.collection_proposal.find(reqData).sort(sortObj).skip(index).limit(count)
                            .populate({path: "type", model: dbconfig.collection_proposalType})
                            .populate({path: "process", model: dbconfig.collection_proposalProcess}).lean();
                    }
                );

                c = dbconfig.collection_proposalType.find(searchQuery).then(
                    proposalType => {
                        delete reqData.platformId;
                        if(proposalType && proposalType.length > 0){
                            let proposalTypeIdList = [];
                            proposalType.forEach(p => {
                                if(p && p._id){
                                    let indexNo = reqData.type.$in.findIndex(r => r == p.id);

                                    if(indexNo != -1){
                                        proposalTypeIdList.push(p._id);
                                    }
                                }
                            });

                            reqData.type = {$in: proposalTypeIdList};
                        }
                        return dbconfig.collection_proposal.aggregate([
                            {
                                $match: reqData
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.amount", NaN]},
                                                0,
                                                "$data.amount"
                                            ]
                                        }
                                    },
                                    totalRewardAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.rewardAmount", NaN]},
                                                0,
                                                "$data.rewardAmount"
                                            ]
                                        }
                                    },
                                    totalTopUpAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.topUpAmount", NaN]},
                                                0,
                                                "$data.topUpAmount"
                                            ]
                                        }
                                    },
                                    totalUpdateAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.updateAmount", NaN]},
                                                0,
                                                "$data.updateAmount"
                                            ]
                                        }
                                    },
                                    totalNegativeProfitAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.negativeProfitAmount", NaN]},
                                                0,
                                                "$data.negativeProfitAmount"
                                            ]
                                        }
                                    },
                                    totalCommissionAmount: {
                                        $sum: {
                                            $cond: [
                                                {$eq: ["$data.commissionAmount", NaN]},
                                                0,
                                                "$data.commissionAmount"
                                            ]
                                        }
                                    },
                                }
                            }
                        ]).read("secondaryPreferred");
                    }
                );
            }else{
                delete reqData.platformId;
                a = dbconfig.collection_proposal.find(reqData).lean().count();
                b = dbconfig.collection_proposal.find(reqData).sort(sortObj).skip(index).limit(count)
                    .populate({path: "type", model: dbconfig.collection_proposalType})
                    .populate({path: "process", model: dbconfig.collection_proposalProcess}).lean();
                c = dbconfig.collection_proposal.aggregate([
                    {
                        $match: reqData
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: {
                                $sum: {
                                    $cond: [
                                        {$eq: ["$data.amount", NaN]},
                                        0,
                                        "$data.amount"
                                    ]
                                }
                            },
                            totalRewardAmount: {
                                $sum: {
                                    $cond: [
                                        {$eq: ["$data.rewardAmount", NaN]},
                                        0,
                                        "$data.rewardAmount"
                                    ]
                                }
                            },
                            totalTopUpAmount: {
                                $sum: {
                                    $cond: [
                                        {$or: [{$eq: ["$data.topUpAmount", NaN]}, {$gt: ["$data.rewardAmount", 0]}]},
                                        0,
                                        "$data.topUpAmount"
                                    ]
                                }
                            },
                            totalUpdateAmount: {
                                $sum: {
                                    $cond: [
                                        {$eq: ["$data.updateAmount", NaN]},
                                        0,
                                        "$data.updateAmount"
                                    ]
                                }
                            },
                            totalNegativeProfitAmount: {
                                $sum: {
                                    $cond: [
                                        {$eq: ["$data.negativeProfitAmount", NaN]},
                                        0,
                                        "$data.negativeProfitAmount"
                                    ]
                                }
                            },
                            totalCommissionAmount: {
                                $sum: {
                                    $cond: [
                                        {$eq: ["$data.commissionAmount", NaN]},
                                        0,
                                        "$data.commissionAmount"
                                    ]
                                }
                            },
                        }
                    }
                ]).read("secondaryPreferred");
            }
            Q.all([a, b, c]).then(
                function (data) {
                    totalSize = data[0];
                    resultArray = Object.assign([], data[1]);
                    summary = data[2];

                    if(resultArray && resultArray.length > 0 && isSuccess){
                        resultArray = resultArray.filter(r => !((r.type.name == "PlayerBonus" || r.type.name == "PartnerBonus" || r.type.name == "BulkExportPlayerData") && r.status == "Approved"));
                    }

                    dataDeferred.resolve(resultArray);
                },
                function (err) {
                    dataDeferred.reject({
                        name: "DataError",
                        message: "Error in getting proposals type in the selected platform.",
                        error: err,
                    })
                }
            );
        }

        dataDeferred.promise.then(
            function (data) {
                data = resultArray;
                var allProm = [];
                if (data && data.length > 0) {
                    for (var i in data) {
                        if (data[i].data.playerId || data[i].data.playerId) {
                            try {
                                if (ObjectId(data[i].data.playerId)) {
                                }
                                allProm.push(dbconfig.collection_players.findOne({_id: data[i].data.playerId}));
                            }
                            catch (err) {
                                allProm.push(dbconfig.collection_players.findOne({playerId: data[i].data.playerId}));
                            }
                        } else {
                            allProm.push({playerId: 'NA'});
                        }
                    }
                }
                return Q.all(allProm);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting proposals in the selected platform.",
                    error: error
                })
            }
        ).then(
            function (playerData) {
                for (var i in playerData) {
                    if (playerData[i] && playerData[i].playerId) {
                        resultArray[i].data.playerShortId = playerData[i].playerId
                    }
                }
                let total = 0;

                if (summary[0]) {
                    total += summary[0].totalAmount;
                    total += summary[0].totalRewardAmount;
                    total += summary[0].totalTopUpAmount;
                    total += summary[0].totalUpdateAmount;
                    total += summary[0].totalNegativeProfitAmount;
                    total += summary[0].totalCommissionAmount;
                }
                total = dbutility.decimalAdjust("floor", total, -2);
                deferred.resolve({
                    size: totalSize,
                    data: resultArray,
                    summary: {amount: total}, //parseFloat(total).toFixed(2)
                });
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting player ID information.",
                    error: error
                })
            }
        );

        return deferred.promise;
    },

    getFinancialReportByDay: function (reqData) {
        reqData.platform = reqData.platform.map(id => ObjectId(id));

        let bonusTypeList = [constProposalType.PLAYER_BONUS, constProposalType.PARTNER_BONUS];
        let depositGroupRecord = [];
        let platformName = '';
        let tempStartDate = new Date(reqData.startTime).toISOString().slice(0, 10);
        let tempEndDate = new Date(reqData.endTime).toISOString().slice(0, 10);
        let dayStartTime = new Date(tempStartDate);
        let endDate = new Date(tempEndDate);
        let getNextDate;
        let dateRange = 0;
        let periodRange = 0;

        periodRange = 24 * 3600 * 1000;
        dateRange = (new Date(endDate) - new Date(dayStartTime)) || 0;
        getNextDate = function (date, day) {
            var newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + day));
        }
        let loopTimes = dateRange / periodRange;

        let depositGroupProm = getDepositGroup();
        let platformProm = dbconfig.collection_platform.findOne({_id: reqData.platform[0]}, {name: 1}).lean();

        return Promise.all([depositGroupProm, platformProm]).then(
            data => {
                depositGroupRecord = data && data[0] ? data[0] : [];
                platformName = data && data[1] && data[1].name ? data[1].name : '';

                let topUpProms = [];
                let bonusProms = [];
                let platformFeeEstimateProms = [];

                for(let i = 1; i <= loopTimes; i++) {
                    let currentDate = getNextDate.call(this, dayStartTime, i);
                    let splitCurrentDate = currentDate.toISOString().slice(0, 10).split('-');
                    let reformatCurrentDate = splitCurrentDate[0] + '-' + splitCurrentDate[1] + '-' + splitCurrentDate[2];

                    let startTime = new Date(currentDate.setHours(0, 0, 0, 0));
                    let endTime = new Date(currentDate.setHours(23, 59, 59, 999));

                    if (i == 1) {
                        // reset back to selected startTime if is first date
                        startTime = new Date(reqData.startTime);
                    }

                    if (i == loopTimes) {
                        // reset back to selected endTime if is last date
                        endTime = new Date(reqData.endTime);
                    }

                    // Deposit Records
                    if (depositGroupRecord && depositGroupRecord.length > 0) {
                        let topUpDetailProms = dailyTopUpDetail(depositGroupRecord, reqData.platform, startTime, endTime);

                        topUpProms.push(Promise.all(topUpDetailProms).then(
                            proposalData => {
                                let tempTopUpDetail = [];

                                if (proposalData && proposalData.length > 0) {
                                    proposalData.forEach(data => {
                                        if (data && data.length > 0) {
                                            data.forEach(topUpDetail => {
                                                tempTopUpDetail.push(topUpDetail);
                                            });
                                        }
                                    })
                                }

                                return tempTopUpDetail;
                            }
                        ).then(
                            topUpDetailData => {

                                let topUpRecord = rearrangeDailyTopUpDetailByDepositGroup(depositGroupRecord, topUpDetailData, reformatCurrentDate);

                                return topUpRecord;
                            }
                        ));
                    }

                    // Bonus Records
                    bonusProms.push(dailyBonusDetail(reqData.platform, startTime, endTime, reformatCurrentDate, bonusTypeList));

                    // Platform Fee Estimation Records
                    platformFeeEstimateProms.push(dailyPlatformFeeEstimateDetail(reqData.platform, startTime, endTime, reformatCurrentDate));

                }

                return Promise.all([Promise.all(topUpProms), Promise.all(bonusProms), Promise.all(platformFeeEstimateProms), platformName]).then(
                    data => {
                        if (data) {
                            let topUpResult =  data[0] ? data[0] : [];
                            let bonusResult =  data[1] ? data[1] : [];
                            let platformFeeResult =  data[2] ? data[2] : [];
                            let platformName = data[3] ? data[3] : '';

                            //remap 3 list based on date
                            if (topUpResult && topUpResult.length > 0) {
                                topUpResult.map(data => {
                                    if (data && data.date) {
                                        let bonusIndexNo = bonusResult.findIndex(x => x && x.date && x.date == data.date);
                                        let platformFeeIndexNo = platformFeeResult.findIndex(x => x.date && x.date == data.date);

                                        if (bonusIndexNo != -1) {
                                            data.bonusList = bonusResult[bonusIndexNo].bonusList;
                                        } else {
                                            data.bonusList = [];
                                        }

                                        if (platformFeeIndexNo != -1) {
                                            data.platformFeeEstimate = platformFeeResult[platformFeeIndexNo].platformFeeEstimate;
                                        } else {
                                            data.platformFeeEstimate = [];
                                        }
                                    }
                                });

                                return {data: topUpResult, platformName: platformName};

                            } else if (bonusResult && bonusResult.length > 0 && topUpResult.length == 0) {
                                bonusResult.map(data => {
                                    if (data && data.date) {
                                        let topUpIndexNo = topUpResult.findIndex(x => x && x.date && x.date == data.date);
                                        let platformFeeIndexNo = platformFeeResult.findIndex(x => x.date && x.date == data.date);

                                        if (topUpIndexNo != -1) {
                                            data.topUpList = topUpResult[topUpIndexNo].bonusList;
                                        } else {
                                            data.topUpList = [];
                                        }

                                        if (platformFeeIndexNo != -1) {
                                            data.platformFeeEstimate = platformFeeResult[platformFeeIndexNo].platformFeeEstimate;
                                        } else {
                                            data.platformFeeEstimate = [];
                                        }
                                    }
                                });

                                return {data: bonusResult, platformName: platformName};

                            } else if (platformFeeResult && platformFeeResult.length > 0 && topUpResult.length == 0 && bonusResult.length == 0) {
                                platformFeeResult.map(data => {
                                    if (data && data.date) {
                                        let topUpIndexNo = topUpResult.findIndex(x => x && x.date && x.date == data.date);
                                        let bonusIndexNo = bonusResult.findIndex(x => x && x.date && x.date == data.date);

                                        if (topUpIndexNo != -1) {
                                            data.topUpList = topUpResult[topUpIndexNo].bonusList;
                                        } else {
                                            data.topUpList = [];
                                        }

                                        if (bonusIndexNo != -1) {
                                            data.bonusList = bonusResult[bonusIndexNo].bonusList;
                                        } else {
                                            data.bonusList = [];
                                        }
                                    }
                                });

                                return {data: platformFeeResult, platformName: platformName};

                            } else {
                                return {data: [], platformName: platformName};
                            }
                        }
                    }
                );
            }

        )
    },

    getFinancialReportBySum: function (reqData) {
        reqData.platform = reqData.platform.map(id => ObjectId(id));
        let bonusTypeList = [constProposalType.PLAYER_BONUS, constProposalType.PARTNER_BONUS];
        let bonusDetail = [];
        let platformFeeEstimateDetail = [];
        let depositGroupRecord = [];
        let platformRecord = [];
        let sumBonusDetail = [];

        let depositGroupProm = getDepositGroup();
        let platformProm = dbconfig.collection_platform.find({_id: {$in: reqData.platform}}, {name: 1, }).lean();
        let bonusProm = getBonusDetail(reqData.platform, reqData.startTime, reqData.endTime);
        let platformFeeEstimateProm = getPlatformFeeEstimate(reqData.platform, reqData.startTime, reqData.endTime);
        let sumBonusTopUpProm = getTotalSumBonusDetail(reqData.platform, reqData.startTime, reqData.endTime);

        return Promise.all([depositGroupProm, platformProm, bonusProm, platformFeeEstimateProm, sumBonusTopUpProm]).then(
            data => {
                if(data) {
                    depositGroupRecord = data[0] ? data[0] : [];
                    platformRecord = data[1] ? data[1] : [];
                    bonusDetail = data[2] ? data[2] : [];
                    platformFeeEstimateDetail = data[3] ? data[3] : [];
                    sumBonusDetail = data[4] ? data[4] : [];

                    // Top up Records
                    if (depositGroupRecord && depositGroupRecord.length > 0) {
                        let topUpProms = sumTopUpDetail(depositGroupRecord, reqData.platform, reqData.startTime, reqData.endTime);

                        return Promise.all(topUpProms).then(
                            proposalData => {
                                let tempTopUpDetail = [];

                                if (proposalData && proposalData.length > 0) {
                                    proposalData.forEach(data => {
                                        if (data && data.length > 0) {
                                            data.forEach(topUpDetail => {
                                                tempTopUpDetail.push(topUpDetail);
                                            });
                                        }
                                    })
                                }

                                return tempTopUpDetail;
                            }
                        ).then(
                            topUpDetailData => {

                                let topUpRecord = rearrangeSumTopUpDetailByDepositGroup(depositGroupRecord, topUpDetailData, platformRecord);

                                return topUpRecord;
                            }
                        );
                    }
                }
            }
        ).then(
            topUpData => {
                let bonus = rearrangeBonusDetailByMutilplePlatform(bonusTypeList, bonusDetail, platformRecord);
                let platformFee = rearrangePlatformFeeEstimateDetailByMutilplePlatform(platformFeeEstimateDetail, platformRecord);
                let sumBonusTopUp = rearrangeSumBonus(sumBonusDetail, platformRecord);

                return {topUpList: topUpData ? topUpData : [], bonusList: bonus, platformFeeEstimateList: platformFee, totalSumBonusTopUp: sumBonusTopUp};
            }
        );
    },

    getFinancialPointsReport: function (reqData, index, count, sortObj) {
        sortObj = sortObj || {};

        let proposalTypeArr = [];

        if (reqData.financialPointsType && reqData.financialPointsType.length) {
            for (let i = 0; i < reqData.financialPointsType.length; i++) {
                reqData.financialPointsType[i] = Number(reqData.financialPointsType[i]);

                switch (reqData.financialPointsType[i]) {
                    case constFinancialPointsType.TOPUPMANUAL:
                        proposalTypeArr.push(constProposalType.PLAYER_MANUAL_TOP_UP);
                        break;
                    case constFinancialPointsType.TOPUPONLINE:
                        proposalTypeArr.push(constProposalType.PLAYER_TOP_UP);
                        break;
                    case constFinancialPointsType.TOPUPALIPAY:
                        proposalTypeArr.push(constProposalType.PLAYER_ALIPAY_TOP_UP);
                        break;
                    case constFinancialPointsType.TOPUPWECHAT:
                        proposalTypeArr.push(constProposalType.PLAYER_WECHAT_TOP_UP);
                        break;
                    case constFinancialPointsType.PLAYER_BONUS:
                        proposalTypeArr.push(constProposalType.PLAYER_BONUS);
                        break;
                    case constFinancialPointsType.PARTNER_BONUS:
                        proposalTypeArr.push(constProposalType.PARTNER_BONUS);
                        break;
                    case constFinancialPointsType.FINANCIAL_POINTS_ADD_SYSTEM:
                        proposalTypeArr.push(constProposalType.FINANCIAL_POINTS_ADD);
                        break;
                    case constFinancialPointsType.FINANCIAL_POINTS_DEDUCT_SYSTEM:
                        proposalTypeArr.push(constProposalType.FINANCIAL_POINTS_DEDUCT);
                        break;
                }

            }
        } else {
            //return null
            let amount = 0;
            return {
                size: 0,
                data: [],
                summary: {amount: amount.toFixed(2)},
            }
        }

        let proposalTypeQ = {
            platformId: reqData.platformId
        }
        let proposalProm;

        if (proposalTypeArr.length > 1) {
            proposalTypeQ.name = {$in: proposalTypeArr};
            proposalProm = dbconfig.collection_proposalType.find(proposalTypeQ).lean();
        } else {
            proposalTypeQ.name = proposalTypeArr[0];
            proposalProm = dbconfig.collection_proposalType.findOne(proposalTypeQ).lean();
        }


        return proposalProm.then(
            proposalType => {
                let proposalQuery = {
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                    createTime: {
                        $gte: reqData.startTime,
                        $lt: reqData.endTime
                    },
                }

                if (proposalTypeArr.length > 1) {
                    if (!(proposalType && proposalType.length)) {
                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                    }
                    proposalQuery.type = {$in: proposalType.map(item=> item._id)};
                } else {
                    if (!proposalType) {
                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                    }
                    proposalQuery.type = proposalType._id
                }

                let proposalSize = dbconfig.collection_proposal.find(proposalQuery).count();
                let proposalData = dbconfig.collection_proposal.find(proposalQuery).sort(sortObj).skip(index).limit(count).populate({
                    path: "process",
                    model: dbconfig.collection_proposalProcess
                }).populate({path: "type", model: dbconfig.collection_proposalType});
                let proposalSummary = dbconfig.collection_proposal.aggregate([
                    {
                        $match: proposalQuery
                    },
                    {
                        $group: {
                            _id: null,
                            amount: {$sum: "$data.amount"},
                            updateAmount: {$sum: "$data.updateAmount"},
                            TopupAmount: {$sum: "$data.TopupAmount"},
                        }
                    }
                ]);
                return Promise.all([proposalSize, proposalData, proposalSummary]);
            }
        ).then(
            data => {
                if (!(data && data[1] && data[2])) {
                    return Promise.reject({name: "DataError", message: "Error in finding proposal"});
                }
                let totalAmount = 0;
                if (data[2].length) {
                    // different proposal different amount field name
                    if (data[2][0].hasOwnProperty("amount") && data[2][0].hasOwnProperty("updateAmount") && data[2][0].hasOwnProperty("TopupAmount")) {
                        totalAmount = data[2][0].amount + data[2][0].updateAmount + data[2][0].TopupAmount
                    }
                }
                let res = {
                    size: data[0] || 0,
                    data: data[1],
                    summary: {amount: parseFloat(totalAmount).toFixed(2)},
                }
                return res;
            }
        )
    },

    getConsumptionModeReport: function (reqData, index, count, sortObj) {
        sortObj = sortObj || {};

        let consumpQuery = {
            platformId: reqData.platformId,
            betDetails: {$exists: true},
            createTime: {
                $gte: reqData.startTime,
                $lt: reqData.endTime
            }
        }

        if (reqData.providerId) {
            consumpQuery.providerId = reqData.providerId
        }
        if (reqData.cpGameType) {
            consumpQuery.cpGameType = reqData.cpGameType
        }
        // if (reqData.betType && reqData.betType.length) {
        //     consumpQuery.$or = [{betType: {$in: reqData.betType}}, {"betDetails.separatedBetType": {$in: reqData.betType}}]
        // }

        let recordSizeQuery = JSON.parse(JSON.stringify(consumpQuery));
        recordSizeQuery["betDetails.separatedBetType"] = {$in: reqData.betType};
        let recordSizeProm = dbconfig.collection_playerConsumptionRecord.distinct("playerId", recordSizeQuery)
        let recordDataProm = dbconfig.collection_playerConsumptionRecord.aggregate([
            {$match: consumpQuery},
            {
                $project: {
                    _id: 1,
                    playerId: 1,
                    bonusAmount: 1,
                    amount: 1,
                    betDetails: 1,
                }
            },
            {
                $unwind: "$betDetails"
            },
            {$match: {
                    "betDetails.separatedBetType": {$in: reqData.betType}
                }},
            {
                $group: {
                    _id: {"_id":"$_id","playerId":"$playerId"},
                    selectedBetTypeCount: {$sum: 1},
                    selectedBetTypeAmt: {$sum: "$betDetails.separatedBetAmount"},
                    bonusAmount: {$first: "$bonusAmount"},
                }
            },
            {
                $group: {
                    _id: "$_id.playerId",
                    selectedBetTypeCount: {$sum: "$selectedBetTypeCount"},
                    selectedBetTypeAmt: {$sum: "$selectedBetTypeAmt"},
                    bonusAmount: {$sum: "$bonusAmount"},
                }
            },
            {
                $project: {
                    _id: 1,
                    selectedBetTypeCount: 1,
                    selectedBetTypeAmt: 1,
                    bonusAmount: 1,
                    betCountPercent: {$divide:["$selectedBetTypeCount","$totalBetCount"]},
                    betAmtPercent: {$divide:["$selectedBetTypeAmt","$totalBetAmt"]}
                }
            },
            { $sort : sortObj},
            {$skip: index},
            { $limit : count}
        ]).read("secondaryPreferred").then(
            consumptionData => {
                let nameProm = dbconfig.collection_players.populate(consumptionData, {
                    path: '_id',
                    model: dbconfig.collection_players,
                    select: "name"
                });

                let totalBetProms = [];

                consumptionData.map(consumption => {
                    let totalBetQuery = {$and: [{playerId: consumption._id}, consumpQuery]};

                    let totalBetProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                        {$match: totalBetQuery},
                        {
                            $group: {
                                _id: null,
                                totalBetCount: {$sum: 1},
                                totalBetAmt: {$sum: "$validAmount"}
                            }
                        }
                    ]).read("secondaryPreferred");
                    totalBetProms.push(totalBetProm);
                });

                return Promise.all([nameProm, Promise.all(totalBetProms)]);
            }
        ).then(
            ([namedConsumptionData, totalBetData]) => {
                for(let i = 0; i < namedConsumptionData.length; i++) {
                    if (!totalBetData[i] || !totalBetData[i][0]) {
                        break;
                    }

                    namedConsumptionData[i].totalBetCount = totalBetData[i][0].totalBetCount;
                    namedConsumptionData[i].totalBetAmt = totalBetData[i][0].totalBetAmt;
                }

                return namedConsumptionData;
            }
        );

        let recordSummaryPromA = dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: consumpQuery
            },
            {
                $project: {
                    _id: 1,
                    playerId: 1,
                    bonusAmount: 1,
                    amount: 1,
                    betDetails: 1,
                }
            },
            {
                $unwind: "$betDetails"
            },
            {$match: {
                    "betDetails.separatedBetType": {$in: reqData.betType}
                }},
            {
                $group: {
                    _id: {"_id":"$_id","playerId":"$playerId"},
                    selectedBetTypeCount: {$sum: 1},
                    selectedBetTypeAmt: {$sum: "$betDetails.separatedBetAmount"},
                    bonusAmount: {$first: "$bonusAmount"},
                }
            },
            {
                $group: {
                    _id: null,
                    selectedBetTypeCount: {$sum: "$selectedBetTypeCount"},
                    selectedBetTypeAmt: {$sum: "$selectedBetTypeAmt"},
                    bonusAmount: {$sum: "$bonusAmount"},
                }
            },
            {
                $project: {
                    selectedBetTypeCount: 1,
                    selectedBetTypeAmt: 1,
                    bonusAmount: 1,
                    betCountPercent: {$divide:["$selectedBetTypeCount","$totalBetCount"]},
                    betAmtPercent: {$divide:["$selectedBetTypeAmt","$totalBetAmt"]}
                }
            },
        ]).read("secondaryPreferred");

        let recordSummaryPromB = dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: consumpQuery
            },
            {
                $group: {
                    _id: null,
                    totalBetCount: {$sum: 1},
                    totalBetAmt: {$sum: "$validAmount"}
                }
            }
        ]).read("secondaryPreferred");

        let recordSummaryProm = Promise.all([recordSummaryPromA, recordSummaryPromB]).then(
            ([dataA, dataB]) => {
                if (dataA[0] && dataB[0]) {
                    dataA[0].totalBetCount = dataB[0].totalBetCount;
                    dataA[0].totalBetAmt = dataB[0].totalBetAmt;
                }

                return dataA;
            }
        );

        let recordSize, record, recordSummary;

        return Promise.all([recordSizeProm, recordDataProm, recordSummaryProm]).then(
            ([recordSizeData, recordData, recordSummaryData]) => {

                if (!recordSizeData || !recordData) {
                    return Promise.reject({name: "DataError", message: "Error in finding consumption record"});
                }

                recordSize = recordSizeData || [];
                record = recordData || [];
                recordSummary = recordSummaryData || [];

                let res = {
                    size: recordSize.length || 0,
                    data: record,
                    summary: recordSummary[0] || {}
                };
                return res;
            }
        )
    },

    /**
     * For report purpose - player reward returns by reward events such as "FirstTopUp", "PlayerConsumptionReturn"
     * @param platformId - ObjectId of the platform
     * @param proposalTypeName - rewardEvent (proposalType) which is active (enable) in the selected platform
     * @param startTime * @param endTime - duration to restrain the query result
     * @param limit - total no of result to return
     * @returns {*|promise}
     */
    getProposalsForReward: function (platformId, proposalTypeName, startTime, endTime, limit) {

        var deferred = Q.defer();
        var proposalData = null;

        dbconfig.collection_proposalType.findOne({
            $and: [{
                platformId: platformId,
                name: proposalTypeName
            }]
        }).then(function (proposalType) {
                var matchObj = {
                    createTime: {
                        $gte: startTime.toISOString(),
                        $lt: endTime.toISOString()
                    },
                    type: ObjectId(proposalType._id)
                };
                return dbconfig.collection_proposal.find({$and: [matchObj]}).exec();
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "No " + proposalTypeName + " return event found in the platform!",
                    error: error
                });
            }
        ).then(function (data) {
                proposalData = Object.assign([], data);
                if (proposalTypeName == constProposalType.PARTNER_CONSUMPTION_RETURN || proposalTypeName == constProposalType.PARTNER_INCENTIVE_REWARD
                    || proposalTypeName == constProposalType.PARTNER_REFERRAL_REWARD) {
                    var allProm = [];
                    if (data && data.length > 0) {
                        for (var i in data) {
                            if (data[i].data.partnerId) {
                                try {
                                    if (ObjectId(data[i].data.partnerId)) {
                                    }
                                    allProm.push(dbconfig.collection_partner.findOne({_id: data[i].data.partnerId}));
                                }
                                catch (err) {
                                    allProm.push(dbconfig.collection_partner.findOne({partnerId: data[i].data.partnerId}));
                                }
                            } else {
                                allProm.push({partnerId: 'NA'});
                            }
                        }
                    }
                    return Q.all(allProm);
                }
                else if (proposalTypeName == constProposalType.PLAYER_TOP_UP_RETURN || proposalTypeName == constProposalType.PLAYER_CONSUMPTION_INCENTIVE ||
                    proposalTypeName == constProposalType.FIRST_TOP_UP || proposalTypeName == constProposalType.PLAYER_CONSUMPTION_RETURN) {
                    var allProm = [];
                    if (data && data.length > 0) {
                        for (var i in data) {
                            if (data[i].data.playerId || data[i].data.playerId) {
                                try {
                                    if (ObjectId(data[i].data.playerId)) {
                                    }
                                    allProm.push(dbconfig.collection_players.findOne({_id: data[i].data.playerId}));
                                }
                                catch (err) {
                                    allProm.push(dbconfig.collection_players.findOne({playerId: data[i].data.playerId}));
                                }
                            } else {
                                allProm.push({playerId: 'NA'});
                            }
                        }
                    }
                    return Q.all(allProm);
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting proposal information.",
                    error: error
                })
            }
        ).then(
            function (data) {
                if (proposalTypeName == constProposalType.PARTNER_CONSUMPTION_RETURN) {
                    for (var i in data) {
                        proposalData[i].data.partnerShortId = data[i].partnerId;
                    }
                }
                else if (proposalTypeName == constProposalType.PARTNER_INCENTIVE_REWARD) {
                    for (var i in data) {
                        proposalData[i].data.partnerShortId = data[i].partnerId;
                    }
                }
                else if (proposalTypeName == constProposalType.PARTNER_REFERRAL_REWARD) {
                    for (var i in data) {
                        proposalData[i].data.partnerShortId = data[i].partnerId;
                    }
                }
                else if (proposalTypeName == constProposalType.PLAYER_CONSUMPTION_RETURN) {
                    for (var i in data) {
                        proposalData[i].data.playerShortId = data[i].playerId;
                    }
                }
                else if (proposalTypeName == constProposalType.FIRST_TOP_UP) {
                    for (var i in data) {
                        proposalData[i].data.playerShortId = data[i].playerId;
                    }
                }
                else if (proposalTypeName == constProposalType.PLAYER_TOP_UP_RETURN) {
                    for (var i in data) {
                        proposalData[i].data.playerShortId = data[i].playerId;
                    }
                }
                else if (proposalTypeName == constProposalType.PLAYER_CONSUMPTION_INCENTIVE) {
                    for (var i in data) {
                        proposalData[i].data.playerShortId = data[i].playerId;
                    }
                }
                return proposalData;
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting player/partner information.",
                    error: error
                })
            }
        ).then(
            function (proposalData) {

                var rewardProposalArray = [];
                var rewardReturn;
                for (var i = 0; i < proposalData.length; i++) {
                    rewardReturn = {
                        playerId: proposalData[i].data.playerShortId,
                        returnAmount: (proposalData[i].data.returnAmount) ? proposalData[i].data.returnAmount : proposalData[i].data.rewardAmount,
                        createTime: proposalData[i].createTime,
                        partnerId: proposalData[i].data.partnerShortId,
                        partnerShortId: proposalData[i].data.partnerShortId,
                    }
                    rewardProposalArray.push(rewardReturn);
                }
                deferred.resolve(rewardProposalArray);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting player/partner ID information.",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    getRewardProposalReport: function (platformId, startTime, endTime, status, playerName, dayCountAfterRedeemPromo) {
        let proposalTypeData = null;
        let proposalRewardData = null;
        let latestRewardData = null;
        let countRewardAppliedData = null;
        let totalBonusRecord = [];
        let totalTopupRecord = [];
        let totalPlayer = 0;
        let result = {};
        let matchObj = {};
        let proposalQuery = {
            $and: [{
                platformId: platformId,
            }]
        };

        return dbconfig.collection_proposalType.find(proposalQuery).lean().then(proposalType => {
            if (proposalType) {
                proposalTypeData = proposalType;
            }

            matchObj = {
                createTime: {
                    $gte: new Date(startTime),
                    $lt: new Date(endTime)
                },
                mainType: constProposalMainType['PlayerConsumptionReturn'],
                "data.platformId": platformId
            };

            if (status && status != 'all') {
                if (status == constProposalStatus.SUCCESS) {
                    matchObj.status = {
                        $in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]
                    };
                }
                else if (status == constProposalStatus.FAIL) {
                    matchObj.status = {
                        $in: [constProposalStatus.FAIL, constProposalStatus.REJECTED]
                    };
                }
                else {
                    matchObj.status = status;
                }
            }

            if (playerName) {
                matchObj["data.playerName"] = playerName;
            }

            let rewardProposalProm = dbconfig.collection_proposal.aggregate([
                { $match: {$and: [matchObj]}},
                {
                    $group: {
                        _id: {"type": "$type", "eventName": "$data.eventName", "playerObjId": "$data.playerObjId", "playerName": "$data.playerName"},
                        sumReturnAmount: {$sum: "$data.returnAmount"},
                        sumRewardAmount: {$sum: "$data.rewardAmount"},
                        sumAmount: {$sum: "$data.amount"},
                        sumApplyAmount: {$sum: "$data.applyAmount"}
                    }
                },
                {
                    $group: {
                        _id: {"type": "$_id.type", "eventName": "$_id.eventName"},
                        playerObjId: {$addToSet: "$_id.playerObjId"},
                        playerName: {$addToSet: "$_id.playerName"},
                        sumTotalReturnAmount: {$sum: "$sumReturnAmount"},
                        sumTotalRewardAmount: {$sum: "$sumRewardAmount"},
                        sumTotalAmount: {$sum: "$sumAmount"},
                        sumTotalApplyAmount: {$sum: "$sumApplyAmount"}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        eventName: "$_id.eventName",
                        type: "$_id.type",
                        playerObjId: 1,
                        playerName: 1,
                        sumTotalReturnAmount: 1,
                        sumTotalRewardAmount: 1,
                        sumTotalAmount: 1,
                        sumTotalApplyAmount: 1,
                        countPlayerApplied: {$size: "$playerName"}
                    }
                }
            ]).read("secondaryPreferred");

            let latestRewardProm = dbconfig.collection_proposal.aggregate([
                { $match: {$and: [matchObj]}},
                {
                    $sort: {"type": 1, "data.eventName": 1, "data.playerObjId": 1, "data.playerName": 1, createTime: 1}
                },
                {
                    $group: {
                        _id: {"type": "$type", "eventName": "$data.eventName", "playerObjId": "$data.playerObjId", "playerName": "$data.playerName"},
                        lastRewardTime: {$last: "$createTime"}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        eventName: "$_id.eventName",
                        type: "$_id.type",
                        playerObjId: "$_id.playerObjId",
                        playerName: "$_id.playerName",
                        lastRewardTime: 1
                    }
                }
            ]).read("secondaryPreferred");

            let countRewardAppliedProm = dbconfig.collection_proposal.aggregate([
                { $match: {$and: [matchObj]}},
                {
                    $group: {
                        _id: {type: "$type", eventName: "$data.eventName"},
                        countRewardApplied: {$sum: 1}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        eventName: "$_id.eventName",
                        type: "$_id.type",
                        countRewardApplied: 1
                    }
                }
            ]).read("secondaryPreferred");

            let countTotalPlayerProm = dbconfig.collection_proposal.aggregate([
                { $match: {$and: [matchObj]}},
                {
                    $group: {
                        _id: "$data.playerName"
                    }
                },
                {
                    $group: {
                        _id: 0,
                        count: {$sum: 1}
                    }
                }
            ]).read("secondaryPreferred");

            return Promise.all([rewardProposalProm, latestRewardProm, countRewardAppliedProm, countTotalPlayerProm])

        }).then(data => {
            let promArr = []
            proposalRewardData = data && data[0] ? data[0] : null;
            latestRewardData = data && data[1] ? data[1] : null;
            countRewardAppliedData = data && data[2] ? data[2] : null;
            totalPlayer = data && data[3] && data[3] && data[3][0] && data[3][0] && data[3][0].count ? data[3][0].count : 0;

            if (dayCountAfterRedeemPromo && dayCountAfterRedeemPromo > 0) {
                promArr = getTopupProposalData(latestRewardData, dayCountAfterRedeemPromo, platformId)
            } else {
                promArr = getTopupProposalData(proposalRewardData, dayCountAfterRedeemPromo, platformId, startTime, endTime)
            }

            return Promise.all(promArr);

        }).then(totalTopupData => {
            let promArr = [];

            totalTopupRecord = filterTopupData(totalTopupData, dayCountAfterRedeemPromo);

            if (dayCountAfterRedeemPromo && dayCountAfterRedeemPromo > 0) {
                promArr = getBonusProposalData(latestRewardData, dayCountAfterRedeemPromo, platformId)
            } else {
                promArr = getBonusProposalData(proposalRewardData, dayCountAfterRedeemPromo, platformId, startTime, endTime)
            }

            return Promise.all(promArr);

        }).then(totalBonusData => {

            totalBonusRecord = filterBonusData(totalBonusData, dayCountAfterRedeemPromo);

            if (proposalRewardData && proposalRewardData.length) {
                proposalRewardData.forEach(reward => {
                    reward.sumTotalBonusAmount = 0;
                    reward.sumTotalTopupAmount = 0;
                    reward.countRewardApplied = 0;

                    if (reward && reward.type && reward.eventName) {
                        if (totalBonusRecord && totalBonusRecord.length) {
                            let idx = totalBonusRecord.findIndex(x => x.type && x.eventName && (x.type.toString() == reward.type.toString() && x.eventName.toString() == reward.eventName.toString()));
                            if (idx > -1) {
                                reward.sumTotalBonusAmount = dbutility.noRoundTwoDecimalPlaces(totalBonusRecord[idx].sumTotalBonusAmount);
                            }
                        }

                        if (totalTopupRecord && totalTopupRecord.length) {
                            let idx = totalTopupRecord.findIndex(x => x.type && x.eventName && (x.type.toString() == reward.type.toString() && x.eventName.toString() == reward.eventName.toString()));
                            if (idx > -1) {
                                reward.sumTotalTopupAmount = dbutility.noRoundTwoDecimalPlaces(totalTopupRecord[idx].sumTotalTopupAmount);
                            }
                        }

                        if (countRewardAppliedData && countRewardAppliedData.length) {
                            let idx = countRewardAppliedData.findIndex(x => x.type && x.eventName && (x.type.toString() == reward.type.toString() && x.eventName.toString() == reward.eventName.toString()));
                            if (idx > -1) {
                                reward.countRewardApplied = countRewardAppliedData[idx].countRewardApplied;
                            }
                        }
                    } else if (reward && reward.type && !reward.eventName) {
                        if (totalBonusRecord && totalBonusRecord.length) {
                            let idx = totalBonusRecord.findIndex(x => x.type && !x.eventName && (x.type.toString() == reward.type.toString()));
                            if (idx > -1) {
                                reward.sumTotalBonusAmount = dbutility.noRoundTwoDecimalPlaces(totalBonusRecord[idx].sumTotalBonusAmount);
                            }
                        }

                        if (totalTopupRecord && totalTopupRecord.length) {
                            let idx = totalTopupRecord.findIndex(x => x.type && !x.eventName && (x.type.toString() == reward.type.toString()));
                            if (idx > -1) {
                                reward.sumTotalTopupAmount = dbutility.noRoundTwoDecimalPlaces(totalTopupRecord[idx].sumTotalTopupAmount);
                            }
                        }

                        if (countRewardAppliedData && countRewardAppliedData.length) {
                            let idx = countRewardAppliedData.findIndex(x => x.type && !x.eventName && (x.type.toString() == reward.type.toString()));
                            if (idx > -1) {
                                reward.countRewardApplied = countRewardAppliedData[idx].countRewardApplied;
                            }
                        }
                    }

                    reward.sumPlayerProfit = reward.sumTotalTopupAmount - reward.sumTotalBonusAmount;

                    if (reward.type && proposalTypeData && proposalTypeData.length) {
                        let idx = proposalTypeData.findIndex(x => x._id && (x._id.toString() == reward.type.toString()));
                        if (idx > -1) {
                            reward.name = proposalTypeData[idx].name;
                        }
                    }
                })
            }

            result = {data: proposalRewardData, totalPlayer: totalPlayer}

            return result;
        })
    },

    getRewardProposalReportByType: function (platformId, proposalTypeName, code, startTime, endTime, index, limit, sortCol) {
        var deferred = Q.defer();
        var proposalData = null;
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        var sortKey = {};
        if (sortCol) {
            var key = Object.keys(sortCol)[0];
            var val = sortCol[key];
            switch (key) {
                case 'playerId':
                    sortKey = {"data.playerId": val};
                    break;
                case 'playerName':
                    sortKey = {"data.playerName": val};
                    break;
                case 'rewardType':
                    sortKey = {"type": val};
                    break;
                case 'createTime':
                    sortKey = {"createTime": val};
                    break;
                case 'amount':
                    sortKey = {"data.rewardAmount": val, "data.returnAmount": val,};
                    break;
                default:
                    sortKey = {}
            }
        }
        var matchObj = {};
        var proposalQuery = proposalTypeName ? {
            $and: [{
                platformId: platformId,
                name: proposalTypeName
            }]
        } : {
            $and: [{
                platformId: platformId,
            }]
        };
        dbconfig.collection_proposalType.findOne(proposalQuery).then(
            function (proposalType) {
                matchObj = proposalTypeName ? {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    type: ObjectId.isValid(proposalType._id) ? proposalType._id : ObjectId(proposalType._id),
                    "data.eventCode": code,
                    "data.platformId": platformId
                } : {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    mainType: constProposalMainType['PlayerConsumptionReturn'],
                    "data.platformId": platformId
                };
                var a = dbconfig.collection_proposal.find({$and: [matchObj]})
                    .sort(sortKey).skip(index).limit(limit)
                    .populate({path: "data.playerObjId", model: dbconfig.collection_players})
                    .populate({path: "data.partnerId", model: dbconfig.collection_partner})
                    .populate({path: "type", model: dbconfig.collection_proposalType})
                    .lean();
                var b = dbconfig.collection_proposal.find({$and: [matchObj]}).count();
                var c = dbconfig.collection_proposal.aggregate([
                    {$match: {$and: [matchObj]}},
                    {
                        $group: {
                            _id: null,
                            sum1: {$sum: "$data.returnAmount"},
                            sum2: {$sum: "$data.rewardAmount"},
                            sum3: {$sum: "$data.amount"}, // may be there is a better variable for it
                            sumApplyAmount: {$sum: "$data.applyAmount"}
                        }
                    }
                ]);
                return Q.all([a, b, c]);
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "No " + proposalTypeName + " return event found in the platform!",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data[1]) {
                    var obj = {data: data[0], size: data[1]};
                    var temp = data[2] ? data[2][0] : {sum1: 0, sum2: 0, sum3: 0, sumApplyAmount: 0};
                    obj.summary = {
                        amount: parseFloat(temp.sum1 + temp.sum2 + temp.sum3).toFixed(2),
                        // applyAmount: parseFloat(temp.sumApplyAmount).toFixed(2)
                        applyAmount: parseFloat(temp.sum2).toFixed(2) // the one that use for 'total' on the page
                    };
                    deferred.resolve(obj);
                } else {
                    deferred.resolve({data: [], size: 0, summary: {}})
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting player/partner ID information.",
                    error: error
                });
            }
        ).catch(err => {
            console.log('err', err);
        });
        return deferred.promise;
    },

    createPlayerBonusDoubledRewardGroupProposal: function (transferOutRecord, selectedRewardParam, playerData, eventData, playerBonusDoubledRecord, lastConsumptionRecord, intervalTime, consumptionRecordList, winLoseAmount) {
        let rewardAmount = 0;
        let spendingAmount = 0;

        if (selectedRewardParam.hasOwnProperty('rewardPercentage')){
            rewardAmount = playerBonusDoubledRecord.transferInAmount * selectedRewardParam.rewardPercentage;
            spendingAmount = rewardAmount * selectedRewardParam.spendingTimes;
        }
        else {
            rewardAmount = selectedRewardParam.rewardAmount;
            spendingAmount = rewardAmount * selectedRewardParam.spendingTimes;
        }

        if (!selectedRewardParam || !playerBonusDoubledRecord || !winLoseAmount) {
            // end this activity without giving reward bonus
            console.log("applyRewarEvent - Ended the activity without giving reward bonus", [playerData.playerId, eventData.type.name]);
            // update the playerBonusDoubledRewardGroupRecord
            let query = {
                platformObjId: playerData.platform._id,
                playerObjId: playerData._id,
                rewardEventObjId: eventData._id,
                lastApplyDate: {$gte: intervalTime.startTime, $lte: intervalTime.endTime}
            };
            let updateObj = {
                isApplying: false,
                gameProviderObjId: null,
                gameProviderId: null,
            };

            return dbconfig.collection_playerBonusDoubledRewardGroupRecord.findOneAndUpdate(query, updateObj).lean();
        }

        // create reward proposal
        let proposalData = {
            type: eventData.executeProposal,
            creator: {
                type: 'player',
                name: playerData.name,
                id: playerData._id
            },
            data: {
                playerObjId: playerData._id,
                playerId: playerData.playerId,
                playerName: playerData.name,
                realName: playerData.realName,
                platformObjId: playerData.platform._id,
                rewardAmount: rewardAmount,
                spendingAmount: spendingAmount,
                eventId: eventData._id,
                eventName: eventData.name,
                eventCode: eventData.code,
                eventDescription: eventData.description,
                isIgnoreAudit: eventData.condition && (typeof(eventData.condition.isIgnoreAudit) === "boolean" && eventData.condition.isIgnoreAudit === true) || (Number.isInteger(eventData.condition.isIgnoreAudit) && eventData.condition.isIgnoreAudit >= rewardAmount),
                forbidWithdrawAfterApply: Boolean(selectedRewardParam.forbidWithdrawAfterApply && selectedRewardParam.forbidWithdrawAfterApply === true),
                remark: selectedRewardParam.remark,
                useConsumption: Boolean(!eventData.condition.isSharedWithXIMA),
                providerGroup: eventData.condition.providerGroup,
                // Use this flag for auto apply reward
                isGroupReward: true,
                // If player credit is more than this number after unlock reward group, will ban bonus
                forbidWithdrawIfBalanceAfterUnlock: selectedRewardParam.forbidWithdrawIfBalanceAfterUnlock ? selectedRewardParam.forbidWithdrawIfBalanceAfterUnlock : 0,
                isDynamicRewardAmount: false,
            },
            entryType: constProposalEntryType.CLIENT,
            userType: constProposalUserType.PLAYERS
        };

        // proposalData.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);
        proposalData.data.rewardStartTime = eventData.condition.validStartTime;
        proposalData.data.rewardEndTime = eventData.condition.validEndTime;
        proposalData.data.rewardInterval = eventData.condition.interval;
        proposalData.data.timesHasApplied = playerBonusDoubledRecord.applyTimes;
        proposalData.data.quantityLimitInInterval = eventData.condition.quantityLimitInInterval;
        proposalData.data.gameProviderInEvent = playerBonusDoubledRecord.gameProviderObjId;
        proposalData.data.transferInAmount = playerBonusDoubledRecord.transferInAmount;
        proposalData.data.transferInId = playerBonusDoubledRecord.transferInId || "";
        proposalData.data.transferOutAmount = transferOutRecord && transferOutRecord.amount ? transferOutRecord.amount : 0;
        proposalData.data.transferOutId = transferOutRecord && transferOutRecord.transferId ? transferOutRecord.transferId : "";
        proposalData.data.winLoseAmount = winLoseAmount;
        proposalData.data.countWinLoseStartTime = playerBonusDoubledRecord.transferInTime;
        proposalData.data.countWinLoseEndTime = playerBonusDoubledRecord.transferOutTime;
        proposalData.data.lastLoginIp = playerData.lastLoginIp;
        proposalData.data.phoneNumber = playerData.phoneNumber;

        if (playerData.deviceId) {
            proposalData.data.deviceId = playerData.deviceId;
        }

        if (lastConsumptionRecord && Object.keys(lastConsumptionRecord).length > 0) {
            proposalData.data.betTime = lastConsumptionRecord.createTime || null;
            proposalData.data.betAmount = lastConsumptionRecord.validAmount || null;
            proposalData.data.winAmount = lastConsumptionRecord.bonusAmount || null;
            proposalData.data.winTimes = lastConsumptionRecord.winRatio || null;
        }

        if (selectedRewardParam && selectedRewardParam.maxRewardAmountInSingleReward) {
            proposalData.data.maxReward = selectedRewardParam.maxRewardAmountInSingleReward;
        }

        if (selectedRewardParam && selectedRewardParam.rewardPercentage) {
            proposalData.data.rewardPercent = selectedRewardParam.rewardPercentage*100;
        }

        return proposal.createProposalWithTypeId(eventData.executeProposal, proposalData).then(
            proposalData => {
                let postPropPromArr = [];
                // update the playerBonusDoubledRewardGroupRecord
                let query = {
                    platformObjId: playerData.platform._id,
                    playerObjId: playerData._id,
                    rewardEventObjId: eventData._id,
                    lastApplyDate: {$gte: intervalTime.startTime, $lte: intervalTime.endTime}
                };
                let updateObj = {
                    isApplying: false,
                    gameProviderObjId: null,
                    gameProviderId: null,
                };

                postPropPromArr.push(dbconfig.collection_playerBonusDoubledRewardGroupRecord.findOneAndUpdate(query, updateObj).lean());

                if (proposalData && proposalData._id) {
                    if (consumptionRecordList && consumptionRecordList.length > 0) {
                        postPropPromArr.push(dbconfig.collection_playerConsumptionRecord.update(
                            {_id: {$in: consumptionRecordList}},
                            {
                                bDirty: true,
                            },
                            {multi: true}
                        ));
                    }

                    return Promise.all(postPropPromArr).then(() => {
                        return {
                            rewardAmount: rewardAmount
                        }
                    });
                }
                else {
                    return proposalData;
                }
            }
        );
    },

    getGameDetailByProvider: function(platformId, startTime, endTime, providerId, playerId){

        return dbconfig.collection_playerConsumptionRecord.aggregate([
            {
                $match: {
                    providerId: providerId,
                    playerId: playerId,
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    }
                }
            }, {
                $group: {
                    _id: "$gameId",
                    totalCount: {$sum: 1},
                    totalBonusAmount: {$sum: "$bonusAmount"},
                    totalValidAmount: {$sum: "$validAmount"},
                    totalAmount: {$sum: "$amount"},

                }
            }
        ]).read("secondaryPreferred").then( retData => {

            if (retData && retData.length > 0){
                // find the game name
                let gameIdArr = retData.map(p => {return ObjectId(p._id)});

                console.log("checking----yH-gameProvider", retData)
                console.log("checking----yH-gameIdArr", gameIdArr)
                return dbconfig.collection_game.find({_id: {$in: gameIdArr}},{name: 1}).then(
                    games => {

                        retData.forEach(inData => {
                            let index = games && games.length > 0 ? games.findIndex( p => p._id.toString() == inData._id.toString()) : -1;
                            if (index != -1){
                                inData.gameName = games[index].name;
                            }

                            inData.profitMargin = -(inData.totalBonusAmount/inData.totalValidAmount)*100;

                        });

                        return retData
                    }
                )
            }
            else{
                return Promise.reject({name: "DataError", message: "Cannot find players' consumption record"});
            }
        })
    },

    getRewardProposalByType: function (data, platformId, proposalTypeName, code, startTime, endTime, index, limit, sortCol) {
        // var deferred = Q.defer();
        var proposalData = null;
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {totalCount: -1};

        var matchObj = {};
        let searchQuery;
        let totalPlayerCount = 0;
        let bonusResult = [];
        let depositResult = [];
        let consumptionResult = [];
        let playerResult = [];
        let playerInfoResult = [];

        var proposalQuery = proposalTypeName ? {
            $and: [{
                platformId: platformId,
                name: proposalTypeName
            }]
        } : {
            $and: [{
                platformId: platformId,
            }]
        };

        return dbconfig.collection_proposalType.findOne(proposalQuery).then(
            function (proposalType) {

                matchObj = proposalTypeName ? {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    type: ObjectId.isValid(proposalType._id) ? proposalType._id : ObjectId(proposalType._id),
                    "data.eventCode": code,
                    "data.platformId": platformId
                } : {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    mainType: constProposalMainType['PlayerConsumptionReturn'],
                    "data.platformId": platformId
                };

                searchQuery = Object.assign({}, matchObj);

                if (data.playerName){
                    matchObj["data.playerName"] = data.playerName;
                }

                return dbconfig.collection_proposal.distinct('data.playerObjId', matchObj).then(
                    player => {

                        if (player && player.length > 0){

                            matchObj["data.playerObjId"] = {$in: player.map(p => ObjectId(p))};
                            totalPlayerCount = player.length;
                        }
                        else {
                            return [];
                        }

                        return dbconfig.collection_proposal.aggregate([
                            {
                                $match: matchObj
                            }, {
                                $group: {
                                    _id: "$data.playerObjId",
                                    totalCount: {$sum: 1},
                                    totalRewardAmount: {$sum: "$data.rewardAmount"},
                                }
                            }
                            ,{
                                $sort: sortCol
                            },{
                                $skip: index
                            },{
                                $limit: limit
                            }
                        ]).read("secondaryPreferred").then( playerRecord => {
                            if (playerRecord && playerRecord.length > 0){

                                playerResult = playerRecord;

                                let playerObjIdArr = playerRecord.map(p => { return p._id = ObjectId(p._id) });

                                let depositProm = [];
                                let bonusProm = [];
                                let consumptionProm;
                                let playerInfoProm;

                                consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                                    {
                                        $match: {
                                            playerId: {$in: playerObjIdArr},
                                            createTime: {
                                                $gte: new Date(startTime),
                                                $lt: new Date(endTime)
                                            },
                                            $or: [
                                                {isDuplicate: {$exists: false}},
                                                {
                                                    $and: [
                                                        {isDuplicate: {$exists: true}},
                                                        {isDuplicate: false}
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: "$playerId",
                                            providerId: {$addToSet: "$providerId"},
                                            winLostAmount: {$sum: "$bonusAmount"}
                                        }
                                    }
                                ]).allowDiskUse(true).read("secondaryPreferred");

                                playerInfoProm = dbconfig.collection_players.find({_id: {$in: playerObjIdArr}},{registrationTime: 1, name: 1}).lean();

                                if (data.dayAfterReceiving){
                                    return dbconfig.collection_proposal.aggregate([
                                        {
                                            $match: matchObj
                                        },
                                        {
                                            $sort: {createTime: -1}
                                        },
                                        {
                                            $group: {
                                                _id: "$data.playerObjId",
                                                lastRewardCreateTime: {$first: "$createTime"}

                                            }
                                        }
                                    ]).read("secondaryPreferred").then( lastRewardTime => {

                                        if (lastRewardTime && lastRewardTime.length > 0) {

                                            return dbconfig.collection_proposalType.findOne({
                                                platformId: platformId,
                                                name: constProposalType.PLAYER_BONUS
                                            }).then(
                                                proposalType => {
                                                    if (proposalType) {
                                                        lastRewardTime.forEach(t => {

                                                            if (t && t._id && t.lastRewardCreateTime) {

                                                                bonusProm.push(dbconfig.collection_proposal.aggregate([
                                                                    {
                                                                        $match: {
                                                                            type: proposalType._id,
                                                                            'data.playerObjId': t._id,
                                                                            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                                                            createTime: {
                                                                                $gte: new Date(t.lastRewardCreateTime),
                                                                                $lt: new Date(t.lastRewardCreateTime.getTime() + data.dayAfterReceiving * 24 * 60 * 60 * 1000)
                                                                            }
                                                                        }
                                                                    }, {
                                                                        $group: {
                                                                            _id: "$data.playerObjId",

                                                                            totalBonusAmount: {$sum: "$data.amount"},

                                                                        }
                                                                    }
                                                                ]).read("secondaryPreferred"));

                                                                depositProm.push(dbconfig.collection_playerTopUpRecord.aggregate([
                                                                    {
                                                                        $match: {
                                                                            playerId: t._id,
                                                                            createTime: {
                                                                                $gte: new Date(t.lastRewardCreateTime),
                                                                                $lt: new Date(t.lastRewardCreateTime.getTime() + data.dayAfterReceiving * 24 * 60 * 60 * 1000)
                                                                            }
                                                                        }
                                                                    }, {
                                                                        $group: {
                                                                            _id: "$playerId",
                                                                            totalDepositAmount: {$sum: "$amount"},
                                                                        }
                                                                    }
                                                                ]).read("secondaryPreferred"))

                                                            }
                                                        })

                                                    }
                                                    return Promise.all([Promise.all(bonusProm), Promise.all(depositProm),consumptionProm, playerInfoProm]);
                                                })
                                        }
                                    })

                                }
                                else{
                                    // get the withdrawal amount
                                    bonusProm = dbconfig.collection_proposalType.findOne({platformId: platformId, name: constProposalType.PLAYER_BONUS}).then(
                                        proposalType => {
                                            if (proposalType){
                                                return dbconfig.collection_proposal.aggregate([
                                                    {
                                                        $match: {
                                                            type: proposalType._id,
                                                            'data.playerObjId': {$in: playerObjIdArr},
                                                            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                                            createTime: {
                                                                $gte: new Date(startTime),
                                                                $lt: new Date(endTime)
                                                            }
                                                        }
                                                    }, {
                                                        $group: {
                                                            _id: "$data.playerObjId",

                                                            totalBonusAmount: {$sum: "$data.amount"},

                                                        }
                                                    }
                                                ]).read("secondaryPreferred");

                                            }
                                        });

                                    // get the deposit amount
                                    depositProm = dbconfig.collection_playerTopUpRecord.aggregate([
                                        {
                                            $match: {
                                                playerId: {$in: playerObjIdArr},
                                                createTime: {
                                                    $gte: new Date(startTime),
                                                    $lt: new Date(endTime)
                                                }
                                            }
                                        }, {
                                            $group: {
                                                _id: "$playerId",
                                                totalDepositAmount: {$sum: "$amount"},
                                            }
                                        }
                                    ]).read("secondaryPreferred");

                                    return Promise.all([bonusProm, depositProm, consumptionProm, playerInfoProm]);
                                }
                            }
                        }).then( retResult => {

                            if(retResult && retResult.length == 4){

                                consumptionResult = retResult[2];
                                playerInfoResult = retResult[3];

                                if (data.dayAfterReceiving){

                                    if (retResult[0] && retResult[0].length > 0) {
                                        retResult[0].forEach(inData => {
                                            if (inData && inData.length > 0){
                                                bonusResult.push(inData[0])
                                            }
                                        })
                                    }

                                    if (retResult[1] && retResult[1].length > 0) {
                                        retResult[1].forEach(inData => {
                                            if (inData && inData.length > 0){
                                                depositResult.push(inData[0])
                                            }
                                        })
                                    }
                                }
                                else{
                                    bonusResult = retResult[0];
                                    depositResult = retResult[1];
                                }

                                if (playerResult && playerResult.length > 0){
                                    playerResult.forEach( player => {
                                        if (bonusResult && bonusResult.length > 0){
                                            let index = bonusResult.findIndex( a => a._id.toString() == player._id.toString());
                                            if (index != -1){
                                                player.totalBonusAmount = bonusResult[index].totalBonusAmount;
                                            }
                                            else{
                                                player.totalBonusAmount = 0;
                                            }
                                        }

                                        if (depositResult && depositResult.length > 0){
                                            let index = depositResult.findIndex( a => a._id.toString() == player._id.toString());
                                            if (index != -1){
                                                player.totalDepositAmount = depositResult[index].totalDepositAmount;
                                            }
                                            else{
                                                player.totalDepositAmount = 0;
                                            }
                                        }

                                        if (consumptionResult && consumptionResult.length > 0){
                                            let index = consumptionResult.findIndex( a => a._id.toString() == player._id.toString());
                                            if (index != -1){
                                                player.winLostAmount = consumptionResult[index].winLostAmount;
                                                player.providerId = consumptionResult[index].providerId;
                                            }
                                            else{
                                                player.winLostAmount = 0;
                                                player.providerId = [];
                                            }
                                        }

                                        if (playerInfoResult && playerInfoResult.length > 0){
                                            let index = playerInfoResult.findIndex( a => a._id.toString() == player._id.toString());
                                            if (index != -1){
                                                player.name = playerInfoResult[index].name;
                                                player.registrationTime = playerInfoResult[index].registrationTime;
                                            }
                                        }
                                    })

                                }

                                return {data: playerResult, size: totalPlayerCount};
                            }
                            else{
                                Promise.reject({
                                    name: "DBError",
                                    message: "No return event found in the platform!",
                                });
                            }
                        })
                    }
                );
            },
            function (error) {
                Promise.reject({
                    name: "DBError",
                    message: "No return event found in the platform!",
                    error: error
                });
            }
        ).catch(err => {
            console.log('err', err);
        });

    },

    getRewardTypeProposals: function (platformId, proposalTypeName, startTime, endTime, limit) {

        return dbconfig.collection_proposalType.findOne({
            $and: [{
                platformId: platformId,
                name: proposalTypeName
            }]
        }).then(
            function (proposalType) {
                var matchObj = {
                    createTime: {
                        $gte: startTime,
                        $lt: endTime
                    },
                    type: ObjectId(proposalType._id)
                };
                return dbconfig.collection_proposal.find({$and: [matchObj]}).limit(limit).populate({
                    path: "data.playerId",
                    model: dbconfig.collection_players
                });
            }, function (err) {
                return Q.reject({name: 'DBError', message: 'Error in finding proposal data.', error: err})
            }
        );

    },

    getPlatformRewardProposal: function (platform) {
        return dbconfig.collection_proposalType.find(
            {
                platformId: platform,
            }
        ).lean().then(
            proposalTypes => {
                let result = {};
                if (!proposalTypes) {
                    return [];
                }

                let rewardProposalTypes = proposalTypes.filter(type => constProposalMainType[type.name] === constProposalMainType.FirstTopUp); // main type is reward
                rewardProposalTypes.map(type => {
                    result[type._id] = type.name;
                });

                return result;
            }
        );
    },

    getAllRewardProposal: function (platform) {
        var proposalTypeArr = [];
        return dbconfig.collection_proposalType.find(
            {
                platformId: platform,
            }
        ).then(
            data => {
                proposalTypeArr = data.map(type => {
                    return type._id;
                });
                return dbconfig.collection_proposal.find({
                    mainType: constProposalMainType['PlayerBonus'],
                    type: {$in: proposalTypeArr},
                    status: {$in: [constProposalStatus.PENDING, constProposalStatus.PREPENDING]}
                });
            }
        )
    },

    queryRewardProposal: function (player, proposalType, startTime, endTime, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1}
        var query = {
            mainType: constProposalMainType['FirstTopUp'],
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            },
            $or: [
                {"creator.id": player},
                {"data.playerId": player},
                {"data.playerObjId": player},
                {"data.playerShorId": player}
            ]
        };
        if (proposalType) {
            query.type = proposalType;
        }
        var a = dbconfig.collection_proposal.find(query).count();
        var b = dbconfig.collection_proposal.find(query).sort(sortCol).skip(index).limit(limit)
            .populate({path: 'process', model: dbconfig.collection_proposalProcess});
        return Q.all([a, b]).then(data => {
            return {total: data[0], data: data[1]}
        })
    },
    queryBonusProposal: function (player, startTime, endTime, status, index, limit, sortCol) {
        index = index || 0;
        var count = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {createTime: -1}
        var query = {
            mainType: constProposalMainType['PlayerBonus'],
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            },
            $or: [
                {"creator.id": player},
                {"data.playerId": player},
                {"data.playerObjId": player}
            ]
        };

        if (status) {
            if (status === 'Fail_or_Rejected') {
                query.status = {$in: ['Fail', 'Rejected']};
            } else {
                query.status = status;
            }
        }

        let a = dbconfig.collection_proposal.find(query).count();
        let b = dbconfig.collection_proposal.find(query).sort(sortCol).skip(index).limit(count)
            .populate({path: 'process', model: dbconfig.collection_proposalProcess});
        let c = dbconfig.collection_proposal.find(query).then(data => {
            let sum = 0;
            data.forEach(item => {
                let amt = (item && item.data && item.data.amount) ? item.data.amount : 0;
                sum += amt;
            })
            return {sumAmt: sum};
        });
        return Q.all([a, b, c]).then(data => {
            return {total: data[0], data: data[1], summary: data[2]}
        })
    },

    getTopupProposals: function (queryId, startTime, endTime, platformCode, skip, pageSize) {
        var platforms = null;
        if (platformCode) {
            platforms = dbconfig.collection_platform.find({code: platformCode});
        } else {
            platforms = dbconfig.collection_platform.find();
        }
        return platforms.then(
            data => {
                if (data && data.length > 0) {
                    var platformIDArr = [];
                    data.forEach(a => {
                        platformIDArr.push(a._id);
                    });
                    // console.log('platformIDArr', platformIDArr);
                    return platformIDArr;
                }
                else {
                    return Q.reject({name: 'DataError', message: 'Can not find platform'});
                }
            }
        ).then(
            //get top up proposal types
            platforms => dbconfig.collection_proposalType.find(
                {
                    platformId: {$in: platforms},
                    name: {$in: [constProposalType.PLAYER_TOP_UP, constProposalType.PLAYER_MANUAL_TOP_UP]}
                }
            )
        ).then(
            types => {
                var queryObj = {
                    createTime: {
                        $gte: startTime,
                        $lt: endTime
                    },
                    type: {$in: types}
                };
                return dbconfig.collection_proposal.find(queryObj).skip(skip).limit(pageSize);
            }
        ).then(
            records => {
                return {
                    queryId: queryId,
                    records: records
                };
            }
        );
    },

    checkManualTopUpExpiration: function () {
        let startTime = new Date (new Date().getTime() - 12*60*60*1000);
        return dbconfig.collection_proposal.update(
            {
                status: constProposalStatus.PENDING,
                "data.validTime": {$lt: new Date(), $gt: startTime}
            },
            {
                status: constProposalStatus.EXPIRED
            },
            {multi: true}
        );
    },

    checkLimitedOfferTopUpExpiration: function () {
        return dbconfig.collection_proposal.find({
            status: constProposalStatus.PENDING,
            mainType: {$in: [constProposalMainType.PlayerWechatTopUp, constProposalMainType.ManualPlayerTopUp, constProposalMainType.PlayerAlipayTopUp]},
            "data.expirationTime": {$lt: new Date()},
            "data.limitedOfferObjId": {$exists: true}
        })
            .populate({path: "process", model: dbconfig.collection_proposalProcess})
            .populate({path: "type", model: dbconfig.collection_proposalType}).lean()
            .then(
                proposalData => {
                    if (proposalData && proposalData.length > 0) {
                        let proms = [];
                        proposalData.forEach(proposal => {
                           proms.push(this.autoCancelProposal(proposal));
                        });
                        return Promise.all(proms).catch(errorUtils.reportError);
                    }

                }
            )

    },

    checkProposalExpiration: function () {
        return dbconfig.collection_proposalType.find({
            name: constProposalType.BULK_EXPORT_PLAYERS_DATA
        }).lean().then(
            proposalTypeData => {
                let query = {};
                if (proposalTypeData && proposalTypeData.length) {
                    let proposalList = [];
                    for (let i = 0; i < proposalTypeData.length; i++) {
                        proposalList.push(ObjectId(proposalTypeData[i]._id));
                    }
                    query = {
                        expirationTime: {$lt: new Date()},
                        type: {$in: proposalList},
                        status: constProposalStatus.APPROVED
                    }

                    return dbconfig.collection_proposal.update(
                        query,
                        {
                            status: constProposalStatus.EXPIRED
                        },
                        {multi: true}
                    );
                }
            }
        );
    },

    getPlayerPendingPaymentProposal: function (playerObjId, platformObjId) {
        return dbconfig.collection_proposalType.find(
            {
                platformId: platformObjId,
                name: {$in: [constProposalType.PLAYER_TOP_UP]} // removed constProposalType.PLAYER_MANUAL_TOP_UP
            }
        ).lean().then(
            types => {
                var queryObj = {
                    "data.playerObjId": playerObjId,
                    type: {$in: types},
                    status: constProposalStatus.PENDING
                };
                return dbconfig.collection_proposal.find(queryObj).sort({"createTime": -1}).lean();
            }
        );
    },

    lockProposalById: function (proposalId, adminId) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId})
            .populate({path: 'type', model: dbconfig.collection_proposalType})
            .populate({path: 'process', model: dbconfig.collection_proposalProcess})
            .populate({path: 'isLocked', model: dbconfig.collection_admin}).lean()
            .then(
                proposalData => {
                    if (proposalData.isLocked && proposalData.isLocked.toString() != adminId.toString()) {
                        return proposalData;
                    } else {
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {_id: proposalData._id, createTime: proposalData.createTime},
                            {isLocked: adminId},
                            {new: true}
                        ).populate({path: 'type', model: dbconfig.collection_proposalType})
                            .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                            .populate({path: 'isLocked', model: dbconfig.collection_admin})
                            .lean();
                    }
                })
    },
    unlockProposalById: function (proposalId, adminId) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).lean().then(
            proposalData => {
                if (proposalData.isLocked && proposalData.isLocked.toString() == adminId.toString()) {
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposalData._id, createTime: proposalData.createTime},
                        {isLocked: null},
                        {new: true}
                    ).populate({path: 'type', model: dbconfig.collection_proposalType})
                        .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                        // .populate({path: 'remark.admin', model: dbconfig.collection_admin})
                        .populate({path: 'isLocked', model: dbconfig.collection_admin})
                        .lean();
                } else {
                    return {message: "not allowed."};
                }
            })
    },

    submitRepairPaymentProposal: function (proposalId) {
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData && proposalData.data) {
                    //check if manual or online top up
                    if (proposalData.data.bankCardType != null) {
                        return pmsAPI.payment_checkExpiredManualTopup(
                            {
                                proposalId: proposalId
                            }
                        );
                    }
                    else {
                        return pmsAPI.payment_requestRepairingOnlinePay(
                            {
                                proposalId: proposalId
                            }
                        ).then(
                            res => {
                                proposalData.data.isRepair = true;
                                return proposalData.save();
                            }
                        );
                    }
                }
                else {
                    return Q.reject({name: 'DataError', message: 'Can not find proposal'});
                }
            }
        );
    },

    setBonusProposalStatus: (proposalId, orderStatus, remark) => {
        let proposalObj = {};
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).lean().then(
            proposalData => {
                if (proposalData && proposalData.data) {
                    proposalObj = proposalData;
                    return pmsAPI.bonus_setBonusStatus(
                        {
                            proposalId: proposalId,
                            orderStatus: orderStatus,
                            remark: remark
                        }
                    );
                }
                else {
                    return Q.reject({name: 'DataError', message: 'Can not find proposal'});
                }
            }
        ).then(
            data => {
                if (data && orderStatus == 2) {
                    return dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposalObj._id,
                        createTime: proposalObj.createTime
                    }, {status: constProposalStatus.APPROVED})
                }
            }
        );
    },
    getProposalAmountSum: (data, index, limit) => {

        let queryObj = {}
        queryObj['data.platformId'] = ObjectId(data.platformId);
        if (data.type) {
            queryObj['type'] = ObjectId(data.typeId);
        }
        queryObj.mainType = 'TopUp'
        if (data.cardField) {
            let cardField = 'data.' + data.cardField;
            queryObj[cardField] = data.card;
        }
        queryObj["data.validTime"] = {};
        queryObj["data.validTime"]["$gte"] = data.startDate ? new Date(data.startDate) : null;
        queryObj["data.validTime"]["$lt"] = data.endDate ? new Date(data.endDate) : null;

        if (data.status) {
            queryObj["status"] = {$in: data.status};
        }
        return dbconfig.collection_proposal.aggregate(
            {
                $match: queryObj
            }, {
                $group: {
                    _id: null,
                    totalAmount: {$sum: "$data.amount"},
                }
            }
        );
    },

    getPaymentMonitorResult: (data, index, limit) => {
        let query = {};

        let sort = {createTime: -1};

        limit = limit ? limit : 10;
        index = index ? index : 0;

        query["createTime"] = {};
        query["createTime"]["$gte"] = data.startTime ? new Date(data.startTime) : null;
        query["createTime"]["$lt"] = data.endTime ? new Date(data.endTime) : null;
        let maxDiffTime = constSystemParam.PROPOSAL_SEARCH_MAX_TIME_FRAME;
        let searchInterval = Math.abs(query.createTime.$gte.getTime() - query.createTime.$lt.getTime());
        if (searchInterval > maxDiffTime) {
            return Promise.reject({
                name: "DataError",
                message: "Exceed proposal search max time frame"
            });
        }


        if (data.merchantNo && data.merchantNo.length > 0 && (!data.merchantGroup || data.merchantGroup.length == 0)) {
            query['$or'] = [
                {'data.merchantNo': {$in: convertStringNumber(data.merchantNo)}},
                {'data.bankCardNo': {$in: convertStringNumber(data.merchantNo)}},
                {'data.accountNo': {$in: convertStringNumber(data.merchantNo)}},
                {'data.alipayAccount': {$in: convertStringNumber(data.merchantNo)}},
                {'data.wechatAccount': {$in: convertStringNumber(data.merchantNo)}},
                {'data.weChatAccount': {$in: convertStringNumber(data.merchantNo)}}
            ]
        }

        if ((!data.merchantNo || data.merchantNo.length == 0) && data.merchantGroup && data.merchantGroup.length > 0) {
            let mGroupList = [];
            data.merchantGroup.forEach(item => {
                item.forEach(sItem => {
                    mGroupList.push(sItem)
                })
            });
            query['data.merchantNo'] = {$in: convertStringNumber(mGroupList)};
        }

        if (data.merchantNo && data.merchantNo.length > 0 && data.merchantGroup && data.merchantGroup.length > 0) {
            if (data.merchantGroup.length > 0) {
                let mGroupC = [];
                let mGroupD = [];
                data.merchantNo.forEach(item => {
                    mGroupC.push(item);
                });
                data.merchantGroup.forEach(item => {
                    item.forEach(sItem => {
                        mGroupD.push(sItem)
                    });
                });
                if (data.merchantNo.length > 0) {
                    query['data.merchantNo'] = {$in: convertStringNumber(mGroupC)};
                } else if (data.merchantGroup.length > 0 && data.merchantNo.length == 0) {
                    query['data.merchantNo'] = {$in: convertStringNumber(mGroupD)}
                }
            }
        }

        if (data.orderId) {
            query['data.requestId'] = data.orderId;
        }
        if (data.playerName) {
            query['data.playerName'] = data.playerName;
        }
        if (data.proposalNo) {
            query['proposalId'] = data.proposalNo;
        }
        if (data.bankTypeId && data.bankTypeId.length > 0) {
            query['data.bankTypeId'] = {$in: convertStringNumber(data.bankTypeId)};
        }
        if (data.userAgent && data.userAgent.length > 0) {
            query['data.userAgent'] = {$in: convertStringNumber(data.userAgent)};
        }
        if (data.status && data.status.length > 0) {
            query['status'] = {$in: convertStringNumber(data.status)};
        }
        if(data.line){
            query['data.line'] = data.line;
        }
        let mainTopUpType;
        switch (String(data.mainTopupType)) {
            case constPlayerTopUpType.ONLINE.toString():
                mainTopUpType = constProposalType.PLAYER_TOP_UP;
                break;
            case constPlayerTopUpType.ALIPAY.toString():
                mainTopUpType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                break;
            case constPlayerTopUpType.MANUAL.toString():
                mainTopUpType = constProposalType.PLAYER_MANUAL_TOP_UP;
                break;
            case constPlayerTopUpType.WECHAT.toString():
                mainTopUpType = constProposalType.PLAYER_WECHAT_TOP_UP;
                break;
            case constPlayerTopUpType.QUICKPAY.toString():
                mainTopUpType = constProposalType.PLAYER_QUICKPAY_TOP_UP;
                break;
            default:
                mainTopUpType = {
                    $in: [
                        constProposalType.PLAYER_TOP_UP,
                        constProposalType.PLAYER_ALIPAY_TOP_UP,
                        constProposalType.PLAYER_MANUAL_TOP_UP,
                        constProposalType.PLAYER_WECHAT_TOP_UP,
                        constProposalType.PLAYER_QUICKPAY_TOP_UP
                    ]
                };
        }
        if (data.topupType && data.topupType.length > 0) {
            query['data.topupType'] = {$in: convertStringNumber(data.topupType)}
        }

        if (data.depositMethod && data.depositMethod.length > 0) {
            query['data.depositMethod'] = {'$in': convertStringNumber(data.depositMethod)};
        }

        let proposalCount, proposals;

        // get all the relevant proposal
        return dbconfig.collection_proposalType.find({platformId: data.platformId, name: mainTopUpType}).lean().then(
            proposalTypes => {
                let typeIds = proposalTypes.map(type => {
                    return type._id;
                });

                query.type = {$in: typeIds};

                let proposalCountProm = dbconfig.collection_proposal.find(query).count();
                let proposalsProm = dbconfig.collection_proposal.find(query).sort(sort).skip(index).limit(limit)
                    .populate({path: 'type', model: dbconfig.collection_proposalType})
                    .populate({path: "data.playerObjId", model: dbconfig.collection_players});
                return Promise.all([proposalCountProm, proposalsProm]);
            }
        ).then(
            proposalData => {
                proposalCount = proposalData[0];
                proposals = proposalData[1];


                return insertRepeatCount(proposals, data.platformId);
            }
        ).then(
            proposals => {
                return {size: proposalCount, data: proposals}
            }
        );
    },

    getPaymentMonitorTotalResult: (data, index, limit) => {
        let query = {};
        let orQuery = [];

        let sort = {createTime: -1};

        limit = limit ? limit : 10;
        index = index ? index : 0;

        query["createTime"] = {};
        query["createTime"]["$gte"] = data.startTime ? new Date(data.startTime) : null;
        query["createTime"]["$lt"] = data.endTime ? new Date(data.endTime) : null;

        let maxDiffTime = constSystemParam.PROPOSAL_SEARCH_MAX_TIME_FRAME;
        let searchInterval = Math.abs(query.createTime.$gte.getTime() - query.createTime.$lt.getTime());
        if (searchInterval > maxDiffTime) {
            return Promise.reject({
                name: "DataError",
                message: "Exceed proposal search max time frame"
            });
        }

        if (data.merchantNo && data.merchantNo.length > 0 && (!data.merchantGroup || data.merchantGroup.length == 0)) {
            query['$and'] = [];
            query['$and'].push({$or: [
                    {'data.merchantNo': {$in: convertStringNumber(data.merchantNo)}},
                    {'data.bankCardNo': {$in: convertStringNumber(data.merchantNo)}},
                    {'data.accountNo': {$in: convertStringNumber(data.merchantNo)}},
                    {'data.alipayAccount': {$in: convertStringNumber(data.merchantNo)}},
                    {'data.wechatAccount': {$in: convertStringNumber(data.merchantNo)}},
                    {'data.weChatAccount': {$in: convertStringNumber(data.merchantNo)}}
                ]}
            );

            if(data.searchType && data.searchType == "completed"){
                query['$and'].push(
                    {'data.followUpContent': {$exists: true}},
                    {'data.followUpContent': {$ne: null}},
                    {'data.followUpContent': {$ne: ""}}
                );
            }else{
                query['$and'].push({$or: [
                        {'data.followUpContent': {$exists: true, $eq: null}},
                        {'data.followUpContent': {$exists: true, $size: 0}},
                        {'data.followUpContent': {$exists: false}},
                        {'data.followUpContent': ""}
                    ]}
                );
            }

        }else{
            if(data.searchType && data.searchType == "completed"){
                query['$and'] = [];

                query['$and'].push(
                        {'data.followUpContent': {$exists: true}},
                        {'data.followUpContent': {$ne: null}},
                        {'data.followUpContent': {$ne: ""}}
                );
            }else{
                query['$or'] = [
                    {'data.followUpContent': {$exists: true, $eq: null}},
                    {'data.followUpContent': {$exists: true, $size: 0}},
                    {'data.followUpContent': {$exists: false}},
                    {'data.followUpContent': ""}
                ];
            }

        }

        if ((!data.merchantNo || data.merchantNo.length == 0) && data.merchantGroup && data.merchantGroup.length > 0) {
            let mGroupList = [];
            data.merchantGroup.forEach(item => {
                item.forEach(sItem => {
                    mGroupList.push(sItem)
                })
            });
            query['data.merchantNo'] = {$in: convertStringNumber(mGroupList)};
        }

        if (data.merchantNo && data.merchantNo.length > 0 && data.merchantGroup && data.merchantGroup.length > 0) {
            if (data.merchantGroup.length > 0) {
                let mGroupC = [];
                let mGroupD = [];
                data.merchantNo.forEach(item => {
                    mGroupC.push(item);
                });
                data.merchantGroup.forEach(item => {
                    item.forEach(sItem => {
                        mGroupD.push(sItem)
                    });
                });
                if (data.merchantNo.length > 0) {
                    query['data.merchantNo'] = {$in: convertStringNumber(mGroupC)};
                } else if (data.merchantGroup.length > 0 && data.merchantNo.length == 0) {
                    query['data.merchantNo'] = {$in: convertStringNumber(mGroupD)}
                }
            }
        }

        if (data.orderId) {
            query['data.requestId'] = data.orderId;
        }
        if (data.playerName) {
            query['data.playerName'] = data.playerName;
        }
        if (data.proposalNo) {
            query['proposalId'] = data.proposalNo;
        }
        if (data.bankTypeId && data.bankTypeId.length > 0) {
            query['data.bankTypeId'] = {$in: convertStringNumber(data.bankTypeId)};
        }
        if (data.userAgent && data.userAgent.length > 0) {
            query['data.userAgent'] = {$in: convertStringNumber(data.userAgent)};
        }
        if (data.status && data.status.length > 0) {
            query['status'] = {$in: convertStringNumber(data.status)};
        }
        let mainTopUpType;
        switch (String(data.mainTopupType)) {
            case constPlayerTopUpType.ONLINE.toString():
                mainTopUpType = constProposalType.PLAYER_TOP_UP;
                break;
            case constPlayerTopUpType.ALIPAY.toString():
                mainTopUpType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                break;
            case constPlayerTopUpType.MANUAL.toString():
                mainTopUpType = constProposalType.PLAYER_MANUAL_TOP_UP;
                break;
            case constPlayerTopUpType.WECHAT.toString():
                mainTopUpType = constProposalType.PLAYER_WECHAT_TOP_UP;
                break;
            case constPlayerTopUpType.QUICKPAY.toString():
                mainTopUpType = constProposalType.PLAYER_QUICKPAY_TOP_UP;
                break;
            default:
                mainTopUpType = {
                    $in: [
                        constProposalType.PLAYER_TOP_UP,
                        constProposalType.PLAYER_ALIPAY_TOP_UP,
                        constProposalType.PLAYER_MANUAL_TOP_UP,
                        constProposalType.PLAYER_WECHAT_TOP_UP,
                        constProposalType.PLAYER_QUICKPAY_TOP_UP
                    ]
                };
        }
        if (data.topupType && data.topupType.length > 0) {
            query['data.topupType'] = {$in: convertStringNumber(data.topupType)}
        }

        if (data.depositMethod && data.depositMethod.length > 0) {
            query['data.depositMethod'] = {'$in': convertStringNumber(data.depositMethod)};
        }

        if(data.line){
            query['data.line'] = data.line;
        }

        let proposalCount, proposals;
        let proposalTypeQuery = {
            name: mainTopUpType
        }

        if(data.platformList && data.platformList.length > 0){
            proposalTypeQuery.platformId = {$in: data.platformList};
        }

        // get all the relevant proposal
        return dbconfig.collection_proposalType.find(proposalTypeQuery).lean().then(
            proposalTypes => {
                let typeIds = proposalTypes.map(type => {
                    return type._id;
                });

                query.type = {$in: typeIds};

                let proposalCountProm = dbconfig.collection_proposal.find(query).count();
                let proposalsProm = dbconfig.collection_proposal.find(query).sort(sort).skip(index).limit(limit)
                    .populate({path: 'type', model: dbconfig.collection_proposalType})
                    .populate({path: "data.playerObjId", model: dbconfig.collection_players});
                return Promise.all([proposalCountProm, proposalsProm]);
            }
        ).then(
            proposalData => {
                proposalCount = proposalData[0];
                proposals = proposalData[1];


                return insertRepeatCount(proposals, data.platformList);
            }
        ).then(
            proposals => {
                return {size: proposalCount, data: proposals}
            }
        );
    },

    approveCsPendingAndChangeStatus: (proposalObjId, createTime, adminName) => {
        return dbconfig.collection_proposal.findOne({_id: proposalObjId})
            .populate({path: "type", model: dbconfig.collection_proposalType}).lean().then(
            proposal => {
                if(!proposal) Q.reject({name: 'DataError', message: 'Can not find proposal'});

                // auto approval or audit process step
                if(proposal.data.isAutoApproval ||　proposal.process){
                    return dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposalObjId,
                        status: constProposalStatus.CSPENDING,
                        createTime: createTime
                    }, {
                        status: proposal.data.isAutoApproval ? constProposalStatus.AUTOAUDIT : constProposalStatus.PENDING,
                        'data.approvedByCs':adminName
                    });
                } else {
                    // approved
                    return dbconfig.collection_proposal.findOneAndUpdate({
                        _id: proposalObjId,
                        status: constProposalStatus.CSPENDING,
                        createTime: createTime
                    }, {
                        'data.approvedByCs':adminName,
                        status: constProposalStatus.APPROVED,
                    }).then(
                        () =>  proposalExecutor.approveOrRejectProposal(proposal.type.executionType, proposal.type.rejectionType, true, proposal)
                    );
                }
            }
        )
    },

    getRewardAnalysisProposal: (startDate, endDate, period, platformObjId, type, proposalNameArr) => {
        let proposalArr = [];

        var dayStartTime = startDate;
        var getNextDate;

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }

        let returnObjTemplate = {
            totalProposalCount: 0,
            totalPlayerCount: 0,
            totalAmount: 0,
        };

        let allRewardObjId = [];
        let allRewardObj = {};
        let prom;

        if (type == "rewardName") {
            prom = dbconfig.collection_rewardEvent.find({platform: ObjectId(platformObjId), name: {$in: proposalNameArr}}).lean()
        } else {
            // let proposalNameArr = [];
            // for (let key in constProposalMainType) {
            //     if (constProposalMainType[key] == "Reward") {
            //         proposalNameArr.push(key);
            //     }
            // }
            prom = dbconfig.collection_proposalType.find(
                {
                    platformId: ObjectId(platformObjId),
                    name: {$in: proposalNameArr}
                }
            ).lean()
        }

        return prom.then(
            allRewardTypeData => {
                if (!(allRewardTypeData && allRewardTypeData.length)) {
                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                }

                allRewardTypeData.forEach(item => {
                    if (type == "rewardName") {
                        allRewardObjId.push(item.executeProposal);
                    } else {
                        allRewardObjId.push(item._id);
                    }

                    allRewardObj[String(item._id)] = item.name;
                    returnObjTemplate[item.name] = {
                        proposalCount: 0,
                        player: 0,
                        amount: 0
                    };
                });


                // while (dayStartTime.getTime() < endDate.getTime()) {
                for (; dayStartTime.getTime() < endDate.getTime(); dayStartTime = dayEndTime) {
                    var dayEndTime = getNextDate.call(this, dayStartTime);


                    let matchObj = {
                        "data.platformId": ObjectId(platformObjId),
                        // mainType: "Reward",
                        type: {$in: allRewardObjId},
                        createTime: {$gte: dayStartTime, $lt: dayEndTime},
                        status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                    };

                    let groupObj = {
                        _id: "$type",
                        proposalCount: {$sum: 1},
                        player: {$addToSet: "$data.playerObjId"},
                        amount: {$sum: "$data.rewardAmount"}
                    }

                    if (type == "rewardName") {
                        groupObj._id = "$data.eventName";
                        // matchObj["data.promoCode"] = {$exists: false};
                    }

                    let returnObj = JSON.parse(JSON.stringify(returnObjTemplate));

                    proposalArr.push(dbconfig.collection_proposal.aggregate([
                        {
                            $match: matchObj
                        },
                        {
                            $group: groupObj
                        }
                    ]).read("secondaryPreferred").then(
                        result => {
                            if (result && result.length) {
                                result.forEach(item => {
                                    let key;
                                    if (type == "rewardName") {
                                        key = String(item._id);
                                    } else {
                                        key = allRewardObj[String(item._id)];
                                    }
                                    if (returnObj.hasOwnProperty(key)) {
                                        returnObj[key].proposalCount += item.proposalCount;
                                        returnObj[key].player += item.player.length || 0;
                                        returnObj[key].amount += item.amount;
                                    }
                                    returnObj.totalProposalCount += item.proposalCount;
                                    returnObj.totalPlayerCount += item.player.length || 0;
                                    returnObj.totalAmount += item.amount;
                                })
                            }
                            return returnObj;
                        }
                    ));


                }
                return Promise.all(proposalArr);
            }
        ).then(
            data => {
                if (!data) {
                    return Q.reject({name: 'DataError', message: 'Can not find the proposal data'})
                }
                let tempDate = startDate;

                if (data.length) {
                    for (let i = 0; i < data.length; i++) {  // number of date
                        // if (data[i]._id == null) { //manual reward does not have event name
                        //     data[i]._id = "MANUAL_REWARD"
                        // }
                        data[i].date = new Date(tempDate);
                        tempDate = getNextDate(tempDate);
                    }
                }
                else {
                    return Q.reject({name: 'DataError', message: 'The data mismatched'})
                }

                return data;

            }
        )

    },

    getProposalByObjId: (proposalObjId) => {
        for (let i = 0; i < proposalObjId.length; i++) {
            proposalObjId[i] = ObjectId(proposalObjId[i]);
        }
        return dbconfig.collection_proposal.find({_id: {$in: proposalObjId}})
            .populate({path: "type", model: dbconfig.collection_proposalType}).lean();
    },

    getWithdrawalProposal: (startDate, endDate, period, platformObjId) => {
        let withdrawSuccessArr = [];
        let withdrawFailedArr = [];

        var dayStartTime = startDate;
        var getNextDate;

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }


        let groupObj = {
            $group: {
                _id: null,
                totalCount: {$sum: 1},
                count1: {$sum: {$cond: [{"$lt": ["$_id.timeUsed", 60000]}, 1, 0]}},
                count2: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 60000]}, {"$lt": ["$_id.timeUsed", 180000]}]}, 1, 0]}},
                count3: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 180000]}, {"$lt": ["$_id.timeUsed", 300000]}]}, 1, 0]}},
                count4: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 300000]}, {"$lt": ["$_id.timeUsed", 600000]}]}, 1, 0]}},
                count5: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 600000]}, {"$lt": ["$_id.timeUsed", 1200000]}]}, 1, 0]}},
                count6: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 1200000]}, {"$lt": ["$_id.timeUsed", 1800000]}]}, 1, 0]}},
                count7: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 1800000]}, {"$lt": ["$_id.timeUsed", 2700000]}]}, 1, 0]}},
                count8: {$sum: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 2700000]}, {"$lt": ["$_id.timeUsed", 3600000]}]}, 1, 0]}},
                count9: {$sum: {$cond: [{"$gte": ["$_id.timeUsed", 3600000]}, 1, 0]}},
                proposal1: {$addToSet: {$cond: [{"$lt": ["$_id.timeUsed", 60000]}, "$_id.id", "$null"]}},
                proposal2: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 60000]}, {"$lt": ["$_id.timeUsed", 180000]}]}, "$_id.id", "$null"]}},
                proposal3: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 180000]}, {"$lt": ["$_id.timeUsed", 300000]}]}, "$_id.id", "$null"]}},
                proposal4: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 300000]}, {"$lt": ["$_id.timeUsed", 600000]}]}, "$_id.id", "$null"]}},
                proposal5: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 600000]}, {"$lt": ["$_id.timeUsed", 1200000]}]}, "$_id.id", "$null"]}},
                proposal6: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 1200000]}, {"$lt": ["$_id.timeUsed", 1800000]}]}, "$_id.id", "$null"]}},
                proposal7: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 1800000]}, {"$lt": ["$_id.timeUsed", 2700000]}]}, "$_id.id", "$null"]}},
                proposal8: {$addToSet: {$cond: [{$and: [{"$gte": ["$_id.timeUsed", 2700000]}, {"$lt": ["$_id.timeUsed", 3600000]}]}, "$_id.id", "$null"]}},
                proposal9: {$addToSet: {$cond: [{"$gte": ["$_id.timeUsed", 3600000]}, "$_id.id", "$null"]}}
            }
        }

        // while (dayStartTime.getTime() < endDate.getTime()) {
        for ( ; dayStartTime.getTime() < endDate.getTime(); dayStartTime = dayEndTime) {
            var dayEndTime = getNextDate.call(this, dayStartTime);

            let nullObj = {
                totalCount: 0,
                count1: 0,
                count2: 0,
                count3: 0,
                count4: 0,
                count5: 0,
                count6: 0,
                count7: 0,
                count8: 0,
                count9: 0,
                proposal1: [],
                proposal2: [],
                proposal3: [],
                proposal4: [],
                proposal5: [],
                proposal6: [],
                proposal7: [],
                proposal8: [],
                proposal9: []
            };

            let matchObj1 = {
                "data.platformId": ObjectId(platformObjId),
                mainType: constProposalMainType.PlayerBonus,
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            withdrawSuccessArr.push(dbconfig.collection_proposal.aggregate([
                {
                    $match: matchObj1
                },
                {
                    $group: {
                        _id: {id: "$_id", timeUsed: {"$subtract": ["$settleTime", "$createTime"]}}
                    }
                },
                groupObj
                ]).read("secondaryPreferred").then(result => {

                if (result && result.length > 0) {
                    return result[0];
                } else {
                    return nullObj;
                }
            }));


            let matchObj2 = {
                "data.platformId": ObjectId(platformObjId),
                mainType: constProposalMainType.PlayerBonus,
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                status: {$in: [constProposalStatus.FAIL, constProposalStatus.REJECTED, constProposalStatus.CANCEL]}
            };

            withdrawFailedArr.push(dbconfig.collection_proposal.aggregate([
                {
                    $match: matchObj2
                },
                {
                    $group: {
                        _id: {id: "$_id", timeUsed: {"$subtract": ["$settleTime", "$createTime"]}}
                    }
                },
                groupObj
                ]).read("secondaryPreferred").then(result => {

                if (result && result.length > 0) {
                    return result[0];
                } else {
                    return nullObj;
                }
            }));
        }
        return Promise.all([Promise.all(withdrawSuccessArr), Promise.all(withdrawFailedArr)]).then(data => {
            if (!data && !data[0] && !data[1]) {
                return Q.reject({name: 'DataError', message: 'Can not find the proposal data'})
            }
            let tempDate = startDate;

            if (data[0].length == data[1].length){
                for (let i = 0; i < data[0].length; i++) {  // number of date
                    data[0][i].date = new Date(tempDate);
                    data[1][i].date = new Date(tempDate);
                    tempDate = getNextDate(tempDate);
                }
            }
            else{
                return Q.reject({name: 'DataError', message: 'The data mismatched'})
            }

            return [data[0], data[1]];

        });
    },

    getManualApprovalRecords: (startDate, endDate, period, playerBonusList, updatePlayerList, updatePartnerList, rewardList, othersList, allList) => {

        let playerBonusArr = [];
        let updatePlayerArr = [];
        let updatePartnerArr = [];
        let rewardArr = [];
        let othersArr = [];
        let allArr = [];

        var dayStartTime = startDate;
        var getNextDate;

        var getKey = (obj,val) => Object.keys(obj).find(key => obj[key] === val);

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }

        // while (dayStartTime.getTime() < endDate.getTime()) {
        for ( ; dayStartTime.getTime() < endDate.getTime(); dayStartTime = dayEndTime) {
            var dayEndTime = getNextDate.call(this, dayStartTime);
            var matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
            };

            playerBonusArr.push(dbconfig.collection_proposal.aggregate(
                    {$match:
                        Object.assign({}, matchObj,{type: {$in: playerBonusList.map( p => ObjectId(p))}} )
                    },
                    {
                        $group: {
                            _id: {},
                            totalCount: {$sum: 1},
                            successCount: {$sum: {$cond: [
                                {$and: [
                                    {$eq: ["$noSteps", false]},
                                    {$or: [
                                        {$eq: ["$status", constProposalStatus.SUCCESS]},
                                        {$eq: ["$status", constProposalStatus.APPROVED]}
                                        ]}
                                ]}, 1, 0
                            ]}},
                            rejectCount: {$sum: {$cond: [
                                {$and: [
                                    {$eq: ["$noSteps", false]},
                                    {$or: [
                                        {$eq: ["$status", constProposalStatus.FAIL]},
                                        {$eq: ["$status", constProposalStatus.REJECTED]}
                                    ]}
                                ]}, 1, 0
                            ]}},
                        }
                    }).read("secondaryPreferred").then(result => {

                        if (result && result.length > 0){
                            let manualCount = (result[0].successCount || 0) + (result[0].rejectCount || 0);
                            return {totalCount: result[0].totalCount || 0, successCount: result[0].successCount || 0, rejectCount: result[0].rejectCount || 0, manualCount: manualCount};
                        }
                        else{
                            return {totalCount: 0, successCount: 0, rejectCount: 0, manualCount: 0};
                        }

                }))

            // updatePlayerArr.push( dbconfig.collection_proposal.find(
            //     Object.assign(
            //         {},
            //         matchObj,
            //         {
            //             type: {$in: updatePlayerList.map( p => ObjectId(p))}, noSteps: false, status: {$in:[constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.FAIL, constProposalStatus.REJECTED]}
            //         }),
            // {proposalId: 1, status: 1, createTime: 1, noSteps: 1})

            updatePlayerArr.push(dbconfig.collection_proposal.aggregate(
                {$match:
                    Object.assign({}, matchObj,{type: {$in: updatePlayerList.map( p => ObjectId(p))}} )
                },
                {
                    $group: {
                        _id: {},
                        totalCount: {$sum: 1},
                        successCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.SUCCESS]},
                                    {$eq: ["$status", constProposalStatus.APPROVED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                        rejectCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.FAIL]},
                                    {$eq: ["$status", constProposalStatus.REJECTED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                    }
                }).read("secondaryPreferred").then(result => {
                // .then(result => {
                // console.log("CHECKING-------", result)
                if (result && result.length > 0){
                    let manualCount = (result[0].successCount || 0) + (result[0].rejectCount || 0);
                    return {totalCount: result[0].totalCount || 0, successCount: result[0].successCount || 0, rejectCount: result[0].rejectCount || 0, manualCount: manualCount};
                }
                else{
                    return {totalCount: 0, successCount: 0, rejectCount: 0, manualCount: 0};
                }

            }))

            updatePartnerArr.push(dbconfig.collection_proposal.aggregate(
                {$match:
                    Object.assign({}, matchObj,{type: {$in: updatePartnerList.map( p => ObjectId(p))}} )
                },
                {
                    $group: {
                        _id: {},
                        totalCount: {$sum: 1},
                        successCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.SUCCESS]},
                                    {$eq: ["$status", constProposalStatus.APPROVED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                        rejectCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.FAIL]},
                                    {$eq: ["$status", constProposalStatus.REJECTED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                    }
                }).read("secondaryPreferred").then(result => {

                if (result && result.length > 0){
                    let manualCount = (result[0].successCount || 0) + (result[0].rejectCount || 0);
                    return {totalCount: result[0].totalCount || 0, successCount: result[0].successCount || 0, rejectCount: result[0].rejectCount || 0, manualCount: manualCount};
                }
                else{
                    return {totalCount: 0, successCount: 0, rejectCount: 0, manualCount: 0};
                }

            }))

            rewardArr.push(dbconfig.collection_proposal.aggregate(
                {$match:
                    Object.assign({}, matchObj,{type: {$in: rewardList.map( p => ObjectId(p))}} )
                },
                {
                    $group: {
                        _id: {},
                        totalCount: {$sum: 1},
                        successCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.SUCCESS]},
                                    {$eq: ["$status", constProposalStatus.APPROVED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                        rejectCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.FAIL]},
                                    {$eq: ["$status", constProposalStatus.REJECTED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                    }
                }).read("secondaryPreferred").then(result => {

                if (result && result.length > 0){
                    let manualCount = (result[0].successCount || 0) + (result[0].rejectCount || 0);
                    return {totalCount: result[0].totalCount || 0, successCount: result[0].successCount || 0, rejectCount: result[0].rejectCount || 0, manualCount: manualCount};
                }
                else{
                    return {totalCount: 0, successCount: 0, rejectCount: 0, manualCount: 0};
                }

            }))

            othersArr.push(dbconfig.collection_proposal.aggregate(
                {$match:
                    Object.assign({}, matchObj,{type: {$in: othersList.map( p => ObjectId(p))}} )
                },
                {
                    $group: {
                        _id: {},
                        totalCount: {$sum: 1},
                        successCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.SUCCESS]},
                                    {$eq: ["$status", constProposalStatus.APPROVED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                        rejectCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.FAIL]},
                                    {$eq: ["$status", constProposalStatus.REJECTED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                    }
                }).read("secondaryPreferred").then(result => {

                if (result && result.length > 0){
                    let manualCount = (result[0].successCount || 0) + (result[0].rejectCount || 0);
                    return {totalCount: result[0].totalCount || 0, successCount: result[0].successCount || 0, rejectCount: result[0].rejectCount || 0, manualCount: manualCount};
                }
                else{
                    return {totalCount: 0, successCount: 0, rejectCount: 0, manualCount: 0};
                }

            }))

            allArr.push(dbconfig.collection_proposal.aggregate(
                {$match:
                    Object.assign({}, matchObj,{type: {$in: allList.map( p => ObjectId(p))}} )
                },
                {
                    $group: {
                        _id: {},
                        totalCount: {$sum: 1},
                        successCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.SUCCESS]},
                                    {$eq: ["$status", constProposalStatus.APPROVED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                        rejectCount: {$sum: {$cond: [
                            {$and: [
                                {$eq: ["$noSteps", false]},
                                {$or: [
                                    {$eq: ["$status", constProposalStatus.FAIL]},
                                    {$eq: ["$status", constProposalStatus.REJECTED]}
                                ]}
                            ]}, 1, 0
                        ]}},
                    }
                }).read("secondaryPreferred").then(result => {

                if (result && result.length > 0){
                    let manualCount = (result[0].successCount || 0) + (result[0].rejectCount || 0);
                    return {totalCount: result[0].totalCount || 0, successCount: result[0].successCount || 0, rejectCount: result[0].rejectCount || 0, manualCount: manualCount};
                }
                else{
                    return {totalCount: 0, successCount: 0, rejectCount: 0, manualCount: 0};
                }

            }))

            // dayStartTime = dayEndTime;
        }
        return Promise.all([Promise.all(playerBonusArr), Promise.all(updatePlayerArr), Promise.all(updatePartnerArr), Promise.all(rewardArr), Promise.all(othersArr), Promise.all(allArr)]).then(data => {
            if (!data && !data[0] && !data[1] && !data[2] && !data[3] && !data[4] && !data[5]) {
                return Q.reject({name: 'DataError', message: 'Can not find the proposal data'})
            }

            let tempDate = startDate;

            if (data[0].length == data[1].length && data[1].length == data[2].length && data[2].length == data[3].length && data[3].length == data[4].length && data[4].length == data[5].length){
                for (let i = 0; i < data[0].length; i++) {  // number of date
                    data[0][i].date = tempDate;
                    data[1][i].date = tempDate;
                    data[2][i].date = tempDate;
                    data[3][i].date = tempDate;
                    data[4][i].date = tempDate;
                    data[5][i].date = tempDate;
                    tempDate = getNextDate(tempDate);
                }
            }
            else{
                return Q.reject({name: 'DataError', message: 'The data mismatched'})
            }

            return [data[0], data[1], data[2], data[3], data[4], data[5]];

        });
    },

    updateProposalData: (query, updateData) => {
        return dbconfig.collection_proposal.update(query,updateData).lean();
    },

    getSpecificProposalTypeByName: (platform, proposalType) => {
       return dbconfig.collection_proposalType.findOne({platformId: ObjectId(platform), name: proposalType}).lean();
    },

    getRegistrationClickCountRecords: (startDate, endDate, period, platform, proposalTypeId) => {

        let registrationProm = [];
        let clickCountProm = [];

        var dayStartTime = startDate;
        var getNextDate;

        var getKey = (obj,val) => Object.keys(obj).find(key => obj[key] === val);

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }

        for ( ; dayStartTime.getTime() < endDate.getTime(); dayStartTime = dayEndTime) {
            var dayEndTime = getNextDate.call(this, dayStartTime);

            var matchObj2 = {
                startTime: {$gte: dayStartTime},
                endTime: {$lte: dayEndTime},
            };

            var matchObj = {
                settleTime: {$gte: dayStartTime, $lt: dayEndTime},

            };

            registrationProm.push(dbconfig.collection_proposal.aggregate(
                {
                    $match:
                        Object.assign({}, matchObj, {
                            type: ObjectId(proposalTypeId),
                            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.NOVERIFY]},
                            inputDevice: {
                                $in: [constPlayerRegistrationInterface.WEB_PLAYER,
                                    constPlayerRegistrationInterface.WEB_AGENT,
                                    constPlayerRegistrationInterface.H5_PLAYER,
                                    constPlayerRegistrationInterface.H5_AGENT,
                                    constPlayerRegistrationInterface.APP_PLAYER,
                                    constPlayerRegistrationInterface.APP_AGENT,]
                            }
                        })
                },
                {
                    $group: {
                        _id: {},
                        webCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            {$eq: ["$inputDevice", constPlayerRegistrationInterface.WEB_PLAYER]},
                                            {$eq: ["$inputDevice", constPlayerRegistrationInterface.WEB_AGENT]},
                                        ]
                                    }, 1, 0
                                ]
                            }
                        },
                        appCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            {$eq: ["$inputDevice", constPlayerRegistrationInterface.APP_PLAYER]},
                                            {$eq: ["$inputDevice", constPlayerRegistrationInterface.APP_AGENT]},
                                        ]
                                    }, 1, 0
                                ]
                            }
                        },
                        H5Count: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            {$eq: ["$inputDevice", constPlayerRegistrationInterface.H5_PLAYER]},
                                            {$eq: ["$inputDevice", constPlayerRegistrationInterface.H5_AGENT]},
                                        ]
                                    }, 1, 0
                                ]
                            }
                        },

                    }
                }).read("secondaryPreferred").then( data => {
                    let webCount = 0;
                    let appCount = 0;
                    let H5Count = 0;

                    if(data && data.length > 0){
                        webCount = data[0].webCount;
                        appCount = data[0].appCount;
                        H5Count = data[0].H5Count;
                    }

                    return {webCount: webCount, appCount: appCount, H5Count: H5Count}

            }))

            clickCountProm.push(dbconfig.collection_clickCount.aggregate(
                {
                    $match:
                        Object.assign({}, matchObj2, {
                            platform: ObjectId(platform),
                            $or: [{webIpAddresses: {$exists: true}}, {H5IpAddresses: {$exists: true}}, {appIpAddresses: {$exists: true}}]
                        })
                },
                {
                    $group: {
                        _id: {},
                        webIpAddresses: {$addToSet: "$webIpAddresses"},
                        appIpAddresses: {$addToSet: "$appIpAddresses"},
                        H5IpAddresses: {$addToSet: "$H5IpAddresses"},
                    }
                }).read("secondaryPreferred").then( data => {

                    let webUniqueCount = 0;
                    let appUniqueCount = 0;
                    let H5UniqueCount = 0;

                    if(data && data.length > 0){

                        let flattenAppList = data[0].appIpAddresses.reduce((a,b) => a.concat(b),[]).filter((v,i,d) => d.indexOf(v) === i);
                        let flattenWebList = data[0].webIpAddresses.reduce((a,b) => a.concat(b),[]).filter((v,i,d) => d.indexOf(v) === i);;
                        let flattenH5List = data[0].H5IpAddresses.reduce((a,b) => a.concat(b),[]).filter((v,i,d) => d.indexOf(v) === i);;

                        appUniqueCount = flattenAppList.length;
                        webUniqueCount = flattenWebList.length;
                        H5UniqueCount = flattenH5List.length;

                    }

                    return {webUniqueCount: webUniqueCount, appUniqueCount: appUniqueCount, H5UniqueCount: H5UniqueCount}
            }))

        }

        return Promise.all([Promise.all(registrationProm), Promise.all(clickCountProm)]).then( data => {
            if (data[0] && data[1]) {

                let result = [];
                let tempDate = startDate;

                if (data[0].length == data[1].length && data[1].length){
                    for (let i = 0; i < data[0].length; i++) {  // number of date
                        data[0][i].date = tempDate;

                        result.push({date: tempDate, webCount: data[0][i].webCount, appCount: data[0][i].appCount, H5Count: data[0][i].H5Count,
                            webUniqueCount: data[1][i].webUniqueCount, appUniqueCount: data[1][i].appUniqueCount, H5UniqueCount: data[1][i].H5UniqueCount,
                            frontEndCount: data[0][i].webCount + data[0][i].appCount + data[0][i].H5Count,
                            frontEndUniqueCount: data[1][i].webUniqueCount + data[1][i].appUniqueCount + data[1][i].H5UniqueCount
                        })
                        tempDate = getNextDate(tempDate);
                    }
                }
                else{
                    return Q.reject({name: 'DataError', message: 'The data mismatched'})
                }

                return result;
            }
        })
    },

    getSpecificTypeOfManualApprovalRecords: (startDate, period, typeList, status) => {

        let typeArr = [];

        var dayStartTime = startDate;
        var getNextDate;

        var getKey = (obj,val) => Object.keys(obj).find(key => obj[key] === val);

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }

        var dayEndTime = getNextDate.call(this, dayStartTime);
        let matchObj = {
            createTime: {$gte: dayStartTime, $lt: dayEndTime},
            noSteps: false,
            type: {$in: typeList.map( p => ObjectId(p))}
        };

        if (status == 'Success'){
            matchObj.status = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
        }

        if (status == 'Fail'){
            matchObj.status = {$in: [constProposalStatus.FAIL, constProposalStatus.REJECTED]}
        }

        return dbconfig.collection_proposal.find(matchObj).populate({path: "type", model: dbconfig.collection_proposalType})
            .populate({path: "process", model: dbconfig.collection_proposalProcess}).lean();

    },

    getAllProposalTypeByPlatformId: (platformId) => {

        return dbconfig.collection_proposalType.find({platformId: ObjectId(platformId)}).lean();
    },


    getOnlineTopupAnalysisByPlatform: (platformId, startDate, endDate, analysisCategory, operator, timesValue, timesValueTwo) => {
        return dbconfig.collection_proposalType.findOne({platformId: platformId, name: constProposalType.PLAYER_TOP_UP}).read("secondaryPreferred").lean().then(
            (onlineTopupType) => {
                if (!onlineTopupType) return Q.reject({name: 'DataError', message: 'Can not find proposal type'});
                let proms = [];
                let merchantData;
                // loop for userAgent
                for(let i =1; i<=3; i++) {
                    let matchObj = {
                        createTime: {$gte: new Date(startDate), $lt: new Date(endDate)},
                        type: onlineTopupType._id,
                        "data.userAgent": i,
                        $and: [{"data.topupType": {$exists: true}}, {'data.topupType':{$ne: ''}}/*, {'data.topupType': {$type: 'number'}}*/],
                    };

                    let groupByObj = {
                        _id: "$data.topupType",
                        userIds: { $addToSet: "$data.playerObjId" },
                        amount: {$sum: {$cond: [{$or: [{$eq: ["$status", 'Success']},{$eq: ["$status", 'Approved']}]}, '$data.amount', 0]}},
                        count: {$sum: 1},
                        successCount: {$sum: {$cond: [{$or: [{$eq: ["$status", 'Success']},{$eq: ["$status", 'Approved']}]}, 1, 0]}},
                    };


                    //get topup analysis group by topupType
                    let prom = dbconfig.collection_proposal.aggregate(
                        {
                            $match: matchObj
                        }, {
                            $group: groupByObj
                        }
                    ).read("secondaryPreferred").then(
                        data => {

                            let searchQ = Object.assign({}, matchObj, {status: "Success"});
                            let proposalArrProm = dbconfig.collection_proposal.find(searchQ).populate({path: "type", model: dbconfig.collection_proposalType}).sort({createTime:-1}).lean();
                            //get success proposal count group by topupType, filter repeat user
                            let topUpTypeProm =  dbconfig.collection_proposal.aggregate(
                                {
                                    $match: Object.assign({}, matchObj,{status:{$in: ["Success", "Approved"]}})
                                }, {
                                    $group: {
                                        _id: "$data.topupType",
                                        userIds: { $addToSet: "$data.playerObjId" },
                                    }
                                }
                            ).read("secondaryPreferred");

                            return Promise.all([proposalArrProm, topUpTypeProm]).then(
                                data1 => {
                                    if (data1 && data1.length > 0) {
                                        let proposalArrData = data1[0];
                                        let topUpTypeData = data1[1];

                                        data.map(a => {
                                            a.proposalArr = [];
                                            a.successUserCount = 0;
                                            a.userCount = a.userIds.length;
                                            delete a.userIds; // save bandwidth
                                            topUpTypeData.forEach(
                                                b => {
                                                    if(a._id === b._id)
                                                        a.successUserCount = b.userIds.length;
                                                }
                                            );

                                            // append in the proposal in the interval filter
                                            proposalArrData.forEach( proposal => {
                                                if(proposal && proposal.data && proposal.data.topupType && proposal.data.topupType == a._id) {

                                                    proposal.data.timeDifferenceInMins = (new Date(proposal.settleTime).getTime() - new Date(proposal.createTime.getTime()))/(1000*60);
                                                    a.proposalArr.push(proposal);
                                                }
                                            });

                                            if (timesValue){
                                                a.proposalArr = timeIntervalFiltering( a.proposalArr, operator, timesValue, timesValueTwo);
                                            }

                                            return a;
                                        })

                                        return data;
                                    }
                                    else{
                                        Promise.reject({
                                            name: "DataError",
                                            message: "Cannot find proposals"
                                        })
                                    }
                                }
                            )
                        }
                    );
                    if(analysisCategory !== 'onlineTopupType')
                        prom = prom.then(
                            data => {
                                let innerProms = [];
                                data.forEach(
                                    onlineTopupTypeData => {
                                        innerProms.push(
                                            // get merchantData based on topup type
                                            dbconfig.collection_proposal.aggregate(
                                            {
                                                $match: Object.assign({}, matchObj,{'data.topupType': onlineTopupTypeData._id})
                                            }, {
                                                $group: Object.assign({}, groupByObj,{_id: "$data.merchantNo"})
                                            }
                                            ).read("secondaryPreferred").then(
                                                merchantData => {

                                                    let searchQ = Object.assign({}, matchObj, {status: "Success"}, {'data.merchantNo': {$in: merchantData.map(p => { if(p && p._id){return p._id}})}});

                                                    let operatorProm = dbconfig.collection_proposal.find(searchQ).populate({path: "type", model: dbconfig.collection_proposalType}).sort({createTime:-1}).lean();

                                                    // get success proposal count group by merchantNo, filter repeat user
                                                    let merchantProm = dbconfig.collection_proposal.aggregate(
                                                        {
                                                            $match: Object.assign({}, matchObj,{status:{$in: ["Success", "Approved"]}, 'data.topupType': onlineTopupTypeData._id})
                                                        }, {
                                                            $group: {
                                                                _id: "$data.merchantNo",
                                                                userIds: { $addToSet: "$data.playerObjId" },
                                                            }
                                                        }
                                                    ).read("secondaryPreferred");

                                                    return Promise.all([operatorProm, merchantProm]).then(
                                                        retData => {

                                                            if (retData && retData.length == 2){
                                                                let successMerchantData = retData[1];
                                                                let proposalInInterval = retData[0];

                                                                merchantData = merchantData.map(merchant => {
                                                                    merchant.proposalArr = [];
                                                                    merchant.successUserCount = 0;
                                                                    merchant.successUserIds = [];
                                                                    merchant.userCount = merchant.userIds.length;
                                                                    delete merchant.userIds; // save bandwidth
                                                                    successMerchantData.forEach(
                                                                        successMerchant => {
                                                                            if(merchant._id === successMerchant._id) {
                                                                                merchant.successUserCount = successMerchant.userIds.length;
                                                                                merchant.successUserIds =  successMerchant.userIds; // frontend need this to get unique user
                                                                            }
                                                                        }
                                                                    );

                                                                    // append in the proposal in the interval filter
                                                                    proposalInInterval.forEach( proposal => {
                                                                        if(proposal && proposal.data && proposal.data.merchantNo && proposal.data.merchantNo == merchant._id) {

                                                                            proposal.data.timeDifferenceInMins = (new Date(proposal.settleTime).getTime() - new Date(proposal.createTime.getTime()))/(1000*60);
                                                                            merchant.proposalArr.push(proposal);
                                                                        }
                                                                    });

                                                                    // filter interval
                                                                    if (timesValue){
                                                                        merchant.proposalArr = timeIntervalFiltering(merchant.proposalArr, operator, timesValue, timesValueTwo);
                                                                    }

                                                                    return merchant;
                                                                });
                                                                onlineTopupTypeData.merchantData = merchantData;
                                                                return onlineTopupTypeData;
                                                            }
                                                            else{
                                                                Promise.reject({
                                                                    name: "DataError",
                                                                    message: "Cannot find proposals"
                                                                });
                                                            }
                                                        }
                                                    )
                                                }
                                            )
                                        );
                                    }
                                );
                                return Q.all(innerProms);
                            }
                        );
                    //get success proposal count group by useragent, filter repeat user
                    let userAgentUserCountProm = dbconfig.collection_proposal.aggregate(
                        {
                            $match: Object.assign({}, matchObj,{status: "Success"})
                        }, {
                            $group: {
                                _id: "$data.userAgent",
                                userIds: { $addToSet: "$data.playerObjId" },
                            }
                        }
                    ).read("secondaryPreferred").then(
                        data => {
                            return {
                                userAgentUserCount: data && data[0] ? data[0].userIds.length : 0
                            }
                        }
                    );

                    proms.push(Q.all([prom, userAgentUserCountProm]));
                }

                return Q.all(proms).then(
                    (data) => {
                        //get total success proposal count, filter repeat user
                        return dbconfig.collection_proposal.aggregate(
                            {
                                $match: {
                                    createTime: {$gte: new Date(startDate), $lt: new Date(endDate)},
                                    type: onlineTopupType._id,
                                    status: "Success",
                                    $and: [{"data.topupType": {$exists: true}}, {'data.topupType':{$ne: ''}}/*, {'data.topupType': {$type: 'number'}}*/],
                                }
                            }, {
                                $group: {
                                    _id: null,
                                    userIds: { $addToSet: "$data.playerObjId" },
                                }
                            }
                        ).read("secondaryPreferred").then(
                            data1 => {
                                let totalUser = {
                                    totalUserCount: data1 && data1[0] ? data1[0].userIds.length : 0
                                };
                                return [data, totalUser]
                            }
                        )
                    }
                );
            }
        )

        function timeIntervalFiltering(item, operator, timesValue, timesValueTwo) {
            switch (operator) {
                case '<=':
                    item = item.filter(p => {
                        if (p && p.data && p.data.timeDifferenceInMins){
                            return p.data.timeDifferenceInMins <= timesValue
                        }
                    });
                    return item;
                    break;
                case '>=':
                    item = item.filter(p => {
                        if (p && p.data && p.data.timeDifferenceInMins){
                            return p.data.timeDifferenceInMins >= timesValue
                        }
                    });
                    return item;
                    break;
                case '=':
                    item = item.filter(p => {
                        if (p && p.data && p.data.timeDifferenceInMins){
                            return p.data.timeDifferenceInMins == timesValue
                        }
                    });
                    return item;
                    break;
                case 'range':
                    item = item.filter(p => {
                        if (p && p.data && p.data.timeDifferenceInMins){
                            return p.data.timeDifferenceInMins <= timesValueTwo && p.data.timeDifferenceInMins >= timesValue
                        }
                    });
                    return item;
                    break;
            }
        }
    },

    getTopupAnalysisByPlatform: (platformId, startDate, endDate, type, period) => {

        return dbconfig.collection_proposalType.findOne({
            platformId: platformId,
            name: type
        }).read("secondaryPreferred").lean().then(
            (TopupType) => {
                if (!TopupType) return Q.reject({name: 'DataError', message: 'Can not find proposal type'});

                let proms = [];
                let headCountFilterProms = [];
                let bankProms = [];
                let methodProms = [];
                let dayStartTime = new Date (startDate);
                let getNextDate;
                switch (period) {
                    case 'day':
                        getNextDate = function (date) {
                            let newDate = new Date(date);
                            return new Date(newDate.setDate(newDate.getDate() + 1));
                        }
                        break;
                    case 'week':
                        getNextDate = function (date) {
                            let newDate = new Date(date);
                            return new Date(newDate.setDate(newDate.getDate() + 7));
                        }
                        break;
                    case 'month':
                    default:
                        getNextDate = function (date) {
                            let newDate = new Date(date);
                            return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                        }
                }
                while (dayStartTime.getTime() < endDate.getTime()) {
                    var dayEndTime = getNextDate.call(this, dayStartTime);

                    let matchObj = {
                        createTime: {$gte: dayStartTime, $lt: dayEndTime},
                        type: TopupType._id,
                        inputDevice: {$in: [0, 1, 3, 5]},
                    };

                    let groupByObj = {
                        _id: "$inputDevice",
                        userIds: {$addToSet: {$cond: [{$or: [{$eq: ["$status", 'Success']},{$eq: ["$status", 'Approved']}]}, '$data.playerObjId', 0]}}, // remove duplicate player
                        amount: {$sum: {$cond: [{$or: [{$eq: ["$status", 'Success']},{$eq: ["$status", 'Approved']}]}, '$data.amount', 0]}}, // total topup amount with status: success
                        count: {$sum: 1}, // total number of proposal
                        successCount: {$sum: {$cond: [{$or: [{$eq: ["$status", 'Success']},{$eq: ["$status", 'Approved']}]}, 1, 0]}}, // total number of proposal with status: success
                    };

                    proms.push(dbconfig.collection_proposal.aggregate(
                        {
                            $match: matchObj
                        }, {
                            $group: groupByObj
                        }
                    ).read("secondaryPreferred").then(data => {
                            return dbconfig.collection_proposal.aggregate(
                                {
                                    $match:  Object.assign({}, matchObj,{status: "Success"})
                                }, {
                                    $group: {
                                        _id: null,
                                        userIds: { $addToSet: "$data.playerObjId" },
                                    }
                                }
                            ).read("secondaryPreferred").then( data1 => {
                                let totalUser = {
                                    totalUserCount: data1 && data1[0] ? data1[0].userIds.length : 0
                                };
                                return [data, totalUser]
                            })
                        })
                    );

                    if (type == 'ManualPlayerTopUp') {

                        bankProms.push(dbconfig.collection_proposal.aggregate(
                            {
                                $match: {
                                    createTime: {$gte: dayStartTime, $lt: dayEndTime},
                                    type: TopupType._id,
                                    $and: [{"data.depositMethod": {$exists: true}}, {"data.depositMethod": {$ne: ''}}, {"data.depositMethod": {$ne: null}} ],
                                    status: 'Success'
                                }
                            }, {
                                $group: {
                                    _id: "$data.bankTypeId",
                                    amount: {$sum: '$data.amount'},
                                }
                            }
                        ).read("secondaryPreferred"));


                        methodProms.push(dbconfig.collection_proposal.aggregate(
                            {
                                $match: {
                                    createTime: {$gte: dayStartTime, $lt: dayEndTime},
                                    type: TopupType._id,
                                    status: "Success",
                                    $and: [{"data.depositMethod": {$exists: true}}, {"data.depositMethod": {$ne: ''}}, {"data.depositMethod": {$ne: null}} ]
                                }
                            }, {
                                $group: {
                                    _id: "$data.depositMethod",
                                    amount: {$sum: '$data.amount'},
                                }
                            }
                        ).read("secondaryPreferred"));

                    }
                    dayStartTime = dayEndTime;
                }

                return Q.all([Q.all(proms), Q.all(bankProms), Q.all(methodProms)]).then(data => {

                    if (type == 'ManualPlayerTopUp') {
                        if (!data && !data[0] && !data[1] && !data[2]) {
                            return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
                        }
                        let result = [];
                        let tempDate = startDate;

                        data.forEach(topUpDetail => {

                            let res = topUpDetail.map(item => {
                                let obj = {date: tempDate, data: item}
                                tempDate = getNextDate(tempDate);
                                return obj;
                            });
                            result.push(res);
                            tempDate = startDate;
                        })
                        return result
                    }
                    else {
                        if (!data[0]) {
                            return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
                        }

                        let tempDate = startDate;

                        let res = data[0].map(item => {
                            let obj = {date: tempDate, data: item}
                            tempDate = getNextDate(tempDate);
                            return obj;
                        });
                        return res;
                    }
                });

            }
        )
    },

    getProfitDisplayDetailByPlatform: (platformId, startDate, endDate, playerBonusType, topUpType) => {

        let playerBonusProm = dbconfig.collection_proposalType.findOne({
            platformId: ObjectId(platformId),
            name: playerBonusType
        }).read("secondaryPreferred").lean().then(
            (detail) => {
                if (!detail) return Q.reject({name: 'DataError', message: 'Can not find proposal type'});

                let matchObj = {
                    createTime: {$gte: startDate, $lt: endDate},
                    type: detail._id,
                    status: {$in: ['Success', 'Approved']}
                };

                return dbconfig.collection_proposal.aggregate([
                    {$match: matchObj},
                    {
                        $group: {
                            _id: "$data.platformId",
                            amount: {$sum: "$data.amount"}
                        }
                    }
                ]).read("secondaryPreferred")

            }
        )

        let topUpProm = dbconfig.collection_proposalType.find({
            platformId: ObjectId(platformId),
            name: {$in: topUpType}
        }).read("secondaryPreferred").lean().then(
            (detail) => {
                if (!detail) return Q.reject({name: 'DataError', message: 'Can not find proposal type'});

                let typeId = detail.map( detailData => {return detailData._id});
                let matchObj = {
                    createTime: {$gte: startDate, $lt: endDate},
                    type: {$in: typeId},
                    status: {$in: ['Success', 'Approved']}
                };

                return dbconfig.collection_proposal.aggregate([
                    {$match: matchObj},
                    {
                        $group: {
                            _id: "$data.platformId",
                            amount: {$sum: "$data.amount"}
                        }
                    }
                ]).read("secondaryPreferred")

            }
        )

        return Q.all([playerBonusProm,topUpProm])
    },

    lockProposalByAdmin: (proposalId, adminId, adminName) => {
        if(!proposalId || !adminId){
            return;
        }

        return dbconfig.collection_proposal.findOneAndUpdate({proposalId: proposalId},{'data.lockedAdminId': adminId, 'data.lockedAdminName': adminName ,'data.followUpContent': ""});
    },

    unlockProposalByAdmin: (proposalId, adminId) => {
        if(!proposalId || !adminId){
            return;
        }

        return dbconfig.collection_proposal.findOneAndUpdate({proposalId: proposalId},{'data.lockedAdminId': "", 'data.lockedAdminName': "" ,'data.followUpContent': ""});
    },

    updateFollowUpContent: (proposalId, followUpContent) => {
        if(!proposalId){
            return;
        }

        return dbconfig.collection_proposal.findOneAndUpdate({proposalId: proposalId},{'data.followUpContent': followUpContent, 'data.followUpCompletedTime': new Date()});
    }

};

/*
 // The following functions ensure that proposals created with:
 //   playerId: ObjectId (common)
 // or:
 //   playerId: String (rare)
 //
 // will both be converted and stored in the form:
 //   player: ObjectId
 //   playerId: String
 //
 // But since changing the type of playerId will affect a lot of proposal executors and front-end code, we decided not
 // to do the refactor at this time.

 createProposal: function (proposalData) {
 return Q.resolve().then(
 () => replacePlayerIdIfNecessary(proposalData)
 ).then(
 () => fetchPlayerObjectIdIfNecessary(proposalData)
 ).then(
 () => {
 var proposal = new dbconfig.collection_proposal(proposalData);
 return proposal.save();
 }
 );
 },

 // Some callers are creating proposals with playerId type ObjectId.
 // Our policy is for playerId to be type String and player to be type ObjectId.
 // This modified such proposals to fit our policy.
 function replacePlayerIdIfNecessary (proposalData) {
 if (proposalData && proposalData.data && proposalData.data.playerId) {
 const givenPlayerId = proposalData.data.playerId;
 if (looksLikeObjectId(givenPlayerId)) {
 return dbPlayerInfo.getPlayerInfo({_id: givenPlayerId}).then(
 player => {
 if (player) {
 console.warn("Proposal was created with data.playerId as an ObjectId.  Converting ObjectId to playerId.");
 proposalData.data.player = player._id;
 proposalData.data.playerId = player.playerId;
 }
 }
 )
 }
 }
 return Q.resolve();
 }

 // If there is a playerId (String) property, ensure there is also a player (ObjectId) property.
 function fetchPlayerObjectIdIfNecessary (proposalData) {
 if (proposalData && proposalData.data && proposalData.data.playerId) {
 const playerId = proposalData.data.playerId;
 if (!looksLikeObjectId(proposalData.data.player)) {
 return dbPlayerInfo.getPlayerInfo({playerId: playerId}).then(
 player => {
 if (player) {
 proposalData.data.player = player._id;
 }
 }
 );
 }
 }
 return Q.resolve();
 }

 function looksLikeObjectId (thing) {
 const isObjectId = thing instanceof mongoose.Types.ObjectId;
 const looksLikeObjectId = String(thing).length === 24;
 return isObjectId || looksLikeObjectId;
 }
 */

// lets do the most basic version, refactor later
function insertRepeatCount(proposals, platformList) {
    return new Promise(function (resolve) {
        let typeIds = null;
        let getProposalTypesIdProm = typeIds ? Promise.resolve(typeIds) : getTopUpProposalTypeIds(platformList);
        let insertedProposals = [];

        if (!proposals || proposals.length === 0) {
            resolve([]);
        }

        let promises = [];

        for (let i = 0; i < proposals.length; i++) {
            let prom = new Promise(function (res) {
                let proposal = JSON.parse(JSON.stringify(proposals[i]));
                if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
                    insertedProposals[i] = handleSuccessProposal(proposal);
                    res();
                } else {
                    getProposalTypesIdProm.then(
                        typeIdData => {
                            typeIds = typeIdData;
                            return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
                        }
                    ).then(
                        () => {
                            insertedProposals[i] = proposal;
                            res();
                        }
                    )
                }
            });

            promises.push(prom);
        }

        Promise.all(promises).then(
            () => {
                resolve(insertedProposals);
            }
        );

        // NOTE: async loop will probably be necessary if t
        // asyncLoop(proposals.length, function (i, loop) {
        //     let proposal = JSON.parse(JSON.stringify(proposals[i]));
        //     if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
        //         insertedProposals[i] = handleSuccessProposal(proposal);
        //         loop();
        //     } else {
        //         getProposalTypesIdProm.then(
        //             typeIdData => {
        //                 typeIds = typeIdData;
        //                 return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
        //             }
        //         ).then(
        //             () => {
        //                 insertedProposals[i] = proposal;
        //                 loop();
        //             }
        //         )
        //     }
        //
        //
        // }, function returnResult() {
        //     resolve(insertedProposals);
        // });

        function handleFailureMerchant(proposal) {
            let merchantNo = proposal.data.merchantNo;
            let relevantTypeIds = merchantNo ? typeIds : [proposal.type];
            let alipayAccount = proposal.data.alipayAccount ? proposal.data.alipayAccount : "";
            let bankCardNoRegExp;

            if (proposal.data.bankCardNo) {
                let bankCardNoRegExpA = new RegExp(proposal.data.bankCardNo.substring(0, 6) + ".*");
                let bankCardNoRegExpB = new RegExp(".*" + proposal.data.bankCardNo.slice(-4));
                bankCardNoRegExp = [
                    {"data.bankCardNo": bankCardNoRegExpA},
                    {"data.bankCardNo": bankCardNoRegExpB}
                ];
            }

            let prevSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$lte: new Date(proposal.createTime)},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            let nextSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$gte: new Date(proposal.createTime)},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            if (merchantNo) {
                prevSuccessQuery["data.merchantNo"] = merchantNo;
                nextSuccessQuery["data.merchantNo"] = merchantNo;
            }

            if (alipayAccount) {
                prevSuccessQuery["data.alipayAccount"] = alipayAccount;
                nextSuccessQuery["data.alipayAccount"] = alipayAccount;
            }

            if (proposal.data.bankCardNo) {
                prevSuccessQuery["$and"] = bankCardNoRegExp;
                nextSuccessQuery["$and"] = bankCardNoRegExp;
            }

            let prevSuccessProm = dbconfig.collection_proposal.find(prevSuccessQuery).read("secondaryPreferred").sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find(nextSuccessQuery).read("secondaryPreferred").sort({createTime: 1}).limit(1);

            // for debug usage
            // let pS, nS, fISQ;

            return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                successData => {
                    let prevSuccess = successData[0];
                    let nextSuccess = successData[1];

                    let allCountQuery = {
                        type: {$in: relevantTypeIds}
                    };

                    let currentCountQuery = {
                        type: {$in: relevantTypeIds},
                        createTime: {
                            $lte: new Date(proposal.createTime)
                        }
                    };

                    let firstInStreakQuery = {
                        type: {$in: relevantTypeIds}
                    };

                    if (merchantNo) {
                        allCountQuery["data.merchantNo"] = merchantNo;
                        currentCountQuery["data.merchantNo"] = merchantNo;
                        firstInStreakQuery["data.merchantNo"] = merchantNo;
                    }

                    if (alipayAccount) {
                        allCountQuery["data.alipayAccount"] = alipayAccount;
                        currentCountQuery["data.alipayAccount"] = alipayAccount;
                        firstInStreakQuery["data.alipayAccount"] = alipayAccount;
                    }

                    if (proposal.data.bankCardNo) {
                        allCountQuery["$and"] = bankCardNoRegExp;
                        currentCountQuery["$and"] = bankCardNoRegExp;
                        firstInStreakQuery["$and"] = bankCardNoRegExp;
                    }

                    if (prevSuccess[0]) {
                        let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                        allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                        currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                        firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                    }

                    if (nextSuccess[0]) {
                        allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                        allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                    }

                    // for debug usage
                    // pS = prevSuccess[0];
                    // nS = nextSuccess[0];
                    // fISQ = firstInStreakQuery;

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).read("secondaryPreferred").count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).read("secondaryPreferred").count();
                    let firstInStreakProm = dbconfig.collection_proposal.find(firstInStreakQuery).read("secondaryPreferred").sort({createTime: 1}).limit(1);

                    return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                }
            ).then(
                countData => {
                    let allCount = countData[0];
                    let currentCount = countData[1];
                    let firstFailure = countData[2][0];

                    // for debug usage
                    // if (!firstFailure) {
                    //     console.log('t54lwtMaus')
                    //     console.log('proposal |||', proposal)
                    //     console.log('firstFailure |||', firstFailure)
                    //     console.log('prevSuccess |||', pS)
                    //     console.log('nextSuccess |||', nS)
                    //     console.log('firstInStreakQuery |||', fISQ)
                    //     console.log('prevSuccessQuery |||', prevSuccessQuery)
                    //     console.log('nextSuccessQuery |||', nextSuccessQuery)
                    // }

                    proposal.$merchantAllCount = allCount;
                    proposal.$merchantCurrentCount = currentCount;

                    if (!firstFailure || firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
                        proposal.$merchantGapTime = 0;
                    } else {
                        proposal.$merchantGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                    }
                    return proposal;
                }
            );
        }

        function handleFailurePlayer(proposal) {
            let playerName = proposal.data.playerName;

            let prevSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$lte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$gte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: 1}).limit(1);

            return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                successData => {
                    let prevSuccess = successData[0];
                    let nextSuccess = successData[1];

                    let allCountQuery = {
                        type: {$in: typeIds},
                        "data.playerName": playerName
                    };

                    let currentCountQuery = {
                        type: {$in: typeIds},
                        createTime: {
                            $lte: new Date(proposal.createTime)
                        },
                        "data.playerName": playerName
                    };

                    let firstInStreakQuery = {
                        type: {$in: typeIds},
                        "data.playerName": playerName
                    };

                    if (prevSuccess[0]) {
                        let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                        allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                        currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                        firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                    }

                    if (nextSuccess[0]) {
                        allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                        allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                    }

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                    let firstInStreakProm = dbconfig.collection_proposal.findOne(firstInStreakQuery);

                    return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                }
            ).then(
                countData => {
                    let allCount = countData[0];
                    let currentCount = countData[1];
                    let firstFailure = countData[2];

                    proposal.$playerAllCount = allCount;
                    proposal.$playerCurrentCount = currentCount;

                    if (!firstFailure || String(firstFailure.proposalId) === String(proposal.proposalId)) {
                        proposal.$playerGapTime = 0;
                    } else {
                        proposal.$playerGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                    }
                    return proposal;
                }
            );
        }

        function handleSuccessProposal(proposal) {
            proposal['$merchantAllCount'] = '-';
            proposal['$merchantCurrentCount'] = '-';
            proposal['$merchantGapTime'] = '-';
            proposal['$playerAllCount'] = '-';
            proposal['$playerCurrentCount'] = '-';
            proposal['$playerGapTime'] = '-';
            return proposal;
        }

    });
}

function insertPlayerRepeatCount(proposals, platformId) {
    return new Promise(function (resolve) {
        let insertedProposals = [];

        if (!proposals || proposals.length === 0) {
            resolve([]);
        }

        let promises = [];

        for (let i = 0; i < proposals.length; i++) {
            let prom = new Promise(function (res) {
                let proposal = JSON.parse(JSON.stringify(proposals[i]));

                Promise.all([handlePlayer(proposal)]).then(
                    () => {
                        insertedProposals[i] = proposal;
                        res();
                    }
                )

            });

            promises.push(prom);
        }

        Promise.all(promises).then(
            () => {
                resolve(insertedProposals);
            }
        );

        function handlePlayer(proposal) {
            let phoneNumber = proposal.data && proposal.data.phoneNumber? proposal.data.phoneNumber : "";
            let status = proposal.status ? proposal.status : "";
            let allCountQuery = {};
            let currentCountQuery = {};
            let previousCountQuery = {};
            let futureCountQuery = {};
            let futureManualCountQuery = {};
            let previousSuccessCreateTime;
            let futureFailCreateTime;

            allCountQuery = {
                "data.phoneNumber": phoneNumber
            };

            currentCountQuery = {
                createTime: {
                    $lte: new Date(proposal.createTime)
                },
                "data.phoneNumber": phoneNumber
            };

            previousCountQuery = {
                createTime: {
                    $lt: new Date(proposal.createTime)
                },
                "data.phoneNumber": phoneNumber
            };

            futureCountQuery = {
                createTime: {
                    $gt: new Date(proposal.createTime)
                },
                "data.phoneNumber": phoneNumber
            };

            futureManualCountQuery = {
                createTime: {
                    $gt: new Date(proposal.createTime)
                },
                "data.phoneNumber": phoneNumber,
                status: "Manual"
            };


            let allCountProm = dbconfig.collection_proposal.find(allCountQuery).lean().count();
            let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).lean().count();

            //check the count of success/manual proposal records before current record.
            let previousCountProm = dbconfig.collection_proposal.find(previousCountQuery).lean().then(previousRecords => {
                if (previousRecords && previousRecords.length > 0) {

                    previousRecords.map(p => {
                        if (p.status == constProposalStatus.SUCCESS || p.status == constProposalStatus.MANUAL) {
                            previousSuccessCreateTime = p.createTime;
                            return;
                        }
                    })
                }

                return;
            }).then(() => {
                if (previousSuccessCreateTime) {
                    return dbconfig.collection_proposal.find({
                        createTime: {$lte: new Date(previousSuccessCreateTime)},
                        "data.phoneNumber": phoneNumber
                    }).lean().count();
                }
            });

            //check the count of all proposal records after current record.
            let futureAllCountProm = dbconfig.collection_proposal.find(futureCountQuery).lean().count();

            //check the count of manual records after current record.
            let futureManualAllCountProm = dbconfig.collection_proposal.find(futureManualCountQuery).lean().count();

            //check the count of success/manual proposal records after current record
            let futureAfterSuccessCountProm = dbconfig.collection_proposal.find(futureCountQuery).lean().sort({createTime: 1}).then(futureRecords => {
                if (futureRecords && futureRecords.length > 0) {

                    futureRecords.map(f => {
                        if (f.status == constProposalStatus.SUCCESS || f.status == constProposalStatus.MANUAL) {
                            futureFailCreateTime = f.createTime;
                            return;
                        }
                    })
                }

                return;
            }).then(() => {
                if (futureFailCreateTime) {
                    return dbconfig.collection_proposal.find({
                        createTime: {$gt: new Date(futureFailCreateTime)},
                        "data.phoneNumber": phoneNumber
                    }).lean().count();
                }
            });

            return Promise.all([allCountProm, currentCountProm, previousCountProm, futureAllCountProm, futureAfterSuccessCountProm, futureManualAllCountProm]).then(
                countData => {
                    let allCount = countData[0]? countData[0]: 0;
                    let currentCount = countData[1]? countData[1]: 0;
                    let previousCount = countData[2] ? countData[2] : 0;
                    let futureSuccessCount = countData[3] ? countData[3] : 0;
                    let futureFailCount = countData[4] ? countData[4] : 0;
                    let futureManualCount = countData[5] ? countData[5] : 0;

                    if (previousCount) {
                        proposal.$playerAllCount = allCount - previousCount;
                        proposal.$playerCurrentCount = currentCount - previousCount;
                    } else {
                        proposal.$playerAllCount = allCount;
                        proposal.$playerCurrentCount = currentCount;
                    }

                    if (status == constProposalStatus.PENDING) {
                        if (futureFailCount) {
                            proposal.$playerAllCount = proposal.$playerAllCount - futureFailCount;
                        }
                        if(futureManualCount){
                            proposal.$playerAllCount = proposal.$playerAllCount - futureManualCount;
                        }
                    }else if(status == constProposalStatus.MANUAL) {
                        proposal.$playerAllCount = 1;
                        proposal.$playerCurrentCount = 1;
                    }else if(status == constProposalStatus.NOVERIFY) {
                        proposal.$playerAllCount = 1;
                        proposal.$playerCurrentCount = 1;
                    } else {
                        if (futureSuccessCount) {
                            proposal.$playerAllCount = proposal.$playerAllCount - futureSuccessCount;
                        }
                    }

                    return proposal;
                }
            );
        }
    });
}

function getTopUpProposalTypeIds(platformList) {
    let mainTopUpTypes = {
        $in: [
            constProposalType.PLAYER_TOP_UP,
            constProposalType.PLAYER_ALIPAY_TOP_UP,
            constProposalType.PLAYER_MANUAL_TOP_UP,
            constProposalType.PLAYER_WECHAT_TOP_UP,
            constProposalType.PLAYER_QUICKPAY_TOP_UP
        ]
    };

    let proposalTypeQuery = {
        name: mainTopUpTypes
    };

    if(platformList && platformList.length > 0){
        proposalTypeQuery.platformId = {$in: platformList}
    }

    return dbconfig.collection_proposalType.find(proposalTypeQuery).lean().then(
        proposalTypes => {
            return proposalTypes.map(type => {
                return type._id;
            });
        }
    );
}

function asyncLoop(count, func, callback) {
    let i = -1;

    let loop = function () {
        i++;
        if (i >= count) {
            if (callback) {
                callback();
            }
            return;
        }
        func(i, loop);
    };
    loop();
}

function getMinutesBetweenDates(startDate, endDate) {
    var diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / 60000);
}

function convertStringNumber(Arr) {
    let Arrs = JSON.parse(JSON.stringify(Arr));
    let result = []
    Arrs.forEach(item => {
        result.push(String(item));
    })
    Arrs.forEach(item => {
        result.push(Number(item));
    })
    return result;
}

function getTopupProposalData(itemArr, dayCount, platformId, startTime, endTime) {
    let promArr = [];

    if (itemArr && itemArr.length > 0) {
        itemArr.forEach(el => {
            let matchQuery = {};

            if (dayCount && el.type && !el.eventName && el.playerObjId && typeof el.playerObjId == 'string') {
                el.playerObjId = ObjectId(el.playerObjId);
            } else if (!dayCount && el.type && !el.eventName && el.playerObjId && el.playerObjId.length > 0) {
                let playerObjIdTempArr = []
                el.playerObjId.forEach(el => {
                    if (el && typeof el == 'string') {
                        playerObjIdTempArr.push(ObjectId(el));
                    }
                })

                if (playerObjIdTempArr && playerObjIdTempArr.length) {
                    el.playerObjId = playerObjIdTempArr;
                }
            }

            if (dayCount && el && el.playerObjId && el.lastRewardTime) {
                let newStartDate = new Date(el.lastRewardTime);
                let newEndDate = new Date(el.lastRewardTime);
                newEndDate.setDate(newEndDate.getDate() + dayCount);

                matchQuery = {
                    playerId: el.playerObjId,
                    platformId: platformId,
                    createTime: {
                        $gte: newStartDate,
                        $lt: newEndDate
                    }
                }
            }

            if (!dayCount && el && el.playerObjId && el.playerObjId.length > 0) {
                matchQuery = {
                    playerId: {$in: el.playerObjId},
                    platformId: platformId,
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    }
                }
            }

            promArr.push(
                dbconfig.collection_playerTopUpRecord.aggregate(
                    {
                        $match: {$and: [matchQuery]}
                    },
                    {
                        $group: {
                            _id: {playerId: "$playerId"},
                            totalTopupAmount: {$sum: "$amount"}
                        }
                    },
                    {
                        $group: {
                            _id: {eventName: el.eventName, type: el.type},
                            sumTotalTopupAmount: {$sum: "$totalTopupAmount"}
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            eventName: "$_id.eventName",
                            type: "$_id.type",
                            sumTotalTopupAmount: 1
                        }
                    }
                ).read("secondaryPreferred")
            )
        });
    }

    return promArr;
}

function filterTopupData(itemArr, dayCount) {
    let topupRecord = [];

    if (itemArr && itemArr.length) {
        itemArr.forEach(topup => {
            if (topup && topup.length) {
                topup.forEach(el => {
                    if (el && el.type && el.sumTotalTopupAmount) {
                        topupRecord.push({eventName: el.eventName, type: el.type, sumTotalTopupAmount: el.sumTotalTopupAmount});
                    }
                })
            }
        })
    }

    if (dayCount && topupRecord && topupRecord.length) {
        let tempArr = [];

        topupRecord.forEach(el => {
            if(el && el.eventName && el.type){
                var indexNo = tempArr.findIndex(n => n.eventName && n.type && (n.eventName.toString() == el.eventName.toString()) && (n.type.toString() == el.type.toString()));

                if(indexNo != -1){
                    tempArr[indexNo].sumTotalTopupAmount += el.sumTotalTopupAmount;
                }
                else{
                    tempArr.push({eventName: el.eventName, type: el.type, sumTotalTopupAmount: el.sumTotalTopupAmount});
                }
            } else if (el && !el.eventName && el.type) {
                var indexNo = tempArr.findIndex(n => !n.eventName && n.type && (n.type.toString() == el.type.toString()));

                if(indexNo != -1){
                    tempArr[indexNo].sumTotalTopupAmount += el.sumTotalTopupAmount;
                }
                else{
                    tempArr.push({eventName: null, type: el.type, sumTotalTopupAmount: el.sumTotalTopupAmount});
                }
            }

        });

        topupRecord = tempArr;
    }

    return topupRecord;
}

function getBonusProposalData(itemArr, dayCount, platformId, startTime, endTime) {
    let promArr = [];

    if (itemArr && itemArr.length > 0) {
        itemArr.forEach(el => {
            let matchQuery = {};

            if (dayCount && el.type && !el.eventName && el.playerObjId && typeof el.playerObjId == 'string') {
                el.playerObjId = ObjectId(el.playerObjId);
            } else if (!dayCount && el.type && !el.eventName && el.playerObjId && el.playerObjId.length > 0) {
                let playerObjIdTempArr = []
                el.playerObjId.forEach(el => {
                    if (el && typeof el == 'string') {
                        playerObjIdTempArr.push(ObjectId(el));
                    }
                })

                if (playerObjIdTempArr && playerObjIdTempArr.length) {
                    el.playerObjId = playerObjIdTempArr;
                }
            }

            if (dayCount && el && el.playerObjId && el.lastRewardTime) {
                let newStartDate = new Date(el.lastRewardTime);
                let newEndDate = new Date(el.lastRewardTime);
                newEndDate.setDate(newEndDate.getDate() + dayCount);

                matchQuery = {
                    'data.playerObjId': el.playerObjId,
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                    createTime: {
                        $gte: newStartDate,
                        $lt: newEndDate
                    },
                    "data.platformId": platformId
                }
            }

            if (!dayCount && el && el.playerObjId && el.playerObjId.length > 0) {
                matchQuery = {
                    'data.playerObjId': {$in: el.playerObjId},
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    "data.platformId": platformId
                }
            }


            promArr.push(
                dbconfig.collection_proposalType.findOne({platformId: platformId, name: constProposalType.PLAYER_BONUS}).then(
                    proposalType => {
                        if (proposalType){
                            if (proposalType._id) {
                                matchQuery.type = proposalType._id;
                            }

                            return dbconfig.collection_proposal.aggregate([
                                {
                                    $match: {$and: [matchQuery]}
                                },
                                {
                                    $group: {
                                        _id: "$data.playerObjId",
                                        totalBonusAmount: {$sum: "$data.amount"},

                                    }
                                },
                                {
                                    $group: {
                                        _id: {eventName: el.eventName, type: el.type},
                                        sumTotalBonusAmount: {$sum: "$totalBonusAmount"}
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        eventName: "$_id.eventName",
                                        type: "$_id.type",
                                        sumTotalBonusAmount: 1
                                    }
                                }
                            ]).read("secondaryPreferred");

                        }
                    })
            )
        });
    }

    return promArr;
}

function filterBonusData(itemArr, dayCount) {
    let bonusRecord = [];

    if (itemArr && itemArr.length) {
        itemArr.forEach(bonus => {
            if (bonus && bonus.length) {
                bonus.forEach(el => {
                    if (el && el.type && el.sumTotalBonusAmount) {
                        bonusRecord.push({eventName: el.eventName, type: el.type, sumTotalBonusAmount: el.sumTotalBonusAmount});
                    }
                })
            }
        })
    }

    if (dayCount && itemArr && itemArr.length) {
        let tempArr = [];

        bonusRecord.forEach(el => {
            if(el && el.eventName && el.type){
                var indexNo = tempArr.findIndex(n => n.eventName && n.type && (n.eventName.toString() == el.eventName.toString()) && (n.type.toString() == el.type.toString()));

                if(indexNo != -1){
                    tempArr[indexNo].sumTotalBonusAmount += el.sumTotalBonusAmount;
                }
                else{
                    tempArr.push({eventName: el.eventName, type: el.type, sumTotalBonusAmount: el.sumTotalBonusAmount});
                }
            } else if (el && !el.eventName && el.type) {
                var indexNo = tempArr.findIndex(n => !n.eventName && n.type && (n.type.toString() == el.type.toString()));

                if(indexNo != -1){
                    tempArr[indexNo].sumTotalBonusAmount += el.sumTotalBonusAmount;
                }
                else{
                    tempArr.push({eventName: null, type: el.type, sumTotalBonusAmount: el.sumTotalBonusAmount});
                }
            }

        });

        bonusRecord = tempArr;
    }

    return bonusRecord;
}

function autoEnableBonusPermission(proposalObj, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj) {
    return dbconfig.collection_proposal.findOneAndUpdate({
        _id: proposalObj._id,
        createTime: proposalObj.createTime
    }, {
        'data.remark': proposalObj.data.remark + "／执行后自动解禁"
    }).then(proposalData => {
        return dbconfig.collection_players.findOneAndUpdate({
            _id: playerObjId,
            platform: platformObjId
        }, {
            $set: {"permission.applyBonus": true}
        });
    }).then(playerData => {
        return dbPlayerUtil.addPlayerPermissionLog(null, platformObjId, playerObjId, remark, oldPermissionObj, newPermissionObj);
    });
}

function isBankInfoMatched(proposalData, playerId){
    if(!proposalData || !playerId){
        Promise.resolve();
    }

    let playerData = null;
    let platform = null;


    return dbconfig.collection_players.findOne({playerId: playerId})
        .populate({path: "platform", model: dbconfig.collection_platform}).lean()
        .then(
            player => {
                if(player){
                    playerData = player;
                }

                if(player.platform){
                    platform = player.platform;
                }

                let allProposalQuery = {
                    'data.platformId': ObjectId(player.platform._id),
                    // createTime: {$lt: proposalData.createTime},
                    $or: [{'data.playerObjId': ObjectId(proposalData.data.playerObjId)}]
                };

                if (proposalData.data.playerId) {
                    allProposalQuery["$or"].push({'data.playerId': proposalData.data.playerId});
                }
                if (proposalData.data.playerName) {
                    allProposalQuery["$or"].push({'data.playerName': proposalData.data.playerName});
                }

                return dbconfig.collection_proposal.find(allProposalQuery)
                    .populate({path: "type", model: dbconfig.collection_proposalType})
                    .sort({createTime: -1}).lean();

            },
            error => {
                return;
            }
        ).then(
            proposalList =>{
                if(proposalData.data && proposalData.data.bankAccountWhenApprove && proposalData.data.bankNameWhenApprove){
                    let dataToUpdate = {
                        "data.bankAccountWhenApprove": proposalData.data.bankAccountWhenApprove || "",
                        "data.bankNameWhenApprove": proposalData.data.bankNameWhenApprove || ""
                    };

                    return proposal.updateProposalData({_id: proposalData._id}, dataToUpdate).then(
                        () => {
                            return proposalList;
                        }
                    ).catch(errorUtils.reportError);
                }

                return proposalList;
            }
        ).then(
            proposals => {
                if(platform && platform.manualAuditAfterBankChanged){
                    if(proposals && proposals.length > 0){
                        let length = proposals.length;
                        for (let i = 0; i < length; i++) {
                            let proposal = proposals[i];
                            if (proposal && proposal.type && proposal.type.name && proposal.status && proposal.type.name == constProposalType.UPDATE_PLAYER_BANK_INFO && proposal.status == constProposalStatus.APPROVED) {
                                if (proposal.data) {
                                    if (proposal.data.bankAccount) {
                                        if (!playerData.bankAccount) {
                                            return false;
                                        } else if (proposal.data.bankAccount != playerData.bankAccount) {
                                            return false;
                                        }
                                    } else if (playerData.bankAccount) {
                                        return false;
                                    }
                                }

                                return true;
                            }
                        }
                    }
                }

                return true;
            }
        );
}

function getBonusDetail(platformId, startDate, endDate) {
    return dbconfig.collection_proposalType.find(
        {
            name: {$in: [constProposalType.PLAYER_BONUS, constProposalType.PARTNER_BONUS]},
            platformId: {$in: platformId}
        }, {_id: 1, name: 1}
    ).then(
        proposalTypeData => {
            if (proposalTypeData && proposalTypeData.length > 0) {
                let proposalObjIds = [];
                let proposalTypeObj = {};

                for (let i = 0, len = proposalTypeData.length; i < len; i++) {
                    let proposalType = proposalTypeData[i];

                    if (proposalType && proposalType._id) {
                        proposalObjIds.push(proposalType._id);
                        proposalTypeObj[proposalType._id] = proposalType.name;
                    }
                }

                if (proposalObjIds && proposalObjIds.length > 0) {
                    let query = {
                        "createTime": {
                            "$gte": new Date(startDate),
                            "$lte": new Date(endDate)
                        },
                        "data.platformId": {$in: platformId},
                        "mainType": 'PlayerBonus',
                        "type": {"$in": proposalObjIds},
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    };

                    return dbconfig.collection_proposal.aggregate([
                        {
                            "$match": query
                        },
                        {
                            "$group": {
                                "_id": {platformId: "$data.platformId", type: "$type"},
                                "amount": {"$sum": "$data.amount"}
                            }
                        },
                        {
                            "$group": {
                                "_id": "$_id.type",
                                bonusDetail: {
                                    $push: {
                                        platformId: "$_id.platformId",
                                        amount: "$amount"
                                    }
                                }
                            }
                        }
                    ]).read("secondaryPreferred").then(
                        bonusData => {
                            if (bonusData && bonusData.length > 0) {
                                for (let i = 0, len = bonusData.length; i < len; i++) {
                                    let bonus = bonusData[i];
                                    if (bonus && bonus._id) {
                                        bonus.typeName = proposalTypeObj[bonus._id];
                                    }
                                }

                                let tempBonusData = bonusData.reduce((a,item) => {
                                    let indexNo = a.findIndex(x => x.typeName === item.typeName);
                                    if (indexNo != -1) {
                                        if (item.bonusDetail && item.bonusDetail.length > 0) {
                                            item.bonusDetail.forEach(detail => {
                                                if (detail && detail.platformId) {
                                                    a[indexNo].bonusDetail.push({platformId: detail.platformId, amount: detail.amount});
                                                }
                                            })
                                        }

                                    } else {
                                        a.push({typeName: item.typeName, bonusDetail: item.bonusDetail});
                                    }
                                    return a;
                                }, []);

                                return tempBonusData;
                            }
                        }
                    );
                }
            }
        }
    );
}

function getPlatformFeeEstimate (platformId, startDate, endDate) {
    let query = {
        createTime: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        platformId: {$in: platformId},
        $or: [
            {isDuplicate: {$exists: false}},
            {
                $and: [
                    {isDuplicate: {$exists: true}},
                    {isDuplicate: false}
                ]
            }
        ]
    };

    return dbconfig.collection_playerConsumptionRecord.aggregate([
        {
            $match: query
        },
        {
            $group: {
                _id: {providerId: "$providerId", platformId: "$platformId"},
                bonusAmount: {$sum: "$bonusAmount"}
            }
        },
        {
            $group: {
                "_id": "$_id.platformId",
                providerDetail: {
                    $push: {
                        providerId: "$_id.providerId",
                        bonusAmount: "$bonusAmount"
                    }
                }
            }
        }
    ]).allowDiskUse(true).read("secondaryPreferred").then(
        consumptionData => {

            return dbconfig.collection_platformFeeEstimate.find({platform: {$in: platformId}}).populate({
                path: 'platformFee.gameProvider',
                model: dbconfig.collection_gameProvider
            }).then(
                feeData => {
                    if (consumptionData && consumptionData.length > 0) {
                        for (let i = 0, len = consumptionData.length; i < len; i++) {
                            let consumptionDetail = consumptionData[i];
                            let tempTotalPlatformFeeEstimate = 0;
                            if (consumptionDetail && consumptionDetail.providerDetail && consumptionDetail.providerDetail.length > 0) {
                                let indexNo = feeData.findIndex(x => x && x.platform && consumptionDetail && consumptionDetail._id && x.platform.toString() == consumptionDetail._id.toString());

                                if (indexNo != -1) {
                                    for (let j = 0, jLen = consumptionDetail.providerDetail.length; j < jLen; j++) {
                                        let tempConsumptionDetail = consumptionDetail.providerDetail[j];

                                        if (tempConsumptionDetail && feeData[indexNo] && feeData[indexNo].platformFee && feeData[indexNo].platformFee.length) {
                                            for (let k = 0, kLen = feeData[indexNo].platformFee.length; k < kLen; k++) {
                                                let provider = feeData[indexNo].platformFee[k];

                                                if (provider.gameProvider && provider.gameProvider._id && tempConsumptionDetail.providerId
                                                    && provider.gameProvider._id.toString() == tempConsumptionDetail.providerId.toString()) {
                                                    let gameProviderName = provider.gameProvider.name;
                                                    let feeRate = provider.feeRate ? provider.feeRate : 0;
                                                    tempConsumptionDetail.gameProviderName = gameProviderName;
                                                    tempConsumptionDetail.platformFeeEstimate = (tempConsumptionDetail.bonusAmount * -1) * feeRate;
                                                    tempTotalPlatformFeeEstimate += tempConsumptionDetail.platformFeeEstimate;
                                                }
                                            }

                                        }
                                    }
                                }
                            }
                            consumptionDetail.totalPlatformFeeEstimate = dbutility.noRoundTwoDecimalPlaces(tempTotalPlatformFeeEstimate);
                        }

                        return consumptionData;
                    }
                }
            );
        }
    );
}

function rearrangeBonusDetailByMutilplePlatform(bonusType, currentList, platformRecord) {
    let newObj = [];
    let tempBonusGroup = [];
    if (currentList && currentList.length > 0) {
        bonusType.forEach(type => {
            let indexNo = currentList.findIndex(x => x && type && x.typeName && type == x.typeName);

            if (indexNo != -1) {
                if (currentList[indexNo] && currentList[indexNo].bonusDetail && currentList[indexNo].bonusDetail.length  > 0) {
                    let platformTopUpDetail = [];
                    platformRecord.forEach(platform => {
                        let platformIndexNo = currentList[indexNo].bonusDetail.findIndex(y => y && y.platformId && platform && platform._id && y.platformId.toString() == platform._id.toString());
                        if (platformIndexNo != -1) {
                            platformTopUpDetail.push({
                                platformId: currentList[indexNo].bonusDetail[platformIndexNo].platformId,
                                platformName: platform.name,
                                amount: dbutility.noRoundTwoDecimalPlaces(currentList[indexNo].bonusDetail[platformIndexNo].amount)
                            })
                        } else {
                            platformTopUpDetail.push({
                                platformId: platform._id,
                                platformName: platform.name,
                                amount: 0
                            })
                        }
                    });

                    tempBonusGroup.push({
                        typeId: currentList[indexNo].typeName == constProposalType.PLAYER_BONUS ? 1 : 2,
                        typeName: currentList[indexNo].typeName,
                        bonusDetail: platformTopUpDetail,
                        subTotalAmount: currentList[indexNo].subTotalAmount
                    });
                }
            } else {
                let platformTopUpDetail = [];
                platformRecord.forEach(platform => {
                    platformTopUpDetail.push({
                        platformId: platform._id,
                        platformName: platform.name,
                        amount: 0
                    })
                });

                tempBonusGroup.push({
                    typeId: type == constProposalType.PLAYER_BONUS ? 1 : 2,
                    typeName: type,
                    bonusDetail: platformTopUpDetail,
                    subTotalAmount: 0
                });
            }
        })
    } else {
        bonusType.forEach(type => {
            let platformTopUpDetail = [];
            platformRecord.forEach(platform => {
                platformTopUpDetail.push({
                    platformId: platform._id,
                    platformName: platform.name,
                    amount: 0
                })
            });

            tempBonusGroup.push({
                typeId: type == constProposalType.PLAYER_BONUS ? 1 : 2,
                typeName: type,
                bonusDetail: platformTopUpDetail,
                subTotalAmount: 0
            });
        })
    }

    if (tempBonusGroup && tempBonusGroup.length > 0) {
        newObj.push({groups: tempBonusGroup});
    }

    return newObj;
}

function rearrangePlatformFeeEstimateDetailByMutilplePlatform(currentList, platformRecord) {
    let newObj = [];

    if (platformRecord && platformRecord.length > 0) {
        platformRecord.forEach(platform => {
            let platformIndexNo = currentList.findIndex(y => y && y._id && platform && platform._id && y._id.toString() == platform._id.toString());

            if (platformIndexNo != -1) {
                newObj.push({
                    platformId: currentList[platformIndexNo]._id,
                    platformName: platform.name,
                    totalPlatformFeeEstimate: dbutility.noRoundTwoDecimalPlaces(currentList[platformIndexNo].totalPlatformFeeEstimate)
                })
            } else {
                newObj.push({
                    platformId: platform._id,
                    platformName: platform.name,
                    totalPlatformFeeEstimate: 0
                })
            }
        });
    }
    return newObj;
}

function getTotalSumBonusDetail(platformId, startDate, endDate) {
    return dbconfig.collection_proposalType.find(
        {
            name: {$in: [constProposalType.PLAYER_BONUS, constProposalType.PARTNER_BONUS]},
            platformId: {$in: platformId}
        }, {_id: 1, name: 1}
    ).then(
        proposalTypeData => {
            if (proposalTypeData && proposalTypeData.length > 0) {
                let proposalObjIds = [];
                let proposalTypeObj = {};

                for (let i = 0, len = proposalTypeData.length; i < len; i++) {
                    let proposalType = proposalTypeData[i];

                    if (proposalType && proposalType._id) {
                        proposalObjIds.push(proposalType._id);
                        proposalTypeObj[proposalType._id] = proposalType.name;
                    }
                }

                if (proposalObjIds && proposalObjIds.length > 0) {
                    return dbconfig.collection_proposal.aggregate([
                        {
                            "$match": {
                                "createTime": {
                                    "$gte": new Date(startDate),
                                    "$lte": new Date(endDate)
                                },
                                "data.platformId": {$in: platformId},
                                "mainType": 'PlayerBonus',
                                "type": {"$in": proposalObjIds},
                                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                            }
                        },
                        {
                            "$group": {
                                "_id": "$data.platformId",
                                "amount": {"$sum": "$data.amount"}
                            }
                        }
                    ]).read("secondaryPreferred");
                }
            }
        }
    );
}

function rearrangeSumBonus (currentList, platformRecord) {
    let sumList = [];

    if (platformRecord && platformRecord.length > 0) {
        platformRecord.forEach(platform => {
            if (platform && platform._id) {
                let platformIndexNo = currentList.findIndex(x => x && x._id && x._id.toString() == platform._id.toString());

                if(platformIndexNo != -1) {
                    sumList.push({
                        platformId: currentList[platformIndexNo]._id,
                        platformName: platform.name,
                        amount: dbutility.noRoundTwoDecimalPlaces(currentList[platformIndexNo].amount)
                    })
                } else {
                    sumList.push({
                        platformId: platform._id,
                        platformName: platform.name,
                        amount: 0
                    })
                }
            }
        });
    }

    return sumList;
}

function getDepositGroup() {
    let groups = [];
    return dbconfig.collection_depositGroup.find({depositParentDepositId: -1}, {depositId: 1, depositName: 1}).lean().then(
        parentDepositData => {
            return dbconfig.collection_depositGroup.aggregate([
                {
                    "$match": {
                        "depositParentDepositId": {$ne: -1}
                    }
                },
                { $sort : { topUpTypeId : 1, topUpMethodId: 1 } },
                {
                    "$group": {
                        _id: "$depositParentDepositId",
                        groupDetail: {
                            $push: {
                                depositId: "$depositId",
                                depositName: "$depositName",
                                topUpTypeId: "$topUpTypeId",
                                topUpMethodId: "$topUpMethodId"
                            }
                        }
                    }
                }
            ]).then(
                depositGroup => {
                    if (parentDepositData && parentDepositData.length > 0) {
                        parentDepositData.forEach(parent => {
                            if (depositGroup && depositGroup.length > 0) {
                                let indexNo = depositGroup.findIndex(x => x && x._id == parent.depositId);

                                if (indexNo != -1) {
                                    if (depositGroup[indexNo] && depositGroup[indexNo].groupDetail && depositGroup[indexNo].groupDetail.length > 0) {
                                        let depositTypes = [];

                                        depositGroup[indexNo].groupDetail.forEach(depositType => {
                                            let typeIndexNo = depositTypes.findIndex(x => x && x.topUpTypeId && depositType && depositType.topUpTypeId && (x.topUpTypeId == depositType.topUpTypeId));

                                            if (typeIndexNo != -1) {
                                                depositTypes[typeIndexNo].methods.push({
                                                    depositId: depositType.depositId,
                                                    depositName: depositType.depositName,
                                                    topUpMethodId: depositType.topUpMethodId
                                                });
                                            } else {
                                                depositTypes.push({
                                                    topUpTypeId: depositType.topUpTypeId,
                                                    methods: [{
                                                        depositId: depositType.depositId,
                                                        depositName: depositType.depositName,
                                                        topUpMethodId: depositType.topUpMethodId
                                                    }]
                                                });
                                            }
                                        });

                                        groups.push({groupName: parent.depositName, groupId: parent.depositId, types: depositTypes});
                                    }
                                }
                            }
                        });

                        return groups;
                    }
                }
            )
        }
    );
}

function dailyTopUpDetail (depositGroupRecord, platform, startTime, endTime) {
    let topUpDetailProms = [];

    depositGroupRecord.forEach(depositGroup => {
        if (depositGroup && depositGroup.types && depositGroup.types.length > 0) {
            depositGroup.types.forEach(type => {
                if (type && type.topUpTypeId) {
                    let proposalType = '';
                    let methods = type.topUpTypeId == 1 || type.topUpTypeId == 2 ? type.methods.map(method => method.topUpMethodId.toString()) : [];
                    let methodsInNumber = type.topUpTypeId == 1 || type.topUpTypeId == 2 ? type.methods.map(method => method.topUpMethodId) : [];

                    if (type.topUpTypeId == 1) {
                        proposalType = constProposalType.PLAYER_MANUAL_TOP_UP;
                    } else if (type.topUpTypeId == 2) {
                        proposalType = constProposalType.PLAYER_TOP_UP;
                    } else if (type.topUpTypeId == 3) {
                        proposalType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                    } else if (type.topUpTypeId == 4) {
                        proposalType = constProposalType.PLAYER_WECHAT_TOP_UP;
                    }

                    topUpDetailProms.push(dbconfig.collection_proposalType.find({
                        name: proposalType,
                        platformId: {$in: platform}
                    }, {_id: 1}).lean().then(
                        proposalTypeData => {

                            if (proposalTypeData && proposalTypeData.length > 0) {
                                let match = [];
                                let query = {
                                    type: {$in: proposalTypeData.map(type => type._id)},
                                    createTime: {
                                        "$gte": new Date(startTime),
                                        "$lte": new Date(endTime)
                                    },
                                    'data.platformId': {$in: platform},
                                    mainType: "TopUp",
                                    status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                };

                                let group = {};
                                let project = {};

                                if (type.topUpTypeId == 1) {
                                    query['$or'] = [{'data.depositMethod': {"$in": methods}}, {'data.depositMethod': {"$in": methodsInNumber}}];

                                    // adding project just because is JSON, can predict the data type of depositMethod(number or string), it is a way to convert all to same data type
                                    project = {
                                        'data.depositMethod': {$substr:["$data.depositMethod",0,4]},
                                        'data.amount': 1
                                    };

                                    group = {
                                        _id: "$data.depositMethod",
                                        amount: {"$sum": "$data.amount"},
                                        topUpTypeId: {$first: type.topUpTypeId}
                                    };

                                    match = [
                                        {
                                            $match: query
                                        },
                                        {
                                            $project: project
                                        },
                                        {
                                            $group: group
                                        },
                                        {
                                            $project: {
                                                id: 1,
                                                amount: 1,
                                                topUpTypeId: 1
                                            }
                                        }
                                    ];

                                } else if (type.topUpTypeId == 2) {
                                    query['$or'] = [{'data.topupType': {"$in": methods}}, {'data.topupType': {"$in": methodsInNumber}}];

                                    // adding project just because is JSON, can predict the data type of topupType(number or string), it is a way to convert all to same data type
                                    project = {
                                        'data.topupType': {$substr:["$data.topupType",0,4]},
                                        'data.amount': 1
                                    };

                                    group = {
                                        _id: "$data.topupType",
                                        amount: {"$sum": "$data.amount"},
                                        topUpTypeId: {$first: type.topUpTypeId}
                                    };

                                    match = [
                                        {
                                            $match: query
                                        },
                                        {
                                            $project: project
                                        },
                                        {
                                            $group: group
                                        },
                                        {
                                            $project: {
                                                id: 1,
                                                amount: 1,
                                                topUpTypeId: 1
                                            }
                                        }
                                    ];
                                } else if (type.topUpTypeId == 3 || type.topUpTypeId == 4) {
                                    group = {
                                        _id: "$type",
                                        amount: {"$sum": "$data.amount"},
                                        topUpTypeId: {$first: type.topUpTypeId}
                                    };

                                    match = [
                                        {
                                            $match: query
                                        },
                                        {
                                            $group: group
                                        },
                                        {
                                            $project: {
                                                id: 1,
                                                amount: 1,
                                                topUpTypeId: 1
                                            }
                                        }
                                    ];
                                }

                                return dbconfig.collection_proposal.aggregate(match).read("secondaryPreferred");

                            }
                        }));
                }
            });
        }
    });

    return topUpDetailProms;
}

function sumTopUpDetail(depositGroupRecord, platform, startTime, endTime) {
    let topUpDetailProms = [];

    depositGroupRecord.forEach(depositGroup => {
        if (depositGroup && depositGroup.types && depositGroup.types.length > 0) {
            depositGroup.types.forEach(type => {
                if (type && type.topUpTypeId) {
                    let proposalType = '';
                    let methods = type.topUpTypeId == 1 || type.topUpTypeId == 2 ? type.methods.map(method => method.topUpMethodId.toString()) : [];
                    let methodsInNumber = type.topUpTypeId == 1 || type.topUpTypeId == 2 ? type.methods.map(method => method.topUpMethodId) : [];

                    if (type.topUpTypeId == 1) {
                        proposalType = constProposalType.PLAYER_MANUAL_TOP_UP;
                    } else if (type.topUpTypeId == 2) {
                        proposalType = constProposalType.PLAYER_TOP_UP;
                    } else if (type.topUpTypeId == 3) {
                        proposalType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                    } else if (type.topUpTypeId == 4) {
                        proposalType = constProposalType.PLAYER_WECHAT_TOP_UP;
                    }

                    topUpDetailProms.push(dbconfig.collection_proposalType.find({
                        name: proposalType,
                        platformId: {$in: platform}
                    }, {_id: 1}).lean().then(
                        proposalTypeData => {
                            if (proposalTypeData && proposalTypeData.length > 0) {
                                let match = [];
                                let query = {
                                    type: {$in: proposalTypeData.map(type => type._id)},
                                    createTime: {
                                        "$gte": new Date(startTime),
                                        "$lte": new Date(endTime)
                                    },
                                    'data.platformId': {$in: platform},
                                    mainType: "TopUp",
                                    status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                };

                                let group = {};
                                let group2 = {};
                                let project = {};

                                if (type.topUpTypeId == 1) {
                                    query['$or'] = [{'data.depositMethod': {"$in": methods}}, {'data.depositMethod': {"$in": methodsInNumber}}];

                                    // adding project just because is JSON, can predict the data type of depositMethod(number or string), it is a way to convert all to same data type
                                    project = {
                                        'data.depositMethod': {$substr:["$data.depositMethod",0,4]},
                                        'data.platformId' : 1,
                                        'data.amount': 1
                                    };

                                    group = {
                                        _id: {depositMethod: "$data.depositMethod", platformId: "$data.platformId"},
                                        amount: {"$sum": "$data.amount"}
                                    };

                                    group2 = {
                                        '_id': "$_id.depositMethod",
                                        topUpDetail: {$push: {platformId: "$_id.platformId", amount: "$amount"}},
                                        topUpTypeId: {$first: type.topUpTypeId}
                                    };

                                    match = [
                                        {
                                            $match: query
                                        },
                                        {
                                            $project: project
                                        },
                                        {
                                            $group: group
                                        },
                                        {
                                            $group: group2
                                        }
                                    ]
                                } else if (type.topUpTypeId == 2) {
                                    query['$or'] = [{'data.topupType': {"$in": methods}}, {'data.topupType': {"$in": methodsInNumber}}];

                                    // adding project just because is JSON, can predict the data type of topupType(number or string), it is a way to convert all to same data type
                                    project = {
                                        'data.topupType': {$substr:["$data.topupType",0,4]},
                                        'data.platformId' : 1,
                                        'data.amount': 1
                                    };

                                    group = {
                                        _id: {depositMethod: "$data.topupType" , platformId: "$data.platformId"},
                                        amount: {"$sum": "$data.amount"}
                                    };
                                    group2 = {
                                        '_id': "$_id.depositMethod",
                                        topUpDetail: {$push: {platformId: "$_id.platformId", amount: "$amount"}},
                                        topUpTypeId: {$first: type.topUpTypeId}
                                    };

                                    match = [
                                        {
                                            $match: query
                                        },
                                        {
                                            $project: project
                                        },
                                        {
                                            $group: group
                                        },
                                        {
                                            $group: group2
                                        }
                                    ]
                                } else if (type.topUpTypeId == 3 || type.topUpTypeId == 4) {
                                    group = {
                                        _id: {platformId: "$data.platformId"},
                                        amount: {"$sum": "$data.amount"}
                                    };
                                    group2 = {
                                        '_id': null,
                                        topUpDetail: {$push: {platformId: "$_id.platformId", amount: "$amount"}},
                                        topUpTypeId: {$first: type.topUpTypeId}
                                    };
                                    match = [
                                        {
                                            $match: query
                                        },
                                        {
                                            $group: group
                                        },
                                        {
                                            $group: group2
                                        }
                                    ]
                                }

                                return dbconfig.collection_proposal.aggregate(match).read("secondaryPreferred");

                            }
                        }));
                }
            });
        }
    });

    return topUpDetailProms;
}

function rearrangeSumTopUpDetailByDepositGroup (depositGroupRecord, topUpDetailData, platformRecord) {
    let groups = [];
    depositGroupRecord.forEach(group => {
        if (group && group.types && group.types.length > 0) {
            let methods = [];
            group.types.forEach(type => {
                if (type && type.methods && type.methods.length > 0) {
                    type.methods.forEach(method => {
                        if (method) {
                            let indexNo = topUpDetailData.findIndex(x => x && x.topUpTypeId && type.topUpTypeId &&
                                (((x.topUpTypeId == 1 || x.topUpTypeId == 2) && (x.topUpTypeId == type.topUpTypeId) && (x._id == method.topUpMethodId)) ||
                                    ((x.topUpTypeId == 3 || x.topUpTypeId == 3) && (x.topUpTypeId == type.topUpTypeId) && (method.depositName == 'ALIPAY' || method.depositName == 'WechatPay'))));

                            if (indexNo != -1) {
                                if (topUpDetailData[indexNo] && topUpDetailData[indexNo].topUpTypeId && topUpDetailData[indexNo].topUpTypeId == 3) {
                                    topUpDetailData[indexNo]._id = 3;
                                } else if (topUpDetailData[indexNo] && topUpDetailData[indexNo].topUpTypeId && topUpDetailData[indexNo].topUpTypeId == 4) {
                                    topUpDetailData[indexNo]._id = 4;
                                }

                                let platformTopUpDetail = [];
                                platformRecord.forEach(platform => {
                                    let platformIndexNo = topUpDetailData[indexNo].topUpDetail.findIndex(y => y && y.platformId && platform && platform._id && y.platformId.toString() == platform._id.toString());
                                    if (platformIndexNo != -1) {
                                        platformTopUpDetail.push({
                                            platformId: topUpDetailData[indexNo].topUpDetail[platformIndexNo].platformId,
                                            platformName: platform.name,
                                            amount: dbutility.noRoundTwoDecimalPlaces(topUpDetailData[indexNo].topUpDetail[platformIndexNo].amount)
                                        })
                                    } else {
                                        platformTopUpDetail.push({
                                            platformId: platform._id,
                                            platformName: platform.name,
                                            amount: 0
                                        })
                                    }
                                });

                                methods.push({
                                    topUpTypeId: type.topUpTypeId,
                                    topUpMethodId: Number(topUpDetailData[indexNo]._id),
                                    depositId: method.depositId,
                                    depositName: method.depositName,
                                    topUpDetail: platformTopUpDetail
                                });
                            } else {
                                if (type.topUpTypeId && type.topUpTypeId == 3) {
                                    method.topUpMethodId = 3;
                                } else if (type.topUpTypeId && type.topUpTypeId == 4) {
                                    method.topUpMethodId = 4;
                                }

                                let platformTopUpDetail = [];
                                platformRecord.forEach(platform => {
                                    platformTopUpDetail.push({
                                        platformId: platform._id,
                                        platformName: platform.name,
                                        amount: 0
                                    })
                                });

                                methods.push({
                                    topUpTypeId: type.topUpTypeId,
                                    topUpMethodId: method.topUpMethodId,
                                    depositId: method.depositId,
                                    depositName: method.depositName,
                                    topUpDetail: platformTopUpDetail
                                });
                            }
                        }
                    });
                }
            });

            let totalAmountList = [];
            if (methods && methods.length > 0) {
                methods.forEach(method => {
                    if (method && method.topUpDetail && method.topUpDetail.length > 0) {
                        method.topUpDetail.forEach(detail => {
                            let indexNo = totalAmountList.findIndex(x => x && x.platformId && detail && detail.platformId && (x.platformId.toString() == detail.platformId.toString()));

                            if (indexNo != -1) {
                                totalAmountList[indexNo].totalAmount += detail.amount;
                            } else {
                                totalAmountList.push({platformId: detail.platformId, platformName: detail.platformName, totalAmount: detail.amount});
                            }
                        });

                    }
                });
            }

            groups.push({groupName: group.groupName, groupId: group.groupId, topUpDetail: methods, totalAmountList: totalAmountList});
        }
    });

    return groups;
}

function rearrangeDailyTopUpDetailByDepositGroup (depositGroupRecord, topUpDetailData, currentDate){
    let groups = [];
    depositGroupRecord.forEach(group => {
        if (group && group.types && group.types.length > 0) {
            let methods = [];
            group.types.forEach(type => {
                if (type && type.methods && type.methods.length > 0) {
                    type.methods.forEach(method => {
                        if (method) {
                            let indexNo = topUpDetailData.findIndex(x => x && x.topUpTypeId && x._id && type.topUpTypeId &&
                                (((x.topUpTypeId == 1 || x.topUpTypeId == 2) && (x.topUpTypeId == type.topUpTypeId) && (x._id == method.topUpMethodId)) ||
                                    ((x.topUpTypeId == 3 || x.topUpTypeId == 3) && (x.topUpTypeId == type.topUpTypeId) && (method.depositName == 'ALIPAY' || method.depositName == 'WechatPay'))));

                            if (indexNo != -1) {
                                if (topUpDetailData[indexNo] && topUpDetailData[indexNo].topUpTypeId && topUpDetailData[indexNo].topUpTypeId == 3) {
                                    topUpDetailData[indexNo]._id = 3;
                                } else if (topUpDetailData[indexNo] && topUpDetailData[indexNo].topUpTypeId && topUpDetailData[indexNo].topUpTypeId == 4) {
                                    topUpDetailData[indexNo]._id = 4;
                                }
                                methods.push({
                                    topUpTypeId: type.topUpTypeId,
                                    topUpMethodId: Number(topUpDetailData[indexNo]._id),
                                    depositId: method.depositId,
                                    depositName: method.depositName,
                                    amount: dbutility.noRoundTwoDecimalPlaces(topUpDetailData[indexNo].amount)
                                });
                            } else {
                                if (type.topUpTypeId && type.topUpTypeId == 3) {
                                    method.topUpMethodId = 3;
                                } else if (type.topUpTypeId && type.topUpTypeId == 4) {
                                    method.topUpMethodId = 4;
                                }
                                methods.push({
                                    topUpTypeId: type.topUpTypeId,
                                    topUpMethodId: method.topUpMethodId,
                                    depositId: method.depositId,
                                    depositName: method.depositName,
                                    amount: 0
                                });
                            }
                        }
                    });
                }
            });

            let totalAmount = methods.reduce((sum, value) => sum + value.amount, 0) || 0;

            groups.push({groupName: group.groupName, groupId: group.groupId, topUpDetail: methods, totalAmount: dbutility.noRoundTwoDecimalPlaces(totalAmount)});
        }
    });

    return {date: currentDate, topUpList: groups};
}

function dailyBonusDetail(platform, startTime, endTime, currentDate, bonusTypeList) {
    return dbconfig.collection_proposalType.find(
        {
            name: {$in: [constProposalType.PLAYER_BONUS, constProposalType.PARTNER_BONUS]},
            platformId: {$in: platform}
        }, {_id: 1, name: 1}
    ).then(
        proposalTypeData => {
            if (proposalTypeData && proposalTypeData.length > 0) {
                let proposalObjIds = [];
                let proposalTypeObj = {};

                for (let i = 0, len = proposalTypeData.length; i < len; i++) {
                    let proposalType = proposalTypeData[i];

                    if (proposalType && proposalType._id) {
                        proposalObjIds.push(proposalType._id);
                        proposalTypeObj[proposalType._id] = proposalType.name;
                    }
                }

                if (proposalObjIds && proposalObjIds.length > 0) {
                    let query = {
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "data.platformId": {$in: platform},
                        "mainType": 'PlayerBonus',
                        "type": {"$in": proposalObjIds},
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    };

                    return dbconfig.collection_proposal.aggregate([
                        {
                            "$match": query
                        },
                        {
                            "$group": {
                                "_id": "$type",
                                "amount": {"$sum": "$data.amount"}
                            }
                        }
                    ]).read("secondaryPreferred").then(
                        bonusData => {
                            if (bonusData && bonusData.length > 0) {
                                for (let i = 0, len = bonusData.length; i < len; i++) {
                                    let bonusType = bonusData[i];

                                    if (bonusType && bonusType._id) {
                                        bonusType.typeName = proposalTypeObj[bonusType._id];
                                        delete bonusType._id;
                                    }
                                }
                            }

                            let bonusGroup = [];
                            let bonusDetail = [];
                            bonusTypeList.forEach(type => {
                                if (type) {
                                    let indexNo = bonusData.findIndex(x => x && x.typeName == type);
                                    let typeId = type == constProposalType.PLAYER_BONUS ? 1 : 2;

                                    if (indexNo != -1) {
                                        bonusDetail.push({typeId: typeId, typeName: bonusData[indexNo].typeName, amount: dbutility.noRoundTwoDecimalPlaces(bonusData[indexNo].amount)});
                                    } else {
                                        bonusDetail.push({typeId: typeId, typeName: type, amount: 0});
                                    }
                                }
                            });

                            let totalAmount = bonusDetail.reduce((sum, value) => sum + value.amount, 0) || 0;

                            bonusGroup.push({bonusDetail: bonusDetail, totalAmount: dbutility.noRoundTwoDecimalPlaces(totalAmount)});

                            return {date: currentDate, bonusList: bonusGroup};
                        }
                    );
                }
            }
        }
    )
}

function dailyPlatformFeeEstimateDetail (platform, startTime, endTime, currentDate) {
    return dbconfig.collection_playerConsumptionRecord.aggregate([
        {
            $match: {
                createTime: {
                    $gte: new Date(startTime),
                    $lte: new Date(endTime)
                },
                platformId: {$in: platform},
                $or: [
                    {isDuplicate: {$exists: false}},
                    {
                        $and: [
                            {isDuplicate: {$exists: true}},
                            {isDuplicate: false}
                        ]
                    }
                ]
            }
        },
        {
            $group: {
                _id: "$providerId",
                bonusAmount: {$sum: "$bonusAmount"}
            }
        }
    ]).allowDiskUse(true).read("secondaryPreferred").then(
        consumptionData => {

            return dbconfig.collection_platformFeeEstimate.find({platform: {$in: platform}}).populate({
                path: 'platformFee.gameProvider',
                model: dbconfig.collection_gameProvider
            }).then(
                feeData => {
                    let platformFeeEstimateGroup = [];
                    let totalPlatformFeeEstimate = 0;

                    if (consumptionData && consumptionData.length > 0) {
                        for (let i = 0, len = consumptionData.length; i < len; i++) {
                            let consumptionDetail = consumptionData[i];

                            if (consumptionDetail && feeData && feeData[0] && feeData[0].platformFee && feeData[0].platformFee.length) {
                                for (let k = 0, kLen = feeData[0].platformFee.length; k < kLen; k++) {
                                    let provider = feeData[0].platformFee[k];

                                    if (provider.gameProvider && provider.gameProvider._id && consumptionDetail._id
                                        && provider.gameProvider._id.toString() == consumptionDetail._id.toString()) {
                                        let gameProviderName = provider.gameProvider.name;
                                        let feeRate = provider.feeRate ? provider.feeRate : 0
                                        consumptionDetail.gameProviderName = gameProviderName;
                                        consumptionDetail.platformFeeEstimate = (consumptionDetail.bonusAmount * -1) * feeRate;
                                    }
                                }
                            }
                        }
                        totalPlatformFeeEstimate = consumptionData.reduce((sum, value) => sum + value.platformFeeEstimate, 0) || 0;

                        platformFeeEstimateGroup.push({totalPlatformFeeEstimate: dbutility.noRoundTwoDecimalPlaces(totalPlatformFeeEstimate), consumptionDetail: consumptionData});
                    } else {
                        platformFeeEstimateGroup.push({totalPlatformFeeEstimate: totalPlatformFeeEstimate, consumptionDetail: []});
                    }

                    return {date: currentDate, platformFeeEstimate: platformFeeEstimateGroup};
                }
            );
        }
    )
}

var proto = proposalFunc.prototype;
proto = Object.assign(proto, proposal);

// This make WebStorm navigation work
module.exports = proposal;
