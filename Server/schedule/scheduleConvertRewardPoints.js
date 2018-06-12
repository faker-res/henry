let CronJob = require('cron').CronJob;

let dbPlayerRewardPoints = require('../db_modules/dbPlayerRewardPoints');

console.log("Auto convert reward points schedule start");

let daily0020Job = new CronJob(
    // Every 5 minutes from 12:00AM to 12:30AM every day
    '20 0 * * *', function () {
        let date = new Date();
        console.log("Auto convert reward points schedule starts at: ", date);

        return dbPlayerRewardPoints.startConvertPlayersRewardPoints().catch(
            error => Promise.reject({
                name: "DBError",
                message: "Error converting player reward points!",
                error: error
            })
        )
    }, function () {
        /* This function is executed when the job stops */
        console.log('Save players credit schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);