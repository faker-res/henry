/**
 * Created by hninpwinttin on 14/1/16.
 */

var dbDXMission = require('./../db_modules/dbDXMission');
var socketUtil = require('./../modules/socketutility');

function socketActionDXMission(socketIO, socket) {

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
         * get telemarketing overview
         * @param {json} data - Player data. It has to contain correct data format
         */
        getTeleMarketingOverview: function getTeleMarketingOverview(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.query);
            socketUtil.emitter(self.socket, dbDXMission.getTeleMarketingOverview, [data.platform, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * get DX Mission overview
         * @param {json} data - Player data. It has to contain correct data format
         */
        getDxMission: function getDxMission(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbDXMission.getDxMission, [data], actionName, isValidData);
        },

        /**
         * get All DX Mission
         */
        getAllDxMission: function getAllDxMission(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbDXMission.getAllDxMission, [data.platform], actionName, isValidData);
        },

        /**
         * Create New DX Mission
         * @param {json} data - Player data. It has to contain correct data format
         */
        createDxMission: function createDxMission(data) {

            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.name && data.playerPrefix && data.lastXDigit
                && data.password && data.domain && data.loginUrl && (data.providerGroup || data.providerGroup === '')
                && data.requiredConsumption);
            socketUtil.emitter(self.socket, dbDXMission.createDxMission, [data], actionName, isValidData);
        },

        /**
         * Delete DX Mission and corresponding dx phone which have not use
         */
        deleteDxMissionDxPhone: function deleteDxMissionDxPhone(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbDXMission.deleteDxMissionDxPhone, [data._id], actionName, isValidData);
        },

        /**
         * Update DX Mission
         * @param {json} data - Player data. It has to contain correct data format
         */
        updateDxMission: function updateDxMission(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data._id);
            socketUtil.emitter(self.socket, dbDXMission.updateDxMission, [data._id, data.data], actionName, isValidData);
        },

        /**
         * send SMS to player
         * @param {json} data - Player data. It has to contain correct data format
         */
        sendSMSToDXPlayer: function sendSMSToDXPlayer(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbDXMission.sendSMSToPlayer, [getAdminId(), getAdminName(), data], actionName, isValidData);
        },

        getDXPhoneNumberInfo: function getDXPhoneNumberInfo(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbDXMission.getDXPhoneNumberInfo, [data.platform, data.dxMission, data.index, data.limit, data.sortCol, data], actionName, isValidData);
        },

        getDXPlayerInfo: function getDXPlayerInfo(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbDXMission.getDXPlayerInfo, [data.platform, data.dxMission, data.type, data.searchCriteria, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        updatePhoneNumberRemark: function updatePhoneNumberRemark(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.dxMission);
            socketUtil.emitter(self.socket, dbDXMission.updatePhoneNumberRemark, [data.platform, data.dxMission, data.remarkObj], actionName, isValidData);
        },

        getTsPhoneList: function getTsPhoneList(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbDXMission.getTsPhoneList, [data], actionName, isValidData);
        }

    };

    socketActionDXMission.actions = this.actions;
}

module.exports = socketActionDXMission;
