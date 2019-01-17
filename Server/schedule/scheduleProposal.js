console.log("Proposal schedule start");

var CronJob = require('cron').CronJob;
var dbProposal = require('./../db_modules/dbProposal');
var errorUtils = require("../modules/errorUtils.js");
var dbAuction = require('./../db_modules/dbAuction');

var everyMinuteJob = new CronJob('0 * * * * *', function() {

        //check manual top up proposal expiration
        dbProposal.checkManualTopUpExpiration().then().catch(errorUtils.reportError);
        dbProposal.checkLimitedOfferTopUpExpiration().then().catch(errorUtils.reportError);
        dbProposal.checkProposalExpiration().then().catch(errorUtils.reportError);
        //dbAuction.auctionExecute();
    }, function () {
        /* This function is executed when the job stops */
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);
