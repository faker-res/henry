var Q = require('q');
var dbconfig = require('./../modules/dbProperties');

var dbAccessLog = {

    /**
     * Get daily active users
     * @param {String} date - The date info
     */
    getNewUserForTimeFrame: function (startTime, endTime) {
        return dbconfig.collectionPlayer.find(
            {
                registrationTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).distinct('playerId').exec();
    },
    /**
     * Get daily new users
     * @param {String} date - The date info
     */
    getActiveUserCountForTimeFrame: function (startTime, endTime) {
        return dbconfig.collectionAccessLog.find(
            {
                accessTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).distinct('playerId').exec();
    },

    /**
     * Get DAU for past numOfDays
     * @param {Number} numOfDays - Past number of days
     */
    getDAUForPastDays: function (numOfDays) {
        var deferred = Q.defer();

        var d = new Date();
        var month = d.getMonth();
        var year = d.getFullYear();
        var day = d.getDate();

        var today = new Date(year + ',' + month + ',' + day);
        var yesterday = new Date(today - 24 * 60 * 60 * 1000);

        var proms = [];
        var dates = [];
        for (var i = 0; i < numOfDays; i++) {
            var prom = dbAccessLog.getActiveUserCountForTimeFrame(yesterday, today);
            proms.unshift(prom);
            dates.unshift(yesterday.getTime() + 1);
            today = yesterday;
            yesterday = new Date(today - 24 * 60 * 60 * 1000);
        }

        Q.all(proms).then(
            function (data) {
                var counts = [];
                for (var i = 0; i < data.length; i++) {
                    counts.push(data[i].length);
                }
                var result = {
                    dates: dates,
                    counts: counts
                };
                deferred.resolve(result);
            }
        ).catch(
            function (error) {
                deferred.reject(error);
            });

        return deferred.promise;
    },

    /**
     * Get DAU for past numOfDays
     * @param {json} para - Search creterias
     */
    getActivePlayerCount: function (para) {
        var num = para.num;
        var deferred = Q.defer();

        var d = new Date();
        var month = d.getMonth() + 1;
        var year = d.getFullYear();
        var day = d.getDate();

        var day2 = new Date(year + ',' + month + ',' + day);
        day2.setHours(0, 0, 0);
        var day1 = getPrevDate();//new Date(day2 - 24 * 60 * 60 * 1000);

        var proms = [];
        var dates = [];
        for (var i = 0; i < num; i++) {
            var prom = dbAccessLog.getActiveUserCountForTimeFrame(day1, day2);
            proms.unshift(prom);
            dates.unshift(day1);
            day2 = day1;
            day1 = getPrevDate();

        }

        function getPrevDate() {
            var newDate = new Date(day2);
            switch (para.frequency) {
                default:
                case 'daily':
                    newDate.setDate(newDate.getDate() - 1);
                    break;
                case 'weekly':
                    newDate.setDate(newDate.getDate() - 7);
                    break;
                case 'monthly':
                    newDate.setMonth(newDate.getMonth() - 1);
                    break;
            }
            return newDate;
        }

        Q.all(proms).then(
            function (data) {
                var counts = [];
                for (var i = 0; i < data.length; i++) {
                    counts.push(data[i].length);
                }
                var result = {
                    dates: dates,
                    counts: counts
                };
                deferred.resolve(result);
            }
        ).catch(
            function (error) {
                deferred.reject(error);
            });

        return deferred.promise;

    },

    /**
     * Get retention data for past numOfDays
     * @param {json} para - Search creterias
     */
    getRetentionData: function (para) {
        var deferred = Q.defer();
        var fre = 1;
        var type = para.dataType;

        var DateFunc = {};
        var startDay = new Date();
        var curDay = new Date();
        startDay.setHours(0, 0, 0, 0);
        curDay.setHours(0, 0, 0, 0);
        switch (para.range) {
            default:
            case 'Last 7 days':
                startDay.setDate(startDay.getDate() - 7);
                break;
            case 'Last 14 days':
                startDay.setDate(startDay.getDate() - 14);
                break;
            case 'Last 1 month':
                startDay.setMonth(startDay.getMonth() - 1);
                break;
            case 'Last 3 months':
                startDay.setMonth(startDay.getMonth() - 3);
                break;
            case 'Last 6 months':
                startDay.setMonth(startDay.getMonth() - 6);
                break;
            case 'Last 1 year':
                startDay.setMonth(startDay.getMonth() - 12);
                break;
            case 'Last 2 years':
                startDay.setMonth(startDay.getMonth() - 24);
                break;
        }
        switch (para.frequency) {
            default:
            case 'day':
                DateFunc.next = function (date, callback) {
                    var newDate = new Date(date);
                    newDate.setDate(newDate.getDate() + 1);
                    if (typeof (callback) == 'function') {
                        callback(newDate);
                    }
                };
                break;
            case 'week':
                DateFunc.next = function (date, callback) {
                    var newDate = new Date(date);
                    newDate.setDate(newDate.getDate() + 7);
                    if (typeof (callback) == 'function') {
                        callback(newDate);
                    }
                };
                break;
            case 'month':
                DateFunc.next = function (date, callback) {
                    var newDate = new Date(date);
                    newDate.setMonth(newDate.getMonth() + 1);
                    if (typeof (callback) == 'function') {
                        callback(newDate);
                    }
                };
                break;
        }

        var firstDay = startDay;
        var allActiveData = [];
        var allNewUserData = [];
        var allDate = [];
        do {
            DateFunc.next(firstDay, function (nextDay) {
                var data1 = dbAccessLog.getActiveUserCountForTimeFrame(firstDay, nextDay);
                var data2 = dbAccessLog.getNewUserForTimeFrame(firstDay, nextDay);
                allActiveData.push(data1);
                allNewUserData.push(data2);
                allDate.push(firstDay);
                firstDay = nextDay;
            });
        } while (firstDay <= curDay);

        var resultData = [];
        var q1 = Q.all(allActiveData);
        var q2 = Q.all(allNewUserData);
        var returnData = [];
        Q.all([q1, q2]).then(function (data) {
            var l = allDate.length;
            for (var i = 0; i < l; i++) {
                var obj = {activeData: data[0][i], newUserData: data[1][i], date: allDate[i]};
                resultData.push(obj);
            }
            //here resultData=[{activeData: [playerId, ...], newUserData:[playerId ...],date: String} ...]

            //to get ith day's count array
            for (i = 0; i < l; i++) {
                var a = dbAccessLog.getRetentionArray(resultData[i].newUserData, resultData.slice(i, l));
                returnData.push({date:allDate[i],data:a});
            }
            deferred.resolve(returnData);

        }).catch(
            function (error) {
                deferred.reject(error);
            });
        return deferred.promise;
    },

    getRetentionArray: function (baseUser, data) {
        var dataL = data.length;
        var srcL = baseUser.length;
        var countArray = [];
        countArray.push(srcL);
        for (var i = 1; i < dataL; i++) {
            countArray.push(getACountFromB(data[i].activeData));
        }
        return countArray;

        function getACountFromB(data) {
            var l = data.length;
            var count = 0;
            for (var i = 0; i < srcL; i++) {
                var mark = baseUser[i];
                for (var j = 0; j < l; j++) {
                    if (mark === data[j]) {
                        count++;
                        continue;
                    }
                }
            }
            return count;
        }

    }
};

module.exports = dbAccessLog;