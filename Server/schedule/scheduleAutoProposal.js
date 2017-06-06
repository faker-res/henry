const CronJob = require('cron').CronJob;

const dbAutoProposal = require('../db_modules/dbAutoProposal');
const dbPlatform = require('../db_modules/dbPlatform');

console.log("Auto proposal schedule start");

let every5MinJob = new CronJob(
    '*/5 * * * *', function () {
        let date = new Date();
        console.log("Auto proposal schedule starts at: ", date);

        return dbPlatform.getAllPlatforms().then(
            platforms => {
                platforms.forEach(
                    platform => {
                        console.log('Auto proposal schedule starts for platform:', platform._id);
                        return dbAutoProposal.applyBonus(platform._id);
                    }
                )
            }
        );
    }, function () {
        /* This function is executed when the job stops */
        console.log('Auto proposal credit schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);