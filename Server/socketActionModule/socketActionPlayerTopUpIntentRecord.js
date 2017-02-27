/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var encrypt = require('./../modules/encrypt');
var dbPlayerTopUpIntentRecord = require('./../db_modules/dbPlayerTopUpIntentRecord');
var socketUtil = require('./../modules/socketutility');
var constTopUpIntentRecordStatus = require('./../const/constTopUpIntentRecordStatus');
var dbPaymentChannel = require('./../db_modules/dbPaymentChannel');

function socketActionPlayerTopUpIntentRecord(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create PlayerTopUpIntentRecord:
         * @param {json} data. It has to contain correct data format, refer schema 'playerTopUpIntentRecord'
         */
        createPlayerTopUpIntentRecord: function createPlayerTopUpIntentRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerTopUpIntentRecord.createPlayerTopUpIntentRecord, [data], actionName, isValidData);
        },

        /**
         * update playerTopUpIntentRecord:
         * @param {json} data. It has to contain correct data format
         */
        updatePlayerTopUpIntentRecord: function updatePlayerTopUpIntentRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPlayerTopUpIntentRecord.updatePlayerTopUpIntentRecord, [data.query, data.updateData], actionName, isValidData);
        },
        /**
         * Get PlayerTopUpIntentRecord by _id
         * @param {json} data - It has to contain _id of  PlayerLoginRecord Object)
         */
        getPlayerTopUpIntentRecord: function getPlayerTopUpIntentRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerTopUpIntentRecord.getPlayerTopUpIntentRecord, [data], actionName, isValidData);
        },

        /**
         * Get PlayerTopUpIntentRecord by platform
         * @param {json} data - It has to contain _id of  PlayerLoginRecord Object)
         */
        getPlayerTopUpIntentRecordByPlatform: function getPlayerTopUpIntentRecordByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerTopUpIntentRecord.getPlayerTopUpIntentRecord, [data], actionName, isValidData);
        },

        /**
         * Get the record status list
         */
        getPlayerTopUpIntentRecordStatusList: function getPlayerTopUpIntentRecordStatusList(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constTopUpIntentRecordStatus});
        },

        // /**
        //  * Get the payment channel list
        //  */
        // getAllPaymentChannels: function getAllPaymentChannels() {
        //     var actionName = arguments.callee.name;
        //     socketUtil.emitter(self.socket, dbPaymentChannel.getAllPaymentChannels, [], actionName, true);
        // }

    };
    socketActionPlayerTopUpIntentRecord.actions = this.actions;
};

module.exports = socketActionPlayerTopUpIntentRecord;