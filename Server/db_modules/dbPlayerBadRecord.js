var dbconfig = require('./../modules/dbproperties');
var dbPlayerBadRecordInfo = {

    /**
     * Create a new PlayerBadRecord
     * @param {json} data - The data of the PlayerBadRecord. Refer to PlayerBadRecord schema.
     */
    createPlayerBadRecord : function(playerBadRecordData){
        var playerBadRecord = new dbconfig.collection_playerBadRecord(playerBadRecordData);
        return playerBadRecord.save();
    },

    /**
     * Update a PlayerBadRecord information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerBadRecord: function(query, updateData) {
        return dbconfig.collection_playerBadRecord.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PlayerBadRecord information
     * @param {String}  query - The query string
     */
    getPlayerBadRecord : function(query) {
        return dbconfig.collection_playerBadRecord.find(query);
    },

    /**
     * Delete PlayerBadRecord information
     * @param {String}  - ObjectId of the PlayerBadRecord
     */
    deletePlayerBadRecord : function(PlayerBadRecordObjId) {
        return dbconfig.collection_playerBadRecord.remove({_id:PlayerBadRecordObjId});
    },

    /**
     * Get the information of all the player bad records
     */
    getAllPlayerBadRecords : function() {
        return dbconfig.collection_playerBadRecord.find().exec();
    }
};

module.exports = dbPlayerBadRecordInfo;