/**
 * Created by hninpwinttin on 29/1/16.
 */
var dbconfig = require('./../modules/dbproperties');

var dbPlayerTrustLevelInfo = {

    /**
     * Create a new PlayerTrustLevel
     * @param {json} data - The data of the PlayerTrustLevel. Refer to PlayerTrustLevel schema.
     */
    createPlayerTrustLevel : function(playerTrustLevelData){
        var playerTrustLevel = new dbconfig.collection_playerTrustLevel(playerTrustLevelData);
        return playerTrustLevel.save();
    },

    /**
     * Update a PlayerTrustLevel information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerTrustLevel: function(query, updateData) {
        return dbconfig.collection_playerTrustLevel.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PlayerTrustLevel information
     * @param {String}  query - The query string
     */
    getPlayerTrustLevel : function(query) {
        return dbconfig.collection_playerTrustLevel.find(query);
    },

    /**
     * Delete PlayerTrustLevel information
     * @param {String}  - ObjectId of the PlayerTrustLevel
     */
    deletePlayerTrustLevel : function(PlayerTrustLevelObjId) {
        return dbconfig.collection_playerTrustLevel.remove({_id:PlayerTrustLevelObjId});
    },

    /**
     * Get the information of all the player trust levels
     */
    getAllPlayerTrustLevels : function() {
        return dbconfig.collection_playerTrustLevel.find().exec();
    }
};

module.exports = dbPlayerTrustLevelInfo;