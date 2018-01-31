var dbUtilityFunc = function () {
};
module.exports = new dbUtilityFunc();

var constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const uaParser = require('ua-parser-js');
var Q = require("q");
var dbconfig = require("./dbproperties.js");
var moment = require('moment-timezone');
var geoip2ws = require('geoip2ws');
var geoip2wsCity = new geoip2ws(101359, "oVO2d561nEW9", 'city');

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

    getSGTimeOf: function (time) {
        return time ? moment(time).tz('Asia/Singapore').toDate() : null;
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

    getCurrentYearSGTime: function () {
        var startTime = moment().tz('Asia/Singapore').startOf('year').toDate();
        var endTime = moment().tz('Asia/Singapore').endOf('year').toDate();
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

    getLastMonthSGTime: function () {
        var startTime = moment().tz('Asia/Singapore').subtract(1, 'months').startOf('month').toDate();
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

    getLocalTimeString: function (date, format) {
        var date = moment(date).tz('Asia/Singapore');
        var returnedStr;
        switch (format) {
            case "YYYY-MM-DD":
                returnedStr = date.format().substring(0, 10);
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

    /*
     * Get day time frame based on input date
     */
    getDayTime: function (inputDate) {
        var startTime = moment(inputDate).tz('Asia/Singapore').startOf("day").toDate();
        var endTime = moment(inputDate).tz('Asia/Singapore').add(1, 'day').toDate();
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
        var endTime = moment(inputDate).tz('Asia/Singapore').add(1, 'day').add(1, 'week').toDate();
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

    getMonthSGTIme: function (inputDate) {
        var startTime = moment(inputDate).tz('Asia/Singapore').startOf('month').toDate();
        var endTime = moment(inputDate).tz('Asia/Singapore').endOf('month').toDate();
        return {
            startTime: startTime,
            endTime: endTime
        };
    },

    getSGTimeOfPassHours: function (hours) {
        let endTime = moment().tz('Asia/Singapore').toDate();
        let startTime = moment(endTime).tz('Asia/Singapore').subtract(hours, "hours").toDate();

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

    generateRandomPositiveNumber: function (min, max) {
        let num = -1;
        while (num < min) {
            num = Math.floor(Math.random() * max)
        }
        return num;
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
                deferred.reject(err);
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

    getDomainName: function (src) {
        src = src || '';
        return src
            .replace("https://www.", "")
            .replace("http://www.", "")
            .replace("https://", "")
            .replace("http://", "")
            .replace("www.", "");
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
        return str.substring(0, 6) + "******" + str.slice(-4);
    },
    encodePhoneNum: function (str) {
        str = str || '';
        return str.substring(0, 3) + "******" + str.slice(-4);
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

    getInputDevice: function (inputUserAgent, isPartnerProposal) {
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

        if (userAgentInput && userAgentInput[0] && inputUserAgent) {
            let userAgent = userAgentInput[0];
            if (userAgent.browser.indexOf("WebKit") !== -1 || userAgent.browser.indexOf("WebView") !== -1) {
                if (isPartnerProposal) {
                    inputDevice = constPlayerRegistrationInterface.APP_AGENT;
                }
                else {
                    inputDevice = constPlayerRegistrationInterface.APP_PLAYER;
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
            else {
                if (isPartnerProposal) {
                    inputDevice = constPlayerRegistrationInterface.WEB_AGENT;
                }
                else {
                    inputDevice = constPlayerRegistrationInterface.WEB_PLAYER;
                }
            }
        } else {
            inputDevice = constPlayerRegistrationInterface.BACKSTAGE;
        }
        return inputDevice;
    }

};

var proto = dbUtilityFunc.prototype;
proto = Object.assign(proto, dbUtility);

// This make WebStorm navigation work
module.exports = dbUtility;