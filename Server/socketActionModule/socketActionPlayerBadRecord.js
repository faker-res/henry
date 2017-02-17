var dbPlayerBadRecord = require('./../db_modules/dbPlayerBadRecord');
var socketUtil = require('./../modules/socketutility');

function socketActionPlayerBadRecord(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create new playerBadRecord by playerBadRecord data
         * @param {json} data - record data. It has to contain correct data format. Refer "record" schema
         */
        createPlayerBadRecord: function createPlayerBadRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbPlayerBadRecord.createPlayerBadRecord, [data], actionName, isValidData);
        },

        /**
         * get playerBadRecord by partner name or _id
         * @param {json} data - record data. It has to contain correct data format. Refer "record" schema
         */
        getPlayerBadRecord: function getPlayerBadRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id));
            socketUtil.emitter(self.socket, dbPlayerBadRecord.getPlayerBadRecord, [data], actionName, isValidData);
        },

        /**
         * get playerBadRecords by array of id
         * @param {json} data - record data. It has to contain correct data format. Refer "record" schema
         */
        getPlayerBadRecords: function getPlayerBadRecords(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbPlayerBadRecord.getPlayerBadRecord, [{_id: {$in: data._ids}}], actionName, isValidData);
        },

        /**
         * update playerBadRecord by  _id or name
         * @param {json} data - query and updateData
         */
        updatePlayerBadRecord: function updatePlayerBadRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerBadRecord.updatePlayerBadRecord, [data.query, data.updateData], actionName, isValidData);

        },

        /**
         * get all player Bad Records
         */
        getAllPlayerBadRecords: function getAllPlayerBadRecords() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerBadRecord.getAllPlayerBadRecords,[{}], actionName);
        },

        /**
         * delete player Bad Record
         */
        deletePlayerBadRecord: function deletePlayerBadRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerBadRecord.deletePlayerBadRecord, [data._id], actionName, isValidData);
        },

        /**
         * get playerBadRecord by platformId
         * @param {json} data. It has to contain platformId
         */
        getPlayerBadRecordByPlatformId: function getPlayerBadRecordByPlatformId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerBadRecord.getPlayerBadRecord, [{platform: data.platformId}], actionName, isValidData);
        }

    };
};

module.exports = socketActionPlayerBadRecord;

