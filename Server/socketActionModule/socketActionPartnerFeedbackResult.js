let dbPartnerFeedbackResult = require('./../db_modules/dbPartnerFeedbackResult');
let socketUtil = require('./../modules/socketutility');

function socketActionPartnerFeedbackResult(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {

        /**
         * Create new partnerFeedbackResult by partnerFeedbackResult data
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackResult" schema
         */
        createPartnerFeedbackResult: function createPartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.key && data.value);
            socketUtil.emitter(self.socket, dbPartnerFeedbackResult.createPartnerFeedbackResult, [data], actionName, isValidData);
        },
        /**
         * get partnerFeedbackResult by value or _id
         * @param {json} data - It has to contain correct data format. Refer "partnerFeedbackResult" schema
         */
        getPartnerFeedbackResult: function getPartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && (data.key || data.value || data._id));
            socketUtil.emitter(self.socket, dbPartnerFeedbackResult.getPartnerFeedbackResult, [data], actionName, isValidData);
        },
        /**
         * update partnerFeedbackResult by  _id or value
         * @param {json} data - query and updateData
         */
        updatePartnerFeedbackResult: function updatePartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPartnerFeedbackResult.updatePartnerFeedbackResult, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all partner feedback results
         */
        getAllPartnerFeedbackResults: function getAllPartnerFeedbackResults() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPartnerFeedbackResult.getAllPartnerFeedbackResults, [{}], actionName, true);
        },

        /**
         * delete partner feedback results
         */
        deletePartnerFeedbackResult: function deletePartnerFeedbackResult(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPartnerFeedbackResult.deletePartnerFeedbackResult, [data._id], actionName, isValidData);
        }

    };
}

module.exports = socketActionPartnerFeedbackResult;