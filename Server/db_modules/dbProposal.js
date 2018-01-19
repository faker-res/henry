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
var pmsAPI = require('../externalAPI/pmsAPI');
var moment = require('moment-timezone');
var errorUtils = require("../modules/errorUtils.js");
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constSystemParam = require("../const/constSystemParam.js");
const constServerCode = require("../const/constServerCode.js");
const constPlayerTopUpType = require("../const/constPlayerTopUpType");
const constMaxDateTime = require("../const/constMaxDateTime");
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
     * @param {string} platformId -
     * @param {string} typeName - Type name
     * @param {Object} proposalData - The data of the proposal
     */
    createProposalWithTypeName: function (platformId, typeName, proposalData) {
        let deferred = Q.defer();
        let plyProm = null;
        // create proposal for partner
        if (proposalData.isPartner) {
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
                    return dbPlayerInfo.tryToDeductCreditFromPlayer(proposalData.data.playerObjId, platformId, -proposalData.data.updateAmount, "editPlayerCredit:Deduction", proposalData.data);
                }
                return true;
            }
        ).then(
            () => {
                return proposal.createProposalWithTypeNameWithProcessInfo(platformId, typeName, proposalData)
            })
    },

    applyRepairCreditTransfer: function (platformId, proposalData) {
        function isTransferIdRepaired(transferId) {
            return dbconfig.collection_playerCreditTransferLog.find({transferId, isRepaired: true}, {_id: 1}).limit(1).lean().then(
                log => {
                    return Boolean(log && log[0]);
                }
            );
        }

        return isTransferIdRepaired(proposalData.data.transferId).then(
            isRepaired => {
                if (isRepaired) {
                    return Promise.reject({
                        name: "DBError",
                        message: "This transfer has been repaired."
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

                    if (data[0].name == constProposalType.PLAYER_TOP_UP || data[0].name == constProposalType.PLAYER_MANUAL_TOP_UP ||
                        data[0].name == constProposalType.PLAYER_ALIPAY_TOP_UP || data[0].name == constProposalType.PLAYER_WECHAT_TOP_UP
                        || data[0].name == constProposalType.PLAYER_QUICKPAY_TOP_UP
                    ) {
                        bExecute = false;
                        proposalData.status = constProposalStatus.PREPENDING;
                    }

                    //for consumption return request, skip proposal flow
                    // if (proposalData.data && proposalData.data.bConsumptionReturnRequest) {
                    //     bExecute = true;
                    //     proposalData.noSteps = true;
                    //     proposalData.process = null;
                    //     proposalData.status = constProposalStatus.APPROVED;
                    // }
                    //check if player or partner has pending proposal for this type
                    let queryObj = {
                        type: proposalData.type,
                        "data.platformId": data[0].platformId,
                        status: {$in: [constProposalStatus.PENDING, constProposalStatus.PROCESSING, constProposalStatus.AUTOAUDIT]}
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
                    }

                    // attach player info if available
                    if (data[2]) {
                        if (proposalData.isPartner) {
                            proposalData.data.partnerName = data[2].partnerName;
                            proposalData.data.playerStatus = data[2].status;
                            proposalData.data.proposalPartnerLevel = data[2].level.name;
                            proposalData.data.proposalPartnerLevelValue = data[2].level.value;
                        }
                        else {
                            proposalData.data.playerName = data[2].name;
                            proposalData.data.playerStatus = data[2].status;
                            proposalData.data.proposalPlayerLevelValue = data[2].playerLevel.value;
                            proposalData.data.playerLevelName = data[2].playerLevel.name;
                            proposalData.data.proposalPlayerLevel = data[2].playerLevel.name;
                        }
                    }

                    // SCHEDULED AUTO APPROVAL
                    if (proposalTypeData.name == constProposalType.PLAYER_BONUS && proposalData.data.isAutoApproval) {
                        proposalData.status = constProposalStatus.AUTOAUDIT;
                    }

                    return dbconfig.collection_proposal.findOne(queryObj).lean().then(
                        pendingProposal => {
                            //for online top up and player consumption return, there can be multiple pending proposals
                            if (pendingProposal
                                && data[0].name != constProposalType.PLAYER_TOP_UP
                                && data[0].name != constProposalType.PLAYER_CONSUMPTION_RETURN
                                && data[0].name != constProposalType.PLAYER_REGISTRATION_INTENTION
                                && data[0].name != constProposalType.PLAYER_CONSECUTIVE_REWARD_GROUP
                                && data[0].name != constProposalType.PLAYER_LEVEL_MIGRATION
                                && data[0].name != constProposalType.PLAYER_LEVEL_UP
                            ) {
                                deferred.reject({
                                    name: "DBError",
                                    message: "Player or partner already has a pending proposal for this type"
                                });
                            }
                            else {
                                var proposalProm = proposal.createProposal(proposalData);
                                var platProm = dbconfig.collection_platform.findOne({_id: data[0].platformId});
                                return Q.all([proposalProm, platProm, data[0].expirationDuration]);
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
                    if(data[0].mainType == constProposalMainType.PlayerConvertRewardPoints){
                        dbRewardPointsLog.createRewardPointsLogByProposalData(data[0]);
                    }

                    //notify the corresponding clients with new proposal
                    var wsMessageClient = serverInstance.getWebSocketMessageClient();
                    let expiredDate = null;

                    if (wsMessageClient) {
                        wsMessageClient.sendMessage(constMessageClientTypes.MANAGEMENT, "management", "notifyNewProposal", data);
                    }

                    if (data[2] == 0) {
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
                    if (proposalData && proposalData.data && proposalData.data.phone) {
                        proposalData.data.phone = dbutility.encodePhoneNum(proposalData.data.phone);
                    }
                    if (proposalData && proposalData.data && proposalData.data.phoneNumber) {
                        proposalData.data.phoneNumber = dbutility.encodePhoneNum(proposalData.data.phoneNumber);
                    }

                    if (proposalData && proposalData.type && platform.indexOf(proposalData.type.platformId.toString()) > -1) {
                        return proposalData;
                    } else {
                        return null;
                    }
                }
            )
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
    updatePlayerIntentionRemarks: function (id, remarks) {
        let updateData = {};
        updateData['data.remarks'] = remarks;
        return dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate({_id: ObjectId(id)}, updateData, {new: true}).exec();
    },
    updateTopupProposal: function (proposalId, status, requestId, orderStatus) {
        var proposalObj = null;
        var type = constPlayerTopUpType.ONLINE;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                proposalObj = proposalData;
                if (proposalData && proposalData.data && proposalData.data.bankCardType != null) {
                    type = constPlayerTopUpType.MANUAL;
                }
                if (proposalData && proposalData.data && (proposalData.data.alipayAccount != null || proposalData.data.alipayQRCode != null)) {
                    type = constPlayerTopUpType.ALIPAY;
                }
                if (proposalData && proposalData.data && (proposalData.data.weChatAccount != null || proposalData.data.weChatQRCode != null)) {
                    type = constPlayerTopUpType.WECHAT;
                }
                if (proposalData && proposalData.data && (proposalData.status == constProposalStatus.PREPENDING ||
                        proposalData.status == constProposalStatus.PENDING || proposalData.status == constProposalStatus.PROCESSING
                        || proposalData.status == constProposalStatus.EXPIRED || proposalData.status == constProposalStatus.RECOVER
                        || proposalData.status == constProposalStatus.CANCEL) && proposalData.data &&
                    (proposalData.data.requestId == requestId || !proposalData.data.requestId)) {
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
                    return dbPlayerInfo.updatePlayerTopupProposal(proposalId, true);
                } else if (status == constProposalStatus.FAIL) {
                    return dbPlayerInfo.updatePlayerTopupProposal(proposalId, false);
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
            data => ({
                proposalId: proposalId,
                orderStatus: orderStatus,
                depositId: requestId,
                type: type
            }),
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
                if (proposalData && (proposalData.status == constProposalStatus.APPROVED || proposalData.status == constProposalStatus.PENDING || proposalData.status == constProposalStatus.AUTOAUDIT
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
        ).then(
            function (data) {
                //todo::add proposal or process status check here
                // if (data && remark) {
                //     dbconfig.collection_proposal.findOneAndUpdate({_id: proposalId, createTime: data.createTime}, {
                //         $addToSet: {remark: {admin: adminId, content: remark}}
                //     }, {new: true}).exec();
                // }
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
                if (data && data.currentStep && data.steps) {
                    var curTime = new Date();
                    nextStepId = bApprove ? data.currentStep.nextStepWhenApprove : data.currentStep.nextStepWhenReject;
                    var stepData = {
                        status: bApprove ? constProposalStepStatus.APPROVED : constProposalStepStatus.REJECTED,
                        operator: adminId,
                        memo: memo,
                        operationTime: curTime,
                        isLocked: null
                    };

                    return dbconfig.collection_proposalProcessStep.findOneAndUpdate(
                        {_id: data.currentStep._id, createTime: data.currentStep.createTime},
                        stepData
                    ).exec();
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't find proposal process"});
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error finding proposal process", error: err});
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
                                    )
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
                deferred.reject({name: "DBError", message: "Error creating proposal process step", error: err});
            }
        );
        return deferred.promise;
    },

    cancelProposal: function (proposalId, adminId, remark) {
        return dbconfig.collection_proposal.findOne({_id: proposalId})
            .populate({path: "process", model: dbconfig.collection_proposalProcess})
            .populate({path: "type", model: dbconfig.collection_proposalType})
            .then(
                function (proposalData) {
                    if (proposalData) {
                        var reject = true;
                        var proposalStatus = proposalData.status || proposalData.process.status;
                        if (proposalData.creator.name.toString() != adminId.toString()) {
                            reject = false;
                        } else if (proposalStatus != constProposalStatus.PENDING && proposalStatus !== constProposalStatus.AUTOAUDIT) {
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
                                            "data.cancelBy": "客服：" + adminId
                                        },
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

    getQueryApprovalProposalsForAdminId: function (adminId, platformId, typeArr, credit, relateUser, startTime, endTime, index, size, sortCol) {//need
        var proposalTypesId = [];
        var proposalStatus = [];
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
                        if (typeArr.indexOf(data[0][i].name) != -1) {
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
                        if (!data[i].type || typeArr.indexOf(data[i].type.name) != -1) {
                            processIds.push(data[i]._id);
                        }
                    }
                    var queryObj = {
                        type: {$in: proposalTypesId},
                        createTime: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        process: {$in: processIds},
                        noSteps: false,
                        status: constProposalStatus.PENDING
                    };
                    if (relateUser) {
                        queryObj["data.playerName"] = relateUser
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
                    );
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

    getQueryProposalsForPlatformId: function (platformId, typeArr, statusArr, credit, userName, relateUser, relatePlayerId, entryType, startTime, endTime, index, size, sortCol, displayPhoneNum, playerId, eventName, promoTypeName, inputDevice) {//need
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
                            dbconfig.collection_proposal.find(queryObj).read("secondaryPreferred")
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
                                                        item.data.updateData.phoneNumber = dbutility.encodePhoneNum(item.data.updateData.phoneNumber);
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
                                }, {$sort: sortCol}, {$skip: index}, {$limit: size}).then(
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
                                }).read("secondaryPreferred");
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
                            phoneNumber: rsaCrypto.encrypt(phoneNumber)
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
                                proposalTypesId.push(types[i]._id);
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

                            if (d && d.playerId && d.playerId == returnData[0][i].data.playerId) {
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
        count = Math.min(count, constSystemParam.REPORT_MAX_RECORD_NUM)
        sortObj = sortObj || {};
        var dataDeferred = Q.defer();
        var deferred = Q.defer();
        var proposalTypeList = [];
        var queryData = reqData;
        var resultArray = null;
        var totalSize = 0;
        var summary = {};

        if (reqData.status) {
            if (reqData.status == constProposalStatus.SUCCESS) {
                reqData.status = {
                    $in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]
                };
            }
            if (reqData.status == constProposalStatus.FAIL) {
                reqData.status = {
                    $in: [constProposalStatus.FAIL, constProposalStatus.REJECTED]
                };
            }
        }
        if (!reqData.type && reqData.platformId) {
            dbconfig.collection_proposalType.find({platformId: (ObjectId(reqData.platformId))}).then(
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
                    }).count();
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
                    ]);
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

            let a = dbconfig.collection_proposal.find(reqData).lean().count();
            let b = dbconfig.collection_proposal.find(reqData).sort(sortObj).skip(index).limit(count)
                .populate({path: "type", model: dbconfig.collection_proposalType})
                .populate({path: "process", model: dbconfig.collection_proposalProcess}).lean();
            let c = dbconfig.collection_proposal.aggregate([
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
            ]);
            Q.all([a, b, c]).then(
                function (data) {
                    totalSize = data[0];
                    resultArray = Object.assign([], data[1]);
                    summary = data[2];
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
                var total = 0;
                if (summary[0]) {
                    total += summary[0].totalAmount;
                    total += summary[0].totalRewardAmount;
                    total += summary[0].totalTopUpAmount;
                    total += summary[0].totalUpdateAmount;
                    total += summary[0].totalNegativeProfitAmount;
                    total += summary[0].totalCommissionAmount;
                }
                deferred.resolve({
                    size: totalSize,
                    data: resultArray,
                    summary: {amount: parseFloat(total).toFixed(2)},
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
                    "data.eventCode": code
                } : {
                    createTime: {
                        $gte: new Date(startTime),
                        $lt: new Date(endTime)
                    },
                    mainType: constProposalMainType['PlayerConsumptionReturn'],
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
                        applyAmount: parseFloat(temp.sum3 + temp.sumApplyAmount).toFixed(2) // the one that use for 'total' on the page
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
        return dbconfig.collection_proposal.update(
            {
                status: constProposalStatus.PENDING,
                "data.validTime": {$lt: new Date()}
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
        return dbconfig.collection_proposal.update(
            {
                status: constProposalStatus.PENDING,
                expirationTime: {$lt: new Date()}
            },
            {
                status: constProposalStatus.EXPIRED
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
            query['data.proposalId'] = data.proposalNo;
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
function insertRepeatCount(proposals, platformId) {
    return new Promise(function (resolve) {
        let typeIds = null;
        let getProposalTypesIdProm = typeIds ? Promise.resolve(typeIds) : getTopUpProposalTypeIds(platformId);
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

            let prevSuccessProm = dbconfig.collection_proposal.find(prevSuccessQuery).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find(nextSuccessQuery).sort({createTime: 1}).limit(1);

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

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                    let firstInStreakProm = dbconfig.collection_proposal.find(firstInStreakQuery).sort({createTime: 1}).limit(1);

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

                    if (firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
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
            let phoneNumber = proposal.data ? proposal.data.phoneNumber : "";
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
                    let allCount = countData[0];
                    let currentCount = countData[1];
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
                    } else if(status == constProposalStatus.MANUAL) {
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

function getTopUpProposalTypeIds(platformId) {
    let mainTopUpTypes = {
        $in: [
            constProposalType.PLAYER_TOP_UP,
            constProposalType.PLAYER_ALIPAY_TOP_UP,
            constProposalType.PLAYER_MANUAL_TOP_UP,
            constProposalType.PLAYER_WECHAT_TOP_UP,
            constProposalType.PLAYER_QUICKPAY_TOP_UP
        ]
    };

    return dbconfig.collection_proposalType.find({platformId: platformId, name: mainTopUpTypes}).lean().then(
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

var proto = proposalFunc.prototype;
proto = Object.assign(proto, proposal);

// This make WebStorm navigation work
module.exports = proposal;
