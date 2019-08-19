let CronJob = require('cron').CronJob;

let dbPlayerInfo = require("../db_modules/dbPlayerInfo");

console.log('auto unbind referral schedule start');

let autoUnbindReferralJob = new CronJob(
    // check for job every minute
    '* * * * *', function() {
        let date = new Date();
        console.log('auto unbind referral schedule starts at: ', date);

        return dbPlayerInfo.executeAutoUnbindReferral().catch(
            error => Promise.reject({
                name: 'DBError',
                message: 'Error executing auto unbind referral Status!',
                error: error
            })
        )
    }, function() {
        /* This function is executed when the job stops */
        console.log('auto unbind referral schedule done');
    },
    true /* Start the job right now */
    // timeZone /* Time zone of this job. */
);