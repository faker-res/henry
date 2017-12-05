let Q = require('q');
let errorUtils = require('../modules/errorUtils');
let dbConfig = require('../modules/dbproperties');
let dbLogger = require("./../modules/dbLogger");
let constRewardTaskStatus = require('./../const/constRewardTaskStatus');

let dbRewardPointsTask = {

    createRewardPointsTask: (rewardPointsTaskData) => {
        let deferred = Q.defer();
        let rewardPointsTask = new dbConfig.collection_rewardPointsTask(rewardPointsTaskData);
        let taskProm = rewardPointsTask.save();

        taskProm.then(
            data => {
                    deferred.resolve(data);
            },
            error => {
                deferred.reject({name: "DBError", message: "Error creating reward points task", error: error});
            }
        );
        return deferred.promise;
    },

};

module.exports = dbRewardPointsTask;
