let CronJob = require('cron').CronJob;

let dbQualityInspection = require('../db_modules/dbQualityInspection');
let dbUtility = require('../modules/dbUtility');

let everyDayAtTwelveAMJob = new CronJob(
    // Every 5 minutes from 12:00AM to 12:30AM every day
    '0 15 0 * * *', function () {
        let startDate = new Date();
        let endDate = new Date();
        console.log("live 800 daily summary schedule starts at: ", startDate);
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - 1);

        endDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate());

        startDate = dbUtility.getLocalTimeString(startDate);
        endDate = dbUtility.getLocalTimeString(endDate);
        return dbQualityInspection.getSummarizedLive800RecordCount(startDate, endDate).then(
            summarizedRecordCount => {
                let summarizedRecord = summarizedRecordCount && summarizedRecordCount[0] ? summarizedRecordCount[0] : null;
                if(!summarizedRecord || !summarizedRecord.mysqlLive800Record || !summarizedRecord.mongoLive800Record
                || summarizedRecord.mysqlLive800Record != summarizedRecord.mongoLive800Record){
                    dbQualityInspection.resummarizeLive800Record(startDate, endDate).catch(errorUtils.reportError);
                }
            }
        )

    }, function () {
        /* This function is executed when the job stops */
        console.log('Live 800 daily summarize schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);