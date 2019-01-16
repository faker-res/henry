var CronJob = require('cron').CronJob;
var dbPlatform = require('./../db_modules/dbPlatform');
var errorUtils = require("../modules/errorUtils.js");

var everyHourJob = new CronJob('0 0-23 * * *', function() {
        //At minute 0 past every hour from 0 through 23
        //check min financial settlement point notification
        console.log("Check Min Point Notification schedule start");
        dbPlatform.checkMinPointNotification().then().catch(errorUtils.reportError);

    }, function () {
        /* This function is executed when the job stops */
        console.log("Check Min Point Notification schedule done");
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);