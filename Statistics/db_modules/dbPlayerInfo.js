var dbconfig = require('../modules/dbProperties');
var Q = require("q");

var dbPlayerInfo = {

    /**
     * Get daily new registered players
     * @param {json} data - The data of the player user. Refer to playerInfo schema.
     */
    getPastDaysNewPlayerCount: function (data) {
        //todo::tmp code
        var num = parseInt(data);
        var deferred = Q.defer();
        var earliest = new Date();
        earliest.setDate(earliest.getDate() - num);
        var earliestString = earliest.toISOString();
        var a = dbconfig.collectionPlayer.find({'registrationTime': {$gte: earliestString}}).exec();
        deferred.resolve(a);
        return deferred.promise;
    },
    /**
     * Get total registered players until a certain date
     * @param {json} data - The date. Refer to playerInfo schema.
     */
    getTotalUserForTimeFrame: function (endTime) {
        return dbconfig.collectionPlayer.find(
            {
                registrationTime: {
                    $lte: endTime
                }
            }
        ).distinct('playerId').exec();
    },

    getDailyNewPlayerCount: function (num) {
        var deferred = Q.defer();

        var d = new Date();
        var month = d.getMonth();
        var year = d.getFullYear();
        var day = d.getDate();

        var today = new Date(year + ',' + month + ',' + day);
        today.setHours(0, 0, 0);
        var yesterday = new Date(today - 24 * 60 * 60 * 1000);

        var proms = [];
        var dates = [];
        for (var i = 0; i < num; i++) {
            var prom = dbPlayerInfo.getDailyNewUserForTimeFrame(yesterday, today);
            proms.unshift(prom);
            dates.unshift(yesterday);
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

    getDailyNewUserForTimeFrame: function (startTime, endTime) {
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
     * Get daily new registered players
     * @param {json} para - The query parameters
     */
    getNewPlayerCount: function (para) {
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
            var prom = dbPlayerInfo.getDailyNewUserForTimeFrame(day1, day2);
            proms.unshift(prom);
            dates.unshift(day1);
            day2 = day1;
            day1 = getPrevDate();

        }

        function getPrevDate() {
            var newDate = new Date(day2);
            switch (para.frequency) {
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

    }
}

module.exports = dbPlayerInfo;