var Q = require('q');
var errorUtils = require('../modules/errorUtils');
var dbConfig = require('../modules/dbproperties');

var dbRewardPointsLog = {

    /**
     * Create a new reward
     * @param {Object} data
     */
    createRewardPointsLog: function (data) {
        return dbConfig.collection_rewardPointsLog.create(data).catch(
            error => {
                return Q.reject({name: "DataError", message: "Could not create reward points log", error: error});
            }
        );
    },

};

module.exports = dbRewardPointsLog;
