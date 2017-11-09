var dbPlayerFeedback = require('./../db_modules/dbPlayerFeedback');
var constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');
var socketUtil = require('./../modules/socketutility');


function socketActionPlayerFeedback(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create player feedback  by playerId
         * @param {json} data - It has to contain playerId
         */
        createPlayerFeedback: function createPlayerFeedback(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.platform);
            socketUtil.emitter(self.socket, dbPlayerFeedback.createPlayerFeedback, [data], actionName, isValidData);
        },

        /**
         * Get player feedback info by playerId or _id
         * @param {json} data - It has to contain playerId
         */
        getPlayerFeedbacks: function getPlayerFeedbacks(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerFeedback.getPlayerFeedbacks, [data], actionName, isValidData);
        },
        getAllPlayerFeedbacks: function getAllPlayerFeedbacks(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPlayerFeedback.getAllPlayerFeedbacks, [data.query, data.admin, data.cs, data.player, data.index, data.limit, data.sortCol], actionName, isValidData);
        },
        getPlayerFeedbackReport: function getPlayerFeedbackReport(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPlayerFeedback.getPlayerFeedbackReport, [data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },
        /**
         * Get player feedback info by playerId or _id
         */
        getPlayerFeedbackResults: function getPlayerFeedbackResults(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerFeedbackResult});
        },
        getSinglePlayerFeedbackQuery: function getSinglePlayerFeedbackQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPlayerFeedback.getSinglePlayerFeedbackQuery, [data.query, data.index], actionName, isValidData);
        },
        getPlayerFeedbackQuery: function getPlayerFeedbackQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPlayerFeedback.getPlayerFeedbackQuery, [data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * Get the latest 5 player feedback record
         * @param {json} data - It has to contain player object id
         */
        getPlayerLastNFeedbackRecord: function getPlayerLastNFeedbackRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerFeedback.getPlayerLastNFeedbackRecord, [data.playerId, data.limit], actionName, isValidData);
        }

    };
    socketActionPlayerFeedback.actions = this.actions;
};

module.exports = socketActionPlayerFeedback;