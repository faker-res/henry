var dbconfig = require('./../modules/dbproperties');

var dbPlayerFeedbackResult = {

    /**
     * Create a new PlayerFeedbackResult
     * @param {json} data - The data of the PlayerFeedbackResult. Refer to PlayerFeedbackResult schema.
     */
    createPlayerFeedbackResult : function(playerFeedbackResultData){
        let playerFeedbackResult = new dbconfig.collection_playerFeedbackResult(playerFeedbackResultData);
        return playerFeedbackResult.save();
    },

    /**
     * Update a PlayerFeedbackResult information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerFeedbackResult: function(query, updateData) {
        return dbconfig.collection_playerFeedbackResult.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PlayerFeedbackResult information
     * @param {String}  query - The query string
     */
    getPlayerFeedbackResult : function(query) {
        return dbconfig.collection_playerFeedbackResult.find(query);
    },

    /**
     * Delete PlayerFeedbackResult information
     * @param {String}  - ObjectId of the PlayerFeedbackResult
     */
    deletePlayerFeedbackResult : function(playerFeedbackResultObjId) {
        return dbconfig.collection_playerFeedbackResult.remove({_id:playerFeedbackResultObjId});
    },

    /**
     * Get the information of all the player feedback results
     */
    getAllPlayerFeedbackResults : function() {
        return dbconfig.collection_playerFeedbackResult.find().exec();
    }
};

module.exports = dbPlayerFeedbackResult;