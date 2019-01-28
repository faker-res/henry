let CronJob = require('cron').CronJob;

let dbAuction = require('./../db_modules/dbAuction');

let everyHourPassOneMinJob = new CronJob(
    // check for job every hour pass one minute
    '1 0-23 * * *', function () {

        console.log("start auction ending process schedule");
        return dbAuction.auctionExecuteEnd();

    }, function () {
        /* This function is executed when the job stops */
        console.log('Auction ending process schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);