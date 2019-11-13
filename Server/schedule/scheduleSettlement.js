var CronJob = require('cron').CronJob;
var playerSummary = require('./../scheduleTask/playerSummary');
var consecutiveTopUpEvent = require('./../scheduleTask/consecutiveTopUpEvent');
var dbPlatform = require('./../db_modules/dbPlatform');
const dbTeleSales = require('./../db_modules/dbTeleSales');
var dbGameProvider = require('./../db_modules/dbGameProvider');
var dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');
var weeklyPlatformSettlement = require('./../scheduleTask/weeklyPlatformSettlement');
var dailyProviderSettlement = require('./../scheduleTask/dailyProviderSettlement');
var promiseUtils = require("../modules/promiseUtils.js");
var errorUtils = require("../modules/errorUtils.js");

console.log("Settlement schedule start");

/* This function is executed every minute */
var minuteJob = new CronJob('0 * * * * *', function() {
    // create daily settlement cronJob for each game provider
    console.log('settlement cron job start');
    var processProviders = () => dbGameProvider.getAllGameProviders().then(
        function(providers) {
            console.log('settlement cron job done getAllGameProviders');
            if ( providers ) {
                return promiseUtils.each(providers, function(providerData) {
                    // start daily settlement for platform
                    if (providerData.dailySettlementHour != null && providerData.dailySettlementMinute != null) {
                        return dailyProviderSettlement.startDailyProviderSettlement(providerData).then(
                            function(data) {
                                if (data) {
                                    console.log(new Date().toString() + "Daily Provider Settlement Done", providerData._id, data);
                                }
                            }
                        ).catch(
                            function(error) {
                                console.log("Daily Provider Settlement error", providerData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }
                });
            }

            else {
                console.log("No game providers");
            }
        },
        function(error) {
            console.log("Error finding all game providers", error);
        }
    ).catch(
        function(error) {
            console.log("Error executing provider settlement", error.stack || error);
        }
    );

    // create daily settlement cronJob for each platform
    var processPlatforms = () => dbPlatform.getAllPlatforms().then(
        function(platforms) {
            if (platforms) {
                let curTime = new Date();
                return promiseUtils.each(platforms, function (platformData) {
                    var task1 = null;
                    var task2 = null;
                    var task3 = null;
                    var task4 = null;
                    var task5 = null;
                    var task6 = null;

                    // start daily settlement for platform
                    if (platformData.dailySettlementHour != null && platformData.dailySettlementMinute != null) {
                        task1 = () => dailyPlatformSettlement.startDailyPlatformSettlement(platformData).then(
                            function(data) {
                                if (data) {
                                    console.log(new Date().toString() + "Daily Platform Settlement Done", platformData._id, data);
                                }
                            }
                        ).catch(
                            function(error) {
                                console.log("Daily Platform Settlement error doing", platformData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    // create weekly cronjob for each platform
                    if (platformData.weeklySettlementDay != null && platformData.weeklySettlementHour != null && platformData.weeklySettlementMinute != null) {
                        task2 = () => weeklyPlatformSettlement.startWeeklyPlatformSettlement(platformData).then(
                            function(data) {
                                if (data) {
                                    console.log(new Date().toString() + "Weekly Platform Settlement Done", platformData._id, data);
                                }
                            }
                        ).catch(
                            function(error) {
                                console.log("Weekly Platform Settlement error doing", platformData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    // refresh bankCard, wechat, alipay daily quota if using FPMS payment type
                    if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                        task3 = () => dailyPlatformSettlement.startDailyRefreshPaymentQuota(platformData).then(
                            data => {
                                if (data) {
                                    console.log(new Date().toString() + "Daily Refresh Payment Quota Done", platformData._id, data);
                                }
                            }
                        ).catch(
                            function(error) {
                                console.log("Daily Refresh Payment Quota error doing", platformData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    task4 = () => dailyPlatformSettlement.startDailyTsDistributePhone(platformData).then(
                        data => {
                            if (data) {
                                console.log(new Date().toString() + "Daily Distribute tsPhone Done", platformData._id, data)
                            }
                        }
                    ).catch(
                        function(error) {
                            console.log("Daily Distribute tsPhone error doing", platformData._id);
                            errorUtils.reportError(error);
                        }
                    );

                    // hard code to reset player data at 00:00
                    if (curTime.getHours() == 0 && curTime.getMinutes() == 0) {
                        task5 = () => dbPlatform.resetPlatformPlayerLevelData(platformData._id).then(
                            data => {
                                if (data) {
                                    console.log(new Date().toString() + "Daily reset player level data Done", platformData._id, data)
                                }
                            }
                        ).catch(
                            error => {
                                console.log({
                                    name: "DBError",
                                    message: "Error resetting platform player level data!",
                                    error: error
                                })
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    // hard code check at 02:00 everyday
                    if (curTime.getHours() == 2 && curTime.getMinutes() == 0) {
                        task6 = () => dailyPlatformSettlement.startDailyDecomposeTsPhoneList(platformData).then(
                            data => {
                                if (data) {
                                    console.log(new Date().toString() + "Daily Decompose tsPhone Done", platformData._id, data)
                                }
                            }
                        ).catch(
                            function(error) {
                                console.log("Daily Decompose tsPhone error doing", platformData._id);
                                errorUtils.reportError(error);
                            }
                        );
                    }

                    return promiseUtils.each([task1, task2, task3, task4, task5, task6], task => task && task() );
                });
            }
        },
        function(error) {
            console.log("Error finding all platforms", error);
        }
    ).catch(
        function(error) {
            console.log("Error executing platform settlement", error.stack || error);
        }
    );

    var processTsPhone = () => {
        // phone trade
        let curTime = new Date();
        let task1 = null;

        // hard code check at 04:00 everyday
        if (curTime.getHours() == 4 && curTime.getMinutes() == 0) {
            task1 = () => dbTeleSales.dailyTradeTsPhone().then(
                data => {
                    if (data) {
                        console.log(new Date().toString() + "Daily Phone Trade Done", data)
                    }
                }
            ).catch(
                function(error) {
                    console.log("Daily Phone Trade error doing");
                    errorUtils.reportError(error);
                }
            );
        }

        return promiseUtils.each([task1], task => task && task() );
    }

    return Promise.all([processProviders(), processTsPhone(), processPlatforms()]);

}, function() {
        console.log("Daily Settlement Done", Date());
    },
    true /* Start the job right now */
    // timeZone /* Time zone of this job. */
);