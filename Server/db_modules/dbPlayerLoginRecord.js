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
        if(playerLoginData.userAgent){
            playerLoginData.inputDeviceType = dbUtil.getInputDeviceType(playerLoginData.userAgent);
        }
        return playerLoginRecord.save();
    },
    getPlayerLoginRecord: function(platformId, startTime, endTime, period, type){

        var dayStartTime = startTime;
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

        var dayEndTime = getNextDate(dayStartTime);
        var matchObj = {
            platform: platformId,
            loginTime: {$gte: dayStartTime, $lt: dayEndTime},
            inputDeviceType: type
        };

        return dbconfig.collection_playerLoginRecord.find(matchObj, {'loginTime':1, 'player':1, 'inputDeviceType':1})
                .populate({path: 'player', model: dbconfig.collection_players})

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

    countLoginPlayerDevicebyPlatform: function (platformId, startDate, endDate, period, isRealPlayer, isTestPlayer, hasPartner) {
        var proms = [];
        var playerLoginProms = [];
        var deviceLoginProms = [];

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

            if (typeof isRealPlayer === 'boolean' && typeof isTestPlayer === 'boolean') {

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
            }
            var specifyField = {'_id':1,  'platform:1':1, 'inputDeviceType':1, 'loginTime':1};

            var playerProm = dbconfig.collection_playerLoginRecord.aggregate(
                    [{
                        $match: matchObj
                    },
                    {
                        $group: {
                            _id: "$player",
                            number: { $sum:1 },
                            loginTime:{ '$first': '$loginTime'}
                        }
                    },
                    {
                        $project: {
                            _id:1,
                            number:1,
                            loginTime:{ $dateToString: { format: "%Y-%m-%d", date: "$loginTime" } }

                        }
                    }]
                ).read("secondaryPreferred")
            playerLoginProms.push(playerProm);

            var deviceProm = dbconfig.collection_playerLoginRecord.aggregate(
              [{
                    $match: matchObj
                },
                {
                    $group: {
                        _id: '$inputDeviceType',
                        count: { $sum:1 },
                        loginTime:{ '$first': '$loginTime'}
                    }
                },
                {
                    $project: {
                        _id:1,
                        count:1,
                        loginTime:{ $dateToString: { format: "%Y-%m-%d", date: "$loginTime" } }

                    }
                }]).read("secondaryPreferred")

            deviceLoginProms.push(deviceProm)

            dayStartTime = dayEndTime;
        }
        return Q.all([Q.all(playerLoginProms), Q.all(deviceLoginProms)]).then(
            data => {
                console.log(data[0]);
                let prom = [];
                var i = 0;
                var tempDate = startDate;
                var res = [];

                for(var i=0; i < data[1].length; i++){
                    var date = tempDate;
                    var obj = {
                        '_id': date,
                        'playerLogin':0,
                        'subTotal':0,
                        'device':{
                            'WEB':0,
                            'H5':0,
                            'APP-ANDROID':0,
                            'APP-IOS':0,
                            'PC-DOWNLOAD':0
                        }
                    }

                    // display playerLogin number
                    if(data[0][i]){
                        obj['playerLogin'] = data[0][i].length;
                    }

                    data[1][i].forEach(item=>{
                        switch (item._id) {
                            case '1':
                                obj['device']['WEB'] = item['count'];
                                obj['subTotal'] += item['count'];
                                break;
                            case '2':
                                obj['device']['H5'] = item['count'];
                                obj['subTotal'] += item['count'];
                                break;
                            case '3':
                                obj['device']['APP-ANDROID'] = item['count'];
                                obj['subTotal'] += item['count'];
                                break;
                            case '4':
                                obj['device']['APP-IOS'] = item['count'];
                                obj['subTotal'] += item['count'];
                                break;
                            case '5':
                                obj['device']['PC-DOWNLOAD'] = item['count'];
                                obj['subTotal'] += item['count'];
                                break;
                            default:
                                break;
                          }
                    })
                    tempDate = getNextDate(tempDate);
                    res.push(obj);
                }

                console.log(res);
                return res;

            }
        );
    },

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

            if (typeof isRealPlayer === 'boolean' && typeof isTestPlayer === 'boolean') {

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
            }
            proms.push(
              //  dbconfig.collection_playerLoginRecord.distinct("player", matchObj)
                  dbconfig.collection_playerLoginRecord.aggregate(
                      [{
                          $match: matchObj
                      }, {
                          $group: {
                              _id: "$player",
                              number: { $sum:1 }
                          }
                      }]
                  ).exec()
            )
            dayStartTime = dayEndTime;
        }
        return Q.all(proms).then(
            data => {
                let prom = [];
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
    },


    /* 
     * Get login player count 
     */
    /*
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

            if (typeof isRealPlayer === 'boolean' && typeof isTestPlayer === 'boolean') {

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
            }

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
    */
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
    getPlayerRetention: function (platform, startTime, days, playerType, dayCount, isRealPlayer, isTestPlayer, hasPartner) {
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
                        },
                        isRealPlayer: isRealPlayer,
                        isTestPlayer: isTestPlayer
                    };

                    if (hasPartner !== null){
                        if (hasPartner == true){
                            queryObj.partner = {$type: "objectId"};
                        }else {
                            queryObj['$or'] = [
                                {partner: null},
                                {partner: {$exists: false}}
                            ]
                        }
                    }
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
                    ).read("secondaryPreferred").exec();
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
                            ).read("secondaryPreferred").exec();
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

    getClientSourceQuery: function (data, isRealPlayer, isTestPlayer, hasPartner) {

        var matchObj = {
            createTime: {
                $gte: new Date(data.startDate),
                $lt: new Date(data.endDate)
            },
            platformId: data.platformId
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
        // if (data.clientType) {
        //     matchObj.clientType = data.clientType
        // }
        if (data.accessType) {
            matchObj.accessType = { $regex : new RegExp(data.accessType, "i") }
        }
        else{
            if (!matchObj.$and){
                matchObj.$and = [];
            }
            matchObj.$and.push({$or: [{"accessType": { $regex : /register/i }},{"accessType": { $regex : /login/i }} ]});
            // matchObj.$or.push({"accessType": { $regex : /register/i }});
            // matchObj.$or.push({"accessType": { $regex : /login/i }});
        }

        let count = dbconfig.collection_playerClientSourceLog.aggregate([
            {$match: matchObj},
            {$group: {_id: null, count: {$sum: 1}}},
        ]).read("secondaryPreferred");

        let playerClientSourceLog = dbconfig.collection_playerClientSourceLog.aggregate([
            {$match: matchObj},
            {$group: {_id: "$domain", count: {$sum: 1}}},
            {$sort: {count: -1}}
        ]).read("secondaryPreferred");

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
        ).read("secondaryPreferred")
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
