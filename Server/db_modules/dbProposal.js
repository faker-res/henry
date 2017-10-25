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
var dbProposalProcess = require('./../db_modules/dbProposalProcess');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPartner = require('./../db_modules/dbPartner');
var proposalExecutor = require('./../modules/proposalExecutor');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbutility = require('./../modules/dbutility');
var pmsAPI = require('../externalAPI/pmsAPI');
var moment = require('moment-timezone');
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constSystemParam = require("../const/constSystemParam.js");
const constServerCode = require("../const/constServerCode.js");
const constPlayerTopUpType = require("../const/constPlayerTopUpType");

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

    createProposalWithTypeNameWithProcessInfo: function (platformId, typeName, proposalData) {
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

                    if (data[1]._id) {
                        proposalData.process = data[1]._id;
                        proposalData.status = constProposalStatus.PENDING;
                    }
                    else if (data[1] === constSystemParam.PROPOSAL_NO_STEP) {
                        bExecute = true;
                        proposalData.noSteps = true;
                        proposalData.status = proposalData.status || constProposalStatus.APPROVED;
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

                    // SCHEDULED AUTO APPROVAL - DISABLED FOR CSTEST
                    if (proposalTypeData.name == constProposalType.PLAYER_BONUS && proposalData.data.isAutoApproval) {
                        proposalData.status = constProposalStatus.AUTOAUDIT;
                    }

                    return dbconfig.collection_proposal.findOne(queryObj).lean().then(
                        pendingProposal => {
                            //for online top up and player consumption return, there can be multiple pending proposals
                            if (pendingProposal && data[0].name != constProposalType.PLAYER_TOP_UP && data[0].name != constProposalType.PLAYER_CONSUMPTION_RETURN
                                && data[0].name != constProposalType.PLAYER_REGISTRATION_INTENTION) {
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
                    //notify the corresponding clients with new proposal
                    var wsMessageClient = serverInstance.getWebSocketMessageClient();
                    let expiredDate = null;

                    if (wsMessageClient) {
                        wsMessageClient.sendMessage(constMessageClientTypes.MANAGEMENT, "management", "notifyNewProposal", data);
                    }

                    if (data[2] == 0) {
                        expiredDate = data[0].createTime;
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
                    if(proposalData.data.phone){
                        proposalData.data.phone = dbutility.encodePhoneNum(proposalData.data.phone);
                    }
                    if(proposalData.data.phoneNumber){
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
                    || proposalData.status == constProposalStatus.EXPIRED || proposalData.status == constProposalStatus.RECOVER) && proposalData.data &&
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
                        status: constServerCode.INVALID_PROPOSAL,
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
                                () => dbconfig.collection_proposal.findOneAndUpdate(
                                    {_id: proposalData._id, createTime: proposalData.createTime},
                                    {
                                        status: status,
                                        isLocked: null
                                    },
                                    {new: true}
                                )
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
                            data.map(item => function(item){
                                if(item.data && item.data.phone){
                                    item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                }
                                if(item.data && item.data.phoneNumber){
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
                        if(record.data && record.data.phone){
                            record.data.phone = dbutility.encodePhoneNum(record.data.phone);
                        }
                        if(record.data && record.data.phoneNumber){
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

        var prom1 = dbconfig.collection_proposalType.find({platformId: {$in:platformId}}).exec();
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
                            function encodePhoneNum(item){
                                 if(item.data && item.data.phone){
                                     item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                 }
                                 if(item.data && item.data.phoneNumber){
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

    getQueryProposalsForPlatformId: function (platformId, typeArr, statusArr, credit, userName, relateUser, relatePlayerId, entryType, startTime, endTime, index, size, sortCol, displayPhoneNum) {//need
        platformId = Array.isArray(platformId) ?platformId :[platformId];

        //check proposal without process
        var prom1 = dbconfig.collection_proposalType.find({platformId: {$in:platformId}}).lean();

        //check proposal with process
        // var prom2 = dbconfig.collection_proposalTypeProcess.find({platformId: platformId}).lean().then(
        //     types => {
        //         if (types && types.length > 0) {
        //             var proposalProcessTypesId = [];
        //             for (var i = 0; i < types.length; i++) {
        //                 if (!typeArr || typeArr.indexOf(types[i].name) != -1) {
        //                     proposalProcessTypesId.push(types[i]._id);
        //                 }
        //             }
        //             return dbconfig.collection_proposalProcess.find({
        //                 type: {$in: proposalProcessTypesId},
        //                 status: {$in: statusArr}
        //             }).lean();
        //         }
        //         else {
        //             return Q.reject({name: "DataError", message: "Can not find platform proposal process types"});
        //         }
        //     }
        // );
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
                        // var processIds = [];
                        // for (var j = 0; j < processes.length; j++) {
                        //     processIds.push(processes[j]._id);
                        // }
                        var queryObj = {
                            type: {$in: proposalTypesId},
                            createTime: {
                                $gte: new Date(startTime),
                                $lt: new Date(endTime)
                            },
                            status: {$in: statusArr}
                        };
                        if (userName){
                            queryObj['data.name'] = userName;
                        }
                        if (relateUser) {
                            // queryObj["data.playerName"] = relateUser;
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
                        var sortKey = (Object.keys(sortCol))[0];
                        var a = sortKey != 'relatedAmount' ?
                            dbconfig.collection_proposal.find(queryObj)
                                .populate({path: 'type', model: dbconfig.collection_proposalType})
                                .populate({path: 'process', model: dbconfig.collection_proposalProcess})
                                // .populate({path: 'remark.admin', model: dbconfig.collection_admin})
                                .populate({path: 'data.providers', model: dbconfig.collection_gameProvider})
                                .populate({path: 'isLocked', model: dbconfig.collection_admin})
                                .sort(sortCol).skip(index).limit(size).lean()
                                .then(
                                     pdata => {
                                         pdata.map(item=> {
                                             // only displayPhoneNum equal true, encode the phone num
                                             if(item.data && item.data.phone && !displayPhoneNum){
                                                 item.data.phone = dbutility.encodePhoneNum(item.data.phone);
                                             }
                                             if(item.data && item.data.phoneNumber && !displayPhoneNum){
                                                 item.data.phoneNumber = dbutility.encodePhoneNum(item.data.phoneNumber);
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
                                        if(prom.data && prom.data.phone && !displayPhoneNum){
                                             prom.data.phone = dbutility.encodePhoneNum(prom.data.phone);
                                         }
                                        if(prom.data && prom.data.phoneNumber && !displayPhoneNum){
                                             prom.data.phoneNumber = dbutility.encodePhoneNum(prom.data.phoneNumber);
                                         }
                                        retData.push(prom);
                                    }
                                    return Q.all(retData);
                                });
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
                }
            }
            return {data: returnData[0], size: returnData[1], summary: summaryObj};
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
                    var c = dbconfig.collection_proposal.aggregate(
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
                                totalRewardAmount: {$sum: "$data.rewardAmount"},
                                totalTopUpAmount: {$sum: "$data.topUpAmount"}
                            }
                        }
                    );
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
                var arr = reqData.type.map(item => {
                    return ObjectId(item);
                });
                reqData.type = {$in: arr}
            }

            if (reqData["data.eventName"] || reqData["data.PROMO_CODE_TYPE"] || reqData["data.playerName"] || reqData["data.partnerName"]) {
                reqData["$and"] = [];
            }

            if (reqData["data.eventName"]) {
                let dataCheck = {"data.eventName":{$in: reqData["data.eventName"]}};
                let existCheck = {"data.eventName": {$exists: false}};
                let orQuery = [dataCheck, existCheck];
                reqData["$and"].push({$or: orQuery});
                delete reqData["data.eventName"];
            }
            if (reqData["data.PROMO_CODE_TYPE"]) {
                let dataCheck = {"data.PROMO_CODE_TYPE":{$in: reqData["data.PROMO_CODE_TYPE"]}};
                let existCheck = {"data.PROMO_CODE_TYPE": {$exists: false}};
                let orQuery = [dataCheck, existCheck];
                reqData["$and"].push({$or: orQuery});
                delete reqData["data.PROMO_CODE_TYPE"];
            }
            if (reqData["data.playerName"] || reqData["data.partnerName"]) {
                let playerNameCheck = {"data.playerName":reqData["data.playerName"]};
                let partnerNameCheck = {"data.partnerName":reqData["data.partnerName"]};
                let orQuery = [playerNameCheck, partnerNameCheck];
                reqData["$and"].push({$or: orQuery});
                delete reqData["data.playerName"];
                delete reqData["data.partnerName"];
            }

            var a = dbconfig.collection_proposal.find(reqData).count();
            var b = dbconfig.collection_proposal.find(reqData).sort(sortObj).skip(index).limit(count)
                .populate({path: "type", model: dbconfig.collection_proposalType})
                .populate({path: "process", model: dbconfig.collection_proposalProcess});
            var c = dbconfig.collection_proposal.aggregate(
                {
                    $match: reqData
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: {$sum: "$data.amount"},
                        totalRewardAmount: {$sum: "$data.rewardAmount"},
                        totalTopUpAmount: {$sum: "$data.topUpAmount"}
                    }
                }
            );
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
        let proposal = {};
        let proposalTypeArr = [];

        return dbconfig.collection_proposalType.find(
            {
                platformId: platform,
            }
        ).then(
            data => {
                data.map(item => {
                    proposal[item._id] = {_id: item._id, name: item.name};
                });
                var proposalTypeArr = data.map(type => {
                    return type._id;
                });
                return dbconfig.collection_proposal.distinct('type', {
                    mainType: constProposalMainType.FirstTopUp,
                    type: {$in: proposalTypeArr}
                });
            }
        ).then(
            data => {
                var result = {};
                data.map(item => {
                    result[item] = proposal[item].name;
                });
                return result;
            })
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

        if(status){
            if (status === 'Fail_or_Rejected') {
                query.status = {$in: ['Fail','Rejected']};
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
                if( data && orderStatus == 2 ){
                    return dbconfig.collection_proposal.findOneAndUpdate( {_id: proposalObj._id, createTime: proposalObj.createTime}, {status: constProposalStatus.APPROVED} )
                }
            }
        );
    },
    getProposalAmountSum: (data, index, limit) => {

      let queryObj = {}
      queryObj['data.platformId'] = ObjectId(data.platformId);
      if(data.type){
          queryObj['type'] = ObjectId(data.typeId);
      }
      queryObj.mainType = 'TopUp'
      if(data.cardField){
          let cardField = 'data.'+data.cardField;
          queryObj[cardField]= data.card;
      }
      queryObj["data.validTime"] = {};
      queryObj["data.validTime"]["$gte"] = data.startDate ? new Date(data.startDate) : null;
      queryObj["data.validTime"]["$lt"] = data.endDate ? new Date(data.endDate) : null;

      if(data.status){
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

        if (data.merchantNo && data.merchantNo.length > 0 && !data.merchantGroup) {
            query['$or'] = [
              {'data.merchantNo': {$in: data.merchantNo}},
              {'data.bankCardNo': {$in: data.merchantNo}},
              {'data.accountNo': {$in: data.merchantNo}}
            ]
        }

        if (!data.merchantNo && data.merchantGroup) {
            query['data.merchantNo'] = {$in: data.merchantGroup};
        }

        if (data.merchantNo && data.merchantNo.length >0 && data.merchantGroup) {
            query['$and'] = [
                {'data.merchantNo': {$in: data.merchantNo}},
                {'data.merchantNo': {$in: data.merchantGroup}}
            ]
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
        if (data.bankTypeId){
            query['data.bankTypeId'] = data.bankTypeId;
        }
        if (data.userAgent){
            query['data.userAgent'] = data.userAgent;
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
        data.topupType = Number(data.topupType)
        if (data.topupType) {
            query['data.topupType'] = data.topupType;
        }

        if (data.depositMethod) {
            query['data.depositMethod'] = data.depositMethod;
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
                return Promise.all([proposalCountProm,proposalsProm]);
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
                status: {$in:[constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            let nextSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$gte: new Date(proposal.createTime)},
                status: {$in:[constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
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
                status: {$in:[constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$gte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in:[constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
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

var proto = proposalFunc.prototype;
proto = Object.assign(proto, proposal);

// This make WebStorm navigation work
module.exports = proposal;
