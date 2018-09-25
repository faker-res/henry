const CronJob = require('cron').CronJob;
const errorUtils = require("../modules/errorUtils.js");

const dbAutoProposal = require('../db_modules/dbAutoProposal');
const dbPlatform = require('../db_modules/dbPlatform');
var dbconfig = require('./../modules/dbproperties');

console.log("Auto proposal schedule start");

let every1MinJob = new CronJob(
    '*/1 * * * *', function () {
        let date = new Date();
        console.log("Auto proposal schedule starts at: ", date);

        dbconfig.collection_platform.find({enableAutoApplyBonus: true}).then(
            platforms => {
                platforms.forEach(
                    platform => {
                        console.log('Auto proposal schedule starts for platform:', platform._id, platform.name);
                        return dbAutoProposal.applyBonus(platform._id);
                    }
                )
            }
        ).catch(errorUtils.reportError);

        dbconfig.collection_platform.find({partnerEnableAutoApplyBonus: true}).then(
            platforms => {
                platforms.forEach(
                    platform => {
                        console.log('Auto partner proposal schedule starts for platform:', platform._id, platform.name);
                        return dbAutoProposal.applyPartnerBonus(platform._id);
                    }
                )
            }
        ).catch(errorUtils.reportError);
    }, function () {
        /* This function is executed when the job stops */
        console.log('Auto proposal credit schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);