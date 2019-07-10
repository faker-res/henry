/**
 * Created by hninpwinttin on 14/1/16.
 */
var dbProposal = require('./../db_modules/dbProposal');
var dbProposalProcess = require('./../db_modules/dbProposalProcess');
var dbProposalProcessStep = require('./../db_modules/dbProposalProcessStep');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var socketUtil = require('./../modules/socketutility');
var constProposalType = require('./../const/constProposalType');
var constProposalEntryType = require('./../const/constProposalEntryType');
var constProposalPriority = require('./../const/constProposalPriority');
var constProposalUserType = require('./../const/constProposalUserType');
var constProposalStatus = require('./../const/constProposalStatus');
var dbUtil = require('./../modules/dbutility');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionProposal(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    var self = this;
    this.actions = {

        /**
         * Create new Proposal to update player info
         * @param {json} data -platformId  proposal data
         */
        createUpdatePlayerInfoProposal: function createUpdatePlayerInfoProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data && (!data.data.realName || data.data.realName.match(/\d+/g) === null));
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_INFO, data], actionName, isValidData);
        },

        createUpdatePlayerInfoPartnerProposal: function createUpdatePlayerInfoPartnerProposal(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.data && (!data.data.realName || data.data.realName.match(/\d+/g) === null));
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_INFO_PARTNER, data], actionName, isValidData);
        },

        createUpdatePlayerInfoLevelProposal: function createUpdatePlayerInfoLevelProposal(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.data && (!data.data.realName || data.data.realName.match(/\d+/g) === null));
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_INFO_LEVEL, data], actionName, isValidData);
        },

        createUpdatePlayerInfoAccAdminProposal: function createUpdatePlayerInfoAccAdminProposal(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.data && (!data.data.realName || data.data.realName.match(/\d+/g) === null));
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_INFO_ACC_ADMIN, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player real name
         * @param {json} data -platformId  proposal data
         */
        createUpdatePlayerRealNameProposal: function createUpdatePlayerRealNameProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data && (!data.data.realName || data.data.realName.match(/\d+/g) === null));
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_REAL_NAME, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player credit
         * @param {json} data - proposal data
         */
        createUpdatePlayerCreditProposal: function createUpdatePlayerCreditProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.hasOwnProperty("updateAmount") &&
                data.data.hasOwnProperty("curAmount")
            );
            socketUtil.emitter(self.socket, dbProposal.checkUpdateCreditProposal, [data.platformId, constProposalType.UPDATE_PLAYER_CREDIT, data], actionName, isValidData);
        },

        createFixPlayerCreditTransferProposal: function createFixPlayerCreditTransferProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.hasOwnProperty("updateAmount") &&
                data.data.hasOwnProperty("curAmount") && data.data.hasOwnProperty("realName")
            );
            socketUtil.emitter(self.socket, dbProposal.applyRepairCreditTransfer, [data.platformId, data], actionName, isValidData);
        },

        createReturnFixProposal: function createReturnFixProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.hasOwnProperty("updateAmount") &&
                data.data.hasOwnProperty("curAmount") && data.data.hasOwnProperty("realName")
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.PLAYER_CONSUMPTION_RETURN_FIX, data], actionName, isValidData);
        },

         /**
         * Create new Proposal to update player email
         * @param {json} data - proposal data
         */
        createUpdatePlayerEmailProposal: function createUpdatePlayerEmailProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.playerName && data.data.curData && data.data.updateData &&
                data.data.curData.hasOwnProperty("email") && data.data.updateData.email
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_EMAIL, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player email
         * @param {json} data - proposal data
         */
        createUpdatePlayerPhoneProposal: function createUpdatePlayerPhoneProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.playerName && data.data.curData &&
                data.data.updateData && data.data.updateData.phoneNumber
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_PHONE, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player qq
         * @param {json} data - proposal data
         */
        createUpdatePlayerQQProposal: function createUpdatePlayerQQProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.playerName && data.data.curData &&
                data.data.updateData && data.data.updateData.qq
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_QQ, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player WeChat
         * @param {json} data - proposal data
         */
        createUpdatePlayerWeChatProposal: function createUpdatePlayerWeChatProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.playerObjId && data.data.playerName && data.data.curData &&
                data.data.updateData && data.data.updateData.wechat
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_WECHAT, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player bank info
         * @param {json} data - proposal type name
         */
        createUpdatePlayerBankInfoProposal: function createUpdatePlayerBankInfoProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data);
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PLAYER_BANK_INFO, data], actionName, isValidData);
        },

        createUpdatePartnerInfoProposal: function createUpdatePartnerInfoProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data);
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_INFO, data], actionName, isValidData);
        },

        createUpdatePartnerRealNameProposal: function createUpdatePartnerRealNameProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data);
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_REAL_NAME, data], actionName, isValidData);
        },

        createUpdatePartnerCommissionTypeProposal: function createUpdatePartnerCommissionTypeProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data);
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_COMMISSION_TYPE, data], actionName, isValidData);
        },

        updateChildPartner: function updateChildPartner(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data);
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_CHILD_PARTNER, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update player info
         * @param {json} data - proposal type name
         */
        createUpdatePartnerBankInfoProposal: function createUpdatePartnerBankInfoProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.data);
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_BANK_INFO, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update partner phone number
         * @param {json} data - proposal type name
         */
        createUpdatePartnerPhoneProposal: function createUpdatePartnerPhoneProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.partnerName && data.data.curData && data.data.updateData &&
                data.data.curData.hasOwnProperty("phoneNumber") && data.data.updateData.phoneNumber
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_PHONE, data], actionName, isValidData);
        },


        /**
         * Create new Proposal to update partner email
         * @param {json} data - proposal type name
         */
        createUpdatePartnerEmailProposal: function createUpdatePartnerEmailProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.partnerName && data.data.curData && data.data.updateData &&
                data.data.curData.hasOwnProperty("email") && data.data.updateData.email
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_EMAIL, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update partner qq
         * @param {json} data - proposal type name
         */
        createUpdatePartnerQQProposal: function createUpdatePartnerQQProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.partnerName && data.data.curData && data.data.updateData && data.data.updateData.qq
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_QQ, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update partner WeChat
         * @param {json} data - proposal data
         */
        createUpdatePartnerWeChatProposal: function createUpdatePartnerWeChatProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.partnerName && data.data.curData && data.data.updateData && data.data.updateData.wechat
            );
            socketUtil.emitter(self.socket, dbProposal.createProposalWithTypeNameWithProcessInfo, [data.platformId, constProposalType.UPDATE_PARTNER_WECHAT, data], actionName, isValidData);
        },

        /**
         * Create new Proposal to update partner credit
         * @param {json} data - proposal data
         */
        createUpdatePartnerCreditProposal: function createUpdatePartnerCreditProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(
                data && data.platformId && data.data &&
                data.data.partnerObjId && data.data.hasOwnProperty("updateAmount") &&
                data.data.hasOwnProperty("curAmount")
            );
            socketUtil.emitter(self.socket, dbProposal.checkUpdateCreditProposal, [data.platformId, constProposalType.UPDATE_PARTNER_CREDIT, data], actionName, isValidData);
        },

        /**
         * Create new Proposal
         * @param {json} data - contains proposal type
         *
         */
        createProposal: function createProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.type);
            socketUtil.emitter(self.socket, dbProposal.createProposal, [data], actionName, isValidData);
        },

        /**
         * Get one Proposal
         */
        getProposal: function getProposal(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbProposal.getProposal, [data], actionName);
        },

        getProposalByPlayerIdAndType: function getProposalByPlayerIdAndType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.type && data.playerObjId);
            socketUtil.emitter(self.socket, dbProposal.getProposalByPlayerIdAndType, [data], actionName, isValidData);
        },

        getProposalByPartnerIdAndType: function getProposalByPartnerIdAndType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.type && data.partnerObjId);
            socketUtil.emitter(self.socket, dbProposal.getProposalByPartnerIdAndType, [data], actionName, isValidData);
        },

        getPlatformProposal: function getPlatformProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.proposalId);
            socketUtil.emitter(self.socket, dbProposal.getPlatformProposal, [data.platformId, data.proposalId], actionName, isValidData);
        },

        /**
         * Update proposal process step. Approve or reject
         * @param {json} data - proposal step data, it has to contain proposalId, adminId, memo, bApprove
         *
         */
        updateProposalProcessStep: function updateProposalProcessStep(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId && data.adminId && data.memo);
            socketUtil.emitter(self.socket, dbProposal.updateProposalProcessStep, [data.proposalId, data.adminId, data.memo, data.bApprove, data.remark, data.platform, data.rejectRemark], actionName, isValidData);
        },

        updatePlayerProposalRemarks: function updatePlayerProposalRemarks(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalObjId && data.remarks);
            let query = {
                _id: ObjectId(data.proposalObjId)
            }
            let updateData = {
                "data.remarks": data.remarks
            }
            socketUtil.emitter(self.socket, dbProposal.updateProposalRemarks, [query, updateData], actionName, isValidData);

        },

        updatePlayerIntentionRemarks: function updatePlayerIntentionRemarks(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.pId && data.adminId);
            socketUtil.emitter(self.socket, dbProposal.updatePlayerIntentionRemarks, [data.pId, data.remarks], actionName, isValidData);

        },
        cancelProposal: function cancelProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId);
            socketUtil.emitter(self.socket, dbProposal.cancelProposal, [data.proposalId, getAdminName(), data.remark, getAdminId(), data.cancelRemark], actionName, isValidData);
        },

        /**
         * Get all
         * @param {json} data - proposal step data, it has to contain proposalId, adminId, memo, bApprove
         *
         */
        getAvailableProposalsForAdminId: function getAvailableProposalsForAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbProposal.getPlatformProposals, [data.platformId], actionName, isValidData);
        },

        getApprovalProposalsForAdminId: function getApprovalProposalsForAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.platformId);
            socketUtil.emitter(self.socket, dbProposal.getApprovalProposalsByAdminId, [data.adminId, data.platformId], actionName, isValidData);
        },
        getQueryApprovalProposalsForAdminId: function getQueryApprovalProposalsForAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.platformId && data.type);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            var index = data.index || 0;
            var size = data.size || 10;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getQueryApprovalProposalsForAdminId, [data.adminId, data.platformId, data.type, data.credit, data.relateUser, startTime, endTime, index, size, sortCol], actionName, isValidData);
        },

        getAllPlatformAvailableProposalsForAdminId: function getAllPlatformAvailableProposalsForAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.platform);
            socketUtil.emitter(self.socket, dbProposal.getAllPlatformAvailableProposalsForAdminId, [data.adminId, data.platform], actionName, isValidData);
        },
        /**
         * Get all
         * @param {json} data - proposal step data, it has to contain proposalId, adminId, memo, bApprove
         *
         */
        getQueryProposalsForAdminId: function getQueryProposalsForAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.platformId && data.status);
            var startTime = data.startDate ? data.startDate : dbUtil.getYesterdaySGTime().endTime;
            var endTime = data.endDate ? data.endDate : new Date();
            var index = data.index || 0;
            var size = data.size || 10;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getQueryProposalsForPlatformId, [data.platformId, data.type, data.status, data.credit, data.name, data.relateUser, data.relatePlayerId, data.entryType, startTime, endTime, index, size, sortCol, data.displayPhoneNum, data.playerId, data.eventName, data.promoTypeName, data.inputDevice, data.partnerId], actionName, isValidData);
        },

        getPlayerProposalsForAdminId: function getPlayerProposalsForAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.status);
            var startTime = data.startDate ? data.startDate : null;
            var endTime = data.endDate ? data.endDate : null;
            var index = data.index || 0;
            var size = data.size || 100;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getPlayerProposalsForPlatformId, [data.platformId, data.type, data.status, data.name, data.phoneNumber, startTime, endTime, index, size, sortCol, data.displayPhoneNum, data.proposalId], actionName, isValidData);
        },

        getDuplicatePlayerPhoneNumber: function getDuplicatePlayerPhoneNumber(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.platformId && data.status);
            var startTime = data.startDate ? data.startDate : null;
            var endTime = data.endDate ? data.endDate : null;
            var index = data.index || 0;
            var size = data.size || 10;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getDuplicatePlayerPhoneNumber, [data.platformId, data.type, data.status, data.name, data.phoneNumber, startTime, endTime, index, size, sortCol, data.displayPhoneNum, data.proposalId], actionName, isValidData);
        },

        getDuplicatePlayerRealName: function getDuplicatePlayerRealName(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.realName);
            var index = data.index || 0;
            var limit = data.limit || 10;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getDuplicatePlayerRealName, [data.platformId, data.realName, index, limit, sortCol], actionName, isValidData);
        },

        getDuplicatePhoneNumber: function getDuplicatePhoneNumber(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.phoneNumber);
            var index = data.index || 0;
            var limit = data.limit || 10;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getDuplicatePhoneNumber, [data.platformId, data.phoneNumber, index, limit, sortCol, data.isPlayer], actionName, isValidData);
        },

        /**
         * get all the player registration intent and calculate the fail and success rate
         */
        getPlayerSelfRegistrationRecordList: function getPlayerSelfRegistrationRecordList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.status);
            var startTime = data.startDate ? data.startDate : new Date(0);
            var endTime = data.endDate ? data.endDate : new Date();
            socketUtil.emitter(self.socket, dbProposal.getPlayerSelfRegistrationRecordList, [startTime, endTime, data.status, data.platformId, data.type], actionName, isValidData);
        },

        getPlayerManualRegistrationRecordList: function getPlayerManualRegistrationRecordList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.status);
            var startTime = data.startDate ? data.startDate : new Date(0);
            var endTime = data.endDate ? data.endDate : new Date();
            socketUtil.emitter(self.socket, dbProposal.getPlayerManualRegistrationRecordList, [startTime, endTime, data.status, data.platformId, data.type], actionName, isValidData);
        },

        getPlayerRegistrationIntentRecordByStatus: function getPlayerRegistrationIntentRecordByStatus(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId && data.platformId);
            var startTime = data.startDate ? data.startDate : new Date(0);
            var endTime = data.endDate ? data.endDate : new Date();
            var index = 0;
            var size = data.size || 10;
            var sortCol = data.sortCol || {"createTime": -1};
            socketUtil.emitter(self.socket, dbProposal.getPlayerRegistrationIntentRecordByStatus, [data.platformId, data.type, data.status, data.name, data.phoneNumber, startTime, endTime, index, size, sortCol, data.displayPhoneNum, data.proposalId, data.attemptNo, data.unlockSizeLimit], actionName, isValidData);
        },


        /**
         * Create new Proposal Process
         */
        getFullProposalProcess: function getFullProposalProcess(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbProposalProcess.getFullProposalProcess, [data], actionName, isValidData);
        },

        queryRewardProposal: function queryRewardProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startTime && data.endTime && data.playerId && ObjectId(data.playerId));
            socketUtil.emitter(self.socket, dbProposal.queryRewardProposal, [ObjectId(data.playerId), data.type, data.startTime, data.endTime, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        queryBonusProposal: function queryBonusProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startTime && data.endTime && data.playerId);
            var statusFilter;
            if(data && data.status){
                statusFilter = data.status;
            } else {
                statusFilter = "";
            }
            socketUtil.emitter(self.socket, dbProposal.queryBonusProposal, [data.playerId, data.startTime, data.endTime, statusFilter, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getAllRewardProposal: function getAllRewardProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbProposal.getAllRewardProposal, [data.platform], actionName, isValidData);
        },

        /**
         * Get all the proposal entry types defined in the system
         */
        getProposalEntryTypeList: function getProposalEntryTypeList(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constProposalEntryType});
        },

        /**
         * Get all the proposal priority defined in the system
         */
        getProposalPriorityList: function getProposalPriorityList(data) {

            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constProposalPriority});
        },
        /**
         * Get all the proposal user types defined in the system
         */
        getProposalUserTypeList: function getProposalUserTypeList(data) {

            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constProposalUserType});
        },
        getPlatformRewardProposal: function getPlatformRewardProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbProposal.getPlatformRewardProposal, [data.platform], actionName, isValidData);
        },
        /**
         * Get all the proposal status defined in the system
         */
        getAllProposalStatus: function getAllProposalStatus(data) {

            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constProposalStatus});
        },

        delayManualTopupRequest: function delayManualTopupRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.proposalId && data.delayTime);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.delayManualTopupRequest, [data.playerId, data.proposalId, data.delayTime], actionName, isValidData);
        },

        getPlayerPendingPaymentProposal: function getPlayerPendingPaymentProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.platformId);
            socketUtil.emitter(self.socket, dbProposal.getPlayerPendingPaymentProposal, [ObjectId(data.playerId), ObjectId(data.platformId)], actionName, isValidData);
        },

        submitRepairPaymentProposal: function submitRepairPaymentProposal(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId);
            socketUtil.emitter(self.socket, dbProposal.submitRepairPaymentProposal, [data.proposalId, data.platform], actionName, isValidData);
        },

        lockProposalById: function lockProposalById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId);
            socketUtil.emitter(self.socket, dbProposal.lockProposalById, [data.proposalId, getAdminId()], actionName, isValidData);
        },
        unlockProposalById: function unlockProposalById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId);
            socketUtil.emitter(self.socket, dbProposal.unlockProposalById, [data.proposalId, getAdminId()], actionName, isValidData);
        },

        setBonusProposalStatus: function setBonusProposalStatus(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId && data.orderStatus);
            socketUtil.emitter(self.socket, dbProposal.setBonusProposalStatus, [data.proposalId, data.orderStatus, data.remark], actionName, isValidData);
        },
        getProposalAmountSum: function getProposalAmountSum(data){
          var actionName = arguments.callee.name;
          var isValidData = Boolean(data);
          data.startDate = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
          data.endDate = data.startDate ? dbUtil.getDayEndTime(data.startDate) : new Date();
          socketUtil.emitter(self.socket, dbProposal.getProposalAmountSum, [data, data.index, data.limit], actionName, isValidData);
        },
        getPaymentMonitorResult: function getPaymentMonitorResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            let time = dbUtil.getYesterdaySGTime();
            data.startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            data.endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            data.limit = data.limit || 10;
            data.index = data.index || 0;
            socketUtil.emitter(self.socket, dbProposal.getPaymentMonitorResult, [data, data.index, data.limit], actionName, isValidData);
        },

        getPaymentMonitorTotalResult: function getPaymentMonitorTotalResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let time = dbUtil.getYesterdaySGTime();
            data.startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            data.endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            data.limit = data.limit || 10;
            data.index = data.index || 0;
            socketUtil.emitter(self.socket, dbProposal.getPaymentMonitorTotalResult, [data, data.index, data.limit], actionName, isValidData);
        },

        getPaymentMonitorTotalCompletedResult: function getPaymentMonitorTotalCompletedResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let time = dbUtil.getYesterdaySGTime();
            data.startTime = data.startTime ? new Date(data.startTime) : time.startTime;
            data.endTime = data.endTime ? new Date(data.endTime) : time.endTime;
            data.limit = data.limit || 10;
            data.index = data.index || 0;
            socketUtil.emitter(self.socket, dbProposal.getPaymentMonitorTotalCompletedResult, [data, data.index, data.limit], actionName, isValidData);
        },

        approveCsPendingAndChangeStatus: function approveCsPendingAndChangeStatus(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.proposalObjId && data.createTime);
            socketUtil.emitter(self.socket, dbProposal.approveCsPendingAndChangeStatus, [data.proposalObjId, data.createTime, data.adminName, data.platform], actionName, isDataValid);
        },

        getWithdrawalProposal: function getWithdrawalProposal(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.period && data.platformObjId);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getWithdrawalProposal, [startTime, endTime, data.period, data.platformObjId], actionName, isValidData);
        },

        getProposalByObjId: function getProposalByObjId(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalObjId && data.proposalObjId.length);
            socketUtil.emitter(self.socket, dbProposal.getProposalByObjId, [data.proposalObjId], actionName, isValidData);
        },

        getManualApprovalRecords: function getManualApprovalRecords(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.period && data.playerBonus && data.updatePlayerList && data.updatePartnerList && data.reward && data.others && data.all);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getManualApprovalRecords, [startTime, endTime, data.period, data.playerBonus, data.updatePlayerList, data.updatePartnerList, data.reward, data.others, data.all], actionName, isValidData);
        },

        getSpecificProposalTypeByName: function getSpecificProposalTypeByName(data){
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.proposalType);
            socketUtil.emitter(self.socket, dbProposal.getSpecificProposalTypeByName, [data.platform, data.proposalType], actionName, isValidData);
        },

        getRegistrationClickCountRecords: function getRegistrationClickCountRecords(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.period && data.platform && data.proposalTypeId);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getRegistrationClickCountRecords, [startTime, endTime, data.period, data.platform, data.proposalTypeId], actionName, isValidData);
        },

        getSpecificTypeOfManualApprovalRecords: function getSpecificTypeOfManualApprovalRecords(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.period && data.typeList && data.status);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            socketUtil.emitter(self.socket, dbProposal.getSpecificTypeOfManualApprovalRecords, [startTime, data.period, data.typeList, data.status], actionName, isValidData);
        },

        getAllProposalTypeByPlatformId: function getAllProposalTypeByPlatformId(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbProposal.getAllProposalTypeByPlatformId, [data.platformId], actionName, isValidData);
        },

        getOnlineTopupAnalysisByPlatform: function getOnlineTopupAnalysisByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getOnlineTopupAnalysisByPlatform, [ObjectId(data.platformId), startTime, endTime, data.analysisCategory, data.operator, data.timesValue, data.timesValueTwo], actionName, isValidData);
        },
        getTopupAnalysisByPlatform: function getTopupAnalysisByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.type && data.period);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getTopupAnalysisByPlatform, [ObjectId(data.platformId), startTime, endTime, data.type, data.period], actionName, isValidData);
        },
        getProfitDisplayDetailByPlatform: function getProfitDisplayDetailByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.playerBonusType && data.topUpType );
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getProfitDisplayDetailByPlatform, [ObjectId(data.platformId), startTime, endTime, data.playerBonusType, data.topUpType, data.partnerBonusType], actionName, isValidData);
        },
        lockProposalByAdmin: function lockProposalByAdmin(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId && data.adminId && data.adminName);
            socketUtil.emitter(self.socket, dbProposal.lockProposalByAdmin, [data.proposalId, data.adminId, data.adminName], actionName, isValidData);
        },
        unlockProposalByAdmin: function unlockProposalByAdmin(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId && data.adminId);
            socketUtil.emitter(self.socket, dbProposal.unlockProposalByAdmin, [data.proposalId, data.adminId], actionName, isValidData);
        },
        updateFollowUpContent: function updateFollowUpContent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.followUpData && data.followUpContent);
            socketUtil.emitter(self.socket, dbProposal.updateFollowUpContent, [data.followUpData, data.followUpContent], actionName, isValidData);
        },

        forcePairingWithReferenceNumber: function forcePairingWithReferenceNumber(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.proposalObjId && data.proposalId && data.referenceNumber);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.forcePairingWithReferenceNumber, [data.platformId, data.proposalObjId, data.proposalId, data.referenceNumber, getAdminName(), getAdminId()], actionName, isValidData);
        },

        getAllOnlineTopupAnalysis: function getAllOnlineTopupAnalysis(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbProposal.getAllOnlineTopupAnalysis, [data.platformList, startTime, endTime, data.analysisCategory, data.operator, data.timesValue, data.timesValueTwo], actionName, isValidData);
        },

        syncWithdrawalProposalToPMS: function syncWithdrawalProposalToPMS(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.proposalId && data.remark);
            socketUtil.emitter(self.socket, dbProposal.syncWithdrawalProposalToPMS, [data.proposalId, data.remark], actionName, isValidData);
        },

    };
    socketActionProposal.actions = this.actions;
}

module.exports = socketActionProposal;
