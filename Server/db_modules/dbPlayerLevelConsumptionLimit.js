var dbconfig = require('./../modules/dbproperties');

var dbPlayerLevelConsumptionLimit = {

    /**
     * Create a new playerLevelConsumptionLimit
     * @param {json} data - The data of the playerLevelConsumptionLimit. Refer to playerLevelConsumptionLimit schema.
     */
    createPlayerLevelConsumptionLimit: function (playerLevelConsumptionLimit) {
        var playerLevelConsumptionLimit = new dbconfig.collection_playerLevel(playerLevelConsumptionLimit);
        return playerLevelConsumptionLimit.save();
    },

    /**
     * Update a playerLevelConsumptionLimit information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerLevelConsumptionLimit: function (query, updateData) {
        return dbconfig.collection_playerLevelConsumptionLevel.findOneAndUpdate(query, updateData);

    },

    /**
     * Get playerLevelConsumptionLimit information
     * @param {String}  query - The query string
     */
    getPlayerLevelConsumptionLimit: function (query) {
        return dbconfig.collection_playerLevelConsumptionLevel.find(query);

    },

    /**
     * Delete playerLevelConsumptionLimit information
     * @param {String}  - ObjectId of the playerLevelConsumptionLimit
     */
    deletePlayerLevelConsumptionLimit: function (playerLevelConsumptionLimitObjId) {
        return dbconfig.collection_playerLevelConsumptionLevel.remove({_id: playerLevelConsumptionLimitObjId});
    }
}

module.exports = dbPlayerLevelConsumptionLimit;