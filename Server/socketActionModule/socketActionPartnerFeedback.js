let dbPartnerFeedback = require('./../db_modules/dbPartnerFeedback');
let constPartnerFeedbackResult = require('./../const/constPartnerFeedbackResult');
let socketUtil = require('./../modules/socketutility');


function socketActionPartnerFeedback(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Create partner feedback  by partnerId
         * @param {json} data - It has to contain partnerId
         */
        createPartnerFeedback: function createPartnerFeedback(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.partnerId && data.platform);
            socketUtil.emitter(self.socket, dbPartnerFeedback.createPartnerFeedback, [data], actionName, isValidData);
        },

        getPartnerFeedbackReport: function getPartnerFeedbackReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query);
            socketUtil.emitter(self.socket, dbPartnerFeedback.getPartnerFeedbackReport, [data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },


    //PartnerFeedbackResult
        /**
         * Create new partnerFeedbackResult by partnerFeedbackResult data
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackResult" schema
         */
        createPartnerFeedbackResult: function createPartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.key && data.value);
            socketUtil.emitter(self.socket, dbPartnerFeedback.createPartnerFeedbackResult, [data], actionName, isValidData);
        },
        /**
         * get partnerFeedbackResult by value or _id
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackResult" schema
         */
        getPartnerFeedbackResult: function getPartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && (data.key || data.value || data._id));
            socketUtil.emitter(self.socket, dbPartnerFeedback.getPartnerFeedbackResult, [data], actionName, isValidData);
        },
        /**
         * update partnerFeedbackResult by  _id or value
         * @param {json} data - query and updateData
         */
        updatePartnerFeedbackResult: function updatePartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartnerFeedback.updatePartnerFeedbackResult, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all partner feedback results
         */
        getAllPartnerFeedbackResults: function getAllPartnerFeedbackResults() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPartnerFeedback.getAllPartnerFeedbackResults, [{}], actionName, true);
        },

        /**
         * delete partner feedback results
         */
        deletePartnerFeedbackResult: function deletePartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPartnerFeedback.deletePartnerFeedbackResult, [data._id], actionName, isValidData);
        },


    //PartnerFeedbackTopic
        /**
         * Create new partnerFeedbackTopic by partnerFeedbackTopic data
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackTopic" schema
         */
        createPartnerFeedbackTopic: function createPartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.key && data.value);
            socketUtil.emitter(self.socket, dbPartnerFeedback.createPartnerFeedbackTopic, [data], actionName, isValidData);
        },
        /**
         * get partnerFeedbackTopic by value or _id
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackTopic" schema
         */
        getPartnerFeedbackTopic: function getPartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && (data.key || data.value || data._id || data.platform));
            socketUtil.emitter(self.socket, dbPartnerFeedback.getPartnerFeedbackTopic, [data], actionName, isValidData);
        },
        /**
         * update partnerFeedbackTopic by  _id or value
         * @param {json} data - query and updateData
         */
        updatePartnerFeedbackTopic: function updatePartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartnerFeedback.updatePartnerFeedbackTopic, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all partner feedback topics
         */
        getAllPartnerFeedbackTopics: function getAllPartnerFeedbackTopics() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPartnerFeedback.getAllPartnerFeedbackTopics, [{}], actionName, true);
        },

        /**
         * delete partner feedback topics
         */
        deletePartnerFeedbackTopic: function deletePartnerFeedbackTopic(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPartnerFeedback.deletePartnerFeedbackTopic, [data._id], actionName, isValidData);
        },

    };
    socketActionPartnerFeedback.actions = this.actions;
};

module.exports = socketActionPartnerFeedback;
