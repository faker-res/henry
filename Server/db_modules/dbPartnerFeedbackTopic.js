let dbconfig = require('./../modules/dbproperties');

let dbPartnerFeedbackTopic = {

    /**
     * Create a new PartnerFeedbackTopic
     * @param {json} partnerFeedbackTopicData - The data of the PartnerFeedbackTopic. Refer to PartnerFeedbackTopic schema.
     */
    createPartnerFeedbackTopic: function (partnerFeedbackTopicData) {
        let partnerFeedbackTopic = new dbconfig.collection_partnerFeedbackTopic(partnerFeedbackTopicData);
        return partnerFeedbackTopic.save();
    },

    /**
     * Update a PartnerFeedbackTopic information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePartnerFeedbackTopic: function (query, updateData) {
        return dbconfig.collection_partnerFeedbackTopic.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PartnerFeedbackTopic information
     * @param {String}  query - The query string
     */
    getPartnerFeedbackTopic: function (query) {
        return dbconfig.collection_partnerFeedbackTopic.find(query);
    },

    /**
     * Delete PartnerFeedbackTopic information
     * @param {String} partnerFeedbackTopicObjId - ObjectId of the PartnerFeedbackTopic
     */
    deletePartnerFeedbackTopic: function (partnerFeedbackTopicObjId) {
        return dbconfig.collection_partnerFeedbackTopic.remove({_id: partnerFeedbackTopicObjId});
    },

    /**
     * Get the information of all the partner feedback topics
     */
    getAllPartnerFeedbackTopics: function () {
        return dbconfig.collection_partnerFeedbackTopic.find().exec();
    }
};

module.exports = dbPartnerFeedbackTopic;