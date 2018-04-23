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

    };
    socketActionPartnerFeedback.actions = this.actions;
};

module.exports = socketActionPartnerFeedback;