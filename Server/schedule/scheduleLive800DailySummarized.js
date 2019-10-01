let CronJob = require('cron').CronJob;

let dbQualityInspection = require('../db_modules/dbQualityInspection');
let dbUtility = require('../modules/dbutility');
let errorUtils = require('../modules/errorUtils');

let everyDayAtTwelveAMJob = new CronJob(
    // run at 0015 every day
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
        // to get the summarized record of total record, effective record and non-effective record
        let getSummarizedProm = dbQualityInspection.getSummarizedLive800RecordCount(startDate, endDate).then(
            summarizedRecordCount => {
                let summarizedRecord = summarizedRecordCount && summarizedRecordCount[0] ? summarizedRecordCount[0] : null;
                if(!summarizedRecord || !summarizedRecord.mysqlLive800Record || !summarizedRecord.mongoLive800Record
                || summarizedRecord.mysqlLive800Record != summarizedRecord.mongoLive800Record){
                    return dbQualityInspection.resummarizeLive800Record(startDate, endDate);
                }
            }
        );

        // // to record down the conversation record for speeding up the searching time
        // let recordProm = dbQualityInspection.getLive800Records(startDate, endDate);
        //
        // // to get the proposal settled manually and save in daily summary record
        // let manualProm = dbQualityInspection.getManualProposalDailySummaryRecord(dbUtility.getNDaysAgoFromSpecificStartTime(dbUtility.getTodaySGTime().startTime, 1), dbUtility.getNDaysAgoFromSpecificStartTime(dbUtility.getTodaySGTime().endTime, 1));

        // return Promise.all([getSummarizedProm, recordProm, manualProm]).then(
        return getSummarizedProm.then(
            () => {
                return dbQualityInspection.summarizeCsRankingData(startDate, endDate)
            }
        ).catch(errorUtils.reportError)

    }, function () {
        /* This function is executed when the job stops */
        console.log('Live 800 daily summarize schedule done');
        // console.log('Live 800 daily record schedule done');
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);