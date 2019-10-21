let CronJob = require('cron').CronJob;

let dbQQGroupControl = require('../db_modules/dbQQGroupControl');

console.log("Check & Update QQ Session Status schedule start");

let checkAndUpdateQQSessionStatusJob = new CronJob(
    // check for job every minute
    '* * * * *', function () {
        let date = new Date();
        console.log("Check & Update QQ Session Status schedule starts at: ", date);

        return dbQQGroupControl.checkAndUpdateQQSessionStatus().catch(
            error => Promise.reject({
                name: "DBError",
                message: "Error executing Check & Update QQ Session Status!",
                error: error
            })
        )
    }, function () {
        /* This function is executed when the job stops */
        console.log('Check & Update QQ Session Status schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);