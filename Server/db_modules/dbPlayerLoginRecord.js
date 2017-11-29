/**
 * Created by hninpwinttin on 26/1/16.
 */

var dbconfig = require('./../modules/dbproperties');
var dbUtil = require("./../modules/dbutility");
var constShardKeys = require("../const/constShardKeys.js");
var Q = require('q');

var dbPlayerLoginRecord = {

    /**
     * Create a new playerLoginRecord
     * @param {json} data - The data of the playerLoginRecord. Refer to playerLoginRecord schema.
     */
    createPlayerLoginRecord: function (playerLoginData) {
        var playerLoginRecord = new dbconfig.collection_playerLoginRecord(playerLoginData);
        return playerLoginRecord.save();
    },
    getIpHistory: function (playerId) {
        var p1 = dbconfig.collection_playerLoginRecord.find({
            'player': playerId,
            'loginIP': {$ne: ''}
        }).sort({"loginTime": 1}).limit(1).lean();
        var p2 = dbconfig.collection_playerLoginRecord.find({'player': playerId}).sort({"loginTime": -1}).limit(100).lean();
        var returnData = {reg: [], login: []};
        return Q.all([p1, p2]).then(
            data => {
                if (data && data[0] && data[1]) {
                    returnData.reg = data[0];
                    returnData.login = data[1];
                    return returnData;
                } else return returnData;
            }
        )
    },

    /**
     * getPlayerLoginLocation
     * @param {String}  platform - The platform id
     */
    getPlayerLoginLocation: function (platform, startTime, endTime, player, date) {
        //todo: active player indicator
        var matchObj = {
            platform: platform
        };
        date = date || 'lastAccessTime';
        matchObj[date] = {
            $gte: startTime,
            $lt: endTime
        }

        return dbconfig.collection_players.aggregate(
            [{
                $match: matchObj
            }, {
                $group: {
                    _id: {
                        country: "$country"
                    },
                    amount: {$sum: 1},
                }
            }, {
                $sort: {amount: -1}
            }]
        );
    },

    /**
     * getPlayerLoginLocationInCountry
     * @param {String}  platform, country
     */
    getPlayerLoginLocationInCountry: function (platform, country, startTime, endTime, player, date) {
        //todo: active player indicator
        var matchObj = {
            platform: platform,
            country: country,
        };
        date = date || 'lastAccessTime';
        matchObj[date] = {
            $gte: startTime,
            $lt: endTime
        }
        return dbconfig.collection_players.aggregate(
            [{
                $match: matchObj,
            }, {
                $group: {
                    _id: {
                        city: "$city",
                        longitude: "$longitude",
                        latitude: "$latitude"
                    },
                    amount: {$sum: 1},
                }
            }, {
                $sort: {amount: -1}
            }]
        );

    },

    /* 
     * Get login player count 
     */
    countLoginPlayerbyPlatform: function (platformId, startDate, endDate, period) {
        var proms = [];
        var dayStartTime = startDate;
        var getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }

        while (dayStartTime.getTime() < endDate.getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);
            var matchObj = {
                platform: platformId,
                loginTime: {$gte: dayStartTime, $lt: dayEndTime}
            };
            proms.push(
                dbconfig.collection_playerLoginRecord.distinct("player", matchObj)
            )
            dayStartTime = dayEndTime;
        }
        return Q.all(proms).then(
            data => {
                var i = 0;
                var tempDate = startDate;
                var res = data.map(
                    dayData => {
                        var date = tempDate;//dbUtil.getLocalTimeString(dbUtil.getDayStartTime(tempDate), "YYYY-MM-DD");
                        var obj = {
                            _id: {date: date},
                            number: dayData.length
                        }
                        tempDate = getNextDate(tempDate);
                        return obj;
                    }
                );
                return res;
            }
        );


        // var options = {};
        // switch (period) {
        //     case 'day':
        //         options.date = {$dateToString: {format: "%Y-%m-%d", date: "$loginTime"}};
        //         break;
        //     case 'week':
        //         options.week = {$floor: {$divide: [{$subtract: ["$loginTime", startDate]}, 604800000]}};
        //         break;
        //     case 'month':
        //     default:
        //         options.year = {$year: "$loginTime"};
        //         options.month = {$month: "$loginTime"};
        // }
        // var matchingOption = {
        //     loginTime: {
        //         $gte: startDate,
        //         $lt: endDate
        //     }
        // }
        // if (platformId != 'all') {
        //     matchingOption.platform = platformId;
        // }
        // return dbconfig.collection_playerLoginRecord.aggregate(
        //     [{
        //         $match: matchingOption,
        //     }, {
        //         $group: {
        //             _id: {
        //                 date: options
        //             },
        //             playerId: {
        //                 "$addToSet": "$player"
        //             },
        //         }
        //     }, {
        //         $project: {
        //             _id: "$_id.date",
        //             number: {$size: "$playerId"}
        //         }
        //     }]
        // ).exec();
    },

    countLoginPlayerbyPlatformWeek: function (startDate, endDate, platform) {
        return dbconfig.collection_playerLoginRecord.aggregate(
            [{
                $match: {
                    loginTime: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    platform: platform
                }
            }, {
                $group: {
                    _id: "$player",

                }
            }, {
                $project: {
                    _id: "$_id",
                    number: {$sum: 1}
                }
            }]
        ).exec();
    },

    countLoginPlayerAllPlatform: function (startDate, endDate) {
        return dbconfig.collection_playerLoginRecord.aggregate(
            [{
                $match: {
                    loginTime: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            }, {
                $group: {
                    _id: "a",
                    playerId: {
                        "$addToSet": "$player"
                    }
                }
            }, {
                $project: {
                    _id: "$_id",
                    number: {$size: "$playerId"}
                }
            }]
        ).exec();
    },

    /**
     * getPlayerRetention
     * @param {String}  platform, country
     */
    getPlayerRetention: function (platform, startTime, days) {
        console.log('getPlayerRetention reached');
        var day0PlayerObj = {};
        var dayNPlayerObj = {};
        var day0PlayerArrayProm = [];
        var time0 = new Date(startTime);
        var time1 = new Date(startTime);
        time1.setHours(23, 59, 59, 999);
        var lastDay = new Date(time1);
        lastDay.setDate(lastDay.getDate() + 30 + days[days.length - 1]);

        for (var day = 0; day < 31; day++) {

            var temp = dbconfig.collection_players.aggregate(
                [{
                    $match: {
                        platform: platform,
                        registrationTime: {
                            $gte: new Date(time0),
                            $lt: new Date(time1)
                        }
                    },
                }, {
                    $group: {
                        _id: {
                            playerId: "$_id",
                        }
                    }
                }, {
                    $group: {
                        _id: time0.toString(),
                        playerId: {
                            "$addToSet": "$_id.playerId"
                        }
                    }
                }]
            ).exec();
            day0PlayerArrayProm.push(temp);
            console.log('getPlayerRetention time0', time0)
            time0.setDate(time0.getDate() + 1);
            time1.setDate(time1.getDate() + 1);

        }
        return Q.all(day0PlayerArrayProm).then(
            data => {
                console.log('getPlayerRetention got daily register player', JSON.stringify(data, null, 2));
                //containing new player data on each 'day 0'
                for (var i in data) {
                    if (data[i].length > 0) {
                        day0PlayerObj[data[i][0]._id] = data[i][0].playerId
                            .map(a => a.toString())
                            .sort((a, b) => a < b ? -1 : 1);
                    }
                }
                console.log('getPlayerRetention day0PlayerObj', day0PlayerObj);
                var time0 = new Date(startTime);
                var time1 = new Date(startTime);
                time1.setHours(23, 59, 59, 999);
                var loginDataArrayProm = [];
                for (var day = 0; day < 31 + days[days.length - 1]; day++) {
                    var temp = dbconfig.collection_playerLoginRecord.aggregate(
                        [{
                            $match: {
                                platform: platform,
                                loginTime: {
                                    $gte: time0,
                                    $lt: time1
                                }
                            },
                        }, {
                            $group: {
                                _id: {
                                    playerId: "$player",
                                }
                            }
                        }, {
                            $group: {
                                _id: time0.toString(),
                                playerId: {
                                    "$addToSet": "$_id.playerId"
                                }
                            }
                        }]
                    ).exec();
                    loginDataArrayProm.push(temp);
                    time0.setDate(time0.getDate() + 1);
                    time1.setDate(time1.getDate() + 1);
                }
                return Q.all(loginDataArrayProm).then(
                    data => {
                        for (var i in data) {
                            if (data[i].length > 0) {
                                dayNPlayerObj[data[i][0]._id] = data[i][0].playerId
                                    .map(a => a.toString())
                                    .sort((a, b) => a < b ? -1 : 1);
                            }
                        }
                        // console.log('dayNPlayerObj', dayNPlayerObj);
                        //now computing result array
                        console.log('getPlayerRetention day0PlayerObj', day0PlayerObj)
                        var resultArr = [];
                        for (var i = 1; i < 31; i++) {
                            var date = new Date(startTime);
                            date.setDate(date.getDate() + i - 1);
                            var showDate = new Date(startTime);
                            showDate.setDate(showDate.getDate() + i);
                            var row = {date: showDate};
                            var baseArr = [];

                            // debug start
                            let debugDateStringKey = {};
                            debugDateStringKey[date] = 'foobar';
                            console.log('getPlayerRetention date',date, date.toString(), JSON.stringify(debugDateStringKey));
                            // debug end

                            if (day0PlayerObj[date]) {
                                row.day0 = day0PlayerObj[date].length;
                                baseArr = day0PlayerObj[date];
                            } else {
                                row.day0 = 0;
                            }
                            for (var day in days) {
                                var time = new Date(date);
                                time.setDate(time.getDate() + days[day]);
                                var num = dayNPlayerObj[time];
                                if (!num || (row.day0 == 0)) {
                                    row[days[day]] = 0;
                                } else {
                                    var count = 0;
                                    for (var e in num) {
                                        if (baseArr.indexOf(num[e]) != -1) {
                                            count++;
                                        }
                                    }
                                    row[days[day]] = count;
                                }
                            }
                            console.log('getPlayerRetention result row',JSON.stringify(row));
                            resultArr.push(row);
                        }
                        return resultArr;
                    }
                );
            }
        )
    },

    getClientSourceQuery: function (data) {
        var matchObj = {
            createTime: {
                $gte: new Date(data.startDate),
                $lt: new Date(data.endDate)
            },
            platformId: data.platformId
        };
        if (data.clientType) {
            matchObj.clientType = data.clientType
        }
        if (data.accessType) {
            matchObj.accessType = data.accessType
        }
        return dbconfig.collection_playerClientSourceLog.aggregate([
            {$match: matchObj},
            {$group: {_id: "$domain", count: {$sum: 1}}},
            {$sort: {count: -1}}
        ]);
    },

    getPlayerDomainAnalysisData: function (platform, startTime, endTime) {
        return dbconfig.collection_playerLoginRecord.aggregate(
            {
                $match: {
                    platform: platform,
                    loginTime: {$gte: startTime, $lt: endTime}
                }
            },
            {
                $group: {
                    _id: "$clientDomain",
                    number: {$sum: 1}
                }
            },
            {
                $sort: {number: -1}
            }
        )
    },
    getClientSourcePara: function () {
        var a = dbconfig.collection_playerClientSourceLog.distinct('clientType');
        var b = dbconfig.collection_playerClientSourceLog.distinct('accessType');
        return Q.all([a, b]).then(
            function (data) {
                return {
                    clientType: data[0],
                    accessType: data[1]
                }
            }
        )
    }

}

module.exports = dbPlayerLoginRecord;