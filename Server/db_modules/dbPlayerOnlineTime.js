let dbConfig = require('./../modules/dbproperties');

let dbPlayerOnlineTime = {
    loginTimeLog: function (playerObjId, platformObjId, token) {
        return dbConfig.collection_playerOnlineTime.findOneAndUpdate({
            player: playerObjId,
            lastLoginToken: token
        }, {
            platform: platformObjId,
            lastLoginTime: new Date(),
            lastAuthenticateTime: null,
            totalOnlineSeconds: 0
        }, {
            upsert: true
        });
    },

    authenticateTimeLog: function (playerObjId, token) {
        let currentTime = new Date();
        let onlineSeconds = 0;

        return dbConfig.collection_playerOnlineTime.findOneAndUpdate({
            player: playerObjId,
            lastLoginToken: token
        }, {
            lastAuthenticateTime: currentTime
        }, {
            new: false
        }).lean().then(
            timeLog => {
                if (timeLog) {
                    if (timeLog.lastAuthenticateTime) {
                        let onlineMs = currentTime.getTime() - timeLog.lastAuthenticateTime.getTime();

                        // Handling for concurrent/multiple authenticate calls
                        // If interval between authenticate is less than 1 second, don't count in online time
                        if (onlineMs >= 1000) { onlineSeconds = onlineMs / 1000 }
                    } else if (timeLog.lastLoginTime) {
                        onlineSeconds = (currentTime.getTime() - timeLog.lastLoginTime.getTime()) / 1000;
                    }

                    return dbConfig.collection_playerOnlineTime.findByIdAndUpdate(timeLog._id, {
                        $inc: {totalOnlineSeconds: onlineSeconds}
                    })
                }
            }
        )
    },

    getOnlineTimeLogByPlatform: function (platformObjId, startTime, endTime, period) {

        let arrProm = [];
        var dayStartTime = new Date(startTime);
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

        for ( ; dayStartTime.getTime() < new Date(endTime).getTime(); dayStartTime = dayEndTime) {
            var dayEndTime = getNextDate.call(this, dayStartTime);

            arrProm.push(dbConfig.collection_playerOnlineTime.find({platform: platformObjId, lastLoginTime: {$gte: dayStartTime, $lt: dayEndTime}}, 'totalOnlineSeconds').lean().then(
                timeLogs => {
                    if (timeLogs) {
                        return timeLogResultGenerator(timeLogs);
                    }
                }
            ));
        }

        return Promise.all(arrProm).then(
            retData => {
                if (retData && retData.length > 0){

                    let result = [];
                    let tempDate = startTime;

                    retData.forEach(data => {
                        if(data){
                            result.push({date: tempDate, result: data});
                        }
                        tempDate = getNextDate(tempDate);
                    });

                    return result
                }
                else{
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "Cannot find the playerOnlineTime record"
                    });
                }
            }
        )

        function timeLogResultGenerator (logs) {
            let retData = {
                totalCount: 0,
                count1: 0,
                count2: 0,
                count3: 0,
                count4: 0,
                count5: 0,
                count6: 0,
                count7: 0,
                count8: 0,
                count9: 0
            };

            if(logs && logs.length > 0) {
                logs.forEach(log => {
                    retData.totalCount++;
                    retData.count1 += !log.totalOnlineSeconds || checkSecondsGroup(log.totalOnlineSeconds, 0, 10) ? 1 : 0;
                    retData.count2 += checkSecondsGroup(log.totalOnlineSeconds, 11, 30) ? 1 : 0;
                    retData.count3 += checkSecondsGroup(log.totalOnlineSeconds, 31, 60) ? 1 : 0;
                    retData.count4 += checkSecondsGroup(log.totalOnlineSeconds, 61, 300) ? 1 : 0;
                    retData.count5 += checkSecondsGroup(log.totalOnlineSeconds, 301, 600) ? 1 : 0;
                    retData.count6 += checkSecondsGroup(log.totalOnlineSeconds, 601, 900) ? 1 : 0;
                    retData.count7 += checkSecondsGroup(log.totalOnlineSeconds, 901, 1800) ? 1 : 0;
                    retData.count8 += checkSecondsGroup(log.totalOnlineSeconds, 1801, 3600) ? 1 : 0;
                    retData.count9 += log.totalOnlineSeconds >= 3601 ? 1 : 0;
                });
            }

            return retData;
        }

        function checkSecondsGroup (value, min, max) {
            return value >= min && value <= max;
        }
    }
};

module.exports = dbPlayerOnlineTime;