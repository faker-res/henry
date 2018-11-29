let CronJob = require('cron').CronJob;

let dbWCGroupControl = require('../db_modules/dbWCGroupControl');

console.log("Check & Update WC Session Status schedule start");

let checkAndUpdateWCSessionStatusJob = new CronJob(
    // check for job every minute
    '* * * * *', function () {
        let date = new Date();
        console.log("Check & Update WC Session Status schedule starts at: ", date);

        return dbWCGroupControl.checkAndUpdateWCSessionStatus().catch(
            error => Promise.reject({
                name: "DBError",
                message: "Error executing Check & Update WC Session Status!",
                error: error
            })
        )
    }, function () {
        /* This function is executed when the job stops */
        console.log('Check & Update WC Session Status schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);