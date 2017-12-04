var Q = require('q');
var errorUtils = require('../modules/errorUtils');
var dbConfig = require('../modules/dbproperties');
var dbLogger = require("./../modules/dbLogger");
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');

var dbRewardPointsTask = {

    createRewardPointsTask: (rewardPointsTaskData, proposalData, playerRewardPoint) => {
        let deferred = Q.defer();
        let rewardPointsTask = new dbConfig.collection_rewardTask(rewardPointsTaskData);
        let taskProm = rewardPointsTask.save();

        taskProm.then(
            data => {
                if (data && data[0]) {
                    dbLogger.createRewardPointsLog(playerRewardPoint._id, data._id, proposalData.data.beforeRewardPoints, proposalData.data.afterRewardPoints);
                    deferred.resolve(data[0]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot create reward points task"});
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error creating reward points task", error: error});
            }
        );
        return deferred.promise;
    },

};

module.exports = dbRewardPointsTask;
