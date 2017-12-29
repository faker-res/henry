let dbPlatform = require('./../db_modules/dbPlatform');
let socketUtil = require('./../modules/socketutility');
let dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');
let weeklyPlatformSettlement = require('./../scheduleTask/weeklyPlatformSettlement');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

let constPlayerCreditTransferStatus = require('./../const/constPlayerCreditTransferStatus');
let constPartnerCommissionSettlementMode = require('./../const/constPartnerCommissionSettlementMode');

const dbAutoProposal = require('./../db_modules/dbAutoProposal');
const dbGameProvider = require('./../db_modules/dbGameProvider');
const dbPlayerLevel = require('./../db_modules/dbPlayerLevel');
const dbRewardEvent = require('./../db_modules/dbRewardEvent');
const dbRewardTaskGroup = require('./../db_modules/dbRewardTaskGroup');
const dbPlayerCredibility = require('../db_modules/dbPlayerCredibility');

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
            socketUtil.emitter(self.socket, dbRewardEvent.startSavePlayersCredit, [data.platformObjId, true], actionName, isDataValid);
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
        },

        getPlatformProviderGroup: function getPlatformProviderGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbGameProvider.getPlatformProviderGroup, [data.platformObjId], actionName, isValidData);
        },

        updatePlatformProviderGroup: function updatePlatformProviderGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.gameProviderGroup);
            socketUtil.emitter(self.socket, dbGameProvider.updatePlatformProviderGroup, [data.platformObjId, data.gameProviderGroup], actionName, isValidData);
        },

        batchCreditTransferOut: function batchCreditTransferOut(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.providerObjId && data.platformObjId && data.providerId && data.startDate && data.endDate && data.adminName);
            socketUtil.emitter(self.socket, dbGameProvider.batchCreditTransferOut, [data.providerObjId, data.platformObjId, data.providerId, data.startDate, data.endDate, data.adminName], actionName, isValidData);
        },

        deletePlatformProviderGroup: function deletePlatformProviderGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.gameProviderGroupObjId);
            socketUtil.emitter(self.socket, dbRewardTaskGroup.deletePlatformProviderGroup, [data.gameProviderGroupObjId], actionName, isValidData);
        },


        //Player Advertisement
        getPlayerAdvertisementList: function getPlayerAdvertisementList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.getPlayerAdvertisementList, [data.platformId, data.inputDevice], actionName, isValidData);
        },

        getSelectedAdvList: function getSelectedAdvList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id);
            socketUtil.emitter(self.socket, dbPlatform.getSelectedAdvList, [data.platformId ,data._id, data.subject], actionName, isValidData);
        },

        createNewPlayerAdvertisementRecord: function createNewPlayerAdvertisementRecord(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.advertisementCode && data.inputDevice && data.title && data.backgroundBannerImage && data.imageButton && data.hasOwnProperty("orderNo"));
            socketUtil.emitter(self.socket, dbPlatform.createNewPlayerAdvertisementRecord, [data.platformId, data.orderNo, data.advertisementCode, data.title, data.backgroundBannerImage, data.imageButton, data.inputDevice], actionName, isValidData);
        },

        deleteAdvertisementRecord: function deleteAdvertisementRecord(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.advertisementId);
            socketUtil.emitter(self.socket, dbPlatform.deleteAdvertisementRecord, [data.platformId, data.advertisementId], actionName, isValidData);
        },

        savePlayerAdvertisementRecordChanges: function savePlayerAdvertisementRecordChanges(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.advertisementCode && data.title && data.backgroundBannerImage && data.imageButton && data.inputDevice && data.hasOwnProperty("orderNo"));
            socketUtil.emitter(self.socket, dbPlatform.savePlayerAdvertisementRecordChanges, [data.platformId, data._id, data.orderNo, data.advertisementCode, data.title, data.backgroundBannerImage, data.imageButton, data.inputDevice], actionName, isValidData);
        },

        updateAdvertisementRecord: function updateAdvertisementRecord(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id);
            socketUtil.emitter(self.socket, dbPlatform.updateAdvertisementRecord, [data.platformId, data._id, data.imageButton, data.subject], actionName, isValidData);
        },

        changeAdvertisementStatus: function changeAdvertisementStatus(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.hasOwnProperty("status"));
            socketUtil.emitter(self.socket, dbPlatform.changeAdvertisementStatus, [data.platformId, data._id, data.status], actionName, isValidData);
        },

        checkDuplicateOrderNoWithId: function checkDuplicateOrderNoWithId(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.inputDevice && data.hasOwnProperty("orderNo"));
            socketUtil.emitter(self.socket, dbPlatform.checkDuplicateOrderNoWithId, [data.platformId, data.orderNo, data.inputDevice, data._id], actionName, isValidData);
        },

        checkDuplicateAdCodeWithId: function checkDuplicateAdCodeWithId(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.advertisementCode && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.checkDuplicateAdCodeWithId, [data.platformId, data.advertisementCode, data.inputDevice, data._id], actionName, isValidData);
        },

        checkDuplicateOrderNo: function checkDuplicateOrderNo(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.inputDevice && data.hasOwnProperty("orderNo"));
            socketUtil.emitter(self.socket, dbPlatform.checkDuplicateOrderNo, [data.platformId, data.orderNo, data.inputDevice], actionName, isValidData);
        },

        checkDuplicateAdCode: function checkDuplicateAdCode(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.advertisementCode && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.checkDuplicateAdCode, [data.platformId, data.advertisementCode, data.inputDevice], actionName, isValidData);
        },

        getAdvertisementRecordById: function getAdvertisementRecordById(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id);
            socketUtil.emitter(self.socket, dbPlatform.getAdvertisementRecordById, [data.platformId, data._id], actionName, isValidData);
        },

        getNextOrderNo: function getNextOrderNo(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.getNextOrderNo, [data.platformId, data.inputDevice], actionName, isValidData);
        },

        //Partner Advertisement
        getPartnerAdvertisementList: function getPartnerAdvertisementList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.getPartnerAdvertisementList, [data.platformId, data.inputDevice], actionName, isValidData);
        },

        createNewPartnerAdvertisementRecord: function createNewPartnerAdvertisementRecord(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.hasOwnProperty("orderNo") && data.advertisementCode && data.title && data.backgroundBannerImage && data.imageButton && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.createNewPartnerAdvertisementRecord, [data.platformId, data.orderNo, data.advertisementCode, data.title, data.backgroundBannerImage, data.imageButton, data.inputDevice], actionName, isValidData);
        },

        deletePartnerAdvertisementRecord: function deletePartnerAdvertisementRecord(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.advertisementId);
            socketUtil.emitter(self.socket, dbPlatform.deletePartnerAdvertisementRecord, [data.platformId, data.advertisementId], actionName, isValidData);
        },

        savePartnerAdvertisementRecordChanges: function savePartnerAdvertisementRecordChanges(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.hasOwnProperty("orderNo") && data.advertisementCode && data.title && data.backgroundBannerImage && data.imageButton && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.savePartnerAdvertisementRecordChanges, [data.platformId, data._id, data.orderNo, data.advertisementCode, data.title, data.backgroundBannerImage, data.imageButton, data.inputDevice], actionName, isValidData);
        },

        changePartnerAdvertisementStatus: function changePartnerAdvertisementStatus(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.hasOwnProperty("status"));
            socketUtil.emitter(self.socket, dbPlatform.changePartnerAdvertisementStatus, [data.platformId, data._id, data.status], actionName, isValidData);
        },

        checkPartnerDuplicateOrderNoWithId: function checkPartnerDuplicateOrderNoWithId(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.hasOwnProperty("orderNo") && dadta.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.checkPartnerDuplicateOrderNoWithId, [data.platformId, data.orderNo, data.inputDevice, data._id], actionName, isValidData);
        },

        checkPartnerDuplicateAdCodeWithId: function checkPartnerDuplicateAdCodeWithId(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id && data.advertisementCode && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.checkPartnerDuplicateAdCodeWithId, [data.platformId, data.advertisementCode, data.inputDevice, data._id], actionName, isValidData);
        },

        checkPartnerDuplicateOrderNo: function checkPartnerDuplicateOrderNo(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.hasOwnProperty("orderNo") && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.checkPartnerDuplicateOrderNo, [data.platformId, data.orderNo, data.inputDevice], actionName, isValidData);
        },

        checkPartnerDuplicateAdCode: function checkPartnerDuplicateAdCode(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.advertisementCode && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.checkPartnerDuplicateAdCode, [data.platformId, data.advertisementCode, data.inputDevice], actionName, isValidData);
        },

        getPartnerAdvertisementRecordById: function getPartnerAdvertisementRecordById(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data._id);
            socketUtil.emitter(self.socket, dbPlatform.getPartnerAdvertisementRecordById, [data.platformId, data._id], actionName, isValidData);
        },

        getPartnerNextOrderNo: function getPartnerNextOrderNo(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.inputDevice);
            socketUtil.emitter(self.socket, dbPlatform.getPartnerNextOrderNo, [data.platformId, data.inputDevice], actionName, isValidData);
        }
    };
    socketActionPlatform.actions = this.actions;
}

module.exports = socketActionPlatform;
