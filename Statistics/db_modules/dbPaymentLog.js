var Q = require('q');
var dbconfig = require('./../modules/dbProperties');
var dbPlayerInfo = require('./dbPlayerInfo');

var dbPaymentLog = {

    /**
     * Get ARPU
     * @param {String} para - The para info
     */
    getARPU: function (para) {
        var deferred = Q.defer();
        var fre = 1;
        var type = para.dataType;

        var DateFunc = {};
        var startDay = new Date();
        startDay.setHours(0, 0, 0, 0);
        var curDay = new Date();
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
        var allPaymentData = [];
        var allPaymentUser = [];
        var allActiveData = [];
        var allTotalUser = [];
        var allDate = [];

        do {
            DateFunc.next(firstDay, function (nextDay) {
                var data1 = dbPaymentLog.getPaymentForTimeFrame(firstDay, nextDay);
                var data2 = dbPaymentLog.getActiveUserCountForTimeFrame(firstDay, nextDay);
                var data3 = dbPaymentLog.getPaymentUserForTimeFrame(firstDay, nextDay);
                var data4 = dbPlayerInfo.getTotalUserForTimeFrame(nextDay);

                allPaymentData.push(data1);
                allActiveData.push(data2);
                allPaymentUser.push(data3);
                allTotalUser.push(data4);
                allDate.push(firstDay);
                firstDay = nextDay;
            });
        } while (firstDay < curDay);

        var resultData = [];
        var q1 = Q.all(allPaymentData);
        var q2 = Q.all(allActiveData);
        var q3 = Q.all(allPaymentUser);
        var q4 = Q.all(allTotalUser);
        Q.all([q1, q2, q3, q4]).then(function (data) {
            var l = allDate.length;
            for (var i = 0; i < l; i++) {
                var obj = dbPaymentLog.processPaymentData(data[0][i], allDate[i]);
                obj.numActiveUser = data[1][i].length;
                obj.numPaidUser = data[2][i].length;
                obj.numTotalUser = data[3][i].length;
                resultData.push(obj);
            }
            deferred.resolve(resultData);

        }).catch(
            function (error) {
                deferred.reject(error);
            });
        return deferred.promise;
    },

    /**
     * Get payment data in a certian period of time
     * @param {Date} startTime,endTime - The date info
     */
    getPaymentForTimeFrame: function (startTime, endTime) {
        return dbconfig.collectionPaymentLog.find(
            {
                paymentTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).exec();
    },

    /**
     * Get payment user data in a certian period of time
     * @param {Date} startTime,endTime - The date info
     */
    getPaymentUserForTimeFrame: function (startTime, endTime) {
        return dbconfig.collectionPaymentLog.find(
            {
                paymentTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).distinct('playerId').exec();
    },
    /**
     * Get active user in a certian period of time
     * @param {Date} startTime,endTime - The date info
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
     * process the payment data in respective timeframe
     * @param {json} data
     * @param {Date} date
     */
    processPaymentData: function (data, date) {
        var resultObj = {date: date, payment: {}};
        var l = data.length;
        for (var i = 0; i < l; i++) {
            if (resultObj.payment.hasOwnProperty(data[i].paymentCurrency)) {
                resultObj.payment[data[i].paymentCurrency] += data[i].paymentAmount;
            } else {
                resultObj.payment[data[i].paymentCurrency] = data[i].paymentAmount;
            }
        }
        return resultObj;
    }

};

module.exports = dbPaymentLog;