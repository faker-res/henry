let dbPartnerFeedbackTopic = require('./../db_modules/dbPartnerFeedbackTopic');
let socketUtil = require('./../modules/socketutility');

function socketActionPartnerFeedbackTopic(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Create new partnerFeedbackTopic by partnerFeedbackTopic data
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackTopic" schema
         */
        createPartnerFeedbackTopic: function createPartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.key && data.value);
            socketUtil.emitter(self.socket, dbPartnerFeedbackTopic.createPartnerFeedbackTopic, [data], actionName, isValidData);
        },
        /**
         * get partnerFeedbackTopic by value or _id
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackTopic" schema
         */
        getPartnerFeedbackTopic: function getPartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && (data.key || data.value || data._id));
            socketUtil.emitter(self.socket, dbPartnerFeedbackTopic.getPartnerFeedbackTopic, [data], actionName, isValidData);
        },
        /**
         * update partnerFeedbackTopic by  _id or value
         * @param {json} data - query and updateData
         */
        updatePartnerFeedbackTopic: function updatePartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartnerFeedbackTopic.updatePartnerFeedbackTopic, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all partner feedback topics
         */
        getAllPartnerFeedbackTopics: function getAllPartnerFeedbackTopics() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPartnerFeedbackTopic.getAllPartnerFeedbackTopics, [{}], actionName, true);
        },

        /**
         * delete partner feedback topics
         */
        deletePartnerFeedbackTopic: function deletePartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPartnerFeedbackTopic.deletePartnerFeedbackTopic, [data._id], actionName, isValidData);
        }

    };
}

module.exports = socketActionPartnerFeedbackTopic;