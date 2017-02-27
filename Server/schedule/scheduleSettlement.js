var CronJob = require('cron').CronJob;
var playerSummary = require('./../scheduleTask/playerSummary');
var consecutiveTopUpEvent = require('./../scheduleTask/consecutiveTopUpEvent');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbGameProvider = require('./../db_modules/dbGameProvider');
var dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');
var weeklyPlatformSettlement = require('./../scheduleTask/weeklyPlatformSettlement');
var dailyProviderSettlement = require('./../scheduleTask/dailyProviderSettlement');
var promiseUtils = require("../modules/promiseUtils.js");
var errorUtils = require("../modules/errorUtils.js");

console.log("Settlement schedule start");

/* This function is executed every minute */
var minuteJob = new CronJob('0 * * * * *', function () {
    //create daily settlement cronJob for each game provider
    var processProviders = () => dbGameProvider.getAllGameProviders().then(
        function(providers){
            if( providers ){
                return promiseUtils.each(providers, function (providerData) {
                    //start daily settlement for platform
                    if (providerData.dailySettlementHour != null && providerData.dailySettlementMinute != null) {
                        return dailyProviderSettlement.startDailyProviderSettlement(providerData).then(
                            function (data) {
                                if (data) {
                                    console.log(new Date().toString() + "Daily Provider Settlement Done", providerData._id, data);
                                }
                            }
                        ).catch(
                            function (error) {
                                console.log("Daily Provider Settlement error", providerData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }
                });
            }
            else{
                console.log("No game providers");
            }
        },
        function(error){
            console.log("Error finding all game providers", error);
        }
    ).catch(
        function (error) {
            console.log("Error executing provider settlement", error.stack || error);
        }
    );

    //create daily settlement cronJob for each platform
    var processPlatforms = () => dbPlatform.getAllPlatforms().then(
        function (platforms) {
            if (platforms) {
                return promiseUtils.each(platforms, function (platformData) {
                    var task1 = null;
                    var task2 = null;

                    //start daily settlement for platform
                    if (platformData.dailySettlementHour != null && platformData.dailySettlementMinute != null) {

                        task1 = () => dailyPlatformSettlement.startDailyPlatformSettlement(platformData).then(
                            function (data) {
                                if (data) {
                                    console.log(new Date().toString() + "Daily Platform Settlement Done", platformData._id, data);
                                }
                            }
                        ).catch(
                            function (error) {
                                console.log("Daily Platform Settlement error doing", platformData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    //create weekly cronjob for each platform
                    if (platformData.weeklySettlementDay != null && platformData.weeklySettlementHour != null && platformData.weeklySettlementMinute != null) {
                        task2 = () => weeklyPlatformSettlement.startWeeklyPlatformSettlement(platformData).then(
                            function (data) {
                                if (data) {
                                    console.log(new Date().toString() + "Weekly Platform Settlement Done", platformData._id, data);
                                }
                            }
                        ).catch(
                            function (error) {
                                console.log("Weekly Platform Settlement error doing", platformData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    return promiseUtils.each([task1, task2], task => task && task() );
                });
            }
        },
        function (error) {
            console.log("Error finding all platforms", error);
        }
    ).catch(
        function (error) {
            console.log("Error executing platform settlement", error.stack || error);
        }
    );

    return processProviders().then(processPlatforms);

}, function () {
        console.log("Daily Settlement Done", Date());
    },
    true /* Start the job right now */
    //timeZone /* Time zone of this job. */
);