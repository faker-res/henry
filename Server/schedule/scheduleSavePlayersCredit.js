let CronJob = require('cron').CronJob;

let dbRewardEvent = require('../db_modules/dbRewardEvent');

console.log("Save players credit schedule start");

let everyDayAtTwelveAMJob = new CronJob(
    '0 0 0 * * *', function() {
        let date = new Date();
        console.log("Save players credit schedule starts at: ", date);

        return dbRewardEvent.startSavePlayersCredit();
    }, function () {
        /* This function is executed when the job stops */
        console.log('Save players credit schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);