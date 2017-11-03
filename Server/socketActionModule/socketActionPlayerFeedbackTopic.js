var dbPlayerFeedbackTopic = require('./../db_modules/dbPlayerFeedbackTopic');
var socketUtil = require('./../modules/socketutility');

function socketActionPlayerFeedbackTopic(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Create new playerFeedbackTopic by playerFeedbackTopic data
         * @param {json} data - It has to contain correct data format. Refer "playerFeedbackTopic" schema
         */
        createPlayerFeedbackTopic: function createPlayerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.key && data.value);
            socketUtil.emitter(self.socket, dbPlayerFeedbackTopic.createPlayerFeedbackTopic, [data], actionName, isValidData);
        },
        /**
         * get playerFeedbackTopic by value or _id
         * @param {json} data - It has to contain correct data format. Refer "playerFeedbackTopic" schema
         */
        getPlayerFeedbackTopic: function getPlayerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && (data.key || data.value || data._id));
            socketUtil.emitter(self.socket, dbPlayerFeedbackTopic.getPlayerFeedbackTopic, [data], actionName, isValidData);
        },
        /**
         * update playerFeedbackTopic by  _id or value
         * @param {json} data - query and updateData
         */
        updatePlayerFeedbackTopic: function updatePlayerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerFeedbackTopic.updatePlayerFeedbackTopic, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all player feedback topics
         */
        getAllPlayerFeedbackTopics: function getAllPlayerFeedbackTopics() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerFeedbackTopic.getAllPlayerFeedbackTopics, [{}], actionName, true);
        },

        /**
         * delete player feedback topics
         */
        deletePlayerFeedbackTopic: function deletePlayerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerFeedbackTopic.deletePlayerFeedbackTopic, [data._id], actionName, isValidData);
        }

    };
}

module.exports = socketActionPlayerFeedbackTopic;