/**
 * Created by hninpwinttin on 14/1/16.
 */
var encrypt = require('./../modules/encrypt');
var dbPartner = require('./../db_modules/dbPartner');
var dbPartnerLevel = require('./../db_modules/dbPartnerLevel');
var dbPartnerLevelConfig = require('./../db_modules/dbPartnerLevelConfig');
var socketUtil = require('./../modules/socketutility');
var utility = require('./../modules/encrypt');
var Chance = require('chance');
var chance = new Chance();
var constSystemParam = require('../const/constSystemParam');
var constPartnerCommissionPeriod = require('./../const/constPartnerCommissionPeriod');
var constPartnerStatus = require('./../const/constPartnerStatus');


var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dailyPlatformSettlement = require("../scheduleTask/dailyPlatformSettlement.js");

function socketActionPartner(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    this.actions = {

        /**
         * Create new partner by partner data
         * @param {json} data - Player data. It has to contain correct data format
         */
        createPartner: function createPartner(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerName && data.password && data.password.length >= constSystemParam.PASSWORD_LENGTH);
            socketUtil.emitter(self.socket, dbPartner.createPartner, [data], actionName, isValidData);
        },

        /**
         * Create new department with parent department id
         * @param {json} data - new Department data with parentId
         */
        createPartnerWithParent: function createPartnerWithParent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerName && data.password && data.parent);
            socketUtil.emitter(self.socket, dbPartner.createPartnerWithParent, [data], actionName, isValidData);
        },

        /**
         * Create partner info by partnerName or _id
         * @param {json} data - It has to contain partnerName or _id
         */
        getPartner: function getPartner(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.partnerName || data._id));
            socketUtil.emitter(self.socket, dbPartner.getPartner, [data], actionName, isValidData);
        },

        /**
         * get partner info by query
         * @param {json} data - query
         */
        getPartnerByQuery: function getPartnerByQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPartner.getPartnerByQuery, [data], actionName, isValidData);
        },

        /**
         * Create partner info by partnerName or _id
         * @param {json} data - It has to contain partnerName or _id
         */
        getChildrenPartner: function getChildrenPartner(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbPartner.getPartners, [data._ids], actionName, isValidData);
        },

        /**
         * Get all partners
         */
        getAllPartner: function getAllPartner() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPartner.getAllPartner, [{}], actionName, true);
        },

        /**
         * Get all partner status options
         */
        getPartnerStatusList: function getPartnerStatusList() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPartnerStatus});
        },

        /**
         * Get player status change log
         * @param {json} data - data contains _id
         */
        getPartnerStatusChangeLog: function getPartnerStatusChangeLog(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPartner.getPartnerStatusChangeLog, [data._id], actionName, isValidData);
        },

        /**
         * Update partner status
         * @param {json} data - It has to contain _id, status and reason
         */
        updatePartnerStatus: function updatePartnerStatus(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id && data.status && data.reason);

            // if (data.status == constPartnerStatus.NORMAL) {
            //     data.forbidProviders = [];
            // }

            socketUtil.emitter(self.socket, dbPartner.updatePartnerStatus, [data._id, data.status, data.reason, data.adminName], actionName, isValidData);
        },

        /**
         * Update partner info by query with partnerName or _id and updateData
         * @param {json} data - It has to contain query string and updateData
         */
        updatePartner: function updatePartner(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartner.updatePartner, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Delete partner infos by _ids
         * @param {json} data - It has to contain _ids(array of partner object id)
         */
        deletePartnersById: function deletePartnersById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbPartner.deletePartners, [data._ids], actionName, isValidData);
        },

        /**
         * get partner infos by platform _id
         * @param {json} data - It has to contain  object id of platform
         */
        getPartnersByPlatform: function getPartnersByPlatform(data) {
            var actionName = arguments.callee.name
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPartner.getPartnersByPlatform, [data.platform], actionName, isValidData);
        },

        /**
         * get partners by more than one filter
         * @param {json} data - It has to contain the query fields such as  bankAccount , partnerName, partnerId, level
         */
        getPartnersByAdvancedQuery: function getPartnersByAdvancedQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.query);
            var query = utility.buildPartnerQueryString(data.query);

            socketUtil.emitter(self.socket, dbPartner.getPartnersByAdvancedQuery, [data.platformId, data.query], actionName, isValidData);
        },

        /**
         * get partners player info
         * @param {json} data - It has to contain partnersId
         */
        getPartnersPlayerInfo: function getPartnersPlayerInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.partnersObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnersPlayerInfo, [data.platformObjId, data.partnersObjId], actionName, isValidData);
        },

        /**
         * get partner's active player
         * @param {json} data - It has to contain partnersId
         */
        getPartnerActivePlayers: function getPartnerActivePlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnerActiveValidPlayers, [data.platformObjId, data.partnerObjId, true], actionName, isValidData);
        },

        getPartnerPlayers: function getPartnerPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.platformId && data.index != null && data.limit);
            data.sortCol = false;
            socketUtil.emitter(self.socket, dbPartner.getPartnerPlayers, [data.platformId, data], actionName, isValidData);
        },
        getPartnerSummaryReport: function getPartnerSummaryReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.platformId && data.index != null && data.limit);
            socketUtil.emitter(self.socket, dbPartner.getPartnerSummary, [data.platformId, data], actionName, isValidData);
        },
        /**
         * get partner's valid player
         * @param {json} data - It has to contain partnersId
         */
        getPartnerValidPlayers: function getPartnerValidPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnerActiveValidPlayers, [data.platformObjId, data.partnerObjId, false], actionName, isValidData);
        },

        checkPartnerFieldValidity: function checkPartnerFieldValidity(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.fieldName && data.value);
            socketUtil.emitter(self.socket, dbPartner.checkPartnerFieldValidity, [data.fieldName, data.value], actionName, isValidData);
        },
        checkOwnDomainValidity: function checkOwnDomainValidity(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partner && data.value);
            socketUtil.emitter(self.socket, dbPartner.checkOwnDomainValidity, [ObjectId(data.partner), data.value, data.time], actionName, isValidData);

        },

        /**
         * generate random partner password
         * @param {json} data - It has to contain  object id of partner
         */
        resetPartnerPassword: function resetPartnerPassword(data) {
            var actionName = arguments.callee.name;
            var randomPSW = chance.hash({length: constSystemParam.PASSWORD_LENGTH});
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPartner.resetPartnerPassword, [data._id, randomPSW], actionName, isValidData);
        },

        /**
         * get all referral player for partner
         * @param {json} data - It has to contain  object id of partner
         */
        getPartnerReferralPlayers: function getPartnerReferralPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnerReferralPlayers, [data.partnerObjId], actionName, isValidData);
        },
        getPagePartnerReferralPlayers: function getPagePartnerReferralPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.query.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPagePartnerReferralPlayers, [data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * get all active player for partner for past week
         * @param {json} data - It has to contain  object id of partner
         */
        getPartnerActivePlayersForPastWeek: function getPartnerActivePlayersForPastWeek(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnerActivePlayersForPastWeek, [data.partnerObjId], actionName, isValidData);
        },

        /**
         * get all valid player for partner for past week
         * @param {json} data - It has to contain  object id of partner
         */
        getPartnerValidPlayers: function getPartnerValidPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnerValidPlayers, [data.partnerObjId], actionName, isValidData);
        },

        /**
         * Create new partnerLevel by partnerLvl data
         * @param {json} data - partnerLevel data. It has to contain correct data format. Refer "partnerLevel" schema
         */
        createPartnerLevel: function createPartnerLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.name && data.value);
            socketUtil.emitter(self.socket, dbPartnerLevel.createPartnerLevel, [data], actionName, isValidData);
        },

        getPartnerLevelConfig: function getPartnerLevelConfig(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPartnerLevelConfig.getPartnerLevelConfig, [data], actionName, isValidData);
        },
        /**
         * Create player phone number by object id
         * @param {json} data - It has to contain _id
         */
        getPartnerPhoneNumber: function getPartnerPhoneNumber(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerObjId);
            socketUtil.emitter(self.socket, dbPartner.getPartnerPhoneNumber, [data.partnerObjId], actionName, isValidData);
        },

        updatePartnerLevelConfig: function updatePartnerLevelConfig(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartnerLevelConfig.updatePartnerLevelConfig, [data.query, data.updateData], actionName, isValidData);
        },

        getPartnerIPHistory: function getPartnerIPHistory(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.partnerId);
            socketUtil.emitter(self.socket, dbPartner.getIpHistory, [ObjectId(data.partnerId)], actionName, isValidData);
        },

        getPartnerPlayerBonusReport: function getPartnerPlayerBonusReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.partnerName && data.startTime && data.endTime);
            var startTime = new Date(data.startTime);
            var endTime = new Date(data.endTime);
            socketUtil.emitter(self.socket, dbPartner.getPartnerPlayerBonusReport, [data.platformId, data.partnerName, startTime, endTime, data.index, data.limit], actionName, isValidData);
        },
        createPartnerCommissionConfig: function createPartnerCommissionConfig(data) {
            var actionName = arguments.callee.name;
            var platform_id = ObjectId(data.platform);
            var isValidData = Boolean(data && data.platform && platform_id);
            socketUtil.emitter(self.socket, dbPartner.createPartnerCommissionConfig, [platform_id], actionName, isValidData);
        },
        getPartnerCommissionPeriodConst: function getPartnerCommissionPeriodConst() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPartnerCommissionPeriod});
        },

        updatePartnerCommissionLevel: function updatePartnerCommissionLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartner.updatePartnerCommissionLevel, [data.query, data.updateData], actionName, isValidData);
        },

        getPartnerCommissionConfig: function getPartnerCommissionConfig(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPartner.getPartnerCommissionConfig, [data.query], actionName, isValidData);
        },
        getPartnerCommissionReport: function getPartnerCommissionReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPartner.getPartnerCommissionReport, [ObjectId(data.platformId), data.partnerName, startTime, endTime, data.index, data.limit, data.sortCol], actionName, isValidData);
        },
        manualPlatformPartnerCommissionSettlement: function manualPlatformPartnerCommissionSettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            //todo:: for temp testing, change the flag here later
            socketUtil.emitter(self.socket, dailyPlatformSettlement.manualPlatformPartnerCommissionSettlement, [ObjectId(data.platformId), false, true], actionName, isValidData);
        },
        startPlatformPartnerCommissionSettlement: function startPlatformPartnerCommissionSettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dailyPlatformSettlement.manualPlatformPartnerCommissionSettlement, [ObjectId(data.platformId), true], actionName, isValidData);
        },
        /**
         *  Apply partner bonus
         */
        applyPartnerBonusRequest: function applyPartnerBonusRequest(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerId && data.bonusId && data.amount);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPartner.applyBonus, [userAgent, data.partnerId, data.bonusId, data.amount, data.honoreeDetail, data.bForce, {
                type: "admin",
                name: getAdminName(),
                id: getAdminId()
            }], actionName, isValidData);
        },
        /**
         *  Update partner permission
         */
        updatePartnerPermission: function updatePartnerPermission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.query.platform && data.query._id && data.admin && data.permission && data.remark);
            socketUtil.emitter(self.socket, dbPartner.updatePartnerPermission, [data.query, data.admin, data.permission, data.remark], actionName, isValidData);
        },
    };

    socketActionPartner.actions = this.actions;
}

module.exports = socketActionPartner;
