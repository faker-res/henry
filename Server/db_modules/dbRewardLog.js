var Q = require('q');
var errorUtils = require('../modules/errorUtils');
var dbconfig = require('../modules/dbproperties');

var dbRewardLog = {

    /**
     * Create a new reward
     * @param {Object} data
     */
    createRewardLog: function (data) {
        return dbconfig.collection_rewardLog.create(data).catch(
            error => {
                return Q.reject({name: "DataError", message: "Could not create reward log", error: error});
            }
        );
    },

};

module.exports = dbRewardLog;
