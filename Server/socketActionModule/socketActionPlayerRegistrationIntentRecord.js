var encrypt = require('./../modules/encrypt');
var dbPlayerRegistrationIntentRecord = require('./../db_modules/dbPlayerRegistrationIntentRecord');
var socketUtil = require('./../modules/socketutility');
var constRegistrationIntentRecordStatus = require('./../const/constRegistrationIntentRecordStatus');

function socketActionPlayerRegistrationIntentRecord(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create PlayerRegistrationIntentRecord:
         * @param {json} data. It has to contain correct data format, refer schema 'playerRegistrationIntentRecord'
         */
        createPlayerRegistrationIntentRecord: function createPlayerRegistrationIntentRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data); // TODO add the mandatory fields later
            socketUtil.emitter(self.socket, dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecord, [data,data.status], actionName, isValidData);
        },
        /**
         * Get PlayerRegistrationIntentRecord by _id
         * @param {json} data - It has to contain _id of  PlayerRegIntentRecord Object)
         */
        getPlayerRegistrationIntentRecord: function getPlayerRegistrationIntentRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerRegistrationIntentRecord.getPlayerRegistrationIntentRecord, [data], actionName, isValidData);
        },
        /**
         * Get PlayerRegistrationIntentRecord by _id
         * @param {json} data - It has to contain _id of  PlayerRegIntentRecord Object)
         */
        getPlayerRegistrationIntentRecordByPlatform: function getPlayerRegistrationIntentRecordByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerRegistrationIntentRecord.getPlayerRegistrationIntentRecord, [data], actionName, isValidData);
        },
        /**
         * Delete PlayerRegistrationIntentRecord by _ids
         * @param {json} data - It has to contain _id of  PlayerRegIntentRecord Object)
         */
        deletePlayerRegistrationIntentRecord: function deletePlayerRegistrationIntentRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerRegistrationIntentRecord.deletePlayerRegistrationIntentRecord, [data._id], actionName, isValidData);
        },

    };
    socketActionPlayerRegistrationIntentRecord.actions = this.actions;
};

module.exports = socketActionPlayerRegistrationIntentRecord;