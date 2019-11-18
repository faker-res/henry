var CronJob = require('cron').CronJob;
var playerBillBoardranking = require('./../scheduleTask/PlayerBillBoardRanking');
var errorUtils = require("../modules/errorUtils.js");
// at every minute = 0, means every hours
var hourJob = new CronJob('0 * * * *', function() {
        console.log('hour job start');
        return playerBillBoardranking.calculateWinAllRanking().then(
            function(data) {
                if (data) {
                    console.log('LK checking calculate ranking success');
                }
            }
        ).catch(
            function(error) {
                console.log('LK checking calculate ranking failed', error);
                errorUtils.reportError(error);
            }
        );
}, function() {
        console.log("Hour Job Done", Date());
    },
    true /* Start the job right now */
    // timeZone Time zone of this job.
);
