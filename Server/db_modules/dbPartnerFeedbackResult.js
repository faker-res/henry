let dbconfig = require('./../modules/dbproperties');

let dbPartnerFeedbackResult = {

    /**
     * Create a new PartnerFeedbackResult
     * @param {json} partnerFeedbackResultData - The data of the PartnerFeedbackResult. Refer to PartnerFeedbackResult schema.
     */
    createPartnerFeedbackResult: function (partnerFeedbackResultData) {
        let partnerFeedbackResult = new dbconfig.collection_partnerFeedbackResult(partnerFeedbackResultData);
        return partnerFeedbackResult.save();
    },

    /**
     * Update a PartnerFeedbackResult information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePartnerFeedbackResult: function (query, updateData) {
        return dbconfig.collection_partnerFeedbackResult.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PartnerFeedbackResult information
     * @param {String}  query - The query string
     */
    getPartnerFeedbackResult: function (query) {
        return dbconfig.collection_partnerFeedbackResult.find(query);
    },

    /**
     * Delete PartnerFeedbackResult information
     * @param {String} partnerFeedbackResultObjId - ObjectId of the PartnerFeedbackResult
     */
    deletePartnerFeedbackResult: function (partnerFeedbackResultObjId) {
        return dbconfig.collection_partnerFeedbackResult.remove({_id: partnerFeedbackResultObjId});
    },

    /**
     * Get the information of all the partner feedback results
     */
    getAllPartnerFeedbackResults: function () {
        return dbconfig.collection_partnerFeedbackResult.find().exec();
    }
};

module.exports = dbPartnerFeedbackResult;