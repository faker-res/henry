/**
 * Created by hninpwinttin on 26/1/16.
 */

var dbconfig = require('./../modules/dbproperties');
var dbUtil = require("./../modules/dbutility");
var constShardKeys = require("../const/constShardKeys.js");
var Q = require('q');
const ObjectId = mongoose.Types.ObjectId;

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
    getPlayerLoginLocation: function (platform, startTime, endTime, player, date, isRealPlayer, isTestPlayer, hasPartner) {
        //todo: active player indicator
        var matchObj = {
            platform: platform,
            isRealPlayer: isRealPlayer,
            isTestPlayer: isTestPlayer
        };
        date = date || 'lastAccessTime';
        matchObj[date] = {
            $gte: startTime,
            $lt: endTime
        }

        if (hasPartner !== null){
            if (hasPartner == true){
                matchObj.partner = {$type: "objectId"};
            }else {
                matchObj['$or'] = [
                    {partner: null},
                    {partner: {$exists: false}}
                ]
            }
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
    getPlayerLoginLocationInCountry: function (platform, country, startTime, endTime, player, date, isRealPlayer, isTestPlayer, hasPartner) {
        //todo: active player indicator
        var matchObj = {
            platform: platform,
            country: country,
            isRealPlayer: isRealPlayer,
            isTestPlayer: isTestPlayer
        };
        date = date || 'lastAccessTime';
        matchObj[date] = {
            $gte: startTime,
            $lt: endTime
        }
        if (hasPartner !== null){
            if (hasPartner == true){
                matchObj.partner = {$type: "objectId"};
            }else {
                matchObj['$or'] = [
                    {partner: null},
                    {partner: {$exists: false}}
                ]
            }
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
    countLoginPlayerbyPlatform: function (platformId, startDate, endDate, period, isRealPlayer, isTestPlayer, hasPartner) {
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

                let prom = [];
                var i = 0;
                var tempDate = startDate;

                // if (typeof isRealPlayer === 'boolean' && typeof isTestPlayer === 'boolean'){
                //     data.map(
                //         dayData => {
                //             let query = {
                //                 _id: {$in: dayData.map(playerId => ObjectId(playerId))},
                //                 isRealPlayer: isRealPlayer,
                //                 isTestPlayer: isTestPlayer,
                //             };
                //
                //             if (hasPartner !== null){
                //                 if (hasPartner == true){
                //                     query.partner = {$type: "objectId"};
                //                 }else {
                //                     query['$or'] = [
                //                         {partner: null},
                //                         {partner: {$exists: false}}
                //                     ]
                //                 }
                //             }
                //
                //             prom.push(dbconfig.collection_players.find(query).lean().then(
                //                 filteredData => {
                //                     var date = tempDate;//dbUtil.getLocalTimeString(dbUtil.getDayStartTime(tempDate), "YYYY-MM-DD");
                //                     var obj = {
                //                         _id: {date: date},
                //                         number: filteredData.length
                //                     }
                //                     tempDate = getNextDate(tempDate);
                //                     return obj;
                //                 })
                //             )
                //         }
                //     );
                //     return Q.all(prom);
                // }
                // // for dashboard Controller
                // else {
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
                // }
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
    getPlayerRetention: function (platform, startTime, days, playerType, dayCount) {
        var day0PlayerObj = {};
        var dayNPlayerObj = {};
        var day0PlayerArrayProm = [];
        var time0 = new Date(startTime);
        var time1 = new Date(startTime);
        time1.setHours(23, 59, 59, 999);
        var lastDay = new Date(time1);
        lastDay.setDate(lastDay.getDate() + 30 + days[days.length - 1]);
        let playerFilter = {};
        let validPlayerProm = Promise.resolve(false);
        if (playerType) {
            switch(playerType) {
                case "2":
                    playerFilter = {topUpTimes: {$gte: 1}};
                    break;
                case "3":
                    playerFilter = {topUpTimes: {$gte: 2}};
                    break;
                case "4":
                    validPlayerProm = dbconfig.collection_partnerLevelConfig.findOne({platform:platform}).lean();
                    break;
                default:
                    break;
            }
        }

        return validPlayerProm.then(
            validPlayerProm => {
                if (validPlayerProm && playerType == "4" && validPlayerProm.hasOwnProperty("validPlayerTopUpAmount") &&
                    validPlayerProm.hasOwnProperty("validPlayerConsumptionTimes") && validPlayerProm.hasOwnProperty("validPlayerTopUpTimes")) {
                    playerFilter = {
                        topUpSum: {$gte: validPlayerProm.validPlayerTopUpAmount},
                        consumptionTimes: {$gte: validPlayerProm.validPlayerConsumptionTimes},
                        consumptionSum: {$gte: validPlayerProm.validPlayerConsumptionAmount},
                        topUpTimes: {$gte: validPlayerProm.validPlayerTopUpTimes}
                    }
                }
                for (var day = 0; day <= dayCount; day++) {
                    let queryObj = {
                        platform: platform,
                        registrationTime: {
                            $gte: new Date(time0),
                            $lt: new Date(time1)
                        }
                    };
                    queryObj = Object.assign({}, queryObj, playerFilter);

                    var temp = dbconfig.collection_players.aggregate(
                        [{
                            $match: queryObj
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
                    time0.setDate(time0.getDate() + 1);
                    time1.setDate(time1.getDate() + 1);

                }
                return Q.all(day0PlayerArrayProm).then(
                    data => {
                        //containing new player data on each 'day 0'
                        for (var i in data) {
                            if (data[i].length > 0) {
                                day0PlayerObj[data[i][0]._id] = data[i][0].playerId
                                    .map(a => a.toString())
                                    .sort((a, b) => a < b ? -1 : 1);
                            }
                        }
                        var time0 = new Date(startTime);
                        var time1 = new Date(startTime);
                        time1.setHours(23, 59, 59, 999);
                        var loginDataArrayProm = [];
                        for (var day = 0; day <= dayCount + days[days.length - 1]; day++) {
                            var temp = dbconfig.collection_playerLoginRecord.aggregate(
                                [{
                                    $match: {
                                        platform: platform,
                                        loginTime: {
                                            $gte: new Date(time0),
                                            $lt: new Date(time1)
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
                                var resultArr = [];
                                for (var i = 1; i <= dayCount; i++) {
                                    var date = new Date(startTime);
                                    date.setDate(date.getDate() + i - 1);
                                    var showDate = new Date(startTime);
                                    showDate.setDate(showDate.getDate() + i);
                                    var row = {date: showDate};
                                    var baseArr = [];

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
                                    resultArr.push(row);
                                }
                                return resultArr;
                            }
                        );
                    }
                )
            });
    },

    getClientSourceQuery: function (data) {
        var matchObj = {
            createTime: {
                $gte: new Date(data.startDate),
                $lt: new Date(data.endDate)
            },
            platformId: data.platformId
        };
        // if (data.clientType) {
        //     matchObj.clientType = data.clientType
        // }
        if (data.accessType) {
            matchObj.accessType = { $regex : new RegExp(data.accessType, "i") }
        }
        else{
            matchObj.$or = [];
            matchObj.$or.push({"accessType": { $regex : /register/i }});
            matchObj.$or.push({"accessType": { $regex : /login/i }});
        }

        let count = dbconfig.collection_playerClientSourceLog.aggregate([
            {$match: matchObj},
            {$group: {_id: null, count: {$sum: 1}}},
        ]);

        let playerClientSourceLog = dbconfig.collection_playerClientSourceLog.aggregate([
            {$match: matchObj},
            {$group: {_id: "$domain", count: {$sum: 1}}},
            {$sort: {count: -1}}
        ]);

        return Promise.all([playerClientSourceLog, count]).then(
            result => {
                let totalCount = 0;
                if(result){
                    totalCount = result[1] && result[1][0] ? result[1][0].count : 0;
                    data = result[0] ? result[0] : "";

                    if(totalCount != 0){
                        data.map(d => {
                            if(d){
                                if(d.count){
                                    d.ratio = ((d.count / totalCount) * 100).toFixed(0) + "%";
                                }
                            }

                            return;
                        })
                    }

                    return data;
                }
            }
        )
    },

    getPlayerDomainAnalysisData: function (platform, startTime, endTime, isRealPlayer, isTestPlayer, hasPartner) {

        let matchObj = {
            platform: platform,
            loginTime: {$gte: startTime, $lt: endTime},
        };

        if (hasPartner !== null){
            if (hasPartner == true){
                matchObj.partner = {$type: "objectId"};
                matchObj.isRealPlayer = isRealPlayer;
                matchObj.isTestPlayer = isTestPlayer;
            }else {
                matchObj['$and'] = [
                    {$or: [ {partner: null}, {partner: {$exists: false}} ]},
                    {$or: [{$and: [ {isRealPlayer: {$exists: false}}, {isTestPlayer: {$exists: false}} ]}, {$and: [ {isRealPlayer: isRealPlayer}, {isTestPlayer:isTestPlayer} ]} ]},
                ]
            }
        }
        else{
            if (isRealPlayer){
                // the old data which do not contain isTestPlayer & isRealPlayer are treated as individual UserType
                matchObj['$or'] = [
                    {$and: [{isRealPlayer: isRealPlayer}, {isTestPlayer: isTestPlayer} ]},
                    {$and: [{isRealPlayer: {$exists: false}}, {isTestPlayer: {$exists: false}} ]}
                ]
            }
            else {
                // for the case of testPlayer
                matchObj.isRealPlayer = isRealPlayer;
                matchObj.isTestPlayer = isTestPlayer;
            }
        }

        return dbconfig.collection_playerLoginRecord.aggregate(
            {
                $match: matchObj
                //     {
                //     platform: platform,
                //     loginTime: {$gte: startTime, $lt: endTime}
                // }
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
        ).read("secondaryPreferred");
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