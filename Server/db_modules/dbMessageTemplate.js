var constMessageType = require("../const/constMessageType");
var constMessageTypeParam = require("../const/constMessageTypeParam");
var dbconfig = require('./../modules/dbproperties');
var Q = require("q");

var dbMessageTemplate = {

    /**
     * Retrieve the map of messageTemplate types
     */
    getAllMessageTypes: function () {
        return Q.resolve(constMessageTypeParam);
    },

    /**
     * Create a new message template
     * @param {json} messageTemplate - The data of the message template.  Refer to messageTemplate schema.
     */
    createMessageTemplate: function (data) {
        var messageTemplate = new dbconfig.collection_messageTemplate(data);
        return messageTemplate.save();
    },

    /**
     * Get one message template by query
     * @param {String} query
     */
    getMessageTemplate: function (query) {
        return dbconfig.collection_messageTemplate.findOne(query).exec();
    },

    /**
     * Get multiple message templates by query
     * @param {String} query
     */
    getMessageTemplates: function (query) {
        return dbconfig.collection_messageTemplate.find(query);
    },

    /**
     * Update message template
     * @param {String} query string
     * @param {JSON} updateData
     */
    updateMessageTemplate: function (query, updateData) {
        return dbconfig.collection_messageTemplate.findOneAndUpdate(query, updateData);
    },

    /**
     * Remove message templates by id
     * @param {Array} ids
     */
    removeMessageTemplatesById: function (ids) {
        return dbconfig.collection_messageTemplate.remove({_id: {$in: ids}});
    }

};

module.exports = dbMessageTemplate;