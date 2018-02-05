let CronJob = require('cron').CronJob;

let dbQualityInspection = require('../db_modules/dbQualityInspection');

console.log("Live 800 daily summarize schedule start");

let everyDayAtTwelveAMJob = new CronJob(
    // Every 5 minutes from 12:00AM to 12:30AM every day
    '0 15 0 * * *', function () {
        dbQualityInspection.summarizeLive800Record().then().catch(errorUtils.reportError);
    }, function () {
        /* This function is executed when the job stops */
        console.log('Live 800 daily summarize schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);