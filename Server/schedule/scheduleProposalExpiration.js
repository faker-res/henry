/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

console.log("Proposal schedule for expiration start");

var CronJob = require('cron').CronJob;
var dbProposal = require('./../db_modules/dbProposal');
var errorUtils = require("../modules/errorUtils.js");

var everySecondJob = new CronJob('* * * * * *', function() {

        //check proposal expiration
        dbProposal.checkProposalExpiration().then().catch(errorUtils.reportError);

    }, function () {
        /* This function is executed when the job stops */
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);
