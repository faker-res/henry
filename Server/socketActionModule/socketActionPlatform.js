let encrypt = require('./../modules/encrypt');
let dbPlatform = require('./../db_modules/dbPlatform');
let socketUtil = require('./../modules/socketutility');
let dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');
let weeklyPlatformSettlement = require('./../scheduleTask/weeklyPlatformSettlement');
let dbPaymentChannel = require('./../db_modules/dbPaymentChannel');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

let constPlayerCreditTransferStatus = require('./../const/constPlayerCreditTransferStatus');
let constPartnerCommissionSettlementMode = require('./../const/constPartnerCommissionSettlementMode');

const dbAutoProposal = require('./../db_modules/dbAutoProposal');
const dbPlayerLevel = require('./../db_modules/dbPlayerLevel');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');
let dbPlayerCredibility = require('../db_modules/dbPlayerCredibility');
let dbCsOfficer = require('../db_modules/dbCsOfficer');

const consumptionReturnEvent = require('./../scheduleTask/consumptionReturnEvent');

function socketActionPlatform(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create a new platform
         * @param {json} data - It has to contain platform data - refer the "platform" schema
         */
        createPlatform: function createPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);

            socketUtil.emitter(self.socket, dbPlatform.createPlatform, [data], actionName, isValidData);
        },
        /**
         * Get a platform by platformName or _id
         * @param {json} data - Query data. It has to contain platformName or _id
         */
        getPlatform: function getPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id));
            socketUtil.emitter(self.socket, dbPlatform.getPlatform, [data], actionName, isValidData);
        },
        /**
         * Get all  platforms
         * @param {json} data - It has to contain platform data - refer the "platform" schema
         */
        getAllPlatforms: function getAllPlatforms() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlatform.getAllPlatforms, [], actionName);
        },
        /**
         * Update  platform
         * @param {json} data - It has to contain and query and platform data - refer the "platform" schema
         */
        updatePlatform: function updatePlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlatform.updatePlatform, [data.query, data.updateData], actionName, isValidData);
        },
        /**
         * Delete a platform
         * @param {json} data - objectId of platform
         *
         */
        deletePlatformById: function deletePlatformById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbPlatform.deletePlatform, [data._ids], actionName, isValidData);
        },
        /**
         * Add platform  to department
         * @param {json} data - It has to contain platformId and departmentId
         */
        addPlatformsToDepartmentById: function addPlatformsToDepartmentById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformIds && data.departmentId && data.platformIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatform.addPlatformsToDepartmentById, [data.departmentId, data.platformIds], actionName, isValidData);
        },
        /**
         * remove platform from department
         * @param {json} data - It has to contain platformId and departmentId
         */
        removePlatformsFromDepartmentById: function removePlatformsFromDepartmentById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformIds && data.departmentId && data.platformIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatform.removePlatformsFromDepartmentById, [data.departmentId, data.platformIds], actionName, isValidData);
        },
        /**
         * add a providerId to the the "gameProviders" array of a platform
         * @param data - _id of provider and _id of platform and (optionally) nickname of platform and prefix of platform
         */
        addProviderToPlatformById: function addProviderToPlatformById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.providerId && data.platformId /*&& data.providerNickName && data.providerPrefix*/);
            socketUtil.emitter(self.socket, dbPlatform.addProviderToPlatformById, [data.platformId, data.providerId, data.providerNickName, data.providerPrefix], actionName, isDataValid);
        },
        /**
         * rename and reprefix a provider which already exists in the "gameProviders" array of a platform
         * @param data - _id of provider and _id of platform and (optionally) nickname of platform and prefix of platform
         */
        renameProviderInPlatformById: function renameProviderInPlatformById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.providerId && data.platformId /*&& data.providerNickName && data.providerPrefix*/);
            socketUtil.emitter(self.socket, dbPlatform.renameProviderInPlatformById, [data.platformId, data.providerId, data.providerNickName, data.providerPrefix], actionName, isDataValid);
        },

        /**
         * update provider which already exists in the "gameProviders" array of a platform
         * @param data - _id of provider and _id of platform and (optionally) nickname of platform and prefix of platform
         */
        updateProviderFromPlatformById: function updateProviderFromPlatformById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.providerId && data.platformId);
            socketUtil.emitter(self.socket, dbPlatform.updateProviderFromPlatformById, [data.platformId, data.providerId, data.isEnable], actionName, isDataValid);
        },
        /**
         * remove a providerId from the the "gameProviders" array of a platform and
         * @param data - _id of provider and _id of platform
         */
        removeProviderFromPlatformById: function removeProviderFromPlatformById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.providerId && data.platformId);
            socketUtil.emitter(self.socket, dbPlatform.removeProviderFromPlatformById, [data.platformId, data.providerId], actionName, isDataValid);
        },

        /**
         * Get a platform by admin id
         * @param {json} data - Query data. It has to contain adminId
         */
        getPlatformByAdminId: function getPlatformByAdminId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId);
            socketUtil.emitter(self.socket, dbPlatform.getPlatformByAdminId, [data.adminId], actionName, isValidData);
        },

        //todo::test platform settlement api, to be commentout
        /**
         * Start daily settlement for platform
         * @param {json} data - It has to contain platformId
         */
        startPlatformDailySettlement: function startPlatformDailySettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dailyPlatformSettlement.manualDailyPlatformSettlement, [ObjectId(data.platformId)], actionName, isValidData);
        },

        fixPlatformDailySettlement: function fixPlatformDailySettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dailyPlatformSettlement.manualDailyPlatformSettlement, [ObjectId(data.platformId), true], actionName, isValidData);
        },


        /**
         * Start daily settlement for platform
         * @param {json} data - It has to contain platformId
         */
        startPlatformWeeklySettlement: function startPlatformWeeklySettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, weeklyPlatformSettlement.manualWeeklyPlatformSettlement, [ObjectId(data.platformId)], actionName, isValidData);
        },

        fixPlatformWeeklySettlement: function fixPlatformWeeklySettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, weeklyPlatformSettlement.manualWeeklyPlatformSettlement, [ObjectId(data.platformId), true], actionName, isValidData);
        },

        /**
         * Start reward event settlement for platform
         * @param {json} data - It has to contain platformId
         */
        startPlatformRewardEventSettlement: function startPlatformRewardEventSettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, weeklyPlatformSettlement.startWeeklyPlatformRewardEventSettlement, [ObjectId(data.platformId)], actionName, isValidData);
        },
        // addPaymentToPlatformById: function addPaymentToPlatformById(data) {
        //     var actionName = arguments.callee.name;
        //     var isDataValid = Boolean(data && data.paymentChannelId && data.platformId);
        //     socketUtil.emitter(self.socket, dbPlatform.addPaymentToPlatformById, [data.platformId, data.paymentChannelId], actionName, isDataValid);
        // },
        // removePaymentFromPlatformById: function removePaymentFromPlatformById(data) {
        //     var actionName = arguments.callee.name;
        //     var isDataValid = Boolean(data && data.paymentChannelId && data.platformId);
        //     socketUtil.emitter(self.socket, dbPlatform.removePaymentFromPlatformById, [data.platformId, data.paymentChannelId], actionName, isDataValid);
        // },

        syncPlatform: function syncPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlatform.syncPlatform, [], actionName, isValidData);
        },

        // getAllPaymentChannel: function getAllPaymentChannel() {
        //     var actionName = arguments.callee.name;
        //     var isDataValid = true;
        //     socketUtil.emitter(self.socket, dbPaymentChannel.getAllPaymentChannels, [], actionName, isDataValid);
        // }

        getPlatformConsumptionReturnDetail: function getPlatformConsumptionReturnDetail(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.platformId && data.period);
            socketUtil.emitter(self.socket, dbPlatform.getPlatformConsumptionReturnDetail, [ObjectId(data.platformId), data.period], actionName, isDataValid);
        },

        getAllPlayerCreditTransferStatus: function getAllPlayerCreditTransferStatus(data) {
            let actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerCreditTransferStatus});
        },

        getPartnerCommissionSettlementModeConst: function getPartnerCommissionSettlementModeConst(data) {
            let actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPartnerCommissionSettlementMode});
        },

        triggerAutoProposal: function triggerAutoProposal(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbAutoProposal.applyBonus, [data.platformObjId], actionName, isDataValid);
        },

        triggerSavePlayersCredit: function triggerSavePlayersCredit(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardEvent.startSavePlayersCredit, [data.platformObjId], actionName, isDataValid);
        },

        changeStatusToPendingFromAutoAudit: function changeStatusToPendingFromAutoAudit(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.proposalObjId && data.createTime);
            socketUtil.emitter(self.socket, dbAutoProposal.changeStatusToPendingFromAutoAudit, [data.proposalObjId, data.createTime], actionName, isDataValid);
        },

        updateAutoApprovalConfig: function updateAutoApprovalConfig(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlatform.updateAutoApprovalConfig, [data.query, data.updateData], actionName, isValidData);
        },

         /**
         * Start Player Consumption Return Settlement
         * @param {json} data - It has to contain platformId
         */
        startPlatformPlayerConsumptionReturnSettlement: function startPlatformPlayerConsumptionReturnSettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, consumptionReturnEvent.checkPlatformWeeklyConsumptionReturnEvent, [ObjectId(data.platformId)], actionName, isValidData);
        },

        /**
         * Start Player Consumption Inceptive Settlement
         * @param {json} data - It has to contain platformId
         */
        startPlatformPlayerConsumptionIncentiveSettlement: function startPlatformPlayerConsumptionIncentiveSettlement(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatform.startCalculatePlayerConsumptionIncentive, [ObjectId(data.platformId)], actionName, isValidData);
        },

         /**
          * Start Player Level Settlement
         * @param {json} data - It has to contain platformId
         */
         startPlatformPlayerLevelSettlement: function startPlatformPlayerLevelSettlement(data) {
             let actionName = arguments.callee.name;
             let isValidData = Boolean(data && data.platformId);
             socketUtil.emitter(self.socket, dbPlayerLevel.startPlatformPlayerLevelSettlement, [ObjectId(data.platformId), data.upOrDown], actionName, isValidData);
         },

        /**
         * Start Player Level Settlement
         * @param {json} data - It has to contain platformId
         */
        startPlayerConsecutiveConsumptionSettlement: function startPlayerConsecutiveConsumptionSettlement(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatform.startPlayerConsecutiveConsumptionSettlement, [ObjectId(data.platformId)], actionName, isValidData);
        },

        // updateScoreConfig: function updateScoreConfig(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjId);
        //     socketUtil.emitter(self.socket, dbPlayerCredibility.updateScoreConfig, [data.platformObjId, data], actionName, isValidData);
        // },
        //
        // updateTopUpTimesScores: function updateTopUpTimesScores(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjId);
        //     socketUtil.emitter(self.socket, dbPlayerCredibility.updateTopUpTimesScores, [data.platformObjId, data], actionName, isValidData);
        // },
        //
        // updateGameTypeCountScores: function updateGameTypeCountScores(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjId);
        //     socketUtil.emitter(self.socket, dbPlayerCredibility.updateGameTypeCountScores, [data.platformObjId, data], actionName, isValidData);
        // },
        //
        // updateWinRatioScores: function updateWinRatioScores(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjId);
        //     socketUtil.emitter(self.socket, dbPlayerCredibility.updateWinRatioScores, [data.platformObjId, data], actionName, isValidData);
        // },

        updatePlayerLevelScores: function updatePlayerLevelScores(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerLevel);
            socketUtil.emitter(self.socket, dbPlayerCredibility.updatePlayerLevelScores, [data.platformObjId, data.playerLevel], actionName, isValidData);
        },

        updatePlayerValueConfig: function updatePlayerValueConfig(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerValueConfig);
            socketUtil.emitter(self.socket, dbPlayerCredibility.updatePlayerValueConfig, [data.platformObjId, data.playerValueConfig], actionName, isValidData);
        },

        getCredibilityRemarks: function getCredibilityRemarks(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerCredibility.getCredibilityRemarks, [data.platformObjId], actionName, isValidData);
        },

        addCredibilityRemark: function addCredibilityRemark(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.name && data.score);
            socketUtil.emitter(self.socket, dbPlayerCredibility.addCredibilityRemark, [data.platformObjId, data.name, data.score], actionName, isValidData);
        },

        updateCredibilityRemark: function updateCredibilityRemark(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.remarkObjId && data.name && data.score);
            socketUtil.emitter(self.socket, dbPlayerCredibility.updateCredibilityRemark, [data.platformObjId, data.remarkObjId, data.name, data.score], actionName, isValidData);
        },

        deleteCredibilityRemark: function deleteCredibilityRemark(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.remarkObjId);
            socketUtil.emitter(self.socket, dbPlayerCredibility.deleteCredibilityRemark, [data.platformObjId, data.remarkObjId], actionName, isValidData);
        },

        updateCredibilityRemarksInBulk: function updateCredibilityRemarksInBulk(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            let addRemarks = data.addRemarks || [];
            let updateRemarks = data.updateRemarks || [];
            let deleteRemarks = data.deleteRemarks || [];
            socketUtil.emitter(self.socket, dbPlayerCredibility.updateCredibilityRemarksInBulk, [data.platformObjId, addRemarks, updateRemarks, deleteRemarks], actionName, isValidData);
        },

        getUpdateCredibilityLog: function getUpdateCredibilityLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerCredibility.getUpdateCredibilityLog, [data.playerObjId], actionName, isValidData);
        },
      
        generateObjectId: function generateObjectId(){
          let actionName = arguments.callee.name;
          socketUtil.emitter(self.socket, dbPlatform.generateObjectId, [], actionName, true);
        }

    };
    socketActionPlatform.actions = this.actions;
}

module.exports = socketActionPlatform;
