let CronJob = require('cron').CronJob;

let dbPlatformAutoFeedback = require('../db_modules/dbPlatformAutoFeedback');

console.log("Auto feedback schedule start");

let dailyAutoFeedbackJob = new CronJob(
    // 1400, 1500, 1600 of everyday
    '0 14,15,16 * * *', function () {
        let date = new Date();
        console.log("Auto feedback schedule starts at: ", date);

        return dbPlatformAutoFeedback.executeAutoFeedback().catch(
            error => Promise.reject({
                name: "DBError",
                message: "Error executing auto feedback!",
                error: error
            })
        )
    }, function () {
        /* This function is executed when the job stops */
        console.log('Auto feedback schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);