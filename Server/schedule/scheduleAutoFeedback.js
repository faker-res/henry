let CronJob = require('cron').CronJob;

let dbPlatformAutoFeedback = require('../db_modules/dbPlatformAutoFeedback');

console.log("Auto feedback schedule start");

let dailyAutoFeedbackJob = new CronJob(
    // check for job every minute
    '* * * * *', function () {
        let date = new Date();
        console.log("Auto feedback schedule starts at: ", date);
        console.log("Auto feedback check against: ", date.getHours()+":"+date.getMinutes());

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