var dbUtilityFunc = function () {
};
module.exports = new dbUtilityFunc();

var constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const constPMSClientType = require("../const/constPMSClientType");
const constVoiceCodeProvider = require("../const/constVoiceCodeProvider");
const uaParser = require('ua-parser-js');
const rsaCrypto = require('../modules/rsaCrypto');
var Q = require("q");
var dbconfig = require("./dbproperties.js");
var moment = require('moment-timezone');
var geoip2ws = require('geoip2ws');
var geoip2wsCity = new geoip2ws(101359, "oVO2d561nEW9", 'city');
var datx = require('ipip-datx');
var path = require('path');
var ipipCity = new datx.City(path.join(__dirname, "../IPIPDotNet/17monipdb.datx"));
const queryPhoneLocationFromPackage = require('cellocate');
const env = require('./../config/env').config();
const rp = require('request-promise');
const sha1 = require('sha1')
const QcloudSms = require('qcloudsms_js');

var dbUtility = {

    /**
     * This function is to build the JSON format of query data required in the query of create, update and find operations in Mongodb
     *
     * Query data in Find operation:
     * collection.find({userid:'abcd'})
     *
     * Insert data in Create operation:
     * collection.insert({"userid:abcd', 'email':'abcd@gmail.com, 'firstname':'ab','lastName':'cd'})
     *
     * Update data:
     * collection.update({'id':"123456'},update:{'firstname':'efg','lastName':'hij'})
     * **/
    buildQueryString: function (data, keys) {
        var keyLength = keys.length;
        var queryData = {};
        for (var i = 0; i < keyLength; i++) {
            if (data[keys[i]]) {
                queryData[keys[i]] = data[keys[i]];
            }
        }
        return queryData;
    },

    /**
     * Common function update two collections with many to many relationship
     * @param {Object} collection1 - collection1 mongoose model
     * @param {String} collection1Ops - collection1 update operation
     * @param {Array} collection1Ids - objectIds for collection1 documents
     * @param {Object} collection2 - collection2 mongoose model
     * @param {String} collection2Ops - collection2 update operation
     * @param {Array} collection2Ids - objectIds for collection2 documents
     */
    updateManyToManyCollections: function (collection1, collection1Ops, collection1Ids, collection2, collection2Ops, collection2Ids) {
        var deferred = Q.defer();

        var collection1Prom = collection1.update(
            {
                _id: {$in: collection1Ids}
            },
            collection1Ops,
            {multi: true}
        ).exec();

        var collection2Prom = collection2.update(
            {
                _id: {$in: collection2Ids}
            },
            collection2Ops,
            {multi: true}
        ).exec();

        Q.all([collection1Prom, collection2Prom]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("updateManyToManyCollections error", error);
                deferred.reject({name: 'DBError', message: 'Failed to update db data!', error: error});
            });

        return deferred.promise;
    },

    //region Time

    sendVoiceCode: async function (phoneNumber, smsCode, voiceCodeProvider) {
        voiceCodeProvider = voiceCodeProvider || constVoiceCodeProvider.TENCENT_CLOUD;
        if (voiceCodeProvider == constVoiceCodeProvider.TENCENT_CLOUD) {
            // 语音消息应用 SDK AppID
            var appid = env.voiceCodeSecret;  // SDK AppID 以1400开头
            // 语音消息应用 App Key
            var appkey = env.voiceCodeKEY;
            // 需要发送语音消息的手机号码
            // var phoneNumbers = phoneNumber;
            // 语音模板 ID，需要在语音消息控制台中申请
            // var templateId = 7839;  // NOTE: 这里的模板 ID`7839`只是示例，真实的模板 ID 需要在语音消息控制台中申请
            // 实例化 QcloudSms
            var qcloudSms = QcloudSms(appid, appkey);

            // return Promise.resolve({haha:"walao"})
            let cvsender = qcloudSms.CodeVoiceSender();
            // cvsender.send("86", phoneNumber, String(smsCode), 2, "", callback);
            let prom = new Promise((resolve, reject) => {
                cvsender.send("86", phoneNumber, String(smsCode), 2, "", (err, res, resData) => {
                    if (err) {
                        console.log("send voice code failed", err)
                        reject({
                            name: "DataError",
                            message: "Voice code failed to send, please contact customer service"
                        });
                    } else {
                        if (resData && resData.result == 0) {
                            resolve(resData);
                        } else {
                            console.log("send voice code failed", resData)
                            reject({
                                name: "DataError",
                                message: "Voice code failed to send, please contact customer service"
                            });
                        }
                        // console.log("request data: ", res.req);
                        // console.log("response data: ", resData);
                    }
                });
            })

            // 指定模板
            // var templateId = 12345;
            // var params = ["5678"];
            // var tvsender = qcloudsms.TtsVoiceSender();
            // tvsender.send("86", phoneNumbers[0], templateId, params, 2, "", callback);

            return prom;
        } else if (voiceCodeProvider == constVoiceCodeProvider.NETEASE) {


            let nonce = "";
            let curTime = new Date().getTime();
            const HEX_DIGITS = "0123456789abcdef";

            function checkSumBuilder(randomStr) {
                let maxRand = randomStr.length - 1;
                let minRand = 0;
                for (let i = 0; i < 20; i++) {            //随机字符串最大128个字符，也可以小于该数
                    nonce += randomStr.charAt(Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand);
                }

                let joinString = env.voiceCodeSecret_NE + nonce + String(curTime);
                return sha1(joinString);
            }

            let options = {
                method: "POST",
                uri: env.voiceCodeUrl_NE,
                headers: {
                    AppKey: env.voiceCodeKEY_NE,
                    CurTime: String(curTime),
                    CheckSum: checkSumBuilder(HEX_DIGITS),
                    Nonce: nonce,
                    'Content-Type': "application/x-www-form-urlencoded"
                },
                form: {
                    mobile: phoneNumber,
                    authCode: Number(smsCode),
                    templateid: 14794553 // yun xin setting
                },
                json: true // Automatically stringifies the body to JSON
            };

            return rp(options).then(
                data => {
                    if (!(data && data.code && data.code == 200)) {
                        //315	IP限制
                        //403	非法操作或没有权限
                        //414	参数错误
                        //416	频率控制
                        //500	服务器内部错误
                        console.log("send voice code error", data)
                        return Promise.reject({
                            name: "DataError",
                            message: "Voice code failed to send, please contact customer service"
                        });
                    }
                    return data;
                },
                err => {
                    console.log("send voice code failed", err)
                    return Promise.reject({
                        name: "DataError",
                        message: "Voice code failed to send, please contact customer service"
                    });
                }
            )
        } else if (voiceCodeProvider == constVoiceCodeProvider.YUNPIAN) {

            let options = {
                method: "POST",
                uri: env.voiceCodeUrl_YP,
                headers: {
                    'Accept': "application/json;charset=utf-8;",
                    'Content-Type': "application/x-www-form-urlencoded;charset=utf-8;"
                },
                form: {
                    apikey: env.voiceCodeKEY_YP,
                    mobile: phoneNumber,
                    code: String(smsCode)
                },
                json: true // Automatically stringifies the body to JSON
            };

            return rp(options).then(
                data => {
                    console.log("check send voice code", data);
                    return data;
                },
                err => {
                    console.log("send voice code failed", err)
                    return Promise.reject({
                        name: "DataError",
                        message: err
                    });
                }
            )
        }

    },

    //region Specific time
    getFirstDayOfYear: () => {
        return moment().tz('Asia/Singapore').startOf('year').toDate();
    },

    //endregion
    //region Period around given time
    /*
     * Get day time frame based on input date
     */
    getDayTime: function (inputDate) {
        var startTime = moment(inputDate).tz('Asia/Singapore').startOf("day").toDate();
        var endTime = moment(inputDate).tz('Asia/Singapore').endOf("day").toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    /*
     * Get week time frame based on input date
     */
    getWeekTime: function (inputDate) {
        // because start of week is monday instead of sunday, -1 day to get the actual 'start of week' (when inputDate land on monday)
        inputDate = new Date(inputDate);
        inputDate.setDate(inputDate.getDate() -1);
        var startTime = moment(inputDate).tz('Asia/Singapore').startOf("week").add(1, 'day').toDate();
        var endTime = moment(inputDate).tz('Asia/Singapore').startOf("week").add(1, 'day').add(1, 'week').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastBiWeekConsumptionReturnSGTime: function (inputData) {
        let lastBiWeekTime = dbUtility.getLastBiWeekSGTime();
        let startTime = lastBiWeekTime.startTime;
        let endTime = lastBiWeekTime.endTime;
        startTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
        endTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000);

        return {
            startTime: startTime,
            endTime: endTime
        };

    },

    getCurrentBiWeekConsumptionReturnSGTime: function (inputData) {
        let currentBiWeekTime = dbUtility.getCurrentBiWeekSGTime();
        let startTime = currentBiWeekTime.startTime;
        let endTime = currentBiWeekTime.endTime;
        startTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
        endTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000);

        return {
            startTime: startTime,
            endTime: endTime
        };

    },

    getBiWeekSGTIme: function (inputDate) {
        let startTime = moment(inputDate).tz('Asia/Singapore').startOf('month').toDate();
        let endTime = moment(startTime).add(14, 'days').toDate();
        let todayDay = moment(inputDate).tz('Asia/Singapore').date();

        if (todayDay >= 15) {
            startTime = endTime;
            endTime = moment(inputDate).tz('Asia/Singapore').endOf('month').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getHalfMonthSGTIme: function (inputDate) {
        let startTime = moment(inputDate).tz('Asia/Singapore').startOf('month').toDate();
        let endTime = moment(startTime).add(15, 'days').toDate();
        let todayDay = moment(inputDate).tz('Asia/Singapore').date();

        if (todayDay >= 16) {
            startTime = endTime;
            endTime = moment(inputDate).tz('Asia/Singapore').endOf('month').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getMonthSGTIme: function (inputDate) {
        var startTime = moment(inputDate).tz('Asia/Singapore').startOf('month').toDate();
        var endTime = moment(inputDate).tz('Asia/Singapore').endOf('month').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastMonthSGTImeFromDate: function (inputDate) {
        var startTime = moment(inputDate).tz('Asia/Singapore').subtract(1, 'months').startOf('month').toDate();
        let endTime = moment(startTime).add(1, 'months').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getQuarterSGTime: function (inputDate) {
        var startTime = moment(inputDate).tz('Asia/Singapore').startOf('quarter').toDate();
        var endTime = moment(inputDate).tz('Asia/Singapore').endOf('quarter').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getYearlySGTIme: function() {
        var startTime = moment().tz('Asia/Singapore').startOf('year').toDate();
        let endTime = moment().tz('Asia/Singapore').endOf('year').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },
    //endregion
    /**
     * Get past day time frame based on SGT
     */
    getYesterdaySGTime: function () {
        var endTime = moment().tz('Asia/Singapore').startOf('day').toDate();
        var startTime = moment(endTime).subtract(1, 'days').toDate();

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getNumberOfHours: function (startDate, endDate) {
        // The number of milliseconds in one hour
        let oneHour = 1000*60*60;

        // Convert both dates to milliseconds
        let date1 = new Date(startDate).getTime();
        let date2 = new Date(endDate).getTime();

        // Calculate the difference in milliseconds
        let difference = Math.abs(date1 - date2);

        // Convert back to days and return
        return Math.ceil(difference/oneHour);
    },

    getNumberOfMonths: function (startDate, endDate) {

        return new Date(endDate).getMonth() - new Date(startDate).getMonth() + (12 * (new Date(endDate).getFullYear() - new Date(startDate).getFullYear())) + 1;
    },

    getNumberOfDays: function (startDate, endDate) {
        // The number of milliseconds in one day
        let oneDay = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        let date1 = new Date(startDate).getTime();
        let date2 = new Date(endDate).getTime();

        // Calculate the difference in milliseconds
        let difference = Math.abs(date1 - date2);

        // Convert back to days and return
        return Math.ceil(difference/oneDay);
    },

    getNumberOfDaysFloor: function (startDate, endDate) {
        // The number of milliseconds in one day
        let oneDay = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        let date1 = new Date(startDate).getTime();
        let date2 = new Date(endDate).getTime();

        // Calculate the difference in milliseconds
        let difference = Math.abs(date1 - date2);

        // Convert back to days and return
        return Math.floor(difference/oneDay);
    },

    /**
     * Get current day time frame based on SGT
     */
    getTodaySGTime: function () {
        var startTime = moment().tz('Asia/Singapore').startOf('day').toDate();
        var endTime = moment(startTime).add(1, 'days').toDate();

        //console.log("Today startTime:", startTime);
        //console.log("Today endTime:  ", endTime);

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getNextDaySGTime: function (time) {
        var startTime = moment(time).tz('Asia/Singapore').startOf('day').add(1, 'days').toDate();
        var endTime = moment(startTime).add(1, 'days').toDate();

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getOneDayAgoSGTime: (time) => {
        return time ? moment(time).tz('Asia/Singapore').add(-1, 'days').toDate() : null;
    },

    getOneMonthAgoSGTime: (time) => {
        return time ? moment(time).tz('Asia/Singapore').add(-1, 'month').toDate() : null;
    },

    getNextOneDaySGTime: (time) => {
        return time ? moment(time).tz('Asia/Singapore').add(1, 'days').toDate() : null;
    },

    getSGTimeOf: function (time) {
        return time ? moment(time).tz('Asia/Singapore').toDate() : null;
    },

    getSGTimeToString: function (time) {
        return time ? moment(time).tz('Asia/Singapore').format("YYYY-MM-DD HH:mm:ss") : null;
    },

    getTargetSGTime: function (targetDate) {
        var startTime = moment(targetDate).tz('Asia/Singapore').startOf('day').toDate();
        var endTime = moment(startTime).add(1, 'days').toDate();

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getPreviousSGMonday: function () {
        // Get midnight on the morning of this week's Monday.
        // (That could be tomorrow if today is Sunday!)
        var mondayThisWeek = moment().tz('Asia/Singapore').startOf('day').day("Monday");

        // If this week's Monday is in the future, return the Monday of the week before
        if (mondayThisWeek.toDate().getTime() > Date.now()) {
            mondayThisWeek.subtract(7, 'days');
        }

        return mondayThisWeek.toDate();
    },

    getLastWeekSGTime: function () {
        var endTime = dbUtility.getPreviousSGMonday();
        var startTime = moment(endTime).subtract(1, 'week').toDate();

        //console.log("Last week startTime:", startTime);
        //console.log("Last week endTime:  ", endTime);

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getNextSGMonday: function (time) {

        var mondayNextWeek = moment(time).tz('Asia/Singapore').startOf('day').day("Monday");

        if (mondayNextWeek.toDate().getTime() <= new Date(time).getTime()) {
            mondayNextWeek.add(7, 'days');
        }

        return mondayNextWeek.toDate();
    },

    getNextWeekSGTime: function (time) {
        var endTime = dbUtility.getNextSGMonday(time);
        var startTime = moment(endTime).subtract(1, 'week').toDate();

        //console.log("Last week startTime:", startTime);
        //console.log("Last week endTime:  ", endTime);

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastWeekSGTimeProm: function () {
        return Q.resolve(dbUtility.getLastWeekSGTime());
    },

    getCurrentWeekInYear: function(time){
        let result = moment(time, "YYYY MM DD").format("W");
        return result;
    },

    getCurrentWeekSGTime: function () {
        var startTime = dbUtility.getPreviousSGMonday();
        var endTime = moment(startTime).add(1, 'week').toDate();

        //console.log("Current week startTime:", startTime);
        //console.log("Current week endTime:  ", endTime);

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentWeekSGTimeProm: function () {
        return Q.resolve(dbUtility.getCurrentWeekSGTime());
    },

    getCurrentMonthSGTIme: function () {
        var startTime = moment().tz('Asia/Singapore').startOf('month').toDate();
        var endTime = moment().tz('Asia/Singapore').endOf('month').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentSeasonSGTime: function () {
        var startTime = moment().tz('Asia/Singapore').startOf('quarter').toDate();
        var endTime = moment().tz('Asia/Singapore').endOf('quarter').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentYearSGTime: function () {
        var startTime = moment().tz('Asia/Singapore').startOf('year').toDate();
        var endTime = moment().tz('Asia/Singapore').endOf('year').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentDateDailySGTime: (time) => {
        let startTime = moment(time).tz('Asia/Singapore').toDate();
        let endTime = moment(time).tz('Asia/Singapore').add(1, 'days').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentDateWeeklyTime: function (time) {
        let startTime = moment(time).tz('Asia/Singapore').toDate();
        let endTime = moment(time).tz('Asia/Singapore').add(1, 'week').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentDateMonthlySGTime: function (time) {
        let startTime = moment(time).tz('Asia/Singapore').toDate();
        let endTime = moment(time).tz('Asia/Singapore').add(1, 'month').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentDateYearlySGTime: function (time) {
        let startTime = moment(time).tz('Asia/Singapore').toDate();
        let endTime = moment(time).tz('Asia/Singapore').add(1, 'year').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    /**
     *  1 = monday , 2= tuesday , ...,7 = sunday
     */
    getDayOfWeek: function () {
        return moment(new Date()).tz('Asia/Singapore').day();
    },

    /**
     *   get current hour (0-23)
     */
    getHourOfDay: function () {
        return moment(new Date()).tz('Asia/Singapore').hours();
    },

    getCurrentBiWeekSGTIme: function () {
        let startTime = moment().tz('Asia/Singapore').startOf('month').toDate();
        let endTime = moment(startTime).add(14, 'days').toDate();
        let todayDay = moment().tz('Asia/Singapore').date();

        if (todayDay >= 15) {
            startTime = endTime;
            endTime = moment().tz('Asia/Singapore').endOf('month').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentHalfMonthSGTIme: function () {
        let startTime = moment().tz('Asia/Singapore').startOf('month').toDate();
        let endTime = moment(startTime).add(15, 'days').toDate();
        let todayDay = moment().tz('Asia/Singapore').date();

        if (todayDay >= 16) {
            startTime = endTime;
            endTime = moment().tz('Asia/Singapore').endOf('month').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastBiWeekSGTime: function () {
        let startTime, endTime;
        let todayDay = moment().tz('Asia/Singapore').date();

        if (todayDay >= 15) {
            startTime = moment().tz('Asia/Singapore').startOf('month').toDate();
            endTime = moment(startTime).add(14, 'days').toDate();
        } else {
            let lastMonthTime = dbUtility.getLastMonthSGTime();
            startTime = moment(lastMonthTime.startTime).add(14, 'days').toDate();
            endTime = lastMonthTime.endTime;
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentBiWeekSGTime: function () {
        let startTime, endTime;
        let todayDay = moment().tz('Asia/Singapore').date();

        if (todayDay < 15) {
            startTime = moment().tz('Asia/Singapore').startOf('month').toDate();
            endTime = moment(startTime).add(14, 'days').toDate();
        } else {
            let currentMonthTime = moment().tz('Asia/Singapore').startOf('month').toDate();
            startTime = moment(currentMonthTime.startTime).add(14, 'days').toDate();
            endTime = currentMonthTime.endTime;
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastMonthSGTime: function () {
        var startTime = moment().tz('Asia/Singapore').subtract(1, 'months').startOf('month').toDate();
        let endTime = moment(startTime).add(1, 'months').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getSecondLastMonthSGTime: function () {
        var startTime = moment().tz('Asia/Singapore').subtract(2, 'months').startOf('month').toDate();
        let endTime = moment(startTime).add(1, 'months').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getNextMonthSGTime: function (time) {
        var startTime = moment(time).tz('Asia/Singapore').add(1, 'months').startOf('month').toDate();
        let endTime = moment(startTime).add(1, 'months').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastWeekConsumptionReturnSGTime: function () {
        let timeNow = moment().tz('Asia/Singapore').toDate();

        let endTime = dbUtility.getLastWeekSGTime().endTime;
        endTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000);
        let startTime = moment(endTime).subtract(1, 'week').toDate();

        if (timeNow < endTime) {
            endTime = moment(endTime).subtract(1, 'week').toDate();
            startTime = moment(endTime).subtract(1, 'week').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentWeekConsumptionReturnSGTime: function () {
        let timeNow = moment().tz('Asia/Singapore').toDate();

        let startTime = dbUtility.getCurrentWeekSGTime().startTime;
        startTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
        let endTime = moment(startTime).add(1, 'week').toDate();

        if (timeNow < startTime) {
            startTime = moment(startTime).subtract(1, 'week').toDate();
            endTime = moment(startTime).add(1, 'week').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLastMonthConsumptionReturnSGTime: function () {
        let endTime = moment().tz('Asia/Singapore').startOf('month').toDate();
        endTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000);
        let startTime = moment(endTime).subtract(1, 'month').toDate();

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getCurrentMonthConsumptionReturnSGTime: function () {
        let startTime = moment().tz('Asia/Singapore').startOf('month').toDate();
        startTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
        let endTime = moment(startTime).add(1, 'month').toDate();

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getLocalTimeString: function (date, format) {
        var date = moment(date).tz('Asia/Singapore');
        var returnedStr;
        switch (format) {
            case "YYYY-MM-DD":
                returnedStr = date.format().substring(0, 10);
                break;
            case "YYYY/MM/DD HH:mm:ss":
                returnedStr = date.format("YYYY/MM/DD HH:mm:ss");
                break;
            case "YYYY/MM/DD":
                returnedStr = date.format("YYYY/MM/DD");
                break;
            case "hh:mm:ss A":
                returnedStr = date.format("hh:mm:ss A");
                break;
            default:
                returnedStr = date.format().substring(0, 10) + " " + date.format().substring(11, 19)
        }
        return returnedStr;
    },
    getLocalTime: function (date, format) {
        var date = moment(date, 'YYYY-MM-DD HH:mm').tz('Asia/Singapore');
        return date.toDate()
    },
    getUTC8Time: function (date) {
        if (!date) return null;
        return new Date(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000);
    },
    getDayStartTime: function (date) {
        return date ? moment(date).tz('Asia/Singapore').startOf('day').toDate() : null;
    },
    getDayEndTime: function (date) {
        return date ? moment(date).tz('Asia/Singapore').startOf('day').add(1, 'days').toDate() : null;
    },
    getISODayEndTime: function (date) {
        return date ? moment(date).startOf('day').add(1, 'days').toDate() : null;
    },


    getPreviousSGDayOfDate: function (date) {
        return date ? {
            startTime: moment(date).tz('Asia/Singapore').subtract(1, 'days').startOf('day').toDate(),
            endTime: moment(date).tz('Asia/Singapore').subtract(1, 'days').startOf('day').add(1, 'days').toDate()
        } : null;
    },



    /**
     * @deprecated
     *
     * Get past day time frame based on settlement time
     * @param {number} hour
     * @param {number} minutes
     */
    getDailySettlementTime: function (hour, minutes) {
        hour = hour || 0;
        minutes = minutes || 0;

        var endTime = new Date();
        endTime.setHours(hour, minutes, 0, 0);

        var startTime = new Date();
        startTime.setHours(hour, minutes, 0, 0);
        startTime.setDate(endTime.getDate() - 1);

        return {
            startTime: startTime,
            endTime: endTime
        };
        //return dbUtility.getYesterdaySGTime();
    },
//Testing Block
    setLocalDayEndTime: function (date) {
        if (!date) return null;
        date.setHours(23, 59, 59, 999);
        return new Date(date.getTime() + 1 - new Date().getTimezoneOffset() * 60 * 1000);
    },
    setNDaysAgo: function (inputDate, n) {
        if (!(inputDate instanceof Date) || !Number.isInteger(n)) {
            return;
        }
        return new Date(inputDate.setDate(inputDate.getDate() - n));
    },
    //Testing Block
    /**
     * @deprecated
     *
     * Get current day time frame based on settlement time
     * @param {number} hour
     * @param {number} minutes
     */
    getCurrentDailySettlementTime: function (hour, minutes) {
        var times = dbUtility.getDailySettlementTime(hour, minutes);
        var startTime = times.startTime;
        var endTime = times.endTime;
        var curTime = new Date();
        if (curTime.getTime() > endTime.getTime()) {
            endTime.setDate(endTime.getDate() + 1);
            startTime.setDate(startTime.getDate() + 1);
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    /**
     * Get past week time frame based on settlement time
     * @param {number} day
     * @param {number} hour
     * @param {number} minutes
     */
    getWeeklySettlementTime: function (day, hour, minutes) {
        hour = hour || 0;
        minutes = minutes || 0;
        day = day || 0;

        // var endTime = new Date();
        // day = day || endTime.getDay();
        // var distance = day - endTime.getDay();
        // //only settle for past week
        // distance = distance > 0 ? distance - 7 : distance;
        //
        // endTime.setDate(endTime.getDate() + distance);
        // endTime.setHours(hour, minutes, 0, 0);
        // endTime.setSeconds(0);
        // endTime.setMilliseconds(0);
        //
        // var startTime = new Date();
        // startTime.setHours(hour, minutes, 0, 0);
        // startTime.setDate(endTime.getDate() - 7);

        // var yesTime = dbUtility.getYesterdaySGTime();
        // var startTime = new Date(yesTime.endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

        var endTime = moment().tz('Asia/Singapore').startOf("week").add(day, 'day').toDate().setHours(hour, minutes, 0, 0);
        var startTime = new Date(endTime - 7 * 24 * 60 * 60 * 1000);

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getYesterdayConsumptionReturnSGTime: function () {
        let timeNow = moment().tz('Asia/Singapore').toDate();

        let endTime = moment().tz('Asia/Singapore').startOf('day').toDate();
        endTime = new Date(endTime.getTime() + 12*60*60*1000);
        let startTime = moment(endTime).subtract(1, 'days').toDate();

        if (timeNow < endTime) {
            endTime = new Date(endTime.getTime() - 24*60*60*1000);
            startTime = moment(endTime).subtract(1, 'days').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getTodayConsumptionReturnSGTime: function () {
        let timeNow = moment().tz('Asia/Singapore').toDate();

        let startTime = moment().tz('Asia/Singapore').startOf('day').toDate();
        startTime = new Date(startTime.getTime() + 12*60*60*1000);
        let endTime = moment(startTime).add(1, 'days').toDate();

        if (timeNow < startTime) {
            startTime = new Date(startTime.getTime() - 24*60*60*1000);
            endTime = moment(startTime).add(1, 'days').toDate();
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getNdaylaterFromSpecificStartTime: function (n, date) {
        var n = Number.isInteger(n) ? parseInt(n) : 0;

        return moment(date).add(n,'days').toDate();
    },

    getNDaysAgoFromSpecificStartTime: function (inputDate, n) {
        if (!(inputDate instanceof Date) || !Number.isInteger(n)) {
            return;
        }
        return new Date(inputDate.setDate(inputDate.getDate() - n));
    },


    /**
     * Get current week time frame based on settlement time
     * @param {number} hour
     * @param {number} minutes
     */
    getCurrentWeeklySettlementTime: function (day, hour, minutes) {
        var times = dbUtility.getWeeklySettlementTime(day, hour, minutes);
        var startTime = times.startTime;
        var endTime = times.endTime;
        var curTime = new Date();
        if (curTime.getTime() > endTime.getTime()) {
            endTime.setDate(endTime.getDate() + 7);
            startTime.setDate(startTime.getDate() + 7);
        }

        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getWeeklySettlementTimeForPlatform: function (platformData) {
        return dbUtility.getWeeklySettlementTime(platformData.weeklySettlementDay, platformData.weeklySettlementHour, platformData.weeklySettlementMinute);
    },

    getSGTimeOfPassHours: function (hours) {
        let endTime = moment().tz('Asia/Singapore').toDate();
        let startTime = moment(endTime).tz('Asia/Singapore').subtract(hours, "hours").toDate();

        return {
            startTime: startTime,
            endTime: endTime
        }
    },

    getSGTimeCurrentMinuteInterval: function (date) {
        let startTime = moment(date).tz('Asia/Singapore').startOf("minute").toDate();
        let endTime = moment(date).tz('Asia/Singapore').endOf("minute").toDate();

        return {
            startTime: startTime,
            endTime: endTime
        }
    },

    getSGTimeCurrentHourInterval: function (date) {
        let startTime = moment(date).tz('Asia/Singapore').startOf("hour").toDate();
        let endTime = moment(date).tz('Asia/Singapore').endOf("hour").toDate();

        return {
            startTime: startTime,
            endTime: endTime
        }
    },

    getSGTimeCurrentDayInterval: function (date) {
        let startTime = moment(date).tz('Asia/Singapore').startOf("day").toDate();
        let endTime = moment(date).tz('Asia/Singapore').endOf("day").toDate();

        return {
            startTime: startTime,
            endTime: endTime
        }
    },

    /*
     * if today is the first day of the week based on SG time
     */
    isFirstDayOfWeekSG: function () {
        var day = moment().tz('Asia/Singapore').toDate().getDay();
        return day == 1;
    },

    /*
     * if today is the first day of the month based on SG time
     */
    isFirstDayOfMonthSG: function () {
        var day = moment().tz('Asia/Singapore').toDate().getDate();
        return day == 1;
    },

    isSameDaySG: function (date1, date2) {
        var day1 = moment(date1).tz('Asia/Singapore').toDate().toDateString();
        var day2 = moment(date2).tz('Asia/Singapore').toDate().toDateString();

        return day1 === day2;
    },

    isHalfMonthDaySG: function () {
        var day = moment().tz('Asia/Singapore').toDate().getDate();
        return day == 1 || day == 16;
    },

    isFirstDayOfYearSG: function () {
        var day = moment().tz('Asia/Singapore').dayOfYear();
        return day == 1;
    },

    getPastHalfMonthPeriodSG: function () {
        let day = moment().tz('Asia/Singapore').toDate().getDate();
        if (day >= 1 && day < 16) {
            let startTime = moment().tz('Asia/Singapore').startOf("month").subtract(1, 'month').add(15, 'day').toDate();
            let endTime = moment().tz('Asia/Singapore').startOf("month").toDate();
            return {
                startTime: startTime,
                endTime: endTime
            }
        }
        else if (day >= 16) {
            let startTime = moment().tz('Asia/Singapore').startOf("month").toDate();
            let endTime = moment().tz('Asia/Singapore').startOf("month").add(15, 'day').toDate();
            return {
                startTime: startTime,
                endTime: endTime
            }
        }
    },

    getCurrentHalfMonthPeriodSG: function () {
        let day = moment().tz('Asia/Singapore').toDate().getDate();
        if (day >= 1 && day < 16) {
            let startTime = moment().tz('Asia/Singapore').startOf("month").toDate();
            let endTime = moment().tz('Asia/Singapore').startOf("month").add(15, 'day').toDate();
            return {
                startTime: startTime,
                endTime: endTime
            }
        }
        else if (day >= 16) {
            let startTime = moment().tz('Asia/Singapore').startOf("month").add(15, 'day').toDate();
            let endTime = moment().tz('Asia/Singapore').endOf("month").toDate();
            return {
                startTime: startTime,
                endTime: endTime
            }
        }
    },

    isCurrentSGTimePassed12PM: function () {
        let hour = moment().tz('Asia/Singapore').toDate().getHours();

        return hour >= 12;
    },

    /**
     * Get N day time frame based on SGT
     */
    getNDaysAgoSGTime: function (inputDate, n) {
        inputDate.setHours(0,0,0,0);
        var date = moment(inputDate).tz('Asia/Singapore').toDate();

        return new Date(date.setDate(date.getDate() - n));
    },

    //endregion

    generateRandomPositiveNumber: function (min, max) {
        let num = -1;
        while (num < min) {
            num = Math.floor(Math.random() * max)
        }
        return num;
    },

    generateRandomNumberBetweenRange(min, max, decimal = 0) {
        let randomNumber = Math.random() * (max - min + 1) + min;
        if (decimal === 0) {
            return Math.floor(randomNumber);
        }
        else {
            return Number(randomNumber).toFixed(decimal);
        }
    },

    /**
     * Find one and update for query without shardkey
     * @param {Object} model
     * @param {Object} query
     * @param {Object} updateData
     * @param {String} shardKey
     */
    findOneAndUpdateForShard: function (model, query, updateData, shardKeys, flag) {
        if (flag === false) {
            flag = false;
        } else {
            flag = true;
        }
        shardKeys = shardKeys || ["_id"];
        if (model && typeof model.findOneAndUpdate == "function") {
            return model.findOne(query).then(
                function (data) {
                    if (data) {
                        var shardQuery = {};
                        shardKeys.forEach((shardKey) => {
                            shardQuery[shardKey] = data[shardKey]
                        });
                        return model.findOneAndUpdate(shardQuery, updateData, {new: flag});
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can't find db data", query: query});
                    }
                },
                function (error) {
                    return Q.reject({name: "DBError", message: "Error finding db data", error: error});
                }
            );
        }
        else {
            return Q.reject({name: "DataError", message: "Invalid data"});
        }
    },

    /**
     * Upsert without shardkey
     * Mark::this function can't be run on same record asynchronously
     * @param {Object} model
     * @param {Object} query
     * @param {Object} updateData
     * @param {[String]} [shardKeys]
     */
    upsertForShard: function (model, query, updateData, shardKeys) {
        shardKeys = shardKeys || ["_id"];
        if (model && typeof model.findOneAndUpdate == "function") {
            return model.findOne(query).then(
                function (data) {
                    if (data) {
                        var shardQuery = {};
                        shardKeys.forEach((shardKey) => {
                            shardQuery[shardKey] = data[shardKey]
                        });
                        return model.findOneAndUpdate(shardQuery, updateData);
                    }
                    else {
                        var newModel = new model(query);
                        return newModel.save().then(
                            function (newData) {
                                var shardQuery = {};
                                shardKeys.forEach((shardKey) => {
                                    shardQuery[shardKey] = newData[shardKey]
                                });
                                return model.findOneAndUpdate(shardQuery, updateData, {new: true});
                            },
                            function (error) {
                                return Q.reject({name: "DBError", message: "Error creating db data", error: error});
                            }
                        );
                    }
                },
                function (error) {
                    return Q.reject({name: "DBError", message: "Error finding db data", error: error});
                }
            );
        }
        else {
            return Q.reject({name: "DataError", message: "Invalid data"});
        }
    },

    isMd5: function (inputString) {
        return (/[a-fA-F0-9]{32}/).test(inputString);
    },

    getGeoIp: function (ip) {
        if (!ip || ip === '127.0.0.1') {
            console.warn('dbutility.getGeoIp() skipping because called with ip=' + ip);
            // For now, don't throw an error, just respond with an empty result
            return Q.resolve(null);
        }

        var deferred = Q.defer();
        geoip2wsCity(ip, function (err, data) {
            if (err) {
                console.error("getGeoIp:", err);
                deferred.resolve(null);
            }
            else {
                if (!data.city) {
                    console.error("getGeoIp:", data);
                }
                var res = {
                    country: data.country ? data.country.iso_code : null,
                    city: data.city ? data.city.names["zh-CN"] : null,
                    longitude: data.location ? data.location.longitude : null,
                    latitude: data.location ? data.location.latitude : null,
                    province: data.most_specific_subdivision ? data.most_specific_subdivision.names["zh-CN"] : null
                };
                if (!res.city && res.province) {
                    res.city = res.province
                }
                console.log(res);
                deferred.resolve(res);
            }
        });
        return deferred.promise;
    },

    getIpLocationByIPIPDotNet: function(ip) {
        if (!ip || ip === '127.0.0.1') {
            console.warn('dbutility.getIpLocationByIPIPDotNet() skipping because called with ip=' + ip);
            // For now, don't throw an error, just respond with an empty result
            return;
        }

        var cityObj = ipipCity.findSync(ip);

        if(cityObj.length > 0){
            var res = {
                country: cityObj[0] || null,
                city: cityObj.length > 2 ? cityObj[2] : null,
                province: cityObj.length > 1 ? cityObj[1] : null,
            };

            console.log(res);
            return res;
        }

        return;
    },

    /*
     * Combine unique element from 2 arrays
     */
    orArrays: function (array1, array2) {
        var res = [];
        var has = {};
        for (var i = 0, max = array1.length; i < max; i++) {
            res.push(array1[i]);
            has[array1[i]] = true;
        }
        for (var i = 0, max = array2.length; i < max; i++) {
            if (!has[array2[i]]) {
                res.push(array2[i]);
                has[array2[i]] = true;
            }
        }
        return res;
    },

    /*
     * Find unique elements exit in 2 arrays
     */
    andArrays: function (array1, array2) {
        var res = [];
        var has = {};
        for (var i = 0, max = array1.length; i < max; i++) {
            has[array1[i]] = true;
        }
        for (var i = 0, max = array2.length; i < max; i++) {
            if (has[array2[i]]) {
                res.push(array2[i]);
            }
        }
        return res;
    },

    /*
     * Find elements that are in array2 but not array1
     */
    difArrays: function (array1, array2) {
        var res = [];
        var has = {};
        for (var i = 0, max = array1.length; i < max; i++) {
            has[array1[i]] = true;
        }
        for (var i = 0, max = array2.length; i < max; i++) {
            if (!has[array2[i]]) {
                res.push(array2[i]);
            }
        }
        return res;
    },

    /*
     *  Shuffle array, based on most efficient method shown at https://jsperf.com/array-shuffle-comparator/5
     */
    shuffleArray: function (arr) {
        if (!arr || !arr.length) {
            return [];
        }

        let temp, j, i = arr.length;
        while (--i) {
            j = ~~(Math.random() * (i + 1));
            temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }

        return arr;
    },

    getDomainName: function (src) {
        src = src || '';
        return src
            .replace("https://www.", "")
            .replace("http://www.", "")
            .replace("https://", "")
            .replace("http://", "")
            .replace("www.", "")
            .replace("m.", "");
    },

    filterDomainName: function (url) {
        let filteredDomain = dbUtility.getDomainName(url);

        if (filteredDomain.indexOf("/") !== -1) {
            filteredDomain = filteredDomain.split("/")[0];
        }

        if (filteredDomain.indexOf("#") !== -1) {
            filteredDomain = filteredDomain.split("#")[0];
        }

        return filteredDomain;
    },

    encryptMessage: (msg) => {
        return new Promise((resolve, reject) => {
            let encrypted = rsaCrypto.legacyEncrypt(msg);
            resolve(encrypted);
        })
    },

    encodeEmail: function(email) {
        email = email || '';
        let emailChars = email.split('');
        for(let i = 4; i < emailChars.length-5; i++) {
            emailChars[i] = '*';
        }
        email = emailChars.join('');
        return email;
    },

    encodeBankAcc: function (str) {
        str = str || '';
        return  "******" +  str.slice(-6);
    },
    encodePhoneNum: function (str) {
        if (!str) {
            return '';
        }
        return str.substring(0, 3) + "******" + str.slice(-4);
    },

    encodeQQ: function (str) {
        str = str || '';
        var newStr = str.replace(str, "****");
        return newStr + "@qq.com";
        // return str.substring(0, 3) + "***" + str.slice(-2);
    },

    encodeRealName: function (str) {
        str = str || '';
        let encodedStr = str[0] || '';
        for (let i = 1; i < str.length; i++) {
            if (str !== " ") encodedStr += "*";
        }
        return encodedStr;
    },

    /**
     * Covered third to fifth, maybe parameterize
     * @param str
     * @returns {string}
     */
    encodePlayerName: (str = "") => {
        return str.substring(0, 2) + "***" + str.slice(-5);
    },

    getParameterByName: function (name, url) {
        if( !url ){
            return url;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    getInputDevice: function (inputUserAgent, isPartnerProposal, adminInfo) {
        if (Number.isInteger(inputUserAgent)) {
            return inputUserAgent;
        }
        let ua;
        // userAgent string already parse outside if parse again will always set to WEB
        if (inputUserAgent && (inputUserAgent.browser || inputUserAgent.device || inputUserAgent.os)) {
            ua = inputUserAgent;
        } else {
            ua = uaParser(inputUserAgent);
        }

        let userAgentInput = [{
            browser: ua.browser.name || '',
            device: ua.device.name || '',
            os: ua.os.name || ''
        }];

        let inputDevice="";

        function isEmpty(obj) {
            for(var key in obj) {
                if(obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        }

        if (userAgentInput && userAgentInput[0] && isEmpty(adminInfo)) {
            let userAgent = userAgentInput[0];
            if (userAgent.browser.indexOf("WebKit") !== -1 || userAgent.browser.indexOf("WebView") !== -1) {
                // 原生APP才算APP，其余的不计算为APP（包壳APP算H5）
                if (isPartnerProposal) {
                    // inputDevice = constPlayerRegistrationInterface.APP_AGENT;
                    inputDevice = constPlayerRegistrationInterface.H5_AGENT;
                }
                else {
                    // inputDevice = constPlayerRegistrationInterface.APP_PLAYER;
                    inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
                }
            }
            else if (userAgent.os.indexOf("iOS") !== -1 || userAgent.os.indexOf("ndroid") !== -1 || userAgent.browser.indexOf("obile") !== -1) {
                if (isPartnerProposal) {
                    inputDevice = constPlayerRegistrationInterface.H5_AGENT;
                }
                else {
                    inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
                }
            }
            // Native app
            else if (userAgent.os === "" && userAgent.browser === "" && userAgent.device ==="") {
                if (isPartnerProposal) {
                    inputDevice = constPlayerRegistrationInterface.APP_NATIVE_PARTNER;
                }
                else {
                    inputDevice = constPlayerRegistrationInterface.APP_NATIVE_PLAYER;
                }
            }
            else {
                if (isPartnerProposal) {
                    inputDevice = constPlayerRegistrationInterface.WEB_AGENT;
                }
                else {
                    inputDevice = constPlayerRegistrationInterface.WEB_PLAYER;
                }
            }
        } else {
            if(adminInfo && !isEmpty(adminInfo)){
                inputDevice = constPlayerRegistrationInterface.BACKSTAGE;
            }else if (isPartnerProposal) {
                inputDevice = constPlayerRegistrationInterface.H5_AGENT;
            }else {
                inputDevice = constPlayerRegistrationInterface.H5_PLAYER;
            }
        }

        return inputDevice;
    },
    getInputDeviceType: function (inputUserAgent, data) {
        if (Number.isInteger(inputUserAgent)) {
            return inputUserAgent;
        }
        let ua = inputUserAgent;
        let userAgentInput = [{
            browser: ua.browser || '',
            device: ua.device || '',
            os: ua.os || ''
        }];
        let inputDevice="";
        console.log('JY check input device 5=====:', inputUserAgent, data);
        if (userAgentInput && userAgentInput[0] && inputUserAgent) {
            let userAgent = userAgentInput[0];
            console.log('JY check input device 6=====:', userAgent);
            if (userAgent.browser.indexOf("WebKit") !== -1 || userAgent.browser.indexOf("WebView") !== -1) {
                // android-apps / ios apps
                // if (userAgent.os.indexOf("iOS") !== -1){
                //     inputDevice = 4;
                // }else if(userAgent.os.indexOf("ndroid") !== -1){
                //     inputDevice = 3;
                // }

                // 原生APP才算APP，其余的不计算为APP（包壳APP算H5）
                inputDevice = 2; // H5
            }
            else if (userAgent.os.indexOf("iOS") !== -1 || userAgent.os.indexOf("ndroid") !== -1 || userAgent.browser.indexOf("obile") !== -1) {
                    // H5
                    inputDevice = 2;
            }
            else if (userAgent.os === "" && userAgent.browser === "" && userAgent.device ==="") {
                // android-apps / ios apps
                let osType = data && data.osType && data.osType.toLowerCase();
                if (osType && (osType === 'ios')){
                    inputDevice = 4;
                }else if(osType && (osType === 'android')){
                    inputDevice = 3;
                }
            }
            else {
                if(userAgent.browser){
                    // WEB
                    inputDevice = 1;
                }else{
                    // PC DOWNLOAD - i assume the pc-download version dont have browser detail
                    if(userAgent.os.indexOf("Window" !== -1)){
                        inputDevice = 5;
                    }
                }
            }
        }
        return inputDevice;
    },
    decryptPhoneNumber: (phoneNumberRaw) => {
        let decryptedPhoneNo = phoneNumberRaw;

        if (phoneNumberRaw && phoneNumberRaw.length > 20) {
            try {
                decryptedPhoneNo = rsaCrypto.decrypt(phoneNumberRaw);
            }
            catch (err) {
                console.log(err);
                decryptedPhoneNo = "";
            }
        }
        return decryptedPhoneNo;
    },

    countOccurrenceInString: (str, substr) => {
        let regExp = new RegExp(substr, "g");
        return (str.match(regExp) || []).length;
    },

    // copy from controller.js, which said to be copied from internet and known for bad naming convention
    convertToMD5: (string) => {
        function RotateLeft(lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        }

        function AddUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) {
                return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            }
            if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                    return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                } else {
                    return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                }
            } else {
                return (lResult ^ lX8 ^ lY8);
            }
        }

        function F(x, y, z) {
            return (x & y) | ((~x) & z);
        }

        function G(x, y, z) {
            return (x & z) | (y & (~z));
        }

        function H(x, y, z) {
            return (x ^ y ^ z);
        }

        function I(x, y, z) {
            return (y ^ (x | (~z)));
        }

        function FF(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function GG(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function HH(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function II(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function ConvertToWordArray(string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
            var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
            var lWordArray = Array(lNumberOfWords - 1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        };

        function WordToHex(lValue) {
            var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
            }
            return WordToHexValue;
        };

        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        };

        var x = Array();
        var k, AA, BB, CC, DD, a, b, c, d;
        var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

        string = Utf8Encode(string);

        x = ConvertToWordArray(string);

        a = 0x67452301;
        b = 0xEFCDAB89;
        c = 0x98BADCFE;
        d = 0x10325476;

        for (k = 0; k < x.length; k += 16) {
            AA = a;
            BB = b;
            CC = c;
            DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = AddUnsigned(a, AA);
            b = AddUnsigned(b, BB);
            c = AddUnsigned(c, CC);
            d = AddUnsigned(d, DD);
        }

        var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);

        return temp.toLowerCase();
    },

    getDateYMDStringFormat: (date) => {
        date = new Date(date);
        var y = date.getFullYear().toString();
        var m = (date.getMonth() + 1).toString();
        var d = date.getDate().toString();
        (d.length == 1) && (d = '0' + d);
        (m.length == 1) && (m = '0' + m);
        var yyyymmdd = y + m + d;
        return yyyymmdd;
    },

    getIpAddress: (conn) => {
        let ipAddress = conn.upgradeReq.connection.remoteAddress || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp && forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                ipAddress = forwardedIp[0].trim();
            }
        }

        return ipAddress;
    },

    getPlatformSpecificProviderStatus: (provider, platformId) => {
        if (provider && provider.platformStatusFromCPMS && provider.platformStatusFromCPMS[platformId]) {
            return provider.platformStatusFromCPMS[platformId];
        }

        return provider.status;
    },

    noRoundTwoDecimalPlaces: (value) => {
        value = value || 0;
        let splitString =  value.toString().split(".");

        let tempNum = splitString[0];

        if (splitString[1]) {
            tempNum += "." + splitString[1].substr(0,2);
        }

        tempNum = tempNum.replace(/,/g,"");

        return parseFloat(tempNum);
    },

    twoDecimalPlacesToFixed: (value) => {
        value = value || 0;

        return Number(parseFloat(value).toFixed(2));
    },

    sliceTimeFrameToDaily: (startTime, endTime, fullDayOnly) => {
        let timeFrames = [];

        if (!startTime || !endTime) {
            return Promise.reject({errorMessage:"Invalid time frame"});
        }

        startTime = new Date(startTime);
        endTime = new Date(endTime);

        if (startTime > endTime) {
            return timeFrames;
        }

        let firstDay = dbUtility.getTargetSGTime(startTime);
        if (!fullDayOnly) {
            firstDay.startTime = startTime;
        }

        let nextDay = firstDay;

        for (let i = 0; i < 100 ; i++) {
            timeFrames.push(nextDay);
            nextDay = dbUtility.getTargetSGTime(nextDay.endTime);
            if (nextDay.endTime >= endTime) {
                break;
            }
        }

        if (!fullDayOnly) {
            nextDay.endTime = endTime;
        }
        timeFrames.push(nextDay);

        return timeFrames;
    },

    splitTimeFrameToHourly: (startTime, endTime) => {
        let timeSlots = [];
        let st = new Date(startTime);
        let et = new Date(endTime);

        while (st < et) {
            let addObj = {
                startTime: st,
                endTime: moment(st).add(1, 'hour').toDate()
            };
            timeSlots.push(addObj);
            st = moment(st).add(1, 'hour').toDate();
        }

        return timeSlots;
    },

    splitTimeFrameToDaily: (startTime, endTime) => {
        let timeSlots = [];
        let st = new Date(startTime);
        let et = new Date(endTime);

        while (st < et) {
            let addObj = {
                startTime: st,
                endTime: moment(st).add(1, 'day').toDate()
            };
            timeSlots.push(addObj);
            st = moment(st).add(1, 'day').toDate();
        }

        return timeSlots;
    },

    isNumeric: function (value) {
        return !isNaN( parseFloat(value) ) && isFinite( value );
    },

    convertIpToInt: function (ipAdd) {
        return ipAdd.split('.').reduce(function(ipInt, octet) { return (ipInt<<8) + parseInt(octet, 10)}, 0) >>> 0;
    },

    convertIntToIp: function (ipAdd) {
        return ( (ipAdd>>>24) +'.' + (ipAdd>>16 & 255) +'.' + (ipAdd>>8 & 255) +'.' + (ipAdd & 255) );
    },

    getIDCIpDetail: function (ipAdd) {
        let ipInInt = dbUtility.convertIpToInt(ipAdd);

        return dbconfig.collection_idcIp.findOne({
            ip_start_num: {$lte: ipInInt},
            ip_end_num: {$gte: ipInInt}
        }).lean();
    },

    /**
     * Decimal adjustment of a number.
     *
     * @param {String}  type  The type of adjustment.
     * @param {Number}  value The number.
     * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
     * @returns {Number} The adjusted value.
     */
    decimalAdjust: function(type, value, exp) {
        // If the exp is undefined or zero...
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math[type](value);
        }
        value = +value;
        exp = +exp;
        // If the value is not a number or the exp is not an integer...
        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }
        // Shift
        value = value.toString().split('e');
        value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
        // Shift back
        value = value.toString().split('e');
        return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    },

    retrieveAgent: (agentInfo) => {
        let registrationInterface = '';
        let userAgent = agentInfo;

        if (userAgent == '') {
            registrationInterface = 1;
        } else {
            if (userAgent.browser.name && (userAgent.browser.name.indexOf("WebKit") !== -1 || userAgent.browser.name.indexOf("WebView") !== -1)) {
                registrationInterface = 2;
            }
            else if (userAgent.os.name && (userAgent.os.name.indexOf("iOS") !== -1 || userAgent.os.name.indexOf("ndroid") !== -1 || userAgent.browser.name.indexOf("obile") !== -1)) {
                registrationInterface = 3;
            } else {
                registrationInterface = 1;
            }
        }
        return registrationInterface;
    },

    getObjectKeysByValue: (object, value) => {
        let propArray = [];
        for (let prop in object) {
            if (object.hasOwnProperty(prop)) {
                if (object[ prop ] === value) {
                    propArray.push(prop);
                }
            }
        }
        return propArray;
    },

    executeFunctionByDaysInterval: (start, end, execFunc, args) => {
        let promArr = [];
        let startTime = new Date(start);
        let endTime = new Date(end);

        startTime.setHours(0, 0, 0, 0);
        endTime.setHours(0, 0, 0, 0);

        let diffInDays = dbUtility.getNumberOfDays(startTime, endTime);

        for(let i = 0; i <= diffInDays - 1; i ++){
            let startDate = new Date();
            startDate.setDate(startTime.getDate() + i);
            startDate = dbUtility.getDayStartTime(startDate);
            let endDate = new Date();
            endDate.setDate(startTime.getDate() + (i + 1));
            endDate = dbUtility.getDayStartTime(endDate);

            promArr.push(execFunc.call(this, startDate, endDate, args));
        }

        return Promise.all(promArr).then(
            result => {
                console.log('executeFunctionByDaysInterval result', result);
                return result;
            }
        );
    },

    pmsClientType: (inputDevice) => {
        let clientType;

        switch (inputDevice) {
            case constPlayerRegistrationInterface.BACKSTAGE:
                clientType = constPMSClientType.BACKSTAGE;
                break;
            case constPlayerRegistrationInterface.WEB_AGENT:
            case constPlayerRegistrationInterface.WEB_PLAYER:
                clientType = constPMSClientType.WEB;
                break;
            case constPlayerRegistrationInterface.H5_AGENT:
            case constPlayerRegistrationInterface.H5_PLAYER:
                clientType = constPMSClientType.H5;
                break;
            case constPlayerRegistrationInterface.APP_AGENT:
            case constPlayerRegistrationInterface.APP_PLAYER:
                clientType = constPMSClientType.APP;
                break;
            case constPlayerRegistrationInterface.APP_NATIVE_PARTNER:
            case constPlayerRegistrationInterface.APP_NATIVE_PLAYER:
                clientType = constPMSClientType.NATIVE_APP;
                break;
            default:
                clientType = constPMSClientType.BACKSTAGE;
        }

        return clientType;
    },

    getReferralConfigIntervalTime: (period, targetTime) => {
        let intervalTime;

        switch (period) {
            case "1":
                intervalTime = targetTime ? dbUtility.getCurrentDateDailySGTime(targetTime) : dbUtility.getTodaySGTime();
                break;
            case "2":
                intervalTime = targetTime ? dbUtility.getCurrentDateWeeklyTime(targetTime) : dbUtility.getCurrentWeekSGTime();
                break;
            case "3":
                intervalTime = targetTime ? dbUtility.getCurrentDateMonthlySGTime(targetTime) : dbUtility.getCurrentMonthSGTIme();
                break;
            case "4":
                intervalTime = targetTime ? dbUtility.getCurrentDateYearlySGTime(targetTime) : dbUtility.getYearlySGTIme();
                break;
            default:
                // No interval time. Will return undefined
                break;
        }

        return intervalTime;
    },

    getDeviceValue: (data, isPartner) => {
        let deviceString;
        let deviceCode = data && data.deviceType && data.subPlatformId ? data.deviceType.toString() + data.subPlatformId.toString() : data.deviceType;

        if (deviceCode && isPartner) {
            deviceString = "P" + String(deviceCode);
        }

        return deviceString;
    },

    queryPhoneLocation: (phoneNumber) => {
        let retObj = {};
        let queryRes = queryPhoneLocationFromPackage(phoneNumber);

        if (queryRes) {
            retObj.phoneProvince = queryRes.province;
            retObj.phoneCity = queryRes.city;
            retObj.phoneType = queryRes.sp;
        }

        return retObj;
    },

    cleanOutput: (entry) => {
        delete entry.executeProposal;
        delete entry.__v;
        delete entry.updateTime;
        delete entry.settlementPeriod;
        delete entry.needSettlement;
        return entry;
    }
};

let proto = dbUtilityFunc.prototype;
proto = Object.assign(proto, dbUtility);

// This make WebStorm navigation work
module.exports = dbUtility;
