console.log("Statistics schedule start");

var CronJob = require('cron').CronJob;
var everyMinuteJob = new CronJob('0 * * * * *', function() {
        var date = new Date();
        console.log("Statistics", date);
        console.log('Statistics Every minute job!');
    }, function () {
        /* This function is executed when the job stops */
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);