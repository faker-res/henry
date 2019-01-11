console.log("Auction schedule start");

var CronJob = require('cron').CronJob;
var dbProposal = require('./../db_modules/dbProposal');
var dbAuction = require('./../db_modules/dbAuction');

var errorUtils = require("../modules/errorUtils.js");

var everyMinuteJob = new CronJob('0 * * * * *', function() {

        dbAuction.auctionExecute();

    }, function () {
        /* This function is executed when the job stops */
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);
