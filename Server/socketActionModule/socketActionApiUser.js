/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var encrypt = require('./../modules/encrypt');
var dbApiUser = require('./../db_modules/db-api-user');
var socketUtil = require('./../modules/socketutility');
var serverInstance = require("../modules/serverInstance");

function socketActionApiUser(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create a new api user
         * @param {json} data - api-user data
         */
        createApiUser: function createApiUser(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.password);
            socketUtil.emitter(self.socket, dbApiUser.addApiUser, [data], actionName, isValidData);
        },

        /**
         * delete user
         * @param {json} - {_id:xxxx} Obj id of the apiuser
         */
        deleteApiUser: function deleteApiUser(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbApiUser.deleteApiUser, [data._id], actionName, isValidData);
        },

        /** 
         * Get API server status 
         * @param {json} data 
         */
        getAPIServerStatus: function getAPIServerStatus(data) {
            var actionName = arguments.callee.name;
            var cpAPIClient = serverInstance.getCPAPIClient();
            var pAPIClient = serverInstance.getPaymentAPIClient();
            self.socket.emit("_" + actionName, {
                cpms: cpAPIClient ? cpAPIClient.isOpen() : false,
                pms: pAPIClient ? pAPIClient.isOpen() : false
            });
        }
    };
    socketActionApiUser.actions = this.actions;
};

module.exports = socketActionApiUser;