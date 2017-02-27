/**
 * Created by hninpwinttin on 29/1/16.
 */
var dbconfig = require('./../modules/dbproperties');

var dbPlayerLevelInfo = {

    /**
     * Create a new playerLevel
     * @param {json} data - The data of the playerLevel. Refer to playerLevel schema.
     */
    createPlayerLevel : function(playerLevelData){
        var playerLevel = new dbconfig.collection_playerLevel(playerLevelData);
        return playerLevel.save();
    },

    /**
     * Update a playerLevel information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerLevel: function(query, updateData) {
        return dbconfig.collection_playerLevel.findOneAndUpdate(query, updateData);
    },

    /**
     * Get playerLevel information
     * @param {String}  query - The query string
     */
    getPlayerLevel : function(query) {
        return dbconfig.collection_playerLevel.find(query);
    },

    /**
     * Delete playerLevel information
     * @param {String}  - ObjectId of the playerLevel
     */
    deletePlayerLevel : function(playerLevelObjId) {
        return dbconfig.collection_playerLevel.remove({_id:playerLevelObjId});
    }
}

module.exports = dbPlayerLevelInfo;