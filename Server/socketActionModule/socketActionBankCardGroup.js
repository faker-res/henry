var dbPlatformBankCardGroup = require('./../db_modules/dbPlatformBankCardGroup');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var socketUtil = require('./../modules/socketutility');
var pmsAPI = require('../externalAPI/pmsAPI');
let RESTUtils = require('./../modules/RESTUtils');
const constAccountType = require('../const/constAccountType');

function socketActionBankCardGroup(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Get platform BankCardGroup by platform data
         * @param {json} data - platformId
         */
        getPlatformBankCardGroup: function getPlatformBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getPlatformBankCardGroup, [ObjectId(data.platform)], actionName, isValidData);
        },

        /**
         * Get all the bank card groups by platformObjId without sync with PMS
         * Since every time when the page load up, it will run the one with sync,
         * it is not necessary to do it multiple times within 5 minutes when admin
         * are changing card groups
         * @param {String}  platform - ObjId of the platform
         */
        getPlatformBankCardGroupLite: function getPlatformBankCardGroupLite(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getPlatformBankCardGroupLite, [data], actionName, isValidData);
        },

        /**
         * Create platform BankCardGroup by BankCardGroup data
         * @param {json} data - BankCardGroup data
         */
        addPlatformBankCardGroup: function addPlatformBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.platform && data.code && data.displayName);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.addPlatformBankCardGroup, [data.platform, data.name, data.code, data.displayName], actionName, isValidData);
        },
        /**
         * Get all the merchants from pms
         * @param {json} data - query data
         */
        getAllBankCard: function getAllBankCard(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getAllBankCard, [data.platform], actionName, isValidData);
        },
        /**
         * Get all the games by platform and the BankCardGroup
         * @param {json} data - query data
         */
        getIncludedBankCardByBankCardGroup: function getIncludedBankCardByBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.bankCardGroup);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getIncludedBankCardByBankCardGroup, [data.platform, data.bankCardGroup], actionName, isValidData);
        },

        /**
         * Get all the games which are not in this BankCardGroup
         * @param {json} data - query data
         */
        getExcludedBankCardByBankCardGroup: function getExcludedBankCardByBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.bankCardGroup);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getExcludedBankCardByBankCardGroup, [data.platform, data.bankCardGroup], actionName, isValidData);
        },

        /**
         * Update this BankCardGroup / Add or Remove games into/from the group
         * @param {json} data - query data
         * @param {json} update - update data
         */
        updatePlatformBankCardGroup: function updatePlatformBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.updatePlatformBankCardGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Update this BankCardGroup to remove all bank cards from all bank card group
         * @param {json} data - query data
         * @param {json} update - update data
         */
        updatePlatformAllBankCardGroup: function updatePlatformAllBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.update);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.updatePlatformAllBankCardGroup, [data.query, data.update], actionName, isValidData);
        },

        /**
         * Delete game group by id / Delete the BankCardGroup and all its all sub-groups (all children)
         * @param {json} data - It has to contain ObjId of the group
         */
        deleteBankCardGroup: function deleteBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.removeBankCardGroup, [data._id, data.platform], actionName, isValidData);
        },

        /**
         * Set default bank card group by platform and default group id
         * @param {json} data
         */
        setPlatformDefaultBankCardGroup: function setPlatformDefaultBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.default);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.setPlatformDefaultBankCardGroup, [data.platform, data.default], actionName, isValidData);
        },

        /**
         * Get bank type list
         * @param {json} data
         */
        getBankTypeList: function getBankTypeList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getBankTypeList, [data.platform], actionName, isValidData);
        },

        getBankCardList: function getBankCardList(data) {
            let actionName = arguments.callee.name;
            let query = {
                platformId: data.platformId,
                accountType: constAccountType.BANK_CARD
            };

            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postBankCardList", query], actionName, true);
        },

        getZoneList: function getZoneList(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getZoneList, [data.provinceId, data.cityId], actionName, true);
        },
        getProvinceList: function getProvinceList(data) {
            var actionName = arguments.callee.name;
            //socketUtil.emitter(self.socket, pmsAPI.foundation_getProvinceList, [{}], actionName, true);
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postProvinceList", {}], actionName, true);
        },
        getCityList: function getCityList(data) {
            var actionName = arguments.callee.name;
            // socketUtil.emitter(self.socket, pmsAPI.foundation_getCityList, [{provinceId: data.provinceId}], actionName, true);
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postCityList", {provinceId: data.provinceId}], actionName, true);
        },
        getDistrictList: function getDistrictList(data) {
            var actionName = arguments.callee.name;
            // socketUtil.emitter(self.socket, pmsAPI.foundation_getDistrictList, [{
            //     provinceId: data.provinceId,
            //     cityId: data.cityId
            // }], actionName, true);
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postDistrictList", {provinceId: data.provinceId, cityId: data.cityId}], actionName, true);
        },
        getProvince: function getProvince(data) {
            var actionName = arguments.callee.name;
            // socketUtil.emitter(self.socket, pmsAPI.foundation_getProvince, [{provinceId: data.provinceId}], actionName, true);
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postProvince", {provinceId: data.provinceId}], actionName, true);
        },
        getCity: function getCity(data) {
            var actionName = arguments.callee.name;
            // socketUtil.emitter(self.socket, pmsAPI.foundation_getCity, [{cityId: data.cityId}], actionName, true);
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postCity", {cityId: data.cityId}], actionName, true);
        },
        getDistrict: function getDistrict(data) {
            var actionName = arguments.callee.name;
            // socketUtil.emitter(self.socket, pmsAPI.foundation_getDistrict, [{districtId: data.districtId}], actionName, true);
            socketUtil.emitter(self.socket, RESTUtils.getPMS2Services, ["postDistrict", {districtId: data.districtId}], actionName, true);
        },

        /**
         * Get bank type list
         * @param {json} data.type =one among ['province', 'city','district']
         * @param {json} data.id is the zone id, such as 000010
         */
        getZone: function getZone(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.type && data.id);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getZone, [data.type, data.id], actionName, Boolean(data));
        },

        /**
         * Add multiple players to bank card group
         * @param {json} data
         */
        addPlayersToBankCardGroup: function addPlayersToBankCardGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.bankCardGroupObjId && data.playerObjIds && data.playerObjIds.length > 0);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.addPlayersToBankCardGroup, [data.bankCardGroupObjId, data.playerObjIds, data.platform], actionName, isValidData);
        },

        /**
         * Add all players to bank card group
         * @param {json} data
         */
        addAllPlayersToBankCardGroup: function addAllPlayersToBankCardGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.bankCardGroupObjId && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.addAllPlayersToBankCardGroup, [data.bankCardGroupObjId, data.platformObjId], actionName, isValidData);
        },

        syncBankCardGroupData: function syncBankCardGroupData(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.syncBankCardGroupData, [data.platformObjId], actionName, true);
        },

        createNewBankCardAcc: function createNewBankCardAcc(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.accountNumber && data.name && data.bankTypeId);

            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.createNewBankCardAcc, [data], actionName, isValidData);
        },

        updateBankCardAcc: function updateBankCardAcc(data) {
            let actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.updateBankCardAcc, [data.query, data.updateData], actionName, isValidData);
        },

        deleteBankCardAcc: function deleteBankCardAcc(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.deleteBankCardAcc, [data._id], actionName, isValidData);
        },

        getPMSPaymentGroup: function getPMSPaymentGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getPaymentGroup, [data.platformId, data.type], actionName, isValidData);
        },

        getPMSUserPaymentGroup: function getPMSUserPaymentGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.playerName);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getUserPaymentGroup, [data.platformId, data.playerName, data.topUpSystemType, data.accountType], actionName, isValidData);
        },

        getPMSBankCardGroup: function getPMSBankCardGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatformBankCardGroup.getPMSBankCardGroup, [data.platformId, data.topUpSystemType], actionName, isValidData);
        },
    };
    socketActionBankCardGroup.actions = this.actions;
};

module.exports = socketActionBankCardGroup;