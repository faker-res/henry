var dbPlayerFeedbackResult = require('./../db_modules/dbPlayerFeedbackResult');
var socketUtil = require('./../modules/socketutility');

function socketActionPlayerFeedbackResult(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Create new playerFeedbackResult by playerFeedbackResult data
         * @param {json} data - It has to contain correct data format. Refer "playerFeedbackResult" schema
         */
        createPlayerFeedbackResult: function createPlayerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.key && data.value);
            socketUtil.emitter(self.socket, dbPlayerFeedbackResult.createPlayerFeedbackResult, [data], actionName, isValidData);
        },
        /**
         * get playerFeedbackResult by value or _id
         * @param {json} data - It has to contain correct data format. Refer "playerFeedbackResult" schema
         */
        getPlayerFeedbackResult: function getPlayerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && (data.key || data.value || data._id));
            socketUtil.emitter(self.socket, dbPlayerFeedbackResult.getPlayerFeedbackResult, [data], actionName, isValidData);
        },
        /**
         * update playerFeedbackResult by  _id or value
         * @param {json} data - query and updateData
         */
        updatePlayerFeedbackResult: function updatePlayerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerFeedbackResult.updatePlayerFeedbackResult, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all player feedback results
         */
        getAllPlayerFeedbackResults: function getAllPlayerFeedbackResults() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerFeedbackResult.getAllPlayerFeedbackResults, [{}], actionName, true);
        },

        /**
         * delete player feedback results
         */
        deletePlayerFeedbackResult: function deletePlayerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerFeedbackResult.deletePlayerFeedbackResult, [data._id], actionName, isValidData);
        }

    };
}

module.exports = socketActionPlayerFeedbackResult;