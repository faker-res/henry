var socketUtil = require('./../modules/socketutility');
var dbPlayerMail = require('../db_modules/dbPlayerMail');

function socketActionPlayerMail (socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Send a message to a player from the current admin
         *  @param {json} data - data has to contain query and updateData
         */
        sendPlayerMailFromAdminToPlayer: function sendPlayerMailFromAdminToPlayer (data) {
            var actionName = arguments.callee.name;
            var adminObjId = self.socket.decoded_token._id;
            var isValidData = Boolean(data && data.platformId && data.adminName && data.playerId && (data.title || data.content));
            socketUtil.emitter(self.socket, dbPlayerMail.sendPlayerMailFromAdminToPlayer, [data.platformId, adminObjId, data.adminName, data.playerId, data.title, data.content], actionName, isValidData);
        },

        /**
         * Send a message to all players from the current admin
         *  @param {json} data - data has to contain query and updateData
         */
        sendPlayerMailFromAdminToAllPlayers: function sendPlayerMailFromAdminToAllPlayers(data) {
            var actionName = arguments.callee.name;
            var adminObjId = self.socket.decoded_token._id;
            var isValidData = Boolean(data && data.platformId && data.adminName && (data.title || data.content));
            socketUtil.emitter(self.socket, dbPlayerMail.sendPlayerMailFromAdminToAllPlayers, [data.platformId, adminObjId, data.adminName, data.title, data.content], actionName, isValidData);
        },
        /**
         * Send a message to a player from the given player
         */
        sendPlayerMailFromPlayerToPlayer: function sendPlayerMailFromPlayerToPlayer (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.senderPlayerId && data.recipientPlayerId && (data.title || data.content));
            socketUtil.emitter(self.socket, dbPlayerMail.sendPlayerMailFromPlayerToPlayer, [data.senderPlayerId, data.recipientPlayerId, data.title, data.content], actionName, isValidData);
        },

        /**
         * Send a message to an admin from the given player
         */
        sendPlayerMailFromPlayerToAdmin: function sendPlayerMailFromPlayerToAdmin (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.senderPlayerId && data.recipientAdminObjId && (data.title || data.content));
            socketUtil.emitter(self.socket, dbPlayerMail.sendPlayerMailFromPlayerToAdmin, [data.senderPlayerId, data.recipientAdminObjId, data.title, data.content], actionName, isValidData);
        },

        getAdminMailList: function getAdminMailList (data) {
            var adminObjId = self.socket.decoded_token ? self.socket.decoded_token._id : null;
            var actionName = arguments.callee.name;
            var isValidData = Boolean(adminObjId);
            socketUtil.emitter(self.socket, dbPlayerMail.getPlayerMails, [{recipientType: 'admin', recipientId: adminObjId}], actionName, isValidData);
        }

    };
    socketActionPlayerMail.actions = this.actions;
}

module.exports = socketActionPlayerMail;