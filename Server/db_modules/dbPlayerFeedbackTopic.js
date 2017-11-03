var dbconfig = require('./../modules/dbproperties');

var dbPlayerFeedbackTopic = {

    /**
     * Create a new PlayerFeedbackTopic
     * @param {json} data - The data of the PlayerFeedbackTopic. Refer to PlayerFeedbackTopic schema.
     */
    createPlayerFeedbackTopic : function(playerFeedbackTopicData){
        let playerFeedbackTopic = new dbconfig.collection_playerFeedbackTopic(playerFeedbackTopicData);
        return playerFeedbackTopic.save();
    },

    /**
     * Update a PlayerFeedbackTopic information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerFeedbackTopic: function(query, updateData) {
        return dbconfig.collection_playerFeedbackTopic.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PlayerFeedbackTopic information
     * @param {String}  query - The query string
     */
    getPlayerFeedbackTopic : function(query) {
        return dbconfig.collection_playerFeedbackTopic.find(query);
    },

    /**
     * Delete PlayerFeedbackTopic information
     * @param {String}  - ObjectId of the PlayerFeedbackTopic
     */
    deletePlayerFeedbackTopic : function(playerFeedbackTopicObjId) {
        return dbconfig.collection_playerFeedbackTopic.remove({_id:playerFeedbackTopicObjId});
    },

    /**
     * Get the information of all the player feedback topics
     */
    getAllPlayerFeedbackTopics : function() {
        return dbconfig.collection_playerFeedbackTopic.find().exec();
    }
};

module.exports = dbPlayerFeedbackTopic;