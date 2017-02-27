var socketUtil = require('./../modules/socketutility');
var dbMessageTemplate = require('./../db_modules/dbMessageTemplate');

function socketActionMessageTemplate (socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {
        /**
         * Retrieve the map of messageTemplate types
         */
        getAllMessageTypes: function getAllMessageTypes () {
            var actionName = arguments.callee.name;
            var isValidData = true;
            socketUtil.emitter(self.socket, dbMessageTemplate.getAllMessageTypes, [], actionName, isValidData);
        },

        /**
         * Create message template
         *  @param {json} data - reward rule data
         */
        createMessageTemplate: function createMessageTemplate (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.type);
            socketUtil.emitter(self.socket, dbMessageTemplate.createMessageTemplate, [data], actionName, isValidData);
        },

        /**
         * Get one message template
         * @param {json} data - data has to contain _id
         */
        getMessageTemplateById: function getMessageTemplateById (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbMessageTemplate.getMessageTemplate, [data], actionName, isValidData);
        },

        /**
         * Get all message templates for platform
         * @param {json} data - data has to contain platform
         */
        getMessageTemplatesForPlatform: function getMessageTemplatesForPlatform (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbMessageTemplate.getMessageTemplates, [{platform: data.platform}], actionName, isValidData);
        },

        /**
         * Update one message template
         *  @param {json} data - data has to contain query and updateData
         */
        updateMessageTemplate: function updateMessageTemplate (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbMessageTemplate.updateMessageTemplate, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * delete message templates by id
         * @param {json} data - data has to contain _ids
         */
        deleteMessageTemplateByIds: function deleteMessageTemplateByIds (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbMessageTemplate.removeMessageTemplatesById, [data._ids], actionName, isValidData);
        }
    };
    socketActionMessageTemplate.actions = this.actions;
}

module.exports = socketActionMessageTemplate;